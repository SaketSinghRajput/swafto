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
import { Icon } from '../ui/Icon.tsx';

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
      /*
       * THE TRAY IS `surfaceRaised` AND THE KEYS ARE `surface`, WHICH IS THE
       * WAY ROUND IT WAS NOT.
       *
       * The pad drew WHITE and its keys drew `bg` - cream keys on a white tray,
       * measured at 1.02:1. The fill carried no signal whatsoever, and the whole
       * boundary of the most-tapped control in the app rested on one hairline.
       *
       * Inverting it is most of the fix but not all of it: white on
       * `surfaceRaised` is a small step too. What makes a key read is the three
       * together - the fill step, a real `elevation` shadow the platform draws,
       * and the `inkMuted` edge §9 reserves for a control boundary. Any one of
       * them alone is what was there before.
       */
      style={{ backgroundColor: t.color.surfaceRaised, paddingHorizontal: t.space.xs }}
      /*
       * v2 "Mitra" (DESIGN-SYSTEM-V2 3.8): NO ELEVATION ON ANY KEY. Twelve
       * shadowed views were the heaviest GPU work on a budget handset. The key
       * now reads from the white fill on the tray and a 2dp `edge` rim, which
       * clears 3:1 against both (N2, N3) - the shadow was the third signal and
       * the rim does its job at a fraction of the cost.
       */
    >
      {ROWS.map((row) => (
        <View key={row.join('')} style={{ flexDirection: 'row' }}>
          {row.map((k) => {
            /*
             * THE DELETE KEY IS NOT CALLED "BACK". It was, and so was the
             * header's navigate-back on every screen that has this pad: TalkBack
             * spoke one word for two opposite actions, and anything driven by
             * label could not tell them apart. It now says what it does and
             * draws the reference's mark (Phone.dc.html:1246, "Delete digit").
             */
            const label = k === 'back' ? s('keypad.delete') : k === 'clear' ? s('keypad.clear') : k;
            return (
              <Pressable
                key={k}
                testID={`keypad-${k}`}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => onKey(k)}
                style={{
                  flex: 1,
                  /*
                   * THE FLOOR, AND HERE IT IS GENUINELY THE RIGHT ANSWER.
                   *
                   * `control.lg` was tried and B31 refused it: four taller rows
                   * put the pad below the fold at the chrome cap in Odia. That
                   * is the honest trade and the check is right to force it -
                   * the keypad has the least vertical room of anything in the
                   * product, and a key the shopkeeper cannot see is worse than
                   * a key that is eight dp shorter.
                   *
                   * It costs nothing, because HEIGHT WAS NEVER THE DEFECT. The
                   * keys looked weak at 1.02:1 fill against their tray, and
                   * they now read from the white fill, the elevation and the
                   * larger digit - none of which spends a single dp.
                   */
                  minHeight: t.touchTarget,
                  minWidth: t.touchTarget,
                  margin: t.space.xs,
                  /*
                   * NO VERTICAL PADDING (v2, M3). The 2dp `edge` rim costs 2dp a
                   * row at the cap, where the digit's own 1.8 line box already
                   * sets the key's height; four rows of it put T7's running
                   * total 9px below its body at 2.0x (check:layout). The line
                   * box is the breathing room - the padding was a second one.
                   */
                  borderRadius: t.radius.md,
                  // v2: the word keys (Clear, Delete) sit on the tray colour, the digits on white.
                  backgroundColor: k === 'clear' || k === 'back' ? t.color.surfaceRaised : t.color.surface,
                  borderWidth: t.edgeWidth,
                  /*
                   * `inkMuted`, NOT `border`. SPEC-DIGEST §9 decision 1: control
                   * borders use text-muted because the rule tokens measure under
                   * the 3:1 WCAG 1.4.11 gate for the boundary of a control -
                   * `border` is 1.34:1 on this ground. A key sitting on `bg` has
                   * NOTHING ELSE marking where it begins and ends, so that
                   * boundary was the whole control, drawn at a third of the
                   * contrast it needed, on the most-tapped thing in the app.
                   *
                   * Nothing caught it: `failingContrast` walks Text nodes against
                   * their background, and a border encloses no text. The ratios
                   * for both tokens are measured in tokens.spec.tsx.
                   */
                  borderColor: t.color.edge,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {k === 'back' ? (
                  // v2: the `delete` glyph from the icon font; the name is still the word.
                  <View testID="keypad-back-mark">
                    <Icon name="delete" size="lg" color="ink" display={mode} />
                  </View>
                ) : (
                <Text
                  /*
                   * Chrome, not content: the cap keeps a four-row keypad on screen
                   * when the system font scale is at maximum. The figures it helps
                   * enter are never capped - that is Money's job and Money does not.
                   */
                  maxFontSizeMultiplier={t.maxFontScale}
                  style={{
                    /*
                     * THE HIERARCHY IS TYPE, NOT FILL.
                     *
                     * A digit and a word key are different jobs, and the obvious
                     * way to separate them - a different fill for Clear and
                     * Backspace - is the trap this file just climbed out of:
                     * every fill available is within a point or two of every
                     * other on this ground. Size and weight separate them at
                     * arm's length in daylight, and cost no contrast at all.
                     */
                    fontFamily: k === 'clear' ? t.font.medium : t.font.bold,
                    /*
                     * `heading`, not `figure`. A digit wants to be big, but the
                     * line box is 1.8x the size and there are four rows of them:
                     * at the chrome cap `figure` put the pad below the fold on
                     * every form. `heading` is still well above the body floor
                     * and reads at arm's length, and B31 passes.
                     */
                    fontSize: k === 'clear' ? t.type.body : t.type.heading,
                    lineHeight: t.leading(
                      k === 'clear' ? t.type.body : t.type.heading,
                    ),
                    color: k === 'clear' ? t.color.inkMuted : t.color.ink,
                    fontVariant: ['tabular-nums'],
                    // Wrapped Odia labels fill the key, so the Text owns the centring.
                    textAlign: 'center',
                  }}
                >
                  {label}
                </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}

    </View>
  );
}
