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

/**
 * THE FOUR EVENT SECTIONS - a return, and what settled it (review §6-§7, EX-2).
 *
 * NOT CLOSING SECTIONS, and kept out of SECTIONS on purpose (EX-7). The progress
 * ring counts ten steps and the cash check opens when the EIGHT closing sections
 * are entered or skipped; a shop that never takes a return must not tap "Nothing
 * to enter" four more times a day. A return is an event that lands in the ledger,
 * not a line of the paper sheet that has to be ticked off.
 *
 *   sales_return      goods came back, at the price they went out. P4 '-'. Mode `other`.
 *   exchange_out      replacement goods went out. P4 '+'. Mode `other`.
 *   exchange_receipt  the customer paid the difference. Cash moves P1/P3 (D2).
 *   refund_paid       the shop paid the customer: cash (P2/P3), UPI, or udhar (P7 '-').
 *
 * Every leg carries `refersToEntryId`: a return points at the sale it reverses,
 * and each settlement leg points at its return. That one link IS the event (EX-3);
 * there is no events table and no stored status (EX-4, `settlementOf`).
 */
export const EVENT_SECTIONS = ['sales_return', 'exchange_out', 'exchange_receipt', 'refund_paid'] as const;
export type EventSection = (typeof EVENT_SECTIONS)[number];

/** Every section an entry may carry: the eight closing sections, then the four event ones. */
export const ENTRY_SECTIONS = [...SECTIONS, ...EVENT_SECTIONS] as const;
export type EntrySection = Section | EventSection;

export const isEventSection = (s: string): s is EventSection =>
  (EVENT_SECTIONS as readonly string[]).includes(s);

export const MODES = ['cash', 'upi', 'other', 'udhar', 'shop_stock'] as const;
export type Mode = (typeof MODES)[number];

export const DAY_STATES = ['not_started', 'open', 'ready', 'closed', 'not_closed'] as const;
export type DayState = (typeof DAY_STATES)[number];

/** An ISO calendar date, 'YYYY-MM-DD'. Client-assigned; never rewritten (ADR-004). */
// IsoDate is defined in dates.ts and re-exported here so this module stays the one
// place a reader looks for the domain types. Declaring it twice made `export *` from
// both ambiguous (TS2308) - invisible until typechecking was switched on.
import type { DayStart, IsoDate } from './dates.ts';
export type { IsoDate };

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
  readonly section: EntrySection;
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
  /**
   * THE ROW THIS ONE IS ABOUT (EX-3). A day-level `correctsDayId` cannot say
   * which of four expenses was wrong; this can.
   *
   *   sales_return                 -> the sale it reverses
   *   exchange_out / _receipt,
   *   refund_paid                  -> the sales_return it settles
   *   a correction (correctsDayId) -> the closed day's entry it corrects (HT-11)
   *
   * A pointer, never a copy: nothing about the referenced row is restated here.
   */
  readonly refersToEntryId?: string;
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
   * The rule this day was created under: the wall-clock time it starts, and it
   * ends at that time on the next date (decision 1). Fixed when the day is made
   * and never changed after - a later shop setting governs only later days.
   * Absent on a day recorded before the setting existed, which reads as '00:00':
   * a calendar day, which is exactly what it was.
   */
  readonly startsAt?: DayStart;
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

/* ------------------------------------------------------------------ *
 * Decision 2 - typed adjustments. Decision 3 - confirmed UPI receipts.
 * ------------------------------------------------------------------ */

/**
 * THE FIXED LIST (decision 2). Never free-form: a free-text adjustment can absorb
 * any discrepancy and would make expected-vs-actual mean nothing. Kept short on
 * purpose; each one is a thing that happens at an Indian shop counter every week.
 * What each type moves - expected cash, profit, both or neither - is the table
 * `ADJUSTMENT_EFFECT` in adjustments.ts, reasoned there from D2 and D3.
 *
 * Duplicated in @swafto/schema for the same reason SECTIONS is; a test holds the
 * two in lockstep.
 */
export const ADJUSTMENT_TYPES = [
  'counterfeit_note',
  'rounding_given',
  'rounding_kept',
  'home_use',
  'stock_written_off',
] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

/**
 * SEC-05: AN ADJUSTMENT IS NOT AN `entries` ROW. It has no section, no mode, no
 * party, no label and no free text anywhere - only a type from the list and an
 * amount from the keypad. Append-only like an entry (D1): a wrong one is answered
 * by another, never by an edit.
 */
export interface Adjustment {
  readonly id: string;
  readonly dayId: IsoDate;
  readonly type: AdjustmentType;
  /** INTEGER PAISE, never negative. The direction is the type's, not the sign's. */
  readonly amount: Paise;
  readonly createdAt: string;
}

/**
 * "THIS UPI RECEIPT ARRIVED" - a fact the shopkeeper states, as its own row (D1).
 * It never UPDATEs the entry it is about. The bulk path writes one of these per
 * receipt, sharing a `batchId`, so a receipt typed AFTER a bulk tap is never
 * covered by it.
 */
export interface UpiConfirmation {
  readonly id: string;
  readonly dayId: IsoDate;
  readonly entryId: string;
  readonly batchId?: string;
  readonly confirmedAt: string;
}

/** Everything the engine needs to compute one day. Passed in; never fetched. */
export interface DayInput {
  readonly day: DayRecord;
  /** Entries whose `dayId` is this day. */
  readonly entries: readonly Entry[];
  /** Decision 2. Absent is the same as none. */
  readonly adjustments?: readonly Adjustment[];
  /** Decision 3. Absent is the same as none - every UPI receipt unconfirmed. */
  readonly upiConfirmations?: readonly UpiConfirmation[];
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
