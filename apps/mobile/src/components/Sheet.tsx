/**
 * THE SHEET (DESIGN-SYSTEM-V2 3.13): a panel that rises over the screen, for a
 * short list of choices or one question that needs an answer before going on -
 * the More entries, "Exit the app?", "Sign out that phone?".
 *
 * IN THE TREE, NOT A `Modal`. A Modal portals out of the React tree, and both
 * `check:layout` and the contact sheet render registry cases standalone - a
 * Modal would measure nothing and photograph an empty screen (Shell's
 * `overlay` note). So it is drawn in `Shell`'s `overlay` slot, absolutely
 * positioned over everything, and every instrument can see it.
 *
 * THE ONLY ELEVATION IN THE PRODUCT, and the only translucent fill: `scrim`
 * behind it. The scrim is never the colour text is measured against - the
 * panel sets `surface`, so every Text resolves to a real #RRGGBB pair.
 *
 * TWO WAYS OUT, BOTH EXPLICIT: a "Close" quiet button (a named control, 56 dp,
 * for a thumb) and the hardware Back key (the caller's `onClose`, wired by the
 * session). A tap on the scrim closes it too. No drag handle: the app carries
 * no gesture library, and a handle that cannot be dragged is a lie.
 *
 * MOTION. V2 asks for the `sheet` duration; this renderer has no hooks and an
 * entrance animation needs one, so the sheet arrives settled - which is what
 * reduced motion asks for anyway. Noted as an M3 gap, not hidden.
 */
import { View, Text, Pressable, ScrollView } from '@swafto/ui';
import type { ReactNode } from 'react';
import { PrimaryButton } from './Button.tsx';
import { tokens, SHEET_MAX_HEIGHT, type Mode as DisplayMode } from '../theme/tokens.ts';
import type { Strings } from '../i18n/strings.ts';

export interface SheetProps {
  readonly testID: string;
  readonly title: string;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly display?: DisplayMode;
  /** A sentence under the title. Body copy: it grows and wraps. */
  readonly body?: string;
  readonly children?: ReactNode;
  /**
   * Draw the Close button. A confirm sheet whose two answers ARE the way out
   * ("Stay" / "Exit") passes false, so there are not three buttons for two
   * choices; the scrim and hardware Back still close it.
   */
  readonly showClose?: boolean;
}

export function Sheet({
  testID,
  title,
  closeLabel,
  onClose,
  display = 'comfort',
  body,
  children,
  showClose = true,
}: SheetProps) {
  const t = tokens(display);
  return (
    <View
      testID={testID}
      accessibilityViewIsModal
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
        backgroundColor: t.color.scrim,
      }}
    >
      <Pressable
        testID={testID + '-scrim'}
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        onPress={onClose}
        style={{ flex: 1, minHeight: t.touchTarget, minWidth: t.touchTarget }}
      />
      <View
        testID={testID + '-panel'}
        style={{
          maxHeight: SHEET_MAX_HEIGHT,
          paddingHorizontal: t.space.gutter,
          paddingTop: t.space.md,
          paddingBottom: t.space.sm,
          borderTopLeftRadius: t.radius.xl,
          borderTopRightRadius: t.radius.xl,
          backgroundColor: t.color.surface,
          elevation: t.elevation.sheet,
        }}
      >
        <Text
          testID={testID + '-title'}
          accessibilityRole="header"
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            paddingHorizontal: t.space.xs,
            fontFamily: t.font.bold,
            fontSize: t.type.heading,
            lineHeight: t.leading(t.type.heading),
            color: t.color.ink,
          }}
        >
          {title}
        </Text>
        {body === undefined ? null : (
          <Text
            testID={testID + '-body'}
            {...t.bodyText}
            style={{
              paddingHorizontal: t.space.xs,
              marginTop: t.space.xs,
              fontFamily: t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leadingUncapped(t.type.body),
              color: t.color.inkMuted,
            }}
          >
            {body}
          </Text>
        )}
        <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {showClose ? (
          <PrimaryButton
            testID={testID + '-close'}
            label={closeLabel}
            onPress={onClose}
            display={display}
            variant="ghost"
            size="md"
          />
        ) : null}
      </View>
    </View>
  );
}

/**
 * ONE ROW OF A SHEET'S LIST: a word that goes somewhere. A full-width target at
 * the list height, with the ripple, the word, and the chevron that says it
 * leads on. The accessible name is the visible word (WCAG 2.5.3).
 */
export function SheetRow({
  testID,
  label,
  onPress,
  display = 'comfort',
  leading,
}: {
  readonly testID: string;
  readonly label: string;
  readonly onPress: () => void;
  readonly display?: DisplayMode;
  readonly leading?: ReactNode;
}) {
  const t = tokens(display);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: t.color.border }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: t.control.lg,
        minWidth: t.touchTarget,
        marginTop: t.space.sm,
        paddingHorizontal: t.space.gutter,
        borderRadius: t.radius.lg,
        borderWidth: t.edgeWidth,
        borderColor: t.color.border,
        backgroundColor: t.color.surface,
      }}
    >
      {leading === undefined ? null : <View style={{ marginRight: t.space.gutter }}>{leading}</View>}
      <Text
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          flex: 1,
          fontFamily: t.font.bold,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** What the session hands a Today face while "Exit the app?" is up. */
export interface ExitPrompt {
  readonly onStay: () => void;
  readonly onExit: () => void;
}

/**
 * "EXIT THE APP?" - TWO EQUAL ANSWERS (M2-approved, FLOWS "Hardware Back from
 * Today"). Back from Today used to finish the activity with no question, and
 * it is the easiest accident in the app. Neither answer is the primary: Stay
 * and Exit are the same tonal button, so the sheet nudges neither way (no
 * confirm-shaming), and the body says nothing is lost either way - which is
 * true, because every entry is already on the phone.
 */
export function ExitSheet({
  id,
  s,
  prompt,
  display = 'comfort',
}: {
  readonly id: string;
  readonly s: Strings;
  readonly prompt: ExitPrompt;
  readonly display?: DisplayMode;
}) {
  return (
    <Sheet
      testID={id + '-exit'}
      title={s('exit.title')}
      body={s('exit.body')}
      closeLabel={s('exit.stay')}
      onClose={prompt.onStay}
      display={display}
      showClose={false}
    >
      <PrimaryButton
        testID={id + '-exit-stay'}
        label={s('exit.stay')}
        onPress={prompt.onStay}
        display={display}
        variant="tonal"
        size="lg"
      />
      <PrimaryButton
        testID={id + '-exit-exit'}
        label={s('exit.exit')}
        onPress={prompt.onExit}
        display={display}
        variant="tonal"
        size="lg"
      />
    </Sheet>
  );
}
