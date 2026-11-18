/**
 * T19 A TYPED ADJUSTMENT (decision 2) - the §B.6 bar.
 *
 * THE ONE PROPERTY THAT MATTERS: two inputs and no third. A type from the fixed
 * list and an amount from the keypad; no text box, nothing pre-chosen, and the
 * chosen type's effect said before he saves. Driven through `<App session>` from
 * T5's own "Add adjustment", against the real store.
 *
 * The session cases came here from apps/mobile/test/day-facts.spec.tsx, where
 * they were written while the screen was still numbered T18.
 */
import { describe, it, expect } from 'vitest';
import { Adjustment } from './T19.tsx';
import { canonicalStore, adversarialStore, closedStore } from './registry.tsx';
import { Session } from '../app/session.tsx';
import { App } from '../app/App.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { CANONICAL_DATE } from '@swafto/fixtures';
import { ADJUSTMENT_TYPES, adjustmentKey, subtract } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language, type StringKey } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

const T0 = CANONICAL_DATE + 'T21:00:00.000Z';

const sessionOn = (store: Store): Session => {
  let n = 0;
  return new Session(store, { now: () => T0, newId: () => 'n' + String(++n) });
};

const press = (s: Session, testID: string) => byTestId(render(<App session={s} />), testID).props.onPress();

const typeRows = (tree: ReturnType<typeof render>) =>
  all(tree).filter((n) => /^t19-type-/.test(String(n.props?.testID ?? '')));

describe('T19 renders all four states', () => {
  it('loading', () => {
    const tree = render(<Adjustment store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 't19-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error', () => {
    expect(byTestId(render(<Adjustment store={canonicalStore()} status="error" />), 't19-error')).toBeTruthy();
  });

  it('empty: nothing pre-chosen, nothing pre-filled, nothing to save', () => {
    const tree = render(<Adjustment store={canonicalStore()} />);
    expect(all(tree).some((n) => n.props?.testID === 't19-effect')).toBe(false);
    expect(byTestId(tree, 't19-save').props.disabled).toBe(true);
    for (const row of typeRows(tree)) expect(row.props.accessibilityState.selected).toBe(false);
  });

  it('loaded: the whole fixed list, and the chosen type says what it moves', () => {
    const tree = render(<Adjustment store={canonicalStore()} type="counterfeit_note" amountPaise={50000} />);
    expect(typeRows(tree)).toHaveLength(ADJUSTMENT_TYPES.length);
    expect(text(byTestId(tree, 't19-effect'))).toBe(phrase('adjust.effect.counterfeit_note', 'en'));
  });
});

describe('T19 - a type and an amount, nothing else', () => {
  it('save is disabled until a type AND an amount, and there is no text input', () => {
    const none = render(<Adjustment store={canonicalStore()} amountPaise={5000} />);
    expect(byTestId(none, 't19-save').props.disabled).toBe(true);
    const noAmount = render(<Adjustment store={canonicalStore()} type="home_use" />);
    expect(byTestId(noAmount, 't19-save').props.disabled).toBe(true);
    const ready = render(<Adjustment store={canonicalStore()} type="home_use" amountPaise={5000} />);
    expect(byTestId(ready, 't19-save').props.disabled).toBe(false);
    expect(text(byTestId(ready, 't19-effect'))).toMatch(/No cash moves/);
    expect(all(ready).some((n) => n.type === 'TextInput')).toBe(false);
  });

  it('from T5: nothing pre-chosen; type and keypad amount save, mutates the store, and land back on T5', () => {
    const store = canonicalStore();
    const s = sessionOn(store);
    const before = store.expectedCash().value;
    s.goTo('T5');
    press(s, 't5-adjust-add');
    expect(s.state.screen).toBe('T19');
    expect(s.state.adjustmentType).toBeNull();
    for (const d of '500') s.press(d as '5');
    expect(s.saveAdjustment()).toBe(false); // no type chosen yet
    expect(s.state.screen).toBe('T19');
    press(s, 't19-type-counterfeit_note');
    press(s, 't19-save');
    expect(s.state.screen).toBe('T5');
    expect(store.expectedCash().value).toBe(subtract(before, 50000));
    expect(store.state.adjustments?.[0]).toEqual({
      id: expect.any(String),
      dayId: store.state.day.date,
      type: 'counterfeit_note',
      amount: 50000,
      createdAt: T0,
    });
  });

  it('back from T19 is T5', () => {
    const s = sessionOn(canonicalStore());
    s.goTo('T19');
    s.back();
    expect(s.state.screen).toBe('T5');
  });

  it('a closed day offers no control that would only throw: no keypad, no save, the list disabled', () => {
    const tree = render(<Adjustment store={closedStore()} type="home_use" amountPaise={5000} />);
    expect(all(tree).some((n) => n.props?.testID === 'keypad')).toBe(false);
    expect(all(tree).some((n) => n.props?.testID === 't19-save')).toBe(false);
    for (const row of typeRows(tree)) expect(row.props.disabled).toBe(true);
  });
});

describe('T19 against both fixtures and every language', () => {
  it('adversarial: the list and a lakh-scale amount render', () => {
    const tree = render(<Adjustment store={adversarialStore()} type="stock_written_off" amountPaise={1234567800} />);
    expect(typeRows(tree)).toHaveLength(ADJUSTMENT_TYPES.length);
    expect(byTestId(tree, 't19-amount-figure')).toBeTruthy();
  });

  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title, the prompt and every type are in that language', () => {
      const tree = render(<Adjustment store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 't19-title'))).toBe(phrase('t19.title', language));
      expect(text(byTestId(tree, 't19-prompt'))).toBe(phrase('t19.type', language));
      for (const k of ADJUSTMENT_TYPES) {
        expect(text(byTestId(tree, 't19-type-' + k))).toBe(phrase(adjustmentKey(k) as StringKey, language));
      }
    });
  }

  it('longest string mode keeps the prompt, every type and the effect line', () => {
    const tree = render(
      <Adjustment store={adversarialStore()} language="longest" display="focus" type="rounding_kept" amountPaise={500} />,
    );
    expect(byTestId(tree, 't19-prompt')).toBeTruthy();
    expect(byTestId(tree, 't19-effect')).toBeTruthy();
    expect(typeRows(tree)).toHaveLength(ADJUSTMENT_TYPES.length);
  });

  it('chrome is capped; money is not', () => {
    const tree = render(<Adjustment store={canonicalStore()} type="home_use" amountPaise={5000} />);
    expect(byTestId(tree, 't19-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 't19-amount-figure').props?.maxFontSizeMultiplier).toBeUndefined();
  });
});

describe('T19 accessibility and its keypad', () => {
  const TREES = () => [
    render(<Adjustment store={canonicalStore()} />),
    render(<Adjustment store={adversarialStore()} display="focus" type="counterfeit_note" amountPaise={50000} />),
    render(<Adjustment store={closedStore()} />),
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

  it('an entry screen: the keypad is there on an open day, and never beside a bottom nav', () => {
    const [open, , closed] = TREES();
    expect(byTestId(open!, 'keypad')).toBeTruthy();
    for (const tree of [open!, closed!]) {
      expect(
        all(tree)
          .map((n) => String(n.props?.testID ?? ''))
          .filter((id) => /nav|tabbar|bottom-bar/i.test(id)),
      ).toEqual([]);
    }
  });
});
