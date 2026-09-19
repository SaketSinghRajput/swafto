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

## PROVISIONAL · B4 and B6 · the mutation harness sees 170 of 303 tests

**Instrument built at iteration 20. Its first reading is 9.66% on `money.ts`, and
that number is NOT a measurement of B4.**

Stryker's dry run reports `Ran 170 tests`. The suite has 303. The 170 are the five
formula-engine and rejects specs; it never sees `sms-templates` (84),
`append-only` (20), `rate-limit` (15), `closed-day-guard` (7), `postgres` (6) or the
lint rule (1). Every mutant is therefore being judged by roughly half the suite, and
the half that is missing includes every database guard.

**This is the B3 lesson arriving exactly on schedule**, which is the argument for
§5.13 in one line: a benchmark measured for the first time tells you about your
harness. B3 read 57.73% and moved 28 points on an unchanged engine. B4 reads 9.66%
and the harness is demonstrably incomplete, so the number is recorded here as
PROVISIONAL and is not claimed against the 90% threshold.

**Recorded anyway, per A.4**, because a bad number is worth more than a missing one -
and this one already says something specific even while provisional: of 145 mutants
on `money.ts`, 12 arithmetic-operator survivors sit in the audited money helpers. If
that survives the harness fix, it is a real finding about the money path and not
about Stryker.

**Next: fix the harness, then re-measure. Do not report a mutation score before
then.** Attempts recorded: 0 of 3 - a provisional reading is not an attempt.

---

<!-- PARTITION:START - generated by tools/check-verifiers.mjs --update-md -->

## The partition (§5.13 A.1)

**16 of 40 instrumented. 0 overdue. 24 blocked.**

OVERDUE means the subject already EXISTS and nothing measures it - a present
failure under §5.13, not a future task. BLOCKED names the artifact whose
existence unblocks it, and the gate that artifact arrives at.

| benchmark | state | instrument | note |
|---|---|---|---|
| B1 | instrumented | `vectors-node` | - |
| B2 | instrumented | `vectors-divergence` | - |
| B3 | instrumented | `coverage` | - |
| B4 | instrumented | `mutation` | The instrument exists and runs. Its first reading is NOT a valid measurement: the harness sees 170 of 303 tests. Fixing that comes before any number is claimed. |
| B5 | instrumented | `coverage` | The backend is small and growing, so 91.26% today is over a small denominator. The instrument exists and moves with the subject, which is what §5.13 asks. |
| B6 | instrumented | `mutation` | Same instrument and same harness shortfall as B4. |
| B7 | blocked | - | needs **any React Native app code**, at G10 |
| B8 | blocked | - | needs **the sync API**, at G7 |
| B9 | blocked | - | needs **the app, to run 30 days against**, at G17 |
| B10 | instrumented | `unit` | - |
| B11 | instrumented | `unit` | - |
| B12 | instrumented | `money-lint` | - |
| B13 | instrumented | `traceability` | - |
| B14 | blocked | - | needs **a built app to cold-start**, at G18 |
| B15 | blocked | - | needs **a built app to cold-start**, at G18 |
| B16 | blocked | - | needs **the Today screen**, at G18 |
| B17 | blocked | - | needs **the keypad**, at G18 |
| B18 | blocked | - | needs **the entry forms**, at G18 |
| B19 | blocked | - | needs **the day-close screen**, at G18 |
| B20 | blocked | - | needs **the reports screen**, at G18 |
| B21 | blocked | - | needs **a device database with 10,000 entries**, at G18 |
| B22 | blocked | - | needs **a built app to profile**, at G18 |
| B23 | blocked | - | needs **the Today screen**, at G18 |
| B24 | instrumented | `font` | The FONT share of the budget is measured (1.87%). The APK itself does not exist, so the benchmark as a whole is not met - only bounded from below. |
| B25 | blocked | - | needs **the outbox and a 2G network profile**, at G17 |
| B26 | blocked | - | needs **the design tokens**, at G10 |
| B27 | blocked | - | needs **the design tokens**, at G10 |
| B28 | blocked | - | needs **rendered components**, at G11 |
| B29 | blocked | - | needs **the typography scale**, at G10 |
| B30 | blocked | - | needs **the i18n bundles**, at G16 |
| B31 | blocked | - | needs **rendered screens in three languages**, at G16 |
| B32 | blocked | - | needs **money fields on screens**, at G12 |
| B33 | instrumented | `audit` | - |
| B34 | blocked | - | needs **a container image**, at G9 |
| B35 | instrumented | `secrets` | The REPO half is measured and clean over 102 files. The APK half is blocked on a build (G9), and gitleaks joins this scanner there rather than replacing it. |
| B36 | blocked | - | needs **the first client log line - NOT the server**, at due at A.3 item 1, the first screen |
| B37 | instrumented | `unit` | - |
| B38 | **MISSED - SCOPE** | - | Requires 27 of 27. The ceiling of 40 funds about 11 committed and 16 at best (PROJECTION.md), so this cannot be met. A DECISION, not a failure - the deferred set is in DEFERRED.md and the threshold is untouched. |
| B39 | **MISSED - SCOPE** | `traceability` | Measured: 0 of 26, and the instrument reports WHICH column holds each row. The api column is blocked by the deferred server (AD-018) and the screen column by the deferred screens, so this cannot be met inside the ceiling. A DECISION, not a failure. |
| B40 | instrumented | `governance` | - |

<!-- PARTITION:END -->
