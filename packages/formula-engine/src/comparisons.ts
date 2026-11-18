/**
 * PR-4 · COMPARISONS (Premium): same period last year, festival weeks, how long
 * each named customer takes to pay, and the returns and adjustments trend
 * (R2 §3 items 6-8, R3 §4.1).
 *
 * Every one of these is an OBSERVATION from recorded facts, stated as something
 * to review - never a verdict on a customer and never an instruction (CLAUDE.md,
 * "No inference in data entry"). Pure and clock-free: `today` is passed in.
 */
import { medianMoney, sum, type Paise } from './money.ts';
import { addDays, parseIsoDate, type IsoDate } from './dates.ts';
import { computePrimary } from './primary.ts';
import { dayInputs, partyLedgerFold, type Book } from './reports-basic.ts';
import type { DayInput } from './types.ts';

/* ------------------------------------------------------------------ *
 * The festival table - data, not inference
 * ------------------------------------------------------------------ */

/**
 * FESTIVAL DATES, SHIPPED AS DATA (R3 §4.1: "never guessed from the sales curve").
 *
 * SOURCE: the closed (gazetted) holidays for Central Government offices, Delhi /
 * New Delhi, in the Department of Personnel & Training's Office Memorandum
 * F.No.12/2/2023-JCA - dated 09.07.2024 for 2025, and 03.07.2025 for 2026. Read
 * 2026-10-26 as reproduced at staffnews.in:
 *   https://www.staffnews.in/2024/07/gazetted-holidays-year-2025.html
 *   https://www.staffnews.in/2025/07/list-of-holidays-2026-closed-holidays.html
 * The primary O.M. text was not fetched; re-check against dopt.gov.in.
 *
 * ONLY THE YEARS THAT SOURCE COVERS. Earlier years are left out rather than
 * computed from a calendar rule. The O.M. itself says Id dates may shift with the
 * sighting of the moon, and that some states keep Diwali a day earlier; the
 * national date is used as given. Odisha's own festivals (Rath Yatra, Raja) are
 * not here: no state notification was cited, so none is shipped.
 */
export const FESTIVALS = [
  { key: 'holi', date: '2025-03-14' },
  { key: 'id_ul_fitr', date: '2025-03-31' },
  { key: 'id_ul_zuha', date: '2025-06-07' },
  { key: 'dussehra', date: '2025-10-02' },
  { key: 'diwali', date: '2025-10-20' },
  { key: 'holi', date: '2026-03-04' },
  { key: 'id_ul_fitr', date: '2026-03-21' },
  { key: 'id_ul_zuha', date: '2026-05-27' },
  { key: 'dussehra', date: '2026-10-20' },
  { key: 'diwali', date: '2026-11-08' },
] as const;
export type FestivalKey = (typeof FESTIVALS)[number]['key'];

/* ------------------------------------------------------------------ *
 * A span of days
 * ------------------------------------------------------------------ */

export interface Span {
  readonly from: IsoDate;
  readonly to: IsoDate;
  /** Net sales over the CLOSED days in the span. An open day is not finished. */
  readonly netSales: Paise;
  readonly closedDays: number;
}

function span(inputs: readonly DayInput[], from: IsoDate, to: IsoDate): Span {
  const closed = inputs.filter((i) => i.day.state === 'closed' && i.day.date >= from && i.day.date <= to);
  return {
    from,
    to,
    netSales: sum(closed.map((i) => computePrimary(i).p4NetSales.value)),
    closedDays: closed.length,
  };
}

/** The same calendar date a year earlier; 29 February becomes 28 February. */
export function sameDateLastYear(date: IsoDate): IsoDate {
  const { y, m, d } = parseIsoDate(date);
  const dd = m === 2 && d === 29 ? 28 : d;
  return `${y - 1}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/** This month up to today, against the same dates a year ago. */
export function samePeriodLastYear(book: Book, today: IsoDate): { thisYear: Span; lastYear: Span } {
  const inputs = dayInputs(book);
  const from = today.slice(0, 8) + '01';
  return {
    thisYear: span(inputs, from, today),
    lastYear: span(inputs, sameDateLastYear(from), sameDateLastYear(today)),
  };
}

export interface FestivalWeek {
  readonly key: FestivalKey;
  readonly date: IsoDate;
  /** The seven days ending on the festival. */
  readonly week: Span;
  /** The seven days before that: the ordinary week it is read against. */
  readonly weekBefore: Span;
}

/**
 * Each festival on or before `today` whose week has at least one closed day -
 * before that, nothing is shown (R3 §4.2). Newest first.
 */
export function festivalWeeks(book: Book, today: IsoDate): FestivalWeek[] {
  const inputs = dayInputs(book);
  return FESTIVALS.filter((f) => f.date <= today)
    .map((f) => ({
      key: f.key,
      date: f.date,
      week: span(inputs, addDays(f.date, -6), f.date),
      weekBefore: span(inputs, addDays(f.date, -13), addDays(f.date, -7)),
    }))
    .filter((f) => f.week.closedDays > 0)
    .reverse();
}

/* ------------------------------------------------------------------ *
 * Days each named customer takes to pay
 * ------------------------------------------------------------------ */

export interface DaysToPay {
  readonly partyId: string;
  /** Credit lines paid off in full, first in first out. */
  readonly settledCount: number;
  /** Median days from credit to the last of it paid, over those lines. */
  readonly medianDays: number;
  readonly slowestDays: number;
}

/**
 * HOW LONG EACH NAMED CUSTOMER USUALLY TAKES TO PAY. An observation about the
 * past, never a credit decision about the customer (R2 §3 item 7). Only lines
 * paid off in full count; the slowest first.
 */
export function daysToPay(book: Book): DaysToPay[] {
  return partyLedgerFold(book.entries, 'customer')
    .filter((p) => p.settled.length > 0)
    .map((p) => {
      const days = p.settled.map((s) => s.days);
      return {
        partyId: p.partyId,
        settledCount: days.length,
        // A median of whole day counts, through the audited integer median.
        medianDays: medianMoney(days)!,
        slowestDays: Math.max(...days),
      };
    })
    .sort((a, b) => b.medianDays - a.medianDays);
}

/* ------------------------------------------------------------------ *
 * Returns and adjustments, week by week
 * ------------------------------------------------------------------ */

export interface ReturnsWeek {
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly returns: Paise;
  readonly returnCount: number;
  readonly adjustments: Paise;
  readonly adjustmentCount: number;
}

/** The last `weeks` seven-day spans ending on `today`, oldest first. */
export function returnsTrend(book: Book, today: IsoDate, weeks: number): ReturnsWeek[] {
  const out: ReturnsWeek[] = [];
  for (let w = weeks - 1; w >= 0; w -= 1) {
    const to = addDays(today, -7 * w);
    const from = addDays(to, -6);
    const inSpan = (d: IsoDate) => d >= from && d <= to;
    const rets = book.entries.filter((e) => e.section === 'sales_return' && inSpan(e.dayId));
    const adjs = (book.adjustments ?? []).filter((a) => inSpan(a.dayId));
    out.push({
      from,
      to,
      returns: sum(rets.map((e) => e.amount)),
      returnCount: rets.length,
      adjustments: sum(adjs.map((a) => a.amount)),
      adjustmentCount: adjs.length,
    });
  }
  return out;
}
