/**
 * PR-7 · THE BILLING TABLES, ATTACKED AT THE DATABASE.
 *
 * Three properties the routes rely on and must not be the only ones holding:
 *
 *   1. A purchase token is bound to ONE shop, for ever. The primary key is the
 *      guard against one shop's token unlocking another shop; this proves the
 *      key refuses the second binding rather than trusting the route to ask.
 *   2. One preview per shop, ever.
 *   3. Append-only: no UPDATE, no DELETE, on all three.
 *
 * And the one that would quietly undo the design: NO STORED PLAN. A column
 * holding "premium" or "entitled" is a second source of truth beside Google's
 * own answer, and the sweep below fails the day somebody adds one.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { migrationUp, BILLING_TABLES } from '../src/spec.ts';

const URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55432/swafto_test';
const SCHEMA = 'billing_probe';
const A = '00000000-0000-7000-8000-0000000000a1';
const B = '00000000-0000-7000-8000-0000000000b2';
const NOW = '2026-10-26T10:00:00.000Z';

type Sql = { query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>; end(): Promise<void> };
let db: Sql | null = null;
let skipReason = 'not attempted';

try {
  const mod = (await import('pg')) as unknown as Record<string, unknown>;
  const pg = (mod.default ?? mod) as { Client: new (o: unknown) => Sql & { connect(): Promise<void> } };
  const c = new pg.Client({ connectionString: URL, connectionTimeoutMillis: 4000 });
  await c.connect();
  await c.query('DROP SCHEMA IF EXISTS ' + SCHEMA + ' CASCADE');
  await c.query('CREATE SCHEMA ' + SCHEMA);
  await c.query('SET search_path TO ' + SCHEMA);
  for (const s of migrationUp('postgres')) await c.query(s);
  for (const shop of [A, B]) {
    await c.query(
      "INSERT INTO shops (id, name, type, language, created_at) VALUES ($1, 'Shop', 'kirana', 'en', $2)",
      [shop, NOW],
    );
  }
  db = c;
} catch (e) {
  skipReason = (e as Error).message;
}

afterAll(async () => {
  if (db) {
    await db.query('DROP SCHEMA IF EXISTS ' + SCHEMA + ' CASCADE').catch(() => undefined);
    await db.end().catch(() => undefined);
  }
});

const maybe = db ? it : it.skip;
const bind = (token: string, shop: string) =>
  db!.query(
    "INSERT INTO plan_purchases (purchase_token, shop_id, account_id, product_id, bound_at) VALUES ($1, $2, 'acct', 'premium', $3)",
    [token, shop, NOW],
  );

describe('PR-7 · billing tables on Postgres', () => {
  it('reports whether a database was reachable', () => {
    if (!db) console.log('  [billing] SKIPPED: ' + skipReason);
    expect(true).toBe(true);
  });

  maybe('binds a purchase token to one shop, and refuses binding it to a second', async () => {
    await bind('tok-cross', A);
    await expect(bind('tok-cross', B)).rejects.toThrow(/duplicate key|unique/i);
    const { rows } = await db!.query('SELECT shop_id FROM plan_purchases WHERE purchase_token = $1', ['tok-cross']);
    expect(rows.map((r) => String(r.shop_id))).toEqual([A]);
  });

  maybe('grants one preview per shop, ever', async () => {
    const grant = (start: string, end: string) =>
      db!.query('INSERT INTO plan_previews (shop_id, started_at, ends_at) VALUES ($1, $2, $3)', [A, start, end]);
    await grant(NOW, '2026-11-09T10:00:00.000Z');
    await expect(grant('2027-01-01T00:00:00.000Z', '2027-01-15T00:00:00.000Z')).rejects.toThrow(
      /duplicate key|unique/i,
    );
  });

  maybe('refuses UPDATE and DELETE on every billing table', async () => {
    await bind('tok-ao', B);
    await db!.query(
      "INSERT INTO plan_purchase_states (purchase_token, google_state, expires_at, auto_renewing, acknowledged, snapshot, fetched_at) VALUES ('tok-ao', 'SUBSCRIPTION_STATE_ACTIVE', $1, true, true, '{}', $1)",
      [NOW],
    );
    await db!.query('INSERT INTO plan_previews (shop_id, started_at, ends_at) VALUES ($1, $2, $3)', [
      B,
      NOW,
      '2026-11-09T10:00:00.000Z',
    ]);
    const where: Record<(typeof BILLING_TABLES)[number], string> = {
      plan_purchases: "purchase_token = 'tok-ao'",
      plan_purchase_states: "purchase_token = 'tok-ao'",
      plan_previews: `shop_id = '${B}'`,
    };
    const set: Record<(typeof BILLING_TABLES)[number], string> = {
      plan_purchases: "product_id = 'other'",
      plan_purchase_states: "google_state = 'SUBSCRIPTION_STATE_EXPIRED'",
      plan_previews: "ends_at = '2030-01-01T00:00:00Z'",
    };
    for (const tbl of BILLING_TABLES) {
      await expect(db!.query(`UPDATE ${tbl} SET ${set[tbl]} WHERE ${where[tbl]}`), tbl).rejects.toThrow(
        /append-only/,
      );
      await expect(db!.query(`DELETE FROM ${tbl} WHERE ${where[tbl]}`), tbl).rejects.toThrow(/append-only/);
    }
  });

  maybe('refuses a Google state that Google does not have', async () => {
    await expect(
      db!.query(
        "INSERT INTO plan_purchase_states (purchase_token, google_state, auto_renewing, acknowledged, snapshot, fetched_at) VALUES ('tok-ao', 'PREMIUM', true, true, '{}', $1)",
        [NOW],
      ),
    ).rejects.toThrow(/plan_purchase_states_state_ck/);
  });

  maybe('stores no plan, premium or entitlement flag anywhere: the plan is derived on read', async () => {
    const { rows } = await db!.query(
      'SELECT table_name || $2 || column_name AS col FROM information_schema.columns WHERE table_schema = $1',
      [SCHEMA, '.'],
    );
    const cols = rows.map((r) => String(r.col));
    expect(cols.length).toBeGreaterThan(20);
    expect(cols.filter((c) => /premium|entitle|\.plan$|\.is_|\.tier|paid_until|\.until$/i.test(c))).toEqual([]);
  });
});
