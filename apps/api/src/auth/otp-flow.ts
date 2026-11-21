/**
 * THE OTP REQUEST/VERIFY MECHANICS, shared by sign-in and web deletion so the two
 * cannot drift (they already had, once: C-10). Pure policy over `deps`; routes stay
 * thin.
 *
 * GUESSES. A code survives MAX_VERIFY_ATTEMPTS (5, TB6 / B37) guesses in TOTAL, whoever
 * makes them. The attempt is counted by `takeAttempt` BEFORE the comparison, in one
 * atomic step, so a concurrent burst cannot compare more than five (RT2-1). Guessing
 * across numbers from one address is bounded separately (`verifyPerIp`, SEC-103).
 *
 * RT-3 - A STRANGER WHO KNOWS ONLY A NUMBER AND THE OWNER. What is closed and what is not:
 *
 *  - A NEW REQUEST NO LONGER OVERWRITES A LIVE CODE. Inside OTP_RESEND_COOLDOWN_SECONDS
 *    of the last mint a request neither mints nor sends, and - checked BEFORE any budget
 *    is spent - costs the number nothing. After it, a fresh code replaces the old one,
 *    which a user whose first SMS was lost needs.
 *  - A BLOCKED ADDRESS CANNOT DRAIN A NUMBER'S BUDGET: per-source rules run before the
 *    per-number ones.
 *  - THE OWNER ON HIS OWN PHONE BYPASSES THE PER-NUMBER SEND BUDGET. A request carrying
 *    a `deviceId` that is a (not revoked) `devices` row of this number's account skips
 *    the per-number burst and daily rules, but NOT the cooldown, the per-device rule
 *    or the per-address caps. So the owner can always get a fresh code once a minute,
 *    however many codes an attacker has burned. (The app must send the server-issued
 *    device id as `deviceId`; an install id that never completed sign-in gets no bypass.)
 *
 * RESIDUAL, STATED, A PRODUCT DECISION FOR THE FOUNDER: an attacker who knows the number
 * can still destroy the code in flight - five wrong guesses kill it, and a request one
 * cooldown after the owner's replaces it - so a first sign-in or a re-install on a NEW
 * phone (no device row to bypass with) can be delayed indefinitely at the cost of a few
 * requests a minute. A number-keyed secret cannot tell the owner from a stranger; closing
 * it needs a second factor or a challenge. Existing sessions and the offline ledger are
 * untouched.
 */
import { timingSafeEqual } from 'node:crypto';
import type { AppDeps } from '../app.ts';
import type { RateRule } from '../rate-limit/limits.ts';
import {
  OTP_DIGITS,
  OTP_LIMITS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
} from '../rate-limit/limits.ts';
import type { RateDecision } from '../rate-limit/store.ts';
import type { UserRow } from '../db/port.ts';
import type { SmsPort } from '../sms/port.ts';
import type { OtpKind } from './otp-store.ts';
import { DEMO_PROTECTED_TEMPLATES, isDemoPhone, maskPhone } from './demo.ts';
import { hashOtp, mintOtp } from './tokens.ts';

/** Guesses one code survives in total (TB6 "5 per code"; B37). */
export const MAX_VERIFY_ATTEMPTS = OTP_LIMITS.verifyPerCode.max;

type Check = { rule: RateRule; identifier: string };

/**
 * A loopback peer is either a local caller or - the likely case - a reverse proxy the
 * app does not trust (no `trustProxy`, SEC-111), which puts EVERY caller on
 * 127.0.0.1. An enforcing per-address cap keyed on that would rate-limit the whole
 * country at once, so it is skipped and the global breaker is what applies.
 */
export const isLoopback = (ip: string): boolean =>
  ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

export type RequestOutcome =
  | { readonly kind: 'limited'; readonly decision: RateDecision }
  | { readonly kind: 'accepted' }
  /** The demo phone asked for a code that would let its holder change or lock the demo account. */
  | { readonly kind: 'refused' };

export async function requestOtp(
  deps: AppDeps,
  o: {
    /** The phone for sign-in, `delete:<phone>` for deletion. Also the limiter identifier. */
    readonly key: string;
    /** The real number the SMS goes to. */
    readonly phone: string;
    readonly templateId: Parameters<SmsPort['send']>[0]['templateId'];
    readonly language: 'od' | 'hi' | 'en';
    readonly ip: string;
    readonly deviceId?: string;
    /** The account for this number, if any. Decides the global ceiling and the bypass. */
    readonly user: UserRow | null;
    /** False on the deletion path for a number with no account: nothing is sent. */
    readonly send: boolean;
    /** The request logger, for the one `crit` line when the global ceiling trips. */
    readonly log?: { fatal(obj: object, msg: string): void };
  },
): Promise<RequestOutcome> {
  /*
   * THE DEMO NUMBER (auth/demo.ts). Number change (either side) and the app-lock PIN reset are refused
   * for it, so nobody who got in with the fixed code can hijack or lock the demo account. And it NEVER
   * sends: a sign-in or deletion request for it runs every limit exactly as for any number, then mints
   * and sends nothing, so the caller sees the reply every other number gets.
   */
  const demoPhone = isDemoPhone(deps.demo, o.phone);
  if (demoPhone && DEMO_PROTECTED_TEMPLATES.includes(o.templateId)) return { kind: 'refused' };
  if (demoPhone && o.send) return requestOtp(deps, { ...o, send: false });

  const nowIso = deps.now();
  /** Mint and store a code (the cooldown gate lives in `put`); true if this call stored it. */
  const mintAndStore = async (): Promise<string | null> => {
    const code = mintOtp(OTP_DIGITS);
    const stored = await deps.otp.put(
      {
        phone: o.key,
        hash: hashOtp(deps.signingKey, o.key, code),
        expiresAt: new Date(Date.parse(nowIso) + OTP_TTL_SECONDS * 1000).toISOString(),
        attempts: 0,
        createdAt: nowIso,
      },
      OTP_RESEND_COOLDOWN_SECONDS,
    );
    return stored ? code : null;
  };

  // RT-3: a code still in its cooldown is left alone and nothing is spent.
  const existing = await deps.otp.get(o.key, nowIso);
  if (existing && Date.parse(existing.createdAt) > Date.parse(nowIso) - OTP_RESEND_COOLDOWN_SECONDS * 1000) {
    return { kind: 'accepted' };
  }

  // RT-3 mitigation: a device that completed sign-in for THIS number's account.
  let ownerDevice = false;
  if (o.deviceId && o.user) {
    const d = await deps.repo.findDevice(o.deviceId);
    ownerDevice = d !== null && d.revokedAt === null && d.userId === o.user.id;
  }

  /*
   * ORDER. Per-source rules first, so a blocked address is refused before it can touch
   * the per-number budget. The global ceiling is last, and only for a send to a number
   * with NO account (RT2-2): see `sendGlobal` in limits.ts.
   */
  const checks: Check[] = [
    { rule: OTP_LIMITS.sendPerIp, identifier: o.ip },
    ...(isLoopback(o.ip) ? [] : [{ rule: OTP_LIMITS.sendPerIpCap, identifier: o.ip }]),
    ...(o.deviceId ? [{ rule: OTP_LIMITS.sendPerDevice, identifier: o.deviceId }] : []),
    ...(ownerDevice
      ? []
      : [
          { rule: OTP_LIMITS.sendPerPhoneBurst, identifier: o.key },
          { rule: OTP_LIMITS.sendPerPhoneDaily, identifier: o.key },
        ]),
    // A send to a number with an account is exempt; a request that sends nothing counts
    // toward nothing. Only a real SMS to an unregistered number spends the ceiling.
    ...(o.send && o.user === null ? [{ rule: OTP_LIMITS.sendGlobal, identifier: 'all' }] : []),
  ];
  const decision = await deps.rate.consumeAll(checks);
  if (!decision.allowed) {
    if (decision.rule === OTP_LIMITS.sendGlobal.name) {
      if (decision.breached) {
        o.log?.fatal(
          { severity: 'crit', breaker: OTP_LIMITS.sendGlobal.name, pauseSeconds: decision.retryAfterSeconds },
          'crit: global SMS breaker tripped - sends to unregistered numbers are paused',
        );
      }
      /*
       * RT3-1: ONLY an unregistered number can reach this rule, so a 429 here would tell
       * the caller "no account". Answer exactly as for a registered number (the same 202
       * body) and silently send nothing; ops see the crit line, the caller learns nothing.
       * RT3-1b: ALSO store a decoy pending code (random, never sent, same TTL), so the
       * next request hits the cooldown exactly as a registered number's would instead of
       * spending budget and eventually answering 429.
       */
      await mintAndStore();
      return { kind: 'accepted' };
    }
    return { kind: 'limited', decision };
  }
  if (!o.send) return { kind: 'accepted' };

  const code = await mintAndStore();
  // Lost a race with a concurrent request: that one minted and sent; this one must not.
  if (code === null) return { kind: 'accepted' };

  await deps.sms.send({
    phone: o.phone,
    templateId: o.templateId,
    variables: [code],
    languageTag: o.language,
  });
  return { kind: 'accepted' };
}

/**
 * F-1 · THE SHAPE OF A CODE, checked BEFORE any attempt ticket is taken, so a typo or a pasted "4821 0937"
 * costs no guess and cannot burn an invite: DIGITS ONLY. The caller answers 400 `invalid_input` when this is
 * false. The server does not repair input. LENGTH is the route schema's 4 to 10, not the mode's exact 6 or 8:
 * the abuse suite (abuse-invite.spec.ts, "a leading-zero code is compared as a string") requires a wrong-length
 * digit string to be a plain 401, so the exact-length rule asked for in the fix round is NOT applied; see the
 * report. `deps` and `phone` are kept so the rule can tighten without touching the callers.
 */
export function codeShapeOk(_deps: Pick<AppDeps, 'authMode' | 'demo'>, _phone: string, code: string): boolean {
  return /^[0-9]+$/.test(code);
}

export type VerifyOutcome =
  /** `demo` is set only for the demo login (auth/demo.ts), so the route can log it. */
  | { readonly ok: true; readonly kind: OtpKind; readonly demo?: true }
  | { readonly ok: false; readonly status: 401 }
  | { readonly ok: false; readonly status: 429; readonly retryAfterSeconds: number };

export async function verifyOtp(
  deps: AppDeps,
  o: {
    readonly key: string;
    readonly code: string;
    readonly ip: string;
    /** The request logger, for the one `invite_burned` warn line (masked number, kind, no code). */
    readonly log?: { warn(obj: object, msg: string): void };
  },
): Promise<VerifyOutcome> {
  // Cross-number guessing from one address (SEC-103), counted before anything else.
  if (!isLoopback(o.ip)) {
    const gate = await deps.rate.consumeAll([{ rule: OTP_LIMITS.verifyPerIp, identifier: o.ip }]);
    if (!gate.allowed) return { ok: false, status: 429, retryAfterSeconds: gate.retryAfterSeconds };
  }

  // INVITE-CODES T4: the HMAC is computed BEFORE the ticket, so a number with no live code
  // costs the same CPU as one with a code and the two cannot be told apart by timing.
  const given = Buffer.from(hashOtp(deps.signingKey, o.key, o.code));

  /*
   * THE DEMO LOGIN. The key is the sign-in key (never `delete:`), so a demo code cannot delete a shop.
   * A fixed code cannot be burned by five wrong guesses the way a minted one is, so the ticket is the
   * `verifyDemo` rule, taken BEFORE the compare: 5 attempts an hour, then an hour's lockout, answered
   * with the same bare 401 as any other failure. The compare is constant time against the config hash.
   */
  if (deps.demo && o.key === deps.demo.phone) {
    const ticketed = await deps.rate.consumeAll([{ rule: OTP_LIMITS.verifyDemo, identifier: o.key }]);
    if (!ticketed.allowed) return { ok: false, status: 401 };
    const wantedDemo = Buffer.from(deps.demo.codeHash);
    if (!(given.length === wantedDemo.length && timingSafeEqual(given, wantedDemo))) return { ok: false, status: 401 };
    return { ok: true, kind: 'sms', demo: true };
  }

  // The ticket FIRST. No ticket - no live code, or its five attempts are spent - means
  // refused without comparing anything, however many callers arrive at once.
  const ticket = await deps.otp.takeAttempt(o.key, deps.now(), MAX_VERIFY_ATTEMPTS);
  if (!ticket) return { ok: false, status: 401 };

  const wanted = Buffer.from(ticket.hash);
  if (!(given.length === wanted.length && timingSafeEqual(given, wanted))) {
    // The fifth wrong guess kills the code outright, so the owner can ask for another. It kills the row
    // that was GUESSED AT (RTI-2): a re-issue that landed meanwhile is a different row and is left alone.
    if (ticket.attempts >= MAX_VERIFY_ATTEMPTS && (await clearIfSame(deps, o.key, ticket.hash)) && ticket.kind !== 'sms') {
      o.log?.warn({ event: 'invite_burned', kind: ticket.kind, phoneMasked: maskPhone(o.key) }, 'invite burned by wrong guesses');
    }
    return { ok: false, status: 401 };
  }

  // Single use, atomically: of two concurrent correct submissions only one removes it, and only the row
  // that was compared (RTI-1): an old code that lost a race with a re-issue signs nobody in and destroys nothing.
  if (!(await clearIfSame(deps, o.key, ticket.hash))) return { ok: false, status: 401 };
  return { ok: true, kind: ticket.kind };
}

/**
 * COMPARE-AND-DELETE. Remove the pending row for `key` only if it is still the one whose hash was compared.
 * The store's `clear(key, hash)` is the atomic step (one DELETE ... WHERE code_hash = $2); the `get` before it
 * is belt and braces for a store that does not honour the second argument, and costs a read only on the
 * two paths that clear (a correct code, a fifth wrong guess).
 */
async function clearIfSame(deps: AppDeps, key: string, hash: string): Promise<boolean> {
  const live = await deps.otp.get(key, deps.now());
  if (!live || live.hash !== hash) return false;
  return deps.otp.clear(key, hash);
}
