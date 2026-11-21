/**
 * X4 - THE APP-LOCK OFFER. The last step of first-time setup (Saket, 2026-11-20).
 *
 * The live demo on a Galaxy A36 went from setup straight to Today and never met
 * the lock: it is off by default and lives in Settings, where a shopkeeper who
 * does not go looking never finds it - while the udhar book on the counter
 * holds customers' names and numbers. So setup now asks, once.
 *
 * ONE QUESTION, TWO ANSWERS, NEVER A WALL. "Turn on" runs the same enable flow
 * as S1's switch: the phone's own screen lock is asked first, and only a pass
 * turns it on. "Not now" goes on to Today; the switch stays in Settings. A
 * phone with no screen lock gets one sentence saying he can set one later, and
 * Continue - setup is never blocked on a lock he does not have.
 *
 * NOT SHOWN TO A FINISHED INSTALL. X1 is the only way here, and X1 is reached
 * once. The choice is remembered the way S1's is: the `appLock` pref.
 */
import { View, Text } from '@swafto/ui';
import { Shell, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';

export interface LockOfferProps {
  /** The last "Turn on" found no screen lock on this phone. */
  readonly noScreenLock?: boolean;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onTurnOn?: () => void;
  readonly onNotNow?: () => void;
  readonly onRetry?: () => void;
}

export function LockOffer({
  noScreenLock = false,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onTurnOn = () => {},
  onNotNow = () => {},
  onRetry = () => {},
}: LockOfferProps) {
  const t = tokens(display);
  const s = strings(language);
  const body = {
    fontFamily: t.font.regular,
    fontSize: t.type.body,
    lineHeight: t.leading(t.type.body),
    color: t.color.ink,
  } as const;
  return (
    <Shell
      id="x4"
      s={s}
      display={display}
      status={status}
      titleKey="x4.title"
      onRetry={onRetry}
      footer={
        noScreenLock ? (
          <PrimaryButton testID="x4-continue" label={s('x4.continue')} onPress={onNotNow} display={display} />
        ) : (
          <View>
            <PrimaryButton testID="x4-turn-on" label={s('x4.turnOn')} onPress={onTurnOn} display={display} />
            <PrimaryButton
              testID="x4-not-now"
              label={s('x4.notNow')}
              onPress={onNotNow}
              variant="ghost"
              size="md"
              display={display}
            />
          </View>
        )
      }
    >
      <View style={{ padding: t.space.md }}>
        <Text
          testID="x4-question"
          accessibilityRole="header"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            fontFamily: t.font.bold,
            fontSize: t.type.heading,
            lineHeight: t.leading(t.type.heading),
            color: t.color.ink,
          }}
        >
          {s('x4.question')}
        </Text>
        <Text testID="x4-why" maxFontSizeMultiplier={t.maxFontScale} style={{ ...body, marginTop: t.space.sm }}>
          {s('x4.why')}
        </Text>
        {noScreenLock ? (
          <Text
            testID="x4-no-screen-lock"
            accessibilityLiveRegion="polite"
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              ...body,
              marginTop: t.space.md,
              padding: t.space.md,
              borderRadius: t.radius.md,
              borderWidth: t.hairline,
              borderColor: t.color.borderStrong,
              backgroundColor: t.color.surfaceRaised,
            }}
          >
            {s('x4.noScreenLock')}
          </Text>
        ) : null}
      </View>
    </Shell>
  );
}
