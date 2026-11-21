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
import { isEventSection, type Entry, type EntrySection, type Mode, type Section } from './types.ts';

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
  /** EX-3: the one row this entry is about. Required on the four event sections. */
  readonly refersToEntryId?: string;
}

/** Shared by all seven: the amount, the day, and the fields nobody may omit. */
function base(draft: EntryDraft, section: EntrySection, mode: Mode): Entry {
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
  /*
   * A LINK BELONGS TO AN EVENT LEG OR TO A CORRECTION, AND NOWHERE ELSE. An
   * ordinary sale pointing at another row would be an event nobody can see.
   * The schema refuses the same (entries_refers_ck).
   */
  if (isEventSection(section)) {
    if (!draft.refersToEntryId) {
      throw new EntryInputError(
        'refersToEntryId',
        'a return and its settlement must point at the entry they belong to.',
      );
    }
  } else if (draft.refersToEntryId && !draft.correctsDayId) {
    throw new EntryInputError(
      'refersToEntryId',
      'only a correction of a closed day, or a return, refers to another entry.',
    );
  }

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
    ...(draft.refersToEntryId ? { refersToEntryId: draft.refersToEntryId } : {}),
  } as Entry;
}

/**
 * WHICH SECTIONS CANNOT BE RECORDED WITHOUT NAMING A PERSON.
 *
 * Exported because a SCREEN needs to know this BEFORE the tap, and until now
 * only the parser knew it - after. The consequence was the worst defect in this
 * product: three of the six actions on the home screen are wired to sections
 * that require a party, no screen offered any way to name one, so every commit
 * threw, `Session.commit` swallowed it into `lastRefusal`, and nothing anywhere
 * rendered `lastRefusal`. A shopkeeper tapped "Credit", typed an amount, tapped
 * Add, and the app did nothing at all. Udhar - the entire reason this product
 * exists - could not be recorded.
 *
 * A refusal the user cannot see is worse than a refusal, and a control that is
 * tappable when it cannot succeed is worse than a disabled one. The fix is for
 * the form to disable its commit and SAY WHY, and it can only do that if the
 * rule is readable from outside the parser.
 *
 * KEPT HONEST BY A TEST, NOT BY CARE. `input.spec.ts` drives every parser with
 * no `partyId` and asserts each refuses exactly when its section is in this set.
 * A list copied beside the code it describes is a list that drifts; this one
 * cannot, because the test derives the truth from the parsers themselves.
 */
export type PartyRule = 'required' | 'optional' | 'refused';

/**
 * THE RULE IS PER (SECTION, MODE), NOT PER SECTION - and the first version of
 * this was wrong in a way worth recording.
 *
 * It was a flat `SECTIONS_REQUIRING_PARTY` set listing `purchase`, because
 * `parsePurchaseEntry` calls `requireParty`. It does - but only inside
 * `if (mode === 'udhar')`. A CASH purchase names no supplier and the engine
 * accepts it happily. A screen reading that set would have greyed out the
 * commit on a perfectly valid cash purchase and told the shopkeeper to choose a
 * supplier he does not have. The fix for a screen that refuses after the tap is
 * not a screen that refuses before it for the wrong reason.
 *
 * THREE ANSWERS, NOT TWO. `optional` is real and only `purchase` has it: a
 * non-credit purchase neither requires a party nor refuses one, so the form
 * should OFFER the supplier row and still commit without it. Collapsing that to
 * a boolean would either hide a field that works or block a commit that would
 * have succeeded.
 */
export function partyRule(section: Entry['section'], mode: Entry['mode']): PartyRule {
  switch (section) {
    case 'udhar_sales':
    case 'udhar_collection':
    case 'party_payment':
      return 'required';
    case 'purchase':
      return mode === 'udhar' ? 'required' : 'optional';
    /*
     * A RETURN NAMES SOMEBODY ONLY WHERE IT CREATES A LIABILITY (EX-11, review
     * §9). Settled on the spot - cash, UPI, goods - nobody need be named, which
     * keeps the 2-4 step promise. Settled against udhar, a person must be:
     * credit owed to nobody can never be redeemed. (A return left PENDING is the
     * other liability; that is a property of the event, not of one leg, and
     * `buildReturnEvent` refuses it.)
     */
    case 'sales_return':
    case 'exchange_out':
      return 'optional';
    case 'exchange_receipt':
    case 'refund_paid':
      return mode === 'udhar' ? 'required' : 'optional';
    default:
      // cash_sales, upi_sales, expense, withdrawal - all call `refuseParty`.
      return 'refused';
  }
}

/**
 * WHICH KIND OF PARTY A SECTION MAY NAME. A supplier is paid and bought from; a customer buys, owes, is
 * collected from and has returns. A section that names a party of the other kind records a credit
 * balance against the wrong book (a supplier owed on a customer's udhar sale), so it is refused.
 * `null` for the sections that name nobody. The parsers have only a party id, so the kind is checked
 * by `assertPartyKind`, which the phone and the sync route both call with the party they hold.
 */
export function partyKindFor(section: Entry['section']): 'customer' | 'supplier' | null {
  switch (section) {
    case 'purchase':
    case 'party_payment':
      return 'supplier';
    case 'udhar_sales':
    case 'udhar_collection':
    case 'sales_return':
    case 'exchange_out':
    case 'exchange_receipt':
    case 'refund_paid':
      return 'customer';
    default:
      return null;
  }
}

/**
 * Refuses (`EntryInputError`, field `party_kind_mismatch`) an entry whose party is of the wrong kind for its
 * section. A party that is not known here is not this function's refusal (the store refuses a party that is not
 * the shop's); nor is an entry that names nobody.
 */
export function assertPartyKind(entry: Pick<Entry, 'section' | 'partyId'>, party: { readonly kind: 'customer' | 'supplier' } | undefined): void {
  if (entry.partyId === undefined || party === undefined) return;
  const need = partyKindFor(entry.section);
  if (need !== null && party.kind !== need) {
    throw new EntryInputError('party_kind_mismatch', 'this entry needs a ' + need + ', and that party is a ' + party.kind + '.');
  }
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

/* ------------------------------------------------------------------ *
 * The four event legs (EX-2). Each refuses on its own row; whether a leg fits
 * the event it points at is `returns.ts`, because that needs the other rows.
 * ------------------------------------------------------------------ */

/** Goods came back. Mode is always `other`: a return moves no money by itself (D2). */
export function parseReturnEntry(draft: EntryDraft): Entry {
  if (draft.mode !== undefined && draft.mode !== 'other') {
    throw new EntryInputError('mode', 'a return is goods coming back, not money - its money is the refund.');
  }
  refuseDueDate(draft);
  return base(draft, 'sales_return', 'other');
}

/** Replacement goods went out in an exchange. Mode `other`, for the same reason. */
export function parseExchangeOutEntry(draft: EntryDraft): Entry {
  if (draft.mode !== undefined && draft.mode !== 'other') {
    throw new EntryInputError('mode', 'replacement goods are goods, not money - the difference is paid separately.');
  }
  refuseDueDate(draft);
  return base(draft, 'exchange_out', 'other');
}

/** The customer paid the exchange difference: cash, UPI, or added to his udhar. */
export function parseExchangeReceiptEntry(draft: EntryDraft): Entry {
  const mode = draft.mode as Mode;
  if (mode !== 'cash' && mode !== 'upi' && mode !== 'udhar') {
    throw new EntryInputError('mode', 'an exchange difference is paid in cash, by UPI, or on udhar.');
  }
  if (mode === 'udhar') {
    requireParty(draft, 'a difference put on udhar must name the customer who owes it.');
  }
  refuseDueDate(draft);
  return base(draft, 'exchange_receipt', mode);
}

/**
 * The shop paid the customer for a return: cash, UPI, or adjusted against his
 * udhar (a credit note). NEVER an expense and never profit (EX-2) - a refund
 * reverses a sale, which P4 already does through the return itself.
 */
export function parseRefundEntry(draft: EntryDraft): Entry {
  const mode = draft.mode as Mode;
  if (mode !== 'cash' && mode !== 'upi' && mode !== 'udhar') {
    throw new EntryInputError('mode', 'a refund is paid in cash, by UPI, or adjusted against udhar.');
  }
  if (mode === 'udhar') {
    requireParty(draft, 'credit issued must name the customer, or nobody can ever use it.');
  }
  refuseDueDate(draft);
  return base(draft, 'refund_paid', mode);
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
