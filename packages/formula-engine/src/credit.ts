/**
 * R5 FR-6 - A CREDIT LIMIT PER CUSTOMER, AND THE ONE OBSERVATION IT ALLOWS.
 *
 * PURE, like the rest of the engine: no clock, no I/O.
 *
 * A LIMIT IS A FACT THE SHOPKEEPER STATED, NOT A RULE THE APP ENFORCES. It is
 * stored append-only (D1): setting it again, or clearing it, is a new row, and
 * the newest row for a party is the one in force. `limit: null` is "no limit".
 *
 * IT NEVER BLOCKS A SALE AND NEVER CHANGES A FIGURE. The only thing a limit does
 * is let the app say, while he is typing an udhar sale, that the customer's udhar
 * would then be above the figure HE set - something to review, not an
 * instruction (CLAUDE.md, "No inference in data entry": this is derived output
 * from recorded facts, never a guess at the input).
 */
import { add, assertPaise, type Paise } from './money.ts';
import { EntryInputError } from './input.ts';

export interface CreditLimit {
  readonly id: string;
  readonly partyId: string;
  /** INTEGER PAISE above zero, or null: "no limit" (he cleared it). */
  readonly limit: Paise | null;
  readonly setAt: string;
}

/** The parser the phone and the server both run, so the two refuse the same things. */
export function parseCreditLimit(draft: {
  readonly id: string;
  readonly partyId: string;
  readonly limit: unknown;
  readonly setAt: string;
}): CreditLimit {
  if (!draft.id) throw new EntryInputError('id', 'a credit limit needs an id, assigned by the caller');
  if (!draft.partyId) throw new EntryInputError('partyId', 'a credit limit names its customer');
  if (!draft.setAt) throw new EntryInputError('setAt', 'a credit limit needs the time it was set');
  if (draft.limit === null) return { id: draft.id, partyId: draft.partyId, limit: null, setAt: draft.setAt };
  const limit = assertPaise(draft.limit, 'limit');
  if (limit <= 0) throw new EntryInputError('limit', 'a credit limit is above zero; clear it instead.');
  return { id: draft.id, partyId: draft.partyId, limit, setAt: draft.setAt };
}

/** The limit in force for a party: its newest row, in the order the rows were appended. */
export function limitInForce(limits: readonly CreditLimit[], partyId: string): Paise | null {
  let found: Paise | null = null;
  for (const l of limits) if (l.partyId === partyId) found = l.limit;
  return found;
}

export interface CreditLimitObservation {
  /** What the customer's udhar would be with this sale. */
  readonly would: Paise;
  readonly limit: Paise;
}

/**
 * "Ramesh's udhar would be X, above the limit Y you set" - or null. Only strictly
 * ABOVE counts: reaching the limit exactly is what a limit allows.
 */
export function creditLimitObservation(
  balance: Paise,
  sale: Paise,
  limit: Paise | null,
): CreditLimitObservation | null {
  if (limit === null) return null;
  const would = add(balance, sale);
  return would > limit ? { would, limit } : null;
}
