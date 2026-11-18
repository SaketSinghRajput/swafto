/**
 * RETURNS, EXCHANGES AND CORRECTIONS - the first events that span more than one row.
 *
 * Until these, one entry was one business event. A return is not: the goods come
 * back on one row and the money (if any) goes out on another, possibly days later.
 * An exchange is three: goods back, goods out, and the price difference. Review §6:
 * "the engine should represent it as one business event with linked components,
 * not as two unrelated sales. Otherwise Sales Total can become artificially
 * inflated." (EX-1 to EX-12 in docs/audits/REVIEW-2026-10-22.md.)
 *
 * THE LINK IS ONE COLUMN, `refersToEntryId`. A return points at the sale it
 * reverses; every settlement leg points at its return. There is no events table
 * (a second source of truth about whether an event exists) and NO STORED STATUS.
 *
 * THE FOUR SETTLEMENT STATES ARE A FOLD, NEVER A COLUMN (EX-4). D1 makes a status
 * column unwritable - Pending -> Refunded would be an UPDATE - so the state is
 * derived on read from the legs that exist, and each transition is an INSERT,
 * which is what append-only wants. The names are review §7's, verbatim:
 *
 *   Returned + Refund paid          refund_paid legs settle it in full, some in cash or UPI
 *   Returned + Credit issued        refund_paid legs settle it in full, all against udhar
 *   Returned + Replacement          an exchange_out leg exists: settled in goods
 *   Returned + Pending settlement   less has been paid out than came back - including
 *                                   nothing at all. Pending is the ABSENCE of a row,
 *                                   which is why it cannot drift out of sync.
 *
 * A partly refunded return (scenario 13) is Pending with a non-zero `settled`, not
 * a fifth state. Forward only: you cannot un-refund. A wrong settlement is not
 * corrected by touching it; the over-settlement rule below refuses the duplicate
 * (EX-12), and anything else is a new event.
 *
 * WHAT THIS CANNOT DO, AND MUST NEVER CLAIM (EX-11). There is no item data in V1
 * (D5), so nothing here can establish that a returned item was sold by this shop
 * or at this price. The link to the sale and the cap at the sale's amount are the
 * only structural controls; the confirmation is the shopkeeper's, "by User" as
 * review §7 says, and copy must say "you confirmed", never "verified".
 *
 * PURE. No clock, no ids, no I/O: the caller passes the ledger rows that refer to
 * the event, and the ids and times of new rows (ADR-012).
 */
import { subtract, sum, type Paise } from './money.ts';
import {
  EntryInputError,
  parseCollectionEntry,
  parseExchangeOutEntry,
  parseExchangeReceiptEntry,
  parseExpenseEntry,
  parsePartyPaymentEntry,
  parsePurchaseEntry,
  parseRefundEntry,
  parseReturnEntry,
  parseSalesEntry,
  parseWithdrawalEntry,
  type EntryDraft,
} from './input.ts';
import { isEventSection, type Entry, type EntrySection, type IsoDate } from './types.ts';

/** The parser that owns each section. The section decides, never the caller. */
export const ENTRY_PARSERS: Readonly<Record<EntrySection, (draft: EntryDraft) => Entry>> = {
  cash_sales: parseSalesEntry,
  upi_sales: parseSalesEntry,
  udhar_sales: parseSalesEntry,
  expense: parseExpenseEntry,
  purchase: parsePurchaseEntry,
  udhar_collection: parseCollectionEntry,
  party_payment: parsePartyPaymentEntry,
  withdrawal: parseWithdrawalEntry,
  sales_return: parseReturnEntry,
  exchange_out: parseExchangeOutEntry,
  exchange_receipt: parseExchangeReceiptEntry,
  refund_paid: parseRefundEntry,
};

/** Review §7's four states, in its order. */
export const SETTLEMENT_STATES = [
  'refund_paid',
  'credit_issued',
  'replacement',
  'pending_settlement',
] as const;
export type SettlementState = (typeof SETTLEMENT_STATES)[number];

/** The sections a return can point at: a sale, in any of its three modes. */
export const RETURNABLE_SECTIONS: readonly EntrySection[] = ['cash_sales', 'upi_sales', 'udhar_sales'];

/** One return, folded. Every figure derived from the legs; nothing here is stored. */
export interface ReturnSettlement {
  readonly returnId: string;
  readonly state: SettlementState;
  /** The goods that came back, at the price they went out. */
  readonly returned: Paise;
  /** Replacement goods that went out in an exchange; 0 for a plain return. */
  readonly replacement: Paise;
  /**
   * Which way the money is owed. A plain return, or an exchange for something
   * cheaper, owes the CUSTOMER; an exchange for something dearer owes the SHOP.
   */
  readonly direction: 'to_customer' | 'from_customer' | 'none';
  /** What the event owes in that direction, in full. */
  readonly owed: Paise;
  /** What has been paid against it so far, in any mode. */
  readonly settled: Paise;
  /** owed - settled. Never negative: over-settlement is refused, not folded. */
  readonly outstanding: Paise;
}

const total = (rows: readonly Entry[]): Paise => sum(rows.map((e) => e.amount));
const legsOf = (ret: Entry, ledger: readonly Entry[]): Entry[] =>
  ledger.filter((e) => e.refersToEntryId === ret.id && e.id !== ret.id);

/**
 * THE FOLD. `ledger` is any set of rows that includes the event's legs; rows
 * that do not refer to `ret` are ignored, so the caller may pass a whole day.
 */
export function settlementOf(ret: Entry, ledger: readonly Entry[]): ReturnSettlement {
  if (ret.section !== 'sales_return') {
    throw new Error(`settlementOf: ${ret.id} is a ${ret.section}, not a sales_return`);
  }
  const mine = legsOf(ret, ledger);
  const out = mine.filter((e) => e.section === 'exchange_out');
  const refunds = mine.filter((e) => e.section === 'refund_paid');
  const receipts = mine.filter((e) => e.section === 'exchange_receipt');
  const returned = ret.amount;
  const replacement = total(out);

  if (out.length > 0) {
    // Settled in goods. The money left to move is the price difference only.
    const diff = subtract(replacement, returned);
    const fromCustomer = diff >= 0;
    const owed = fromCustomer ? diff : subtract(0, diff);
    const settled = total(fromCustomer ? receipts : refunds);
    return {
      returnId: ret.id,
      state: 'replacement',
      returned,
      replacement,
      direction: owed === 0 ? 'none' : fromCustomer ? 'from_customer' : 'to_customer',
      owed,
      settled,
      outstanding: subtract(owed, settled),
    };
  }

  const settled = total(refunds);
  const outstanding = subtract(returned, settled);
  const state: SettlementState =
    outstanding > 0
      ? 'pending_settlement'
      : refunds.every((e) => e.mode === 'udhar')
        ? 'credit_issued'
        : 'refund_paid';
  return {
    returnId: ret.id,
    state,
    returned,
    replacement: 0,
    direction: 'to_customer',
    owed: returned,
    settled,
    outstanding,
  };
}

/** How much of a sale is still returnable: its amount less every return already against it. */
export function returnableOf(sale: Entry, ledger: readonly Entry[]): Paise {
  const back = ledger.filter((e) => e.section === 'sales_return' && e.refersToEntryId === sale.id);
  return subtract(sale.amount, total(back));
}

/**
 * DOES THIS LEG FIT THE EVENT IT POINTS AT? Refuses, naming the field; never repairs.
 *
 * `target` is the row the leg's `refersToEntryId` names (undefined if the book
 * does not hold it). `ledger` is the rows already recorded that refer to the same
 * sale or return - the caller looks them up. Called on BOTH commit paths, the
 * phone's store and the server's sync route, so a crafted push meets the same
 * refusals as the keypad (ADR-012, EX-12).
 *
 * THE RULE WITH NO PRECEDENT IN THIS BUILD: an event may never be settled for
 * more than it is worth. Every CHECK constraint constrains one row against
 * constants; this constrains a row against the sum of its siblings, which no CHECK
 * can express - so it lives here, and it is also what stops a double-tapped
 * refund paying out twice (scenario 10).
 */
export function assertLegFits(leg: Entry, target: Entry | undefined, ledger: readonly Entry[]): void {
  if (!isEventSection(leg.section)) return;
  if (target === undefined) {
    throw new EntryInputError(
      'refersToEntryId',
      'the entry this points at is not in the book - record the sale before its return.',
    );
  }
  if (leg.amount <= 0) {
    throw new EntryInputError('amount', 'a return or a settlement of nothing is not an event.');
  }
  if (leg.partyId !== undefined && target.partyId !== undefined && leg.partyId !== target.partyId) {
    throw new EntryInputError('partyId', 'this belongs to a different customer from the sale it returns.');
  }

  if (leg.section === 'sales_return') {
    if (!RETURNABLE_SECTIONS.includes(target.section)) {
      throw new EntryInputError('refersToEntryId', 'only a sale can be returned.');
    }
    const others = ledger.filter((e) => e.id !== leg.id);
    if (leg.amount > returnableOf(target, others)) {
      throw new EntryInputError(
        'amount',
        'more is coming back than was sold - this sale has already been returned up to its amount.',
      );
    }
    return;
  }

  if (target.section !== 'sales_return') {
    throw new EntryInputError('refersToEntryId', 'a refund or an exchange settles a return, and this is not one.');
  }
  const mine = [...legsOf(target, ledger).filter((e) => e.id !== leg.id), leg];
  const after = settlementOf(target, mine);
  const paidBack = mine.some((e) => e.section === 'refund_paid');
  const paidIn = mine.some((e) => e.section === 'exchange_receipt');

  if (after.state !== 'replacement' && paidIn) {
    throw new EntryInputError('section', 'a customer pays a difference only on an exchange.');
  }
  if (after.state === 'replacement' && after.direction === 'from_customer' && paidBack) {
    throw new EntryInputError('section', 'on this exchange the customer owes the shop - nothing is refunded.');
  }
  if (after.state === 'replacement' && after.direction !== 'from_customer' && paidIn) {
    throw new EntryInputError('section', 'on this exchange the shop owes the customer - nothing is received.');
  }
  if (after.outstanding < 0) {
    throw new EntryInputError('amount', 'this return has already been settled in full.');
  }
}

/* ------------------------------------------------------------------ *
 * Building an event: what the return screen commits, as one set of rows
 * ------------------------------------------------------------------ */

/** How the shopkeeper settled it, as he chose on screen. */
export type ReturnSettlementChoice = 'cash' | 'upi' | 'udhar' | 'pending' | 'exchange';

export interface ReturnEventDraft {
  /** The sale being returned. */
  readonly sale: Entry;
  /** Rows already recorded against this sale (its earlier returns), from the book. */
  readonly ledger: readonly Entry[];
  readonly dayId: IsoDate;
  readonly createdAt: string;
  /** Fresh ids from the caller, used in order: return, then replacement, then settlement. */
  readonly ids: readonly string[];
  /** The value of the goods that came back, typed on the keypad. */
  readonly returned: unknown;
  readonly settlement: ReturnSettlementChoice;
  /** Exchange only: the replacement's price, typed on the keypad. */
  readonly replacement?: unknown;
  /** Exchange only, when the prices differ: how the difference was paid. */
  readonly differenceMode?: 'cash' | 'upi' | 'udhar';
  /** The customer. Taken from the sale when it names one. */
  readonly partyId?: string;
}

/**
 * ONE RETURN, OR ONE EXCHANGE, AS THE ROWS THAT RECORD IT - all validated before
 * any is returned, so the caller appends all of them or none (EX-5, EX-6: a lone
 * `exchange_out` would inflate Net Sales by the replacement's whole price).
 *
 * The amounts are the ones he typed. The DIFFERENCE on an exchange is arithmetic
 * on two typed figures, not a guess: replacement - returned, settled in the mode
 * he chose. Equal prices settle with no money row at all.
 */
export function buildReturnEvent(d: ReturnEventDraft): Entry[] {
  const partyId = d.partyId ?? d.sale.partyId;
  const ids = [...d.ids];
  const next = (): string => {
    const id = ids.shift();
    if (!id) throw new EntryInputError('id', 'an event needs an id for every row, assigned by the caller');
    return id;
  };
  const common = { dayId: d.dayId, createdAt: d.createdAt, ...(partyId ? { partyId } : {}) };

  const ret = parseReturnEntry({ ...common, id: next(), amount: d.returned, refersToEntryId: d.sale.id });
  assertLegFits(ret, d.sale, d.ledger);

  /*
   * PENDING IS A LIABILITY TO A PERSON, so it names one (EX-11, review §9: the
   * customer is optional "unless the business event requires identification").
   * A refund owed to nobody is one nobody can come back for.
   */
  if (d.settlement === 'pending' && !partyId) {
    throw new EntryInputError('partyId', 'a refund still owed must name the customer it is owed to.');
  }

  const event: Entry[] = [ret];
  const add = (leg: Entry): void => {
    assertLegFits(leg, ret, event);
    event.push(leg);
  };

  if (d.settlement === 'exchange') {
    const out = parseExchangeOutEntry({ ...common, id: next(), amount: d.replacement, refersToEntryId: ret.id });
    add(out);
    const diff = subtract(out.amount, ret.amount);
    if (diff !== 0) {
      if (d.differenceMode === undefined) {
        throw new EntryInputError('differenceMode', 'say how the price difference was paid.');
      }
      const amount = diff > 0 ? diff : subtract(0, diff);
      const draft = { ...common, id: next(), amount, mode: d.differenceMode, refersToEntryId: ret.id };
      add(diff > 0 ? parseExchangeReceiptEntry(draft) : parseRefundEntry(draft));
    }
  } else if (d.settlement !== 'pending') {
    add(
      parseRefundEntry({ ...common, id: next(), amount: ret.amount, mode: d.settlement, refersToEntryId: ret.id }),
    );
  }
  return event;
}

/**
 * Settle a return later - all of what is outstanding, or part of it (scenario 13).
 * One refund row pointing at the return; `assertLegFits` refuses more than is owed.
 */
export function buildSettlement(d: {
  readonly ret: Entry;
  readonly ledger: readonly Entry[];
  readonly id: string;
  readonly dayId: IsoDate;
  readonly createdAt: string;
  readonly amount: unknown;
  readonly mode: 'cash' | 'upi' | 'udhar';
}): Entry {
  const leg = parseRefundEntry({
    id: d.id,
    dayId: d.dayId,
    createdAt: d.createdAt,
    amount: d.amount,
    mode: d.mode,
    refersToEntryId: d.ret.id,
    ...(d.ret.partyId ? { partyId: d.ret.partyId } : {}),
  });
  assertLegFits(leg, d.ret, d.ledger);
  return leg;
}

/**
 * HT-11 · A CORRECTION OF A CLOSED DAY, as a new entry on the OPEN day (D1, D7).
 *
 * It lands in the same section and mode as the entry it corrects, carries that
 * day in `correctsDayId` and the entry itself in `refersToEntryId`, so it states
 * exactly what it corrects. The closed day's figures never move; today's include
 * the correction, as the D7 vector has always pinned.
 *
 * ADDITIVE ONLY: amounts are never negative, so a correction adds what was
 * missed. A reduction needs a signed reversal shape this build does not have yet,
 * and inventing one is a decision, not a detail - recorded, not taken here.
 */
export function buildCorrection(d: {
  readonly original: Entry;
  readonly id: string;
  readonly dayId: IsoDate;
  readonly createdAt: string;
  readonly amount: unknown;
}): Entry {
  if (isEventSection(d.original.section)) {
    throw new EntryInputError(
      'refersToEntryId',
      'a return is not corrected - it is settled, or the sale is returned again.',
    );
  }
  if (d.original.dayId === d.dayId) {
    throw new EntryInputError(
      'dayId',
      'a correction is recorded on a later day than the one it corrects; that day can still be entered directly.',
    );
  }
  const entry = ENTRY_PARSERS[d.original.section]({
    id: d.id,
    dayId: d.dayId,
    createdAt: d.createdAt,
    amount: d.amount,
    mode: d.original.mode,
    correctsDayId: d.original.dayId,
    refersToEntryId: d.original.id,
    ...(d.original.partyId ? { partyId: d.original.partyId } : {}),
  });
  if (entry.amount <= 0) {
    throw new EntryInputError('amount', 'a correction of nothing changes nothing - type what was missed.');
  }
  return entry;
}
