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

# 19-polluted-window

# SWAFTO — injection 19: the polluted window, and where the next defect lives

`stdevMoney` is the find this build was insured against. A population divisor swapped for a multiplier, in a function every rupee of cash-discipline scoring passes through, undetectable by its only test because `[]` and `[500]` both return before line 179 — and genuinely indistinguishable at `n = 1`, which is exactly why the single test couldn't separate them. Uncovered, not equivalent. That distinction is the whole of A.3 and you drew it correctly.

The correction is worth more than the find. Reporting twelve kills, then discovering three instrument defects between the question and the answer, then reporting the real number — that is the loop working as designed. A `--prove` no-op plant catching two of the three is §5.1 paying for itself.

Two things follow from the sandbox discovery that I do not think have been chased, and one housekeeping fix.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 19. Iteration 24 accepted. stdevMoney is a real defect in the money path found
before a screen rendered through it, which is what A.5 was for. The correction of your
own earlier "all twelve killed" is the more valuable half — three instrument defects
producing a confident false table is the fourth distinct shape of the same family, and
this time you caught it yourself.

═══════════════════════════════════════════════════════════════════════════════
A · THE POLLUTED WINDOW — RE-DERIVE WHAT WAS MEASURED INSIDE IT
═══════════════════════════════════════════════════════════════════════════════

.stryker-tmp/sandbox-* was an untracked second copy of the repo that vitest discovered,
and it has been there SINCE ITERATION 17. Every test ran twice for seven iterations. You
fixed the tree. You have not yet asked what was measured while it was polluted.

A.1  ENUMERATE EVERY NUMBER RECORDED BETWEEN ITERATIONS 17 AND 24 and mark each
     SUSPECT or UNAFFECTED, with the reason. The test is what the measurement counts:
       • A COUNT OF TESTS is suspect — it may be a doubled count.
       • A DETECTION RATE is suspect in a specific and nasty way: "2 of 59 caught it"
         may have been ONE test counted twice. The §5.9 ratios taken in this window are
         the ones I would re-derive first, because a rate of 1 is the threshold you
         treat as fragile, and a doubled 1 reads as a comfortable 2.
       • A COVERAGE PERCENTAGE is probably unaffected — running the same test twice
         covers the same lines — but confirm rather than assume, because the two copies
         were not guaranteed identical.
       • A TIMING is suspect. Anything wall-clock measured in that window is wrong.
       • The intermittent G4 failure is now explained, so any judgement recorded about
         it in that window rests on a wrong cause.
     Re-derive the suspect ones. Where re-derivation changes a recorded value, say so
     in BUILD_LOG rather than silently replacing it — the correction is the record.

A.2  ADD A CHECK FOR THE CLASS, not the instance. Any untracked directory containing a
     second copy of package.json or a spec file is a test-discovery hazard. Fail the
     build on one. You gitignored the sandbox; the next tool that makes a working copy
     will not be stryker.

═══════════════════════════════════════════════════════════════════════════════
B · THE B3 GAP IS WHERE THE NEXT stdevMoney LIVES
═══════════════════════════════════════════════════════════════════════════════

You attributed the 14.29% branch-coverage gap to "rejection and gate-closed arms". That
is right and it is incomplete. stdevMoney was not a rejection arm — it was a function
whose only test hit an EARLY RETURN, so the body below the guard never ran with a
checked result. That is a third shape, and it is the one that just produced a real
money-path defect.

  B.1  Sweep the engine for the pattern specifically: every function with an early
       return, and whether any test reaches PAST every guard with an assertion on the
       result. Not "is the function tested" — is the code after the guard tested.
  B.2  Treat the remaining B3 gap as a DEFECT SURFACE, not as bookkeeping. One of
       twelve survivors was real; the uncovered arms are where the rest of that
       population lives. Closing the gap is a hunt, not a tidy-up, and rejects.json
       only addresses one of its three shapes.
  B.3  For any function where a parameter's SIZE changes the arithmetic — anything with
       a count, a length, a divisor, an average, a spread — the test set must include
       n=0, n=1 AND n>=2. stdevMoney was invisible at n<=1 by construction. That is a
       general property of aggregate functions, not a quirk of this one.

═══════════════════════════════════════════════════════════════════════════════
C · THE CHECKPOINT WILL FIRE FOR THE WRONG REASON — RESTATE IT
═══════════════════════════════════════════════════════════════════════════════

Injection 17 set a hard checkpoint: Form A built and instrumented by the end of
iteration 26. Injection 18 then deliberately reordered rejects.json and the B3
re-measurement ahead of it, which was correct. Those two instructions now conflict, and
the checkpoint would fire at 26 because of a REORDERING I ASKED FOR, not because of
slippage.

A checkpoint that fires for the wrong reason teaches you to ignore checkpoints. Restate
it, in two parts:

  • By the end of ITERATION 26: rejects.json, the B3 re-measurement, the A.1 sweep and
    both fixtures are done, and the React Native project is scaffolded. If they are
    not, re-cut then.
  • By the end of ITERATION 29: Form A is built and instrumented. If it is not, re-cut
    the screen set immediately — from the bottom of A.3 items 1-5, never from §B.6.

Record which checkpoint is live in PROJECTION.md so the next iteration does not have to
reconstruct it.

═══════════════════════════════════════════════════════════════════════════════
D · SMALL
═══════════════════════════════════════════════════════════════════════════════

D.1  Holding FINDINGS.md's stale judgement at 13 rather than clearing it was right —
     clearing a staleness marker without re-stating the thing it marks is the §5.14
     defect wearing a different hat. Re-state the seventeen severities in an iteration
     where you can do it honestly, and let the marker clear itself as a consequence.

D.2  Reclassifying B4/B6 to NOT INSTRUMENTED, taking INSTRUMENTED from 16 down to 14,
     is the honest direction and worth naming as such. A number that moves backwards
     because the measurement got more truthful is the only kind of backwards movement
     that is good news. mutation:money is not a substitute for B4 and you were right
     not to let it count as one.

═══════════════════════════════════════════════════════════════════════════════
E · QUEUE
═══════════════════════════════════════════════════════════════════════════════

A.1's sweep first — it is cheap, and it tells you which of the last seven iterations'
numbers you can still trust before you build more on top of them. Then rejects.json and
the B3 re-measurement with B.1-B.3 folded in. Then the two fixtures and the RN scaffold.
Then Form A over three iterations, diagnostic contact sheet as soon as anything renders.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## The short version

You fixed the tree; now check what was measured while it was crooked. Seven iterations of test counts and detection rates were taken against a doubled suite, and the detection rates are the dangerous ones — a `2` that was really one test counted twice reads as comfortable when it is exactly the fragility threshold you set.

And the B3 gap is not bookkeeping. One survivor in twelve was real, and the uncovered arms are where the rest of that population lives.
