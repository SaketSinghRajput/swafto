/**
 * S14 - SIGNED-IN PHONES. C-21: a lost or sold phone can be signed out from
 * the one in his hand (M2-approved, FLOWS "Signed-in phones").
 *
 * NO NEW BACKEND. The API already lists the shop's devices (`GET /v1/devices`,
 * scoped by `shopOf` - the session's shop, never a request field) and revokes
 * one (`POST /v1/auth/devices/:id/revoke`). This screen draws that list and
 * asks before it sends the one destructive call.
 *
 * WHAT A ROW SAYS IS WHAT THE SERVER SAID. There is no device label column, so
 * a phone is "This phone" (the server marks the caller's own) or "Android
 * phone" (its platform), plus when it was last used. Nothing is guessed - not
 * a model name, not an owner, not a place.
 *
 * SIGNING OUT IS ASKED, WITH EQUAL WEIGHT FOR "NO". The sheet says what
 * happens (a new SMS code is needed) and what does not (entries already saved
 * stay). "Keep it signed in" is the larger, filled button, as on S8: on a
 * screen whose other answer cannot be undone, the emphasis belongs to the way
 * out. This phone's own row offers no sign-out: that is Log out, on S1.
 */
import { View, Text } from '@swafto/ui';
import { daysBetween } from '@swafto/formula-engine';
import { Shell, Card, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { Banner } from '../components/Banner.tsx';
import { Sheet } from '../components/Sheet.tsx';
import { Quiet, fill } from '../components/DayParts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type Strings } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

/** One device, as `GET /v1/devices` returns it. */
export interface DeviceView {
  readonly id: string;
  readonly platform: string;
  readonly lastSeenAt: string | null;
  readonly revokedAt: string | null;
  readonly current: boolean;
}

export interface DevicesState {
  readonly status: 'loading' | 'error' | 'ready';
  readonly list: readonly DeviceView[];
  /** The device he asked to sign out, while the question is up. */
  readonly confirm: string | null;
  /** True once a sign-out went through, so the screen can say so. */
  readonly done: boolean;
}

export interface SignedInPhonesProps {
  readonly store: Store;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly devices?: DevicesState;
  /** Today's date, 'YYYY-MM-DD', passed in - the screen reads no clock. */
  readonly today: string;
  readonly onAskSignOut?: (deviceId: string) => void;
  readonly onConfirmSignOut?: (deviceId: string) => void;
  readonly onCancelSignOut?: () => void;
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
}

/** "Last used" in whole days, from the server's own timestamp. */
export function lastUsed(device: DeviceView, today: string, s: Strings): string {
  if (device.current) return s('s14.lastUsed.now');
  if (device.lastSeenAt === null) return '';
  const days = daysBetween(device.lastSeenAt.slice(0, 10), today);
  return days <= 0 ? s('s14.lastUsed.today') : fill(s('s14.lastUsed.days'), { n: days });
}

const LOADING: DevicesState = { status: 'loading', list: [], confirm: null, done: false };

export function SignedInPhones({
  store,
  language = 'en',
  display = 'comfort',
  devices = LOADING,
  today,
  onAskSignOut = () => {},
  onConfirmSignOut = () => {},
  onCancelSignOut = () => {},
  onBack,
  onRetry = () => {},
}: SignedInPhonesProps) {
  const t = tokens(display);
  const s = strings(language);
  void store;
  const asked = devices.list.find((d) => d.id === devices.confirm);

  return (
    <Shell
      id="s14"
      s={s}
      display={display}
      status={devices.status === 'loading' ? 'loading' : 'ready'}
      titleKey="s14.title"
      // An account always has at least this phone, so an empty list is not a state it can reach.
      empty={false}
      onBack={onBack}
      onRetry={onRetry}
      overlay={
        asked === undefined ? undefined : (
          <Sheet
            testID="s14-confirm"
            title={s('s14.confirm.title')}
            body={s('s14.confirm.body')}
            closeLabel={s('s14.confirm.keep')}
            onClose={onCancelSignOut}
            display={display}
            showClose={false}
          >
            <PrimaryButton
              testID="s14-confirm-keep"
              label={s('s14.confirm.keep')}
              onPress={onCancelSignOut}
              display={display}
            />
            <PrimaryButton
              testID="s14-confirm-yes"
              label={s('s14.confirm.yes')}
              onPress={() => onConfirmSignOut(asked.id)}
              display={display}
              variant="tonal"
              size="lg"
            />
          </Sheet>
        )
      }
    >
      <View style={{ padding: t.space.md }}>
        <Quiet testID="s14-intro" text={s('s14.body')} display={display} />
      </View>
      {devices.done ? (
        <Banner testID="s14-done" kind="info" icon="tick" text={s('s14.done')} display={display} />
      ) : null}
      {devices.status === 'error' ? (
        <Banner
          testID="s14-error"
          kind="error"
          text={s('s14.error')}
          display={display}
          action={{ testID: 's14-retry', label: s('common.retry'), onPress: onRetry }}
        />
      ) : (
        <Card testID="s14-list" display={display}>
          {devices.list.map((d) => (
            <View
              key={d.id}
              testID={'s14-device-' + d.id}
              style={{
                paddingHorizontal: t.space.md,
                paddingVertical: t.space.sm,
                borderBottomWidth: t.hairline,
                borderBottomColor: t.color.border,
              }}
            >
              <Text
                testID={'s14-device-' + d.id + '-name'}
                {...t.bodyText}
                style={{
                  fontFamily: t.font.bold,
                  fontSize: t.type.body,
                  lineHeight: t.leadingUncapped(t.type.body),
                  color: t.color.ink,
                }}
              >
                {d.current ? s('s14.thisPhone') : s('s14.android')}
              </Text>
              <Quiet
                testID={'s14-device-' + d.id + '-detail'}
                text={d.revokedAt !== null ? s('s14.revoked') : lastUsed(d, today, s)}
                display={display}
              />
              {d.current || d.revokedAt !== null ? null : (
                <PrimaryButton
                  testID={'s14-device-' + d.id + '-signout'}
                  label={s('s14.signOut')}
                  onPress={() => onAskSignOut(d.id)}
                  display={display}
                  variant="secondary"
                  size="md"
                />
              )}
            </View>
          ))}
        </Card>
      )}
    </Shell>
  );
}
