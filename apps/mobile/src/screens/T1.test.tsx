/**
 * T1 TODAY - the §B.6 bar.
 *
 * The cross-screen instruments in `screens.spec.tsx` already cover contrast,
 * touch target, text size, translations and numerals for every case in the
 * registry, T1 included. This file covers what is true of THIS screen and of no
 * other: what its figures mean, and what must not be on it.
 *
 * REWRITTEN 2026-10-25 WITH THE SCREEN. T1 was rebuilt to the reference picture
 * (docs/design-reference/comfort/T1.png), which has no hero figure in the bar,
 * no section rows and no profit line - it has six derived figures, a progress
 * ring and the rails. The assertions that pointed at the old headline and rows
 * now point at the figures that replaced them, at the same strength: each is
 * compared with the engine's own output, and each is shown to move when the
 * store moves.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Today } from './T1.tsx';
import { canonicalStore, adversarialStore, emptyStore } from './registry.tsx';
import { render, all, byTestId, byType, text, type Node } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { timings, reduceMotionListeners, fontScale } from '../../test/ui-double.tsx';
import { CANONICAL_DATE } from '@swafto/fixtures';
import { addDays, dayProgress, formatPaise, subtract, sum, type Entry } from '@swafto/formula-engine';
import { Store, memoryPort, DEFAULT_CLOSES_AT } from '../store/index.ts';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import { tokens } from '../theme/tokens.ts';
import { ACT_SECTIONS } from './actSections.ts';

const cashSale = (id: string, amountPaise: number): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section: 'cash_sales',
    amount: amountPaise,
    mode: 'cash',
    source: 'manual',
    createdAt: CANONICAL_DATE + 'T19:30:00.000Z',
  }) as Entry;

const cashPurchase = (id: string, amountPaise: number): Entry =>
  ({ ...cashSale(id, amountPaise), section: 'purchase' }) as Entry;

const ALL_SECTIONS = [
  'cash_sales',
  'upi_sales',
  'udhar_sales',
  'purchase',
  'expense',
  'udhar_collection',
  'party_payment',
  'withdrawal',
] as const;

const figure = (tree: ReturnType<typeof render>, id: string) => text(byTestId(tree, 't1-' + id));
const has = (tree: ReturnType<typeof render>, id: string) =>
  all(tree).some((n) => n.props?.testID === id);

const actButtons = (tree: ReturnType<typeof render>) =>
  all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('t1-act-'));

/** The engine's progress, with its step count under a name the money lint does not read as money. */
const progress = (store: ReturnType<typeof canonicalStore>) => {
  const { done, total: steps } = dayProgress(store.input);
  return { done, steps };
};

/* ---- S-020-STATES · all four states --------------------------------- */
describe('T1 renders all four states, and empty is derived from the entries', () => {
  it('loading: an indicator, and no figure pretending to be zero', () => {
    const tree = render(<Today store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 't1-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
    expect(text(tree)).not.toContain('₹');
  });

  it('error: says nothing was lost, and offers a way back', () => {
    const tree = render(<Today store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 't1-error')).toBeTruthy();
    expect(byTestId(tree, 't1-retry')).toBeTruthy();
    expect(text(tree)).toContain('lost');
  });

  it('empty: the first morning shows the note, and no figure pretending to be a sale', () => {
    const tree = render(<Today store={emptyStore()} />);
    expect(text(byTestId(tree, 't1-empty'))).toBe(phrase('t1.empty', 'en'));
    // USABILITY item 3: a zero is said in words, never drawn as "₹0.00" of sales.
    expect(has(tree, 't1-net-sales')).toBe(false);
    expect(text(byTestId(tree, 't1-no-sales'))).toBe(phrase('box.noSales', 'en'));
  });

  it('loaded: the one hero, its working, the sales line and the party totals, and no empty note', () => {
    const tree = render(<Today store={canonicalStore()} />);
    expect(has(tree, 't1-box')).toBe(true);
    expect(has(tree, 't1-empty')).toBe(false);
    for (const id of ['expected', 'box-opening', 'box-in', 'box-out', 'net-sales', 'to-collect', 'owed']) {
      expect(has(tree, 't1-' + id), id).toBe(true);
    }
    // ONE hero: the six equal tiles are gone (USABILITY item 3).
    expect(has(tree, 't1-figures')).toBe(false);
    expect(text(byTestId(tree, 't1-box-title'))).toBe(phrase('box.title', 'en'));
  });

  it('the empty state is derived, not declared - same status, different data', () => {
    const withData = render(<Today store={canonicalStore()} status="ready" />);
    const without = render(<Today store={emptyStore()} status="ready" />);
    expect(has(without, 't1-empty')).toBe(true);
    expect(has(withData, 't1-empty')).toBe(false);
  });
});

/* ---- HB-01 · the ACT zone, reachable on an empty morning ------------- */
describe('Today offers a way to record the first sale of the day', () => {
  /*
   * THE DEFECT THIS PINS. `Shell` swaps `children` for the empty-state copy,
   * and on the first morning the screen once said "Start with a sale" and
   * offered no way to enter one. T1 no longer hands its body to Shell's empty
   * state at all - it draws its own note - so the rails are in the body in
   * every state; these tests are what hold that.
   */
  it('on an empty day there is at least one route to an entry form', () => {
    const tree = render(<Today store={emptyStore()} />);
    expect(byTestId(tree, 't1-empty')).toBeTruthy();
    expect(
      actButtons(tree).length,
      'the empty state names "start with a sale" and must offer it',
    ).toBeGreaterThan(0);
  });

  it('every ACT button reports its section, and writes nothing itself', () => {
    const store = emptyStore();
    const opened: string[] = [];
    const before = store.state.entries.length;
    const tree = render(<Today store={store} onOpenSection={(x) => opened.push(x)} />);

    for (const node of actButtons(tree)) node.props.onPress();

    expect(opened).toContain('cash_sales');
    expect(opened.length).toBe(actButtons(tree).length);
    expect(new Set(opened).size).toBe(opened.length); // no section offered twice
    expect(store.state.entries.length).toBe(before);
  });

  it('the ACT zone is present in every loaded state - empty, canonical and adversarial', () => {
    for (const store of [emptyStore(), canonicalStore(), adversarialStore()]) {
      expect(actButtons(render(<Today store={store} />)).length).toBe(ACT_SECTIONS.length);
    }
  });

  it('withdrawal is not an ACT button - taking money out is not a counter action', () => {
    const ids = actButtons(render(<Today store={canonicalStore()} />)).map((n) =>
      String(n.props.testID),
    );
    expect(ids).not.toContain('t1-act-withdrawal');
  });

  it('every ACT button is a real target and clears the registry floor', () => {
    const tree = render(<Today store={emptyStore()} />);
    expect(undersizedTargets(tree)).toEqual([]);
    expect(undersizedText(tree)).toEqual([]);
    expect(failingContrast(tree)).toEqual([]);
  });

  it('the ACT zone is still not the navigation, and the two stay apart', () => {
    const tree = render(<Today store={emptyStore()} />);
    const ids = all(tree).map((n) => String(n.props?.testID ?? ''));

    const act = ids.filter((id) => /^t1-act-/.test(id));
    const tabs = ids.filter((id) => /^bottom-nav-/.test(id));
    expect(act).toHaveLength(ACT_SECTIONS.length);
    expect(tabs).toHaveLength(3);
    expect(act.filter((id) => tabs.includes(id))).toEqual([]);
    expect(act.filter((id) => /nav|tabbar|tab-bar|bottom-bar/i.test(id))).toEqual([]);
  });
});

/* ---- S-020-WIRED · every figure traced to the engine ----------------- */
describe('every figure on T1 is wired to the engine through the real store', () => {
  it('every figure is the engine output, asked for on render', () => {
    const store = canonicalStore();
    const p = store.primary();
    const tree = render(<Today store={store} />);
    // The working: cash in is P1 with its sign; cash out is P2, drawn as an outflow.
    expect(figure(tree, 'box-in-amount')).toBe(
      formatPaise(p.p1TotalCashReceived.value, { withSign: true }),
    );
    expect(figure(tree, 'box-out-amount')).toBe(
      formatPaise(subtract(0, p.p2TotalCashPaid.value), { withSign: true }),
    );
    expect(figure(tree, 'box-opening-amount')).toBe(
      formatPaise(store.state.day.openingCash as number, { withSign: false }),
    );
    // The hero is P3, in the box now.
    expect(figure(tree, 'expected')).toBe(
      formatPaise(store.expectedCash().value, { withSign: false }),
    );
    expect(figure(tree, 'net-sales')).toBe(formatPaise(p.p4NetSales.value, { withSign: false }));
    expect(figure(tree, 'to-collect')).toBe(
      formatPaise(p.p7CreditOutstanding.value, { withSign: false }),
    );
    expect(figure(tree, 'owed')).toBe(
      formatPaise(p.p8SupplierOutstanding.value, { withSign: false }),
    );
  });

  it('mutates the store and the expected-in-box figure moves with it', () => {
    const store = canonicalStore();
    const before = figure(render(<Today store={store} />), 'expected');

    store.append(cashSale('t1-wired-1', 150000));

    const after = figure(render(<Today store={store} />), 'expected');
    expect(after).not.toBe(before);
    expect(after).toBe(formatPaise(store.expectedCash().value, { withSign: false }));
  });

  it('mutates the store and cash in and net sales follow the engine', () => {
    const store = canonicalStore();
    store.append(cashSale('t1-wired-2', 250000));
    const tree = render(<Today store={store} />);
    const p = store.primary();
    expect(figure(tree, 'box-in-amount')).toBe(
      formatPaise(p.p1TotalCashReceived.value, { withSign: true }),
    );
    expect(figure(tree, 'net-sales')).toBe(formatPaise(p.p4NetSales.value, { withSign: false }));
  });

  it('the ring and the words beside it are dayProgress, and a skip moves both', () => {
    const store = emptyStore();
    const read = () => {
      const tree = render(<Today store={store} />);
      return [text(byTestId(tree, 't1-book-ring-done')), text(byTestId(tree, 't1-book-heading'))];
    };
    const before = progress(store);
    expect(read()).toEqual([String(before.done), `${before.done} of ${before.steps}`]);

    store.skip('withdrawal');

    const after = progress(store);
    expect(after.done).toBe(before.done + 1);
    expect(read()).toEqual([String(after.done), `${after.done} of ${after.steps}`]);
  });

  it('holds nothing of its own - a render after a write agrees with the store', () => {
    const store = canonicalStore();
    render(<Today store={store} />);
    const revision = store.revision;
    store.append(cashSale('t1-wired-3', 99));
    expect(store.revision).toBe(revision + 1);
    expect(figure(render(<Today store={store} />), 'expected')).toBe(
      formatPaise(store.expectedCash().value, { withSign: false }),
    );
  });

  it('the opening line is the stored figure, or says there is none - never a zero', () => {
    const canonical = canonicalStore();
    const stored = canonical.state.day.openingCash;
    expect(stored).not.toBeNull();
    expect(text(byTestId(render(<Today store={canonical} />), 't1-box-opening-amount'))).toBe(
      formatPaise(stored as number, { withSign: false }),
    );
    const adversarial = adversarialStore();
    expect(adversarial.state.day.openingCash).toBeNull();
    const tree = render(<Today store={adversarial} />);
    expect(text(byTestId(tree, 't1-box-no-opening'))).toBe(phrase('t1.openingMissing', 'en'));
    expect(has(tree, 't1-box-opening-amount')).toBe(false);
  });
});

/* ---- the observation: derived, conditional, never an instruction ---- */
describe('the observation card is shown only when the figures on screen make it true', () => {
  it('absent on the canonical day, where more cash came in than went out', () => {
    const store = canonicalStore();
    const p = store.primary();
    expect(p.p2TotalCashPaid.value).toBeLessThan(p.p1TotalCashReceived.value);
    expect(has(render(<Today store={store} />), 't1-observation')).toBe(false);
  });

  it('mutates the store past the line and the card appears, with copy that asks', () => {
    const store = canonicalStore();
    store.append(cashPurchase('t1-obs-1', 500000));
    const p = store.primary();
    expect(p.p2TotalCashPaid.value).toBeGreaterThan(p.p1TotalCashReceived.value);
    const card = byTestId(render(<Today store={store} />), 't1-observation');
    expect(text(card)).toBe(phrase('t1.obs.title', 'en') + phrase('t1.obs.body', 'en'));
    // A card, not a control: nothing on it can be pressed.
    expect(all(card).filter((n) => typeof n.props?.onPress === 'function')).toEqual([]);
  });
});

/* ---- the brand bar: what is stored, and nothing invented ------------- */
describe('the brand bar says the shop, the day and its state - and invents no person', () => {
  it('the eyebrow is the stored shop name; with none stored there is no eyebrow', () => {
    const store = canonicalStore();
    expect(has(render(<Today store={store} />), 't1-eyebrow')).toBe(false);
    store.setShopName('Sharma Kirana Store');
    expect(text(byTestId(render(<Today store={store} />), 't1-eyebrow'))).toBe(
      'Sharma Kirana Store',
    );
  });

  it('the date line is read from the day record, not a clock', () => {
    // 2026-07-15 fell on a Wednesday.
    expect(CANONICAL_DATE).toBe('2026-07-15');
    const tree = render(<Today store={canonicalStore()} />);
    expect(text(byTestId(tree, 't1-subtitle'))).toBe('Wednesday 15 July');
  });

  it('the pill says READY once all eight sections are answered, OPEN before', () => {
    const store = emptyStore();
    expect(text(byTestId(render(<Today store={store} />), 't1-pill'))).toBe(
      phrase('t1.pill.open', 'en'),
    );
    for (const section of ALL_SECTIONS) store.skip(section);
    expect(text(byTestId(render(<Today store={store} />), 't1-pill'))).toBe(
      phrase('t1.pill.ready', 'en'),
    );
  });

  it('no bell: a notification control with nowhere to go is not drawn', () => {
    const ids = all(render(<Today store={canonicalStore()} />)).map((n) =>
      String(n.props?.testID ?? ''),
    );
    expect(ids.filter((id) => /bell|notif/i.test(id))).toEqual([]);
  });
});

/* ---- a figure is never broken across two lines inside its tile -------- */
describe('the party totals sit two across only while each fits beside another', () => {
  /*
   * On the Odia contact sheet a lakh figure with paise broke INSIDE the number
   * in a half-width tile - "₹2,49,312.0" over "1" - which reads as two figures.
   * check:layout cannot see it (nothing left its box), so it is held here. The
   * six tiles it was first written for are gone (USABILITY item 3); the hero
   * is one figure at full width, and the rule still governs the two halves.
   */
  const direction = (tree: ReturnType<typeof render>) =>
    byTestId(tree, 't1-parties').props?.style?.flexDirection;

  it('canonical thousands sit two across, as the reference draws them', () => {
    expect(direction(render(<Today store={canonicalStore()} />))).toBe('row');
  });

  it('adversarial lakhs take a row each', () => {
    expect(direction(render(<Today store={adversarialStore()} />))).toBe('column');
  });

  it('and at a system font scale of 1.5 even thousands take a row each', () => {
    fontScale.value = 1.5;
    try {
      expect(direction(render(<Today store={canonicalStore()} />))).toBe('column');
    } finally {
      fontScale.value = 1;
    }
  });
});

/* ---- F-15 · the ring moves, and stops moving when asked to ---------- */
describe('the ring animates on the motion token, and not at all under reduce motion', () => {
  beforeEach(() => {
    timings.length = 0;
  });

  it('a first draw is settled - no animation, so a screenshot is never mid-motion', () => {
    render(<Today store={canonicalStore()} />);
    expect(timings).toEqual([]);
  });

  it('a redraw after the day moved animates to the new fraction over motion.sheet', () => {
    const store = emptyStore();
    render(<Today store={store} />);
    store.skip('withdrawal');
    render(<Today store={store} />);
    const p = progress(store);
    expect(timings).toEqual([{ toValue: p.done / p.steps, duration: tokens().motion.sheet }]);
  });

  it('with reduce motion on, the same redraw takes zero milliseconds', () => {
    const store = emptyStore();
    render(<Today store={store} />);
    expect(reduceMotionListeners.length).toBeGreaterThan(0);
    for (const listener of reduceMotionListeners) listener(true);
    try {
      store.skip('withdrawal');
      render(<Today store={store} />);
      expect(timings.map((x) => x.duration)).toEqual([0]);
    } finally {
      for (const listener of reduceMotionListeners) listener(false);
    }
  });
});

/* ---- S-020-FIXTURES · both fixture shops ----------------------------- */
describe('T1 renders against both fixture shops, canonical and adversarial', () => {
  it('canonical: renders with its figures and its rails', () => {
    const tree = render(<Today store={canonicalStore()} />);
    expect(byTestId(tree, 't1')).toBeTruthy();
    expect(byTestId(tree, 't1-expected')).toBeTruthy();
    expect(actButtons(tree)).toHaveLength(ACT_SECTIONS.length);
  });

  it('adversarial: the lakh-scale expected figure is the engine figure', () => {
    const store = adversarialStore();
    expect(figure(render(<Today store={store} />), 'expected')).toBe(
      formatPaise(store.expectedCash().value, { withSign: false }),
    );
  });

  it('adversarial in Focus mode keeps every figure and every rail', () => {
    const store = adversarialStore();
    const count = (mode: 'comfort' | 'focus') =>
      all(render(<Today store={store} display={mode} />)).filter((n) =>
        /^t1-(act-|cash-|expected$|net-sales$|to-collect$|owed$)/.test(
          String(n.props?.testID ?? ''),
        ),
      ).length;
    expect(count('focus')).toBe(count('comfort'));
    expect(count('comfort')).toBeGreaterThan(ACT_SECTIONS.length);
  });
});

/* ---- S-020-I18N · three languages, longest string, max font scale ---- */
describe('T1 in three languages, in longest string mode, at maximum font scale', () => {
  const LANGUAGES: readonly Language[] = ['en', 'hi', 'or'];

  for (const language of LANGUAGES) {
    it(language + ': the title, the action and the empty state are in that language', () => {
      const tree = render(<Today store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 't1-title'))).toBe(phrase('t1.title', language));
      expect(text(byTestId(tree, 't1-close-day'))).toBe(phrase('t1.continueClose', language));
      const empty = render(<Today store={emptyStore()} language={language} />);
      expect(text(byTestId(empty, 't1-empty'))).toBe(phrase('t1.empty', language));
    });
  }

  it('longest string mode renders the whole screen without dropping a figure or a rail', () => {
    const store = adversarialStore();
    const ids = (l: 'en' | 'longest') =>
      all(render(<Today store={store} language={l} />))
        .map((n) => String(n.props?.testID ?? ''))
        .filter((id) => id.startsWith('t1-'));
    expect(ids('longest')).toEqual(ids('en'));
  });

  it('chrome is capped at the maximum font scale; money is not', () => {
    const tree = render(<Today store={canonicalStore()} />);
    expect(byTestId(tree, 't1-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    const money = byTestId(tree, 't1-expected');
    expect(money.props?.maxFontSizeMultiplier).toBeUndefined();
    expect(money.props?.allowFontScaling).toBe(true);
  });
});

/* ---- S-020-A11Y · contrast, touch target, text size ------------------ */
describe('T1 meets contrast, touch target and text size, from the registry', () => {
  const TREES = () => [
    render(<Today store={canonicalStore()} />),
    render(<Today store={adversarialStore()} display="focus" />),
    render(<Today store={emptyStore()} />),
    render(<Today store={canonicalStore()} status="error" />),
    render(<Today store={canonicalStore()} status="loading" />),
  ];

  it('every interactive element asks for at least TOUCH_TARGET_MIN_DP', () => {
    for (const tree of TREES()) expect(undersizedTargets(tree)).toEqual([]);
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('no text is under the registry floor', () => {
    for (const tree of TREES()) expect(undersizedText(tree)).toEqual([]);
  });

  it('every colour clears the contrast minimum', () => {
    for (const tree of TREES()) expect(failingContrast(tree)).toEqual([]);
  });

  it('the party totals are a real target, and they go to the Parties tab', () => {
    const tabs: string[] = [];
    const tree = render(<Today store={canonicalStore()} onSelectTab={(k) => tabs.push(k)} />);
    const card = byTestId(tree, 't1-parties');
    const style = (card.props?.style ?? {}) as Record<string, number>;
    expect(style.minHeight).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN_DP);
    expect(card.props?.accessibilityLabel).toBeTruthy();
    card.props.onPress();
    expect(tabs).toEqual(['parties']);
  });
});

/* ---- S-020-KEYPAD · no keypad here, and no nav beside it ------------- */
describe('T1 is not an entry screen, so it has no keypad beside its bottom navigation', () => {
  it('there is no keypad on Today', () => {
    const tree = render(<Today store={canonicalStore()} />);
    expect(all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('keypad'))).toEqual(
      [],
    );
  });

  it('the nav is exactly the three tabs C-5 rules, in that order', () => {
    /*
     * C-5 rules three tabs: Today - Parties - Reports. A fourth tab fails here,
     * which is what would have caught the "More" tab once drawn before C-5 was
     * read. §B.6 forbids a keypad BESIDE the nav, which the test above holds.
     */
    const tree = render(<Today store={canonicalStore()} />);
    const tabs = all(tree)
      .map((n) => String(n.props?.testID ?? ''))
      .filter((id) => /^bottom-nav-/.test(id));
    expect(tabs).toEqual(['bottom-nav-today', 'bottom-nav-parties', 'bottom-nav-reports']);
    expect(byTestId(tree, 'bottom-nav-today').props?.accessibilityState?.selected).toBe(true);
  });

  it('still no keypad beside that nav - B.6, which is the rule that is real', () => {
    const tree = render(<Today store={canonicalStore()} />);
    const ids = all(tree).map((n) => String(n.props?.testID ?? ''));
    expect(ids.filter((id) => /^keypad/.test(id))).toEqual([]);
    expect(ids.filter((id) => id === 'bottom-nav')).toEqual(['bottom-nav']);
  });

  it('continuing the day close reports the intent and writes nothing itself', () => {
    const store = canonicalStore();
    const pressed: string[] = [];
    const before = store.state.entries.length;
    const tree = render(<Today store={store} onCloseDay={() => pressed.push('close')} />);
    byTestId(tree, 't1-close-day').props.onPress();
    expect(pressed).toEqual(['close']);
    expect(store.state.entries.length).toBe(before);
    expect(store.state.day.state).not.toBe('closed');
  });

  it('opening a section from its rail reports which one', () => {
    const opened: string[] = [];
    const tree = render(<Today store={canonicalStore()} onOpenSection={(x) => opened.push(x)} />);
    byTestId(tree, 't1-act-udhar_sales').props.onPress();
    expect(opened).toEqual(['udhar_sales']);
  });

  it('settings and privacy are still reachable, and report their intent', () => {
    const pressed: string[] = [];
    const tree = render(
      <Today
        store={canonicalStore()}
        onOpenSettings={() => pressed.push('settings')}
        onOpenPrivacy={() => pressed.push('privacy')}
      />,
    );
    byTestId(tree, 't1-settings').props.onPress();
    byTestId(tree, 't1-privacy').props.onPress();
    expect(pressed).toEqual(['settings', 'privacy']);
  });
});

/* ---- USABILITY §4 (wave 5, on device) ---------------------------------- */

/** The canonical day with the clock pinned to a chosen wall time - the registry pins noon. */
const storeAt = (wall: string, startsAt?: string): Store => {
  const state = canonicalStore().state;
  const day = startsAt === undefined ? state.day : { ...state.day, startsAt };
  return new Store(memoryPort({ ...state, day }), () => wall);
};

describe('USABILITY item 1 - Today puts the sale first', () => {
  it('the four everyday tiles are pinned above the body, the weekly two sit under More', () => {
    const tree = render(<Today store={canonicalStore()} />);
    const pinned = byTestId(tree, 't1-pinned');
    const body = byTestId(tree, 't1-body');
    const ids = (n: ReturnType<typeof render>) =>
      all(n).map((x) => String(x.props?.testID ?? '')).filter((id) => id.startsWith('t1-act-'));
    expect(ids(pinned)).toEqual([
      't1-act-cash_sales',
      't1-act-udhar_sales',
      't1-act-udhar_collection',
      't1-act-expense',
    ]);
    // Nothing he taps forty times a day is inside the scrolling body.
    expect(ids(body)).toEqual(['t1-act-purchase', 't1-act-party_payment']);
    expect(text(byTestId(tree, 't1-more'))).toBe(phrase('t1.more', 'en'));
  });

  // v2 "Mitra" (DESIGN-SYSTEM-V2 3.3): the tile word is `lead`, bold, beside its pictogram (was heading).
  it('the pinned tiles are the large ones: lead type, bold', () => {
    const tree = render(<Today store={canonicalStore()} />);
    const t = tokens('comfort');
    const label = byType(byTestId(tree, 't1-act-cash_sales'), 'Text').find((n) => n.props.style.fontFamily !== t.font.icons)!;
    expect(label.props.style.fontSize).toBe(t.type.lead);
    expect(t.type.lead).toBeGreaterThan(t.type.body);
    expect(label.props.style.fontFamily).toBe(t.font.bold);
    expect(text(byTestId(tree, 't1-act-udhar_sales'))).toBe(phrase('act.credit', 'en'));
    expect(phrase('act.credit', 'en')).toBe('Udhar sale');
  });

  it('before closing time "Continue day close" is secondary, and nothing on Today is marigold', () => {
    const t = tokens('comfort');
    const tree = render(<Today store={storeAt(CANONICAL_DATE + 'T12:00:00.000+05:30')} />);
    expect(byTestId(tree, 't1-close-day').props.style.backgroundColor).toBe(t.color.surfaceRaised);
    // Controls only: the ring's arc is marigold by design (a fill, the reference's), not an action.
    const marigold = all(tree).filter((n) => n.type === 'Pressable' && n.props?.style?.backgroundColor === t.color.accent);
    expect(marigold).toEqual([]);
  });

  /*
   * v2 "Mitra": the primary fill is `brand`, not marigold (DESIGN-SYSTEM-V2 1.1),
   * and the Sale tile is the one SOLID tile in the same teal (3.3) - it is the
   * job done forty times a day. So from closing time the brand-filled controls
   * are exactly two: the Sale tile and the close button. Nothing is marigold.
   */
  it('from closing time it is the one primary button on the screen, beside the Sale tile', () => {
    const t = tokens('comfort');
    const tree = render(<Today store={storeAt(CANONICAL_DATE + 'T20:30:00.000+05:30')} />);
    expect(byTestId(tree, 't1-close-day').props.style.backgroundColor).toBe(t.color.brand);
    const filled = all(tree).filter((n) => n.type === 'Pressable' && n.props?.style?.backgroundColor === t.color.brand);
    // The live tab is the `selected` fill, the same teal in v2: it says where you are, it is not an action.
    expect(filled.map((n) => n.props.testID)).toEqual(['t1-act-cash_sales', 't1-close-day', 'bottom-nav-today']);
    expect(byTestId(tree, 'bottom-nav-today').props.accessibilityState).toEqual({ selected: true });
    const marigold = all(tree).filter((n) => n.type === 'Pressable' && n.props?.style?.backgroundColor === t.color.accent);
    expect(marigold).toEqual([]);
  });

  it('the closing time comes from the shop when it is passed, and 20:00 otherwise', () => {
    expect(DEFAULT_CLOSES_AT).toBe('20:00');
    const store = storeAt(CANONICAL_DATE + 'T18:30:00.000+05:30');
    expect(store.closingDue()).toBe(false);
    expect(store.closingDue('18:00')).toBe(true);
    const t = tokens('comfort');
    const tree = render(<Today store={store} closesAt="18:00" />);
    expect(byTestId(tree, 't1-close-day').props.style.backgroundColor).toBe(t.color.brand);
  });

  it('closing is measured from the day\'s own start, so 00:30 after a late day is still past it', () => {
    const next = addDays(CANONICAL_DATE, 1);
    // A day starting 05:00 on the canonical date runs to 05:00 next morning.
    expect(storeAt(next + 'T00:30:00.000+05:30', '05:00').closingDue()).toBe(true);
    expect(storeAt(CANONICAL_DATE + 'T06:00:00.000+05:30', '05:00').closingDue()).toBe(false);
  });

  it('an ended day is past closing; the stale card keeps its own button', () => {
    const tree = render(<Today store={storeAt('2027-01-01T09:00:00.000+05:30')} />);
    expect(has(tree, 't1-stale')).toBe(true);
    // QA-06 still holds: no tiles at all while the book is not today's.
    expect(has(tree, 't1-pinned')).toBe(false);
    expect(actButtons(tree)).toEqual([]);
  });
});

describe('USABILITY item 3 - one hero, "In the box now", with its working', () => {
  it('the working adds up to the hero through the audited helpers', () => {
    const store = canonicalStore();
    const p = store.primary();
    const total = subtract(
      sum([store.state.day.openingCash as number, p.p1TotalCashReceived.value]),
      p.p2TotalCashPaid.value,
    );
    expect(total).toBe(p.p3ExpectedCashBalance.value);
    const tree = render(<Today store={store} />);
    expect(figure(tree, 'expected')).toBe(formatPaise(total, { withSign: false }));
  });

  it('mutates the store with a UPI sale: sales move and the box does not (D2)', () => {
    const store = canonicalStore();
    const before = render(<Today store={store} />);
    store.append({ ...cashSale('t1-upi-1', 70000), section: 'upi_sales', mode: 'upi' } as Entry);
    const after = render(<Today store={store} />);
    expect(figure(after, 'expected')).toBe(figure(before, 'expected'));
    expect(figure(after, 'net-sales')).not.toBe(figure(before, 'net-sales'));
    expect(figure(after, 'net-sales')).toBe(formatPaise(store.primary().p4NetSales.value, { withSign: false }));
  });

  it('a zero is not drawn: nothing paid out is said in words, and a zero party total is left out', () => {
    const store = emptyStore();
    const tree = render(<Today store={store} />);
    expect(has(tree, 't1-box-out')).toBe(false);
    expect(has(tree, 't1-box-in')).toBe(false);
    expect(text(byTestId(tree, 't1-box-nothing-out'))).toBe(phrase('box.nothingOut', 'en'));
    // With both party totals at zero the card is not drawn at all.
    const zero = new Store(
      memoryPort({ ...store.state, priorCreditOutstanding: 0, priorSupplierOutstanding: 0 }),
      () => CANONICAL_DATE + 'T12:00:00.000+05:30',
    );
    expect(has(render(<Today store={zero} />), 't1-parties')).toBe(false);
  });
});

/*
 * WAVE 5 VERIFIER GAP, CLOSED: NOTHING GUARDED THE "IN THE BOX NOW" WORKING
 * AGAINST A MID-NUMBER BREAK (docs/audit/findings/verifier-wave5.md). The old
 * half-width tile had a guard; the full-width hero lost it, and check:layout
 * cannot see a figure that wraps INSIDE its own box. A renderer with no layout
 * cannot measure a break either, so this asserts the four structural facts
 * that make one impossible, on every term, in every language, on the lakh
 * shop: the figure is its own Text (never joined to its word), it holds no
 * space to break at, it sits in a slot that will not shrink, and the line it
 * is on wraps - so a figure that cannot fit beside its word moves down WHOLE.
 */
/** Every way one working term could let its figure break mid-number. Empty is safe. */
const breakRisks = (term: Node): string[] => {
  const id = String(term.props?.testID);
  const risks: string[] = [];
  if (term.props?.style?.flexWrap !== 'wrap') risks.push(id + ': the line does not wrap');
  const slot = all(term).find((n) => n.props?.testID === id + '-slot');
  if (slot === undefined) return [...risks, id + ': no slot around the figure'];
  if (slot.props?.style?.flexShrink !== 0) risks.push(id + ': the figure slot can shrink');
  const amount = all(slot).find((n) => n.props?.testID === id + '-amount');
  if (amount === undefined || amount.type !== 'Text') return [...risks, id + ': the figure is not its own Text'];
  if (/\s/.test(amount.text)) risks.push(id + ': the figure holds a space to break at');
  if (!/^[+-]?₹[0-9,]+\.[0-9]{2}$/.test(amount.text)) risks.push(id + ': the figure is not just a figure');
  const words = byType(term, 'Text').filter(
    (n) => n !== amount && n.props?.style?.fontFamily !== tokens().font.icons,
  );
  if (words.length !== 1 || words[0]!.text.includes('₹')) risks.push(id + ': the word and the figure are not two Texts');
  return risks;
};

describe('Wave 5 gap - the box working never breaks a figure mid-number', () => {
  const TERMS = (tree: Node) =>
    all(byTestId(tree, 't1-box-working')).filter((n) =>
      /^t1-box-(opening|in|out|adjust-\d+)$/.test(String(n.props?.testID ?? '')),
    );

  for (const language of ['en', 'hi', 'or', 'longest'] as const) {
    it(language + ': every term on the lakh shop is a wrapping line with an unshrinkable, unbreakable figure', () => {
      for (const display of ['comfort', 'focus'] as const) {
        const terms = TERMS(render(<Today store={adversarialStore()} language={language} display={display} />));
        expect(terms.length).toBeGreaterThanOrEqual(2);
        expect(terms.flatMap(breakRisks)).toEqual([]);
      }
    });
  }

  it('the instrument responds: a planted shrinking slot and a joined word are both reported', () => {
    const leaf = (text: string, testID?: string): Node => ({
      type: 'Text',
      props: { testID, style: {} },
      children: [],
      text,
    });
    const planted: Node = {
      type: 'View',
      props: { testID: 't1-box-in', style: { flexWrap: 'wrap' } },
      children: [
        {
          type: 'View',
          props: { testID: 't1-box-in-slot', style: { flexShrink: 1 } },
          children: [leaf('cash in ₹2,49,312.01', 't1-box-in-amount')],
          text: '',
        },
      ],
      text: '',
    };
    const risks = breakRisks(planted);
    expect(risks).toContain('t1-box-in: the figure slot can shrink');
    expect(risks).toContain('t1-box-in: the figure holds a space to break at');
    expect(risks).toContain('t1-box-in: the word and the figure are not two Texts');
    // And the real screen, unplanted, reports none of them.
    expect(TERMS(render(<Today store={adversarialStore()} />)).flatMap(breakRisks)).toEqual([]);
  });
});

describe('USABILITY item 8 - the sync chip, on Today', () => {
  it('says Saved when nothing waits, and how many wait - safe on phone - after a write', () => {
    const store = canonicalStore();
    expect(text(byTestId(render(<Today store={store} />), 't1-sync-text'))).toBe(phrase('sync.saved', 'en'));
    store.append(cashSale('t1-sync-1', 5000));
    const tree = render(<Today store={store} />);
    expect(text(byTestId(tree, 't1-sync-text'))).toBe('1 waiting · safe on phone');
    expect(byTestId(tree, 't1-sync').props.accessibilityLabel).toContain('Safe on this phone');
  });

  it('is never red: waiting is the gold tint with ink, saved is the card with ink', () => {
    const t = tokens('comfort');
    const store = canonicalStore();
    const saved = byTestId(render(<Today store={store} />), 't1-sync');
    expect(saved.props.style.backgroundColor).toBe(t.color.surface);
    store.append(cashSale('t1-sync-2', 5000));
    const tree = render(<Today store={store} />);
    expect(byTestId(tree, 't1-sync').props.style.backgroundColor).toBe(t.color.tintGold);
    const inks = all(byTestId(tree, 't1-sync'))
      .flatMap((n) => [n.props?.style?.color, n.props?.style?.backgroundColor, n.props?.style?.borderColor])
      .filter(Boolean);
    expect(inks).not.toContain(t.color.negative);
    expect(inks).not.toContain(t.color.tintRed);
  });

  it('"Today so far" and the sync line no longer share a row (U-67)', () => {
    const tree = render(<Today store={canonicalStore()} language="hi" />);
    expect(has(tree, 't1-so-far')).toBe(false);
    expect(has(tree, 't1-sync')).toBe(true);
  });
});

describe('WCAG 2.5.3 - every tile is reached by the words on its face', () => {
  for (const language of ['en', 'hi', 'or'] as const) {
    it(language + ': the accessible name contains the visible label', () => {
      const tree = render(<Today store={canonicalStore()} language={language} />);
      for (const { section, labelKey } of ACT_SECTIONS) {
        const tile = byTestId(tree, 't1-act-' + section);
        const face = phrase(labelKey, language);
        expect(text(tile)).toBe(face);
        expect(tile.props.accessibilityLabel, section).toContain(face);
        // And the reader still hears which ledger row it opens.
        expect(tile.props.accessibilityLabel, section).toContain(phrase(('section.' + section) as never, language));
      }
    });
  }
});
