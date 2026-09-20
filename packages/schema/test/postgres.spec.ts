/**
 * G4 — the Postgres half. Same spec, same migrations, the other engine.
 *
 * G4 requires "identical schema and identical migrations run on SQLite (device) and
 * Postgres (server) from one source of truth", and that UPDATE/DELETE on entries are
 * rejected on BOTH.
 *
 * Postgres gets a stronger guarantee than SQLite: a trigger AND `REVOKE UPDATE, DELETE`
 * (ADR-006, "belt and braces, because §07.04 says forever"), plus Row-Level Security
 * for tenancy (SECURITY-AUDIT S-10).
 *
 * Skips cleanly when no database is reachable, so the suite stays green offline.
 * Point it at one with:
 *     DATABASE_URL=postgres://postgres:postgres@localhost:55432/swafto_test
 * The throwaway container is started by `tools/pg-up.mjs`.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { migrationUp, migrationDown } from '../src/spec.ts';

/**
 * Defaulted, not required.
 *
 * For two iterations `npx vitest run` reported "4 skipped" with a healthy Postgres
 * container listening on this very port, because nothing set DATABASE_URL and the
 * suite took its absence as "no database". A test that skips under the command
 * everyone actually runs is a test that does not exist - the same disease as a guard
 * that never executes. `tools/pg-up.mjs` prints exactly this URL.
 */
const DEFAULT_URL = 'postgres://postgres:postgres@localhost:55432/swafto_test';
const URL = process.env.DATABASE_URL ?? DEFAULT_URL;

const SHOP = '00000000-0000-7000-8000-000000000001';
const DAY = '2026-07-15';
const ENTRY = '01890000-0000-7000-8000-00000000000a';
const NOW = '2026-07-15T10:00:00.000Z';

// Deliberately loose: `pg` is CommonJS with awkward ESM interop, and these tests
// exercise SQL behaviour, not driver typings. Typing it properly here would couple
// the suite to a dependency shape we do not otherwise depend on.
let client: any;
let reachable = false;

/**
 * Connect at MODULE LOAD, via top-level await — deliberately, not in `beforeAll`.
 *
 * `maybe()` below is evaluated while Vitest is COLLECTING the suite, which happens
 * before any `beforeAll` hook runs. Setting `reachable` in `beforeAll` would leave it
 * false at collection time and silently skip every Postgres test even with a database
 * right there. (It did exactly that, which is how this comment came to exist.)
 */
{
  try {
    // `pg` is CommonJS: under an ESM dynamic import the named export can land on
    // `.default`. Take whichever is actually there rather than assuming.
    const mod = (await import('pg')) as unknown as Record<string, unknown>;
    const Client = (mod.Client ?? (mod.default as Record<string, unknown>)?.Client) as
      | (new (cfg: unknown) => { connect(): Promise<void> })
      | undefined;
    if (!Client) throw new Error('pg.Client not found on the module');
    client = new Client({ connectionString: URL, connectionTimeoutMillis: 4000 });
    await client.connect();
    reachable = true;
  } catch (err) {
    reachable = false;
    console.error('[G4/postgres] connect failed:', (err as Error).message);
  }
}

afterAll(async () => {
  if (client && reachable) await client.end().catch(() => {});
});

const maybe = () => (reachable ? it : it.skip);

describe('G4 · Postgres migrations and append-only', () => {
  it('reports whether a database was reachable', () => {
    if (!reachable) {
      console.log(
        '\n  [G4/postgres] SKIPPED — no reachable database.' +
          '\n  Start one with: node tools/pg-up.mjs' +
          '\n  The URL is defaulted to that container, so starting it is enough -' +
          '\n  no DATABASE_URL needs setting.\n',
      );
    }
    expect(true).toBe(true);
  });

  maybe()('runs up -> down -> up with no residue', async () => {
    for (const s of migrationDown('postgres')) await client.query(s); // clean slate
    for (const s of migrationUp('postgres')) await client.query(s);

    const t1 = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public' ORDER BY table_name`,
    );
    const names = t1.rows.map((r: { table_name: string }) => r.table_name);
    // NOTE: outbox is device-local and must NOT exist on the server (architecture D4).
    // rate_events is its mirror image: server-only, and must NOT exist on the device.
    expect(names).toEqual([
      'consents',
      'days',
      'devices',
      'entries',
      'parties',
      'rate_events',
      'section_skips',
      'shops',
      'users',
    ]);
    expect(names).not.toContain('outbox');

    for (const s of migrationDown('postgres')) await client.query(s);
    const t2 = await client.query(
      `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'`,
    );
    expect(t2.rows[0].n).toBe(0);

    for (const s of migrationUp('postgres')) await client.query(s); // up again
  }, 30_000);

  maybe()('REJECTS UPDATE and DELETE on entries', async () => {
    await client.query(`INSERT INTO shops (id, name, type, language, created_at)
      VALUES ('${SHOP}', 'Test Store', 'kirana', 'en', '${NOW}') ON CONFLICT DO NOTHING`);
    await client.query(`INSERT INTO days (shop_id, date, state, opening_cash, created_at)
      VALUES ('${SHOP}', '${DAY}', 'open', 150000, '${NOW}') ON CONFLICT DO NOTHING`);
    await client.query(`INSERT INTO entries (id, shop_id, day_id, section, amount, mode, created_at, source)
      VALUES ('${ENTRY}', '${SHOP}', '${DAY}', 'cash_sales', 678000, 'cash', '${NOW}', 'manual')
      ON CONFLICT (id) DO NOTHING`);

    await expect(
      client.query(`UPDATE entries SET amount = 1 WHERE id = '${ENTRY}'`),
    ).rejects.toThrow(/append-only/);

    await expect(client.query(`DELETE FROM entries WHERE id = '${ENTRY}'`)).rejects.toThrow(
      /append-only/,
    );

    const still = await client.query(`SELECT amount FROM entries WHERE id = '${ENTRY}'`);
    expect(String(still.rows[0].amount)).toBe('678000');
  }, 20_000);

  /**
   * The same sweep as the SQLite side. Postgres has REVOKE as well as the trigger,
   * so a column-scoped trigger would still be caught here - but the test must prove
   * that rather than assume it, and the two engines are meant to behave identically
   * (G4). See the comment in append-only.spec.ts for how this was found.
   */
  maybe()('REJECTS an UPDATE of any column, not only amount', async () => {
    for (const [column, value] of [
      ['label', "'rewritten'"],
      ['created_at', "'2020-01-01T00:00:00.000Z'"],
      ['source', "'imported'"],
      ['device_id', 'NULL'],
    ]) {
      await expect(
        client.query(`UPDATE entries SET ${column} = ${value} WHERE id = '${ENTRY}'`),
        `UPDATE of ${column} must be rejected`,
      ).rejects.toThrow();
    }
  }, 20_000);

  maybe()('has Row-Level Security enabled on every tenant-scoped table (S-10)', async () => {
    // Scoped to `public`. Without the namespace join this counted a table of the
    // same name in ANY schema, and it silently returned 12 the moment another suite
    // created its own copies - a query that was only ever right by accident.
    const res = await client.query(
      `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname IN ('entries','days','parties','section_skips','devices','users','consents')
        ORDER BY c.relname`,
    );
    // Seven since iteration 39: consents joined the tenant-scoped set, scoped
    // through its user rather than by a shop_id column it does not have.
    expect(res.rows.length).toBe(7);
    for (const r of res.rows) {
      expect(r.relrowsecurity, `${r.relname} RLS`).toBe(true);
      expect(r.relforcerowsecurity, `${r.relname} FORCE RLS`).toBe(true);
    }
  }, 20_000);

  maybe()('stores no totals column anywhere', async () => {
    const res = await client.query(
      `SELECT table_name || '.' || column_name AS col FROM information_schema.columns
       WHERE table_schema='public'`,
    );
    const banned = res.rows
      .map((r: { col: string }) => r.col)
      .filter((c: string) => /total|balance|outstanding|sum_/i.test(c));
    expect(banned).toEqual([]);
  }, 20_000);
});
