/**
 * BETA INVITE CODES AND THE DEMO LOGIN, through the real routes (docs/auth/INVITE-CODES.md).
 *
 * In memory: the verify path, the request reply, the deletion pause, the boot guards and the demo login.
 * The database half (the CLI, the audit trail, the atomic ticket cap, the sweep and the purge) is
 * `invite-cli.spec.ts`. Every test here fails without the change it names; the ones that matter most
 * were proven by reverting the key line (see the report). Time is injected, never slept.
 */
import { describe, it, expect } from 'vitest';
import { buildApp, type AppDeps } from '../src/app.ts';
import { memoryRepo } from '../src/db/memory.ts';
import { memoryOtpStore, INVITE_MODE_REPLY } from '../src/auth/routes.ts';
import type { OtpKind } from '../src/auth/otp-store.ts';
import { hashOtp } from '../src/auth/tokens.ts';
import { requestOtp } from '../src/auth/otp-flow.ts';
import { loadConfig, parseAuthMode } from '../src/config.ts';
import { parseDemoLogin } from '../src/auth/demo.ts';
import { smsPortFor } from '../src/sms/for-mode.ts';
import { StubSmsPort } from '../src/sms/stub.ts';
import { INVITE_NEW_TTL_SECONDS, INVITE_RECOVERY_TTL_SECONDS } from '../src/admin/invite-store.ts';
import { NOTICE_VERSION } from '../src/dpdp/routes.ts';
import { testDeps, KEY, T0 } from './_deps.ts';

const PHONE = '+919876500001';
const OTHER = '+919876500002';
const NEW_CODE = '48210937';
const DEMO_PHONE = '+919999900001';
const DEMO_CODE = '24681357';
const JSON_H = { 'content-type': 'application/json' };

function harness(over: Partial<AppDeps> = {}) {
  const clock = { value: T0 };
  const logLines: string[] = [];
  const sms = new StubSmsPort();
  const deps = testDeps({
    now: () => clock.value,
    sms,
    logLevel: 'info',
    logStream: { write: (c: string) => void logLines.push(c) },
    ...over,
  });
  const app = buildApp(deps);
  const advance = (s: number) => {
    clock.value = new Date(Date.parse(clock.value) + s * 1000).toISOString();
  };
  const post = (url: string, payload: unknown) =>
    app.inject({ method: 'POST', url, headers: JSON_H, payload: JSON.stringify(payload) });
  const request = (phone: string) => post('/v1/auth/otp/request', { phone, language: 'en' });
  const verify = (phone: string, code: string, extra: object = {}) =>
    post('/v1/auth/otp/verify', {
      phone,
      code,
      device: { platform: 'android' },
      shopName: 'Invited Shop',
      consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' },
      ...extra,
    });
  /** What the invite CLI writes: a pending row of an invite kind, hash only. */
  const plant = async (phone: string, code: string, kind: OtpKind, ttlSeconds: number) =>
    deps.otp.put(
      {
        phone,
        hash: hashOtp(KEY, phone, code),
        expiresAt: new Date(Date.parse(clock.value) + ttlSeconds * 1000).toISOString(),
        attempts: 0,
        createdAt: clock.value,
        kind,
      },
      0,
    );
  return { deps, app, sms, clock, advance, post, request, verify, plant, logLines };
}

describe('invite verify', () => {
  it('signs a new shop in, once: the second use of the same code is 401', async () => {
    const h = harness();
    await h.plant(PHONE, NEW_CODE, 'invite_new', INVITE_NEW_TTL_SECONDS);
    const first = await h.verify(PHONE, NEW_CODE);
    expect(first.statusCode).toBe(200);
    expect(first.json().accessToken).toBeTruthy();
    const second = await h.verify(PHONE, NEW_CODE);
    expect(second.statusCode).toBe(401);
    expect(second.json()).toEqual({ error: 'code_invalid' });
  });

  it('five wrong guesses kill the code: the right one afterwards is 401', async () => {
    const h = harness();
    await h.plant(PHONE, NEW_CODE, 'invite_new', INVITE_NEW_TTL_SECONDS);
    for (let i = 0; i < 5; i += 1) expect((await h.verify(PHONE, '00000000')).statusCode).toBe(401);
    expect((await h.verify(PHONE, NEW_CODE)).statusCode).toBe(401);
  });

  it('a recovery code expires after 24 hours and a new-shop code after 7 days', async () => {
    expect(INVITE_RECOVERY_TTL_SECONDS).toBe(24 * 3600);
    expect(INVITE_NEW_TTL_SECONDS).toBe(7 * 24 * 3600);
    for (const [kind, ttl, user] of [
      ['invite_recovery', INVITE_RECOVERY_TTL_SECONDS, true],
      ['invite_new', INVITE_NEW_TTL_SECONDS, false],
    ] as const) {
      const inside = harness();
      const outside = harness();
      for (const h of [inside, outside]) {
        if (user) await h.deps.repo.createShopAndUser({ shopId: 's1', userId: 'u1', phone: PHONE, shopName: 'S', language: 'en', now: T0 });
        await h.plant(PHONE, NEW_CODE, kind, ttl);
      }
      inside.advance(ttl - 1);
      outside.advance(ttl + 1);
      expect((await inside.verify(PHONE, NEW_CODE)).statusCode, kind + ' inside').toBe(200);
      expect((await outside.verify(PHONE, NEW_CODE)).statusCode, kind + ' outside').toBe(401);
    }
  });

  it('a code for number X used on number Y is 401', async () => {
    const h = harness();
    await h.plant(PHONE, NEW_CODE, 'invite_new', INVITE_NEW_TTL_SECONDS);
    expect((await h.verify(OTHER, NEW_CODE)).statusCode).toBe(401);
  });

  it('a WRONG-PURPOSE code fails closed: invite_new on an existing account, invite_recovery on none; row spent, no tokens', async () => {
    for (const [kind, hasAccount] of [['invite_new', true], ['invite_recovery', false]] as const) {
      const h = harness();
      if (hasAccount) await h.deps.repo.createShopAndUser({ shopId: 's1', userId: 'u1', phone: PHONE, shopName: 'S', language: 'en', now: T0 });
      await h.plant(PHONE, NEW_CODE, kind, INVITE_NEW_TTL_SECONDS);
      const res = await h.verify(PHONE, NEW_CODE);
      expect(res.statusCode, kind).toBe(401);
      expect(res.json()).toEqual({ error: 'code_invalid' });
      expect(res.body).not.toContain('accessToken');
      expect(await h.deps.otp.get(PHONE, h.clock.value), kind + ' row spent').toBeNull();
      expect(h.logLines.join('')).toContain('invite_refused_kind');
    }
  });

  it('a recovery code signs an existing account in on a new device', async () => {
    const h = harness();
    await h.deps.repo.createShopAndUser({ shopId: 's1', userId: 'u1', phone: PHONE, shopName: 'S', language: 'en', now: T0 });
    await h.plant(PHONE, NEW_CODE, 'invite_recovery', INVITE_RECOVERY_TTL_SECONDS);
    const res = await h.verify(PHONE, NEW_CODE, { consent: undefined, shopName: undefined });
    expect(res.statusCode).toBe(200);
    expect(res.json().shopId).toBe('s1');
  });
});

describe('a code request cannot overwrite a live invite (the store clause)', () => {
  it('requesting a code for a number holding a live invite leaves the invite verifying', async () => {
    const h = harness();
    await h.plant(PHONE, NEW_CODE, 'invite_new', INVITE_NEW_TTL_SECONDS);
    h.advance(3600); // well past the resend cooldown, so only the kind protects the row
    expect((await h.request(PHONE)).statusCode).toBe(202);
    expect(h.sms.count()).toBe(0);
    expect((await h.verify(PHONE, NEW_CODE)).statusCode).toBe(200);
  });
});

describe('invite mode: the request reply', () => {
  const inviteDeps = () => {
    const calls: string[] = [];
    const count = <T extends object>(name: string, o: T): T =>
      new Proxy(o, {
        get(t, k) {
          const v = Reflect.get(t, k);
          return typeof v === 'function' ? (...a: unknown[]) => (calls.push(name + '.' + String(k)), v.apply(t, a)) : v;
        },
      });
    const base = testDeps();
    return { calls, deps: { ...base, repo: count('repo', base.repo), otp: count('otp', base.otp), rate: count('rate', base.rate), authMode: 'invite' as const } };
  };

  it('is the constant 202 {sent:false, mode:"invite", digits:8}, identical for no account, an account and a live invite, with no database access', async () => {
    const { calls, deps } = inviteDeps();
    const app = buildApp(deps);
    await deps.repo.createShopAndUser({ shopId: 's1', userId: 'u1', phone: PHONE, shopName: 'S', language: 'en', now: T0 });
    await deps.otp.put({ phone: OTHER, hash: 'h', expiresAt: '2026-09-26T08:00:00.000Z', attempts: 0, createdAt: T0, kind: 'invite_new' }, 0);
    const rowBefore = JSON.stringify(await deps.otp.get(OTHER, T0));
    calls.length = 0;
    const bodies: string[] = [];
    for (const phone of [PHONE, OTHER, '+919876500003']) {
      const res = await app.inject({ method: 'POST', url: '/v1/auth/otp/request', headers: JSON_H, payload: JSON.stringify({ phone, language: 'en' }) });
      expect(res.statusCode).toBe(202);
      bodies.push(res.body);
    }
    expect(new Set(bodies).size).toBe(1);
    expect(JSON.parse(bodies[0]!)).toEqual({ sent: false, mode: 'invite', digits: 8 });
    expect(INVITE_MODE_REPLY).toEqual({ sent: false, mode: 'invite', digits: 8 });
    expect(calls).toEqual([]); // no repo read, no limiter write, no store call
    expect(JSON.stringify(await deps.otp.get(OTHER, T0))).toBe(rowBefore); // the invite is byte-unchanged
  });

  it('still refuses a malformed number with the usual 400 (a shape, not membership)', async () => {
    const app = buildApp({ ...testDeps(), authMode: 'invite' });
    const res = await app.inject({ method: 'POST', url: '/v1/auth/otp/request', headers: JSON_H, payload: JSON.stringify({ phone: 'abcdefghij', language: 'en' }) });
    expect(res.statusCode).toBe(400);
  });

  it('sms mode is unchanged: it mints, sends and says sent:true', async () => {
    const h = harness({ authMode: 'sms' });
    const res = await h.request(PHONE);
    expect(res.statusCode).toBe(202);
    expect(res.json()).toMatchObject({ sent: true, digits: 6 });
  });
});

describe('invite mode: web deletion is paused', () => {
  it('answers a constant paused reply, writes nothing and reaches no message port', async () => {
    const throwing = smsPortFor('invite', () => {
      throw new Error('the stub must never be built in invite mode');
    });
    const h = harness({ authMode: 'invite', sms: throwing });
    await h.deps.repo.createShopAndUser({ shopId: 's1', userId: 'u1', phone: PHONE, shopName: 'S', language: 'en', now: T0 });
    const a = await h.post('/v1/deletion/request', { phone: PHONE, language: 'en' });
    const b = await h.post('/v1/deletion/request', { phone: OTHER, language: 'en' });
    expect(a.statusCode).toBe(202);
    expect(a.body).toBe(b.body);
    expect(a.json()).toEqual({ sent: false, mode: 'invite', paused: true });
    expect(await h.deps.otp.get('delete:' + PHONE, T0)).toBeNull();
  });

  it('in sms mode the deletion request is unchanged', async () => {
    const h = harness({ authMode: 'sms' });
    const res = await h.post('/v1/deletion/request', { phone: PHONE, language: 'en' });
    expect(res.json()).toMatchObject({ sent: true });
  });
});

describe('AUTH_MODE boot guards', () => {
  const base = { DATABASE_URL: 'postgres://u@h/db', SESSION_SIGNING_KEY: KEY, RATE_LIMIT_KEY: 'test-bucket-key-16+' } as NodeJS.ProcessEnv;
  const prod = { ...base, NODE_ENV: 'production', SYSTEM_DATABASE_URL: 'postgres://s@h/db' } as NodeJS.ProcessEnv;

  it('unset is refused in production and with NODE_ENV unset, and defaults to sms elsewhere', () => {
    expect(() => loadConfig(prod)).toThrow(/AUTH_MODE/);
    expect(() => loadConfig(base)).toThrow(/AUTH_MODE/);
    expect(loadConfig({ ...base, NODE_ENV: 'development' } as NodeJS.ProcessEnv).authMode).toBe('sms');
  });

  it('only the exact words invite and sms are accepted; a blank or near miss is refused, naming the variable only', () => {
    for (const bad of ['Invite', 'INVITE', 'otp', 'true', '', '  ', 'invite ']) {
      expect(() => loadConfig({ ...prod, AUTH_MODE: bad } as NodeJS.ProcessEnv), JSON.stringify(bad)).toThrow(/AUTH_MODE/);
    }
    expect(loadConfig({ ...prod, AUTH_MODE: 'invite' } as NodeJS.ProcessEnv).authMode).toBe('invite');
    expect(loadConfig({ ...prod, AUTH_MODE: 'sms' } as NodeJS.ProcessEnv).authMode).toBe('sms');
    expect(() => parseAuthMode({ AUTH_MODE: 'nope' }, false)).toThrow(/AUTH_MODE must/);
  });

  it('ALLOW_STUB_SMS has no effect in invite mode; the invite port throws and the stub is never built', async () => {
    const config = loadConfig({ ...prod, AUTH_MODE: 'invite', ALLOW_STUB_SMS: '1' } as NodeJS.ProcessEnv);
    let built = 0;
    const port = smsPortFor(config.authMode, () => (built += 1, new StubSmsPort()));
    expect(() => port.send({ phone: PHONE, templateId: 'otp_signin', variables: ['1'], languageTag: 'en' })).toThrow(/disabled/);
    expect(built).toBe(0);
    smsPortFor('sms', () => (built += 1, new StubSmsPort()));
    expect(built).toBe(1);
  });
});

describe('the demo login', () => {
  const demo = { phone: DEMO_PHONE, codeHash: hashOtp(KEY, DEMO_PHONE, DEMO_CODE) };
  const demoHarness = (over: Partial<AppDeps> = {}) => harness({ demo, ...over });

  it('the correct code signs in (in either AUTH_MODE) and sends nothing', async () => {
    for (const authMode of ['sms', 'invite'] as const) {
      const h = demoHarness({ authMode });
      const res = await h.verify(DEMO_PHONE, DEMO_CODE);
      expect(res.statusCode, authMode).toBe(200);
      expect(res.json().shopId).toBeTruthy();
      expect(h.sms.count()).toBe(0);
    }
  });

  it('a wrong code is 401', async () => {
    const h = demoHarness();
    const res = await h.verify(DEMO_PHONE, '11111111');
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'code_invalid' });
  });

  it('after 5 wrong attempts the demo login is refused for an hour, even with the right code, then recovers', async () => {
    const h = demoHarness();
    for (let i = 0; i < 5; i += 1) expect((await h.verify(DEMO_PHONE, '11111111')).statusCode).toBe(401);
    const locked = await h.verify(DEMO_PHONE, DEMO_CODE);
    expect(locked.statusCode).toBe(401);
    expect(locked.json()).toEqual({ error: 'code_invalid' }); // uniform: not a 429
    h.advance(3600 + 3600 + 1);
    expect((await h.verify(DEMO_PHONE, DEMO_CODE)).statusCode).toBe(200);
  });

  it('a non-demo number is unaffected: its own codes work, and demo lockouts do not touch it', async () => {
    const h = demoHarness({ authMode: 'sms' });
    for (let i = 0; i < 6; i += 1) await h.verify(DEMO_PHONE, '11111111');
    await h.plant(PHONE, NEW_CODE, 'sms', 600);
    expect((await h.verify(PHONE, NEW_CODE)).statusCode).toBe(200);
    // and the demo code is not a password for anybody else
    expect((await h.verify(OTHER, DEMO_CODE)).statusCode).toBe(401);
  });

  it('request-code for the demo number gives the same reply as for any other number, in both modes', async () => {
    for (const authMode of ['sms', 'invite'] as const) {
      const h = demoHarness({ authMode });
      const a = await h.request(DEMO_PHONE);
      const b = await h.request('+919999900002');
      expect(a.statusCode, authMode).toBe(202);
      expect(a.body, authMode).toBe(b.body);
      expect(h.sms.forPhone(DEMO_PHONE), authMode).toHaveLength(0);
    }
  });

  it('the demo code cannot confirm a web deletion (it is a sign-in key only)', async () => {
    const h = demoHarness();
    const res = await h.post('/v1/deletion/confirm', { phone: DEMO_PHONE, code: DEMO_CODE, confirm: 'DELETE' });
    expect(res.statusCode).toBe(401);
  });

  it('number change (old and new side) and the PIN reset are refused for the demo phone, and only for it', async () => {
    const h = demoHarness();
    for (const templateId of ['otp_number_change_old', 'otp_number_change_new', 'otp_pin_reset'] as const) {
      const out = await requestOtp(h.deps, { key: DEMO_PHONE, phone: DEMO_PHONE, templateId, language: 'en', ip: '10.0.0.1', user: null, send: true });
      expect(out, templateId).toEqual({ kind: 'refused' });
      const other = await requestOtp(h.deps, { key: OTHER, phone: OTHER, templateId, language: 'en', ip: '10.0.0.1', user: null, send: true });
      expect(other.kind, templateId).toBe('accepted');
    }
  });

  it('logs ONE warn line "demo login" per sign-in, with the masked number and never the code', async () => {
    const h = demoHarness();
    expect((await h.verify(DEMO_PHONE, DEMO_CODE)).statusCode).toBe(200);
    const lines = h.logLines.filter((l) => l.includes('demo login'));
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toMatchObject({ level: 40, msg: 'demo login', phoneMasked: '+91 XXXXXX0001' });
    const all = h.logLines.join('');
    expect(all).not.toContain(DEMO_CODE);
    expect(all).not.toContain(DEMO_PHONE);
  });

  it('is off with no configuration: the same number is then an ordinary number', async () => {
    const h = harness();
    expect((await h.verify(DEMO_PHONE, DEMO_CODE)).statusCode).toBe(401);
  });

  describe('boot guards', () => {
    const env = (extra: Record<string, string>) => ({ ...extra }) as NodeJS.ProcessEnv;
    const goodHash = demo.codeHash;

    it('both unset is off; both set is parsed', () => {
      expect(parseDemoLogin(env({}))).toBeNull();
      expect(parseDemoLogin(env({ DEMO_LOGIN_PHONE: '+91 99999 00001', DEMO_LOGIN_CODE_HASH: goodHash }))).toEqual(demo);
    });
    it('one without the other refuses to boot', () => {
      expect(() => parseDemoLogin(env({ DEMO_LOGIN_PHONE: DEMO_PHONE }))).toThrow(/together/);
      expect(() => parseDemoLogin(env({ DEMO_LOGIN_CODE_HASH: goodHash }))).toThrow(/together/);
    });
    it('a number outside the +91 99999 0xxxx range is refused, naming the variable and not the number', () => {
      for (const phone of ['+919812345678', '+919999910001', 'nonsense']) {
        let message = '';
        try {
          parseDemoLogin(env({ DEMO_LOGIN_PHONE: phone, DEMO_LOGIN_CODE_HASH: goodHash }));
        } catch (e) {
          message = (e as Error).message;
        }
        expect(message, phone).toMatch(/DEMO_LOGIN_PHONE/);
        expect(message).not.toContain(phone);
      }
    });
    it('a hash that is not a code hash is refused, and never printed', () => {
      for (const hash of ['12345678', 'short', goodHash + 'x', 'g'.repeat(10)]) {
        let message = '';
        try {
          parseDemoLogin(env({ DEMO_LOGIN_PHONE: DEMO_PHONE, DEMO_LOGIN_CODE_HASH: hash }));
        } catch (e) {
          message = (e as Error).message;
        }
        expect(message).toMatch(/DEMO_LOGIN_CODE_HASH/);
        expect(message).not.toContain(hash);
      }
    });
    it('loadConfig carries it through', () => {
      const config = loadConfig({ DATABASE_URL: 'postgres://u@h/db', SESSION_SIGNING_KEY: KEY, RATE_LIMIT_KEY: 'test-bucket-key-16+', AUTH_MODE: 'invite', DEMO_LOGIN_PHONE: DEMO_PHONE, DEMO_LOGIN_CODE_HASH: goodHash } as NodeJS.ProcessEnv);
      expect(config.demoLogin).toEqual(demo);
    });
  });
});

describe('F-1 a malformed code costs no attempt; F-2 validation errors say nothing about the schema', () => {
  it('a code with a space, dash or letter is a 400 BEFORE the ticket: six of them leave the invite alive and the real code signs in', async () => {
    const h = harness();
    await h.plant(PHONE, NEW_CODE, 'invite_new', INVITE_NEW_TTL_SECONDS);
    for (const typed of ['4821 0937', '4821-0937', '4821o937', '4821 0937', '48210937 ', '4821\t0937']) {
      const res = await h.verify(PHONE, typed);
      expect(res.statusCode, JSON.stringify(typed)).toBe(400);
      expect(res.json()).toMatchObject({ error: 'invalid_input' });
    }
    expect((await h.deps.otp.get(PHONE, h.clock.value))?.attempts).toBe(0);
    expect((await h.verify(PHONE, NEW_CODE)).statusCode).toBe(200);
  });

  it('a body that breaks the schema is {error:"invalid_input"} with no Ajv text and no FST_ code', async () => {
    const h = harness();
    for (const payload of [{ phone: 'x'.repeat(40), language: 'en' }, { phone: PHONE, language: 'xx' }, { phone: PHONE, language: 'en', kind: 'invite_new' }, {}]) {
      const res = await h.post('/v1/auth/otp/request', payload);
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: 'invalid_input', message: 'the request is not valid' });
      expect(res.body).not.toMatch(/FST_|must NOT|must have|body\/|additional properties/);
    }
  });
});
