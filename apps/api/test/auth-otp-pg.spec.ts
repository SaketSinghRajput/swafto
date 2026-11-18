/**
 * UNVERIFIED-LOCAL (needs Postgres): C-02 and C-03a against a real database.
 *
 * Skipped when no database is reachable, exactly like `rate-limit.spec.ts`, and run in
 * CI. It needs the `otp_pending` table from the API-DATA migration:
 *   otp_pending(phone text primary key, code_hash text not null,
 *               expires_at timestamptz not null, attempts integer not null default 0,
 *               created_at timestamptz not null default now())
 * It does NOT create the table itself: a spec that creates what the migration was
 * supposed to would pass with the migration missing.
 *
 * Its own schema, for the reason `rate-limit.spec.ts` records (parallel workers racing
 * on CREATE TABLE in one shared schema and silently skipping).
 */
import { describe, it, expect, afterAll } from 'vitest';
import { allMigrationsUp, allMigrationsDown } from '../../../packages/schema/src/spec.ts';
import { RateLimiter, type SqlRunner } from '../src/rate-limit/store.ts';
import { OTP_LIMITS } from '../src/rate-limit/limits.ts';
import { pgOtpStore } from '../src/auth/otp-store-pg.ts';

const DEFAULT_URL = 'postgres://postgres:postgres@localhost:55432/swafto_test';
const DB_URL = process.env.DATABASE_URL ?? DEFAULT_URL;
const SECRET = 'test-secret-key-at-least-16';
const SCHEMA = 'authotp_test';
const T0 = '2026-09-19T08:00:00.000Z';
const PHONE = '+919000000001';

// Loose on purpose: `pg` is CommonJS with awkward ESM interop; see rate-limit.spec.ts.
type PgClient = any;
const clients: PgClient[] = [];
let reachable = false;

async function connect(): Promise<PgClient> {
  const mod = (await import('pg')) as unknown as Record<string, unknown>;
  const Client = (mod.Client ?? (mod.default as Record<string, unknown>)?.Client) as
    | (new (cfg: unknown) => PgClient)
    | undefined;
  if (!Client) throw new Error('pg.Client not found on the module');
  const c = new Client({ connectionString: DB_URL, connectionTimeoutMillis: 4000 });
  await c.connect();
  await c.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
  await c.query(`SET search_path TO ${SCHEMA}`);
  clients.push(c);
  return c;
}

let primary: PgClient;
{
  try {
    primary = await connect();
    for (const s of allMigrationsDown('postgres')) await primary.query(s);
    for (const s of allMigrationsUp('postgres')) await primary.query(s);
    reachable = true;
  } catch (err) {
    console.error('[auth-otp-pg] connect failed:', (err as Error).message);
  }
}

afterAll(async () => {
  for (const c of clients) await c.end().catch(() => {});
});

const maybe = () => (reachable ? it : it.skip);
const at = (s: number) => new Date(Date.parse(T0) + s * 1000).toISOString();
const P = (phone: string, createdAt: string, ttl = 600) => ({
  phone,
  hash: 'hash-of-code',
  expiresAt: new Date(Date.parse(createdAt) + ttl * 1000).toISOString(),
  attempts: 0,
  createdAt,
});

/** A pool-shaped runner: every `reserve` gets its OWN connection, like production. */
function poolRunner(): SqlRunner {
  return {
    query: (s, p) => primary.query(s, p as unknown[]),
    reserve: async (fn) => {
      const c = await connect();
      try {
        return await fn({ query: (s, p) => c.query(s, p as unknown[]) });
      } finally {
        await c.end().catch(() => {});
      }
    },
  };
}

describe('C-02 · pgOtpStore', () => {
  it('reports whether a database was reachable', () => {
    if (!reachable) console.log('\n  [auth-otp-pg] SKIPPED - no reachable database.\n');
    expect(true).toBe(true);
  });

  maybe()('stores a hash, reads it back, and ignores an expired row', async () => {
    await primary.query('DELETE FROM otp_pending');
    const s = pgOtpStore({ query: (q, p) => primary.query(q, p as unknown[]) });
    expect(await s.put(P(PHONE, T0), 60)).toBe(true);
    const got = await s.get(PHONE, at(1));
    expect(got?.hash).toBe('hash-of-code');
    expect(got?.createdAt).toBe(T0);
    expect(await s.get(PHONE, at(601))).toBeNull(); // expired = absent
    expect(await s.get('+919000000099', at(1))).toBeNull();
  });

  maybe()('does not overwrite a live code inside the cooldown, but overwrites after it', async () => {
    await primary.query('DELETE FROM otp_pending');
    const s = pgOtpStore({ query: (q, p) => primary.query(q, p as unknown[]) });
    expect(await s.put({ ...P(PHONE, T0), hash: 'first' }, 60)).toBe(true);
    expect(await s.put({ ...P(PHONE, at(30)), hash: 'second' }, 60)).toBe(false);
    expect((await s.get(PHONE, at(31)))?.hash).toBe('first');
    expect(await s.put({ ...P(PHONE, at(61)), hash: 'third' }, 60)).toBe(true);
    expect((await s.get(PHONE, at(62)))?.hash).toBe('third');
    expect((await s.get(PHONE, at(62)))?.attempts).toBe(0);
  });

  maybe()('overwrites an expired row even inside the cooldown window arithmetic', async () => {
    await primary.query('DELETE FROM otp_pending');
    const s = pgOtpStore({ query: (q, p) => primary.query(q, p as unknown[]) });
    await s.put({ ...P(PHONE, T0, 10), hash: 'old' }, 600); // expires at +10s
    expect(await s.put({ ...P(PHONE, at(20)), hash: 'new' }, 600)).toBe(true);
    expect((await s.get(PHONE, at(21)))?.hash).toBe('new');
  });

  maybe()('sweeps expired rows on a send, so a stored number does not linger', async () => {
    await primary.query('DELETE FROM otp_pending');
    const s = pgOtpStore({ query: (q, p) => primary.query(q, p as unknown[]) });
    await s.put(P('+919000000011', T0, 10), 0);
    await s.put(P('+919000000012', at(100)), 0);
    const left = await primary.query('SELECT phone FROM otp_pending ORDER BY phone', []);
    expect(left.rows.map((r: { phone: string }) => r.phone)).toEqual(['+919000000012']);
  });

  maybe()('takeAttempt is atomic: 25 concurrent callers over 5 connections get exactly cap tickets', async () => {
    await primary.query('DELETE FROM otp_pending');
    const store = (c: PgClient) => pgOtpStore({ query: (q, p) => c.query(q, p as unknown[]) });
    await store(primary).put(P(PHONE, T0), 60);
    const conns = await Promise.all(Array.from({ length: 5 }, () => connect()));
    const got = await Promise.all(
      Array.from({ length: 25 }, (_, i) => store(conns[i % 5]).takeAttempt(PHONE, at(1), 5)),
    );
    expect(got.filter((t) => t !== null)).toHaveLength(5);
    expect(await store(primary).takeAttempt('+919000000099', at(1), 5)).toBeNull();
    expect(await store(primary).takeAttempt(PHONE, at(601), 99)).toBeNull(); // expired
  });

  maybe()('clear is single use: of 10 concurrent clears exactly one reports success', async () => {
    await primary.query('DELETE FROM otp_pending');
    const store = (c: PgClient) => pgOtpStore({ query: (q, p) => c.query(q, p as unknown[]) });
    await store(primary).put(P(PHONE, T0), 60);
    const conns = await Promise.all(Array.from({ length: 5 }, () => connect()));
    const won = await Promise.all(Array.from({ length: 10 }, (_, i) => store(conns[i % 5]).clear(PHONE)));
    expect(won.filter(Boolean)).toHaveLength(1);
  });

  maybe()('is shared across instances: a code put on one connection verifies on another', async () => {
    await primary.query('DELETE FROM otp_pending');
    const other = await connect();
    await pgOtpStore({ query: (q, p) => primary.query(q, p as unknown[]) }).put(P(PHONE, T0), 60);
    const seen = await pgOtpStore({ query: (q, p) => other.query(q, p as unknown[]) }).get(PHONE, at(1));
    expect(seen?.hash).toBe('hash-of-code');
  });
});

describe('C-03a · the Postgres limiter is atomic under real concurrency', () => {
  maybe()('20 concurrent sends over 20 separate connections allow exactly `max`', async () => {
    await primary.query('DELETE FROM rate_events');
    const rule = OTP_LIMITS.sendPerPhoneBurst;
    // Separate limiter objects: no shared in-process queue, so only the database lock
    // can produce the right count.
    const limiters = Array.from(
      { length: 20 },
      () => new RateLimiter(poolRunner(), { secret: SECRET, now: () => new Date(T0) }),
    );
    const results = await Promise.all(limiters.map((l) => l.consume(rule, PHONE)));
    expect(results.filter((r) => r.allowed)).toHaveLength(rule.max);
    const n = await primary.query(
      'SELECT count(*)::int AS n FROM rate_events WHERE bucket = $1',
      [limiters[0]!.bucket(rule, PHONE)],
    );
    expect(n.rows[0].n).toBe(rule.max);
  });
});
