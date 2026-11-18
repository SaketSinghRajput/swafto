/**
 * PR-1 and PR-2: item lines and the item reports, pure and clock-free.
 * Every test here names the rule it holds, so a planted defect has somewhere to fail.
 */
import { describe, it, expect } from 'vitest';
import {
  addDays,
  assertLineFits,
  customerItems,
  itemCoverage,
  itemDemand,
  itemPairs,
  itemReports,
  parseItemLine,
  parseShopItem,
  saleItemised,
  slowItems,
  topItems,
  BASKET_GATES,
  DEMAND_GATES,
  type Entry,
  type ItemLine,
  type ShopItem,
} from '../src/index.ts';

const DAY = '2026-07-15';
const NOW = '2026-07-15T10:00:00.000Z';
let n = 0;
const sale = (amount: number, o: Partial<Entry> = {}): Entry =>
  ({
    id: 's' + String(++n),
    dayId: DAY,
    section: 'cash_sales',
    amount,
    mode: 'cash',
    createdAt: NOW,
    source: 'manual',
    ...o,
  }) as Entry;
const line = (entry: Entry, amount: number, itemId: string | undefined, quantity = 1, dayId = entry.dayId): ItemLine => ({
  id: 'l' + String(++n),
  dayId,
  entryId: entry.id,
  ...(itemId ? { itemId } : {}),
  quantity,
  amount,
  createdAt: NOW,
});
const items: ShopItem[] = ['atta', 'dal', 'tea', 'soap'].map((id) => ({ id, name: id, createdAt: NOW }));
const P = { from: '2026-07-01', to: '2026-07-31' };

describe('PR-1 - parsing what he typed', () => {
  it('an item is a name and nothing else, trimmed, never empty or over 60', () => {
    expect(parseShopItem({ id: 'i', name: '  Atta 5kg ', createdAt: NOW })).toEqual({ id: 'i', name: 'Atta 5kg', createdAt: NOW });
    expect(() => parseShopItem({ id: 'i', name: '   ', createdAt: NOW })).toThrow(/name/);
    expect(() => parseShopItem({ id: 'i', name: 'x'.repeat(61), createdAt: NOW })).toThrow(/60/);
  });

  it('a line takes a whole quantity and whole positive paise; absent item is Other', () => {
    const ok = parseItemLine({ id: 'l', dayId: DAY, entryId: 's', quantity: 2, amount: 4000, createdAt: NOW });
    expect(ok).toEqual({ id: 'l', dayId: DAY, entryId: 's', quantity: 2, amount: 4000, createdAt: NOW });
    expect('itemId' in ok).toBe(false);
    for (const quantity of [0, -1, 1.5, '2', 100000]) {
      expect(() => parseItemLine({ id: 'l', dayId: DAY, entryId: 's', quantity, amount: 4000, createdAt: NOW })).toThrow(/how many/);
    }
    for (const amount of [0, 12.5, -100]) {
      expect(() => parseItemLine({ id: 'l', dayId: DAY, entryId: 's', quantity: 1, amount, createdAt: NOW })).toThrow();
    }
  });
});

describe('PR-1 - a line fits its sale or is refused', () => {
  it('less than the sale is fine, exactly the sale is fine, one paisa more is refused', () => {
    const s = sale(50000);
    const a = line(s, 30000, 'atta');
    expect(() => assertLineFits(a, s, [])).not.toThrow();
    const b = line(s, 20000, undefined);
    expect(() => assertLineFits(b, s, [a])).not.toThrow();
    expect(() => assertLineFits(line(s, 1, 'tea'), s, [a, b])).toThrow(/more than the sale/);
    expect(saleItemised(s, [a, b])).toEqual({ itemised: 50000, sale: 50000 });
  });

  it('only a sale of its own day: never an expense, nothing, or another day', () => {
    const s = sale(50000);
    expect(() => assertLineFits(line(s, 100, 'tea'), sale(100, { section: 'expense' }), [])).toThrow(/not one/);
    expect(() => assertLineFits(line(s, 100, 'tea'), undefined, [])).toThrow(/not one/);
    expect(() => assertLineFits(line(s, 100, 'tea', 1, '2026-07-16'), s, [])).toThrow(/day/);
  });

  it("another sale's lines do not count against this one", () => {
    const s1 = sale(10000);
    const s2 = sale(10000);
    expect(() => assertLineFits(line(s2, 10000, 'tea'), s2, [line(s1, 10000, 'tea')])).not.toThrow();
  });
});

describe('PR-2 - coverage and top/slow items', () => {
  const s1 = sale(50000, { dayId: '2026-07-10' });
  const s2 = sale(30000, { dayId: '2026-07-11', section: 'udhar_sales', mode: 'udhar', partyId: 'ramesh' });
  const s3 = sale(20000, { dayId: '2026-07-12' }); // no items recorded
  const outside = sale(99900, { dayId: '2026-06-30' });
  const expense = sale(5000, { section: 'expense' });
  const lines = [
    line(s1, 30000, 'atta', 1),
    line(s1, 10000, 'tea', 2),
    line(s2, 6000, 'tea', 3),
    line(s2, 4000, undefined, 1),
    line(outside, 99900, 'soap', 9),
  ];
  const entries = [s1, s2, s3, outside, expense];

  it('coverage is itemised value over sales value in the period, sales only', () => {
    const c = itemCoverage(entries, lines, P);
    expect(c.numeratorPaise).toBe(50000);
    expect(c.denominatorPaise).toBe(100000);
    expect(c.basisPoints).toBe(5000);
    expect(itemCoverage([], [], P).basisPoints).toBeNull();
  });

  it('top by value and by count differ, Other included, out-of-period ignored', () => {
    expect(topItems(entries, lines, P, 'value').map((t) => t.itemId)).toEqual(['atta', 'tea', null]);
    const byCount = topItems(entries, lines, P, 'count');
    expect(byCount[0]).toEqual({ itemId: 'tea', value: 16000, quantity: 5, sales: 2 });
    // atta and Other tie on one sale each; the tie breaks by id, stably.
    expect(byCount.map((t) => t.itemId)).toEqual(['tea', 'atta', null]);
  });

  it('slow items are from his list, unsold ones first, never Other', () => {
    const slow = slowItems(entries, lines, items, P, 'count');
    expect(slow.map((t) => t.itemId)).toEqual(['dal', 'soap', 'atta', 'tea']);
    expect(slow[0]).toEqual({ itemId: 'dal', value: 0, quantity: 0, sales: 0 });
    expect(slow.some((t) => t.itemId === null)).toBe(false);
  });

  it('what a named customer usually buys reads only his sales', () => {
    expect(customerItems(entries, lines, 'ramesh', P).map((t) => t.itemId)).toEqual([null, 'tea']);
    expect(customerItems(entries, lines, 'nobody', P)).toEqual([]);
  });
});

describe('PR-2 - items bought together, gated (R3 §4.2)', () => {
  const build = (bills: number, together: number) => {
    const entries: Entry[] = [];
    const lines: ItemLine[] = [];
    for (let i = 0; i < bills; i += 1) {
      const s = sale(10000);
      entries.push(s);
      lines.push(line(s, 1000, 'tea'));
      if (i < together) lines.push(line(s, 1000, 'atta'));
      lines.push(line(s, 1000, undefined)); // Other never pairs
    }
    return { entries, lines };
  };

  it('closed below 200 itemised bills, saying how many so far', () => {
    const { entries, lines } = build(BASKET_GATES.itemisedBills - 1, 50);
    expect(itemPairs(entries, lines, P)).toEqual({ available: false, required: 200, soFar: 199 });
  });

  it('open at 200, a pair counted once per bill, below support 10 not shown', () => {
    const { entries, lines } = build(200, 12);
    const r = itemPairs(entries, lines, P);
    expect(r).toEqual({ available: true, value: { bills: 200, pairs: [{ a: 'atta', b: 'tea', support: 12 }] } });
    const w = build(200, 9);
    const weak = itemPairs(w.entries, w.lines, P);
    expect(weak.available && weak.value.pairs).toEqual([]);
  });
});

describe('PR-2 - item demand estimate (TSB), gated on history', () => {
  const TODAY = '2026-07-31';
  const daily = (days: readonly number[], q = 1) =>
    days.map((back) => {
      const s = sale(1000, { dayId: addDays(TODAY, -back) });
      return line(s, 1000, 'tea', q);
    });

  it('fewer than 8 sale days in 90: no estimate, the count instead', () => {
    expect(itemDemand(daily([0, 1, 2, 3, 4, 5, 6]), 'tea', TODAY)).toEqual({ available: false, required: 8, soFar: 7 });
    // A sale 90 days back is outside the window.
    expect(itemDemand(daily([0, 1, 2, 3, 4, 5, 6, DEMAND_GATES.windowDays]), 'tea', TODAY).available).toBe(false);
  });

  it('one a day, every day: about 7 a week, labelled an estimate with its method', () => {
    const r = itemDemand(daily(Array.from({ length: 90 }, (_, i) => i)), 'tea', TODAY);
    expect(r.available).toBe(true);
    if (!r.available) return;
    expect(r.value.method).toBe('tsb');
    expect(r.value.estimate).toBe(true);
    expect(r.value.perWeekTenths).toBe(70);
    expect(r.value.saleDays).toBe(90);
  });

  it('TSB falls through a long run of zeros (the slow item), where Croston would not', () => {
    const recent = itemDemand(daily(Array.from({ length: 10 }, (_, i) => i)), 'tea', TODAY);
    const stale = itemDemand(daily(Array.from({ length: 10 }, (_, i) => 80 + i)), 'tea', TODAY);
    expect(recent.available && stale.available).toBe(true);
    if (!recent.available || !stale.available) return;
    // One sale a day for the last ten days: about 6.8 a week. The same ten,
    // eighty days ago and nothing since: TSB has decayed the probability to nil.
    // Croston (probability frozen on zero days) would still say about 6.8.
    expect(recent.value.perWeekTenths).toBe(68);
    expect(stale.value.perWeekTenths).toBe(0);
  });

  it('itemReports bundles every card, clock-free: same input, same output', () => {
    const lines = daily([0, 1]);
    const entries = lines.map((l) => sale(1000, { id: l.entryId, dayId: l.dayId }));
    const a = itemReports(entries, lines, items, P);
    const b = itemReports(entries, lines, items, P);
    expect(a).toEqual(b);
    expect(a.demand.map((d) => d.itemId)).toEqual(items.map((i) => i.id));
    expect(a.coverage.basisPoints).toBe(10000);
  });
});
