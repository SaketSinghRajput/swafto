/**
 * S8 - ARE YOU SURE? The last stop before the only irreversible thing in the app.
 *
 * S7 explained; this screen asks. Together they are the in-app deletion path
 * Google Play's User Data policy and Apple 5.1.1(v) both require (LEGAL-AUDIT
 * §4), and the two-step shape is the safeguard rather than the decoration: a
 * single screen whose paragraph sits above a red button is a screen where the
 * paragraph is scenery.
 *
 * THE BUTTONS ARE ROUND THE OTHER WAY FROM THE OBVIOUS, ON PURPOSE.
 *
 *   `s8.cancel` - "Keep my book" - is `primary`, the marigold, the one accent
 *   this screen is allowed to spend. It is the biggest, warmest thing here.
 *
 *   `s8.confirm` - "Delete everything" - is `tonal`: a raised surface with an
 *   `inkMuted` edge. Reachable in one tap, clearly a button, and plainly not the
 *   thing the screen is recommending.
 *
 * The destructive action must not be the prettiest thing on the screen. §9 says
 * marigold is the colour of the action a screen is FOR, and what this screen is
 * for is giving a shopkeeper who got here by mis-tapping an obvious way out. A
 * flow that destroys a shop's only record of what it is owed, where the pretty
 * button destroys and the plain one retreats, is a flow that will eventually
 * destroy one by accident. Inverting the emphasis costs the deliberate user one
 * extra moment of reading and costs the accidental user nothing at all.
 *
 * THE OUTSTANDING-CREDIT WARNING IS SHOWN ONLY WHEN IT IS TRUE. `s8.owed` says
 * he is still owed money this book is the only record of. Rendered
 * unconditionally it would appear for a shop that is owed nothing, which is a
 * sentence the screen cannot support - and a warning that was wrong once is a
 * warning nobody reads the second time. So it is gated on the engine's P7
 * figure, and the figure itself is shown beside it: "you are owed money" is a
 * reason to hesitate, "you are owed this much" is the reason.
 *
 * THE FIGURE GOES THROUGH `Money`, with no exception taken for it being inside a
 * warning (ADR-018). Tabular digits, Latin numerals in all three languages and a
 * rendered rather than implied sign are properties of every rupee figure in this
 * product.
 *
 * THIS SCREEN DELETES NOTHING. It reports intent through `onConfirm` and
 * `onCancel` and touches no store. Both are asserted in `S8.test.tsx`, because
 * "the confirm screen also did the deletion" is the version of this flow in
 * which the back button becomes a second confirm.
 *
 * NO KEYPAD AND NO BOTTOM NAV - nothing is typed, and this is a place you go
 * from S7 and come back from.
 */
import { View, Text } from '@swafto/ui';
import { Shell, Card, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { Money } from '../components/Money.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';
import type { DeletionOutcome } from '../app/session.tsx';

export interface ConfirmDeleteProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /** Reports the intent to delete. This screen does not perform it. */
  readonly onConfirm?: () => void;
  /** Reports the intent to keep the book. Where it returns to is not its business. */
  readonly onCancel?: () => void;
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
  /**
   * F-22: false when this phone holds no session. Deleting then wipes only the
   * phone's book, and the screen says so BEFORE he presses.
   */
  readonly signedIn?: boolean;
  /** F-22: what the deletion did. Set, the screen reports it instead of asking. */
  readonly outcome?: DeletionOutcome | null;
  readonly onDone?: () => void;
}

const bodyText = (t: ReturnType<typeof tokens>, colour: string) => ({
  fontFamily: t.font.regular,
  fontSize: t.type.body,
  lineHeight: t.leading(t.type.body),
  color: colour,
});

export function ConfirmDelete({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onConfirm = () => {},
  onCancel = () => {},
  onBack,
  onRetry = () => {},
  signedIn = true,
  outcome = null,
  onDone = () => {},
}: ConfirmDeleteProps) {
  const t = tokens(display);
  const s = strings(language);

  /*
   * AFTER: what happened, and one way on. Only a SUCCESS lands here - offline
   * and refused are banners over the question, because nothing was deleted.
   */
  if (outcome) {
    return (
      <Shell
        id="s8"
        s={s}
        display={display}
        status={status}
        titleKey={outcome.kind === 'scheduled' ? 's8.scheduledTitle' : 's8.localTitle'}
        empty={false}
        onBack={onDone}
        onRetry={onRetry}
        footer={
          <PrimaryButton
            testID="s8-done"
            label={s('s8.done')}
            onPress={onDone}
            display={display}
            variant="primary"
            size="xl"
          />
        }
      >
        <View style={{ flexGrow: 1, justifyContent: 'center' }}>
          <Card testID="s8-outcome" display={display}>
            <View style={{ padding: t.space.md }}>
              {outcome.kind === 'scheduled' ? (
                <>
                  <Text testID="s8-scheduled" maxFontSizeMultiplier={t.maxFontScale} style={bodyText(t, t.color.ink)}>
                    {s('s8.scheduled')}
                  </Text>
                  <Text
                    maxFontSizeMultiplier={t.maxFontScale}
                    style={{ ...bodyText(t, t.color.inkMuted), marginTop: t.space.md }}
                  >
                    {s('s8.erasesOn')}
                  </Text>
                  {/* The server's own date, never one computed here. */}
                  <Text
                    testID="s8-erases-at"
                    selectable
                    maxFontSizeMultiplier={t.maxFontScale}
                    style={bodyText(t, t.color.ink)}
                  >
                    {outcome.erasesAt.slice(0, 10)}
                  </Text>
                  <Text
                    testID="s8-phone-wiped"
                    maxFontSizeMultiplier={t.maxFontScale}
                    style={{ ...bodyText(t, t.color.ink), marginTop: t.space.md }}
                  >
                    {s('s8.phoneWiped')}
                  </Text>
                </>
              ) : (
                <Text testID="s8-local-done" maxFontSizeMultiplier={t.maxFontScale} style={bodyText(t, t.color.ink)}>
                  {s('s8.localDone')}
                </Text>
              )}
            </View>
          </Card>
        </View>
      </Shell>
    );
  }

  /*
   * P7 from the engine, derived on read, never a stored total. A figure cached
   * for this screen could say a shop was owed nothing on the one screen where
   * being wrong about that is unrecoverable.
   */
  const outstanding = store.primary().p7CreditOutstanding.value;

  return (
    <Shell
      id="s8"
      s={s}
      display={display}
      status={status}
      titleKey="s8.title"
      /*
       * NEVER EMPTY. The question and the two answers are structural. A shop with
       * nothing in its book can still be here, and showing it "nothing yet"
       * instead of the question would strand it mid-flow.
       */
      empty={false}
      onBack={onBack}
      onRetry={onRetry}
      footer={
        /*
         * STACKED, NOT SIDE BY SIDE. Two buttons sharing a row each get half of
         * 360dp, and "Delete everything" in Odia at the chrome font cap does not
         * fit in 180 - it either wraps to three lines or runs off the edge, which
         * is what `check:layout` measures. Full width also keeps the safe choice
         * the largest target on the screen, which is the point of the ordering: it
         * comes FIRST, under the thumb, before the other one.
         */
        <View testID="s8-actions">
          <PrimaryButton
            testID="s8-cancel"
            label={s('s8.cancel')}
            onPress={onCancel}
            display={display}
            variant="primary"
            size="xl"
          />
          <PrimaryButton
            testID="s8-confirm"
            label={s('s8.confirm')}
            onPress={onConfirm}
            display={display}
            variant="tonal"
            size="lg"
          />
        </View>
      }
    >
      {/*
        THE QUESTION SITS IN THE MIDDLE OF THE PAGE, NOT AT THE TOP OF IT.

        `Shell` grows its content container precisely so a screen can place
        itself in the space it has. Left alone, these one or two short cards sit
        under the header with most of the canvas empty cream below them - the
        void the frame's own comment records from the device build. Centred, the
        screen reads as a question being asked; pinned to the top it reads as an
        error that has already happened.
      */}
      <View style={{ flexGrow: 1, justifyContent: 'center' }}>
        {/*
          WHAT IS LOST, IN THE SAME WORDS S7 USED.

          `s7.what` rather than a second sentence of its own: the shopkeeper read
          it one screen ago, and a confirmation that re-describes the same
          consequence differently invites him to wonder which of the two is the
          real one. One string, so the two screens cannot drift.
        */}
        <Card testID="s8-what-group" display={display}>
          <View style={{ padding: t.space.md }}>
            <Text
              testID="s8-what"
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
            {/* F-22: what pressing it does to THIS phone, before he presses. */}
            <Text
              testID={signedIn ? 's8-phone-now' : 's8-local-only'}
              maxFontSizeMultiplier={t.maxFontScale}
              style={{ ...bodyText(t, t.color.inkMuted), marginTop: t.space.md }}
            >
              {s(signedIn ? 's8.phoneNow' : 's8.localOnly')}
            </Text>
          </View>
        </Card>

        {outstanding > 0 ? (
          <Card testID="s8-owed-group" display={display}>
            <View style={{ padding: t.space.md }}>
              <Text
                testID="s8-owed"
                maxFontSizeMultiplier={t.maxFontScale}
                style={{
                  fontFamily: t.font.medium,
                  fontSize: t.type.body,
                  lineHeight: t.leading(t.type.body),
                  color: t.color.ink,
                }}
              >
                {s('s8.owed')}
              </Text>
              {/*
                THE FIGURE IS A BLOCK, NOT AN ITEM IN A ROW, AND THAT IS A FIX
                RATHER THAN A PREFERENCE.

                Money is deliberately uncapped (ADR-018) - it keeps growing past
                the chrome font-scale cap, because a figure the shopkeeper cannot
                read is worse than one that takes two lines. The first version of
                this put it in a `flexDirection: 'row'` wrapper, and a flex item
                takes its max-content width: `check:layout` measured
                ₹9,60,598.00 nine pixels outside the card at font scale 2 in
                Focus mode. In an ordinary column it fills the card's width and
                wraps instead, which is what an uncapped figure has to be allowed
                to do. `flexWrap` on the row did not help - it wraps ITEMS, and
                there is only one.
              */}
              <View style={{ marginTop: t.space.sm }}>
                <Money
                  testID="s8-owed-amount"
                  amount={outstanding}
                  mode={display}
                  size="figure"
                  tone="neutral"
                />
              </View>
            </View>
          </Card>
        ) : null}
      </View>
    </Shell>
  );
}
