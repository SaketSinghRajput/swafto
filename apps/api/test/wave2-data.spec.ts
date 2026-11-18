/**
 * WAVE 2 · API-DATA. One file for the data-side audit fixes, each case written so
 * that it FAILS without its fix (the evidence is quoted in the wave report).
 *
 *   C-01  every shop-scoped repository call binds `swafto.shop_id` in a transaction
 *   C-04  production refuses the stub SMS port
 *   C-05  a replay of a stored entry into a closed day is acked, not refused
 *   C-06  readiness, pool errors, infrastructure failures are 503 + Retry-After
 *   C-07  the nightly job prunes rate_events; erasure covers the billing tables
 *   C-08  /v1/reports computes its range
 *   C-09  an entry has an upper bound
 *   C-11  the server's "today" is the shop's business date in India
 *   C-23  dates are windowed
 *   BE-12 / BE-13  no constraint names to the client; a non-UUID id is a 400
 *   SIMP-02  dayInputFor groups once, with the same output
 *
 * These run against the in-memory repository and fakes, so they run everywhere.
 * What needs a real Postgres is in `rls-wiring.spec.ts` (skipped locally, run in CI).
 */
import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { buildApp, type AppDeps } from '../src/app.ts';
import { memoryRepo } from '../src/db/memory.ts';
import { memoryOtpStore } from '../src/auth/routes.ts';
import { memorySql } from '../src/rate-limit/memory-sql.ts';
import { RateLimiter } from '../src/rate-limit/store.ts';
import { StubSmsPort } from '../src/sms/stub.ts';
import { mintToken } from '../src/auth/tokens.ts';
import { pgRepo, type SqlClient } from '../src/db/postgres.ts';
import { WriteRefused, type Repo } from '../src/db/port.ts';
import { isInfraError } from '../src/db/errors.ts';
import { wrapPool, type PoolLike } from '../src/db/pool.ts';
import { enforceRoles, roleProblems } from '../src/db/roles.ts';
import { assertSmsPort, loadConfig, parseTrustProxy } from '../src/config.ts';
import { runNightly } from '../src/jobs/purge-due.ts';
import { dayInputFor, REPORT_MAX_DAYS } from '../src/read/routes.ts';
import { istCalendarDate, shopToday } from '../src/business-date.ts';
import { MAX_ENTRY_PAISE } from '@swafto/values';
import { allMigrationsDown, allMigrationsUp, migration2Down, migration2Up, migration3Down, migration4Down, migrationDown, migrationUp } from '@swafto/schema';
import { add, type Entry, type IsoDate } from '@swafto/formula-engine';

const KEY = 'test-signing-key-at-least-32-chars!!';
const RATE_KEY = 'test-bucket-key-16+';
// 08:00 UTC is 13:30 in India on the same date.
const T0 = '2026-09-19T08:00:00.000Z';
const SHOP = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const DEVICE = '33333333-3333-4333-8333-333333333333';
const uuid = (n: number) => '44444444-4444-4444-8444-' + String(n).padStart(12, '0');

interface Harness {
  readonly app: ReturnType<typeof buildApp>;
  readonly repo: Repo;
  readonly clock: { value: string };
  readonly token: string;
}

async function harness(opts: { repo?: Repo; extra?: Partial<AppDeps>; startsAt?: string } = {}): Promise<Harness> {
  const clock = { value: T0 };
  const repo = opts.repo ?? memoryRepo();
  await repo.createShopAndUser({
    shopId: SHOP,
    userId: USER,
    phone: '+919876500001',
    shopName: 'Wave Two',
    language: 'en',
    now: T0,
  });
  await repo.registerDevice({
    id: DEVICE,
    userId: USER,
    shopId: SHOP,
    platform: 'android',
    createdAt: T0,
    lastSeenAt: null,
    revokedAt: null,
  });
  const deps: AppDeps = {
    repo,
    sms: new StubSmsPort(),
    otp: memoryOtpStore(),
    now: () => clock.value,
    signingKey: KEY,
    rate: new RateLimiter(memorySql(), { secret: RATE_KEY, now: () => new Date(clock.value) }),
    ...opts.extra,
  };
  const token = mintToken(KEY, {
    sub: USER,
    shop: SHOP,
    dev: DEVICE,
    typ: 'access',
    // Issued a month before T0 and valid for two, so tests that move the clock stay signed in.
    nowSeconds: Math.floor(Date.parse(T0) / 1000) - 30 * 86_400,
    ttlSeconds: 60 * 86_400,
  });
  return { app: buildApp(deps), repo, clock, token };
}

const post = (h: Harness, url: string, body: unknown) =>
  h.app.inject({
    method: 'POST',
    url,
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + h.token },
    payload: JSON.stringify(body),
  });
const get = (h: Harness, url: string) =>
  h.app.inject({ method: 'GET', url, headers: { authorization: 'Bearer ' + h.token } });

const cashSale = (id: string, dayId: string, amount: number) => ({
  id,
  dayId,
  section: 'cash_sales',
  amount,
  mode: 'cash',
  createdAt: dayId + 'T09:00:00.000Z',
});
const udharSale = (id: string, dayId: string, amount: number, partyId: string) => ({
  id,
  dayId,
  section: 'udhar_sales',
  amount,
  mode: 'udhar',
  partyId,
  createdAt: dayId + 'T10:00:00.000Z',
});
const expense = (id: string, dayId: string, amount: number) => ({
  id,
  dayId,
  section: 'expense',
  amount,
  mode: 'cash',
  createdAt: dayId + 'T11:00:00.000Z',
});

/* ═══════════════════════ C-01 · every shop-scoped call binds the shop ═══════════════════════ */

interface Stmt {
  readonly conn: string;
  readonly sql: string;
  readonly params: readonly unknown[];
}

/** A pool: `reserve` pins one connection; a bare `query` is its own connection each time. */
function fakePool(tag: string) {
  const log: Stmt[] = [];
  let next = 0;
  const on = (conn: string): SqlClient => ({
    query: async (sql, params = []) => {
      log.push({ conn, sql, params });
      return { rows: [] };
    },
  });
  const client: SqlClient = {
    query: async (sql, params = []) => {
      log.push({ conn: tag + ':bare' + next++, sql, params });
      return { rows: [] };
    },
    reserve: async (fn) => fn(on(tag + ':conn' + next++)),
  };
  return { client, log };
}

describe('C-01 · every DB use on behalf of a shop runs in a transaction that binds swafto.shop_id', () => {
  const entry = { id: uuid(1), dayId: '2026-09-19', section: 'cash_sales', amount: 100, mode: 'cash', source: 'manual', createdAt: T0 } as Entry;
  const day = {
    shopId: SHOP,
    date: '2026-09-19',
    state: 'open',
    openingCash: 0,
    countedCash: null,
    differenceReason: null,
    closedAt: null,
    startsAt: '00:00',
    createdAt: T0,
  } as const;

  const scopedCalls: [string, (r: Repo) => Promise<unknown>][] = [
    ['upsertDay', (r) => r.upsertDay(day)],
    ['findDay', (r) => r.findDay(SHOP, '2026-09-19')],
    ['latestStartsAt', (r) => r.latestStartsAt(SHOP)],
    ['appendEntry', (r) => r.appendEntry(SHOP, entry)],
    ['appendEvent', (r) => r.appendEvent(SHOP, [entry])],
    ['findEntry', (r) => r.findEntry(SHOP, uuid(1))],
    ['entriesReferringTo', (r) => r.entriesReferringTo(SHOP, uuid(1))],
    ['entriesFor', (r) => r.entriesFor(SHOP, '2026-09-19')],
    ['entriesBefore', (r) => r.entriesBefore(SHOP, '2026-09-19')],
    ['appendUpiConfirmation', (r) => r.appendUpiConfirmation(SHOP, { id: uuid(2), dayId: '2026-09-19', entryId: uuid(1), confirmedAt: T0 })],
    ['appendAdjustment', (r) => r.appendAdjustment(SHOP, { id: uuid(3), dayId: '2026-09-19', type: 'home_use', amount: 5, createdAt: T0 })],
    ['dayFactsFor', (r) => r.dayFactsFor(SHOP, '2026-09-19')],
    ['appendCreditLimit', (r) => r.appendCreditLimit(SHOP, { id: uuid(4), partyId: uuid(5), limit: 100, setAt: T0 })],
    ['creditLimitsFor', (r) => r.creditLimitsFor(SHOP)],
    ['appendItem', (r) => r.appendItem(SHOP, { id: uuid(6), name: 'Rice', createdAt: T0 })],
    ['itemsFor', (r) => r.itemsFor(SHOP)],
    ['appendItemLine', (r) => r.appendItemLine(SHOP, { id: uuid(7), dayId: '2026-09-19', entryId: uuid(1), quantity: 1, amount: 5, createdAt: T0 })],
    ['itemLinesFor', (r) => r.itemLinesFor(SHOP)],
    ['partiesFor', (r) => r.partiesFor(SHOP)],
    ['upsertParty', (r) => r.upsertParty(SHOP, { id: uuid(8), kind: 'customer', name: 'Asha' } as never)],
    ['redactParty', (r) => r.redactParty(SHOP, uuid(8))],
    ['registerDevice', (r) => r.registerDevice({ id: uuid(9), userId: USER, shopId: SHOP, platform: 'android', createdAt: T0, lastSeenAt: null, revokedAt: null })],
    ['listDevices', (r) => r.listDevices(SHOP)],
    ['revokeDevice', (r) => r.revokeDevice(SHOP, DEVICE, T0)],
    ['createShopAndUser', (r) => r.createShopAndUser({ shopId: SHOP, userId: USER, phone: '+919800000009', shopName: 'S', language: 'en', now: T0 }).catch(() => undefined)],
    ['purgeShop', (r) => r.purgeShop(SHOP, T0)],
  ];

  for (const [name, call] of scopedCalls) {
    it(name + ' runs BEGIN, set_config(shop, is_local), its statements, then COMMIT/ROLLBACK - on one connection', async () => {
      const app = fakePool('app');
      const sys = fakePool('sys');
      await call(pgRepo(app.client, { system: sys.client })).catch(() => undefined);

      // Only tables WITHOUT row-level security (shops, billing) may be touched on a bare pool query.
      const RLS_TABLES = /\b(entries|days|parties|section_skips|upi_confirmations|adjustments|items|item_lines|party_credit_limits|devices|users|consents)\b/;
      const bare = app.log.filter((s) => s.conn.includes('bare'));
      expect(bare.filter((s) => RLS_TABLES.test(s.sql)), 'no RLS table may be touched outside a scoped transaction').toEqual([]);
      const conns = new Map<string, Stmt[]>();
      for (const s of app.log.filter((x) => !x.conn.includes('bare'))) conns.set(s.conn, [...(conns.get(s.conn) ?? []), s]);
      expect(conns.size).toBeGreaterThan(0);
      for (const [conn, stmts] of conns) {
        expect(stmts[0]!.sql, conn).toBe('BEGIN');
        expect(stmts[1]!.sql, conn).toMatch(/set_config\('swafto\.shop_id', \$1, true\)/);
        expect(stmts[1]!.params, conn).toEqual([SHOP]);
        expect(stmts.at(-1)!.sql, conn).toMatch(/^(COMMIT|ROLLBACK)$/);
      }
    });
  }

  it('the five lookups that have no shop yet run on the system connection, and nowhere else', async () => {
    const app = fakePool('app');
    const sys = fakePool('sys');
    const repo = pgRepo(app.client, { system: sys.client });
    await repo.findUserByPhone('+919800000009');
    await repo.findDevice(DEVICE);
    await repo.consentsFor(USER);
    await repo.recordConsent({ id: uuid(10), userId: USER, purpose: 'account_and_ledger', granted: true, noticeVersion: 'v', locale: 'en', at: T0 });
    await repo.exportUser(USER);
    expect(app.log).toEqual([]);
    expect(sys.log.length).toBeGreaterThanOrEqual(5);
  });

  it('RT S4: revokeDevice only revokes within the shop of the caller', async () => {
    const h = await harness();
    const other = '55555555-5555-4555-8555-555555555555';
    expect(await h.repo.revokeDevice(other, DEVICE, T0)).toBe(false);
    expect((await h.repo.findDevice(DEVICE))?.revokedAt).toBeNull();
    expect(await h.repo.revokeDevice(SHOP, DEVICE, T0)).toBe(true);
    expect((await h.repo.findDevice(DEVICE))?.revokedAt).toBe(T0);
  });

  it('RT S-4: a token whose device belongs to another shop or user is refused', async () => {
    const h = await harness();
    const mint = (over: { sub?: string; shop?: string }) =>
      mintToken(KEY, { sub: USER, shop: SHOP, dev: DEVICE, typ: 'access', nowSeconds: Math.floor(Date.parse(T0) / 1000), ttlSeconds: 3600, ...over });
    const call = (token: string) => h.app.inject({ method: 'GET', url: '/v1/alerts', headers: { authorization: 'Bearer ' + token } });
    expect((await call(mint({}))).statusCode).toBe(200);
    expect((await call(mint({ shop: '55555555-5555-4555-8555-555555555555' }))).statusCode).toBe(401);
    expect((await call(mint({ sub: '66666666-6666-4666-8666-666666666666' }))).statusCode).toBe(401);
  });

  it('boot check: an app role that bypasses RLS, or a system role that cannot, is refused in production', () => {
    const restricted = { name: 'swafto_app', superuser: false, bypassRls: false };
    const privileged = { name: 'swafto_system', superuser: false, bypassRls: true };
    expect(roleProblems(restricted, privileged)).toEqual([]);
    expect(() => enforceRoles(restricted, privileged, true, () => undefined)).not.toThrow();
    expect(() => enforceRoles({ ...restricted, superuser: true }, privileged, true, () => undefined)).toThrow(/superuser/);
    expect(() => enforceRoles({ ...restricted, bypassRls: true }, privileged, true, () => undefined)).toThrow(/BYPASSRLS/);
    expect(() => enforceRoles(restricted, null, true, () => undefined)).toThrow(/SYSTEM_DATABASE_URL/);
    expect(() => enforceRoles(restricted, restricted, true, () => undefined)).toThrow(/neither BYPASSRLS nor superuser/);
    expect(() => enforceRoles(restricted, { ...restricted }, true, () => undefined)).toThrow(/same role/);
    // Not production: the same findings are warnings, so a developer's one-superuser database still boots.
    const warned: string[] = [];
    expect(() => enforceRoles({ ...restricted, superuser: true }, null, false, (l) => warned.push(l))).not.toThrow();
    expect(warned.join('')).toMatch(/superuser/);
  });

  it('production config requires SYSTEM_DATABASE_URL; elsewhere it is optional', () => {
    const base = { DATABASE_URL: 'postgres://u@h/db', SESSION_SIGNING_KEY: KEY, RATE_LIMIT_KEY: RATE_KEY } as NodeJS.ProcessEnv;
    expect(() => loadConfig({ ...base, NODE_ENV: 'production' })).toThrow(/SYSTEM_DATABASE_URL/);
    expect(loadConfig({ ...base, NODE_ENV: 'production', SYSTEM_DATABASE_URL: 'postgres://s@h/db' }).systemDatabaseUrl).toBe('postgres://s@h/db');
    expect(loadConfig(base).systemDatabaseUrl).toBeNull();
  });
});

/* ═══════════════════════ C-04 · the stub SMS port ═══════════════════════ */

describe('C-04 · production refuses the stub SMS port', () => {
  const lines: string[] = [];
  const warn = (l: string) => lines.push(l);
  it('refuses in production without the explicit flag', () => {
    expect(() => assertSmsPort({ production: true, allowStubSms: false }, true, warn)).toThrow(/SMS port is the stub/);
  });
  it('allows it in production only with ALLOW_STUB_SMS=1, and says so loudly', () => {
    lines.length = 0;
    assertSmsPort({ production: true, allowStubSms: true }, true, warn);
    expect(lines.join('')).toMatch(/NO SMS IS SENT/);
  });
  it('is silent outside production and for a real adapter', () => {
    lines.length = 0;
    assertSmsPort({ production: false, allowStubSms: false }, true, warn);
    assertSmsPort({ production: true, allowStubSms: false }, false, warn);
    expect(lines).toEqual([]);
  });
  it('only the exact value 1 counts as the flag', () => {
    const base = { DATABASE_URL: 'postgres://u@h/db', SESSION_SIGNING_KEY: KEY, RATE_LIMIT_KEY: RATE_KEY, SYSTEM_DATABASE_URL: 'postgres://s@h/db', NODE_ENV: 'production' } as NodeJS.ProcessEnv;
    expect(loadConfig({ ...base, ALLOW_STUB_SMS: 'true' }).allowStubSms).toBe(false);
    expect(loadConfig({ ...base, ALLOW_STUB_SMS: '1' }).allowStubSms).toBe(true);
  });
});

/* ═══════════════════════ C-05 · replay after close ═══════════════════════ */

describe('C-05 · a replay of a stored entry into a closed day is acked (Postgres statement semantics)', () => {
  /**
   * A model of the ONE Postgres behaviour this fix depends on: the BEFORE INSERT
   * trigger fires for every row the statement PROPOSES, before ON CONFLICT is
   * looked at. `INSERT ... SELECT ... WHERE NOT EXISTS` proposes no row when the id
   * is stored, so no trigger fires; a bare `VALUES ... ON CONFLICT DO NOTHING`
   * proposes the row and meets the closed-day trigger. The real thing is proved in
   * `rls-wiring.spec.ts` against a database in CI.
   */
  function closedDayDb() {
    const stored = new Map<string, Record<string, unknown>>();
    const client: SqlClient = {
      query: async (sql, params = []) => {
        if (/^INSERT INTO entries/.test(sql)) {
          const id = String(params[0]);
          const guarded = /WHERE NOT EXISTS \(SELECT 1 FROM entries WHERE id/.test(sql);
          const proposes = !(guarded && stored.has(id));
          if (proposes) {
            // entries_reject_closed_day: the day is closed.
            throw Object.assign(new Error('that day is closed: post a correction on the open day, never an entry into a closed one (decision D7, CP-4)'), { code: 'P0001' });
          }
          return { rows: [] };
        }
        if (/^SELECT \* FROM entries WHERE id/.test(sql)) {
          const r = stored.get(String(params[0]));
          return { rows: r ? [r] : [] };
        }
        return { rows: [] };
      },
    };
    stored.set(uuid(1), {
      id: uuid(1),
      shop_id: SHOP,
      day_id: '2026-09-18',
      section: 'cash_sales',
      amount: '5000',
      mode: 'cash',
      label: 'chai',
      created_at: new Date('2026-09-18T09:00:00.000Z'),
      source: 'manual',
    });
    return client;
  }
  const same = { id: uuid(1), dayId: '2026-09-18', section: 'cash_sales', amount: 5000, mode: 'cash', label: 'chai', source: 'manual', createdAt: '2026-09-18T14:30:00.000+05:30' } as Entry;

  it('acks the identical entry as already present instead of the closed-day refusal', async () => {
    expect(await pgRepo(closedDayDb()).appendEntry(SHOP, same)).toEqual({ inserted: false });
  });
  it('treats a changed field as a conflict (BE-10), not a silent ack', async () => {
    await expect(pgRepo(closedDayDb()).appendEntry(SHOP, { ...same, label: 'tea' })).rejects.toMatchObject({ constraintName: 'entries_append_only' });
  });
  it('still refuses a NEW entry into the closed day (D7), by the API\'s own name, without trigger text', async () => {
    const err = await pgRepo(closedDayDb()).appendEntry(SHOP, { ...same, id: uuid(99) }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WriteRefused);
    expect((err as WriteRefused).constraintName).toBe('entries_closed_day');
    expect((err as WriteRefused).message).not.toMatch(/decision D7|CP-4/);
  });
  it('the same holds end to end on the in-memory twin: replay after close acks, new refuses', async () => {
    const h = await harness();
    await post(h, '/v1/sync/push', { days: [{ date: '2026-09-18', state: 'open', openingCash: 0 }], entries: [cashSale(uuid(1), '2026-09-18', 5000)] });
    const closed = await post(h, '/v1/days/2026-09-18/close', { countedCash: 5000 });
    expect(closed.statusCode).toBe(200);
    const replay = await post(h, '/v1/sync/push', { days: [{ date: '2026-09-18', state: 'closed', openingCash: 0, countedCash: 5000, closedAt: T0 }], entries: [cashSale(uuid(1), '2026-09-18', 5000)] });
    const body = JSON.parse(replay.body);
    expect(replay.statusCode).toBe(200);
    expect(body.rejected).toEqual([]);
    expect(body.entriesAlreadyPresent).toBe(1);
    const fresh = JSON.parse((await post(h, '/v1/sync/push', { entries: [cashSale(uuid(2), '2026-09-18', 1)] })).body);
    expect(fresh.rejected.map((r: { field: string }) => r.field)).toEqual(['entries_closed_day']);
  });
});

/* ═══════════════════════ C-06 · overload, readiness, 503 ═══════════════════════ */

describe('C-06 · readiness and infrastructure failures', () => {
  it('GET /ready is 200 when the database answers and 503 + Retry-After when it does not', async () => {
    const ok = await harness({ extra: { ready: async () => undefined } });
    expect((await ok.app.inject({ method: 'GET', url: '/ready' })).statusCode).toBe(200);
    const down = await harness({ extra: { ready: async () => { throw new Error('ECONNREFUSED'); } } });
    const res = await down.app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(503);
    expect(res.headers['retry-after']).toBeDefined();
    expect(res.body).not.toMatch(/ECONNREFUSED/);
  });
  it('GET /ready times out a hung database rather than hanging with it', async () => {
    const hung = await harness({ extra: { ready: () => new Promise<void>(() => undefined), readyTimeoutMs: 30 } });
    expect((await hung.app.inject({ method: 'GET', url: '/ready' })).statusCode).toBe(503);
  });
  it('/health stays liveness: 200 even while the database is down', async () => {
    const down = await harness({ extra: { ready: async () => { throw new Error('down'); } } });
    expect((await down.app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
  });

  it('sync: a pool/connection failure is a 503 with Retry-After, never a 200 with per-row rejections', async () => {
    const real = memoryRepo();
    const flaky: Repo = {
      ...real,
      appendEntry: async () => {
        throw Object.assign(new Error('timeout exceeded when trying to connect'), {});
      },
      // ARCH-08: the route appends through the batch seam; the outage is injected there too.
      appendEntries: async () => {
        throw Object.assign(new Error('timeout exceeded when trying to connect'), {});
      },
    };
    const h = await harness({ repo: flaky });
    const res = await post(h, '/v1/sync/push', { days: [{ date: '2026-09-19', state: 'open', openingCash: 0 }], entries: [cashSale(uuid(1), '2026-09-19', 100)] });
    expect(res.statusCode).toBe(503);
    expect(res.headers['retry-after']).toBe('5');
    expect(JSON.parse(res.body)).toMatchObject({ error: 'unavailable' });
    expect(res.body).not.toMatch(/timeout exceeded|rejected/);
  });
  it('a statement timeout (57014) and a dropped connection (08006) are infrastructure; a refusal is not', () => {
    expect(isInfraError({ code: '57014', message: 'canceling statement due to statement timeout' })).toBe(true);
    expect(isInfraError({ code: '08006', message: 'x' })).toBe(true);
    expect(isInfraError({ code: '53300', message: 'too many connections' })).toBe(true);
    expect(isInfraError({ code: 'ECONNRESET', message: 'x' })).toBe(true);
    expect(isInfraError(new Error('Connection terminated unexpectedly'))).toBe(true);
    expect(isInfraError({ code: '23514', message: 'check violation' })).toBe(false);
    expect(isInfraError(new WriteRefused('entries_closed_day', 'closed'))).toBe(false);
    expect(isInfraError(new Error('some bug'))).toBe(false);
  });

  it('BE-12: a database constraint name or trigger text never reaches the client in a rejected row', async () => {
    const real = memoryRepo();
    const repo: Repo = {
      ...real,
      appendEntry: async () => {
        throw new WriteRefused('entries_amount_ck', 'new row for relation "entries" violates check constraint "entries_amount_ck"');
      },
      // ARCH-08: the same refusal, reported per row by the batch seam the route now uses.
      appendEntries: async (_shop, rows) =>
        rows.map(() => ({ error: new WriteRefused('entries_amount_ck', 'new row for relation "entries" violates check constraint "entries_amount_ck"') })),
    };
    const h = await harness({ repo });
    const res = await post(h, '/v1/sync/push', { days: [{ date: '2026-09-19', state: 'open', openingCash: 0 }], entries: [cashSale(uuid(1), '2026-09-19', 100)] });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toMatch(/entries_amount_ck|violates|relation/);
    expect(JSON.parse(res.body).rejected).toEqual([{ id: uuid(1), field: 'refused', message: 'the ledger refused this row' }]);
  });
  it('BE-12: an unknown error is told generically, not by its message', async () => {
    const boom = () => new TypeError('cannot read properties of undefined (reading "x")');
    const repo: Repo = {
      ...memoryRepo(),
      appendEntry: async () => { throw boom(); },
      // ARCH-08: the batch seam the route now uses reports the same error per row.
      appendEntries: async (_shop, rows) => rows.map(() => ({ error: boom() })),
    };
    const h = await harness({ repo });
    const res = await post(h, '/v1/sync/push', { days: [{ date: '2026-09-19', state: 'open' }], entries: [cashSale(uuid(1), '2026-09-19', 100)] });
    expect(res.body).not.toMatch(/cannot read properties/);
    expect(JSON.parse(res.body).rejected[0]).toMatchObject({ field: 'entry', message: 'this row could not be recorded' });
  });

  it('BE-13: a path id that is not a UUID is a 400 (and a stranger still gets 401 first)', async () => {
    const h = await harness();
    for (const url of ['/v1/parties/not-a-uuid/export', '/v1/parties/1%27%20or%20%271/export']) {
      expect((await get(h, url)).statusCode, url).toBe(400);
    }
    expect((await post(h, '/v1/parties/zzz/redact', {})).statusCode).toBe(400);
    expect((await h.app.inject({ method: 'GET', url: '/v1/parties/not-a-uuid/export' })).statusCode).toBe(401);
    // A well-formed id that is not this shop's is still the 404 it was.
    expect((await get(h, '/v1/parties/' + uuid(77) + '/export')).statusCode).toBe(404);
  });

  it('OPS-09: buildApp trustProxy is off unless given; config defaults to loopback; and TRUST_PROXY is parsed conservatively', async () => {
    expect(parseTrustProxy(undefined)).toBe('127.0.0.1');
    expect(parseTrustProxy('')).toBe(false);
    expect(parseTrustProxy('0')).toBe(false);
    expect(parseTrustProxy('false')).toBe(false);
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('2')).toBe(2);
    expect(parseTrustProxy('10.0.0.0/8')).toBe('10.0.0.0/8');
    const ipOf = async (trustProxy?: AppDeps['trustProxy']) => {
      const h = await harness(trustProxy === undefined ? {} : { extra: { trustProxy } });
      (h.app as unknown as { get(p: string, f: (r: { ip: string }) => unknown): void }).get('/__ip', (r) => ({ ip: r.ip }));
      const res = await h.app.inject({ method: 'GET', url: '/__ip', remoteAddress: '10.1.2.3', headers: { authorization: 'Bearer ' + h.token, 'x-forwarded-for': '203.0.113.9' } });
      return JSON.parse(res.body).ip as string;
    };
    expect(await ipOf()).toBe('10.1.2.3');
    expect(await ipOf('10.0.0.0/8')).toBe('203.0.113.9');
  });

  it('the pool has an error listener that logs and does not crash, and a broken connection is destroyed', async () => {
    const emitter = new EventEmitter();
    const released: unknown[] = [];
    const pool: PoolLike = {
      query: async () => ({ rows: [] }),
      connect: async () => ({
        query: async () => ({ rows: [] }),
        release: (d?: boolean | Error) => void released.push(d),
      }),
      end: async () => undefined,
      on: (event, listener) => emitter.on(event, listener),
    };
    const seen: Error[] = [];
    const handle = wrapPool(pool, { onError: (e) => seen.push(e) });
    // With no listener, EventEmitter would THROW here - that is the crash this fix removes.
    expect(() => emitter.emit('error', new Error('terminating connection due to administrator command'))).not.toThrow();
    expect(seen).toHaveLength(1);

    await handle.sql.reserve(async () => 'fine');
    await expect(handle.sql.reserve(async () => { throw Object.assign(new Error('x'), { code: '08006' }); })).rejects.toThrow();
    await expect(handle.sql.reserve(async () => { throw new WriteRefused('c', 'refusal'); })).rejects.toThrow();
    expect(released).toEqual([undefined, true, undefined]);
  });
});

/* ═══════════════════════ C-07 · export, erasure, nightly job ═══════════════════════ */

describe('C-07 · erasure covers the billing tables; the nightly job prunes rate_events', () => {
  it('purgeShop deletes states before purchases, and previews, inside the erasure transaction', async () => {
    const app = fakePool('app');
    await pgRepo(app.client).purgeShop(SHOP, T0);
    const deletes = app.log.filter((s) => /^DELETE FROM/.test(s.sql)).map((s) => /^DELETE FROM (\w+)/.exec(s.sql)![1]);
    expect(deletes).toContain('plan_purchase_states');
    expect(deletes).toContain('plan_purchases');
    expect(deletes).toContain('plan_previews');
    expect(deletes.indexOf('plan_purchase_states')).toBeLessThan(deletes.indexOf('plan_purchases'));
    const flag = app.log.findIndex((s) => /swafto\.erasure/.test(s.sql));
    expect(app.log.findIndex((s) => /DELETE FROM plan_purchases/.test(s.sql))).toBeGreaterThan(flag);
  });
  it('runNightly erases what is due and then prunes rate_events', async () => {
    const repo = memoryRepo();
    const prune = vi.fn(async () => 7);
    const report = await runNightly(repo, { prune }, T0);
    expect(prune).toHaveBeenCalledTimes(1);
    expect(report.rateEventsPruned).toBe(7);
    expect(report.failed).toEqual([]);
  });
  it('purge-due is an npm script', async () => {
    const pkg = JSON.parse((await import('node:fs')).readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(pkg.scripts['purge-due']).toMatch(/jobs\/purge-due\.ts/);
  });
});

/* ═══════════════════════ C-08 · reports compute their range ═══════════════════════ */

describe('C-08 · /v1/reports computes the range it is asked for', () => {
  const PARTY = uuid(500);
  async function threeDays() {
    const h = await harness();
    h.clock.value = '2026-09-19T08:00:00.000Z';
    await post(h, '/v1/sync/push', {
      parties: [{ id: PARTY, kind: 'customer', name: 'Asha' }],
      days: ['2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19'].map((date) => ({ date, state: 'open', openingCash: 0 })),
      entries: [
        // 16th: before the range, leaves credit outstanding that must carry in.
        cashSale(uuid(1), '2026-09-16', 1000),
        udharSale(uuid(2), '2026-09-16', 400, PARTY),
        // The three days of the range, each with different figures.
        cashSale(uuid(3), '2026-09-17', 10_000),
        expense(uuid(4), '2026-09-17', 1_500),
        cashSale(uuid(5), '2026-09-18', 25_000),
        udharSale(uuid(6), '2026-09-18', 7_000, PARTY),
        expense(uuid(7), '2026-09-18', 2_000),
        cashSale(uuid(8), '2026-09-19', 3_300),
        // The 19th is "today" in the clock above; this one is AFTER the range and must not leak in.
      ],
    });
    return h;
  }
  const figures = async (h: Harness, date: string) => (JSON.parse((await get(h, '/v1/days/' + date + '/summary')).body) as { figures: Record<string, number> }).figures;

  it('a 3-day range equals the sum of its three days, and not the last day alone', async () => {
    const h = await threeDays();
    const days = await Promise.all(['2026-09-17', '2026-09-18', '2026-09-19'].map((d) => figures(h, d)));
    const res = await get(h, '/v1/reports?from=2026-09-17&to=2026-09-19');
    expect(res.statusCode).toBe(200);
    const r = JSON.parse(res.body);
    expect(r.from).toBe('2026-09-17');
    expect(r.to).toBe('2026-09-19');
    expect(r.netSales).toBe(add(...days.map((d) => d.p4NetSales!)));
    expect(r.netPurchase).toBe(add(...days.map((d) => d.p5NetPurchase!)));
    expect(r.totalExpenses).toBe(add(...days.map((d) => d.p6TotalExpenses!)));
    expect(r.estimatedProfit).toBe(add(...days.map((d) => d.estimatedProfit!)));
    // Position at the END of the range, carrying in the 16th's credit.
    expect(r.creditOutstanding).toBe(days[2]!.p7CreditOutstanding);
    // The figures differ day to day, so a one-day answer could not be mistaken for the range.
    expect(new Set(days.map((d) => d.p4NetSales)).size).toBe(3);
    expect(r.netSales).not.toBe(days[2]!.p4NetSales);
  });
  it('a single day (no from, or from = to) is exactly that day\'s summary', async () => {
    const h = await threeDays();
    const day = await figures(h, '2026-09-18');
    for (const q of ['?to=2026-09-18', '?from=2026-09-18&to=2026-09-18']) {
      const r = JSON.parse((await get(h, '/v1/reports' + q)).body);
      expect(r.netSales, q).toBe(day.p4NetSales);
      expect(r.estimatedProfit, q).toBe(day.estimatedProfit);
      expect(r.creditOutstanding, q).toBe(day.p7CreditOutstanding);
    }
  });
  it('rejects a range it cannot compute: reversed, or longer than the cap', async () => {
    const h = await threeDays();
    expect((await get(h, '/v1/reports?from=2026-09-19&to=2026-09-17')).statusCode).toBe(400);
    const long = await get(h, '/v1/reports?from=2025-01-01&to=2026-09-19');
    expect(long.statusCode).toBe(400);
    expect(JSON.parse(long.body)).toMatchObject({ error: 'range_too_long', maxDays: REPORT_MAX_DAYS });
    expect((await get(h, '/v1/reports?from=2026-13-01&to=2026-09-19')).statusCode).toBe(400);
  });
});

/* ═══════════════════════ C-09 · an upper bound per entry ═══════════════════════ */

describe('C-09 · an entry has an upper bound', () => {
  it('refuses an amount above the bound with a 400, and accepts exactly the bound', async () => {
    const h = await harness();
    await post(h, '/v1/sync/push', { days: [{ date: '2026-09-19', state: 'open', openingCash: 0 }] });
    const over = await post(h, '/v1/sync/push', { entries: [cashSale(uuid(1), '2026-09-19', add(MAX_ENTRY_PAISE, 1))] });
    expect(over.statusCode).toBe(400);
    const edge = JSON.parse((await post(h, '/v1/sync/push', { entries: [cashSale(uuid(2), '2026-09-19', MAX_ENTRY_PAISE)] })).body);
    expect(edge.entriesInserted).toBe(1);
  });
  it('two maximum entries no longer break the summary, the close, the alerts or the reports', async () => {
    const h = await harness();
    await post(h, '/v1/sync/push', { days: [{ date: '2026-09-19', state: 'open', openingCash: 0 }] });
    for (const i of [1, 2, 3]) {
      await post(h, '/v1/sync/push', { entries: [cashSale(uuid(i), '2026-09-19', MAX_ENTRY_PAISE)] });
    }
    expect((await get(h, '/v1/days/2026-09-19/summary')).statusCode).toBe(200);
    expect((await get(h, '/v1/alerts')).statusCode).toBe(200);
    expect((await get(h, '/v1/reports?to=2026-09-19')).statusCode).toBe(200);
    const close = await post(h, '/v1/days/2026-09-19/close', { countedCash: 1, differenceReason: 'x' });
    expect(close.statusCode).toBe(200);
  });
  it('bounds the other money fields too: counted cash, opening cash, adjustments, item lines', async () => {
    const h = await harness();
    expect((await post(h, '/v1/sync/push', { days: [{ date: '2026-09-19', state: 'open', openingCash: add(MAX_ENTRY_PAISE, 1) }] })).statusCode).toBe(400);
    expect((await post(h, '/v1/sync/push', { days: [{ date: '2026-09-19', state: 'open', countedCash: add(MAX_ENTRY_PAISE, 1) }] })).statusCode).toBe(400);
    expect((await post(h, '/v1/sync/push', { adjustments: [{ id: uuid(1), dayId: '2026-09-19', type: 'home_use', amount: add(MAX_ENTRY_PAISE, 1), createdAt: T0 }] })).statusCode).toBe(400);
    expect((await post(h, '/v1/days/2026-09-19/close', { countedCash: add(MAX_ENTRY_PAISE, 1) })).statusCode).toBe(400);
  });
});

/* ═══════════════════════ C-11 · the shop's "today" ═══════════════════════ */

describe('C-11 · the server\'s today is the shop\'s business date in India', () => {
  // 20:00 UTC on the 19th is 01:30 IST on the 20th.
  const LATE = '2026-09-19T20:00:00.000Z';

  it('is pure: the India wall clock, then the engine\'s businessDate with the shop\'s day start', () => {
    expect(istCalendarDate(LATE)).toBe('2026-09-20');
    expect(shopToday(LATE, null)).toBe('2026-09-20');
    expect(shopToday(LATE, '00:00')).toBe('2026-09-20');
    // A shop whose day starts at 05:00 is still on the 19th at 01:30.
    expect(shopToday(LATE, '05:00')).toBe('2026-09-19');
    // 04:00 UTC is 09:30 IST: past 05:00, so the 20th.
    expect(shopToday('2026-09-20T04:00:00.000Z', '05:00')).toBe('2026-09-20');
    // The UTC slice would say the 19th between 18:30 and 24:00 UTC. It was wrong.
    expect(LATE.slice(0, 10)).toBe('2026-09-19');
  });
  it('alerts, outstanding and the party export read the India date, not the UTC date', async () => {
    const h = await harness();
    h.clock.value = LATE;
    await post(h, '/v1/sync/push', {
      parties: [{ id: uuid(500), kind: 'customer', name: 'Asha' }],
      days: [{ date: '2026-09-20', state: 'open', openingCash: 1000 }],
      entries: [udharSale(uuid(1), '2026-09-20', 4200, uuid(500))],
    });
    expect(JSON.parse((await get(h, '/v1/alerts')).body)).toMatchObject({ asOf: '2026-09-20', creditOutstanding: 4200 });
    expect(JSON.parse((await get(h, '/v1/parties/outstanding')).body)).toMatchObject({ asOf: '2026-09-20', creditOutstanding: 4200 });
    expect(JSON.parse((await get(h, '/v1/parties/' + uuid(500) + '/export')).body).entries).toHaveLength(1);
  });
  it('respects the day start the shop is using: at 01:30 IST a 05:00 shop is still on yesterday', async () => {
    const h = await harness();
    h.clock.value = LATE;
    await post(h, '/v1/sync/push', { days: [{ date: '2026-09-19', state: 'open', openingCash: 0, startsAt: '05:00' }] });
    expect(JSON.parse((await get(h, '/v1/alerts')).body).asOf).toBe('2026-09-19');
  });
});

/* ═══════════════════════ C-23 · a window on dates ═══════════════════════ */

describe('C-23 · how far from today a day may be created', () => {
  it('refuses a far-future and a far-past new day, allows today+1 and weeks-late syncs', async () => {
    const h = await harness();
    const push = async (date: string) => JSON.parse((await post(h, '/v1/sync/push', { days: [{ date, state: 'open', openingCash: 0 }] })).body);
    // The clock is 2026-09-19 in India.
    expect((await push('9999-12-31')).rejected).toHaveLength(1);
    expect((await push('2026-09-21')).rejected).toHaveLength(1);
    expect((await push('0001-01-01')).rejected).toHaveLength(1);
    expect((await push('2025-01-01')).rejected).toHaveLength(1);
    // Tomorrow (clock skew), today, and a phone that was offline for six weeks.
    expect((await push('2026-09-20')).rejected).toEqual([]);
    expect((await push('2026-09-19')).rejected).toEqual([]);
    expect((await push('2026-08-08')).rejected).toEqual([]);
  });
  it('refuses an entry dated in the future, and does not window a day the server already holds', async () => {
    const h = await harness();
    await post(h, '/v1/sync/push', { days: [{ date: '2026-09-20', state: 'open', openingCash: 0 }] });
    h.clock.value = '2026-09-12T08:00:00.000Z';
    const res = JSON.parse((await post(h, '/v1/sync/push', { entries: [cashSale(uuid(1), '2026-09-20', 5)] })).body);
    expect(res.rejected.map((r: { field: string }) => r.field)).toEqual(['date']);
  });
});

/* ═══════════════════════ SIMP-02 · group once ═══════════════════════ */

describe('SIMP-02 · dayInputFor groups earlier entries by day once, with the same output', () => {
  it('matches a per-date filter reference on a multi-day, multi-party ledger', async () => {
    const repo = memoryRepo();
    await repo.createShopAndUser({ shopId: SHOP, userId: USER, phone: '+919876500002', shopName: 'S', language: 'en', now: T0 });
    const party = uuid(500);
    await repo.upsertParty(SHOP, { id: party, kind: 'customer', name: 'Asha' } as never);
    const dates: IsoDate[] = [];
    for (let d = 1; d <= 12; d += 1) {
      const date = '2026-08-' + String(d).padStart(2, '0');
      dates.push(date);
      await repo.upsertDay({ shopId: SHOP, date, state: 'open', openingCash: 0, countedCash: null, differenceReason: null, closedAt: null, startsAt: '00:00', createdAt: T0 });
      await repo.appendEntry(SHOP, { id: uuid(d * 10), dayId: date, section: 'udhar_sales', amount: 100 * d, mode: 'udhar', partyId: party, source: 'manual', createdAt: date + 'T09:00:00.000Z' } as Entry);
      await repo.appendEntry(SHOP, { id: uuid(d * 10 + 1), dayId: date, section: 'udhar_collection', amount: 30 * d, mode: 'cash', partyId: party, source: 'manual', createdAt: date + 'T10:00:00.000Z' } as Entry);
      await repo.appendEntry(SHOP, { id: uuid(d * 10 + 2), dayId: date, section: 'purchase', amount: 50, mode: 'udhar', source: 'manual', createdAt: date + 'T11:00:00.000Z' } as Entry);
    }
    const { creditOutstanding, supplierOutstanding } = await import('@swafto/formula-engine');
    const input = await dayInputFor(repo, SHOP, '2026-08-20');
    // Reference: the original algorithm, filtering the whole list for every date.
    const earlier = await repo.entriesBefore(SHOP, '2026-08-20');
    let credit = 0;
    let supplier = 0;
    for (const d of [...new Set(earlier.map((e) => e.dayId))].sort()) {
      const partial = { day: { date: d, state: 'closed', openingCash: 0, countedCash: null }, entries: earlier.filter((e) => e.dayId === d), priorCreditOutstanding: credit, priorSupplierOutstanding: supplier } as never;
      credit = creditOutstanding(partial).value;
      supplier = supplierOutstanding(partial).value;
    }
    expect(input.priorCreditOutstanding).toBe(credit);
    expect(input.priorSupplierOutstanding).toBe(supplier);
    expect(credit).toBeGreaterThan(0);
  });
});

/* ═══════════════════════ C-02 · migration 0002 ═══════════════════════ */

describe('C-02 · migration 0002 creates exactly otp_pending, server-side only', () => {
  it('Postgres: one table with the agreed columns; SQLite: nothing', () => {
    const up = migration2Up('postgres').join('\n');
    expect(migration2Up('postgres')).toHaveLength(1);
    expect(up).toMatch(/CREATE TABLE otp_pending/);
    for (const col of [
      /phone\s+TEXT PRIMARY KEY/,
      /code_hash\s+TEXT NOT NULL/,
      /expires_at\s+TIMESTAMPTZ NOT NULL/,
      /attempts\s+INTEGER NOT NULL DEFAULT 0/,
      /created_at\s+TIMESTAMPTZ NOT NULL DEFAULT now\(\)/,
    ]) {
      expect(up).toMatch(col);
    }
    expect(migration2Down('postgres')).toEqual(['DROP TABLE IF EXISTS otp_pending']);
    expect(migration2Up('sqlite')).toEqual([]);
    expect(migration2Down('sqlite')).toEqual([]);
  });
  it('0001 is unchanged by it, and the combined migrations apply 0002 after and undo it before', () => {
    expect(migrationUp('postgres').join('\n')).not.toMatch(/otp_pending/);
    expect(migrationDown('postgres').join('\n')).not.toMatch(/otp_pending/);
    const up = allMigrationsUp('postgres');
    expect(up.slice(0, migrationUp('postgres').length)).toEqual(migrationUp('postgres'));
    // 0003 (ARCH-09) now follows 0002: 0002 is the statement right after 0001, and is undone right before it.
    expect(up[migrationUp('postgres').length]).toMatch(/otp_pending/);
    const down = allMigrationsDown('postgres');
    // 0004 (RT-10) and 0003 are undone first, so 0002's drop follows both.
    expect(down[migration4Down('postgres').length + migration3Down('postgres').length]).toMatch(/DROP TABLE IF EXISTS otp_pending/);
  });
});
