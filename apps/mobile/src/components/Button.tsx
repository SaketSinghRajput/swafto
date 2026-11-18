/**
 * THE BUTTONS (DESIGN-SYSTEM-V2 3.9), in their own file so the state set and the
 * sheet can draw one without importing the whole frame. `Shell.tsx` re-exports
 * them, so every existing import still reads `PrimaryButton` from there.
 *
 * FOUR ROLES, ONE FILL - the rule the device build broke, restated for v2.
 *
 *   primary   - `brand` teal, `onBrand` label, pill. THE action a screen is for.
 *               It was marigold; v2 moves the fill to `brand` and leaves the
 *               marigold trio retained and undrawn (V2 1.1, decided at M2).
 *   secondary - `surface` with a `brand` rim at `edgeWidth`, `ink` label. A
 *               confirmation, or an action repeated on a screen.
 *   tonal     - `surfaceRaised` with an `edge` rim. Cancel, dismiss, not-now.
 *   ghost     - V2's "quiet": no fill, `ink`, underlined. Tertiary, and never
 *               the only way on. The underline is the non-colour cue that it is
 *               a control at all.
 *
 * DISABLED IS ONE VOCABULARY FOR EVERY CONTROL: `surfaceRaised`, `inkMuted`, a
 * `border` rim, no ripple, and `accessibilityState.disabled`. It carries the
 * state as well as the look, because a button that looks pressable and then
 * refuses teaches the shopkeeper that the app is broken.
 *
 * WHY THE FILL IS NEVER TRANSPARENT. `ghost` sets no fill rather than a clear
 * one: a transparent background is a string the contrast walker would try to
 * parse, and leaving it unset is what makes the walker resolve the surface
 * behind the button - which is what the platform does too.
 */
import { Text, Pressable } from '@swafto/ui';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';

export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'ghost';

export interface PrimaryButtonProps {
  readonly testID: string;
  readonly label: string;
  readonly onPress: () => void;
  readonly display?: DisplayMode;
  /** Disabled is a real state, not a greyed-out button that still reacts. */
  readonly disabled?: boolean;
  readonly variant?: ButtonVariant;
  /**
   * Height step. `xl` is the default because this component's historical job IS
   * the one primary action; a secondary or tonal button passes `lg`. Every step
   * is derived from the registry minimum, so none can go under it.
   */
  readonly size?: 'md' | 'lg' | 'xl';
}

export function PrimaryButton({
  testID,
  label,
  onPress,
  display = 'comfort',
  disabled = false,
  variant = 'primary',
  size = 'xl',
}: PrimaryButtonProps) {
  const t = tokens(display);

  const fill = disabled
    ? t.color.surfaceRaised
    : variant === 'primary'
      ? t.color.brand
      : variant === 'secondary'
        ? t.color.surface
        : variant === 'tonal'
          ? t.color.surfaceRaised
          : undefined;

  const ink = disabled ? t.color.inkMuted : variant === 'primary' ? t.color.onBrand : t.color.ink;

  /*
   * THE RIM. A filled teal button is its own outline. A secondary is white on
   * a pale ground, so its `brand` rim is the boundary (N6); a tonal or a
   * disabled one is a pale shape on a pale ground, and gets `edge` (N1-N3) or,
   * disabled, the decorative `border` - an inactive control is exempt from
   * WCAG 1.4.11, and looking unlike a live one is the point (HT-27).
   */
  const rim = disabled
    ? t.color.border
    : variant === 'secondary'
      ? t.color.brand
      : variant === 'tonal'
        ? t.color.edge
        : undefined;

  /*
   * TYPE BY STEP, AND A MEASURED DEVIATION FROM V2. V2 3.9 sets the primary
   * label at `heading`. `check:layout` refused even `lead` on the `lg` add bar:
   * T7's running total fell 9px below its body at 2.0x, because every dp of
   * a keypad footer is the total's. So the `xl` button (the one main action,
   * never above a keypad) carries `lead`, and `lg` / `md` stay at `body`,
   * bold - the weight, the fill and the pill carry the emphasis instead.
   */
  const size_ = size === 'xl' ? t.type.lead : t.type.body;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      /*
       * THE TAP HAS TO LAND VISIBLY. `android_ripple` rather than a function
       * style: the function form would reach the test double as a function
       * where every instrument expects a style object.
       */
      android_ripple={
        disabled ? undefined : { color: variant === 'primary' ? t.color.brandPressed : t.color.border }
      }
      style={{
        minHeight: t.control[size],
        minWidth: t.touchTarget,
        margin: t.space.sm,
        paddingHorizontal: t.space.md,
        borderRadius: t.radius.pill,
        backgroundColor: fill,
        borderWidth: rim === undefined ? 0 : t.edgeWidth,
        borderColor: rim,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          fontFamily: variant === 'ghost' ? t.font.medium : t.font.bold,
          fontSize: size_,
          lineHeight: t.leading(size_),
          color: ink,
          textAlign: 'center',
          textDecorationLine: variant === 'ghost' && !disabled ? 'underline' : 'none',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
