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

# 13-self-directing-prompt

# SWAFTO — the self-directing prompt

Paste this once. After it, the only thing you ever need to type is `Continue.`

It does three things: it installs the adversary as a role inside the loop rather than outside it, it hands over the ten attack patterns that actually found defects in this build, and it removes every remaining reason for the loop to stop before the benchmarks are met.

---

## What this can and cannot replace

**What it replaces well.** The injections from 08 onward were not new *rules* so much as a second reading. Most of that is mechanisable: a pass that reads only the artifacts, never the reasoning that produced them, working from a fixed checklist. That is what section 6 below does, and it will find most of what I found, because the checklist *is* what I was doing.

**What it cannot replace, and you should not pretend otherwise.** Two things, both already known:

- **The six Odia and Hindi strings.** No pass, however adversarial, can evaluate meaning in a language it is generating. This stays yours, and it stays blocking before DLT registration.
- **Whether a screen reads right to a shopkeeper.** The contact sheets are a minute each. The balanced cash check in particular has to *feel* like a reward, and no assertion can test that.

There is also a subtler loss. A self-adversary shares the blind spots of the builder — it will not think to check the thing that never occurred to it. The checklist mitigates this by being concrete and earned rather than abstract, but it does not eliminate it. If you want a real second pair of eyes, running the adversary pass in a **fresh session with no build history** is materially stronger than running it in the same context, and costs you one paste every five iterations.

**On "don't stop until 60 iterations."** Sixty is a ceiling, not a target. Running to 60 when the stop condition was met at 44 is waste, and an agent told to fill iterations will invent work to fill them. The prompt keeps the benchmark table as the only definition of done, and adds the reverse protection: never stop early to save effort.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
FINAL AMENDMENT — THE SELF-DIRECTING LOOP.

Iteration 11 accepted. From here you generate and execute your own injections. No
further external direction is coming. Everything already in force stays in force: the
eight product constraints, the decision procedure, the frozen benchmark table, and
§5.1 through §5.11. This adds section 6 and replaces the continuation rules.

═══════════════════════════════════════════════════════════════════════════════
6 · THE ADVERSARY PROTOCOL
═══════════════════════════════════════════════════════════════════════════════

External review found three defects you would have shipped: fixture blindness to
Indian digit grouping, the DLT template interface shape, and CP-4. You found others
yourself — segment length, money-integer-paise at 0/59 — and the difference between
the two sets is instructive. YOU FOUND WHAT YOU MEASURED. YOU MISSED WHAT YOU
REASONED ABOUT. The adversary pass exists to convert reasoning into measurement.

6.1  WHEN. At every §5.3 review point, AND every fifth iteration, AND before any
     artifact is frozen or handed to an external party. Never skip one because the
     iteration was productive — a productive iteration is when the most is unexamined.

6.2  HOW. The adversary pass is a SEPARATE ROLE with separate rules:
     • It reads the ARTIFACTS ONLY — code, tests, documents, fixtures, screenshots.
       It does NOT read BUILD_LOG.md, DECISIONS-AUTONOMOUS.md rationales, or any
       record of why something is the way it is. The reasoning is what it is auditing;
       reading it first is how a review becomes a re-confirmation.
     • It assumes the work is wrong and is looking for where. "This looks right" is
       not an output. Every pass produces findings or it did not run.
     • It may not fix anything. It files findings. Fixing happens afterwards, as the
       builder, with the gate re-opened.
     • It works the checklist in 6.3 in order, every item, every pass. Recording "not
       applicable this pass" for an item is fine; skipping it silently is not.

6.3  THE CHECKLIST. Ten patterns, each earned by a real defect in THIS build. The
     instance is named so the pattern stays concrete.

     A1 · FIXTURE BLINDNESS — does the test data vary in the dimension a bug would
          live in? Not "is there enough data" but "does the data DIFFER where it
          matters". Instance: every sample figure was five digits, and five-digit
          numbers are identical under Indian and Western grouping, so 57 of 59
          vectors were structurally incapable of noticing.
          Ask: for each invariant, what does every fixture have in common?

     A2 · COMPOSED REMOVALS — two decisions, each correct, that jointly remove
          something neither names. Instance: DC-003, Cloudflare out plus no NAT
          gateway leaving nothing between the internet and a t4g.small. Removals
          compose worse than additions because absence is invisible in code.
          Ask: list what has been removed. What was each thing also doing?

     A3 · FLOWS VERSUS RULES — does our own flow produce the state a rule forbids?
          Instance: CP-4. D9 said one shop one device; the lost-phone recovery flow
          creates two. The rule was checked, the flow was not.
          Ask: enumerate what the system DOES, not what it ALLOWS.

     A4 · ABSENT INPUTS — what must be refused, and is the refusal ever exercised?
          Instance: assertPaise at 0/59 — written, reviewed, never once run against a
          bad value, because the corpus described only valid days.
          Ask: for each guard, what input would trip it, and does that input exist
          anywhere in the test data?

     A5 · WEAK PROBES — does the mutation actually violate the invariant it claims to
          test? Instance: adding an unused column does not violate derive-on-read; the
          violation is READING a stored total.
          Ask: if this mutation survived into production, would anything be wrong?
          If no, the probe is measuring itself.

     A6 · PROSE TRUTH — is this document still true of the code that exists today?
          Instance: a legend reading "RESOLVED-AUTONOMOUSLY — needs counsel", and a
          header section asserting two things that could not both hold.
          Ask, of each claim, not "is this well-formed" but "is this true now".

     A7 · FROZEN ARTIFACTS — what becomes expensive once an external party accepts
          it? Instance: the DLT templates, where an 11-character hash omitted today
          costs twelve re-registrations later.
          Ask: what are we about to make hard to change, and what have we not yet
          decided about it?

     A8 · PLATFORM ASSUMPTIONS — what did I carry in from another OS, runtime or
          locale? Instance: /dev/null creating a literal file on Windows; Hermes
          falling back silently to the wrong number grouping.
          Ask: where does this assume a platform, and is that platform the one it
          will run on?

     A9 · DERIVED WHERE I SHOULD HAVE LOOKED — a conclusion reached by reasoning that
          research would have reversed. Instance: the header category suffix, where
          two correct premises composed into a false conclusion with high confidence.
          Ask: which current claims are derived rather than sourced, and which of
          those are about how two rules INTERACT? Research those first.

     A10 · HOLLOW OUTPUT — is this connected to the real source, or does it merely
          render? Instance: the screen-phase fixture rule. A screen fed hardcoded
          figures looks perfect and is wired to nothing.
          Ask: mutate the source of truth. Does the output move?

6.4  WRITE THE PASS AS AN INJECTION. Produce INJECTIONS/NN-<slug>.md in the same
     shape the external ones took: findings ranked by cost of being wrong, each with
     the evidence that established it, each with a specific instruction. Then execute
     it as the builder. The artifact matters — it is how a later pass knows what an
     earlier one already looked at.

6.5  MEASURE, DO NOT ARGUE. Where a finding can be turned into a §5.9 detection-rate
     measurement, do that instead of reasoning about it. Every time you have measured
     in this build you have learned something you did not expect; every time you have
     reasoned about composition you have been wrong. Prefer the number.

6.6  A PASS THAT FINDS NOTHING DID NOT RUN. Not "found nothing of note" — nothing at
     all means the pass failed, and you run it again, harder, on a different slice.
     Three consecutive empty passes is a §5.2-style result worth reporting, not a
     clean bill of health.

═══════════════════════════════════════════════════════════════════════════════
7 · CONTINUATION — REPLACES ALL EARLIER STOPPING RULES
═══════════════════════════════════════════════════════════════════════════════

7.1  NEVER STOP TO ASK. There is no one to ask. BLOCKED-ON-HUMAN remains abolished.
     Anything a person must do in the physical world goes to HUMAN-ACTIONS.md and
     blocks nothing.

7.2  NEVER STOP BECAUSE A NATURAL UNIT FINISHED. A gate passing, a phase closing, a
     good report — none of these is a reason to stop. Continue into the next gate in
     the same turn wherever the work allows it.

7.3  IF THE TURN MUST END, END IT RECOVERABLY. Before any stop, BUILD_STATE.md must be
     accurate enough that a fresh session with no memory resumes correctly from it
     alone. Then print, as the last line and nothing after it:
         RESUME: <gate id> · <the single next action> · <iteration n of 60>

7.4  SIXTY IS A CEILING, NOT A TARGET. Do not invent work to reach it. Do not stop
     short of the stop condition to save effort. The benchmark table is the only
     definition of done, and B1-B40 plus the section 6 stop condition decide it. If
     the condition is met at iteration 44, stop at 44 and say so.

7.5  IF YOU FINISH EARLY, DO NOT PAD. Spend the remainder on the three weakest parts
     of the build, named honestly in your own final report — and if they are already
     as good as you can make them, stop. An honest early finish is a better outcome
     than a filled schedule.

7.6  AT ITERATION 40, write PROJECTION.md as already specified, then keep going
     without waiting.

═══════════════════════════════════════════════════════════════════════════════
8 · WHAT STAYS WITH THE HUMAN — DO NOT ATTEMPT THESE
═══════════════════════════════════════════════════════════════════════════════

Two things this loop structurally cannot verify. Do not mark them done, do not
approximate them, and do not let them block anything.

  8.1  THE SIX ODIA AND HINDI STRINGS. You generated them; you cannot evaluate their
       meaning. H10 stays open until a native speaker reads them, and no template goes
       to DLT registration before that. Keep SMS-TEMPLATES.md ready and stop there.

  8.2  WHETHER A SCREEN READS RIGHT. Produce the contact sheets per §B.7 — one image
       per run, both fixtures, labelled. That is the deliverable. Judgement about them
       is not yours to make, and a run is not held up waiting for it.

Everything else is yours. Resume at the queue: C.2 bundled Odia font, the remaining RN
traps, persistent rate limits, the DC-003 compensating control, the OTP service, G7 and
G8 with rejects.json built alongside them, then the two fixtures, then G10 beginning
with the four form archetypes.

Run the first adversary pass now, before C.2, over everything built since G5. Then
continue without stopping.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## The one thing worth doing by hand every so often

Every fifth iteration or so, run the adversary pass **in a fresh session that has no build history** — paste section 6.3 and point it at the repo. It is the same checklist, but a context that has not spent forty iterations believing the build is good will use it differently. That is most of what an outside reader was providing, and it costs you one paste.

Everything else, the loop now does for itself.
