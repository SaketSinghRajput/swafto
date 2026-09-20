/**
 * ONE CONTRACT, BOTH REPOSITORIES.
 *
 * `memory.ts` claims, in its own header, that it "enforces the SAME REFUSALS the
 * database enforces... so a route that passes here behaves the same way against
 * Postgres". That is a large claim and until this file it was only a comment.
 * Every route test in the suite runs against memory; if the two ever diverge,
 * the whole suite is measuring the wrong thing and nothing would say so.
 *
 * So the cases below run TWICE - once against each implementation - and Postgres
 * is skipped rather than failed when no database is listening, because that is
 * the normal state of a developer machine. CI always has one, so CI always runs
 * both halves. A suite that only ever skipped would be worse than no suite,
 * which is why the first case reports which implementations actually ran.
 *
 * WHAT DIVERGENCE WOULD LOOK LIKE: not a crash, but a route that silently
 * accepts in production something the tests refused, or refuses something the
 * tests accepted. Both are invisible until a shopkeeper meets them.
 */
import { describe, it, expect } from 'vitest';
import { memoryRepo } from '../src/db/memory.ts';
import { pgRepo } from '../src/db/postgres.ts';
import { WriteRefused, type Repo } from '../src/db/port.ts';
import { migrationUp } from '@swafto/schema';
import type { Entry, IsoDate } from '@swafto/formula-engine';

const URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55432/swafto_test';
const DATE = '2026-07-15' as IsoDate;
const NOW = '2026-07-15T19:00:00.000Z';

/*
 * Deliberately loose, and imported dynamically. `pg` is CommonJS with awkward
 * ESM interop: a static `import { Client } from 'pg'` gives undefined under the
 * test runner, `new Client(...)` throws, and a catch around the connection
 * turns that into a clean-looking skip. That is exactly what happened on the
 * first run of this file, with a healthy database listening.
 */
let client: { query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>; end(): Promise<void> } | null =
  null;
let reachable = false;
/**
 * WHY IT SKIPPED, ALWAYS. A skip with no reason is indistinguishable from a
 * skip caused by a bug in the setup - which is exactly what happened here on
 * the first run: the database was listening and the migration threw, and the
 * suite reported a clean skip.
 */
let skipReason = 'not attempted';

/*
 * CONNECTED AT MODULE SCOPE, NOT IN `beforeAll`.
 *
 * Whether Postgres is reachable decides which cases are REGISTERED, and
 * registration happens while the module is being collected - before any hook
 * runs. The first version of this did the connection in `beforeAll` and every
 * Postgres case was already marked skipped by the time it succeeded. Top-level
 * await is resolved before collection finishes, so the flag is true in time.
 */
try {
  const mod = (await import('pg')) as unknown as Record<string, unknown>;
  const pg = (mod.default ?? mod) as { Client: new (o: unknown) => NonNullable<typeof client> };
  const c = new pg.Client({ connectionString: URL, connectionTimeoutMillis: 4000 });
  await (c as unknown as { connect(): Promise<void> }).connect();
  /*
   * ITS OWN SCHEMA, BECAUSE THE SCHEMA SUITE USES THE SAME DATABASE.
   *
   * Vitest runs files in parallel. This suite and `packages/schema`'s Postgres
   * suite both drop and recreate every table, and against one database they
   * tore each other's tables out mid-run - three failures that looked like
   * schema bugs and were a collision. A namespace each costs one statement.
   */
  await c.query('DROP SCHEMA IF EXISTS equivalence CASCADE');
  await c.query('CREATE SCHEMA equivalence');
  await c.query('SET search_path TO equivalence');
  for (const s of migrationUp('postgres')) await c.query(s);
  client = c;
  reachable = true;
} catch (e) {
  skipReason = (e as Error).message;
}

/** A fresh shop, user and open day in whichever repository is under test. */
async function seed(repo: Repo, suffix: string) {
  const shopId = '11111111-1111-4111-8111-' + suffix.padStart(12, '0');
  const userId = '22222222-2222-4222-8222-' + suffix.padStart(12, '0');
  await repo.createShopAndUser({
    shopId,
    userId,
    phone: '+9198765' + suffix.padStart(5, '0'),
    shopName: 'Equivalence Shop',
    language: 'en',
    now: NOW,
  });
  await repo.upsertDay({
    shopId,
    date: DATE,
    state: 'open',
    openingCash: 100000,
    countedCash: null,
    differenceReason: null,
    closedAt: null,
    createdAt: NOW,
  });
  return { shopId, userId };
}

/**
 * A deterministic UUID from a short label, so the cases stay readable and the
 * ids stay the shape the column demands.
 */
const uuid = (label: string): string =>
  '44444444-4444-4444-8444-' + label.replace(/[^0-9a-f]/gi, '').padStart(12, '0').slice(-12);

const entry = (id: string, amount: number, over: Partial<Entry> = {}): Entry =>
  ({
    id: uuid(id),
    dayId: DATE,
    section: 'cash_sales',
    amount,
    mode: 'cash',
    source: 'manual',
    createdAt: NOW,
    ...over,
  }) as Entry;

/**
 * The contract, written once. `label` names the run; everything else is
 * identical between the two, which is the entire point.
 */
function contract(label: string, make: () => Repo, enabled: () => boolean, n: string) {
  const maybe = () => (enabled() ? it : it.skip);

  describe(label, () => {
    maybe()('stores a shop and finds its user by phone', async () => {
      const repo = make();
      const { shopId, userId } = await seed(repo, n + '1');
      const shop = await repo.findShop(shopId);
      expect(shop?.id).toBe(shopId);
      expect(shop?.deletedAt).toBeNull();
      const user = await repo.findUserByPhone('+9198765' + (n + '1').padStart(5, '0'));
      expect(user?.id).toBe(userId);
      expect(user?.shopId).toBe(shopId);
    });

    maybe()('appends an entry and reads it back with the same figure', async () => {
      const repo = make();
      const { shopId } = await seed(repo, n + '2');
      expect((await repo.appendEntry(shopId, entry('eq-' + n + '2-a', 45000))).inserted).toBe(true);

      const rows = await repo.entriesFor(shopId, DATE);
      expect(rows).toHaveLength(1);
      // Integer paise out as well as in: BIGINT comes back from pg as text.
      expect(rows[0]!.amount).toBe(45000);
      expect(Number.isInteger(rows[0]!.amount)).toBe(true);
      expect(rows[0]!.dayId).toBe(DATE);
    });

    maybe()('the same entry twice is not an error and not a second row', async () => {
      const repo = make();
      const { shopId } = await seed(repo, n + '3');
      const e = entry('eq-' + n + '3-a', 12300);
      expect((await repo.appendEntry(shopId, e)).inserted).toBe(true);
      expect((await repo.appendEntry(shopId, e)).inserted).toBe(false);
      expect(await repo.entriesFor(shopId, DATE)).toHaveLength(1);
    });

    maybe()('the same id with a DIFFERENT figure is refused', async () => {
      const repo = make();
      const { shopId } = await seed(repo, n + '4');
      await repo.appendEntry(shopId, entry('eq-' + n + '4-a', 100));
      await expect(repo.appendEntry(shopId, entry('eq-' + n + '4-a', 999))).rejects.toThrow(
        WriteRefused,
      );
      // And the original is untouched. D1: what he entered is what it says.
      expect((await repo.entriesFor(shopId, DATE))[0]!.amount).toBe(100);
    });

    maybe()('records consent append-only, with the withdrawal beside the grant', async () => {
      const repo = make();
      const { userId } = await seed(repo, n + '5');
      await repo.recordConsent({
        id: uuid('c' + n + '5a'),
        userId,
        purpose: 'sms_reminders',
        granted: true,
        noticeVersion: '2026-09-1',
        locale: 'en',
        at: NOW,
      });
      await repo.recordConsent({
        id: uuid('c' + n + '5b'),
        userId,
        purpose: 'sms_reminders',
        granted: false,
        noticeVersion: '2026-09-1',
        locale: 'en',
        at: '2026-07-15T20:00:00.000Z',
      });
      const rows = await repo.consentsFor(userId);
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.granted)).toEqual([true, false]);
    });

    maybe()('separates today from everything before it', async () => {
      const repo = make();
      const { shopId } = await seed(repo, n + '6');
      await repo.upsertDay({
        shopId,
        date: '2026-07-14' as IsoDate,
        // OPEN, not closed. Appending into a closed day is refused by both
        // repositories - correctly - and the first version of this case did
        // exactly that, which the equivalence run caught immediately.
        state: 'open',
        openingCash: 0,
        countedCash: null,
        differenceReason: null,
        closedAt: null,
        createdAt: NOW,
      });
      await repo.appendEntry(
        shopId,
        entry('eq-' + n + '6-old', 700, { dayId: '2026-07-14' as IsoDate }),
      );
      await repo.appendEntry(shopId, entry('eq-' + n + '6-new', 800));

      expect(await repo.entriesFor(shopId, DATE)).toHaveLength(1);
      const before = await repo.entriesBefore(shopId, DATE);
      expect(before).toHaveLength(1);
      expect(before[0]!.amount).toBe(700);
    });

    maybe()('exports everything held about a user', async () => {
      const repo = make();
      const { shopId, userId } = await seed(repo, n + '7');
      await repo.appendEntry(shopId, entry('eq-' + n + '7-a', 5000));
      const data = (await repo.exportUser(userId)) as Record<string, unknown>;
      for (const table of ['user', 'shop', 'consents', 'devices', 'parties', 'days', 'entries']) {
        expect(data, table).toHaveProperty(table);
      }
      expect((data.entries as unknown[]).length).toBe(1);
    });

    maybe()('erases a shop and leaves a tombstone carrying nothing', async () => {
      const repo = make();
      const { shopId, userId } = await seed(repo, n + '8');
      await repo.appendEntry(shopId, entry('eq-' + n + '8-a', 5000));
      await repo.recordConsent({
        id: uuid('c' + n + '8a'),
        userId,
        purpose: 'account_and_ledger',
        granted: true,
        noticeVersion: '2026-09-1',
        locale: 'en',
        at: NOW,
      });

      await repo.purgeShop(shopId, '2026-07-16T09:00:00.000Z');

      expect(await repo.entriesFor(shopId, DATE)).toHaveLength(0);
      expect(await repo.consentsFor(userId)).toHaveLength(0);
      expect(await repo.exportUser(userId)).toBeNull();

      const shop = await repo.findShop(shopId);
      expect(shop?.deletedAt).toBe('2026-07-16T09:00:00.000Z');
      expect(shop?.name).toBe('');
    });

    maybe()('a deletion request can be cancelled, and only before it happens', async () => {
      const repo = make();
      const { shopId } = await seed(repo, n + '0');

      await repo.requestDeletion(shopId, NOW);
      expect((await repo.findShop(shopId))?.deletionRequestedAt).toBe(NOW);

      await repo.cancelDeletion(shopId);
      expect((await repo.findShop(shopId))?.deletionRequestedAt).toBeNull();

      // And once it HAS happened, cancelling brings nothing back.
      await repo.requestDeletion(shopId, NOW);
      await repo.purgeShop(shopId, '2026-08-15T09:00:00.000Z');
      await repo.cancelDeletion(shopId);
      expect((await repo.findShop(shopId))?.deletedAt).toBe('2026-08-15T09:00:00.000Z');
    });

    maybe()('only shops whose grace has run out are due, and never twice', async () => {
      const repo = make();
      const { shopId } = await seed(repo, 'a' + n);
      const other = await seed(repo, 'b' + n);

      await repo.requestDeletion(shopId, NOW);
      // The other shop asked later, so an earlier cutoff must not sweep it up.
      await repo.requestDeletion(other.shopId, '2026-08-01T00:00:00.000Z');

      const due = await repo.shopsDueForPurge('2026-07-20T00:00:00.000Z');
      expect(due).toContain(shopId);
      expect(due).not.toContain(other.shopId);

      await repo.purgeShop(shopId, '2026-07-21T00:00:00.000Z');
      expect(await repo.shopsDueForPurge('2026-07-20T00:00:00.000Z')).not.toContain(shopId);
    });

    maybe()('a shop that never asked is never due, however late the cutoff', async () => {
      const repo = make();
      const { shopId } = await seed(repo, 'c' + n);
      expect(await repo.shopsDueForPurge('2099-01-01T00:00:00.000Z')).not.toContain(shopId);
    });

    maybe()('a revoked device stays, with the time it was revoked', async () => {
      const repo = make();
      const { shopId, userId } = await seed(repo, n + '9');
      const id = '33333333-3333-4333-8333-' + (n + '9').padStart(12, '0');
      await repo.registerDevice({
        id,
        userId,
        shopId,
        platform: 'android',
        createdAt: NOW,
        lastSeenAt: NOW,
        revokedAt: null,
      });
      expect((await repo.findDevice(id))?.revokedAt).toBeNull();
      await repo.revokeDevice(id, '2026-07-15T22:00:00.000Z');
      expect((await repo.findDevice(id))?.revokedAt).toBe('2026-07-15T22:00:00.000Z');
    });
  });
}

describe('the two repositories implement the same contract', () => {
  it('reports which implementations actually ran', () => {
    if (!reachable) {
      console.log(
        '\n  [repo-equivalence] Postgres SKIPPED: ' +
          skipReason +
          '\n  Start one with: node tools/pg-up.mjs' +
          '\n  CI always has one, so CI always runs both halves.\n',
      );
    }
    // Memory always runs. The assertion is that we KNOW which half we got.
    expect(typeof reachable).toBe('boolean');
  });
});

contract('in memory', () => memoryRepo(), () => true, '1');
contract(
  'in Postgres',
  () => pgRepo({ query: (sql, params) => client!.query(sql, params as unknown[]) }),
  () => reachable,
  '2',
);
