/**
 * PR-1 (PREMIUM) IN THE DATABASE, ON BOTH ENGINES.
 *
 * `items` is the shop's own list: names only, no price, no stock, append-only.
 * `item_lines` is a day fact of a sale: append-only (D1), never into a closed
 * day (D7), only against a SALE of its own day, never another shop's sale or
 * item (S-11), and a sale's lines never come to MORE than the sale.
 */
import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migrationUp } from '../src/spec.ts';

const SHOP = '00000000-0000-7000-8000-0000000000a1';
const OTHER_SHOP = '00000000-0000-7000-8000-0000000000a2';
const OPEN = '2026-07-15';
const CLOSED = '2026-07-14';
const SALE = '01890000-0000-7000-8000-0000000000a1';
const EXPENSE = '01890000-0000-7000-8000-0000000000a2';
const OLD_SALE = '01890000-0000-7000-8000-0000000000a3';
const FOREIGN_SALE = '01890000-0000-7000-8000-0000000000a4';
const TEA = '01890000-0000-7000-8000-0000000000b1';
const FOREIGN_ITEM = '01890000-0000-7000-8000-0000000000b2';
const NOW = '2026-07-15T18:00:00.000Z';
const id = (n: number) => '01890000-0000-7000-8000-0000000002' + String(n).padStart(2, '0');

interface Engine {
  run(sql: string): Promise<void>;
  all(sql: string): Promise<Record<string, unknown>[]>;
  reset(): Promise<void>;
}

const TABLES = ['item_lines', 'items', 'entries', 'days', 'shops'];

function sqliteEngine(): Engine {
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
  await c.query('DROP SCHEMA IF EXISTS items_test CASCADE');
  await c.query('CREATE SCHEMA items_test');
  await c.query('SET search_path TO items_test');
  for (const s of migrationUp('postgres')) await c.query(s);
  pgEngine = {
    run: async (sql) => void (await c.query(sql)),
    all: async (sql) => (await c.query(sql)).rows,
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
      for (const shop of [SHOP, OTHER_SHOP]) {
        await db.run(`INSERT INTO shops (id, name, type, language, created_at)
                      VALUES ('${shop}', 'Test Store', 'kirana', 'en', '${NOW}')`);
        for (const date of [OPEN, CLOSED]) {
          await db.run(`INSERT INTO days (shop_id, date, state, opening_cash, created_at)
                        VALUES ('${shop}', '${date}', 'open', 0, '${NOW}')`);
        }
      }
      for (const [eid, shop, day, section, mode] of [
        [SALE, SHOP, OPEN, 'cash_sales', 'cash'],
        [EXPENSE, SHOP, OPEN, 'expense', 'cash'],
        [OLD_SALE, SHOP, CLOSED, 'cash_sales', 'cash'],
        [FOREIGN_SALE, OTHER_SHOP, OPEN, 'cash_sales', 'cash'],
      ]) {
        await db.run(`INSERT INTO entries (id, shop_id, day_id, section, amount, mode, created_at)
                      VALUES ('${eid}', '${shop}', '${day}', '${section}', 50000, '${mode}', '${NOW}')`);
      }
      await db.run(`INSERT INTO items (id, shop_id, name, created_at) VALUES ('${TEA}', '${SHOP}', 'Tea', '${NOW}')`);
      await db.run(
        `INSERT INTO items (id, shop_id, name, created_at) VALUES ('${FOREIGN_ITEM}', '${OTHER_SHOP}', 'Soap', '${NOW}')`,
      );
      await db.run(`UPDATE days SET state = 'closed', counted_cash = 0, closed_at = '${NOW}'
                    WHERE date = '${CLOSED}' AND shop_id = '${SHOP}'`);
      return db;
    };
    const line = (n: number, amount: number, o: { entry?: string; item?: string | null; day?: string; q?: number } = {}) =>
      `INSERT INTO item_lines (id, shop_id, day_id, entry_id, item_id, quantity, amount, created_at)
       VALUES ('${id(n)}', '${SHOP}', '${o.day ?? OPEN}', '${o.entry ?? SALE}',
               ${o.item === null ? 'NULL' : `'${o.item ?? TEA}'`}, ${o.q ?? 1}, ${amount}, '${NOW}')`;

    maybe('lines land on a sale, "Other" included, and may come to less than the sale', async () => {
      const db = await seed();
      await db.run(line(1, 20000));
      await db.run(line(2, 10000, { item: null }));
      expect(await db.all('SELECT id FROM item_lines')).toHaveLength(2);
    });

    maybe("a sale's lines never come to more than the sale", async () => {
      const db = await seed();
      await db.run(line(1, 30000));
      await db.run(line(2, 20000)); // exactly the sale: allowed
      await expect(db.run(line(3, 1))).rejects.toThrow(/more than the sale|PR-1/);
    });

    maybe('a line hangs off a sale of its own day, never an expense or another day', async () => {
      const db = await seed();
      await expect(db.run(line(1, 100, { entry: EXPENSE }))).rejects.toThrow(/sale/);
      await expect(db.run(line(2, 100, { day: CLOSED }))).rejects.toThrow();
    });

    maybe('never into a closed day (D7)', async () => {
      const db = await seed();
      await expect(db.run(line(1, 100, { entry: OLD_SALE, day: CLOSED }))).rejects.toThrow(/closed/);
    });

    maybe("never another shop's sale or item (S-11)", async () => {
      const db = await seed();
      await expect(db.run(line(1, 100, { entry: FOREIGN_SALE }))).rejects.toThrow();
      await expect(db.run(line(2, 100, { item: FOREIGN_ITEM }))).rejects.toThrow();
    });

    maybe('both tables are append-only (D1)', async () => {
      const db = await seed();
      await db.run(line(1, 100));
      await expect(db.run(`UPDATE item_lines SET amount = 1`)).rejects.toThrow(/append-only/);
      await expect(db.run(`DELETE FROM item_lines`)).rejects.toThrow(/append-only/);
      await expect(db.run(`UPDATE items SET name = 'x'`)).rejects.toThrow(/append-only/);
      await expect(db.run(`DELETE FROM items`)).rejects.toThrow(/append-only/);
    });

    maybe('quantity is a whole count, amount whole positive paise', async () => {
      const db = await seed();
      await expect(db.run(line(1, 100, { q: 0 }))).rejects.toThrow();
      await expect(db.run(line(2, 0))).rejects.toThrow();
      await expect(db.run(line(3, -100))).rejects.toThrow();
    });

    maybe('the item list holds a name and nothing a price or stock figure could go in', async () => {
      const db = await seed();
      const rows = await db.all(
        label.includes('sqlite')
          ? `SELECT name FROM pragma_table_info('items')`
          : `SELECT column_name AS name FROM information_schema.columns
             WHERE table_schema = 'items_test' AND table_name = 'items'`,
      );
      expect(rows.map((r) => String(r.name)).sort()).toEqual(['created_at', 'id', 'name', 'shop_id']);
    });
  });
}

contract('PR-1 items - sqlite', sqliteEngine);
contract('PR-1 items - postgres', () => pgEngine);
