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
import { allMigrationsUp } from '@swafto/schema';
import type { Entry, IsoDate, Party } from '@swafto/formula-engine';

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
  // Every migration, not 0001 alone: the repository now writes `entries.cancels_entry_id` (migration 0006).
  for (const s of allMigrationsUp('postgres')) await c.query(s);
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
    startsAt: '00:00',
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

    maybe()('DV-13: renames one shop, leaves the next alone, never revives an erased one', async () => {
      const repo = make();
      const mine = await seed(repo, 'fa' + n);
      const theirs = await seed(repo, 'fb' + n);
      expect(await repo.renameShop(mine.shopId, 'Ma Tarini Store')).toBe(true);
      expect((await repo.findShop(mine.shopId))?.name).toBe('Ma Tarini Store');
      expect((await repo.findShop(theirs.shopId))?.name).toBe('Equivalence Shop');

      await repo.purgeShop(theirs.shopId, NOW);
      expect(await repo.renameShop(theirs.shopId, 'back from the dead')).toBe(false);
      expect((await repo.findShop(theirs.shopId))?.name).toBe('');
      expect(await repo.renameShop('11111111-1111-4111-8111-00000000dead', 'nobody')).toBe(false);
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

    maybe()('decision 1: a day keeps the start it was first written with', async () => {
      const repo = make();
      const { shopId } = await seed(repo, n + 'd');
      const late = {
        shopId,
        date: '2026-07-16' as IsoDate,
        state: 'open' as const,
        openingCash: 0,
        countedCash: null,
        differenceReason: null,
        closedAt: null,
        startsAt: '05:00',
        createdAt: NOW,
      };
      await repo.upsertDay(late);
      expect((await repo.findDay(shopId, late.date))?.startsAt).toBe('05:00');
      // A replay carrying another start - a later shop setting - moves nothing.
      await repo.upsertDay({ ...late, startsAt: '00:00', openingCash: 300 });
      const after = await repo.findDay(shopId, late.date);
      expect(after?.startsAt).toBe('05:00');
      expect(after?.openingCash).toBe(300);
      expect((await repo.findDay(shopId, DATE))?.startsAt).toBe('00:00');
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
        startsAt: '00:00',
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

    /*
     * C-12 · daysBefore is what the closed-day memo's read fold walks. UNVERIFIED-LOCAL: the
     * Postgres arm needs a database and runs in CI; the memory arm runs everywhere.
     */
    maybe()('lists the days before a date with their state, oldest first, and no other shop days', async () => {
      const repo = make();
      const { shopId } = await seed(repo, n + 'd1');
      const other = await seed(repo, n + 'e1');
      const day = (shop: string, date: string, state: 'open' | 'closed') => ({
        shopId: shop,
        date: date as IsoDate,
        state,
        openingCash: 0,
        countedCash: state === 'closed' ? 0 : null,
        differenceReason: null,
        closedAt: state === 'closed' ? NOW : null,
        startsAt: '00:00',
        createdAt: NOW,
      });
      await repo.upsertDay(day(shopId, '2026-07-12', 'open'));
      await repo.upsertDay(day(shopId, '2026-07-10', 'open'));
      await repo.upsertDay(day(shopId, '2026-07-10', 'closed'));
      await repo.upsertDay(day(other.shopId, '2026-07-11', 'open'));
      expect(await repo.daysBefore(shopId, '2026-07-13' as IsoDate)).toEqual([
        { date: '2026-07-10', state: 'closed' },
        { date: '2026-07-12', state: 'open' },
      ]);
      expect(await repo.daysBefore(shopId, '2026-07-10' as IsoDate)).toEqual([]);
    });

    /*
     * ARCH-08 · appendEntries is ONE set-based statement on Postgres, so every kind of row a push
     * can carry goes in ONE batch here: new, replay, conflict, closed day, foreign id, a row twice.
     * Both repositories must answer each row as appendEntry does. UNVERIFIED-LOCAL: the Postgres
     * arm needs a database and runs in CI; the memory arm runs everywhere.
     */
    maybe()('answers a MIXED batch row by row exactly as appendEntry would', async () => {
      const repo = make();
      const { shopId } = await seed(repo, n + 'f');
      const other = await seed(repo, n + 'f1');
      const closedDay = '2026-07-01' as IsoDate;
      const dayRow = (state: 'open' | 'closed') => ({
        shopId, date: closedDay, state, openingCash: 0, countedCash: state === 'closed' ? 0 : null,
        differenceReason: null, closedAt: state === 'closed' ? NOW : null, startsAt: '00:00', createdAt: NOW,
      });
      await repo.upsertDay(dayRow('open'));
      await repo.upsertDay(dayRow('closed'));
      const replay = entry('eq-' + n + 'f-replay', 111);
      const conflict = entry('eq-' + n + 'f-conflict', 222);
      const foreign = entry('eq-' + n + 'f-foreign', 333);
      await repo.appendEntry(shopId, replay);
      await repo.appendEntry(shopId, conflict);
      await repo.appendEntry(other.shopId, foreign);
      const twice = entry('eq-' + n + 'f-twice', 444);
      const batch: Entry[] = [
        entry('eq-' + n + 'f-new1', 1),
        replay,
        { ...conflict, amount: 223 },
        entry('eq-' + n + 'f-closed', 5, { dayId: closedDay }),
        foreign,
        twice,
        twice,
        entry('eq-' + n + 'f-new2', 2),
      ];
      const out = await repo.appendEntries(shopId, batch);
      const kind = (o: (typeof out)[number]) =>
        'error' in o ? (o.error as { constraintName?: string }).constraintName : o.inserted ? 'new' : 'replay';
      expect(out.map(kind)).toEqual([
        'new', 'replay', 'entries_append_only', 'entries_closed_day', 'entries_tenancy', 'new', 'replay', 'new',
      ]);
      // Only the rows that should have landed did, and nothing of another shop's moved.
      const stored = (await repo.entriesFor(shopId, DATE)).map((e) => e.id).sort();
      expect(stored).toEqual([batch[0]!, replay, conflict, twice, batch[7]!].map((e) => e.id).sort());
      expect(await repo.entriesFor(shopId, closedDay)).toEqual([]);
      expect((await repo.findEntry(other.shopId, foreign.id))?.amount).toBe(333);
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

    maybe()('redacts a party without touching the entries that point at it', async () => {
      const repo = make();
      const { shopId } = await seed(repo, 'd' + n);
      const partyId = uuid('a1' + n);
      await repo.upsertParty(shopId, {
        id: partyId,
        kind: 'customer',
        name: 'Ramesh Kumar Behera',
        phone: '+919812345678',
      } as Party);
      await repo.appendEntry(
        shopId,
        entry('eq-' + n + 'r', 25000, { partyId, section: 'udhar_sales', mode: 'udhar' }),
      );

      expect((await repo.redactParty(shopId, partyId)).redacted).toBe(true);

      const party = (await repo.partiesFor(shopId)).find((p) => p.id === partyId);
      expect(party, 'the row survives, because the entries point at it').toBeTruthy();
      expect(party!.name).toBe('');
      expect(party!.phone ?? null).toBeNull();

      // The money is untouched: it is the shopkeeper's record, not the customer's.
      const rows = await repo.entriesFor(shopId, DATE);
      expect(rows.find((e) => e.partyId === partyId)?.amount).toBe(25000);
    });

    maybe()('refuses to redact a party of another shop, and says nothing about it', async () => {
      const repo = make();
      const mine = await seed(repo, 'e' + n);
      const theirs = await seed(repo, 'f' + n);
      const partyId = uuid('b2' + n);
      await repo.upsertParty(theirs.shopId, {
        id: partyId,
        kind: 'customer',
        name: 'Somebody Else',
      } as Party);

      expect((await repo.redactParty(mine.shopId, partyId)).redacted).toBe(false);
      const still = (await repo.partiesFor(theirs.shopId)).find((p) => p.id === partyId);
      expect(still!.name).toBe('Somebody Else');
    });

    maybe()('cannot upsert over a party belonging to another shop (SEC-09)', async () => {
      /*
       * A PARTY ID IS GLOBAL, AND IT ARRIVES FROM THE CLIENT.
       *
       * `parties.id` is a UUID PRIMARY KEY on both engines, not scoped by
       * shop, and party rows reach the server on the sync push with ids the
       * client chose. So a client can name an id it does not own. `shopOf()`
       * cannot catch it: the shop it returns is correct, and it is the id
       * beside it that is foreign.
       *
       * Both repositories got this wrong, differently. Postgres had
       * `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name` with no shop
       * predicate, so an attacker rewrote the victim's customer name and
       * phone. The in-memory one did `parties.set(id, {...party, shopId})`
       * unconditionally, which also reassigned `shopId` - it MOVED the
       * victim's customer into the attacker's shop, which is worse, and which
       * is the repository nearly every route test runs against.
       */
      const repo = make();
      /*
       * The suffixes must be HEX. `seed` pads them into a UUID, so a letter
       * outside 0-9a-f makes Postgres reject the row with "invalid input
       * syntax for type uuid" while the in-memory repository accepts it
       * happily - which is why every other case here uses d, e, f, a1, b2.
       */
      const victim = await seed(repo, 'ea' + n);
      const attacker = await seed(repo, 'eb' + n);
      const partyId = uuid('c3' + n);

      await repo.upsertParty(victim.shopId, {
        id: partyId,
        kind: 'customer',
        name: 'Somebody Else',
        phone: '+919812345678',
      } as Party);

      // The attacker names the victim's party id as if it were their own -
      // and is told no, rather than handed a silent "success" to ack.
      await expect(
        repo.upsertParty(attacker.shopId, {
          id: partyId,
          kind: 'customer',
          name: 'Renamed By Attacker',
          phone: '+910000000000',
        } as Party),
      ).rejects.toMatchObject({ name: 'WriteRefused', constraintName: 'parties_tenancy' });

      const theirs = (await repo.partiesFor(victim.shopId)).find((p) => p.id === partyId);
      expect(theirs, 'the row must still belong to the shop that created it').toBeTruthy();
      expect(theirs!.name).toBe('Somebody Else');
      expect(theirs!.phone).toBe('+919812345678');

      // And it must not have appeared in the attacker's shop either.
      expect((await repo.partiesFor(attacker.shopId)).map((p) => p.id)).not.toContain(partyId);
    });

    maybe()('an entry cannot point at another shop\'s party, or a missing one', async () => {
      /*
       * `entries.party_id REFERENCES parties(id)` is not shop-scoped, so
       * Postgres accepted shop B's credit sale against shop A's customer -
       * and A's erasure (`DELETE FROM parties WHERE shop_id = A`) would then
       * fail on B's foreign key. Memory checked nothing at all, so a missing
       * party was accepted there and refused by Postgres: a divergence.
       */
      const repo = make();
      const victim = await seed(repo, 'ec' + n);
      const attacker = await seed(repo, 'ed' + n);
      const partyId = uuid('c4' + n);
      await repo.upsertParty(victim.shopId, { id: partyId, kind: 'customer', name: 'A' } as Party);

      const credit = (id: string, party: string) =>
        entry(id, 5000, { partyId: party, section: 'udhar_sales', mode: 'udhar' });
      await expect(repo.appendEntry(attacker.shopId, credit('f1' + n, partyId))).rejects.toMatchObject(
        { constraintName: 'entries_party_fk' },
      );
      await expect(
        repo.appendEntry(attacker.shopId, credit('f2' + n, uuid('dead' + n))),
      ).rejects.toMatchObject({ constraintName: 'entries_party_fk' });
      expect((await repo.appendEntry(victim.shopId, credit('f3' + n, partyId))).inserted).toBe(true);
    });

    maybe()('a replayed id that is another shop\'s entry is refused, not acked (SEC-10)', async () => {
      const repo = make();
      const a = await seed(repo, 'ee' + n);
      const b = await seed(repo, 'ef' + n);
      const same = entry('f4' + n, 7000);
      expect((await repo.appendEntry(a.shopId, same)).inserted).toBe(true);
      // Identical content: this used to come back `inserted: false` - "already
      // present" - and the phone would drop a sale the server never stored.
      await expect(repo.appendEntry(b.shopId, same)).rejects.toMatchObject({
        constraintName: 'entries_tenancy',
      });
      expect(await repo.entriesFor(b.shopId, DATE)).toEqual([]);
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
      expect(await repo.revokeDevice(shopId, id, '2026-07-15T22:00:00.000Z')).toBe(true);
      expect((await repo.findDevice(id))?.revokedAt).toBe('2026-07-15T22:00:00.000Z');
    });

    /* ---- decisions 2 and 3: the day facts, identically on both ---------- */

    maybe()('decision 3: a UPI receipt is confirmed once; a cash entry and a closed day refuse', async () => {
      const repo = make();
      const { shopId } = await seed(repo, 'dd1' + n);
      const upi = entry('up' + n + 'a', 30000, { section: 'upi_sales', mode: 'upi' });
      const upiLate = entry('up' + n + 'c', 500, { section: 'upi_sales', mode: 'upi' });
      const cash = entry('up' + n + 'b', 1000);
      await repo.appendEntry(shopId, upi);
      await repo.appendEntry(shopId, upiLate);
      await repo.appendEntry(shopId, cash);
      const c = { id: uuid('uc' + n + '1'), dayId: DATE, entryId: upi.id, confirmedAt: NOW };

      expect((await repo.appendUpiConfirmation(shopId, c)).inserted).toBe(true);
      // A replay, and a second phone ticking the same payment: neither is a row.
      expect((await repo.appendUpiConfirmation(shopId, c)).inserted).toBe(false);
      expect(
        (await repo.appendUpiConfirmation(shopId, { ...c, id: uuid('uc' + n + '2') })).inserted,
      ).toBe(false);
      await expect(
        repo.appendUpiConfirmation(shopId, { ...c, id: uuid('uc' + n + '3'), entryId: cash.id }),
      ).rejects.toThrow(WriteRefused);

      const facts = await repo.dayFactsFor(shopId, DATE);
      expect(facts.upiConfirmations.map((x) => x.entryId)).toEqual([upi.id]);

      await repo.upsertDay({
        shopId, date: DATE, state: 'closed', openingCash: 100000, countedCash: 100000,
        differenceReason: null, closedAt: NOW, startsAt: '00:00', createdAt: NOW,
      });
      // A real UPI receipt of that day, unticked when it closed: D7 refuses the tick now.
      await expect(
        repo.appendUpiConfirmation(shopId, { ...c, id: uuid('uc' + n + '4'), entryId: upiLate.id }),
      ).rejects.toThrow(/closed/);
    });

    maybe()('decision 2: an adjustment is append-only, idempotent by id, refused into a closed day', async () => {
      const repo = make();
      const { shopId } = await seed(repo, 'dd2' + n);
      const a = {
        id: uuid('ad' + n + '1'),
        dayId: DATE,
        type: 'counterfeit_note' as const,
        amount: 50000,
        createdAt: NOW,
      };
      expect((await repo.appendAdjustment(shopId, a)).inserted).toBe(true);
      expect((await repo.appendAdjustment(shopId, a)).inserted).toBe(false);
      await expect(repo.appendAdjustment(shopId, { ...a, amount: 1 })).rejects.toThrow(WriteRefused);
      const facts = await repo.dayFactsFor(shopId, DATE);
      expect(facts.adjustments).toEqual([a]);
      expect(Number.isInteger(facts.adjustments[0]!.amount)).toBe(true);

      await repo.upsertDay({
        shopId, date: DATE, state: 'closed', openingCash: 100000, countedCash: 50000,
        differenceReason: null, closedAt: NOW, startsAt: '00:00', createdAt: NOW,
      });
      await expect(
        repo.appendAdjustment(shopId, { ...a, id: uuid('ad' + n + '2') }),
      ).rejects.toThrow(/closed/);
    });

    maybe()('erasure takes the day facts with the ledger', async () => {
      const repo = make();
      const { shopId } = await seed(repo, 'dd3' + n);
      const upi = entry('er' + n + 'a', 30000, { section: 'upi_sales', mode: 'upi' });
      await repo.appendEntry(shopId, upi);
      await repo.appendUpiConfirmation(shopId, {
        id: uuid('ec' + n),
        dayId: DATE,
        entryId: upi.id,
        confirmedAt: NOW,
      });
      await repo.appendAdjustment(shopId, {
        id: uuid('ea' + n),
        dayId: DATE,
        type: 'home_use',
        amount: 100,
        createdAt: NOW,
      });
      await repo.purgeShop(shopId, NOW);
      expect(await repo.dayFactsFor(shopId, DATE)).toEqual({ upiConfirmations: [], adjustments: [] });
    });

    /* ---- PR-1: items and item lines, identically on both ---------------- */

    maybe()('PR-1: lines fit their sale, never more; refuse a non-sale, a foreign item, a closed day', async () => {
      const repo = make();
      const { shopId } = await seed(repo, 'ee1' + n);
      const other = await seed(repo, 'ee2' + n);
      const sale = entry('e1' + n + 'a', 50000);
      const tea = entry('e1' + n + 'b', 2000, { section: 'expense' });
      await repo.appendEntry(shopId, sale);
      await repo.appendEntry(shopId, tea);
      const item = { id: uuid('e1' + n + 'c'), name: 'Biscuit', createdAt: NOW };
      const foreign = { id: uuid('e1' + n + 'd'), name: 'Soap', createdAt: NOW };
      expect((await repo.appendItem(shopId, item)).inserted).toBe(true);
      expect((await repo.appendItem(shopId, item)).inserted).toBe(false);
      await expect(repo.appendItem(shopId, { ...item, name: 'Rusk' })).rejects.toThrow(WriteRefused);
      await repo.appendItem(other.shopId, foreign);

      const line = {
        id: uuid('e1' + n + 'e'),
        dayId: DATE,
        entryId: sale.id,
        itemId: item.id,
        quantity: 2,
        amount: 30000,
        createdAt: NOW,
      };
      expect((await repo.appendItemLine(shopId, line)).inserted).toBe(true);
      expect((await repo.appendItemLine(shopId, line)).inserted).toBe(false);
      // "Other", up to exactly the sale.
      const otherLine = { id: uuid('e1' + n + 'f'), dayId: DATE, entryId: sale.id, quantity: 1, amount: 20000, createdAt: NOW };
      expect((await repo.appendItemLine(shopId, otherLine)).inserted).toBe(true);
      await expect(
        repo.appendItemLine(shopId, { ...otherLine, id: uuid('e1' + n + '1'), amount: 100 }),
      ).rejects.toMatchObject({ constraintName: 'item_lines_fit_sale' });
      await expect(
        repo.appendItemLine(shopId, { ...otherLine, id: uuid('e1' + n + '2'), entryId: tea.id, amount: 100 }),
      ).rejects.toMatchObject({ constraintName: 'item_lines_fit_sale' });
      await expect(
        repo.appendItemLine(shopId, { ...line, id: uuid('e1' + n + '3'), itemId: foreign.id, amount: 1 }),
      ).rejects.toMatchObject({ constraintName: 'item_lines_item_fk' });
      expect((await repo.itemLinesFor(shopId)).map((l) => l.id).sort()).toEqual([line.id, otherLine.id].sort());
      expect(await repo.itemsFor(shopId)).toEqual([item]);

      const sale2 = entry('e1' + n + '4', 50000);
      await repo.appendEntry(shopId, sale2);
      await repo.upsertDay({
        shopId, date: DATE, state: 'closed', openingCash: 100000, countedCash: 100000,
        differenceReason: 'counted', closedAt: NOW, startsAt: '00:00', createdAt: NOW,
      });
      await expect(
        repo.appendItemLine(shopId, { ...otherLine, id: uuid('e1' + n + '5'), entryId: sale2.id, amount: 1 }),
      ).rejects.toThrow(/closed/);
    });

    maybe()('PR-1: erasure and export take the item list and the lines with the ledger', async () => {
      const repo = make();
      const { shopId, userId } = await seed(repo, 'ee3' + n);
      const sale = entry('e3' + n + 'a', 5000);
      await repo.appendEntry(shopId, sale);
      const item = { id: uuid('e3' + n + 'b'), name: 'Tea', createdAt: NOW };
      await repo.appendItem(shopId, item);
      await repo.appendItemLine(shopId, {
        id: uuid('e3' + n + 'c'), dayId: DATE, entryId: sale.id, itemId: item.id, quantity: 1, amount: 5000, createdAt: NOW,
      });
      const exported = (await repo.exportUser(userId)) as { items: unknown[]; itemLines: unknown[] };
      expect(exported.items).toHaveLength(1);
      expect(exported.itemLines).toHaveLength(1);
      await repo.purgeShop(shopId, NOW);
      expect(await repo.itemsFor(shopId)).toEqual([]);
      expect(await repo.itemLinesFor(shopId)).toEqual([]);
    });

    maybe()('R5 FR-6: a credit limit is a customer\'s, append-only, idempotent, erased with the shop', async () => {
      const repo = make();
      const { shopId } = await seed(repo, 'cb' + n);
      const other = await seed(repo, 'ce' + n);
      const customer = uuid('cc' + n);
      const supplier = uuid('cf' + n);
      await repo.upsertParty(shopId, { id: customer, kind: 'customer', name: 'Ramesh' } as Party);
      await repo.upsertParty(shopId, { id: supplier, kind: 'supplier', name: 'Wholesaler' } as Party);
      const l = { id: uuid('cb' + n + '1'), partyId: customer, limit: 500000, setAt: NOW };
      expect((await repo.appendCreditLimit(shopId, l)).inserted).toBe(true);
      expect((await repo.appendCreditLimit(shopId, l)).inserted).toBe(false);
      await expect(repo.appendCreditLimit(shopId, { ...l, limit: 1 })).rejects.toThrow(WriteRefused);
      // Cleared: a new row, never an edit of the old one.
      const cleared = { id: uuid('cb' + n + '2'), partyId: customer, limit: null, setAt: NOW };
      expect((await repo.appendCreditLimit(shopId, cleared)).inserted).toBe(true);
      await expect(
        repo.appendCreditLimit(shopId, { ...l, id: uuid('cb' + n + '3'), partyId: supplier }),
      ).rejects.toThrow(/customer/);
      // Another shop can neither attach a limit to this customer nor read it.
      await expect(
        repo.appendCreditLimit(other.shopId, { ...l, id: uuid('cb' + n + '4') }),
      ).rejects.toThrow(WriteRefused);
      expect(await repo.creditLimitsFor(other.shopId)).toEqual([]);
      const mine = await repo.creditLimitsFor(shopId);
      expect(mine.map((x) => x.limit)).toEqual([500000, null]);

      await repo.purgeShop(shopId, NOW);
      expect(await repo.creditLimitsFor(shopId)).toEqual([]);
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
