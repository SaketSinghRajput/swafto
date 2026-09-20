<!--
VERBATIM-EQUIVALENT. This is an ADVERSARY PASS, written by the builder wearing the
adversary's hat, and pinned in injections.lock for the same reason the human
instructions are: so that what it said cannot quietly become what the last iteration
remembered of it.

Same convention as 13-adversary-01.md. DO NOT EDIT THE FINDINGS. Corrections go in
BUILD_LOG or a later pass, never inline - a finding that can be edited after the fact
is not a finding.
-->

# 26-audit-02 · the complete audit

**Second full adversary pass. Artifacts only — no BUILD_LOG, no rationales.** Every
finding carries the command that established it. Ranked by cost of being wrong, not by
how interesting it is.

Run at iteration 32, over the whole build rather than the usual slice.

---

## F-A1 · Gate evidence commands do not execute — every one of them

**Cost of being wrong: HIGHEST.** Six gates are marked PASS. A reader who wants to
check one copies its evidence command and runs it. Every such command fails.

```
$ wc -l SPEC-DIGEST.md                         -> No such file or directory
$ grep -c '^## ADR-' TECH-DECISIONS.md         -> No such file or directory
$ grep -cE 'ACTION-REQUIRED...' LEGAL-AUDIT.md -> No such file or directory
```

The iteration-27 layout move relocated every document; the gate table still cites bare
filenames. **Twenty path references across the gate rows are stale.**

**The numbers themselves are still true** — run against the real paths, `SPEC-DIGEST`
is 569 lines and there are 17 ADRs, exactly as recorded:

```
$ wc -l < docs/spec/SPEC-DIGEST.md               -> 569
$ grep -c '^## ADR-' docs/spec/TECH-DECISIONS.md -> 17
```

So this is not a false PASS. It is worse in one specific way: **the gates are correct
and unverifiable**, which is the state §5.14.5 exists to forbid. A claim nobody can
re-run is a claim held on trust.

**Why the mechanism built for this missed it.** `check:verifiers` re-derives five gate
numbers and reports `0 stale`. It re-derives them using *its own* paths, which were
updated during the move. It never executes the command the gate table prints. It
passes §5.1 — it can fail — and does not check the thing a reader would actually do.

---

## F-A2 · Six of eleven benchmark-bearing verifiers are not in `check:all`

**Cost of being wrong: HIGH.** A green chain reads as "the build is measured". It is
not.

```
$ node -e "...compare VERIFIERS' benchmark-bearing commands against check:all..."
  ** vectors-node        npm run test:vectors:node     B1
  ** vectors-divergence  npm run test:vectors:diff     B2
  ** unit                npx vitest run                B10 B11 B37
  ** mutation            npm run mutation              B4 B6
  ** coverage            npm run coverage              B3 B5
  ** audit               npm audit --audit-level=high  B33
```

Some absences are deliberate and correct: `mutation` and `coverage` are slow, and
`unit` is run separately every iteration. **`vectors-divergence` is neither slow nor
deliberate**, and it is the instrument for the one property the dual-runtime design
exists to protect.

**It had silently stopped working.** The iteration-27 move redirected the vector output
into `reports/`, and the diff looks for `reports/vectors-hermes.json`, which nothing
had produced since:

```
$ npm run test:vectors:diff
  missing reports/vectors-hermes.json - run the vectors on both runtimes first
```

B2 is recorded MET. It re-derives correctly once the Hermes step is run by hand:

```
$ npm run test:vectors:hermes -> 63 vectors, no vector threw
$ npm run test:vectors:diff   -> divergence: NONE
```

But nothing in the chain would have told anyone. A Node/Hermes divergence — a figure
rendering differently on the phone than on the server — is exactly the defect this
build spent a gate on, and its guard was unreachable for five iterations.

---

## F-A3 · `skips_section_ck` has no rejection case at all

**Cost of being wrong: MEDIUM.** Fifteen named CHECK constraints exist in the schema.
Fourteen have at least one case aimed at their table and column. One has none.

```
$ node -e "...map each named CONSTRAINT to the reject cases aimed at it..."
  ok  shops_language_ck ... entries_party_ck
  ** skips_section_ck      0 case(s)
```

`section_skips` records that a shopkeeper deliberately marked a section as empty —
which the product distinguishes from never having opened it. An unguarded enum there
means a skip could be recorded against a section that does not exist, and the
day-close list would show a state for a section the sheet does not have.

---

## F-A4 · Five exported engine functions are called by no test

**Cost of being wrong: MEDIUM.** Recorded in full under P-002; repeated here because a
pass that omits a known finding is a pass that has shrunk to what is new.

`fromEpochDay`, `addDays`, `compareIsoDate`, `meanDailyProfit`,
`trailingExpensePressure`. `addDays` and `compareIsoDate` are date arithmetic in a
product whose aging buckets and supplier due dates are money-adjacent.

```
$ npm run coverage -> dates.ts 60-73, 82-88 · intelligence.ts 142-143 · operational.ts 135
```

---

## F-A5 · `check:prose` cannot see two confident claims that disagree

**Cost of being wrong: MEDIUM.** Found at iteration 29 and still open. Its rule is a
*resolved* status beside an *unresolved* one. PROJECTION carried two paragraphs both
labelled COMMITTED naming different screen sets, three iterations apart, and the check
passed throughout.

A contradiction between two assertions of the same KIND is invisible to it. That is a
scoping-axis gap in A12's sense: the check is scoped by *the pairing of a resolved word
with an unresolved word*, and no plant had ever varied along the axis of two same-kind
claims.

---

## F-A6 · `mutation` remains DISPROVEN under §5.16

```
$ npm run responds:verifiers -> x mutation DISPROVEN under §5.16
```

Unchanged and correctly recorded. B4 and B6 remain NOT INSTRUMENTED. Listed so the
pass is complete, not because it is new.

---

## The twelve patterns, every one worked

| # | pattern | worked | result |
|---|---|---|---|
| A1 | is there enough data to tell? | yes | the corpus grew 35 to 69 at P-001; `skips_section_ck` still has none (F-A3) |
| A2 | does the test assert, or merely run? | yes | 18 verifiers re-planted, every one fails as it should |
| A3 | is the evidence re-derivable? | yes | **F-A1** — no gate evidence command executes |
| A4 | is the instrument measuring the subject? | yes | **F-A6** — mutation measures itself |
| A5 | is a status asserted or derived? | yes | 21 findings re-derived from predicates: 19 FIXED, 1 OPEN, 1 WITHDRAWN |
| A6 | is the number current? | yes | two stale coverage figures corrected at P-002 |
| A7 | what happens at the boundary? | yes | the date validator is now leap-aware; `money.ts`'s unreachable branch is gone |
| A8 | does the guard fire on the real store? | yes | append-only four-column sweep, both engines, still green |
| A9 | is the corpus describing only success? | yes | 69 reject cases across the engine, schema and api layers |
| A10 | does the check pass when handed nothing? | yes | `check:prose` and `check:registry` both carry empty-corpus floors since iteration 27 |
| A11 | contents, not metadata | yes | **F-A1 and F-A2**, both found by running the thing rather than reading it |
| A12 | what is the guard scoped BY? | yes | **F-A5** — `check:prose` is scoped by word-pairing and no plant varied along same-kind claims |

**No pattern was skipped as not applicable.** A9 and A10 came back clean, and clean
after a real attempt is a result; clean without one is not.

---

## The composition pass (§5.8)

Decision pairs made since the last pass, checked for interaction rather than
individually:

| pair | interaction | verdict |
|---|---|---|
| layout move × `benchmarks.lock` | the lock hashes content only, so relocation cannot invalidate it | safe, proven at iteration 27 |
| layout move × gate evidence | the evidence cites bare filenames | **F-A1** |
| layout move × vector output paths | the diff's input moved and nothing regenerated it | **F-A2** |
| `check:shadow` × `check-tooling` | different scoping axes — tracked-ness versus directory name | complementary, recorded in REVIEW |
| PLAN × TASKS × DESIGN | three lenses over the same artifacts | they agree today; **nothing enforces that they must** |
| registry × `check:sms` | the SMS copy is generated from `OTP_TTL_SECONDS` | safe, plant verified |

The fifth row is the one worth acting on: the three documents agree today by
construction, and nothing would fail if they stopped.

---

## What this pass did NOT find, said plainly

No defect in the money helpers. No threshold moved. No verifier that could not fail on
its plant. No finding whose predicate had quietly stopped being true. No injection
edited since it was pinned.

Four clean results out of a pass that produced six findings, and each clean one was
established by a command rather than by inspection.
