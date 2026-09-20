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

# 23-tasks-md

# SWAFTO — injection 23: TASKS.md, a checklist that ticks itself

A checklist whose boxes are ticked by hand is the same defect this build has now found seven times in seven layers: a status asserted rather than derived. It would be the friendliest-looking instance yet — a tidy file full of `[x]` that nobody can check.

So `TASKS.md` regenerates, and the boxes tick themselves from predicates. That is what makes it dynamic in the sense worth having.

Two design points the prompt is strict about, because an agent asked for "numbered tasks in order" gets both wrong by default:

**The serial number must not be the order.** Number tasks 1 to 60, insert one, and every number after it shifts — breaking every reference in every log entry that cited it. IDs are assigned once and never reused or reordered; **order is a separate derived column**, recomputed from dependencies each time the file is generated.

**Order is computed, not chosen.** Each task declares what blocks it. The sequence is a topological sort, so when something slips the order re-sorts itself and "what do I do next" stays a derived line rather than a judgement someone has to remake.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 23. Build TASKS.md. Same discipline as PLAN.md: derived, never authoritative,
regenerated rather than edited. ONE ITERATION for the generator and first render.

PLAN.md says what the product is. TASKS.md says what is left and in what order. Neither
owns a fact; both are lenses over artifacts that already exist.

═══════════════════════════════════════════════════════════════════════════════
A · THE THREE RULES
═══════════════════════════════════════════════════════════════════════════════

A.1  THE CHECKBOX IS DERIVED. Every [ ] and [x] is rendered from a PREDICATE — a
     command or file test that returns true or false today. No task is ever ticked by
     hand. A hand-ticked box is the eighth instance of the pattern, and it is the most
     inviting one this build will ever offer.
     A task whose completion cannot be expressed as a predicate is not a task; it is a
     wish. Split it until each part is checkable, or mark it JUDGEMENT and date it per
     §5.15.

A.2  THE ID IS STABLE. THE ORDER IS DERIVED. Assign each task a permanent id at
     creation — S-001, P-004 and so on — never reused, never renumbered, never
     reordered. Separately, compute an ORDER column by topological sort over the
     dependency graph, and print it beside the id. Inserting a task changes the order
     column and changes no id, so every reference in BUILD_LOG stays valid forever.
     If you find yourself renumbering, you have merged the two concepts and the file
     will start lying the first time the plan changes.

A.3  ORDER COMES FROM DEPENDENCIES, NOT FROM PREFERENCE. Each task declares BLOCKED BY
     and the sort does the rest. Where two tasks are genuinely independent, break the
     tie with the priority ordering already in force: correctness of money, then the
     shopkeeper's trust, then reversibility, then works-offline-and-on-a-weak-device,
     then simplicity, then speed of building. Record which rule broke the tie.

═══════════════════════════════════════════════════════════════════════════════
B · THE TASK RECORD
═══════════════════════════════════════════════════════════════════════════════

Every task carries exactly these fields:

  ORDER        derived, recomputed every generation
  ID           permanent, never reused
  TASK         one line, an action with an object — "Build Form A" not "Form A work"
  WHY          one line: what breaks, or what stays impossible, if this is not done
  BLOCKED BY   ids, or NONE
  BLOCKS       ids, derived from the above — do not type it twice
  PREDICATE    the command or file test that makes the box tick
  STATE        DONE / READY / BLOCKED / DEFERRED — all derived. READY means every
               blocker is DONE. Nothing is READY by assertion.
  BENCHMARKS   which of B1-B40 this task moves, if any
  ESTIMATE     iterations, a JUDGEMENT, carrying the iteration it was made in

At the top of the file, three derived lines and nothing else:

  NEXT:      the lowest-ORDER task whose STATE is READY
  READY NOW: the count, and their ids
  BLOCKED:   the count, and the single id blocking the most others

That last one is the one worth having. The task blocking the most other tasks is the
real critical path, and it is rarely the one that feels most urgent.

═══════════════════════════════════════════════════════════════════════════════
C · WHAT GOES IN IT
═══════════════════════════════════════════════════════════════════════════════

Derive the task set from the artifacts; do not invent it. Five groups.

C.1  PREP — what stands between here and the first screen.
     From BUILD_STATE's RESUME and checkpoint 1: rejects.json, the B3 re-measurement
     with the three shapes named, the canonical fixture, the adversarial fixture, the
     React Native project scaffold with tokens and fonts, the store wiring. Each one
     blocks every screen task, so they sort to the front automatically rather than by
     being called urgent.

C.2  SCREENS — the priority, and the bulk of what remains.
     Derive the committed set from the build map and DEFERRED.md — A.3 items 1 to 3
     plus opening cash. Do not hard-code a list from memory; read it.

     EACH SCREEN IS NOT ONE TASK. It is a parent with the §B.6 bar as eight child
     tasks, each with its own predicate, because "the screen is done" is not checkable
     and these eight are:

       .1  every displayed figure traced to the engine through the real store —
           predicate: mutate one entry in the store, this screen's figures move
       .2  renders correctly against BOTH fixtures, canonical and adversarial
       .3  all four states exist: loading, empty, error, loaded
       .4  passes in three languages, in longest-string mode, at maximum font scale
       .5  contrast, touch target and text size checks pass for this screen
       .6  keypad present only if this is one of the seven; never beside a bottom nav
       .7  screenshots captured for both fixtures and committed
       .8  its TRACEABILITY row names the feature IDs it displays

     The parent is DONE only when all eight children are. Half a screen is not a
     screen, and this is what makes that enforceable rather than a slogan.

     Order the screens as already decided: the four form archetypes first, then the
     day-close list, then the cash check and its endings, with opening cash pulled
     forward into the committed set. Form A first because it is the hardest.

C.3  INSTRUMENTS — the cluster that becomes due the moment anything renders.
     One task per benchmark currently NOT INSTRUMENTED whose subject is about to
     exist: contrast, white-on-marigold, touch targets, text size, missing i18n keys,
     layout overflow, non-Latin numerals, client-log privacy, APK size, and the first
     of the performance set. Each BLOCKED BY the first screen and blocking nothing —
     but §5.13 makes them due in the same iteration, so they must appear as real
     tasks with real estimates rather than as an afterthought.
     Each instrument task's predicate is threefold: it exists, it fails on its planted
     defect (§5.12), and it moves when the world moves (§5.16).

C.4  VERIFICATION AND CLOSE-OUT.
     The adversary passes at their §6.1 cadence · the pre-stop check at iteration 35 ·
     the final full verification · the handover report with its six required sections.
     The 35 check blocks the handover, so it sorts correctly without being argued for.

C.5  HUMAN — REFERENCED, NEVER DUPLICATED.
     One task per HUMAN-ACTIONS.md entry, each carrying only its id and a pointer.
     HUMAN-ACTIONS.md owns the content; TASKS.md owns only the fact that something is
     waiting on it. These tasks are DEFERRED by definition, never BLOCKED — they must
     never make anything in the build unable to proceed, and the generator must fail
     if one of them appears in another task's BLOCKED BY.

═══════════════════════════════════════════════════════════════════════════════
D · BUILD AND CHECK
═══════════════════════════════════════════════════════════════════════════════

D.1  tools/gen-tasks.mjs reads the artifacts, evaluates every predicate, sorts, and
     emits TASKS.md. Task definitions live in a data file — id, title, why, blockers,
     predicate, estimate — and the markdown is pure output. Editing TASKS.md by hand
     is a defect; editing the data file is the supported operation.
D.2  check:tasks fails on: a cycle in the dependency graph; a task with no predicate
     that is not marked JUDGEMENT; a hand-edited TASKS.md that differs from a fresh
     generation; a duplicate or reused id; a human task appearing as a blocker.
     Negative-test each of those five.
D.3  Regenerate at the END of every iteration, before the report. The NEXT line is then
     always current, and the next iteration begins by reading one line rather than
     reconstructing the plan.
D.4  Put check:tasks in VERIFIERS.md with its planted defect and its response test.

═══════════════════════════════════════════════════════════════════════════════
E · THE TEST OF WHETHER IT WORKED
═══════════════════════════════════════════════════════════════════════════════

Delete every checkbox state, regenerate, and the file comes back identical. If it does
not, something in it was being remembered rather than derived — and that something is
the part that would have gone stale.

Then resume at the NEXT line it produces.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## Why the per-screen breakdown matters more than the numbering

"Build Form A" has no honest predicate. It gets ticked when someone feels it is done, and it is exactly the shape of task that arrives at iteration 40 as nine screens that mostly work. The eight children each have a real test — mutate an entry and see if the number moves, render against the adversarial shop, check the keypad is not beside a bottom nav — so the parent cannot be ticked by feel.

That is also what makes the screen count trustworthy at the end. Nine screens where every child is green is a different claim from nine screens, and the handover report needs to be able to tell them apart.
