/**
 * S4 PRIVACY AND CONSENT - the §B.6 bar.
 *
 * THE STRONGEST ASSERTION ON THIS SCREEN IS AN ABSENCE.
 *
 * S4 must route to X0 and must not reimplement it. A second set of per-purpose
 * switches here would be a second place a consent can be recorded - two controls
 * writing one legal fact, and no answer afterwards to "what did he consent to".
 * That failure would look perfectly healthy in a screenshot, so it is tested as
 * an absence: no switch role, no purpose control, no toggle of any kind, and
 * exactly ONE interactive row, which reports exactly once.
 *
 * AND THE ROUTE ITSELF IS THE DPDP REQUIREMENT. s6 says withdrawal must be as
 * easy as giving. The row is one tap from the settings hub and lands on the
 * screen that took the consent; if it were ever dropped in a redesign the app
 * would still work and would no longer be lawful, which is exactly the kind of
 * row a test has to hold in place.
 */
import { describe, it, expect } from 'vitest';
import { PrivacySettings } from './S4.tsx';
import { canonicalStore, adversarialStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';

describe('S4 renders all four states', () => {
  it('loading', () => {
    const tree = render(<PrivacySettings store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 's4-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error offers a way back', () => {
    const tree = render(<PrivacySettings store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 's4-error')).toBeTruthy();
    expect(byTestId(tree, 's4-retry')).toBeTruthy();
  });

  it('empty: there is no such state, and the screen does not pretend there is', () => {
    /*
     * The route and the sentence are STRUCTURAL, not data. A privacy screen that
     * could render empty would be a privacy screen that could hide the
     * withdrawal route, which is the one thing it exists to offer.
     */
    const tree = render(<PrivacySettings store={canonicalStore()} />);
    expect(all(tree).filter((n) => String(n.props?.testID ?? '') === 's4-empty')).toEqual([]);
    expect(byTestId(tree, 's4-review')).toBeTruthy();
    expect(byTestId(tree, 's4-withdraw')).toBeTruthy();
  });

  it('loaded: the route to the consent screen and the sentence about withdrawal', () => {
    const tree = render(<PrivacySettings store={canonicalStore()} />);
    expect(text(byTestId(tree, 's4-review'))).toBe(phrase('s4.review', 'en'));
    expect(text(byTestId(tree, 's4-withdraw'))).toBe(phrase('s4.withdraw', 'en'));
  });
});

describe('S4 mutates the store and stays correct', () => {
  it('mutates the store: this screen carries no figure, and writes nothing itself', () => {
    /*
     * Nothing here moves when the day does, and nothing here may write. A
     * consent screen that touched the ledger would be a write with no entry
     * behind it; a consent screen that recorded a consent would be the second
     * place this app decides a legal fact, which is the thing S4 exists NOT to
     * be.
     */
    const store = canonicalStore();
    const entriesBefore = store.state.entries.length;
    const revisionBefore = store.revision;

    const opened: string[] = [];
    const tree = render(
      <PrivacySettings
        store={store}
        onReviewConsent={() => opened.push('review')}
        onBack={() => opened.push('back')}
      />,
    );
    byTestId(tree, 's4-review').props.onPress();
    byTestId(tree, 's4-back').props.onPress();

    expect(opened).toEqual(['review', 'back']);
    expect(store.state.entries.length).toBe(entriesBefore);
    expect(store.revision).toBe(revisionBefore);
  });

  it('a write to the store changes nothing here, because it holds no figure', () => {
    const store = canonicalStore();
    const before = text(render(<PrivacySettings store={store} />));
    store.skip('expense');
    expect(store.revision).toBeGreaterThan(0);
    expect(text(render(<PrivacySettings store={store} />))).toBe(before);
  });
});

describe('S4 routes to X0 and does not reimplement it', () => {
  it('there is no switch, no toggle and no purpose control anywhere on it', () => {
    /*
     * X0 draws the three purposes with `accessibilityRole="switch"` and testIDs
     * `x0-toggle-*`. None of that may appear here: one screen records consent,
     * and this is the route to it.
     */
    const tree = render(<PrivacySettings store={canonicalStore()} onBack={() => {}} />);
    const nodes = all(tree);
    expect(nodes.filter((n) => n.props?.accessibilityRole === 'switch')).toEqual([]);
    expect(
      nodes
        .map((n) => String(n.props?.testID ?? ''))
        .filter((id) => /toggle|switch|purpose/i.test(id)),
    ).toEqual([]);
  });

  it('exactly one row leads anywhere, and it reports exactly once per press', () => {
    const calls: number[] = [];
    const tree = render(
      <PrivacySettings store={canonicalStore()} onReviewConsent={() => calls.push(1)} />,
    );
    /*
     * The pressables on this screen are the review row and nothing else - this
     * render has no parent and therefore no back affordance, which is what makes
     * the count meaningful rather than incidental.
     */
    const pressables = all(tree).filter((n) => n.type === 'Pressable');
    expect(pressables.map((n) => String(n.props?.testID ?? ''))).toEqual(['s4-review']);
    byTestId(tree, 's4-review').props.onPress();
    expect(calls).toEqual([1]);
  });

  it('the row announces itself as a button, in the words on its face', () => {
    const row = byTestId(render(<PrivacySettings store={canonicalStore()} />), 's4-review');
    expect(row.props?.accessibilityRole).toBe('button');
    expect(row.props?.accessibilityLabel).toBe(phrase('s4.review', 'en'));
  });
});

describe('S4 in every language, including the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title, the route and the withdrawal sentence are in that language', () => {
      const tree = render(<PrivacySettings store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 's4-title'))).toBe(phrase('s4.title', language));
      expect(text(byTestId(tree, 's4-review'))).toBe(phrase('s4.review', language));
      expect(text(byTestId(tree, 's4-withdraw'))).toBe(phrase('s4.withdraw', language));
    });
  }

  it('the adversarial shop renders the route and the sentence unchanged', () => {
    const tree = render(
      <PrivacySettings store={adversarialStore()} language="or" onBack={() => {}} />,
    );
    expect(text(byTestId(tree, 's4-review'))).toBe(phrase('s4.review', 'or'));
    expect(text(byTestId(tree, 's4-withdraw'))).toBe(phrase('s4.withdraw', 'or'));
  });

  it('longest string mode at the largest type keeps the row and the sentence', () => {
    const tree = render(
      <PrivacySettings
        store={adversarialStore()}
        language="longest"
        display="focus"
        onBack={() => {}}
      />,
    );
    expect(byTestId(tree, 's4-review')).toBeTruthy();
    expect(byTestId(tree, 's4-withdraw')).toBeTruthy();
  });

  it('chrome is capped', () => {
    const tree = render(<PrivacySettings store={canonicalStore()} />);
    expect(byTestId(tree, 's4-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 's4-withdraw').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });
});

describe('S4 accessibility, and it is not an entry screen', () => {
  const TREES = () => [
    render(<PrivacySettings store={canonicalStore()} onBack={() => {}} />),
    render(<PrivacySettings store={canonicalStore()} language="or" display="focus" />),
    render(<PrivacySettings store={canonicalStore()} status="error" />),
    render(
      <PrivacySettings
        store={adversarialStore()}
        language="longest"
        display="focus"
        onBack={() => {}}
      />,
    ),
    render(<PrivacySettings store={adversarialStore()} language="hi" />),
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

  it('nothing is typed here, so no keypad - and no bottom nav either', () => {
    /*
     * S4 is NOT one of C-5's three tabs. It hangs off S1 and returns there, so
     * it carries a back affordance instead - and §B.6's forbidden pair cannot
     * arise here because neither half is present.
     */
    const tree = render(<PrivacySettings store={canonicalStore()} onBack={() => {}} />);
    const ids = all(tree).map((n) => String(n.props?.testID ?? ''));
    expect(ids.filter((id) => /^keypad/.test(id))).toEqual([]);
    expect(ids.filter((id) => /nav|tabbar|bottom-bar/i.test(id))).toEqual([]);
    expect(byTestId(tree, 's4-back')).toBeTruthy();
  });

  it('without a parent there is no back control, rather than one that does nothing', () => {
    const ids = all(render(<PrivacySettings store={canonicalStore()} />)).map((n) =>
      String(n.props?.testID ?? ''),
    );
    expect(ids.filter((id) => id === 's4-back')).toEqual([]);
  });
});
