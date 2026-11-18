/**
 * PR-3 · SALES FORECAST FOR THE COMING DAYS - an estimate, gated twice
 * (docs/research/R3-ai-strategy.md §4).
 *
 * TWO METHODS, both explainable in one sentence:
 *   seasonal naive (m = 7)  "next Tuesday ~ the last Tuesday he closed" - FPP3 §5.8
 *   Holt-Winters, additive  level + trend + weekday effect             - FPP3 ch. 8
 *
 * TWO GATES, BOTH MUST PASS (R3 §4.2):
 *   1. Enough history: 14 closed days for seasonal naive, 56 for Holt-Winters
 *      (R3's proposals, fixed here as exact integers the way BI_GATES is).
 *   2. Beats "same as last week" on the shop's own past: Holt-Winters is shown
 *      only when its MASE is below 1, where MASE here is its mean absolute error
 *      divided by seasonal naive's, over the SAME backtest forecasts (rolling
 *      origin, horizons 1-7, the last 28 calendar days). Seasonal naive is the
 *      scale, so its own MASE is 1 by definition and it is what is shown when
 *      Holt-Winters has not earned the screen.
 *
 * WHAT GOES OUT WITH EVERY FORECAST (R3 §4.3): the method, the history window and
 * day count, an 80% range from the backtest's own errors (10th to 90th percentile,
 * nearest rank), the typical miss in rupees, and - on the screen - the word
 * "estimate". Never "you will sell", never an instruction to order.
 *
 * NUMBERS. The smoothing runs in floating point internally, the way `stdevMoney`
 * does; weights are integer basis points (no decimal literal in the engine), and
 * every figure handed out is rounded to whole paise once, half away from zero.
 * A sales forecast below zero is shown as zero: no shop forecasts negative takings.
 *
 * CLOCK-FREE (ADR-012): `today` is passed in. The shop's closed days are passed in.
 */
import { assertPaise, roundHalfAwayFromZero, type Paise } from './money.ts';
import { addDays, daysBetween, type IsoDate } from './dates.ts';
import { gate, type ClosedDaySummary, type Gated } from './types.ts';

export const FORECAST_GATES = { seasonalNaive: 14, holtWinters: 56 } as const;
export const FORECAST_HORIZON_DAYS = 7;
/** The backtest window, in calendar days ending on `today`. Four weeks: a named choice. */
export const FORECAST_BACKTEST_DAYS = 28;
/** At most this many of the latest closed days are used. Sixteen weeks: a named choice. */
export const FORECAST_HISTORY_DAYS = 112;
const SEASON = 7;
const BP = 10000;

/** The smoothing-weight grid, in basis points, searched on the history before the backtest. */
export const HOLT_WINTERS_GRID = {
  alpha: [1000, 2000, 3000, 5000, 7000, 9000],
  beta: [0, 500, 1000, 2000],
  gamma: [500, 1000, 2000, 4000],
} as const;

export type ForecastMethod = 'seasonal_naive' | 'holt_winters';

export interface ForecastDay {
  readonly date: IsoDate;
  readonly point: Paise;
  /** The 80% range from the backtest errors; null when the backtest had no day to test on. */
  readonly low: Paise | null;
  readonly high: Paise | null;
}

export interface SalesForecast {
  readonly method: ForecastMethod;
  /** Only days whose weekday the shop has a closed day for; a weekday never traded is not guessed. */
  readonly days: readonly ForecastDay[];
  readonly historyFrom: IsoDate;
  readonly historyTo: IsoDate;
  readonly historyDays: number;
  /** How many (day, horizon) forecasts the backtest scored for the method shown. */
  readonly backtestPoints: number;
  /** Mean absolute error of the method shown, over the backtest. Null with no backtest. */
  readonly typicalMiss: Paise | null;
  /** Holt-Winters' MASE x 10000 when it was tried (56+ days); below 10000 means it beat seasonal naive. */
  readonly holtWintersMaseBasisPoints: number | null;
  readonly holtWintersGate: { readonly required: number; readonly soFar: number };
}

type Series = readonly (number | null)[];

/** "Same as last week": the latest same-weekday value at or before `origin`. */
function seasonalNaiveFrom(y: Series, origin: number, t: number): number | null {
  for (let k = t - SEASON; k >= 0; k -= SEASON) {
    if (k <= origin && y[k] !== null) return y[k]!;
  }
  return null;
}

interface HwState {
  readonly level: number;
  readonly trend: number;
  readonly season: readonly number[];
}

const mean = (xs: readonly number[]): number => xs.reduce((acc, v) => acc + v, 0) / xs.length;

/**
 * Additive Holt-Winters over the calendar series. A day with no closed figure
 * is filled with the model's own one-step forecast, so it moves no state.
 * Initialised from the first two weeks: level = their mean, trend = 0, each
 * weekday's effect = its mean minus the level (0 for a weekday not yet seen).
 * Returns the state after each day, and the one-step squared error over
 * `[from, to)`.
 */
function holtWinters(
  y: Series,
  alphaBp: number,
  betaBp: number,
  gammaBp: number,
  from: number,
  to: number,
): { states: HwState[]; sse: number } {
  const a = alphaBp / BP;
  const b = betaBp / BP;
  const g = gammaBp / BP;
  const init = y.slice(0, SEASON * 2);
  let level = mean(init.filter((v): v is number => v !== null));
  let trend = 0;
  const season = Array.from({ length: SEASON }, (_, p) => {
    const same = init.filter((v, t): v is number => v !== null && t % SEASON === p);
    return same.length === 0 ? 0 : mean(same) - level;
  });
  const states: HwState[] = [];
  let sse = 0;
  for (let t = 0; t < y.length; t += 1) {
    const p = t % SEASON;
    const f = level + trend + season[p]!;
    const obs = y[t] ?? f;
    if (t >= from && t < to) sse += (obs - f) * (obs - f);
    const next = a * (obs - season[p]!) + (1 - a) * (level + trend);
    trend = b * (next - level) + (1 - b) * trend;
    level = next;
    season[p] = g * (obs - level) + (1 - g) * season[p]!;
    states.push({ level, trend, season: [...season] });
  }
  return { states, sse };
}

const hwFrom = (s: HwState, origin: number, t: number): number =>
  s.level + (t - origin) * s.trend + s.season[t % SEASON]!;

const meanAbs = (errs: readonly number[]): number => mean(errs.map(Math.abs));

/** Nearest-rank percentile of a non-empty sorted list. */
const percentile = (sorted: readonly number[], pct: number): number =>
  sorted[Math.max(0, Math.ceil((pct * sorted.length) / 100) - 1)]!;

const toPaise = (x: number): Paise => assertPaise(Math.max(0, roundHalfAwayFromZero(x)), 'forecast');

/**
 * The forecast for the seven days after `today`, from the shop's closed days.
 * Closed days after `today` are ignored; any order is accepted.
 */
export function salesForecast(closed: readonly ClosedDaySummary[], today: IsoDate): Gated<SalesForecast> {
  const known = closed
    .filter((d) => d.date <= today)
    .sort((x, z) => x.date.localeCompare(z.date));
  return gate(FORECAST_GATES.seasonalNaive, known.length, () => {
    const used = known.slice(-FORECAST_HISTORY_DAYS);
    const start = used[0]!.date;
    const last = daysBetween(start, today);
    const y: (number | null)[] = Array.from({ length: last + 1 }, () => null);
    for (const d of used) y[daysBetween(start, d.date)] = d.netSales;

    // Fitted on the history BEFORE the backtest window only, so the backtest is honest.
    const trainEnd = y.length - FORECAST_BACKTEST_DAYS;
    let best: { states: HwState[]; sse: number } | null = null;
    if (known.length >= FORECAST_GATES.holtWinters) {
      for (const al of HOLT_WINTERS_GRID.alpha)
        for (const be of HOLT_WINTERS_GRID.beta)
          for (const ga of HOLT_WINTERS_GRID.gamma) {
            const fit = holtWinters(y, al, be, ga, SEASON * 2, trainEnd);
            if (best === null || fit.sse < best.sse) best = fit;
          }
    }

    // Rolling origin over the backtest window, horizons 1-7.
    const snErr: number[] = [];
    const pairSn: number[] = [];
    const pairHw: number[] = [];
    for (let t = Math.max(0, trainEnd); t <= last; t += 1) {
      if (y[t] === null) continue;
      for (let h = 1; h <= FORECAST_HORIZON_DAYS; h += 1) {
        const o = t - h;
        const sn = seasonalNaiveFrom(y, o, t);
        if (sn === null) continue;
        snErr.push(y[t]! - sn);
        if (best !== null && o >= SEASON * 2 - 1) {
          pairSn.push(y[t]! - sn);
          pairHw.push(y[t]! - hwFrom(best.states[o]!, o, t));
        }
      }
    }
    const maseBp =
      pairSn.length > 0 && meanAbs(pairSn) > 0
        ? roundHalfAwayFromZero((meanAbs(pairHw) * BP) / meanAbs(pairSn))
        : null;
    const method: ForecastMethod = maseBp !== null && maseBp < BP ? 'holt_winters' : 'seasonal_naive';
    const errs = method === 'holt_winters' ? pairHw : snErr;
    const sorted = [...errs].sort((x, z) => x - z);

    const days: ForecastDay[] = [];
    for (let h = 1; h <= FORECAST_HORIZON_DAYS; h += 1) {
      const t = last + h;
      const sn = seasonalNaiveFrom(y, last, t);
      if (sn === null) continue;
      const raw = method === 'holt_winters' ? hwFrom(best!.states[last]!, last, t) : sn;
      const low = sorted.length === 0 ? null : toPaise(raw + percentile(sorted, 10));
      days.push({
        date: addDays(today, h),
        point: toPaise(raw),
        low,
        high: low === null ? null : Math.max(low, toPaise(raw + percentile(sorted, 90))),
      });
    }

    return {
      method,
      days,
      historyFrom: start,
      historyTo: used[used.length - 1]!.date,
      historyDays: used.length,
      backtestPoints: errs.length,
      typicalMiss: errs.length === 0 ? null : toPaise(meanAbs(errs)),
      holtWintersMaseBasisPoints: maseBp,
      holtWintersGate: { required: FORECAST_GATES.holtWinters, soFar: known.length },
    };
  });
}
