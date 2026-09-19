/**
 * Evaluates every golden vector and produces a flat, JSON-serialisable result.
 *
 * SHARED BY BOTH RUNTIMES. Node imports it directly; the Hermes bundle is built from
 * this same file by esbuild. That is the point: if Node and Hermes disagree about any
 * value in here, CI fails (ADR-012).
 *
 * It computes the FULL result set for every vector, not just the keys a vector
 * happens to assert. The hand-written `expect` block checks CORRECTNESS; the
 * cross-runtime diff checks AGREEMENT, and agreement should cover everything the
 * engine can produce, including values no vector pins down.
 */

import {
  agedParties,
  computeDay,
  computeIntelligence,
  formatPaise,
  nextOpeningCash,
  type DayInput,
  type OperationalContext,
} from '../packages/formula-engine/src/index.ts';

/** Deterministic key order, so two runtimes serialise byte-identically. */
function ordered(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k];
  return out;
}

export interface VectorCase {
  name: string;
  proves: string;
  source?: string;
  input: DayInput;
  context: OperationalContext;
  expect: Record<string, unknown>;
}

export interface VectorFile {
  count: number;
  vectors: VectorCase[];
}

export function evaluateVector(v: VectorCase): Record<string, unknown> {
  const input = v.input;
  const ctx = v.context;

  const day = computeDay(input, ctx);
  const p = day.primary;
  const o = day.operational;

  const bi = computeIntelligence(
    ctx.trailing,
    p.p7CreditOutstanding.value,
    p.p8SupplierOutstanding.value,
    p.p3ExpectedCashBalance.value,
    ctx.openCustomerCredit,
    // Trailing concentration series, recomputed by the caller from entries - never
    // stored. Empty here unless a vector supplies one.
    (ctx as unknown as { priorTop3BasisPoints?: number[] }).priorTop3BasisPoints ?? [],
  );

  const aging: Record<string, string> = {};
  for (const a of agedParties(ctx)) aging[a.partyId] = a.vocabulary;

  const gated = (g: {
    available: boolean;
    requiredClosedDays?: number;
    closedDaysSoFar?: number;
  }) => ({
    available: g.available,
    required: g.available ? null : (g.requiredClosedDays ?? null),
    soFar: g.available ? null : (g.closedDaysSoFar ?? null),
  });

  const bi1 = gated(bi.bi1ProfitTrend);
  const bi2 = gated(bi.bi2SalesConsistency);
  const bi3 = gated(bi.bi3CashFlowStability);
  const bi4 = gated(bi.bi4WorkingCapitalPressure);

  return ordered({
    // P1-P8 and profit
    p1: p.p1TotalCashReceived.value,
    p2: p.p2TotalCashPaid.value,
    p3: p.p3ExpectedCashBalance.value,
    p4: p.p4NetSales.value,
    p5: p.p5NetPurchase.value,
    p6: p.p6TotalExpenses.value,
    p7: p.p7CreditOutstanding.value,
    p8: p.p8SupplierOutstanding.value,
    profit: p.estimatedProfit.value,

    // Working - the cash check depends on these being right AND in order
    p3WorkingKeys: p.p3ExpectedCashBalance.working.lines.map((l) => l.key),
    p3WorkingSigns: p.p3ExpectedCashBalance.working.lines.map((l) => l.sign),
    p3WorkingAmounts: p.p3ExpectedCashBalance.working.lines.map((l) => l.amount),
    p3WorkingTotal: p.p3ExpectedCashBalance.working.total,

    // OP1-OP6
    op1Difference: o.op1DailyCashHealth.difference,
    op1Status: o.op1DailyCashHealth.status,
    op1ReasonRequired: o.op1DailyCashHealth.reasonRequired,
    op1Expected: o.op1DailyCashHealth.expected,
    op1Counted: o.op1DailyCashHealth.counted,

    op2BasisPoints: o.op2ExpensePressure.basisPoints,
    op2Numerator: o.op2ExpensePressure.numeratorPaise,
    op2Denominator: o.op2ExpensePressure.denominatorPaise,

    op3BasisPoints: o.op3CollectionEfficiency.basisPoints,
    op3Numerator: o.op3CollectionEfficiency.numeratorPaise,
    op3Denominator: o.op3CollectionEfficiency.denominatorPaise,

    op4Count: o.op4PaymentDue.length,
    op4: o.op4PaymentDue.map((d) => ({
      partyId: d.partyId,
      dueDate: d.dueDate,
      amount: d.amount,
      daysUntilDue: d.daysUntilDue,
    })),

    op5Baseline: o.op5BusinessMovement.baselineMedian,
    op5Direction: o.op5BusinessMovement.direction,
    op5TodayNetSales: o.op5BusinessMovement.todayNetSales,
    op5BasisPoints: o.op5BusinessMovement.ratio.basisPoints,

    op6: o.op6CashDeficitWarnings.map((w) => ({
      partyId: w.partyId,
      dueDate: w.dueDate,
      amountDue: w.amountDue,
      projectedCash: w.projectedCash,
      shortfall: w.shortfall,
    })),

    // BI1-BI4 gates, BI5 reserved, BI6 blocked
    bi1Available: bi1.available,
    bi1Required: bi1.required,
    bi1SoFar: bi1.soFar,
    bi2Available: bi2.available,
    bi2Required: bi2.required,
    bi2SoFar: bi2.soFar,
    bi2BasisPoints: bi.bi2SalesConsistency.available
      ? bi.bi2SalesConsistency.value.basisPoints
      : null,
    bi3Available: bi3.available,
    bi3Required: bi3.required,
    bi3SoFar: bi3.soFar,
    bi4Available: bi4.available,
    bi4Required: bi4.required,
    bi4SoFar: bi4.soFar,
    bi5: bi.bi5InventoryPressure,
    bi6Available: bi.bi6CreditConcentration.available,
    bi6Required: bi.bi6CreditConcentration.available
      ? null
      : bi.bi6CreditConcentration.requiredClosedDays,
    bi6SoFar: bi.bi6CreditConcentration.available
      ? null
      : bi.bi6CreditConcentration.closedDaysSoFar,
    bi6TopPartyId: bi.bi6CreditConcentration.available
      ? bi.bi6CreditConcentration.value.topPartyId
      : null,
    bi6TopShareBasisPoints: bi.bi6CreditConcentration.available
      ? bi.bi6CreditConcentration.value.topShare.basisPoints
      : null,
    bi6Top3ShareBasisPoints: bi.bi6CreditConcentration.available
      ? bi.bi6CreditConcentration.value.top3Share.basisPoints
      : null,
    bi6Direction: bi.bi6CreditConcentration.available
      ? bi.bi6CreditConcentration.value.direction
      : null,
    bi6CustomerCount: bi.bi6CreditConcentration.available
      ? bi.bi6CreditConcentration.value.customerCount
      : null,

    // Day lifecycle
    dayState: day.state,
    cashCheckUnlocked: day.cashCheckUnlocked,
    progressDone: day.progress.done,
    progressTotal: day.progress.total,
    expenseSectionState: day.sectionStates.expense,
    sectionStates: day.sectionStates,
    nextOpeningCash: nextOpeningCash(input),

    // Aging vocabularies - two words, deliberately
    agingVocabularies: aging,

    // Render boundary. Included so a Node/Hermes formatting divergence is caught
    // here rather than on a shopkeeper's screen.
    formatChecks: {
      '12345678': formatPaise(12345678),
      '630000': formatPaise(630000),
      '-25000': formatPaise(-25000),
      '1': formatPaise(1),
      '0': formatPaise(0),
      '100000000': formatPaise(100000000),
    },
  });
}

export function evaluateAll(file: VectorFile): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const v of file.vectors) {
    try {
      out[v.name] = evaluateVector(v);
    } catch (err) {
      out[v.name] = { __error: String((err as Error).message ?? err) };
    }
  }
  return out;
}

/**
 * Compare a vector's hand-written expectations against what the engine produced.
 * Returns human-readable failures; empty means the vector passed.
 */
export function checkExpectations(
  name: string,
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
): string[] {
  const failures: string[] = [];
  if (actual.__error !== undefined) {
    return [`${name}: threw ${String(actual.__error)}`];
  }
  for (const key of Object.keys(expected)) {
    const want = JSON.stringify(expected[key]);
    const got = JSON.stringify(actual[key]);
    if (want !== got) failures.push(`${name}.${key}: expected ${want}, got ${got}`);
  }
  return failures;
}
