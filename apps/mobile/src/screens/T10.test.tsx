/**
 * T10 FORM D - the §B.6 bar.
 *
 * D3 IS THE WHOLE TEST. A withdrawal leaves the drawer, so it moves the cash
 * check; it is not a cost of running the shop, so it stays out of profit.
 * Recorded as an expense it would understate profit and tell the shopkeeper the
 * shop is doing worse than it is - the kind of wrong that changes what somebody
 * does next. The assertions below pin both halves, and the screen also says it
 * in words, because a distinction living only in the engine is one the user
 * cannot see.
 */
import { describe, it, expect } from 'vitest';
import { FormD } from './T10.tsx';
import { canonicalStore, adversarialStore, emptyStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { CANONICAL_DATE } from '@swafto/fixtures';
import { formatPaise, type Entry } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';

const withdrawal = (id: string, amount: number): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section: 'withdrawal',
    amount,
    mode: 'cash',
    source: 'manual',
    createdAt: CANONICAL_DATE + 'T19:30:00.000Z',
  }) as Entry;

const lines = (tree: ReturnType<typeof render>) =>
  all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('t10-line-'));

describe('T10 renders all four states', () => {
  it('loading', () => {
    const tree = render(<FormD store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 't10-loading')).toBeTruthy();
    expect(byType(tree, 'ActivityIndicator')).toHaveLength(1);
  });

  it('error', () => {
    expect(
      byTestId(render(<FormD store={canonicalStore()} status="error" />), 't10-error'),
    ).toBeTruthy();
  });

  it('empty: most days nobody takes anything', () => {
    expect(byTestId(render(<FormD store={emptyStore()} />), 't10-empty')).toBeTruthy();
  });

  it('loaded: withdrawals only', () => {
    const store = canonicalStore();
    store.append(withdrawal('t10-0', 100000));
    const tree = render(<FormD store={store} />);
    const taken = store.state.entries.filter((e) => e.section === 'withdrawal');
    expect(lines(tree)).toHaveLength(taken.length);
    expect(lines(tree).length).toBeLessThan(store.state.entries.length);
  });
});

describe('D3 - a withdrawal moves the cash check and not the profit', () => {
  it('mutates the store and the cash check moves', () => {
    const store = canonicalStore();
    const cashBefore = store.expectedCash().value;
    store.append(withdrawal('t10-1', 500000));
    expect(store.expectedCash().value).not.toBe(cashBefore);
  });

  it('mutates the store and the profit does NOT move', () => {
    const store = canonicalStore();
    const profitBefore = store.primary().estimatedProfit.value;
    store.append(withdrawal('t10-2', 500000));
    /*
     * The line D3 exists for. If this ever fails, the engine has started
     * treating the owner's own money as a cost of running the shop.
     */
    expect(store.primary().estimatedProfit.value).toBe(profitBefore);
  });

  it('the headline is the withdrawal total and follows the store', () => {
    const store = canonicalStore();
    store.append(withdrawal('t10-3', 250000));
    expect(text(byTestId(render(<FormD store={store} />), 't10-headline'))).toBe(
      formatPaise(store.sectionTotal('withdrawal'), { withSign: false }),
    );
  });

  it('the screen says so in words, not only in the arithmetic', () => {
    const tree = render(<FormD store={canonicalStore()} />);
    expect(text(byTestId(tree, 't10-note'))).toBe(phrase('t10.note', 'en'));
  });
});

describe('T10 against both fixtures and every language', () => {
  it('adversarial: renders', () => {
    expect(byTestId(render(<FormD store={adversarialStore()} />), 't10')).toBeTruthy();
  });

  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title and the note are in that language', () => {
      const tree = render(<FormD store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 't10-title'))).toBe(phrase('t10.title', language));
      expect(text(byTestId(tree, 't10-note'))).toBe(phrase('t10.note', language));
    });
  }

  it('longest string mode keeps the note and both buttons', () => {
    const tree = render(<FormD store={adversarialStore()} language="longest" display="focus" />);
    expect(byTestId(tree, 't10-note')).toBeTruthy();
    expect(
      all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('t10-commit-')),
    ).toHaveLength(2);
  });

  it('chrome is capped; money is not', () => {
    const tree = render(<FormD store={canonicalStore()} />);
    expect(byTestId(tree, 't10-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 't10-headline').props?.maxFontSizeMultiplier).toBeUndefined();
  });
});

describe('T10 accessibility and its keypad', () => {
  const TREES = () => [
    render(<FormD store={canonicalStore()} />),
    render(<FormD store={adversarialStore()} display="focus" />),
    render(<FormD store={emptyStore()} />),
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
    const tree = render(<FormD store={canonicalStore()} />);
    expect(byTestId(tree, 'keypad')).toBeTruthy();
    expect(
      all(tree)
        .map((n) => String(n.props?.testID ?? ''))
        .filter((id) => /nav|tabbar|bottom-bar/i.test(id)),
    ).toEqual([]);
  });

  it('cash and UPI only - a withdrawal is not taken on credit', () => {
    const committed: string[] = [];
    const tree = render(<FormD store={canonicalStore()} onCommit={(o) => committed.push(o.mode)} />);
    byTestId(tree, 't10-commit-cash-withdrawal').props.onPress();
    byTestId(tree, 't10-commit-upi-withdrawal').props.onPress();
    expect(committed).toEqual(['cash', 'upi']);
    expect(
      all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('t10-commit-')),
    ).toHaveLength(2);
  });
});
