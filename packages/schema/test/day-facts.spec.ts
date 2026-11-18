/**
 * DECISIONS 2 AND 3 IN THE DATABASE, ON BOTH ENGINES.
 *
 * `upi_confirmations` and `adjustments` are day facts with the entries' own two
 * guarantees: append-only (D1) and never written into a closed day (D7). An
 * adjustment's type is from the fixed list and there is no column a free-text
 * reason could go in. Postgres runs when one is listening (`node tools/pg-up.mjs`),
 * in its own schema so it cannot collide with the other suites.
 */
import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migrationUp } from '../src/spec.ts';

const SHOP = '00000000-0000-7000-8000-0000000000f1';
const OPEN = '2026-07-15';
const CLOSED = '2026-07-14';
const UPI = '01890000-0000-7000-8000-0000000000f1';
const CASH = '01890000-0000-7000-8000-0000000000f2';
const LATE = '01890000-0000-7000-8000-0000000000f3';
const NOW = '2026-07-15T18:00:00.000Z';
const id = (n: number) => '01890000-0000-7000-8000-0000000001' + String(n).padStart(2, '0');

interface Engine {
  run(sql: string): Promise<void>;
  all(sql: string): Promise<Record<string, unknown>[]>;
  /** Empty every table this suite writes - the one sanctioned delete. */
  reset(): Promise<void>;
}

const TABLES = ['upi_confirmations', 'adjustments', 'party_credit_limits', 'entries', 'days', 'parties', 'shops'];
const PARTY = '01890000-0000-7000-8000-0000000000f9';

function sqliteEngine(): Engine {
  // A fresh database per call, so there is never anything to delete.
  const db = new DatabaseSync(':memory:');
  for (const s of migrationUp('sqlite')) db.exec(s);
  return {
    run: async (sql) => void db.exec(sql),
    all: async (sql) => db.prepare(sql).all() as Record<string, unknown>[],
    reset: async () => {},
  };
}

const URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55432/swafto_test';
let pgEngine: Engine | null = null;
try {
  const mod = (await import('pg')) as unknown as Record<string, unknown>;
  const pg = (mod.default ?? mod) as {
    Client: new (o: unknown) => {
      connect(): Promise<void>;
      query(sql: string): Promise<{ rows: Record<string, unknown>[] }>;
    };
  };
  const c = new pg.Client({ connectionString: URL, connectionTimeoutMillis: 4000 });
  await c.connect();
  await c.query('DROP SCHEMA IF EXISTS day_facts CASCADE');
  await c.query('CREATE SCHEMA day_facts');
  await c.query('SET search_path TO day_facts');
  for (const s of migrationUp('postgres')) await c.query(s);
  pgEngine = {
    run: async (sql) => void (await c.query(sql)),
    all: async (sql) => (await c.query(sql)).rows,
    // The erasure flag, LOCAL to one transaction exactly as purgeShop sets it.
    reset: async () =>
      void (await c.query(
        "BEGIN; SET LOCAL swafto.erasure = 'on'; " +
          TABLES.map((t) => `DELETE FROM ${t};`).join(' ') +
          ' COMMIT;',
      )),
  };
} catch {
  pgEngine = null;
}

function contract(label: string, make: () => Engine | null) {
  const maybe = make() ? it : it.skip;
  describe(label, () => {
    const seed = async () => {
      const db = make()!;
      await db.reset();
      await db.run(`INSERT INTO shops (id, name, type, language, created_at)
                    VALUES ('${SHOP}', 'Test Store', 'kirana', 'en', '${NOW}')`);
      for (const date of [OPEN, CLOSED]) {
        await db.run(`INSERT INTO days (shop_id, date, state, opening_cash, created_at)
                      VALUES ('${SHOP}', '${date}', 'open', 0, '${NOW}')`);
      }
      for (const [eid, day, section, mode] of [
        [UPI, OPEN, 'upi_sales', 'upi'],
        [CASH, OPEN, 'cash_sales', 'cash'],
        [LATE, CLOSED, 'upi_sales', 'upi'],
      ]) {
        await db.run(`INSERT INTO entries (id, shop_id, day_id, section, amount, mode, created_at)
                      VALUES ('${eid}', '${SHOP}', '${day}', '${section}', 30000, '${mode}', '${NOW}')`);
      }
      await db.run(`UPDATE days SET state = 'closed', counted_cash = 0, closed_at = '${NOW}'
                    WHERE date = '${CLOSED}'`);
      await db.run(`INSERT INTO parties (id, shop_id, kind, name, created_at)
                    VALUES ('${PARTY}', '${SHOP}', 'customer', 'Ramesh', '${NOW}')`);
      return db;
    };
    const confirmSql = (n: number, entry: string, day = OPEN) =>
      `INSERT INTO upi_confirmations (id, shop_id, day_id, entry_id, confirmed_at)
       VALUES ('${id(n)}', '${SHOP}', '${day}', '${entry}', '${NOW}')`;
    const adjustSql = (n: number, type: string, amount: number, day = OPEN) =>
      `INSERT INTO adjustments (id, shop_id, day_id, type, amount, created_at)
       VALUES ('${id(n)}', '${SHOP}', '${day}', '${type}', ${amount}, '${NOW}')`;

    maybe('a confirmation and an adjustment land on an open day', async () => {
      const db = await seed();
      await db.run(confirmSql(1, UPI));
      await db.run(adjustSql(2, 'counterfeit_note', 50000));
      expect(await db.all('SELECT id FROM upi_confirmations')).toHaveLength(1);
      expect(await db.all('SELECT id FROM adjustments')).toHaveLength(1);
    });

    maybe('both are append-only: UPDATE and DELETE are refused (D1)', async () => {
      const db = await seed();
      await db.run(confirmSql(1, UPI));
      await db.run(adjustSql(2, 'rounding_given', 200));
      await expect(db.run(`UPDATE adjustments SET amount = 1`)).rejects.toThrow(/append-only/);
      await expect(db.run(`DELETE FROM adjustments`)).rejects.toThrow(/append-only/);
      await expect(
        db.run(`UPDATE upi_confirmations SET confirmed_at = '${NOW}'`),
      ).rejects.toThrow(/append-only/);
      await expect(db.run(`DELETE FROM upi_confirmations`)).rejects.toThrow(/append-only/);
      expect(await db.all('SELECT amount FROM adjustments')).toEqual([{ amount: expect.anything() }]);
    });

    maybe('neither may land in a closed day (D7)', async () => {
      const db = await seed();
      await expect(db.run(confirmSql(1, LATE, CLOSED))).rejects.toThrow(/closed/);
      await expect(db.run(adjustSql(2, 'home_use', 100, CLOSED))).rejects.toThrow(/closed/);
    });

    maybe('a receipt is confirmed once', async () => {
      const db = await seed();
      await db.run(confirmSql(1, UPI));
      await expect(db.run(confirmSql(2, UPI))).rejects.toThrow();
    });

    maybe('an adjustment type is from the fixed list, its amount whole positive paise', async () => {
      const db = await seed();
      for (const bad of ['other', 'misc', '']) {
        await expect(db.run(adjustSql(3, bad, 100)), bad).rejects.toThrow();
      }
      await expect(db.run(adjustSql(4, 'rounding_kept', 0))).rejects.toThrow();
      await expect(db.run(adjustSql(5, 'rounding_kept', -100))).rejects.toThrow();
    });

    const limitSql = (n: number, limit: string) =>
      `INSERT INTO party_credit_limits (id, shop_id, party_id, limit_paise, set_at)
       VALUES ('${id(n)}', '${SHOP}', '${PARTY}', ${limit}, '${NOW}')`;

    maybe('R5 FR-6: a credit limit is append-only, whole positive paise or NULL', async () => {
      const db = await seed();
      await db.run(limitSql(6, '500000'));
      // Clearing it is a new row, never an UPDATE.
      await db.run(limitSql(7, 'NULL'));
      await expect(db.run(`UPDATE party_credit_limits SET limit_paise = 1`)).rejects.toThrow(/append-only/);
      await expect(db.run(`DELETE FROM party_credit_limits`)).rejects.toThrow(/append-only/);
      await expect(db.run(limitSql(8, '0'))).rejects.toThrow();
      await expect(db.run(limitSql(9, '-100'))).rejects.toThrow();
      expect(await db.all('SELECT id FROM party_credit_limits')).toHaveLength(2);
    });

    maybe('an adjustment has no column a free-text reason could go in', async () => {
      const db = await seed();
      const rows = await db.all(
        label.includes('sqlite')
          ? `SELECT name FROM pragma_table_info('adjustments')`
          : `SELECT column_name AS name FROM information_schema.columns
             WHERE table_schema = 'day_facts' AND table_name = 'adjustments'`,
      );
      expect(rows.map((r) => String(r.name)).sort()).toEqual([
        'amount',
        'created_at',
        'day_id',
        'device_id',
        'id',
        'shop_id',
        'type',
      ]);
    });
  });
}

contract('decisions 2 and 3 - sqlite', sqliteEngine);
contract('decisions 2 and 3 - postgres', () => pgEngine);
