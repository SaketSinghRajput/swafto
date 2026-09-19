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
status legend into "RESOLVED-AUTONOMOUSLY - needs counsel", which is self-
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
