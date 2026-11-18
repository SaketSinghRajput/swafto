/**
 * THE STATE SET (DESIGN-SYSTEM-V2 3.12): loading, error, empty and locked, each
 * drawn once, each with its next step. `Shell` draws the first three for every
 * screen; a list or a card that has its own empty or locked moment draws them
 * from here, so no screen invents a fifth way to say "nothing yet".
 *
 * OFFLINE AND STALE ARE NOT PAGE STATES. Offline is the sync chip (always
 * visible, never red) and stale is a warning `Banner` with "Close it now";
 * neither replaces the page, because the page still works.
 *
 * NO SPINNER, NO SHIMMER. Loading is three static skeleton rows, hidden from
 * assistive technology, under a container that carries the loading word and
 * `busy`. A looping animation is GPU work on a budget handset, and a spinner on
 * a screen that opens in well under a second is a flicker that reads as fault.
 */
import { View, Text } from '@swafto/ui';
import { Icon, type IconName } from '../ui/Icon.tsx';
import { Banner } from './Banner.tsx';
import { PrimaryButton } from './Button.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';

/** How many placeholder rows a loading screen draws. */
export const SKELETON_ROWS = 3;

export function LoadingState({
  testID,
  label,
  display = 'comfort',
}: {
  readonly testID: string;
  /** The existing loading word, `common.loading` - spoken, not drawn. */
  readonly label: string;
  readonly display?: DisplayMode;
}) {
  const t = tokens(display);
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={{ flex: 1, backgroundColor: t.color.bg, padding: t.space.gutter }}
    >
      <View testID="loading-skeleton" importantForAccessibility="no-hide-descendants">
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <View
            key={i}
            testID="loading-skeleton-row"
            style={{
              height: t.control.xl,
              marginBottom: t.space.sm,
              borderRadius: t.radius.md,
              backgroundColor: t.color.border,
            }}
          />
        ))}
      </View>
      {/*
        THE WORD IS DRAWN AS WELL AS SPOKEN. A screen of grey bars and nothing
        else is indistinguishable from a broken one, and "every case renders
        SOME text" exists to catch exactly that.
      */}
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
        {label}
      </Text>
    </View>
  );
}

/**
 * THE CALM ERROR. The copy says nothing was lost, because on an offline-first
 * ledger that is both true and the only thing he wants to know - a bare
 * "something went wrong" invites him to type the whole day again. Not red:
 * the load refused nothing.
 */
export function ErrorState({
  id,
  text,
  retryLabel,
  onRetry,
  display = 'comfort',
}: {
  readonly id: string;
  readonly text: string;
  readonly retryLabel: string;
  readonly onRetry: () => void;
  readonly display?: DisplayMode;
}) {
  const t = tokens(display);
  return (
    <View
      testID={id + '-error'}
      accessibilityLabel={text + ' ' + retryLabel}
      style={{ flex: 1, backgroundColor: t.color.bg, paddingVertical: t.space.md }}
    >
      <Banner testID={id + '-error-banner'} kind="error" text={text} display={display} />
      <PrimaryButton
        testID={id + '-retry'}
        label={retryLabel}
        onPress={onRetry}
        display={display}
        size="lg"
      />
    </View>
  );
}

/**
 * NEVER "NOTHING HERE" ALONE. A disc and one sentence say what is empty; the
 * button, when the caller has one, names the action that fills it.
 */
export function EmptyState({
  testID,
  text,
  display = 'comfort',
  icon = 'info',
  action,
}: {
  readonly testID: string;
  readonly text: string;
  readonly display?: DisplayMode;
  readonly icon?: IconName;
  readonly action?: { readonly testID: string; readonly label: string; readonly onPress: () => void };
}) {
  const t = tokens(display);
  return (
    /*
     * `testID` NAMES THE SENTENCE, the container is `testID-box`. Every screen
     * test reads the empty copy as `text(byTestId(tree, 'x-empty'))`, and the
     * icon glyph sitting in the same node would have joined it.
     */
    <View
      testID={testID + '-box'}
      style={{ flexGrow: 1, padding: t.space.lg, alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        style={{
          width: t.disc.md,
          height: t.disc.md,
          marginBottom: t.space.sm,
          borderRadius: t.radius.pill,
          backgroundColor: t.color.tintMore,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size="md" color="inkMore" display={display} />
      </View>
      <Text
        testID={testID}
        {...t.bodyText}
        style={{
          fontFamily: t.font.regular,
          fontSize: t.type.body,
          lineHeight: t.leadingUncapped(t.type.body),
          color: t.color.inkMuted,
          textAlign: 'center',
        }}
      >
        {text}
      </Text>
      {action === undefined ? null : (
        <PrimaryButton
          testID={action.testID}
          label={action.label}
          onPress={action.onPress}
          display={display}
          size="lg"
        />
      )}
    </View>
  );
}

/**
 * LOCKED, WITH THE REASON. A lock mark and one line of why ("After the cash
 * check"), in the disabled ink. Used where a step, a tile or a whole closed day
 * cannot be acted on: never silent, never only grey.
 */
export function LockedLine({
  testID,
  text,
  display = 'comfort',
}: {
  readonly testID: string;
  readonly text: string;
  readonly display?: DisplayMode;
}) {
  const t = tokens(display);
  return (
    <View
      testID={testID}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: t.space.xs }}
    >
      <View style={{ marginRight: t.space.sm }}>
        <Icon name="lock" size="sm" color="inkMuted" display={display} />
      </View>
      <Text
        {...t.bodyText}
        style={{
          flex: 1,
          fontFamily: t.font.regular,
          fontSize: t.type.body,
          lineHeight: t.leadingUncapped(t.type.body),
          color: t.color.inkMuted,
        }}
      >
        {text}
      </Text>
    </View>
  );
}
