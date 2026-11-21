/**
 * T3 - TODAY, ALREADY CLOSED. What he sees at 10pm, and again next morning.
 *
 * THIS IS T1 IN A DIFFERENT STATE, AND IT IS DELIBERATELY THE SAME PAGE - the
 * reference draws T3 as T1 with three things changed, and so does this:
 *
 *   - the pill says CLOSED, and the ring caption says when and what he counted
 *   - the card's action is "See the day summary", outlined rather than marigold,
 *     because nothing is left to do today
 *   - the rails are present and disabled, under the line that says why
 *
 * E2 IS THE WHOLE BEHAVIOUR OF THE SCREEN. The rails are present and disabled,
 * with the reason on the page: "Today is closed. Post a correction instead."
 * Removing them teaches nothing; leaving them live and swallowing the tap
 * teaches that the app is broken. So each rail carries a real `disabled` and a
 * real `accessibilityState`, and the line sits beside them permanently.
 *
 * D7, STRUCTURALLY. Nothing here writes. `onPostCorrection` and `onOpenSummary`
 * hand control to the caller, and the store would refuse a write if they did.
 *
 * EVERY FIGURE IS ASKED FOR ON RENDER, exactly as on T1. A closed day's figures
 * cannot move, which is precisely the argument that would make caching them look
 * safe - and the first cached total is how the second source of truth gets in.
 *
 * NO KEYPAD. Nothing on a frozen day is entered.
 */
import { View, Text } from '@swafto/ui';
import {
  Shell,
  PrimaryButton,
  ActionGrid,
  ActionTile,
  BottomNav,
  type TabKey,
  type LoadStatus,
} from '../components/Shell.tsx';
import { ExitSheet, type ExitPrompt } from '../components/Sheet.tsx';
import {
  ProgressCard,
  OpeningLine,
  SoFarHeader,
  TodayFigures,
  PartyTotals,
  EmptyNote,
  SectionLabel,
  dateLine,
  fill,
  progressOf,
} from '../components/DayParts.tsx';
import { Money } from '../components/Money.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';
import { ACT_SECTIONS } from './actSections.ts';

/**
 * The wall-clock time out of the stored stamp, by string, with no Date object.
 *
 * `new Date(iso)` would resolve against the machine's timezone, so the contact
 * sheet would render a different time on every build agent and the committed
 * screenshot would never match. The stamp is the record; this reads it rather
 * than reinterpreting it.
 *
 * Returns null on anything that is not a timestamp, because a half-parsed time
 * on a frozen day is worse than no time at all.
 */
const timeOf = (stamp: string | undefined): string | null =>
  stamp && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(stamp) ? stamp.slice(11, 16) : null;

export interface TodayClosedProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /** T16. The only way anything about this day changes, and it changes today. */
  readonly onPostCorrection?: () => void;
  /** T14, the day summary. */
  readonly onOpenSummary?: () => void;
  /** P1 IS A TAB AND SO IS THIS: SPEC-DIGEST C-5 rules three destinations. */
  readonly onSelectTab?: (key: TabKey) => void;
  /** M3: "Exit the app?" after a hardware Back; present only while it is up. */
  readonly exitPrompt?: ExitPrompt | undefined;
  readonly onRetry?: () => void;
  /** HT-10: a closed day is most of the evening; Settings and consent stay reachable. */
  readonly onOpenSettings?: () => void;
  readonly onOpenPrivacy?: () => void;
  /** C1, Ask: the closed evening is when "how much did I sell" gets asked. */
  readonly onOpenChat?: () => void;
}

export function TodayClosed({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onPostCorrection = () => {},
  onOpenSummary = () => {},
  onSelectTab = () => {},
  onRetry = () => {},
  onOpenSettings = () => {},
  onOpenPrivacy = () => {},
  onOpenChat = () => {},
  exitPrompt,
}: TodayClosedProps) {
  const t = tokens(display);
  const s = strings(language);

  const entries = store.live;
  const day = store.state.day;
  const closedTime = timeOf(day.closedAt);
  const progress = progressOf(store);

  const quiet = {
    fontFamily: t.font.regular,
    fontSize: t.type.body,
    lineHeight: t.leading(t.type.body),
    color: t.color.inkMuted,
  } as const;

  return (
    <Shell
      id="t3"
      overlay={exitPrompt === undefined ? undefined : <ExitSheet id="t3" s={s} prompt={exitPrompt} display={display} />}
      s={s}
      display={display}
      status={status}
      titleKey="t3.title"
      eyebrow={store.state.shopName}
      subtitle={dateLine(day.date, s)}
      pill={s('t1.pill.closed')}
      onRetry={onRetry}
      nav={<BottomNav active="today" onSelect={onSelectTab} s={s} display={display} />}
    >
      <ProgressCard
        testID="t3-book"
        store={store}
        s={s}
        display={display}
        heading={fill(s('t1.progress'), { done: progress.done, total: progress.steps })}
        caption={
          /*
           * WHEN, from the record's own stamp. The reference reads "Closed ·
           * counted ₹6,050" on one line; at a lakh figure and twice the type
           * that line is wider than the column beside the ring (check:layout
           * measured 4px over), so WHAT he counted takes its own full-width
           * line under the rule. Both are read, neither computed - on a frozen
           * day those are the two facts.
           */
          <Text
            testID={closedTime ? 't3-closed-at' : undefined}
            maxFontSizeMultiplier={t.maxFontScale}
            style={quiet}
          >
            {closedTime ? s('t3.closedAt') + ' ' + closedTime : s('t3.closedAt')}
          </Text>
        }
      >
        {day.countedCash === null ? null : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
            <Text maxFontSizeMultiplier={t.maxFontScale} style={{ ...quiet, marginRight: t.space.xs }}>
              {s('t11.counted')}
            </Text>
            <Money testID="t3-counted" amount={day.countedCash} mode={display} size="body" />
          </View>
        )}
        <OpeningLine testID="t3-opening" store={store} s={s} display={display} />
        <PrimaryButton
          testID="t3-summary"
          label={s('t3.summary')}
          onPress={onOpenSummary}
          display={display}
          variant="tonal"
          size="lg"
        />
      </ProgressCard>

      <SoFarHeader id="t3" store={store} s={s} display={display} />
      {entries.length === 0 ? (
        <EmptyNote testID="t3-empty" text={s('t3.empty')} display={display} />
      ) : (
        <TodayFigures id="t3" store={store} s={s} display={display} />
      )}
      <PartyTotals
        id="t3"
        store={store}
        s={s}
        display={display}
        onPress={() => onSelectTab('parties')}
      />

      <View style={{ paddingHorizontal: t.space.md, paddingTop: t.space.lg }}>
        <SectionLabel testID="t3-add" text={s('t1.addToToday')} display={display} />
        {/*
          THE VISIBLE LINE E2 ASKS FOR, above the rails it is about, with the
          route out directly under it. Not an error - the day is simply
          finished - so it reads in muted ink rather than in `negative`.
        */}
        <Text testID="t3-banner" maxFontSizeMultiplier={t.maxFontScale} style={quiet}>
          {store.closedUnderWrongDate
            ? fill(s('t3.wrongDate.body'), { date: dateLine(day.date, s) })
            : s('t3.banner')}
        </Text>
      </View>
      <PrimaryButton
        testID="t3-correction"
        label={s('t3.correction')}
        onPress={onPostCorrection}
        display={display}
        variant="ghost"
        size="md"
      />
      {/*
        THE SAME SIX TILES AS AN OPEN DAY, VISIBLY OUT OF SERVICE - the same
        component from the same list, so the closed day cannot report a set of
        actions the open day never offered.
      */}
      <View style={{ paddingHorizontal: t.space.sm, paddingBottom: t.space.md }}>
        <ActionGrid testID="t3-rails" display={display}>
          {ACT_SECTIONS.map(({ section, labelKey, kind }) => (
            <ActionTile
              key={section}
              testID={'t3-rail-' + section}
              label={s(labelKey)}
              kind={kind}
              display={display}
              disabled
              /* Unreachable - `disabled` stops the press before it. */
              onPress={() => {}}
            />
          ))}
        </ActionGrid>
      </View>
      {/*
        HT-10: THE SAME TWO LINKS AS T1. Without them a closed day had no way to
        log out, change consent or delete the account until the next morning.
      */}
      <View style={{ paddingVertical: t.space.sm }}>
        <PrimaryButton
          testID="t3-ask"
          label={s('c1.open')}
          display={display}
          variant="tonal"
          size="md"
          onPress={onOpenChat}
        />
        <PrimaryButton
          testID="t3-settings"
          label={s('nav.settings')}
          display={display}
          variant="ghost"
          size="md"
          onPress={onOpenSettings}
        />
        <PrimaryButton
          testID="t3-privacy"
          label={s('t1.privacy')}
          display={display}
          variant="ghost"
          size="md"
          onPress={onOpenPrivacy}
        />
      </View>
    </Shell>
  );
}
