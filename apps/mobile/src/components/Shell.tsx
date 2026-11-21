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
import { View, Text, Pressable, ScrollView } from '@swafto/ui';
import type { ReactNode } from 'react';
import type { Paise } from '@swafto/formula-engine';
import { Money } from './Money.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import type { Strings, StringKey } from '../i18n/strings.ts';
import { fill } from './DayParts.tsx';
import { Icon, type IconName } from '../ui/Icon.tsx';
import { LoadingState, ErrorState, EmptyState } from './States.tsx';
import { PrimaryButton } from './Button.tsx';

/*
 * The buttons moved to `Button.tsx` so the state set and the sheet can draw one
 * without importing the frame (v2, M3). Re-exported, so every screen's import
 * from here is unchanged.
 */
export { PrimaryButton, type PrimaryButtonProps, type ButtonVariant } from './Button.tsx';

export type LoadStatus = 'loading' | 'error' | 'ready';

export interface ShellProps {
  /** Becomes the testID root, so `t1`, `t1-empty`, `t1-error` are predictable. */
  readonly id: string;
  readonly s: Strings;
  readonly display?: DisplayMode;
  readonly status?: LoadStatus;
  readonly titleKey: StringKey;
  /** The one figure this screen is about, shown beside the title. */
  /**
   * The one figure this screen is about.
   *
   * `inline` puts it in the title row at reading size instead of giving it the
   * canvas. An ENTRY screen needs it: there, the hero is the amount being typed,
   * and a second hero above it costs about 160dp of the vertical budget the
   * keypad needs - which `check:layout` measures and refuses. A screen has one
   * hero or it has none.
   */
  readonly headline?: {
    readonly labelKey: StringKey;
    readonly amount: Paise;
    readonly inline?: boolean;
  };
  /** True when there is genuinely nothing yet - derived by the screen, never guessed. */
  readonly empty?: boolean;
  readonly emptyKey?: StringKey;
  /**
   * V2 3.12: NEVER "NOTHING HERE" ALONE. The action that fills an empty screen,
   * drawn under its sentence. Optional only because some empties have no
   * honest next step on this screen (Reports before a close).
   */
  readonly emptyAction?: { readonly testID: string; readonly label: string; readonly onPress: () => void };
  readonly onRetry?: () => void;
  /**
   * WHERE BACK GOES, AND WHY IT IS A PROP RATHER THAN A FLAG.
   *
   * On the device build no screen had a visible way back: every one was left by
   * the hardware key, and on an entry form that key exited the app. A boolean
   * would make the frame guess the destination; the screen knows it, so the
   * screen passes it. Absent means this screen is a root and has no back - a
   * different thing from having one that does nothing.
   *
   * `| undefined` is explicit because the project runs
   * `exactOptionalPropertyTypes`. A screen that may or may not have a parent -
   * an entry form reached from either Today or the day-close list - computes
   * one value and passes it; without this it would have to branch on the JSX
   * instead, which is how two slightly different Shells get rendered.
   */
  readonly onBack?: (() => void) | undefined;
  /** Shown in the canvas opposite the title: a date, a state word, a count. */
  readonly meta?: string | undefined;
  /**
   * THE REFERENCE'S TWO-LINE CANVAS. `eyebrow` sits above the title (the shop
   * name on Today), `subtitle` under it (the date on Today, the shop on the day
   * close list, "Before the first sale" on opening cash). Both are plain words
   * the screen derived; neither is a figure.
   */
  readonly eyebrow?: string | undefined;
  readonly subtitle?: string | undefined;
  /** One word of day state in an outlined pill opposite the title - OPEN, CLOSED. */
  readonly pill?: string | undefined;
  /**
   * Rendered at the top of the scrolling body, in BOTH the empty and the loaded
   * state - which is the whole reason it is not just the first child.
   *
   * An entry form's running total lives here. In the header it was chrome, and
   * chrome on a keypad screen is measured against the fold: that one line was
   * the entire remaining B31 overflow on all four forms. In the body it costs
   * nothing, because the body flexes and scrolls - and it reads better, since a
   * total belongs with the lines it totals rather than up in the title bar.
   */
  readonly bodyHeader?: ReactNode;
  readonly children?: ReactNode;
  /** Rendered below the scrolling body: a keypad, action buttons, a total bar. */
  readonly footer?: ReactNode;
  /**
   * The bottom navigation, below everything, on the screens that have one.
   *
   * A SEPARATE SLOT FROM `footer`, AND THAT IS THE POINT. §B.6 forbids a keypad
   * beside a bottom navigation, and the frame deliberately does not decide
   * whether a screen has a keypad - that stays visible in each screen's own
   * source because the pair has been specified wrongly before. Giving the nav
   * its own slot keeps the same property: a screen that passes both `nav` and a
   * keypad in `footer` is doing something obviously wrong at its own call site,
   * where a reader and a reviewer can see it, rather than in here.
   */
  readonly nav?: ReactNode;
  /**
   * An in-tree layer over the whole screen: the party picker, and E5's discard
   * confirmation when it is built.
   *
   * LAST CHILD, POSITIONED BY THE OVERLAY ITSELF - not a `Modal`. A Modal
   * portals out of the React tree, and both `check:layout` and the contact
   * sheet render registry cases standalone against react-native-web, so a
   * Modal would measure nothing and photograph an empty screen. Two of the four
   * instruments would go blind on exactly the control that unblocks half the
   * app. Keeping it in the tree costs nothing and keeps it inspectable.
   */
  readonly overlay?: ReactNode;
  /**
   * `band`: the brand fill as a thin strip and nothing in it - the title is the
   * SCREEN's, drawn in the cream body as its first heading. The reference draws
   * the opening scenes this way (A2, A6, A8: a navy status band, the question on
   * the page), and the device showed A2's "Choose your language" sat in the bar
   * instead. Additive and opt-in: the default `full` bar is every T/P/S screen.
   * A screen with a way back keeps the full bar, because the band has no room
   * for the control - so `band` with `onBack` draws `full`.
   */
  readonly bar?: 'full' | 'band';
  /**
   * HT-41: A THREAD KEEPS ITS NEWEST LINE IN VIEW. C1's answers grow downwards,
   * and the body stayed where it was, so the third answer sat below the fold.
   * Opt-in: on every other screen a body that jumps to its end would lose the
   * top of the page.
   */
  readonly followEnd?: boolean;
  /**
   * USABILITY item 2: CONTROLS THAT DO NOT SCROLL AWAY. Drawn between the bar
   * and the scrolling body, so they are where the thumb left them every time
   * the screen comes back. Today puts its four everyday tiles here: the scroll
   * position used to reset on every return from a form, and every sale paid
   * for it with a swipe.
   */
  readonly pinned?: ReactNode;
  /**
   * USABILITY item 8: WHAT IS SAFE, ON EVERY SCREEN THAT HOLDS THE BOOK. A chip
   * in the bar, never mid-page grey text. Absent draws nothing.
   */
  readonly sync?: SyncState | undefined;
}

/** What the outbox holds, as the chip says it. Derived by the caller on render. */
export interface SyncState {
  /** Things he typed that the server has not taken yet. */
  readonly waiting: number;
  /** Rows the server refused (FE-11) - parked, and said so. */
  readonly parked: number;
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
  emptyAction,
  onRetry = () => {},
  onBack,
  meta,
  eyebrow,
  subtitle,
  pill,
  bodyHeader,
  children,
  footer,
  nav,
  overlay,
  bar = 'full',
  followEnd = false,
  pinned,
  sync,
}: ShellProps) {
  const t = tokens(display);
  // No hooks (test/render.tsx): a callback ref, fresh each render, is enough to reach the body.
  let body: { scrollToEnd(o?: { animated?: boolean }): void } | null = null;
  const follow = followEnd
    ? {
        ref: (r: typeof body) => {
          body = r;
        },
        onContentSizeChange: () => body?.scrollToEnd({ animated: true }),
      }
    : {};
  const band = bar === 'band' && onBack === undefined;

  /*
   * V2 3.12: LOADING IS THREE STATIC SKELETON ROWS, NOT A SPINNER - no looping
   * animation anywhere, and the loading word is the spoken name of the
   * container rather than a line of grey text.
   */
  if (status === 'loading') {
    return <LoadingState testID={id + '-loading'} label={s('common.loading')} display={display} />;
  }

  /*
   * The copy says nothing was lost, because on an offline-first ledger that is
   * both true and the only thing he wants to know. A bare "something went
   * wrong" invites him to type the whole day again. V2 draws it as the CALM
   * banner - card colour, `edge` rim, the alert mark - and not red: a load
   * that failed refused nothing.
   */
  if (status === 'error') {
    return (
      <ErrorState
        id={id}
        text={s('common.error')}
        retryLabel={s('common.retry')}
        onRetry={onRetry}
        display={display}
      />
    );
  }

  return (
    <View testID={id} style={{ flex: 1, backgroundColor: t.color.bg }}>
      {/*
        V2 3.13: WHILE AN OVERLAY IS UP, THE SCREEN UNDER IT IS NOT READ. The
        sheet sets accessibilityViewIsModal; Android also needs the siblings
        marked, or TalkBack walks straight past the sheet into the page.
      */}
      <View
        style={{ flex: 1 }}
        importantForAccessibility={overlay === undefined || overlay === null ? 'auto' : 'no-hide-descendants'}
      >
      {/*
        A FILLED BAR, NOT A HAIRLINE UNDER PLAIN TEXT.

        The frame drew the title on the same ground as the body with a one-pixel
        rule beneath it, so every screen read as one undifferentiated column and
        the eye had nothing to anchor on. §9 gives `brand` as a fill for exactly
        this, and the bar now carries the page rather than labelling it.

        THE HEADLINE FIGURE KEEPS ITS OWN COLOURS. Money inside the header bar
        cannot use `ink`, which is near-black in comfort mode and would vanish -
        so the figure renders `onHeader` through the Money component's own
        `onFill="header"`, and so does every word in the bar. The pair is
        measured in tokens.spec.tsx (T27) rather than eyeballed here.
      */}
      <View
        testID={band ? id + '-band' : undefined}
        style={{
          /*
           * A CANVAS, NOT A TITLE ROW - AND THAT IS THE LAYOUT BUG AS WELL AS
           * THE LOOK.
           *
           * The bar was `row` + `space-between` + `flexWrap`. With a two-line
           * headline block on the right, wrapping dropped the title to the
           * BOTTOM of that block, so the screen's name and its figure sat on
           * different baselines - visible on every device capture and
           * invisible to every check, because nothing here measures layout.
           *
           * A column removes the competition instead of tuning it. The title
           * keeps its own line and the figure gets the width it needs, which is
           * what a figure uncapped by design was always going to demand.
           */
          flexDirection: 'column',
          // md, not sm. The canvas is the one place in the product that should
          // feel like it has room; the tightest vertical budget is the FOOTER on
          // an entry screen, and the keypad arithmetic that forced sm lives
          // there, not here.
          paddingHorizontal: t.space.md,
          paddingTop: t.space.sm,
          // The canvas gets room only when it is carrying a hero figure. On an
          // entry screen every dp below the header is keypad.
          paddingBottom: headline && headline.inline !== true ? t.space.md : t.space.sm,
          // v2: the header has its own token. In Comfort it is the brand teal;
          // in Focus it is the card colour, because Focus `brand` is a light
          // teal now and a light bar would glare in the dark mode.
          backgroundColor: t.color.header,
          minHeight: t.control.lg,
          borderBottomLeftRadius: t.radius.xl,
          borderBottomRightRadius: t.radius.xl,
          /*
           * A RULE AS WELL AS A FILL, BECAUSE OF FOCUS MODE.
           *
           * §9 sets `brand` to `#0E1521` in focus - the same value as
           * `surface-ground`. So in dark the filled bar is the same colour as the
           * body behind it and the elevation shadow it relies on is invisible
           * against a near-black page: the header simply disappears, which the
           * comfort-mode screenshot would never have shown.
           *
           * `borderStrong` is the token for this and only this. It is barred from
           * enclosing a control because it sits under the 3:1 gate, and separating
           * two regions is the job it is kept for.
           */
          borderBottomWidth: t.hairline,
          borderBottomColor: t.color.borderStrong,
        }}
      >
        {/*
          ROW ONE: the way out, the name of the screen, and one word of state.

          `flexWrap` is gone from this row on purpose. It is the wrapping that put
          the title on a different baseline from the figure, and with the figure
          moved to its own line below there is nothing left here to wrap AGAINST -
          the title simply takes the room between back and meta and grows
          downwards if the system font scale demands it.
        */}
        {band ? null : (
        <>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            /*
             * WRAPPING IS BACK, AND IT IS NOT THE BUG IT WAS.
             *
             * Money is uncapped by design, so a lakh figure beside a long Odia
             * label is genuinely wider than the screen at a large system scale -
             * and without wrapping it simply runs off the side, which
             * `check:layout` measures and refuses.
             *
             * What made wrapping a bug before was the thing wrapping: a TWO-LINE
             * headline block, which dropped the title to its bottom and put the
             * two on different baselines. The inline figure is one line now, so
             * sharing the row keeps the baselines together, and taking its own
             * line when it cannot fit is the correct behaviour rather than the
             * failure it used to be.
             */
            flexWrap: 'wrap',
          }}
        >
          {onBack === undefined ? null : (
            <Pressable
              testID={id + '-back'}
              accessibilityRole="button"
              accessibilityLabel={s('common.back')}
              onPress={onBack}
              android_ripple={{ color: t.color.brandPressed }}
              style={{
                minHeight: t.control.md,
                minWidth: t.control.md,
                marginRight: t.space.sm,
                /*
                 * NO NEGATIVE MARGIN. It was `-t.space.sm`, to pull the back
                 * target's generous padding back to the canvas's optical edge -
                 * a standard trick, and here it simply put the control eight
                 * pixels outside its own container on EVERY screen that has a
                 * back button. `check:layout` reported it the moment the
                 * settings family landed and gave it something to measure.
                 *
                 * The optical nicety is not worth a control that overhangs its
                 * header, least of all the one control that is the way out.
                 */
                borderRadius: t.radius.md,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/*
                A CHEVRON, AS THE REFERENCE DRAWS IT, AND NOT THE WORD. The word
                "Back" took a third of a 360dp bar in Odia at the chrome cap. The
                mark is two borders of a square turned 45 degrees - no glyph from
                the font and no vector library - and the accessible name is still
                the word, so a screen reader loses nothing.
              */}
              <View testID={id + '-back-mark'}>
                {/* v2: the `back` glyph from the icon font, replacing the two-border chevron. */}
                <Icon name="back" size="lg" color="onHeader" display={display} />
              </View>
            </Pressable>
          )}
          {/*
            THE TITLE IS A BARE `Text` UNLESS IT HAS LINES ABOVE OR BELOW IT.
            Wrapped in a View, react-native-web gives the wrapper `minWidth: 0`
            and an inline headline beside it squeezed an Odia title to a column
            a few glyphs wide: check:layout measured T11's keypad 212px below
            the fold the first time the wrapper existed. A bare flex Text keeps
            its longest word as its floor, which is what every screen without
            an eyebrow or subtitle has always had.
          */}
          {(eyebrow === undefined || eyebrow === '') &&
          (subtitle === undefined || subtitle === '') ? (
            <Text
              testID={id + '-title'}
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                // The title owns the row. Before, it competed with the figure for
                // width and lost; now the figure is not in this row at all.
                flex: 1,
                fontFamily: t.font.bold,
                fontSize: t.type.heading,
                lineHeight: t.leading(t.type.heading),
                color: t.color.onHeader,
              }}
            >
              {s(titleKey)}
            </Text>
          ) : (
            <View style={{ flex: 1 }}>
              {eyebrow === undefined || eyebrow === '' ? null : (
                <Text
                  testID={id + '-eyebrow'}
                  maxFontSizeMultiplier={t.maxFontScale}
                  style={{
                    fontFamily: t.font.medium,
                    fontSize: t.type.label,
                    lineHeight: t.leading(t.type.label),
                    color: t.color.onHeader,
                  }}
                >
                  {eyebrow}
                </Text>
              )}
              <Text
                testID={id + '-title'}
                maxFontSizeMultiplier={t.maxFontScale}
                style={{
                  fontFamily: t.font.bold,
                  fontSize: t.type.heading,
                  lineHeight: t.leading(t.type.heading),
                  color: t.color.onHeader,
                }}
              >
                {s(titleKey)}
              </Text>
              {subtitle === undefined || subtitle === '' ? null : (
                <Text
                  testID={id + '-subtitle'}
                  maxFontSizeMultiplier={t.maxFontScale}
                  style={{
                    fontFamily: t.font.regular,
                    fontSize: t.type.label,
                    lineHeight: t.leading(t.type.label),
                    color: t.color.onHeader,
                  }}
                >
                  {subtitle}
                </Text>
              )}
            </View>
          )}
          {/*
            THE INLINE FIGURE - a running total, not a hero.

            One line, right of the title, at reading size. It still goes through
            `Money`, because ADR-018 admits no exception: tabular digits, Latin
            numerals in every language, and the sign rendered rather than implied
            are properties of every rupee figure in this product, including the
            small ones. A bare `<Text>` here would be the first crack in that.
          */}
          {headline?.inline === true ? (
            <View
              style={{
                // ONE LINE, not a stacked block. Stacked, the label and the
                // figure together stood taller than the title and set the height
                // of the whole row - about 50dp of header on a screen whose
                // keypad was already below the fold.
                flexDirection: 'row',
                alignItems: 'center',
                flexShrink: 1,
                marginLeft: t.space.sm,
              }}
            >
              {/* USABILITY U-69: "Should be" touched its figure at 2.0x - a full step between them. */}
              <Text
                maxFontSizeMultiplier={t.maxFontScale}
                style={{
                  flexShrink: 1,
                  marginRight: t.space.sm,
                  fontFamily: t.font.regular,
                  fontSize: t.type.label,
                  lineHeight: t.leading(t.type.label),
                  color: t.color.onHeader,
                  textAlign: 'right',
                }}
              >
                {s(headline.labelKey)}
              </Text>
              <Money
                testID={id + '-headline'}
                amount={headline.amount}
                mode={display}
                size="body"
                onFill="header"
              />
            </View>
          ) : null}
          {meta === undefined ? null : (
            <Text
              testID={id + '-meta'}
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                marginLeft: t.space.sm,
                fontFamily: t.font.regular,
                fontSize: t.type.label,
                lineHeight: t.leading(t.type.label),
                color: t.color.onHeader,
                textAlign: 'right',
              }}
            >
              {meta}
            </Text>
          )}
          {pill === undefined ? null : (
            <View
              testID={id + '-pill'}
              style={{
                marginLeft: t.space.sm,
                paddingHorizontal: t.space.md,
                paddingVertical: t.space.xs,
                borderRadius: t.radius.pill,
                // onHeader on header: the pill is an outline of the bar's own ink.
                borderWidth: t.edgeWidth,
                borderColor: t.color.onHeader,
              }}
            >
              <Text
                maxFontSizeMultiplier={t.maxFontScale}
                style={{
                  fontFamily: t.font.bold,
                  fontSize: t.type.label,
                  lineHeight: t.leading(t.type.label),
                  color: t.color.onHeader,
                }}
              >
                {pill}
              </Text>
            </View>
          )}
        </View>

        {/*
          ROW TWO: the one figure this screen is about.

          Left-aligned under the title rather than tucked into the corner. It is
          the thing the shopkeeper opened the app to see, and on the device build
          it was a 19sp number sharing a cramped strip with the screen name. Here
          it gets the canvas, which is what the brand fill was always for.
        */}
        {headline && headline.inline !== true ? (
          <View style={{ marginTop: t.space.sm }}>
            <Text
              testID={id + '-headline-label'}
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: t.font.regular,
                fontSize: t.type.label,
                lineHeight: t.leading(t.type.label),
                color: t.color.onHeader,
              }}
            >
              {s(headline.labelKey)}
            </Text>
            <Money
              testID={id + '-headline'}
              amount={headline.amount}
              mode={display}
              size="hero"
              onFill="header"
            />
          </View>
        ) : null}
        {sync === undefined ? null : <SyncChip id={id} s={s} sync={sync} display={display} />}
        </>
        )}
      </View>
      {pinned === undefined || pinned === null ? null : (
        <View testID={id + '-pinned'} style={{ backgroundColor: t.color.bg }}>
          {pinned}
        </View>
      )}

      {/*
        `contentContainerStyle` WITH `flexGrow`, AND IT IS THE FIX FOR THE VOID.

        The body was a plain ScrollView, so short content sat pinned to the top
        and the footer sat pinned to the bottom with the rest of the screen blank
        - about three-fifths of the device capture was empty cream with nothing
        to look at. Growing the content container to fill lets a screen place
        itself in the space it actually has, and lets the empty state sit in the
        middle of the page rather than at the top of it, where a one-line
        sentence under a header reads as an error rather than as a calm "nothing
        yet".
      */}
      <ScrollView
        testID={id + '-body'}
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ flexGrow: 1 }}
        // HT-50: without this the first tap on a body button (S9 Add to list,
        // P2 Save number) only closed the keyboard and saved nothing. The
        // footer already had it, which is why C1's Ask took one tap.
        keyboardShouldPersistTaps="handled"
        {...follow}
      >
        {bodyHeader}
        {empty ? (
          <EmptyState
            testID={id + '-empty'}
            text={s(emptyKey ?? 'common.empty')}
            display={display}
            {...(emptyAction === undefined ? {} : { action: emptyAction })}
          />
        ) : (
          children
        )}
      </ScrollView>

      {/*
        HT-34: A FOOTER TALLER THAN THE SCREEN SCROLLS instead of being cut off.
        At font 2.0 with the offline notice, A3's keypad rows and Send code fell
        below the bottom edge with nothing to scroll. It takes its own height
        first (the body is flex 1 from zero) and shrinks only when it must.
      */}
      {footer ? (
        <ScrollView
          testID={id + '-footer'}
          style={{ flexGrow: 0, flexShrink: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {footer}
        </ScrollView>
      ) : null}
      {nav}
      </View>
      {overlay}
    </View>
  );
}

/**
 * THE SYNC CHIP - "Saved", or "3 waiting · safe on phone". NEVER RED.
 *
 * It was a grey caption in the middle of Today, the same grey for "the server
 * has it" and "only this phone has it" (USABILITY item 8, U-72). For a man who
 * has lost a paper book, the second is the state he needs to see, and it is
 * not an error: the entry is on the phone and goes when the network comes back.
 *
 * v2 (DESIGN-SYSTEM-V2 3.2 and section 4): a pill with an icon AND words.
 *
 *   saved    `saved` mark, "Saved", `ink` on `surface`, `edge` rim
 *   waiting  `clock` mark, "{n} waiting · safe on phone", `warning` on
 *            `tintGold`, `warning` rim (T39, N11)
 *   parked   `alert` mark, the parked words, same calm colours as waiting
 *
 * Never `negative`, which in this product means "refused". The spoken name
 * carries the whole sentence; the visible words wrap, never truncate, and the
 * width limit is a percentage string because numeric widths are design values.
 */
export function SyncChip({
  id,
  s,
  sync,
  display = 'comfort',
}: {
  readonly id: string;
  readonly s: Strings;
  readonly sync: SyncState;
  readonly display?: DisplayMode;
}) {
  const t = tokens(display);
  const waiting = sync.waiting > 0;
  const parkedOnly = !waiting && sync.parked > 0;
  const calm = waiting || sync.parked > 0;
  const parked = sync.parked > 0 ? ' · ' + fill(s('t1.parked'), { n: sync.parked }) : '';
  const words = (waiting ? fill(s('sync.waiting'), { n: sync.waiting }) : s('sync.saved')) + parked;
  const spoken = (waiting ? fill(s('sync.waitingLong'), { n: sync.waiting }) : s('sync.savedLong')) + parked;
  const mark: IconName = waiting ? 'clock' : parkedOnly ? 'alert' : 'saved';
  return (
    <View
      testID={id + '-sync'}
      accessible
      accessibilityLabel={spoken}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        maxWidth: '100%',
        marginTop: t.space.xs,
        paddingHorizontal: t.space.gutter,
        paddingVertical: t.space.xs,
        borderRadius: t.radius.pill,
        borderWidth: t.edgeWidth,
        borderColor: calm ? t.color.warning : t.color.edge,
        backgroundColor: calm ? t.color.tintGold : t.color.surface,
      }}
    >
      <View testID={id + '-sync-mark'} style={{ marginRight: t.space.sm }}>
        <Icon name={mark} size="sm" color={calm ? 'warning' : 'ink'} display={display} />
      </View>
      <Text
        testID={id + '-sync-text'}
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          flexShrink: 1,
          fontFamily: t.font.medium,
          fontSize: t.type.label,
          lineHeight: t.leading(t.type.label),
          color: calm ? t.color.warning : t.color.ink,
        }}
      >
        {words}
      </Text>
    </View>
  );
}

export interface CardProps {
  readonly testID?: string;
  readonly display?: DisplayMode;
  /**
   * A heading above the rows. Optional, because a card holding the one figure a
   * screen is about does not need to be told what it is - but a list of
   * customers sitting above a list of suppliers does, and without it the two
   * read as one list with a rule in the middle.
   */
  readonly title?: string;
  readonly children?: ReactNode;
}

/**
 * A GROUP OF ROWS, LIFTED OFF THE GROUND.
 *
 * Every screen drew its rows straight onto the page separated by hairlines, so a
 * day-close list read as one undifferentiated column of thirty lines and nothing
 * told the eye where one group ended. Warm paper underneath, white card on top.
 *
 * v2: FLAT, WITH A RIM. No elevation (only the sheet casts depth now); the card
 * is held by the white/warm step and a `border` rim at `edgeWidth`, radius `lg`.
 * The rim is decorative under SC 1.4.11 - a card is not a control - which is
 * the V2 1.2 judgement call, recorded there.
 *
 * `overflow: hidden` IS LOAD-BEARING. Row draws a full-width bottom rule, and
 * without the clip the last one paints straight through the rounded corner.
 */
export function Card({ testID, display = 'comfort', title, children }: CardProps) {
  const t = tokens(display);
  return (
    <View
      testID={testID}
      style={{
        marginHorizontal: t.space.gutter,
        marginTop: t.space.gutter,
        borderRadius: t.radius.lg,
        borderWidth: t.edgeWidth,
        borderColor: t.color.border,
        backgroundColor: t.color.surface,
        elevation: t.elevation.card,
        overflow: 'hidden',
      }}
    >
      {title === undefined ? null : (
        <Text
          testID={testID === undefined ? undefined : testID + '-title'}
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            paddingHorizontal: t.space.md,
            paddingTop: t.space.md,
            paddingBottom: t.space.sm,
            fontFamily: t.font.bold,
            fontSize: t.type.label,
            lineHeight: t.leading(t.type.label),
            color: t.color.inkMuted,
          }}
        >
          {title}
        </Text>
      )}
      {children}
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
  /**
   * A money-OUT line, and `amount` is its magnitude. Drawn negative whatever
   * the size, zero included: "Cash you took +₹0.00" read as money in. See Money.
   */
  readonly out?: boolean;
  readonly onPress?: () => void;
  /**
   * WCAG 4.1.2: what a reader says for a pressable row, when the label alone
   * would be the same on several rows - "Ramesh, owes ₹450.00". It must
   * CONTAIN the label (2.5.3), so a voice user saying the visible words still
   * reaches it; absent, the label is used.
   */
  readonly accessibleLabel?: string;
  /** Cancel this entry: the original, struck through and kept - never hidden (D1). */
  readonly struck?: boolean;
  /** A word after the label that is NOT struck - "cancelled" - so the reason reads cleanly. */
  readonly note?: string;
}

/**
 * One line of the ledger: a label that wraps and a figure that does not truncate.
 *
 * THE LABEL WRAPS RATHER THAN ELIDING. A truncated customer name on a credit line
 * is the one field where guessing who it was costs somebody money, and Odia names
 * are long.
 *
 * v2 (3.5): `control.lg` tall, the same as `LinkRow` - two row heights side by
 * side read as two kinds of thing when they are one. A tappable row gets the
 * trailing `chevron` in `inkMuted`, the non-colour cue that it leads on.
 */
export function Row({
  testID,
  label,
  amount,
  display = 'comfort',
  directional = false,
  out = false,
  onPress,
  accessibleLabel,
  struck = false,
  note,
}: RowProps) {
  const t = tokens(display);

  const body = (
    <>
      {/* Body copy: it grows to the reader's own setting (item 9); only chrome stops at the cap. */}
      <Text
        {...t.bodyText}
        style={{
          flex: 1,
          flexWrap: 'wrap',
          marginRight: t.space.sm,
          fontFamily: t.font.regular,
          fontSize: t.type.body,
          lineHeight: t.leadingUncapped(t.type.body),
          color: t.color.ink,
          ...(struck ? { textDecorationLine: 'line-through' as const } : {}),
        }}
      >
        {label}
        {note === undefined ? null : (
          <Text
            {...t.bodyText}
            style={{
              fontFamily: t.font.medium,
              fontSize: t.type.body,
              lineHeight: t.leadingUncapped(t.type.body),
              color: t.color.ink,
              textDecorationLine: 'none',
            }}
          >
            {' · ' + note}
          </Text>
        )}
      </Text>
      <Money
        amount={amount}
        mode={display}
        size="body"
        withSign={directional}
        tone={directional ? 'directional' : 'neutral'}
        out={out}
        struck={struck}
      />
      {onPress ? (
        <View style={{ marginLeft: t.space.xs }}>
          <Icon name="chevron" size="md" color="inkMuted" display={display} />
        </View>
      ) : null}
    </>
  );

  const style = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    flexWrap: 'wrap' as const,
    minHeight: t.control.lg,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
    borderBottomWidth: t.hairline,
    borderBottomColor: t.color.border,
  };

  return onPress ? (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibleLabel ?? label}
      onPress={onPress}
      android_ripple={{ color: t.color.border }}
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

export interface LinkRowProps {
  readonly testID: string;
  readonly label: string;
  /** A second line under the label: the current value, or a caution. */
  readonly detail?: string;
  readonly onPress: () => void;
  readonly display?: DisplayMode;
  /**
   * Draw the label in `money-out`. For the one row in the product that destroys
   * data - deleting the account - so it does not read as another preference.
   */
  readonly destructive?: boolean;
  /** v2: an icon in a `tintMore` disc before the words (settings rows). */
  readonly icon?: IconName;
}

/**
 * A ROW THAT GOES SOMEWHERE, as opposed to one that states a figure.
 *
 * `Row` takes `amount: Paise` because every row in the ledger is about money.
 * A settings list is not, and passing it a zero to get the layout would put a
 * rupee figure on screen that means nothing - exactly the sort of number
 * nobody typed that this product refuses elsewhere. So this is a separate
 * component rather than `Row` with an escape hatch.
 *
 * v2: an optional icon disc, the words, and the trailing `chevron`.
 */
export function LinkRow({
  testID,
  label,
  detail,
  onPress,
  display = 'comfort',
  destructive = false,
  icon,
}: LinkRowProps) {
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
        paddingHorizontal: t.space.md,
        paddingVertical: t.space.sm,
        borderBottomWidth: t.hairline,
        borderBottomColor: t.color.border,
      }}
    >
      {icon === undefined ? null : (
        <View
          style={{
            width: t.disc.sm,
            height: t.disc.sm,
            marginRight: t.space.gutter,
            borderRadius: t.radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: destructive ? t.color.tintExpense : t.color.tintMore,
          }}
        >
          <Icon name={icon} size="md" color={destructive ? 'inkExpense' : 'inkMore'} display={display} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            fontFamily: t.font.medium,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: destructive ? t.color.negative : t.color.ink,
          }}
        >
          {label}
        </Text>
        {detail === undefined ? null : (
          <Text
            testID={testID + '-detail'}
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              fontFamily: t.font.regular,
              fontSize: t.type.body,
              lineHeight: t.leading(t.type.body),
              color: t.color.inkMuted,
            }}
          >
            {detail}
          </Text>
        )}
      </View>
      <View style={{ marginLeft: t.space.xs }}>
        <Icon name="chevron" size="md" color="inkMuted" display={display} />
      </View>
    </Pressable>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * THE THREE CONTROLS THE DEVICE BUILD WAS MISSING
 * ══════════════════════════════════════════════════════════════════════════ */

export interface SegmentOption<T extends string> {
  readonly key: T;
  readonly label: string;
}

export interface SegmentedProps<T extends string> {
  readonly testID: string;
  readonly options: readonly SegmentOption<T>[];
  /** `null` means nothing is chosen yet, which is a real state on a fresh form. */
  readonly value: T | null;
  readonly onChange: (key: T) => void;
  readonly display?: DisplayMode;
  /**
   * HOW MANY OPTIONS SHARE A ROW. Three by default, which is what an entry
   * form's footer can afford. Two where the options are PHRASES rather than
   * words: "ନଗଦ ଫେରାଇଲେ" and "UPIରେ ଫେରାଇଲେ" each hold one word wider than a
   * third of the tray at the chrome cap, and a word cannot wrap - it ran 2px
   * out of its segment on CI (T18, Linux run 44348374411) and 7px with the
   * shipped face loaded. Half the tray gives the phrase a line break to use.
   * Only for segments in a scrolling body, where a second row costs nothing.
   */
  readonly columns?: 2 | 3;
}

/**
 * ONE CHOICE OUT OF A FEW - AND THE CONTROL THAT WAS SHOUTING.
 *
 * Cash, UPI and Udhar were three marigold-filled buttons that each both chose a
 * mode AND committed the entry. Choosing is not committing. A segment selects; a
 * button commits.
 *
 * SELECTION IS NOT CARRIED BY COLOUR ALONE. The chosen segment is filled, is set
 * in the bold face, AND carries `accessibilityState.selected` so a screen reader
 * says which one is live.
 *
 * v2 (3.7): a pill tray in `surfaceRaised` with an `edge` rim at `edgeWidth`,
 * and the chosen option a `selected` pill inside it (N7, T28). V2 also draws a
 * tick in the chosen option; it is NOT drawn here, because "Collected" at the
 * chrome cap already has two pixels to spare in a third of 360dp and a 20dp
 * glyph would push it out of its segment. The fill, the weight and the state
 * carry the choice without it.
 */
export function Segmented<T extends string>({
  testID,
  options,
  value,
  onChange,
  display = 'comfort',
  columns = 3,
}: SegmentedProps<T>) {
  const t = tokens(display);
  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        // Three Odia words at the chrome cap do not fit one row on a 360dp
        // screen. They wrap onto a second line rather than being clipped.
        flexWrap: 'wrap',
        // xs, not sm. A segment sits in the footer of an entry screen, which is
        // the tightest vertical budget in the product.
        marginHorizontal: t.space.sm,
        marginVertical: t.space.xs,
        /*
         * NO PADDING ON THE TRAY, AND IT IS NOT AESTHETIC. "Collected" is a
         * single English word with no break opportunity, and at the chrome cap
         * it is about two pixels wider than a third of a 360dp screen - every
         * pixel has to come from the chrome.
         */
        /*
         * LIVE DEMO S4-1: HALF A CHIP'S FLOOR, NOT `pill`. A pill radius is
         * clamped to half the tray's height, so a tray that wraps to two rows
         * (five expense modes, five return settlements, three Odia words at the
         * cap) curved in further than a one-row chip, and the chosen chip in a
         * corner stuck out through the edge (A36: j2-18, j2-26). A chip is at
         * least `touchTarget` tall and a pill itself, so a tray radius of half
         * that holds any chip in any corner - and on one row it is the same
         * rounded end as before.
         */
        borderRadius: t.touchTarget / 2,
        backgroundColor: t.color.surfaceRaised,
        borderWidth: t.edgeWidth,
        borderColor: t.color.edge,
      }}
    >
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            testID={testID + '-' + o.key}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(o.key)}
            android_ripple={{ color: t.color.border }}
            style={{
              flexBasis: columns === 2 ? '45%' : '30%',
              flexGrow: 1,
              /*
               * The touch-target floor, not `control.lg`. The segment sits in
               * every entry form's footer, which is measured against the fold;
               * its eight pixels went to the Sales body, where the running
               * total has to stay in view under two Odia links at font 2.0
               * (CI, Linux run 44348374411). 56dp is the same floor the keypad
               * keys stand on.
               */
              minHeight: t.touchTarget,
              minWidth: t.touchTarget,
              paddingHorizontal: t.space.xs,
              borderRadius: t.radius.pill,
              // Unselected sets NO fill, so the contrast walker resolves the
              // tray behind it - the pair that actually renders.
              backgroundColor: selected ? t.color.selected : undefined,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: selected ? t.font.bold : t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: selected ? t.color.onSelected : t.color.ink,
                textAlign: 'center',
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Which way the money runs. Kept for the callers that still describe a section by it. */
export type MoneyDirection = 'in' | 'out';

/**
 * v2 (3.3): WHICH ACTION A TILE IS, and so which tint, ink and pictogram it
 * wears. Hue is decoration only - no tint means good or bad - and the word on
 * the face is always the truth. `more` is the neutral tint for the weekly jobs.
 */
export type TileKind = 'sale' | 'udhar' | 'collect' | 'expense' | 'more';

const TILE = {
  sale: { fill: 'brand', word: 'onBrand', ink: 'inkSale', icon: 'sale' },
  udhar: { fill: 'tintUdhar', word: 'ink', ink: 'inkUdhar', icon: 'udhar' },
  collect: { fill: 'tintCollect', word: 'ink', ink: 'inkCollect', icon: 'collect' },
  expense: { fill: 'tintExpense', word: 'ink', ink: 'inkExpense', icon: 'expense' },
  more: { fill: 'tintMore', word: 'ink', ink: 'inkMore', icon: 'more' },
} as const;

export interface ActionTileProps {
  readonly testID: string;
  /** The words on the face: short, because the tile is small. */
  readonly label: string;
  /**
   * What a screen reader says, when that differs from the face.
   *
   * The tile says "Pay" because that is what fits at arm's length; a reader
   * should hear "Paid to suppliers", which names the ledger row this opens.
   * When it is absent the face is used, so a tile never announces nothing.
   */
  readonly accessibleLabel?: string;
  readonly kind: TileKind;
  /** The pictogram, where it is not the kind's own (Purchase and Pay under More). */
  readonly icon?: IconName;
  readonly onPress: () => void;
  readonly display?: DisplayMode;
  /**
   * E2: on a closed day a rail is disabled WITH A VISIBLE LINE, never silently
   * inert. A tile that looks live and does nothing teaches the shopkeeper that
   * the app is broken, on exactly the day he most needs to trust it.
   */
  readonly disabled?: boolean;
  /**
   * USABILITY item 1: THE EVERYDAY FOUR ARE THE LARGEST THING ON TODAY. v2 sets
   * them at `lead`, bold, at `control.xl`; the weekly ones stay at body size.
   */
  readonly large?: boolean;
}

/**
 * WCAG 2.5.3, LABEL IN NAME: the accessible name CONTAINS the words on the face.
 * The tile said "Sale" and announced "Cash sales"; a voice-control user saying
 * the word he can see matched nothing (USABILITY W5). Now the face comes first
 * and the longer section name follows only when it adds something.
 */
export const nameWithLabel = (label: string, longer: string | undefined): string =>
  longer === undefined || longer === '' || longer.includes(label) ? (longer ?? label) : label + ', ' + longer;

/**
 * ONE OF THE THINGS THIS APP IS FOR.
 *
 * v2 "Mitra" (3.3): a tile is a tinted card holding a white disc with the
 * action's pictogram, then the word. Sale is the one solid tile - the `brand`
 * fill with an `onBrand` word - because it is the job done forty times a day.
 * Udhar, Collect and Expense wear their own tints; the weekly jobs wear `more`.
 * Two across (`across` is gone: three-up was measured failing at the cap).
 *
 * THE TINT IS DECORATION AND THE WORD IS THE TRUTH. A reader who cannot tell
 * the tints apart loses nothing: the pictogram and the word say what it is.
 *
 * HT-27, STILL: A DISABLED TILE DOES NOT LOOK LIKE A LIVE ONE. The disabled
 * vocabulary - `surfaceRaised`, `inkMuted`, a decorative `border` rim (never
 * the `edge` or `inkMuted` a live control uses) - and the disc's pictogram
 * becomes `lock`, plus the page-level line that says why.
 */
export function ActionTile({
  testID,
  label,
  accessibleLabel,
  kind,
  icon,
  onPress,
  display = 'comfort',
  disabled = false,
  large = false,
}: ActionTileProps) {
  const t = tokens(display);
  const k = TILE[kind];
  const size = large ? t.type.lead : t.type.body;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={nameWithLabel(label, accessibleLabel)}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={disabled ? undefined : { color: kind === 'sale' ? t.color.brandPressed : t.color.border }}
      style={{
        /*
         * TWO ACROSS, decided by measurement rather than by taste: three tiles
         * on a 360dp screen leave about 112dp each, and "Purchase" at 1.5x is
         * wider than that. `flexGrow` fills the last row.
         */
        flexBasis: '45%',
        flexGrow: 1,
        flexDirection: 'row',
        /*
         * THE WORD MAY DROP BELOW THE DISC. With the shipped face actually
         * loaded (check:layout, 2026-11-20) "Expense" at `lead` and "Purchase"
         * at body, both at the chrome cap in the longest-string case, are 7-9px
         * wider than the room beside a 40dp disc in a half-width tile, and an
         * English word has no break opportunity. Wrapping lets the word take
         * its own line under the pictogram, at the full width of the tile, only
         * when it does not fit beside it - at ordinary sizes nothing moves.
         */
        flexWrap: 'wrap',
        alignItems: 'center',
        minHeight: large ? t.control.xl : t.control.md,
        minWidth: t.touchTarget,
        margin: t.space.xs,
        // xs, not V2's gutter: "Expense" in the longest-string case at the cap
        // ran 12px out of its half-width tile with the disc beside it. Every
        // pixel of a tile's width is the word's (check:layout, M3).
        paddingHorizontal: t.space.xs,
        paddingVertical: t.space.xs,
        borderRadius: t.radius.lg,
        backgroundColor: disabled ? t.color.surfaceRaised : t.color[k.fill],
        elevation: 0,
        borderWidth: disabled ? t.edgeWidth : 0,
        borderColor: disabled ? t.color.border : undefined,
      }}
    >
      {/*
        THE DISC IS `sm` ON EVERY TILE - a measured deviation from V2 3.3, which
        draws `md` on the large four. With `md` the word had 8dp less, and an
        English word has no break opportunity at the chrome cap.
      */}
      <View
        style={{
          width: t.disc.sm,
          height: t.disc.sm,
          marginRight: t.space.xs,
          borderRadius: t.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.color.surface,
        }}
      >
        <Icon
          name={disabled ? 'lock' : (icon ?? k.icon)}
          size={large ? 'lg' : 'md'}
          color={disabled ? 'inkMuted' : k.ink}
          display={display}
        />
      </View>
      {/*
        USABILITY item 10: THE LABEL WRAPS, IT IS NEVER CUT. `flexShrink` lets a
        two-word Odia or Hindi label take a second line inside the tile; the tile
        has a minimum height and no fixed one, so the second line is drawn.
      */}
      <Text
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          // `auto`, not 0: the word's own width decides whether it fits beside
          // the disc or wraps beneath it (see `flexWrap` on the tile).
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 'auto',
          fontFamily: t.font.bold,
          fontSize: size,
          lineHeight: t.leading(size),
          color: disabled ? t.color.inkMuted : t.color[k.word],
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export interface ActionGridProps {
  readonly testID?: string;
  readonly display?: DisplayMode;
  readonly children?: ReactNode;
}

/**
 * The row the tiles wrap inside. It exists so that "they wrap" is decided once
 * rather than by each screen that happens to show a set of them.
 */
export function ActionGrid({ testID, display = 'comfort', children }: ActionGridProps) {
  const t = tokens(display);
  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        // No horizontal padding: the tiles carry their own `xs` margin, and
        // every pixel of width is a pixel an Odia word at the cap may need.
        paddingVertical: t.space.xs,
      }}
    >
      {children}
    </View>
  );
}

/**
 * THE THREE PLACES A SHOPKEEPER CAN BE - AND IT IS THREE BECAUSE C-5 SAYS SO.
 *
 * SPEC-DIGEST C-5: *"Three tabs, then: Today · Parties · Reports."* A fourth
 * "More" tab was drawn for an earlier redesign before C-5 was read. It is not
 * here. Settings, Ask and Privacy are rows at the foot of Today (M2, Saket).
 */
export type TabKey = 'today' | 'parties' | 'reports';

const TABS: readonly { readonly key: TabKey; readonly labelKey: StringKey; readonly icon: IconName }[] = [
  { key: 'today', labelKey: 'nav.today', icon: 'box' },
  { key: 'parties', labelKey: 'nav.parties', icon: 'udhar' },
  { key: 'reports', labelKey: 'nav.reports', icon: 'reports' },
];

export interface BottomNavProps {
  readonly active: TabKey;
  readonly onSelect: (key: TabKey) => void;
  readonly s: Strings;
  readonly display?: DisplayMode;
  readonly testID?: string;
}

/**
 * THE THING WHOSE ABSENCE WAS THE REAL "BAD UI".
 *
 * RULE B.6 IS TRUE BY CONSTRUCTION. A keypad is never shown beside a bottom
 * navigation: entry screens REPLACE this bar rather than sitting above it, and
 * each entry screen's own test asserts that no node matches /nav/i.
 *
 * v2 (3.1): the bar's top corners round at `xl` over a `border` rim, and the
 * live tab is a `selected` pill with an `onSelected` bold word and its icon -
 * selection is the fill, the weight, the state and the pictogram, never hue
 * alone. The pictograms sit beside the words; they never replace them.
 */
export function BottomNav({
  active,
  onSelect,
  s,
  display = 'comfort',
  testID = 'bottom-nav',
}: BottomNavProps) {
  const t = tokens(display);
  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        paddingHorizontal: t.space.xs,
        paddingTop: t.space.xs,
        backgroundColor: t.color.surface,
        borderTopWidth: t.edgeWidth,
        borderTopColor: t.color.border,
        borderTopLeftRadius: t.radius.xl,
        borderTopRightRadius: t.radius.xl,
      }}
    >
      {TABS.map((tab) => {
        const on = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            testID={testID + '-' + tab.key}
            accessibilityRole="button"
            accessibilityLabel={s(tab.labelKey)}
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(tab.key)}
            android_ripple={{ color: t.color.border }}
            style={{
              flex: 1,
              minHeight: t.control.lg,
              minWidth: t.touchTarget,
              // Vertical only: the bar's own `xs` padding holds the outer pills
              // off the screen edge, and the 16px the side margins took is the
              // slack "Reports" needs at the cap (see the label below).
              marginVertical: t.space.xs,
              borderRadius: t.radius.lg,
              backgroundColor: on ? t.color.selected : undefined,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={tab.icon} size="md" color={on ? 'onSelected' : 'inkMuted'} display={display} />
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                /*
                 * No horizontal padding of its own: the tab's `xs` margin and
                 * pill already hold it off its neighbour. With the shipped face
                 * actually loaded (check:layout, 2026-11-20), the live "Reports"
                 * in bold at the chrome cap was 113px of text-plus-padding in a
                 * 109px tab - a single English word cannot wrap.
                 */
                fontFamily: on ? t.font.bold : t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: on ? t.color.onSelected : t.color.inkMuted,
                textAlign: 'center',
              }}
            >
              {s(tab.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
