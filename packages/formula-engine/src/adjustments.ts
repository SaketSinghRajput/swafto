/**
 * DECISION 2 - TYPED ADJUSTMENTS, AND WHAT EACH ONE MOVES.
 *
 * PURE, like the rest of the engine: no clock, no I/O.
 *
 * Profit in this product is the paper sheet's: NET SALES - PURCHASE - EXPENSE,
 * with every purchase counted IN FULL on the day it is bought (P5). There is no
 * stock ledger (D5). That one fact decides most of the table below, because a
 * cost the sheet has already taken cannot be taken a second time.
 *
 *   counterfeit_note   CASH -, PROFIT -.  A fake note was taken in as a cash sale
 *                      and counted into expected cash, but it is not money: RBI's
 *                      Master Direction on Counterfeit Notes (2024) has a bank
 *                      impound it and credit nothing for it. The drawer genuinely
 *                      holds that much less (D2: it IS a cash fact), and the sale
 *                      it paid for brought in nothing, so it is the shop's loss.
 *
 *   rounding_given     CASH -, PROFIT -.  Chhutta: no change, so the bill was
 *                      rounded down or extra change handed over. Cash left the
 *                      drawer and nothing came back for it.
 *
 *   rounding_kept      CASH +, PROFIT +.  The mirror: "keep the change". Cash came
 *                      in that no sale recorded.
 *
 *   home_use           CASH 0, PROFIT +.  Goods taken off the shelf for the house.
 *                      No cash moves (D2). It is a DRAWING IN KIND, and D3 keeps
 *                      drawings outside profit - but the purchase that bought those
 *                      goods is already inside profit at full cost (P5), so leaving
 *                      it there would make the family's dinner a business cost.
 *                      Books carry it as Drawings Dr / Purchases Cr at cost, which
 *                      gives exactly this: the cost comes back OUT of the purchase
 *                      side. The amount is the COST of the goods, and the copy says
 *                      so. Withdrawal (cash drawing) is untouched by this.
 *
 *   stock_written_off  CASH 0, PROFIT 0.  Damaged or expired goods thrown away.
 *                      No cash moves. And the loss is ALREADY in profit: their
 *                      purchase was deducted in full when they were bought, so
 *                      deducting them again would count one loss twice. It is
 *                      recorded so the day can say why sales were thin against
 *                      purchase, and so a later score can see it - not to move a
 *                      figure.
 *
 * A NOTE ON WHAT THE LIST DOES NOT STOP. A typed rounding adjustment can still be
 * given an amount that swallows a real shortage. The type is what makes that
 * visible and countable later - "₹2,000 of chhutta" reads as what it is - which a
 * free-text reason never was. Bounding the amount would be a threshold nobody has
 * measured, so none is invented here.
 */
import { add, assertPaise, sum, type Paise } from './money.ts';
import { parseIsoDate, type IsoDate } from './dates.ts';
import { EntryInputError } from './input.ts';
import {
  ADJUSTMENT_TYPES,
  type Adjustment,
  type AdjustmentType,
  type DayInput,
  type UpiConfirmation,
  type WorkingLine,
} from './types.ts';

export type Effect = -1 | 0 | 1;

/** The whole of decision 2's arithmetic. Reasoned line by line above. */
export const ADJUSTMENT_EFFECT: Readonly<Record<AdjustmentType, { cash: Effect; profit: Effect }>> = {
  counterfeit_note: { cash: -1, profit: -1 },
  rounding_given: { cash: -1, profit: -1 },
  rounding_kept: { cash: 1, profit: 1 },
  home_use: { cash: 0, profit: 1 },
  stock_written_off: { cash: 0, profit: 0 },
};

/** The working key a line renders under. Also the type's name on the picker. */
export const adjustmentKey = (type: AdjustmentType): string => 'adjustment.' + type;

export function isAdjustmentType(value: unknown): value is AdjustmentType {
  return typeof value === 'string' && (ADJUSTMENT_TYPES as readonly string[]).includes(value);
}

/**
 * THE ONE PARSER, used by the phone at the keypad and by the server on every
 * push. Builds the record field by field, so nothing the caller sent beyond the
 * five fields - a reason, a label, a note - can ride along into the ledger.
 */
export function parseAdjustment(draft: {
  readonly id: string;
  readonly dayId: IsoDate;
  readonly type: unknown;
  readonly amount: unknown;
  readonly createdAt: string;
}): Adjustment {
  if (!draft.id) throw new EntryInputError('id', 'an adjustment needs an id, assigned by the caller');
  if (!draft.createdAt) throw new EntryInputError('createdAt', 'an adjustment needs a creation time');
  if (!isAdjustmentType(draft.type)) {
    throw new EntryInputError('type', 'an adjustment is one of the fixed list, never free text.');
  }
  const amount = assertPaise(draft.amount, 'amount');
  if (amount <= 0) throw new EntryInputError('amount', 'an adjustment needs an amount above zero.');
  parseIsoDate(draft.dayId);
  return { id: draft.id, dayId: draft.dayId, type: draft.type, amount, createdAt: draft.createdAt };
}

/** The same, for a confirmation. Which entry it may name is the store's and the repo's rule. */
export function parseUpiConfirmation(draft: {
  readonly id: string;
  readonly dayId: IsoDate;
  readonly entryId: string;
  readonly batchId?: string;
  readonly confirmedAt: string;
}): UpiConfirmation {
  if (!draft.id) throw new EntryInputError('id', 'a confirmation needs an id');
  if (!draft.entryId) throw new EntryInputError('entryId', 'a confirmation names the receipt it confirms');
  if (!draft.confirmedAt) throw new EntryInputError('confirmedAt', 'a confirmation needs a time');
  parseIsoDate(draft.dayId);
  return {
    id: draft.id,
    dayId: draft.dayId,
    entryId: draft.entryId,
    ...(draft.batchId ? { batchId: draft.batchId } : {}),
    confirmedAt: draft.confirmedAt,
  };
}

/**
 * One working line per type that moves `figure`, in the list's order, and ONLY
 * for types the day actually has. A day with no adjustments adds no lines at all,
 * so every figure and working recorded before decision 2 is byte-identical.
 */
export function adjustmentLines(input: DayInput, figure: 'cash' | 'profit'): WorkingLine[] {
  const all: readonly Adjustment[] = input.adjustments ?? [];
  const lines: WorkingLine[] = [];
  for (const type of ADJUSTMENT_TYPES) {
    const effect = ADJUSTMENT_EFFECT[type][figure];
    if (effect === 0) continue;
    const ofType = all.filter((a) => a.type === type);
    if (ofType.length === 0) continue;
    lines.push({
      key: adjustmentKey(type),
      sign: effect > 0 ? '+' : '-',
      amount: sum(ofType.map((a) => a.amount)),
    });
  }
  return lines;
}

/** What the day's adjustments come to per type, for a summary. Derived, never stored. */
export function adjustmentTotals(input: DayInput): Partial<Record<AdjustmentType, Paise>> {
  const out: Partial<Record<AdjustmentType, Paise>> = {};
  for (const a of input.adjustments ?? []) out[a.type] = add(out[a.type] ?? 0, a.amount);
  return out;
}
