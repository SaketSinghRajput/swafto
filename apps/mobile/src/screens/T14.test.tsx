/**
 * T14 THE DAY, CLOSED - the §B.6 bar.
 *
 * THE WITHDRAWAL IS WHY THIS SCREEN IS SPECIFIED SEPARATELY. D3: money the owner
 * took is not a cost of running the shop, so it is not inside profit - and a
 * summary that quietly folded it in would tell him the shop is doing worse than
 * it is. It is shown plainly, below the profit line, with a sentence saying it
 * was not deducted, because a figure sitting under a total reads as part of it.
 *
 * Nothing here is editable. A closed day is frozen; the correction path is a new
 * entry against today that references this one.
 */
import { describe, it, expect } from 'vitest';
import { DayClosed } from './T14.tsx';
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
    createdAt: CANONICAL_DATE + 'T21:00:00.000Z',
  }) as Entry;

describe('T14 renders all four states', () => {
  it('loading', () => {
    const tree = render(<DayClosed store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 't14-loading')).toBeTruthy();
    expect(byType(tree, 'ActivityIndicator')).toHaveLength(1);
  });

  it('error', () => {
    expect(
      byTestId(render(<DayClosed store={canonicalStore()} status="error" />), 't14-error'),
    ).toBeTruthy();
  });

  it('loaded: the five figures a closed day is about', () => {
    const tree = render(<DayClosed store={canonicalStore()} />);
    for (const id of [
      't14-net-sales',
      't14-purchases',
      't14-expenses',
      't14-credit-outstanding',
      't14-withdrawal',
    ]) {
      expect(byTestId(tree, id), id).toBeTruthy();
    }
  });

  it('a day with nothing in it still closes, and still shows its figures', () => {
    const tree = render(<DayClosed store={emptyStore()} />);
    expect(byTestId(tree, 't14-headline')).toBeTruthy();
    expect(byTestId(tree, 't14-net-sales')).toBeTruthy();
  });
});

describe('D3 - the withdrawal is shown, and it is not inside the profit', () => {
  it('mutates the store with a withdrawal and the profit does not move', () => {
    const store = canonicalStore();
    const before = text(byTestId(render(<DayClosed store={store} />), 't14-headline'));

    store.append(withdrawal('t14-1', 500000));

    const tree = render(<DayClosed store={store} />);
    // Profit is unchanged...
    expect(text(byTestId(tree, 't14-headline'))).toBe(before);
    // ...and the money is still shown, on its own line.
    expect(text(byTestId(tree, 't14-withdrawal'))).toContain(
      formatPaise(store.sectionTotal('withdrawal'), { withSign: false }),
    );
  });

  it('the note says it was not deducted, in words', () => {
    const tree = render(<DayClosed store={canonicalStore()} />);
    expect(text(byTestId(tree, 't14-withdrawal-note'))).toBe(phrase('t14.withdrawalNote', 'en'));
  });

  it('every figure is the engine figure', () => {
    const store = canonicalStore();
    const tree = render(<DayClosed store={store} />);
    const p = store.primary();
    expect(text(byTestId(tree, 't14-headline'))).toBe(
      formatPaise(p.estimatedProfit.value, { withSign: false }),
    );
    expect(text(byTestId(tree, 't14-net-sales'))).toContain(
      formatPaise(p.p4NetSales.value, { withSign: false }),
    );
    expect(text(byTestId(tree, 't14-credit-outstanding'))).toContain(
      formatPaise(p.p7CreditOutstanding.value, { withSign: false }),
    );
  });
});

describe('T14 against both fixtures and every language', () => {
  it('adversarial: renders at lakh scale', () => {
    const store = adversarialStore();
    expect(text(byTestId(render(<DayClosed store={store} />), 't14-headline'))).toBe(
      formatPaise(store.primary().estimatedProfit.value, { withSign: false }),
    );
  });

  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title and the note are in that language', () => {
      const tree = render(<DayClosed store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 't14-title'))).toBe(phrase('t14.title', language));
      expect(text(byTestId(tree, 't14-withdrawal-note'))).toBe(
        phrase('t14.withdrawalNote', language),
      );
    });
  }

  it('longest string mode keeps the note and every row', () => {
    const tree = render(<DayClosed store={adversarialStore()} language="longest" display="focus" />);
    expect(byTestId(tree, 't14-withdrawal-note')).toBeTruthy();
    expect(byTestId(tree, 't14-net-sales')).toBeTruthy();
  });

  it('chrome is capped; money is not', () => {
    const tree = render(<DayClosed store={canonicalStore()} />);
    expect(byTestId(tree, 't14-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 't14-headline').props?.maxFontSizeMultiplier).toBeUndefined();
  });
});

describe('T14 accessibility, and the fact that nothing on it is editable', () => {
  const TREES = () => [
    render(<DayClosed store={canonicalStore()} />),
    render(<DayClosed store={adversarialStore()} display="focus" />),
    render(<DayClosed store={emptyStore()} />),
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

  it('no keypad, no input and no bottom nav - a closed day is frozen', () => {
    const tree = render(<DayClosed store={canonicalStore()} />);
    expect(all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('keypad'))).toEqual([]);
    expect(all(tree).filter((n) => n.type === 'TextInput')).toEqual([]);
    expect(
      all(tree)
        .map((n) => String(n.props?.testID ?? ''))
        .filter((id) => /nav|tabbar|bottom-bar/i.test(id)),
    ).toEqual([]);
  });

  it('there is no action on it that could change a figure', () => {
    const tree = render(<DayClosed store={canonicalStore()} />);
    expect(all(tree).filter((n) => n.type === 'Pressable')).toEqual([]);
  });
});
