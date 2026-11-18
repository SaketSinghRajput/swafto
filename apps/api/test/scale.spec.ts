/**
 * WAVE 3 · SCALE (C-12, C-15, BE-15). Every case here fails without its fix.
 *
 *  - the closed-day fold memo: exact against the reference fold, never stale,
 *    never stored for an open day, expired by TTL, evicted on erasure
 *    and redaction, bounded;
 *  - the per-shop request ceilings on sync push and the read routes;
 *  - the in-memory repository's shop index (what makes a load run measure the API
 *    rather than a scan of every shop's rows).
 */
import { describe, it, expect } from 'vitest';
import { buildApp, type AppDeps } from '../src/app.ts';
import { testDeps } from './_deps.ts';
import { memoryRepo } from '../src/db/memory.ts';
import type { Repo } from '../src/db/port.ts';
import { ClosedDayMemo, memoFor } from '../src/db/closed-day-memo.ts';
import { dayInputFor, priorBalances } from '../src/read/routes.ts';
import { ShopLimiter, DEFAULT_SHOP_LIMITS } from '../src/sync/shop-limit.ts';
import { mintToken } from '../src/auth/tokens.ts';
import { creditOutstanding, supplierOutstanding, type Entry, type IsoDate } from '@swafto/formula-engine';

const KEY = 'test-signing-key-at-least-32-chars!!';
const T0 = '2026-09-19T08:00:00.000Z';
const SHOP = '11111111-1111-4111-8111-111111111111';
const OTHER = '55555555-5555-4555-8555-555555555555';
const USER = '22222222-2222-4222-8222-222222222222';
const USER2 = '66666666-6666-4666-8666-666666666666';
const DEVICE = '33333333-3333-4333-8333-333333333333';
const DEVICE2 = '77777777-7777-4777-8777-777777777777';
const PARTY = '88888888-8888-4888-8888-888888888888';
const uuid = (n: number) => '44444444-4444-4444-8444-' + String(n).padStart(12, '0');
const date = (d: number): IsoDate => ('2026-08-' + String(d).padStart(2, '0')) as IsoDate;

let counter = 1000;
const udhar = (day: IsoDate, amount: number): Entry =>
  ({ id: uuid((counter += 1)), dayId: day, section: 'udhar_sales', amount, mode: 'udhar', partyId: PARTY, source: 'manual', createdAt: day + 'T09:00:00.000Z' }) as Entry;
const collection = (day: IsoDate, amount: number): Entry =>
  ({ id: uuid((counter += 1)), dayId: day, section: 'udhar_collection', amount, mode: 'cash', partyId: PARTY, source: 'manual', createdAt: day + 'T10:00:00.000Z' }) as Entry;
const credPurchase = (day: IsoDate, amount: number): Entry =>
  ({ id: uuid((counter += 1)), dayId: day, section: 'purchase', amount, mode: 'udhar', source: 'manual', createdAt: day + 'T11:00:00.000Z' }) as Entry;

const openDay = (shopId: string, d: IsoDate) =>
  ({ shopId, date: d, state: 'open', openingCash: 0, countedCash: null, differenceReason: null, closedAt: null, startsAt: '00:00', createdAt: T0 }) as const;

async function newShop(repo: Repo, shopId = SHOP, userId = USER, phone = '+919876500001') {
  await repo.createShopAndUser({ shopId, userId, phone, shopName: 'Scale', language: 'en', now: T0 });
  await repo.upsertParty(shopId, { id: PARTY, kind: 'customer', name: 'Asha' } as never).catch(() => undefined);
}

/** A day with entries, optionally closed afterwards (entries first: a closed day refuses them). */
async function day(repo: Repo, shopId: string, d: IsoDate, entries: Entry[], close: boolean) {
  await repo.upsertDay(openDay(shopId, d));
  for (const e of entries) await repo.appendEntry(shopId, e);
  if (close) await repo.upsertDay({ ...openDay(shopId, d), state: 'closed', countedCash: 0, closedAt: T0 });
}

/** The ORIGINAL fold, written out independently: every earlier entry, day by day, through the engine. */
async function reference(repo: Repo, shopId: string, upTo: IsoDate) {
  const earlier = await repo.entriesBefore(shopId, upTo);
  let credit = 0;
  let supplier = 0;
  for (const d of [...new Set(earlier.map((e) => e.dayId))].sort()) {
    const partial = { day: { date: d, state: 'closed', openingCash: 0, countedCash: null }, entries: earlier.filter((e) => e.dayId === d), priorCreditOutstanding: credit, priorSupplierOutstanding: supplier } as never;
    credit = creditOutstanding(partial).value;
    supplier = supplierOutstanding(partial).value;
  }
  return { credit, supplier };
}

/** A repo that counts ledger loads: the whole ledger, and single days. Own object, so it gets its own memo. */
function counting(repo: Repo) {
  const calls = { entriesBefore: 0, entriesFor: [] as string[] };
  const wrapped: Repo = {
    ...repo,
    entriesBefore: async (s, d) => ((calls.entriesBefore += 1), repo.entriesBefore(s, d)),
    entriesFor: async (s, d) => (calls.entriesFor.push(d), repo.entriesFor(s, d)),
  };
  return { wrapped, calls };
}

/** Eight closed days (credit, collections, supplier credit) and one OPEN earlier day, then "today". */
async function history(repo: Repo, shopId = SHOP) {
  for (let d = 1; d <= 8; d += 1) {
    await day(repo, shopId, date(d), [udhar(date(d), 1000 * d), collection(date(d), 300 * d), credPurchase(date(d), 70 * d)], true);
  }
  await day(repo, shopId, date(9), [udhar(date(9), 4321)], false); // an earlier day nobody closed
  await day(repo, shopId, date(10), [udhar(date(10), 99)], true);
}

describe('C-12 · the closed-day memo', () => {
  it('a WARM read does not load the ledger, a cold one does exactly once (fails without the memo: every read loads it)', async () => {
    const repo = memoryRepo();
    await newShop(repo);
    await history(repo);
    const { wrapped, calls } = counting(repo);

    await dayInputFor(wrapped, SHOP, date(12));
    expect(calls.entriesBefore).toBe(1);
    const memo = memoFor(wrapped);
    // Every closed day was stored; the open one (day 9) was not.
    expect(memo.size(SHOP)).toBe(9);

    await dayInputFor(wrapped, SHOP, date(12));
    // Warm: the ledger is NOT loaded again. Day 9 is open so it is recomputed - from ITS entries only.
    expect(calls.entriesBefore).toBe(1);
    expect(calls.entriesFor.filter((d) => d !== date(12))).toEqual([date(9)]);
  });

  it('a day closed since the last read costs that one day, not the ledger', async () => {
    const repo = memoryRepo();
    await newShop(repo);
    await history(repo);
    const { wrapped, calls } = counting(repo);
    await dayInputFor(wrapped, SHOP, date(14));
    await dayInputFor(wrapped, SHOP, date(14));
    const loadsBefore = calls.entriesBefore;
    calls.entriesFor.length = 0;
    await day(repo, SHOP, date(11), [udhar(date(11), 250)], true); // closed since
    const got = await priorBalances(wrapped, SHOP, date(14));
    expect(got).toEqual(await reference(repo, SHOP, date(14)));
    expect(calls.entriesBefore).toBe(loadsBefore);
    expect(calls.entriesFor).toEqual([date(9), date(11)]); // the open day, and the newly closed one
  });

  it('a warm shop that misses many days falls back to ONE bulk load, with the right answer', async () => {
    const repo = memoryRepo();
    await newShop(repo);
    await day(repo, SHOP, date(1), [udhar(date(1), 10)], true);
    for (let d = 2; d <= 7; d += 1) await day(repo, SHOP, date(d), [udhar(date(d), 10 * d)], false); // six open days
    const { wrapped, calls } = counting(repo);
    await priorBalances(wrapped, SHOP, date(9)); // cold: one bulk load
    expect(calls.entriesBefore).toBe(1);
    calls.entriesFor.length = 0;
    const got = await priorBalances(wrapped, SHOP, date(9));
    expect(got).toEqual(await reference(repo, SHOP, date(9)));
    expect(calls.entriesFor).toEqual([date(2), date(3), date(4)]); // three single loads, then...
    expect(calls.entriesBefore).toBe(2); // ...one bulk load for the rest, never one per day
  });

  it('with every earlier day closed, a warm read loads no entries at all', async () => {
    const repo = memoryRepo();
    await newShop(repo);
    for (let d = 1; d <= 6; d += 1) await day(repo, SHOP, date(d), [udhar(date(d), 500 * d)], true);
    const { wrapped, calls } = counting(repo);
    await dayInputFor(wrapped, SHOP, date(8));
    await dayInputFor(wrapped, SHOP, date(8));
    await dayInputFor(wrapped, SHOP, date(8));
    expect(calls.entriesBefore).toBe(1);
    // ...and no single-day loads either, apart from today's own entries on each of the three reads.
    expect(calls.entriesFor).toEqual([date(8), date(8), date(8)]);
  });

  it('is exactly the reference fold, cold and warm, across closed and open earlier days', async () => {
    const repo = memoryRepo();
    await newShop(repo);
    await history(repo);
    const want = await reference(repo, SHOP, date(12));
    expect(want.credit).toBeGreaterThan(0);
    const cold = await priorBalances(repo, SHOP, date(12));
    const warm = await priorBalances(repo, SHOP, date(12));
    expect(cold).toEqual(want);
    expect(warm).toEqual(want);
    // And for every other `date` the same chain serves: a prefix of the memoised days.
    for (const upTo of [date(3), date(6), date(10), date(11)]) {
      expect(await priorBalances(repo, SHOP, upTo)).toEqual(await reference(repo, SHOP, upTo));
    }
  });

  it('never goes stale: a backdated entry on an earlier OPEN day moves every later balance', async () => {
    const repo = memoryRepo();
    await newShop(repo);
    await history(repo);
    const before = await priorBalances(repo, SHOP, date(12));
    await repo.appendEntry(SHOP, udhar(date(9), 777_00)); // day 9 is still open
    const after = await priorBalances(repo, SHOP, date(12));
    expect(after.credit).toBe(before.credit + 777_00);
    expect(after).toEqual(await reference(repo, SHOP, date(12)));
  });

  it('never stores an open day: what is added to it is seen on the next read', async () => {
    const repo = memoryRepo();
    await newShop(repo);
    await day(repo, SHOP, date(1), [udhar(date(1), 100)], false);
    const a = await priorBalances(repo, SHOP, date(3));
    expect(memoFor(repo).size(SHOP)).toBe(0);
    await repo.appendEntry(SHOP, udhar(date(1), 50));
    const b = await priorBalances(repo, SHOP, date(3));
    expect(b.credit).toBe(a.credit + 50);
  });

  it('a backdated NEW day slotted between closed days is folded in, not skipped', async () => {
    const repo = memoryRepo();
    await newShop(repo);
    await day(repo, SHOP, date(1), [udhar(date(1), 100)], true);
    await day(repo, SHOP, date(5), [udhar(date(5), 100)], true);
    await priorBalances(repo, SHOP, date(8));
    await day(repo, SHOP, date(3), [udhar(date(3), 40)], false);
    const got = await priorBalances(repo, SHOP, date(8));
    expect(got.credit).toBe(240);
    expect(got).toEqual(await reference(repo, SHOP, date(8)));
  });

  it('an erasure while a read is in flight is not undone by that read (RT-W3-5)', async () => {
    const repo = memoryRepo();
    await newShop(repo);
    for (let d = 1; d <= 3; d += 1) await day(repo, SHOP, date(d), [udhar(date(d), 100)], true);
    const memo = memoFor(repo);
    // A read that began before the erasure: it captured the count, then the shop is purged, then it fills.
    const since = memo.erasures;
    await repo.purgeShop(SHOP, T0);
    memo.set(SHOP, date(1), 0, 0, { credit: 100, supplier: 0 }, since);
    expect(memo.size(SHOP)).toBe(0);
    // A read that began after it fills normally.
    memo.set(SHOP, date(1), 0, 0, { credit: 100, supplier: 0 }, memo.erasures);
    expect(memo.size(SHOP)).toBe(1);
  });

  it('a shop not read within the TTL is dropped by the next get or set, whatever shop it is (erased shops leave the API process)', () => {
    let t = 0;
    const memo = new ClosedDayMemo({ ttlMs: 1000, now: () => t });
    memo.set('erased-by-the-job', 'd1', 0, 0, { credit: 1, supplier: 0 });
    t = 500;
    memo.set('busy', 'd1', 0, 0, { credit: 2, supplier: 0 });
    expect(memo.size('erased-by-the-job')).toBe(1);
    t = 1200;
    expect(memo.get('busy', 'd1', 0, 0)).toEqual({ credit: 2, supplier: 0 }); // read 700 ms ago: kept, and refreshed
    expect(memo.size('erased-by-the-job')).toBe(0); // unread for 1200 ms: gone
    t = 1900;
    memo.get('busy', 'd1', 0, 0);
    expect(memo.size('busy')).toBe(1);
    t = 3200;
    memo.set('other', 'd1', 0, 0, { credit: 3, supplier: 0 });
    expect(memo.size('busy')).toBe(0);
  });

  it('falls back to the full fold when an entry sits on a day the day list did not name', async () => {
    const repo = memoryRepo();
    await newShop(repo);
    await day(repo, SHOP, date(1), [udhar(date(1), 100)], true);
    await day(repo, SHOP, date(2), [udhar(date(2), 60)], true);
    const blind: Repo = { ...repo, daysBefore: async (s, d) => (await repo.daysBefore(s, d)).filter((x) => x.date !== date(2)) };
    expect(await priorBalances(blind, SHOP, date(4))).toEqual(await reference(repo, SHOP, date(4)));
  });

  it('redaction and erasure evict the shop (fails without the eviction wrapper)', async () => {
    const repo = memoryRepo();
    await newShop(repo);
    await newShop(repo, OTHER, USER2, '+919876500002');
    // (the party belongs to SHOP, so the other shop's days carry a party-less credit purchase)
    for (const s of [SHOP, OTHER]) for (let d = 1; d <= 3; d += 1) await day(repo, s, date(d), [s === SHOP ? udhar(date(d), 100) : credPurchase(date(d), 100)], true);
    await priorBalances(repo, SHOP, date(5));
    await priorBalances(repo, OTHER, date(5));
    const memo = memoFor(repo);
    expect(memo.size(SHOP)).toBe(3);

    await repo.redactParty(SHOP, PARTY);
    expect(memo.size(SHOP)).toBe(0);
    expect(memo.size(OTHER)).toBe(3); // nobody else's

    await priorBalances(repo, SHOP, date(5));
    expect(memo.size(SHOP)).toBe(3);
    await repo.purgeShop(SHOP, T0);
    expect(memo.size(SHOP)).toBe(0);
    expect(await priorBalances(repo, SHOP, date(5))).toEqual({ credit: 0, supplier: 0 });
  });

  it('is bounded: shops are an LRU and each shop holds a capped number of steps', () => {
    const memo = new ClosedDayMemo({ maxShops: 2, maxStepsPerShop: 3 });
    for (let i = 0; i < 5; i += 1) memo.set('a', 'd' + i, i, 0, { credit: i, supplier: 0 });
    expect(memo.size('a')).toBe(3);
    expect(memo.get('a', 'd0', 0, 0)).toBeUndefined(); // oldest step went
    expect(memo.get('a', 'd4', 4, 0)).toEqual({ credit: 4, supplier: 0 });
    memo.set('b', 'x', 0, 0, { credit: 1, supplier: 1 });
    memo.get('a', 'd4', 4, 0); // touch a: b is now the least recent
    memo.set('c', 'x', 0, 0, { credit: 2, supplier: 2 });
    expect(memo.shopCount()).toBe(2);
    expect(memo.size('b')).toBe(0);
    expect(memo.size('a')).toBe(3);
  });

  it('is bounded overall too: past maxTotalSteps the least recently read shop goes, never the one being written', () => {
    const memo = new ClosedDayMemo({ maxTotalSteps: 5 });
    for (let i = 0; i < 3; i += 1) memo.set('old', 'd' + i, i, 0, { credit: i, supplier: 0 });
    for (let i = 0; i < 3; i += 1) memo.set('new', 'd' + i, i, 0, { credit: i, supplier: 0 });
    expect(memo.size('old')).toBe(0);
    expect(memo.size('new')).toBe(3);
    expect(memo.size()).toBe(3);
    // One shop alone may exceed nothing it was not given, and eviction accounting stays exact.
    memo.evictShop('new');
    expect(memo.size()).toBe(0);
  });

  it('a shop with more days than the per-shop cap still gets the right answer (slowly, not wrongly)', async () => {
    const repo = memoryRepo();
    await newShop(repo);
    for (let d = 1; d <= 6; d += 1) await day(repo, SHOP, date(d), [udhar(date(d), 100 * d)], true);
    const tiny = new ClosedDayMemo({ maxStepsPerShop: 2 });
    for (let k = 0; k < 3; k += 1) {
      expect(await priorBalances(repo, SHOP, date(9), { memo: tiny })).toEqual(await reference(repo, SHOP, date(9)));
    }
  });

  it('two repositories that reuse a shop id do not read each other\'s steps', async () => {
    const one = memoryRepo();
    const two = memoryRepo();
    for (const r of [one, two]) await newShop(r);
    await day(one, SHOP, date(1), [udhar(date(1), 100)], true);
    await day(two, SHOP, date(1), [udhar(date(1), 5000)], true);
    expect((await priorBalances(one, SHOP, date(3))).credit).toBe(100);
    expect((await priorBalances(two, SHOP, date(3))).credit).toBe(5000);
  });
});

describe('C-12 · daysBefore', () => {
  it('lists this shop\'s days strictly before the date, oldest first, with state, and nobody else\'s', async () => {
    const repo = memoryRepo();
    await newShop(repo);
    await newShop(repo, OTHER, USER2, '+919876500002');
    await day(repo, SHOP, date(3), [udhar(date(3), 1)], true);
    await day(repo, SHOP, date(1), [], false);
    await day(repo, OTHER, date(2), [], false);
    await day(repo, SHOP, date(6), [], false);
    expect(await repo.daysBefore(SHOP, date(6))).toEqual([
      { date: date(1), state: 'open' },
      { date: date(3), state: 'closed' },
    ]);
    expect(await repo.daysBefore(SHOP, date(1))).toEqual([]);
  });
});

describe('C-15 · the in-memory repository answers from a per-shop index', () => {
  it('entriesBefore / entriesFor / latestStartsAt agree across shops, events and a purge', async () => {
    const repo = memoryRepo();
    await newShop(repo);
    await newShop(repo, OTHER, USER2, '+919876500002');
    await repo.upsertDay({ ...openDay(SHOP, date(1)), startsAt: '04:00' });
    await repo.upsertDay({ ...openDay(SHOP, date(2)), startsAt: '05:30' });
    await repo.upsertDay({ ...openDay(OTHER, date(9)), startsAt: '02:00' });
    const a = udhar(date(1), 10);
    const b = udhar(date(2), 20);
    await repo.appendEntry(SHOP, b);
    await repo.appendEntry(SHOP, a);
    await repo.appendEvent(SHOP, [{ ...udhar(date(2), 30) }]);
    // Days ascending (as Postgres orders them), insertion order within a day, only this shop.
    expect((await repo.entriesBefore(SHOP, date(3))).map((e) => e.amount)).toEqual([10, 20, 30]);
    expect((await repo.entriesFor(SHOP, date(2))).map((e) => e.amount)).toEqual([20, 30]);
    expect(await repo.entriesBefore(OTHER, date(3))).toEqual([]);
    expect(await repo.latestStartsAt(SHOP)).toBe('05:30');
    expect(await repo.latestStartsAt(OTHER)).toBe('02:00');
    expect(await repo.latestStartsAt('99999999-9999-4999-8999-999999999999')).toBeNull();
    // A refused event leaves nothing behind in the index.
    await expect(repo.appendEvent(SHOP, [udhar(date(2), 1), { ...udhar(date(2), 1), partyId: 'not-a-party-of-this-shop' } as Entry])).rejects.toThrow();
    expect((await repo.entriesFor(SHOP, date(2))).map((e) => e.amount)).toEqual([20, 30]);
    await repo.purgeShop(SHOP, T0);
    expect(await repo.entriesBefore(SHOP, date(9))).toEqual([]);
    expect(await repo.latestStartsAt(SHOP)).toBeNull();
  });
});

/* ═══════════════════════════ BE-15 · per-shop limits ═══════════════════════════ */

describe('BE-15 · ShopLimiter', () => {
  it('allows a burst, then refuses with a Retry-After, then refills with time', () => {
    let t = 0;
    const l = new ShopLimiter({ burst: 3, refillPerSecond: 1 }, { now: () => t });
    expect([1, 2, 3].map(() => l.take('s').allowed)).toEqual([true, true, true]);
    const denied = l.take('s');
    expect(denied).toEqual({ allowed: false, retryAfterSeconds: 1 });
    t = 500;
    expect(l.take('s').allowed).toBe(false);
    t = 1000;
    expect(l.take('s').allowed).toBe(true);
    t = 10_000_000; // a long gap refills to the burst and no further
    expect([1, 2, 3, 4].map(() => l.take('s').allowed)).toEqual([true, true, true, false]);
  });

  it('is per shop, and its memory is bounded', () => {
    let t = 0;
    const l = new ShopLimiter({ burst: 1, refillPerSecond: 0.001 }, { now: () => t, maxShops: 2 });
    expect(l.take('a').allowed).toBe(true);
    expect(l.take('a').allowed).toBe(false);
    expect(l.take('b').allowed).toBe(true); // another shop is untouched
    expect(l.take('c').allowed).toBe(true); // evicts the least recent (a): a fresh bucket, never a lock-out
    expect(l.take('a').allowed).toBe(true);
  });

  it('refuses a nonsense spec instead of silently allowing everything', () => {
    expect(() => new ShopLimiter({ burst: 0, refillPerSecond: 1 })).toThrow();
    expect(() => new ShopLimiter({ burst: 1, refillPerSecond: 0 })).toThrow();
  });

  it('the shipped defaults sit far above what the app does and far below a loop', () => {
    expect(DEFAULT_SHOP_LIMITS.push.refillPerSecond * 60).toBeGreaterThanOrEqual(60);
    expect(DEFAULT_SHOP_LIMITS.push.burst).toBeGreaterThanOrEqual(10);
    expect(DEFAULT_SHOP_LIMITS.read.refillPerSecond * 60).toBeLessThanOrEqual(600);
  });
});

async function server(extra: Partial<AppDeps>) {
  const repo = memoryRepo();
  const mk = async (shopId: string, userId: string, device: string, phone: string) => {
    await repo.createShopAndUser({ shopId, userId, phone, shopName: 'S', language: 'en', now: T0 });
    await repo.registerDevice({ id: device, userId, shopId, platform: 'android', createdAt: T0, lastSeenAt: null, revokedAt: null });
    return mintToken(KEY, { sub: userId, shop: shopId, dev: device, typ: 'access', nowSeconds: Math.floor(Date.parse(T0) / 1000), ttlSeconds: 86_400 });
  };
  const a = await mk(SHOP, USER, DEVICE, '+919876500001');
  const b = await mk(OTHER, USER2, DEVICE2, '+919876500002');
  const app = buildApp(testDeps({ repo, ...extra }));
  return { app, a, b };
}

const push = (app: ReturnType<typeof buildApp>, token: string) =>
  app.inject({ method: 'POST', url: '/v1/sync/push', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, payload: '{}' });
const read = (app: ReturnType<typeof buildApp>, token: string, url = '/v1/alerts') =>
  app.inject({ method: 'GET', url, headers: { authorization: 'Bearer ' + token } });

describe('BE-15 · the ceilings on the routes', () => {
  it('refuses a push past the burst with 429, Retry-After and a body the client reads (fails without the hook)', async () => {
    const { app, a, b } = await server({ shopLimits: { push: { burst: 3, refillPerSecond: 0.001 } } });
    for (let i = 0; i < 3; i += 1) expect((await push(app, a)).statusCode).toBe(200);
    const res = await push(app, a);
    expect(res.statusCode).toBe(429);
    expect(Number(res.headers['retry-after'])).toBeGreaterThanOrEqual(1);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('rate_limited');
    expect(body.retryAfterSeconds).toBe(Number(res.headers['retry-after']));
    // Another shop is not slowed by it.
    expect((await push(app, b)).statusCode).toBe(200);
  });

  it('refuses reads past the burst, on every read route that folds the ledger', async () => {
    const { app, a } = await server({ shopLimits: { read: { burst: 2, refillPerSecond: 0.001 } } });
    expect((await read(app, a, '/v1/alerts')).statusCode).toBe(200);
    expect((await read(app, a, '/v1/parties/outstanding')).statusCode).toBe(200);
    for (const url of ['/v1/alerts', '/v1/parties/outstanding', '/v1/days/2026-09-19/summary', '/v1/reports']) {
      expect((await read(app, a, url)).statusCode, url).toBe(429);
    }
  });

  it('a stranger is still 401, not 429: authentication runs first and the bucket is never spent on it', async () => {
    const { app } = await server({ shopLimits: { push: { burst: 1, refillPerSecond: 0.001 } } });
    for (let i = 0; i < 3; i += 1) {
      const res = await app.inject({ method: 'POST', url: '/v1/sync/push', headers: { 'content-type': 'application/json' }, payload: '{}' });
      expect(res.statusCode).toBe(401);
    }
  });

  it('`false` switches a ceiling off; the shipped defaults let ordinary use through', async () => {
    const off = await server({ shopLimits: { push: false, read: false } });
    for (let i = 0; i < 40; i += 1) expect((await push(off.app, off.a)).statusCode).toBe(200);
    const on = await server({});
    for (let i = 0; i < DEFAULT_SHOP_LIMITS.push.burst; i += 1) expect((await push(on.app, on.a)).statusCode).toBe(200);
  });
});
