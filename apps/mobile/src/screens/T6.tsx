/**
 * T6 - OPENING CASH. "First run and after a gap only; otherwise carried, not asked."
 *
 * THE SCREEN THAT USUALLY DOES NOT APPEAR. Yesterday's closing cash is today's
 * opening cash, so asking every morning is asking a question the app already
 * knows the answer to - and a question asked needlessly is a question answered
 * carelessly. It appears on the first run, and after a gap where there is no
 * yesterday to carry from.
 *
 * THE APP DOES NOT GUESS. After a gap it has no honest opening figure, and
 * inventing one would put a number into the ledger that the shopkeeper never
 * typed. Constraint 1 forbids inference in data entry; this is the same rule at
 * the start of the day rather than in the middle of it.
 *
 * IT HAS A KEYPAD because it has one input, and therefore no bottom nav.
 */
import { View, Text } from '@swafto/ui';
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
  readonly onConfirm?: () => void;
  readonly onRetry?: () => void;
}

export function OpeningCash({
  status = 'ready',
  language = 'en',
  display = 'comfort',
  draftPaise = null,
  onKey = () => {},
  onConfirm = () => {},
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
      onRetry={onRetry}
      footer={
        <>
          <View
            testID="t6-draft"
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
              {s('formA.amount')}
            </Text>
            <Money
              testID="t6-draft-amount"
              amount={draftPaise ?? 0}
              mode={display}
              size="figure"
            />
          </View>
          <PrimaryButton
            testID="t6-confirm"
            label={s('common.save')}
            onPress={onConfirm}
            display={display}
            disabled={draftPaise === null}
          />
          <Keypad onKey={onKey} s={s} mode={display} />
        </>
      }
    >
      <Text
        testID="t6-prompt"
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          padding: t.space.md,
          fontFamily: t.font.regular,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.ink,
        }}
      >
        {s('t6.prompt')}
      </Text>
    </Shell>
  );
}
