/**
 * T3 TODAY, ALREADY CLOSED - the §B.6 bar.
 *
 * The cross-screen instruments in `screens.spec.tsx` cover contrast, touch
 * target, text size, translations and numerals for every case in the registry.
 * This file covers what is true of THIS screen and of no other: that the day is
 * frozen, that the rails say so instead of vanishing or pretending, and that
 * nothing on it can write.
 *
 * REWRITTEN 2026-10-25 WITH THE SCREEN. T3 was rebuilt with T1 to the reference
 * picture (docs/design-reference/comfort/T3.png): the same six derived figures
 * as an open day, and no per-section rows and no profit line. Every assertion
 * that counted rows now counts the figures, and every one that read the bar's
 * headline now reads `t3-expected` - the same P3 figure, in the tile the
 * reference puts it in - each still compared with the engine and still shown to
 * follow a write made before the close.
 *
 * EVERY CLOSED STORE HERE IS CLOSED BY `Store.close()`. Hand-building a day
 * record with `state: 'closed'` would let the screen pass against a state the
 * product cannot actually reach, and would skip the refusal that is the point of
 * D7. The day is closed the way a shopkeeper closes it: by counting.
 */
import { describe, it, expect } from 'vitest';
import { TodayClosed } from './T3.tsx';
import { canonicalStore, adversarialStore, emptyStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { CANONICAL_DATE } from '@swafto/fixtures';
import { formatPaise, type Entry } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import { ACT_SECTIONS } from './actSections.ts';
import { tokens } from '../theme/tokens.ts';
import { DayClosedViolation, type Store } from '../store/index.ts';

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

/**
 * A day closed by the real store, counting exactly what the engine expected.
 *
 * The counted figure is ASKED FOR rather than written down - a literal here
 * would stop being a balanced close the first time the cash formula moved, and
 * `close()` would start throwing for a reason that has nothing to do with this
 * screen.
 */
const closed = (store: Store): Store => {
  store.close(store.expectedCash().value);
  return store;
};

const FIGURE_IDS = ['cash-received', 'cash-paid', 'expected', 'net-sales', 'to-collect', 'owed'];

const figures = (tree: ReturnType<typeof render>) =>
  all(tree).filter((n) => FIGURE_IDS.map((id) => 't3-' + id).includes(String(n.props?.testID ?? '')));

const rails = (tree: ReturnType<typeof render>) =>
  all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('t3-rail-'));

const expected = (store: Store) => text(byTestId(render(<TodayClosed store={store} />), 't3-expected'));

/* ---- S-020-STATES · all four states ---------------------------------- */
describe('T3 renders all four states, and empty is derived from the entries', () => {
  it('loading: an indicator, and no figure pretending to be zero', () => {
    const tree = render(<TodayClosed store={closed(canonicalStore())} status="loading" />);
    expect(byTestId(tree, 't3-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
    expect(text(tree)).not.toContain('₹');
  });

  it('error: says nothing was lost, and offers a way back', () => {
    const tree = render(<TodayClosed store={closed(canonicalStore())} status="error" />);
    expect(byTestId(tree, 't3-error')).toBeTruthy();
    expect(byTestId(tree, 't3-retry')).toBeTruthy();
    expect(text(tree)).toContain('lost');
  });

  it('empty: a day closed with nothing in it says so, and is still closed', () => {
    const tree = render(<TodayClosed store={closed(emptyStore())} />);
    expect(text(byTestId(tree, 't3-empty'))).toBe(phrase('t3.empty', 'en'));
    // E2 does not stop applying because the shop sold nothing.
    expect(rails(tree).length).toBeGreaterThan(0);
    expect(byTestId(tree, 't3-banner')).toBeTruthy();
  });

  it('loaded: the six figures, and no empty note', () => {
    const tree = render(<TodayClosed store={closed(canonicalStore())} />);
    expect(figures(tree)).toHaveLength(FIGURE_IDS.length);
    expect(all(tree).some((n) => n.props?.testID === 't3-empty')).toBe(false);
  });

  it('the empty state is derived, not declared - same status, different data', () => {
    const withData = render(<TodayClosed store={closed(canonicalStore())} status="ready" />);
    const without = render(<TodayClosed store={closed(emptyStore())} status="ready" />);
    expect(all(without).some((n) => n.props?.testID === 't3-empty')).toBe(true);
    expect(all(withData).some((n) => n.props?.testID === 't3-empty')).toBe(false);
  });
});

/* ---- E2 · disabled with a visible line, never silently inert --------- */
describe('E2 - the rails are present, disabled, and the screen says why', () => {
  it('the rails are still on the screen - a control that vanishes teaches nothing', () => {
    expect(rails(render(<TodayClosed store={closed(canonicalStore())} />)).length).toBe(6);
  });

  it('every rail is really disabled, not merely a paler colour', () => {
    for (const rail of rails(render(<TodayClosed store={closed(canonicalStore())} />))) {
      expect(rail.props.disabled, String(rail.props.testID)).toBe(true);
      expect(rail.props.accessibilityState, String(rail.props.testID)).toEqual({
        disabled: true,
      });
    }
  });

  it('the line explaining them is visible on the page, not waiting behind a tap', () => {
    const tree = render(<TodayClosed store={closed(canonicalStore())} />);
    expect(text(byTestId(tree, 't3-banner'))).toBe(phrase('t3.banner', 'en'));
  });

  it('and it names the route out, which is the button beside it', () => {
    const tree = render(<TodayClosed store={closed(canonicalStore())} />);
    expect(text(byTestId(tree, 't3-banner'))).toContain(phrase('t3.correction', 'en'));
    expect(byTestId(tree, 't3-correction').props.disabled).toBe(false);
  });

  it('the correction route reports the intent and writes nothing itself', () => {
    const store = closed(canonicalStore());
    const pressed: string[] = [];
    const revision = store.revision;
    const tree = render(
      <TodayClosed store={store} onPostCorrection={() => pressed.push('correction')} />,
    );
    byTestId(tree, 't3-correction').props.onPress();
    expect(pressed).toEqual(['correction']);
    expect(store.revision).toBe(revision);
  });

  it('the day summary is the card action, and it writes nothing either', () => {
    const store = closed(canonicalStore());
    const pressed: string[] = [];
    const revision = store.revision;
    const tree = render(
      <TodayClosed store={store} onOpenSummary={() => pressed.push('summary')} />,
    );
    byTestId(tree, 't3-summary').props.onPress();
    expect(pressed).toEqual(['summary']);
    expect(store.revision).toBe(revision);
  });

  it('the figures are flat here - on a frozen day none of them opens an entry form', () => {
    const tree = render(<TodayClosed store={closed(canonicalStore())} />);
    for (const id of ['cash-received', 'cash-paid', 'expected', 'net-sales']) {
      const tile = byTestId(tree, 't3-' + id + '-tile');
      expect(tile.type, id).toBe('View');
      expect(all(tile).filter((n) => typeof n.props?.onPress === 'function')).toEqual([]);
    }
  });

  it('nothing on a closed day is marigold-primary: the card action is outlined', () => {
    const tree = render(<TodayClosed store={closed(canonicalStore())} />);
    const accent = tokens().color.accent;
    const filled = all(tree).filter(
      (n) => n.type === 'Pressable' && n.props?.style?.backgroundColor === accent,
    );
    expect(filled).toEqual([]);
  });
});

/* ---- D7 · a closed day is frozen ------------------------------------- */
describe('D7 - nothing on T3 can add an entry to a closed day', () => {
  it('the store itself refuses, which is what the disabled rails are telling the truth about', () => {
    const store = closed(canonicalStore());
    expect(() => store.append(cashSale('t3-refused', 10000))).toThrow(DayClosedViolation);
  });

  it('every live handler on the screen leaves the store exactly where it was', () => {
    const store = closed(canonicalStore());
    const revision = store.revision;
    const before = store.state.entries.length;
    const tree = render(<TodayClosed store={store} />);

    for (const node of all(tree)) {
      if (typeof node.props?.onPress === 'function' && node.props?.disabled !== true) {
        node.props.onPress();
      }
    }

    expect(store.revision).toBe(revision);
    expect(store.state.entries.length).toBe(before);
    expect(store.state.day.state).toBe('closed');
  });

  it('no text input anywhere - there is nothing on this day left to type', () => {
    const tree = render(<TodayClosed store={closed(canonicalStore())} />);
    expect(all(tree).filter((n) => n.type === 'TextInput')).toEqual([]);
  });
});

/* ---- S-020-WIRED · every figure traced to the engine ------------------ */
describe('every figure on T3 is wired to the engine through the real store', () => {
  it('mutates the store before the close, and the frozen expected figure is that figure', () => {
    const store = canonicalStore();
    const before = expected(store);

    store.append(cashSale('t3-wired-1', 150000));
    closed(store);

    const after = expected(store);
    expect(after).not.toBe(before);
    expect(after).toBe(formatPaise(store.expectedCash().value, { withSign: false }));
  });

  it('mutates the store and the cash received figure follows', () => {
    const store = canonicalStore();
    store.append(cashSale('t3-wired-2', 250000));
    closed(store);
    const tree = render(<TodayClosed store={store} />);
    expect(text(byTestId(tree, 't3-cash-received'))).toBe(
      formatPaise(store.primary().p1TotalCashReceived.value, { withSign: true }),
    );
  });

  it('what he counted is the record, read back - not the expected figure restated', () => {
    const store = canonicalStore();
    store.close(store.expectedCash().value);
    const counted = store.state.day.countedCash;
    expect(counted).not.toBeNull();
    expect(text(byTestId(render(<TodayClosed store={store} />), 't3-counted'))).toBe(
      formatPaise(counted as number, { withSign: false }),
    );
  });

  it('holds nothing of its own - the close itself is a write, and the screen re-derives', () => {
    const store = canonicalStore();
    render(<TodayClosed store={store} />);
    const revision = store.revision;
    closed(store);
    expect(store.revision).toBe(revision + 1);
    expect(expected(store)).toBe(formatPaise(store.expectedCash().value, { withSign: false }));
  });

  it('the closing time comes from the record, and is read rather than reinterpreted', () => {
    const store = closed(canonicalStore());
    const stamp = String(store.state.day.closedAt);
    expect(text(byTestId(render(<TodayClosed store={store} />), 't3-closed-at'))).toBe(
      phrase('t3.closedAt', 'en') + ' ' + stamp.slice(11, 16),
    );
  });

  it('a day with no closing stamp shows no time at all, rather than a half-parsed one', () => {
    const tree = render(<TodayClosed store={canonicalStore()} />);
    expect(all(tree).some((n) => n.props?.testID === 't3-closed-at')).toBe(false);
  });
});

/* ---- S-020-FIXTURES · both fixture shops ------------------------------ */
describe('T3 renders against both fixture shops, canonical and adversarial', () => {
  it('canonical: renders with its figures and its rails', () => {
    const tree = render(<TodayClosed store={closed(canonicalStore())} />);
    expect(byTestId(tree, 't3')).toBeTruthy();
    expect(byTestId(tree, 't3-expected')).toBeTruthy();
    expect(byTestId(tree, 't3-pill')).toBeTruthy();
  });

  it('adversarial: the lakh-scale expected figure is the engine figure', () => {
    const store = closed(adversarialStore());
    expect(expected(store)).toBe(formatPaise(store.expectedCash().value, { withSign: false }));
  });

  it('adversarial in Focus mode keeps every figure and every rail', () => {
    const store = closed(adversarialStore());
    const counts = (mode: 'comfort' | 'focus') => {
      const tree = render(<TodayClosed store={store} display={mode} />);
      return [figures(tree).length, rails(tree).length];
    };
    expect(counts('focus')).toEqual(counts('comfort'));
    expect(counts('comfort')).toEqual([FIGURE_IDS.length, ACT_SECTIONS.length]);
  });
});

/* ---- S-020-I18N · three languages, longest string, max font scale ----- */
describe('T3 in three languages, in longest string mode, at maximum font scale', () => {
  const LANGUAGES: readonly Language[] = ['en', 'hi', 'or'];

  for (const language of LANGUAGES) {
    it(language + ': the title, the line and the empty state are in that language', () => {
      const tree = render(<TodayClosed store={closed(canonicalStore())} language={language} />);
      expect(text(byTestId(tree, 't3-title'))).toBe(phrase('t3.title', language));
      expect(text(byTestId(tree, 't3-banner'))).toBe(phrase('t3.banner', language));
      expect(text(byTestId(tree, 't3-pill'))).toBe(phrase('t1.pill.closed', language));
      const empty = render(<TodayClosed store={closed(emptyStore())} language={language} />);
      expect(text(byTestId(empty, 't3-empty'))).toBe(phrase('t3.empty', language));
    });
  }

  it('longest string mode renders the whole screen without dropping a figure or a rail', () => {
    const store = closed(adversarialStore());
    const counts = (l: 'en' | 'longest') => {
      const tree = render(<TodayClosed store={store} language={l} display="focus" />);
      return [figures(tree).length, rails(tree).length];
    };
    expect(counts('longest')).toEqual(counts('en'));
  });

  it('chrome is capped at the maximum font scale; money is not', () => {
    const tree = render(<TodayClosed store={closed(canonicalStore())} language="longest" />);
    expect(byTestId(tree, 't3-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    const money = byTestId(tree, 't3-expected');
    expect(money.props?.maxFontSizeMultiplier).toBeUndefined();
    expect(money.props?.allowFontScaling).toBe(true);
  });
});

/* ---- S-020-A11Y · contrast, touch target, text size ------------------- */
describe('T3 meets contrast, touch target and text size, from the registry', () => {
  const TREES = () => [
    render(<TodayClosed store={closed(canonicalStore())} />),
    render(<TodayClosed store={closed(adversarialStore())} display="focus" />),
    render(<TodayClosed store={closed(emptyStore())} />),
    render(<TodayClosed store={closed(canonicalStore())} status="error" />),
    render(<TodayClosed store={closed(canonicalStore())} status="loading" />),
  ];

  it('every interactive element asks for at least TOUCH_TARGET_MIN_DP, disabled ones included', () => {
    for (const tree of TREES()) expect(undersizedTargets(tree)).toEqual([]);
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('no text is under the registry floor', () => {
    for (const tree of TREES()) expect(undersizedText(tree)).toEqual([]);
  });

  it('every colour clears the contrast minimum, including the disabled rails', () => {
    for (const tree of TREES()) expect(failingContrast(tree)).toEqual([]);
  });
});

/* ---- S-020-KEYPAD · nothing is entered on a frozen day ---------------- */
describe('T3 is not an entry screen, so it has no keypad beside its bottom navigation', () => {
  it('there is no keypad on a closed day', () => {
    const tree = render(<TodayClosed store={closed(canonicalStore())} />);
    expect(all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('keypad'))).toEqual(
      [],
    );
  });

  it('the nav is C-5s three tabs, with Today live - a closed day is still Today', () => {
    /*
     * §B.6 forbids a keypad BESIDE a bottom navigation, and the test above
     * already establishes that this screen has no keypad. SPEC-DIGEST C-5
     * rules that a nav exists and that it has three tabs. A closed day is one
     * of the three Today faces, so it carries them with Today live.
     */
    const tree = render(<TodayClosed store={closed(canonicalStore())} />);
    expect(
      all(tree)
        .map((n) => String(n.props?.testID ?? ''))
        .filter((id) => /^bottom-nav-/.test(id)),
    ).toEqual(['bottom-nav-today', 'bottom-nav-parties', 'bottom-nav-reports']);
    expect(byTestId(tree, 'bottom-nav-today').props?.accessibilityState?.selected).toBe(true);
  });

  it('the closed-day rails are disabled tiles, never silently inert - E2', () => {
    const tree = render(<TodayClosed store={closed(canonicalStore())} />);
    const tiles = all(tree).filter((n) => /^t3-rail-/.test(String(n.props?.testID ?? '')));
    expect(tiles).toHaveLength(ACT_SECTIONS.length);
    for (const rail of tiles) {
      expect(rail.props?.accessibilityState?.disabled).toBe(true);
      expect(rail.props?.disabled).toBe(true);
    }
    expect(byTestId(tree, 't3-banner')).toBeTruthy();
  });
});
