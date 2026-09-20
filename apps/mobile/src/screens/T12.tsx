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
 * THE OFFERED REASONS ARE THE TWO ORDINARY ONES. PRODUCT-REVIEW recommendation 1
 * argues for a third - an honest "I am not sure" - on the grounds that forcing a
 * choice puts a false fact into a ledger that cannot be edited. That is a product
 * decision and it is recorded there rather than taken here; free text stays
 * available, so nobody is forced to pick a reason that is wrong.
 */
import { View, Text, Pressable, TextInput } from '@swafto/ui';
import { subtract, type Paise } from '@swafto/formula-engine';
import { Shell, Row, type LoadStatus } from '../components/Shell.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

/** The quick reasons. Free text remains, because these two are not everything. */
const REASONS: readonly StringKey[] = ['t12.reason.change', 't12.reason.missed'];

export interface CashDifferenceProps {
  readonly store: Store;
  readonly countedPaise: Paise;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly reason?: string | null;
  readonly onChooseReason?: (reasonKey: StringKey) => void;
  readonly onReasonText?: (text: string) => void;
  readonly onClose?: () => void;
  readonly onRetry?: () => void;
}

export function CashDifference({
  store,
  countedPaise,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  reason = null,
  onChooseReason = () => {},
  onReasonText = () => {},
  onClose = () => {},
  onRetry = () => {},
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
              backgroundColor: canClose ? t.color.accent : t.color.surface,
              borderWidth: t.hairline,
              borderColor: t.color.border,
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
                color: canClose ? t.color.onAccent : t.color.inkMuted,
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

      <Text
        testID="t12-prompt"
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          padding: t.space.md,
          fontFamily: t.font.medium,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.ink,
        }}
      >
        {s('t12.reasonPrompt')}
      </Text>

      {REASONS.map((key) => (
        <Pressable
          key={key}
          testID={'t12-reason-' + key}
          accessibilityRole="button"
          accessibilityLabel={s(key)}
          accessibilityState={{ selected: reason === s(key) }}
          onPress={() => onChooseReason(key)}
          style={{
            minHeight: t.touchTarget,
            minWidth: t.touchTarget,
            margin: t.space.xs,
            paddingHorizontal: t.space.md,
            borderRadius: t.radius.md,
            borderWidth: t.hairline,
            borderColor: reason === s(key) ? t.color.accent : t.color.border,
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

      <TextInput
        testID="t12-reason-text"
        accessibilityLabel={s('t12.reasonPrompt')}
        value={reason ?? ''}
        onChangeText={onReasonText}
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          minHeight: t.touchTarget,
          margin: t.space.md,
          paddingHorizontal: t.space.md,
          borderRadius: t.radius.md,
          borderWidth: t.hairline,
          borderColor: t.color.border,
          fontFamily: t.font.regular,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.ink,
          backgroundColor: t.color.bg,
        }}
      />
    </Shell>
  );
}
