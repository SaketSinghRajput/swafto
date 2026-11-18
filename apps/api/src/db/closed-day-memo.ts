/**
 * C-12 · THE CLOSED-DAY FOLD MEMO. An in-process cache of a pure function. Not a
 * stored total, and the reasons it is safe are the reason this file exists.
 *
 * WHAT IT REMEMBERS. One step of the read fold: "after day D, with the credit and
 * supplier balances P_c / P_s coming in, the balances going out are N_c / N_s".
 * The key is `(shopId, D, P_c, P_s)`, the value `(N_c, N_s)`.
 *
 * WHY THAT IS EXACTLY CORRECT, NOT APPROXIMATELY:
 *  1. THE STEP IS A PURE FUNCTION of its key plus the day's entries:
 *     `creditOutstanding`/`supplierOutstanding` read the day's entries and the two
 *     incoming balances and nothing else (no clock, no other day, no adjustment).
 *  2. A CLOSED DAY'S ENTRIES NEVER CHANGE. D7: the database refuses a write into a
 *     closed day by trigger, on both engines, and since migration 0003 the Postgres
 *     triggers read the day `FOR SHARE`, so an insert and the close of its day
 *     serialise (ARCH-09) and an entry cannot land in a day after it was closed.
 *     D1: an entry is never updated. So for a CLOSED day the entries are fixed, and
 *     the step is a function of the key alone. Only closed days are ever stored here;
 *     an open day is always recomputed.
 *  3. EVERYTHING ELSE THAT CAN MOVE IS IN THE KEY. A backdated entry on an earlier,
 *     still-open day changes the balances coming into every later day, so the later
 *     days look up a DIFFERENT key and miss - there is no invalidation logic to get
 *     wrong because there is nothing to invalidate. A brand-new backdated day that
 *     slots in between two closed days does the same.
 *  4. THE ENGINE CANNOT CHANGE UNDER IT. The memo lives in one process and dies with
 *     it; a deploy that changes how credit is counted starts with an empty memo.
 *  5. IT IS NEVER PERSISTED AND NEVER SENT. A hit only skips loading and re-adding
 *     a day whose answer was already computed, in this process, by the same engine.
 *
 * (There used to be a sampled "shadow" re-derive guarding the one weak spot, the trigger
 * race. Migration 0003 removes the race at its source, so the guard was removed with it.
 * It must not be needed again unless the triggers lose their lock.)
 *
 * WHAT ERASURE DOES, STATED HONESTLY. `evictShop` is called by `purgeShop` and by
 * `redactParty` - but only inside the process that runs them. The erasure job
 * (`purge-due`) is a SEPARATE process with its own memo, so it cannot empty the API
 * process's. What bounds an erased shop's steps in the API process instead:
 *  - they are unreachable: the shop's devices are deleted, so no request can name it, and
 *    `daysBefore` would return nothing for it;
 *  - they hold derived balances only (two integers per day, no name, phone or id of a
 *    person), and they expire: a shop not READ for `ttlMs` (default one hour) is dropped
 *    by a sweep that runs on every `get` and `set`, in LRU order from the oldest.
 * The sweep is amortised, not a timer: an idle process holds them until its next read.
 * A shop erased while a read of it is in flight cannot be re-filled by that read:
 * `set` is refused if an erasure happened since the read began (`since`).
 *
 * BOUNDS. Memory is bounded however many shops or years there are: at most
 * `maxStepsPerShop` steps for one shop (4000 is eleven years of days; a shop with more
 * days than that re-derives its oldest ones, which is slow, never wrong), at most
 * `maxShops` shops, and at most `maxTotalSteps` steps overall. MEASURED (red team,
 * RT-W3-6): about 205 bytes per step, so the default 500,000 steps is about 100 MB at
 * its limit. Size it to the instance (`new ClosedDayMemo({ maxTotalSteps })`). Past
 * a limit the LEAST RECENTLY READ shop goes.
 */
import type { Paise } from '@swafto/formula-engine';
import type { Repo } from './port.ts';

export interface FoldStep {
  readonly credit: Paise;
  readonly supplier: Paise;
}

export interface MemoOptions {
  readonly maxShops?: number;
  readonly maxStepsPerShop?: number;
  readonly maxTotalSteps?: number;
  /** A shop not read for this long is dropped. Default one hour. */
  readonly ttlMs?: number;
  /** Injectable clock, for the TTL. */
  readonly now?: () => number;
}

interface ShopSteps {
  readonly steps: Map<string, FoldStep>;
  readAt: number;
}

export class ClosedDayMemo {
  readonly #maxShops: number;
  readonly #maxSteps: number;
  readonly #maxTotal: number;
  readonly #ttl: number;
  readonly #now: () => number;
  #total = 0;
  #erasures = 0;
  /** Insertion order is recency order: a touched shop is deleted and re-inserted. */
  readonly #shops = new Map<string, ShopSteps>();
  hits = 0;
  misses = 0;

  constructor(opts: MemoOptions = {}) {
    this.#maxShops = opts.maxShops ?? 5000;
    this.#maxSteps = opts.maxStepsPerShop ?? 4000;
    this.#maxTotal = opts.maxTotalSteps ?? 500_000;
    this.#ttl = opts.ttlMs ?? 3_600_000;
    this.#now = opts.now ?? (() => Date.now());
  }

  static #key(date: string, credit: Paise, supplier: Paise): string {
    return date + '|' + String(credit) + '|' + String(supplier);
  }

  /** Drop shops not read within the TTL, oldest first (the Map head is the least recently read). */
  #sweep(now: number): void {
    for (const [shopId, s] of this.#shops) {
      if (now - s.readAt <= this.#ttl) break;
      this.#drop(shopId);
    }
  }

  #drop(shopId: string): number {
    const n = this.#shops.get(shopId)?.steps.size ?? 0;
    this.#shops.delete(shopId);
    this.#total -= n;
    return n;
  }

  /** Increases whenever a shop is erased or redacted; a read passes the value it saw to `set`. */
  get erasures(): number {
    return this.#erasures;
  }

  get(shopId: string, date: string, credit: Paise, supplier: Paise): FoldStep | undefined {
    const now = this.#now();
    this.#sweep(now);
    const entry = this.#shops.get(shopId);
    const hit = entry?.steps.get(ClosedDayMemo.#key(date, credit, supplier));
    if (hit === undefined) {
      this.misses += 1;
      return undefined;
    }
    this.hits += 1;
    // Recency of the shop, not of the step: one Map operation per read, not per day.
    entry!.readAt = now;
    this.#shops.delete(shopId);
    this.#shops.set(shopId, entry!);
    return hit;
  }

  /**
   * Only ever called for a day whose state is `closed`. `since` is `erasures` as the read saw it
   * when it began: if a shop has been erased or redacted since, the fill is refused.
   */
  set(shopId: string, date: string, credit: Paise, supplier: Paise, next: FoldStep, since?: number): void {
    if (since !== undefined && since !== this.#erasures) return;
    const now = this.#now();
    this.#sweep(now);
    let entry = this.#shops.get(shopId);
    if (!entry) {
      entry = { steps: new Map(), readAt: now };
      this.#shops.set(shopId, entry);
    }
    const steps = entry.steps;
    if (steps.size >= this.#maxSteps) {
      const oldest = steps.keys().next().value;
      if (oldest !== undefined) {
        steps.delete(oldest);
        this.#total -= 1;
      }
    }
    const k = ClosedDayMemo.#key(date, credit, supplier);
    if (!steps.has(k)) this.#total += 1;
    steps.set(k, next);
    // Least recently READ shops go first; never the shop being written.
    while (this.#shops.size > 1 && (this.#shops.size > this.#maxShops || this.#total > this.#maxTotal)) {
      const oldest = this.#shops.keys().next().value;
      if (oldest === undefined || oldest === shopId) break;
      this.#drop(oldest);
    }
  }

  /** Forget everything held about one shop (erasure, redaction). Returns how many steps were dropped. */
  evictShop(shopId: string): number {
    this.#erasures += 1;
    return this.#drop(shopId);
  }

  /** Steps held for one shop, or for all shops. */
  size(shopId?: string): number {
    if (shopId !== undefined) return this.#shops.get(shopId)?.steps.size ?? 0;
    let n = 0;
    for (const s of this.#shops.values()) n += s.steps.size;
    return n;
  }

  shopCount(): number {
    return this.#shops.size;
  }

  clear(): void {
    this.#shops.clear();
    this.#total = 0;
    this.hits = 0;
    this.misses = 0;
  }
}


/**
 * ONE MEMO PER REPOSITORY, never a process global. A memo is only valid for the
 * database it was filled from; keying on the repository object makes that true by
 * construction (and keeps two in-memory repositories in one test run, which reuse
 * shop ids, from reading each other's steps). In production there is one repository.
 */
const memos = new WeakMap<object, ClosedDayMemo>();

export function memoFor(repo: Repo): ClosedDayMemo {
  let memo = memos.get(repo);
  if (!memo) memos.set(repo, (memo = new ClosedDayMemo()));
  return memo;
}

/**
 * Wrap a repository so that erasing a shop, or redacting one of its parties, drops
 * that shop's memo. A wrapper rather than an edit inside each repository, so the
 * rule is written once and holds for the memory twin and for Postgres alike.
 * Eviction runs before AND after (and on failure), so no interleaving of a read and
 * the erasure can leave a figure behind.
 */
export function evictingOnErasure<R extends Repo>(repo: R, memo: ClosedDayMemo = new ClosedDayMemo()): R {
  const wrapped = {
    ...repo,
    async purgeShop(shopId: string, at: string) {
      memo.evictShop(shopId);
      try {
        await repo.purgeShop(shopId, at);
      } finally {
        memo.evictShop(shopId);
      }
    },
    async redactParty(shopId: string, partyId: string) {
      memo.evictShop(shopId);
      try {
        return await repo.redactParty(shopId, partyId);
      } finally {
        memo.evictShop(shopId);
      }
    },
  } as R;
  memos.set(wrapped, memo);
  return wrapped;
}
