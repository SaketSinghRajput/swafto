/**
 * PR-1 AND PR-2 - ITEMS PER SALE, AND WHAT THEY SAY (Premium, R5).
 *
 * PURE, like the rest of the engine: no clock, no I/O. "Today" and every period
 * are passed in (ADR-012).
 *
 * WHAT AN ITEM LINE IS. A fact the shopkeeper typed about a sale he had already
 * recorded: which of HIS OWN items (or "Other"), how many, and for how much. Its
 * own append-only row pointing at the sale entry (D1); it never edits the sale
 * and never moves a figure the cash check or profit reads. Quantity and amount
 * are always typed - this file never suggests either (no inference in data
 * entry). The item list holds NAMES only: a stored default price would be a
 * figure offered while he types, which is inference by another name.
 *
 * NO STOCK, ANYWHERE (R5 decision 3). Nothing here knows what is on the shelf,
 * so nothing says "running out", "reorder" or "dead stock". "Slow" means sold
 * rarely in the period, and that is all it means.
 *
 * COVERAGE GOES BESIDE EVERY ITEM FIGURE. Lines are optional, so any item report
 * is only as complete as the share of sales value that carries them; an item
 * card that hides that share would present a sample as the whole.
 */
import { assertPaise, ratio, sum, type Paise, type Ratio } from './money.ts';
import { addDays, parseIsoDate, type IsoDate } from './dates.ts';
import { EntryInputError } from './input.ts';
import { RETURNABLE_SECTIONS } from './returns.ts';
import type { Entry } from './types.ts';

/** One name in the shop's own short list (20-40 typical). No price, ever. */
export interface ShopItem {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
}

/**
 * ONE ITEM LINE OF ONE SALE. `itemId` absent means "Other": he sold something
 * that is not on his list, and saying so is better than not recording it.
 */
export interface ItemLine {
  readonly id: string;
  /** The sale's day, which the closed-day guard reads (D7). */
  readonly dayId: IsoDate;
  /** The sale entry this line is part of. */
  readonly entryId: string;
  readonly itemId?: string;
  /** A whole count, typed. */
  readonly quantity: number;
  /** INTEGER PAISE, above zero, typed. */
  readonly amount: Paise;
  readonly createdAt: string;
}

/** The sync route's and the store's limit on an item name. */
export const ITEM_NAME_MAX = 60;
/** A count no counter sale reaches; refuses a slipped thumb, not a real sale. */
export const ITEM_QUANTITY_MAX = 99_999;
/** The sections an item line may hang off: the three sales sections. */
export const ITEM_SALE_SECTIONS = RETURNABLE_SECTIONS;

export function parseShopItem(draft: { readonly id: string; readonly name: unknown; readonly createdAt: string }): ShopItem {
  if (!draft.id) throw new EntryInputError('id', 'an item needs an id, assigned by the caller');
  if (!draft.createdAt) throw new EntryInputError('createdAt', 'an item needs a creation time');
  const name = typeof draft.name === 'string' ? draft.name.trim() : '';
  if (name === '') throw new EntryInputError('name', 'an item needs a name');
  if (name.length > ITEM_NAME_MAX) {
    throw new EntryInputError('name', 'an item name is at most ' + ITEM_NAME_MAX + ' characters');
  }
  return { id: draft.id, name, createdAt: draft.createdAt };
}

export function parseItemLine(draft: {
  readonly id: string;
  readonly dayId: IsoDate;
  readonly entryId: string;
  readonly itemId?: string | undefined;
  readonly quantity: unknown;
  readonly amount: unknown;
  readonly createdAt: string;
}): ItemLine {
  if (!draft.id) throw new EntryInputError('id', 'an item line needs an id');
  if (!draft.entryId) throw new EntryInputError('entryId', 'an item line names the sale it is part of');
  if (!draft.createdAt) throw new EntryInputError('createdAt', 'an item line needs a time');
  parseIsoDate(draft.dayId);
  const q = draft.quantity;
  if (typeof q !== 'number' || !Number.isInteger(q) || q < 1 || q > ITEM_QUANTITY_MAX) {
    throw new EntryInputError('quantity', 'type how many - a whole number from 1 to ' + ITEM_QUANTITY_MAX + '.');
  }
  const amount = assertPaise(draft.amount, 'amount');
  if (amount <= 0) throw new EntryInputError('amount', 'type what this item sold for.');
  return {
    id: draft.id,
    dayId: draft.dayId,
    entryId: draft.entryId,
    ...(draft.itemId ? { itemId: draft.itemId } : {}),
    quantity: q,
    amount,
    createdAt: draft.createdAt,
  };
}

/**
 * THE ONE RULE A LINE MUST FIT, run by the phone and the server alike: it hangs
 * off a SALE of the same day, and the sale's lines never add up to MORE than
 * the sale. Less is allowed and normal ("items recorded for 300 of 500"). More
 * is refused, because a basket worth more than was taken is a figure that
 * cannot be true.
 */
export function assertLineFits(line: ItemLine, sale: Entry | undefined, existing: readonly ItemLine[]): void {
  if (sale === undefined || !ITEM_SALE_SECTIONS.includes(sale.section)) {
    throw new EntryInputError('entryId', 'items are recorded against a sale, and this is not one.');
  }
  if (sale.dayId !== line.dayId) {
    throw new EntryInputError('dayId', 'an item line is dated to its sale’s day.');
  }
  const already = sum(existing.filter((l) => l.entryId === sale.id && l.id !== line.id).map((l) => l.amount));
  if (sum([already, line.amount]) > sale.amount) {
    throw new EntryInputError(
      'amount',
      'the items would come to more than the sale. Items are recorded for at most the sale’s amount.',
    );
  }
}

/** What a sale's lines come to, beside the sale. Derived; never stored. */
export function saleItemised(sale: Entry, lines: readonly ItemLine[]): { itemised: Paise; sale: Paise } {
  return { itemised: sum(lines.filter((l) => l.entryId === sale.id).map((l) => l.amount)), sale: sale.amount };
}

/* ------------------------------------------------------------------ *
 * PR-2 · the reports. Every one takes a period [from, to], inclusive.
 * ------------------------------------------------------------------ */

export interface Period {
  readonly from: IsoDate;
  readonly to: IsoDate;
}

const inPeriod = (d: IsoDate, p: Period) => d >= p.from && d <= p.to;

/** A gate that is not about closed days: "N of M needed", stated as two integers. */
export type ItemGated<T> =
  | { readonly available: true; readonly value: T }
  | { readonly available: false; readonly required: number; readonly soFar: number };

/**
 * COVERAGE: the share of sales value in the period that has item lines. Shown
 * beside every item figure. `basisPoints` null when there were no sales.
 */
export function itemCoverage(entries: readonly Entry[], lines: readonly ItemLine[], p: Period): Ratio {
  const sales = entries.filter((e) => ITEM_SALE_SECTIONS.includes(e.section) && inPeriod(e.dayId, p));
  const ids = new Set(sales.map((e) => e.id));
  return ratio(
    sum(lines.filter((l) => ids.has(l.entryId)).map((l) => l.amount)),
    sum(sales.map((e) => e.amount)),
  );
}

/** One item's figures over a period. `itemId` null is "Other". */
export interface ItemTotal {
  readonly itemId: string | null;
  readonly value: Paise;
  readonly quantity: number;
  /** How many sales it was on: "how often it sells". */
  readonly sales: number;
}

/** Lines in the period whose sale exists and is a sale - a line on nothing counts for nothing. */
function periodLines(entries: readonly Entry[], lines: readonly ItemLine[], p: Period): ItemLine[] {
  const sales = new Set(entries.filter((e) => ITEM_SALE_SECTIONS.includes(e.section)).map((e) => e.id));
  return lines.filter((l) => inPeriod(l.dayId, p) && sales.has(l.entryId));
}

function totals(lines: readonly ItemLine[], seed: readonly string[] = []): ItemTotal[] {
  const by = new Map<string | null, { value: Paise[]; quantity: number; sales: Set<string> }>();
  for (const id of seed) by.set(id, { value: [], quantity: 0, sales: new Set() });
  for (const l of lines) {
    const k = l.itemId ?? null;
    const t = by.get(k) ?? { value: [], quantity: 0, sales: new Set<string>() };
    t.value.push(l.amount);
    t.quantity += l.quantity; // a count, not money
    t.sales.add(l.entryId);
    by.set(k, t);
  }
  return [...by].map(([itemId, t]) => ({ itemId, value: sum(t.value), quantity: t.quantity, sales: t.sales.size }));
}

/** Ties break by item id, so the same data always gives the same order. */
const tie = (a: ItemTotal, b: ItemTotal) => String(a.itemId).localeCompare(String(b.itemId));

export type ItemRanking = 'value' | 'count';

/** TOP ITEMS by value or by how many sales they were on. "Other" is included, and labelled so. */
export function topItems(
  entries: readonly Entry[],
  lines: readonly ItemLine[],
  p: Period,
  by: ItemRanking,
  limit = 5,
): ItemTotal[] {
  const key = (t: ItemTotal) => (by === 'value' ? t.value : t.sales);
  return totals(periodLines(entries, lines, p))
    .sort((a, b) => key(b) - key(a) || tie(a, b))
    .slice(0, limit);
}

/**
 * SLOW ITEMS: the items on HIS LIST sold least in the period, including those
 * sold not at all. "Other" is not an item and is never slow. This is how often
 * it sold, never what is on the shelf - there is no stock figure to say that.
 */
export function slowItems(
  entries: readonly Entry[],
  lines: readonly ItemLine[],
  items: readonly ShopItem[],
  p: Period,
  by: ItemRanking,
  limit = 5,
): ItemTotal[] {
  const listed = new Set(items.map((i) => i.id));
  const key = (t: ItemTotal) => (by === 'value' ? t.value : t.sales);
  return totals(
    periodLines(entries, lines, p).filter((l) => l.itemId !== undefined && listed.has(l.itemId)),
    items.map((i) => i.id),
  )
    .sort((a, b) => key(a) - key(b) || tie(a, b))
    .slice(0, limit);
}

/**
 * WHAT A NAMED CUSTOMER USUALLY BUYS. Only sales that name him - in practice
 * his udhar - because a cash sale names nobody and the app does not ask. For
 * the shopkeeper's own account with him (R4 §7.1); computed on the phone,
 * never sent anywhere, never a score of the person.
 */
export function customerItems(
  entries: readonly Entry[],
  lines: readonly ItemLine[],
  partyId: string,
  p: Period,
  limit = 5,
): ItemTotal[] {
  const his = entries.filter((e) => e.partyId === partyId);
  return topItems(his, lines, p, 'count', limit);
}

/** R3 §4.2: at least 200 itemised bills, and a pair seen at least 10 times. */
export const BASKET_GATES = { itemisedBills: 200, pairSupport: 10 } as const;

export interface ItemPair {
  readonly a: string;
  readonly b: string;
  /** Bills both were on. */
  readonly support: number;
}

/**
 * ITEMS BOUGHT TOGETHER: pairs of listed items on the same sale, with how many
 * sales carried both. Gated on itemised bills; a pair below its own support
 * floor is not shown, because two coincidences are not a pattern.
 */
export function itemPairs(
  entries: readonly Entry[],
  lines: readonly ItemLine[],
  p: Period,
  limit = 5,
): ItemGated<{ readonly bills: number; readonly pairs: readonly ItemPair[] }> {
  const bySale = new Map<string, Set<string>>();
  for (const l of periodLines(entries, lines, p)) {
    const set = bySale.get(l.entryId) ?? new Set<string>();
    if (l.itemId !== undefined) set.add(l.itemId);
    bySale.set(l.entryId, set);
  }
  const bills = bySale.size;
  if (bills < BASKET_GATES.itemisedBills) {
    return { available: false, required: BASKET_GATES.itemisedBills, soFar: bills };
  }
  const counts = new Map<string, number>();
  for (const set of bySale.values()) {
    const ids = [...set].sort();
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const k = ids[i] + '\u0000' + ids[j];
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
  }
  const pairs = [...counts]
    .filter(([, n]) => n >= BASKET_GATES.pairSupport)
    .map(([k, support]) => {
      const [a, b] = k.split('\u0000') as [string, string];
      return { a, b, support };
    })
    .sort((x, y) => y.support - x.support || (x.a + x.b).localeCompare(y.a + y.b))
    .slice(0, limit);
  return { available: true, value: { bills, pairs } };
}

/** R3 §4.2: TSB only with at least 8 sale days for that item in the last 90. */
export const DEMAND_GATES = { windowDays: 90, saleDays: 8 } as const;

export interface DemandEstimate {
  readonly method: 'tsb';
  /** Always true: the card says "estimate", never "you will sell". */
  readonly estimate: true;
  /** Expected quantity per 7 days, in TENTHS (17 is "about 1.7 a week"). */
  readonly perWeekTenths: number;
  readonly saleDays: number;
  readonly windowDays: number;
  /** The smoothing weights the grid chose, in basis points. */
  readonly alphaBp: number;
  readonly betaBp: number;
}

/**
 * TSB one-step forecasts over a daily series, returning the final per-day
 * estimate and the in-sample squared error of the one-step forecasts.
 * Teunter, Syntetos & Babai 2011: the demand probability p updates every day
 * (towards 1 on a sale day, towards 0 on a zero day), the size z only on a sale
 * day. Unlike Croston it keeps falling through a long run of zeros - which is
 * the slow item's whole story.
 */
function tsb(series: readonly number[], alpha: number, beta: number): { forecast: number; sse: number } {
  const first = series.find((q) => q > 0) ?? 0;
  let z = first;
  let p = series.filter((q) => q > 0).length / series.length;
  let sse = 0;
  for (const q of series) {
    const f = p * z;
    sse += (q - f) * (q - f);
    p += beta * ((q > 0 ? 1 : 0) - p);
    if (q > 0) z += alpha * (q - z);
  }
  return { forecast: p * z, sse };
}

const GRID_BP = [1000, 2000, 3000] as const;

/**
 * ITEM DEMAND ESTIMATE (TSB), gated on history. Quantities are counts, so this
 * is the one place in the engine where a fraction is honest; it is rounded once,
 * to tenths of a unit a week, at the end. The weights are chosen by a grid over
 * the shop's own series (R3 §4.1), no optimiser.
 */
export function itemDemand(
  lines: readonly ItemLine[],
  itemId: string,
  today: IsoDate,
): ItemGated<DemandEstimate> {
  const from = addDays(today, 1 - DEMAND_GATES.windowDays);
  const byDay = new Map<IsoDate, number>();
  for (const l of lines) {
    if (l.itemId !== itemId || l.dayId < from || l.dayId > today) continue;
    byDay.set(l.dayId, (byDay.get(l.dayId) ?? 0) + l.quantity);
  }
  const saleDays = byDay.size;
  if (saleDays < DEMAND_GATES.saleDays) {
    return { available: false, required: DEMAND_GATES.saleDays, soFar: saleDays };
  }
  const series = Array.from({ length: DEMAND_GATES.windowDays }, (_, i) => byDay.get(addDays(from, i)) ?? 0);
  let best = { alphaBp: 0, betaBp: 0, forecast: 0, sse: Infinity };
  for (const alphaBp of GRID_BP) {
    for (const betaBp of GRID_BP) {
      const r = tsb(series, alphaBp / 10000, betaBp / 10000);
      if (r.sse < best.sse) best = { alphaBp, betaBp, ...r };
    }
  }
  return {
    available: true,
    value: {
      method: 'tsb',
      estimate: true,
      perWeekTenths: Math.round(best.forecast * 70),
      saleDays,
      windowDays: DEMAND_GATES.windowDays,
      alphaBp: best.alphaBp,
      betaBp: best.betaBp,
    },
  };
}

/** Everything the item cards draw, for one period, in one call. */
export interface ItemReports {
  readonly period: Period;
  readonly coverage: Ratio;
  readonly topByValue: readonly ItemTotal[];
  readonly topByCount: readonly ItemTotal[];
  readonly slow: readonly ItemTotal[];
  readonly pairs: ItemGated<{ readonly bills: number; readonly pairs: readonly ItemPair[] }>;
  /** One estimate per listed item, gated each on its own history. */
  readonly demand: readonly { readonly itemId: string; readonly result: ItemGated<DemandEstimate> }[];
}

export function itemReports(
  entries: readonly Entry[],
  lines: readonly ItemLine[],
  items: readonly ShopItem[],
  p: Period,
): ItemReports {
  return {
    period: p,
    coverage: itemCoverage(entries, lines, p),
    topByValue: topItems(entries, lines, p, 'value'),
    topByCount: topItems(entries, lines, p, 'count'),
    slow: slowItems(entries, lines, items, p, 'count'),
    pairs: itemPairs(entries, lines, p),
    demand: items.map((i) => ({ itemId: i.id, result: itemDemand(lines, i.id, p.to) })),
  };
}
