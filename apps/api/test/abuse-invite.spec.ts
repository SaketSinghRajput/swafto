/**
 * API ABUSE TESTS: the invite-mode auth surface and the demo login (docs/auth/INVITE-CODES.md).
 *
 * Every assertion states the SAFE behaviour. In memory, through the real routes (`app.inject`), synthetic
 * numbers only, no network. Nothing here is a load test.
 *
 * Covered: out-of-contract bodies (mass assignment of kind/purpose/shopId/mode, wrong types, arrays, nulls,
 * oversized), code shapes (length, spaces, dashes, unicode digits, leading zeros), phone formats, content-type
 * confusion, method tampering, the deletion route in invite mode, uniform errors with no leakage, and the
 * byte-identical invite-mode request reply.
 */
import { describe, it, expect } from 'vitest';
import { buildApp, type AppDeps } from '../src/app.ts';
import type { OtpKind } from '../src/auth/otp-store.ts';
import { hashOtp } from '../src/auth/tokens.ts';
import { INVITE_NEW_TTL_SECONDS, INVITE_RECOVERY_TTL_SECONDS } from '../src/admin/invite-store.ts';
import { NOTICE_VERSION } from '../src/dpdp/routes.ts';
import { StubSmsPort } from '../src/sms/stub.ts';
import { testDeps, KEY, T0 } from './_deps.ts';

const PHONE = '+919876500001';
const OTHER = '+919876500002';
const CODE = '48210937';
const DEMO_PHONE = '+919999900001';
const DEMO_CODE = '24681357';
const JSON_H = { 'content-type': 'application/json' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function harness(over: Partial<AppDeps> = {}) {
  const logLines: string[] = [];
  const sms = new StubSmsPort();
  const deps = testDeps({
    sms,
    authMode: 'invite',
    logLevel: 'info',
    logStream: { write: (c: string) => void logLines.push(c) },
    ...over,
  });
  const app = buildApp(deps);
  const send = (url: string, payload: string | undefined, headers: Record<string, string> = JSON_H, method: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH' = 'POST') =>
    app.inject({ method, url, headers, ...(payload === undefined ? {} : { payload }) });
  const post = (url: string, body: unknown) => send(url, JSON.stringify(body));
  const request = (body: unknown) => post('/v1/auth/otp/request', body);
  const verifyBody = (phone: unknown, code: unknown, extra: object = {}) => ({
    phone,
    code,
    device: { platform: 'android' },
    shopName: 'Invited Shop',
    consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' },
    ...extra,
  });
  const verify = (phone: unknown, code: unknown, extra: object = {}) => post('/v1/auth/otp/verify', verifyBody(phone, code, extra));
  const plant = (phone: string, code: string, kind: OtpKind = 'invite_new', ttl = INVITE_NEW_TTL_SECONDS) =>
    deps.otp.put(
      { phone, hash: hashOtp(KEY, phone, code), expiresAt: new Date(Date.parse(T0) + ttl * 1000).toISOString(), attempts: 0, createdAt: T0, kind },
      0,
    );
  const account = (phone: string, shopId = 's1', userId = 'u1') =>
    deps.repo.createShopAndUser({ shopId, userId, phone, shopName: 'S', language: 'en', now: T0 });
  return { deps, app, sms, send, post, request, verify, verifyBody, plant, account, logLines };
}

/** What an error body may contain, and what it must never. */
function expectCleanError(res: { statusCode: number; body: string; headers: Record<string, unknown> }, label: string) {
  expect(res.statusCode, label).toBeGreaterThanOrEqual(400);
  expect(res.statusCode, label).toBeLessThan(500);
  const j = JSON.parse(res.body) as Record<string, unknown>;
  expect(Object.keys(j).every((k) => ['error', 'message', 'requestId', 'retryAfterSeconds'].includes(k)), label + ' keys ' + Object.keys(j)).toBe(true);
  if (j.requestId !== undefined) expect(String(j.requestId), label).toMatch(UUID);
  for (const bad of [/\n\s+at /, /node_modules/, /\.ts:\d+/, /\.js:\d+/, /[A-Za-z]:\\/, /\/home\//, /postgres/i, /SELECT |INSERT |UPDATE /, /Error:/, /stack/i, /[0-9a-f]{64}/]) {
    expect(res.body, label + ' leaks ' + bad).not.toMatch(bad);
  }
}

const BAD_BODIES: ReadonlyArray<[string, unknown]> = [
  ['null body', null],
  ['array body', []],
  ['array of valid bodies', [{ phone: PHONE, language: 'en' }]],
  ['string body', 'phone'],
  ['number body', 7],
  ['true body', true],
  ['empty object', {}],
  ['phone number type', { phone: 9876500001, language: 'en' }],
  ['phone null', { phone: null, language: 'en' }],
  ['phone array', { phone: [PHONE], language: 'en' }],
  ['phone object', { phone: { $ne: '' }, language: 'en' }],
  ['phone boolean', { phone: true, language: 'en' }],
  ['language missing', { phone: PHONE }],
  ['language unknown', { phone: PHONE, language: 'fr' }],
  ['language array', { phone: PHONE, language: ['en'] }],
  ['language null', { phone: PHONE, language: null }],
  ['phone too short', { phone: '1234567', language: 'en' }],
  ['phone too long', { phone: '+91 98765 00001 0000', language: 'en' }],
  ['phone 1 MB', { phone: '9'.repeat(1_000_000), language: 'en' }],
  ['phone with NUL', { phone: PHONE + '\u0000', language: 'en' }],
  ['deviceId with symbols', { phone: PHONE, language: 'en', deviceId: "x'; DROP TABLE users;--" }],
  ['deviceId too long', { phone: PHONE, language: 'en', deviceId: 'a'.repeat(65) }],
  ['deviceId number', { phone: PHONE, language: 'en', deviceId: 123456789 }],
];

describe('request route in invite mode: out-of-contract bodies', () => {
  it.each(BAD_BODIES)('%s is a clean 4xx and changes nothing', async (label, body) => {
    const h = harness();
    await h.plant(OTHER, CODE);
    const before = JSON.stringify(await h.deps.otp.get(OTHER, T0));
    const res = await h.request(body);
    expect(res.statusCode, label).not.toBe(202);
    expectCleanError(res, label);
    expect(JSON.stringify(await h.deps.otp.get(OTHER, T0))).toBe(before);
    expect(h.sms.count()).toBe(0);
  });

  it.each(['kind', 'purpose', 'shopId', 'mode', 'authMode', 'role', 'userId', 'sent', 'digits', 'demo', 'paused', 'expiresAt', 'attempts', 'hash'])(
    'an extra field "%s" is refused with 400, never trusted, never stripped into a 202',
    async (field) => {
      const h = harness();
      const res = await h.request({ phone: PHONE, language: 'en', [field]: 'invite_recovery' });
      expect(res.statusCode).toBe(400);
      expectCleanError(res, field);
      expect(await h.deps.otp.get(PHONE, T0)).toBeNull();
    },
  );

  it('prototype-pollution keys are refused and do not reach Object.prototype', async () => {
    const h = harness();
    for (const raw of [
      '{"phone":"+919876500001","language":"en","__proto__":{"authMode":"sms","kind":"sms"}}',
      '{"phone":"+919876500001","language":"en","constructor":{"prototype":{"kind":"sms"}}}',
    ]) {
      const res = await h.send('/v1/auth/otp/request', raw);
      expect(res.statusCode).toBe(400);
      expectCleanError(res, raw);
    }
    expect(({} as Record<string, unknown>).kind).toBeUndefined();
    expect(({} as Record<string, unknown>).authMode).toBeUndefined();
  });

  it('a request cannot change the mode: with kind/mode in the body the reply is still a 400, and a clean body still gets the invite reply', async () => {
    const h = harness();
    expect((await h.request({ phone: PHONE, language: 'en', mode: 'sms' })).statusCode).toBe(400);
    const ok = await h.request({ phone: PHONE, language: 'en' });
    expect(ok.json()).toEqual({ sent: false, mode: 'invite', digits: 8 });
    expect(h.sms.count()).toBe(0);
  });

  it('a 2 MB body is 413 with the same clean error shape (limit is 1 MiB)', async () => {
    const h = harness();
    const res = await h.send('/v1/auth/otp/request', JSON.stringify({ phone: PHONE, language: 'en', junk: 'x'.repeat(2_000_000) }));
    expect(res.statusCode).toBe(413);
    expectCleanError(res, '413');
  });

  it('deeply nested JSON is a clean 4xx, not a 500 or a hang', async () => {
    const h = harness();
    const nest = '['.repeat(50_000) + ']'.repeat(50_000);
    const res = await h.send('/v1/auth/otp/request', '{"phone":' + nest + ',"language":"en"}');
    expectCleanError(res, 'nested');
  });

  it('malformed JSON is a clean 400 and echoes none of the input', async () => {
    const h = harness();
    for (const raw of ['{', '{"phone":', "{'phone':'x'}", '', 'undefined', '{"phone":"+919876500001","language":"en"}}', '\u0000']) {
      const res = await h.send('/v1/auth/otp/request', raw);
      expectCleanError(res, JSON.stringify(raw));
      expect(res.statusCode).not.toBe(202);
    }
  });

  it('duplicate keys in the JSON do not let a later invalid or extra value ride in', async () => {
    const h = harness();
    // JSON.parse keeps the last value; the last value is what is validated and used.
    const res = await h.send('/v1/auth/otp/request', '{"phone":"+919876500001","language":"en","language":"xx"}');
    expect(res.statusCode).toBe(400);
  });
});

describe('verify route in invite mode: out-of-contract bodies', () => {
  const verifyBad: ReadonlyArray<[string, unknown]> = [
    ['null', null],
    ['array', []],
    ['empty', {}],
    ['code number', { phone: PHONE, code: 48210937, device: { platform: 'android' } }],
    ['code null', { phone: PHONE, code: null, device: { platform: 'android' } }],
    ['code array', { phone: PHONE, code: [CODE], device: { platform: 'android' } }],
    ['code array of two', { phone: PHONE, code: [CODE, '00000000'], device: { platform: 'android' } }],
    ['code object', { phone: PHONE, code: { $gt: '' }, device: { platform: 'android' } }],
    ['code boolean', { phone: PHONE, code: true, device: { platform: 'android' } }],
    ['code missing', { phone: PHONE, device: { platform: 'android' } }],
    ['device missing', { phone: PHONE, code: CODE }],
    ['device string', { phone: PHONE, code: CODE, device: 'android' }],
    ['device null', { phone: PHONE, code: CODE, device: null }],
    ['device platform unknown', { phone: PHONE, code: CODE, device: { platform: 'windows' } }],
    ['device extra field', { phone: PHONE, code: CODE, device: { platform: 'android', shopId: 's1' } }],
    ['consent extra field', { phone: PHONE, code: CODE, device: { platform: 'android' }, consent: { granted: true, noticeVersion: 'v1', locale: 'en', kind: 'invite_recovery' } }],
    ['consent granted string', { phone: PHONE, code: CODE, device: { platform: 'android' }, consent: { granted: 'true', noticeVersion: 'v1', locale: 'en' } }],
    ['consent granted number', { phone: PHONE, code: CODE, device: { platform: 'android' }, consent: { granted: 1, noticeVersion: 'v1', locale: 'en' } }],
    ['consent null', { phone: PHONE, code: CODE, device: { platform: 'android' }, consent: null }],
    ['shopName 1 MB', { phone: PHONE, code: CODE, device: { platform: 'android' }, shopName: 'S'.repeat(1_000_000) }],
    ['shopName number', { phone: PHONE, code: CODE, device: { platform: 'android' }, shopName: 5 }],
    ['shopName empty', { phone: PHONE, code: CODE, device: { platform: 'android' }, shopName: '' }],
    ['code 1 MB', { phone: PHONE, code: '9'.repeat(1_000_000), device: { platform: 'android' } }],
    ['code with NUL', { phone: PHONE, code: '4821\u00000937', device: { platform: 'android' } }],
    ['noticeVersion 1 MB', { phone: PHONE, code: CODE, device: { platform: 'android' }, consent: { granted: true, noticeVersion: 'v'.repeat(1_000_000), locale: 'en' } }],
  ];

  it.each(verifyBad)('%s is a clean 4xx, signs nobody in, and spends nothing', async (label, body) => {
    const h = harness();
    await h.plant(PHONE, CODE);
    const res = await h.post('/v1/auth/otp/verify', body);
    expect(res.statusCode, label).not.toBe(200);
    expectCleanError(res, label);
    expect(res.body).not.toContain('accessToken');
    // Schema rejection happens before the ticket: the code is untouched and still works.
    expect((await h.deps.otp.get(PHONE, T0))?.attempts).toBe(0);
  });

  it.each(['kind', 'purpose', 'shopId', 'mode', 'authMode', 'demo', 'userId', 'role', 'deviceId', 'sub', 'shop'])(
    'an extra top-level field "%s" is 400 and cannot steer purpose or tenancy',
    async (field) => {
      const h = harness();
      await h.account(PHONE, 'victim-shop', 'victim-user');
      // The attacker holds an invite_new code for a number that already has an account, and tries to relabel it.
      await h.plant(PHONE, CODE, 'invite_new');
      for (const value of ['invite_recovery', 'sms', 'victim-shop', true]) {
        const res = await h.verify(PHONE, CODE, { [field]: value });
        expect(res.statusCode, field + '=' + String(value)).toBe(400);
        expectCleanError(res, field);
        expect(res.body).not.toContain('accessToken');
      }
      expect((await h.deps.otp.get(PHONE, T0))?.kind).toBe('invite_new');
      expect((await h.deps.otp.get(PHONE, T0))?.attempts).toBe(0);
    },
  );

  it('a wrong-purpose invite_new code on an existing shop is 401 with the plain body: nothing in the reply names the kind or the shop', async () => {
    const h = harness();
    await h.account(PHONE, 'victim-shop', 'victim-user');
    await h.plant(PHONE, CODE, 'invite_new');
    const res = await h.verify(PHONE, CODE);
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'code_invalid' });
    expect(res.body).not.toMatch(/victim|invite_|kind|purpose/);
  });

  it('the purpose is the stored row, not the request: invite_recovery cannot create a shop, invite_new cannot enter one', async () => {
    const a = harness();
    await a.plant(PHONE, CODE, 'invite_recovery', INVITE_RECOVERY_TTL_SECONDS);
    const noAccount = await a.verify(PHONE, CODE);
    expect(noAccount.statusCode).toBe(401);
    expect(await a.deps.repo.findUserByPhone(PHONE)).toBeNull();

    const b = harness();
    await b.account(PHONE, 'victim-shop', 'victim-user');
    await b.plant(PHONE, CODE, 'invite_new');
    const existing = await b.verify(PHONE, CODE);
    expect(existing.statusCode).toBe(401);
    expect(existing.body).not.toContain('victim-shop');
  });

  it('a new account still needs consent: a valid code with no consent is 403 and no account exists', async () => {
    const h = harness();
    await h.plant(PHONE, CODE);
    const res = await h.post('/v1/auth/otp/verify', { phone: PHONE, code: CODE, device: { platform: 'android' } });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('consent_required');
    expect(await h.deps.repo.findUserByPhone(PHONE)).toBeNull();
  });

  it('consent granted:false is refused too, with no account created', async () => {
    const h = harness();
    await h.plant(PHONE, CODE);
    const res = await h.verify(PHONE, CODE, { consent: { granted: false, noticeVersion: NOTICE_VERSION, locale: 'en' } });
    expect(res.statusCode).toBe(403);
    expect(await h.deps.repo.findUserByPhone(PHONE)).toBeNull();
  });
});

describe('code shapes', () => {
  it.each([
    ['empty', ''],
    ['one digit', '1'],
    ['three digits (below the schema minimum)', '123'],
    ['eleven digits (above the schema maximum)', '48210937123'],
  ])('%s is a 400 and spends no attempt', async (_l, code) => {
    const h = harness();
    await h.plant(PHONE, CODE);
    const res = await h.verify(PHONE, code);
    expect(res.statusCode).toBe(400);
    expect((await h.deps.otp.get(PHONE, T0))?.attempts).toBe(0);
  });

  it.each([
    ['six digits (an SMS-length code on an 8-digit invite)', '482109'],
    ['seven digits', '4821093'],
    ['nine digits', '482109370'],
    ['ten digits', '4821093700'],
    ['grouped with a space, as the CLI prints it', '4821 0937'],
    ['grouped with a dash', '4821-0937'],
    ['leading space', ' 4821093'],
    ['trailing space', '4821093 '],
    ['trailing newline', '4821093\n'],
    ['tab inside', '4821\t0937'],
    ['full-width digits', '４８２１０９３７'],
    ['Arabic-Indic digits', '٤٨٢١٠٩٣٧'],
    ['Devanagari digits', '४८२१०९३७'],
    ['Odia digits', '୪୮୨୧୦୯୩୭'],
    ['letters', 'abcdefgh'],
    ['hex-looking', '0x482109'],
    ['exponent form', '4.821e7'],
    ['negative', '-4821093'],
    ['plus-prefixed', '+4821093'],
    ['zero-width space inside', '4821​0937'],
    ['SQL as data', "' OR '1'='1"],
    ['all zeros', '00000000'],
  ])('%s is a plain 401 (never signs in, never a 500)', async (_l, code) => {
    const h = harness();
    await h.plant(PHONE, CODE);
    const res = await h.verify(PHONE, code);
    expect([400, 401]).toContain(res.statusCode);
    expect(res.body).not.toContain('accessToken');
    if (res.statusCode === 401) expect(res.json()).toEqual({ error: 'code_invalid' });
    // The real code survives one stray guess.
    expect((await h.verify(PHONE, CODE)).statusCode).toBe(200);
  });

  it('a leading-zero code is compared as a string: 00001234 signs in, 1234 and 0001234 do not', async () => {
    const h = harness();
    await h.plant(PHONE, '00001234');
    expect((await h.verify(PHONE, '1234')).statusCode).toBe(401);
    expect((await h.verify(PHONE, '0001234')).statusCode).toBe(401);
    expect((await h.verify(PHONE, '000012340')).statusCode).toBe(401);
    expect((await h.verify(PHONE, '00001234')).statusCode).toBe(200);
  });

  it('the exact code signs in, and only once', async () => {
    const h = harness();
    await h.plant(PHONE, CODE);
    expect((await h.verify(PHONE, CODE)).statusCode).toBe(200);
    expect((await h.verify(PHONE, CODE)).statusCode).toBe(401);
  });

  it('wrong codes have one uniform body whether the number has an invite, an account, or nothing', async () => {
    const h = harness();
    await h.account(OTHER, 's2', 'u2');
    await h.plant(PHONE, CODE);
    const bodies = new Set<string>();
    for (const phone of [PHONE, OTHER, '+919876500003']) {
      const res = await h.verify(phone, '11111111');
      expect(res.statusCode).toBe(401);
      bodies.add(res.body);
    }
    expect(bodies.size).toBe(1);
  });

  it('even a correct code for a number WITHOUT a live row, or an expired one, gives that same 401', async () => {
    const h = harness();
    const none = await h.verify('+919876500003', CODE);
    await h.plant(PHONE, CODE, 'invite_recovery', 1);
    const expired = await buildApp({ ...h.deps, now: () => new Date(Date.parse(T0) + 5000).toISOString() }).inject({
      method: 'POST',
      url: '/v1/auth/otp/verify',
      headers: JSON_H,
      payload: JSON.stringify(h.verifyBody(PHONE, CODE)),
    });
    expect(none.statusCode).toBe(401);
    expect(expired.statusCode).toBe(401);
    expect(none.body).toBe(expired.body);
  });

  it('the delete: namespace cannot be reached through the verify route', async () => {
    const h = harness();
    await h.plant('delete:' + PHONE, CODE);
    for (const phone of ['delete:' + PHONE, 'delete:9876500001', 'DELETE:+919876500001']) {
      const res = await h.verify(phone, CODE);
      expect(res.statusCode).toBe(400);
      expect(res.body).not.toContain('accessToken');
    }
    // and the sign-in key for the same number holds nothing
    expect((await h.verify(PHONE, CODE)).statusCode).toBe(401);
  });
});

describe('phone formats', () => {
  it.each(['9876500001', '09876500001', '919876500001', '+919876500001', '+91 98765 00001', '+91-98765-00001', '0091 98765 00001', '98765 00001'])(
    '"%s" is the same number, so it signs in with the planted code',
    async (form) => {
      const h = harness();
      await h.plant(PHONE, CODE);
      const res = await h.verify(form, CODE);
      expect(res.statusCode).toBe(200);
    },
  );

  it.each([
    ['trailing newline', '+919876500001\n'],
    ['leading newline', '\n+919876500001'],
    ['trailing NUL', '+919876500001\u0000'],
    ['tab separator', '+91\t9876500001'],
    ['double plus', '++919876500001'],
    ['plus in the middle', '91+9876500001'],
    ['full-width digits', '＋９１９８７６５００００１'],
    ['Arabic-Indic digits', '٩٨٧٦٥٠٠٠٠١'],
    ['Devanagari digits', '९८७६५००००१'],
    ['leading digit 5', '5876500001'],
    ['leading digit 0 after the code', '+910876500001'],
    ['other country code', '+14155550101'],
    ['letters', 'ninesevensix'],
    ['parentheses', '(98765) 00001'],
    ['dots', '98765.00001'],
    ['extension', '9876500001 x12'],
    ['two numbers', '9876500001,9876500002'],
    ['percent-encoded', '%2B919876500001'],
    ['homoglyph plus', '﹢919876500001'],
    ['RTL override', '‮9876500001'],
    ['SQL as data', "9876500001'; DROP TABLE users;--"],
    ['demo-range glob', '+91 99999 0%'],
    ['delete: prefix', 'delete:9876500001'],
  ])('%s is 400 on request and on verify, with the same error and no tokens', async (_l, phone) => {
    const h = harness();
    const r = await h.request({ phone, language: 'en' });
    const v = await h.verify(phone, CODE);
    expect(r.statusCode).toBe(400);
    expect(v.statusCode).toBe(400);
    const strip = (b: string) => b.replace(/"requestId":"[^"]*"/, '"requestId":"-"');
    if (r.json().error === 'invalid_phone') expect(strip(r.body)).toBe(strip(v.body));
    else expect(r.json().error).toBe(v.json().error);
    expectCleanError(r, 'phone');
    expect(v.body).not.toContain('accessToken');
    // the message does not echo the input
    expect(r.body).not.toContain(phone.replace(/[^\x20-\x7e]/g, '') || '\u0000');
  });

  it('every accepted spelling of one number gets byte-identical invite replies', async () => {
    const h = harness();
    const forms = ['9876500001', '09876500001', '919876500001', '+919876500001', '+91 98765 00001', '+91-98765-00001', '0091 98765 00001'];
    const bodies = new Set<string>();
    for (const phone of forms) bodies.add((await h.request({ phone, language: 'en' })).body);
    expect(bodies.size).toBe(1);
  });
});

describe('content-type confusion and method tampering', () => {
  const good = JSON.stringify({ phone: PHONE, language: 'en' });
  const goodVerify = (h: ReturnType<typeof harness>) => JSON.stringify(h.verifyBody(PHONE, CODE));

  it.each([
    ['text/plain', 'text/plain'],
    ['form-urlencoded', 'application/x-www-form-urlencoded'],
    ['xml', 'application/xml'],
    ['text/xml', 'text/xml'],
    ['multipart without boundary', 'multipart/form-data'],
    ['octet-stream', 'application/octet-stream'],
    ['json-patch', 'application/json-patch+json'],
    ['text/json', 'text/json'],
    ['empty', ''],
    ['gibberish', 'a/b; c=d'],
  ])('request with %s is a clean 4xx, never a 202', async (_l, ct) => {
    const h = harness();
    const res = await h.send('/v1/auth/otp/request', good, ct ? { 'content-type': ct } : {});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
    expectCleanError(res, ct);
    expect(res.body).not.toContain('sent');
  });

  it.each(['application/x-www-form-urlencoded', 'text/plain', 'application/xml'])('verify with %s is a clean 4xx and signs nobody in', async (ct) => {
    const h = harness();
    await h.plant(PHONE, CODE);
    const res = await h.send('/v1/auth/otp/verify', goodVerify(h), { 'content-type': ct });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
    expect(res.body).not.toContain('accessToken');
    expect((await h.deps.otp.get(PHONE, T0))?.attempts).toBe(0);
  });

  it('an XML body with an external entity is not parsed and its target is never echoed', async () => {
    const h = harness();
    const xxe = '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>';
    const res = await h.send('/v1/auth/otp/request', xxe, { 'content-type': 'application/xml' });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.body).not.toMatch(/root:|passwd/);
  });

  it('a form body carrying the right field names is not read as JSON', async () => {
    const h = harness();
    const res = await h.send('/v1/auth/otp/request', 'phone=%2B919876500001&language=en', { 'content-type': 'application/x-www-form-urlencoded' });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('application/json with a charset parameter still works; a UTF-16 label does not turn bytes into a 500', async () => {
    const h = harness();
    const ok = await h.send('/v1/auth/otp/request', good, { 'content-type': 'application/json; charset=utf-8' });
    expect(ok.statusCode).toBe(202);
    const odd = await h.send('/v1/auth/otp/request', good, { 'content-type': 'application/json; charset=utf-16' });
    expect(odd.statusCode).toBeLessThan(500);
  });

  it('a JSON BOM prefix is either parsed as the same body or refused cleanly, never a 5xx', async () => {
    const h = harness();
    const res = await h.send('/v1/auth/otp/request', '﻿' + good);
    expect(res.statusCode).toBeLessThan(500);
    if (res.statusCode === 202) expect(res.json()).toEqual({ sent: false, mode: 'invite', digits: 8 });
    else expectCleanError(res, 'bom');
  });

  it.each(['GET', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const)(
    '%s on the auth routes is indistinguishable from a path that does not exist (no route oracle, no stack)',
    async (method) => {
      const h = harness();
      const ghost = await h.send('/v1/no-such-route', undefined, {}, method as never);
      expect(ghost.statusCode).toBeGreaterThanOrEqual(400);
      expect(ghost.statusCode).toBeLessThan(500);
      for (const url of ['/v1/auth/otp/request', '/v1/auth/otp/verify', '/v1/deletion/request']) {
        const res = await h.send(url, undefined, {}, method as never);
        expect(res.statusCode, method + ' ' + url).toBe(ghost.statusCode);
        expect(res.body, method + ' ' + url).toBe(ghost.body);
        expect(res.body).not.toMatch(/stack|node_modules|\.ts:/);
      }
    },
  );

  it('a query string on the POST routes is not read: ?kind=sms&mode=sms&shopId=x changes nothing', async () => {
    const h = harness();
    await h.plant(PHONE, CODE, 'invite_new');
    const res = await h.send('/v1/auth/otp/request?kind=sms&mode=sms&shopId=victim&authMode=sms', good);
    expect(res.statusCode).toBeLessThan(500);
    if (res.statusCode === 202) expect(res.json()).toEqual({ sent: false, mode: 'invite', digits: 8 });
    expect(h.sms.count()).toBe(0);
    expect((await h.deps.otp.get(PHONE, T0))?.kind).toBe('invite_new');
  });

  it('headers cannot steer mode, shop or the client address: X-Forwarded-For, X-Auth-Mode, X-Shop-Id are ignored', async () => {
    const h = harness();
    const res = await h.send('/v1/auth/otp/request', good, { ...JSON_H, 'x-forwarded-for': '1.2.3.4', 'x-auth-mode': 'sms', 'x-shop-id': 'victim', 'x-request-id': 'attacker-chosen' });
    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ sent: false, mode: 'invite', digits: 8 });
    expect(h.sms.count()).toBe(0);
    expect(JSON.stringify(res.headers)).not.toContain('attacker-chosen');
  });
});

describe('invite-mode request reply: byte-identical across numbers', () => {
  it('twenty numbers (none, account, live invite, expired invite, demo, burned) and all three languages give the identical status, body and headers', async () => {
    const demo = { phone: DEMO_PHONE, codeHash: hashOtp(KEY, DEMO_PHONE, DEMO_CODE) };
    const h = harness({ demo });
    await h.account('+919876500010', 's10', 'u10');
    await h.plant('+919876500011', CODE, 'invite_new');
    await h.plant('+919876500012', CODE, 'invite_recovery', INVITE_RECOVERY_TTL_SECONDS);
    await h.plant('+919876500013', CODE, 'invite_new', 1);
    await h.deps.otp.put({ phone: '+919876500014', hash: hashOtp(KEY, '+919876500014', CODE), expiresAt: new Date(Date.parse(T0) + 9e6).toISOString(), attempts: 5, createdAt: T0, kind: 'invite_new' }, 0);
    const phones = [PHONE, OTHER, '+919876500003', '+919876500010', '+919876500011', '+919876500012', '+919876500013', '+919876500014', DEMO_PHONE, '+916000000000', '+917999999999', '+918888888888', '+919000000000', '+919999999999'];
    const seen = new Map<string, string>();
    for (const phone of phones) {
      for (const language of ['od', 'hi', 'en']) {
        const res = await h.request({ phone, language });
        const { date: _d, 'x-request-id': _r, ...headers } = res.headers as Record<string, unknown>;
        const fingerprint = JSON.stringify({ s: res.statusCode, b: res.body, h: headers });
        seen.set(fingerprint, phone + '/' + language);
      }
    }
    expect(seen.size).toBe(1);
    expect(h.sms.count()).toBe(0);
  });

  it('the reply is the constant 202 {sent:false,mode:"invite",digits:8} with no requestId, retry hint, phone or kind in it', async () => {
    const h = harness();
    const res = await h.request({ phone: PHONE, language: 'en' });
    expect(res.statusCode).toBe(202);
    expect(res.body).toBe('{"sent":false,"mode":"invite","digits":8}');
    expect(res.headers['retry-after']).toBeUndefined();
  });

  it('repeating the request any number of times never rate-limits or varies (no per-number state to read)', async () => {
    const h = harness();
    const first = (await h.request({ phone: PHONE, language: 'en' })).body;
    for (let i = 0; i < 150; i += 1) {
      const res = await h.request({ phone: PHONE, language: 'en', deviceId: 'abcdefgh' + (i % 3) });
      expect(res.statusCode).toBe(202);
      expect(res.body).toBe(first);
    }
  });

  it('a request leaves a live invite byte-unchanged and does not extend, reset or burn it', async () => {
    const h = harness();
    await h.plant(PHONE, CODE, 'invite_new');
    await h.deps.otp.takeAttempt(PHONE, T0, 5); // one genuine guess spent
    const before = JSON.stringify(await h.deps.otp.get(PHONE, T0));
    for (let i = 0; i < 5; i += 1) await h.request({ phone: PHONE, language: 'en' });
    expect(JSON.stringify(await h.deps.otp.get(PHONE, T0))).toBe(before);
  });

  it('the request costs no limiter budget: after 150 requests the verify path for the number still works', async () => {
    const h = harness();
    await h.plant(PHONE, CODE);
    for (let i = 0; i < 150; i += 1) await h.request({ phone: PHONE, language: 'en' });
    expect((await h.verify(PHONE, CODE)).statusCode).toBe(200);
  });
});

describe('the deletion route in invite mode', () => {
  const del = (h: ReturnType<typeof harness>, body: unknown) => h.post('/v1/deletion/request', body);

  it('is a constant paused 202 for every number and language, byte-identical, with no write', async () => {
    const h = harness();
    await h.account(PHONE, 's1', 'u1');
    await h.plant(OTHER, CODE);
    const rowBefore = JSON.stringify(await h.deps.otp.get(OTHER, T0));
    const bodies = new Set<string>();
    for (const phone of [PHONE, OTHER, '+919876500003']) {
      for (const language of ['od', 'hi', 'en']) {
        const res = await del(h, { phone, language });
        expect(res.statusCode).toBe(202);
        bodies.add(res.body);
      }
    }
    expect(bodies.size).toBe(1);
    expect(JSON.parse([...bodies][0]!)).toEqual({ sent: false, mode: 'invite', paused: true });
    expect(await h.deps.otp.get('delete:' + PHONE, T0)).toBeNull();
    expect(await h.deps.otp.get('delete:' + OTHER, T0)).toBeNull();
    expect(JSON.stringify(await h.deps.otp.get(OTHER, T0))).toBe(rowBefore);
    expect(h.sms.count()).toBe(0);
  });

  it('after any number of deletion requests the account still exists and no deletion is pending', async () => {
    const h = harness();
    await h.account(PHONE, 's1', 'u1');
    for (let i = 0; i < 20; i += 1) await del(h, { phone: PHONE, language: 'en' });
    expect(await h.deps.repo.findUserByPhone(PHONE)).not.toBeNull();
  });

  it.each(BAD_BODIES)('%s is a clean 4xx', async (label, body) => {
    const h = harness();
    const res = await del(h, body);
    expect(res.statusCode, label).toBeGreaterThanOrEqual(400);
    expectCleanError(res, label);
  });

  it.each(['kind', 'purpose', 'shopId', 'mode', 'paused', 'confirm', 'code'])('an extra field "%s" is 400', async (field) => {
    const h = harness();
    const res = await del(h, { phone: PHONE, language: 'en', [field]: 'x' });
    expect(res.statusCode).toBe(400);
    expectCleanError(res, field);
  });

  it('an invalid phone is the same 400 body as on the sign-in request, and never says paused', async () => {
    const h = harness();
    const a = await del(h, { phone: '12345abcde', language: 'en' });
    const b = await h.request({ phone: '12345abcde', language: 'en' });
    expect(a.statusCode).toBe(400);
    expect(a.body.replace(/"requestId":"[^"]*"/, '')).toBe(b.body.replace(/"requestId":"[^"]*"/, ''));
    expect(a.body).not.toContain('paused');
  });

  it('content-type confusion on deletion is a clean 4xx', async () => {
    const h = harness();
    for (const ct of ['text/plain', 'application/x-www-form-urlencoded', 'application/xml']) {
      const res = await h.send('/v1/deletion/request', JSON.stringify({ phone: PHONE, language: 'en' }), { 'content-type': ct });
      expect(res.statusCode, ct).toBeGreaterThanOrEqual(400);
      expect(res.statusCode, ct).toBeLessThan(500);
    }
  });

  it('a deletion code cannot be forged into the sign-in namespace or the reverse', async () => {
    const h = harness();
    await h.account(PHONE, 's1', 'u1');
    await h.plant('delete:' + PHONE, CODE);
    // A delete: row must not sign anyone in, and the confirm route must not accept a sign-in invite.
    expect((await h.verify(PHONE, CODE)).statusCode).toBe(401);
    await h.plant(PHONE, CODE, 'invite_recovery', INVITE_RECOVERY_TTL_SECONDS);
    const confirm = await h.post('/v1/deletion/confirm', { phone: PHONE, code: CODE });
    expect(confirm.statusCode).toBeLessThan(500);
    expect(confirm.statusCode).not.toBe(200);
    expect(await h.deps.repo.findUserByPhone(PHONE)).not.toBeNull();
  });
});

describe('the demo login under abuse', () => {
  const demo = { phone: DEMO_PHONE, codeHash: hashOtp(KEY, DEMO_PHONE, DEMO_CODE) };

  it('a request for the demo number gets the very reply every other number gets', async () => {
    const h = harness({ demo });
    const a = await h.request({ phone: DEMO_PHONE, language: 'en' });
    const b = await h.request({ phone: PHONE, language: 'en' });
    expect(a.statusCode).toBe(b.statusCode);
    expect(a.body).toBe(b.body);
    expect(h.sms.count()).toBe(0);
  });

  it('demo-range lookalikes are not the demo account', async () => {
    const h = harness({ demo });
    // (`9999900001 ` with a trailing space IS the demo number by design: spaces are separators, see phone.ts.)
    for (const phone of ['+919999900002', '+91 99999 00001x', '+919999900001\n', '+919999900001\u0000']) {
      const res = await h.verify(phone, DEMO_CODE);
      expect(res.body, phone).not.toContain('accessToken');
    }
  });

  it('wrong demo codes of every shape are the same 401 as a wrong invite code', async () => {
    const h = harness({ demo });
    await h.plant(PHONE, CODE);
    const reference = (await h.verify(PHONE, '11111111')).body;
    for (const code of ['1111', '111111', '1111111111', '2468 1357', '24681357 ', '２４６８１３５７', '٢٤٦٨١٣٥٧', '00000000']) {
      const res = await h.verify(DEMO_PHONE, code);
      expect([400, 401], code).toContain(res.statusCode);
      if (res.statusCode === 401) expect(res.body, code).toBe(reference);
    }
  });

  it('extra fields on a demo verify (kind, purpose, shopId, demo) are 400 and the real shop is not reached', async () => {
    const h = harness({ demo });
    for (const field of ['kind', 'purpose', 'shopId', 'demo', 'mode']) {
      const res = await h.verify(DEMO_PHONE, DEMO_CODE, { [field]: 'invite_recovery' });
      expect(res.statusCode, field).toBe(400);
      expect(res.body).not.toContain('accessToken');
    }
  });

  it('after five wrong guesses the demo number locks and even the right code is the same bare 401', async () => {
    const h = harness({ demo });
    const wrong = await h.verify(DEMO_PHONE, '11111111');
    for (let i = 0; i < 5; i += 1) await h.verify(DEMO_PHONE, '11111111');
    const locked = await h.verify(DEMO_PHONE, DEMO_CODE);
    expect(locked.statusCode).toBe(401);
    expect(locked.body).toBe(wrong.body);
    expect(locked.body).not.toMatch(/lock|retry|too_many|429/i);
  });

  it('the demo code cannot be used through the deletion namespace and a demo number gets no deletion code', async () => {
    const h = harness({ demo, authMode: 'sms' });
    const res = await h.post('/v1/deletion/request', { phone: DEMO_PHONE, language: 'en' });
    expect(res.statusCode).toBeLessThan(500);
    expect(h.sms.count()).toBe(0);
    expect(await h.deps.otp.get('delete:' + DEMO_PHONE, T0)).toBeNull();
  });

  it('a successful demo sign-in logs the masked number only, never the code or the full number', async () => {
    const h = harness({ demo });
    const res = await h.verify(DEMO_PHONE, DEMO_CODE);
    expect(res.statusCode).toBe(200);
    const logs = h.logLines.join('');
    expect(logs).toContain('demo_login');
    expect(logs).not.toContain(DEMO_CODE);
    expect(logs).not.toContain(DEMO_PHONE);
    expect(logs).not.toContain('99999 00001');
  });
});

describe('errors leak nothing', () => {
  it('no response body or header across the whole abuse corpus carries a stack, path, SQL, key or the submitted secret', async () => {
    const h = harness();
    await h.plant(PHONE, CODE);
    const secretish = 'SECRET-MARKER-' + KEY.slice(0, 8);
    const probes: Array<Promise<{ statusCode: number; body: string; headers: Record<string, unknown> }>> = [];
    for (const [, b] of BAD_BODIES) probes.push(h.request(b) as never, h.post('/v1/auth/otp/verify', b) as never, h.post('/v1/deletion/request', b) as never);
    probes.push(h.request({ phone: secretish, language: 'en' }) as never);
    probes.push(h.verify(PHONE, secretish) as never);
    probes.push(h.send('/v1/auth/otp/request', '{"phone":"' + secretish) as never);
    for (const res of await Promise.all(probes)) {
      expectCleanError(res, 'corpus');
      expect(res.body).not.toContain(secretish);
      expect(res.body).not.toContain(KEY);
      expect(JSON.stringify(res.headers)).not.toMatch(/x-powered-by|fastify|express|node/i);
    }
  });

  it('5xx never happens on the corpus, and a thrown handler error would be a bare internal_error (the handler contract)', async () => {
    const h = harness();
    const res = await Promise.all(BAD_BODIES.map(([, b]) => h.request(b)));
    for (const r of res) expect(r.statusCode).toBeLessThan(500);
  });

  it('request ids are minted by the server: an attacker-supplied X-Request-Id never appears in a body', async () => {
    const h = harness();
    const res = await h.send('/v1/auth/otp/request', '{"phone":1}', { ...JSON_H, 'x-request-id': 'attacker-chosen-id' });
    expect(res.statusCode).toBe(400);
    expect(res.body).not.toContain('attacker-chosen-id');
    expect(JSON.parse(res.body).requestId).toMatch(UUID);
  });

  it('validation messages do not echo the submitted value back', async () => {
    const h = harness();
    const marker = 'MARKER' + 'x'.repeat(10);
    const res = await h.request({ phone: marker, language: 'en' });
    expect(res.body).not.toContain(marker);
    const res2 = await h.request({ phone: PHONE, language: marker });
    expect(res2.statusCode).toBe(400);
    expect(res2.body).not.toContain(marker);
  });

  it('a log line for a failed validation does not contain the full phone number', async () => {
    const h = harness();
    await h.request({ phone: PHONE, language: 'xx' });
    await h.verify(PHONE, '11111111');
    expect(h.logLines.join('')).not.toContain('9876500001');
  });
});
