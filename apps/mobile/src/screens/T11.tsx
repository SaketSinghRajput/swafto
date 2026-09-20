/**
 * T11 - THE CASH CHECK, COUNTING. The most important screen in the product.
 *
 * "Cash check is a READING SCREEN with one input. It shows the expected balance
 * as its working, takes a counted figure, and then either congratulates or
 * demands a reason. Treating it as a fifth form is the mistake that turns the
 * most important screen in the product into a data-entry chore." That is the
 * build map's own note, and this file is built to it.
 *
 * SO THE WORKING IS THE SCREEN. Not the answer - the answer is one line at the
 * top. The seven lines underneath are where the expectation came from, each with
 * its sign, because a shopkeeper who is three hundred rupees short needs to see
 * which line to doubt. A figure with no working is an accusation he cannot check.
 *
 * IT HAS A KEYPAD because it has exactly one input: the count. That is the one
 * number on this screen he types, and it is why there is no bottom nav beside it.
 */
import { View, Text } from '@swafto/ui';
import { Shell, Row, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { Keypad, type KeypadKey } from '../components/Keypad.tsx';
import { Money } from '../components/Money.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import { subtract, type Paise } from '@swafto/formula-engine';
import type { Store } from '../store/index.ts';

export interface CashCheckProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /** What the keypad has built so far. Null until he starts typing. */
  readonly countedPaise?: Paise | null;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onConfirm?: () => void;
  readonly onRetry?: () => void;
}

export function CashCheck({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  countedPaise = null,
  onKey = () => {},
  onConfirm = () => {},
  onRetry = () => {},
}: CashCheckProps) {
  const t = tokens(display);
  const s = strings(language);
  const cash = store.expectedCash();

  return (
    <Shell
      id="t11"
      s={s}
      display={display}
      status={status}
      titleKey="t11.title"
      headline={{ labelKey: 't11.expected', amount: cash.value }}
      onRetry={onRetry}
      footer={
        <>
          <View
            testID="t11-counted"
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
              {s('t11.counted')}
            </Text>
            <Money
              testID="t11-counted-amount"
              amount={countedPaise ?? 0}
              mode={display}
              size="figure"
            />
          </View>
          <PrimaryButton
            testID="t11-confirm"
            label={s('common.save')}
            onPress={onConfirm}
            display={display}
            disabled={countedPaise === null}
          />
          <Keypad onKey={onKey} s={s} mode={display} />
        </>
      }
    >
      {/*
        THE WORKING, LINE BY LINE, WITH ITS SIGN. `directional` renders the sign
        always and colours additively - the two colours are the pair this reader
        is likeliest to confuse, so the sign is what carries the meaning.
      */}
      {cash.working.lines.map((line) => (
        <Row
          key={line.key}
          testID={'t11-working-' + line.key}
          label={s(line.key as StringKey)}
          amount={line.sign === '-' ? subtract(0, line.amount) : line.amount}
          display={display}
          directional
        />
      ))}
    </Shell>
  );
}
