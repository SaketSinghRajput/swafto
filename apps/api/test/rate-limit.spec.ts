/**
 * Injection 08 B.2, proven: "a test that restarts the service mid-limit and asserts
 * the counter survived."
 *
 * The restart is the whole point, so it is not simulated by clearing a variable. A
 * second `RateLimiter` is built over a SEPARATE Postgres connection - which is what a
 * redeployed process is - and the count carries. A third runs CONCURRENTLY with the
 * first, which is the other half of B.2 that an in-memory limiter also fails:
 * counting per-process.
 *
 * Time is injected, never slept. A test that sleeps for an hour to prove an hourly
 * window is a test nobody runs.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { migrationUp, migrationDown } from '../../../packages/schema/src/spec.ts';
import { RateLimiter, assertUsableSecret, type SqlRunner } from '../src/rate-limit/store.ts';
import {
  OTP_LIMITS,
  ALL_OTP_RULES,
  OTP_TTL_SECONDS,
  PRUNE_HORIZON_SECONDS,
} from '../src/rate-limit/limits.ts';

const DEFAULT_URL = 'postgres://postgres:postgres@localhost:55432/swafto_test';
const DB_URL = process.env.DATABASE_URL ?? DEFAULT_URL;
const SECRET = 'test-secret-key-at-least-16';

const PHONE = '+919000000001';
const OTHER_PHONE = '+919000000002';
const DEVICE = 'device-a';
const IP = '203.0.113.7'; // TEST-NET-3, reserved for documentation

/* ---- connect at module load, for the reason postgres.spec.ts documents ---- */
// Deliberately loose: `pg` is CommonJS with awkward ESM interop, and these tests
// exercise SQL behaviour, not driver typings. Typing it properly here would couple
// the suite to a dependency shape we do not otherwise depend on.
type PgClient = any;
const clients: PgClient[] = [];
let reachable = false;

/**
 * ITS OWN SCHEMA, and this is not tidiness.
 *
 * Vitest runs spec files in parallel workers. This suite and `postgres.spec.ts` both
 * run the migrations, and against one shared `public` schema they raced on CREATE
 * TABLE - "duplicate key value violates unique constraint pg_type_typname_nsp_index".
 * The loser caught the error, set `reachable = false`, and SKIPPED ALL THIRTEEN TESTS
 * while the run stayed green.
 *
 * That is the exact failure this file was written to stop appearing elsewhere: a
 * suite that passes when run alone and quietly does nothing in the run everyone
 * actually performs. A separate schema removes the collision without serialising the
 * suite.
 */
const SCHEMA = 'ratelimit_test';

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
    for (const s of migrationDown('postgres')) await primary.query(s);
    for (const s of migrationUp('postgres')) await primary.query(s);
    reachable = true;
  } catch (err) {
    console.error('[B.2/rate-limit] connect failed:', (err as Error).message);
  }
}

afterAll(async () => {
  for (const c of clients) await c.end().catch(() => {});
});

const maybe = () => (reachable ? it : it.skip);

/** A clock the test drives. Real time never enters these assertions. */
function clockAt(startMs: number) {
  let t = startMs;
  return {
    now: () => new Date(t),
    advanceSeconds(s: number) {
      t += s * 1000;
    },
  };
}

const runner = (c: PgClient): SqlRunner => ({
  query: (sql, params) => c.query(sql, params as unknown[]),
});

const T0 = Date.parse('2026-09-19T08:00:00.000Z');

describe('B.2 · rate limits are persistent and shared', () => {
  it('reports whether a database was reachable', () => {
    if (!reachable) {
      console.log(
        '\n  [B.2/rate-limit] SKIPPED - no reachable database.' +
          '\n  Start one with: node tools/pg-up.mjs\n',
      );
    }
    expect(true).toBe(true);
  });

  maybe()('refuses a secret too short to protect the identifiers', () => {
    // Not cosmetic: a weak key makes the bucket column a recoverable list of every
    // phone number that tried to sign in, and NOTHING would fail at runtime.
    expect(() => assertUsableSecret('')).toThrow(/at least 16/);
    expect(() => assertUsableSecret('short')).toThrow(/at least 16/);
    expect(() => assertUsableSecret(SECRET)).not.toThrow();
  });

  maybe()('never stores the identifier, only a keyed hash of it', async () => {
    await primary.query('DELETE FROM rate_events');
    const clock = clockAt(T0);
    const limiter = new RateLimiter(runner(primary), { secret: SECRET, now: clock.now });

    await limiter.consume(OTP_LIMITS.sendPerPhoneDaily, PHONE);

    const rows = await primary.query('SELECT bucket FROM rate_events', []);
    expect(rows.rows.length).toBe(1);
    const stored: string = rows.rows[0].bucket;
    expect(stored).not.toContain(PHONE);
    expect(stored).not.toContain('9000000001');
    expect(stored).toMatch(/^[0-9a-f]{64}$/);

    // The key must actually matter - a different secret gives a different bucket,
    // which is what makes the stored value unreadable to anyone without it.
    const other = new RateLimiter(runner(primary), {
      secret: 'a-completely-different-secret',
      now: clock.now,
    });
    expect(other.bucket(OTP_LIMITS.sendPerPhoneDaily, PHONE)).not.toBe(
      limiter.bucket(OTP_LIMITS.sendPerPhoneDaily, PHONE),
    );
  });

  maybe()('allows exactly `max` and then rejects', async () => {
    await primary.query('DELETE FROM rate_events');
    const clock = clockAt(T0);
    const limiter = new RateLimiter(runner(primary), { secret: SECRET, now: clock.now });
    const rule = OTP_LIMITS.sendPerPhoneBurst;

    for (let i = 0; i < rule.max; i += 1) {
      const d = await limiter.consume(rule, PHONE);
      expect(d.allowed, `attempt ${i + 1} of ${rule.max}`).toBe(true);
      expect(d.remaining).toBe(rule.max - i - 1);
    }
    const over = await limiter.consume(rule, PHONE);
    expect(over.allowed).toBe(false);
    expect(over.rule).toBe(rule.name);
    expect(over.retryAfterSeconds).toBeGreaterThan(0);
  });

  maybe()('THE B.2 TEST: the counter survives a restart', async () => {
    await primary.query('DELETE FROM rate_events');
    const clock = clockAt(T0);
    const rule = OTP_LIMITS.sendPerPhoneBurst;

    // --- instance 1, stopped mid-limit ---
    const before = new RateLimiter(runner(primary), { secret: SECRET, now: clock.now });
    for (let i = 0; i < rule.max - 1; i += 1) {
      expect((await before.consume(rule, PHONE)).allowed).toBe(true);
    }

    // --- deploy: the process goes away, connection and all ---
    const restarted = await connect();
    const after = new RateLimiter(runner(restarted), { secret: SECRET, now: clock.now });

    // One left, then blocked. An in-memory limiter would allow `max` more here, which
    // is the entire defect B.2 describes.
    expect((await after.consume(rule, PHONE)).allowed).toBe(true);
    const blocked = await after.consume(rule, PHONE);
    expect(blocked.allowed).toBe(false);
    expect(blocked.rule).toBe(rule.name);
  });

  maybe()('THE OTHER HALF: two instances share one budget', async () => {
    await primary.query('DELETE FROM rate_events');
    const clock = clockAt(T0);
    const rule = OTP_LIMITS.sendPerPhoneBurst;

    const second = await connect();
    const a = new RateLimiter(runner(primary), { secret: SECRET, now: clock.now });
    const b = new RateLimiter(runner(second), { secret: SECRET, now: clock.now });

    // Alternate between them. Per-process counting would let each run to `max`.
    let allowed = 0;
    for (let i = 0; i < rule.max * 2; i += 1) {
      const d = await (i % 2 === 0 ? a : b).consume(rule, PHONE);
      if (d.allowed) allowed += 1;
    }
    expect(allowed).toBe(rule.max);
  });

  maybe()('the lockout is a TIMED window that expires on its own (B.3, T1.3)', async () => {
    await primary.query('DELETE FROM rate_events');
    const clock = clockAt(T0);
    const limiter = new RateLimiter(runner(primary), { secret: SECRET, now: clock.now });
    const rule = OTP_LIMITS.sendPerPhoneBurst; // 3 / 15 min, lockout 1 h

    for (let i = 0; i < rule.max; i += 1) await limiter.consume(rule, PHONE);
    const blocked = await limiter.consume(rule, PHONE);
    expect(blocked.allowed).toBe(false);
    // The lockout column is the point: breaching a 15-minute window earns an HOUR,
    // not another 15 minutes.
    expect(blocked.retryAfterSeconds).toBe(rule.lockoutSeconds);

    // THE PROPERTY THAT MATTERS MOST HERE. Hammering while blocked must not push the
    // release further away. A phone retrying in the background would otherwise lock a
    // shopkeeper out indefinitely, and T1.3 says that is worse than any threat in the
    // table.
    clock.advanceSeconds(60);
    for (let i = 0; i < 20; i += 1) await limiter.consume(rule, PHONE);
    const still = await limiter.consume(rule, PHONE);
    expect(still.allowed).toBe(false);
    expect(still.retryAfterSeconds).toBe(rule.lockoutSeconds - 60);

    // Still locked just before the hour, even though the 15-minute window emptied
    // long ago - which is exactly what a plain sliding window would have got wrong.
    clock.advanceSeconds(rule.lockoutSeconds - 120);
    expect((await limiter.consume(rule, PHONE)).allowed).toBe(false);

    // And it clears by itself, with no support call.
    clock.advanceSeconds(120);
    expect((await limiter.consume(rule, PHONE)).allowed).toBe(true);
  });

  maybe()('a fixed window would leak double across a boundary; this one does not', async () => {
    await primary.query('DELETE FROM rate_events');
    const clock = clockAt(T0);
    const limiter = new RateLimiter(runner(primary), { secret: SECRET, now: clock.now });
    const rule = OTP_LIMITS.sendPerPhoneBurst;

    // Spend the budget at the END of an hour...
    clock.advanceSeconds(rule.windowSeconds - 60);
    for (let i = 0; i < rule.max; i += 1) {
      expect((await limiter.consume(rule, PHONE)).allowed).toBe(true);
    }
    // ...then step just past where a FIXED window would reset. A fixed window would
    // allow `max` again immediately: 2x the SMS bill at every boundary.
    clock.advanceSeconds(120);
    expect((await limiter.consume(rule, PHONE)).allowed).toBe(false);
  });

  maybe()('limits are per identifier, so one number cannot block another', async () => {
    await primary.query('DELETE FROM rate_events');
    const clock = clockAt(T0);
    const limiter = new RateLimiter(runner(primary), { secret: SECRET, now: clock.now });
    const rule = OTP_LIMITS.sendPerPhoneBurst;

    for (let i = 0; i < rule.max; i += 1) await limiter.consume(rule, PHONE);
    expect((await limiter.consume(rule, PHONE)).allowed).toBe(false);
    expect((await limiter.consume(rule, OTHER_PHONE)).allowed).toBe(true);
  });

  maybe()('the per-IP backstop NEVER denies, however hard it is hammered (R-007)', async () => {
    // Carrier-grade NAT means one address can be a whole town of real shopkeepers.
    // This rule exists to be COUNTED, not enforced, and that has to be structural -
    // a future caller must not be able to gate on it by accident.
    await primary.query('DELETE FROM rate_events');
    const clock = clockAt(T0);
    const limiter = new RateLimiter(runner(primary), { secret: SECRET, now: clock.now });
    const rule = OTP_LIMITS.sendPerIp;

    expect(rule.lockoutSeconds).toBe(0);

    let denied = 0;
    let saturated = false;
    for (let i = 0; i < rule.max + 25; i += 1) {
      const d = await limiter.consume(rule, IP);
      if (!d.allowed) denied += 1;
      if (d.saturated) saturated = true;
    }
    expect(denied, 'a telemetry-only rule must never deny').toBe(0);
    expect(saturated, 'but it must REPORT that it went over').toBe(true);
  }, 180_000);

  maybe()('consumeAll stops at the first rejection and names the rule', async () => {
    await primary.query('DELETE FROM rate_events');
    const clock = clockAt(T0);
    const limiter = new RateLimiter(runner(primary), { secret: SECRET, now: clock.now });

    const checks = [
      { rule: OTP_LIMITS.sendPerIp, identifier: IP },
      { rule: OTP_LIMITS.sendPerDevice, identifier: DEVICE },
      { rule: OTP_LIMITS.sendPerPhoneBurst, identifier: PHONE },
      { rule: OTP_LIMITS.sendPerPhoneDaily, identifier: PHONE },
    ];

    // The tightest rule in that list is perPhonePerHour.
    for (let i = 0; i < OTP_LIMITS.sendPerPhoneBurst.max; i += 1) {
      expect((await limiter.consumeAll(checks)).allowed).toBe(true);
    }
    const d = await limiter.consumeAll(checks);
    expect(d.allowed).toBe(false);
    expect(d.rule).toBe(OTP_LIMITS.sendPerPhoneBurst.name);
  });

  maybe()('peek does not consume', async () => {
    await primary.query('DELETE FROM rate_events');
    const clock = clockAt(T0);
    const limiter = new RateLimiter(runner(primary), { secret: SECRET, now: clock.now });
    const rule = OTP_LIMITS.sendPerPhoneBurst;

    await limiter.consume(rule, PHONE);
    expect(await limiter.peek(rule, PHONE)).toBe(1);
    expect(await limiter.peek(rule, PHONE)).toBe(1);
    expect(await limiter.peek(rule, PHONE)).toBe(1);
  });

  maybe()('prune removes only rows past the longest window', async () => {
    await primary.query('DELETE FROM rate_events');
    const clock = clockAt(T0);
    const limiter = new RateLimiter(runner(primary), { secret: SECRET, now: clock.now });

    await limiter.consume(OTP_LIMITS.sendPerPhoneDaily, PHONE); // will age out
    clock.advanceSeconds(PRUNE_HORIZON_SECONDS + 60);
    await limiter.consume(OTP_LIMITS.sendPerPhoneDaily, OTHER_PHONE); // fresh

    expect(await limiter.prune()).toBe(1);
    const left = await primary.query('SELECT count(*)::int AS n FROM rate_events', []);
    expect(left.rows[0].n).toBe(1);
  });

  maybe()('every rule is traceable to the SECURITY-AUDIT table', () => {
    // These numbers are the spec's, not ours. The `source` string names the row each
    // came from, so a future change has to confront the ruling rather than drift past
    // it - which is what nearly happened when this file was first written with five
    // invented limits and a paragraph of justification for each.
    expect(ALL_OTP_RULES.length).toBeGreaterThan(0);
    for (const r of ALL_OTP_RULES) {
      expect(r.max, r.name).toBeGreaterThan(0);
      expect(r.windowSeconds, r.name).toBeGreaterThan(0);
      // 0 is legal and meaningful: it marks a TELEMETRY-ONLY rule, which never
      // denies (R-007). Anything else must carry a real lockout.
      expect(r.lockoutSeconds, r.name).toBeGreaterThanOrEqual(0);
      if (r.lockoutSeconds === 0) {
        expect(r.name, 'only the per-IP backstop is telemetry-only').toBe(
          OTP_LIMITS.sendPerIp.name,
        );
      }
      expect(r.source, r.name + ' source').toMatch(/SECURITY-AUDIT TB6/);
    }
  });

  maybe()('the code table and the audit table agree', () => {
    // The executable copy must not drift from the ruling it transcribes, so the
    // numbers are read back out of SECURITY-AUDIT.md and compared.
    const md = readFileSync(new URL('../../../SECURITY-AUDIT.md', import.meta.url), 'utf8');
    // Compared as whole table rows with whitespace collapsed - simpler to read than
    // a regex, and it fails loudly if the audit table is reformatted, which is the
    // moment somebody is most likely to change a number by accident.
    const rows = md
      .split(/\r?\n/)
      .filter((l) => l.trimStart().startsWith('|'))
      .map((l) => l.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim());

    expect(rows).toContain('| Per phone number - send | 3 | 15 min | 1 h |');
    expect(rows).toContain('| Per phone number - send | 10 | 24 h | 24 h |');
    expect(rows).toContain('| Per IP - send | 2000 | 1 h | none - telemetry only |');
    expect(rows).toContain('| Per device id - send | 5 | 1 h | 1 h |');
    expect(
      rows.some((r) => r.startsWith('| Per phone number - verify attempts | 5 per code |')),
    ).toBe(true);
    expect(md).toContain('10-minute TTL');

    expect(OTP_LIMITS.sendPerPhoneBurst.max).toBe(3);
    expect(OTP_LIMITS.sendPerPhoneBurst.windowSeconds).toBe(15 * 60);
    expect(OTP_LIMITS.sendPerPhoneDaily.max).toBe(10);
    expect(OTP_LIMITS.sendPerPhoneDaily.windowSeconds).toBe(24 * 3600);
    expect(OTP_LIMITS.sendPerIp.max).toBe(2000);
    expect(OTP_LIMITS.sendPerIp.lockoutSeconds).toBe(0);
    expect(OTP_LIMITS.sendPerDevice.max).toBe(5);
    expect(OTP_LIMITS.verifyPerCode.max).toBe(5);
    expect(OTP_TTL_SECONDS).toBe(10 * 60);
  });
});
