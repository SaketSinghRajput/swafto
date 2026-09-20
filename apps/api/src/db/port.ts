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
import type { Entry, IsoDate, Paise, Party } from '@swafto/formula-engine';

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

export interface DayRow {
  readonly shopId: string;
  readonly date: IsoDate;
  readonly state: 'not_started' | 'open' | 'ready' | 'closed' | 'not_closed';
  readonly openingCash: Paise | null;
  readonly countedCash: Paise | null;
  readonly differenceReason: string | null;
  readonly closedAt: string | null;
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
  recordConsent(row: ConsentRow): Promise<void>;
  consentsFor(userId: string): Promise<readonly ConsentRow[]>;
  registerDevice(row: DeviceRow): Promise<void>;
  findDevice(id: string): Promise<DeviceRow | null>;
  revokeDevice(id: string, at: string): Promise<void>;

  /* ---- the ledger ------------------------------------------------------ */
  upsertDay(row: DayRow): Promise<void>;
  findDay(shopId: string, date: IsoDate): Promise<DayRow | null>;
  /**
   * Append one entry. Refuses a duplicate id that differs in content, and refuses
   * any write into a closed day, exactly as the triggers do.
   *
   * IDEMPOTENT BY ID, AND THAT IS THE WHOLE SYNC DESIGN. A replayed push carries the
   * same ids; the second arrival is not an error and not a second row. It reports
   * whether the row was new, so the caller can say what it did without guessing.
   */
  appendEntry(shopId: string, entry: Entry): Promise<{ inserted: boolean }>;
  entriesFor(shopId: string, date: IsoDate): Promise<readonly Entry[]>;
  entriesBefore(shopId: string, date: IsoDate): Promise<readonly Entry[]>;
  partiesFor(shopId: string): Promise<readonly Party[]>;
  upsertParty(shopId: string, party: Party): Promise<void>;

  /* ---- DPDP ------------------------------------------------------------ */
  /** Everything held about one user, for the access right (DPDP §1.5). */
  exportUser(userId: string): Promise<unknown>;
  /** Marks the shop for deletion. The job that erases it is separate (L-06). */
  requestDeletion(shopId: string, at: string): Promise<void>;
  purgeShop(shopId: string, at: string): Promise<void>;
}
