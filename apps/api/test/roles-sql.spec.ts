/**
 * C-01 · THE ROLE AND GRANT SQL, RUN FOR REAL.
 *
 * `packages/schema/sql/roles.postgres.sql` is what the deploy runs to create the
 * two roles the API connects as. A file nobody runs proves nothing, so this applies
 * it - twice, because it must be idempotent - to a throwaway schema, then drives the
 * real repository through the two roles it produces and checks that
 *
 *   - the app role is not superuser/BYPASSRLS and cannot see a foreign shop's rows,
 *     even to a forged query, and has exactly the privileges the repository needs
 *     (it can erase a shop, it cannot UPDATE an append-only table);
 *   - the system role can look a user up across shops and cannot read a ledger.
 *
 * Postgres-gated: skips with a printed reason when none is listening; CI always has
 * one. UNVERIFIED-LOCAL where there was none.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { allMigrationsUp } from '@swafto/schema';
import { pgRepo } from '../src/db/postgres.ts';
import { describeRole, roleProblems } from '../src/db/roles.ts';
import type { Entry, IsoDate } from '@swafto/formula-engine';

const URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55432/swafto_test';
const SCHEMA = 'roles_sql';
const APP_PASSWORD = randomUUID();
const SYS_PASSWORD = randomUUID();
const BACKUP_PASSWORD = randomUUID();
const ROLES_SQL = readFileSync(new global.URL('../../../packages/schema/sql/roles.postgres.sql', import.meta.url), 'utf8');

const A = '00000000-0000-7000-8000-0000000000e1';
const B = '00000000-0000-7000-8000-0000000000e2';
const DATE = '2026-07-15' as IsoDate;
const NOW = '2026-07-15T10:00:00.000Z';

type Sql = {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
};
let owner: Sql | null = null;
let app: Sql | null = null;
let system: Sql | null = null;
let backup: Sql | null = null;
let reachable = false;
let skipReason = 'not attempted';

const connect = async (url: string): Promise<Sql> => {
  const mod = (await import('pg')) as unknown as Record<string, unknown>;
  const pg = (mod.default ?? mod) as { Client: new (o: unknown) => Sql };
  const c = new pg.Client({ connectionString: url, connectionTimeoutMillis: 4000 });
  await (c as unknown as { connect(): Promise<void> }).connect();
  await c.query('SET search_path TO ' + SCHEMA);
  return c;
};
const as = (role: string, password: string) => {
  const u = new global.URL(URL);
  u.username = role;
  u.password = password;
  return u.toString();
};
const entry = (id: string, amount: number): Entry =>
  ({ id, dayId: DATE, section: 'cash_sales', amount, mode: 'cash', source: 'manual', createdAt: NOW }) as Entry;

try {
  owner = await connect(URL); // SET search_path to a schema that does not exist yet is legal
  await owner.query('DROP SCHEMA IF EXISTS ' + SCHEMA + ' CASCADE');
  await owner.query('CREATE SCHEMA ' + SCHEMA);
  await owner.query('SET search_path TO ' + SCHEMA);
  for (const statement of allMigrationsUp('postgres')) await owner.query(statement);
  // Twice: idempotence is part of the contract.
  await owner.query(ROLES_SQL);
  await owner.query(ROLES_SQL);
  await owner.query(`ALTER ROLE swafto_app PASSWORD '${APP_PASSWORD}'`);
  await owner.query(`ALTER ROLE swafto_system PASSWORD '${SYS_PASSWORD}'`);
  await owner.query(`ALTER ROLE swafto_backup PASSWORD '${BACKUP_PASSWORD}'`);
  app = await connect(as('swafto_app', APP_PASSWORD));
  system = await connect(as('swafto_system', SYS_PASSWORD));
  backup = await connect(as('swafto_backup', BACKUP_PASSWORD));
  reachable = true;
} catch (e) {
  skipReason = (e as Error).message;
}
const maybe = () => (reachable ? it : it.skip);

afterAll(async () => {
  try {
    await app?.end();
    await system?.end();
    await backup?.end();
    if (owner) {
      await owner.query('DROP SCHEMA IF EXISTS ' + SCHEMA + ' CASCADE');
      await owner.query('DROP OWNED BY swafto_app, swafto_system, swafto_backup');
      await owner.query('DROP ROLE IF EXISTS swafto_app');
      await owner.query('DROP ROLE IF EXISTS swafto_system');
      await owner.query('DROP ROLE IF EXISTS swafto_backup');
      await owner.end();
    }
  } catch {
    /* a throwaway container */
  }
});

describe('C-01 · roles.postgres.sql', () => {
  it('reports whether it ran at all', () => {
    if (!reachable) console.log('\n  [roles-sql] SKIPPED: ' + skipReason + '\n  CI always has a database.\n');
    expect(typeof reachable).toBe('boolean');
  });

  maybe()('creates a restricted app role and a bypassing system role that the boot check accepts', async () => {
    const a = await describeRole(app!);
    const s = await describeRole(system!);
    expect(a).toMatchObject({ name: 'swafto_app', superuser: false, bypassRls: false });
    expect(s).toMatchObject({ name: 'swafto_system', superuser: false, bypassRls: true });
    expect(roleProblems(a, s)).toEqual([]);
  });

  maybe()('the app role runs the real repository: its own rows are visible, a foreign shop\'s are not', async () => {
    const repo = pgRepo(app!, { system: system! });
    for (const [shopId, userId, phone, id, amount] of [
      [A, '00000000-0000-7000-8000-0000000000e3', '+919811000001', '00000000-0000-7000-8000-0000000000e5', 111],
      [B, '00000000-0000-7000-8000-0000000000e4', '+919811000002', '00000000-0000-7000-8000-0000000000e6', 222],
    ] as const) {
      await repo.createShopAndUser({ shopId, userId, phone, shopName: 'S', language: 'en', now: NOW });
      await repo.upsertDay({ shopId, date: DATE, state: 'open', openingCash: 0, countedCash: null, differenceReason: null, closedAt: null, startsAt: '00:00', createdAt: NOW });
      await repo.appendEntry(shopId, entry(id, amount));
    }
    expect((await repo.entriesFor(A, DATE)).map((e) => e.amount)).toEqual([111]);

    // The forged query: inside A's scope, naming B.
    await app!.query('BEGIN');
    try {
      await app!.query("SELECT set_config('swafto.shop_id', $1, true)", [A]);
      expect((await app!.query('SELECT 1 FROM entries WHERE shop_id = $1', [B])).rows).toEqual([]);
      expect((await app!.query('SELECT 1 FROM users WHERE shop_id = $1 OR true', [B])).rows).toHaveLength(1);
    } finally {
      await app!.query('ROLLBACK');
    }
  });

  maybe()('the backup role reads every shop rows and every sequence, and can change nothing', async () => {
    // Row-level security would hide both shops from a role it binds; a dump would be empty.
    expect((await backup!.query('SELECT count(*)::int AS n FROM entries')).rows[0]?.n).toBe(2);
    expect((await backup!.query('SELECT count(*)::int AS n FROM users')).rows[0]?.n).toBe(2);
    expect((await backup!.query("SELECT last_value FROM rate_events_id_seq")).rows).toHaveLength(1);
    await expect(backup!.query("UPDATE users SET phone = '+919800000000'")).rejects.toThrow(/permission denied/);
    await expect(backup!.query('DELETE FROM entries')).rejects.toThrow(/permission denied/);
    await expect(backup!.query('TRUNCATE entries')).rejects.toThrow(/permission denied/);
    await expect(backup!.query('CREATE TABLE swafto_nope (x int)')).rejects.toThrow();
    const r = await describeRole(backup!);
    expect(r).toMatchObject({ name: 'swafto_backup', superuser: false, bypassRls: true });
  });

  maybe()('the app role has the repository\'s privileges and no more', async () => {
    await app!.query('BEGIN');
    try {
      await app!.query("SELECT set_config('swafto.shop_id', $1, true)", [A]);
      // Append-only tables: no UPDATE at the privilege level, before the trigger even runs.
      await expect(app!.query("UPDATE entries SET amount = 1 WHERE shop_id = $1", [A])).rejects.toThrow(/permission denied/);
    } finally {
      await app!.query('ROLLBACK');
    }
    await expect(app!.query('CREATE TABLE swafto_nope (x int)')).rejects.toThrow();
    await expect(app!.query('TRUNCATE entries')).rejects.toThrow(/permission denied/);
  });

  maybe()('the invite CLI role (swafto_app) can INSERT audit rows and read them, but cannot UPDATE; DELETE is for the trigger to refuse; the backup role reads them', async () => {
    await app!.query("INSERT INTO invite_audit (at, action, kind, phone_hmac, phone_masked, ticket) VALUES (now(), 'issue', 'invite_new', 'h', '+91 XXXXXX0001', 'T-roles')");
    expect((await app!.query("SELECT count(*)::int AS n FROM invite_audit WHERE ticket = 'T-roles'")).rows[0]?.n).toBe(1);
    await expect(app!.query("UPDATE invite_audit SET ticket = 'x'")).rejects.toThrow(/permission denied/);
    await expect(app!.query('DELETE FROM invite_audit')).rejects.toThrow(/append-only/);
    expect((await backup!.query("SELECT count(*)::int AS n FROM invite_audit")).rows[0]?.n).toBe(1);
    await expect(backup!.query('DELETE FROM invite_audit')).rejects.toThrow(/permission denied/);
  });

  maybe()('a device of another shop cannot be revoked (RT S4), and erasure works on the app role alone', async () => {
    const repo = pgRepo(app!, { system: system! });
    const dev = '00000000-0000-7000-8000-0000000000f1';
    await repo.registerDevice({ id: dev, userId: '00000000-0000-7000-8000-0000000000e3', shopId: A, platform: 'android', createdAt: NOW, lastSeenAt: null, revokedAt: null });
    expect(await repo.revokeDevice(B, dev, NOW)).toBe(false);
    expect((await repo.findDevice(dev))?.revokedAt).toBeNull();
    expect(await repo.revokeDevice(A, dev, NOW)).toBe(true);
    await repo.purgeShop(B, NOW);
    expect(await repo.entriesFor(B, DATE)).toEqual([]);
    expect((await repo.entriesFor(A, DATE)).length).toBe(1);
  });

  maybe()('the system role finds a user across shops and cannot read a ledger or write one', async () => {
    const repo = pgRepo(app!, { system: system! });
    expect((await repo.findUserByPhone('+919811000001'))?.shopId).toBe(A);
    await expect(system!.query('SELECT 1 FROM entries')).rejects.toThrow(/permission denied/);
    await expect(system!.query('SELECT 1 FROM parties')).rejects.toThrow(/permission denied/);
    await expect(system!.query("UPDATE users SET phone = '+919800000000'")).rejects.toThrow(/permission denied/);
    await expect(system!.query('DELETE FROM devices')).rejects.toThrow(/permission denied/);
  });
});

/**
 * C-01 · THE SAME SQL, RUN AS AN RDS-STYLE MASTER (found on first boot, 2026-11-18).
 *
 * The describe above runs the file as a SUPERUSER, which is not what production has.
 * On Amazon RDS the owner is a member of rds_superuser: it has CREATEROLE and CREATEDB
 * and is NOT a superuser, so Postgres refuses it any ALTER ROLE that names SUPERUSER or
 * REPLICATION - "Only roles with the SUPERUSER attribute may change the SUPERUSER
 * attribute" - even to write NOSUPERUSER. The file used to, and the deploy died half-way
 * with the roles created and BYPASSRLS unset. This block is that master, mimicked: a
 * non-superuser CREATEROLE login. It also holds BYPASSRLS, because plain Postgres lets a
 * CREATEROLE role grant only attributes it has itself, whereas RDS patches its master to
 * grant BYPASSRLS regardless (confirmed against the live instance); the mimic is the
 * nearest a local server can get. It must run LAST in this file: it drops and recreates
 * the two cluster-wide roles, so that the mimic is their creator and holds ADMIN on them.
 */
describe('C-01 · roles.postgres.sql as an RDS-style non-superuser master', () => {
  const MASTER = 'swafto_rds_master_mimic';
  const MASTER_PASSWORD = randomUUID();
  const RDS_SCHEMA = 'roles_sql_rds';
  const RDS_APP_PASSWORD = randomUUID();
  const RDS_SYS_PASSWORD = randomUUID();
  const RDS_BACKUP_PASSWORD = randomUUID();
  let rdsBackup: Sql | null = null;
  let master: Sql | null = null;
  let rdsApp: Sql | null = null;
  let rdsSystem: Sql | null = null;
  let masterReady = false;

  const connectIn = async (url: string): Promise<Sql> => {
    const mod = (await import('pg')) as unknown as Record<string, unknown>;
    const pg = (mod.default ?? mod) as { Client: new (o: unknown) => Sql };
    const c = new pg.Client({ connectionString: url, connectionTimeoutMillis: 4000 });
    await (c as unknown as { connect(): Promise<void> }).connect();
    await c.query('SET search_path TO ' + RDS_SCHEMA);
    return c;
  };

  maybe()('setup: a CREATEROLE master that is not a superuser applies the file twice and sets passwords', async () => {
    // The two roles are the superuser's creation from above; recreate them as the master's.
    await backup!.end();
    backup = null;
    await owner!.query('DROP OWNED BY swafto_app, swafto_system, swafto_backup');
    await owner!.query('DROP ROLE swafto_app');
    await owner!.query('DROP ROLE swafto_system');
    await owner!.query('DROP ROLE swafto_backup');
    await owner!.query(`DROP SCHEMA IF EXISTS ${RDS_SCHEMA} CASCADE`);
    await owner!.query(`DROP ROLE IF EXISTS ${MASTER}`);
    await owner!.query(`CREATE ROLE ${MASTER} LOGIN CREATEROLE CREATEDB BYPASSRLS PASSWORD '${MASTER_PASSWORD}'`);
    await owner!.query(`CREATE SCHEMA ${RDS_SCHEMA} AUTHORIZATION ${MASTER}`);
    master = await connectIn(as(MASTER, MASTER_PASSWORD));
    const me = (await master.query('SELECT rolsuper FROM pg_roles WHERE rolname = current_user')).rows[0];
    expect(me?.rolsuper).toBe(false); // the premise: this is NOT a superuser
    for (const statement of allMigrationsUp('postgres')) await master.query(statement);
    await master.query(ROLES_SQL);
    await master.query(ROLES_SQL); // idempotent
    await master.query(`ALTER ROLE swafto_app PASSWORD '${RDS_APP_PASSWORD}'`);
    await master.query(`ALTER ROLE swafto_system PASSWORD '${RDS_SYS_PASSWORD}'`);
    await master.query(`ALTER ROLE swafto_backup PASSWORD '${RDS_BACKUP_PASSWORD}'`);
    rdsApp = await connectIn(as('swafto_app', RDS_APP_PASSWORD));
    rdsSystem = await connectIn(as('swafto_system', RDS_SYS_PASSWORD));
    rdsBackup = await connectIn(as('swafto_backup', RDS_BACKUP_PASSWORD));
    masterReady = true;
  });

  maybe()('the roles come out as designed: app NOBYPASSRLS, system BYPASSRLS, neither superuser nor replication', async () => {
    expect(masterReady).toBe(true);
    const rows = (
      await master!.query(
        `SELECT rolname, rolsuper, rolbypassrls, rolreplication, rolcreaterole, rolcreatedb, rolcanlogin
           FROM pg_roles WHERE rolname IN ('swafto_app', 'swafto_backup', 'swafto_system') ORDER BY rolname`,
      )
    ).rows;
    expect(rows).toEqual([
      { rolname: 'swafto_app', rolsuper: false, rolbypassrls: false, rolreplication: false, rolcreaterole: false, rolcreatedb: false, rolcanlogin: true },
      { rolname: 'swafto_backup', rolsuper: false, rolbypassrls: true, rolreplication: false, rolcreaterole: false, rolcreatedb: false, rolcanlogin: true },
      { rolname: 'swafto_system', rolsuper: false, rolbypassrls: true, rolreplication: false, rolcreaterole: false, rolcreatedb: false, rolcanlogin: true },
    ]);
    expect(roleProblems(await describeRole(rdsApp!), await describeRole(rdsSystem!))).toEqual([]);
  });

  maybe()('the app role of that deploy still cannot see a foreign shop\'s rows, even to a forged query', async () => {
    expect(masterReady).toBe(true);
    const repo = pgRepo(rdsApp!, { system: rdsSystem! });
    for (const [shopId, userId, phone, id, amount] of [
      [A, '00000000-0000-7000-8000-0000000000e3', '+919811000001', '00000000-0000-7000-8000-0000000000e5', 111],
      [B, '00000000-0000-7000-8000-0000000000e4', '+919811000002', '00000000-0000-7000-8000-0000000000e6', 222],
    ] as const) {
      await repo.createShopAndUser({ shopId, userId, phone, shopName: 'S', language: 'en', now: NOW });
      await repo.upsertDay({ shopId, date: DATE, state: 'open', openingCash: 0, countedCash: null, differenceReason: null, closedAt: null, startsAt: '00:00', createdAt: NOW });
      await repo.appendEntry(shopId, entry(id, amount));
    }
    expect((await repo.entriesFor(A, DATE)).map((e) => e.amount)).toEqual([111]);
    await rdsApp!.query('BEGIN');
    try {
      await rdsApp!.query("SELECT set_config('swafto.shop_id', $1, true)", [A]);
      expect((await rdsApp!.query('SELECT 1 FROM entries WHERE shop_id = $1', [B])).rows).toEqual([]);
      expect((await rdsApp!.query('SELECT 1 FROM users WHERE shop_id = $1 OR true', [B])).rows).toHaveLength(1);
    } finally {
      await rdsApp!.query('ROLLBACK');
    }
    // and the system role still finds a user across shops but reads no ledger
    expect((await repo.findUserByPhone('+919811000002'))?.shopId).toBe(B);
    await expect(rdsSystem!.query('SELECT 1 FROM entries')).rejects.toThrow(/permission denied/);
    // and the backup role, from the same deploy, reads both shops and writes nothing
    expect((await rdsBackup!.query('SELECT count(*)::int AS n FROM entries')).rows[0]?.n).toBe(2);
    await expect(rdsBackup!.query('DELETE FROM entries')).rejects.toThrow(/permission denied/);
  });

  maybe()('a non-superuser owner REFUSES, rather than carry on, when a swafto role already holds REPLICATION', async () => {
    expect(masterReady).toBe(true);
    // Only a real superuser can plant this; the master then cannot clear it, and must say so. (A role made SUPERUSER is refused earlier still, by Postgres itself: a non-superuser may not alter a superuser.)
    await owner!.query('ALTER ROLE swafto_app REPLICATION');
    try {
      await expect(master!.query(ROLES_SQL)).rejects.toThrow(/SUPERUSER or REPLICATION/);
    } finally {
      await owner!.query('ALTER ROLE swafto_app NOREPLICATION');
    }
    await master!.query(ROLES_SQL); // clean again, so it passes
  });

  maybe()('it runs on a database that has no schema yet (roles and passwords first, grants after the first migration)', async () => {
    // First boot on RDS: the roles had to exist, with passwords, before any deploy applied
    // the schema. The system-role grants named users/devices/consents unconditionally and
    // the whole file died here.
    expect(masterReady).toBe(true);
    await owner!.query('DROP SCHEMA IF EXISTS roles_sql_empty CASCADE');
    await owner!.query(`CREATE SCHEMA roles_sql_empty AUTHORIZATION ${MASTER}`);
    try {
      await master!.query('SET search_path TO roles_sql_empty');
      await master!.query(ROLES_SQL);
      await master!.query(`ALTER ROLE swafto_system PASSWORD '${RDS_SYS_PASSWORD}'`);
      const r = (await master!.query("SELECT rolbypassrls FROM pg_roles WHERE rolname = 'swafto_system'")).rows[0];
      expect(r?.rolbypassrls).toBe(true);
    } finally {
      await master!.query(`SET search_path TO ${RDS_SCHEMA}`);
      await owner!.query('DROP SCHEMA IF EXISTS roles_sql_empty CASCADE');
    }
  });

  afterAll(async () => {
    try {
      await rdsApp?.end();
      await rdsSystem?.end();
      await rdsBackup?.end();
      await master?.end();
      await owner?.query(`DROP SCHEMA IF EXISTS ${RDS_SCHEMA} CASCADE`);
      await owner?.query(`DROP OWNED BY ${MASTER}`);
      await owner?.query(`DROP ROLE IF EXISTS ${MASTER}`);
    } catch {
      /* a throwaway container */
    }
  });
});
