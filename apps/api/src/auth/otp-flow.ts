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
  | { readonly kind: 'accepted' };

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

export type VerifyOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly status: 401 }
  | { readonly ok: false; readonly status: 429; readonly retryAfterSeconds: number };

export async function verifyOtp(
  deps: AppDeps,
  o: { readonly key: string; readonly code: string; readonly ip: string },
): Promise<VerifyOutcome> {
  // Cross-number guessing from one address (SEC-103), counted before anything else.
  if (!isLoopback(o.ip)) {
    const gate = await deps.rate.consumeAll([{ rule: OTP_LIMITS.verifyPerIp, identifier: o.ip }]);
    if (!gate.allowed) return { ok: false, status: 429, retryAfterSeconds: gate.retryAfterSeconds };
  }

  // The ticket FIRST. No ticket - no live code, or its five attempts are spent - means
  // refused without comparing anything, however many callers arrive at once.
  const ticket = await deps.otp.takeAttempt(o.key, deps.now(), MAX_VERIFY_ATTEMPTS);
  if (!ticket) return { ok: false, status: 401 };

  const given = Buffer.from(hashOtp(deps.signingKey, o.key, o.code));
  const wanted = Buffer.from(ticket.hash);
  if (!(given.length === wanted.length && timingSafeEqual(given, wanted))) {
    // The fifth wrong guess kills the code outright, so the owner can ask for another.
    if (ticket.attempts >= MAX_VERIFY_ATTEMPTS) await deps.otp.clear(o.key);
    return { ok: false, status: 401 };
  }

  // Single use, atomically: of two concurrent correct submissions only one removes it.
  if (!(await deps.otp.clear(o.key))) return { ok: false, status: 401 };
  return { ok: true };
}
