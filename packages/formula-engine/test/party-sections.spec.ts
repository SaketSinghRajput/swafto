/**
 * `partyRule` has to be DERIVED from the parsers, not remembered beside them.
 *
 * It exists so a screen can decide BEFORE the tap whether to show a party row,
 * and whether the commit is reachable yet, with a reason the shopkeeper can
 * read. That is worth nothing unless it actually agrees with the parsers - and a
 * rule written next to the code it describes drifts the first time either moves.
 *
 * So this file checks nothing against another list. It drives every real parser
 * with every mode that parser accepts, twice - once naming nobody and once
 * naming somebody - and asserts the outcome matches what `partyRule` promised.
 *
 * THE FIRST VERSION OF THE RULE WAS WRONG AND THIS SHAPE OF TEST IS WHY IT WAS
 * CAUGHT. It was a flat set of sections including `purchase`, because
 * `parsePurchaseEntry` calls `requireParty` - inside `if (mode === 'udhar')`.
 * The original test used only the udhar mode for purchase and passed. Driving
 * every mode is the difference between a test that confirms what you believed
 * and one that tells you something.
 *
 * THE DEFECT ALL THIS EXISTS TO PREVENT HAS ALREADY SHIPPED ONCE, in the worst
 * form: three of the six actions on the home screen committed to party-requiring
 * sections, nothing in the app could name a party, every commit threw, and
 * nothing rendered the refusal. The app silently did nothing - dozens of times a
 * day, on the transaction this product exists for.
 */
import { describe, it, expect } from 'vitest';
import {
  partyRule,
  EntryInputError,
  parseSalesEntry,
  parsePurchaseEntry,
  parseExpenseEntry,
  parseCollectionEntry,
  parsePartyPaymentEntry,
  parseWithdrawalEntry,
  parseReturnEntry,
  parseExchangeOutEntry,
  parseExchangeReceiptEntry,
  parseRefundEntry,
  type EntryDraft,
  type PartyRule,
} from '../src/input.ts';
import type { Entry } from '../src/types.ts';

const DAY = '2026-07-15';
const AT = DAY + 'T18:00:00.000Z';

/**
 * Every (parser, mode) pair the engine accepts, with the section it produces.
 *
 * Taken from each parser's own mode guard, so adding a mode to a parser without
 * adding it here leaves a combination untested - and adding one here that the
 * parser rejects fails loudly on the mode guard rather than passing quietly.
 */
const CASES: readonly {
  readonly section: Entry['section'];
  readonly parse: (d: EntryDraft) => Entry;
  readonly mode: Entry['mode'];
}[] = [
  { section: 'cash_sales', parse: parseSalesEntry, mode: 'cash' },
  { section: 'upi_sales', parse: parseSalesEntry, mode: 'upi' },
  { section: 'udhar_sales', parse: parseSalesEntry, mode: 'udhar' },

  { section: 'purchase', parse: parsePurchaseEntry, mode: 'cash' },
  { section: 'purchase', parse: parsePurchaseEntry, mode: 'upi' },
  { section: 'purchase', parse: parsePurchaseEntry, mode: 'other' },
  { section: 'purchase', parse: parsePurchaseEntry, mode: 'udhar' },

  { section: 'expense', parse: parseExpenseEntry, mode: 'cash' },
  { section: 'expense', parse: parseExpenseEntry, mode: 'upi' },
  { section: 'expense', parse: parseExpenseEntry, mode: 'other' },
  { section: 'expense', parse: parseExpenseEntry, mode: 'udhar' },
  { section: 'expense', parse: parseExpenseEntry, mode: 'shop_stock' },

  { section: 'udhar_collection', parse: parseCollectionEntry, mode: 'cash' },
  { section: 'udhar_collection', parse: parseCollectionEntry, mode: 'upi' },
  { section: 'udhar_collection', parse: parseCollectionEntry, mode: 'other' },

  { section: 'party_payment', parse: parsePartyPaymentEntry, mode: 'cash' },
  { section: 'party_payment', parse: parsePartyPaymentEntry, mode: 'upi' },
  { section: 'party_payment', parse: parsePartyPaymentEntry, mode: 'other' },

  { section: 'withdrawal', parse: parseWithdrawalEntry, mode: 'cash' },
  { section: 'withdrawal', parse: parseWithdrawalEntry, mode: 'upi' },
];

const draft = (section: Entry['section'], mode: Entry['mode'], partyId?: string): EntryDraft =>
  ({
    id: 'e-party-' + section + '-' + mode,
    dayId: DAY,
    section,
    amount: 35000,
    mode,
    createdAt: AT,
    ...(partyId ? { partyId } : {}),
  }) as EntryDraft;

/** What the parser actually did, reduced to the same three answers. */
const observe = (parse: (d: EntryDraft) => Entry, section: Entry['section'], mode: Entry['mode']): PartyRule => {
  let unnamedOk = true;
  let namedOk = true;
  try {
    parse(draft(section, mode));
  } catch (e) {
    if (!(e instanceof EntryInputError) || e.field !== 'partyId') throw e;
    unnamedOk = false;
  }
  try {
    parse(draft(section, mode, 'p-ramesh'));
  } catch (e) {
    if (!(e instanceof EntryInputError) || e.field !== 'partyId') throw e;
    namedOk = false;
  }
  if (unnamedOk && namedOk) return 'optional';
  if (!unnamedOk && namedOk) return 'required';
  if (unnamedOk && !namedOk) return 'refused';
  throw new Error('a parser refused a party both ways, which is not a rule any screen can obey');
};

describe('partyRule agrees with the parsers, for every mode they accept', () => {
  for (const { section, parse, mode } of CASES) {
    it(section + ' / ' + mode + ' - the promise matches what the parser does', () => {
      expect(observe(parse, section, mode)).toBe(partyRule(section, mode));
    });
  }

  it('purchase is the only section whose answer depends on the mode', () => {
    /*
     * The bug the first version shipped. A cash purchase accepts a supplier and
     * does not need one; a credit purchase must have one. A rule keyed only by
     * section cannot express that, and a screen built on one would grey out the
     * commit on a cash purchase that the engine would have taken.
     */
    expect(partyRule('purchase', 'cash')).toBe('optional');
    expect(partyRule('purchase', 'udhar')).toBe('required');

    const varies = new Set(
      CASES.filter(({ section }) => {
        const answers = new Set(
          CASES.filter((c) => c.section === section).map((c) => partyRule(c.section, c.mode)),
        );
        return answers.size > 1;
      }).map((c) => c.section),
    );
    expect([...varies]).toEqual(['purchase']);
  });

  it('exactly three sections always require a party, whatever the mode', () => {
    const always = [...new Set(CASES.map((c) => c.section))].filter((section) =>
      CASES.filter((c) => c.section === section).every(
        (c) => partyRule(c.section, c.mode) === 'required',
      ),
    );
    expect(always.sort()).toEqual(['party_payment', 'udhar_collection', 'udhar_sales']);
  });
});

/*
 * THE FOUR EVENT PARSERS, by the same method. Kept as their own table: the
 * claims above are about the eight closing sections and stay true of them. An
 * event leg always carries its link, so the drafts here do too.
 */
const EVENT_CASES: readonly {
  readonly section: Entry['section'];
  readonly parse: (d: EntryDraft) => Entry;
  readonly mode: Entry['mode'];
}[] = [
  { section: 'sales_return', parse: parseReturnEntry, mode: 'other' },
  { section: 'exchange_out', parse: parseExchangeOutEntry, mode: 'other' },
  { section: 'exchange_receipt', parse: parseExchangeReceiptEntry, mode: 'cash' },
  { section: 'exchange_receipt', parse: parseExchangeReceiptEntry, mode: 'upi' },
  { section: 'exchange_receipt', parse: parseExchangeReceiptEntry, mode: 'udhar' },
  { section: 'refund_paid', parse: parseRefundEntry, mode: 'cash' },
  { section: 'refund_paid', parse: parseRefundEntry, mode: 'upi' },
  { section: 'refund_paid', parse: parseRefundEntry, mode: 'udhar' },
];

describe('partyRule agrees with the event parsers too (EX-11)', () => {
  const linked = (parse: (d: EntryDraft) => Entry) => (d: EntryDraft) =>
    parse({ ...d, refersToEntryId: 'e-original' });
  for (const { section, parse, mode } of EVENT_CASES) {
    it(section + ' / ' + mode + ' - the promise matches what the parser does', () => {
      expect(observe(linked(parse), section, mode)).toBe(partyRule(section, mode));
    });
  }
});
