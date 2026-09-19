/**
 * @swafto/formula-engine - L3, the Domain layer.
 *
 * "every rupee the shopkeeper sees is computed here"
 *   - SWAFTO-System-Architecture-and-DFD.pdf, L3
 *
 * ONE engine, imported by BOTH the React Native app and the Node backend (ADR-012).
 * PURE: no I/O, no clock, no locale, no network, no randomness. Time is passed in.
 * ZERO runtime dependencies, by contract - that is what lets it behave identically
 * under Node and Hermes, which CI proves on every vector.
 *
 * DERIVE ON READ, NEVER STORE TOTALS. Nothing here caches.
 * "There is no totals table, and there never will be."
 */

export * from './money.ts';
export * from './dates.ts';
export * from './types.ts';
export * from './primary.ts';
export * from './operational.ts';
export * from './intelligence.ts';

import { computePrimary } from './primary.ts';
import { computeOperational, type OperationalContext } from './operational.ts';
import { SECTIONS } from './types.ts';
import type {
  ClosedDaySummary,
  DayComputation,
  DayInput,
  DayState,
  Section,
} from './types.ts';
import type { Paise } from './money.ts';

/**
 * Per-section state. THREE states, not two (D8).
 *
 *   entered   - has at least one entry
 *   skipped   - explicitly marked "Nothing to enter"
 *   untouched - neither
 *
 * "a day with genuinely zero expenses and a day where expenses were forgotten produce
 * the identical reconciliation number and mean completely different things. If the app
 * can't tell them apart, neither can the shopkeeper."  - D8
 *
 * These must also be distinguishable AT A GLANCE WITHOUT COLOUR (G12).
 */
export function sectionStates(
  input: DayInput,
): Record<Section, 'entered' | 'skipped' | 'untouched'> {
  const out = {} as Record<Section, 'entered' | 'skipped' | 'untouched'>;
  for (const section of SECTIONS) {
    const hasEntry = input.entries.some((e) => e.section === section);
    // E3: an entry UN-SKIPS a section. An entry always wins over a stale skip row.
    if (hasEntry) out[section] = 'entered';
    else if (input.day.skippedSections.includes(section)) out[section] = 'skipped';
    else out[section] = 'untouched';
  }
  return out;
}

/**
 * The progress ring. OPENS AT 1 OF 10, never 0 of 9.
 *
 * Ten steps = opening cash + the eight entry sections + the cash check. The opening
 * cash counts because it is real work the shopkeeper did yesterday, carried forward -
 * "the line I would not cross is advancing the ring for something he did not do; the
 * effect survives on honest endowment and the trust does not survive a fake one"
 * (S6 Strategy 02).
 *
 * A SKIPPED section advances the ring - a deliberate skip is a real decision, not an
 * absence (D8).
 *
 * The exception is a brand-new user (T2): nothing is carried, so `openingCash` is
 * null, nothing is entered, and the ring honestly starts at 0.
 */
export function dayProgress(input: DayInput): { done: number; total: number } {
  const TOTAL = 10; // opening cash + 8 entry sections + cash check
  const states = sectionStates(input);

  let done = 0;
  for (const section of SECTIONS) {
    if (states[section] !== 'untouched') done += 1;
  }

  // Step 1: opening cash, carried or set. Endowed progress - but only honestly.
  if (input.day.openingCash !== null) done += 1;

  // Step 10: the cash check itself, done once counted.
  if (input.day.countedCash !== null) done += 1;

  return { done, total: TOTAL };
}

/**
 * Cash check unlocks only when all EIGHT preceding sections are entered or
 * deliberately skipped (D8).
 *
 * E6: deleting the last line of a section returns it to untouched and RE-LOCKS the
 * cash check - which falls out of this being derived rather than latched.
 */
export function cashCheckUnlocked(input: DayInput): boolean {
  const states = sectionStates(input);
  return SECTIONS.every((s) => states[s] !== 'untouched');
}

/**
 * The day's lifecycle state, derived.
 *
 * Note this DERIVES `ready` rather than trusting a stored flag, so a deletion that
 * returns a section to untouched correctly walks the day back from ready to open.
 * `closed` and `not_closed` are terminal facts recorded by a human action, so those
 * are taken from the record as given.
 */
export function derivedDayState(input: DayInput): DayState {
  const stored = input.day.state;
  if (stored === 'closed' || stored === 'not_closed') return stored;
  if (input.day.openingCash === null) return 'not_started';
  return cashCheckUnlocked(input) ? 'ready' : 'open';
}

/** Everything the UI needs for one day. Recomputed on read; nothing is cached. */
export function computeDay(input: DayInput, ctx: OperationalContext): DayComputation {
  return {
    date: input.day.date,
    state: derivedDayState(input),
    primary: computePrimary(input),
    operational: computeOperational(input, ctx),
    progress: dayProgress(input),
    cashCheckUnlocked: cashCheckUnlocked(input),
    sectionStates: sectionStates(input),
  };
}

/**
 * Reduce a CLOSED day to the summary the BI window consumes.
 *
 * Throws on a day that is not closed: BI windows count CLOSED days specifically, and
 * quietly admitting an open day would make a gate open early. Better to fail loudly.
 */
export function toClosedDaySummary(input: DayInput): ClosedDaySummary {
  if (input.day.state !== 'closed') {
    throw new Error(
      `toClosedDaySummary: day ${input.day.date} is '${input.day.state}', not 'closed'. ` +
        `BI gates count closed days only.`,
    );
  }
  if (input.day.countedCash === null) {
    throw new Error(`toClosedDaySummary: closed day ${input.day.date} has no counted cash`);
  }
  const p = computePrimary(input);
  return {
    date: input.day.date,
    netSales: p.p4NetSales.value,
    netPurchase: p.p5NetPurchase.value,
    totalExpenses: p.p6TotalExpenses.value,
    profit: p.estimatedProfit.value,
    countedCash: input.day.countedCash,
    expectedCash: p.p3ExpectedCashBalance.value,
  };
}

/**
 * THE CARRY-FORWARD RULE. Tomorrow's opening cash is today's COUNTED closing,
 * NEVER the expected figure.
 *
 * "4.7 is where the audit chain is forged. Because the next day's opening is the
 * counted figure and never the expected one, every subsequent balance inherits a
 * number a human physically verified."  - architecture §05
 *
 * Returns null for a day that was never closed - D6: a gap produces a not_closed day
 * and the app NEVER interpolates a balance. It asks for a fresh count instead.
 */
export function nextOpeningCash(input: DayInput): Paise | null {
  if (input.day.state !== 'closed') return null;
  return input.day.countedCash;
}
