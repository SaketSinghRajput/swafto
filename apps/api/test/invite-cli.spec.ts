/**
 * THE INVITE CLI AND ITS TABLES, against a real Postgres (skips with a printed reason when none is
 * reachable; CI always has one). Migration 0005 is applied by the spec itself from the generated
 * source, in its own schema, so a missing migration fails here.
 *
 * What is proven: issue replaces the older code (and concurrent issues leave exactly one), the code is
 * printed once and appears in no log and no table, the audit row holds neither the code nor the number,
 * revoke and list, the 24 h / 7 d lifetimes, the atomic 5-ticket cap on an invite under real concurrency,
 * the SMS `put` clause that never overwrites a live invite, the sweep, the audit's append-only trigger
 * and its 12-month purge, and the argument parser's refusals (which need no database).
 */
import { describe, it, expect, afterAll } from 'vitest';
import { allMigrationsDown, allMigrationsUp } from '../../../packages/schema/src/spec.ts';
import { pgOtpStore } from '../src/auth/otp-store-pg.ts';
import { hashOtp } from '../src/auth/tokens.ts';
import { verifyOtp } from '../src/auth/otp-flow.ts';
import { parseInviteArgs } from '../src/admin/invite-args.ts';
import { runInviteCli, type CliDeps } from '../src/admin/invite-cli.ts';
import { INVITE_NEW_TTL_SECONDS, INVITE_RECOVERY_TTL_SECONDS, auditHmac, formatCode, purgeInviteAudit, sweepExpiredOtp } from '../src/admin/invite-store.ts';
import type { SqlClient } from '../src/db/postgres.ts';
import { runNightly } from '../src/jobs/purge-due.ts';
import { memoryRepo } from '../src/db/memory.ts';
import { testDeps, KEY } from './_deps.ts';

const DB_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55432/swafto_test';
const SCHEMA = 'invite_cli_test';
const RATE_KEY = 'test-bucket-key-16+';
const T0 = new Date('2026-11-20T08:00:00.000Z');
const PHONE = '+919876500001';
const PHONE_TYPED = '+91 98765 00001';
const CODES = ['48210937', '73920461', '10293847'];

type PgClient = any;
const clients: PgClient[] = [];
let reachable = false;
let skipReason = 'not attempted';

async function connect(): Promise<PgClient> {
  const mod = (await import('pg')) as unknown as Record<string, unknown>;
  const Client = (mod.Client ?? (mod.default as Record<string, unknown>)?.Client) as new (cfg: unknown) => PgClient;
  const c = new Client({ connectionString: DB_URL, connectionTimeoutMillis: 4000 });
  await c.connect();
  await c.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
  await c.query(`SET search_path TO ${SCHEMA}`);
  clients.push(c);
  return c;
}

let primary: PgClient;
try {
  primary = await connect();
  for (const s of allMigrationsDown('postgres')) await primary.query(s);
  for (const s of allMigrationsUp('postgres')) await primary.query(s);
  reachable = true;
} catch (e) {
  skipReason = (e as Error).message;
}
afterAll(async () => {
  try {
    if (reachable) for (const s of allMigrationsDown('postgres')) await primary.query(s);
  } catch {
    /* a throwaway schema */
  }
  for (const c of clients) await c.end().catch(() => {});
});
const maybe = () => (reachable ? it : it.skip);

/** A pool-shaped client: `reserve` gives each unit of work its OWN connection, like production. */
const pgSql = (): SqlClient => ({
  query: (s, p) => primary.query(s, p as unknown[]),
  reserve: async (fn) => {
    const c = await connect();
    try {
      return await fn({ query: (s, p) => c.query(s, p as unknown[]) });
    } finally {
      await c.end().catch(() => {});
    }
  },
});

function cli(over: Partial<CliDeps> & { mode?: 'invite' | 'sms'; codes?: string[]; now?: () => Date } = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const queue = [...(over.codes ?? CODES)];
  const deps: CliDeps = {
    settings: { authMode: over.mode ?? 'invite', signingKey: KEY, rateLimitKey: RATE_KEY },
    sql: pgSql(),
    out: (s) => void out.push(s),
    err: (s) => void err.push(s),
    now: over.now ?? (() => T0),
    mint: () => queue.shift() ?? '99999999',
    ...(over.readStdin ? { readStdin: over.readStdin } : {}),
  };
  const run = (...argv: string[]) => runInviteCli(argv, deps);
  return { run, out, err };
}
const issueArgs = (purpose: 'new' | 'recovery', phone = PHONE_TYPED, confirm = PHONE_TYPED, ticket = 'T-1') =>
  ['issue', '--phone', phone, '--confirm-phone', confirm, '--purpose', purpose, '--ticket', ticket, '--consent-recorded', 'yes'];
// TRUNCATE is not a row DELETE, so the append-only trigger (which a test must not bypass any other way) is not involved.
const reset = async () => {
  await primary.query('DELETE FROM otp_pending');
  await primary.query('TRUNCATE invite_audit');
};
const auditRows = async () => (await primary.query('SELECT * FROM invite_audit ORDER BY id')).rows;

describe('the argument parser (no database)', () => {
  const bad: [string, string[]][] = [
    ['no command', []],
    ['an unknown command', ['wipe']],
    ['a missing ticket', issueArgs('new').filter((_, i) => i !== 6 && i !== 7)],
    ['a phone that does not match its confirmation', issueArgs('new', PHONE_TYPED, '+91 98765 00002')],
    ['a phone with shell metacharacters', issueArgs('new', '+919876500001; rm -rf /', '+919876500001; rm -rf /')],
    ['a ticket with shell metacharacters', issueArgs('new', PHONE_TYPED, PHONE_TYPED, 'T-1$(id)')],
    ['a ticket with a space', issueArgs('new', PHONE_TYPED, PHONE_TYPED, 'T 1')],
    ['a delete purpose', issueArgs('new').map((a) => (a === 'new' ? 'delete' : a))],
    ['consent not recorded', issueArgs('new').map((a) => (a === 'yes' ? 'no' : a))],
    ['a number that is not an Indian mobile', issueArgs('new', '+15551234567', '+15551234567')],
    ['an unknown flag', [...issueArgs('new'), '--operator', 'x']],
    ['a duplicated flag', [...issueArgs('new'), '--ticket', 'T-2']],
    ['a flag with no value', ['revoke', '--phone']],
  ];
  for (const [name, argv] of bad) {
    it('refuses ' + name, () => {
      const r = parseInviteArgs(argv);
      expect(r.ok).toBe(false);
      // The error names a flag, never a value: a mistyped number is not echoed into a log.
      if (!r.ok) expect(r.error).not.toMatch(/98765|rm -rf/);
    });
  }
  it('accepts a well-formed issue, normalising the number', () => {
    expect(parseInviteArgs(issueArgs('recovery'))).toEqual({ ok: true, command: { cmd: 'issue', phone: PHONE, purpose: 'recovery', ticket: 'T-1' } });
  });
});

describe('the CLI', () => {
  it('reports whether a database was reachable', () => {
    if (!reachable) console.log('\n  [invite-cli] SKIPPED: ' + skipReason + '\n');
    expect(typeof reachable).toBe('boolean');
  });

  maybe()('refuses outside AUTH_MODE=invite, and refuses bad input, writing nothing', async () => {
    await reset();
    const sms = cli({ mode: 'sms' });
    expect(await sms.run(...issueArgs('new'))).toBe(2);
    expect(sms.out).toEqual([]);
    const bad = cli();
    expect(await bad.run(...issueArgs('new', PHONE_TYPED, '+91 98765 00002'))).toBe(2);
    expect(bad.out).toEqual([]);
    expect((await primary.query('SELECT count(*)::int AS n FROM otp_pending')).rows[0].n).toBe(0);
    expect(await auditRows()).toHaveLength(0);
  });

  maybe()('prints the code ONCE, grouped, and puts it in no log, no row and no audit trail', async () => {
    await reset();
    const c = cli();
    expect(await c.run(...issueArgs('new'))).toBe(0);
    expect(c.out).toEqual([formatCode(CODES[0]!) + '\n']);
    expect(c.out[0]).toBe('4821 0937\n');
    const all = c.err.join('') + JSON.stringify((await primary.query('SELECT * FROM otp_pending')).rows) + JSON.stringify(await auditRows());
    expect(all).not.toContain(CODES[0]);
    expect(all).not.toContain('4821 0937');
    expect(c.err.join('')).toContain('+91 XXXXXX0001'); // the masked number, not the full one
    expect(c.err.join('')).not.toContain('9876500001');
  });

  maybe()('the audit row holds a keyed hash and the last four digits: no raw number, no code', async () => {
    await reset();
    await cli().run(...issueArgs('recovery', PHONE_TYPED, PHONE_TYPED, 'TKT-9'));
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'issue', kind: 'invite_recovery', phone_masked: '+91 XXXXXX0001', ticket: 'TKT-9', phone_hmac: auditHmac(RATE_KEY, PHONE) });
    const text = JSON.stringify(rows);
    expect(text).not.toContain('9876500001');
    expect(text).not.toContain(CODES[0]);
    // keyed: a different key gives a different value, so the table alone does not identify a number
    expect(auditHmac('another-key-16-chars!!', PHONE)).not.toBe(rows[0].phone_hmac);
  });

  maybe()('issuing again KILLS the previous code: the old one is refused, the new one verifies', async () => {
    await reset();
    const c = cli();
    await c.run(...issueArgs('new'));
    await c.run(...issueArgs('new', PHONE_TYPED, PHONE_TYPED, 'T-2'));
    const deps = testDeps({ otp: pgOtpStore(pgSql()), now: () => T0.toISOString() });
    expect(await verifyOtp(deps, { key: PHONE, code: CODES[0]!, ip: '127.0.0.1' })).toEqual({ ok: false, status: 401 });
    expect(await verifyOtp(deps, { key: PHONE, code: CODES[1]!, ip: '127.0.0.1' })).toMatchObject({ ok: true, kind: 'invite_new' });
    expect((await auditRows()).map((r: any) => r.action)).toEqual(['issue', 'issue']);
  });

  maybe()('three concurrent issues leave exactly ONE live code', async () => {
    await reset();
    const runs = [0, 1, 2].map((i) => cli({ codes: [CODES[i]!] }));
    await Promise.all(runs.map((c, i) => c.run(...issueArgs('new', PHONE_TYPED, PHONE_TYPED, 'T-' + String(i)))));
    expect((await primary.query('SELECT count(*)::int AS n FROM otp_pending WHERE phone = $1', [PHONE])).rows[0].n).toBe(1);
    expect(await auditRows()).toHaveLength(3);
    const deps = testDeps({ otp: pgOtpStore(pgSql()), now: () => T0.toISOString() });
    let hits = 0;
    for (const code of CODES) {
      const r = await verifyOtp(deps, { key: PHONE, code, ip: '127.0.0.1' });
      if (r.ok) hits += 1;
    }
    expect(hits).toBe(1);
  });

  maybe()('a recovery code lives 24 hours and a new-shop code 7 days (the stored expiry, and what verify does at the edge)', async () => {
    await reset();
    await cli().run(...issueArgs('recovery'));
    const rec = (await primary.query('SELECT expires_at, kind FROM otp_pending WHERE phone = $1', [PHONE])).rows[0];
    expect(new Date(rec.expires_at).getTime() - T0.getTime()).toBe(INVITE_RECOVERY_TTL_SECONDS * 1000);
    const store = pgOtpStore(pgSql());
    const at = (s: number) => new Date(T0.getTime() + s * 1000).toISOString();
    expect(await store.takeAttempt(PHONE, at(INVITE_RECOVERY_TTL_SECONDS + 1), 5)).toBeNull();
    expect((await store.takeAttempt(PHONE, at(INVITE_RECOVERY_TTL_SECONDS - 1), 5))?.kind).toBe('invite_recovery');

    await cli().run(...issueArgs('new', PHONE_TYPED, PHONE_TYPED, 'T-3'));
    const fresh = (await primary.query('SELECT expires_at FROM otp_pending WHERE phone = $1', [PHONE])).rows[0];
    expect(new Date(fresh.expires_at).getTime() - T0.getTime()).toBe(INVITE_NEW_TTL_SECONDS * 1000);
    expect(await store.takeAttempt(PHONE, at(INVITE_NEW_TTL_SECONDS + 1), 5)).toBeNull();
    expect((await store.takeAttempt(PHONE, at(INVITE_NEW_TTL_SECONDS - 1), 5))?.kind).toBe('invite_new');
  });

  maybe()('revoke deletes a live invite and audits it; it never touches an SMS code; list is masked', async () => {
    await reset();
    await cli().run(...issueArgs('new'));
    const l = cli();
    expect(await l.run('list')).toBe(0);
    expect(l.out.join('')).toContain('+91 XXXXXX0001');
    expect(l.out.join('')).toContain('invite_new');
    expect(l.out.join('')).not.toMatch(/9876500001|48210937/);

    await primary.query("INSERT INTO otp_pending (phone, code_hash, expires_at, created_at) VALUES ('+919876500002', 'h', $1, $2)", [new Date(T0.getTime() + 600_000), T0]);
    const r = cli();
    expect(await r.run('revoke', '--phone', PHONE_TYPED, '--confirm-phone', PHONE_TYPED, '--ticket', 'T-9')).toBe(0);
    expect((await primary.query('SELECT count(*)::int AS n FROM otp_pending WHERE phone = $1', [PHONE])).rows[0].n).toBe(0);
    expect(await cli().run('revoke', '--phone', '+91 98765 00002', '--confirm-phone', '+91 98765 00002', '--ticket', 'T-10')).toBe(0);
    expect((await primary.query("SELECT count(*)::int AS n FROM otp_pending WHERE phone = '+919876500002'")).rows[0].n).toBe(1);
    expect((await auditRows()).map((x: any) => x.action)).toEqual(['issue', 'revoke', 'revoke']);
  });

  maybe()('demo-hash prints only the keyed hash of a code of 8 to 10 digits, in any mode, with no database', async () => {
    const ok = cli({ mode: 'sms', readStdin: async () => '24681357\n' });
    expect(await ok.run('demo-hash', '--phone', '+91 99999 00001')).toBe(0);
    expect(ok.out).toEqual([hashOtp(KEY, '+919999900001', '24681357') + '\n']);
    const short = cli({ readStdin: async () => '123456\n' });
    expect(await short.run('demo-hash', '--phone', '+91 99999 00001')).toBe(2);
    expect(short.out).toEqual([]);
  });
});

describe('the store', () => {
  const T = T0.toISOString();
  const P = (kind: 'sms' | 'invite_new', hash: string, ttl = 604800) => ({
    phone: PHONE,
    hash,
    expiresAt: new Date(T0.getTime() + ttl * 1000).toISOString(),
    attempts: 0,
    createdAt: T,
    kind,
  });

  maybe()('an SMS put NEVER overwrites a live invite (after the cooldown too), but does overwrite an expired one', async () => {
    await reset();
    const s = pgOtpStore(pgSql());
    expect(await s.put(P('invite_new', 'invite-hash'), 0)).toBe(true);
    const later = (sec: number) => ({ ...P('sms', 'sms-hash', 600), createdAt: new Date(T0.getTime() + sec * 1000).toISOString(), expiresAt: new Date(T0.getTime() + sec * 1000 + 600_000).toISOString() });
    expect(await s.put(later(3600), 60)).toBe(false);
    expect((await s.get(PHONE, new Date(T0.getTime() + 3601 * 1000).toISOString()))?.hash).toBe('invite-hash');
    // an EXPIRED invite is just dead weight: a fresh request may replace it
    expect(await s.put(later(8 * 86400), 60)).toBe(true);
    expect((await s.get(PHONE, new Date(T0.getTime() + 8 * 86400 * 1000 + 1000).toISOString()))?.kind).toBe('sms');
  });

  maybe()('the 5-per-code cap holds on an invite under real concurrency: 25 callers over 5 connections get exactly 5 tickets', async () => {
    await reset();
    const store = (c: PgClient) => pgOtpStore({ query: (q, p) => c.query(q, p as unknown[]) });
    await store(primary).put(P('invite_new', 'h'), 0);
    const conns = await Promise.all(Array.from({ length: 5 }, () => connect()));
    const got = await Promise.all(Array.from({ length: 25 }, (_, i) => store(conns[i % 5]).takeAttempt(PHONE, T, 5)));
    expect(got.filter((t) => t !== null)).toHaveLength(5);
    expect(got.find((t) => t !== null)?.kind).toBe('invite_new');
  });

  maybe()('clear(key, hash) is a compare-and-delete: a stale hash removes nothing, the current one removes the row once (RTI-1/2, atomic in SQL)', async () => {
    await reset();
    const s = pgOtpStore(pgSql());
    await s.put(P('invite_new', 'current-hash'), 0);
    expect(await s.clear(PHONE, 'old-hash')).toBe(false);
    expect((await s.get(PHONE, T))?.hash).toBe('current-hash');
    expect(await s.clear(PHONE, 'current-hash')).toBe(true);
    expect(await s.clear(PHONE, 'current-hash')).toBe(false);
  });

  maybe()('the sweep removes expired rows (every kind) and keeps live ones', async () => {
    await reset();
    // Raw inserts: the store's own put already sweeps, which would hide what the nightly sweep does.
    const insert = (phone: string, kind: string, expiresMs: number) =>
      primary.query('INSERT INTO otp_pending (phone, code_hash, expires_at, created_at, kind) VALUES ($1, $2, $3, $4, $5)', [phone, 'h', new Date(expiresMs), T0, kind]);
    await insert('+919876500011', 'invite_new', T0.getTime() - 1000);
    await insert('+919876500012', 'sms', T0.getTime() - 1000);
    await insert('+919876500013', 'invite_new', T0.getTime() + 604_800_000);
    expect(await sweepExpiredOtp(pgSql(), T)).toBe(2);
    expect((await primary.query('SELECT phone FROM otp_pending')).rows.map((r: any) => r.phone)).toEqual(['+919876500013']);
  });
});

describe('the nightly job hook', () => {
  maybe()('runNightly sweeps expired codes and purges old audit rows when given the database, and does neither without it', async () => {
    await reset();
    await primary.query("INSERT INTO invite_audit (at, action, kind, phone_hmac, phone_masked, ticket) VALUES ('2024-01-01T00:00:00Z', 'issue', 'invite_new', 'h', 'm', 'old')");
    await primary.query("INSERT INTO otp_pending (phone, code_hash, expires_at, created_at, kind) VALUES ('+919876500021', 'h', '2020-01-01', '2020-01-01', 'invite_new')");
    const limiter = { prune: async () => 0 };
    const none = await runNightly(memoryRepo(), limiter, new Date().toISOString());
    expect(none).toMatchObject({ otpSwept: 0, inviteAuditPurged: 0 });
    const done = await runNightly(memoryRepo(), limiter, new Date().toISOString(), pgSql());
    expect(done).toMatchObject({ otpSwept: 1, inviteAuditPurged: 1 });
  });
});

describe('invite_audit is append-only', () => {
  const insertOld = () => primary.query("INSERT INTO invite_audit (at, action, kind, phone_hmac, phone_masked, ticket) VALUES ('2024-01-01T00:00:00Z', 'issue', 'invite_new', 'h', '+91 XXXXXX0001', 'old')");

  maybe()('refuses UPDATE and DELETE, and a DELETE with the purge flag of a recent row', async () => {
    await reset();
    await cli().run(...issueArgs('new'));
    await expect(primary.query("UPDATE invite_audit SET ticket = 'x'")).rejects.toThrow(/append-only/);
    await expect(primary.query('DELETE FROM invite_audit')).rejects.toThrow(/append-only/);
    await primary.query('BEGIN');
    await primary.query("SET LOCAL swafto.invite_audit_purge = 'on'");
    await expect(primary.query("DELETE FROM invite_audit WHERE ticket = 'T-1'")).rejects.toThrow(/append-only/);
    await primary.query('ROLLBACK');
    expect(await auditRows()).toHaveLength(1);
  });

  maybe()('the purge removes rows older than 12 months and nothing newer', async () => {
    await reset();
    await insertOld();
    await cli({ now: () => new Date() }).run(...issueArgs('new'));
    expect(await purgeInviteAudit(pgSql(), new Date().toISOString())).toBe(1);
    expect((await auditRows()).map((r: any) => r.ticket)).toEqual(['T-1']);
  });
});
