/**
 * A4 - ENTER THE CODE. Step 2 of 2.
 *
 * Six boxes, the next empty one ringed, on the app's own keypad. The sixth digit
 * sends the code - the reference does exactly that (store.js authKeyTap) - and
 * the keypad goes away while it is being checked, so a seventh press cannot
 * land on a request in flight.
 *
 * NO SMS AUTOFILL. The SMS User Consent API is what SMS-TEMPLATES.md chose for
 * Android, and it needs a native module this build does not have; typing six
 * digits he can see on the same phone is the path that works today.
 *
 * NO RESEND COUNTDOWN. The reference shows "Resend code in 0:30"; a ticking
 * label needs a timer, and these screens are pure functions of their props.
 * The server's own burst limit (TB6) is what actually stops a resend storm, and
 * its 429 lands on A5 "Too many tries" with the wait it states.
 */
import { View, Text } from '@swafto/ui';
import { Shell, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { Keypad, type KeypadKey } from '../components/Keypad.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import { OTP_DIGITS } from '@swafto/values';
import type { AuthProblem } from '../app/session.tsx';
import { AuthNotice, fill, formatPhone } from './authParts.tsx';

/** After this many resends the reference offers its "Still no code?" state. */
export const NO_CODE_AFTER_RESENDS = 2;

export interface CodeEntryProps {
  readonly phone?: string;
  readonly code?: string;
  readonly busy?: boolean;
  readonly problem?: AuthProblem | null;
  readonly resends?: number;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onEditPhone?: () => void;
  readonly onResend?: () => void;
  readonly onRetryVerify?: () => void;
  readonly onTrouble?: () => void;
  readonly onNoCode?: () => void;
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
}

export function CodeEntry({
  phone = '',
  code = '',
  busy = false,
  problem = null,
  resends = 0,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onKey = () => {},
  onEditPhone = () => {},
  onResend = () => {},
  onRetryVerify = () => {},
  onTrouble = () => {},
  onNoCode = () => {},
  onBack,
  onRetry = () => {},
}: CodeEntryProps) {
  const t = tokens(display);
  const s = strings(language);
  const body = {
    fontFamily: t.font.regular,
    fontSize: t.type.body,
    lineHeight: t.leading(t.type.body),
    color: t.color.inkMuted,
  } as const;
  const boxes = Array.from({ length: OTP_DIGITS }, (_, i) => code[i] ?? '');

  return (
    <Shell
      id="a4"
      s={s}
      display={display}
      status={status}
      titleKey="a4.bar"
      // Under the title, as the reference draws "Step 2 of 2" - not opposite it.
      subtitle={s('a4.step')}
      onBack={onBack}
      onRetry={onRetry}
      footer={
        <View>
          {/* HT-34: the code being typed is pinned to the keypad, as on A3. */}
          <View testID="a4-boxes" style={{ flexDirection: 'row', paddingHorizontal: t.space.sm }}>
            {boxes.map((d, i) => (
              <View
                key={i}
                testID={'a4-box-' + i}
                style={{
                  flex: 1,
                  minHeight: t.control.md,
                  margin: t.space.xs,
                  borderRadius: t.radius.md,
                  borderWidth: t.hairline * 2,
                  borderColor: i === code.length ? t.color.brand : t.color.inkMuted,
                  backgroundColor: t.color.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  maxFontSizeMultiplier={t.maxFontScale}
                  style={{
                    fontFamily: t.font.bold,
                    fontSize: t.type.figure,
                    lineHeight: t.leading(t.type.figure),
                    color: t.color.ink,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {d}
                </Text>
              </View>
            ))}
          </View>
          {/* HT-18: above the keypad, so at large text it is not scrolled out of sight. */}
          {busy ? null : <AuthNotice problem={problem} s={s} display={display} />}
          {busy ? null : <Keypad onKey={onKey} s={s} mode={display} testID="a4-keypad" />}
        </View>
      }
    >
      <Text
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
        {s('a4.title')}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          paddingHorizontal: t.space.md,
        }}
      >
        <Text testID="a4-sent-to" maxFontSizeMultiplier={t.maxFontScale} style={body}>
          {fill(s('a4.sentTo'), { phone: formatPhone(phone) })}
        </Text>
        <PrimaryButton
          testID="a4-edit"
          label={s('a4.edit')}
          onPress={onEditPhone}
          variant="ghost"
          size="md"
          display={display}
        />
      </View>


      {busy ? (
        <Text
          testID="a4-checking"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{ ...body, paddingHorizontal: t.space.md }}
        >
          {s('a4.checking')}
        </Text>
      ) : null}

      {problem === 'offline' || problem === 'failed' ? (
        <PrimaryButton
          testID="a4-retry"
          label={s('common.retry')}
          onPress={onRetryVerify}
          display={display}
        />
      ) : null}

      <PrimaryButton
        testID="a4-resend"
        label={s('a4.resend')}
        onPress={onResend}
        disabled={busy}
        variant="ghost"
        size="md"
        display={display}
      />
      {resends >= NO_CODE_AFTER_RESENDS ? (
        <PrimaryButton
          testID="a4-no-code"
          label={s('a5.noCode.title')}
          onPress={onNoCode}
          variant="ghost"
          size="md"
          display={display}
        />
      ) : null}
      <PrimaryButton
        testID="a4-trouble"
        label={s('a4.trouble')}
        onPress={onTrouble}
        variant="ghost"
        size="md"
        display={display}
      />
    </Shell>
  );
}
