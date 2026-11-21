/**
 * THE LOCAL STORE. It is authoritative (ADR-018), and it is append-only.
 *
 * Everything a screen shows is DERIVED from this on read. There is no cached total,
 * no memoised summary, no field holding a figure - ask twice and the engine runs
 * twice. That is what derive-on-read means: a stored total is a second source of
 * truth, and the first time it disagrees with the entries, the shopkeeper is looking
 * at a number nobody can explain.
 *
 * APPEND-ONLY IS ENFORCED HERE TOO, not only in the database. The triggers are the
 * real guarantee and they are tested on both engines; this refuses the same way so a
 * screen cannot express the mistake, and so the refusal arrives as a named error
 * rather than a constraint violation three layers down.
 *
 * THE OUTBOX IS PART OF THE WRITE, NOT A CONSEQUENCE OF IT. An entry and its outbox
 * row are appended together or not at all. A write path that appends the outbox
 * "after" loses entries when the process dies in between - and on a budget handset
 * the process dying is the normal case, not the exception.
 *
 * NO I/O IN THIS FILE. State is in memory behind a persistence PORT, so every screen
 * test runs against the real store rather than a mock of it. The SQLite adapter
 * implements the port; swapping it changes no screen.
 */
import {
  computePrimary,
  computeIntelligence,
  closedDaySummaries,
  customerCreditFold,
  cashConfidence,
  operationalConsistency,
  SCORE_WINDOW_DAYS,
  expectedCashBalance,
  subtract,
  sum,
  assertPaise,
  dayStartMinutes,
  businessDate,
  MIDNIGHT,
  type BusinessIntelligence,
  type CashConfidence,
  type Gated,
  type OperationalConsistency,
  addDays,
  assertLegFits,
  buildCorrection,
  settlementOf,
  isEventSection,
  RETURNABLE_SECTIONS,
  isUpiReceipt,
  upiCheck,
  assertLineFits,
  EntryInputError,
  liveEntries,
  buildCancel,
  assertPartyKind,
  itemReports,
  customerItems,
  ITEM_NAME_MAX,
  type ItemLine,
  type ItemReports,
  type ItemTotal,
  type Period,
  type ShopItem,
  type Adjustment,
  type UpiCheck,
  type UpiConfirmation,
  type DayInput,
  type EntrySection,
  type ReturnSettlement,
  type Section,
  type DayStart,
  type DayRecord,
  type Entry,
  type Paise,
  type Party,
  type PrimaryOutputs,
  type Working,
  cashCheckHistory,
  daysToPay,
  duesByAge,
  festivalWeeks,
  monthAtAGlance,
  monthOf,
  previousMonth,
  returnsTrend,
  salesForecast,
  samePeriodLastYear,
  upiMonth,
  FORECAST_HISTORY_DAYS,
  type Book,
  type CashCheckHistory,
  type DaysToPay,
  type DuesByAge,
  type FestivalWeek,
  type MonthAtAGlance,
  type ReturnsWeek,
  type SalesForecast,
  type UpiMonth,
  type CreditLimit,
  type CreditLimitObservation,
  type IsoDate,
  limitInForce,
  creditLimitObservation,
} from '@swafto/formula-engine';

/**
 * THE SECTIONS THAT MOVE WHAT A PARTY OWES, and which direction each moves it.
 *
 * A customer owes more when he takes goods on udhar and less when he pays; a
 * supplier is owed more on an udhar purchase and less when we pay out. Four
 * sections, two signs, and nothing else in the day touches a party balance -
 * `cash_sales` names no party, and `withdrawal` is the owner's own.
 *
 * EXPORTED BECAUSE A LEDGER HAS TO AGREE WITH ITS OWN TOTAL. P2 and P3 render
 * one signed line per entry and this store sums the same entries into one
 * figure; if the screen decided the signs for itself, the day a collection
 * changed sign in one place and not the other the ledger would stop adding up
 * to its own footer - and every line on it would still look right. One table,
 * two readers.
 *
 * Amounts are always non-negative (types.ts: "sign is carried by the section"),
 * so this is the only thing that knows which way a party line points.
 */
export const PARTY_SECTION_SIGN: Readonly<Partial<Record<Entry['section'], 1 | -1>>> = {
  udhar_sales: 1,
  udhar_collection: -1,
  purchase: 1,
  party_payment: -1,
  // A return's money legs move his udhar ONLY in udhar mode - see `partyEffect`.
  exchange_receipt: 1,
  refund_paid: -1,
};

/**
 * WHAT ONE LINE DOES TO WHAT ITS PARTY OWES, signed. The single answer both the
 * per-party movement and the party ledger read, so the two cannot disagree.
 *
 * Only UDHAR moves a balance where the section can be settled either way: a cash
 * purchase creates no supplier due (P8), and a refund paid in cash or a
 * difference paid by UPI settles on the spot - only "Credit issued" comes off
 * his udhar, and only a difference put on udhar goes onto it (P7). The goods
 * legs of a return (`sales_return`, `exchange_out`) move no balance at all.
 */
export const partyEffect = (e: Entry): Paise => {
  const sign = PARTY_SECTION_SIGN[e.section];
  const modeSettled =
    (e.section === 'purchase' || e.section === 'exchange_receipt' || e.section === 'refund_paid') &&
    e.mode !== 'udhar';
  if (sign === undefined || modeSettled) return 0;
  return sign === -1 ? subtract(0, e.amount) : e.amount;
};

/**
 * HT-11: A CORRECTION TYPED WHILE NO DAY IS OPEN - the closed day is still the
 * current business day, and a frozen day takes no entry (D7). It waits here and
 * is appended, dated to the next day, the moment that day opens. What he typed,
 * not a figure: the entry is built from it then, through the same parser.
 */
export interface HeldCorrection {
  /** The id the correction entry will carry, so a replay after a crash is a no-op. */
  readonly id: string;
  /** The closed day's entry it corrects. */
  readonly originalId: string;
  readonly amount: Paise;
  readonly heldAt: string;
}

/** What a screen is handed. Never a figure - always the input a figure comes from. */
export interface StoreState {
  readonly shopId: string;
  readonly day: DayRecord;
  readonly entries: readonly Entry[];
  readonly parties: readonly Party[];
  readonly priorCreditOutstanding: Paise;
  readonly priorSupplierOutstanding: Paise;
  /** D8: sections he has said are empty, as opposed to ones he has not reached. */
  readonly skippedSections: readonly Section[];
  /** C-19: a closed day dated after the clock, kept as recorded. See `Store.misdatedDate`. */
  readonly misdatedDate?: string;
  /** C-19 residual: today's book was closed while the phone's date was wrong, and the calendar has caught up. */
  readonly closedUnderWrongDate?: boolean;
  /**
   * What X1 was told. Empty until onboarding finishes - which is how the host
   * knows, after a restart, whether to ask the four questions again.
   */
  readonly shopName?: string;
  /**
   * When the NEXT day he opens will start (decision 1). A setting for days not
   * yet made; the open day carries its own `startsAt` and this never moves it.
   * Absent until he chooses, which means '00:00', the calendar day.
   */
  readonly dayStartsAt?: DayStart;
  /** Decision 2: today's typed adjustments. Absent is none. */
  readonly adjustments?: readonly Adjustment[];
  /** Decision 3: today's confirmed UPI receipts. Absent is none confirmed. */
  readonly upiConfirmations?: readonly UpiConfirmation[];
  /** HT-11: corrections waiting for the next day to open. Absent means none. */
  readonly heldCorrections?: readonly HeldCorrection[];
  /**
   * EVERY EARLIER DAY AND ITS ENTRIES, read-only, for Reports. What was typed,
   * never a total: R1's trends and scores are derived from these on read.
   * Optional, because a store built in a test holds one day and that is honest.
   */
  readonly pastDays?: readonly DayRecord[];
  readonly pastEntries?: readonly Entry[];
  /** Earlier days' typed adjustments and UPI confirmations, for the basic reports. */
  readonly pastAdjustments?: readonly Adjustment[];
  readonly pastUpiConfirmations?: readonly UpiConfirmation[];
  /** PR-1 (Premium): the shop's own item list, names only. Absent is none. */
  readonly items?: readonly ShopItem[];
  /**
   * PR-1: EVERY item line on this phone, every day - PR-2's reports read the
   * history. Kept after a Premium plan lapses: what was recorded stays readable.
   */
  readonly itemLines?: readonly ItemLine[];
  /** R5 FR-6: every credit limit he has set, oldest first. Absent is none. */
  readonly creditLimits?: readonly CreditLimit[];
}

/** R5 FR-5: one customer who owes the shop, and since when. */
export interface CustomerDue {
  readonly partyId: string;
  readonly amount: Paise;
  /** The day his balance last rose above zero: the age of the debt as it stands. */
  readonly since: IsoDate;
}

/** What R1 is handed by `Store.reports()`. Every member derived on the call. */
export interface Reports {
  readonly closedDays: number;
  /** Closed days the BI window holds - the trailing SCORE_WINDOW_DAYS, or fewer. */
  readonly windowClosedDays: number;
  readonly intelligence: BusinessIntelligence;
  readonly cashConfidence: Gated<CashConfidence>;
  readonly operationalConsistency: Gated<OperationalConsistency>;
}

/** FR-7, the free basic reports. Every member derived on the call. */
export interface BasicReports {
  readonly customerDues: DuesByAge;
  readonly supplierDues: DuesByAge;
  /** This month so far, then the month before - unless the book starts after it (HT-46). */
  readonly months: readonly MonthAtAGlance[];
  readonly cashChecks: CashCheckHistory;
  readonly upiMonths: readonly UpiMonth[];
}

/** PR-3 and PR-4, the Premium dashboard's readings. Every member derived on the call. */
export interface PremiumReports {
  readonly forecast: Gated<SalesForecast>;
  readonly samePeriodLastYear: ReturnType<typeof samePeriodLastYear>;
  readonly festivalWeeks: readonly FestivalWeek[];
  readonly daysToPay: readonly DaysToPay[];
  readonly returnsTrend: readonly ReturnsWeek[];
}

/** How many closed days the cash-check history lists. A named choice: one month. */
export const CASH_CHECK_HISTORY_DAYS = SCORE_WINDOW_DAYS;
/** How many weeks the returns trend spans. A named choice. */
export const RETURNS_TREND_WEEKS = 4;

/** The choices S2 offers: a shop that trades past midnight closes by dawn. */
export const DAY_START_CHOICES = ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00'] as const;

/** One queued write. Draining is the sync client's problem, not the store's. */
export interface OutboxRow {
  readonly id: string;
  readonly kind: 'entry' | 'day' | 'party' | 'upi_confirmation' | 'adjustment' | 'item' | 'item_line' | 'credit_limit';
  readonly payload: unknown;
  readonly queuedAt: string;
}

/**
 * Persistence as a port, so the store never imports a database.
 *
 * `appendAtomically` takes BOTH rows because that is the invariant: an entry without
 * its outbox row never syncs, and an outbox row without its entry syncs something
 * that does not exist.
 */
export interface PersistencePort {
  appendAtomically(entry: Entry, outbox: OutboxRow): void;
  /**
   * EX-6: AN EVENT'S ROWS COMMIT TOGETHER OR NOT AT ALL. A return and its
   * refund, or an exchange's three legs, are one business fact; a process kill
   * between legs would leave a lone replacement inflating Net Sales by its whole
   * price. One transaction, every entry and every outbox row.
   */
  appendEvent(entries: readonly Entry[], outbox: readonly OutboxRow[]): void;
  /** Any entry in the book, on any day - the sale a return points at. */
  findEntry(id: string): Entry | undefined;
  /** Every entry, on any day, whose `refersToEntryId` is this id. */
  entriesReferringTo(id: string): readonly Entry[];
  /** The newest entries in these sections, on any day, newest first. */
  recentEntries(sections: readonly EntrySection[], limit: number): readonly Entry[];
  /** HT-11: replace the held-correction list. Local only; nothing is queued for it. */
  putHeldCorrections(held: readonly HeldCorrection[]): void;
  /**
   * A day change and its outbox row, together, for the same reason an entry and
   * its row go together.
   *
   * IT TOOK AN OUTBOX ROW LATE, AND THAT WAS A REAL DEFECT. `putDay` used to
   * write the day and queue nothing, so opening cash and the close itself -
   * the two figures the whole product exists to record - reached the server
   * only if an entry happened to be queued beside them. A day closed on a phone
   * that then broke was a day the server never heard about.
   */
  putDay(day: DayRecord, outbox: OutboxRow): void;
  /**
   * A customer or supplier, and its outbox row, together. A new one, or (HT-43)
   * the same id again with a phone added, which replaces the stored profile -
   * the server's `upsertParty` takes the phone the same way.
   */
  putParty(party: Party, outbox: OutboxRow): void;
  /**
   * Decision 3: confirmations and their outbox rows, ALL together - the bulk
   * "all received" tap is one write, so a kill half-way cannot leave half the
   * receipts ticked.
   */
  appendUpiConfirmations(confirmations: readonly UpiConfirmation[], outbox: readonly OutboxRow[]): void;
  /** Decision 2: one adjustment and its outbox row, together. */
  appendAdjustment(adjustment: Adjustment, outbox: OutboxRow): void;
  /** PR-1: one name onto his item list, and its outbox row, together. */
  putItem(item: ShopItem, outbox: OutboxRow): void;
  /** PR-1: one item line of a sale, and its outbox row, together. */
  appendItemLine(line: ItemLine, outbox: OutboxRow): void;
  /** R5 FR-6: one credit limit and its outbox row, together. */
  appendCreditLimit(limit: CreditLimit, outbox: OutboxRow): void;
  /** Local only: the server learns the shop's name at sign-up, not from sync. */
  putShopName(name: string): void;
  /** Local only, like the name: the day rows carry the rule each was made under. */
  putDayStart(startsAt: DayStart): void;
  load(): StoreState | null;
  /** Rows still to be sent. A PARKED row (the server refused it) is not in this list. */
  pendingOutbox(): readonly OutboxRow[];
  /**
   * FE-11: PARK rows the server refused, with its reason, so they are not
   * re-posted on every drain. Parked rows stay in the queue table - a figure he
   * typed is never thrown away - but leave `pendingOutbox`. Parking is of ONE
   * VERSION of a row: queued again with different content, it is pending again.
   */
  parkOutbox(rows: readonly { readonly id: string; readonly reason: string }[]): void;
  /** The parked rows and why, for the one visible count on Today. */
  parkedOutbox(): readonly { readonly id: string; readonly reason: string }[];
  /** Put every parked row back in the queue, once; a refusal that repeats parks it again. */
  unparkOutbox(): void;
  /**
   * Forget the rows the server has accepted. Called only after a 2xx, so a
   * failed drain leaves the queue exactly as it was - which is what makes a
   * retry safe rather than lossy.
   */
  ackOutbox(ids: readonly string[], sent?: readonly OutboxRow[]): void;
  /**
   * F-22: account deletion, on this phone. Every day, entry, party, queued row
   * and meta value (shop name, session tokens, account record) goes, in one
   * transaction. The single sanctioned exception to D1: erasure is the DPDP
   * right, not a correction. `load()` afterwards is a first run.
   */
  eraseAll(): void;
}

/**
 * F-18: WAS THIS THE VERSION THAT WENT? A day row keeps one id and each change
 * replaces it, so a close made while a push was in flight sat under the same
 * id as the older open day being sent - and the ack for the old one deleted
 * the close. An ack now removes a row only if it is still what was sent.
 * Without `sent` (a caller that cannot say) it keeps the old behaviour.
 */
export const isSentVersion = (row: OutboxRow, sent?: readonly OutboxRow[]): boolean =>
  sent === undefined ||
  sent.some((s) => s.id === row.id && JSON.stringify(s) === JSON.stringify(row));

/** An in-memory port, for tests and for first run before SQLite is wired. */
export function memoryPort(initial: StoreState): PersistencePort {
  let state = initial;
  let outbox: OutboxRow[] = [];
  const parked = new Map<string, { reason: string; version: string }>();
  const isParked = (r: OutboxRow) => parked.get(r.id)?.version === JSON.stringify(r);
  return {
    appendAtomically(entry, row) {
      state = { ...state, entries: [...state.entries, entry] };
      outbox.push(row);
    },
    appendEvent(entries, rows) {
      state = { ...state, entries: [...state.entries, ...entries] };
      outbox.push(...rows);
    },
    // ponytail: this port holds one day, so "any day" is today; the SQLite port reads every day.
    findEntry: (id) => state.entries.find((e) => e.id === id),
    entriesReferringTo: (id) => state.entries.filter((e) => e.refersToEntryId === id),
    recentEntries: (sections, limit) =>
      state.entries.filter((e) => sections.includes(e.section)).reverse().slice(0, limit),
    putHeldCorrections(held) {
      state = { ...state, heldCorrections: held };
    },
    putDay(day, row) {
      state = { ...state, day };
      /*
       * A DAY ROW REPLACES ITS PENDING SELF. A day record is the whole state of
       * the day rather than a delta, and `upsertDay` on the server replaces it
       * wholesale - so queueing "opened" and then "closed" separately would send
       * a superseded figure first for no benefit. Entries are deltas and are
       * never replaced, which is why only this path dedupes.
       */
      outbox = [...outbox.filter((r) => r.id !== row.id), row];
    },
    putParty(party, row) {
      const known = state.parties.some((p) => p.id === party.id);
      state = {
        ...state,
        parties: known ? state.parties.map((p) => (p.id === party.id ? party : p)) : [...state.parties, party],
      };
      outbox.push(row);
    },
    appendUpiConfirmations(cs, rows) {
      state = { ...state, upiConfirmations: [...(state.upiConfirmations ?? []), ...cs] };
      outbox.push(...rows);
    },
    appendAdjustment(a, row) {
      state = { ...state, adjustments: [...(state.adjustments ?? []), a] };
      outbox.push(row);
    },
    putItem(item, row) {
      state = { ...state, items: [...(state.items ?? []), item] };
      outbox.push(row);
    },
    appendItemLine(line, row) {
      state = { ...state, itemLines: [...(state.itemLines ?? []), line] };
      outbox.push(row);
    },
    appendCreditLimit(l, row) {
      state = { ...state, creditLimits: [...(state.creditLimits ?? []), l] };
      outbox.push(row);
    },
    putShopName(shopName) {
      state = { ...state, shopName };
    },
    putDayStart(dayStartsAt) {
      state = { ...state, dayStartsAt };
    },
    load: () => state,
    pendingOutbox: () => outbox.filter((r) => !isParked(r)),
    parkOutbox(refused) {
      for (const r of refused) {
        const row = outbox.find((o) => o.id === r.id);
        if (row) parked.set(r.id, { reason: r.reason, version: JSON.stringify(row) });
      }
    },
    unparkOutbox: () => parked.clear(),
    parkedOutbox: () => outbox.filter(isParked).map((r) => ({ id: r.id, reason: parked.get(r.id)!.reason })),
    ackOutbox(ids, sent) {
      const done = new Set(ids);
      outbox = outbox.filter((r) => !done.has(r.id) || !isSentVersion(r, sent));
    },
    eraseAll() {
      const {
        shopName: _erased,
        dayStartsAt: _setting,
        heldCorrections: _held,
        adjustments: _adjustments,
        upiConfirmations: _confirmations,
        items: _items,
        itemLines: _itemLines,
        creditLimits: _limits,
        ...rest
      } = state;
      void _limits;
      void _erased;
      void _setting;
      void _held;
      void _adjustments;
      void _confirmations;
      void _items;
      void _itemLines;
      state = {
        ...rest,
        day: { date: state.day.date, state: 'open', openingCash: null, countedCash: null, skippedSections: [] },
        entries: [],
        parties: [],
        priorCreditOutstanding: 0,
        priorSupplierOutstanding: 0,
        skippedSections: [],
      };
      outbox = [];
      parked.clear();
    },
  };
}

export class AppendOnlyViolation extends Error {
  constructor(what: string) {
    super(
      `${what} - entries are append-only (D1). Correct a mistake by appending a ` +
        'correction that references the original, never by changing what was typed. ' +
        'What he entered is what the ledger says he entered, permanently.',
    );
    this.name = 'AppendOnlyViolation';
  }
}

/** Which kind of party each party-bearing section names. Derived from the sign table's four sections. */
export const PARTY_KIND: Readonly<Partial<Record<Entry['section'], Party['kind']>>> = {
  udhar_sales: 'customer',
  udhar_collection: 'customer',
  purchase: 'supplier',
  party_payment: 'supplier',
  // A return comes back from a customer, whichever of its legs names him.
  sales_return: 'customer',
  exchange_out: 'customer',
  exchange_receipt: 'customer',
  refund_paid: 'customer',
};

export class PartyKindMismatch extends Error {
  constructor(section: string, kind: string) {
    super(`a ${section} entry needs a ${kind}, and the person chosen is not one`);
    this.name = 'PartyKindMismatch';
  }
}

export class DayClosedViolation extends Error {
  constructor(date: string) {
    super(
      `${date} is closed. A closed day is frozen: post the correction against today ` +
        'and reference that day, so its own figures never move.',
    );
    this.name = 'DayClosedViolation';
  }
}

/** See `Store.dayStatus`. */
export type DayStatus =
  | { readonly kind: 'current' }
  | { readonly kind: 'stale'; readonly date: string; readonly today: string }
  | { readonly kind: 'future'; readonly date: string; readonly today: string };

/**
 * WHEN THE SHOP CLOSES, UNTIL THE SHOP SAYS. 20:00 wall-clock.
 *
 * CTO DECISION (reversible, 2026-11-18, USABILITY §4 item 1): the store holds
 * only the business day's START (decision 1), so there is no closing time to
 * read. 20:00 is a placeholder for "evening", chosen so the close is promoted
 * for the 9 pm close the usability pass describes; it is not a measured fact
 * about any shop. When a closing-time setting exists, Today passes it instead.
 */
export const DEFAULT_CLOSES_AT: DayStart = '20:00';

export class Store {
  #state: StoreState;
  readonly #port: PersistencePort;
  /**
   * WHEN A ROW WAS QUEUED, AND WHEN A DAY WAS CLOSED. Injected, because a test
   * that cannot fix the clock cannot assert on either, and because the one
   * place a real clock belongs is the composition root.
   */
  readonly #now: () => string;
  /** Bumped on every write, so a test can prove a screen re-derived rather than cached. */
  #revision = 0;

  constructor(port: PersistencePort, now: () => string = () => new Date().toISOString()) {
    const loaded = port.load();
    if (!loaded) throw new Error('the persistence port returned no state');
    this.#port = port;
    this.#state = loaded;
    this.#now = now;
    this.#releaseHeldCorrections();
  }

  /**
   * F-19: OPEN THE NEXT DAY WITHOUT A RESTART. The port opens a new day only in
   * `load()`, and that used to run once, at launch - so after an evening close
   * every entry next morning was refused against the closed day until the app
   * was killed. Asked again here whenever a closed day might have ended.
   * Returns true if a new day began.
   */
  startNextDayIfDue(): boolean {
    if (this.#state.day.state !== 'closed') return false;
    const next = this.#port.load();
    if (!next || next.day.date === this.#state.day.date) return false;
    this.#state = next;
    this.#revision += 1;
    this.#releaseHeldCorrections();
    return true;
  }

  /**
   * HT-11: THE MOMENT A DAY IS OPEN, the corrections typed while none was are
   * appended to it - dated to it, never to the frozen day they correct.
   *
   * IDEMPOTENT BY ID. Each held correction carries the id its entry will have, so
   * a process killed between the append and clearing the list finds the entry
   * already in the book next launch and does not post it twice.
   */
  #releaseHeldCorrections(): void {
    const held = this.#state.heldCorrections ?? [];
    if (held.length === 0 || this.#state.day.state === 'closed') return;
    for (const h of held) {
      if (this.#port.findEntry(h.id) !== undefined) continue;
      const original = this.#port.findEntry(h.originalId);
      // ponytail: an original that has vanished (an erased book) drops its correction; nothing else can.
      if (original === undefined) continue;
      this.append(
        buildCorrection({ original, id: h.id, dayId: this.#state.day.date, createdAt: this.#now(), amount: h.amount }),
      );
    }
    this.#port.putHeldCorrections([]);
    this.#state = { ...this.#state, heldCorrections: [] };
    this.#revision += 1;
  }

  /* ---- returns, exchanges and corrections (§2.3, HT-11) -------------- */

  /** Any entry in the book, on any day. */
  findEntry(id: string): Entry | undefined {
    return this.#port.findEntry(id);
  }

  /** Every entry, on any day, that refers to this one: a sale's returns, a return's settlements. */
  entriesReferringTo(id: string): readonly Entry[] {
    return this.#port.entriesReferringTo(id);
  }

  /** The newest sales, on any day, that a return could point at. Newest first. */
  recentSales(limit = 30): readonly Entry[] {
    return this.#port.recentEntries(RETURNABLE_SECTIONS, limit);
  }

  /** The newest returns, on any day, newest first - to settle a pending one. */
  recentReturns(limit = 30): readonly Entry[] {
    return this.#port.recentEntries(['sales_return'], limit);
  }

  /** The four-state fold for one return, derived now from its legs. Never stored. */
  settlement(ret: Entry): ReturnSettlement {
    return settlementOf(ret, this.entriesReferringTo(ret.id));
  }

  /**
   * APPEND ONE EVENT - a return and what settled it - ALL ROWS OR NONE (EX-6).
   *
   * Every leg is checked against the row it points at and against that row's
   * other legs, in the engine (`assertLegFits`) - the same rule the server runs -
   * so a duplicate refund or a return of more than was sold never reaches the
   * port. Then one transaction for every entry and outbox row.
   */
  appendEvent(legs: readonly Entry[]): void {
    if (legs.length === 0) return;
    const accepted: Entry[] = [];
    for (const leg of legs) {
      if (this.#state.entries.some((e) => e.id === leg.id) || this.#port.findEntry(leg.id)) {
        throw new AppendOnlyViolation(`entry ${leg.id} already exists`);
      }
      if (this.#state.day.state === 'closed' && leg.dayId === this.#state.day.date) {
        throw new DayClosedViolation(leg.dayId);
      }
      this.#assertPartyKind(leg);
      const targetId = leg.refersToEntryId;
      const target =
        targetId === undefined
          ? undefined
          : (accepted.find((e) => e.id === targetId) ?? this.#port.findEntry(targetId));
      const siblings =
        targetId === undefined
          ? []
          : [...this.#port.entriesReferringTo(targetId), ...accepted.filter((e) => e.refersToEntryId === targetId)];
      assertLegFits(leg, target, siblings);
      accepted.push(leg);
    }
    this.#port.putDay(this.#state.day, this.#dayRow(this.#state.day, legs[0]!.createdAt));
    this.#port.appendEvent(
      accepted,
      accepted.map((entry) => ({ id: `ob-${entry.id}`, kind: 'entry', payload: entry, queuedAt: entry.createdAt })),
    );
    this.#state = { ...this.#state, entries: [...this.#state.entries, ...accepted] };
    this.#revision += 1;
  }

  /**
   * HT-11 · "POST A CORRECTION" ON A CLOSED DAY.
   *
   * The closed day stays frozen (D7): the correction is a new entry dated to the
   * OPEN business day, pointing at the entry it corrects. If no day is open - the
   * closed day is still the current business day, by its own `startsAt` - there
   * is nowhere honest to write it, so it is HELD and appended when the next day
   * opens; the screen says so in those words. Returns which of the two happened.
   *
   * Reopening the closed day instead (review scenario 15) is refused by design:
   * D7 forbids it, and this is the answer to it.
   */
  postCorrection(c: { readonly id: string; readonly originalId: string; readonly amount: Paise }): 'recorded' | 'held' {
    const original = this.#port.findEntry(c.originalId);
    if (original === undefined) {
      throw new AppendOnlyViolation(`there is no entry ${c.originalId} to correct`);
    }
    const day = this.#state.day;
    if (day.state === 'closed') {
      // Refuse now what would be refused at release, against the day that will receive it.
      buildCorrection({ original, id: c.id, dayId: addDays(day.date, 1), createdAt: this.#now(), amount: c.amount });
      const held: HeldCorrection = { id: c.id, originalId: c.originalId, amount: c.amount, heldAt: this.#now() };
      const list = [...(this.#state.heldCorrections ?? []), held];
      this.#port.putHeldCorrections(list);
      this.#state = { ...this.#state, heldCorrections: list };
      this.#revision += 1;
      return 'held';
    }
    this.append(buildCorrection({ original, id: c.id, dayId: day.date, createdAt: this.#now(), amount: c.amount }));
    return 'recorded';
  }

  /**
   * DV-7, shared by both append paths. The rule is the engine's
   * `assertPartyKind` (the server runs the same one, `party_kind_mismatch`);
   * this adds only what the engine leaves to the store - a party this book does
   * not hold is not the right kind either.
   */
  #assertPartyKind(entry: Entry): void {
    const kind = PARTY_KIND[entry.section];
    if (entry.partyId === undefined) return;
    const party = this.#state.parties.find((p) => p.id === entry.partyId);
    if (kind && party === undefined) throw new PartyKindMismatch(entry.section, kind);
    try {
      assertPartyKind(entry, party);
    } catch (e) {
      if (e instanceof EntryInputError && e.field === 'party_kind_mismatch') {
        throw new PartyKindMismatch(entry.section, kind ?? 'different party');
      }
      throw e;
    }
  }

  /**
   * CANCEL THIS ENTRY (docs/design/CANCEL-ENTRY-GATE.md). A new row that repeats
   * the target exactly and names it in `cancelsEntryId`; the engine's
   * `buildCancel` refuses a cancel of a cancel, a return leg, an entry with a
   * return or correction pointing at it, and a second cancel. OPEN DAY ONLY:
   * a closed day takes a correction (T16), and the D7 trigger agrees. Queued
   * like any entry, so an offline cancel waits for signal.
   */
  cancel(d: { readonly targetId: string; readonly id: string; readonly createdAt: string }): Entry {
    const target = this.#state.entries.find((e) => e.id === d.targetId);
    if (target === undefined) throw new EntryInputError('cancel_target_missing', 'that entry is not in the book for today');
    if (this.#state.day.state === 'closed' || target.dayId !== this.#state.day.date) {
      throw new EntryInputError('entries_closed_day', 'the day is closed; post a correction instead');
    }
    const cancel = buildCancel({
      target,
      id: d.id,
      createdAt: d.createdAt,
      ledger: [...this.#state.entries, ...this.#port.entriesReferringTo(target.id)],
    });
    this.append(cancel);
    return cancel;
  }

  get revision(): number {
    return this.#revision;
  }

  get state(): StoreState {
    return this.#state;
  }

  get pendingOutbox(): readonly OutboxRow[] {
    return this.#port.pendingOutbox();
  }

  /** FE-11: stop re-sending rows the server refused; see `PersistencePort.parkOutbox`. */
  parkOutbox(rows: readonly { readonly id: string; readonly reason: string }[]): void {
    this.#port.parkOutbox(rows);
  }

  /** C-19 residual: today's closed book was closed under a wrong phone date; see `sqlitePort.load`. */
  get closedUnderWrongDate(): boolean {
    return this.#state.closedUnderWrongDate === true && this.#state.day.state === 'closed';
  }

  /** Re-queue the parked rows (launch and foreground); `Host` does this once per such moment. */
  unparkOutbox(): void {
    this.#port.unparkOutbox();
  }

  /**
   * C-19: the date of a closed day that was saved under a wrong phone date and
   * is still ahead of the clock; null otherwise. Derived on read.
   */
  get misdatedDate(): string | null {
    const m = this.#state.misdatedDate;
    if (m === undefined) return null;
    try {
      return m > businessDate(this.#now(), this.#state.day.startsAt ?? MIDNIGHT) ? m : null;
    } catch {
      return null;
    }
  }

  /** Rows the server refused and that are no longer being re-sent. */
  get parkedOutbox(): readonly { readonly id: string; readonly reason: string }[] {
    return this.#port.parkedOutbox();
  }

  /**
   * C-17 / C-19: IS THE OPEN BOOK ON THE RIGHT DAY? Derived on read from the
   * injected clock, never stored.
   *
   *   stale   an OPEN day whose business date has ended by its own rule. He has
   *           not closed it; nothing here closes it for him (the cash count is
   *           his, D6) and nothing rolls it over.
   *   future  a day dated AFTER the business date the clock now gives - the
   *           phone's clock went forward and was corrected. The day is never
   *           edited (D1, D7); the screen says why the date looks wrong.
   */
  dayStatus(): DayStatus {
    const day = this.#state.day;
    let today: string;
    try {
      today = businessDate(this.#now(), day.startsAt ?? MIDNIGHT);
    } catch {
      return { kind: 'current' }; // an unreadable clock must not lock the book
    }
    if (day.date > today) return { kind: 'future', date: day.date, today };
    if (day.state === 'open' && day.date < today) return { kind: 'stale', date: day.date, today };
    return { kind: 'current' };
  }

  /** Drop what the server has taken. Anything not named stays queued. */
  ackOutbox(ids: readonly string[], sent?: readonly OutboxRow[]): void {
    this.#port.ackOutbox(ids, sent);
  }

  /** F-22: empty this phone's book - see `PersistencePort.eraseAll`. */
  eraseAll(): void {
    this.#port.eraseAll();
    const next = this.#port.load();
    if (!next) throw new Error('the persistence port returned no state');
    this.#state = next;
    this.#revision += 1;
  }

  /** One queued row per day, carrying the whole record. */
  #dayRow(day: DayRecord, at: string): OutboxRow {
    return { id: 'ob-day-' + day.date, kind: 'day', payload: day, queuedAt: at };
  }

  /**
   * CANCEL THIS ENTRY: today's entries that still count - every row but a
   * cancel row and the entry it cancels (`liveEntries`). Every figure, list and
   * count reads this; only the entry list itself (which strikes the original
   * through) and the accountant export read the raw record.
   */
  get live(): readonly Entry[] {
    return liveEntries(this.#state.entries);
  }

  /** Today's cancel row for this entry, or undefined. */
  cancelOf(entryId: string): Entry | undefined {
    return this.#state.entries.find((e) => e.cancelsEntryId === entryId);
  }

  /** Exactly what the engine needs, assembled on demand. Never stored. */
  get input(): DayInput {
    return {
      day: this.#state.day,
      // Cancel this entry: the pair is excluded ONCE, here, never inside a figure function.
      entries: this.live,
      adjustments: this.#state.adjustments ?? [],
      upiConfirmations: this.#state.upiConfirmations ?? [],
      priorCreditOutstanding: this.#state.priorCreditOutstanding,
      priorSupplierOutstanding: this.#state.priorSupplierOutstanding,
    };
  }

  /**
   * Every primary figure, computed NOW. Deliberately not memoised: a cache here is
   * the stored total this product refuses to have, one layer up.
   */
  primary(): PrimaryOutputs {
    return computePrimary(this.input);
  }

  /**
   * R1's readings: BI1-BI6 and the two scores of docs/spec/SCORES.md, over the
   * whole history this phone holds, derived NOW. Not memoised, for the reason
   * `primary()` is not - and BE-10's measured cost (SCORES.md §7) says it does
   * not need to be. One grouping pass for the day summaries, one fold for BI6.
   */
  reports(): Reports {
    const today = this.#state.day;
    const days = [...(this.#state.pastDays ?? []), today];
    const entries = liveEntries([...(this.#state.pastEntries ?? []), ...this.#state.entries]);
    // Only the trailing window is summarised: every reading needs no more, and
    // the full-history version was most of the measured cost (SCORES.md §7).
    const window = closedDaySummaries(days, entries, SCORE_WINDOW_DAYS);
    const p = this.primary();
    // BI6's baseline is the PRIOR closes; today's own share is what it is compared to.
    const credit = customerCreditFold(
      entries,
      window.map((d) => d.date).filter((d) => d !== today.date),
    );
    return {
      closedDays: days.filter((d) => d.state === 'closed').length,
      windowClosedDays: window.length,
      intelligence: computeIntelligence(
        window,
        p.p7CreditOutstanding.value,
        p.p8SupplierOutstanding.value,
        p.p3ExpectedCashBalance.value,
        credit.open,
        credit.top3BasisPointsAtClose,
      ),
      // The window holds at most 30 closed days, so its length opens the gate of
      // 14 exactly when the full count would.
      cashConfidence: cashConfidence(window),
      operationalConsistency: operationalConsistency(days, entries, today.date),
    };
  }

  /** The whole book this phone holds: earlier days and today. What was typed, never a total. */
  #book(): Book {
    const st = this.#state;
    return {
      days: [...(st.pastDays ?? []), st.day],
      entries: liveEntries([...(st.pastEntries ?? []), ...st.entries]),
      adjustments: [...(st.pastAdjustments ?? []), ...(st.adjustments ?? [])],
      upiConfirmations: [...(st.pastUpiConfirmations ?? []), ...(st.upiConfirmations ?? [])],
    };
  }

  /**
   * HT-46: THE FIRST DAY THIS BOOK HOLDS. A month or week wholly before it is
   * not a quiet period of this shop - the shop did not exist - so the reports
   * leave it out rather than print a block of zeroes for it.
   */
  #firstDay(book: Book): IsoDate {
    return book.days.reduce((first, d) => (d.date < first ? d.date : first), this.#state.day.date);
  }

  /** FR-7, derived NOW over the whole book, for the reason `reports()` is not memoised. */
  basicReports(): BasicReports {
    const book = this.#book();
    const today = this.#state.day.date;
    const first = monthOf(this.#firstDay(book));
    const months = [monthOf(today), previousMonth(monthOf(today))].filter((m) => m >= first);
    return {
      customerDues: duesByAge(book.entries, 'customer', today),
      supplierDues: duesByAge(book.entries, 'supplier', today),
      months: months.map((m) => monthAtAGlance(book, m)),
      cashChecks: cashCheckHistory(book, CASH_CHECK_HISTORY_DAYS),
      upiMonths: months.map((m) => upiMonth(book, m)),
    };
  }

  /**
   * PR-3 and PR-4, derived NOW. Computing is not gated by plan here: the store
   * answers questions, and the screen asks `allows(plan, ...)` before drawing.
   */
  premiumReports(): PremiumReports {
    const book = this.#book();
    const today = this.#state.day.date;
    return {
      forecast: salesForecast(closedDaySummaries(book.days, book.entries, FORECAST_HISTORY_DAYS), today),
      samePeriodLastYear: samePeriodLastYear(book, today),
      festivalWeeks: festivalWeeks(book, today),
      daysToPay: daysToPay(book),
      returnsTrend: returnsTrend(book, today, RETURNS_TREND_WEEKS).filter((w) => w.to >= this.#firstDay(book)),
    };
  }

  /** P3 with its working - the cash check shows the derivation, not a verdict. */
  expectedCash(): { value: Paise; working: Working } {
    return expectedCashBalance(this.input);
  }

  /**
   * What one section of the paper sheet comes to, right now.
   *
   * IT LIVES HERE RATHER THAN ON THE SCREEN, and it goes through `sum`. A screen
   * that adds its own rows up with `+` is a second implementation of a total the
   * day-close sheet also computes - two answers to one question, and the first
   * time they disagree the shopkeeper has no way to tell which is his. ADR-003
   * also means a bare `+` on money would not survive check:money.
   */
  sectionTotal(section: Entry['section']): Paise {
    return sum(this.live.filter((e) => e.section === section).map((e) => e.amount));
  }

  /**
   * Every entry today that names this party, oldest first.
   *
   * The ledger P2 and P3 render. Order is the order they were appended, which
   * for an append-only log is chronological by construction - sorting by a
   * timestamp would be a second ordering that can disagree with the first.
   */
  partyEntries(partyId: string): readonly Entry[] {
    return this.live.filter((e) => e.partyId === partyId);
  }

  /**
   * WHAT TODAY CHANGED ABOUT WHAT THIS PARTY OWES. Signed: positive means they
   * owe more than they did this morning.
   *
   * THIS IS TODAY ONLY, AND THAT IS A REAL LIMITATION RATHER THAN A CHOICE.
   *
   * A party's true balance is its carried balance plus today's movement, and
   * this store has no carried per-party figure to add. `StoreState` holds
   * `priorCreditOutstanding` and `priorSupplierOutstanding`, which are
   * SHOP-level aggregates - the engine's own `OpenCustomerCredit` and
   * `OpenSupplierDue` are the per-party form, and nothing outside
   * `formula-engine` constructs them yet because nothing persists across days
   * (W4 - the SQLite port is unwritten and `memoryPort` loses the day on a
   * kill).
   *
   * So P1, P2 and P3 show today's movement per party and the shop's two
   * outstanding totals unattributed, and they say which is which on screen.
   * The alternative was to divide the shop total across parties by some rule,
   * which would put a figure in front of a shopkeeper that nobody computed from
   * anything he typed. The aging badges stay out for the same reason: `ageDays`
   * needs the date the credit was given, which is in the carried record this
   * store does not have.
   *
   * When the persistence port lands, this returns balance rather than movement
   * and the screens lose their qualifier. Until then the qualifier is the
   * honest part of the screen.
   */
  partyMovementToday(partyId: string): Paise {
    /*
     * A CASH PURCHASE CREATES NO SUPPLIER DUE - the engine's own rule for P8
     * (primary.ts, `supplierOutstanding`). Counting it here made a supplier
     * paid on the spot look owed, so the ledger disagreed with the shop total.
     * `partyEffect` holds that rule, and the return legs' udhar-only rule,
     * for this and for the party ledger alike.
     */
    return sum(this.partyEntries(partyId).map(partyEffect));
  }

  /* ---- R5 FR-1/2/5/6: what a customer owes, over every day ----------- */

  /** Every entry this phone holds, every day, in append order. What was typed, never a total. */
  allEntries(): readonly Entry[] {
    return [...(this.#state.pastEntries ?? []), ...this.#state.entries];
  }

  /**
   * EVERY LINE THAT NAMES THIS PARTY, ON EVERY DAY THIS PHONE HOLDS, oldest
   * first - the statement FR-2 shares. Append order is day order (the SQLite
   * port reads earlier days by seq, then today).
   */
  partyLedger(partyId: string): readonly Entry[] {
    return liveEntries(this.allEntries()).filter((e) => e.partyId === partyId);
  }

  /**
   * WHAT THIS PARTY OWES NOW, OVER EVERY DAY THIS PHONE HOLDS. Derived on the
   * call through `partyEffect`, the same signs the ledger lines use, so the
   * statement's running balance ends exactly here. Not today's movement: that
   * is `partyMovementToday`, and P1/P2 still label theirs as such.
   */
  partyBalance(partyId: string): Paise {
    return sum(this.partyLedger(partyId).map(partyEffect));
  }

  /**
   * R5 FR-5 · CUSTOMERS WHO OWE, OLDEST DEBT FIRST. One replay of the book: a
   * customer's `since` is the day his balance last rose above zero, so a line
   * settled long ago does not make a fresh debt look old. Ties go to the larger
   * amount. Suppliers are not here - this is money to collect.
   */
  customerDues(): readonly CustomerDue[] {
    const customers = new Set(this.#state.parties.filter((p) => p.kind === 'customer').map((p) => p.id));
    const owed = new Map<string, Paise>();
    const since = new Map<string, IsoDate>();
    for (const e of liveEntries(this.allEntries())) {
      if (e.partyId === undefined || !customers.has(e.partyId)) continue;
      const before = owed.get(e.partyId) ?? 0;
      const after = sum([before, partyEffect(e)]);
      if (before <= 0 && after > 0) since.set(e.partyId, e.dayId);
      owed.set(e.partyId, after);
    }
    return [...owed.entries()]
      .filter(([, amount]) => amount > 0)
      .map(([partyId, amount]) => ({ partyId, amount, since: since.get(partyId)! }))
      .sort((a, b) => (a.since < b.since ? -1 : a.since > b.since ? 1 : subtract(b.amount, a.amount)));
  }

  /** R5 FR-6: the limit in force for this customer, or null. */
  creditLimit(partyId: string): Paise | null {
    return limitInForce(this.#state.creditLimits ?? [], partyId);
  }

  /**
   * R5 FR-6 · "his udhar would be X, above the limit Y you set" - or null.
   * Something to review: it blocks nothing and changes no figure.
   */
  creditLimitObservation(partyId: string, sale: Paise): CreditLimitObservation | null {
    return creditLimitObservation(this.partyBalance(partyId), sale, this.creditLimit(partyId));
  }

  /**
   * R5 FR-6 · SET OR CLEAR A CUSTOMER'S LIMIT - a new row every time (D1).
   * Refused for a supplier, an unknown party and a duplicate id. Not a day
   * fact, so a closed day does not refuse it: it changes no day's figures.
   */
  setCreditLimit(limit: CreditLimit): void {
    const party = this.#state.parties.find((p) => p.id === limit.partyId);
    if (party?.kind !== 'customer') throw new PartyKindMismatch('credit limit', 'customer');
    if ((this.#state.creditLimits ?? []).some((l) => l.id === limit.id)) {
      throw new AppendOnlyViolation('credit limit ' + limit.id + ' already exists');
    }
    this.#port.appendCreditLimit(limit, {
      id: 'ob-limit-' + limit.id,
      kind: 'credit_limit',
      payload: limit,
      queuedAt: limit.setAt,
    });
    this.#state = { ...this.#state, creditLimits: [...(this.#state.creditLimits ?? []), limit] };
    this.#revision += 1;
  }

  /**
   * SECTIONS HE HAS SAID ARE EMPTY, as opposed to sections he has not reached.
   *
   * D8: skipped and untouched produce the SAME total and a different day state.
   * That distinction is the one a screen can get wrong while every number on it
   * stays right - a day showing eight zeroes cannot tell you whether the shop
   * sold nothing or whether nobody has finished entering. Only the shopkeeper
   * knows, so only the shopkeeper can say, and saying it is a write.
   */
  skip(section: Section): void {
    if (this.#state.day.state === 'closed') {
      throw new DayClosedViolation(this.#state.day.date);
    }
    if (this.#state.skippedSections.includes(section)) return;
    /*
     * A SKIP IS A WRITE, so it goes through the port with the day it belongs
     * to. It used to change memory only, and a restart un-said it.
     */
    const skippedSections = [...this.#state.skippedSections, section];
    const day = { ...this.#state.day, skippedSections };
    this.#port.putDay(day, this.#dayRow(day, this.#now()));
    this.#state = { ...this.#state, day, skippedSections };
    this.#revision += 1;
  }

  /**
   * USABILITY item 7: "NOTHING TODAY" HAS A ONE-TAP UNDO.
   *
   * One tap marked a section skipped with no confirmation (U-50), so the way
   * back has to be one tap too. A skip is DAY STATE, not an entry: D1 governs
   * entries and none is touched here, and the server never stores a skip (the
   * client's `dayPayload` drops `skippedSections`; dpdp/routes.ts says so), so
   * taking one back is a local write through the same port `skip` uses. A
   * closed day is frozen (D7) and refuses it exactly as it refuses the skip.
   */
  unskip(section: Section): void {
    if (this.#state.day.state === 'closed') {
      throw new DayClosedViolation(this.#state.day.date);
    }
    if (!this.#state.skippedSections.includes(section)) return;
    const skippedSections = this.#state.skippedSections.filter((x) => x !== section);
    const day = { ...this.#state.day, skippedSections };
    this.#port.putDay(day, this.#dayRow(day, this.#now()));
    this.#state = { ...this.#state, day, skippedSections };
    this.#revision += 1;
  }

  /**
   * USABILITY item 1: HAS THE SHOP REACHED ITS CLOSING TIME? Derived on read
   * from the injected clock, never stored.
   *
   * Today promotes "Continue day close" to the one marigold button only from
   * this moment; before it, recording sales is the job and the close is a
   * secondary button. The store holds when a business day STARTS (decision 1)
   * and nothing about when the shop closes, so the time is passed in and
   * defaults to `DEFAULT_CLOSES_AT` (a reversible CTO default, see there).
   *
   * Measured from the day's own start, so a shop whose day starts at 05:00 and
   * trades past midnight is still "past closing" at 00:30. A day that has
   * already ended by its own rule (stale) is past closing by definition; a
   * day dated ahead of the clock is not. An unreadable clock says no, which
   * only ever leaves the button secondary - it never hides it.
   */
  closingDue(closesAt: DayStart = DEFAULT_CLOSES_AT): boolean {
    const status = this.dayStatus();
    if (status.kind === 'stale') return true;
    if (status.kind === 'future') return false;
    const m = /T(\d{2}):(\d{2})/.exec(this.#now());
    if (!m) return false;
    const minutes = parseInt(m[1] as string, 10) * 60 + parseInt(m[2] as string, 10);
    const start = dayStartMinutes(this.#state.day.startsAt ?? MIDNIGHT);
    const day = 24 * 60;
    const sinceStart = (minutes - start + day) % day;
    const closeSinceStart = (dayStartMinutes(closesAt) - start + day) % day;
    return sinceStart >= closeSinceStart;
  }

  /**
   * A new customer or supplier - F-10, the credit book had no way in.
   *
   * The name is kept exactly as typed apart from surrounding spaces. Refuses
   * an empty name and a duplicate id; a duplicate NAME is allowed, because two
   * customers called Ramesh is an ordinary Tuesday.
   */
  addParty(party: Party): void {
    const name = party.name.trim();
    if (name === '') throw new Error('a party needs a name');
    /*
     * THE SERVER'S OWN LIMITS (sync/routes.ts party schema). Anything outside
     * them is a 400 for the WHOLE batch, so one long name would jam the outbox
     * for ever; refuse it here, while he is still looking at the form.
     */
    if (name.length > 120) throw new Error('a party name is at most 120 characters');
    if (party.phone !== undefined && (party.phone.length < 8 || party.phone.length > 16)) {
      throw new Error('a phone number is 8 to 16 characters');
    }
    if (this.#state.parties.some((p) => p.id === party.id)) {
      throw new AppendOnlyViolation(`party ${party.id} already exists`);
    }
    const clean: Party = { ...party, name };
    this.#port.putParty(clean, {
      id: 'ob-party-' + clean.id,
      kind: 'party',
      payload: clean,
      queuedAt: this.#now(),
    });
    this.#state = { ...this.#state, parties: [...this.#state.parties, clean] };
    this.#revision += 1;
  }

  /**
   * HT-43: A PHONE NUMBER FOR A PARTY SAVED WITHOUT ONE. FR-1's reminder needs
   * it, and there was no way to add it afterwards. A party is a profile, not a
   * money fact: no figure moves, and the server's `upsertParty` already takes a
   * phone for an existing id (COALESCE - it never clears one). Same limits as
   * `addParty`, for the same reason: a bad row jams the outbox.
   */
  setPartyPhone(partyId: string, phone: string): void {
    const party = this.#state.parties.find((p) => p.id === partyId);
    if (party === undefined) throw new Error('that name is no longer in the book');
    if (phone.length < 8 || phone.length > 16) throw new Error('a phone number is 8 to 16 characters');
    const next: Party = { ...party, phone };
    this.#port.putParty(next, {
      id: 'ob-party-' + next.id,
      kind: 'party',
      payload: next,
      queuedAt: this.#now(),
    });
    this.#state = {
      ...this.#state,
      parties: this.#state.parties.map((p) => (p.id === partyId ? next : p)),
    };
    this.#revision += 1;
  }

  setShopName(name: string): void {
    this.#port.putShopName(name);
    this.#state = { ...this.#state, shopName: name };
    this.#revision += 1;
  }

  /**
   * DECISION 1: WHEN THE SHOP'S DAY STARTS - for days opened from now on.
   *
   * THE OPEN DAY IS NOT TOUCHED, and that is the whole design. Nothing recorded
   * says which day a 00:30 entry belonged to under a rule that did not exist
   * when it was typed, so a day keeps the `startsAt` it was created under and a
   * closed day stays exactly as it was closed (D7). This is a cutover, never a
   * migration: the setting governs the next day the port opens, and no other.
   */
  setDayStart(startsAt: DayStart): void {
    dayStartMinutes(startsAt); // throws on anything that is not a real HH:MM
    this.#port.putDayStart(startsAt);
    this.#state = { ...this.#state, dayStartsAt: startsAt };
    this.#revision += 1;
  }

  /** Decision 3: the UPI check, derived now. Never stored, never cached. */
  upiCheck(): UpiCheck {
    return upiCheck(this.input);
  }

  /**
   * DECISION 3: "these UPI receipts arrived". Per entry (one) or bulk (all the
   * unconfirmed ones the screen showed), as one write either way.
   *
   * Each must name a UPI receipt of TODAY not already confirmed; anything else
   * is refused rather than quietly skipped, because a confirmation the store
   * dropped is a tick the shopkeeper saw land and the ledger never got. A day
   * may close without any of this (it then says "UPI not checked"); a closed
   * day takes none of it (D7).
   */
  confirmUpi(confirmations: readonly UpiConfirmation[]): void {
    const day = this.#state.day;
    if (day.state === 'closed') throw new DayClosedViolation(day.date);
    if (confirmations.length === 0) return;
    const done = new Set((this.#state.upiConfirmations ?? []).map((c) => c.entryId));
    const seen = new Set<string>();
    for (const c of confirmations) {
      const entry = this.#state.entries.find((e) => e.id === c.entryId);
      if (!entry || entry.dayId !== day.date || c.dayId !== day.date || !isUpiReceipt(entry)) {
        throw new Error('entry ' + c.entryId + ' is not one of the UPI receipts of ' + day.date);
      }
      if (done.has(c.entryId) || seen.has(c.entryId)) {
        throw new AppendOnlyViolation('UPI receipt ' + c.entryId + ' is already confirmed');
      }
      seen.add(c.entryId);
    }
    // The day travels first, as it does with an entry (the server's FK).
    this.#port.putDay(day, this.#dayRow(day, this.#now()));
    this.#port.appendUpiConfirmations(
      confirmations,
      confirmations.map((c) => ({
        id: 'ob-upi-' + c.id,
        kind: 'upi_confirmation',
        payload: c,
        queuedAt: c.confirmedAt,
      })),
    );
    this.#state = {
      ...this.#state,
      upiConfirmations: [...(this.#state.upiConfirmations ?? []), ...confirmations],
    };
    this.#revision += 1;
  }

  /**
   * DECISION 2: a typed adjustment, from the fixed list, amount from the keypad.
   * Append-only (D1) and refused on a closed day (D7). The record arrives already
   * through `parseAdjustment`, so it cannot carry a word of free text.
   */
  addAdjustment(adjustment: Adjustment): void {
    const day = this.#state.day;
    if (day.state === 'closed') throw new DayClosedViolation(day.date);
    if (adjustment.dayId !== day.date) throw new DayClosedViolation(adjustment.dayId);
    if ((this.#state.adjustments ?? []).some((a) => a.id === adjustment.id)) {
      throw new AppendOnlyViolation('adjustment ' + adjustment.id + ' already exists');
    }
    this.#port.putDay(day, this.#dayRow(day, adjustment.createdAt));
    this.#port.appendAdjustment(adjustment, {
      id: 'ob-adj-' + adjustment.id,
      kind: 'adjustment',
      payload: adjustment,
      queuedAt: adjustment.createdAt,
    });
    this.#state = { ...this.#state, adjustments: [...(this.#state.adjustments ?? []), adjustment] };
    this.#revision += 1;
  }

  /* ---- PR-1 / PR-2 · items (Premium; the gate is the caller's) -------- */

  /** His item list, in the order he added it. */
  get items(): readonly ShopItem[] {
    return this.#state.items ?? [];
  }

  /**
   * PR-1: ONE NAME ONTO HIS LIST. Arrives through `parseShopItem`. A second item
   * with the same name is refused - two "Atta" on a list of thirty is a picker
   * he cannot trust. No price, ever: the list holds names.
   */
  addItem(item: ShopItem): void {
    if (item.name.length > ITEM_NAME_MAX) throw new Error('an item name is at most ' + ITEM_NAME_MAX + ' characters');
    if (this.items.some((i) => i.id === item.id)) throw new AppendOnlyViolation('item ' + item.id + ' already exists');
    const lower = item.name.toLocaleLowerCase();
    if (this.items.some((i) => i.name.toLocaleLowerCase() === lower)) {
      // HT-47: a named field, so S9 can say why rather than "check and try again".
      throw new EntryInputError('itemDuplicate', item.name + ' is already on your list');
    }
    this.#port.putItem(item, { id: 'ob-item-' + item.id, kind: 'item', payload: item, queuedAt: item.createdAt });
    this.#state = { ...this.#state, items: [...this.items, item] };
    this.#revision += 1;
  }

  /** The item lines of one sale, in the order he added them. */
  saleLines(entryId: string): readonly ItemLine[] {
    return (this.#state.itemLines ?? []).filter((l) => l.entryId === entryId);
  }

  /**
   * PR-1: ONE ITEM LINE OF ONE OF TODAY'S SALES. Arrives through `parseItemLine`
   * (quantity and amount typed, never suggested). Checked by the engine's
   * `assertLineFits` - the server's own rule - so a line that would take the
   * sale's items past the sale is refused here, before it is ever queued.
   * Never touches the sale, the cash check or profit (D1, D2).
   */
  addItemLine(line: ItemLine): void {
    const day = this.#state.day;
    if (day.state === 'closed') throw new DayClosedViolation(day.date);
    if (line.dayId !== day.date) throw new DayClosedViolation(line.dayId);
    const all = this.#state.itemLines ?? [];
    if (all.some((l) => l.id === line.id)) throw new AppendOnlyViolation('item line ' + line.id + ' already exists');
    if (line.itemId !== undefined && !this.items.some((i) => i.id === line.itemId)) {
      throw new Error('that item is not on your list');
    }
    assertLineFits(line, this.#state.entries.find((e) => e.id === line.entryId), all);
    this.#port.putDay(day, this.#dayRow(day, line.createdAt));
    this.#port.appendItemLine(line, {
      id: 'ob-line-' + line.id,
      kind: 'item_line',
      payload: line,
      queuedAt: line.createdAt,
    });
    this.#state = { ...this.#state, itemLines: [...all, line] };
    this.#revision += 1;
  }

  /** Every entry this phone holds, every day - what the item reports read. */
  #allEntries(): readonly Entry[] {
    return [...(this.#state.pastEntries ?? []), ...this.#state.entries];
  }

  /** PR-2, derived now from what was typed. Never stored, never cached. */
  itemReports(period: Period): ItemReports {
    return itemReports(liveEntries(this.#allEntries()), this.#state.itemLines ?? [], this.items, period);
  }

  /** PR-2: what one named customer usually buys, over a period. */
  customerItems(partyId: string, period: Period): readonly ItemTotal[] {
    return customerItems(liveEntries(this.#allEntries()), this.#state.itemLines ?? [], partyId, period);
  }

  isSkipped(section: Entry['section']): boolean {
    return (this.#state.skippedSections as readonly string[]).includes(section);
  }

  /**
   * The three states D8 asks for, derived rather than stored.
   *
   * `entered` wins over `skipped`: if there are entries in a section, it was not
   * empty, whatever was said earlier.
   */
  sectionState(section: Entry['section']): 'entered' | 'skipped' | 'untouched' {
    if (this.live.some((e) => e.section === section)) return 'entered';
    return this.isSkipped(section) ? 'skipped' : 'untouched';
  }

  /**
   * The opening figure, typed once on the first morning or after a gap.
   *
   * REFUSED ON A CLOSED DAY, and refused if one is already set. The opening cash
   * is the first term of the cash check: changing it after entries exist moves
   * the expected figure under a shopkeeper who has already started counting
   * against it. If it is genuinely wrong, the correction is an entry, like every
   * other correction in this product.
   */
  setOpeningCash(amount: Paise): void {
    if (this.#state.day.state === 'closed') {
      throw new DayClosedViolation(this.#state.day.date);
    }
    if (this.#state.day.openingCash !== null && this.#state.day.openingCash !== undefined) {
      throw new AppendOnlyViolation(
        'the opening cash for ' + this.#state.day.date + ' is already set',
      );
    }
    const day = { ...this.#state.day, openingCash: assertPaise(amount, 'openingCash') };
    this.#port.putDay(day, this.#dayRow(day, this.#now()));
    this.#state = { ...this.#state, day };
    this.#revision += 1;
  }

  /**
   * Append an entry and its outbox row, together.
   *
   * Refuses a duplicate id, and refuses any entry dated into a closed day.
   */
  append(entry: Entry): void {
    // A return's leg is an event, and an event is checked against its siblings.
    if (isEventSection(entry.section)) {
      this.appendEvent([entry]);
      return;
    }
    if (this.#state.entries.some((e) => e.id === entry.id)) {
      throw new AppendOnlyViolation(`entry ${entry.id} already exists`);
    }
    if (this.#state.day.state === 'closed' && entry.dayId === this.#state.day.date) {
      throw new DayClosedViolation(entry.dayId);
    }
    /*
     * HT-11: A CORRECTION POINTS AT A REAL ENTRY OF THE DAY IT SAYS IT CORRECTS.
     * Otherwise "states what it corrects" would be a claim nothing backs.
     */
    if (entry.refersToEntryId !== undefined) {
      const original = this.#port.findEntry(entry.refersToEntryId);
      if (original === undefined || original.dayId !== entry.correctsDayId) {
        throw new AppendOnlyViolation(
          `correction ${entry.id} points at an entry that is not on ${String(entry.correctsDayId)}`,
        );
      }
    }
    /*
     * DV-7: THE PARTY MUST BE THE KIND THE SECTION MEANS. Found on the device:
     * a customer chosen for a credit sale stayed chosen when the segment was
     * switched to "Paid out", and a supplier payment was booked to a customer
     * - wrong ledger, silently. Every entry passes through here, so this is
     * the one place the rule can't be routed around.
     */
    this.#assertPartyKind(entry);
    /*
     * THE DAY GOES WITH IT. "An entry cannot precede its day" is the server's
     * rule and it is the right one - but nothing was queueing the day, so the
     * FIRST entry of every day was refused with `entries_day_fk` and sat in the
     * outbox forever. Both halves were individually correct: the app queued
     * what changed, and a day nobody had changed yet had never been sent.
     *
     * Queueing it here costs one row per day - `putDay` replaces its pending
     * self - and makes the ordering guarantee hold by construction rather than
     * by the shopkeeper happening to set an opening figure first.
     */
    this.#port.putDay(this.#state.day, this.#dayRow(this.#state.day, entry.createdAt));

    const row: OutboxRow = {
      id: `ob-${entry.id}`,
      kind: 'entry',
      payload: entry,
      queuedAt: entry.createdAt,
    };
    this.#port.appendAtomically(entry, row);
    this.#state = { ...this.#state, entries: [...this.#state.entries, entry] };
    this.#revision += 1;
  }

  /**
   * Record the counted cash and close the day.
   *
   * A difference REQUIRES a reason. That is the product's position rather than a
   * validation detail: an unexplained gap let through is a gap nobody will ever
   * explain, and the figures stop meaning anything the first time one passes.
   *
   * The reason list itself is a product question rather than this file's: PRODUCT-REVIEW
   * recommendation 1 argues it needs an honest "I am not sure", because forcing a
   * false reason puts a wrong fact into a ledger that cannot be edited. That decision
   * is tracked there rather than taken here.
   */
  close(countedCash: Paise, differenceReason?: string): void {
    if (this.#state.day.state === 'closed') {
      throw new DayClosedViolation(this.#state.day.date);
    }
    const expected = this.expectedCash().value;
    if (countedCash !== expected && !differenceReason) {
      throw new Error(
        'the count does not match the expected figure, and closing without a reason ' +
          'would record a difference nobody can account for later.',
      );
    }
    const at = this.#now();
    const day: DayRecord = {
      ...this.#state.day,
      state: 'closed',
      countedCash,
      /*
       * WHEN IT WAS CLOSED, RECORDED HERE. The server stamps its own time when
       * a close arrives through its route, but a day closed offline reaches it
       * hours later - and the time that matters to a shopkeeper is the one on
       * the phone in his hand when he finished counting.
       */
      closedAt: at,
      // HT-49: a reason explains a difference; a count that matches has none to explain.
      ...(differenceReason && countedCash !== expected ? { differenceReason } : {}),
    };
    this.#port.putDay(day, this.#dayRow(day, at));
    this.#state = { ...this.#state, day };
    this.#revision += 1;
  }
}
