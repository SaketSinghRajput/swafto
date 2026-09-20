/**
 * THE ADVERSARIAL SHOP - everything the canonical one is not.
 *
 * The canonical shop proves a screen renders. This one proves it survives. **The
 * benchmarks are measured against this shop**, because a layout that holds for
 * "Ramesh" and four thousand rupees says nothing about the layout a real user meets
 * in month three.
 *
 * Every hostile property below is here because something in this build's history
 * says it matters, not because it seemed adventurous:
 *
 *   LAKH-SCALE FIGURES     DC-002: Indian 2-2-3 grouping diverges from Western
 *                          grouping only at and above one lakh. Every smaller figure
 *                          renders identically under both, so a shop that never
 *                          crosses the threshold cannot detect the bug.
 *   THE LONGEST NAME       Odia is the longest of the three languages and the one
 *                          nobody here can proofread. A name that fits in English
 *                          may not fit translated.
 *   A GAP DAY              The app refuses to guess an opening balance. Screens have
 *                          to render that refusal, and it has no figure.
 *   A CORRECTION AGAINST
 *   A CLOSED DAY           D7. The closed day stays byte-identical while today
 *                          moves, and both are visible at once.
 *   A SKIPPED SECTION      D8. Skipped and untouched give the same total and a
 *                          different day state - the one distinction a screen can
 *                          get wrong while every number stays right.
 *   AN IMPORTED ENTRY      source: 'imported' was absent from every fixture until
 *                          finding F-04, so the reversibility path was unexercised.
 *   ONE PAISA              Rounding and column alignment both have to survive it.
 *
 * As with the canonical shop, NO EXPECTED FIGURE IS WRITTEN HERE.
 */
import type { DayInput, DayRecord, Entry, Party } from '@swafto/formula-engine';

const rs = (rupees: number): number => rupees * 100;

export const ADVERSARIAL_SHOP = {
  id: 'shop-adversarial',
  name: 'ଶ୍ରୀ ଜଗନ୍ନାଥ ଷ୍ଟୋର୍ ଏବଂ ଜେନେରାଲ୍ ମର୍ଚାଣ୍ଡାଇଜ୍',
  language: 'od' as const,
};

/**
 * The first name is the longest a party name may be. It is Odia because Odia is the
 * language whose copy nobody here can check, so it is the one that has to be proven
 * to fit by measurement rather than by reading it.
 */
export const ADVERSARIAL_PARTIES: readonly Party[] = [
  {
    id: 'p-long',
    kind: 'customer',
    name: 'ବିଶ୍ୱନାଥ ମହାପାତ୍ର ଏବଂ ପୁତ୍ରଗଣ ହୋଲସେଲ',
    defaultDueDays: 45,
  },
  { id: 'p-one', kind: 'customer', name: 'କ', defaultDueDays: 0 },
  {
    id: 'p-supplier-long',
    kind: 'supplier',
    name: 'Shree Venkateshwara Agencies & Co.',
    defaultDueDays: 60,
  },
];

export const ADVERSARIAL_DATE = '2026-03-02';
/** The day before is a GAP: never closed, so nothing carries forward from it. */
export const ADVERSARIAL_GAP_DATE = '2026-03-01';
/** The last day that actually closed, and the one today's correction references. */
export const ADVERSARIAL_CLOSED_DATE = '2026-02-28';

const e = (
  id: string,
  section: Entry['section'],
  amount: number,
  mode: Entry['mode'],
  extra: Partial<Entry> = {},
): Entry =>
  ({
    id,
    dayId: ADVERSARIAL_DATE,
    section,
    amount,
    mode,
    source: 'manual',
    createdAt: `${ADVERSARIAL_DATE}T21:55:00.000Z`,
    ...extra,
  }) as Entry;

export const ADVERSARIAL_ENTRIES: readonly Entry[] = [
  // Above one lakh: the only range where Indian grouping differs from Western.
  e('a-01', 'cash_sales', rs(247500), 'cash'),
  e('a-02', 'upi_sales', rs(118060), 'upi'),
  // One paisa.
  e('a-03', 'cash_sales', 1, 'cash'),
  e('a-04', 'udhar_sales', rs(96400), 'udhar', { partyId: 'p-long' }),
  e('a-05', 'udhar_collection', rs(12), 'cash', { partyId: 'p-one' }),
  e('a-06', 'purchase', rs(203900), 'udhar', {
    partyId: 'p-supplier-long',
    // Already overdue on the fixture's date, so the aging vocabulary must render.
    dueDate: '2026-02-10',
  }),
  e('a-07', 'expense', rs(75), 'cash', {
    label: 'ବିଦ୍ୟୁତ୍ ବିଲ୍ ଏବଂ ଜେନେରେଟର୍ ଡିଜେଲ୍ ଖର୍ଚ୍ଚ',
  }),
  // The reversibility path F-04 found unexercised.
  e('a-08', 'expense', rs(1250), 'upi', { label: 'Imported', source: 'imported' }),
  e('a-09', 'withdrawal', rs(50000), 'cash'),
  /*
   * D7 - a correction posted TODAY against a day that is already closed. Today's
   * figures move; the closed day does not. Both must be visible at once, and this is
   * the entry that makes a screen prove it.
   */
  e('a-10', 'cash_sales', rs(1800), 'cash', { correctsDayId: ADVERSARIAL_CLOSED_DATE }),
];

export const ADVERSARIAL_DAY: DayRecord = {
  date: ADVERSARIAL_DATE,
  state: 'open',
  /*
   * NULL, and that is the point. The previous day was never closed, so there is no
   * counted figure to carry and the app refuses to invent one. Every screen showing
   * an opening balance has to render the ABSENCE rather than a zero.
   */
  openingCash: null,
  countedCash: null,
  // D8: deliberately marked as having nothing, which is not the same as untouched.
  skippedSections: ['party_payment'],
};

export const adversarialInput = (): DayInput => ({
  day: ADVERSARIAL_DAY,
  entries: ADVERSARIAL_ENTRIES,
  priorCreditOutstanding: rs(864210),
  priorSupplierOutstanding: rs(1207340),
});
