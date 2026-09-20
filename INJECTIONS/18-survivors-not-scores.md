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

# 18-survivors-not-scores

# SWAFTO — injection 18: survivors are findings, scores are not

Three items. The registry looks right, and the two false positives you kept are both good calls — `APP_LOCK_PIN_DIGITS` beside `OTP_DIGITS` is injection 14 B.4 working as intended, and exempting quoted historical spans is correct, because rewriting C-8's quotation of the superseded TTL would destroy the record of a disagreement being resolved.

That exemption is also the one thing in this report I would watch, for a reason you found yourself at iteration 17.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 18. Iteration 23 accepted. Filing 56dp and 17sp as OURS rather than external —
because they are stricter than the platform's 48dp and that is a product decision about
who this app is for — is exactly the right distinction. Three items.

═══════════════════════════════════════════════════════════════════════════════
A · THE MUTATION HARNESS — SURVIVORS, NOT SCORES
═══════════════════════════════════════════════════════════════════════════════

The harness saw 170 of 303 tests. When you fix it, the score will move and the survivor
set will change — some of the twelve will die because the missing suites cover them, and
new ones will appear from the suites that were never running. Do not read the new number
as progress or regression: it is a different measurement of a different thing.

A.1  RECORD THE SURVIVOR SET, NOT THE SCORE. A percentage aggregates; a survivor list
     names. Before the fix, write down the twelve. After the fix, diff the sets and
     explain every arrival and every departure. A survivor that disappears because a
     previously-invisible test kills it is good news; one that disappears because the
     harness stopped generating it is not, and only the diff distinguishes them.

A.2  FOR THE AUDITED MONEY HELPERS, THE BAR IS ZERO UNEXPLAINED SURVIVORS — stricter
     than B4's 90%, and additional to it, not instead of it. B4 stays frozen at 90% and
     is measured as written. But twelve arithmetic-operator survivors inside the helpers
     that every rupee passes through could sit comfortably inside a 90% score and still
     be a real defect. Aggregate scores are the wrong instrument for a small, critical
     surface. Adjudicate each one individually.

A.3  EVERY SURVIVOR IS EITHER KILLED OR PROVEN EQUIVALENT. "Equivalent mutant" is a real
     category — `x + 0` versus `x - 0` genuinely cannot be distinguished — and it is
     also the easiest place to file something inconvenient. A survivor claimed as
     equivalent must carry the ARGUMENT for why no input could distinguish it, written
     out. If you cannot write that argument, it is not equivalent, it is uncovered, and
     it needs a test.

A.4  RUN §5.9 OVER THE RESULT. "Which tests killed this mutant, and how many" is a
     detection rate, and the same reading applies: a mutant killed by exactly one test
     is nearly as fragile as one that survives.

A.5  IF ANY SURVIVOR IN THE MONEY PATH IS REAL, IT OUTRANKS FORM A. Stop, fix it, and
     re-measure before a screen renders a figure through those helpers. This is priority
     1 against priority 6 and it is not a close call.

═══════════════════════════════════════════════════════════════════════════════
B · THE QUOTATION EXEMPTION — YOUR OWN ITERATION-17 LESSON APPLIES
═══════════════════════════════════════════════════════════════════════════════

You exempted quoted historical spans, correctly. You also wrote, at iteration 17, that
the exemption letting INJECTIONS/ keep its forbidden tokens made it the one place a
banned status could hide — and then pinned every injection by hash because of it.

Same shape. An exemption is a hole, and holes grow.

  B.1  Make it NARROW and MECHANICAL: a span is exempt only if it is inside quote marks
       AND carries an attribution to the artifact it quotes. Prose that merely mentions
       an old number is not a quotation and still fails.
  B.2  COUNT THE EXEMPTIONS AND PRINT THE COUNT every run. Not a failure — a number. An
       exemption count that grows is the visible form of a hole widening, and the
       failure mode you have hit five times is silence, not error.
  B.3  Negative-test it both ways: a fake quotation that should NOT be exempt must fail,
       and a real one must pass. You have the habit; this one is easy to test only in
       the passing direction.

═══════════════════════════════════════════════════════════════════════════════
C · QUEUE — UNCHANGED, WITH ONE NOTE
═══════════════════════════════════════════════════════════════════════════════

Mutation harness and the twelve survivors. Then rejects.json and the B3 re-measurement —
and note that these two are related in a way worth exploiting: the coverage gap you
measured is concentrated in rejection arms, and mutants in unreached rejection code will
survive. Building rejects.json may kill several survivors as a side effect. Do the
mutation diff AFTER rejects.json lands if the two arrive close together, so you measure
once against the real suite rather than twice against two partial ones.

Then the two fixtures. Then Form A over three iterations, with the diagnostic contact
sheet as soon as anything renders, and the checkpoint at 26.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## The short version

A mutation score is a number. A survivor list is a finding. For twelve survivors sitting inside the helpers that every rupee in this product passes through, the aggregate is the wrong instrument entirely — each one gets judged on its own, and "equivalent mutant" only counts when the argument for it is written down.
