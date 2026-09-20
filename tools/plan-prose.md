<!--
THE PROSE OF PLAN.md. Tables are generated; this is what a person wrote.

Kept separate so regenerating never overwrites written text and never lets a table go
stale (injection 22 C.1).

A.4 IS ENFORCED, NOT REQUESTED: no numerals here, and no spelled-out number followed
by a unit. gen-plan.mjs fails on either. Prose names the artifact that owns a value;
it never repeats the value. Every number written into prose in this build has
eventually disagreed with the code, including one that was about to be registered with
a telecom operator.

Each section ends with a SOURCES line naming the artifacts it summarises. Their
content hashes are recorded in PLAN.md's footer, and check:plan fails when one moves.
-->

<!-- PROSE:what-this-is -->
At closing time a shopkeeper counts the cash drawer and tries to work out whether the
money in it matches the day he just had. He does it on a paper sheet, in sections:
what he sold for cash, what went out on UPI, what he gave on credit, what he collected
against old credit, what he bought, what he spent, what he took for himself. Then he
counts the notes. If the two do not agree he has to find out why, and by then the day
is over and the details have gone.

SWAFTO is that sheet, on his phone, with the arithmetic done for him. He types the same
figures in the same order and the app tells him what the drawer should hold, what it
actually holds, and the difference. When there is a difference it makes him say why
before the day can be closed, because an unexplained gap that is allowed to pass is a
gap nobody will ever explain.

**It refuses to guess.** No inference, no prediction, no autocomplete, no voice, no
camera, nowhere in data entry. This is the product's whole position rather than a
performance trade-off: the numbers are his, typed by him, and that is exactly why he
can trust the answer. A figure the app guessed is a figure he has to check, and a
figure he has to check is worse than no figure at all. Competitors already ship free
voice billing; the wedge here is being right, not being fast.

SOURCES: docs/spec/source/RetailDesk-V1.txt · docs/spec/source/SWAFTO-Retail-Desk-Day-Close.txt · docs/governance/DECISIONS-AUTONOMOUS.md

<!-- PROSE:who-it-is-for -->
**The shopkeeper.** Middle-aged to elderly, running a small retail shop in Odisha. He
reads Odia, sometimes Hindi, rarely English. He is numerate — he has been doing this
arithmetic by hand for years — but not literate in the way an app usually assumes, and
he has never used an accounting product. He does not want one. He wants the sheet to
add up.

**The phone.** A budget Android handset, at the price point named in the device
checklist. Slow, small, and shared. It may not ship with an Odia font at all, which is
why the app bundles one rather than trusting the system.

**The network.** Assume none. Not slow — absent. He closes the day in a shop with
thick walls after the tower has given up, and the app has to work anyway. Everything
is local first; anything needing a server is something he can finish without.

**The physical conditions**, each of which changed a design decision:

- **Shop daylight.** Direct sun on a cheap screen, so contrast is a hard requirement
  rather than a preference, and the value lives in the registry.
- **One hand.** The other is holding a bag, a pen, or the counter. Targets are sized
  for a thumb, and the size lives in the registry.
- **A customer waiting.** Entry has to survive being interrupted and resumed without
  losing what was typed.
- **A counter, not a desk.** The phone is held, not placed.

**WHAT HAS NOT BEEN VALIDATED, and this list matters more than the one above.** No
real shopkeeper has used this. Every claim here comes from the owner's research
documents, not from a session with a user. Specifically unvalidated: that he will type
a reason for a cash difference rather than abandon the close; that the aging buckets
match how he already thinks about old credit; that the Odia copy reads naturally,
which is an open item in the handover list and is not mine to judge; and that closing
on a phone is faster for him than closing on paper. The device checklist exists
because none of this can be settled inside this repository.

SOURCES: docs/spec/source/RetailDesk-V1.txt · docs/spec/source/SWAFTO-Retail-Desk-Decisions.txt · docs/handover/DEVICE-CHECKLIST.md · docs/governance/DERIVED-CONSTRAINTS.md

<!-- PROSE:product-position -->
The position is **correctness and trust**, not speed and features. It follows from who
the user is: someone who will abandon an app the first time it tells him a number he
knows is wrong, and who has no way to audit a number he did not type.

Four consequences fall out of it, and they are why the architecture looks as it does.

**Derive on read.** No total is ever stored. Every figure is computed from the entries
when it is shown. A stored total is a second source of truth, and a second source of
truth drifts silently — the same failure the value registry exists to prevent, one
layer down.

**Append-only.** A mistake is corrected by a new row pointing at the old one, never by
editing or deleting. What he typed is what the ledger says he typed, permanently.
Enforced by database triggers rather than by application code, on both engines.

**Offline-first.** The local store is authoritative. The server, when it exists, is a
backup and a sync peer, never the source of truth. That is what makes deferring the
server a scope decision rather than a correctness one.

**One engine.** A single shared TypeScript formula engine runs on the phone and on the
server, and the golden vectors run under both runtimes with the divergence required to
be zero. Two implementations of the same arithmetic is two answers to the same
question, eventually.

SOURCES: docs/spec/TECH-DECISIONS.md · docs/spec/source/SWAFTO-Retail-Desk-Decisions.txt · docs/spec/source/SWAFTO-Strategy-1-Two-Speed-Ledger.txt

<!-- PROSE:cross-cutting -->
**Languages.** Odia, Hindi and English. Words localise; **numerals never do**. Money
renders in Latin digits in every language, grouped the Indian way, because that is how
the figure is read aloud in all three. The derived-constraints document records why
this is not a preference: Odia and Hindi force a smaller SMS segment, and Odia digits
in the bundled font are proportional by default, so a column of figures does not line
up unless a font feature is switched on.

**Appearance.** Two modes, and the choice is not an age question. A larger, higher
contrast mode exists because of shop daylight and cheap screens, not because the user
is old. Framing it as an accessibility setting for the elderly is a way to make people
refuse it.

**Offline.** Everything he does works with no signal, and the app says so plainly
rather than showing a spinner. Entries queue in an outbox. The outbox is built; the
drain is deferred, so today it fills and never empties — recorded as a cut with its
cost, not hidden.

**The day state machine.** A day is open, closed, or a gap. **A gap day is one the app
refuses to guess about.** If he did not close a day, the app does not invent an opening
balance for the next one; it asks. Guessing here would silently corrupt every figure
downstream, and he would have no way to see that it had happened.

**Corrections against closed days.** A closed day is frozen. A correction is a new
entry in an open day that references the closed one, so the closed day's own figures
never move and the correction stays visible as a correction.

**Skipped versus untouched.** A section he deliberately marked as having nothing in it
is not the same as a section he never opened. The first is information; the second is
an incomplete close, and the app distinguishes them.

**Aging vocabularies differ on purpose.** Customer credit ages into buckets by elapsed
time. Supplier debt is described as overdue against a due date. Different words because
they are different facts: what a customer owes gets older, what a supplier is owed
becomes late.

**Process death.** What he typed into a form survives being killed by the operating
system. What deliberately does not: any partially computed total, because it is derived
on read anyway, and any session state that would let the app resume in a condition he
cannot see.

SOURCES: docs/governance/DERIVED-CONSTRAINTS.md · docs/spec/SPEC-DIGEST.md · docs/spec/source/SWAFTO-Retail-Desk-Flow-Strategy.txt · docs/spec/source/SCREEN-COPY-VERBATIM.txt

<!-- PROSE:architecture -->
The layer model and the data-flow diagram are in the architecture document and are not
redrawn here; this section says what was decided and points at the decision.

**The stack.** React Native, with one shared TypeScript formula engine used by both the
phone and the server. That single choice removed the two-engine rule the earlier design
carried: when the same code computes both answers there is nothing to reconcile.

**The data model.** Entries, days, parties and corrections, with append-only enforced
at the database level on both SQLite and Postgres. The triggers are tested by planting
a defect on several different columns, because a trigger narrowed to a single column
passed every test the suite had at the time.

**The formula engine is pure.** No input or output, no clock, no randomness, no
dependencies. It takes entries and returns figures. That is what makes the golden
vectors meaningful: the same vectors run under Node and under real Hermes, and the
divergence is required to be zero, so a figure cannot render differently on the phone
than on the server.

**Money is integer paise.** No floating point anywhere near it. A lint rule over the
whole engine enforces it and fails the build, and all division and rounding is confined
to a small set of audited helpers — which is where this build's one real money-path
defect was found, by mutation testing rather than by coverage.

**Sync.** Entries are written to an outbox as part of the write path, so nothing
depends on the network at the moment of entry. The drain, and the server that receives
it, are deferred.

**Auth.** Phone number and a one-time code, nothing else. No email, no social sign-in.
The code's lifetime, its length and every rate limit live in the value registry, and
the copy that states the lifetime to the user is generated from the same constant —
which is the specific defect that made the registry necessary.

**The rate limiter** is built, persistent and restart-proven, and it distinguishes
limits that deny from a backstop that only ever records.

**The SMS port takes a template id, never a string.** A free-text SMS parameter is an
injection surface and a compliance hazard at once: the regulator registers templates,
not messages, so a caller able to pass arbitrary text can send an unregistered one.

SOURCES: docs/spec/TECH-DECISIONS.md · docs/spec/source/SWAFTO-System-Architecture-and-DFD.txt · docs/audits/SECURITY-AUDIT.md · docs/spec/SMS-TEMPLATES.md

<!-- PROSE:legal -->
The full analysis, with statutory citations and the date each obligation becomes
enforceable, is in the legal audit. Where the law is genuinely unclear the audit says
so and takes the conservative reading rather than inventing a position.

**Data protection.** The app processes a phone number and the shop's own trade figures.
The obligations that follow: a notice in the user's language, consent captured and
withdrawable, the rights of access, correction and erasure, a named grievance officer
reachable without an account, breach notification, a stated retention period, and data
residency in the Indian region. Each is listed in the audit with what satisfies it and
where that lives.

**Play Store.** A Data Safety declaration matching what the app actually collects, and
deletion available **both in the app and at a public web address** — the second is
required even though the first exists, and missing it is a common rejection.
Notification permission is a runtime prompt on current Android.

**Tax.** The app produces **no tax document**. It is a private cash ledger, not an
invoicing product, and the copy says so in the user's own language so nobody mistakes
an estimated profit figure for a filing.

**Payments.** **No money moves through the app**, so no payment licence applies. The
specific future feature that would change that: accepting or settling a payment inside
the product, including a UPI collect request the app initiates. Recording that a UPI
payment happened elsewhere does not.

**Licences.** The bundled Odia font ships under an open font licence with its licence
file included, and every dependency licence is recorded in the audit.

SOURCES: docs/audits/LEGAL-AUDIT.md · docs/handover/HUMAN-ACTIONS.md

<!-- PROSE:operations -->
**Telecom registration comes first, because it has calendar cost.** The principal
entity, the sender header and every content template must be registered with the
telecom regulator's platform before a single message can be delivered. Nothing ships
without it, no amount of building compresses it, and the templates cannot be submitted
until a native speaker has reviewed the Odia and Hindi copy — which is why that review
sits at the top of the handover list.

**Messaging.** One provider, one template registry, and the per-message cost recorded
in the audit. The port refuses anything that is not a registered template id.

**Support over WhatsApp**, with the app version and the shop identifier pre-filled into
the message. Not email: the user does not use email, and a support channel he will not
open is not a support channel.

**Backup and export** for his accountant, in a form a spreadsheet can open. His data
leaves whenever he wants it to — both a legal obligation and the reason he can trust
the app with it in the first place.

**Infrastructure.** A small footprint in the Indian region. A managed address
translation gateway was deliberately not bought — its cost is a large fraction of the
monthly bill for a product with no users — and the protection it would have implied is
provided another way, which the security audit records rather than glosses.

**Release and rollback.** The release process is written down, and the rollback has
actually been executed rather than merely documented, which is the difference between a
runbook and a hope.

SOURCES: docs/audits/LEGAL-AUDIT.md · docs/audits/SECURITY-AUDIT.md · docs/spec/SMS-TEMPLATES.md · docs/handover/HUMAN-ACTIONS.md

<!-- PROSE:quality-rules -->
**The governing rules a new contributor must not break**, in one line each:

- **§5.1** — a check that has never failed has never been tested. Every verifier
  carries a plantable defect and must fail on it.
- **§5.6** — prose is never edited to make a checker pass, and evidence is never
  edited at all.
- **§5.9** — a defect caught by exactly one test is nearly as fragile as one caught by
  none.
- **§5.12** — every command cited as evidence is inventoried, and proven to fail.
- **§5.13** — an instrument is built with its subject, never after. A benchmark first
  measured near the end measures the harness.
- **§5.14** — status is derived, never asserted. Nothing is true because a file says
  so.
- **§5.15** — judgements expire; a stale one is re-stated from current facts rather
  than re-read.
- **§5.16** — an instrument must respond, not only fail: change the world in a known
  direction and the number must move.

SOURCES: INJECTIONS/

<!-- PROSE:not-building -->
Two categories, kept apart because they are different kinds of decision.

**Deferred by scope** is a choice made inside a fixed budget, with a cost and a
reversal condition recorded for each. The server block is the large one: the sync
drain, the read API and the real sign-in service. What each blocks is listed against
it, and Play submission is the item that matters — an app that cannot sync is
shippable, an app with no privacy policy at a live address is not.

**Not in this version, and not merely unscheduled**: multiple shops under one login,
staff accounts with their own permissions, email anywhere in the product, social
sign-in, in-app chat, referral mechanics, profile photos, and inventory tracking.
Inventory is the interesting one — not cut for budget, cut because the data model
cannot answer it. The reserved intelligence output that would have depended on it is
marked reserved for that reason rather than deferred.

Each carries its cost to add in the deferred document. The honest summary: the first
several are small and deliberately refused, and inventory is a different product.

SOURCES: docs/handover/DEFERRED.md · docs/governance/PROJECTION.md

<!-- PROSE:verify -->
Nothing here asks to be believed. Every status above is derived when the document is
generated, and these commands re-derive them:

```bash
npm run plan                # regenerate this document from its sources
npm run check:plan          # fail if any source changed and this did not
npm run check:all           # the whole governance chain
npx vitest run              # the test suite
npm run coverage            # what the tests actually reach
npm run prove:verifiers     # plant a defect in every check; each must fail
npm run responds:verifiers  # change the world; each instrument must move
npm run mutation:money      # every arithmetic mutant in the money path, adjudicated
```

If a feature row says an engine function is absent, `grep` for it in
`packages/formula-engine/src` and you will not find it. If a row said a screen exists,
you would look in `apps/mobile` — and there are none, which is why every screen row
says so.

**The one thing this document cannot verify** is whether the Odia and Hindi copy reads
naturally to someone who speaks them. No command settles that, and it is listed in the
handover as work only a person can do.

SOURCES: package.json · docs/governance/VERIFIERS.md
