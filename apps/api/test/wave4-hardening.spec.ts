/**
 * WAVE 4 RED-TEAM FIXES, each pinned by a case that fails on the code before it.
 *
 *  RT-W4-1  a NUL byte (or any value Postgres refuses) is a 400, never a 500, and never a level-50 event
 *  RT-W4-5  client text is not echoed into the log through an error message
 *  RT-W4-6  redaction reaches five objects down
 *  RT-W4-8  the stub SMS port holds a bounded number of plaintext codes
 *  SIMPW4-04  the export and the party redaction draw on ONE per-shop `heavy` bucket
 */
import { describe, it, expect } from 'vitest';
import { buildApp, type AppDeps } from '../src/app.ts';
import { memoryRepo } from '../src/db/memory.ts';
import { mintToken } from '../src/auth/tokens.ts';
import { StubSmsPort } from '../src/sms/stub.ts';
import { NOTICE_VERSION } from '../src/dpdp/routes.ts';
import { KEY, T0, testDeps } from './_deps.ts';

const SHOP = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const DEVICE = '33333333-3333-4333-8333-333333333333';
const PARTY = '44444444-4444-4444-8444-444444444444';
const PHONE = '+919876500091';
const JSON_H = { 'content-type': 'application/json' };

type Line = Record<string, unknown> & { level: number; msg?: string };

async function server(over: Partial<AppDeps> = {}) {
  const written: string[] = [];
  const repo = over.repo ?? memoryRepo();
  await repo.createShopAndUser({ shopId: SHOP, userId: USER, phone: PHONE, shopName: 'S', language: 'en', now: T0 });
  await repo.registerDevice({ id: DEVICE, userId: USER, shopId: SHOP, platform: 'android', createdAt: T0, lastSeenAt: null, revokedAt: null });
  const token = mintToken(KEY, { sub: USER, shop: SHOP, dev: DEVICE, typ: 'access', nowSeconds: Math.floor(Date.parse(T0) / 1000), ttlSeconds: 86_400 });
  const app = buildApp(testDeps({ repo, logStream: { write: (c: string) => void written.push(c) }, ...over }));
  const lines = (): Line[] => written.join('').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Line);
  const authed = (method: 'GET' | 'POST', url: string, payload?: unknown) =>
    app.inject({
      method,
      url,
      headers: { ...JSON_H, authorization: 'Bearer ' + token },
      ...(payload === undefined ? { payload: method === 'POST' ? '{}' : undefined } : { payload: JSON.stringify(payload) }),
    } as never);
  return { app, written, lines, authed };
}

describe('RT-W4-1 · input the database cannot store is a 400, and a client cannot make level-50 events', () => {
  it('50 renames carrying a NUL byte: all 400 from validation, zero level-50 lines', async () => {
    const s = await server();
    for (let i = 0; i < 50; i += 1) {
      const res = await s.authed('POST', '/v1/me/shop', { name: '\u0000' });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('invalid_input');
    }
    expect(s.lines().filter((l) => l.level >= 50)).toHaveLength(0);
  });

  it('verify with a NUL shopName and a VALID code is a 400 and does not burn the code', async () => {
    const sms = new StubSmsPort();
    const app = buildApp(testDeps({ sms }));
    await app.inject({ method: 'POST', url: '/v1/auth/otp/request', headers: JSON_H, payload: JSON.stringify({ phone: PHONE, language: 'en' }) });
    const code = sms.forPhone(PHONE).at(-1)!.variables[0]!;
    const verify = (shopName: string) =>
      app.inject({
        method: 'POST',
        url: '/v1/auth/otp/verify',
        headers: JSON_H,
        payload: JSON.stringify({ phone: PHONE, code, device: { platform: 'android' }, shopName, consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' } }),
      });
    expect((await verify('A\u0000B')).statusCode).toBe(400);
    expect((await verify('A shop')).statusCode).toBe(200); // the same code still works
  });

  it('any other class-22 database refusal is a 400 with no driver text and no level-50 line', async () => {
    const driver = Object.assign(new Error('invalid byte sequence for encoding "UTF8": 0x00'), { code: '22021' });
    const repo = { ...memoryRepo(), renameShop: () => Promise.reject(driver) };
    const s = await server({ repo });
    const res = await s.authed('POST', '/v1/me/shop', { name: 'fine' });
    expect(res.statusCode).toBe(400);
    expect(res.body).not.toContain('UTF8');
    expect(res.body).not.toContain('22021');
    const lines = s.lines();
    expect(lines.filter((l) => l.level >= 50)).toHaveLength(0);
    expect(lines.filter((l) => l.level === 40)).toHaveLength(1);
  });

  it('sync push keeps its per-row contract: a poisoned row is a 200 with a rejection, not a 400', async () => {
    const driver = Object.assign(new Error('invalid byte sequence for encoding "UTF8": 0x00'), { code: '22021' });
    const repo = { ...memoryRepo(), upsertParty: () => Promise.reject(driver) };
    const s = await server({ repo });
    const res = await s.authed('POST', '/v1/sync/push', { parties: [{ id: PARTY, kind: 'customer', name: 'x\u0000y' }] });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).rejected).toHaveLength(1);
    expect(s.lines().filter((l) => l.level >= 50)).toHaveLength(0);
  });
});

describe('RT-W4-5 · what the caller typed does not come back through an error message', () => {
  const SENTINEL = 'phone-9876577777';

  it('the sync warn line carries the shape of a driver error, not the quoted input', async () => {
    const driver = Object.assign(new Error('invalid input syntax for type uuid: "' + SENTINEL + '"'), { code: '22P02' });
    const repo = { ...memoryRepo(), upsertParty: () => Promise.reject(driver) };
    const s = await server({ repo });
    const res = await s.authed('POST', '/v1/sync/push', { parties: [{ id: PARTY, kind: 'customer', name: 'x' }] });
    expect(res.statusCode).toBe(200);
    const warn = s.lines().find((l) => l.msg === 'sync rows failed');
    expect(warn, 'the end-of-push warn line exists').toBeDefined();
    expect(String(warn!.first)).toContain('invalid input syntax for type uuid');
    expect(s.written.join('')).not.toContain(SENTINEL);
  });

  it('a 5xx event keeps the failure and drops the value after the first colon, in message and in stack', async () => {
    const boom = () => Promise.reject(new TypeError('Not an ISO date (YYYY-MM-DD): ' + SENTINEL + ' and "' + SENTINEL + '"'));
    const s = await server({ rate: { consumeAll: boom } });
    const res = await s.app.inject({ method: 'POST', url: '/v1/auth/otp/request', headers: JSON_H, payload: JSON.stringify({ phone: PHONE, language: 'en' }) });
    expect(res.statusCode).toBe(500);
    const event = s.lines().find((l) => l.level === 50)!;
    expect((event.err as { message: string }).message).toBe('Not an ISO date (YYYY-MM-DD)');
    expect(s.written.join('')).not.toContain(SENTINEL);
  });
});

describe('RT-W4-6 · redaction depth', () => {
  it('a secret five objects down is censored; the limit is stated, not hidden', async () => {
    const s = await server({ logLevel: 'info' }); // the default is warn, which would not write the probe at all
    s.app.log.info({ a: { b: { c: { d: { phone: '+919811111111' } } } } }, 'five down');
    expect(s.written.join('')).toContain('five down');
    expect(s.written.join('')).not.toContain('9811111111');
  });
});

describe('RT-W4-8 · the stub SMS port is bounded', () => {
  it('keeps only the newest N sends, plaintext codes included', async () => {
    const sms = new StubSmsPort(3);
    for (let i = 1; i <= 5; i += 1) {
      await sms.send({ phone: PHONE, templateId: 'otp_signin', variables: [String(100000 + i)], languageTag: 'en' });
    }
    expect(sms.all()).toHaveLength(3);
    expect(sms.all().map((s) => s.variables[0])).toEqual(['100003', '100004', '100005']);
    expect(sms.last()?.variables[0]).toBe('100005');
  });
});

describe('SIMPW4-04 · one `heavy` bucket per shop', () => {
  it('two exports spend the budget and the party redaction is then limited too', async () => {
    const s = await server({ shopLimits: { heavy: { burst: 2, refillPerSecond: 0.001 } } });
    expect((await s.authed('GET', '/v1/me/export')).statusCode).toBe(200);
    expect((await s.authed('GET', '/v1/me/export')).statusCode).toBe(200);
    const redact = await s.authed('POST', '/v1/parties/' + PARTY + '/redact');
    expect(redact.statusCode, 'redact shares the export bucket').toBe(429);
  });

  it('...and a shop that has spent nothing can still redact (the bucket is per shop, not global)', async () => {
    const s = await server({ shopLimits: { heavy: { burst: 2, refillPerSecond: 0.001 } } });
    expect((await s.authed('POST', '/v1/parties/' + PARTY + '/redact')).statusCode).toBe(404); // not found, not limited
  });
});
