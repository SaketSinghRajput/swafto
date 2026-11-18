/**
 * T19 - A TYPED ADJUSTMENT (decision 2). Reached from T5; back returns there.
 *
 * TWO INPUTS AND NO THIRD. What happened, from a FIXED list, and how much, from
 * the keypad. There is no text box anywhere on this screen and no "other": a
 * free-form adjustment can absorb any discrepancy, and the moment one exists the
 * cash check and every score built on it stop meaning anything.
 *
 * EACH CHOICE SAYS WHAT IT WILL MOVE. Under the list, the chosen type's own line:
 * a fake note takes the amount off expected cash and profit; goods taken home
 * move no cash at all. The shopkeeper sees the consequence before he saves,
 * because an adjustment that quietly moved his expected cash would be the kind
 * of figure he cannot explain at the count.
 *
 * Nothing is pre-selected and nothing is pre-filled: the app never guesses a
 * figure he is entering (no inference in data entry), and it does not guess
 * which kind of thing happened either.
 */
import { View, Text, Pressable } from '@swafto/ui';
import { ADJUSTMENT_TYPES, adjustmentKey, type AdjustmentType, type Paise } from '@swafto/formula-engine';
import { Shell, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { Keypad, type KeypadKey } from '../components/Keypad.tsx';
import { Money } from '../components/Money.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

export interface AdjustmentProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly type?: AdjustmentType | null;
  readonly amountPaise?: Paise | null;
  readonly onChooseType?: (type: AdjustmentType) => void;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onSave?: () => void;
  readonly onRetry?: () => void;
  readonly onBack?: (() => void) | undefined;
}

export function Adjustment({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  type = null,
  amountPaise = null,
  onChooseType = () => {},
  onKey = () => {},
  onSave = () => {},
  onRetry = () => {},
  onBack,
}: AdjustmentProps) {
  const t = tokens(display);
  const s = strings(language);
  // F-7's rule: a closed day offers no control that would only throw.
  const closed = store.state.day.state === 'closed';
  const canSave = !closed && type !== null && amountPaise !== null && amountPaise > 0;

  return (
    <Shell
      id="t19"
      s={s}
      display={display}
      status={status}
      titleKey="t19.title"
      onRetry={onRetry}
      onBack={onBack}
      footer={
        closed ? undefined : (
          <>
            <View
              testID="t19-amount"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                padding: t.space.md,
                borderTopWidth: t.hairline,
                borderTopColor: t.color.border,
              }}
            >
              <Text
                maxFontSizeMultiplier={t.maxFontScale}
                style={{
                  fontFamily: t.font.regular,
                  fontSize: t.type.label,
                  lineHeight: t.leading(t.type.label),
                  color: t.color.inkMuted,
                }}
              >
                {s('t19.amount')}
              </Text>
              <Money testID="t19-amount-figure" amount={amountPaise ?? 0} mode={display} size="figure" />
            </View>
            <PrimaryButton
              testID="t19-save"
              label={s('t19.save')}
              onPress={onSave}
              display={display}
              disabled={!canSave}
            />
            <Keypad onKey={onKey} s={s} mode={display} />
          </>
        )
      }
    >
      <Text
        testID="t19-prompt"
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          padding: t.space.md,
          fontFamily: t.font.medium,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.ink,
        }}
      >
        {s('t19.type')}
      </Text>
      {ADJUSTMENT_TYPES.map((k) => (
        <Pressable
          key={k}
          testID={'t19-type-' + k}
          accessibilityRole="radio"
          accessibilityLabel={s(adjustmentKey(k) as StringKey)}
          accessibilityState={{ selected: type === k, disabled: closed }}
          disabled={closed}
          onPress={() => onChooseType(k)}
          style={{
            minHeight: t.touchTarget,
            minWidth: t.touchTarget,
            margin: t.space.xs,
            paddingHorizontal: t.space.md,
            borderRadius: t.radius.md,
            borderWidth: type === k ? t.glyph.stroke : t.hairline,
            // §9 decision 1: a control border is `inkMuted`; chosen is the accent.
            borderColor: type === k ? t.color.brand : t.color.inkMuted,
            backgroundColor: t.color.bg,
            justifyContent: 'center',
          }}
        >
          <Text
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              fontFamily: type === k ? t.font.medium : t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: t.color.ink,
            }}
          >
            {s(adjustmentKey(k) as StringKey)}
          </Text>
        </Pressable>
      ))}
      {type === null ? null : (
        <Text
          testID="t19-effect"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            padding: t.space.md,
            fontFamily: t.font.regular,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.inkMuted,
          }}
        >
          {s(('adjust.effect.' + type) as StringKey)}
        </Text>
      )}
    </Shell>
  );
}
