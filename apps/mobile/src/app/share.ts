/**
 * R5 FR-1, FR-2, FR-4 - WHAT LEAVES THE PHONE, AND ONLY WHEN HE SENDS IT.
 *
 * Three texts the shopkeeper hands to another app himself: a polite udhar
 * reminder opened in HIS OWN WhatsApp (he presses send), a customer's ledger as
 * plain text for the share sheet, and a month of entries as a CSV file for his
 * accountant. The server sends none of them and is told of none of them. Pure:
 * every figure comes from the store's derivations, every amount through
 * `formatPaise` (ADR-003), nothing here reads a clock.
 *
 * THE ACCOUNTANT'S CSV, COLUMN BY COLUMN (FR-4). One UTF-8 file with a BOM (so
 * a spreadsheet shows Odia and Hindi names), CRLF rows (RFC 4180), two blocks:
 *
 *   line 1        the L-15 sentence: a record of entries, not a tax document
 *   line 2        "Entries <YYYY-MM>, <shop name>"
 *   ENTRIES       date (YYYY-MM-DD, the business day), section_code (the
 *                 ledger's own code, e.g. udhar_sales), section (its English
 *                 name), mode (cash, upi, udhar, other, shop_stock), party (as
 *                 typed, or empty), party_kind (customer, supplier or empty),
 *                 amount_inr (rupees, two decimals, never negative - the
 *                 section carries the direction), label (as typed, or empty),
 *                 corrects_day (the closed day a correction is for, or empty),
 *                 refers_to_entry (the entry a return or correction points at)
 *   (blank line)
 *   BALANCES      party, kind, balance_inr: what stood at the end of the month
 *                 over every day this phone holds. For a customer it is what he
 *                 owes the shop; for a supplier, what the shop owes him.
 *
 * A text cell that begins with = + - or @ gets a leading apostrophe, so a name
 * typed as "=HYPERLINK(...)" is shown, never run, by the accountant's
 * spreadsheet. Amounts are numbers and are left alone.
 */
import { add, formatPaise, sum, type Entry, type IsoDate, type Paise, type Party } from '@swafto/formula-engine';
import { phrase, type Language, type StringKey } from '../i18n/strings.ts';
import { partyEffect } from '../store/index.ts';
import { fill } from '../components/DayParts.tsx';

/** The reference labels a ledger line "Udhar collected · Cash", "Purchases · Udhar". */
export const MODE_LABEL: Readonly<Record<Entry['mode'], StringKey>> = {
  cash: 'formA.mode.cash',
  upi: 'formA.mode.upi',
  udhar: 'formA.mode.udhar',
  other: 't9.mode.other',
  shop_stock: 't9.mode.shop_stock',
};

/** One ledger line's words, shared by P2/P3 and the statement so the two read alike. */
export const lineLabel = (s: (k: StringKey) => string, e: Entry): string =>
  s(('section.' + e.section) as StringKey) + (e.section === 'udhar_sales' ? '' : ' · ' + s(MODE_LABEL[e.mode]));

/* ---- FR-1: the reminder ------------------------------------------------ */

/**
 * The number WhatsApp wants: country code and ten digits, nothing else. A party
 * phone is saved as ten digits (session.createParty); anything that is not an
 * Indian mobile after stripping is refused rather than guessed at.
 */
export function whatsappNumber(phone: string | undefined): string | null {
  if (phone === undefined) return null;
  const d = phone.replace(/\D/g, '');
  const ten = d.length === 12 && d.startsWith('91') ? d.slice(2) : d.length === 11 && d.startsWith('0') ? d.slice(1) : d;
  return /^[6-9][0-9]{9}$/.test(ten) ? '91' + ten : null;
}

/** The app link first, the web link if WhatsApp is not installed. */
export const whatsappUrls = (number: string, text: string): { readonly app: string; readonly web: string } => ({
  app: 'whatsapp://send?phone=' + number + '&text=' + encodeURIComponent(text),
  web: 'https://wa.me/' + number + '?text=' + encodeURIComponent(text),
});

/** Polite, in the shop's language, the amount and the shop's name. No threat, no deadline. */
export function reminderText(
  language: Language,
  v: { readonly shopName: string; readonly partyName: string; readonly amount: Paise },
): string {
  const key: StringKey = v.shopName.trim() === '' ? 'remind.textNoShop' : 'remind.text';
  return fill(phrase(key, language), {
    name: v.partyName,
    shop: v.shopName.trim(),
    amount: formatPaise(v.amount),
  });
}

/* ---- FR-2: the statement ----------------------------------------------- */

/**
 * The customer's lines, each with the balance after it. Lines that move nothing
 * (the goods leg of a return) are left out: the statement is of his account.
 * The last balance is `Store.partyBalance`, because both sum `partyEffect`.
 */
export function statementText(
  language: Language,
  v: {
    readonly shopName: string;
    readonly party: Party;
    readonly ledger: readonly Entry[];
    readonly asOf: IsoDate;
  },
): string {
  const s = (k: StringKey) => phrase(k, language);
  const out: string[] = [];
  if (v.shopName.trim() !== '') out.push(v.shopName.trim());
  out.push(fill(s('statement.title'), { name: v.party.name }));
  out.push(fill(s('statement.asOf'), { date: v.asOf }));
  out.push(s('s5.notTax'));
  out.push('');
  let balance: Paise = 0;
  let lines = 0;
  for (const e of v.ledger) {
    const delta = partyEffect(e);
    if (delta === 0) continue;
    balance = add(balance, delta);
    lines += 1;
    out.push(
      [e.dayId, lineLabel(s, e), formatPaise(delta, { withSign: true }), `${s('statement.balance')} ${formatPaise(balance)}`].join(
        '  ',
      ),
    );
  }
  if (lines === 0) out.push(s('statement.none'));
  out.push('');
  out.push(fill(s('statement.due'), { amount: formatPaise(balance) }));
  return out.join('\n');
}

/* ---- FR-4: the accountant's CSV ---------------------------------------- */

/** Rupees with two decimals from paise, through the formatter: no float, no grouping comma. */
export const rupees = (p: Paise): string => formatPaise(p, { withSymbol: false }).replace(/,/g, '');

const quote = (v: string): string => (/[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
/** A cell somebody TYPED: never let a spreadsheet run it as a formula. */
const textCell = (v: string | undefined): string => quote(v !== undefined && /^[=+\-@]/.test(v) ? "'" + v : (v ?? ''));

/** The months the book has days in, newest first, 'YYYY-MM'. */
export const exportMonths = (dates: readonly IsoDate[]): readonly string[] =>
  [...new Set(dates.map((d) => d.slice(0, 7)))].sort().reverse();

export const csvFileName = (month: string): string => 'swafto-entries-' + month + '.csv';

export function accountantCsv(
  language: Language,
  v: {
    readonly month: string;
    readonly shopName: string;
    readonly entries: readonly Entry[];
    readonly parties: readonly Party[];
  },
): string {
  const byId = new Map(v.parties.map((p) => [p.id, p]));
  const rows: string[] = [];
  const notTax = phrase('s5.notTax', 'en');
  rows.push(quote(language === 'en' ? notTax : notTax + ' ' + phrase('s5.notTax', language)));
  rows.push(quote('Entries ' + v.month + (v.shopName.trim() === '' ? '' : ', ' + v.shopName.trim())));
  rows.push(
    'date,section_code,section,mode,party,party_kind,amount_inr,label,corrects_day,refers_to_entry',
  );
  for (const e of v.entries) {
    if (e.dayId.slice(0, 7) !== v.month) continue;
    const party = e.partyId === undefined ? undefined : byId.get(e.partyId);
    rows.push(
      [
        e.dayId,
        e.section,
        quote(phrase(('section.' + e.section) as StringKey, 'en')),
        e.mode,
        textCell(party?.name),
        party?.kind ?? '',
        rupees(e.amount),
        textCell(e.label),
        e.correctsDayId ?? '',
        e.refersToEntryId ?? '',
      ].join(','),
    );
  }
  rows.push('');
  rows.push('party,kind,balance_inr');
  for (const p of v.parties) {
    const upToMonth = v.entries.filter((e) => e.partyId === p.id && e.dayId.slice(0, 7) <= v.month);
    rows.push([textCell(p.name), p.kind, rupees(sum(upToMonth.map(partyEffect)))].join(','));
  }
  return '﻿' + rows.join('\r\n') + '\r\n';
}
