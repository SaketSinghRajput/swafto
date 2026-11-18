/**
 * DECISION 1 ON THE PHONE - a cutover, not a migration.
 *
 * The port is handed the wall clock and picks the business day from it and the
 * shop's day start. Each day it makes carries the start it was made under, so a
 * later change to the setting governs the NEXT day only. A day already in the
 * book - open or closed - keeps its hours, and a closed one stays frozen (D7).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DayRecord, Entry } from '@swafto/formula-engine';
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

const at = (date: string, hhmm: string) => `${date}T${hhmm}:00.000+05:30`;

const sale = (id: string, dayId: string, createdAt: string): Entry =>
  ({ id, dayId, section: 'cash_sales', amount: 1000, mode: 'cash', source: 'manual', createdAt }) as Entry;

let file: string;
let wall: string;
beforeEach(() => {
  file = join(mkdtempSync(join(tmpdir(), 'swafto-day1-')), 'ledger.db');
});
const boot = () => new Store(sqlitePort(open(file), () => wall), () => wall);
/** The shop's setting, as S2 writes it - before the first launch reads it. */
const setting = (startsAt: string) => sqlitePort(open(file), () => wall).putDayStart(startsAt);
const dayRow = (date: string) =>
  open(file).executeSync('SELECT json FROM day WHERE date = ?', [date]).rows[0]?.json;

describe('decision 1 - the business day on the phone', () => {
  it('with a 05:00 start, 00:30 on the 12th opens the business day of the 11th', () => {
    setting('05:00');
    wall = at('2026-10-12', '00:30');
    const store = boot();
    expect(store.state.day).toMatchObject({ date: '2026-10-11', startsAt: '05:00' });
  });

  it('a closed 05:00 day stays the day until 05:00, and 05:00 exactly opens the next', () => {
    setting('05:00');
    wall = at('2026-10-11', '09:00');
    const store = boot();
    store.setOpeningCash(10000);
    store.close(10000);

    wall = at('2026-10-12', '00:30');
    expect(store.startNextDayIfDue()).toBe(false);
    expect(store.state.day).toMatchObject({ date: '2026-10-11', state: 'closed' });
    // The 00:30 sale is the 11th's, which is closed - refused, never re-dated.
    expect(() => store.append(sale('late', '2026-10-11', wall))).toThrow(DayClosedViolation);

    wall = at('2026-10-12', '05:00');
    expect(store.startNextDayIfDue()).toBe(true);
    expect(store.state.day).toMatchObject({
      date: '2026-10-12',
      state: 'open',
      openingCash: 10000,
      startsAt: '05:00',
    });
  });

  it('with no setting the day is the calendar day, as it always was', () => {
    wall = at('2026-10-11', '09:00');
    const store = boot();
    expect(store.state.day).toMatchObject({ date: '2026-10-11', startsAt: '00:00' });
    store.setOpeningCash(0);
    store.close(0);
    wall = at('2026-10-11', '23:59');
    expect(store.startNextDayIfDue()).toBe(false);
    wall = at('2026-10-12', '00:00');
    expect(store.startNextDayIfDue()).toBe(true);
    expect(store.state.day.date).toBe('2026-10-12');
  });

  it('changing the setting does not move the open day or anything in it', () => {
    wall = at('2026-10-11', '22:00');
    const store = boot();
    store.setOpeningCash(5000);
    store.append(sale('s1', '2026-10-11', wall));

    store.setDayStart('05:00');
    wall = at('2026-10-12', '00:30');
    const again = boot();
    expect(again.state.day).toMatchObject({ date: '2026-10-11', startsAt: '00:00', openingCash: 5000 });
    expect(again.state.entries.map((e) => e.id)).toEqual(['s1']);
    expect(again.state.dayStartsAt).toBe('05:00');
  });

  it('a closed day keeps its own hours after the setting changes, and stays frozen', () => {
    setting('05:00');
    wall = at('2026-10-11', '09:00');
    const store = boot();
    store.setOpeningCash(0);
    store.append(sale('s1', '2026-10-11', wall));
    store.close(1000);
    const frozen = dayRow('2026-10-11');

    // Back to midnight. The 11th was made under 05:00, so at 01:00 on the 12th
    // it has NOT ended - the new setting cannot shorten a day already made.
    store.setDayStart('00:00');
    wall = at('2026-10-12', '01:00');
    expect(store.startNextDayIfDue()).toBe(false);
    expect(store.state.day).toMatchObject({ date: '2026-10-11', state: 'closed', startsAt: '05:00' });
    expect(() => store.append(sale('late', '2026-10-11', wall))).toThrow(DayClosedViolation);
    expect(dayRow('2026-10-11')).toBe(frozen);

    // At its own end, the next day opens under the NEW setting.
    wall = at('2026-10-12', '05:00');
    expect(store.startNextDayIfDue()).toBe(true);
    expect(store.state.day).toMatchObject({ date: '2026-10-12', startsAt: '00:00' });
    expect(dayRow('2026-10-11')).toBe(frozen);
  });

  it('a day recorded before the setting existed reads as a calendar day', () => {
    const legacy: DayRecord = {
      date: '2026-10-11',
      state: 'closed',
      openingCash: 0,
      countedCash: 0,
      closedAt: at('2026-10-11', '21:00'),
      skippedSections: [],
    };
    open(file).executeSync('CREATE TABLE IF NOT EXISTS day (date TEXT PRIMARY KEY, json TEXT NOT NULL)');
    open(file).executeSync('INSERT INTO day (date, json) VALUES (?, ?)', [legacy.date, JSON.stringify(legacy)]);
    setting('05:00');

    // Under the new setting 02:00 on the 12th is still the 11th, so nothing opens.
    wall = at('2026-10-12', '02:00');
    expect(boot().state.day).toMatchObject({ date: '2026-10-11', state: 'closed' });
    expect(boot().state.day.startsAt).toBeUndefined();
    wall = at('2026-10-12', '05:00');
    expect(boot().state.day).toMatchObject({ date: '2026-10-12', startsAt: '05:00' });
  });

  it('refuses a start that is not a real HH:MM, and changes nothing', () => {
    wall = at('2026-10-11', '09:00');
    const store = boot();
    expect(() => store.setDayStart('25:00')).toThrow();
    expect(store.state.dayStartsAt).toBeUndefined();
  });
});
