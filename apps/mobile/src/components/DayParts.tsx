/**
 * THE PIECES THE TODAY FACES SHARE - T1, T2, T3 and T5 - drawn to the Claude
 * Design reference (`docs/design-reference/comfort/T1.png` and its siblings).
 *
 * WHY A FILE AND NOT FOUR COPIES. The reference draws the same ring, the same
 * "Today's book" card and the same figure tiles on four screens. Four inlined
 * copies are the drift `Shell` exists to prevent, one level down: the first
 * time one of them computes "8 of 10" differently, the shopkeeper sees two
 * progress figures for one day.
 *
 * EVERY FIGURE IS ASKED FOR ON RENDER. Progress is `dayProgress(store.input)`,
 * the six figures are `store.primary()`; nothing here holds a number between
 * renders. The ring's animated value is motion state, not a figure - it is
 * where the arc was last drawn, so the next draw can move rather than jump.
 *
 * NO VECTOR LIBRARY. `react-native-svg` is not in apps/mobile/package.json and
 * an APK rebuild may not add a native module, so the ring is built from Views:
 * a bordered circle for the track and a necklace of overlapping round beads for
 * the arc. Beads, not two rotated half-discs, because `check:layout` measures
 * every element against its parent and a rotated half-disc clipped by
 * `overflow: hidden` still reports itself as running outside its container.
 */
import { View, Text, Pressable, Animated, Easing, AccessibilityInfo, PixelRatio } from '@swafto/ui';
import type { ReactNode } from 'react';
import { dayProgress, daysBetween, subtract, formatPaise, type Paise } from '@swafto/formula-engine';
import { Money } from './Money.tsx';
import { tokens, motionMs, type Mode as DisplayMode } from '../theme/tokens.ts';
import type { Strings, StringKey } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';
import { Icon } from '../ui/Icon.tsx';

/**
 * `{name}` placeholders in a phrase, filled by the screen. Unknown names stay empty.
 *
 * HT-46: a COUNT CHOOSES ITS OWN WORDS. `{n|one|other}` picks the first form for
 * 1 and the second otherwise; `{n|zero|one|other}` adds a form for 0 ("since
 * today", not "0 days"). `#` in a form is the number. The copy owns which
 * languages need the forms - Hindi "1 दिन" and "2 दिन" are the same word.
 */
export const fill = (template: string, values: Readonly<Record<string, string | number>>): string =>
  template
    .replace(/\{(\w+)\|([^{}]*)\}/g, (_, k: string, body: string) => {
      const forms = body.split('|');
      const v = values[k];
      const i = forms.length >= 3 ? (v === 0 ? 0 : v === 1 ? 1 : 2) : v === 1 ? 0 : 1;
      return (forms[i] ?? '').replace(/#/g, String(v ?? ''));
    })
    .replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));

/**
 * "Wednesday 15 July", from the day's own ISO date.
 *
 * `Date.UTC` is a calendar lookup about the STORED date - which weekday it fell
 * on - not a reading of the clock, and it is timezone-free, so the contact sheet
 * renders the same line on every machine. Anything that is not a date renders
 * nothing rather than a half-parsed one.
 */
export function dateLine(iso: string, s: Strings): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  const year = parseInt(m[1] as string, 10);
  const month = parseInt(m[2] as string, 10);
  const day = parseInt(m[3] as string, 10);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (
    s(('t1.day.' + String(weekday)) as StringKey) +
    ' ' +
    String(day) +
    ' ' +
    s(('t1.month.' + String(month)) as StringKey)
  );
}

/* ---- motion ------------------------------------------------------------- */

/**
 * REDUCE MOTION, READ FROM THE PLATFORM. `tokens.css` zeroes every duration
 * under `prefers-reduced-motion`; this is the Android setting that query maps
 * to. Subscribed once, on the first ring drawn, so importing this file in a
 * test or a server render touches nothing.
 */
let reduceMotion = false;
let watching = false;
const watchReduceMotion = (): void => {
  if (watching) return;
  watching = true;
  void AccessibilityInfo.isReduceMotionEnabled().then((on: boolean) => {
    reduceMotion = on;
  });
  AccessibilityInfo.addEventListener('reduceMotionChanged', (on: boolean) => {
    reduceMotion = on;
  });
};

/**
 * Where each ring was last drawn, keyed by the STORE it draws.
 *
 * ponytail: started from render, not from an effect. The test renderer is
 * hook-free by design (test/render.tsx) and every screen here is a plain
 * function of its props, so there is no effect to start an animation from. The
 * key is the Store instance: the app keeps one for the session, so returning to
 * Today after an entry finds the old fraction and animates to the new one; every
 * registry case builds a fresh store, so the contact sheet and check:layout
 * always draw the settled arc and never a frame of motion. Upgrade path: a
 * `useEffect` once the renderer can host hooks.
 */
const drawn = new WeakMap<object, { value: InstanceType<typeof Animated.Value>; at: number }>();

function arcValue(owner: object, target: number, display: DisplayMode) {
  watchReduceMotion();
  const last = drawn.get(owner);
  if (last === undefined) {
    const value = new Animated.Value(target);
    drawn.set(owner, { value, at: target });
    return value;
  }
  if (last.at !== target) {
    const t = tokens(display);
    last.at = target;
    Animated.timing(last.value, {
      toValue: target,
      duration: motionMs('sheet', reduceMotion),
      easing: Easing.bezier(...t.motion.easing),
      useNativeDriver: true,
    }).start();
  }
  return last.value;
}

/**
 * Enough beads that, at the stroke width, neighbours overlap into one line. 48
 * read as a string of pearls on the contact sheet; 72 puts a bead every ~2.8dp
 * on a 72dp ring with an 8dp stroke, which reads as one stroke.
 */
const BEADS = 72;

export interface ProgressRingProps {
  readonly testID: string;
  readonly done: number;
  /** How many steps the day has - ten, from the engine. */
  readonly steps: number;
  /** The store the progress belongs to - see `drawn` above. */
  readonly owner: object;
  readonly display?: DisplayMode;
}

/**
 * THE MARIGOLD RING, "N of 10".
 *
 * The fraction is `done / steps` from the engine, and the number in the middle
 * is `done` itself, so the ring and the words beside it cannot disagree. The
 * arc is marigold because the accent is a FILL - this is the one place on the
 * card it is spent besides the button, exactly as the reference spends it.
 */
export function ProgressRing({ testID, done, steps, owner, display = 'comfort' }: ProgressRingProps) {
  const t = tokens(display);
  const size = t.ring.size;
  const stroke = t.ring.stroke;
  const centre = size / 2;
  const radius = centre - stroke / 2;
  const fraction = steps > 0 ? Math.min(1, Math.max(0, done / steps)) : 0;
  const value = arcValue(owner, fraction, display);

  const beads = Array.from({ length: BEADS }, (_, i) => {
    const angle = (2 * Math.PI * (i + 0.5)) / BEADS;
    return {
      key: i,
      left: centre + radius * Math.sin(angle) - stroke / 2,
      top: centre - radius * Math.cos(angle) - stroke / 2,
      opacity: value.interpolate({
        inputRange: [i / BEADS, (i + 1) / BEADS],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    };
  });

  return (
    <View
      testID={testID}
      accessibilityLabel={String(done) + ' / ' + String(steps)}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius: t.radius.pill,
          borderWidth: stroke,
          borderColor: t.color.border,
        }}
      />
      {beads.map((b) => (
        <Animated.View
          key={b.key}
          style={{
            position: 'absolute',
            top: b.top,
            left: b.left,
            width: stroke,
            height: stroke,
            borderRadius: t.radius.pill,
            backgroundColor: t.color.brand,
            opacity: b.opacity,
          }}
        />
      ))}
      <Text
        testID={testID + '-done'}
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          fontFamily: t.font.bold,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {String(done)}
      </Text>
    </View>
  );
}

/** Progress for the day, from the engine. Opens at 1 of 10 when opening cash exists. */
export const progressOf = (store: Store): { done: number; steps: number } => {
  const p = dayProgress(store.input);
  return { done: p.done, steps: p.total };
};

/* ---- type ---------------------------------------------------------------- */

const label = (display: DisplayMode) => {
  const t = tokens(display);
  return {
    fontFamily: t.font.medium,
    fontSize: t.type.label,
    lineHeight: t.leading(t.type.label),
    color: t.color.inkMuted,
  } as const;
};

/**
 * A small heading - "Today's book", "Today so far", "Add to today". v2 sets no
 * all-caps anywhere (DESIGN-SYSTEM-V2 1.3): capitals are slower to read, and
 * Odia and Hindi have none, so the three languages now look like one design.
 */
export function SectionLabel({
  testID,
  text,
  display = 'comfort',
}: {
  readonly testID?: string;
  readonly text: string;
  readonly display?: DisplayMode;
}) {
  const t = tokens(display);
  return (
    <Text
      testID={testID}
      maxFontSizeMultiplier={t.maxFontScale}
      style={label(display)}
    >
      {text}
    </Text>
  );
}

/** A quiet line of copy inside a card: a caption, a prompt. */
export function Quiet({
  testID,
  text,
  display = 'comfort',
}: {
  readonly testID?: string;
  readonly text: string;
  readonly display?: DisplayMode;
}) {
  const t = tokens(display);
  return (
    <Text
      testID={testID}
      {...t.bodyText}
      style={{
        fontFamily: t.font.regular,
        fontSize: t.type.body,
        lineHeight: t.leadingUncapped(t.type.body),
        color: t.color.inkMuted,
      }}
    >
      {text}
    </Text>
  );
}

/* ---- the card ----------------------------------------------------------- */

export interface ProgressCardProps {
  readonly testID: string;
  readonly store: Store;
  readonly s: Strings;
  readonly display?: DisplayMode;
  /** The bold line beside the ring: "8 of 10", "Not started". */
  readonly heading: string;
  /** The quiet line under it. */
  readonly caption: ReactNode;
  /** Below the rule: the opening-cash line, a prompt, the one button. */
  readonly children?: ReactNode;
}

/**
 * "TODAY'S BOOK" - ring, progress, a rule, and what the day needs next.
 *
 * The primary action lives INSIDE this card, as the reference has it, so the
 * thing to do next sits beside the count of what is left rather than at the
 * foot of the screen under six other buttons.
 */
export function ProgressCard({
  testID,
  store,
  s,
  display = 'comfort',
  heading,
  caption,
  children,
}: ProgressCardProps) {
  const t = tokens(display);
  const progress = progressOf(store);
  return (
    <View
      testID={testID}
      style={{
        marginHorizontal: t.space.md,
        marginTop: t.space.md,
        padding: t.space.md,
        borderRadius: t.radius.lg,
        backgroundColor: t.color.surface,
        borderWidth: t.hairline,
        borderColor: t.color.border,
        elevation: t.elevation.card,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ProgressRing
          testID={testID + '-ring'}
          done={progress.done}
          steps={progress.steps}
          owner={store}
          display={display}
        />
        <View style={{ flex: 1, marginLeft: t.space.md }}>
          <SectionLabel text={s('t2.title')} display={display} />
          <Text
            testID={testID + '-heading'}
            maxFontSizeMultiplier={t.maxFontScale}
            style={{
              fontFamily: t.font.bold,
              fontSize: t.type.heading,
              lineHeight: t.leading(t.type.heading),
              color: t.color.ink,
            }}
          >
            {heading}
          </Text>
          {caption}
        </View>
      </View>
      <View
        style={{
          marginTop: t.space.md,
          paddingTop: t.space.sm,
          borderTopWidth: t.hairline,
          borderTopColor: t.color.border,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * "Opening cash ₹1,500" - or, when the day has none, the words saying so.
 *
 * The reference adds "carried from yesterday's count". That is not said here:
 * the record does not distinguish a carried figure from one typed on T6 this
 * morning, and a sentence claiming where a figure came from has to be true.
 */
export function OpeningLine({
  testID,
  store,
  s,
  display = 'comfort',
}: {
  readonly testID: string;
  readonly store: Store;
  readonly s: Strings;
  readonly display?: DisplayMode;
}) {
  const t = tokens(display);
  const opening = store.state.day.openingCash;
  if (opening === null) {
    return <Quiet testID={testID} text={s('t1.openingMissing')} display={display} />;
  }
  return (
    <View testID={testID} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
      <Text
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          marginRight: t.space.xs,
          fontFamily: t.font.regular,
          fontSize: t.type.body,
          lineHeight: t.leading(t.type.body),
          color: t.color.inkMuted,
        }}
      >
        {s('t6.title')}
      </Text>
      <Money testID={testID + '-amount'} amount={opening} mode={display} size="body" />
    </View>
  );
}

/**
 * USABILITY item 8: WHAT THE SYNC CHIP SAYS, counted the way `syncLine` counts
 * (HT-33: what he typed, and a day-only change is still one thing waiting).
 * Derived from the outbox on every render - never held.
 */
export const syncOf = (store: Store): { readonly waiting: number; readonly parked: number } => {
  const rows = store.pendingOutbox;
  const typed = rows.filter((r) => r.kind !== 'day').length;
  return { waiting: typed > 0 ? typed : rows.length > 0 ? 1 : 0, parked: store.parkedOutbox.length };
};

/** "All saved on phone", or how many writes are still queued for the server. */
export const syncLine = (store: Store, s: Strings): string => {
  /*
   * HT-33: COUNT WHAT HE TYPED. The day row rides along with every entry, so
   * counting rows said 3 for two sales. A day-only change (the opening figure)
   * is still one thing waiting, never "All saved".
   */
  const rows = store.pendingOutbox;
  const typed = rows.filter((r) => r.kind !== 'day').length;
  const pending = typed > 0 ? typed : rows.length > 0 ? 1 : 0;
  const line = pending === 0 ? s('t1.saved') : fill(s('t1.toSync'), { n: pending });
  // FE-11: a refused row is not "waiting" - it is parked and says so, visibly.
  const parked = store.parkedOutbox.length;
  return parked === 0 ? line : line + ' · ' + fill(s('t1.parked'), { n: parked });
};

/** "TODAY SO FAR" on the left, the sync state on the right. */
export function SoFarHeader({
  id,
  store,
  s,
  display = 'comfort',
}: {
  readonly id: string;
  readonly store: Store;
  readonly s: Strings;
  readonly display?: DisplayMode;
}) {
  const t = tokens(display);
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: t.space.md,
        paddingTop: t.space.lg,
      }}
    >
      {/*
        HT-30: THE LABEL OWNS THE FREE SPACE IN THE ROW. Sized to its own
        measured width, Hindi "आज अब तक" at font 2.0 was given a box one word
        too narrow and drew as "आज अब". Grown, the Text is stretched to the
        room the row actually has, and the sync line keeps its own width.
      */}
      <View testID={id + '-so-far-slot'} style={{ flexGrow: 1, flexShrink: 1 }}>
        <SectionLabel testID={id + '-so-far'} text={s('t1.soFar')} display={display} />
      </View>
      <Text
        testID={id + '-sync'}
        maxFontSizeMultiplier={t.maxFontScale}
        style={{
          fontFamily: t.font.regular,
          fontSize: t.type.label,
          lineHeight: t.leading(t.type.label),
          color: t.color.inkMuted,
        }}
      >
        {syncLine(store, s)}
      </Text>
    </View>
  );
}

/* ---- the six figures ---------------------------------------------------- */

/**
 * Whether every figure, as `Money` will print it, fits in a half-width tile at
 * the system font scale - about 11 characters of `figure` type at scale 1.
 *
 * ponytail: a character count, not a measurement. Digits are tabular, so it is
 * close; if a figure still wraps inside a tile on a device, lower the 11.
 */
const HALF_TILE_CHARS = 11;
export const fitsTwoAcross = (amounts: readonly Paise[]): boolean =>
  Math.max(...amounts.map((a) => formatPaise(a, { withSign: true }).length)) *
    PixelRatio.getFontScale() <=
  HALF_TILE_CHARS;

function Tile({
  testID,
  labelText,
  amount,
  display,
  raised = false,
  tone = 'neutral',
  single,
}: {
  readonly testID: string;
  readonly labelText: string;
  readonly amount: Paise;
  readonly display: DisplayMode;
  readonly raised?: boolean;
  readonly tone?: 'neutral' | 'directional';
  readonly single: boolean;
}) {
  const t = tokens(display);
  return (
    <View
      testID={testID + '-tile'}
      style={{
        flexBasis: single ? '100%' : '45%',
        flexGrow: 1,
        margin: t.space.xs,
        paddingHorizontal: t.space.md,
        paddingVertical: t.space.sm,
        minHeight: t.touchTarget,
        borderRadius: t.radius.lg,
        backgroundColor: raised ? t.color.surfaceRaised : t.color.surface,
        borderWidth: t.hairline,
        borderColor: t.color.border,
        elevation: raised ? 0 : t.elevation.card,
      }}
    >
      <Text maxFontSizeMultiplier={t.maxFontScale} style={label(display)}>
        {labelText}
      </Text>
      <Money
        testID={testID}
        amount={amount}
        mode={display}
        size="figure"
        withSign={tone === 'directional'}
        tone={tone}
      />
    </View>
  );
}

/**
 * THE 2x2 OF TODAY'S CASH, from `store.primary()` and nothing else.
 *
 * P1 cash received, P2 cash paid, P3 expected in the box, P4 net sales. Cash
 * paid is drawn as an outflow - the engine's figure negated through the
 * audited `subtract`, never a bare minus - because the reference reads
 * "- ₹4,380" and the sign carries the direction where colour cannot alone.
 */
export function TodayFigures({
  id,
  store,
  s,
  display = 'comfort',
}: {
  readonly id: string;
  readonly store: Store;
  readonly s: Strings;
  readonly display?: DisplayMode;
}) {
  const t = tokens(display);
  const p = store.primary();
  const paid = p.p2TotalCashPaid.value;
  const shown = [
    p.p1TotalCashReceived.value,
    paid > 0 ? subtract(0, paid) : paid,
    p.p3ExpectedCashBalance.value,
    p.p4NetSales.value,
  ];
  /*
   * TWO ACROSS ONLY WHILE EVERY FIGURE FITS BESIDE ANOTHER.
   *
   * A half-width tile holds about 11 characters of `figure` type. A lakh figure
   * with paise - "+₹2,49,312.01", 13 - broke INSIDE the number on the Odia
   * contact sheet, "₹2,49,312.0" over "1": a figure that reads as two figures,
   * which is the one layout failure in a cash app worse than overflow, and the
   * one `check:layout` cannot see because nothing ran outside its box. Money
   * scales with the system setting and is never capped, so the length is
   * multiplied by that scale. Too long at this scale: one figure per row.
   */
  const single = !fitsTwoAcross(shown);
  return (
    <View
      testID={id + '-figures'}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: t.space.sm,
        paddingTop: t.space.sm,
      }}
    >
      <Tile
        testID={id + '-cash-received'}
        labelText={s('t1.cashReceived')}
        amount={p.p1TotalCashReceived.value}
        display={display}
        single={single}
        tone="directional"
      />
      <Tile
        testID={id + '-cash-paid'}
        labelText={s('t1.cashPaid')}
        amount={paid > 0 ? subtract(0, paid) : paid}
        display={display}
        single={single}
        tone={paid > 0 ? 'directional' : 'neutral'}
      />
      <Tile
        testID={id + '-expected'}
        labelText={s('t1.expected')}
        amount={p.p3ExpectedCashBalance.value}
        display={display}
        single={single}
        raised
      />
      <Tile
        testID={id + '-net-sales'}
        labelText={s('t1.netSales')}
        amount={p.p4NetSales.value}
        display={display}
        single={single}
      />
    </View>
  );
}

/**
 * The P1 and P2 working keys, and opening cash. A line of P3's working outside
 * these is a typed cash adjustment (decision 2) - see `CashInBox`.
 */
const BOX_BASE_KEYS: ReadonlySet<string> = new Set([
  'working.opening_cash',
  'working.cash_sales',
  'working.udhar_collected_cash',
  'working.exchange_received_cash',
  'working.cash_purchase',
  'working.cash_expenses',
  'working.cash_party_payment',
  'working.withdrawal_cash',
  'working.refund_paid_cash',
]);

/**
 * USABILITY item 3: ONE HERO, "IN THE BOX NOW", WITH ITS WORKING IN ONE LINE.
 *
 * Six tiles of equal weight hid the one figure he opens the app for, and
 * "Expected in box" read as a peer of "Net sales" (U-01). So: P3 large, then
 * how it was reached - opening, + cash in (P1), - cash out (P2), and any typed
 * cash adjustment - then one line for the day's sales (P4).
 *
 * EVERY FIGURE IS THE ENGINE'S. The hero is `p3ExpectedCashBalance`; the terms
 * are P1, P2, the stored opening and P3's own adjustment lines. Nothing is
 * added up here, so the working cannot disagree with its total (T1.test.tsx
 * proves the terms sum to the hero through the audited helpers). A zero term
 * is left out rather than drawn ("Nothing paid out yet" instead of "- ₹0.00").
 *
 * D2 HOLDS BY CONSTRUCTION: P1 is cash only, so a UPI sale moves "Sales today"
 * and leaves the box alone - which is exactly what the drawer does.
 */
export function CashInBox({
  id,
  store,
  s,
  display = 'comfort',
}: {
  readonly id: string;
  readonly store: Store;
  readonly s: Strings;
  readonly display?: DisplayMode;
}) {
  const t = tokens(display);
  const p = store.primary();
  const opening = store.state.day.openingCash;
  const cashIn = p.p1TotalCashReceived.value;
  const cashOut = p.p2TotalCashPaid.value;
  const adjustments = p.p3ExpectedCashBalance.working.lines.filter(
    (l) => !BOX_BASE_KEYS.has(l.key) && l.amount !== 0,
  );
  const sales = p.p4NetSales.value;
  const word = {
    flexShrink: 1,
    fontFamily: t.font.regular,
    fontSize: t.type.body,
    lineHeight: t.leadingUncapped(t.type.body),
    color: t.color.ink,
  } as const;
  /*
   * ONE LINE OF THE WORKING: the word on the left, the figure on the right.
   *
   * v2 (DESIGN-SYSTEM-V2 3.4) gives each term its own line under a hairline,
   * where v1 ran them together as one wrapping sentence. The same rule holds,
   * and it is now asserted rather than hoped (Wave 5 verifier gap): A FIGURE
   * NEVER BREAKS MID-NUMBER. The amount is its own `Money` Text - never part of
   * the label's Text - in a slot that does not shrink (`flexShrink: 0`), and
   * the line wraps (`flexWrap`), so when the word and the figure cannot share a
   * line at 2.0x the WHOLE figure moves under the word. Nothing can break
   * "₹2,49,312.01" between its digits except a slot squeezed narrower than
   * the figure, and that is the one thing this layout never asks of it.
   *
   * Cash in and cash out carry their arrow AND their printed sign AND their
   * word - colour (`positive` / `negative`) is additive, never the signal.
   */
  const term = (
    key: string,
    labelText: string,
    amount: Paise,
    sign: '+' | '-' | null,
    first: boolean,
  ) => (
    <View
      key={key}
      testID={id + '-box-' + key}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: t.space.xs,
        borderTopWidth: first ? 0 : t.hairline,
        borderTopColor: t.color.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: t.space.sm }}>
        {sign === null ? null : (
          <View style={{ marginRight: t.space.xs }}>
            <Icon
              name={sign === '+' ? 'in' : 'out'}
              size="sm"
              color={sign === '+' ? 'positive' : 'negative'}
              display={display}
            />
          </View>
        )}
        <Text {...t.bodyText} style={word}>
          {labelText}
        </Text>
      </View>
      <View testID={id + '-box-' + key + '-slot'} style={{ flexShrink: 0, marginLeft: 'auto' }}>
        <Money
          testID={id + '-box-' + key + '-amount'}
          amount={amount}
          mode={display}
          size="body"
          withSign={sign === '+'}
          out={sign === '-'}
          tone={sign === null ? 'neutral' : 'directional'}
        />
      </View>
    </View>
  );
  const terms: { key: string; label: string; amount: Paise; sign: '+' | '-' | null }[] = [
    ...(opening === null ? [] : [{ key: 'opening', label: s('box.opening'), amount: opening, sign: null }]),
    ...(cashIn === 0 ? [] : [{ key: 'in', label: s('box.in'), amount: cashIn, sign: '+' as const }]),
    ...(cashOut === 0 ? [] : [{ key: 'out', label: s('box.out'), amount: cashOut, sign: '-' as const }]),
    ...adjustments.map((l, i) => ({ key: 'adjust-' + String(i), label: s('box.adjust'), amount: l.amount, sign: l.sign })),
  ];
  return (
    <View
      testID={id + '-box'}
      /*
       * THE CARD SAYS ONE THING TO A SCREEN READER FIRST: the label and the
       * figure. The working lines below are still each read on their own.
       */
      style={{
        marginHorizontal: t.space.gutter,
        marginTop: t.space.gutter,
        padding: t.space.gutter,
        borderRadius: t.radius.xl,
        backgroundColor: t.color.surface,
        borderWidth: t.edgeWidth,
        borderColor: t.color.border,
        elevation: t.elevation.card,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: t.disc.sm,
            height: t.disc.sm,
            marginRight: t.space.sm,
            borderRadius: t.radius.pill,
            backgroundColor: t.color.tintSale,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="box" size="md" color="inkSale" display={display} />
        </View>
        <Text
          testID={id + '-box-title'}
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            flex: 1,
            fontFamily: t.font.bold,
            fontSize: t.type.lead,
            lineHeight: t.leading(t.type.lead),
            color: t.color.ink,
          }}
        >
          {s('box.title')}
        </Text>
      </View>
      <Money testID={id + '-expected'} amount={p.p3ExpectedCashBalance.value} mode={display} size="hero" />
      {/* THE WORKING, ONE TERM PER LINE - never a second hero. */}
      <View testID={id + '-box-working'}>
        {terms.map((x, i) => term(x.key, x.label, x.amount, x.sign, i === 0))}
      </View>
      {opening === null ? (
        <Quiet testID={id + '-box-no-opening'} text={s('t1.openingMissing')} display={display} />
      ) : null}
      {cashOut === 0 ? <Quiet testID={id + '-box-nothing-out'} text={s('box.nothingOut')} display={display} /> : null}
      <View
        testID={id + '-box-sales'}
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: t.space.sm,
          paddingTop: t.space.sm,
          borderTopWidth: t.hairline,
          borderTopColor: t.color.border,
        }}
      >
        {sales === 0 ? (
          <Quiet testID={id + '-no-sales'} text={s('box.noSales')} display={display} />
        ) : (
          <>
            <Text {...t.bodyText} style={{ ...word, marginRight: t.space.sm }}>
              {s('box.sales')}
            </Text>
            <View style={{ flexShrink: 0, marginLeft: 'auto' }}>
              <Money testID={id + '-net-sales'} amount={sales} mode={display} size="body" />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

/**
 * Udhar to collect | you owe suppliers - P7 and P8, one card, one tap to Parties.
 *
 * These are the shop's carried balances plus today's movement, so they are
 * shown even on a morning with nothing entered yet.
 */
export function PartyTotals({
  id,
  store,
  s,
  display = 'comfort',
  onPress,
  hideZero = false,
}: {
  readonly id: string;
  readonly store: Store;
  readonly s: Strings;
  readonly display?: DisplayMode;
  readonly onPress?: (() => void) | undefined;
  /**
   * USABILITY item 3: a zero is not drawn as a figure. "You owe suppliers
   * ₹0.00" took half a card to say nothing; with this on, a zero half is left
   * out and a card of two zeros is not drawn at all.
   */
  readonly hideZero?: boolean;
}) {
  const t = tokens(display);
  const p = store.primary();
  const showCollect = !hideZero || p.p7CreditOutstanding.value !== 0;
  const showOwed = !hideZero || p.p8SupplierOutstanding.value !== 0;
  if (!showCollect && !showOwed) return null;
  // The same rule as the 2x2 above: side by side only while both figures fit.
  const stacked =
    !(showCollect && showOwed) || !fitsTwoAcross([p.p7CreditOutstanding.value, p.p8SupplierOutstanding.value]);
  const half = (testID: string, text: string, amount: Paise, rule: boolean) => (
    <View
      style={{
        flexGrow: 1,
        flexBasis: stacked ? 'auto' : 0,
        paddingHorizontal: t.space.md,
        paddingVertical: t.space.sm,
        borderRightWidth: rule && !stacked ? t.hairline : 0,
        borderBottomWidth: rule && stacked ? t.hairline : 0,
        borderColor: t.color.border,
      }}
    >
      {/* QA-03: below zero is an ADVANCE, said in words - never a bare minus. */}
      <Text maxFontSizeMultiplier={t.maxFontScale} style={label(display)}>
        {amount < 0 ? s('advance.label') : text}
      </Text>
      <Money testID={testID} amount={amount < 0 ? subtract(0, amount) : amount} mode={display} size="figure" />
    </View>
  );
  const body = (
    <>
      {showCollect ? half(id + '-to-collect', s('t1.toCollect'), p.p7CreditOutstanding.value, showOwed) : null}
      {showOwed ? half(id + '-owed', s('t1.owed'), p.p8SupplierOutstanding.value, false) : null}
    </>
  );
  const style = {
    flexDirection: stacked ? ('column' as const) : ('row' as const),
    marginHorizontal: t.space.md,
    marginTop: t.space.sm,
    minHeight: t.touchTarget,
    minWidth: t.touchTarget,
    borderRadius: t.radius.lg,
    backgroundColor: t.color.surface,
    borderWidth: t.hairline,
    borderColor: t.color.border,
    elevation: t.elevation.card,
  };
  return onPress === undefined ? (
    <View testID={id + '-parties'} style={style}>
      {body}
    </View>
  ) : (
    <Pressable
      testID={id + '-parties'}
      accessibilityRole="button"
      accessibilityLabel={s('t1.toCollect') + ', ' + s('t1.owed')}
      onPress={onPress}
      android_ripple={{ color: t.color.brandSoft }}
      style={style}
    >
      {body}
    </Pressable>
  );
}

/**
 * A DERIVED OBSERVATION, shown only when it is true.
 *
 * The reference's two alert cards - a supplier due on Thursday larger than the
 * box, and customers unpaid 31+ days - need per-party due dates and credit
 * ages. This store holds neither (`partyMovementToday` says so in full), so
 * neither card can be computed and neither is drawn. What CAN be computed from
 * figures already on this screen is that more cash left the box than came in;
 * that is stated as something to look at, never as something to do.
 */
export function Observation({
  id,
  store,
  s,
  display = 'comfort',
}: {
  readonly id: string;
  readonly store: Store;
  readonly s: Strings;
  readonly display?: DisplayMode;
}) {
  const t = tokens(display);
  const p = store.primary();
  if (!(p.p2TotalCashPaid.value > p.p1TotalCashReceived.value)) return null;
  const line = {
    fontSize: t.type.body,
    lineHeight: t.leading(t.type.body),
    color: t.color.ink,
  } as const;
  return (
    <View
      testID={id + '-observation'}
      style={{
        marginHorizontal: t.space.md,
        marginTop: t.space.md,
        padding: t.space.md,
        borderRadius: t.radius.lg,
        backgroundColor: t.color.surfaceRaised,
        borderWidth: t.hairline,
        borderColor: t.color.borderStrong,
      }}
    >
      <Text maxFontSizeMultiplier={t.maxFontScale} style={{ ...line, fontFamily: t.font.bold }}>
        {s('t1.obs.title')}
      </Text>
      <Text maxFontSizeMultiplier={t.maxFontScale} style={{ ...line, fontFamily: t.font.regular }}>
        {s('t1.obs.body')}
      </Text>
    </View>
  );
}

/**
 * R5 FR-5 · "UDHAR TO COLLECT" - customers who owe, OLDEST DEBT FIRST, the top
 * few. An in-app list and nothing more: no notification, no message to anyone.
 * The age is the days since his balance last rose above zero - "owing for",
 * never "overdue", because no due date exists for a customer's udhar (D4's two
 * vocabularies). Absent when nobody owes. Tap opens the customer.
 */
export const COLLECT_TOP = 3;

export function CollectToday({
  id,
  store,
  s,
  display = 'comfort',
  onOpenParty = () => {},
}: {
  readonly id: string;
  readonly store: Store;
  readonly s: Strings;
  readonly display?: DisplayMode;
  readonly onOpenParty?: (partyId: string) => void;
}) {
  const t = tokens(display);
  const dues = store.customerDues().slice(0, COLLECT_TOP);
  if (dues.length === 0) return null;
  const today = store.state.day.date;
  const names = new Map(store.state.parties.map((p) => [p.id, p.name]));
  return (
    <View
      testID={id + '-collect'}
      style={{
        marginHorizontal: t.space.md,
        marginTop: t.space.md,
        borderRadius: t.radius.lg,
        backgroundColor: t.color.surface,
        borderWidth: t.hairline,
        borderColor: t.color.border,
        elevation: t.elevation.card,
      }}
    >
      <View style={{ paddingHorizontal: t.space.md, paddingTop: t.space.sm }}>
        <SectionLabel testID={id + '-collect-title'} text={s('collect.title')} display={display} />
        <Quiet testID={id + '-collect-note'} text={s('collect.note')} display={display} />
      </View>
      {dues.map((d) => (
        <Pressable
          key={d.partyId}
          testID={id + '-collect-' + d.partyId}
          accessibilityRole="button"
          accessibilityLabel={names.get(d.partyId) ?? ''}
          onPress={() => onOpenParty(d.partyId)}
          android_ripple={{ color: t.color.brandSoft }}
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: t.touchTarget,
            minWidth: t.touchTarget,
            paddingHorizontal: t.space.md,
            paddingVertical: t.space.sm,
            borderTopWidth: t.hairline,
            borderTopColor: t.color.border,
          }}
        >
          <View style={{ flexShrink: 1, marginRight: t.space.sm }}>
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                fontFamily: t.font.medium,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.ink,
              }}
            >
              {names.get(d.partyId) ?? ''}
            </Text>
            <Text
              testID={id + '-collect-' + d.partyId + '-age'}
              maxFontSizeMultiplier={t.maxFontScale}
              style={label(display)}
            >
              {fill(s('collect.days'), { n: daysBetween(d.since, today) })}
            </Text>
          </View>
          <Money testID={id + '-collect-' + d.partyId + '-amount'} amount={d.amount} mode={display} size="body" />
        </Pressable>
      ))}
    </View>
  );
}

/** The dashed note that stands in for the figures before the first entry. */
export function EmptyNote({
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
      style={{
        marginHorizontal: t.space.md,
        marginTop: t.space.sm,
        padding: t.space.md,
        borderRadius: t.radius.lg,
        borderWidth: t.hairline,
        borderStyle: 'dashed',
        borderColor: t.color.borderStrong,
      }}
    >
      <Quiet testID={testID} text={text} display={display} />
    </View>
  );
}
