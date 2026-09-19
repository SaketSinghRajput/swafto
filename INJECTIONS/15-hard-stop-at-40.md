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

# 15-hard-stop-at-40

# SWAFTO — injection 15: hard stop at 40, and what that costs

You are at roughly iteration 20. `PROJECTION.md` estimates 34 iterations of work remaining. A ceiling of 40 leaves 20. **That is a 40% scope cut, not a deadline.** Pretending otherwise would produce the worst version of this — an agent under time pressure trimming the invisible thing, which is verification, which is precisely what this build has spent twenty iterations defending.

So the injection cuts deliberately and names what goes. What you get at 40:

**A correct, offline, three-language app that closes a day end to end.** Forms, the nine-section list, the cash check and its endings, Today, opening cash, parties, sign-in, offline and sync. Roughly sixteen screens, benchmarked, on an emulator.

**What you do not get**, and these are real:

- **Reports and the BI screens.** The engine keeps all of BI6, BI1–BI4 — it is built and tested. Only the screens go. Their gates are 14–21 closed days, so a new user in month one sees nothing either way.
- **Play Store readiness.** Account deletion, About with the policy URL, the deletion web page. Those are submission blockers, so a ceiling of 40 means no Play submission without a continuation.
- **Most of Settings, the help screens, crash recovery, the notification inbox and primer.**

**And one consequence you should see coming:** `B38` requires 27 of 27 screens. Cut to sixteen and it cannot be met. The benchmark file is SHA-locked and the loop is forbidden from editing a threshold — correctly — so `B38` and `B39` will be reported as **MISSED**, with the measured value and the deferral list attached. That is the honest outcome and it is the one I have told it to produce. A build that reports 16/27 with the reason is worth more than one that redefines "screen" to reach 27.

One thing I have explicitly protected from the cut: the **twelve arithmetic-operator survivors inside the money helpers**. If those survive the harness fix, that is a live finding about the money path, and it is not allowed to be lost in a schedule squeeze.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 15. Iteration 20 accepted. The F-10 finding — a false premise and an unapplied
fix cancelling into an apparent pass — is the most serious self-report of this build, and
it gets a mechanism below rather than a lesson.

THE CEILING IS NOW 40, NOT 60. This is a decision by the project owner and it is final.

═══════════════════════════════════════════════════════════════════════════════
A · WHAT THE NEW CEILING MEANS — READ BEFORE PLANNING
═══════════════════════════════════════════════════════════════════════════════

You are at ~20. PROJECTION.md estimates 34 remaining. You have 20. THIS IS A SCOPE CUT
OF ROUGHLY 40%, and it must be taken as scope.

A.1  CUT SCOPE. NEVER CUT RIGOUR. Under time pressure the cheapest-looking savings are
     always the invisible ones — a skipped negative test, an instrument deferred, a
     detection rate not measured, an adversary pass shortened. Every one of those is
     forbidden. §5.1, §5.9, §5.12, §5.13 and §6 stand unchanged and unreduced. The
     benchmark thresholds stay frozen. If something has to give, it is FEATURES, and
     the loss is written down.

A.2  THE TARGET AT 40 is a correct, offline, three-language app that closes a day end to
     end on an emulator, with every shipped screen benchmarked. Not a Play submission.
     Not feature-complete. Correct and walkable.

A.3  BUILD THIS SET — the core loop, in this order:
       1. The four form archetypes
       2. The day-close list with its three row states
       3. Cash check: counting, difference, balanced, day-closed summary
       4. Opening cash and first run
       5. Today, open / closed / gap
       6. Parties: list, customer detail, supplier detail
       7. Sign-in: language choice, phone, OTP, and OTP failure states
       8. Offline and sync states
     Roughly sixteen screens. Every one of them meets §B.6 in full — traced to the
     engine, both fixtures, four states, three languages, longest-string at maximum
     font scale, contrast and target checks, contact sheet. A screen that does not meet
     §B.6 is not in the set; it is deferred. HALF A SCREEN IS NOT A SCREEN.

A.4  DEFER THESE, EXPLICITLY, TO DEFERRED.md — not silently, and not as "future work"
     with no detail. For each: what it is, why it was cut, what it blocks, and what it
     would cost to build.
       • Reports and every BI screen. THE BI ENGINE STAYS — BI1-BI4 and BI6 remain
         built, tested and instrumented. Only the screens defer. Their gates are 14-21
         closed days, so a first-month user loses nothing.
       • The Play Store set: account deletion flow, About with the policy and deletion
         URL, the deletion web page. Note plainly in DEFERRED.md that Play submission is
         blocked until these exist.
       • Settings beyond language and appearance; help and FAQ; backup and export;
         app lock; number change; crash recovery; notification inbox and primer.
     DEFERRED.md is a deliverable, not a note. It is what makes the cut recoverable.

A.5  B38 AND B39 WILL BE MISSED. B38 requires 27 of 27 screens; you will ship about 16.
     DO NOT EDIT THE LOCK. DO NOT REDEFINE "SCREEN". Report them as
        MISSED — SCOPE · measured 16 of 27 · deferred set in DEFERRED.md
     and add the reason code to BENCHMARKS-RESULTS.md so a scope miss is distinguishable
     from a performance miss. One is a decision; the other is a failure. Conflating them
     is the only wrong answer here.

A.6  PROTECTED FROM THE CUT — do not defer, whatever the schedule says:
       • The twelve arithmetic-operator survivors in the audited money helpers. Fix the
         mutation harness and re-measure. If they survive, that is a live finding on the
         money path at priority 1 and it outranks any screen.
       • rejects.json and the B3 re-measurement that depends on it.
       • The canonical value registry — it prevents a class of defect in copy that the
         screens are about to multiply.
       • Every instrument for every screen you DO ship.

A.7  REPRICE NOW. Rewrite PROJECTION.md against 20 iterations and the A.3 set before
     writing any more code, and say plainly whether sixteen screens fit. If they do not,
     cut from the BOTTOM of the A.3 list — parties detail before parties list, sign-in
     before the cash check — and never from the top. The ending is the product.

═══════════════════════════════════════════════════════════════════════════════
B · NEW STANDING RULE — §5.14 STATUS IS DERIVED, NEVER ASSERTED
═══════════════════════════════════════════════════════════════════════════════

F-10 is the fourth instance of one pattern, and the pattern is now unmistakable:

  1. maybe()             — the test ran; its assertions did not
  2. assertPaise 0/59    — the guard existed; it had never executed
  3. typecheck / lint    — the command was cited as evidence; it did not exist
  4. F-10                — the finding's premise was false AND its fix was never
                           applied; the two errors cancelled into an apparent pass

Every one is the same failure: THE RECORD AND THE REALITY DIVERGED, AND THE RECORD WAS
TRUSTED. Four times, in four different layers. The governing principle is now explicit:

  NOTHING IN THIS BUILD IS TRUE BECAUSE A FILE SAYS SO.

  §5.14.1  Every status in every file — gate PASS, benchmark MET, finding FIXED, feature
           DONE — must be DERIVABLE FROM THE REPOSITORY by a command, not asserted into
           a document by its author. A status with no derivation is a claim, and claims
           are not evidence.
  §5.14.2  FINDINGS.md holds every adversary finding with its status. A finding marked
           FIXED requires a named artifact — a commit, a test, a file — and a check that
           confirms it is present TODAY. Your own `git log -S"BI6" -- TRACEABILITY.md`
           is the shape: use it as the standard, not as a one-off.
  §5.14.3  A FINDING'S PREMISE IS VERIFIED BEFORE ITS FIX IS DESIGNED. F-10 claimed four
           artifacts were present; none were. Adversary findings are not exempt from
           being wrong — they are ordinary claims made by a role that is looking for
           trouble, and looking for trouble makes false positives MORE likely, not less.
           Every finding states the command that established its premise.
  §5.14.4  Add to check:verifiers a sweep that re-derives EVERY status claim in
           BUILD_STATE.md, BENCHMARKS-RESULTS.md, FINDINGS.md and TRACEABILITY.md. It
           runs every iteration. Negative-test it by flipping one status by hand.
  §5.14.5  The 26 unresolved traceability references are this rule catching up with
           itself — eight engine functions and eighteen vectors named in a matrix and
           absent from the repo. Resolve every one: build it, or remove the claim. A
           cell containing the name of something that does not exist is worse than an
           empty cell, because it reads as done.

═══════════════════════════════════════════════════════════════════════════════
C · THE STOP — REPLACES §7.4 AND §7.5
═══════════════════════════════════════════════════════════════════════════════

Stop at whichever comes FIRST:
  • the full stop condition is met, or
  • ITERATION 40 ENDS.

At 40, finish the gate in hand, run the full verification, and stop. Do not continue.
Do not ask for more. Then produce the HANDOVER REPORT, which is the deliverable of this
build and must be complete enough that a different team resumes from it alone:

  1. WHAT WORKS — the walkable path, end to end, with the command that runs it.
  2. THE BENCHMARK TABLE — every row: MET with its measured value, MISSED — SCOPE,
     MISSED — PERFORMANCE with its three attempts, or NOT INSTRUMENTED with the reason.
     No blank cells.
  3. DEFERRED.md — what was cut, why, what it blocks, what it costs.
  4. HUMAN-ACTIONS.md — the six Odia and Hindi strings, DLT registration, AWS, GitHub,
     Play Console, the domain, the grievance officer, the physical-device checklist.
  5. THE THREE WEAKEST PARTS of what you built, named honestly, with what you would do
     about each. You built this without review; you know where it is thin.
  6. RESUME INSTRUCTIONS — the exact next five things, in order, for whoever continues.

At 35, write a one-page pre-stop check: what will and will not be finished, and whether
anything in the A.3 set needs cutting to land the rest properly. Then keep going.

IF YOU FINISH EARLY, STOP EARLY. Report it and stop. Do not fill iterations, do not
gold-plate, do not start deferred work to use up the budget. An honest finish at 34 is
a better outcome than a padded one at 40.

═══════════════════════════════════════════════════════════════════════════════
D · QUEUE
═══════════════════════════════════════════════════════════════════════════════

A.7 repricing and §5.14 first — both are cheap and both change what the rest is worth.
Then: the canonical value registry, the mutation harness and the twelve survivors,
rejects.json and the B3 re-measurement, DC-003's control, the OTP service, G7 and G8.
Then the two fixtures, then the A.3 screen set in order.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## If you want more than that at 40

The lever is the screen set, not the rigour. Cutting parties detail and the sign-in flow buys back three or four iterations and still leaves a walkable day close — you would stub past sign-in for testing. Cutting the benchmarks or the adversary passes buys back more and gives you a build whose claims you cannot check, which is the position you started twenty iterations ago trying to escape.

The other honest option is 45 rather than 40. Five iterations is roughly the difference between shipping the deferred Settings and Play set or not, and it is yours to spend.
