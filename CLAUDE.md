# CLAUDE.md

Rules for working in this repository. Every one of these exists because
breaking it has already cost something. `CONTRIBUTING.md` explains the five
main ones at length; this file is the short form plus the parts that are not
in `CONTRIBUTING.md`.

## What this is

SWAFTO / Retail Desk — an offline-first daily cash-and-credit closing app for
small Indian retail shops. React Native client, Fastify API, Postgres,
ap-south-1. Odia / Hindi / English. Target handset is a ₹7,000 Android phone.

Setup: `npm ci` (Node 24, see `.nvmrc`) · `node tools/pg-up.mjs` ·
`npx vitest run` · `npm run check:all`.

## Never

- **Never weaken a test or a check to make it pass.** Not by deleting an
  assertion, not by loosening a matcher, not by adding an allowlist entry
  without a written reason.
- **Never move a threshold.** `BENCHMARKS.md` is SHA-locked and verified on
  every run. A missed benchmark honestly reported is a result; a met one
  achieved by moving the line is a lie. A *scope* miss is a decision, a
  *performance* miss is a failure, and they are never merged.
- **Never print a number you did not measure.** Not in a document, not in a
  commit message, not in a reply. If it was estimated, say so and say by whom.
- **Never tick a checkbox by hand.** Every box in `TASKS.md` is rendered from
  a predicate. If a task is done and its box is empty, the predicate is wrong
  — fix the predicate.
- **Never invent a fact about Indian law.** Research it and cite it, or state
  the uncertainty and take the conservative reading.
- **Never edit a generated file.** Edit its generator. `PLAN.md`, `TASKS.md`,
  `DESIGN.md`, `README.md`, `FINDINGS.md`, `VERIFIERS.md`, `LICENCES.md`,
  `DATA-SAFETY.md` and `BENCHMARKS-RESULTS.md` are written by tools in
  `tools/`; `check:generated` regenerates each and fails on any difference.
- **Never edit `docs/spec/source/`.** That is the original specification as
  given. Editing it is editing the evidence.
- **Never rewrite `docs/governance/BUILD_LOG.md`.** It is append-only history.
- **Never put a secret in the tree.** `check:secrets` fails on a private key,
  a provider token, or a database password. It has already caught a real one.

## Money

Integer paise everywhere. Arithmetic goes through the audited helpers in
`packages/formula-engine/src/money.ts`: `add`, `subtract`, `sum`,
`divideMoney` (ADR-003). `check:money` fails on a bare `+`, `-` or `Number()`
applied to a money value, **in source and in tests**. A float wrong in the
fourth decimal is invisible until it is a shopkeeper's takings.

## The data model, and why it is shaped this way

- **D1 · Append-only.** An entry is never updated or deleted. A correction is
  a new dated entry referencing the original.
- **D7 · A closed day is frozen.** The database refuses a write to it by
  trigger, on both engines.
- **D2 · Only `cash` mode touches the cash equation.** UPI, Other, Udhar and
  Shop stock are recorded but do not move the drawer. A UPI sale puts no cash
  in the till.
- **D3 · A withdrawal sits outside profit.** An owner taking ₹5,000 out is not
  ₹5,000 of profit.
- **No stored totals.** Everything is derived on read. A cached total is a
  second source of truth, and the first time it disagrees with the entries a
  shopkeeper is looking at a figure nobody can explain.
- **`shopOf()` is the whole of tenancy (S-11).** The shop comes from the
  session, never from the request — not from the query string, body, path or
  headers.
- **The formula engine is clock-free (ADR-012).** No `new Date()`, no
  `Date.now()`. "Today" is always passed in. That is what makes the vector
  corpus reproducible on any machine in any timezone.

## No inference in data entry

The app never predicts, autocompletes, guesses or voice-fills a figure the
user is entering. A number it invented is a number nobody typed. No camera,
no OCR, no AI in the entry path.

This does **not** forbid derived output. An observation computed from recorded
facts ("credit outstanding has risen five business days running") is a
different thing from guessing an input, and is allowed — stated as something
to review, never as an instruction to act. The user keeps decision authority.

## Before every commit

1. `npm run check:all` passes (25 checks)
2. `npx vitest run` passes
3. New logic has a test that fails without it. If you cannot make it fail, you
   have not tested it.
4. **If you changed a check, run `npm run prove:verifiers`.** It plants a real
   defect in each verifier and requires a real failure. A check that has
   quietly stopped checking is worse than no check, because everything behind
   it is presumed safe. That harness has found four defects in itself.
5. If you touched a guard, `docs/governance/REVIEW.md` records what that guard
   is *scoped by* — make sure a planted defect still moves along that axis.

## Law

DPDP Act 2023 and the 2025 Rules apply: itemised notice, specific consent,
withdrawal as easy as giving, access and erasure, a named grievance officer,
and Rule 7 breach timings (Data Principals without delay; the Board without
delay plus a detailed report within 72 hours).

Google Play requires a reachable privacy-policy URL and a web account-deletion
page before it will publish. Both are served from the API origin —
`apps/web/legal/` and `apps/web/delete-account/` — because the API sets no
`Access-Control-Allow-Origin` by design.

## Open, and not mine to close

- **The Odia and Hindi copy is a draft.** It renders and it fits; whether it
  reads correctly needs a native reviewer (H13). Do not mark it reviewed.
- Human-blocked items are in `docs/handover/HUMAN-ACTIONS.md`. Do not record
  one as done on inference.

## Decisions taken 2026-10-22 (co-founder review, `Saket del 10 Oct,26`)

These supersede earlier rulings where they conflict. Each is a decision, not a
guess, and the ones that break existing work say so.

1. **A business day is retailer-defined** — the shop sets its own start and end
   time. This **supersedes ADR-004's** client-assigned calendar date and is a
   breaking change to `dates.ts`, D7 and the 77-vector corpus. Every existing
   `day_id` needs a migration. Reason: Indian shops routinely trade past
   midnight, and a calendar boundary puts a 00:30 sale on the wrong day,
   breaking the reconciliation of two days at once.
2. **Adjustments are typed, from a fixed list** — never free-form. A free-form
   adjustment can absorb any discrepancy, which would make expected-vs-actual
   and the Cash Confidence score meaningless.
3. **The actual UPI figure is the sum of UPI receipts the shopkeeper
   confirms** — not a balance read from a bank app. A bank balance includes
   personal money, so "UPI difference is always 0" is unachievable against it.
4. **In V1 scope:** Exchange as one linked business event; Return/Refund with
   four settlement states; the Behaviour Engine and its five output levels;
   and the three scores (Business Health, Cash Confidence, Operational
   Consistency). The scores must have their mathematics defined and validated
   in the docs before any production use — the review document itself sets
   that condition, and `BENCHMARKS.md` is frozen.

### Known defect in the review document

§4 of that document lists **"UPI Sale" inside "Cash Received"** in the
expected-cash formula. That is wrong: a UPI sale adds no cash to the drawer,
and D2 says so. Built literally, expected cash would be wrong by the day's UPI
sales every single day and the till could never reconcile. Implement cash
correctly; the discrepancy is flagged for the document's author to confirm.
Do not "fix" the code to match the document here.

Sections 8 and 11 are absent from that document (numbering runs 7, 9 and
10, 12). Whether they were dropped or simply misnumbered is unresolved.
