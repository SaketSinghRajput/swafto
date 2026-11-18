/**
 * §2.3 and HT-11 on the phone: the store and the SQLite port, across a restart.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildReturnEvent, buildSettlement, type Entry } from '@swafto/formula-engine';
import { Store, DayClosedViolation } from '../src/store/index.ts';
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

const sale = (id: string, dayId: string, amount: number): Entry => ({
  id,
  dayId,
  section: 'cash_sales',
  amount,
  mode: 'cash',
  source: 'manual',
  createdAt: `${dayId}T10:00:00.000Z`,
});

let file: string;
beforeEach(() => {
  file = join(mkdtempSync(join(tmpdir(), 'swafto-ret-')), 'ledger.db');
});
const boot = (today: string) => new Store(sqlitePort(open(file), () => today), () => `${today}T12:00:00.000Z`);

/** Yesterday's sale, closed; today open. The sale is only reachable "on any day". */
function yesterdaysSale(): { store: Store; s: Entry } {
  const a = boot('2026-01-02');
  a.setOpeningCash(0);
  const s = sale('s1', '2026-01-02', 90000);
  a.append(s);
  a.close(90000);
  return { store: boot('2026-01-03'), s };
}

const returnOf = (store: Store, s: Entry, settlement: 'cash' | 'pending', ids = ['r1', 'f1']) =>
  buildReturnEvent({
    sale: s,
    ledger: store.entriesReferringTo(s.id),
    dayId: store.state.day.date,
    createdAt: `${store.state.day.date}T12:00:00.000Z`,
    ids,
    returned: s.amount,
    settlement,
    ...(settlement === 'pending' ? { partyId: 'c1' } : {}),
  });

describe('a return against an earlier day, on the phone', () => {
  it('finds a sale from a closed day and returns it today, leaving that day untouched', () => {
    const { store, s } = yesterdaysSale();
    expect(store.recentSales().map((e) => e.id)).toEqual(['s1']);
    store.appendEvent(returnOf(store, s, 'cash'));
    expect(store.primary().p4NetSales.value).toBe(-90000);
    expect(store.settlement(store.findEntry('r1')!).state).toBe('refund_paid');
    // The closed day's own rows are exactly what was closed.
    expect(boot('2026-01-03').findEntry('s1')).toEqual(s);
  });

  it('an event survives a restart whole, with every leg queued for sync', () => {
    const { store, s } = yesterdaysSale();
    store.appendEvent(returnOf(store, s, 'cash'));
    const again = boot('2026-01-03');
    expect(again.state.entries.map((e) => e.id)).toEqual(['r1', 'f1']);
    expect(again.pendingOutbox.map((r) => r.id)).toEqual(expect.arrayContaining(['ob-r1', 'ob-f1']));
  });

  it('EX-6: a failure inside the event leaves NO leg in the book', () => {
    const { store, s } = yesterdaysSale();
    const legs = returnOf(store, s, 'cash');
    // A second leg that reuses the first's id: the port's unique key fails mid-transaction.
    const broken = [legs[0]!, { ...legs[1]!, id: 'r1' }];
    expect(() => store.appendEvent(broken)).toThrow();
    expect(boot('2026-01-03').findEntry('r1')).toBeUndefined();
  });

  it('refuses a duplicate refund before it reaches the port (EX-12)', () => {
    const { store, s } = yesterdaysSale();
    store.appendEvent(returnOf(store, s, 'cash'));
    const twice = buildSettlement({
      ret: store.findEntry('r1')!,
      ledger: [],
      id: 'f2',
      dayId: '2026-01-03',
      createdAt: '2026-01-03T12:00:00.000Z',
      amount: 90000,
      mode: 'cash',
    });
    expect(() => store.append(twice)).toThrow(/settled in full/);
    expect(store.entriesReferringTo('r1')).toHaveLength(1);
  });

  it('a pending return settles later, on another day, and the fold moves forward', () => {
    const { store, s } = yesterdaysSale();
    store.addParty({ id: 'c1', kind: 'customer', name: 'Ramesh' });
    store.appendEvent(returnOf(store, s, 'pending', ['r1']));
    expect(store.settlement(store.findEntry('r1')!).state).toBe('pending_settlement');
    store.append(
      buildSettlement({
        ret: store.findEntry('r1')!,
        ledger: store.entriesReferringTo('r1'),
        id: 'f1',
        dayId: '2026-01-03',
        createdAt: '2026-01-03T13:00:00.000Z',
        amount: 90000,
        mode: 'upi',
      }),
    );
    expect(store.settlement(store.findEntry('r1')!).state).toBe('refund_paid');
  });
});

describe('HT-11 · a correction posted while the closed day is still the business day', () => {
  function closedToday(): Store {
    const a = boot('2026-01-02');
    a.setOpeningCash(0);
    a.append(sale('s1', '2026-01-02', 50000));
    a.close(50000);
    return a;
  }

  it('is HELD, and the frozen day is never written', () => {
    const a = closedToday();
    expect(a.postCorrection({ id: 'k1', originalId: 's1', amount: 500 })).toBe('held');
    expect(a.state.entries.map((e) => e.id)).toEqual(['s1']);
    expect(a.state.heldCorrections).toEqual([expect.objectContaining({ id: 'k1', originalId: 's1', amount: 500 })]);
    // Still held after a restart on the same business day.
    expect(boot('2026-01-02').state.heldCorrections).toHaveLength(1);
  });

  it('is recorded on the NEXT day the moment it opens, naming what it corrects', () => {
    closedToday().postCorrection({ id: 'k1', originalId: 's1', amount: 500 });
    const next = boot('2026-01-03');
    const k = next.state.entries.find((e) => e.id === 'k1');
    expect(k).toMatchObject({ dayId: '2026-01-03', section: 'cash_sales', correctsDayId: '2026-01-02', refersToEntryId: 's1' });
    expect(next.state.heldCorrections).toEqual([]);
    expect(next.primary().p4NetSales.value).toBe(500);
    // And only once, however many times the app starts.
    expect(boot('2026-01-03').state.entries.filter((e) => e.id === 'k1')).toHaveLength(1);
  });

  it('is released WITHOUT a restart, when the next day opens on the same running app (F-19)', () => {
    const clock = { value: '2026-01-02T22:00' };
    const store = new Store(sqlitePort(open(file), () => clock.value), () => '2026-01-02T22:00:00.000Z');
    store.setOpeningCash(0);
    store.append(sale('s1', '2026-01-02', 50000));
    store.close(50000);
    expect(store.postCorrection({ id: 'k1', originalId: 's1', amount: 500 })).toBe('held');
    clock.value = '2026-01-03T09:00';
    expect(store.startNextDayIfDue()).toBe(true);
    expect(store.state.entries.map((e) => e.id)).toEqual(['k1']);
    expect(store.state.heldCorrections).toEqual([]);
  });

  it('a kill between posting and clearing the list does not post it twice', () => {
    closedToday().postCorrection({ id: 'k1', originalId: 's1', amount: 500 });
    // The first launch of the next day dies after the append, before the list is cleared.
    const port = sqlitePort(open(file), () => '2026-01-03');
    const dying = {
      ...port,
      putHeldCorrections: () => {
        throw new Error('process killed');
      },
    };
    expect(() => new Store(dying)).toThrow('process killed');
    const next = boot('2026-01-03');
    expect(next.state.entries.filter((e) => e.id === 'k1')).toHaveLength(1);
  });

  it('on an open later day it is recorded at once', () => {
    closedToday();
    const next = boot('2026-01-03');
    expect(next.postCorrection({ id: 'k2', originalId: 's1', amount: 700 })).toBe('recorded');
    expect(next.state.entries.map((e) => e.id)).toContain('k2');
  });

  it('a plain entry into the closed day is still refused (D7)', () => {
    const a = closedToday();
    expect(() => a.append(sale('x', '2026-01-02', 100))).toThrow(DayClosedViolation);
  });
});
