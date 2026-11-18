/**
 * THE UPI LEDGER - A SECOND EQUATION, NEVER AN ADDITION TO THE FIRST (D2).
 *
 * PURE. No clock, no I/O.
 *
 * A UPI sale puts no cash in the till, so nothing here goes near P1-P3. This is
 * the same section logic the cash equation uses, sliced to `upi` mode instead of
 * `cash`, and it answers a different question: did the money the shopkeeper
 * recorded as arriving by UPI actually arrive?
 *
 * DECISION 3 FIXES "ACTUAL". Actual UPI is the sum of the receipts he CONFIRMS,
 * one by one or all at once - never a bank balance, which carries personal money
 * and would make the difference meaningless. So the check compares like with like:
 * UPI receipts recorded against UPI receipts confirmed. Money paid out by UPI is
 * his own outgoing payment, already a fact he typed; it is in the net figure below
 * and not in the check.
 *
 * NEVER A CONFIDENCE IT HAS NOT EARNED. A day with UPI receipts and no
 * confirmations is `not_checked` - not balanced, not zero difference. A day may
 * close that way, and it says so.
 */
import { sum, subtract, type Paise } from './money.ts';
import { figure } from './primary.ts';
import type { DayInput, Entry, EntrySection, Figure, Mode, WorkingLine } from './types.ts';

const total = (entries: readonly Entry[], section: EntrySection, mode: Mode): Paise =>
  sum(entries.filter((e) => e.section === section && e.mode === mode).map((e) => e.amount));

/**
 * Money IN by UPI: a UPI sale, a customer settling udhar by UPI, or a customer
 * paying an exchange difference by UPI (§2.3). The last is a receipt that lands
 * in the UPI app like the other two, so it is confirmed the same way.
 */
export const isUpiReceipt = (e: Entry): boolean =>
  e.mode === 'upi' &&
  (e.section === 'upi_sales' || e.section === 'udhar_collection' || e.section === 'exchange_receipt');

/**
 * A return's UPI line, only on a day with that event section - as P3 does
 * (`whenPresent` in primary.ts), so a day without a return keeps its working.
 */
const eventLine = (entries: readonly Entry[], section: EntrySection, line: WorkingLine): WorkingLine[] =>
  entries.some((e) => e.section === section) ? [line] : [];

/**
 * Expected UPI, net: UPI in minus UPI out, by the cash equation's own sections.
 * Mirrors P3's shape so the two read side by side; no opening balance, because
 * under decision 3 the ledger is per day and self-contained.
 */
export function expectedUpi(input: DayInput): Figure {
  const { entries } = input;
  return figure([
    { key: 'working.upi_sales', sign: '+', amount: total(entries, 'upi_sales', 'upi') },
    { key: 'working.udhar_collected_upi', sign: '+', amount: total(entries, 'udhar_collection', 'upi') },
    { key: 'working.expense_upi', sign: '-', amount: total(entries, 'expense', 'upi') },
    { key: 'working.purchase_upi', sign: '-', amount: total(entries, 'purchase', 'upi') },
    { key: 'working.party_payment_upi', sign: '-', amount: total(entries, 'party_payment', 'upi') },
    { key: 'working.withdrawal_upi', sign: '-', amount: total(entries, 'withdrawal', 'upi') },
    // §2.3: an exchange difference received by UPI comes in; a refund paid by UPI goes out.
    ...eventLine(entries, 'exchange_receipt', {
      key: 'working.exchange_received_upi',
      sign: '+',
      amount: total(entries, 'exchange_receipt', 'upi'),
    }),
    ...eventLine(entries, 'refund_paid', {
      key: 'working.refund_paid_upi',
      sign: '-',
      amount: total(entries, 'refund_paid', 'upi'),
    }),
  ]);
}

export type UpiCheckStatus = 'no_upi' | 'not_checked' | 'partly_checked' | 'checked';

export interface UpiCheck {
  /** What the entries say came in by UPI. */
  readonly expectedReceived: Paise;
  /** Actual UPI (decision 3): only what he has confirmed. */
  readonly confirmedReceived: Paise;
  /** confirmed - expected. Never positive: a confirmation can only cover a receipt. */
  readonly difference: Paise;
  readonly receiptCount: number;
  readonly confirmedCount: number;
  /** The receipts still to tick, in the order they were typed. */
  readonly unconfirmed: readonly Entry[];
  readonly status: UpiCheckStatus;
}

/**
 * The UPI check. A confirmation counts only if it names a UPI receipt OF THIS DAY;
 * one naming anything else (a cash sale, another day's entry, an id that does not
 * exist) is ignored rather than trusted, and two confirmations of one receipt
 * count it once.
 */
export function upiCheck(input: DayInput): UpiCheck {
  const receipts = input.entries.filter((e) => isUpiReceipt(e) && e.dayId === input.day.date);
  const confirmedIds = new Set(
    (input.upiConfirmations ?? []).filter((c) => c.dayId === input.day.date).map((c) => c.entryId),
  );
  const confirmed = receipts.filter((e) => confirmedIds.has(e.id));
  const unconfirmed = receipts.filter((e) => !confirmedIds.has(e.id));
  const expectedReceived = sum(receipts.map((e) => e.amount));
  const confirmedReceived = sum(confirmed.map((e) => e.amount));
  const status: UpiCheckStatus =
    receipts.length === 0
      ? 'no_upi'
      : confirmed.length === 0
        ? 'not_checked'
        : unconfirmed.length === 0
          ? 'checked'
          : 'partly_checked';
  return {
    expectedReceived,
    confirmedReceived,
    difference: subtract(confirmedReceived, expectedReceived),
    receiptCount: receipts.length,
    confirmedCount: confirmed.length,
    unconfirmed,
    status,
  };
}
