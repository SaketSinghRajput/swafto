/**
 * THE COMPOSITION ROOT. Where the store, the session and the client become one
 * running app.
 *
 * Every piece existed and nothing assembled them: `ApiClient` was constructed
 * only in tests, and `Store.ackOutbox` had no caller outside one. An app made
 * of correct parts that nothing wires together is an app that gets wired on the
 * day of the build, under time pressure, by whoever is holding the handset.
 *
 * WHAT IS INJECTED, AND WHY EACH ONE. `fetch` so the transport can be driven
 * from a test; storage so the tokens can live in the Android Keystore in
 * production and a variable in a test; the clock and the id source so a test is
 * deterministic. Nothing here reaches for a global, which is what lets the whole
 * host be exercised against the real API with no device.
 *
 * THE DRAIN IS THE ONLY LOOP IN THE PRODUCT, and it is deliberately dull. Send
 * what is queued, drop what the server took, keep what it did not, stop on the
 * first sign of being offline. No backoff schedule, no retry timer, no
 * queue-reordering: the phone is offline most of the day by design, and every
 * clever thing a sync loop does is a way to lose a row a shopkeeper typed.
 */
import { Store, type OutboxRow } from './store/index.ts';
import {
  Session,
  type SessionOptions,
  type ConsentDecision,
  type AuthProblem,
  type NewPhone,
} from './app/session.tsx';
import { OTP_LIMITS, type ConsentPurpose } from '@swafto/values';
import type { Section } from '@swafto/formula-engine';
import type { KeypadKey } from './components/Keypad.tsx';
import type { DeviceBridge, ConfirmResult } from './platform/device.ts';
import { phrase, type StringKey } from './i18n/strings.ts';
import {
  ApiClient,
  ApiError,
  Offline,
  Unauthenticated,
  type HttpRequest,
  type SessionTokens,
  type TokenStore,
  type Transport,
  type PushRejection,
} from './net/client.ts';
import type { PlayBilling } from './net/billing.ts';
import { SyncBackoff } from './net/backoff.ts';
import type { BasePlan, PlanAnswer } from './app/plan.ts';

/**
 * Where the session tokens are kept between launches.
 *
 * ON A HANDSET THIS IS THE KEYSTORE, not AsyncStorage: the tokens are the
 * account. The port keeps that decision in the native host rather than here,
 * and keeps this module testable without either.
 */
export interface SecureStorage {
  read(): string | null;
  write(value: string | null): void;
}

/** A `fetch` as the platform supplies it. Narrowed to what the client needs. */
export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  status: number;
  text(): Promise<string>;
  /** Optional: a WHATWG Response has it; a test double need not. Read only for `Retry-After`. */
  headers?: { get(name: string): string | null };
}>;

/**
 * How long one request may take before it counts as no signal. CHOSEN, NOT
 * MEASURED: generous for a full push batch on 2G, and finite, which is the
 * point - a stalled request with no limit held the single-flight drain in
 * Root for ever, so no later sync ever ran. DEVICE-CHECKLIST can tune it.
 */
export const REQUEST_TIMEOUT_MS = 60_000;

export interface HostOptions {
  /** Where the API lives. No trailing slash; the paths carry their own. */
  readonly baseUrl: string;
  readonly fetch: FetchLike;
  readonly storage: SecureStorage;
  /**
   * Which number and which shop this handset's book belongs to. Survives a
   * sign-out on purpose: A6 and A8 name the number, and the shop is what stops
   * a ledger being uploaded into a DIFFERENT account after a sign-in with
   * another number. Absent in tests that do not exercise sign-in.
   */
  readonly account?: SecureStorage;
  /**
   * F-24: where this install's id is kept, made once on the first code
   * request. Only the key of the server's per-device OTP limit - never
   * identity, never tenancy. Absent in tests that do not need it.
   */
  readonly install?: SecureStorage;
  readonly store: Store;
  readonly now?: () => string;
  readonly newId: () => string;
  readonly language?: SessionOptions['language'];
  readonly display?: SessionOptions['display'];
  /** HT-16: where language and display are kept between launches. Absent in most tests. */
  readonly prefs?: SecureStorage;
  /**
   * HT-21: the half-typed entry (digits, section, segment, party), so a
   * process death does not lose a figure he typed. Never an entry: it is only
   * put back on the form, and it goes when he saves, discards or leaves it.
   */
  readonly draft?: SecureStorage;
  /**
   * PR-7: the server's last plan answer, and a purchase token Play handed over
   * that the server has not yet confirmed. Never a flag the phone decided -
   * only what the server said, with the time it said it holds until.
   */
  readonly planCache?: SecureStorage;
  /** PR-7: Play Billing. Absent (a test, a build without it) means buying is not open. */
  readonly billing?: PlayBilling;
  /** R5 FR-3: the phone's screen lock. Absent means none can be asked for. */
  readonly device?: DeviceBridge;
  /** FE-10: the backoff's clock (ms) and dice, injected so a test fixes both. */
  readonly backoff?: SyncBackoff;
  /**
   * RTI-7: the device ids whose "new phone signed in" notice he dismissed on
   * this phone, as a JSON array. Local only - the server is not told. Absent
   * in tests that do not need it (a dismissal then lasts the run).
   */
  readonly notices?: SecureStorage;
}

/**
 * RTI-7: HOW LONG A NEW PHONE IS NEWS. Seventy-two hours, from the invite gate
 * (INVITE-CODES-GATE section 1). A DESIGN CHOICE, NOT A MEASUREMENT: the
 * notice fires only if this phone is opened inside the window, which is the
 * residual the gate states.
 */
export const NEW_PHONE_WINDOW_MS = 72 * 60 * 60 * 1000;

/** RTI-7: dismissals kept, newest last. A shop has a handful of phones; this is a bound, not a budget. */
const NOTICES_KEPT = 50;

/**
 * RTI-7: THE NEW PHONE TO TELL HIM ABOUT, from the server's list and nothing
 * else. Not this phone, not one already signed out, signed in under 72 hours
 * before `nowMs`, and not dismissed here. A stamp from the future (a phone
 * clock behind the server's) still counts: hiding a sign-in because a clock
 * is wrong is the wrong way to fail. The newest wins. Null when there is none.
 */
export function newPhoneOf(
  devices: readonly {
    readonly id: string;
    readonly createdAt: string | null;
    readonly revokedAt: string | null;
    readonly current: boolean;
  }[],
  nowMs: number,
  dismissed: ReadonlySet<string>,
): NewPhone | null {
  let found: NewPhone | null = null;
  for (const d of devices) {
    if (d.current || d.revokedAt !== null || d.createdAt === null || dismissed.has(d.id)) continue;
    const at = Date.parse(d.createdAt);
    if (Number.isNaN(at) || nowMs - at >= NEW_PHONE_WINDOW_MS) continue;
    if (found === null || at > Date.parse(found.createdAt)) found = { id: d.id, createdAt: d.createdAt };
  }
  return found;
}

/** What `planCache` holds. */
interface PlanCache {
  readonly answer: PlanAnswer | null;
  /** Bought on Play, not yet confirmed by the server. Re-sent until it is. */
  readonly pending: { readonly token: string; readonly productId: string } | null;
}

/**
 * R5 FR-3: HOW LONG IN THE BACKGROUND BEFORE THE APP ASKS AGAIN. A DESIGN
 * CHOICE, NOT A MEASUREMENT: long enough that answering a call or a customer's
 * UPI app at the counter does not cost an unlock every time, short enough that
 * a phone left on the counter is covered before somebody else picks it up.
 * ponytail: fixed five minutes; make it a setting if shopkeepers ask.
 */
export const LOCK_AFTER_MS = 5 * 60 * 1000;

/** Push refusals that mean "not yet", not "never": the row stays in the queue (docs/design/CANCEL-ENTRY-GATE.md section 7). */
export const RETRYABLE_REFUSALS: ReadonlySet<string> = new Set(['cancel_target_missing']);

/** HT-21: what `draft` holds. The digits are the keys he pressed, never a derived figure. */
interface Draft {
  readonly dayId: string;
  readonly section: string;
  readonly commit: number;
  readonly digits: string;
  readonly partyId: string | null;
  /**
   * LIVE DEMO S3-8: a correction being typed on T16, by the id of the entry it
   * corrects. Present only when `section` is CORRECTION_DRAFT.
   */
  readonly originalId?: string;
}

/** Not a section: the marker for a T16 correction draft. */
const CORRECTION_DRAFT = 'correction';

const DRAFT_SECTIONS = [
  'cash_sales',
  'upi_sales',
  'udhar_sales',
  'purchase',
  'expense',
  'udhar_collection',
  'party_payment',
  'withdrawal',
] as const;

function readDraft(storage: SecureStorage | undefined): Draft | null {
  try {
    const raw = JSON.parse(storage?.read() ?? 'null') as Draft | null;
    if (raw === null || typeof raw !== 'object') return null;
    const correction = raw.section === CORRECTION_DRAFT && typeof raw.originalId === 'string';
    if (!correction && !(DRAFT_SECTIONS as readonly string[]).includes(raw.section)) return null;
    if (typeof raw.digits !== 'string' || !/^[0-9]{1,8}$/.test(raw.digits)) return null;
    if (!Number.isInteger(raw.commit) || typeof raw.dayId !== 'string') return null;
    return raw;
  } catch {
    return null;
  }
}

interface Prefs {
  readonly language?: SessionOptions['language'];
  readonly display?: SessionOptions['display'];
  readonly appLock?: boolean;
  /** M3: kept only when it is not Normal, so an older prefs string is unchanged. */
  readonly textSize?: SessionOptions['textSize'];
  /** INVITE GATE: the last code request said "invite", so A3 says so before the next one. */
  readonly codeMode?: SessionOptions['codeMode'];
}

/** RTI-7: what `notices` holds - an array of device ids. Anything else is nothing dismissed. */
function readDismissed(storage: SecureStorage | undefined): string[] {
  try {
    const raw = JSON.parse(storage?.read() ?? '[]') as unknown;
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** What `prefs` holds, or nothing - an unknown value is dropped, never rendered. */
function readPrefs(storage: SecureStorage | undefined): Prefs {
  try {
    const raw = JSON.parse(storage?.read() ?? '{}') as Prefs;
    return {
      ...(['en', 'hi', 'or'].includes(raw.language as string) ? { language: raw.language } : {}),
      ...(['comfort', 'focus'].includes(raw.display as string) ? { display: raw.display } : {}),
      ...(raw.appLock === true ? { appLock: true } : {}),
      ...(['large', 'xlarge'].includes(raw.textSize as string) ? { textSize: raw.textSize } : {}),
      ...(raw.codeMode === 'invite' ? { codeMode: 'invite' as const } : {}),
    };
  } catch {
    return {};
  }
}

/**
 * `Retry-After` is delta-seconds or an HTTP date (RFC 9110 10.2.3). Whole
 * seconds out, or undefined for anything unreadable or already past.
 */
export function parseRetryAfter(value: string | null, nowMs: number = Date.now()): number | undefined {
  if (value === null) return undefined;
  const v = value.trim();
  if (/^\d+$/.test(v)) return Number(v);
  const at = Date.parse(v);
  if (Number.isNaN(at)) return undefined;
  const seconds = Math.ceil((at - nowMs) / 1000);
  return seconds > 0 ? seconds : undefined;
}

/**
 * The transport, and the only place in the app that touches the network.
 *
 * IT NEVER THROWS FOR A STATUS. A 4xx is an answer and the client turns it
 * into an `ApiError`; only a request that did not complete throws, and the
 * client turns that into `Offline`. Collapsing the two here would make an
 * outbox drain unable to tell "the server refused this row" from "there is no
 * signal", and those must lead to opposite behaviour.
 */
export function fetchTransport(
  baseUrl: string,
  doFetch: FetchLike,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Transport {
  const exchange = async (request: HttpRequest, signal: AbortSignal) => {
    const response = await doFetch(baseUrl + request.path, {
      method: request.method,
      headers: {
        ...request.headers,
        ...(request.body === undefined ? {} : { 'content-type': 'application/json' }),
        accept: 'application/json',
      },
      ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
      signal,
    });
    return {
      status: response.status,
      text: await response.text(),
      retryAfterSeconds: parseRetryAfter(response.headers?.get('retry-after') ?? null),
    };
  };

  return {
    async send(request) {
      /*
       * A TIMEOUT IS A THROW, so the client calls it `Offline` and nothing is
       * acked - the server may or may not have the rows, and push is
       * idempotent, so the next drain resends them. The race bounds the wait
       * even if a fetch ignores the abort; the abort frees the socket.
       */
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timedOut = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('the request timed out'));
        }, timeoutMs);
      });
      let answer: { status: number; text: string; retryAfterSeconds: number | undefined };
      try {
        answer = await Promise.race([exchange(request, controller.signal), timedOut]);
      } finally {
        clearTimeout(timer);
      }
      const response = { status: answer.status };
      const text = answer.text;
      let body: unknown = null;
      if (text) {
        try {
          body = JSON.parse(text) as unknown;
        } catch {
          /*
           * Not JSON. A proxy error page, a captive portal, a gateway timeout
           * in HTML. The status still carries the meaning, and the body is
           * deliberately dropped rather than guessed at.
           */
          body = null;
        }
      }
      return {
        status: response.status,
        body,
        ...(answer.retryAfterSeconds === undefined ? {} : { retryAfterSeconds: answer.retryAfterSeconds }),
      };
    },
  };
}

/** Tokens in the platform's secure storage, as one JSON blob. */
export function secureTokenStore(storage: SecureStorage): TokenStore {
  return {
    read() {
      const raw = storage.read();
      if (!raw) return null;
      try {
        return JSON.parse(raw) as SessionTokens;
      } catch {
        /*
         * Unreadable is the same as absent, and must not crash the launch.
         * The consequence is a sign-in, which costs one SMS; throwing here
         * would cost an app that cannot start.
         */
        return null;
      }
    },
    write(tokens) {
      storage.write(tokens === null ? null : JSON.stringify(tokens));
    },
  };
}

export interface SyncOutcome {
  /** What the server took, and what the store has therefore forgotten. */
  readonly accepted: number;
  /** Rows the server refused. They are still queued, and named. */
  readonly rejected: readonly PushRejection[];
  /** True when nothing was sent because there was nothing to send. */
  readonly idle: boolean;
  /** True when the request never reached the server. Nothing was lost. */
  readonly offline: boolean;
  /** True when there is no usable session. The host shows sign-in. */
  readonly needsSignIn: boolean;
  /**
   * True when the signed-in shop is not the shop this book was bound to, so
   * nothing was sent. The rows stay queued; uploading them would write one
   * shop's ledger into another's account.
   */
  readonly wrongShop: boolean;
}

const IDLE: SyncOutcome = {
  accepted: 0,
  rejected: [],
  idle: true,
  offline: false,
  needsSignIn: false,
  wrongShop: false,
};

/** The account record, as `account` storage holds it. */
interface Account {
  readonly phone: string;
  readonly shopId: string;
  /** RT-3: the server-issued device id from the last sign-in. Survives sign-out; erased with the account record. */
  readonly deviceId?: string;
}

export class Host {
  readonly store: Store;
  readonly session: Session;
  readonly client: ApiClient;
  readonly #now: () => string;
  readonly #account: SecureStorage | undefined;
  readonly #install: SecureStorage | undefined;
  readonly #newId: () => string;
  /** DV-13: the name the server last took this run. Per process, so one send per launch. */
  #sentShopName: string | null = null;
  /** What he agreed to on X0 this run, for the verify call to carry. */
  #consent: ConsentDecision | null = null;
  /** When the code in his hand stops working, in ms - from the server's own figure. */
  #codeExpiresAt = 0;
  /** Wrong codes typed against the current one. */
  #wrongCodes = 0;
  readonly #planCache: SecureStorage | undefined;
  readonly #notices: SecureStorage | undefined;
  /** RTI-7: dismissed new-phone notices, by device id. Read once; written on each dismissal. */
  readonly #dismissed: string[];
  readonly #billing: PlayBilling | undefined;
  readonly #device: DeviceBridge | undefined;
  /** R5 FR-3: when the app went to the background, in ms. Null while in front. */
  #backgroundAt: number | null = null;
  /**
   * R5 FR-3: a confirm is on screen. The phone's own lock screen is another
   * activity, so asking for it sends this app to the background and back - and
   * that round trip must not count as "away", or every unlock would re-lock.
   */
  #confirming = false;

  constructor(options: HostOptions) {
    const now = options.now ?? (() => new Date().toISOString());
    this.#now = now;
    this.#account = options.account;
    this.#install = options.install;
    this.#newId = options.newId;
    this.#device = options.device;
    if (options.backoff) this.#backoff = options.backoff;
    this.store = options.store;
    this.client = new ApiClient(
      fetchTransport(options.baseUrl, options.fetch),
      secureTokenStore(options.storage),
    );
    const prefs = readPrefs(options.prefs);
    const language = prefs.language ?? options.language;
    const display = prefs.display ?? options.display;
    this.session = new Session(this.store, {
      now,
      newId: options.newId,
      ...(language ? { language } : {}),
      ...(display ? { display } : {}),
      ...(prefs.appLock ? { appLock: true } : {}),
      ...(prefs.textSize ? { textSize: prefs.textSize } : {}),
      ...(prefs.codeMode ? { codeMode: prefs.codeMode } : {}),
      // X4: the lock is offered at the end of setup only where the phone can be asked.
      ...(options.device ? { offerAppLock: true } : {}),
      ...(this.#readAccount() ? { phone: this.#readAccount()!.phone } : {}),
      /*
       * No tokens and no finished onboarding means a new install, so the
       * splash is first (A1 -> A2 -> X0 -> A3). A shop name on disk means
       * onboarding was already done - asking again after every restart is how
       * the opening cash got typed twice.
       *
       * A SHOP NAME AND NO TOKENS IS EVERY TESTER WHO INSTALLED BEFORE
       * SIGN-IN EXISTED, and it lands on Today with the book intact. Sign-in
       * is offered from Settings; nothing on the phone is moved, replaced or
       * asked for again, and the first successful sign-in binds the book to
       * the account it creates, so the queued rows upload there.
       */
      /*
       * HT-2: signed in but never told the shop's name means onboarding was
       * abandoned (Back on X1 leaves the app). That used to open Today with
       * setup skipped and a nameless shop on the phone and the server; it now
       * resumes X1.
       */
      /*
       * HT-12: AN ACCOUNT RECORD AND NO TOKENS IS A LOG-OUT, not a pre-sign-in
       * tester (who never had a record). It reopened on Today with every figure
       * showing; it now reopens where Log out left him, on A3.
       */
      screen: this.client.session
        ? this.store.state.shopName ? 'T1' : 'X1'
        : this.#readAccount() ? 'A3' : this.store.state.shopName ? 'T1' : 'A1',
    });
    // HT-16: a language or display chosen in Settings used to revert on relaunch.
    let kept = JSON.stringify(prefs);
    this.session.subscribe(() => {
      const { language: l, display: d, appLock: a, textSize: z, auth } = this.session.state;
      const now = JSON.stringify({
        language: l,
        display: d,
        ...(a ? { appLock: true } : {}),
        ...(z !== undefined && z !== 'normal' ? { textSize: z } : {}),
        // INVITE GATE: kept only in invite mode, so an SMS-mode prefs string is unchanged.
        ...(auth.codeMode === 'invite' ? { codeMode: 'invite' } : {}),
      });
      if (now !== kept) options.prefs?.write((kept = now));
    });
    this.#restoreDraft(options.draft);
    this.#planCache = options.planCache;
    this.#notices = options.notices;
    this.#dismissed = readDismissed(options.notices);
    this.#billing = options.billing;
    // PR-7: offline at launch, the plan is the last answer - and `planOf` ends it at its `until`.
    this.session.setPlanAnswer(this.#readPlan().answer);
  }

  /* ---- PR-7 · the plan ------------------------------------------------- */

  #readPlan(): PlanCache {
    try {
      const raw = this.#planCache?.read();
      const parsed = raw ? (JSON.parse(raw) as Partial<PlanCache>) : {};
      return { answer: parsed.answer ?? null, pending: parsed.pending ?? null };
    } catch {
      // Unreadable is the same as never asked: free, until the server says otherwise.
      return { answer: null, pending: null };
    }
  }

  #writePlan(patch: Partial<PlanCache>): void {
    const next = { ...this.#readPlan(), ...patch };
    this.#planCache?.write(JSON.stringify(next));
    if ('answer' in patch) this.session.setPlanAnswer(next.answer);
  }

  /**
   * Ask the server what the plan is, re-send any purchase it has not yet
   * confirmed, and ask Play what it offers. Offline, the cached answer stands
   * and nothing is said: there is nothing for him to do about it.
   */
  async refreshPlan(): Promise<void> {
    if (!this.client.session) return;
    try {
      this.#writePlan({ answer: await this.client.planAnswer() });
    } catch {
      return;
    }
    // A purchase still unconfirmed is retried; its failure never hides what Play offers.
    await this.#confirmPending().catch(() => undefined);
    await this.#loadOffer();
  }

  async #loadOffer(): Promise<void> {
    const buying = this.session.state.planAnswer?.buying;
    this.session.setPlanOffer(
      buying && this.#billing
        ? await this.#billing.products(buying.productId)
        : { kind: 'unavailable', reason: 'buying is not open' },
    );
  }

  /** A token Play gave us, sent to the server. Kept until the server answers yes or a definite no. */
  async #confirmPending(): Promise<boolean> {
    const pending = this.#readPlan().pending;
    if (!pending) return true;
    try {
      this.#writePlan({ answer: await this.client.verifyPurchase(pending.token, pending.productId), pending: null });
      return true;
    } catch (e) {
      // A 4xx is the server's final word on this token; anything else is retried next time.
      if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 401) {
        this.#writePlan({ pending: null });
        this.session.planSaid('failed');
      }
      throw e;
    }
  }

  /** "Try Premium free for 14 days". No payment details; it simply ends. */
  async startPreview(): Promise<void> {
    this.session.planWorking(true);
    try {
      const answer = await this.client.startPreview();
      this.#writePlan({ answer: { entitlement: answer.entitlement, buying: answer.buying } });
      this.session.planSaid(answer.started ? 'previewStarted' : null);
    } catch (e) {
      this.session.planSaid(e instanceof Offline ? 'offline' : 'failed');
    }
  }

  /**
   * Buy a base plan through Play's own sheet. IT NEVER FAKES SUCCESS: with no
   * Play, no product, or no server open for buying, the answer is `notOpen`,
   * and Premium is on only when the SERVER says so after checking with Google.
   */
  async buyPremium(basePlan: BasePlan): Promise<void> {
    const buying = this.session.state.planAnswer?.buying;
    const offer = this.session.state.planOffer;
    const plan = offer?.kind === 'ready' ? offer.plans.find((p) => p.basePlanId === basePlan) : undefined;
    if (!buying || !plan || !this.#billing) {
      this.session.planSaid('notOpen');
      return;
    }
    this.session.planWorking(true);
    const result = await this.#billing.purchase(buying.productId, plan.offerToken, buying.accountId);
    switch (result.kind) {
      case 'purchased':
        // On disk BEFORE the network: a process death here must not lose a paid purchase.
        this.#writePlan({ pending: { token: result.purchaseToken, productId: buying.productId } });
        try {
          await this.#confirmPending();
          this.session.planSaid('purchased');
        } catch (e) {
          if (!(e instanceof ApiError && e.status < 500 && e.status !== 401)) this.session.planSaid('verifyLater');
        }
        return;
      case 'cancelled':
        // He changed his mind. Nothing is said, and nothing is asked again.
        this.session.planSaid(null);
        return;
      case 'pending':
        this.session.planSaid('pending');
        return;
      case 'unavailable':
        this.session.planSaid('notOpen');
        return;
      case 'failed':
        this.session.planSaid('failed');
        return;
    }
  }

  /**
   * HT-21: put a half-typed entry back on its form after a process death, and
   * keep the current one on disk while it is being typed.
   *
   * It comes back only onto Today of the SAME open day: a draft from a day
   * that has since closed or rolled over is dropped, because putting it on a
   * different day's form would be the app choosing a date he never chose. A
   * party that is no longer in the book is not named. Nothing is committed -
   * the shopkeeper still taps Add himself.
   *
   * LIVE DEMO S3-8: T16'S CORRECTION TOO. The A36 test typed 123 into a
   * correction, the process was killed, and it came back to Today with nothing.
   * A correction is typed most often on a CLOSED day - that is what it is for -
   * so it returns onto the same business day whether open or closed, and only
   * while the entry it corrects is still in the book. Posting it, or leaving
   * T16, clears it, exactly as Add and Back clear an entry draft.
   */
  #restoreDraft(storage: SecureStorage | undefined): void {
    if (!storage) return;
    const day = this.store.state.day;
    const held = readDraft(storage);
    if (
      held &&
      held.section === CORRECTION_DRAFT &&
      this.session.state.screen === 'T1' &&
      held.dayId === day.date &&
      held.originalId !== undefined &&
      this.store.findEntry(held.originalId) !== undefined
    ) {
      this.session.openCorrection();
      this.session.chooseCorrectionTarget(held.originalId);
      for (const d of held.digits) this.session.press(d as KeypadKey);
    } else if (held && held.section !== CORRECTION_DRAFT && this.session.state.screen === 'T1' && day.state === 'open' && held.dayId === day.date) {
      this.session.openSection(held.section as Section);
      this.session.selectCommit(held.commit);
      for (const d of held.digits) this.session.press(d as KeypadKey);
      if (held.partyId && this.store.state.parties.some((p) => p.id === held.partyId)) {
        this.session.chooseEntryParty(held.partyId);
      }
    }
    let kept = held ? JSON.stringify(held) : null;
    const keep = () => {
      const st = this.session.state;
      const correcting = st.screen === 'T16' ? (st.correction?.originalId ?? null) : null;
      const now =
        correcting !== null && st.draftPaise !== null
          ? JSON.stringify({
              dayId: this.store.state.day.date,
              section: CORRECTION_DRAFT,
              commit: 0,
              digits: this.session.typedDigits,
              partyId: null,
              originalId: correcting,
            } satisfies Draft)
          : st.entrySection !== null && st.draftPaise !== null
          ? JSON.stringify({
              dayId: this.store.state.day.date,
              section: st.entrySection,
              commit: st.selectedCommit,
              digits: this.session.typedDigits,
              partyId: st.entryPartyId,
            } satisfies Draft)
          : null;
      if (now !== kept) storage.write((kept = now));
    };
    keep();
    this.session.subscribe(keep);
  }

  /* ---- R5 FR-3 · the app lock ---------------------------------------- */

  /**
   * ASK THE PHONE'S OWN SCREEN LOCK, AND WHAT A NON-ANSWER MEANS.
   *
   * 'ok' unlocks. 'cancelled' leaves the cover up with its Unlock button - he
   * backed out, he did not fail. 'unavailable' (the phone has no screen lock
   * any more, or cannot show it) LETS HIM IN, with a note that the lock is
   * paused. That is the conservative reading of security against access, and
   * the reasoning is the whole decision:
   *
   *   - A phone's screen lock can only be removed by somebody who passes it.
   *     Whoever reached "no screen lock" already proved the credential this
   *     lock would have asked for, so letting them in is never weaker than the
   *     phone's own lock - which is all this feature ever promised to be.
   *   - Refusing would lock the owner out of a book that may exist only on this
   *     phone (offline-first, unsynced rows), with no recovery path at all: we
   *     hold no PIN to reset. A permanent loss of his own records is the worse
   *     failure by far.
   */
  async #ask(
    title: StringKey = 's11.title',
    body: StringKey = 's11.confirmBody',
  ): Promise<ConfirmResult> {
    const device = this.#device;
    if (!device || !(await device.isDeviceSecure())) return 'unavailable';
    const lang = this.session.state.language;
    return device.confirmCredential(phrase(title, lang), phrase(body, lang));
  }

  /** The cover's Unlock, and the prompt after a cold start or a return. No-op if not locked. */
  async unlock(): Promise<void> {
    if (!this.session.state.locked || this.#confirming) return;
    this.#confirming = true;
    try {
      const r = await this.#ask();
      if (r === 'ok') this.session.setLock({ locked: false, lockNote: null });
      else if (r === 'unavailable') this.session.setLock({ locked: false, lockNote: 'paused' });
    } finally {
      this.#confirming = false;
    }
  }

  /**
   * AppState, as Root hears it. Away for LOCK_AFTER_MS or longer with the lock
   * on means the cover goes up on return and the prompt is asked for.
   */
  appStateChanged(status: string): void {
    if (this.#confirming) return;
    const at = Date.parse(this.#now());
    if (status !== 'active') {
      if (this.#backgroundAt === null) this.#backgroundAt = at;
      return;
    }
    const away = this.#backgroundAt;
    this.#backgroundAt = null;
    const st = this.session.state;
    if (st.appLock && !st.locked && away !== null && at - away >= LOCK_AFTER_MS) {
      this.session.setLock({ locked: true });
      void this.unlock();
    }
  }

  /**
   * S1's switch. ON needs a confirm first - it proves he can pass the lock
   * before the app starts asking for it - and is refused, with the reason on
   * S1, on a phone with no screen lock. OFF needs a confirm too, so a passer-by
   * on an unlocked screen cannot quietly switch it off; on a phone with no
   * screen lock there is nothing to confirm with, and the lock was already
   * paused, so it simply turns off.
   */
  async setAppLock(on: boolean): Promise<void> {
    if (this.#confirming || on === (this.session.state.appLock === true)) return;
    this.#confirming = true;
    try {
      const secure = this.#device ? await this.#device.isDeviceSecure() : false;
      if (!secure) {
        this.session.setLock(on ? { lockNote: 'noScreenLock' } : { appLock: false, lockNote: null });
        return;
      }
      // HT-45: S1 is open and the book is showing - the prompt says what the switch does, not "locked".
      const title = on ? 's1.appLockOnTitle' : 's1.appLockOffTitle';
      if ((await this.#ask(title, 's1.appLockConfirmBody')) === 'ok') {
        this.session.setLock({ appLock: on, lockNote: null });
      }
    } finally {
      this.#confirming = false;
    }
  }

  /**
   * X4 "Turn on": the same enable flow as S1's switch - the phone's own lock is
   * asked first. On, and setup goes on to Today. No screen lock: X4 says he can
   * set one later and offers Continue. Cancelled: X4 stays, Not now is there.
   * Setup is never blocked.
   */
  async turnOnLockFromSetup(): Promise<void> {
    await this.setAppLock(true);
    if (this.session.state.appLock === true && this.session.state.screen === 'X4') {
      this.session.finishLockOffer();
    }
  }

  /* ---- sign-in -------------------------------------------------------- */

  #readAccount(): Account | null {
    const raw = this.#account?.read() ?? null;
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Account;
    } catch {
      return null; // unreadable is absent, as for the tokens
    }
  }

  /** F-24: this install's id, made and kept on first use. Undefined without storage. */
  #installId(): string | undefined {
    if (!this.#install) return undefined;
    const held = this.#install.read();
    if (held) return held;
    const made = this.#newId();
    this.#install.write(made);
    return made;
  }

  /**
   * DV-13: tell the server the shop's name. On a new install the account is
   * made at verify, BEFORE X1 asks the name, so the server never had it.
   * Derived from the store rather than queued as an event, so a handset whose
   * shop was created nameless (every one before this) heals on its next sync,
   * and a failure is simply retried on the next drain - never dropped, never
   * in the way of onboarding. Skipped for a book bound to another shop: its
   * name must not land on the account that happens to be signed in.
   */
  async #sendShopName(): Promise<'sent' | 'skipped' | 'offline' | 'unauthenticated'> {
    const held = this.client.session;
    const name = this.store.state.shopName?.trim();
    const bound = this.#readAccount()?.shopId;
    if (!held || !name || name === this.#sentShopName) return 'skipped';
    if (bound && held.shopId !== bound) return 'skipped';
    try {
      await this.client.setShopName(name);
      this.#sentShopName = name;
      return 'sent';
    } catch (e) {
      // No signal: the outbox would only time out the same way, so stop here.
      if (e instanceof Offline) return 'offline';
      if (e instanceof Unauthenticated) return 'unauthenticated';
      return 'skipped'; // a refusal: retried on the next drain

    }
  }

  /** True while this handset holds a session the server issued. */
  get signedIn(): boolean {
    return this.client.session !== null;
  }

  /** X0 at sign-up: hold what he agreed to, and ask for the number. */
  consented(decision: ConsentDecision): void {
    this.#consent = decision;
    this.session.goTo('A3');
  }

  /**
   * What a refused request means on screen. No signal, the server's 429, and
   * anything else - which is the server breaking, and never called his fault.
   */
  #problem(e: unknown): [AuthProblem, number | null] {
    if (e instanceof Offline) return ['offline', null];
    if (e instanceof ApiError && e.status === 429) return ['locked', e.retryAfterSeconds ?? null];
    return ['failed', null];
  }

  /**
   * A3 "Send code", A4 "Resend", A5 "Send a new code", A6 "Verify with".
   * One request, and the screen moves only on the answer.
   */
  async sendCode(): Promise<void> {
    const s = this.session;
    const { phone, busy } = s.state.auth;
    if (busy || phone.length !== 10) return;
    /*
     * HT-32: THIS BOOK SIGNS IN ONLY AS ITS OWN NUMBER, so say so before the
     * SMS. Refusing after verify cost two codes and left a user and a consent
     * record on the server for a sign-in that was then undone.
     */
    const account = this.#readAccount();
    if (account && account.phone !== phone) {
      s.wrongShop();
      return;
    }
    const resend = s.state.screen === 'A4' || s.state.screen === 'A5';
    s.authBusy();
    try {
      const sent = await this.client.requestOtp('+91' + phone, s.state.language, this.#readAccount()?.deviceId ?? this.#installId());
      /*
       * INVITE GATE: an invite reply carries no lifetime - the code's life is
       * the operator's, not this request's - so only the attempt count can
       * call it dead here. The server says `code_invalid` for both either way.
       */
      this.#codeExpiresAt =
        sent.expiresInSeconds === undefined
          ? Number.POSITIVE_INFINITY
          : Date.parse(this.#now()) + sent.expiresInSeconds * 1000;
      this.#wrongCodes = 0;
      s.codeSent(resend, { mode: sent.mode, digits: sent.digits });
    } catch (e) {
      s.authFailed(...this.#problem(e));
    }
  }

  /**
   * A4, the moment the sixth digit lands. Tokens are written by the client
   * ONLY on a 200, and the screen leaves A4 only after that write.
   */
  async verifyCode(): Promise<void> {
    const s = this.session;
    // F-1: `code` is ASCII digits already - every way into it (key, paste) goes through codeDigitsOf.
    const { phone, code, busy, codeDigits } = s.state.auth;
    if (busy || code.length !== codeDigits) return;
    s.authBusy();
    try {
      const shopName = this.store.state.shopName;
      const account = this.#readAccount();
      const tokens = await this.client.verify({
        phone: '+91' + phone,
        code,
        platform: 'android',
        ...(shopName ? { shopName } : {}),
        ...(this.#consent ? { consent: this.#consent } : {}),
      });
      /*
       * THE BOOK IS BOUND TO THE FIRST SHOP IT SIGNS INTO, and never rebound.
       * HT-13: signing in as ANOTHER shop used to succeed silently - the other
       * shop's account was shown this book, named after it, and deleting that
       * account wiped this book. Now the sign-in is undone and he is told.
       */
      if (account && tokens.shopId !== account.shopId) {
        await this.client.signOut();
        s.wrongShop();
        return;
      }
      this.#account?.write(JSON.stringify({ phone, shopId: tokens.shopId, deviceId: tokens.deviceId } satisfies Account));
      s.signedIn(shopName ? 'T1' : 'X1');
      void this.syncLatest(true); // HT-9: what queued while signed out goes now
    } catch (e) {
      if (e instanceof ApiError && e.code === 'consent_required') {
        // A number with no account yet, reached without the notice this run.
        s.chooseLanguage(s.state.language);
        return;
      }
      if (e instanceof ApiError && e.status === 401) {
        /*
         * WRONG, OR NO LONGER VALID - the server says `code_invalid` for both.
         * Past the server's own expiry, or past its per-code attempt limit
         * (after which it discards the code), the honest answer is "this code
         * expired, send a new one"; before that, it is a mistyped digit.
         */
        this.#wrongCodes += 1;
        const dead =
          Date.parse(this.#now()) >= this.#codeExpiresAt ||
          this.#wrongCodes >= OTP_LIMITS.verifyPerCode.max;
        s.authFailed(dead ? 'expired' : 'mismatch');
        return;
      }
      s.authFailed(...this.#problem(e));
    }
  }

  /**
   * A8 "Log out". The session goes; THE LEDGER STAYS. Entries, days, parties
   * and the outbox are on this phone and are not touched - offline-first means
   * the book is the shopkeeper's, not the session's.
   */
  async logOut(): Promise<void> {
    await this.client.signOut();
    this.session.goTo('A3');
  }

  /**
   * Send what is queued, and forget only what the server took.
   *
   * THE ORDER IS THE WHOLE SAFETY PROPERTY. Read the queue, send it, and ack
   * only the ids that came back accepted. A client that cleared the queue
   * first, or acked everything it sent, loses a shopkeeper's entries the first
   * time a response is lost - and loses them silently, which is worse.
   */
  #syncing = false;
  #again = false;
  #syncedRevision = -1;
  /** FE-10: after a failed drain, when the next one may go. */
  #backoff: SyncBackoff = new SyncBackoff();

  /**
   * HT-4: SYNC WHEN THE BOOK CHANGES, NOT ONLY ON LAUNCH AND FOREGROUND. The
   * tester watched "17 waiting to sync" sit for sixteen minutes with the API
   * reachable, because nothing drained while the app stayed in front.
   *
   * Keyed on the store's WRITE revision, not on every session change: the
   * session notifies on each keypress, and retrying the network per digit
   * while offline would burn data for nothing. One drain at a time (the outbox
   * is not reentrant); a write that lands mid-drain schedules exactly one
   * more pass instead of being left until the next foreground.
   */
  async syncLatest(force = false, restart = false): Promise<void> {
    /*
     * FE-10: `restart` is launch and foreground - the moments the shopkeeper
     * has come back and signal may have too - and clears the backoff. The
     * 30-second tick and a store write do not: they wait it out.
     */
    if (restart) {
      this.#backoff.reset();
      // FE-11: a refusal may pass with a newer server or build; ask once per launch / foreground.
      // A refusal that repeats re-parks in the same pass, so this cannot loop.
      this.store.unparkOutbox();
    }
    if (!force && this.store.revision === this.#syncedRevision) return;
    if (this.#backoff.blocked) return;
    if (this.#syncing) {
      this.#again = true;
      return;
    }
    this.#syncing = true;
    try {
      do {
        this.#again = false;
        this.#syncedRevision = this.store.revision;
        let failed = false;
        let retryAfter: number | undefined;
        try {
          const outcome = await this.sync();
          failed = outcome.offline;
        } catch (e) {
          // refused as a whole (5xx, 429, 400): the queue keeps it, and we back off
          failed = true;
          if (e instanceof ApiError) retryAfter = e.retryAfterSeconds;
        }
        if (failed) {
          this.#backoff.fail(retryAfter);
          break;
        }
        this.#backoff.reset();
      } while (this.#again);
    } finally {
      this.#syncing = false;
    }
  }

  /**
   * FE-11: A ROW THE SERVER REFUSED IS PARKED, NOT RESENT FOR EVER. It stays on
   * the phone (it is a figure he typed) and is counted on Today as "could not
   * be sent"; it just stops costing a request on every drain.
   */
  #parkRefused(rejected: readonly { readonly id: string; readonly field: string; readonly message: string }[]): void {
    /*
     * CANCEL THIS ENTRY: `cancel_target_missing` is the server not holding the
     * entry yet (it is behind in the queue, or in a batch still to come). Not a
     * refusal of the cancel: it stays queued and goes again on the next drain.
     */
    const parked = rejected.filter((r) => !RETRYABLE_REFUSALS.has(r.field));
    if (parked.length === 0) return;
    this.store.parkOutbox(parked.map((r) => ({ id: r.id, reason: (r.field + ': ' + r.message).slice(0, 200) })));
  }

  async sync(): Promise<SyncOutcome> {
    // Read BEFORE the name is sent: a 401 there clears the tokens, and A6 is
    // owed exactly when there WAS a session to lose.
    const held = this.client.session;
    const named = await this.#sendShopName();
    if (named === 'offline') return { ...IDLE, idle: false, offline: true };
    if (named === 'unauthenticated') {
      this.session.sessionExpired();
      return { ...IDLE, idle: false, needsSignIn: true };
    }
    const queued: readonly OutboxRow[] = this.store.pendingOutbox;
    if (queued.length === 0) return IDLE;

    const bound = this.#readAccount()?.shopId;
    if (held && bound && held.shopId !== bound) {
      return { ...IDLE, idle: false, wrongShop: true };
    }

    try {
      const result = await this.client.push(queued, (batch, sent) => {
        // FE-5: each batch the server answered is acked NOW, so a later batch
        // failing does not send the earlier ones again.
        this.store.ackOutbox(batch.accepted, sent);
        this.#parkRefused(batch.rejected);
      });
      /*
       * Acked AFTER the response, and only the accepted ids. A row the server
       * refused stays queued with its reason, because a rejected entry is a
       * figure he typed and a bug on one side or the other - never rubbish to
       * be thrown away quietly.
       */
      this.store.ackOutbox(result.accepted, queued);
      this.#parkRefused(result.rejected);
      /*
       * DV-12: the ack changes what Today shows ("2 waiting to sync"), but it
       * is a store write the session never saw, so the screen kept the stale
       * count until the next restart. Tell the session; it re-renders.
       */
      this.session.storeChanged();
      return {
        accepted: result.accepted.length,
        rejected: result.rejected,
        idle: false,
        offline: false,
        needsSignIn: false,
        wrongShop: false,
      };
    } catch (e) {
      // Batches acked before the failure changed what Today counts.
      this.session.storeChanged();
      if (e instanceof Offline) {
        return { ...IDLE, idle: false, offline: true };
      }
      if (e instanceof Unauthenticated) {
        /*
         * A6 ONLY IF THERE WAS A SESSION TO LOSE. A handset that never signed
         * in (every pre-sign-in tester) is refused the same way, and moving
         * him to "session expired" on every launch would tell him something
         * that never happened.
         */
        if (held) this.session.sessionExpired();
        return { ...IDLE, idle: false, needsSignIn: true };
      }
      /*
       * Anything else is the server refusing the BATCH rather than a row - a
       * 400 on the envelope, a 429, a 500. The queue is untouched and the
       * error goes up: this loop does not decide what a 500 means.
       */
      throw e;
    }
  }

  /**
   * F-22: S8 "Delete everything".
   *
   * THE PHONE IS WIPED ONLY AFTER THE SERVER HAS SCHEDULED THE ERASURE. Offline
   * or refused, nothing is deleted anywhere and the banner says so: a phone
   * wiped while the request never arrived would leave the account alive on the
   * server with its owner told it was gone. Wiping is not undone by a later
   * sign-in - there is no restore path in this client - so the outcome copy
   * says the phone's book is gone now, not "nothing is lost".
   *
   * NO SESSION: there is no server account this phone can speak for, so only
   * the phone's book is wiped, and S8 said that before he pressed.
   */
  async deleteAccount(): Promise<void> {
    const s = this.session;
    if (this.signedIn) {
      let erasesAt: string;
      try {
        erasesAt = (await this.client.erase('DELETE')).erasesAt;
      } catch (e) {
        const field =
          e instanceof Offline ? 'eraseOffline' : e instanceof Unauthenticated ? 'eraseSignIn' : 'erase';
        s.refuse(field, (e as Error).message);
        return;
      }
      await this.client.signOut();
      if (!this.#wipe()) return;
      s.accountDeleted({ kind: 'scheduled', erasesAt });
      return;
    }
    if (this.#wipe()) s.accountDeleted({ kind: 'local' });
  }

  /** The phone's book, the tokens and the account record. False if it failed. */
  #wipe(): boolean {
    try {
      this.store.eraseAll();
      this.#account?.write(null);
      this.#planCache?.write(null);
      this.session.setPlanAnswer(null);
      // RTI-7: the dismissed device ids belonged to the account that is gone.
      this.#notices?.write(null);
      this.#dismissed.length = 0;
      this.session.newPhoneSeen(null);
      return true;
    } catch (e) {
      this.session.refuse('eraseLocal', (e as Error).message);
      return false;
    }
  }

  /**
   * F-8: open the consent screen on what the SERVER holds now. The link was
   * never wired, so Today's privacy link did nothing. Unreachable server ->
   * the refusal banner, never a screen showing a guess.
   */
  async openPrivacy(): Promise<void> {
    try {
      this.session.openConsentSettings(await this.client.grantedNow());
    } catch (e) {
      // HT-31: nothing was chosen yet, so not the 'choice was not changed' copy.
      this.session.refuse('consentRead', (e as Error).message);
    }
  }

  /**
   * A consent toggle, sent. A WITHDRAWAL THAT DID NOT REACH THE SERVER MUST
   * NOT LOOK DONE: the failure used to be swallowed, so the switch said "off"
   * while the server still held consent. Now the switch goes back and the
   * banner says why.
   */
  /**
   * M3, S13: EVERYTHING THE SERVER HOLDS, TO THE SHARE SHEET. One request
   * (`/v1/me/export`), written to a cache file and handed to the phone's own
   * share sheet - he chooses where it goes, and nothing is sent anywhere else.
   * Offline is said as offline; nothing was downloaded, so nothing is shown.
   */
  async exportMyData(): Promise<void> {
    const s = this.session;
    s.setMyData('busy');
    let text: string;
    try {
      text = JSON.stringify(await this.client.exportMe(), null, 2);
    } catch (e) {
      s.setMyData(e instanceof Offline ? 'offline' : 'failed');
      return;
    }
    try {
      if (!this.#device) throw new Error('file sharing is not available in this build');
      await this.#device.shareTextFile(
        'swafto-my-data.json',
        'application/json',
        text,
        phrase('s13.chooser', s.state.language),
      );
      s.setMyData('done');
    } catch (e) {
      s.setMyData('failed');
      s.refuse('share', (e as Error).message);
    }
  }

  /**
   * F-1: "Paste code" on A4. What the phone's clipboard holds goes through the
   * same cleaning as every key (`codeDigitsOf`), and a paste that fills the
   * boxes verifies, as the last keypad digit does. No bridge, or nothing
   * readable, changes nothing.
   */
  async pasteCode(): Promise<void> {
    let text: string;
    try {
      text = (await this.#device?.readClipboardText?.()) ?? '';
    } catch {
      return;
    }
    if (this.session.enterCode(text)) await this.verifyCode();
  }

  /**
   * RTI-7: IS THERE A NEW PHONE ON THIS SHOP? One `GET /v1/devices` per launch
   * and per foreground - Root calls it on the same two edges as the restarting
   * drain and `refreshPlan` - never on the 30-second tick or a store write.
   * Before this, `listDevices` ran only when S14 was opened from Settings, so
   * nothing told the old phone. Signed out, it asks nothing. A failure
   * leaves the notice as it was: no signal is not evidence that nothing
   * happened, and it is not evidence that something did.
   */
  async checkNewPhone(): Promise<void> {
    if (!this.client.session) return;
    let list: Awaited<ReturnType<ApiClient['listDevices']>>;
    try {
      list = await this.client.listDevices();
    } catch {
      return;
    }
    this.session.newPhoneSeen(newPhoneOf(list, Date.parse(this.#now()), new Set(this.#dismissed)));
  }

  /** RTI-7: "It was me" - this device's notice goes, on this phone, for good. The server is not told. */
  dismissNewPhone(deviceId: string): void {
    if (!this.#dismissed.includes(deviceId)) {
      this.#dismissed.push(deviceId);
      this.#dismissed.splice(0, Math.max(0, this.#dismissed.length - NOTICES_KEPT));
      this.#notices?.write(JSON.stringify(this.#dismissed));
    }
    if (this.session.state.newPhone?.id === deviceId) this.session.newPhoneSeen(null);
  }

  /** M3, S14: the shop's phones, as the server lists them. A failure is said, never guessed around. */
  async loadDevices(): Promise<void> {
    try {
      this.session.devicesLoaded(await this.client.listDevices());
    } catch {
      this.session.devicesLoaded(null);
    }
  }

  /** M3, S14: sign that phone out, then ask the server again - the list is its, not ours. */
  async signOutDevice(deviceId: string): Promise<void> {
    try {
      await this.client.revokeDevice(deviceId);
    } catch {
      this.session.cancelSignOut();
      this.session.devicesLoaded(null);
      return;
    }
    this.session.signedOut();
    await this.loadDevices();
  }

  async changeConsent(purpose: ConsentPurpose, granted: boolean): Promise<void> {
    try {
      await this.client.setConsent(purpose, granted, this.session.state.language);
    } catch (e) {
      this.session.toggleConsent(purpose);
      this.session.refuse('consent', (e as Error).message);
    }
  }
}
