/**
 * THE SCREEN FRAME, AND THE ROW. Two primitives, ten screens.
 *
 * WHY THESE EXIST AT ALL. T7 was built first and inlined both. Building the other
 * nine the same way would produce nine dialects of the same header - the exact
 * drift the token file warns about one level up, where "a component that also
 * decided things" becomes a second place behaviour lives. A screen that renders
 * its own title bar will eventually render it two pixels differently, in one
 * language, on one of them.
 *
 * THE FOUR STATES LIVE HERE, ONCE. Loading, error, empty and loaded are a property
 * of every screen in this product, and empty is the one that gets forgotten - a
 * shop on its first morning sees a blank panel otherwise. Putting them in the
 * frame means a new screen gets all four by existing, and cannot get three.
 *
 * WHAT THE FRAME DELIBERATELY DOES NOT DO. It does not decide whether a screen has
 * a keypad. That is per-screen, it is a §B.6 assertion, and the pair "keypad beside
 * a bottom nav" has been specified wrongly before - so it stays visible in each
 * screen's own source rather than being configured from here.
 */
import { View, Text, Pressable, ScrollView, ActivityIndicator } from '@swafto/ui';
import type { ReactNode } from 'react';
import type { Paise } from '@swafto/formula-engine';
import { Money } from './Money.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import type { Strings, StringKey } from '../i18n/strings.ts';

export type LoadStatus = 'loading' | 'error' | 'ready';

export interface ShellProps {
  /** Becomes the testID root, so `t1`, `t1-empty`, `t1-error` are predictable. */
  readonly id: string;
  readonly s: Strings;
  readonly display?: DisplayMode;
  readonly status?: LoadStatus;
  readonly titleKey: StringKey;
  /** The one figure this screen is about, shown beside the title. */
  readonly headline?: { readonly labelKey: StringKey; readonly amount: Paise };
  /** True when there is genuinely nothing yet - derived by the screen, never guessed. */
  readonly empty?: boolean;
  readonly emptyKey?: StringKey;
  readonly onRetry?: () => void;
  readonly children?: ReactNode;
  /** Rendered below the scrolling body: a keypad, action buttons, a total bar. */
  readonly footer?: ReactNode;
}

export function Shell({
  id,
  s,
  display = 'comfort',
  status = 'ready',
  titleKey,
  headline,
  empty = false,
  emptyKey,
  onRetry = () => {},
  children,
  footer,
}: ShellProps) {
  const t = tokens(display);

  if (status === 'loading') {
    return (
      <View
        testID={id + '-loading'}
        style={{
          flex: 1,
          backgroundColor: t.color.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator accessibilityLabel={s('common.loading')} color={t.color.accent} />
        <Text
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            fontFamily: t.font.regular,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.inkMuted,
            marginTop: t.space.md,
          }}
        >
          {s('common.loading')}
        </Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View
        testID={id + '-error'}
        style={{ flex: 1, backgroundColor: t.color.bg, padding: t.space.md }}
      >
        {/*
          The copy says nothing was lost, because on an offline-first ledger that
          is both true and the only thing he wants to know. A bare "something went
          wrong" invites him to type the whole day again.
        */}
        <Text
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            fontFamily: t.font.regular,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.negative,
          }}
        >
          {s('common.error')}
        </Text>
        <Pressable
          testID={id + '-retry'}
          accessibilityRole="button"
          accessibilityLabel={s('common.retry')}
          onPress={onRetry}
          style={{
            minHeight: t.touchTarget,
            minWidth: t.touchTarget,
            marginTop: t.space.md,
            paddingHorizontal: t.space.md,
            borderRadius: t.radius.md,
            backgroundColor: t.color.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              fontFamily: t.font.medium,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: t.color.onAccent,
            }}
          >
            {s('common.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View testID={id} style={{ flex: 1, backgroundColor: t.color.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          // Money is uncapped by design, so the title and the figure wrap rather
          // than running off the side at a large system font scale.
          flexWrap: 'wrap',
          // sm, not md. At the chrome cap in Focus mode a wrapped title plus a
          // wrapped headline label is already three lines tall, and the sixteen
          // pixels this saves is what keeps the keypad on screen on T8.
          padding: t.space.sm,
          borderBottomWidth: t.hairline,
          borderBottomColor: t.color.border,
        }}
      >
        <Text
          testID={id + '-title'}
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            fontFamily: t.font.bold,
            fontSize: t.type.heading,
            lineHeight: t.leading(t.type.heading),
            color: t.color.ink,
          }}
        >
          {s(titleKey)}
        </Text>
        {headline ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: t.font.regular,
                fontSize: t.type.label,
                lineHeight: t.leading(t.type.label),
                color: t.color.inkMuted,
              }}
            >
              {s(headline.labelKey)}
            </Text>
            <Money testID={id + '-headline'} amount={headline.amount} mode={display} size="figure" />
          </View>
        ) : null}
      </View>

      <ScrollView testID={id + '-body'} style={{ flex: 1, minHeight: 0 }}>
        {empty ? (
          <View testID={id + '-empty'} style={{ padding: t.space.lg, alignItems: 'center' }}>
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.inkMuted,
                textAlign: 'center',
              }}
            >
              {s(emptyKey ?? 'common.empty')}
            </Text>
          </View>
        ) : (
          children
        )}
      </ScrollView>

      {footer}
    </View>
  );
}

export interface RowProps {
  readonly testID: string;
  readonly label: string;
  readonly amount: Paise;
  readonly display?: DisplayMode;
  /** Show the sign and colour by direction - for a figure that can go either way. */
  readonly directional?: boolean;
  readonly onPress?: () => void;
}

/**
 * One line of the ledger: a label that wraps and a figure that does not truncate.
 *
 * THE LABEL WRAPS RATHER THAN ELIDING. A truncated customer name on a credit line
 * is the one field where guessing who it was costs somebody money, and Odia names
 * are long.
 */
export function Row({
  testID,
  label,
  amount,
  display = 'comfort',
  directional = false,
  onPress,
}: RowProps) {
  const t = tokens(display);

  const body = (
    <>
      <Text
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          flex: 1,
          flexWrap: 'wrap',
          marginRight: t.space.sm,
          fontFamily: t.font.regular,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.ink,
        }}
      >
        {label}
      </Text>
      <Money
        amount={amount}
        mode={display}
        size="body"
        withSign={directional}
        tone={directional ? 'directional' : 'neutral'}
      />
    </>
  );

  const style = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    flexWrap: 'wrap' as const,
    minHeight: t.touchTarget,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
    borderBottomWidth: t.hairline,
    borderBottomColor: t.color.border,
  };

  return onPress ? (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ ...style, minWidth: t.touchTarget }}
    >
      {body}
    </Pressable>
  ) : (
    <View testID={testID} style={style}>
      {body}
    </View>
  );
}

export interface PrimaryButtonProps {
  readonly testID: string;
  readonly label: string;
  readonly onPress: () => void;
  readonly display?: DisplayMode;
  /** Disabled is a real state, not a greyed-out button that still reacts. */
  readonly disabled?: boolean;
}

/**
 * The one action a screen is for.
 *
 * FOUR SCREENS INLINED THIS BEFORE IT EXISTED - Today's close, the difference
 * screen's close, and the two confirm buttons. Four copies of one button is the
 * same drift the frame exists to prevent, one control smaller.
 *
 * DISABLED MEANS DISABLED. It carries `disabled` and `accessibilityState` as well
 * as looking different, because a button that looks pressable and then refuses
 * teaches the shopkeeper that the app is broken - and a screen reader that
 * announces it as available teaches nothing at all.
 */
export function PrimaryButton({
  testID,
  label,
  onPress,
  display = 'comfort',
  disabled = false,
}: PrimaryButtonProps) {
  const t = tokens(display);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: t.touchTarget,
        minWidth: t.touchTarget,
        margin: t.space.sm,
        paddingHorizontal: t.space.md,
        borderRadius: t.radius.md,
        backgroundColor: disabled ? t.color.surface : t.color.accent,
        borderWidth: t.hairline,
        borderColor: t.color.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          fontFamily: t.font.medium,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          // Ink on surface when disabled: onAccent is only checked against accent.
          color: disabled ? t.color.inkMuted : t.color.onAccent,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
