<!--
VERBATIM. This is the human instruction as received, preserved unedited.

It is here because C.3-C.9 - seven React Native traps this build is required to
resolve before G10 - existed nowhere in the repository. The list lived only in a chat
transcript, and recovering it at iteration 14 meant mining a .jsonl file. An
instruction that cannot be re-read is an instruction that quietly becomes whatever the
last iteration remembered of it.

DO NOT EDIT THE BODY. §5.6 prose integrity applies with no exception here: this is
evidence, not our prose. Corrections, disagreements and rulings go in SPEC-DIGEST §1,
BUILD_LOG or an INJECTIONS/NN-adversary-*.md pass - never inline.
-->

# 14-instruments-before-subjects

# SWAFTO — injection 14: instruments before subjects

`10 of 40 benchmarks have an instrument` is now the most important number in the build, and it is bigger than a backlog item. The stop condition is defined by forty benchmarks and three quarters of them have no way of being measured. Until that changes, "all benchmarks met" is not a claim the loop can make.

Three findings this round are worth more than the fixes they produced:

**The G4 plant.** Every append-only test had only ever updated `amount`, so a trigger narrowed to one column left the suite green — on SQLite, which is the authoritative store. That is not fixture blindness in the §6.3 A1 sense; it is a plant that failed to vary along the axis the *guard* is scoped on. Different pattern, new checklist line.

**B3 at 57.73% → 85.71% with the engine unchanged.** Twenty-eight points of an apparent shortfall were the instrument. That is the strongest possible argument for the rule below: a benchmark measured for the first time near the end tells you about your harness, not your code.

**"The spec says X is a claim about search coverage, not about X."** That is the best sentence in the build. It also has a mechanical fix, which is in section B.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 14. Iteration 18 accepted. G4 re-earned rather than re-assumed is the right
phrase and the right standard. Four items.

═══════════════════════════════════════════════════════════════════════════════
A · THIRTY MISSING INSTRUMENTS IS THE CRITICAL PATH — §5.13
═══════════════════════════════════════════════════════════════════════════════

The stop condition is B1-B40. Thirty of them cannot currently be measured at all. This
is not a task to squeeze in before G19; it is a third of the definition of done, and it
has been invisible because the lock protected thresholds and not instruments.

A.1  PARTITION ALL FORTY, today, into MEASURABLE-NOW and BLOCKED-ON-SUBJECT, and for
     each of the second kind name the artifact whose existence unblocks it. Most of
     B14-B25 need the app; B26-B32 need screens; B38-B39 need the screen inventory.
     Write it into BENCHMARKS-RESULTS.md, which does not yet exist and should.

A.2  §5.13 — AN INSTRUMENT IS BUILT WITH ITS SUBJECT, NEVER AFTER.
     The iteration in which a benchmark's subject first exists is the iteration its
     instrument is built and its first real number recorded, however bad that number
     is. A benchmark measured for the first time near the end is measuring the harness:
     B3 moved 28 points on an unchanged engine, and the movement was entirely
     instrument. That failure mode scales with how late the first measurement is.
     Corollary: the first screen that renders is the iteration B26-B29 get their
     instruments. The first APK that builds is the iteration B24 gets its. Not later.

A.3  EVERY INSTRUMENT IS ITSELF A VERIFIER and goes into VERIFIERS.md under §5.12 with
     a planted defect. An instrument is a check; the three-instance pattern applies to
     it exactly as it applied to typecheck.

A.4  RECORD THE NUMBER EVEN WHEN IT IS BAD. 85.71% against 100% recorded honestly is
     worth more than a green cell, and it told you something specific: the gap is in
     rejection and gate-closed arms. A missing measurement tells you nothing at all.

A.5  REPORT PROGRESS AS INSTRUMENTED / MET, two numbers, every iteration. "Benchmarks
     met" without "benchmarks instrumented" beside it is the exact shape of claim the
     lock was hiding.

═══════════════════════════════════════════════════════════════════════════════
B · THE CANONICAL VALUE REGISTRY — KILLS THE TTL CLASS OUTRIGHT
═══════════════════════════════════════════════════════════════════════════════

Your sentence is right and it generalises: "the spec says X" is a claim about search
coverage. The mechanical fix is to make the claim impossible by giving each value ONE
home.

B.1  Create a single authoritative source for every value that appears in more than one
     place. Code imports it; documents are CHECKED against it. Not a document that
     states the value — a module that exports it, plus a check that every stated
     occurrence agrees.
     At minimum it holds: the OTP TTL; every rate limit and lockout; every BI gate in
     closed days (14, 14, 21, 14); minimum touch target 56dp; minimum body text 17sp;
     every colour token; the segment and variable limits; every threshold in
     BENCHMARKS.md; and every number that appears in user-facing copy in any language.

B.2  CI FAILS when a document states a value that disagrees with the registry, and when
     code contains a literal that the registry already names. The TTL defect becomes
     unrepresentable: the English template's "10 min" is generated from, or checked
     against, the same constant the code imports.

B.3  WHERE TWO ARTIFACTS ALREADY DISAGREE, the registry forces the question rather than
     letting deference pick one. Sweep for existing disagreements now — TB6 versus
     SMS-TEMPLATES was not the only pair, it was the pair you happened to trip over.
     Grep every number that appears in two files and reconcile each one.

B.4  Where a value legitimately differs by context, the registry names both with their
     scopes. Two names beat one ambiguous name.

═══════════════════════════════════════════════════════════════════════════════
C · CHECKLIST ADDITION — A12 · THE SCOPE OF THE DEFENCE
═══════════════════════════════════════════════════════════════════════════════

Add to §6.3:

  A12 · SCOPE OF THE DEFENCE — what is this guard scoped BY, and does the test data
        vary along that axis? Not "is there enough data" (A1) but "does the plant move
        in the dimension the guard is written in". Instance: the append-only trigger is
        scoped by COLUMN, and every test only ever updated amount — so narrowing it to
        one column left the suite green on the authoritative store.
        Ask of every guard: is it scoped by column, table, path, role, entity type,
        language, platform, or environment? Then plant a defect that moves along that
        axis specifically.
        Your four-column sweep is the template — and choosing columns with no CHECK
        constraint, so a rejection can only be the trigger, is the part to keep. A
        plant caught by the wrong guard passes for the right reason and teaches nothing.

  Apply A12 retroactively to every guard already in place: the closed-day trigger, the
  cross-tenant isolation, the money lint rule, the rate limiter, the template checker.
  For each, name its scoping axis and confirm a plant moves along it.

═══════════════════════════════════════════════════════════════════════════════
D · THREE SMALLER THINGS
═══════════════════════════════════════════════════════════════════════════════

D.1  rejects.json is now LOAD-BEARING FOR B3, not only for correctness. You measured
     the 14-point coverage gap as concentrated in rejection and gate-closed arms —
     which is §5.11 describing itself. Build it before G7 rather than alongside, and
     re-measure B3 immediately after. Expect most of the remaining gap to close; if it
     does not, that is a finding about which arms are genuinely unreachable.

D.2  THE BUDGET SHIFTED. You are around iteration 19 of 60 with thirty instruments and
     twenty-seven screens ahead. Write PROJECTION.md NOW rather than at 40 — what
     remains, your estimate, and what you would cut if forced. Then keep going. An
     early projection is cheap; discovering at 50 that the instruments alone need
     fifteen iterations is not.

D.3  G2's unreproducible "52" and G3's "87 STRIDE rows" have a shared shape worth
     naming: a recorded number that nobody could regenerate. Add to §5.12 that every
     evidence string in BUILD_STATE.md must be RE-DERIVABLE by running its command
     today, and make that part of the sweep rather than a one-off.

═══════════════════════════════════════════════════════════════════════════════
E · QUEUE
═══════════════════════════════════════════════════════════════════════════════

A.1 and D.2 first — they are cheap and they tell you whether the rest of the plan is
real. Then B, then rejects.json, then resume: DC-003's compensating control, the OTP
service on the limiter, G7 and G8. Fixtures, then G10.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## For you rather than the loop

`check:tooling` flagging `check-verifiers.mjs` — the iteration-15 mechanism catching the author of the mechanism — is the single best sign in this report. It means §5.10 built something that applies to its builder, which is the only kind of guardrail that survives an autonomous loop.

The thing I would watch next is D.2. Nineteen iterations in, with thirty instruments and twenty-seven screens left, the sixty-iteration ceiling has gone from comfortable to plausible. An early projection costs one iteration and tells you now whether the screens will get the attention they need, or whether something has to give.
