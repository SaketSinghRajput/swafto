/**
 * THE CANONICAL SHOP - an ordinary Thursday at Sharma Kirana Store.
 *
 * Every screen renders against this. It is deliberately UNREMARKABLE: the figures are
 * what a small shop actually turns over in a day, the party names are short, the day
 * balances to the rupee, and nothing about it is a corner case. That is its job. The
 * adversarial shop next door is where the corners live.
 *
 * WHY A FIXTURE AND NOT A VECTOR. `vectors.json` holds golden EXPECTATIONS - inputs
 * paired with the figures the engine must produce, run under two runtimes and diffed.
 * A fixture is a SHOP: something a screen can read from and a person can recognise.
 * They exist for different reasons and neither replaces the other.
 *
 * NO EXPECTED FIGURE IS WRITTEN HERE. Not one. A fixture carrying its own totals
 * would be a second source of truth for arithmetic the engine owns, and the first
 * time the engine changed they would disagree - with the fixture looking
 * authoritative, because it is the thing the screenshots were taken from. Screens
 * derive every figure by calling the engine on this input. That is also what makes
 * the wired-figure predicate meaningful: mutate an entry here and every figure on the
 * screen must move.
 */
import type { DayInput, DayRecord, Entry, Party } from '@swafto/formula-engine';

/** Rupees to paise, so the numbers below read the way a shopkeeper says them. */
const rs = (rupees: number): number => rupees * 100;

export const CANONICAL_SHOP = {
  id: 'shop-canonical',
  name: 'Sharma Kirana Store',
  language: 'en' as const,
};

export const CANONICAL_PARTIES: readonly Party[] = [
  { id: 'p-ramesh', kind: 'customer', name: 'Ramesh', defaultDueDays: 30 },
  { id: 'p-sunita', kind: 'customer', name: 'Sunita Devi', defaultDueDays: 15 },
  { id: 'p-wholesale', kind: 'supplier', name: 'Gupta Wholesale', defaultDueDays: 21 },
  { id: 'p-dairy', kind: 'supplier', name: 'Anand Dairy', defaultDueDays: 7 },
];

export const CANONICAL_DATE = '2026-07-15';

const e = (
  id: string,
  section: Entry['section'],
  amount: number,
  mode: Entry['mode'],
  extra: Partial<Entry> = {},
): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section,
    amount,
    mode,
    source: 'manual',
    createdAt: `${CANONICAL_DATE}T18:40:00.000Z`,
    ...extra,
  }) as Entry;

/**
 * Something in every section a real Thursday would have, and nothing in the two it
 * would not. `withdrawal` is here on purpose: it is the section most often confused
 * with an expense, and the one the screen copy works hardest to explain.
 */
export const CANONICAL_ENTRIES: readonly Entry[] = [
  e('c-01', 'cash_sales', rs(4820), 'cash'),
  e('c-02', 'cash_sales', rs(1310), 'cash'),
  e('c-03', 'upi_sales', rs(2640), 'upi'),
  e('c-04', 'udhar_sales', rs(900), 'udhar', { partyId: 'p-ramesh' }),
  e('c-05', 'udhar_sales', rs(450), 'udhar', { partyId: 'p-sunita' }),
  e('c-06', 'udhar_collection', rs(1200), 'cash', { partyId: 'p-ramesh' }),
  e('c-07', 'purchase', rs(3400), 'cash'),
  e('c-08', 'purchase', rs(2100), 'udhar', { partyId: 'p-wholesale', dueDate: '2026-08-05' }),
  e('c-09', 'party_payment', rs(1500), 'cash', { partyId: 'p-dairy' }),
  e('c-10', 'expense', rs(120), 'cash', { label: 'Tea' }),
  e('c-11', 'expense', rs(380), 'cash', { label: 'Auto to market' }),
  e('c-12', 'withdrawal', rs(500), 'cash'),
];

/**
 * `countedCash` is null here and filled from the ENGINE by `closedCanonical()` in the
 * barrel, never typed. A hand-written counted figure is the same defect as a
 * hand-written total: it would agree with the engine today and diverge silently the
 * first time the cash formula changed.
 */
export const CANONICAL_DAY: DayRecord = {
  date: CANONICAL_DATE,
  state: 'open',
  openingCash: rs(2000),
  countedCash: null,
  skippedSections: [],
};

export const canonicalInput = (): DayInput => ({
  day: CANONICAL_DAY,
  entries: CANONICAL_ENTRIES,
  priorCreditOutstanding: rs(3750),
  priorSupplierOutstanding: rs(6200),
});
