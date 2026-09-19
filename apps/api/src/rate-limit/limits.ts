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
 * Code lifetime. SECURITY-AUDIT TB6: "6 digits, cryptographically random, single-use,
 * 5-minute TTL, invalidated on success or on resend".
 *
 * Kept at the spec's 5 minutes. I argued for 10 on the grounds that an SMS on a
 * congested rural cell can take minutes - which is a real concern on this product's
 * network profile - but it is a concern, not a measurement, and DEVICE-CHECKLIST D2
 * measures exactly this ("How long it took. Time it."). R-006 holds the question open
 * until that number exists. Guessing upward would weaken a security control on a
 * hunch; guessing downward would strand real users. Measure it.
 */
export const OTP_TTL_SECONDS = 5 * MINUTE;

/** 6 digits, per TB6 and B.3. Stated here so nothing else picks its own length. */
export const OTP_DIGITS = 6;

export const OTP_LIMITS = {
  /** TB6: per phone number - send - 3 per 15 min, lockout 1 h. */
  sendPerPhoneBurst: {
    name: 'otp:send:phone:burst',
    windowSeconds: 15 * MINUTE,
    max: 3,
    lockoutSeconds: 1 * HOUR,
    source: 'SECURITY-AUDIT TB6, "Per phone number - send", 3 / 15 min, lockout 1 h',
  },

  /**
   * TB6: per phone number - send - 10 per 24 h, lockout 24 h.
   * This is the one B.3 singles out: "The per-number-per-day limit is the one that
   * protects your bill."
   */
  sendPerPhoneDaily: {
    name: 'otp:send:phone:day',
    windowSeconds: DAY,
    max: 10,
    lockoutSeconds: DAY,
    source: 'SECURITY-AUDIT TB6, "Per phone number - send", 10 / 24 h, lockout 24 h',
  },

  /** TB6: per IP - send - 20 per 1 h, lockout 1 h. */
  sendPerIp: {
    name: 'otp:send:ip:hour',
    windowSeconds: HOUR,
    max: 20,
    lockoutSeconds: HOUR,
    source: 'SECURITY-AUDIT TB6, "Per IP - send", 20 / 1 h, lockout 1 h',
  },

  /** TB6: per device id - send - 5 per 1 h, lockout 1 h. */
  sendPerDevice: {
    name: 'otp:send:device:hour',
    windowSeconds: HOUR,
    max: 5,
    lockoutSeconds: HOUR,
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
    windowSeconds: OTP_TTL_SECONDS,
    max: 5,
    lockoutSeconds: OTP_TTL_SECONDS,
    source: 'SECURITY-AUDIT TB6, "Per phone number - verify attempts", 5 per code',
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
