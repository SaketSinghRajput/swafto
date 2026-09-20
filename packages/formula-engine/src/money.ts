/**
 * THE AUDITED MONEY HELPERS. This is the only file in the engine permitted to perform
 * arithmetic on a money identifier; the `swafto/no-money-float` lint rule (ADR-003)
 * bans `+ - * /` on anything matching /amount|paise|total|balance|cash|sum/ everywhere
 * else.
 *
 * Money is an INTEGER NUMBER OF PAISE. Never a float, never a string, never rupees.
 * Number.MAX_SAFE_INTEGER is 9,007,199,254,740,991 paise - about INR 90 trillion - so
 * every integer we will ever hold is exact, and exact integer +/- is exact.
 *
 * Formatting to "1,234.50" happens ONLY at the render boundary, never in a calculation.
 */

/** An integer number of paise. 100 paise = 1 rupee. */
export type Paise = number;

/**
 * Thrown when a value that must be money is not a safe integer.
 *
 * A FACTORY, not `class MoneyError extends Error`, for two reasons:
 *
 *  1. The engine must parse under Hermes. The Hermes build used for the
 *     cross-runtime vector check has no `class` support at all, and the engine is
 *     the one package that has to run unmodified on both runtimes (ADR-012).
 *  2. Subclassing Error is fragile under downleveling anyway - the prototype chain
 *     is lost and `instanceof` silently stops working, which is a worse failure than
 *     not having the subclass.
 *
 * The thrown value is a real Error with `.name === 'MoneyError'`, so catching,
 * `.message` and matching on the name all behave as expected.
 */
export function MoneyError(message: string): Error {
  const err = new Error(message);
  err.name = 'MoneyError';
  return err;
}

/** Assert a value really is an integer number of paise. Cheap, and it has caught things. */
export function assertPaise(value: unknown, what = 'amount'): Paise {
  if (typeof value !== 'number' || !Number.isInteger(value) || !Number.isSafeInteger(value)) {
    throw MoneyError(
      `${what} must be a safe integer number of paise, got ${String(value)} (${typeof value}). ` +
        `Money is integer paise everywhere - see ADR-003.`,
    );
  }
  return value;
}

/** Exact addition. */
export function add(...values: Paise[]): Paise {
  let acc = 0;
  for (const v of values) acc += assertPaise(v);
  return assertPaise(acc, 'sum');
}

/** Exact subtraction, left to right. May be negative - a difference legitimately is. */
export function subtract(from: Paise, ...values: Paise[]): Paise {
  let acc = assertPaise(from);
  for (const v of values) acc -= assertPaise(v);
  return assertPaise(acc, 'difference');
}

export function sum(values: readonly Paise[]): Paise {
  let acc = 0;
  for (const v of values) acc += assertPaise(v);
  return assertPaise(acc, 'sum');
}

/* ------------------------------------------------------------------ *
 * Division. Everything below states its rounding mode (ADR-003).
 * ------------------------------------------------------------------ */

/**
 * A ratio of two money quantities. NOT money itself - a proportion.
 *
 * The numerator and denominator are kept EXACT so the caller can render the working
 * and re-derive at any precision. `basisPoints` is the rounded convenience value.
 *
 * `basisPoints` is `null` when the denominator is zero. It is never Infinity and never
 * NaN: a shop with no sales has an UNDEFINED expense ratio, not an infinite one, and
 * the UI must say "no sales yet" rather than render a symbol.
 */
export interface Ratio {
  readonly numeratorPaise: Paise;
  readonly denominatorPaise: Paise;
  /** Rounded to 1/10000. Rounding mode: HALF_UP on the absolute value. */
  readonly basisPoints: number | null;
}

/**
 * Round half away from zero ("HALF_UP" on the absolute value).
 *
 * Deliberately NOT `Math.round`, which rounds -0.5 to -0 (i.e. toward +Infinity) and
 * would make a negative ratio round differently from its positive twin. For a figure a
 * shopkeeper compares against last week, that asymmetry is a real defect.
 */
export function roundHalfAwayFromZero(x: number): number {
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

/** Exact ratio, with an explicitly-rounded basis-point convenience value. */
export function ratio(numeratorPaise: Paise, denominatorPaise: Paise): Ratio {
  assertPaise(numeratorPaise, 'ratio numerator');
  assertPaise(denominatorPaise, 'ratio denominator');
  const basisPoints =
    denominatorPaise === 0
      ? null
      : roundHalfAwayFromZero((numeratorPaise * 10000) / denominatorPaise);
  return { numeratorPaise, denominatorPaise, basisPoints };
}

/**
 * Divide money into a money result. ROUNDING MODE MUST BE NAMED AT THE CALL SITE -
 * there is no default, on purpose.
 */
export function divideMoney(
  amount: Paise,
  divisor: number,
  rounding: 'half-away-from-zero' | 'floor' | 'ceil',
): Paise {
  assertPaise(amount);
  if (!Number.isFinite(divisor) || divisor === 0) {
    throw MoneyError(`divideMoney: divisor must be a non-zero finite number, got ${divisor}`);
  }
  const raw = amount / divisor;
  const out =
    rounding === 'floor'
      ? Math.floor(raw)
      : rounding === 'ceil'
        ? Math.ceil(raw)
        : roundHalfAwayFromZero(raw);
  return assertPaise(out, 'divided amount');
}

/**
 * Arithmetic mean of money. Rounding mode is explicit. Empty input is null, not 0 -
 * "no data" and "zero rupees" are different statements, and conflating them is how a
 * gated metric ends up rendering a confident zero.
 */
export function meanMoney(
  values: readonly Paise[],
  rounding: 'half-away-from-zero' | 'floor' | 'ceil' = 'half-away-from-zero',
): Paise | null {
  if (values.length === 0) return null;
  return divideMoney(sum(values), values.length, rounding);
}

/**
 * Median of money. For an even count the two middle values are averaged, rounded
 * half-away-from-zero. Empty input is null.
 *
 * Median rather than mean is used by OP5 because one unusually large day should not
 * move the baseline a shopkeeper is judged against.
 */
export function medianMoney(values: readonly Paise[]): Paise | null {
  if (values.length === 0) return null;
  const s = [...values].map((v) => assertPaise(v)).sort((a, b) => a - b);
  const mid = s.length >> 1;
  if (s.length % 2 === 1) return s[mid]!;
  return divideMoney(add(s[mid - 1]!, s[mid]!), 2, 'half-away-from-zero');
}

/**
 * Population standard deviation, in paise, rounded half-away-from-zero.
 * Used by BI2 (coefficient of variation) and BI3 (cash-flow stability).
 *
 * Population rather than sample: we are describing the days this shop actually had,
 * not inferring about a wider population of days.
 */
export function stdevMoney(values: readonly Paise[]): Paise | null {
  if (values.length === 0) return null;
  if (values.length === 1) return 0;
  const mean = sum(values) / values.length; // intentionally float, internal only
  let acc = 0;
  for (const v of values) {
    const d = v - mean;
    acc += d * d;
  }
  return assertPaise(roundHalfAwayFromZero(Math.sqrt(acc / values.length)), 'stdev');
}

/* ------------------------------------------------------------------ *
 * The render boundary
 * ------------------------------------------------------------------ */

/**
 * THE ONLY place paise become a human-readable string. Called from the view layer,
 * never from a calculation.
 *
 * LATIN NUMERALS ALWAYS, IN EVERY LANGUAGE (build prompt constraint 8). Words
 * localise; money does not. Grouping is the Indian system - 1,23,456.78 - because that
 * is how the number is read aloud in Odia, Hindi and Indian English alike.
 *
 * Deliberately hand-rolled rather than Intl.NumberFormat: the engine must behave
 * identically under Node and Hermes, and Hermes ships without full ICU by default.
 * A figure that renders differently on the phone than on the server is the exact bug
 * ADR-012's dual-runtime vectors exist to catch.
 */
export function formatPaise(
  amount: Paise,
  opts: { withSymbol?: boolean; withSign?: boolean } = {},
): string {
  assertPaise(amount);
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const rupees = Math.floor(abs / 100);
  const fraction = abs % 100;

  const digits = String(rupees);
  let grouped: string;
  if (digits.length <= 3) {
    grouped = digits;
  } else {
    const last3 = digits.slice(-3);
    let rest = digits.slice(0, -3);
    const parts: string[] = [];
    while (rest.length > 2) {
      parts.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    /*
     * UNCONDITIONAL, because the condition it replaced could never be false.
     *
     * The loop above runs while `rest.length > 2`, and this block is entered only
     * when the rupee string is longer than three digits, so `rest` starts at one
     * character or more and ends at exactly one or two. It is never empty - verified
     * for every digit length up to eighteen.
     *
     * `if (rest.length)` therefore had an arm no input could take, and an unreachable
     * branch is not cosmetic here: B3's threshold is 100% branch coverage, so every
     * dead branch makes a FROZEN benchmark permanently unachievable. Found by P-002.
     */
    parts.unshift(rest);
    grouped = `${parts.join(',')},${last3}`;
  }

  const body = `${grouped}.${fraction < 10 ? '0' : ''}${fraction}`;
  const sign = negative ? '-' : opts.withSign ? '+' : '';
  const symbol = opts.withSymbol === false ? '' : '₹';
  return `${sign}${symbol}${body}`;
}
