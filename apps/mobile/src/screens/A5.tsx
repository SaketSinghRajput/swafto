/**
 * A5 - A PROBLEM WITH THE CODE. The reference draws four states on one sheet
 * (store.js `problemStates`); the app shows the ONE that happened, because a
 * shopkeeper who mistyped a digit should not be reading about lockouts.
 *
 * Each says what happened and what to do next, and none blames him. The waits
 * are the server's own figures: the code lifetime is OTP_TTL_SECONDS and the
 * lockout is the `retryAfterSeconds` its 429 carried. "3 attempts left" from the
 * reference is NOT shown - the server never says how many are left, and a count
 * kept on the phone is a number nobody measured.
 *
 * "Still no code?" has no WhatsApp button. The reference opens WhatsApp to a
 * support number, and this repository has no support number to open; inventing
 * one would send a shopkeeper's message to a stranger. BLOCKED on a human.
 *
 * INVITE GATE: THE APP CANNOT SEND AN INVITE. In invite mode nothing offers to
 * send a new code - only SWAFTO can issue one - so "expired" says "Ask SWAFTO
 * for a new code" and has no button, and the mismatch and lockout cards add
 * that line under their own, since the server's 401 cannot say whether the
 * invite is still alive. The digit count is the server's (`digits`).
 *
 * LIVE DEMO S3-4: A MISTYPED CODE IS NOT A DEAD END. "It does not match" had only
 * Back, so a wrong digit stranded him on a screen with nothing to press. It now
 * has "Try again", straight back to an empty code entry for the same number.
 * The words are the same for every wrong code - the server's 401 does not say
 * why, and neither does this. A lock-out has no such button: the server would
 * only refuse it.
 */
import { View, Text } from '@swafto/ui';
import { Shell, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import { OTP_TTL_SECONDS } from '@swafto/values';
import { digitsForMode, type AuthProblem, type CodeMode } from '../app/session.tsx';
import { AuthNotice, fill } from './authParts.tsx';

/**
 * THE CARD'S FILL IS THE STATE'S, as the reference sheet tints it (store.js
 * `problemStates`): red for a refusal (the code did not match, too many tries),
 * gold for "expired" - nothing wrong, act now - and indigo for "still no code".
 * It drew the neutral raised fill for every state on the device. The words
 * carry the meaning; the tint is additive, never the only signal.
 */
type Tint = 'tintRed' | 'tintGold' | 'tintIndigo';
const CARD: Partial<Record<AuthProblem, { title: StringKey; body: StringKey; tint: Tint }>> = {
  mismatch: { title: 'a5.mismatch.title', body: 'a5.mismatch.body', tint: 'tintRed' },
  expired: { title: 'a5.expired.title', body: 'a5.expired.body', tint: 'tintGold' },
  locked: { title: 'a5.locked.title', body: 'a5.locked.body', tint: 'tintRed' },
  noCode: { title: 'a5.noCode.title', body: 'a5.noCode.body', tint: 'tintIndigo' },
};

/** Whole minutes, rounded UP: "try again in 1 minute" after 30 s is still true. */
const minutes = (seconds: number): number => Math.ceil(seconds / 60);

export interface CodeProblemProps {
  readonly problem?: AuthProblem | null;
  readonly retryAfterSeconds?: number | null;
  /** INVITE GATE: how the code request was answered, and how many digits it said. */
  readonly mode?: CodeMode;
  readonly digits?: number;
  readonly busy?: boolean;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onSendNew?: () => void;
  /** LIVE DEMO S3-4: "Try again" after a code that does not match - back to code entry. */
  readonly onTryAgain?: () => void;
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
}

export function CodeProblem({
  problem = 'mismatch',
  retryAfterSeconds = null,
  mode = 'sms',
  digits = digitsForMode(mode),
  busy = false,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onSendNew = () => {},
  onTryAgain = () => {},
  onBack,
  onRetry = () => {},
}: CodeProblemProps) {
  const t = tokens(display);
  const s = strings(language);
  const card = problem === null ? undefined : CARD[problem];
  const invite = mode === 'invite';
  const body =
    invite && problem === 'expired'
      ? s('a5.invite.ask')
      : problem === 'locked' && retryAfterSeconds === null
        ? s('a5.locked.later')
        : card === undefined
          ? ''
          : fill(s(card.body), {
              digits,
              minutes: minutes(problem === 'locked' ? (retryAfterSeconds ?? 0) : OTP_TTL_SECONDS),
            });
  // The ask line under a card whose own words do not already say it.
  const ask = invite && (problem === 'mismatch' || problem === 'locked');
  const canSend = (problem === 'expired' && !invite) || problem === 'offline' || problem === 'failed';

  return (
    <Shell
      id="a5"
      s={s}
      display={display}
      status={status}
      titleKey="a5.bar"
      onBack={onBack}
      onRetry={onRetry}
      footer={
        canSend ? (
          <PrimaryButton
            testID="a5-send-new"
            label={s(problem === 'expired' ? 'a5.expired.cta' : 'common.retry')}
            onPress={onSendNew}
            disabled={busy}
            display={display}
          />
        ) : problem === 'mismatch' ? (
          <PrimaryButton
            testID="a5-try-again"
            label={s('common.retry')}
            onPress={onTryAgain}
            display={display}
          />
        ) : undefined
      }
    >
      {card === undefined ? null : (
        <View
          testID={'a5-' + problem}
          accessibilityRole="alert"
          style={{
            margin: t.space.md,
            padding: t.space.md,
            borderRadius: t.radius.lg,
            borderWidth: t.hairline,
            // The reference rules the indigo card with `rule`, the others `rule-strong`.
            borderColor: card.tint === 'tintIndigo' ? t.color.border : t.color.borderStrong,
            backgroundColor: t.color[card.tint],
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
            {s(card.title)}
          </Text>
          <Text
            testID="a5-message"
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              marginTop: t.space.xs,
              fontFamily: t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: t.color.ink,
            }}
          >
            {body}
          </Text>
          {ask ? (
            <Text
              testID="a5-ask"
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                marginTop: t.space.xs,
                fontFamily: t.font.bold,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.ink,
              }}
            >
              {s('a5.invite.ask')}
            </Text>
          ) : null}
        </View>
      )}
      <AuthNotice problem={problem} s={s} display={display} />
    </Shell>
  );
}
