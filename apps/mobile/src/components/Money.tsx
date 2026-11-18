/**
 * THE ONLY WAY A RUPEE FIGURE REACHES THE SCREEN.
 *
 * Three things must be true of every money figure in this product, and each is the
 * kind that gets remembered on screens one to five and forgotten on six:
 *
 *  1. TABULAR DIGITS. Anek Odia's digits are PROPORTIONAL by default (DC-005), so a
 *     column of figures does not line up unless the `tnum` OpenType feature is on.
 *     React Native exposes it as `fontVariant: ['tabular-nums']`. In a cash app a
 *     column that does not align is not cosmetic - it is the screen where he checks
 *     the arithmetic he came here to trust.
 *
 *  2. LATIN NUMERALS, IN EVERY LANGUAGE. Words localise; money does not. The engine's
 *     formatter is the single render boundary (ADR-003) and it groups the Indian way
 *     - 1,23,456.78 - because that is how the figure is read aloud in Odia, Hindi and
 *     Indian English alike.
 *
 *  3. SIGN AND DIRECTION, NEVER COLOUR ALONE. Red and green are the two colours most
 *     often indistinguishable to the eye this product is built for, and shop daylight
 *     makes it worse. The sign is always rendered; colour is additive and never a
 *     substitute for it.
 *
 * ADR-018 states the rule this component exists to make keepable: **money is never
 * rendered by a bare `<Text>`.** One component, one place, and a check that no money
 * value reaches a bare Text - the same shape as ADR-003 confining money arithmetic to
 * the audited helpers.
 */
import { Text } from '@swafto/ui';
import { formatPaise, subtract, type Paise } from '@swafto/formula-engine';
import { tokens, type Mode, type TextSize } from '../theme/tokens.ts';

/**
 * The surface this figure is drawn on, where it is not one of the three the
 * palette calls a surface. Only the brand bar qualifies today.
 */
interface MoneyBase {
  /** Integer paise. Never a float, never a string - the type says so, and so does the lint. */
  readonly amount: Paise;
  readonly mode?: Mode;
  /**
   * `body` for a figure inside a sentence, `figure` for the numbers a screen
   * lists, `heading` where it titles a group - and `hero` for the ONE figure a
   * screen exists to show, which is the header canvas and nowhere else.
   *
   * `hero` is not decoration. On the device build the day's expected cash was a
   * `figure` sharing a cramped strip with the screen title, and it is the single
   * thing the shopkeeper opens the app to read.
   */
  readonly size?: 'figure' | 'body' | 'heading' | 'hero';
  /**
   * Show a leading + on positive amounts. Off by default: most figures here are
   * plainly positive and a + on every one is noise. On where a figure can go either
   * way, which is where the sign carries information.
   */
  readonly withSign?: boolean;
  /**
   * A MONEY-OUT LINE: `amount` is the magnitude, and the line is drawn negative
   * whatever its size - ZERO INCLUDED.
   *
   * The sign used to be decided by the number alone, so an out-line was passed
   * `subtract(0, amount)` and a quiet day rendered "Cash you took +₹0.00": a plus
   * on the line that only ever takes money away. The reference (`store.js` `neg`)
   * signs every out-line negative. The direction belongs to the LINE, not to the
   * value, so the line says it here. A genuine cash-flow figure that can go
   * either way does not pass this, and keeps its sign-by-value rule.
   */
  readonly out?: boolean;
  readonly testID?: string;
  /**
   * The text-size step to draw at, where it is not the one in force. Only the
   * text-size picker's preview passes it - to show the step being chosen
   * before it is chosen. Every other figure follows the app's setting.
   */
  readonly textSize?: TextSize;
}

/**
 * TONE AND SURFACE, AS A UNION, BECAUSE ONE COMBINATION IS UNREADABLE.
 *
 * `money-in` on the brand fill measures **2.2:1** in comfort mode and `money-out`
 * **2.67:1**, against a 4.5 floor - both fine in focus, where the bar is nearly
 * black, and both illegible in the default mode. A figure in the Shell header is
 * therefore neutral or it is nothing.
 *
 * This is the tokens file's own rule applied one level down: the safest way never
 * to ship a pair is for it not to be expressible. A comment saying "do not pass
 * directional with onFill" is a comment somebody overrides at screen six; a type
 * error is not. The ratios themselves are measured in tokens.spec.tsx, so if the
 * brand colour ever lightens enough to make the pair legal, the test says so.
 */
export type MoneyProps = MoneyBase &
  (
    | {
        readonly onFill?: undefined;
        /**
         * Colour the figure by direction. **Additive only** - the sign renders
         * either way, so a reader who cannot separate the two colours loses nothing.
         */
        readonly tone?: 'neutral' | 'directional';
      }
    | { readonly onFill: 'brand'; readonly tone?: 'neutral' }
    /*
     * v2: THE HEADER IS ITS OWN SURFACE. In Focus it is `surface`-dark while
     * `brand` is light teal, so `onBrand` (near-black there) would vanish on
     * it. A figure in the header reads `onHeader`. Still neutral only: the
     * same refusal, one surface over.
     */
    | { readonly onFill: 'header'; readonly tone?: 'neutral' }
  );

export function Money({
  amount,
  mode = 'comfort',
  size = 'body',
  withSign = false,
  tone = 'neutral',
  onFill,
  out = false,
  testID,
  textSize,
}: MoneyProps) {
  const t = tokens(mode, textSize);
  const shown = out ? subtract(0, amount) : amount;
  // A zero out-line is still an out-line: it reads as money out, never "+".
  const zeroOut = out && shown === 0;
  const negative = shown < 0 || zeroOut;

  const color =
    tone === 'directional'
      ? negative
        ? t.color.negative
        : t.color.positive
      : onFill === 'brand'
        ? t.color.onBrand
        : onFill === 'header'
          ? t.color.onHeader
          : t.color.ink;

  return (
    <Text
      testID={testID}
      /*
       * allowFontScaling stays TRUE. A money figure must grow with the reader's
       * system setting; capping it would be choosing our layout over his eyesight.
       * The chrome cap exists precisely so content never has to be capped, and B31
       * checks the layout survives - this is not the place to avoid the problem by
       * refusing to scale.
       */
      allowFontScaling
      /*
       * No ceiling at Normal - the prop is not even set, exactly as before.
       * Under a larger text-size step the ceiling is 2.0 / step, so the figure
       * never passes the 2.0x that check:layout measures (V2 3.15).
       */
      {...(t.textSize === 'normal' ? {} : { maxFontSizeMultiplier: t.bodyText.maxFontSizeMultiplier })}
      style={{
        fontFamily: t.font.medium,
        fontSize: t.type[size],
        lineHeight: t.leadingUncapped(t.type[size]),
        color,
        // DC-005. Without this the column does not line up, in any language.
        fontVariant: ['tabular-nums'],
      }}
    >
      {zeroOut ? `-${formatPaise(shown)}` : formatPaise(shown, { withSign })}
    </Text>
  );
}
