# BUILD LOG

One line per gate action. Date · gate · what I did · what I found.

## 2026-09-19 · G0 · Repo, state ledger, specification extraction · PASS

Located the corpus: the six specification PDFs were NOT in the working directory, they
were one level up in `g:/SWAFTO/`. Extracted all six with `pdftotext -layout` (poppler
is unavailable but Git ships `pdftotext.exe`). Read all six end to end, plus the paper
sheet `docs/Retail Desk  V1.pdf` and the handwritten photograph.

FOUND — the 15-07-2026 photograph the prompt names is ABSENT from disk. The only
handwritten photo present is dated 25-05-26 with different content (five outputs, and
"Remarks/Inquiry/Feedback" where the feature map has "Party Collection"). The 15-07
note's content is however recorded in full in the Day-Close doc p.9, in a table headed
"Every output in your 15-07 note" — which independently corroborates the whole feature
map AND confirms BI6's blocked status ("Output #6 (unwritten) — Left incomplete in the
15-07 note — Blocked"). So nothing was invented. Recorded as OD-4.

FOUND — six document conflicts, all recorded with rulings in SPEC-DIGEST §1:
  C-1 Flutter vs React Native      -> RN, per the explicit config switch (OD-6)
  C-2 two engines vs one           -> one shared TS package; divergence-alarm retained
  C-3 day-state enum               -> FIVE states, not the prompt's four (OD-5)
  C-4 day-close list vs cash check -> cash-check working authoritative (OD-2)
  C-5 four nav tabs vs three       -> three; the mock predates the decision
  C-6 ring "6/9" vs "1 of 10"      -> 1 of 10; two docs agree and S1 wins
  C-7 expense modes                -> mode sets are per-section, not global

FOUND — the canonical 15 July figures reconcile exactly. 1500+6780+2400-3200-680-500
= 6300, matching both the cash-check working (p.7) and the Today screen (p.5), with
P1=9180, P2=4380, P4=11450 and a -250 difference against a counted 6050. That is the
golden vector and it is arithmetically sound.

Command:
  $ ls SPEC-DIGEST.md BUILD_STATE.md BUILD_LOG.md TRACEABILITY.md && wc -l SPEC-DIGEST.md
Output:
  BUILD_LOG.md  BUILD_STATE.md  SPEC-DIGEST.md  TRACEABILITY.md
  526 SPEC-DIGEST.md
526 > 200, so the digest is not a skim. G0 PASS.

NEXT — G1 technology research.

## 2026-09-19 · G1 · Technology research · PASS

Researched current (Sept 2026) practice rather than recalling library opinions. Wrote
TECH-DECISIONS.md with 12 ADRs, each carrying options / evidence / choice / reverse-if.

FOUND — the deciding factor for op-sqlite is NOT raw speed. Our workload is ~25 entries
a day; benchmark deltas are irrelevant at that size. It wins on SQLCipher support (G3
needs on-device encryption) and explicit WAL control. Recorded that honestly in ADR-002
rather than citing throughput we don't need.

FOUND — the build prompt's claim that DLT registration "takes weeks" is wrong on current
evidence. Entity ID is 1-3 working days, header approval same-day to 24h, templates 1-3
days each. The real lead time is having a registered business entity and the documents.
Corrected in ADR-007 so the schedule rests on the actual constraint. Also: since 6 May
2025 every header must carry a category suffix.

FOUND — DPDP Rules 2025 were notified 13 Nov 2025 with a phased timeline: Board
provisions immediate, Consent Manager framework live 13 Nov 2026, and most operational
duties (notice, consent, breach notification, rights handling) enforceable by mid-May
2027. That is a real, dated compliance runway and it lands in G2.

DECIDED — the clock-skew / day-boundary question the prompt raises: a business day is a
decision the shopkeeper makes, not a fact the clock reports. day_id is client-assigned,
the server NEVER rewrites it, skew beyond +/-12h raises a divergence alarm rather than an
adjustment, and there is no midnight auto-roll (it would split one trading evening across
two day records and break the carry-forward chain).

Command:
  $ test $(grep -c '^## ADR-' TECH-DECISIONS.md) -ge 8 && echo OK
Output:
  OK
  ADR count: 12
G1 PASS.

NEXT — G2 legal audit.

## 2026-09-19 · G2 · Legal audit · PASS

Wrote LEGAL-AUDIT.md against DPDP 2023 + DPDP Rules 2025, Play policy, GST and RBI.
52 status-tagged findings; 26 became TRACEABILITY rows; 7 are resolved autonomously (see DECISIONS-AUTONOMOUS.md).

FOUND — the sharpest issue is `parties`. The shopkeeper types his CUSTOMERS' names and
phone numbers. Those people are Data Principals who have never met SWAFTO and cannot
consent to it. Probable analysis: the shopkeeper is Fiduciary for his own party ledger
and SWAFTO is Processor. That needs counsel (L-03) and it changes what the Terms must
say. Cheap engineering hedge applied regardless: phone nullable, per-party export and
redaction.

FOUND — a real tension between DPDP's right to CORRECTION and decision D7's append-only
closed days. They do not actually conflict: personal data (name, phone, shop) is
directly editable; closed ledger entries are business records corrected by a dated
correction entry, the way every ledger in history does it. Written down explicitly so
nobody "fixes" the immutability to satisfy a misread of s.12.

FOUND — three things block Play submission and none is code: the public deletion page
at swafto.app/delete-account (already referenced in the shipped About copy but not
built), a live privacy policy, and a named grievance officer.

FOUND — Cloudflare terminates TLS at the nearest PoP, which may be outside India. Whether
that is a "transfer" under DPDP needs counsel (L-10). Flagged because the architecture
puts Cloudflare in front of everything and residency is stated as a legal requirement.

RECORDED — the RBI trigger list, deliberately. "Collect udhar via a UPI link" is the
dangerous one: it looks like a small useful feature, it is the most likely release-two
proposal, and it would make SWAFTO a payment intermediary requiring PA/PG authorisation.

CORRECTED — did not repeat the common misreading that Play bans READ_SMS. It explicitly
permits it for UPI/financial transaction SMS. D1 declined it for product reasons, not
platform ones. Recorded accurately.

Command:
  $ grep -cE 'ACTION-REQUIRED|resolved autonomously (DECISIONS-AUTONOMOUS.md)' LEGAL-AUDIT.md
Output:
  52
G2 PASS.

NEXT — G3 security audit and STRIDE.

## 2026-09-19 · G3 · Security audit and STRIDE · PASS

Set up the npm workspace (needed before `npm audit` can mean anything), then wrote
SECURITY-AUDIT.md: STRIDE across six trust boundaries from the architecture DFD,
87 table rows, 21 register items mirrored into TRACEABILITY.md.

FOUND — a real advisory the specified gate would have missed. `vitest@2/3` pulls
`@vitest/mocker` with GHSA-82fw-gwwq-j7x9, path traversal / arbitrary file read,
severity MODERATE. `--audit-level=high` exits 0 on it. Upgraded to vitest@5 (free, no
tests written against the old version yet) and added a standing policy that moderate
findings get triaged weekly rather than silently passing. Recorded as OD-8.

DECIDED — on-device encryption is SQLCipher keyed from the Android Keystore, NOT
per-field encryption. Per-field would destroy SUM() in SQL, which is exactly how
derive-on-read stays cheap enough to justify having no totals table. The architecture's
no-cache rule and the encryption choice are coupled, which was not obvious going in.

DECIDED — certificate pinning: pin the CA, not the leaf, with two pins, an expiry after
which it soft-fails open, and a server-side kill switch. Leaf pinning would brick every
installed app on a cert rotation, and on devices that update rarely over metered 2G
that is an unrecoverable outage — the app would lose both its sync AND its ability to
deliver the fix. Also noted the opposite failure: an old Android may not trust a NEWER
root, so we bundle our own trust anchor.

NAMED — SIM swap is an ACCEPTED RISK, not a solved one. Phone-only auth has no second
factor by design (no email, no password per G15). Mitigations are partial: device
binding, notify the old device, and a 24-hour hold on export and account deletion after
any number change or new-device sign-in. That hold is the important one — it stops
immediate exfiltration or destruction. Written down as residual rather than papered over.

NOTED — the security group IS the perimeter. With no NAT gateway and the instance in a
public subnet (architecture §08), there is no network layer behind which to hide, so
Cloudflare-only ingress rules plus an origin secret header carry the whole load.

Command:
  $ npm audit --audit-level=high && echo "STRIDE rows: $(grep -c '^| ' SECURITY-AUDIT.md)"
Output:
  found 0 vulnerabilities
  STRIDE rows: 87
G3 PASS.

NEXT — G4 database schema and migrations.

## 2026-09-19 · G4 · Database schema and migrations · PASS

One declarative spec in packages/schema/src/spec.ts emits BOTH dialects; the .sql files
in migrations/ are generated by tools/emit-sql.mjs and never hand-edited. 17 up / 11
down statements for SQLite, 36 / 10 for Postgres.

Verified on BOTH engines: 21 tests, 0 skipped. SQLite via node:sqlite (built into Node
24, zero dependencies); Postgres 17.11 via a throwaway container.

FOUND — D8 needs a store the architecture document does not have. "Skipped" and
"untouched" must be distinguishable, but a skip produces no entry and D2 Days has
nowhere to record it. Added section_skips. Deliberately NOT append-only: a skip is a UI
state, not a financial fact, and E3/E6 both require it to be reversible. That makes six
stores where the architecture enumerates five. Recorded as OD-9.

FOUND — a real bug in my own Postgres test. `maybe()` decides it-vs-it.skip during
Vitest's COLLECTION phase, but I was setting `reachable` in `beforeAll`, which runs
AFTER collection. Result: every Postgres test silently skipped even with a live database
on the other end. The suite reported green while proving nothing. Fixed by connecting at
module load via top-level await, and left a comment saying why so it is not "tidied"
back. This is exactly the failure mode the loop's no-fake-PASS rule exists to catch —
a green suite that tested nothing.

FOUND — `pg` is CommonJS, so under an ESM dynamic import `Client` can land on `.default`.
Handled both shapes rather than assuming one.

ENFORCED IN SQL, not just in prose:
  - entries UPDATE/DELETE rejected: trigger on SQLite, trigger + REVOKE on Postgres
  - a closed day is immutable (D7), while a correction referencing it is allowed and
    leaves that day byte-identical — asserted directly
  - amount must be a whole, non-negative integer of paise (ADR-003)
  - mode validity is PER SECTION (C-7): shop_stock is accepted on an expense and
    REJECTED on a purchase, exactly as the paper sheet has it
  - due_date only on an udhar purchase (D4)
  - all FIVE day states (C-3), and 'closed' additionally requires counted_cash + closed_at
  - NO totals column anywhere — asserted by introspection on both engines
  - RLS ENABLED and FORCED on all six tenant-scoped tables (S-10)
  - outbox exists on SQLite and must NOT exist on Postgres (D4 is device-local)

Command:
  $ DATABASE_URL=... npx vitest run --dir packages
Output:
  Test Files  2 passed (2)
       Tests  21 passed (21)
G4 PASS.

NEXT — G5, the Formula Engine.

## 2026-09-19 · G5 · Formula Engine + vectors · PASS

The heart of the product, built before any UI and any API as instructed. Six source
files, zero runtime dependencies, no clock, no locale, no I/O, no randomness.
46 golden vectors (>=30 required), passing under Node AND a real Hermes VM, with an
empty divergence diff.

WROTE — money.ts (the only file allowed to do money arithmetic), dates.ts (civil
calendar, no Date object at all), types.ts, primary.ts (P1-P8 + profit, each carrying
its working), operational.ts (OP1-OP6), intelligence.ts (BI1-BI4 gated, BI5 reserved,
BI6 blocked), index.ts (day state, progress ring, carry-forward).

FOUND — the build prompt's BI4 formula CANNOT BE IMPLEMENTED. It says "(P7 + stock
proxy) vs P8", but D5 removes all item and stock data and the architecture says "no
input collects them, so no store holds them". A stock proxy would have to be invented
from data that does not exist. Used the Day-Close doc's computable formula instead.
Recorded as OD-10. This is the kind of thing G20 is supposed to catch; it surfaced
early because the types forced the question.

DECIDED — OP5 uses the MEDIAN (prompt) not the mean (Day-Close doc). Vector
`op5-uses-median-not-mean` makes the stakes concrete: a series of 1,000 x4 plus one
20,000 festival day has median 1,000 and mean 4,800. Today at 1,100 is genuinely UP
against the median and would read DOWN against the mean. OD-11.

DECIDED — OP6 "projected cash" is today's expected balance carried forward, NOT a
forecast. Forecasting sales would be the guess this product removed. Confirmed by the
canonical alert on Day-Close p.5 quoting today's 6,300. Pessimistic by construction,
which is the right direction to be wrong about solvency. OD-12.

FOUND — the only desktop Hermes available (hermes-engine-cli 0.12) has NO `class`
support whatsoever. Verified directly: both class declarations and class expressions
are rejected, while const/let/arrows/destructuring/template literals all work.
Consequence: MoneyError became a factory function. Defensible anyway - subclassing
Error loses the prototype chain under downleveling and `instanceof` silently stops
working - but the constraint came from the test tool, not the target runtime. OD-13.
Note the npm package `hermes-engine` ships ONLY hermesc (the compiler) on every
platform; `hermes-engine-cli` is the one with an actual VM.

NEGATIVE-TESTED BOTH CHECKS, because a green suite that cannot fail proves nothing:
  - injected a wrong expectation (canonical p3 -> 999999, D3 profit -> 200000):
    the runner failed with "expected 999999, got 630000" and "expected 200000, got
    400000". Both engine values match the hand computation.
  - injected a fake Hermes divergence: the diff failed with
    "canonical-15-july.p3: node=630000 hermes=1".

Commands:
  $ npm run test:vectors:node    -> ALL PASS (46 vectors, >= 30 required)
  $ npm run test:vectors:hermes  -> no vector threw
  $ npm run test:vectors:diff    -> divergence: NONE
G5 PASS.

NEXT — G6 auth service.

## 2026-09-19 · Iteration 7 · Autonomy amendment: items 2.1-2.4 · COMPLETE

2.1 BI6 DECIDED (AD-001) = CREDIT CONCENTRATION. Ran the procedure rather than
inventing: enumerated questions answerable from Entries/Days/Parties/section_skips
alone, not already answered by P1-P8 or OP1-OP6, needing a multi-week window, then
ranked by money cost of a wrong answer. Expense category drift was ELIMINATED BY R3 —
expense labels are free text, so grouping them needs inference and constraint 1
forbids it. Credit concentration won on R4.1 by a wide margin and coincides with the
human tiebreak. The gap it fills: P7 says he is owed 18,240; it does not say 11,000 of
it is owed by one man. Implemented with gate 14, five new vectors, hand-computed
shares (6031 bp top, 9320 bp top-3) — all pass, and Hermes agrees.

2.2 SEVEN LEGAL FINDINGS RESOLVED. AD-003 grievance officer (mechanism built, only a
RELEASE build fails when unset — the loop is never blocked; a placeholder address that
reaches nobody would be worse than an honest absence). AD-005 legal text written
conservatively and marked unreviewed. AD-006 party data: shopkeeper is Fiduciary,
SWAFTO is Processor, with the engineering hedges built regardless of which analysis is
right. AD-007 retention 3 years inactive with two warnings. AD-008 is the consequential
one: DROP CLOUDFLARE FROM THE API DATA PATH. Whether TLS termination abroad is a
"transfer" is genuinely unsettled and the amendment forbids inventing a fact about
Indian law, so the conservative reading wins — DNS-only, TLS terminates on the origin
in ap-south-1. Cost stated honestly: we lose edge DDoS absorption, mitigated by rate
limiting that had to exist in the API anyway.

2.3 HUMAN-ACTIONS.md — nine items, every one needing a legal identity, a credential, a
payment method or a physical object. Eight things that LOOKED like human actions turned
out to be decisions plus code and were moved out.

2.4 15-07 provenance SETTLED. Day-Close p.9 is the authority for the feature map. It is
a provenance record, not a gap, and no longer an open question.

FROZE THE BENCHMARKS. BENCHMARKS.md sha256
ae1a719c2a7551e6038fe3681f27fa6133710960b6294dbf159aafb9f5c4b395 committed to
benchmarks.lock. Hash normalises CRLF so a Windows line-ending change is not mistaken
for someone moving a threshold.

FOUND — my own token purge was too blunt. A blanket find/replace turned LEGAL-AUDIT's
status legend into one asserting a resolved status and an outstanding legal review
in the same sentence, which is self-
contradictory, and left AD-003 reading "Previously `resolved autonomously`", which is
circular nonsense. Repaired each damaged sentence individually. Worth recording: a
mechanical fix to documentation can produce text that passes every automated check and
still says something false.

NEGATIVE-TESTED EVERY NEW CHECK (amendment §5.1):
  - benchmarks lock: appended a comment to BENCHMARKS.md -> FAILED with the hash diff,
    reverted -> passes.
  - governance, reversal triggers: added a decision block with a deliberately absent trigger -> FAILED naming it,
    removed -> passes.
  - governance, B40 stubs: added a TODO to money.ts -> FAILED naming file:line,
    removed -> passes.
  - vectors (re-confirmed): wrong expectation -> FAILS; fake Hermes divergence -> FAILS.

Commands:
  $ npm run check:governance   -> governance: all invariants hold
  $ npm run check:benchmarks   -> frozen: OK, hash matches
  $ npm run test:vectors:node  -> ALL PASS (51 vectors)
  $ npm run test:vectors:diff  -> divergence: NONE

NEXT — G6 auth service against the SmsPort stub.

## 2026-09-19 · Iteration 8 · Injection 08: §5.6 prose integrity + DLT design constraint

§5.6 PROSE INTEGRITY adopted as a standing rule. No blanket find-and-replace across
prose, ever. Added tools/check-prose.mjs: contradictory sentences and dangling IDs.
SENTENCES RE-READ THIS ITERATION: 4,839 scanned mechanically; of those I read in full
every sentence in the three files my iteration-7 purge had touched (LEGAL-AUDIT,
SECURITY-AUDIT, DECISIONS-AUTONOMOUS) — 61 sentences read by eye, 6 repaired.

FOUND, by the new check, on its very first run — TWO REAL DEFECTS:
  1. H10 did not exist. SMS-TEMPLATES.md referenced "this is H10 in HUMAN-ACTIONS.md"
     and HUMAN-ACTIONS.md stopped at H9. I had invented a cross-reference to a section
     I never wrote. Nothing else would have caught it. H10 now exists (native review
     of the Odia and Hindi strings).
  2. a fabricated decision id was a dangling reference in BUILD_LOG — a deliberately fake ID from a
     negative test, left in the record where a reader would later hunt for it.
     Rephrased without inventing an ID.
That is the rule paying for itself in one run.

DLT IS A DESIGN CONSTRAINT. Researched the caps before writing a line of SmsPort and
they are tighter than a naive design assumes:
  - variable VALUE max 30 chars
  - variables per template 2-4 depending on operator -> DESIGNED TO 2, every template
    uses 1
  - variable content must be <= 40% of the message
  - a template must NOT END with a variable
  - and the one the sources did not state: Odia and Hindi are Unicode, so an SMS
    segment is 70 CHARACTERS, not 160. A 90-char Hindi OTP is two segments — double
    cost on every sign-in forever. Every Indian-language template is held under 70.

SmsPort takes { templateId, variables[], phone, languageTag } and NOTHING ELSE. There
is no free-text path in any build configuration. A test asserts SmsRequest has no
message/body/text/content key, because a free-text path in dev is how a free-text call
site reaches production.

DECIDED — four distinct templates rather than one generic OTP, costing three extra
registrations. Reason: a user who receives a NUMBER-CHANGE code he did not request
knows immediately that something is wrong. A generic "your code is X" gives him
nothing to notice. Anti-phishing under R4.2, against R6.

WROTE SMS-TEMPLATES.md: 12 templates (4 purposes x 3 languages), final text, ready for
DLT submission. Flagged at the top and as H10 that the Odia and Hindi need NATIVE
review — the checks verify length, variable count, segment cost and numeral script,
and none of them can evaluate meaning.

RECORDED HONESTLY — "SWAFTO will never ask for it" is English-only. It is the strongest
anti-phishing line available and it did not fit the 70-char Unicode budget without
dropping something more important. Written into §5 of the template file rather than
silently omitted.

NEGATIVE-TESTED EVERYTHING NEW (§5.1), 7 planted failures, all caught:
  - Odia template pushed to 111 chars -> FAILED "111 chars against a 70-char segment"
  - template ending with a variable -> FAILED
  - Devanagari numerals in Hindi -> FAILED (constraint 8)
  - a sentence asserting a resolved status and an unresolved one at once ->
    FAILED, quoting the offending sentence back
  - two deliberately fabricated IDs (one decision, one benchmark) -> FAILED
    naming both, with file and line
  - code text drifting from the submission -> FAILED showing md vs code
  - an unregistered templateId sent -> FAILED naming file:line
  All reverted; all green again.

Commands:
  $ npx vitest run --dir apps  -> Tests  84 passed (84)
  $ npm run check:prose        -> no contradictory sentences, no dangling IDs
  $ npm run check:sms          -> markdown and code agree, all ids registered

NEXT — G6 continues: OTP service with persistent rate limits (injection B.2), then
the compensating control for the origin exposure that AD-008 created (injection C).
That decision does not have an ID yet and is deliberately not cited as one here:
citing an ID before writing it is precisely the dangling reference the prose check
exists to catch, and it caught this line.

### Iteration 8 addendum · the prose check caught my own log three more times

After committing, `check:prose` failed on the BUILD_LOG entry I had just written:
  - two fabricated IDs quoted from a negative test, which a later reader would hunt for
  - a forward reference to a decision id I had not written yet, in a "NEXT" line
  - and the log sentence that QUOTED the contradictory-sentence test, which trips the
    contradiction rule by construction

The third is the interesting one. A log that quotes a failure verbatim will contain
the tokens that caused it. Two ways out: an escape hatch in the checker, or rephrase
the log. TOOK THE REPHRASE. An escape hatch is a hole that grows — the first time
something legitimate needs it, it gets used, and thereafter it is available to
anything. Describing the failure instead of quoting it costs nothing and the record
is just as clear.

Net: four real defects found by a check that did not exist an hour ago, three of them
in prose I had written minutes earlier while being deliberately careful. That is the
argument for §5.6 better than any I could make.

## 2026-09-19 · Iteration 9 · Injection 09 A + B: template findings, §5.7 derived constraints

ALL FOUR TEMPLATE FINDINGS CONFIRMED BY MEASUREMENT. Your counts were right and mine
were wrong. Built tools/check-sms-segments.mjs FIRST, as instructed, so the rewrite
was measured rather than estimated. It reproduced your findings exactly:
  - otp_number_change_old/od was at 70/70. Zero headroom, on the one I miscounted.
  - exactly 7 of 12 exceeded 140 bytes once an 11-char hash was appended, and exactly
    the seven you named: all four Odia plus hi T2, T3, T4.

A.1 DECIDED (AD-011) — SMS USER CONSENT, not SMS Retriever. After the A.4 rewrite the
Retriever situation actually improved to 2 of 12 over budget — but the two still over
are otp_signin in Hindi AND Odia, the highest-volume template in the two languages
most of these users read. Buying Retriever would mean cutting the anti-phishing
warning to make room for a hash the user never sees. Also corrected the stale claim
that "OTP autofill only works with the system keyboard" — on Android the mechanism is
Retriever/User Consent and has nothing to do with the keyboard.

A.2 DONE — every count in §4 is now GENERATED. `--update-md` rewrites the tables from
measured values, so no hand count can survive an iteration. Reported columns are
encoding, UTF-16 units, limit and headroom.

A.3 FIXED, and the research changed the answer rather than confirming it. Under
TCCCPR 2025 the operator APPENDS the category suffix automatically during DLT
scrubbing (-T transactional). It is not part of the six characters and we do not
register it. So `SWAFTO` was correct and my sentence was wrong — the opposite of what
I would have guessed. Logged as R-001 in REVIEW.md: the contradiction checker
structurally cannot see this class, because both halves are individually well-formed.

A.4 RECONSIDERED AND REVERSED (AD-012). The phishing line is no longer English-only.
Dropped the validity clause from all Hindi and Odia templates and spent the budget on
warnings. Your asymmetry is the whole argument: the validity window is discoverable in
the app, the phishing warning is not. A man who does not know his code expires
requests another; a man who does not know SWAFTO will never ask can lose the cash box.
otp_signin now carries BOTH warnings in Hindi and Odia at 64/70, 6 units spare.

A.5 ADDED TO H10 — the T2/T3 Hindi drift (now "purana number jaanch" vs "naya number
pushti", but a Hindi reader must confirm they are heard as different things), and the
ଆପ୍ ଲକ୍ transliteration question. Also warned the reviewer that headroom is 5-6 units
on the sign-in templates and an edit beyond that doubles the cost forever.

B DONE — §5.7 adopted. DERIVED-CONSTRAINTS.md with four entries. DC-001 the segment
limit. DC-002 the five-digit blindness. DC-003 is one I had not written down: AD-008
and the no-NAT-gateway ruling were each sound alone, and COMPOSED they leave the
origin directly addressable with the rate limiter on the same box. Neither document
mentions it because each was written without the other. DC-004 Odia tofu, marked
MEDIUM because it is inherited reasoning I have not measured.

PROCESS FINDING — stopped patching JavaScript via Python string replacement. It
corrupted escape sequences for the third time, embedding literal newlines into a
regex and breaking the file. Rewriting whole files with the editor instead. Cheap
lesson, recorded so I do not reach for it again.

NEGATIVE-TESTED (§5.1), both paths of the new checker:
  - padded an Odia template to 81 units -> FAILED "81 UCS-2 units against a 70-unit
    segment -> 2 SEGMENTS"
  - padded a Hindi template to 69/70 -> WARNED "only 1 unit(s) of headroom"
  Both reverted; green again.

Commands:
  $ npm run check:sms:segments -> every template fits one segment
  $ npm run check:prose        -> no contradictory sentences, no dangling IDs
  $ npx vitest run --dir apps  -> 84 passed

STILL OWED — injection 09 C (the nine React Native traps, before G10), then injection
08's B.2 persistent rate limits, the origin-exposure control for DC-003, B.3-B.5 the
OTP service, and the vector shortfall at 51 of 70.

## 2026-09-19 · Iteration 10 · Injection 10: §5.8 composition, C.1 grouping closed

C.1 DONE AND PROVEN EMPIRICALLY. This is the headline result of the iteration.

I injected the exact bug DC-002 predicts — swapped Indian 2-2-3 grouping for Western
3-3-3 in formatPaise — and ran all 59 vectors.

  ONLY 2 OF 59 VECTORS CAUGHT IT.

Both were the new ones. The canonical 15 July day did not notice. Nothing containing
6,780 or 18,240 or 27,600 noticed. Fifty-seven vectors, every unit test and every
screenshot would have shipped a wrong-locale bug to a real shopkeeper looking at
what he really owes a real supplier. Your prediction was exactly right and now it is
measured rather than argued.

ADDED 8 VECTORS, 51 -> 59. Each states the question it answers, per instruction:
  - grouping-divergence-boundary-99999-vs-100000 (where the conventions first differ)
  - six-digit-supplier-outstanding (1,50,000 - the smallest realistic exposing figure)
  - seven-digit-amounts-stay-exact (12,45,600 - seeds the adversarial shop)
  - bi6-single-customer-holds-everything (10000 bp, total concentration)
  - bi6-two-customers-top-three-is-the-whole-book
  - collection-takes-an-outstanding-to-exactly-zero
  - eight-sections-skipped-one-entry
  - forty-entries-in-one-section (exact summation over many rows)
Node and Hermes agree on all 59.

ADDED the C.1 static check: one money-formatting path. toLocaleString,
Intl.NumberFormat and Intl.DateTimeFormat are banned in shipped code, as is toFixed on
a money identifier. Negative-tested — a planted toLocaleString fails with file:line.

§5.8 ADOPTED. Ran composition pass 1: 136 pairs considered, 1 defect (DC-003,
pre-existing), 1 latent trap, 4 benign-and-reasoned. Written to REVIEW.md.

FOUND, CP-4 — a trap I had not seen. D9 (one shop, one phone) composed with AD-004
(the SMS stub) means NOTHING anywhere tests two devices racing for the same shop.
Nothing fails; there is simply no coverage, and the absence is invisible. Deliberately
NOT fixed — building that test now would require conflict machinery D9 forbids.
Instead D9's reversal trigger now carries the obligation to add it.

RECORDED, CP-3 — the counter-example, because §5.8 could otherwise train me to treat
every composed removal as suspect. D5's removal of stock data propagated correctly
through two gates: it made the prompt's BI4 formula unbuildable (AD-002) and
eliminated expense-category drift from the BI6 candidates under R3 (AD-001). That is
composition working.

PROCESS FAILURE, REPEATED. I patched JavaScript with a Python string replacement
again — one iteration after recording that exact lesson — and corrupted a newline
escape again. Reverted from git and used the editor. Recording it a second time
because clearly once was not enough: the rule is that mechanical edits to anything
with its own escaping rules go through the editor, not a script.

Commands:
  $ npm run test:vectors:node  -> ALL PASS (59 vectors)
  $ npm run test:vectors:diff  -> divergence: NONE
  $ npm run check:governance   -> 5 invariants incl. C.1 formatting path
  $ node tools/check-prose.mjs -> clean

NEXT — C.2 bundled Odia font (launch-blocking for the primary language, invisible on
an emulator), then the remaining RN traps, persistent rate limits, the DC-003
compensating control, the OTP service, G7/G8.

## 2026-09-19 · Iteration 11 · Injection 11: §5.9 detection rate, CP-4 was not latent, §5.10 mechanism

§5.10 FIRST, because I had already failed it twice. tools/check-tooling.mjs now makes
the two repeated mistakes impossible rather than discouraged: no tool may edit a
source file by string substitution from another language, and the platform traps I
have actually tripped over (POSIX null device as an output path, shell:true on
Windows, reserved device-name files) fail the build. Negative-tested both.
I then edited two JS files from JS, which is the point.

CP-4 WAS NOT LATENT AND I WAS WRONG ABOUT IT. I checked whether D9 ALLOWS two devices
and concluded no. I did not check whether our own recovery flow CREATES them. It does:
the lost-phone branch of the number change leaves the old handset holding a session
that by design never expires plus an outbox of unsynced entries, and weeks later a
repair shop powers it on.

  Q1 does a number change revoke the old session? -> AD-014: yes, server-side,
     effective on next sync.
  Q2 what happens to its outbox? -> NOT dropped, NOT silently rejected. Rejected at
     the server, PRESERVED on the device, surfaced with the export path. Those are
     real entries a shopkeeper made.
  Q3 can they land in a closed day? -> NO, and it is now enforced in SQL on both
     engines, not just the API. New trigger entries_no_insert_into_closed_day.
  Q4 can a closed day's figures move? -> NO. Test asserts the closed day is
     byte-identical after a rejected sync, and that a poisoned batch is rejected
     ATOMICALLY rather than half-applied.

G4 reopened and re-passed: 18 up / 12 down statements on SQLite, 38 / 11 on Postgres.
7 new tests in closed-day-guard.spec.ts. Corrections still work - their own day_id is
today, only corrects_day_id points at the closed day.

§5.9 DETECTION RATE, built as a harness rather than done by hand. Results:

  money-integer-paise               0/59    0.0%   UNDETECTED   <- REAL DEFECT
  indian-digit-grouping             2/59    3.4%   LOW-BROAD
  withdrawal-excluded-from-profit   2/59    3.4%   narrow, ok
  only-cash-mode-moves-cash         3/59    5.1%   narrow, ok
  carry-forward-uses-counted        1/59    1.7%   narrow, ok
  entries-are-append-only           1/28    3.6%   narrow, ok
  closed-day-cannot-receive-entries 22/28  78.6%   ok
  no-totals-are-stored              1/28    3.6%   LOW-BROAD

FOUND — money-integer-paise 0 of 59. Disabling the integer guard in assertPaise broke
NOTHING. The guard was written, reviewed, and never once executed against a bad value,
because every vector supplies well-formed integers. A guard that has never rejected
anything is decoration.
  The vectors STRUCTURALLY CANNOT cover it: they are JSON describing valid days, and a
  float amount is valid JSON. This needed code, not data - which is §5.9.2's "add data
  that differs in the dimension the bug lived in", where the missing dimension was
  "inputs that should be refused". Wrote money.spec.ts: 39 assertions over floats, NaN,
  Infinity, strings, null, unsafe integers, and the rounding symmetry.
  RE-MEASURED: 20/64, 31.3%, ok.

FIXED A FLAW IN MY OWN HARNESS that the data exposed. The denominator was the whole
suite, so a NARROW invariant like "withdrawal excluded from profit" scored 2/59 and
looked as alarming as the grouping bug. It is not comparable: only the handful of
vectors containing a withdrawal can possibly catch it. Added a breadth field. The 2/59
grouping result mattered precisely because grouping is BROAD - every money render
should have been able to catch it and almost none could.

REMAINING LOW-BROAD, both honest findings rather than noise:
  - indian-digit-grouping 2/59: still only two vectors carry 6+ digit amounts. The
    B.2 adversarial shop fixture is where this gets fixed properly.
  - no-totals-are-stored 1/64: on reflection this is a WEAK PROBE, not a fixture
    finding. Adding an unused column breaks nothing; the real violation would be
    READING a stored total. Recorded as a probe-quality finding to sharpen later.

Commands:
  $ node tools/detection-rate.mjs  -> every invariant detected; 2 flagged
  $ npx vitest run                 -> 148 passed
  $ npm run check:tooling          -> no cross-language surgery, no platform traps

NEXT — C.2 bundled Odia font, remaining RN traps, persistent rate limits, DC-003
compensating control, OTP service, G7/G8.

## 2026-09-19 · Iteration 12 · Injection 12: the rejection corpus, and a real totals probe

B FIRST — the poison-then-drop probe, because my old one measured itself.

Rewrote `no-totals-are-stored` to mutate what is READ rather than what is stored: the
engine now prefers a cached figure over deriving one. Wrote no-stored-totals.spec.ts
to supply the poison — nine plausible cache field names on the day record, one on
every entry, one on the operational context, each with an absurd 999999999 value so a
read is unmistakable rather than a subtle drift. Plus DROP: recompute byte-identically
from entries alone, and assert every WORKING sums to its own total, so no line can
itself be a stored figure.

MEASURED 1/79 AND LEFT IT AT 1/79. That is the honest number. Only the test poisoning
that exact field name can see that mutation, and it caught it precisely. What was
wrong was my BREADTH classification, not the probe — so I reclassified the mutation as
narrow and recorded WHY in REVIEW.md R-004 rather than quietly turning a red number
green. The denominator is the whole suite and has a floor; 2/59 for grouping and 1/79
for a cached read are not comparable. UNDETECTED (0) is the only scope-independent
signal.

TODAY THE SYSTEM HOLDS NO CACHE, so the poison tests pass by construction. Recorded in
the file header rather than hidden, and wired anyway so they have teeth the first time
a Reports screen misses B20 and someone reaches for a cache.

A — §5.11 THE REJECTION CORPUS. Your diagnosis generalised further than my fix, and
you were right: vectors.json describes VALID days, so the suite had no negative-input
corpus at all. assertPaise was the one I happened to probe, not the only one
undefended.

rejects.json: 32 cases. Each names the rule it violates and EVERY layer obliged to
refuse it.
  engine  9  — float, sub-paisa float, numeric string, null, boolean, object,
                beyond-MAX_SAFE_INTEGER, malformed ISO date, thirteenth month
  schema 15  — negative and fractional amounts, unknown section, shop_stock on a
                purchase and on a collection, unknown day state, unknown language,
                entry into a closed day, due date on a cash expense, udhar sale with
                no party, nonexistent party, nonexistent day, nonexistent shop,
                duplicate id, closed day with no count
  api     8  — PENDING: empty/whitespace/oversized party names, bidi overrides,
                missing field, unexpected field, oversized payload, forged shop_id

The 8 PENDING cases are PRINTED BY NAME on every run rather than skipped silently. An
untested rejection that looks green is exactly what this corpus exists to prevent, and
they become real when G6-G8 land the API validation.

NEGATIVE-TESTED THE CORPUS ITSELF — weakened the per-section mode CHECK and exactly
three cases failed, naming themselves ("enum-shop-stock-on-a-purchase was ACCEPTED by
the database"). Restored; green.

Commands:
  $ npm run rejects:author -> 32 cases (engine 9, schema 15, api 8)
  $ npx vitest run         -> 191 passed
  $ node tools/detection-rate.mjs -> every invariant detected; 1 flagged
  $ npm run check:tooling  -> no cross-language surgery, no platform traps

Also recorded R-005: rules describe intent, flows produce reality. I asked whether D9
PERMITS two devices; the lost-phone flow PRODUCES them regardless. Every future
composition pass enumerates what the system does, including recovery and failure
paths, not what the rules allow.

NEXT — the queue, unchanged: C.2 bundled Odia font, remaining RN traps, persistent
rate limits, the DC-003 compensating control, the OTP service, G7/G8 (where the 8
PENDING rejection cases get their layer). Then the two fixtures, then G10.

## 2026-09-19 · Iteration 13 · Adversary pass 01 (self-directed)

First self-generated injection: INJECTIONS/13-adversary-01.md. Artifacts only —
BUILD_LOG and the AD rationales were not read while forming findings. Ten findings,
all executed this iteration.

F-01 HIGH · SECURITY-AUDIT still designed around Cloudflare being in the data path.
  TB4 called the boundary "Cloudflare to EC2". T4.1 mitigated origin bypass with an
  allowlist of Cloudflare IP ranges. T4.2 marked volumetric DDoS "DONE by design" on
  the strength of the Cloudflare free tier. AD-008 removed Cloudflare from that path
  three iterations ago. Anyone implementing G9 from that document would have built
  the wrong allowlist AND believed DDoS was handled. Rewritten; DDoS now reads OPEN,
  because the thing that made it DONE was removed.

F-02 HIGH · toClosedDaySummary's two guards had never executed. Same shape as
  assertPaise at 0/59. If an open day were silently admitted, every BI gate would
  open early on partial data. Now 2 engine cases in the rejection corpus (34 total).

F-03 · Every vector computed the same calendar day. MY FIRST READING WAS WRONG and I
  corrected it before filing: the CONTEXT dates do span 2026-05-10 to 2026-08-24, so
  month boundaries were already crossed. What was genuinely unexercised was a YEAR
  boundary and a leap day. dates.ts handles both correctly — a fixture gap, not a
  defect. Added one vector each. The pull was toward the dramatic version, and
  measuring instead of asserting is what caught it.

F-04 · source was never 'imported' anywhere. That column exists solely so D1 stays
  reversible; the reversal path had zero coverage. One vector added.

F-05 · The GSM-7 alphabet was reconstructed from memory: 127 characters against a
  128-position table. The discrepancy is correct — 0x1B is ESC, not a typeable
  character — but nothing said so. Now documented, exported as
  GSM_BASIC_CONTENT_CHARS, and recorded in DC-001 as that constraint's own derived
  dependency.

F-06 · AD-010 said "ADR-011 is annotated as superseded". It was not. A decision
  recorded as done that was never carried out — which is a small finding about how I
  write AD entries, not just about this file.

F-07 · Two rows still asserted a resolved status alongside an outstanding legal
  review. A SECOND instance of R-001, in the file R-001 was discovered in, surviving
  because the checker matched uppercase tokens only. Extended the rule to lowercase
  phrases that genuinely assert outstanding work.

F-08 · Nothing enforced that generated files were generated. check-generated.mjs
  FOUND REAL DRIFT ON ITS FIRST RUN — the SMS table writer emitted LF into a CRLF
  file, rewriting every line. Line-ending drift, not content drift, but it would have
  masked the real thing. Generator fixed to preserve line endings.

F-09 · No fixture populated `label`. One vector added; prerequisite for Form C.
F-10 · TRACEABILITY listed BI6 as WIP when its row was complete.

MECHANISM (§5.10.1) · tools/edit.mjs. CRLF-mismatched anchors have now cost three
separate detours. replaceIn normalises for matching, restores the file's own endings,
and THROWS on a missing anchor so a silent no-op is impossible. It threw twice during
this iteration, correctly.

ALSO FIXED, found while executing · checkExpectations compared with JSON.stringify,
which is key-order sensitive. A vector failed purely because the engine emitted two
object keys in a different order. Replaced with a stable stringify that sorts object
keys and PRESERVES array order — array order is meaningful for OP6 warnings and the
P3 working lines, so sorting those would hide a real defect. Verified both properties.

Vectors 59 -> 63. Rejection corpus 32 -> 34. Tests 191 -> 193.

Commands:
  $ node tools/check-generated.mjs -> every artifact matches its authoring script
  $ npx vitest run                 -> 193 passed
  $ npm run test:vectors:diff      -> divergence: NONE

NEXT — the queue: C.2 bundled Odia font, remaining RN traps, persistent rate limits,
the DC-003 compensating control (now correctly described in SECURITY-AUDIT as open),
the OTP service, G7/G8.

## 2026-09-19 · Iteration 14 · C.2, the bundled Odia font

C.2 DONE. The launch-blocking one: Odia is the PRIMARY language, a budget handset may
ship no Odia font, and the failure is invisible on every emulator because an AVD
system image carries a full font set. The development environment is strictly more
capable than the target, which is how this class of bug ships.

NEARLY SHIPPED THE WRONG TYPEFACE. I downloaded Noto Sans Oriya, verified it, wrote
the checker against it, and only then read LEGAL-AUDIT §10, which lists **Anek**
(Latin/Devanagari/Odia) as the design's typeface. Switching families on a whim would
have been a silent change to an earlier decision. Re-pointed at Anek Odia and threw
the Noto file away. The near-miss is worth recording: I was one document away from
"verified" meaning "verified the wrong thing", and what caught it was reading the
legal register before committing, not any check.

BUNDLED · apps/mobile/assets/fonts/AnekOdia.ttf, Anek Odia v1.003, SIL OFL 1.1,
858,180 bytes = 3.27% of the 25 MB B24 budget. Upstream OFL.txt committed beside it.
AD-015 records why Odia only and not all three Anek families: measured, all three
would be 3,453,592 bytes = 13.2% of B24, and the other two-thirds buys typeface
consistency, which is a preference, not a correctness property. Two reversal triggers,
one of which is a DEVICE-CHECKLIST line rather than a hypothetical.

CHECK · tools/check-font-coverage.mjs, wired into check:all. It parses the TTF rather
than trusting it, because a bundled font that does not cover what we render is DC-004
with an extra step. It requires a NON-ZERO glyph id for every character - a cmap entry
pointing at glyph 0 is a mapping to .notdef, which is coverage on paper and tofu on
screen.

THREE THINGS THE CHECK FOUND THAT REASONING HAD NOT:

  1. TWO REQUIRED CODEPOINTS ARE OUTSIDE THE ODIA BLOCK. The danda U+0964 lives in the
     Devanagari block and ends every Odia sentence we ship. The rupee sign U+20B9
     carries every money figure. A font subsetted "to Odia" by Unicode block - the
     obvious optimisation, and the one anyone would reach for against a 25 MB budget -
     drops both, and the tofu lands at the end of every sentence and in front of every
     amount. The tool prints them on every run under "required OUTSIDE the Odia
     block". Anek Odia covers both; measured, not assumed.

  2. THE DEFAULT INSTANCE IS wght 500, NOT 400. Anek Odia is a variable font whose
     fvar default is Medium. Unstyled text renders one step heavier than a Regular
     specimen implies, everywhere, and nothing in the file name says so. The tool now
     prints a NOTE whenever the default weight is not 400.

  3. The family name Android resolves is "Anek Odia Medium", postscript
     AnekOdia-Medium - which is what the RN Android font mapping has to match.

Also asserts: the ory2 GSUB script is present, without which the shaper cannot form
Odia conjuncts and text renders as letters plus dotted circles (a failure that is NOT
empty boxes and would pass a "no tofu" eyeball); the file matches a recorded sha256;
and the font fits B24 on its own.

REFUSES TO PASS ON AN EMPTY CORPUS. If the tool finds zero Odia strings it exits 1.
That is the assertPaise-at-0/59 failure mode - a guard that never runs, passing
forever while proving nothing - declined in advance rather than discovered later.

NEGATIVE-TESTED THREE WAYS (§5.1):
  planted U+0915 into a real od: template -> caught, named the template
  renamed the od: key so the corpus was empty -> caught, refused to pass vacuously
  flipped one byte of the font                -> caught by hash

WHAT THIS CANNOT PROVE is that a device draws the glyphs; a font that covers
everything still draws nothing if the asset pipeline drops it. DEVICE-CHECKLIST.md now
exists - it was a dangling reference in four artifacts - with sections A-F. A1-A6 are
the font items, including A4, which is the only thing that can move DC-004 from MEDIUM
to HIGH: install without the bundled font and see whether the handset has Odia at all.
DC-004 now separates what is mechanical (coverage, settled) from what is not
(rendering, owed to H8).

FOUND WHILE WIRING THE SCRIPT · FOUR npm SCRIPTS NAMED TOOLS THAT DO NOT EXIST:
check:traceability, check:contrast, check:i18n, test:vectors. Nothing ever failed
because nobody ran them; they sat in package.json looking like coverage. A named check
that cannot run is worse than an absent one, because it gets counted. Removed. This is
the same shape as F-06 - a thing recorded as done that was never done - so per §5.10.4
it became a mechanism: check-tooling.mjs section 4 asserts every npm script references
a file that exists. Negative-tested by planting check:ghost.

ON STALE DOCUMENTS, THE THIRD INSTANCE. F-01 (SECURITY-AUDIT describing a topology
removed three iterations earlier), F-06 (ADR-011 recorded as annotated, never
annotated), and now BUILD_STATE's "Next action", which still described amendment items
completed at iteration 7. §5.10 says a lesson recorded twice becomes a mechanism, and
I considered writing one. I am not going to fabricate a weak check for this: document
staleness is semantic and the one thing that has actually caught it is the adversary
pass reading artifacts before rationale (§6.2), which found two of the three. The
mechanism exists and works. BUILD_STATE's next action is now the real queue, as a
table, with C.2 marked DONE.

Commands:
  $ npm run check:all   -> governance benchmarks prose sms sms:segments tooling
                           generated font, all pass
  $ npx vitest run      -> 189 passed, 4 skipped (Postgres, no daemon)

NEXT — C.3 through C.9, the remaining React Native traps.

## 2026-09-19 · Iteration 15 · C.3 and C.4, and the injections become artifacts

FIRST, A GAP THAT HAD TO BE CLOSED BEFORE ANY OF IT. C.3 through C.9 - seven React
Native traps this build is required to resolve before G10 - existed NOWHERE in the
repository. The list lived only in a chat transcript. Working out what C.3 said meant
mining a .jsonl file. An instruction that cannot be re-read quietly becomes whatever
the last iteration remembered of it, and every §6 adversary pass is supposed to audit
work against instructions it can actually read.

Every injection is now an artifact: INJECTIONS/00, 07, 08, 09, 10, 11, 12 and 13,
verbatim and unedited, each with a header saying so.

That immediately broke two checkers, correctly. The injections QUOTE the defects they
forbid - injection 08 quotes the resolved-plus-outstanding contradiction, the autonomy
amendment names the blocked-on-a-human status repeatedly while abolishing it. §5.6
forbids editing evidence to satisfy a linter, so the checkers changed instead:
tools/verbatim.mjs, one predicate, shared. Keyed on a marker in the first 400 bytes,
not on the directory, so an adversary pass WE wrote in the same folder is still fully
checked.

THEN I NOTICED WHAT I HAD JUST BUILT. That exemption makes INJECTIONS/ the one place
in the repository where a banned token can sit unchallenged - and the instructions are
what this loop is measured against. A rule quietly softened after the fact is the
single most valuable thing an unsupervised agent could forge. So the verbatim files
are pinned by sha256 in INJECTIONS/injections.lock, and governance invariant 6 fails
on any edit. Negative-tested three ways: planting the token in the adversary pass
(caught - no marker), appending the marker to REVIEW.md to self-exempt (caught - the
marker must be in the first 400 bytes), and editing a pinned injection (caught).

C.3 · SHIP STATIC INSTANCES, NOT THE VARIABLE FONT. AD-016.

The argument that settles it is not reliability. Core React Native on Android has no
way to set a variation axis on a Text, so a variable font renders as its DEFAULT
instance and nothing else - and Anek Odia's default is wght 500. The variable file
does not give three weights that might be unreliable; it gives ONE weight, reliably.

Measured, because C.3 says it interacts with B24:
  variable AnekOdia[wdth,wght].ttf   858,180 bytes   3.27% of B24
  three statics 400 + 500 + 700      489,820 bytes   1.87% of B24
43% SMALLER AND three real weights instead of one. No trade-off to agonise over.

THE NEAR-MISS, AND THE WHOLE ARGUMENT FOR THE CHECKER. The first statics I fetched
were what the Google Fonts v1 API serves by DEFAULT: 42 KB each, an apparent 85%
saving against the variable font. They contained ZERO ODIA GLYPHS - the API subsets to
Latin unless asked. Shipping them would have produced complete tofu in the primary
language while looking like a clever optimisation, and would have survived any review
that read file sizes instead of file contents. check:font caught it on the first run
against those files, before anything was committed. Re-fetched with subset=oriya,latin:
317 codepoints, 90 in the Odia block, danda and rupee present, ory2 GSUB present.

C.4 · TABULAR FIGURES - AND THIS ONE IS A REAL DEFECT, NOT A CONFIRMATION.

C.4 asks for a render test comparing the width of 1111111111 against 0000000000. I did
something stronger and cheaper: read the advance width of each digit straight out of
hmtx. No renderer, no device, exact integers.

  ANEK ODIA'S DIGITS ARE PROPORTIONAL BY DEFAULT, IN ALL THREE WEIGHTS.
  Regular: ten different widths, 672 to 1132 units at 2000/em. The "1" is about 60%
  the width of the "0". A money column set in the default figures DOES NOT ALIGN, and
  no layout code fixes it. Constraint 8 is not satisfied by this font as shipped.

The font does carry a tnum feature. I resolved its GSUB single-substitution lookups
and measured the substituted glyphs: ONE width, in every weight - 1087 / 1107 / 1179.

So the capability exists and the default is wrong, which is the worst combination:
correct in a specimen, correct wherever the feature happens to be applied, silently
ragged everywhere else - and "everywhere else" is a column of money, which is the
product. Recorded as DC-005. It obliges: every money style sets
fontVariant: ['tabular-nums']; a check-governance rule at G10 asserts it beside the
existing C.1 one-formatting-path rule; and DEVICE-CHECKLIST B4, because React Native's
fontVariant support on Android is the half no static check can settle.

AD-015 ANNOTATED, NOT REWRITTEN. Its typeface choice stands; its file and its sizes
are superseded by AD-016. F-06 was a decision recorded as done that was never done -
silently editing a superseded decision is the same disease from the other end.

Commands:
  $ npm run check:all  -> governance (6 invariants) benchmarks prose sms sms:segments
                          tooling generated font, all pass
  $ npx vitest run     -> 189 passed, 4 skipped
  $ npm run test:vectors:diff -> divergence: NONE

Negative tests this iteration, all confirmed to fail when they should:
  font · uncovered codepoint planted in a real od: string
  font · empty corpus
  font · one byte flipped in a pinned font
  font · a variable font added to the bundle
  font · tnum unable to deliver equal widths
  governance · banned token in a non-verbatim file in INJECTIONS/
  governance · self-exemption by appending the marker
  governance · an edited pinned injection
  tooling · an npm script naming a file that does not exist

NEXT — C.5 OS font scaling, C.6 keypad suppressing the system keyboard, C.7 process
death mid-entry, C.8 the Android back button, C.9 day boundary and device clock.

## 2026-09-19 · Iteration 16 · C.5 through C.9 decided

The injection's instruction for section C is "research each, decide it, record it in
TECH-DECISIONS.md, and where it is checkable make it a check". C.5-C.8 concern a
client that does not exist yet, so the deliverable is the decision and a named check
with a gate attached. C.9 reaches the engine, so part of it became a test today.

ADR-013 · C.5 FONT SCALING. Scaling is never disabled anywhere. Turning
allowFontScaling off is the obvious fix and it betrays the entire reason B29 exists -
a 17sp floor exists because these users cannot read small text, and overriding their
own accessibility setting to protect our layout inverts that. Two regimes instead:
scrollable content UNCAPPED and reflowing, fixed-height chrome capped at 1.5 because
a 56dp touch target cannot reflow and a keypad key that is hard to hit is worse for
this user than a label that stopped growing. 1.5 rather than 1.3 because 1.3 is the
COMMON setting - capping there caps the typical user, not the extreme one.

ADR-014 · C.6 KEYPAD AND THE SYSTEM KEYBOARD. The expected answer is
showSoftInputOnFocus={false}. Rejected in favour of removing the thing that summons
the keyboard: the amount is a Text inside a pressable, not a TextInput. There is no
focusable input, so there is no OEM, no accessibility service, no hardware keyboard
and no split-screen focus change that can raise a keyboard over the amount. A flag has
to hold everywhere; having no input at all is not a flag. Cost stated plainly - native
selection and cursor - and accessibility is kept via role, label and a value that
announces the running figure. TextInput stays where text is genuinely text: the
expense label and the party name.

ADR-015 · C.7 PROCESS DEATH. Most of this is already answered by constraint 2 -
committed lines are in SQLite before the phone call starts. The real question is the
field being typed, and the answer is the opposite of the intuitive one:
THE IN-PROGRESS AMOUNT IS DISCARDED, AND THE DISCARD IS ANNOUNCED.
A resurrected half-typed amount is a wrong number that looks like a right one. Someone
typing 450, interrupted after 45, returns to a field reading 45 - in the right place,
looking finished, one tap from being committed. Restoring partial input into a money
field manufactures plausible wrong figures. Three keystrokes cost three seconds; 45
for 450 corrupts a reconciliation the shopkeeper only discovers at closing time. The
G12 test must FAIL if the amount is restored, not pass.

ADR-016 · C.8 BACK BUTTON. Three cases by what is actually at risk. Nothing typed:
exit, no dialog. Digits typed: a confirm that NAMES the value, with "keep typing" as
the default. Committed lines: never at risk, and the dialog never implies they are.
No dialog when there is nothing to lose, because a dialog that fires needlessly trains
people to dismiss dialogs - and the one dialog in this product that must be read is the
day close. The G11 test asserts case 1 shows NO dialog, because a test that only ever
checks the dialog appears would pass an implementation that always shows it.

ADR-017 · C.9 DAY BOUNDARY AND DEVICE CLOCK. Extends ADR-004 (3) to the client rather
than restating or contradicting it.
  A · At 23:58 with a clock ten minutes fast, nothing happens - there is no auto-roll.
      Every header shows THE OPEN DAY'S DATE spelled out, never the device's date and
      never a relative word. A relative word is banned as a date label in all three
      languages: it is the one label that can be wrong on screen while being wrong in
      the data, and in this scenario it is precisely wrong.
  B · A clock correction is RECORDED, never applied. No timestamp is rewritten -
      created_at is what the device believed, which is evidence, not a measurement.
      The open day does not move. If the correction lands inside a CLOSED day, nothing
      special is needed: the AD-014 trigger already rejects it on both engines. D7
      holds whatever the clock does, because it is enforced below the clock.
  C · A BACKWARD CORRECTION REORDERS UUIDv7 IDS. Those ids embed a timestamp, so
      post-correction ids sort before earlier ones. Tolerated - but only after
      VERIFYING, not assuming, that no figure depends on entry order. Every engine
      total is a sum; the ordered outputs are ordered by value with a deterministic
      tiebreaker, never by createdAt and never by id.

AND THAT VERIFICATION BECAME A TEST, because a property established by reading is a
property a refactor silently removes. entry-order.spec.ts permutes the entries of every
vector - reversed and seeded-shuffled - and requires byte-identical output.
22 of 63 vectors have more than one entry and are permutable; the suite asserts that
count is non-zero rather than passing vacuously over single-entry days.
Negative-tested: planting an order-dependent term in primary.ts failed 6 of 23.

A monotonic per-day sequence column was considered and NOT added. It would make
entered-order exact, at the cost of a schema column and a client counter, to fix a
cosmetic reordering in a window that only opens when a clock moves backwards. It is
ADR-017's reversal trigger instead - and the trigger says it must go in BEFORE the data
it would order exists.

BUILD_STATE now carries a "checks owed, and where they attach" table - ten rows, each a
decision already made whose check cannot be written until the code exists. C.3-C.9
nearly went missing by living only in prose; these are not going to.

Commands:
  $ npx vitest run     -> 212 passed, 4 skipped (was 189)
  $ npm run check:all  -> all pass
  $ npm run test:vectors:diff -> divergence: NONE

NEXT — persistent restart-surviving rate limits (injection 08 B.2), the DC-003
compensating control, then the OTP service B.3-B.5.

## 2026-09-19 · Iteration 17 · B.2 persistent rate limits

Injection 08 B.2: limits must survive a restart and be shared across instances,
"whatever you choose, prove it: a test that restarts the service mid-limit and asserts
the counter survived."

STORE: POSTGRES (AD-017), by R3 - prefer the component already in the system. Redis is
faster and is a second thing to run, pay for, secure, monitor and back up, on the
t4g.small that DC-003 already calls the entire perimeter, to relieve load that does
not exist. In-memory was never a candidate and B.2 says why better than I can.

I ALMOST INVENTED THE LIMITS, AND THAT IS THE HEADLINE. I wrote a complete set of my
own - 5/hour, 10/day, 30 per IP, a 10-minute TTL - each with a paragraph of
justification, and only then checked whether the question had already been answered.
It had: SECURITY-AUDIT TB6, headed "concrete, and they are the spec". Nothing would
have flagged it. The numbers were plausible, the prose was good, and the effect would
have been silently overriding an earlier decision with a later opinion.

  The code now TRANSCRIBES that table. Every rule carries a `source` string naming the
  row it came from, and a test reads the numbers back out of SECURITY-AUDIT.md and
  compares them. Negative-tested from BOTH sides: changing max from 3 to 8 in the code
  fails, and changing 20 to 50 in the markdown fails.

  The two places where I still think the spec deserves a second look are R-006 (is a
  5-minute TTL long enough on a real 2G cell? DEVICE-CHECKLIST D2 already measures
  exactly that) and R-007 (per-IP limits under carrier-grade NAT). Raised, not
  implemented. R-007 explicitly records that the dramatic version of that finding is
  NOT the true one - sign-in is a once-per-device event, so 20/hour from one carrier
  NAT is probably fine - which is the F-03 lesson applied before filing.

TWO DESIGN POINTS THAT ARE NOT INCIDENTAL.

  SLIDING WINDOW, NOT FIXED. A fixed window resets on a boundary and lets through
  double across it. For the per-number-per-DAY cap - the one B.3 names as protecting
  the bill - that is twice the money at every midnight, silently. There is a test that
  fails specifically on fixed-window behaviour.

  THE LOCKOUT IS SEPARATE FROM THE WINDOW. TB6 has a Lockout column and it means what
  it says: three sends in fifteen minutes earns an HOUR, not another fifteen minutes.
  A plain sliding window would have released the caller as soon as the events aged
  out - quietly weakening the spec while looking correct. A breach writes ONE lockout
  marker; attempts made while locked out write nothing, so the release time never
  moves. That last property is load-bearing: a handset retrying in the background
  would otherwise extend its own lockout indefinitely, and T1.3 says locking a
  shopkeeper out of his own ledger is worse than any threat in the table.

NO PERSONAL DATA IN THE TABLE. The bucket is an HMAC under a server secret, never the
phone number. Rate limiting happens BEFORE authentication, so a plain-text table would
become a list of every number that ever tried to sign in - a DPDP liability in the one
table anonymous callers write to. The constructor refuses a key under 16 characters,
because a bare hash of a ten-digit Indian mobile number is brute-forceable in seconds.

SCHEMA. `rate_events` is server-only - the exact mirror of the device-only outbox - and
both halves are now asserted: it must exist on Postgres and must NOT exist on SQLite.

TWO REAL DEFECTS FOUND IN EXISTING TESTS WHILE DOING THIS.

  1. THE POSTGRES SUITE HAD BEEN SKIPPING ALL ALONG. `npx vitest run` reported "4
     skipped" for two iterations with a healthy container listening on the very port
     the tests expect, because nothing set DATABASE_URL and the suite read its absence
     as "no database". I had been reporting that skip honestly and had not asked why.
     The URL is now defaulted. 4 skipped -> 0.

  2. THE NEW SUITE THEN SKIPPED ALL THIRTEEN OF ITS TESTS in the full run while
     passing alone: it and postgres.spec.ts run in parallel workers and raced on
     CREATE TABLE in one shared schema, and the loser caught the error and marked
     itself unreachable. The run stayed green. Fixed with a separate schema rather
     than by serialising the suite.

  AND THAT EXPOSED A THIRD. With a second schema present, the S-10 row-level-security
  assertion returned 12 instead of 6: it queried pg_class by relname with no namespace
  join, so it had been counting tables in ANY schema. It was only ever right by
  accident. Now scoped to `public`.

  All three are the same shape and it is worth naming: a test that does not run, or
  runs against more than it means to, reports success either way.

Commands:
  $ npx vitest run     -> 230 passed, 0 SKIPPED (was 212 passed, 4 skipped)
  $ npm run check:all  -> all pass

FOUND, NOT YET FIXED - and it is bigger than anything above:
  `npm run typecheck` -> "Cannot read file tsconfig.json". THERE IS NO tsconfig.json
  ANYWHERE IN THE REPO. It has never run. Vitest transpiles without typechecking, so
  seventeen iterations of TypeScript have had no type checking at all.
  `npm run lint` -> "'eslint' is not recognized". ESLint is not installed and there is
  no config. It has never run either.
  Worse than either: CONSTRAINT 6 says money is integer paise everywhere, "lint
  enforced", and ADR-003 is titled "enforced by lint". THAT ENFORCEMENT DOES NOT
  EXIST. It is the same class as F-01 and F-06 - a control documented as present and
  never built - and it is attached to a non-negotiable constraint.
  Next iteration.

NEXT — tsconfig and a real lint, including the paise rule ADR-003 promises.

## 2026-09-19 · Iteration 18 · Typechecking and the lint that constraint 6 requires

Two controls this build has claimed since G1 and never had. Both found by running a
script I had no reason to think was broken, at the end of the previous iteration.

THERE WAS NO tsconfig.json ANYWHERE IN THE REPOSITORY. `npm run typecheck` had been in
package.json since G3 and had never once executed - "error TS5083: Cannot read file
tsconfig.json". Vitest and `node --experimental-strip-types` both ERASE types rather
than checking them, so every test passed and nothing complained. SEVENTEEN ITERATIONS
OF TYPESCRIPT WITH NO TYPE CHECKING, in a codebase whose central claim is that the
money arithmetic is right.

The script itself was also wrong - `tsc --build --force` needs composite project
references this repo does not use - so it would have failed even once a config
existed. Now `tsc --noEmit`, and in check:all.

NINE ERRORS ON THE FIRST RUN. Two were real:

  `source: 'imported' as 'manual'` in author-vectors.ts. A CAST THAT LIES, written
  during adversary pass F-04 to silence a compiler that was not running. The vector
  it produces is correct; the type said the column could only hold 'manual' while the
  data held 'imported'. Widened to the real union. F-09's `label` had the same
  history - added to the data, never to the type.

  `IsoDate` declared identically in dates.ts AND types.ts, which made `export *` from
  both ambiguous. Invisible until something checked.

The other seven were `noUncheckedIndexedAccess` and implicit-any findings in tests.
All fixed in the source; none suppressed.

`npm run lint` HAD NEVER RUN EITHER - eslint was not installed and there was no
config. And that one is worse, because CONSTRAINT 6 says money is integer paise
everywhere, LINT-ENFORCED, and ADR-003 is titled "enforced by lint" and specifies the
rule by name in four clauses. A NON-NEGOTIABLE CONSTRAINT WAS RESTING ON A CONTROL
THAT DID NOT EXIST. Same class as F-01 and F-06, attached to something that matters
more than either.

BUILT: tools/eslint-rules/no-money-float.mjs, all four ADR-003 clauses transcribed
rather than invented, with a RuleTester suite carrying a passing AND a failing case
for each clause. The test caught a real bug in the rule on its first run:
`new Intl.NumberFormat(...)` is a NewExpression, not a CallExpression, so the handler
never saw it - and `new` is the form people actually write.

WHERE IT RUNS, AND WHY NOT WHERE THE ADR ASSUMED. A repository hook refuses writes to
eslint.config.mjs: "Fix the source code to satisfy linter/formatter rules instead of
weakening the config." That is a good rule. It cannot tell "weakening a config" from
"creating the first one", and I am not going to route around it by choosing a
different file extension - that would defeat a guard put there deliberately while
looking like compliance. So the ENFORCEMENT lives in tools/check-money-lint.mjs,
which runs the real rule through ESLint's Linter API over 45 files and fails the
build, and is in check:all. The editor-integration config is H11, which explicitly
says nothing is blocked on it.

WHAT THE RULE FOUND: eleven hits, and NOT ONE was a money defect. Every one was the
money vocabulary being used for something else - `total` for a character count in the
DLT 40% check, `total` for a count of tests in detection-rate, `total` for font bytes
in check-font-coverage. Renamed, all of them, rather than narrowing the rule. In a
money application those words should mean money, and the rule enforcing that is worth
more than the eleven renames cost.

  Two judgement calls, recorded because both could have gone the other way:
  - Clause 4 bans toFixed outside formatPaise. `share.toFixed(1)` formats a
    PERCENTAGE, not money, so a narrowing was tempting. Converting to
    `Math.round(x * 10) / 10` costs one line, so the rule stays exactly as ADR-003
    wrote it. Narrowing a documented rule to fit the code is the move this loop is
    supposed to refuse, and it is much easier to justify when the alternative is
    cheap.
  - A test doing `acc + l.amount` now goes through `add`/`subtract` from money.ts.
    Strictly better than the suppression would have been: those helpers assert
    integrality, so a working line carrying a float now fails there too.

ALSO REMOVED: two `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
comments. They named a rule no config has ever loaded, so they had never suppressed
anything - ESLint reports them as errors in their own right. Cargo-culted into a repo
with no linter.

Commands:
  $ npm run typecheck  -> clean (first successful run in the project's history)
  $ npm run check:money -> 45 files, no violations
  $ npm run check:all  -> 10 checks, all pass
  $ npx vitest run     -> 231 passed, 0 skipped

Negative tests, all confirmed:
  money lint · float arithmetic planted in primary.ts   -> 2 failures
  money lint · decimal literal planted in the engine    -> 1 failure
  rule       · every invalid case in the RuleTester suite

DRAFT eslint.config.mjs FOR H11 - registers the rule as the `swafto` plugin and adds
ADR-012's purity bans (no-restricted-globals for Date/Intl/process/fetch,
no-restricted-properties for Date.now and Math.random, no-restricted-syntax for
`new Date()` and toLocaleString) scoped to packages/formula-engine/src, with tests
exempted because several exist precisely to drive a clock the engine refuses to read.

NEXT — the DC-003 compensating control, then the OTP service B.3-B.5.
