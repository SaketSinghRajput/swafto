/**
 * THE DESIGN TOKENS. Every colour, size and space in the app comes from here.
 *
 * `check:design` fails the build on a raw value in any screen or component, so this
 * is not a convention - it is the only place such a value may appear. DESIGN.md's
 * RAW VALUES table should stay empty for the life of the product, and the first row
 * that appears is a hardcoded value caught before it reaches eight more screens.
 *
 * TWO MODES, ONE SET. Comfort and Focus are the same tokens with different values,
 * never different tokens. A token that exists in one mode only is a finding, because
 * the whole arrangement rests on one set driving both.
 *
 * Focus is NOT "the mode for old people". It exists because a cheap screen in shop
 * daylight is hard to read, which is a fact about the shop rather than about the
 * user. Framing it as an accessibility setting is how people are made to refuse it.
 *
 * THE MINIMUMS ARE NOT DEFINED HERE. Touch target, body text and the font-scale cap
 * live in `@swafto/values`, because documents and checks read them too and a value
 * with two homes drifts. This file consumes them and never restates them.
 */
import { TOUCH_TARGET_MIN_DP, BODY_TEXT_MIN_SP, CHROME_FONT_SCALE_CAP } from '@swafto/values';

export type Mode = 'comfort' | 'focus';

/**
 * Colour. Marigold is the brand accent and the reason B27 exists: white text on it
 * fails the contrast minimum. So `onAccent` is ink in BOTH modes, and no token pairs
 * white with marigold - the safest way never to ship that pair is for it not to be
 * expressible.
 *
 * IT WAS EXPRESSIBLE UNTIL ITERATION 37, AND THIS COMMENT SAID OTHERWISE. Focus mode
 * carried onAccent: white over accent #B87214, which measures 3.85:1 against a 4.5
 * minimum - in the mode that exists specifically for the hardest reading conditions.
 * The claim above was written first and the palette drifted out from under it; the
 * comment kept asserting an invariant nobody was checking. Every token pair in every
 * mode is now measured by a test rather than promised here, which is the only reason
 * to believe the sentence this time.
 */
const palette = {
  comfort: {
    bg: '#FFFFFF',
    surface: '#F7F5F2',
    ink: '#1A1A1A',
    inkMuted: '#5C5C5C',
    accent: '#E8A33D',
    onAccent: '#1A1A1A',
    positive: '#1B6E3C',
    negative: '#A3231B',
    border: '#D9D4CE',
  },
  focus: {
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    ink: '#000000',
    inkMuted: '#3A3A3A',
    accent: '#B87214',
    onAccent: '#000000',
    positive: '#0E4F28',
    negative: '#7A140E',
    border: '#000000',
  },
} as const;

/** Spacing in dp. Four steps; a value between two steps is a decision nobody made. */
const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

/**
 * Type sizes in sp. `body` IS the registry minimum rather than a number chosen here,
 * so the smallest text in the product is the floor by construction - a screen cannot
 * go under it without going under a token.
 */
const type = {
  comfort: {
    body: BODY_TEXT_MIN_SP,
    label: BODY_TEXT_MIN_SP,
    figure: BODY_TEXT_MIN_SP + 7,
    heading: BODY_TEXT_MIN_SP + 4,
    hero: BODY_TEXT_MIN_SP + 15,
  },
  focus: {
    body: BODY_TEXT_MIN_SP + 3,
    label: BODY_TEXT_MIN_SP + 2,
    figure: BODY_TEXT_MIN_SP + 12,
    heading: BODY_TEXT_MIN_SP + 8,
    hero: BODY_TEXT_MIN_SP + 21,
  },
} as const;

export const tokens = (mode: Mode = 'comfort') =>
  ({
    mode,
    color: palette[mode],
    space,
    type: type[mode],
    /** Every interactive element is at least this. The value is the registry's. */
    touchTarget: TOUCH_TARGET_MIN_DP,
    /**
     * LINE HEIGHT, SIZED FOR INDIC INK RATHER THAN LATIN.
     *
     * Measured on the shipped AnekOdia-Medium at 24px: the font declares an ascent
     * of 24 and a descent of 17, but Odia ink reaches 26 ABOVE the baseline -
     * above-base matras exceed the font's own declared ascent. Latin ink in the
     * same face reaches 16 and never comes close. So a line box derived from the
     * font metrics is correct for English and clips Odia, which is DC-005 again in
     * a different costume: the default is fine until the language changes, and the
     * language it breaks on is the one nobody here can proofread.
     *
     * 1.8 rather than a tighter figure because the measurement is of the strings
     * this product happens to use today. A conjunct nobody has typed yet can stack
     * higher, and the cost of the headroom is a few dp while the cost of being
     * wrong is a clipped vowel that changes what a word says.
     */
    leading: (sizeSp: number) => Math.round(sizeSp * 1.8),
    /** Chrome stops growing here, so navigation cannot eat the content. */
    maxFontScale: CHROME_FONT_SCALE_CAP,
    radius: { sm: 4, md: 8, lg: 12 },
    /**
     * The one rule weight in the product. A separator is a hairline or it is not a
     * separator, and giving it a scale invites a screen to draw a heavier line to
     * mean "more important" - which is a job for space and weight, not for a border.
     */
    hairline: 1,
    /**
     * The bundled family. The app ships Anek because a budget Android handset may
     * carry no Odia font at all (DC-004), and a missing glyph is not a degraded
     * experience - it is a row of empty boxes where the money was.
     */
    font: {
      regular: 'AnekOdia-Regular',
      medium: 'AnekOdia-Medium',
      bold: 'AnekOdia-Bold',
    },
  }) as const;

export type Tokens = ReturnType<typeof tokens>;
