/**
 * DECISION 1 IN THE DATABASE, ON BOTH ENGINES.
 *
 * A day row carries the start time it was created under (`starts_at`). A row
 * written without one is a calendar day, '00:00' - every day recorded before the
 * setting existed. Once written, the start never changes: not on an open day, and
 * a closed day stays frozen whole (D7). Postgres runs when one is listening
 * (`node tools/pg-up.mjs`), in its own schema so it cannot collide with the
 * other suites on the same database.
 */
import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migrationUp } from '../src/spec.ts';

const SHOP = '00000000-0000-7000-8000-0000000000d1';
const NOW = '2026-10-12T00:30:00.000+05:30';

interface Engine {
  run(sql: string): Promise<void>;
  one(sql: string): Promise<Record<string, unknown> | undefined>;
}

function sqliteEngine(): Engine {
  const db = new DatabaseSync(':memory:');
  for (const s of migrationUp('sqlite')) db.exec(s);
  return {
    run: async (sql) => void db.exec(sql),
    one: async (sql) => db.prepare(sql).get() as Record<string, unknown> | undefined,
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
  await c.query('DROP SCHEMA IF EXISTS day_start CASCADE');
  await c.query('CREATE SCHEMA day_start');
  await c.query('SET search_path TO day_start');
  for (const s of migrationUp('postgres')) await c.query(s);
  pgEngine = {
    run: async (sql) => void (await c.query(sql)),
    one: async (sql) => (await c.query(sql)).rows[0],
  };
} catch {
  pgEngine = null;
}

function contract(label: string, make: () => Engine | null) {
  const maybe = make() ? it : it.skip;
  describe(label, () => {
    const seed = async () => {
      const db = make()!;
      await db.run(`DELETE FROM days`);
      await db.run(`DELETE FROM shops`);
      await db.run(`INSERT INTO shops (id, name, type, language, created_at)
                    VALUES ('${SHOP}', 'Test Store', 'kirana', 'en', '${NOW}')`);
      // A day from before the setting: no starts_at given at all.
      await db.run(`INSERT INTO days (shop_id, date, state, opening_cash, created_at)
                    VALUES ('${SHOP}', '2026-10-10', 'open', 0, '${NOW}')`);
      // A day made under a 05:00 start, then closed.
      await db.run(`INSERT INTO days (shop_id, date, state, opening_cash, counted_cash, closed_at, created_at, starts_at)
                    VALUES ('${SHOP}', '2026-10-11', 'closed', 0, 0, '${NOW}', '${NOW}', '05:00')`);
      return db;
    };
    const startOf = async (db: Engine, date: string) =>
      String((await db.one(`SELECT starts_at FROM days WHERE date = '${date}'`))?.starts_at);

    maybe('a day written without a start is a calendar day, 00:00', async () => {
      const db = await seed();
      expect(await startOf(db, '2026-10-10')).toBe('00:00');
      expect(await startOf(db, '2026-10-11')).toBe('05:00');
    });

    maybe('an open day keeps the start it was created under', async () => {
      const db = await seed();
      await expect(
        db.run(`UPDATE days SET starts_at = '05:00' WHERE date = '2026-10-10'`),
      ).rejects.toThrow(/start time it was created under/);
      expect(await startOf(db, '2026-10-10')).toBe('00:00');
      // Anything else on an open day still moves as it always did.
      await db.run(`UPDATE days SET opening_cash = 500 WHERE date = '2026-10-10'`);
    });

    maybe('a closed day stays frozen, its start included (D7)', async () => {
      const db = await seed();
      await expect(
        db.run(`UPDATE days SET starts_at = '00:00' WHERE date = '2026-10-11'`),
      ).rejects.toThrow();
      expect(await startOf(db, '2026-10-11')).toBe('05:00');
    });

    maybe('refuses a start that is not a real HH:MM', async () => {
      const db = await seed();
      for (const bad of ['24:00', '5:00', '05:60', 'ab:cd', '']) {
        await expect(
          db.run(`INSERT INTO days (shop_id, date, state, created_at, starts_at)
                  VALUES ('${SHOP}', '2026-10-20', 'open', '${NOW}', '${bad}')`),
          bad,
        ).rejects.toThrow();
      }
    });
  });
}

contract('decision 1 - sqlite', sqliteEngine);
contract('decision 1 - postgres', () => pgEngine);
