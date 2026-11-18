/**
 * THE PORT, IN POSTGRES. The same contract, the real database.
 *
 * EVERY VALUE IS A BOUND PARAMETER. There is no string interpolation into SQL in
 * this file and there must never be one - not for a table name, not for an
 * ordering, not "just this once, for an id we generated ourselves". A shop's
 * ledger and its customers' names are what an injection here would reach.
 *
 * THE DATABASE IS THE AUTHORITY ON ITS OWN RULES. Append-only and the closed-day
 * guard are triggers and CHECK constraints, tested on both dialects; this
 * adapter does not restate them. What it does is TRANSLATE their refusals into
 * the same `WriteRefused` the in-memory repository throws, so a route behaves
 * identically against either. `repo-equivalence.spec.ts` runs one contract
 * against both, which is what keeps that claim honest.
 *
 * MONEY COMES BACK AS A STRING. `BIGINT` exceeds what a JavaScript number holds
 * exactly, so `pg` returns it as text; every read here parses it and asserts
 * integrality. Letting the driver coerce would put a silent float at the one
 * boundary this product cannot have one.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { evictingOnErasure } from './closed-day-memo.ts';
import { isInfraError } from './errors.ts';
import {
  WriteRefused,
  adjustmentChanged,
  itemNotInShop,
  itemRowChanged,
  lineDoesNotFit,
  creditLimitChanged,
  creditLimitParty,
  assertUuid,
  dayFactClosed,
  dayFactNoDay,
  foreignEntry,
  notAUpiReceipt,
  REFRESH_GRACE_SECONDS,
  foreignParty,
  partyNotInShop,
  pushDeferred,
  type ConsentRow,
  type DayRow,
  type DeviceRow,
  type EntryOutcome,
  type Repo,
  type ShopRow,
  type UserRow,
} from './port.ts';
import {
  assertPaise,
  assertLineFits,
  isUpiReceipt,
  type ItemLine,
  type ShopItem,
  type Adjustment,
  type AdjustmentType,
  type CreditLimit,
  type UpiConfirmation,
  type Entry,
  type IsoDate,
  type Paise,
  type Party,
} from '@swafto/formula-engine';

/** The one statement shape a repository needs, so nothing here imports a driver. */
export interface SqlClient {
  query(sql: string, params?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[] }>;

  /**
   * RUN A UNIT OF WORK ON ONE CONNECTION. Optional, and the reason it exists is
   * a defect that only appears in production.
   *
   * `query` alone cannot express a transaction. Both production call sites pass
   * a `pg.Pool` (`server.ts`, `jobs/purge-due.ts`), and a Pool hands each
   * `query` whichever connection is free. So `BEGIN`, `SET LOCAL` and the
   * statements they are meant to govern can each land on a DIFFERENT backend:
   * the BEGIN opens a transaction on a connection that is then returned to the
   * pool still inside it, and the statements run outside any transaction at
   * all, with none of the settings the caller believed it had established.
   *
   * It passed every test because the tests pass a single `pg.Client`, which has
   * exactly one connection, so the statements could not be separated. That is
   * the shape of this bug: correct in development, silently wrong in production.
   *
   * A caller that is already a single connection may omit this; `reserved()`
   * below falls back to using the client directly, which is correct for a
   * Client and for the in-memory fake.
   */
  reserve?<T>(fn: (connection: SqlClient) => Promise<T>): Promise<T>;
}

/** BIGINT arrives as text. Parse it, and refuse anything that is not a whole number. */
const paise = (value: unknown, what: string): Paise =>
  assertPaise(typeof value === 'string' ? Number(value) : value, what);

const nullablePaise = (value: unknown, what: string): Paise | null =>
  value === null || value === undefined ? null : paise(value, what);

/** TIMESTAMPTZ arrives as a Date; the port speaks ISO-8601 UTC strings only. */
const iso = (value: unknown): string => (value instanceof Date ? value.toISOString() : String(value));

const isoOrNull = (value: unknown): string | null =>
  value === null || value === undefined ? null : iso(value);

/**
 * DATE, WITHOUT LOSING A DAY TO A TIMEZONE.
 *
 * `pg` parses a DATE column into a JavaScript Date at LOCAL midnight. Calling
 * `toISOString()` on that converts to UTC, and in any timezone east of
 * Greenwich it lands on the previous day: 2026-07-15 stored in India read back
 * as 2026-07-14. In a product whose entire job is closing a day, every figure
 * would attach to the wrong one, and it would look correct on a server set to
 * UTC and wrong on one set to IST.
 *
 * So the LOCAL components are read, which are the ones pg built the Date from.
 * The equivalence run caught this on its first outing against a real database.
 */
const day = (value: unknown): IsoDate => {
  if (!(value instanceof Date)) return String(value).slice(0, 10) as IsoDate;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (value.getFullYear() +
    '-' +
    pad(value.getMonth() + 1) +
    '-' +
    pad(value.getDate())) as IsoDate;
};

/**
 * Turn a constraint violation into the refusal the port promises.
 *
 * The constraint NAME is the signal, which is why the schema names all of them.
 * An unrecognised error is re-thrown rather than flattened into a refusal: a
 * connection failure is not the shopkeeper doing something wrong, and reporting
 * it as one would hide an outage behind a validation message.
 */
function translate(error: unknown): never {
  const e = error as { code?: string; constraint?: string; message?: string };
  const constraint = e.constraint ?? '';

  if (e.code === '23505') {
    throw new WriteRefused(constraint || 'unique_violation', 'that record already exists');
  }
  if (e.code === '23514' || e.code === '23503' || constraint) {
    throw new WriteRefused(constraint || String(e.code), e.message ?? 'the database refused it');
  }
  // P0001 is a RAISE from one of the append-only or closed-day triggers.
  if (e.code === 'P0001') {
    /*
     * BE-12: the trigger's own text names the schema, so it never reaches a
     * client. A closed day is the one refusal a phone must recognise, and it is
     * named exactly as the in-memory repository names it.
     */
    if (/closed/.test(e.message ?? '')) {
      throw closedDayRefusal();
    }
    throw new WriteRefused('trigger', 'the ledger refused this write.');
  }
  // 42501: row-level security refused the write - another shop's row (C-01).
  if (e.code === '42501') {
    throw new WriteRefused('tenancy', 'that record cannot be written by this shop.');
  }
  throw error;
}

/** RT-W3-2 · how much per-row or retry work one push may cost before it is told to come back. */
const MAX_PER_ROW = 25;
const MAX_INSERT_ATTEMPTS = 128;

const closedDayRefusal = () =>
  new WriteRefused('entries_closed_day', 'that day is closed and its figures never move again.');

const entryChanged = (id: string) =>
  new WriteRefused(
    'entries_append_only',
    'entry ' +
      id +
      ' already exists with different content. Entries are append-only (D1): ' +
      'correct a mistake by appending a correction, never by changing what was typed.',
  );

export interface PgRepoOptions {
  /**
   * THE PRIVILEGED CONNECTION, FOR THE FEW READS THAT HAVE NO SHOP YET (C-01).
   *
   * Row-level security keys every tenant table on `swafto.shop_id`, and the
   * app role has no BYPASSRLS. Five repository methods are asked a question
   * BEFORE a shop is known, or by something other than a shop's own session:
   * `findUserByPhone` (sign-in), `recordConsent` and `consentsFor` and
   * `exportUser` (keyed by user id), `findDevice` and `revokeDevice` (keyed by
   * device id, the lookup that authenticates the request in the first place).
   * They run here, on a role that may read across shops, and ONLY they do.
   *
   * Everything else - every ledger read and write - runs on `sql` inside a
   * transaction that has set `swafto.shop_id` (see `scoped`). The erasure job
   * also runs scoped, per shop, so it needs no privilege either.
   *
   * Omitted, it falls back to `sql`: correct for the in-process tests and for a
   * development database whose one role is a superuser. Production refuses to
   * boot without it (server.ts `assertDbRoles`).
   */
  readonly system?: SqlClient;
}

export function pgRepo(sql: SqlClient, options: PgRepoOptions = {}): Repo {
  const system = options.system ?? sql;

  /**
   * Hand `fn` a client that is guaranteed to be ONE connection for its whole
   * duration, so a transaction and its `SET LOCAL` settings actually govern the
   * statements inside it. See `SqlClient.reserve` for what goes wrong without
   * it. A single-connection client omits `reserve` and is used directly.
   */
  const reservedOn = <T>(client: SqlClient, fn: (c: SqlClient) => Promise<T>): Promise<T> =>
    client.reserve ? client.reserve(fn) : fn(client);
  const reserved = <T>(fn: (c: SqlClient) => Promise<T>): Promise<T> => reservedOn(sql, fn);

  /**
   * One transaction, on one connection, rolled back on any throw.
   *
   * ROLLBACK is deliberately swallowed: if the work threw because the
   * connection died, the ROLLBACK throws too, and letting that replace the
   * original error loses the only diagnosis anyone had.
   */
  const transaction = <T>(fn: (c: SqlClient) => Promise<T>): Promise<T> =>
    reserved(async (c) => {
      await c.query('BEGIN');
      try {
        const out = await fn(c);
        await c.query('COMMIT');
        return out;
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        throw e;
      }
    });

  /**
   * C-01 · EVERY DB USE ON BEHALF OF A SHOP RUNS HERE.
   *
   * One transaction, on one connection, whose first statement binds
   * `swafto.shop_id` for the transaction only (`is_local = true`). The row-level
   * security policies read it, so a query that forgets its `WHERE shop_id` - or
   * is handed another shop's id by a bug - sees zero foreign rows instead of all
   * of them. `shopOf(req)` decides WHICH shop; this makes the database agree.
   *
   * The setting dies with the transaction, so a pooled connection never carries
   * one shop's identity into the next request.
   *
   * COST, MEASURED BY NOBODY YET: BEGIN, set_config and COMMIT are three round
   * trips on top of the statements. A push is the heavy caller; its per-entry
   * path stays one statement (see `appendWith`).
   */
  const openScope = <T>(shopId: string, fn: (c: SqlClient) => Promise<T>): Promise<T> =>
    transaction(async (c) => {
      await c.query("SELECT set_config('swafto.shop_id', $1, true)", [shopId]);
      return fn(c);
    });

  /**
   * ARCH-06 · a request that makes several repo calls for ONE shop may share a single scoped
   * transaction (`inScope`): a call for the SAME shop made inside it joins that connection, a call
   * for any other shop (or outside it) opens its own as before. Tenancy is unchanged - the one
   * `set_config` names the one shop, and a different shop never reuses it.
   */
  const open = new AsyncLocalStorage<{ shopId: string; c: SqlClient; dead: boolean }>();
  const scoped = <T>(shopId: string, fn: (c: SqlClient) => Promise<T>): Promise<T> => {
    const cur = open.getStore();
    if (cur && !cur.dead && cur.shopId === shopId) return fn(cur.c);
    return openScope(shopId, fn);
  };

  const rowToUser = (r: Record<string, unknown>): UserRow => ({
    id: String(r.id),
    shopId: String(r.shop_id),
    phone: String(r.phone),
    name: r.name === null || r.name === undefined ? null : String(r.name),
    createdAt: iso(r.created_at),
    consentVersion: r.consent_version ? String(r.consent_version) : null,
    consentAt: isoOrNull(r.consent_at),
    consentLocale: r.consent_locale ? String(r.consent_locale) : null,
  });

  const rowToEntry = (r: Record<string, unknown>): Entry =>
    ({
      id: String(r.id),
      dayId: day(r.day_id),
      section: String(r.section),
      amount: paise(r.amount, 'amount'),
      mode: String(r.mode),
      createdAt: iso(r.created_at),
      source: String(r.source),
      ...(r.party_id ? { partyId: String(r.party_id) } : {}),
      ...(r.due_date ? { dueDate: day(r.due_date) } : {}),
      ...(r.label ? { label: String(r.label) } : {}),
      ...(r.corrects_day_id ? { correctsDayId: day(r.corrects_day_id) } : {}),
      ...(r.refers_to_entry_id ? { refersToEntryId: String(r.refers_to_entry_id) } : {}),
    }) as Entry;

  /** Same content, by every field the shopkeeper typed. `createdAt` is compared as an instant. */
  const sameEntry = (a: Entry, b: Entry): boolean =>
    a.id === b.id &&
    a.dayId === b.dayId &&
    a.section === b.section &&
    a.amount === b.amount &&
    a.mode === b.mode &&
    (a.partyId ?? null) === (b.partyId ?? null) &&
    (a.dueDate ?? null) === (b.dueDate ?? null) &&
    (a.label ?? '') === (b.label ?? '') &&
    (a.correctsDayId ?? null) === (b.correctsDayId ?? null) &&
    (a.refersToEntryId ?? null) === (b.refersToEntryId ?? null) &&
    (a.source ?? 'manual') === (b.source ?? 'manual') &&
    Date.parse(a.createdAt) === Date.parse(b.createdAt);

  /**
   * One entry, on the client given - the pool for a lone entry, or the one
   * connection of a transaction for an event's legs (EX-5).
   */
  /**
   * One entry, on the client given - the pool for a lone entry, or the one
   * connection of a transaction for an event's legs (EX-5).
   */
  const appendWith = async (c: SqlClient, shopId: string, entry: Entry): Promise<{ inserted: boolean }> => {
    /*
     * The same id arriving twice is the NORMAL case - a replayed push - so it
     * is acked as already present, and the row count says which it was. The same
     * id with DIFFERENT content is an attempt to edit an entry, which D1
     * forbids, so it is read back and compared (BE-10: on every field, not only
     * amount and section) rather than quietly ignored.
     */
    // The FK is on `parties(id)` alone, so it accepts another shop's party.
    if (entry.partyId !== undefined) {
      const own = await c.query('SELECT 1 FROM parties WHERE id = $1 AND shop_id = $2', [entry.partyId, shopId]);
      if (own.rows.length === 0) throw partyNotInShop(entry.partyId);
    }
    let inserted = false;
    try {
      /*
       * C-05 · `WHERE NOT EXISTS` IS WHAT LETS A REPLAY INTO A CLOSED DAY BE ACKED.
       *
       * `ON CONFLICT DO NOTHING` alone is not enough: the BEFORE INSERT trigger
       * (entries_reject_closed_day, D7) fires on the PROPOSED row before the
       * conflict is found, so after the day closed every already-stored entry
       * of a replayed push was refused, the phone kept them queued, and the
       * outbox never drained. With the existence test in the SELECT, a row that
       * is already there proposes nothing, so no trigger fires. A NEW entry into
       * a closed day still proposes a row, and still meets the trigger (D7).
       * ON CONFLICT stays for the race of two pushes of one id.
       */
      const res = await c.query(
        `INSERT INTO entries (id, shop_id, day_id, section, amount, mode, party_id,
                              due_date, label, corrects_day_id, created_at, source, refers_to_entry_id)
         SELECT $1::uuid, $2::uuid, $3::date, $4::text, $5::bigint, $6::text, $7::uuid,
                $8::date, $9::text, $10::date, $11::timestamptz, $12::text, $13::uuid
          WHERE NOT EXISTS (SELECT 1 FROM entries WHERE id = $1::uuid)
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
        [
          entry.id,
          shopId,
          entry.dayId,
          entry.section,
          entry.amount,
          entry.mode,
          entry.partyId ?? null,
          entry.dueDate ?? null,
          entry.label ?? null,
          entry.correctsDayId ?? null,
          entry.createdAt,
          entry.source ?? 'manual',
          entry.refersToEntryId ?? null,
        ],
      );
      inserted = res.rows.length === 1;
    } catch (e) {
      translate(e);
    }

    if (!inserted) {
      const existing = await c.query('SELECT * FROM entries WHERE id = $1', [entry.id]);
      const r = existing.rows[0];
      /*
       * SEC-10, and C-01: a row with this id that this shop cannot see is another
       * shop's. Under row-level security it is invisible rather than visible-and-
       * foreign, so "no row came back" must be refused here, not acked as present.
       */
      if (!r || String(r.shop_id) !== shopId) throw foreignEntry(entry.id);
      if (!sameEntry(rowToEntry(r), entry)) throw entryChanged(entry.id);
    }
    return { inserted };
  };

  const rowToAdjustment = (r: Record<string, unknown>): Adjustment => ({
    id: String(r.id),
    dayId: day(r.day_id),
    type: String(r.type) as AdjustmentType,
    amount: paise(r.amount, 'amount'),
    createdAt: iso(r.created_at),
  });

  const rowToItem = (r: Record<string, unknown>): ShopItem => ({
    id: String(r.id),
    name: String(r.name),
    createdAt: iso(r.created_at),
  });

  const rowToItemLine = (r: Record<string, unknown>): ItemLine => ({
    id: String(r.id),
    dayId: day(r.day_id),
    entryId: String(r.entry_id),
    ...(r.item_id ? { itemId: String(r.item_id) } : {}),
    quantity: Number(r.quantity),
    amount: paise(r.amount, 'amount'),
    createdAt: iso(r.created_at),
  });

  const rowToCreditLimit = (r: Record<string, unknown>): CreditLimit => ({
    id: String(r.id),
    partyId: String(r.party_id),
    limit: r.limit_paise === null ? null : paise(r.limit_paise, 'limit'),
    setAt: iso(r.set_at),
  });

  /** The day-fact triggers, as the port's named refusals. */
  const dayFactRefusal = (err: unknown, date: string): never => {
    const e = err as { code?: string; message?: string };
    if (e.code === 'P0001' && /closed/.test(e.message ?? '')) throw dayFactClosed(date);
    if (e.code === '23503' && /days/.test(e.message ?? '')) throw dayFactNoDay(date);
    return translate(err);
  };

  const repo: Repo = {
    async findUserByPhone(phone) {
      const res = await system.query('SELECT * FROM users WHERE phone = $1', [phone]);
      return res.rows[0] ? rowToUser(res.rows[0]) : null;
    },

    async createShopAndUser({ shopId, userId, phone, shopName, language, now }) {
      /*
       * Scoped to the NEW shop: the user row's policy admits only a row of the
       * shop the transaction is bound to, and this is the one moment that shop
       * is known and nobody has a session for it yet. Both inserts and the
       * read-back share one transaction, so a refused user leaves no orphan shop.
       */
      try {
        await scoped(shopId, async (c) => {
          await c.query(
            `INSERT INTO shops (id, name, type, language, created_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [shopId, shopName, 'kirana', language, now],
          );
          await c.query(
            'INSERT INTO users (id, shop_id, phone, created_at) VALUES ($1, $2, $3, $4)',
            [userId, shopId, phone, now],
          );
        });
      } catch (e) {
        translate(e);
      }
      const shop = await repo.findShop(shopId);
      const user = await repo.findUserByPhone(phone);
      if (!shop || !user) throw new Error('the rows just inserted are not readable');
      return { shop, user };
    },

    async renameShop(shopId, name) {
      const res = await sql.query(
        'UPDATE shops SET name = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING id',
        [shopId, name],
      );
      return res.rows.length === 1;
    },

    async findShop(shopId) {
      const res = await sql.query('SELECT * FROM shops WHERE id = $1', [shopId]);
      const r = res.rows[0];
      if (!r) return null;
      const shop: ShopRow = {
        id: String(r.id),
        name: String(r.name),
        type: String(r.type),
        language: String(r.language) as 'od' | 'hi' | 'en',
        createdAt: iso(r.created_at),
        deletionRequestedAt: isoOrNull(r.deletion_requested_at),
        deletedAt: isoOrNull(r.deleted_at),
      };
      return shop;
    },

    async recordConsent(row) {
      try {
        await system.query(
          `INSERT INTO consents (id, user_id, purpose, granted, notice_version, locale, at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [row.id, row.userId, row.purpose, row.granted, row.noticeVersion, row.locale, row.at],
        );
        // The user row carries the LATEST grant, for the notice check on sign-in.
        if (row.granted) {
          await system.query(
            `UPDATE users SET consent_version = $2, consent_at = $3, consent_locale = $4
             WHERE id = $1`,
            [row.userId, row.noticeVersion, row.at, row.locale],
          );
        }
      } catch (e) {
        translate(e);
      }
    },

    async consentsFor(userId) {
      const res = await system.query('SELECT * FROM consents WHERE user_id = $1 ORDER BY at ASC', [
        userId,
      ]);
      return res.rows.map(
        (r): ConsentRow => ({
          id: String(r.id),
          userId: String(r.user_id),
          purpose: String(r.purpose),
          granted: r.granted === true || r.granted === 't' || r.granted === 1,
          noticeVersion: String(r.notice_version),
          locale: String(r.locale),
          at: iso(r.at),
        }),
      );
    },

    async registerDevice(row) {
      return scoped(row.shopId, async (sql) => {
        try {
          await sql.query(
            `INSERT INTO devices (id, user_id, shop_id, platform, created_at, last_seen_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [row.id, row.userId, row.shopId, row.platform, row.createdAt, row.lastSeenAt],
          );
        } catch (e) {
          translate(e);
        }
      });
    },

    async findDevice(id) {
      const res = await system.query('SELECT * FROM devices WHERE id = $1', [id]);
      const r = res.rows[0];
      if (!r) return null;
      const device: DeviceRow = {
        id: String(r.id),
        userId: String(r.user_id),
        shopId: String(r.shop_id),
        platform: String(r.platform),
        createdAt: iso(r.created_at),
        lastSeenAt: isoOrNull(r.last_seen_at),
        revokedAt: isoOrNull(r.revoked_at),
      };
      return device;
    },

    async listDevices(shopId) {
      return scoped(shopId, async (c) => {
        const res = await c.query('SELECT * FROM devices WHERE shop_id = $1 ORDER BY created_at DESC, id', [shopId]);
        return res.rows.map(
          (r): DeviceRow => ({
            id: String(r.id),
            userId: String(r.user_id),
            shopId: String(r.shop_id),
            platform: String(r.platform),
            createdAt: iso(r.created_at),
            lastSeenAt: isoOrNull(r.last_seen_at),
            revokedAt: isoOrNull(r.revoked_at),
          }),
        );
      });
    },

    async revokeDevice(shopId, id, at) {
      // Scoped AND predicated: RLS and the WHERE both refuse another shop's device (RT S4).
      return scoped(shopId, async (c) => {
        const res = await c.query(
          'UPDATE devices SET revoked_at = $3 WHERE id = $2 AND shop_id = $1 RETURNING id',
          [shopId, id, at],
        );
        return res.rows.length > 0;
      });
    },

    async rotateRefreshGen(shopId, id, tokenGen, nowIso) {
      // Scoped (RLS) AND predicated, like revokeDevice. One statement, so two racing
      // refreshes with the same token cannot both match `refresh_gen = $3`.
      return scoped(shopId, async (c) => {
        const since = new Date(Date.parse(nowIso) - REFRESH_GRACE_SECONDS * 1000).toISOString();
        // Normal (gen = g) or grace (gen = g + 1, rotated within the window, and the last rotation was not
        // itself a grace one: RT-W4-2, a second grace in a row is two parties, so it falls through to reuse). `refresh_graced` records
        // whether THIS rotation was a grace one (SET sees the old gen). One statement: the row lock
        // makes two racing grace retries serialise, and the second no longer matches.
        const res = await c.query(
          `UPDATE devices SET refresh_gen = refresh_gen + 1, refresh_rotated_at = $4::timestamptz,
                              refresh_graced = (refresh_gen <> $3)
            WHERE id = $2 AND shop_id = $1 AND revoked_at IS NULL
              AND (refresh_gen = $3 OR (refresh_gen = $3 + 1 AND refresh_rotated_at > $5::timestamptz
                                        AND NOT refresh_graced))
        RETURNING refresh_gen`,
          [shopId, id, tokenGen, nowIso, since],
        );
        const r = res.rows[0];
        if (r) return { kind: 'rotated' as const, gen: Number(r.refresh_gen) };
        const cur = (
          await c.query(
            'SELECT refresh_gen, refresh_graced, refresh_rotated_at FROM devices WHERE id = $2 AND shop_id = $1 AND revoked_at IS NULL',
            [shopId, id],
          )
        ).rows[0];
        const lost =
          cur &&
          cur.refresh_graced === true &&
          Number(cur.refresh_gen) === tokenGen + 2 &&
          cur.refresh_rotated_at !== null &&
          new Date(cur.refresh_rotated_at as string).getTime() > Date.parse(since);
        return lost ? { kind: 'lost_race' as const } : { kind: 'reuse' as const };
      });
    },

    async upsertDay(row) {
      return scoped(row.shopId, async (sql) => {
        try {
          await sql.query(
            `INSERT INTO days (shop_id, date, state, opening_cash, counted_cash,
                               difference_reason, closed_at, created_at, starts_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (shop_id, date) DO UPDATE SET
               state = EXCLUDED.state,
               opening_cash = COALESCE(EXCLUDED.opening_cash, days.opening_cash),
               counted_cash = COALESCE(EXCLUDED.counted_cash, days.counted_cash),
               difference_reason = COALESCE(EXCLUDED.difference_reason, days.difference_reason),
               closed_at = COALESCE(EXCLUDED.closed_at, days.closed_at)`,
            [
              row.shopId,
              row.date,
              row.state,
              row.openingCash,
              row.countedCash,
              row.differenceReason,
              row.closedAt,
              row.createdAt,
              // Written on INSERT only: the ON CONFLICT branch leaves it alone, so a
              // day keeps the boundary it was created under (decision 1).
              row.startsAt,
            ],
          );
        } catch (e) {
          translate(e);
        }
      });
    },

    async findDay(shopId, date) {
      return scoped(shopId, async (sql) => {
        const res = await sql.query('SELECT * FROM days WHERE shop_id = $1 AND date = $2', [
          shopId,
          date,
        ]);
        const r = res.rows[0];
        if (!r) return null;
        const row: DayRow = {
          shopId: String(r.shop_id),
          date: day(r.date),
          state: String(r.state) as DayRow['state'],
          openingCash: nullablePaise(r.opening_cash, 'openingCash'),
          countedCash: nullablePaise(r.counted_cash, 'countedCash'),
          differenceReason: r.difference_reason === null ? null : String(r.difference_reason),
          closedAt: isoOrNull(r.closed_at),
          startsAt: String(r.starts_at),
          createdAt: iso(r.created_at),
        };
        return row;
      });
    },

    async latestStartsAt(shopId) {
      return scoped(shopId, async (sql) => {
        const res = await sql.query(
          'SELECT starts_at FROM days WHERE shop_id = $1 ORDER BY date DESC LIMIT 1',
          [shopId],
        );
        return res.rows[0] ? String(res.rows[0].starts_at) : null;
      });
    },

    async appendEntry(shopId, entry) {
      return scoped(shopId, async (sql) => {
        return appendWith(sql, shopId, entry);
      });
    },

    /** ARCH-06 · see `open` above. The scope is marked dead when `fn` settles, so a promise that outlives it never reuses the released connection (RT-W3-4). */
    inScope(shopId, fn) {
      const cur = open.getStore();
      if (cur && !cur.dead && cur.shopId === shopId) return fn();
      return openScope(shopId, async (c) => {
        const scope = { shopId, c, dead: false };
        try {
          return await open.run(scope, fn);
        } finally {
          scope.dead = true;
        }
      });
    },

    /**
     * ARCH-08 · A PUSH'S ENTRIES IN O(1) ROUND TRIPS, AND O(bad rows) WHEN SOME ARE BAD.
     * UNVERIFIED-LOCAL (needs Postgres): repo-equivalence.spec.ts proves it in CI.
     *
     * One scoped transaction. Three reads classify every row at once (rows that already exist,
     * the party ids that are this shop's, the state of each day), then ONE set-based INSERT
     * writes every row that is certain to succeed.
     *  - A replay is answered from the read, with no write. A conflict, a foreign id, a closed
     *    day and a party that is not this shop's are refused from the same read, with the very
     *    errors the single-row path raises (they are built by the same helpers).
     *  - A second copy of an id inside the batch is compared in memory with the first.
     *  - Only rows nobody could classify (a malformed id, a day the shop does not have) take the
     *    per-row path, inside their own SAVEPOINT, at most MAX_PER_ROW of them per push.
     *  - If the set INSERT fails, it is BISECTED: each half is retried in a savepoint, so one bad
     *    row costs O(log n) statements, never O(n). A bad row is isolated when a one-row INSERT
     *    fails, and that failure is translated exactly as the single-row path translates it.
     *  - Work is capped (MAX_INSERT_ATTEMPTS, MAX_PER_ROW), so a shop cannot turn one push into a
     *    pool-starvation lever (RT-W3-2). Past a cap the push is NOT a whole-batch 503 (that livelocked
     *    the outbox: the same batch, resent for ever, RT-W3-8): every row already resolved keeps its
     *    outcome, and each still-unresolved row comes back as the retryable refusal `push_deferred`.
     *    The phone parks a refused row and asks again once per launch, so every push makes progress.
     */
    async appendEntries(shopId, batch) {
      if (batch.length === 0) return [];
      const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return scoped(shopId, async (c) => {
        const out: EntryOutcome[] = new Array(batch.length);
        const perRow = new Set<number>();
        const cand: number[] = [];
        batch.forEach((e, i) => {
          if (!UUID.test(e.id) || (e.partyId !== undefined && !UUID.test(e.partyId)) || (e.refersToEntryId !== undefined && !UUID.test(e.refersToEntryId))) {
            perRow.add(i); // malformed: the real path gives today's answer
          } else cand.push(i);
        });

        const existing = new Map<string, Record<string, unknown>>();
        const ownParties = new Set<string>();
        const days = new Map<string, string>();
        if (cand.length > 0) {
          const rows = await c.query('SELECT * FROM entries WHERE id = ANY($1::uuid[])', [cand.map((i) => batch[i]!.id)]);
          for (const r of rows.rows) existing.set(String(r.id).toLowerCase(), r);
          const partyIds = [...new Set(cand.map((i) => batch[i]!.partyId).filter((p): p is string => p !== undefined))];
          if (partyIds.length > 0) {
            const p = await c.query('SELECT id FROM parties WHERE shop_id = $1 AND id = ANY($2::uuid[])', [shopId, partyIds]);
            for (const r of p.rows) ownParties.add(String(r.id).toLowerCase());
          }
          const d = await c.query('SELECT date, state FROM days WHERE shop_id = $1 AND date = ANY($2::date[])', [
            shopId,
            [...new Set(cand.map((i) => batch[i]!.dayId))],
          ]);
          for (const r of d.rows) days.set(day(r.date), String(r.state));
        }

        const bulk: number[] = [];
        const firstOf = new Map<string, number>(); // id -> first index in this batch that is a candidate
        const dups: [number, number][] = []; // [duplicate index, first index]
        for (const i of cand) {
          const e = batch[i]!;
          const key = e.id.toLowerCase();
          // Same order as appendWith: the party check comes before anything else.
          if (e.partyId !== undefined && !ownParties.has(e.partyId.toLowerCase())) {
            out[i] = { error: partyNotInShop(e.partyId) };
            continue;
          }
          const r = existing.get(key);
          if (r) {
            if (String(r.shop_id) !== shopId) out[i] = { error: foreignEntry(e.id) };
            else if (sameEntry(rowToEntry(r), e)) out[i] = { inserted: false };
            else out[i] = { error: entryChanged(e.id) };
            continue;
          }
          if (firstOf.has(key)) {
            dups.push([i, firstOf.get(key)!]);
            continue;
          }
          const state = days.get(e.dayId);
          if (state === 'closed') {
            out[i] = { error: closedDayRefusal() }; // D7, from the same read; no statement needed
            continue;
          }
          if (state === undefined) {
            perRow.add(i); // no such day: the real path raises the FK refusal
            continue;
          }
          firstOf.set(key, i);
          bulk.push(i);
        }

        /* ---- the set INSERT, bisected on failure ---------------------------------- */
        const stored = new Set<string>();
        let attempts = 0;
        const insertSet = async (idx: number[]): Promise<void> => {
          if (idx.length === 0) return;
          if (++attempts > MAX_INSERT_ATTEMPTS) {
            for (const i of idx) out[i] = { error: pushDeferred() }; // out of budget: retry these later
            return;
          }
          const col = <T,>(f: (e: Entry) => T) => idx.map((i) => f(batch[i]!));
          await c.query('SAVEPOINT bulk_entries');
          try {
            const res = await c.query(
              `INSERT INTO entries (id, shop_id, day_id, section, amount, mode, party_id,
                                    due_date, label, corrects_day_id, created_at, source, refers_to_entry_id)
               SELECT u.id, $13::uuid, u.day_id, u.section, u.amount, u.mode, u.party_id,
                      u.due_date, u.label, u.corrects_day_id, u.created_at, u.source, u.refers_to_entry_id
                 FROM unnest($1::uuid[], $2::date[], $3::text[], $4::bigint[], $5::text[], $6::uuid[],
                             $7::date[], $8::text[], $9::date[], $10::timestamptz[], $11::text[], $12::uuid[])
                      AS u(id, day_id, section, amount, mode, party_id, due_date, label, corrects_day_id, created_at, source, refers_to_entry_id)
                WHERE NOT EXISTS (SELECT 1 FROM entries x WHERE x.id = u.id)
               ON CONFLICT (id) DO NOTHING
               RETURNING id`,
              [
                col((e) => e.id),
                col((e) => e.dayId),
                col((e) => e.section),
                col((e) => e.amount),
                col((e) => e.mode),
                col((e) => e.partyId ?? null),
                col((e) => e.dueDate ?? null),
                col((e) => e.label ?? null),
                col((e) => e.correctsDayId ?? null),
                col((e) => e.createdAt),
                col((e) => e.source ?? 'manual'),
                col((e) => e.refersToEntryId ?? null),
                shopId,
              ],
            );
            await c.query('RELEASE SAVEPOINT bulk_entries');
            for (const r of res.rows) stored.add(String(r.id).toLowerCase());
          } catch (e) {
            if (isInfraError(e)) throw e;
            await c.query('ROLLBACK TO SAVEPOINT bulk_entries');
            await c.query('RELEASE SAVEPOINT bulk_entries');
            if (idx.length === 1) {
              // One row, refused: this IS the single-row INSERT, so translate it as that path does.
              try {
                translate(e);
              } catch (refusal) {
                out[idx[0]!] = { error: refusal };
              }
              return;
            }
            const mid = idx.length >> 1;
            await insertSet(idx.slice(0, mid));
            await insertSet(idx.slice(mid));
          }
        };
        await insertSet(bulk);
        for (const i of bulk) {
          if (out[i] !== undefined) continue; // refused and isolated above
          // Not stored by us (another push won the id): re-decide it as the single-row path would.
          if (stored.delete(batch[i]!.id.toLowerCase())) out[i] = { inserted: true };
          else perRow.add(i);
        }

        /* ---- a second copy of an id: compare with the first, in memory ------------ */
        for (const [i, first] of dups) {
          const o = out[first];
          if (o && 'inserted' in o && o.inserted) {
            out[i] = sameEntry(batch[first]!, batch[i]!) ? { inserted: false } : { error: entryChanged(batch[i]!.id) };
          } else perRow.add(i);
        }

        for (const [n, i] of [...perRow].sort((x, y) => x - y).entries()) {
          if (n >= MAX_PER_ROW) {
            out[i] = { error: pushDeferred() };
            continue;
          }
          await c.query('SAVEPOINT row_entry');
          try {
            out[i] = await appendWith(c, shopId, batch[i]!);
            await c.query('RELEASE SAVEPOINT row_entry');
          } catch (e) {
            if (isInfraError(e)) throw e;
            await c.query('ROLLBACK TO SAVEPOINT row_entry');
            await c.query('RELEASE SAVEPOINT row_entry');
            out[i] = { error: e };
          }
        }
        return out;
      });
    },

    // EX-5: an event's legs on ONE connection in ONE transaction; any refusal rolls all back.
    async appendEvent(shopId, legs) {
      return scoped(shopId, async (c) => {
        let inserted = 0;
        for (const leg of legs) if ((await appendWith(c, shopId, leg)).inserted) inserted += 1;
        return { inserted, alreadyPresent: legs.length - inserted };
      });
    },

    async findEntry(shopId, id) {
      return scoped(shopId, async (sql) => {
        const res = await sql.query('SELECT * FROM entries WHERE shop_id = $1 AND id = $2', [shopId, id]);
        return res.rows[0] ? rowToEntry(res.rows[0]) : null;
      });
    },

    async entriesReferringTo(shopId, id) {
      return scoped(shopId, async (sql) => {
        const res = await sql.query(
          'SELECT * FROM entries WHERE shop_id = $1 AND refers_to_entry_id = $2 ORDER BY created_at, id',
          [shopId, id],
        );
        return res.rows.map(rowToEntry);
      });
    },

    async entriesFor(shopId, date) {
      return scoped(shopId, async (sql) => {
        const res = await sql.query(
          'SELECT * FROM entries WHERE shop_id = $1 AND day_id = $2 ORDER BY created_at, id',
          [shopId, date],
        );
        return res.rows.map(rowToEntry);
      });
    },

    async appendUpiConfirmation(shopId, c) {
      return scoped(shopId, async (sql) => {
        assertUuid(c.id, 'confirmation id');
        // Already confirmed - by this id or another - is a replay, not a conflict.
        const prior = await sql.query(
          'SELECT shop_id FROM upi_confirmations WHERE id = $1 OR (shop_id = $2 AND entry_id = $3)',
          [c.id, shopId, c.entryId],
        );
        if (prior.rows.some((r) => String(r.shop_id) === shopId)) return { inserted: false };
        if (prior.rows.length > 0) throw foreignEntry(c.id);
        // The constraint cannot see the entry's mode, so the rule is checked here.
        const e = (
          await sql.query('SELECT * FROM entries WHERE id = $1 AND shop_id = $2', [c.entryId, shopId])
        ).rows[0];
        if (!e || day(e.day_id) !== c.dayId || !isUpiReceipt(rowToEntry(e))) {
          throw notAUpiReceipt(c.entryId);
        }
        try {
          const res = await sql.query(
            `INSERT INTO upi_confirmations (id, shop_id, day_id, entry_id, batch_id, confirmed_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [c.id, shopId, c.dayId, c.entryId, c.batchId ?? null, c.confirmedAt],
          );
          if (res.rows.length === 0) {
            // Not inserted and not visible to this shop: the id is another shop's (C-01).
            const seen = await sql.query(
              'SELECT 1 FROM upi_confirmations WHERE id = $1 OR (shop_id = $2 AND entry_id = $3)',
              [c.id, shopId, c.entryId],
            );
            if (seen.rows.length === 0) throw foreignEntry(c.id);
          }
          return { inserted: res.rows.length === 1 };
        } catch (err) {
          return dayFactRefusal(err, c.dayId);
        }
      });
    },

    async appendAdjustment(shopId, a) {
      return scoped(shopId, async (sql) => {
        assertUuid(a.id, 'adjustment id');
        let inserted = false;
        try {
          const res = await sql.query(
            // `WHERE NOT EXISTS` for the reason given at `appendWith` (C-05): a replay into a
            // closed day must reach the comparison below, not the closed-day trigger.
            `INSERT INTO adjustments (id, shop_id, day_id, type, amount, created_at)
             SELECT $1::uuid, $2::uuid, $3::date, $4::text, $5::bigint, $6::timestamptz
              WHERE NOT EXISTS (SELECT 1 FROM adjustments WHERE id = $1::uuid)
             ON CONFLICT (id) DO NOTHING
             RETURNING id`,
            [a.id, shopId, a.dayId, a.type, a.amount, a.createdAt],
          );
          inserted = res.rows.length === 1;
        } catch (err) {
          dayFactRefusal(err, a.dayId);
        }
        if (!inserted) {
          const r = (await sql.query('SELECT * FROM adjustments WHERE id = $1', [a.id])).rows[0];
          // `!r`: under row-level security another shop's row is invisible, not foreign (C-01).
          if (!r || String(r.shop_id) !== shopId) throw foreignEntry(a.id);
          if (JSON.stringify(rowToAdjustment(r)) !== JSON.stringify(a)) throw adjustmentChanged(a.id);
        }
        return { inserted };
      });
    },

    async appendCreditLimit(shopId, l) {
      return scoped(shopId, async (sql) => {
        assertUuid(l.id, 'credit limit id');
        const prior = (await sql.query('SELECT * FROM party_credit_limits WHERE id = $1', [l.id])).rows[0];
        if (prior) {
          if (String(prior.shop_id) !== shopId) throw foreignEntry(l.id);
          /*
           * A replay is the same party and the same limit. `set_at` is compared
           * by neither: the phone stamps it with its own offset (DV-8) and the
           * database hands it back in UTC, so the same instant spells two ways.
           */
          const stored = rowToCreditLimit(prior);
          if (stored.partyId !== l.partyId || stored.limit !== l.limit) throw creditLimitChanged(l.id);
          return { inserted: false };
        }
        const p = (
          await sql.query('SELECT kind FROM parties WHERE id = $1 AND shop_id = $2', [l.partyId, shopId])
        ).rows[0];
        if (!p || String(p.kind) !== 'customer') throw creditLimitParty(l.partyId);
        const res = await sql.query(
          `INSERT INTO party_credit_limits (id, shop_id, party_id, limit_paise, set_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING
           RETURNING id`,
          [l.id, shopId, l.partyId, l.limit, l.setAt],
        );
        // Nothing inserted, and no prior row visible above: the id is another shop's (C-01).
        if (res.rows.length === 0) throw foreignEntry(l.id);
        return { inserted: true };
      });
    },

    async creditLimitsFor(shopId) {
      return scoped(shopId, async (sql) => {
        const res = await sql.query(
          'SELECT * FROM party_credit_limits WHERE shop_id = $1 ORDER BY set_at, id',
          [shopId],
        );
        return res.rows.map(rowToCreditLimit);
      });
    },

    async dayFactsFor(shopId, date) {
      return scoped(shopId, async (sql) => {
        const c = await sql.query(
          'SELECT * FROM upi_confirmations WHERE shop_id = $1 AND day_id = $2 ORDER BY confirmed_at, id',
          [shopId, date],
        );
        const a = await sql.query(
          'SELECT * FROM adjustments WHERE shop_id = $1 AND day_id = $2 ORDER BY created_at, id',
          [shopId, date],
        );
        return {
          upiConfirmations: c.rows.map(
            (r): UpiConfirmation => ({
              id: String(r.id),
              dayId: day(r.day_id),
              entryId: String(r.entry_id),
              ...(r.batch_id ? { batchId: String(r.batch_id) } : {}),
              confirmedAt: iso(r.confirmed_at),
            }),
          ),
          adjustments: a.rows.map(rowToAdjustment),
        };
      });
    },

    async appendItem(shopId, item) {
      return scoped(shopId, async (sql) => {
        assertUuid(item.id, 'item id');
        const res = await sql
          .query(
            `INSERT INTO items (id, shop_id, name, created_at) VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO NOTHING RETURNING id`,
            [item.id, shopId, item.name, item.createdAt],
          )
          .catch(translate);
        if (res.rows.length === 1) return { inserted: true };
        const r = (await sql.query('SELECT * FROM items WHERE id = $1', [item.id])).rows[0];
        if (!r || String(r.shop_id) !== shopId) throw foreignEntry(item.id);
        if (JSON.stringify(rowToItem(r)) !== JSON.stringify(item)) throw itemRowChanged('items', item.id);
        return { inserted: false };
      });
    },

    async itemsFor(shopId) {
      return scoped(shopId, async (sql) => {
        const res = await sql.query('SELECT * FROM items WHERE shop_id = $1 ORDER BY created_at, id', [shopId]);
        return res.rows.map(rowToItem);
      });
    },

    async appendItemLine(shopId, line) {
      return scoped(shopId, async (sql) => {
        assertUuid(line.id, 'item line id');
        const prior = (await sql.query('SELECT * FROM item_lines WHERE id = $1', [line.id])).rows[0];
        if (prior) {
          if (String(prior.shop_id) !== shopId) throw foreignEntry(line.id);
          if (JSON.stringify(rowToItemLine(prior)) !== JSON.stringify(line)) throw itemRowChanged('item_lines', line.id);
          return { inserted: false };
        }
        // The trigger and FKs refuse the same things; checked first so the refusal is named.
        if (line.itemId !== undefined) {
          const it = await sql.query('SELECT 1 FROM items WHERE id = $1 AND shop_id = $2', [line.itemId, shopId]);
          if (it.rows.length === 0) throw itemNotInShop(line.itemId);
        }
        const e = (await sql.query('SELECT * FROM entries WHERE id = $1 AND shop_id = $2', [line.entryId, shopId]))
          .rows[0];
        const siblings = await sql.query('SELECT * FROM item_lines WHERE shop_id = $1 AND entry_id = $2', [
          shopId,
          line.entryId,
        ]);
        try {
          assertLineFits(line, e ? rowToEntry(e) : undefined, siblings.rows.map(rowToItemLine));
        } catch (err) {
          throw lineDoesNotFit(line.id, (err as Error).message);
        }
        try {
          const res = await sql.query(
            `INSERT INTO item_lines (id, shop_id, day_id, entry_id, item_id, quantity, amount, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING RETURNING id`,
            [line.id, shopId, line.dayId, line.entryId, line.itemId ?? null, line.quantity, line.amount, line.createdAt],
          );
          // Nothing inserted, and no prior row visible above: the id is another shop's (C-01).
          if (res.rows.length === 0) throw foreignEntry(line.id);
          return { inserted: true };
        } catch (err) {
          if (err instanceof WriteRefused) throw err;
          const m = (err as { message?: string }).message ?? '';
          if (/PR-1/.test(m)) throw lineDoesNotFit(line.id, 'the item lines would come to more than the sale.');
          return dayFactRefusal(err, line.dayId);
        }
      });
    },

    async itemLinesFor(shopId) {
      return scoped(shopId, async (sql) => {
        const res = await sql.query('SELECT * FROM item_lines WHERE shop_id = $1 ORDER BY created_at, id', [shopId]);
        return res.rows.map(rowToItemLine);
      });
    },

    /**
     * C-12 · every day of this shop before `date`, with its state and nothing else: a
     * projection on the (shop_id, date) primary key, a few dozen small rows instead of
     * the whole ledger. The read fold uses it to find which days it can take from the
     * closed-day memo. UNVERIFIED-LOCAL (needs Postgres): see repo-equivalence.spec.ts.
     */
    async daysBefore(shopId, date) {
      return scoped(shopId, async (sql) => {
        const res = await sql.query(
          'SELECT date, state FROM days WHERE shop_id = $1 AND date < $2 ORDER BY date',
          [shopId, date],
        );
        return res.rows.map((r) => ({ date: day(r.date), state: String(r.state) as DayRow['state'] }));
      });
    },

    async entriesBefore(shopId, date) {
      return scoped(shopId, async (sql) => {
        const res = await sql.query(
          'SELECT * FROM entries WHERE shop_id = $1 AND day_id < $2 ORDER BY day_id, created_at, id',
          [shopId, date],
        );
        return res.rows.map(rowToEntry);
      });
    },

    async partiesFor(shopId) {
      return scoped(shopId, async (sql) => {
        const res = await sql.query('SELECT * FROM parties WHERE shop_id = $1 ORDER BY name', [
          shopId,
        ]);
        return res.rows.map(
          (r) =>
            ({
              id: String(r.id),
              kind: String(r.kind),
              name: String(r.name),
              ...(r.phone ? { phone: String(r.phone) } : {}),
              ...(r.default_due_days === null || r.default_due_days === undefined
                ? {}
                : { defaultDueDays: Number(r.default_due_days) }),
            }) as Party,
        );
      });
    },

    async upsertParty(shopId, party) {
      return scoped(shopId, async (sql) => {
        const p = party as Party & { phone?: string; defaultDueDays?: number };
        let written = false;
        try {
          /*
           * THE `WHERE parties.shop_id = $2` ON THE CONFLICT BRANCH IS A TENANCY
           * BOUNDARY, NOT AN OPTIMISATION.
           *
           * `parties.id` is a global `UUID PRIMARY KEY` - it is not scoped by
           * shop - so a conflict can land on a row belonging to somebody else.
           * Without the predicate, `DO UPDATE SET name = EXCLUDED.name` would
           * then rewrite ANOTHER SHOP'S customer name and phone number.
           *
           * It is reachable. Party ids are client-generated and arrive on the
           * sync push, so a client that sends an id it does not own gets a write
           * it should never have had. `shopOf()` cannot stop this: the shop it
           * returns is correct, and it is the id beside it that is foreign.
           * Row-Level Security would, except that the API never sets
           * `swafto.shop_id`, so that layer is currently inert (SEC-01). Each
           * layer has to hold on its own, and this is this layer holding.
           *
           * A foreign id matches no row and updates nothing. It used to return
           * as if it had succeeded, so the phone acked a party the server never
           * stored; it now throws `parties_tenancy`, and the sync route reports
           * it per row.
           */
          const res = await sql.query(
            `INSERT INTO parties (id, shop_id, kind, name, phone, default_due_days, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, now())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               phone = COALESCE(EXCLUDED.phone, parties.phone),
               default_due_days = COALESCE(EXCLUDED.default_due_days, parties.default_due_days)
             WHERE parties.shop_id = $2
             RETURNING id`,
            [p.id, shopId, p.kind, p.name, p.phone ?? null, p.defaultDueDays ?? null],
          );
          // No row back means the conflict landed on another shop's party and
          // the predicate refused it. That is now said, not swallowed.
          written = res.rows.length === 1;
        } catch (e) {
          // RLS refuses an ON CONFLICT DO UPDATE onto a row this shop cannot see (C-01).
          if ((e as { code?: string }).code === '42501') throw foreignParty(p.id);
          translate(e);
        }
        if (!written) throw foreignParty(p.id);
      });
    },

    async exportUser(userId) {
      const user = (await system.query('SELECT * FROM users WHERE id = $1', [userId])).rows[0];
      if (!user) return null;
      const shopId = String(user.shop_id);
      // The rest is the user's own shop: read it scoped, like any other shop read (C-01).
      return scoped(shopId, async (c) => {
        const of = async (
          table:
            | 'parties'
            | 'days'
            | 'entries'
            | 'devices'
            | 'upi_confirmations'
            | 'adjustments'
            | 'items'
            | 'item_lines'
            | 'party_credit_limits',
        ) => (await c.query('SELECT * FROM ' + table + ' WHERE shop_id = $1', [shopId])).rows;

        /*
         * C-07 · THE BILLING RECORDS ARE ABOUT THIS USER TOO, so the access right
         * (DPDP s.11) covers them. The Google purchase token is a bearer
         * credential for the subscription, so the export carries only its last
         * six characters - enough to match a receipt, useless to replay.
         */
        const purchases = (
          await c.query('SELECT * FROM plan_purchases WHERE shop_id = $1 ORDER BY bound_at', [shopId])
        ).rows;
        const states = (
          await c.query(
            `SELECT s.* FROM plan_purchase_states s
               JOIN plan_purchases p ON p.purchase_token = s.purchase_token
              WHERE p.shop_id = $1 ORDER BY s.fetched_at, s.id`,
            [shopId],
          )
        ).rows;
        const masked = (token: unknown) => '...' + String(token).slice(-6);
        const previews = (await c.query('SELECT * FROM plan_previews WHERE shop_id = $1', [shopId])).rows;

        return {
          user: rowToUser(user),
          shop: await repo.findShop(shopId),
          consents: await repo.consentsFor(userId),
          devices: await of('devices'),
          parties: await of('parties'),
          days: await of('days'),
          entries: await of('entries'),
          upiConfirmations: await of('upi_confirmations'),
          adjustments: await of('adjustments'),
          items: await of('items'),
          itemLines: await of('item_lines'),
          creditLimits: await of('party_credit_limits'),
          planPurchases: purchases.map((r) => ({
            purchaseToken: masked(r.purchase_token),
            productId: String(r.product_id),
            boundAt: iso(r.bound_at),
          })),
          planPurchaseStates: states.map((r) => ({
            purchaseToken: masked(r.purchase_token),
            googleState: String(r.google_state),
            expiresAt: isoOrNull(r.expires_at),
            autoRenewing: r.auto_renewing === true,
            basePlanId: r.base_plan_id === null ? null : String(r.base_plan_id),
            acknowledged: r.acknowledged === true,
            fetchedAt: iso(r.fetched_at),
            snapshot: String(r.snapshot),
          })),
          planPreviews: previews.map((r) => ({ startedAt: iso(r.started_at), endsAt: iso(r.ends_at) })),
        };
      });
    },

    async requestDeletion(shopId, at) {
      await sql.query('UPDATE shops SET deletion_requested_at = $2 WHERE id = $1', [shopId, at]);
    },

    async redactParty(shopId, partyId) {
      return scoped(shopId, async (sql) => {
        assertUuid(partyId, 'party id');
        const { rows } = await sql.query(
          'UPDATE parties SET name = $3, phone = NULL WHERE id = $2 AND shop_id = $1 RETURNING id',
          [shopId, partyId, ''],
        );
        return { redacted: rows.length > 0 };
      });
    },

    async cancelDeletion(shopId) {
      // `deleted_at IS NULL` because an erased shop does not come back.
      await sql.query(
        'UPDATE shops SET deletion_requested_at = NULL WHERE id = $1 AND deleted_at IS NULL',
        [shopId],
      );
    },

    async shopsDueForPurge(before) {
      const { rows } = await sql.query(
        'SELECT id FROM shops WHERE deletion_requested_at IS NOT NULL ' +
          'AND deleted_at IS NULL AND deletion_requested_at <= $1',
        [before],
      );
      return rows.map((r) => String(r.id));
    },

    async purgeShop(shopId, at) {
      /*
       * ONE TRANSACTION, WITH THE ERASURE FLAG SET LOCALLY.
       *
       * `SET LOCAL swafto.erasure` lives until the COMMIT and no longer, which
       * is what lets the append-only trigger tell an erasure from an accident.
       * Wrapping the whole thing also means a half-erased shop cannot exist: a
       * failure part-way rolls back to a shop that is entirely there, which is
       * a state somebody can retry, rather than one nobody can describe.
       *
       * ORDER IS THE REVERSE OF THE FOREIGN KEYS: entries, then days, then
       * parties; consents before users; users before the shop.
       */
      /*
       * EVERY STATEMENT BELOW RUNS ON ONE CONNECTION, which `transaction`
       * guarantees and a bare `sql.query` did not. Before that, against the
       * `pg.Pool` both production callers pass, the `SET LOCAL` could land on a
       * different backend from the DELETEs it exists to authorise - so the
       * append-only trigger refused them and the erasure this function performs
       * on behalf of a DPDP request silently did nothing. It worked in tests
       * only because they pass a single `pg.Client`.
       */
      try {
        await scoped(shopId, async (c) => {
          await c.query("SET LOCAL swafto.erasure = 'on'");
          /*
           * C-07 · THE BILLING RECORDS GO TOO - GC-REVIEW.
           *
           * Children before parents: a state references its purchase. What is
           * erased is the Google purchase token (a bearer credential for the
           * subscription), the stored Google snapshots, and the preview grant;
           * all three were left behind by the first version of this job, which
           * made the DPDP erasure incomplete. NOTHING is kept in this database
           * as a financial record. The choice is that the record a tax or GST
           * duty would require is Google Play's own (Play is the merchant of
           * record for Play Billing and issues the buyer's invoice; SWAFTO's
           * receipts are Play's payout reports), not these rows. If counsel
           * rules SWAFTO must hold its own, the change is a retention table
           * written BEFORE this delete - not keeping the token.
           */
          await c.query(
            'DELETE FROM plan_purchase_states WHERE purchase_token IN (SELECT purchase_token FROM plan_purchases WHERE shop_id = $1)',
            [shopId],
          );
          await c.query('DELETE FROM plan_purchases WHERE shop_id = $1', [shopId]);
          await c.query('DELETE FROM plan_previews WHERE shop_id = $1', [shopId]);
          // The day facts first: a confirmation references an entry.
          await c.query('DELETE FROM upi_confirmations WHERE shop_id = $1', [shopId]);
          await c.query('DELETE FROM adjustments WHERE shop_id = $1', [shopId]);
          // PR-1: a line references an entry and an item, so both go before either.
          await c.query('DELETE FROM item_lines WHERE shop_id = $1', [shopId]);
          await c.query('DELETE FROM items WHERE shop_id = $1', [shopId]);
          // Before parties: a limit references its party.
          await c.query('DELETE FROM party_credit_limits WHERE shop_id = $1', [shopId]);
          await c.query('DELETE FROM entries WHERE shop_id = $1', [shopId]);
          await c.query('DELETE FROM section_skips WHERE shop_id = $1', [shopId]);
          await c.query('DELETE FROM days WHERE shop_id = $1', [shopId]);
          await c.query('DELETE FROM parties WHERE shop_id = $1', [shopId]);
          await c.query(
            'DELETE FROM consents WHERE user_id IN (SELECT id FROM users WHERE shop_id = $1)',
            [shopId],
          );
          await c.query('DELETE FROM devices WHERE shop_id = $1', [shopId]);
          await c.query('DELETE FROM users WHERE shop_id = $1', [shopId]);
          /*
           * The shop ROW survives as a tombstone carrying its id and two
           * timestamps. Everything identifying is blanked. A hard delete would
           * leave nothing to show the erasure happened, and a fiduciary has to
           * be able to show that it did.
           */
          await c.query(
            `UPDATE shops SET deleted_at = $2, name = '', type = '', address = NULL, gstin = NULL
             WHERE id = $1`,
            [shopId, at],
          );
        });
      } catch (e) {
        translate(e);
      }
    },
  };

  // C-12: erasure and redaction drop the closed-day memo for the shop (closed-day-memo.ts).
  return evictingOnErasure(repo);
}
