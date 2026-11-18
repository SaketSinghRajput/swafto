/**
 * Profit after the cash difference (HT-23 follow-up, product owner 2026-10-25).
 * A short drawer is a loss and an over drawer is income, as Indian books carry
 * them (Tally: cash short under Indirect Expenses, excess under Indirect Income).
 * Estimated Profit itself is untouched - the vector corpus pins it.
 */
import { describe, it, expect } from 'vitest';
import {
  profitAfterCashDifference,
  estimatedProfit,
  expectedCashBalance,
  subtract,
  add,
} from '../src/index.ts';
import { closedCanonical, closedAdversarialWithDifference, canonicalInput } from '@swafto/fixtures';

describe('profit after the cash difference', () => {
  it('a day not yet counted has no such figure - null, never a zero', () => {
    const open = canonicalInput();
    expect(profitAfterCashDifference({ ...open, day: { ...open.day, countedCash: null } })).toBeNull();
  });

  it('a balanced day: equal to Estimated Profit', () => {
    const day = closedCanonical();
    expect(profitAfterCashDifference(day)!.value).toBe(estimatedProfit(day).value);
  });

  it('a short drawer takes the shortage off profit, as a cash-short line', () => {
    const day = closedAdversarialWithDifference(25000);
    const figure = profitAfterCashDifference(day)!;
    expect(figure.value).toBe(subtract(estimatedProfit(day).value, 25000));
    expect(figure.working.lines.at(-1)).toEqual({ key: 'working.cash_short', sign: '-', amount: 25000 });
  });

  it('an over drawer adds the excess, as a cash-excess line', () => {
    const base = closedCanonical();
    const day = { ...base, day: { ...base.day, countedCash: add(expectedCashBalance(base).value, 5000) } };
    const figure = profitAfterCashDifference(day)!;
    expect(figure.value).toBe(add(estimatedProfit(day).value, 5000));
    expect(figure.working.lines.at(-1)).toEqual({ key: 'working.cash_excess', sign: '+', amount: 5000 });
  });

  it('Estimated Profit is unchanged by the count (the sheet formula stays the sheet formula)', () => {
    const balanced = closedCanonical();
    const short = { ...balanced, day: { ...balanced.day, countedCash: 0 } };
    expect(estimatedProfit(short).value).toBe(estimatedProfit(balanced).value);
  });
});
