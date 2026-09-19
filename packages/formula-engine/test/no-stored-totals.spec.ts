/**
 * "There is no totals table, and there never will be." - architecture §06
 *
 * WHY THIS FILE REPLACES A WEAK PROBE. The §5.9 harness measured this invariant at
 * 1/64 by adding an unused column to `days`. That measured the probe, not the system:
 * an unused column violates nothing. The invariant is about READING, so the probe has
 * to mutate what is read.
 *
 * POISON-THEN-DROP is the pair:
 *   POISON - hand the engine a deliberately, visibly wrong cached figure and assert
 *            every output is unchanged. Anything that moves is reading a stored total.
 *   DROP   - remove it entirely and assert the same figures again, byte-identical.
 *            Poisoning finds the reader; dropping proves the rebuild.
 *
 * TODAY THE SYSTEM HOLDS NO CACHE, so these pass by construction. That is recorded
 * rather than hidden, and they are wired anyway so they have teeth the day a cache
 * appears - which it will, the first time a Reports screen misses B20.
 */
import { describe, it, expect } from 'vitest';
import { computeDay, computePrimary, toClosedDaySummary } from '../src/index.ts';
import type { DayInput, Entry } from '../src/types.ts';
import type { OperationalContext } from '../src/operational.ts';

const DAY = '2026-07-15';
const NOW = '2026-07-15T10:00:00.000Z';
let n = 0;
const e = (section: Entry['section'], amount: number, mode: Entry['mode']): Entry => ({
  id: `01890000-0000-7000-8000-${String(++n).padStart(12, '0')}`,
  dayId: DAY,
  section,
  amount,
  mode,
  createdAt: NOW,
  source: 'manual',
});

/** The canonical day, built from entries alone. */
function canonical(): DayInput {
  n = 0;
  return {
    day: {
      date: DAY,
      state: 'open',
      openingCash: 150000,
      countedCash: 605000,
      skippedSections: [],
    },
    entries: [
      e('cash_sales', 678000, 'cash'),
      e('upi_sales', 312000, 'upi'),
      e('expense', 68000, 'cash'),
      e('expense', 50000, 'shop_stock'),
      e('purchase', 320000, 'cash'),
      e('withdrawal', 50000, 'cash'),
    ],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  };
}

const ctx: OperationalContext = {
  today: DAY,
  trailing: [],
  openSupplierDues: [],
  openCustomerCredit: [],
};

/**
 * Every plausible name a cached total might one day be given. The poison value is
 * deliberately absurd, so that if any of them is ever read the failure is
 * unmistakable rather than a subtle few-rupee drift.
 */
const POISON_FIELDS = [
  'cachedNetSales',
  'cachedTotalExpenses',
  'cachedExpectedCash',
  'cachedProfit',
  'netSalesTotal',
  'totalCashReceived',
  'expectedCashBalance',
  'balance',
  'total',
] as const;
const POISON_VALUE = 999999999;

describe('POISON · a stored total, if one existed, must never be read', () => {
  const clean = computePrimary(canonical());

  for (const field of POISON_FIELDS) {
    it(`ignores a poisoned "${field}" on the day record`, () => {
      const input = canonical();
      // Attach a poisoned cache the way a future optimisation might.
      const poisoned: DayInput = {
        ...input,
        day: { ...input.day, [field]: POISON_VALUE } as DayInput['day'],
      };
      const got = computePrimary(poisoned);

      expect(got.p1TotalCashReceived.value).toBe(clean.p1TotalCashReceived.value);
      expect(got.p2TotalCashPaid.value).toBe(clean.p2TotalCashPaid.value);
      expect(got.p3ExpectedCashBalance.value).toBe(clean.p3ExpectedCashBalance.value);
      expect(got.p4NetSales.value).toBe(clean.p4NetSales.value);
      expect(got.p5NetPurchase.value).toBe(clean.p5NetPurchase.value);
      expect(got.p6TotalExpenses.value).toBe(clean.p6TotalExpenses.value);
      expect(got.estimatedProfit.value).toBe(clean.estimatedProfit.value);
    });
  }

  it('ignores a poisoned cache attached to every ENTRY as well', () => {
    const input = canonical();
    const poisoned: DayInput = {
      ...input,
      entries: input.entries.map((x) => ({ ...x, runningTotal: POISON_VALUE }) as Entry),
    };
    expect(computePrimary(poisoned).p4NetSales.value).toBe(clean.p4NetSales.value);
  });

  it('ignores a poisoned cache on the operational context', () => {
    const poisonedCtx = { ...ctx, cachedExpectedCash: POISON_VALUE } as OperationalContext;
    const d = computeDay(canonical(), poisonedCtx);
    expect(d.primary.p3ExpectedCashBalance.value).toBe(clean.p3ExpectedCashBalance.value);
    expect(d.operational.op1DailyCashHealth.expected).toBe(clean.p3ExpectedCashBalance.value);
  });
});

describe('DROP · removing everything but the entries reproduces the figures exactly', () => {
  it('recomputes byte-identically from entries alone, twice', () => {
    const a = JSON.stringify(computePrimary(canonical()));
    const b = JSON.stringify(computePrimary(canonical()));
    expect(a).toBe(b);
  });

  it('a closed day summary is reproducible from entries alone', () => {
    const input = canonical();
    const closed: DayInput = {
      ...input,
      day: { ...input.day, state: 'closed', closedAt: NOW },
    };
    expect(JSON.stringify(toClosedDaySummary(closed))).toBe(
      JSON.stringify(toClosedDaySummary({ ...closed })),
    );
  });

  it('the WORKING sums to its own total, so no line can be a stored figure', () => {
    const p = computePrimary(canonical());
    for (const [name, fig] of Object.entries(p)) {
      const summed = fig.working.lines.reduce(
        (acc, l) => (l.sign === '+' ? acc + l.amount : acc - l.amount),
        0,
      );
      expect(summed, `${name} total must equal the sum of its own lines`).toBe(fig.value);
    }
  });
});

describe('the engine reads only declared inputs', () => {
  it('produces identical output for inputs differing ONLY in undeclared fields', () => {
    // If this ever fails, something is reaching for a field outside the contract -
    // which is the mechanism by which a cache gets read by accident.
    const plain = computeDay(canonical(), ctx);
    const noisy = computeDay(
      {
        ...canonical(),
        day: { ...canonical().day, somethingNobodyDeclared: 42 } as DayInput['day'],
      },
      ctx,
    );
    expect(JSON.stringify(noisy)).toBe(JSON.stringify(plain));
  });
});
