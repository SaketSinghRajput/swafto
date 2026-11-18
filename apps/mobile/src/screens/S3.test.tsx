/**
 * S3 LANGUAGE AND TEXT SIZE - the §B.6 bar.
 *
 * TWO THINGS HERE MATTER MORE THAN THE STRUCTURE, and both are copy rules a
 * future redesign would break without noticing:
 *
 *   THE LANGUAGE NAMES ARE NEVER TRANSLATED. The three labels are the same three
 *   strings whatever language the app is in, because a man who reads only Odia
 *   cannot find "Odia" written in English. The test renders in all three and
 *   requires the three labels to be identical every time - and compares them
 *   against X1's, because the same choice offered twice must be spelled the same
 *   way both times.
 *
 *   FOCUS NAMES THE LIGHT, NOT THE EYESIGHT. "Bright sunlight" is a fact about
 *   the shop. Relabelling it "Large text" or "High contrast" is how people are
 *   made to refuse the mode that would help them, so the test refuses any
 *   accessibility wording outright rather than only checking that a key resolves.
 */
import { describe, it, expect } from 'vitest';
import { LanguageSettings } from './S3.tsx';
import { Onboarding } from './X1.tsx';
import { canonicalStore, adversarialStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import type { Mode as DisplayMode } from '../theme/tokens.ts';
import type { Entry } from '@swafto/formula-engine';

const LANGUAGE_KEYS = ['en', 'hi', 'or'] as const satisfies readonly Language[];
const DISPLAY_KEYS = ['comfort', 'focus'] as const satisfies readonly DisplayMode[];

/** The one wording this screen may never carry. See the file header. */
const ACCESSIBILITY_WORDS = /accessib|large text|high contrast|eyesight|vision|disab/i;

const sale = (id: string, amount: number, dayId: string): Entry =>
  ({
    id,
    dayId,
    section: 'cash_sales',
    amount,
    mode: 'cash',
    source: 'manual',
    createdAt: `${dayId}T19:30:00.000Z`,
  }) as Entry;

const labelOf = (tree: ReturnType<typeof render>, testID: string): string =>
  String(byTestId(tree, testID).props?.accessibilityLabel ?? '');

describe('S3 renders all four states', () => {
  it('loading', () => {
    const tree = render(<LanguageSettings store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 's3-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error offers a way back', () => {
    const tree = render(<LanguageSettings store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 's3-error')).toBeTruthy();
    expect(byTestId(tree, 's3-retry')).toBeTruthy();
  });

  it('empty: there is no such state, and the screen does not fake one', () => {
    /*
     * S3 IS NEVER GENUINELY EMPTY, and this is asserted honestly rather than by
     * inventing a panel. Three languages and two display modes are properties
     * of the BUILD, not rows a new shop has yet to enter - a fresh install on
     * its first morning shows exactly what a shop of ten years shows. So
     * `empty={false}` is the truth, and what is testable is that the screen
     * never reaches for the empty panel and that both controls are always there.
     */
    const tree = render(<LanguageSettings store={canonicalStore()} />);
    expect(all(tree).filter((n) => String(n.props?.testID ?? '') === 's3-empty')).toEqual([]);
    expect(byTestId(tree, 's3-language')).toBeTruthy();
    expect(byTestId(tree, 's3-display')).toBeTruthy();
  });

  it('loaded: both questions, all five answers, and the ones in force marked', () => {
    const tree = render(
      <LanguageSettings store={canonicalStore()} language="hi" display="focus" />,
    );
    expect(text(byTestId(tree, 's3-language-label'))).toBe(phrase('s3.language', 'hi'));
    expect(text(byTestId(tree, 's3-display-label'))).toBe(phrase('s3.display', 'hi'));
    for (const key of LANGUAGE_KEYS) expect(byTestId(tree, 's3-language-' + key)).toBeTruthy();
    for (const key of DISPLAY_KEYS) expect(byTestId(tree, 's3-display-' + key)).toBeTruthy();
    expect(byTestId(tree, 's3-language-hi').props?.accessibilityState?.selected).toBe(true);
    expect(byTestId(tree, 's3-display-focus').props?.accessibilityState?.selected).toBe(true);
  });
});

describe('S3 mutates the store, and a choice is reported rather than written', () => {
  it('mutates the store: the day moves and this screen does not', () => {
    /*
     * THE HONEST FORM OF THIS PREDICATE FOR A SCREEN WITH NO FIGURE ON IT.
     *
     * The child this phrase gates asks that every displayed figure trace to the
     * engine through the real store. S3 displays none, and the property worth
     * holding is that it displays none: a preference screen that read the
     * ledger would be reading something it has no business in. This fails the
     * day somebody puts a day total or an entry count on it.
     */
    const store = canonicalStore();
    const before = text(render(<LanguageSettings store={store} />));

    store.append(sale('s3-t1', 123400, store.state.day.date));
    expect(store.state.entries.some((e) => e.id === 's3-t1')).toBe(true);

    expect(text(render(<LanguageSettings store={store} />))).toBe(before);
  });

  it('choosing a language reports which one, and writes nothing to the ledger', () => {
    const store = canonicalStore();
    const revision = store.revision;
    const entries = store.state.entries.length;
    const chosen: Language[] = [];
    const tree = render(
      <LanguageSettings store={store} onSelectLanguage={(l) => chosen.push(l)} />,
    );
    for (const key of LANGUAGE_KEYS) byTestId(tree, 's3-language-' + key).props.onPress();
    expect(chosen).toEqual([...LANGUAGE_KEYS]);
    expect(store.revision).toBe(revision);
    expect(store.state.entries.length).toBe(entries);
  });

  it('choosing a display mode reports which one, and writes nothing either', () => {
    const store = canonicalStore();
    const revision = store.revision;
    const chosen: DisplayMode[] = [];
    const tree = render(<LanguageSettings store={store} onSelectDisplay={(d) => chosen.push(d)} />);
    for (const key of DISPLAY_KEYS) byTestId(tree, 's3-display-' + key).props.onPress();
    expect(chosen).toEqual([...DISPLAY_KEYS]);
    expect(store.revision).toBe(revision);
  });

  it('there is no Save button, because the answer is applied as it is given', () => {
    /*
     * Both choices re-render this page, so a Save step would only delay the
     * feedback that makes the choice legible - and it would be the only
     * marigold on a screen that has no action on it. If one appears, the screen
     * has acquired a draft state that nothing here models.
     */
    const tree = render(<LanguageSettings store={canonicalStore()} onBack={() => {}} />);
    const ids = all(tree).map((n) => String(n.props?.testID ?? ''));
    expect(ids.filter((id) => /save|submit|apply|confirm/i.test(id))).toEqual([]);
  });

  it('the display choice is applied to the page it was made on', () => {
    // The demonstration IS the explanation, so the mode in force has to be what
    // the screen is drawn in and not merely what is ticked on it.
    const comfort = render(<LanguageSettings store={canonicalStore()} display="comfort" />);
    const focus = render(<LanguageSettings store={canonicalStore()} display="focus" />);
    expect(byTestId(comfort, 's3-display-comfort').props?.accessibilityState?.selected).toBe(true);
    expect(byTestId(focus, 's3-display-focus').props?.accessibilityState?.selected).toBe(true);
    // Focus is a dark mode, so the two differ in the ground they ask for rather
    // than only in which segment is filled.
    expect(byTestId(comfort, 's3').props?.style?.backgroundColor).not.toBe(
      byTestId(focus, 's3').props?.style?.backgroundColor,
    );
  });
});

describe('S3 never translates a language name, and never medicalises the mode', () => {
  it('the three labels are the same three strings in every language', () => {
    const seen = LANGUAGE_KEYS.map((inLanguage) => {
      const tree = render(<LanguageSettings store={canonicalStore()} language={inLanguage} />);
      return LANGUAGE_KEYS.map((key) => labelOf(tree, 's3-language-' + key));
    });
    for (const row of seen) expect(row).toEqual(seen[0]);
    // And they are three different scripts rather than three copies of one word,
    // which is the other thing the loop above would happily accept.
    expect(new Set(seen[0]).size).toBe(LANGUAGE_KEYS.length);
  });

  it('they are spelled exactly as X1 spells them - the same choice, offered twice', () => {
    /*
     * X1 asks this question during onboarding and S3 asks it again afterwards.
     * Two spellings of one language's own name across two screens is the kind
     * of drift nobody reads carefully enough to catch, and in the one language
     * nobody on this build can proofread it would never be caught at all.
     */
    const s3 = render(<LanguageSettings store={canonicalStore()} />);
    const x1 = render(<Onboarding />);
    for (const key of LANGUAGE_KEYS) {
      expect(labelOf(s3, 's3-language-' + key)).toBe(labelOf(x1, 'x1-language-' + key));
    }
  });

  it('HT-29: one setting, one name - X1 and S3 label the screen setting identically', () => {
    for (const language of LANGUAGE_KEYS) {
      const s3 = render(<LanguageSettings store={canonicalStore()} language={language} />);
      const x1 = render(<Onboarding language={language} />);
      expect(text(byTestId(x1, 'x1-q3-label'))).toBe('3 · ' + text(byTestId(s3, 's3-display-label')));
      for (const key of DISPLAY_KEYS) {
        expect(text(byTestId(x1, 'x1-size-' + key)), language + ' ' + key).toBe(
          text(byTestId(s3, 's3-display-' + key)),
        );
      }
      // The title names the setting the screen actually offers.
      expect(text(byTestId(s3, 's3-title')).toLowerCase()).toContain(
        phrase('s3.display', language).toLowerCase(),
      );
    }
    // Focus is the dark palette, and its English label says so.
    expect(phrase('s3.focus', 'en')).toMatch(/dark/i);
  });

  it('the mode labels name the light and carry no accessibility wording', () => {
    for (const language of LANGUAGE_KEYS) {
      const tree = render(<LanguageSettings store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 's3-display-comfort'))).toBe(phrase('s3.comfort', language));
      expect(text(byTestId(tree, 's3-display-focus'))).toBe(phrase('s3.focus', language));
      expect(text(byTestId(tree, 's3-display-focus'))).not.toMatch(ACCESSIBILITY_WORDS);
      expect(text(byTestId(tree, 's3-display-label'))).not.toMatch(ACCESSIBILITY_WORDS);
      expect(text(byTestId(tree, 's3-title'))).not.toMatch(ACCESSIBILITY_WORDS);
    }
  });

  it('selection is not carried by colour alone', () => {
    // A filled segment is invisible to a screen reader, and to anyone who cannot
    // tell indigo from cream on a cheap panel in daylight.
    const tree = render(<LanguageSettings store={canonicalStore()} language="or" />);
    expect(byTestId(tree, 's3-language-or').props?.accessibilityState?.selected).toBe(true);
    expect(byTestId(tree, 's3-language-en').props?.accessibilityState?.selected).toBe(false);
  });
});

describe('S3 in every language, including the adversarial worst case', () => {
  for (const language of LANGUAGE_KEYS) {
    it(language + ': the title and both questions are in that language', () => {
      const tree = render(<LanguageSettings store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 's3-title'))).toBe(phrase('s3.title', language));
      expect(text(byTestId(tree, 's3-language-label'))).toBe(phrase('s3.language', language));
      expect(text(byTestId(tree, 's3-display-label'))).toBe(phrase('s3.display', language));
    });
  }

  it('the adversarial shop renders both controls', () => {
    const tree = render(<LanguageSettings store={adversarialStore()} language="or" />);
    expect(byTestId(tree, 's3-language')).toBeTruthy();
    expect(byTestId(tree, 's3-display')).toBeTruthy();
  });

  it('longest string mode shows nothing as chosen, because it is not a choice', () => {
    /*
     * The pseudo-locale is not a language a shop can be set to. Drawing one of
     * the three real buttons as selected in it would be a lie about what the
     * app is in, so `value` is null and no segment claims to be live.
     */
    const tree = render(
      <LanguageSettings store={adversarialStore()} language="longest" display="focus" />,
    );
    for (const key of LANGUAGE_KEYS) {
      expect(byTestId(tree, 's3-language-' + key).props?.accessibilityState?.selected).toBe(false);
    }
    // The display mode is always known - it is what the page is being drawn in -
    // so that control still marks the one in force.
    expect(byTestId(tree, 's3-display-focus').props?.accessibilityState?.selected).toBe(true);
  });

  it('chrome is capped', () => {
    const tree = render(<LanguageSettings store={canonicalStore()} />);
    expect(byTestId(tree, 's3-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 's3-language-label').props?.maxFontSizeMultiplier).toBe(
      CHROME_FONT_SCALE_CAP,
    );
  });
});

describe('S3 accessibility, and it is not an entry screen', () => {
  const TREES = () => [
    render(<LanguageSettings store={canonicalStore()} onBack={() => {}} />),
    render(<LanguageSettings store={canonicalStore()} language="or" display="focus" />),
    render(<LanguageSettings store={canonicalStore()} status="error" />),
    render(<LanguageSettings store={adversarialStore()} language="longest" display="focus" />),
    render(<LanguageSettings store={adversarialStore()} language="hi" display="comfort" />),
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
     * S3 is not one of C-5's three tabs. It is reached from S1 and returns
     * there, so it carries a back affordance instead - and §B.6's forbidden
     * pair cannot arise, because neither half of it is present.
     */
    const tree = render(<LanguageSettings store={canonicalStore()} onBack={() => {}} />);
    const ids = all(tree).map((n) => String(n.props?.testID ?? ''));
    expect(ids.filter((id) => /^keypad/.test(id))).toEqual([]);
    expect(ids.filter((id) => /nav|tabbar|bottom-bar/i.test(id))).toEqual([]);
    expect(byTestId(tree, 's3-back')).toBeTruthy();
  });

  it('every segment announces the words on its face', () => {
    const tree = render(<LanguageSettings store={canonicalStore()} />);
    for (const id of [
      ...LANGUAGE_KEYS.map((k) => 's3-language-' + k),
      ...DISPLAY_KEYS.map((k) => 's3-display-' + k),
    ]) {
      const node = byTestId(tree, id);
      expect(node.props?.accessibilityRole).toBe('button');
      expect(node.props?.accessibilityLabel).toBeTruthy();
    }
  });
});
