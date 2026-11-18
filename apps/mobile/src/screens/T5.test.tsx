/**
 * T5 DAY CLOSE LIST - the §B.6 bar.
 *
 * The cross-screen instruments cover contrast, targets, text size, translations
 * and numerals for every registry case. This file covers D8: the three states a
 * section can be in, which is the distinction this screen exists to make.
 */
import { describe, it, expect } from 'vitest';
import { DayCloseList } from './T5.tsx';
import { canonicalStore, adversarialStore, emptyStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { CANONICAL_DATE } from '@swafto/fixtures';
import { formatPaise, type Entry } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import { tokens } from '../theme/tokens.ts';
import { fontScale } from '../../test/ui-double.tsx';

const sale = (id: string, amount: number): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section: 'cash_sales',
    amount,
    mode: 'cash',
    source: 'manual',
    createdAt: CANONICAL_DATE + 'T19:30:00.000Z',
  }) as Entry;

const rows = (tree: ReturnType<typeof render>) =>
  all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('t5-row-'));

describe('T5 renders all four states, and a row per section whatever the data', () => {
  it('loading', () => {
    const tree = render(<DayCloseList store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 't5-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error offers a way back', () => {
    const tree = render(<DayCloseList store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 't5-error')).toBeTruthy();
    expect(byTestId(tree, 't5-retry')).toBeTruthy();
  });

  it('loaded: every section has a row, even the ones with nothing in them', () => {
    // Eight entry sections. A day close that hid the empty ones would hide the
    // question it exists to ask.
    expect(rows(render(<DayCloseList store={canonicalStore()} />))).toHaveLength(8);
  });

  it('an empty shop still shows every row, not an empty state', () => {
    expect(rows(render(<DayCloseList store={emptyStore()} />))).toHaveLength(8);
  });
});

describe('D8 - the three states, and the difference between two of them', () => {
  it('a section with entries reads as entered - by its mark, and by its count', () => {
    /*
     * The reference's second line on an entered row is the COUNT ("7 entries"),
     * so the state word moved onto the mark, where it is the accessible name.
     * Both are asserted: the state cannot be carried by the tick alone.
     */
    const store = canonicalStore();
    const tree = render(<DayCloseList store={store} />);
    expect(byTestId(tree, 't5-mark-cash_sales').props?.accessibilityLabel).toBe(
      phrase('state.entered', 'en'),
    );
    const n = store.state.entries.filter((e) => e.section === 'cash_sales').length;
    expect(n).toBeGreaterThan(1);
    expect(text(byTestId(tree, 't5-state-cash_sales'))).toBe(`${n} entries`);
  });

  it('F-12: the state line sits INSIDE its own row, never after the row it belongs to', () => {
    const tree = render(<DayCloseList store={emptyStore()} />);
    for (const row of rows(tree)) {
      const section = String(row.props.testID).slice('t5-row-'.length);
      const inside = all(row).map((n) => String(n.props?.testID ?? ''));
      expect(inside, section).toContain('t5-state-' + section);
      expect(inside, section).toContain('t5-mark-' + section);
    }
  });

  it('a section nobody has reached reads as not yet, and offers the action', () => {
    const tree = render(<DayCloseList store={emptyStore()} />);
    expect(text(byTestId(tree, 't5-state-withdrawal'))).toBe(phrase('state.untouched', 'en'));
    expect(byTestId(tree, 't5-skip-withdrawal')).toBeTruthy();
  });

  it('mutates the store by skipping, and the state changes while the total does not', () => {
    const store = emptyStore();
    const before = store.sectionTotal('withdrawal');

    store.skip('withdrawal');

    const tree = render(<DayCloseList store={store} />);
    expect(text(byTestId(tree, 't5-state-withdrawal'))).toBe(phrase('state.skipped', 'en'));
    // The whole point of D8: the same figure, a different meaning.
    expect(store.sectionTotal('withdrawal')).toBe(before);
    // And the action is gone, because the question has been answered.
    expect(all(tree).filter((n) => n.props?.testID === 't5-skip-withdrawal')).toEqual([]);
  });

  it('entries win over a skip - a section with money in it was not empty', () => {
    const store = emptyStore();
    store.skip('cash_sales');
    store.append(sale('t5-1', 5000));
    expect(store.sectionState('cash_sales')).toBe('entered');
  });

  it('mutates the store and the row figure follows the engine', () => {
    const store = emptyStore();
    store.append(sale('t5-2', 123400));
    const tree = render(<DayCloseList store={store} />);
    expect(text(byTestId(tree, 't5-figure-cash_sales'))).toContain(
      formatPaise(store.sectionTotal('cash_sales'), { withSign: false }),
    );
  });
});

describe('T5 against both fixtures, in every language', () => {
  it('adversarial: renders every row with lakh-scale figures', () => {
    expect(rows(render(<DayCloseList store={adversarialStore()} />))).toHaveLength(8);
  });

  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title is in that language', () => {
      const tree = render(<DayCloseList store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 't5-title'))).toBe(phrase('t5.title', language));
    });
  }

  it('longest string mode keeps every row', () => {
    const tree = render(
      <DayCloseList store={adversarialStore()} language="longest" display="focus" />,
    );
    expect(rows(tree)).toHaveLength(8);
  });

  it('chrome is capped; money is not', () => {
    const tree = render(<DayCloseList store={canonicalStore()} />);
    expect(byTestId(tree, 't5-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    // The bar no longer carries a figure - the reference has none there - so the
    // uncapped money asserted is a row's own total.
    const money = byTestId(tree, 't5-figure-cash_sales');
    expect(money.props?.maxFontSizeMultiplier).toBeUndefined();
    expect(money.props?.allowFontScaling).toBe(true);
  });
});

describe('T5 accessibility, and the absence of a keypad', () => {
  const TREES = () => [
    render(<DayCloseList store={canonicalStore()} />),
    render(<DayCloseList store={emptyStore()} display="focus" />),
    render(<DayCloseList store={adversarialStore()} status="error" />),
  ];

  it('every target meets TOUCH_TARGET_MIN_DP', () => {
    for (const tree of TREES()) expect(undersizedTargets(tree)).toEqual([]);
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('no text under the floor, no colour under the contrast minimum', () => {
    for (const tree of TREES()) {
      expect(undersizedText(tree)).toEqual([]);
      expect(failingContrast(tree)).toEqual([]);
    }
  });

  it('no keypad and no bottom nav - a checking screen, not an entry one', () => {
    const tree = render(<DayCloseList store={canonicalStore()} />);
    expect(all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('keypad'))).toEqual([]);
    expect(
      all(tree)
        .map((n) => String(n.props?.testID ?? ''))
        .filter((id) => /nav|tabbar|bottom-bar/i.test(id)),
    ).toEqual([]);
  });

  it('F-7: on a closed day no skip is offered and no next step is pinned', () => {
    /*
     * `store.skip()` throws on a closed day and nothing catches it. The list is
     * reachable from the closed-day face, so the control that would throw must
     * not be drawn there at all.
     */
    const store = emptyStore();
    store.close(store.expectedCash().value);
    expect(() => store.skip('purchase')).toThrow();
    const ids = all(render(<DayCloseList store={store} />)).map((n) => String(n.props?.testID ?? ''));
    expect(ids.filter((id) => id.startsWith('t5-skip-'))).toEqual([]);
    expect(ids).not.toContain('t5-next');
  });

  it('the pinned next step names the first unanswered section and opens it', () => {
    const opened: string[] = [];
    const tree = render(<DayCloseList store={emptyStore()} onOpenSection={(x) => opened.push(x)} />);
    const next = byTestId(tree, 't5-next');
    expect(text(next)).toBe('Enter ' + phrase('section.cash_sales', 'en'));
    next.props.onPress();
    expect(opened).toEqual(['cash_sales']);
  });

  it('mutates the store until all eight are answered, and the count unlocks', () => {
    const store = emptyStore();
    const before = byTestId(render(<DayCloseList store={store} />), 't5-check');
    expect(before.type).toBe('View');
    for (const section of ['cash_sales', 'upi_sales', 'udhar_sales', 'purchase', 'expense',
      'udhar_collection', 'party_payment', 'withdrawal'] as const) {
      store.skip(section);
    }
    const checks: string[] = [];
    const tree = render(<DayCloseList store={store} onOpenCashCheck={() => checks.push('check')} />);
    expect(byTestId(tree, 't5-check').type).toBe('Pressable');
    expect(text(byTestId(tree, 't5-next'))).toBe(phrase('t5.openCheck', 'en'));
    byTestId(tree, 't5-check').props.onPress();
    byTestId(tree, 't5-next').props.onPress();
    expect(checks).toEqual(['check', 'check']);
  });

  it('the ring heading is the engine progress, "N of 10 done"', () => {
    const store = canonicalStore();
    const tree = render(<DayCloseList store={store} />);
    expect(text(byTestId(tree, 't5-progress'))).toMatch(/^\d+ of 10 done$/);
    expect(text(byTestId(tree, 't5-ring-done'))).toBe(text(byTestId(tree, 't5-progress')).split(' ')[0]);
  });

  it('F-9: a back control is drawn when there is somewhere to go, and reports it', () => {
    let backs = 0;
    const tree = render(<DayCloseList store={canonicalStore()} onBack={() => (backs += 1)} />);
    byTestId(tree, 't5-back').props.onPress();
    expect(backs).toBe(1);
    expect(all(render(<DayCloseList store={canonicalStore()} />)).some((n) => n.props?.testID === 't5-back')).toBe(false);
  });

  it('skipping reports the section and writes nothing by itself', () => {
    const store = emptyStore();
    const skipped: string[] = [];
    const tree = render(<DayCloseList store={store} onSkipSection={(x) => skipped.push(x)} />);
    byTestId(tree, 't5-skip-purchase').props.onPress();
    expect(skipped).toEqual(['purchase']);
    expect(store.sectionState('purchase')).toBe('untouched');
  });
});

describe('HT-28 - each "Nothing to enter" says which section it skips', () => {
  it('no two skip buttons share a spoken label', () => {
    const labels = all(render(<DayCloseList store={emptyStore()} />))
      .filter((n) => String(n.props?.testID ?? '').startsWith('t5-skip-'))
      .map((n) => n.props.accessibilityLabel);
    expect(labels.length).toBeGreaterThan(1);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

/* ---- USABILITY §4 item 7 (wave 5, on device) --------------------------- */
describe('USABILITY item 7 - the day close list on the phone', () => {
  it('the whole row opens its form: mark, name, state AND figure are one target', () => {
    const store = emptyStore();
    store.append(sale('t5-row-1', 4500));
    const opened: string[] = [];
    const tree = render(<DayCloseList store={store} onOpenSection={(x) => opened.push(x)} />);
    const target = byTestId(tree, 't5-open-cash_sales');
    // The figure is inside the pressable now - it used to sit beside it.
    expect(all(target).some((n) => n.props?.testID === 't5-figure-cash_sales')).toBe(true);
    expect(all(target).some((n) => n.props?.testID === 't5-mark-cash_sales')).toBe(true);
    target.props.onPress();
    expect(opened).toEqual(['cash_sales']);
  });

  it('"Nothing today" is a quiet link, not the loudest control on the row', () => {
    const t = tokens('comfort');
    const tree = render(<DayCloseList store={emptyStore()} />);
    const skip = byTestId(tree, 't5-skip-purchase');
    // No pill: no outline and no fill of its own.
    expect(skip.props.style.borderWidth).toBeUndefined();
    expect(skip.props.style.backgroundColor).toBeUndefined();
    const label = byTestId(tree, 't5-label-skip-purchase');
    expect(text(label)).toBe(phrase('t5.nothingToday', 'en'));
    expect(label.props.style.color).toBe(t.color.brandSoft);
    expect(label.props.style.textDecorationLine).toBe('underline');
  });

  it('mutates the store: a skip offers a one-tap undo, and the undo puts the question back', () => {
    const store = emptyStore();
    const undone: string[] = [];
    store.skip('purchase');
    let tree = render(<DayCloseList store={store} onUnskipSection={(x) => undone.push(x)} />);
    expect(all(tree).some((n) => n.props?.testID === 't5-skip-purchase')).toBe(false);
    byTestId(tree, 't5-undo-purchase').props.onPress();
    expect(undone).toEqual(['purchase']);
    // The screen reports; the store does the write.
    store.unskip('purchase');
    tree = render(<DayCloseList store={store} />);
    expect(text(byTestId(tree, 't5-state-purchase'))).toBe(phrase('state.untouched', 'en'));
    expect(byTestId(tree, 't5-skip-purchase')).toBeTruthy();
    expect(all(tree).some((n) => n.props?.testID === 't5-undo-purchase')).toBe(false);
  });

  it('mutates the store and the skipped count is said, and counted in "N of 10"', () => {
    const store = emptyStore();
    const has = (id: string) => all(render(<DayCloseList store={store} />)).some((n) => n.props?.testID === id);
    expect(has('t5-skipped-count')).toBe(false);
    store.skip('purchase');
    store.skip('withdrawal');
    const tree = render(<DayCloseList store={store} />);
    expect(text(byTestId(tree, 't5-skipped-count'))).toBe('2 marked "nothing today"');
    expect(text(byTestId(tree, 't5-progress'))).toBe('3 of 10 done');
  });

  it('the count includes opening cash, so opening cash is a line of the list (U-50)', () => {
    const tree = render(<DayCloseList store={emptyStore()} />);
    expect(text(byTestId(tree, 't5-opening-state'))).toBe(phrase('t5.openingStep', 'en'));
    expect(byTestId(tree, 't5-mark-opening').props.accessibilityLabel).toBe(phrase('state.entered', 'en'));
    // One tick on the list, and "1 of 10 done": the two agree.
    expect(text(byTestId(tree, 't5-progress'))).toBe('1 of 10 done');
  });

  it('the cash check and the close are visible locked lines with a padlock while unreachable', () => {
    const tree = render(<DayCloseList store={emptyStore()} />);
    expect(byTestId(tree, 't5-mark-check-lock')).toBeTruthy();
    expect(byTestId(tree, 't5-mark-close-lock')).toBeTruthy();
    expect(byTestId(tree, 't5-check').props.accessibilityLabel).toContain(phrase('t5.locked', 'en'));
    expect(text(byTestId(tree, 't5-close-row'))).toContain(phrase('t5.closeLocked', 'en'));
  });

  it('the sync state is the chip in the bar, not a line under the ring', () => {
    const store = emptyStore();
    store.append(sale('t5-sync-1', 4500));
    const tree = render(<DayCloseList store={store} />);
    expect(text(byTestId(tree, 't5-sync-text'))).toBe('1 waiting · safe on phone');
  });
});

/* ---- USABILITY item 10 / WCAG 1.4.4 - the Hindi skip label, whole ------- */
describe('USABILITY item 10 - "Nothing today" can never be cut to its opposite', () => {
  /*
   * On the phone the Hindi pill drew "दर्ज करने को कुछ" without "नहीं" (U-39,
   * U-40): a box sized to its words, high-contrast text drawn wider than it was
   * measured, a second line in a one-line height. Nothing here lays out, so
   * this holds the STRUCTURE that makes the clip impossible; check:layout
   * measures the same cases in Chromium at 1, 1.5 and 2.0.
   */
  for (const language of ['hi', 'or'] as const) {
    it(language + ': at font scale 2.0 the whole label is there, in a box that grows and never fixes a height', () => {
      fontScale.value = 2;
      try {
        const tree = render(<DayCloseList store={emptyStore()} language={language} />);
        for (const section of ['cash_sales', 'purchase', 'withdrawal'] as const) {
          const skip = byTestId(tree, 't5-skip-' + section);
          const label = byTestId(tree, 't5-label-skip-' + section);
          expect(text(label)).toBe(phrase('t5.nothingToday', language));
          expect(skip.props.style.flexGrow).toBe(1);
          expect(skip.props.style.height).toBeUndefined();
          expect(label.props.numberOfLines).toBeUndefined();
          // Body copy, so it follows the reader's own size past the chrome cap.
          expect(label.props.maxFontSizeMultiplier).toBe(0);
        }
        expect(phrase('t5.nothingToday', 'hi')).toContain('नहीं');
      } finally {
        fontScale.value = 1;
      }
    });
  }
});
