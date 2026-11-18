/**
 * T12 - THE CASH CHECK, WHEN IT DOES NOT MATCH.
 *
 * A DIFFERENCE REQUIRES A REASON BEFORE THE DAY CAN CLOSE. Not validation
 * pedantry: an unexplained gap let through is a gap nobody will ever explain, and
 * the figures stop meaning anything the first time one passes. The rule is
 * enforced in three places - here, in the store, and in the API - because
 * constraint 3 taught this build that one layer is not enough.
 *
 * THE COPY IS A QUESTION, NEVER A VERDICT. "What do you think happened?" and not
 * "Your cash does not match". He is the one who counted; the app is the one that
 * might be wrong. A screen that accuses him of losing money is a screen he stops
 * opening, and then the whole ledger stops being true.
 *
 * THE REASONS ARE TYPED, FROM A FIXED LIST, AND THERE IS NO FREE TEXT.
 *
 * This screen used to carry a text box, and the comment here used to defend it:
 * forcing a choice puts a false fact into a ledger that cannot be edited, so let
 * him write his own. The worry was right and the remedy was wrong. The co-founder
 * review of 2026-10-22, decision 2, rules adjustments typed and never free-form,
 * because a free-form reason absorbs any discrepancy - and a discrepancy that can
 * always be explained away makes expected-vs-actual, and the Cash Confidence
 * score built on it, mean nothing at all.
 *
 * The honest answer is a LISTED answer. "Don't know" is on the list. He is never
 * made to claim a cause he does not know, and the gap is still counted as a gap
 * rather than dissolved into a sentence no instrument can read.
 *
 * A listed reason is also a STRING KEY, where free text was whatever language he
 * happened to type in. The stored reason now renders in whichever language the
 * book is later read in; the text box froze it at the moment of the count.
 *
 * THE LIST DEPENDS ON THE SIGN, because the causes do. Cash missing from the box
 * and cash extra in it do not have the same explanations, and offering "forgot a
 * sale" to a man who is short invites him to pick the one that fits worst.
 */
import { View, Text, Pressable } from '@swafto/ui';
import { subtract, type Paise } from '@swafto/formula-engine';
import { Shell, Row, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { UpiCheckCard } from '../components/DayFacts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

/*
 * SHORT IN THE BOX: CHECK FIRST, THEN IT IS THE DAY'S LOSS (product owner,
 * 2026-10-25, HT-23). The old list offered causes - one of them, "gave change
 * from my pocket", described an OVER, not a short. Now he is asked to check the
 * two things that explain most shortages (a UPI payment entered as cash, a
 * miscount) and, if it is still short, the gap is recorded as a loss for the
 * day. The app does not check the payment app itself: it has no gateway, and
 * it never infers a figure (CLAUDE.md, no inference in data entry).
 */
export const SHORT_REASON: StringKey = 't12.reason.loss';

/** Over: the drawer holds more than the book says. A missed sale, usually. */
const REASONS_OVER: readonly StringKey[] = [
  't12.reason.sale',
  't12.reason.miscount',
  't12.reason.unknown',
];

export interface CashDifferenceProps {
  readonly store: Store;
  readonly countedPaise: Paise;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly reason?: string | null;
  readonly onChooseReason?: (reasonKey: StringKey) => void;
  readonly onClose?: () => void;
  readonly onRetry?: () => void;
  /** F-9: the header's way back. Explicit `| undefined` for exactOptionalPropertyTypes. */
  readonly onBack?: (() => void) | undefined;
  /** HT-23: back to the cash count, to count the drawer again. */
  readonly onRecount?: () => void;
}

export function CashDifference({
  store,
  countedPaise,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  reason = null,
  onChooseReason = () => {},
  onClose = () => {},
  onRetry = () => {},
  onBack,
  onRecount = () => {},
}: CashDifferenceProps) {
  const t = tokens(display);
  const s = strings(language);

  const expected = store.expectedCash().value;
  const difference = subtract(countedPaise, expected);
  /*
   * The close button is disabled until there IS a reason, and the disabling is
   * what enforces the rule on this layer. A button that looks pressable and then
   * refuses teaches him the app is broken.
   */
  const canClose = difference === 0 || Boolean(reason && reason.trim());

  return (
    <Shell
      id="t12"
      s={s}
      display={display}
      status={status}
      titleKey="t12.title"
      headline={{ labelKey: 't12.difference', amount: difference }}
      onRetry={onRetry}
      onBack={onBack}
      footer={
        <View style={{ padding: t.space.sm }}>
          <Pressable
            testID="t12-close"
            accessibilityRole="button"
            accessibilityLabel={s('t1.closeDay')}
            accessibilityState={{ disabled: !canClose }}
            disabled={!canClose}
            onPress={onClose}
            style={{
              minHeight: t.touchTarget,
              minWidth: t.touchTarget,
              borderRadius: t.radius.md,
              backgroundColor: canClose ? t.color.brand : t.color.surface,
              borderWidth: t.hairline,
              // §9 decision 1: a control border is `inkMuted`; `border` is 1.34:1.
              borderColor: t.color.inkMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: t.font.medium,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                // Ink on the surface when disabled: the accent pair is the only
                // one checked for contrast, so a disabled button uses ink on bg.
                color: canClose ? t.color.onBrand : t.color.inkMuted,
              }}
            >
              {s('t1.closeDay')}
            </Text>
          </Pressable>
        </View>
      }
    >
      <Row
        testID="t12-expected"
        label={s('t11.expected')}
        amount={expected}
        display={display}
      />
      <Row
        testID="t12-counted"
        label={s('t11.counted')}
        amount={countedPaise}
        display={display}
      />

      {difference < 0 ? (
        <View testID="t12-check">
          <Text testID="t12-prompt" maxFontSizeMultiplier={t.maxFontScale} style={{
            padding: t.space.md,
            fontFamily: t.font.medium,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.ink,
          }}>
            {s('t12.check.prompt')}
          </Text>
          {(['t12.check.payments', 't12.check.count'] as const).map((key) => (
            <Text
              key={key}
              testID={'t12-' + key}
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                paddingHorizontal: t.space.md,
                paddingBottom: t.space.sm,
                fontFamily: t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.ink,
              }}
            >
              {s(key)}
            </Text>
          ))}
          <PrimaryButton
            testID="t12-recount"
            label={s('t12.recount')}
            onPress={onRecount}
            variant="ghost"
            size="md"
            display={display}
          />
          <Pressable
          key={SHORT_REASON}
          testID={'t12-reason-' + SHORT_REASON}
          accessibilityRole="button"
          accessibilityLabel={s('t12.markLoss')}
          accessibilityState={{ selected: reason === SHORT_REASON }}
          onPress={() => onChooseReason(SHORT_REASON)}
          style={{
            minHeight: t.touchTarget,
            minWidth: t.touchTarget,
            margin: t.space.xs,
            paddingHorizontal: t.space.md,
            borderRadius: t.radius.md,
            borderWidth: t.hairline,
            borderColor: reason === SHORT_REASON ? t.color.brand : t.color.border,
            backgroundColor: t.color.bg,
            justifyContent: 'center',
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
            {s('t12.markLoss')}
          </Text>
        </Pressable>
        </View>
      ) : (
        <>
          <Text testID="t12-prompt" maxFontSizeMultiplier={t.maxFontScale} style={{
            padding: t.space.md,
            fontFamily: t.font.medium,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.ink,
          }}>
            {s('t12.reasonPrompt')}
          </Text>
          {REASONS_OVER.map((key) => (
            <Pressable
          key={key}
          testID={'t12-reason-' + key}
          accessibilityRole="button"
          accessibilityLabel={s(key)}
          accessibilityState={{ selected: reason === key }}
          onPress={() => onChooseReason(key)}
          style={{
            minHeight: t.touchTarget,
            minWidth: t.touchTarget,
            margin: t.space.xs,
            paddingHorizontal: t.space.md,
            borderRadius: t.radius.md,
            borderWidth: t.hairline,
            borderColor: reason === key ? t.color.brand : t.color.border,
            backgroundColor: t.color.bg,
            justifyContent: 'center',
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
            {s(key)}
          </Text>
        </Pressable>
          ))}
        </>
      )}

      {/* Decision 3: said before the close, as on T13. */}
      <UpiCheckCard testID="t12-upi" store={store} s={s} display={display} />
    </Shell>
  );
}
