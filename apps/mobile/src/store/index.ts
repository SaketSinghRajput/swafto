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
  expectedCashBalance,
  type DayInput,
  type DayRecord,
  type Entry,
  type Paise,
  type Party,
  type PrimaryOutputs,
  type Working,
} from '@swafto/formula-engine';

/** What a screen is handed. Never a figure - always the input a figure comes from. */
export interface StoreState {
  readonly shopId: string;
  readonly day: DayRecord;
  readonly entries: readonly Entry[];
  readonly parties: readonly Party[];
  readonly priorCreditOutstanding: Paise;
  readonly priorSupplierOutstanding: Paise;
}

/** One queued write. Draining is the sync client's problem, not the store's. */
export interface OutboxRow {
  readonly id: string;
  readonly kind: 'entry' | 'day';
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
  putDay(day: DayRecord): void;
  load(): StoreState | null;
  pendingOutbox(): readonly OutboxRow[];
}

/** An in-memory port, for tests and for first run before SQLite is wired. */
export function memoryPort(initial: StoreState): PersistencePort {
  let state = initial;
  const outbox: OutboxRow[] = [];
  return {
    appendAtomically(entry, row) {
      state = { ...state, entries: [...state.entries, entry] };
      outbox.push(row);
    },
    putDay(day) {
      state = { ...state, day };
    },
    load: () => state,
    pendingOutbox: () => outbox,
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

export class DayClosedViolation extends Error {
  constructor(date: string) {
    super(
      `${date} is closed. A closed day is frozen: post the correction against today ` +
        'and reference that day, so its own figures never move.',
    );
    this.name = 'DayClosedViolation';
  }
}

export class Store {
  #state: StoreState;
  readonly #port: PersistencePort;
  /** Bumped on every write, so a test can prove a screen re-derived rather than cached. */
  #revision = 0;

  constructor(port: PersistencePort) {
    const loaded = port.load();
    if (!loaded) throw new Error('the persistence port returned no state');
    this.#port = port;
    this.#state = loaded;
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

  /** Exactly what the engine needs, assembled on demand. Never stored. */
  get input(): DayInput {
    return {
      day: this.#state.day,
      entries: this.#state.entries,
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

  /** P3 with its working - the cash check shows the derivation, not a verdict. */
  expectedCash(): { value: Paise; working: Working } {
    return expectedCashBalance(this.input);
  }

  /**
   * Append an entry and its outbox row, together.
   *
   * Refuses a duplicate id, and refuses any entry dated into a closed day.
   */
  append(entry: Entry): void {
    if (this.#state.entries.some((e) => e.id === entry.id)) {
      throw new AppendOnlyViolation(`entry ${entry.id} already exists`);
    }
    if (this.#state.day.state === 'closed' && entry.dayId === this.#state.day.date) {
      throw new DayClosedViolation(entry.dayId);
    }
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
    const day: DayRecord = {
      ...this.#state.day,
      state: 'closed',
      countedCash,
      ...(differenceReason ? { differenceReason } : {}),
    };
    this.#port.putDay(day);
    this.#state = { ...this.#state, day };
    this.#revision += 1;
  }
}
