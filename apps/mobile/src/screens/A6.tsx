/**
 * A6 - SESSION EXPIRED. The server stopped accepting this handset - a refresh
 * refused, usually because the same number signed in on another phone (ADR-007
 * device binding). The copy is ADR-007's, word for word.
 *
 * NO BACK. There is nowhere signed-in to go back to; the hardware key leaves
 * the app, and the book on the phone is untouched either way.
 *
 * The reference draws a lock glyph in a tinted circle above the shop name. This
 * build has no vector-icon dependency, and a font glyph or emoji renders
 * differently on every handset, so the circle is omitted rather than faked.
 */
import { View, Text } from '@swafto/ui';
import { Shell, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import type { AuthProblem } from '../app/session.tsx';
import { AuthNotice, fill, formatPhone } from './authParts.tsx';

export interface SessionExpiredProps {
  readonly shopName?: string;
  readonly phone?: string;
  readonly busy?: boolean;
  readonly problem?: AuthProblem | null;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onVerify?: () => void;
  readonly onRetry?: () => void;
}

export function SessionExpired({
  shopName = '',
  phone = '',
  busy = false,
  problem = null,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onVerify = () => {},
  onRetry = () => {},
}: SessionExpiredProps) {
  const t = tokens(display);
  const s = strings(language);
  return (
    <Shell
      id="a6"
      s={s}
      display={display}
      status={status}
      titleKey="a6.bar"
      // The reference: a navy band, then the shop name as the page's heading.
      bar="band"
      onRetry={onRetry}
      footer={
        <PrimaryButton
          testID="a6-verify"
          label={fill(s('a6.verify'), { phone: formatPhone(phone) })}
          onPress={onVerify}
          disabled={busy}
          display={display}
        />
      }
    >
      <View style={{ padding: t.space.lg, alignItems: 'center' }}>
        <Text
          testID="a6-shop"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            fontFamily: t.font.bold,
            fontSize: t.type.heading,
            lineHeight: t.leading(t.type.heading),
            color: t.color.ink,
            textAlign: 'center',
          }}
        >
          {shopName === '' ? s('s2.unnamed') : shopName}
        </Text>
        <Text
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            marginTop: t.space.sm,
            fontFamily: t.font.regular,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.inkMuted,
            textAlign: 'center',
          }}
        >
          {s('a6.body')}
        </Text>
      </View>
      <AuthNotice problem={problem} s={s} display={display} />
    </Shell>
  );
}
