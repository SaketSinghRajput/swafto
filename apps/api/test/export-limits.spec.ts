/**
 * RT-W3-1 · `GET /v1/me/export` reads a whole ledger on demand, so it is the one authenticated route
 * a single user could use to stall the API for every tenant (40 concurrent exports of a 100,000-entry
 * shop blocked the event loop for 5.3 s). Three guards, each proved here: a per-shop bucket, a
 * per-process concurrency cap, and JSON built in slices that hand the event loop back.
 */
import { describe, it, expect } from 'vitest';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { buildApp } from '../src/app.ts';
import { testDeps } from './_deps.ts';
import { memoryRepo } from '../src/db/memory.ts';
import type { Repo } from '../src/db/port.ts';
import { mintToken } from '../src/auth/tokens.ts';
import { chunkedJson } from '../src/read/chunked-json.ts';
import type { Entry, IsoDate } from '@swafto/formula-engine';

const KEY = 'test-signing-key-at-least-32-chars!!';
const T0 = '2026-09-19T08:00:00.000Z';
const DAY = '2026-09-19' as IsoDate;
const uid = (n: number) => '44444444-4444-4444-8444-' + String(n).padStart(12, '0');
const shopId = (n: number) => '11111111-1111-4111-8111-' + String(n).padStart(12, '0');
const userId = (n: number) => '22222222-2222-4222-8222-' + String(n).padStart(12, '0');
const deviceId = (n: number) => '33333333-3333-4333-8333-' + String(n).padStart(12, '0');
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function world(shops: number, entriesPerShop: number, wrap: (r: Repo) => Repo = (r) => r) {
  const base = memoryRepo();
  let e = 0;
  const tokens: string[] = [];
  for (let s = 1; s <= shops; s += 1) {
    await base.createShopAndUser({ shopId: shopId(s), userId: userId(s), phone: '+9198765' + String(10000 + s), shopName: 'S' + s, language: 'en', now: T0 });
    await base.registerDevice({ id: deviceId(s), userId: userId(s), shopId: shopId(s), platform: 'android', createdAt: T0, lastSeenAt: null, revokedAt: null });
    await base.upsertDay({ shopId: shopId(s), date: DAY, state: 'open', openingCash: 0, countedCash: null, differenceReason: null, closedAt: null, startsAt: '00:00', createdAt: T0 });
    for (let i = 0; i < entriesPerShop; i += 1) {
      await base.appendEntry(shopId(s), { id: uid((e += 1)), dayId: DAY, section: 'cash_sales', amount: 100 + i, mode: 'cash', createdAt: T0, source: 'manual' } as Entry);
    }
    tokens.push(mintToken(KEY, { sub: userId(s), shop: shopId(s), dev: deviceId(s), typ: 'access', nowSeconds: Math.floor(Date.parse(T0) / 1000), ttlSeconds: 86_400 }));
  }
  const app = buildApp(testDeps({ repo: wrap(base) }));
  const exp = (i: number) => app.inject({ method: 'GET', url: '/v1/me/export', headers: { authorization: 'Bearer ' + tokens[i]! } });
  return { app, exp };
}

describe('chunkedJson', () => {
  it('is byte-for-byte JSON.stringify, including undefined, null, nested arrays, toJSON and unicode', async () => {
    const big = Array.from({ length: 11 }, (_, i) => ({ i, s: 'ଓଡ଼ିଆ "q" \n', u: undefined, n: null, d: new Date(0), nested: [1, [2, undefined], { a: [] }] }));
    const value = { a: big, b: { c: [], d: [undefined, () => 1, 'x'], e: undefined }, f: 'ok', g: 3.5, h: [[], [[]], big.slice(0, 3)] };
    for (const slice of [1, 3, 5, 2000]) expect(await chunkedJson(value, slice), 'slice ' + slice).toBe(JSON.stringify(value));
    expect(await chunkedJson(null)).toBe('null');
    expect(await chunkedJson(undefined)).toBe('null');
  });

  it('keeps the event loop free: the longest stall is under half of one plain stringify of the same ledger (fails without the slicing)', async () => {
    const rows = Array.from({ length: 100_000 }, (_, i) => ({ id: uid(i), dayId: DAY, section: 'cash_sales', amount: 12345, mode: 'cash', createdAt: T0, source: 'manual' }));
    const worst = async (work: () => Promise<unknown>) => {
      const h = monitorEventLoopDelay({ resolution: 1 });
      h.enable();
      await sleep(30);
      await work();
      await sleep(30);
      h.disable();
      return h.max / 1e6;
    };
    const plain = await worst(async () => JSON.stringify({ data: { entries: rows } }));
    const sliced = await worst(() => chunkedJson({ data: { entries: rows } }));
    console.log(`[RT-W3-1] 100,000 entries: longest event-loop stall plain stringify ${plain.toFixed(0)} ms, chunked ${sliced.toFixed(0)} ms`);
    expect(sliced).toBeLessThan(plain / 2);
  });
});

describe('GET /v1/me/export guards', () => {
  it('12 back-to-back exports by one shop: the bucket (2 at once, then 1 per 10 s) answers 429 + Retry-After from the 3rd', async () => {
    const { exp } = await world(1, 3);
    const statuses: number[] = [];
    let retryAfter = '';
    for (let i = 0; i < 12; i += 1) {
      const res = await exp(0);
      statuses.push(res.statusCode);
      if (res.statusCode === 429) retryAfter = String(res.headers['retry-after']);
    }
    expect(statuses).toEqual([200, 200, ...Array(10).fill(429)]);
    expect(Number(retryAfter)).toBeGreaterThanOrEqual(1);
  });

  it('a body the export returns is the same JSON as before, with its download header', async () => {
    const { exp } = await world(1, 3);
    const res = await exp(0);
    expect(res.headers['content-disposition']).toContain('swafto-my-data.json');
    expect(res.headers['content-type']).toContain('application/json');
    const body = JSON.parse(res.body);
    expect(body.data.entries).toHaveLength(3);
    expect(typeof body.notice).toBe('string');
  });

  it('no more than 2 run at once per process: the third is told to come back, and nothing is left held (fails without the cap)', async () => {
    const release: (() => void)[] = [];
    const { exp } = await world(4, 1, (r) => ({
      ...r,
      exportUser: (u: string) => new Promise((resolve) => release.push(() => resolve(r.exportUser(u)))),
    }) as Repo);
    const a = exp(0);
    const b = exp(1);
    await sleep(50);
    const c = await exp(2);
    expect(c.statusCode).toBe(503);
    expect(c.headers['retry-after']).toBeDefined();
    release.forEach((r) => r());
    expect((await a).statusCode).toBe(200);
    expect((await b).statusCode).toBe(200);
    // The counter came back down: a later export is served.
    const later = exp(3);
    await sleep(20);
    release.slice(2).forEach((r) => r());
    expect((await later).statusCode).toBe(200);
  });

  it('40 concurrent exports (40 shops, 100,000 entries between them) leave the event loop responsive: measured', async () => {
    const { exp } = await world(40, 2500);
    const h = monitorEventLoopDelay({ resolution: 1 });
    h.enable();
    await sleep(30);
    const results = await Promise.all(Array.from({ length: 40 }, (_, i) => exp(i)));
    await sleep(30);
    h.disable();
    const maxMs = h.max / 1e6;
    const ok = results.filter((r) => r.statusCode === 200).length;
    const busy = results.filter((r) => r.statusCode === 503).length;
    console.log(`[RT-W3-1] 40 concurrent exports: ${ok} served, ${busy} told to retry, longest event-loop stall ${maxMs.toFixed(0)} ms (red team measured 5300 ms unguarded)`);
    expect(ok + busy).toBe(40);
    expect(ok).toBeGreaterThanOrEqual(1);
    expect(maxMs).toBeLessThan(500);
  }, 60_000);
});
