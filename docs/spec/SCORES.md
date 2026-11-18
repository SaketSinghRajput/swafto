# Scores and output levels

The specification for the Behaviour Engine's outputs: the five output levels, the
two scores that ship, and the one that does not. It answers §13 and §14 of the
co-founder review (`Saket del 10 Oct,26`), and the findings `BE-01` to `BE-14` in
`docs/audits/REVIEW-2026-10-22.md`. Development plan §2.5.

The implementation is `packages/formula-engine/src/scores.ts` (the scores),
`packages/formula-engine/src/intelligence.ts` (BI1 to BI6, unchanged) and
`apps/mobile/src/screens/R1.tsx` (the screen). Where this document and the code
disagree, the code is wrong.

## 1. What ships, and what does not

| Output | State in this build | Why |
|---|---|---|
| BI1 Profit Trend, BI2 Sales Consistency, BI3 Cash Flow Stability, BI4 Working Capital Pressure, BI6 Credit Concentration | On R1, each behind its gate | Already implemented and vector-covered; `BE-13` was that they reached no screen |
| BI5 Inventory Pressure | No card, no placeholder | Decision D5: there is no item or stock data in V1 |
| Cash Confidence, cash half (CC-1, CC-2) | On R1, behind its gate | Defined in §3 from facts that exist today |
| Cash Confidence, typed-reason share (CC-3) | Defined, `null` in code | The difference reason is free text (`BE-04`); a score never parses prose. It arrives with the typed reasons of plan §2.4 |
| Cash Confidence, UPI half (CC-U1, CC-U2) | Defined, `null` in code | No UPI ledger exists (`BE-02`, `UPI-1`). It arrives with plan §2.2 |
| Operational Consistency (OC-1, OC-2, OC-3) | On R1, behind its gate | Defined in §4 from stores that exist today (`BE-06`) |
| Operational Consistency, on-time closing | Not defined yet | Needs the retailer-defined business day (`BE-03`), which is being built separately |
| Business Health as one number | Not shown, and R1 says so in a sentence | §7: it needs three choices that no recorded fact can settle (`BE-07`) |

The name is **Operational Consistency**, as in the review document. The source
specification's "Operational Discipline Score" (`docs/spec/source/Simulator.txt`)
is the same subject under an older name (`BE-01`).

## 2. Terms used by every definition below

- **Closed day.** A day record whose `state` is `closed`. Only a closed day has a
  counted cash figure a human verified.
- **Opened day.** A day record whose `state` is anything except `not_started`. A
  `not_started` day is a shut shop, and a shut shop is not a missed close
  (`HB-06`). The day still in progress is not an opened day until it closes: it
  has not yet had its chance. The caller passes that day's date in; the engine
  never reads a clock (ADR-012).
- **Window W.** The trailing 30 days of the kind the score counts (closed days for
  Cash Confidence, opened days for Operational Consistency), by date, or all of
  them when there are fewer than 30. 30 is a named choice, `SCORE_WINDOW_DAYS`,
  not a derivation (`BE-09`).
- **Ratio.** Every published figure is a `Ratio` from `money.ts`: the exact
  integer numerator, the exact integer denominator, and a rounded `basisPoints`.
  The numerator and denominator are kept so the screen, or a reviewer, can show
  and recompute the working.
- **Median.** `medianMoney`: for an even count, the mean of the two middle values,
  rounded half away from zero. Median and not mean, for the reason OP5 uses it:
  one festival day must not move the line a shopkeeper's ordinary day is read
  against.

### Rounding

1. `basisPoints = round(numerator x 10000 / denominator)`, half away from zero on
   the absolute value (`roundHalfAwayFromZero`). One basis point is 0.01%.
2. On screen a share is shown to one decimal of a percent: the basis points are
   divided by 10 and rounded half away from zero again (`formatBasisPoints`), so
   4286 bp reads `42.9%` and 15 bp reads `0.2%`. Latin numerals in every language,
   like money.
3. A zero denominator gives `basisPoints: null`, which renders as `-` and never as
   `0%`. "Undefined" and "zero" are different statements.
4. A count ratio (CC-1, OC-1) is shown as its two integers, "26 of 30 days", with
   no rounding at all.
5. Money inside a reading (BI1's two averages) goes through the `Money` component
   like every other rupee figure. A count or a share never does.

## 3. Cash Confidence

"Expected vs actual Cash/UPI reconciliation and related stability" (review §14).
Three published ratios for cash, two for UPI. They are never blended into one
number.

### 3.1 The cash half (ships now)

Inputs, per closed day in W: `countedCash` (IN7, physically counted),
`expectedCash` (P3, derived from that day's cash-mode entries only, by D2) and
`netSales` (P4). All three are recorded facts or derivations from them. Nothing
estimated enters.

| id | Name | Definition |
|---|---|---|
| CC-1 | `exactMatch` | (closed days in W where `countedCash = expectedCash`) / (closed days in W) |
| CC-2 | `typicalGapShare` | median over W of \|`countedCash - expectedCash`\| / median over W of `netSales` |
| CC-3 | `explainedShare` | (days in W with a difference and a **typed** reason) / (days in W with a difference). `null` until typed reasons exist |

Worked example (`scores.spec.ts`): 14 closed days, six balanced, eight off by
1.00 to 8.00 rupees, net sales 1,000.00 a day. CC-1 = 6 / 14 = 4286 bp. The
fourteen gaps sorted are six zeros then 100 to 800 paise, so the median is
(100 + 200) / 2 = 150 paise, and CC-2 = 150 / 100000 = 15 bp, `0.2%`.

A matching count is not proof that the ledger is true: ₹20 taken out for change
in the morning and put back at night leaves the count matching and two movements
unrecorded (review `HB-10`, case 10). CC-1 measures reconciliation and claims
nothing more. That is why it is labelled "Cash matched exactly" and not "your
books are right".

### 3.2 The UPI half (defined now, `null` until the UPI ledger exists)

By decision 3 of 2026-10-22, **actual UPI is the sum of the UPI receipts the
shopkeeper confirms**, never a balance read from a bank app. So, per closed day:

- `expectedUpi` = the sum of that day's UPI-mode receipts as recorded (UPI sales,
  and udhar collected by UPI).
- `confirmedUpi` = the sum of those receipts he marked as received.

| id | Name | Definition |
|---|---|---|
| CC-U1 | `upiExactMatch` | (closed days in W where `confirmedUpi = expectedUpi`) / (closed days in W) |
| CC-U2 | `typicalUpiGapShare` | median over W of \|`expectedUpi - confirmedUpi`\| / median over W of `netSales` |

The UPI half is a separate pair of ratios, not folded into CC-1. `BE-05` proposed
one CC-1 requiring both cash and UPI to match. That would change what the cash
figure on screen means on the day the UPI ledger lands. Kept apart, the cash
reading means the same thing before and after. When both exist, "days where both
matched" is a count over counts and can be added without a weight.

Until then the engine returns `upi: null`, and R1 says that UPI matching "is not
counted yet". It does not show a cash-only figure under a "Cash/UPI" label
(`BE-02`).

The sign convention for every difference is `counted or confirmed - expected`:
negative is short. The review document writes the UPI difference with the
opposite sign (`UPI-8`). This implementation uses one sign for both.

## 4. Operational Consistency

"Whether important daily business workflows are being completed consistently"
(review §14). Three published ratios, none blended. Every input is a business
fact the ledger already holds for the ledger's own purpose. None is telemetry
about the person (`BE-11`).

| id | Name | Definition |
|---|---|---|
| OC-1 | `closingRate` | (closed days in W) / (opened days in W) |
| OC-2 | `recordingCompleteness` | (sum over opened days in W of the sections that have at least one entry **or** were explicitly skipped) / (8 x opened days in W) |
| OC-3 | `correctionRate` | (entries dated in W that carry `correctsDayId`) / (all entries dated in W) |

OC-2 rewards the deliberate "nothing to enter" exactly as much as an entry,
because an honest skip is a complete record (D8). The 8 is the number of
sections in the entries `CHECK`, `SECTIONS.length`.

OC-3 counts corrections through the append-only correction link (D1, D7), not
from any edit log. A high correction rate is something to look at, not a fault:
correcting a mistake is the behaviour the product wants.

Worked example (`scores.spec.ts`): 14 closed days, 2 abandoned open days, one
shut day and today in progress. Opened = 16. OC-1 = 14 / 16 = 8750 bp. OC-2 =
(14 x 8 + 2 x 2) / 128 = 116 / 128 = 9063 bp. OC-3 = 1 / 19 = 526 bp.

**Not in V1:**

- **On-time closing.** It compares `closed_at` with the shop's own end of day, and
  that boundary is not modelled yet (`BE-03`). Measuring it against the calendar
  would mark every shop that trades past midnight as late for normal business.
- **Workflow started, abandoned, time to completion, repeated attempts** (review
  §12C). These are observations of a person, not of the business. They need their
  own consent purpose and notice line before they can be captured (`BE-11`). An
  abandoned sale is a fact about the customer and must never count against the
  shopkeeper.

## 5. Gates, and what shows below them

Every reading goes through the same `gate()` as BI1 to BI6 (`BE-09`). The gate
counts **closed** days.

| Reading | Gate (closed days) | Counted over |
|---|---|---|
| BI1 Profit Trend | 14 | the closed-day window R1 passes in (trailing 30) |
| BI2 Sales Consistency | 14 | same |
| BI3 Cash Flow Stability | 21 | same |
| BI4 Working Capital Pressure | 14 | same |
| BI6 Credit Concentration | 14 | same |
| Cash Confidence | 14 | closed days |
| Operational Consistency | 14 | closed days among opened days |

Below its gate a reading shows its label and one sentence: **"After 14 closed
days, 6 so far"**, with both numbers taken from the gate's own unavailable branch
so the screen recounts nothing. It does not show a zero, a dash, a spinner or an
empty chart. On day 1 and day 3 this is the correct answer, not a placeholder: a
variation over two points is noise with a confident label on it.

Reports as a whole is empty until the first close, as before.

## 6. The five output levels

Review §13 divides outputs into five levels. Each answers a different question,
and each has a rule about what it may say. **No level gives an instruction.** The
user keeps decision authority (CLAUDE.md, "No inference in data entry").

| Level | Question | What it carries | Mood | In this build |
|---|---|---|---|---|
| 1 | What happened? | Recorded and derived figures for a day: sales, expenses, purchases, cash in, cash out, expected cash, counted cash, difference | Statement of fact | R1's first card (days closed, P4, P6, P7); T1 and the day-close screens |
| 2 | What is changing? | Direction and spread over the window, each against the shop's own history | Statement of a trend | R1 "What is changing": BI1, BI2 |
| 3 | Where is pressure appearing? | Ratios that show where money is tied up or going short | Statement of a ratio | R1 "Where pressure is building": BI3, BI4, BI6. The two scores sit beside these |
| 4 | What should the owner look into? | A sentence stating a pattern computed from recorded facts, with its figures | **Indicative**, an observation | Defined here, not yet rendered |
| 5 | What could the owner do? | A pointer to a screen or a set of records worth reviewing | **Suggestion**, never an instruction | Defined here, not yet rendered |

### Level 4: observations

A Level 4 line states what the records show, with its numbers, and stops. It is
worth investigating, never a verdict about the shopkeeper (review `HB-10`, case
12). The review's own examples have the right shape:

- "Customer credit outstanding has increased for 5 consecutive business days."
- "Expenses increased faster than sales during the selected period."
- "Cash discrepancies occurred on 4 of the last 7 closing days."

Rules: every figure in it is computed from recorded facts by the engine. It is
behind the gate of the reading it comes from. It names no customer as a risk,
and it never says "you".

### Level 5: suggestions

A Level 5 line names something to look at. The review's examples:

- "Review outstanding customer balances."
- "Review recent expenses."
- "Check today's cash transactions."

Not "Collect from Sharma", not "Do X immediately". Rules (`BE-12`):

1. **No figure.** A Level 5 string has no `{placeholder}` at all. That keeps a
   derived number out of a suggestion by construction, and keeps the level out of
   the entry path, where the no-inference rule applies.
2. **It points at records, never at a person or an action.** It begins with a
   review verb ("Review", "Check", "Look at") and its object is a screen or a set
   of the shopkeeper's own records.
3. **It is optional to act on.** Nothing is blocked, nothing is counted against
   him for ignoring it.

The no-inference rule and Level 5 do not collide: that rule forbids the app from
putting a figure into a field the user is filling. A Level 5 line fills nothing.

The risk is drift when the copy is translated by people who have not read this
section. The check `BE-12` recommends (a level-5 string namespace with no
placeholders and a fixed set of review verbs per language) is not built yet. The
Odia and Hindi copy for every reading is a draft pending the native reviewer
(H13).

## 7. Why there are no weights, and no Business Health number

A weight is a statement that one quantity matters N times as much as another.
Nothing in the ledger can settle that. Turning BI1's direction, BI2's variation,
BI3's short-day count, BI4's pressure ratio and BI6's concentration into one
score needs three choices (`BE-07`):

1. a weight for each component;
2. a mapping from each ratio onto a common scale;
3. a cut-off that separates healthy from not.

Any number shown before those three are decided, and validated against outcomes,
is an opinion presented as a measurement. It would also be the one figure a
shopkeeper might quote to a lender, which makes a wrong one a consumer-protection
exposure and not only a design fault (review `F8`). The review document itself
says not to put the scores into production until their mathematics is validated.

So the two scores are published as their component ratios, side by side, each
with its own label, and Business Health is not computed at all. R1 says so in one
sentence: "Business health is not shown as one number. How to weigh these readings
against each other has not been measured, so each one stands on its own." This is
better than a blank space, which a shopkeeper would read as a bad result.

The three choices above are open, for the review document's author. The only
single figure that would need no weight is a count ("four of five readings are in
their usual range"), and that needs a defined "usual range" per reading first. It
is not built.

### Size fairness

"No score should punish a user simply because their business is small" (review
§14; `BE-08`). Every ratio above divides a quantity of this shop by another
quantity of the **same shop over the same window**: days over days, sections over
sections, entries over entries, a median gap over a median day's sales. There is
no rupee constant in `scores.ts`. A flat tolerance ("within ₹100") would score
the same care ten times worse for a shop ten times smaller, and an absolute band
would mark a small shop as failing for being small.

`scores.spec.ts` multiplies every amount in a Cash Confidence history by ten and
asserts that both basis-point figures are unchanged. Operational Consistency
holds no amounts at all, only counts of days, sections and entries. A check that fails the build on a paise
literal compared against a derived value in `scores.ts`, as `BE-08` suggests, is
not built. The scaling test is what enforces fairness today.

## 8. Performance (BE-10)

The scores, and BI1 to BI6, are derived on every read of R1 from the entries
themselves. No total is stored and no cache was added.

**What changed to make that affordable.** `closedDaySummaries` groups entries by
day in one pass. R1 summarises only the trailing 30 closed days, because no
reading needs more. `customerCreditFold` replays the credit history once,
producing BI6's current balances and its baseline series together rather than one
replay per day, and it skips its sort when the entries already arrive in day
order, which append order normally is. It sorts when they do not.

**Method.** A script built the same history in memory, `D` days of `E` entries
each across all eight sections and 50 customers. It ran the exact sequence
`Store.reports()` runs, 25 timed samples of 4 repetitions each, timed with
`Date.now()`, and took the median and 90th percentile. It was bundled by esbuild
(target es2015) and run twice: once under Node, and once under the Hermes CLI
this repository uses for its vector divergence check. That CLI is
`hermes-engine-cli` 0.12.0, which reports itself as a **DEBUG build**. The
machine is the development laptop this was written on: 13th Gen Intel Core
i5-13420H, 15.6 GB RAM, Windows 11, Node v24.15.0.

**Measured, 2026-10-25:**

| History | Hermes 0.12 CLI, median / p90 | Node 24, median / p90 |
|---|---|---|
| 31 days, 1,240 entries | 25.75 ms / 29.25 ms | 3.25 ms / 4.00 ms |
| 365 days, 14,600 entries | 60.75 ms / 68.75 ms | 5.75 ms / 9.25 ms |
| 365 days, 36,500 entries | 142.75 ms / 168.50 ms | 12.00 ms / 14.00 ms |

Before the two changes above, the same Hermes run over 365 days and 14,600
entries took 160.75 ms at the median. In a per-function breakdown over that
history, summarising all 365 closed days took 142.20 ms against 24.80 ms for the
trailing 30, and the credit fold took 101.20 ms on a reversed copy of the entries
(which it must sort) against 24.15 ms on entries already in order. Each of those
is a mean of 20 calls.

**What this does not measure.** It is not a ₹7,000 handset and it is not a
render: it times the engine derivation alone, on a desktop CPU, under a debug
Hermes interpreter. B20 (Reports render, 365 closed days, at most 1200 ms) is a
handset measurement and stays unmeasured. No threshold was read as met and none
was moved. A memo keyed on the store revision is permitted and was not needed for
this result. If B20 is measured on the device and missed, that memo is the next
step, and it is never persisted.

## 9. Named choices

These are choices, not derivations. Each is a constant in code and can be revisited
with data:

| Choice | Value | Where |
|---|---|---|
| Window W | 30 days | `SCORE_WINDOW_DAYS` |
| Cash Confidence gate | 14 closed days | `SCORE_GATES.cashConfidence` |
| Operational Consistency gate | 14 closed days | `SCORE_GATES.operationalConsistency` |
| BI gates | 14 / 14 / 21 / 14 / 14 | `BI_GATES` (unchanged) |
| Share display precision | one decimal of a percent | `formatBasisPoints` |
