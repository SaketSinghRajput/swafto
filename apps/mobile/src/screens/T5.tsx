/**
 * T5 - THE DAY CLOSE LIST. "Nine rows, three states each, per decision 8."
 *
 * DRAWN TO `docs/design-reference/comfort/T5.png`: a back bar carrying the
 * date and the shop, the ring with "8 of 10 done", one card of section rows,
 * and the next thing to do pinned in the footer.
 *
 * THE THREE STATES ARE THE POINT. Entered, said-to-be-empty, and not-yet-reached.
 * Skipped and untouched produce exactly the same total - zero - and mean
 * completely different things, so each row says which, three ways at once and
 * never by colour alone: a mark (tick, dash, or the section's number in an
 * open circle), a line of words under the name, and - only while unanswered -
 * the one control that answers it.
 *
 * F-12, FIXED BY STRUCTURE. The state word used to be a sibling rendered AFTER
 * the row's bottom rule, so "entered" visually labelled the NEXT section, seven
 * times, and each section cost about 190 logical px. It is now the second line
 * INSIDE the row, above that row's own rule, and a row is one control tall.
 *
 * F-7, GUARDED HERE. `store.skip()` throws on a closed day and `skipSection` has
 * no catch, so on a closed day the skip control is not drawn at all - there is
 * no question left to answer, and a control that would throw is not offered.
 *
 * USABILITY PASS (§4 items 7 and 10). The whole row opens its form; "Nothing
 * today" is a quiet link with a one-tap undo, not the loudest pill on the row;
 * the skipped count is said under the progress; opening cash is drawn as step
 * 1 because it is counted as step 1; and the cash check and the close are
 * visible locked lines with a padlock while they cannot be reached.
 *
 * NO KEYPAD. This is where he checks; the entering happens on the forms.
 */
import { Icon } from '../ui/Icon.tsx';
import { View, Text, Pressable } from '@swafto/ui';
import type { Entry } from '@swafto/formula-engine';
import { cashCheckUnlocked } from '@swafto/formula-engine';
import { Shell, PrimaryButton, type LoadStatus } from '../components/Shell.tsx';
import { Money } from '../components/Money.tsx';
import { ProgressRing, dateLine, fill, progressOf, syncOf } from '../components/DayParts.tsx';
import { UpiCheckCard, AdjustmentsCard } from '../components/DayFacts.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

/** The eight entry sections of the paper sheet, in its order. Section 9 is the count. */
const SECTIONS: readonly Entry['section'][] = [
  'cash_sales',
  'upi_sales',
  'udhar_sales',
  'purchase',
  'expense',
  'udhar_collection',
  'party_payment',
  'withdrawal',
];

export interface DayCloseListProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly onOpenSection?: (section: Entry['section']) => void;
  readonly onSkipSection?: (section: Entry['section']) => void;
  /** USABILITY item 7: the one-tap way back from "Nothing today". */
  readonly onUnskipSection?: (section: Entry['section']) => void;
  /** Step 9 - the cash count. Offered only once all eight are answered. */
  readonly onOpenCashCheck?: () => void;
  /**
   * Decision 3: these UPI receipts arrived - one, or every unticked one. Absent,
   * the UPI card states the check and offers nothing.
   */
  readonly onConfirmUpi?: ((entryIds: readonly string[]) => void) | undefined;
  /** Decision 2: open T19 to add a typed adjustment. */
  readonly onAddAdjustment?: (() => void) | undefined;
  /** F-9: the visible way back. Absent means no back control is drawn. */
  readonly onBack?: (() => void) | undefined;
  readonly onRetry?: () => void;
}

type State = 'entered' | 'skipped' | 'untouched' | 'locked';

/**
 * THE MARK, so the state reads at arm's length without reading a word: a tick
 * on a raised disc, a dash on a raised disc, the section's own number in an
 * open circle - or, for a step that cannot be reached yet, a padlock (USABILITY
 * item 7: the cash check "is a locked state with no lock cue", U-52). Shapes,
 * not colours - the tick is green as well, never only.
 */
function Mark({
  testID,
  state,
  n,
  label,
  display,
  inset = false,
}: {
  readonly testID: string;
  readonly state: State;
  readonly n: number;
  readonly label: string;
  readonly display: DisplayMode;
  /** Carry the row's left inset on the mark itself (a section row - see there). */
  readonly inset?: boolean;
}) {
  const t = tokens(display);
  const open = state === 'untouched';
  const done = state === 'entered';
  /*
   * v2 3.10, THE STEP MARK: done is the `brand` disc with an `onBrand` tick;
   * skipped is the tray colour with an `edge` rim and a dash; locked is the
   * lock; an open step is its number. Each state is a SHAPE as well as a fill,
   * and the row beside it still says it in words - the mark is never the only
   * signal. The marks are icon-font glyphs now, not hand-drawn Views.
   */
  return (
    <View
      testID={testID}
      accessibilityLabel={label}
      style={{
        width: t.disc.sm,
        height: t.disc.sm,
        ...(inset ? { marginLeft: t.space.md } : {}),
        marginRight: t.space.gutter,
        borderRadius: t.radius.pill,
        backgroundColor: done ? t.color.brand : t.color.surfaceRaised,
        borderWidth: done ? 0 : t.edgeWidth,
        borderColor: t.color.edge,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {done ? (
        <Icon name="tick" size="md" color="onBrand" display={display} />
      ) : state === 'skipped' ? (
        <Icon name="dash" size="md" color="inkMuted" display={display} />
      ) : state === 'locked' ? (
        <View testID={testID + '-lock'}>
          <Icon name="lock" size="sm" color="inkMuted" display={display} />
        </View>
      ) : (
        <Text
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            fontFamily: open ? t.font.bold : t.font.medium,
            fontSize: t.type.label,
            lineHeight: t.leading(t.type.label),
            color: t.color.ink,
            fontVariant: ['tabular-nums'],
          }}
        >
          {String(n)}
        </Text>
      )}
    </View>
  );
}

export function DayCloseList({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onOpenSection = () => {},
  onSkipSection = () => {},
  onUnskipSection = () => {},
  onOpenCashCheck = () => {},
  onConfirmUpi,
  onAddAdjustment,
  onBack,
  onRetry = () => {},
}: DayCloseListProps) {
  const t = tokens(display);
  const s = strings(language);

  const closed = store.state.day.state === 'closed';
  const progress = progressOf(store);
  const unlocked = cashCheckUnlocked(store.input);
  const firstUntouched = SECTIONS.find((x) => store.sectionState(x) === 'untouched');
  const skippedCount = SECTIONS.filter((x) => store.sectionState(x) === 'skipped').length;
  const nameOf = (section: Entry['section']) => s(('section.' + section) as StringKey);
  const opening = store.state.day.openingCash;

  const shop = store.state.shopName ?? '';
  const date = dateLine(store.state.day.date, s);

  /*
   * ITEM 9: THE ROW WORDS ARE BODY COPY. They grow to the reader's own text
   * size; the mark, the bar and the pinned button are chrome and stop at the
   * cap. Line height follows: `leadingUncapped` for copy that is not capped.
   */
  const textStyle = (muted: boolean, size: number) =>
    ({
      fontFamily: muted ? t.font.regular : t.font.medium,
      fontSize: size,
      lineHeight: t.leadingUncapped(size),
      color: muted ? t.color.inkMuted : t.color.ink,
    }) as const;

  const subOf = (section: Entry['section'], state: State): string => {
    if (state === 'skipped') return s('state.skipped');
    if (state === 'untouched') return s('state.untouched');
    const n = store.live.filter((e) => e.section === section).length;
    return n === 1 ? s('t5.entry') : fill(s('t5.entries'), { n });
  };

  /*
   * ITEM 7 AND ITEM 10: THE QUIET LINK, AND WHY IT GROWS.
   *
   * "Nothing to enter" was an outlined pill and the loudest control on every
   * row - the one that lets him skip (U-50). It is a link now, in the ghost
   * ink, and it is not a pill for a measured reason: on the device the Hindi
   * pill was sized to its text and drew "दर्ज करने को कुछ" with "नहीं" cut off
   * (U-39, U-40), which says the opposite of the control. The phone's
   * high-contrast text draws wider than it measures, so a box exactly as wide as
   * its words wraps at draw time inside a height measured for one line. Here the
   * link GROWS into the row's free width (`flexGrow`) and the text stretches
   * with it, so there is always room to spare; and with no fixed height, a
   * second line, when one is needed, is drawn.
   */
  const link = (testID: string, label: string, spoken: string, onPress: () => void) => (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={onPress}
      android_ripple={{ color: t.color.brandSoft }}
      style={{
        flexGrow: 1,
        flexShrink: 1,
        minHeight: t.touchTarget,
        minWidth: t.touchTarget,
        paddingHorizontal: t.space.md,
        justifyContent: 'center',
      }}
    >
      <Text
        testID={'t5-label-' + testID.slice('t5-'.length)}
        {...t.bodyText}
        style={{
          fontFamily: t.font.medium,
          fontSize: t.type.label,
          lineHeight: t.leadingUncapped(t.type.label),
          color: t.color.brandSoft,
          textDecorationLine: 'underline',
          textAlign: 'right',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  const lockedRow = (testID: string, markID: string, n: number, title: string, sub: string | null, subID?: string) => (
    <View
      testID={testID}
      accessible
      accessibilityLabel={title + ', ' + s('t5.locked') + (sub === null ? '' : ', ' + sub)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: t.control.lg,
        paddingHorizontal: t.space.md,
        paddingVertical: t.space.xs,
        backgroundColor: t.color.surfaceRaised,
        borderBottomWidth: t.hairline,
        borderBottomColor: t.color.border,
      }}
    >
      <Mark testID={markID} state="locked" n={n} label={s('t5.locked')} display={display} />
      <View style={{ flex: 1 }}>
        <Text {...t.bodyText} style={textStyle(false, t.type.body)}>
          {title}
        </Text>
        {sub === null ? null : (
          <Text testID={subID} {...t.bodyText} style={textStyle(true, t.type.label)}>
            {sub}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <Shell
      id="t5"
      s={s}
      display={display}
      status={status}
      titleKey="t5.title"
      subtitle={shop === '' ? date : date + ' · ' + shop}
      sync={syncOf(store)}
      onBack={onBack}
      onRetry={onRetry}
      footer={
        closed ? undefined : (
          /*
           * THE NEXT THING, PINNED - the reference's footer, and the best part
           * of this screen on the device (U-50). The first section nobody has
           * answered, or the count once all eight are.
           */
          <View
            style={{
              paddingHorizontal: t.space.sm,
              paddingBottom: t.space.sm,
              backgroundColor: t.color.bg,
              borderTopWidth: t.hairline,
              borderTopColor: t.color.border,
            }}
          >
            <PrimaryButton
              testID="t5-next"
              label={
                firstUntouched === undefined
                  ? s('t5.openCheck')
                  : fill(s('t5.next'), { section: nameOf(firstUntouched) })
              }
              display={display}
              size="lg"
              onPress={() =>
                firstUntouched === undefined ? onOpenCashCheck() : onOpenSection(firstUntouched)
              }
            />
          </View>
        )
      }
    >
      {/*
        ITEM 9: THE RING AND ITS WORDS DO NOT COLLIDE AT 2.0x. The words take
        the free width and start at the ring's top, so at a large text size
        they grow downwards beside it rather than pushing it off its line. The
        sync state left this block for the chip in the bar.
      */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingHorizontal: t.space.md,
          paddingTop: t.space.md,
        }}
      >
        <ProgressRing
          testID="t5-ring"
          done={progress.done}
          steps={progress.steps}
          owner={store}
          display={display}
        />
        <View style={{ flex: 1, flexShrink: 1, marginLeft: t.space.md }}>
          <Text
            testID="t5-progress"
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              fontFamily: t.font.bold,
              fontSize: t.type.heading,
              lineHeight: t.leading(t.type.heading),
              color: t.color.ink,
            }}
          >
            {fill(s('t5.done'), { done: progress.done, total: progress.steps })}
          </Text>
          {/* ITEM 7: WHAT THE COUNT INCLUDES - skipped sections are counted, and said. */}
          {skippedCount === 0 ? null : (
            <Text testID="t5-skipped-count" {...t.bodyText} style={textStyle(true, t.type.label)}>
              {fill(s('t5.skippedCount'), { n: skippedCount })}
            </Text>
          )}
        </View>
      </View>

      <View
        testID="t5-list"
        style={{
          // gutter, as every Card under it on this screen: the list and the UPI
          // card no longer start at two different edges, and the lakh figures in
          // the rows get the 8px.
          marginHorizontal: t.space.gutter,
          marginVertical: t.space.md,
          borderRadius: t.radius.lg,
          backgroundColor: t.color.surface,
          borderWidth: t.hairline,
          borderColor: t.color.border,
          elevation: t.elevation.card,
          overflow: 'hidden',
        }}
      >
        {/*
          STEP 1, OPENING CASH - DRAWN, BECAUSE IT IS COUNTED. "2 of 10 done"
          with one tick on the list (U-50) was the opening figure, counted by
          the engine and shown nowhere here. It is a line of the list now, so
          the count and the ticks agree.
        */}
        <View
          testID="t5-opening-row"
          accessible
          accessibilityLabel={s('t6.title') + ', ' + s(opening === null ? 'state.untouched' : 'state.entered')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            minHeight: t.control.lg,
            paddingHorizontal: t.space.md,
            paddingVertical: t.space.xs,
            borderBottomWidth: t.hairline,
            borderBottomColor: t.color.border,
          }}
        >
          <Mark
            testID="t5-mark-opening"
            state={opening === null ? 'untouched' : 'entered'}
            n={1}
            label={s(opening === null ? 'state.untouched' : 'state.entered')}
            display={display}
          />
          <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: '55%' }}>
            <Text {...t.bodyText} style={textStyle(false, t.type.body)}>
              {s('t6.title')}
            </Text>
            <Text testID="t5-opening-state" {...t.bodyText} style={textStyle(true, t.type.label)}>
              {opening === null ? s('state.untouched') : s('t5.openingStep')}
            </Text>
          </View>
          {opening === null ? null : (
            <View style={{ marginLeft: 'auto', paddingLeft: t.space.sm }}>
              <Money testID="t5-opening" amount={opening} mode={display} size="figure" />
            </View>
          )}
        </View>

        {SECTIONS.map((section, i) => {
          const state = store.sectionState(section);
          return (
            <View
              key={section}
              testID={'t5-row-' + section}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                borderBottomWidth: t.hairline,
                borderBottomColor: t.color.border,
              }}
            >
              {/*
                ITEM 7: THE WHOLE ROW OPENS THE FORM - mark, name, state and
                figure are one target. The figure used to sit outside it.
              */}
              <Pressable
                testID={'t5-open-' + section}
                accessibilityRole="button"
                accessibilityLabel={nameOf(section) + ', ' + s(('state.' + state) as StringKey)}
                onPress={() => onOpenSection(section)}
                android_ripple={{ color: t.color.brandSoft }}
                style={{
                  /*
                   * A BASIS, NOT `flex: 1`. With a zero basis a lakh figure at
                   * twice the type took the whole line and crushed the name to
                   * a sliver (check:layout: 7px over in Odia). At 55% the name
                   * keeps its room, and the link beside it wraps underneath
                   * when the two cannot share the line.
                   */
                  flexGrow: 1,
                  flexShrink: 1,
                  flexBasis: '55%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  minHeight: t.control.lg,
                  minWidth: t.touchTarget,
                  /*
                   * NO LEFT PADDING: THE MARK CARRIES THE INSET. When a lakh figure
                   * at 2.0x cannot share the line it wraps to a line of its own,
                   * and that line began 16px in, behind padding that only the mark
                   * needed. In Focus at 2.0 "₹2,49,300.01" ran 3px out of the row on
                   * CI (Linux run 44348374411) and 11px with the shipped face
                   * loaded. The mark sits exactly where it did; the figure's line
                   * now starts at the row's edge and right-aligns as before.
                   */
                  paddingRight: t.space.sm,
                  paddingVertical: t.space.xs,
                }}
              >
                <Mark
                  testID={'t5-mark-' + section}
                  state={state}
                  n={i + 2}
                  label={s(('state.' + state) as StringKey)}
                  display={display}
                  inset
                />
                <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: '50%', marginRight: t.space.sm }}>
                  <Text {...t.bodyText} style={textStyle(false, t.type.body)}>
                    {nameOf(section)}
                  </Text>
                  <Text testID={'t5-state-' + section} {...t.bodyText} style={textStyle(true, t.type.label)}>
                    {subOf(section, state)}
                  </Text>
                </View>
                {state === 'entered' ? (
                  <View style={{ marginLeft: 'auto' }}>
                    <Money
                      testID={'t5-figure-' + section}
                      amount={store.sectionTotal(section)}
                      mode={display}
                      size="figure"
                    />
                  </View>
                ) : null}
              </Pressable>
              {state === 'untouched' && !closed
                ? link(
                    't5-skip-' + section,
                    s('t5.nothingToday'),
                    nameOf(section) + ', ' + s('t5.nothingToday'), // HT-28: eight distinct names
                    () => onSkipSection(section),
                  )
                : null}
              {state === 'skipped' && !closed
                ? link(
                    't5-undo-' + section,
                    s('t5.undo'),
                    nameOf(section) + ', ' + s('t5.undo'),
                    () => onUnskipSection(section),
                  )
                : null}
            </View>
          );
        })}

        {/*
          STEP 10, THE COUNT. Locked until all eight are answered - the engine's
          `cashCheckUnlocked`, not a flag - and on a closed day it is done. A
          locked step is a visible line with a padlock (item 7), not a row that
          only looks like the others.
        */}
        {unlocked && !closed ? (
          <Pressable
            testID="t5-check"
            accessibilityRole="button"
            accessibilityLabel={s('t5.cashCheck')}
            onPress={onOpenCashCheck}
            android_ripple={{ color: t.color.brandSoft }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: t.control.lg,
              minWidth: t.touchTarget,
              paddingHorizontal: t.space.md,
              backgroundColor: t.color.surfaceRaised,
              borderBottomWidth: t.hairline,
              borderBottomColor: t.color.border,
            }}
          >
            <Mark
              testID="t5-mark-check"
              state="untouched"
              n={SECTIONS.length + 2}
              label={s('t5.cashCheck')}
              display={display}
            />
            <View style={{ flex: 1 }}>
              <Text {...t.bodyText} style={textStyle(false, t.type.body)}>
                {s('t5.cashCheck')}
              </Text>
              <Text {...t.bodyText} style={textStyle(true, t.type.label)}>
                {s('t5.countBox')}
              </Text>
            </View>
          </Pressable>
        ) : closed ? (
          <View
            testID="t5-check"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: t.control.lg,
              paddingHorizontal: t.space.md,
              backgroundColor: t.color.surfaceRaised,
            }}
          >
            <Mark
              testID="t5-mark-check"
              state="entered"
              n={SECTIONS.length + 2}
              label={s('t5.cashCheck')}
              display={display}
            />
            <View style={{ flex: 1 }}>
              <Text {...t.bodyText} style={textStyle(false, t.type.body)}>
                {s('t5.cashCheck')}
              </Text>
            </View>
          </View>
        ) : (
          lockedRow(
            't5-check',
            't5-mark-check',
            SECTIONS.length + 2,
            s('t5.cashCheck'),
            firstUntouched === undefined ? null : fill(s('t5.lockLine'), { section: nameOf(firstUntouched) }),
            't5-lock',
          )
        )}
        {/* Closing the day comes after the count, and says so while it cannot be reached. */}
        {closed
          ? null
          : lockedRow('t5-close-row', 't5-mark-close', SECTIONS.length + 3, s('t1.closeDay'), s('t5.closeLocked'))}
      </View>

      {/*
        THE UPI CHECK, BESIDE THE CASH CHECK (decision 3). A second equation, so
        a second card - never a line inside the cash working (D2). Optional to
        do, never optional to show: a day closed without it says "not checked".
      */}
      <UpiCheckCard testID="t5-upi" store={store} s={s} display={display} onConfirm={onConfirmUpi} />
      <AdjustmentsCard testID="t5-adjust" store={store} s={s} display={display} onAdd={onAddAdjustment} />
    </Shell>
  );
}
