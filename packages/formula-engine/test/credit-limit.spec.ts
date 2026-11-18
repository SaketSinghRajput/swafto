/**
 * R5 FR-6 - the credit limit's parser, the limit in force, and the observation.
 * Expected values worked by hand.
 */
import { describe, it, expect } from 'vitest';
import { parseCreditLimit, limitInForce, creditLimitObservation, EntryInputError } from '../src/index.ts';

const base = { id: 'cl1', partyId: 'p1', setAt: '2026-10-26T10:00:00.000Z' };

describe('FR-6 · parseCreditLimit', () => {
  it('takes whole paise above zero, and null as "no limit"', () => {
    expect(parseCreditLimit({ ...base, limit: 500000 }).limit).toBe(500000);
    expect(parseCreditLimit({ ...base, limit: null }).limit).toBeNull();
  });

  it('refuses zero, a negative, a fraction of a paisa and a missing field, naming the field', () => {
    const field = (f: () => unknown) => {
      try {
        f();
      } catch (e) {
        return e instanceof EntryInputError ? e.field : (e as Error).message;
      }
      return 'accepted';
    };
    expect(field(() => parseCreditLimit({ ...base, limit: 0 }))).toBe('limit');
    expect(field(() => parseCreditLimit({ ...base, limit: -100 }))).not.toBe('accepted');
    expect(field(() => parseCreditLimit({ ...base, limit: 10.5 }))).not.toBe('accepted');
    expect(field(() => parseCreditLimit({ ...base, id: '', limit: 100 }))).toBe('id');
    expect(field(() => parseCreditLimit({ ...base, partyId: '', limit: 100 }))).toBe('partyId');
    expect(field(() => parseCreditLimit({ ...base, setAt: '', limit: 100 }))).toBe('setAt');
  });
});

describe('FR-6 · limitInForce', () => {
  const rows = [
    { ...base, id: 'a', limit: 100000 },
    { ...base, id: 'b', partyId: 'p2', limit: 900000 },
    { ...base, id: 'c', limit: 200000 },
  ];
  it('is the NEWEST row for that party, append order', () => {
    expect(limitInForce(rows, 'p1')).toBe(200000);
    expect(limitInForce(rows, 'p2')).toBe(900000);
  });
  it('a later clear wins, and a party with no row has none', () => {
    expect(limitInForce([...rows, { ...base, id: 'd', limit: null }], 'p1')).toBeNull();
    expect(limitInForce(rows, 'nobody')).toBeNull();
  });
});

describe('FR-6 · creditLimitObservation', () => {
  it('says so only when the sale takes the udhar strictly ABOVE the limit', () => {
    // 3,000 owed + 2,500 sale = 5,500 against a 5,000 limit.
    expect(creditLimitObservation(300000, 250000, 500000)).toEqual({ would: 550000, limit: 500000 });
    // Exactly at the limit is what a limit allows.
    expect(creditLimitObservation(300000, 200000, 500000)).toBeNull();
    expect(creditLimitObservation(300000, 199999, 500000)).toBeNull();
  });
  it('no limit, no observation', () => {
    expect(creditLimitObservation(9900000, 100, null)).toBeNull();
  });
});
