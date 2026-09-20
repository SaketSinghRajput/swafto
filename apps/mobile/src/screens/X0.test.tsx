/**
 * X0 CONSENT NOTICE - the screen whose defects are legal rather than visual.
 *
 * Most of this file is not about rendering. A consent screen fails in ways that
 * look perfectly fine on a contact sheet: a pre-ticked optional box, a single
 * button that turns everything on, a required purpose the shopkeeper is allowed
 * to refuse and then finds he agreed to anyway. Each of those is a DPDP §1.2
 * defect and each of them renders beautifully.
 *
 * So the cases below assert the SHAPE OF THE CHOICE rather than the pixels: what
 * is on by default, what a toggle can reach, what the button reports. They are
 * the checks that would fail if somebody "simplified" this screen later.
 */
import { describe, it, expect } from 'vitest';
import { ConsentNotice } from './X0.tsx';
import { render, all, byTestId, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import {
  CONSENT_PURPOSES,
  PRIVACY_NOTICE_VERSION,
  CHROME_FONT_SCALE_CAP,
  TOUCH_TARGET_MIN_DP,
} from '@swafto/values';
import { phrase, type StringKey, type Language } from '../i18n/strings.ts';

const OPTIONAL = CONSENT_PURPOSES.filter((p) => !p.required).map((p) => p.key);
const REQUIRED = CONSENT_PURPOSES.filter((p) => p.required).map((p) => p.key);
const purposeKey = (key: string): StringKey => ('consent.purpose.' + key) as StringKey;

/** `byTestId` throws when a node is absent, so absence needs its own reading. */
const testIDs = (tree: Parameters<typeof all>[0]): string[] =>
  all(tree)
    .map((n) => String(n.props?.testID ?? ''))
    .filter(Boolean);

describe('X0 renders all four states', () => {
  it('loading', () => {
    expect(byTestId(render(<ConsentNotice status="loading" />), 'x0-loading')).toBeTruthy();
  });

  it('error offers a way back', () => {
    const tree = render(<ConsentNotice status="error" />);
    expect(byTestId(tree, 'x0-error')).toBeTruthy();
    expect(byTestId(tree, 'x0-retry')).toBeTruthy();
  });

  it('ready: the notice, every purpose, the rights and one button', () => {
    const tree = render(<ConsentNotice />);
    expect(text(byTestId(tree, 'x0-intro'))).toBe(phrase('consent.intro', 'en'));
    expect(text(byTestId(tree, 'x0-rights'))).toBe(phrase('consent.rights', 'en'));
    expect(byTestId(tree, 'x0-agree')).toBeTruthy();
    for (const { key } of CONSENT_PURPOSES) expect(byTestId(tree, 'x0-purpose-' + key)).toBeTruthy();
  });

  it('there is no empty state, because a notice is never empty', () => {
    // The purpose list is a constant, not data - so `empty` cannot arise.
    expect(testIDs(render(<ConsentNotice />))).not.toContain('x0-empty');
  });
});

describe('the consent is specific - DPDP 1.2 as assertions', () => {
  it('every purpose is shown separately, with its own line', () => {
    const tree = render(<ConsentNotice />);
    for (const { key } of CONSENT_PURPOSES) {
      expect(text(byTestId(tree, 'x0-purpose-' + key)), key).toContain(
        phrase(purposeKey(key), 'en'),
      );
    }
    expect(CONSENT_PURPOSES.length).toBeGreaterThan(1);
  });

  it('OPTIONAL PURPOSES START OFF - nothing is pre-ticked', () => {
    /*
     * The single most common way this requirement is broken. A pre-ticked box is
     * not a clear affirmative action, and the defect is invisible: the screen
     * looks identical either way until somebody reads `accessibilityState`.
     */
    const tree = render(<ConsentNotice />);
    for (const key of OPTIONAL) {
      expect(byTestId(tree, 'x0-toggle-' + key).props?.accessibilityState, key).toEqual({
        checked: false,
      });
    }
    expect(OPTIONAL.length).toBeGreaterThan(0);
  });

  it('a purpose he turned on shows as on, and only that one', () => {
    const first = OPTIONAL[0]!;
    const tree = render(<ConsentNotice granted={[first]} />);
    expect(byTestId(tree, 'x0-toggle-' + first).props?.accessibilityState).toEqual({
      checked: true,
    });
    for (const key of OPTIONAL.filter((k) => k !== first)) {
      expect(byTestId(tree, 'x0-toggle-' + key).props?.accessibilityState, key).toEqual({
        checked: false,
      });
    }
  });

  it('the required purpose has NO toggle - it is stated, not offered', () => {
    /*
     * Offering a switch that cannot be turned off is worse than offering none: it
     * asks a question whose answer is ignored. The screen says what is needed to
     * keep his book, and says it as a fact.
     */
    const tree = render(<ConsentNotice />);
    for (const key of REQUIRED) {
      expect(testIDs(tree), key).not.toContain('x0-toggle-' + key);
      expect(text(byTestId(tree, 'x0-required-' + key))).toBe(phrase('consent.required', 'en'));
    }
  });

  it('it holds no store, so this screen mutates the store not at all', () => {
    /*
     * The only screen in the app with nothing to derive and nothing to write. It
     * is shown before an account exists, so there is no shop, no day and no
     * ledger - and the figure-wiring bar is met by there being no figure.
     */
    const tree = render(<ConsentNotice />);
    expect(text(tree)).not.toContain('₹');
    expect(testIDs(tree).filter((id) => /amount|money|figure|total/.test(id))).toEqual([]);
  });

  it('THERE IS NO "AGREE TO ALL" - one button, and it changes no switch', () => {
    const toggled: string[] = [];
    const agreed: number[] = [];
    const tree = render(
      <ConsentNotice onToggle={(p) => toggled.push(p)} onAgree={() => agreed.push(1)} />,
    );
    byTestId(tree, 'x0-agree').props.onPress();
    expect(agreed).toHaveLength(1);
    // Agreeing turned nothing on. What he chose is what is reported.
    expect(toggled).toEqual([]);
  });

  it('a toggle reports the purpose and decides nothing itself', () => {
    const toggled: string[] = [];
    const tree = render(<ConsentNotice onToggle={(p) => toggled.push(p)} />);
    for (const key of OPTIONAL) byTestId(tree, 'x0-toggle-' + key).props.onPress();
    expect(toggled).toEqual(OPTIONAL);
  });

  it('the screen renders the registry the API validates against, not a second list', () => {
    expect(PRIVACY_NOTICE_VERSION.length).toBeGreaterThan(0);
    expect(REQUIRED).toEqual(['account_and_ledger']);
  });
});

describe('X0 in every language, including the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title, the notice and the button are in that language', () => {
      const tree = render(<ConsentNotice language={language} />);
      expect(text(byTestId(tree, 'x0-title'))).toBe(phrase('consent.title', language));
      expect(text(byTestId(tree, 'x0-intro'))).toBe(phrase('consent.intro', language));
      expect(text(byTestId(tree, 'x0-agree'))).toBe(phrase('consent.agree', language));
    });
  }

  it('longest strings at the largest type keep every purpose and the button', () => {
    const tree = render(<ConsentNotice language="longest" display="focus" />);
    for (const { key } of CONSENT_PURPOSES) expect(byTestId(tree, 'x0-purpose-' + key)).toBeTruthy();
    expect(byTestId(tree, 'x0-agree')).toBeTruthy();
  });

  it('chrome is capped, on a screen that shows no money at all', () => {
    const tree = render(<ConsentNotice />);
    expect(byTestId(tree, 'x0-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(text(tree)).not.toContain('₹');
  });
});

describe('X0 accessibility', () => {
  const TREES = () => [
    render(<ConsentNotice />),
    render(<ConsentNotice language="or" display="focus" granted={OPTIONAL} />),
    render(<ConsentNotice status="error" />),
    render(<ConsentNotice language="longest" display="focus" />),
  ];

  it('every target meets TOUCH_TARGET_MIN_DP and no text is under the floor', () => {
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
    for (const tree of TREES()) {
      expect(undersizedTargets(tree)).toEqual([]);
      expect(undersizedText(tree)).toEqual([]);
      expect(failingContrast(tree)).toEqual([]);
    }
  });

  it('a toggle announces itself as a switch, with its state and a real label', () => {
    /*
     * A control whose only signal is a border colour is one a screen reader
     * cannot report - and on a consent screen that is the difference between an
     * informed decision and a tap.
     */
    const tree = render(<ConsentNotice />);
    for (const key of OPTIONAL) {
      const node = byTestId(tree, 'x0-toggle-' + key);
      expect(node.props?.accessibilityRole, key).toBe('switch');
      expect(node.props?.accessibilityLabel, key).toBe(phrase(purposeKey(key), 'en'));
    }
  });

  it('no keypad and no bottom nav - it takes no figure and goes nowhere else', () => {
    const ids = testIDs(render(<ConsentNotice />));
    expect(ids).not.toContain('keypad');
    expect(ids.filter((id) => /nav|tabbar|bottom-bar/i.test(id))).toEqual([]);
  });
});
