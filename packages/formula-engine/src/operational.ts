/**
 * OP1-OP6 - same-day and few-day signals.
 *
 * TWO SPEC CONFLICTS ARE RESOLVED HERE, both recorded in SPEC-DIGEST and BUILD_STATE
 * rather than decided silently:
 *
 *   OP5 baseline - the build prompt says "trailing MEDIAN"; the Day-Close doc p.9
 *   says "B_today / mean(B, 7d)". RESOLVED TO MEDIAN. A single unusually large day
 *   (a festival, a wholesale order) would drag a 7-day mean far enough to tell a
 *   shopkeeper his ordinary Tuesday was a bad day. The median is the honest baseline
 *   for a series this short and this spiky. The prompt is also the later instruction.
 *
 *   OP6 projected cash - "projected" is taken to mean TODAY'S EXPECTED BALANCE
 *   carried forward unchanged, NOT a forecast. Projecting future sales would be a
 *   guess, and guessing is the thing this product removed. The canonical example on
 *   Day-Close p.5 confirms it: "Cash short for Thursday. 12,000 due to Agarwal
 *   Traders, expected balance 6,300" - 6,300 is today's P3, not a forecast of
 *   Thursday.
 */

import { ratio, subtract, sum, medianMoney, type Paise, type Ratio } from './money.ts';
import { daysBetween } from './dates.ts';
import type {
  AgedParty,
  BusinessMovement,
  CashDeficitWarning,
  ClosedDaySummary,
  DailyCashHealth,
  DayInput,
  DueItem,
  Entry,
  IsoDate,
  OperationalOutputs,
} from './types.ts';
import { expectedCashBalance, netSales, totalExpenses } from './primary.ts';

/** An unsettled supplier due - a purchase made in udhar mode, not yet paid off. */
export interface OpenSupplierDue {
  readonly partyId: string;
  readonly amount: Paise;
  readonly purchasedOn: IsoDate;
  /** Optional, per D4 - due dates are chips, never mandatory. */
  readonly dueDate?: IsoDate;
}

/** Unsettled customer credit, for the aging badges. */
export interface OpenCustomerCredit {
  readonly partyId: string;
  readonly amount: Paise;
  readonly since: IsoDate;
}

/**
 * Everything OP1-OP6 needs beyond the day itself. All PASSED IN - the engine never
 * reads a clock and never queries anything.
 */
export interface OperationalContext {
  /** "Today", supplied by the caller. Never read from a clock (ADR-012). */
  readonly today: IsoDate;
  /** Trailing CLOSED days, oldest first. Baseline for OP2 and OP5. */
  readonly trailing: readonly ClosedDaySummary[];
  readonly openSupplierDues: readonly OpenSupplierDue[];
  readonly openCustomerCredit: readonly OpenCustomerCredit[];
  /** Forward horizon for OP4/OP6. Default 7, per Day-Close p.9 "dues(next 7d)". */
  readonly horizonDays?: number;
  /** Window for OP3. Default 30, per Day-Close p.9 "collected / given, 30d". */
  readonly collectionWindowDays?: number;
  /** Credit outstanding at the start of the OP3 window ("opening udhar"). */
  readonly windowOpeningCredit?: Paise;
}

const bySection = (entries: readonly Entry[], section: Entry['section']) =>
  entries.filter((e) => e.section === section);
const totalOf = (entries: readonly Entry[]): Paise => sum(entries.map((e) => e.amount));

/* ------------------------------------------------------------------ *
 * OP1 · Daily Cash Health
 * ------------------------------------------------------------------ */

/**
 * Counted (IN7) vs expected (P3), with a signed difference.
 *
 * The engine returns a STATUS and a NUMBER; it does not return copy. The UI phrases
 * it as a QUESTION - "250 less than expected, what happened?" - never as a verdict
 * ("Missing 250"). A shortfall is ordinary shop life (S6 Strategy 03).
 *
 * `reasonRequired` implements DFD step 4.5: the reason step exists only on a non-zero
 * difference, and it is the ONLY blocking step in the entire system.
 */
export function dailyCashHealth(input: DayInput): DailyCashHealth {
  const expected = expectedCashBalance(input).value;
  const counted = input.day.countedCash;

  if (counted === null) {
    return {
      expected,
      counted: null,
      difference: null,
      status: 'not_counted',
      reasonRequired: false,
    };
  }

  const difference = subtract(counted, expected);
  const status = difference === 0 ? 'balanced' : difference < 0 ? 'short' : 'extra';
  const out: DailyCashHealth = {
    expected,
    counted,
    difference,
    status,
    reasonRequired: difference !== 0,
  };
  return input.day.differenceReason === undefined
    ? out
    : { ...out, reason: input.day.differenceReason };
}

/* ------------------------------------------------------------------ *
 * OP2 · Expense Pressure
 * ------------------------------------------------------------------ */

/**
 * Total expenses as a share of net sales - "E / B" (Day-Close p.9).
 *
 * ALL FIVE expense modes count here, including shop stock (D2). Returns a Ratio, not
 * a percentage: a zero-sales day has an UNDEFINED ratio (basisPoints === null), not
 * an infinite one, and the UI must say "no sales yet" rather than render a symbol.
 */
export function expensePressure(input: DayInput): Ratio {
  return ratio(totalExpenses(input).value, netSales(input).value);
}

/** OP2 over the trailing window, for the "vs your own trailing mean" comparison. */
export function trailingExpensePressure(trailing: readonly ClosedDaySummary[]): Ratio {
  return ratio(sum(trailing.map((d) => d.totalExpenses)), sum(trailing.map((d) => d.netSales)));
}

/* ------------------------------------------------------------------ *
 * OP3 · Collection Efficiency
 * ------------------------------------------------------------------ */

/**
 * collected / (opening udhar + udhar sales), over a window. Default 30 days.
 *
 * Collections in ANY mode count - a customer who settles by UPI has settled.
 */
export function collectionEfficiency(input: DayInput, ctx: OperationalContext): Ratio {
  const windowOpening = ctx.windowOpeningCredit ?? input.priorCreditOutstanding;
  const given = sum([windowOpening, totalOf(bySection(input.entries, 'udhar_sales'))]);
  const collected = totalOf(bySection(input.entries, 'udhar_collection'));
  return ratio(collected, given);
}

/* ------------------------------------------------------------------ *
 * OP4 · Payment Due
 * ------------------------------------------------------------------ */

/**
 * Supplier dues inside a forward horizon, by date.
 *
 * Only dues that HAVE a due date can be scheduled. Per D4 a due date is optional, so
 * a due without one is not "overdue" - it is aged in days, and `agedParties` below
 * carries that distinction.
 */
export function paymentDue(ctx: OperationalContext): DueItem[] {
  const horizon = ctx.horizonDays ?? 7;
  const out: DueItem[] = [];
  for (const due of ctx.openSupplierDues) {
    if (!due.dueDate) continue;
    const daysUntilDue = daysBetween(ctx.today, due.dueDate);
    if (daysUntilDue <= horizon) {
      out.push({ partyId: due.partyId, dueDate: due.dueDate, amount: due.amount, daysUntilDue });
    }
  }
  return out.sort((a, b) => a.daysUntilDue - b.daysUntilDue || a.partyId.localeCompare(b.partyId));
}

/**
 * The TWO AGING VOCABULARIES, deliberately (D4, AgingBadge).
 *
 *   'overdue'    - ONLY where a due date exists and has passed. There is an agreed
 *                  term and it has been missed.
 *   'days_since' - everywhere else past 30 days. A customer has no agreed terms, so
 *                  the honest statement is "31+ days", not "overdue".
 *   'current'    - inside 30 days with no passed due date.
 *
 * "two different words, deliberately" - D4. Do not collapse these.
 */
export function agedParties(ctx: OperationalContext): AgedParty[] {
  const out: AgedParty[] = [];

  for (const due of ctx.openSupplierDues) {
    const ageDays = daysBetween(due.purchasedOn, ctx.today);
    if (due.dueDate) {
      const past = daysBetween(due.dueDate, ctx.today) > 0;
      out.push({
        partyId: due.partyId,
        amount: due.amount,
        ageDays,
        vocabulary: past ? 'overdue' : 'current',
        dueDate: due.dueDate,
      });
    } else {
      out.push({
        partyId: due.partyId,
        amount: due.amount,
        ageDays,
        vocabulary: ageDays > 30 ? 'days_since' : 'current',
      });
    }
  }

  for (const credit of ctx.openCustomerCredit) {
    const ageDays = daysBetween(credit.since, ctx.today);
    // A customer never gets "overdue" - he has no agreed term to be late against.
    out.push({
      partyId: credit.partyId,
      amount: credit.amount,
      ageDays,
      vocabulary: ageDays > 30 ? 'days_since' : 'current',
    });
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * OP5 · Business Movement
 * ------------------------------------------------------------------ */

/**
 * Today's net sales against the trailing baseline. Direction and size.
 *
 * MEDIAN, not mean - see the file header for why, and for the conflict this resolves.
 * With no baseline the direction is 'no_baseline', never 'flat': "we don't know yet"
 * and "no change" are different statements and the UI must not conflate them.
 */
export function businessMovement(input: DayInput, ctx: OperationalContext): BusinessMovement {
  const today = netSales(input).value;
  const baseline = medianMoney(ctx.trailing.map((d) => d.netSales));

  if (baseline === null) {
    return {
      todayNetSales: today,
      baselineMedian: null,
      direction: 'no_baseline',
      ratio: ratio(today, 0),
    };
  }

  const direction = today > baseline ? 'up' : today < baseline ? 'down' : 'flat';
  return { todayNetSales: today, baselineMedian: baseline, direction, ratio: ratio(today, baseline) };
}

/* ------------------------------------------------------------------ *
 * OP6 · Cash Deficit Warning - the single most valuable output
 * ------------------------------------------------------------------ */

/**
 * "projected cash on the due date < the amount due."
 *
 * It must fire early enough to act on, and it must name THE PARTY, THE AMOUNT, THE
 * DATE and THE SHORTFALL - all four, or it is not actionable.
 *
 * `projectedCash` is today's expected balance carried forward UNCHANGED. It is not a
 * forecast: forecasting tomorrow's sales would be exactly the guess this product
 * removed, and a warning built on a guess is worse than no warning. This is
 * pessimistic by construction, which is the right direction to be wrong in for a
 * solvency alert.
 *
 * Dues are consumed in date order and the running balance is reduced as each is paid,
 * so three dues of 5,000 against a 6,300 balance correctly flag the second and third
 * rather than clearing all three.
 */
export function cashDeficitWarnings(input: DayInput, ctx: OperationalContext): CashDeficitWarning[] {
  const horizon = ctx.horizonDays ?? 7;
  let runningCash = expectedCashBalance(input).value;
  const warnings: CashDeficitWarning[] = [];

  const scheduled = ctx.openSupplierDues
    .filter((d): d is OpenSupplierDue & { dueDate: IsoDate } => d.dueDate !== undefined)
    .filter((d) => daysBetween(ctx.today, d.dueDate) <= horizon)
    .sort(
      (a, b) =>
        daysBetween(ctx.today, a.dueDate) - daysBetween(ctx.today, b.dueDate) ||
        a.partyId.localeCompare(b.partyId),
    );

  for (const due of scheduled) {
    if (due.amount > runningCash) {
      warnings.push({
        partyId: due.partyId,
        dueDate: due.dueDate,
        amountDue: due.amount,
        projectedCash: runningCash,
        shortfall: subtract(due.amount, runningCash),
      });
      runningCash = 0; // he pays what he can; the rest is the shortfall
    } else {
      runningCash = subtract(runningCash, due.amount);
    }
  }

  return warnings;
}

export function computeOperational(input: DayInput, ctx: OperationalContext): OperationalOutputs {
  return {
    op1DailyCashHealth: dailyCashHealth(input),
    op2ExpensePressure: expensePressure(input),
    op3CollectionEfficiency: collectionEfficiency(input, ctx),
    op4PaymentDue: paymentDue(ctx),
    op5BusinessMovement: businessMovement(input, ctx),
    op6CashDeficitWarnings: cashDeficitWarnings(input, ctx),
  };
}
