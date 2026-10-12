# Contributing

This repository has conventions that look like bugs if you do not know them.
Reading this page first will save you an afternoon.

## Setup

```bash
npm ci                 # Node 24 - see .nvmrc; engines pins >=24 <25
node tools/pg-up.mjs   # a throwaway Postgres; some suites skip cleanly without one
npx vitest run         # 36 files
npm run check:all      # 25 checks
```

The Android app additionally needs JDK 17 and the SDK versions in
`docs/handover/HUMAN-ACTIONS.md` section H14. Those are read from React
Native's own template, not from its setup page, which disagrees with it.

## Five rules, and why each exists

**1. Never tick a checkbox by hand.** Every box in `TASKS.md` is rendered
from a predicate evaluated against the repository. A hand-ticked box is a
claim no predicate supports, and `check:tasks` catches it. If a task is
genuinely done and its box is empty, the predicate is wrong - fix the
predicate.

**2. Never move a threshold to make a benchmark pass.** `BENCHMARKS.md` is
SHA-locked and the lock is verified on every run. A missed benchmark
honestly reported is a result; a met one achieved by moving the line is a
lie. A *scope* miss is a decision, a *performance* miss is a failure, and
they are never merged.

**3. Edit the generator, not the generated file.** `PLAN.md`, `TASKS.md`,
`DESIGN.md`, `README.md`, `FINDINGS.md`, `VERIFIERS.md`, `LICENCES.md`,
`DATA-SAFETY.md` and `BENCHMARKS-RESULTS.md` are written by tools in
`tools/`. `check:generated` regenerates each and fails on any difference, so
a hand edit is both reverted and reported.

**4. Run `npm run check:all` before every commit.** Twenty-five checks. They
have caught their own author far more often than anything else - a float in
a money path, a private key in the tree, a document claiming work that did
not exist.

**5. If you change a check, run `npm run prove:verifiers`.** It plants a real
defect in each one and requires a real failure. A check that has quietly
stopped checking is worse than no check, because everything behind it is
presumed safe. That harness has found four defects in itself so far.

## Money, and why a bare `+` is banned

Money is integer paise everywhere, and arithmetic on it goes through the
audited helpers in `packages/formula-engine/src/money.ts`: `add`,
`subtract`, `sum`, `divideMoney`. `check:money` fails on a bare `+`, `-` or
`Number()` applied to a money value, in source *and* in tests. It is not
pedantry - a float wrong in the fourth decimal is invisible until it is a
shopkeeper's takings.

## Before opening a pull request

- `npm run check:all` passes
- `npx vitest run` passes
- new logic has a test that fails without it; if you cannot make it fail, you
  have not tested it
- if you touched a guard, `docs/governance/REVIEW.md` records what that guard
  is *scoped by* - make sure a planted defect still moves along that axis

## Deliberate, not oversights

- **No inference in data entry.** The app never predicts, autocompletes or
  guesses a figure. A number it invented is a number nobody typed.
- **No stored totals.** Everything is derived on read. A cached total is a
  second source of truth, and the first time it disagrees with the entries a
  shopkeeper is looking at a figure nobody can explain.
- **The Odia and Hindi copy is a draft.** It renders and it fits; whether it
  reads correctly needs a native reviewer (H13). Do not mark it reviewed.
