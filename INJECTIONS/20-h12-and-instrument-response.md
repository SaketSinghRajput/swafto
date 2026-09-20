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

# 20-h12-and-instrument-response

# SWAFTO — injection 20: my error, your disproof, and H12 is solvable today

**Injection 19's premise was wrong and I should own how.** I read "the sandbox is the intermittent G4 failure seen since iteration 17" in your report, believed it, and built a seven-iteration sweep on top of it. I did not check whether Stryker had even run before iteration 20 — which would have killed the claim in one step, because no sandbox can predate its first run.

That is §5.14 applied to me: *I trusted a record instead of deriving*. The rule is about the build's own files, but it is really about anyone reading them, and I am the reader who was supposed to be outside the loop's assumptions. Your three disproofs — Stryker's first run, the recorded 303 counts at 19 through 22, and the sandbox dating itself by which injection it contains and which tests it lacks — are all re-derivable, and that is what made them decisive against two confident claims, mine and your own earlier one.

The sweep still had value, and not the value I claimed for it: it found that the recorded "170 of 303" is not reproducible, and the real figure is 275 of 309.

**Your Stryker disproof is the best instrument finding of the build.** Four new tests provably kill a mutant; the harness reports that mutant surviving, and the whole survivor set unchanged, mutant for mutant. No test count is needed for that argument. It generalises, and it belongs in the rules — section B.

**And H12 is solvable right now.** The verbatim injection 14 is already on your disk.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 20. Iteration 25 accepted, including the disproof of injection 19's premise.
That premise came from your own iteration-24 entry, which I read and amplified without
deriving — the same failure §5.14 names, committed by the reader rather than the writer.
Both claims are retracted: yours in BUILD_LOG, mine here.

═══════════════════════════════════════════════════════════════════════════════
A · H12 IS SOLVED — THE VERBATIM TEXT IS ON THE DISK
═══════════════════════════════════════════════════════════════════════════════

Do not write a paraphrase. You were right to refuse, and you do not have to.

Every injection was committed to the repository root as it was written, under a
different naming scheme from INJECTIONS/. At G:\SWAFTO\ you will find:

  SWAFTO-injection-08-auth-and-sync.md
  SWAFTO-injection-09-templates-review-and-client-traps.md
  SWAFTO-injection-10-screen-phase.md
  SWAFTO-injection-11-detection-rate.md
  SWAFTO-injection-12-rejection-corpus.md
  SWAFTO-injection-13-verifier-inventory.md
  SWAFTO-injection-14-instruments-first.md      <-- the missing one
  SWAFTO-injection-15-hard-stop-40.md
  SWAFTO-injection-16-server-behind-screens.md
  SWAFTO-injection-17-first-screen.md
  SWAFTO-injection-18-survivors.md
  SWAFTO-injection-19-polluted-window.md

SWAFTO-injection-14-instruments-first.md carries §5.13, A12 and the partition in the
words they were written in. Import it into INJECTIONS/ as 14, hash-pin it, and re-check
every citation of §5.13 and A12 against the real text rather than against your
paraphrase — the paraphrase may be accurate, and you cannot know that until you diff it.

Then RECONCILE THE WHOLE SET. The numbering collision that produced H12 —
14-verify-the-verifiers.md holding injection 13 — is unlikely to be the only one, and
INJECTIONS/ is hash-pinned, which means it is pinned to whatever was wrong. Diff every
file in INJECTIONS/ against its counterpart above, by content and not by filename, and
report any other mismatch. Filenames are metadata; the text is the artifact (A11).

═══════════════════════════════════════════════════════════════════════════════
B · NEW STANDING RULE — §5.16 AN INSTRUMENT MUST RESPOND, NOT ONLY FAIL
═══════════════════════════════════════════════════════════════════════════════

Your Stryker argument is a new and better test than anything in the rules so far, and
it should be a rule rather than a one-off.

  §5.1  asks: CAN this check fail?            (binary)
  §5.9  asks: HOW MANY tests catch a break?   (a ratio)
  §5.16 asks: DOES THIS INSTRUMENT MOVE WHEN THE WORLD PROVABLY MOVES?

An instrument can pass §5.1 and still not track. Stryker CAN report a kill; it simply
did not notice four new tests that demonstrably kill one of its own reported survivors.
A measurement that does not move when the thing it measures has provably changed is not
measuring — and that argument needs no test count, no coverage figure and no baseline.

  §5.16.1  Before an instrument's number is trusted, change the world in a KNOWN
           direction and confirm the number moves the right way by roughly the right
           amount. Add a test that kills a named mutant; the score must rise and that
           mutant must leave the survivor set. Break a token; the contrast figure must
           fall. Add an untranslated key; the missing-key count must rise by one.
  §5.16.2  A frozen number across a known change is a HARNESS FINDING, not a result,
           and it outranks whatever the number said.
  §5.16.3  Apply §5.16 to every instrument as it is built, alongside §5.12's planted
           defect. Planting proves it can fail; responding proves it can measure. They
           are different properties and B4 is the proof that a tool can have the first
           without the second.

═══════════════════════════════════════════════════════════════════════════════
C · SMALL
═══════════════════════════════════════════════════════════════════════════════

C.1  check:shadow catching what check-tooling structurally could not — because the
     latter skips dot-directories by name — is A12 in a new place: check-tooling's
     scoping axis is the directory name, and no plant had ever moved along it. Worth a
     line in REVIEW.md: every check has a scoping axis, including the checks that check
     the checks.

C.2  The B3 shape-3 finding is the one to carry into the next iteration. money.ts read
     97.61% with "one stdevMoney guard" six iterations ago and that line was read as
     bookkeeping — it was not the guard that was uncovered, it was the body below it.
     When you re-measure B3, read every remaining uncovered line as a candidate defect
     and say which of the three shapes it is. rejects.json addresses shape 1 only.

C.3  Refusing to write a paraphrase into INJECTIONS/ because it would produce a file
     that looks verbatim and is yours — that is the correct instinct and it is the
     same one behind §5.14. Keep it even now that the real text is available: import
     the file, do not retype it.

═══════════════════════════════════════════════════════════════════════════════
D · QUEUE — UNCHANGED, CHECKPOINT 1 LIVE
═══════════════════════════════════════════════════════════════════════════════

A first, it is minutes. Then rejects.json and the B3 re-measurement with shapes named,
then the two fixtures and the RN scaffold — all inside checkpoint 1 at iteration 26.
Form A by 29.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## The one line worth keeping from this exchange

§5.1 asks whether a check *can* fail. §5.16 asks whether it *moves*. Stryker passes the first and fails the second, and the argument that proves it needs no test count, no coverage figure and no baseline — just four tests that provably kill a mutant the tool still reports as alive.
