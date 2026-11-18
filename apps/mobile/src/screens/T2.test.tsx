/**
 * T2 TODAY, FIRST RUN - the §B.6 bar.
 *
 * THE ONE THING THIS SCREEN MUST NOT DO is answer its own question. The day has
 * no opening figure, so the screen renders the absence of one. A `<Money>` of
 * zero in that slot would read as "the drawer is empty" - a statement about the
 * shop that nobody made - and the shopkeeper would have no way to tell it from a
 * zero he typed himself. Several tests below exist only to hold that line.
 *
 * THE SECOND THING is that the one action survives every state. T1 once put its
 * actions in `children`, which `Shell` replaces with the empty copy, and the
 * first morning of a shop had no way to record anything. This screen is nothing
 * BUT a first morning, so the same defect here would be total.
 */
import { describe, it, expect } from 'vitest';
import { TodayFirstRun } from './T2.tsx';
import { canonicalStore, adversarialStore, emptyStore } from './registry.tsx';
import { Store, memoryPort } from '../store/index.ts';
import { render, all, byTestId, byType, text, type Node } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { canonicalInput, CANONICAL_PARTIES } from '@swafto/fixtures';
import { formatPaise } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';

/**
 * THE STATE THIS SCREEN IS ACTUALLY FOR, and no fixture is it.
 *
 * `canonicalStore` opens with 2,000 rupees carried; `adversarialStore` has a null
 * opening figure but a full day of entries behind it; `emptyStore` has no entries
 * but still carries the canonical opening cash. The first morning of a brand new
 * shop - nothing carried, nothing entered - is the combination none of them hold,
 * so it is built here rather than approximated by one that is close.
 */
const firstRunStore = (): Store => {
  const base = canonicalInput();
  return new Store(
    memoryPort({
      shopId: 'shop-first-run',
      day: { ...base.day, openingCash: null },
      entries: [],
      parties: CANONICAL_PARTIES,
      priorCreditOutstanding: base.priorCreditOutstanding,
      priorSupplierOutstanding: base.priorSupplierOutstanding,
      skippedSections: [],
    }),
  );
};

/** Present-or-not, for the cases where the assertion is an absence. */
const has = (tree: Node, testID: string): boolean =>
  all(tree).some((n) => n.props?.testID === testID);

describe('T2 renders all four states, and the action survives every one of them', () => {
  it('loading', () => {
    const tree = render(<TodayFirstRun store={firstRunStore()} status="loading" />);
    expect(byTestId(tree, 't2-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error offers a way back', () => {
    const tree = render(<TodayFirstRun store={firstRunStore()} status="error" />);
    expect(byTestId(tree, 't2-error')).toBeTruthy();
    expect(byTestId(tree, 't2-retry')).toBeTruthy();
  });

  it('empty - the first morning - still asks the question and still offers the action', () => {
    const tree = render(<TodayFirstRun store={firstRunStore()} />);
    expect(text(byTestId(tree, 't2-empty'))).toBe(phrase('t2.empty', 'en'));
    /*
     * The copy, the promise and the one action are in the card, which T2 never
     * hands to `Shell`'s empty state - T2 IS the empty state of Today. Had it
     * passed `empty`, `Shell` would swap all of it for one line and this
     * assertion would fail.
     */
    expect(text(byTestId(tree, 't2-prompt'))).toBe(phrase('t2.prompt', 'en'));
    expect(text(byTestId(tree, 't2-carried'))).toBe(phrase('t2.carried', 'en'));
    expect(byTestId(tree, 't2-enter-opening')).toBeTruthy();
  });

  it('loaded - the question, the promise, and exactly one way forward', () => {
    /*
     * THIS USED TO ASSERT A SECTION LIST THAT COULD NEVER RENDER.
     *
     * It rendered T2 against the canonical shop - a day with entries - and
     * checked the section rows appeared. `App.tsx` shows T2 only when nothing is
     * carried AND nothing is entered, so that state does not occur: the rows
     * were unreachable, and the test passed by constructing a screen the app
     * cannot produce. The rows are gone and this asserts the state T2 is
     * actually for.
     *
     * The promise about figures is a promise about T1, which is what the router
     * renders the moment the first entry exists.
     */
    const tree = render(<TodayFirstRun store={firstRunStore()} />);
    expect(text(byTestId(tree, 't2-prompt'))).toBe(phrase('t2.prompt', 'en'));
    expect(text(byTestId(tree, 't2-carried'))).toBe(phrase('t2.carried', 'en'));
    expect(text(byTestId(tree, 't2-empty'))).toBe(phrase('t2.empty', 'en'));
    expect(
      all(tree)
        .filter((n) => n.type === 'Pressable')
        .map((n) => String(n.props?.testID ?? '')),
    ).toEqual(['t2-enter-opening']);
  });
});

describe('unknown is not zero, which is the whole of this screen', () => {
  it('no opening figure means the word, and no figure at all', () => {
    const tree = render(<TodayFirstRun store={firstRunStore()} />);
    expect(text(byTestId(tree, 't2-book-heading'))).toBe(phrase('t2.notStarted', 'en'));
    // Not a zero, not a dash, not a placeholder: nothing. The screen has no
    // honest figure, so it draws none.
    expect(has(tree, 't2-opening')).toBe(false);
  });

  it('mutates the store: the figure he typed is the figure the screen then shows', () => {
    const store = firstRunStore();

    const before = render(<TodayFirstRun store={store} />);
    expect(byTestId(before, 't2-enter-opening').props?.disabled).toBe(false);
    expect(has(before, 't2-opening')).toBe(false);

    store.setOpeningCash(250000);

    const after = render(<TodayFirstRun store={store} />);
    expect(text(byTestId(after, 't2-opening'))).toBe(formatPaise(250000, { withSign: false }));
    expect(text(byTestId(after, 't2-book-heading'))).toBe(phrase('t6.title', 'en'));
    // `setOpeningCash` throws on a second write, so the action is spent rather
    // than offered and then refused.
    expect(byTestId(after, 't2-enter-opening').props?.disabled).toBe(true);
  });

  it('and zero counts as answered - an empty drawer is a real count', () => {
    const store = firstRunStore();
    store.setOpeningCash(0);
    const tree = render(<TodayFirstRun store={store} />);
    expect(text(byTestId(tree, 't2-opening'))).toBe(formatPaise(0, { withSign: false }));
    expect(byTestId(tree, 't2-enter-opening').props?.disabled).toBe(true);
  });

  it('the screen reads the store on render and holds no copy of the figure', () => {
    // Same component, two stores, two answers. A cached figure would make the
    // second render agree with the first.
    const started = firstRunStore();
    started.setOpeningCash(777700);
    expect(text(byTestId(render(<TodayFirstRun store={started} />), 't2-opening'))).toBe(
      formatPaise(777700, { withSign: false }),
    );
    expect(has(render(<TodayFirstRun store={firstRunStore()} />), 't2-opening')).toBe(false);
  });
});

describe('one action, and it is the only one', () => {
  it('pressing it reports the intent and writes nothing', () => {
    const store = firstRunStore();
    const pressed: string[] = [];
    const tree = render(
      <TodayFirstRun store={store} onEnterOpeningCash={() => pressed.push('open')} />,
    );
    byTestId(tree, 't2-enter-opening').props.onPress();
    expect(pressed).toEqual(['open']);
    // The figure is typed on T6. This screen asks; it does not collect.
    expect(store.state.day.openingCash).toBeNull();
    expect(store.revision).toBe(0);
  });

  it('exactly one pressable on the first morning - no rails, no close, no chips', () => {
    const ids = all(render(<TodayFirstRun store={firstRunStore()} />))
      .filter((n) => n.type === 'Pressable')
      .map((n) => String(n.props?.testID ?? ''));
    expect(ids).toEqual(['t2-enter-opening']);
  });

  it('and still exactly one once the book has figures in it', () => {
    const ids = all(render(<TodayFirstRun store={adversarialStore()} />))
      .filter((n) => n.type === 'Pressable')
      .map((n) => String(n.props?.testID ?? ''));
    expect(ids).toEqual(['t2-enter-opening']);
  });
});

describe('T2 in every language, including the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title, the status word and the question are in that language', () => {
      const tree = render(<TodayFirstRun store={firstRunStore()} language={language} />);
      /*
       * The bar now says "Today", as every Today face does in the reference;
       * "Today's book" moved into the card as its small heading.
       */
      expect(text(byTestId(tree, 't2-title'))).toBe(phrase('t1.title', language));
      expect(text(tree)).toContain(phrase('t2.title', language));
      expect(text(byTestId(tree, 't2-book-heading'))).toBe(phrase('t2.notStarted', language));
      expect(text(byTestId(tree, 't2-prompt'))).toBe(phrase('t2.prompt', language));
    });
  }

  it('adversarial: a null opening figure behind a full book still shows the absence', () => {
    const store = adversarialStore();
    expect(store.state.day.openingCash).toBeNull();
    const tree = render(<TodayFirstRun store={store} language="or" />);
    expect(text(byTestId(tree, 't2-book-heading'))).toBe(phrase('t2.notStarted', 'or'));
    expect(has(tree, 't2-opening')).toBe(false);
    expect(byTestId(tree, 't2-enter-opening').props?.disabled).toBe(false);
  });

  it('longest string mode at the largest type keeps the question and the action', () => {
    const tree = render(
      <TodayFirstRun store={adversarialStore()} language="longest" display="focus" />,
    );
    expect(text(byTestId(tree, 't2-prompt'))).toBe(phrase('t2.prompt', 'longest'));
    expect(text(byTestId(tree, 't2-carried'))).toBe(phrase('t2.carried', 'longest'));
    expect(byTestId(tree, 't2-enter-opening')).toBeTruthy();
  });

  it('chrome is capped; money is not', () => {
    const store = firstRunStore();
    store.setOpeningCash(12345678);
    const tree = render(<TodayFirstRun store={store} />);
    expect(byTestId(tree, 't2-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 't2-book-heading').props?.maxFontSizeMultiplier).toBe(
      CHROME_FONT_SCALE_CAP,
    );
    const money = byTestId(tree, 't2-opening');
    expect(money.props?.maxFontSizeMultiplier).toBeUndefined();
    expect(money.props?.allowFontScaling).toBe(true);
  });
});

describe('T2 accessibility, and the keypad it does not have', () => {
  const TREES = (): Node[] => {
    const counted = firstRunStore();
    counted.setOpeningCash(0);
    return [
      render(<TodayFirstRun store={firstRunStore()} />),
      render(<TodayFirstRun store={counted} display="focus" />),
      render(<TodayFirstRun store={adversarialStore()} language="or" display="focus" />),
      render(<TodayFirstRun store={emptyStore()} language="or" />),
      render(<TodayFirstRun store={adversarialStore()} language="longest" display="focus" />),
      render(<TodayFirstRun store={canonicalStore()} status="error" />),
    ];
  };

  it('every target meets TOUCH_TARGET_MIN_DP, including the spent action', () => {
    for (const tree of TREES()) expect(undersizedTargets(tree)).toEqual([]);
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('no text under the floor, no colour under the minimum', () => {
    for (const tree of TREES()) {
      expect(undersizedText(tree)).toEqual([]);
      expect(failingContrast(tree)).toEqual([]);
    }
  });

  it('no input here means no keypad, and therefore no bottom nav either', () => {
    const tree = render(<TodayFirstRun store={firstRunStore()} />);
    expect(has(tree, 'keypad')).toBe(false);
    expect(
      all(tree)
        .map((n) => String(n.props?.testID ?? ''))
        .filter((id) => /keypad|nav|tabbar|bottom-bar/i.test(id)),
    ).toEqual([]);
    expect(
      all(tree)
        .map((n) => String(n.props?.accessibilityRole ?? ''))
        .filter((role) => role === 'tablist'),
    ).toEqual([]);
  });

  it('a spent action announces itself as disabled', () => {
    const store = firstRunStore();
    store.setOpeningCash(100000);
    const tree = render(<TodayFirstRun store={store} />);
    expect(byTestId(tree, 't2-enter-opening').props?.accessibilityState).toEqual({
      disabled: true,
    });
  });
});
