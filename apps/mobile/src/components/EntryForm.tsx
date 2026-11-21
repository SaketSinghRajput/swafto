/**
 * THE ENTRY FORM. Four screens, one implementation.
 *
 * T7, T8, T9 and T10 are the same screen with different sections behind the
 * buttons: repeating lines, a running total, a draft amount, a keypad. Building
 * them separately would give four dialects of one form, and the fourth would be
 * the one where the running total was computed slightly differently.
 *
 * WHAT VARIES IS DECLARED, NOT IMPLIED. A form says which sections it lists,
 * which figure is its running total, and what its buttons commit. Everything else
 * - the keypad, the wrapping, the four states, the touch targets - is identical
 * because it is the same code.
 *
 * THE RUNNING TOTAL IS ALWAYS AN ENGINE FIGURE, passed in as a value the caller
 * read from the store on this render, never accumulated here. A form that added
 * up its own rows would be a second implementation of a total the day-close sheet
 * also computes, and the first time they disagreed the shopkeeper would have two
 * numbers and no way to tell which was his.
 *
 * IT WRITES NOTHING. Every action leaves as a callback. The screen never calls
 * `store.append` - the caller does, through the IN1-IN7 parsers, which is the only
 * path that refuses bad input by naming the field it refused.
 */
import { View, Text, Pressable } from '@swafto/ui';
import { formatPaise, partyRule, returnableOf, subtract, type Mode as PaymentMode, type Paise, type Entry } from '@swafto/formula-engine';
import { Money } from './Money.tsx';
import { Keypad, type KeypadKey } from './Keypad.tsx';
import { Shell, Row, Card, Segmented, PrimaryButton, type LoadStatus } from './Shell.tsx';
import { PartyPicker, balanceWord, balanceName, type PartyKind, type NewPartyControls } from './PartyPicker.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';
import { strings, type RenderLanguage, type StringKey } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';
import { fill } from './DayParts.tsx';
import { Sheet } from './Sheet.tsx';

/**
 * CANCEL THIS ENTRY (docs/design/CANCEL-ENTRY-GATE.md section 4): the session's
 * half, handed to the form. Absent, the lines are plain rows, as they always were.
 */
export interface CancelControls {
  /** The line waiting on the confirm sheet, or null. */
  readonly asking: string | null;
  /** The line just cancelled, for "Enter it again correctly", or null. */
  readonly justCancelled: string | null;
  readonly onAsk: (entryId: string) => void;
  readonly onConfirm: () => void;
  readonly onDismiss: () => void;
  readonly onEnterAgain: () => void;
}

/** One button at the bottom of the form: what it says, and what it commits. */
export interface CommitOption {
  readonly labelKey: StringKey;
  readonly section: Entry['section'];
  readonly mode: PaymentMode;
}

export interface EntryFormProps {
  readonly id: string;
  readonly store: Store;
  readonly titleKey: StringKey;
  /** Which sections this form lists. The order is the order on screen. */
  readonly sections: readonly Entry['section'][];
  /** The engine figure this form is about, read by the caller on this render. */
  readonly runningTotal: Paise;
  readonly runningTotalKey: StringKey;
  readonly commits: readonly CommitOption[];
  readonly emptyKey: StringKey;
  /** A sentence under the rows: why this form is not what it looks like. */
  readonly noteKey?: StringKey;

  readonly status?: LoadStatus;
  readonly language?: RenderLanguage;
  readonly display?: DisplayMode;
  readonly draftPaise?: Paise | null;
  readonly onKey?: (key: KeypadKey) => void;
  readonly onCommit?: (option: CommitOption) => void;
  readonly onRetry?: () => void;
  /** Explicitly `| undefined`: `exactOptionalPropertyTypes` is on, and a form
   *  reached from two places computes this rather than branching on the JSX. */
  readonly onBack?: (() => void) | undefined;
  /**
   * WHICH COMMIT IS CHOSEN - AND WHY IT DEFAULTS TO THE FIRST RATHER THAN NONE.
   *
   * Acceptance criterion 1: from a cold start the first digit is reachable in
   * one tap and the entry is committed in two. Splitting choose-from-commit
   * would cost a third tap on every single entry if nothing were pre-selected,
   * which is the criterion failed forty times a day. So the first commit - cash,
   * on every form that has one - is live when the form opens, and changing it is
   * the exceptional act rather than the required one.
   */
  readonly selectedCommit?: number;
  readonly onSelectCommit?: (index: number) => void;
  /**
   * WHO THIS ENTRY IS FOR, AND THE PICKER THAT NAMES THEM.
   *
   * Before these props existed, three of the six actions on Today committed to
   * sections the engine refuses without a party, nothing in the app could name
   * one, and the refusal was swallowed where no screen rendered it. Tapping Add
   * did nothing, silently, forever.
   */
  readonly entryPartyId?: string | null;
  /**
   * USABILITY item 6: THE ENTRY THIS FORM JUST SAVED. After Add, the only sign
   * was the amount clearing and a total changing, and the new row went to the
   * bottom of an oldest-first list, out of sight (U-05). The id is read back
   * from the store, so "Saved ₹50 · Cash" says what the book holds.
   */
  readonly savedId?: string | null;
  readonly pickingParty?: boolean;
  readonly onOpenPartyPicker?: () => void;
  readonly onChooseParty?: (partyId: string) => void;
  readonly onCancelPartyPicker?: () => void;
  /** F-10: adding a party from inside the picker. */
  readonly newParty?: NewPartyControls | undefined;
  /**
   * ONE GHOST ACTION UNDER THE LINES - Form A's "Return or exchange a sale".
   * Not a rail and not a section (EX-7): a return is an event, and a ninth
   * closing section would push the progress ring past its budget.
   */
  readonly secondaryAction?: { readonly labelKey: StringKey; readonly onPress: () => void } | undefined;
  /**
   * PR-1 (Premium): "Add items to a sale", under the lines only - with no sale
   * there is nothing to itemise. Optional and after the save: it never sits
   * between the amount and the commit.
   */
  readonly itemsAction?: { readonly labelKey: StringKey; readonly onPress: () => void } | undefined;
  /**
   * QA-03 (CTO decision, 2026-11-18): the collection or payment that is more than
   * is owed, waiting for "record it as advance". Null when nothing is waiting.
   */
  readonly advanceConfirm?: { readonly extra: Paise } | null;
  readonly onConfirmAdvance?: (option: CommitOption) => void;
  readonly onCancelAdvance?: () => void;
  /** Cancel this entry: tap a line on an open day, confirm, and the pair stops counting. */
  readonly cancel?: CancelControls | undefined;
}

/**
 * QA-05: THE MODE A ROW WAS PAID IN. Five identical "Expenses Rs 60.00" rows
 * could not be told apart. Shown only where the section does not already say it:
 * a cash sale, a UPI sale and a credit sale name their mode in the section.
 */
const MODE_KEY: Readonly<Record<PaymentMode, StringKey>> = {
  cash: 'formA.mode.cash',
  upi: 'formA.mode.upi',
  udhar: 'formA.mode.udhar',
  other: 't9.mode.other',
  shop_stock: 't9.mode.shop_stock',
};
const MODE_NAMED_BY_SECTION: ReadonlySet<string> = new Set(['cash_sales', 'upi_sales', 'udhar_sales']);

/**
 * LIVE DEMO S3-1: A SALE THAT CAME BACK SAYS SO ON ITS OWN LINE. After a refund
 * the Sales total was net while the ₹5,000 line still read as a live sale, and
 * nothing on the screen joined the two. The line stays, at its original figure
 * (D1: the original is never hidden or rewritten); it gains " · returned", or
 * " · part returned", read from the engine's `returnableOf` over the rows that
 * refer to it - the same figure T18 offers - so the words cannot disagree with
 * the book. Every other line is unchanged.
 */
const returnWord = (e: Entry, store: Store, s: (key: StringKey) => string): string => {
  if (!MODE_NAMED_BY_SECTION.has(e.section)) return '';
  const left = returnableOf(e, store.entriesReferringTo(e.id));
  if (left === e.amount) return '';
  return ' · ' + s(left <= 0 ? 'entry.returned' : 't18.partReturned');
};

/**
 * ITEM 6: WHEN A LINE WAS TYPED, as " · 14:32" - the stamp's hh:mm as written.
 * The phone stamps entries with its own wall clock (`localIso`, DV-8), so the
 * time on the line is the time on the shop's wall. Anything that is not a
 * stamp shows nothing rather than a half-parsed time.
 */
export const timeOf = (createdAt: string): string => {
  const m = /T(\d{2}:\d{2})/.exec(createdAt);
  return m === null ? '' : ' · ' + (m[1] as string);
};


export function EntryForm({
  id,
  store,
  titleKey,
  sections,
  runningTotal,
  runningTotalKey,
  commits,
  emptyKey,
  noteKey,
  status = 'ready',
  language = 'en',
  display = 'comfort',
  draftPaise = null,
  onKey = () => {},
  onCommit = () => {},
  onRetry = () => {},
  onBack,
  selectedCommit = 0,
  onSelectCommit = () => {},
  entryPartyId = null,
  savedId = null,
  pickingParty = false,
  onOpenPartyPicker = () => {},
  onChooseParty = () => {},
  onCancelPartyPicker = () => {},
  newParty,
  secondaryAction,
  itemsAction,
  advanceConfirm = null,
  onConfirmAdvance = () => {},
  onCancelAdvance = () => {},
  cancel,
}: EntryFormProps) {
  const t = tokens(display);
  const s = strings(language);

  const parties = new Map(store.state.parties.map((p) => [p.id, p.name]));

  /*
   * WHAT THE ENGINE WILL DO WITH THIS COMMIT, ASKED BEFORE THE TAP.
   *
   * `partyRule` is exported by the engine and proven against every parser by
   * `party-sections.spec.ts`, so the form and the parser cannot disagree about
   * whether a person is needed. That agreement is the whole fix: the old build
   * let the user tap a button that could only ever throw.
   */
  const chosen = commits[selectedCommit];
  const rule = chosen === undefined ? 'refused' : partyRule(chosen.section, chosen.mode);
  const partyName = entryPartyId === null ? null : (parties.get(entryPartyId) ?? null);
  const partyMissing = rule === 'required' && entryPartyId === null;

  /*
   * R5 FR-6 · ABOVE THE LIMIT HE SET - SAID, NEVER ENFORCED. An udhar sale that
   * would take this customer's udhar past the limit gets one sentence under his
   * name. The commit stays live, the amount stays what he typed, and nothing is
   * suggested in its place: it is something to review, not an instruction.
   */
  const overLimit =
    chosen?.section === 'udhar_sales' && entryPartyId !== null && draftPaise !== null && draftPaise > 0
      ? store.creditLimitObservation(entryPartyId, draftPaise)
      : null;

  /*
   * WHICH SIDE OF THE BOOK TO OFFER. A collection names a customer and a
   * payment names a supplier; showing the wrong list is how an entry ends up
   * against the wrong person, which no total would ever reveal. The engine does
   * NOT enforce this today - it only requires that somebody is named - so this
   * is the only thing standing between the two sides, and it is stated here
   * rather than assumed.
   */
  const partyKind: PartyKind =
    chosen !== undefined && (chosen.section === 'purchase' || chosen.section === 'party_payment')
      ? 'supplier'
      : 'customer';
  /*
   * ITEM 6: NEWEST FIRST. The list was oldest first and showed four rows, so
   * the line just added was the one he could not see. Append order is
   * chronological by construction (D1), so reversing it is newest first without
   * a second ordering that could disagree.
   */
  /*
   * CANCEL THIS ENTRY: a cancel row is never a line of its own. The original it
   * cancels carries it, struck through with "cancelled", so the book shows one
   * thing that happened rather than two figures that cancel out.
   */
  const lines = store.state.entries
    .filter((e) => sections.includes(e.section) && e.cancelsEntryId === undefined)
    .slice()
    .reverse();
  const day = store.state.day;
  // On an OPEN day only, today's lines. A closed day keeps "Post a correction" (T16).
  const cancellable = (e: Entry): boolean =>
    cancel !== undefined && day.state === 'open' && e.dayId === day.date && store.cancelOf(e.id) === undefined;
  const asked = cancel?.asking ? lines.find((e) => e.id === cancel.asking) : undefined;
  // A return or a correction points at it: that is undone first, and the sheet says so.
  const linked = asked === undefined ? false : store.entriesReferringTo(asked.id).length > 0;
  const lineLabel = (e: Entry): string =>
    s(('section.' + e.section) as StringKey) +
    (e.partyId ? ' - ' + (parties.get(e.partyId) ?? e.partyId) : '') +
    (MODE_NAMED_BY_SECTION.has(e.section) ? '' : ' - ' + s(MODE_KEY[e.mode])) +
    (e.label ? ' - ' + e.label : '') +
    timeOf(e.createdAt);
  const justCancelled = cancel?.justCancelled ? lines.find((e) => e.id === cancel.justCancelled) : undefined;
  const saved = savedId === null ? undefined : lines.find((e) => e.id === savedId);
  /* What this person owes now, over every day this phone holds - shown where he chooses and above the pad. */
  const partyBalance = entryPartyId === null || partyName === null ? null : store.partyBalance(entryPartyId);

  /*
   * HT-60: A LINK, COMPACT. A full-width ghost button per link cost 72px each
   * with its margins, and two of them filled the body at font 2.0 (HT-51 then
   * HT-60). These share one row, half the width each, wrapping their own words,
   * with the touch target as the floor and no outer margin. Ghost, as before:
   * the marigold is the Add key's alone.
   */
  const link = (testID: string, labelKey: StringKey, onPress: () => void) => (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={s(labelKey)}
      onPress={onPress}
      android_ripple={{ color: t.color.brandSoft }}
      style={{
        flex: 1,
        minHeight: t.touchTarget,
        minWidth: t.touchTarget,
        paddingHorizontal: t.space.sm,
        borderRadius: t.radius.md,
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
          color: t.color.ink,
          textAlign: 'center',
        }}
      >
        {s(labelKey)}
      </Text>
    </Pressable>
  );
  const showItems = itemsAction !== undefined && lines.length > 0;

  return (
    <Shell
      id={id}
      s={s}
      display={display}
      status={status}
      titleKey={titleKey}
      /*
       * INLINE, because this screen's hero is the amount he is TYPING.
       *
       * The running total matters but it is reference, not the subject: he is
       * looking at the pad. Giving both the canvas treatment put the keypad
       * below the fold on every entry form at the chrome cap - B31 measured it
       * and refused, which is the check doing precisely its job.
       */
      /*
       * NO HEADLINE IN THE CHROME ON AN ENTRY SCREEN.
       *
       * The running total went through three homes before this one. As a hero in
       * the canvas it cost ~160dp; inline in the title row it still cost a
       * wrapped line, and that single line was the entire remaining B31 overflow
       * across all four forms - measured, not guessed: removing it took the
       * failures from ten to four.
       *
       * It belongs in the body anyway. A total sits with the lines it totals,
       * and this screen's hero is the amount being typed.
       */
      bodyHeader={
        <>
          {/*
            ITEM 6: "SAVED ₹50 · CASH" - THE TAP LANDED, IN WORDS. A tick, the
            figure through `Money`, and the mode, on the calm raised surface:
            confirmation, not celebration. It names the entry the store holds,
            and the same entry heads the list below.
          */}
          {saved === undefined ? null : (
            <View
              testID={id + '-saved'}
              accessible
              accessibilityLiveRegion="polite"
              accessibilityLabel={fill(s('entry.savedLong'), {
                amount: formatPaise(saved.amount),
                mode: s(MODE_KEY[saved.mode]),
              })}
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginHorizontal: t.space.sm,
                marginBottom: t.space.xs,
                paddingHorizontal: t.space.md,
                paddingVertical: t.space.xs,
                borderRadius: t.radius.md,
                backgroundColor: t.color.surfaceRaised,
                borderWidth: t.hairline,
                borderColor: t.color.borderStrong,
              }}
            >
              <View
                style={{
                  width: t.glyph.size / 2,
                  height: t.glyph.size,
                  marginRight: t.space.md,
                  marginTop: -t.glyph.stroke,
                  borderRightWidth: t.glyph.stroke,
                  borderBottomWidth: t.glyph.stroke,
                  borderColor: t.color.positive,
                  transform: [{ rotate: '45deg' }],
                }}
              />
              <Text
                {...t.bodyText}
                style={{
                  marginRight: t.space.xs,
                  fontFamily: t.font.medium,
                  fontSize: t.type.body,
                  lineHeight: t.leadingUncapped(t.type.body),
                  color: t.color.ink,
                }}
              >
                {s('entry.saved')}
              </Text>
              <Money testID={id + '-saved-amount'} amount={saved.amount} mode={display} size="body" />
              <Text
                testID={id + '-saved-mode'}
                {...t.bodyText}
                style={{
                  marginLeft: t.space.xs,
                  fontFamily: t.font.regular,
                  fontSize: t.type.body,
                  lineHeight: t.leadingUncapped(t.type.body),
                  color: t.color.ink,
                }}
              >
                {'· ' + s(MODE_KEY[saved.mode])}
              </Text>
            </View>
          )}
          {/*
            HT-51: THE LINKS FIRST IN THE BODY. Items first of the two: it is the
            one this form is about, offered only once there is a sale. A return
            is offered on an empty day too - yesterday's customer comes back in
            the morning.
          */}
          {!showItems && secondaryAction === undefined ? null : (
            <View
              testID={id + '-links'}
              style={{ flexDirection: 'row' }}
            >
              {showItems ? link(id + '-items', itemsAction.labelKey, itemsAction.onPress) : null}
              {secondaryAction === undefined
                ? null
                : link(id + '-secondary', secondaryAction.labelKey, secondaryAction.onPress)}
            </View>
          )}
          {/*
            HT-60: THE TOTAL DIRECTLY UNDER THE LINKS, BOTH COMPACT. HT-51 put
            the two links first as full-width rows, and at font 2.0 they filled
            the 603px body: the total became a 14px strip below them and no
            figure was visible at all - the fix for one element hid the next.
            Now the links share one row and the total is one tight line (label
            and figure wrap as one), so both are in view at every text size in
            comfort mode. Where both cannot fit - Focus with the longest strings
            at the chrome cap, where the footer leaves the body ~100px - the
            links stay first, because check:layout holds them in view at every
            scale (HT-51) and the figure is reference that scrolls into view.
          */}
          <View
            testID={id + '-total'}
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              marginHorizontal: t.space.sm,
              paddingHorizontal: t.space.md,
              borderRadius: t.radius.lg,
              backgroundColor: t.color.surface,
              elevation: t.elevation.card,
            }}
          >
            <Text
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                flexGrow: 1,
                flexShrink: 1,
                flexBasis: 0,
                minWidth: '33%',
                marginRight: t.space.sm,
                fontFamily: t.font.regular,
                fontSize: t.type.label,
                lineHeight: t.leading(t.type.label),
                color: t.color.inkMuted,
              }}
            >
              {runningTotal < 0 ? s('advance.label') : s(runningTotalKey)}
            </Text>
            {/*
              QA-03: BELOW ZERO IS AN ADVANCE - the shop owes them - not a bare
              negative figure. Same figure, said in words, its sign dropped.
            */}
            <Money
              testID={id + '-headline'}
              amount={runningTotal < 0 ? subtract(0, runningTotal) : runningTotal}
              mode={display}
              size="body"
            />
          </View>
          {/*
            CANCEL THIS ENTRY: WHAT WAS CANCELLED, AND THE WAY TO TYPE IT RIGHT.
            "Enter it again correctly" sets the segment to that entry's section
            and mode and nothing else: the amount is his to type (no inference).
            UNDER the total, not above it: above, at font 2.0 it pushed the Sales
            total out of view (check:layout, HT-60's rule), and the total is the
            figure the cancel just changed.
          */}
          {justCancelled === undefined || cancel === undefined ? null : (
            <View
              testID={id + '-cancelled'}
              accessibilityLiveRegion="polite"
              style={{
                marginHorizontal: t.space.sm,
                marginBottom: t.space.xs,
                paddingHorizontal: t.space.md,
                borderRadius: t.radius.md,
                backgroundColor: t.color.surfaceRaised,
                borderWidth: t.hairline,
                borderColor: t.color.borderStrong,
              }}
            >
              <Text
                testID={id + '-cancelled-text'}
                {...t.bodyText}
                style={{
                  paddingTop: t.space.xs,
                  fontFamily: t.font.medium,
                  fontSize: t.type.body,
                  lineHeight: t.leadingUncapped(t.type.body),
                  color: t.color.ink,
                }}
              >
                {fill(s('cancel.done'), { amount: formatPaise(justCancelled.amount) })}
              </Text>
              <PrimaryButton
                testID={id + '-enter-again'}
                label={s('cancel.enterAgain')}
                display={display}
                variant="ghost"
                size="md"
                onPress={cancel.onEnterAgain}
              />
            </View>
          )}
          {advanceConfirm === null ? null : (
            <View
              testID={id + '-advance'}
              accessibilityRole="alert"
              style={{
                marginHorizontal: t.space.sm,
                marginTop: t.space.xs,
                padding: t.space.md,
                borderRadius: t.radius.md,
                borderWidth: t.hairline,
                borderColor: t.color.borderStrong,
                backgroundColor: t.color.surfaceRaised,
              }}
            >
              <Text
                testID={id + '-advance-text'}
                maxFontSizeMultiplier={t.maxFontScale}
                style={{
                  fontFamily: t.font.medium,
                  fontSize: t.type.body,
                  lineHeight: t.leading(t.type.body),
                  color: t.color.ink,
                }}
              >
                {fill(s('advance.confirm'), { extra: formatPaise(advanceConfirm.extra) })}
              </Text>
              <PrimaryButton
                testID={id + '-advance-yes'}
                label={s('advance.yes')}
                display={display}
                size="md"
                onPress={() => {
                  const option = commits[selectedCommit];
                  if (option !== undefined) onConfirmAdvance(option);
                }}
              />
              <PrimaryButton
                testID={id + '-advance-no'}
                label={s('advance.no')}
                display={display}
                variant="ghost"
                size="md"
                onPress={onCancelAdvance}
              />
            </View>
          )}
          {/*
            THE PARTY ROW LIVES IN THE SCROLLING BODY, NOT THE FOOTER.

            Two reasons, and the second is the one that decided it. It must not
            sit between the amount and the keypad, because the thumb crosses
            that gap on every digit and a control in the path gets hit by
            accident. And the footer is measured against the fold: an extra
            64dp control there pushed the keypad 170px below it at the chrome
            cap in Odia, which `check:layout` refused. The body scrolls, so the
            same control costs the keypad nothing here.

            Rendered only when the engine will accept or demand a party - never
            on a cash sale, which refuses one outright.
          */}
          {rule === 'refused' ? null : (
            <Pressable
              testID={id + '-party'}
              accessibilityRole="button"
              accessibilityLabel={
                partyName === null
                  ? s(partyKind === 'customer' ? 'party.chooseCustomer' : 'party.chooseSupplier')
                  : partyBalance === null
                    ? partyName
                    : balanceName(s, partyName, partyKind, partyBalance)
              }
              onPress={onOpenPartyPicker}
              android_ripple={{ color: t.color.brandSoft }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                minHeight: t.control.lg,
                minWidth: t.touchTarget,
                marginHorizontal: t.space.sm,
                marginBottom: t.space.xs,
                paddingHorizontal: t.space.md,
                borderRadius: t.radius.md,
                backgroundColor: t.color.surface,
                borderWidth: t.hairline,
                borderColor: t.color.inkMuted,
              }}
            >
              <Text
                maxFontSizeMultiplier={t.maxFontScale}
                style={{
                  marginRight: t.space.sm,
                  fontFamily: t.font.regular,
                  fontSize: t.type.label,
                  lineHeight: t.leading(t.type.label),
                  color: t.color.inkMuted,
                }}
              >
                {s(partyKind === 'customer' ? 'party.customer' : 'party.supplier')}
                {rule === 'optional' ? ' · ' + s('party.optional') : ''}
              </Text>
              <Text
                testID={id + '-party-value'}
                maxFontSizeMultiplier={t.maxFontScale}
                style={{
                  flexShrink: 1,
                  fontFamily: t.font.medium,
                  fontSize: t.type.body,
                  lineHeight: t.leading(t.type.body),
                  color: partyName === null ? t.color.brandSoft : t.color.ink,
                  textAlign: 'right',
                }}
              >
                {partyName ??
                  s(partyKind === 'customer' ? 'party.chooseCustomer' : 'party.chooseSupplier')}
              </Text>
              {/*
                ITEM 4: HIS BALANCE, ABOVE THE PAD. After choosing a customer
                nothing on the form said what he owed (U-16, U-17), on the screen
                where that is the question. Read on render from the store, over
                every day this phone holds - the same figure the picker showed.
              */}
              {partyBalance === null ? null : (
                <View
                  testID={id + '-party-balance'}
                  style={{
                    flexBasis: '100%',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  <Text
                    {...t.bodyText}
                    style={{
                      marginRight: t.space.xs,
                      fontFamily: t.font.regular,
                      fontSize: t.type.label,
                      lineHeight: t.leadingUncapped(t.type.label),
                      color: t.color.inkMuted,
                    }}
                  >
                    {s(balanceWord(partyKind, partyBalance))}
                  </Text>
                  <Money
                    testID={id + '-party-balance-amount'}
                    amount={partyBalance < 0 ? subtract(0, partyBalance) : partyBalance}
                    mode={display}
                    size="body"
                  />
                </View>
              )}
            </Pressable>
          )}

          {/*
            THE REASON, BEFORE THE TAP AND NOT AFTER IT.

            This sentence is the one the product was missing. It renders only
            when the commit is genuinely unreachable, it sits directly above the
            control it explains, and it is `negative` because it is the thing
            standing between him and a recorded entry.
          */}
          {/*
            QA-07: ONLY ONCE HE HAS TYPED AN AMOUNT. Red, on a fresh form, before
            he had done anything, it read as the last form's refusal carried over.
            The party row above already says who to choose; this sentence says
            why Add is off, and Add only matters once there is an amount.
          */}
          {partyMissing && draftPaise !== null ? (
            <Text
              testID={id + '-party-required'}
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                marginHorizontal: t.space.sm,
                marginBottom: t.space.xs,
                paddingHorizontal: t.space.md,
                paddingVertical: t.space.xs,
                borderRadius: t.radius.md,
                backgroundColor: t.color.surface,
                fontFamily: t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.negative,
              }}
            >
              {s('party.required')}
            </Text>
          ) : null}
          {overLimit === null ? null : (
            <Text
              testID={id + '-limit-observation'}
              maxFontSizeMultiplier={t.maxFontScale}
              style={{
                marginHorizontal: t.space.sm,
                marginBottom: t.space.xs,
                paddingHorizontal: t.space.md,
                paddingVertical: t.space.xs,
                borderRadius: t.radius.md,
                borderWidth: t.hairline,
                borderColor: t.color.borderStrong,
                backgroundColor: t.color.surfaceRaised,
                fontFamily: t.font.regular,
                fontSize: t.type.body,
                lineHeight: t.leading(t.type.body),
                color: t.color.ink,
              }}
            >
              {fill(s('limit.observation'), {
                name: partyName ?? '',
                would: formatPaise(overLimit.would),
                limit: formatPaise(overLimit.limit),
              })}
            </Text>
          )}
        </>
      }
      empty={lines.length === 0}
      emptyKey={emptyKey}
      onRetry={onRetry}
      onBack={onBack}
      overlay={
        pickingParty ? (
          <PartyPicker
            testID={id + '-picker'}
            store={store}
            s={s}
            kind={partyKind}
            display={display}
            onChoose={onChooseParty}
            onCancel={onCancelPartyPicker}
            newParty={newParty}
          />
        ) : asked !== undefined && cancel !== undefined ? (
          /*
            THE CONFIRM SHOWS WHAT IS BEING CANCELLED - the line as it reads in
            the list, and its figure - so the tap he confirms is the entry he
            meant. With a return or correction on it there is no cancel button,
            only the reason.
          */
          <Sheet
            testID={id + '-cancel-sheet'}
            title={s(linked ? 'cancel.linkedTitle' : 'cancel.title')}
            body={s(linked ? 'cancel.linkedFirst' : 'cancel.body')}
            closeLabel={s('cancel.keep')}
            onClose={cancel.onDismiss}
            display={display}
            showClose={linked}
          >
            <Row testID={id + '-cancel-target'} label={lineLabel(asked)} amount={asked.amount} display={display} />
            {linked ? null : (
              <>
                <PrimaryButton
                  testID={id + '-cancel-keep'}
                  label={s('cancel.keep')}
                  onPress={cancel.onDismiss}
                  display={display}
                />
                <PrimaryButton
                  testID={id + '-cancel-yes'}
                  label={s('cancel.action')}
                  onPress={cancel.onConfirm}
                  display={display}
                  variant="tonal"
                  size="lg"
                />
              </>
            )}
          </Sheet>
        ) : null
      }
      footer={
        <>
          {/*
            MODE IS A CHOICE, NOT AN ACTION - WHICH IS THE WHOLE REDESIGN.

            Every commit used to be its own marigold-filled button, so Cash, UPI
            and Udhar were three equally-loud primaries and the screen had none.
            §9 spends `action` on the one thing a screen is for; spending it
            three times on a choice is what made the sale screen read as an
            alarm, and it is the first thing anyone notices about the build.

            A segment chooses. The marigold key at the foot of the pad commits.
            The commit itself is unchanged - the same `CommitOption` reaches the
            same `Session.commit` and the same IN1-IN7 parser.
          */}
          <Segmented
            testID={id + '-mode'}
            options={commits.map((option, i) => ({
              // The INDEX is the key, not the mode. Two commits on one form can
              // share a payment mode and differ by section - a mode-keyed
              // segment would collapse them into one unselectable pair.
              key: String(i),
              label: s(option.labelKey),
            }))}
            value={String(selectedCommit)}
            onChange={(k) => onSelectCommit(Number(k))}
            display={display}
          />

          <View
            testID={id + '-draft'}
            style={{
              /*
               * WHAT HE IS TYPING IS THE SECOND MOST IMPORTANT THING ON THIS
               * SCREEN, AND IT WAS RENDERED AS A FOOTNOTE.
               *
               * A label and a `figure` sharing one cramped row above the pad, on
               * the same cream as everything else. A column on its own white
               * surface gives the digits somewhere to land, and tells the eye
               * where the number it is building actually appears - which on a
               * pad with no visible text field is the only feedback there is.
               *
               * Tight vertical padding: the footer remains the tightest budget
               * on the screen and those pixels are the difference between the
               * keypad fitting and not at the chrome cap.
               */
              /*
               * A ROW, AND THE WHITE SURFACE IS WHAT ACTUALLY DID THE WORK.
               *
               * A stacked label-over-figure block read better in isolation and
               * cost about 75dp at the chrome cap, because money is uncapped by
               * design and `hero` scales without a ceiling. B31 refused it on
               * every form. What the draft needed was not to be BIGGER but to
               * be somewhere: its own white surface separates it from the cream
               * page and from the tray below, which is the thing that was
               * missing when it sat on the same ground as everything else.
               */
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              // The label, an uncapped lakh figure and a commit button do not
              // share one 360dp line at the chrome cap in Odia. They wrap rather
              // than running off the side - the same decision as the header, for
              // the same reason: money is content and content is never capped.
              flexWrap: 'wrap',
              /*
               * sm, not md: the same 8dp edge as the mode segment above and the
               * keypad below. The sixteen pixels let Add sit beside a typed
               * ₹5,000 at the chrome cap in Focus instead of taking a row of
               * its own - that row was the 13px that put T10's keypad below
               * the fold on CI (Linux run 44348374411).
               */
              paddingHorizontal: t.space.sm,
              /*
               * No vertical padding. HT-60 took it from sm to xs; the last
               * 8px went to the body as well, where the Sales total has to
               * fit under the two links at font 2.0. The label's 1.8 line box
               * is already the breathing room above it.
               */
              backgroundColor: t.color.surface,
              borderTopWidth: t.hairline,
              borderTopColor: t.color.borderStrong,
            }}
          >
            {/*
              THE LABEL STACKS ON THE FIGURE, AND THAT IS THE CHEAP WAY ROUND.

              Three siblings wrapping independently - label, an uncapped lakh
              figure and a button - becomes three full lines at the chrome cap
              in Odia, about 200dp of a screen whose keypad then does not fit.
              Pairing the label with the figure it names makes two columns that
              wrap as one, which is both fewer lines and the more obvious
              reading: this word belongs to this number.
            */}
            <View style={{ flexShrink: 1 }}>
              <Text
                maxFontSizeMultiplier={t.maxFontScale}
                style={{
                  fontFamily: t.font.regular,
                  fontSize: t.type.label,
                  lineHeight: t.leading(t.type.label),
                  color: t.color.inkMuted,
                }}
              >
                {s('formA.amount')}
              </Text>
              <Money
                testID={id + '-draft-amount'}
                amount={draftPaise ?? 0}
                mode={display}
                size="figure"
              />
            </View>
            {/*
              THE COMMIT SITS BESIDE THE FIGURE IT COMMITS.

              It had its own full-width row under the keypad for a while, which
              cost about 80dp and put the pad below the fold at the chrome cap on
              every form. Beside the draft it costs nothing - the row is already
              as tall as the figure - and it reads better: the number he typed
              and the button that files it are one sentence, rather than a button
              at the far end of the screen from the thing it acts on.

              `lg`, not `xl`: the hierarchy on this screen is already settled by
              being the only marigold on it.
            */}
            {/*
              ITEM 6: ADD IS THE STRONGEST CONTROL ON THE FORM. It was the
              smallest and most faded thing on the screen - `md`, top right,
              outlined until an amount existed (U-03, U-04) - while being the
              control pressed forty times a day. It now takes the rest of the
              row beside the figure, at `lg`, directly above the pad, and it is
              ALWAYS a live marigold button: a tap with nothing typed, or with
              nobody chosen, is answered in words by `Session.commit` ("type an
              amount first") rather than by a key that looks dead and says
              nothing. The disabled look is kept for states that are really
              disabled, and on this form there is none.
            */}
            <View style={{ flexGrow: 1, flexBasis: 'auto' }}>
              <PrimaryButton
                testID={id + '-commit'}
                label={s('common.add')}
                display={display}
                size="lg"
                onPress={() => {
                  const option = commits[selectedCommit];
                  if (option !== undefined) onCommit(option);
                }}
              />
            </View>
          </View>

          {/* An entry screen, so the keypad is here - and no bottom nav beside it. */}
          <Keypad onKey={onKey} s={s} mode={display} />
        </>
      }
    >
      {/*
        THE LINES BELONG IN A CARD, like every other list of figures.

        They were drawn straight onto the cream page with full-bleed hairlines
        while the running total directly above them sat on a white card - so
        the two read as different kinds of object when they are the same kind,
        and the day's entries looked like the unstyled part of the screen. §9's
        three surfaces exist for exactly this: the step from ground to card is
        what tells the eye where a group begins, and a rule between rows was
        being asked to do a job it cannot do.
      */}
      <Card testID={id + '-lines'} display={display}>
        {lines.map((e) => (
          <Row
            key={e.id}
            testID={id + '-line-' + e.id}
            label={lineLabel(e) + returnWord(e, store, s)}
            amount={e.amount}
            display={display}
            {...(store.cancelOf(e.id) === undefined ? {} : { struck: true, note: s('cancel.cancelled') })}
            {...(cancellable(e) && cancel !== undefined
              ? { onPress: () => cancel.onAsk(e.id), accessibleLabel: lineLabel(e) + ', ' + s('cancel.action') }
              : {})}
          />
        ))}
      </Card>

      {noteKey ? (
        <Text
          testID={id + '-note'}
          maxFontSizeMultiplier={t.maxFontScale}
          style={{
            padding: t.space.md,
            fontFamily: t.font.regular,
            fontSize: t.type.body,
            lineHeight: t.leading(t.type.body),
            color: t.color.inkMuted,
          }}
        >
          {s(noteKey)}
        </Text>
      ) : null}
    </Shell>
  );
}
