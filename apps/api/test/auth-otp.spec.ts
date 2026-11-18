/**
 * Wave 2 · API-AUTH. C-02 (store), C-03 (abuse), C-10 (phone), C-21 (devices).
 *
 * Every test here is the executable form of a red-team finding and fails against the
 * code as it stood before this change: RT-3 (three lockout paths), RT-4 / SEC-102
 * (pumping, global breaker), SEC-103 (cross-number guessing), RT-2 (deletion phone).
 * Time is injected, never slept.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp, type AppDeps } from '../src/app.ts';
import { memoryRepo } from '../src/db/memory.ts';
import { memoryOtpStore, MAX_VERIFY_ATTEMPTS } from '../src/auth/routes.ts';
import type { OtpStore } from '../src/auth/otp-store.ts';
import { normaliseIndianMobile } from '../src/auth/phone.ts';
import { memorySql } from '../src/rate-limit/memory-sql.ts';
import { RateLimiter } from '../src/rate-limit/store.ts';
import { StubSmsPort } from '../src/sms/stub.ts';
import { NOTICE_VERSION } from '../src/dpdp/routes.ts';
import {
  OTP_LIMITS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
} from '../src/rate-limit/limits.ts';

const KEY = 'test-signing-key-at-least-32-chars!!';
const T0 = '2026-09-19T08:00:00.000Z';
const V = '+919876500001';

function harness(wrapOtp: (inner: OtpStore) => OtpStore = (s) => s) {
  const clock = { value: T0 };
  const sms = new StubSmsPort();
  const repo = memoryRepo();
  const logLines: string[] = [];
  const deps = {
    logStream: { write: (c: string) => void logLines.push(c) },
    repo,
    sms,
    otp: wrapOtp(memoryOtpStore()),
    now: () => clock.value,
    signingKey: KEY,
    rate: new RateLimiter(memorySql(), { secret: KEY, now: () => new Date(clock.value) }),
  } satisfies AppDeps;
  const app = buildApp(deps);
  const advance = (s: number) => {
    clock.value = new Date(Date.parse(clock.value) + s * 1000).toISOString();
  };
  return { deps, app, sms, repo, clock, advance, logLines };
}
type H = ReturnType<typeof harness>;

const JSON_H = { 'content-type': 'application/json' };
const post = (h: H, url: string, payload: unknown, ip?: string, token?: string) =>
  h.app.inject({
    method: 'POST',
    url,
    headers: { ...JSON_H, ...(token ? { authorization: 'Bearer ' + token } : {}) },
    payload: JSON.stringify(payload),
    ...(ip ? { remoteAddress: ip } : {}),
  });
const request = (h: H, phone: string, ip?: string, extra: object = {}) =>
  post(h, '/v1/auth/otp/request', { phone, language: 'en', ...extra }, ip);
const verify = (h: H, phone: string, code: string, ip?: string) =>
  post(
    h,
    '/v1/auth/otp/verify',
    {
      phone,
      code,
      device: { platform: 'android' },
      shopName: 'S',
      consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' },
    },
    ip,
  );
const lastCode = (h: H, phone: string) => h.sms.forPhone(phone).at(-1)!.variables[0]!;
const wrongOf = (c: string) => (c === '000000' ? '111111' : '000000');

describe('C-10 · one phone normaliser', () => {
  it.each([
    ['9876500001', '+919876500001'],
    ['+91 98765 00001', '+919876500001'],
    ['09876500001', '+919876500001'],
    ['+919876500001', '+919876500001'],
    ['919876500001', '+919876500001'],
    ['+91-98765-00001', '+919876500001'],
    ['0091 98765 00001', '+919876500001'],
  ])('accepts %s', (raw, want) => {
    expect(normaliseIndianMobile(raw)).toBe(want);
  });

  it.each([
    '',
    '12345',
    '5876500001',
    '+15551234567',
    '+9876500001',
    '+9109876500001',
    '+٩١٩٨٧٦٥٠٠٠٠١',
    '+919876500001\n',
    '９８７６５００００１',
    '98765abcde',
    '+91+9876500001',
  ])('refuses %j', (raw) => {
    expect(normaliseIndianMobile(raw)).toBeNull();
  });

  it('sign-in accepts a typed ten-digit number and handles it as +91...', async () => {
    const h = harness();
    expect((await request(h, '9876500001')).statusCode).toBe(202);
    expect(h.sms.forPhone(V)).toHaveLength(1);
    const ok = await verify(h, '98765 00001', lastCode(h, V));
    expect(ok.statusCode).toBe(200);
  });

  it('web deletion finds the account however the number is typed (RT-2)', async () => {
    for (const typed of ['9876500001', '+91 98765 00001', '09876500001', '+919876500001']) {
      const h = harness();
      await request(h, V);
      expect((await verify(h, V, lastCode(h, V))).statusCode).toBe(200);
      const before = h.sms.all().length;
      const r = await post(h, '/v1/deletion/request', { phone: typed, language: 'en' });
      expect(r.statusCode, typed).toBe(202);
      expect(h.sms.all().length - before, typed + ' sent an SMS').toBe(1);
      const code = h.sms.all().at(-1)!.variables[0]!;
      const done = await post(h, '/v1/deletion/confirm', { phone: typed, code, confirm: 'DELETE' });
      expect(done.statusCode, typed).toBe(200);
    }
  });

  it('web deletion refuses a non-mobile with 400 and a message, sending nothing', async () => {
    const h = harness();
    for (const bad of ['12345678', '+15551234567', 'not a phone']) {
      const r = await post(h, '/v1/deletion/request', { phone: bad, language: 'en' });
      expect(r.statusCode, bad).toBe(400);
      const body = JSON.parse(r.body);
      expect(body.error).toBe('invalid_phone');
      expect(body.message).toMatch(/Indian mobile/);
      expect(body.sent).toBeUndefined();
    }
    expect(h.sms.all()).toHaveLength(0);
  });

  it('keeps the no-enumeration answer for a well-formed number with no account', async () => {
    const h = harness();
    await request(h, V);
    await verify(h, V, lastCode(h, V));
    const known = await post(h, '/v1/deletion/request', { phone: V, language: 'en' });
    const unknown = await post(h, '/v1/deletion/request', { phone: '+919876500999', language: 'en' });
    expect(unknown.statusCode).toBe(known.statusCode);
    expect(unknown.body).toBe(known.body);
    expect(h.sms.forPhone('+919876500999')).toHaveLength(0);
  });
});

describe('RT-3 · a stranger who knows only the number cannot lock the owner out', () => {
  let h: H;
  beforeEach(() => {
    h = harness();
  });

  it('a code survives five wrong guesses in total, from any mix of sources (TB6 / B37)', async () => {
    await request(h, V);
    const code = lastCode(h, V);
    for (let i = 0; i < MAX_VERIFY_ATTEMPTS; i += 1) {
      expect((await verify(h, V, wrongOf(code), '203.0.113.' + (10 + i))).statusCode).toBe(401);
    }
    expect((await verify(h, V, code, '198.51.100.7')).statusCode).toBe(401); // dead
    // ... and the owner can ask for another straight away: a dead code holds no cooldown
    expect((await request(h, V)).statusCode).toBe(202);
    expect(h.sms.forPhone(V)).toHaveLength(2);
  });

  it('RT2-1: a concurrent multi-source burst compares at most five guesses against a code', async () => {
    // 1 ms of store latency on every call (a stand-in for a database round trip). The
    // old get -> compare -> bump order let every concurrent caller read the code before
    // any had counted, so 2000 sources got 2000 comparisons.
    const lag = () => new Promise<void>((r) => setTimeout(r, 1));
    let compared = 0;
    const hh = harness((inner) => ({
      ...inner,
      get: async (k, n) => (await lag(), inner.get(k, n)),
      takeAttempt: async (k, n, cap) => {
        await lag();
        const t = await inner.takeAttempt(k, n, cap);
        if (t) compared += 1;
        return t;
      },
      clear: async (k) => (await lag(), inner.clear(k)),
    }));
    await request(hh, V, '203.0.113.10');
    const code = lastCode(hh, V);
    const rs = await Promise.all(
      Array.from({ length: 500 }, (_, i) =>
        verify(hh, V, i === 499 ? code : String(100000 + i), '10.' + (i >> 8) + '.' + (i & 255) + '.1'),
      ),
    );
    expect(compared).toBeLessThanOrEqual(MAX_VERIFY_ATTEMPTS);
    expect(rs.filter((r) => r.statusCode === 200)).toHaveLength(0); // the true code came too late
  });

  it('path 3: a second request inside the cooldown neither sends nor invalidates the live code', async () => {
    await request(h, V, '203.0.113.66');
    const first = lastCode(h, V);
    h.advance(OTP_RESEND_COOLDOWN_SECONDS - 5);
    const again = await request(h, V, '203.0.113.66');
    expect(again.statusCode).toBe(202);
    expect(again.body).toBe((await request(h, '+919876500777')).body); // same shape as any other
    expect(h.sms.forPhone(V)).toHaveLength(1);
    expect((await verify(h, V, first)).statusCode).toBe(200);
  });

  it('after the cooldown a new request does replace the code (a lost SMS must be recoverable)', async () => {
    await request(h, V);
    const first = lastCode(h, V);
    h.advance(OTP_RESEND_COOLDOWN_SECONDS + 1);
    await request(h, V);
    const second = lastCode(h, V);
    expect(h.sms.forPhone(V)).toHaveLength(2);
    expect(second).not.toBe(first);
    expect((await verify(h, V, second)).statusCode).toBe(200);
  });

  it("path 2: requests inside the cooldown do not spend the number's send budget", async () => {
    await request(h, V);
    for (let i = 0; i < 20; i += 1) await request(h, V, '203.0.113.66'); // all inside the cooldown
    h.advance(OTP_RESEND_COOLDOWN_SECONDS + 1);
    expect((await request(h, V)).statusCode).toBe(202); // the owner is not locked out
  });

  it("RT-3 residual: the owner's own device always gets a code once a minute, with the number's budget burned", async () => {
    // an account and its device
    await request(h, V);
    const session = JSON.parse((await verify(h, V, lastCode(h, V))).body) as { deviceId: string };
    // an attacker burns the per-number budget: paced requests, no device
    for (let i = 0; i < OTP_LIMITS.sendPerPhoneBurst.max; i += 1) {
      h.advance(OTP_RESEND_COOLDOWN_SECONDS + 1);
      await request(h, V, '203.0.113.66');
    }
    h.advance(OTP_RESEND_COOLDOWN_SECONDS + 1);
    expect((await request(h, V, '203.0.113.66')).statusCode).toBe(429); // a stranger is held
    // the owner, from the device that signed in, still gets through ...
    const before = h.sms.forPhone(V).length;
    expect((await request(h, V, '198.51.100.9', { deviceId: session.deviceId })).statusCode).toBe(202);
    expect(h.sms.forPhone(V)).toHaveLength(before + 1);
    // ... but not inside the cooldown (nothing sent), and an unknown device id gets no bypass
    expect((await request(h, V, '198.51.100.9', { deviceId: session.deviceId })).statusCode).toBe(202);
    expect(h.sms.forPhone(V)).toHaveLength(before + 1);
    h.advance(OTP_RESEND_COOLDOWN_SECONDS + 1);
    expect((await request(h, V, '198.51.100.9', { deviceId: 'not-a-real-device-1' })).statusCode).toBe(429);
  });

  it("an address already over its own cap cannot drain a number's budget", async () => {
    const ip = '203.0.113.50';
    for (let i = 0; i < OTP_LIMITS.sendPerIpCap.max; i += 1) {
      await request(h, '+9198765' + String(10000 + i).padStart(5, '0'), ip);
    }
    const blocked = await request(h, V, ip);
    expect(blocked.statusCode).toBe(429);
    // The blocked address never reached V's per-number rules: V has its full budget.
    for (let i = 0; i < OTP_LIMITS.sendPerPhoneBurst.max; i += 1) {
      h.advance(OTP_RESEND_COOLDOWN_SECONDS + 1);
      expect((await request(h, V, '198.51.100.9')).statusCode, 'send ' + (i + 1)).toBe(202);
    }
  });
});

describe('C-03b · SMS pumping is capped', () => {
  it('one address walking distinct numbers is blocked at the per-IP cap, deviceId or not', async () => {
    const h = harness();
    const ip = '203.0.113.9';
    let accepted = 0;
    let last = 202;
    for (let i = 0; i < OTP_LIMITS.sendPerIpCap.max + 10; i += 1) {
      const r = await request(h, '+9198765' + String(20000 + i).padStart(5, '0'), ip, {
        deviceId: 'rnd-' + String(i).padStart(8, '0'), // a fresh device id each time (RT-4)
      });
      last = r.statusCode;
      if (r.statusCode === 202) accepted += 1;
    }
    expect(accepted).toBe(OTP_LIMITS.sendPerIpCap.max);
    expect(last).toBe(429);
    expect(h.sms.all()).toHaveLength(OTP_LIMITS.sendPerIpCap.max);
  });

  it('RT2-2: the global ceiling blocks only sends to numbers with NO account, and logs one crit line', async () => {
    const h = harness();
    // two accounts that exist before the flood (W is kept untouched for the rapid-sequence check)
    const W = '+919876500002';
    for (const p of [V, W]) {
      await request(h, p);
      expect((await verify(h, p, lastCode(h, p))).statusCode).toBe(200);
    }
    for (let i = 0; i < OTP_LIMITS.sendGlobal.max + 5; i += 1) {
      const ip = '10.' + (i % 250) + '.' + Math.floor(i / 250) + '.1';
      expect((await request(h, '+9198766' + String(10000 + i).padStart(5, '0'), ip)).statusCode).toBe(202);
    }
    // (the two accounts' first sign-in requests, sent before they existed, took two places)
    expect(h.sms.all()).toHaveLength(OTP_LIMITS.sendGlobal.max);
    // while tripped: a registered number can still sign in, and can still delete
    h.advance(OTP_RESEND_COOLDOWN_SECONDS + 1);
    expect((await request(h, V, '198.51.100.1')).statusCode).toBe(202);
    expect(h.sms.forPhone(V)).toHaveLength(2);
    const del = await post(h, '/v1/deletion/request', { phone: V, language: 'en' }, '198.51.100.2');
    expect(del.statusCode).toBe(202);
    expect(h.sms.all().at(-1)!.templateId).toBe('otp_account_deletion');
    // a NEW user is the one held - silently: RT3-1, the answer must not reveal "no account"
    const smsHeld = h.sms.all().length;
    const unreg = await request(h, '+919811112222', '198.51.100.3');
    h.advance(OTP_RESEND_COOLDOWN_SECONDS + 1);
    const reg = await request(h, V, '198.51.100.5');
    expect(unreg.statusCode).toBe(reg.statusCode);
    expect(unreg.body).toBe(reg.body);
    expect(Object.keys(unreg.headers).sort()).toEqual(Object.keys(reg.headers).sort());
    expect(h.sms.forPhone('+919811112222')).toHaveLength(0);
    expect(h.sms.all().length).toBe(smsHeld + 1); // only the registered number got an SMS
    // RT3-1b: a RAPID sequence must look the same too (cooldown, not budget, on both sides)
    const seq = async (phone: string, ip: string) => {
      const out: string[] = [];
      for (let i = 0; i < 6; i += 1) {
        const r = await request(h, phone, ip);
        out.push(r.statusCode + ' ' + r.body + ' ' + Object.keys(r.headers).sort().join(','));
      }
      return out;
    };
    h.advance(OTP_RESEND_COOLDOWN_SECONDS + 1);
    const regSeq = await seq(W, '198.51.100.6');
    const unregSeq = await seq('+919811113333', '198.51.100.7');
    expect(unregSeq).toEqual(regSeq);
    expect(new Set(unregSeq).size).toBe(1);
    // unregistered deletion requests send nothing and do not feed the ceiling
    const smsBefore = h.sms.all().length;
    for (let i = 0; i < 20; i += 1) {
      const phone = '+9198769' + String(10000 + i).padStart(5, '0');
      await post(h, '/v1/deletion/request', { phone, language: 'en' }, '198.51.100.4');
    }
    expect(h.sms.all().length).toBe(smsBefore);
    // exactly one crit line named the breaker
    const named = h.logLines.filter((l) => l.includes(OTP_LIMITS.sendGlobal.name) && l.includes('crit'));
    expect(named).toHaveLength(1);
    // it ends by itself
    h.advance(OTP_LIMITS.sendGlobal.lockoutSeconds + 1);
    h.advance(OTP_RESEND_COOLDOWN_SECONDS + 1);
    await request(h, '+919811112222', '198.51.100.3');
    expect(h.sms.forPhone('+919811112222')).toHaveLength(1); // sending resumed
  });

  it('540 unregistered deletion requests from nine sources do not block a sign-in (RT2-2 PoC)', async () => {
    const h = harness();
    await request(h, V);
    await verify(h, V, lastCode(h, V));
    for (let s = 0; s < 9; s += 1) {
      for (let k = 0; k < 60; k += 1) {
        const phone = '+9198770' + String(s * 100 + k + 10000).padStart(5, '0');
        await post(h, '/v1/deletion/request', { phone, language: 'en' }, '198.51.100.' + (s + 1));
      }
    }
    expect((await request(h, '+919811112222', '192.0.2.55')).statusCode).toBe(202);
  });

  it('a loopback peer (an untrusted reverse proxy) is not capped per address', async () => {
    // Behind Caddy without trustProxy every caller is 127.0.0.1; a per-address cap
    // there would block the whole country. The global breaker is what applies.
    const h = harness();
    for (let i = 0; i < OTP_LIMITS.sendPerIpCap.max + 5; i += 1) {
      const r = await request(h, '+9198767' + String(10000 + i).padStart(5, '0'));
      expect(r.statusCode).toBe(202);
    }
  });
});

describe('C-03d · SEC-103 · guessing across numbers from one address', () => {
  it('one address is cut off after verifyPerIp attempts spread over many numbers', async () => {
    const h = harness();
    const ip = '203.0.113.77';
    let blockedAt = -1;
    for (let i = 0; i < OTP_LIMITS.verifyPerIp.max + 5; i += 1) {
      const r = await verify(h, '+9198768' + String(10000 + i).padStart(5, '0'), '123456', ip);
      if (r.statusCode === 429 && blockedAt < 0) blockedAt = i;
    }
    // Each number is under its own per-source cap; only the cross-number rule stops this.
    expect(blockedAt).toBe(OTP_LIMITS.verifyPerIp.max);
    // Another address is unaffected.
    expect((await verify(h, '+919876810001', '123456', '198.51.100.2')).statusCode).toBe(401);
  });
});

describe('C-03a/C-02 · single use under concurrency', () => {
  it('of 20 concurrent correct submissions exactly one signs in', async () => {
    const h = harness();
    await request(h, V);
    const code = lastCode(h, V);
    const rs = await Promise.all(
      Array.from({ length: 20 }, () => verify(h, V, code, '198.51.100.3')),
    );
    expect(rs.filter((r) => r.statusCode === 200)).toHaveLength(1);
  });
});

describe('C-02 · the in-memory store is bounded and expires', () => {
  const P = (phone: string, at: string, ttl = OTP_TTL_SECONDS) => ({
    phone,
    hash: 'h',
    expiresAt: new Date(Date.parse(at) + ttl * 1000).toISOString(),
    attempts: 0,
    createdAt: at,
  });

  it('never exceeds its cap, evicting expired entries first and then the oldest', async () => {
    const s = memoryOtpStore({ maxEntries: 3 });
    await s.put(P('a', T0, 1), 0); // expires almost at once
    await s.put(P('b', T0), 0);
    await s.put(P('c', T0), 0);
    const later = new Date(Date.parse(T0) + 5000).toISOString();
    await s.put(P('d', later), 0); // 'a' is expired: it goes, not 'b'
    expect(await s.get('a', later)).toBeNull();
    expect(await s.get('b', later)).not.toBeNull();
    await s.put(P('e', later), 0); // full of live entries: the oldest goes
    expect(await s.get('b', later)).toBeNull();
    for (const k of ['c', 'd', 'e']) expect(await s.get(k, later)).not.toBeNull();
  });

  it('treats an expired entry as absent and overwrites it', async () => {
    const s = memoryOtpStore();
    await s.put(P('a', T0), 60);
    const after = new Date(Date.parse(T0) + (OTP_TTL_SECONDS + 1) * 1000).toISOString();
    expect(await s.get('a', after)).toBeNull();
    expect(await s.put(P('a', after), 60)).toBe(true);
  });

  it('refuses to overwrite a live code inside the cooldown, and clear() is single use', async () => {
    const s = memoryOtpStore();
    expect(await s.put(P('a', T0), 60)).toBe(true);
    expect(await s.put(P('a', new Date(Date.parse(T0) + 30_000).toISOString()), 60)).toBe(false);
    const now = new Date(Date.parse(T0) + 1000).toISOString();
    expect((await s.takeAttempt('a', now, 2))?.attempts).toBe(1);
    expect((await s.takeAttempt('a', now, 2))?.attempts).toBe(2);
    expect(await s.takeAttempt('a', now, 2)).toBeNull(); // cap reached: refused, not compared
    expect(await s.clear('a')).toBe(true);
    expect(await s.clear('a')).toBe(false);
    expect(await s.takeAttempt('a', now, 2)).toBeNull();
  });
});

describe("C-21 · the shop's devices", () => {
  /** The route needs `Repo.listDevices` (API-DATA adds it); this stands in for it here. */
  function withListing(h: H) {
    const repo = h.repo as unknown as Record<string, unknown>;
    repo.listDevices = async (shopId: string) =>
      (h.repo.dump() as { devices: { shopId: string }[] }).devices.filter((d) => d.shopId === shopId);
  }
  const signIn = async (h: H, phone: string) => {
    await request(h, phone);
    const r = await verify(h, phone, lastCode(h, phone));
    expect(r.statusCode).toBe(200);
    return JSON.parse(r.body) as { accessToken: string; deviceId: string };
  };
  const get = (h: H, url: string, token: string) =>
    h.app.inject({ method: 'GET', url, headers: { authorization: 'Bearer ' + token } });

  it("lists this shop's devices only, and a second device can revoke the first", async () => {
    const h = harness();
    withListing(h);
    const a = await signIn(h, V);
    const b = await signIn(h, V); // the same owner on a second handset
    const stranger = await signIn(h, '+919876500002');

    const list = JSON.parse((await get(h, '/v1/devices', b.accessToken)).body).devices as {
      id: string;
      current: boolean;
    }[];
    expect(list.map((d) => d.id).sort()).toEqual([a.deviceId, b.deviceId].sort());
    expect(list.find((d) => d.id === b.deviceId)!.current).toBe(true);
    expect(list.some((d) => d.id === stranger.deviceId)).toBe(false);

    // a stranger cannot revoke it (404, not 403) ...
    const no = await post(h, `/v1/auth/devices/${a.deviceId}/revoke`, {}, undefined, stranger.accessToken);
    expect(no.statusCode).toBe(404);
    expect((await get(h, '/v1/devices', a.accessToken)).statusCode).toBe(200);
    // ... the owner's other handset can
    const yes = await post(h, `/v1/auth/devices/${a.deviceId}/revoke`, {}, undefined, b.accessToken);
    expect(yes.statusCode).toBe(200);
    const gone = await get(h, '/v1/devices', a.accessToken);
    expect(gone.statusCode).toBe(401);
    expect(JSON.parse(gone.body).error).toBe('device_revoked');
  });

  it('needs a session', async () => {
    const h = harness();
    const r = await h.app.inject({ method: 'GET', url: '/v1/devices' });
    expect(r.statusCode).toBe(401);
  });
});
