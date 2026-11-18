/**
 * THE SCORES - Cash Confidence and Operational Consistency, defined in
 * docs/spec/SCORES.md. That document is the specification; this file is its
 * implementation and nothing here may say something the document does not.
 *
 * EACH SCORE IS A SET OF PUBLISHED RATIOS, NEVER ONE NUMBER. Nothing is weighted
 * and nothing is blended: a weight is a choice no recorded fact can settle, and a
 * number built from one is an opinion wearing a measurement's clothes (BE-07).
 * That is also why there is no Business Health function here at all.
 *
 * SIZE-FAIR BY CONSTRUCTION (BE-08). Every ratio is the shop against itself over
 * its own window: a count of its days over a count of its days, or one of its
 * medians over another of its medians. There is no rupee constant anywhere in this
 * file, so a 5,000-a-day shop and a 50,000-a-day shop doing the same thing with
 * the same care read the same. scores.spec.ts scales a whole history by ten and
 * asserts every ratio is unchanged.
 *
 * PURE AND CLOCK-FREE (ADR-012). The day that is still in progress is PASSED IN,
 * never worked out from a clock.
 */

import { medianMoney, ratio, roundHalfAwayFromZero, subtract, sum, type Paise, type Ratio } from './money.ts';
import { gate, SECTIONS } from './types.ts';
import type { ClosedDaySummary, DayRecord, Entry, Gated, IsoDate } from './types.ts';
import { creditConcentration } from './intelligence.ts';
import type { OpenCustomerCredit } from './operational.ts';

/** W - the trailing window, in days. A named choice, not a derivation (SCORES.md §2). */
export const SCORE_WINDOW_DAYS = 30;

/** Gates in CLOSED days, through the same `gate()` as BI1-BI6 (BE-09). */
export const SCORE_GATES = {
  cashConfidence: 14,
  operationalConsistency: 14,
} as const;

const byDate = <T extends { readonly date: IsoDate }>(a: T, b: T): number =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : 0;

const trailing = <T extends { readonly date: IsoDate }>(xs: readonly T[]): T[] =>
  [...xs].sort(byDate).slice(-SCORE_WINDOW_DAYS);

/* ------------------------------------------------------------------ *
 * Cash Confidence
 * ------------------------------------------------------------------ */

export interface CashConfidence {
  /** Closed days in the window - the denominator of `exactMatch`. */
  readonly windowDays: number;
  /** CC-1 · days counted cash equalled expected cash, over closed days in W. */
  readonly exactMatch: Ratio;
  /** CC-2 · median |counted - expected| over median net sales, both over W. */
  readonly typicalGapShare: Ratio;
  /**
   * CC-3 · gaps with a TYPED reason over all gaps. NULL: the reason is free text
   * today (BE-04), and a score must never parse prose. Lands with §2.4.
   */
  readonly explainedShare: null;
  /** The UPI half (SCORES.md §3.2). NULL until the UPI ledger of §2.2 exists. */
  readonly upi: null;
}

export function cashConfidence(closed: readonly ClosedDaySummary[]): Gated<CashConfidence> {
  return gate(SCORE_GATES.cashConfidence, closed.length, () => {
    const w = trailing(closed);
    const gaps = w.map((d) => Math.abs(subtract(d.countedCash, d.expectedCash)));
    const matched = w.filter((d) => d.countedCash === d.expectedCash).length;
    return {
      windowDays: w.length,
      exactMatch: ratio(matched, w.length),
      typicalGapShare: ratio(medianMoney(gaps) ?? 0, medianMoney(w.map((d) => d.netSales)) ?? 0),
      explainedShare: null,
      upi: null,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Operational Consistency
 * ------------------------------------------------------------------ */

export interface OperationalConsistency {
  /** Days opened in the window - the denominator of `closingRate`. */
  readonly windowDays: number;
  /** OC-1 · closed days over days opened, in W. */
  readonly closingRate: Ratio;
  /** OC-2 · sections entered or explicitly skipped, over 8 x days opened, in W. */
  readonly recordingCompleteness: Ratio;
  /** OC-3 · entries carrying a correction link, over all entries, in W. */
  readonly correctionRate: Ratio;
}

/**
 * Which days count as "opened". A `not_started` day is a shut shop, and a shut
 * shop is not a missed close (HB-06). The day still in progress has not had its
 * chance to close yet, so it counts only once it HAS closed.
 */
const openedDays = (days: readonly DayRecord[], inProgress: IsoDate | null): DayRecord[] =>
  days.filter(
    (d) => d.state !== 'not_started' && (d.date !== inProgress || d.state === 'closed'),
  );

export function operationalConsistency(
  days: readonly DayRecord[],
  entries: readonly Entry[],
  inProgress: IsoDate | null,
): Gated<OperationalConsistency> {
  const opened = openedDays(days, inProgress);
  const closedSoFar = opened.filter((d) => d.state === 'closed').length;
  return gate(SCORE_GATES.operationalConsistency, closedSoFar, () => {
    const w = trailing(opened);
    const inWindow = new Set(w.map((d) => d.date));
    const windowEntries = entries.filter((e) => inWindow.has(e.dayId));

    const entered = new Set(windowEntries.map((e) => e.dayId + '|' + e.section));
    let accounted = 0;
    for (const d of w) {
      for (const s of SECTIONS) {
        if (entered.has(d.date + '|' + s) || d.skippedSections.includes(s)) accounted += 1;
      }
    }

    return {
      windowDays: w.length,
      closingRate: ratio(w.filter((d) => d.state === 'closed').length, w.length),
      recordingCompleteness: ratio(accounted, SECTIONS.length * w.length),
      correctionRate: ratio(
        windowEntries.filter((e) => e.correctsDayId !== undefined).length,
        windowEntries.length,
      ),
    };
  });
}

/* ------------------------------------------------------------------ *
 * BI6 inputs, derived in one pass (BE-10)
 * ------------------------------------------------------------------ */

const CREDIT_SIGN: Partial<Record<Entry['section'], 1 | -1>> = {
  udhar_sales: 1,
  udhar_collection: -1,
};

/**
 * Per-customer open credit NOW, and the top-three share at the end of each of
 * `closeDates` - BI6's input and its baseline series, from ONE replay of the
 * entries rather than one replay per day (BE-10).
 *
 * `since` is the day the balance last rose above zero, so it is the age of the
 * debt as it stands and not of a line settled long ago. An entry with no party
 * cannot be attributed to anyone and is left out; P7 still counts it.
 */
export function customerCreditFold(
  entries: readonly Entry[],
  closeDates: readonly IsoDate[],
): { readonly open: OpenCustomerCredit[]; readonly top3BasisPointsAtClose: number[] } {
  // The store hands entries over in append order, which is already day order;
  // sorting only when it is not was most of this fold's measured cost under
  // Hermes (SCORES.md §7).
  const inOrder = entries.every((e, i) => i === 0 || entries[i - 1]!.dayId <= e.dayId);
  const sorted = inOrder
    ? entries
    : [...entries].sort((a, b) => (a.dayId < b.dayId ? -1 : a.dayId > b.dayId ? 1 : 0));
  const owed = new Map<string, Paise>();
  const since = new Map<string, IsoDate>();
  const marks = new Set(closeDates);
  const series: number[] = [];

  const snapshot = (): OpenCustomerCredit[] =>
    [...owed.entries()]
      .filter(([, amount]) => amount > 0)
      .map(([partyId, amount]) => ({ partyId, amount, since: since.get(partyId)! }));

  const mark = (day: IsoDate) => {
    if (!marks.has(day)) return;
    const bp = creditConcentration(snapshot()).top3Share.basisPoints;
    if (bp !== null) series.push(bp);
  };

  for (let i = 0; i < sorted.length; i += 1) {
    const e = sorted[i]!;
    const sign = CREDIT_SIGN[e.section];
    if (sign !== undefined && e.partyId !== undefined) {
      const before = owed.get(e.partyId) ?? 0;
      const after = sign === 1 ? sum([before, e.amount]) : subtract(before, e.amount);
      if (before <= 0 && after > 0) since.set(e.partyId, e.dayId);
      owed.set(e.partyId, after);
    }
    const next = sorted[i + 1];
    if (next === undefined || next.dayId !== e.dayId) mark(e.dayId);
  }

  return { open: snapshot(), top3BasisPointsAtClose: series };
}

/* ------------------------------------------------------------------ *
 * Render boundary for a ratio
 * ------------------------------------------------------------------ */

/**
 * Basis points as a percentage to one decimal - "12.3%". Half-away-from-zero on
 * the tenths. Null, the undefined ratio, renders as a dash and never as 0%.
 * Latin numerals in every language, like `formatPaise`.
 */
export function formatBasisPoints(bp: number | null): string {
  if (bp === null) return '-';
  const tenths = roundHalfAwayFromZero(bp / 10);
  const sign = tenths < 0 ? '-' : '';
  const abs = Math.abs(tenths);
  return `${sign}${Math.floor(abs / 10)}.${abs % 10}%`;
}
