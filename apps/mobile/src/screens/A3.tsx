/**
 * A3 - YOUR PHONE NUMBER. Step 1 of 2.
 *
 * The number is typed on the app's own keypad, the same component every amount
 * uses, rather than the system keyboard: the reference draws a keypad here
 * (Phone.dc.html, `authKeypadVisible`), and on a INR 7,000 handset the system
 * keyboard covers half the screen and offers letters a phone number cannot have.
 *
 * NOTHING IS PREDICTED. No contact lookup, no SIM-number read, no autofill: the
 * ten digits are the ten he pressed. "Send code" stays disabled until there are
 * ten, so a short number is never sent and refused.
 */
import { View, Text } from '@swafto/ui';
import { Shell, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { Keypad, type KeypadKey } from '../components/Keypad.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import { OTP_DIGITS, INDIAN_MOBILE } from '@swafto/values';
import type { AuthProblem } from '../app/session.tsx';
import { AuthNotice, fill, formatPhone } from './authParts.tsx';

/** Shown in the empty field, exactly as the reference shows it. */
export const PHONE_PLACEHOLDER = '00000 00000';

export interface PhoneNumberProps {
  readonly phone?: string;
  readonly busy?: boolean;
  readonly problem?: AuthProblem | null;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onSend?: () => void;
  readonly onChangedNumber?: () => void;
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
}

export function PhoneNumber({
  phone = '',
  busy = false,
  problem = null,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onKey = () => {},
  onSend = () => {},
  onChangedNumber = () => {},
  onBack,
  onRetry = () => {},
}: PhoneNumberProps) {
  const t = tokens(display);
  const s = strings(language);
  const complete = INDIAN_MOBILE.test(phone); // HT-5: ten digits AND a real mobile series
  // HT-25: ten digits that still cannot be sent say why, once there is nothing left to type.
  const notMobile = phone.length === 10 && !complete;
  return (
    <Shell
      id="a3"
      s={s}
      display={display}
      status={status}
      titleKey="a3.bar"
      // Under the title, as the reference draws "Step 1 of 2" - not opposite it.
      subtitle={s('a3.step')}
      onBack={onBack}
      onRetry={onRetry}
      footer={
        <View>
          {/*
            HT-34: THE NUMBER BEING TYPED IS PINNED TO THE KEYPAD. At font 2.0 the
            keypad filled the screen and the field scrolled away above it, so
            digits went in blind. The notice follows it (HT-18).
          */}
          <View
            testID="a3-field"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              margin: t.space.md,
              minHeight: t.control.lg,
              paddingHorizontal: t.space.md,
              borderRadius: t.radius.md,
              borderWidth: t.hairline * 2,
              borderColor: t.color.brand,
              backgroundColor: t.color.surface,
            }}
          >
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: t.font.bold,
                fontSize: t.type.figure,
                lineHeight: t.leading(t.type.figure),
                color: t.color.inkMuted,
                fontVariant: ['tabular-nums'],
                paddingRight: t.space.sm,
                marginRight: t.space.sm,
                borderRightWidth: t.hairline,
                borderRightColor: t.color.borderStrong,
              }}
            >
              +91
            </Text>
            <Text
              testID="a3-phone"
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                flexShrink: 1,
                fontFamily: t.font.bold,
                fontSize: t.type.figure,
                lineHeight: t.leading(t.type.figure),
                color: phone === '' ? t.color.inkMuted : t.color.ink,
                fontVariant: ['tabular-nums'],
              }}
            >
              {phone === '' ? PHONE_PLACEHOLDER : formatPhone(phone)}
            </Text>
          </View>
          {notMobile ? (
            <Text
              testID="a3-not-mobile"
              accessibilityLiveRegion="polite"
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                marginHorizontal: t.space.md,
                fontFamily: t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.inkMuted,
              }}
            >
              {s('a3.notMobile')}
            </Text>
          ) : null}
          <AuthNotice problem={problem} s={s} display={display} />
          <Keypad onKey={onKey} s={s} mode={display} testID="a3-keypad" />
          <PrimaryButton
            testID="a3-send"
            label={s(busy ? 'a3.sending' : 'a3.send')}
            onPress={onSend}
            disabled={!complete || busy}
            display={display}
          />
          <PrimaryButton
            testID="a3-changed"
            label={s('a3.changed')}
            onPress={onChangedNumber}
            variant="ghost"
            size="md"
            display={display}
          />
        </View>
      }
    >
      {/* The reference repeats the question on the page, above its help line. */}
      <Text
        testID="a3-heading"
        accessibilityRole="header"
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
        {s('a3.bar')}
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
        {fill(s('a3.help'), { digits: OTP_DIGITS })}
      </Text>


    </Shell>
  );
}
