/**
 * THE TEXT-SIZE PICKER (DESIGN-SYSTEM-V2 3.15): Normal, Large, Extra large, with
 * a live preview drawn by the REAL components at the chosen step.
 *
 * WHY A PICKER WHEN ANDROID HAS A FONT-SIZE SETTING. The system setting lives
 * three menus deep in a phone the shopkeeper did not set up, and it grows every
 * app at once. This one is in the app, in his language, and grows the BOOK -
 * words and figures - while the header and buttons stay where his thumb learned
 * them (the chrome cap still holds; tokens.ts says how).
 *
 * THE PREVIEW IS NOT A PICTURE OF MONEY, IT IS MONEY. It renders `<Money>` at
 * the chosen step, so the figure he approves is the figure the app will draw -
 * tabular, Latin digits, Indian grouping, ADR-018 unchanged.
 *
 * STATELESS. The choice is the caller's (the session holds and persists it);
 * this reports a tap and draws what it is given.
 */
import { View, Text } from '@swafto/ui';
import type { Paise } from '@swafto/formula-engine';
import { Segmented } from './Shell.tsx';
import { Money } from './Money.tsx';
import { tokens, TEXT_SIZES, type TextSize, type Mode as DisplayMode } from '../theme/tokens.ts';
import type { Strings, StringKey } from '../i18n/strings.ts';

const LABEL: Readonly<Record<TextSize, StringKey>> = {
  normal: 'textSize.normal',
  large: 'textSize.large',
  xlarge: 'textSize.xlarge',
};

export interface TextSizePickerProps {
  readonly testID: string;
  readonly s: Strings;
  readonly value: TextSize;
  readonly onChange: (size: TextSize) => void;
  readonly display?: DisplayMode;
  /** The preview figure. A sample, never one of his - the caller passes a constant. */
  readonly sample: Paise;
}

export function TextSizePicker({ testID, s, value, onChange, display = 'comfort', sample }: TextSizePickerProps) {
  const t = tokens(display);
  // The preview's own tokens, at the step being chosen rather than the one in force.
  const p = tokens(display, value);
  return (
    <View testID={testID}>
      <Text
        testID={testID + '-title'}
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          paddingHorizontal: t.space.md,
          paddingTop: t.space.md,
          fontFamily: t.font.bold,
          fontSize: t.type.label,
          lineHeight: t.leading(t.type.label),
          color: t.color.inkMuted,
        }}
      >
        {s('textSize.title')}
      </Text>
      <Segmented
        testID={testID + '-options'}
        options={TEXT_SIZES.map((key) => ({ key, label: s(LABEL[key]) }))}
        value={value}
        onChange={onChange}
        display={display}
      />
      <View
        testID={testID + '-preview'}
        style={{
          marginHorizontal: t.space.gutter,
          marginTop: t.space.sm,
          padding: t.space.gutter,
          borderRadius: t.radius.lg,
          borderWidth: t.edgeWidth,
          borderColor: t.color.edge,
          backgroundColor: t.color.surface,
        }}
      >
        <Text
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            fontFamily: t.font.medium,
            fontSize: t.type.label,
            lineHeight: t.leading(t.type.label),
            color: t.color.inkMuted,
          }}
        >
          {s('textSize.preview')}
        </Text>
        <Text
          testID={testID + '-preview-label'}
          {...p.bodyText}
          style={{
            fontFamily: p.font.medium,
            fontSize: p.type.body,
            lineHeight: p.leadingUncapped(p.type.body),
            color: p.color.ink,
          }}
        >
          {s('box.sales')}
        </Text>
        <Money testID={testID + '-preview-amount'} amount={sample} mode={display} size="figure" textSize={value} />
      </View>
      <Text
        testID={testID + '-hint'}
        {...t.bodyText}
        style={{
          paddingHorizontal: t.space.md,
          paddingTop: t.space.sm,
          fontFamily: t.font.regular,
          fontSize: t.type.body,
          lineHeight: t.leadingUncapped(t.type.body),
          color: t.color.inkMuted,
        }}
      >
        {s('textSize.hint')}
      </Text>
    </View>
  );
}
