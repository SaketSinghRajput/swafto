/**
 * PR-3 SALES FORECAST - the two gates and what goes out with a forecast.
 *
 * The seasonal-naive figures are worked by hand in the comments: that method is
 * "the last same weekday", so every expected value can be read off the series.
 * Holt-Winters' exact output cannot be worked by hand, so its tests assert the
 * rule instead - it is shown only when it beats seasonal naive on the backtest -
 * on series where which method must win is known in advance.
 */
import { describe, it, expect } from 'vitest';
import {
  FORECAST_GATES,
  addDays,
  salesForecast,
  type ClosedDaySummary,
} from '../src/index.ts';

const D0 = '2026-06-01';
const series = (vals: readonly (number | null)[]): ClosedDaySummary[] =>
  vals.flatMap((v, i) =>
    v === null
      ? []
      : [{ date: addDays(D0, i), netSales: v, netPurchase: 0, totalExpenses: 0, profit: v, countedCash: 0, expectedCash: 0 }],
  );
const WEEK = [10000, 20000, 30000, 40000, 50000, 60000, 70000];
const repeat = (days: number, f: (k: number) => number | null) => Array.from({ length: days }, (_, k) => f(k));

describe('gate 1 - enough history', () => {
  it('14 closed days for seasonal naive, 56 for Holt-Winters', () => {
    expect(FORECAST_GATES).toEqual({ seasonalNaive: 14, holtWinters: 56 });
  });

  it('13 closed days is not a forecast, and says how far along it is', () => {
    const s = series(repeat(13, (k) => WEEK[k % 7]!));
    expect(salesForecast(s, addDays(D0, 12))).toEqual({ available: false, requiredClosedDays: 14, closedDaysSoFar: 13 });
  });

  it('a closed day after "today" does not count towards it', () => {
    const s = series(repeat(14, (k) => WEEK[k % 7]!));
    expect(salesForecast(s, addDays(D0, 12))).toMatchObject({ available: false, closedDaysSoFar: 13 });
  });
});

describe('seasonal naive - "same as the last same weekday"', () => {
  it('two identical weeks: next week is the same week, with no range to speak of', () => {
    // 1-14 June, two copies of WEEK. Forecast 15-21 June = WEEK again.
    // Backtest: targets 8-14 June (index 7-13) x horizons 1-7 = 49 forecasts, every error 0.
    const r = salesForecast(series(repeat(14, (k) => WEEK[k % 7]!)), addDays(D0, 13));
    if (!r.available) throw new Error('gate');
    expect(r.value.method).toBe('seasonal_naive');
    expect(r.value.days).toEqual(WEEK.map((v, i) => ({ date: addDays(D0, 14 + i), point: v, low: v, high: v })));
    expect(r.value).toMatchObject({
      historyFrom: '2026-06-01',
      historyTo: '2026-06-14',
      historyDays: 14,
      backtestPoints: 49,
      typicalMiss: 0,
      holtWintersMaseBasisPoints: null,
      holtWintersGate: { required: 56, soFar: 14 },
    });
  });

  it('the 80% range is the 10th to 90th percentile of its own past errors; never below zero', () => {
    /*
     * Week 2 = week 1 plus a different shift per weekday:
     *   shift = -700, -100, 0, 100, 200, 300, 900 (paise)
     * Each backtest target is scored at 7 horizons, all from the previous week,
     * so the 49 errors are 7 copies of each shift. Nearest rank: the 10th
     * percentile is item ceil(4.9) = 5 of 49 = -700; the 90th is item ceil(44.1)
     * = 45 = 900. Typical miss = (700+100+0+100+200+300+900) / 7 = 328.57 -> 329.
     * Monday's point is week 2's 1,000 - 700 = 300 paise; 300 - 700 < 0 -> low 0.
     * Tuesday: 20,000 - 100 = 19,900; range 19,200 to 20,800.
     */
    const SHIFT = [-700, -100, 0, 100, 200, 300, 900];
    const W1 = [1000, 20000, 30000, 40000, 50000, 60000, 70000];
    const r = salesForecast(series(repeat(14, (k) => (k < 7 ? W1[k]! : W1[k - 7]! + SHIFT[k - 7]!))), addDays(D0, 13));
    if (!r.available) throw new Error('gate');
    expect(r.value.typicalMiss).toBe(329);
    expect(r.value.days[0]).toEqual({ date: '2026-06-15', point: 300, low: 0, high: 1200 });
    expect(r.value.days[1]).toEqual({ date: '2026-06-16', point: 19900, low: 19200, high: 20800 });
  });

  it('a weekday the shop never closed on is not forecast at all', () => {
    // 21 days, closed every day but the fourth weekday (index 3, 10, 17): 18 closed days.
    const r = salesForecast(series(repeat(21, (k) => (k % 7 === 3 ? null : WEEK[k % 7]!))), addDays(D0, 20));
    if (!r.available) throw new Error('gate');
    expect(r.value.days.map((d) => d.date)).toEqual([0, 1, 2, 4, 5, 6].map((i) => addDays(D0, 21 + i)));
  });

  it('with no closed day in the backtest window there is a point but no range', () => {
    // 14 closed days, then 40 days of nothing up to today: the last 28 hold no figure.
    const r = salesForecast(series(repeat(14, (k) => WEEK[k % 7]!)), addDays(D0, 53));
    if (!r.available) throw new Error('gate');
    expect(r.value.backtestPoints).toBe(0);
    expect(r.value.typicalMiss).toBeNull();
    expect(r.value.days).toHaveLength(7);
    expect(r.value.days.every((d) => d.low === null && d.high === null)).toBe(true);
  });
});

describe('gate 2 - Holt-Winters only when it beats "same as last week"', () => {
  it('a steady rise: last week is always a week behind, so the trend method wins', () => {
    /*
     * Sales rise 10 rupees a day on top of the weekday pattern. Same-as-last-week
     * misses by exactly 7 days x 1,000 = 7,000 paise on every forecast; a model
     * with a trend can track it, so its MASE must come in under 1.
     */
    const r = salesForecast(series(repeat(63, (k) => 100000 + 1000 * k + WEEK[k % 7]!)), addDays(D0, 62));
    if (!r.available) throw new Error('gate');
    expect(r.value.method).toBe('holt_winters');
    expect(r.value.holtWintersMaseBasisPoints!).toBeLessThan(10000);
    expect(r.value.typicalMiss!).toBeLessThan(7000);
    r.value.days.forEach((d, i) => {
      const truth = 100000 + 1000 * (63 + i) + WEEK[(63 + i) % 7]!;
      expect(Math.abs(d.point - truth)).toBeLessThan(7000);
    });
  });

  it('a perfectly repeating week leaves nothing to beat: seasonal naive is shown', () => {
    // Seasonal naive's backtest error is 0, so there is no scale and no MASE.
    const r = salesForecast(series(repeat(63, (k) => 100000 + WEEK[k % 7]!)), addDays(D0, 62));
    if (!r.available) throw new Error('gate');
    expect(r.value.method).toBe('seasonal_naive');
    expect(r.value.holtWintersMaseBasisPoints).toBeNull();
  });

  it('when Holt-Winters is tried and does not beat it, seasonal naive is shown with the score that lost', () => {
    /*
     * The weekday pattern turns round on day 42 and stays turned. Same-as-last-
     * week is wrong for one week and then exactly right; a weekday effect smoothed
     * at no more than 0.4 a week is still catching up three weeks later.
     */
    const r = salesForecast(
      series(repeat(63, (k) => 100000 + (k < 42 ? WEEK[k % 7]! : WEEK[6 - (k % 7)]!))),
      addDays(D0, 62),
    );
    if (!r.available) throw new Error('gate');
    expect(r.value.holtWintersMaseBasisPoints).not.toBeNull();
    expect(r.value.holtWintersMaseBasisPoints!).toBeGreaterThanOrEqual(10000);
    expect(r.value.method).toBe('seasonal_naive');
  });

  it('a near miss is still a miss: Holt-Winters only a little worse is not shown', () => {
    /*
     * The same turn, one week from the end (day 56 of 63). Measured when this
     * test was written: MASE 1.0744 - just over the line. This is the case that
     * fails if the "below 1" gate is ever loosened to anything above 1.07.
     */
    const r = salesForecast(
      series(repeat(63, (k) => 100000 + (k < 56 ? WEEK[k % 7]! : WEEK[6 - (k % 7)]!))),
      addDays(D0, 62),
    );
    if (!r.available) throw new Error('gate');
    expect(r.value.holtWintersMaseBasisPoints!).toBeGreaterThanOrEqual(10000);
    expect(r.value.holtWintersMaseBasisPoints!).toBeLessThan(11000);
    expect(r.value.method).toBe('seasonal_naive');
  });

  it('a shop shut one weekday: Holt-Winters still runs, and that weekday is still not forecast', () => {
    // 70 days, the fourth weekday never closed: 60 closed days, past the 56 gate.
    const r = salesForecast(
      series(repeat(70, (k) => (k % 7 === 3 ? null : 100000 + 1000 * k + WEEK[k % 7]!))),
      addDays(D0, 69),
    );
    if (!r.available) throw new Error('gate');
    expect(r.value.holtWintersGate).toEqual({ required: 56, soFar: 60 });
    expect(r.value.holtWintersMaseBasisPoints).not.toBeNull();
    // Day 70 + i; weekday 3 is day 73.
    expect(r.value.days.map((d) => d.date)).toEqual([0, 1, 2, 4, 5, 6].map((i) => addDays(D0, 70 + i)));
  });

  it('is clock-free and order-free: the same days and the same "today" give the same answer', () => {
    const s = series(repeat(63, (k) => 100000 + 1000 * k + WEEK[k % 7]!));
    expect(salesForecast([...s].reverse(), addDays(D0, 62))).toEqual(salesForecast(s, addDays(D0, 62)));
  });
});
