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

## 2026-09-19 · Iteration 19 · Injection 13: verify the verifiers

### A · THE TTL CONTRADICTION — AND IT WAS OLDER AND WORSE THAN REPORTED

Not code-vs-template. TWO ARTIFACTS ALREADY DISAGREED, and had since injection 08:

  SECURITY-AUDIT TB6, written at G3 (06f6044):   "5-minute TTL", stated, no reasoning.
  SMS-TEMPLATES.md,   written at inj 08 (d57e537): "10 minutes", trade-off argued,
                                                   naming OTP_TTL_SECONDS = 600, and
                                                   "Valid 10 min" in the English SMS.

At iteration 17 I transcribed TB6 and wrote R-006 saying "the spec stands". THAT
DEFERENCE WAS TO THE WRONG ARTIFACT. The later, more specific, reasoned ruling said
ten. Deferring to an existing decision is only safe if you find ALL of them, and I
found one and stopped. "The spec says X" is a claim about search coverage, not about X.

RULED 10 MINUTES · SPEC-DIGEST C-8. The copy is the expensive artifact — after DLT
registration a wording change is twelve re-registrations, the constant is one line —
and five minutes fails the SCENARIO, not the edge case. TB6 annotated in place, not
quietly rewritten. R-006 closed against my own reasoning.

CHECK · check:sms now reads OTP_TTL_SECONDS out of limits.ts and compares it against
every duration stated in any template, in any language. Negative-tested three ways:
drift the constant (caught), drift the copy (caught), make the constant unreadable
(caught — and it FAILS rather than skipping, because a check that cannot find its
subject must not pass).

### B · §5.12 THE VERIFIER INVENTORY

VERIFIERS.md, generated from tools/check-verifiers.mjs and therefore unable to drift
from it. 16 verifiers: command, claim, implementing file, plantable defect.

  $ npm run check:verifiers   ->  every cited command exists; every benchmark mapped
  $ npm run prove:verifiers   ->  plants each defect, requires a FAILURE, restores,
                                  and verifies the restore

12 of 16 are plantable and ALL TWELVE now fail on their planted defect. The other four
carry a written reason they cannot be planted rather than a blank.

THE HEADLINE NUMBER: 10 of 40 benchmarks have an instrument. 30 DO NOT. That is what
the SHA lock was hiding — it froze the thresholds and left the measuring instruments
unexamined, so a benchmark could be green because nothing measured it.

§5.12.4 RETROACTIVE SWEEP OVER ALL 21 GATES — FIVE FINDINGS:

  V-1 · G2's recorded command IS BROKEN AND ALWAYS WAS. Its alternation is escaped in
        a way that grep -E reads as a LITERAL pipe rather than an alternation. It
        matches nothing, returns 0, exits 1, and could never have produced the "52"
        printed beside it. The corrected command gives 40. A gate PASS whose evidence
        line has never once produced its own recorded output.

  V-2 · G3's "STRIDE rows: 87" counted EVERY TABLE ROW in SECURITY-AUDIT — trust
        boundaries, the register, the rate-limit table — and labelled them STRIDE.
        Real STRIDE threat rows, then and now: 28. Right number, wrong noun. Checked
        against the file as it stood at the G3 commit, not only as it stands today.

  V-3 · G19 cites `npm run check:traceability`, WHICH I DELETED AT ITERATION 15 as a
        script naming a missing file. B13 and B39 have had no instrument since. I
        removed a dead command and did not notice a gate depended on its name.

  V-4 · G4 REOPENED. Planting `BEFORE UPDATE OF amount ON entries` — narrowing the
        append-only trigger to ONE COLUMN — left the entire suite green. Every
        append-only test had only ever updated `amount`. On Postgres the REVOKE would
        still catch it; ON SQLITE THE TRIGGER IS THE ONLY DEFENCE, and SQLite is the
        authoritative store. A column-scoped trigger there means a ledger row whose
        section, party, day or label can be rewritten in place, silently, forever.
        Now swept across four unconstrained columns on both engines — chosen because
        none carries a CHECK constraint, so a rejection can only be the append-only
        trigger and not some other guard firing first and passing for the wrong
        reason. The planted narrowing now fails. G4 re-earned, not re-assumed.

  V-5 · BENCHMARKS-RESULTS.md, referenced by the frozen BENCHMARKS.md since iteration
        6, DID NOT EXIST. Same family as the three absent commands.

B3 MEASURED FOR THE FIRST TIME, and the instrument was wrong before the engine was.
First reading 57.73% branch. The 63 golden vectors ran in a SEPARATE Node process the
coverage tool could not see. Putting them under the runner moved the same unchanged
engine to 85.71%. 28 points of the apparent shortfall were the instrument.
85.71% against B3's 100% is a real miss, recorded in BENCHMARKS-RESULTS.md with where
the gap is: rejection and gate-closed arms — the same shape as assertPaise 0/59, since
the corpus describes VALID days and therefore cannot reach the arms that fire when
something is wrong. Threshold unchanged. Attempt 1 of 3.

B1 likewise recorded: 63 of 70, attempt 1 of 3, to be closed at G7/G8 where the
scenarios exist rather than by writing seven vectors today to move a number.

CAUGHT MYSELF: check-verifiers used shell:true, which check:tooling bans as a platform
trap. It flagged my own file. Replaced with explicit .cmd resolution on Windows. The
mechanism from iteration 15 catching the author of the mechanism.

### C · A11 · CONTENTS, NOT METADATA — added to the checklist in REVIEW.md

### D

D.1 · R-007 RULED, and the spec was wrong as written. Per-IP goes from 20/hour with a
      1-hour lockout to 2000/hour, telemetry only, never a lock. Carrier-grade NAT
      means one address can be a whole neighbourhood of real shopkeepers on one cell.
      Made STRUCTURAL rather than conventional: lockoutSeconds 0 marks a
      telemetry-only rule and consume() cannot return allowed:false for one, so a
      future caller cannot gate on it by accident. It reports `saturated` instead.
      Tested by hammering it 2025 times: 0 denials, saturation reported. The CGNAT
      reasoning is in SECURITY-AUDIT so nobody tightens it later for looking loose.

D.2 · The comparison D.2 asks for, done exactly rather than rendered: ten 1s measure
      6720 units against ten 0s at 11320 — A 4600-UNIT GAP IN A SINGLE ROW, about 2.3
      em. With tnum both are 10870. Asserted in check:font, plus a teeth-check that
      fails if the default digits ever measure equal while being reported
      proportional. Negative-tested by removing the "1" from the tnum map.

D.3 · ADR-015 strengthened: the discard must be SEEN. Silently discarding still leaves
      "did I already type that?", and people answer that question by typing it again —
      which is how an expense gets entered twice. Field visibly empty showing its
      placeholder, banner names how many lines survived, banner persists until
      dismissed or the next commit, because a faded toast is no banner to someone who
      was looking at the customer.

D.4 · The cast's lie assumed nowhere else — CONFIRMED BY GREP, not by reasoning: the
      engine reads no `source` field at all. The DB CHECK constraint did already
      validate it, but the rejection corpus had no case, so a wrong value was refused
      by luck of schema rather than by design. Added `enum-unknown-source`; 34 -> 35
      cases.

Commands:
  $ npm run check:all         -> 11 checks, all pass
  $ npm run prove:verifiers   -> 12 of 12 plantable verifiers fail as they should
  $ npx vitest run            -> 303 passed, 0 skipped (was 231)
  $ npm run coverage          -> 85.71% branch (B3 MISSED, recorded)
  $ npm run test:vectors:diff -> divergence: NONE

Injection 14 persisted verbatim and injections.lock RE-PINNED deliberately — the only
sanctioned reason, a new injection arriving. The lock caught the unpinned file first.

NEXT — DC-003's compensating control, then the OTP service on the limiter.

## 2026-09-19 · Iteration 20 · Injection 14: instruments before subjects

### A.1 · THE PARTITION — "30 MISSING" WAS THE WRONG SHAPE

Splitting the 30 by whether their SUBJECT EXISTS changes what the number means:

  instrumented    10
  OVERDUE          6   B4 B5 B6 B13 B35 B39 - subject exists, nothing measures it.
                       A PRESENT FAILURE under §5.13, not a backlog item.
  blocked         24   subject does not exist; each names the artifact and the gate.

All six overdue are now closed. **16 of 40 instrumented, 0 overdue.**

  B5  backend coverage - the `coverage` script existed and simply never pointed at
      apps/api. One line. FIRST MEASUREMENT: 91.26% lines against >= 85%. MET.
  B13 traceability empty cells - instrument rebuilt after I deleted it at iteration
      15. 0 empty cells. MET.
  B39 traceability completeness - 0 of 26, and the instrument says WHY: every row is
      held back by the api and screen columns, which cannot resolve because there
      are no routes and no components.
  B35 secret scanning, repo half - new scanner, 102 files, 9 high-confidence rules,
      one allowlist entry carrying its reason. 0 secrets. APK half stays blocked.
  B4/B6 mutation score - Stryker installed and running. See the provisional note.

THE TRACEABILITY INSTRUMENT FOUND SOMETHING ON ITS FIRST RUN, and it is the A11
pattern again. The obvious implementation checks for empty cells; every cell is
full, so that version passes. Resolving the cells against reality instead:
**26 unresolved references - 8 engine functions and 18 vectors NAMED IN THE MATRIX
THAT DO NOT EXIST.** parseSalesEntry, captureCountedCash, in2-purchase-modes and 23
more. Those rows are TODO, so naming a planned artifact is a plan rather than a lie -
but the count was invisible until something resolved it, and at G19 it would have
been discovered as a wall rather than a list.

AND A WORSE ONE, TWO ERRORS THAT CANCELLED. Adversary pass F-10 claimed BI6's four
artifacts were "all present" and instructed that its status be promoted to DONE.

  - THE PREMISE WAS FALSE. apps/api/src contains no routes at all and apps/mobile
    contains zero .tsx files, so the endpoint and both screens did not exist. WIP
    was correct all along.
  - AND THE FIX WAS RECORDED AS APPLIED WITHOUT BEING APPLIED. BUILD_LOG and the
    iteration-13 commit message both say "BI6 WIP -> DONE". Searching the history of
    that file for BI6 returns ONLY the G0 commit.

  Fourth instance of "recorded as done, never done" - and the worst, because it was
  my own adversary finding whose remedy I claimed in a commit message. TWO FAILURES
  CANCELLING IS NOT A PASSING STATE: had I applied the "fix", a row with an imaginary
  endpoint and imaginary screens would now be counted toward B39. The adversary pass
  is annotated rather than rewritten.

Also fixed: TRACEABILITY's header called BI5 and BI6 "the two known reservations".
BI6 is not reserved - it is decided, implemented and vector-covered, waiting on an
endpoint and two screens.

### A.5 · TWO NUMBERS, ALWAYS TOGETHER

check:verifiers now prints INSTRUMENTED before MET, because MET is bounded by it and
"benchmarks met" alone is the exact shape of claim the lock was hiding.

### B4/B6 · THE HARNESS AGAIN, EXACTLY AS §5.13 PREDICTS

Stryker runs. First reading on money.ts: **9.66%**, and it is NOT a measurement of
B4. Its dry run reports "Ran 170 tests"; the suite has 303. It sees the five
formula-engine and rejects specs and never sees sms-templates (84), append-only (20),
rate-limit (15), closed-day-guard (7), postgres (6) or the lint rule (1) - so every
mutant is judged by half a suite, and the missing half is every database guard.

B3 read 57.73% and moved 28 points on an unchanged engine. B4 reads 9.66% with a
demonstrably incomplete harness. Recorded as PROVISIONAL, not claimed, and NOT
counted as an attempt. One thing in it is worth keeping either way: 12
arithmetic-operator survivors inside the audited money helpers. If those survive the
harness fix, they are a real finding about the money path.

Cost accepted: Stryker brings 2 MODERATE advisories (qs, via typed-rest-client),
dev-only and transitive. B33 is high/critical and remains 0. Precedent OD-8.

### D.2 · PROJECTION.md

Written now rather than at 40. 6 of 21 gates, 0 of 27 screens, 0 API routes.
Estimate 34 iterations remaining against 40 left - 54 of 60 - with the reasons it is
probably optimistic stated plainly: twelve of those 34 are client gates on ground
with no code, and six injections in twenty iterations are not priced in. Ranked
cut-list, cheapest first: the BI SCREENS but never the BI engine (gated 14-21 days,
so it costs a new user nothing in month one), then eight non-P0 screens, then reports
depth. Never cut: the day close, the four forms, Odia, offline, append-only, the
money path, the 17sp floor, H8.

### C · A12 · THE SCOPE OF THE DEFENCE

Added, plus the retroactive audit the injection asks for: every guard now in place,
its scoping axis, and whether a plant moves along it. Two say PARTLY and say so
rather than ticking - the closed-day trigger has no plant for a CORRECTION whose
corrects_day_id is closed while its own day is open, and cross-tenant isolation has
no plant that actually reads across tenants. Both owed, both written down.

### D.3 · EVERY RECORDED NUMBER MUST BE RE-DERIVABLE

Five cheap derivations now run on every check:verifiers. THREE MORE STALE NUMBERS,
after G2's and G3's:

  G0 recorded 526 lines of SPEC-DIGEST - it is 569.
  G1 recorded 12 ADRs - there are 17.
  G5 recorded its vector count in a form nothing could re-derive.

All corrected. Negative-tested by staling G1 to 99.

The check itself had the bug it was hunting: one regex spanned the gap BETWEEN two
bold runs and read "iteration 19" as a recorded figure. The negative test is the only
reason it is not still there.

Commands:
  $ npm run check:all       -> 13 checks, all pass
  $ npx vitest run          -> 303 passed, 0 skipped
  $ npm run check:verifiers -> 16 of 40 instrumented, 0 overdue, 5 numbers re-derived
  $ npm run coverage        -> engine 85.71% branch, backend 91.26% lines

OWED FROM THIS INJECTION, NOT DONE: section B, the canonical value registry - the
largest remaining item and the one that kills the TTL class outright; the mutation
harness; D.1's rejects.json before G7. All recorded in BUILD_STATE's RESUME.

NEXT - the value registry, then the mutation harness, then DC-003's control.

## 2026-09-19 · Iteration 21 · Injection 15: hard stop at 40

Ceiling 40, not 60. Owner's decision, final. 19 iterations remain. A.7 and §5.14
first, as the queue directs.

### A.7 · THE REPRICE — AND THE ANSWER IS NO

With section D's queue exactly as written:

  §5.14 1 · value registry 2 · mutation harness 2 · rejects.json + B3 2 ·
  DC-003 1 · OTP service 2 · G7 3 · G8 2 · fixtures 1   =  16
  LEFT FOR SIXTEEN SCREENS                              =   4

Four iterations buys three or four screens at full §B.6 - and the first of them also
has to stand up a React Native project that does not exist, the design tokens, the
i18n scaffolding and the screen-test harness. The queue as written delivers the four
form archetypes and perhaps the day-close list. IT DOES NOT CLOSE A DAY, which fails
A.2, the sentence the ceiling was set around.

A.7 says cut from the bottom of A.3. I did the arithmetic and the bottom of A.3 is
not the lever: removing parties detail, sign-in and the sync states takes seven
screens off a set I cannot reach the start of.

THE LEVER IS ONE LAYER DOWN. A.2's target is an OFFLINE app. DC-003's control, the
OTP service, G7 and G8 are server-side, none of it is walkable on an emulator with no
network, and they are EIGHT of the sixteen iterations. AD-018 moves the server block
behind the screens. Every item A.6 protects stays in front of them. Nothing in §5.1,
§5.9, §5.12, §5.13 or §6 is touched and no threshold moves. What is cut is features,
and the feature cut is the server.

  What it costs, written down rather than glossed: no sync, so the outbox fills and
  never drains; no real sign-in, so item 7 builds against StubSmsPort, which is what
  that port was built for; B8, B11 and B36 never get instruments. The rate limiter
  and the SMS port stay built and tested - only the routes on top of them defer.

COMMITTED: A.3 items 1-5, about eleven screens - the four forms, the nine-section
list with its three row states, the cash check with counting, difference, balanced
and the closed-day summary, opening cash and first run, and Today in three states.
That alone satisfies A.2. STRETCH: items 6-8, cut in reverse order.

Between a working day close with no sync and sync with no day close, the day close is
the product. D2, D7 and the whole nine-section sheet live there. One line from the
owner reverses it, and PROJECTION.md states the alternative outcome so the trade is
visible before it is taken rather than after.

### §5.14 · STATUS IS DERIVED, NEVER ASSERTED — AND IT FOUND A FIFTH INSTANCE

Writing the predicate for F-06 turned up that F-06'S OWN FIX WAS ALSO NEVER APPLIED.
ADR-011's status line still read "Accepted, measurement blocked on hardware (G18)".
Searching the file's history for the supersession text returned NOTHING.

So the chain is: AD-010 asserted ADR-011 was annotated as superseded. It was not.
Adversary pass F-06 found that and instructed the annotation. THAT FIX WAS THEN
RECORDED AS APPLIED IN BUILD_LOG AND IN A COMMIT MESSAGE, AND WAS NEVER APPLIED
EITHER. The finding ABOUT unapplied fixes had its own fix go unapplied, for eight
iterations, with two documents saying otherwise. Annotated for real at iteration 21,
at the third attempt, and the history is written into the annotation because it is
the clearest argument in this build for the rule.

FINDINGS.md now holds all 17 findings and NOT ONE carries a status word. Each owns a
PREDICATE evaluated against the repository on every run, and the status column is
whatever that predicate returned. A finding cannot be marked fixed - it can only BE
fixed.

  15 FIXED (derived) · 1 OPEN · 1 WITHDRAWN.

  WITHDRAWN is F-10, and the distinction matters: its premise was FALSE, so it is not
  fixed and never needed fixing. Calling it fixed would stack a second untruth on the
  first. Its predicate now holds the repository to that reading.

  OPEN is V-7, the 26 unresolved traceability references. §5.14.5 requires each built
  or the claim removed. Not started, and it fails loudly rather than sitting quiet.

THE CHECK CAUGHT ITSELF ON ITS FIRST RUN: V-1's predicate looked for "literal pipe"
where BUILD_STATE says "LITERAL pipe", so V-1 came out OPEN. The predicate was wrong,
not the fix - and it FAILED CLOSED, refusing to call something fixed that it could
not confirm, which is exactly the behaviour the rule wants from a predicate that is
unsure.

Negative-tested by reverting F-06's annotation - precisely what history had already
done once by accident. Caught, named, and reported with the right diagnosis.

### A.4 · DEFERRED.md — a deliverable, not a note

Four cuts, each with what it is, why it went, what it blocks and what it costs: the
server (8 iterations to restore), Reports and every BI screen (2-3, and THE ENGINE
STAYS - BI1-BI4 and BI6 built, tested, 87% covered), the Play Store set (2, and PLAY
SUBMISSION IS BLOCKED WITHOUT IT), Settings and the support surface (4-5, with the
app lock first back at about 1).

### A.5 · B38 AND B39 REPORTED AS MISSED — SCOPE

B38 needs 27 of 27 screens; the ceiling funds about 11. The threshold is untouched
and "screen" is not redefined. Both carry a reason code in the generated partition,
and check:verifiers prints "a scope miss is a DECISION; a performance miss is a
FAILURE. Never merged." A build reporting 16 of 27 with the reason attached is worth
more than one that reaches 27 by changing what the word means.

Commands:
  $ npm run check:all       -> 14 checks, all pass
  $ npm run check:findings  -> 15 fixed, 1 open, 1 withdrawn, every status derived
  $ npx vitest run          -> 303 passed, 0 skipped
  $ npm run check:verifiers -> 16 of 40 instrumented, 0 overdue, 2 MISSED - SCOPE

NEXT — the canonical value registry, then the mutation harness and the twelve
arithmetic survivors, then rejects.json and the B3 re-measurement. All three are
A.6-protected and none may be traded for schedule.

## 2026-09-19 · Iteration 22 · Injection 16: AD-018 confirmed, and judgements expire

AD-018 confirmed by the owner and not reversed. Three things recorded so they cannot
be deferred along with the server, plus §5.15.

### WHY THE CUT IS SOUND RATHER THAN LUCKY — now in DEFERRED.md

The stronger version of the argument, and a future reader needs it: **the deferral is
safe because of a decision made at G0.** Constraint 2 makes the local store
authoritative and every write succeed locally first, so the day close is complete
without a server BY DESIGN - nine sections, cash check, carry-forward chain and every
derived figure computed on the device from the device's own SQLite. Sync is ADDITIVE;
it copies a finished, correct day somewhere else.

In almost any other product this cut would gut the app, because the server is where
the truth lives. Here there is no truth on the server that is not already on the
phone. The build is not compromising its architecture to hit a ceiling - IT IS
COLLECTING ON A CHOICE MADE TWENTY-ONE ITERATIONS AGO.

And what defers is IMPLEMENTATION, not DESIGN: the schema migrating on both engines
with 63 tests, the rate limiter built and restart-proven with 15, the OTP service
specified down to TB6's limits and the C-8 TTL ruling, twelve SMS templates measured
to one segment each, the sync protocol decided in ADR-004. What is missing is routes,
handlers and wiring. Handing over finished designs with their tests is a materially
cheaper thing to resume than handing over an intention.

### AD-019 · THREE THINGS THAT STAY WHEN THE SERVER GOES

Not separate work - CONSTRAINTS ON HOW THE FIRST SCREENS ARE BUILT, recorded where
the scaffolding iteration will read them. All three are the pattern D1 already used
twice: the entry UUIDv7 and the `source` column are both unused today, both cost
nothing to carry, and both would cost a migration to add later on a device holding
months of a shopkeeper's ledger. PRESERVE THE OPTION WHILE IT IS FREE.

  A.1 THE OUTBOX IS IN THE WRITE PATH; THE DRAIN IS NOT BUILT. Every write
      accumulates with its UUIDv7 exactly as it will when sync exists. The outbox is
      a table and one insert; the drain is the eight iterations AD-018 cut. Without
      it, adding sync later means retrofitting every write site - the precise
      migration the client-side UUID was designed to avoid.
  A.2 THE SHOP ID IS A CLIENT-GENERATED UUIDv7 FROM DAY ONE, so the server ADOPTS it
      at first sign-in rather than assigning one. A placeholder or an integer turns
      that first sign-in into a data migration on a device full of real history.
  A.3 B36 IS INSTRUMENTED WITH THE FIRST SCREEN, NOT WITH THE SERVER.

B36 WAS MY ERROR AND THE INJECTION CORRECTED IT. I listed it beside B8 and B11 as
never-instrumented when the server was deferred. Right for those two, wrong for this
one: a CLIENT day close writes CLIENT logs, and crash reporting ships them OFF THE
DEVICE, so an amount or a party name in a log line is a DPDP matter under LEGAL §1
rather than untidiness. Reclassified - its subject is the first screen's first log
line, and §5.13 makes the instrument due then.

### §5.15 · JUDGEMENTS EXPIRE

Predicates close the hole for anything DERIVABLE. They cannot close it for a
judgement - an estimate, a cost, a severity, a reversal trigger - and those go stale
silently, which is F-06 in slower motion.

Ten judgements now carry the iteration they were MADE in. Anything older than five is
printed as STALE on every run. It does NOT fail the build: a stale judgement is not a
defect, it is a thing that needs thinking about, and the failure mode being guarded
against is silence rather than staleness.

  ONE STALE ON THE FIRST RUN: the finding severities, last stated at iteration 13.

THE CURRENT ITERATION IS ITSELF DERIVED, from the BUILD_LOG headings, which are
appended by the work. It has to be: BUILD_STATE's own header read "Iteration: 7" at
iteration 22 - a hand-written number nobody had updated, sitting in the file that
tracks the rule about hand-written numbers. Fixed by REMOVING the number rather than
by correcting it.

### C · THE SCREEN PHASE, RECORDED BEFORE IT STARTS

FORM A IS FIRST BECAUSE IT IS HARDEST. In one screen: the custom keypad and its
keyboard suppression, money through the registry, tabular figures and DC-005's
proportional-digit fix, bundled Anek Odia rendering, a sticky running total computed
by the engine from the real store, and B.1's fixture rule end to end. Every unknown
front-loaded across ten iterations is in that one screen. Two iterations budgeted,
and the first is expected to be ugly.

Then the first contact sheet IMMEDIATELY - even one screen, even wrong. It is the
first artifact in this build a human can judge by looking, and the Odia rendering
question is answered by looking rather than by any test in this repository.

Then B26-B29 instrumented straight away, before ten more screens multiply whatever is
wrong in the token set.

Commands:
  $ npm run check:all       -> 14 checks, all pass
  $ npm run check:verifiers -> iteration derived · 10 judgements, 1 STALE
  $ npx vitest run          -> 303 passed, 0 skipped

check:generated caught BENCHMARKS-RESULTS.md un-regenerated after the B36
reclassification - the partition is generated, so changing a classification without
re-running is exactly the drift it exists to catch.

NEXT — the canonical value registry, then the mutation harness and the twelve
arithmetic survivors.

---

## 2026-09-20 · Iteration 23 · Injection 17: the canonical value registry

**Recorded late, at iteration 24.** The work shipped as commit `e167882` and this
heading was never appended, so `check:verifiers` derived the iteration as 22 for a
whole iteration. The gap is left visible rather than back-dated: an append-only log
that silently acquires a missing entry is worth less than one that admits it.

`packages/values` became the single home for every value that lives in more than one
place — A.1's point that it is a MODULE, not a document. External values carry their
authority and the date it was established. `check:registry` enforces four directions:
no document may disagree, no code may keep its own literal, no new hand-typed
`Label: number` field, and every external value must name a source.

56dp and 17sp are filed as OURS, not external: they are stricter than the platform's
48dp because of who this app is for.

---

## 2026-09-20 · Iteration 24 · Injection 18: survivors are findings, scores are not

### The answer to the one number the owner said he would watch

**One of the twelve was real.** Eleven of the twelve arithmetic-operator survivors in
`money.ts` are killed by tests that already existed. The twelfth was a genuine hole:

    stdevMoney:  Math.sqrt(acc / values.length)  ->  Math.sqrt(acc * values.length)

`stdevMoney` had exactly one test. It passed `[]` and `[500]`, and **both return
early** — null at line 171, zero at line 172. The division on line 179 had never been
run by a test that checks its result. Every rupee of cash-discipline scoring goes
through that line.

It is not an equivalent mutant, and the distinction is the whole of A.3. For a single
value `n = 1`, so `acc / n` and `acc * n` genuinely cannot be told apart — which is
exactly why the one existing test could not tell them apart. From two values up they
diverge. Uncovered, not indistinguishable. So it got tests, four of them, pinning the
population divisor, the rounding, zero spread and shift-invariance.

A.5 says a real survivor in the money path outranks Form A. It did, and it was fixed
before a screen renders a figure through these helpers.

### I had this wrong, and the correction is the interesting part

Earlier this session I reported all twelve as killed. That measurement was taken
against a polluted tree and it was wrong. Three separate instrument defects stood
between the question and the answer, and each would have produced a confident,
entirely false result:

1. **Twelve kills from twelve runs that never happened.** `execFileSync` cannot spawn
   a `.cmd` without a shell — blocked since CVE-2024-27980 — and fails with *empty*
   stdout, indistinguishable from a suite that ran and printed nothing. A fallback
   then returned `1`, which is precisely the value §5.9 reads as "killed by one test,
   nearly as fragile as a survivor". It printed that for all twelve, unanimously.
   `shell: true` would have fixed it and is banned by check-tooling since iteration
   15; resolving vitest's entry and handing it to node needs no shell.

2. **Kills credited to a database that was not listening.** Raw failure counts let
   flaky Postgres suites stand in for real detections. Fixed by subtracting an
   unmutated baseline *by test name*, so a mutant is credited only with failures that
   are new.

3. **A stale Stryker sandbox was a second copy of the repository.**
   `.stryker-tmp/sandbox-2dFJHU/` was untracked, un-ignored, and discovered by vitest.
   Every test ran twice — 606 reported for a 303-test suite — and the two copies of
   `postgres.spec.ts` raced each other against the same database. **That is the
   intermittent G4 failure seen since iteration 17.** Removed and gitignored. With it
   gone the suite is 11 files, 309 tests, all passing.

The no-op plant caught the first two. A smoke test would have caught neither, because
both produce a green, plausible, completely fabricated table.

### The survivor set, not the score (A.1)

Baseline before any fix, in `reports/mutation/baseline-survivors.json`: 131 survivors,
12 of them arithmetic operators in the audited helpers. After: **zero survivors, zero
equivalence claims.** The full table with per-mutant detection counts is in
BENCHMARKS-RESULTS.md, which records the SET rather than a percentage.

### §5.9 over the result (A.4)

Detection counts now run 2 to 19. The first honest adjudication found three mutants
killed by exactly one test each — as fragile as survivors. Two were fixed by the
`stdevMoney` tests. The third was `medianMoney`'s comparator, which got two tests
pinning numeric ordering rather than one arrangement of it: JS's default sort is
lexicographic, and negatives separate ascending order from a comparator returning a
sum. **Minimum detection count is now 2.**

### B4 and B6 are NOT INSTRUMENTED — correcting iteration 20

Iteration 20 recorded them as instrumented with a provisional reading. That was the
wrong test. Stryker exists, runs, and reports a number; the number is about Stryker.
It called all twelve money mutants Survived when eleven die to tests that predate it.

Two disproofs, either sufficient alone: its dry run finds 170 of 303 tests and the
missing 133 are **not** the cause, because the 170 it does see already contain the
killing tests; and with `coverageAnalysis: all` it logs "Ran all tests for this
mutant" and then reports 8.96 tests per mutant on average.

INSTRUMENTED drops from 16 to 14 of 40. That is the honest direction for that number
to move this iteration.

`mutation:money` does **not** replace them. It adjudicates twelve named mutants on one
file and produces no score. B4's 90% threshold is frozen, unmet and unmeasured, and
A.2 is explicit that this bar is additional to it, not instead of it.

### B · the quotation exemption (done before A)

Narrowed to quoted **AND** attributed to a named artifact, re-tested with quoted spans
stripped so prose that merely mentions an old number still fails. The exemption count
is printed every run and counts only exemptions that actually suppressed a match —
which took it from 24 to 1, because the 24 counted lines where no rule would have
matched at all. A count that looks like a widening hole while measuring nothing is
worse than no count. Negative-tested three ways: quoted-but-unattributed fails,
attributed-but-unquoted fails, a real quotation passes.

The same shape was then applied to the DB-bound exclusion in the new harness: narrow,
printed, and guarded by a check that fails if either excluded spec ever references the
module under mutation.

Commands:
  $ npm run check:all             -> 14 checks, all pass
  $ npm run mutation:money        -> 12 planted, 12 killed, 0 survivors
  $ npm run mutation:money:prove  -> a no-op is reported as a survivor
  $ npx vitest run                -> 11 files, 309 passed, 0 skipped

NEXT — rejects.json and the B3 re-measurement. Per injection 18 C the mutation diff
waits until after it lands, so it is measured once against the real suite. Then the
two fixtures, then Form A over three iterations, with the checkpoint at 26.

---

## 2026-09-20 · Iteration 25 · Injection 19: the polluted window

### A.1 · THE PREMISE IS WRONG, AND SO WAS MY OWN RECORD

The injection says the sandbox "has been there SINCE ITERATION 17" and that every test
ran twice for seven iterations. It had not, and they did not. **The window is about
fifteen minutes inside iteration 24.**

I am not in a position to be smug about this. The seven-iteration claim came from *my*
iteration-24 entry, which asserted the sandbox "is the intermittent G4 failure seen
since iteration 17." The owner read my record and reasoned correctly from it. The
defect is mine and it is the one worth recording: I explained a long-standing
intermittent failure with a cause I had never dated.

**The evidence, all re-derivable:**

1. **Stryker was first run at iteration 20.** The mutation harness was built then. No
   Stryker sandbox can predate its first run, so iterations 17, 18 and 19 are excluded
   by construction.
2. **The recorded test counts refute it directly.** BUILD_LOG records `npx vitest run`
   at every iteration in the window:

   | Iteration | Recorded | Doubled would be | Verdict |
   |---|---|---|---|
   | 17 | 230 passed, 0 skipped | ~460 | clean |
   | 18 | 231 passed | ~462 | clean |
   | 19 | 303 passed | ~606 | clean |
   | 20 | 303 passed | ~606 | clean |
   | 21 | 303 passed | ~606 | clean |
   | 22 | 303 passed | ~606 | clean |
   | 24 | 606 observed, then 309 after removal | — | **the window** |

   303 is the correct undoubled figure: today's suite is 309, and six tests were added
   this iteration (four for `stdevMoney`, two for `medianMoney`). Had a sandbox been
   present at 19 through 22, each of those runs would have read about 606, which is
   exactly what iteration 24 saw. Iteration 21 reading 303 also proves iteration 20's
   Stryker run cleaned up after itself.
3. **The sandbox dates itself.** It contains `INJECTIONS/18-survivors-not-scores.md`,
   written this iteration, and it does *not* contain the `stdevMoney` tests added
   later the same iteration. Directory mtime `2026-09-20 12:50`.

So the intermittent G4 failure seen from iteration 17 has a different cause, still
unexplained, and the iteration-24 entry claiming otherwise is wrong. The earlier
diagnoses at iteration 17 — the Postgres suite silently skipping, the rate-limit suite
racing on CREATE TABLE, S-10's schema-blind RLS query — were each fixed at the time.

### The enumeration A.1 asked for

Every number recorded in iterations 17 to 24, by what it counts:

| Number | Kind | Verdict |
|---|---|---|
| 230 / 231 / 303 x4 passed (iters 17-22) | test count | UNAFFECTED - and they are the evidence above |
| 85.71% branch, engine (iters 19, 20) | coverage | UNAFFECTED - no sandbox existed then; and `coverage.include` is scoped to `packages/formula-engine/src` and `apps/api/src`, which a `.stryker-tmp` path cannot match |
| 91.26% lines, backend (iter 20) | coverage | UNAFFECTED - same |
| 63 of 70 golden vectors (B1) | artefact count | UNAFFECTED - counts entries in `vectors.json`, not test executions |
| 16 of 40 instrumented (iters 20, 21) | derived count | UNAFFECTED - derived from the inventory, never from a run |
| 15 fixed / 1 open / 1 withdrawn (iter 21) | derived count | UNAFFECTED - predicates over files |
| "2 of 59", "1 flagged" (5.9, iters 11-12) | detection rate | OUTSIDE the window by eight iterations - and these are the ones the injection most wanted checked |
| any wall-clock timing | timing | NONE EXIST. No duration is recorded anywhere in the window; the perf benchmarks B14-B23 are blocked on an app |
| 9.66% score, 145 mutants, 131 survivors | mutation | **REPRODUCIBLE** - re-derived identically on a clean tree. Not suspect, and the reproduction is the damning part. See below |
| "Stryker's dry run sees 170 of 303 tests" | test count | **WRONG. Re-derived clean: 275 of 309.** See below |
| "8.96 tests per mutant on average" | ratio | re-derived as **7.76**. Both are "a handful"; the conclusion does not turn on which |
| first mutant table, "1 failing" x12 | detection counts | RETRACTED within iteration 24 - the runs never executed |
| second mutant table, raw totals 11/18/6/... | detection counts | RETRACTED within iteration 24 - inflated by doubled DB failures |
| final mutant table, 2 to 19 | detection counts | UNAFFECTED - taken after removal, baseline-subtracted |
| 12 planted / 12 killed / 0 survivors | verdicts | UNAFFECTED - taken after removal |
| 11 files, 309 passed | test count | UNAFFECTED - taken after removal |

**Net: one causal claim wrong, one recorded figure wrong, one ratio slightly off, and
every surviving measurement clean.** Three numbers were produced inside the window and
all three were retracted inside the same iteration, before anything was built on them.
Nothing downstream rests on a polluted reading.

### The re-derived dry run, and why the conclusion is unchanged

`npx stryker run --dryRunOnly` on a clean tree: **`Ran 275 tests`.** Against a suite of
309, so it misses 34, not the 133 the record claimed. I cannot reproduce 170 and I am
not going to defend it.

The conclusion it was cited for does not move, and it never rested on that figure. B4
and B6 are NOT INSTRUMENTED because **Stryker called all twelve money-helper
arithmetic mutants Survived and eleven of them die to tests that already existed** -
established by planting each one by hand, which is independent of any count Stryker
prints about itself. If anything the correction sharpens it: a harness that loads 275
of 309 tests and still reports those mutants as survivors is harder to excuse than one
that loads 170.

### The re-run answered a question I had not thought to ask

Re-running the full mutation harness on a clean tree was meant only to re-derive two
suspect numbers. It produced something better.

**money.ts re-derives identically: 9.66%, 145 mutants, 14 killed, 131 survived. The
survivor set is unchanged, mutant for mutant, including line 179,
`acc * values.length`.**

That line is the `stdevMoney` defect. Since the first run I have added four tests that
exist specifically to kill it, and `mutation:money` shows it dying to two of them. The
suite got strictly stronger and **Stryker's score did not move by a single mutant.**

This is the cleanest disproof available, and it needs no argument about test counts:

- a harness whose score is unchanged after the suite gains tests that provably kill
  one of its reported survivors is not running those tests against that mutant;
- so it is not measuring B4 or B6, whatever number it prints.

It also settles injection 18 A.1's set-diff for this harness: **zero arrivals, zero
departures.** A diff of nothing is not good news here — it is the finding. The real
set-diff, against the real suite, still waits for rejects.json per injection 18 C.

### A.2 - a check for the class

`tools/check-shadow-copies.mjs`, in `check:all` as `check:shadow`. It fails on any
**untracked directory** containing a `package.json`, a spec file or a vitest config.

Three design notes, each the difference between a check people obey and one they learn
to ignore:

- **The unit is a directory, not a file.** "Untracked spec file" would fail every time
  someone writes a test before staging it. Nobody authors a new suite inside a
  directory git has never heard of.
- **Gitignored does not exempt.** `.stryker-tmp` is in `.gitignore` now and would still
  be a hazard, because vitest does not read `.gitignore`. Verified directly: recreating
  `.stryker-tmp/sandbox-zzz/` with a package.json and a spec file fails the check.
- **It is proven.** `npm run check:shadow:prove` plants the exact shape, requires the
  scan to find it, and removes it.

`check-tooling` could not have caught this: it walks only `tools/` and `scripts/`, and
skips every dot-directory by name.

### H12 - injection 14 is not in the repository

Found while pinning injection 19. `INJECTIONS/` holds fourteen verbatim files and
injection 14, "instruments before subjects", is not among them -
`14-verify-the-verifiers.md` is injection *13*, and the filename numbers are a file
index rather than injection numbers.

5.13, checklist item A12 and the benchmark partition all come from injection 14. Three
live mechanisms cite an instruction nobody can re-read, which is precisely the failure
`INJECTIONS/` was created to prevent.

I did not reconstruct it. I hold a paraphrase, and writing that into `INJECTIONS/`
would produce a file that looks verbatim, hashes into `injections.lock`, and is
actually my summary of someone else's words. Raised as H12 instead. Nothing is blocked
by it; the risk is drift.

### C - the checkpoints, restated

The checkpoint at 26 would have fired because of a reordering the owner asked for.
PROJECTION.md now carries two, and says which is live:

- **LIVE - end of iteration 26:** rejects.json, the B3 re-measurement, the A.1 sweep
  and both fixtures done, RN project scaffolded. Four of those five remain.
- **End of iteration 29:** Form A built and instrumented.

Either re-cut comes from the bottom of A.3 items 1-5, never from B.6.

### D.1 - not done, and deliberately still not done

FINDINGS.md's stale judgement stays at 13. The instruction is to re-state the seventeen
severities in an iteration where it can be done honestly; this iteration went on the
sweep, and clearing the marker without doing the work is the 5.14 defect in a different
hat. It stays visible.

Commands:
  $ npm run check:all            -> 15 checks, all pass
  $ npm run check:shadow:prove   -> a planted shadow tree is found
  $ npx vitest run               -> 11 files, 309 passed, 0 skipped
  $ npx stryker run --dryRunOnly -> Ran 275 tests (the record said 170 of 303)

NEXT - rejects.json and the B3 re-measurement, with injection 19 B.1-B.3 folded in:
sweep the engine for functions whose only tests hit an early return, treat the gap as a
defect surface rather than bookkeeping, and require n=0, n=1 and n>=2 for every
aggregate. Then the two fixtures and the RN scaffold, all inside checkpoint 1.

---

## 2026-09-20 · Iteration 26 · Injection 20: H12 solved, and §5.16

### A · the reconciliation, and what it found

Every injection was already on disk at `G:/SWAFTO/` under a different naming scheme.
Injection 14 was **imported, not retyped** (C.3), and verified byte-identical to its
source below the header.

Reconciled all of `INJECTIONS/` against the originals **by content**, keying on a hash
of each pasted fenced block rather than on filenames (A11). Result:

- **Exactly one misnumbering**, the H12 one: `14-verify-the-verifiers.md` held
  INJECTION 13. Renamed to `13-verifier-inventory.md`, matching both its text and its
  source. No other file in the set is misnumbered.
- **Two missing**: injection 14 and injection 20 itself. Both imported.
- The three files with no `injection-NN` source — `00-build-loop-prompt.md`,
  `07-autonomy-amendment.md`, `13-self-directing-prompt.md` — each verified against
  their differently-named originals. All three match.
- `13-adversary-01.md` has no pasted body because it is my own adversary pass, not a
  human instruction. Correct to have no source.

16 verbatim injections, all re-pinned.

**Why `check-governance` could never have caught this.** It hashes every file in
`INJECTIONS/` against `injections.lock`, which proves nothing has been *edited*. It has
no knowledge of the originals, so a file pinned under the wrong number passes forever.
The lock was pinned to the mistake.

### Then the part that mattered: diffing the rule against the real text

§5.13 and A12 had been running on a paraphrase for twelve iterations. The paraphrase
was accurate on A.2, A.3 and A.4, and REVIEW.md's A12 is faithful to the original
almost word for word.

**It was soft on A.5, and softness is where a rule goes to die.** The real text says:

> A.5  REPORT PROGRESS AS INSTRUMENTED / MET, two numbers, every iteration.

What this build printed was one number and a pointer:

    BENCHMARKS MET : see BENCHMARKS-RESULTS.md

That is not two numbers. It is now derived — parsed out of the Measured table, where
measurements actually live — and reads **MET: 4 of 6 measured (B2 B12 B33 B40), 2
MISSED (B1 B3), 34 never measured.**

The old hand-typed line in BUILD_STATE claimed **5**, including B5. B5 *was* measured
at iteration 20, at 91.26% against a 85% threshold, and was never written into the
Measured table — so the asserted 5 was right about B5 and unsupported by the record.
Re-derived this iteration: **91.26% exactly, 94 of 103 lines.** Now in the table, and
now counted.

And "a benchmark with no instrument cannot be claimed met" has stopped being prose
next to a number and become a failure condition.

### B · §5.16 — an instrument must respond, not only fail

    §5.1  asks: CAN this check fail?                  (binary)
    §5.9  asks: HOW MANY tests catch a break?         (a ratio)
    §5.16 asks: does the number MOVE when the world provably moves?

Implemented as `npm run responds:verifiers`. Scope is every verifier carrying a
benchmark reading; a verifier with no number has nothing to move and §5.1 covers it.

`plantIsResponse` is an exemption and it is narrow by construction: it applies only
where the **threshold is zero**. For "0 violations", §5.12's planted defect moves the
count 0 → 1 in a known direction and the check fails — that IS the response test, and
`--prove` already performs it. Where the threshold is a proportion or a count above
zero, failing and tracking are different properties and both must be shown. Nine
verifiers qualify for the exemption, and each states why.

**`coverage` is the one that needed a real test, and it passes.** Adding a file with
two branches nothing calls moved engine branch coverage **85.71% → 84.70%**, the right
direction. Probe created and removed, removal verified.

**`mutation` is recorded DISPROVEN**, and it is the finding that produced the rule.

### The correction this iteration owes

Yesterday's B3 re-statement said shape 3 was "the body below an early return, never
executed", and claimed the row `money.ts | 97.61% | one stdevMoney guard` had been
pointing at the defect for six iterations. **Both halves are wrong.**

- The uncovered branch in `money.ts` is **line 221**, `if (rest.length)` inside
  `formatPaise`'s Indian grouping. Nothing to do with `stdevMoney`. That row's label
  was itself mistaken, so it was never pointing at anything.
- **`money.ts` is 100% lines and 100% statements.** Line 179 — where the surviving
  mutant lived — was executed by the suite all along, via `intelligence.ts`.

So shape 3 is not "never executed". It is **executed and never asserted on**, which is
strictly worse:

> **Coverage cannot see shape 3, by construction.** It counts execution, not
> assertion. The `stdevMoney` defect sat on a line at 100% coverage.

So closing the B3 gap will find shapes 1 and 2 and **will not find another
`stdevMoney`**. Only mutation testing or deliberate n-variation reaches shape 3. That
is the real argument for why B4 having no trustworthy instrument is serious rather than
bookkeeping, and it qualifies injection 20 C.2: reading every uncovered line as a
candidate defect is right, and searches shapes 1 and 2 only. Shape 3 lives in the
*covered* lines, where no coverage figure will ever point.

### C.1 · A12 applies to the checks that check the checks

Two rows added to REVIEW.md's scoping-axis table. `check-tooling`'s axis is the
**directory name**, it skips every name beginning with a dot, and no plant had ever
varied along it — which is exactly how `.stryker-tmp` survived. `check-shadow-copies`
scopes by **tracked vs untracked** instead.

Every guard in that table had its axis audited. The auditing tools did not, because
they were doing the auditing. A12 has no such exemption, and a checker's blind spot is
the most expensive kind: everything behind it is presumed checked.

### H12 · resolved without human effort

Closed. The file was on disk the whole time. Refusing to write a paraphrase into
`INJECTIONS/` at iteration 25 cost nothing and preserved everything.

Commands:
  $ npm run check:all           -> 15 checks, all pass
  $ npm run responds:verifiers  -> coverage 85.71 -> 84.7; mutation DISPROVEN
  $ npm run check:verifiers     -> INSTRUMENTED 14 of 40 · MET 4 of 6 measured
  $ npx vitest run              -> 11 files, 309 passed, 0 skipped

NEXT — rejects.json and the B3 re-measurement, naming the shape of every remaining
uncovered line, with n=0 / n=1 / n>=2 for every aggregate. Then the two fixtures and
the RN scaffold. Checkpoint 1 is live at the end of iteration 26 and four of its five
items are unstarted, so it will be assessed honestly rather than quietly extended.

---

## 2026-09-20 · Iteration 27 · Injection 21: repository layout

One iteration, as capped. The full move fit, so A.6's smaller version was not needed.

### A.5 · which kind of lock each one is, with the evidence

**`benchmarks.lock` is CONTENT-ONLY, so it was not regenerated.**
`tools/check-benchmarks-lock.mjs` lines 8-9 read `BENCHMARKS.md`, normalise CRLF and
hash the TEXT; the lock file holds a bare sha256 with no filename in it. Moving the
file cannot change that hash. What changed is the path the tool reads from, which is
a code change, not a lock change.

**The `INJECTIONS/` pin IS path-dependent** - each line is `<sha256>  <filename>` and
`check-governance` matches by name - **and it was not regenerated either**, because
`INJECTIONS/` did not move. It was re-pinned once, for the single new file (injection
21), which is the ordinary per-injection step rather than a reorganisation artifact.

So no lock was regenerated during a reorganisation. That is the thing injection 21's
preamble warned about, and the honest answer turned out to be that neither needed
touching.

### A.4 · the proof

Every tracked file hashed by content only - not path, not mtime, not size - before
and after, sorted, and diffed:

    before : 129 tracked files, 129 distinct content hashes
    after  : 129 tracked files, 129 distinct content hashes
    diff   : EMPTY

`git show --stat` on the move commit reads **34 files changed, 0 insertions, 0
deletions**, and all 34 are recorded as `R`, so history follows each file.

### C · the move created two QUIET failures and one loud one

This is the part worth keeping.

**1. `check:registry` scanned ZERO documents.** `docs` was in its `SKIP_DIRS`, and the
move put every document inside `docs/`. It was caught *only* by the §5.12.2 guard that
refuses to pass on an empty corpus. Without that one line it would have exited 0 for
ever, and the registry - which exists because a single value had three different
homes - would have been enforcing nothing.

**2. `check:prose` scanned ONE file and exited 0.** Same cause, no empty-corpus guard.
**233 sentences where the previous run read 9961.** Nothing failed, because it was
looking at almost nothing. This one was found *purely* by comparing the count, exactly
as C.4 instructs. It now carries a `MIN_DOCS` floor of its own, set well below the
real corpus so it catches a collapse rather than policing a number.

**3. A test read `SECURITY-AUDIT.md` by relative URL** and died with ENOENT. Loud, and
therefore fine.

**And my own fix created a fourth.** The mechanical path rewrite replaced the strings
*inside* `check-registry`'s `SKIP_FILES`, which are compared by basename - so the
comparison silently stopped matching, BUILD_LOG came back into the scan, and four
false disagreements appeared about numbers it exists to record as history. A
find-and-replace across ten files is itself the kind of change that needs checking.

**One more worth recording: `npm run check:all` stayed green while the suite was red.**
The chain does not run vitest. A green chain has never meant a green build, and it
took a file move to make that obvious.

### C.4 · counts before and after, since exit codes prove nothing

| check | before | after | |
|---|---|---|---|
| check:registry | 15 documents | 15 | unchanged corpus |
| check:prose | 19 files / 9961 sentences | 20 / 10735 | the extra file is genuinely new content |
| check:generated | 9 artifacts | 10 | +README |
| check:font | 4 Odia strings | 4 | |
| check:sms | 12 / 12 templates | 12 / 12 | |
| check:tooling | 29 files | 31 | +docs.mjs, +check-shadow-copies |
| check:money | 53 files | 55 | the same two |
| check:shadow | 29 directories | 34 | +5 new docs subdirectories |
| check:findings | 21 | 21 | |
| check:verifiers | 23 | 23 | |
| vitest | 309 tests, 11 files | 309, 11 | |

C.2 - all 17 plantable verifiers still FAIL on their planted defect.
C.3 - §5.16 re-run: `coverage` still RESPONDS, 85.71 -> 84.70 on a known change;
`mutation` still DISPROVEN; `check:shadow` and `mutation:money` both still PROVEN.

### The map, and three places the proposed one did not fit

`docs/spec/` was already occupied by the owner's thirteen source documents. Putting
our derived artifacts on top of them would conflate input with output - the same
distinction `INJECTIONS/` exists to protect - so the source moved down into
`docs/spec/source/` and our four derived documents took `docs/spec/`. Nothing reads
either path from code.

`VERIFIERS.md` and `TRACEABILITY.md` are not in A.2's map: the first is the §5.12
inventory, so governance; the second maps spec to code, so spec.

`stryker.config.json` stays at the root against "nothing else", because Stryker
resolves it from the working directory and moving it buys tidiness at the cost of a
flag on every invocation. `DEPLOY-RUNBOOK.md` is in the map and does not exist here.

### B · the README

Written as an index, and its state block is **generated**, not typed - §5.14 applies
to the front page exactly as it applies to BUILD_STATE, and the front page is the
most-read and least-maintained document in any repository. `check:generated` now
verifies it alongside the other nine.

`tools/docs.mjs` is the one map a future move edits. `docPath()` throws on an unknown
name or a missing file, because the readers here are written as
`existsSync(f) ? read(f) : ''` - right for an optional file and catastrophic for a
required one, as items 1 and 2 above demonstrate.

### Also: the B4 note injection 21's preamble asked for

Recorded beside B4 in BENCHMARKS-RESULTS.md. Shape 3 is invisible to coverage by
construction, so mutation is the only instrument that reaches it, and `mutation:money`
is the only mutation instrument here that passes §5.16. Extending it to `dates.ts`,
`intelligence.ts` and `operational.ts` is the best available use of spare capacity -
scheduled AFTER the screens or not at all, and the handover report says plainly if it
does not happen.

Commands:
  $ npm run check:all           -> 15 checks, all pass
  $ npm run prove:verifiers     -> 17 of 17 plantable verifiers fail as they should
  $ npm run responds:verifiers  -> coverage 85.71 -> 84.7; mutation DISPROVEN
  $ npx vitest run              -> 11 files, 309 passed, 0 skipped

NEXT — rejects.json and the B3 re-measurement with the three shapes named, then the
two fixtures and the RN scaffold. Checkpoint 1 already fired and was re-cut; the
committed set is A.3 items 1-3 plus opening cash, and the ceiling stays at 40.

---

## 2026-09-20 · Iteration 28 · Injection 22: PLAN.md

Built as a DERIVED document, which is the only form in which it is an asset. Every
table is generated from the artifact that owns the fact; prose lives in
`tools/plan-prose.md` and is spliced in, so regenerating never overwrites written text
and never lets a table go stale.

### A.5 · status is derived, and it says something uncomfortable

The feature inventory does not copy TRACEABILITY's Status column. It looks each engine
function up in the engine source, each vector in `vectors.json`, each route in the API
source, and screens in `apps/mobile`. The result:

**Engine functions actually present: 18 of 27.** All seven INPUT parsers are absent -
`parseSalesEntry`, `parsePurchaseEntry`, `parseExpenseEntry`, `parseCollectionEntry`,
`parsePartyPaymentEntry`, `parseWithdrawalEntry`, `captureCountedCash`. TRACEABILITY
names them and they do not exist.

That is **V-7**, the one open finding, now quantified and visible on the front page of
the product document rather than buried in a checker's output. Per C.4 it is not fixed
here: the plan is a lens, not a hospital.

### A.4 · no number in prose, enforced

The rule that feels pedantic. `gen-plan.mjs` fails on a numeral anywhere in the prose
source and - because A.4's own example is a spelled-out duration - also on a written
number followed by a unit. The discriminator is the unit: "one hand" is ordinary
English, a spelled duration asserts a value some other artifact owns.

Identifiers are exempt by shape rather than by allowlist: IN1, AD-018, §5.13, T7, B38
and ap-south-1 name things instead of asserting values.

The first run flagged its own documentation, because the prose file's header explains
the rule and necessarily cites it. Comment BLOCKS are now skipped rather than only the
line that opens one.

### A.3 · the staleness alarm, negative-tested

`check:plan` records a content hash for each of the twelve sources and fails when one
moves. Negative-tested by appending a single newline to DEFERRED.md: it failed, naming
the file and both hashes. Restored: it passed. Wired into `check:all`, into VERIFIERS
with a planted defect, and into the §5.16 table.

**The plant edits a SOURCE, not the plan.** That is the whole point: PLAN.md summarises
artifacts it does not own, so the failure it must detect is one of them moving
underneath it.

### C.2 · reading the generated document as prose found three real defects

This step earned its place, and none of the three would have been caught by any amount
of internal consistency:

1. **Column shift.** TRACEABILITY escapes pipes inside cells, and a naive split on the
   pipe shifted every column after it. IN1's SCREEN cell was rendering as a fragment
   of its API cell. Fixed by splitting on unescaped pipes only.
2. **Under-counted vectors.** TRACEABILITY prefixes only the first vector in a cell;
   the rest are bare. IN1 names two and the table said one.
3. **Truncated descriptions.** The build map is a fixed-width table whose descriptions
   wrap across indented continuation lines. Reading only the id line produced
   "Progress, today's figures," presented as a whole sentence. Continuation lines are
   now joined, and the priority marker - a column of the source table, not part of the
   sentence - is extracted into its own column.

The third is the one that mattered: a truncated sentence does not look truncated.

### The screen parse asserts on its own work

Reading a fixed-width text file is the most fragile input in this repository, so the
parser requires exactly the full screen set and fails loudly otherwise. The count
matches B38's denominator, and the set resolves across four families - the day-close
screens, the parties screens, the reports screens and onboarding - which is where that
denominator comes from.

Commands:
  $ npm run plan            -> 27 features (18 with a real engine function), 27 screens
  $ npm run check:plan      -> 12 sources, 0 changed
  $ npm run check:all       -> 16 checks, all pass
  $ npm run prove:verifiers -> 17 of 17 plantable verifiers fail as they should
  $ npx vitest run          -> 309 passed, 0 skipped

NEXT — rejects.json and the B3 re-measurement with the three shapes named, then the
two fixtures and the RN scaffold.
