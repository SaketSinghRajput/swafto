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

# 25-the-driver

# SWAFTO — the driver

One prompt. Paste it once. After that the only word you ever type is `Continue.`

It replaces every "what next" decision with a single derived line. `TASKS.md` says what is next, the loop does it, all three documents regenerate, and it goes again — without stopping at gate boundaries, without asking, and without letting the documents themselves become the work.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
THE DRIVER. This replaces all earlier "what to work on next" instructions. Everything
else stands unchanged: the eight product constraints, the decision procedure, §5.1
through §5.16, §6's adversary protocol, the frozen benchmark table, and the ceiling at
iteration 40.

PLAN.md says what the product is. TASKS.md says what is left and in what order.
DESIGN.md says what the code actually does. All three are DERIVED. You regenerate them;
you never edit them, and producing them is never the work.

═══════════════════════════════════════════════════════════════════════════════
1 · THE ITERATION
═══════════════════════════════════════════════════════════════════════════════

Every iteration is the same six steps. Do not vary them.

  1. READ TASKS.md's NEXT line. That is your work. Do not choose, do not re-plan, do
     not pick something that feels more urgent. If NEXT looks wrong, the dependency
     graph is wrong — fix the graph in the data file, regenerate, and read NEXT again.

  2. DO IT. Real code. No stub, no TODO, no mock returning fixed data, no
     `throw new Error('not implemented')` in a shipped path.

  3. MAKE ITS PREDICATE TRUE, then run it and paste the actual output. A task is done
     when its predicate returns true, never because you judge it finished. If the
     predicate cannot be made true this iteration, leave the task READY and say in one
     line exactly what remains.

  4. REGENERATE all three documents plus BUILD_STATE and BENCHMARKS-RESULTS. Run the
     full verification chain. Everything that is derived is re-derived; nothing is
     typed.

  5. COMMIT. One task, one commit where possible. The message names the task id and
     what changed. Append one line to BUILD_LOG.

  6. GO TO 1. Say "NEXT: <id> — <title>" and continue in the same turn if the work
     allows it.

═══════════════════════════════════════════════════════════════════════════════
2 · WHAT NEVER STOPS YOU
═══════════════════════════════════════════════════════════════════════════════

  • A task finishing. A gate closing. A phase ending. A good report. None of these is
    a reason to stop; they are reasons to read NEXT again.
  • A question. There is nobody to ask. Apply the decision procedure, record the
    decision with its reversal trigger, continue.
  • A task you cannot do because something outside software is missing. Mark it
    DEFERRED with the reason, confirm it appears in HUMAN-ACTIONS.md, take the next
    READY task. Nothing human-blocked ever blocks the build.
  • A benchmark you cannot meet. Three recorded attempts, then BENCHMARK-MISSED with
    the measured value, then continue. Never move a threshold.

═══════════════════════════════════════════════════════════════════════════════
3 · WHAT DOES STOP YOU
═══════════════════════════════════════════════════════════════════════════════

  • ITERATION 40 ENDS. Finish the task in hand, run the full verification, produce the
    handover report, stop.
  • EVERY COMMITTED TASK IS DONE. Stop early and say so. Do not fill iterations, do not
    gold-plate, do not start deferred work to use up budget.
  • THE SAME TASK FAILS THREE ITERATIONS RUNNING. Write STUCK.md — what you tried, what
    failed, three options, your recommendation — and take the next READY task rather
    than a fourth attempt.
  • A CORRECTNESS DEFECT IN THE MONEY PATH. Stop the queue, fix it, re-measure. This
    outranks every screen and it is not a close call.

═══════════════════════════════════════════════════════════════════════════════
4 · THE SCREEN PHASE, WHICH IS MOST OF WHAT REMAINS
═══════════════════════════════════════════════════════════════════════════════

  4.1  A SCREEN IS DONE WHEN ITS EIGHT CHILDREN ARE DONE. Not seven. The parent's
       checkbox is derived from them, so this is not a matter of resolve.
  4.2  NO SCREEN'S FIGURES COME FROM A FIXTURE MODULE. Mutate one entry in the real
       store; every figure derived from it moves. That is the predicate.
  4.3  EVERY SCREEN RENDERS AGAINST BOTH FIXTURES, canonical and adversarial, and the
       adversarial one is where the benchmarks are measured.
  4.4  THE CONTACT SHEET IS PRODUCED AT THE END OF EVERY ITERATION THAT TOUCHED A
       SCREEN, even a half-finished one. It is the only artifact a human can judge, and
       an early ugly one is worth more than a late polished one.
  4.5  WHEN A SCREEN FIRST RENDERS, its instrument tasks become READY in the same
       iteration. §5.13. They are real tasks with real estimates, not an afterthought.
  4.6  CHECK DESIGN.md's RAW VALUES TABLE EVERY TIME A SCREEN LANDS. It should be
       empty. The first non-empty row is a hardcoded value caught before it is copied
       into the next eight screens, which is the cheapest moment it will ever be
       catchable.

═══════════════════════════════════════════════════════════════════════════════
5 · THE DOCUMENTS ARE LENSES, NOT WORK
═══════════════════════════════════════════════════════════════════════════════

  5.1  Regeneration is part of step 4, not a task. It costs seconds. If it costs more
       than that, the generator is doing something it should not.
  5.2  A CONFLICT BETWEEN THE THREE DOCUMENTS IS A GENERATOR BUG, NEVER A JUDGEMENT
       CALL. They read the same artifacts; if PLAN.md and TASKS.md disagree about
       whether a feature is built, one generator is reading the wrong source. Add a
       cross-check that fails on any such disagreement, and fix the generator rather
       than the document.
  5.3  If generating a section reveals that an underlying artifact is wrong or missing,
       file a finding and fix it in its own commit. The documents are lenses, not
       hospitals.
  5.4  NEVER EDIT A GENERATED FILE BY HAND. check:generated already catches this; do
       not make it work.

═══════════════════════════════════════════════════════════════════════════════
6 · THE RHYTHM THAT MUST SURVIVE THE PRESSURE
═══════════════════════════════════════════════════════════════════════════════

"Do not stop until it is done" is the sentence that makes builds cut the invisible
things. These are not optional and they are not cheap, and that is the point.

  6.1  THE ADVERSARY PASS RUNS EVERY FIFTH ITERATION AND AT EVERY PHASE BOUNDARY. A
       productive stretch is when the most is unexamined, so a productive stretch is
       never a reason to skip one. It works the twelve patterns in order and it
       produces findings or it did not run.
  6.2  EVERY NEW CHECK GETS ITS PLANTED DEFECT (§5.12) AND ITS RESPONSE TEST (§5.16) IN
       THE SAME ITERATION IT IS WRITTEN. A check proven able to fail is not yet proven
       able to measure.
  6.3  §5.9 DETECTION RATES on anything that matters. Prefer the number to the argument
       — every time this build has measured it has learned something it did not expect,
       and every time it has reasoned about composition it has been wrong.
  6.4  AT ITERATION 35, the pre-stop check: what will and will not be finished, and
       whether the handover will be honest at 40. That is the last moment a cut is
       cheap.

═══════════════════════════════════════════════════════════════════════════════
7 · WHAT TO SAY EACH TIME
═══════════════════════════════════════════════════════════════════════════════

Keep it short. Nobody is reading a wall of text between iterations.

  • The task id and title you just completed, and the predicate output that proves it.
  • Anything you found that was not the task — those have been the most valuable things
    in this build and they must not be buried.
  • Any decision made under the procedure, with its reversal trigger.
  • The new NEXT line.
  • Instrumented / met, two numbers.

Do not re-explain the plan. Do not summarise what the documents already say.

═══════════════════════════════════════════════════════════════════════════════
8 · START
═══════════════════════════════════════════════════════════════════════════════

Read TASKS.md's NEXT line and begin. Then keep going, without stopping, until either
every committed task is done or iteration 40 ends.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## The one line in it that does the most work

**§5.2 — a conflict between the three documents is a generator bug, never a judgement call.** Three derived views over the same artifacts cannot honestly disagree. The moment someone reconciles them by editing one, all three become opinions, and the whole apparatus turns back into the thing it was built to replace.

