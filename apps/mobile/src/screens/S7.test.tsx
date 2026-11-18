/**
 * S7 DELETE THIS ACCOUNT - the §B.6 bar.
 *
 * TWO THINGS HERE ARE WORTH MORE THAN THE REST OF THE FILE.
 *
 * ONE - THE GRACE PERIOD. `DELETION_GRACE_DAYS` is 30 and the sentence the
 * shopkeeper reads says "30 days", in three languages, with no interpolation
 * between them. Two places for one number is precisely the shape that cost this
 * project two iterations when SECURITY-AUDIT said a 5-minute OTP and
 * SMS-TEMPLATES said 10: every check compared a document to code and none
 * compared a document to a CONSTANT. So the copy is checked against the constant
 * here, in all three languages. Move the constant and this fails; rewrite the
 * copy without the number and this fails.
 *
 * TWO - IT MUST NOT DELETE. S7 informs and hands on to S8. A version of this
 * screen that deleted on `onContinue` would pass every layout, contrast and
 * language assertion ever written, so pressing the one button and finding the
 * ledger untouched is asserted directly.
 */
import { describe, it, expect } from 'vitest';
import { DeleteAccount } from './S7.tsx';
import { canonicalStore, adversarialStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { tokens } from '../theme/tokens.ts';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP, DELETION_GRACE_DAYS } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import { CANONICAL_DATE } from '@swafto/fixtures';
import type { Entry } from '@swafto/formula-engine';

/** A real entry, so "the store moved" means the store actually moved. */
const cashSale = (id: string): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section: 'cash_sales',
    amount: 25000,
    mode: 'cash',
    source: 'manual',
    createdAt: `${CANONICAL_DATE}T11:00:00.000Z`,
  }) as Entry;

describe('S7 renders all four states', () => {
  it('loading', () => {
    const tree = render(<DeleteAccount store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 's7-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error offers a way back', () => {
    const tree = render(<DeleteAccount store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 's7-error')).toBeTruthy();
    expect(byTestId(tree, 's7-retry')).toBeTruthy();
  });

  it('empty: there is no such state, and the screen does not claim one', () => {
    /*
     * The two paragraphs are structural, not data. A shop that has entered
     * nothing still has an account to delete, and an "empty" S7 would be a
     * legally-required explanation replaced by the words "nothing yet".
     */
    const tree = render(<DeleteAccount store={canonicalStore()} />);
    expect(all(tree).filter((n) => String(n.props?.testID ?? '') === 's7-empty')).toEqual([]);
    expect(byTestId(tree, 's7-what')).toBeTruthy();
    expect(byTestId(tree, 's7-grace')).toBeTruthy();
  });

  it('loaded: what is destroyed, the grace period, and one way forward', () => {
    const tree = render(<DeleteAccount store={canonicalStore()} />);
    expect(text(byTestId(tree, 's7-what'))).toBe(phrase('s7.what', 'en'));
    expect(text(byTestId(tree, 's7-grace'))).toBe(phrase('s7.grace', 'en'));
    expect(text(byTestId(tree, 's7-continue'))).toBe(phrase('s7.continue', 'en'));
  });
});

describe('S7 mutates the store and still shows no figure of its own', () => {
  it('mutates the store: a new sale changes the day and changes nothing here', () => {
    /*
     * The inverse of the usual wiring assertion, and it is the honest one for
     * this screen: S7 carries NO figure, so the day moving under it must leave
     * it byte-identical. A screen that quietly grew a total would fail here.
     */
    const store = canonicalStore();
    const before = text(render(<DeleteAccount store={store} />));

    store.append(cashSale('s7-m1'));

    expect(store.state.entries.length).toBeGreaterThan(0);
    expect(text(render(<DeleteAccount store={store} />))).toBe(before);
  });

  it('pressing continue reports the intent and writes NOTHING', () => {
    /*
     * The deletion happens on S8, behind one more question. If this button
     * deleted, the "are you sure" screen would be decoration.
     */
    const store = canonicalStore();
    const entriesBefore = store.state.entries.length;
    const revisionBefore = store.revision;

    let continued = 0;
    const tree = render(<DeleteAccount store={store} onContinue={() => (continued += 1)} />);
    byTestId(tree, 's7-continue').props.onPress();

    expect(continued).toBe(1);
    expect(store.state.entries.length).toBe(entriesBefore);
    expect(store.revision).toBe(revisionBefore);
  });

  it('back reports the intent and writes nothing either', () => {
    const store = canonicalStore();
    const revisionBefore = store.revision;
    let backed = 0;
    const tree = render(<DeleteAccount store={store} onBack={() => (backed += 1)} />);
    byTestId(tree, 's7-back').props.onPress();
    expect(backed).toBe(1);
    expect(store.revision).toBe(revisionBefore);
  });
});

describe('S7 copy and the deletion grace constant cannot drift apart', () => {
  it('DELETION_GRACE_DAYS is 30, which is what the English sentence says', () => {
    /*
     * LEGAL-AUDIT §1.6 fixes the window at thirty days and the string table
     * spells it out inside a sentence, because the table holds no placeholders.
     * This is the one assertion that binds the two.
     */
    expect(DELETION_GRACE_DAYS).toBe(30);
    expect(phrase('s7.grace', 'en')).toContain(String(DELETION_GRACE_DAYS));
  });

  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the rendered grace line carries the constant', () => {
      /*
       * Rendered, not read from the table - a screen that showed the wrong key
       * would pass a table-only check. The Odia and Hindi copy is a DRAFT (H13);
       * what is verifiable without a native reader is that the NUMBER is right.
       */
      const tree = render(<DeleteAccount store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 's7-grace'))).toContain(String(DELETION_GRACE_DAYS));
    });
  }
});

describe('S7 spends no marigold - this screen informs, it does not delete', () => {
  it('the one button is the outlined secondary, not the primary fill', () => {
    /*
     * §9: marigold is the colour of the action a screen is FOR, at most one per
     * screen. S7 is for reading. Spending the accent here would also train the
     * eye to expect it on the NEXT screen, where it belongs to "Keep my book".
     */
    for (const display of ['comfort', 'focus'] as const) {
      const t = tokens(display);
      const button = byTestId(
        render(<DeleteAccount store={canonicalStore()} display={display} />),
        's7-continue',
      );
      const style = button.props.style as Record<string, unknown>;
      /*
       * v2 "Mitra": `brand` IS the primary fill now (DESIGN-SYSTEM-V2 1.1), so
       * the secondary is `surface` with a `brand` rim. What this test protects
       * is unchanged - S7 does not spend the screen's one primary fill.
       */
      expect(style.backgroundColor).toBe(t.color.surface);
      expect(style.borderColor).toBe(t.color.brand);
      expect(style.backgroundColor).not.toBe(t.color.brand);
      expect(style.backgroundColor).not.toBe(t.color.accent);
    }
  });

  it('exactly one button, so there is one way forward and no second guess', () => {
    const tree = render(<DeleteAccount store={canonicalStore()} onBack={() => {}} />);
    const buttons = all(tree).filter((n) => n.props?.accessibilityRole === 'button');
    // The back affordance and the continue button, and nothing else.
    expect(buttons.map((n) => String(n.props?.testID ?? '')).sort()).toEqual([
      's7-back',
      's7-continue',
    ]);
  });
});

describe('S7 in every language, including the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title and both paragraphs are in that language', () => {
      const tree = render(<DeleteAccount store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 's7-title'))).toBe(phrase('s7.title', language));
      expect(text(byTestId(tree, 's7-what'))).toBe(phrase('s7.what', language));
      expect(text(byTestId(tree, 's7-grace'))).toBe(phrase('s7.grace', language));
    });
  }

  it('the adversarial shop renders the whole explanation', () => {
    const tree = render(<DeleteAccount store={adversarialStore()} language="or" />);
    expect(byTestId(tree, 's7-what')).toBeTruthy();
    expect(byTestId(tree, 's7-grace')).toBeTruthy();
    expect(byTestId(tree, 's7-continue')).toBeTruthy();
  });

  it('longest string mode at the largest type keeps the way forward reachable', () => {
    const tree = render(
      <DeleteAccount store={adversarialStore()} language="longest" display="focus" />,
    );
    expect(byTestId(tree, 's7-continue')).toBeTruthy();
    expect(text(byTestId(tree, 's7-grace'))).toContain(String(DELETION_GRACE_DAYS));
  });

  it('chrome is capped', () => {
    const tree = render(<DeleteAccount store={canonicalStore()} />);
    expect(byTestId(tree, 's7-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 's7-what').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });
});

describe('S7 accessibility, and it is not an entry screen', () => {
  const TREES = () => [
    render(<DeleteAccount store={canonicalStore()} onBack={() => {}} />),
    render(<DeleteAccount store={canonicalStore()} language="or" display="focus" />),
    render(<DeleteAccount store={canonicalStore()} status="error" />),
    render(<DeleteAccount store={canonicalStore()} status="loading" />),
    render(<DeleteAccount store={adversarialStore()} language="longest" display="focus" />),
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
     * S7 is reached from S1 and returns there, so it carries a back affordance
     * rather than tabs - and §B.6's forbidden pair cannot arise, because
     * neither half of it is present.
     */
    const tree = render(<DeleteAccount store={canonicalStore()} onBack={() => {}} />);
    const ids = all(tree).map((n) => String(n.props?.testID ?? ''));
    expect(ids.filter((id) => /^keypad/.test(id))).toEqual([]);
    expect(ids.filter((id) => /nav|tabbar|bottom-bar/i.test(id))).toEqual([]);
    expect(byTestId(tree, 's7-back')).toBeTruthy();
  });

  it('the button announces the words on its face', () => {
    const button = byTestId(render(<DeleteAccount store={canonicalStore()} />), 's7-continue');
    expect(button.props?.accessibilityRole).toBe('button');
    expect(button.props?.accessibilityLabel).toBe(phrase('s7.continue', 'en'));
  });
});
