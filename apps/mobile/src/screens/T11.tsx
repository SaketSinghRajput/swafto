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
import { View, Text, Pressable } from '@swafto/ui';
import { Shell, Row, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { Keypad, type KeypadKey } from '../components/Keypad.tsx';
import { Money } from '../components/Money.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import type { Paise } from '@swafto/formula-engine';
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
  /** F-9: the header's way back. Explicit `| undefined` for exactOptionalPropertyTypes. */
  readonly onBack?: (() => void) | undefined;
  /**
   * USABILITY item 9: WHETHER THE PAD IS UP. At 2.0x text the footer left the
   * working list a window of one line (U-69) - the list he is meant to check
   * line by line against his paper sheet. As on T6 (HT-30), at a large text
   * size the pad waits for a tap on the counted figure and the working list
   * gets the screen. Defaults to up: at ordinary sizes counting is two taps.
   */
  readonly keypadOpen?: boolean;
  readonly onKeypad?: (open: boolean) => void;
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
  onBack,
  keypadOpen = true,
  onKeypad = () => {},
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
      /*
       * INLINE, because this screen has a keypad.
       *
       * T11 is not an EntryForm but it is an entry screen, and the same rule
       * binds it: a hero figure in the canvas plus a pad does not fit at the
       * chrome cap in Odia. B31 measured it at 43px below the fold.
       *
       * It costs nothing this screen should keep. The expected figure is
       * deliberately SECONDARY here - S03 is emphatic that the shopkeeper counts
       * his drawer and then compares, rather than reading the expected number
       * and typing it back at us. A quieter expected figure beside the title,
       * with the counted figure large under his thumb, is the correct emphasis
       * rather than a concession to the layout.
       */
      headline={{ labelKey: 't11.expected', amount: cash.value, inline: true }}
      onRetry={onRetry}
      onBack={onBack}
      footer={
        <>
          <Pressable
            testID="t11-counted"
            accessibilityRole="button"
            accessibilityLabel={s('t11.counted')}
            accessibilityState={{ expanded: keypadOpen }}
            onPress={() => onKeypad(!keypadOpen)}
            android_ripple={{ color: t.color.brandSoft }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              minHeight: t.touchTarget,
              minWidth: t.touchTarget,
              padding: t.space.md,
              /*
               * A CONTROL LOOKS LIKE ONE. Folded at large text, this figure is the
               * way to the pad, so it is outlined as T6's field is - `inkMuted`,
               * the control-border token - rather than ruled like a list line.
               */
              marginHorizontal: t.space.sm,
              marginTop: t.space.xs,
              borderRadius: t.radius.md,
              borderWidth: t.hairline,
              borderColor: t.color.inkMuted,
              backgroundColor: t.color.surface,
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
          </Pressable>
          <PrimaryButton
            testID="t11-confirm"
            label={s('common.save')}
            onPress={onConfirm}
            display={display}
            disabled={countedPaise === null}
          />
          {keypadOpen ? <Keypad onKey={onKey} s={s} mode={display} /> : null}
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
          amount={line.amount}
          out={line.sign === '-'}
          display={display}
          directional
        />
      ))}
    </Shell>
  );
}
