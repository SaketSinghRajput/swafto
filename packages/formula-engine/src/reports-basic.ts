/**
 * FR-7 · THE FREE BASIC REPORTS (docs/research/R5-free-premium-plan.md, R2 §3).
 *
 *   1. Who owes me, by age - and what I owe suppliers, by age - oldest first.
 *   2. Month at a glance: sales by mode, expenses, estimated profit, and what was
 *      taken home, shown OUTSIDE profit (D3).
 *   3. Cash-check history: each closed day's expected against counted, and why.
 *   4. Confirmed UPI per month (decision 3).
 *
 * PURE AND CLOCK-FREE (ADR-012): "today" and the month are passed in. Everything
 * is derived on the call from what was typed; nothing here is kept (no stored
 * totals). Every figure is only as complete as what was entered, and the screen
 * says so.
 */
import { assertPaise, subtract, sum, type Paise } from './money.ts';
import { addDays, daysBetween, type IsoDate } from './dates.ts';
import { computePrimary } from './primary.ts';
import { dailyCashHealth } from './operational.ts';
import { upiCheck } from './upi.ts';
import type { Adjustment, DayInput, DayRecord, Entry, UpiConfirmation } from './types.ts';

/* ------------------------------------------------------------------ *
 * Shared: the book, grouped by day once
 * ------------------------------------------------------------------ */

/** Everything recorded, across days. Passed in; never fetched. */
export interface Book {
  readonly days: readonly DayRecord[];
  readonly entries: readonly Entry[];
  readonly adjustments?: readonly Adjustment[];
  readonly upiConfirmations?: readonly UpiConfirmation[];
}

function groupByDay<T extends { readonly dayId: IsoDate }>(rows: readonly T[]): Map<IsoDate, T[]> {
  const out = new Map<IsoDate, T[]>();
  for (const r of rows) {
    const list = out.get(r.dayId);
    if (list) list.push(r);
    else out.set(r.dayId, [r]);
  }
  return out;
}

const byDate = (a: IsoDate, b: IsoDate): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * One DayInput per day record, oldest first. Prior outstanding is 0 because no
 * figure read from these (P3, P4-P6, profit, the UPI check) depends on it.
 */
export function dayInputs(book: Book): DayInput[] {
  const entries = groupByDay(book.entries);
  const adjustments = groupByDay(book.adjustments ?? []);
  const confirmations = groupByDay(book.upiConfirmations ?? []);
  return [...book.days]
    .sort((a, b) => byDate(a.date, b.date))
    .map((day) => ({
      day,
      entries: entries.get(day.date) ?? [],
      adjustments: adjustments.get(day.date) ?? [],
      upiConfirmations: confirmations.get(day.date) ?? [],
      priorCreditOutstanding: 0,
      priorSupplierOutstanding: 0,
    }));
}

/* ------------------------------------------------------------------ *
 * 1 · Dues by age
 * ------------------------------------------------------------------ */

/**
 * THE AGE BUCKETS, A DESIGN CHOICE: 0-30, 31-60, 61-90 and over 90 days, as R2
 * §3 lists them for "who owes me, by age". `to: null` is open-ended. Age is
 * counted in calendar days from the day the credit was given to `today`.
 */
export const DUE_AGE_BUCKETS = [
  { from: 0, to: 30 },
  { from: 31, to: 60 },
  { from: 61, to: 90 },
  { from: 91, to: null },
] as const;

export const bucketOf = (ageDays: number): number =>
  DUE_AGE_BUCKETS.findIndex((b) => b.to === null || ageDays <= b.to);

/** One unpaid part of a credit line: the day it was given and what is left of it. */
export interface OpenLine {
  readonly date: IsoDate;
  readonly amount: Paise;
}

/** A credit line paid off in full: when it was given and when the last of it was paid. */
export interface SettledLine {
  readonly given: IsoDate;
  readonly settled: IsoDate;
  readonly days: number;
}

export interface PartyLedgerFold {
  readonly partyId: string;
  readonly open: readonly OpenLine[];
  readonly settled: readonly SettledLine[];
}

/**
 * WHAT RAISES AND WHAT LOWERS A PARTY'S BALANCE, as P7 and P8 count it. Only the
 * udhar leg of a return moves a customer's balance; a cash purchase creates no
 * supplier due.
 */
function partyMove(e: Entry, kind: 'customer' | 'supplier'): 1 | -1 | 0 {
  if (kind === 'customer') {
    if (e.section === 'udhar_sales') return 1;
    if (e.section === 'udhar_collection') return -1;
    if (e.mode !== 'udhar') return 0;
    if (e.section === 'exchange_receipt') return 1;
    return e.section === 'refund_paid' ? -1 : 0;
  }
  if (e.section === 'party_payment') return -1;
  return e.section === 'purchase' && e.mode === 'udhar' ? 1 : 0;
}

/**
 * FIRST IN, FIRST OUT. A payment settles the OLDEST unpaid credit first - the
 * way a shopkeeper reads his own khata - so an open line's date is the date the
 * goods went out, not the date the balance last moved. A payment beyond every
 * open line is held as an advance and set against the next credit. An entry
 * with no party cannot be attributed to anyone and is left out; P7 and P8 still
 * count it.
 */
export function partyLedgerFold(
  entries: readonly Entry[],
  kind: 'customer' | 'supplier',
): PartyLedgerFold[] {
  // A stable sort: entries on one day keep the order they were appended in.
  const inOrder = [...entries].sort((a, b) => byDate(a.dayId, b.dayId));
  const open = new Map<string, { date: IsoDate; left: Paise }[]>();
  const settled = new Map<string, SettledLine[]>();
  const advance = new Map<string, Paise>();
  for (const e of inOrder) {
    const move = partyMove(e, kind);
    if (move === 0 || e.partyId === undefined) continue;
    const id = e.partyId;
    const lines = open.get(id) ?? [];
    open.set(id, lines);
    if (move === 1) {
      const held = advance.get(id) ?? 0;
      const used = Math.min(held, e.amount);
      advance.set(id, subtract(held, used));
      if (e.amount > used) lines.push({ date: e.dayId, left: subtract(e.amount, used) });
      continue;
    }
    let pay = e.amount;
    while (pay > 0 && lines.length > 0) {
      const first = lines[0]!;
      const take = Math.min(pay, first.left);
      first.left = subtract(first.left, take);
      pay = subtract(pay, take);
      if (first.left === 0) {
        lines.shift();
        const list = settled.get(id) ?? [];
        list.push({ given: first.date, settled: e.dayId, days: daysBetween(first.date, e.dayId) });
        settled.set(id, list);
      }
    }
    advance.set(id, sum([advance.get(id) ?? 0, pay]));
  }
  return [...open.entries()]
    .map(([partyId, lines]) => ({
      partyId,
      open: lines.map((l) => ({ date: l.date, amount: l.left })),
      settled: settled.get(partyId) ?? [],
    }))
    .sort((a, b) => a.partyId.localeCompare(b.partyId));
}

export interface PartyDues {
  readonly partyId: string;
  readonly amount: Paise;
  readonly oldestDate: IsoDate;
  readonly oldestAgeDays: number;
  /** What this party owes in each of DUE_AGE_BUCKETS, by the age of each open line. */
  readonly byBucket: readonly Paise[];
}

export interface DuesByAge {
  /** Oldest unpaid first; ties by the larger amount, then by id. */
  readonly parties: readonly PartyDues[];
  readonly bucketTotals: readonly Paise[];
  readonly total: Paise;
}

/** Who owes me (customers) or whom I owe (suppliers), by age, oldest first. */
export function duesByAge(
  entries: readonly Entry[],
  kind: 'customer' | 'supplier',
  today: IsoDate,
): DuesByAge {
  const parties = partyLedgerFold(entries, kind)
    .filter((p) => p.open.length > 0)
    .map((p) => ({
      partyId: p.partyId,
      amount: sum(p.open.map((l) => l.amount)),
      oldestDate: p.open[0]!.date,
      oldestAgeDays: daysBetween(p.open[0]!.date, today),
      byBucket: DUE_AGE_BUCKETS.map((_, i) =>
        sum(p.open.filter((l) => bucketOf(daysBetween(l.date, today)) === i).map((l) => l.amount)),
      ),
    }))
    // Array sort is stable, so equal age and amount keep the fold's id order.
    .sort((a, b) => b.oldestAgeDays - a.oldestAgeDays || subtract(b.amount, a.amount));
  return {
    parties,
    bucketTotals: DUE_AGE_BUCKETS.map((_, i) => sum(parties.map((p) => p.byBucket[i]!))),
    total: sum(parties.map((p) => p.amount)),
  };
}

/* ------------------------------------------------------------------ *
 * 2 · Month at a glance
 * ------------------------------------------------------------------ */

/** 'YYYY-MM' of a date. */
export const monthOf = (date: IsoDate): string => date.slice(0, 7);

/** The month before 'YYYY-MM'. */
export const previousMonth = (month: string): string => monthOf(addDays(month + '-01', -1));

export interface MonthAtAGlance {
  readonly month: string;
  /** Day records in the month, any state, and how many of them are closed. */
  readonly daysRecorded: number;
  readonly closedDays: number;
  readonly netSales: Paise;
  readonly cashSales: Paise;
  readonly upiSales: Paise;
  readonly udharSales: Paise;
  readonly expenses: Paise;
  readonly purchases: Paise;
  /** Net sales - purchase - expense, typed adjustments included. Withdrawal is NOT in it (D3). */
  readonly estimatedProfit: Paise;
  /** What the owner took home: every withdrawal, cash and UPI. */
  readonly withdrawals: Paise;
  /** Estimated profit - withdrawals. Negative means more went home than the month earned. */
  readonly profitLeftInShop: Paise;
}

const sectionSum = (inputs: readonly DayInput[], section: Entry['section']): Paise =>
  sum(inputs.flatMap((i) => i.entries.filter((e) => e.section === section).map((e) => e.amount)));

/**
 * The month's figures, from every day recorded in it - an open day included, so
 * this month reads "so far". The screen states how many days were closed.
 */
export function monthAtAGlance(book: Book, month: string): MonthAtAGlance {
  const inputs = dayInputs(book).filter((i) => monthOf(i.day.date) === month);
  const primaries = inputs.map(computePrimary);
  const estimatedProfit = sum(primaries.map((p) => p.estimatedProfit.value));
  const withdrawals = sectionSum(inputs, 'withdrawal');
  return {
    month,
    daysRecorded: inputs.length,
    closedDays: inputs.filter((i) => i.day.state === 'closed').length,
    netSales: sum(primaries.map((p) => p.p4NetSales.value)),
    cashSales: sectionSum(inputs, 'cash_sales'),
    upiSales: sectionSum(inputs, 'upi_sales'),
    udharSales: sectionSum(inputs, 'udhar_sales'),
    expenses: sum(primaries.map((p) => p.p6TotalExpenses.value)),
    purchases: sum(primaries.map((p) => p.p5NetPurchase.value)),
    estimatedProfit,
    withdrawals,
    profitLeftInShop: subtract(estimatedProfit, withdrawals),
  };
}

/* ------------------------------------------------------------------ *
 * 3 · Cash-check history
 * ------------------------------------------------------------------ */

export interface CashCheckDay {
  readonly date: IsoDate;
  readonly expected: Paise;
  readonly counted: Paise;
  /** counted - expected. */
  readonly difference: Paise;
  readonly status: 'balanced' | 'short' | 'extra';
  readonly reason?: string;
}

export interface CashCheckHistory {
  /** Newest first, at most `last` closed days. */
  readonly days: readonly CashCheckDay[];
  readonly balancedDays: number;
  readonly shortDays: number;
  readonly extraDays: number;
}

/** Each closed day's cash check - OP1 re-derived from that day's own entries and adjustments. */
export function cashCheckHistory(book: Book, last: number): CashCheckHistory {
  const days = dayInputs(book)
    .filter((i) => i.day.state === 'closed' && i.day.countedCash !== null)
    .slice(-last)
    .reverse()
    .map((i): CashCheckDay => {
      const h = dailyCashHealth(i);
      return {
        date: i.day.date,
        expected: h.expected,
        counted: assertPaise(h.counted),
        difference: assertPaise(h.difference),
        status: h.status as CashCheckDay['status'],
        ...(h.reason === undefined ? {} : { reason: h.reason }),
      };
    });
  const count = (s: CashCheckDay['status']) => days.filter((d) => d.status === s).length;
  return { days, balancedDays: count('balanced'), shortDays: count('short'), extraDays: count('extra') };
}

/* ------------------------------------------------------------------ *
 * 4 · Confirmed UPI per month
 * ------------------------------------------------------------------ */

export interface UpiMonth {
  readonly month: string;
  /** What the entries say came in by UPI. */
  readonly recorded: Paise;
  /** Decision 3: only what he confirmed arrived. */
  readonly confirmed: Paise;
  readonly receiptCount: number;
  readonly confirmedCount: number;
}

/** The UPI check of every day in the month, added up. */
export function upiMonth(book: Book, month: string): UpiMonth {
  const checks = dayInputs(book)
    .filter((i) => monthOf(i.day.date) === month)
    .map(upiCheck);
  return {
    month,
    recorded: sum(checks.map((c) => c.expectedReceived)),
    confirmed: sum(checks.map((c) => c.confirmedReceived)),
    receiptCount: checks.reduce((n, c) => n + c.receiptCount, 0),
    confirmedCount: checks.reduce((n, c) => n + c.confirmedCount, 0),
  };
}
