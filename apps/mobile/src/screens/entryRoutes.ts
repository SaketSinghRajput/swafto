/**
 * EVERY WAY AN ENTRY CAN BE RECORDED, IN ONE PLACE, AND THE ROUTE TO EACH.
 *
 * THE DEFECT THIS FILE EXISTS TO END. `EntryForm` takes `selectedCommit` and
 * `onSelectCommit`; T7, T8, T9 and T10 each declared both props and forwarded
 * them faithfully; and `App.tsx` never passed either one. The only callers that
 * ever supplied them were the four `.test.tsx` files. So in the running app
 * `selectedCommit` was permanently its default of 0 and `onSelectCommit` was the
 * no-op default, which meant:
 *
 *   - the segmented control rendered, highlighted on tap, and changed nothing;
 *   - T7 could record a cash sale and NOT a UPI sale or a credit sale;
 *   - T8 could record a collection and NOT a credit sale or a supplier payment;
 *   - T9 could record a cash expense and no other mode;
 *   - T10 could record a cash withdrawal and not a UPI one.
 *
 * And because the old `FORM_FOR_SECTION` sent udhar_sales, udhar_collection AND
 * party_payment all to T8, whose first commit is a collection, tapping "Pay" -
 * money OUT to a supplier - recorded money IN from a customer. Wrong sign and
 * wrong party kind, with nothing on screen to contradict it.
 *
 * The tests passed `selectedCommit={index}` straight into the screen, so they
 * proved every segment rendered correctly while the app could never reach one.
 * That is the failure CLAUDE.md names: a check that has quietly stopped
 * checking, with everything behind it presumed safe.
 *
 * WHY THE INDEX IS SEARCHED AND NEVER WRITTEN DOWN. A hand-maintained table of
 * `{ section -> index }` is the same bug one move away: reorder a form's
 * segments and the map silently points at the neighbour. `routeTo` finds the
 * index in the very array the form renders, so the two cannot disagree. If a
 * section has no commit to land on, this module throws while loading - which
 * fails the build and every test at once, rather than shipping a tile that
 * files a purchase as a tea expense.
 */
import type { CommitOption } from '../components/EntryForm.tsx';
import type { Entry, Section } from '@swafto/formula-engine';

/**
 * The four screens that can take an entry.
 *
 * Declared here as its own union rather than imported from `session.tsx`: that
 * module imports this one to resolve a tapped tile, and a cycle between them
 * would be a real one. This is a subset of `ScreenId` and assigns to it.
 */
export type EntryScreenId = 'T7' | 'T8' | 'T9' | 'T10';

/** Form A - a sale. The mode decides the section, which is IN1's rule. */
export const FORM_A_COMMITS: readonly CommitOption[] = [
  { labelKey: 'formA.mode.cash', section: 'cash_sales', mode: 'cash' },
  { labelKey: 'formA.mode.upi', section: 'upi_sales', mode: 'upi' },
  { labelKey: 'formA.mode.udhar', section: 'udhar_sales', mode: 'udhar' },
];

/** Form B - the three things that move a named person's balance. */
export const FORM_B_COMMITS: readonly CommitOption[] = [
  { labelKey: 't8.collect', section: 'udhar_collection', mode: 'cash' },
  { labelKey: 't8.pay', section: 'party_payment', mode: 'cash' },
  { labelKey: 't8.credit', section: 'udhar_sales', mode: 'udhar' },
];

/** Form C, as an expense. Five modes, and only `cash` touches the drawer (D2). */
export const FORM_C_EXPENSE_COMMITS: readonly CommitOption[] = [
  { labelKey: 'formA.mode.cash', section: 'expense', mode: 'cash' },
  { labelKey: 'formA.mode.upi', section: 'expense', mode: 'upi' },
  { labelKey: 't9.mode.other', section: 'expense', mode: 'other' },
  { labelKey: 'formA.mode.udhar', section: 'expense', mode: 'udhar' },
  { labelKey: 't9.mode.shop_stock', section: 'expense', mode: 'shop_stock' },
];

/**
 * Form C, as a purchase.
 *
 * PURCHASE HAD NO COMMIT ANYWHERE IN THE APP. The Purchase tile routed to T9,
 * every one of whose five options wrote `section: 'expense'`, so buying stock
 * was filed as tea money. `parsePurchaseEntry` existed in the engine and T5 and
 * T11 both displayed a purchase total that nothing could ever add to.
 *
 * `shop_stock` is absent on purpose: taking goods into stock is what a purchase
 * already is, so the mode would only repeat the section. The reference design
 * drops it here for the same reason.
 */
export const FORM_C_PURCHASE_COMMITS: readonly CommitOption[] = [
  { labelKey: 'formA.mode.cash', section: 'purchase', mode: 'cash' },
  { labelKey: 'formA.mode.upi', section: 'purchase', mode: 'upi' },
  { labelKey: 't9.mode.other', section: 'purchase', mode: 'other' },
  { labelKey: 'formA.mode.udhar', section: 'purchase', mode: 'udhar' },
];

/** Form D - the owner taking money out. Outside profit, by D3. */
export const FORM_D_COMMITS: readonly CommitOption[] = [
  { labelKey: 'formA.mode.cash', section: 'withdrawal', mode: 'cash' },
  { labelKey: 'formA.mode.upi', section: 'withdrawal', mode: 'upi' },
];

/** Where a tapped section opens, and which segment is live when it does. */
export interface EntryRoute {
  readonly screen: EntryScreenId;
  readonly commits: readonly CommitOption[];
  /** Index into `commits`. Searched, never written down - see the header. */
  readonly commit: number;
}

function routeTo(
  screen: EntryScreenId,
  commits: readonly CommitOption[],
  section: Entry['section'],
): EntryRoute {
  const commit = commits.findIndex((c) => c.section === section);
  if (commit < 0) {
    throw new Error('entryRoutes: ' + screen + ' has no commit for section ' + section);
  }
  return { screen, commits, commit };
}

/**
 * Every section, and how to reach it. Exhaustive by type: a section added to
 * the engine without a route here fails to compile, which is the only thing
 * that keeps this true. `purchase` and `expense` share Form C and differ only
 * by which commit set it is handed.
 */
export const ROUTE_FOR_SECTION: Record<Section, EntryRoute> = {
  cash_sales: routeTo('T7', FORM_A_COMMITS, 'cash_sales'),
  upi_sales: routeTo('T7', FORM_A_COMMITS, 'upi_sales'),
  udhar_sales: routeTo('T8', FORM_B_COMMITS, 'udhar_sales'),
  udhar_collection: routeTo('T8', FORM_B_COMMITS, 'udhar_collection'),
  party_payment: routeTo('T8', FORM_B_COMMITS, 'party_payment'),
  purchase: routeTo('T9', FORM_C_PURCHASE_COMMITS, 'purchase'),
  expense: routeTo('T9', FORM_C_EXPENSE_COMMITS, 'expense'),
  withdrawal: routeTo('T10', FORM_D_COMMITS, 'withdrawal'),
};
