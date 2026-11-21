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
import { View, Text } from '@swafto/ui';
import { Shell, PrimaryButton, LinkRow, type LoadStatus } from '../components/Shell.tsx';
import { Switch } from '../components/Switch.tsx';
import { Banner } from '../components/Banner.tsx';
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
  /**
   * M3: the purpose he has just turned OFF in manage mode, so the screen can
   * say "Turned off. This takes effect now." under it. Null otherwise.
   */
  readonly justWithdrawn?: ConsentPurpose | null;
  /** Manage mode's visible way out (there is no Save button to leave by). */
  readonly onBack?: (() => void) | undefined;
  /** LIVE DEMO S4-3: the full privacy policy, opened in the phone's browser by the host. */
  readonly onOpenPrivacyPolicy?: () => void;
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
  justWithdrawn = null,
  onBack,
  onOpenPrivacyPolicy = () => {},
}: ConsentNoticeProps) {
  const manage = mode === 'manage';
  const t = tokens(display);
  const s = strings(language);

  return (
    <Shell
      id="x0"
      s={s}
      display={display}
      status={status}
      titleKey={manage ? 'consent.manage.title' : 'consent.title'}
      onRetry={onRetry}
      onBack={manage ? onBack : undefined}
      /*
       * M2 (Saket): MANAGE MODE HAS NO SAVE BUTTON. Each switch IS the change -
       * the toggle posts at once (App wires `onConsentChange` to it) - so a
       * Save after it only made withdrawal one step harder than giving, which
       * is the DPDP requirement broken by friction (USABILITY: "withdrawal
       * needs switch plus Save"). Sign-up keeps its one button: there, the
       * agreement IS a separate act, and it agrees to exactly the switches.
       */
      footer={
        manage ? undefined : (
          <PrimaryButton
            testID="x0-agree"
            label={s('consent.agree')}
            onPress={onAgree}
            display={display}
          />
        )
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
               * v2's SWITCH (DESIGN-SYSTEM-V2 3.14): a real switch, with its
               * state in the accessibility tree, in the track's fill, in the
               * thumb's tick or dash AND in a word beside it. On is filled, not
               * outlined - at arm's length in shop daylight a border colour is
               * not a state - and it is never the only signal.
               */
              <Switch
                testID={'x0-toggle-' + key}
                label={s(('consent.purpose.' + key) as StringKey)}
                value={on}
                onChange={() => onToggle(key)}
                onWord={s('consent.on')}
                offWord={s('consent.off')}
                display={display}
              />
            )}
            {manage && justWithdrawn === key && !on ? (
              <Banner
                testID={'x0-withdrawn-' + key}
                kind="info"
                icon="tick"
                text={s('consent.withdrawn')}
                display={display}
              />
            ) : null}
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
      {/*
        LIVE DEMO S4-3: THE WHOLE POLICY, ONE TAP FROM THE NOTICE. The notice is
        the itemised summary; the policy it summarises is the page the API
        serves (`apps/web/legal/privacy.html` at /privacy), the same link About
        carries. In both modes: withdrawing is when he most needs to read it.
      */}
      <LinkRow
        testID="x0-privacy"
        label={s('s5.privacy')}
        detail={s('settings.open')}
        display={display}
        onPress={onOpenPrivacyPolicy}
      />
    </Shell>
  );
}
