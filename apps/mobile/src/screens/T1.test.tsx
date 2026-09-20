/**
 * T1 TODAY - the §B.6 bar.
 *
 * The cross-screen instruments in `screens.spec.tsx` already cover contrast,
 * touch target, text size, translations and numerals for every case in the
 * registry, T1 included. This file covers what is true of THIS screen and of no
 * other: what its figures mean, and what must not be on it.
 */
import { describe, it, expect } from 'vitest';
import { Today } from './T1.tsx';
import { canonicalStore, adversarialStore, emptyStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { CANONICAL_DATE } from '@swafto/fixtures';
import { formatPaise, type Entry } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';

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

const sectionRows = (tree: ReturnType<typeof render>) =>
  all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('t1-section-'));

/* ---- S-020-STATES · all four states --------------------------------- */
describe('T1 renders all four states, and empty is derived from the entries', () => {
  it('loading: an indicator, and no figure pretending to be zero', () => {
    const tree = render(<Today store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 't1-loading')).toBeTruthy();
    expect(byType(tree, 'ActivityIndicator')).toHaveLength(1);
    expect(text(tree)).not.toContain('₹');
  });

  it('error: says nothing was lost, and offers a way back', () => {
    const tree = render(<Today store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 't1-error')).toBeTruthy();
    expect(byTestId(tree, 't1-retry')).toBeTruthy();
    expect(text(tree)).toContain('lost');
  });

  it('empty: the first morning shows a prompt, not a blank panel', () => {
    expect(byTestId(render(<Today store={emptyStore()} />), 't1-empty')).toBeTruthy();
  });

  it('loaded: a row for every section that has something in it, and none for the rest', () => {
    const store = canonicalStore();
    const rows = sectionRows(render(<Today store={store} />));
    const used = new Set(store.state.entries.map((e) => e.section));
    expect(rows.length).toBe(used.size);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('the empty state is derived, not declared - same status, different data', () => {
    const withData = render(<Today store={canonicalStore()} status="ready" />);
    const without = render(<Today store={emptyStore()} status="ready" />);
    expect(all(without).some((n) => n.props?.testID === 't1-empty')).toBe(true);
    expect(all(withData).some((n) => n.props?.testID === 't1-empty')).toBe(false);
  });
});

/* ---- S-020-WIRED · every figure traced to the engine ----------------- */
describe('every figure on T1 is wired to the engine through the real store', () => {
  it('mutates the store and the headline cash figure moves with it', () => {
    const store = canonicalStore();
    const before = text(byTestId(render(<Today store={store} />), 't1-headline'));

    store.append(cashSale('t1-wired-1', 150000));

    const after = text(byTestId(render(<Today store={store} />), 't1-headline'));
    expect(after).not.toBe(before);
    expect(after).toBe(formatPaise(store.expectedCash().value, { withSign: false }));
  });

  it('mutates the store and the section row moves with it', () => {
    const store = canonicalStore();
    store.append(cashSale('t1-wired-2', 250000));
    const tree = render(<Today store={store} />);
    expect(text(byTestId(tree, 't1-section-cash_sales'))).toContain(
      formatPaise(store.sectionTotal('cash_sales'), { withSign: false }),
    );
  });

  it('the headline is expectedCash itself, asked for on every render', () => {
    const store = canonicalStore();
    expect(text(byTestId(render(<Today store={store} />), 't1-headline'))).toBe(
      formatPaise(store.expectedCash().value, { withSign: false }),
    );
  });

  it('profit is the engine figure, and carries its sign', () => {
    const store = canonicalStore();
    const tree = render(<Today store={store} />);
    expect(text(byTestId(tree, 't1-profit'))).toContain(
      formatPaise(store.primary().estimatedProfit.value, { withSign: true }),
    );
  });

  it('holds nothing of its own - a render after a write agrees with the store', () => {
    const store = canonicalStore();
    render(<Today store={store} />);
    const revision = store.revision;
    store.append(cashSale('t1-wired-3', 99));
    expect(store.revision).toBe(revision + 1);
    expect(text(byTestId(render(<Today store={store} />), 't1-headline'))).toBe(
      formatPaise(store.expectedCash().value, { withSign: false }),
    );
  });
});

/* ---- S-020-FIXTURES · both fixture shops ----------------------------- */
describe('T1 renders against both fixture shops, canonical and adversarial', () => {
  it('canonical: renders with its headline and its rows', () => {
    const tree = render(<Today store={canonicalStore()} />);
    expect(byTestId(tree, 't1')).toBeTruthy();
    expect(byTestId(tree, 't1-headline')).toBeTruthy();
  });

  it('adversarial: the lakh-scale headline is the engine figure', () => {
    const store = adversarialStore();
    expect(text(byTestId(render(<Today store={store} />), 't1-headline'))).toBe(
      formatPaise(store.expectedCash().value, { withSign: false }),
    );
  });

  it('adversarial in Focus mode keeps every row', () => {
    const store = adversarialStore();
    const rows = (mode: 'comfort' | 'focus') =>
      sectionRows(render(<Today store={store} display={mode} />)).length;
    expect(rows('focus')).toBe(rows('comfort'));
  });
});

/* ---- S-020-I18N · three languages, longest string, max font scale ---- */
describe('T1 in three languages, in longest string mode, at maximum font scale', () => {
  const LANGUAGES: readonly Language[] = ['en', 'hi', 'or'];

  for (const language of LANGUAGES) {
    it(language + ': the title and the empty state are in that language', () => {
      const tree = render(<Today store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 't1-title'))).toBe(phrase('t1.title', language));
      const empty = render(<Today store={emptyStore()} language={language} />);
      expect(text(byTestId(empty, 't1-empty'))).toBe(phrase('t1.empty', language));
    });
  }

  it('longest string mode renders the whole screen without dropping a row', () => {
    const store = adversarialStore();
    const rows = (l: 'en' | 'longest') =>
      sectionRows(render(<Today store={store} language={l} />)).length;
    expect(rows('longest')).toBe(rows('en'));
  });

  it('chrome is capped at the maximum font scale; money is not', () => {
    const tree = render(<Today store={canonicalStore()} />);
    expect(byTestId(tree, 't1-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    const money = byTestId(tree, 't1-headline');
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

  it('a section row is a real target - it is how he reaches the entry screen', () => {
    const row = byTestId(render(<Today store={canonicalStore()} />), 't1-section-cash_sales');
    const style = (row.props?.style ?? {}) as Record<string, number>;
    expect(style.minHeight).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN_DP);
    expect(row.props?.accessibilityLabel).toBeTruthy();
  });
});

/* ---- S-020-KEYPAD · no keypad here, and no nav beside it ------------- */
describe('T1 is not an entry screen, so it has no keypad and no bottom navigation', () => {
  it('there is no keypad on Today', () => {
    const tree = render(<Today store={canonicalStore()} />);
    expect(all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('keypad'))).toEqual(
      [],
    );
  });

  it('and no bottom nav either - the pair specified wrongly before', () => {
    const tree = render(<Today store={canonicalStore()} />);
    const navish = all(tree)
      .map((n) => String(n.props?.testID ?? ''))
      .filter((id) => /nav|tabbar|tab-bar|bottom-bar/i.test(id));
    expect(navish).toEqual([]);
    expect(all(tree).filter((n) => n.props?.accessibilityRole === 'tablist')).toEqual([]);
  });

  it('closing the day reports the intent and writes nothing itself', () => {
    const store = canonicalStore();
    const pressed: string[] = [];
    const before = store.state.entries.length;
    const tree = render(<Today store={store} onCloseDay={() => pressed.push('close')} />);
    byTestId(tree, 't1-close-day').props.onPress();
    expect(pressed).toEqual(['close']);
    expect(store.state.entries.length).toBe(before);
    expect(store.state.day.state).not.toBe('closed');
  });

  it('opening a section reports which one', () => {
    const opened: string[] = [];
    const tree = render(<Today store={canonicalStore()} onOpenSection={(x) => opened.push(x)} />);
    byTestId(tree, 't1-section-cash_sales').props.onPress();
    expect(opened).toEqual(['cash_sales']);
  });
});
