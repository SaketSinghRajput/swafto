/**
 * THE LIMITER OVER ITS IN-MEMORY TABLE: what the other limiter specs leave unproved.
 *
 * `memorySql` keeps its rows in an index by bucket (so a flood test is linear, not
 * quadratic). An index is a second copy of the data, which is exactly the kind of thing
 * that drifts: so the first block asserts it answers what a scan of every row answers,
 * through insert, expiry and prune. The rest are limiter behaviours with no other test:
 * `peek` writes nothing, `prune` removes what no rule can still need, and a failure in
 * the middle of the atomic section rolls back and releases the lock.
 */
import { describe, it, expect } from 'vitest';
import { RateLimiter, type SqlRunner } from '../src/rate-limit/store.ts';
import { memorySql } from '../src/rate-limit/memory-sql.ts';
import { OTP_LIMITS, PRUNE_HORIZON_SECONDS } from '../src/rate-limit/limits.ts';

const SECRET = 'test-secret-key-at-least-16';
const T0 = Date.parse('2026-09-19T08:00:00.000Z');

function setup(delayMs = 0) {
  const clock = { ms: T0 };
  const sql = memorySql({ delayMs });
  const limiter = new RateLimiter(sql, { secret: SECRET, now: () => new Date(clock.ms) });
  return { clock, sql, limiter };
}

describe('memorySql · the bucket index answers exactly what a scan of every row would', () => {
  it('peek (index) equals a naive count over rows(), for many buckets, across a moving clock', async () => {
    const { clock, sql, limiter } = setup();
    const rule = OTP_LIMITS.verifyPerCode;
    const ids = ['a', 'b', 'c', 'd'];
    for (let step = 0; step < 12; step += 1) {
      for (const [i, id] of ids.entries()) {
        if ((step + i) % 3 !== 0) await limiter.consume(OTP_LIMITS.sendPerIp, id);
        if ((step * 7 + i) % 4 === 0) await limiter.consume(rule, id);
      }
      clock.ms += 400_000; // moves events in and out of the 15-minute windows
      for (const r of [OTP_LIMITS.sendPerIp, rule]) {
        for (const id of ids) {
          const since = new Date(clock.ms - r.windowSeconds * 1000).toISOString();
          const naive = sql.rows().filter((row) => row.bucket === limiter.bucket(r, id) && row.at > since).length;
          expect(await limiter.peek(r, id), `${r.name}/${id} @${step}`).toBe(naive);
        }
      }
    }
    expect(sql.rows().length).toBeGreaterThan(20);
  });

  it('prune removes exactly the rows older than the horizon, from the log AND the index', async () => {
    const { clock, sql, limiter } = setup();
    await limiter.consume(OTP_LIMITS.sendPerIp, 'old-1');
    await limiter.consume(OTP_LIMITS.sendPerIp, 'old-2');
    await limiter.consume(OTP_LIMITS.sendPerIp, 'old-2');
    clock.ms += (PRUNE_HORIZON_SECONDS + 10) * 1000;
    await limiter.consume(OTP_LIMITS.sendPerIp, 'new');
    expect(sql.rows()).toHaveLength(4);

    expect(await limiter.prune()).toBe(3);
    expect(sql.rows()).toHaveLength(1);
    expect(await limiter.peek(OTP_LIMITS.sendPerIp, 'new')).toBe(1);
    expect(await limiter.peek(OTP_LIMITS.sendPerIp, 'old-2')).toBe(0);
    // Nothing left to prune, and the index still takes new writes for a pruned bucket.
    expect(await limiter.prune()).toBe(0);
    await limiter.consume(OTP_LIMITS.sendPerIp, 'old-2');
    expect(await limiter.peek(OTP_LIMITS.sendPerIp, 'old-2')).toBe(1);
    expect(sql.rows()).toHaveLength(2);
  });
});

describe('RateLimiter · peek, telemetry-only rules, and the atomic section', () => {
  it('peek counts without recording: a blocked caller who is only being looked at is not extended', async () => {
    const { sql, limiter } = setup();
    const rule = OTP_LIMITS.verifyPerCode;
    await limiter.consume(rule, 'x');
    const before = sql.rows().length;
    expect(await limiter.peek(rule, 'x')).toBe(1);
    expect(await limiter.peek(rule, 'nobody')).toBe(0);
    expect(sql.rows()).toHaveLength(before);
  });

  it('a telemetry-only rule (lockoutSeconds 0) never denies, and says when it is saturated', async () => {
    const { sql, limiter } = setup();
    const rule = OTP_LIMITS.sendPerIp;
    expect(rule.lockoutSeconds).toBe(0);
    let last = await limiter.consume(rule, 'one-big-nat');
    for (let i = 0; i < rule.max + 3; i += 1) {
      last = await limiter.consume(rule, 'one-big-nat');
      expect(last.allowed).toBe(true);
    }
    expect(last.saturated).toBe(true);
    expect(last.remaining).toBe(0);
    // Counted, never locked: no `:lock` marker was written for it.
    expect(sql.rows().some((r) => r.bucket.endsWith(':lock'))).toBe(false);
  });

  it('a failure inside the atomic section is rolled back, rethrown, and does not strand the lock', async () => {
    const base = memorySql();
    const verbs: string[] = [];
    let failInsert = true;
    const sql: SqlRunner = {
      query: base.query,
      reserve: (fn) =>
        base.reserve((c) =>
          fn({
            query: async (s, p) => {
              verbs.push(s.replace(/\s+/g, ' ').trim().split(' ')[0]!);
              if (failInsert && s.trimStart().startsWith('INSERT')) throw new Error('disk full');
              return c.query(s, p);
            },
          }),
        ),
    };
    const limiter = new RateLimiter(sql, { secret: SECRET, now: () => new Date(T0) });
    const rule = OTP_LIMITS.sendPerPhoneBurst;

    await expect(limiter.consume(rule, 'p')).rejects.toThrow('disk full');
    expect(verbs).toContain('ROLLBACK');
    expect(verbs).not.toContain('COMMIT');
    expect(base.rows()).toHaveLength(0); // nothing half-recorded

    // The advisory lock was released: the same bucket decides again instead of waiting for ever.
    failInsert = false;
    const again = await Promise.race([
      limiter.consume(rule, 'p'),
      new Promise<'hung'>((r) => setTimeout(() => r('hung'), 1000)),
    ]);
    expect(again).not.toBe('hung');
    expect((again as { allowed: boolean }).allowed).toBe(true);
  });

  it('memorySql refuses a statement it does not know, rather than answering "no events"', async () => {
    const { sql } = setup();
    await expect(sql.query('SELECT 1 FROM somewhere_else', [])).rejects.toThrow(/does not implement/);
  });

  it('advisory locks are re-entrant inside one connection (a second take of the same key does not deadlock)', async () => {
    const { sql } = setup();
    const out = await sql.reserve(async (c) => {
      await c.query('BEGIN', []);
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', ['k']);
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', ['k']);
      await c.query('COMMIT', []);
      return 'done';
    });
    expect(out).toBe('done');
  });
});
