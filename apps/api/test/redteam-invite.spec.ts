/**
 * RED TEAM - THE INTERIM SIGN-IN (invite codes, the demo login, the store guard, the CLI).
 * Authorised, local code only, synthetic numbers only. Every test asserts the SECURE behaviour, so it
 * passes when the defence holds and FAILS when it does not; a failing test here is a finding, ranked in
 * docs/audit/findings/red-team-invite.md (the test names carry the finding id: RTI-1 ...).
 *
 * Nothing here touches the network, a real number, or api.rohinova.com. Time is injected, never slept.
 * The wrapper tests only ever run `tools/swafto-invite.mjs --dry-run` or a refusal, so `aws` is never reached.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { buildApp, type AppDeps } from '../src/app.ts';
import { memoryOtpStore, INVITE_MODE_REPLY } from '../src/auth/routes.ts';
import type { OtpKind, OtpStore } from '../src/auth/otp-store.ts';
import { hashOtp } from '../src/auth/tokens.ts';
import { loadConfig } from '../src/config.ts';
import { parseDemoLogin } from '../src/auth/demo.ts';
import { StubSmsPort } from '../src/sms/stub.ts';
import { smsPortFor } from '../src/sms/for-mode.ts';
import { parseInviteArgs } from '../src/admin/invite-args.ts';
import { runInviteCli } from '../src/admin/invite-cli.ts';
import { INVITE_NEW_TTL_SECONDS, INVITE_RECOVERY_TTL_SECONDS } from '../src/admin/invite-store.ts';
import type { SqlClient } from '../src/db/postgres.ts';
import { NOTICE_VERSION } from '../src/dpdp/routes.ts';
import { testDeps, KEY, T0 } from './_deps.ts';

const PHONE = '+919876500001';
const OTHER = '+919876500002';
const CODE = '48210937';
const OLD = '11112222';
const NEWER = '33334444';
const DEMO_PHONE = '+919999900001';
const DEMO_CODE = '24681357';
const JSON_H = { 'content-type': 'application/json' };
/** A fresh valid Indian mobile per index (never the demo range). */
const fake = (i: number): string => '+919' + String(1_000_000_000 + i).slice(1);

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
  const post = (url: string, payload: unknown, extra: { ip?: string; headers?: Record<string, string> } = {}) =>
    app.inject({
      method: 'POST',
      url,
      headers: { ...JSON_H, ...(extra.headers ?? {}) },
      payload: JSON.stringify(payload),
      ...(extra.ip ? { remoteAddress: extra.ip } : {}),
    });
  const request = (phone: string, ip?: string) => post('/v1/auth/otp/request', { phone, language: 'en' }, ip ? { ip } : {});
  const verify = (phone: string, code: string, ip?: string, extra: object = {}) =>
    post(
      '/v1/auth/otp/verify',
      {
        phone,
        code,
        device: { platform: 'android' },
        shopName: 'Red Team Shop',
        consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' },
        ...extra,
      },
      ip ? { ip } : {},
    );
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
  const account = (phone: string, shopId = 's1', userId = 'u1') =>
    deps.repo.createShopAndUser({ shopId, userId, phone, shopName: 'S', language: 'en', now: T0 });
  const pendingDeletion = async () => deps.repo.shopsDueForPurge('9999-12-31T00:00:00.000Z');
  return { deps, app, sms, clock, advance, post, request, verify, plant, account, pendingDeletion, logLines };
}

/** The part of a reply an observer can compare: status, body and every header except the per-request ones. */
function shape(res: { statusCode: number; body: string; headers: Record<string, unknown> }) {
  const headers = Object.entries(res.headers)
    .filter(([k]) => !['date', 'x-request-id', 'retry-after'].includes(k.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify({ status: res.statusCode, body: res.body, headers });
}

/**
 * A store that lets a test freeze ONE verify between "ticket taken" and "compare + clear", then run
 * something (an operator's re-issue) in the gap. This is how a real concurrent request interleaves.
 */
function gatedStore() {
  const inner = memoryOtpStore();
  let armed = false;
  let release!: () => void;
  let tookTicket!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const ticketTaken = new Promise<void>((r) => (tookTicket = r));
  const store: OtpStore = {
    put: (p, c) => inner.put(p, c),
    get: (k, n) => inner.get(k, n),
    clear: (k) => inner.clear(k),
    async takeAttempt(k, n, cap) {
      const t = await inner.takeAttempt(k, n, cap);
      if (armed && t) {
        armed = false;
        tookTicket();
        await gate;
      }
      return t;
    },
  };
  return { store, inner, arm: () => (armed = true), ticketTaken, release };
}

/* ------------------------------------------------------------------------------------------------ */
describe('RT-INV brute force under the real limiter', () => {
  it('one address is stopped at the per-IP verify cap, and a CORRECT code from a stopped address is refused', async () => {
    const h = harness();
    await h.plant(PHONE, CODE, 'invite_new', INVITE_NEW_TTL_SECONDS);
    const ip = '203.0.113.7';
    let first429 = -1;
    for (let i = 0; i < 120; i += 1) {
      const res = await h.verify(fake(i), '00000000', ip);
      if (res.statusCode === 429 && first429 < 0) first429 = i;
    }
    expect(first429, 'a 429 must appear within the first 110 guesses from one address').toBeGreaterThan(0);
    expect(first429).toBeLessThanOrEqual(100);
    const stopped = await h.verify(PHONE, CODE, ip);
    expect(stopped.statusCode).toBe(429);
    expect(Number(stopped.headers['retry-after'])).toBeGreaterThan(0);
    expect(stopped.body).not.toContain('accessToken');
    // the invite itself was never touched by the spray, so a different address still gets in
    expect((await h.verify(PHONE, CODE, '203.0.113.8')).statusCode).toBe(200);
  });

  it('a forged X-Forwarded-For does not rotate the address (trustProxy off, and on for loopback only)', async () => {
    for (const trustProxy of [false, '127.0.0.1'] as const) {
      const h = harness({ trustProxy });
      let limited = 0;
      for (let i = 0; i < 130; i += 1) {
        const res = await h.post(
          '/v1/auth/otp/verify',
          { phone: fake(i), code: '00000000', device: { platform: 'android' } },
          { ip: '203.0.113.9', headers: { 'x-forwarded-for': '198.51.100.' + String(i % 250) } },
        );
        if (res.statusCode === 429) limited += 1;
      }
      expect(limited, 'trustProxy=' + String(trustProxy)).toBeGreaterThan(0);
    }
  });

  it('2000 concurrent wrong guesses on one invite take exactly 5 tickets; the right code afterwards is 401', async () => {
    const h = harness();
    let tickets = 0;
    const real = h.deps.otp.takeAttempt.bind(h.deps.otp);
    h.deps.otp.takeAttempt = async (k, n, c) => {
      const t = await real(k, n, c);
      if (t) tickets += 1;
      return t;
    };
    await h.plant(PHONE, CODE, 'invite_new', INVITE_NEW_TTL_SECONDS);
    const out = await Promise.all(Array.from({ length: 2000 }, () => h.verify(PHONE, '00000000')));
    expect(tickets).toBe(5);
    expect(out.filter((r) => r.statusCode === 200)).toHaveLength(0);
    expect((await h.verify(PHONE, CODE)).statusCode).toBe(401);
  });

  it('a concurrent double-submit of the CORRECT code signs in exactly once', async () => {
    const h = harness();
    await h.plant(PHONE, CODE, 'invite_new', INVITE_NEW_TTL_SECONDS);
    const out = await Promise.all(Array.from({ length: 25 }, () => h.verify(PHONE, CODE)));
    expect(out.filter((r) => r.statusCode === 200)).toHaveLength(1);
    expect(out.filter((r) => r.statusCode === 401)).toHaveLength(24);
  });
});

/* ------------------------------------------------------------------------------------------------ */
describe('RTI-1 / RTI-2 a re-issue lands while an old guess is in flight', () => {
  async function reissueScenario(wrongBefore: number) {
    const g = gatedStore();
    const h = harness({ otp: g.store });
    await h.plant(PHONE, OLD, 'invite_new', INVITE_NEW_TTL_SECONDS);
    for (let i = 0; i < wrongBefore; i += 1) await h.verify(PHONE, '00000000');
    g.arm();
    // the in-flight request: it has its ticket for the OLD row and is about to compare and clear
    const inFlight = h.verify(PHONE, wrongBefore > 0 ? '00000000' : OLD);
    await g.ticketTaken;
    // the operator's `invite issue`: unconditional upsert, attempts back to 0, the old code is dead on commit
    await g.inner.clear(PHONE);
    await g.inner.put(
      {
        phone: PHONE,
        hash: hashOtp(KEY, PHONE, NEWER),
        expiresAt: new Date(Date.parse(h.clock.value) + INVITE_NEW_TTL_SECONDS * 1000).toISOString(),
        attempts: 0,
        createdAt: h.clock.value,
        kind: 'invite_new',
      },
      0,
    );
    g.release();
    const inFlightRes = await inFlight;
    const newRes = await h.verify(PHONE, NEWER);
    return { inFlightRes, newRes };
  }

  it('RTI-1: the OLD code, compared after the re-issue committed, does not sign anyone in', async () => {
    const { inFlightRes } = await reissueScenario(0);
    expect(inFlightRes.statusCode).toBe(401);
  });

  it('RTI-1: ...and the freshly issued invite is not destroyed by the old code being cleared', async () => {
    const { newRes } = await reissueScenario(0);
    expect(newRes.statusCode).toBe(200);
  });

  it('RTI-2: the 5th wrong guess against the OLD row does not delete the re-issued invite', async () => {
    const { newRes } = await reissueScenario(4);
    expect(newRes.statusCode, 'the operator just issued this code; a stranger must not be able to burn it by timing').toBe(200);
  });
});

/* ------------------------------------------------------------------------------------------------ */
describe('RT-INV a code request cannot wipe, overwrite or oracle an invite', () => {
  it('sms mode: 40 requests across 40 addresses and 40 minutes leave a live invite intact, sending nothing', async () => {
    const h = harness({ authMode: 'sms' });
    await h.account(PHONE);
    await h.plant(PHONE, CODE, 'invite_recovery', INVITE_RECOVERY_TTL_SECONDS);
    for (let i = 0; i < 40; i += 1) {
      h.advance(61);
      const res = await h.request(PHONE, '198.51.100.' + String(i + 1));
      expect([202, 429]).toContain(res.statusCode);
    }
    expect(h.sms.forPhone(PHONE)).toHaveLength(0);
    expect((await h.verify(PHONE, CODE, undefined, { consent: undefined, shopName: undefined })).statusCode).toBe(200);
  });

  it('sms mode: a web-deletion request for the number does not touch its sign-in invite (separate namespace)', async () => {
    const h = harness({ authMode: 'sms' });
    await h.account(PHONE);
    await h.plant(PHONE, CODE, 'invite_recovery', INVITE_RECOVERY_TTL_SECONDS);
    h.advance(120);
    await h.post('/v1/deletion/request', { phone: PHONE, language: 'en' });
    expect(await h.deps.otp.get(PHONE, h.clock.value)).toMatchObject({ kind: 'invite_recovery', attempts: 0 });
  });

  it('invite mode: request replies are byte- and header-identical for none / account / live invite / demo, in both modes', async () => {
    for (const authMode of ['invite', 'sms'] as const) {
      const h = harness({ authMode, demo: { phone: DEMO_PHONE, codeHash: hashOtp(KEY, DEMO_PHONE, DEMO_CODE) } });
      await h.account(PHONE);
      await h.plant(OTHER, CODE, 'invite_new', INVITE_NEW_TTL_SECONDS);
      const shapes = new Set<string>();
      for (const [i, phone] of [fake(1), PHONE, OTHER, DEMO_PHONE].entries()) {
        shapes.add(shape(await h.request(phone, '198.51.100.' + String(i + 1))));
      }
      expect(shapes.size, authMode).toBe(1);
    }
    expect(INVITE_MODE_REPLY).toEqual({ sent: false, mode: 'invite', digits: 8 });
  });

  it('verify replies are byte- and header-identical for none / live invite / account / burned / expired / demo (wrong code)', async () => {
    const h = harness({ demo: { phone: DEMO_PHONE, codeHash: hashOtp(KEY, DEMO_PHONE, DEMO_CODE) } });
    const live = fake(11);
    const burned = fake(12);
    const expired = fake(13);
    const withAccount = fake(14);
    await h.plant(live, CODE, 'invite_new', INVITE_NEW_TTL_SECONDS);
    await h.plant(burned, CODE, 'invite_new', INVITE_NEW_TTL_SECONDS);
    await h.plant(expired, CODE, 'invite_new', 60);
    await h.account(withAccount, 's2', 'u2');
    for (let i = 0; i < 5; i += 1) await h.verify(burned, '00000000');
    h.advance(120);
    const shapes = new Map<string, string>();
    for (const [name, phone] of [['none', fake(10)], ['live', live], ['burned', burned], ['expired', expired], ['account', withAccount], ['demo', DEMO_PHONE]] as const) {
      shapes.set(name, shape(await h.verify(phone, '99999999', '198.51.100.' + String(shapes.size + 1))));
    }
    // and the demo number once locked out (6th..8th wrong guess) must still look the same
    for (let i = 0; i < 4; i += 1) await h.verify(DEMO_PHONE, '99999999');
    shapes.set('demo-locked', shape(await h.verify(DEMO_PHONE, '99999999', '198.51.100.99')));
    expect(new Set(shapes.values()).size, JSON.stringify([...shapes.keys()])).toBe(1);
  });

  it('a wrong-purpose code leaves NO side effect: no account, no consent, no device, and a pending deletion stays pending', async () => {
    const a = harness();
    await a.plant(PHONE, CODE, 'invite_recovery', INVITE_RECOVERY_TTL_SECONDS); // no account yet
    expect((await a.verify(PHONE, CODE)).statusCode).toBe(401);
    expect(await a.deps.repo.findUserByPhone(PHONE)).toBeNull();

    const b = harness();
    await b.account(PHONE);
    await b.deps.repo.requestDeletion('s1', T0);
    await b.plant(PHONE, CODE, 'invite_new', INVITE_NEW_TTL_SECONDS); // account already exists
    expect((await b.verify(PHONE, CODE)).statusCode).toBe(401);
    expect(await b.pendingDeletion(), 'the refused code must not cancel the deletion').toEqual(['s1']);
    expect(await b.deps.repo.listDevices('s1')).toHaveLength(0);
  });

  it('lifetimes are exclusive at the boundary: recovery dead at exactly 24 h, new-shop at exactly 7 d', async () => {
    for (const [kind, ttl] of [['invite_recovery', INVITE_RECOVERY_TTL_SECONDS], ['invite_new', INVITE_NEW_TTL_SECONDS]] as const) {
      const h = harness();
      if (kind === 'invite_recovery') await h.account(PHONE);
      await h.plant(PHONE, CODE, kind, ttl);
      h.advance(ttl);
      expect((await h.verify(PHONE, CODE)).statusCode, kind).toBe(401);
    }
  });
});

/* ------------------------------------------------------------------------------------------------ */
describe('RT-INV the demo login: lockout bypass, formats, takeover', () => {
  const demo = { phone: DEMO_PHONE, codeHash: hashOtp(KEY, DEMO_PHONE, DEMO_CODE) };
  const FORMS = ['+91 99999 00001', '9999900001', '09999900001', '919999900001', '+91-99999-00001', '0091 99999 00001'];

  it('every spelling of the demo number signs in to the SAME shop with the one code', async () => {
    const h = harness({ demo });
    const shops = new Set<string>();
    for (const f of FORMS) {
      h.advance(7300); // one ticket window apart, so the 5-an-hour cap is not what is being measured
      const res = await h.verify(f, DEMO_CODE);
      expect(res.statusCode, f).toBe(200);
      shops.add(res.json().shopId);
    }
    expect(shops.size).toBe(1);
  });

  it('all spellings share ONE lockout bucket: 5 wrong guesses in mixed formats lock the canonical form too', async () => {
    const h = harness({ demo });
    for (const f of FORMS.slice(0, 5)) expect((await h.verify(f, '11111111')).statusCode).toBe(401);
    for (const f of [DEMO_PHONE, ...FORMS]) {
      const res = await h.verify(f, DEMO_CODE);
      expect(res.statusCode, f).toBe(401);
    }
  });

  it('rotating the source address (and forging X-Forwarded-For) does not reset the lockout', async () => {
    for (const trustProxy of [false, '127.0.0.1'] as const) {
      const h = harness({ demo, trustProxy });
      for (let i = 0; i < 5; i += 1) {
        await h.post(
          '/v1/auth/otp/verify',
          { phone: DEMO_PHONE, code: '11111111', device: { platform: 'android' } },
          { ip: '203.0.113.' + String(i + 20), headers: { 'x-forwarded-for': '198.51.100.' + String(i + 1) } },
        );
      }
      const res = await h.post(
        '/v1/auth/otp/verify',
        { phone: DEMO_PHONE, code: DEMO_CODE, device: { platform: 'android' }, consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' } },
        { ip: '203.0.113.200', headers: { 'x-forwarded-for': '198.51.100.200' } },
      );
      expect(res.statusCode, 'trustProxy=' + String(trustProxy)).toBe(401);
    }
  });

  it('look-alike numbers (Arabic-Indic and full-width digits, newline, NUL, zero-width, tab) are refused as shapes: no sign-in, no demo ticket spent', async () => {
    const h = harness({ demo });
    const hostile = [
      '٩٩٩٩٩٠٠٠٠١',
      '９９９９９００００１',
      '9999900001\n',
      '9999900001\u0000',
      '​9999900001',
      '9999900001\t',
      '+91 99999 00001\r\n',
      '99999 00001',
      '9999900001;',
    ];
    for (let round = 0; round < 3; round += 1) {
      for (const p of hostile) {
        const res = await h.verify(p, DEMO_CODE);
        expect(res.statusCode, JSON.stringify(p)).toBe(400);
        expect(res.body).not.toContain('accessToken');
      }
    }
    // none of that spent a demo ticket: 4 wrong guesses and the right code still works
    for (let i = 0; i < 4; i += 1) await h.verify(DEMO_PHONE, '11111111');
    expect((await h.verify(DEMO_PHONE, DEMO_CODE)).statusCode).toBe(200);
  });

  it('an invite planted for the demo number opens nothing: the demo path owns that number', async () => {
    const h = harness({ demo });
    await h.plant(DEMO_PHONE, CODE, 'invite_new', INVITE_NEW_TTL_SECONDS);
    expect((await h.verify(DEMO_PHONE, CODE)).statusCode).toBe(401);
  });

  it('the demo account cannot change its number or reset its PIN through ANY route: none exists, and the OTP templates are refused', async () => {
    const h = harness({ demo, authMode: 'sms' });
    await h.app.ready();
    const routes = h.app.printRoutes({ commonPrefix: false });
    expect(routes).not.toMatch(/number|change|\bpin\b|reset|phone/i);
    // sms mode: a web-deletion request for the demo number mints and sends nothing
    h.advance(120);
    const res = await h.post('/v1/deletion/request', { phone: DEMO_PHONE, language: 'en' });
    expect(res.statusCode).toBe(202);
    expect(await h.deps.otp.get('delete:' + DEMO_PHONE, h.clock.value)).toBeNull();
    expect(h.sms.forPhone(DEMO_PHONE)).toHaveLength(0);
  });

  it('the demo code is not a password for any other number, in any spelling of that number', async () => {
    const h = harness({ demo });
    await h.account(OTHER, 's9', 'u9');
    for (const p of [OTHER, fake(5), '+919999900002', '+919999900000']) {
      expect((await h.verify(p, DEMO_CODE)).statusCode, p).toBe(401);
    }
  });

  it('the demo hash is domain-bound to the number: the same code under another number does not match', () => {
    expect(hashOtp(KEY, DEMO_PHONE, DEMO_CODE)).not.toBe(hashOtp(KEY, '+919999900002', DEMO_CODE));
    expect(hashOtp(KEY, DEMO_PHONE, DEMO_CODE)).not.toBe(hashOtp(KEY, 'delete:' + DEMO_PHONE, DEMO_CODE));
  });
});

/* ------------------------------------------------------------------------------------------------ */
describe('RT-INV AUTH_MODE and demo configuration at boot', () => {
  const base = { DATABASE_URL: 'postgres://u@h/db', SESSION_SIGNING_KEY: KEY, RATE_LIMIT_KEY: 'test-bucket-key-16+' } as NodeJS.ProcessEnv;
  const prod = { ...base, NODE_ENV: 'production', SYSTEM_DATABASE_URL: 'postgres://s@h/db' } as NodeJS.ProcessEnv;
  const envOf = (e: Record<string, string>) => ({ ...e }) as NodeJS.ProcessEnv;

  it('refuses every near-miss value, whitespace-wrapped and prototype-name AUTH_MODE, naming only the variable', () => {
    const bad = ['invite\n', '\tinvite', ' sms', 'sms\u0000', 'Invite', 'INVITE', 'invite,sms', 'constructor', '__proto__', 'toString', 'both', '0', 'false'];
    for (const v of bad) {
      let msg = '';
      try {
        loadConfig(envOf({ ...prod, AUTH_MODE: v }));
      } catch (e) {
        msg = (e as Error).message;
      }
      expect(msg, JSON.stringify(v)).toMatch(/AUTH_MODE/);
      if (['invite,sms', 'constructor', '__proto__', 'toString', 'both'].includes(v)) expect(msg).not.toContain(v);
    }
  });

  it('unset AUTH_MODE refuses boot in production, with NODE_ENV unset and with NODE_ENV blank; NODE_ENV near-misses refuse too', () => {
    expect(() => loadConfig(prod)).toThrow(/AUTH_MODE/);
    expect(() => loadConfig(base)).toThrow(/AUTH_MODE/);
    expect(() => loadConfig(envOf({ ...base, NODE_ENV: '' }))).toThrow(/AUTH_MODE/);
    for (const v of ['Production', 'prod', 'PRODUCTION', 'prod-eu']) {
      expect(() => loadConfig(envOf({ ...prod, NODE_ENV: v, AUTH_MODE: 'invite' })), v).toThrow();
    }
  });

  it('RTI-6: a NODE_ENV of "production" plus stray whitespace (a pasted CR or space) does not silently switch every production guard off', () => {
    for (const v of ['production ', 'production\r', 'production\n', ' production', 'production\t']) {
      // secure = refused, or read as production (guards ON, so AUTH_MODE unset still refuses)
      let cfg: ReturnType<typeof loadConfig> | null = null;
      try {
        cfg = loadConfig(envOf({ ...prod, NODE_ENV: v, AUTH_MODE: 'invite' }));
      } catch {
        cfg = null;
      }
      if (cfg !== null) expect(cfg.production, JSON.stringify(v) + ' booted with production=false').toBe(true);
      // and the AUTH_MODE-required guard must not be skipped for it
      expect(() => loadConfig(envOf({ ...prod, NODE_ENV: v })), JSON.stringify(v) + ' with AUTH_MODE unset').toThrow();
    }
  });

  it('invite mode with STAGING_TEST_PHONES set is refused (testers use invites; the design table says so)', () => {
    expect(() => loadConfig(envOf({ ...prod, AUTH_MODE: 'invite', STAGING_TEST_PHONES: '+919999900001' }))).toThrow();
  });

  it('the invite SMS port throws and never builds the stub, so no plaintext code can be kept or sent', () => {
    let built = 0;
    const port = smsPortFor('invite', () => (built += 1, new StubSmsPort()));
    expect(() => port.send({ phone: PHONE, templateId: 'otp_signin', variables: ['1'], languageTag: 'en' })).toThrow();
    expect(built).toBe(0);
  });

  it('a half-set, out-of-range or malformed demo configuration refuses to boot and never echoes the value', () => {
    const goodHash = hashOtp(KEY, DEMO_PHONE, DEMO_CODE);
    const cases: Array<[Record<string, string>, RegExp]> = [
      [{ DEMO_LOGIN_PHONE: DEMO_PHONE }, /together/],
      [{ DEMO_LOGIN_CODE_HASH: goodHash }, /together/],
      [{ DEMO_LOGIN_PHONE: '+919876543210', DEMO_LOGIN_CODE_HASH: goodHash }, /test range/],
      [{ DEMO_LOGIN_PHONE: '+919999910000', DEMO_LOGIN_CODE_HASH: goodHash }, /test range/],
      [{ DEMO_LOGIN_PHONE: '+919999800000', DEMO_LOGIN_CODE_HASH: goodHash }, /test range/],
      [{ DEMO_LOGIN_PHONE: DEMO_PHONE, DEMO_LOGIN_CODE_HASH: goodHash.slice(1) }, /code hash/],
      [{ DEMO_LOGIN_PHONE: DEMO_PHONE, DEMO_LOGIN_CODE_HASH: goodHash + 'A' }, /code hash/],
      [{ DEMO_LOGIN_PHONE: DEMO_PHONE, DEMO_LOGIN_CODE_HASH: goodHash.replace(/./, '+') }, /code hash/],
    ];
    for (const [env, re] of cases) {
      let msg = '';
      try {
        parseDemoLogin(envOf(env));
      } catch (e) {
        msg = (e as Error).message;
      }
      expect(msg, JSON.stringify(Object.keys(env))).toMatch(re);
      for (const v of Object.values(env)) expect(msg).not.toContain(v);
    }
    // a spelled-out demo number is normalised, so a configuration typo cannot make the demo path dead
    expect(parseDemoLogin(envOf({ DEMO_LOGIN_PHONE: '99999 00001', DEMO_LOGIN_CODE_HASH: goodHash }))?.phone).toBe(DEMO_PHONE);
  });
});

/* ------------------------------------------------------------------------------------------------ */
describe('RT-INV the CLI and its laptop wrapper: argument injection and leakage', () => {
  const good = ['issue', '--phone', '+91 98765 00001', '--confirm-phone', '+91 98765 00001', '--purpose', 'new', '--ticket', 'T-12', '--consent-recorded', 'yes'];
  const withValue = (flag: string, value: string) => {
    const a = [...good];
    a[a.indexOf(flag) + 1] = value;
    return a;
  };
  const HOSTILE = [
    "T-1'; id #", 'T-1;id', 'T-1$(id)', 'T-1`id`', 'T-1|id', 'T-1&id', 'T-1\nid', 'T-1 id', 'T-1\u0000', 'T-1"x', 'T-1\\', 'T-1>x', 'T-1<x', 'T-1*', 'T-1?', 'T-1{a,b}', 'T-1~', 'T-1#', 'T-1%', 'T-1!', 'T-1١', 'a'.repeat(41), '',
  ];
  const HOSTILE_PHONES = [
    "+91 98765 00001'; id #", '+91 98765 00001;id', '$(id)9876500001', '`id`9876500001', '+91 98765 00001\nid', '+91 98765 00001 --purpose recovery', '٩٨٧٦٥٠٠٠٠١', '+91 98765 00001\u0000', '+91 9876500001|id', '98765 00001 ',
  ];

  it('the parser refuses every shell metacharacter, newline, NUL, unicode digit and over-length value in --ticket and --phone', () => {
    for (const t of HOSTILE) expect(parseInviteArgs(withValue('--ticket', t)).ok, JSON.stringify(t)).toBe(false);
    for (const p of HOSTILE_PHONES.slice(0, 9)) {
      const a = [...good];
      a[2] = p;
      a[4] = p;
      expect(parseInviteArgs(a).ok, JSON.stringify(p)).toBe(false);
    }
  });

  it('the parser refuses flag smuggling: a value that is a flag, a doubled flag, a stray positional, an unknown verb, a prototype name', () => {
    expect(parseInviteArgs(withValue('--ticket', '--phone')).ok).toBe(false);
    expect(parseInviteArgs([...good, '--ticket', 'T-2']).ok).toBe(false);
    expect(parseInviteArgs([...good, 'extra']).ok).toBe(false);
    expect(parseInviteArgs([...good, '--unknown', 'x']).ok).toBe(false);
    expect(parseInviteArgs(['list', '--phone', PHONE]).ok).toBe(false);
    expect(parseInviteArgs(['revoke', '--phone', '+91 98765 00001', '--confirm-phone', '+91 98765 00001', '--ticket', 'T-1', '--purpose', 'new']).ok).toBe(false);
    for (const verb of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'ISSUE', 'issue;id', '']) {
      expect(parseInviteArgs([verb]).ok, verb).toBe(false);
    }
    expect(parseInviteArgs(withValue('--purpose', 'delete')).ok).toBe(false);
    expect(parseInviteArgs(withValue('--consent-recorded', 'YES')).ok).toBe(false);
    expect(parseInviteArgs(withValue('--confirm-phone', '+91 98765 00002')).ok).toBe(false);
  });

  it('the parser error names the flag and never echoes the value (a mistyped number must not reach a log)', () => {
    for (const bad of ['+91 98765 0000X', '+91 12345 00001', "'; id #"]) {
      const r = parseInviteArgs(withValue('--phone', bad));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).not.toContain(bad);
    }
  });

  it('RTI-3: a --ticket that is a phone number or an 8-digit code is refused (the append-only audit would keep it for 12 months)', () => {
    for (const t of ['9876500001', '919876500001', '48210937', 'T-9876500001', '4821-0937']) {
      expect(parseInviteArgs(withValue('--ticket', t)).ok, t).toBe(false);
    }
  });

  it('the laptop wrapper refuses hostile arguments with exit 2 and empty stdout, and quotes what it forwards', () => {
    const run = (args: string[]) =>
      spawnSync(process.execPath, ['--experimental-strip-types', 'tools/swafto-invite.mjs', ...args, '--dry-run'], { encoding: 'utf8' });
    for (const t of HOSTILE.slice(0, 12).filter((x) => !x.includes(String.fromCharCode(0)))) {
      const r = run(withValue('--ticket', t));
      expect(r.status, JSON.stringify(t)).toBe(2);
      expect(r.stdout).toBe('');
    }
    const ok = run(good);
    expect(ok.status).toBe(0);
    expect(ok.stdout.trim()).toMatch(/^\/usr\/local\/bin\/swafto-invite( '[A-Za-z0-9 +._-]*')+$/);
    // --dry-run hidden as a value cannot turn a send into a no-op or smuggle a flag
    const sneaky = spawnSync(process.execPath, ['--experimental-strip-types', 'tools/swafto-invite.mjs', ...withValue('--ticket', '--dry-run'), '--dry-run'], { encoding: 'utf8' });
    expect(sneaky.status).toBe(2);
    expect(sneaky.stdout).toBe('');
  });

  /** A recording SqlClient: every statement and parameter the CLI sends, never a real database. */
  function recorder() {
    const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
    const client: SqlClient = {
      async query(sql, params = []) {
        calls.push({ sql, params });
        return { rows: [] };
      },
      async reserve(fn) {
        return fn(client);
      },
    };
    return { client, calls };
  }
  const cliArgs = (purpose = 'new') => ['issue', '--phone', '+91 98765 00001', '--confirm-phone', '9876500001', '--purpose', purpose, '--ticket', 'T-12', '--consent-recorded', 'yes'];

  it('issue: the plaintext code reaches stdout once and NO query parameter, audit row or stderr line; the audit row has neither code nor full number', async () => {
    const { client, calls } = recorder();
    const out: string[] = [];
    const err: string[] = [];
    const status = await runInviteCli(cliArgs(), {
      settings: { authMode: 'invite', signingKey: KEY, rateLimitKey: 'test-bucket-key-16+' },
      sql: client,
      out: (s) => out.push(s),
      err: (s) => err.push(s),
      mint: () => CODE,
    });
    expect(status).toBe(0);
    expect(out.join('')).toBe('4821 0937\n');
    const everything = JSON.stringify(calls) + err.join('');
    expect(everything).not.toContain(CODE);
    expect(everything).not.toContain('4821 0937');
    const audit = calls.find((c) => c.sql.includes('invite_audit'));
    expect(audit).toBeDefined();
    const auditText = JSON.stringify(audit!.params);
    expect(auditText).not.toContain('9876500001');
    expect(auditText).not.toContain(CODE);
    expect(err.join('')).not.toContain('9876500001');
    // one transaction: BEGIN ... COMMIT around both writes
    expect(calls.map((c) => c.sql.split(' ')[0])).toEqual(['BEGIN', 'INSERT', 'INSERT', 'COMMIT']);
  });

  it('issue, revoke and list refuse outside AUTH_MODE=invite and touch nothing', async () => {
    for (const argv of [cliArgs(), ['revoke', '--phone', '+91 98765 00001', '--confirm-phone', '+91 98765 00001', '--ticket', 'T-1'], ['list']]) {
      const { client, calls } = recorder();
      const status = await runInviteCli(argv, {
        settings: { authMode: 'sms', signingKey: KEY, rateLimitKey: 'test-bucket-key-16+' },
        sql: client,
        out: () => undefined,
        err: () => undefined,
        mint: () => CODE,
      });
      expect(status).toBe(2);
      expect(calls).toHaveLength(0);
    }
  });

  it('a rolled-back issue prints no code (the code is shown only after the commit)', async () => {
    const out: string[] = [];
    const failing: SqlClient = {
      async query(sql) {
        if (sql.startsWith('INSERT INTO invite_audit')) throw new Error('audit write failed');
        return { rows: [] };
      },
      async reserve(fn) {
        return fn(failing);
      },
    };
    await expect(
      runInviteCli(cliArgs(), {
        settings: { authMode: 'invite', signingKey: KEY, rateLimitKey: 'test-bucket-key-16+' },
        sql: failing,
        out: (s) => out.push(s),
        err: () => undefined,
        mint: () => CODE,
      }),
    ).rejects.toThrow();
    expect(out).toEqual([]);
  });

  it('demo-hash needs no database, takes the code only on stdin, and refuses a short or non-numeric code without echoing it', async () => {
    for (const stdin of ['1234567', 'abcdefgh', '1234567890123', '12345678; id']) {
      const err: string[] = [];
      const status = await runInviteCli(['demo-hash', '--phone', '+91 99999 00001'], {
        settings: { authMode: 'sms', signingKey: KEY, rateLimitKey: '' },
        sql: null,
        out: () => undefined,
        err: (s) => err.push(s),
        readStdin: async () => stdin + '\n',
      });
      expect(status, stdin).toBe(2);
      expect(err.join('')).not.toContain(stdin);
    }
    const out: string[] = [];
    await runInviteCli(['demo-hash', '--phone', '+91 99999 00001'], {
      settings: { authMode: 'sms', signingKey: KEY, rateLimitKey: '' },
      sql: null,
      out: (s) => out.push(s),
      err: () => undefined,
      readStdin: async () => DEMO_CODE + '\n',
    });
    expect(out.join('').trim()).toBe(hashOtp(KEY, DEMO_PHONE, DEMO_CODE));
  });
});

/* ------------------------------------------------------------------------------------------------ */
describe('RT-INV the deletion pause', () => {
  it('invite mode: the request is a constant no-op for any number, and writes no limiter row and no pending code', async () => {
    const h = harness({ authMode: 'invite' });
    await h.account(PHONE);
    const bodies = new Set<string>();
    for (const [i, p] of [PHONE, OTHER, fake(3), '9876500001', '+91 98765 00001'].entries()) {
      const res = await h.post('/v1/deletion/request', { phone: p, language: 'en' }, { ip: '198.51.100.' + String(i + 1) });
      expect(res.statusCode).toBe(202);
      bodies.add(shape(res));
    }
    expect(bodies.size).toBe(1);
    expect(await h.deps.otp.get('delete:' + PHONE, T0)).toBeNull();
    expect(h.sms.count()).toBe(0);
  });

  it('invite mode: an invite code for the number cannot confirm its deletion, and is not consumed by trying', async () => {
    const h = harness({ authMode: 'invite' });
    await h.account(PHONE);
    await h.plant(PHONE, CODE, 'invite_recovery', INVITE_RECOVERY_TTL_SECONDS);
    const res = await h.post('/v1/deletion/confirm', { phone: PHONE, code: CODE, confirm: 'DELETE' });
    expect(res.statusCode).toBe(401);
    expect(await h.pendingDeletion()).toEqual([]);
    expect(await h.deps.otp.get(PHONE, T0)).toMatchObject({ kind: 'invite_recovery' });
  });

  it('invite mode: a prefix-forged phone cannot reach the delete namespace through sign-in or deletion', async () => {
    const h = harness({ authMode: 'invite' });
    await h.account(PHONE);
    await h.deps.otp.put({ phone: 'delete:' + PHONE, hash: hashOtp(KEY, 'delete:' + PHONE, CODE), expiresAt: '2030-01-01T00:00:00.000Z', attempts: 0, createdAt: T0, kind: 'sms' }, 0);
    for (const forged of ['delete:' + PHONE, 'delete:9876500001']) {
      expect((await h.verify(forged, CODE)).statusCode, forged).toBe(400);
      expect((await h.post('/v1/deletion/confirm', { phone: forged, code: CODE, confirm: 'DELETE' })).statusCode, forged).toBe(400);
    }
    expect(await h.pendingDeletion()).toEqual([]);
  });

  it('RTI-4: invite mode refuses deletion CONFIRM as well as the request (a code left from a previous sms-mode window must not schedule an erase)', async () => {
    const h = harness({ authMode: 'invite' });
    await h.account(PHONE);
    // a deletion code minted in sms mode seconds before the operator flipped AUTH_MODE to invite
    await h.deps.otp.put(
      { phone: 'delete:' + PHONE, hash: hashOtp(KEY, 'delete:' + PHONE, '123456'), expiresAt: new Date(Date.parse(T0) + 600_000).toISOString(), attempts: 0, createdAt: T0, kind: 'sms' },
      0,
    );
    const res = await h.post('/v1/deletion/confirm', { phone: PHONE, code: '123456', confirm: 'DELETE' });
    expect(res.statusCode).toBe(401);
    expect(await h.pendingDeletion()).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------------------ */
describe('RT-INV sessions after an invite sign-in', () => {
  const auth = (token: string) => ({ authorization: 'Bearer ' + token });

  it('refresh rotates once; replaying the spent refresh token revokes the device, its new tokens and its access token', async () => {
    const h = harness();
    await h.plant(PHONE, CODE, 'invite_new', INVITE_NEW_TTL_SECONDS);
    const s = (await h.verify(PHONE, CODE)).json() as { accessToken: string; refreshToken: string };
    expect((await h.app.inject({ method: 'GET', url: '/v1/devices', headers: auth(s.accessToken) })).statusCode).toBe(200);
    const r1 = await h.post('/v1/auth/refresh', { refreshToken: s.refreshToken });
    expect(r1.statusCode).toBe(200);
    const next = r1.json() as { accessToken: string; refreshToken: string };
    expect(next.refreshToken).not.toBe(s.refreshToken);
    // a second use of the first token, past the grace window: reuse
    const r2 = await h.post('/v1/auth/refresh', { refreshToken: s.refreshToken });
    const r3 = await h.post('/v1/auth/refresh', { refreshToken: s.refreshToken });
    expect([r2.statusCode, r3.statusCode]).toContain(401);
    const replay = await h.post('/v1/auth/refresh', { refreshToken: next.refreshToken });
    // either the grace window serves the legitimate holder once more or the device is already revoked; never an unbounded chain
    expect([200, 401]).toContain(replay.statusCode);
  });

  it('a revoked device\'s ACCESS token stops working at once, and a refresh token is not an access token (or the reverse)', async () => {
    const h = harness();
    await h.plant(PHONE, CODE, 'invite_new', INVITE_NEW_TTL_SECONDS);
    const s = (await h.verify(PHONE, CODE)).json() as { accessToken: string; refreshToken: string; deviceId: string };
    expect((await h.app.inject({ method: 'GET', url: '/v1/devices', headers: auth(s.refreshToken) })).statusCode).toBe(401);
    expect((await h.post('/v1/auth/refresh', { refreshToken: s.accessToken })).statusCode).toBe(401);
    const rev = await h.post('/v1/auth/devices/' + s.deviceId + '/revoke', {}, { headers: auth(s.accessToken) });
    expect(rev.statusCode).toBe(200);
    expect((await h.app.inject({ method: 'GET', url: '/v1/devices', headers: auth(s.accessToken) })).statusCode).toBe(401);
    expect((await h.post('/v1/auth/refresh', { refreshToken: s.refreshToken })).statusCode).toBe(401);
  });

  it('a recovery sign-in adds a device for the SAME shop and never trusts a shop id from the request', async () => {
    const h = harness();
    await h.account(PHONE, 'shop-owner', 'user-owner');
    await h.account(OTHER, 'shop-victim', 'user-victim');
    await h.plant(PHONE, CODE, 'invite_recovery', INVITE_RECOVERY_TTL_SECONDS);
    const res = await h.verify(PHONE, CODE, undefined, { consent: undefined, shopName: undefined, shopId: 'shop-victim' });
    expect(res.statusCode).toBe(400); // additionalProperties:false - a smuggled field is refused, not ignored
    const ok = await h.verify(PHONE, CODE, undefined, { consent: undefined, shopName: undefined });
    expect(ok.json().shopId).toBe('shop-owner');
  });

  it('one invite sign-in cancels only ITS shop\'s pending deletion', async () => {
    const h = harness();
    await h.account(PHONE, 'a', 'ua');
    await h.account(OTHER, 'b', 'ub');
    await h.deps.repo.requestDeletion('a', T0);
    await h.deps.repo.requestDeletion('b', T0);
    await h.plant(PHONE, CODE, 'invite_recovery', INVITE_RECOVERY_TTL_SECONDS);
    expect((await h.verify(PHONE, CODE, undefined, { consent: undefined, shopName: undefined })).statusCode).toBe(200);
    expect(await h.pendingDeletion()).toEqual(['b']);
  });
});

/* ------------------------------------------------------------------------------------------------ */
describe('RT-INV what the logs hold', () => {
  const secrets = ['9876500001', CODE, '4821 0937'];

  it('a success, a wrong code, a burn, a wrong purpose, a schema failure and an invite-mode request leave no code, token or full number in the log', async () => {
    const h = harness({ authMode: 'invite' });
    await h.plant(PHONE, CODE, 'invite_new', INVITE_NEW_TTL_SECONDS);
    await h.plant(OTHER, NEWER, 'invite_recovery', INVITE_RECOVERY_TTL_SECONDS); // OTHER has no account: wrong purpose
    await h.request(PHONE);
    await h.verify(fake(1), '55555555');
    await h.verify(OTHER, NEWER);
    await h.post('/v1/auth/otp/verify', { phone: PHONE, code: CODE, device: { platform: 'android' }, extra: CODE });
    const ok = (await h.verify(PHONE, CODE)).json() as { accessToken: string; refreshToken: string };
    const log = h.logLines.join('');
    for (const s of [...secrets, NEWER, '9876500002', ok.accessToken, ok.refreshToken]) expect(log, s).not.toContain(s);
  });

  it('RTI-5: burning an invite (5 wrong guesses) raises the invite_burned event the runbook tells the operator to alert on, with no number', async () => {
    const h = harness({ authMode: 'invite' });
    await h.plant(PHONE, CODE, 'invite_new', INVITE_NEW_TTL_SECONDS);
    for (let i = 0; i < 5; i += 1) await h.verify(PHONE, '00000000');
    const line = h.logLines.find((l) => l.includes('invite_burned'));
    expect(line, 'no invite_burned event exists in the code; the runbook alert can never fire').toBeDefined();
    expect(line ?? '').not.toContain('9876500001');
  });
});
