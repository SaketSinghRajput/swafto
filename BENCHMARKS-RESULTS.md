# BENCHMARKS-RESULTS

`BENCHMARKS.md` has referred to this file since it was frozen at iteration 6:

> A benchmark that cannot be met is recorded as `BENCHMARK-MISSED` in
> `BENCHMARKS-RESULTS.md` with its measured value and three recorded attempts.

**It did not exist until iteration 19.** That is the same family as the three
claimed-but-absent commands: an artifact cited as part of the process, believed to be
there, never created. Found by the §5.12 sweep.

Every number here was produced by running the command beside it. **No threshold in
`BENCHMARKS.md` has been changed, and none will be.** A missed benchmark honestly
reported is a result.

---

## Measured

| benchmark | threshold | measured | command | when |
|---|---|---|---|---|
| B1 Golden vectors | >= 70, 100% pass | **63, 100% pass** - MISSED on count | `npm run test:vectors:node` | iteration 19 |
| B2 Node vs Hermes divergence | exactly 0 | **0** - MET | `npm run test:vectors:diff` | iteration 19 |
| B3 Engine branch coverage | 100% | **85.71%** - MISSED | `npm run coverage` | iteration 19 |
| B12 Money float-arithmetic lint | 0 violations | **0** across 45 files - MET | `npm run check:money` | iteration 19 |
| B33 npm audit high/critical | 0 | **0** - MET | `npm audit --audit-level=high` | iteration 19 |
| B40 Stubs, TODOs in shipped paths | 0 | **0** - MET | `npm run check:governance` | iteration 19 |

Full coverage reading: statements 91.72%, branches 85.71%, functions 90.32%, lines
92.18%, over `packages/formula-engine/src/**`.

---

## BENCHMARK-MISSED · B1 · 63 vectors against 70

**Measured: 63. Threshold: 70. Short by 7.**

Not a defect and not a surprise - injection 08 section D named it at 51 and said
exactly how to close it: *"Add them as you build G7 and G8, where the scenarios are in
front of you, and add each one because it encodes a case you had to think about -
never to raise the count."*

Progress since: 51 -> 59 (the DC-002 grouping vectors) -> 63 (adversary pass F-03,
F-04, F-09: year boundary, leap day, imported source, expense labels). Every one was
added because a question came up, not to move the number.

**Why it is not being closed by writing seven vectors today.** That is precisely the
failure §5.1 exists to prevent, and section D says so in as many words. The uncovered
ground D names is sync-adjacent and correction-adjacent - entries arriving out of
order, an entry arriving for a day that closed after it was created, two corrections
against one closed day - and none of those scenarios exists until G7 and G8. Vectors
written now would encode a guess at the shape of code that has not been written.

**Attempts recorded: 1 of 3.** Next attempt at G7.

---

## BENCHMARK-MISSED · B3 · 85.71% branch coverage against 100%

**Measured: 85.71% branch (144 of 168). Threshold: 100%.**

**This benchmark had never been measured at all.** There was no coverage tooling, no
`coverage` script, and no gate ever cited one. It is one of the 30 of 40 benchmarks
that the §5.12 sweep found had no instrument.

**The first reading was wrong, and how it was wrong is the point.** It came out at
**57.73%**, because the 63 golden vectors - the engine's primary exercise - ran in a
separate Node process the coverage instrument could not see. Putting them under the
runner moved the same unchanged engine to **85.71%**. An instrument that cannot see
the work is not measuring the thing it names, and 28 points of the apparent shortfall
were the instrument, not the engine.

**Where the remaining gap is**, by file:

| file | branch | what is uncovered |
|---|---|---|
| `dates.ts` | 66.66% | `fromEpochDay` and `addDays` error paths; civil-calendar arms no vector reaches |
| `intelligence.ts` | 67.50% | BI gate-closed branches - the "not enough history yet" arms |
| `operational.ts` | 89.47% | one aging-bucket boundary |
| `money.ts` | 97.61% | one `stdevMoney` guard |
| `primary.ts`, `types.ts`, `index.ts` | 100% | - |

**Reading this honestly:** the uncovered branches are concentrated in rejection and
gate-closed paths. That is the same shape as the `assertPaise` 0/59 finding - the arms
that fire when something is WRONG are the ones the corpus cannot reach, because the
corpus describes valid days. The fix is the rejection corpus and gate-boundary
vectors, not more vectors of the shape we already have.

**Attempts recorded: 1 of 3.** Next attempt when the rejection corpus grows at G7/G8,
which targets exactly these arms.

---

## Benchmarks with no instrument

30 of 40. Each is listed with the gate it is owed at in `tools/check-verifiers.mjs`,
and `npm run check:verifiers` prints the current count on every run.

**A benchmark with no instrument cannot be claimed met.** Two of them - B13 and B39,
both traceability - *lost* their instrument when `check:traceability` was removed at
iteration 15 as a script naming a file that did not exist. That must be rebuilt before
G19 can be claimed.
