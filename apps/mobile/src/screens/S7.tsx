/**
 * S7 - DELETE THIS ACCOUNT. The screen that explains, and does not delete.
 *
 * WHY IT EXISTS, which is not a product decision anybody here made. Google
 * Play's User Data policy requires an in-app path to delete the account AND its
 * data for any app that lets a user create one; Apple 5.1.1(v) says the same.
 * Freezing or deactivating satisfies neither. LEGAL-AUDIT §4 records both and
 * calls the in-app path mandatory alongside the web page at L-13.
 *
 * TWO SCREENS, NOT ONE, AND THE SPLIT IS THE SAFEGUARD. S7 says what is
 * destroyed. S8 asks again and carries the destructive action. A single screen
 * with a red button at the bottom of a paragraph is a screen where the paragraph
 * is scenery - the shopkeeper who is already annoyed taps the button and reads
 * nothing. Making the reading a separate step is the only part of this flow that
 * costs an accidental deletion anything.
 *
 * SO THE ONE BUTTON HERE IS NOT MARIGOLD. §9: marigold is the colour of the
 * action a screen is FOR, at most one per screen, and this screen is for
 * informing. `secondary` - brand indigo - is the token for "the way on", and it
 * leaves the accent unspent, which matters on S8 where the SAFE choice wears it.
 *
 * THE GRACE PERIOD IS A CONSTANT, AND THIS SCREEN CANNOT INJECT IT. The window
 * is `DELETION_GRACE_DAYS` in `@swafto/values`, sourced to LEGAL-AUDIT §1.6. The
 * strings table holds whole sentences with no interpolation, so "30 days" sits
 * inside `s7.grace` in each of the three languages rather than being substituted
 * here - which means the number is typed in one place and the constant lives in
 * another, exactly the shape that cost this project two iterations when
 * SECURITY-AUDIT said a 5-minute OTP and SMS-TEMPLATES said 10. The binding that
 * stops it drifting is an assertion, not a comment: `S7.test.tsx` renders this
 * screen in all three languages and requires `DELETION_GRACE_DAYS` to appear in
 * the copy. Change the constant without changing the copy and that test fails.
 *
 * NO KEYPAD AND NO BOTTOM NAV. Nothing is typed, and this is not one of C-5's
 * three destinations - it is reached from S1 and comes back, so it carries a
 * back affordance instead of tabs.
 */
import { View, Text } from '@swafto/ui';
import { Shell, Card, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

export interface DeleteAccountProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /** Reports the intent to go on to S8. It deletes nothing. */
  readonly onContinue?: () => void;
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
}

export function DeleteAccount({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onContinue = () => {},
  onBack,
  onRetry = () => {},
}: DeleteAccountProps) {
  const t = tokens(display);
  const s = strings(language);

  /*
   * Read for nothing, and still required - the same contract S1 states. Every
   * screen takes a store so the registry can render it against both fixtures,
   * and a screen that opts out is a screen the adversarial shop never reaches.
   */
  void store;

  return (
    <Shell
      id="s7"
      s={s}
      display={display}
      status={status}
      titleKey="s7.title"
      /*
       * NEVER EMPTY. The two paragraphs are structural, not data - there is no
       * shop state in which this screen has nothing to say. Claiming an empty
       * state would be describing something that cannot happen.
       */
      empty={false}
      onBack={onBack}
      onRetry={onRetry}
      footer={
        <PrimaryButton
          testID="s7-continue"
          label={s('s7.continue')}
          onPress={onContinue}
          display={display}
          variant="secondary"
          size="lg"
        />
      }
    >
      {/*
        THE EXPLANATION SITS IN THE MIDDLE OF THE PAGE, NOT AT THE TOP OF IT.

        `Shell` grows its content container so a screen can place itself in the
        space it actually has; a screen that does not ends up as two short cards
        under the header with three-fifths of the canvas empty cream - which is
        the defect the frame's own comment records from the device build. One
        paragraph pinned to the top under a header reads as an error message.
        Centred, it reads as the thing the screen is asking him to read.
      */}
      <View style={{ flexGrow: 1, justifyContent: 'center' }}>
        <Card testID="s7-what-group" display={display}>
          <View style={{ padding: t.space.md }}>
            <Text
              testID="s7-what"
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.ink,
              }}
            >
              {s('s7.what')}
            </Text>
            <Text
              testID="s7-grace"
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                marginTop: t.space.md,
                fontFamily: t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.inkMuted,
              }}
            >
              {s('s7.grace')}
            </Text>
          </View>
        </Card>
      </View>
    </Shell>
  );
}
