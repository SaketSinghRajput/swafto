/**
 * FR-7 BASIC REPORTS and PR-4 COMPARISONS, against HAND-WORKED figures.
 *
 * Every expected value is worked in the comment beside it from the entries the
 * test writes, never read back from the engine. Amounts are paise.
 */
import { describe, it, expect } from 'vitest';
import {
  DUE_AGE_BUCKETS,
  FESTIVALS,
  bucketOf,
  cashCheckHistory,
  daysToPay,
  duesByAge,
  festivalWeeks,
  monthAtAGlance,
  monthOf,
  partyLedgerFold,
  previousMonth,
  returnsTrend,
  sameDateLastYear,
  samePeriodLastYear,
  upiMonth,
  type Adjustment,
  type Book,
  type DayRecord,
  type Entry,
  type Mode,
} from '../src/index.ts';

let seq = 0;
const e = (dayId: string, section: Entry['section'], amount: number, mode: Mode, partyId?: string): Entry => {
  seq += 1;
  return {
    id: `e${seq}`,
    dayId,
    section,
    amount,
    mode,
    ...(partyId ? { partyId } : {}),
    createdAt: `${dayId}T10:00:00.000Z`,
    source: 'manual',
  };
};

const day = (date: string, state: DayRecord['state'], openingCash: number | null, countedCash: number | null, reason?: string): DayRecord => ({
  date,
  state,
  openingCash,
  countedCash,
  skippedSections: [],
  ...(reason ? { differenceReason: reason } : {}),
});

describe('dues by age', () => {
  it('the buckets are 0-30, 31-60, 61-90 and over 90, edges included where they say', () => {
    expect(DUE_AGE_BUCKETS.map((b) => [b.from, b.to])).toEqual([[0, 30], [31, 60], [61, 90], [91, null]]);
    expect([0, 30, 31, 60, 61, 90, 91, 400].map(bucketOf)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  const TODAY = '2026-08-31';
  const entries = [
    // c1: 1,000 on 1 June (91 days), 500 on 15 July (47 days); 300 paid 20 July
    // comes off the OLDEST line first -> open 700 (bucket 3) and 500 (bucket 1).
    e('2026-06-01', 'udhar_sales', 100000, 'udhar', 'c1'),
    e('2026-07-15', 'udhar_sales', 50000, 'udhar', 'c1'),
    e('2026-07-20', 'udhar_collection', 30000, 'cash', 'c1'),
    // c2: 400 on 25 Aug paid in full the next day by UPI; 200 more on 28 Aug, open (3 days).
    e('2026-08-25', 'udhar_sales', 40000, 'udhar', 'c2'),
    e('2026-08-26', 'udhar_collection', 40000, 'upi', 'c2'),
    e('2026-08-28', 'udhar_sales', 20000, 'udhar', 'c2'),
    // c3: paid 100 before owing anything - held as an advance - then took 250: open 150.
    e('2026-08-20', 'udhar_collection', 10000, 'cash', 'c3'),
    e('2026-08-28', 'udhar_sales', 25000, 'udhar', 'c3'),
    // Nobody named: P7 counts it, no party can be aged by it.
    e('2026-08-01', 'udhar_sales', 99900, 'udhar'),
    // Not credit at all.
    e('2026-08-01', 'cash_sales', 77700, 'cash', 'c1'),
    // Suppliers: 5,000 bought on udhar 1 Aug, 1,000 paid; a cash purchase is no due.
    e('2026-08-01', 'purchase', 500000, 'udhar', 's1'),
    e('2026-08-01', 'purchase', 200000, 'cash', 's1'),
    e('2026-08-10', 'party_payment', 100000, 'cash', 's1'),
  ];

  it('customers, oldest unpaid first, each line aged from the day it went out', () => {
    const d = duesByAge(entries, 'customer', TODAY);
    expect(d.parties).toEqual([
      { partyId: 'c1', amount: 120000, oldestDate: '2026-06-01', oldestAgeDays: 91, byBucket: [0, 50000, 0, 70000] },
      // Same age (3 days): the larger amount first.
      { partyId: 'c2', amount: 20000, oldestDate: '2026-08-28', oldestAgeDays: 3, byBucket: [20000, 0, 0, 0] },
      { partyId: 'c3', amount: 15000, oldestDate: '2026-08-28', oldestAgeDays: 3, byBucket: [15000, 0, 0, 0] },
    ]);
    // 20,000 + 15,000 | 50,000 | 0 | 70,000
    expect(d.bucketTotals).toEqual([35000, 50000, 0, 70000]);
    expect(d.total).toBe(155000);
  });

  it('suppliers: only the udhar purchase is owed, less what was paid', () => {
    const d = duesByAge(entries, 'supplier', TODAY);
    expect(d.parties).toEqual([
      { partyId: 's1', amount: 400000, oldestDate: '2026-08-01', oldestAgeDays: 30, byBucket: [400000, 0, 0, 0] },
    ]);
    expect(d.total).toBe(400000);
  });

  it("a return's udhar legs move the customer's balance; its cash legs do not", () => {
    const fold = partyLedgerFold(
      [
        e('2026-08-01', 'udhar_sales', 10000, 'udhar', 'c9'),
        e('2026-08-02', 'exchange_receipt', 3000, 'udhar', 'c9'), // +3,000 onto his udhar
        e('2026-08-03', 'refund_paid', 2000, 'udhar', 'c9'), // credit issued: -2,000
        e('2026-08-03', 'refund_paid', 5000, 'cash', 'c9'), // paid out in cash: no move
        e('2026-08-03', 'exchange_receipt', 5000, 'cash', 'c9'), // paid on the spot: no move
        e('2026-08-03', 'sales_return', 5000, 'udhar', 'c9'), // the goods leg: no move
      ],
      'customer',
    );
    // 10,000 on 1 Aug less 2,000 (oldest first) = 8,000; 3,000 on 2 Aug untouched.
    expect(fold).toEqual([
      { partyId: 'c9', open: [{ date: '2026-08-01', amount: 8000 }, { date: '2026-08-02', amount: 3000 }], settled: [] },
    ]);
  });

  it('an advance larger than the next credit absorbs all of it, and the rest waits', () => {
    // Paid 300 ahead; took 200 (fully covered, nothing open); took 150 (100 covered, 50 open).
    const fold = partyLedgerFold(
      [
        e('2026-08-01', 'udhar_collection', 300, 'cash', 'c8'),
        e('2026-08-02', 'udhar_sales', 200, 'udhar', 'c8'),
        e('2026-08-03', 'udhar_sales', 150, 'udhar', 'c8'),
      ],
      'customer',
    );
    expect(fold[0]!.open).toEqual([{ date: '2026-08-03', amount: 50 }]);
  });

  it('a party with nothing left open is not listed', () => {
    const d = duesByAge(
      [e('2026-08-01', 'udhar_sales', 100, 'udhar', 'c1'), e('2026-08-02', 'udhar_collection', 100, 'cash', 'c1')],
      'customer',
      TODAY,
    );
    expect(d).toEqual({ parties: [], bucketTotals: [0, 0, 0, 0], total: 0 });
  });
});

/* ------------------------------------------------------------------ */

const ADJ: Adjustment[] = [
  { id: 'a1', dayId: '2026-08-10', type: 'home_use', amount: 5000, createdAt: '2026-08-10T12:00:00.000Z' },
];

const sold = e('2026-08-10', 'upi_sales', 50000, 'upi');
const collectedUpi = e('2026-08-10', 'udhar_collection', 20000, 'upi', 'c1');

const book: Book = {
  days: [
    day('2026-07-31', 'closed', 100000, 100000),
    day('2026-08-10', 'closed', 500000, 470000, 'unknown'),
    day('2026-08-11', 'open', 470000, null),
    day('2026-08-12', 'closed', 470000, 470000),
    day('2026-08-13', 'closed', 470000, 470100),
  ],
  entries: [
    e('2026-07-31', 'cash_sales', 999900, 'cash'),
    e('2026-07-31', 'upi_sales', 12300, 'upi'),
    e('2026-08-10', 'cash_sales', 100000, 'cash'),
    sold,
    e('2026-08-10', 'udhar_sales', 30000, 'udhar', 'c1'),
    collectedUpi,
    e('2026-08-10', 'expense', 20000, 'cash'),
    e('2026-08-10', 'purchase', 40000, 'cash'),
    e('2026-08-10', 'withdrawal', 60000, 'cash'),
    e('2026-08-11', 'cash_sales', 10000, 'cash'),
  ],
  adjustments: ADJ,
  upiConfirmations: [
    { id: 'u1', dayId: '2026-08-10', entryId: sold.id, confirmedAt: '2026-08-10T21:00:00.000Z' },
  ],
};

describe('month at a glance', () => {
  it('sales by mode, profit with withdrawal OUTSIDE it (D3), and what was left in the shop', () => {
    /*
     * August: 10th, 12th and 13th closed, 11th open (so "so far"). 31 July is not August.
     *   net sales    = 1,000 + 500 + 300 (10th) + 100 (11th)           = 1,900
     *   profit 10th  = 1,800 - purchase 400 - expense 200 + home use 50 = 1,250
     *   profit 11th  = 100                                               -> 1,350
     *   withdrawals  = 600, which profit does NOT subtract
     *   left in shop = 1,350 - 600 = 750
     */
    expect(monthAtAGlance(book, '2026-08')).toEqual({
      month: '2026-08',
      daysRecorded: 4,
      closedDays: 3,
      netSales: 190000,
      cashSales: 110000,
      upiSales: 50000,
      udharSales: 30000,
      expenses: 20000,
      purchases: 40000,
      estimatedProfit: 135000,
      withdrawals: 60000,
      profitLeftInShop: 75000,
    });
  });

  it('more taken home than earned reads negative, not zero', () => {
    const b: Book = { days: [day('2026-09-01', 'open', 0, null)], entries: [e('2026-09-01', 'withdrawal', 500, 'cash')] };
    expect(monthAtAGlance(b, '2026-09').profitLeftInShop).toBe(-500);
  });

  it('months are named YYYY-MM and step back across a year', () => {
    expect(monthOf('2026-08-31')).toBe('2026-08');
    expect(previousMonth('2026-01')).toBe('2025-12');
    expect(previousMonth('2026-03')).toBe('2026-02');
  });
});

describe('cash-check history', () => {
  it('each closed day, newest first, expected against counted with the reason given', () => {
    /*
     * 10 Aug: P3 = opening 5,000 + cash sale 1,000 - (expense 200 + purchase 400
     * + withdrawal 600) = 4,800. Counted 4,700: 100 short, reason "unknown".
     * 12 Aug: no entries, 4,700 expected and counted. 13 Aug: 1 rupee extra.
     * 31 Jul: 1,000 + 9,999 = 10,999 expected, 1,000 counted. The open 11th is no check.
     */
    const h = cashCheckHistory(book, 10);
    expect(h.days).toEqual([
      { date: '2026-08-13', expected: 470000, counted: 470100, difference: 100, status: 'extra' },
      { date: '2026-08-12', expected: 470000, counted: 470000, difference: 0, status: 'balanced' },
      { date: '2026-08-10', expected: 480000, counted: 470000, difference: -10000, status: 'short', reason: 'unknown' },
      { date: '2026-07-31', expected: 1099900, counted: 100000, difference: -999900, status: 'short' },
    ]);
    expect([h.balancedDays, h.shortDays, h.extraDays]).toEqual([1, 2, 1]);
  });

  it('keeps only the latest `last` closed days', () => {
    expect(cashCheckHistory(book, 2).days.map((d) => d.date)).toEqual(['2026-08-13', '2026-08-12']);
  });
});

describe('confirmed UPI per month', () => {
  it('only what he confirmed counts as arrived (decision 3)', () => {
    // August: UPI sale 500 confirmed, UPI collection 200 not. July's 123 is July's.
    expect(upiMonth(book, '2026-08')).toEqual({
      month: '2026-08',
      recorded: 70000,
      confirmed: 50000,
      receiptCount: 2,
      confirmedCount: 1,
    });
    expect(upiMonth(book, '2026-07')).toMatchObject({ recorded: 12300, confirmed: 0 });
  });
});

/* ------------------------------------------------------------------ */

describe('PR-4 · same period last year', () => {
  it('this month to today against the same dates a year ago, closed days only', () => {
    const b: Book = {
      days: [...book.days, day('2025-08-05', 'closed', 0, 70000), day('2025-08-20', 'closed', 0, 1)],
      entries: [...book.entries, e('2025-08-05', 'cash_sales', 70000, 'cash'), e('2025-08-20', 'cash_sales', 1, 'cash')],
    };
    // 1-12 Aug 2026: closed 10th (1,800) and 12th (0); the open 11th is out.
    // 1-12 Aug 2025: the 5th only (700); the 20th is past the 12th.
    expect(samePeriodLastYear(b, '2026-08-12')).toEqual({
      thisYear: { from: '2026-08-01', to: '2026-08-12', netSales: 180000, closedDays: 2 },
      lastYear: { from: '2025-08-01', to: '2025-08-12', netSales: 70000, closedDays: 1 },
    });
  });

  it('29 February becomes 28 February a year back', () => {
    expect(sameDateLastYear('2028-02-29')).toBe('2027-02-28');
    expect(sameDateLastYear('2026-03-01')).toBe('2025-03-01');
    expect(sameDateLastYear('2026-02-14')).toBe('2025-02-14');
  });
});

describe('PR-4 · festival weeks', () => {
  it('the table holds only the cited years', () => {
    expect([...new Set(FESTIVALS.map((f) => f.date.slice(0, 4)))]).toEqual(['2025', '2026']);
    expect(FESTIVALS.find((f) => f.key === 'diwali' && f.date.startsWith('2026'))?.date).toBe('2026-11-08');
  });

  it("each past festival's week against the week before, newest first; a week with no closed day is not shown", () => {
    const b: Book = {
      days: [day('2026-02-20', 'closed', 0, 0), day('2026-03-02', 'closed', 0, 0), day('2026-03-21', 'closed', 0, 0)],
      entries: [
        e('2026-02-20', 'cash_sales', 40000, 'cash'),
        e('2026-03-02', 'cash_sales', 100000, 'cash'),
        e('2026-03-21', 'cash_sales', 30000, 'cash'),
      ],
    };
    // Holi 4 Mar: week 26 Feb - 4 Mar holds the 2nd (1,000); week before 19-25 Feb holds the 20th (400).
    // Id-ul-Fitr 21 Mar: week 15-21 Mar holds the 21st (300); 8-14 Mar holds nothing.
    // Id-ul-Zuha 27 May 2026 is after today; every 2025 week is empty.
    expect(festivalWeeks(b, '2026-03-25')).toEqual([
      {
        key: 'id_ul_fitr',
        date: '2026-03-21',
        week: { from: '2026-03-15', to: '2026-03-21', netSales: 30000, closedDays: 1 },
        weekBefore: { from: '2026-03-08', to: '2026-03-14', netSales: 0, closedDays: 0 },
      },
      {
        key: 'holi',
        date: '2026-03-04',
        week: { from: '2026-02-26', to: '2026-03-04', netSales: 100000, closedDays: 1 },
        weekBefore: { from: '2026-02-19', to: '2026-02-25', netSales: 40000, closedDays: 1 },
      },
    ]);
  });
});

describe('PR-4 · days each named customer takes to pay', () => {
  it('median days over lines paid off in full, slowest payer first', () => {
    const b: Book = {
      days: [],
      entries: [
        // c1: 1 Aug and 5 Aug, both cleared on 11 Aug -> 10 and 6 days, median 8.
        e('2026-08-01', 'udhar_sales', 100, 'udhar', 'c1'),
        e('2026-08-05', 'udhar_sales', 100, 'udhar', 'c1'),
        e('2026-08-11', 'udhar_collection', 200, 'cash', 'c1'),
        // c2: 1 Aug cleared 3 Aug -> 2 days.
        e('2026-08-01', 'udhar_sales', 100, 'udhar', 'c2'),
        e('2026-08-03', 'udhar_collection', 100, 'cash', 'c2'),
        // c3: nothing paid off in full - not listed.
        e('2026-08-01', 'udhar_sales', 100, 'udhar', 'c3'),
        e('2026-08-03', 'udhar_collection', 50, 'cash', 'c3'),
      ],
    };
    expect(daysToPay(b)).toEqual([
      { partyId: 'c1', settledCount: 2, medianDays: 8, slowestDays: 10 },
      { partyId: 'c2', settledCount: 1, medianDays: 2, slowestDays: 2 },
    ]);
  });
});

describe('PR-4 · returns and adjustments trend', () => {
  it('week by week, oldest first, ending today', () => {
    const b: Book = {
      days: [],
      entries: [
        e('2026-08-03', 'sales_return', 5000, 'other'),
        e('2026-08-10', 'sales_return', 3000, 'other'),
        e('2026-08-14', 'sales_return', 2000, 'other'),
        e('2026-07-31', 'sales_return', 9900, 'other'), // before the first week
        e('2026-08-10', 'cash_sales', 7700, 'cash'), // not a return
      ],
      adjustments: [{ id: 'x', dayId: '2026-08-09', type: 'rounding_given', amount: 500, createdAt: 'x' }],
    };
    expect(returnsTrend(b, '2026-08-14', 2)).toEqual([
      { from: '2026-08-01', to: '2026-08-07', returns: 5000, returnCount: 1, adjustments: 0, adjustmentCount: 0 },
      { from: '2026-08-08', to: '2026-08-14', returns: 5000, returnCount: 2, adjustments: 500, adjustmentCount: 1 },
    ]);
    // No adjustments recorded at all is the same as none.
    expect(returnsTrend({ days: [], entries: [] }, '2026-08-14', 1)[0]!.adjustmentCount).toBe(0);
  });
});
