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
  app = await connect(as('swafto_app', APP_PASSWORD));
  system = await connect(as('swafto_system', SYS_PASSWORD));
  reachable = true;
} catch (e) {
  skipReason = (e as Error).message;
}
const maybe = () => (reachable ? it : it.skip);

afterAll(async () => {
  try {
    await app?.end();
    await system?.end();
    if (owner) {
      await owner.query('DROP SCHEMA IF EXISTS ' + SCHEMA + ' CASCADE');
      await owner.query('DROP OWNED BY swafto_app, swafto_system');
      await owner.query('DROP ROLE IF EXISTS swafto_app');
      await owner.query('DROP ROLE IF EXISTS swafto_system');
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
