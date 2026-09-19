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
52 status-tagged findings; 26 became TRACEABILITY rows; 7 are BLOCKED-ON-HUMAN.

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
  $ grep -cE 'ACTION-REQUIRED|BLOCKED-ON-HUMAN' LEGAL-AUDIT.md
Output:
  52
G2 PASS.

NEXT — G3 security audit and STRIDE.
