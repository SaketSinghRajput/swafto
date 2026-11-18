/**
 * A1 - SPLASH. The whole screen is one button, and that is the reference, not a
 * shortcut: Phone.dc.html:26 draws a full-bleed `<button aria-label="Continue">`
 * on the brand fill with the wordmark centred, and nothing else.
 *
 * NOT TIMED AND NOT ANIMATED (U-8). Whether production should auto-advance is a
 * question the reference does not answer, so this does not answer it either: it
 * waits for a tap, exactly as the picture does. The native window behind it is
 * the same brand colour (styles.xml), so there is no white frame between the
 * launcher and this screen.
 */
import { Pressable, Text } from '@swafto/ui';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';

/** The product's name. A name, not copy: it is the same in every language. */
export const WORDMARK = 'SWAFTO';

export interface SplashProps {
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onContinue?: () => void;
}

export function Splash({ language = 'en', display = 'comfort', onContinue = () => {} }: SplashProps) {
  const t = tokens(display);
  const s = strings(language);
  return (
    <Pressable
      testID="a1"
      accessibilityRole="button"
      accessibilityLabel={s('a1.continue')}
      onPress={onContinue}
      style={{
        flex: 1,
        minHeight: t.touchTarget,
        minWidth: t.touchTarget,
        backgroundColor: t.color.brand,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        testID="a1-wordmark"
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          fontFamily: t.font.bold,
          fontSize: t.type.hero,
          lineHeight: t.leading(t.type.hero),
          letterSpacing: t.space.xs,
          color: t.color.onBrand,
        }}
      >
        {WORDMARK}
      </Text>
    </Pressable>
  );
}
