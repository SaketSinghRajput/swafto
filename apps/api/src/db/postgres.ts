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
import {
  WriteRefused,
  type ConsentRow,
  type DayRow,
  type DeviceRow,
  type Repo,
  type ShopRow,
  type UserRow,
} from './port.ts';
import {
  assertPaise,
  type Entry,
  type IsoDate,
  type Paise,
  type Party,
} from '@swafto/formula-engine';

/** The one statement shape a repository needs, so nothing here imports a driver. */
export interface SqlClient {
  query(sql: string, params?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
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
    throw new WriteRefused('trigger', e.message ?? 'the database refused it');
  }
  throw error;
}

export function pgRepo(sql: SqlClient): Repo {
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
    }) as Entry;

  const repo: Repo = {
    async findUserByPhone(phone) {
      const res = await sql.query('SELECT * FROM users WHERE phone = $1', [phone]);
      return res.rows[0] ? rowToUser(res.rows[0]) : null;
    },

    async createShopAndUser({ shopId, userId, phone, shopName, language, now }) {
      try {
        await sql.query(
          `INSERT INTO shops (id, name, type, language, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [shopId, shopName, 'kirana', language, now],
        );
        await sql.query(
          'INSERT INTO users (id, shop_id, phone, created_at) VALUES ($1, $2, $3, $4)',
          [userId, shopId, phone, now],
        );
      } catch (e) {
        translate(e);
      }
      const shop = await repo.findShop(shopId);
      const user = await repo.findUserByPhone(phone);
      if (!shop || !user) throw new Error('the rows just inserted are not readable');
      return { shop, user };
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
        await sql.query(
          `INSERT INTO consents (id, user_id, purpose, granted, notice_version, locale, at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [row.id, row.userId, row.purpose, row.granted, row.noticeVersion, row.locale, row.at],
        );
        // The user row carries the LATEST grant, for the notice check on sign-in.
        if (row.granted) {
          await sql.query(
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
      const res = await sql.query('SELECT * FROM consents WHERE user_id = $1 ORDER BY at ASC', [
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
      try {
        await sql.query(
          `INSERT INTO devices (id, user_id, shop_id, platform, created_at, last_seen_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [row.id, row.userId, row.shopId, row.platform, row.createdAt, row.lastSeenAt],
        );
      } catch (e) {
        translate(e);
      }
    },

    async findDevice(id) {
      const res = await sql.query('SELECT * FROM devices WHERE id = $1', [id]);
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

    async revokeDevice(id, at) {
      await sql.query('UPDATE devices SET revoked_at = $2 WHERE id = $1', [id, at]);
    },

    async upsertDay(row) {
      try {
        await sql.query(
          `INSERT INTO days (shop_id, date, state, opening_cash, counted_cash,
                             difference_reason, closed_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
          ],
        );
      } catch (e) {
        translate(e);
      }
    },

    async findDay(shopId, date) {
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
        createdAt: iso(r.created_at),
      };
      return row;
    },

    async appendEntry(shopId, entry) {
      /*
       * The same id arriving twice is the NORMAL case - a replayed push - so it
       * is ON CONFLICT DO NOTHING, and the row count says which it was. The same
       * id with DIFFERENT content is an attempt to edit an entry, which D1
       * forbids, so it is read back and compared rather than quietly ignored.
       */
      let inserted = false;
      try {
        const res = await sql.query(
          `INSERT INTO entries (id, shop_id, day_id, section, amount, mode, party_id,
                                due_date, label, corrects_day_id, created_at, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
          ],
        );
        inserted = res.rows.length === 1;
      } catch (e) {
        translate(e);
      }

      if (!inserted) {
        const existing = await sql.query('SELECT * FROM entries WHERE id = $1', [entry.id]);
        const r = existing.rows[0];
        if (r) {
          const stored = rowToEntry(r);
          if (stored.amount !== entry.amount || stored.section !== entry.section) {
            throw new WriteRefused(
              'entries_append_only',
              'entry ' +
                entry.id +
                ' already exists with different content. Entries are append-only (D1): ' +
                'correct a mistake by appending a correction, never by changing what was typed.',
            );
          }
        }
      }
      return { inserted };
    },

    async entriesFor(shopId, date) {
      const res = await sql.query(
        'SELECT * FROM entries WHERE shop_id = $1 AND day_id = $2 ORDER BY created_at, id',
        [shopId, date],
      );
      return res.rows.map(rowToEntry);
    },

    async entriesBefore(shopId, date) {
      const res = await sql.query(
        'SELECT * FROM entries WHERE shop_id = $1 AND day_id < $2 ORDER BY day_id, created_at, id',
        [shopId, date],
      );
      return res.rows.map(rowToEntry);
    },

    async partiesFor(shopId) {
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
    },

    async upsertParty(shopId, party) {
      const p = party as Party & { phone?: string; defaultDueDays?: number };
      try {
        await sql.query(
          `INSERT INTO parties (id, shop_id, kind, name, phone, default_due_days, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, now())
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             phone = COALESCE(EXCLUDED.phone, parties.phone),
             default_due_days = COALESCE(EXCLUDED.default_due_days, parties.default_due_days)`,
          [p.id, shopId, p.kind, p.name, p.phone ?? null, p.defaultDueDays ?? null],
        );
      } catch (e) {
        translate(e);
      }
    },

    async exportUser(userId) {
      const user = (await sql.query('SELECT * FROM users WHERE id = $1', [userId])).rows[0];
      if (!user) return null;
      const shopId = String(user.shop_id);
      const of = async (table: 'parties' | 'days' | 'entries' | 'devices') =>
        (await sql.query('SELECT * FROM ' + table + ' WHERE shop_id = $1', [shopId])).rows;

      return {
        user: rowToUser(user),
        shop: await repo.findShop(shopId),
        consents: await repo.consentsFor(userId),
        devices: await of('devices'),
        parties: await of('parties'),
        days: await of('days'),
        entries: await of('entries'),
      };
    },

    async requestDeletion(shopId, at) {
      await sql.query('UPDATE shops SET deletion_requested_at = $2 WHERE id = $1', [shopId, at]);
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
      try {
        await sql.query('BEGIN');
        await sql.query("SET LOCAL swafto.erasure = 'on'");
        await sql.query('DELETE FROM entries WHERE shop_id = $1', [shopId]);
        await sql.query('DELETE FROM section_skips WHERE shop_id = $1', [shopId]);
        await sql.query('DELETE FROM days WHERE shop_id = $1', [shopId]);
        await sql.query('DELETE FROM parties WHERE shop_id = $1', [shopId]);
        await sql.query(
          'DELETE FROM consents WHERE user_id IN (SELECT id FROM users WHERE shop_id = $1)',
          [shopId],
        );
        await sql.query('DELETE FROM devices WHERE shop_id = $1', [shopId]);
        await sql.query('DELETE FROM users WHERE shop_id = $1', [shopId]);
        /*
         * The shop ROW survives as a tombstone carrying its id and two
         * timestamps. Everything identifying is blanked. A hard delete would
         * leave nothing to show the erasure happened, and a fiduciary has to be
         * able to show that it did.
         */
        await sql.query(
          `UPDATE shops SET deleted_at = $2, name = '', type = '', address = NULL, gstin = NULL
           WHERE id = $1`,
          [shopId, at],
        );
        await sql.query('COMMIT');
      } catch (e) {
        await sql.query('ROLLBACK');
        translate(e);
      }
    },
  };

  return repo;
}
