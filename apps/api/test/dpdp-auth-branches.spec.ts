/**
 * THE REFUSALS THAT THE HAPPY-PATH SUITES NEVER MEET - DPDP and auth routes.
 *
 * Each case is a real way the route can be asked wrongly, or a defence that exists for the day
 * something upstream changes: a handler that must fail closed if the authentication hook is ever
 * removed, an export that must not run three at a time, a deletion code that verifies for an
 * account that has just gone, a device that does not belong to the token's shop.
 */
import Fastify from 'fastify';
import { describe, it, expect } from 'vitest';
import { buildApp, type AppDeps } from '../src/app.ts';
import { testDeps } from './_deps.ts';
import { memoryRepo } from '../src/db/memory.ts';
import { registerAuthRoutes } from '../src/auth/routes.ts';
import { registerDpdpRoutes, NOTICE_VERSION } from '../src/dpdp/routes.ts';
import { OTP_LIMITS } from '../src/rate-limit/limits.ts';
import { StubSmsPort } from '../src/sms/stub.ts';
import { mintToken } from '../src/auth/tokens.ts';
import type { Repo } from '../src/db/port.ts';

const KEY = 'test-signing-key-at-least-32-chars!!';
const T0 = '2026-09-19T08:00:00.000Z';
const NOW_S = Math.floor(Date.parse(T0) / 1000);
const JSON_H = { 'content-type': 'application/json' };

function deps(over: Partial<AppDeps> = {}) {
  const sms = new StubSmsPort();
  const repo = memoryRepo();
  const d: AppDeps = testDeps({
    repo,
    sms,
    shopLimits: { push: false, read: false, heavy: false },
    ...over,
  });
  return { d, sms, repo: d.repo as ReturnType<typeof memoryRepo> };
}

async function signedIn(over: Partial<AppDeps> = {}, phone = '+919876500091') {
  const { d, sms, repo } = deps(over);
  const app = buildApp(d);
  await app.inject({ method: 'POST', url: '/v1/auth/otp/request', headers: JSON_H, payload: JSON.stringify({ phone, language: 'en' }) });
  const code = sms.forPhone(phone).at(-1)!.variables[0]!;
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/otp/verify',
    headers: JSON_H,
    payload: JSON.stringify({ phone, code, device: { platform: 'android' }, shopName: 'K', consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' } }),
  });
  const s = JSON.parse(res.body) as { accessToken: string; refreshToken: string; deviceId: string; shopId: string };
  const call = (method: 'GET' | 'POST', url: string, payload?: unknown) =>
    app.inject({
      method,
      url,
      headers: { authorization: 'Bearer ' + s.accessToken, ...(method === 'POST' ? JSON_H : {}) },
      ...(method === 'POST' ? { payload: JSON.stringify(payload ?? {}) } : {}),
    });
  return { app, d, sms, repo, s, call, phone };
}

describe('handlers fail closed if the authentication hook is ever lost', () => {
  it('every account route answers 401 with no session, and changes nothing', async () => {
    const { d, repo } = deps();
    let wrote = 0;
    const spy: Repo = {
      ...repo,
      recordConsent: async (...a) => { wrote += 1; return repo.recordConsent(...a); },
      requestDeletion: async (...a) => { wrote += 1; return repo.requestDeletion(...a); },
      cancelDeletion: async (...a) => { wrote += 1; return repo.cancelDeletion(...a); },
    };
    // A bare server with the routes and NO hooks: exactly the world in which a refactor dropped the guard.
    const bare = Fastify();
    registerDpdpRoutes(bare, { ...d, repo: spy });
    const hit = async (method: 'GET' | 'POST', url: string, payload?: unknown) =>
      bare.inject({ method, url, ...(payload ? { headers: JSON_H, payload: JSON.stringify(payload) } : method === 'POST' ? { headers: JSON_H, payload: '{}' } : {}) });

    for (const [method, url, payload] of [
      ['POST', '/v1/me/consent', { purpose: 'sms_reminders', granted: true }],
      ['GET', '/v1/me/consents'],
      ['GET', '/v1/me/export'],
      ['POST', '/v1/me/erase', { confirm: 'DELETE' }],
      ['POST', '/v1/me/erase/cancel'],
    ] as const) {
      const res = await hit(method, url, payload);
      expect(res.statusCode, method + ' ' + url).toBe(401);
      expect(JSON.parse(res.body).error).toBe('unauthenticated');
    }
    expect(wrote, 'nothing was written on behalf of nobody').toBe(0);
  });

  it('shopOf throws rather than guessing when there are no claims', async () => {
    const { d } = deps();
    const bare = Fastify();
    registerAuthRoutes(bare, d);
    const res = await bare.inject({ method: 'GET', url: '/v1/devices' });
    expect(res.statusCode).toBe(500); // an error, never somebody's data
  });
});

describe('GET /v1/me/export · bounded and honest', () => {
  it('at most two exports run at once: the third is a 503 with Retry-After, and the first two still finish', async () => {
    let entered = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const { repo } = deps();
    const slow: Repo = { ...repo, exportUser: async (...a) => { entered += 1; await gate; return repo.exportUser(...a); } };
    const { app, s } = await signedIn({ repo: slow });
    const get = () => app.inject({ method: 'GET', url: '/v1/me/export', headers: { authorization: 'Bearer ' + s.accessToken } });

    const one = get();
    const two = get();
    while (entered < 2) await new Promise((r) => setTimeout(r, 1));
    const three = await get();
    expect(three.statusCode).toBe(503);
    expect(three.headers['retry-after']).toBeDefined();
    expect(JSON.parse(three.body)).toMatchObject({ error: 'unavailable' });

    release();
    expect([(await one).statusCode, (await two).statusCode]).toEqual([200, 200]);
    // The slot is released: a later export runs.
    expect((await get()).statusCode).toBe(200);
  });

  it('a user the repository no longer knows is a 404, not an empty file', async () => {
    const { repo } = deps();
    const gone: Repo = { ...repo, exportUser: async () => null };
    const { app, s } = await signedIn({ repo: gone });
    const res = await app.inject({ method: 'GET', url: '/v1/me/export', headers: { authorization: 'Bearer ' + s.accessToken } });
    expect(res.statusCode).toBe(404);
    // And the failed export did not leak its slot: more than two failures in a row still answer 404.
    for (let i = 0; i < 3; i += 1) {
      expect((await app.inject({ method: 'GET', url: '/v1/me/export', headers: { authorization: 'Bearer ' + s.accessToken } })).statusCode).toBe(404);
    }
  });
});

describe('web deletion · the refusals', () => {
  const request = (app: ReturnType<typeof buildApp>, phone: string) =>
    app.inject({ method: 'POST', url: '/v1/deletion/request', headers: JSON_H, payload: JSON.stringify({ phone, language: 'en' }) });
  const confirm = (app: ReturnType<typeof buildApp>, phone: string, code: string) =>
    app.inject({ method: 'POST', url: '/v1/deletion/confirm', headers: JSON_H, payload: JSON.stringify({ phone, code, confirm: 'DELETE' }) });

  it('a number that is not an Indian mobile is a 400 on both steps, saying nothing about membership', async () => {
    const { app } = await signedIn();
    for (const res of [await request(app, 'abcdefgh'), await confirm(app, 'abcdefgh', '123456')]) {
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBeDefined();
    }
  });

  it('a code that verifies for an account that has just gone is a 404', async () => {
    const { app, sms, repo, s, phone } = await signedIn();
    expect((await request(app, phone)).statusCode).toBe(202);
    const code = sms.forPhone(phone).at(-1)!.variables[0]!;
    await repo.purgeShop(s.shopId, T0); // the account goes away between the request and the confirmation
    const res = await confirm(app, phone, code);
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({ error: 'not_found' });
  });

  it('guessing across many numbers from one address is cut off with a 429 and a real Retry-After', async () => {
    const { app } = await signedIn();
    const guess = (i: number) =>
      app.inject({
        method: 'POST',
        url: '/v1/deletion/confirm',
        remoteAddress: '203.0.113.9',
        headers: JSON_H,
        payload: JSON.stringify({ phone: '+9198768' + String(10000 + i).padStart(5, '0'), code: '000000', confirm: 'DELETE' }),
      });
    const seen: number[] = [];
    let limited: Awaited<ReturnType<typeof guess>> | undefined;
    for (let i = 0; i < OTP_LIMITS.verifyPerIp.max + 3; i += 1) {
      const r = await guess(i);
      seen.push(r.statusCode);
      if (r.statusCode === 429 && !limited) limited = r;
    }
    expect(seen.slice(0, OTP_LIMITS.verifyPerIp.max).every((c) => c === 401)).toBe(true);
    expect(limited, JSON.stringify(seen)).toBeDefined();
    expect(Number(limited!.headers['retry-after'])).toBeGreaterThan(0);
    expect(JSON.parse(limited!.body).error).toBe('too_many_requests');
  });
});

describe('auth routes · the remaining refusals', () => {
  it('verify with a number that is not a mobile is a 400 before any code is looked at', async () => {
    const { app } = await signedIn();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/otp/verify',
      headers: JSON_H,
      payload: JSON.stringify({ phone: 'abcdefgh', code: '123456', device: { platform: 'android' } }),
    });
    expect(res.statusCode).toBe(400);
  });

  it('refresh: a token whose device belongs to another shop or user is refused and does not rotate', async () => {
    const { app, s, repo } = await signedIn();
    const forged = (over: { shop?: string; sub?: string }) =>
      mintToken(KEY, { sub: over.sub ?? 'someone-else', shop: over.shop ?? 'another-shop', dev: s.deviceId, typ: 'refresh', nowSeconds: NOW_S, ttlSeconds: 600, gen: 0 });
    for (const token of [forged({}), forged({ shop: s.shopId })]) {
      const res = await app.inject({ method: 'POST', url: '/v1/auth/refresh', headers: JSON_H, payload: JSON.stringify({ refreshToken: token }) });
      expect(res.statusCode).toBe(401);
    }
    // The real device was neither revoked nor advanced by the forgeries.
    expect((await repo.findDevice(s.deviceId))?.revokedAt).toBeNull();
    expect(await repo.rotateRefreshGen(s.shopId, s.deviceId, 0, T0)).toEqual({ kind: 'rotated', gen: 1 });
  });

  it('refresh: junk is a 401, not a 500', async () => {
    const { app } = await signedIn();
    for (const refreshToken of ['x', 'a.b', 'not-a-token-at-all']) {
      const res = await app.inject({ method: 'POST', url: '/v1/auth/refresh', headers: JSON_H, payload: JSON.stringify({ refreshToken }) });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body).error).toBe('unauthenticated');
    }
  });

  it('GET /v1/devices answers 501, not a guess, when the repository cannot list devices', async () => {
    const { repo } = deps();
    const noList = { ...repo, listDevices: undefined } as unknown as Repo;
    const { call } = await signedIn({ repo: noList });
    expect((await call('GET', '/v1/devices')).statusCode).toBe(501);
  });

  it("revoking another shop's device is a 404 (never a 403), and the device stays live", async () => {
    const a = await signedIn({}, '+919876500093');
    // A second shop on the SAME repository, so the id genuinely exists.
    const sms2 = a.sms;
    const app2 = buildApp({ ...a.d });
    await app2.inject({ method: 'POST', url: '/v1/auth/otp/request', headers: JSON_H, payload: JSON.stringify({ phone: '+919876500094', language: 'en' }) });
    const code = sms2.forPhone('+919876500094').at(-1)!.variables[0]!;
    const v = await app2.inject({
      method: 'POST', url: '/v1/auth/otp/verify', headers: JSON_H,
      payload: JSON.stringify({ phone: '+919876500094', code, device: { platform: 'android' }, consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' } }),
    });
    const other = JSON.parse(v.body) as { deviceId: string };
    const res = await a.call('POST', `/v1/auth/devices/${other.deviceId}/revoke`, {});
    expect(res.statusCode).toBe(404);
    expect((await a.repo.findDevice(other.deviceId))?.revokedAt).toBeNull();
    expect((await a.call('POST', `/v1/auth/devices/${'0aaaaaaa-0000-4000-8000-0000000000aa'}/revoke`, {})).statusCode).toBe(404);
  });

  it('renaming a shop that no longer exists is a 404', async () => {
    const { repo } = deps();
    const none: Repo = { ...repo, renameShop: async () => false };
    const { call } = await signedIn({ repo: none });
    expect((await call('POST', '/v1/me/shop', { name: 'New name' })).statusCode).toBe(404);
  });
});
