/**
 * `rate_events` IN MEMORY - so the route tests exercise the REAL limiter.
 *
 * WHY NOT A SECOND LIMITER. The obvious way to rate-limit a route test without a
 * database is to write a small in-memory limiter. That would be a second
 * implementation of windows, lockouts and telemetry-only rules, and the two would
 * agree right up until somebody changed one. The rate limiter is the piece of this
 * system most likely to be quietly wrong in production while right in tests.
 *
 * So the LIMITER is the real one and only its table is faked. It issues a handful of
 * statement shapes; each is implemented here against an array.
 *
 * IT REFUSES ANYTHING IT DOES NOT RECOGNISE, and that throw is the point. A runner
 * returning `{rows: []}` for an unknown statement would let a changed query quietly
 * become "no events found", which reads as "always allowed" - a rate limiter turned
 * off with nothing failing. If the limiter's SQL changes, this stops the suite
 * instead of passing it.
 *
 * C-03a: IT ALSO MODELS THE ATOMIC SECTION. `reserve` hands out a connection that
 * understands BEGIN / COMMIT / ROLLBACK and `pg_advisory_xact_lock`: a lock is queued
 * per key and held until that connection's COMMIT or ROLLBACK, exactly as Postgres
 * holds a transaction-level advisory lock. (Row writes are applied at once and a
 * ROLLBACK does not undo them - the limiter never rolls back after a write.)
 * `delayMs` makes every statement yield, so concurrent callers genuinely interleave;
 * without a lock between the count and the insert, a concurrent test then fails.
 */
import type { SqlRunner } from './store.ts';

interface Row {
  id: number;
  bucket: string;
  at: string;
}

export interface MemorySqlOptions {
  /** Every statement waits this long first, to let concurrent callers interleave. */
  readonly delayMs?: number;
}

export function memorySql(opts: MemorySqlOptions = {}): SqlRunner & { readonly rows: () => readonly Row[] } {
  const rows: Row[] = [];
  /*
   * An index by bucket, because every count and lockout probe asks about ONE bucket and a
   * scan of every row made a flood test quadratic: 500+ requests each scanning 1,500+ rows
   * (RT2-2 took 907 ms under load). Same answers, same statements; `rows` stays the whole log.
   */
  const byBucket = new Map<string, Row[]>();
  const inBucket = (bucket: string, since: string): Row[] =>
    (byBucket.get(bucket) ?? []).filter((r) => r.at > since);
  let nextId = 1;
  const delay = opts.delayMs ?? 0;
  const pause = () => (delay > 0 ? new Promise<void>((r) => setTimeout(r, delay)) : Promise.resolve());

  /** Advisory locks: one queue per key. */
  const queues = new Map<string, Promise<void>>();
  async function acquire(key: string, held: Map<string, () => void>): Promise<void> {
    if (held.has(key)) return; // advisory locks are re-entrant within a session
    const prev = queues.get(key) ?? Promise.resolve();
    let release!: () => void;
    const mine = new Promise<void>((r) => {
      release = r;
    });
    queues.set(key, prev.then(() => mine));
    await prev;
    held.set(key, release);
  }
  const releaseAll = (held: Map<string, () => void>) => {
    for (const r of held.values()) r();
    held.clear();
  };

  async function run(sql: string, params: readonly unknown[], held: Map<string, () => void>) {
    await pause();
    const text = sql.replace(/\s+/g, ' ').trim();

    if (text === 'BEGIN') return { rows: [] };
    if (text === 'COMMIT' || text === 'ROLLBACK') {
      releaseAll(held);
      return { rows: [] };
    }
    if (text.startsWith('SELECT pg_advisory_xact_lock')) {
      await acquire(String(params[0]), held);
      return { rows: [] };
    }

    /*
     * The lockout probe. It was missing from the first version of this file and
     * the suite failed immediately with the statement quoted back at it - which
     * is the whole argument for throwing rather than returning an empty result.
     * Had it returned `{rows: []}`, every lockout would have read as "no lockout"
     * and the tests would have passed against a limiter that never blocks.
     */
    if (text.startsWith('SELECT max(at)')) {
      const [bucket, since] = params as [string, string];
      const hits = inBucket(bucket, since);
      const newest = hits.length ? hits.reduce((a, b) => (a.at > b.at ? a : b)).at : null;
      return { rows: [{ newest }] };
    }

    if (text.startsWith('SELECT count(*)')) {
      const [bucket, since] = params as [string, string];
      // ISO-8601 UTC strings compare correctly as strings, which is why they are used.
      const n = inBucket(bucket, since).length;
      return { rows: [{ n }] };
    }

    if (text.startsWith('INSERT INTO rate_events')) {
      const [bucket, at] = params as [string, string];
      const row = { id: nextId, bucket, at };
      rows.push(row);
      (byBucket.get(bucket) ?? byBucket.set(bucket, []).get(bucket)!).push(row);
      nextId += 1;
      return { rows: [] };
    }

    if (text.startsWith('DELETE FROM rate_events')) {
      const [cutoff] = params as [string];
      const doomed = rows.filter((r) => r.at < cutoff);
      if (doomed.length > 0) {
        const gone = new Set(doomed);
        for (let i = rows.length - 1; i >= 0; i -= 1) if (gone.has(rows[i]!)) rows.splice(i, 1);
        for (const [bucket, list] of byBucket) {
          const kept = list.filter((r) => !gone.has(r));
          if (kept.length === 0) byBucket.delete(bucket);
          else byBucket.set(bucket, kept);
        }
      }
      return { rows: doomed.map((d) => ({ id: d.id })) };
    }

    throw new Error(
      'the in-memory rate_events runner does not implement: ' +
        text +
        '. It refuses rather than returning an empty result, because an empty ' +
        'result here reads as "no events", which reads as "always allowed" - a ' +
        'rate limiter switched off with nothing failing.',
    );
  }

  return {
    // A bare statement outside any transaction: no lock can be held across calls.
    query: (sql, params) => run(sql, params, new Map()),

    async reserve(fn) {
      const held = new Map<string, () => void>();
      try {
        return await fn({ query: (sql, params) => run(sql, params, held) });
      } finally {
        releaseAll(held); // a connection returned to the pool holds nothing
      }
    },

    rows: () => rows,
  };
}
