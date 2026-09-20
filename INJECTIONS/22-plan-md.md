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

# 22-plan-md

# SWAFTO — injection 22: PLAN.md, the whole product in one document

A single document describing every feature, technical and not, is the right artifact to have. It is also the most dangerous kind of document this build could produce, for a reason twenty-six iterations have established repeatedly:

**A plan that restates decisions becomes a twenty-first source of truth, and it starts lying the first time anything underneath it changes.** The registry exists because a value with two homes drifts. `§5.6` exists because prose goes stale silently. `§5.14` exists because a status nobody derives is a claim. A hand-written PLAN.md violates all three at once, and it would violate them beautifully — long, complete, confident, and wrong by iteration 30.

So the prompt below builds it as a **derived document with a staleness check**: every fact generated from the artifact that owns it, every prose section pinned to the content hash of what it summarizes, and CI failing when a source moves and the plan does not.

That is also what makes it worth the iteration. It is the front page of the handover at 40, and it is the only document that would let someone who has never seen this repository understand what was built and what was not.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 22. Build PLAN.md — the complete product, technical and non-technical, in one
document. ONE ITERATION for the generator and the first render; it may run alongside the
layout work in injection 21 since both touch documents rather than code.

═══════════════════════════════════════════════════════════════════════════════
A · THE RULE THAT DECIDES WHETHER THIS DOCUMENT IS AN ASSET OR A LIABILITY
═══════════════════════════════════════════════════════════════════════════════

PLAN.md IS DERIVED. IT IS NEVER AUTHORITATIVE. It owns no fact. It restates nothing
that another artifact owns. If a reader needs the exact value, PLAN.md tells them which
file holds it.

  A.1  EVERY TABLE IS GENERATED, not typed — feature rows from TRACEABILITY.md, screen
       rows from the build map and DEFERRED.md, benchmark rows from
       BENCHMARKS-RESULTS.md, decision rows from DECISIONS-AUTONOMOUS.md, constants
       from packages/values. A typed cell in this document is a §5.14 defect.
  A.2  EVERY PROSE SECTION CARRIES A SOURCE LINE: which artifacts it summarises. At the
       foot of the file, record the CONTENT HASH of each of those artifacts as of
       generation.
  A.3  check:plan FAILS when any recorded source hash no longer matches. That is the
       staleness alarm: a source changed and the summary did not. Negative-test it by
       editing one source by a single character.
  A.4  NO NUMBER APPEARS IN PROSE. Numbers live in generated tables or in the registry.
       Prose says "the OTP code expires after the interval in the registry", never "ten
       minutes". This is the one rule that will feel pedantic and it is the one that
       keeps the document true.
  A.5  STATUS IS DERIVED EVERYWHERE — built, committed, deferred, blocked. Use the
       existing predicates. A feature marked done in PLAN.md and absent from the repo
       would be the eighth instance of the pattern.

═══════════════════════════════════════════════════════════════════════════════
B · WHAT GOES IN IT — EVERY SECTION, IN THIS ORDER
═══════════════════════════════════════════════════════════════════════════════

B.1  WHAT THIS IS
     Three paragraphs, no more. The problem a shopkeeper has at closing time, what the
     app does about it, and the one sentence that says what it refuses to do and why —
     no AI touches data entry, because the product's whole position is that the numbers
     are his, typed by him, and therefore trustworthy.

B.2  WHO IT IS FOR, AND THE CONDITIONS IT RUNS IN
     The shopkeeper: age range, languages, the shop, the phone, the network, the
     literacy and numeracy assumptions, what he does today on paper. Then the physical
     conditions that drove design decisions — shop daylight, one hand, a counter, a
     customer waiting. Each claim cites the Decisions document or the research that
     established it. Where an assumption has never been validated against a real
     shopkeeper, SAY SO in the line itself. That list is short and it matters.

B.3  THE PRODUCT POSITION
     Why correctness and trust rather than speed and features — competitors already
     ship free voice billing, so the wedge is being right rather than being fast. The
     four consequences that fall out of it: derive on read, append-only, offline-first,
     one engine. Cite ADR-001 and the Decisions document; do not re-argue them.

B.4  THE COMPLETE FEATURE INVENTORY — this is the heart of the document
     Generated from TRACEABILITY.md, one row per ID, every column derived:

       INPUTS        IN1 Sales (cash/UPI/udhar) · IN2 Purchase · IN3 Expenses ·
                     IN4 Credit collection · IN5 Party payment · IN6 Withdrawals ·
                     IN7 Actual closing count
       PRIMARY       P1 Total cash received · P2 Total cash paid · P3 Expected cash
                     balance · P4 Net sales · P5 Net purchase · P6 Total expenses ·
                     P7 Credit outstanding · P8 Supplier outstanding
       OPERATIONAL   OP1 Daily cash health · OP2 Expense pressure · OP3 Collection
                     efficiency · OP4 Payment due · OP5 Business movement ·
                     OP6 Cash deficit warning
       INTELLIGENCE  BI1 Profit trend · BI2 Sales consistency · BI3 Cash flow
                     stability · BI4 Working capital pressure · BI5 Inventory
                     (reserved, not V1) · BI6 Credit concentration

     Columns: ID · what it answers for the shopkeeper, in his terms, one line ·
     engine function · test · API surface · screen · gate if any · STATUS.
     Every row states what it is FOR before what it is. "P3 — how much cash should be
     in the box right now" earns its place; "P3 — expected cash balance" does not.

B.5  THE SCREENS
     All 27 from the build map, generated, marked COMMITTED, DEFERRED or CUT against
     DEFERRED.md. Columns: ID · name · what the shopkeeper does there · which feature
     IDs it displays · keypad yes/no · bottom nav yes/no · status. The keypad and nav
     columns exist because that pair has been wrong before and a table makes it
     visible.

B.6  CROSS-CUTTING BEHAVIOUR — the things that are not a screen and not a formula
     Languages and the rule that words localise and numerals never do · the two
     appearance modes and why they are not an age question · offline behaviour and what
     the shopkeeper sees when there is no signal · the day state machine, including
     the gap day the app refuses to guess · corrections against closed days ·
     skipped versus untouched sections · the aging vocabularies, "31+ days" for
     customers and "overdue" for suppliers, and why they differ · what survives
     process death and what deliberately does not.

B.7  TECHNICAL ARCHITECTURE
     The layer model and the DFD, by reference to the architecture document, not
     redrawn. Then: the stack and why (React Native, one shared TypeScript engine, and
     the fact that this is what removed the two-engine rule) · the data model D1-D5
     with the append-only enforcement at the database level on both engines · the
     Formula Engine's purity contract and the golden vectors · money as integer paise
     and the lint that enforces it · the sync design, the outbox that is built and the
     drain that is deferred · auth, phone and OTP only, and the session policy ·
     the rate limiter · the SMS port and why it takes a template id rather than a
     string. Each with a link to the ADR that decided it.

B.8  NON-TECHNICAL — LEGAL AND COMPLIANCE
     Generated from LEGAL-AUDIT.md. Every obligation as a row: DPDP notice, consent,
     rights of access/correction/erasure, grievance officer, breach notification,
     retention, data residency in ap-south-1 · Google Play Data Safety declarations ·
     the in-app deletion path AND the public deletion URL, both mandatory · Android
     runtime notification permission · the GST position, which is that the app
     produces no tax document and says so in its own copy · the payments position,
     which is that no money moves so no RBI licence applies, WITH the specific future
     feature that would change that · font and library licences. Each row: obligation ·
     what satisfies it · where that lives · status.

B.9  NON-TECHNICAL — OPERATIONS AND LAUNCH
     DLT registration: principal entity, header, twelve content templates, and the
     dependency that nothing ships without it · the SMS provider and cost per message ·
     support over WhatsApp with version and shop id pre-filled, and why not email ·
     backup and export for his accountant · the infrastructure and its monthly cost,
     including the NAT gateway that was deliberately not bought and what replaced the
     edge protection it would have implied · the release process and the rollback that
     has actually been executed.

B.10 THE QUALITY BAR
     Generated from BENCHMARKS-RESULTS.md — every benchmark, instrumented or not, met
     or not, with its measured value. Then one paragraph naming the governing rules a
     new contributor must not break, by number and in one line each.

B.11 WHAT IS NOT BEING BUILT, AND WHY
     From DEFERRED.md. Two categories, kept apart: DEFERRED BY SCOPE, which is a
     decision, and what it blocks — Play submission above all. And NOT IN V1 EVER for
     now: multiple shops, staff logins, email anywhere, social sign-in, in-app chat,
     referrals, profile photos, inventory. Say what it would cost to add each.

B.12 WHAT NEEDS A HUMAN
     From HUMAN-ACTIONS.md, verbatim. The six Odia and Hindi strings, DLT, the
     accounts, the domain, the grievance officer, the device checklist. Ordered by
     lead time, because DLT and a live privacy policy have calendar cost that no
     amount of building compresses.

B.13 HOW TO VERIFY EVERY CLAIM IN THIS DOCUMENT
     The commands. Anyone doubting a status runs one line. This section is what makes
     PLAN.md different from a pitch deck.

═══════════════════════════════════════════════════════════════════════════════
C · HOW TO BUILD IT
═══════════════════════════════════════════════════════════════════════════════

C.1  tools/gen-plan.mjs reads the owning artifacts and emits PLAN.md. Prose sections
     live in a separate source and are spliced in, so regenerating never overwrites
     written text and never lets a table go stale.
C.2  Run it. Read the output end to end as PROSE — §5.6.4's document pass. A generated
     document can be internally consistent and still say something false about the
     product.
C.3  Wire check:plan into the verification chain, and put it in VERIFIERS.md with its
     planted defect per §5.12 and its response test per §5.16.
C.4  Do NOT let this become a rewrite of the underlying artifacts. If generating a
     section reveals that a source is wrong or missing, file it as a finding and fix
     it in its own commit. The plan is a lens, not a hospital.

═══════════════════════════════════════════════════════════════════════════════
D · THE TEST OF WHETHER IT WORKED
═══════════════════════════════════════════════════════════════════════════════

A reader who has never seen this repository should, from PLAN.md alone, be able to
answer: what does this app do, who is it for, what exactly is built today, what is not
and why, what would stop it shipping tomorrow, and how would I check any of that
myself. If it cannot answer the last one, it is a brochure.

Then resume: rejects.json, the B3 re-measurement, both fixtures, the RN scaffold.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## The one rule that will feel excessive

`A.4` — no number in prose, ever. "The OTP expires after the interval in the registry" instead of "ten minutes". It reads awkwardly and it is the reason this document will still be true at iteration 40. Every number written into prose in this build has eventually disagreed with the code, including one that was about to be registered with a telecom operator.
