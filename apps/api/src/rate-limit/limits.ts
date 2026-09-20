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
} as const satisfies Record<string, RateRule>;

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
