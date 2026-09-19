/**
 * Domain types for the Formula Engine.
 *
 * PURE. No I/O, no clock, no locale, no network, no randomness (ADR-012).
 * Time and timezone are PASSED IN, never read. If you find yourself importing
 * anything outside this package, stop.
 *
 * The enums below duplicate those in @swafto/schema deliberately: the engine must have
 * ZERO dependencies so it runs identically under Node and Hermes (ADR-010). A test
 * asserts the two lists stay in lockstep.
 */

import type { Paise, Ratio } from './money.ts';

/* ------------------------------------------------------------------ *
 * Vocabulary
 * ------------------------------------------------------------------ */

export const SECTIONS = [
  'cash_sales',
  'upi_sales',
  'udhar_sales',
  'expense',
  'purchase',
  'udhar_collection',
  'party_payment',
  'withdrawal',
] as const;
export type Section = (typeof SECTIONS)[number];

export const MODES = ['cash', 'upi', 'other', 'udhar', 'shop_stock'] as const;
export type Mode = (typeof MODES)[number];

export const DAY_STATES = ['not_started', 'open', 'ready', 'closed', 'not_closed'] as const;
export type DayState = (typeof DAY_STATES)[number];

/** An ISO calendar date, 'YYYY-MM-DD'. Client-assigned; never rewritten (ADR-004). */
export type IsoDate = string;

/* ------------------------------------------------------------------ *
 * IN1-IN7 - the things a shopkeeper types
 * ------------------------------------------------------------------ */

/**
 * One immutable ledger entry. Covers IN1-IN6; IN7 (the counted cash) lives on the
 * day record because it is a property of the day, not a transaction.
 */
export interface Entry {
  readonly id: string;
  readonly dayId: IsoDate;
  readonly section: Section;
  /** INTEGER PAISE. Always non-negative - sign is carried by the section. */
  readonly amount: Paise;
  readonly mode: Mode;
  readonly partyId?: string;
  /** Only meaningful on an udhar-mode purchase (D4). */
  readonly dueDate?: IsoDate;
  readonly label?: string;
  /**
   * D7: a correction is a dated adjustment posted on TODAY that REFERENCES the closed
   * day it corrects. It changes today's figures and leaves that day byte-identical.
   */
  readonly correctsDayId?: IsoDate;
  readonly createdAt: string;
  readonly source: 'manual' | 'imported';
}

/** IN7 plus the day's lifecycle. No totals - only what a human supplied. */
export interface DayRecord {
  readonly date: IsoDate;
  readonly state: DayState;
  /** Carried from yesterday's COUNTED close, never the expected figure (D6, DFD 4.7). */
  readonly openingCash: Paise | null;
  /** IN7. The cash physically counted in the box. */
  readonly countedCash: Paise | null;
  readonly differenceReason?: string;
  readonly closedAt?: string;
  /**
   * D8: sections explicitly marked "Nothing to enter". A skipped section and an
   * untouched section produce the SAME total and a DIFFERENT day state.
   */
  readonly skippedSections: readonly Section[];
}

export interface Party {
  readonly id: string;
  readonly kind: 'customer' | 'supplier';
  readonly name: string;
  readonly phone?: string;
  readonly defaultDueDays?: number;
}

/** Everything the engine needs to compute one day. Passed in; never fetched. */
export interface DayInput {
  readonly day: DayRecord;
  /** Entries whose `dayId` is this day. */
  readonly entries: readonly Entry[];
  /** P7's "prior outstanding": credit outstanding at the START of this day. */
  readonly priorCreditOutstanding: Paise;
  /** P8's "prior outstanding": supplier outstanding at the START of this day. */
  readonly priorSupplierOutstanding: Paise;
}

/* ------------------------------------------------------------------ *
 * Working - every figure must render as its derivation
 * ------------------------------------------------------------------ */

/**
 * "The expected figure is shown as its working, not as a verdict - the owner can see
 * WHICH LINE is wrong." - SWAFTO-Retail-Desk-Day-Close.pdf p.7
 *
 * Every P value carries one of these. This is not a debugging aid; it is the cash
 * check screen's primary content and the reason the product is trusted.
 */
export interface WorkingLine {
  /**
   * A stable LOCALISATION KEY the UI resolves. Never a user-facing string - the
   * engine is locale-free (ADR-012), so it cannot know what language to speak.
   */
  readonly key: string;
  readonly sign: '+' | '-';
  readonly amount: Paise;
}

export interface Working {
  readonly lines: readonly WorkingLine[];
  readonly total: Paise;
}

/** A figure plus the lines that produced it. */
export interface Figure {
  readonly value: Paise;
  readonly working: Working;
}

/* ------------------------------------------------------------------ *
 * Gating - never a spinner, never a zero, never an empty chart
 * ------------------------------------------------------------------ */

/**
 * A business-intelligence value that needs history before it means anything.
 *
 * "Every gated output states its gate in the shopkeeper's terms - 'Profit trend:
 * available after 14 closed days, 6 so far' - never a spinner, never a zero, never a
 * chart with no data in it." - build prompt
 *
 * The unavailable branch carries BOTH numbers precisely so the GateCard can say that
 * sentence without the UI having to recount anything.
 */
export type Gated<T> =
  | { readonly available: true; readonly value: T }
  | {
      readonly available: false;
      readonly requiredClosedDays: number;
      readonly closedDaysSoFar: number;
    };

export function gate<T>(
  requiredClosedDays: number,
  closedDaysSoFar: number,
  compute: () => T,
): Gated<T> {
  if (closedDaysSoFar < requiredClosedDays) {
    return { available: false, requiredClosedDays, closedDaysSoFar };
  }
  return { available: true, value: compute() };
}

/* ------------------------------------------------------------------ *
 * Output shapes
 * ------------------------------------------------------------------ */

/** P1-P8, each renderable as its working. */
export interface PrimaryOutputs {
  readonly p1TotalCashReceived: Figure;
  readonly p2TotalCashPaid: Figure;
  readonly p3ExpectedCashBalance: Figure;
  readonly p4NetSales: Figure;
  readonly p5NetPurchase: Figure;
  readonly p6TotalExpenses: Figure;
  readonly p7CreditOutstanding: Figure;
  readonly p8SupplierOutstanding: Figure;
  /**
   * Estimated profit = NET SALES - PURCHASE - EXPENSE.
   * WITHDRAWAL IS ABSENT AND THAT IS CORRECT (D3). Do not "fix" it.
   */
  readonly estimatedProfit: Figure;
}

/** OP1 - counted vs expected. Copy is a QUESTION, never a verdict. */
export interface DailyCashHealth {
  readonly expected: Paise;
  readonly counted: Paise | null;
  /** counted - expected. Negative is short, positive is extra. Null until counted. */
  readonly difference: Paise | null;
  readonly status: 'balanced' | 'short' | 'extra' | 'not_counted';
  readonly reasonRequired: boolean;
  readonly reason?: string;
}

/** OP4 / OP6 - a supplier due inside the forward horizon. */
export interface DueItem {
  readonly partyId: string;
  readonly dueDate: IsoDate;
  readonly amount: Paise;
  readonly daysUntilDue: number;
}

/**
 * OP6 - the app's single most valuable output. Must name the party, the amount, the
 * date and the shortfall, or it is not actionable.
 */
export interface CashDeficitWarning {
  readonly partyId: string;
  readonly dueDate: IsoDate;
  readonly amountDue: Paise;
  readonly projectedCash: Paise;
  /** How far short, as a positive number. */
  readonly shortfall: Paise;
}

/** Aging uses TWO VOCABULARIES, deliberately (D4, S5 p.8 AgingBadge). */
export interface AgedParty {
  readonly partyId: string;
  readonly amount: Paise;
  readonly ageDays: number;
  /**
   * 'overdue' ONLY where a due date exists; 'days_since' everywhere else.
   * "two different words, deliberately" - D4.
   */
  readonly vocabulary: 'overdue' | 'days_since' | 'current';
  readonly dueDate?: IsoDate;
}

export interface BusinessMovement {
  readonly todayNetSales: Paise;
  readonly baselineMedian: Paise | null;
  readonly direction: 'up' | 'down' | 'flat' | 'no_baseline';
  readonly ratio: Ratio;
}

export interface OperationalOutputs {
  readonly op1DailyCashHealth: DailyCashHealth;
  readonly op2ExpensePressure: Ratio;
  readonly op3CollectionEfficiency: Ratio;
  readonly op4PaymentDue: readonly DueItem[];
  readonly op5BusinessMovement: BusinessMovement;
  readonly op6CashDeficitWarnings: readonly CashDeficitWarning[];
}

/** A closed day, reduced to what the BI window needs. */
export interface ClosedDaySummary {
  readonly date: IsoDate;
  readonly netSales: Paise;
  readonly netPurchase: Paise;
  readonly totalExpenses: Paise;
  readonly profit: Paise;
  readonly countedCash: Paise;
  readonly expectedCash: Paise;
}

export interface ProfitTrend {
  readonly points: readonly { readonly date: IsoDate; readonly profit: Paise }[];
  readonly firstHalfMean: Paise;
  readonly secondHalfMean: Paise;
  readonly direction: 'up' | 'down' | 'flat';
}

export interface CashFlowStability {
  readonly stdevCountedCash: Paise;
  readonly meanCountedCash: Paise;
  readonly coefficientOfVariation: Ratio;
  /** Days whose counted cash came in short of expected. */
  readonly deficitDayCount: number;
}

export interface BusinessIntelligence {
  readonly bi1ProfitTrend: Gated<ProfitTrend>;
  readonly bi2SalesConsistency: Gated<Ratio>;
  readonly bi3CashFlowStability: Gated<CashFlowStability>;
  readonly bi4WorkingCapitalPressure: Gated<Ratio>;
  /**
   * BI5 Inventory Pressure - RESERVED, NOT IN V1 (D5). There is no item data, no
   * placeholder, and no card in Reports. "A greyed-out card is worse than no card."
   * The field exists as a reserved name only and is always `null`.
   */
  readonly bi5InventoryPressure: null;
  /**
   * BI6 · Credit Concentration - DECIDED AUTONOMOUSLY (AD-001), gate 14.
   * Item 6 of the note is cut off; chosen by the decision procedure as the
   * highest-money-cost gap in the output set. Reversal trigger recorded in
   * DECISIONS-AUTONOMOUS.md.
   */
  readonly bi6CreditConcentration: Gated<CreditConcentration>;
}

/** Everything the engine produces for one day. */
export interface DayComputation {
  readonly date: IsoDate;
  readonly state: DayState;
  readonly primary: PrimaryOutputs;
  readonly operational: OperationalOutputs;
  /** Progress ring. Opens at 1 of 10, NEVER 0 of 9 (S6 Strategy 02, S1 §05). */
  readonly progress: { readonly done: number; readonly total: number };
  /** Cash check unlocks only when all eight sections are entered or skipped (D8). */
  readonly cashCheckUnlocked: boolean;
  readonly sectionStates: Readonly<Record<Section, 'entered' | 'skipped' | 'untouched'>>;
}

/* ------------------------------------------------------------------ *
 * BI6 - Credit Concentration. Decided autonomously; see AD-001.
 * ------------------------------------------------------------------ */

/**
 * BI6 · Credit Concentration.
 *
 * "OP6 warns him about money he owes; nothing in the set warns him about money owed
 * to him being dangerously concentrated in one person."
 *
 * What share of his outstanding udhar sits with his largest customer, and with his
 * largest three - and whether that share is getting worse. A shop with INR 18,000 of
 * receivables spread over 38 customers has a collection problem; the same INR 18,000
 * with INR 11,000 owed by one man has a solvency problem, and P7 reports the same
 * number for both.
 */
export interface CreditConcentration {
  readonly totalOutstanding: Paise;
  readonly customerCount: number;
  /** The single largest debtor. Null when nothing is outstanding. */
  readonly topPartyId: string | null;
  /** Largest single customer's share of total outstanding. */
  readonly topShare: Ratio;
  /** Largest three customers' combined share. */
  readonly top3Share: Ratio;
  /**
   * Direction of the top-3 share against the baseline median of the window.
   * 'no_baseline' when there is no history to compare - never 'stable', because
   * "we cannot tell yet" and "it has not moved" are different statements.
   */
  readonly direction: 'worsening' | 'improving' | 'stable' | 'no_baseline';
  readonly baselineTop3BasisPoints: number | null;
}
