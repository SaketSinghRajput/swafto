/**
 * ARCH-08 · A PUSH'S ENTRIES COST O(1) DATABASE ROUND TRIPS, AND MEAN EXACTLY WHAT THEY DID.
 *
 * The REAL `pgRepo` over a small stateful fake driver that counts every statement and models
 * the five things a push's rows can meet: a new row, a replay, a content conflict, a closed day
 * and another shop's id (invisible under row-level security, but still in the primary key).
 * It cannot prove the SQL itself - `repo-equivalence.spec.ts` does that against Postgres in CI
 * (UNVERIFIED-LOCAL here) - but it proves the control flow: the round-trip count, the per-row
 * classification, and that the batch answers every row exactly as the single-row path does.
 */
import { describe, it, expect } from 'vitest';
import { pgRepo } from '../src/db/postgres.ts';
import { buildApp } from '../src/app.ts';
import { testDeps } from './_deps.ts';
import { mintToken } from '../src/auth/tokens.ts';
import { WriteRefused, type EntryOutcome } from '../src/db/port.ts';
import type { Entry, IsoDate } from '@swafto/formula-engine';

const KEY = 'test-signing-key-at-least-32-chars!!';
const T0 = '2026-09-19T08:00:00.000Z';
const SHOP = '11111111-1111-4111-8111-111111111111';
const OTHER = '55555555-5555-4555-8555-555555555555';
const PARTY = '88888888-8888-4888-8888-888888888888';
const FOREIGN_PARTY = '99999999-9999-4999-8999-999999999999';
const OPEN = '2026-09-19';
const CLOSED = '2026-09-10';
let n = 0;
const uid = () => '44444444-4444-4444-8444-' + String((n += 1)).padStart(12, '0');

type Row = Record<string, unknown>;
interface FakeOptions {
  /** A row carrying this label is refused by the database (a CHECK, or a NUL in text): any statement that includes it fails whole. */
  poisonLabel?: string;
}

/** A stateful stand-in for the three tables a push touches. `state` is shared so a copy can be forked. */
function fakeDb(seed: { entries: Row[]; days: Row[]; parties: Row[] }, opts: FakeOptions = {}) {
  const state = { entries: seed.entries.map((r) => ({ ...r })), days: seed.days, parties: seed.parties };
  const statements: string[] = [];
  let scope = '';
  const visible = () => state.entries.filter((r) => r.shop_id === scope);
  const toRow = (a: unknown[]): Row => ({
    id: a[0], shop_id: a[1], day_id: a[2], section: a[3], amount: a[4], mode: a[5], party_id: a[6],
    due_date: a[7], label: a[8], corrects_day_id: a[9], created_at: a[10], source: a[11], refers_to_entry_id: a[12],
  });
  const isClosed = (d: unknown) => state.days.some((x) => x.shop_id === scope && x.date === d && x.state === 'closed');
  const hasDay = (d: unknown) => state.days.some((x) => x.shop_id === scope && x.date === d);
  const poisonError = () => Object.assign(new Error('check violated'), { code: '23514', constraint: 'entries_amount_ck' });
  const closedError = () => Object.assign(new Error('entries_reject_closed_day: day is closed'), { code: 'P0001' });
  const fkError = () => Object.assign(new Error('violates foreign key days'), { code: '23503', constraint: 'entries_day_fk' });

  const db = {
    async query(text: string, p: readonly unknown[] = []) {
      const t = text.replace(/\s+/g, ' ').trim();
      statements.push(t.slice(0, 60));
      if (/set_config/.test(t)) {
        scope = String(p[0]);
        return { rows: [] };
      }
      if (/^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)/.test(t)) return { rows: [] };
      if (/^SELECT \* FROM devices/.test(t)) {
        return { rows: [{ id: 'd', user_id: 'u', shop_id: SHOP, platform: 'android', created_at: T0, last_seen_at: null, revoked_at: null }] };
      }
      if (/^SELECT \* FROM entries WHERE id = ANY/.test(t)) {
        const ids = (p[0] as string[]).map((s) => s.toLowerCase());
        return { rows: visible().filter((r) => ids.includes(String(r.id).toLowerCase())) };
      }
      if (/^SELECT id FROM parties WHERE shop_id = \$1 AND id = ANY/.test(t)) {
        return { rows: state.parties.filter((r) => r.shop_id === p[0] && (p[1] as string[]).includes(String(r.id))).map((r) => ({ id: r.id })) };
      }
      if (/^SELECT date, state FROM days WHERE shop_id = \$1 AND date = ANY/.test(t)) {
        return { rows: state.days.filter((r) => r.shop_id === p[0] && (p[1] as string[]).includes(String(r.date))) };
      }
      if (/^INSERT INTO entries .* unnest/.test(t)) {
        const cols = p.slice(0, 12) as unknown[][];
        const shop = p[12];
        if (opts.poisonLabel !== undefined && cols[7]!.includes(opts.poisonLabel)) throw poisonError();
        const out: Row[] = [];
        const staged: Row[] = []; // a statement is atomic: all of its rows or none
        for (let i = 0; i < cols[0]!.length; i += 1) {
          const id = cols[0]![i];
          if (state.entries.some((r) => r.id === id)) continue; // WHERE NOT EXISTS / ON CONFLICT
          if (!hasDay(cols[1]![i])) throw fkError();
          if (isClosed(cols[1]![i])) throw closedError();
          const row = toRow([id, shop, cols[1]![i], cols[2]![i], cols[3]![i], cols[4]![i], cols[5]![i], cols[6]![i], cols[7]![i], cols[8]![i], cols[9]![i], cols[10]![i], cols[11]![i]]);
          staged.push(row);
          out.push({ id });
        }
        state.entries.push(...staged);
        return { rows: out };
      }
      // Read-route statements: answered empty / with the one open day, enough for a route to finish.
      if (/^SELECT starts_at FROM days/.test(t)) return { rows: [{ starts_at: '00:00' }] };
      if (/^SELECT \* FROM days WHERE shop_id = \$1 AND date = \$2/.test(t)) {
        return { rows: state.days.filter((r) => r.shop_id === p[0] && r.date === p[1]).map((r) => ({ ...r, opening_cash: 0, counted_cash: null, difference_reason: null, closed_at: null, starts_at: '00:00', created_at: T0 })) };
      }
      if (/^SELECT date, state FROM days WHERE shop_id = \$1 AND date < \$2/.test(t)) {
        return { rows: state.days.filter((r) => r.shop_id === p[0] && String(r.date) < String(p[1])).map((r) => ({ date: r.date, state: r.state })) };
      }
      if (/^SELECT \* FROM (entries|upi_confirmations|adjustments|parties) WHERE shop_id = \$1/.test(t)) return { rows: [] };
      if (/^SELECT 1 FROM parties WHERE id = \$1 AND shop_id = \$2/.test(t)) {
        return { rows: state.parties.filter((r) => r.id === p[0] && r.shop_id === p[1]).map(() => ({ '?column?': 1 })) };
      }
      if (/^INSERT INTO entries .* SELECT \$1::uuid/.test(t)) {
        if (state.entries.some((r) => r.id === p[0])) return { rows: [] };
        if (opts.poisonLabel !== undefined && p[8] === opts.poisonLabel) throw poisonError();
        if (!hasDay(p[2])) throw fkError();
        if (isClosed(p[2])) throw closedError();
        state.entries.push(toRow(p as unknown[]));
        return { rows: [{ id: p[0] }] };
      }
      if (/^SELECT \* FROM entries WHERE id = \$1/.test(t)) {
        return { rows: visible().filter((r) => r.id === p[0]) };
      }
      throw new Error('fake driver: unrecognised statement: ' + t.slice(0, 120));
    },
  };
  return { db, state, statements };
}

const row = (e: Partial<Entry> & { id: string }, shop = SHOP): Row => ({
  id: e.id, shop_id: shop, day_id: e.dayId ?? OPEN, section: e.section ?? 'cash_sales', amount: e.amount ?? 100,
  mode: e.mode ?? 'cash', party_id: e.partyId ?? null, due_date: null, label: null, corrects_day_id: null,
  created_at: '2026-09-19T09:00:00.000Z', source: 'manual', refers_to_entry_id: null,
});
const seedBase = (entries: Row[] = []) => ({
  entries,
  days: [
    { shop_id: SHOP, date: OPEN, state: 'open' },
    { shop_id: SHOP, date: CLOSED, state: 'closed' },
  ],
  parties: [{ shop_id: SHOP, id: PARTY }, { shop_id: OTHER, id: FOREIGN_PARTY }],
});
const entry = (over: Partial<Entry> = {}): Entry =>
  ({ id: uid(), dayId: OPEN as IsoDate, section: 'cash_sales', amount: 12345, mode: 'cash', createdAt: '2026-09-19T09:00:00.000Z', source: 'manual', ...over }) as Entry;

/** What a caller can observe of one outcome: stored/replayed, or the refusal's name and message. */
const shape = (o: EntryOutcome) =>
  'error' in o
    ? { refused: o.error instanceof WriteRefused ? o.error.constraintName : 'other', message: (o.error as Error).message }
    : { inserted: o.inserted };

describe('ARCH-06 · a read request shares ONE scoped transaction', () => {
  const server = () => {
    const f = fakeDb(seedBase());
    const app = buildApp(testDeps({ repo: pgRepo(f.db), shopLimits: { push: false, read: false } }));
    const token = mintToken(KEY, { sub: 'u', shop: SHOP, dev: 'd', typ: 'access', nowSeconds: Math.floor(Date.parse(T0) / 1000), ttlSeconds: 86_400 });
    const get = async (url: string) => {
      f.statements.length = 0;
      const res = await app.inject({ method: 'GET', url, headers: { authorization: 'Bearer ' + token } });
      expect(res.statusCode).toBe(200);
      return f.statements.slice();
    };
    return { get, f };
  };

  it('summary, alerts and outstanding each open the scope once (fails when every call scopes itself)', async () => {
    const { get } = server();
    for (const [url, max] of [['/v1/days/2026-09-19/summary', 10], ['/v1/alerts', 11], ['/v1/parties/outstanding', 12]] as const) {
      const s = await get(url);
      expect(s.filter((x) => x === 'BEGIN'), url).toHaveLength(1);
      expect(s.filter((x) => /set_config/.test(x)), url).toHaveLength(1);
      expect(s.length, url + ': ' + s.join(' | ')).toBeLessThanOrEqual(max);
    }
  });

  it('a promise that outlives its scope does not reuse the released connection (RT-W3-4)', async () => {
    const f = fakeDb(seedBase());
    const repo = pgRepo(f.db);
    let late!: Promise<unknown>;
    await repo.inScope(SHOP, async () => {
      late = new Promise<void>((r) => setTimeout(r, 20)).then(() => repo.latestStartsAt(SHOP));
    });
    await late;
    // The scope's own transaction, and the late call's OWN: it must not run on a connection already released.
    expect(f.statements.filter((s) => s === 'BEGIN')).toHaveLength(2);
  });

  it('joins only the SAME shop: a call for another shop inside the scope opens its own transaction', async () => {
    const f = fakeDb(seedBase());
    const repo = pgRepo(f.db);
    await repo.inScope(SHOP, async () => {
      await repo.latestStartsAt(SHOP); // joins
      await repo.latestStartsAt(OTHER); // must NOT reuse SHOP's binding
    });
    expect(f.statements.filter((s) => /set_config/.test(s))).toHaveLength(2);
    expect(f.statements.filter((s) => s === 'BEGIN')).toHaveLength(2);
  });
});

describe('ARCH-08 · round trips', () => {
  it('100 entries through the route cost a constant number of statements, not 4 per entry (fails on per-row appends)', async () => {
    const { db, statements } = fakeDb(seedBase());
    const app = buildApp(testDeps({ repo: pgRepo(db), shopLimits: { push: false, read: false } }));
    const token = mintToken(KEY, { sub: 'u', shop: SHOP, dev: 'd', typ: 'access', nowSeconds: Math.floor(Date.parse(T0) / 1000), ttlSeconds: 86_400 });
    const count = async (k: number) => {
      statements.length = 0;
      const res = await app.inject({
        method: 'POST', url: '/v1/sync/push',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
        payload: JSON.stringify({ entries: Array.from({ length: k }, () => ({ ...entry() })) }),
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).entriesInserted).toBe(k);
      return statements.length;
    };
    const one = await count(1);
    const hundred = await count(100);
    expect(hundred).toBe(one); // O(1): the same statements for 1 row as for 100
    expect(hundred).toBeLessThanOrEqual(12);
  });

  it('a mixed batch answers every row exactly as the single-row path does (new, replay, conflict, closed day, foreign, duplicate, bad party, missing day)', async () => {
    const replay = entry({ amount: 777 });
    const conflict = entry({ amount: 500 });
    const foreign = entry({ amount: 1 });
    const batch: Entry[] = [
      entry(),
      { ...replay },
      { ...conflict, amount: 501 },
      entry({ dayId: CLOSED as IsoDate }),
      { ...foreign },
      entry(),
      entry({ mode: 'udhar', section: 'udhar_sales', partyId: PARTY }),
      entry({ mode: 'udhar', section: 'udhar_sales', partyId: FOREIGN_PARTY }),
      entry({ dayId: '2026-09-18' as IsoDate }),
      entry(),
    ];
    const dup = entry();
    batch.splice(6, 0, dup, { ...dup }); // the same id twice in one push: stored once, then a replay
    const seed = () => seedBase([row(replay), row(conflict), row(foreign, OTHER)]);

    const a = fakeDb(seed());
    const batched = await pgRepo(a.db).appendEntries(SHOP, batch);

    const b = fakeDb(seed());
    const repo = pgRepo(b.db);
    const sequential: EntryOutcome[] = [];
    for (const e of batch) {
      try { sequential.push(await repo.appendEntry(SHOP, e)); } catch (error) { sequential.push({ error }); }
    }

    expect(batched.map(shape)).toEqual(sequential.map(shape));
    // And it really did produce the interesting outcomes, not five shrugs.
    const kinds = batched.map((o) => ('error' in o ? (o.error as WriteRefused).constraintName : (o as { inserted: boolean }).inserted ? 'new' : 'replay'));
    expect(kinds).toContain('entries_append_only');
    expect(kinds).toContain('entries_closed_day');
    expect(kinds).toContain('entries_tenancy');
    expect(kinds).toContain('entries_party_fk');
    expect(kinds).toContain('entries_day_fk');
    expect(kinds).toContain('replay');
    // The two ledgers end up identical.
    expect(a.state.entries.map((r) => r.id).sort()).toEqual(b.state.entries.map((r) => r.id).sort());
  });

  it('RT-W3-2 · 1000 rows with ONE row the database refuses cost O(1) + O(log n) statements, not O(n)', async () => {
    const f = fakeDb(seedBase(), { poisonLabel: 'POISON' });
    const batch = Array.from({ length: 1000 }, (_, i) => entry(i === 500 ? { label: 'POISON' } : {}));
    const out = await pgRepo(f.db).appendEntries(SHOP, batch);
    expect(out.filter((o) => 'inserted' in o && o.inserted)).toHaveLength(999);
    const bad = out[500]!;
    expect('error' in bad && (bad.error as WriteRefused).constraintName).toBe('entries_amount_ck');
    expect(f.statements.length, 'was 3010 before bisecting').toBeLessThan(100);
    expect(f.state.entries).toHaveLength(999);
  });

  it('RT-W3-8 · past the work cap nothing is thrown: resolved rows keep their outcome and the rest come back as the retryable push_deferred', async () => {
    const f = fakeDb(seedBase(), { poisonLabel: 'POISON' });
    const batch = Array.from({ length: 1000 }, (_, i) => entry(i % 7 === 0 ? { label: 'POISON' } : {}));
    const out = await pgRepo(f.db).appendEntries(SHOP, batch);
    expect(out).toHaveLength(1000);
    const names = out.map((o) => ('error' in o ? (o.error as WriteRefused).constraintName : 'stored'));
    expect(names.filter((n) => n === 'stored').length).toBeGreaterThan(0);
    expect(names).toContain('push_deferred');
    for (const n of names) expect(['stored', 'entries_amount_ck', 'push_deferred']).toContain(n);
    // What was reported stored IS stored, and nothing else is.
    expect(f.state.entries).toHaveLength(names.filter((n) => n === 'stored').length);
    expect(f.statements.length).toBeLessThan(700); // the work stays bounded (no pool-starvation lever)
  });

  describe('through the route', () => {
    const route = (f: ReturnType<typeof fakeDb>, lines: string[] = []) => {
      const app = buildApp(testDeps({
        repo: pgRepo(f.db),
        shopLimits: { push: false, read: false },
        logStream: { write: (c: string) => void lines.push(c) },
      }));
      const token = mintToken(KEY, { sub: 'u', shop: SHOP, dev: 'd', typ: 'access', nowSeconds: Math.floor(Date.parse(T0) / 1000), ttlSeconds: 86_400 });
      return (entries: unknown[]) =>
        app.inject({
          method: 'POST', url: '/v1/sync/push',
          headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
          payload: JSON.stringify({ entries }),
        });
    };

    it('6 refused rows spread across 200 stay far under the work cap: a 200, the good rows applied, exactly those 6 rejected and none deferred, one concise log line', async () => {
      const f = fakeDb(seedBase(), { poisonLabel: 'POISON' });
      const lines: string[] = [];
      const push = route(f, lines);
      const bad = new Set([5, 40, 77, 120, 160, 199]);
      const batch = Array.from({ length: 200 }, (_, i) => entry(bad.has(i) ? { label: 'POISON' } : {}));
      const res = await push(batch);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.entriesInserted).toBe(194);
      // Under the cap (128 insert attempts): nothing is deferred. The cap itself is the next test's subject.
      expect(body.rejected.some((r: { field: string }) => r.field === 'push_deferred')).toBe(false);
      expect(body.rejected.map((r: { id: string }) => r.id).sort()).toEqual([...bad].map((i) => batch[i]!.id).sort());
      expect(f.state.entries).toHaveLength(194);
      // RT-W3-10: one concise line for the six failures, never a stack per row.
      const warn = lines.filter((l) => /sync rows failed/.test(l));
      expect(warn).toHaveLength(1);
      expect(JSON.parse(warn[0]!).rows).toBe(6);
      expect(lines.join('')).not.toMatch(/"stack"/);
    });

    it('far past the cap it is STILL a 200: good rows stored, the rest rejected as push_deferred, so the phone parks them instead of resending the batch', async () => {
      const f = fakeDb(seedBase(), { poisonLabel: 'POISON' });
      const push = route(f);
      const batch = Array.from({ length: 1000 }, (_, i) => entry(i % 7 === 0 ? { label: 'POISON' } : {}));
      const res = await push(batch);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.entriesInserted).toBeGreaterThan(0);
      expect(body.entriesInserted + body.rejected.length).toBe(1000);
      expect(body.rejected.some((r: { field: string }) => r.field === 'push_deferred')).toBe(true);
    });

    it('RT-W3-8/10 · a crafted correctsDayId or dueDate is refused per row at parse, never reaches the INSERT, and logs nothing per row', async () => {
      const f = fakeDb(seedBase());
      const lines: string[] = [];
      const push = route(f, lines);
      const crafted = Array.from({ length: 100 }, () => ({ ...entry(), correctsDayId: '2026-13-45' }));
      f.statements.length = 0;
      const res = await push([...crafted, entry(), { ...entry(), dueDate: '2026-02-31' }]);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.entriesInserted).toBe(1);
      expect(body.rejected).toHaveLength(101);
      expect(body.rejected.slice(0, 100).every((r: { field: string }) => r.field === 'correctsDayId')).toBe(true);
      expect(f.statements.length).toBeLessThanOrEqual(12);
      expect(lines.filter((l) => /"level":(40|50)/.test(l))).toEqual([]);
    });
  });

  it('RT-W3-2 · rows for a closed day, and a second copy of an id, need no per-row statement', async () => {
    const f = fakeDb(seedBase());
    const dup = entry();
    const batch = [
      ...Array.from({ length: 300 }, () => entry({ dayId: CLOSED as IsoDate })),
      entry(), dup, { ...dup }, { ...dup, amount: 9 },
    ];
    const out = await pgRepo(f.db).appendEntries(SHOP, batch);
    expect(out.slice(0, 300).every((o) => 'error' in o && (o.error as WriteRefused).constraintName === 'entries_closed_day')).toBe(true);
    expect(out.slice(300).map(shape)).toEqual([
      { inserted: true },
      { inserted: true },
      { inserted: false },
      { refused: 'entries_append_only', message: expect.any(String) },
    ]);
    expect(f.statements.length).toBeLessThan(15);
  });

  it('RT-W3-2 · a NUL in a label, an invalid createdAt and an impossible date are refused per row before any database work', async () => {
    const f = fakeDb(seedBase());
    const app = buildApp(testDeps({ repo: pgRepo(f.db), shopLimits: { push: false, read: false } }));
    const token = mintToken(KEY, { sub: 'u', shop: SHOP, dev: 'd', typ: 'access', nowSeconds: Math.floor(Date.parse(T0) / 1000), ttlSeconds: 86_400 });
    const good = Array.from({ length: 995 }, () => ({ ...entry() }));
    const bad = [
      { ...entry(), label: 'a\u0000b' },
      { ...entry(), createdAt: 'XXXXXXXXXXXXXXXXXXXX' },
      { ...entry(), createdAt: '2026-02-31T08:00:00.000Z' },
      { ...entry(), createdAt: '99999-01-01T00:00:00.000Z' },
      { ...entry(), createdAt: '2026-09-19T25:00:00.000Z' },
    ];
    f.statements.length = 0;
    const res = await app.inject({
      method: 'POST', url: '/v1/sync/push',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      payload: JSON.stringify({ entries: [...good, ...bad] }),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.entriesInserted).toBe(995);
    expect(body.rejected.map((r: { id: string }) => r.id)).toEqual(bad.map((b) => b.id));
    expect(f.statements.length, f.statements.join(' | ')).toBeLessThanOrEqual(12);
  });

  it('an outage is thrown from the batch, never reported as a row refusal', async () => {
    const { db } = fakeDb(seedBase());
    const down = { async query(t: string, p?: readonly unknown[]) { if (/ANY/.test(t)) throw Object.assign(new Error('terminating connection'), { code: '57P01' }); return db.query(t, p); } };
    await expect(pgRepo(down).appendEntries(SHOP, [entry()])).rejects.toThrow();
  });

  it('the memory twin gives the same per-row outcomes', async () => {
    const { memoryRepo } = await import('../src/db/memory.ts');
    const repo = memoryRepo();
    await repo.createShopAndUser({ shopId: SHOP, userId: '22222222-2222-4222-8222-222222222222', phone: '+919876500001', shopName: 'S', language: 'en', now: T0 });
    await repo.upsertDay({ shopId: SHOP, date: OPEN as IsoDate, state: 'open', openingCash: 0, countedCash: null, differenceReason: null, closedAt: null, startsAt: '00:00', createdAt: T0 });
    await repo.upsertDay({ shopId: SHOP, date: CLOSED as IsoDate, state: 'open', openingCash: 0, countedCash: null, differenceReason: null, closedAt: null, startsAt: '00:00', createdAt: T0 });
    await repo.upsertDay({ shopId: SHOP, date: CLOSED as IsoDate, state: 'closed', openingCash: 0, countedCash: 0, differenceReason: null, closedAt: T0, startsAt: '00:00', createdAt: T0 });
    const e = entry();
    const out = await repo.appendEntries(SHOP, [e, { ...e }, { ...e, id: uid(), dayId: CLOSED as IsoDate }, { ...e, amount: 9 }]);
    expect(out.map(shape)).toEqual([
      { inserted: true },
      { inserted: false },
      { refused: 'entries_closed_day', message: expect.any(String) },
      { refused: 'entries_append_only', message: expect.any(String) },
    ]);
  });
});
