/**
 * THE INPUT PARSERS - IN1 to IN7, the boundary where typed input becomes an Entry.
 *
 * TRACEABILITY has named these from the beginning and none of them existed. That is
 * finding V-7, open since iteration 19: engine functions cited as evidence for
 * features nobody could run. This closes the seven that are parsers.
 *
 * WHAT A PARSER IS FOR HERE. Not convenience. The database has a CHECK constraint
 * for every rule below and those are the real guarantee. A parser exists so the
 * refusal happens **at the keystroke, naming the field** - rather than three layers
 * down as a constraint violation he cannot act on. The same rule enforced twice, on
 * purpose; constraint 3 already taught this build that one layer is not enough.
 *
 * THEY REFUSE; THEY NEVER REPAIR. No coercion, no rounding, no defaulting, no
 * helpfully trimming a number. Constraint 1 forbids inference in data entry, and a
 * parser that quietly fixes input is inference wearing a small hat: it produces a
 * figure he did not type, in a ledger whose whole claim is that every figure is his.
 *
 * PURE. No clock, no id generation, no I/O. The caller supplies `id` and `createdAt`,
 * because a function that invented them could not be pinned by a golden vector and
 * would make two runs of the same input differ - exactly what ADR-012's dual-runtime
 * diff exists to catch.
 */
import { assertPaise } from './money.ts';
import { parseIsoDate, type IsoDate } from './dates.ts';
import type { Entry, Mode, Section } from './types.ts';

/**
 * A refusal a screen can render. It names the FIELD, so the message can appear
 * beside the input rather than as a banner the shopkeeper must map back to a box.
 */
export class EntryInputError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = 'EntryInputError';
    this.field = field;
  }
}

/** What every parser is handed. `id` and `createdAt` come from the caller. */
export interface EntryDraft {
  readonly id: string;
  readonly dayId: IsoDate;
  readonly amount: unknown;
  readonly mode?: unknown;
  readonly partyId?: string;
  readonly dueDate?: string;
  readonly label?: string;
  readonly createdAt: string;
  readonly source?: 'manual' | 'imported';
  readonly correctsDayId?: IsoDate;
}

/** Shared by all seven: the amount, the day, and the fields nobody may omit. */
function base(draft: EntryDraft, section: Section, mode: Mode): Entry {
  if (!draft.id) throw new EntryInputError('id', 'an entry needs an id, assigned by the caller');
  if (!draft.createdAt) {
    throw new EntryInputError(
      'createdAt',
      'an entry needs a creation time, supplied by the caller',
    );
  }
  // Refuses a float, a string or NaN, and names the value in the message.
  const amount = assertPaise(draft.amount, 'amount');
  if (amount < 0) {
    throw new EntryInputError(
      'amount',
      'an amount is never negative - the section carries the direction, not the sign. ' +
        'Money going out is a purchase, an expense or a withdrawal.',
    );
  }
  // Refuses a date that does not exist, leap year included.
  parseIsoDate(draft.dayId);
  if (draft.correctsDayId) parseIsoDate(draft.correctsDayId);

  return {
    id: draft.id,
    dayId: draft.dayId,
    section,
    amount,
    mode,
    createdAt: draft.createdAt,
    source: draft.source ?? 'manual',
    ...(draft.partyId ? { partyId: draft.partyId } : {}),
    ...(draft.dueDate ? { dueDate: draft.dueDate } : {}),
    ...(draft.label ? { label: draft.label } : {}),
    ...(draft.correctsDayId ? { correctsDayId: draft.correctsDayId } : {}),
  } as Entry;
}

function requireParty(draft: EntryDraft, why: string): void {
  if (!draft.partyId) throw new EntryInputError('partyId', why);
}
function refuseParty(draft: EntryDraft, why: string): void {
  if (draft.partyId) throw new EntryInputError('partyId', why);
}
function refuseDueDate(draft: EntryDraft): void {
  if (draft.dueDate) {
    throw new EntryInputError(
      'dueDate',
      'only a purchase taken on credit has a due date - nothing else is owed on a date.',
    );
  }
}

/**
 * IN1 · a sale. Cash, UPI or on credit, and the mode decides the section.
 *
 * A credit sale MUST name the customer: udhar owed by nobody can never be collected,
 * and P7 would be counting money no one can be asked for.
 */
export function parseSalesEntry(draft: EntryDraft): Entry {
  const mode = draft.mode as Mode;
  if (mode !== 'cash' && mode !== 'upi' && mode !== 'udhar') {
    throw new EntryInputError('mode', 'a sale is cash, UPI or udhar.');
  }
  const section: Section =
    mode === 'cash' ? 'cash_sales' : mode === 'upi' ? 'upi_sales' : 'udhar_sales';
  if (mode === 'udhar') {
    requireParty(draft, 'a credit sale must name the customer, or nobody can be asked to pay it.');
  } else {
    refuseParty(draft, 'a cash or UPI sale is settled at the counter and names no party.');
  }
  refuseDueDate(draft);
  return base(draft, section, mode);
}

/** IN2 · a purchase. The ONE place a due date is meaningful, and only on credit. */
export function parsePurchaseEntry(draft: EntryDraft): Entry {
  const mode = draft.mode as Mode;
  if (!['cash', 'upi', 'other', 'udhar'].includes(mode)) {
    throw new EntryInputError(
      'mode',
      'a purchase is paid by cash, UPI or other, or taken on credit.',
    );
  }
  if (mode === 'udhar') {
    requireParty(draft, 'a purchase on credit must name the supplier it is owed to.');
    if (draft.dueDate) parseIsoDate(draft.dueDate);
  } else if (draft.dueDate) {
    throw new EntryInputError(
      'dueDate',
      'a purchase already paid for has nothing outstanding, so it has no due date.',
    );
  }
  return base(draft, 'purchase', mode);
}

/** IN3 · an expense. Five modes, including stock taken from the shop's own shelf. */
export function parseExpenseEntry(draft: EntryDraft): Entry {
  const mode = draft.mode as Mode;
  if (!['cash', 'upi', 'other', 'udhar', 'shop_stock'].includes(mode)) {
    throw new EntryInputError('mode', 'an expense is cash, UPI, other, credit, or shop stock.');
  }
  refuseParty(draft, 'an expense names no party - if money went to someone, it is a payment.');
  refuseDueDate(draft);
  return base(draft, 'expense', mode);
}

/**
 * IN4 · a customer paying back credit. Always names the customer, because which
 * person's balance goes down is the entire point of the entry.
 */
export function parseCollectionEntry(draft: EntryDraft): Entry {
  const mode = draft.mode as Mode;
  if (!['cash', 'upi', 'other'].includes(mode)) {
    throw new EntryInputError('mode', 'a collection arrives as cash, UPI or other.');
  }
  requireParty(draft, 'a collection must name the customer who paid, or no balance moves.');
  refuseDueDate(draft);
  return base(draft, 'udhar_collection', mode);
}

/** IN5 · paying a supplier. The mirror of IN4, and it names the supplier. */
export function parsePartyPaymentEntry(draft: EntryDraft): Entry {
  const mode = draft.mode as Mode;
  if (!['cash', 'upi', 'other'].includes(mode)) {
    throw new EntryInputError('mode', 'a payment leaves as cash, UPI or other.');
  }
  requireParty(draft, 'a payment must name the supplier it went to, or no balance moves.');
  refuseDueDate(draft);
  return base(draft, 'party_payment', mode);
}

/**
 * IN6 · money the owner took for himself.
 *
 * NOT AN EXPENSE, and that separation is the whole reason this section exists. It
 * leaves the drawer, so it changes the cash check; it is not a cost of running the
 * shop, so it stays outside profit. Recorded as an expense it would understate
 * profit and tell him the shop is doing worse than it is.
 */
export function parseWithdrawalEntry(draft: EntryDraft): Entry {
  const mode = draft.mode as Mode;
  if (mode !== 'cash' && mode !== 'upi') {
    throw new EntryInputError('mode', 'a withdrawal leaves as cash or UPI.');
  }
  refuseParty(draft, 'a withdrawal goes to the owner, who is not a party.');
  refuseDueDate(draft);
  return base(draft, 'withdrawal', mode);
}

/**
 * IN7 · the cash physically counted in the box.
 *
 * Not an entry - a property of the day. It lives here because it is an INPUT and
 * obeys the same rule as the rest: refuse, never repair. A counted figure rounded on
 * its way in would make the difference wrong and the reason meaningless.
 */
export function captureCountedCash(value: unknown): number {
  const counted = assertPaise(value, 'counted cash');
  if (counted < 0) {
    throw new EntryInputError('countedCash', 'a cash box cannot hold a negative amount.');
  }
  return counted;
}
