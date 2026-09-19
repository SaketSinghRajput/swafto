/**
 * CP-4 · The lost-phone scenario. Two devices on one shop, created by our OWN
 * recovery flow rather than by anything D9 permits.
 *
 * I recorded CP-4 as latent and deferred it to D9's reversal trigger. That was wrong:
 * I checked whether D9 ALLOWS two devices and concluded no, without checking whether
 * the number-change flow CREATES them. It does.
 *
 *   - The OLD handset is lost. It holds a session that BY DESIGN never expires, and
 *     an outbox that may contain days of unsynced entries.
 *   - The shopkeeper recovers his account on a NEW handset through the "I don't have
 *     my old number" path, and carries on trading.
 *   - Weeks later a repair shop powers the old phone on. It syncs.
 *
 * Its outbox lands on a shop that has moved on, into days that are now closed.
 * Without a guard, A CLOSED DAY'S FIGURES COULD MOVE - a correctness defect at
 * priority 1 and a direct violation of constraint 3.
 *
 * This is testable today. It needs no concurrent-edit machinery: the sequence is
 * strictly ordered and one device is revoked. The only question is what happens to
 * what it carries.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migrationUp } from '../src/spec.ts';

const SHOP = '00000000-0000-7000-8000-000000000001';
const USER = '00000000-0000-7000-8000-0000000000a1';
const OLD_DEVICE = '00000000-0000-7000-8000-00000000d01d';
const NEW_DEVICE = '00000000-0000-7000-8000-00000000d02e';
const CLOSED_DAY = '2026-07-12';
const OPEN_DAY = '2026-07-15';
const NOW = '2026-07-15T10:00:00.000Z';

let db: DatabaseSync;
let n = 0;
const uid = () => `01890000-0000-7000-8000-${String(++n).padStart(12, '0')}`;

beforeEach(() => {
  n = 0;
  db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const s of migrationUp('sqlite')) db.exec(s);

  db.exec(`INSERT INTO shops (id, name, type, language, created_at)
           VALUES ('${SHOP}', 'Test Store', 'kirana', 'en', '${NOW}')`);
  // The day the shopkeeper closed on his NEW phone, while the old one was lost.
  db.exec(`INSERT INTO days (shop_id, date, state, opening_cash, counted_cash, closed_at, created_at)
           VALUES ('${SHOP}', '${CLOSED_DAY}', 'closed', 150000, 605000, '${NOW}', '${NOW}')`);
  db.exec(`INSERT INTO days (shop_id, date, state, opening_cash, created_at)
           VALUES ('${SHOP}', '${OPEN_DAY}', 'open', 605000, '${NOW}')`);
});

function insertEntry(dayId: string, amount: number, deviceId: string, corrects?: string) {
  const cols = `id, shop_id, day_id, section, amount, mode, created_at, source, device_id${corrects ? ', corrects_day_id' : ''}`;
  const vals = `'${uid()}', '${SHOP}', '${dayId}', 'cash_sales', ${amount}, 'cash', '${NOW}', 'manual', '${deviceId}'${corrects ? `, '${corrects}'` : ''}`;
  db.exec(`INSERT INTO entries (${cols}) VALUES (${vals})`);
}

describe('CP-4 · a late-arriving outbox cannot move a closed day', () => {
  it('REJECTS an entry whose own day is closed, whatever device sent it', () => {
    expect(() => insertEntry(CLOSED_DAY, 50000, OLD_DEVICE)).toThrow(/that day is closed/);
  });

  it('leaves the closed day BYTE-IDENTICAL after the rejected sync', () => {
    const before = db
      .prepare(`SELECT * FROM days WHERE shop_id = ? AND date = ?`)
      .get(SHOP, CLOSED_DAY);
    const totalBefore = db
      .prepare(`SELECT coalesce(sum(amount),0) AS t FROM entries WHERE shop_id=? AND day_id=?`)
      .get(SHOP, CLOSED_DAY) as { t: number };

    expect(() => insertEntry(CLOSED_DAY, 50000, OLD_DEVICE)).toThrow();

    expect(
      db.prepare(`SELECT * FROM days WHERE shop_id=? AND date=?`).get(SHOP, CLOSED_DAY),
    ).toEqual(before);
    expect(
      db
        .prepare(`SELECT coalesce(sum(amount),0) AS t FROM entries WHERE shop_id=? AND day_id=?`)
        .get(SHOP, CLOSED_DAY),
    ).toEqual(totalBefore);
  });

  it('rejects the WHOLE batch atomically, not the good half', () => {
    // A real outbox drain carries several entries. Half-applying it would leave the
    // shopkeeper with a partially-synced day and no way to know which half landed.
    expect(() => {
      db.exec('BEGIN');
      insertEntry(OPEN_DAY, 10000, OLD_DEVICE); // fine on its own
      insertEntry(CLOSED_DAY, 20000, OLD_DEVICE); // poisons the batch
      db.exec('COMMIT');
    }).toThrow(/that day is closed/);
    db.exec('ROLLBACK');

    const after = db.prepare(`SELECT count(*) AS c FROM entries WHERE shop_id=?`).get(SHOP) as {
      c: number;
    };
    expect(after.c, 'no entry from the poisoned batch may survive').toBe(0);
  });

  it('STILL ALLOWS a correction: its own day is open, only its reference is closed', () => {
    // This is the whole of D7 and the guard must not break it.
    expect(() => insertEntry(OPEN_DAY, 18000, NEW_DEVICE, CLOSED_DAY)).not.toThrow();
    const row = db
      .prepare(`SELECT corrects_day_id AS c, day_id AS d FROM entries WHERE shop_id=?`)
      .get(SHOP) as { c: string; d: string };
    expect(row.c).toBe(CLOSED_DAY);
    expect(row.d).toBe(OPEN_DAY);
  });

  it('allows an ordinary entry into the open day', () => {
    expect(() => insertEntry(OPEN_DAY, 30000, NEW_DEVICE)).not.toThrow();
  });

  it('records which device wrote each entry, so a late sync is attributable', () => {
    insertEntry(OPEN_DAY, 30000, NEW_DEVICE);
    const r = db.prepare(`SELECT device_id AS d FROM entries WHERE shop_id=?`).get(SHOP) as {
      d: string;
    };
    expect(r.d).toBe(NEW_DEVICE);
  });

  it('revokes the old device WITHOUT deleting it (AD-014)', () => {
    // Revocation is recorded, not destructive: the row is the evidence that a late
    // sync came from a handset that had already been replaced.
    db.exec(`INSERT INTO users (id, shop_id, phone, created_at)
             VALUES ('${USER}', '${SHOP}', '+919999900000', '${NOW}')`);
    db.exec(`INSERT INTO devices (id, user_id, shop_id, platform, created_at, revoked_at)
             VALUES ('${OLD_DEVICE}', '${USER}', '${SHOP}', 'android', '${NOW}', '${NOW}')`);
    db.exec(`INSERT INTO devices (id, user_id, shop_id, platform, created_at, revoked_at)
             VALUES ('${NEW_DEVICE}', '${USER}', '${SHOP}', 'android', '${NOW}', NULL)`);

    const live = db
      .prepare(`SELECT count(*) AS c FROM devices WHERE shop_id=? AND revoked_at IS NULL`)
      .get(SHOP) as { c: number };
    expect(live.c, 'exactly one device may hold a live session (D9)').toBe(1);

    const revoked = db.prepare(`SELECT revoked_at AS r FROM devices WHERE id=?`).get(OLD_DEVICE) as {
      r: string | null;
    };
    expect(revoked.r, 'the revoked device is retained as evidence, not deleted').not.toBeNull();
  });
});
