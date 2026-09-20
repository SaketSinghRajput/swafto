/**
 * T12 THE DIFFERENCE - the §B.6 bar.
 *
 * ONE RULE, ENFORCED HERE AS WELL AS IN THE STORE AND THE API: a difference
 * cannot be closed without a reason. Three layers, because constraint 3 taught
 * this build that one is not enough - and this layer is the one that has to make
 * the rule VISIBLE, by refusing to offer an action that would be rejected.
 *
 * The copy is checked too. "What do you think happened?" and not "your cash does
 * not match": he is the one who counted, and the app is the one that might be
 * wrong. A screen that accuses him is a screen he stops opening, and then the
 * whole ledger stops being true.
 */
import { describe, it, expect } from 'vitest';
import { CashDifference } from './T12.tsx';
import { canonicalStore, adversarialStore, emptyStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { formatPaise, subtract, add } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';

/** A count short of the engine figure by a noticeable amount. */
const shortBy = (expected: number, amount: number) => subtract(expected, amount);

describe('T12 renders all four states', () => {
  it('loading', () => {
    const tree = render(
      <CashDifference store={canonicalStore()} countedPaise={0} status="loading" />,
    );
    expect(byTestId(tree, 't12-loading')).toBeTruthy();
    expect(byType(tree, 'ActivityIndicator')).toHaveLength(1);
  });

  it('error', () => {
    expect(
      byTestId(
        render(<CashDifference store={canonicalStore()} countedPaise={0} status="error" />),
        't12-error',
      ),
    ).toBeTruthy();
  });

  it('loaded: expected, counted, and the gap between them', () => {
    const store = canonicalStore();
    const expected = store.expectedCash().value;
    const counted = shortBy(expected, 30000);
    const tree = render(<CashDifference store={store} countedPaise={counted} />);
    expect(text(byTestId(tree, 't12-expected'))).toContain(
      formatPaise(expected, { withSign: false }),
    );
    expect(text(byTestId(tree, 't12-counted'))).toContain(
      formatPaise(counted, { withSign: false }),
    );
  });

  it('an empty shop can still be counted, and still shows its figures', () => {
    const tree = render(<CashDifference store={emptyStore()} countedPaise={100} />);
    expect(byTestId(tree, 't12-expected')).toBeTruthy();
    expect(byTestId(tree, 't12-headline')).toBeTruthy();
  });
});

describe('the difference is the engine figure, signed', () => {
  it('a short count reads negative', () => {
    const store = canonicalStore();
    const tree = render(
      <CashDifference store={store} countedPaise={shortBy(store.expectedCash().value, 30000)} />,
    );
    expect(text(byTestId(tree, 't12-headline'))).toBe(
      formatPaise(subtract(0, 30000), { withSign: false }),
    );
  });

  it('an over count reads positive', () => {
    const store = canonicalStore();
    const tree = render(
      <CashDifference store={store} countedPaise={add(store.expectedCash().value, 500)} />,
    );
    expect(text(byTestId(tree, 't12-headline'))).toBe(formatPaise(500, { withSign: false }));
  });

  it('mutates the store and the expectation moves, so the gap opens', () => {
    const store = canonicalStore();
    const counted = store.expectedCash().value;
    const before = text(
      byTestId(render(<CashDifference store={store} countedPaise={counted} />), 't12-headline'),
    );

    store.append({
      id: 't12-1',
      dayId: store.state.day.date,
      section: 'cash_sales',
      amount: 25000,
      mode: 'cash',
      source: 'manual',
      createdAt: store.state.day.date + 'T20:00:00.000Z',
    } as never);

    const after = text(
      byTestId(render(<CashDifference store={store} countedPaise={counted} />), 't12-headline'),
    );
    // The count did not change; the expectation did, so the gap opened.
    expect(after).not.toBe(before);
  });
});

describe('a difference cannot be closed without a reason', () => {
  it('the close action is dead while there is a gap and no reason', () => {
    const store = canonicalStore();
    const tree = render(
      <CashDifference store={store} countedPaise={shortBy(store.expectedCash().value, 30000)} />,
    );
    expect(byTestId(tree, 't12-close').props?.disabled).toBe(true);
  });

  it('and comes alive once a reason is given', () => {
    const store = canonicalStore();
    const tree = render(
      <CashDifference
        store={store}
        countedPaise={shortBy(store.expectedCash().value, 30000)}
        reason="gave change from my pocket"
      />,
    );
    expect(byTestId(tree, 't12-close').props?.disabled).toBe(false);
  });

  it('whitespace is not a reason', () => {
    const store = canonicalStore();
    const tree = render(
      <CashDifference
        store={store}
        countedPaise={shortBy(store.expectedCash().value, 30000)}
        reason="   "
      />,
    );
    expect(byTestId(tree, 't12-close').props?.disabled).toBe(true);
  });

  it('a day that balances needs no reason at all', () => {
    const store = canonicalStore();
    const tree = render(
      <CashDifference store={store} countedPaise={store.expectedCash().value} />,
    );
    expect(byTestId(tree, 't12-close').props?.disabled).toBe(false);
  });

  it('the prompt is a question, never a verdict', () => {
    const tree = render(<CashDifference store={canonicalStore()} countedPaise={0} />);
    const prompt = text(byTestId(tree, 't12-prompt'));
    expect(prompt).toBe(phrase('t12.reasonPrompt', 'en'));
    expect(prompt.toLowerCase()).not.toContain('wrong');
    expect(prompt.toLowerCase()).not.toContain('missing');
  });

  it('choosing a quick reason reports it, and free text stays available', () => {
    const chosen: string[] = [];
    const typed: string[] = [];
    const tree = render(
      <CashDifference
        store={canonicalStore()}
        countedPaise={0}
        onChooseReason={(k) => chosen.push(k)}
        onReasonText={(x) => typed.push(x)}
      />,
    );
    byTestId(tree, 't12-reason-t12.reason.change').props.onPress();
    byTestId(tree, 't12-reason-text').props.onChangeText('a supplier paid me in coins');
    expect(chosen).toEqual(['t12.reason.change']);
    expect(typed).toEqual(['a supplier paid me in coins']);
  });
});

describe('T12 against both fixtures and every language', () => {
  it('adversarial: renders at lakh scale', () => {
    expect(
      byTestId(render(<CashDifference store={adversarialStore()} countedPaise={1} />), 't12'),
    ).toBeTruthy();
  });

  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title and the prompt are in that language', () => {
      const tree = render(
        <CashDifference store={canonicalStore()} countedPaise={0} language={language} />,
      );
      expect(text(byTestId(tree, 't12-title'))).toBe(phrase('t12.title', language));
      expect(text(byTestId(tree, 't12-prompt'))).toBe(phrase('t12.reasonPrompt', language));
    });
  }

  it('longest string mode keeps both quick reasons', () => {
    const tree = render(
      <CashDifference
        store={adversarialStore()}
        countedPaise={0}
        language="longest"
        display="focus"
      />,
    );
    expect(
      all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('t12-reason-t12.')),
    ).toHaveLength(2);
  });

  it('chrome is capped; money is not', () => {
    const tree = render(<CashDifference store={canonicalStore()} countedPaise={0} />);
    expect(byTestId(tree, 't12-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 't12-headline').props?.maxFontSizeMultiplier).toBeUndefined();
  });
});

describe('T12 accessibility, and the absence of a keypad', () => {
  const TREES = () => [
    render(<CashDifference store={canonicalStore()} countedPaise={0} />),
    render(<CashDifference store={adversarialStore()} countedPaise={1} display="focus" />),
    render(<CashDifference store={canonicalStore()} countedPaise={0} reason="x" />),
  ];

  it('every target meets TOUCH_TARGET_MIN_DP, including the disabled one', () => {
    for (const tree of TREES()) expect(undersizedTargets(tree)).toEqual([]);
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('no text under the floor, no colour under the minimum', () => {
    for (const tree of TREES()) {
      expect(undersizedText(tree)).toEqual([]);
      expect(failingContrast(tree)).toEqual([]);
    }
  });

  it('no keypad - the counting happened on T11, this screen asks why', () => {
    const tree = render(<CashDifference store={canonicalStore()} countedPaise={0} />);
    expect(all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('keypad'))).toEqual([]);
    expect(
      all(tree)
        .map((n) => String(n.props?.testID ?? ''))
        .filter((id) => /nav|tabbar|bottom-bar/i.test(id)),
    ).toEqual([]);
  });

  it('a disabled action announces itself as disabled', () => {
    const store = canonicalStore();
    const tree = render(
      <CashDifference store={store} countedPaise={shortBy(store.expectedCash().value, 30000)} />,
    );
    expect(byTestId(tree, 't12-close').props?.accessibilityState).toEqual({ disabled: true });
  });
});
