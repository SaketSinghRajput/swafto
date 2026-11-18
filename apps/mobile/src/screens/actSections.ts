import type { StringKey } from '../i18n/strings.ts';
import type { TileKind } from '../components/Shell.tsx';
import type { IconName } from '../ui/Icon.tsx';

/**
 * THE SIX ENTRY ACTIONS, IN ONE PLACE, BECAUSE TWO SCREENS DRAW THEM.
 *
 * T1 offers these live; T3 offers the same six visibly disabled with a line
 * saying why, because edge case E2 requires a rail on a closed day to be
 * "never silently inert". They were two arrays in two files - one list in two
 * states pretending to be two lists - and T3's own comment said the quiet part
 * out loud: "the two lists are the same list seen in two states, and the first
 * time they diverge this screen starts lying about what the day offered."
 *
 * Nothing would have failed when they diverged. Both screens would have
 * rendered, both would have passed their tests, and the closed day would have
 * reported a set of actions the open day never offered.
 *
 * THESE ARE NOT DERIVED FROM THE DATA, and that is the whole point. Today once
 * offered a route to an entry form only by tapping a section row, and those
 * rows are filtered to sections that already hold something. On the first
 * morning of any business day there are no entries, therefore no rows,
 * therefore no way to record the first sale - while the empty-state copy said
 * "Nothing entered yet today. Start with a sale." and named an action the
 * screen did not offer.
 *
 * `withdrawal` is deliberately absent. Taking money out of the shop is not a
 * daily counter action, and D3 keeps it outside profit; it stays reachable
 * through its summary row once it has happened.
 *
 * Order follows the day as it is actually worked: money in, then money out,
 * then the credit book.
 */
/**
 * WHICH WAY THE MONEY RUNS, carried here rather than decided by each screen.
 *
 * The tile draws a coloured edge from this. It is DECORATION and never the
 * message - the word on the tile already says whether this is a sale or an
 * expense, so a reader who cannot separate red from green loses nothing. That
 * is the rule `Money` follows with its sign, and here it is not optional: red
 * and green are the two colours this product's readers most often cannot tell
 * apart, and shop daylight makes it worse.
 *
 * `in` and `out` are about the SHOP's position, not about the cash drawer. A
 * credit sale is `in` - the shop has earned it and is owed it - even though D2
 * means no cash moved. Conflating the two would let a tile edge quietly
 * contradict the cash equation, which is the one thing on this screen that has
 * to be above suspicion.
 */
/*
 * USABILITY item 1: `main` IS WHAT HE DOES FORTY TIMES A DAY. Sale, udhar sale,
 * collect and expense sit pinned under Today's header; purchase and paying a
 * supplier are weekly jobs and sit under "More". The order is the order he
 * reaches for them, not the order of the paper sheet.
 */
export const ACT_SECTIONS = [
  { section: 'cash_sales', labelKey: 'act.sale', direction: 'in', tier: 'main', kind: 'sale', icon: 'sale' },
  { section: 'udhar_sales', labelKey: 'act.credit', direction: 'in', tier: 'main', kind: 'udhar', icon: 'udhar' },
  { section: 'udhar_collection', labelKey: 'act.collect', direction: 'in', tier: 'main', kind: 'collect', icon: 'collect' },
  { section: 'expense', labelKey: 'act.expense', direction: 'out', tier: 'main', kind: 'expense', icon: 'expense' },
  { section: 'purchase', labelKey: 'act.purchase', direction: 'out', tier: 'more', kind: 'more', icon: 'out' },
  { section: 'party_payment', labelKey: 'act.pay', direction: 'out', tier: 'more', kind: 'more', icon: 'out' },
] as const satisfies readonly {
  section: string;
  labelKey: StringKey;
  direction: 'in' | 'out';
  tier: 'main' | 'more';
  /** v2: which tint and ink the tile wears (DESIGN-SYSTEM-V2 3.3). Decoration only. */
  kind: TileKind;
  icon: IconName;
}[];
