/**
 * THE DATABASE, AS A PORT. Nothing above this line imports `pg`.
 *
 * WHY A PORT AND NOT A CLIENT. Two reasons, and the second is the one that pays.
 *
 *  1. The route tests run everywhere. Postgres is not listening on every machine
 *     this repository is checked out on, and a suite that needs it becomes a suite
 *     that gets skipped - which this build has already measured the cost of: the
 *     DB-bound specs had to be EXCLUDED from the mutation baseline because how many
 *     of them failed drifted between runs.
 *
 *  2. It forces the write path to be a small, named set of operations. A route with
 *     a SQL client in scope grows a query; a route with this interface has to add a
 *     method, and a new method is visible in review.
 *
 * THE DATABASE IS STILL THE AUTHORITY ON ITS OWN RULES. Append-only and the closed-
 * day guard are enforced by triggers and CHECK constraints, tested on both dialects,
 * and this interface does not restate them. Where an implementation must refuse
 * something it throws the same named error the constraint would produce, so a route
 * behaves identically against memory and against Postgres. That equivalence is
 * tested rather than assumed.
 *
 * MONEY IS INTEGER PAISE EVERYWHERE, dates are ISO `YYYY-MM-DD`, and timestamps are
 * ISO-8601 UTC strings. No Date object crosses this boundary: a Date carries a
 * timezone the caller did not choose, and this product closes days.
 */
import type {
  Adjustment,
  CreditLimit,
  Entry,
  IsoDate,
  ItemLine,
  Paise,
  Party,
  ShopItem,
  UpiConfirmation,
} from '@swafto/formula-engine';

export interface ShopRow {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly language: 'od' | 'hi' | 'en';
  readonly createdAt: string;
  readonly deletionRequestedAt: string | null;
  readonly deletedAt: string | null;
}

export interface UserRow {
  readonly id: string;
  readonly shopId: string;
  readonly phone: string;
  readonly name: string | null;
  readonly createdAt: string;
  /** DPDP §1.2: which notice they agreed to, when, and in which language. */
  readonly consentVersion: string | null;
  readonly consentAt: string | null;
  readonly consentLocale: string | null;
}

export interface DeviceRow {
  readonly id: string;
  readonly userId: string;
  readonly shopId: string;
  readonly platform: string;
  readonly createdAt: string;
  readonly lastSeenAt: string | null;
  /** Set, never deleted: a revoked device is evidence, and D1 applies to it too. */
  readonly revokedAt: string | null;
}

/**
 * RT-10 grace: the presented generation `g` may be the current one (normal), or current - 1 within
 * REFRESH_GRACE_SECONDS of the last rotation (a lost response retried: rotates again, never revokes).
 * `lost_race`: g is current - 2 because a concurrent grace retry just won; refuse, do not revoke.
 * `reuse`: anything else (spent token, revoked or unknown device); the caller revokes.
 */
export type RotateOutcome =
  | { readonly kind: 'rotated'; readonly gen: number }
  | { readonly kind: 'lost_race' }
  | { readonly kind: 'reuse' };

export const REFRESH_GRACE_SECONDS = 120;

export interface DayRow {
  readonly shopId: string;
  readonly date: IsoDate;
  readonly state: 'not_started' | 'open' | 'ready' | 'closed' | 'not_closed';
  readonly openingCash: Paise | null;
  readonly countedCash: Paise | null;
  readonly differenceReason: string | null;
  readonly closedAt: string | null;
  /**
   * Decision 1: the 'HH:MM' this day started at, as the phone made it. Fixed on
   * the first write - a later upsert never changes it - and '00:00' for a day
   * that arrived without one, which is a calendar day.
   */
  readonly startsAt: string;
  readonly createdAt: string;
}

/** One consent event. Never updated - a withdrawal is a new row (DPDP §1.2). */
export interface ConsentRow {
  readonly id: string;
  readonly userId: string;
  readonly purpose: string;
  readonly granted: boolean;
  readonly noticeVersion: string;
  readonly locale: string;
  readonly at: string;
}

/** Raised where a CHECK constraint or trigger would refuse the same write. */
export class WriteRefused extends Error {
  readonly constraintName: string;
  constructor(constraintName: string, message: string) {
    super(message);
    this.name = 'WriteRefused';
    this.constraintName = constraintName;
  }
}

/*
 * THREE TENANCY REFUSALS, WRITTEN ONCE SO BOTH ENGINES SAY THE SAME THING.
 *
 * Party and entry ids are global UUID keys chosen by the client, so an id can
 * name a row of another shop. Each of these used to be silent: a foreign party
 * "upserted" by writing nothing, an entry pointed at another shop's customer
 * (Postgres's FK is on `parties(id)` alone), and a replayed id matching
 * another shop's entry came back `inserted: false` - acked, and dropped from
 * the phone. A legitimate client cannot collide with a UUIDv7, so the refusal
 * costs an honest shop nothing and tells it the row did NOT land.
 */
export const foreignParty = (id: string) =>
  new WriteRefused('parties_tenancy', 'party ' + id + ' cannot be written by this shop.');

export const partyNotInShop = (id: string) =>
  new WriteRefused(
    'entries_party_fk',
    'party ' + id + ' is not a party of this shop. Sync the party before its entries.',
  );

export const refersToNotInShop = (id: string) =>
  new WriteRefused(
    'entries_refers_fk',
    'entry ' + id + ' is not an entry of this shop. Sync the sale before its return.',
  );

export const cancelsNotInShop = (id: string) =>
  new WriteRefused(
    'entries_cancels_fk',
    'entry ' + id + ' is not an entry of this shop, so it cannot be cancelled.',
  );

/**
 * RT-W3-8 · a row a push did not get to because the push was too hard to apply in one go (too many
 * refused rows, or too many needing individual handling). It is RETRYABLE, not a verdict on the row:
 * the phone parks it and sends it again on the next launch or foreground.
 */
export const pushDeferred = () =>
  new WriteRefused(
    'push_deferred',
    'this row was not applied because the push held too many refused rows; it will be sent again.',
  );

export const foreignEntry = (id: string) =>
  new WriteRefused('entries_tenancy', 'entry ' + id + ' cannot be written by this shop.');

/** A confirmation must name one of this day's UPI receipts, and nothing else. */
export const notAUpiReceipt = (entryId: string) =>
  new WriteRefused(
    'upi_confirmations_entry',
    'entry ' + entryId + ' is not a UPI receipt of this shop on that day, so it cannot be confirmed.',
  );

export const dayFactClosed = (date: string) =>
  new WriteRefused('day_facts_closed_day', date + ' is closed and its figures never move again.');

export const dayFactNoDay = (date: string) =>
  new WriteRefused('day_facts_day_fk', 'no day ' + date + ' for this shop. Sync the day first.');

/** PR-1: a line must hang off a sale of this shop on its own day, within the sale. */
export const lineDoesNotFit = (id: string, why: string) =>
  new WriteRefused('item_lines_fit_sale', 'item line ' + id + ': ' + why);

/** PR-1: a line's item must be on THIS shop's list (S-11). */
export const itemNotInShop = (id: string) =>
  new WriteRefused('item_lines_item_fk', 'item ' + id + ' is not on this shop’s list.');

/** PR-1: items and item lines are append-only, idempotent by id. */
export const itemRowChanged = (table: 'items' | 'item_lines', id: string) =>
  new WriteRefused(
    table + '_append_only',
    id + ' already exists in ' + table + ' with different content. It is append-only (D1).',
  );

/** R5 FR-6: a limit is a CUSTOMER's, of this shop - never a supplier's, never another shop's. */
export const creditLimitParty = (partyId: string) =>
  new WriteRefused(
    'party_credit_limits_party',
    'party ' + partyId + ' is not a customer of this shop, so it cannot carry a credit limit.',
  );

export const creditLimitChanged = (id: string) =>
  new WriteRefused(
    'party_credit_limits_append_only',
    'credit limit ' + id + ' already exists with different content. Set a new one instead (D1).',
  );

export const adjustmentChanged = (id: string) =>
  new WriteRefused(
    'adjustments_append_only',
    'adjustment ' + id + ' already exists with different content. Adjustments are append-only (D1).',
  );


/**
 * IDS ARE UUIDS, AND THAT IS A DATABASE FACT BEFORE IT IS A PREFERENCE.
 *
 * `entries.id`, `parties.id`, `shops.id` and the rest are `UUID` columns. An id
 * of any other shape is not "unusual", it is a row Postgres will refuse - and
 * the in-memory repository accepted anything, so a route test could pass with
 * `'entry-1'` and the same request would fail in production with a driver error
 * rather than a clean refusal.
 *
 * Found by the equivalence run on its first outing, which is what it is for.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(value: string, what: string): void {
  if (!UUID.test(value)) {
    throw new WriteRefused(
      what + '_not_uuid',
      what +
        ' must be a UUID: the column is a UUID and the database refuses anything ' +
        'else. Got: ' +
        value,
    );
  }
}
/**
 * ARCH-08 · one row's result from a batch append: stored (or already there), or the error the
 * single-row `appendEntry` would have thrown for it. An outage is NOT a row's outcome - it is
 * thrown from the batch, so the whole request is a 503 and the outbox keeps every row.
 */
export type EntryOutcome = { readonly inserted: boolean } | { readonly error: unknown };

export interface Repo {
  /* ---- identity ------------------------------------------------------- */
  findUserByPhone(phone: string): Promise<UserRow | null>;
  createShopAndUser(input: {
    shopId: string;
    userId: string;
    phone: string;
    shopName: string;
    language: 'od' | 'hi' | 'en';
    now: string;
  }): Promise<{ shop: ShopRow; user: UserRow }>;
  findShop(shopId: string): Promise<ShopRow | null>;
  /** DV-13. False for an unknown or erased shop - an erased name stays erased. */
  renameShop(shopId: string, name: string): Promise<boolean>;
  recordConsent(row: ConsentRow): Promise<void>;
  consentsFor(userId: string): Promise<readonly ConsentRow[]>;
  registerDevice(row: DeviceRow): Promise<void>;
  findDevice(id: string): Promise<DeviceRow | null>;
  /**
   * Revoke one device OF THIS SHOP. A device id of another shop matches nothing
   * (RT S4): the shop is part of the predicate, not only of the caller's check.
   * Returns whether a row was revoked.
   */
  revokeDevice(shopId: string, id: string, at: string): Promise<boolean>;
  /**
   * RT-10 · REFRESH-TOKEN ROTATION, as one compare-and-set. Bumps the device's
   * `refresh_gen` from `tokenGen` to `tokenGen + 1` only if the device is of
   * this shop, not revoked, and still at `tokenGen`; returns the new generation,
   * or null when no row matched (an old token replayed, a revoked or unknown device).
   * Null is the caller's signal for reuse, so it must be atomic: two concurrent
   * refreshes with one token must not both succeed.
   */
  rotateRefreshGen(shopId: string, id: string, tokenGen: number, nowIso: string): Promise<RotateOutcome>;
  /** Every device of this shop, newest first, revoked ones included (they are evidence). */
  listDevices(shopId: string): Promise<readonly DeviceRow[]>;

  /**
   * ARCH-06 · RUN SEVERAL READS OF ONE SHOP IN ONE SCOPED TRANSACTION. Every repo call made inside
   * `fn` (for this shop) joins it instead of opening its own BEGIN / set_config / COMMIT, which is
   * three round trips each on Postgres. Meant for read requests; a no-op on the memory twin.
   */
  inScope<T>(shopId: string, fn: () => Promise<T>): Promise<T>;

  /* ---- the ledger ------------------------------------------------------ */
  upsertDay(row: DayRow): Promise<void>;
  findDay(shopId: string, date: IsoDate): Promise<DayRow | null>;
  /**
   * C-11 · The day start ('HH:MM') of this shop's newest day - the boundary it is
   * using now - or null for a shop with no days. The server's "today" for the
   * shop is derived from it (`business-date.ts`).
   */
  latestStartsAt(shopId: string): Promise<string | null>;
  /**
   * Append one entry. Refuses a duplicate id that differs in content, and refuses
   * any write into a closed day, exactly as the triggers do.
   *
   * IDEMPOTENT BY ID, AND THAT IS THE WHOLE SYNC DESIGN. A replayed push carries the
   * same ids; the second arrival is not an error and not a second row. It reports
   * whether the row was new, so the caller can say what it did without guessing.
   */
  appendEntry(shopId: string, entry: Entry): Promise<{ inserted: boolean }>;
  /**
   * ARCH-08 · MANY ENTRIES, ONE TRANSACTION, PER-ROW OUTCOMES. Exactly `appendEntry` applied to
   * each row in order - the same inserts, replays, conflicts, closed-day and foreign-id refusals,
   * with the same errors - but a Postgres implementation costs O(1) round trips, not O(rows).
   * A row that fails does not fail the others.
   */
  appendEntries(shopId: string, entries: readonly Entry[]): Promise<readonly EntryOutcome[]>;
  /**
   * EX-5: ONE EVENT'S LEGS, ALL OR NONE. A return and its refund, or an
   * exchange's three rows, are one business fact; a batch that landed the
   * replacement and refused the return would inflate Net Sales on the server
   * permanently. One transaction; any refusal rolls every leg back and throws.
   * Replayed legs are idempotent exactly as `appendEntry` is.
   */
  appendEvent(shopId: string, entries: readonly Entry[]): Promise<{ inserted: number; alreadyPresent: number }>;
  /** One entry of this shop, on any day, or null. Never another shop's (S-11). */
  findEntry(shopId: string, id: string): Promise<Entry | null>;
  /** Every entry of this shop whose `refersToEntryId` is this id. */
  entriesReferringTo(shopId: string, id: string): Promise<readonly Entry[]>;
  /** RT-C5: the entries of this shop with these ids, in ONE query (a push judges its links from this, not per row). */
  findEntries(shopId: string, ids: readonly string[]): Promise<readonly Entry[]>;
  /** RT-C5: every entry of this shop that refers to any of these ids, in one query. */
  entriesReferringToAny(shopId: string, ids: readonly string[]): Promise<readonly Entry[]>;
  /** RT-C5: every cancel row of this shop whose target is any of these ids, in one query. */
  entriesCancellingAny(shopId: string, ids: readonly string[]): Promise<readonly Entry[]>;
  /** The cancel row of this shop that cancels entry `id` (`cancelsEntryId === id`), or null. At most one exists. */
  entryCancelling(shopId: string, id: string): Promise<Entry | null>;
  entriesFor(shopId: string, date: IsoDate): Promise<readonly Entry[]>;
  /**
   * DECISION 3: "this UPI receipt arrived". Refused unless it names a UPI
   * receipt of THIS shop on THIS day, and refused into a closed day (D7). A
   * receipt already confirmed - by this id or another - is `inserted: false`,
   * not an error: two phones ticking the same payment is not a conflict.
   */
  appendUpiConfirmation(shopId: string, c: UpiConfirmation): Promise<{ inserted: boolean }>;
  /** DECISION 2: append-only like an entry, idempotent by id like an entry. */
  appendAdjustment(shopId: string, a: Adjustment): Promise<{ inserted: boolean }>;
  /** The two day facts of one day, oldest first. */
  dayFactsFor(
    shopId: string,
    date: IsoDate,
  ): Promise<{ upiConfirmations: readonly UpiConfirmation[]; adjustments: readonly Adjustment[] }>;
  /** PR-1: one name onto the shop's own list. Append-only, idempotent by id. */
  appendItem(shopId: string, item: ShopItem): Promise<{ inserted: boolean }>;
  itemsFor(shopId: string): Promise<readonly ShopItem[]>;
  /**
   * PR-1: one item line of a sale. Refused unless it names a SALE of this shop
   * on its own day, an item on this shop's list (or none, "Other"), and keeps
   * the sale's lines within the sale; refused into a closed day (D7).
   */
  appendItemLine(shopId: string, line: ItemLine): Promise<{ inserted: boolean }>;
  /** Every item line of this shop, oldest first. */
  itemLinesFor(shopId: string): Promise<readonly ItemLine[]>;
  entriesBefore(shopId: string, date: IsoDate): Promise<readonly Entry[]>;
  /**
   * C-12 · every day of this shop strictly before `date`, oldest first, with its state.
   * The read fold needs the list of days (to take closed ones from the memo) without
   * loading the entries of any of them.
   */
  daysBefore(shopId: string, date: IsoDate): Promise<readonly { date: IsoDate; state: DayRow['state'] }[]>;
  /**
   * R5 FR-6: a credit limit the shopkeeper set on a customer. Append-only and
   * idempotent by id, like an adjustment; refused unless the party is a
   * customer of THIS shop. The newest row for a party is the one in force.
   */
  appendCreditLimit(shopId: string, limit: CreditLimit): Promise<{ inserted: boolean }>;
  /** Every credit limit of this shop, oldest first. */
  creditLimitsFor(shopId: string): Promise<readonly CreditLimit[]>;
  partiesFor(shopId: string): Promise<readonly Party[]>;
  upsertParty(shopId: string, party: Party): Promise<void>;
  /**
   * L-04 · REMOVE A CUSTOMER'S DETAILS WITHOUT REMOVING THE LEDGER.
   *
   * The shopkeeper's customers are Data Principals who never met SWAFTO, and
   * one of them may ask him to stop holding their name. He has to be able to
   * do that - and he must not lose his own financial record doing it, because
   * the money he is owed is his, and a ledger with a hole in it is not a
   * ledger.
   *
   * So the row survives with its id, and the entries that point at it keep
   * pointing. What goes is the name and the phone number. Every figure in the
   * book is unchanged, and it is unchanged by construction rather than by
   * being recomputed.
   */
  redactParty(shopId: string, partyId: string): Promise<{ redacted: boolean }>;

  /* ---- DPDP ------------------------------------------------------------ */
  /** Everything held about one user, for the access right (DPDP §1.5). */
  exportUser(userId: string): Promise<unknown>;
  /** Marks the shop for deletion. The job that erases it is separate (L-06). */
  requestDeletion(shopId: string, at: string): Promise<void>;
  /**
   * He changed his mind inside the grace period.
   *
   * THE CANCEL PATH IS NOT A COURTESY. A deletion with no way back turns one
   * mis-tap, or one SIM-swapped attacker with one SMS, into the permanent loss
   * of a shopkeeper's only financial record. The grace period is only real if
   * something can end it.
   */
  cancelDeletion(shopId: string): Promise<void>;
  /**
   * Shops whose grace period has run out, for the job that erases them.
   *
   * `before` is a timestamp, not a day count: the period is policy and belongs
   * in one place, and a repository that computed it would be a second place.
   */
  shopsDueForPurge(before: string): Promise<readonly string[]>;
  purgeShop(shopId: string, at: string): Promise<void>;
}
