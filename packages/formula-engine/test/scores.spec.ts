/**
 * SCORES - the two of docs/spec/SCORES.md, against HAND-WORKED expected values.
 *
 * Every expected figure below is worked in the comment beside it, from the
 * definition in SCORES.md, and never read back from the engine. A test that
 * recomputed the score would agree with any defect in it.
 */
import { describe, it, expect } from 'vitest';
import {
  SCORE_GATES,
  SCORE_WINDOW_DAYS,
  addDays,
  cashConfidence,
  closedDaySummaries,
  customerCreditFold,
  formatBasisPoints,
  operationalConsistency,
  sum,
  toClosedDaySummary,
  SECTIONS,
  type ClosedDaySummary,
  type DayRecord,
  type Entry,
  type Section,
} from '../src/index.ts';

const D0 = '2026-08-01';
const date = (i: number) => addDays(D0, i);

/** One closed day for the cash score. Amounts in paise. */
const cd = (i: number, netSales: number, expected: number, counted: number): ClosedDaySummary => ({
  date: date(i),
  netSales,
  netPurchase: 0,
  totalExpenses: 0,
  profit: netSales,
  expectedCash: expected,
  countedCash: counted,
});

const tenTimes = (p: number) => sum(Array.from({ length: 10 }, () => p));

describe('Cash Confidence - cash half', () => {
  /*
   * 14 closed days. Six balance exactly; eight are off by 100..800 paise, half
   * short and half over. Net sales 1,000.00 every day.
   *   CC-1 exactMatch    = 6 / 14 = 0.428571 -> 4286 bp
   *   CC-2 gaps sorted   = 0 x6, 100, 200, 300, ..., 800. 14 values, so the median
   *                        is the mean of the 7th and 8th = (100 + 200) / 2 = 150.
   *        median sales  = 100000
   *        typicalGap    = 150 / 100000 -> 15 bp
   */
  const COUNTED = [500100, 499800, 500300, 499600, 500500, 499400, 500700, 499200];
  const fourteen = Array.from({ length: 14 }, (_, i) =>
    cd(i, 100000, 500000, i < 8 ? COUNTED[i]! : 500000),
  );

  it('is gated at 14 closed days and says how far along it is', () => {
    expect(SCORE_GATES.cashConfidence).toBe(14);
    expect(cashConfidence(fourteen.slice(0, 13))).toEqual({
      available: false,
      requiredClosedDays: 14,
      closedDaysSoFar: 13,
    });
    expect(cashConfidence([]).available).toBe(false);
  });

  it('matches the hand-worked figures', () => {
    const r = cashConfidence(fourteen);
    if (!r.available) throw new Error('gate should be open');
    expect(r.value.windowDays).toBe(14);
    expect(r.value.exactMatch).toEqual({ numeratorPaise: 6, denominatorPaise: 14, basisPoints: 4286 });
    expect(r.value.typicalGapShare).toEqual({
      numeratorPaise: 150,
      denominatorPaise: 100000,
      basisPoints: 15,
    });
  });

  it('the UPI half and the typed-reason share are null, not zero', () => {
    const r = cashConfidence(fourteen);
    if (!r.available) throw new Error('gate should be open');
    expect(r.value.upi).toBeNull();
    expect(r.value.explainedShare).toBeNull();
  });

  it('reads only the trailing 30 closed days, whatever order they arrive in', () => {
    // 10 old days all short by 1.00, then 30 recent days all balanced: the old
    // ones are outside W, so CC-1 is 30 / 30 and the typical gap is 0.
    const forty = Array.from({ length: 40 }, (_, i) =>
      cd(i, 100000, 500000, i < 10 ? 499900 : 500000),
    );
    const shuffled = [...forty].reverse();
    const r = cashConfidence(shuffled);
    if (!r.available) throw new Error('gate should be open');
    expect(SCORE_WINDOW_DAYS).toBe(30);
    expect(r.value.windowDays).toBe(30);
    expect(r.value.exactMatch.basisPoints).toBe(10000);
    expect(r.value.typicalGapShare.numeratorPaise).toBe(0);
  });

  it('a shop with no sales has an undefined gap share, never 0%', () => {
    const r = cashConfidence(Array.from({ length: 14 }, (_, i) => cd(i, 0, 1000, 900)));
    if (!r.available) throw new Error('gate should be open');
    expect(r.value.typicalGapShare.basisPoints).toBeNull();
  });

  it('BE-08: the same care at ten times the size reads the same', () => {
    const big = fourteen.map((d) => ({
      ...d,
      netSales: tenTimes(d.netSales),
      expectedCash: tenTimes(d.expectedCash),
      countedCash: tenTimes(d.countedCash),
    }));
    const a = cashConfidence(fourteen);
    const b = cashConfidence(big);
    if (!a.available || !b.available) throw new Error('gate should be open');
    expect(b.value.exactMatch.basisPoints).toBe(a.value.exactMatch.basisPoints);
    expect(b.value.typicalGapShare.basisPoints).toBe(a.value.typicalGapShare.basisPoints);
  });
});

/* ------------------------------------------------------------------ */

let n = 0;
const entry = (day: string, section: Entry['section'], extra: Partial<Entry> = {}): Entry => ({
  id: 'e-' + String(++n),
  dayId: day,
  section,
  amount: 10000,
  mode: section === 'upi_sales' ? 'upi' : section === 'udhar_sales' ? 'udhar' : 'cash',
  createdAt: day + 'T10:00:00.000Z',
  source: 'manual',
  ...extra,
});

const day = (d: string, state: DayRecord['state'], skippedSections: Section[] = []): DayRecord => ({
  date: d,
  state,
  openingCash: 0,
  countedCash: state === 'closed' ? 0 : null,
  skippedSections,
});

const ALL_BUT = (...entered: Entry['section'][]) => SECTIONS.filter((s) => !entered.includes(s));

/**
 * The fixture for Operational Consistency.
 *   days 0..13   closed; cash_sales entered, the other 7 skipped. Day 5 also has a
 *                correction entry in `expense` (so 6 skipped there).
 *   days 14, 15  left open (abandoned): cash_sales and expense entered, nothing skipped.
 *   day 16       not_started - a shut shop.
 *   day 17       today, in progress, with an entry.
 *
 *   opened         = 14 + 2 = 16 (not_started and the in-progress day excluded)
 *   OC-1 closing   = 14 / 16 = 0.875 -> 8750 bp
 *   OC-2 accounted = 14 x 8 + 2 x 2 = 116, over 8 x 16 = 128 -> 0.90625 -> 9063 bp
 *   OC-3 entries   = 14 + 1 (correction) + 4 = 19, corrections 1 -> 0.052631 -> 526 bp
 */
function ocFixture() {
  n = 0;
  const days: DayRecord[] = [];
  const entries: Entry[] = [];
  for (let i = 0; i < 14; i += 1) {
    const d = date(i);
    entries.push(entry(d, 'cash_sales'));
    if (i === 5) {
      entries.push(entry(d, 'expense', { correctsDayId: date(2) }));
      days.push(day(d, 'closed', ALL_BUT('cash_sales', 'expense')));
    } else {
      days.push(day(d, 'closed', ALL_BUT('cash_sales')));
    }
  }
  for (const i of [14, 15]) {
    days.push(day(date(i), 'open'));
    entries.push(entry(date(i), 'cash_sales'), entry(date(i), 'expense'));
  }
  days.push(day(date(16), 'not_started'));
  days.push(day(date(17), 'open'));
  entries.push(entry(date(17), 'cash_sales', { correctsDayId: date(3) }));
  return { days, entries, today: date(17) };
}

describe('Operational Consistency', () => {
  it('matches the hand-worked figures', () => {
    const { days, entries, today } = ocFixture();
    const r = operationalConsistency(days, entries, today);
    if (!r.available) throw new Error('gate should be open');
    expect(r.value.windowDays).toBe(16);
    expect(r.value.closingRate).toEqual({ numeratorPaise: 14, denominatorPaise: 16, basisPoints: 8750 });
    expect(r.value.recordingCompleteness).toEqual({
      numeratorPaise: 116,
      denominatorPaise: 128,
      basisPoints: 9063,
    });
    expect(r.value.correctionRate).toEqual({ numeratorPaise: 1, denominatorPaise: 19, basisPoints: 526 });
  });

  it('is gated on CLOSED days: 13 closed and any number open is still not shown', () => {
    const { days, entries, today } = ocFixture();
    const fewer = days.filter((d) => d.date !== date(0));
    expect(operationalConsistency(fewer, entries, today)).toEqual({
      available: false,
      requiredClosedDays: 14,
      closedDaysSoFar: 13,
    });
  });

  it('the day in progress counts once it closes, and not before', () => {
    const { days, entries, today } = ocFixture();
    const closedToday = days.map((d) =>
      d.date === today ? day(today, 'closed', ALL_BUT('cash_sales')) : d,
    );
    const r = operationalConsistency(closedToday, entries, today);
    if (!r.available) throw new Error('gate should be open');
    // 15 of 17 closed -> 8824; 116 + 8 = 124 of 136 -> 9118; 2 corrections in 20 -> 1000.
    expect(r.value.closingRate.basisPoints).toBe(8824);
    expect(r.value.recordingCompleteness).toEqual({
      numeratorPaise: 124,
      denominatorPaise: 136,
      basisPoints: 9118,
    });
    expect(r.value.correctionRate.basisPoints).toBe(1000);
  });

  it('a shut day (not_started) is not a missed close', () => {
    const { days, entries, today } = ocFixture();
    const moreShut = [...days, day(date(18), 'not_started'), day(date(19), 'not_started')];
    const a = operationalConsistency(days, entries, today);
    const b = operationalConsistency(moreShut, entries, today);
    if (!a.available || !b.available) throw new Error('gate should be open');
    expect(b.value).toEqual(a.value);
  });

  it('reads only the trailing 30 opened days', () => {
    n = 0;
    // 10 old abandoned days with nothing in them, then 30 closed fully-skipped days.
    const days: DayRecord[] = [
      ...Array.from({ length: 10 }, (_, i) => day(date(i), 'open')),
      ...Array.from({ length: 30 }, (_, i) => day(date(10 + i), 'closed', [...SECTIONS])),
    ];
    const r = operationalConsistency(days, [], null);
    if (!r.available) throw new Error('gate should be open');
    expect(r.value.windowDays).toBe(30);
    expect(r.value.closingRate.basisPoints).toBe(10000);
    expect(r.value.recordingCompleteness.basisPoints).toBe(10000);
    // No entries in W: the correction rate is undefined, not zero.
    expect(r.value.correctionRate.basisPoints).toBeNull();
  });
});

/* ------------------------------------------------------------------ */

describe('customerCreditFold - BI6 input and baseline in one replay', () => {
  /*
   * d1: A 400, B 300, C 200, D 100 on udhar. Total 1000, top three 900 -> 9000 bp.
   * d2: A pays 400.         B 300, C 200, D 100. Total 600, top three 600 -> 10000.
   * d3: A takes 100 again.  B 300, C 200, A 100, D 100 (tie broken by id: A).
   *                         Total 700, top three 600 -> 0.857142 -> 8571 bp.
   * A cash sale and an udhar line with no party are ignored throughout.
   */
  const d1 = date(1);
  const d2 = date(2);
  const d3 = date(3);
  const credit = (d: string, section: Entry['section'], partyId: string | undefined, amount: number) =>
    entry(d, section, partyId === undefined ? { amount } : { amount, partyId });
  const entries = [
    credit(d3, 'udhar_sales', 'A', 100),
    credit(d1, 'udhar_sales', 'A', 400),
    credit(d1, 'udhar_sales', 'B', 300),
    credit(d1, 'udhar_sales', 'C', 200),
    credit(d1, 'udhar_sales', 'D', 100),
    credit(d1, 'udhar_sales', undefined, 5000),
    credit(d1, 'cash_sales', 'A', 9999),
    credit(d2, 'udhar_collection', 'A', 400),
  ];

  it('the open balances, each aged from when it last rose above zero', () => {
    const { open } = customerCreditFold(entries, []);
    expect([...open].sort((a, b) => a.partyId.localeCompare(b.partyId))).toEqual([
      { partyId: 'A', amount: 100, since: d3 },
      { partyId: 'B', amount: 300, since: d1 },
      { partyId: 'C', amount: 200, since: d1 },
      { partyId: 'D', amount: 100, since: d1 },
    ]);
  });

  it('the top-three share at each requested close, and only those', () => {
    expect(customerCreditFold(entries, [d1, d2, d3]).top3BasisPointsAtClose).toEqual([9000, 10000, 8571]);
    expect(customerCreditFold(entries, [d1, d3]).top3BasisPointsAtClose).toEqual([9000, 8571]);
  });

  it('entries already in day order give the same answer as shuffled ones', () => {
    const inOrder = [...entries.slice(1, 8), entries[0]!];
    expect(customerCreditFold(inOrder, [d1, d2, d3])).toEqual(customerCreditFold(entries, [d1, d2, d3]));
  });
});

describe('closedDaySummaries - one pass, closed days only, oldest first', () => {
  it('equals toClosedDaySummary of each closed day, and skips the open one', () => {
    n = 0;
    const days: DayRecord[] = [
      { ...day(date(2), 'closed'), openingCash: 1000, countedCash: 30000 },
      day(date(3), 'open'),
      { ...day(date(1), 'closed'), openingCash: 0, countedCash: 10000 },
    ];
    const entries = [
      entry(date(1), 'cash_sales'),
      entry(date(2), 'cash_sales'),
      entry(date(2), 'expense'),
      entry(date(3), 'cash_sales'),
    ];
    const got = closedDaySummaries(days, entries);
    const of = (d: DayRecord) =>
      toClosedDaySummary({
        day: d,
        entries: entries.filter((e) => e.dayId === d.date),
        priorCreditOutstanding: 0,
        priorSupplierOutstanding: 0,
      });
    expect(got).toEqual([of(days[2]!), of(days[0]!)]);
    // The hand figure for day 1: opening 0 + one cash sale of 100.00.
    expect(got[0]!.expectedCash).toBe(10000);
    // `last` keeps the most recent closed days only, still oldest first.
    expect(closedDaySummaries(days, entries, 1)).toEqual([of(days[0]!)]);
    expect(closedDaySummaries(days, entries, 5)).toEqual(got);
  });
});

describe('formatBasisPoints - the render boundary for a ratio', () => {
  it.each([
    [1234, '12.3%'],
    [15, '0.2%'],
    [0, '0.0%'],
    [10000, '100.0%'],
    [-55, '-0.6%'],
    [8571, '85.7%'],
  ])('%d bp reads %s', (bp, out) => {
    expect(formatBasisPoints(bp)).toBe(out);
  });

  it('an undefined ratio is a dash, never 0%', () => {
    expect(formatBasisPoints(null)).toBe('-');
  });
});
