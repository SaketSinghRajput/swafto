/**
 * DECISION 1 - THE RETAILER-DEFINED BUSINESS DAY, in the engine.
 *
 * The 77 vectors are calendar days and stay exactly as they are: a day with no
 * `startsAt` is '00:00', which is what they always were. These cases are the
 * boundary itself - the minute a late sale stops being yesterday's.
 */
import { describe, it, expect } from 'vitest';
import { businessDate, dayHasEnded, dayStartMinutes, MIDNIGHT } from '../src/dates.ts';

// The phone's own stamp (localIso), Odisha offset. The hh:mm is read as written.
const at = (date: string, hhmm: string) => `${date}T${hhmm}:00.000+05:30`;

describe('businessDate - which day a wall-clock moment belongs to', () => {
  it('00:30 on the 12th with a 05:00 start is the 11th', () => {
    expect(businessDate(at('2026-10-12', '00:30'), '05:00')).toBe('2026-10-11');
  });

  it('04:59 is still the 11th; 05:00 exactly is the 12th', () => {
    expect(businessDate(at('2026-10-12', '04:59'), '05:00')).toBe('2026-10-11');
    expect(businessDate(at('2026-10-12', '05:00'), '05:00')).toBe('2026-10-12');
  });

  it('crosses a month and a year the way the calendar does', () => {
    expect(businessDate(at('2027-01-01', '02:00'), '03:00')).toBe('2026-12-31');
    expect(businessDate(at('2028-03-01', '01:00'), '06:00')).toBe('2028-02-29');
  });

  it('a 00:00 start is the calendar day, at every minute of it', () => {
    for (const hhmm of ['00:00', '00:30', '04:59', '05:00', '12:00', '23:59']) {
      expect(businessDate(at('2026-10-12', hhmm), MIDNIGHT)).toBe('2026-10-12');
      expect(businessDate(at('2026-10-12', hhmm))).toBe('2026-10-12');
    }
  });

  it('a bare date is a business date already chosen, and is returned unchanged', () => {
    expect(businessDate('2026-10-12', '05:00')).toBe('2026-10-12');
  });

  it('refuses what is not a real time or a real start', () => {
    expect(() => businessDate('2026-10-12T24:00:00.000+05:30', '05:00')).toThrow();
    expect(() => businessDate('2026-02-30T10:00:00.000+05:30')).toThrow();
    expect(() => businessDate('12/10/2026 00:30')).toThrow();
    for (const bad of ['5:00', '24:00', '05:60', '', '05:00:00']) {
      expect(() => dayStartMinutes(bad), bad).toThrow();
    }
    expect(dayStartMinutes('05:30')).toBe(330);
  });
});

describe("dayHasEnded - by the day's own rule, never the current setting", () => {
  it('a 05:00 day of the 11th is still running at 00:30 on the 12th', () => {
    const day = { date: '2026-10-11', startsAt: '05:00' };
    expect(dayHasEnded(day, at('2026-10-12', '00:30'))).toBe(false);
    expect(dayHasEnded(day, at('2026-10-12', '05:00'))).toBe(true);
  });

  it('a day recorded before the setting existed is a calendar day', () => {
    const legacy = { date: '2026-10-11' };
    expect(dayHasEnded(legacy, at('2026-10-11', '23:59'))).toBe(false);
    expect(dayHasEnded(legacy, at('2026-10-12', '00:00'))).toBe(true);
  });
});
