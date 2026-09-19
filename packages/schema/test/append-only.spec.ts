/**
 * G4 verification — schema, migrations, and APPEND-ONLY enforced at the DATABASE level.
 *
 * "No UPDATE and no DELETE on D1. Corrections are new rows that reference old days."
 *   — SWAFTO-System-Architecture-and-DFD.pdf §07.04
 *
 * These tests run against real SQLite (node:sqlite, built into Node 24 — zero deps).
 * The Postgres half of G4 lives in `postgres.spec.ts` and skips without a database.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migrationUp, migrationDown, SECTION_MODES, SECTIONS } from '../src/spec.ts';

const SHOP = '00000000-0000-7000-8000-000000000001';
const DAY = '2026-07-15';
const ENTRY = '01890000-0000-7000-8000-00000000000a';
const PARTY = '00000000-0000-7000-8000-0000000000c1';
const NOW = '2026-07-15T10:00:00.000Z';

function up(db: DatabaseSync) {
  for (const stmt of migrationUp('sqlite')) db.exec(stmt);
}
function down(db: DatabaseSync) {
  for (const stmt of migrationDown('sqlite')) db.exec(stmt);
}

function seed(db: DatabaseSync) {
  db.exec(`INSERT INTO shops (id, name, type, language, created_at)
           VALUES ('${SHOP}', 'Test Store', 'kirana', 'en', '${NOW}')`);
  db.exec(`INSERT INTO days (shop_id, date, state, opening_cash, created_at)
           VALUES ('${SHOP}', '${DAY}', 'open', 150000, '${NOW}')`);
  db.exec(`INSERT INTO parties (id, shop_id, kind, name, created_at)
           VALUES ('${PARTY}', '${SHOP}', 'customer', 'A Customer', '${NOW}')`);
  db.exec(`INSERT INTO entries (id, shop_id, day_id, section, amount, mode, created_at, source)
           VALUES ('${ENTRY}', '${SHOP}', '${DAY}', 'cash_sales', 678000, 'cash', '${NOW}', 'manual')`);
}

describe('G4 · migrations run up, down, and up again (SQLite)', () => {
  it('survives up -> down -> up with no residue', () => {
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON');

    up(db);
    seed(db);
    expect(db.prepare('SELECT count(*) AS n FROM entries').get()).toEqual({ n: 1 });

    down(db);
    const after = db
      .prepare(
        `SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
      )
      .get() as { n: number };
    expect(after.n).toBe(0);

    // Up again must be clean — this is what catches a `down` that leaves a trigger behind.
    up(db);
    seed(db);
    expect(db.prepare('SELECT count(*) AS n FROM entries').get()).toEqual({ n: 1 });
  });

  it('creates every store the architecture names', () => {
    const db = new DatabaseSync(':memory:');
    up(db);
    const tables = (
      db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
        )
        .all() as { name: string }[]
    ).map((r) => r.name);

    // D1-D5 plus section_skips (required by D8) and outbox (device-local only).
    expect(tables).toEqual([
      'days',
      'devices',
      'entries',
      'outbox',
      'parties',
      'section_skips',
      'shops',
      'users',
    ]);
    // rate_events is server-only (injection 08 B.2). A device that carried it would
    // be keeping a keyed log of sign-in attempts on the handset, for nothing.
    expect(tables).not.toContain('rate_events');
  });
});

describe('G4 · entries is append-only, enforced by the database', () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    up(db);
    seed(db);
  });

  it('REJECTS an UPDATE on entries', () => {
    expect(() => db.exec(`UPDATE entries SET amount = 999999 WHERE id = '${ENTRY}'`)).toThrow(
      /append-only/,
    );

    // and the row is untouched
    expect(db.prepare(`SELECT amount AS a FROM entries WHERE id = '${ENTRY}'`).get()).toEqual({
      a: 678000,
    });
  });

  /**
   * EVERY COLUMN, not just `amount`.
   *
   * Found by §5.12 --prove at iteration 19. Narrowing the trigger to
   * `BEFORE UPDATE OF amount ON entries` - a one-word change that leaves every other
   * column of a ledger row freely mutable - and THE ENTIRE SUITE STILL PASSED,
   * because every append-only test updated `amount` and nothing else.
   *
   * On Postgres the REVOKE would still have caught it. On SQLITE THE TRIGGER IS THE
   * ONLY DEFENCE, and SQLite is the authoritative store (constraint 2). A
   * column-scoped trigger there means a ledger row whose section, party, day or
   * label can be rewritten in place, silently, forever.
   *
   * These columns are chosen because none of them carries a CHECK constraint, so a
   * rejection here can only be the append-only trigger and not some other guard
   * firing first and making the test pass for the wrong reason.
   */
  const UNCONSTRAINED_COLUMNS: [string, string][] = [
    ['label', "'rewritten'"],
    ['created_at', "'2020-01-01T00:00:00.000Z'"],
    ['source', "'imported'"],
    ['device_id', 'NULL'],
  ];

  for (const [column, value] of UNCONSTRAINED_COLUMNS) {
    it(`REJECTS an UPDATE of "${column}", not only of amount`, () => {
      expect(() =>
        db.exec(`UPDATE entries SET ${column} = ${value} WHERE id = '${ENTRY}'`),
      ).toThrow(/append-only/);
    });
  }

  it('REJECTS a DELETE on entries', () => {
    expect(() => db.exec(`DELETE FROM entries WHERE id = '${ENTRY}'`)).toThrow(/append-only/);
    expect(db.prepare('SELECT count(*) AS n FROM entries').get()).toEqual({ n: 1 });
  });

  it('REJECTS an UPDATE on a closed day (decision D7)', () => {
    db.exec(`INSERT INTO days (shop_id, date, state, opening_cash, counted_cash, closed_at, created_at)
             VALUES ('${SHOP}', '2026-07-14', 'closed', 100000, 150000, '${NOW}', '${NOW}')`);
    expect(() =>
      db.exec(`UPDATE days SET counted_cash = 1 WHERE shop_id = '${SHOP}' AND date = '2026-07-14'`),
    ).toThrow(/immutable/);
  });

  it('ALLOWS a correction referencing a closed day, leaving that day byte-identical', () => {
    db.exec(`INSERT INTO days (shop_id, date, state, opening_cash, counted_cash, closed_at, created_at)
             VALUES ('${SHOP}', '2026-07-12', 'closed', 100000, 605000, '${NOW}', '${NOW}')`);
    const before = db
      .prepare(`SELECT * FROM days WHERE shop_id = '${SHOP}' AND date = '2026-07-12'`)
      .get();

    // The correction is a NEW row on TODAY that REFERENCES the closed day (D7).
    db.exec(`INSERT INTO entries (id, shop_id, day_id, section, amount, mode, corrects_day_id, created_at, source)
             VALUES ('01890000-0000-7000-8000-00000000000b', '${SHOP}', '${DAY}', 'cash_sales', 18000, 'cash', '2026-07-12', '${NOW}', 'manual')`);

    const after = db
      .prepare(`SELECT * FROM days WHERE shop_id = '${SHOP}' AND date = '2026-07-12'`)
      .get();
    expect(after).toEqual(before); // byte-identical
  });
});

describe('G4 · the schema physically enforces the domain rules', () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    up(db);
    seed(db);
  });

  const insert = (cols: string, vals: string) =>
    db.exec(`INSERT INTO entries (${cols}) VALUES (${vals})`);

  it('REJECTS a non-integer amount — money is integer paise (ADR-003)', () => {
    expect(() =>
      insert(
        'id, shop_id, day_id, section, amount, mode, created_at',
        `'01890000-0000-7000-8000-0000000000f1', '${SHOP}', '${DAY}', 'cash_sales', 12.5, 'cash', '${NOW}'`,
      ),
    ).toThrow();
  });

  it('REJECTS a negative amount — sign is carried by the section, not the amount', () => {
    expect(() =>
      insert(
        'id, shop_id, day_id, section, amount, mode, created_at',
        `'01890000-0000-7000-8000-0000000000f2', '${SHOP}', '${DAY}', 'cash_sales', -100, 'cash', '${NOW}'`,
      ),
    ).toThrow();
  });

  it('REJECTS shop_stock on a purchase — mode validity is PER SECTION (C-7)', () => {
    // The paper sheet gives purchase four modes and deliberately omits Shop Stock.
    expect(SECTION_MODES.purchase).not.toContain('shop_stock');
    expect(() =>
      insert(
        'id, shop_id, day_id, section, amount, mode, created_at',
        `'01890000-0000-7000-8000-0000000000f3', '${SHOP}', '${DAY}', 'purchase', 1000, 'shop_stock', '${NOW}'`,
      ),
    ).toThrow();
  });

  it('ACCEPTS shop_stock on an expense — five modes there (sheet §4)', () => {
    expect(SECTION_MODES.expense).toContain('shop_stock');
    expect(() =>
      insert(
        'id, shop_id, day_id, section, amount, mode, created_at',
        `'01890000-0000-7000-8000-0000000000f4', '${SHOP}', '${DAY}', 'expense', 50000, 'shop_stock', '${NOW}'`,
      ),
    ).not.toThrow();
  });

  it('REJECTS a due_date on anything but an udhar purchase (D4)', () => {
    expect(() =>
      insert(
        'id, shop_id, day_id, section, amount, mode, due_date, created_at',
        `'01890000-0000-7000-8000-0000000000f5', '${SHOP}', '${DAY}', 'expense', 1000, 'cash', '2026-08-01', '${NOW}'`,
      ),
    ).toThrow();
  });

  it('REJECTS an udhar sale with no party — the sheet asks for a creditor name', () => {
    expect(() =>
      insert(
        'id, shop_id, day_id, section, amount, mode, created_at',
        `'01890000-0000-7000-8000-0000000000f6', '${SHOP}', '${DAY}', 'udhar_sales', 1000, 'udhar', '${NOW}'`,
      ),
    ).toThrow();
  });

  it('REJECTS an unknown day state, and accepts all FIVE real ones (C-3)', () => {
    expect(() =>
      db.exec(`INSERT INTO days (shop_id, date, state, created_at)
               VALUES ('${SHOP}', '2026-01-01', 'nonsense', '${NOW}')`),
    ).toThrow();

    for (const [i, state] of ['not_started', 'open', 'ready', 'not_closed'].entries()) {
      expect(() =>
        db.exec(`INSERT INTO days (shop_id, date, state, created_at)
                 VALUES ('${SHOP}', '2026-02-0${i + 1}', '${state}', '${NOW}')`),
      ).not.toThrow();
    }
    // 'closed' additionally requires counted_cash and closed_at — that is the point.
    expect(() =>
      db.exec(`INSERT INTO days (shop_id, date, state, created_at)
               VALUES ('${SHOP}', '2026-03-01', 'closed', '${NOW}')`),
    ).toThrow();
  });

  it('has NO totals column anywhere — "there is no totals table, and there never will be"', () => {
    const cols: string[] = [];
    for (const tbl of ['days', 'entries', 'parties', 'shops']) {
      for (const r of db.prepare(`PRAGMA table_info(${tbl})`).all() as { name: string }[]) {
        cols.push(`${tbl}.${r.name}`);
      }
    }
    const banned = cols.filter((c) => /total|balance|outstanding|sum_/i.test(c));
    expect(banned).toEqual([]);
  });

  it('distinguishes a SKIPPED section from an UNTOUCHED one (D8)', () => {
    // Untouched: no entry, no skip row.
    const untouched = db
      .prepare(
        `SELECT count(*) AS n FROM section_skips WHERE shop_id=? AND day_id=? AND section='expense'`,
      )
      .get(SHOP, DAY) as { n: number };
    expect(untouched.n).toBe(0);

    // Explicitly skipped: a skip row, still no entry.
    db.exec(`INSERT INTO section_skips (shop_id, day_id, section, skipped_at)
             VALUES ('${SHOP}', '${DAY}', 'expense', '${NOW}')`);
    const skipped = db
      .prepare(
        `SELECT count(*) AS n FROM section_skips WHERE shop_id=? AND day_id=? AND section='expense'`,
      )
      .get(SHOP, DAY) as { n: number };
    expect(skipped.n).toBe(1);

    // Both produce the same TOTAL (zero) and a different DAY STATE. That is the
    // whole of D8, and it is why section_skips has to exist at all.
    const total = db
      .prepare(
        `SELECT coalesce(sum(amount),0) AS t FROM entries WHERE shop_id=? AND day_id=? AND section='expense'`,
      )
      .get(SHOP, DAY) as { t: number };
    expect(total.t).toBe(0);

    // E3: an entry into a skipped section un-skips it. The skip row is deletable
    // BY DESIGN — it is a UI state, not a financial fact.
    expect(() =>
      db.exec(
        `DELETE FROM section_skips WHERE shop_id='${SHOP}' AND day_id='${DAY}' AND section='expense'`,
      ),
    ).not.toThrow();
  });

  it('covers every section in SECTION_MODES', () => {
    expect(Object.keys(SECTION_MODES).sort()).toEqual([...SECTIONS].sort());
  });
});
