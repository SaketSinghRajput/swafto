/**
 * The OTP rate limits, as NAMED CONSTANTS - injection 08 B.3: "Choose it, justify it,
 * and make it a named constant, not a literal."
 *
 * THESE NUMBERS ARE NOT CHOSEN HERE. They are transcribed from SECURITY-AUDIT.md §2
 * TB6, "OTP rate limits (concrete, and they are the spec)". That table is the ruling;
 * this file is the executable copy of it, and `rate-limit.spec.ts` asserts the two
 * agree so they cannot drift.
 *
 * Recorded because I got this wrong first: I wrote a plausible set of my own - 5/hour,
 * 10/day, 30 per IP, a 10-minute TTL - with a paragraph of justification for each,
 * before checking whether the question had already been answered. It had been. An
 * invented number with good prose next to it is harder to catch than an obviously
 * wrong one, and "never silently change an earlier decision" is exactly the rule that
 * was about to be broken. The two places where I think the spec deserves a second look
 * are written up in REVIEW.md as R-006 and R-007 rather than quietly implemented.
 *
 * WHY THESE ARE SECURITY-CRITICAL AND NOT MERELY TIDY. Once auth is phone + OTP, these
 * counters are the only thing between an attacker and the SMS bill. Every request that
 * gets past them costs real money; the attacker's cost is zero.
 *
 * WHAT THEY MUST NEVER DO. Constraint 2: the ledger is local and authoritative. No
 * limit here can keep a shopkeeper out of his own books - it can only delay a new
 * SIGN-IN. Every lockout is a window that expires on its own; none needs support to
 * clear. T1.3 puts it plainly: "Locking a shopkeeper out of his own ledger is a worse
 * outcome than any threat in this table."
 */

import {
  OTP_TTL_SECONDS as REGISTRY_TTL,
  OTP_DIGITS as REGISTRY_DIGITS,
  INVITE_CODE_DIGITS as REGISTRY_INVITE_DIGITS,
  OTP_LIMITS as REGISTRY_LIMITS,
} from '@swafto/values';

export interface RateRule {
  /** Stable identifier; also the bucket prefix, so renaming one resets its counters. */
  readonly name: string;
  readonly windowSeconds: number;
  readonly max: number;
  /**
   * How long the caller is blocked after breaching, measured from the breach and NOT
   * extended by further attempts. The spec's "Lockout" column.
   *
   * A lockout longer than the window is the whole point of the column: 3 sends in 15
   * minutes earns an hour off, not another 15 minutes.
   */
  readonly lockoutSeconds: number;
  /** Where the number comes from. Read by the next person tempted to change it. */
  readonly source: string;
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Code lifetime: TEN minutes. Resolved at iteration 19, and the resolution is
 * recorded in SPEC-DIGEST §1 because TWO ARTIFACTS ALREADY DISAGREED before any code
 * existed.
 *
 *   SECURITY-AUDIT TB6, written at G3:  "5-minute TTL", stated, no reasoning.
 *   SMS-TEMPLATES.md, written later:    "10 minutes", with the trade-off argued,
 *                                       and naming this very constant as 600.
 *
 * At iteration 17 I transcribed TB6 and wrote R-006 saying "the spec stands". That
 * deference was to the WRONG ARTIFACT: the later, more specific, reasoned ruling said
 * ten. Deferring to an existing decision is only safe if you find all of them, and I
 * found one and stopped.
 *
 * Why ten is also right on the merits, not merely older-and-newer bookkeeping:
 *   - The English template SAYS "Valid 10 min" and is about to go to DLT
 *     registration, where a wording fix costs twelve re-registrations. The copy is
 *     the expensive artifact; the constant is the cheap one. Make the copy true.
 *   - SMS on a congested Indian cell takes minutes, not seconds, and a shopkeeper
 *     aged 35-70 does not have the handset in his hand when it lands. A five-minute
 *     window fails the SCENARIO, not the edge case.
 *   - What ten minutes costs: a code readable off a lock screen for five more
 *     minutes, on a single-user device behind a counter, with an optional app lock.
 *     What five costs: a failed sign-in on a weak cell, indistinguishable to the user
 *     from a wrong code, while he is trying to reach his own ledger.
 *   - Guessing does not decide it and the attempt limit does: six digits against five
 *     attempts is five in a million however long the code lives.
 *
 * DEVICE-CHECKLIST D2 still measures real carrier latency. It can now only push this
 * number UP.
 */
export const OTP_TTL_SECONDS = REGISTRY_TTL;

/** 6 digits, per TB6 and B.3. The registry owns the number; this re-exports it. */
export const OTP_DIGITS = REGISTRY_DIGITS;

/** The beta invite code length (founder decision D1). The registry owns the number. */
export const INVITE_DIGITS = REGISTRY_INVITE_DIGITS;

export const OTP_LIMITS = {
  /** TB6: per phone number - send - 3 per 15 min, lockout 1 h. */
  sendPerPhoneBurst: {
    name: 'otp:send:phone:burst',
    windowSeconds: REGISTRY_LIMITS.sendPerPhoneBurst.windowSeconds,
    max: REGISTRY_LIMITS.sendPerPhoneBurst.max,
    lockoutSeconds: REGISTRY_LIMITS.sendPerPhoneBurst.lockoutSeconds,
    source: 'SECURITY-AUDIT TB6, "Per phone number - send", 3 / 15 min, lockout 1 h',
  },

  /**
   * TB6: per phone number - send - 10 per 24 h, lockout 24 h.
   * This is the one B.3 singles out: "The per-number-per-day limit is the one that
   * protects your bill."
   */
  sendPerPhoneDaily: {
    name: 'otp:send:phone:day',
    windowSeconds: REGISTRY_LIMITS.sendPerPhoneDaily.windowSeconds,
    max: REGISTRY_LIMITS.sendPerPhoneDaily.max,
    lockoutSeconds: REGISTRY_LIMITS.sendPerPhoneDaily.lockoutSeconds,
    source: 'SECURITY-AUDIT TB6, "Per phone number - send", 10 / 24 h, lockout 24 h',
  },

  /**
   * DELIBERATELY WIDE, AND IT MUST STAY THAT WAY. Ruled at iteration 19; R-007.
   *
   * Indian mobile carriers run large-scale carrier-grade NAT, so thousands of
   * unrelated subscribers leave through one public address. A per-IP limit tuned as
   * though an IP were a user does not stop an attacker - who rotates addresses for
   * nothing - it locks out a whole neighbourhood of real shopkeepers on one cell, at
   * the moment each is trying to reach his own ledger. T1.3 again: that is worse than
   * the threat.
   *
   * Per-NUMBER limits are the real protection. This is a backstop against one crude
   * host hammering the endpoint, and NOTHING MORE.
   *
   * `lockoutSeconds: 0` means telemetry, not a lock: `consume` records the attempt
   * and reports `allowed`, so exceeding this can never be the thing that blocks a
   * genuine sign-in. Read the saturation counter; do not gate on it.
   */
  sendPerIp: {
    name: 'otp:send:ip:hour',
    windowSeconds: REGISTRY_LIMITS.sendPerIp.windowSeconds,
    max: REGISTRY_LIMITS.sendPerIp.max,
    lockoutSeconds: REGISTRY_LIMITS.sendPerIp.lockoutSeconds,
    source: 'SECURITY-AUDIT TB6 as amended at iteration 19, "Per IP - send", 2000 / 1 h, telemetry only',
  },

  /** TB6: per device id - send - 5 per 1 h, lockout 1 h. */
  sendPerDevice: {
    name: 'otp:send:device:hour',
    windowSeconds: REGISTRY_LIMITS.sendPerDevice.windowSeconds,
    max: REGISTRY_LIMITS.sendPerDevice.max,
    lockoutSeconds: REGISTRY_LIMITS.sendPerDevice.lockoutSeconds,
    source: 'SECURITY-AUDIT TB6, "Per device id - send", 5 / 1 h, lockout 1 h',
  },

  /**
   * TB6: per phone number - verify attempts - 5 per code, for the code's lifetime,
   * after which "code invalidated, must resend".
   *
   * There is no lockout beyond the code's own life, because invalidation IS the
   * consequence - the attacker must go back through the send limits above to get
   * another code. Six digits with five attempts is five in a million per code.
   */
  verifyPerCode: {
    name: 'otp:verify:code',
    windowSeconds: REGISTRY_LIMITS.verifyPerCode.windowSeconds,
    max: REGISTRY_LIMITS.verifyPerCode.max,
    lockoutSeconds: REGISTRY_LIMITS.verifyPerCode.lockoutSeconds,
    source:
      'SECURITY-AUDIT TB6, "Per phone number - verify attempts", 5 per code; TTL per ' +
      'SPEC-DIGEST §1 ruling (10 min)',
  },
  /*
   * WAVE 2 (C-03) - REVERSIBLE DEFAULTS. Chosen by the engineer, NOT by the founder
   * and NOT measured: every number below is a conservative starting point and the
   * SMS price (H1) is still unmeasured, so none of them is a cost figure. Change them
   * here, in one place. The audit's TB6 left the global breaker's number to "somebody
   * chooses" (SEC-1); this is that somebody, provisionally.
   *
   * REASONING.
   *  - The per-phone rules cap what one NUMBER can receive. Nothing above capped how
   *    many numbers one host or the whole service may text, so the SMS bill was
   *    attacker-controlled (RT-4: 3000 numbers, one IP, 3000 SMS).
   *  - Per-IP: 60 sends an hour. A sign-in is once per 180 days, so even a busy
   *    carrier-NAT address will not legitimately ask for 60 codes in an hour. This is
   *    what R-007 feared when it kept the IP rule telemetry-only (CGNAT) - that
   *    concern is why this is NOT the 2000 rule and why it is skipped for a loopback
   *    address (a reverse proxy that is not trusted would put every caller on
   *    127.0.0.1; see `isLoopback`). The telemetry rule above stays as it was.
   *  - Global: 500 sends an hour, then a one-hour pause that ends by itself. (The pause
   *    equals the window on purpose: with a shorter pause the 500 events would still be
   *    inside the hour when it ended and the breaker would re-trip.) It bounds the SMS
   *    spend of a botnet that defeats every per-source rule.
   *
   *    CTO DECISION (RT2-2, reversible): THE CEILING COUNTS, AND BLOCKS, ONLY SENDS TO
   *    NUMBERS WITH NO ACCOUNT. The first version counted every send and was a free
   *    denial of service: nine addresses at 60 requests each tripped it, and then no
   *    innocent user could sign in or delete their account for an hour. Sends to a
   *    registered number (sign-in for an existing account, deletion for a real one) are
   *    exempt - still bound by the per-number and per-address caps - and a deletion
   *    request for an unregistered number sends nothing and counts toward nothing. The
   *    cost: while it is tripped a NEW user cannot sign up for up to an hour (and the
   *    refusal itself says "this number has no account" - an oracle, but only during a
   *    trip the attacker has already caused). WHO PAYS: the OPERATOR pays for every SMS
   *    that gets through, not whoever caused it; the ceiling limits that bill and nothing
   *    more. Tripping it writes one `crit` log line naming this breaker, for ops alerting.
   */
  sendPerIpCap: {
    name: 'otp:send:ip:cap',
    windowSeconds: HOUR,
    max: 60,
    lockoutSeconds: HOUR,
    source: 'SECURITY-AUDIT TB6 "Per IP - send", enforcing companion; Wave 2 default (C-03b, RT-4)',
  },

  sendGlobal: {
    name: 'otp:send:global:hour',
    windowSeconds: HOUR,
    max: 500,
    lockoutSeconds: HOUR,
    source: 'SECURITY-AUDIT TB6 "Global send rate circuit-breaker"; Wave 2 default (C-03b, SEC-102)',
  },

  /**
   * SEC-103: verify attempts per source address ACROSS numbers. One host walking a list
   * of numbers with a few guesses each stays under every per-number rule. 100 an hour
   * is a sign-in rate no real address reaches (each sign-in is one or two verifies).
   */
  verifyPerIp: {
    name: 'otp:verify:ip:hour',
    windowSeconds: HOUR,
    max: 100,
    lockoutSeconds: HOUR,
    source: 'SECURITY-AUDIT TB6, verify abuse across numbers; Wave 2 default (C-03d, SEC-103)',
  },

  /**
   * The DEMO LOGIN's attempt ticket (auth/demo.ts). The demo number has a fixed code, so unlike a
   * real code it cannot be burned by five wrong guesses; this rule is what stops brute force. Taken
   * before the compare (atomic), every attempt counts: 5 in an hour, then refused for an hour.
   */
  verifyDemo: {
    name: 'otp:verify:demo',
    windowSeconds: HOUR,
    max: 5,
    lockoutSeconds: HOUR,
    source: 'SECURITY-AUDIT TB6 verify abuse, the demo-login ticket (CTO spec 2026-11-20): 5 attempts, then one hour',
  },
} as const satisfies Record<string, RateRule>;

/**
 * A fresh request inside this many seconds of the last one does not mint a new code and
 * does not send (RT-3 path 3). After it, a new code replaces the old - the user whose
 * first SMS was lost needs that. Reversible default.
 */
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export type OtpLimitName = keyof typeof OTP_LIMITS;

/** Every rule, for the audit table and for the pruning horizon. */
export const ALL_OTP_RULES: readonly RateRule[] = Object.values(OTP_LIMITS);

/**
 * Rows older than the longest window PLUS the longest lockout can never affect a
 * decision. Derived, never written down twice - adding a longer rule extends the
 * horizon on its own, rather than silently pruning rows a new rule still needs.
 */
export const PRUNE_HORIZON_SECONDS = Math.max(
  ...ALL_OTP_RULES.map((r) => r.windowSeconds + r.lockoutSeconds),
);
