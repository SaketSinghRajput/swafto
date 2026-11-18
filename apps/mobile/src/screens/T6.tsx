/**
 * T6 - OPENING CASH. "First run and after a gap only; otherwise carried, not asked."
 *
 * DRAWN TO `docs/design-reference/comfort/T6.png`: a back bar with "Before the
 * first sale" under the title, one card holding the question and why it is
 * asked once, then - at the foot, under the thumb - the labelled figure in an
 * outlined field, the keypad, and the save button last.
 *
 * THE SCREEN THAT USUALLY DOES NOT APPEAR. Yesterday's closing count is today's
 * opening cash, so asking every morning is asking a question the app already
 * knows the answer to. It appears on the first run, and after a gap where there
 * is no yesterday to carry from.
 *
 * THE APP DOES NOT GUESS. After a gap it has no honest opening figure, and
 * inventing one would put a number into the ledger that the shopkeeper never
 * typed. The field shows zero until he types, and Save stays disabled until he
 * has - a zero he typed is an answer, a zero nobody typed is not.
 *
 * IT HAS A KEYPAD because it has one input, and therefore no bottom nav.
 */
import { View, Text, Pressable } from '@swafto/ui';
import { Shell, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { Keypad, type KeypadKey } from '../components/Keypad.tsx';
import { Money } from '../components/Money.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import type { Paise } from '@swafto/formula-engine';

export interface OpeningCashProps {
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /** What the keypad has built. Null until he types - never a guessed default. */
  readonly draftPaise?: Paise | null;
  readonly onKey?: (key: KeypadKey) => void;
  /**
   * HT-30: whether the keypad is up. At large text in the focus display the
   * keypad left no room for the question, so there it waits for a tap on the
   * figure, as X1's does. Defaults to up: the comfort reference draws it so.
   */
  readonly keypadOpen?: boolean;
  readonly onKeypad?: (open: boolean) => void;
  readonly onConfirm?: () => void;
  /** F-9: the visible way back. Absent means no back control is drawn. */
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
}

export function OpeningCash({
  status = 'ready',
  language = 'en',
  display = 'comfort',
  draftPaise = null,
  onKey = () => {},
  keypadOpen = true,
  onKeypad = () => {},
  onConfirm = () => {},
  onBack,
  onRetry = () => {},
}: OpeningCashProps) {
  const t = tokens(display);
  const s = strings(language);

  return (
    <Shell
      id="t6"
      s={s}
      display={display}
      status={status}
      titleKey="t6.title"
      subtitle={s('t6.sub')}
      onBack={onBack}
      onRetry={onRetry}
      footer={
        <View style={{ backgroundColor: t.color.bg, paddingHorizontal: t.space.sm }}>
          <Text
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              paddingHorizontal: t.space.sm,
              fontFamily: t.font.medium,
              fontSize: t.type.label,
              lineHeight: t.leading(t.type.label),
              color: t.color.inkMuted,
            }}
          >
            {s('t6.title')}
          </Text>
          {/*
            THE FIELD, OUTLINED IN THE FOCUS COLOUR as the reference draws it:
            this is the one input on the screen and it is always the live one.
            `brand` is the reference's `--focus-ring`. In focus mode `brand` is
            the ground colour itself, so the edge there is `inkMuted`, the
            control-border token.
          */}
          <Pressable
            testID="t6-draft"
            accessibilityRole="button"
            accessibilityLabel={s('t6.title')}
            accessibilityState={{ expanded: keypadOpen }}
            onPress={() => onKeypad(!keypadOpen)}
            android_ripple={{ color: t.color.brandSoft }}
            style={{
              marginHorizontal: t.space.xs,
              marginBottom: t.space.xs,
              paddingHorizontal: t.space.md,
              minHeight: t.control.xl,
              minWidth: t.touchTarget,
              justifyContent: 'center',
              borderRadius: t.radius.md,
              borderWidth: t.glyph.stroke,
              borderColor: display === 'focus' ? t.color.inkMuted : t.color.brand,
              backgroundColor: t.color.surface,
            }}
          >
            <Money
              testID="t6-draft-amount"
              amount={draftPaise ?? 0}
              mode={display}
              size="heading"
            />
          </Pressable>
          {keypadOpen ? <Keypad onKey={onKey} s={s} mode={display} /> : null}
          <PrimaryButton
            testID="t6-confirm"
            label={s('t6.save')}
            onPress={onConfirm}
            display={display}
            size="lg"
            disabled={draftPaise === null}
          />
        </View>
      }
    >
      <View
        style={{
          marginHorizontal: t.space.md,
          marginTop: t.space.md,
          padding: t.space.md,
          borderRadius: t.radius.lg,
          backgroundColor: t.color.surface,
          borderWidth: t.hairline,
          borderColor: t.color.border,
          elevation: t.elevation.card,
        }}
      >
        <Text
          testID="t6-prompt"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            fontFamily: t.font.bold,
            fontSize: t.type.heading,
            lineHeight: t.leading(t.type.heading),
            color: t.color.ink,
          }}
        >
          {s('t6.question')}
        </Text>
        <Text
          testID="t6-why"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            marginTop: t.space.xs,
            fontFamily: t.font.regular,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.inkMuted,
          }}
        >
          {s('t6.body')}
        </Text>
      </View>
    </Shell>
  );
}
