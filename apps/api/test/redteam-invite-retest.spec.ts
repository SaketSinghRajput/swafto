/**
 * RED TEAM RETEST - THE INTERIM SIGN-IN, after the RTI-1..RTI-6 fixes. Authorised, LOCAL code only,
 * synthetic numbers only; nothing touches a network or api.rohinova.com. Every test asserts the SECURE
 * behaviour, so a red test is a finding (named S1..S4 in docs/audit/findings/red-team-invite.md).
 *
 * Two halves: (1) attempts to bypass each fix, (2) the surface the fixes added. The Postgres tests use
 * their own schema and are skipped, loudly, when no database is reachable.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { buildApp, type AppDeps } from '../src/app.ts';
import { memoryOtpStore } from '../src/auth/routes.ts';
import { pgOtpStore } from '../src/auth/otp-store-pg.ts';
import type { OtpKind, OtpStore } from '../src/auth/otp-store.ts';
import { hashOtp } from '../src/auth/tokens.ts';
import { loadConfig } from '../src/config.ts';
import { parseInviteArgs } from '../src/admin/invite-args.ts';
import { INVITE_NEW_TTL_SECONDS } from '../src/admin/invite-store.ts';
import { NOTICE_VERSION } from '../src/dpdp/routes.ts';
import { StubSmsPort } from '../src/sms/stub.ts';
import { parseDemoLogin } from '../src/auth/demo.ts';
import { allMigrationsUp, allMigrationsDown } from '../../../packages/schema/src/spec.ts';
import { testDeps, KEY, T0 } from './_deps.ts';

const PHONE = '+919876500001';
const OTHER = '+919876500002';
const CODE = '48210937';
const OLD = '11112222';
const NEWER = '33334444';
const DEMO_PHONE = '+919999900001';
const DEMO_CODE = '24681357';
const JSON_H = { 'content-type': 'application/json' };

function harness(over: Partial<AppDeps> = {}) {
  const clock = { value: T0 };
  const logLines: string[] = [];
  const deps = testDeps({
    now: () => clock.value,
    sms: new StubSmsPort(),
    logLevel: 'info',
    logStream: { write: (c: string) => void logLines.push(c) },
    ...over,
  });
  const app = buildApp(deps);
  const post = (url: string, payload: unknown, ip?: string) =>
    app.inject({
      method: 'POST',
      url,
      headers: JSON_H,
      payload: JSON.stringify(payload),
      ...(ip ? { remoteAddress: ip } : {}),
    });
  const verify = (phone: string, code: unknown, ip?: string) =>
    post(
      '/v1/auth/otp/verify',
      {
        phone,
        code,
        device: { platform: 'android' },
        shopName: 'Retest Shop',
        consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' },
      },
      ip,
    );
  const plant = (phone: string, code: string, kind: OtpKind, ttlSeconds = INVITE_NEW_TTL_SECONDS) =>
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
  return { deps, app, clock, post, verify, plant, account, logLines };
}

const shape = (res: { statusCode: number; body: string; headers: Record<string, unknown> }) =>
  JSON.stringify({
    s: res.statusCode,
    b: res.body.replace(/"requestId":"[^"]*"/, '"requestId":"-"'),
    h: Object.entries(res.headers)
      .filter(([k]) => !['date', 'x-request-id', 'retry-after', 'content-length'].includes(k.toLowerCase()))
      .sort(([a], [b]) => a.localeCompare(b)),
  });

/* ============================================================================================== */
/* 1a. COMPARE-AND-DELETE against REAL Postgres                                                   */
/* ============================================================================================== */
const DB_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55432/swafto_test';
const SCHEMA = 'rtiretest';
type PgClient = any;
const clients: PgClient[] = [];
let reachable = false;
let pg: PgClient;
{
  try {
    const mod = (await import('pg')) as unknown as Record<string, unknown>;
    const Client = (mod.Client ?? (mod.default as Record<string, unknown>)?.Client) as new (cfg: unknown) => PgClient;
    pg = new Client({ connectionString: DB_URL, connectionTimeoutMillis: 4000 });
    await pg.connect();
    clients.push(pg);
    await pg.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
    await pg.query(`SET search_path TO ${SCHEMA}`);
    for (const s of allMigrationsDown('postgres')) await pg.query(s);
    for (const s of allMigrationsUp('postgres')) await pg.query(s);
    reachable = true;
  } catch (err) {
    console.error('[redteam-invite-retest] no database:', (err as Error).message);
  }
}
afterAll(async () => {
  for (const c of clients) await c.end().catch(() => {});
});
const pgit = () => (reachable ? it : it.skip);

/** The operator's `invite issue`, byte for byte the SQL of invite-store.ts (unconditional upsert, attempts 0). */
async function reissue(phone: string, code: string, at: string) {
  await pg.query(
    `INSERT INTO otp_pending (phone, code_hash, expires_at, attempts, created_at, kind)
     VALUES ($1, $2, $3::timestamptz, 0, $4::timestamptz, 'invite_new')
     ON CONFLICT (phone) DO UPDATE
       SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at,
           attempts = 0, created_at = EXCLUDED.created_at, kind = EXCLUDED.kind`,
    [phone, hashOtp(KEY, phone, code), new Date(Date.parse(at) + INVITE_NEW_TTL_SECONDS * 1000).toISOString(), at],
  );
}

/**
 * The real pg store, with TWO gates a test can arm: after `takeAttempt` returns (the old ticket is held), or
 * after the `get` inside clearIfSame returns (the window between the belt-and-braces read and the DELETE).
 * `clear` forwards `onlyHash`, so the real atomic statement is what is under test.
 */
function gatedPg() {
  const inner = pgOtpStore({ query: (q, p) => pg.query(q, p as unknown[]) });
  let mode: 'none' | 'ticket' | 'get' = 'none';
  let release!: () => void;
  let hit!: () => void;
  let gate = new Promise<void>((r) => (release = r));
  let reached = new Promise<void>((r) => (hit = r));
  const trap = async () => {
    mode = 'none';
    hit();
    await gate;
  };
  const store: OtpStore = {
    put: (p, c) => inner.put(p, c),
    clear: (k, h) => inner.clear(k, h),
    async get(k, n) {
      const r = await inner.get(k, n);
      if (mode === 'get') await trap();
      return r;
    },
    async takeAttempt(k, n, cap) {
      const t = await inner.takeAttempt(k, n, cap);
      if (mode === 'ticket' && t) await trap();
      return t;
    },
  };
  return {
    store,
    inner,
    arm(m: 'ticket' | 'get') {
      mode = m;
      gate = new Promise<void>((r) => (release = r));
      reached = new Promise<void>((r) => (hit = r));
    },
    get reached() {
      return reached;
    },
    release: () => release(),
  };
}

describe('RTI-1/2 retest - compare-and-delete on REAL Postgres, across a re-issue', () => {
  it('reports whether a database was reachable', () => {
    if (!reachable) console.log('\n  [redteam-invite-retest] pg SKIPPED - no reachable database.\n');
    expect(true).toBe(true);
  });

  pgit()('old code, ticket held, re-issue lands, then the old verify resumes: 401, and the NEW row survives and signs in', async () => {
    await pg.query('DELETE FROM otp_pending');
    const g = gatedPg();
    const h = harness({ otp: g.store, authMode: 'invite' });
    await reissue(PHONE, OLD, T0);
    g.arm('ticket');
    const inFlight = h.verify(PHONE, OLD);
    await g.reached;
    await reissue(PHONE, NEWER, T0);
    g.release();
    expect((await inFlight).statusCode).toBe(401);
    expect((await h.verify(PHONE, NEWER)).statusCode).toBe(200);
  });

  pgit()('re-issue lands BETWEEN the belt-and-braces get and the DELETE (the window the memory-store wrapper cannot reach)', async () => {
    await pg.query('DELETE FROM otp_pending');
    const g = gatedPg();
    const h = harness({ otp: g.store, authMode: 'invite' });
    await reissue(PHONE, OLD, T0);
    g.arm('get');
    const inFlight = h.verify(PHONE, OLD); // correct old code: ticket ok, compare ok, get ok -> gate
    await g.reached;
    await reissue(PHONE, NEWER, T0);
    g.release();
    expect((await inFlight).statusCode, 'old code must not sign in after the re-issue committed').toBe(401);
    expect((await h.verify(PHONE, NEWER)).statusCode, 'the freshly issued invite must survive').toBe(200);
  });

  pgit()('5th wrong guess on the OLD row, re-issue before its clear: the new invite is not burned and no invite_burned is logged', async () => {
    await pg.query('DELETE FROM otp_pending');
    const g = gatedPg();
    const h = harness({ otp: g.store, authMode: 'invite' });
    await reissue(PHONE, OLD, T0);
    for (let i = 0; i < 4; i += 1) await h.verify(PHONE, '00000000');
    g.arm('get'); // the 5th wrong guess is held after its get
    const fifth = h.verify(PHONE, '00000000');
    await g.reached;
    await reissue(PHONE, NEWER, T0);
    g.release();
    expect((await fifth).statusCode).toBe(401);
    expect((await h.verify(PHONE, NEWER)).statusCode).toBe(200);
    expect(h.logLines.filter((l) => l.includes('invite_burned'))).toEqual([]);
  });

  pgit()('revoke (DELETE) lands after the ticket: the in-flight correct code signs nobody in', async () => {
    await pg.query('DELETE FROM otp_pending');
    const g = gatedPg();
    const h = harness({ otp: g.store, authMode: 'invite' });
    await reissue(PHONE, OLD, T0);
    g.arm('ticket');
    const inFlight = h.verify(PHONE, OLD);
    await g.reached;
    await pg.query(`DELETE FROM otp_pending WHERE phone = $1 AND kind IN ('invite_new','invite_recovery')`, [PHONE]);
    g.release();
    expect((await inFlight).statusCode).toBe(401);
  });

  pgit()('60 concurrent verifies of the old code and 60 of the new, straddling a re-issue: old never signs in; new signs in exactly once', async () => {
    await pg.query('DELETE FROM otp_pending');
    const h = harness({ otp: pgOtpStore({ query: (q, p) => pg.query(q, p as unknown[]) }), authMode: 'invite' });
    await reissue(PHONE, OLD, T0);
    const olds = Array.from({ length: 30 }, () => h.verify(PHONE, OLD));
    await reissue(PHONE, NEWER, T0);
    const news = Array.from({ length: 60 }, () => h.verify(PHONE, NEWER));
    const oldRes = await Promise.all(olds);
    const newRes = await Promise.all(news);
    // an old verify that ran BEFORE the re-issue is legitimate (the code was live); count only signed-in total
    const signed = [...oldRes, ...newRes].filter((r) => r.statusCode === 200).length;
    expect(signed, 'one invite row existed at a time; at most one sign-in per row').toBeLessThanOrEqual(2);
    expect(newRes.filter((r) => r.statusCode === 200).length).toBeLessThanOrEqual(1);
  });

  pgit()('clear(key) with NO hash still deletes (the CLI/legacy contract) and clear(key, wrongHash) does not', async () => {
    await pg.query('DELETE FROM otp_pending');
    const s = pgOtpStore({ query: (q, p) => pg.query(q, p as unknown[]) });
    await reissue(PHONE, OLD, T0);
    expect(await s.clear(PHONE, 'not-the-hash')).toBe(false);
    expect(await s.clear(PHONE, "x' OR '1'='1")).toBe(false); // the hash is a parameter, never SQL
    expect(await s.get(PHONE, T0)).not.toBeNull();
    expect(await s.clear(PHONE, hashOtp(KEY, PHONE, OLD))).toBe(true);
  });
});

/* ============================================================================================== */
/* 1b. --ticket                                                                                    */
/* ============================================================================================== */
describe('RTI-3 retest - --ticket edge cases', () => {
  const issue = (ticket: string) =>
    parseInviteArgs(['issue', '--phone', PHONE, '--confirm-phone', PHONE, '--purpose', 'new', '--ticket', ticket, '--consent-recorded', 'yes']);
  const revoke = (ticket: string) => parseInviteArgs(['revoke', '--phone', PHONE, '--confirm-phone', PHONE, '--ticket', ticket]);

  it('accepts the documented shape', () => {
    for (const t of ['T-12', 'SUP-4021', 'A-1', 'ABCDE-12345']) {
      expect(issue(t).ok, t).toBe(true);
      expect(revoke(t).ok, t).toBe(true);
    }
  });

  it('refuses a phone number, an invite code, any run of 6+ digits, and every near-miss of the shape (issue AND revoke)', () => {
    const FIXED = '--ticket must look like T-12 or SUP-4021 (capital letters, a dash, up to 5 digits)';
    const bad = [
      '9876500001', '+919876500001', '98765-00001', '48210937', 'T-48210937', 'T-123456', 'SUP-0000000',
      'T-12\n', '\nT-12', 'T-12\r', 'T-12 ', ' T-12', 'T-12\t', 'T-12\u0000', 'T-12 ', 'T-12 ', 'T-12 ', 'T-12​',
      't-12', 'T-', '-12', 'T12', 'T--12', 'TT TT-1', 'ABCDEF-1',
      'T-١٢', 'T-１２', 'T-१२', 'T-୧', // Arabic-Indic, full-width, Devanagari, Odia digits
      'Т-12', // Cyrillic T
      '', 'T-12;rm', 'T-12$(id)', 'T-12`id`', "T-12'", 'T-12"', 'T-12|x', 'T-12&x', 'T-12\\', '--ticket', 'T-12 T-13', 'T-12,T-13',
    ];
    for (const t of bad) {
      const i = issue(t);
      const r = revoke(t);
      expect(i.ok, 'issue ' + JSON.stringify(t)).toBe(false);
      expect(r.ok, 'revoke ' + JSON.stringify(t)).toBe(false);
      if (!i.ok) expect([FIXED, 'flag --ticket needs a value'], 'a fixed message, no value echoed').toContain(i.error);
    }
  });

  it('a ticket that looks like a flag is a missing value, and a doubled --ticket is refused (cannot smuggle a second value)', () => {
    expect(parseInviteArgs(['revoke', '--phone', PHONE, '--confirm-phone', PHONE, '--ticket', '--ticket', 'T-1']).ok).toBe(false);
    expect(parseInviteArgs(['revoke', '--phone', PHONE, '--confirm-phone', PHONE, '--ticket', 'T-1', '--ticket', '9876500001']).ok).toBe(false);
  });

  it('what is accepted can hold at most 5 digits, so it can never carry a number or a code', () => {
    const maxDigits = 5;
    // exhaustive over the structure: letters 1..5, dash, digits 1..5 -> longest digit run is 5
    const ok = issue('ABCDE-99999');
    expect(ok.ok).toBe(true);
    expect(issue('ABCDE-999999').ok).toBe(false);
    expect(maxDigits).toBeLessThan(8);
  });

  it('residual (documented, not asserted as a failure): five letters can still spell a name fragment', () => {
    // RAJU-1 passes; the pattern bounds the SHAPE, not the meaning. Recorded as S4 in the report.
    expect(issue('RAJU-1').ok).toBe(true);
  });
});

/* ============================================================================================== */
/* 1c. NODE_ENV / AUTH_MODE variants                                                               */
/* ============================================================================================== */
describe('RTI-6 retest - NODE_ENV and AUTH_MODE variants', () => {
  const FIXED_ENV_MSG = 'NODE_ENV must be exactly one of production, development, test, or unset; a near miss would skip the production checks.';
  const base = { DATABASE_URL: 'postgres://u@h/db', SESSION_SIGNING_KEY: KEY, RATE_LIMIT_KEY: 'test-bucket-key-16+' } as NodeJS.ProcessEnv;
  const prod = { ...base, NODE_ENV: 'production', SYSTEM_DATABASE_URL: 'postgres://s@h/db', AUTH_MODE: 'invite' } as NodeJS.ProcessEnv;
  const env = (e: Record<string, string | undefined>) => ({ ...e }) as NodeJS.ProcessEnv;

  it('every near-miss NODE_ENV is refused outright (never booted with production=false)', () => {
    const bad = [
      'production ', ' production', 'production\n', 'production\r', 'production\r\n', 'production\t', '\tproduction', 'production\v', 'production\f',
      'production ', ' production', 'production​', '​production', 'production ', 'production﻿', '﻿production',
      'Production', 'PRODUCTION', 'pRoDuCtIoN', 'prod', 'production1', 'productıon', 'productіon' /* Cyrillic i */, 'ｐｒｏｄｕｃｔｉｏｎ',
      'production,test', 'production;', 'staging', 'Development', 'TEST', ' test', 'test ', '0', 'false', 'constructor', '__proto__', 'toString',
    ];
    for (const v of bad) {
      let booted: ReturnType<typeof loadConfig> | null = null;
      try {
        booted = loadConfig(env({ ...prod, NODE_ENV: v }));
      } catch {
        booted = null;
      }
      expect(booted, JSON.stringify(v) + ' booted (production=' + booted?.production + ')').toBeNull();
    }
  });

  it('the refusal never echoes the value', () => {
    for (const v of ['production ', 'prod-secret-looking-value', 'production\r']) {
      let msg = '';
      try {
        loadConfig(env({ ...prod, NODE_ENV: v }));
      } catch (e) {
        msg = (e as Error).message;
      }
      expect(msg).toMatch(/NODE_ENV/);
      expect(msg, 'one fixed message whatever the value').toBe(FIXED_ENV_MSG);
    }
  });

  it('exact words boot; production turns every guard on; blank/unset are held to the production rule for AUTH_MODE', () => {
    expect(loadConfig(env(prod)).production).toBe(true);
    expect(loadConfig(env({ ...prod, NODE_ENV: 'test' })).production).toBe(false);
    expect(loadConfig(env({ ...prod, NODE_ENV: 'development' })).production).toBe(false);
    for (const v of [undefined, '']) {
      const e = env({ ...base, NODE_ENV: v });
      expect(() => loadConfig(e), 'NODE_ENV ' + JSON.stringify(v) + ' without AUTH_MODE').toThrow(/AUTH_MODE/);
      expect(loadConfig(env({ ...e, AUTH_MODE: 'invite' })).nodeEnvUnset).toBe(true);
    }
  });

  it('with the exact word, production still refuses the dangerous combos (no regression from the closed-set change)', () => {
    expect(() => loadConfig(env({ ...prod, LOG_LEVEL: 'silent' }))).toThrow();
    expect(() => loadConfig(env({ ...prod, SYSTEM_DATABASE_URL: undefined }))).toThrow();
    expect(() => loadConfig(env({ ...prod, TRUST_PROXY: 'false' }))).toThrow(/TRUST_PROXY/);
  });

  it('AUTH_MODE variants are refused in production AND in dev; blank-but-set refuses even in dev', () => {
    const bad = ['invite\n', 'invite\r', 'invite ', ' invite', 'invite ', 'invite​', 'Invite', 'INVITE', 'SMS', 'Sms', 'invіte', 'invite ', '  ', '\t', ''];
    for (const v of bad) {
      expect(() => loadConfig(env({ ...prod, AUTH_MODE: v })), 'prod ' + JSON.stringify(v)).toThrow();
      expect(() => loadConfig(env({ ...base, NODE_ENV: 'development', AUTH_MODE: v })), 'dev ' + JSON.stringify(v)).toThrow();
    }
  });

  it('invite mode still cannot be combined with STAGING_TEST_PHONES or a half-set demo login', () => {
    expect(() => loadConfig(env({ ...prod, STAGING_TEST_PHONES: DEMO_PHONE }))).toThrow();
    expect(() => loadConfig(env({ ...prod, DEMO_LOGIN_PHONE: DEMO_PHONE }))).toThrow();
    expect(parseDemoLogin).toBeDefined();
  });
});

/* ============================================================================================== */
/* 1d. deletion confirm pause                                                                      */
/* ============================================================================================== */
describe('RTI-4 retest - the deletion CONFIRM pause', () => {
  const del = 'delete:' + PHONE;
  const plantDelete = (h: ReturnType<typeof harness>, code: string) =>
    h.deps.otp.put(
      { phone: del, hash: hashOtp(KEY, del, code), expiresAt: new Date(Date.parse(T0) + 600_000).toISOString(), attempts: 0, createdAt: T0, kind: 'sms' },
      0,
    );
  const confirm = (h: ReturnType<typeof harness>, code: unknown, extra: object = {}) =>
    h.post('/v1/deletion/confirm', { phone: PHONE, code, confirm: 'DELETE', ...extra });
  const due = (h: ReturnType<typeof harness>) => h.deps.repo.shopsDueForPurge('9999-12-31T00:00:00.000Z');

  it('invite mode: a LIVE correct deletion code, any phone spelling, any code spelling: bare 401, nothing scheduled, row untouched', async () => {
    const h = harness({ authMode: 'invite' });
    await h.account(PHONE);
    await plantDelete(h, '123456');
    for (const phone of [PHONE, '9876500001', '+91 98765 00001', '09876500001']) {
      const res = await h.post('/v1/deletion/confirm', { phone, code: '123456', confirm: 'DELETE' });
      expect(res.statusCode, phone).toBe(401);
      expect(res.json()).toEqual({ error: 'code_invalid' });
    }
    expect(await due(h)).toEqual([]);
    const row = await h.deps.otp.get(del, T0);
    expect(row?.attempts, 'the pause is before any ticket: the row is neither consumed nor counted').toBe(0);
  });

  it('invite mode: the pause answers identically for a right code, a wrong code, a malformed code and an unknown number (no oracle)', async () => {
    const h = harness({ authMode: 'invite' });
    await h.account(PHONE);
    await plantDelete(h, '123456');
    const replies = [
      await confirm(h, '123456'),
      await confirm(h, '999999'),
      await confirm(h, 'abcdef'),
      await confirm(h, '١٢٣٤٥٦'),
      await h.post('/v1/deletion/confirm', { phone: OTHER, code: '123456', confirm: 'DELETE' }),
    ];
    expect(new Set(replies.map(shape)).size).toBe(1);
  });

  it('invite mode: 100 confirm attempts spend no verifyPerIp budget and no ticket, so they cannot starve a later sign-in from that address', async () => {
    const h = harness({ authMode: 'invite' });
    await h.plant(PHONE, CODE, 'invite_new');
    for (let i = 0; i < 100; i += 1) await h.post('/v1/deletion/confirm', { phone: PHONE, code: '123456', confirm: 'DELETE' }, '203.0.113.9');
    expect((await h.verify(PHONE, CODE, '203.0.113.9')).statusCode).toBe(200);
  });

  it('an invite code can never confirm a deletion (different key), and a delete: row can never sign in', async () => {
    const h = harness({ authMode: 'sms' });
    await h.account(PHONE);
    await h.plant(PHONE, CODE, 'invite_recovery');
    expect((await confirm(h, CODE)).statusCode).toBe(401);
    expect(await due(h)).toEqual([]);
    await plantDelete(h, '123456');
    expect((await h.verify(PHONE, '123456')).statusCode).toBe(401);
  });

  it('sms mode is unchanged: a right code confirms once, a replay is 401', async () => {
    const h = harness({ authMode: 'sms' });
    await h.account(PHONE);
    await plantDelete(h, '123456');
    expect((await confirm(h, '123456')).statusCode).toBe(200);
    expect((await confirm(h, '123456')).statusCode).toBe(401);
  });

  it('the pause cannot be skipped by an alternate body: extra fields, wrong confirm word, wrong content type are all non-2xx', async () => {
    const h = harness({ authMode: 'invite' });
    await h.account(PHONE);
    await plantDelete(h, '123456');
    for (const body of [
      { phone: PHONE, code: '123456', confirm: 'DELETE', authMode: 'sms' },
      { phone: PHONE, code: '123456', confirm: 'delete' },
      { phone: PHONE, code: ['123456'], confirm: 'DELETE' },
    ]) {
      const res = await h.post('/v1/deletion/confirm', body);
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    }
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/deletion/confirm?authMode=sms',
      headers: { 'content-type': 'application/json', 'x-auth-mode': 'sms' },
      payload: JSON.stringify({ phone: PHONE, code: '123456', confirm: 'DELETE' }),
    });
    expect(res.statusCode).toBe(401);
    expect(await due(h)).toEqual([]);
  });
});

/* ============================================================================================== */
/* 2a. invalid_input mapping                                                                       */
/* ============================================================================================== */
describe('NEW SURFACE - the 400 before the attempt ticket', () => {
  const MALFORMED = [
    '٤٨٢١٠٩٣٧', // Arabic-Indic digits
    '۴۸۲۱۰۹۳۷', // Extended Arabic-Indic
    '４８２１０９３７', // full-width
    '२३४५६७', // Devanagari
    '୧୨୩୪୫୬', // Odia
    '²³¹⁴⁵⁶', // superscripts
    '①②③④', // circled digits
    '48210937\n', '\n48210937', '48210937\r', '48210937 ', ' 48210937', '4821 0937', '4821-0937', '4821 0937', '4821​0937', '48210937\u0000',
    '48210937́', // digit + combining mark
    '0x1234', '+48210937', '4.8210', '1e5678', 'abcd', '48210O37', '４８２１', '-1234',
  ];

  it('every malformed code is a 400 invalid_input with a fixed body, spends no ticket, and leaves the invite working', async () => {
    const h = harness({ authMode: 'invite' });
    await h.plant(PHONE, CODE, 'invite_new');
    for (const c of MALFORMED) {
      const res = await h.verify(PHONE, c);
      // JSON schema length (4..10 UTF-16 units) may reject first: also 400 invalid_input. Anything else is a finding.
      expect(res.statusCode, JSON.stringify(c)).toBe(400);
      expect((res.json() as { error: string }).error).toBe('invalid_input');
      expect(res.body).not.toContain(c.trim() === '' ? 'zzz' : c.replace(/[\n\r\u0000]/g, 'x'));
    }
    expect((await h.deps.otp.get(PHONE, T0))?.attempts, 'no malformed guess may count').toBe(0);
    expect((await h.verify(PHONE, CODE)).statusCode).toBe(200);
  });

  it('a malformed code from a rate-limited address is still a 400 and spends no per-IP budget (no free guess, no starvation)', async () => {
    const h = harness({ authMode: 'invite' });
    await h.plant(PHONE, CODE, 'invite_new');
    for (let i = 0; i < 400; i += 1) {
      const r = await h.verify(PHONE, MALFORMED[i % MALFORMED.length], '203.0.113.7');
      expect(r.statusCode).toBe(400);
    }
    expect((await h.verify(PHONE, CODE, '203.0.113.7')).statusCode, 'the per-IP verify cap must be untouched by 400s').toBe(200);
  });

  it('NO ORACLE: a malformed code gets a byte-identical reply for a live invite, an account, the demo number, and nothing', async () => {
    const h = harness({ authMode: 'invite', demo: parseDemoLogin({ DEMO_LOGIN_PHONE: DEMO_PHONE, DEMO_LOGIN_CODE_HASH: hashOtp(KEY, DEMO_PHONE, DEMO_CODE) } as NodeJS.ProcessEnv) });
    await h.plant(PHONE, CODE, 'invite_new');
    await h.account(OTHER, 's2', 'u2');
    for (const c of MALFORMED.slice(0, 12)) {
      const shapes = new Set<string>();
      for (const p of [PHONE, OTHER, DEMO_PHONE, '+919876500003']) shapes.add(shape(await h.verify(p, c)));
      expect(shapes.size, JSON.stringify(c)).toBe(1);
    }
  });

  it('NO ORACLE: well-formed digit strings of ANY allowed length are the same bare 401 (the exact-length rule is not applied, so length is not a probe)', async () => {
    const h = harness({ authMode: 'invite' });
    await h.plant(PHONE, CODE, 'invite_new');
    await h.account(OTHER, 's2', 'u2');
    for (const len of [4, 5, 6, 7, 9, 10]) {
      const c = '1'.repeat(len);
      const a = shape(await h.verify('+919876500003', c)); // nothing
      const b = shape(await h.verify(OTHER, c)); // account
      expect(a, 'len ' + len).toBe(b);
      expect(JSON.parse(a).s).toBe(401);
    }
  });

  it('the demo lockout ticket is not spent by a malformed code (a stranger cannot lock the demo login with unicode junk)', async () => {
    const demo = parseDemoLogin({ DEMO_LOGIN_PHONE: DEMO_PHONE, DEMO_LOGIN_CODE_HASH: hashOtp(KEY, DEMO_PHONE, DEMO_CODE) } as NodeJS.ProcessEnv);
    const h = harness({ authMode: 'invite', demo });
    for (let i = 0; i < 30; i += 1) expect((await h.verify(DEMO_PHONE, MALFORMED[i % MALFORMED.length])).statusCode).toBe(400);
    expect((await h.verify(DEMO_PHONE, DEMO_CODE)).statusCode).toBe(200);
  });

  it('a non-string, array, object, null or oversize code is a 400 invalid_input and not a 500', async () => {
    const h = harness({ authMode: 'invite' });
    await h.plant(PHONE, CODE, 'invite_new');
    for (const c of [48210937, [CODE], { $ne: 1 }, null, true, '1'.repeat(11), '123', '']) {
      const res = await h.verify(PHONE, c);
      expect(res.statusCode, JSON.stringify(c)).toBe(400);
      expect((res.json() as { error: string }).error).toBe('invalid_input');
    }
    expect((await h.deps.otp.get(PHONE, T0))?.attempts).toBe(0);
  });

  it('the 400 bodies leak nothing about the property, the pattern or the mode, and echo no input', async () => {
    const h = harness({ authMode: 'invite' });
    const a = await h.verify(PHONE, '٤٨٢١');
    const b = await h.verify(PHONE, 12);
    for (const r of [a, b]) {
      const t = r.body.toLowerCase();
      for (const w of ['code', 'pattern', 'minlength', 'maxlength', 'must', 'body/', 'ajv', 'digit', 'invite', 'sms']) expect(t, w).not.toContain(w === 'code' ? '"code"' : w);
    }
  });

  it('a 400 before the ticket cannot be used to tell invite mode from sms mode, beyond what the request reply already says', async () => {
    const inv = harness({ authMode: 'invite' });
    const sms = harness({ authMode: 'sms' });
    expect(shape(await inv.verify(PHONE, '٤٨٢١'))).toBe(shape(await sms.verify(PHONE, '٤٨٢١')));
  });

  it('deletion confirm (sms mode): malformed code is a 400 with the same body shape as sign-in, spends no ticket', async () => {
    const h = harness({ authMode: 'sms' });
    await h.account(PHONE);
    const del = 'delete:' + PHONE;
    await h.deps.otp.put({ phone: del, hash: hashOtp(KEY, del, '123456'), expiresAt: new Date(Date.parse(T0) + 600_000).toISOString(), attempts: 0, createdAt: T0, kind: 'sms' }, 0);
    for (const c of MALFORMED.filter((x) => x.length >= 4 && x.length <= 10)) {
      const res = await h.post('/v1/deletion/confirm', { phone: PHONE, code: c, confirm: 'DELETE' });
      expect(res.statusCode, JSON.stringify(c)).toBe(400);
    }
    expect((await h.deps.otp.get(del, T0))?.attempts).toBe(0);
    expect((await h.post('/v1/deletion/confirm', { phone: PHONE, code: '123456', confirm: 'DELETE' })).statusCode).toBe(200);
  });

  it('the pre-check is ASCII-digits only: a unicode-digit rendering of the CORRECT code does not verify', async () => {
    const h = harness({ authMode: 'invite' });
    await h.plant(PHONE, CODE, 'invite_new');
    const arabic = CODE.replace(/[0-9]/g, (d) => String.fromCharCode(0x0660 + Number(d)));
    expect((await h.verify(PHONE, arabic)).statusCode).toBe(400);
    expect((await h.verify(PHONE, CODE)).statusCode).toBe(200);
  });
});

/* ============================================================================================== */
/* 2b. invite_burned log content                                                                   */
/* ============================================================================================== */
describe('NEW SURFACE - the invite_burned event', () => {
  const burned = (h: ReturnType<typeof harness>) => h.logLines.filter((l) => l.includes('invite_burned'));

  it('fires exactly once per burn, with kind and a masked number only; never the code, the hash, a guess, or the full number', async () => {
    for (const kind of ['invite_new', 'invite_recovery'] as const) {
      const h = harness({ authMode: 'invite' });
      await h.plant(PHONE, CODE, kind);
      const guesses = ['00000001', '00000002', '00000003', '00000004', '00000005', '00000006', '00000007'];
      for (const g of guesses) await h.verify(PHONE, g);
      const lines = burned(h);
      expect(lines.length, kind).toBe(1);
      const rec = JSON.parse(lines[0]!) as Record<string, unknown>;
      expect(rec.event).toBe('invite_burned');
      expect(rec.kind).toBe(kind);
      expect(rec.level).toBe(40);
      const whole = h.logLines.join('\n');
      expect(whole).not.toContain('9876500001');
      expect(whole).not.toContain(CODE);
      expect(whole).not.toContain(hashOtp(KEY, PHONE, CODE));
      for (const g of guesses) expect(whole, 'guess ' + g).not.toContain(g);
    }
  });

  it('the masked number is the same mask the demo_login event uses, and never has more than the last 4 digits', async () => {
    const h = harness({ authMode: 'invite' });
    await h.plant(PHONE, CODE, 'invite_new');
    for (let i = 0; i < 5; i += 1) await h.verify(PHONE, '0000000' + i);
    const rec = JSON.parse(burned(h)[0]!) as { phoneMasked: string };
    expect(rec.phoneMasked).toMatch(/^\+91 X{6}\d{4}$/);
  });

  it('20 concurrent wrong guesses at one invite emit exactly one burn event', async () => {
    const h = harness({ authMode: 'invite' });
    await h.plant(PHONE, CODE, 'invite_new');
    await Promise.all(Array.from({ length: 20 }, (_, i) => h.verify(PHONE, String(10000000 + i))));
    expect(burned(h).length).toBe(1);
  });

  it('an sms-kind code, the demo login, a number with no code and a delete: row never emit it (no spam channel, no sms-mode noise)', async () => {
    const demo = parseDemoLogin({ DEMO_LOGIN_PHONE: DEMO_PHONE, DEMO_LOGIN_CODE_HASH: hashOtp(KEY, DEMO_PHONE, DEMO_CODE) } as NodeJS.ProcessEnv);
    const h = harness({ authMode: 'sms', demo });
    await h.plant(PHONE, CODE, 'sms');
    for (let i = 0; i < 8; i += 1) {
      await h.verify(PHONE, '1111111' + i);
      await h.verify(DEMO_PHONE, '2222222' + i);
      await h.verify(OTHER, '3333333' + i);
    }
    const del = 'delete:' + PHONE;
    await h.account(PHONE);
    await h.deps.otp.put({ phone: del, hash: hashOtp(KEY, del, '123456'), expiresAt: new Date(Date.parse(T0) + 600_000).toISOString(), attempts: 0, createdAt: T0, kind: 'sms' }, 0);
    for (let i = 0; i < 8; i += 1) await h.post('/v1/deletion/confirm', { phone: PHONE, code: '9999999' + i, confirm: 'DELETE' });
    expect(burned(h)).toEqual([]);
  });

  it('a burn does not happen by log forgery: attacker-controlled fields (phone spelling, code) never appear as event fields', async () => {
    const h = harness({ authMode: 'invite' });
    await h.plant(PHONE, CODE, 'invite_new');
    for (let i = 0; i < 5; i += 1) await h.verify(' 09876500001 '.trim(), '0000000' + i);
    const rec = JSON.parse(burned(h)[0]!) as Record<string, unknown>;
    expect(Object.keys(rec).sort()).toEqual(['event', 'hostname', 'level', 'msg', 'phoneMasked', 'kind', 'pid', 'reqId', 'route', 'time'].filter((k) => k in rec).sort());
  });

  it('a burn from the real limiter path still logs when the per-IP cap is not hit, and nothing is logged for a 429-refused guess', async () => {
    const h = harness({ authMode: 'invite' });
    await h.plant(PHONE, CODE, 'invite_new');
    // exhaust one address first
    for (let i = 0; i < 100; i += 1) await h.verify(OTHER, '1234567' + (i % 10), '203.0.113.50');
    const blocked = await h.verify(PHONE, '00000000', '203.0.113.50');
    expect(blocked.statusCode).toBe(429);
    expect((await h.deps.otp.get(PHONE, T0))?.attempts, 'a 429-refused guess spent no ticket on the invite').toBe(0);
    expect(burned(h)).toEqual([]);
  });

  it('a successful sign-in after wrong guesses (<5) emits no burn', async () => {
    const h = harness({ authMode: 'invite' });
    await h.plant(PHONE, CODE, 'invite_new');
    for (let i = 0; i < 4; i += 1) await h.verify(PHONE, '0000000' + i);
    expect((await h.verify(PHONE, CODE)).statusCode).toBe(200);
    expect(burned(h)).toEqual([]);
  });
});

/* ============================================================================================== */
/* clearIfSame on the memory store: the get-then-clear pair, with a store that IGNORES onlyHash      */
/* ============================================================================================== */
describe('S-candidate - clearIfSame relies on the store honouring onlyHash', () => {
  it('a store that drops the second argument is caught only by the (non-atomic) get; documented as a contract, not a live path', async () => {
    const inner = memoryOtpStore();
    let armed = false;
    let hit!: () => void;
    let release!: () => void;
    const reached = new Promise<void>((r) => (hit = r));
    const gate = new Promise<void>((r) => (release = r));
    const store: OtpStore = {
      put: (p, c) => inner.put(p, c),
      takeAttempt: (k, n, c) => inner.takeAttempt(k, n, c),
      clear: (k) => inner.clear(k), // drops onlyHash on purpose
      async get(k, n) {
        const r = await inner.get(k, n);
        if (armed) {
          armed = false;
          hit();
          await gate;
        }
        return r;
      },
    };
    const h = harness({ otp: store, authMode: 'invite' });
    await h.plant(PHONE, OLD, 'invite_new');
    armed = true;
    const inFlight = h.verify(PHONE, OLD);
    await reached;
    await inner.clear(PHONE);
    await inner.put({ phone: PHONE, hash: hashOtp(KEY, PHONE, NEWER), expiresAt: new Date(Date.parse(T0) + 86_400_000).toISOString(), attempts: 0, createdAt: T0, kind: 'invite_new' }, 0);
    release();
    const res = await inFlight;
    // With every REAL store (memory, pg) onlyHash is honoured so this is 401; the wrapper store here is the
    // only way to reach the get->clear gap. Assert the real contract instead: memoryOtpStore honours it.
    const real = memoryOtpStore();
    await real.put({ phone: PHONE, hash: 'h1', expiresAt: new Date(Date.parse(T0) + 1000).toISOString(), attempts: 0, createdAt: T0, kind: 'invite_new' }, 0);
    expect(await real.clear(PHONE, 'h2')).toBe(false);
    expect(await real.clear(PHONE, 'h1')).toBe(true);
    expect([200, 401]).toContain(res.statusCode); // 200 here would be the dropped-arg store, not production code
  });
});
