/**
 * THE SQLITE PORT - W4. Before this, `memoryPort` was the only port and a
 * process kill lost the day, including a day already closed.
 *
 * IT TAKES A DATABASE RATHER THAN OPENING ONE. `Db` is the one method both
 * engines share: op-sqlite's `executeSync` on the phone, and a three-line
 * wrapper over Node's built-in `node:sqlite` in the test, which opens a
 * SECOND port over the same file to prove a restart keeps what was written.
 *
 * WHAT IS STORED IS WHAT WAS TYPED. Days, entries, parties and the outbox,
 * each row the JSON of the record the store already holds. No totals: the
 * carried credit and supplier figures for a new day are DERIVED on load from
 * every earlier entry, through the engine's own P7/P8, so there is no second
 * copy of a balance to disagree with the entries.
 */
import {
  businessDate,
  creditOutstanding,
  dayHasEnded,
  MIDNIGHT,
  supplierOutstanding,
  type DayRecord,
  type Adjustment,
  type DayStart,
  type Entry,
  type UpiConfirmation,
  type ItemLine,
  type ShopItem,
  type Party,
  type CreditLimit,
} from '@swafto/formula-engine';
import {
  isSentVersion,
  type HeldCorrection,
  type OutboxRow,
  type PersistencePort,
  type StoreState,
} from './index.ts';

export interface Db {
  executeSync(sql: string, params?: readonly unknown[]): { rows: readonly Record<string, unknown>[] };
}

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS day (date TEXT PRIMARY KEY, json TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS entry (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, day_id TEXT NOT NULL, json TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS party (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, json TEXT NOT NULL)',
  // FE-11: parked_reason set = the server refused this row; it is not re-sent until unparked.
  'CREATE TABLE IF NOT EXISTS outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, json TEXT NOT NULL, parked_reason TEXT, parked_at TEXT)',
  'CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)',
  // Decisions 2 and 3: the day facts, each its own row (D1). UNIQUE(entry_id)
  // means a receipt is confirmed once, by construction.
  'CREATE TABLE IF NOT EXISTS upi_confirmation (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, day_id TEXT NOT NULL, entry_id TEXT NOT NULL UNIQUE, json TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS adjustment (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, day_id TEXT NOT NULL, json TEXT NOT NULL)',
  // PR-1 (Premium): his item list, and item lines of a sale - each its own row (D1).
  'CREATE TABLE IF NOT EXISTS item (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, json TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS item_line (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, day_id TEXT NOT NULL, entry_id TEXT NOT NULL, json TEXT NOT NULL)',
  // R5 FR-6: a party fact, append-only; the newest row for a party is in force.
  'CREATE TABLE IF NOT EXISTS credit_limit (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, party_id TEXT NOT NULL, json TEXT NOT NULL)',
];

/**
 * FE-11 on an EXISTING install. An outbox created before parking has no
 * `parked_reason` column, and one from the first parking build has a separate
 * `outbox_parked` table. Probe with a SELECT (works on both engines; PRAGMA
 * results do not), add the columns, fold any parked rows in, drop the table.
 * One transaction: a kill leaves the old shape intact and this runs again.
 */
function migrateParking(db: Db, now: string): void {
  let hasColumn = true;
  try {
    db.executeSync('SELECT parked_reason FROM outbox LIMIT 0');
  } catch {
    hasColumn = false;
  }
  let hasOldTable = true;
  try {
    db.executeSync('SELECT id FROM outbox_parked LIMIT 0');
  } catch {
    hasOldTable = false;
  }
  if (hasColumn && !hasOldTable) return;
  tx(db, () => {
    if (!hasColumn) {
      db.executeSync('ALTER TABLE outbox ADD COLUMN parked_reason TEXT');
      db.executeSync('ALTER TABLE outbox ADD COLUMN parked_at TEXT');
    }
    if (hasOldTable) {
      db.executeSync(
        'UPDATE outbox SET parked_reason = (SELECT p.reason FROM outbox_parked p WHERE p.id = outbox.id AND p.json = outbox.json), parked_at = ? WHERE EXISTS (SELECT 1 FROM outbox_parked p WHERE p.id = outbox.id AND p.json = outbox.json)',
        [now],
      );
      db.executeSync('DROP TABLE outbox_parked');
    }
  });
}

const rows = <T>(db: Db, sql: string, params: readonly unknown[] = []): T[] =>
  db.executeSync(sql, params).rows.map((r) => JSON.parse(String(r.json)) as T);

/** All or nothing. A failure rolls back and rethrows - never a half-write. */
function tx(db: Db, write: () => void): void {
  db.executeSync('BEGIN');
  try {
    write();
    db.executeSync('COMMIT');
  } catch (e) {
    db.executeSync('ROLLBACK');
    throw e;
  }
}

const freshDay = (date: string, openingCash: number | null, startsAt: DayStart): DayRecord => ({
  date,
  startsAt,
  state: 'open',
  openingCash,
  countedCash: null,
  skippedSections: [],
});

/**
 * `wallClock` is the phone's LOCAL time (`localIso`), and the port turns it into a
 * business date through the engine (decision 1). A bare 'YYYY-MM-DD' is taken as
 * the business date itself, which is what the tests that predate the setting pass.
 */
export function sqlitePort(db: Db, wallClock: () => string, shopId = 'pending-sign-in'): PersistencePort {
  for (const sql of SCHEMA) db.executeSync(sql);
  migrateParking(db, wallClock());

  const putEntry = (entry: Entry) =>
    db.executeSync('INSERT INTO entry (id, day_id, json) VALUES (?, ?, ?)', [entry.id, entry.dayId, JSON.stringify(entry)]);

  const putOutbox = (row: OutboxRow) =>
    db.executeSync('INSERT OR REPLACE INTO outbox (id, json) VALUES (?, ?)', [row.id, JSON.stringify(row)]);

  return {
    appendAtomically(entry, row) {
      tx(db, () => {
        putEntry(entry);
        putOutbox(row);
      });
    },

    // EX-6: every leg of one event in ONE transaction - a kill between legs leaves none.
    appendEvent(entries, outbox) {
      tx(db, () => {
        for (const entry of entries) putEntry(entry);
        for (const row of outbox) putOutbox(row);
      });
    },

    findEntry: (id) => rows<Entry>(db, 'SELECT json FROM entry WHERE id = ?', [id])[0],

    /*
     * BY JSON PATH, NOT A NEW COLUMN. A row is the JSON of what was typed, and
     * `json_extract` is in every SQLite this ships on (JSON1 is built in since
     * 3.38). A column would need an ALTER on every phone already in the field.
     * ponytail: unindexed scan of the entry table; add an expression index on
     * json_extract(json, '$.refersToEntryId') when a shop's book makes it slow.
     */
    entriesReferringTo: (id) =>
      rows<Entry>(db, "SELECT json FROM entry WHERE json_extract(json, '$.refersToEntryId') = ? ORDER BY seq", [id]),

    recentEntries: (sections, limit) =>
      rows<Entry>(
        db,
        `SELECT json FROM entry WHERE json_extract(json, '$.section') IN (${sections.map(() => '?').join(', ')}) ORDER BY seq DESC LIMIT ?`,
        [...sections, limit],
      ),

    putHeldCorrections(held) {
      db.executeSync("INSERT OR REPLACE INTO meta (k, v) VALUES ('heldCorrections', ?)", [JSON.stringify(held)]);
    },

    putDay(day, row) {
      tx(db, () => {
        db.executeSync('INSERT OR REPLACE INTO day (date, json) VALUES (?, ?)', [day.date, JSON.stringify(day)]);
        // A day row replaces its pending self - same rule as memoryPort.
        putOutbox(row);
      });
    },

    putParty(party, row) {
      tx(db, () => {
        // HT-43: the same id again is the same party with a phone added; seq is kept.
        db.executeSync('INSERT INTO party (id, json) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json', [
          party.id,
          JSON.stringify(party),
        ]);
        putOutbox(row);
      });
    },

    appendUpiConfirmations(cs, outboxRows) {
      tx(db, () => {
        for (const c of cs) {
          db.executeSync('INSERT INTO upi_confirmation (id, day_id, entry_id, json) VALUES (?, ?, ?, ?)', [
            c.id,
            c.dayId,
            c.entryId,
            JSON.stringify(c),
          ]);
        }
        for (const row of outboxRows) putOutbox(row);
      });
    },

    appendAdjustment(a, row) {
      tx(db, () => {
        db.executeSync('INSERT INTO adjustment (id, day_id, json) VALUES (?, ?, ?)', [
          a.id,
          a.dayId,
          JSON.stringify(a),
        ]);
        putOutbox(row);
      });
    },

    putItem(item, row) {
      tx(db, () => {
        db.executeSync('INSERT INTO item (id, json) VALUES (?, ?)', [item.id, JSON.stringify(item)]);
        putOutbox(row);
      });
    },

    appendItemLine(line, row) {
      tx(db, () => {
        db.executeSync('INSERT INTO item_line (id, day_id, entry_id, json) VALUES (?, ?, ?, ?)', [
          line.id,
          line.dayId,
          line.entryId,
          JSON.stringify(line),
        ]);
        putOutbox(row);
      });
    },

    appendCreditLimit(l, row) {
      tx(db, () => {
        db.executeSync('INSERT INTO credit_limit (id, party_id, json) VALUES (?, ?, ?)', [
          l.id,
          l.partyId,
          JSON.stringify(l),
        ]);
        putOutbox(row);
      });
    },

    putShopName(name) {
      db.executeSync("INSERT OR REPLACE INTO meta (k, v) VALUES ('shopName', ?)", [name]);
    },

    putDayStart(startsAt) {
      db.executeSync("INSERT OR REPLACE INTO meta (k, v) VALUES ('dayStartsAt', ?)", [startsAt]);
    },

    load(): StoreState {
      const latest = rows<DayRecord>(db, 'SELECT json FROM day ORDER BY date DESC LIMIT 1')[0];
      const setting = db.executeSync("SELECT v FROM meta WHERE k = 'dayStartsAt'").rows[0]?.v;
      const startsAt: DayStart = setting === undefined ? MIDNIGHT : String(setting);
      const wall = wallClock();
      // The business date a day opened NOW would carry, under today's setting.
      const date = businessDate(wall, startsAt);
      /*
       * WHICH DAY IS OPEN. An open day stays the day until he closes it, even
       * past midnight - a business day is the shop's, not the calendar's
       * (2026-10-22, decision 1). Only a CLOSED day rolls over, and the new one
       * opens on yesterday's COUNTED cash, never the expected figure (D6).
       *
       * A CUTOVER, NOT A MIGRATION. A closed day gives way only once it has
       * ended BY ITS OWN RULE (`startsAt`, or '00:00' for a day recorded before
       * the setting existed) and the new business date is later than it. The
       * shop's setting picks the new day's date and is stamped on it; it never
       * reaches back into a day already in the book.
       */
      /*
       * C-19: A CLOSED DAY DATED AFTER THE CLOCK. The phone's clock went
       * forward, a day was closed under it, and the clock was corrected. That
       * closed day is frozen (D7) and stays exactly as recorded - but the book
       * lives on the REAL business date. (Opening the day AFTER it kept the book
       * on a fictitious calendar, and the server, which refuses days beyond
       * today+1, parked every row of it.) So the working day is the newest day
       * that is not in the future, or a new one on today's date carrying the
       * misdated day's counted cash. The misdated day's date is reported
       * (`misdatedDate`) so Today can say so; its entries still count toward
       * the carried credit and supplier figures.
       */
      const misdated = latest !== undefined && latest.state === 'closed' && latest.date > date ? latest : undefined;
      const base = misdated
        ? rows<DayRecord>(db, 'SELECT json FROM day WHERE date <= ? ORDER BY date DESC LIMIT 1', [date])[0]
        : latest;
      const day =
        base === undefined
          ? freshDay(date, misdated?.countedCash ?? null, startsAt)
          : base.state === 'closed' && dayHasEnded(base, wall) && base.date < date
            ? freshDay(date, (misdated ?? base).countedCash, startsAt)
            : base;

      const earlier = rows<Entry>(db, 'SELECT json FROM entry WHERE day_id < ? ORDER BY seq', [day.date]);
      /*
       * C-19 RESIDUAL. One day per date is a LIMIT of the model (`day.date` is the
       * primary key here, and the server's day row is unique per date too). When
       * the real calendar later REACHES a date that was closed under a wrong
       * clock, that closed day is today's book and cannot be reopened (D7) nor
       * doubled. So the misdated date is REMEMBERED (meta) the moment it is seen,
       * and Today says why entries wait until tomorrow instead of refusing
       * silently. DECISION 1's day_id migration must lift this one-day-per-date
       * limit; until then this is the safe, loss-free behaviour (reversible).
       */
      let marked: string[] = [];
      const markedRaw = db.executeSync("SELECT v FROM meta WHERE k = 'misdatedDates'").rows[0]?.v;
      if (markedRaw !== undefined) {
        try {
          marked = JSON.parse(String(markedRaw)) as string[];
        } catch {
          marked = [];
        }
      }
      if (misdated && !marked.includes(misdated.date)) {
        marked = [...marked, misdated.date];
        db.executeSync("INSERT OR REPLACE INTO meta (k, v) VALUES ('misdatedDates', ?)", [JSON.stringify(marked)]);
      }
      const everyOther = misdated ? rows<Entry>(db, 'SELECT json FROM entry WHERE day_id <> ? ORDER BY seq', [day.date]) : earlier;
      const carried = { day, entries: everyOther, priorCreditOutstanding: 0, priorSupplierOutstanding: 0 };
      const name = db.executeSync("SELECT v FROM meta WHERE k = 'shopName'").rows[0]?.v;
      const held = db.executeSync("SELECT v FROM meta WHERE k = 'heldCorrections'").rows[0]?.v;

      return {
        shopId,
        day,
        entries: rows<Entry>(db, 'SELECT json FROM entry WHERE day_id = ? ORDER BY seq', [day.date]),
        parties: rows<Party>(db, 'SELECT json FROM party ORDER BY seq'),
        adjustments: rows<Adjustment>(db, 'SELECT json FROM adjustment WHERE day_id = ? ORDER BY seq', [day.date]),
        upiConfirmations: rows<UpiConfirmation>(
          db,
          'SELECT json FROM upi_confirmation WHERE day_id = ? ORDER BY seq',
          [day.date],
        ),
        priorCreditOutstanding: creditOutstanding(carried).value,
        priorSupplierOutstanding: supplierOutstanding(carried).value,
        skippedSections: day.skippedSections,
        ...(misdated ? { misdatedDate: misdated.date } : {}),
        ...(day.state === 'closed' && marked.includes(day.date) ? { closedUnderWrongDate: true } : {}),
        ...(name === undefined ? {} : { shopName: String(name) }),
        ...(setting === undefined ? {} : { dayStartsAt: startsAt }),
        // For Reports: what was typed on earlier days, read once here. No totals.
        pastDays: rows<DayRecord>(db, 'SELECT json FROM day WHERE date < ? ORDER BY date', [day.date]),
        pastEntries: earlier,
        pastAdjustments: rows<Adjustment>(db, 'SELECT json FROM adjustment WHERE day_id < ? ORDER BY seq', [day.date]),
        pastUpiConfirmations: rows<UpiConfirmation>(
          db,
          'SELECT json FROM upi_confirmation WHERE day_id < ? ORDER BY seq',
          [day.date],
        ),
        // PR-1: the whole list and every line, every day - PR-2 reads history.
        items: rows<ShopItem>(db, 'SELECT json FROM item ORDER BY seq'),
        itemLines: rows<ItemLine>(db, 'SELECT json FROM item_line ORDER BY seq'),
        creditLimits: rows<CreditLimit>(db, 'SELECT json FROM credit_limit ORDER BY seq'),
        ...(held === undefined ? {} : { heldCorrections: JSON.parse(String(held)) as HeldCorrection[] }),
      };
    },

    pendingOutbox: () => rows<OutboxRow>(db, 'SELECT json FROM outbox WHERE parked_reason IS NULL ORDER BY seq'),

    parkOutbox(refused) {
      tx(db, () => {
        for (const r of refused) {
          db.executeSync('UPDATE outbox SET parked_reason = ?, parked_at = ? WHERE id = ?', [r.reason, wallClock(), r.id]);
        }
      });
    },

    parkedOutbox: () =>
      db
        .executeSync('SELECT id, parked_reason FROM outbox WHERE parked_reason IS NOT NULL ORDER BY seq')
        .rows.map((r) => ({ id: String(r.id), reason: String(r.parked_reason) })),

    unparkOutbox() {
      db.executeSync('UPDATE outbox SET parked_reason = NULL, parked_at = NULL WHERE parked_reason IS NOT NULL');
    },

    ackOutbox(ids, sent) {
      tx(db, () => {
        for (const row of rows<OutboxRow>(db, 'SELECT json FROM outbox ORDER BY seq')) {
          if (ids.includes(row.id) && isSentVersion(row, sent)) {
            db.executeSync('DELETE FROM outbox WHERE id = ?', [row.id]);
          }
        }
      });
    },

    /*
     * `meta` too: it holds the shop name AND, through storage.tsx, the session
     * tokens and the account record. A deletion that left them would leave the
     * phone signed in to the account it just asked to erase.
     */
    eraseAll() {
      tx(db, () => {
        for (const table of ['item_line', 'item', 'upi_confirmation', 'adjustment', 'credit_limit', 'entry', 'day', 'party', 'outbox', 'meta']) db.executeSync('DELETE FROM ' + table);
      });
    },
  };
}
