# Cancel this entry: simplicity gate

Verdict: PROCEED, smallest path = one nullable column `cancels_entry_id` plus one `liveEntries()` filter. No new section, no signed amounts, no new table.

## 1. Does a linked reversal already exist?
Partly. `refers_to_entry_id` links a row to another (same-shop FK `entries_refers_fk`). `buildCorrection` (`packages/formula-engine/src/returns.ts` ~L358) uses it, but a correction is ADDITIVE ONLY: amount > 0, same section, `correctsDayId` required. It states what it corrects and nets nothing; nothing in the engine excludes a pair. `entries_refers_ck` (spec.ts L315) forbids a closing-section row with `refers_to_entry_id` and no `corrects_day_id`, so reuse would need loosening that CHECK, which on SQLite means a table rebuild. Do not reuse it.

Smallest schema change: `ALTER TABLE entries ADD COLUMN cancels_entry_id uuid` with:
- FK `(shop_id, cancels_entry_id) -> entries(shop_id, id)`. Same shop by construction.
- Partial UNIQUE index `(shop_id, cancels_entry_id) WHERE cancels_entry_id IS NOT NULL`. This is the double-cancel guard and it is idempotent across sync: the same row id upserts, a second different cancel row hits the index.
- The cancel row copies the original's section, mode, party and amount. It is positive whole paise, so every existing CHECK passes and no CHECK needs editing.

Steps: edit `packages/schema/src/spec.ts`, run `tools/emit-sql.mjs` to emit a 0006 postgres migration (ALTER only). Extend the sync JSON schema (`apps/api/src/sync/routes.ts` ~L116) and the `Entry` type with an optional field. The 77 vectors and BENCHMARKS.md are untouched: the field is optional and `liveEntries` is the identity when absent. Builder must re-run the benchmarks and report honestly, since the filter adds an O(n) pass. Also run `check:generated` and `prove:verifiers` if a check changes.

## 2. Guards
- Open day only: the cancel row's `day_id` MUST equal the original's `day_id`. The existing trigger `entries_no_insert_into_closed_day` then refuses closed days on both engines. Add the same-day rule in the engine builder and the sync route; no new trigger.
- Not twice: the unique index (server) plus a builder check (phone).
- Cancel of a cancel: refuse in the engine builder and the sync route (`findEntry` target has `cancelsEntryId` set). No trigger.
- Cancelling an event leg or an entry with referrers (return, correction) is refused. This is out of scope; flag to Saket.
- Same shop: `shopOf()` plus the FK. Money: the amount is copied, never computed, so no new arithmetic; `check:money` is unaffected.
- A cancelled row is never edited (D1, append-only triggers unchanged).

## 3. Totals needing the exclusion rule
Corrections do NOT net today, so this is new. Add one `liveEntries(entries)` to the engine: drop any entry whose id is some row's `cancelsEntryId`, and drop the cancel rows. It is clock-free and pure. Apply it once where `DayInput.entries` is assembled (mobile store selector, `apps/api/src/read/routes.ts`) rather than in 13 engine files. Builder must confirm no path bypasses it: primary, upi, scores, comparisons, forecast, intelligence, reports-basic, items (item lines of a cancelled sale). Credit outstanding (party ledger) must also exclude the pair.

## 4. Minimal UI
- Action: in the existing entry detail, T3 or T7 (`apps/mobile/src/screens`), add a "Cancel this entry" button, shown only when the day is open and the entry is live. A confirm dialog follows. Reuse the existing form and confirm components.
- Struck-through: a text style on rows that are targeted by a cancel, with the original kept visible.
- Optional "enter it again": after cancelling, open the existing EntryForm prefilled with the section and mode only, never a guessed amount (no inference rule).
- Strings: add 4 keys in `apps/mobile/src/i18n/strings.ts` (en/hi/od): cancel action, confirm text, "Cancelled" label, enter-again prompt. The hi and od copy is a draft and needs native review (H13). Do not mark it reviewed.
- Closed days keep "Post a correction" (T16) unchanged.

## 5. Estimates (estimates, not measured)
- Backend + schema: about 60-90 lines (spec.ts column and index, migration, Entry type, `buildCancel` and `liveEntries`, sync guards).
- Mobile: about 50-80 lines (button, strike style, strings x3 languages, store call).
- Tests: about 80-120 lines.

Build split, SEQUENTIAL:
- A (backend/schema owner): `packages/schema/**`, `packages/formula-engine/src/**`, `apps/api/src/**`, their tests. Exports `buildCancel` and `liveEntries`.
- B (mobile owner): `apps/mobile/**` only, starts after A merges the engine types.

## 6. Tests that must fail without the change
1. Engine: a cancelled sale is excluded from net sales, expected cash and credit outstanding. Both the original and the cancel row vanish.
2. Engine: cancelling a cancel throws.
3. Engine: cancelling a different-day entry throws.
4. Schema: a second cancel of one entry is refused by the unique index (SQLite and Postgres).
5. Schema: a cancel row into a closed day is refused by the D7 trigger.
6. API: replaying the same cancel push is `alreadyPresent`. A cross-shop target is rejected.
7. Mobile: the action is absent on a closed day and on an already-cancelled row; the row renders struck through.
8. Regression: the 77 vectors and the benchmarks pass byte-identical.

## Looked like a real requirement
- Cancelling a sale that was part-returned: decide with Saket (refused for now).
- Whether cancelled rows should be visible in the day-close summary: the append-only record is kept, but the derived figures exclude them.

## 7. Backend as built (contract for the mobile half)

**Schema.** Migration `0006_cancel_entry` (Postgres): `entries.cancels_entry_id UUID`, FK `(shop_id, cancels_entry_id)` to `entries(shop_id, id)`, partial UNIQUE `entries_cancel_once_uq`, CHECKs `entries_cancel_self_ck` (not itself) and `entries_cancel_plain_ck` (a cancel row is not also a correction, a return leg or a due date). SQLite carries the same column and guards in its CREATE TABLE. Closed days are refused by the existing D7 trigger.

**Engine** (`packages/formula-engine/src/cancel.ts`, exported from the package index): `Entry.cancelsEntryId?`, `liveEntries(entries)` (identity when nothing is cancelled), `buildCancel({ target, id, createdAt, ledger })`, `assertCancelFits(cancel, target, referrers, priorCancel)`. Clock-free; the amount is copied.

**Push shape.** An ordinary entry in `entries[]` with one more field: `cancelsEntryId` (UUID of the target). The row repeats the target exactly: same `section`, `mode`, `partyId`, `dayId`, `amount`; its own new `id` and `createdAt`; no `refersToEntryId`, `correctsDayId` or `dueDate`. Send it after the target, or in the same push. Replaying the same row id is `entriesAlreadyPresent`, not an error.

**Refusals** come back in `rejected[]` as `{id, field, message}`; `field` is the code:
`has_linked_entries` (a return, exchange leg or correction points at it: "cancel the return first"), `already_cancelled`, `cancel_of_cancel`, `cancel_event_leg`, `cancel_other_day`, `cancel_mismatch`, `cancel_target_missing` (not this shop's, or not there yet), `entries_closed_day` (the day is closed: post a correction), `amount` (not whole paise, a 400 before any row).

**`liveEntries` usage for the phone.** Apply it once where `DayInput.entries` is assembled, and to the entries passed to `itemReports`, the party ledger and the day-close view; never inside the figure functions. Show a row targeted by a cancel struck through, and the cancel row itself nowhere in lists. The server does the same in `read/routes.ts` (`dayInputFor`, the credit fold, `/v1/reports`). The party export keeps the raw record (both rows), by design.
