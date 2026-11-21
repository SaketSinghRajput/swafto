/**
 * T1 - TODAY. The front door: what he sees when he opens the app.
 *
 * REBUILT FROM THE DEVICE USABILITY PASS (`qa/swafto-retail-desk/USABILITY.md`
 * §4 items 1-3 and 8). The reference-picture layout this replaces put the day
 * close first and the only marigold on it, six figure tiles of equal weight
 * next, and "Sale" more than a screen down - so the job done forty times a day
 * began with a swipe, and the swipe was repeated after every sale because the
 * scroll position reset on return (U-00, U-01, U-10). Top to bottom now:
 *
 *   brand bar      shop name, "Today", the date, the day pill, and the sync
 *                  chip - "Saved" or "N waiting · safe on phone" (item 8)
 *   pinned         the four everyday tiles - Sale, Udhar sale, Collect,
 *                  Expense - large, and OUTSIDE the scrolling body, so they
 *                  are under the thumb every time the screen comes back
 *                  (items 1 and 2: sticky rather than a remembered offset)
 *   in the box     one hero, P3, "In the box now", with its working on one
 *                  line and the day's sales under it; zeros are not drawn
 *                  (item 3)
 *   party totals   udhar to collect | you owe suppliers, zero halves hidden
 *   observation    only when it is true, and phrased as something to look at
 *   today's book   the ring, and "Continue day close" - SECONDARY until the
 *                  shop's closing time, then the one marigold button (item 1)
 *   more           Purchase and Pay, the weekly jobs
 *   nav            Today - Ledger - Reports (C-5)
 *
 * WHAT IS DELIBERATELY NOT COPIED, AND WHY. "Good morning, Rajanikanta": the
 * owner's name is not stored and a greeting by hour would need a clock, so the
 * title is "Today" and the shop name is the eyebrow. The notification bell: Y4
 * does not exist in this build, and a bell that opens nothing is a control that
 * lies, so it is omitted.
 *
 * EVERY FIGURE IS ASKED FOR ON RENDER - `store.primary()`, `dayProgress`,
 * `store.pendingOutbox`, `store.closingDue()`. A Today screen holding a cached
 * total is the exact failure derive-on-read exists to prevent.
 *
 * NO KEYPAD, so the bottom nav is allowed (§B.6 bars only the pair).
 */
import { View } from '@swafto/ui';
import {
  Shell,
  ActionGrid,
  ActionTile,
  BottomNav,
  Card,
  LinkRow,
  PrimaryButton,
  type TabKey,
  type LoadStatus,
} from '../components/Shell.tsx';
import { Banner } from '../components/Banner.tsx';
import { ExitSheet, type ExitPrompt } from '../components/Sheet.tsx';
import {
  ProgressCard,
  Quiet,
  CashInBox,
  PartyTotals,
  Observation,
  CollectToday,
  EmptyNote,
  SectionLabel,
  dateLine,
  fill,
  progressOf,
  syncOf,
} from '../components/DayParts.tsx';
import { cashCheckUnlocked } from '@swafto/formula-engine';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import { DEFAULT_CLOSES_AT, type Store } from '../store/index.ts';
import { ACT_SECTIONS } from './actSections.ts';

export interface TodayProps {
  readonly store: Store;
  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  /** "Continue day close" - secondary until closing time, then the primary action. */
  readonly onCloseDay?: () => void;
  readonly onOpenSection?: (section: string) => void;
  /**
   * The way to the consent screen once the account exists.
   *
   * DPDP §1.2 requires withdrawal to be AS EASY as giving. Giving was one tap
   * on X0 during sign-in; without this there was no way back to that screen at
   * all, so withdrawal was infinitely harder - which is the requirement broken
   * by omission rather than by refusal.
   */
  readonly onOpenPrivacy?: () => void;
  /** C-5: three tabs, Today - Ledger - Reports. Also where the party totals go. */
  readonly onSelectTab?: (key: TabKey) => void;
  /** Settings, for which C-5 leaves no tab - a quiet link at the foot of the page. */
  readonly onOpenSettings?: () => void;
  /** C1, Ask: a question about the shop, one tap from here (FR-8). */
  readonly onOpenChat?: () => void;
  /** R5 FR-5: a customer in "Udhar to collect" was tapped. */
  readonly onOpenParty?: (partyId: string) => void;
  readonly onRetry?: () => void;
  /**
   * When the shop closes, 'HH:MM'. The store holds no closing time (only the
   * day's start), so this defaults to `DEFAULT_CLOSES_AT` - a reversible CTO
   * default, logged where it is defined.
   */
  readonly closesAt?: string;
  /**
   * M3: the phone's Date and time settings, for a book dated ahead of the
   * phone (C-19). Absent - an older binary, a test - and the banner says where
   * to go in words instead of drawing a button that would do nothing.
   */
  readonly onOpenDateSettings?: (() => void) | undefined;
  /**
   * M3 (M2-approved): "Exit the app?" after a hardware Back on Today. Present
   * only while the question is up; the session decides when, Root does the exit.
   */
  readonly exitPrompt?: ExitPrompt | undefined;
  /**
   * RTI-7: ANOTHER PHONE SIGNED IN TO THIS SHOP in the last 72 hours, as the
   * host derived it from the server's device list. `date` is the local
   * 'YYYY-MM-DD' it happened on. Absent draws nothing.
   */
  readonly newPhone?: { readonly id: string; readonly date: string } | undefined;
  /** RTI-7: to Signed-in phones (S14, C-21), where it can be signed out. */
  readonly onOpenDevices?: () => void;
  /** RTI-7: "It was me" - this notice goes, on this phone, for that device. */
  readonly onDismissNewPhone?: () => void;
}

export function Today({
  store,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  onCloseDay = () => {},
  onOpenSection = () => {},
  onOpenPrivacy = () => {},
  onSelectTab = () => {},
  onOpenSettings = () => {},
  onOpenChat = () => {},
  onOpenParty = () => {},
  onRetry = () => {},
  closesAt = DEFAULT_CLOSES_AT,
  onOpenDateSettings,
  exitPrompt,
  newPhone,
  onOpenDevices = () => {},
  onDismissNewPhone = () => {},
}: TodayProps) {
  const t = tokens(display);
  const s = strings(language);

  const entries = store.live;
  const progress = progressOf(store);
  const unlocked = cashCheckUnlocked(store.input);
  // C-17 / C-19: derived on read from the clock, like every other figure here.
  const dayStatus = store.dayStatus();
  // QA-06: no tiles while the book is not today's - a sale cannot be filed under last week by habit.
  const current = dayStatus.kind === 'current';
  // Item 1: the close is the primary action only from the shop's closing time on.
  const closing = store.closingDue(closesAt);

  const tile = (a: (typeof ACT_SECTIONS)[number], large: boolean) => (
    <ActionTile
      key={a.section}
      testID={'t1-act-' + a.section}
      label={s(a.labelKey)}
      /*
       * WCAG 2.5.3: the accessible name CONTAINS the face - "Sale, Cash sales"
       * - so a voice user saying the word he can see reaches the tile, and a
       * screen reader still hears which ledger row it opens.
       */
      accessibleLabel={s(('section.' + a.section) as StringKey)}
      kind={a.kind}
      icon={a.icon}
      display={display}
      large={large}
      onPress={() => onOpenSection(a.section)}
    />
  );

  return (
    <Shell
      id="t1"
      s={s}
      display={display}
      status={status}
      titleKey="t1.title"
      eyebrow={store.state.shopName}
      subtitle={dateLine(store.state.day.date, s)}
      pill={s(unlocked ? 't1.pill.ready' : 't1.pill.open')}
      sync={syncOf(store)}
      onRetry={onRetry}
      /*
       * THE FOUR EVERYDAY TILES, PINNED (items 1 and 2). Two across in both
       * displays: four large words read at arm's length, and two-up is the
       * width every label has been measured to fit at the chrome cap.
       */
      pinned={
        current ? (
          <View style={{ paddingHorizontal: t.space.sm }}>
            <ActionGrid testID="t1-act" display={display}>
              {ACT_SECTIONS.filter((a) => a.tier === 'main').map((a) => tile(a, true))}
            </ActionGrid>
          </View>
        ) : undefined
      }
      nav={<BottomNav active="today" onSelect={onSelectTab} s={s} display={display} />}
      // M3: "Exit the app?" after a hardware Back (Sheet.tsx says why it asks).
      overlay={exitPrompt === undefined ? undefined : <ExitSheet id="t1" s={s} prompt={exitPrompt} display={display} />}
    >
      {/*
        C-17: THE BOOK IS STILL OPEN FOR A DAY THAT HAS ENDED. A calm card, not
        an alarm and not a dialog he can swipe away by accident - it is part of
        the page and stays until he closes the book. Nothing rolls the day over
        or closes it for him (the cash count is his), and the tiles are
        withheld so a sale cannot be filed under last week by habit.
        C-19: a book dated ahead of the phone's clock is explained, not hidden.
      */}
      {/*
        v2: THE THREE DATE NOTICES ARE BANNERS (DESIGN-SYSTEM-V2 3.11), a fill,
        a rim, an icon and words - calm, never red. The stale one keeps its one
        action; nothing closes the book for him, because the cash count is his.
      */}
      {dayStatus.kind === 'stale' ? (
        <Banner
          testID="t1-stale"
          textTestID="t1-stale-body"
          kind="warning"
          icon="stale"
          text={fill(s('t1.stale.body'), { date: dateLine(dayStatus.date, s) })}
          display={display}
          action={{ testID: 't1-stale-close', label: s('t1.stale.action'), onPress: onCloseDay }}
        />
      ) : dayStatus.kind === 'future' ? (
        <Banner
          testID="t1-future"
          textTestID="t1-future-body"
          kind="warning"
          icon="clock"
          text={fill(s('t1.future.body'), { date: dateLine(dayStatus.date, s) })}
          display={display}
          {...(onOpenDateSettings === undefined
            ? { detail: s('t1.future.howTo') }
            : {
                action: {
                  testID: 't1-future-settings',
                  label: s('t1.future.openSettings'),
                  onPress: onOpenDateSettings,
                },
              })}
        />
      ) : store.misdatedDate !== null ? (
        <Banner
          testID="t1-misdated"
          textTestID="t1-misdated-body"
          kind="info"
          text={fill(s('t1.misdated.body'), { date: dateLine(store.misdatedDate, s) })}
          display={display}
        />
      ) : null}

      {/*
        RTI-7: A NEW PHONE SIGNED IN. A fact from the server's own list, said
        once and kept until he answers it: the way to sign it out, or "It was
        me". Warning, not refused - nothing was refused, and a second phone of
        his own is the usual reason. First on the page, because a forwarded
        recovery code is the one thing on Today he cannot afford to scroll past.
      */}
      {newPhone === undefined ? null : (
        <View testID="t1-new-phone">
          <Banner
            testID="t1-new-phone-banner"
            kind="warning"
            icon="alert"
            text={fill(s('t1.newPhone.body'), { date: dateLine(newPhone.date, s) })}
            display={display}
            action={{ testID: 't1-new-phone-open', label: s('s14.title'), onPress: onOpenDevices }}
          />
          <PrimaryButton
            testID="t1-new-phone-dismiss"
            label={s('t1.newPhone.dismiss')}
            onPress={onDismissNewPhone}
            variant="ghost"
            size="md"
            display={display}
          />
        </View>
      )}

      {/* Item 3: the one figure, with its working. */}
      <CashInBox id="t1" store={store} s={s} display={display} />
      {/*
        BEFORE THE FIRST ENTRY, A NOTE THAT SAYS WHERE TO START. Drawn here
        rather than by `Shell`, which would replace the whole body - and the
        first morning is exactly when the rest of the page is needed.
      */}
      {entries.length === 0 ? <EmptyNote testID="t1-empty" text={s('t1.empty')} display={display} /> : null}
      <PartyTotals
        id="t1"
        store={store}
        s={s}
        display={display}
        hideZero
        onPress={() => onSelectTab('parties')}
      />
      <Observation id="t1" store={store} s={s} display={display} />
      <CollectToday id="t1" store={store} s={s} display={display} onOpenParty={onOpenParty} />

      <ProgressCard
        testID="t1-book"
        store={store}
        s={s}
        display={display}
        heading={fill(s('t1.progress'), { done: progress.done, total: progress.steps })}
        caption={
          <Quiet
            testID="t1-book-caption"
            text={s(unlocked ? 't1.checkReady' : 't1.checkPending')}
            display={display}
          />
        }
      >
        {/*
          ITEM 1: TONAL UNTIL CLOSING TIME, MARIGOLD FROM IT. All day the job is
          recording sales, and the one marigold thing on Today was the close -
          done once, at night. Before closing time it is a plain secondary
          button, always there; from closing time (or once the day has ended)
          it becomes the screen's one primary action.
        */}
        <PrimaryButton
          testID="t1-close-day"
          label={s('t1.continueClose')}
          display={display}
          variant={closing ? 'primary' : 'tonal'}
          size="lg"
          onPress={onCloseDay}
        />
      </ProgressCard>

      {/* Item 1: the weekly jobs, under "More" and below the day. */}
      {!current ? null : (
        <>
          <View style={{ paddingHorizontal: t.space.md, paddingTop: t.space.lg }}>
            <SectionLabel testID="t1-more" text={s('t1.more')} display={display} />
          </View>
          <View style={{ paddingHorizontal: t.space.sm }}>
            <ActionGrid testID="t1-more-act" display={display}>
              {ACT_SECTIONS.filter((a) => a.tier === 'more').map((a) => tile(a, false))}
            </ActionGrid>
          </View>
        </>
      )}

      {/*
        THE QUIET LINKS. The reference has no settings or privacy route on
        Today; this build has nowhere else to put them (C-5 leaves no fourth
        tab) and DPDP needs the privacy one reachable. Stacked, because
        "Privacy and what you agreed to" side by side ran 75px off a 360dp
        screen at the chrome cap.
      */}
      {/*
        M2 (Saket): ASK, SETTINGS AND PRIVACY ARE ROWS AT THE FOOT OF TODAY -
        an icon, the words and a chevron, in one card - not three loose links.
        C-5 leaves no fourth tab, and DPDP needs the privacy route reachable.
      */}
      <Card testID="t1-foot" display={display}>
        {/* C1 - a question, not an entry: it opens the Ask screen and writes nothing. */}
        <LinkRow testID="t1-ask" label={s('c1.open')} icon="info" display={display} onPress={onOpenChat} />
        <LinkRow
          testID="t1-privacy"
          label={s('t1.privacy')}
          icon="lock"
          display={display}
          onPress={onOpenPrivacy}
        />
        <LinkRow
          testID="t1-settings"
          label={s('nav.settings')}
          icon="more"
          display={display}
          onPress={onOpenSettings}
        />
      </Card>
      <View style={{ height: t.space.md }} />
    </Shell>
  );
}
