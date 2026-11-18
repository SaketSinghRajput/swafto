/**
 * ANSWER VALUES AGAINST A SHOP WORKED BY HAND.
 *
 * Six days of a small shop, every expected figure computed on paper in the
 * comments below and written as a literal - never by calling the engine, which
 * would make the test a second copy of the arithmetic it is checking. Today is
 * Thursday 2026-10-15; this week is Monday 12 to today; last week is 5 to 11.
 *
 *   day         cash   upi   udhar sale        other
 *   2026-09-10  1000         Ramesh 500
 *   2026-09-25  2000   300                     Ramesh pays 200 (cash)
 *   2026-10-05  1500   700   Sunita 400        expense 100
 *   2026-10-09   800   200                     pay Gupta 1000; Ramesh pays 100 (UPI)
 *   2026-10-13  1200   500                     expense 50
 *   2026-10-15   600   450   Ramesh 250        expense 30     <- today, open
 */
import { describe as group, it, expect } from 'vitest';
import type { DayRecord, Entry } from '@swafto/formula-engine';
import { Store, memoryPort } from '../store/index.ts';
import { strings, phrase } from '../i18n/strings.ts';
import { answer, describe, isFree, previousOf, rangeOf } from './answer.ts';
import type { Resolution } from './match.ts';

const rs = (r: number) => r * 100; // a literal rupee figure into paise, for the fixture only

let n = 0;
const e = (dayId: string, section: Entry['section'], rupees: number, mode: Entry['mode'], partyId?: string): Entry =>
  ({
    id: 'a' + String((n += 1)),
    dayId,
    section,
    amount: rs(rupees),
    mode,
    ...(partyId ? { partyId } : {}),
    source: 'manual',
    createdAt: dayId + 'T18:00:00.000Z',
  }) as Entry;

const closed = (date: string): DayRecord => ({
  date,
  state: 'closed',
  openingCash: rs(5000),
  countedCash: rs(5000),
  skippedSections: [],
  closedAt: date + 'T21:00:00.000Z',
});

const TODAY = '2026-10-15';

export const handShop = (): Store => {
  const past: Entry[] = [
    e('2026-09-10', 'cash_sales', 1000, 'cash'),
    e('2026-09-10', 'udhar_sales', 500, 'udhar', 'p-ramesh'),
    e('2026-09-25', 'cash_sales', 2000, 'cash'),
    e('2026-09-25', 'upi_sales', 300, 'upi'),
    e('2026-09-25', 'udhar_collection', 200, 'cash', 'p-ramesh'),
    e('2026-10-05', 'cash_sales', 1500, 'cash'),
    e('2026-10-05', 'upi_sales', 700, 'upi'),
    e('2026-10-05', 'udhar_sales', 400, 'udhar', 'p-sunita'),
    e('2026-10-05', 'expense', 100, 'cash'),
    e('2026-10-09', 'cash_sales', 800, 'cash'),
    e('2026-10-09', 'upi_sales', 200, 'upi'),
    e('2026-10-09', 'party_payment', 1000, 'cash', 'p-gupta'),
    e('2026-10-09', 'udhar_collection', 100, 'upi', 'p-ramesh'),
    e('2026-10-13', 'cash_sales', 1200, 'cash'),
    e('2026-10-13', 'upi_sales', 500, 'upi'),
    e('2026-10-13', 'expense', 50, 'cash'),
  ];
  const today: Entry[] = [
    e(TODAY, 'cash_sales', 600, 'cash'),
    e(TODAY, 'upi_sales', 450, 'upi'),
    e(TODAY, 'udhar_sales', 250, 'udhar', 'p-ramesh'),
    e(TODAY, 'expense', 30, 'cash'),
  ];
  return new Store(
    memoryPort({
      shopId: 'shop-hand',
      day: { date: TODAY, state: 'open', openingCash: rs(5000), countedCash: null, skippedSections: [] },
      entries: today,
      parties: [
        { id: 'p-ramesh', kind: 'customer', name: 'Ramesh' },
        { id: 'p-sunita', kind: 'customer', name: 'Sunita Devi' },
        { id: 'p-gupta', kind: 'supplier', name: 'Gupta Wholesale' },
      ],
      // Ramesh 300 - 100 = 200 and Sunita 400 were open at the start of today.
      priorCreditOutstanding: rs(600),
      priorSupplierOutstanding: 0,
      skippedSections: [],
      pastDays: ['2026-09-10', '2026-09-25', '2026-10-05', '2026-10-09', '2026-10-13'].map(closed),
      pastEntries: past,
    }),
  );
};

const s = strings('en');
const premium = (r: Resolution) => answer(r, handShop(), 'premium', s);
const free = (r: Resolution) => answer(r, handShop(), 'free', s);
const fig = (r: Resolution, plan: 'free' | 'premium' = 'premium') =>
  (plan === 'premium' ? premium(r) : free(r)).figures.map((f) => f.amount);

group('periods, against the business day and never a clock', () => {
  const earliest = '2026-09-10';
  it('this week is Monday to today; last week the Monday to Sunday before', () => {
    expect(rangeOf({ kind: 'thisWeek' }, TODAY, earliest)).toEqual({ from: '2026-10-12', to: TODAY });
    expect(rangeOf({ kind: 'lastWeek' }, TODAY, earliest)).toEqual({ from: '2026-10-05', to: '2026-10-11' });
    // A Monday is the first day of its own week.
    expect(rangeOf({ kind: 'thisWeek' }, '2026-10-12', earliest)).toEqual({ from: '2026-10-12', to: '2026-10-12' });
    // A Sunday is the last day of it.
    expect(rangeOf({ kind: 'thisWeek' }, '2026-10-18', earliest)).toEqual({ from: '2026-10-12', to: '2026-10-18' });
  });

  it('months: this one so far, the last one whole, and a named one at its most recent', () => {
    expect(rangeOf({ kind: 'thisMonth' }, TODAY, earliest)).toEqual({ from: '2026-10-01', to: TODAY });
    expect(rangeOf({ kind: 'lastMonth' }, TODAY, earliest)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(rangeOf({ kind: 'lastMonth' }, '2026-01-20', earliest)).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(rangeOf({ kind: 'month', month: 2 }, TODAY, earliest)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(rangeOf({ kind: 'month', month: 11 }, TODAY, earliest)).toEqual({ from: '2025-11-01', to: '2025-11-30' });
    expect(rangeOf({ kind: 'month', month: 10 }, TODAY, earliest)).toEqual({ from: '2026-10-01', to: TODAY });
    expect(rangeOf({ kind: 'yesterday' }, '2026-03-01', earliest)).toEqual({ from: '2026-02-28', to: '2026-02-28' });
    expect(rangeOf({ kind: 'all' }, TODAY, earliest)).toEqual({ from: earliest, to: TODAY });
  });

  it('a comparison is against the same part of the period before', () => {
    expect(previousOf({ kind: 'thisWeek' }, { from: '2026-10-12', to: TODAY })).toEqual({
      from: '2026-10-05',
      to: '2026-10-08',
    });
    expect(previousOf({ kind: 'thisMonth' }, { from: '2026-10-01', to: TODAY })).toEqual({
      from: '2026-09-01',
      to: '2026-09-15',
    });
    // The 31st against a February: the shorter month ends where it ends.
    expect(previousOf({ kind: 'thisMonth' }, { from: '2026-03-01', to: '2026-03-31' })).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
    expect(previousOf({ kind: 'lastMonth' }, { from: '2026-01-01', to: '2026-01-31' })).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
    expect(previousOf({ kind: 'today' }, { from: TODAY, to: TODAY })).toEqual({ from: '2026-10-14', to: '2026-10-14' });
    expect(previousOf({ kind: 'all' }, { from: '2026-09-10', to: TODAY })).toBeNull();
  });
});

group('premium answers, each the hand-worked figure', () => {
  it('sales: today 600+450+250; this week 1700+1300; last week 2600+1000', () => {
    expect(fig({ intent: 'sales', slots: { period: { kind: 'today' } } })).toEqual([rs(1300)]);
    expect(fig({ intent: 'sales', slots: { period: { kind: 'thisWeek' } } })).toEqual([rs(3000)]);
    expect(fig({ intent: 'sales', slots: { period: { kind: 'lastWeek' } } })).toEqual([rs(3600)]);
    expect(fig({ intent: 'sales', slots: { period: { kind: 'thisMonth' } } })).toEqual([rs(6600)]);
    // September: 1000 + 500 udhar + 2000 + 300.
    expect(fig({ intent: 'sales', slots: { period: { kind: 'lastMonth' } } })).toEqual([rs(3800)]);
    expect(fig({ intent: 'sales', slots: { period: { kind: 'month', month: 9 } } })).toEqual([rs(3800)]);
  });

  it('sales by payment mode: UPI this week 500+450, last week 700+200; cash last month 3000', () => {
    expect(fig({ intent: 'sales', slots: { period: { kind: 'thisWeek' }, mode: 'upi' } })).toEqual([rs(950)]);
    expect(fig({ intent: 'sales', slots: { period: { kind: 'lastWeek' }, mode: 'upi' } })).toEqual([rs(900)]);
    expect(fig({ intent: 'sales', slots: { period: { kind: 'lastMonth' }, mode: 'cash' } })).toEqual([rs(3000)]);
    // October's udhar sales: Sunita 400 and Ramesh 250.
    expect(fig({ intent: 'sales', slots: { period: { kind: 'thisMonth' }, mode: 'udhar' } })).toEqual([rs(650)]);
    expect(premium({ intent: 'sales', slots: { mode: 'upi' } }).lines).toContain(phrase('c1.note.beforeReturns', 'en'));
  });

  it('sales to one party: Ramesh took 500 in September and 250 today', () => {
    expect(fig({ intent: 'sales', slots: { period: { kind: 'all' }, partyId: 'p-ramesh' } })).toEqual([rs(750)]);
  });

  it('compare: this week 3000 against Monday-Thursday last week 2600; this month 6600 against 1-15 Sep 1500', () => {
    expect(fig({ intent: 'compare', slots: { period: { kind: 'thisWeek' } } })).toEqual([rs(3000), rs(2600), rs(400)]);
    expect(fig({ intent: 'compare', slots: { period: { kind: 'thisMonth' } } })).toEqual([rs(6600), rs(1500), rs(5100)]);
    // Last week 3600 against the week before (28 Sep - 4 Oct), which has nothing: the whole figure.
    expect(fig({ intent: 'compare', slots: { period: { kind: 'lastWeek' } } })).toEqual([rs(3600), 0, rs(3600)]);
    expect(premium({ intent: 'compare', slots: {} }).figures[2]?.directional).toBe(true);
  });

  it('a fall is a negative difference, not a smaller positive one', () => {
    // Yesterday, the 14th, has no record: 0 against the 13th's 1700.
    expect(fig({ intent: 'compare', slots: { period: { kind: 'yesterday' } } })).toEqual([0, rs(1700), -rs(1700)]);
  });

  it('expenses: this week 50+30; last week 100', () => {
    expect(fig({ intent: 'expenses', slots: { period: { kind: 'thisWeek' } } })).toEqual([rs(80)]);
    expect(fig({ intent: 'expenses', slots: { period: { kind: 'lastWeek' } } })).toEqual([rs(100)]);
  });

  it('best day: 5 Oct this month at 2600 of four days; 25 Sep last month at 2300', () => {
    const a = premium({ intent: 'bestDay', slots: { period: { kind: 'thisMonth' } } });
    expect(a.figures.map((f) => f.amount)).toEqual([rs(2600)]);
    expect(a.lines.join(' ')).toContain('Monday 5 October');
    expect(a.lines).toContain('4 days looked at.');
    expect(fig({ intent: 'bestDay', slots: { period: { kind: 'lastMonth' } } })).toEqual([rs(2300)]);
  });

  it('best day in a period with no records says so rather than drawing a zero', () => {
    const a = premium({ intent: 'bestDay', slots: { period: { kind: 'month', month: 8 } } });
    expect(a.figures).toEqual([]);
    expect(a.lines[0]).toContain('Nothing is recorded on this phone');
  });

  it('payments: Ramesh paid 100 this month, 200 last month, 300 in all over two payments', () => {
    expect(fig({ intent: 'paid', slots: { partyId: 'p-ramesh', period: { kind: 'thisMonth' } } })).toEqual([rs(100)]);
    expect(fig({ intent: 'paid', slots: { partyId: 'p-ramesh', period: { kind: 'lastMonth' } } })).toEqual([rs(200)]);
    const all = premium({ intent: 'paid', slots: { partyId: 'p-ramesh' } });
    expect(all.figures.map((f) => f.amount)).toEqual([rs(300)]);
    expect(all.lines).toContain('2 payments.');
    // A supplier: what WE paid Gupta, last week.
    const gupta = premium({ intent: 'paid', slots: { partyId: 'p-gupta', period: { kind: 'lastWeek' } } });
    expect(gupta.figures.map((f) => f.amount)).toEqual([rs(1000)]);
    expect(gupta.figures[0]?.label).toBe('You paid Gupta Wholesale, last week');
  });

  it('payments with no party named asks for one, and shows no figure', () => {
    const a = premium({ intent: 'paid', slots: {} });
    expect(a.figures).toEqual([]);
    expect(a.lines).toEqual([phrase('c1.needParty', 'en')]);
  });

  it('what one party owes: Ramesh 500 - 200 - 100 + 250', () => {
    const a = premium({ intent: 'owed', slots: { partyId: 'p-ramesh' } });
    expect(a.figures.map((f) => f.amount)).toEqual([rs(450)]);
    expect(a.figures[0]?.label).toBe('Ramesh owes you');
    expect(a.lines).toContain(phrase('c1.note.thisPhone', 'en'));
  });

  it('old udhar: Ramesh, open since 10 Sep, is 35 days old; Sunita 10', () => {
    const over30 = premium({ intent: 'olderUdhar', slots: {} });
    expect(over30.figures.map((f) => f.amount)).toEqual([rs(450)]);
    // HT-46: this used to assert '1 customers have', which enshrined the plural defect.
    expect(over30.lines[0]).toBe('1 customer has udhar unpaid for over 30 days.');
    expect(fig({ intent: 'olderUdhar', slots: { days: 60 } })).toEqual([0]);
    expect(fig({ intent: 'olderUdhar', slots: { days: 7 } })).toEqual([rs(850)]);
    // 35 days exactly is not "over 35".
    expect(fig({ intent: 'olderUdhar', slots: { days: 35 } })).toEqual([0]);
    expect(fig({ intent: 'olderUdhar', slots: { days: 34 } })).toEqual([rs(450)]);
  });
});

group('the free plan (FR-8): three figures for today, and an honest line for the rest', () => {
  it("today's sales, expected cash and udhar to collect are free - read as the Today tab reads them", () => {
    expect(fig({ intent: 'sales', slots: {} }, 'free')).toEqual([rs(1300)]);
    // Opening 5000 + cash sales 600 - cash expense 30.
    expect(fig({ intent: 'expected', slots: {} }, 'free')).toEqual([rs(5570)]);
    // Prior 600 + today's udhar 250.
    expect(fig({ intent: 'owed', slots: {} }, 'free')).toEqual([rs(850)]);
    for (const intent of ['sales', 'expected', 'owed'] as const) {
      const a = free({ intent, slots: {} });
      expect(a.needsPremium, intent).toBe(false);
      expect(a.derived, intent).toBe(true);
    }
  });

  it('a Premium question says it needs Premium in one line, then gives the nearest free figure', () => {
    const week = free({ intent: 'sales', slots: { period: { kind: 'lastWeek' } } });
    expect(week.needsPremium).toBe(true);
    expect(week.lines).toEqual([phrase('c1.premium', 'en')]);
    expect(week.figures.map((f) => f.amount)).toEqual([rs(1300)]);
    expect(week.figures[0]?.label).toBe('Sales today');

    const paid = free({ intent: 'paid', slots: { partyId: 'p-ramesh' } });
    expect(paid.needsPremium).toBe(true);
    expect(paid.figures.map((f) => f.amount)).toEqual([rs(850)]);

    for (const r of [
      { intent: 'sales', slots: { mode: 'upi' } },
      { intent: 'sales', slots: { partyId: 'p-ramesh' } },
      { intent: 'owed', slots: { partyId: 'p-ramesh' } },
      { intent: 'bestDay', slots: {} },
      { intent: 'olderUdhar', slots: {} },
      { intent: 'compare', slots: {} },
      { intent: 'expenses', slots: {} },
    ] as const satisfies readonly Resolution[]) {
      expect(isFree(r), r.intent).toBe(false);
      const a = free(r);
      expect(a.needsPremium, r.intent).toBe(true);
      expect(a.figures).toHaveLength(1);
    }
  });

  it('how-to and meaning answers are words, free, and claim no figure', () => {
    for (const intent of ['howClose', 'howUdhar', 'termExpected', 'termWithdrawal', 'howPlan'] as const) {
      const a = free({ intent, slots: {} });
      expect(a.figures).toEqual([]);
      expect(a.derived).toBe(false);
      expect(a.lines).toEqual([phrase(`c1.a.${intent}`, 'en')]);
    }
  });

  it('no stock answer is ever a figure - only the statement that stock is not kept', () => {
    for (const plan of ['free', 'premium'] as const) {
      const a = answer({ intent: 'noStock', slots: {} }, handShop(), plan, s);
      expect(a.figures).toEqual([]);
      expect(a.lines).toEqual([phrase('c1.a.noStock', 'en')]);
      expect(a.lines.join(' ')).not.toMatch(/[0-9]/);
    }
  });

  it('expected cash for another day is not invented - it says the figure is for now', () => {
    const a = free({ intent: 'expected', slots: { period: { kind: 'lastWeek' } } });
    expect(a.figures.map((f) => f.amount)).toEqual([rs(5570)]);
    expect(a.lines).toEqual([phrase('c1.note.todayOnly', 'en')]);
  });
});

group('human-tester pass 6: top items and the forecast (HT-39, HT-42)', () => {
  /** Today's 600 cash sale, with Rice 200 and Dal 100 typed against it. */
  const itemShop = (): Store => {
    const store = handShop();
    const sale = store.state.entries.find((x) => x.section === 'cash_sales') as Entry;
    const at = TODAY + 'T18:30:00.000Z';
    store.addItem({ id: 'i-rice', name: 'Rice', createdAt: at });
    store.addItem({ id: 'i-dal', name: 'Dal', createdAt: at });
    store.addItemLine({ id: 'l1', dayId: TODAY, entryId: sale.id, itemId: 'i-rice', quantity: 2, amount: rs(200), createdAt: at });
    store.addItemLine({ id: 'l2', dayId: TODAY, entryId: sale.id, itemId: 'i-dal', quantity: 1, amount: rs(100), createdAt: at });
    return store;
  };

  it('free: both say they need Premium, with the nearest free figure', () => {
    for (const intent of ['topItems', 'forecast'] as const) {
      const a = answer({ intent, slots: {} }, itemShop(), 'free', s);
      expect(a.needsPremium, intent).toBe(true);
      expect(a.lines, intent).toEqual([phrase('c1.premium', 'en')]);
    }
  });

  it('premium: top items by value from the item lines - Rice 200, then Dal 100', () => {
    const a = answer({ intent: 'topItems', slots: {} }, itemShop(), 'premium', s);
    expect(a.figures.map((f) => [f.label, f.amount])).toEqual([
      ['Rice', rs(200)],
      ['Dal', rs(100)],
    ]);
    // 300 itemised of October's 6,600 in sales: 4.5%, printed whole as 5.
    expect(a.lines[1]).toBe(phrase('items.coverage', 'en').replace('{pct}', '5'));
    // No item lines in the period: says so, and gives no figure.
    const none = answer({ intent: 'topItems', slots: { period: { kind: 'lastMonth' } } }, itemShop(), 'premium', s);
    expect(none.figures).toEqual([]);
    expect(none.lines[1]).toBe(phrase('items.none', 'en'));
  });

  it('premium: the forecast states its gate - 14 closed days, 5 so far', () => {
    const a = answer({ intent: 'forecast', slots: {} }, itemShop(), 'premium', s);
    expect(a.figures).toEqual([]);
    expect(a.lines).toEqual([phrase('m1.forecast.title', 'en'), 'After 14 closed days, 5 so far']);
  });
});

group('every figure is worked out on the call, from the store', () => {
  it('a sale appended after the question moves the answer to it', () => {
    const store = handShop();
    const r: Resolution = { intent: 'sales', slots: { period: { kind: 'thisWeek' } } };
    const before = answer(r, store, 'premium', s).figures[0]?.amount;
    store.append(e(TODAY, 'cash_sales', 70, 'cash'));
    expect(before).toBe(rs(3000));
    expect(answer(r, store, 'premium', s).figures[0]?.amount).toBe(rs(3070));
  });

  it('answering writes nothing', () => {
    const store = handShop();
    const rev = store.revision;
    answer({ intent: 'compare', slots: {} }, store, 'premium', s);
    answer({ intent: 'olderUdhar', slots: {} }, store, 'premium', s);
    expect(store.revision).toBe(rev);
  });

  it('follow-up chips are Premium questions: another period, and a comparison', () => {
    const a = premium({ intent: 'sales', slots: { period: { kind: 'thisWeek' } } });
    expect(a.chips).toEqual([
      { intent: 'sales', slots: { period: { kind: 'lastWeek' } } },
      { intent: 'compare', slots: { period: { kind: 'thisWeek' } } },
    ]);
  });
});

group('words: the chip face and the "understood as" line', () => {
  it('names the intent, then each slot it carries', () => {
    const store = handShop();
    expect(describe({ intent: 'sales', slots: { period: { kind: 'lastWeek' }, mode: 'upi' } }, store, s)).toBe(
      'Sales · last week · UPI',
    );
    expect(
      describe({ intent: 'paid', slots: { partyId: 'p-ramesh', period: { kind: 'month', month: 9 } } }, store, s),
    ).toBe('Payments · September · Ramesh');
    expect(describe({ intent: 'olderUdhar', slots: { days: 45 } }, store, s)).toBe('Old udhar · over 45 days');
    expect(describe({ intent: 'howClose', slots: { period: { kind: 'today' } } }, store, s)).toBe(
      'How to close the day',
    );
  });

  it('in Odia and Hindi too, from the bundle (DRAFT, H13)', () => {
    const store = handShop();
    const r: Resolution = { intent: 'sales', slots: { period: { kind: 'thisMonth' } } };
    expect(describe(r, store, strings('or'))).toBe(phrase('c1.i.sales', 'or') + ' · ' + phrase('c1.p.thisMonth', 'or'));
    expect(describe(r, store, strings('hi'))).toBe(phrase('c1.i.sales', 'hi') + ' · ' + phrase('c1.p.thisMonth', 'hi'));
  });
});

/*
 * BETA: these tests cover the Free/Premium gate as it will stand after beta,
 * so the all-free beta switch is off for this file and restored after it.
 */
import { beforeAll as betaOff, afterAll as betaOn } from 'vitest';
import { BETA } from '../app/plan.ts';
betaOff(() => {
  BETA.allFree = false;
});
betaOn(() => {
  BETA.allFree = true;
});
