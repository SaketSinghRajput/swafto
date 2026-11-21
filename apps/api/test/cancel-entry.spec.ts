/**
 * CANCEL THIS ENTRY · the API half (docs/design/CANCEL-ENTRY-GATE.md).
 *
 * Route level, in memory: the push accepts a cancel row and validates it with the engine's own rule, replays
 * it idempotently, and every read path (reports, outstanding credit) leaves the cancelled pair out.
 * Repository level, in memory AND Postgres (its own schema): the same append, replay, double-cancel,
 * cross-shop and closed-day refusals, so the memory twin is not measuring a different contract.
 * Each test fails without the change it names; the refusal codes are the contract with the mobile half.
 */
import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.ts';
import { memoryRepo } from '../src/db/memory.ts';
import { pgRepo } from '../src/db/postgres.ts';
import { WriteRefused, type Repo } from '../src/db/port.ts';
import { mintToken } from '../src/auth/tokens.ts';
import { migrationUp, allMigrationsUp, allMigrationsDown } from '@swafto/schema';
import type { Entry, IsoDate } from '@swafto/formula-engine';
import { testDeps, KEY, T0 } from './_deps.ts';

const DAY = '2026-09-19' as IsoDate;
const CLOSED = '2026-09-18' as IsoDate;
const SHOP = '11111111-1111-4111-8111-111111111111';
const OTHER_SHOP = '55555555-5555-4555-8555-555555555555';
const USER = '22222222-2222-4222-8222-222222222222';
const DEVICE = '33333333-3333-4333-8333-333333333333';
const PARTY = '88888888-8888-4888-8888-888888888888';
const SUPPLIER = '99999999-9999-4999-8999-999999999999';
const uuid = (n: number) => '44444444-4444-4444-8444-' + String(n).padStart(12, '0');

const row = (n: number, over: Record<string, unknown> = {}) => ({
  id: uuid(n),
  dayId: DAY,
  section: 'cash_sales',
  amount: 50000,
  mode: 'cash',
  createdAt: T0,
  ...over,
});
const cancelOf = (target: ReturnType<typeof row>, n: number, over: Record<string, unknown> = {}) => ({
  ...target,
  id: uuid(n),
  cancelsEntryId: target.id,
  ...over,
});

async function world() {
  const repo = memoryRepo();
  for (const [shopId, userId, phone] of [
    [SHOP, USER, '+919876500001'],
    [OTHER_SHOP, '22222222-2222-4222-8222-222222222223', '+919876500002'],
  ] as const) {
    await repo.createShopAndUser({ shopId, userId, phone, shopName: 'S', language: 'en', now: T0 });
    for (const date of [DAY, CLOSED]) {
      await repo.upsertDay({ shopId, date, state: 'open', openingCash: 0, countedCash: null, differenceReason: null, closedAt: null, startsAt: '00:00', createdAt: T0 });
    }
  }
  await repo.upsertParty(SHOP, { id: PARTY, kind: 'customer', name: 'Ramesh' });
  await repo.upsertParty(SHOP, { id: SUPPLIER, kind: 'supplier', name: 'Wholesaler' });
  await repo.registerDevice({ id: DEVICE, userId: USER, shopId: SHOP, platform: 'android', createdAt: T0, lastSeenAt: T0, revokedAt: null });
  const app = buildApp(testDeps({ repo, shopLimits: { push: false, read: false } }));
  const token = mintToken(KEY, { sub: USER, shop: SHOP, dev: DEVICE, typ: 'access', nowSeconds: Math.floor(Date.parse(T0) / 1000), ttlSeconds: 86_400 });
  const headers = { 'content-type': 'application/json', authorization: 'Bearer ' + token };
  const push = async (entries: unknown[]) => {
    const res = await app.inject({ method: 'POST', url: '/v1/sync/push', headers, payload: JSON.stringify({ entries }) });
    return { status: res.statusCode, body: JSON.parse(res.body) as { entriesInserted: number; entriesAlreadyPresent: number; rejected: { id: string; field: string; message: string }[]; message?: string } };
  };
  const get = async (url: string) => JSON.parse((await app.inject({ method: 'GET', url, headers })).body) as Record<string, number>;
  return { repo, app, push, get };
}

describe('push: a cancel row', () => {
  it('lands beside its target, and replaying it is alreadyPresent (idempotent)', async () => {
    const w = await world();
    const sale = row(1);
    const first = await w.push([sale, cancelOf(sale, 2)]);
    expect(first.body).toMatchObject({ entriesInserted: 2, entriesAlreadyPresent: 0, rejected: [] });
    const replay = await w.push([sale, cancelOf(sale, 2)]);
    expect(replay.body).toMatchObject({ entriesInserted: 0, entriesAlreadyPresent: 2, rejected: [] });
    expect((await w.repo.entriesFor(SHOP, DAY)).filter((e) => e.cancelsEntryId === sale.id)).toHaveLength(1);
  });

  it('a cancel pushed LATER, on its own, finds the target on the server', async () => {
    const w = await world();
    const sale = row(1);
    await w.push([sale]);
    expect((await w.push([cancelOf(sale, 2)])).body).toMatchObject({ entriesInserted: 1, rejected: [] });
  });

  it('a SECOND cancel with a different id is refused: already_cancelled', async () => {
    const w = await world();
    const sale = row(1);
    await w.push([sale, cancelOf(sale, 2)]);
    const second = await w.push([cancelOf(sale, 3)]);
    expect(second.body.rejected).toEqual([expect.objectContaining({ id: uuid(3), field: 'already_cancelled' })]);
    // and two different cancels pushed together: the first stands, the second is refused
    const sale2 = row(10);
    const both = await w.push([sale2, cancelOf(sale2, 11), cancelOf(sale2, 12)]);
    expect(both.body.rejected.map((r) => r.field)).toEqual(['already_cancelled']);
  });

  it('a cancel of a cancel is refused: cancel_of_cancel', async () => {
    const w = await world();
    const sale = row(1);
    const cancel = cancelOf(sale, 2);
    await w.push([sale, cancel]);
    const res = await w.push([cancelOf(cancel, 3)]);
    expect(res.body.rejected).toEqual([expect.objectContaining({ id: uuid(3), field: 'cancel_of_cancel' })]);
  });

  it('an entry with a return linked to it is refused: has_linked_entries (the app says "cancel the return first")', async () => {
    const w = await world();
    const sale = row(1, { amount: 100000 });
    const ret = row(2, { section: 'sales_return', amount: 40000, mode: 'other', refersToEntryId: sale.id });
    await w.push([sale, ret]);
    const res = await w.push([cancelOf(sale, 3)]);
    expect(res.body.rejected).toEqual([expect.objectContaining({ id: uuid(3), field: 'has_linked_entries' })]);
    // the same thing when the return rides in the SAME push as the cancel
    const sale2 = row(10, { amount: 100000 });
    const together = await w.push([sale2, row(11, { section: 'sales_return', amount: 1000, mode: 'other', refersToEntryId: sale2.id }), cancelOf(sale2, 12)]);
    expect(together.body.rejected.map((r) => r.field)).toContain('has_linked_entries');
  });

  it('an event leg is refused: cancel_event_leg', async () => {
    const w = await world();
    const sale = row(1, { amount: 100000 });
    const ret = row(2, { section: 'sales_return', amount: 40000, mode: 'other', refersToEntryId: sale.id });
    await w.push([sale, ret]);
    const res = await w.push([cancelOf(ret as ReturnType<typeof row>, 3, { refersToEntryId: undefined })]);
    // a cancel row cannot be a return leg (a leg must point at its return, a cancel must not): refused whole
    expect(res.body.rejected).toEqual([expect.objectContaining({ id: uuid(3), field: 'refersToEntryId' })]);
  });

  it("another shop's entry is refused as missing: cancel_target_missing, and nothing is written", async () => {
    const w = await world();
    const theirs = row(1);
    await w.repo.appendEntry(OTHER_SHOP, theirs as unknown as Entry);
    const res = await w.push([cancelOf(theirs, 2)]);
    expect(res.body.rejected).toEqual([expect.objectContaining({ id: uuid(2), field: 'cancel_target_missing' })]);
    expect(await w.repo.entryCancelling(OTHER_SHOP, theirs.id)).toBeNull();
  });

  it('a cancel of a CLOSED day is refused (D7), and the day is untouched', async () => {
    const w = await world();
    const old = row(1, { dayId: CLOSED });
    await w.push([old]);
    await w.repo.upsertDay({ shopId: SHOP, date: CLOSED, state: 'closed', openingCash: 0, countedCash: 50000, differenceReason: null, closedAt: T0, startsAt: '00:00', createdAt: T0 });
    const res = await w.push([cancelOf(old, 2)]);
    expect(res.body.rejected).toHaveLength(1);
    expect(res.body.rejected[0]!.id).toBe(uuid(2));
    expect((await w.repo.entriesFor(SHOP, CLOSED)).map((e) => e.id)).toEqual([old.id]);
  });

  it('a cancel on another day, or not an exact copy, is refused; a float amount is a 400', async () => {
    const w = await world();
    const sale = row(1);
    await w.push([sale]);
    const otherDay = await w.push([cancelOf(sale, 2, { dayId: CLOSED })]);
    expect(otherDay.body.rejected[0]!.field).toBe('cancel_other_day');
    const changed = await w.push([cancelOf(sale, 3, { amount: 49999 })]);
    expect(changed.body.rejected[0]!.field).toBe('cancel_mismatch');
    const float = await w.push([cancelOf(sale, 4, { amount: 500.5 })]);
    expect(float.status).toBe(400);
    const asCorrection = await w.push([cancelOf(sale, 5, { correctsDayId: CLOSED })]);
    expect(asCorrection.body.rejected[0]!.field).toBe('cancel_mismatch');
  });
});

describe('nothing links to a cancelled entry (RT-C1, RT-C3), and order inside a push does not matter (RT-C4)', () => {
  it('a return, a refund and a correction against a cancelled sale or its cancel row are refused: target_cancelled', async () => {
    const w = await world();
    const sale = row(1, { amount: 100000 });
    const cancel = cancelOf(sale, 2);
    await w.push([sale, cancel]);
    const ret = (n: number, to: string) => row(n, { section: 'sales_return', amount: 1000, mode: 'other', refersToEntryId: to });
    const corr = (n: number, to: string) => row(n, { dayId: CLOSED, amount: 500, correctsDayId: DAY, refersToEntryId: to });
    for (const r of [ret(3, sale.id), ret(4, cancel.id), corr(5, sale.id), corr(6, cancel.id)]) {
      const res = await w.push([r]);
      expect(res.body.rejected, JSON.stringify(r.id)).toEqual([expect.objectContaining({ id: r.id, field: 'target_cancelled' })]);
    }
  });

  it('a cancel listed BEFORE its target in one push lands, and the replay is alreadyPresent', async () => {
    const w = await world();
    const sale = row(1);
    const first = await w.push([cancelOf(sale, 2), sale]);
    expect(first.body).toMatchObject({ entriesInserted: 2, rejected: [] });
    expect((await w.get('/v1/reports?from=' + DAY + '&to=' + DAY)).netSales).toBe(0);
    expect((await w.push([cancelOf(sale, 2), sale])).body).toMatchObject({ entriesInserted: 0, entriesAlreadyPresent: 2 });
  });

  it('a return and a cancel of one sale pushed together: the return stands, the cancel is has_linked_entries', async () => {
    const w = await world();
    const sale = row(1, { amount: 100000 });
    const ret = row(2, { section: 'sales_return', amount: 1000, mode: 'other', refersToEntryId: sale.id });
    const res = await w.push([sale, ret, cancelOf(sale, 3)]);
    expect(res.body.rejected.map((r) => r.field)).toEqual(['has_linked_entries']);
  });

  it('the store itself refuses what the route would: a cancel on another day, of a cancel, and a link to a cancelled entry', async () => {
    const w = await world();
    const sale = row(1);
    const cancel = cancelOf(sale, 2);
    await w.repo.appendEntries(SHOP, [sale, cancel].map((e) => ({ ...e, source: 'manual' })) as unknown as Entry[]);
    const code = async (e: Record<string, unknown>) => {
      const [o] = await w.repo.appendEntries(SHOP, [{ ...e, source: 'manual' } as unknown as Entry]);
      return (o as { error?: WriteRefused }).error?.constraintName;
    };
    expect(await code(cancelOf(row(10), 11, { dayId: CLOSED }))).toBeDefined();
    expect(await code(cancelOf(cancel, 12))).toBe('cancel_of_cancel');
    expect(await code(row(13, { section: 'sales_return', amount: 1, mode: 'other', refersToEntryId: sale.id }))).toBe('target_cancelled');
  });
});

describe('a party of the wrong KIND is refused: party_kind_mismatch', () => {
  it('a customer on a supplier payment or a purchase, and a supplier on a sale, collection or return, are refused; the right kind lands', async () => {
    const w = await world();
    const wrong = [
      row(1, { section: 'party_payment', mode: 'cash', partyId: PARTY }),
      row(2, { section: 'purchase', mode: 'udhar', partyId: PARTY }),
      row(3, { section: 'purchase', mode: 'cash', partyId: PARTY }),
      row(4, { section: 'udhar_sales', mode: 'udhar', partyId: SUPPLIER }),
      row(5, { section: 'udhar_collection', mode: 'cash', partyId: SUPPLIER }),
    ];
    const res = await w.push(wrong);
    expect(res.body.entriesInserted).toBe(0);
    expect(res.body.rejected.map((r) => r.field)).toEqual(Array(5).fill('party_kind_mismatch'));
    const right = await w.push([
      row(10, { section: 'party_payment', mode: 'cash', partyId: SUPPLIER }),
      row(11, { section: 'purchase', mode: 'udhar', partyId: SUPPLIER }),
      row(12, { section: 'udhar_sales', mode: 'udhar', partyId: PARTY }),
      row(13, { section: 'udhar_collection', mode: 'cash', partyId: PARTY }),
    ]);
    expect(right.body).toMatchObject({ entriesInserted: 4, rejected: [] });
  });

  it('an event leg naming a supplier is refused whole (no half an exchange)', async () => {
    const w = await world();
    const sale = row(1, { amount: 100000 });
    await w.push([sale]);
    const ret = row(2, { section: 'sales_return', amount: 40000, mode: 'other', refersToEntryId: sale.id, partyId: SUPPLIER });
    const res = await w.push([ret]);
    expect(res.body.entriesInserted).toBe(0);
    expect(res.body.rejected[0]!.field).toBe('party_kind_mismatch');
  });
});

describe('read paths leave the cancelled pair out', () => {
  it('reports: net sales exclude the cancelled sale and its cancel row', async () => {
    const w = await world();
    const keep = row(1, { amount: 50000 });
    const mistake = row(2, { amount: 30000 });
    await w.push([keep, mistake, cancelOf(mistake, 3)]);
    const rep = await w.get('/v1/reports?from=' + DAY + '&to=' + DAY);
    expect(rep.netSales).toBe(50000);
  });

  it('outstanding credit excludes a cancelled credit sale, and keeps an ordinary one', async () => {
    const w = await world();
    const owed = row(1, { section: 'udhar_sales', mode: 'udhar', amount: 70000, partyId: PARTY });
    const mistake = row(2, { section: 'udhar_sales', mode: 'udhar', amount: 20000, partyId: PARTY });
    await w.push([owed, mistake, cancelOf(mistake, 3)]);
    const out = await w.get('/v1/parties/outstanding?asOf=' + DAY);
    expect(out.creditOutstanding).toBe(70000);
  });

  it('the credit fold across days excludes a pair too (a later day sees the prior balance without it)', async () => {
    const w = await world();
    const owed = row(1, { dayId: CLOSED, section: 'udhar_sales', mode: 'udhar', amount: 70000, partyId: PARTY });
    const mistake = row(2, { dayId: CLOSED, section: 'udhar_sales', mode: 'udhar', amount: 20000, partyId: PARTY });
    await w.push([owed, mistake, cancelOf(mistake, 3)]);
    const out = await w.get('/v1/parties/outstanding?asOf=' + DAY);
    expect(out.creditOutstanding).toBe(70000);
  });
});

/* ---- the repository contract, on both engines ---- */
const URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55432/swafto_test';
let client: { query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>; end(): Promise<void> } | null = null;
let reachable = false;
try {
  const mod = (await import('pg')) as unknown as Record<string, unknown>;
  const pg = (mod.default ?? mod) as { Client: new (o: unknown) => NonNullable<typeof client> };
  const c = new pg.Client({ connectionString: URL, connectionTimeoutMillis: 4000 });
  await (c as unknown as { connect(): Promise<void> }).connect();
  await c.query('DROP SCHEMA IF EXISTS cancel_api CASCADE');
  await c.query('CREATE SCHEMA cancel_api');
  await c.query('SET search_path TO cancel_api');
  for (const s of allMigrationsUp('postgres')) await c.query(s);
  client = c;
  reachable = true;
} catch (e) {
  console.error('[cancel-entry] no Postgres:', (e as Error).message);
}
void migrationUp;
void allMigrationsDown;

function contract(label: string, make: () => Repo, enabled: () => boolean, seedN: string) {
  const maybe = () => (enabled() ? it : it.skip);
  const e = (n: number, over: Partial<Entry> = {}): Entry =>
    ({ id: uuid(n + Number(seedN) * 100), dayId: DAY, section: 'cash_sales', amount: 50000, mode: 'cash', source: 'manual', createdAt: T0, ...over }) as Entry;
  const shops = async (repo: Repo, a: string, b: string) => {
    for (const [shopId, phone] of [[a, '+9198765' + a.slice(-5)], [b, '+9198765' + b.slice(-5)]] as const) {
      await repo.createShopAndUser({ shopId, userId: shopId.replace(/^1/, '2'), phone, shopName: 'S', language: 'en', now: T0 });
      for (const date of [DAY, CLOSED]) {
        await repo.upsertDay({ shopId, date, state: 'open', openingCash: 0, countedCash: null, differenceReason: null, closedAt: null, startsAt: '00:00', createdAt: T0 });
      }
    }
  };
  describe('cancel rows · repository contract · ' + label, () => {
    maybe()('stores the pair, replays idempotently, finds the cancel by its target, refuses a second', async () => {
      const repo = make();
      const a = '11111111-1111-4111-8111-0000000' + seedN + '0001';
      const b = '11111111-1111-4111-8111-0000000' + seedN + '0002';
      await shops(repo, a, b);
      const sale = e(1);
      const cancel = e(2, { cancelsEntryId: sale.id });
      const out = await repo.appendEntries(a, [sale, cancel]);
      expect(out).toEqual([{ inserted: true }, { inserted: true }]);
      expect(await repo.appendEntries(a, [sale, cancel])).toEqual([{ inserted: false }, { inserted: false }]);
      expect((await repo.entryCancelling(a, sale.id))?.id).toBe(cancel.id);
      expect(await repo.entryCancelling(a, cancel.id)).toBeNull();
      // the batched lookups a push uses (RT-C5): one call each, same answers, scoped to the shop
      expect((await repo.findEntries(a, [sale.id, cancel.id])).map((x) => x.id).sort()).toEqual([sale.id, cancel.id].sort());
      expect((await repo.findEntries(b, [sale.id])).length).toBe(0);
      expect((await repo.entriesCancellingAny(a, [sale.id, cancel.id])).map((x) => x.id)).toEqual([cancel.id]);
      expect(await repo.entriesReferringToAny(a, [sale.id])).toEqual([]);
      const second = await repo.appendEntries(a, [e(3, { cancelsEntryId: sale.id })]);
      expect('error' in second[0]! && (second[0] as { error: unknown }).error).toBeInstanceOf(WriteRefused);
      expect(((second[0] as { error: WriteRefused }).error).constraintName).toBe('entries_cancel_once_uq');
    });

    maybe()('a row id replayed with a DIFFERENT cancel target is a content change (D1), not a replay', async () => {
      const repo = make();
      const a = '11111111-1111-4111-8111-0000000' + seedN + '0021';
      const b = '11111111-1111-4111-8111-0000000' + seedN + '0022';
      await shops(repo, a, b);
      const one = e(20);
      const two = e(21);
      const cancel = e(22, { cancelsEntryId: one.id });
      await repo.appendEntries(a, [one, two, cancel]);
      const changed = await repo.appendEntries(a, [{ ...cancel, cancelsEntryId: two.id }]);
      expect((changed[0] as { error: WriteRefused }).error.constraintName).toBe('entries_append_only');
      expect((await repo.entryCancelling(a, one.id))?.id).toBe(cancel.id);
    });

    maybe()("another shop's entry cannot be cancelled, and a cancel into a closed day is refused", async () => {
      const repo = make();
      const a = '11111111-1111-4111-8111-0000000' + seedN + '0011';
      const b = '11111111-1111-4111-8111-0000000' + seedN + '0012';
      await shops(repo, a, b);
      const theirs = e(10);
      await repo.appendEntry(b, theirs);
      const cross = await repo.appendEntries(a, [e(11, { cancelsEntryId: theirs.id })]);
      expect((cross[0] as { error: WriteRefused }).error.constraintName).toBe('entries_cancels_fk');
      expect(await repo.entryCancelling(b, theirs.id)).toBeNull();

      const old = e(12, { dayId: CLOSED });
      await repo.appendEntry(a, old);
      await repo.upsertDay({ shopId: a, date: CLOSED, state: 'closed', openingCash: 0, countedCash: 50000, differenceReason: null, closedAt: T0, startsAt: '00:00', createdAt: T0 });
      const late = await repo.appendEntries(a, [e(13, { dayId: CLOSED, cancelsEntryId: old.id })]);
      expect((late[0] as { error: WriteRefused }).error.constraintName).toBe('entries_closed_day');
    });
  });
}

contract('in memory', () => memoryRepo(), () => true, '1');
contract('in Postgres', () => pgRepo({ query: (sql, params) => client!.query(sql, params as unknown[]) }), () => reachable, '2');

/* ---- RT2-2: the per-target locks are taken in one sorted order, so reversed pushes cannot deadlock ---- */
describe('reversed-order pushes over the same targets (Postgres, separate connections)', () => {
  const maybe = () => (reachable ? it : it.skip);
  maybe()('two concurrent pushes naming the same 600 targets in opposite orders both complete: no deadlock, no 503', async () => {
    const mod = (await import('pg')) as unknown as Record<string, unknown>;
    const pg = (mod.default ?? mod) as { Client: new (o: unknown) => NonNullable<typeof client> & { connect(): Promise<void> } };
    const open = async () => {
      const c = new pg.Client({ connectionString: URL, connectionTimeoutMillis: 4000 });
      await c.connect();
      await c.query('SET search_path TO cancel_api');
      return c;
    };
    const repo = pgRepo({
      query: (sql, params) => client!.query(sql, params as unknown[]),
      reserve: async (fn) => {
        const c = await open();
        try {
          return await fn({ query: (sql, params) => c.query(sql, params as unknown[]) });
        } finally {
          await c.end().catch(() => undefined);
        }
      },
    });
    const shop = '11111111-1111-4111-8111-000000000777';
    await repo.createShopAndUser({ shopId: shop, userId: '22222222-2222-4222-8222-000000000777', phone: '+919876577777', shopName: 'S', language: 'en', now: T0 });
    await repo.upsertDay({ shopId: shop, date: DAY, state: 'open', openingCash: 0, countedCash: null, differenceReason: null, closedAt: null, startsAt: '00:00', createdAt: T0 });
    let failures = 0;
    for (let round = 0; round < 6; round += 1) {
      const sales = Array.from({ length: 600 }, (_, i) => ({ id: uuid(100_000 + round * 10_000 + i), dayId: DAY, section: 'cash_sales', amount: 1000, mode: 'cash', source: 'manual', createdAt: T0 }) as Entry);
      await repo.appendEntries(shop, sales);
      const cancels = (ids: Entry[], base: number) => ids.map((e, i) => ({ ...e, id: uuid(base + i), cancelsEntryId: e.id }) as Entry);
      const forward = cancels(sales, 2_000_000 + round * 10_000);
      const backward = cancels([...sales].reverse(), 3_000_000 + round * 10_000);
      const settled = await Promise.allSettled([repo.appendEntries(shop, forward), repo.appendEntries(shop, backward)]);
      failures += settled.filter((r) => r.status === 'rejected').length;
    }
    expect(failures, 'a rejected push here is a deadlock (40P01, served as a retryable 503)').toBe(0);
  }, 60_000);
});
