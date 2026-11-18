/**
 * THE PIECES EVERY REPORT SCREEN DRAWS A READING WITH - R1 and M1.
 *
 * Moved here from R1 when M1 needed the same three, so the two screens cannot
 * drift apart in how a count, a note or a gate sentence looks.
 */
import { View, Text } from '@swafto/ui';
import type { Gated } from '@swafto/formula-engine';
import { fill } from './DayParts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { STRINGS, type StringKey, type Strings } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

/** A party's name as he typed it; the id when the party is not on this phone. */
export const partyName = (store: Store, partyId: string): string =>
  store.state.parties.find((p) => p.id === partyId)?.name ?? partyId;

/**
 * A stored difference reason is a string key (T12). One this build does not
 * know is shown as nothing rather than as a raw code - T14's rule.
 */
export const reasonText = (reason: string | undefined, s: Strings): string =>
  reason !== undefined && reason in STRINGS ? ' · ' + s(reason as StringKey) : '';

/**
 * ONE READING: a label that wraps and a value that is a COUNT OR A SHARE, never
 * money. Money goes through `Money` (via `Row`) without exception, and a thing
 * that is not money must not be dressed as a rupee figure - so this is plain
 * `<Text>`, capped like chrome.
 */
export function Reading({
  testID,
  label,
  value,
  display,
}: {
  readonly testID: string;
  readonly label: string;
  readonly value: string;
  readonly display: DisplayMode;
}) {
  const t = tokens(display);
  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        minHeight: t.touchTarget,
        paddingHorizontal: t.space.md,
        paddingVertical: t.space.sm,
        borderBottomWidth: t.hairline,
        borderBottomColor: t.color.border,
      }}
    >
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
      <Text
        testID={testID + '-value'}
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          fontFamily: t.font.medium,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.ink,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/** A sentence on its own line, full width - the gate line, and the notes. */
export function Note({
  testID,
  text,
  display,
}: {
  readonly testID: string;
  readonly text: string;
  readonly display: DisplayMode;
}) {
  const t = tokens(display);
  return (
    <View
      style={{
        paddingHorizontal: t.space.md,
        paddingTop: t.space.sm,
        paddingBottom: t.space.md,
        backgroundColor: t.color.surface,
      }}
    >
      <Text
        testID={testID}
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          fontFamily: t.font.regular,
          fontSize: t.type.label,
          lineHeight: t.leading(t.type.label),
          color: t.color.inkMuted,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

/** A gated reading: its label, then the gate sentence on its own full-width line. */
export function Gate({
  testID,
  label,
  gated,
  s,
  display,
}: {
  readonly testID: string;
  readonly label: string;
  readonly gated: Gated<unknown>;
  readonly s: Strings;
  readonly display: DisplayMode;
}) {
  const t = tokens(display);
  if (gated.available) return null;
  return (
    <View
      testID={testID}
      style={{
        minHeight: t.touchTarget,
        paddingHorizontal: t.space.md,
        paddingVertical: t.space.sm,
        borderBottomWidth: t.hairline,
        borderBottomColor: t.color.border,
      }}
    >
      <Text
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          fontFamily: t.font.regular,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.ink,
        }}
      >
        {label}
      </Text>
      <Text
        testID={testID + '-gate'}
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          fontFamily: t.font.regular,
          fontSize: t.type.label,
          lineHeight: t.leading(t.type.label),
          color: t.color.inkMuted,
        }}
      >
        {/* The engine's own two numbers - nothing is recounted here. */}
        {fill(s('r1.gate'), { need: gated.requiredClosedDays, have: gated.closedDaysSoFar })}
      </Text>
    </View>
  );
}
