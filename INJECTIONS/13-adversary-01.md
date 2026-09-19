# INJECTION 13 — adversary pass 01

**Scope:** everything built since G5. **Role:** adversary (§6.2) — artifacts only.
`BUILD_LOG.md` and the rationale sections of `DECISIONS-AUTONOMOUS.md` were not read
while forming these findings; the reasoning is what is being audited.

**Ten findings**, ranked by cost of being wrong, each with the evidence that
established it. Two checklist items produced nothing and say so.

---

## F-01 · A6 · SECURITY-AUDIT still designs around Cloudflare being in the data path — **HIGH**

**Evidence.** `SECURITY-AUDIT.md` TB4 describes the boundary as "Cloudflare to EC2".
T4.1's mitigation is *"Security group allows :443 only from Cloudflare's published IP
ranges"*. T4.2 records volumetric DDoS as `DONE by design` on the strength of
"Cloudflare free tier". S-08 repeats it.

**Why it is wrong.** AD-008 removed Cloudflare from the API data path for DPDP
residency reasons; TLS now terminates on the origin. Those mitigations describe a
system that no longer exists.

**Cost.** This is the document someone implements G9 from. Following it produces a
security group allowing Cloudflare ranges to reach an origin Cloudflare no longer
fronts — simultaneously the wrong allowlist and a false belief that DDoS is handled.
The compensating control DC-003 says is owed would look already done.

**Instruction.** Rewrite TB4, T4.1, T4.2 and S-08 against the post-AD-008 topology.
Mark volumetric DDoS as what it now is: an open exposure with a control still to be
decided. Do not mark it DONE anywhere until that control exists.

---

## F-02 · A4 · Two guards in `toClosedDaySummary` have never been executed — **HIGH**

**Evidence.** `packages/formula-engine/src/index.ts` throws two distinct errors — one
when the day is not `closed`, one when a closed day has no `countedCash`. Neither
message appears in any test file. The same shape as `assertPaise` at 0/59: written,
reviewed, never once run against the input that trips it.

**Cost.** These guard the BI window boundary. If `toClosedDaySummary` silently admitted
an open day, every BI gate would open early on partial data — a gated metric showing a
confident number built from a day that had not finished. Worse than the gate not
opening at all.

**Instruction.** Add both to the rejection corpus as `engine` cases and assert them.
Re-measure with §5.9.

---

## F-03 · A1 · Every vector computes the SAME calendar day — **MEDIUM-HIGH**

**Evidence.** All 59 vectors use `input.day.date = 2026-07-15` and
`context.today = 2026-07-15`. One distinct value each. Every entry shares one
`createdAt`.

**Correction to my own first reading, recorded because overstating is as useless as
understating.** The *context* dates are NOT uniform — supplier dues and party-since
dates span `2026-05-10` to `2026-08-24`, so aging and horizon arithmetic does cross
month boundaries today. The blindness is narrower than it first appeared.

**What is genuinely unexercised.** No vector crosses a **year** boundary or a **leap
day**, and the day under computation is always the same date. `dates.ts` was probed
directly and handles `2026-12-31 -> 2027-01-01` and `2024-02-28 -> 2024-02-29`
correctly — so this is a fixture gap, not a defect. Nothing would notice a regression.

**Cost.** Moderate and delayed: a year-boundary bug in `toEpochDay`/`addDays` would
surface on 1 January, in aging badges and BI windows, having passed every test.

**Instruction.** Add vectors at a year boundary and a leap day. One of each is enough —
the point is that the dimension varies, not that it is dense.

---

## F-04 · A1 · `source` is never `'imported'` in any fixture — **MEDIUM**

**Evidence.** Every entry across all 59 vectors has `source: 'manual'`.

**Why it matters.** That column exists for exactly one purpose: so D1 (UPI stays
manual in V1) is reversible without a migration. Reversibility is the whole
justification for carrying it, and the non-manual path has never been executed.

**Cost.** The day someone adds UPI import, the first thing exercised is a code path
with zero coverage — in the arithmetic, not the UI.

**Instruction.** Add one vector with an `imported` entry and assert it participates in
the totals identically to a manual one. Reversibility that has never been run is a
claim, not a property.

---

## F-05 · A9 · The GSM-7 alphabet is derived from memory and its length is undocumented — **MEDIUM**

**Evidence.** `tools/check-sms-segments.mjs` carries a hand-written GSM 03.38 basic
alphabet. Measured length: **127**. The GSM 03.38 basic table has **128 positions**.
Seventeen probe characters all classified correctly.

**Assessment.** The discrepancy is almost certainly correct — position 0x1B is the ESC
extension marker, not a content character, so 127 content characters is right. But
that is a *reconstruction*, not something the file states, and it is exactly A9's
shape: a derived claim about how two things interact.

**Cost.** This alphabet decides GSM-7 versus UCS-2, which decides 160 characters
versus 70. One wrong character silently halves or doubles the budget for an entire
language. It is the mechanism behind DC-001.

**Instruction.** Document why the count is 127. Add a test asserting the length and a
wider set of boundary characters. Record the dependency in DC-001.

---

## F-06 · A6 · ADR-011 was never annotated as superseded — **MEDIUM**

**Evidence.** AD-010 states that ADR-011's performance budgets are superseded by
`BENCHMARKS.md` and that "ADR-011 is annotated as superseded". Searching
`TECH-DECISIONS.md` for "superseded" returns only the unrelated series note at the top.
The annotation was never made.

**Cost.** Two conflicting sets of performance numbers, with nothing in the older one
saying it is stale — and ADR-011 is the more discoverable, being in the file about
technology decisions.

**Instruction.** Annotate ADR-011 in place. This is a decision recorded as done that
was not done, which is its own small finding about how AD entries get written.

---

## F-07 · A6 · Two SECURITY-AUDIT rows still assert a resolved status and an unresolved one — **MEDIUM**

**Evidence.** T4.4 and S-20 both carry a resolved status token immediately followed
by a clause saying counsel is still required. Both halves in one table cell.

**Why the checker missed it.** `check-prose.mjs` matches UPPERCASE status tokens;
`needs` here is lowercase, so the pair never trips. This is a **second instance of
R-001** — that blind spot is not theoretical.

**Cost.** Low individually, but it is the exact string pattern R-001 was recorded
about, surviving in the file R-001 was discovered in.

**Instruction.** Fix both rows. Extend the contradiction check to catch a
resolved-status token adjacent to a lowercase clause asserting outstanding work.
Negative-test it.

---

## F-08 · A10 · Nothing enforces that generated files are actually regenerated — **MEDIUM**

**Evidence.** `vectors.json`, `rejects.json` and the `SMS-TEMPLATES.md` tables are all
produced by authoring scripts. Regenerating `vectors.json` right now produces no diff,
so the committed copy is current. But **no check would notice if it were not** — a
hand edit survives indefinitely and the authoring script silently stops being the
source of truth.

**Cost.** A hand-edited expectation is the exact mechanism by which a failing vector
gets "fixed". It is the §5.1 failure mode with one extra step.

**Instruction.** Add `check:generated` — regenerate every generated artifact into a
temp location and fail on any difference from the committed copy. Negative-test it by
hand-editing one.

---

## F-09 · A1 · No fixture populates the `label` field — **LOW-MEDIUM**

**Evidence.** Zero entries across all vectors carry a `label`.

**Why it matters.** `label` is the expense description — the "Type" column of sheet §4
and the primary field of Form C. It is also where every TEXT-class rejection lives
(empty, whitespace-only, over-length, control characters), all eight of which are
currently `api`-PENDING in `rejects.json`.

**Cost.** Low today; it becomes the blind spot for Form C at G11 and for the text
rejection class at G7.

**Instruction.** Add labels to the expense entries in at least one vector. Note it as
a prerequisite for the adversarial-shop fixture, which needs a 40-character Odia label.

---

## F-10 · A6 · TRACEABILITY lists BI6 as `WIP` — **LOW**

**Evidence.** BI6's row names its function, five vectors, an endpoint and a screen —
all present — and its status column reads `WIP`.

**Cost.** Low, but `TRACEABILITY.md` is the artifact B39 is measured against, so a
stale status there is a wrong answer to a benchmark question.

**Instruction.** Set it to the status the row's own contents justify.

---

## Checklist items that produced nothing this pass

**A2 composed removals** — the removals since G5 are Cloudflare (AD-008) and the
validity clause from the Hindi/Odia templates (AD-012). Composed, they touch nothing in
common: one is network topology, the other is SMS copy. The prior composed-removal
defect (DC-003) is already recorded and still open. **No new finding.**

**A7 frozen artifacts** — the only externally-frozen artifact is the DLT template set,
handled by AD-011 and H10. The schema migrations freeze once a real database exists,
but `0001_init` is still pre-launch and freely regenerable. Worth a note in
`DEPLOY-RUNBOOK.md` when G9 lands, not a finding now. **No new finding.**

**A3, A5, A8** produced findings folded into the above — A3 into F-01's topology
mismatch, A5 into F-02, A8 into F-05.

---

## Self-assessment of this pass

Reading artifacts before rationale worked. F-01 and F-06 are both cases where the
*decision* was right and the *document implementing it* was never updated — reading
the decision first would have hidden both, because I would have seen correct intent
and moved on.

The weakness shows in F-03. My first reading was "every date is identical", which was
false; the context dates do vary. I caught it by measuring rather than asserting
(§6.5), and the corrected finding is smaller and true. The pull was toward
overstating, because a dramatic finding feels like a productive pass — and an
adversary that overstates is as useless as one that understates.
