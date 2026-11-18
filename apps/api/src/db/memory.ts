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
import {
  assertLineFits,
  isUpiReceipt,
  type Adjustment,
  type CreditLimit,
  type Entry,
  type IsoDate,
  type ItemLine,
  type Party,
  type ShopItem,
  type UpiConfirmation,
} from '@swafto/formula-engine';
import { evictingOnErasure } from './closed-day-memo.ts';
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
  notAUpiReceipt,
  REFRESH_GRACE_SECONDS,
  foreignEntry,
  foreignParty,
  partyNotInShop,
  refersToNotInShop,
  type ConsentRow,
  type DayRow,
  type DeviceRow,
  type EntryOutcome,
  type Repo,
  type ShopRow,
  type UserRow,
} from './port.ts';

const key = (shopId: string, date: string) => shopId + '|' + date;

export function memoryRepo(): Repo & { readonly dump: () => unknown } {
  return evictingOnErasure(memoryRepoUnwrapped());
}

function memoryRepoUnwrapped(): Repo & { readonly dump: () => unknown } {
  const shops = new Map<string, ShopRow>();
  const users = new Map<string, UserRow>();
  const devices = new Map<string, DeviceRow>();
  /** RT-10 · devices.refresh_gen. Absent = 0, the generation of a device that never refreshed. */
  const refreshGens = new Map<string, { gen: number; at: string | null; graced: boolean }>();
  const consents: ConsentRow[] = [];
  const days = new Map<string, DayRow>();
  const entries = new Map<string, Entry & { shopId: string }>();
  const parties = new Map<string, Party & { shopId: string }>();
  const confirmations = new Map<string, UpiConfirmation & { shopId: string }>();
  const adjustments = new Map<string, Adjustment & { shopId: string }>();
  const items = new Map<string, ShopItem & { shopId: string }>();
  const itemLines = new Map<string, ItemLine & { shopId: string }>();
  const creditLimits = new Map<string, CreditLimit & { shopId: string }>();

  /** D7 and the day FK, as the day-fact triggers enforce them. */
  const openDayOf = (shopId: string, date: string) => {
    const d = days.get(key(shopId, date));
    if (!d) throw dayFactNoDay(date);
    if (d.state === 'closed') throw dayFactClosed(date);
  };

  const strip = <T extends { shopId: string }>(row: T) => {
    const { shopId: _ignored, ...rest } = row;
    return rest;
  };

  /**
   * LOAD-TEST HONESTY (C-15). Entries are also indexed by shop and day. Without it
   * every read filtered the WHOLE global map by shop id, which is O(all shops'
   * entries) and made this twin the bottleneck of any load run - a cost Postgres
   * does not have (it has an index). Same answers, same order within a day.
   */
  const byShop = new Map<string, Map<string, (Entry & { shopId: string })[]>>();
  const indexEntry = (e: Entry & { shopId: string }) => {
    let shop = byShop.get(e.shopId);
    if (!shop) byShop.set(e.shopId, (shop = new Map()));
    const day = shop.get(e.dayId);
    if (day) day.push(e);
    else shop.set(e.dayId, [e]);
  };
  /** Every day-id of one shop: the index of `days`, for `latestStartsAt` and `daysBefore`. */
  const shopDays = new Map<string, Set<string>>();

  /** What `append` reads and writes: the live map, or an overlay for an all-or-nothing event. */
  type Book = Pick<Map<string, Entry & { shopId: string }>, 'get' | 'set'>;

  /** One entry into `book` - the live map, or a staged copy for an all-or-nothing event. */
  function append(book: Book, shopId: string, entry: Entry): { inserted: boolean } {
    // Postgres would refuse a non-UUID id with a driver error rather than a
    // clean refusal. Refusing it here keeps the two repositories honest.
    assertUuid(entry.id, 'entry id');
    const existing = book.get(entry.id);
    if (existing && existing.shopId !== shopId) throw foreignEntry(entry.id);
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
    // Postgres's FK refuses a party that does not exist; this also refuses
    // one that exists in another shop, which the FK alone does not.
    if (entry.partyId !== undefined && parties.get(entry.partyId)?.shopId !== shopId) {
      throw partyNotInShop(entry.partyId);
    }
    // EX-3: the composite FK (shop_id, refers_to_entry_id), as Postgres has it.
    if (entry.refersToEntryId !== undefined && book.get(entry.refersToEntryId)?.shopId !== shopId) {
      throw refersToNotInShop(entry.refersToEntryId);
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
    const row = { ...entry, shopId };
    book.set(entry.id, row);
    // The live map is indexed as it is written; an event's overlay is indexed on commit.
    if (book === (entries as Book)) indexEntry(row);
    return { inserted: true };
  }

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

    async renameShop(shopId, name) {
      const shop = shops.get(shopId);
      if (!shop || shop.deletedAt) return false;
      shops.set(shopId, { ...shop, name });
      return true;
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

    async listDevices(shopId) {
      return [...devices.values()]
        .filter((d) => d.shopId === shopId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },

    async revokeDevice(shopId, id, at) {
      const d = devices.get(id);
      if (!d || d.shopId !== shopId) return false;
      devices.set(id, { ...d, revokedAt: at });
      return true;
    },

    async rotateRefreshGen(shopId, id, tokenGen, nowIso) {
      const d = devices.get(id);
      if (!d || d.shopId !== shopId || d.revokedAt) return { kind: 'reuse' };
      const cur = refreshGens.get(id) ?? { gen: 0, at: null, graced: false };
      const recent = (): boolean =>
        cur.at !== null && Date.parse(nowIso) - Date.parse(cur.at) <= REFRESH_GRACE_SECONDS * 1000;
      const normal = cur.gen === tokenGen;
      const grace = cur.gen === tokenGen + 1 && recent() && !cur.graced; // RT-W4-2: not twice in a row
      if (normal || grace) {
        refreshGens.set(id, { gen: cur.gen + 1, at: nowIso, graced: grace });
        return { kind: 'rotated', gen: cur.gen + 1 };
      }
      return cur.graced && cur.gen === tokenGen + 2 && recent() ? { kind: 'lost_race' } : { kind: 'reuse' };
    },

    async upsertDay(row) {
      const existing = days.get(key(row.shopId, row.date));
      if (existing?.state === 'closed' && row.state !== 'closed') {
        throw new WriteRefused(
          'days_closed_guard',
          row.date + ' is closed. A closed day does not reopen; post a correction against today.',
        );
      }
      // Decision 1, as Postgres does it: the first write fixes the boundary.
      days.set(key(row.shopId, row.date), existing ? { ...row, startsAt: existing.startsAt } : row);
      let set = shopDays.get(row.shopId);
      if (!set) shopDays.set(row.shopId, (set = new Set()));
      set.add(row.date);
    },

    async findDay(shopId, date) {
      return days.get(key(shopId, date)) ?? null;
    },

    async latestStartsAt(shopId) {
      let newest: string | null = null;
      for (const d of shopDays.get(shopId) ?? []) if (newest === null || d > newest) newest = d;
      return newest === null ? null : (days.get(key(shopId, newest))?.startsAt ?? null);
    },

    async appendEntry(shopId, entry) {
      return append(entries, shopId, entry);
    },

    async inScope(_shopId, fn) {
      return fn();
    },

    async appendEntries(shopId, batch) {
      // The twin has no round trips to save: it IS the per-row semantics the Postgres batch must match.
      const out: EntryOutcome[] = [];
      for (const entry of batch) {
        try {
          out.push(append(entries, shopId, entry));
        } catch (error) {
          out.push({ error });
        }
      }
      return out;
    },

    async appendEvent(shopId, legs) {
      // All or nothing: every leg goes into a copy first, and only a copy that
      // took all of them is applied - what a rolled-back transaction does.
      const overlay = new Map<string, Entry & { shopId: string }>();
      const staged: Book = {
        get: (k) => overlay.get(k) ?? entries.get(k),
        set: (k, v) => overlay.set(k, v),
      };
      let inserted = 0;
      for (const leg of legs) if (append(staged, shopId, leg).inserted) inserted += 1;
      for (const [id, row] of overlay) {
        entries.set(id, row);
        indexEntry(row);
      }
      return { inserted, alreadyPresent: legs.length - inserted };
    },

    async findEntry(shopId, id) {
      const e = entries.get(id);
      return e && e.shopId === shopId ? (strip(e) as Entry) : null;
    },

    async entriesReferringTo(shopId, id) {
      return [...entries.values()]
        .filter((e) => e.shopId === shopId && e.refersToEntryId === id)
        .map((e) => strip(e) as Entry);
    },

    async entriesFor(shopId, date) {
      return (byShop.get(shopId)?.get(date) ?? []).map((e) => strip(e) as Entry);
    },

    async appendUpiConfirmation(shopId, c) {
      assertUuid(c.id, 'confirmation id');
      const prior = [...confirmations.values()].find(
        (x) => x.shopId === shopId && (x.id === c.id || x.entryId === c.entryId),
      );
      if (prior) return { inserted: false };
      if (confirmations.has(c.id)) throw foreignEntry(c.id);
      const e = entries.get(c.entryId);
      if (!e || e.shopId !== shopId || e.dayId !== c.dayId || !isUpiReceipt(e)) {
        throw notAUpiReceipt(c.entryId);
      }
      openDayOf(shopId, c.dayId);
      confirmations.set(c.id, { ...c, shopId });
      return { inserted: true };
    },

    async appendAdjustment(shopId, a) {
      assertUuid(a.id, 'adjustment id');
      const existing = adjustments.get(a.id);
      if (existing && existing.shopId !== shopId) throw foreignEntry(a.id);
      if (existing) {
        if (JSON.stringify(strip(existing)) !== JSON.stringify(a)) throw adjustmentChanged(a.id);
        return { inserted: false };
      }
      openDayOf(shopId, a.dayId);
      adjustments.set(a.id, { ...a, shopId });
      return { inserted: true };
    },

    async dayFactsFor(shopId, date) {
      return {
        upiConfirmations: [...confirmations.values()]
          .filter((c) => c.shopId === shopId && c.dayId === date)
          .map((c) => strip(c) as UpiConfirmation),
        adjustments: [...adjustments.values()]
          .filter((a) => a.shopId === shopId && a.dayId === date)
          .map((a) => strip(a) as Adjustment),
      };
    },

    async appendItem(shopId, item) {
      assertUuid(item.id, 'item id');
      const existing = items.get(item.id);
      if (existing && existing.shopId !== shopId) throw foreignEntry(item.id);
      if (existing) {
        if (JSON.stringify(strip(existing)) !== JSON.stringify(item)) throw itemRowChanged('items', item.id);
        return { inserted: false };
      }
      items.set(item.id, { ...item, shopId });
      return { inserted: true };
    },

    async itemsFor(shopId) {
      return [...items.values()].filter((i) => i.shopId === shopId).map((i) => strip(i) as ShopItem);
    },

    async appendItemLine(shopId, line) {
      assertUuid(line.id, 'item line id');
      const existing = itemLines.get(line.id);
      if (existing && existing.shopId !== shopId) throw foreignEntry(line.id);
      if (existing) {
        if (JSON.stringify(strip(existing)) !== JSON.stringify(line)) throw itemRowChanged('item_lines', line.id);
        return { inserted: false };
      }
      // The triggers and FKs, as Postgres has them: same-shop sale of the line's
      // day, an item on this shop's list, and never more than the sale.
      if (line.itemId !== undefined && items.get(line.itemId)?.shopId !== shopId) throw itemNotInShop(line.itemId);
      const sale = entries.get(line.entryId);
      try {
        assertLineFits(
          line,
          sale && sale.shopId === shopId ? (strip(sale) as Entry) : undefined,
          [...itemLines.values()].filter((l) => l.shopId === shopId),
        );
      } catch (e) {
        throw lineDoesNotFit(line.id, (e as Error).message);
      }
      openDayOf(shopId, line.dayId);
      itemLines.set(line.id, { ...line, shopId });
      return { inserted: true };
    },

    async itemLinesFor(shopId) {
      return [...itemLines.values()].filter((l) => l.shopId === shopId).map((l) => strip(l) as ItemLine);
    },

    async daysBefore(shopId, date) {
      return [...(shopDays.get(shopId) ?? [])]
        .filter((d) => d < date)
        .sort()
        .map((d) => ({ date: d as IsoDate, state: days.get(key(shopId, d))!.state }));
    },

    async entriesBefore(shopId, date) {
      const mine = byShop.get(shopId);
      if (!mine) return [];
      const out: Entry[] = [];
      for (const d of [...mine.keys()].filter((k) => k < date).sort()) {
        for (const e of mine.get(d)!) out.push(strip(e) as Entry);
      }
      return out;
    },

    async appendCreditLimit(shopId, l) {
      assertUuid(l.id, 'credit limit id');
      const existing = creditLimits.get(l.id);
      if (existing && existing.shopId !== shopId) throw foreignEntry(l.id);
      if (existing) {
        if (JSON.stringify(strip(existing)) !== JSON.stringify(l)) throw creditLimitChanged(l.id);
        return { inserted: false };
      }
      const p = parties.get(l.partyId);
      if (!p || p.shopId !== shopId || p.kind !== 'customer') throw creditLimitParty(l.partyId);
      creditLimits.set(l.id, { ...l, shopId });
      return { inserted: true };
    },

    async creditLimitsFor(shopId) {
      // Map iteration is insertion order, which is append order.
      return [...creditLimits.values()].filter((l) => l.shopId === shopId).map((l) => strip(l) as CreditLimit);
    },

    async partiesFor(shopId) {
      return [...parties.values()].filter((p) => p.shopId === shopId).map((p) => strip(p) as Party);
    },

    async upsertParty(shopId, party) {
      assertUuid(party.id, 'party id');

      /*
       * A PARTY ID IS GLOBAL, SO AN EXISTING ONE MAY NOT BE OURS.
       *
       * `parties.id` is a UUID PRIMARY KEY on both engines - it is not scoped
       * by shop. This used to be `parties.set(party.id, {...party, shopId})`
       * unconditionally, which did something worse than overwrite: it also
       * reassigned `shopId`, so a client that sent an id belonging to another
       * shop MOVED that shop's customer into its own, name, phone and all.
       *
       * Party ids arrive on the sync push and are chosen by the client, so
       * this was reachable from outside. `shopOf()` cannot catch it, because
       * the shop it returns is correct and it is the id beside it that is
       * foreign.
       *
       * The Postgres repository now carries `WHERE parties.shop_id = $2` on
       * its conflict branch, and this is the same rule: a foreign id writes
       * nothing, and is refused aloud. The two have to agree or repo-equivalence diverges, and the
       * memory repository is what nearly every route test runs against - so a
       * guard missing here is a guard missing from most of the suite.
       */
      const existing = parties.get(party.id);
      if (existing && existing.shopId !== shopId) throw foreignParty(party.id);

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
        upiConfirmations: [...confirmations.values()].filter((c) => c.shopId === user.shopId),
        adjustments: [...adjustments.values()].filter((a) => a.shopId === user.shopId),
        items: [...items.values()].filter((i) => i.shopId === user.shopId),
        itemLines: [...itemLines.values()].filter((l) => l.shopId === user.shopId),
        creditLimits: [...creditLimits.values()].filter((l) => l.shopId === user.shopId),
      };
    },

    async requestDeletion(shopId, at) {
      const shop = shops.get(shopId);
      if (shop) shops.set(shopId, { ...shop, deletionRequestedAt: at });
    },

    async redactParty(shopId, partyId) {
      assertUuid(partyId, 'party id');
      const party = parties.get(partyId);
      // Scoped by shop, like every other read: a party id from another shop is
      // simply not found, rather than found and refused.
      if (!party || party.shopId !== shopId) return { redacted: false };
      /*
       * The id stays and the entries keep pointing at it. Deleting the row
       * would orphan every line of the shopkeeper's own ledger, which is his
       * record rather than the customer's.
       */
      // `phone` is optional on Party, so it is REMOVED rather than nulled -
      // an absent key and a null are different things to an exactOptional type,
      // and the column is nullable underneath either way.
      const { phone: _removed, ...withoutPhone } = party;
      parties.set(partyId, { ...withoutPhone, name: '' });
      return { redacted: true };
    },

    async cancelDeletion(shopId) {
      const shop = shops.get(shopId);
      // A shop already erased does not come back; only a PENDING request clears.
      if (shop && !shop.deletedAt) shops.set(shopId, { ...shop, deletionRequestedAt: null });
    },

    async shopsDueForPurge(before) {
      return [...shops.values()]
        .filter((s) => s.deletionRequestedAt !== null && !s.deletedAt)
        .filter((s) => s.deletionRequestedAt! <= before)
        .map((s) => s.id);
    },

    async purgeShop(shopId, at) {
      for (const [id, c] of confirmations) if (c.shopId === shopId) confirmations.delete(id);
      for (const [id, a] of adjustments) if (a.shopId === shopId) adjustments.delete(id);
      for (const [id, l] of itemLines) if (l.shopId === shopId) itemLines.delete(id);
      for (const [id, i] of items) if (i.shopId === shopId) items.delete(id);
      for (const [id, l] of creditLimits) if (l.shopId === shopId) creditLimits.delete(id);
      for (const [id, e] of entries) if (e.shopId === shopId) entries.delete(id);
      byShop.delete(shopId);
      shopDays.delete(shopId);
      for (const [id, p] of parties) if (p.shopId === shopId) parties.delete(id);
      for (const [k, d] of days) if (d.shopId === shopId) days.delete(k);
      for (const [id, d] of devices) {
        if (d.shopId !== shopId) continue;
        devices.delete(id);
        refreshGens.delete(id);
      }
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
      upiConfirmations: [...confirmations.values()],
      adjustments: [...adjustments.values()],
      items: [...items.values()],
      itemLines: [...itemLines.values()],
      creditLimits: [...creditLimits.values()],
    }),
  };
}
