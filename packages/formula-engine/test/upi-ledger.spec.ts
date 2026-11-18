/**
 * §2.2 THE UPI LEDGER (decision 3) and §2.4 TYPED ADJUSTMENTS (decision 2).
 *
 * Every expected value here is worked by hand from the rule it names, never
 * read back from the engine.
 */
import { describe, it, expect } from 'vitest';
import {
  ADJUSTMENT_EFFECT,
  ADJUSTMENT_TYPES,
  add,
  buildReturnEvent,
  subtract,
  estimatedProfit,
  expectedCashBalance,
  expectedUpi,
  upiCheck,
  totalCashReceived,
  totalCashPaid,
  type Adjustment,
  type AdjustmentType,
  type DayInput,
  type Entry,
  type UpiConfirmation,
} from '../src/index.ts';
import { ADJUSTMENT_TYPES as SCHEMA_ADJUSTMENT_TYPES } from '../../schema/src/spec.ts';

const DAY = '2026-07-15';
let n = 0;
const entry = (section: Entry['section'], mode: Entry['mode'], amount: number, partyId?: string): Entry => ({
  id: 'e' + String((n += 1)),
  dayId: DAY,
  section,
  mode,
  amount,
  createdAt: '2026-07-15T10:00:00.000Z',
  source: 'manual',
  ...(partyId ? { partyId } : {}),
});
const confirm = (entryId: string, dayId = DAY): UpiConfirmation => ({
  id: 'c-' + entryId,
  dayId,
  entryId,
  confirmedAt: '2026-07-15T21:00:00.000Z',
});
const adj = (type: AdjustmentType, amount: number): Adjustment => ({
  id: 'a-' + type + String((n += 1)),
  dayId: DAY,
  type,
  amount,
  createdAt: '2026-07-15T21:00:00.000Z',
});
const input = (entries: Entry[], extra: Partial<DayInput> = {}): DayInput => ({
  day: { date: DAY, state: 'open', openingCash: 100000, countedCash: null, skippedSections: [] },
  entries,
  priorCreditOutstanding: 0,
  priorSupplierOutstanding: 0,
  ...extra,
});

const upiSale = entry('upi_sales', 'upi', 30000);
const upiCollect = entry('udhar_collection', 'upi', 12000, 'p1');
const cashSale = entry('cash_sales', 'cash', 50000);
const upiExpense = entry('expense', 'upi', 4000);
const upiPurchase = entry('purchase', 'upi', 9000);
const upiWithdraw = entry('withdrawal', 'upi', 2000);
const day = [upiSale, upiCollect, cashSale, upiExpense, upiPurchase, upiWithdraw];

describe('§2.2 the UPI ledger is a second equation (D2)', () => {
  it('expected UPI = UPI in - UPI out: 300 + 120 - 40 - 90 - 20 = ₹270', () => {
    expect(expectedUpi(input(day)).value).toBe(27000);
  });

  it('never touches the cash equation: P3 is the same with or without every UPI entry', () => {
    expect(expectedCashBalance(input(day)).value).toBe(expectedCashBalance(input([cashSale])).value);
    // ₹1,000 opening + ₹500 cash sale, and nothing UPI.
    expect(expectedCashBalance(input(day)).value).toBe(150000);
  });

  it('with nothing confirmed the check is NOT checked - never a zero difference', () => {
    const c = upiCheck(input(day));
    expect(c.status).toBe('not_checked');
    expect(c.expectedReceived).toBe(42000);
    expect(c.confirmedReceived).toBe(0);
    expect(c.difference).toBe(-42000);
    expect(c.unconfirmed.map((e) => e.id)).toEqual([upiSale.id, upiCollect.id]);
  });

  it('a collection in cash or "other" is not a UPI receipt, and cannot be confirmed as one', () => {
    const cashCollect = entry('udhar_collection', 'cash', 5000, 'p1');
    const otherCollect = entry('udhar_collection', 'other', 6000, 'p1');
    const c = upiCheck(
      input([cashCollect, otherCollect], { upiConfirmations: [confirm(cashCollect.id)] }),
    );
    expect(c.status).toBe('no_upi');
    expect(c.expectedReceived).toBe(0);
    expect(c.confirmedReceived).toBe(0);
  });

  it('a day with no UPI receipt says so, and is not "checked"', () => {
    expect(upiCheck(input([cashSale, upiExpense])).status).toBe('no_upi');
  });

  it('per entry: one of two ticked is partly checked, both is checked', () => {
    const one = upiCheck(input(day, { upiConfirmations: [confirm(upiSale.id)] }));
    expect(one.status).toBe('partly_checked');
    expect(one.confirmedReceived).toBe(30000);
    expect(one.unconfirmed.map((e) => e.id)).toEqual([upiCollect.id]);

    const both = upiCheck(
      input(day, { upiConfirmations: [confirm(upiSale.id), confirm(upiCollect.id)] }),
    );
    expect(both.status).toBe('checked');
    expect(both.difference).toBe(0);
  });

  it('a receipt typed after a bulk confirm is not covered by it', () => {
    const later = entry('upi_sales', 'upi', 7000);
    const c = upiCheck(
      input([...day, later], { upiConfirmations: [confirm(upiSale.id), confirm(upiCollect.id)] }),
    );
    expect(c.status).toBe('partly_checked');
    expect(c.unconfirmed.map((e) => e.id)).toEqual([later.id]);
  });

  it('ignores a confirmation of a cash entry, a UPI payment, another day, or nothing; counts a duplicate once', () => {
    const c = upiCheck(
      input(day, {
        upiConfirmations: [
          confirm(cashSale.id),
          confirm(upiExpense.id),
          confirm(upiSale.id, '2026-07-14'),
          confirm('no-such-entry'),
          confirm(upiCollect.id),
          { ...confirm(upiCollect.id), id: 'dup' },
        ],
      }),
    );
    expect(c.confirmedCount).toBe(1);
    expect(c.confirmedReceived).toBe(12000);
  });
});

describe('§2.4 typed adjustments (decision 2)', () => {
  it('the engine and the schema hold the same fixed list', () => {
    expect([...ADJUSTMENT_TYPES]).toEqual([...SCHEMA_ADJUSTMENT_TYPES]);
    expect(Object.keys(ADJUSTMENT_EFFECT).sort()).toEqual([...ADJUSTMENT_TYPES].sort());
  });

  it('a day with no adjustment has exactly the seven cash lines and three profit lines', () => {
    expect(expectedCashBalance(input(day)).working.lines).toHaveLength(7);
    expect(estimatedProfit(input(day)).working.lines).toHaveLength(3);
  });

  it('a counterfeit note takes cash AND profit down by its value', () => {
    const plain = input(day);
    const withFake = input(day, { adjustments: [adj('counterfeit_note', 50000)] });
    expect(expectedCashBalance(withFake).value).toBe(subtract(expectedCashBalance(plain).value, 50000));
    expect(estimatedProfit(withFake).value).toBe(subtract(estimatedProfit(plain).value, 50000));
    expect(expectedCashBalance(withFake).working.lines.at(-1)).toEqual({
      key: 'adjustment.counterfeit_note',
      sign: '-',
      amount: 50000,
    });
  });

  it('chhutta given takes cash and profit down; chhutta kept puts both up', () => {
    const plain = input(day);
    const given = input(day, { adjustments: [adj('rounding_given', 200), adj('rounding_given', 300)] });
    const kept = input(day, { adjustments: [adj('rounding_kept', 100)] });
    expect(expectedCashBalance(given).value).toBe(subtract(expectedCashBalance(plain).value, 500));
    expect(estimatedProfit(given).value).toBe(subtract(estimatedProfit(plain).value, 500));
    expect(expectedCashBalance(kept).value).toBe(add(expectedCashBalance(plain).value, 100));
    expect(estimatedProfit(kept).value).toBe(add(estimatedProfit(plain).value, 100));
  });

  it('goods for home use move NO cash (D2) and take their cost back out of purchase (D3)', () => {
    const plain = input(day);
    const home = input(day, { adjustments: [adj('home_use', 8000)] });
    expect(expectedCashBalance(home).value).toBe(expectedCashBalance(plain).value);
    expect(expectedCashBalance(home).working.lines).toHaveLength(7);
    expect(estimatedProfit(home).value).toBe(add(estimatedProfit(plain).value, 8000));
  });

  it('stock written off moves neither: its purchase is already in profit in full', () => {
    const plain = input(day);
    const off = input(day, { adjustments: [adj('stock_written_off', 6000)] });
    expect(expectedCashBalance(off)).toEqual(expectedCashBalance(plain));
    expect(estimatedProfit(off)).toEqual(estimatedProfit(plain));
  });

  it("P1 and P2 stay the entries' own totals; only P3 carries the cash adjustment", () => {
    const plain = input(day);
    const withFake = input(day, { adjustments: [adj('counterfeit_note', 50000)] });
    expect(totalCashReceived(withFake)).toEqual(totalCashReceived(plain));
    expect(totalCashPaid(withFake)).toEqual(totalCashPaid(plain));
  });

  it('an adjustment never moves the UPI ledger', () => {
    const withAll = input(day, { adjustments: ADJUSTMENT_TYPES.map((t) => adj(t, 1000)) });
    expect(expectedUpi(withAll)).toEqual(expectedUpi(input(day)));
    expect(upiCheck(withAll)).toEqual(upiCheck(input(day)));
  });
});

/*
 * §2.3 ON THE UPI LEDGER. A refund paid by UPI leaves the UPI app and an exchange
 * difference received by UPI arrives in it, exactly as their cash twins move P3.
 * Legs are built by `buildReturnEvent`, the way the app builds them.
 */
describe('§2.3 returns on the UPI ledger', () => {
  const ids = (k: string) => [k + '-r', k + '-o', k + '-m'];
  const at = '2026-07-15T18:00:00.000Z';
  const common = { ledger: [], dayId: DAY, createdAt: at };

  it('a UPI refund comes off expected UPI: 300 - 120 = ₹180, and P3 does not move', () => {
    const legs = buildReturnEvent({ ...common, sale: upiSale, ids: ids('rf'), returned: 12000, settlement: 'upi' });
    expect(legs.map((l) => [l.section, l.mode])).toEqual([
      ['sales_return', 'other'],
      ['refund_paid', 'upi'],
    ]);
    const i = input([upiSale, ...legs]);
    expect(expectedUpi(i).value).toBe(18000);
    expect(expectedUpi(i).working.lines.at(-1)).toEqual({ key: 'working.refund_paid_upi', sign: '-', amount: 12000 });
    expect(expectedCashBalance(i).value).toBe(100000);
    // Money out is in the net figure, never the check: still one receipt, ₹300.
    expect(upiCheck(i).expectedReceived).toBe(30000);
  });

  it('an exchange difference paid by UPI adds to expected UPI and is a receipt he can confirm', () => {
    const legs = buildReturnEvent({
      ...common,
      sale: upiSale,
      ids: ids('ex'),
      returned: 10000,
      settlement: 'exchange',
      replacement: 25000,
      differenceMode: 'upi',
    });
    const receipt = legs.find((l) => l.section === 'exchange_receipt');
    expect(receipt).toMatchObject({ mode: 'upi', amount: 15000 });
    const i = input([upiSale, ...legs]);
    // ₹300 in by the sale + ₹150 in by the exchange difference.
    expect(expectedUpi(i).value).toBe(45000);
    expect(upiCheck(i)).toMatchObject({ expectedReceived: 45000, receiptCount: 2, status: 'not_checked' });
    const done = upiCheck(
      input([upiSale, ...legs], { upiConfirmations: [confirm(upiSale.id), confirm(receipt!.id)] }),
    );
    expect(done).toMatchObject({ confirmedReceived: 45000, difference: 0, status: 'checked' });
  });

  it('cash-mode return legs leave the UPI figure and its receipts unchanged', () => {
    const legs = buildReturnEvent({ ...common, sale: cashSale, ids: ids('cs'), returned: 5000, settlement: 'cash' });
    expect(expectedUpi(input([upiSale, ...legs])).value).toBe(30000);
    expect(upiCheck(input([upiSale, ...legs])).receiptCount).toBe(1);
  });
});
