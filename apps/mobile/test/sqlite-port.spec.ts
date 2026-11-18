/**
 * W4: what was written survives a restart.
 *
 * A "restart" here is a SECOND Store built over the same database file, which
 * is what a cold start does. Every test in the suite before this one shared a
 * single in-memory port for its lifetime, so none could see a kill.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Entry } from '@swafto/formula-engine';
import { Store, AppendOnlyViolation } from '../src/store/index.ts';
import { sqlitePort, type Db } from '../src/store/sqlite.ts';

const open = (file: string): Db => {
  const db = new DatabaseSync(file);
  return {
    executeSync(sql, params = []) {
      const st = db.prepare(sql);
      if (/^\s*select/i.test(sql)) return { rows: st.all(...(params as never[])) };
      st.run(...(params as never[]));
      return { rows: [] };
    },
  };
};

const entry = (id: string, dayId: string, section: Entry['section'], amount: number, mode: Entry['mode'], partyId?: string): Entry =>
  ({
    id, dayId, section, amount, mode, source: 'manual', createdAt: `${dayId}T10:00:00.000Z`,
    ...(partyId ? { partyId } : {}),
  }) as Entry;

let file: string;
beforeEach(() => {
  file = join(mkdtempSync(join(tmpdir(), 'swafto-w4-')), 'ledger.db');
});
const boot = (today: string) => new Store(sqlitePort(open(file), () => today));

describe('W4 - the day survives a restart', () => {
  it('keeps entries, the opening cash and the outbox', () => {
    const a = boot('2026-01-02');
    a.setOpeningCash(150000);
    a.append(entry('e1', '2026-01-02', 'cash_sales', 10000, 'cash'));

    const b = boot('2026-01-02');
    expect(b.state.day.openingCash).toBe(150000);
    expect(b.state.entries.map((e) => e.id)).toEqual(['e1']);
    expect(b.expectedCash().value).toBe(a.expectedCash().value);
    expect(b.pendingOutbox.map((r) => r.id)).toEqual(['ob-day-2026-01-02', 'ob-e1']);
  });

  it('keeps a closed day closed on the same date', () => {
    const a = boot('2026-01-02');
    a.setOpeningCash(0);
    a.close(0);
    expect(boot('2026-01-02').state.day.state).toBe('closed');
  });

  it('rolls a closed day over on the counted cash, and derives the carried balances', () => {
    const a = boot('2026-01-02');
    a.setOpeningCash(100000);
    a.addParty({ id: 'c1', kind: 'customer', name: 'Ramesh' });
    a.addParty({ id: 's1', kind: 'supplier', name: 'Agarwal' });
    a.append(entry('u1', '2026-01-02', 'udhar_sales', 30000, 'udhar', 'c1'));
    a.append(entry('p1', '2026-01-02', 'purchase', 20000, 'udhar', 's1'));
    a.close(95000, 't12.reason.unknown');

    const b = boot('2026-01-03');
    expect(b.state.day).toMatchObject({ date: '2026-01-03', state: 'open', openingCash: 95000 });
    expect(b.state.entries).toEqual([]);
    expect(b.state.priorCreditOutstanding).toBe(30000);
    expect(b.state.priorSupplierOutstanding).toBe(20000);
    expect(b.state.parties.map((p) => p.name)).toEqual(['Ramesh', 'Agarwal']);
  });

  it('does NOT roll an open day over at midnight - the business day is the shop\'s', () => {
    boot('2026-01-02').append(entry('late', '2026-01-02', 'cash_sales', 500, 'cash'));
    const b = boot('2026-01-03');
    expect(b.state.day.date).toBe('2026-01-02');
    expect(b.state.entries.map((e) => e.id)).toEqual(['late']);
  });

  it('keeps a skip, a party and the shop name', () => {
    const a = boot('2026-01-02');
    a.skip('withdrawal');
    a.addParty({ id: 'c1', kind: 'customer', name: '  Sita  ' });
    a.setShopName('Test Store');
    const b = boot('2026-01-02');
    expect(b.isSkipped('withdrawal')).toBe(true);
    expect(b.state.parties).toEqual([{ id: 'c1', kind: 'customer', name: 'Sita' }]);
    expect(b.state.shopName).toBe('Test Store');
    expect(b.pendingOutbox.some((r) => r.kind === 'party')).toBe(true);
  });

  it('an ack survives too, and a failed write leaves nothing behind', () => {
    const a = boot('2026-01-02');
    a.append(entry('e1', '2026-01-02', 'cash_sales', 100, 'cash'));
    a.ackOutbox(['ob-e1']);
    expect(boot('2026-01-02').pendingOutbox.map((r) => r.id)).toEqual(['ob-day-2026-01-02']);

    // The port itself refuses a duplicate id inside the transaction, so the
    // outbox row that would have travelled with it is rolled back as well.
    const port = sqlitePort(open(file), () => '2026-01-02');
    const dupe = entry('e1', '2026-01-02', 'cash_sales', 100, 'cash');
    expect(() => port.appendAtomically(dupe, { id: 'ob-dupe', kind: 'entry', payload: dupe, queuedAt: dupe.createdAt })).toThrow();
    expect(port.pendingOutbox().map((r) => r.id)).toEqual(['ob-day-2026-01-02']);
    expect(() => boot('2026-01-02').append(dupe)).toThrow(AppendOnlyViolation);
  });
});

describe('F-14 - a cash purchase creates no supplier due', () => {
  it('only an udhar purchase moves the supplier', () => {
    const a = boot('2026-01-02');
    a.addParty({ id: 's1', kind: 'supplier', name: 'Agarwal' });
    a.append(entry('cash-buy', '2026-01-02', 'purchase', 5000, 'cash', 's1'));
    expect(a.partyMovementToday('s1')).toBe(0);
    a.append(entry('credit-buy', '2026-01-02', 'purchase', 7000, 'udhar', 's1'));
    expect(a.partyMovementToday('s1')).toBe(7000);
  });
});

describe('F-19 - the morning after a close, without a restart', () => {
  it('the next entry lands in a new day opened on the counted cash', () => {
    let today = '2026-01-02';
    const store = new Store(sqlitePort(open(file), () => today));
    store.setOpeningCash(10000);
    store.close(10000);
    today = '2026-01-03';
    expect(store.startNextDayIfDue()).toBe(true);
    expect(store.state.day).toMatchObject({ date: '2026-01-03', state: 'open', openingCash: 10000 });
    store.append(entry('morning', '2026-01-03', 'cash_sales', 500, 'cash'));
    expect(store.state.entries.map((e) => e.id)).toEqual(['morning']);
  });

  it('does nothing on the same date, or while the day is open', () => {
    const store = boot('2026-01-02');
    expect(store.startNextDayIfDue()).toBe(false);
    store.setOpeningCash(0);
    store.close(0);
    expect(store.startNextDayIfDue()).toBe(false);
    expect(store.state.day.state).toBe('closed');
  });
});

describe('F-18 - an ack never deletes a newer version of a row', () => {
  it('a close made while the open day was in flight stays queued', () => {
    const store = boot('2026-01-02');
    store.setOpeningCash(0);
    const sent = store.pendingOutbox; // the push takes the open day
    store.close(0); // ...and the shopkeeper closes while it is in flight
    store.ackOutbox(sent.map((r) => r.id), sent);
    const left = boot('2026-01-02').pendingOutbox;
    expect(left.map((r) => r.id)).toEqual(['ob-day-2026-01-02']);
    expect((left[0]!.payload as { state: string }).state).toBe('closed');
  });
});

describe('a party the server would refuse never enters the outbox', () => {
  it('refuses an over-long name and a bad phone, and queues nothing', () => {
    const store = boot('2026-01-02');
    expect(() => store.addParty({ id: 'c1', kind: 'customer', name: 'x'.repeat(121) })).toThrow();
    expect(() => store.addParty({ id: 'c2', kind: 'customer', name: 'Sita', phone: '123' })).toThrow();
    expect(store.pendingOutbox).toEqual([]);
    expect(store.state.parties).toEqual([]);
  });
});

describe('DV-7 - a supplier payment cannot be booked to a customer', () => {
  it('the store refuses the wrong kind, and an unknown party', () => {
    const store = boot('2026-01-02');
    store.addParty({ id: 'c1', kind: 'customer', name: 'Ramesh' });
    expect(() => store.append(entry('x1', '2026-01-02', 'party_payment', 300, 'cash', 'c1'))).toThrow(/needs a supplier/);
    expect(() => store.append(entry('x2', '2026-01-02', 'udhar_sales', 300, 'udhar', 'ghost'))).toThrow(/needs a customer/);
    store.append(entry('x3', '2026-01-02', 'udhar_collection', 300, 'cash', 'c1'));
    expect(store.state.entries.map((e) => e.id)).toEqual(['x3']);
    expect(store.pendingOutbox.filter((r) => r.kind === 'entry').map((r) => r.id)).toEqual(['ob-x3']);
  });
});

describe('BE-13 - Reports read every earlier day, and nothing but what was typed', () => {
  it('a restart hands the store its earlier days and entries, and R1 counts them', () => {
    const a = boot('2026-01-02');
    a.setOpeningCash(0);
    a.append(entry('d1', '2026-01-02', 'cash_sales', 10000, 'cash'));
    a.close(10000);

    const b = boot('2026-01-03');
    expect(b.state.pastDays?.map((d) => [d.date, d.state])).toEqual([['2026-01-02', 'closed']]);
    expect(b.state.pastEntries?.map((e) => e.id)).toEqual(['d1']);
    // Today is open, so the one closed day is yesterday's - read, not stored.
    expect(b.reports().closedDays).toBe(1);
    expect(b.reports().cashConfidence).toEqual({
      available: false,
      requiredClosedDays: 14,
      closedDaysSoFar: 1,
    });
  });

  it("FR-7: yesterday's adjustments and UPI confirmations come back for the basic reports", () => {
    /*
     * Yesterday: opening 0, cash sale 100, a fake note of 20 (cash -1), UPI sale
     * 50 confirmed. Expected cash = 100 - 20 = 80, counted 80: balanced ONLY if
     * the adjustment is read back. UPI confirmed that month = 50.
     */
    const a = boot('2026-01-02');
    a.setOpeningCash(0);
    a.append(entry('c', '2026-01-02', 'cash_sales', 10000, 'cash'));
    a.append(entry('u', '2026-01-02', 'upi_sales', 5000, 'upi'));
    a.addAdjustment({ id: 'adj', dayId: '2026-01-02', type: 'counterfeit_note', amount: 2000, createdAt: '2026-01-02T11:00:00.000Z' });
    a.confirmUpi([{ id: 'cf', dayId: '2026-01-02', entryId: 'u', confirmedAt: '2026-01-02T12:00:00.000Z' }]);
    a.close(8000);

    const b = boot('2026-01-03');
    expect(b.state.pastAdjustments?.map((x) => x.id)).toEqual(['adj']);
    expect(b.state.pastUpiConfirmations?.map((x) => x.id)).toEqual(['cf']);
    const r = b.basicReports();
    expect(r.cashChecks.days).toEqual([
      { date: '2026-01-02', expected: 8000, counted: 8000, difference: 0, status: 'balanced' },
    ]);
    expect(r.upiMonths[0]).toMatchObject({ month: '2026-01', recorded: 5000, confirmed: 5000 });
  });
});

describe('QA-02 - an Oct-26 book opens on the current code', () => {
  // The file as the Oct-26 build left it: outbox with no parking columns, plus
  // the first parking build's separate table, an OPEN day dated 26 Oct, a shop
  // name and queued rows. Written with raw SQL, not through sqlitePort.
  const oct26 = (): void => {
    const raw = new DatabaseSync(file);
    raw.exec(`
      CREATE TABLE day (date TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE entry (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, day_id TEXT NOT NULL, json TEXT NOT NULL);
      CREATE TABLE party (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, json TEXT NOT NULL);
      CREATE TABLE outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, json TEXT NOT NULL);
      CREATE TABLE outbox_parked (id TEXT PRIMARY KEY, json TEXT NOT NULL, reason TEXT NOT NULL);
      CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
    `);
    const e = entry('old1', '2026-10-26', 'cash_sales', 25000, 'cash');
    const day = { date: '2026-10-26', state: 'open', openingCash: 100000, countedCash: null, skippedSections: [] };
    const dayRow = { id: 'ob-day-2026-10-26', kind: 'day', payload: day };
    raw.prepare('INSERT INTO day (date, json) VALUES (?, ?)').run('2026-10-26', JSON.stringify(day));
    raw.prepare('INSERT INTO entry (id, day_id, json) VALUES (?, ?, ?)').run(e.id, e.dayId, JSON.stringify(e));
    raw.prepare('INSERT INTO outbox (id, json) VALUES (?, ?)').run('ob-day-2026-10-26', JSON.stringify(dayRow));
    raw.prepare('INSERT INTO outbox (id, json) VALUES (?, ?)').run('ob-old1', JSON.stringify({ id: 'ob-old1', kind: 'entry', payload: e }));
    raw.prepare('INSERT INTO outbox_parked (id, json, reason) VALUES (?, ?, ?)').run('ob-old1', JSON.stringify({ id: 'ob-old1', kind: 'entry', payload: e }), 'refused');
    raw.prepare("INSERT INTO meta (k, v) VALUES ('shopName', 'TEST STORE D')").run();
    raw.close();
  };

  it('migrates, keeps the open day and its entries, and does not hang or throw', () => {
    oct26();
    // The phone is on 18 Nov; the 26 Oct day is still OPEN, so it stays the day (stale, C-17).
    const store = new Store(sqlitePort(open(file), () => '2026-11-18T10:36:00+05:30'));
    expect(store.state.shopName).toBe('TEST STORE D');
    expect(store.state.day.date).toBe('2026-10-26');
    expect(store.state.day.state).toBe('open');
    expect(store.state.entries.map((e) => e.id)).toEqual(['old1']);
    // the parked row came across as parked; the day row is still queued
    expect(store.pendingOutbox.map((r) => r.id)).toEqual(['ob-day-2026-10-26']);
  });
});
