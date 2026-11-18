/**
 * C-01 · ROW-LEVEL SECURITY, WIRED INTO THE API AND ATTACKED FROM A REAL ROLE.
 *
 * The schema has had RLS policies since the first migration, and
 * `packages/schema/test/tenancy.spec.ts` proves the POLICIES refuse a cross-shop
 * read when `swafto.shop_id` is set. What it could not prove is that the API ever
 * sets it - and it did not (SEC-01): every connection was an unrestricted one and
 * the policies were inert. This spec runs the real `pgRepo` over a connection that
 * is NOT a superuser, NOT BYPASSRLS, and owns its tables (so `FORCE ROW LEVEL
 * SECURITY` is what is under test), and shows that
 *
 *   1. a shop's own rows are visible through the repository,
 *   2. another shop's rows are not, even to a hand-forged query on that same
 *      connection, and a replayed foreign id is REFUSED rather than acked,
 *   3. the privileged `system` connection is what sign-in uses, and nothing else
 *      the app role does can read a user across shops,
 *   4. the C-05 replay-after-close behaviour and the C-07 erasure/export of the
 *      billing tables hold under that restricted role.
 *
 * Postgres-gated: skips with a printed reason when none is listening, and CI always
 * has one. UNVERIFIED-LOCAL where there was no Postgres to run it against.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { allMigrationsUp } from '@swafto/schema';
import { pgRepo } from '../src/db/postgres.ts';
import { WriteRefused, type Repo } from '../src/db/port.ts';
import { describeRole, enforceRoles, roleProblems } from '../src/db/roles.ts';
import type { Entry, IsoDate } from '@swafto/formula-engine';

const URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55432/swafto_test';
const SCHEMA = 'rls_wiring';
const APP_ROLE = 'swafto_rlsw_app';
const SYS_ROLE = 'swafto_rlsw_sys';
// Generated per run: a password in a source file is one, even for a throwaway role.
const APP_PASSWORD = randomUUID();
const SYS_PASSWORD = randomUUID();

const MINE = '00000000-0000-7000-8000-0000000000a1';
const THEIRS = '00000000-0000-7000-8000-0000000000b2';
const MY_USER = '00000000-0000-7000-8000-0000000000a3';
const THEIR_USER = '00000000-0000-7000-8000-0000000000b4';
const MY_PHONE = '+919800000001';
const THEIR_PHONE = '+919800000002';
const DATE = '2026-07-15' as IsoDate;
const NOW = '2026-07-15T10:00:00.000Z';
const MY_ENTRY = '00000000-0000-7000-8000-0000000000a5';
const THEIR_ENTRY = '00000000-0000-7000-8000-0000000000b6';
const MY_AMOUNT = 12345;
const THEIR_AMOUNT = 99999;

type Sql = {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
};

let owner: Sql | null = null;
let app: Sql | null = null;
let system: Sql | null = null;
let repo: Repo | null = null;
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

const entry = (id: string, amount: number, over: Partial<Entry> = {}): Entry =>
  ({
    id,
    dayId: DATE,
    section: 'cash_sales',
    amount,
    mode: 'cash',
    source: 'manual',
    createdAt: NOW,
    ...over,
  }) as Entry;

try {
  const mod = (await import('pg')) as unknown as Record<string, unknown>;
  const pg = (mod.default ?? mod) as { Client: new (o: unknown) => Sql };
  const o = new pg.Client({ connectionString: URL, connectionTimeoutMillis: 4000 });
  await (o as unknown as { connect(): Promise<void> }).connect();
  owner = o;
  await owner.query('DROP SCHEMA IF EXISTS ' + SCHEMA + ' CASCADE');
  await owner.query('CREATE SCHEMA ' + SCHEMA);
  await owner.query('SET search_path TO ' + SCHEMA);
  for (const statement of allMigrationsUp('postgres')) await owner.query(statement);

  for (const role of [APP_ROLE, SYS_ROLE]) {
    await owner.query(
      `DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN
         EXECUTE 'DROP OWNED BY ${role}'; EXECUTE 'DROP ROLE ${role}'; END IF; END $$`,
    );
  }
  await owner.query(`CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PASSWORD}' NOSUPERUSER NOBYPASSRLS`);
  await owner.query(`CREATE ROLE ${SYS_ROLE} LOGIN PASSWORD '${SYS_PASSWORD}' NOSUPERUSER BYPASSRLS`);
  for (const role of [APP_ROLE, SYS_ROLE]) {
    await owner.query(`GRANT USAGE ON SCHEMA ${SCHEMA} TO ${role}`);
    await owner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${SCHEMA} TO ${role}`);
    await owner.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${SCHEMA} TO ${role}`);
  }
  // The app role OWNS the tables, so only FORCE ROW LEVEL SECURITY stands between it and every shop.
  const tables = await owner.query('SELECT tablename FROM pg_tables WHERE schemaname = $1', [SCHEMA]);
  for (const row of tables.rows) {
    await owner.query(`ALTER TABLE ${SCHEMA}.${String(row.tablename)} OWNER TO ${APP_ROLE}`);
  }

  app = await connect(as(APP_ROLE, APP_PASSWORD));
  system = await connect(as(SYS_ROLE, SYS_PASSWORD));
  repo = pgRepo(app, { system });

  // Two shops, one user and one entry each, written THROUGH the repository (scoped).
  for (const [shopId, userId, phone, entryId, amount] of [
    [MINE, MY_USER, MY_PHONE, MY_ENTRY, MY_AMOUNT],
    [THEIRS, THEIR_USER, THEIR_PHONE, THEIR_ENTRY, THEIR_AMOUNT],
  ] as const) {
    await repo.createShopAndUser({ shopId, userId, phone, shopName: 'Shop', language: 'en', now: NOW });
    await repo.upsertDay({
      shopId,
      date: DATE,
      state: 'open',
      openingCash: 0,
      countedCash: null,
      differenceReason: null,
      closedAt: null,
      startsAt: '00:00',
      createdAt: NOW,
    });
    await repo.appendEntry(shopId, entry(entryId, amount));
  }
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
      for (const role of [APP_ROLE, SYS_ROLE]) {
        await owner.query(`DROP OWNED BY ${role}`);
        await owner.query(`DROP ROLE IF EXISTS ${role}`);
      }
      await owner.end();
    }
  } catch {
    /* a throwaway container; a failed clean-up is not a test result */
  }
});

describe('C-01 · row-level security binds the API', () => {
  it('reports whether it ran at all, because a silent skip proves nothing', () => {
    if (!reachable) {
      console.log('\n  [rls-wiring] SKIPPED: ' + skipReason + '\n  CI always has a database, so CI runs this.\n');
    }
    expect(typeof reachable).toBe('boolean');
  });

  maybe()('the app role is neither superuser nor BYPASSRLS, and the boot check agrees', async () => {
    const a = await describeRole(app!);
    const s = await describeRole(system!);
    expect(a).toMatchObject({ name: APP_ROLE, superuser: false, bypassRls: false });
    expect(s.bypassRls).toBe(true);
    expect(roleProblems(a, s)).toEqual([]);
    expect(() => enforceRoles(a, s, true, () => undefined)).not.toThrow();
    // ...and the check REFUSES the configuration the audit found: the app role as the bypassing one.
    expect(() => enforceRoles(s, s, true, () => undefined)).toThrow(/refusing to start/);
  });

  maybe()('(1) a shop sees its own rows through the repository', async () => {
    const mine = await repo!.entriesFor(MINE, DATE);
    expect(mine.map((e) => e.id)).toEqual([MY_ENTRY]);
    expect(mine[0]!.amount).toBe(MY_AMOUNT);
    expect((await repo!.findDay(MINE, DATE))?.shopId).toBe(MINE);
  });

  maybe()('(2) another shop is invisible, even to a forged query on the same connection', async () => {
    // Asking the repository for the other shop's id is its own scope: it binds THAT shop, by design.
    // The attack is a statement that runs inside MY scope and names THEIRS.
    await app!.query('BEGIN');
    try {
      await app!.query("SELECT set_config('swafto.shop_id', $1, true)", [MINE]);
      const named = await app!.query('SELECT id FROM entries WHERE shop_id = $1', [THEIRS]);
      const tautology = await app!.query("SELECT id FROM entries WHERE shop_id = $1 OR 1 = 1", [THEIRS]);
      const count = await app!.query('SELECT count(*)::int AS c FROM entries');
      const days = await app!.query('SELECT 1 FROM days WHERE shop_id = $1', [THEIRS]);
      const users = await app!.query('SELECT 1 FROM users WHERE shop_id = $1', [THEIRS]);
      expect(named.rows).toEqual([]);
      expect(tautology.rows.map((r) => r.id)).toEqual([MY_ENTRY]);
      expect(count.rows[0]!.c).toBe(1);
      expect(days.rows).toEqual([]);
      expect(users.rows).toEqual([]);
      // A forged WRITE into their book is refused by the same policy.
      await expect(
        app!.query(
          'INSERT INTO entries (id, shop_id, day_id, section, amount, mode, created_at, source) ' +
            "VALUES (gen_random_uuid(), $1, $2, 'cash_sales', 5, 'cash', $3, 'manual')",
          [THEIRS, DATE, NOW],
        ),
      ).rejects.toThrow();
    } finally {
      await app!.query('ROLLBACK');
    }
  });

  maybe()('a statement with no shop bound sees nothing: it fails closed (an error or no rows)', async () => {
    const saw = await app!.query('SELECT count(*)::int AS c FROM entries').then(
      (r) => r.rows[0]!.c,
      () => 0,
    );
    expect(saw).toBe(0);
  });

  maybe()('a replayed id that belongs to another shop is REFUSED, not acked as present', async () => {
    // Under RLS the foreign row is invisible, so "no row came back" must not mean "already present".
    await expect(repo!.appendEntry(MINE, entry(THEIR_ENTRY, THEIR_AMOUNT))).rejects.toMatchObject({
      constraintName: 'entries_tenancy',
    });
    // And theirs is untouched.
    expect((await repo!.entriesFor(THEIRS, DATE)).map((e) => e.amount)).toEqual([THEIR_AMOUNT]);
  });

  maybe()('(3) sign-in resolves a user on the system role; the app role cannot read users across shops', async () => {
    expect((await repo!.findUserByPhone(THEIR_PHONE))?.shopId).toBe(THEIRS);
    expect((await repo!.findUserByPhone(MY_PHONE))?.id).toBe(MY_USER);
    const direct = await app!.query('SELECT phone FROM users').then(
      (r) => r.rows,
      () => [],
    );
    expect(direct).toEqual([]);
  });
});

describe('C-05 · a replay after the day closed', () => {
  const SHOP = '00000000-0000-7000-8000-0000000000c1';
  const USER = '00000000-0000-7000-8000-0000000000c2';
  const REPLAYED = '00000000-0000-7000-8000-0000000000c3';

  maybe()('acks an identical stored entry, refuses a changed one, and still refuses a NEW one (D7)', async () => {
    await repo!.createShopAndUser({
      shopId: SHOP,
      userId: USER,
      phone: '+919800000003',
      shopName: 'Closer',
      language: 'en',
      now: NOW,
    });
    const day = {
      shopId: SHOP,
      date: DATE,
      state: 'open' as const,
      openingCash: 0,
      countedCash: null,
      differenceReason: null,
      closedAt: null,
      startsAt: '00:00',
      createdAt: NOW,
    };
    await repo!.upsertDay(day);
    const stored = entry(REPLAYED, 5000, { label: 'chai' });
    expect((await repo!.appendEntry(SHOP, stored)).inserted).toBe(true);
    await repo!.upsertDay({ ...day, state: 'closed', countedCash: 5000, closedAt: NOW });

    // The same entry, replayed by a phone that never saw the ack: already present, no error.
    expect(await repo!.appendEntry(SHOP, stored)).toEqual({ inserted: false });
    // createdAt spelt with the phone's offset is the same instant, so still a replay.
    expect(await repo!.appendEntry(SHOP, { ...stored, createdAt: '2026-07-15T15:30:00.000+05:30' })).toEqual({
      inserted: false,
    });
    // Same id, different content (any field, not only amount and section): a conflict, loudly (BE-10).
    await expect(repo!.appendEntry(SHOP, { ...stored, label: 'tea' })).rejects.toMatchObject({
      constraintName: 'entries_append_only',
    });
    await expect(repo!.appendEntry(SHOP, { ...stored, mode: 'upi', section: 'upi_sales' })).rejects.toBeInstanceOf(
      WriteRefused,
    );
    // A NEW entry into the closed day is still refused by the trigger, and the client is told
    // the API's name for it, not the trigger's text.
    const refused = await repo!.appendEntry(SHOP, entry('00000000-0000-7000-8000-0000000000c4', 1)).catch((e) => e);
    expect(refused).toBeInstanceOf(WriteRefused);
    expect((refused as WriteRefused).constraintName).toBe('entries_closed_day');
    expect((refused as WriteRefused).message).not.toMatch(/decision D7|CP-4|trigger/i);
  });
});

describe('C-07 · export and erasure cover the billing tables', () => {
  const SHOP = '00000000-0000-7000-8000-0000000000d1';
  const USER = '00000000-0000-7000-8000-0000000000d2';
  const PURCHASE_REF = 'fake-purchase-token-for-test-TAIL42';

  maybe()('exports them with the token masked, then erases them, and leaves other shops alone', async () => {
    await repo!.createShopAndUser({
      shopId: SHOP,
      userId: USER,
      phone: '+919800000004',
      shopName: 'Subscriber',
      language: 'en',
      now: NOW,
    });
    // The billing tables carry no RLS, so the owner may seed them directly.
    await owner!.query(
      'INSERT INTO plan_purchases (purchase_token, shop_id, account_id, product_id, bound_at) VALUES ($1,$2,$3,$4,$5)',
      [PURCHASE_REF, SHOP, 'acct', 'premium', NOW],
    );
    await owner!.query(
      `INSERT INTO plan_purchase_states (purchase_token, google_state, expires_at, auto_renewing, acknowledged, snapshot, fetched_at)
       VALUES ($1, 'SUBSCRIPTION_STATE_ACTIVE', $2, true, true, '{"raw":true}', $2)`,
      [PURCHASE_REF, NOW],
    );
    await owner!.query('INSERT INTO plan_previews (shop_id, started_at, ends_at) VALUES ($1, $2, $3)', [
      SHOP,
      NOW,
      '2026-08-15T10:00:00.000Z',
    ]);

    const exported = (await repo!.exportUser(USER)) as Record<string, unknown[]>;
    expect(exported.planPurchases).toHaveLength(1);
    expect(exported.planPurchaseStates).toHaveLength(1);
    expect(exported.planPreviews).toHaveLength(1);
    // The bearer credential never leaves in full.
    expect(JSON.stringify(exported)).not.toContain(PURCHASE_REF);
    expect(JSON.stringify(exported)).toContain('...TAIL42');

    await repo!.purgeShop(SHOP, NOW);

    const left = async (text: string, params: unknown[]) =>
      (await owner!.query(text, params)).rows[0]!.c;
    expect(await left('SELECT count(*)::int AS c FROM plan_purchase_states WHERE purchase_token = $1', [PURCHASE_REF])).toBe(0);
    expect(await left('SELECT count(*)::int AS c FROM plan_purchases WHERE shop_id = $1', [SHOP])).toBe(0);
    expect(await left('SELECT count(*)::int AS c FROM plan_previews WHERE shop_id = $1', [SHOP])).toBe(0);
    expect((await repo!.findShop(SHOP))?.deletedAt).not.toBeNull();
    // Shop A's ledger survived shop D's erasure.
    expect((await repo!.entriesFor(MINE, DATE)).map((e) => e.id)).toEqual([MY_ENTRY]);
  });
});

describe('RT-10 · rotateRefreshGen is one compare-and-set, scoped to the shop', () => {
  const DEVICE = '00000000-0000-7000-8000-0000000000d1';
  const RACE = '00000000-0000-7000-8000-0000000000d2';
  const device = (id: string) => ({
    id,
    userId: MY_USER,
    shopId: MINE,
    platform: 'android',
    createdAt: NOW,
    lastSeenAt: NOW,
    revokedAt: null,
  });

  maybe()('bumps once per generation, honours the 120 s grace, refuses another shop and a revoked device', async () => {
    await repo!.registerDevice(device(DEVICE));
    const t = (sec: number) => new Date(Date.parse(NOW) + sec * 1000).toISOString();
    expect(await repo!.rotateRefreshGen(MINE, DEVICE, 0, t(0))).toEqual({ kind: 'rotated', gen: 1 });
    expect(await repo!.rotateRefreshGen(THEIRS, DEVICE, 1, t(1)), 'another shop matches nothing').toEqual({ kind: 'reuse' });
    expect(await repo!.rotateRefreshGen(MINE, DEVICE, 0, t(121)), 'previous generation after the window').toEqual({ kind: 'reuse' });
    expect(await repo!.rotateRefreshGen(MINE, DEVICE, 1, t(122))).toEqual({ kind: 'rotated', gen: 2 });
    expect(await repo!.rotateRefreshGen(MINE, DEVICE, 1, t(123)), 'previous generation inside the window').toEqual({ kind: 'rotated', gen: 3 });
    expect(await repo!.rotateRefreshGen(MINE, DEVICE, 1, t(124)), 'current - 2 right after a grace rotation').toEqual({ kind: 'lost_race' });
    await repo!.revokeDevice(MINE, DEVICE, NOW);
    expect(await repo!.rotateRefreshGen(MINE, DEVICE, 3, t(125)), 'a revoked device never rotates').toEqual({ kind: 'reuse' });
  });

  /**
   * A race needs two CONNECTIONS. The suite's `app` is one pg Client, and the repo uses a client
   * without `reserve` directly, so two concurrent scoped calls on it interleave BEGIN / set_config /
   * COMMIT on one session (the second statement then runs unscoped: `invalid input syntax for type
   * uuid: ""`). That is the harness, not the repo: production hands `pgRepo` a pool with `reserve`.
   */
  const racers = async <T,>(go: (a: Repo, b: Repo) => [Promise<T>, Promise<T>]): Promise<T[]> => {
    const ca = await connect(as(APP_ROLE, APP_PASSWORD));
    const cb = await connect(as(APP_ROLE, APP_PASSWORD));
    try {
      return await Promise.all(go(pgRepo(ca, { system: system! }), pgRepo(cb, { system: system! })));
    } finally {
      await ca.end();
      await cb.end();
    }
  };

  maybe()('RT-W4-2 · a second grace in a row is reuse (two parties), on the real compare-and-set', async () => {
    const SG = '00000000-0000-7000-8000-0000000000d4';
    await repo!.registerDevice(device(SG));
    const t = (sec: number) => new Date(Date.parse(NOW) + sec * 1000).toISOString();
    expect(await repo!.rotateRefreshGen(MINE, SG, 0, t(0))).toEqual({ kind: 'rotated', gen: 1 });
    expect(await repo!.rotateRefreshGen(MINE, SG, 0, t(5)), 'first grace').toEqual({ kind: 'rotated', gen: 2 });
    expect(await repo!.rotateRefreshGen(MINE, SG, 1, t(6)), 'second grace in a row').toEqual({ kind: 'reuse' });
  });

  maybe()('two racing refreshes of one token: each generation is handed out once and the row ends at gen 2', async () => {
    await repo!.registerDevice(device(RACE));
    const r = await racers((a, b) => [a.rotateRefreshGen(MINE, RACE, 0, NOW), b.rotateRefreshGen(MINE, RACE, 0, NOW)]);
    // The compare-and-set hands out each generation exactly once: whatever the interleaving, the
    // two winners never share a gen. (A fresh token raced against itself is, to the database,
    // indistinguishable from a lost-response retry inside the 120 s grace window, which is a
    // designed second rotation - the first test above pins that sequentially - so the second
    // racer rotates to gen 2 rather than being refused. It is never `reuse`, never a duplicate gen.)
    const won = r.filter((x) => x.kind === 'rotated').map((x) => (x as { gen: number }).gen).sort();
    expect(won).toEqual([1, 2]);
    expect(r.filter((x) => x.kind === 'reuse')).toHaveLength(0);
    // A non-atomic read-then-write would hand both racers gen 1 or leave the row at 1 (a lost update).
    // The row itself must have counted both rotations, the second one as a grace.
    const row = (await owner!.query('SELECT refresh_gen, refresh_graced FROM devices WHERE id = $1', [RACE])).rows[0]!;
    expect([Number(row.refresh_gen), row.refresh_graced]).toEqual([2, true]);
  });

  maybe()('two racing GRACE retries: exactly one wins, the other is lost_race, not reuse', async () => {
    const GR = '00000000-0000-7000-8000-0000000000d3';
    await repo!.registerDevice(device(GR));
    await repo!.rotateRefreshGen(MINE, GR, 0, NOW);
    const r = await racers((a, b) => [a.rotateRefreshGen(MINE, GR, 0, NOW), b.rotateRefreshGen(MINE, GR, 0, NOW)]);
    expect(r.map((x) => x.kind).sort()).toEqual(['lost_race', 'rotated']);
  });
});
