/**
 * T9 FORM C - the §B.6 bar.
 *
 * FIVE MODES, AND THE FIFTH IS WHY THIS SCREEN IS NOT FORM A. An expense paid
 * from shop stock never touches the cash box: it changes profit and leaves the
 * cash check alone. A form offering only cash and UPI would push the shopkeeper
 * into recording it as cash, and his drawer would stop reconciling for a reason
 * he could not find. So the assertion that matters most here is that all five
 * exist, and that shop stock behaves differently from the other four.
 */
import { describe, it, expect } from 'vitest';
import { FormC } from './T9.tsx';
import { canonicalStore, adversarialStore, emptyStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { CANONICAL_DATE } from '@swafto/fixtures';
import { formatPaise, type Entry } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';

const expense = (id: string, amount: number, mode: string, label: string): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section: 'expense',
    amount,
    mode,
    label,
    source: 'manual',
    createdAt: CANONICAL_DATE + 'T19:30:00.000Z',
  }) as unknown as Entry;

const lines = (tree: ReturnType<typeof render>) =>
  all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('t9-line-'));

describe('T9 renders all four states', () => {
  it('loading', () => {
    const tree = render(<FormC store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 't9-loading')).toBeTruthy();
    expect(byType(tree, 'ActivityIndicator')).toHaveLength(1);
  });

  it('error', () => {
    expect(byTestId(render(<FormC store={canonicalStore()} status="error" />), 't9-error')).toBeTruthy();
  });

  it('empty', () => {
    expect(byTestId(render(<FormC store={emptyStore()} />), 't9-empty')).toBeTruthy();
  });

  it('loaded: expenses only', () => {
    const store = canonicalStore();
    const tree = render(<FormC store={store} />);
    const expenses = store.state.entries.filter((e) => e.section === 'expense');
    expect(lines(tree)).toHaveLength(expenses.length);
    expect(lines(tree).length).toBeGreaterThan(0);
  });
});

describe('every figure on T9 is the engine figure', () => {
  it('mutates the store and the headline follows P6', () => {
    const store = canonicalStore();
    const before = text(byTestId(render(<FormC store={store} />), 't9-headline'));

    store.append(expense('t9-1', 12500, 'cash', 'Tea'));

    const after = text(byTestId(render(<FormC store={store} />), 't9-headline'));
    expect(after).not.toBe(before);
    expect(after).toBe(formatPaise(store.primary().p6TotalExpenses.value, { withSign: false }));
  });

  it('mutates the store and the line shows what the money was for', () => {
    const store = canonicalStore();
    store.append(expense('t9-2', 9900, 'cash', 'Auto to market'));
    // The label is the only thing distinguishing one expense from another.
    expect(text(byTestId(render(<FormC store={store} />), 't9-line-t9-2'))).toContain(
      'Auto to market',
    );
  });

  it('a shop-stock expense changes profit and leaves the cash check alone', () => {
    const store = canonicalStore();
    const cashBefore = store.expectedCash().value;
    const profitBefore = store.primary().estimatedProfit.value;

    store.append(expense('t9-3', 40000, 'shop_stock', 'Took rice for home cooking'));

    expect(store.expectedCash().value).toBe(cashBefore);
    expect(store.primary().estimatedProfit.value).not.toBe(profitBefore);
  });
});

describe('T9 against both fixtures and every language', () => {
  it('adversarial: renders', () => {
    expect(byTestId(render(<FormC store={adversarialStore()} />), 't9')).toBeTruthy();
  });

  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title is in that language', () => {
      const tree = render(<FormC store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 't9-title'))).toBe(phrase('t9.title', language));
    });
  }

  it('longest string mode keeps every line and every mode button', () => {
    const store = adversarialStore();
    const tree = render(<FormC store={store} language="longest" display="focus" />);
    expect(lines(tree)).toHaveLength(lines(render(<FormC store={store} />)).length);
    expect(
      all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('t9-commit-')),
    ).toHaveLength(5);
  });

  it('chrome is capped; money is not', () => {
    const tree = render(<FormC store={canonicalStore()} />);
    expect(byTestId(tree, 't9-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 't9-headline').props?.maxFontSizeMultiplier).toBeUndefined();
  });
});

describe('T9 accessibility and its keypad', () => {
  const TREES = () => [
    render(<FormC store={canonicalStore()} />),
    render(<FormC store={adversarialStore()} display="focus" />),
    render(<FormC store={emptyStore()} />),
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

  it('an entry screen: the keypad is present and there is no bottom nav', () => {
    const tree = render(<FormC store={canonicalStore()} />);
    expect(byTestId(tree, 'keypad')).toBeTruthy();
    expect(
      all(tree)
        .map((n) => String(n.props?.testID ?? ''))
        .filter((id) => /nav|tabbar|bottom-bar/i.test(id)),
    ).toEqual([]);
  });

  it('all five modes are offered, including shop stock', () => {
    const committed: string[] = [];
    const tree = render(<FormC store={canonicalStore()} onCommit={(o) => committed.push(o.mode)} />);
    for (const mode of ['cash', 'upi', 'other', 'udhar', 'shop_stock']) {
      byTestId(tree, 't9-commit-' + mode + '-expense').props.onPress();
    }
    expect(committed).toEqual(['cash', 'upi', 'other', 'udhar', 'shop_stock']);
  });
});
