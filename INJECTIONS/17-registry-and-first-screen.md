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

# 17-registry-and-first-screen

# SWAFTO — injection 17: the registry, and what the first screen costs

Four items, all small. `BUILD_STATE` reading "Iteration: 7" at iteration 22 — in the file that holds the rule about hand-written numbers — is the funniest finding of the build and the right fix was removing the number rather than correcting it.

The thing worth flagging: **the first screen unblocks a cluster of instruments at once**, and I do not think your projection prices that. §5.13 says an instrument is due the iteration its subject exists, and roughly eight to ten subjects come into existence simultaneously the first time anything renders.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 17. Iteration 22 accepted. Removing the hand-written iteration number rather
than correcting it is the right instinct — a field that can be wrong will be. Four items.

═══════════════════════════════════════════════════════════════════════════════
A · THE REGISTRY — TWO THINGS TO GET RIGHT WHILE BUILDING IT
═══════════════════════════════════════════════════════════════════════════════

A.1  IT IS A MODULE, NOT A DOCUMENT. Code imports it; documents are checked against it.
     A markdown table stating the values is a second place for them to live, which is
     the defect it exists to prevent. If a document needs to show a value, generate that
     section from the module and let check:generated catch the drift.

A.2  VALUES FROM AN EXTERNAL AUTHORITY CARRY THEIR SOURCE AND THEIR DATE. Most registry
     entries are ours to choose — the TTL, the rate limits, the BI gates. Some are not:
     4.5:1 comes from WCAG, 30 characters and 70 characters come from DLT and GSM
     encoding, 56dp and 17sp come from platform guidance you researched. Those are
     §5.7 derived-or-researched facts, they can go stale, and a registry that flattens
     them into bare numbers loses the fact that they were ever sourced.
     Each such entry records where it came from and when it was established, and they
     appear in the §6.3 A9 sweep — "derived rather than sourced" applies to a constant
     exactly as it applies to a conclusion.

A.3  WHILE YOU ARE IN THERE: sweep for every remaining HAND-TYPED value in every
     tracking document, not only the iteration counter. Each one either becomes derived,
     joins the registry, or is deleted. The iteration number was the one you tripped
     over; enumerate the rest rather than waiting to trip over them.

═══════════════════════════════════════════════════════════════════════════════
B · THE FIRST SCREEN UNBLOCKS ~10 INSTRUMENTS AT ONCE — PRICE IT
═══════════════════════════════════════════════════════════════════════════════

The moment anything renders, these subjects exist and §5.13 makes their instruments due
in that same iteration:

  B26 contrast · B27 white-on-marigold · B28 touch targets · B29 text size
  B30 missing i18n keys · B31 layout overflow · B32 non-Latin numerals
  B36 amounts/names/phones in client logs
  and, as soon as an APK builds: B24 download size
  and, as soon as the emulator runs it: the first of B14-B23

That is a cluster, and building ten instruments is an iteration of work in its own
right — one you have not priced. Plan Form A as THREE iterations, not two:
  1. React Native project, tokens, fonts, store wiring
  2. The screen
  3. The instruments that its existence makes due
Splitting it this way is honest scheduling, not padding. Ten screens built against an
uninstrumented token set is ten screens to fix; the instruments pay for themselves on
screen two.

═══════════════════════════════════════════════════════════════════════════════
C · THE FIRST CONTACT SHEET MUST BE DIAGNOSTIC, NOT DECORATIVE
═══════════════════════════════════════════════════════════════════════════════

It is the first artifact in twenty-two iterations a human can judge, and a sheet showing
the happy English case answers none of the open questions. Build it to answer them.
Required frames, even if the screen is ugly and incomplete:

  1. Odia, with real Odia text — does Anek render, or is it tofu? A test cannot answer
     this; a person looking at it can, in one second.
  2. A money column containing a seven-digit and a five-digit amount together, so
     tabular alignment and DC-005's proportional-digit fix are both visible.
  3. Rs 1,50,000 rendered, proving the 2-2-3 grouping in the actual font on the
     actual screen — the bug 57 of 59 vectors could not see.
  4. The keypad open, with no system keyboard behind or beside it.
  5. The same screen at maximum font scale with the longest of the three languages.
  6. The adversarial fixture beside the canonical one.

Label every frame. Six diagnostic frames of an unfinished screen are worth more than
one polished frame of a finished one.

═══════════════════════════════════════════════════════════════════════════════
D · CHECKPOINT AT 26, NOT 35
═══════════════════════════════════════════════════════════════════════════════

Eleven screens in about seventeen iterations has no slack, and the place it will slip is
the first one. Set a hard checkpoint:

  IF FORM A IS NOT BUILT AND INSTRUMENTED BY THE END OF ITERATION 26, re-cut the screen
  set immediately — do not wait for 35. Cut from the bottom of A.3 items 1-5, never from
  §B.6, and re-state PROJECTION.md from the facts rather than editing it.

A plan that slips in its first unit and is not re-cut until two thirds through is how a
build arrives at its ceiling with nine half-finished screens. Nine complete ones beat
eleven partial ones, and the decision is cheap at 26 and expensive at 35.

═══════════════════════════════════════════════════════════════════════════════
E · QUEUE
═══════════════════════════════════════════════════════════════════════════════

The registry with A.1-A.3. Then the mutation harness and the twelve money survivors —
still the one live correctness question outstanding, and it outranks any screen. Then
rejects.json and the B3 re-measurement. Then the two fixtures. Then Form A over three
iterations, contact sheet as soon as anything renders.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## The one number I would watch

Whether the twelve arithmetic-operator survivors are real. They are the last open correctness question in the money path, and every screen from Form A onward renders figures that pass through those helpers. If they survive a fixed harness, that is worth stopping for — and it is much cheaper to find out before eleven screens are built on top of them than after.
