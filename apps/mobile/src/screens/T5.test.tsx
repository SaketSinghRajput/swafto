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
    expect(byType(tree, 'ActivityIndicator')).toHaveLength(1);
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
  it('a section with entries reads as entered', () => {
    const tree = render(<DayCloseList store={canonicalStore()} />);
    expect(text(byTestId(tree, 't5-state-cash_sales'))).toBe(phrase('state.entered', 'en'));
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
    expect(byTestId(tree, 't5-headline').props?.maxFontSizeMultiplier).toBeUndefined();
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

  it('skipping reports the section and writes nothing by itself', () => {
    const store = emptyStore();
    const skipped: string[] = [];
    const tree = render(<DayCloseList store={store} onSkipSection={(x) => skipped.push(x)} />);
    byTestId(tree, 't5-skip-purchase').props.onPress();
    expect(skipped).toEqual(['purchase']);
    expect(store.sectionState('purchase')).toBe('untouched');
  });
});
