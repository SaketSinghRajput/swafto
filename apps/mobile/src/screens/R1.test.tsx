/**
 * R1 REPORTS - the §B.6 bar.
 *
 * THE TWO CLAIMS THIS SCREEN MAKES ABOUT ITSELF ARE THE THINGS WORTH TESTING.
 *
 * FIRST, THAT IT IS HONESTLY EMPTY. "Reports open after you close your first
 * day" is only true if the screen reads the day rather than a flag, so emptiness
 * is driven here by actually closing a day through the real store. The failure
 * this guards is the easy one: a screen that shows four zeroes before anything
 * has been closed, which looks like a working report of a day that went badly.
 *
 * SECOND, THAT NO FIGURE IS STORED. Every figure is asserted to equal the
 * ENGINE'S OWN value rather than one this file re-adds - a test that recomputed
 * the total would be a second implementation of the arithmetic, and would agree
 * with a screen that had cached a stale figure. And the sales line is required
 * to differ from the same shop closed WITHOUT the appended sale, which is the
 * assertion a cached total actually fails.
 */
import { describe, it, expect } from 'vitest';
import { Reports } from './R1.tsx';
import {
  canonicalStore,
  adversarialStore,
  closedStore,
  closedAdversarialStore,
  historyStore,
} from './registry.tsx';
import { fill } from '../components/DayParts.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { formatPaise, formatBasisPoints, type Entry } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import { CANONICAL_DATE } from '@swafto/fixtures';

/** One cash sale, appended through the real store like any other entry. */
const cashSale = (id: string, amount: number): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section: 'cash_sales',
    amount,
    mode: 'cash',
    source: 'manual',
    createdAt: `${CANONICAL_DATE}T20:05:00.000Z`,
  }) as Entry;

/**
 * The canonical shop with its day CLOSED and balanced, closed through the store
 * rather than handed a counted figure.
 *
 * `store.close` refuses a count that differs from expected without a reason, and
 * the expected figure comes from the engine - so this is a balanced close by
 * construction, and no expected figure is written down anywhere in this file.
 */
const closedThroughTheStore = (extra?: Entry) => {
  const store = canonicalStore();
  if (extra) store.append(extra);
  store.close(store.expectedCash().value);
  return store;
};

describe('R1 renders all four states', () => {
  it('loading', () => {
    const tree = render(<Reports store={closedStore()} status="loading" />);
    expect(byTestId(tree, 'r1-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error offers a way back', () => {
    const tree = render(<Reports store={closedStore()} status="error" />);
    expect(byTestId(tree, 'r1-error')).toBeTruthy();
    expect(byTestId(tree, 'r1-retry')).toBeTruthy();
  });

  it('empty: nothing closed yet, so no figures at all rather than four zeroes', () => {
    /*
     * THE STATE MOST USERS SEE FIRST. The canonical day is OPEN and has a full
     * day of entries against it, so a screen that keyed its empty state off the
     * entry count would show a report here - of a day that is not finished.
     */
    const tree = render(<Reports store={canonicalStore()} />);
    expect(byTestId(tree, 'r1-empty')).toBeTruthy();
    expect(text(byTestId(tree, 'r1-empty'))).toBe(phrase('r1.empty', 'en'));
    expect(all(tree).filter((n) => String(n.props?.testID ?? '') === 'r1-figures')).toEqual([]);
  });

  it('loaded: once a day is closed, all four lines and the note are there', () => {
    const tree = render(<Reports store={closedStore()} />);
    expect(byTestId(tree, 'r1-figures')).toBeTruthy();
    for (const id of [
      'r1-days-closed',
      'r1-total-sales',
      'r1-total-expenses',
      'r1-credit-outstanding',
      'r1-note',
    ]) {
      expect(byTestId(tree, id), id).toBeTruthy();
    }
    expect(all(tree).filter((n) => String(n.props?.testID ?? '') === 'r1-empty')).toEqual([]);
  });
});

describe('R1 mutates the store and every figure follows', () => {
  it('a sale appended before the close moves the sales figure the screen shows', () => {
    /*
     * THE ASSERTION A CACHED TOTAL FAILS. Both stores are the canonical day
     * closed balanced; one of them has one extra sale in it. If the screen
     * showed anything but a figure re-derived on read, the two panels would
     * carry the same number.
     */
    const withSale = closedThroughTheStore(cashSale('r1-t1', 150000));
    const without = closedThroughTheStore();

    const a = text(byTestId(render(<Reports store={withSale} />), 'r1-total-sales'));
    const b = text(byTestId(render(<Reports store={without} />), 'r1-total-sales'));
    expect(a).not.toBe(b);
    expect(a).toContain(formatPaise(withSale.primary().p4NetSales.value, { withSign: false }));
  });

  it('closing the day is the mutation that reveals the screen, and the count with it', () => {
    const store = canonicalStore();
    expect(byTestId(render(<Reports store={store} />), 'r1-empty')).toBeTruthy();

    // An entry on an open day changes nothing here: the day is not closed.
    store.append(cashSale('r1-t2', 90000));
    expect(byTestId(render(<Reports store={store} />), 'r1-empty')).toBeTruthy();

    store.close(store.expectedCash().value);
    const tree = render(<Reports store={store} />);
    expect(text(byTestId(tree, 'r1-days-closed-value'))).toBe('1');
    expect(text(byTestId(tree, 'r1-total-sales'))).toContain(
      formatPaise(store.primary().p4NetSales.value, { withSign: false }),
    );
  });

  it('all three money lines are the engine figures, never re-added on the screen', () => {
    const store = closedStore();
    const primary = store.primary();
    const tree = render(<Reports store={store} />);
    // A Row renders its label beside its figure, so `text` is both - the figure
    // is asserted by containment rather than by rebuilding the label here.
    expect(text(byTestId(tree, 'r1-total-sales'))).toContain(
      formatPaise(primary.p4NetSales.value, { withSign: false }),
    );
    expect(text(byTestId(tree, 'r1-total-expenses'))).toContain(
      formatPaise(primary.p6TotalExpenses.value, { withSign: false }),
    );
    expect(text(byTestId(tree, 'r1-credit-outstanding'))).toContain(
      formatPaise(primary.p7CreditOutstanding.value, { withSign: false }),
    );
  });

  it('the days-closed line is a COUNT, and is not rendered as money', () => {
    /*
     * `Money` sets `allowFontScaling` on every figure it draws, because a rupee
     * amount is the one thing in this product that is never capped. Its absence
     * here is what proves this line is a plain count - a day count dressed as
     * money would read as INR 0.01 per closed day.
     */
    const node = byTestId(render(<Reports store={closedStore()} />), 'r1-days-closed-value');
    expect(text(node)).toBe('1');
    expect(node.props?.allowFontScaling).toBeUndefined();
    expect(node.props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });

  it('the screen writes nothing: rendering it leaves the ledger exactly as it was', () => {
    const store = closedStore();
    const entriesBefore = store.state.entries.length;
    const revisionBefore = store.revision;
    render(<Reports store={store} />);
    expect(store.state.entries.length).toBe(entriesBefore);
    expect(store.revision).toBe(revisionBefore);
  });
});

describe('R1 in every language, including the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title, the count label and the note are in that language', () => {
      const tree = render(<Reports store={closedStore()} language={language} />);
      expect(text(byTestId(tree, 'r1-title'))).toBe(phrase('r1.title', language));
      expect(text(byTestId(tree, 'r1-days-closed'))).toContain(phrase('r1.daysClosed', language));
      expect(text(byTestId(tree, 'r1-note'))).toBe(phrase('r1.note', language));
    });

    it(language + ': the empty state says what will fill it, in that language', () => {
      const tree = render(<Reports store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 'r1-empty'))).toBe(phrase('r1.empty', language));
    });
  }

  it('the adversarial shop renders - lakh figures under the longest Odia labels', () => {
    const store = closedAdversarialStore();
    const tree = render(<Reports store={store} language="or" />);
    expect(byTestId(tree, 'r1-figures')).toBeTruthy();
    expect(text(byTestId(tree, 'r1-total-sales'))).toContain(
      formatPaise(store.primary().p4NetSales.value, { withSign: false }),
    );
  });

  it('the adversarial shop with its day still open is empty, like any other', () => {
    const tree = render(<Reports store={adversarialStore()} language="or" />);
    expect(byTestId(tree, 'r1-empty')).toBeTruthy();
  });

  it('longest string mode at the largest type still shows every line', () => {
    const tree = render(
      <Reports store={closedAdversarialStore()} language="longest" display="focus" />,
    );
    for (const id of ['r1-days-closed', 'r1-total-sales', 'r1-total-expenses', 'r1-note']) {
      expect(byTestId(tree, id), id).toBeTruthy();
    }
  });

  it('chrome is capped', () => {
    const tree = render(<Reports store={closedStore()} />);
    expect(byTestId(tree, 'r1-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 'r1-note').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });
});

describe('R1 readings - BI1-BI6 and the two scores (docs/spec/SCORES.md)', () => {
  it('one closed day: every reading shows its gate sentence, with the engine numbers', () => {
    const tree = render(<Reports store={closedStore()} />);
    const gate = (need: number) => fill(phrase('r1.gate', 'en'), { need, have: 1 });
    // Gates from SCORES.md §5: BI1, BI2, BI4, BI6 and both scores at 14; BI3 at 21.
    for (const id of ['r1-bi1', 'r1-bi2', 'r1-bi4', 'r1-bi6', 'r1-cc-match', 'r1-oc-closing']) {
      expect(text(byTestId(tree, id + '-gate')), id).toBe(gate(14));
    }
    expect(text(byTestId(tree, 'r1-bi3-gate'))).toBe(gate(21));
  });

  it('below the gate there is no figure at all - not a zero, not a dash', () => {
    const ids = all(render(<Reports store={closedStore()} />)).map((n) => String(n.props?.testID ?? ''));
    for (const id of ['r1-bi1-earlier', 'r1-bi2-value', 'r1-cc-gap', 'r1-oc-recording', 'r1-bi6-direction']) {
      expect(ids.includes(id), id).toBe(false);
    }
  });

  it('thirty-one closed days: the hand-worked readings', () => {
    /*
     * historyStore: 30 earlier days, short on every sixth (i = 6, 12, 18, 24, 30),
     * plus today closed balanced. The window is the last 30 closed days, which
     * drops i = 30, so four short days remain: 26 of 30 matched exactly. Every
     * section is entered or skipped, every day opened was closed, and nothing is
     * a correction.
     */
    const tree = render(<Reports store={historyStore()} />);
    expect(text(byTestId(tree, 'r1-days-closed-value'))).toBe('31');
    expect(text(byTestId(tree, 'r1-cc-match-value'))).toBe('26 of 30 days');
    expect(text(byTestId(tree, 'r1-bi3-short-value'))).toBe('4 of 30 days');
    expect(text(byTestId(tree, 'r1-oc-closing-value'))).toBe('30 of 30 days');
    expect(text(byTestId(tree, 'r1-oc-recording-value'))).toBe('100.0%');
    expect(text(byTestId(tree, 'r1-oc-corrections-value'))).toBe('0.0%');
  });

  it('every other reading is the engine figure, never one re-derived here', () => {
    const store = historyStore();
    const r = store.reports();
    const tree = render(<Reports store={store} />);
    const bi = r.intelligence;
    if (
      !bi.bi1ProfitTrend.available ||
      !bi.bi2SalesConsistency.available ||
      !bi.bi4WorkingCapitalPressure.available ||
      !bi.bi6CreditConcentration.available ||
      !r.cashConfidence.available
    ) {
      throw new Error('thirty-one closed days should open every gate');
    }
    expect(text(byTestId(tree, 'r1-bi1-later'))).toContain(
      formatPaise(bi.bi1ProfitTrend.value.secondHalfMean, { withSign: false }),
    );
    expect(text(byTestId(tree, 'r1-bi2-value'))).toBe(
      formatBasisPoints(bi.bi2SalesConsistency.value.basisPoints),
    );
    expect(text(byTestId(tree, 'r1-bi4-value'))).toBe(
      formatBasisPoints(bi.bi4WorkingCapitalPressure.value.basisPoints),
    );
    expect(text(byTestId(tree, 'r1-bi6-value'))).toBe(
      formatBasisPoints(bi.bi6CreditConcentration.value.top3Share.basisPoints),
    );
    expect(text(byTestId(tree, 'r1-cc-gap-value'))).toBe(
      formatBasisPoints(r.cashConfidence.value.typicalGapShare.basisPoints),
    );
  });

  it('a reading is a count or a share, so it is never drawn by Money', () => {
    const tree = render(<Reports store={historyStore()} />);
    for (const id of ['r1-cc-match-value', 'r1-cc-gap-value', 'r1-bi2-value', 'r1-oc-closing-value']) {
      expect(byTestId(tree, id).props?.allowFontScaling, id).toBeUndefined();
    }
    // The two BI1 averages ARE money, and go through Money.
    expect(text(byTestId(tree, 'r1-bi1-earlier'))).toContain('₹');
  });

  it('Business Health is a sentence, never a number (BE-07)', () => {
    for (const store of [closedStore(), historyStore()]) {
      const note = text(byTestId(render(<Reports store={store} />), 'r1-bh-note'));
      expect(note).toBe(phrase('r1.bh', 'en'));
      expect(note).not.toMatch(/[0-9]/);
    }
  });

  it('the UPI half is said to be missing rather than shown as matched', () => {
    const tree = render(<Reports store={historyStore()} />);
    expect(text(byTestId(tree, 'r1-cc-not-yet'))).toBe(phrase('r1.cc.notYet', 'en'));
  });

  it('rendering the readings writes nothing', () => {
    const store = historyStore();
    const before = store.revision;
    render(<Reports store={store} />);
    expect(store.revision).toBe(before);
  });

  for (const language of ['hi', 'or'] as readonly Language[]) {
    it(language + ': the gate sentence and the card titles are in that language', () => {
      const tree = render(<Reports store={closedStore()} language={language} />);
      expect(text(byTestId(tree, 'r1-bi3-gate'))).toBe(fill(phrase('r1.gate', language), { need: 21, have: 1 }));
      expect(text(byTestId(tree, 'r1-cc-title'))).toBe(phrase('r1.cc.title', language));
      expect(text(byTestId(tree, 'r1-oc-title'))).toBe(phrase('r1.oc.title', language));
    });
  }
});

describe('R1 accessibility, and it is a tab rather than an entry screen', () => {
  const TREES = () => [
    render(<Reports store={historyStore()} />),
    render(<Reports store={historyStore()} language="or" display="focus" />),
    render(<Reports store={historyStore()} language="longest" display="focus" />),
    render(<Reports store={closedStore()} />),
    render(<Reports store={closedAdversarialStore()} language="or" display="focus" />),
    render(<Reports store={canonicalStore()} language="or" />),
    render(<Reports store={closedStore()} status="error" />),
    render(<Reports store={closedAdversarialStore()} language="longest" display="focus" />),
  ];

  it('every target meets TOUCH_TARGET_MIN_DP', () => {
    for (const tree of TREES()) expect(undersizedTargets(tree)).toEqual([]);
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('no text under the floor, no colour under the minimum', () => {
    for (const tree of TREES()) {
      expect(undersizedText(tree)).toEqual([]);
      expect(failingContrast(tree)).toEqual([]);
    }
  });

  it('nothing is typed here, so no keypad - and the nav is therefore allowed', () => {
    /*
     * §B.6 forbids a keypad BESIDE a bottom navigation. It says nothing about a
     * screen with no keypad, and SPEC-DIGEST C-5 rules that there IS a bottom
     * navigation of three tabs - Today, Parties, Reports - of which this screen
     * is the third. Both halves are asserted separately so neither can drift
     * into the other: no keypad at all, and exactly C-5's three tabs with this
     * one live.
     */
    const tree = render(<Reports store={closedStore()} />);
    // `byTestId` throws on a miss, so absence is asserted over the whole id list.
    const ids = all(tree).map((n) => String(n.props?.testID ?? ''));
    expect(ids.filter((id) => /^keypad/.test(id))).toEqual([]);
    expect(ids.filter((id) => /^bottom-nav-/.test(id))).toEqual([
      'bottom-nav-today',
      'bottom-nav-parties',
      'bottom-nav-reports',
    ]);
    expect(byTestId(tree, 'bottom-nav-reports').props?.accessibilityState?.selected).toBe(true);
  });

  it('the empty state keeps the nav, so the first-day shopkeeper can leave again', () => {
    /*
     * `Shell` replaces CHILDREN with the empty copy and leaves the nav slot
     * alone, which is the half of that behaviour that matters here: a tab whose
     * commonest state had no way out would be a dead end reachable in one tap.
     */
    const tree = render(<Reports store={canonicalStore()} />);
    expect(byTestId(tree, 'r1-empty')).toBeTruthy();
    expect(byTestId(tree, 'bottom-nav-reports')).toBeTruthy();
  });

  it('each tab reports which destination was asked for, and writes nothing', () => {
    const store = closedStore();
    const before = store.revision;
    const chosen: string[] = [];
    const tree = render(<Reports store={store} onSelectTab={(k) => chosen.push(k)} />);
    for (const key of ['today', 'parties', 'reports']) {
      byTestId(tree, 'bottom-nav-' + key).props.onPress();
    }
    expect(chosen).toEqual(['today', 'parties', 'reports']);
    expect(store.revision).toBe(before);
  });

  it('there is no back affordance, because a tab is a destination', () => {
    const ids = all(render(<Reports store={closedStore()} />)).map((n) =>
      String(n.props?.testID ?? ''),
    );
    expect(ids.filter((id) => id === 'r1-back')).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * FR-7 · the free basic reports, on R1
 * ------------------------------------------------------------------ */

const rupees = (p: number) => formatPaise(p, { withSign: false });

describe('R1 free basic reports (FR-7)', () => {
  it('dues by age, both ways, hand-worked from the canonical day', () => {
    /*
     * Customers: Ramesh took 900 and paid 1,200 the same day - cleared, 300 ahead.
     * Sunita took 450 today: 0 days old, bucket 0-30. Suppliers: Wholesale 2,100
     * on udhar today; Dairy was paid 1,500 with nothing owed, so is not listed.
     */
    const tree = render(<Reports store={closedStore()} />);
    expect(text(byTestId(tree, 'r1-dues-bucket-0'))).toContain(rupees(45000));
    expect(text(byTestId(tree, 'r1-dues-bucket-3'))).toContain(rupees(0));
    expect(text(byTestId(tree, 'r1-dues-party-p-sunita'))).toContain(rupees(45000));
    const ids = all(tree).map((n) => String(n.props?.testID ?? ''));
    expect(ids.filter((id) => /^r1-dues-party-/.test(id))).toEqual(['r1-dues-party-p-sunita']);
    expect(text(byTestId(tree, 'r1-owe-bucket-0'))).toContain(rupees(210000));
    expect(ids.filter((id) => /^r1-owe-party-/.test(id))).toEqual(['r1-owe-party-p-wholesale']);
  });

  it('mutates the store: an udhar sale before the close moves the dues card', () => {
    const extra = { ...cashSale('r1-u1', 30000), section: 'udhar_sales', mode: 'udhar', partyId: 'p-sunita' } as Entry;
    const a = text(byTestId(render(<Reports store={closedThroughTheStore(extra)} />), 'r1-dues-bucket-0'));
    expect(a).toContain(rupees(75000)); // 450 + 300
  });

  it('month at a glance: what was taken home sits beside profit, never inside it (D3)', () => {
    /*
     * July: sales 4,820 + 1,310 + 2,640 + 900 + 450 = 10,120. Purchase 3,400 + 2,100
     * = 5,500; expenses 120 + 380 = 500. Profit 10,120 - 5,500 - 500 = 4,120, with
     * the 500 withdrawal NOT taken off. Left in the shop 4,120 - 500 = 3,620.
     */
    const tree = render(<Reports store={closedStore()} />);
    expect(text(byTestId(tree, 'r1-month-net-sales'))).toContain(rupees(1012000));
    expect(text(byTestId(tree, 'r1-month-profit'))).toContain(rupees(412000));
    expect(text(byTestId(tree, 'r1-month-taken-home'))).toContain(rupees(50000));
    expect(text(byTestId(tree, 'r1-month-left'))).toContain(rupees(362000));
    expect(text(byTestId(tree, 'r1-month-closed-value'))).toBe('1');
    // HT-46: the book starts in July, so June is not a month of this shop - no card of zeroes for it.
    expect(all(tree).some((n) => n.props?.testID === 'r1-last-month')).toBe(false);
    // A book that does reach back into June draws it.
    const june = render(<Reports store={historyStore()} />);
    expect(all(june).some((n) => n.props?.testID === 'r1-last-month')).toBe(true);
  });

  it('cash-check history: the latest closed days, newest first, as the engine signs them', () => {
    const tree = render(<Reports store={historyStore()} />);
    const rows = all(tree)
      .map((n) => String(n.props?.testID ?? ''))
      .filter((id) => /^r1-cash-\d{4}-/.test(id));
    expect(rows).toHaveLength(7);
    expect(rows[0]).toBe('r1-cash-' + CANONICAL_DATE);
    // 31 closed days; the latest 30 are today and days -1 to -29. Every sixth earlier
    // day was 100.00 short: -6, -12, -18, -24 fall inside (-30 does not) -> 4 of 30.
    expect(text(byTestId(tree, 'r1-cash-short-value'))).toBe(fill(phrase('r1.ofDays', 'en'), { n: 4, w: 30 }));
  });

  it('UPI confirmed per month comes from the confirmations, not from the UPI sales', () => {
    // Nothing was ticked on the canonical day, so 0 confirmed of the 1 UPI receipt.
    const tree = render(<Reports store={closedStore()} />);
    expect(text(byTestId(tree, 'r1-upi-0'))).toContain(rupees(0));
    expect(text(byTestId(tree, 'r1-upi-0-count-value'))).toBe(fill(phrase('rep.upi.receipts', 'en'), { n: 0, w: 1 }));
  });

  it('the dashboard row is drawn only when there is somewhere to go, and goes there', () => {
    const none = all(render(<Reports store={closedStore()} />)).map((n) => String(n.props?.testID ?? ''));
    expect(none.filter((id) => id === 'r1-dashboard')).toEqual([]);
    let opened = 0;
    const tree = render(<Reports store={closedStore()} onOpenDashboard={() => (opened += 1)} />);
    byTestId(tree, 'r1-dashboard').props.onPress();
    expect(opened).toBe(1);
  });

  it('every new card is in the language asked for', () => {
    for (const language of ['en', 'hi', 'or'] as const) {
      const tree = render(<Reports store={closedStore()} language={language} />);
      expect(text(byTestId(tree, 'r1-dues-title'))).toBe(phrase('rep.dues.title', language));
      expect(text(byTestId(tree, 'r1-month-title'))).toBe(phrase('rep.month.this', language));
      expect(text(byTestId(tree, 'r1-cash-title'))).toBe(phrase('rep.cash.title', language));
    }
  });
});
