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

# 11-detection-rate-and-cp4

# SWAFTO — injection 11: detection rate, and CP-4 is not latent

Short one. The loop is executing well; this adds three things and leaves the queue alone.

The 2-of-59 measurement is the most useful thing in iteration 10, and not because it confirmed the locale bug. It is a **technique**: inject the violation of an invariant, then measure what fraction of the suite notices. `Prove a check can fail` is binary and 2/59 passes it — while revealing a suite that is 97% blind to a whole class of error. The number is the finding, not the pass.

And CP-4 is not as latent as it looks. There is already a specified flow that puts two devices on one shop.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 11. Iteration 10 accepted. CP-3 recorded as a deliberate counter-example is
good discipline — a rule that only ever fires positive stops being a rule and becomes a
bias. Three additions, queue otherwise unchanged.

═══════════════════════════════════════════════════════════════════════════════
A · NEW STANDING RULE — §5.9 DETECTION RATE, NOT DETECTION
═══════════════════════════════════════════════════════════════════════════════

2 of 59 is the finding. §5.1 asks whether a check CAN fail, which is binary, and 2/59
passes it while revealing a suite 97% blind to an entire class of error. The ratio
carries information the pass/fail does not: it measures the DIVERSITY OF THE TEST DATA,
not the correctness of one check.

  §5.9.1  For every critical invariant, inject its violation and report the DETECTION
          RATE — how many of the relevant tests caught it, out of how many ran. Record
          it in BUILD_LOG.md as a ratio, never as "caught".
  §5.9.2  A low detection rate is a finding IN ITS OWN RIGHT, about the fixtures rather
          than the code. Below roughly one in five, open a finding and diversify the
          data. Do not raise the rate by adding tests that assert the same shape; add
          data that differs in the dimension the bug lived in.
  §5.9.3  Run §5.9.1 over the invariants that matter most, at minimum: money is integer
          paise; totals are derived and never stored; entries are immutable; a shop
          cannot read another shop; the client and server agree; every displayed figure
          comes from the engine. For each, inject, measure, record.
  §5.9.4  This is your own technique. It found in one iteration what reasoning took an
          external prompt to surface. Prefer it to argument wherever an invariant can
          be violated mechanically.

═══════════════════════════════════════════════════════════════════════════════
B · CP-4 IS NOT LATENT — A SPECIFIED FLOW ALREADY CREATES TWO DEVICES
═══════════════════════════════════════════════════════════════════════════════

You recorded CP-4 as untestable under D9 and deferred it to D9's reversal trigger. That
was the right call for the general case. But check this specific one before you move on,
because it is not hypothetical and it is not blocked by D9.

The lost-phone branch of the number-change flow (A7, "he does not have the old number")
produces exactly two devices holding the same shop:
  • The NEW device, signed in, writing entries.
  • The OLD device — lost, sold, or repaired — which still holds a session that BY
    DESIGN never expires, and a local outbox that may contain days of unsynced entries.

Now compose that with sync. When the old phone is found, sold on, or simply powered up
by a repair shop weeks later, it syncs. Its outbox lands on a shop that has moved on.
Entries written by the new device may already exist for those days. Days may already be
closed that the old device thinks are open.

Questions to answer, decide and TEST, all of which are answerable today without the
conflict machinery D9 forbids:
  1. Does completing a number change REVOKE the old device's session server-side? If
     not, injection 08 B.4's revocation requirement is unmet in the one flow that most
     needs it.
  2. If a revoked device syncs, what happens to its unsynced outbox? Silently dropping
     a shopkeeper's real entries is the worst answer available. Rejecting them and
     telling nobody is second worst.
  3. Can a revoked device's entries land in a CLOSED day? Constraint 3 says a closed day
     is corrected, never edited — so the answer must be no, and the mechanism that
     enforces it needs a test.
  4. Does the new device's day-close arithmetic change if old-device entries arrive
     after the close? Run it through the engine and see. If a closed day's figures can
     move, that is a correctness defect at priority 1.

This is a two-device scenario that does not require modelling concurrent editing — it is
sequential, one device is revoked, and the question is only what happens to what it
carries. Build the test. Then record whether D9 as written is still accurate, because a
product assumption that its own recovery flow violates is not an assumption, it is a gap.

═══════════════════════════════════════════════════════════════════════════════
C · NEW STANDING RULE — §5.10 A LESSON RECORDED TWICE BECOMES A MECHANISM
═══════════════════════════════════════════════════════════════════════════════

You patched JavaScript from Python and corrupted an escape sequence one iteration AFTER
recording that exact lesson. That is not carelessness, it is evidence: a note in a log
does not change behaviour, and you should stop expecting it to.

  §5.10.1  Any mistake you make twice stops being a log entry and becomes a MECHANISM —
           a check, a wrapper, a lint rule, a script that makes the wrong path
           impossible rather than discouraged.
  §5.10.2  Apply it now to the one you have: no tool in this repo edits a source file by
           string substitution from another language. Whole-file rewrite, or a parser
           for that language. Make it a check over your own tooling, not a rule you
           intend to follow.
  §5.10.3  The Windows /dev/null incident is the same species — an assumption from
           another platform silently producing a file. Add the platform assumptions you
           have already tripped over to a check, since this repo is being built on
           Windows and will be built on Linux in CI.

═══════════════════════════════════════════════════════════════════════════════
D · QUEUE — UNCHANGED
═══════════════════════════════════════════════════════════════════════════════

C.2 bundled Odia font, remaining RN traps, persistent rate limits, DC-003 compensating
control, OTP service, G7/G8 with the vector shortfall closed along the way. Then the two
fixtures, then G10 starting with the four form archetypes.

Fold B into the OTP and sync work rather than treating it as a separate gate — questions
1 and 2 belong with the auth service, 3 and 4 with G7.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## One note for you rather than the loop

§5.9 is worth remembering outside this project. "Can this test fail?" is the question most people stop at; "what fraction of the suite notices when I break this?" is the one that finds blind test data. The loop invented it under pressure and then reported the number honestly rather than the outcome — that is the behaviour that makes the rest of the build's claims worth believing.
