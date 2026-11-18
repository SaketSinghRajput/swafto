/**
 * EX-3 · THE EVENT LINK, ENFORCED BY THE DATABASE - the third layer behind the
 * engine's parsers and `assertLegFits`. Run against the SQLite DDL; the Postgres
 * DDL is emitted from the same spec and its migration is applied by postgres.spec.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migrationUp } from '../src/spec.ts';

const SHOP = '00000000-0000-7000-8000-000000000001';
const OTHER = '00000000-0000-7000-8000-000000000002';
const PARTY = '00000000-0000-7000-8000-0000000000c1';
const DAY = '2026-07-15';
const NOW = '2026-07-15T10:00:00.000Z';

let db: DatabaseSync;
let n = 0;
const uid = () => `01890000-0000-7000-8000-${String(++n).padStart(12, '0')}`;

beforeEach(() => {
  n = 0;
  db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const s of migrationUp('sqlite')) db.exec(s);
  for (const shop of [SHOP, OTHER]) {
    db.exec(`INSERT INTO shops (id, name, type, language, created_at) VALUES ('${shop}', 'S', 'kirana', 'en', '${NOW}')`);
    db.exec(`INSERT INTO days (shop_id, date, state, opening_cash, created_at) VALUES ('${shop}', '${DAY}', 'open', 0, '${NOW}')`);
  }
  db.exec(`INSERT INTO parties (id, shop_id, kind, name, created_at) VALUES ('${PARTY}', '${SHOP}', 'customer', 'Ramesh', '${NOW}')`);
});

function insert(row: {
  section: string;
  mode: string;
  amount?: number;
  refersTo?: string;
  party?: string;
  corrects?: string;
  shop?: string;
}): string {
  const id = uid();
  db.prepare(
    `INSERT INTO entries (id, shop_id, day_id, section, amount, mode, party_id, refers_to_entry_id, corrects_day_id, created_at, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')`,
  ).run(
    id,
    row.shop ?? SHOP,
    DAY,
    row.section,
    row.amount ?? 90000,
    row.mode,
    row.party ?? null,
    row.refersTo ?? null,
    row.corrects ?? null,
    NOW,
  );
  return id;
}

describe('the event link (EX-3)', () => {
  it('accepts a return pointing at a sale, and a refund pointing at the return', () => {
    const sale = insert({ section: 'cash_sales', mode: 'cash' });
    const ret = insert({ section: 'sales_return', mode: 'other', refersTo: sale });
    expect(() => insert({ section: 'refund_paid', mode: 'cash', refersTo: ret })).not.toThrow();
  });

  it('refuses an event leg that points at nothing', () => {
    expect(() => insert({ section: 'sales_return', mode: 'other' })).toThrow(/CHECK/);
  });

  it('refuses a link to a row that does not exist', () => {
    expect(() =>
      insert({ section: 'sales_return', mode: 'other', refersTo: '01890000-0000-7000-8000-999999999999' }),
    ).toThrow(/FOREIGN KEY/);
  });

  it("refuses a link into ANOTHER shop's ledger (S-11)", () => {
    const theirs = insert({ section: 'cash_sales', mode: 'cash', shop: OTHER });
    expect(() => insert({ section: 'sales_return', mode: 'other', refersTo: theirs })).toThrow(/FOREIGN KEY/);
  });

  it('refuses a link on an ordinary entry that is not a correction', () => {
    const sale = insert({ section: 'cash_sales', mode: 'cash' });
    expect(() => insert({ section: 'cash_sales', mode: 'cash', refersTo: sale })).toThrow(/CHECK/);
    expect(() => insert({ section: 'cash_sales', mode: 'cash', refersTo: sale, corrects: '2026-07-14' })).not.toThrow();
  });
});

describe('the event modes and parties (D2, EX-11)', () => {
  it('a return is goods: mode other only', () => {
    const sale = insert({ section: 'cash_sales', mode: 'cash' });
    expect(() => insert({ section: 'sales_return', mode: 'cash', refersTo: sale })).toThrow(/CHECK/);
  });

  it('credit issued must name the customer', () => {
    const sale = insert({ section: 'cash_sales', mode: 'cash' });
    const ret = insert({ section: 'sales_return', mode: 'other', refersTo: sale });
    expect(() => insert({ section: 'refund_paid', mode: 'udhar', refersTo: ret })).toThrow(/CHECK/);
    expect(() => insert({ section: 'refund_paid', mode: 'udhar', refersTo: ret, party: PARTY })).not.toThrow();
  });

  it('an event section is never a skippable closing section', () => {
    expect(() =>
      db.exec(`INSERT INTO section_skips (shop_id, day_id, section, skipped_at) VALUES ('${SHOP}', '${DAY}', 'sales_return', '${NOW}')`),
    ).toThrow(/CHECK/);
  });
});
