/**
 * BI1-BI4 with their gates. BI5 reserved. BI6 blocked.
 *
 * Every one of these is GATED ON CLOSED-DAY COUNT and never shown as an empty chart.
 * The unavailable branch carries both the requirement and the progress so the
 * GateCard can say "available after 14 closed days, 6 so far" without the UI
 * recounting anything. Never a spinner, never a zero, never a chart with no data.
 *
 * ONE SPEC CONFLICT IS RESOLVED HERE:
 *
 *   BI4 - the build prompt says "(P7 + stock proxy) vs P8". The Day-Close doc p.9
 *   says "(credit_out + supplier_out) / cash". RESOLVED TO THE DAY-CLOSE FORMULA,
 *   because a "stock proxy" CANNOT EXIST in V1: decision D5 removes all item and
 *   stock data, and the architecture has no table that could hold it ("Item or
 *   inventory tables - Decision 5. No input collects them, so no store holds them").
 *   Implementing the prompt's version literally would require inventing the very
 *   data D5 forbids. Recorded as OD-10.
 */

import { divideMoney, meanMoney, ratio, stdevMoney, sum, type Paise, type Ratio } from './money.ts';
import { gate } from './types.ts';
import type {
  BusinessIntelligence,
  CashFlowStability,
  ClosedDaySummary,
  Gated,
  ProfitTrend,
} from './types.ts';

/**
 * Gate thresholds, in CLOSED days.
 *
 * The Day-Close doc gives approximate horizons (~14 / ~21 / ~30); the build prompt
 * fixes exact integers. Exact integers win, because a gate that cannot be stated as
 * a whole number cannot be tested and cannot be rendered in the GateCard sentence
 * (OD-3).
 */
export const BI_GATES = {
  bi1ProfitTrend: 14,
  bi2SalesConsistency: 14,
  bi3CashFlowStability: 21,
  bi4WorkingCapitalPressure: 14,
} as const;

/**
 * BI1 · Profit Trend - gate 14 closed days.
 *
 * Direction compares the mean profit of the first half of the window against the
 * second. A plain first-vs-last comparison would swing on a single outlier day.
 */
export function profitTrend(closed: readonly ClosedDaySummary[]): Gated<ProfitTrend> {
  return gate(BI_GATES.bi1ProfitTrend, closed.length, () => {
    const points = closed.map((d) => ({ date: d.date, profit: d.profit }));
    const mid = Math.floor(closed.length / 2);
    const firstHalfMean = meanMoney(closed.slice(0, mid).map((d) => d.profit)) ?? 0;
    const secondHalfMean = meanMoney(closed.slice(mid).map((d) => d.profit)) ?? 0;
    const direction =
      secondHalfMean > firstHalfMean ? 'up' : secondHalfMean < firstHalfMean ? 'down' : 'flat';
    return { points, firstHalfMean, secondHalfMean, direction };
  });
}

/**
 * BI2 · Sales Consistency - gate 14 closed days. Coefficient of variation.
 *
 * CoV = stdev / mean, returned as a Ratio so the exact numerator and denominator
 * survive for the working. A LOWER value means steadier sales, which is the reading
 * the UI must present - a high CoV is not "bad sales", it is "unpredictable sales",
 * and those call for different advice.
 */
export function salesConsistency(closed: readonly ClosedDaySummary[]): Gated<Ratio> {
  return gate(BI_GATES.bi2SalesConsistency, closed.length, () => {
    const series = closed.map((d) => d.netSales);
    const stdev = stdevMoney(series) ?? 0;
    const mean = meanMoney(series) ?? 0;
    return ratio(stdev, mean);
  });
}

/**
 * BI3 · Cash Flow Stability - gate 21 closed days.
 *
 * Variance of the counted closing cash, plus the count of days that came in short of
 * expected. The deficit-day count matters as much as the spread: a shop with steady
 * cash that is short three days a week has a different problem from one with lumpy
 * cash that always reconciles.
 */
export function cashFlowStability(closed: readonly ClosedDaySummary[]): Gated<CashFlowStability> {
  return gate(BI_GATES.bi3CashFlowStability, closed.length, () => {
    const series = closed.map((d) => d.countedCash);
    const stdevCountedCash = stdevMoney(series) ?? 0;
    const meanCountedCash = meanMoney(series) ?? 0;
    const deficitDayCount = closed.filter((d) => d.countedCash < d.expectedCash).length;
    return {
      stdevCountedCash,
      meanCountedCash,
      coefficientOfVariation: ratio(stdevCountedCash, meanCountedCash),
      deficitDayCount,
    };
  });
}

/**
 * BI4 · Working Capital Pressure - gate 14 closed days.
 *
 * (credit outstanding + supplier outstanding) / cash.
 *
 * NOT the prompt's "(P7 + stock proxy) vs P8" - see the file header. There is no
 * stock data in V1 and no store that could hold it, so a stock proxy cannot be
 * computed from anything that exists. This is the Day-Close doc's formula, which is
 * computable from the ledger alone.
 *
 * A ratio above 1 means more money is tied up in what he is owed and what he owes
 * than he holds in cash.
 */
export function workingCapitalPressure(
  closed: readonly ClosedDaySummary[],
  creditOutstanding: Paise,
  supplierOutstanding: Paise,
  cashOnHand: Paise,
): Gated<Ratio> {
  return gate(BI_GATES.bi4WorkingCapitalPressure, closed.length, () =>
    ratio(sum([creditOutstanding, supplierOutstanding]), cashOnHand),
  );
}

/** Mean daily profit over the window. Convenience for the Reports header. */
export function meanDailyProfit(closed: readonly ClosedDaySummary[]): Paise | null {
  if (closed.length === 0) return null;
  return divideMoney(sum(closed.map((d) => d.profit)), closed.length, 'half-away-from-zero');
}

export function computeIntelligence(
  closed: readonly ClosedDaySummary[],
  creditOutstanding: Paise,
  supplierOutstanding: Paise,
  cashOnHand: Paise,
): BusinessIntelligence {
  return {
    bi1ProfitTrend: profitTrend(closed),
    bi2SalesConsistency: salesConsistency(closed),
    bi3CashFlowStability: cashFlowStability(closed),
    bi4WorkingCapitalPressure: workingCapitalPressure(
      closed,
      creditOutstanding,
      supplierOutstanding,
      cashOnHand,
    ),

    /**
     * BI5 · Inventory Pressure - RESERVED, NOT IN V1.
     *
     * D5: "Drop Inventory Pressure from the Reports list entirely - not greyed out,
     * not 'coming soon'." There is no item master, no quantity and no stock count
     * anywhere in V1, so this output cannot exist without a new input section, and
     * adding one lengthens the day close - the one thing the product cannot afford.
     *
     * Always null. There must be NO card in Reports. Reports carries five metrics,
     * not six.
     */
    bi5InventoryPressure: null,

    /**
     * BI6 - BLOCKED-ON-HUMAN.
     *
     * Item 6 of the 15-07-2026 note is physically incomplete on the photograph
     * ("6. |"). Independently corroborated by Day-Close p.9: "Output #6 (unwritten)
     * - Left incomplete in the 15-07 note - Blocked".
     *
     * DO NOT INVENT IT. A plausible guess that gets built, tested and shipped is far
     * more expensive than a blank row. When the intent is recovered it drops in as
     * one TRACEABILITY row and one function here.
     */
    bi6Reserved: null,
  };
}
