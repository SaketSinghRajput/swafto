/**
 * THE SESSION. Which screen, what has been typed, and what happens when he taps.
 *
 * WHY THIS IS NOT IN THE SCREENS. Every screen in this app is a pure function of
 * its props - no hooks, no state, no effects - which is what lets them be tested
 * without a renderer supporting any of those. The behaviour has to live
 * somewhere, and this is it: one object holding the whole interaction, testable
 * on its own without rendering anything at all.
 *
 * WHY THERE IS NO NAVIGATION LIBRARY. Ten screens and a linear flow. A router
 * would bring a dependency, a native module, a deep-link surface and a
 * lifecycle, to replace an enum and a field. If the flow ever branches enough to
 * need history, this gets REPLACED rather than extended.
 *
 * THE KEYPAD BUILDS A STRING, NOT A NUMBER. Digits are collected as text and the
 * paise value is that text with two zeroes appended. No multiplication, no
 * float, no rounding: '123' becomes 12300 by concatenation, exact by
 * construction rather than exact because the arithmetic happened to be safe.
 * ADR-003 is satisfied here by there being no arithmetic at all.
 *
 * COMMITTING GOES THROUGH THE PARSERS, ALWAYS. `commit` builds a draft and hands
 * it to IN1-IN7. They refuse a credit sale naming nobody, a due date on the
 * wrong section, an amount that is not an integer - and they name the field they
 * refused, which is what the screen shows him. Nothing here writes to the store
 * directly, so no path skips the refusal.
 */
import {
  parseSalesEntry,
  parsePurchaseEntry,
  parseExpenseEntry,
  parseCollectionEntry,
  parsePartyPaymentEntry,
  parseWithdrawalEntry,
  captureCountedCash,
  EntryInputError,
  buildReturnEvent,
  buildSettlement,
  parseAdjustment,
  parseUpiConfirmation,
  parseItemLine,
  parseShopItem,
  parseCreditLimit,
  saleItemised,
  subtract,
  type AdjustmentType,
  type Entry,
  type Paise,
  type ReturnSettlementChoice,
  type Section,
} from '@swafto/formula-engine';
import { PARTY_KIND, type Store } from '../store/index.ts';
import type { KeypadKey } from '../components/Keypad.tsx';
import type { CommitOption } from '../components/EntryForm.tsx';
import { ROUTE_FOR_SECTION } from '../screens/entryRoutes.ts';
import {
  accountantCsv,
  csvFileName,
  reminderText,
  statementText,
  whatsappNumber,
  whatsappUrls,
} from './share.ts';
import type { Language } from '../i18n/strings.ts';
import { match, type MatchResult, type Resolution } from '../chat/match.ts';
import { CONSENT_PURPOSES, PRIVACY_NOTICE_VERSION, type ConsentPurpose, INDIAN_MOBILE } from '@swafto/values';
import type { Mode as DisplayMode, TextSize } from '../theme/tokens.ts';
import type { MyDataPhase } from '../screens/S13.tsx';
import type { DeviceView, DevicesState } from '../screens/S14.tsx';
import { OTP_DIGITS, INVITE_CODE_DIGITS, MAX_ENTRY_PAISE } from '@swafto/values';
import { allows, planOf, type Plan, type PlanAnswer } from './plan.ts';
import type { ProductsResult } from '../net/billing.ts';

export type ScreenId =
  | 'X0'
  /**
   * X1 - onboarding. Reached once from X0 at sign-up and never again.
   */
  | 'X1'
  /**
   * X4 - THE APP-LOCK OFFER (Saket, 2026-11-20). Once, straight after X1, on a
   * phone that can ask for its own screen lock. Never on an install that had
   * already finished setup: X1 is the only way in.
   */
  | 'X4'
  /**
   * T1 IS THREE SCREENS, AND ONLY ONE ROUTE.
   *
   * T2 (first run), T1 (open day) and T3 (closed) are one destination in three
   * states, exactly as the design prototype treats them - its own top-bar test
   * groups T1, T2 and T3 together. Giving each an id would mean every caller
   * that wanted "Today" had to work out which Today, and the first one that got
   * it wrong would show a shopkeeper the entry rails on a day he had closed.
   * `App.tsx` reads the day and renders the right face; there is no state in
   * which the route and the day disagree, because the route does not carry the
   * answer.
   */
  | 'T1'
  | 'T5'
  | 'T6'
  | 'T7'
  | 'T8'
  | 'T9'
  | 'T10'
  | 'T11'
  | 'T12'
  /**
   * T13 - the cash check balanced. A DIFFERENT SCREEN from T12, not a state of
   * it: S03 calls it the highest-leverage screen in the product and says
   * explicitly that it is "not the difference screen with a block removed".
   */
  | 'T13'
  | 'T14'
  /**
   * T18 - RETURN OR EXCHANGE A SALE (§2.3). Reached from the sales form, not a
   * ninth rail: a return is an event, not a closing section (EX-7).
   *
   * NOT T15. The build map's T15 is "Past day - read-only", a different screen,
   * and gen-tasks refuses one id meaning two: the return screen would tick off
   * the past-day screen's eight children. T18 is the first id the build map
   * (frozen source) does not use.
   */
  | 'T18'
  /**
   * T16 - CORRECT A CLOSED DAY (HT-11). Reached from T3's "Post a correction".
   * The closed day is never written; the correction lands on the open day.
   */
  | 'T16'
  /**
   * T19 - a typed adjustment (decision 2). From T5 and back to it, with its
   * own keypad: the amount is the one thing on it he types.
   */
  | 'T19'
  /**
   * I1 - ITEMS IN A SALE (PR-1, Premium). From the sales form; optional, after
   * the sale is saved, never in the way of saving it or closing the day. A free
   * id: the build map has no I series (COMMITTED_SCREENS.after).
   */
  | 'I1'
  | 'P1'
  | 'P2'
  | 'P3'
  /**
   * P6 - A CUSTOMER'S CREDIT LIMIT (R5 FR-6), from P2 and back to it, with its
   * own keypad. Not P5: the build map's P5 is "Edit party", a different screen.
   */
  | 'P6'
  /**
   * REPORTS, which SPEC-DIGEST C-5 makes one of the three tabs.
   *
   * S05's activation ladder has the first close "reveal Reports", so before a
   * single day has been closed there is genuinely nothing to show. The tab is
   * present from the start anyway and says so, because a navigation bar that
   * grows a third item partway through a shopkeeper's second week is a worse
   * surprise than an honest empty state.
   */
  | 'R1'
  /** M1 - the Premium dashboard (PR-6), reached from Reports. Back returns there. */
  | 'M1'
  /**
   * C1 - ASK (FR-8, PR-5). One tap from Today and from Reports, and back to
   * whichever it was opened from - so it has two parents, held in `chat.from`
   * the way A7 holds `recoveryFrom`. Not in the build map: decided after it, so
   * it sits in COMMITTED_SCREENS.after like T19.
   */
  | 'C1'
  /**
   * SETTINGS AND THE THINGS THE STORES REQUIRE.
   *
   * C-5 rules three tabs, so settings is reached from the Today canvas rather
   * than a fourth tab. Most of what hangs off it is not a preference at all -
   * it is what Google Play and the App Store will not publish without, and
   * what the DPDP Act requires:
   *
   *   S1  settings hub
   *   S2  the shop - its name, and the day it starts
   *   S3  language and display
   *   S4  privacy and consent, where a granted purpose can be withdrawn
   *   S5  about: version, and the open-source licences
   *   S6  help, and the named grievance officer DPDP requires
   *   S7  delete this account - Play's in-app deletion path
   *   S8  the confirmation, because deletion is not a one-tap action
   */
  | 'S1'
  | 'S2'
  | 'S3'
  | 'S4'
  | 'S5'
  | 'S6'
  | 'S7'
  | 'S8'
  /** S9 - YOUR ITEMS (PR-1, Premium): the shop's own short list, names only. */
  | 'S9'
  /**
   * S10 - YOUR PLAN (PR-7, R4 §5.4). Reached from S1. Not S9: the S family
   * here is this build's own (S1-S8), and S9/S10 are free in it; S10 is the id
   * the plan work was given.
   */
  | 'S10'
  /** S12 - entries for the accountant (R5 FR-4): a month, then the share sheet. */
  | 'S12'
  /** S13 - your data (M3, DPDP access): everything the server holds, to the share sheet. */
  | 'S13'
  /** S14 - signed-in phones (M3, C-21): the shop's devices, and signing a lost one out. */
  | 'S14'
  /**
   * THE A-SERIES - SIGN-IN, IN THE REFERENCE'S ORDER (store.js SCREEN_ORDER):
   * A1 splash, A2 language, A3 phone, A4 code, A5 a code problem, A6 the
   * session expired, A7 the number changed, A8 log out. X0 sits between A2 and
   * A3 here, because consent must come before the OTP (L-01) and after he has
   * chosen a language he can read it in.
   */
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'A7'
  | 'A8';

/**
 * WHAT WENT WRONG WITH A CODE, as the screen has to say it.
 *
 * The first four are A5's four states (store.js `problemStates`). `offline` and
 * `failed` are not A5 states: the request never reached the server, or the
 * server broke, and the code he typed may be perfectly good - so those stay on
 * the screen he was on with a notice, and never claim the code was wrong.
 */
export type AuthProblem = 'mismatch' | 'expired' | 'locked' | 'noCode' | 'offline' | 'failed';

/** The A5 problems, which are a screen of their own. */
const A5_PROBLEMS: readonly AuthProblem[] = ['mismatch', 'expired', 'locked', 'noCode'];

export interface AuthState {
  /** Up to ten digits as typed, without +91. Never reformatted or completed. */
  readonly phone: string;
  /** Up to `codeDigits` digits as typed (or pasted, cleaned by `codeDigitsOf`). */
  readonly code: string;
  /**
   * INVITE GATE: how the last code request was answered. `sms`: a code went by
   * SMS. `invite`: nothing was sent, and the code is the one SWAFTO gave him.
   * From the server's reply, never guessed; `sms` until a reply says otherwise.
   */
  readonly codeMode: CodeMode;
  /** How many digits the code has: OTP_DIGITS, or INVITE_CODE_DIGITS in invite mode. */
  readonly codeDigits: number;
  /**
   * LIVE DEMO S3-4: WHETHER `codeMode` IS AN ANSWER OR A DEFAULT. A first run
   * has had no reply, and A3 said "a 6-digit code" from the SMS default, then
   * "8-digit" once the server said invite - the screen changed under him. Until
   * a reply (or a mode kept from the last launch) says which, A3 names no count.
   */
  readonly codeModeKnown: boolean;
  readonly problem: AuthProblem | null;
  /** A request is in flight. The screen shows it and does not invite a second tap. */
  readonly busy: boolean;
  /** From the server's 429, exactly as it said it. Null otherwise. */
  readonly retryAfterSeconds: number | null;
  /** How many times a code was RE-sent for this number. */
  readonly resends: number;
  /** A7's two stages that this build can honestly offer. */
  readonly recovery: 'decide' | 'handoff';
  /** HT-26: the screen A7 was opened from, which is where Back returns. */
  readonly recoveryFrom: 'A3' | 'A4';
}

/** Ten digits is an Indian mobile number; the +91 is the screen's, not his. */
const PHONE_DIGITS = 10;

export type CodeMode = 'sms' | 'invite';

/** The box count for a mode, when no reply has said otherwise. */
export const digitsForMode = (mode: CodeMode): number => (mode === 'invite' ? INVITE_CODE_DIGITS : OTP_DIGITS);

/**
 * F-1: A CODE AS IT IS SENT - ASCII DIGITS AND NOTHING ELSE. A pasted
 * "4821 0937", "4821-0937" or a WhatsApp line with the code in it would
 * otherwise reach the server with its space and be refused before a single
 * digit was compared. Devanagari, Odia and Arabic-Indic digits are the same
 * numbers in another script, so they become 0-9; everything else is dropped.
 * Nothing is added or guessed: the result is the digits that were there, in
 * their order.
 */
const DIGIT_ZEROS = [0x30, 0x0966, 0x0b66, 0x0660, 0x06f0] as const;
export function codeDigitsOf(raw: string): string {
  let out = '';
  for (const ch of raw) {
    const cp = ch.codePointAt(0) ?? 0;
    const zero = DIGIT_ZEROS.find((z) => cp >= z && cp <= z + 9);
    if (zero !== undefined) out += String.fromCharCode(0x30 + (cp - zero));
  }
  return out;
}

/**
 * What the consent screen produces: one decision per purpose, plus the version
 * of the notice he was actually shown.
 *
 * THE VERSION IS PART OF THE DECISION. A consent record that does not say WHICH
 * notice was agreed to cannot answer the only question that matters when the
 * notice changes - and the notice will change. The API demands it on every
 * consent write for the same reason.
 */
export interface ConsentDecision {
  readonly noticeVersion: string;
  readonly locale: Language;
  readonly granted: readonly ConsentPurpose[];
}

/** The parser that owns each section. The section decides; the caller never does. */
const PARSER_FOR = {
  cash_sales: parseSalesEntry,
  upi_sales: parseSalesEntry,
  udhar_sales: parseSalesEntry,
  purchase: parsePurchaseEntry,
  expense: parseExpenseEntry,
  udhar_collection: parseCollectionEntry,
  party_payment: parsePartyPaymentEntry,
  withdrawal: parseWithdrawalEntry,
} as const;

/**
 * How many digits may go into one amount.
 *
 * Eight is ten million rupees in a single entry. Less a validation rule than a
 * guard against a stuck key becoming a figure nobody notices is absurd.
 */
const MAX_DIGITS = 8;

/**
 * C-09: THE LARGEST SINGLE ENTRY is `MAX_ENTRY_PAISE` (Rs 1 crore, a reversible
 * default shared with the API, which refuses above it). The phone says no
 * first, in words, instead of queueing a row that can never sync.
 */
/** Would these typed rupee digits be above the ceiling? Digits are whole rupees; paise are appended. */
const overEntryMax = (digits: string): boolean => Number(digits + '00') > MAX_ENTRY_PAISE;

/** HT-22: see `#settleUntil`. Twice Android's 300 ms double-tap timeout. */
const PICKER_SETTLE_MS = 600;

export interface SessionState {
  readonly screen: ScreenId;
  /** What the keypad has built, in paise. Null means he has not typed. */
  readonly draftPaise: Paise | null;
  /** The counted cash, once he has typed it on T11. */
  readonly countedPaise: Paise | null;
  readonly reason: string | null;
  readonly language: Language;
  readonly display: DisplayMode;
  /**
   * The last refusal, as the parser phrased it, with the field it names - so it
   * can appear beside the input rather than as a banner he must map back to a box.
   */
  readonly lastRefusal: {
    readonly field: string;
    readonly message: string;
    /** HT-37: an item line over its sale - what is left of the sale to record, derived at refusal. */
    readonly left?: Paise;
  } | null;
  /**
   * The optional purposes he has turned ON, and nothing else. The required one
   * is not held here: it is not a choice, and keeping it out means there is no
   * state in which it could be recorded as refused while the account exists.
   */
  readonly grantedConsents: readonly ConsentPurpose[];
  /**
   * Which job X0 is doing: taking consent before an account exists, or showing
   * what he already agreed to so he can change it.
   */
  readonly consentMode: 'signup' | 'manage';
  /**
   * Which party P2 or P3 is about. Null everywhere else - a party page with no
   * party is not a state this app can be in, and the router refuses to render
   * one rather than showing an empty ledger with no name on it.
   */
  readonly partyId: string | null;
  /**
   * What he typed on X1. Held here because X1 is a controlled screen and there
   * is nowhere else yet: `StoreState.shopId` is assigned at sign-up and the
   * shop record itself has no local home (the `pending-sign-in` placeholder in
   * Root.tsx). So the name survives the session and no longer, which is stated
   * rather than disguised.
   */
  readonly shopName: string;
  /**
   * WHICH PERSON THE ENTRY BEING TYPED IS FOR - the field whose absence was the
   * worst defect in this product.
   *
   * `SessionOptions.selectedPartyId` has existed since the first draft of this
   * class and NOTHING EVER SUPPLIED IT. `host.tsx` constructs the real session
   * without it, so it always returned undefined, so every party-requiring
   * parser threw, so `commit` swallowed the error into `lastRefusal` - which no
   * screen renders. Three of the six actions on Today committed to exactly
   * those sections. A shopkeeper tapped Credit, typed an amount, tapped Add,
   * and the app did nothing whatsoever. Udhar could not be recorded at all.
   *
   * It lives in STATE rather than in an option because it is something the user
   * chooses mid-entry, which means it must survive a re-render and be visible
   * to the form, so the commit can be disabled with a reason BEFORE the tap.
   */
  readonly entryPartyId: string | null;
  /**
   * HT-44: the party page a form was opened from, so Back returns there and
   * not to the form's own parent (Today). Tied to the form's screen: on any
   * other screen it is ignored, and `goTo` clears it.
   */
  readonly entryFrom: { readonly screen: ScreenId; readonly back: ScreenId } | null;
  /** HT-43: the phone number being typed on P2 for a customer saved without one. */
  readonly phoneDraft: string;
  /**
   * Whether the party picker is open over the current screen.
   *
   * A FLAG, NOT A SCREEN, and that is deliberate. Routing to a picker would go
   * through `goTo`, which clears the draft - so choosing a customer would erase
   * the amount just typed, which is the same class of bug one step along. An
   * overlay keeps the form mounted and the digits intact.
   *
   * It is also not a React Native `Modal`: a Modal portals out of the tree, so
   * the contact sheet would photograph an empty screen and `check:layout` would
   * measure nothing. An in-tree overlay stays visible to both instruments.
   */
  readonly pickingParty: boolean;
  /**
   * QA-03 (CTO decision, 2026-11-18): A COLLECTION OR A PAYMENT ABOVE WHAT IS
   * OWED IS HELD, NOT SAVED, until he confirms it as an advance. `extra` is the
   * excess, derived at the tap from the party's balance and the draft. Null when
   * nothing is waiting. Any change to the draft, the person, the segment or the
   * screen drops it, so a confirmation always matches what is on the form.
   */
  readonly advanceConfirm: { readonly extra: Paise } | null;
  /**
   * WHICH SEGMENT OF THE CURRENT ENTRY FORM IS LIVE.
   *
   * It lives here because `T8.tsx` said it should - "It lives in the Session
   * like every other piece of state - this screen holds nothing" - and then
   * nothing ever put it here. `EntryForm` and all four form screens declared
   * `selectedCommit` and `onSelectCommit`; `App.tsx` passed neither; the only
   * callers that ever did were the four `.test.tsx` files. So the segmented
   * control rendered, highlighted on tap, and changed nothing, and every form
   * was frozen on its first option: no UPI sale, no credit sale, no supplier
   * payment and no non-cash expense could be recorded by any path in the app.
   *
   * Worse than unreachable: three Today tiles - Credit, Collect and Pay - all
   * open T8, whose first commit is a collection. Tapping "Pay" to record money
   * going OUT to a supplier recorded money coming IN from a customer, with
   * nothing on screen to contradict it.
   *
   * `openSection` sets it from the tile that was tapped, so the segment always
   * agrees with the word the shopkeeper pressed.
   */
  readonly selectedCommit: number;
  /**
   * WHICH SECTION THE OPEN FORM WAS OPENED FOR, which is not the same question
   * as which screen is showing.
   *
   * Form C is two forms. `purchase` and `expense` share T9 and differ only in
   * the commit table they are handed - buying stock and buying tea are the same
   * shape and different lines in the day sheet. Without this field T9 cannot
   * tell which it is, and the old build resolved that by having no purchase
   * commit at all: every one of T9's five options wrote `section: 'expense'`,
   * so the Purchase tile filed stock as tea money, silently, while T5 and T11
   * went on displaying a purchase total nothing could ever add to.
   *
   * Null on every screen that is not an entry form.
   */
  readonly entrySection: Entry['section'] | null;
  /**
   * F-10: A NEW CUSTOMER OR SUPPLIER BEING TYPED INSIDE THE PICKER. Null when
   * the picker is showing its list.
   *
   * Held as the text he typed, never as anything derived from it. The screens
   * are pure functions with no state of their own, so a half-typed name has to
   * live here. It sits beside `draftPaise` rather than replacing it, which is
   * what lets the amount survive naming a new customer.
   */
  readonly newParty: { readonly name: string; readonly phone: string } | null;
  /**
   * USABILITY item 6: THE ENTRY THIS FORM JUST SAVED, by id - so the form can
   * say "Saved ₹50 · Cash" and put that row at the top. An id, never a copy of
   * the figure: the form reads the entry back from the store, so what it says
   * was saved is what the book holds. Cleared when the form is left.
   */
  readonly lastSavedId?: string | null;
  /**
   * CANCEL THIS ENTRY: the line he tapped on an entry form, waiting on the
   * confirm sheet. Null when no sheet is up. Cleared before the cancel is
   * written, so a second tap on the confirm finds nothing to cancel.
   */
  readonly cancelAsk?: string | null;
  /** The entry just cancelled, by id - for "Enter it again correctly". */
  readonly cancelledId?: string | null;
  /** The A-series: what he has typed into sign-in, and what went wrong with it. */
  readonly auth: AuthState;
  /**
   * F-22: what deleting the account actually did, shown on S8 until he taps
   * Done. Absent until a deletion has happened. Offline and failed never land
   * here - they are refusals, because nothing was deleted.
   */
  readonly deletion?: DeletionOutcome | null;
  /** X1: the keypad is up because question 4 (opening cash) was tapped. */
  readonly onboardingKeypad: boolean;
  /** T18: the return or exchange being typed. Null on every other screen. */
  readonly returnFlow: ReturnFlow | null;
  /** T16: the correction being typed, and what became of the last one. */
  readonly correction: CorrectionFlow | null;
  /** T19: the kind of adjustment chosen from the fixed list. Never pre-chosen. */
  readonly adjustmentType?: AdjustmentType | null;
  /** C1: the conversation. Null everywhere else - it is not kept once he leaves. */
  readonly chat?: ChatState | null;
  /**
   * PR-7 · THE PLAN, AND THE ONE FIELD EVERY PREMIUM SCREEN ASKS:
   * `allows(session.state.plan, feature)`.
   *
   * NEVER SET DIRECTLY. It is derived, on every state change, from
   * `planAnswer` (the server's last answer, cached on disk by the host) and
   * the clock: past the answer's `until` it is 'free', offline or not, until
   * the server is asked again. A plan held as its own field would stay
   * 'premium' on a phone that never came back online.
   */
  readonly plan: Plan;
  /** What the server last said, as it said it. Null before it has ever been asked. */
  readonly planAnswer: PlanAnswer | null;
  /** S10: what Play offers to buy. Null until asked; `unavailable` while buying is not open. */
  readonly planOffer: ProductsResult | null;
  /** S10: a preview or a purchase is in flight; the buttons wait. */
  readonly planBusy: boolean;
  /** S10: the outcome of the last action, said once, in words. Never a nag. */
  readonly planNotice: PlanNotice | null;
  /** I1: the item line being typed. Null on every other screen. */
  readonly itemFlow?: ItemFlow | null;
  /** S9: the item name as he is typing it, never anything derived from it. */
  readonly itemName?: string;
  /**
   * R5 FR-3 - THE APP LOCK. `appLock` is his setting; `locked` says the cover
   * (S11) is up. A COVER, NOT A ROUTE: locking never calls `goTo`, so the
   * screen he was on and the digits he had typed are exactly where he left
   * them when he unlocks. The policy (when to lock, what a failed confirm
   * means) is the host's - this class only holds the answer.
   */
  readonly appLock?: boolean;
  readonly locked?: boolean;
  /**
   * 'paused': the lock is on but the phone has no screen lock any more, so he
   * was let in (host.tsx says why). 'noScreenLock': he tried to turn it on and
   * the phone has none. Null otherwise.
   */
  readonly lockNote?: 'paused' | 'noScreenLock' | null;
  /**
   * M3 (M2-approved): "Exit the app?" is up over Today. A hardware Back on
   * Today used to finish the activity with no question; now the first Back
   * asks and a second Back - or "Stay" - puts the question away.
   */
  readonly exitPrompt?: boolean;
  /**
   * M3: in manage mode, the purpose he has just turned OFF - so X0 can say it
   * took effect now. Cleared by the next toggle and by leaving the screen.
   */
  readonly consentWithdrawn?: ConsentPurpose | null;
  /** M3: the text-size picker's choice (V2 3.15). Absent is Normal. */
  readonly textSize?: TextSize;
  /** M3, S13: where the one export request stands. */
  readonly myData?: MyDataPhase;
  /** M3, S14: the device list as the server last gave it, and any sign-out being asked. */
  readonly devices?: DevicesState;
  /**
   * RTI-7: another phone signed in to this shop in the last 72 hours and has
   * not been dismissed here. Set by the host from `GET /v1/devices` on launch
   * and foreground; absent or null draws nothing.
   */
  readonly newPhone?: NewPhone | null;
}

/**
 * RTI-7: THE DAY A SERVER STAMP FELL ON, ON THIS PHONE'S WALL CLOCK. The
 * server stamps in UTC; a phone in India signed in at 01:30 IST was signed in
 * on the later date. The offset is read from the injected `now` (`localIso`
 * carries it), so nothing here reads a clock. 'YYYY-MM-DD', or '' when the
 * stamp is unreadable - a date that cannot be read is not drawn as a guess.
 */
export function localDateOf(stamp: string, nowIso: string): string {
  const at = Date.parse(stamp);
  if (Number.isNaN(at)) return '';
  const m = /([+-])(\d{2}):?(\d{2})$/.exec(nowIso);
  const offsetMs = m ? (m[1] === '-' ? -1 : 1) * (parseInt(m[2] as string, 10) * 60 + parseInt(m[3] as string, 10)) * 60_000 : 0;
  return new Date(at + offsetMs).toISOString().slice(0, 10);
}

/** RTI-7: the one new phone Today tells him about. `createdAt` is the server's stamp. */
export interface NewPhone {
  readonly id: string;
  readonly createdAt: string;
}

/**
 * ONE QUESTION AND WHAT IT WAS UNDERSTOOD AS - NEVER ITS ANSWER.
 *
 * The answer is a figure, and a figure kept here would be the stored total this
 * product refuses to have: C1 works every answer out again on each render, so a
 * sale typed after the question still moves it. `question` is null when a chip
 * was tapped rather than a sentence typed.
 */
export interface ChatTurn {
  readonly question: string | null;
  readonly result: MatchResult;
}

export interface ChatState {
  /** Where Back goes: the tab it was opened from. */
  readonly from: 'T1' | 'R1';
  /** What is in the text field. A question, never a figure for the ledger. */
  readonly draft: string;
  readonly turns: readonly ChatTurn[];
}

/** A conversation is a screenful, not a history; the oldest turns fall off. */
const CHAT_TURNS_KEPT = 20;

/**
 * What S10 says after he acts. `notOpen`: buying is not open yet (Play is not
 * set up, R4-HA1/3/4). `verifyLater`: Play took the purchase and the server
 * has not confirmed it yet - it is kept and re-sent, never lost.
 */
export type PlanNotice = 'previewStarted' | 'notOpen' | 'offline' | 'failed' | 'pending' | 'verifyLater' | 'purchased';

/**
 * I1'S STATE - what he chose and typed. TWO FIELDS ON ONE KEYPAD: how many
 * (a count) and the amount (paise). Neither is ever pre-filled.
 */
export interface ItemFlow {
  readonly saleId: string | null;
  /** An item id from his list, 'other', or null until he chooses. */
  readonly itemId: string | null;
  readonly field: 'quantity' | 'amount';
  readonly quantity: number | null;
  readonly amount: Paise | null;
}

const ITEM_START: ItemFlow = { saleId: null, itemId: null, field: 'quantity', quantity: null, amount: null };

/**
 * T18'S STATE - what he has chosen and typed, never a figure derived from it.
 *
 * TWO AMOUNTS ON ONE KEYPAD, for an exchange: the value of what came back and
 * the price of what went out. `field` says which one the keypad is filling; each
 * keeps its own digits, so switching between them never retypes or loses one.
 */
export interface ReturnFlow {
  /** The sale being returned. Null while he is choosing one. */
  readonly saleId: string | null;
  /** Or: a return still pending, being settled now. */
  readonly settleId: string | null;
  readonly settlement: ReturnSettlementChoice;
  readonly field: 'returned' | 'replacement';
  readonly returned: Paise | null;
  readonly replacement: Paise | null;
  /** How an exchange's price difference was paid. */
  readonly differenceMode: 'cash' | 'upi' | 'udhar';
  /** How a pending return is being settled. */
  readonly settleMode: 'cash' | 'upi' | 'udhar';
  /** The return just recorded, so the screen can say what state it is in. */
  readonly recordedId: string | null;
}

/** T16's state. `outcome` says plainly whether the correction is in the book or waiting. */
export interface CorrectionFlow {
  readonly originalId: string | null;
  readonly outcome: 'recorded' | 'held' | null;
}

const RETURN_START: ReturnFlow = {
  saleId: null,
  settleId: null,
  settlement: 'cash',
  field: 'returned',
  returned: null,
  replacement: null,
  differenceMode: 'cash',
  settleMode: 'cash',
  recordedId: null,
};

/**
 * `scheduled`: the server accepted the request (it purges at `erasesAt`) and
 * this phone's book is wiped. `local`: no session, so only this phone's book
 * was wiped and no server account was touched.
 */
export type DeletionOutcome =
  | { readonly kind: 'scheduled'; readonly erasesAt: string }
  | { readonly kind: 'local' };

/**
 * An Indian mobile number: ten digits, the first 6-9. Optional on a party; if
 * he gives one it must be a whole number, because the API refuses anything
 * outside 8-16 characters and a stray digit is a customer nobody can ring.
 */
/** The API's own limit on a party name (sync/routes.ts, maxLength 120). */
const PARTY_NAME_MAX = 120;

export interface SessionOptions {
  readonly language?: Language;
  readonly display?: DisplayMode;
  /** ISO-8601 UTC. Injected, so a test never races a real clock. */
  readonly now: () => string;
  /** Entry ids come from here: stable in a test, unique in life. */
  readonly newId: () => string;
  /** Which party a party-shaped entry is for. The picker is a later screen. */
  readonly selectedPartyId?: () => string | undefined;
  /**
   * Which screen the session opens on. The host decides: X0 when there is no
   * account yet, T1 when there is. This class does not know whether a token
   * exists, and should not - that is the host's question.
   */
  readonly screen?: ScreenId;
  /**
   * The version of the notice this build ships, so a decision carries the
   * version he was actually shown rather than whatever the server says later.
   */
  readonly noticeVersion?: string;
  /**
   * The number this handset last signed in with, so A6 and A8 can name it
   * after a restart. The host reads it from disk; this class never does.
   */
  readonly phone?: string;
  /** R5 FR-3: the app-lock setting as last saved. Locked from the first frame if on. */
  readonly appLock?: boolean;
  /** M3: the text size as last saved (V2 3.15). */
  readonly textSize?: TextSize;
  /** INVITE GATE: how the last code request was answered, as last saved, so A3 says it first time. */
  readonly codeMode?: CodeMode;
  /**
   * X4: whether setup ends by offering the app lock. The host says yes when
   * it has the phone's lock to ask (a device bridge); without one there is
   * nothing the offer could turn on, so setup goes straight to Today.
   */
  readonly offerAppLock?: boolean;
}

export class Session {
  readonly #store: Store;
  readonly #options: SessionOptions;
  #digits = '';
  /**
   * HT-22: until when (ms) the keypad ignores a press, because the sheet that
   * was over it has just closed on a tap. A triple tap on "Save and choose"
   * closed the picker on the first tap and typed 8 on the keypad underneath
   * with the third. The window is twice Android's double-tap timeout
   * (ViewConfiguration.DOUBLE_TAP_TIMEOUT, 300 ms), so the rest of a burst
   * that closed the sheet lands on nothing; a deliberate first digit, which
   * needs him to look at the keypad, comes later than that.
   */
  #settleUntil = 0;

  /*
   * THE STATE, AND THE REASON IT IS BEHIND AN ACCESSOR.
   *
   * Nothing told React when this changed. `App` is a pure function of
   * `session.state`, read at render time, with no useState and no
   * subscription anywhere; `Session` had no listeners. So every tap worked -
   * `toggleConsent` really did flip the value - and the screen never redrew.
   * On a device that is an app where nothing responds to anything.
   *
   * It passed 1,231 tests because the tests re-render BY HAND:
   *
   *     let tree = render(<App session={s} />);
   *     s.toggleConsent('sms_reminders');
   *     tree = render(<App session={s} />);     // session.spec.tsx:250-252
   *
   * which is the one thing a real app never does.
   *
   * `#inner` holds the value and the private accessors wrap it, so all twenty
   * `this.#state = ...` assignments elsewhere in this class notify without
   * being touched. Rewriting twenty sites would have been twenty chances to
   * miss one, and the one missed is a screen that freezes only sometimes.
   */
  #inner!: SessionState;
  readonly #listeners = new Set<() => void>();

  get #state(): SessionState {
    return this.#inner;
  }

  set #state(next: SessionState) {
    // PR-7: the plan is re-derived from the server's answer and the clock on every change.
    this.#inner = { ...next, plan: planOf(next.planAnswer, this.#options.now()) };
    for (const listener of this.#listeners) listener();
  }

  /**
   * Called on every state change. Returns the unsubscribe.
   *
   * `useSyncExternalStore` in the composition root is the caller that matters;
   * it is React's own answer to exactly this shape, and it handles the tearing
   * and the StrictMode double-subscribe that a hand-rolled useEffect gets
   * wrong.
   */
  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  constructor(store: Store, options: SessionOptions) {
    this.#store = store;
    this.#options = options;
    this.#state = {
      screen: options.screen ?? 'T1',
      partyId: null,
      shopName: store.state.shopName ?? '',
      draftPaise: null,
      countedPaise: null,
      reason: null,
      language: options.language ?? 'en',
      display: options.display ?? 'comfort',
      lastRefusal: null,
      grantedConsents: [],
      /*
       * Signing up until something says otherwise. `openConsentSettings` is the
       * only way into manage mode, because it is the only path that has the
       * server's current answers to show him.
       */
      consentMode: 'signup',
      entryPartyId: null,
      entryFrom: null,
      phoneDraft: '',
      pickingParty: false,
      advanceConfirm: null,
      selectedCommit: 0,
      entrySection: null,
      newParty: null,
      onboardingKeypad: false,
      returnFlow: null,
      correction: null,
      plan: 'free',
      planAnswer: null,
      planOffer: null,
      planBusy: false,
      planNotice: null,
      auth: {
        phone: options.phone ?? '',
        code: '',
        problem: null,
        busy: false,
        retryAfterSeconds: null,
        resends: 0,
        recovery: 'decide',
        recoveryFrom: 'A3',
        codeMode: options.codeMode ?? 'sms',
        codeDigits: digitsForMode(options.codeMode ?? 'sms'),
        codeModeKnown: options.codeMode !== undefined,
      },
      appLock: options.appLock === true,
      // Cold start with the lock on: covered before anything is drawn.
      locked: options.appLock === true,
      lockNote: null,
      ...(options.textSize === undefined || options.textSize === 'normal' ? {} : { textSize: options.textSize }),
    };
  }

  /** R5 FR-3: the host's verdict on the lock. Never touches the screen or the draft. */
  setLock(patch: { readonly appLock?: boolean; readonly locked?: boolean; readonly lockNote?: 'paused' | 'noScreenLock' | null }): void {
    this.#state = { ...this.#state, ...patch };
  }

  get state(): SessionState {
    /*
     * PR-7: a premium answer expiring while he sits on one screen must still
     * end on time. The plan is re-derived on READ as well as on write; the
     * object is replaced only when the plan actually changed, so the identity
     * `useSyncExternalStore` compares is stable otherwise.
     */
    const plan = planOf(this.#inner.planAnswer, this.#options.now());
    if (plan !== this.#inner.plan) this.#inner = { ...this.#inner, plan };
    return this.#inner;
  }

  get store(): Store {
    return this.#store;
  }

  /**
   * HT-59: THE SALES DRAFT, PARKED WHILE HE IS ON ONE OF ITS OWN LINKS.
   * "Add items to a sale" and "Return or exchange a sale" open I1 and T18 from
   * T7; going there used to wipe a typed, unsaved figure, so Back found ₹0.00
   * and nothing in the book. It is kept only across T7 -> I1/T18 -> T7: any
   * other screen drops it, so it never lands on another form.
   */
  #parkedSale: Pick<SessionState, 'draftPaise' | 'selectedCommit' | 'entryPartyId' | 'entryFrom'> & {
    readonly digits: string;
  } | null = null;

  goTo(screen: ScreenId): void {
    const from = this.#state.screen;
    // Any navigation answers "Exit the app?" with "no", and a withdrawal note belongs to X0 alone.
    if (this.#state.exitPrompt === true || (this.#state.consentWithdrawn ?? null) !== null) {
      this.#state = { ...this.#state, exitPrompt: false, consentWithdrawn: null };
    }
    const child = screen === 'I1' || screen === 'T18';
    const parked =
      from === 'T7' && child
        ? {
            digits: this.#digits,
            draftPaise: this.#state.draftPaise,
            selectedCommit: this.#state.selectedCommit,
            entryPartyId: this.#state.entryPartyId,
            entryFrom: this.#state.entryFrom,
          }
        : (from === 'I1' || from === 'T18') && (child || screen === 'T7')
          ? this.#parkedSale
          : null;
    this.#parkedSale = child ? parked : null;
    // The draft belongs to the screen that was collecting it - and so does the
    // party it was being recorded against. Leaving `entryPartyId` set would
    // carry Ramesh silently onto the next form.
    this.#digits = '';
    this.#state = {
      ...this.#state,
      screen,
      draftPaise: null,
      lastRefusal: null,
      entryPartyId: null,
      entryFrom: null,
      phoneDraft: '',
      pickingParty: false,
      advanceConfirm: null,
      selectedCommit: 0,
      entrySection: null,
      onboardingKeypad: false,
      adjustmentType: null,
      returnFlow: null,
      correction: null,
      chat: screen === 'C1' ? (this.#state.chat ?? null) : null,
      planNotice: null,
      itemFlow: null,
      itemName: '',
      lastSavedId: null,
      cancelAsk: null,
      cancelledId: null,
    };
    this.#fieldDigits = { returned: '', replacement: '' };
    this.#itemDigits = { quantity: '', amount: '' };
    if (screen === 'T7' && parked !== null) {
      const { digits, ...kept } = parked;
      this.#digits = digits;
      this.#state = { ...this.#state, ...kept };
    }
  }

  /* ---- PR-1 · items (Premium) ---------------------------------------- */

  /** The plan PR-7 derives from the server's answer - the one source; never set here. */
  get plan(): Plan {
    return this.state.plan;
  }

  #itemDigits: Record<ItemFlow['field'], string> = { quantity: '', amount: '' };

  #item(patch: Partial<ItemFlow>): void {
    const flow = this.#state.itemFlow ?? ITEM_START;
    this.#state = { ...this.#state, itemFlow: { ...flow, ...patch }, lastRefusal: null };
  }

  /** I1 on its list of today's sales. Absent on a free plan: nothing opens. */
  openItems(): void {
    if (!allows(this.plan, 'items')) return;
    this.goTo('I1');
    this.#state = { ...this.#state, itemFlow: ITEM_START };
  }

  /** He tapped one of today's sales: its lines, and a fresh, empty line to type. */
  chooseItemSale(saleId: string): void {
    this.#itemDigits = { quantity: '', amount: '' };
    this.#item({ ...ITEM_START, saleId });
  }

  /** Which item, or 'other'. What he has typed survives the change. */
  chooseLineItem(itemId: string): void {
    this.#item({ itemId });
  }

  /**
   * HT-61: "Change item" in I1's footer. Back to no item, so the list is in
   * view again; how many and the amount he typed are kept, exactly as when he
   * picks a different item directly.
   */
  clearLineItem(): void {
    this.#item({ itemId: null });
  }

  setItemField(field: ItemFlow['field']): void {
    this.#item({ field });
  }

  /** The keypad on I1: a COUNT into quantity, PAISE into amount. */
  #pressItem(key: KeypadKey, field: ItemFlow['field']): void {
    let digits = this.#itemDigits[field];
    if (key === 'clear') digits = '';
    else if (key === 'back') digits = digits.slice(0, -1);
    else if (digits.length < MAX_DIGITS) {
      const next = digits === '0' ? key : digits + key;
      if (field === 'amount' && overEntryMax(next)) {
        this.#refuseTooLarge();
        return;
      }
      digits = next;
    }
    this.#itemDigits[field] = digits;
    // Concatenation, never multiplication, for the amount (ADR-003).
    if (field === 'quantity') this.#item({ quantity: digits === '' ? null : Number(digits) });
    else this.#item({ amount: digits === '' ? null : Number(digits + '00') });
  }

  /**
   * I1: one line, through the parser the server uses, checked by the store
   * against the sale (never more than it). On success the next line starts
   * empty on the same sale; the refusal names the field otherwise.
   */
  saveItemLine(): boolean {
    const flow = this.#state.itemFlow;
    try {
      if (!allows(this.plan, 'items')) throw new Error('items per sale are part of Premium');
      if (!flow || flow.saleId === null) throw new EntryInputError('entryId', 'choose a sale first');
      if (flow.itemId === null) throw new EntryInputError('itemId', 'choose an item, or Other');
      this.#store.addItemLine(
        parseItemLine({
          id: this.#options.newId(),
          dayId: this.#store.state.day.date,
          entryId: flow.saleId,
          itemId: flow.itemId === 'other' ? undefined : flow.itemId,
          quantity: flow.quantity,
          amount: flow.amount,
          createdAt: this.#options.now(),
        }),
      );
    } catch (e) {
      /*
       * HT-37: an amount typed and refused is over the sale, not missing. Say
       * what is left of the sale to record, so he is not told to "type an
       * amount" while one is on screen.
       */
      const sale = flow?.saleId ? this.#store.state.entries.find((x) => x.id === flow.saleId) : undefined;
      const left = sale ? subtract(sale.amount, saleItemised(sale, this.#store.saleLines(sale.id)).itemised) : null;
      const over = e instanceof EntryInputError && e.field === 'amount' && left !== null && (flow?.amount ?? 0) > left;
      this.#state = {
        ...this.#state,
        lastRefusal: over
          ? { field: 'amount', message: (e as Error).message, left: left! }
          : e instanceof EntryInputError
            ? { field: e.field, message: e.message }
            : { field: 'item', message: (e as Error).message },
      };
      return false;
    }
    this.chooseItemSale(flow.saleId);
    return true;
  }

  /** S9: the name as typed, held here because screens hold nothing. */
  setItemName(name: string): void {
    this.#state = { ...this.#state, itemName: name, lastRefusal: null };
  }

  /** S9: one name onto his list. Premium only; a list from before a lapse stays readable. */
  addItem(): boolean {
    try {
      if (!allows(this.plan, 'items')) throw new Error('adding items is part of Premium');
      this.#store.addItem(
        parseShopItem({ id: this.#options.newId(), name: this.#state.itemName ?? '', createdAt: this.#options.now() }),
      );
    } catch (e) {
      this.#state = {
        ...this.#state,
        lastRefusal:
          e instanceof EntryInputError ? { field: e.field, message: e.message } : { field: 'item', message: (e as Error).message },
      };
      return false;
    }
    this.#state = { ...this.#state, itemName: '', lastRefusal: null };
    return true;
  }

  /* ---- C1 · ask (FR-8, PR-5) ----------------------------------------- */

  /** Open the chat from Today or Reports, empty. */
  openChat(from: 'T1' | 'R1'): void {
    this.goTo('C1');
    this.#state = { ...this.#state, chat: { from, draft: '', turns: [] } };
  }

  /** What he has typed so far. Held as typed: nothing completes or corrects it. */
  setChatDraft(text: string): void {
    const chat = this.#state.chat;
    if (!chat) return;
    this.#state = { ...this.#state, chat: { ...chat, draft: text } };
  }

  #turn(turn: ChatTurn): void {
    const chat = this.#state.chat;
    if (!chat) return;
    this.#state = {
      ...this.#state,
      chat: { ...chat, draft: '', turns: [...chat.turns, turn].slice(-CHAT_TURNS_KEPT) },
    };
  }

  /** The last thing he was understood to ask, for "and last month?". */
  #previous(): Resolution | undefined {
    const turns = this.#state.chat?.turns ?? [];
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      const r = (turns[i] as ChatTurn).result;
      if (r.kind === 'resolved') return r.resolution;
    }
    return undefined;
  }

  /** Ask what is in the field. An empty field asks nothing. */
  askChat(): void {
    const text = this.#state.chat?.draft.trim() ?? '';
    if (text === '') return;
    this.#turn({
      question: text,
      result: match(text, { parties: this.#store.state.parties, previous: this.#previous() }),
    });
  }

  /** A suggested question or a "did you mean" chip: already resolved, so nothing is matched. */
  askChatChip(resolution: Resolution): void {
    this.#turn({
      question: null,
      result: { kind: 'resolved', resolution, why: { example: '', shared: [], score: 1, runnerUp: 0 }, followUp: false },
    });
  }

  /* ---- T18 · return or exchange a sale (§2.3) ------------------------ */

  /** Each T18 amount keeps its own digits; the keypad fills the one `field` names. */
  #fieldDigits: Record<ReturnFlow['field'], string> = { returned: '', replacement: '' };

  #flow(patch: Partial<ReturnFlow>): void {
    const flow = this.#state.returnFlow ?? RETURN_START;
    this.#state = { ...this.#state, returnFlow: { ...flow, ...patch }, lastRefusal: null };
  }

  /** Open T18 on its list of sales. */
  openReturns(): void {
    this.goTo('T18');
    this.#state = { ...this.#state, returnFlow: RETURN_START };
  }

  /** He tapped a sale: the form for returning it, both amounts empty. */
  chooseReturnSale(saleId: string): void {
    this.#fieldDigits = { returned: '', replacement: '' };
    this.#flow({ ...RETURN_START, saleId, settleId: null, recordedId: null });
    this.#state = { ...this.#state, entryPartyId: null };
  }

  /** He tapped a return still pending: the form for settling it. */
  chooseSettleReturn(returnId: string): void {
    this.#fieldDigits = { returned: '', replacement: '' };
    this.#flow({ ...RETURN_START, settleId: returnId, saleId: null, recordedId: null });
  }

  /** Back to the list, keeping nothing half-typed. */
  backToReturnList(): void {
    this.#fieldDigits = { returned: '', replacement: '' };
    this.#flow({ ...RETURN_START, recordedId: this.#state.returnFlow?.recordedId ?? null });
  }

  setReturnSettlement(settlement: ReturnSettlementChoice): void {
    // Leaving "exchange" leaves no replacement figure behind to be committed by accident.
    if (settlement !== 'exchange') this.#fieldDigits.replacement = '';
    this.#flow({
      settlement,
      field: 'returned',
      ...(settlement === 'exchange' ? {} : { replacement: null }),
    });
  }

  setReturnField(field: ReturnFlow['field']): void {
    this.#flow({ field });
  }

  setDifferenceMode(differenceMode: ReturnFlow['differenceMode']): void {
    this.#flow({ differenceMode });
  }

  setSettleMode(settleMode: ReturnFlow['settleMode']): void {
    this.#flow({ settleMode });
  }

  /**
   * Record the return, or the exchange, as ONE event (EX-5, EX-6): the engine
   * builds every row and validates each against the sale and the others, and the
   * store appends them in one transaction. Returns true if it was recorded.
   */
  commitReturn(): boolean {
    this.#store.startNextDayIfDue();
    if (this.#clockBehind()) return false;
    const flow = this.#state.returnFlow;
    const sale = flow?.saleId ? this.#store.findEntry(flow.saleId) : undefined;
    if (!flow || !sale) {
      this.refuse('refersToEntryId', 'choose the sale that is coming back');
      return false;
    }
    if (flow.returned === null) {
      this.refuse('amount', 'type the value of what came back');
      return false;
    }
    try {
      const partyId = this.#state.entryPartyId ?? undefined;
      const legs = buildReturnEvent({
        sale,
        ledger: this.#store.entriesReferringTo(sale.id),
        dayId: this.#store.state.day.date,
        createdAt: this.#options.now(),
        ids: [this.#options.newId(), this.#options.newId(), this.#options.newId()],
        returned: flow.returned,
        settlement: flow.settlement,
        ...(flow.settlement === 'exchange' ? { replacement: flow.replacement ?? 0, differenceMode: flow.differenceMode } : {}),
        ...(partyId ? { partyId } : {}),
      });
      this.#store.appendEvent(legs);
      this.#fieldDigits = { returned: '', replacement: '' };
      this.#state = {
        ...this.#state,
        entryPartyId: null,
        returnFlow: { ...RETURN_START, recordedId: legs[0]!.id },
        lastRefusal: null,
      };
      return true;
    } catch (e) {
      this.#refuseFrom(e);
      return false;
    }
  }

  /** Settle a pending return, in full or in part (scenario 13). */
  commitSettlement(): boolean {
    this.#store.startNextDayIfDue();
    if (this.#clockBehind()) return false;
    const flow = this.#state.returnFlow;
    const ret = flow?.settleId ? this.#store.findEntry(flow.settleId) : undefined;
    if (!flow || !ret) {
      this.refuse('refersToEntryId', 'choose the return being settled');
      return false;
    }
    if (flow.returned === null) {
      this.refuse('amount', 'type what is being paid back');
      return false;
    }
    try {
      const leg = buildSettlement({
        ret,
        ledger: this.#store.entriesReferringTo(ret.id),
        id: this.#options.newId(),
        dayId: this.#store.state.day.date,
        createdAt: this.#options.now(),
        amount: flow.returned,
        mode: flow.settleMode,
      });
      this.#store.appendEvent([leg]);
      this.#fieldDigits = { returned: '', replacement: '' };
      this.#state = { ...this.#state, returnFlow: { ...RETURN_START, recordedId: ret.id }, lastRefusal: null };
      return true;
    } catch (e) {
      this.#refuseFrom(e);
      return false;
    }
  }

  /* ---- T16 · correct a closed day (HT-11) ---------------------------- */

  openCorrection(): void {
    this.goTo('T16');
    this.#state = { ...this.#state, correction: { originalId: null, outcome: null } };
  }

  chooseCorrectionTarget(originalId: string): void {
    this.#digits = '';
    this.#state = {
      ...this.#state,
      draftPaise: null,
      correction: { originalId, outcome: null },
      lastRefusal: null,
    };
  }

  /**
   * Post the correction. The store decides where it lands: on the open day now,
   * or - when the closed day is still the current business day - held for the
   * next one. `correction.outcome` says which, so the screen can say it plainly.
   */
  commitCorrection(): boolean {
    this.#store.startNextDayIfDue();
    const flow = this.#state.correction;
    const amount = this.#state.draftPaise;
    if (!flow?.originalId) {
      this.refuse('refersToEntryId', 'choose the entry being corrected');
      return false;
    }
    if (amount === null) {
      this.refuse('amount', 'type an amount first');
      return false;
    }
    try {
      const outcome = this.#store.postCorrection({ id: this.#options.newId(), originalId: flow.originalId, amount });
      this.#digits = '';
      this.#state = {
        ...this.#state,
        draftPaise: null,
        correction: { originalId: null, outcome },
        lastRefusal: null,
      };
      return true;
    } catch (e) {
      this.#refuseFrom(e);
      return false;
    }
  }

  #refuseFrom(e: unknown): void {
    this.#state = {
      ...this.#state,
      lastRefusal:
        e instanceof EntryInputError
          ? { field: e.field, message: e.message }
          : { field: 'entry', message: (e as Error).message },
    };
  }

  /**
   * OPEN THE FORM FOR A SECTION, WITH THAT SECTION'S SEGMENT ALREADY LIVE.
   *
   * The route and the segment come from `ROUTE_FOR_SECTION`, which searches
   * each form's own commit table for the index rather than carrying a written
   * one. `goTo` first, because it is what clears the draft and the party; the
   * commit is set afterwards, since `goTo` resets it to 0.
   *
   * This is the method that makes a tile mean what it says. Before it, Credit,
   * Collect and Pay all landed on T8 at segment 0 - a collection - so two of
   * the three recorded the wrong section, and Pay recorded the wrong direction.
   */
  openSection(section: Section): boolean {
    /*
     * HT-52: A FROZEN DAY HAS NO FORM (D7), whichever page asked for one. A party
     * page offered a working keypad on a closed day, and Add then said only
     * "Nothing was recorded". Said here, before he types; Today's closed face
     * already sends him to Post a correction (HT-11).
     */
    this.#store.startNextDayIfDue();
    if (this.#store.state.day.state === 'closed') {
      this.refuse(
        this.#store.closedUnderWrongDate ? 'dayClosedWrongDate' : 'dayClosedOpen',
        'the day is closed; post a correction instead',
      );
      return false;
    }
    /*
     * C-17: A SALE MUST NOT SLIP INTO A DAY THAT HAS ENDED. If the open book is
     * for an earlier day he is asked to close it first (Today says so). Entries
     * that belong to that day are still allowed from the day-close list (T5):
     * closing it is exactly when last night's missed figures are put in, and
     * the screen there names the date.
     */
    if (this.#store.dayStatus().kind === 'stale' && this.#state.screen !== 'T5') {
      this.refuse('dayStale', 'this book is still open for an earlier day; close it first');
      return false;
    }
    if (this.#clockBehind()) return false;
    const route = ROUTE_FOR_SECTION[section];
    this.goTo(route.screen);
    this.#state = { ...this.#state, selectedCommit: route.commit, entrySection: section };
    return true;
  }

  /**
   * QA-06 (CTO decision, 2026-11-18): THE PHONE'S DATE IS BEHIND THE BOOK'S OPEN
   * DAY, so no entry is taken - with the same calm notice Today shows
   * (`t1.future.body`) and no exemption for the day-close list. C-17 lets T5
   * through for a STALE day because those figures belong to a day that has
   * really ended and the screen names it; here nothing has ended and the clock
   * is the thing that is wrong, so an entry or a close made now would be dated
   * by it. The way out is the phone's date, not a list. Nothing is written.
   */
  #clockBehind(): boolean {
    if (this.#store.dayStatus().kind !== 'future') return false;
    this.refuse('dayFuture', 'the phone date is behind the book; check the date and time');
    return true;
  }

  /**
   * He changed the segment himself. The draft survives: the amount he has
   * typed is the same amount whether it was received in cash or by UPI, and
   * clearing it would punish him for correcting the mode before saving.
   */
  selectCommit(index: number): void {
    /*
     * LIVE DEMO S2-1: THE PERSON GOES WHEN HE IS THE WRONG KIND FOR THE NEW
     * SEGMENT. A customer chosen for an udhar sale stayed in the slot when the
     * segment moved to "Pay supplier", so the form showed a customer as the
     * supplier with "you owe ₹700" - a debt in the wrong direction. Between two
     * segments that name the same kind (credit sale and collect) he stays.
     */
    const open = this.#state.entrySection;
    const route = open !== null && open in ROUTE_FOR_SECTION ? ROUTE_FOR_SECTION[open as Section] : undefined;
    const section = route?.commits[index]?.section;
    const want = section === undefined ? undefined : PARTY_KIND[section];
    const who = this.#state.entryPartyId;
    const kind = who === null ? undefined : this.#store.state.parties.find((p) => p.id === who)?.kind;
    const wrongKind = who !== null && want !== undefined && kind !== want;
    this.#state = {
      ...this.#state,
      selectedCommit: index,
      advanceConfirm: null,
      ...(wrongKind ? { entryPartyId: null } : {}),
    };
  }

  setLanguage(language: Language): void {
    this.#state = { ...this.#state, language };
  }

  setDisplay(display: DisplayMode): void {
    this.#state = { ...this.#state, display };
  }

  /**
   * Today's date for a screen that counts days (S14's "last used"), from the
   * injected clock - a screen never reads one itself. UTC, like the server's
   * own timestamps it is compared with.
   */
  todayIso(): string {
    return this.#options.now().slice(0, 10);
  }

  /** RTI-7: a server stamp as a date on this phone's clock (`localDateOf`). */
  localDate(stamp: string): string {
    return localDateOf(stamp, this.#options.now());
  }

  /** M3: Normal, Large or Extra large - words and figures, never the chrome (V2 3.15). */
  setTextSize(textSize: TextSize): void {
    this.#state = { ...this.#state, textSize };
  }

  /* ---- M3 · S13 your data, S14 signed-in phones. The host does the asking. ---- */

  /** S13: open it fresh - an old "offline" from last week is not today's answer. */
  openYourData(): void {
    this.goTo('S13');
    this.#state = { ...this.#state, myData: 'idle' };
  }

  setMyData(phase: MyDataPhase): void {
    this.#state = { ...this.#state, myData: phase };
  }

  /** S14: open it on "loading"; the host asks the server and answers below. */
  openDevices(): void {
    this.goTo('S14');
    this.#state = { ...this.#state, devices: { status: 'loading', list: [], confirm: null, done: false } };
  }

  /** The server's list, or null when it could not be read. Never a guessed list. */
  devicesLoaded(list: readonly DeviceView[] | null): void {
    const was = this.#state.devices;
    this.#state = {
      ...this.#state,
      devices:
        list === null
          ? { status: 'error', list: [], confirm: null, done: was?.done ?? false }
          : { status: 'ready', list, confirm: null, done: was?.done ?? false },
    };
  }

  /** RTI-7: the new-phone notice, as the host last derived it. Null clears it. */
  newPhoneSeen(newPhone: NewPhone | null): void {
    const was = this.#state.newPhone ?? null;
    if (was?.id === newPhone?.id && was?.createdAt === newPhone?.createdAt) return;
    this.#state = { ...this.#state, newPhone };
  }

  /** "Sign out that phone?" - only for a phone that is not this one and not already out. */
  askSignOut(deviceId: string): void {
    const d = this.#state.devices;
    const target = d?.list.find((x) => x.id === deviceId);
    if (d === undefined || target === undefined || target.current || target.revokedAt !== null) return;
    this.#state = { ...this.#state, devices: { ...d, confirm: deviceId } };
  }

  cancelSignOut(): void {
    const d = this.#state.devices;
    if (d !== undefined) this.#state = { ...this.#state, devices: { ...d, confirm: null } };
  }

  /** The revoke went through: put the question away and say it was done. The host re-lists. */
  signedOut(): void {
    const d = this.#state.devices;
    if (d !== undefined) this.#state = { ...this.#state, devices: { ...d, confirm: null, done: true } };
  }

  /**
   * S2: when the shop's day starts, for days opened from now on (decision 1).
   * The store refuses anything that is not a real HH:MM; the open day and every
   * closed one keep the rule they were made under.
   */
  setDayStart(startsAt: string): void {
    try {
      this.#store.setDayStart(startsAt);
      this.#state = { ...this.#state, lastRefusal: null };
    } catch (e) {
      this.#state = {
        ...this.#state,
        lastRefusal: { field: 'dayStartsAt', message: (e as Error).message },
      };
    }
  }

  setReason(reason: string | null): void {
    this.#state = { ...this.#state, reason };
  }

  /**
   * One key. Digits append, back removes one, clear empties.
   *
   * A leading zero is replaced rather than accumulated, so tapping 0 then 5
   * gives five rupees and not something that renders as `05`.
   */
  press(key: KeypadKey): void {
    if (Date.parse(this.#options.now()) < this.#settleUntil) return;
    const flow = this.#state.returnFlow;
    if (this.#state.screen === 'T18' && flow) {
      this.#pressReturn(key, flow.field);
      return;
    }
    const items = this.#state.itemFlow;
    if (this.#state.screen === 'I1' && items) {
      this.#pressItem(key, items.field);
      return;
    }
    if (key === 'clear') this.#digits = '';
    else if (key === 'back') this.#digits = this.#digits.slice(0, -1);
    else if (this.#digits.length < MAX_DIGITS) {
      const next = this.#digits === '0' ? key : this.#digits + key;
      if (overEntryMax(next)) {
        this.#refuseTooLarge();
        return;
      }
      this.#digits = next;
    }

    // Concatenation, not multiplication: '123' -> 12300, exact by construction.
    const paise = this.#digits === '' ? null : Number(this.#digits + '00');
    this.#state = { ...this.#state, draftPaise: paise, lastRefusal: null, advanceConfirm: null };
  }

  /** C-09: the digit is NOT taken; the banner says why, in the shopkeeper's language. */
  #refuseTooLarge(): void {
    this.#state = {
      ...this.#state,
      lastRefusal: { field: 'amountTooLarge', message: 'one entry can be at most Rs 1 crore' },
    };
  }

  /** T18's keypad: the same digit rules, into whichever amount `field` names. */
  #pressReturn(key: KeypadKey, field: ReturnFlow['field']): void {
    let digits = this.#fieldDigits[field];
    if (key === 'clear') digits = '';
    else if (key === 'back') digits = digits.slice(0, -1);
    else if (digits.length < MAX_DIGITS) {
      const next = digits === '0' ? key : digits + key;
      if (overEntryMax(next)) {
        this.#refuseTooLarge();
        return;
      }
      digits = next;
    }
    this.#fieldDigits[field] = digits;
    // Concatenation again, never multiplication: exact by construction (ADR-003).
    const paise = digits === '' ? null : Number(digits + '00');
    this.#flow(field === 'returned' ? { returned: paise } : { replacement: paise });
  }

  /**
   * Commit what has been typed, through the parser that owns the section.
   *
   * Returns the entry it appended, or null if something refused it - in which
   * case `state.lastRefusal` names the field, which is what the screen shows.
   */
  commit(option: CommitOption, advanceConfirmed = false): Entry | null {
    // F-19: the draft survives; only the day it lands in moves on.
    this.#store.startNextDayIfDue();
    if (this.#clockBehind()) return null;
    const amount = this.#state.draftPaise;
    if (amount === null) {
      this.#state = {
        ...this.#state,
        lastRefusal: { field: 'amount', message: 'type an amount first' },
      };
      return null;
    }
    /*
     * QA-04 (CTO decision, 2026-11-18): A Rs 0 ENTRY IS NOT SAVED. Append-only
     * means it could never be removed, and it would count as an entry on the
     * day-close list. The message points at "Nothing to enter". The API refuses
     * the same row (sync/routes.ts), so a stale phone cannot slip one in.
     */
    if (amount === 0) {
      this.#state = {
        ...this.#state,
        lastRefusal: { field: 'amountZero', message: 'an amount of Rs 0 is not an entry' },
      };
      return null;
    }
    /*
     * QA-03 (CTO decision, 2026-11-18): MORE THAN IS OWED IS ASKED ABOUT, NOT
     * REFUSED. A collection above the customer's balance, or a payment above
     * what a supplier is owed, is held until he confirms it as an advance.
     * Confirmed, it is saved as typed; the balance then goes below zero and the
     * screens call that an advance. Nothing here guesses a figure.
     */
    if (!advanceConfirmed && (option.section === 'udhar_collection' || option.section === 'party_payment')) {
      const who = this.#state.entryPartyId ?? this.#options.selectedPartyId?.();
      if (who) {
        const owed = this.#store.partyBalance(who);
        const extra = subtract(amount, owed > 0 ? owed : 0);
        if (extra > 0) {
          this.#state = { ...this.#state, advanceConfirm: { extra }, lastRefusal: null };
          return null;
        }
      }
    }

    try {
      const parse = PARSER_FOR[option.section as keyof typeof PARSER_FOR];
      /*
       * State first, option second. The option was the original design and
       * nothing ever supplied it, which is why every party-requiring commit
       * failed silently for the life of the build. It is kept only so a test
       * can inject a party without driving the picker.
       */
      const partyId = this.#state.entryPartyId ?? this.#options.selectedPartyId?.();
      const entry = parse({
        id: this.#options.newId(),
        dayId: this.#store.state.day.date,
        amount,
        mode: option.mode,
        createdAt: this.#options.now(),
        ...(partyId ? { partyId } : {}),
      });
      this.#store.append(entry);
      this.#digits = '';
      this.#state = { ...this.#state, draftPaise: null, lastRefusal: null, advanceConfirm: null, lastSavedId: entry.id, cancelledId: null };
      return entry;
    } catch (e) {
      // DV-7: the wrong kind of person - drop them so the slot asks again.
      const wrongKind = (e as Error).name === 'PartyKindMismatch';
      // HT-52: a frozen day is named as the reason, not "nothing was recorded".
      const closed = (e as Error).name === 'DayClosedViolation';
      this.#state = {
        ...this.#state,
        ...(wrongKind ? { entryPartyId: null } : {}),
        lastRefusal:
          e instanceof EntryInputError
            ? { field: e.field, message: e.message }
            : {
                field: wrongKind ? 'partyId' : closed ? (this.#store.closedUnderWrongDate ? 'dayClosedWrongDate' : 'dayClosed') : 'entry',
                message: (e as Error).message,
              },
      };
      return null;
    }
  }

  /* ---- Cancel this entry (docs/design/CANCEL-ENTRY-GATE.md §4) ------- */

  /** He tapped a line on an entry form: the confirm sheet, naming that entry. */
  askCancel(entryId: string): void {
    this.#state = { ...this.#state, cancelAsk: entryId, lastRefusal: null };
  }

  /** "Keep it", the scrim or Back: nothing is written. */
  dismissCancel(): void {
    this.#state = { ...this.#state, cancelAsk: null };
  }

  /**
   * "Cancel this entry" on the sheet. The ask is cleared FIRST, so a double tap
   * reaches here once with an id and once with nothing - one cancel row, never
   * two. A refusal is said in words (App's REFUSAL_HINT), never as its code.
   */
  confirmCancel(): Entry | null {
    const targetId = this.#state.cancelAsk ?? null;
    if (targetId === null) return null;
    this.#state = { ...this.#state, cancelAsk: null };
    try {
      const cancel = this.#store.cancel({ targetId, id: this.#options.newId(), createdAt: this.#options.now() });
      this.#state = { ...this.#state, cancelledId: targetId, lastSavedId: null, lastRefusal: null, advanceConfirm: null };
      return cancel;
    } catch (e) {
      this.#refuseFrom(e);
      return null;
    }
  }

  /**
   * "Enter it again correctly": the same form, its segment set to the cancelled
   * entry's section and mode - and NOTHING else. No amount and no person: a
   * figure the app filled in is a figure nobody typed.
   */
  enterAgain(): void {
    const id = this.#state.cancelledId ?? null;
    const target = id === null ? undefined : this.#store.findEntry(id);
    if (target === undefined) return;
    const open = this.#state.entrySection;
    const route = open !== null && open in ROUTE_FOR_SECTION ? ROUTE_FOR_SECTION[open as Section] : undefined;
    const exact = route?.commits.findIndex((c) => c.section === target.section && c.mode === target.mode) ?? -1;
    const near = route?.commits.findIndex((c) => c.section === target.section) ?? -1;
    const index = exact >= 0 ? exact : near;
    this.#digits = '';
    this.#state = {
      ...this.#state,
      ...(index >= 0 ? { selectedCommit: index } : {}),
      draftPaise: null,
      entryPartyId: null,
      cancelledId: null,
      advanceConfirm: null,
      lastRefusal: null,
    };
  }

  /** QA-03: he said yes to "record it as advance" - save what is on the form, as typed. */
  confirmAdvance(option: CommitOption): Entry | null {
    return this.commit(option, true);
  }

  /** QA-03: he said no - nothing is saved and the draft stays for him to correct. */
  cancelAdvance(): void {
    this.#state = { ...this.#state, advanceConfirm: null };
  }

  /** T11: take what was typed as the counted cash, and go on to the check. */
  confirmCount(): boolean {
    const counted = this.#state.draftPaise;
    try {
      captureCountedCash(counted ?? 0);
    } catch (e) {
      this.#state = {
        ...this.#state,
        lastRefusal:
          e instanceof EntryInputError
            ? { field: e.field, message: e.message }
            : { field: 'countedCash', message: (e as Error).message },
      };
      return false;
    }
    this.#digits = '';
    this.#state = {
      ...this.#state,
      countedPaise: counted ?? 0,
      draftPaise: null,
      // HT-49: a new count is a new difference; the reason given for the last one goes with it.
      reason: null,
      /*
       * THE BALANCED DAY GETS ITS OWN SCREEN, AND IT DID NOT USED TO.
       *
       * What stood here said: "Straight to the difference screen whether or not
       * there IS one. T12 shows a zero difference as readily as a gap, and
       * routing only on a mismatch would make the screen he sees depend on the
       * answer - which is how a shopkeeper learns that seeing T12 means he is in
       * trouble."
       *
       * That was written while T13 did not exist - it had been cut from the
       * committed set to keep the count at ten. SPEC-DIGEST §8 S03 restores it
       * and is unambiguous: the balanced state is "the highest-leverage screen
       * in the product and the only genuinely good moment the day contains",
       * and it is "NOT the difference screen with a block removed". Two screens
       * was the design; one screen was the omission.
       *
       * The old worry is answered by what the two screens now SAY rather than by
       * sending both cases to one of them. T12's copy is a question - "250 less
       * than expected, what happened?" - never a verdict, so arriving there is
       * not being told off.
       */
      screen: (counted ?? 0) === this.#store.expectedCash().value ? 'T13' : 'T12',
      lastRefusal: null,
    };
    return true;
  }

  /**
   * T12: close the day. Refuses a difference with no reason, exactly as the
   * store and the API do - three layers, because one has never been enough here.
   */
  closeDay(): boolean {
    const counted = this.#state.countedPaise;
    if (counted === null) {
      this.#state = {
        ...this.#state,
        lastRefusal: { field: 'countedCash', message: 'count the cash first' },
      };
      return false;
    }
    try {
      this.#store.close(counted, this.#state.reason ?? undefined);
      this.#state = { ...this.#state, screen: 'T14', lastRefusal: null };
      return true;
    } catch (e) {
      this.#state = {
        ...this.#state,
        lastRefusal: { field: 'differenceReason', message: (e as Error).message },
      };
      return false;
    }
  }

  /** T6: the opening figure, which the app will not invent. */
  confirmOpeningCash(): boolean {
    const opening = this.#state.draftPaise;
    if (opening === null) {
      this.#state = {
        ...this.#state,
        lastRefusal: { field: 'openingCash', message: 'type the opening cash first' },
      };
      return false;
    }
    try {
      this.#store.setOpeningCash(opening);
    } catch (e) {
      // Already set, or the day is closed: say so rather than crash the press.
      this.#state = {
        ...this.#state,
        lastRefusal: { field: 'openingCash', message: (e as Error).message },
      };
      return false;
    }
    this.#digits = '';
    this.#state = { ...this.#state, draftPaise: null, screen: 'T1', lastRefusal: null };
    return true;
  }

  /**
   * Open the consent screen from Today, showing what is in force NOW.
   *
   * `granted` comes from the server rather than from memory: this handset may
   * not be the one that made the last change, and showing a stale answer on a
   * consent screen is showing him a decision he did not make.
   */
  openConsentSettings(granted: readonly ConsentPurpose[]): void {
    this.#digits = '';
    this.#state = {
      ...this.#state,
      screen: 'X0',
      consentMode: 'manage',
      grantedConsents: granted.filter((p) =>
        CONSENT_PURPOSES.some((c) => c.key === p && !c.required),
      ),
      draftPaise: null,
      lastRefusal: null,
    };
  }

  /**
   * X0: turn one optional purpose on or off.
   *
   * THE REQUIRED PURPOSE IS NOT TOGGLEABLE, and the refusal is silent rather
   * than an error, because the screen renders no control for it - a caller
   * reaching this line is a bug in the caller, not something to show him.
   */
  toggleConsent(purpose: ConsentPurpose): void {
    const optional = CONSENT_PURPOSES.some((p) => p.key === purpose && !p.required);
    if (!optional) return;
    const on = this.#state.grantedConsents.includes(purpose);
    this.#state = {
      ...this.#state,
      grantedConsents: on
        ? this.#state.grantedConsents.filter((p) => p !== purpose)
        : [...this.#state.grantedConsents, purpose],
      consentWithdrawn: on && this.#state.consentMode === 'manage' ? purpose : null,
    };
  }

  /**
   * X0: he agreed. Returns exactly what he agreed to, for the caller to send.
   *
   * IT DOES NOT CALL ANYTHING. There is no network in this class and adding one
   * here would put the one legally-significant write in the app behind a method
   * no test can observe. The host takes this decision, posts it, and only then
   * is there an account - which is the order the API enforces anyway.
   */
  agreeConsent(): ConsentDecision {
    const granted = CONSENT_PURPOSES.filter(
      (p) => p.required || this.#state.grantedConsents.includes(p.key),
    ).map((p) => p.key);
    /*
     * ON TO X1, NOT STRAIGHT TO TODAY. Consent has to precede the account it
     * creates, and onboarding's four questions are what create it - so X0 then
     * X1 is the order, and it is the order the build map already had.
     */
    // HT-14: managing consent from Today or Settings returns there, not to setup.
    const screen = this.#state.consentMode === 'manage' ? 'T1' : 'X1';
    this.#state = { ...this.#state, screen, consentMode: 'signup', lastRefusal: null };
    return {
      noticeVersion: this.#options.noticeVersion ?? PRIVACY_NOTICE_VERSION,
      locale: this.#state.language,
      granted,
    };
  }

  /**
   * WHERE THE ANDROID BACK BUTTON GOES, AND IT USED TO GO NOWHERE.
   *
   * The app had no back handling of any kind, so the hardware back button did
   * what Android does by default with an unhandled press: it finished the
   * activity. A shopkeeper halfway through entering a sale who pressed back -
   * the most-used button on the phone - was dropped onto his home screen, and
   * with the store still in memory (W4) the day went with him.
   *
   * THIS IS A FLAT PARENT MAP, NOT A HISTORY STACK, because the session has no
   * history: `goTo` replaces the screen. A map says the same thing a stack
   * would for a product where every screen has exactly one place it belongs
   * under, and it cannot grow stale or leak.
   *
   * The cash-check pair goes back to COUNTING rather than to Today: a
   * shopkeeper looking at a difference he does not believe wants to count
   * again, and sending him to Today would make him walk the whole close a
   * second time to get there.
   *
   * Returning `false` means "not handled" - the caller lets Android do its
   * default, which is to leave the app. That is correct on Today, and on the
   * two screens that run before an account exists.
   *
   * WHAT THIS DOES NOT DO: edge case E5 says back pressed mid-entry with digits
   * typed should raise a confirm sheet, and dismiss silently only when
   * untouched. There is no sheet component in this build, so a draft is
   * discarded either way - the same as before this method existed. The
   * navigation half of E5 is fixed here; the confirmation half is a component
   * that does not exist yet and is not pretended into being by this map.
   */
  static readonly #PARENT: Readonly<Partial<Record<ScreenId, ScreenId>>> = {
    T5: 'T1',
    T6: 'T1',
    T7: 'T1',
    T8: 'T1',
    T9: 'T1',
    // HT-1: both are reached from the day-close list, so back returns there.
    T10: 'T5',
    T11: 'T5',
    T12: 'T11',
    T13: 'T11',
    T14: 'T1',
    // T18 is opened from the sales form; T16 from the closed day, which is Today.
    T18: 'T7',
    T16: 'T1',
    T19: 'T5',
    // PR-1: items of a sale come from the sales form; the list from Settings.
    I1: 'T7',
    S9: 'S1',
    P1: 'T1',
    P2: 'P1',
    P3: 'P1',
    P6: 'P2',
    R1: 'T1',
    M1: 'R1',
    S1: 'T1',
    S2: 'S1',
    S3: 'S1',
    S4: 'S1',
    S5: 'S1',
    S6: 'S1',
    S7: 'S1',
    /*
     * S8 goes back to S7, NOT to the hub. Backing out of a delete
     * confirmation should land on the screen that explains what deletion does,
     * not dump him two levels up as though nothing had been asked.
     */
    S8: 'S7',
    S10: 'S1',
    S12: 'S1',
    S13: 'S1',
    S14: 'S1',
    /*
     * THE A-SERIES, as store.js's own back map has it (A3: A2, A4: A3, A5: A4).
     * A7 returns to the phone screen it was opened from; A8 to the settings
     * hub it was opened from. A1, A2 and A6 have no parent: back from those
     * leaves the app, which is right for a screen that precedes an account.
     */
    A3: 'A2',
    A4: 'A3',
    A5: 'A4',
    A8: 'S1',
  };

  /* ---- PR-7 · the plan. The host does the asking; this only holds it. ---- */

  /** The server's answer, from the network or from the host's cache at launch. */
  setPlanAnswer(answer: PlanAnswer | null): void {
    this.#state = { ...this.#state, planAnswer: answer };
  }

  setPlanOffer(offer: ProductsResult | null): void {
    this.#state = { ...this.#state, planOffer: offer };
  }

  planWorking(busy: boolean): void {
    this.#state = { ...this.#state, planBusy: busy, ...(busy ? { planNotice: null } : {}) };
  }

  planSaid(notice: PlanNotice | null): void {
    this.#state = { ...this.#state, planNotice: notice, planBusy: false };
  }

  /** Handle a hardware back press. False means "let the system leave the app". */
  back(): boolean {
    // R5 FR-3: Back on the cover leaves the app; it never reveals the screen under it.
    if (this.#state.locked) return false;
    // F-22: after a deletion the book behind S8 is gone; back means Done.
    if (this.#state.deletion) {
      this.finishDeletion();
      return true;
    }
    /*
     * HT-3: X0 HAS TWO PARENTS. Signing up it follows A2 (language), so Back
     * returns there; it used to leave the app. Managing consent it was opened
     * from Today or Settings, so Back returns to Today.
     */
    if (this.#state.screen === 'X0') {
      this.goTo(this.#state.consentMode === 'signup' ? 'A2' : 'T1');
      return true;
    }
    // C1 has two parents too: the tab it was opened from.
    if (this.#state.screen === 'C1') {
      this.goTo(this.#state.chat?.from ?? 'T1');
      return true;
    }
    // Cancel this entry: Back on the confirm is "Keep it", never a step past the form.
    if ((this.#state.cancelAsk ?? null) !== null) {
      this.dismissCancel();
      return true;
    }
    // X4: setup is done behind it, so Back is "Not now" - never back into X1, never out of the app.
    if (this.#state.screen === 'X4') {
      this.finishLockOffer();
      return true;
    }
    // HT-26: A7 has two parents, and Back returns to the one it came from.
    if (this.#state.screen === 'A7') {
      this.goTo(this.#state.auth.recoveryFrom);
      return true;
    }
    // HT-44: a form opened from a party page goes back to that page.
    const from = this.#state.entryFrom;
    if (from !== null && from.screen === this.#state.screen) {
      this.goTo(from.back);
      return true;
    }
    /*
     * M3: TODAY ASKS BEFORE THE APP GOES. T1 is the root once there is an
     * account (T2 and T3 are its faces), so a Back here used to leave at once
     * - the easiest accident in the app. The first Back puts up "Exit the
     * app?"; a second Back is "Stay". Only "Exit" (the host's `exitApp`)
     * leaves. Screens before an account keep leaving directly.
     */
    if (this.#state.screen === 'T1') {
      this.#state = { ...this.#state, exitPrompt: this.#state.exitPrompt !== true };
      return true;
    }
    // S14: Back on "Sign out that phone?" is "Keep it signed in", never a step back past it.
    if (this.#state.screen === 'S14' && (this.#state.devices?.confirm ?? null) !== null) {
      this.cancelSignOut();
      return true;
    }
    const parent = Session.#PARENT[this.#state.screen];
    if (parent === undefined) return false;
    this.goTo(parent);
    return true;
  }

  /** "Stay": put the exit question away. Nothing else changes. */
  stayInApp(): void {
    this.#state = { ...this.#state, exitPrompt: false };
  }

  /** X1: the shop's name, as typed. Never corrected, completed or capitalised. */
  setShopName(name: string): void {
    this.#state = { ...this.#state, shopName: name, lastRefusal: null };
  }

  /**
   * X1: the four questions are answered, so the day can begin.
   *
   * Only the name is required. A typed opening figure goes through
   * `confirmOpeningCash`, which is the same method T6 uses - the opening figure
   * has one write path whichever screen asked for it. No figure typed is not a
   * refusal: Today asks for it, on T2, before the first sale.
   */
  finishOnboarding(): boolean {
    if (this.#state.shopName.trim() === '') {
      this.#state = {
        ...this.#state,
        lastRefusal: { field: 'shopName', message: 'the shop needs a name first' },
      };
      return false;
    }
    /*
     * THE NAME IS SAVED BEFORE THE OPENING CASH. A saved name is what tells
     * the next launch onboarding is done. Killed between the two writes, the
     * app reopens on Today asking for the opening figure (T2) - whereas the
     * other order would reopen on X1 with an opening already set, which it
     * refuses, forever.
     */
    try {
      this.#store.setShopName(this.#state.shopName.trim());
    } catch (e) {
      this.#state = {
        ...this.#state,
        lastRefusal: { field: 'shopName', message: (e as Error).message },
      };
      return false;
    }
    /*
     * OPENING CASH IS OPTIONAL HERE (X1.png: "Optional. Leave it and Today will
     * ask before your first sale."). Nothing typed means nothing written - the
     * day stays at `openingCash === null`, which is UNKNOWN, and Today renders
     * T2, whose one action opens T6. That is the same state the kill-between-
     * writes case above already lands in, so it is a state the app handles
     * rather than a new one. F-16: before this, T2 and T6 were unreachable.
     */
    // X4: setup ends on the app-lock offer where the phone can be asked; Today otherwise.
    const next: ScreenId = this.#options.offerAppLock === true && this.#state.appLock !== true ? 'X4' : 'T1';
    if (this.#state.draftPaise === null) {
      this.#digits = '';
      this.#state = {
        ...this.#state,
        screen: next,
        onboardingKeypad: false,
        lastRefusal: null,
      };
      return true;
    }
    const saved = this.confirmOpeningCash();
    if (saved) this.#state = { ...this.#state, onboardingKeypad: false, screen: next };
    return saved;
  }

  /**
   * X4 "Not now", "Continue", or the lock just turned on: on to Today. A note
   * about a missing screen lock belongs to the offer and does not follow him.
   * The lock stays where it is - off unless he turned it on - and S1 keeps
   * the switch for later.
   */
  finishLockOffer(): void {
    this.#state = { ...this.#state, lockNote: null };
    this.goTo('T1');
  }

  /**
   * X1: whether the in-app keypad is up. It appears only while question 4 is
   * being answered, so the first three questions are not sat on by ten keys
   * that do nothing for them. A flag, not a screen: the digits must survive it.
   */
  setOnboardingKeypad(open: boolean): void {
    this.#state = { ...this.#state, onboardingKeypad: open };
  }

  /**
   * F-19: a closed day that has ended gives way to the next one, on Today.
   * Called when the app comes back to the foreground and before every entry.
   */
  refreshDay(): void {
    if (this.#store.startNextDayIfDue()) {
      this.#state = { ...this.#state, screen: 'T1', lastRefusal: null };
    }
  }

  /** The store changed under the session (a sync ack): notify, so screens re-derive. */
  storeChanged(): void {
    this.#state = { ...this.#state };
  }

  /** A failure the host met outside this class - a network call - shown the same way. */
  refuse(field: string, message: string): void {
    this.#state = { ...this.#state, lastRefusal: { field, message } };
  }

  /** The refusal banner was read and dismissed. */
  dismissRefusal(): void {
    this.#state = { ...this.#state, lastRefusal: null };
  }

  /**
   * Open the party picker over the entry form the user is already on.
   *
   * NOT `goTo`. The whole point is that the half-typed amount survives being
   * interrupted to name a customer - routing would clear it, which is the bug
   * this feature exists beside rather than a second copy of it.
   */
  openPartyPicker(): void {
    this.#state = { ...this.#state, pickingParty: true, newParty: null, lastRefusal: null };
  }

  /** F-10: the picker's "add new" - switch it from the list to a blank name. */
  startNewParty(): void {
    this.#state = { ...this.#state, newParty: { name: '', phone: '' }, lastRefusal: null };
  }

  /** The name exactly as typed. Never completed, suggested or capitalised. */
  setNewPartyName(name: string): void {
    const draft = this.#state.newParty ?? { name: '', phone: '' };
    this.#state = { ...this.#state, newParty: { ...draft, name }, lastRefusal: null };
  }

  setNewPartyPhone(phone: string): void {
    const draft = this.#state.newParty ?? { name: '', phone: '' };
    this.#state = { ...this.#state, newParty: { ...draft, phone }, lastRefusal: null };
  }

  /** Back to the list, having added nobody. The amount is untouched. */
  cancelNewParty(): void {
    this.#state = { ...this.#state, newParty: null };
  }

  /**
   * F-10: SAVE THE NEW PARTY AND NAME IT ON THE ENTRY IN PROGRESS.
   *
   * A new shop's book is empty, and Credit, Collect, Pay and an udhar purchase
   * all refuse an entry naming nobody - so without this the credit book was
   * sealed on day one. The id comes from `newId` (UUIDv7 in production), because
   * the server refuses a party whose id is not a UUID.
   *
   * A refusal stays in the picker with what he typed, and lands in
   * `lastRefusal`, which the app draws. Nothing here touches `draftPaise`.
   */
  createParty(kind: 'customer' | 'supplier'): boolean {
    const draft = this.#state.newParty ?? { name: '', phone: '' };
    const name = draft.name.trim();
    // Spaces only: "98610 42317" is how a number is written down, not a different number.
    const phone = draft.phone.replace(/\s+/g, '');
    const refuse = (field: string, message: string): false => {
      this.#state = { ...this.#state, lastRefusal: { field, message } };
      return false;
    };
    if (name === '') return refuse('partyName', 'a new party needs a name');
    if ([...name].length > PARTY_NAME_MAX) return refuse('partyName', 'that name is too long');
    // Never an empty string to the server: its schema wants 8-16 characters or no field.
    if (phone !== '' && !INDIAN_MOBILE.test(phone)) {
      return refuse('partyPhone', 'a mobile number is ten digits, starting 6 to 9');
    }
    const party = {
      id: this.#options.newId(),
      kind,
      name,
      ...(phone === '' ? {} : { phone }),
    };
    try {
      this.#store.addParty(party);
    } catch (e) {
      return refuse('party', (e as Error).message);
    }
    this.#state = {
      ...this.#state,
      newParty: null,
      pickingParty: false,
      entryPartyId: party.id,
      lastRefusal: null,
    };
    this.#settle();
    return true;
  }

  /** HT-22: the picker just closed under his thumb; swallow the rest of the burst. */
  #settle(): void {
    this.#settleUntil = Date.parse(this.#options.now()) + PICKER_SETTLE_MS;
  }

  /**
   * HT-21: the digits as typed, so the host can keep a half-typed entry across
   * a process death. What he pressed, never a figure derived from it.
   */
  get typedDigits(): string {
    return this.#digits;
  }

  /**
   * P2/P3: open a form for a section, already naming this party.
   *
   * The party pages used to `goTo('T8')`, which lands on T8's first segment - a
   * collection - with nobody named. From a SUPPLIER page, "Record a payment"
   * therefore armed money coming in from a customer: F-2 again, by another door.
   */
  openSectionFor(section: Section, partyId: string): void {
    const from = this.#state.screen;
    if (!this.openSection(section)) return;
    if (this.#store.state.parties.some((p) => p.id === partyId)) {
      this.#state = {
        ...this.#state,
        entryPartyId: partyId,
        entryFrom: { screen: this.#state.screen, back: from },
      };
    }
  }

  /** Dismiss the picker having chosen nobody. The draft is untouched. */
  closePartyPicker(): void {
    this.#state = { ...this.#state, pickingParty: false };
    this.#settle();
  }

  /**
   * Name the person this entry is for, and close the picker.
   *
   * REFUSES AN ID THAT IS NOT A PARTY, for the same reason `openParty` does: a
   * party id that outlives its party would reach the parser, pass the
   * `requireParty` check because it is non-empty, and write an entry attached
   * to nobody - which is worse than the refusal this replaces, because it is
   * silent AND it persists.
   *
   * The draft survives: he chose a customer, he did not retype the amount.
   */
  chooseEntryParty(partyId: string): boolean {
    const known = this.#store.state.parties.some((p) => p.id === partyId);
    if (!known) {
      this.#state = {
        ...this.#state,
        pickingParty: false,
        lastRefusal: { field: 'partyId', message: 'that name is no longer in the book' },
      };
      return false;
    }
    this.#state = {
      ...this.#state,
      entryPartyId: partyId,
      pickingParty: false,
      lastRefusal: null,
      advanceConfirm: null,
    };
    this.#settle();
    return true;
  }

  /** P1: open one party's page. Which page depends on what the party IS. */
  /* ---- R5 FR-1, FR-2, FR-4, FR-6 ------------------------------------- */

  /** The customer P2 and P6 are about, or null. */
  #customer() {
    const id = this.#state.partyId;
    const p = id === null ? undefined : this.#store.state.parties.find((x) => x.id === id);
    return p?.kind === 'customer' ? p : null;
  }

  #refuseWith(field: string, message: string): null {
    this.#state = { ...this.#state, lastRefusal: { field, message } };
    return null;
  }

  /**
   * FR-1: THE WHATSAPP LINKS FOR A POLITE REMINDER, or null with the reason on
   * screen. The amount is what he is owed over every day this phone holds;
   * nothing is sent from here - the host opens HIS WhatsApp and he presses send.
   */
  whatsappReminder(): { readonly app: string; readonly web: string } | null {
    const party = this.#customer();
    if (party === null) return null;
    const number = whatsappNumber(party.phone);
    if (number === null) return this.#refuseWith('noPhone', 'no phone number for ' + party.name);
    const amount = this.#store.partyBalance(party.id);
    if (amount <= 0) return this.#refuseWith('nothingDue', party.name + ' owes nothing');
    return whatsappUrls(
      number,
      reminderText(this.#state.language, {
        shopName: this.#store.state.shopName ?? this.#state.shopName,
        partyName: party.name,
        amount,
      }),
    );
  }

  /** FR-2: the customer's ledger with its running balance, as text to share. */
  statement(): string | null {
    const party = this.#customer();
    if (party === null) return null;
    return statementText(this.#state.language, {
      shopName: this.#store.state.shopName ?? this.#state.shopName,
      party,
      ledger: this.#store.partyLedger(party.id),
      asOf: this.#store.state.day.date,
    });
  }

  /** FR-4: one month of entries and every balance, as a CSV for the share sheet. */
  accountantExport(month: string): { readonly fileName: string; readonly text: string } {
    return {
      fileName: csvFileName(month),
      text: accountantCsv(this.#state.language, {
        month,
        shopName: this.#store.state.shopName ?? this.#state.shopName,
        entries: this.#store.allEntries(),
        parties: this.#store.state.parties,
      }),
    };
  }

  /** FR-6: P6, for the customer P2 is showing. The party survives `goTo`. */
  /** HT-43: the number exactly as typed. Never completed or suggested. */
  setPhoneDraft(phone: string): void {
    this.#state = { ...this.#state, phoneDraft: phone, lastRefusal: null };
  }

  /**
   * HT-43: SAVE THE TYPED NUMBER ON THE CUSTOMER P2 IS SHOWING, so FR-1 can
   * reach him. Same rule as a new party's number (`createParty`).
   */
  savePartyPhone(): boolean {
    const party = this.#customer();
    if (party === null) return false;
    const phone = this.#state.phoneDraft.replace(/\s+/g, '');
    if (!INDIAN_MOBILE.test(phone)) {
      this.#refuseWith('partyPhone', 'a mobile number is ten digits, starting 6 to 9');
      return false;
    }
    try {
      this.#store.setPartyPhone(party.id, phone);
    } catch (e) {
      this.#refuseWith('party', (e as Error).message);
      return false;
    }
    this.#state = { ...this.#state, phoneDraft: '', lastRefusal: null };
    return true;
  }

  openCreditLimit(): void {
    if (this.#customer() === null) return;
    this.goTo('P6');
  }

  /**
   * FR-6: SAVE WHAT WAS TYPED AS THE LIMIT, or clear it (`clear`). Either is a
   * NEW ROW (D1); the old limit stays in the book. Back to P2 on success.
   */
  saveCreditLimit(clear = false): boolean {
    const party = this.#customer();
    if (party === null) return false;
    try {
      this.#store.setCreditLimit(
        parseCreditLimit({
          id: this.#options.newId(),
          partyId: party.id,
          limit: clear ? null : this.#state.draftPaise,
          setAt: this.#options.now(),
        }),
      );
    } catch (e) {
      this.#refuseWith('creditLimit', (e as Error).message);
      return false;
    }
    this.goTo('P2');
    return true;
  }

  openParty(partyId: string): void {
    const party = this.#store.state.parties.find((p) => p.id === partyId);
    if (party === undefined) return; // a page about nobody is not a page
    this.#digits = '';
    this.#state = {
      ...this.#state,
      partyId,
      screen: party.kind === 'customer' ? 'P2' : 'P3',
      phoneDraft: '',
      draftPaise: null,
      lastRefusal: null,
    };
  }

  /**
   * T5, DECISION 3: these UPI receipts arrived. One id is the per-payment tick;
   * several is the bulk "all N received" tap, written as one confirmation per
   * receipt under a shared batch id, in ONE write. A refusal - a closed day, a
   * receipt already ticked - lands in `lastRefusal` rather than crashing the tap.
   */
  confirmUpi(entryIds: readonly string[]): boolean {
    const at = this.#options.now();
    const dayId = this.#store.state.day.date;
    const batchId = entryIds.length > 1 ? this.#options.newId() : undefined;
    try {
      this.#store.confirmUpi(
        entryIds.map((entryId) =>
          parseUpiConfirmation({
            id: this.#options.newId(),
            dayId,
            entryId,
            ...(batchId ? { batchId } : {}),
            confirmedAt: at,
          }),
        ),
      );
      this.#state = { ...this.#state, lastRefusal: null };
      return true;
    } catch (e) {
      this.#state = {
        ...this.#state,
        lastRefusal: { field: 'upi', message: (e as Error).message },
      };
      return false;
    }
  }

  /** T19: which kind of adjustment. The amount he has typed survives the change. */
  chooseAdjustmentType(type: AdjustmentType): void {
    this.#state = { ...this.#state, adjustmentType: type, lastRefusal: null };
  }

  /**
   * T19: save the adjustment through the same parser the server uses, then back
   * to T5. The type is chosen, the amount is typed; nothing else exists to send.
   */
  saveAdjustment(): boolean {
    try {
      this.#store.addAdjustment(
        parseAdjustment({
          id: this.#options.newId(),
          dayId: this.#store.state.day.date,
          type: this.#state.adjustmentType,
          amount: this.#state.draftPaise,
          createdAt: this.#options.now(),
        }),
      );
    } catch (e) {
      this.#state = {
        ...this.#state,
        lastRefusal:
          e instanceof EntryInputError
            ? { field: e.field, message: e.message }
            : { field: 'adjustment', message: (e as Error).message },
      };
      return false;
    }
    this.goTo('T5');
    return true;
  }

  /** T5: he says a section is empty, which is not the same as not reaching it. */
  skipSection(section: Section): void {
    try {
      this.#store.skip(section);
      this.#state = { ...this.#state, lastRefusal: null };
    } catch (e) {
      // F-7: a closed day refuses the skip. It used to be an uncaught throw.
      this.#state = {
        ...this.#state,
        lastRefusal: { field: 'section', message: (e as Error).message },
      };
    }
  }

  /** USABILITY item 7: the one-tap way back from "Nothing today". */
  unskipSection(section: Section): void {
    try {
      this.#store.unskip(section);
      this.#state = { ...this.#state, lastRefusal: null };
    } catch (e) {
      // D7: a closed day refuses it, in words, exactly as it refuses the skip.
      this.#state = {
        ...this.#state,
        lastRefusal: { field: 'section', message: (e as Error).message },
      };
    }
  }

  /* ---- the A-series ---------------------------------------------------- */

  #auth(patch: Partial<AuthState>, screen?: ScreenId): void {
    this.#state = {
      ...this.#state,
      // HT-53: a refusal belongs to the screen it was said on; A3's wrong-shop one was drawn on A5.
      ...(screen === undefined ? {} : { screen, lastRefusal: null }),
      auth: { ...this.#state.auth, ...patch },
    };
  }

  /**
   * A2: the language, then the consent notice IN that language.
   *
   * X0 used to be the first screen of the app, so the one text every user
   * must read was shown before he had said which language he reads.
   */
  chooseLanguage(language: Language): void {
    this.#state = {
      ...this.#state,
      language,
      consentMode: 'signup',
      auth: { ...this.#state.auth, busy: false, problem: null },
    };
    this.goTo('X0');
  }

  /** A3: one key into the phone number. Digits only, ten at most. */
  pressPhone(key: KeypadKey): void {
    const p = this.#state.auth.phone;
    const phone =
      key === 'clear' ? '' : key === 'back' ? p.slice(0, -1) : p.length < PHONE_DIGITS ? p + key : p;
    // A different number is a different conversation: its resend count starts again.
    this.#auth({ phone, problem: null, resends: phone === p ? this.#state.auth.resends : 0 });
  }

  /**
   * A4: one key into the code. Returns true when THIS key completed it, which
   * is the moment the reference verifies (store.js authKeyTap) - the caller
   * sends it. A full code ignores further digits rather than replacing them.
   */
  pressCode(key: KeypadKey): boolean {
    const c = this.#state.auth.code;
    const max = this.#state.auth.codeDigits;
    const digit = key === 'clear' || key === 'back' ? '' : codeDigitsOf(key);
    const code = key === 'clear' ? '' : key === 'back' ? c.slice(0, -1) : c.length < max ? c + digit : c;
    this.#auth({ code, problem: null });
    return code.length === max && c.length !== max;
  }

  /**
   * F-1: A PASTED CODE. Cleaned by `codeDigitsOf` and cut at the box count, so
   * "4821 0937" fills all eight boxes first time. Returns true when it filled
   * them - the caller then verifies, exactly as for the last keypad digit. A
   * paste with no digits in it changes nothing.
   */
  enterCode(raw: string): boolean {
    const max = this.#state.auth.codeDigits;
    const code = codeDigitsOf(raw).slice(0, max);
    if (code === '') return false;
    this.#auth({ code, problem: null });
    return code.length === max;
  }

  /** A request left. The previous problem is no longer the news. */
  authBusy(): void {
    this.#auth({ busy: true, problem: null, retryAfterSeconds: null });
  }

  /**
   * A code went out - or, in invite mode, the server said none would. Straight
   * to A4 with an empty code, counting a resend, with the box count and the
   * words the reply asked for.
   */
  codeSent(resend: boolean, reply?: { readonly mode: CodeMode; readonly digits: number }): void {
    this.#auth(
      {
        busy: false,
        code: '',
        problem: null,
        retryAfterSeconds: null,
        resends: this.#state.auth.resends + (resend ? 1 : 0),
        ...(reply === undefined ? {} : { codeMode: reply.mode, codeDigits: reply.digits, codeModeKnown: true }),
      },
      'A4',
    );
  }

  /**
   * LIVE DEMO S3-4: A5 "Try again" - back to an empty code entry for the same
   * number. Nothing is sent and nothing is said about why the last code failed:
   * the server's answer is the same for every wrong code, and so is this.
   */
  retryCode(): void {
    this.#auth({ code: '', problem: null, busy: false, retryAfterSeconds: null }, 'A4');
  }

  /**
   * Something refused. A code problem is A5; no signal or a broken server is a
   * notice on the screen he is on, because his input may have been fine.
   */
  authFailed(problem: AuthProblem, retryAfterSeconds: number | null = null): void {
    const onA5 = A5_PROBLEMS.includes(problem);
    this.#auth(
      {
        busy: false,
        problem,
        retryAfterSeconds,
        ...(problem === 'mismatch' || problem === 'expired' ? { code: '' } : {}),
      },
      onA5 ? 'A5' : undefined,
    );
  }

  /** Verified. The number is kept for A6 and A8; everything typed is not. */
  signedIn(next: 'T1' | 'X1'): void {
    this.#auth({ code: '', problem: null, busy: false, retryAfterSeconds: null, resends: 0 });
    this.goTo(next);
  }

  /** HT-13: the number signed into another shop; the host undid it. Back to A3, told why. */
  wrongShop(): void {
    this.#auth({ code: '', problem: null, busy: false, retryAfterSeconds: null }, 'A3');
    this.refuse('wrongShop', 'this book belongs to another number');
  }

  /** The server no longer accepts this device's session. */
  sessionExpired(): void {
    this.#auth({ code: '', problem: null, busy: false });
    this.goTo('A6');
  }

  /** A3 or A4: "I changed my number" - open A7, remembering where from (HT-26). */
  openNumberChange(): void {
    const from = this.#state.screen === 'A4' ? 'A4' : 'A3';
    this.goTo('A7');
    this.#auth({ recovery: 'decide', recoveryFrom: from });
  }

  /** A7: which of its two paths he chose. */
  setRecovery(recovery: AuthState['recovery']): void {
    this.#auth({ recovery });
  }

  /**
   * F-22: the host deleted the account (or this phone's book). The name and the
   * number go with it; S8 shows what happened until he taps Done.
   */
  accountDeleted(outcome: DeletionOutcome): void {
    this.#auth({ phone: '', code: '', problem: null, busy: false });
    this.#state = { ...this.#state, deletion: outcome, shopName: '', lastRefusal: null };
  }

  /** Done on the outcome: the phone is a first run now, so it starts at the splash. */
  finishDeletion(): void {
    this.#state = { ...this.#state, deletion: null };
    this.goTo('A1');
  }
}
