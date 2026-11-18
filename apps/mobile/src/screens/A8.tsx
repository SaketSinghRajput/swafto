/**
 * A8 - LOG OUT OF THE SHOP? Reached from Settings, and a confirmation rather
 * than a one-tap action, because signing back in costs a real SMS.
 *
 * LOGGING OUT DOES NOT DELETE THE BOOK. The session tokens go; every entry,
 * day, party and queued row stays on this phone (offline-first - the ledger is
 * the shopkeeper's, not the session's). So the reference's pending line,
 * "signing out now will lose them", would be FALSE here and is not shown: the
 * line says the entries stay and upload on the next sign-in with this number.
 *
 * The count is entries only - the outbox also holds day and party rows, and
 * calling those "entries" would be counting something he did not type as one.
 */
import { View, Text } from '@swafto/ui';
import { Shell, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import { fill, formatPhone } from './authParts.tsx';

export interface LogoutConfirmProps {
  readonly shopName?: string;
  readonly phone?: string;
  /** Entries queued and not yet on the server. */
  readonly pendingEntries?: number;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onStay?: () => void;
  readonly onLogOut?: () => void;
  readonly onRetry?: () => void;
}

export function LogoutConfirm({
  shopName = '',
  phone = '',
  pendingEntries = 0,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onStay = () => {},
  onLogOut = () => {},
  onRetry = () => {},
}: LogoutConfirmProps) {
  const t = tokens(display);
  const s = strings(language);
  const shop = shopName === '' ? s('s2.unnamed') : shopName;
  const line =
    pendingEntries === 0
      ? s('a8.saved')
      : pendingEntries === 1
        ? s('a8.pendingOne')
        : fill(s('a8.pending'), { n: pendingEntries });

  return (
    <Shell
      id="a8"
      s={s}
      display={display}
      status={status}
      titleKey="a8.bar"
      // The reference: a navy band, then "Log out of {shop}?" as the heading.
      bar="band"
      onRetry={onRetry}
      footer={
        <View>
          <PrimaryButton
            testID="a8-stay"
            label={s('a8.stay')}
            onPress={onStay}
            variant="tonal"
            display={display}
          />
          <PrimaryButton
            testID="a8-logout"
            label={s('a8.logout')}
            onPress={onLogOut}
            variant="secondary"
            display={display}
          />
        </View>
      }
    >
      <Text
        testID="a8-heading"
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          paddingHorizontal: t.space.md,
          paddingTop: t.space.md,
          fontFamily: t.font.bold,
          fontSize: t.type.heading,
          lineHeight: t.leading(t.type.heading),
          color: t.color.ink,
        }}
      >
        {fill(s('a8.title'), { shop })}
      </Text>
      <Text
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          paddingHorizontal: t.space.md,
          paddingTop: t.space.sm,
          fontFamily: t.font.regular,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.inkMuted,
        }}
      >
        {fill(s('a8.body'), { phone: formatPhone(phone) })}
      </Text>
      <View
        testID={pendingEntries === 0 ? 'a8-saved' : 'a8-pending'}
        style={{
          margin: t.space.md,
          padding: t.space.md,
          borderRadius: t.radius.lg,
          borderWidth: t.hairline,
          borderColor: t.color.borderStrong,
          backgroundColor: t.color.surfaceRaised,
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
          {line}
        </Text>
      </View>
    </Shell>
  );
}
