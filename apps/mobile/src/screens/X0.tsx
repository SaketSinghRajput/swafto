/**
 * X0 - THE CONSENT NOTICE. Shown before an account exists, because that is when
 * the Act says it must be.
 *
 * L-01 AND L-02, AND THE REASON THE APP COULD NOT SIGN ANYBODY IN WITHOUT IT.
 * The verify endpoint refuses to create a user without an explicit consent
 * payload, so until this screen existed there was no path to an account at all.
 * That is the right order: the refusal came first and the screen had to meet
 * it, rather than a screen that collects consent because somebody remembered.
 *
 * THREE PURPOSES, SEPARATELY. DPDP §1.2 wants consent that is SPECIFIC, so "use
 * the app" cannot be one switch covering the ledger, the SMS and the crash
 * reports. Only the first is needed for the account to exist. The other two
 * start OFF and stay off unless he turns them on - a pre-ticked box is not a
 * clear affirmative action, and a dark pattern is its own violation.
 *
 * NO "AGREE TO ALL". There is one button and it agrees to exactly what the
 * switches say. A single button that turns everything on is the commonest way
 * this requirement is broken while appearing to be met.
 *
 * IT IS ALSO THE WITHDRAWAL SCREEN. DPDP §1.2 says withdrawal must be as easy
 * as giving was, and the usual way that requirement is broken is not refusal
 * but friction: consent is a tap and withdrawal is an email. Reached from
 * Today, this is the SAME screen with the same switches - which makes the two
 * equally easy by construction rather than by policy.
 *
 * THE ODIA AND HINDI COPY IS A DRAFT, tracked as H13. It renders, it fits, and
 * nobody here can read it - which is why the notice from the API carries a
 * `reviewState` and why this screen is on the contact sheet.
 */
import { View, Text, Pressable } from '@swafto/ui';
import { Shell, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import { CONSENT_PURPOSES, type ConsentPurpose } from '@swafto/values';


export interface ConsentNoticeProps {
  /**
   * `signup` is the notice before the account exists; `manage` is the same
   * screen reached from Today, where the choices already have answers.
   */
  readonly mode?: 'signup' | 'manage';
  /** Which optional purposes are ON. Absent means off - never pre-ticked. */
  readonly granted?: readonly ConsentPurpose[];
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onToggle?: (purpose: ConsentPurpose) => void;
  readonly onAgree?: () => void;
  readonly onRetry?: () => void;
}

export function ConsentNotice({
  mode = 'signup',
  granted = [],
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onToggle = () => {},
  onAgree = () => {},
  onRetry = () => {},
}: ConsentNoticeProps) {
  const t = tokens(display);
  const s = strings(language);

  return (
    <Shell
      id="x0"
      s={s}
      display={display}
      status={status}
      titleKey={mode === 'manage' ? 'consent.manage.title' : 'consent.title'}
      onRetry={onRetry}
      footer={
        <PrimaryButton
          testID="x0-agree"
          label={s(mode === 'manage' ? 'consent.save' : 'consent.agree')}
          onPress={onAgree}
          display={display}
        />
      }
    >
      <Text
        testID="x0-intro"
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          padding: t.space.md,
          fontFamily: t.font.regular,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.ink,
        }}
      >
        {s('consent.intro')}
      </Text>

      {CONSENT_PURPOSES.map(({ key, required }) => {
        const on = required || granted.includes(key);
        return (
          <View
            key={key}
            testID={'x0-purpose-' + key}
            style={{
              paddingHorizontal: t.space.md,
              paddingVertical: t.space.sm,
              borderBottomWidth: t.hairline,
              borderBottomColor: t.color.border,
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
              {s(('consent.purpose.' + key) as StringKey)}
            </Text>

            {required ? (
              <Text
                testID={'x0-required-' + key}
                maxFontSizeMultiplier={t.maxFontScale}
                style={{
                  fontFamily: t.font.regular,
                  fontSize: t.type.label,
                  lineHeight: t.leading(t.type.label),
                  color: t.color.inkMuted,
                }}
              >
                {s('consent.required')}
              </Text>
            ) : (
              /*
               * A real switch, with its state in the accessibility tree as well
               * as in its label. A control whose only signal is a colour is one
               * a screen reader cannot report and this reader may not see.
               */
              <Pressable
                testID={'x0-toggle-' + key}
                accessibilityRole="switch"
                accessibilityLabel={s(('consent.purpose.' + key) as StringKey)}
                accessibilityState={{ checked: on }}
                onPress={() => onToggle(key)}
                style={{
                  minHeight: t.touchTarget,
                  minWidth: t.touchTarget,
                  marginTop: t.space.xs,
                  paddingHorizontal: t.space.md,
                  borderRadius: t.radius.md,
                  borderWidth: t.hairline,
                  borderColor: on ? t.color.accent : t.color.border,
                  /*
                   * ON IS FILLED, NOT OUTLINED. The first version of this screen
                   * showed the two states as a grey border and an orange one, and
                   * the contact sheet answered that question the moment somebody
                   * looked at it: in shop daylight, on a INR 7,000 panel, at
                   * arm's length, a border colour is not a state. The fill is.
                   */
                  backgroundColor: on ? t.color.accent : t.color.bg,
                  alignSelf: 'flex-start',
                  justifyContent: 'center',
                }}
              >
                <Text
                  maxFontSizeMultiplier={t.maxFontScale}
                  style={{
                    fontFamily: t.font.medium,
                    fontSize: t.type.body,
                    lineHeight: t.leading(t.type.body),
                    color: on ? t.color.onAccent : t.color.ink,
                  }}
                >
                  {s('consent.optional') + ': ' + s(on ? 'consent.on' : 'consent.off')}
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}

      <Text
        testID="x0-rights"
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          padding: t.space.md,
          fontFamily: t.font.regular,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.inkMuted,
        }}
      >
        {s('consent.rights')}
      </Text>
    </Shell>
  );
}
