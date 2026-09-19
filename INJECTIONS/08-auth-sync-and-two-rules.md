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

# 08-auth-sync-and-two-rules

# SWAFTO — injection 08: auth, sync, and two rules iteration 7 earned

Paste this instead of `Continue the loop.` It is a focused mid-loop injection, not a re-architecture. Three things go in: a landmine in G6 that would otherwise surface on launch day, a compensating control that AD-008 now requires, and the rule your own prose finding deserves.

---

## Why this one is not just "continue"

**The DLT landmine.** You cannot send a free-form SMS in India. TRAI's DLT framework requires the *content template* to be pre-registered and approved before a single message goes out, and operators scrub anything that does not match a registered template. An agent building an OTP service naturally writes `Your SWAFTO code is ${code}` as a string — and that string is unregistrable, because templates carry a small, capped number of variable slots and fixed surrounding text. If the `SmsPort` interface takes a message string, every call site is wrong, and you find out weeks later when registration is rejected. It has to take a **template ID plus an ordered variable array** from day one. Three languages means three registered templates, and the template text has to be written now so it can go into registration while the build continues.

**AD-008's second-order cost.** Taking Cloudflare out of the data path was the right call — inventing a position on whether foreign TLS termination is a DPDP transfer is exactly what the amendment forbids. But it leaves a `t4g.small` origin directly addressable, and you moved rate limiting into the API, which means the rate limiter is now doing security work on the same box that the attack lands on. That needs a decision this iteration, not at G9.

**Your prose finding is the more important of your two integrity catches.** The `maybe()` bug produced a green check with no coverage. The token purge produced a green check over text that *asserted something false* — "RESOLVED-AUTONOMOUSLY — needs counsel" is a contradiction no linter will ever see. In an autonomous loop the documents are the only record of why anything is the way it is; a corrupted one is worse than a missing one, because it will be believed. That earns a standing rule, not just a note.

**BI6.** You ran the procedure and landed on credit concentration independently, having eliminated expense drift under R3 for the right reason — free-text labels need inference, and inference is forbidden. That is the procedure working as intended rather than the tiebreak being followed. `P7 says he is owed ₹18,240; it does not say ₹11,000 of it is owed by one man` is the clearest one-line statement of the gap anyone has written in this project.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 08. Iteration 7 accepted in full: AD-001 (BI6 = Credit Concentration),
AD-008 (Cloudflare DNS-only, TLS on origin), AD-003 (grievance mechanism built,
release-gated). Your elimination of expense-category drift under R3 is correct — free
text labels require inference and constraint 1 forbids it. Proceed to G6 with the
additions below, which are specification, not suggestion.

═══════════════════════════════════════════════════════════════════════════════
A · NEW STANDING RULE — §5.6 PROSE INTEGRITY
═══════════════════════════════════════════════════════════════════════════════

Your LEGAL-AUDIT legend finding is promoted to a rule. It is the same species as the
maybe() bug and it is more dangerous, because in this loop the documents are the only
surviving record of why anything is the way it is. A wrong document will be believed.

  §5.6.1  No blanket find-and-replace across prose. Ever. A mechanical edit may touch
          code, identifiers, config and generated tables. It may not touch sentences.
          Sentences are edited one at a time, having been read.

  §5.6.2  After ANY mechanical change to a .md file, re-read every changed sentence in
          full and confirm it still asserts something true. Record in BUILD_LOG.md how
          many sentences you re-read. Not how many you changed — how many you read.

  §5.6.3  Add a contradiction check to CI over all .md files. It fails on any sentence
          containing a resolved-status token AND an unresolved-status token
          (RESOLVED / DECIDED / CLOSED against BLOCKED / PENDING / NEEDS / TBD /
          AWAITING), and on any reference to an AD, benchmark or gate ID that does not
          exist. Negative-test it per §5.1 by planting both failures.

  §5.6.4  Every §5.3 review now has a DOCUMENT PASS with equal weight to the code pass.
          Read LEGAL-AUDIT.md, SECURITY-AUDIT.md, DECISIONS-AUTONOMOUS.md,
          TECH-DECISIONS.md and SPEC-DIGEST.md as prose, asking of each claim: is this
          still true of the code that exists today? A document that was true at
          iteration 4 and is false now is a defect and gets a finding.

═══════════════════════════════════════════════════════════════════════════════
B · G6 — AUTH. READ THIS BEFORE WRITING THE SmsPort INTERFACE
═══════════════════════════════════════════════════════════════════════════════

B.1  DLT IS A DESIGN CONSTRAINT, NOT A LAUNCH TASK. India's TRAI DLT framework does
     not permit free-form transactional SMS. The Principal Entity registers a Header
     (sender ID) and, separately, CONTENT TEMPLATES: fixed approved text with a small,
     capped number of variable slots. Operators scrub messages that do not match a
     registered template. Research the current caps on variable count and length —
     they vary by operator and they are tighter than you expect — and design to the
     tightest one you find.

     THEREFORE: SmsPort MUST NOT accept a message string. It accepts
         { templateId, variables: string[], phone, languageTag }
     and nothing else. There is no free-text path, not even for development, because a
     free-text path in dev is how a free-text call site reaches production. The local
     stub resolves templateId against the same registry the real provider will use, and
     THROWS on an unregistered id or a variable-count mismatch.

     Write SMS-TEMPLATES.md now: the exact final text of every template, in Odia, Hindi
     and English, with variables marked. Every OTP, every alert, every message the
     system will ever send. This file is what goes into DLT registration, so it must be
     complete and it must be final — changing a template after approval means
     re-approval. Add it to HUMAN-ACTIONS.md as "register these exact templates".
     Add a CI check that every templateId referenced in code exists in SMS-TEMPLATES.md
     and that the variable count matches.

B.2  RATE LIMITS MUST SURVIVE A RESTART AND BE SHARED ACROSS INSTANCES. An in-memory
     rate limiter is the default an agent reaches for and it is worthless here: it
     resets on deploy, and it counts per-process. The OTP limits are now the only thing
     standing between an attacker and your SMS bill, so they are security-critical
     state. Decide the store under the decision procedure — Postgres is already there
     and adequate at this scale; Redis is faster and is another thing to run and pay
     for. Whatever you choose, prove it: a test that restarts the service mid-limit and
     asserts the counter survived.

B.3  OTP SPECIFICS, all tested:
     • Codes are 6 digits, generated with a CSPRNG, never sequential, never derived
       from the phone number or the clock.
     • Store only a hash of the code, never the code. Compare in constant time.
     • Single use. Invalidate on success, on expiry, and on a new code being issued.
     • Expiry short enough to matter, long enough for a 2G SMS to arrive. Choose it,
       justify it, and make it a named constant, not a literal.
     • Attempt limits per code, per number per hour, per number per day, per device,
       and per IP. The per-number-per-day limit is the one that protects your bill.
     • Lockout is a TIMED window that expires on its own. No state a shopkeeper cannot
       escape without support. Constraint: this must never lock him out of his ledger.
     • Enumeration: the response to "number exists" and "number does not exist" must be
       indistinguishable in body, status code AND timing.
     • The verification response must not leak whether the shop has existing data.

B.4  SESSIONS DO NOT EXPIRE ON THEIR OWN — the original constraint stands, and it has a
     consequence you must handle rather than inherit: a non-expiring token is a
     permanent credential on a device that gets lost, sold or repaired. Bind the
     session to the device, make it revocable server-side, and make revocation take
     effect on the next sync rather than waiting for a token to lapse. The app-lock PIN
     is the on-device defence and it is optional, so revocation is the real one.

B.5  NUMBER CHANGE, reachable without signing in, is the most likely support request in
     this product. Both paths built and tested: still has the old number, and does not.
     The second path must be honest on screen about taking a day or two. It must also
     be impossible to use as an account-takeover route — write the threat case into
     SECURITY-AUDIT.md and build to it.

═══════════════════════════════════════════════════════════════════════════════
C · AD-008 LEAVES THE ORIGIN EXPOSED. DECIDE THE COMPENSATING CONTROL NOW
═══════════════════════════════════════════════════════════════════════════════

Cloudflare DNS-only means a t4g.small is directly addressable on the public internet,
and B.2 has just put security-critical rate limiting on that same box. An L7 flood now
costs you the service and the SMS budget at the same time. This is a G9 item you must
decide at G6, because it changes the auth design.

Under the decision procedure, decide and record with a reversal trigger:
  • What absorbs an L7 flood before it reaches the API. AWS Shield Standard is
    automatic and free but is L3/L4 only. An ALB or CloudFront in ap-south-1 keeps
    termination in-region, unlike Cloudflare's global edge — check that before
    assuming it has the same DPDP problem. Note the cost of each option against the
    existing analysis; the no-NAT-Gateway ruling stands.
  • Whether unauthenticated endpoints — OTP request above all — get a stricter,
    cheaper-to-evaluate limit applied before any database work happens. An attacker
    should be rejected before he costs you a query.
  • How you shed load rather than falling over: what the API does when the limiter
    itself is saturated.
Write the chosen design into SECURITY-AUDIT.md as a new STRIDE row with its test.

═══════════════════════════════════════════════════════════════════════════════
D · THE VECTOR SHORTFALL — DO NOT BACK-LOAD IT
═══════════════════════════════════════════════════════════════════════════════

51 of 70. Nineteen vectors written in a hurry at G19 to hit a number is exactly the
failure §5.1 exists to prevent. Add them as you build G7 and G8, where the scenarios
are in front of you, and add each one because it encodes a case you had to think about —
never to raise the count.

Uncovered ground, by inspection of what you have described so far:
  • Sync-adjacent: entries arriving out of order; an entry arriving for a day that
    closed after it was created; the same entry arriving from two devices; an entry
    whose party was created on another device and has not arrived yet.
  • Clock: a device whose clock is wrong at a day boundary — your TECH-DECISIONS
    policy applied to a concrete case, in both directions.
  • Corrections: two corrections against one closed day; a correction against a day
    that itself contains a correction; a correction that takes an outstanding to zero;
    a correction that takes one negative.
  • Concentration (BI6): a single-customer shop, where the top share is 10000 bp; the
    day concentration crosses its threshold; a shop with two customers where the
    top-three share is undefined — decide and encode what it reports.
  • Skips: every section skipped; a skip reversed after the fact; a day closed with
    eight skips and one entry.
  • Boundaries: the exact day each BI gate opens, and the day before it.
Every vector states in one line the question it answers. A vector with no stated
question is a vector you wrote to hit 70, and it should be deleted.

═══════════════════════════════════════════════════════════════════════════════
E · G7 AND G8 — WHAT THE TESTS MUST ACTUALLY COVER
═══════════════════════════════════════════════════════════════════════════════

G7  The 2G case is the real case. Test against a profile with high latency, low
    bandwidth AND packet loss, not merely a throttled pipe.
    • A push killed mid-flight resumes without duplicating and without losing.
    • The same batch three times, byte-identical state — already specified, and it
      must hold with the batch INTERLEAVED with a second device's batch.
    • Server upsert is idempotent on a client UUID that already exists with DIFFERENT
      content. Decide what that means — a client should not be able to rewrite a
      committed entry by reusing an id — and prove the rule holds.
    • An outbox that has been offline for 30 days syncs without timing out, without
      exhausting memory on the device, and resumably.
    • Cross-tenant: a forged shop_id in a sync payload is rejected, and the rejection
      does not reveal whether that shop exists.

G8  The rule that matters is that there is no second arithmetic path.
    • Every endpoint's figures come from the shared engine. Add a static check that
      fails if arithmetic on a money field appears anywhere in the API layer.
    • Assert API output equals vectors.json exactly, not approximately.
    • §5.1: plant a deliberate off-by-one-paisa in an API response and confirm the
      comparison test catches it.

Resume at G6. Write SMS-TEMPLATES.md before you write the SmsPort interface.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## What I would watch in the next report

The template file is the thing to check by eye when it lands. It is the only artifact in this build whose text you cannot change cheaply after the fact — once those templates are through DLT registration, a wording change means going back round. It is worth reading all three languages yourself before anything gets submitted, because the Odia and Hindi strings are the ones no automated check in this loop can evaluate for meaning.

Everything else in this injection the loop can verify on its own.
