/**
 * Authors `packages/formula-engine/vectors.json`.
 *
 * THE EXPECTED VALUES BELOW ARE HAND-WRITTEN, NEVER COMPUTED FROM THE ENGINE.
 * If the engine produced them, the vectors would prove only that the engine agrees
 * with itself. Every `expect` block is arithmetic done by a person against the
 * specification, and the canonical case is anchored on figures published in
 * SWAFTO-Retail-Desk-Day-Close.pdf p.5 and p.7.
 *
 * "the vectors become the artefact a new developer reads to understand the product's
 * actual rules" - architecture §02.
 *
 * Run: node --experimental-strip-types tools/author-vectors.ts
 */

import { writeFileSync } from 'node:fs';

/** Rupees to integer paise, for legibility in this authoring file only. */
const R = (rupees: number): number => Math.round(rupees * 100);

type Mode = 'cash' | 'upi' | 'other' | 'udhar' | 'shop_stock';
type Section =
  | 'cash_sales'
  | 'upi_sales'
  | 'udhar_sales'
  | 'expense'
  | 'purchase'
  | 'udhar_collection'
  | 'party_payment'
  | 'withdrawal';

interface VEntry {
  id: string;
  dayId: string;
  section: Section;
  amount: number;
  mode: Mode;
  partyId?: string;
  dueDate?: string;
  correctsDayId?: string;
  createdAt: string;
  source: 'manual';
}

let seq = 0;
const DAY = '2026-07-15';
const T = '2026-07-15T10:00:00.000Z';

function e(section: Section, amount: number, mode: Mode, extra: Partial<VEntry> = {}): VEntry {
  seq += 1;
  return {
    id: `01890000-0000-7000-8000-${String(seq).padStart(12, '0')}`,
    dayId: DAY,
    section,
    amount,
    mode,
    createdAt: T,
    source: 'manual',
    ...extra,
  };
}

const ALL_SECTIONS: Section[] = [
  'cash_sales',
  'upi_sales',
  'udhar_sales',
  'expense',
  'purchase',
  'udhar_collection',
  'party_payment',
  'withdrawal',
];

interface Vector {
  name: string;
  proves: string;
  source?: string;
  input: {
    day: {
      date: string;
      state: string;
      openingCash: number | null;
      countedCash: number | null;
      differenceReason?: string;
      skippedSections: Section[];
    };
    entries: VEntry[];
    priorCreditOutstanding: number;
    priorSupplierOutstanding: number;
  };
  context: {
    today: string;
    trailing: {
      date: string;
      netSales: number;
      netPurchase: number;
      totalExpenses: number;
      profit: number;
      countedCash: number;
      expectedCash: number;
    }[];
    openSupplierDues: { partyId: string; amount: number; purchasedOn: string; dueDate?: string }[];
    openCustomerCredit: { partyId: string; amount: number; since: string }[];
    horizonDays?: number;
  };
  expect: Record<string, unknown>;
}

const day = (over: Partial<Vector['input']['day']> = {}) => ({
  date: DAY,
  state: 'open',
  openingCash: R(1500) as number | null,
  countedCash: null as number | null,
  skippedSections: [] as Section[],
  ...over,
});

const ctx = (over: Partial<Vector['context']> = {}) => ({
  today: DAY,
  trailing: [],
  openSupplierDues: [],
  openCustomerCredit: [],
  ...over,
});

/** A synthetic closed day for BI windows. */
const closedDay = (n: number, netSales: number, counted: number, expected: number) => ({
  date: `2026-06-${String(n).padStart(2, '0')}`,
  netSales,
  netPurchase: R(1000),
  totalExpenses: R(500),
  profit: netSales - R(1000) - R(500),
  countedCash: counted,
  expectedCash: expected,
});

const closedRun = (count: number) =>
  Array.from({ length: count }, (_, i) => closedDay(i + 1, R(10000), R(5000), R(5000)));

const vectors: Vector[] = [];

/* =================================================================== *
 * 1 · THE CANONICAL 15 JULY DAY - the anchor
 * =================================================================== */

vectors.push({
  name: 'canonical-15-july',
  proves:
    'Every figure on the designed screens. This is the anchor: the expected values are ' +
    'taken from the published design, not from the engine.',
  source: 'SWAFTO-Retail-Desk-Day-Close.pdf p.5 (Today) and p.7 (Cash check working)',
  input: {
    day: day({ countedCash: R(6050) }),
    entries: [
      e('cash_sales', R(6780), 'cash'),
      e('upi_sales', R(3120), 'upi'),
      e('udhar_sales', R(1550), 'udhar', { partyId: 'c1' }),
      e('expense', R(680), 'cash'),
      e('expense', R(500), 'shop_stock'), // the non-cash half of the 1,180
      e('purchase', R(3200), 'cash'),
      e('udhar_collection', R(2400), 'cash', { partyId: 'c1' }),
      e('withdrawal', R(500), 'cash'),
    ],
    // Chosen so P7/P8 land on the published 18,240 and 27,600.
    priorCreditOutstanding: R(19090),
    priorSupplierOutstanding: R(27600),
  },
  context: ctx({
    openSupplierDues: [
      { partyId: 'agarwal', amount: R(12000), purchasedOn: '2026-07-01', dueDate: '2026-07-16' },
    ],
  }),
  expect: {
    p1: R(9180), // 6,780 + 2,400
    p2: R(4380), // 3,200 + 680 + 500
    p3: R(6300), // 1,500 + 9,180 - 4,380
    p4: R(11450), // 6,780 + 3,120 + 1,550
    p5: R(3200),
    p6: R(1180), // 680 cash + 500 shop stock - BOTH count (D2)
    p7: R(18240), // 19,090 + 1,550 - 2,400
    p8: R(27600),
    profit: R(7070), // 11,450 - 3,200 - 1,180. Withdrawal ABSENT (D3).
    op1Difference: R(-250), // 6,050 - 6,300
    op1Status: 'short',
    op1ReasonRequired: true,
    op6: [
      {
        partyId: 'agarwal',
        dueDate: '2026-07-16',
        amountDue: R(12000),
        projectedCash: R(6300),
        shortfall: R(5700),
      },
    ],
    nextOpeningCash: null, // the day is still open, not closed
  },
});

/* =================================================================== *
 * 2 · Degenerate days
 * =================================================================== */

vectors.push({
  name: 'zero-day',
  proves: 'A day with no entries produces zeros, not nulls, and no division blows up.',
  input: {
    day: day({ countedCash: R(1500) }),
    entries: [],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: {
    p1: 0,
    p2: 0,
    p3: R(1500),
    p4: 0,
    p5: 0,
    p6: 0,
    p7: 0,
    p8: 0,
    profit: 0,
    op1Difference: 0,
    op1Status: 'balanced',
    op1ReasonRequired: false,
    // 0 expenses over 0 sales is UNDEFINED, not zero and not Infinity.
    op2BasisPoints: null,
    op3BasisPoints: null,
  },
});

vectors.push({
  name: 'only-udhar',
  proves:
    'A pure-credit day moves no cash at all. P3 equals opening, P7 rises, and profit ' +
    'still counts the sale because a sale on credit is a sale.',
  input: {
    day: day(),
    entries: [e('udhar_sales', R(2000), 'udhar', { partyId: 'c1' })],
    priorCreditOutstanding: R(500),
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: {
    p1: 0,
    p2: 0,
    p3: R(1500),
    p4: R(2000),
    p6: 0,
    p7: R(2500),
    profit: R(2000),
    op1Status: 'not_counted',
    op1Difference: null,
  },
});

vectors.push({
  name: 'only-expenses',
  proves: 'An expenses-only day reduces cash and makes a loss.',
  input: {
    day: day(),
    entries: [e('expense', R(300), 'cash'), e('expense', R(200), 'upi')],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: {
    p1: 0,
    p2: R(300), // only the cash one
    p3: R(1200),
    p4: 0,
    p6: R(500), // both
    profit: R(-500),
  },
});

/* =================================================================== *
 * 3 · The three reconciliation outcomes
 * =================================================================== */

for (const [name, counted, diff, status] of [
  ['cash-shortfall', R(5800), R(-250), 'short'],
  ['cash-surplus', R(6300), R(250), 'extra'],
  ['exact-balance', R(6050), 0, 'balanced'],
] as const) {
  vectors.push({
    name,
    proves: `OP1 ${status}: counted - expected, signed. A shortfall is ordinary shop life.`,
    input: {
      day: day({ countedCash: counted }),
      entries: [e('cash_sales', R(5000), 'cash'), e('expense', R(450), 'cash')],
      priorCreditOutstanding: 0,
      priorSupplierOutstanding: 0,
    },
    context: ctx(),
    expect: {
      p3: R(6050), // 1500 + 5000 - 450
      op1Difference: diff,
      op1Status: status,
      op1ReasonRequired: diff !== 0,
    },
  });
}

/* =================================================================== *
 * 4 · D8 - skipped is NOT untouched
 * =================================================================== */

vectors.push({
  name: 'd8-skip-vs-untouched-all-skipped',
  proves:
    'Eight explicitly skipped sections produce the SAME totals as an empty day but a ' +
    'DIFFERENT day state: ready, with the cash check unlocked.',
  input: {
    day: day({ skippedSections: [...ALL_SECTIONS] }),
    entries: [],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: {
    p3: R(1500),
    p4: 0,
    cashCheckUnlocked: true,
    dayState: 'ready',
    progressDone: 9, // opening cash (1) + 8 skipped sections
    progressTotal: 10,
  },
});

vectors.push({
  name: 'd8-skip-vs-untouched-all-untouched',
  proves:
    'The identical zero totals with NOTHING skipped leave the cash check LOCKED and the ' +
    'day open. Same number, different meaning - the whole of D8.',
  input: {
    day: day(),
    entries: [],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: {
    p3: R(1500),
    p4: 0,
    cashCheckUnlocked: false,
    dayState: 'open',
    progressDone: 1, // opening cash only - the endowed step
    progressTotal: 10,
  },
});

vectors.push({
  name: 'd8-one-untouched-section-locks-the-cash-check',
  proves: 'Seven of eight is not enough. E6: one untouched section re-locks the check.',
  input: {
    day: day({ skippedSections: ALL_SECTIONS.filter((s) => s !== 'expense') }),
    entries: [],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: { cashCheckUnlocked: false, dayState: 'open', progressDone: 8 },
});

vectors.push({
  name: 'e3-entry-unskips-a-section',
  proves:
    'E3: an entry into a section marked "Nothing to enter" un-skips it. The entry wins ' +
    'over a stale skip row.',
  input: {
    day: day({ skippedSections: ['expense'] }),
    entries: [e('expense', R(100), 'cash')],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: { expenseSectionState: 'entered', p6: R(100) },
});

/* =================================================================== *
 * 5 · D2 - only Cash mode touches the cash equation
 * =================================================================== */

vectors.push({
  name: 'd2-cash-equation-five-modes',
  proves:
    'THE most likely thing to be built wrong. All five expense modes count toward P6; ' +
    'ONLY the cash one reduces the cash balance. If shop stock reached P2 every expected ' +
    'balance would be wrong by that amount.',
  source: 'Decisions D2; Day-Close gap 02',
  input: {
    day: day(),
    entries: [
      e('expense', R(100), 'cash'),
      e('expense', R(200), 'upi'),
      e('expense', R(300), 'other'),
      e('expense', R(400), 'udhar'),
      e('expense', R(500), 'shop_stock'),
    ],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: {
    p6: R(1500), // all five
    p2: R(100), // cash only
    p3: R(1400), // 1500 - 100
    profit: R(-1500), // all five hit profit
  },
});

vectors.push({
  name: 'd2-purchase-modes-only-cash-moves-cash',
  proves: 'Same rule on purchases. A udhar purchase creates a supplier due, not an outflow.',
  input: {
    day: day(),
    entries: [
      e('purchase', R(1000), 'cash'),
      e('purchase', R(2000), 'udhar', { partyId: 's1' }),
      e('purchase', R(300), 'upi'),
    ],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: {
    p5: R(3300), // every mode
    p2: R(1000), // cash only
    p3: R(500), // 1500 - 1000
    p8: R(2000), // only the udhar purchase becomes a due
  },
});

/* =================================================================== *
 * 6 · D3 - withdrawal is not an expense
 * =================================================================== */

vectors.push({
  name: 'd3-withdrawal-excluded-from-profit',
  proves:
    'Withdrawal reduces cash, NEVER appears in expenses, and NEVER touches profit. ' +
    'The sheet formula is correct precisely because withdrawal is absent from it. ' +
    'If this vector fails, someone "fixed" D3 back.',
  source: 'Decisions D3; Day-Close gap 03',
  input: {
    day: day(),
    entries: [
      e('cash_sales', R(5000), 'cash'),
      e('expense', R(1000), 'cash'),
      e('withdrawal', R(2000), 'cash'),
    ],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: {
    p2: R(3000), // 1,000 expense + 2,000 withdrawal - both leave the box
    p3: R(3500), // 1500 + 5000 - 3000
    p6: R(1000), // withdrawal is NOT an expense
    profit: R(4000), // 5000 - 0 - 1000. NOT 2,000.
  },
});

vectors.push({
  name: 'd3-withdrawal-upi-does-not-move-cash',
  proves: 'A UPI withdrawal is still not an expense, and does not reduce cash in the box.',
  input: {
    day: day(),
    entries: [e('cash_sales', R(1000), 'cash'), e('withdrawal', R(700), 'upi')],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: { p2: 0, p3: R(2500), p6: 0, profit: R(1000) },
});

/* =================================================================== *
 * 7 · Collections and payments across modes
 * =================================================================== */

vectors.push({
  name: 'collection-non-cash-reduces-debt-not-cash',
  proves:
    'A customer who settles by UPI has settled: P7 falls. But no cash entered the box, ' +
    'so P1 and P3 are untouched. This is why P1 uses the cash slice and P7 the total.',
  input: {
    day: day(),
    entries: [
      e('udhar_collection', R(1000), 'upi', { partyId: 'c1' }),
      e('udhar_collection', R(500), 'cash', { partyId: 'c2' }),
    ],
    priorCreditOutstanding: R(5000),
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: {
    p1: R(500), // cash only
    p3: R(2000), // 1500 + 500
    p7: R(3500), // 5000 - 1500, both modes
  },
});

vectors.push({
  name: 'party-payment-non-cash-reduces-supplier-debt-only',
  proves: 'Mirror image on the supplier side.',
  input: {
    day: day(),
    entries: [
      e('party_payment', R(800), 'upi', { partyId: 's1' }),
      e('party_payment', R(200), 'cash', { partyId: 's1' }),
    ],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: R(4000),
  },
  context: ctx(),
  expect: {
    p2: R(200), // cash only
    p3: R(1300),
    p8: R(3000), // 4000 - 1000, both modes
  },
});

/* =================================================================== *
 * 8 · D6 - a missed day is marked, never guessed
 * =================================================================== */

vectors.push({
  name: 'd6-gap-never-interpolates',
  proves:
    'A not_closed day yields NO next opening cash. The app never invents a number to ' +
    'bridge a gap - it asks for a fresh count.',
  source: 'Decisions D6',
  input: {
    day: day({ state: 'not_closed', countedCash: null }),
    entries: [e('cash_sales', R(400), 'cash')],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: { dayState: 'not_closed', nextOpeningCash: null, op1Status: 'not_counted' },
});

vectors.push({
  name: 'carry-forward-uses-counted-not-expected',
  proves:
    'THE AUDIT CHAIN. Tomorrow opens on what a human counted (6,050), never on what the ' +
    'system expected (6,300). Every later balance inherits a physically verified number.',
  source: 'architecture DFD 4.7; Decisions D6',
  input: {
    day: day({ state: 'closed', countedCash: R(6050), differenceReason: 'gave_change' }),
    entries: [
      e('cash_sales', R(6780), 'cash'),
      e('udhar_collection', R(2400), 'cash', { partyId: 'c1' }),
      e('purchase', R(3200), 'cash'),
      e('expense', R(680), 'cash'),
      e('withdrawal', R(500), 'cash'),
    ],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: {
    p3: R(6300), // expected
    op1Difference: R(-250),
    nextOpeningCash: R(6050), // COUNTED, not 6,300
    dayState: 'closed',
  },
});

/* =================================================================== *
 * 9 · D7 - corrections
 * =================================================================== */

vectors.push({
  name: 'd7-correction-changes-today-only',
  proves:
    'A correction posted today carrying correctsDayId changes TODAY figures and is an ' +
    'ordinary entry in every other respect. The referenced day is untouched - proven ' +
    'at the database level in G4.',
  source: 'Decisions D7',
  input: {
    day: day(),
    entries: [
      e('cash_sales', R(1000), 'cash'),
      e('cash_sales', R(180), 'cash', { correctsDayId: '2026-07-12' }),
    ],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: { p1: R(1180), p3: R(2680), p4: R(1180) },
});

/* =================================================================== *
 * 10 · Aging - the two vocabularies
 * =================================================================== */

vectors.push({
  name: 'udhar-crosses-30-days',
  proves:
    'A customer at 32 days gets "days_since", NEVER "overdue" - he has no agreed term ' +
    'to be late against. Two vocabularies, deliberately (D4).',
  input: {
    day: day(),
    entries: [],
    priorCreditOutstanding: R(7900),
    priorSupplierOutstanding: 0,
  },
  context: ctx({
    openCustomerCredit: [
      { partyId: 'c-old', amount: R(5000), since: '2026-06-13' }, // 32 days
      { partyId: 'c-new', amount: R(2900), since: '2026-07-01' }, // 14 days
    ],
  }),
  expect: {
    agingVocabularies: { 'c-old': 'days_since', 'c-new': 'current' },
  },
});

vectors.push({
  name: 'supplier-overdue-only-with-a-due-date',
  proves:
    'A supplier WITH a passed due date is "overdue". A supplier with no due date is aged ' +
    'in days even at 66 days, because nothing was agreed.',
  input: {
    day: day(),
    entries: [],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: R(10000),
  },
  context: ctx({
    openSupplierDues: [
      { partyId: 's-dated', amount: R(4000), purchasedOn: '2026-07-01', dueDate: '2026-07-10' },
      { partyId: 's-undated', amount: R(6000), purchasedOn: '2026-05-10' }, // 66 days
    ],
  }),
  expect: {
    agingVocabularies: { 's-dated': 'overdue', 's-undated': 'days_since' },
  },
});

/* =================================================================== *
 * 11 · OP6 - the most valuable output
 * =================================================================== */

vectors.push({
  name: 'op6-names-party-amount-date-and-shortfall',
  proves:
    'OP6 must name ALL FOUR or it is not actionable. Also: dues are consumed in date ' +
    'order against a running balance, so the second and third are flagged rather than ' +
    'all three cleared.',
  input: {
    day: day(),
    entries: [e('cash_sales', R(4500), 'cash')],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx({
    openSupplierDues: [
      { partyId: 's-a', amount: R(4000), purchasedOn: '2026-07-01', dueDate: '2026-07-16' },
      { partyId: 's-b', amount: R(3000), purchasedOn: '2026-07-02', dueDate: '2026-07-17' },
      { partyId: 's-c', amount: R(1000), purchasedOn: '2026-07-03', dueDate: '2026-07-18' },
    ],
  }),
  expect: {
    p3: R(6000), // 1500 + 4500
    // s-a takes 4,000 leaving 2,000. s-b needs 3,000 -> short 1,000, balance now 0.
    // s-c needs 1,000 against 0 -> short 1,000.
    op6: [
      {
        partyId: 's-b',
        dueDate: '2026-07-17',
        amountDue: R(3000),
        projectedCash: R(2000),
        shortfall: R(1000),
      },
      {
        partyId: 's-c',
        dueDate: '2026-07-18',
        amountDue: R(1000),
        projectedCash: 0,
        shortfall: R(1000),
      },
    ],
  },
});

vectors.push({
  name: 'op6-silent-when-cash-covers-the-dues',
  proves: 'No warning when the projected balance covers everything in the horizon.',
  input: {
    day: day(),
    entries: [e('cash_sales', R(20000), 'cash')],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx({
    openSupplierDues: [
      { partyId: 's-a', amount: R(4000), purchasedOn: '2026-07-01', dueDate: '2026-07-16' },
    ],
  }),
  expect: { op6: [] },
});

vectors.push({
  name: 'op6-ignores-dues-beyond-the-horizon',
  proves: 'A due 40 days out is not a warning today. Default horizon is 7 days.',
  input: {
    day: day(),
    entries: [],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx({
    openSupplierDues: [
      { partyId: 's-far', amount: R(99000), purchasedOn: '2026-07-01', dueDate: '2026-08-24' },
    ],
  }),
  expect: { op6: [], op4Count: 0 },
});

/* =================================================================== *
 * 12 · Rounding edges
 * =================================================================== */

vectors.push({
  name: 'rounding-amounts-ending-in-1-paise',
  proves: 'Integer paise are exact. 1-paise tails do not drift.',
  input: {
    day: day({ openingCash: 1, countedCash: 3 }),
    entries: [e('cash_sales', 1, 'cash'), e('cash_sales', 1, 'cash')],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: { p1: 2, p3: 3, op1Difference: 0, op1Status: 'balanced' },
});

vectors.push({
  name: 'rounding-amounts-ending-in-9-paise',
  proves: 'Three amounts of 9 paise sum to exactly 27, not 26.999999999999996.',
  input: {
    day: day({ openingCash: 0 }),
    entries: [e('cash_sales', 9, 'cash'), e('cash_sales', 9, 'cash'), e('cash_sales', 9, 'cash')],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: { p1: 27, p3: 27, p4: 27 },
});

vectors.push({
  name: 'op2-division-rounding-one-third',
  proves:
    'A recurring decimal is rounded HALF-AWAY-FROM-ZERO to basis points, and the exact ' +
    'numerator and denominator survive so the working can be re-derived.',
  input: {
    day: day(),
    entries: [e('cash_sales', R(300), 'cash'), e('expense', R(100), 'cash')],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  // 10000 / 30000 = 0.3333... -> 3333.33 bp -> 3333
  expect: { op2BasisPoints: 3333, op2Numerator: R(100), op2Denominator: R(300) },
});

vectors.push({
  name: 'op2-division-rounding-half-up',
  proves: 'An exact .5 basis point rounds AWAY FROM ZERO, not to even.',
  input: {
    day: day(),
    entries: [e('cash_sales', R(160), 'cash'), e('expense', R(1), 'cash')],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  // 100 / 16000 = 0.00625 -> 62.5 bp -> 63 (half away from zero)
  expect: { op2BasisPoints: 63 },
});

vectors.push({
  name: 'op3-collection-efficiency-division',
  proves: 'collected / (opening udhar + udhar sales).',
  input: {
    day: day(),
    entries: [
      e('udhar_sales', R(1000), 'udhar', { partyId: 'c1' }),
      e('udhar_collection', R(750), 'cash', { partyId: 'c1' }),
    ],
    priorCreditOutstanding: R(2000),
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  // 750 / (2000 + 1000) = 0.25 -> 2500 bp
  expect: { op3BasisPoints: 2500 },
});

/* =================================================================== *
 * 13 · OP5 - median, not mean. This vector IS the ruling.
 * =================================================================== */

vectors.push({
  name: 'op5-uses-median-not-mean',
  proves:
    'THE OP5 CONFLICT RESOLVED. Baseline days are 1,000 / 1,000 / 1,000 / 1,000 / 20,000. ' +
    'Median = 1,000; mean = 4,800. Today is 1,100. Against the median the day is UP, ' +
    'which is true. Against the mean it would read DOWN, which would tell a shopkeeper ' +
    'his ordinary day was bad because of one festival last week.',
  input: {
    day: day(),
    entries: [e('cash_sales', R(1100), 'cash')],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx({
    trailing: [
      closedDay(1, R(1000), R(1000), R(1000)),
      closedDay(2, R(1000), R(1000), R(1000)),
      closedDay(3, R(1000), R(1000), R(1000)),
      closedDay(4, R(1000), R(1000), R(1000)),
      closedDay(5, R(20000), R(1000), R(1000)),
    ],
  }),
  expect: {
    op5Baseline: R(1000), // median, NOT the 4,800 mean
    op5Direction: 'up',
    op5TodayNetSales: R(1100),
  },
});

vectors.push({
  name: 'op5-no-baseline-is-not-flat',
  proves:
    'No baseline and no change are different statements. With no trailing days the ' +
    'direction is no_baseline, never flat.',
  input: {
    day: day(),
    entries: [e('cash_sales', R(1000), 'cash')],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: { op5Direction: 'no_baseline', op5Baseline: null },
});

vectors.push({
  name: 'op5-median-even-count',
  proves: 'An even-length window averages the two middle values, rounded explicitly.',
  input: {
    day: day(),
    entries: [e('cash_sales', R(1000), 'cash')],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx({
    trailing: [
      closedDay(1, R(1000), R(1), R(1)),
      closedDay(2, R(2000), R(1), R(1)),
      closedDay(3, R(3000), R(1), R(1)),
      closedDay(4, R(4000), R(1), R(1)),
    ],
  }),
  // middle two are 2,000 and 3,000 -> 2,500
  expect: { op5Baseline: R(2500), op5Direction: 'down' },
});

/* =================================================================== *
 * 14 · BI gates - each opens EXACTLY once, at exactly the right day
 * =================================================================== */

vectors.push({
  name: 'bi-gates-shut-at-13-closed-days',
  proves:
    'At 13 closed days every gate is shut and each reports its requirement AND the ' +
    'progress, so the GateCard can say "after 14 closed days, 13 so far".',
  input: { day: day(), entries: [], priorCreditOutstanding: 0, priorSupplierOutstanding: 0 },
  context: ctx({ trailing: closedRun(13) }),
  expect: {
    bi1Available: false,
    bi1Required: 14,
    bi1SoFar: 13,
    bi2Available: false,
    bi3Available: false,
    bi3Required: 21,
    bi4Available: false,
  },
});

vectors.push({
  name: 'bi-gates-open-at-14-closed-days',
  proves: 'BI1, BI2 and BI4 open at exactly 14. BI3 is still shut - its gate is 21.',
  input: { day: day(), entries: [], priorCreditOutstanding: 0, priorSupplierOutstanding: 0 },
  context: ctx({ trailing: closedRun(14) }),
  expect: {
    bi1Available: true,
    bi2Available: true,
    bi4Available: true,
    bi3Available: false,
    bi3Required: 21,
    bi3SoFar: 14,
  },
});

vectors.push({
  name: 'bi3-shut-at-20-closed-days',
  proves: 'One day before its gate, BI3 is still shut.',
  input: { day: day(), entries: [], priorCreditOutstanding: 0, priorSupplierOutstanding: 0 },
  context: ctx({ trailing: closedRun(20) }),
  expect: { bi3Available: false, bi3SoFar: 20, bi1Available: true },
});

vectors.push({
  name: 'bi3-opens-at-21-closed-days',
  proves: 'BI3 opens at exactly 21, and all four are then available.',
  input: { day: day(), entries: [], priorCreditOutstanding: 0, priorSupplierOutstanding: 0 },
  context: ctx({ trailing: closedRun(21) }),
  expect: { bi1Available: true, bi2Available: true, bi3Available: true, bi4Available: true },
});

vectors.push({
  name: 'bi5-and-bi6-are-never-available',
  proves:
    'BI5 is RESERVED with no UI (D5) and BI6 is BLOCKED-ON-HUMAN. Even with 60 closed ' +
    'days both stay null. Neither may ever render a card.',
  input: { day: day(), entries: [], priorCreditOutstanding: 0, priorSupplierOutstanding: 0 },
  context: ctx({ trailing: closedRun(60) }),
  expect: { bi5: null, bi6: null },
});

vectors.push({
  name: 'bi2-sales-consistency-is-zero-for-a-flat-shop',
  proves: 'Identical sales every day means a coefficient of variation of exactly 0.',
  input: { day: day(), entries: [], priorCreditOutstanding: 0, priorSupplierOutstanding: 0 },
  context: ctx({ trailing: closedRun(14) }),
  expect: { bi2Available: true, bi2BasisPoints: 0 },
});

/* =================================================================== *
 * 15 · Working - the cash check depends on it
 * =================================================================== */

vectors.push({
  name: 'working-renders-every-line-of-the-cash-check',
  proves:
    'P3 renders as the seven lines of the paper sheet formula, in order, and the lines ' +
    'sum to the total. The shopkeeper must see WHICH line is wrong.',
  source: 'Day-Close p.7',
  input: {
    day: day(),
    entries: [
      e('cash_sales', R(6780), 'cash'),
      e('udhar_collection', R(2400), 'cash', { partyId: 'c1' }),
      e('purchase', R(3200), 'cash'),
      e('expense', R(680), 'cash'),
      e('withdrawal', R(500), 'cash'),
    ],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: {
    p3: R(6300),
    p3WorkingKeys: [
      'working.opening_cash',
      'working.cash_sales',
      'working.udhar_collected_cash',
      'working.cash_purchase',
      'working.cash_expenses',
      'working.cash_party_payment',
      'working.withdrawal_cash',
    ],
    p3WorkingSigns: ['+', '+', '+', '-', '-', '-', '-'],
  },
});

/* =================================================================== *
 * 16 · Progress ring
 * =================================================================== */

vectors.push({
  name: 'progress-ring-opens-at-one-of-ten',
  proves:
    'ENDOWED PROGRESS, honestly. Carried opening cash is real work done yesterday, so ' +
    'the ring opens at 1 of 10 - never 0 of 9.',
  source: 'Flow Strategy 02; Strategy 1 §05',
  input: { day: day(), entries: [], priorCreditOutstanding: 0, priorSupplierOutstanding: 0 },
  context: ctx(),
  expect: { progressDone: 1, progressTotal: 10 },
});

vectors.push({
  name: 'progress-ring-first-run-honestly-starts-at-zero',
  proves:
    'The one exception. A brand-new user has nothing carried, so the ring starts at 0. ' +
    'The line not to cross is advancing the ring for something he did not do.',
  input: {
    day: day({ state: 'not_started', openingCash: null }),
    entries: [],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: { progressDone: 0, progressTotal: 10, dayState: 'not_started' },
});

/* =================================================================== *
 * 17 · Large values and exactness
 * =================================================================== */

vectors.push({
  name: 'large-amounts-stay-exact',
  proves:
    'A crore of rupees is 1e9 paise, far inside MAX_SAFE_INTEGER. Integer arithmetic ' +
    'stays exact where floating-point rupees would not.',
  input: {
    day: day({ openingCash: R(10000000) }),
    entries: [e('cash_sales', R(9999999.99), 'cash')],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: { p1: 999999999, p3: 1999999999 },
});

vectors.push({
  name: 'format-paise-uses-indian-grouping-and-latin-numerals',
  proves:
    'The render boundary groups 1,23,456.78 the Indian way, always in Latin numerals, ' +
    'in every language. Hand-rolled rather than Intl, so Hermes and Node agree.',
  input: { day: day(), entries: [], priorCreditOutstanding: 0, priorSupplierOutstanding: 0 },
  context: ctx(),
  expect: {
    formatChecks: {
      '12345678': '₹1,23,456.78',
      '630000': '₹6,300.00',
      '-25000': '-₹250.00',
      '1': '₹0.01',
      '0': '₹0.00',
      '100000000': '₹10,00,000.00',
    },
  },
});

/* =================================================================== *
 * 18 · Day state derivation
 * =================================================================== */

vectors.push({
  name: 'day-state-ready-when-all-sections-done',
  proves: 'The day walks to ready when the eighth section is entered or skipped.',
  input: {
    day: day({ skippedSections: ALL_SECTIONS.filter((s) => s !== 'cash_sales') }),
    entries: [e('cash_sales', R(100), 'cash')],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: { dayState: 'ready', cashCheckUnlocked: true, progressDone: 9 },
});

vectors.push({
  name: 'day-state-closed-is-terminal',
  proves: 'A closed day stays closed regardless of what is derived beneath it.',
  input: {
    day: day({ state: 'closed', countedCash: R(1500) }),
    entries: [],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  },
  context: ctx(),
  expect: { dayState: 'closed', nextOpeningCash: R(1500) },
});

/* =================================================================== *
 * Emit
 * =================================================================== */

const names = vectors.map((v) => v.name);
const dupes = names.filter((n, i) => names.indexOf(n) !== i);
if (dupes.length) throw new Error(`Duplicate vector names: ${dupes.join(', ')}`);

const out = {
  $schema: 'https://swafto.app/schemas/vectors-v1.json',
  generatedBy: 'tools/author-vectors.ts',
  note:
    'GOLDEN TEST VECTORS. Expected values are HAND-WRITTEN against the specification, ' +
    'never computed from the engine. Executed under Node AND Hermes; CI fails if the ' +
    'two runtimes disagree on any vector (ADR-012).',
  count: vectors.length,
  vectors,
};

writeFileSync('packages/formula-engine/vectors.json', JSON.stringify(out, null, 2) + '\n');
console.log(`wrote packages/formula-engine/vectors.json with ${vectors.length} vectors`);
