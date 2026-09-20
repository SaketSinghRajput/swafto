/**
 * T7 FORM A - the §B.6 bar, one describe block per child.
 *
 * The eight children of S-010 are not eight sections of prose, they are eight
 * assertions, and each block below is the one that makes its child tickable. A
 * block that could be deleted without any box changing would be decoration.
 *
 * WHY THE STORE IS REAL AND NOTHING ELSE IS MOCKED. The screen takes a Store and
 * the Store takes a persistence port; the in-memory port IS the real store with a
 * different tail. Mocking the store would test that the screen calls a function,
 * which is not the thing anybody is worried about. The thing anybody is worried
 * about is whether the figure on screen moves when the day does, and that needs the
 * engine underneath it.
 */
import { describe, it, expect } from 'vitest';
import { FormA } from './T7.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { canonicalStore, adversarialStore, emptyStore } from './registry.tsx';
import { CANONICAL_DATE } from '@swafto/fixtures';
import { formatPaise, type Entry } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, BODY_TEXT_MIN_SP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { STRINGS, phrase, type StringKey, type Language } from '../i18n/strings.ts';

const SALES = ['cash_sales', 'upi_sales', 'udhar_sales'];
const rowCount = (tree: ReturnType<typeof render>): number =>
  all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('t7-line-')).length;

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

/* ================================================================== *
 * S-010-STATES · all four states exist: loading, empty, error, loaded
 * ================================================================== */
describe('T7 renders all four states, and empty is derived rather than declared', () => {
  it('loading: an indicator and a label, and no figure pretending to be zero', () => {
    const tree = render(<FormA store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 't7-loading')).toBeTruthy();
    expect(byType(tree, 'ActivityIndicator')).toHaveLength(1);
    // Nothing that looks like money may appear while the day is still opening.
    expect(text(tree)).not.toContain('₹');
  });

  it('error: says nothing was lost, and offers a way back', () => {
    const tree = render(<FormA store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 't7-error')).toBeTruthy();
    expect(byTestId(tree, 't7-retry')).toBeTruthy();
    expect(text(tree)).toContain('lost');
  });

  it('empty: a ready day with no sales shows the empty state, not a blank panel', () => {
    const tree = render(<FormA store={emptyStore()} />);
    expect(byTestId(tree, 't7-empty')).toBeTruthy();
    expect(rowCount(tree)).toBe(0);
  });

  it('loaded: every sales entry in the store has a row, and nothing else does', () => {
    const store = canonicalStore();
    const tree = render(<FormA store={store} />);
    const sales = store.state.entries.filter((e) => SALES.includes(e.section));
    expect(rowCount(tree)).toBe(sales.length);
    expect(rowCount(tree)).toBeGreaterThan(0);
    // A purchase or an expense appearing on the sales form would be a silent lie.
    expect(rowCount(tree)).toBeLessThan(store.state.entries.length);
  });

  it('the empty state is derived from the entries, not from a status nobody sets', () => {
    // Same status, opposite outcome: only the data differs.
    const withData = render(<FormA store={canonicalStore()} status="ready" />);
    const without = render(<FormA store={emptyStore()} status="ready" />);
    expect(all(without).some((n) => n.props?.testID === 't7-empty')).toBe(true);
    expect(all(withData).some((n) => n.props?.testID === 't7-empty')).toBe(false);
  });
});

/* ================================================================== *
 * S-010-WIRED · every displayed figure traced to the engine
 * ================================================================== */
describe('every figure on T7 is wired to the engine through the real store', () => {
  it('mutates the store and the running total moves with it', () => {
    const store = canonicalStore();
    const before = text(byTestId(render(<FormA store={store} />), 't7-running-total'));

    store.append(cashSale('t7-wired-1', 250000));

    const after = text(byTestId(render(<FormA store={store} />), 't7-running-total'));
    expect(after).not.toBe(before);
    // Not merely different - it is exactly what the engine says P4 now is.
    expect(after).toBe(formatPaise(store.primary().p4NetSales.value, { withSign: false }));
  });

  it('mutates the store and a row appears for the new entry', () => {
    const store = canonicalStore();
    const before = rowCount(render(<FormA store={store} />));

    store.append(cashSale('t7-wired-2', 100));

    const tree = render(<FormA store={store} />);
    expect(rowCount(tree)).toBe(before + 1);
    expect(byTestId(tree, 't7-line-t7-wired-2')).toBeTruthy();
  });

  it('holds no figure of its own - the total is asked for on every render', () => {
    const store = canonicalStore();
    render(<FormA store={store} />);
    const revisionBefore = store.revision;
    store.append(cashSale('t7-wired-3', 50000));
    expect(store.revision).toBe(revisionBefore + 1);
    expect(text(byTestId(render(<FormA store={store} />), 't7-running-total'))).toBe(
      formatPaise(store.primary().p4NetSales.value, { withSign: false }),
    );
  });

  it('the running total is P4 itself, never a sum of the rows on screen', () => {
    const store = canonicalStore();
    const tree = render(<FormA store={store} />);
    expect(text(byTestId(tree, 't7-running-total'))).toBe(
      formatPaise(store.primary().p4NetSales.value, { withSign: false }),
    );
  });

  it('the draft amount shown is the draft passed in, formatted by the one money path', () => {
    const tree = render(<FormA store={canonicalStore()} draftPaise={123456} />);
    expect(text(byTestId(tree, 't7-draft-amount'))).toBe(formatPaise(123456, { withSign: false }));
  });
});

/* ================================================================== *
 * S-010-FIXTURES · renders against BOTH fixtures
 * ================================================================== */
describe('T7 renders against both fixture shops, canonical and adversarial', () => {
  it('canonical: renders and shows its sales rows', () => {
    const tree = render(<FormA store={canonicalStore()} />);
    expect(byTestId(tree, 't7')).toBeTruthy();
    expect(byTestId(tree, 't7-running-total')).toBeTruthy();
  });

  it('adversarial: renders, and a long party name is shown whole', () => {
    const store = adversarialStore();
    const tree = render(<FormA store={store} />);
    expect(byTestId(tree, 't7')).toBeTruthy();

    const credit = store.state.entries.filter((e) => e.section === 'udhar_sales' && e.partyId);
    expect(credit.length).toBeGreaterThan(0);
    for (const e of credit) {
      const party = store.state.parties.find((p) => p.id === e.partyId);
      if (!party) continue;
      // Whole, not elided: a truncated name on a credit line costs somebody money.
      expect(text(tree)).toContain(party.name);
      const row = byTestId(tree, 't7-line-' + e.id);
      const label = row.children.find((c) => c.type === 'Text');
      expect(label?.props?.numberOfLines).toBeUndefined();
      expect(label?.props?.ellipsizeMode).toBeUndefined();
    }
  });

  it('adversarial: the running total is the engine figure even past a lakh, where DC-002 bites', () => {
    const store = adversarialStore();
    const tree = render(<FormA store={store} />);
    expect(text(byTestId(tree, 't7-running-total'))).toBe(
      formatPaise(store.primary().p4NetSales.value, { withSign: false }),
    );
  });

  it('adversarial: the same screen in Focus mode still renders every row', () => {
    const store = adversarialStore();
    expect(rowCount(render(<FormA store={store} display="focus" />))).toBe(
      rowCount(render(<FormA store={store} display="comfort" />)),
    );
  });
});

/* ================================================================== *
 * S-010-I18N · three languages, longest string mode, maximum font scale
 * ================================================================== */
describe('T7 in three languages, in longest string mode, at maximum font scale', () => {
  const LANGUAGES: readonly Language[] = ['en', 'hi', 'or'];

  for (const language of LANGUAGES) {
    it(language + ': renders without falling back to another language', () => {
      const tree = render(<FormA store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 't7-title'))).toBe(phrase('formA.title', language));
      const empty = render(<FormA store={emptyStore()} language={language} />);
      expect(text(byTestId(empty, 't7-empty'))).toBe(phrase('formA.empty', language));
    });
  }

  it('the three languages are actually different - a missing translation would pass silently otherwise', () => {
    const titles = LANGUAGES.map((l) => phrase('formA.title', l));
    expect(new Set(titles).size).toBe(LANGUAGES.length);
  });

  it('longest string mode picks the longest rendering of each key independently', () => {
    for (const key of Object.keys(STRINGS) as StringKey[]) {
      const longest = phrase(key, 'longest');
      const lengths = LANGUAGES.map((l) => [...phrase(key, l)].length);
      expect([...longest].length).toBe(Math.max(...lengths));
    }
  });

  it('longest string mode is not merely the Odia column - that is why it exists', () => {
    // If it were, a key whose English or Hindi runs longer would be under-tested.
    const keys = Object.keys(STRINGS) as StringKey[];
    expect(keys.some((k) => phrase(k, 'longest') !== phrase(k, 'or'))).toBe(true);
  });

  it('longest string mode renders the whole screen without dropping a row', () => {
    const store = canonicalStore();
    expect(rowCount(render(<FormA store={store} language="longest" />))).toBe(
      rowCount(render(<FormA store={store} language="en" />)),
    );
  });

  it('chrome is capped at the maximum font scale; money is never capped', () => {
    const tree = render(<FormA store={canonicalStore()} />);
    const money = byTestId(tree, 't7-running-total');
    // Content grows with the reader's setting. Capping it would choose our layout
    // over his eyesight, which is the whole reason the chrome cap exists.
    expect(money.props?.maxFontSizeMultiplier).toBeUndefined();
    expect(money.props?.allowFontScaling).toBe(true);

    expect(byTestId(tree, 't7-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });

  it('every chrome label carries the cap, not only the ones somebody remembered', () => {
    const tree = render(<FormA store={canonicalStore()} />);
    const uncapped = all(tree)
      .filter((n) => n.type === 'Text')
      .filter((n) => n.props?.allowFontScaling !== true)
      .filter((n) => n.props?.maxFontSizeMultiplier === undefined)
      .map((n) => n.text.slice(0, 24));
    expect(uncapped).toEqual([]);
  });
});

/* ================================================================== *
 * S-010-A11Y · contrast, touch target and text size
 * ================================================================== */
describe('T7 meets contrast, touch target and text size, with the values from the registry', () => {
  const TREES = () => [
    render(<FormA store={canonicalStore()} />),
    render(<FormA store={adversarialStore()} display="focus" />),
    render(<FormA store={emptyStore()} />),
    render(<FormA store={canonicalStore()} status="error" />),
    render(<FormA store={canonicalStore()} status="loading" />),
  ];

  it('every interactive element asks for at least TOUCH_TARGET_MIN_DP on both axes', () => {
    for (const tree of TREES()) expect(undersizedTargets(tree)).toEqual([]);
    // The registry value is what was checked, not a number copied into this file.
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('no text on the screen is smaller than the registry floor', () => {
    for (const tree of TREES()) expect(undersizedText(tree)).toEqual([]);
    expect(BODY_TEXT_MIN_SP).toBeGreaterThan(0);
  });

  it('every text colour clears the contrast minimum against what is behind it', () => {
    for (const tree of TREES()) expect(failingContrast(tree)).toEqual([]);
  });

  it('the keypad keys are each at least TOUCH_TARGET_MIN_DP - the smallest targets here', () => {
    const tree = render(<FormA store={canonicalStore()} />);
    const keys = all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('keypad-'));
    expect(keys.length).toBe(12);
    for (const k of keys) {
      const style = (k.props?.style ?? {}) as Record<string, number>;
      expect(style.minHeight).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN_DP);
      expect(style.minWidth).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN_DP);
    }
  });

  it('every interactive element has a label a screen reader can announce', () => {
    const tree = render(<FormA store={canonicalStore()} />);
    const unlabelled = all(tree)
      .filter((n) => n.type === 'Pressable')
      .filter((n) => !n.props?.accessibilityLabel)
      .map((n) => String(n.props?.testID ?? n.type));
    expect(unlabelled).toEqual([]);
  });
});

/* ================================================================== *
 * S-010-KEYPAD · keypad present, and never beside a bottom nav
 * ================================================================== */
describe('T7 is an entry screen, so it has the keypad and no bottom navigation', () => {
  it('the keypad is present', () => {
    expect(byTestId(render(<FormA store={canonicalStore()} />), 'keypad')).toBeTruthy();
  });

  it('there is no bottom nav anywhere on it - the pair specified wrongly before', () => {
    const tree = render(<FormA store={canonicalStore()} />);
    const navish = all(tree)
      .map((n) => String(n.props?.testID ?? ''))
      .filter((id) => /nav|tabbar|tab-bar|bottom-bar/i.test(id));
    expect(navish).toEqual([]);
    expect(all(tree).filter((n) => n.props?.accessibilityRole === 'tablist')).toEqual([]);
  });

  it('the keypad reports the key pressed and decides nothing itself', () => {
    const pressed: string[] = [];
    const tree = render(<FormA store={canonicalStore()} onKey={(k) => pressed.push(k)} />);
    byTestId(tree, 'keypad-7').props.onPress();
    byTestId(tree, 'keypad-back').props.onPress();
    byTestId(tree, 'keypad-clear').props.onPress();
    expect(pressed).toEqual(['7', 'back', 'clear']);
  });

  it('has no decimal key - a decimal typed into a cash figure is the hundred-fold error', () => {
    const tree = render(<FormA store={canonicalStore()} />);
    const ids = all(tree)
      .map((n) => String(n.props?.testID ?? ''))
      .filter((id) => id.startsWith('keypad-'));
    expect(ids).not.toContain('keypad-.');
    expect(ids.filter((i) => /^keypad-\d$/.test(i))).toHaveLength(10);
  });

  it('committing reports the payment mode and appends nothing by itself', () => {
    const store = canonicalStore();
    const committed: string[] = [];
    const before = store.state.entries.length;
    const tree = render(<FormA store={store} onCommit={(m) => committed.push(m)} />);
    byTestId(tree, 't7-commit-udhar').props.onPress();
    expect(committed).toEqual(['udhar']);
    // The screen does not write. Writing is the caller's, through the parsers.
    expect(store.state.entries.length).toBe(before);
  });
});
