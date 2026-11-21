/**
 * RED TEAM RETEST · CANCEL THIS ENTRY (business logic and money). Authorised, LOCAL only.
 *
 * The first round (redteam-cancel.spec.ts) is green. This file attacks the FIXES: the same-push order logic with
 * cycles and duplicates, the single-statement and concurrent behaviour of entries_link_guard, the transaction-scoped
 * advisory lock (lock-table pressure, deadlock ordering, residue after a refusal), the batched lookups, and the new
 * party-kind enforcement (every section, a missing party, a redacted party, a cross-shop party, a kind flip).
 * Every test asserts the SECURE behaviour; a failure is a finding named `RT2-<n>` in docs/audit/findings/red-team-cancel.md.
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
import { testDeps, KEY, T0 } from './_deps.ts';

const DAY = '2026-09-19' as IsoDate;
const DAY2 = '2026-09-20' as IsoDate;
const CLOSED = '2026-09-18' as IsoDate;

const URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55432/swafto_test';
type PgPool = PoolLike & { end(): Promise<void>; query(t: string, v?: unknown[]): Promise<{ rows: any[] }> };
let pool: PgPool | null = null;
try {
  const mod = (await import('pg')) as unknown as Record<string, unknown>;
  const pg = (mod.default ?? mod) as { Pool: new (o: unknown) => PgPool };
  const probe = new pg.Pool({ connectionString: URL, max: 1, connectionTimeoutMillis: 4000 });
  await probe.query('DROP SCHEMA IF EXISTS redteam_cancel_retest CASCADE');
  await probe.query('CREATE SCHEMA redteam_cancel_retest');
  await probe.end();
  pool = new pg.Pool({ connectionString: URL, max: 14, connectionTimeoutMillis: 8000, options: '-c search_path=redteam_cancel_retest' });
  for (const s of allMigrationsUp('postgres')) await pool.query(s);
} catch (e) {
  pool = null;
  console.error('[redteam-cancel-retest] no Postgres, memory twin only:', (e as Error).message);
}
let handle: ReturnType<typeof wrapPool> | null = null;
const pgSql = () => (handle ??= wrapPool(pool!)).sql;

let worldNo = 400;
const hex = (n: number, w: number) => n.toString(16).padStart(w, '0');
interface Client {
  shopId: string;
  entries(entries: unknown[]): Promise<{ status: number; body: any }>;
  push(body: Record<string, unknown>): Promise<{ status: number; body: any }>;
  get(url: string): Promise<any>;
}

async function makeWorld(kind: 'memory' | 'pg', wrap?: (r: Repo) => Repo) {
  const no = (worldNo += 1);
  const base: Repo = kind === 'pg' ? pgRepo(pgSql()) : memoryRepo();
  const repo = wrap ? wrap(base) : base;
  const uuid = (n: number) => `aaaaaaaa-${hex(no, 4)}-4000-8000-${hex(n, 12)}`;
  const shopId = (k: number) => `bbbbbbbb-${hex(no, 4)}-4000-8000-${hex(k, 12)}`;
  const userId = (k: number) => `cccccccc-${hex(no, 4)}-4000-8000-${hex(k, 12)}`;
  const deviceId = (k: number) => `dddddddd-${hex(no, 4)}-4000-8000-${hex(k, 12)}`;
  const partyId = (k: number) => `eeeeeeee-${hex(no, 4)}-4000-8000-${hex(k, 12)}`;
  const app = buildApp(testDeps({ repo, shopLimits: { push: false, read: false } }));
  const clients: Client[] = [];
  for (const k of [1, 2]) {
    const sid = shopId(k);
    await base.createShopAndUser({ shopId: sid, userId: userId(k), phone: '+918' + String(no).padStart(5, '0') + String(k).padStart(4, '0'), shopName: 'S' + k, language: 'en', now: T0 });
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
      entries: (entries) => call('POST', '/v1/sync/push', { entries }),
      push: (b) => call('POST', '/v1/sync/push', b),
      get: async (url) => (await call('GET', url)).body,
    });
  }
  const row = (n: number, over: Record<string, unknown> = {}) => ({ id: uuid(n), dayId: DAY, section: 'cash_sales', amount: 50000, mode: 'cash', createdAt: T0, ...over });
  const cancelOf = (t: Record<string, any>, n: number, over: Record<string, unknown> = {}) => ({ ...t, id: uuid(n), cancelsEntryId: t.id, ...over });
  const correction = (n: number, target: Record<string, any>, over: Record<string, unknown> = {}) =>
    row(n, { dayId: DAY2, amount: 5000, correctsDayId: target.dayId, refersToEntryId: target.id, ...over });
  const [a, b] = clients as [Client, Client];
  const ledger = async (c: Client) => (await Promise.all([CLOSED, DAY, DAY2].map((d) => base.entriesFor(c.shopId, d)))).flat();
  return { repo: base, wrapped: repo, a, b, uuid, partyId, row, cancelOf, correction, ledger, kind };
}

/** What must NEVER be true of a stored ledger, whatever order, concurrency or writer produced it. */
function violations(rows: readonly Entry[]): string[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: string[] = [];
  const cancelsOf = new Map<string, number>();
  for (const r of rows) {
    if (r.cancelsEntryId !== undefined) {
      cancelsOf.set(r.cancelsEntryId, (cancelsOf.get(r.cancelsEntryId) ?? 0) + 1);
      const t = byId.get(r.cancelsEntryId);
      if (!t) out.push('cancel without a target');
      else {
        if (t.cancelsEntryId !== undefined) out.push('cancel of a cancel');
        if (t.dayId !== r.dayId) out.push('cancel on another day');
        if (rows.some((x) => x.refersToEntryId === t.id)) out.push('cancelled target has a referrer');
      }
    }
    if (r.refersToEntryId !== undefined && byId.get(r.refersToEntryId)?.cancelsEntryId !== undefined) out.push('refers to a cancel row');
  }
  for (const [, n] of cancelsOf) if (n > 1) out.push('cancelled twice');
  return out;
}
const src = (e: Record<string, unknown>) => ({ ...e, source: 'manual' }) as unknown as Entry;

const KINDS: ('memory' | 'pg')[] = pool ? ['memory', 'pg'] : ['memory'];

for (const kind of KINDS) {
  describe(`retest · cancel entry · ${kind}`, () => {
    /* ============ RT-C1 / RT-C3: links to a cancelled entry, inside one push ============ */
    it('RT-C1 a sale, its cancel and a correction of the sale in ONE push: never both the cancel and the correction', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1);
      const res = await w.a.entries([w.correction(3, sale), w.cancelOf(sale, 2), sale]);
      expect(res.status).toBe(200);
      expect(violations(await w.ledger(w.a))).toEqual([]);
    });

    it('RT-C1 a sale, its cancel and a RETURN of the sale in ONE push (any order): never both', async () => {
      for (const order of [0, 1, 2]) {
        const w = await makeWorld(kind);
        const sale = w.row(1);
        const cancel = w.cancelOf(sale, 2);
        const ret = w.row(3, { section: 'sales_return', amount: 40000, mode: 'other', refersToEntryId: sale.id });
        const batch = order === 0 ? [sale, cancel, ret] : order === 1 ? [ret, cancel, sale] : [cancel, ret, sale];
        const res = await w.a.entries(batch);
        expect(res.status).toBe(200);
        expect(violations(await w.ledger(w.a))).toEqual([]);
      }
    });

    it('RT-C1 a refund leg (refers to the return, not the sale) cannot sneak in after a cancel was judged against the sale', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1, { amount: 100000 });
      const ret = w.row(2, { section: 'sales_return', amount: 40000, mode: 'other', refersToEntryId: sale.id });
      await w.a.entries([sale, ret]);
      const cancel = await w.a.entries([w.cancelOf(sale, 3)]);
      expect(cancel.body.rejected[0]?.field).toBe('has_linked_entries');
      const refund = w.row(4, { section: 'refund_paid', amount: 40000, mode: 'cash', refersToEntryId: ret.id });
      await w.a.entries([refund]);
      expect(violations(await w.ledger(w.a))).toEqual([]);
    });

    it('RT-C3 a correction pointing at the cancel row, pushed in the same request as the cancel, is not stored', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1);
      const cancel = w.cancelOf(sale, 2);
      const res = await w.a.entries([sale, cancel, w.correction(3, cancel)]);
      expect(res.status).toBe(200);
      expect(violations(await w.ledger(w.a))).toEqual([]);
      expect((await w.ledger(w.a)).some((e) => e.id === w.uuid(3))).toBe(false);
    });

    it('a cancel of a correction that was dropped as target_cancelled in the same push is refused and lands nowhere', async () => {
      const w = await makeWorld(kind);
      const s0 = w.row(1);
      await w.a.entries([s0, w.cancelOf(s0, 2)]);
      const corr = w.correction(3, s0); // refuses: s0 is cancelled
      const cancelCorr = w.cancelOf({ ...corr, dayId: DAY2 }, 4, { dayId: DAY2, correctsDayId: undefined, refersToEntryId: undefined });
      const res = await w.a.entries([corr, cancelCorr]);
      expect(res.status).toBe(200);
      const rows = await w.ledger(w.a);
      expect(rows.some((e) => e.id === w.uuid(4))).toBe(false); // no orphan cancel row for a row that never landed
      expect(rows.some((e) => e.id === w.uuid(3))).toBe(false);
      expect(res.body.entriesInserted).toBe(0);
      expect(violations(rows)).toEqual([]);
    });

    /* ============ RT-C4: batch-order logic with cycles and duplicates ============ */
    it('a cancel of a cancel listed BEFORE it in one push: no cancel-of-cancel is ever stored; the replay is a permanent refusal, not a retry loop', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1);
      const cA = w.cancelOf(sale, 2);
      const cB = w.cancelOf(cA, 3);
      const first = await w.a.entries([cB, cA, sale]);
      expect(first.status).toBe(200);
      expect(violations(await w.ledger(w.a))).toEqual([]);
      const replay = await w.a.entries([cB]);
      expect(replay.body.entriesInserted).toBe(0);
      // after the target exists, the answer must be the permanent one
      expect(replay.body.rejected[0]?.field).toBe('cancel_of_cancel');
    });

    it('two cancels of the same target in one push (different ids), plus a replay of the first: exactly one cancel row, replay is idempotent', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1);
      const c1 = w.cancelOf(sale, 2);
      const c2 = w.cancelOf(sale, 3);
      const res = await w.a.entries([c2, c1, sale, c1]);
      expect(res.status).toBe(200);
      const rows = await w.ledger(w.a);
      expect(rows.filter((e) => e.cancelsEntryId === sale.id)).toHaveLength(1);
      expect(violations(rows)).toEqual([]);
      const before = rows.length;
      await w.a.entries([c2, c1, sale, c1]);
      expect((await w.ledger(w.a)).length).toBe(before);
      expect((await w.a.get(`/v1/days/${DAY}/summary`)).figures.p4NetSales).toBe(0);
    });

    it('a cancel that names itself, and a cancel whose id equals its target id, are refused', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1);
      const selfCancel = { ...sale, cancelsEntryId: sale.id }; // same id as the sale AND names itself
      const res = await w.a.entries([sale, selfCancel]);
      expect(res.status).toBe(200);
      const rows = await w.ledger(w.a);
      expect(rows.filter((e) => e.id === sale.id)).toHaveLength(1);
      expect(rows.some((e) => e.cancelsEntryId !== undefined)).toBe(false);
      const alone = await w.a.entries([{ ...w.row(9), cancelsEntryId: w.uuid(9) }]);
      expect(alone.body.entriesInserted).toBe(0);
      expect(violations(await w.ledger(w.a))).toEqual([]);
    });

    it('the same cancel id twice in one push inserts once', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1);
      const c = w.cancelOf(sale, 2);
      const res = await w.a.entries([sale, c, c]);
      expect(res.status).toBe(200);
      expect((await w.ledger(w.a)).filter((e) => e.cancelsEntryId === sale.id)).toHaveLength(1);
      expect(res.body.entriesInserted).toBe(2);
    });

    it('a cancel row whose id equals an existing entry id of another shop leaks nothing and does not cancel', async () => {
      const w = await makeWorld(kind);
      const theirs = w.row(1);
      await w.b.entries([theirs]);
      const mine = w.row(2);
      await w.a.entries([mine]);
      const res = await w.a.entries([{ ...w.cancelOf(mine, 1), id: theirs.id }]);
      expect(res.body.entriesInserted).toBe(0);
      expect(violations(await w.ledger(w.b))).toEqual([]);
      expect((await w.ledger(w.b)).length).toBe(1);
    });

    /* ============ the store alone (a non-route writer), single statement ============ */
    it('STORE: [sale, cancel, referrer] in ONE repository statement never leaves a cancelled entry with a referrer', async () => {
      for (const variant of ['correction', 'return']) {
        const w = await makeWorld(kind);
        const sale = w.row(1, { amount: 100000 });
        const cancel = w.cancelOf(sale, 2);
        const link =
          variant === 'correction'
            ? w.correction(3, sale)
            : w.row(3, { section: 'sales_return', amount: 1000, mode: 'other', refersToEntryId: sale.id });
        await w.repo.appendEntries(w.a.shopId, [src(sale), src(cancel), src(link)]);
        expect(violations(await w.ledger(w.a))).toEqual([]);
        const w2 = await makeWorld(kind);
        const s2 = w2.row(1, { amount: 100000 });
        await w2.repo.appendEntries(w2.a.shopId, [src(s2)]);
        await w2.repo.appendEntries(w2.a.shopId, [src(w2.cancelOf(s2, 2)), src(variant === 'correction' ? w2.correction(3, s2) : w2.row(3, { section: 'sales_return', amount: 1000, mode: 'other', refersToEntryId: s2.id }))]);
        expect(violations(await w2.ledger(w2.a))).toEqual([]);
        const w3 = await makeWorld(kind);
        const s3 = w3.row(1, { amount: 100000 });
        await w3.repo.appendEntries(w3.a.shopId, [src(s3)]);
        await w3.repo.appendEntries(w3.a.shopId, [src(variant === 'correction' ? w3.correction(3, s3) : w3.row(3, { section: 'sales_return', amount: 1000, mode: 'other', refersToEntryId: s3.id })), src(w3.cancelOf(s3, 2))]);
        expect(violations(await w3.ledger(w3.a))).toEqual([]);
      }
    });

    it('STORE: appendEvent (legs on one connection) cannot refer to a cancelled sale or to a cancel row', async () => {
      const w = await makeWorld(kind);
      const sale = w.row(1, { amount: 100000 });
      const cancel = w.cancelOf(sale, 2);
      await w.repo.appendEntries(w.a.shopId, [src(sale), src(cancel)]);
      for (const target of [sale, cancel]) {
        const leg = src(w.row(10, { section: 'sales_return', amount: 1000, mode: 'other', refersToEntryId: target.id }));
        await expect(w.repo.appendEvent(w.a.shopId, [leg])).rejects.toBeTruthy();
      }
      expect(violations(await w.ledger(w.a))).toEqual([]);
    });

    /* ============ concurrency ============ */
    it('RT-C2 a cancel and a plain CORRECTION of the same sale raced across the pool never both land', async () => {
      const w = await makeWorld(kind);
      for (let i = 0; i < 16; i += 1) {
        const sale = w.row(1000 + i * 10, { amount: 100000 });
        await w.a.entries([sale]);
        const cancel = w.cancelOf(sale, 1002 + i * 10);
        const corr = w.correction(1001 + i * 10, sale);
        await Promise.all(i % 2 === 0 ? [w.a.entries([cancel]), w.a.entries([corr])] : [w.a.entries([corr]), w.a.entries([cancel])]);
      }
      expect(violations(await w.ledger(w.a))).toEqual([]);
    });

    it('RT-C2 a cancel raced against a refund leg and a return of the same sale never both land (three-way)', async () => {
      const w = await makeWorld(kind);
      for (let i = 0; i < 10; i += 1) {
        const sale = w.row(2000 + i * 10, { amount: 100000 });
        await w.a.entries([sale]);
        const ret = w.row(2001 + i * 10, { section: 'sales_return', amount: 40000, mode: 'other', refersToEntryId: sale.id });
        const corr = w.correction(2003 + i * 10, sale);
        await Promise.all([w.a.entries([w.cancelOf(sale, 2002 + i * 10)]), w.a.entries([ret]), w.a.entries([corr])]);
      }
      expect(violations(await w.ledger(w.a))).toEqual([]);
    });

    it('two simultaneous cancels of one sale under different ids: exactly one row, the other refused', async () => {
      const w = await makeWorld(kind);
      for (let i = 0; i < 10; i += 1) {
        const sale = w.row(3000 + i * 10, { amount: 100000 });
        await w.a.entries([sale]);
        await Promise.all([w.a.entries([w.cancelOf(sale, 3001 + i * 10)]), w.a.entries([w.cancelOf(sale, 3002 + i * 10)]), w.a.entries([w.cancelOf(sale, 3003 + i * 10)])]);
      }
      const rows = await w.ledger(w.a);
      expect(violations(rows)).toEqual([]);
      expect(rows.filter((e) => e.cancelsEntryId !== undefined)).toHaveLength(10);
    });

    it('reversed-order pushes over the same targets (deadlock shape): every row lands after retries, nothing is lost, and a deadlock is a retryable 503, never a per-row refusal', async () => {
      const w = await makeWorld(kind);
      const N = 120;
      const sales = Array.from({ length: N }, (_, i) => w.row(5000 + i, { amount: 1000 }));
      await w.a.entries(sales);
      const corrs1 = sales.map((s, i) => w.correction(6000 + i, s));
      const corrs2 = [...sales].reverse().map((s, i) => w.correction(7000 + i, s));
      const statuses: number[] = [];
      const send = async (rows: unknown[]) => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const r = await w.a.entries(rows);
          statuses.push(r.status);
          if (r.status === 200) {
            for (const rj of r.body.rejected) expect(['push_deferred']).toContain(rj.field);
            if (r.body.rejected.length === 0) return;
          }
        }
      };
      await Promise.all([send(corrs1), send(corrs2)]);
      const rows = await w.ledger(w.a);
      expect(violations(rows)).toEqual([]);
      expect(rows.filter((e) => e.refersToEntryId !== undefined)).toHaveLength(N * 2);
      for (const s of statuses) expect([200, 503]).toContain(s);
      console.log(`[retest ${kind}] reversed-order pushes statuses:`, JSON.stringify(statuses));
    }, 120_000);

    /* ============ the batched lookups, and cancel_target_missing as a load lever ============ */
    it('RT-C5 1000 cancels of targets that do not exist cost O(1) repository calls, and replaying them stays O(1) per push', async () => {
      let calls = 0;
      const wrap = (r: Repo): Repo =>
        new Proxy(r, {
          get(t, p, rcv) {
            const v = Reflect.get(t, p, rcv);
            return typeof v === 'function' ? (...a: unknown[]) => { calls += 1; return (v as (...x: unknown[]) => unknown).apply(t, a); } : v;
          },
        });
      const w = await makeWorld(kind, wrap);
      const ghosts = Array.from({ length: 1000 }, (_, i) => w.cancelOf(w.row(10_000 + i), 20_000 + i));
      calls = 0;
      const one = await w.a.entries(ghosts);
      const costOne = calls;
      expect(one.status).toBe(200);
      expect(one.body.rejected).toHaveLength(1000);
      expect(new Set(one.body.rejected.map((r: any) => r.field))).toEqual(new Set(['cancel_target_missing']));
      calls = 0;
      for (let i = 0; i < 5; i += 1) await w.a.entries(ghosts);
      expect(costOne).toBeLessThanOrEqual(14);
      expect(calls).toBeLessThanOrEqual(5 * 14);
      expect(await w.ledger(w.a)).toHaveLength(0);
    }, 60_000);

    it('1000 corrections aimed at 1000 cancelled sales: O(1) calls and none lands', async () => {
      let calls = 0;
      const wrap = (r: Repo): Repo =>
        new Proxy(r, {
          get(t, p, rcv) {
            const v = Reflect.get(t, p, rcv);
            return typeof v === 'function' ? (...a: unknown[]) => { calls += 1; return (v as (...x: unknown[]) => unknown).apply(t, a); } : v;
          },
        });
      const w = await makeWorld(kind, wrap);
      const sales = Array.from({ length: 300 }, (_, i) => w.row(30_000 + i, { amount: 1000 }));
      await w.a.entries(sales);
      await w.a.entries(sales.map((s, i) => w.cancelOf(s, 31_000 + i)));
      calls = 0;
      const res = await w.a.entries(sales.map((s, i) => w.correction(32_000 + i, s)));
      expect(res.body.entriesInserted).toBe(0);
      expect(res.body.rejected).toHaveLength(300);
      expect(new Set(res.body.rejected.map((r: any) => r.field))).toEqual(new Set(['target_cancelled']));
      expect(calls).toBeLessThanOrEqual(14);
      expect(violations(await w.ledger(w.a))).toEqual([]);
    }, 60_000);

    /* ============ regression: totals, D2, D3, replay ============ */
    it('REGRESSION a cancelled UPI sale, a cancelled withdrawal and a cancelled cash sale leave the figures of a shop that never made them (differential), and the replay moves nothing', async () => {
      const wMist = await makeWorld(kind);
      const wClean = await makeWorld(kind);
      const real = wMist.row(1, { amount: 70000 });
      const upi = wMist.row(2, { section: 'upi_sales', mode: 'upi', amount: 30000 });
      const wd = wMist.row(3, { section: 'withdrawal', amount: 20000 });
      const cashMistake = wMist.row(4, { amount: 12345 });
      const batch = [real, upi, wd, cashMistake, wMist.cancelOf(upi, 12), wMist.cancelOf(wd, 13), wMist.cancelOf(cashMistake, 14)];
      await wMist.a.entries(batch);
      await wClean.a.entries([wClean.row(1, { amount: 70000 })]);
      const m = (await wMist.a.get(`/v1/days/${DAY}/summary`)).figures;
      const c = (await wClean.a.get(`/v1/days/${DAY}/summary`)).figures;
      for (const k of Object.keys(c)) expect(m[k], k).toEqual(c[k]);
      const before = (await wMist.ledger(wMist.a)).length;
      const replay = await wMist.a.entries(batch);
      expect(replay.body.entriesInserted).toBe(0);
      expect((await wMist.ledger(wMist.a)).length).toBe(before);
      expect(subtract(add(m.p4NetSales, 0), c.p4NetSales)).toBe(0);
    });

    it('REGRESSION D7: a cancel into a closed day, and a cancel of a closed day entry from an open day, are refused', async () => {
      const w = await makeWorld(kind);
      const old = w.row(1, { dayId: CLOSED });
      await w.a.entries([old]);
      await w.repo.upsertDay({ shopId: w.a.shopId, date: CLOSED, state: 'closed', openingCash: 0, countedCash: 0, differenceReason: null, closedAt: T0, startsAt: '00:00', createdAt: T0 });
      const res = await w.a.entries([w.cancelOf(old, 2)]);
      expect(res.body.entriesInserted).toBe(0);
      const across = await w.a.entries([w.cancelOf(old, 3, { dayId: DAY })]);
      expect(across.body.entriesInserted).toBe(0);
      expect(violations(await w.ledger(w.a))).toEqual([]);
    });

    /* ============ party-kind enforcement ============ */
    describe('party kind', () => {
      const ENTRY_CASES: { name: string; section: string; mode: string; extra?: Record<string, unknown>; need: 'customer' | 'supplier' | null; party: 'required' | 'optional' | 'refused' }[] = [
        { name: 'cash_sales', section: 'cash_sales', mode: 'cash', need: null, party: 'refused' },
        { name: 'upi_sales', section: 'upi_sales', mode: 'upi', need: null, party: 'refused' },
        { name: 'expense', section: 'expense', mode: 'cash', need: null, party: 'refused' },
        { name: 'withdrawal', section: 'withdrawal', mode: 'cash', need: null, party: 'refused' },
        { name: 'udhar_sales', section: 'udhar_sales', mode: 'udhar', need: 'customer', party: 'required' },
        { name: 'udhar_collection', section: 'udhar_collection', mode: 'cash', need: 'customer', party: 'required' },
        { name: 'party_payment', section: 'party_payment', mode: 'cash', need: 'supplier', party: 'required' },
        { name: 'purchase cash', section: 'purchase', mode: 'cash', need: 'supplier', party: 'optional' },
        { name: 'purchase udhar', section: 'purchase', mode: 'udhar', extra: { dueDate: '2026-10-30' }, need: 'supplier', party: 'required' },
      ];

      it('every non-event section x {customer, supplier, nobody}: a wrong KIND is party_kind_mismatch, nothing wrong-kind is ever stored', async () => {
        const w = await makeWorld(kind);
        let n = 100;
        const stored: Entry[] = [];
        for (const c of ENTRY_CASES) {
          for (const who of ['customer', 'supplier', 'nobody'] as const) {
            n += 1;
            const partyId = who === 'customer' ? w.partyId(11) : who === 'supplier' ? w.partyId(12) : undefined;
            const r = await w.a.entries([w.row(n, { section: c.section, mode: c.mode, ...(c.extra ?? {}), ...(partyId ? { partyId } : {}) })]);
            expect(r.status, c.name + '/' + who).toBe(200);
            const landed = r.body.entriesInserted === 1;
            const field: string | undefined = r.body.rejected[0]?.field;
            const label = `${c.name}/${who}`;
            if (c.need === null) {
              // sections that name nobody: any party is refused, no party is fine
              expect(landed, label).toBe(who === 'nobody');
            } else if (who === 'nobody') {
              expect(landed, label).toBe(c.party === 'optional');
            } else if (who === c.need) {
              expect(landed, label).toBe(true);
            } else {
              expect(landed, label).toBe(false);
              if (c.party !== 'refused') expect(field, label).toBe('party_kind_mismatch');
            }
            if (landed) stored.push(...(await w.ledger(w.a)).filter((e) => e.id === w.uuid(n)));
          }
        }
        const partyKind = new Map([[w.partyId(11), 'customer'], [w.partyId(12), 'supplier']]);
        for (const e of stored) {
          if (e.partyId === undefined) continue;
          const need = e.section === 'purchase' || e.section === 'party_payment' ? 'supplier' : 'customer';
          expect(partyKind.get(e.partyId), e.section).toBe(need);
        }
      });

      it('event legs: a return / refund leg that names a supplier is refused as party_kind_mismatch, the whole event goes with it, a customer or nobody lands', async () => {
        const w = await makeWorld(kind);
        const sale = w.row(1, { amount: 100000 });
        await w.a.entries([sale]);
        const bad = w.row(2, { section: 'sales_return', amount: 40000, mode: 'other', refersToEntryId: sale.id, partyId: w.partyId(12) });
        const refundBad = w.row(3, { section: 'refund_paid', amount: 40000, mode: 'cash', refersToEntryId: bad.id, partyId: w.partyId(12) });
        const r1 = await w.a.entries([bad, refundBad]);
        expect(r1.body.entriesInserted).toBe(0);
        expect(r1.body.rejected.length).toBeGreaterThanOrEqual(1);
        expect(r1.body.rejected.some((x: any) => x.field === 'party_kind_mismatch')).toBe(true);
        const ok = w.row(4, { section: 'sales_return', amount: 40000, mode: 'other', refersToEntryId: sale.id, partyId: w.partyId(11) });
        const refundOk = w.row(5, { section: 'refund_paid', amount: 40000, mode: 'cash', refersToEntryId: ok.id, partyId: w.partyId(11) });
        const r2 = await w.a.entries([ok, refundOk]);
        expect(r2.body.entriesInserted).toBe(2);
        // a refund leg with the wrong kind attached to a GOOD stored return (later push)
        const sale2 = w.row(6, { amount: 100000 });
        const ret2 = w.row(7, { section: 'sales_return', amount: 40000, mode: 'other', refersToEntryId: sale2.id });
        await w.a.entries([sale2, ret2]);
        const wrongRefund = w.row(8, { section: 'refund_paid', amount: 10000, mode: 'cash', refersToEntryId: ret2.id, partyId: w.partyId(12) });
        const r3 = await w.a.entries([wrongRefund]);
        expect(r3.body.entriesInserted).toBe(0);
        expect(r3.body.rejected[0]?.field).toBe('party_kind_mismatch');
      });

      it('a party pushed in the SAME request (wrong kind for the section) is judged by its stored kind, not skipped', async () => {
        const w = await makeWorld(kind);
        const sup = w.partyId(50);
        const res = await w.a.push({
          parties: [{ id: sup, kind: 'supplier', name: 'Fresh Supplier' }],
          entries: [w.row(1, { section: 'udhar_sales', mode: 'udhar', partyId: sup })],
        });
        expect(res.body.entriesInserted).toBe(0);
        expect(res.body.rejected[0]?.field).toBe('party_kind_mismatch');
      });

      it('a kind flip: re-pushing a customer id as a supplier must not change what the ledger holds against it (both engines)', async () => {
        const w = await makeWorld(kind);
        const cust = w.partyId(11);
        const udhar = w.row(1, { section: 'udhar_sales', mode: 'udhar', partyId: cust, amount: 50000 });
        expect((await w.a.entries([udhar])).body.entriesInserted).toBe(1);
        await w.a.push({ parties: [{ id: cust, kind: 'supplier', name: 'Ramesh' }] });
        const parties = await w.repo.partiesFor(w.a.shopId);
        expect(parties.find((p) => p.id === cust)?.kind).toBe('customer');
        // and a udhar sale to it is still a customer sale, a supplier payment to it is still refused
        const pay = await w.a.entries([w.row(2, { section: 'party_payment', mode: 'cash', partyId: cust })]);
        expect(pay.body.entriesInserted).toBe(0);
      });

      it("a cross-shop party id is refused with the same answer as an id that does not exist (no oracle), for a required-kind section", async () => {
        const w = await makeWorld(kind);
        const foreign = w.partyId(21); // shop B's customer
        const nowhere = w.partyId(999);
        const r1 = await w.a.entries([w.row(1, { section: 'udhar_sales', mode: 'udhar', partyId: foreign })]);
        const r2 = await w.a.entries([w.row(2, { section: 'udhar_sales', mode: 'udhar', partyId: nowhere })]);
        expect(r1.body.entriesInserted).toBe(0);
        expect(r2.body.entriesInserted).toBe(0);
        // the message echoes the id the CALLER sent (nothing of ours); with that id masked the answers are identical
        const mask = (r: { body: any }, id: string) => ({ f: r.body.rejected[0]?.field, m: String(r.body.rejected[0]?.message).replace(id, '<id>') });
        expect(mask(r1, foreign)).toEqual(mask(r2, nowhere));
        // and the foreign SUPPLIER id on a customer-kind section is the same (kind must not leak across shops)
        const r3 = await w.a.entries([w.row(3, { section: 'udhar_sales', mode: 'udhar', partyId: w.partyId(22) })]);
        expect(mask(r3, w.partyId(22))).toEqual(mask(r2, nowhere));
        expect(await w.ledger(w.a)).toHaveLength(0);
      });

      it('a redacted (erased) customer keeps its kind: a wrong-kind entry against it is still refused, and cancelling an old entry of it still works', async () => {
        const w = await makeWorld(kind);
        const cust = w.partyId(11);
        const udhar = w.row(1, { section: 'udhar_sales', mode: 'udhar', partyId: cust, amount: 50000 });
        await w.a.entries([udhar]);
        expect((await w.repo.redactParty(w.a.shopId, cust)).redacted).toBe(true);
        const wrong = await w.a.entries([w.row(2, { section: 'party_payment', mode: 'cash', partyId: cust })]);
        expect(wrong.body.entriesInserted).toBe(0);
        const cancel = await w.a.entries([w.cancelOf(udhar, 3)]);
        expect(cancel.body.entriesInserted).toBe(1);
        expect((await w.a.get(`/v1/days/${DAY}/summary`)).figures.p4NetSales).toBe(0);
      });

      it('a cancel row cannot be used to smuggle a party: wrong-kind or extra party on a cancel is refused, the cancel copies its target exactly', async () => {
        const w = await makeWorld(kind);
        const cash = w.row(1);
        const udhar = w.row(2, { section: 'udhar_sales', mode: 'udhar', partyId: w.partyId(11) });
        await w.a.entries([cash, udhar]);
        const r1 = await w.a.entries([w.cancelOf(cash, 3, { partyId: w.partyId(12) })]);
        const r2 = await w.a.entries([w.cancelOf(udhar, 4, { partyId: w.partyId(12) })]);
        const r3 = await w.a.entries([w.cancelOf(udhar, 5, { partyId: undefined })]);
        for (const r of [r1, r2, r3]) expect(r.body.entriesInserted).toBe(0);
        expect(violations(await w.ledger(w.a))).toEqual([]);
      });
    });
  });
}

/* ============ pg only: the advisory lock under pressure and after refusals ============ */
if (pool) {
  describe('retest · entries_link_guard advisory lock (postgres)', () => {
    it('no advisory lock is left behind after refusals, rollbacks and a raced push', async () => {
      const w = await makeWorld('pg');
      const sale = w.row(1);
      await w.a.entries([sale, w.cancelOf(sale, 2)]);
      for (let i = 0; i < 6; i += 1) await w.a.entries([w.correction(10 + i, sale), w.cancelOf(sale, 20 + i), w.row(30 + i, { dayId: CLOSED, refersToEntryId: sale.id })]);
      const left = await pool!.query("SELECT count(*)::int AS n FROM pg_locks WHERE locktype = 'advisory' AND pid <> pg_backend_pid()");
      expect(left.rows[0]!.n).toBe(0);
    });

    it('the lock is per (shop, target): two different shops pushing at once never wait on each other, and a foreign shop cannot name our lock key', async () => {
      const w = await makeWorld('pg');
      const sA = Array.from({ length: 50 }, (_, i) => w.row(100 + i, { amount: 1000 }));
      const sB = Array.from({ length: 50 }, (_, i) => w.row(200 + i, { amount: 1000 }));
      await w.a.entries(sA);
      await w.b.entries(sB);
      const t0 = Date.now();
      const [ra, rb] = await Promise.all([w.a.entries(sA.map((s, i) => w.cancelOf(s, 300 + i))), w.b.entries(sB.map((s, i) => w.cancelOf(s, 400 + i)))]);
      expect(ra.body.entriesInserted).toBe(50);
      expect(rb.body.entriesInserted).toBe(50);
      expect(Date.now() - t0).toBeLessThan(5000);
      // B naming A's targets cancels nothing of A's and takes none of A's locks (the key carries B's session shop)
      const attack = await w.b.entries(sA.map((s, i) => w.cancelOf(s, 500 + i)));
      expect(attack.body.entriesInserted).toBe(0);
    });

    it('LOCK TABLE: concurrent maximum-size pushes that each lock ~1000 targets do not exhaust shared lock memory and fail OTHER shops', async () => {
      const w = await makeWorld('pg');
      const locks = await pool!.query("SELECT current_setting('max_locks_per_transaction')::int AS l, current_setting('max_connections')::int AS c");
      console.log('[retest pg] max_locks_per_transaction=%s max_connections=%s', locks.rows[0]!.l, locks.rows[0]!.c);
      const PUSHES = 10;
      const PER = 900;
      const targets: Record<string, any>[][] = [];
      for (let p = 0; p < PUSHES; p += 1) {
        const rows = Array.from({ length: PER }, (_, i) => w.row(100_000 + p * 1000 + i, { amount: 100 }));
        for (let k = 0; k < rows.length; k += 300) await w.repo.appendEntries(w.a.shopId, rows.slice(k, k + 300).map(src));
        targets.push(rows);
      }
      const bodies = targets.map((rows, p) => rows.map((s, i) => w.correction(500_000 + p * 1000 + i, s)));
      const victimSale = w.row(900_001, { amount: 100 });
      const results = await Promise.all([
        ...bodies.map((b) => w.a.entries(b)),
        (async () => { await new Promise((r) => setTimeout(r, 150)); return w.b.entries([victimSale]); })(),
      ]);
      const attackers = results.slice(0, PUSHES);
      const victim = results[PUSHES]!;
      const bad = attackers.filter((r) => r.status !== 200).map((r) => r.status + ':' + JSON.stringify(r.body).slice(0, 120));
      console.log('[retest pg] attacker statuses:', JSON.stringify(attackers.map((r) => r.status)), bad.slice(0, 2).join(' | '));
      console.log('[retest pg] victim shop status:', victim.status, victim.body.entriesInserted);
      expect(victim.status).toBe(200);
      expect(victim.body.entriesInserted).toBe(1);
      for (const r of attackers) expect(r.status).toBe(200);
    }, 240_000);
  });
}
