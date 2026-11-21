/**
 * CANCEL THIS ENTRY (docs/design/CANCEL-ENTRY-GATE.md): the engine half.
 *
 * `liveEntries` drops a cancel row AND the entry it cancels before any figure is derived, so the pair is in
 * no total: net sales, expected cash, credit outstanding, item reports. `buildCancel` / `assertCancelFits`
 * refuse the five things a cancel must not do. Nothing here reads a clock or computes money: the cancel row
 * copies the target's integer paise.
 */
import { describe, it, expect } from 'vitest';
import {
  assertCancelFits,
  assertPartyKind,
  partyKindFor,
  buildCancel,
  computePrimary,
  creditOutstanding,
  expectedCashBalance,
  itemReports,
  liveEntries,
  parseSalesEntry,
  parseCollectionEntry,
  parseReturnEntry,
  EntryInputError,
  type DayInput,
  type Entry,
  type ItemLine,
} from '../src/index.ts';

const DAY = '2026-07-15';
const AT = DAY + 'T10:00:00.000Z';
const id = (n: number) => `01890000-0000-7000-8000-${String(n).padStart(12, '0')}`;

const cashSale = (n: number, amount: number): Entry => parseSalesEntry({ id: id(n), dayId: DAY, amount, mode: 'cash', createdAt: AT });
const udharSale = (n: number, amount: number): Entry =>
  parseSalesEntry({ id: id(n), dayId: DAY, amount, mode: 'udhar', partyId: id(900), createdAt: AT });

const input = (entries: readonly Entry[]): DayInput => ({
  day: { date: DAY, state: 'open', openingCash: 0, countedCash: null } as DayInput['day'],
  entries,
  priorCreditOutstanding: 0,
  priorSupplierOutstanding: 0,
});
const refusal = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(EntryInputError);
    return (e as EntryInputError).field;
  }
  throw new Error('expected a refusal');
};

describe('liveEntries: the pair is out of every total', () => {
  it('is the same array when nothing is cancelled, so every existing figure and vector is unchanged', () => {
    const rows = [cashSale(1, 50000), cashSale(2, 30000)];
    expect(liveEntries(rows)).toBe(rows);
  });

  it('removes the cancelled sale AND its cancel row from net sales and expected cash', () => {
    const keep = cashSale(1, 50000);
    const mistake = cashSale(2, 30000);
    const cancel = buildCancel({ target: mistake, id: id(3), createdAt: AT, ledger: [keep, mistake] });
    const all = [keep, mistake, cancel];
    const withPair = computePrimary(input(all));
    const live = computePrimary(input(liveEntries(all)));
    expect(live.p4NetSales.value).toBe(50000);
    expect(expectedCashBalance(input(liveEntries(all))).value).toBe(50000);
    // the pair is only gone once the filter is applied: raw rows would count the sale AND the copy
    expect(withPair.p4NetSales.value).toBe(110000);
  });

  it('removes a cancelled CREDIT sale from credit outstanding, but not an ordinary one', () => {
    const owed = udharSale(1, 70000);
    const mistake = udharSale(2, 20000);
    const cancel = buildCancel({ target: mistake, id: id(3), createdAt: AT, ledger: [owed, mistake] });
    const all = [owed, mistake, cancel];
    expect(creditOutstanding(input(liveEntries(all))).value).toBe(70000);
    expect(creditOutstanding(input(all)).value).toBe(110000);
  });

  it('takes the item lines of a cancelled sale out of the item reports (they join to live sales only)', () => {
    const keep = cashSale(1, 50000);
    const mistake = cashSale(2, 30000);
    const cancel = buildCancel({ target: mistake, id: id(3), createdAt: AT, ledger: [keep, mistake] });
    const line = (n: number, entryId: string, amount: number): ItemLine => ({ id: id(n), dayId: DAY, entryId, quantity: 1, amount, createdAt: AT }) as ItemLine;
    const lines = [line(10, keep.id, 50000), line(11, mistake.id, 30000)];
    const period = { from: DAY, to: DAY } as Parameters<typeof itemReports>[3];
    const live = itemReports(liveEntries([keep, mistake, cancel]), lines, [], period);
    const raw = itemReports([keep, mistake, cancel], lines, [], period);
    expect(JSON.stringify(live)).not.toBe(JSON.stringify(raw));
    expect(live.coverage).not.toEqual(raw.coverage);
  });
});

describe('buildCancel and assertCancelFits', () => {
  it('copies section, mode, party, day and amount, and points at the target (integer paise, never computed)', () => {
    const t = udharSale(1, 12345);
    const c = buildCancel({ target: t, id: id(2), createdAt: AT, ledger: [t] });
    expect(c).toMatchObject({ section: t.section, mode: t.mode, partyId: t.partyId, dayId: t.dayId, amount: 12345, cancelsEntryId: t.id });
    expect(Number.isInteger(c.amount)).toBe(true);
  });

  it('refuses a cancel of a cancel', () => {
    const t = cashSale(1, 100);
    const c = buildCancel({ target: t, id: id(2), createdAt: AT, ledger: [t] });
    expect(refusal(() => buildCancel({ target: c, id: id(3), createdAt: AT, ledger: [t, c] }))).toBe('cancel_of_cancel');
  });

  it('refuses a second cancel of the same entry', () => {
    const t = cashSale(1, 100);
    const c = buildCancel({ target: t, id: id(2), createdAt: AT, ledger: [t] });
    expect(refusal(() => buildCancel({ target: t, id: id(3), createdAt: AT, ledger: [t, c] }))).toBe('already_cancelled');
  });

  it('refuses an entry of another day', () => {
    const t = cashSale(1, 100);
    const c = { ...buildCancel({ target: t, id: id(2), createdAt: AT, ledger: [t] }), dayId: '2026-07-16' } as Entry;
    expect(refusal(() => assertCancelFits(c, t, [], null))).toBe('cancel_other_day');
  });

  it('refuses an entry that has a return linked to it, and an event leg', () => {
    const sale = cashSale(1, 100000);
    const ret = parseReturnEntry({ id: id(2), dayId: DAY, amount: 40000, createdAt: AT, refersToEntryId: sale.id });
    expect(refusal(() => buildCancel({ target: sale, id: id(3), createdAt: AT, ledger: [sale, ret] }))).toBe('has_linked_entries');
    expect(refusal(() => buildCancel({ target: ret, id: id(4), createdAt: AT, ledger: [sale, ret] }))).toBe('cancel_event_leg');
  });

  it('refuses a cancel that is not an exact copy (a different amount cannot hide in it)', () => {
    const t = cashSale(1, 100);
    const c = { ...buildCancel({ target: t, id: id(2), createdAt: AT, ledger: [t] }), amount: 90 } as Entry;
    expect(refusal(() => assertCancelFits(c, t, [], null))).toBe('cancel_mismatch');
  });

  it('a collection (credit paid in) cancels too, and refuses a float amount upstream of the copy', () => {
    const col = parseCollectionEntry({ id: id(1), dayId: DAY, amount: 5000, mode: 'cash', partyId: id(900), createdAt: AT });
    expect(buildCancel({ target: col, id: id(2), createdAt: AT, ledger: [col] }).cancelsEntryId).toBe(col.id);
    expect(() => parseSalesEntry({ id: id(3), dayId: DAY, amount: 100.5, mode: 'cash', createdAt: AT })).toThrow();
  });
});

describe('party kind', () => {
  const c = { kind: 'customer' as const };
  const sup = { kind: 'supplier' as const };
  it('says which kind each section names', () => {
    expect(partyKindFor('party_payment')).toBe('supplier');
    expect(partyKindFor('purchase')).toBe('supplier');
    for (const s of ['udhar_sales', 'udhar_collection', 'sales_return', 'exchange_out', 'exchange_receipt', 'refund_paid'] as const) expect(partyKindFor(s)).toBe('customer');
    for (const s of ['cash_sales', 'upi_sales', 'expense', 'withdrawal'] as const) expect(partyKindFor(s)).toBeNull();
  });
  it('refuses the wrong kind with party_kind_mismatch, accepts the right one and an unknown party', () => {
    const credit = udharSale(1, 100);
    expect(refusal(() => assertPartyKind(credit, sup))).toBe('party_kind_mismatch');
    expect(() => assertPartyKind(credit, c)).not.toThrow();
    expect(() => assertPartyKind(credit, undefined)).not.toThrow();
    expect(refusal(() => assertPartyKind({ section: 'party_payment', partyId: id(900) }, c))).toBe('party_kind_mismatch');
    expect(() => assertPartyKind({ section: 'party_payment', partyId: id(900) }, sup)).not.toThrow();
    expect(() => assertPartyKind({ section: 'cash_sales' }, sup)).not.toThrow();
  });
});
