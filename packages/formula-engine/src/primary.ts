/**
 * P1-P8 and estimated profit. Pure arithmetic, available from day one, NEVER gated.
 *
 * Every figure carries its WORKING - the line-by-line derivation - because the cash
 * check screen shows the expected balance "as its working, not as a verdict", so the
 * owner can see WHICH LINE is wrong rather than merely that something is.
 *
 * The two rules most likely to be "fixed" back by a well-meaning developer:
 *   D2 - only Cash mode touches the cash equation. UPI, Other, Udhar and Shop stock
 *        do NOT move cash, but all five DO count toward total expenses.
 *   D3 - withdrawal reduces cash, is NEVER an expense, and NEVER touches profit.
 * Both have named tests that fail loudly.
 */

import { add, subtract, sum, type Paise } from './money.ts';
import type {
  DayInput,
  Entry,
  Figure,
  Mode,
  PrimaryOutputs,
  Section,
  Working,
  WorkingLine,
} from './types.ts';

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

const bySection = (entries: readonly Entry[], section: Section): Entry[] =>
  entries.filter((e) => e.section === section);

const totalOf = (entries: readonly Entry[]): Paise => sum(entries.map((e) => e.amount));

/** Entries in a section, restricted to one payment mode. */
const sectionModeTotal = (entries: readonly Entry[], section: Section, mode: Mode): Paise =>
  totalOf(bySection(entries, section).filter((e) => e.mode === mode));

/** Build a Figure from its lines, summing signs. Total is derived, never passed in. */
function figure(lines: readonly WorkingLine[]): Figure {
  let total = 0;
  for (const l of lines) {
    total = l.sign === '+' ? add(total, l.amount) : subtract(total, l.amount);
  }
  const working: Working = { lines, total };
  return { value: total, working };
}

/* ------------------------------------------------------------------ *
 * P1-P8
 * ------------------------------------------------------------------ */

/**
 * P1 · Total Cash Received = cash sales + cash portion of udhar collection.
 *
 * "cash_sales + cash_collections" - Day-Close doc p.9.
 * Note a collection in UPI or Other mode reduces the customer's debt (P7) but does
 * NOT put cash in the box, so it is absent here and present there.
 */
export function totalCashReceived(input: DayInput): Figure {
  const { entries } = input;
  return figure([
    { key: 'working.cash_sales', sign: '+', amount: totalOf(bySection(entries, 'cash_sales')) },
    {
      key: 'working.udhar_collected_cash',
      sign: '+',
      amount: sectionModeTotal(entries, 'udhar_collection', 'cash'),
    },
  ]);
}

/**
 * P2 · Total Cash Paid = cash purchase + cash expenses + cash party payment + withdrawal.
 *
 * D2: ONLY `cash` mode appears here. A shop-stock expense is a real cost and NOT a
 * cash outflow - if it landed here every expected balance would be wrong by that
 * amount and the shopkeeper's first reconciliation would fail for a reason he cannot
 * see.
 *
 * D3: the withdrawal IS here (it does reduce the cash in the box) and is deliberately
 * absent from P6 and from profit.
 */
export function totalCashPaid(input: DayInput): Figure {
  const { entries } = input;
  return figure([
    {
      key: 'working.cash_purchase',
      sign: '+',
      amount: sectionModeTotal(entries, 'purchase', 'cash'),
    },
    {
      key: 'working.cash_expenses',
      sign: '+',
      amount: sectionModeTotal(entries, 'expense', 'cash'),
    },
    {
      key: 'working.cash_party_payment',
      sign: '+',
      amount: sectionModeTotal(entries, 'party_payment', 'cash'),
    },
    {
      key: 'working.withdrawal_cash',
      sign: '+',
      amount: sectionModeTotal(entries, 'withdrawal', 'cash'),
    },
  ]);
}

/**
 * P3 · Expected Cash Balance = opening cash + P1 - P2.
 *
 * This is the paper sheet's formula verbatim:
 *   F = Opening Cash + Cash Sales + Udhar Cash Collection
 *       - Cash Purchase - Cash Expense - Cash Withdrawal
 *
 * The working is expanded to those seven lines rather than three, because the cash
 * check screen shows exactly those lines and the shopkeeper checks them against his
 * paper sheet one at a time.
 */
export function expectedCashBalance(input: DayInput): Figure {
  const { entries, day } = input;
  const opening = day.openingCash ?? 0;
  return figure([
    { key: 'working.opening_cash', sign: '+', amount: opening },
    { key: 'working.cash_sales', sign: '+', amount: totalOf(bySection(entries, 'cash_sales')) },
    {
      key: 'working.udhar_collected_cash',
      sign: '+',
      amount: sectionModeTotal(entries, 'udhar_collection', 'cash'),
    },
    {
      key: 'working.cash_purchase',
      sign: '-',
      amount: sectionModeTotal(entries, 'purchase', 'cash'),
    },
    {
      key: 'working.cash_expenses',
      sign: '-',
      amount: sectionModeTotal(entries, 'expense', 'cash'),
    },
    {
      key: 'working.cash_party_payment',
      sign: '-',
      amount: sectionModeTotal(entries, 'party_payment', 'cash'),
    },
    {
      key: 'working.withdrawal_cash',
      sign: '-',
      amount: sectionModeTotal(entries, 'withdrawal', 'cash'),
    },
  ]);
}

/** P4 · Net Sales = cash + UPI + udhar sales. The sheet's "TOTAL SALES (B)". */
export function netSales(input: DayInput): Figure {
  const { entries } = input;
  return figure([
    { key: 'working.cash_sales', sign: '+', amount: totalOf(bySection(entries, 'cash_sales')) },
    { key: 'working.upi_sales', sign: '+', amount: totalOf(bySection(entries, 'upi_sales')) },
    { key: 'working.udhar_sales', sign: '+', amount: totalOf(bySection(entries, 'udhar_sales')) },
  ]);
}

/** P5 · Net Purchase = all purchase, EVERY mode. The sheet's "TOTAL PURCHASE (D)". */
export function netPurchase(input: DayInput): Figure {
  return figure([
    {
      key: 'working.purchase_all_modes',
      sign: '+',
      amount: totalOf(bySection(input.entries, 'purchase')),
    },
  ]);
}

/**
 * P6 · Total Expenses = all expenses, EVERY mode including shop stock.
 *
 * D2's second half: only the cash ones appear in P2, but ALL FIVE count here and
 * toward profit. The working is broken out by mode so the shopkeeper can see why this
 * figure is larger than the cash expenses line on his cash check.
 *
 * Withdrawal is NOT here (D3).
 */
export function totalExpenses(input: DayInput): Figure {
  const { entries } = input;
  return figure([
    { key: 'working.expense_cash', sign: '+', amount: sectionModeTotal(entries, 'expense', 'cash') },
    { key: 'working.expense_upi', sign: '+', amount: sectionModeTotal(entries, 'expense', 'upi') },
    {
      key: 'working.expense_other',
      sign: '+',
      amount: sectionModeTotal(entries, 'expense', 'other'),
    },
    {
      key: 'working.expense_udhar',
      sign: '+',
      amount: sectionModeTotal(entries, 'expense', 'udhar'),
    },
    {
      key: 'working.expense_shop_stock',
      sign: '+',
      amount: sectionModeTotal(entries, 'expense', 'shop_stock'),
    },
  ]);
}

/**
 * P7 · Credit Outstanding = prior outstanding + udhar sales - udhar collections.
 *
 * Collections in ANY mode reduce the debt - a customer who settles by UPI has still
 * settled. That is why this uses the section total while P1 uses the cash-mode slice.
 */
export function creditOutstanding(input: DayInput): Figure {
  const { entries, priorCreditOutstanding } = input;
  return figure([
    { key: 'working.prior_credit_outstanding', sign: '+', amount: priorCreditOutstanding },
    { key: 'working.udhar_sales', sign: '+', amount: totalOf(bySection(entries, 'udhar_sales')) },
    {
      key: 'working.udhar_collection_all_modes',
      sign: '-',
      amount: totalOf(bySection(entries, 'udhar_collection')),
    },
  ]);
}

/**
 * P8 · Supplier Outstanding = prior + credit purchases - party payments.
 *
 * "Credit purchase" means a purchase in UDHAR mode specifically - a cash purchase
 * creates no supplier due.
 */
export function supplierOutstanding(input: DayInput): Figure {
  const { entries, priorSupplierOutstanding } = input;
  return figure([
    { key: 'working.prior_supplier_outstanding', sign: '+', amount: priorSupplierOutstanding },
    {
      key: 'working.purchase_udhar',
      sign: '+',
      amount: sectionModeTotal(entries, 'purchase', 'udhar'),
    },
    {
      key: 'working.party_payment_all_modes',
      sign: '-',
      amount: totalOf(bySection(entries, 'party_payment')),
    },
  ]);
}

/**
 * Estimated Profit = NET SALES - PURCHASE - EXPENSE.
 *
 * WITHDRAWAL IS ABSENT. That is not an omission - it is decision D3, and the sheet's
 * own formula is correct precisely because withdrawal is missing from it.
 *
 * "This is the single most common error in small-shop bookkeeping, and it is the kind
 * of thing a developer will confidently 'correct' during a refactor because it looks
 * like money going out."  - Decisions doc, D3
 *
 * If you are here to add withdrawal to this subtraction: don't. Read D3, then read the
 * vector named `d3-withdrawal-excluded-from-profit`.
 */
export function estimatedProfit(input: DayInput): Figure {
  return figure([
    { key: 'working.net_sales', sign: '+', amount: netSales(input).value },
    { key: 'working.purchase_all_modes', sign: '-', amount: netPurchase(input).value },
    { key: 'working.expenses_all_modes', sign: '-', amount: totalExpenses(input).value },
  ]);
}

export function computePrimary(input: DayInput): PrimaryOutputs {
  return {
    p1TotalCashReceived: totalCashReceived(input),
    p2TotalCashPaid: totalCashPaid(input),
    p3ExpectedCashBalance: expectedCashBalance(input),
    p4NetSales: netSales(input),
    p5NetPurchase: netPurchase(input),
    p6TotalExpenses: totalExpenses(input),
    p7CreditOutstanding: creditOutstanding(input),
    p8SupplierOutstanding: supplierOutstanding(input),
    estimatedProfit: estimatedProfit(input),
  };
}
