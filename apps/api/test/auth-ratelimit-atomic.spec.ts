/**
 * C-03a / SEC-101 - the limiter's check-and-record is atomic.
 *
 * Before: `consume` read count(*) and then INSERTed as two statements, so N concurrent
 * callers all read "2 used" and all inserted (PoC: 20 concurrent sends against a limit
 * of 3 -> 20 SMS). These run against the in-memory twin with a per-statement delay so
 * callers genuinely interleave. The twin models the same transaction + advisory-lock
 * sequence the Postgres path issues; the Postgres proof is `auth-otp-pg.spec.ts`.
 */
import { describe, it, expect } from 'vitest';
import { RateLimiter, type SqlRunner } from '../src/rate-limit/store.ts';
import { memorySql } from '../src/rate-limit/memory-sql.ts';
import { OTP_LIMITS } from '../src/rate-limit/limits.ts';

const SECRET = 'test-secret-key-at-least-16';
const NOW = new Date('2026-09-19T08:00:00.000Z');
const PHONE = '+919000000001';

describe('the limiter decides atomically', () => {
  it('20 concurrent sends against a limit of 3 allow exactly 3 (transaction + advisory lock)', async () => {
    const sql = memorySql({ delayMs: 2 });
    const limiter = new RateLimiter(sql, { secret: SECRET, now: () => NOW });
    const rule = OTP_LIMITS.sendPerPhoneBurst;
    const results = await Promise.all(
      Array.from({ length: 20 }, () => limiter.consume(rule, PHONE)),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(rule.max);
    expect(results.filter((r) => !r.allowed)).toHaveLength(20 - rule.max);
    // And the table agrees: three events, one lock marker - not twenty events.
    expect(sql.rows()).toHaveLength(rule.max + 1);
  });

  it('refuses a runner with no `reserve` (no silent non-atomic fallback)', () => {
    expect(() => new RateLimiter({ query: async () => ({ rows: [] }) } as unknown as SqlRunner, { secret: SECRET })).toThrow(/reserve/);
  });

  it('two limiter instances over one table (two API processes) share the cap', async () => {
    // Separate limiter objects have separate in-process queues, so only the database
    // lock can make this come out at 3 - which is the cross-instance case.
    const sql = memorySql({ delayMs: 2 });
    const a = new RateLimiter(sql, { secret: SECRET, now: () => NOW });
    const b = new RateLimiter(sql, { secret: SECRET, now: () => NOW });
    const rule = OTP_LIMITS.sendPerPhoneBurst;
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => (i % 2 ? a : b).consume(rule, PHONE)),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(rule.max);
  });

  it('different buckets do not block each other', async () => {
    const limiter = new RateLimiter(memorySql({ delayMs: 2 }), { secret: SECRET, now: () => NOW });
    const rule = OTP_LIMITS.sendPerPhoneBurst;
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => limiter.consume(rule, '+91900000' + String(1000 + i))),
    );
    expect(results.every((r) => r.allowed)).toBe(true);
  });

  it('a failing statement releases the lock (the next caller is not wedged)', async () => {
    const inner = memorySql();
    let failNext = true;
    const flaky: SqlRunner = {
      query: (s, p) => inner.query(s, p),
      reserve: (fn) =>
        inner.reserve((c) =>
          fn({
            query: (s, p) => {
              if (failNext && s.startsWith('SELECT count(*)')) {
                failNext = false;
                return Promise.reject(new Error('connection reset'));
              }
              return c.query(s, p);
            },
          }),
        ),
    };
    const limiter = new RateLimiter(flaky, { secret: SECRET, now: () => NOW });
    await expect(limiter.consume(OTP_LIMITS.sendPerPhoneBurst, PHONE)).rejects.toThrow('connection reset');
    const d = await limiter.consume(OTP_LIMITS.sendPerPhoneBurst, PHONE);
    expect(d.allowed).toBe(true);
  });
});
