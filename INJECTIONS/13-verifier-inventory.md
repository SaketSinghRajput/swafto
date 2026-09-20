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

# 14-verify-the-verifiers

# SWAFTO — injection 13: verify the verifiers

Four items. The first is a contradiction with a nearly-frozen artifact and should be settled before anything else. The second is the pattern behind "three things claimed but never built", which is now the third instance of the same failure and deserves a mechanism rather than another fix.

**On the three claimed-but-absent scripts.** That is the most serious integrity finding of the build so far, and not because typechecking was missing for 17 iterations. It is because `BENCHMARKS.md` has been SHA-locked since iteration 6 and *nothing ever proved its commands were real*. The lock protected the thresholds and left the measuring instruments unexamined.

**On the font work.** `check:font` earning its keep twice over is the clearest vindication of §5.7 in the build. The 42 KB static instances with zero Odia glyphs is a perfect specimen of a defect that survives any review reading metadata instead of contents — it is a new attack pattern and it goes on the checklist.

**On the eslint hook.** Not routing around it was the right call, and I want to be plain that it was the right call even though it cost you the editor integration. An agent that works around its own guardrails because the guardrail is inconvenient has no guardrails.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 13. Adversary pass 01 accepted, including the SECURITY-AUDIT/Cloudflare
staleness — that is A6 and A2 firing together and it is exactly what the pass is for.
Four items, in cost order.

═══════════════════════════════════════════════════════════════════════════════
A · URGENT — THE OTP TTL CONTRADICTS A FROZEN ARTIFACT
═══════════════════════════════════════════════════════════════════════════════

Check this before continuing. You reported two numbers in two iterations:

  SMS-TEMPLATES.md, en: "Valid 10 min"     and     OTP_TTL_SECONDS = 600
  SECURITY-AUDIT TB6, now transcribed:     5 minutes

If the code now transcribes TB6, the English template tells a shopkeeper the code lasts
ten minutes and it dies in five. That is not a cosmetic mismatch:
  • It is a lie in the one artifact that CANNOT BE CHEAPLY CHANGED. Post-registration,
    fixing the wording is twelve re-registrations.
  • It lands on the user as "the code did not work", at the moment he is trying to get
    into his own ledger, with no way to tell a dead code from a wrong one.
  • After the A.4 rewrite, English is the ONLY language still carrying a validity
    claim — so the lie is narrow, permanent, and in the file about to be submitted.

Resolve it now, under the decision procedure, with the templates as the constraint
rather than the variable wherever that is defensible. R-006 is the same question, so
answer both together — my reading, as input not instruction:

  Five minutes is too short. SMS over a congested Indian cell is not a few seconds; it
  is routinely minutes, and a shopkeeper aged 35-70 does not have the phone in his hand
  when it arrives. The cost of a longer TTL is a code readable off a lock screen for an
  extra five minutes, on a single-user device behind a counter, protected by an optional
  app lock. The cost of a shorter one is a failed sign-in on a weak cell — which is the
  scenario, not the edge case. Priority 2 (trust) and priority 4 (works on a weak
  network) both point the same way. Ten minutes, and the template becomes true.

Whatever you decide, add a test that reads the TTL constant AND the template text and
fails if they disagree. This class of defect — a constant and the prose describing it
drifting apart — will recur everywhere the app states a number in copy.

═══════════════════════════════════════════════════════════════════════════════
B · NEW STANDING RULE — §5.12 THE VERIFIER INVENTORY
═══════════════════════════════════════════════════════════════════════════════

Three instances now, same family, escalating:
  1. maybe() — the test ran; its assertions did not.
  2. assertPaise 0/59 — the guard existed; it had never executed.
  3. typecheck, lint, the money rule — the commands were cited as evidence and DID NOT
     EXIST, for seventeen iterations, inside a SHA-locked benchmark file.

The pattern is not carelessness. It is that §5.1 has always been applied to checks and
never to the harness that runs them. BENCHMARKS.md froze the thresholds and left the
instruments unexamined, so a benchmark could be green because nothing measured it.

  §5.12.1  Build VERIFIERS.md: every command cited anywhere as evidence — in
           BENCHMARKS.md, in any gate's VERIFY line, in CI, in a §5.9 probe. For each:
           the command, what it claims to prove, the file that implements it, and the
           planted defect that makes it fail.
  §5.12.2  Every verifier must be proven to EXIST, to RUN, and to FAIL on its planted
           defect. A command that exits 0 because it resolved to nothing is the
           failure mode; assert on the work done, not on the exit code. A script that
           prints "0 files checked" and exits 0 is absent, not passing.
  §5.12.3  CI FAILS IF ANY COMMAND NAMED IN BENCHMARKS.md IS NOT IN VERIFIERS.md AND
           EXECUTABLE. The lock now covers the instruments as well as the thresholds.
           This is the check that would have caught all three instances above.
  §5.12.4  Run it retroactively over all 21 gates. Every gate marked PASS was marked so
           on the strength of a command; re-run each one now and confirm it exists,
           runs, and fails when it should. Expect this to reopen at least one gate. If
           it reopens none, treat that as a §6.6 empty pass and look harder.
  §5.12.5  npm run check:money is now the sole enforcement of constraint 6, and it is a
           bespoke script — precisely the shape of the three above. It goes into
           VERIFIERS.md first, with a planted float-arithmetic violation proving it
           fails.

═══════════════════════════════════════════════════════════════════════════════
C · CHECKLIST ADDITION — A11 · CONTENTS, NOT METADATA
═══════════════════════════════════════════════════════════════════════════════

Add to §6.3:

  A11 · CONTENTS, NOT METADATA — is the claim about the artifact's identity or about
        what is actually inside it? Instance: static font instances at 42 KB against
        858 KB, an apparent 85% saving, containing zero Odia glyphs — a defect that
        survives any review that reads file sizes, filenames or family names. Second
        instance in the same iteration: the near-miss on Noto, where the family name
        was verified and the licence was not.
        Ask: what did I check — the label or the payload? Open the payload.

This pattern applies well beyond fonts: a migration file that exists and is empty, a
translation bundle with the right key count and English values, a screenshot of the
right screen with stale data, a dependency at the right version from the wrong
registry. Where an artifact is binary or generated, inspect its contents.

═══════════════════════════════════════════════════════════════════════════════
D · R-007, AND THREE SMALLER THINGS
═══════════════════════════════════════════════════════════════════════════════

D.1  R-007, per-IP limits under carrier NAT — your doubt is correct and the spec is
     wrong as written. Indian mobile carriers run large-scale CGNAT; thousands of
     unrelated subscribers share an egress IP, and a per-IP limit tuned for a single
     user will lock out a whole neighbourhood of legitimate shopkeepers on the same
     cell. Rule it: per-NUMBER limits are the real protection and carry the strict
     thresholds. Per-IP stays, but as a WIDE backstop against a single host hammering
     the endpoint, set orders of magnitude looser, and it must never be the thing that
     blocks a genuine sign-in. Log per-IP saturation as telemetry rather than as a hard
     lock, and write the CGNAT reasoning into SECURITY-AUDIT so nobody tightens it
     later for looking loose.

D.2  DC-005, the proportional digits, is a §5.7 derived constraint and needs its check,
     not just the rule. Assert in CI that every money style sets tabular figures, and
     prove it by rendering 1111111111 against 0000000000 and comparing widths. "Every
     money style must set tabular-nums" is a convention until something enforces it.

D.3  The process-death decision is right. A resurrected 45 where 450 belongs looks
     finished and is one tap from the ledger — discarding is the honest failure. Make
     sure the discard is VISIBLE: he should see that the field is empty, not be left
     wondering whether he already typed it.

D.4  The source: 'imported' as 'manual' cast is worth one more minute than it got. It
     was written to silence a compiler that was not running, which means it was never
     load-bearing — but source exists precisely so a future UPI import stays reversible.
     Confirm nothing else in that flow assumes the cast's lie, and add the value to
     rejects.json so the wrong one is refused rather than coerced.

═══════════════════════════════════════════════════════════════════════════════
E · QUEUE
═══════════════════════════════════════════════════════════════════════════════

A first — it touches a nearly-frozen artifact. Then B, retroactively over all gates,
because every PASS in the table currently rests on an unexamined instrument. Then
resume: DC-003's compensating control, the OTP service on the limiter, G7 and G8 with
rejects.json alongside, the two fixtures, then G10.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## The one to watch for in the next report

Whether §5.12.4 reopens a gate. Every `PASS` in that table was awarded on the strength of a command, and three of those commands turned out not to exist. If a retroactive sweep over 21 gates finds nothing, that is not reassurance — it is an empty adversary pass, and the rule already says what to do with one.
