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

# 16-ad018-confirmed

# SWAFTO — injection 16: AD-018 confirmed, with three things that must not be dropped with it

**AD-018 stands. Do not reverse it.**

The reasoning you gave is right, and there is a stronger version of it available: this cut is only safe because of a decision made at G0. Constraint 2 says the local store is the source of truth and every write succeeds locally first. In almost any other product, deferring the server would gut the app. Here the day close is *entirely local by design* — sync is additive. You are not compromising the architecture to hit a deadline; you are collecting on it. State it that way in `DEFERRED.md`, because a future reader needs to know the deferral was sound rather than lucky.

Between a working day close with no sync and sync with no day close, the day close is the product. That was the right call and the analysis behind it — that cutting the bottom of A.3 removes screens you cannot reach the start of — was the part I got wrong in injection 15. The lever was a layer down and you found it.

**The fifth instance is the most remarkable one yet.** F-06's own fix going unapplied, discovered by writing F-06's predicate, is a finding about unapplied fixes whose fix was unapplied. Your response — no status words anywhere, only predicates — is the correct terminal form, and it generalises beyond this build: *any field a person or agent can write by hand will eventually be wrong; the fix is to make the field impossible to write by hand.*

That leaves one hole, which is section B below.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 16. AD-018 CONFIRMED — do not reverse it. Your A.7 analysis was better than
injection 15's instruction: the bottom of A.3 was the wrong lever because it removes
screens you cannot reach the start of. The server is the right cut.

Record in DEFERRED.md WHY it is safe, not just that it was chosen: constraint 2 makes
the local store authoritative and every write succeed locally first, so the day close is
complete without a server by design. Sync is additive. In most products this cut would
gut the app; here it collects on a decision made at G0. And note that what is deferred
is IMPLEMENTATION, not design — the schema, the OTP service, the rate limiter and the
SMS templates are all specified and tested to their layer. A continuation builds against
finished designs, which is a materially cheaper thing to hand over.

Three things must not be deferred WITH the server. Each is cheap now and expensive later,
and each is the same pattern as the client-generated entry UUID: preserve the option
while it costs nothing.

═══════════════════════════════════════════════════════════════════════════════
A · WHAT STAYS WHEN THE SERVER GOES
═══════════════════════════════════════════════════════════════════════════════

A.1  BUILD THE OUTBOX. DO NOT BUILD THE DRAIN.
     Every write goes through the outbox path and accumulates with its client-generated
     UUIDv7 exactly as it will when sync exists. Nothing drains it; that is the deferred
     part. If the outbox is not in the write path now, adding sync later means
     retrofitting every write site — which is the migration cost that the client-side
     UUID and the `source` column were specifically designed to avoid. The outbox is a
     table and a write; the drain is the eight iterations you cut.
     Add a test that closes a full day offline and asserts the outbox holds exactly the
     entries that were written, in order, with stable ids across a restart.

A.2  THE SHOP ID IS CLIENT-GENERATED FROM DAY ONE.
     With sign-in deferred, the app still has to create a shop locally. Generate its id
     as a UUIDv7 on the device, exactly like an entry. When the real sign-in lands, the
     server ADOPTS that id rather than assigning one, and no shopkeeper's local history
     needs migrating. If the local shop gets a placeholder id or an integer now, the
     first real sign-in becomes a data migration on a device holding months of a
     shopkeeper's ledger. Same insight as the entry UUID, same cost, same payoff.

A.3  B36 IS INSTRUMENTABLE TODAY — you listed it with B8 and B11 as never instrumented,
     and that is right for those two and wrong for this one. B36 says no amounts, names
     or phone numbers appear in logs, proven by grepping a full day close. A CLIENT day
     close produces CLIENT logs, and those are as dangerous as server logs — more so,
     because crash reporting ships them off the device, which makes them a DPDP matter
     under LEGAL, not just a hygiene one. Instrument it against the client the moment
     the first screen writes a log line. §5.13 applies: its subject will exist, so its
     instrument must.

═══════════════════════════════════════════════════════════════════════════════
B · NEW STANDING RULE — §5.15 JUDGEMENTS EXPIRE
═══════════════════════════════════════════════════════════════════════════════

Predicates close the hole for anything derivable. They cannot close it for anything that
is a judgement — and judgements go stale silently, which is the same failure in slower
motion.

  §5.15.1  Classify every field in every tracking document as DERIVED or JUDGEMENT.
           Derived fields have predicates and no status words, as you have now done.
           Judgements are the rest: PROJECTION.md's estimates, DEFERRED.md's "what it
           costs", a finding's severity, a benchmark's three-attempts narrative, an ADR's
           reversal trigger.
  §5.15.2  EVERY JUDGEMENT CARRIES THE ITERATION IT WAS MADE IN. A judgement older than
           five iterations is STALE and must be re-stated before it is relied on — not
           re-read, re-stated. Inheriting an old estimate without re-making it is how a
           projection stays optimistic while the facts underneath it move.
  §5.15.3  check:verifiers prints the stale judgements each iteration. It does not fail
           the build — a stale judgement is not a defect, it is a thing that needs
           thinking about — but it must be visible, because the failure mode is silence.
  §5.15.4  PROJECTION.md is the judgement this build most depends on and it has already
           been wrong once in the direction that matters. Re-state it at 30 and at 35,
           each time from the facts as they are, not by editing the previous one.

═══════════════════════════════════════════════════════════════════════════════
C · THE SCREEN PHASE — CHOOSE THE FIRST SCREEN TO BE HARD
═══════════════════════════════════════════════════════════════════════════════

You have roughly eleven screens and twelve iterations. The single biggest risk is
discovering a platform problem at screen nine.

C.1  THE FIRST SCREEN IS FORM A — repeating lines, cash sales — and it is chosen
     BECAUSE it is the hardest, not despite it. In one screen it exercises: the custom
     keypad and its suppression of the system keyboard, money formatting through the
     registry, tabular figures and DC-005's proportional-digit fix, bundled Anek Odia
     rendering, a sticky running total computed by the engine from the real store, and
     B.1's fixture rule end to end. Every unknown you have front-loaded for ten
     iterations is in that one screen.
     Budget TWO iterations for it: one for the React Native project, tokens, fonts and
     the store wiring, one for the screen. Expect the first to be ugly.

C.2  PRODUCE THE FIRST CONTACT SHEET AS SOON AS ANYTHING RENDERS — even a single screen,
     even if it is wrong. §B.7 says one per run; make the first one early rather than
     complete. It is the first artifact in twenty-two iterations that a human can judge,
     and the Odia rendering question in particular is answered by looking, not by a test.

C.3  AFTER FORM A, INSTRUMENT B26-B29 IMMEDIATELY — contrast, white-on-marigold, touch
     targets, text size — before screens two through eleven multiply whatever is wrong.
     §5.13: the subject now exists, so the instrument is due. Ten screens built against
     an uninstrumented token set is ten screens to fix.

C.4  IF SCREENS RUN SHORT, CUT FROM THE BOTTOM OF A.3 ITEMS 1-5, not from §B.6. Nine
     screens that each meet the full bar beat eleven that mostly do. Half a screen is
     not a screen, and neither is a screen that skips its four states or its second
     fixture.

═══════════════════════════════════════════════════════════════════════════════
D · QUEUE
═══════════════════════════════════════════════════════════════════════════════

The canonical value registry — it is needed BEFORE the screens, because the screens are
about to multiply user-facing copy containing numbers. Then the mutation harness and the
twelve survivors, since a live finding on the money path outranks a screen. Then
rejects.json and the B3 re-measurement. Then the two fixtures. Then Form A.

A.1 and A.2 are not separate work — they are constraints on how the first screens are
built, so read them again when you scaffold the project.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## What to expect next, and when to look

The first contact sheet is roughly six or seven iterations away — the registry, the mutation harness and the twelve money survivors, `rejects.json`, the fixtures, then the React Native scaffold and Form A. That image is the first thing in this entire build you can judge without reading a report, and the Odia rendering question in particular is answered by looking at it rather than by any test in the repo.

The twelve arithmetic-operator survivors are the thing I would want resolved before any screen exists. If they survive a fixed harness, that is a live defect in the money path, and every screen built on top of it inherits the problem.
