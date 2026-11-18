/**
 * T13 THE BALANCED CASH CHECK - the §B.6 bar.
 *
 * THE ASSERTION THIS FILE EXISTS FOR is not that the screen looks pleased. It is
 * that it only looks pleased when it is entitled to. "It matches." is a claim
 * about the shopkeeper's till, and this screen is the only place in the product
 * that makes one - so the test drives the store out from under a count that was
 * correct a moment earlier and requires the claim to disappear and the close
 * action to die with it. A congratulation printed over a real discrepancy would
 * not merely be a wrong screen; it would tell him the drawer is fine when it is
 * not, and he would stop counting.
 *
 * THE SECOND ASSERTION IS S03's PROHIBITION: the day does not end on an upsell, a
 * rating prompt, a sync warning or a backup nag. That is checked against the
 * rendered text rather than trusted to the author, because it is exactly the kind
 * of thing a later well-meaning commit adds.
 */
import { describe, it, expect } from 'vitest';
import { CashBalanced } from './T13.tsx';
import { canonicalStore, adversarialStore, emptyStore } from './registry.tsx';
import { render, all, byTestId, byType, text, type Node } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { formatPaise, add } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

/** Nodes carrying a testID, without byTestId's "exactly one" demand. */
const maybe = (tree: Node, testID: string): Node[] =>
  all(tree).filter((n) => n.props?.testID === testID);

/** A balanced render: the count IS the engine figure, derived rather than typed. */
const balanced = (store: Store = canonicalStore(), extra: Record<string, unknown> = {}): Node =>
  render(<CashBalanced store={store} countedPaise={store.expectedCash().value} {...extra} />);

describe('T13 renders all four states', () => {
  it('loading', () => {
    const tree = render(
      <CashBalanced store={canonicalStore()} countedPaise={0} status="loading" />,
    );
    expect(byTestId(tree, 't13-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error', () => {
    expect(
      byTestId(
        render(<CashBalanced store={canonicalStore()} countedPaise={0} status="error" />),
        't13-error',
      ),
    ).toBeTruthy();
  });

  it('loaded: the claim, the figure, and the same number twice', () => {
    const store = canonicalStore();
    const counted = store.expectedCash().value;
    const tree = balanced(store);
    expect(text(byTestId(tree, 't13-matches'))).toBe(phrase('t13.matches', 'en'));
    expect(text(byTestId(tree, 't13-figure'))).toBe(formatPaise(counted, { withSign: false }));
    // The whole point of the confirming line: counted and expected, identical.
    expect(text(byTestId(tree, 't13-counted'))).toBe(text(byTestId(tree, 't13-expected')));
  });

  it('an empty shop can balance too - nothing taken, nothing missing', () => {
    const tree = balanced(emptyStore());
    expect(byTestId(tree, 't13-matches')).toBeTruthy();
    expect(byTestId(tree, 't13-close').props?.disabled).toBe(false);
  });
});

describe('the match is derived from the store, never taken on trust', () => {
  it('mutates the store so the expectation moves, and the claim is withdrawn', () => {
    const store = canonicalStore();
    // A count that was exactly right at the moment it was taken.
    const counted = store.expectedCash().value;

    const before = render(<CashBalanced store={store} countedPaise={counted} />);
    expect(text(byTestId(before, 't13-matches'))).toBe(phrase('t13.matches', 'en'));
    expect(maybe(before, 't13-every-rupee')).toHaveLength(1);
    expect(byTestId(before, 't13-close').props?.disabled).toBe(false);

    store.append({
      id: 't13-1',
      dayId: store.state.day.date,
      section: 'cash_sales',
      amount: 25000,
      mode: 'cash',
      source: 'manual',
      createdAt: store.state.day.date + 'T20:00:00.000Z',
    } as never);

    const after = render(<CashBalanced store={store} countedPaise={counted} />);
    // The count did not change; the expectation did. So the screen must not say
    // it matches, must drop the sentence that asserts it, and must not close.
    expect(text(byTestId(after, 't13-matches'))).not.toBe(phrase('t13.matches', 'en'));
    expect(maybe(after, 't13-every-rupee')).toEqual([]);
    expect(byTestId(after, 't13-close').props?.disabled).toBe(true);
    expect(byTestId(after, 't13-close').props?.accessibilityState).toEqual({ disabled: true });
    // And the two figures now visibly disagree, which is the evidence for all of it.
    expect(text(byTestId(after, 't13-counted'))).not.toBe(text(byTestId(after, 't13-expected')));
  });

  it('one paise out is still out', () => {
    const store = canonicalStore();
    const tree = render(
      <CashBalanced store={store} countedPaise={add(store.expectedCash().value, 1)} />,
    );
    expect(byTestId(tree, 't13-close').props?.disabled).toBe(true);
    expect(maybe(tree, 't13-every-rupee')).toEqual([]);
  });

  it('closing the day reports it, once', () => {
    const presses: number[] = [];
    const tree = balanced(canonicalStore(), { onCloseDay: () => presses.push(1) });
    byTestId(tree, 't13-close').props.onPress();
    expect(presses).toEqual([1]);
  });
});

describe('D6 - tomorrow opens on what was counted', () => {
  it('the carry figure is the counted cash, beside the sentence that says so', () => {
    const store = canonicalStore();
    const counted = store.expectedCash().value;
    const tree = balanced(store);
    expect(text(byTestId(tree, 't13-carry-copy'))).toBe(phrase('t13.carry', 'en'));
    expect(text(byTestId(tree, 't13-carry-amount'))).toBe(
      formatPaise(counted, { withSign: false }),
    );
  });
});

describe('S03 - the day does not end on a nag', () => {
  it('nothing on the page asks for a rating, an upgrade, a backup or a sync', () => {
    const page = text(balanced()).toLowerCase();
    for (const banned of [
      'rate us',
      'rating',
      'upgrade',
      'premium',
      'backup',
      'back up',
      'sync',
      'subscribe',
      'invite',
    ]) {
      expect(page, banned).not.toContain(banned);
    }
  });

  it('and the brand bar carries no figure, so the good one owns the page', () => {
    // Deliberate, and the opposite of T12: there is no Shell headline here.
    expect(maybe(balanced(), 't13-headline')).toEqual([]);
    expect(byTestId(balanced(), 't13-figure')).toBeTruthy();
  });
});

describe('T13 against both fixtures and every language', () => {
  it('adversarial: a lakh-scale shop can balance, and says so', () => {
    const store = adversarialStore();
    const tree = balanced(store, { display: 'focus' });
    expect(byTestId(tree, 't13')).toBeTruthy();
    expect(text(byTestId(tree, 't13-figure'))).toBe(
      formatPaise(store.expectedCash().value, { withSign: false }),
    );
  });

  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the claim and the carry line are in that language', () => {
      const tree = balanced(canonicalStore(), { language });
      expect(text(byTestId(tree, 't13-title'))).toBe(phrase('t13.title', language));
      expect(text(byTestId(tree, 't13-matches'))).toBe(phrase('t13.matches', language));
      expect(text(byTestId(tree, 't13-carry-copy'))).toBe(phrase('t13.carry', language));
    });
  }

  it('longest string mode keeps every part of the good moment', () => {
    const tree = balanced(adversarialStore(), { language: 'longest', display: 'focus' });
    for (const id of ['t13-matches', 't13-figure', 't13-confirm', 't13-every-rupee', 't13-carry']) {
      expect(maybe(tree, id), id).toHaveLength(1);
    }
    expect(text(byTestId(tree, 't13-matches'))).toBe(phrase('t13.matches', 'longest'));
  });

  it('chrome is capped; money is not', () => {
    const tree = balanced();
    expect(byTestId(tree, 't13-matches').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 't13-figure').props?.maxFontSizeMultiplier).toBeUndefined();
    expect(byTestId(tree, 't13-figure').props?.allowFontScaling).toBe(true);
  });
});

describe('T13 accessibility, and the absence of a keypad', () => {
  const TREES = (): Node[] => [
    balanced(),
    balanced(adversarialStore(), { display: 'focus' }),
    balanced(canonicalStore(), { language: 'or' }),
    // The state that should not be reachable, measured anyway.
    render(<CashBalanced store={canonicalStore()} countedPaise={0} display="focus" />),
  ];

  it('every target meets TOUCH_TARGET_MIN_DP, including the disabled close', () => {
    for (const tree of TREES()) expect(undersizedTargets(tree)).toEqual([]);
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('no text under the floor, no colour under the minimum', () => {
    for (const tree of TREES()) {
      expect(undersizedText(tree)).toEqual([]);
      expect(failingContrast(tree)).toEqual([]);
    }
  });

  it('no keypad - the counting happened on T11, and this screen only confirms it', () => {
    const tree = balanced();
    expect(all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('keypad'))).toEqual([]);
    expect(byType(tree, 'TextInput')).toEqual([]);
    expect(
      all(tree)
        .map((n) => String(n.props?.testID ?? ''))
        .filter((id) => /nav|tabbar|bottom-bar/i.test(id)),
    ).toEqual([]);
  });
});
