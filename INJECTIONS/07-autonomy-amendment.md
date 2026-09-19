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

# 07-autonomy-amendment

# SWAFTO — autonomy amendment

Paste this as your next message instead of `Continue the loop.` It replaces the loop's stopping rules, resolves every item currently sitting on a human, and adds the benchmark table that now defines "done".

---

## What can and cannot be self-decided — read this before you send it

You asked for zero human intervention. Almost everything qualifies. Four things do not, and pretending otherwise would just move the failure later:

| Item | Why no agent can do it | What the amendment does instead |
|---|---|---|
| DLT registration for transactional SMS | Requires a registered legal entity's documents submitted to a telecom operator by a person | Agent builds against a provider-agnostic SMS port with a working local stub; registration becomes a release-day item, not a build item |
| A named grievance officer | DPDP requires a real human with a real contact address | Agent writes the config key, the screen, the API and the policy text; a build-time assertion fails the *release* build if the key is unset — the loop is never blocked |
| An AWS account, GitHub repo, Play Console | Credentials belong to you | Agent proves the pipeline against LocalStack + docker-compose + a locally executed rollback. Real deploy is the last thing you do, and it is a credentials swap, not a build |
| A physical 2GB Android device | No device attached | Agent benchmarks on a constrained AVD (2GB RAM, 2 cores, throttled I/O) which is a legitimate proxy; a physical-device pass becomes a one-page checklist you run in an hour |

Everything else — BI6, BI4's missing stock proxy, the privacy policy text, the deletion web page, the seven "blocked on human" legal findings — the amendment hands to the agent with a decision procedure rather than a free hand.

**On your five findings:** all five are good, and the fake-pass one is the most important thing in the report. `maybe()` resolving at collection time while `reachable` is set in `beforeAll` is exactly the failure mode that makes an autonomous loop worthless — a green suite with no assertions. Finding it yourself is the right instinct; the amendment generalises it into a rule, because with no human reviewing, *every* check now has to be proven capable of failing. That is what the mutation-score benchmark is for.

**On BI4:** your call was right. The architecture removes stock data, so the prompt's `(P7 + stock proxy) vs P8` was written against a store that does not exist — my error, not yours. The Day-Close formula is the correct substitute.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
AUTONOMY AMENDMENT — this supersedes the loop's stopping and escalation rules.
Everything else in the original prompt stands unchanged: the eight non-negotiable
product constraints, the feature map, the gate sequence, and every anti-cheat rule.

Status report accepted. G0–G5 PASS. All five findings accepted, including BI4 —
the original BI4 formula referenced a stock proxy that D5 makes impossible, so your
substitution from the Day-Close document is correct and is now the specification.
Your section_skips store is accepted, including it not being append-only.
Resume at G6 under the rules below.

═══════════════════════════════════════════════════════════════════════════════
1 · YOU NOW DECIDE EVERYTHING
═══════════════════════════════════════════════════════════════════════════════

There is no human in this loop. Do not ask. Do not wait. Do not park a decision.
BLOCKED-ON-HUMAN is abolished as a status — every existing instance of it must be
resolved this iteration by the procedure below.

THE DECISION PROCEDURE — apply in this order and stop at the first rule that resolves it

  R1  The attached specifications. If a document settles it, it is settled.
      On conflict: Strategy 1 wins on component behaviour, Decisions wins on product
      rationale, Architecture wins on system structure.
  R2  A decision already recorded in SPEC-DIGEST.md, TECH-DECISIONS.md or
      DECISIONS-AUTONOMOUS.md. Do not reopen a settled decision to avoid a hard
      problem. Reopen only when you have evidence it is wrong, and say so in writing.
  R3  The eight non-negotiable constraints. Any option that weakens one is eliminated,
      however convenient it is.
  R4  The priority ordering, applied strictly in this sequence:
          1. Correctness of money       — a wrong rupee is the worst outcome available
          2. The shopkeeper's trust     — no surprise, no accusation, no inference
          3. Reversibility              — prefer what can be undone or migrated later
          4. Works offline and on a weak device
          5. Simplicity of the shipped thing
          6. Speed of building it       — last, always
  R5  Prefer the NARROWER scope. When ambiguity could be resolved by adding a feature
      or by not adding it, do not add it. An absent feature is a decision you can
      revisit; a shipped one is a decision your users now depend on.
  R6  Prefer the REVERSIBLE option. If two remain, choose the one that is cheaper to
      change in six months, even if it is more work now.
  R7  Still tied? Choose, in one line say why, and move. A tie means it does not
      matter enough to cost another iteration.

EVERY decision made under R4–R7 goes in DECISIONS-AUTONOMOUS.md as:
    ID · the question · the options · the rule that decided it · the choice ·
    THE TRIGGER THAT SHOULD REVERSE IT · the iteration and commit
That last field is mandatory. A decision with no stated reversal trigger is not a
decision, it is a guess, and you will rewrite it until it has one.

WHAT YOU STILL MAY NOT DO, whatever the priority ordering says
  • Weaken, delete, skip or rewrite a test to make a gate pass.
  • Change any threshold in BENCHMARKS.md. That file is frozen — see section 4.
  • Add inference, prediction, autocomplete, voice, camera or any AI to data entry.
    Constraint 1 is not subject to the decision procedure.
  • Store a computed total as authoritative, or make a ledger row mutable.
  • Invent a fact about Indian law. Research it or state the uncertainty in
    LEGAL-AUDIT.md and choose the conservative reading.

═══════════════════════════════════════════════════════════════════════════════
2 · RESOLVE THESE NOW, IN THIS ITERATION, BEFORE G6
═══════════════════════════════════════════════════════════════════════════════

2.1  BI6 — the cut-off sixth output. DECIDE IT. Procedure, not free invention:
     List every question a shopkeeper could ask that (a) is answerable from Entries,
     Days, Parties and section_skips alone, (b) is not already answered by P1–P8 or
     OP1–OP6, and (c) needs a multi-week window, which is what makes it BI-tier
     rather than operational. Rank by how much money a wrong answer costs him. Take
     the top one. Implement it behind a feature flag defaulting ON, with its gate
     stated in his own words like every other BI output.
     My own read, as a tiebreak only if your ranking is close: the gap in the set is
     CREDIT CONCENTRATION — what share of his udhar sits with his largest two or
     three customers, and whether that share is worsening. OP6 warns him about money
     he owes; nothing in the set warns him about money owed to him being dangerously
     concentrated in one person. Use it if your own analysis lands nearby; override it
     if your analysis says otherwise, and write down why.
     Record as BI6 in TRACEABILITY.md with the same five columns as every other row.

2.2  The seven legal findings marked blocked. Resolve each as follows:
     • Privacy policy, terms of service, DPDP notice, consent copy — YOU WRITE THEM.
       Full text, in the repo at /legal, in all three languages, matching the Play
       Data Safety declarations word for word. Add a CI check that fails if the
       policy and the Data Safety declaration file disagree on any collected item.
     • The account-deletion web page — YOU BUILD IT. A static page in /web with a
       working request form posting to the deletion endpoint, deployable to any
       static host. The human action is publishing it, which is not your problem.
     • Grievance officer — write the config key, the About screen row, the API
       response field and the policy placeholder. Add a release-build assertion that
       fails if GRIEVANCE_OFFICER_NAME or GRIEVANCE_OFFICER_EMAIL is unset. The loop
       is never blocked by this; only a real release is.
     • Anything remaining — apply the decision procedure, choose the conservative
       reading of the law, and record it with its reversal trigger.

2.3  HUMAN-ACTIONS.md — create it. It holds ONLY things that are impossible in
     software: DLT registration, AWS and GitHub credentials, Play Console signup,
     domain and DNS, publishing the two legal pages, the grievance officer's name,
     and a one-page physical-device checklist. Each with what to do, roughly how
     long, and what it unblocks. NOTHING IN THIS FILE BLOCKS THE LOOP. If you are
     tempted to add an item that a sufficiently determined engineer could do in code,
     it does not belong here — decide it and build it.

2.4  The 15-07-2026 photograph is absent. Your corroboration from Day-Close p.9 is
     accepted as the authority for the feature map. Note it in SPEC-DIGEST.md as a
     provenance finding and stop treating it as an open question.

═══════════════════════════════════════════════════════════════════════════════
3 · GATES THAT WERE BLOCKED ON HARDWARE OR ACCOUNTS
═══════════════════════════════════════════════════════════════════════════════

Neither is blocked any more. Both have real, provable local substitutes. A substitute
is only valid if it can genuinely fail — prove that too.

G9  PIPELINE — prove it without a cloud account.
    • Write the Terraform for ap-south-1 in full. `terraform init && validate && plan`
      against LocalStack. Still no NAT Gateway — ₹4,393/month at zero traffic.
    • Bring the entire stack up with docker-compose: Postgres, the API, migrations,
      a seeded shop. Run the smoke test against it and paste the output.
    • Execute a REAL ROLLBACK locally: deploy vN, migrate, deploy vN+1 with a
      schema change, roll back to vN, and assert the data is intact and the API
      healthy. Paste the transcript. An unexecuted rollback is not a rollback.
    • Validate the GitHub Actions workflows by executing them locally (act or
      equivalent), not by reading the YAML.
    • Write DEPLOY-RUNBOOK.md: the exact ordered commands to go live once
      credentials exist, including the first migration and the first rollback.
    VERIFY: paste the plan summary, the smoke output, and the rollback transcript.

G18 PERFORMANCE — prove it without a physical device.
    Create a constrained AVD: 2048MB RAM, 2 cores, throttled storage, Android 11 as
    the floor. Run every benchmark in section 4 on it, in release mode, three times,
    and report the median and the p95. Scripted and repeatable — a number you got by
    hand once is not a benchmark.
    Also write DEVICE-CHECKLIST.md: the one-page manual pass on a real ₹7,000 phone,
    covering the things an emulator cannot tell you — sunlight legibility, thumb
    reach on the keypad, a real SIM's SMS delivery, and battery drain over a day.

═══════════════════════════════════════════════════════════════════════════════
4 · BENCHMARKS — THIS IS WHAT "DONE" MEANS NOW
═══════════════════════════════════════════════════════════════════════════════

Write BENCHMARKS.md containing exactly this table, then compute its SHA-256 and
commit the hash to benchmarks.lock. CI fails if the hash changes. You may not edit
a threshold. If you believe one is wrong, you may open a row in
DECISIONS-AUTONOMOUS.md arguing it — and you must still meet the original number or
record it as MISSED under 5.2.

CORRECTNESS — all mandatory, no tolerance
  B1   Golden vectors                        ≥ 70 vectors, 100% pass
  B2   Node vs Hermes divergence             exactly 0 across all vectors
  B3   Formula Engine branch coverage        100%
  B4   Formula Engine MUTATION SCORE         ≥ 90%
  B5   Backend line coverage                 ≥ 85%
  B6   Backend mutation score                ≥ 75%
  B7   App logic coverage (non-render)       ≥ 70%
  B8   Sync replay idempotency               3 replays, byte-identical state
  B9   30-day offline endurance diff         empty
  B10  Append-only enforcement               UPDATE and DELETE rejected at DB level
  B11  Cross-tenant isolation                shop A cannot read shop B, proven
  B12  Money float-arithmetic lint           0 violations
  B13  Traceability empty cells              0 (BI5 reserved is the only exemption)

PERFORMANCE — measured on the constrained AVD, release build, median of 3, p95 where stated
  B14  Cold start to first paint             ≤ 2500 ms
  B15  Cold start to interactive             ≤ 3500 ms
  B16  Today screen render, 365 days history ≤ 400 ms
  B17  Keypad keypress to glyph, p95         ≤ 80 ms
  B18  Entry save, local commit, p95         ≤ 150 ms
  B19  Full nine-section day-close compute   ≤ 250 ms
  B20  Reports render, 365 closed days       ≤ 1200 ms
  B21  Aggregate query over 10,000 entries   ≤ 100 ms
  B22  Peak memory during day close          ≤ 220 MB
  B23  Dropped frames scrolling Today        < 1%, no single frame > 32 ms
  B24  APK download size, arm64 split        ≤ 25 MB
  B25  Outbox of 500 entries on 2G profile   ≤ 90 s, resumable after a mid-flight kill

ACCESSIBILITY AND LOCALISATION — all zero-tolerance
  B26  Contrast, every pair, both modes      ≥ 4.5:1, 0 failures
  B27  White-on-marigold occurrences         0
  B28  Touch targets below 56dp              0
  B29  Body text below 17sp                  0
  B30  Missing i18n keys, od / hi / en       0
  B31  Layout overflow in any language       0
  B32  Non-Latin numerals in any money field 0

SECURITY
  B33  npm audit high or critical            0
  B34  Container scan high or critical       0
  B35  Secrets detected in repo or APK       0
  B36  Amounts, names or phones in logs      0, proven by grepping a full day close
  B37  OTP brute force and SMS-bomb limits   enforced and tested

COMPLETENESS
  B38  Screens implemented and navigable     27 of 27
  B39  Feature IDs with function+test+API+screen  IN1–7, P1–8, OP1–6, BI1–4, BI6 complete
  B40  Stubs, TODOs, unimplemented throws    0 in shipped paths

═══════════════════════════════════════════════════════════════════════════════
5 · INTEGRITY — because nobody is checking your work
═══════════════════════════════════════════════════════════════════════════════

5.1  EVERY CHECK MUST BE PROVEN CAPABLE OF FAILING. This is the generalisation of the
     maybe() bug you found, and it now applies to all of it. For each benchmark, break
     something deliberately, confirm the check goes red, revert, confirm green, and
     record both outcomes in BUILD_LOG.md. A check that has never failed is not
     evidence — it is decoration. Specifically confirm that every test file actually
     executes its assertions: assert on the count of assertions run, not on the suite
     being green.

5.2  A BENCHMARK YOU CANNOT MEET. Try three times, each attempt a different approach,
     each recorded. If it still misses: write the measured value, the three attempts,
     the reason you believe it is missing, and your recommendation, and mark it
     BENCHMARK-MISSED in BENCHMARKS-RESULTS.md. Then continue.
     YOU MAY NOT LOWER THE THRESHOLD. A missed benchmark honestly reported is a
     result; a met benchmark achieved by moving the line is a lie, and it is the one
     failure mode that makes this whole loop worthless.

5.3  ADVERSARIAL REVIEW AT EVERY PHASE BOUNDARY, not just at G20. After G9, after
     G16, and after G19, stop building and spend one full iteration attacking your own
     work as if you were paid to discredit it. Specifically hunt for: tests that
     cannot fail, mocks that hide missing behaviour, a second arithmetic path that
     bypasses the engine, a screen that renders the right number from the wrong
     source, and any place a total got persisted. Write the findings to REVIEW.md and
     re-open gates. A review that finds nothing was not a review — do it again.

5.4  NEVER PRINT A NUMBER YOU DID NOT MEASURE. Every figure in every report is
     accompanied by the command that produced it. If you are estimating, say
     ESTIMATED and say why you could not measure.

5.5  ITERATION BUDGET. Soft ceiling of 60 iterations. At 40, write PROJECTION.md: what
     is left, your estimate to finish, and what you would cut if forced. Keep going.
     At 60, if the stop condition is unmet, finish the current gate, run the final
     verification anyway, and report honestly against the benchmark table rather than
     continuing indefinitely.

═══════════════════════════════════════════════════════════════════════════════
6 · THE STOP CONDITION
═══════════════════════════════════════════════════════════════════════════════

Stop when, and only when, ALL of these hold:

  ✓ G6 through G20 are PASS, each with pasted command output
  ✓ Every benchmark B1–B40 is MET, or is MISSED with three recorded attempts
  ✓ DECISIONS-AUTONOMOUS.md has no unresolved question, and every entry has a
    reversal trigger
  ✓ HUMAN-ACTIONS.md contains only genuinely-impossible-in-software items
  ✓ BLOCKED-ON-HUMAN appears nowhere in any file
  ✓ benchmarks.lock still matches BENCHMARKS.md
  ✓ REVIEW.md exists for all four review points, each with real findings
  ✓ The full verification command exits 0
  ✓ The app runs end to end on the emulator: install, choose Odia, sign in, enter
    opening cash, close a full nine-section day, find a ₹250 shortfall, give a
    reason, see the closed summary, record a collection against a customer, go
    offline for three simulated days closing each, come back online, sync, and
    confirm the server's figures equal the device's

Then print:

  LOOP COMPLETE — AUTONOMOUS
  <gate table, all PASS>
  <benchmark table, every row MET or MISSED with its measured value>
  <count of autonomous decisions, and the five most consequential with their
   reversal triggers>
  <HUMAN-ACTIONS.md, verbatim — the only things left for a person>
  <the three weakest parts of what you built, and what you would do about them>

That last line is not optional and it is not a formality. You built this without
review. You know where it is thin. Say so.

Resume at G6 now. Do 2.1 through 2.4 first, in this iteration.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## Two things to expect

**Mutation score is where it will struggle, and that is the point.** B4 at 90% on the Formula Engine is a demanding bar — it means nine in ten deliberate corruptions of the arithmetic get caught by a test. Coverage says a line ran; mutation says a line *mattered*. With no human reading the diffs, it is the only mechanical defence you have against the class of bug you already caught once by hand.

**Section 5.2 is what keeps it honest rather than infinite.** "Never stop until everything works" and "never move the goalposts" are in tension, and an agent that cannot reconcile them either spins forever or quietly lowers a threshold. Three genuine attempts, then an honest MISSED with the measured number, resolves it — and a benchmark missed at 2700ms against a 2500ms target is information you can act on, where a silently rewritten target is not.

The realistic shape from here: 2.1–2.4 and G6–G8 in a handful of iterations, G9 slower because the rollback has to actually run, then G10–G16 is the bulk — 27 screens is most of what remains. The benchmark and review passes at the end will send it backwards at least twice. That is the loop working, not failing.
