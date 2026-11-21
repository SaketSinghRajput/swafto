/**
 * RED TEAM · CANCEL THIS ENTRY (business logic and money).
 *
 * Authorised, local, in-process only: the real Fastify app over the memory repo and, when reachable, the real
 * `pgRepo` over a pool (so concurrent requests really run on separate connections). Nothing here reaches
 * api.rohinova.com. Every test asserts the SECURE behaviour; a failing test is a finding and is named in
 * docs/audit/findings/red-team-cancel.md (the `RT-C<n>` tag in the test title is the finding id).
 *
 * Attacks: IDOR through cancelsEntryId, closed day / other day, double cancel (sequential, same batch,
 * concurrent, replayed under a new id), cancel of a cancel, mismatched mode/section/party/amount (D2),
 * cancelling a withdrawal (D3), referrers (return, correction), exchange legs, return after cancel, TOCTOU
 * against a concurrent return, ordering inside and across batches, replay idempotency, every derived figure
 * (differential: a ledger with a cancelled mistake must equal a ledger that never had it), float/hostile
 * paise, and large batches.
 */
import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.ts';
import { memoryRepo } from '../src/db/memory.ts';
import { pgRepo } from '../src/db/postgres.ts';
import { wrapPool, type PoolLike } from '../src/db/pool.ts';
import type { Repo } from '../src/db/port.ts';
import { mintToken } from '../src/auth/tokens.ts';
import { allMigrationsUp } from '@swafto/schema';
import { add, subtract, type Entry, type IsoDate } from '@swafto/formula-engine';
import { MAX_ENTRY_PAISE } from '@swafto/values';
import { testDeps, KEY, T0 } from './_deps.ts';

const DAY = '2026-09-19' as IsoDate;
const DAY2 = '2026-09-20' as IsoDate;
const CLOSED = '2026-09-18' as IsoDate;

/* ---------- a real Postgres, when there is one ---------- */
const URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55432/swafto_test';
type PgPool = PoolLike & { end(): Promise<void> };
let pool: PgPool | null = null;
try {
  const mod = (await import('pg')) as unknown as Record<string, unknown>;
  const pg = (mod.default ?? mod) as { Pool: new (o: unknown) => PgPool };
  const probe = new pg.Pool({ connectionString: URL, max: 1, connectionTimeoutMillis: 4000 });
  await probe.query('DROP SCHEMA IF EXISTS redteam_cancel CASCADE');
  await probe.query('CREATE SCHEMA redteam_cancel');
  await probe.end();
  pool = new pg.Pool({ connectionString: URL, max: 12, connectionTimeoutMillis: 5000, options: '-c search_path=redteam_cancel' });
  for (const s of allMigrationsUp('postgres')) await pool.query(s);
} catch (e) {
  pool = null;
  console.error('[redteam-cancel] no Postgres, running on the memory twin only:', (e as Error).message);
}

let handle: ReturnType<typeof wrapPool> | null = null;
const pgSql = () => (handle ??= wrapPool(pool!)).sql;

/* ---------- worlds ---------- */
let worldNo = 0;
const hex = (n: number, w: number) => n.toString(16).padStart(w, '0');

interface Client {
  shopId: string;
  push(body: Record<string, unknown>): Promise<{ status: number; body: any }>;
  entries(entries: unknown[]): Promise<{ status: number; body: any }>;
  get(url: string): Promise<any>;
  post(url: string, payload: unknown): Promise<{ status: number; body: any }>;
}

async function makeWorld(kind: 'memory' | 'pg', wrap?: (r: Repo) => Repo) {
  const no = (worldNo += 1);
  const base: Repo = kind === 'pg' ? pgRepo(pgSql()) : memoryRepo();
  const repo = wrap ? wrap(base) : base;
  // ids unique across every world (one shared PG table)
  const uuid = (n: number) => `aaaaaaaa-${hex(no, 4)}-4000-8000-${hex(n, 12)}`;
  const shopId = (k: number) => `bbbbbbbb-${hex(no, 4)}-4000-8000-${hex(k, 12)}`;
  const userId = (k: number) => `cccccccc-${hex(no, 4)}-4000-8000-${hex(k, 12)}`;
  const deviceId = (k: number) => `dddddddd-${hex(no, 4)}-4000-8000-${hex(k, 12)}`;
  const partyId = (k: number) => `eeeeeeee-${hex(no, 4)}-4000-8000-${hex(k, 12)}`;

  const app = buildApp(testDeps({ repo, shopLimits: { push: false, read: false } }));
  const clients: Client[] = [];
  for (const k of [1, 2]) {
    const sid = shopId(k);
    await base.createShopAndUser({ shopId: sid, userId: userId(k), phone: '+919' + String(no).padStart(5, '0') + String(k).padStart(4, '0'), shopName: 'S' + k, language: 'en', now: T0 });
    for (const date of [CLOSED, DAY, DAY2]) {
      await base.upsertDay({ shopId: sid, date, state: 'open', openingCash: 0, countedCash: null, differenceReason: null, closedAt: null, startsAt: '00:00', createdAt: T0 });
    }
    await base.upsertParty(sid, { id: partyId(k * 10 + 1), kind: 'customer', name: 'Ramesh' });
    await base.upsertParty(sid, { id: partyId(k * 10 + 2), kind: 'supplier', name: 'Mehta Traders' });
    await base.registerDevice({ id: deviceId(k), userId: userId(k), shopId: sid, platform: 'android', createdAt: T0, lastSeenAt: T0, revokedAt: null });
    const token = mintToken(KEY, { sub: userId(k), shop: sid, dev: deviceId(k), typ: 'access', nowSeconds: Math.floor(Date.parse(T0) / 1000), ttlSeconds: 86_400 });
    const headers = { 'content-type': 'application/json', authorization: 'Bearer ' + token };
    const call = async (method: 'GET' | 'POST', url: string, payload?: unknown) => {
      const res = await app.inject({ method, url, headers, ...(payload === undefined ? {} : { payload: JSON.stringify(payload) }) });
      let body: any = null;
      try { body = JSON.parse(res.body); } catch { body = res.body; }
      return { status: res.statusCode, body };
    };
    clients.push({
      shopId: sid,
      push: (b) => call('POST', '/v1/sync/push', b),
      entries: (entries) => call('POST', '/v1/sync/push', { entries }),
      get: async (url) => (await call('GET', url)).body,
      post: (url, payload) => call('POST', url, payload),
    });
  }
  const row = (n: number, over: Record<string, unknown> = {}) => ({ id: uuid(n), dayId: DAY, section: 'cash_sales', amount: 50000, mode: 'cash', createdAt: T0, ...over });
  const cancelOf = (t: Record<string, any>, n: number, over: Record<string, unknown> = {}) => ({ ...t, id: uuid(n), cancelsEntryId: t.id, ...over });
  const [a, b] = clients as [Client, Client];
  const stored = async (c: Client, date: IsoDate = DAY) => [...(await base.entriesFor(c.shopId, date))];
  const summary = async (c: Client, date: IsoDate = DAY) => c.get(`/v1/days/${date}/summary`);
  return { repo: base, a, b, uuid, partyId, row, cancelOf, stored, summary, kind };
}
type World = Awaited<ReturnType<typeof makeWorld>>;

const KINDS: ('memory' | 'pg')[] = pool ? ['memory', 'pg'] : ['memory'];

for (const kind of KINDS) {
  describe(`red team · cancel entry · ${kind}`, () => {
    /* ================= tenancy ================= */
    it("IDOR: another shop's entry cannot be cancelled, and the answer is the same as for an id that does not exist (no oracle)", async () => {
      const w = await makeWorld(kind);
      const theirs = w.row(1);
      expect((await w.b.entries([theirs])).body.entriesInserted).toBe(1);
      const foreign = await w.a.entries([w.cancelOf(theirs, 2)]);
      const nowhere = await w.a.entries([w.cancelOf({ ...theirs, id: w.uuid(999) }, 3)]);
      expect(foreign.body.entriesInserted).toBe(0);
      expect(foreign.body.rejected).toHaveLength(1);
      expect(foreign.body.rejected[0].field).toBe('cancel_target_missing');
      expect({ field: foreign.body.rejected[0].field, message: foreign.body.rejected[0].message }).toEqual({
        field: nowhere.body.rejected[0].field,
        message: nowhere.body.rejected[0].message,
      });
      // the victim's figures and ledger never moved
      expect((await w.stored(w.b)).map((e) => e.id)).toEqual([theirs.id]);
      expect((await w.summary(w.b)).figures.p4NetSales).toBe(50000);
      expect(await w.repo.entryCancelling(w.b.shopId, theirs.id)).toBeNull();
    });

    it("IDOR: a cancel whose own id collides with another shop's entry id is refused and leaks nothing", async () => {
      const w = await makeWorld(kind);
      const theirs = w.row(1);
      const mine = w.row(2);
      await w.b.entries([theirs]);
      await w.a.entries([mine]);
      const res = await w.a.entries([{ ...w.cancelOf(mine, 1) }]); // id 1 is shop B's row
      expect(res.body.entriesInserted).toBe(0);
      expect(res.body.rejected).toHaveLength(1);
      expect(JSON.stringify(res.body)).not.toContain(w.b.shopId);
      expect((await w.stored(w.b)).map((e) => e.id)).toEqual([theirs.id]);
      expect((await w.summary(w.a)).figures.p4NetSales).toBe(50000);
    });

    /* ================= days ================= */
    it('a cancel into a closed day is refused and the closed day does not move (D7)', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1, { dayId: CLOSED });
      await w.a.entries([sale]);
      await w.repo.upsertDay({ shopId: w.a.shopId, date: CLOSED, state: 'closed', openingCash: 0, countedCash: 50000, differenceReason: null, closedAt: T0, startsAt: '00:00', createdAt: T0 });
      const before = await w.summary(w.a, CLOSED);
      const res = await w.a.entries([w.cancelOf(sale, 2)]);
      expect(res.body.entriesInserted).toBe(0);
      expect(res.body.rejected).toHaveLength(1);
      expect(await w.summary(w.a, CLOSED)).toEqual(before);
      expect(await w.repo.entryCancelling(w.a.shopId, sale.id)).toBeNull();
    });

    it("a cancel posted on today for an entry of another day is refused (cancel_other_day), open or closed", async () => {
      const w = await makeWorld(kind);
      const yesterday = w.row(1, { dayId: CLOSED });
      await w.a.entries([yesterday]);
      const open = await w.a.entries([w.cancelOf(yesterday, 2, { dayId: DAY })]);
      expect(open.body.rejected[0].field).toBe('cancel_other_day');
      await w.repo.upsertDay({ shopId: w.a.shopId, date: CLOSED, state: 'closed', openingCash: 0, countedCash: 50000, differenceReason: null, closedAt: T0, startsAt: '00:00', createdAt: T0 });
      const closed = await w.a.entries([w.cancelOf(yesterday, 3, { dayId: DAY })]);
      expect(closed.body.rejected[0].field).toBe('cancel_other_day');
      expect((await w.summary(w.a, CLOSED)).figures.p4NetSales).toBe(50000);
      expect((await w.summary(w.a, DAY)).figures.p4NetSales).toBe(0);
    });

    it('a sale cancelled on an open day stays cancelled after the day closes, and a replay of the original batch afterwards is a no-op (offline replay)', async () => {
      const w = await makeWorld(kind);
      const keep = w.row(1);
      const mistake = w.row(2, { amount: 30000 });
      const batch = [keep, mistake, w.cancelOf(mistake, 3)];
      expect((await w.a.entries(batch)).body).toMatchObject({ entriesInserted: 3, rejected: [] });
      await w.repo.upsertDay({ shopId: w.a.shopId, date: DAY, state: 'closed', openingCash: 0, countedCash: 50000, differenceReason: null, closedAt: T0, startsAt: '00:00', createdAt: T0 });
      const replay = await w.a.entries(batch);
      expect(replay.status).toBe(200);
      expect(replay.body).toMatchObject({ entriesInserted: 0, entriesAlreadyPresent: 3, rejected: [] });
      expect((await w.summary(w.a)).figures.p4NetSales).toBe(50000);
    });

    /* ================= double cancel ================= */
    it('double cancel: a second cancel under a different id, sequentially, in one batch, and from a stale replay, never stores a second row', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1);
      await w.a.entries([sale, w.cancelOf(sale, 2)]);
      expect((await w.a.entries([w.cancelOf(sale, 3)])).body.rejected[0].field).toBe('already_cancelled');
      const sale2 = w.row(10);
      const both = await w.a.entries([sale2, w.cancelOf(sale2, 11), w.cancelOf(sale2, 12)]);
      expect(both.body.rejected.map((r: any) => r.field)).toEqual(['already_cancelled']);
      expect((await w.stored(w.a)).filter((e) => e.cancelsEntryId !== undefined)).toHaveLength(2);
      expect((await w.summary(w.a)).figures.p4NetSales).toBe(0);
    });

    it('double cancel by CONCURRENT pushes (different ids): exactly one cancel row, no 500, figures excluded once', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1);
      await w.a.entries([sale]);
      const results = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => w.a.entries([w.cancelOf(sale, 100 + i)])));
      expect(results.every((r) => r.status === 200)).toBe(true);
      expect(results.reduce((s, r) => s + r.body.entriesInserted, 0)).toBe(1);
      expect((await w.stored(w.a)).filter((e) => e.cancelsEntryId === sale.id)).toHaveLength(1);
      expect((await w.summary(w.a)).figures.p4NetSales).toBe(0);
    });

    it('concurrent replay of the SAME cancel row id is one row and every response is a clean 200', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1);
      const c = w.cancelOf(sale, 2);
      const results = await Promise.all([1, 2, 3, 4].map(() => w.a.entries([sale, c])));
      expect(results.every((r) => r.status === 200 && r.body.rejected.length === 0)).toBe(true);
      expect((await w.stored(w.a)).length).toBe(2);
    });

    it('replaying one batch many times returns the same bytes and changes nothing (B8)', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1);
      const batch = [sale, w.cancelOf(sale, 2), w.row(3, { amount: 7000 })];
      await w.a.entries(batch);
      const second = await w.a.entries(batch);
      for (let i = 0; i < 3; i += 1) expect((await w.a.entries(batch)).body).toEqual(second.body);
      expect(second.body).toMatchObject({ entriesInserted: 0, entriesAlreadyPresent: 3, rejected: [] });
      expect((await w.stored(w.a)).length).toBe(3);
    });

    /* ================= cancel of a cancel / chains ================= */
    it('cancel of a cancel is refused, alone, in a chain in one batch, and the original stays cancelled', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1);
      const c1 = w.cancelOf(sale, 2);
      await w.a.entries([sale, c1]);
      expect((await w.a.entries([w.cancelOf(c1, 3)])).body.rejected[0].field).toBe('cancel_of_cancel');
      const s2 = w.row(10);
      const c2 = w.cancelOf(s2, 11);
      const chain = await w.a.entries([s2, c2, w.cancelOf(c2, 12), w.cancelOf(w.cancelOf(c2, 12), 13)]);
      expect(chain.body.rejected.map((r: any) => r.id)).toEqual([w.uuid(12), w.uuid(13)]);
      expect((await w.stored(w.a)).filter((e) => e.cancelsEntryId !== undefined)).toHaveLength(2);
      expect((await w.summary(w.a)).figures.p4NetSales).toBe(0);
    });

    /* ================= mismatched copies (D2) ================= */
    it('a cash-mode cancel of a UPI sale is refused: the drawer does not move (D2)', async () => {
      const w = await makeWorld(kind);
      const keep = w.row(1);
      const upi = w.row(2, { section: 'upi_sales', mode: 'upi', amount: 40000 });
      await w.a.entries([keep, upi]);
      const before = await w.summary(w.a);
      const attack = await w.a.entries([{ ...upi, id: w.uuid(3), cancelsEntryId: upi.id, section: 'cash_sales', mode: 'cash' }]);
      expect(attack.body.entriesInserted).toBe(0);
      expect(attack.body.rejected).toHaveLength(1);
      expect(await w.summary(w.a)).toEqual(before);
      expect(before.figures.p3ExpectedCashBalance).toBe(50000);
    });

    const MISMATCHES: [string, (t: Record<string, any>) => Record<string, unknown>][] = [
      ['amount lower', () => ({ amount: 49999 })],
      ['amount higher', () => ({ amount: 50001 })],
      ['amount way higher', () => ({ amount: 9_000_000 })],
      ['mode upi on a cash row', () => ({ mode: 'upi', section: 'upi_sales' })],
      ['mode other', () => ({ mode: 'other' })],
      ['section expense', () => ({ section: 'expense' })],
      ['section withdrawal', () => ({ section: 'withdrawal' })],
      ['section purchase', () => ({ section: 'purchase' })],
      ['adds a due date', () => ({ dueDate: '2026-10-01' })],
      ['adds correctsDayId', () => ({ correctsDayId: CLOSED })],
      ['adds refersToEntryId', (t) => ({ refersToEntryId: t.id })],
    ];
    for (const [name, mut] of MISMATCHES) {
      it(`mismatched cancel (${name}) is refused and no figure moves`, async () => {
        const w = await makeWorld(kind);
        const sale = w.row(1);
        await w.a.entries([sale]);
        const before = await w.summary(w.a);
        const res = await w.a.entries([{ ...w.cancelOf(sale, 2), ...mut(sale) }]);
        expect(res.body.entriesInserted ?? 0).toBe(0);
        expect(res.status === 400 || (res.body.rejected ?? []).length === 1).toBe(true);
        expect(await w.summary(w.a)).toEqual(before);
        expect(await w.repo.entryCancelling(w.a.shopId, sale.id)).toBeNull();
      });
    }

    it('a cancel of a credit sale naming a different (or own other) party is refused; credit outstanding does not move', async () => {
      const w = await makeWorld(kind);
      const ramesh = w.partyId(11);
      const supplier = w.partyId(12);
      const sale = w.row(1, { section: 'udhar_sales', mode: 'udhar', partyId: ramesh, amount: 70000 });
      await w.a.entries([sale]);
      const swapped = await w.a.entries([w.cancelOf(sale, 2, { partyId: supplier })]);
      expect(swapped.body.rejected[0].field).toBe('cancel_mismatch');
      const foreignParty = await w.a.entries([w.cancelOf(sale, 3, { partyId: w.partyId(21) })]); // shop B's party
      expect(foreignParty.body.entriesInserted).toBe(0);
      expect(foreignParty.body.rejected).toHaveLength(1);
      expect((await w.a.get(`/v1/parties/outstanding?asOf=${DAY}`)).creditOutstanding).toBe(70000);
    });

    /* ================= D3: a withdrawal is not profit ================= */
    it('cancelling a withdrawal returns the drawer cash and does NOT create profit (D3)', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1, { amount: 100000 });
      const out = w.row(2, { section: 'withdrawal', mode: 'cash', amount: 30000 });
      await w.a.entries([sale, out]);
      const withOut = await w.summary(w.a);
      await w.a.entries([w.cancelOf(out, 3)]);
      const after = await w.summary(w.a);
      expect(after.figures.estimatedProfit).toBe(withOut.figures.estimatedProfit);
      expect(after.figures.p3ExpectedCashBalance).toBe(100000);
      expect(withOut.figures.p3ExpectedCashBalance).toBe(70000);
    });

    it('cancelling an expense only removes that expense (profit moves by exactly its amount, cash by exactly its amount)', async () => {
      const w = await makeWorld(kind);
      await w.a.entries([w.row(1, { amount: 100000 })]);
      const exp = w.row(2, { section: 'expense', mode: 'cash', amount: 25000 });
      await w.a.entries([exp]);
      const before = await w.summary(w.a);
      await w.a.entries([w.cancelOf(exp, 3)]);
      const after = await w.summary(w.a);
      expect(after.figures.estimatedProfit - before.figures.estimatedProfit).toBe(25000);
      expect(subtract(after.figures.p3ExpectedCashBalance, before.figures.p3ExpectedCashBalance)).toBe(25000);
    });

    /* ================= linked entries ================= */
    it('an entry with a return, an exchange leg or a correction pointing at it cannot be cancelled', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1, { amount: 100000 });
      const ret = w.row(2, { section: 'sales_return', amount: 40000, mode: 'other', refersToEntryId: sale.id });
      const out = w.row(3, { section: 'exchange_out', amount: 60000, mode: 'other', refersToEntryId: ret.id });
      expect((await w.a.entries([sale, ret, out])).body.rejected).toEqual([]);
      const res = await w.a.entries([w.cancelOf(sale, 4)]);
      expect(res.body.rejected[0].field).toBe('has_linked_entries');
      expect((await w.stored(w.a)).some((e) => e.cancelsEntryId)).toBe(false);
    });

    it('a correction pointing at an entry blocks its cancel (has_linked_entries)', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1, { dayId: DAY });
      await w.a.entries([sale]);
      const corr = w.row(2, { dayId: DAY2, amount: 5000, correctsDayId: DAY, refersToEntryId: sale.id });
      expect((await w.a.entries([corr])).body.rejected).toEqual([]);
      const res = await w.a.entries([w.cancelOf(sale, 3)]);
      expect(res.body.rejected[0].field).toBe('has_linked_entries');
    });

    it('event legs (return, exchange_out, refund_paid) can never be cancelled, even by a row crafted as a plain copy', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1, { amount: 100000 });
      const ret = w.row(2, { section: 'sales_return', amount: 40000, mode: 'other', refersToEntryId: sale.id });
      const out = w.row(3, { section: 'exchange_out', amount: 70000, mode: 'other', refersToEntryId: ret.id });
      const refund = w.row(4, { section: 'refund_paid', amount: 10000, mode: 'cash', refersToEntryId: ret.id });
      await w.a.entries([sale, ret, out]);
      const before = await w.summary(w.a);
      for (const [n, leg] of [[10, ret], [11, out], [12, refund]] as const) {
        // as a leg (keeps its link) and as a link-less copy
        const asLeg = await w.a.entries([w.cancelOf(leg, n)]);
        const bare = await w.a.entries([w.cancelOf(leg, n + 10, { refersToEntryId: undefined })]);
        expect(asLeg.body.entriesInserted ?? 0).toBe(0);
        expect(bare.body.entriesInserted ?? 0).toBe(0);
      }
      expect(await w.summary(w.a)).toEqual(before);
      expect((await w.stored(w.a)).some((e) => e.cancelsEntryId)).toBe(false);
    });

    /* ================= return/correction AFTER a cancel ================= */
    it('RT-C1 a return cannot be recorded against a sale that is already cancelled (it would be deducted from a sale that no longer counts)', async () => {
      const w = await makeWorld(kind);
      const keep = w.row(1, { amount: 20000 });
      const sale = w.row(2, { amount: 100000 });
      await w.a.entries([keep, sale, w.cancelOf(sale, 3)]);
      const before = await w.summary(w.a);
      const ret = await w.a.entries([w.row(4, { section: 'sales_return', amount: 40000, mode: 'other', refersToEntryId: sale.id })]);
      expect(ret.body.entriesInserted).toBe(0);
      expect(ret.body.rejected).toHaveLength(1);
      expect(await w.summary(w.a)).toEqual(before);
      expect(before.figures.p4NetSales).toBe(20000);
    });

    it('RT-C1 a return cannot point at the cancel row itself either', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1, { amount: 100000 });
      const cancel = w.cancelOf(sale, 2);
      await w.a.entries([sale, cancel]);
      const before = await w.summary(w.a);
      const ret = await w.a.entries([w.row(3, { section: 'sales_return', amount: 100000, mode: 'other', refersToEntryId: cancel.id })]);
      expect(ret.body.entriesInserted).toBe(0);
      expect(await w.summary(w.a)).toEqual(before);
    });

    it('RT-C1 a refund settlement cannot move cash for a return of a cancelled sale', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1, { amount: 100000 });
      await w.a.entries([sale, w.cancelOf(sale, 2)]);
      const before = await w.summary(w.a);
      const ret = w.row(3, { section: 'sales_return', amount: 100000, mode: 'other', refersToEntryId: sale.id });
      const refund = w.row(4, { section: 'refund_paid', amount: 100000, mode: 'cash', refersToEntryId: ret.id });
      await w.a.entries([ret, refund]);
      expect((await w.summary(w.a)).figures.p3ExpectedCashBalance).toBe(before.figures.p3ExpectedCashBalance);
    });

    it('RT-C2 TOCTOU: a cancel and a return of the same sale pushed concurrently never both land', async () => {
      const w = await makeWorld(kind);
      let bothLanded = 0;
      for (let i = 0; i < 12; i += 1) {
        const sale = w.row(1000 + i * 10, { amount: 100000 });
        await w.a.entries([sale]);
        const ret = w.row(1001 + i * 10, { section: 'sales_return', amount: 40000, mode: 'other', refersToEntryId: sale.id });
        const cancel = w.cancelOf(sale, 1002 + i * 10);
        await Promise.all(i % 2 === 0 ? [w.a.entries([cancel]), w.a.entries([ret])] : [w.a.entries([ret]), w.a.entries([cancel])]);
        const rows = await w.stored(w.a);
        if (rows.some((e) => e.cancelsEntryId === sale.id) && rows.some((e) => e.refersToEntryId === sale.id && e.section === 'sales_return')) bothLanded += 1;
      }
      expect(bothLanded).toBe(0);
    });

    it('RT-C3 a correction cannot be filed against an entry that is cancelled (or against the cancel row)', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1, { dayId: DAY });
      const cancel = w.cancelOf(sale, 2);
      await w.a.entries([sale, cancel]);
      const onSale = await w.a.entries([w.row(3, { dayId: DAY2, amount: 5000, correctsDayId: DAY, refersToEntryId: sale.id })]);
      const onCancel = await w.a.entries([w.row(4, { dayId: DAY2, amount: 5000, correctsDayId: DAY, refersToEntryId: cancel.id })]);
      expect(onSale.body.entriesInserted).toBe(0);
      expect(onCancel.body.entriesInserted).toBe(0);
    });

    /* ================= ordering ================= */
    it('RT-C4 a cancel listed BEFORE its target in the same push is not silently lost (it lands, or is explicitly retryable)', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1);
      const cancel = w.cancelOf(sale, 2);
      const res = await w.a.entries([cancel, sale]);
      // the intent was "this sale is cancelled"; after the push the ledger must say so, or the row must be reported as retryable
      const cancelled = (await w.summary(w.a)).figures.p4NetSales === 0;
      const retryable = res.body.rejected.every((r: any) => r.field === 'push_deferred');
      expect(cancelled || retryable).toBe(true);
    });

    it('a cancel whose target arrives in the NEXT push converges once the target is there (replaying the cancel then lands)', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1);
      const cancel = w.cancelOf(sale, 2);
      const first = await w.a.entries([cancel]);
      expect(first.body.entriesInserted).toBe(0);
      await w.a.entries([sale]);
      expect((await w.a.entries([cancel])).body).toMatchObject({ entriesInserted: 1, rejected: [] });
      expect((await w.summary(w.a)).figures.p4NetSales).toBe(0);
    });

    /* ================= every derived surface excludes the pair (differential) ================= */
    type Draft = [string, (w: World) => Record<string, unknown>];
    const DRAFTS: Draft[] = [
      ['cash sale', (w) => w.row(900, { amount: 31000 })],
      ['upi sale', (w) => w.row(900, { section: 'upi_sales', mode: 'upi', amount: 31000 })],
      ['credit sale', (w) => w.row(900, { section: 'udhar_sales', mode: 'udhar', amount: 31000, partyId: w.partyId(11) })],
      ['cash expense', (w) => w.row(900, { section: 'expense', mode: 'cash', amount: 31000 })],
      ['upi expense', (w) => w.row(900, { section: 'expense', mode: 'upi', amount: 31000 })],
      ['stock expense', (w) => w.row(900, { section: 'expense', mode: 'shop_stock', amount: 31000 })],
      ['cash purchase', (w) => w.row(900, { section: 'purchase', mode: 'cash', amount: 31000 })],
      ['credit purchase', (w) => w.row(900, { section: 'purchase', mode: 'udhar', amount: 31000, partyId: w.partyId(12) })],
      ['credit purchase with due date', (w) => w.row(900, { section: 'purchase', mode: 'udhar', amount: 31000, partyId: w.partyId(12) })],
      ['cash collection', (w) => w.row(900, { section: 'udhar_collection', mode: 'cash', amount: 3000, partyId: w.partyId(11) })],
      ['upi collection', (w) => w.row(900, { section: 'udhar_collection', mode: 'upi', amount: 3000, partyId: w.partyId(11) })],
      ['party payment', (w) => w.row(900, { section: 'party_payment', mode: 'cash', amount: 3000, partyId: w.partyId(12) })],
      ['withdrawal', (w) => w.row(900, { section: 'withdrawal', mode: 'cash', amount: 31000 })],
    ];
    for (const [name, make] of DRAFTS) {
      it(`differential: a cancelled ${name} leaves EVERY figure equal to a shop that never entered it`, async () => {
        const w = await makeWorld(kind);
        const keepA = [w.row(1, { amount: 80000 }), w.row(2, { section: 'udhar_sales', mode: 'udhar', amount: 50000, partyId: w.partyId(11) }), w.row(3, { section: 'purchase', mode: 'udhar', amount: 20000, partyId: w.partyId(12) })];
        // shop B: same keepers, ids rebuilt, never entered the mistake
        const keepB = keepA.map((r: any, i) => ({ ...r, id: w.uuid(2000 + i), ...(r.partyId ? { partyId: r.partyId === w.partyId(11) ? w.partyId(21) : w.partyId(22) } : {}) }));
        const mistake: any = make(w);
        const mistakeA = { ...mistake };
        const bothA = await w.a.entries([...keepA, mistakeA, w.cancelOf(mistakeA, 901)]);
        const bothB = await w.b.entries(keepB);
        expect(bothA.body.rejected).toEqual([]);
        expect(bothB.body.rejected).toEqual([]);
        const sa = await w.summary(w.a);
        const sb = await w.summary(w.b);
        expect(sa).toEqual(sb);
        const ra = await w.a.get(`/v1/reports?from=${CLOSED}&to=${DAY2}`);
        const rb = await w.b.get(`/v1/reports?from=${CLOSED}&to=${DAY2}`);
        expect(ra).toEqual(rb);
        const oa = await w.a.get(`/v1/parties/outstanding?asOf=${DAY2}`);
        const ob = await w.b.get(`/v1/parties/outstanding?asOf=${DAY2}`);
        expect({ c: oa.creditOutstanding, s: oa.supplierOutstanding }).toEqual({ c: ob.creditOutstanding, s: ob.supplierOutstanding });
        const la = await w.a.get('/v1/alerts');
        const lb = await w.b.get('/v1/alerts');
        expect({ ...la, asOf: 0 }).toEqual({ ...lb, asOf: 0 });
      });
    }

    it('the credit fold into LATER days excludes a cancelled credit sale (per-party balances: two parties)', async () => {
      const w = await makeWorld(kind);
      const p1 = w.partyId(11);
      const p2 = w.partyId(12);
      const owed = w.row(1, { dayId: CLOSED, section: 'udhar_sales', mode: 'udhar', amount: 70000, partyId: p1 });
      const mistake = w.row(2, { dayId: CLOSED, section: 'udhar_sales', mode: 'udhar', amount: 20000, partyId: p2 });
      const supplierMistake = w.row(3, { dayId: CLOSED, section: 'purchase', mode: 'udhar', amount: 15000, partyId: p2 });
      await w.a.entries([owed, mistake, w.cancelOf(mistake, 4), supplierMistake, w.cancelOf(supplierMistake, 5)]);
      await w.repo.upsertDay({ shopId: w.a.shopId, date: CLOSED, state: 'closed', openingCash: 0, countedCash: 0, differenceReason: 'x', closedAt: T0, startsAt: '00:00', createdAt: T0 });
      for (const d of [DAY, DAY2]) {
        const out = await w.a.get(`/v1/parties/outstanding?asOf=${d}`);
        expect(out.creditOutstanding).toBe(70000);
        expect(out.supplierOutstanding).toBe(0);
      }
    });

    it('closing the day with the app route: expected cash excludes the cancelled pair, so the true count closes with no difference', async () => {
      const w = await makeWorld(kind);
      const keep = w.row(1, { amount: 50000 });
      const mistake = w.row(2, { amount: 30000 });
      await w.a.entries([keep, mistake, w.cancelOf(mistake, 3)]);
      const wrong = await w.a.post(`/v1/days/${DAY}/close`, { countedCash: 80000 });
      expect(wrong.status).toBe(422);
      expect(wrong.body.expected).toBe(50000);
      const ok = await w.a.post(`/v1/days/${DAY}/close`, { countedCash: 50000 });
      expect(ok.status).toBe(200);
      expect(ok.body.difference).toBe(0);
    });

    it('a UPI confirmation of a cancelled UPI sale does not make "confirmed" exceed "expected"', async () => {
      const w = await makeWorld(kind);
      const upi = w.row(1, { section: 'upi_sales', mode: 'upi', amount: 40000 });
      const keep = w.row(2, { section: 'upi_sales', mode: 'upi', amount: 10000 });
      await w.a.entries([upi, keep, w.cancelOf(upi, 3)]);
      await w.a.push({ upiConfirmations: [{ id: w.uuid(10), dayId: DAY, entryId: upi.id, confirmedAt: T0 }, { id: w.uuid(11), dayId: DAY, entryId: keep.id, confirmedAt: T0 }] });
      const s = await w.summary(w.a);
      expect(s.upi.expectedReceived).toBe(10000);
      expect(s.upi.confirmedReceived).toBe(10000);
      expect(s.upi.status).toBe('checked');
    });

    /* ================= float / hostile paise ================= */
    const BAD_AMOUNTS: [string, unknown][] = [
      ['float', 500.5],
      ['almost integer', 49999.9999999],
      ['negative', -50000],
      ['zero', 0],
      ['minus zero', -0],
      ['over cap', add(MAX_ENTRY_PAISE, 1)],
      ['1e21', 1e21],
      ['unsafe integer', 9007199254740993],
      ['array', [50000]],
      ['object', { v: 50000 }],
      ['null', null],
    ];
    for (const [name, amount] of BAD_AMOUNTS) {
      it(`a cancel with ${name} paise is refused and writes nothing`, async () => {
        const w = await makeWorld(kind);
        const sale = w.row(1);
        await w.a.entries([sale]);
        const before = await w.summary(w.a);
        const res = await w.a.entries([w.cancelOf(sale, 2, { amount })]);
        expect(res.status === 400 || (res.body.rejected ?? []).length === 1).toBe(true);
        expect(res.body.entriesInserted ?? 0).toBe(0);
        expect(await w.summary(w.a)).toEqual(before);
      });
    }

    it('a non-UUID, null or array cancelsEntryId is a 400 and writes nothing', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1);
      await w.a.entries([sale]);
      for (const bad of ['not-a-uuid', '', null, [sale.id], { id: sale.id }, "'; DROP TABLE entries;--"]) {
        const res = await w.a.entries([{ ...w.cancelOf(sale, 2), cancelsEntryId: bad }]);
        expect(res.status).toBe(400);
      }
      expect((await w.stored(w.a)).map((e) => e.id)).toEqual([sale.id]);
    });

    it('a cancel row cannot cancel itself', async () => {
      const w = await makeWorld(kind);
      const res = await w.a.entries([{ ...w.row(1), cancelsEntryId: w.uuid(1) }]);
      expect(res.body.entriesInserted ?? 0).toBe(0);
      expect(await w.stored(w.a)).toHaveLength(0);
    });

    /* ================= batches ================= */
    it('a full push of 500 sales and their 500 cancels lands, and every figure is empty', async () => {
      const w = await makeWorld(kind);
      const batch: unknown[] = [];
      for (let i = 0; i < 500; i += 1) {
        const s = w.row(10_000 + i, { amount: 1000 + i });
        batch.push(s, w.cancelOf(s, 20_000 + i));
      }
      const res = await w.a.entries(batch);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ entriesInserted: 1000, rejected: [] });
      const s = await w.summary(w.a);
      expect(s.entryCount).toBe(0);
      expect(s.figures.p4NetSales).toBe(0);
      expect(s.figures.p3ExpectedCashBalance).toBe(0);
    }, 60_000);

    it('a push over the entry cap is a 400 before any cancel is processed', async () => {
      const w = await makeWorld(kind);
      const s = w.row(1);
      const batch: unknown[] = [s];
      for (let i = 0; i < 1001; i += 1) batch.push(w.cancelOf(s, 30_000 + i));
      const res = await w.a.entries(batch);
      expect(res.status).toBe(400);
      expect(await w.stored(w.a)).toHaveLength(0);
    });
  });
}

/* ---------- amplification: what one push of cancels costs the repository (memory twin, counted) ---------- */
describe('red team · cancel entry · cost of a push of cancels', () => {
  it('RT-C5 a push of 500 cancels does O(1) repository round trips, like plain entries (ARCH-08), not O(rows)', async () => {
    const calls = { findEntry: 0, entriesReferringTo: 0, entryCancelling: 0 };
    const w = await makeWorld('memory', (r) => ({
      ...r,
      findEntry: async (...a: Parameters<Repo['findEntry']>) => { calls.findEntry += 1; return r.findEntry(...a); },
      entriesReferringTo: async (...a: Parameters<Repo['entriesReferringTo']>) => { calls.entriesReferringTo += 1; return r.entriesReferringTo(...a); },
      entryCancelling: async (...a: Parameters<Repo['entryCancelling']>) => { calls.entryCancelling += 1; return r.entryCancelling(...a); },
    }));
    const sales: Record<string, any>[] = [];
    for (let i = 0; i < 500; i += 1) sales.push(w.row(10_000 + i, { amount: 1000 + i }));
    await w.a.entries(sales);
    calls.findEntry = calls.entriesReferringTo = calls.entryCancelling = 0;
    const res = await w.a.entries(sales.map((s, i) => w.cancelOf(s, 20_000 + i)));
    expect(res.body.entriesInserted).toBe(500);
    expect(calls.findEntry + calls.entriesReferringTo + calls.entryCancelling).toBeLessThanOrEqual(10);
  }, 60_000);
});

/* ---------- defence in depth: what the DATABASE alone enforces (the route is the only guard today) ---------- */
for (const kind of KINDS) {
  describe(`red team · cancel entry · repository-level invariants · ${kind}`, () => {
    it('RT-C6 the store itself refuses a cancel row dated on a different day from its target (the figures group by day, so a cross-day cancel would silently do nothing)', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1, { dayId: DAY });
      await w.repo.appendEntry(w.a.shopId, { ...sale, source: 'manual' } as unknown as Entry);
      const cross = { ...w.cancelOf(sale, 2, { dayId: DAY2 }), source: 'manual' } as unknown as Entry;
      const out = await w.repo.appendEntries(w.a.shopId, [cross]);
      expect('error' in out[0]!).toBe(true);
    });

    it('RT-C6 the store itself refuses a cancel of a cancel and of a return leg', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1, { amount: 100000 });
      const c1 = w.cancelOf(sale, 2);
      const ret = w.row(3, { section: 'sales_return', amount: 1000, mode: 'other', refersToEntryId: sale.id });
      const src = { source: 'manual' };
      await w.repo.appendEntries(w.a.shopId, [sale, c1].map((e) => ({ ...e, ...src })) as unknown as Entry[]);
      const out = await w.repo.appendEntries(w.a.shopId, [{ ...w.cancelOf(c1, 4), ...src } as unknown as Entry]);
      expect('error' in out[0]!).toBe(true);
      // a return leg cannot be cancelled either (needs its own sale uncancelled: use a second sale)
      const sale2 = w.row(10, { amount: 100000 });
      const ret2 = { ...w.row(11, { section: 'sales_return', amount: 1000, mode: 'other', refersToEntryId: sale2.id }), ...src };
      await w.repo.appendEntries(w.a.shopId, [{ ...sale2, ...src }, ret2] as unknown as Entry[]);
      const out2 = await w.repo.appendEntries(w.a.shopId, [{ ...w.cancelOf(ret2, 12, { refersToEntryId: undefined }), ...src } as unknown as Entry]);
      expect('error' in out2[0]!).toBe(true);
      void ret;
    });
  });
}
