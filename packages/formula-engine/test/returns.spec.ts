/**
 * §2.3 · Returns, refunds and exchanges, and HT-11 corrections - the engine half.
 *
 * Every rule here has a test that fails without it; `tools/plant-returns.mjs`
 * removes each in turn and requires a failure.
 */
import { describe, it, expect } from 'vitest';
import {
  assertLegFits,
  buildCorrection,
  buildReturnEvent,
  buildSettlement,
  returnableOf,
  settlementOf,
  netSales,
  totalExpenses,
  expectedCashBalance,
  creditOutstanding,
  sectionStates,
  dayProgress,
  cashCheckUnlocked,
  parseReturnEntry,
  parseRefundEntry,
  EntryInputError,
  SECTIONS,
  type DayInput,
  type Entry,
} from '../src/index.ts';

const DAY = '2026-07-15';
const AT = DAY + 'T18:00:00.000Z';
let n = 0;
const id = () => `01890000-0000-7000-8000-${String((n += 1)).padStart(12, '0')}`;

const sale = (amount: number, over: Partial<Entry> = {}): Entry => ({
  id: id(),
  dayId: '2026-07-10',
  section: 'cash_sales',
  amount,
  mode: 'cash',
  createdAt: '2026-07-10T10:00:00.000Z',
  source: 'manual',
  ...over,
});

const input = (entries: Entry[], prior = 0): DayInput => ({
  day: { date: DAY, state: 'open', openingCash: 150000, countedCash: null, skippedSections: [] },
  entries,
  priorCreditOutstanding: prior,
  priorSupplierOutstanding: 0,
});

type Draft = Parameters<typeof buildReturnEvent>[0];
const event = (s: Entry, over: Partial<Draft> & Pick<Draft, 'settlement'>) =>
  buildReturnEvent({
    sale: s,
    ledger: [],
    dayId: DAY,
    createdAt: AT,
    ids: [id(), id(), id()],
    returned: s.amount,
    ...over,
  });

const refusal = (fn: () => unknown): EntryInputError => {
  try {
    fn();
  } catch (e) {
    if (e instanceof EntryInputError) return e;
    throw e;
  }
  throw new Error('expected a refusal');
};

describe('the four settlement states are a fold over the legs (EX-4)', () => {
  it('Returned + Refund paid: a cash refund of the whole value', () => {
    const legs = event(sale(90000), { settlement: 'cash' });
    expect(legs.map((e) => e.section)).toEqual(['sales_return', 'refund_paid']);
    expect(settlementOf(legs[0]!, legs).state).toBe('refund_paid');
  });

  it('Returned + Credit issued: settled entirely against udhar', () => {
    const legs = event(sale(90000), { settlement: 'udhar', partyId: 'c1' });
    const s = settlementOf(legs[0]!, legs);
    expect(s.state).toBe('credit_issued');
    expect(s.outstanding).toBe(0);
  });

  it('Returned + Replacement: an exchange_out leg exists', () => {
    const legs = event(sale(90000), { settlement: 'exchange', replacement: 90000 });
    expect(legs.map((e) => e.section)).toEqual(['sales_return', 'exchange_out']);
    expect(settlementOf(legs[0]!, legs).state).toBe('replacement');
  });

  it('Returned + Pending settlement: NO settlement row at all', () => {
    const legs = event(sale(90000), { settlement: 'pending', partyId: 'c1' });
    expect(legs).toHaveLength(1);
    const s = settlementOf(legs[0]!, legs);
    expect(s.state).toBe('pending_settlement');
    expect(s.outstanding).toBe(90000);
  });

  it('a later settlement is an INSERT that moves the fold forward', () => {
    const [ret] = event(sale(90000), { settlement: 'pending', partyId: 'c1' });
    const part = buildSettlement({ ret: ret!, ledger: [], id: id(), dayId: DAY, createdAt: AT, amount: 40000, mode: 'cash' });
    // Scenario 13: partly refunded is still Pending, with a non-zero settled figure.
    expect(settlementOf(ret!, [part])).toMatchObject({ state: 'pending_settlement', settled: 40000, outstanding: 50000 });
    const rest = buildSettlement({ ret: ret!, ledger: [part], id: id(), dayId: DAY, createdAt: AT, amount: 50000, mode: 'upi' });
    expect(settlementOf(ret!, [part, rest]).state).toBe('refund_paid');
  });

  it('ignores rows that do not refer to the return', () => {
    const legs = event(sale(90000), { settlement: 'pending', partyId: 'c1' });
    const stray = parseRefundEntry({ id: id(), dayId: DAY, createdAt: AT, amount: 90000, mode: 'cash', refersToEntryId: 'other' });
    expect(settlementOf(legs[0]!, [...legs, stray]).state).toBe('pending_settlement');
  });
});

describe('an event is never settled for more than it is worth (EX-12)', () => {
  it('refuses a duplicate refund - the double-tap that pays out twice', () => {
    const legs = event(sale(90000), { settlement: 'cash' });
    const again = parseRefundEntry({ id: id(), dayId: DAY, createdAt: AT, amount: 90000, mode: 'cash', refersToEntryId: legs[0]!.id });
    expect(refusal(() => assertLegFits(again, legs[0], legs)).field).toBe('amount');
  });

  it('refuses a return of more than was sold, counting earlier returns', () => {
    const s = sale(90000);
    const first = event(s, { settlement: 'cash', returned: 60000 });
    expect(returnableOf(s, first)).toBe(30000);
    expect(refusal(() => event(s, { settlement: 'cash', returned: 40000, ledger: first })).field).toBe('amount');
    expect(event(s, { settlement: 'cash', returned: 30000, ledger: first })).toHaveLength(2);
  });

  it('refuses a return that points at something other than a sale', () => {
    const notSale = sale(5000, { section: 'expense' });
    const ret = parseReturnEntry({ id: id(), dayId: DAY, createdAt: AT, amount: 5000, refersToEntryId: notSale.id });
    expect(refusal(() => assertLegFits(ret, notSale, [])).field).toBe('refersToEntryId');
  });

  it('refuses a leg whose target is not in the book', () => {
    const ret = parseReturnEntry({ id: id(), dayId: DAY, createdAt: AT, amount: 5000, refersToEntryId: 'missing' });
    expect(refusal(() => assertLegFits(ret, undefined, [])).field).toBe('refersToEntryId');
  });

  it('refuses a refund on an exchange where the customer owes the shop', () => {
    const legs = event(sale(90000), { settlement: 'exchange', replacement: 120000, differenceMode: 'cash' });
    const refund = parseRefundEntry({ id: id(), dayId: DAY, createdAt: AT, amount: 100, mode: 'cash', refersToEntryId: legs[0]!.id });
    expect(refusal(() => assertLegFits(refund, legs[0], legs)).field).toBe('section');
  });

  it('refuses a return credited to a different customer from the sale', () => {
    const s = sale(90000, { section: 'udhar_sales', mode: 'udhar', partyId: 'c1' });
    expect(refusal(() => event(s, { settlement: 'udhar', partyId: 'c2' })).field).toBe('partyId');
  });
});

describe('who must be named (EX-11)', () => {
  it('a pending return must name the customer it is owed to', () => {
    expect(refusal(() => event(sale(90000), { settlement: 'pending' })).field).toBe('partyId');
  });
  it('credit issued must name the customer', () => {
    expect(refusal(() => event(sale(90000), { settlement: 'udhar' })).field).toBe('partyId');
  });
  it('a refund on the spot names nobody, keeping the 2-4 step promise', () => {
    expect(event(sale(90000), { settlement: 'cash' })[0]!.partyId).toBeUndefined();
  });
  it("a return of an udhar sale carries that sale's customer", () => {
    const s = sale(90000, { section: 'udhar_sales', mode: 'udhar', partyId: 'c1' });
    expect(event(s, { settlement: 'pending' })[0]!.partyId).toBe('c1');
  });
});

describe('exchange: one event, the difference only (review §6)', () => {
  it('a dearer replacement: the customer pays the difference, in the mode chosen', () => {
    const legs = event(sale(90000), { settlement: 'exchange', replacement: 120000, differenceMode: 'upi' });
    expect(legs.map((e) => [e.section, e.amount, e.mode])).toEqual([
      ['sales_return', 90000, 'other'],
      ['exchange_out', 120000, 'other'],
      ['exchange_receipt', 30000, 'upi'],
    ]);
    // Net Sales moves by the difference - never by the replacement's whole price.
    expect(netSales(input(legs)).value).toBe(30000);
  });

  it('a cheaper replacement: the shop refunds the difference', () => {
    const legs = event(sale(120000), { settlement: 'exchange', replacement: 90000, differenceMode: 'cash' });
    expect(legs[2]).toMatchObject({ section: 'refund_paid', amount: 30000, mode: 'cash' });
    expect(expectedCashBalance(input(legs)).value).toBe(120000);
  });

  it('a difference must say how it was paid', () => {
    expect(refusal(() => event(sale(90000), { settlement: 'exchange', replacement: 120000 })).field).toBe('differenceMode');
  });
});

describe('the formulas (D2, D3, EX-2)', () => {
  it('a return is goods: it never moves cash by itself', () => {
    const legs = event(sale(90000), { settlement: 'pending', partyId: 'c1' });
    expect(expectedCashBalance(input(legs)).value).toBe(150000);
  });

  it('a UPI refund moves no cash; a cash refund does', () => {
    expect(expectedCashBalance(input(event(sale(90000), { settlement: 'upi' }))).value).toBe(150000);
    expect(expectedCashBalance(input(event(sale(90000), { settlement: 'cash' }))).value).toBe(60000);
  });

  it("credit issued comes off P7 (the lead's ruling)", () => {
    const legs = event(sale(90000), { settlement: 'udhar', partyId: 'c1' });
    expect(creditOutstanding(input(legs, 100000)).value).toBe(10000);
  });

  it('a refund is never an expense', () => {
    expect(totalExpenses(input(event(sale(90000), { settlement: 'cash' }))).value).toBe(0);
  });

  it('event sections gate nothing: the ring and the cash check still count eight (EX-7)', () => {
    const day = input(event(sale(90000), { settlement: 'cash' }));
    expect(Object.keys(sectionStates(day))).toEqual([...SECTIONS]);
    expect(dayProgress(day).total).toBe(10);
    expect(dayProgress(day).done).toBe(1); // the opening cash only
    expect(cashCheckUnlocked(day)).toBe(false);
  });

  it('the event lines appear only on a day that has the event', () => {
    const keys = (entries: Entry[]) => expectedCashBalance(input(entries)).working.lines.map((l) => l.key);
    expect(keys([])).not.toContain('working.refund_paid_cash');
    expect(keys(event(sale(90000), { settlement: 'upi' }))).toContain('working.refund_paid_cash');
  });
});

describe('a link belongs to an event leg or a correction (EX-3)', () => {
  it('an event leg must point at something', () => {
    expect(refusal(() => parseRefundEntry({ id: id(), dayId: DAY, createdAt: AT, amount: 100, mode: 'cash' })).field).toBe(
      'refersToEntryId',
    );
  });
});

describe('HT-11 · a correction of a closed day', () => {
  const original = sale(50000, { dayId: '2026-07-14' });

  it("lands on the open day, in the original's section and mode, naming both the day and the entry", () => {
    const c = buildCorrection({ original, id: id(), dayId: DAY, createdAt: AT, amount: 500 });
    expect(c).toMatchObject({
      dayId: DAY,
      section: 'cash_sales',
      mode: 'cash',
      amount: 500,
      correctsDayId: '2026-07-14',
      refersToEntryId: original.id,
    });
  });

  it('is never dated into the day it corrects', () => {
    expect(refusal(() => buildCorrection({ original, id: id(), dayId: '2026-07-14', createdAt: AT, amount: 500 })).field).toBe('dayId');
  });

  it('a correction of nothing is refused', () => {
    expect(refusal(() => buildCorrection({ original, id: id(), dayId: DAY, createdAt: AT, amount: 0 })).field).toBe('amount');
  });

  it('a return is settled, not corrected', () => {
    const [ret] = event(sale(90000), { settlement: 'pending', partyId: 'c1' });
    expect(refusal(() => buildCorrection({ original: ret!, id: id(), dayId: '2026-07-16', createdAt: AT, amount: 5 })).field).toBe(
      'refersToEntryId',
    );
  });
});
