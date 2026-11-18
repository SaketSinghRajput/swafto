/**
 * S11 - APP LOCKED (R5 FR-3). The cover that goes over the book.
 *
 * WHAT IT SHOWS IS WHAT IT IS FOR: NOTHING. No figure, no party name, no shop
 * name, no nav - whoever is holding the phone learns that SWAFTO is open and
 * locked, and nothing about the shop. The test asserts that against the
 * adversarial book rather than trusting this sentence.
 *
 * A COVER, NOT A ROUTE. App draws this over whatever screen was up, and the
 * session never moves (`Session.setLock`), so after Unlock he is back on the
 * same form with the same digits typed.
 *
 * THE UNLOCK IS THE PHONE'S OWN SCREEN LOCK, asked for by the host. This
 * screen only reports the tap; what a cancelled or unavailable confirm means
 * is decided, and reasoned, in `Host.unlock`.
 *
 * NO BACK. Back on the cover leaves the app (`Session.back`), so there is no
 * back affordance to draw, and no keypad: nothing is typed here.
 */
import { View, Text } from '@swafto/ui';
import { Shell, Card, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

export interface AppLockedProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onUnlock?: () => void;
  readonly onRetry?: () => void;
}

export function AppLocked({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onUnlock = () => {},
  onRetry = () => {},
}: AppLockedProps) {
  const s = strings(language);
  const t = tokens(display);

  /* Required and read for nothing, like S1, S5 and S6: a cover derives no figure. */
  void store;

  return (
    <Shell
      id="s11"
      s={s}
      display={display}
      status={status}
      titleKey="s11.title"
      // Never empty: the cover has the same one sentence whatever the book holds.
      empty={false}
      onRetry={onRetry}
      footer={
        <View style={{ padding: t.space.md }}>
          <PrimaryButton
            testID="s11-unlock"
            label={s('s11.unlock')}
            onPress={onUnlock}
            display={display}
          />
        </View>
      }
    >
      <Card testID="s11-cover" display={display}>
        <View style={{ padding: t.space.md }}>
          <Text
            testID="s11-sentence"
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              fontFamily: t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: t.color.ink,
            }}
          >
            {s('s11.body')}
          </Text>
        </View>
      </Card>
    </Shell>
  );
}
