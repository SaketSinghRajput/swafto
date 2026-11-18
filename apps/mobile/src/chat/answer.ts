/**
 * WHAT A RESOLVED QUESTION IS ANSWERED WITH - FR-8 and PR-5.
 *
 * EVERY FIGURE IS THE ENGINE'S. A how-to or a word's meaning is copy from the
 * i18n bundle. A figure is computed here, on every call, by the formula-engine
 * functions the tabs use (`netSales`, `totalExpenses`, `customerCreditFold`,
 * `agedParties`, the store's `primary()` and `expectedCash()`), over the entries
 * this phone holds, and combined with `sum` and `subtract` (ADR-003). Nothing is
 * cached: a conversation keeps what was ASKED, and its answers are worked out
 * again each time the screen draws, so a sale added after a question moves that
 * question's answer too.
 *
 * "TODAY" IS THE SHOP'S BUSINESS DAY - `store.state.day.date` - never a clock.
 * "This week" is Monday to today; "last week" the Monday to Sunday before it.
 * The dates are printed with every answer, so nobody has to guess what a period
 * meant.
 *
 * THE GATE (R5). Free: the how-to and meaning answers, and three figures for
 * today only - sales, expected cash, udhar to collect. Every other figure needs
 * `allows(plan, 'shopChat')`; without it the answer says so in one line and gives
 * the nearest free figure instead. Never a figure the plan does not cover, and
 * never a refusal with nothing in it.
 *
 * NO STOCK, EVER. `noStock` answers, in words, that the app keeps no stock.
 */
import {
  agedParties,
  addDays,
  customerCreditFold,
  netSales,
  parseIsoDate,
  subtract,
  sum,
  toEpochDay,
  totalExpenses,
  type DayInput,
  type DayRecord,
  type Entry,
  type IsoDate,
  type Paise,
} from '@swafto/formula-engine';
import { allows, type Plan } from '../app/plan.ts';
import { dateLine, fill } from '../components/DayParts.tsx';
import { partyEffect, type Store } from '../store/index.ts';
import type { StringKey, Strings } from '../i18n/strings.ts';
import type { IntentId } from './bank.ts';
import type { Period, Resolution } from './match.ts';

export interface AnswerFigure {
  readonly testID: string;
  readonly label: string;
  readonly amount: Paise;
  /** A difference: drawn with its sign. */
  readonly directional?: boolean;
}

export interface Answer {
  /** Sentences. No rupee figure is ever inside one - money goes through `figures`. */
  readonly lines: readonly string[];
  /** Every rupee figure, for `<Row>` and so `<Money>` (ADR-018). */
  readonly figures: readonly AnswerFigure[];
  /** Questions offered next, as taps. */
  readonly chips: readonly Resolution[];
  /** Worked out from the entries: the screen says it covers only what was entered. */
  readonly derived: boolean;
  /** The question needed Premium and this plan does not have it. */
  readonly needsPremium: boolean;
}

const FAQ: ReadonlySet<IntentId> = new Set<IntentId>([
  'howClose',
  'howUdhar',
  'howUpi',
  'howReturn',
  'howAdjust',
  'howCorrect',
  'howLanguage',
  'howDelete',
  'howPrivacy',
  'howPlan',
  'termUdhar',
  'termExpected',
  'termProfit',
  'termWithdrawal',
  'noStock',
]);

/** Asked about today, or about no day in particular - which, for a figure, is today. */
const aboutToday = (p: Period | undefined): boolean => p === undefined || p.kind === 'today';

/** FR-8's free answers. Every other figure is PR-5. */
export function isFree(r: Resolution): boolean {
  if (FAQ.has(r.intent)) return true;
  const { period, mode, partyId } = r.slots;
  if (r.intent === 'sales') return aboutToday(period) && mode === undefined && partyId === undefined;
  if (r.intent === 'expected') return true;
  if (r.intent === 'owed') return partyId === undefined;
  return false;
}

/* ------------------------------------------------------------------ *
 * Periods, against the business day
 * ------------------------------------------------------------------ */

export interface Range {
  readonly from: IsoDate;
  readonly to: IsoDate;
}

/** Monday = 0. Epoch day 0, 1970-01-01, was a Thursday. */
const weekday = (d: IsoDate): number => (((toEpochDay(d) + 3) % 7) + 7) % 7;
const pad = (n: number): string => (n < 10 ? '0' + String(n) : String(n));
const firstOf = (y: number, m: number): IsoDate => `${y}-${pad(m)}-01`;
const lastOf = (y: number, m: number): IsoDate =>
  addDays(m === 12 ? firstOf(y + 1, 1) : firstOf(y, m + 1), -1);

export function rangeOf(p: Period, today: IsoDate, earliest: IsoDate): Range {
  const { y, m } = parseIsoDate(today);
  const monday = addDays(today, -weekday(today));
  switch (p.kind) {
    case 'yesterday':
      return { from: addDays(today, -1), to: addDays(today, -1) };
    case 'thisWeek':
      return { from: monday, to: today };
    case 'lastWeek':
      return { from: addDays(monday, -7), to: addDays(monday, -1) };
    case 'thisMonth':
      return { from: firstOf(y, m), to: today };
    case 'lastMonth':
      return m === 1
        ? { from: firstOf(y - 1, 12), to: lastOf(y - 1, 12) }
        : { from: firstOf(y, m - 1), to: lastOf(y, m - 1) };
    case 'month': {
      const month = p.month ?? m;
      // The most recent one: in October, "March" is this year's and "November" last year's.
      if (month === m) return { from: firstOf(y, m), to: today };
      const year = month < m ? y : y - 1;
      return { from: firstOf(year, month), to: lastOf(year, month) };
    }
    case 'all':
      return { from: earliest < today ? earliest : today, to: today };
    case 'today':
    default:
      return { from: today, to: today };
  }
}

/**
 * THE PERIOD A COMPARISON IS AGAINST. A part-period is set against the same part
 * of the one before - Monday to Thursday against the Monday to Thursday before,
 * the 1st to the 26th against the 1st to the 26th - so a week four days old is
 * never set against a whole one.
 */
export function previousOf(p: Period, r: Range): Range | null {
  switch (p.kind) {
    case 'today':
    case 'yesterday':
      return { from: addDays(r.from, -1), to: addDays(r.to, -1) };
    case 'thisWeek':
    case 'lastWeek':
      return { from: addDays(r.from, -7), to: addDays(r.to, -7) };
    case 'all':
      return null;
    default: {
      const { y, m } = parseIsoDate(r.from);
      const py = m === 1 ? y - 1 : y;
      const pm = m === 1 ? 12 : m - 1;
      const end = addDays(firstOf(py, pm), toEpochDay(r.to) - toEpochDay(r.from));
      const last = lastOf(py, pm);
      return { from: firstOf(py, pm), to: end < last ? end : last };
    }
  }
}

/* ------------------------------------------------------------------ *
 * The ledger this phone holds
 * ------------------------------------------------------------------ */

interface Book {
  readonly today: IsoDate;
  readonly days: readonly DayRecord[];
  readonly entries: readonly Entry[];
}

const bookOf = (store: Store): Book => {
  const st = store.state;
  const days = [...(st.pastDays ?? []), st.day].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  return { today: st.day.date, days, entries: [...(st.pastEntries ?? []), ...st.entries] };
};

const inRange = (d: IsoDate, r: Range): boolean => d >= r.from && d <= r.to;

/**
 * HT-55: NO PERIOD REACHES BACK PAST THE BOOK. `earliest` is the first day this
 * phone holds (the same day the store's `#firstDay` gives the reports). A period
 * starting earlier starts there; one wholly before it is null - the shop did not
 * exist, so there is no record, not a quiet day of ₹0.
 */
export const withinBook = (r: Range, earliest: IsoDate): Range | null =>
  r.to < earliest ? null : r.from < earliest ? { from: earliest, to: r.to } : r;

/** One day's engine input. Net sales and expenses read only the entries. */
const dayInput = (day: DayRecord, entries: readonly Entry[]): DayInput => ({
  day,
  entries,
  priorCreditOutstanding: 0,
  priorSupplierOutstanding: 0,
});

/** Each day in the range that this phone has a record of, with its entries. */
function daysIn(book: Book, r: Range, keep: (e: Entry) => boolean = () => true): DayInput[] {
  const byDay = new Map<IsoDate, Entry[]>();
  for (const e of book.entries) {
    if (!inRange(e.dayId, r) || !keep(e)) continue;
    const list = byDay.get(e.dayId);
    if (list) list.push(e);
    else byDay.set(e.dayId, [e]);
  }
  return book.days.filter((d) => inRange(d.date, r)).map((d) => dayInput(d, byDay.get(d.date) ?? []));
}

const MODE_LINE = {
  cash: 'working.cash_sales',
  upi: 'working.upi_sales',
  udhar: 'working.udhar_sales',
} as const;

/** Net sales of one day as the engine works it out, or one mode's line of that working. */
function salesOf(input: DayInput, mode: keyof typeof MODE_LINE | undefined): Paise {
  const f = netSales(input);
  if (mode === undefined) return f.value;
  return f.working.lines.find((l) => l.key === MODE_LINE[mode])?.amount ?? 0;
}

/* ------------------------------------------------------------------ *
 * Words
 * ------------------------------------------------------------------ */

const k = (key: string): StringKey => key as StringKey;

export function periodWord(p: Period, s: Strings): string {
  return p.kind === 'month' ? s(k('t1.month.' + String(p.month ?? 1))) : s(k('c1.p.' + p.kind));
}

const rangeLine = (r: Range, s: Strings): string =>
  r.from === r.to
    ? fill(s('c1.on'), { date: dateLine(r.from, s) })
    : fill(s('c1.range'), { from: dateLine(r.from, s), to: dateLine(r.to, s) });

const partyOf = (store: Store, id: string | undefined) => store.state.parties.find((p) => p.id === id);

/** "Older than" with no number given: D4's own line between current and old. */
export const OLDER_THAN_DEFAULT = 30;

/** A chip's face, and the "understood as" line: the intent, then each slot it carries. */
export function describe(r: Resolution, store: Store, s: Strings): string {
  const parts = [s(k('c1.i.' + r.intent))];
  if (r.slots.period && !FAQ.has(r.intent)) parts.push(periodWord(r.slots.period, s));
  if (r.slots.mode && (r.intent === 'sales' || r.intent === 'compare')) {
    parts.push(s(k('formA.mode.' + r.slots.mode)));
  }
  const party = partyOf(store, r.slots.partyId);
  if (party && !FAQ.has(r.intent)) parts.push(party.name);
  if (r.intent === 'olderUdhar') parts.push(fill(s('c1.days'), { n: r.slots.days ?? OLDER_THAN_DEFAULT }));
  return parts.join(' · ');
}

/* ------------------------------------------------------------------ *
 * The answers
 * ------------------------------------------------------------------ */

const none = { chips: [], needsPremium: false } as const;

const words = (lines: string[], derived = false): Answer => ({ lines, figures: [], derived, ...none });

/** The three free figures, read exactly as the Today tab reads them. */
function freeFigure(intent: 'sales' | 'expected' | 'owed', store: Store, s: Strings): Answer {
  const p = store.primary();
  const fig =
    intent === 'expected'
      ? { testID: 'c1-fig-expected', label: s('c1.f.expected'), amount: store.expectedCash().value }
      : intent === 'owed'
        ? { testID: 'c1-fig-owed', label: s('c1.f.owed'), amount: p.p7CreditOutstanding.value }
        : { testID: 'c1-fig-sales', label: s('c1.f.salesToday'), amount: p.p4NetSales.value };
  return { lines: [], figures: [fig], derived: true, ...none };
}

/** The nearest free figure to a Premium question. */
const NEAREST_FREE: Readonly<Partial<Record<IntentId, 'sales' | 'owed'>>> = {
  owed: 'owed',
  paid: 'owed',
  olderUdhar: 'owed',
};

export function answer(r: Resolution, store: Store, plan: Plan, s: Strings): Answer {
  if (FAQ.has(r.intent)) return words([s(k('c1.a.' + r.intent))]);

  if (!isFree(r) && !allows(plan, 'shopChat')) {
    const near = freeFigure(NEAREST_FREE[r.intent] ?? 'sales', store, s);
    return { ...near, lines: [s('c1.premium')], needsPremium: true };
  }

  const period = r.slots.period;
  const party = partyOf(store, r.slots.partyId);

  if (r.intent === 'expected' || (r.intent === 'owed' && party === undefined)) {
    const out = freeFigure(r.intent, store, s);
    return { ...out, lines: aboutToday(period) ? [] : [s('c1.note.todayOnly')] };
  }
  if (isFree(r)) return freeFigure('sales', store, s);

  const book = bookOf(store);
  const earliest = (book.days[0] as DayRecord).date;
  // The period asked about, clamped to the book; null is answered by `noRecord`.
  const periodRange = (p: Period): Range | null => withinBook(rangeOf(p, book.today, earliest), earliest);
  const noRecord = (p: Period): Answer =>
    words([fill(s('c1.noDays'), { range: rangeLine(rangeOf(p, book.today, earliest), s) })], true);
  const notUsed = (applies: boolean): string[] =>
    party && !applies ? [fill(s('c1.note.notUsed'), { party: party.name })] : [];
  const another = (others: readonly Period[]): Resolution[] =>
    others
      .filter((o) => o.kind !== period?.kind)
      .slice(0, 1)
      .map((o) => ({ intent: r.intent, slots: { ...r.slots, period: o } }));

  switch (r.intent) {
    case 'sales':
    case 'compare': {
      const p: Period = period ?? { kind: r.intent === 'compare' ? 'thisWeek' : 'today' };
      const range = periodRange(p);
      if (range === null) return noRecord(p);
      const keep = (e: Entry) => party === undefined || e.partyId === party.id;
      const of = (rg: Range): Paise => sum(daysIn(book, rg, keep).map((d) => salesOf(d, r.slots.mode)));
      const label = (word: string): string =>
        r.slots.mode
          ? fill(s('c1.f.salesMode'), { mode: s(k('formA.mode.' + r.slots.mode)), period: word })
          : party
            ? fill(s('c1.f.salesParty'), { party: party.name, period: word })
            : fill(s('c1.f.sales'), { period: word });
      const modeNote = r.slots.mode ? [s('c1.note.beforeReturns')] : [];
      const now = of(range);
      if (r.intent === 'sales') {
        return {
          lines: [rangeLine(range, s), ...modeNote],
          figures: [{ testID: 'c1-fig-sales', label: label(periodWord(p, s)), amount: now }],
          derived: true,
          chips: [
            ...another([{ kind: 'lastWeek' }, { kind: 'lastMonth' }]),
            { intent: 'compare', slots: { ...r.slots, period: p } },
          ],
          needsPremium: false,
        };
      }
      // From the whole period, so "1st to 26th" is still set against the 1st to 26th before.
      const whole = previousOf(p, rangeOf(p, book.today, earliest));
      const prev = whole === null ? null : withinBook(whole, earliest);
      if (prev === null) return words([s('c1.note.noCompare')], true);
      const before = of(prev);
      return {
        lines: [rangeLine(range, s), fill(s('c1.against'), { range: rangeLine(prev, s) }), ...modeNote],
        figures: [
          { testID: 'c1-fig-now', label: label(periodWord(p, s)), amount: now },
          { testID: 'c1-fig-before', label: label(s('c1.p.before')), amount: before },
          {
            testID: 'c1-fig-difference',
            label: s('c1.f.difference'),
            amount: subtract(now, before),
            directional: true,
          },
        ],
        derived: true,
        ...none,
      };
    }

    case 'expenses': {
      const p: Period = period ?? { kind: 'today' };
      const range = periodRange(p);
      if (range === null) return noRecord(p);
      const spent = sum(daysIn(book, range).map((d) => totalExpenses(d).value));
      return {
        lines: [rangeLine(range, s), ...notUsed(false)],
        figures: [
          {
            testID: 'c1-fig-expenses',
            label: fill(s('c1.f.expenses'), { period: periodWord(p, s) }),
            amount: spent,
          },
        ],
        derived: true,
        chips: another([{ kind: 'lastWeek' }, { kind: 'lastMonth' }]),
        needsPremium: false,
      };
    }

    case 'bestDay': {
      const p: Period = period ?? { kind: 'thisMonth' };
      const range = periodRange(p);
      if (range === null) return noRecord(p);
      const days = daysIn(book, range);
      let best: { readonly date: IsoDate; readonly amount: Paise } | null = null;
      for (const d of days) {
        const v = netSales(d).value;
        // Strictly greater: on a tie the earlier day stays, so the answer never flips between runs.
        if (best === null || v > best.amount) best = { date: d.day.date, amount: v };
      }
      if (best === null) return words([fill(s('c1.noDays'), { range: rangeLine(range, s) })], true);
      return {
        lines: [
          rangeLine(range, s),
          fill(s('c1.best'), { date: dateLine(best.date, s) }),
          fill(s('c1.daysLooked'), { n: days.length }),
          ...notUsed(false),
        ],
        figures: [{ testID: 'c1-fig-best', label: s('c1.f.bestDay'), amount: best.amount }],
        derived: true,
        chips: another([{ kind: 'lastMonth' }, { kind: 'thisMonth' }]),
        needsPremium: false,
      };
    }

    case 'olderUdhar': {
      const n = r.slots.days ?? OLDER_THAN_DEFAULT;
      const open = customerCreditFold(book.entries, []).open;
      const aged = agedParties({
        today: book.today,
        trailing: [],
        openSupplierDues: [],
        openCustomerCredit: open,
      }).filter((a) => a.ageDays > n);
      return {
        lines: [fill(s('c1.older'), { n, count: aged.length }), s('c1.note.thisPhone'), ...notUsed(false)],
        figures: [
          { testID: 'c1-fig-older', label: fill(s('c1.f.older'), { n }), amount: sum(aged.map((a) => a.amount)) },
        ],
        derived: true,
        ...none,
      };
    }

    case 'owed': {
      // A named party: the no-party question was answered above as a free figure.
      const who = party as NonNullable<typeof party>;
      const owes = sum(book.entries.filter((e) => e.partyId === who.id).map(partyEffect));
      return {
        lines: [s('c1.note.thisPhone'), ...(aboutToday(period) ? [] : [s('c1.note.todayOnly')])],
        figures: [
          {
            testID: 'c1-fig-party',
            label: fill(s(who.kind === 'customer' ? 'c1.f.customerOwes' : 'c1.f.youOwe'), { party: who.name }),
            amount: owes,
          },
        ],
        derived: true,
        chips: [{ intent: 'paid', slots: { ...r.slots, period: { kind: 'thisMonth' } } }],
        needsPremium: false,
      };
    }

    case 'topItems': {
      // HT-39: from the item lines he typed (PR-2), with their coverage beside them. Never stock.
      const p: Period = period ?? { kind: 'thisMonth' };
      const range = periodRange(p);
      if (range === null) return noRecord(p);
      const rep = store.itemReports(range);
      const top = rep.topByValue.slice(0, 3);
      if (top.length === 0) return words([rangeLine(range, s), s('items.none')], true);
      const nameOf = (id: string | null): string =>
        store.items.find((i) => i.id === id)?.name ?? s('i1.other');
      // A whole percent from basis points, as the item cards print it. A share, not money.
      const pct = rep.coverage.basisPoints === null ? 0 : Math.round(rep.coverage.basisPoints / 100);
      return {
        lines: [rangeLine(range, s), fill(s('items.coverage'), { pct }), ...notUsed(false)],
        figures: top.map((t, j) => ({ testID: 'c1-fig-item-' + String(j), label: nameOf(t.itemId), amount: t.value })),
        derived: true,
        chips: another([{ kind: 'lastMonth' }, { kind: 'thisMonth' }]),
        needsPremium: false,
      };
    }

    case 'forecast': {
      // HT-42: PR-3's seven-day estimate, the one M1 draws, gated on closed days the same way.
      const f = store.premiumReports().forecast;
      if (!f.available) {
        return words(
          [s('m1.forecast.title'), fill(s('r1.gate'), { need: f.requiredClosedDays, have: f.closedDaysSoFar })],
          true,
        );
      }
      const days = f.value.days;
      const first = days[0];
      const last = days[days.length - 1];
      return {
        lines: [...(first && last ? [rangeLine({ from: first.date, to: last.date }, s)] : []), s('c1.forecast.note')],
        figures: [{ testID: 'c1-fig-forecast', label: s('m1.forecast.title'), amount: sum(days.map((d) => d.point)) }],
        derived: true,
        ...none,
      };
    }

    case 'paid':
    default: {
      if (party === undefined) return words([s('c1.needParty')]);
      const p: Period = period ?? { kind: 'all' };
      const range = periodRange(p);
      if (range === null) return noRecord(p);
      const section = party.kind === 'customer' ? 'udhar_collection' : 'party_payment';
      const payments = daysIn(book, range, (e) => e.partyId === party.id && e.section === section).flatMap(
        (d) => d.entries,
      );
      return {
        lines: [rangeLine(range, s), fill(s('c1.payments'), { n: payments.length })],
        figures: [
          {
            testID: 'c1-fig-paid',
            label: fill(s(party.kind === 'customer' ? 'c1.f.paidYou' : 'c1.f.youPaid'), {
              party: party.name,
              period: periodWord(p, s),
            }),
            amount: sum(payments.map((e) => e.amount)),
          },
        ],
        derived: true,
        chips: another([{ kind: 'lastMonth' }, { kind: 'thisMonth' }]),
        needsPremium: false,
      };
    }
  }
}
