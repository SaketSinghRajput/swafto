/**
 * CANCEL THIS ENTRY (docs/design/CANCEL-ENTRY-GATE.md). A mistake on an OPEN day, undone without
 * editing or deleting anything (D1): a new row, `cancelsEntryId`, that points at the entry it cancels.
 *
 * THE PAIR IS EXCLUDED, NOT NETTED. The cancel row copies its target's section, mode, party, day and
 * amount - a positive whole number of paise, so no existing CHECK needs touching and no signed amount
 * exists. `liveEntries` then drops BOTH rows before any figure is derived, so a cancelled sale is not
 * in net sales, expected cash, credit outstanding or an item report, and the append-only record is kept.
 *
 * CLOCK-FREE AND MONEY-FREE: the amount is copied, never computed, and nothing here reads a clock.
 *
 * REFUSALS carry a stable code in `EntryInputError.field` (the sync route sends it to the phone as the
 * row's `field`): `cancel_of_cancel`, `cancel_event_leg`, `has_linked_entries`, `already_cancelled`,
 * `cancel_other_day`, `cancel_mismatch`.
 */
import { EntryInputError } from './input.ts';
import { ENTRY_PARSERS } from './returns.ts';
import { isEventSection, type Entry } from './types.ts';

export const CANCEL_REFUSALS = [
  'cancel_of_cancel',
  'cancel_event_leg',
  'has_linked_entries',
  'already_cancelled',
  'cancel_other_day',
  'cancel_mismatch',
] as const;
export type CancelRefusal = (typeof CANCEL_REFUSALS)[number];

const refuse = (code: CancelRefusal, message: string): never => {
  throw new EntryInputError(code, message);
};

/**
 * The entries that still count: every entry except a cancel row and the entry it cancels. Identity when
 * nothing is cancelled, so every existing figure and vector is unchanged. Apply it ONCE, where a
 * `DayInput.entries` is assembled, never inside the figure functions.
 */
export function liveEntries<T extends { readonly id: string; readonly cancelsEntryId?: string | undefined }>(
  entries: readonly T[],
): readonly T[] {
  let any = false;
  for (const e of entries) {
    if (e.cancelsEntryId !== undefined) {
      any = true;
      break;
    }
  }
  if (!any) return entries;
  const cancelled = new Set<string>();
  for (const e of entries) if (e.cancelsEntryId !== undefined) cancelled.add(e.cancelsEntryId);
  return entries.filter((e) => e.cancelsEntryId === undefined && !cancelled.has(e.id));
}

/**
 * Whether `cancel` may stand as the cancellation of `target`, given the rows that already point at the
 * target. Throws `EntryInputError` with one of CANCEL_REFUSALS. The phone runs it before it writes, and the
 * server runs the same thing on a push, so a crafted request meets the keypad's refusals.
 *
 *  - `target.cancelsEntryId` set -> a cancel of a cancel.
 *  - an event leg (return, exchange, refund) -> refused; cancel the sale's return chain first or not at all.
 *  - `referrers` non-empty (a returned sale, exchange legs, a correction) -> `has_linked_entries`.
 *  - `priorCancel` exists (a different row) -> `already_cancelled`.
 *  - a different day, or a copy that does not match the target -> refused.
 */
export function assertCancelFits(
  cancel: Entry,
  target: Entry,
  referrers: readonly Entry[],
  priorCancel: Entry | null,
): void {
  if (cancel.cancelsEntryId !== target.id) refuse('cancel_mismatch', 'a cancel names the entry it cancels.');
  if (target.cancelsEntryId !== undefined) refuse('cancel_of_cancel', 'a cancellation cannot itself be cancelled; enter the entry again instead.');
  if (isEventSection(target.section)) refuse('cancel_event_leg', 'a return and its settlement are not cancelled one leg at a time.');
  if (referrers.some((r) => r.id !== cancel.id)) {
    refuse('has_linked_entries', 'this entry has a return or a correction linked to it; cancel that first.');
  }
  if (priorCancel !== null && priorCancel.id !== cancel.id) refuse('already_cancelled', 'this entry is already cancelled.');
  if (cancel.dayId !== target.dayId) refuse('cancel_other_day', 'an entry is cancelled on its own day; a closed day takes a correction instead.');
  if (
    cancel.section !== target.section ||
    cancel.mode !== target.mode ||
    cancel.amount !== target.amount ||
    (cancel.partyId ?? null) !== (target.partyId ?? null)
  ) {
    refuse('cancel_mismatch', 'a cancel repeats the entry it cancels exactly.');
  }
}

/**
 * The cancel row for `d.target`, on the same day, copying its section, mode, party and amount. `ledger` is
 * every entry the shop holds for that day or later (at least the rows that point at the target). Throws
 * `EntryInputError` (see `assertCancelFits`). The day being OPEN is the database's rule (D7 trigger) and the
 * screen's, not this function's: it has no day state to read.
 */
export function buildCancel(d: {
  readonly target: Entry;
  readonly id: string;
  readonly createdAt: string;
  readonly ledger: readonly Entry[];
}): Entry {
  const t = d.target;
  if (t.cancelsEntryId !== undefined) refuse('cancel_of_cancel', 'a cancellation cannot itself be cancelled; enter the entry again instead.');
  if (isEventSection(t.section)) refuse('cancel_event_leg', 'a return and its settlement are not cancelled one leg at a time.');
  const base = ENTRY_PARSERS[t.section]({
    id: d.id,
    dayId: t.dayId,
    createdAt: d.createdAt,
    amount: t.amount,
    mode: t.mode,
    ...(t.partyId ? { partyId: t.partyId } : {}),
  });
  const cancel = { ...base, cancelsEntryId: t.id } as Entry;
  assertCancelFits(
    cancel,
    t,
    d.ledger.filter((e) => e.refersToEntryId === t.id),
    d.ledger.find((e) => e.cancelsEntryId === t.id) ?? null,
  );
  return cancel;
}
