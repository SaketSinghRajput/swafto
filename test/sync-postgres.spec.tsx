/**
 * SYNC RELIABILITY, END TO END, AGAINST A REAL DATABASE.
 *
 * `pipeline.spec.tsx` drives the real client against the real API over the
 * in-memory repository. This drives the same client - the real `Host`, its
 * real `fetchTransport`, a real `Store` over the real SQLite port on a file -
 * against the real API over `pgRepo` on a real `pg.Pool`, which is how
 * `server.ts` is wired in production. The only double is the cable: `fetch`
 * hands the bytes to `app.inject()` instead of a socket, and it can be told to
 * drop the request or the response, which is what a market on 2G does.
 *
 * Skipped, with its reason printed, when no Postgres is listening.
 * Start one with `node tools/pg-up.mjs`.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../apps/api/src/app.ts';
import { pgRepo, type SqlClient } from '../apps/api/src/db/postgres.ts';
import type { Repo } from '../apps/api/src/db/port.ts';
import { memoryOtpStore } from '../apps/api/src/auth/routes.ts';
import { RateLimiter } from '../apps/api/src/rate-limit/store.ts';
import { StubSmsPort } from '../apps/api/src/sms/stub.ts';
import { PUSH_MAX_ITEMS as ROUTE_MAX } from '../apps/api/src/sync/routes.ts';
import { Host, type FetchLike } from '../apps/mobile/src/host.tsx';
import { PUSH_MAX_ITEMS as CLIENT_MAX } from '../apps/mobile/src/net/client.ts';
import { Store, DayClosedViolation } from '../apps/mobile/src/store/index.ts';
import { sqlitePort, type Db } from '../apps/mobile/src/store/sqlite.ts';
import { allMigrationsUp } from '@swafto/schema';
import type { Entry } from '@swafto/formula-engine';

const URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55432/swafto_test';
const KEY = 'test-signing-key-at-least-32-chars!!';
const BASE = 'http://api.test';
const D1 = '2026-07-15';
const D2 = '2026-07-16';
const T0 = D1 + 'T19:00:00.000Z';

/* ---- the database: its own schema, so parallel suites cannot collide ---- */

interface PgPool {
  query(text: string, params?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  connect(): Promise<{ query: PgPool['query']; release(): void }>;
}
let pool: PgPool | null = null;
let skipReason = 'not attempted';
try {
  const mod = (await import('pg')) as unknown as Record<string, unknown>;
  const pg = (mod.default ?? mod) as { Pool: new (o: unknown) => PgPool };
  const p = new pg.Pool({
    connectionString: URL,
    connectionTimeoutMillis: 4000,
    options: '-c search_path=e2e_sync',
    max: 4,
  });
  await p.query('DROP SCHEMA IF EXISTS e2e_sync CASCADE');
  await p.query('CREATE SCHEMA e2e_sync');
  // Every migration, not 0001 alone: the repository writes entries.cancels_entry_id (0006) and relies on its guard trigger.
  for (const s of allMigrationsUp('postgres')) await p.query(s);
  pool = p;
} catch (e) {
  skipReason = (e as Error).message;
}
const maybe = pool ? it : it.skip;

/** Exactly server.ts's wiring: a pool, with `reserve` so transactions hold. */
const sql: SqlClient = {
  query: (text, params) => pool!.query(text, params),
  reserve: async (fn) => {
    const c = await pool!.connect();
    try {
      return await fn(c);
    } finally {
      c.release();
    }
  },
};

/* ---- the server, and a cable that can fail in the two ways that matter -- */

type Cable = 'ok' | 'request-lost' | 'response-lost';

function server(repo: Repo = pgRepo(sql)) {
  const sms = new StubSmsPort();
  const app = buildApp({
    repo,
    sms,
    otp: memoryOtpStore(),
    now: () => T0,
    signingKey: KEY,
    rate: new RateLimiter(sql, { secret: KEY, now: () => new Date(T0) }),
  });
  const cable = { mode: 'ok' as Cable, sent: 0 };
  const fetch: FetchLike = async (url, init) => {
    if (cable.mode === 'request-lost') throw new TypeError('Network request failed');
    cable.sent += 1;
    const res = await app.inject({
      method: init.method as 'GET' | 'POST',
      url: url.slice(BASE.length),
      headers: init.headers,
      ...(init.body === undefined ? {} : { payload: init.body }),
    });
    // The server committed; the reply died on the way back.
    if (cable.mode === 'response-lost') throw new TypeError('Network request failed');
    return { status: res.statusCode, text: async () => res.body };
  };
  return { app, sms, cable, fetch };
}

/* ---- a handset: a real SQLite file that survives a "restart" ------------ */

const openDb = (file: string): Db => {
  const db = new DatabaseSync(file);
  // Test speed only: no fsync per transaction. Durability is not under test here.
  db.exec('PRAGMA synchronous = OFF');
  db.exec('PRAGMA journal_mode = MEMORY'); // no journal file per transaction: ~20x faster on Windows; same SQL semantics
  return {
    executeSync(text, params = []) {
      const st = db.prepare(text);
      if (/^\s*select/i.test(text)) return { rows: st.all(...(params as never[])) };
      st.run(...(params as never[]));
      return { rows: [] };
    },
  };
};

let seq = 0;
/** Real UUIDs, unique across the run - every case shares one Postgres schema. */
const newId = () => '5a1e0000-0000-4000-8000-' + String(++seq).padStart(12, '0');

function handset(s: ReturnType<typeof server>, today = D1) {
  const path = join(mkdtempSync(join(tmpdir(), 'swafto-e2e-')), 'ledger.db');
  let held: string | null = null;
  const storage = { read: () => held, write: (v: string | null) => void (held = v) };
  const boot = (date: string) =>
    new Host({
      baseUrl: BASE,
      fetch: s.fetch,
      storage,
      store: new Store(sqlitePort(openDb(path), () => date), () => T0),
      now: () => T0,
      newId,
    });
  return { host: boot(today), restart: (date: string) => boot(date) };
}

async function signIn(s: ReturnType<typeof server>, host: Host): Promise<string> {
  const phone = '+9198765' + String(++seq).padStart(5, '0');
  await host.client.requestOtp(phone, 'en');
  const code = s.sms.forPhone(phone).at(-1)!.variables[0]!;
  const t = await host.client.verify({
    phone,
    code,
    platform: 'android',
    shopName: 'E2E Kirana',
    consent: host.session.agreeConsent(),
  });
  return t.shopId;
}

const entry = (over: Partial<Entry> & Pick<Entry, 'section' | 'mode' | 'amount'>, dayId = D1): Entry =>
  ({ id: newId(), dayId, source: 'manual', createdAt: T0, ...over }) as Entry;

const rowsOf = async (table: string, shopId: string) =>
  (await pool!.query('SELECT * FROM ' + table + ' WHERE shop_id = $1', [shopId])).rows;

/* ==================================================================== */

describe('sync against Postgres', () => {
  let s: ReturnType<typeof server>;
  beforeEach(() => {
    s = server();
  });

  it('reports whether Postgres ran, and the client cuts to the route\'s own caps', () => {
    if (!pool) console.log('\n  [sync-postgres] SKIPPED: ' + skipReason + '\n');
    expect(CLIENT_MAX).toEqual(ROUTE_MAX);
  });

  maybe('(a) a new party and its first credit sale land together in one push', async () => {
    const { host } = handset(s);
    const shopId = await signIn(s, host);
    const partyId = newId();
    host.store.setOpeningCash(100000);
    host.store.addParty({ id: partyId, kind: 'customer', name: 'Ramesh' });
    host.store.append(entry({ section: 'udhar_sales', mode: 'udhar', amount: 25000, partyId }));

    s.cable.sent = 0;
    const out = await host.sync();
    expect(s.cable.sent, 'one request, not one per kind').toBe(1);
    expect(out.rejected).toEqual([]);
    expect(out.accepted).toBe(3);
    expect(host.store.pendingOutbox).toEqual([]);
    expect((await rowsOf('parties', shopId)).map((r) => r.id)).toEqual([partyId]);
    expect((await rowsOf('entries', shopId)).map((r) => r.party_id)).toEqual([partyId]);
  });

  maybe('(b) a party the server refuses stays queued, and so does the sale that names it', async () => {
    // Shop A owns the party. Shop B names the same id as if it were its own.
    const a = handset(s);
    const shopA = await signIn(s, a.host);
    const partyId = newId();
    a.host.store.addParty({ id: partyId, kind: 'customer', name: 'Somebody Else' });
    a.host.store.append(entry({ section: 'udhar_sales', mode: 'udhar', amount: 1000, partyId }));
    expect((await a.host.sync()).rejected).toEqual([]);

    const b = handset(s);
    const shopB = await signIn(s, b.host);
    b.host.store.addParty({ id: partyId, kind: 'customer', name: 'Renamed By B' });
    const sale = entry({ section: 'udhar_sales', mode: 'udhar', amount: 2000, partyId });
    b.host.store.append(sale);

    const out = await b.host.sync();
    expect(out.rejected.map((r) => [r.id, r.field])).toEqual([
      ['ob-party-' + partyId, 'parties_tenancy'],
      ['ob-' + sale.id, 'entries_party_fk'],
    ]);
    // The day went; the two refused rows did not, and were not acked.
    // FE-11 PARKS a refused row: it stays in the queue table with the server's reason (a figure he
    // typed is never thrown away) but leaves pendingOutbox so it is not re-posted on every drain.
    expect(b.host.store.parkedOutbox.map((r) => r.id).sort()).toEqual(
      ['ob-party-' + partyId, 'ob-' + sale.id].sort(),
    );
    expect(b.host.store.pendingOutbox).toEqual([]);
    expect(await rowsOf('entries', shopB)).toEqual([]);
    expect((await rowsOf('parties', shopA))[0]!.name).toBe('Somebody Else');
  });

  maybe('(b) a party the repository throws on is one rejected row, not a 500 for the batch', async () => {
    const real = pgRepo(sql);
    const failing = server({
      ...real,
      upsertParty: async () => {
        // NOT an infrastructure error: `isInfraError` (db/errors.ts) classes "connection terminated"
        // as an outage and answers the whole request 503 + Retry-After, by design.
        throw new Error('the repository could not store this party');
      },
    });
    const { host } = handset(failing);
    const shopId = await signIn(failing, host);
    host.store.addParty({ id: newId(), kind: 'customer', name: 'Ramesh' });
    host.store.append(entry({ section: 'cash_sales', mode: 'cash', amount: 5000 }));

    const out = await host.sync();
    expect(out.rejected.map((r) => r.field)).toEqual(['party']);
    // Everything else in the batch still landed and was acked.
    // (FE-11: the refused party is parked - still queued, no longer pending - so it is not re-posted.)
    expect(host.store.pendingOutbox).toEqual([]);
    expect(host.store.parkedOutbox).toHaveLength(1);
    expect(await rowsOf('entries', shopId)).toHaveLength(1);
  });

  maybe('(c) the same outbox pushed twice writes nothing twice, and both are accepted', async () => {
    const { host } = handset(s);
    const shopId = await signIn(s, host);
    host.store.addParty({ id: newId(), kind: 'supplier', name: 'Wholesaler' });
    host.store.append(entry({ section: 'cash_sales', mode: 'cash', amount: 5000 }));
    host.store.append(entry({ section: 'upi_sales', mode: 'upi', amount: 7000 }));
    const queued = host.store.pendingOutbox;

    const first = await host.client.push(queued);
    const second = await host.client.push(queued);
    expect(first.accepted).toEqual(second.accepted);
    expect(second.accepted).toHaveLength(queued.length);
    expect([first.entriesInserted, second.entriesInserted, second.alreadyPresent]).toEqual([2, 0, 2]);
    expect(await rowsOf('entries', shopId)).toHaveLength(2);
    expect(await rowsOf('parties', shopId)).toHaveLength(1);
  });

  maybe('(d) a reply lost after the commit, then a crash before the ack: the retry is harmless', async () => {
    const h = handset(s);
    const shopId = await signIn(s, h.host);
    h.host.store.append(entry({ section: 'cash_sales', mode: 'cash', amount: 5000 }));

    s.cable.mode = 'response-lost';
    const lost = await h.host.sync();
    expect(lost).toMatchObject({ accepted: 0, offline: true });
    expect(await rowsOf('entries', shopId), 'the server did commit').toHaveLength(1);

    // The phone is killed and starts again over the same file. Still queued.
    const again = h.restart(D1);
    expect(again.store.pendingOutbox).toHaveLength(2);

    s.cable.mode = 'ok';
    const retry = await again.sync();
    expect(retry).toMatchObject({ accepted: 2, offline: false, rejected: [] });
    expect(again.store.pendingOutbox).toEqual([]);
    expect(await rowsOf('entries', shopId), 'and nothing twice').toHaveLength(1);
  });

  maybe('(e) no network: nothing is acked and nothing is called a success', async () => {
    const { host } = handset(s);
    const shopId = await signIn(s, host);
    host.store.append(entry({ section: 'cash_sales', mode: 'cash', amount: 5000 }));
    const before = host.store.pendingOutbox;

    s.cable.mode = 'request-lost';
    const out = await host.sync();
    // `wrongShop` arrived with the sign-in work; offline is not a wrong-shop refusal.
    expect(out).toEqual({
      accepted: 0,
      rejected: [],
      idle: false,
      offline: true,
      needsSignIn: false,
      wrongShop: false,
    });
    expect(host.store.pendingOutbox).toEqual(before);
    expect(await rowsOf('entries', shopId)).toEqual([]);
  });

  maybe('(f) a day closed offline, parties and all, reaches the server closed in one sync', async () => {
    const { host } = handset(s);
    const shopId = await signIn(s, host);
    s.cable.mode = 'request-lost';

    const partyId = newId();
    host.store.setOpeningCash(100000);
    host.store.addParty({ id: partyId, kind: 'customer', name: 'Ramesh' });
    host.store.append(entry({ section: 'udhar_sales', mode: 'udhar', amount: 25000, partyId }));
    host.store.append(entry({ section: 'cash_sales', mode: 'cash', amount: 5000 }));
    host.store.skip('expense'); // D8: persisted locally, in the day record
    expect((await host.sync()).offline).toBe(true);
    const counted = host.store.expectedCash().value;
    host.store.close(counted);
    expect((await host.sync()).offline).toBe(true);

    s.cable.mode = 'ok';
    const out = await host.sync();
    expect(out.rejected, 'skippedSections must not reach additionalProperties:false').toEqual([]);
    expect(host.store.pendingOutbox).toEqual([]);
    const [day] = await rowsOf('days', shopId);
    expect(day).toMatchObject({ state: 'closed', counted_cash: String(counted) });
    expect(await rowsOf('entries', shopId)).toHaveLength(2);
    expect(await rowsOf('parties', shopId)).toHaveLength(1);
  });

  maybe('(g) a closed day cannot be reopened or written into from the client', async () => {
    const { host } = handset(s);
    const shopId = await signIn(s, host);
    host.store.setOpeningCash(0);
    host.store.close(0);
    expect((await host.sync()).rejected).toEqual([]);

    // The store refuses first.
    expect(() =>
      host.store.append(entry({ section: 'cash_sales', mode: 'cash', amount: 100 })),
    ).toThrow(DayClosedViolation);

    // A forged push - the day sent back open, and an entry dated into it.
    const late = entry({ section: 'cash_sales', mode: 'cash', amount: 100 });
    const out = await host.client.push([
      { id: 'ob-day-' + D1, kind: 'day', payload: { date: D1, state: 'open', openingCash: 0 }, queuedAt: T0 },
      { id: 'ob-' + late.id, kind: 'entry', payload: late, queuedAt: T0 },
    ]);
    expect(out.rejected.map((r) => r.id)).toEqual(['ob-' + late.id]);
    expect((await rowsOf('days', shopId))[0]!.state).toBe('closed');
    expect(await rowsOf('entries', shopId)).toEqual([]);
  });

  maybe('an outbox bigger than one request is cut to fit, each day kept whole', async () => {
    // Two days which together exceed the route's cap, and neither alone does.
    const per = CLIENT_MAX.entries / 2 + 50;
    const h = handset(s);
    const shopId = await signIn(s, h.host);
    s.cable.mode = 'request-lost'; // a week in a market with no signal, compressed

    h.host.store.setOpeningCash(0);
    for (let i = 0; i < per; i += 1) h.host.store.append(entry({ section: 'upi_sales', mode: 'upi', amount: 100 }));
    h.host.store.close(0);
    const next = h.restart(D2);
    for (let i = 0; i < per; i += 1) {
      next.store.append(entry({ section: 'upi_sales', mode: 'upi', amount: 100 }, D2));
    }
    expect(next.store.pendingOutbox.length).toBeGreaterThan(CLIENT_MAX.entries);

    s.cable.mode = 'ok';
    s.cable.sent = 0;
    const out = await next.sync();
    expect(out.rejected).toEqual([]);
    expect(s.cable.sent).toBe(2);
    expect(next.store.pendingOutbox).toEqual([]);
    expect((await rowsOf('days', shopId)).map((d) => d.state).sort()).toEqual(['closed', 'open']);
    expect(await rowsOf('entries', shopId)).toHaveLength(2 * per);
  }, 60_000);
});
