/**
 * THE SWITCH (DESIGN-SYSTEM-V2 3.14). A setting that is on or off, said three
 * ways at once: the track's fill, the thumb's mark (a tick or a dash), and a
 * WORD beside it. A bare coloured knob is a state a reader in daylight - or a
 * reader who cannot tell teal from brown - has to guess.
 *
 * ONE TAP, AND IT IS DONE. The whole row is the control, and pressing it is the
 * change: there is no Save after it. On the consent screen that is the law, not
 * a style - DPDP wants withdrawal as easy as giving, and giving was one tap.
 *
 *   ON   track `brand`, thumb `onBrand` with a `brand` tick     N13, T25
 *   OFF  track `surfaceRaised` with an `edge` rim, thumb
 *        `inkMuted` with a `surface` dash                       N3, N14
 *
 * Role `switch` and `accessibilityState.checked`; the accessible NAME is the
 * setting alone. V2 3.14 asks for "setting + state word", but TalkBack already
 * speaks a switch's checked state ("switch, on"), so the word in the name was
 * said twice - and X0's test pins the name to the purpose. The state word is
 * still drawn, for the eye.
 */
import { View, Text, Pressable } from '@swafto/ui';
import { Icon } from '../ui/Icon.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';

export interface SwitchProps {
  readonly testID: string;
  readonly label: string;
  readonly value: boolean;
  readonly onChange: (next: boolean) => void;
  /** The state words, drawn beside the track - "On" / "Off", or "Yes" / "No". */
  readonly onWord: string;
  readonly offWord: string;
  readonly display?: DisplayMode;
  /** A second line under the label: what the setting does. */
  readonly detail?: string;
}

export function Switch({
  testID,
  label,
  value,
  onChange,
  onWord,
  offWord,
  display = 'comfort',
  detail,
}: SwitchProps) {
  const t = tokens(display);
  const word = value ? onWord : offWord;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      android_ripple={{ color: t.color.border }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        minHeight: t.control.lg,
        minWidth: t.touchTarget,
        paddingVertical: t.space.sm,
      }}
    >
      <View style={{ flex: 1, minWidth: t.control.xl, marginRight: t.space.sm }}>
        <Text
          {...t.bodyText}
          style={{
            fontFamily: t.font.medium,
            fontSize: t.type.body,
            lineHeight: t.leadingUncapped(t.type.body),
            color: t.color.ink,
          }}
        >
          {label}
        </Text>
        {detail === undefined ? null : (
          <Text
            {...t.bodyText}
            style={{
              fontFamily: t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leadingUncapped(t.type.body),
              color: t.color.inkMuted,
            }}
          >
            {detail}
          </Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          testID={testID + '-track'}
          style={{
            width: t.control.lg,
            flexDirection: 'row',
            justifyContent: value ? 'flex-end' : 'flex-start',
            padding: t.space.xs,
            borderRadius: t.radius.pill,
            borderWidth: t.edgeWidth,
            borderColor: value ? t.color.brand : t.color.edge,
            backgroundColor: value ? t.color.brand : t.color.surfaceRaised,
          }}
        >
          <View
            testID={testID + '-thumb'}
            style={{
              width: t.icon.lg,
              height: t.icon.lg,
              borderRadius: t.radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: value ? t.color.onBrand : t.color.inkMuted,
            }}
          >
            <Icon
              name={value ? 'tick' : 'dash'}
              size="sm"
              color={value ? 'brand' : 'surface'}
              display={display}
            />
          </View>
        </View>
        <Text
          testID={testID + '-word'}
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            marginLeft: t.space.sm,
            fontFamily: t.font.bold,
            fontSize: t.type.label,
            lineHeight: t.leading(t.type.label),
            color: value ? t.color.ink : t.color.inkMuted,
          }}
        >
          {word}
        </Text>
      </View>
    </Pressable>
  );
}
