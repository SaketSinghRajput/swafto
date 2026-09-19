/**
 * The money guard, exercised.
 *
 * WHY THIS FILE EXISTS. The §5.9 detection-rate harness disabled the integer check in
 * `assertPaise` and **0 of 59 vectors noticed**. The guard was written, reviewed and
 * never once executed against a bad value, because every vector supplies well-formed
 * integer paise. A guard that has never rejected anything is decoration.
 *
 * The vectors CANNOT cover this: they are JSON data describing valid days, and a float
 * amount is valid JSON. Rejection behaviour needs code, not data - which is exactly
 * the "dimension the bug lived in" that §5.9.2 says to add.
 */
import { describe, it, expect } from 'vitest';
import {
  add,
  assertPaise,
  divideMoney,
  formatPaise,
  meanMoney,
  medianMoney,
  ratio,
  roundHalfAwayFromZero,
  stdevMoney,
  subtract,
  sum,
} from '../src/money.ts';

describe('assertPaise rejects everything that is not an integer number of paise', () => {
  const bad: [unknown, string][] = [
    [12.5, 'a float'],
    [0.1, 'a sub-paisa float'],
    [-0.5, 'a negative float'],
    [Number.NaN, 'NaN'],
    [Number.POSITIVE_INFINITY, 'Infinity'],
    [Number.NEGATIVE_INFINITY, 'minus Infinity'],
    [Number.MAX_SAFE_INTEGER + 1, 'beyond MAX_SAFE_INTEGER'],
    [-(Number.MAX_SAFE_INTEGER + 1), 'below minus MAX_SAFE_INTEGER'],
    ['100', 'a numeric string'],
    [null, 'null'],
    [undefined, 'undefined'],
    [{}, 'an object'],
    [[], 'an array'],
    [true, 'a boolean'],
  ];

  for (const [value, label] of bad) {
    it(`throws on ${label}`, () => {
      expect(() => assertPaise(value)).toThrow(/integer number of paise/);
    });
  }

  it('names the field, so the error says WHICH amount was wrong', () => {
    expect(() => assertPaise(1.5, 'opening_cash')).toThrow(/opening_cash/);
  });

  it('accepts legitimate values including zero and negatives', () => {
    for (const v of [0, 1, -1, 99, 678000, -25000, Number.MAX_SAFE_INTEGER]) {
      expect(() => assertPaise(v)).not.toThrow();
    }
  });
});

describe('the arithmetic helpers propagate the guard', () => {
  it('add rejects a float operand', () => {
    expect(() => add(100, 2.5)).toThrow(/integer number of paise/);
  });
  it('subtract rejects a float operand', () => {
    expect(() => subtract(100, 2.5)).toThrow(/integer number of paise/);
  });
  it('sum rejects a float in the array', () => {
    expect(() => sum([1, 2, 3.5])).toThrow(/integer number of paise/);
  });
  it('ratio rejects a float numerator or denominator', () => {
    expect(() => ratio(1.5, 100)).toThrow();
    expect(() => ratio(100, 1.5)).toThrow();
  });
  it('divideMoney rejects a zero or non-finite divisor', () => {
    expect(() => divideMoney(100, 0, 'floor')).toThrow(/non-zero finite/);
    expect(() => divideMoney(100, Number.NaN, 'floor')).toThrow(/non-zero finite/);
  });
});

describe('rounding is half-away-from-zero, symmetric about zero', () => {
  it('rounds .5 away from zero in BOTH directions', () => {
    // Math.round(-0.5) is -0, i.e. toward +Infinity. That asymmetry would make a
    // negative ratio round differently from its positive twin.
    expect(roundHalfAwayFromZero(0.5)).toBe(1);
    expect(roundHalfAwayFromZero(-0.5)).toBe(-1);
    expect(roundHalfAwayFromZero(1.5)).toBe(2);
    expect(roundHalfAwayFromZero(-1.5)).toBe(-2);
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
  });

  it('differs from Math.round exactly where it should', () => {
    expect(Math.round(-0.5)).toBe(-0);
    expect(roundHalfAwayFromZero(-0.5)).toBe(-1);
  });

  it('divideMoney honours each named rounding mode', () => {
    expect(divideMoney(7, 2, 'floor')).toBe(3);
    expect(divideMoney(7, 2, 'ceil')).toBe(4);
    expect(divideMoney(7, 2, 'half-away-from-zero')).toBe(4);
    expect(divideMoney(-7, 2, 'floor')).toBe(-4);
    expect(divideMoney(-7, 2, 'ceil')).toBe(-3);
    expect(divideMoney(-7, 2, 'half-away-from-zero')).toBe(-4);
  });
});

describe('"no data" and "zero rupees" are different statements', () => {
  it('meanMoney of nothing is null, not 0', () => {
    expect(meanMoney([])).toBeNull();
    expect(meanMoney([0])).toBe(0);
  });
  it('medianMoney of nothing is null, not 0', () => {
    expect(medianMoney([])).toBeNull();
  });
  it('stdevMoney of nothing is null; of one value is 0', () => {
    expect(stdevMoney([])).toBeNull();
    expect(stdevMoney([500])).toBe(0);
  });
  it('a zero denominator gives a null ratio, never Infinity or NaN', () => {
    const r = ratio(100, 0);
    expect(r.basisPoints).toBeNull();
    expect(Number.isFinite(r.basisPoints as unknown as number)).toBe(false);
  });
});

describe('medianMoney', () => {
  it('takes the middle of an odd-length series', () => {
    expect(medianMoney([300, 100, 200])).toBe(200);
  });
  it('averages the two middle values of an even-length series', () => {
    expect(medianMoney([100, 200, 300, 400])).toBe(250);
  });
  it('does not mutate its input', () => {
    const input = [300, 100, 200];
    medianMoney(input);
    expect(input).toEqual([300, 100, 200]);
  });
});

describe('formatPaise is the only render boundary', () => {
  it('groups the Indian way at and beyond 1,00,000 - where the conventions diverge', () => {
    expect(formatPaise(9999900)).toBe('₹99,999.00');
    expect(formatPaise(10000000)).toBe('₹1,00,000.00');
    expect(formatPaise(124560000)).toBe('₹12,45,600.00');
    expect(formatPaise(1000000000)).toBe('₹1,00,00,000.00');
  });

  it('is indistinguishable from Western grouping below 1,00,000 - which IS DC-002', () => {
    // Asserted so the blindness is visible in the suite, not only in a document.
    for (const p of [678000, 1145000, 1824000, 2760000]) {
      const indian = formatPaise(p, { withSymbol: false });
      const western = (p / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      expect(indian, `${p} paise cannot distinguish the two conventions`).toBe(western);
    }
  });

  it('pads paise and keeps the sign outside the symbol', () => {
    expect(formatPaise(1)).toBe('₹0.01');
    expect(formatPaise(10)).toBe('₹0.10');
    expect(formatPaise(-25000)).toBe('-₹250.00');
  });

  it('can omit the symbol and force a plus sign', () => {
    expect(formatPaise(120000, { withSymbol: false })).toBe('1,200.00');
    expect(formatPaise(120000, { withSign: true })).toBe('+₹1,200.00');
    expect(formatPaise(-120000, { withSign: true })).toBe('-₹1,200.00');
  });

  it('rejects a non-integer rather than rendering something plausible', () => {
    expect(() => formatPaise(12.5)).toThrow(/integer number of paise/);
  });
});
