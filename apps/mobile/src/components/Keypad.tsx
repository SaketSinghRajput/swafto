/**
 * THE NUMERIC KEYPAD, AND WHY THE APP SHIPS ITS OWN.
 *
 * The system keyboard on a budget Android handset opens with a suggestion strip, a
 * voice button and a clipboard button above ten small keys. Constraint 1 forbids
 * inference in data entry; a keyboard that offers to complete the number is that
 * constraint broken by the platform rather than by us. This keypad has ten digits,
 * a backspace and a clear, and it cannot suggest anything because there is nothing
 * in it that could.
 *
 * IT IS ALSO THE ONLY WAY TO HIT A KEY WITH ONE THUMB IN A SHOP. Every key is at
 * least the registry's touch-target minimum on both axes, which the system keyboard
 * is not at this screen width.
 *
 * NO DECIMAL KEY. Amounts are entered in whole rupees and paise are appended by the
 * caller, because a decimal point typed into a cash figure is the single most common
 * way a shopkeeper enters a hundred-fold error. If paise entry is ever needed it is
 * a second, explicitly-labelled key - never a floating point.
 *
 * STATELESS. It reports the key pressed and holds nothing. The draft amount lives in
 * the store with every other piece of state, which is why this file has no hooks and
 * why a test can drive it without a renderer that supports them.
 */
import { View, Text, Pressable } from '@swafto/ui';
import { tokens, type Mode } from '../theme/tokens.ts';
import type { Strings } from '../i18n/strings.ts';

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'back' | 'clear';

const ROWS: readonly (readonly KeypadKey[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['clear', '0', 'back'],
];

export interface KeypadProps {
  readonly onKey: (key: KeypadKey) => void;
  readonly s: Strings;
  readonly mode?: Mode;
  readonly testID?: string;
}

export function Keypad({ onKey, s, mode = 'comfort', testID = 'keypad' }: KeypadProps) {
  const t = tokens(mode);
  return (
    <View
      testID={testID}
      accessibilityRole="keyboardkey"
      style={{ backgroundColor: t.color.surface, padding: t.space.sm }}
    >
      {ROWS.map((row) => (
        <View key={row.join('')} style={{ flexDirection: 'row' }}>
          {row.map((k) => {
            const label = k === 'back' ? s('keypad.back') : k === 'clear' ? s('keypad.clear') : k;
            return (
              <Pressable
                key={k}
                testID={`keypad-${k}`}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => onKey(k)}
                style={{
                  flex: 1,
                  // The registry minimum, on both axes, for every key without exception.
                  minHeight: t.touchTarget,
                  minWidth: t.touchTarget,
                  margin: t.space.xs,
                  paddingVertical: t.space.xs,
                  borderRadius: t.radius.md,
                  backgroundColor: t.color.bg,
                  borderWidth: t.hairline,
                  borderColor: t.color.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  /*
                   * Chrome, not content: the cap keeps a four-row keypad on screen
                   * when the system font scale is at maximum. The figures it helps
                   * enter are never capped - that is Money's job and Money does not.
                   */
                  maxFontSizeMultiplier={t.maxFontScale}
                  style={{
                    fontFamily: t.font.medium,
                    fontSize: t.type.heading,
                    lineHeight: t.leading(t.type.heading),
                    color: t.color.ink,
                    fontVariant: ['tabular-nums'],
                    // Wrapped Odia labels fill the key, so the Text owns the centring.
                    textAlign: 'center',
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
