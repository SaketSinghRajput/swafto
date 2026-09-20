/**
 * THE PORT, IN MEMORY. Real behaviour, no network.
 *
 * THIS IS NOT A MOCK AND THE DIFFERENCE MATTERS. A mock returns what the test told
 * it to return, so a route tested against one proves only that the route called a
 * function. This enforces the SAME REFUSALS the database enforces - a duplicate id
 * whose content differs, a write into a closed day, an entry for a day that does
 * not exist - and throws the same named error, so a route that passes here behaves
 * the same way against Postgres. `postgres-equivalence.spec.ts` is what keeps that
 * claim honest rather than merely stated.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. No transactions, no concurrency, no locking.
 * Those are properties of the real database, and pretending to have them here would
 * be inventing a guarantee.
 */
import type { Entry, IsoDate, Party } from '@swafto/formula-engine';
import {
  WriteRefused,
  type ConsentRow,
  type DayRow,
  type DeviceRow,
  type Repo,
  type ShopRow,
  type UserRow,
} from './port.ts';

const key = (shopId: string, date: string) => shopId + '|' + date;

export function memoryRepo(): Repo & { readonly dump: () => unknown } {
  const shops = new Map<string, ShopRow>();
  const users = new Map<string, UserRow>();
  const devices = new Map<string, DeviceRow>();
  const consents: ConsentRow[] = [];
  const days = new Map<string, DayRow>();
  const entries = new Map<string, Entry & { shopId: string }>();
  const parties = new Map<string, Party & { shopId: string }>();

  const strip = <T extends { shopId: string }>(row: T) => {
    const { shopId: _ignored, ...rest } = row;
    return rest;
  };

  return {
    async findUserByPhone(phone) {
      return [...users.values()].find((u) => u.phone === phone) ?? null;
    },

    async createShopAndUser({ shopId, userId, phone, shopName, language, now }) {
      if ([...users.values()].some((u) => u.phone === phone)) {
        throw new WriteRefused('users_phone_key', 'that phone already has an account');
      }
      const shop: ShopRow = {
        id: shopId,
        name: shopName,
        type: 'kirana',
        language,
        createdAt: now,
        deletionRequestedAt: null,
        deletedAt: null,
      };
      const user: UserRow = {
        id: userId,
        shopId,
        phone,
        name: null,
        createdAt: now,
        consentVersion: null,
        consentAt: null,
        consentLocale: null,
      };
      shops.set(shopId, shop);
      users.set(userId, user);
      return { shop, user };
    },

    async findShop(shopId) {
      return shops.get(shopId) ?? null;
    },

    async recordConsent(row) {
      // Append-only: a withdrawal is a new row, so the history stays readable.
      consents.push(row);
      const user = users.get(row.userId);
      if (user && row.granted) {
        users.set(row.userId, {
          ...user,
          consentVersion: row.noticeVersion,
          consentAt: row.at,
          consentLocale: row.locale,
        });
      }
    },

    async consentsFor(userId) {
      return consents.filter((c) => c.userId === userId);
    },

    async registerDevice(row) {
      devices.set(row.id, row);
    },

    async findDevice(id) {
      return devices.get(id) ?? null;
    },

    async revokeDevice(id, at) {
      const d = devices.get(id);
      if (d) devices.set(id, { ...d, revokedAt: at });
    },

    async upsertDay(row) {
      const existing = days.get(key(row.shopId, row.date));
      if (existing?.state === 'closed' && row.state !== 'closed') {
        throw new WriteRefused(
          'days_closed_guard',
          row.date + ' is closed. A closed day does not reopen; post a correction against today.',
        );
      }
      days.set(key(row.shopId, row.date), row);
    },

    async findDay(shopId, date) {
      return days.get(key(shopId, date)) ?? null;
    },

    async appendEntry(shopId, entry) {
      const existing = entries.get(entry.id);
      if (existing) {
        /*
         * The same id arriving twice is the NORMAL case - it is a replayed push.
         * The same id arriving with DIFFERENT content is not: that is an attempt to
         * edit an entry, which D1 forbids outright, and it must be loud.
         */
        const same = JSON.stringify(strip(existing)) === JSON.stringify(entry);
        if (!same) {
          throw new WriteRefused(
            'entries_append_only',
            'entry ' +
              entry.id +
              ' already exists with different content. Entries are append-only (D1): ' +
              'correct a mistake by appending a correction, never by changing what was typed.',
          );
        }
        return { inserted: false };
      }
      const day = days.get(key(shopId, entry.dayId));
      if (!day) {
        throw new WriteRefused(
          'entries_day_fk',
          'no day ' + entry.dayId + ' for this shop. An entry cannot precede its day.',
        );
      }
      if (day.state === 'closed') {
        throw new WriteRefused(
          'entries_closed_day',
          entry.dayId + ' is closed and its figures never move again.',
        );
      }
      entries.set(entry.id, { ...entry, shopId });
      return { inserted: true };
    },

    async entriesFor(shopId, date) {
      return [...entries.values()]
        .filter((e) => e.shopId === shopId && e.dayId === date)
        .map((e) => strip(e) as Entry);
    },

    async entriesBefore(shopId, date) {
      return [...entries.values()]
        .filter((e) => e.shopId === shopId && e.dayId < date)
        .map((e) => strip(e) as Entry);
    },

    async partiesFor(shopId) {
      return [...parties.values()].filter((p) => p.shopId === shopId).map((p) => strip(p) as Party);
    },

    async upsertParty(shopId, party) {
      parties.set(party.id, { ...party, shopId });
    },

    async exportUser(userId) {
      const user = users.get(userId);
      if (!user) return null;
      const shop = shops.get(user.shopId) ?? null;
      return {
        user,
        shop,
        consents: consents.filter((c) => c.userId === userId),
        devices: [...devices.values()].filter((d) => d.userId === userId),
        parties: [...parties.values()].filter((p) => p.shopId === user.shopId),
        days: [...days.values()].filter((d) => d.shopId === user.shopId),
        entries: [...entries.values()].filter((e) => e.shopId === user.shopId),
      };
    },

    async requestDeletion(shopId, at) {
      const shop = shops.get(shopId);
      if (shop) shops.set(shopId, { ...shop, deletionRequestedAt: at });
    },

    async purgeShop(shopId, at) {
      for (const [id, e] of entries) if (e.shopId === shopId) entries.delete(id);
      for (const [id, p] of parties) if (p.shopId === shopId) parties.delete(id);
      for (const [k, d] of days) if (d.shopId === shopId) days.delete(k);
      for (const [id, d] of devices) if (d.shopId === shopId) devices.delete(id);
      for (const [id, u] of users) {
        if (u.shopId === shopId) {
          users.delete(id);
          for (let i = consents.length - 1; i >= 0; i -= 1) {
            if (consents[i]!.userId === id) consents.splice(i, 1);
          }
        }
      }
      /*
       * The shop ROW survives as a tombstone carrying only its id and the two
       * timestamps. Everything identifying is gone. A hard delete of the row would
       * leave nothing to prove the erasure happened, and DPDP §1.5 asks a fiduciary
       * to be able to show that it did.
       */
      const shop = shops.get(shopId);
      if (shop) shops.set(shopId, { ...shop, deletedAt: at, name: '', type: '' });
    },

    /** For tests that need to assert on the whole store rather than one row. */
    dump: () => ({
      shops: [...shops.values()],
      users: [...users.values()],
      devices: [...devices.values()],
      consents: [...consents],
      days: [...days.values()],
      entries: [...entries.values()],
      parties: [...parties.values()],
    }),
  };
}
