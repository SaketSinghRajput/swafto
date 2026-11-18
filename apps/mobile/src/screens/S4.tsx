/**
 * S4 - PRIVACY AND CONSENT. A route, not a second consent screen.
 *
 * WHY IT EXISTS. DPDP s6 requires that withdrawing a consent be as easy as
 * giving it. The usual way that requirement is broken is not refusal but
 * friction: consent is one tap at sign-up and withdrawal is an email. S1's
 * privacy row has to lead somewhere, and what it leads to is the SAME screen
 * that took the consent, with the same switches.
 *
 * SO THIS SCREEN DELIBERATELY RENDERS NO TOGGLE. X0 already draws the three
 * purposes with their switches, separately, with the optional two off unless
 * they were turned on - and X0 in `manage` mode is the withdrawal screen by
 * construction rather than by policy. A second consent UI here would be a
 * SECOND PLACE A CONSENT CAN BE RECORDED: two controls writing one legal fact,
 * and the first time they disagree there is no answer to "what did he consent
 * to". One screen, reached from two places, is the whole design.
 *
 * WHAT IS LEFT FOR THIS SCREEN TO DO is therefore small and worth doing: name
 * the route in the shopkeeper's words, and say in a sentence that turning a
 * purpose off is as easy as turning it on - because a man who does not know
 * withdrawal is possible holds a right he cannot use.
 *
 * NO KEYPAD AND NO BOTTOM NAV. Nothing is typed here, and this is not one of
 * C-5's three destinations - it hangs off the settings hub, so it carries a
 * back affordance instead. §B.6's forbidden pair cannot arise because neither
 * half is present, and S4.test.tsx asserts both absences.
 *
 * THE ODIA AND HINDI COPY IS A DRAFT (H13), like every string in this app, and
 * on a consent route that is worth saying out loud: nobody here can read it.
 */
import { Text } from '@swafto/ui';
import { Shell, Card, LinkRow, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

export interface PrivacySettingsProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /**
   * Opens X0 in `manage` mode - the screen that took the consent, showing what
   * is in force NOW. The host fetches that from the server rather than reading
   * memory, because this handset may not be the one that made the last change;
   * `Session.openConsentSettings` is the only path into manage mode.
   */
  readonly onReviewConsent?: () => void;
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
}

export function PrivacySettings({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onReviewConsent = () => {},
  onBack,
  onRetry = () => {},
}: PrivacySettingsProps) {
  const t = tokens(display);
  const s = strings(language);

  /*
   * Read for nothing, and still required - the same contract S1 and S5 carry.
   * Every screen in this product takes a store, the registry renders them all
   * against both fixtures, and a screen that quietly opts out of that is a
   * screen the adversarial shop never reaches.
   */
  void store;

  return (
    <Shell
      id="s4"
      s={s}
      display={display}
      status={status}
      titleKey="s4.title"
      /*
       * NEVER EMPTY. The route and the sentence are structural, not data: there
       * is no shop state in which this screen has nothing to say. On this
       * screen in particular an "empty" panel would be a privacy notice that
       * had gone missing, which is the one thing it must never look like.
       */
      empty={false}
      onBack={onBack}
      onRetry={onRetry}
    >
      <Card testID="s4-consent-group" display={display}>
        <LinkRow
          testID="s4-review"
          label={s('s4.review')}
          display={display}
          onPress={onReviewConsent}
        />

        {/*
          THE SENTENCE IS PART OF THE REQUIREMENT, not reassurance copy. DPDP s6
          is about the EASE of withdrawal, and a route he does not know is a
          withdrawal route is not an easy one. It sits inside the same card as
          the row it describes, in `inkMuted`, so the row stays the action.
        */}
        <Text
          testID="s4-withdraw"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            padding: t.space.md,
            fontFamily: t.font.regular,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.inkMuted,
          }}
        >
          {s('s4.withdraw')}
        </Text>
      </Card>
    </Shell>
  );
}
