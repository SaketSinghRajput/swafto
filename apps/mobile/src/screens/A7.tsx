/**
 * A7 - CHANGE YOUR NUMBER. Reachable WITHOUT being signed in (ADR-007, build
 * prompt G6), from A3 and A4.
 *
 * TWO PATHS, AND ONLY ONE IS BUILDABLE TODAY - stated rather than hidden.
 *
 *   "I still have my old number" -> the reference verifies the old number and
 *   then a new one (store.js recovery stages oldPhone..newOtp). The API has NO
 *   change-number route, so the second half cannot be done. This path goes back
 *   to A3 to sign in with the old number, which is the first half and is real.
 *   BLOCKED on a change-number route in apps/api.
 *
 *   "I don't have it anymore" -> manual verification. There is no support
 *   number or monitored mailbox yet (H6, BLOCKED on a human), so no WhatsApp
 *   button is drawn and no address is invented. HT-20: the screen says so
 *   plainly and offers the one real route, the privacy page the API serves.
 */
import { View, Text, Pressable } from '@swafto/ui';
import { Shell, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';

export interface NumberChangedProps {
  readonly stage?: 'decide' | 'handoff';
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onHaveOld?: () => void;
  readonly onNoOld?: () => void;
  /** HT-20: open the privacy page, which says how to write to us. */
  readonly onOpenHelp?: () => void;
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
}

export function NumberChanged({
  stage = 'decide',
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onHaveOld = () => {},
  onNoOld = () => {},
  onOpenHelp = () => {},
  onBack,
  onRetry = () => {},
}: NumberChangedProps) {
  const t = tokens(display);
  const s = strings(language);
  const para = {
    padding: t.space.md,
    fontFamily: t.font.regular,
    fontSize: t.type.body,
    lineHeight: t.leading(t.type.body),
    color: t.color.inkMuted,
  } as const;

  const option = (testID: string, title: StringKey, sub: StringKey, onPress: () => void) => (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={s(title)}
      onPress={onPress}
      android_ripple={{ color: t.color.surfaceRaised }}
      style={{
        minHeight: t.control.xl,
        minWidth: t.touchTarget,
        marginHorizontal: t.space.md,
        marginBottom: t.space.md,
        padding: t.space.md,
        borderRadius: t.radius.lg,
        borderWidth: t.hairline,
        borderColor: t.color.inkMuted,
        backgroundColor: t.color.surface,
        elevation: t.elevation.card,
        justifyContent: 'center',
      }}
    >
      <Text
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          fontFamily: t.font.bold,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.ink,
        }}
      >
        {s(title)}
      </Text>
      <Text maxFontSizeMultiplier={t.maxFontScale} style={{ ...para, padding: 0 }}>
        {s(sub)}
      </Text>
    </Pressable>
  );

  return (
    <Shell
      id="a7"
      s={s}
      display={display}
      status={status}
      titleKey="a7.bar"
      // Under the title, as the reference draws "Two ways to fix this".
      subtitle={s('a7.sub')}
      onBack={onBack}
      onRetry={onRetry}
    >
      {stage === 'decide' ? (
        <View>
          <Text maxFontSizeMultiplier={t.maxFontScale} style={para}>
            {s('a7.intro')}
          </Text>
          {option('a7-have-old', 'a7.haveOld', 'a7.haveOld.sub', onHaveOld)}
          {option('a7-no-old', 'a7.noOld', 'a7.noOld.sub', onNoOld)}
        </View>
      ) : (
        <View
          testID="a7-handoff"
          style={{
            margin: t.space.md,
            borderRadius: t.radius.lg,
            borderWidth: t.hairline,
            borderColor: t.color.border,
            backgroundColor: t.color.surfaceRaised,
          }}
        >
          <Text maxFontSizeMultiplier={t.maxFontScale} style={{ ...para, color: t.color.ink }}>
            {s('a7.handoff')}
          </Text>
          <PrimaryButton
            testID="a7-help"
            label={s('a7.help')}
            onPress={onOpenHelp}
            variant="ghost"
            size="md"
            display={display}
          />
        </View>
      )}
    </Shell>
  );
}
