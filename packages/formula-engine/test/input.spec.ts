/**
 * IN1-IN7. Every parser REFUSES rather than repairs, and every refusal names a field
 * a screen can point at. Constraint 1 forbids inference in data entry, and a parser
 * that quietly fixes input is inference wearing a small hat.
 */
import { describe, it, expect } from 'vitest';
import {
  parseSalesEntry, parsePurchaseEntry, parseExpenseEntry, parseCollectionEntry,
  parsePartyPaymentEntry, parseWithdrawalEntry, captureCountedCash, EntryInputError,
} from '../src/input.ts';

const d = (over: Record<string, unknown> = {}) =>
  ({ id: 'e1', dayId: '2026-07-15', amount: 1000, createdAt: '2026-07-15T18:00:00.000Z', ...over }) as any;

describe('every parser refuses, and never repairs', () => {
  const all = [
    ['sales', (x: any) => parseSalesEntry(d({ mode: 'cash', ...x }))],
    ['purchase', (x: any) => parsePurchaseEntry(d({ mode: 'cash', ...x }))],
    ['expense', (x: any) => parseExpenseEntry(d({ mode: 'cash', ...x }))],
    ['collection', (x: any) => parseCollectionEntry(d({ mode: 'cash', partyId: 'p1', ...x }))],
    ['payment', (x: any) => parsePartyPaymentEntry(d({ mode: 'cash', partyId: 'p1', ...x }))],
    ['withdrawal', (x: any) => parseWithdrawalEntry(d({ mode: 'cash', ...x }))],
  ] as const;

  for (const [name, parse] of all) {
    it(`${name}: refuses a float amount rather than rounding it`, () => {
      expect(() => parse({ amount: 10.5 })).toThrow(/integer/i);
    });
    it(`${name}: refuses a numeric STRING rather than coercing it`, () => {
      expect(() => parse({ amount: '1000' })).toThrow(/integer/i);
    });
    it(`${name}: refuses a negative amount - the section carries direction`, () => {
      expect(() => parse({ amount: -1 })).toThrow(/never negative/);
    });
    it(`${name}: refuses a date that does not exist`, () => {
      expect(() => parse({ dayId: '2026-02-30' })).toThrow(/not a valid date/i);
    });
    it(`${name}: produces source 'manual' by default, never undefined`, () => {
      expect(parse({}).source).toBe('manual');
    });
  }
});

describe('IN1 sales - the mode decides the section, and credit names a customer', () => {
  it('maps each mode to its own section', () => {
    expect(parseSalesEntry(d({ mode: 'cash' })).section).toBe('cash_sales');
    expect(parseSalesEntry(d({ mode: 'upi' })).section).toBe('upi_sales');
    expect(parseSalesEntry(d({ mode: 'udhar', partyId: 'p1' })).section).toBe('udhar_sales');
  });
  it('refuses a credit sale with no customer - nobody could be asked to pay it', () => {
    expect(() => parseSalesEntry(d({ mode: 'udhar' }))).toThrow(/must name the customer/);
  });
  it('refuses a party on a cash sale - it was settled at the counter', () => {
    expect(() => parseSalesEntry(d({ mode: 'cash', partyId: 'p1' }))).toThrow(/names no party/);
  });
  it('refuses an unknown mode', () => {
    expect(() => parseSalesEntry(d({ mode: 'barter' }))).toThrow(/cash, UPI or udhar/);
  });
});

describe('IN2 purchase - the only entry that may carry a due date', () => {
  it('accepts a due date on credit', () => {
    expect(parsePurchaseEntry(d({ mode: 'udhar', partyId: 'p1', dueDate: '2026-08-05' })).dueDate)
      .toBe('2026-08-05');
  });
  it('refuses a due date on a purchase already paid for', () => {
    expect(() => parsePurchaseEntry(d({ mode: 'cash', dueDate: '2026-08-05' })))
      .toThrow(/nothing outstanding/);
  });
  it('refuses a due date that does not exist', () => {
    expect(() => parsePurchaseEntry(d({ mode: 'udhar', partyId: 'p1', dueDate: '2026-04-31' })))
      .toThrow(/not a valid date/i);
  });
});

describe('IN3-IN6 - who may be named, and who may not', () => {
  it('an expense names no party', () => {
    expect(() => parseExpenseEntry(d({ mode: 'cash', partyId: 'p1' }))).toThrow(/names no party/);
  });
  it('an expense may be shop stock', () => {
    expect(parseExpenseEntry(d({ mode: 'shop_stock' })).mode).toBe('shop_stock');
  });
  it('a collection must name the customer', () => {
    expect(() => parseCollectionEntry(d({ mode: 'cash' }))).toThrow(/must name the customer/);
  });
  it('a payment must name the supplier', () => {
    expect(() => parsePartyPaymentEntry(d({ mode: 'cash' }))).toThrow(/must name the supplier/);
  });
  it('a withdrawal names nobody and is NOT an expense', () => {
    expect(parseWithdrawalEntry(d({ mode: 'cash' })).section).toBe('withdrawal');
    expect(() => parseWithdrawalEntry(d({ mode: 'cash', partyId: 'p1' }))).toThrow(/not a party/);
  });
  it('a withdrawal cannot be shop stock - stock is not cash leaving the drawer', () => {
    expect(() => parseWithdrawalEntry(d({ mode: 'shop_stock' }))).toThrow(/cash or UPI/);
  });
});

describe('IN7 counted cash', () => {
  it('refuses a float, a string and a negative', () => {
    expect(() => captureCountedCash(10.5)).toThrow(/integer/i);
    expect(() => captureCountedCash('100')).toThrow(/integer/i);
    expect(() => captureCountedCash(-1)).toThrow(/cannot hold a negative/);
  });
  it('accepts zero - an empty box is a real count', () => {
    expect(captureCountedCash(0)).toBe(0);
  });
});

describe('every refusal names a field a screen can point at', () => {
  it('carries the field on the error', () => {
    try { parseSalesEntry(d({ mode: 'udhar' })); expect.unreachable(); }
    catch (e) { expect((e as EntryInputError).field).toBe('partyId'); }
  });
});
