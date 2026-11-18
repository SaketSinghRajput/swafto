/**
 * WHAT THE A-SERIES SHARES, AND NOTHING ELSE. Not a screen: the phone number as
 * it is shown, the placeholder substitution, and the two notices that say the
 * request never got an answer - which are the same words on A3, A4, A5 and A6.
 */
import { View, Text } from '@swafto/ui';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import type { Strings, StringKey } from '../i18n/strings.ts';
import type { AuthProblem } from '../app/session.tsx';

/** '9876543210' -> '98765 43210', as the reference prints it. Display only. */
export const formatPhone = (digits: string): string =>
  digits.length > 5 ? digits.slice(0, 5) + ' ' + digits.slice(5) : digits;

/** `{name}` placeholders, filled. The copy owns the sentence; this owns the gap. */
export const fill = (template: string, values: Readonly<Record<string, string | number>>): string =>
  template.replace(/\{(\w+)\}/g, (whole, k: string) => (k in values ? String(values[k]) : whole));

/** The notices that are not A5 states: no signal, or the server broke. */
const NOTICE: Partial<Record<AuthProblem, StringKey>> = {
  offline: 'auth.offline',
  failed: 'auth.failed',
};

/**
 * NOT RED. Y1 is explicit that being offline is not an error and never uses
 * red; the same quiet raised surface serves "the server broke", because in both
 * cases what he typed is still there and nothing was lost.
 */
export function AuthNotice({
  problem,
  s,
  display = 'comfort',
}: {
  readonly problem: AuthProblem | null;
  readonly s: Strings;
  readonly display?: DisplayMode;
}) {
  const key = problem === null ? undefined : NOTICE[problem];
  if (key === undefined) return null;
  const t = tokens(display);
  return (
    <View
      testID={'auth-notice-' + problem}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        marginHorizontal: t.space.md,
        marginTop: t.space.sm,
        padding: t.space.md,
        borderRadius: t.radius.lg,
        backgroundColor: t.color.surfaceRaised,
        borderWidth: t.hairline,
        borderColor: t.color.borderStrong,
      }}
    >
      <Text
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          fontFamily: t.font.regular,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.ink,
        }}
      >
        {s(key)}
      </Text>
    </View>
  );
}
