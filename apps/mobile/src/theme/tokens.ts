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
import { PixelRatio } from '@swafto/ui';

export type Mode = 'comfort' | 'focus';

/**
 * Colour — v2 "Mitra" (product/swafto-ui-redesign/DESIGN-SYSTEM-V2.md §1.1, approved
 * by Saket at M2, 2026-11-18). It REPLACES palette A1 "Marigold Ledger": warm paper
 * ground, a teal `brand` as the one fill, a tint and ink per action. Names are
 * added, values change, nothing is renamed - so every rule below still holds, and
 * every pair is measured in tokens.spec.tsx rather than trusted from this comment.
 *
 * THE MARIGOLD TRIO STAYS, UNDRAWN. `accent` keeps its four tests (white on
 * marigold is still not expressible) and nothing renders it after the migration.
 * Removing it is a separate decision (V2 §1.1), not a side effect of this one.
 *
 * CONTROL RIMS ARE NOW `edge`, at `edgeWidth`. `inkMuted` stays a valid control
 * border (7.42 on bg) but draws a heavy brown rim; `edge` clears 3:1 on all
 * three surfaces (3.69 at its lowest) and is what v2 draws.
 *
 * What follows is the A1 history, kept because the reasoning still binds:
 *
 * Palette A1 "Marigold Ledger", SPEC-DIGEST §9.
 *
 * COMFORT IS LIGHT, FOCUS IS DARK. Both of these were light until now: `focus` was a
 * black-on-white high-contrast variant, and the spec it was meant to implement says
 * "Comfort = light default, Focus = dark opt-in" with a full second column of values.
 * The code had drifted from a design system that was already built and written down,
 * so this is not a new decision - it is the first time the file agrees with §9.
 *
 * GROUND IS NOT WHITE, AND THAT IS THE DAYLIGHT ANSWER. `#FFF9EF` is warm paper; §9
 * records it as cutting shop-daylight glare, which is the job the old all-white
 * comfort mode was doing badly. Cards sit at pure white ABOVE that ground, so the
 * hierarchy comes from the warm/cool step rather than from a border.
 *
 * MARIGOLD IS A FILL, NEVER TYPE. White on `#F5A524` measures 2.04:1. So `onAccent`
 * is dark ink in BOTH modes at 8.75:1, and no token pairs white with marigold - an
 * invariant a comment cannot hold, which is why tokens.spec.tsx measures every pair
 * in every mode rather than trusting this paragraph.
 *
 * CONTROL BORDERS USE `inkMuted`, NOT `borderStrong`. §9 decision 1: borderStrong
 * measures under the 3:1 non-text gate, so it may separate and may not enclose
 * anything a thumb is meant to find. `border` is lighter still and is for rules
 * between rows, never around a control.
 */
const palette = {
  comfort: {
    /** surface-ground · warm paper (v2 "Mitra") */
    bg: '#FFF6EA',
    /** surface-card */
    surface: '#FFFFFF',
    /** surface-raised · tray, selected row, disabled fill */
    surfaceRaised: '#F6EADA',
    /** text-primary */
    ink: '#2B2118',
    /** text-muted · still a valid control border (7.42 on bg) */
    inkMuted: '#5E4E41',
    /** v2: the control rim, drawn at `edgeWidth`. Clears 3:1 on all three surfaces. */
    edge: '#8A7560',
    /** THE teal: primary fill, Sale tile, progress, done mark. */
    brand: '#0A6B66',
    /** brand as text or link */
    brandSoft: '#0A6B66',
    onBrand: '#FFFFFF',
    /** v2: a pressed primary. */
    brandPressed: '#08524E',
    /** v2: the header bar fill, and the text on it. */
    header: '#0A6B66',
    onHeader: '#FFFFFF',
    /** marigold - RETAINED, UNUSED after the v2 migration (DESIGN-SYSTEM-V2 1.1). */
    accent: '#F5A524',
    accentPressed: '#DB9317',
    onAccent: '#12181F',
    /** money-in */
    positive: '#1E6B2E',
    /** money-out · clay, not red: red means "refused" and nothing else. */
    negative: '#A3410C',
    /** v2 status inks: never the only signal (icon and word always beside them). */
    success: '#1E6B2E',
    warning: '#6B4400',
    info: '#24508F',
    /** rule, card rim, skeleton, progress track */
    border: '#E6D5BF',
    /** rule-strong · separates, never encloses */
    borderStrong: '#C9BCA3',
    /** THE CHOSEN SEGMENT (F-41), the brand teal in both modes. */
    selected: '#0A6B66',
    onSelected: '#FFFFFF',
    /** Problem-card fills. Red: refused. Gold: waiting, stale. Indigo: info. */
    tintRed: '#FCE8E4',
    tintGold: '#FFE9B8',
    tintIndigo: '#E7EBF2',
    /** v2 action tints and their inks. Hue is decoration: the word carries the meaning. */
    tintSale: '#DDF3EF',
    inkSale: '#0A6B66',
    tintUdhar: '#EDE4F7',
    inkUdhar: '#5B2E91',
    tintCollect: '#E3F2D6',
    inkCollect: '#2F6B1B',
    tintExpense: '#FDE6D3',
    inkExpense: '#8F4408',
    tintMore: '#EFE7DC',
    inkMore: '#5E4E41',
    /** The sheet backdrop. The one translucent value; never under text. */
    scrim: '#2B211880',
  },
  focus: {
    bg: '#1A1410',
    surface: '#261E18',
    surfaceRaised: '#30261E',
    ink: '#F6EDE2',
    inkMuted: '#BFAF9E',
    edge: '#9C8A78',
    brand: '#4FC3BA',
    brandSoft: '#4FC3BA',
    onBrand: '#10201F',
    brandPressed: '#3AA79F',
    /**
     * The Focus header is `surface`, so it is NOT told apart from the ground by
     * colour (1.11 measured). Shell keeps the `borderStrong` hairline under it.
     */
    header: '#261E18',
    onHeader: '#F6EDE2',
    accent: '#F5A524',
    accentPressed: '#DB9317',
    onAccent: '#12181F',
    positive: '#6FD48A',
    negative: '#F2A06A',
    success: '#6FD48A',
    warning: '#F2CF7A',
    info: '#8FB0E4',
    border: '#3E3126',
    /** Warm now, and still under 3:1 on bg (2.00) - it separates, never encloses. */
    borderStrong: '#54463A',
    selected: '#4FC3BA',
    onSelected: '#10201F',
    tintRed: '#331C18',
    tintGold: '#3A2E12',
    tintIndigo: '#1B2436',
    tintSale: '#12302D',
    inkSale: '#7EE0D8',
    tintUdhar: '#2A1F3D',
    inkUdhar: '#CDB2F0',
    tintCollect: '#1F3018',
    inkCollect: '#A5DB86',
    tintExpense: '#3A2412',
    inkExpense: '#FFB27A',
    tintMore: '#30261E',
    inkMore: '#BFAF9E',
    scrim: '#000000B3',
  },
} as const;

/**
 * Spacing in dp. `gutter` is v2's one addition (V2 §1.4): the concept spaces
 * everything at 12, and at `md` it cost the vertical budget the keypad needs.
 * A value between two steps is still a decision nobody made - this one was made.
 */
const space = { xs: 4, sm: 8, gutter: 12, md: 16, lg: 24, xl: 32 } as const;

/**
 * THE TEXT-SIZE PICKER (V2 §3.15): Normal, Large, Extra large.
 *
 * IT BEHAVES EXACTLY LIKE THE SYSTEM FONT SCALE, AND THAT IS THE POINT. Every
 * type step is multiplied by the step, and the chrome cap and the body ceiling
 * are DIVIDED by it - so chrome still stops at 1.5x in total and body copy at
 * 2.0x, whatever the step. Any (step, system scale) pair therefore draws a
 * layout `check:layout` already measures at 1, 1.5 or 2: Extra large at system
 * 1.0 is the measured 1.5 case, at system 2.0 the measured 2.0 case.
 *
 * A DEVIATION FROM V2, MEASURED RATHER THAN PREFERRED: V2 scales body and
 * figures only. Scaling `body` alone grows every chrome Text set in `body` (a
 * button, a tab) past 1.5x unless the cap is divided - and a divided cap with
 * unscaled `label`/`heading` SHRANK the header at a large system setting
 * (1.0x in total at Extra large). Scaling all steps is the one arrangement in
 * which no Text is ever smaller than at Normal and none exceeds a measured cap.
 *
 * MODULE STATE, LIKE THE SYSTEM FONT SCALE IT SITS BESIDE. `PixelRatio` is read
 * on every `tokens()` call below; this is the same kind of value, set by the
 * app from the persisted choice, so no screen has to thread it through. At
 * `normal` every token is identical to what it was before the picker existed.
 */
export type TextSize = 'normal' | 'large' | 'xlarge';
export const TEXT_SIZES: readonly TextSize[] = ['normal', 'large', 'xlarge'];
const textScale = { normal: 1, large: 1.25, xlarge: 1.5 } as const;
let currentTextSize: TextSize = 'normal';
export const setTextSize = (size: TextSize): void => {
  currentTextSize = size;
};
export const textSizeNow = (): TextSize => currentTextSize;
/** The most a body Text may grow in total, step and system scale together. */
const BODY_SCALE_CEILING = 2;

/**
 * Type sizes in sp. `body` IS the registry minimum rather than a number chosen here,
 * so the smallest text in the product is the floor by construction - a screen cannot
 * go under it without going under a token.
 */
const type = {
  comfort: {
    body: BODY_TEXT_MIN_SP,
    label: BODY_TEXT_MIN_SP,
    /** v2: tile label, hero label, list name, avatar initial, step title. */
    lead: BODY_TEXT_MIN_SP + 2,
    figure: BODY_TEXT_MIN_SP + 7,
    heading: BODY_TEXT_MIN_SP + 4,
    /** v2: "In the box now" and the ledger total, one step larger (was +15). */
    hero: BODY_TEXT_MIN_SP + 19,
  },
  focus: {
    body: BODY_TEXT_MIN_SP + 3,
    label: BODY_TEXT_MIN_SP + 2,
    lead: BODY_TEXT_MIN_SP + 5,
    figure: BODY_TEXT_MIN_SP + 12,
    heading: BODY_TEXT_MIN_SP + 8,
    hero: BODY_TEXT_MIN_SP + 21,
  },
} as const;

type TypeScale = { readonly [K in keyof (typeof type)['comfort']]: number };

/**
 * Every step grows with the picker, as it would with the system scale (see
 * above). FLOORED, never rounded: 21 x 1.5 rounded is 32, and 32 under the
 * divided cap is 1.52x in total - over the 1.5 the cap promises.
 */
const scaledType = (mode: Mode, step: number): TypeScale => {
  const base = type[mode];
  if (step === 1) return base;
  const up = (sp: number) => Math.floor(sp * step);
  return {
    body: up(base.body),
    label: up(base.label),
    lead: up(base.lead),
    figure: up(base.figure),
    heading: up(base.heading),
    hero: up(base.hero),
  };
};

/**
 * THE LINE HEIGHT OF CAPPED TEXT, CORRECTED FOR WHAT REACT NATIVE DOES WITH IT.
 *
 * React Native 0.81 on Android (Fabric, `TextAttributeProps.setLineHeight`)
 * scales `lineHeight` by the FULL system font scale, while `fontSize` is
 * scaled by `min(scale, maxFontSizeMultiplier)`. So at font scale 2.0 a capped
 * label's glyphs stop at 1.5x and its line keeps going to 2x: the 1.8 ratio
 * became 2.4, and the offline notice ran to five loose lines (pass 4) and a
 * Hindi label's line box no longer matched its text (HT-30). Scaling the
 * requested height by cap/scale puts the ratio back at 1.8 on the device.
 * Below the cap the factor is 1 and nothing changes.
 */
const cappedLineScale = (cap: number): number => {
  const scale = PixelRatio.getFontScale();
  return scale > cap ? cap / scale : 1;
};

export const tokens = (mode: Mode = 'comfort', size: TextSize = currentTextSize) =>
  tokensFor(mode, size, textScale[size]);

const tokensFor = (mode: Mode, size: TextSize, step: number) =>
  ({
    mode,
    color: palette[mode],
    space,
    type: scaledType(mode, step),
    /** The picker's three steps, and the one in force (V2 §3.15). */
    textScale,
    textSize: size,
    /** Every interactive element is at least this. The value is the registry's. */
    touchTarget: TOUCH_TARGET_MIN_DP,
    /**
     * CONTROL HEIGHTS, AND WHY THE FLOOR WAS NOT ALSO THE ANSWER.
     *
     * Every control in the app was built at `touchTarget` exactly - the registry
     * MINIMUM used as the size. That is a floor doing a designer's job: it makes a
     * keypad key, a ledger row, a cancel link and the one button that closes the
     * day all the same height, so nothing on a screen looks more important than
     * anything else. The device build showed it plainly - six entry rails and the
     * day-close button were indistinguishable but for colour.
     *
     * So three steps, each DERIVED FROM THE FLOOR rather than typed beside it. A
     * size cannot go under the minimum without the minimum itself moving, which is
     * the construction `type.body` already uses one block down. The registry value
     * is unchanged and `undersizedTargets` still measures against it.
     *
     *   md - the floor. Rows, chips, back, anything in a list.
     *   lg - a keypad key, a segment, a secondary button.
     *   xl - the single primary action on a screen, and nothing else.
     */
    control: {
      md: TOUCH_TARGET_MIN_DP,
      lg: TOUCH_TARGET_MIN_DP + 8,
      xl: TOUCH_TARGET_MIN_DP + 16,
    },
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
    leading: (sizeSp: number) =>
      Math.round(sizeSp * 1.8 * cappedLineScale(CHROME_FONT_SCALE_CAP / step)),
    /**
     * For the few Text nodes that are NOT capped (`allowFontScaling`, money):
     * their size and their line both grow with the system scale, so the plain
     * ratio is already right and must not be corrected.
     */
    leadingUncapped: (sizeSp: number) => Math.round(sizeSp * 1.8),
    /**
     * Chrome stops growing here, so navigation cannot eat the content. Under a
     * larger text-size step the cap is divided by the step, so chrome is never
     * more than 1.5x in total (V2 §3.15). At `normal` it is the cap unchanged.
     */
    maxFontScale: step === 1 ? CHROME_FONT_SCALE_CAP : CHROME_FONT_SCALE_CAP / step,
    /**
     * BODY COPY IS NOT CHROME (USABILITY §4 item 9, WCAG 1.4.4).
     *
     * Every Text in the product was capped at the chrome cap, so a reader who
     * chose the largest system size got 1.5x body copy and a broken layout
     * anyway (U-63 to U-69). The cap exists so navigation cannot eat the
     * content; applied to the content itself it simply refuses the setting.
     *
     * Spread onto a body Text: `<Text {...t.bodyText} ...>`, with its line
     * height from `leadingUncapped`. `maxFontSizeMultiplier: 0` is React
     * Native's "no ceiling", so the copy follows the system setting, whose own
     * top on Android is 2.0x. `dataSet` renders as `data-font-scale="body"` on
     * react-native-web, which is how `check:layout` knows to scale this node the
     * whole way rather than stop it at the cap - an instrument that capped it
     * would be measuring a layout the device never draws.
     */
    bodyText: {
      // 0 is "no ceiling" at Normal, exactly as before. Under a larger step the
      // ceiling is 2.0 / step, so step x system scale never passes 2.0 (V2 §3.15).
      maxFontSizeMultiplier: step === 1 ? 0 : BODY_SCALE_CEILING / step,
      dataSet: { fontScale: 'body' },
    },
    /**
     * §9's four radii under the names already in use: `md` is a control, `lg` is a
     * card, `xl` is a bottom sheet and `pill` is a fully round end. `sm` predates
     * them and is kept because removing a token is a separate change.
     */
    /*
     * v2 (V2 §1.4): md 16 for a key and a skeleton row; lg 20 for a card, tile,
     * row and banner; xl 24 for the header foot, the hero and the sheet top.
     */
    radius: { sm: 4, md: 16, lg: 20, xl: 24, pill: 999 },
    /**
     * The one rule weight in the product. A separator is a hairline or it is not a
     * separator, and giving it a scale invites a screen to draw a heavier line to
     * mean "more important" - which is a job for space and weight, not for a border.
     */
    hairline: 1,
    /**
     * v2's second weight, and the only other one: the rim of a CONTROL (a key,
     * a segment tray, a chip, an outlined button), drawn in `color.edge`. A rule
     * is still a hairline; a control's boundary is this.
     */
    edgeWidth: 2,
    /**
     * DEPTH, AS ANDROID DRAWS IT. §9's elevation-card is a CSS box-shadow; React
     * Native's `shadow*` props are iOS-only and this app ships Android, where the
     * one honest knob is `elevation`. So it is one number rather than four, and
     * there is no shadow-colour token because the platform picks it.
     *
     * A card is 2 and a sheet is 8 - far enough apart that "which is in front" is
     * answerable by looking, which is the only thing elevation is for.
     */
    /*
     * v2: CARDS ARE FLAT (card 0, was 2). Only the sheet casts depth. Twelve
     * shadowed keypad keys were the heaviest GPU work on a budget handset, and
     * the warm/white step plus the rim now does what the shadow did.
     */
    elevation: { card: 0, sheet: 8 },
    /**
     * MOTION - F-15. The reference's `tokens.css` carries exactly two durations
     * and one curve, and so does this: `--motion-state: 160ms` for a control
     * changing state, `--motion-sheet: 240ms` for something arriving or filling,
     * `--easing: cubic-bezier(.2,0,0,1)`. Its `prefers-reduced-motion` block sets
     * both durations to 0ms; `motionMs(kind, reduced)` is that block, so a screen
     * cannot ask for a duration without also saying whether motion is wanted.
     *
     * The reference's ring declares a literal `400ms` outside its own token set
     * and outside the reduced-motion override. That literal is not copied; the
     * ring uses `sheet`, which the override governs.
     */
    motion: {
      state: 160,
      sheet: 240,
      easing: [0.2, 0, 0, 1] as const,
    },
    /**
     * THE PROGRESS RING. 72 across with an 8 stroke - the reference draws 76
     * with a 6/64 stroke (about 7). 72 is `control.xl` and 8 is `space.sm`, so
     * the ring sits on steps the rest of the product already uses rather than
     * introducing a ninth spacing value for one drawing.
     */
    ring: { size: TOUCH_TARGET_MIN_DP + 16, stroke: 8 },
    /**
     * Marks drawn from Views because the app carries no vector library and an
     * APK rebuild may not add a native module: the back chevron, the tick on an
     * entered section, the dash on a skipped one. `badge` is the circle they sit
     * in (the reference's 32), `size` the mark itself, `stroke` its line weight.
     */
    glyph: { badge: 32, size: 12, stroke: 2 },
    /** v2 discs: `sm` a step mark, hero icon or More tile; `md` a tile pictogram or avatar. */
    disc: { sm: 40, md: 48 },
    /**
     * v2 icon sizes. Every one is at or above the body floor, so `undersizedText`
     * never flags an icon glyph (V2 §1.4).
     */
    icon: { sm: 20, md: 24, lg: 28 },
    /**
     * The bundled family. The app ships Anek because a budget Android handset may
     * carry no Odia font at all (DC-004), and a missing glyph is not a degraded
     * experience - it is a row of empty boxes where the money was.
     */
    font: {
      regular: 'AnekOdia-Regular',
      medium: 'AnekOdia-Medium',
      bold: 'AnekOdia-Bold',
      /** v2: the Lucide subset (ISC), drawn only by `ui/Icon.tsx`. */
      icons: 'SwaftoIcons',
    },
  }) as const;

export type Tokens = ReturnType<typeof tokens>;

/**
 * A duration, with the reduced-motion override applied. `tokens.css` zeroes
 * both durations under `prefers-reduced-motion`; this is the same rule, read
 * from `AccessibilityInfo.isReduceMotionEnabled` by the caller.
 */
export const motionMs = (kind: 'state' | 'sheet', reduced: boolean): number =>
  reduced ? 0 : tokens().motion[kind];

/**
 * The sheet's height limit, as a percentage string: numeric widths and heights
 * are design values `check:design` refuses outside this file (V2 §3.13).
 */
export const SHEET_MAX_HEIGHT = '85%';
