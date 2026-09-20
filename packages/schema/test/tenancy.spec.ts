/**
 * S-10 · THE CROSS-TENANT READ, ATTACKED RATHER THAN ASSERTED.
 *
 * The highest-severity threat in the audit: one shopkeeper seeing another
 * shop's takings and customers. Three layers are supposed to stop it - the
 * routes take the shop from the session, the repository scopes every query,
 * and Postgres enforces Row-Level Security underneath both.
 *
 * The first two are tested. The third was ASSERTED PRESENT: a test read the
 * catalogue and confirmed a policy existed on each table. That is a very
 * different claim from "a cross-tenant read is refused", and REVIEW has
 * carried the missing plant as an owed debt since iteration 19, deferred
 * until routes existed. This is that plant.
 *
 * WHY IT NEEDS ITS OWN ROLE, AND WHY THAT MATTERS MORE THAN IT SOUNDS.
 * Postgres exempts SUPERUSERS from RLS, and every other test in this
 * repository connects as `postgres`, which is one. A test of RLS that
 * connects as a superuser passes whatever the policies say - it would pass
 * with no policies at all. So this creates a plain LOGIN role, grants it only
 * what the application needs, and attacks from there.
 *
 * `FORCE ROW LEVEL SECURITY` in the DDL is what makes the table OWNER subject
 * to its own policies too. Without it, an application connecting as the owner
 * - which is the ordinary deployment - would bypass everything.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { migrationUp } from '../src/spec.ts';
import { assertPaise } from '@swafto/formula-engine';

/**
 * A BIGINT arrives from `pg` as a string, and `Number()` on money is banned by
 * ADR-003 - `check:money` caught this file doing it, which is the lint working
 * on the person who wrote the lint's subject. The engine's own guard is what
 * production uses (`paise()` in postgres.ts) and it refuses a non-integer
 * rather than rounding one.
 */
const paise = (value: unknown): number =>
  assertPaise(typeof value === 'string' ? Number.parseInt(value, 10) : (value as number), 'amount');

const DEFAULT_URL = 'postgres://postgres:postgres@localhost:55432/swafto_test';
const URL = process.env.DATABASE_URL ?? DEFAULT_URL;

/** Two shops, and the second one is the victim. */
const MINE = '00000000-0000-7000-8000-000000000001';
const THEIRS = '00000000-0000-7000-8000-000000000002';
const DAY = '2026-07-15';
const NOW = '2026-07-15T10:00:00.000Z';
const MY_AMOUNT = 12345;
const THEIR_AMOUNT = 99999;

/** The role the application would connect as: no superuser, no BYPASSRLS. */
const APP_ROLE = 'swafto_rls_probe';
/*
 * GENERATED, NOT WRITTEN DOWN. `check:secrets` flagged the literal that was
 * here, and it was right to: a password in a source file is a password in a
 * source file, and the fact that this one guards a throwaway role in a
 * disposable container is a judgement the scanner should not have to make.
 * A fresh one per run needs no exception and no explanation.
 */
const APP_PASSWORD = randomUUID();
const SCHEMA = 'tenancy_probe';

type Sql = {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
};

let owner: Sql | null = null;
let tenant: Sql | null = null;
let reachable = false;
let skipReason = 'not attempted';

const connect = async (url: string): Promise<Sql> => {
  const mod = (await import('pg')) as unknown as Record<string, unknown>;
  const pg = (mod.default ?? mod) as { Client: new (o: unknown) => Sql };
  const c = new pg.Client({ connectionString: url, connectionTimeoutMillis: 4000 });
  await (c as unknown as { connect(): Promise<void> }).connect();
  return c;
};

const asProbe = () => {
  const u = new global.URL(URL);
  u.username = APP_ROLE;
  u.password = APP_PASSWORD;
  return u.toString();
};

/*
 * Module scope, not `beforeAll`: whether these cases are REGISTERED is decided
 * during collection, and a hook has not run by then. This file's siblings
 * learned that the expensive way.
 */
try {
  owner = await connect(URL);

  await owner.query('DROP SCHEMA IF EXISTS ' + SCHEMA + ' CASCADE');
  await owner.query('CREATE SCHEMA ' + SCHEMA);
  await owner.query('SET search_path TO ' + SCHEMA);
  for (const statement of migrationUp('postgres')) await owner.query(statement);

  // Two shops, one entry each. The figures differ so a leak is unmistakable.
  for (const [shop, amount] of [
    [MINE, MY_AMOUNT],
    [THEIRS, THEIR_AMOUNT],
  ] as const) {
    await owner.query(
      "INSERT INTO shops (id, name, type, language, created_at) VALUES ($1, 'Shop', 'kirana', 'en', $2)",
      [shop, NOW],
    );
    await owner.query(
      "INSERT INTO days (shop_id, date, state, created_at) VALUES ($1, $2, 'open', $3)",
      [shop, DAY, NOW],
    );
    await owner.query(
      'INSERT INTO entries (id, shop_id, day_id, section, amount, mode, created_at, source) ' +
        "VALUES (gen_random_uuid(), $1, $2, 'cash_sales', $3, 'cash', $4, 'manual')",
      [shop, DAY, amount, NOW],
    );
  }

  /*
   * The role, dropped and recreated so a previous run cannot leave it holding
   * privileges this one did not grant - which would be a test passing because
   * of yesterday's state.
   */
  await owner.query(
    "DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '" +
      APP_ROLE +
      "') THEN EXECUTE 'DROP OWNED BY " +
      APP_ROLE +
      "'; EXECUTE 'DROP ROLE " +
      APP_ROLE +
      "'; END IF; END $$",
  );
  await owner.query(
    'CREATE ROLE ' + APP_ROLE + " LOGIN PASSWORD '" + APP_PASSWORD + "' NOBYPASSRLS",
  );
  await owner.query('GRANT USAGE ON SCHEMA ' + SCHEMA + ' TO ' + APP_ROLE);
  await owner.query('GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA ' + SCHEMA + ' TO ' + APP_ROLE);

  /*
   * THE PROBE IS MADE THE TABLE OWNER, DELIBERATELY, AND THIS IS WHAT TESTS
   * `FORCE ROW LEVEL SECURITY`.
   *
   * Plain `ENABLE` exempts the table's owner from its own policies. The
   * ordinary deployment connects as the user that owns the schema, so without
   * FORCE the application would bypass every policy while a catalogue check
   * still reported them present - the most convincing kind of false security.
   *
   * Found by running the plant: removing FORCE from the DDL left this suite
   * green, because the probe was not the owner. A plant that does not move the
   * result means the test is aimed slightly beside the guard.
   */
  const tables = await owner.query(
    'SELECT tablename FROM pg_tables WHERE schemaname = $1',
    [SCHEMA],
  );
  for (const row of tables.rows) {
    await owner.query(
      'ALTER TABLE ' + SCHEMA + '.' + String(row.tablename) + ' OWNER TO ' + APP_ROLE,
    );
  }

  tenant = await connect(asProbe());
  await tenant.query('SET search_path TO ' + SCHEMA);

  reachable = true;
} catch (e) {
  skipReason = (e as Error).message;
}

const maybe = () => (reachable ? it : it.skip);

afterAll(async () => {
  try {
    await tenant?.end();
    if (owner) {
      await owner.query('DROP SCHEMA IF EXISTS ' + SCHEMA + ' CASCADE');
      await owner.query('DROP OWNED BY ' + APP_ROLE);
      await owner.query('DROP ROLE IF EXISTS ' + APP_ROLE);
      await owner.end();
    }
  } catch {
    /* a throwaway container; a failed clean-up is not a test result */
  }
});

describe('S-10 · Row-Level Security refuses a cross-tenant read', () => {
  it('reports whether it ran at all, because a silent skip proves nothing', () => {
    if (!reachable) {
      console.log(
        '\n  [tenancy] SKIPPED: ' +
          skipReason +
          '\n  Start a database with: node tools/pg-up.mjs' +
          '\n  CI always has one, so CI always runs this.\n',
      );
    }
    expect(typeof reachable).toBe('boolean');
  });

  maybe()('the probe OWNS these tables, which is what makes FORCE the thing under test', async () => {
    const { rows } = await tenant!.query(
      "SELECT tableowner FROM pg_tables WHERE schemaname = $1 AND tablename = 'entries'",
      [SCHEMA],
    );
    expect(rows[0]!.tableowner).toBe(APP_ROLE);
  });

  maybe()('the probe role is NOT a superuser, or this whole file proves nothing', async () => {
    /*
     * The check that makes every other case here meaningful. Postgres exempts
     * superusers from RLS, so an RLS test connected as one passes with no
     * policies at all.
     */
    const { rows } = await tenant!.query(
      'SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user',
    );
    expect(rows[0]!.rolsuper).toBe(false);
    expect(rows[0]!.rolbypassrls).toBe(false);
  });

  maybe()('WITH MY SHOP SET, I see my entry and exactly one entry', async () => {
    await tenant!.query("SELECT set_config('swafto.shop_id', $1, false)", [MINE]);
    const { rows } = await tenant!.query('SELECT shop_id, amount FROM entries');
    expect(rows).toHaveLength(1);
    expect(paise(rows[0]!.amount)).toBe(MY_AMOUNT);
    expect(rows[0]!.shop_id).toBe(MINE);
  });

  maybe()('ASKING FOR THEIR SHOP BY ID RETURNS NOTHING - the row is invisible', async () => {
    /*
     * The attack in its simplest form: a query that names the other shop
     * explicitly. The policy is not a filter the application chooses to apply -
     * it is applied to every statement, so the row is not there to be asked
     * about.
     */
    await tenant!.query("SELECT set_config('swafto.shop_id', $1, false)", [MINE]);
    const { rows } = await tenant!.query('SELECT amount FROM entries WHERE shop_id = $1', [
      THEIRS,
    ]);
    expect(rows).toEqual([]);
  });

  maybe()('and neither does a count, a sum or an EXISTS', async () => {
    // A leak does not need rows. "How much did they take" is answerable from a
    // SUM, and "is this shop real" from an EXISTS.
    await tenant!.query("SELECT set_config('swafto.shop_id', $1, false)", [MINE]);
    const count = await tenant!.query('SELECT count(*)::int AS c FROM entries');
    expect(count.rows[0]!.c).toBe(1);

    const sum = await tenant!.query('SELECT coalesce(sum(amount), 0)::bigint AS t FROM entries');
    expect(paise(sum.rows[0]!.t)).toBe(MY_AMOUNT);

    const exists = await tenant!.query(
      'SELECT EXISTS (SELECT 1 FROM entries WHERE shop_id = $1) AS e',
      [THEIRS],
    );
    expect(exists.rows[0]!.e).toBe(false);
  });

  maybe()('the days table is scoped too, not only entries', async () => {
    /*
     * A12: the policy is per TABLE, so the table is the axis. Testing entries
     * alone would be testing one of seven policies and reporting on all seven.
     */
    await tenant!.query("SELECT set_config('swafto.shop_id', $1, false)", [MINE]);
    for (const table of ['days', 'entries']) {
      const { rows } = await tenant!.query('SELECT shop_id FROM ' + table);
      expect(
        rows.every((r) => r.shop_id === MINE),
        table,
      ).toBe(true);
      expect(rows.length, table).toBeGreaterThan(0);
    }
  });

  maybe()('WITH NO SHOP SET, nothing is visible at all - it fails closed', async () => {
    /*
     * The case that decides whether this is a security control or a
     * convenience. If an unset GUC meant "see everything", every bug that
     * forgot to set it would be a full disclosure. `current_setting(..., true)`
     * returns NULL, the comparison is NULL, and no row qualifies.
     */
    const fresh = await connect(asProbe());
    try {
      await fresh.query('SET search_path TO ' + SCHEMA);
      const { rows } = await fresh.query('SELECT count(*)::int AS c FROM entries');
      expect(rows[0]!.c).toBe(0);
    } finally {
      await fresh.end();
    }
  });

  maybe()('switching the GUC switches the tenant, and never widens it', async () => {
    await tenant!.query("SELECT set_config('swafto.shop_id', $1, false)", [THEIRS]);
    const theirs = await tenant!.query('SELECT amount FROM entries');
    expect(theirs.rows).toHaveLength(1);
    expect(paise(theirs.rows[0]!.amount)).toBe(THEIR_AMOUNT);

    await tenant!.query("SELECT set_config('swafto.shop_id', $1, false)", [MINE]);
    const mine = await tenant!.query('SELECT amount FROM entries');
    expect(mine.rows).toHaveLength(1);
    expect(paise(mine.rows[0]!.amount)).toBe(MY_AMOUNT);
  });

  maybe()('a WRITE into another shop is refused by the same policy', async () => {
    /*
     * S-11 at the database layer. The routes already refuse a forged shop id;
     * this is what stops a bug that gets past them from writing into somebody
     * else's book.
     */
    await tenant!.query("SELECT set_config('swafto.shop_id', $1, false)", [MINE]);
    await expect(
      tenant!.query(
        'INSERT INTO entries (id, shop_id, day_id, section, amount, mode, created_at, source) ' +
          "VALUES (gen_random_uuid(), $1, $2, 'cash_sales', 500, 'cash', $3, 'manual')",
        [THEIRS, DAY, NOW],
      ),
    ).rejects.toThrow();
  });
});
