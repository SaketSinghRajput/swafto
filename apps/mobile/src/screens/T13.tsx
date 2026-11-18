/**
 * T13 - THE CASH CHECK, BALANCED. The one good moment the day contains.
 *
 * S03 is unusually direct about this screen: `BalancedState` is the
 * highest-leverage screen in the product, and it is **not** the difference screen
 * with a block removed. So it is not built from T12. T12 is interrogative and
 * slightly anxious - its one figure is a gap, and it lives in the header bar
 * where a worried eye goes first. This screen inverts that deliberately:
 *
 *   - THE HEADER CARRIES NO FIGURE. Shell's `headline` is omitted, which no other
 *     reading screen does. On T12 the bar holds the difference because the
 *     difference is the question. Here there is no question, so the bar is quiet
 *     and the whole of the page belongs to the answer.
 *   - THE ANSWER IS THE PAGE. `type.hero` for "It matches.", then the figure at
 *     the largest size `Money` has, on a card that opens with a band of marigold.
 *     Scale and fill are the two things this design system has for emphasis, and
 *     this is the screen they were kept for.
 *   - THE SAME NUMBER TWICE, SIDE BY SIDE. Counted and expected on one line, close
 *     enough together that the eye compares the digits rather than being told they
 *     agree. That equality IS the content; a sentence asserting it would be the
 *     app taking credit for his counting.
 *
 * WHAT IS DERIVED, AND WHY IT IS NOT TRUSTED. This screen is reached only when the
 * count equals the expectation, but "reached only when" is a claim about a caller,
 * and a caller is exactly the thing that changes. So the match is computed here
 * from `store.expectedCash()` on every render, and if it does not hold the screen
 * will not say that it does and will not let the day close. A congratulation
 * rendered over a real discrepancy is the worst single output this product could
 * produce: it does not just fail, it tells him the till is fine when it is not.
 *
 * D6 - the carry forward is the COUNTED figure. Tomorrow opens on the cash that is
 * actually in the box, never on what the book expected. The two are equal here by
 * construction, which is precisely why the wrong one would never be noticed, so
 * `countedPaise` is passed explicitly rather than reaching for the nearer value.
 *
 * NO KEYPAD. The counting happened on T11. And per S03 the day does not end on an
 * upsell, a rating prompt, a sync warning or a backup nag - the last thing on the
 * page is the action he came to take.
 *
 * MOTION IS ABSENT AND THAT IS A GAP, not a decision. S03 asks for motion as well
 * as weight and scale; `@swafto/ui` re-exports no `Animated`, and widening that
 * seam is a change to the test boundary rather than to a screen. Recorded here so
 * it is not mistaken for having been considered and dropped.
 */
import { View, Text } from '@swafto/ui';
import type { Paise } from '@swafto/formula-engine';
import { Shell, Card, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { Money } from '../components/Money.tsx';
import { UpiCheckCard } from '../components/DayFacts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

export interface CashBalancedProps {
  readonly store: Store;
  /** What he counted. The figure the rest of the screen is measured against. */
  readonly countedPaise: Paise;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onCloseDay?: () => void;
  readonly onRetry?: () => void;
  /** F-9: the header's way back. Explicit `| undefined` for exactOptionalPropertyTypes. */
  readonly onBack?: (() => void) | undefined;
}

export function CashBalanced({
  store,
  countedPaise,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onCloseDay = () => {},
  onRetry = () => {},
  onBack,
}: CashBalancedProps) {
  const t = tokens(display);
  const s = strings(language);

  // Derived on read, every render, from the engine - never cached and never a
  // prop. Integer paise on both sides, so exact equality is exact.
  const expected = store.expectedCash().value;
  const balanced = countedPaise === expected;

  return (
    <Shell
      id="t13"
      s={s}
      display={display}
      status={status}
      titleKey="t13.title"
      onRetry={onRetry}
      onBack={onBack}
      footer={
        <PrimaryButton
          testID="t13-close"
          label={s('t1.closeDay')}
          onPress={onCloseDay}
          display={display}
          /*
           * The premise of the screen is also its precondition. If the figures do
           * not agree there is no reason recorded anywhere, so closing here would
           * put an unexplained gap into a ledger that cannot be edited - the one
           * thing T12 exists to prevent. Disabled, not hidden: a control that
           * vanishes teaches him nothing about why.
           */
          disabled={!balanced}
        />
      }
    >
      <Card testID="t13-match" display={display}>
        {/*
          A BAND OF MARIGOLD ACROSS THE TOP. §9 decision 1 says the accent is a
          fill and never type; this is the fill. It carries no text, so there is
          no pair to measure, and it gives the card the weight S03 asks for
          without borrowing it from a colour that would be illegible as ink.
        */}
        <View
          testID="t13-band"
          style={{ height: t.space.xs, backgroundColor: t.color.brand }}
        />

        <View style={{ padding: t.space.lg, alignItems: 'center' }}>
          <Text
            testID="t13-matches"
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              fontFamily: t.font.bold,
              fontSize: t.type.hero,
              lineHeight: t.leading(t.type.hero),
              color: t.color.ink,
              textAlign: 'center',
            }}
          >
            {/*
              Only when it is true. An unreached state should still not lie, and
              the test that drives the store out from under this screen is the one
              that proves the sentence is earned rather than printed.
            */}
            {balanced ? s('t13.matches') : s('t12.difference')}
          </Text>

          {/* The figure, at the largest size Money has. */}
          <Money testID="t13-figure" amount={countedPaise} mode={display} size="figure" />

          {/*
            THE QUIETER LINE: the same number twice, so it can be seen to be the
            same number. Wrapping rather than shrinking, because at the chrome cap
            in Odia these four pieces will not sit on one line and a figure that
            shrank to fit would defeat the entire point of showing it twice.
          */}
          <View
            testID="t13-confirm"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: t.space.md,
            }}
          >
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                marginRight: t.space.xs,
                fontFamily: t.font.regular,
                fontSize: t.type.label,
                lineHeight: t.leading(t.type.label),
                color: t.color.inkMuted,
              }}
            >
              {s('t11.counted')}
            </Text>
            <Money testID="t13-counted" amount={countedPaise} mode={display} size="body" />
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                marginHorizontal: t.space.sm,
                fontFamily: t.font.regular,
                fontSize: t.type.label,
                lineHeight: t.leading(t.type.label),
                color: t.color.inkMuted,
              }}
            >
              {'·'}
            </Text>
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                marginRight: t.space.xs,
                fontFamily: t.font.regular,
                fontSize: t.type.label,
                lineHeight: t.leading(t.type.label),
                color: t.color.inkMuted,
              }}
            >
              {s('t11.expected')}
            </Text>
            <Money testID="t13-expected" amount={expected} mode={display} size="body" />
          </View>

          {balanced ? (
            <Text
              testID="t13-every-rupee"
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                marginTop: t.space.md,
                fontFamily: t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.ink,
                textAlign: 'center',
              }}
            >
              {s('t13.everyRupee')}
            </Text>
          ) : null}
        </View>
      </Card>

      {/*
        D6, ON ITS OWN CARD. Separate from the celebration because it is not part
        of it: it is the one piece of tomorrow this screen is responsible for, and
        the figure beside it is what he counted, not what the book expected.
      */}
      <Card testID="t13-carry" display={display}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            padding: t.space.md,
          }}
        >
          <Text
            testID="t13-carry-copy"
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              flex: 1,
              flexWrap: 'wrap',
              marginRight: t.space.sm,
              fontFamily: t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: t.color.inkMuted,
            }}
          >
            {s('t13.carry')}
          </Text>
          <Money testID="t13-carry-amount" amount={countedPaise} mode={display} size="body" />
        </View>
      </Card>

      {/*
        DECISION 3, SAID BEFORE THE CLOSE. The cash matching is not the UPI
        matching, and this screen's celebration must not be read as both.
      */}
      <UpiCheckCard testID="t13-upi" store={store} s={s} display={display} />
    </Shell>
  );
}
