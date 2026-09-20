/**
 * TWO SHOPS. One ordinary, one hostile. Every screen renders against both.
 *
 * The rule both fixtures obey, and the reason this barrel exists: **no expected
 * figure is ever written down.** A closed day needs a counted-cash figure, and the
 * honest way to get one is to ask the engine what the day comes to - not to type a
 * number that agrees with the engine today and diverges silently the first time the
 * cash formula changes.
 */
export * from './canonical.ts';
export * from './adversarial.ts';

import { expectedCashBalance, subtract, type DayInput } from '@swafto/formula-engine';
import { canonicalInput } from './canonical.ts';
import { adversarialInput } from './adversarial.ts';

/**
 * The canonical day, CLOSED AND BALANCED - counted cash equal to expected, taken
 * from the engine.
 *
 * This is the state most screens show, and the one a hand-written figure would have
 * quietly broken.
 */
export function closedCanonical(): DayInput {
  const base = canonicalInput();
  return {
    ...base,
    day: {
      ...base.day,
      state: 'closed',
      countedCash: expectedCashBalance(base).value,
      closedAt: '2026-07-15T21:10:00.000Z',
    },
  };
}

/**
 * The adversarial day, closed WITH A DIFFERENCE - counted short of expected by an
 * amount a shopkeeper would actually notice.
 *
 * The shortfall is an OFFSET from the engine's figure rather than a literal, so it
 * stays a difference of exactly that size whatever the expected total becomes. A
 * literal would stop being a difference at all the day the formula moved.
 */
export function closedAdversarialWithDifference(shortByPaise = 25000): DayInput {
  const base = adversarialInput();
  return {
    ...base,
    day: {
      ...base.day,
      state: 'closed',
      // ADR-003: money arithmetic goes through the audited helpers, even here.
      countedCash: subtract(expectedCashBalance(base).value, shortByPaise),
      differenceReason: 'unknown',
      closedAt: '2026-03-02T22:30:00.000Z',
    },
  };
}
