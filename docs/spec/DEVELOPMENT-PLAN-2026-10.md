# Development plan · October 2026

Written for whoever builds this next, including me. It sequences the 88
findings in `docs/audits/REVIEW-2026-10-22.md` and the new scope from the
co-founder review (`Saket del 10 Oct,26`) into an order that can actually be
executed, and judges each workstream on three axes the owner asked for:

- **Feasibility** — can it be built correctly at all, and what is the risk.
  Where no correct solution exists, this section says so rather than
  proposing a plausible wrong one.
- **Viability** — does it survive contact with a real shop. A feature that
  works and that nobody uses at 11pm with a queue at the counter is not
  viable.
- **Cost-efficiency** — build cost against value, and running cost where it
  touches the AWS bill.

`PLAN.md` and `TASKS.md` are generated from predicates and describe the build
as it was specified. This file is hand-authored and describes what to do about
the state it is actually in. The two will disagree until this plan is executed;
that disagreement is the point.

## The headline, stated plainly

**The application cannot currently complete its own purpose.** This is not a
judgement about polish. Four independently verified defects stack:

| | Defect | Consequence |
|---|---|---|
| `HB-01` | `T1` lists only sections with `count > 0`, and its footer holds just *Close the day* and *Privacy* | On the first morning of any day there are zero rows, therefore **no route to any entry form**. A shopkeeper cannot record the first sale. |
| `W4` | The only `PersistencePort` is in-memory — `store/index.ts:88` says so in its own comment | A kill or a battery death loses the whole day. |
| `W3` | Nothing calls `Host.sync()` outside tests | The outbox never drains. Nothing ever reaches the server. |
| `SEC-01` | The API never sets `swafto.shop_id`, which every RLS policy reads | See below — it breaks production specifically. |

I verified all four directly rather than taking the research agents' word for
it. The citations are in the audit document.

### Why `SEC-01` is the one to fix first

`FORCE ROW LEVEL SECURITY` is in the DDL, so even the table owner is subject to
its own policies. Every policy reads
`current_setting('swafto.shop_id', true)::uuid`. The API never sets that
variable. Unset, `current_setting(..., true)` returns NULL, so
`shop_id = NULL` is NULL, and **no row matches**.

In development this is invisible: `tools/pg-up.mjs` connects as the `postgres`
superuser, and a superuser bypasses RLS even when it is FORCEd. On RDS the
master user is the table *owner*, not a superuser, so it **is** subject to the
policies — and every query returns zero rows.

So the defect is shaped exactly to hide in development and appear on deploy.
It must be fixed before the AWS work, or the first thing the new server does is
serve an empty ledger to a real shopkeeper.

It also means the only tenancy protection in force today is `shopOf()` in
application code (S-11). That guard is tested and sound, but it is one layer
where the design calls for two.

#### The design, and the one thing that makes it awkward

Mechanically the fix is small, now that `SqlClient.reserve` exists: wrap each
shop-scoped repository method in a transaction and open it with
`set_config('swafto.shop_id', $1, true)`. `set_config` rather than
`SET LOCAL`, because `SET LOCAL` cannot take a bind parameter and
interpolating a shop id into SQL would trade a tenancy bug for an injection
one.

**The awkward part is the login path.** `findUserByPhone(phone)` is
cross-shop by nature - it is how the server works out which shop a phone
belongs to, so no shop is known yet. But `users` carries a policy requiring
`swafto.shop_id`, so under RLS that query matches nothing and nobody can sign
in. Any implementation that sets the variable everywhere and stops there
produces a server where login is broken.

The repository already has an idiom for exactly this shape: `swafto.erasure`,
a transaction-local flag that tells the append-only trigger to permit a DELETE
it would otherwise refuse (`postgres.ts`, `purgeShop`). The same move works
here - extend the `users` predicate in `scopedBy` to

```
shop_id = current_setting('swafto.shop_id', true)::uuid
  OR current_setting('swafto.auth', true) = 'on'
```

and have the auth lookup, and only the auth lookup, set `swafto.auth` inside
its own transaction. Every other path keeps the shop predicate, so a read or a
sync still cannot see another shop's users. The flag is transaction-local, so
it cannot leak to the next request on a pooled connection.

**Two facts that make this cheaper than it looks.** `0001_init.*.sql` is
generated from `packages/schema/src/spec.ts` by `tools/emit-sql.mjs` and is
checked by `check:generated`, so the policy change is an edit to the spec plus
`npm run db:emit` - not a hand-written migration. And **nothing is deployed
yet**, so there is no production database to migrate and no `0002` to write.
That stops being true the day the Mumbai server is live, which is the reason
to do this before the deploy rather than after.

**The test this needs.** `packages/schema/test/tenancy.spec.ts` already builds
a non-superuser role that owns the tables, which is what makes `FORCE ROW
LEVEL SECURITY` bite on the owner. Today it drives raw SQL. The missing case
drives `pgRepo` as that role - which is the axis a planted defect has to move
along, and it would cover every future table's repository for free.

## Sequencing principle

**Fix what is broken before adding what was asked for.** The review document
describes a richer product; it assumes a working one. Building Exchange on top
of a store that loses data on a kill produces a larger broken thing.

Four phases. Each is shippable, and each leaves the tree green
(`npm run check:all` + `npx vitest run`).

---

## Phase 0 · Make the product work

Nothing here is new scope. All of it is repairing what is already specified.

| id | Work | Why it is first |
|---|---|---|
| `SEC-01` | `SET LOCAL swafto.shop_id` from `shopOf()` at the start of every request transaction | Blocks deployment entirely |
| `W4` | A real SQLite `PersistencePort` | Without it the day is lost on a kill |
| `W3` | Call `Host.sync()` from the app — on resume, on reconnect, after close | Without it nothing syncs |
| `HB-01` | An unconditional ACT zone on `T1`, plus one way back from every screen | Without it no sale can be recorded |
| `W1` | `Store.skip()` writes a field the engine never reads, so the cash working is wrong | Silent wrong arithmetic |
| `W2` | `ackOutbox` keys the day row on a stable id, dropping a close recorded mid-push | Silent data loss |
| `W5` | Three of eight sections cannot be committed in the assembled app | Dead sections |
| `W6` | `expectedCashBalance` substitutes 0 for a missing opening cash | A guessed number presented as measured |
| `W7` | Rejected outbox rows retry forever, and the comment says otherwise | Unbounded retry |
| `SEC-09` | `upsertParty` has no shop guard on its `ON CONFLICT` branch | Cross-tenant write path |
| `SEC-04` | Counted cash and the discrepancy reason are first-write-wins under COALESCE | A close cannot be corrected |
| `SEC-06` | No date horizon: any day in `0001..9999` can be opened | Garbage days |
| `BE-13` | The BI layer already built (`intelligence.ts`, BI1–BI6) reaches no screen | Value already paid for, not delivered |

**Feasibility — high.** Every item is a localised repair in code that exists,
with tests that exist. `SEC-01` is the only one touching a cross-cutting
concern, and it has one correct implementation: set the variable inside the
same transaction, from the session, never from the request.

**Viability — this phase is the entire viability of the product.** Nothing
later matters if a sale cannot be entered.

**Cost-efficiency — the best in the plan by a wide margin.** Thirteen
localised fixes convert a non-functioning application into a functioning one.
No new subsystem, no new running cost. `W4` (SQLite) is the largest single
piece and it was already anticipated — `store/index.ts:21` names the adapter
that was never written.

---

## Phase 1 · Stop publishing things that are not true

Cheap, legally material, and independent of everything else.

| id | Work |
|---|---|
| `F3` | The notice and the public policy both promise erasure after 24 months of inactivity. **No code erases on inactivity.** `purgeDue` only selects shops with `deletion_requested_at` set. |
| `F2` | The comment claiming new tables join the DPDP export automatically is false — both paths are hand-written literals and they already disagree. **Severity corrected below.** |

#### `F2` as filed is overstated, and the real defect is next to it

The audit says there is personal data being processed today that the s.11
export omits. Verified against the code, that is not true *yet*, and what is
true instead is more interesting.

`section_skips` has a table, an RLS policy, and a line in `purgeShop` — and
**nothing ever writes it**. The API has no method for it, it is not on the
`Repo` port at all, and `OutboxRow.kind` is only `'entry' | 'day'`. The client
does record skips (`session.skipSection`, `StoreState.skippedSections`), and
they never leave the handset.

So the export omits an always-empty table, which omits nothing. **F2 is not a
live DPDP breach.** What it is instead:

- **A dead table.** Schema, policy and purge for something no code populates.
- **D8 never syncs.** The skip decisions are the whole point of D8 — the
  difference between a section a shopkeeper said was empty and one he never
  reached. That distinction exists only on the device, so it is lost with the
  device, and the server cannot reconstruct it. The schema anticipated the
  sync; the sync was never built.
- **A latent breach, armed.** The moment that sync is built the export is
  silently wrong, because nothing reconciles `exportUser`'s hand-written seven
  keys with `purgeShop`'s longer list, and `Repo.exportUser` is typed
  `Promise<unknown>` so the compiler cannot help.

The false comment is corrected in place rather than deleted, because a comment
that promised a guarantee it never provided is worth leaving a scar over. The
structural fix is still the one the audit recommends — derive both paths from
the schema's own table list and add a check that fails when a shop-scoped
table is missing from either — and it should land *with* the skip sync, so the
check goes green on a repository that is actually correct rather than on an
allowlist.
| `F5` `F6` `F7` | Wording: §7 vs §9 on phone capture; not calling a return artefact a credit note; what may be said about a UPI transaction. |

**On `F3`, a conflict worth stating precisely.** The published 24-month
inactivity erasure is *shorter* than the retailer's own statutory duty to keep
books. A promise to delete in 24 months and a duty to retain for longer cannot
both be honoured. The honest form — and the DPDP-compliant one — is: kept while
the account is in use; after long inactivity SWAFTO writes to the shopkeeper,
offers an export, and erases only if there is no reply. The exact period is a
decision for counsel (H9), not for me.

`docs/audits/LEGAL-AUDIT.md:139` says three years where the notice says two.
Two documents in one repository publishing different retention periods is
itself the defect.

**Feasibility — high** for the text, **medium** for the inactivity job, which
needs a stated period and therefore a human decision.
**Viability — not optional.** A published retention statement the software does
not perform is a written misstatement to every reader and to the Board.
**Cost-efficiency — very high.** Mostly text, plus one job shaped exactly like
the existing `purge-due.ts`, plus one check so `F2` cannot recur.

---

## Phase 2 · The review document's new scope

All four items the owner put in V1. Ordered by dependency, hardest truth first.

### 2.1 Retailer-defined business day

The decision is taken (shop sets its own start/end). It supersedes ADR-004.

**Feasibility — the forward path is straightforward; the backward path may have
no correct answer.** Existing entries were assigned to calendar days. A 00:30
entry on 12 October might belong to the 11th's business day or the 12th's, and
**nothing recorded tells you which.** A migration that guesses would silently
move money between days and corrupt closed days that are supposed to be frozen
(D7).

The honest design is therefore a **cutover, not a migration**: store the
boundary rule *per day* at the moment the day is created, leave historical days
as calendar days, and switch forward from a stated date. A day then carries the
rule it was recorded under, and a later change to shop hours cannot
retroactively move a closed day. This is the recommendation; a dedicated
research agent is confirming the blast radius across `dates.ts`, D7 and the
77-vector corpus.

**Viability — high and necessary.** Indian shops trade past midnight. The
calendar boundary is wrong for them, and wrong in a way that breaks two days'
reconciliation at once.

**Cost-efficiency — medium.** The per-day boundary field is cheap. The cost is
in the vector corpus and in every date calculation downstream, and it must not
be rushed, because getting it wrong moves money.

### 2.2 UPI ledger

Zero files, zero columns, zero screens today. `days` has `opening_cash` and
`counted_cash` and no UPI counterpart.

Decision 3 fixes what "actual UPI" means: the sum of receipts the shopkeeper
confirms. That choice makes the ledger **per-day and self-contained** — under
confirm-receipts no UPI opening balance is needed, which is a real
simplification and the reason that decision was the right one.

**Feasibility — high.** It mirrors the cash equation's shape without touching
it. D2 stays true: the UPI equation is a second equation, not an addition to
the first.

**Viability — the open question in the whole plan.** Confirming receipts one by
one scales with transaction count. A shop taking forty UPI payments will not
tick forty boxes at 11pm. The design must degrade: confirm in bulk, or confirm
a total, or let the day close with receipts unconfirmed and say so. A
reconciliation nobody performs is worse than none, because it reports
confidence it has not earned.

**Cost-efficiency — high**, provided the bulk path is built at the same time as
the per-receipt one. Building only the per-receipt path would be cheap and
unused.

### 2.3 Exchange, and Return/Refund

Zero files. Never in the original specification either — the only `exchange`
hits in `docs/spec/source/` mean *data* exchange. This is new domain work.

**Feasibility — medium.** Two real problems. First, Exchange must be one event
with linked components or `P4 Net Sales` double-counts; `EX-2` notes `P4` is a
sum of three `+` terms with **no minus term anywhere**, so a return currently
has nowhere to subtract from. Second, the four settlement states are a state
machine, and D1 is append-only — a state change cannot be an `UPDATE`, so the
state must be a **derived fold** over the event's entries, not a stored column.
`EX-3` confirms there is no entry-to-entry link on either engine today, so the
link itself is new schema.

**Viability — high for Return/Refund, lower for Exchange.** Returns happen in
every shop. Exchange with a price difference is common in some trades and rare
in others; worth asking which trade the first hundred shops are in.

**Cost-efficiency — medium.** This is the largest new build in the plan and the
one most likely to inflate Sales Total if rushed. `EX-7` also warns that adding
four sections pushes the progress ring past its layout budget, so it carries UI
cost beyond the engine.

### 2.4 Typed adjustments

Decision 2: typed from a fixed list, never free-form.

**Feasibility — high**, with one constraint from `SEC-05`: an adjustment cannot
be an ordinary `entries` row without weakening the append-only guarantees that
row type carries. It needs its own shape.

**Viability — high.** The fixed list is what keeps expected-vs-actual
meaningful. `HB-03` is the warning here: the existing discrepancy reason is free
text that one character satisfies, which is what a shopkeeper will type at 11pm.
A typed list is the fix for exactly that behaviour.

**Cost-efficiency — high.** Small, and it protects the integrity of every score
downstream.

### 2.5 Behaviour engine, five output levels, three scores

Partly built already: `intelligence.ts` has BI1–BI6, integer-paise, each gated
on closed-day count. `BE-13` is that none of it reaches a screen.

**Feasibility — high for two of the three scores, and I recommend refusing the
third in V1.** `Cash Confidence` and `Operational Consistency` can each be
defined as published ratios over stored facts, with no arbitrary weight
(`BE-05`, `BE-06`). **`Business Health` cannot** — a scalar composite of
unlike quantities requires weights that nobody has measured, and this
repository's first rule is never to print a number you did not measure. The
review document itself says not to ship the scores until their mathematics is
validated.

**Recommendation, needing the owner's confirmation:** ship the five BI
indicators that already exist plus the two definable ratios, and defer the
scalar `Business Health` until there is data to derive its weights from. This
is a deviation from §14 as written, and it is recorded here rather than decided
quietly.

Two further constraints. `BE-02`: Cash Confidence cannot be computed until the
UPI expected-vs-actual exists, so 2.2 precedes it. `BE-10`: derive-on-read is
affordable for one day and not for a thirty-day trend on a ₹7,000 handset —
which must be solved without moving a benchmark and without storing a total.

**Viability — high, with one caveat.** Level 5 must stay suggestion-shaped. And
size fairness (`BE-08`) is not optional — every metric must be a ratio against
the shop's own baseline, or a ₹5,000/day shop is told it is failing for being
small.

**Cost-efficiency — the highest in Phase 2**, because most of the engine is
already written and paid for. Wiring BI1–BI6 to a screen is a day's work for
most of the document's §13 Level 1–3.

---

## Phase 3 · Ship

### The APK

The native Android project **does not exist** — there is no
`apps/mobile/android/`. So the path is: generate the native project for
RN 0.81.4, pin the versions H14 names (JDK 17, compileSdk 36, targetSdk 36,
buildTools 36.0.0, minSdk 24, NDK 27.1.12297006), create a signing keystore,
then `assembleRelease`.

Toolchain is installed: Temurin JDK 17.0.20.1 and the Android command-line
tools under `C:\Users\user\swafto-toolchain` (no spaces in the path, because
Gradle and the NDK both break on them).

**On the keystore.** It will be generated, and it is the one artefact that
cannot be recovered. Lose it and this app can never be updated on Play again.
It belongs in a password manager the moment it exists, and never in this
repository — `check:secrets` fails on a key in the tree, correctly.

### AWS

`docs/infra/HOSTING.md` and `infra/cloud-init.yaml` are ready and measured at
$46.99/month including GST. **`SEC-01` must be fixed before the first deploy**,
or the server will serve an empty ledger. That is the only ordering constraint
between the two tracks.

---

## What I cannot do, and will not record as done

| id | Blocked on | Why it is not mine |
|---|---|---|
| `H8` | A real ₹7,000 handset | I can build the APK. I cannot watch someone use it in shop daylight. |
| `H13` | A native Odia/Hindi reviewer | The copy renders and fits. Whether it *reads* correctly is not mine to judge, and `CLAUDE.md` says so. |
| `H1` | DLT sender registration | Needs the business entity, PAN and GST. A regulatory process, not a build step. |
| `H6` | A named grievance officer, and a real `grievance@swafto.com` mailbox | A legal obligation naming a person. |
| `H9` | Counsel | The retention period in `F3` and the score exposure in `F8` are legal calls. |

These five are the honest remainder. Everything else in this plan is mine to
execute.

## Open questions for the review document's author

1. §4 lists **"UPI Sale" inside "Cash Received"**. A UPI sale adds no cash to
   the drawer and D2 says so. Treated as a typo; the cash equation is being
   built cash-only. Please confirm.
2. **Sections 8 and 11 are absent** from the document — numbering runs 7, 9 and
   10, 12. Dropped, or misnumbered?
3. §4's **"required transactions completed"** is undefined (`W9`). What makes a
   transaction required? Without an answer a day could become impossible to
   close.
4. Scenario 15, **a business day reopened after closing**, is forbidden by D7
   (`W8`). Is reopening genuinely wanted, or is the intent a dated correction
   entry against a closed day — which is already how D1 works?
5. §14 **`Business Health`** as a single number: see 2.5. Recommend deferring
   the scalar and shipping the indicators.
