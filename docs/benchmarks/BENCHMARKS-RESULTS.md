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
| B3 Engine branch coverage | 100% | **85.71%** - MISSED | `npm run coverage` | iteration 19, unchanged at 26 |
| B5 Backend line coverage | >= 85% | **91.26%** (94 of 103) - MET | `npm run coverage` | iteration 20, re-derived identical at 26 |
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

**Re-stated at iteration 25 (§5.15.2), because the earlier reading was incomplete and
the incompleteness cost a real defect.**

That reading said the gap was rejection and gate-closed arms — the same shape as the
`assertPaise` 0/59 finding, arms that fire when something is WRONG, unreachable
because the corpus describes valid days. True, and only two thirds of the story.

**There is a third shape, and — corrected at iteration 26 — it is worse than the one
described here yesterday.**

Yesterday's entry said the third shape was "the body below an early return, never
executed", and claimed the row reading `money.ts | 97.61% | one stdevMoney guard` had
been pointing at the defect for six iterations. **Both halves are wrong**, and
re-measuring found it:

- The uncovered branch in `money.ts` is **line 221**, `if (rest.length)` in
  `formatPaise`'s Indian grouping. It has nothing to do with `stdevMoney`. The row's
  label was itself mistaken.
- **`money.ts` is 100% lines and 100% statements.** Line 179 — the one the surviving
  mutant lived on — *was executed by the suite all along*, through `intelligence.ts`
  calling `stdevMoney` with real series.

So the third shape is not "never executed". It is **executed and never asserted on**:

1. **rejection arms** — the corpus describes valid days, so invalid ones are unreached;
2. **gate-closed arms** — the "not enough history yet" branches in `intelligence.ts`;
3. **covered but unasserted** — the line runs on every suite run, contributes to 100%
   line coverage, and no test checks what it produced.

**Coverage cannot see shape 3, by construction.** It counts execution, not assertion.
The `stdevMoney` defect sat on a line at 100% coverage. So closing the B3 gap will find
shapes 1 and 2 and **will not find another `stdevMoney`** — only mutation testing, or
deliberate n-variation, reaches shape 3. That is the argument for why B4 having no
trustworthy instrument is a serious gap rather than a bookkeeping one, and why
`mutation:money` exists at all.

It also qualifies injection 20 C.2: reading every remaining uncovered line as a
candidate defect is right, and it is a search of shapes 1 and 2 only. Shape 3 lives in
the *covered* lines, where no coverage figure will ever point.

**This is still a defect surface, not a ledger** — one of twelve survivors was real.
But the surface is larger than the 14.29% gap, not smaller than it.

**Attempts recorded: 1 of 3.** The next attempt comes with `rejects.json`, and carries
a sweep for shape 3 with it: every function with an early return, and whether any test
reaches past every guard with an assertion on the result — not "is the function
tested", but "is the code after the guard tested". Plus, for every aggregate whose
arithmetic depends on how many values it gets, cases at n=0, n=1 **and** n>=2.
`stdevMoney` was invisible at n<=1 by construction, and that is a property of
aggregates rather than a quirk of that one.

---

## NOT INSTRUMENTED · B4 and B6 · the mutation harness reports a false number

**Correcting iteration 20, which recorded these as instrumented with a provisional
reading. They are not instrumented. The reading was not merely imprecise; it was
wrong, and the way it was wrong is the point.**

Stryker reported **all twelve arithmetic mutants in the audited money helpers as
Survived**. Eleven of the twelve are killed by tests that already existed. The
twelfth was a real hole and is now covered. Not one of the twelve survives today.

Two independent disproofs, either sufficient on its own:

1. **The dry run loads 275 of 309 tests — and the shortfall is NOT the cause.**
   The 170 it does see already contain the killing tests. Running a planted mutant
   against exactly that 170-set produces failures. So the missing 133 do not explain
   a single one of the twelve.
2. **With `coverageAnalysis: all` it says one thing and does another.** It logs
   `Ran all tests for this mutant` for every mutant and then reports
   `Ran 8.96 tests per mutant on average` — 7.76 on re-run — still scoring 9.66%.
3. **Added at iteration 25, and the strongest of the three.** Re-run on a clean tree
   after four tests were written specifically to kill the `stdevMoney` survivor,
   `money.ts` re-derives **identically: 9.66%, 145 mutants, 14 killed, 131 survived**,
   and the survivor set is unchanged mutant for mutant — line 179,
   `acc * values.length`, still listed as Survived. `mutation:money` shows that exact
   mutant dying to two tests. **A harness whose score does not move by a single mutant
   after the suite gains tests that provably kill one of its reported survivors is not
   running those tests against that mutant.** No test count is needed to see it.

A harness that selects a handful of tests per mutant while claiming to run them all
is not a weak instrument, it is a broken one, and 9.66% is a statement about Stryker.

**No B4 or B6 figure may be claimed from it.** Attempts recorded: 0 of 3 — a reading
from a disproven instrument is not an attempt.

### What replaced it, and what it does NOT replace

`npm run mutation:money` (`tools/check-money-mutants.mjs`) plants each of the twelve
mutants for real, runs the suite, and requires a failure that was not already
failing. It is proven by `npm run mutation:money:prove`, which plants a no-op
mutation and requires the check to report a survivor.

**It is not an instrument for B4 or B6.** It adjudicates twelve named mutants on one
file and produces no score.

### Why extending it to the rest of the engine is the strongest remaining argument

Recorded at iteration 27 per injection 21, so the reasoning survives whether or not
the work ever happens.

Shape 3 — **executed and never asserted on** — is invisible to coverage by
construction, and the `stdevMoney` defect proved it: that line sat at 100% coverage
while the mutant survived. So of the three shapes in the B3 gap, **mutation is the
only instrument that reaches shape 3 at all**, and `mutation:money` is the only
mutation instrument in this repository that passes §5.16.

Today it covers one file, `money.ts`. The rest of the engine — `dates.ts` at 66.66%
branch, `intelligence.ts` at 67.50%, `operational.ts` at 89.47%, `primary.ts` — has no
shape-3 instrument of any kind. `dates.ts` is the one that would worry me: civil
calendar arithmetic, an aggregate-shaped surface, and the lowest coverage in the
engine.

**It is explicitly scheduled AFTER the screens, or not at all.** The ceiling is 40 and
the committed screen set has no slack. This is recorded as the best available use of
spare capacity, not as a claim on capacity that does not exist. If iteration 40
arrives with the screens done and time left, this is what to spend it on; if it does
not, the handover report says plainly that three engine files have no shape-3
instrument. B4 asks for a mutation score over the whole engine at a
90% threshold; that threshold is frozen, unmet and unmeasured. Injection 18 A.2 is
explicit that this bar is *additional* to B4, not instead of it.

### THE SURVIVOR SET, NOT THE SCORE (A.1)

Baseline recorded before any fix, from `reports/mutation/baseline-survivors.json`:
131 survivors, of which 12 arithmetic operators inside the audited helpers.

Adjudicated individually (A.2), each planted and judged against the suite. The number
is the count of tests that fail under the mutant and do not fail without it:

| # | Mutant | Verdict | Killed by |
|---|---|---|---|
| 1 | `ratio`: `* 10000 / denom` → `* denom` | killed | 8 |
| 2 | `ratio`: `* 10000` → `/ 10000` | killed | 8 |
| 3 | `divideMoney`: `amount / divisor` → `*` | killed | 3 |
| 4 | `medianMoney`: `sort(a - b)` → `a + b` | killed | 2 |
| 5 | `medianMoney`: `s[mid - 1]` → `s[mid + 1]` | killed | 2 |
| 6 | `medianMoney`: `length >> 1` → `<< 1` | killed | 19 |
| 7 | `meanMoney`: `sum / length` → `*` | killed | 5 |
| 8 | `stdevMoney`: `v - mean` → `v + mean` | killed | 5 |
| 9 | `stdevMoney`: `d * d` → `d / d` | killed | 14 |
| 10 | **`stdevMoney`: `sqrt(acc / length)` → `* length`** | **SURVIVED, now killed** | **2** |
| 11 | `formatPaise`: `floor(abs / 100)` → `* 100` | killed | 6 |
| 12 | `formatPaise`: `abs % 100` → `* 100` | killed | 6 |

**Zero survivors. Zero equivalence claims.** Under A.3 an equivalence argument must be
written into the mutant itself; none was needed, because none is equivalent.

### Number 10 was real, and A.5 applied

`stdevMoney` had exactly one test. It passed `[]` and `[500]`, and **both return early**
— `[]` gives null at line 171 and a single value gives 0 at line 172. The division on
line 179 had never been executed by a test that checks its result.

It is not an equivalent mutant, and the distinction matters. For one value `n = 1`, so
`acc / n` and `acc * n` are genuinely indistinguishable — which is precisely why the
one existing test could not tell them apart. From two values up they diverge. So this
was an uncovered line, not an indistinguishable one, and A.3 says what that needs: a
test.

Four were added, pinning the population divisor (`n`, not `n − 1`), the rounding, the
zero-spread case and shift-invariance. Per A.5 this took priority over Form A and was
fixed before any screen renders a figure through these helpers.

### The §5.9 reading (A.4)

Detection counts range from 2 to 19. On the first full adjudication three mutants were
killed by exactly one test each — as fragile as a survivor, by §5.9. Two were fixed by
the `stdevMoney` tests above. The third, `medianMoney`'s comparator, got two tests that
pin numeric ordering rather than one arrangement of it: JS's default sort is
lexicographic, and negative values separate ascending order from a comparator that
returns a sum. **The minimum detection count is now 2.**

### Two defects in the new harness, both caught by the no-op plant

Recorded because they are the argument for §5.12 and would each have produced a
confident, wholly false result:

1. **Twelve kills from twelve runs that never happened.** `execFileSync` cannot spawn
   a `.cmd` without a shell (blocked since CVE-2024-27980) and fails with *empty*
   stdout, which is indistinguishable from a suite that ran and printed nothing. A
   fallback then returned `1`, and `1` is exactly the value §5.9 reads as "killed by
   one test, nearly as fragile as a survivor". It reported that for all twelve,
   unanimously. `shell: true` would have fixed it and is forbidden by check-tooling;
   resolving vitest's entry and handing it to node needs no shell.
2. **Kills credited to a database that was not listening.** Raw failure counts let
   flaky Postgres suites stand in for real detections — the no-op plant scored 8
   phantom kills. Fixed by subtracting an unmutated baseline by test name, and by
   excluding the two DB-bound specs under a guard that fails if either ever
   references the module under mutation.

### A third finding, outside the mutation work

`.stryker-tmp/sandbox-2dFJHU/` — a full copy of the repository left behind by an
earlier Stryker run — was untracked, un-ignored, and **discovered by vitest**. Every
test ran twice (`606` reported for a 303-test suite), and the two copies of
`postgres.spec.ts` raced each other against the same database. Removed and added to
`.gitignore`. With it gone the suite is **11 files, 309 tests, all passing**.

**Corrected at iteration 25.** That paragraph originally ended "…which is the
intermittent G4 failure seen since iteration 17." That was wrong, and it was my claim
rather than anyone else's. The sandbox existed for roughly fifteen minutes inside
iteration 24. The recorded vitest counts at iterations 19, 20, 21 and 22 all read
`303 passed`, which is the correct undoubled figure — had a sandbox been present at
any of them, each would have read about 606. A fifteen-minute-old directory cannot
explain a failure seen at iteration 17. The A.1 sweep in BUILD_LOG iteration 25 has
the full enumeration.

---

<!-- PARTITION:START - generated by tools/check-verifiers.mjs --update-md -->

## The partition (§5.13 A.1)

**14 of 40 instrumented. 2 overdue. 24 blocked.**

OVERDUE means the subject already EXISTS and nothing measures it - a present
failure under §5.13, not a future task. BLOCKED names the artifact whose
existence unblocks it, and the gate that artifact arrives at.

| benchmark | state | instrument | note |
|---|---|---|---|
| B1 | instrumented | `vectors-node` | - |
| B2 | instrumented | `vectors-divergence` | - |
| B3 | instrumented | `coverage` | - |
| B4 | **OVERDUE** | - | NOT INSTRUMENTED. Stryker reports a number that is false: it called all twelve money-helper arithmetic mutants Survived, and mutation:money proves every one of them dies. No B4 figure may be claimed from it. mutation:money is NOT a substitute - it adjudicates twelve named mutants on one file and produces no score. |
| B5 | instrumented | `coverage` | The backend is small and growing, so 91.26% today is over a small denominator. The instrument exists and moves with the subject, which is what §5.13 asks. |
| B6 | **OVERDUE** | - | NOT INSTRUMENTED. Same harness as B4 and the same disproof. The backend has no equivalent of mutation:money, so the money helpers are the only surface in this build with a trustworthy mutation verdict. |
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
