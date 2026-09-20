# BUILD STATE

Updated: 2026-09-19 · **Iteration: derived, not typed.**
`npm run check:verifiers` prints it from the BUILD_LOG headings, which are appended by
the work itself. This line said "Iteration: 7" until iteration 22 - a hand-written
number nobody updated, which is §5.14 in miniature in the file that tracks §5.14.

Config: `TARGET_STACK=react-native` · `BACKEND_LANGUAGE=typescript` ·
`CLOUD=AWS ap-south-1` · `MONEY=integer paise` · Node v24.15.0 · npm 11.12.1

## Gate table

| Gate | Title | Status | Evidence |
|------|-------|--------|----------|
| G0 | Repo, state ledger, spec extraction | **PASS** | `wc -l docs/spec/SPEC-DIGEST.md` -> **569** lines against a 200 threshold. Recorded as 526 until iteration 20; the file grew and the number was never re-derived (D.3). Output in docs/governance/BUILD_LOG.md. |
| G1 | Technology research - ADRs | **PASS** | `grep -c '^## ADR-' docs/spec/TECH-DECISIONS.md` -> **18** against a minimum of 8. Recorded as 12 until iteration 20 (D.3). |
| G2 | Legal audit | **PASS**, evidence corrected at iteration 19 | `grep -cE 'ACTION-REQUIRED or resolved autonomously' docs/audits/LEGAL-AUDIT.md` -> **25** (40 until iteration 38, when L-21 and L-22 were built; 38 until iteration 39, when L-01 and L-02 stopped being ACTION-REQUIRED because the consent screen X0 exists and the consent endpoints answer it; 35 once the web deletion page L-13 was built; 33 once L-11 and L-14 were established as NOT APPLICABLE IN V1 - no push integration exists and the notification permission is never requested, with `check:push` failing the build the day either changes; 32 once the L-08 breach runbook was written; 30 once the privacy policy, the terms and the generated Data Safety declarations existed - L-12, L-17, L-18 and L-24, four rows that had been standing on text nobody had written, recorded as finding V-12; 28 once the licence checker learned to audit the bundled fonts, which no package manifest mentions - L-19, and the IBM Plex row that had no subject because AD-016 ships Anek Odia alone; 27 once per-party export AND redaction existed on both repositories - L-04, whose screens remain deferred; 26 once the licence scan learned to sweep for data processors as well as licences - L-09, which has no subject today and a tripwire if that changes; 25 once every export carried the GST disclaimer rather than one of the two - L-15). The command recorded here previously escaped its alternation as `\|` inside `grep -E`, where that means a LITERAL pipe - it matches nothing, returns 0 and exits 1, and could never have produced the 52 printed beside it. See V-1. 26 items mirrored into docs/spec/TRACEABILITY.md; 7 resolved autonomously. |
| G3 | Security audit / STRIDE | **PASS**, evidence corrected at iteration 19 | `npm audit --audit-level=high` -> **found 0 vulnerabilities**. STRIDE THREAT rows re-counted: **28**. The 87 recorded here counted EVERY table row in the file - trust boundaries, the register, the rate-limit table - and labelled them STRIDE. Right number, wrong noun. See V-2. 23 items mirrored into docs/spec/TRACEABILITY.md |
| G4 | Schema + migrations, SQLite & Postgres | **PASS**, REOPENED and re-earned at iteration 19 | `npx vitest run packages/schema` -> **63 passed, 0 skipped** on BOTH engines. §5.12.4 reopened it: the append-only claim had only ever been tested by updating `amount`, so narrowing the trigger to `BEFORE UPDATE OF amount` left the suite green while every other column of a ledger row became mutable on SQLite - the authoritative store. Now swept across four unconstrained columns on both engines, and that planted narrowing fails. See V-4 |
| G5 | **Formula Engine + vectors.json** | **PASS**, count refreshed at iteration 36 | **77 vectors** (gate minimum 30; B1 asks 70 - now MET, recorded in docs/benchmarks/BENCHMARKS-RESULTS.md). Node: `ALL PASS`. Hermes 0.12 real VM: `no vector threw`. Diff: `divergence: NONE`. Both negative-tested. The vectors now also run INSIDE vitest, so coverage can see them - which moved the first honest B3 reading from 57.73% to 85.71%. |
| G6 | Auth service (phone + OTP) | TODO | needs integration tests |
| G7 | Sync API (idempotent) | TODO | needs 3x replay of 200-entry batch, byte-identical |
| G8 | Read API (shared engine) | TODO | needs canonical day through API == vectors.json |
| G9 | Pipeline + Terraform | TODO | LocalStack plan + docker-compose smoke + a REAL locally-executed rollback |
| G10 | Design tokens, Comfort/Focus | TODO | needs contrast test, all pairs >= 4.5:1, no white-on-marigold |
| G11 | Four form archetypes + keypad rule | TODO | needs render test: keypad absent outside the 7 screens and wherever BottomNav renders |
| G12 | The day close (9 sections, 3 states) | TODO | needs e2e nine-section close == vectors.json |
| G13 | The ending (4 screens) | TODO | needs screenshots + withdrawal-excluded-from-profit test |
| G14 | Today, parties, reports | TODO | needs ring non-zero, two aging vocabularies, no inventory card |
| G15 | Scaffolding (13 launch-blocking screens) | TODO | needs render + navigate |
| G16 | Localisation od/hi/en | TODO | needs missing-key test + tri-language screenshot |
| G17 | Offline endurance, 30 days | TODO | needs empty diff |
| G18 | Low-end device performance | TODO | constrained AVD (2048MB, 2 cores), release build, median+p95 of 3 runs |
| G19 | Traceability closure | TODO | **its instrument does not exist.** `check:traceability` was removed at iteration 15 as a script naming a missing file, and B13 and B39 have had no verifier since. Rebuild it before claiming this gate. See V-3 |
| G20 | Adversarial self-review | TODO | docs/governance/REVIEW.md, >= 5 real findings. Amendment §5.3 adds reviews after G9, G16 and G19 too |

Legend: `PASS` command ran and its output proves the claim · `IN-PROGRESS` started,
named remainder below · `BLOCKED` cannot proceed without a human · `TODO` not started.

---

## G0 evidence

Command:

```
$ ls docs/spec/SPEC-DIGEST.md docs/governance/BUILD_STATE.md docs/governance/BUILD_LOG.md docs/spec/TRACEABILITY.md && wc -l docs/spec/SPEC-DIGEST.md
```

Output pasted in docs/governance/BUILD_LOG.md at the G0 entry. `docs/spec/SPEC-DIGEST.md` is **526 lines**,
comfortably over the 200-line skim threshold, and cites document + page for every rule.

All six specification PDFs were read end to end via `pdftotext -layout`, plus the paper
sheet and the one handwritten photograph that exists on disk:

| Read | Source | Lines extracted |
|------|--------|-----------------|
| OK | `SWAFTO-Strategy-1-Two-Speed-Ledger.pdf` | 406 |
| OK | `SWAFTO-Retail-Desk-Decisions.pdf` | 343 |
| OK | `SWAFTO-System-Architecture-and-DFD.pdf` | 424 |
| OK | `SWAFTO-Retail-Desk-Day-Close.pdf` | 411 |
| OK | `SWAFTO-Retail-Desk-Build-Map.pdf` | 430 |
| OK | `SWAFTO-Retail-Desk-Flow-Strategy.pdf` | 339 |
| OK | `docs/Retail Desk  V1.pdf` (the paper sheet) | 111 |
| OK | `docs/WhatsApp Image 2026-06-10...jpeg` (read as an image) | dated 25-05-26 |
| n/a | **15-07-2026 note - ABSENT FROM DISK** | see OD-4 |

---

## Open decisions

- **OD-1 · BI6 is resolved autonomously (see docs/governance/DECISIONS-AUTONOMOUS.md).** Item 6 of the 15-07-2026 note is physically
  incomplete on the photograph (`6. |`). Independently corroborated by
  `SWAFTO-Retail-Desk-Day-Close.pdf` p.9: *"Output #6 (unwritten) - Left incomplete in
  the 15-07 note - Blocked"*. **Not invented.** One reserved TRACEABILITY row. Blocks
  no gate. Resolving it costs one row and one engine function.
- **OD-2 · Internal inconsistency in the design doc.** `SWAFTO-Retail-Desk-Day-Close.pdf`
  p.5 shows the day-close list with withdrawal *unentered*, while p.7's cash-check
  working subtracts `Withdrawal 500`. Taken the **p.7 working as authoritative** for the
  canonical vector because it reconciles exactly with the Today figures on p.5
  (9,180 / 4,380 / 6,300 / 11,450). Safest option: the arithmetically self-consistent one.
- **OD-3 · BI gate horizons.** The design doc gives approximate horizons (~14/~21/~30);
  the build prompt fixes 14/14/21/14. Took the build prompt as normative - a gate must
  be an exact integer to be testable.
- **OD-4 · The 15-07-2026 photograph is absent from disk.** Only a 25-05-26 note exists
  (different content: five outputs, and *Remarks/Inquiry/Feedback* where the feature map
  has *Party Collection*). The 15-07 content is recoverable in full from the design doc
  p.9 table, which is how the feature map was corroborated. **If the original photo
  surfaces, re-verify the feature map against it.**
- **OD-5 · Day-state enum widened to FIVE against the build prompt's four.**
  `not_started | open | ready | closed | not_closed`. The build prompt says four
  (`not_started|open|ready|closed`); the architecture doc says a *different* four
  (`open|ready|closed|not_closed`); the decisions doc state machine (p.8) shows all
  five. Both shorter lists are lossy and both `not_started` and `not_closed` are
  load-bearing. **Flagged because it changes a schema the prompt specified literally.**
- **OD-10 · BI4's "stock proxy" cannot be implemented as written.** The build prompt
  specifies BI4 as "(P7 + stock proxy) vs P8", but D5 removes all item and stock data
  and the architecture states "no input collects them, so no store holds them". A
  stock proxy would have to be invented from data that does not exist. **Used the
  Day-Close doc p.9 formula instead: (credit_out + supplier_out) / cash**, which is
  computable from the ledger alone. Flagged because it departs from the prompt's
  literal wording.
- **OD-11 · OP5 uses the MEDIAN, not the mean.** The prompt says "trailing median";
  Day-Close p.9 says "mean(B, 7d)". Took the median: one festival day would drag a
  7-day mean far enough to tell a shopkeeper his ordinary Tuesday was a bad day.
  Vector `op5-uses-median-not-mean` encodes the difference explicitly (median 1,000
  vs mean 4,800 on the same series).
- **OD-12 · OP6 "projected cash" is today's expected balance, NOT a forecast.**
  Forecasting future sales would be exactly the guess this product removed. Confirmed
  by the canonical example on Day-Close p.5, where the quoted "expected balance 6,300"
  is today's P3. Pessimistic by construction, which is the right way to be wrong about
  solvency.
- **OD-13 · The Hermes available for desktop cross-checking is old (0.12, no `class`
  support).** It is a REAL Hermes VM, so the numeric and JSON semantics we care about
  diffing are genuine, but its syntax support is far behind the Hermes that ships with
  RN 0.87. Consequence: `MoneyError` became a factory function rather than
  `class ... extends Error`. That is defensible on its own merits (subclassing Error
  breaks `instanceof` under downleveling), but the constraint is an artifact of the
  test tool, not of the target runtime. **Revisit if a newer desktop Hermes appears.**
- **OD-9 · `section_skips` is a store the architecture document never names.** D8
  requires "skipped" and "untouched" to be distinguishable, but a skip has no entry to
  record it and D2 Days has nowhere to put it. Added `section_skips (shop_id, day_id,
  section, skipped_at)`. **Deliberately NOT append-only** — a skip is a UI state, not a
  financial fact, and E3 (an entry un-skips a section) and E6 (deleting the last line
  returns a section to *untouched*, not skipped) both require it to be reversible.
  Flagged because it adds a sixth store to an architecture that enumerates five.
- **OD-7 · ADR-010 amended at G3: npm workspaces, not pnpm.** Every gate verifies with
  `npm run ...` / `npm audit`, so pnpm would need a shim or rewritten gates for no gain;
  npm 11 ships with Node 24. **Cost:** pnpm's strict layout would have made a phantom
  transitive import a build error, which mattered for the "formula-engine imports
  nothing" rule. **Replacement control:** a CI check asserting that package's
  `dependencies` is empty, plus the ADR-012 lint ban. Amended in the ADR rather than
  changed silently.
- **OD-8 · A moderate advisory passed the G3 gate.** `vitest@2/3` pulled
  `@vitest/mocker` with GHSA-82fw-gwwq-j7x9 (path traversal / arbitrary file read).
  `--audit-level=high` — the threshold the prompt specifies — would have let it through
  silently. Upgraded to `vitest@5` (free, no tests written yet) and recorded a standing
  policy: **moderate findings are triaged weekly and fixed or accepted in writing.**
- **OD-6 · Stack conflict resolved toward the prompt.** Every existing artifact says
  Flutter (architecture doc L1-L5, `tokens.dart`, the resource plan's four Flutter
  devs). `TARGET_STACK=react-native` overrides, and the two-engine rule collapses to
  one shared TS package. The architecture's *divergence-is-an-alarm* rule (§07.06) is
  **retained** - the server still recomputes and raises on mismatch.

## Blocked on human

**NONE.** `resolved autonomously (docs/governance/DECISIONS-AUTONOMOUS.md)` was abolished as a status by the autonomy amendment
(iteration 7). Every prior instance is resolved in `docs/governance/DECISIONS-AUTONOMOUS.md`
(AD-001 to AD-010). Things genuinely impossible in software are listed in
`docs/handover/HUMAN-ACTIONS.md`, and **none of them blocks this loop**:

| Previously blocked | Resolution |
|---|---|
| G9 pipeline needed AWS | LocalStack + docker-compose + a locally executed rollback |
| G18 needed a 2GB phone | Constrained AVD (AD-009), limitations recorded |
| BI6 unknown | **AD-001** - Credit Concentration, decided by procedure |
| DLT registration | **AD-004** - provider-agnostic SmsPort + stub; H1 is release-day |
| 7 legal findings | AD-003, AD-005, AD-006, AD-007, AD-008; text written in `/legal` |

## Next action

**The pre-G10 queue, in order.** Everything here is front-loaded deliberately: each
item is cheap now and expensive once screens exist.

| # | Item | State |
|---|------|-------|
| 1 | **C.2 bundled Odia font** | **DONE** iteration 14 - AD-015, `check:font`, DEVICE-CHECKLIST A1-A6 |
| 2 | C.3 static font instances · C.4 tabular figures | **DONE** iteration 15 - AD-016, DC-005, `check:font` |
| 2b | C.5-C.9, decided and recorded | **DONE** iteration 16 - ADR-013..017; their checks are owed below |
| 3 | Persistent, restart-surviving rate limits (injection 08 B.2) | **DONE** iteration 17 - AD-017, `rate_events`, 14 tests |
| 3b | Typechecking and the ADR-003 money lint | **DONE** iteration 18 - neither had ever run |
| 4 | DC-003 compensating control for origin exposure | owed, and SECURITY-AUDIT now states the exposure correctly |
| 5 | OTP service B.3-B.5, including number-change revocation | owed |
| 6 | **G6** auth service against the `SmsPort` stub (AD-004) | blocked on 3-5 |
| 7 | G7 and G8, with `rejects.json` grown alongside them | the 8 api-layer rejection cases get their layer here |
| 8 | Two fixtures: canonical shop, adversarial shop | prerequisite for B.1-B.7 |
| 9 | **G10**, beginning with the four form archetypes | Today screen LAST, per B.6 |

### Checks owed, and where they attach

Every row is a decision already made and recorded. The check cannot be written yet
because the code it inspects does not exist - which is exactly how C.3-C.9 nearly went
missing, so they are listed here rather than left in prose.

| Owed at | Check | Guards |
|---|---|---|
| G10 | `allowFontScaling={false}` appears nowhere; `maxFontSizeMultiplier` only via shared typography | ADR-013 |
| G10 | B31 overflow measured at scale 1.0, 1.3 and OS max, x3 languages, on the longest-string fixture | ADR-013 |
| G10 | the money style sets `fontVariant: ['tabular-nums']` | DC-005, AD-016 |
| G10 | no date label renders a relative word; the header tracks the OPEN DAY, not the device date | ADR-017 A |
| G11 | no `TextInput` in the amount component; no numeric `keyboardType` anywhere | ADR-014 |
| G11 | keypad present on exactly the seven keypad screens, absent wherever `BottomNav` renders | build prompt, ADR-014 |
| G11 | back: all three cases per screen, **including that case 1 shows NO dialog** | ADR-016 |
| G12 | process killed mid-entry: committed lines restored, in-progress amount empty, banner shown | ADR-015 |
| H8 | DEVICE-CHECKLIST B4: money columns actually align on a handset | DC-005 |
| H8 | DEVICE-CHECKLIST A4: does a real budget handset ship an Odia font | DC-004 |

Amendment items 2.1-2.4 completed at iteration 7 and are recorded in
`docs/governance/DECISIONS-AUTONOMOUS.md` and `docs/governance/BUILD_LOG.md`; they are no longer pending work.

Governance is machine-enforced and every check is negative-tested:
`check:governance`, `check:benchmarks`, `check:prose`, `check:sms`,
`check:sms:segments`, `check:tooling`, `check:generated`, `check:font`.

<!-- superseded next action:
**G1 - Technology research.** Write `docs/spec/TECH-DECISIONS.md` as >= 8 ADRs covering: RN
on-device SQLite (op-sqlite vs expo-sqlite vs WatermelonDB, benchmarked not blog-quoted),
sync protocol + clock-skew/day-boundary policy, backend framework on t4g.small, Postgres
access layer, phone+OTP auth and an Indian DLT-registered SMS provider, Android
background sync under doze, offline-capable crash reporting under DPDP consent, and
package manager / Node LTS / RN version / New Architecture.

Then G2, G3, and into the domain core at G4-G5. **G5 (the Formula Engine) is the heart
of the product and is the single most valuable gate in this list** - it is pure, fully
testable offline, and everything else is a projection of it.
-->

---

## RESUME

**CEILING IS 40, NOT 60.** Injection 15, owner's decision, final. At iteration 21,
**19 iterations remain**. That is a 40% scope cut and it has been taken as scope -
never as rigour. §5.1, §5.9, §5.12, §5.13, §5.14 and §6 all stand unreduced, and
every benchmark threshold is untouched.

<!-- TWONUMBERS:START - generated by tools/check-verifiers.mjs --update-md -->

**Two numbers (§5.13 A.5):**

> **INSTRUMENTED: 23 of 40.** 2 overdue, 15 blocked on artifacts that do not exist yet.
> **OVERDUE: B4, B6** - the subject exists and nothing measures it.
> **MET:** see BENCHMARKS-RESULTS.md. A benchmark with no instrument cannot be
> claimed met, and none is claimed here - this block counts instruments, not
> results, because conflating the two is how a benchmark goes green untested.
> **MISSED - SCOPE: B38, B39**, a decision rather than a failure.

<!-- TWONUMBERS:END -->

`npm run check:all` runs fourteen checks. `npx vitest run` is 303 passed / 0 skipped.

### The plan, repriced (PROJECTION.md)

Sixteen screens do not fit, and cutting the bottom of the A.3 list does not rescue
them - the binding constraint was **sixteen iterations of server work in front of the
first screen**. **AD-018 moves the server behind the screens** and records the cost.
Committed: A.3 items 1-5, about eleven screens, which is A.2's target. Stretch: items
6-8. One line from the owner reverses it.

### Next, in order (injection 16 D)

1. **The canonical value registry** - BEFORE the screens, because the screens are
   about to multiply user-facing copy containing numbers - 2
2. **The mutation harness, then the twelve arithmetic survivors** - a live finding on
   the money path outranks a screen - 2
3. **rejects.json and the B3 re-measurement** - 2
4. **The two fixtures**, canonical and adversarial - 1
5. **App skeleton, tokens, fonts, store wiring** - 1 (expect it to be ugly)
6. **FORM A** - 1. Chosen to be FIRST BECAUSE IT IS HARDEST: the custom keypad and
   its keyboard suppression, money through the registry, tabular figures and DC-005,
   bundled Anek Odia rendering, a sticky running total from the real store, and B.1's
   fixture rule end to end. Every unknown front-loaded for ten iterations is in it.
7. **The first contact sheet, IMMEDIATELY** - even if it is one screen and wrong. It
   is the first artifact in this build a human can judge by looking, and the Odia
   rendering question is answered by looking rather than by any test here.
8. **Instrument B26-B29 straight after Form A** - contrast, white-on-marigold, touch
   targets, text size - before ten more screens multiply whatever is wrong.
9. **A.3 items 2-5**, the rest of the day close.

**Constraints on the scaffold, from AD-019 - read them again when writing it:**
the outbox is IN THE WRITE PATH from the first write (the drain is what was cut); the
shop id is a client-generated UUIDv7 from the first row; B36 is instrumented with the
first log line, not with the server.

**If screens run short, cut from the bottom of A.3 items 1-5 - never from §B.6.**
Nine screens that each meet the full bar beat eleven that mostly do.

**At 35: the one-page pre-stop check. At 40: stop and produce the handover report.**
If it finishes early it stops early.

### Open, and named rather than buried

- **V-7** - TRACEABILITY names 8 engine functions and 18 vectors that do not exist.
  §5.14.5: each built or the claim removed. The only OPEN finding.
- **Two owed plants** from REVIEW.md's A12 audit: a correction whose
  `corrects_day_id` is closed while its own day is open, and a genuine cross-tenant
  read (the latter now blocked by AD-018).
- **One STALE judgement** (§5.15): the finding severities, last stated at iteration 13.
- **H11** - permission for an `eslint.config.mjs`. Blocks nothing.
