# DECISIONS-AUTONOMOUS

Every decision taken without a human, under the amendment's decision procedure.

**Format is mandatory:** ID · question · options · deciding rule · choice ·
**reversal trigger** · iteration and commit. A decision with no stated reversal
trigger is not a decision, it is a guess.

Deciding rules: `R1` specifications · `R2` an already-recorded decision ·
`R3` the eight non-negotiable constraints · `R4` the priority ordering
(money correctness > trust > reversibility > offline/weak device > simplicity > speed) ·
`R5` narrower scope · `R6` more reversible · `R7` tie, choose and move.

---

## AD-001 · BI6 — what is the cut-off sixth output?

**Question.** Item 6 of the 15-07-2026 note is physically incomplete on the
photograph (`6. |`) and the photograph is not on disk. The Day-Close doc p.9
corroborates only that it exists and is unwritten. What should BI6 be?

**Options considered.** Restricted by the amendment's procedure to questions that are
(a) answerable from Entries, Days, Parties and section_skips alone, (b) not already
answered by P1-P8 or OP1-OP6, and (c) need a multi-week window.

| Candidate | Answerable? | Already covered? | Money cost of a wrong answer |
|---|---|---|---|
| **Credit concentration** - share of udhar held by the largest customers, and drift | Yes, from `udhar_sales` and `udhar_collection` per `party_id` | **No.** P7 gives the total; OP4/OP6 cover only what he *owes* | **Existential.** One default on a concentrated receivable can end the shop |
| Days-to-collect (udhar sale to collection) | Yes | Partly - OP3 gives a ratio, not a duration | High, slower-acting |
| Expense category drift | **No** - labels are free text | - | - |
| Close-discipline trend | Yes | Overlaps BI3's `deficitDayCount` | Medium |
| Supplier dependency concentration | Yes | Largely covered by OP4/OP6 | Medium |
| Weekday sales pattern | Yes | No | Low |

**Deciding rule.** **R3 then R4.1.** Expense category drift was *eliminated by R3*:
expense labels are free text, so grouping them into categories requires inference,
and constraint 1 forbids inference anywhere near data entry. Of what remained, R4.1
(correctness of money, and by extension the money most at risk) ranks credit
concentration first by a wide margin.

**Choice.** **BI6 = Credit Concentration.** Reports total outstanding, customer count,
the largest single debtor's share, the largest three customers' combined share, and
the direction of that share against a trailing baseline.

The gap it fills, stated plainly: *P7 says he is owed 18,240. It does not say that
11,000 of it is owed by one man.* Those are the same number and completely different
risks. OP6 warns him about money he **owes**; nothing in the set warned him about
money owed **to** him being dangerously concentrated.

**Gate: 14 closed days**, matching BI1/BI2/BI4. Behind `CREDIT_CONCENTRATION_ENABLED`,
default ON.

**Why this does not violate constraint 1.** It is ranking and division over figures he
typed himself. It makes no prediction, scores no customer, and suggests no action -
it reports a share he could compute from his own ledger. That is the same standard
every other output meets.

**REVERSAL TRIGGER.** The original 15-07-2026 photograph surfaces and item 6 says
something else. Then delete this and implement that - one TRACEABILITY row and one
engine function, exactly as scoped. Secondary trigger: if field use shows shopkeepers
cannot act on a concentration figure, demote it and promote days-to-collect, the
runner-up.

**Iteration 7 · commit `G6-pre`**

---

## AD-002 · BI4's "stock proxy" is unbuildable — confirmed as specification

**Question.** The original prompt specifies BI4 as `(P7 + stock proxy) vs P8`. No
stock data exists.

**Options.** (a) Invent a stock proxy from purchase data. (b) Use the Day-Close doc's
`(credit_out + supplier_out) / cash`. (c) Mark BI4 impossible.

**Deciding rule.** **R3.** Option (a) requires inventing data D5 forbids and the
architecture has no store for ("no input collects them, so no store holds them").
Option (c) is unnecessary because a computable formula exists in the specifications.

**Choice.** (b). **Ratified by the human amendment**, which states the substitution
"is correct and is now the specification." Previously recorded as OD-10.

**REVERSAL TRIGGER.** V2 introduces an item or stock section. Then BI4 gains the stock
term and this row is superseded.

**Iteration 6 · commit `3cd746a`**

---

## AD-003 · Grievance officer — the loop must never be blocked by an unnamed human

**Question.** DPDP s.13 requires a named grievance officer with a real contact. No
such person exists yet. Previously parked as blocked on a human.

**Options.** (a) Block the gate. (b) Ship a placeholder that reaches nobody.
(c) Build the whole mechanism and fail only the *release* build if unconfigured.

**Deciding rule.** **R4.2 (trust) and R6 (reversibility).** Option (b) is the worst
outcome available - a published grievance address that reaches no one is worse than an
honest absence, because it converts a compliance gap into a broken promise to a user.
Option (a) is forbidden by the amendment.

**Choice.** (c). The config key, About-screen row, API field and policy placeholder all
exist and are tested. A release-build assertion fails when `GRIEVANCE_OFFICER_NAME` or
`GRIEVANCE_OFFICER_EMAIL` is unset. Development and CI builds are unaffected, so the
loop is never blocked; only a real release is.

**REVERSAL TRIGGER.** The officer is named - set the two keys and the assertion passes.
No code change.

**Iteration 7 · commit `G6-pre`**

---

## AD-004 · SMS is a provider-agnostic port with a local stub

**Question.** DLT registration needs a legal entity and cannot be done in software.
How does auth get built and tested?

**Options.** (a) Block G6. (b) Hard-code a provider SDK. (c) Define an `SmsPort`
interface with a local stub for dev/test and a real adapter selected by config.

**Deciding rule.** **R6 (reversibility) and R1** - ADR-007 already anticipated this,
recording that "the integration surface is one `sendOtp()` function behind an
interface" and that the choice "deliberately does not block any gate."

**Choice.** (c). `SmsPort { sendOtp(phone, code, templateId) }`. The stub records
sends in memory so rate limits, throttles and failure states are all testable without
a carrier. Registration becomes a release-day item in HUMAN-ACTIONS.md.

**REVERSAL TRIGGER.** A provider is chosen and DLT-registered - write one adapter,
change one config value. If OTP delivery on the chosen route falls below ~97%, add a
second adapter behind the same port.

**Iteration 7 · commit `G6-pre`**

---

## AD-005 · Legal text is written by the agent, conservatively, and marked as unreviewed

**Question.** Privacy policy, terms, DPDP notice and consent copy need to exist. No
lawyer is available.

**Options.** (a) Block. (b) Write minimal boilerplate. (c) Write full text taking the
conservative reading wherever the law is uncertain, and mark it prominently as
requiring review before publication.

**Deciding rule.** **R4.2 (trust)** and the amendment's explicit instruction not to
invent facts about Indian law.

**Choice.** (c). Full text in `/legal`, all three languages, matching the Play Data
Safety declarations word for word, with a CI check that fails if the policy and the
declarations disagree on any collected item. Every clause where the law is genuinely
uncertain states the uncertainty in LEGAL-AUDIT.md and takes the reading that grants
the user more rights, not fewer.

A banner at the top of each document records that it is unreviewed by counsel. That is
a fact about the document, and hiding it would be the dishonest option.

**REVERSAL TRIGGER.** Counsel reviews the text. Their version replaces it wholesale.
Also: any change to what the app collects must update the policy, the Data Safety
declarations and this row together - the CI check enforces the first two.

**Iteration 7 · commit `G6-pre`**

---

## AD-006 · The party-data question — SWAFTO is Processor, the shopkeeper is Fiduciary

**Question.** The shopkeeper records his customers' names and phone numbers. Those
customers are Data Principals who never met SWAFTO. Who is the Data Fiduciary?
Previously parked as blocked on a human (L-03).

**Options.** (a) SWAFTO is Fiduciary for party data. (b) The shopkeeper is Fiduciary
and SWAFTO is Processor. (c) Joint fiduciaries.

**Deciding rule.** **R4.2 then R6.** (b) is the standard analysis: the shopkeeper
determines the purpose and means of recording his own customers' details, exactly as
he would in a paper ledger; SWAFTO processes on his instruction. It is also the
reading that most clearly places the duty with the person who actually has the
relationship with the data subject.

**Choice.** (b), **with the engineering hedges built regardless of which analysis is
right**, because they are cheap and they help under every reading: `parties.phone` is
nullable and visibly optional, per-party export exists, and per-party redaction exists.
The Terms state the shopkeeper's own obligations to his customers.

**REVERSAL TRIGGER.** Counsel disagrees, or the Data Protection Board issues guidance
placing joint responsibility on the processor. Then SWAFTO must serve notice to party
data subjects directly, which is a material product change - a screen and a
notification path, not a config flag.

**Iteration 7 · commit `G6-pre`**

---

## AD-007 · Retention — inactive accounts are erased after 3 years, with warning

**Question.** DPDP requires erasure when the purpose is served. What is the inactivity
period? Previously parked as blocked on a human (L-05).

**Options.** 1 year · 2 years · 3 years · never.

**Deciding rule.** **R4.2 (trust) and R5 (narrower).** Too short destroys records a
shopkeeper may need; Indian bookkeeping practice and tax enquiry windows commonly
reach back several years, so a 1-year purge would be actively harmful. "Never" fails
DPDP's storage-limitation principle.

**Choice.** **3 years of no sign-in**, with notice at 30 months and again at 35 months,
each offering a full export. Erasure at 36 months. The notice-before-erasure is the
part that matters: erasing a man's books without telling him first would be a betrayal
regardless of its legality.

**REVERSAL TRIGGER.** Counsel advises a specific statutory period, or a tax authority
requires longer retention. Single config value; the notice schedule derives from it.

**Iteration 7 · commit `G6-pre`**

---

## AD-008 · Cloudflare TLS terminating outside India — drop Cloudflare from the data path

**Question.** Cloudflare terminates TLS at the nearest PoP, which may be outside India.
Residency is stated as a legal requirement. Is that a transfer? Previously parked as blocked on a
human (L-10).

**Options.** (a) Keep Cloudflare and assume it is fine. (b) Keep it and buy India
data-localisation. (c) Terminate TLS at the origin; keep Cloudflare DNS-only.

**Deciding rule.** **R4.1/R4.2 then R6.** The amendment forbids inventing a fact about
Indian law, and whether TLS termination constitutes a "transfer" is genuinely
unsettled. (a) requires assuming the favourable reading of an open question about
citizens' financial data. (b) costs money and still needs the same legal question
answered.

**Choice.** (c) - **the conservative reading.** Cloudflare stays for DNS and for the
public marketing and deletion pages, which carry no personal data. The API terminates
TLS on the EC2 origin in `ap-south-1`, so plaintext personal data never exists outside
India.

**What this costs, stated honestly.** We lose Cloudflare's DDoS absorption and edge
rate limiting on the API. Mitigation: rate limiting moves into the API (it had to
exist there anyway for the OTP limits in SECURITY-AUDIT §2 TB6), plus AWS
security-group restrictions. At 0.25 req/s average this is an acceptable trade; at
scale it is not, and that is the trigger below.

**REVERSAL TRIGGER.** Counsel confirms TLS termination abroad is not a transfer - then
restore Cloudflare proxying and delete the origin rate limiter. **Or** traffic grows
enough that origin-only DDoS exposure becomes the larger risk, at which point buy
Cloudflare India localisation rather than reverting to the global edge.

**Iteration 7 · commit `G6-pre`**

---

## AD-009 · Performance measured on a constrained AVD, not a phone

**Question.** No physical device is attached. B14-B25 need measurements.

**Deciding rule.** Amendment §3, which rules an AVD a legitimate proxy.

**Choice.** A scripted AVD: 2048 MB RAM, 2 cores, throttled storage, Android 11 floor.
Release build, three runs, median and p95 reported. Plus `DEVICE-CHECKLIST.md` for the
things an emulator cannot tell you: sunlight legibility, thumb reach, real SIM SMS
delivery, battery drain.

**Known limitation, recorded rather than glossed.** An AVD runs on desktop-class
silicon with an emulated GPU. It is a reasonable proxy for *algorithmic* cost
(B16, B19, B21) and a poor one for *rendering* cost (B23 dropped frames) and *thermal*
behaviour. Where the AVD flatters the result, the checklist says so.

**REVERSAL TRIGGER.** A physical INR 7,000 handset becomes available. Re-run
everything; AVD figures become secondary.

**Iteration 7 · commit `G6-pre`**

---

## AD-010 · TECH-DECISIONS ADR-011 budgets are superseded by BENCHMARKS.md

**Question.** ADR-011 set performance budgets at G1 (e.g. cold start <= 2500 ms to
*interactive*). BENCHMARKS.md sets <= 2500 ms to *first paint* and <= 3500 ms to
interactive. Two numbers for overlapping things.

**Deciding rule.** **R2** - do not leave a settled decision in two conflicting places.
BENCHMARKS.md is frozen and is the amendment's definition of done.

**Choice.** **BENCHMARKS.md governs.** ADR-011 is annotated as superseded and its
table kept only as the historical record of what was believed at G1. Note the
benchmark table is *stricter* overall: it adds first-paint, p95 requirements, dropped
frames, and a 2G outbox target that ADR-011 had no equivalent for.

**REVERSAL TRIGGER.** None while BENCHMARKS.md is frozen. Unfreezing requires a human.

**Iteration 7 · commit `G6-pre`**

---

## AD-011 · Android OTP autofill is SMS User Consent, not SMS Retriever

**Question.** Android offers two zero-typing OTP mechanisms. SMS Retriever requires
the message to end with an 11-character app hash and the whole message to be
**<= 140 bytes**. SMS User Consent requires no hash and shows a one-tap dialog.
Registering the templates freezes the choice: adding a hash later means
re-registering all twelve.

**Options.** (a) SMS Retriever - fully automatic, zero taps. (b) SMS User Consent -
one tap. (c) Neither; the shopkeeper types six digits.

**Evidence, measured not assumed.** `tools/check-sms-segments.mjs` appends an
11-character hash and reports the wire payload. With the templates as written,
`otp_signin` exceeds 140 bytes in **both Hindi and Odia** (152 B each) - the
highest-volume template in the two languages most of these users read. An earlier
draft was worse: seven of twelve were over.

**Deciding rule.** **R4.4 (works on a weak device for this user) then R6.** Retriever
is unavailable precisely where it matters most, and buying it would mean cutting real
words from an OTP in the two primary Indian languages to make room for a hash the
user never sees. That is a bad trade against R4.2 as well - the words being cut are
the anti-phishing warning.

**Choice.** **(b) SMS User Consent.** No app hash in any template. One tap is a fine
experience and it works identically in all three languages.

**Consequence.** Also corrects a stale claim in the run plan that "OTP autofill only
works with the system keyboard". On Android the mechanism is Retriever or User
Consent; it has nothing to do with which keyboard is showing. The real reason phone
and OTP fields use the system keyboard is that the User Consent dialog and
platform autofill hooks target native inputs - the custom keypad is for amounts.

**REVERSAL TRIGGER.** The Hindi and Odia templates are ever shortened enough that a
hash fits inside 140 bytes in **every** language, AND the one-tap dialog measurably
costs completion in the field. Both, not either - re-registering twelve templates is
not worth a tap on its own.

**Iteration 9 · commit `G6-sms`**

---

## AD-012 · The phishing warning outranks the validity window in Hindi and Odia

**Question.** The 70-character Unicode budget does not fit validity + "never share" +
"SWAFTO will never ask for it". An earlier draft kept validity and dropped the
phishing line, recording the omission honestly. Is that the right trade?

**Options.** (a) Keep validity, drop the phishing line. (b) Drop validity, carry the
phishing line. (c) Accept two segments in Hindi and Odia.

**Deciding rule.** **R4.2 (trust).** The decisive asymmetry: **the validity window is
discoverable inside the app; the phishing warning is not.** A shopkeeper who does not
know his code expires for ten minutes loses nothing - he requests another. One who
does not know SWAFTO will never ask for the code can lose everything in the cash box
to a caller claiming to be support. (c) fails R4.6 and doubles the SMS bill forever
for wording nobody reads twice.

**Choice.** **(b).** Validity dropped from all Hindi and Odia templates; the app
states it instead. `otp_signin` now carries **both** warnings in Hindi and Odia
(64/70 each, 6 units of headroom). T2-T4 carry "never share" - simpler and broader
for a 35-70 audience than reasoning about who is asking, and the distinct template
already tells the user what the code is for.

English keeps all three lines: its GSM-7 budget is 160 characters and the trade does
not arise.

**REVERSAL TRIGGER.** A native reviewer (H10) finds the Hindi or Odia phishing
phrasing unclear, in which case the clearer of the two warnings wins the slot rather
than both being crammed in. Or field evidence shows users requesting repeat codes
because they did not know the first had expired.

**Iteration 9 · commit `G6-sms`**

---

## AD-013 · Every derived constraint becomes a CI check in the iteration it is derived

**Question.** The 70-character Unicode segment limit was not in any source. It was
derived, it changed the design - and it was then defended by a hand count that was
wrong on eleven of twelve templates, with one sitting at exactly 70 of 70 unnoticed.
How are derived constraints protected?

**Options.** (a) Care and review. (b) Record them in a document. (c) Record them AND
make every mechanically-checkable one an executable check, in the same iteration.

**Deciding rule.** **R4.1 and §5.1.** (a) is what just failed. (b) preserves the
insight but not the enforcement: prose does not fail a build. The whole lesson of
this loop is that a constraint defended only by care is not defended.

**Choice.** (c), adopted as standing rule **§5.7** and applied immediately:
`tools/check-sms-segments.mjs` computes encoding, UTF-16 units, segment count, byte
payload and headroom for every template, fails above one segment, warns below five
units of headroom, and **regenerates the markdown tables** so no hand count can
survive. Recorded in `DERIVED-CONSTRAINTS.md` with derivation, cost-of-missing and
confidence.

**Why Odia specifically defeats eye-counting.** Matras and the virama are separate
UTF-16 units while looking like part of a single glyph cluster. The Odia for "code"
reads as two shapes and is four units. Systematic undercount, every time.

**REVERSAL TRIGGER.** None foreseen; this only ever adds checks. If a derived
constraint turns out to be mechanically uncheckable, it still gets a
DERIVED-CONSTRAINTS entry with confidence and a re-test obligation at each §5.3
document pass.

**Iteration 9 · commit `G6-sms`**


## AD-014 · A revoked device's unsynced outbox is preserved and surfaced, never dropped

**Question.** CP-4, re-examined after injection 11 showed it is not latent. The
lost-phone branch of the number change puts two devices on one shop: the NEW handset
trading normally, and the OLD one holding a session that by design never expires plus
an outbox that may contain days of real, unsynced entries. When the old phone is
found, sold, or powered up by a repair shop, it syncs. What happens to what it carries?

**Options.** (a) Silently drop it. (b) Reject it and say nothing. (c) Accept it into
the ledger. (d) Reject at the server, preserve it on the device, and surface it.

**Deciding rule.** **R4.1 then R4.2.**

- **(c) is eliminated by R4.1.** Those entries are real business facts, but the days
  they belong to may now be CLOSED. Accepting them would move a closed day's figures -
  a correctness defect and a direct violation of constraint 3.
- **(a) is the worst outcome available.** It destroys a shopkeeper's real entries with
  no trace. (b) is second worst: the same loss, with the system knowing and not saying.
- **(d)** is the only option that keeps the ledger correct AND the entries alive.

**Choice.** (d), in four parts:

1. **Completing a number change revokes every other device server-side**, effective on
   that device's next sync rather than on a token lapsing - which is exactly injection
   08 B.4's requirement, in the one flow that most needs it.
2. **A revoked device is marked, not deleted.** `devices.revoked_at` is set. The row
   is the evidence that a late sync came from a handset already replaced.
3. **The server rejects writes from a revoked device** with a distinct code, and the
   device does NOT clear its outbox on that rejection.
4. **The old device shows what it is holding** and offers the existing export path, so
   the shopkeeper can re-enter anything that matters as corrections on the new phone.
   Nothing is silently lost; nothing silently lands in a closed day.

**Enforced in SQL, not only in the API.** A trigger on both engines rejects any INSERT
whose own `day_id` names a closed day, so the guarantee holds even if a bug lets a
revoked request through. A CORRECTION still works, because its own `day_id` is today
and only `corrects_day_id` points at the closed day. Seven tests in
`closed-day-guard.spec.ts`, including that a poisoned batch is rejected atomically
rather than half-applied.

**What this says about D9.** D9 states one shop, one phone. That remains the product's
intent, but it is now recorded that **our own recovery flow transiently creates a
second device**, and the system is built for it. D9 is a statement about concurrent
EDITING, which still does not occur - the sequence here is strictly ordered and one
side is revoked. Recorded so nobody reads D9 as "two devices cannot exist" and deletes
this guard as dead code.

**REVERSAL TRIGGER.** If D9 is ever relaxed to genuine multi-device use, (d) becomes
insufficient: rejecting the second device's writes would then be wrong rather than
protective, and real conflict resolution becomes necessary. That is also the point at
which CP-4's deferred concurrent-edit test must be written.

**Iteration 11 · commit `cp4-guard`**

---

## AD-015 · Bundle Anek Odia only, and prove coverage rather than assume it

> **PARTLY SUPERSEDED BY AD-016, same iteration.** The *choice* stands - Anek Odia
> only, not all three families. The *file* does not: AD-015 bundled the 858,180-byte
> variable font, and AD-016 replaced it with three static instances totalling 489,820
> bytes after C.3 was worked through. Every size in this entry is the variable font's.
> Read AD-016 for what is actually in the APK.

**Question.** C.2 says bundle the Odia font. The design specifies the **Anek**
superfamily - Latin, Devanagari and Odia. Which of the three ship inside the APK?

**Measured first, because the sizes decide it.** From the upstream Google Fonts
release: Anek Odia 858,180 bytes, Anek Latin 404,880, Anek Devanagari 2,190,532. All
three is 3,453,592 bytes, **13.2% of the 25 MB B24 budget**, before a line of React
Native ships.

**Options.** (a) All three. (b) Odia only. (c) Nothing, trust the OS.

**Deciding rule.** **R2** - the constraint that exists is DC-004, and it is about Odia
specifically. Latin and Devanagari were never the exposure.

- **(c) is eliminated outright.** It is the defect DC-004 describes, and it is
  invisible on every emulator.
- **(a) spends 13.2% of the download budget to solve a problem we have evidence for in
  one script.** The other two-thirds buys typeface *consistency*, which is a design
  preference, not a correctness property.
- **(b)** covers the exposure for 3.27%. And it is better than it looks: Anek Odia
  carries Latin as well - **measured, 347 codepoints with real glyphs, including the
  digits, the comma, the danda U+0964 and the rupee sign U+20B9** - so an Odia screen
  is internally consistent without Anek Latin beside it.

**Choice.** (b). Hindi renders in the OS Devanagari font until a real device says
otherwise.

**Two things this decision turns from assumption into measurement.**

1. **The two codepoints that matter most are not in the Odia block.** The danda U+0964
   lives in the Devanagari block and ends every Odia sentence we ship; the rupee sign
   U+20B9 is Latin-adjacent and carries every money figure. A font subsetted "to Odia"
   by block would drop both, and the failure would appear in the two places it would be
   worst - the end of every sentence, and every amount. `check-font-coverage.mjs`
   prints them explicitly under "required OUTSIDE the Odia block".
2. **The family's default instance is wght 500, not 400.** Anek Odia is a variable font
   whose `fvar` default is Medium. Unstyled text renders one step heavier than a
   Regular specimen implies, everywhere, and nothing in the file name says so.

**Why a checker and not care.** A bundled font that does not cover what we render is
DC-004 with an extra step, and a cmap entry pointing at glyph 0 is a mapping to .notdef
- coverage on paper, tofu on screen. `npm run check:font` parses the TTF, requires a
NON-ZERO glyph for every character in every Odia string we ship plus the
constraint-8 Latin-and-rupee set, requires the `ory2` GSUB script without which
conjuncts cannot form, pins the file by sha256, and **refuses to pass on an empty
corpus** - the assertPaise-at-0/59 failure mode, declined in advance.

**REVERSAL TRIGGER.** Two, either one suffices.

- **DEVICE-CHECKLIST A5.** If the typeface mismatch between a Hindi screen and an Odia
  one reads as broken rather than merely different on a real handset, Anek Devanagari
  gets bundled at a measured +2.19 MB and this decision becomes (a).
- **B24.** If a real APK measurement leaves less than 2.19 MB of headroom under 25 MB,
  (a) stops being available at all and that must be known before the design assumes it.

Conversely, if DEVICE-CHECKLIST A4 finds every target handset already ships an Odia
font, this decision is **not** reversed - one device is not the fleet, and 3.27% is
cheap insurance against an OEM we have not seen.

**Iteration 14 · C.2**

---

## AD-016 · Ship static instances, not the variable font, and the digits are not tabular

**Question.** C.3: "Anek is a variable font. Variable font support on Android is
version-dependent and React Native's font loading of them is unreliable. Decide now
whether you ship static instances at the weights the design system actually uses."

**The argument that settles it is not about reliability.** Core React Native on
Android has no way to set a variation axis on a `Text`. A variable font dropped into
`assets/fonts` therefore renders as its **default instance and nothing else** - and
Anek Odia's default is wght 500. Shipping the variable file does not give us a family
with three weights that might be unreliable; it gives us **one weight**, reliably. The
design system needs at least body, emphasis and heading.

**Measured, because C.3 says it interacts with B24.**

| | bytes | share of B24 |
|---|---|---|
| variable `AnekOdia[wdth,wght].ttf` | 858,180 | 3.27% |
| three statics, 400 + 500 + 700 | 489,820 | 1.87% |

Static instances are **43% smaller AND give three real weights instead of one**. There
is no trade-off here to agonise over.

**Choice.** Three static instances at 400, 500 and 700, from the same Google Fonts
release, Oriya and Latin subsets. The variable font is deleted rather than kept
"just in case": an unused 858 KB font in the assets directory is something a future
iteration will eventually reference by mistake.

**The near-miss, recorded because it is the whole argument for the checker.** The
first statics I fetched were what the Google Fonts v1 API serves by default: 42 KB
each, an apparent **85% saving** against the variable font. They contained **zero Odia
glyphs** - the API subsets to Latin unless asked otherwise. Shipping them would have
produced complete tofu in the primary language while looking like a clever
optimisation, and it would have passed any review that read the file sizes instead of
the file contents. `check:font` caught it on the first run, before anything was
committed.

**C.4, measured in the same pass, and it is a real defect.** Anek Odia's digits are
**PROPORTIONAL by default** in all three weights - "1" is 672 units against "0" at
1132, roughly 60%. A money column set in the default figures does not align, and no
layout code fixes it. The font does carry a `tnum` feature, and resolving its GSUB
lookups collapses all ten digits to one width (1087 / 1107 / 1179 units at 2000/em).

So the capability exists and **the default is wrong**, which is the worst combination:
correct in a specimen, correct wherever the feature happens to be applied, silently
misaligned everywhere else. Constraint 8 is not satisfied by the font alone.

**What follows from that, and it is not optional.**

1. Every money style **must** set `fontVariant: ['tabular-nums']`. This is not a
   preference; without it constraint 8 is violated on every screen with a column.
2. **Owed at G10:** a `check-governance` rule that the money style sets it, alongside
   the existing C.1 rule that there is exactly one paise-to-string path. Those two
   checks together are what make constraint 8 mechanical rather than aspirational.
3. **Owed at H8:** DEVICE-CHECKLIST B4. React Native's `fontVariant` support on
   Android is the part no static check can settle, and a silent no-op there produces
   exactly the misalignment we are guarding against.

**REVERSAL TRIGGER.** Three, any one of which reopens this.

- **The design system settles on weights other than 400/500/700.** Those three were
  chosen before the G10 tokens exist, on the ordinary body / emphasis / heading split.
  When the tokens are written, the bundled set follows them - adding a weight costs
  about 163 KB and dropping one saves the same.
- **`fontVariant: ['tabular-nums']` turns out not to work on Android in the React
  Native version we ship.** Then the digits cannot be fixed at the style layer, and
  the options are a font build with tabular defaults or instancing `tnum` into the
  shipped files. Finding that at G10 is cheap; finding it at G14 is not.
- **A real APK measurement leaves under 490 KB of headroom against B24.** Then even
  this has to be re-argued, and subsetting to the characters we actually ship is the
  next lever.

**Iteration 14 · C.3 and C.4**

---

## Open questions

None. The blocked-on-a-human status is abolished entirely; anything genuinely
impossible in software is in `HUMAN-ACTIONS.md` and blocks nothing in this loop.
