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
import { formatPaise, type Paise } from '@swafto/formula-engine';
import { tokens, type Mode } from '../theme/tokens.ts';

export interface MoneyProps {
  /** Integer paise. Never a float, never a string - the type says so, and so does the lint. */
  readonly amount: Paise;
  readonly mode?: Mode;
  /** `figure` for the numbers a screen is about; `body` for figures inside a sentence. */
  readonly size?: 'figure' | 'body' | 'heading';
  /**
   * Show a leading + on positive amounts. Off by default: most figures here are
   * plainly positive and a + on every one is noise. On where a figure can go either
   * way, which is where the sign carries information.
   */
  readonly withSign?: boolean;
  /**
   * Colour the figure by direction. **Additive only** - the sign renders either way,
   * so a reader who cannot separate the two colours loses nothing.
   */
  readonly tone?: 'neutral' | 'directional';
  readonly testID?: string;
}

export function Money({
  amount,
  mode = 'comfort',
  size = 'body',
  withSign = false,
  tone = 'neutral',
  testID,
}: MoneyProps) {
  const t = tokens(mode);
  const negative = amount < 0;

  const color =
    tone === 'directional' ? (negative ? t.color.negative : t.color.positive) : t.color.ink;

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
      style={{
        fontFamily: t.font.medium,
        fontSize: t.type[size],
        color,
        // DC-005. Without this the column does not line up, in any language.
        fontVariant: ['tabular-nums'],
      }}
    >
      {formatPaise(amount, { withSign })}
    </Text>
  );
}
