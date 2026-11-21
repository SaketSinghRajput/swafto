/**
 * CANCEL THIS ENTRY · the database half (migration 0006, docs/design/CANCEL-ENTRY-GATE.md), on BOTH engines.
 *
 * SQLite carries the column in its CREATE TABLE; Postgres gets it from migration 0006 (ALTER only), applied here
 * in its own schema so a missing migration fails. Each guard is tested by the thing that does the refusing:
 * the partial UNIQUE index (a second cancel), the (shop_id, cancels_entry_id) FK (another shop's entry), the
 * existing closed-day trigger (D7: no cancel into a closed day), the self-cancel and plain-row CHECKs.
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { allMigrationsDown, allMigrationsUp, migration6Down, migration6Up, migrationUp } from '../src/spec.ts';

const SHOP = '00000000-0000-7000-8000-000000000001';
const OTHER = '00000000-0000-7000-8000-000000000002';
const OPEN_DAY = '2026-07-15';
const CLOSED_DAY = '2026-07-12';
const NOW = '2026-07-15T10:00:00.000Z';
let n = 0;
const uid = () => `01890000-0000-7000-8000-${String(++n).padStart(12, '0')}`;

/** `?` placeholders in, whichever style the engine wants out. */
type Run = (sql: string, params?: unknown[]) => Promise<void>;
interface Engine {
  run: Run;
  count: (sql: string) => Promise<number>;
}

async function seedShops(run: Run) {
  for (const shop of [SHOP, OTHER]) {
    await run(`INSERT INTO shops (id, name, type, language, created_at) VALUES ('${shop}', 'S', 'kirana', 'en', '${NOW}')`);
    await run(`INSERT INTO days (shop_id, date, state, opening_cash, created_at) VALUES ('${shop}', '${OPEN_DAY}', 'open', 0, '${NOW}')`);
    await run(`INSERT INTO days (shop_id, date, state, opening_cash, created_at) VALUES ('${shop}', '${CLOSED_DAY}', 'open', 0, '${NOW}')`);
  }
}

const sale_ = async (
  run: Run,
  o: { id?: string; shop?: string; day?: string; cancels?: string | null; amount?: number; corrects?: string | null },
): Promise<string> => {
  const id = o.id ?? uid();
  await run(
    `INSERT INTO entries (id, shop_id, day_id, section, amount, mode, created_at, source, cancels_entry_id, corrects_day_id)
     VALUES (?, ?, ?, 'cash_sales', ?, 'cash', ?, 'manual', ?, ?)`,
    [id, o.shop ?? SHOP, o.day ?? OPEN_DAY, o.amount ?? 50000, NOW, o.cancels ?? null, o.corrects ?? null],
  );
  return id;
};

/** A return leg of `target`, mode other (the schema's own shape for one). */
const link = async (run: Run, section: string, target: string): Promise<string> => {
  const id = uid();
  await run(
    `INSERT INTO entries (id, shop_id, day_id, section, amount, mode, created_at, source, refers_to_entry_id)
     VALUES (?, ?, ?, ?, ?, 'other', ?, 'manual', ?)`,
    [id, SHOP, OPEN_DAY, section, 1000, NOW, target],
  );
  return id;
};

function suite(make: () => Promise<Engine>, enabled: () => boolean, label: string) {
  const maybe = () => (enabled() ? it : it.skip);
  let e: Engine;
  describe(label, () => {
    beforeEach(async () => {
      n = 0;
      if (enabled()) e = await make();
    });

    maybe()('a cancel row of an open day stands, pointing at its target', async () => {
      const target = await sale_(e.run, {});
      await sale_(e.run, { cancels: target });
      expect(await e.count('SELECT count(*) AS n FROM entries WHERE cancels_entry_id IS NOT NULL')).toBe(1);
    });

    maybe()('a SECOND cancel of one entry is refused by the unique index', async () => {
      const target = await sale_(e.run, {});
      await sale_(e.run, { cancels: target });
      await expect(sale_(e.run, { cancels: target })).rejects.toThrow(/unique|UNIQUE|entries_cancel_once_uq/);
    });

    maybe()('a cancel row into a CLOSED day is refused by the D7 trigger', async () => {
      const target = await sale_(e.run, { day: CLOSED_DAY });
      await e.run(`UPDATE days SET state = 'closed', counted_cash = 0, closed_at = '${NOW}' WHERE shop_id = '${SHOP}' AND date = '${CLOSED_DAY}'`);
      await expect(sale_(e.run, { day: CLOSED_DAY, cancels: target })).rejects.toThrow(/closed/);
    });

    maybe()("another shop's entry cannot be cancelled: the (shop_id, cancels_entry_id) FK refuses it", async () => {
      const theirs = await sale_(e.run, { shop: OTHER });
      await expect(sale_(e.run, { shop: SHOP, cancels: theirs })).rejects.toThrow(/foreign key|FOREIGN KEY|entries_cancels_fk/);
    });

    maybe()('an entry cannot cancel itself, and a cancel is not also a correction', async () => {
      const id = uid();
      await expect(sale_(e.run, { id, cancels: id })).rejects.toThrow();
      const target = await sale_(e.run, {});
      await expect(sale_(e.run, { cancels: target, corrects: CLOSED_DAY })).rejects.toThrow(/entries_cancel_plain_ck|CHECK|check/);
    });

    maybe()('the amount column still refuses a float, cancel row or not (integer paise only)', async () => {
      const target = await sale_(e.run, {});
      await expect(sale_(e.run, { cancels: target, amount: 100.5 })).rejects.toThrow();
    });

    maybe()('the link guard: a cancel on another day, of a cancel, of a return leg, or of an entry with a return is refused; nothing links to a cancelled entry', async () => {
      const sale = await sale_(e.run, {});
      const other = await sale_(e.run, { day: CLOSED_DAY });
      await expect(sale_(e.run, { cancels: other, day: OPEN_DAY })).rejects.toThrow(/cancel_other_day/);
      const cancel = await sale_(e.run, { cancels: sale });
      await expect(sale_(e.run, { cancels: cancel })).rejects.toThrow(/cancel_of_cancel/);
      // a return of the cancelled sale, and of its cancel row
      await expect(link(e.run, 'sales_return', sale)).rejects.toThrow(/target_cancelled/);
      await expect(link(e.run, 'sales_return', cancel)).rejects.toThrow(/target_cancelled/);
      // an entry with a return cannot then be cancelled, and a return leg is never cancelled
      const sold = await sale_(e.run, {});
      const ret = await link(e.run, 'sales_return', sold);
      await expect(sale_(e.run, { cancels: sold })).rejects.toThrow(/has_linked_entries/);
      await expect(sale_(e.run, { cancels: ret })).rejects.toThrow(/cancel_event_leg|cancel_guard/);
    });

    maybe()('append-only still refuses an UPDATE or DELETE of a cancelled entry', async () => {
      const target = await sale_(e.run, {});
      await sale_(e.run, { cancels: target });
      await expect(e.run(`UPDATE entries SET amount = 1 WHERE id = '${target}'`)).rejects.toThrow();
      await expect(e.run(`DELETE FROM entries WHERE id = '${target}'`)).rejects.toThrow();
    });
  });
}

/* ---- SQLite ---- */
suite(
  async () => {
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    for (const s of migrationUp('sqlite')) db.exec(s);
    const e: Engine = {
      run: async (sql, params = []) => {
        db.prepare(sql).run(...(params as never[]));
      },
      count: async (sql) => Number((db.prepare(sql).get() as { n: number }).n),
    };
    await seedShops(e.run);
    return e;
  },
  () => true,
  'SQLite',
);

/* ---- Postgres (own schema; skipped with a reason when none is reachable) ---- */
const URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55432/swafto_test';
const SCHEMA = 'cancel_entry_test';
let client: any = null;
let reachable = false;
try {
  const mod = (await import('pg')) as unknown as Record<string, unknown>;
  const Client = (mod.Client ?? (mod.default as Record<string, unknown>)?.Client) as new (cfg: unknown) => any;
  client = new Client({ connectionString: URL, connectionTimeoutMillis: 4000 });
  await client.connect();
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
  await client.query(`SET search_path TO ${SCHEMA}`);
  reachable = true;
} catch (err) {
  console.error('[cancel-entry] no Postgres:', (err as Error).message);
}
afterAll(async () => {
  try {
    if (reachable) for (const s of allMigrationsDown('postgres')) await client.query(s);
  } catch {
    /* throwaway schema */
  }
  await client?.end().catch(() => {});
});

const pgStyle = (sql: string) => {
  let i = 0;
  return sql.replace(/\?/g, () => '$' + String(++i));
};

suite(
  async () => {
    for (const s of allMigrationsDown('postgres')) await client.query(s);
    for (const s of allMigrationsUp('postgres')) await client.query(s);
    const e: Engine = {
      run: async (sql, params = []) => {
        await client.query(pgStyle(sql), params);
      },
      count: async (sql) => Number((await client.query(sql)).rows[0].n),
    };
    await seedShops(e.run);
    return e;
  },
  () => reachable,
  'Postgres (migration 0006)',
);

describe('RT-C2 · the per-target lock serialises a cancel and a return (Postgres, two connections)', () => {
  const maybe = () => (reachable ? it : it.skip);
  maybe()('a return that arrives while a cancel is uncommitted WAITS, then is refused; never both', async () => {
    for (const st of allMigrationsDown('postgres')) await client.query(st);
    for (const st of allMigrationsUp('postgres')) await client.query(st);
    const run: Run = async (sql, params = []) => {
      await client.query(pgStyle(sql), params);
    };
    await seedShops(run);
    const target = await sale_(run, {});
    const mod = (await import('pg')) as unknown as Record<string, unknown>;
    const Client = (mod.Client ?? (mod.default as Record<string, unknown>)?.Client) as new (cfg: unknown) => any;
    const other = new Client({ connectionString: URL, connectionTimeoutMillis: 4000 });
    await other.connect();
    await other.query(`SET search_path TO ${SCHEMA}`);
    try {
      await client.query('BEGIN');
      await client.query(pgStyle('INSERT INTO entries (id, shop_id, day_id, section, amount, mode, created_at, source, cancels_entry_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
        [uid(), SHOP, OPEN_DAY, 'cash_sales', 50000, 'cash', NOW, 'manual', target]);
      let settled = false;
      const ret = other
        .query(pgStyle('INSERT INTO entries (id, shop_id, day_id, section, amount, mode, created_at, source, refers_to_entry_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
          [uid(), SHOP, OPEN_DAY, 'sales_return', 1000, 'other', NOW, 'manual', target])
        .then(() => 'landed', (e: Error) => e.message)
        .finally(() => { settled = true; });
      await new Promise((r) => setTimeout(r, 300));
      expect(settled, 'the return must wait for the cancel to finish, not race it').toBe(false);
      await client.query('COMMIT');
      expect(await ret).toMatch(/target_cancelled/);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      await other.end();
    }
  });
});

describe('migration 0006 shape', () => {
  it('is Postgres only, adds one column and the guards, and undoes them first', () => {
    expect(migration6Up('sqlite')).toEqual([]);
    expect(migration6Down('sqlite')).toEqual([]);
    expect(migration6Up('postgres')[0]).toBe('ALTER TABLE entries ADD COLUMN cancels_entry_id UUID');
    expect(migration6Up('postgres').join('\n')).toMatch(/CREATE UNIQUE INDEX entries_cancel_once_uq .* WHERE cancels_entry_id IS NOT NULL/);
    expect(migration6Up('postgres').join('\n')).toMatch(/FOREIGN KEY \(shop_id, cancels_entry_id\) REFERENCES entries\(shop_id, id\)/);
    expect(allMigrationsUp('postgres').slice(-migration6Up('postgres').length)).toEqual(migration6Up('postgres'));
    expect(allMigrationsDown('postgres').slice(0, migration6Down('postgres').length)).toEqual(migration6Down('postgres'));
  });
});
