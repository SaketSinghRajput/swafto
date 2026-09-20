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
  type Entry,
  type Paise,
} from '@swafto/formula-engine';
import type { Store } from '../store/index.ts';
import type { KeypadKey } from '../components/Keypad.tsx';
import type { CommitOption } from '../components/EntryForm.tsx';
import type { Language } from '../i18n/strings.ts';
import { CONSENT_PURPOSES, PRIVACY_NOTICE_VERSION, type ConsentPurpose } from '@swafto/values';
import type { Mode as DisplayMode } from '../theme/tokens.ts';

export type ScreenId =
  | 'X0'
  | 'T1'
  | 'T5'
  | 'T6'
  | 'T7'
  | 'T8'
  | 'T9'
  | 'T10'
  | 'T11'
  | 'T12'
  | 'T14';

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
  readonly lastRefusal: { readonly field: string; readonly message: string } | null;
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
}

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
}

export class Session {
  readonly #store: Store;
  readonly #options: SessionOptions;
  #digits = '';
  #state: SessionState;

  constructor(store: Store, options: SessionOptions) {
    this.#store = store;
    this.#options = options;
    this.#state = {
      screen: options.screen ?? 'T1',
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
    };
  }

  get state(): SessionState {
    return this.#state;
  }

  get store(): Store {
    return this.#store;
  }

  goTo(screen: ScreenId): void {
    // The draft belongs to the screen that was collecting it.
    this.#digits = '';
    this.#state = { ...this.#state, screen, draftPaise: null, lastRefusal: null };
  }

  setLanguage(language: Language): void {
    this.#state = { ...this.#state, language };
  }

  setDisplay(display: DisplayMode): void {
    this.#state = { ...this.#state, display };
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
    if (key === 'clear') this.#digits = '';
    else if (key === 'back') this.#digits = this.#digits.slice(0, -1);
    else if (this.#digits.length < MAX_DIGITS) {
      this.#digits = this.#digits === '0' ? key : this.#digits + key;
    }

    // Concatenation, not multiplication: '123' -> 12300, exact by construction.
    const paise = this.#digits === '' ? null : Number(this.#digits + '00');
    this.#state = { ...this.#state, draftPaise: paise, lastRefusal: null };
  }

  /**
   * Commit what has been typed, through the parser that owns the section.
   *
   * Returns the entry it appended, or null if something refused it - in which
   * case `state.lastRefusal` names the field, which is what the screen shows.
   */
  commit(option: CommitOption): Entry | null {
    const amount = this.#state.draftPaise;
    if (amount === null) {
      this.#state = {
        ...this.#state,
        lastRefusal: { field: 'amount', message: 'type an amount first' },
      };
      return null;
    }

    try {
      const parse = PARSER_FOR[option.section as keyof typeof PARSER_FOR];
      const partyId = this.#options.selectedPartyId?.();
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
      this.#state = { ...this.#state, draftPaise: null, lastRefusal: null };
      return entry;
    } catch (e) {
      this.#state = {
        ...this.#state,
        lastRefusal:
          e instanceof EntryInputError
            ? { field: e.field, message: e.message }
            : { field: 'entry', message: (e as Error).message },
      };
      return null;
    }
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
      /*
       * Straight to the difference screen whether or not there IS one. T12 shows
       * a zero difference as readily as a gap, and routing only on a mismatch
       * would make the screen he sees depend on the answer - which is how a
       * shopkeeper learns that seeing T12 means he is in trouble.
       */
      screen: 'T12',
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
    this.#store.setOpeningCash(opening);
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
    this.#state = { ...this.#state, screen: 'T1', consentMode: 'signup', lastRefusal: null };
    return {
      noticeVersion: this.#options.noticeVersion ?? PRIVACY_NOTICE_VERSION,
      locale: this.#state.language,
      granted,
    };
  }

  /** T5: he says a section is empty, which is not the same as not reaching it. */
  skipSection(section: Entry['section']): void {
    this.#store.skip(section);
    this.#state = { ...this.#state };
  }
}
