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
