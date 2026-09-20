# SPEC-DIGEST

Every rule extracted from the source corpus, with the document and page it came from.
Written at G0. This is the contract the rest of the build is verified against.

## 0 · Source corpus actually read

| # | Document | Date | Pages | Role |
|---|----------|------|-------|------|
| S1 | `SWAFTO-Strategy-1-Two-Speed-Ledger.pdf` | 8 Sep 2026 | 9 | **Wins on component behaviour** |
| S2 | `SWAFTO-Retail-Desk-Decisions.pdf` | 8 Sep 2026 | 10 | **Wins on product rationale** |
| S3 | `SWAFTO-System-Architecture-and-DFD.pdf` | 18 Sep 2026 | 10 | **Wins on system structure** |
| S4 | `SWAFTO-Retail-Desk-Day-Close.pdf` | — | 11 | Screen design, canonical sample figures |
| S5 | `SWAFTO-Retail-Desk-Build-Map.pdf` | 8 Sep 2026 | 10 | Screen + component inventory |
| S6 | `SWAFTO-Retail-Desk-Flow-Strategy.pdf` | 8 Sep 2026 | 9 | Behavioural strategies, instrumentation |
| P1 | `Retail Desk  V1.pdf` (docs/) | — | 2 | The paper sheet — nine sections verbatim |
| P2 | `WhatsApp Image 2026-06-10 at 2.05.27 PM.jpeg` | **25-05-26** | 1 | Handwritten MVP objectives note |
| — | `design-system/tokens/tokens.css` + `tokens.dart` | 8 Sep 2026 | — | Built palette, Comfort/Focus |
| — | `docs/Simulator.pdf` | 16 Jul 2026 | 3 | Engineering brief for the BI simulator |

### SOURCING CAVEAT — the 15-07-2026 photograph is NOT in the corpus

The build prompt names two photographs: a *15-07-2026 inputs/outputs note* and the
*Retail Desk V1 paper sheet*. What exists on disk is:

- **P1** — the Retail Desk V1 paper sheet, present as a PDF, complete. OK
- **P2** — a handwritten note dated **25-05-26**, not 15-07-2026. It is an earlier
  MVP-objectives note. Its output list has **five** items, not the six the prompt
  describes, and its input list differs (it has *Remarks/Inquiry/Feedback* where the
  feature map has *Party Collection*).

The 15-07-2026 note itself is **missing from disk**. Its content is, however,
recorded second-hand and in full in **S4 p.9**, a table headed *"Every output in your
15-07 note, and the day it can first appear"*. That table enumerates exactly the
8 primary + 6 operational + 5 BI outputs of the feature map and ends with the row
*"Output #6 (unwritten) - Left incomplete in the 15-07 note - Blocked"*.

**Consequence:** the feature map is fully corroborated and BI6's blocked status is
independently confirmed by S4 rather than merely asserted by the prompt. No item was
invented. See OPEN DECISION OD-1.

---

## 1 · Conflicts between documents, and the ruling

Resolution order per the build prompt: **S1 on component behaviour, S2 on product
rationale, S3 on system structure.** The build prompt's CONFIGURATION block overrides
all three where it speaks explicitly.

### C-1 · Client stack: Flutter vs React Native — **RULED: React Native**
- **S3 p.2** labels layers L1-L5 `CLIENT - FLUTTER · WORKS FULLY OFFLINE`.
- **S3 p.8** deployment view: `L1-L5 · Android handset, Flutter`.
- `design-system/tokens/tokens.dart` exists as a Dart `ThemeExtension`.
- **S4 p.10** refers to "four Flutter developers".
- **Build prompt CONFIGURATION**: `TARGET_STACK = react-native`, marked *"Do not change
  without being told"*, and the user re-affirmed it on the second paste.
- **Ruling:** React Native. The configuration switch is explicit, deliberate and
  post-dates all three documents. Costs accepted, per the prompt's own analysis:
  re-emit tokens as TypeScript (G10), and delete the two-engine rule (C-2).

### C-2 · One Formula Engine vs two — **RULED: one shared TypeScript package**
- **S3 §02 p.3-4** is emphatic: *"The engine is specified once and implemented twice"*,
  with `vectors.json` as the shared fixture and CI failing on divergence. Its reasoning
  is that *"sharing code across Dart and the server language creates a build coupling
  you will regret"*.
- **Build prompt constraint 5** replaces this: one TS package imported by both RN app
  and Node backend, with vectors executed under **Node and Hermes** and CI failing if
  the two runtimes disagree.
- **Ruling:** one engine. S3's objection was specifically to coupling *across two
  languages*; once the client is TypeScript, that objection evaporates and the
  divergence bug class stops existing rather than being tested for. The *spirit* of
  S3 - an independent check that the phone got it right - is preserved two ways:
  (a) vectors run under both runtimes, (b) **S3 §07 rule 06 is retained**: the server
  recomputes on sync and a divergence raises an alarm, never a silent repair.

### C-3 · Day state enum — **RULED: five states**
- **Build prompt G4:** `not_started | open | ready | closed` - four.
- **S3 §06 D2 p.7:** `state in (open, ready, closed, not_closed)` - four, different set.
- **S2 Part Two p.8** state machine diagram shows: `Not started -> Open -> Ready ->
  Closed`, plus `Not closed` as a dashed state reachable when *"day ends without
  closing"*. That is **five**.
- **S5 p.7** `DayStateBadge`: *"Open / ready / closed / not closed - decision 6. The
  fourth value is the one that matters."*
- **Ruling: five states** - `not_started | open | ready | closed | not_closed`. Both
  shorter lists are lossy. `not_started` (never touched, no opening cash set) and
  `not_closed` (a gap day that can still be closed late) are semantically distinct and
  both are load-bearing: `not_started` gates T2/T6 first-run, `not_closed` gates D6's
  gap banner. Dropping either re-creates the bug S2 D6 exists to prevent.
  `DayStateBadge` renders four of the five; `not_started` has no badge because the day
  has not begun.

### C-4 · Day-close screen vs cash-check screen in S4 — **documentation inconsistency**
- **S4 p.5** day-close list shows `7 Party payment -`, `8 Personal withdrawal -`,
  progress `6/9`.
- **S4 p.7** cash check working includes `- Withdrawal 500`.
- These are inconsistent: the working subtracts a withdrawal the list says is unentered.
- **Ruling:** the **cash-check working (S4 p.7) is authoritative** for the canonical
  vector, because it is arithmetically self-consistent and reconciles exactly with the
  Today screen's figures on S4 p.5 (9,180 / 4,380 / 6,300 / 11,450). The list mock is a
  different moment in the day rendered on the same page. Recorded as OD-2.

### C-5 · Bottom nav tabs
- **S4 p.5** mock renders four tabs: `Home · Day book · Parties · Reports`.
- **S2 Part Three p.8-9** explicitly deletes Day book and renames Home -> Today:
  *"Three tabs, then: Today · Parties · Reports."*
- **Ruling: three tabs.** S2 wins on product rationale and post-dates the mock's IA.
  The S4 mock was drawn before the decision landed. Day history moves to a
  `DateStepper` on Today (S5 p.8).

### C-6 · Progress ring denominator
- **S4 p.5** hero reads `6/9`.
- **S6 Strategy 02 p.3:** *"The day opens at 1 of 10, not 0 of 9."* Opening cash is
  real work carried forward and counts as a step.
- **S5 p.7** `DayProgressRing`: *"n of 9, with skipped counted as done."*
- **S1 §05 p.4** `DayProgressRing`: *"Opens at 1 of 10 per Strategy 2."*
- **Ruling: 1 of 10.** Two documents (S1, S6) agree on the ten-step denominator and S1
  wins on component behaviour. Ten steps = opening cash + nine sections. Exception per
  S6: first-run (T2) has nothing carried, so a brand-new user genuinely starts at 0.

### C-7 · Expense modes on Purchase vs Expenses
- **P1 §4 Expenses:** `Cash / UPI / Other / Udhar / Shop Stock` - five.
- **P1 §5 Purchase:** `Cash / UPI / Other / Udhar` - four, no Shop Stock.
- **P1 §6/§7 Collection & Party payment:** `Cash / UPI / Other` - three.
- **Ruling:** mode sets are **per-section**, not global. Shop Stock is meaningless for
  a purchase and for a collection. The engine validates mode against section.

### C-8 · OTP code lifetime: 5 minutes vs 10 — **RULED: 10 minutes**

- **SECURITY-AUDIT TB6**, written at G3: *"single-use, 5-minute TTL"*. Stated, with no
  reasoning attached.
- **SMS-TEMPLATES.md §5**, written at injection 08: *"**10 minutes.** Long enough for
  an SMS to arrive over a congested 2G cell, short enough that a code read off a lock
  screen an hour later is dead."* It names the constant as `OTP_TTL_SECONDS = 600` and
  puts **"Valid 10 min"** into the English message.

**How it surfaced, which matters as much as the ruling.** At iteration 17 the limiter
transcribed TB6 and set 300. I recorded R-006 saying I preferred ten but that "the
spec stands" - deferring to a ruling while looking at only one of the two that
existed. The contradiction was two iterations old and nothing had caught it, because
every check compared the markdown to the CODE, never the copy to a CONSTANT.

**Ruling: 10 minutes**, on four grounds.

1. **The copy is the expensive artifact.** `SMS-TEMPLATES.md` is the DLT submission.
   After registration a wording change is twelve re-registrations; the constant is one
   line. Where a number appears in both, the registered text is the constraint and the
   constant is the variable.
2. **Five minutes fails the scenario, not the edge case.** SMS over a congested Indian
   cell takes minutes, and these users are 35-70 and do not have the handset in hand
   when it lands. Priority 2 (trust) and priority 4 (works on a weak network) point
   the same way.
3. **The asymmetry of harm.** Ten minutes costs a code readable from a lock screen for
   five extra minutes, on a single-user device behind a counter, with an optional app
   lock. Five costs a failed sign-in that the shopkeeper cannot distinguish from a
   wrong code, while he is trying to reach his own ledger.
4. **The window is not the control anyway.** Six digits against five attempts per code
   is five in a million however long it lives.

**TB6 is annotated in place rather than quietly rewritten**, and R-006 is closed.
`check:sms` now fails if any template's stated duration disagrees with the constant,
in any language - negative-tested by drifting the constant, drifting the copy, and
making the constant unreadable. DEVICE-CHECKLIST D2 still measures real carrier
latency and can now only push this number up.

---

## 2 · The nine decisions (S2) — normative

| ID | Decision | Confidence | Engine consequence |
|----|----------|-----------|--------------------|
| D1 | UPI stays manual in V1; every figure carries a `source` field (`manual`\|`imported`) from the first commit | HIGH, cheap to reverse | `source` column on Entries, always `'manual'` in V1 (S2 p.2, S3 §06) |
| D2 | **Only Cash mode touches the cash equation.** UPI, Other, Udhar, Shop stock do not - but all five count toward total expenses and toward profit | NOT A PREFERENCE - arithmetic | P2/P6 split. The single most likely thing to be built wrong (S2 p.3, S4 p.10 gap 02) |
| D3 | **Personal withdrawal is not an expense.** Reduces cash, never in expenses, never in profit | NOT A PREFERENCE - accounting | P2 includes it; P6 and profit exclude it. Must have a loudly-failing named test (S2 p.3) |
| D4 | Due dates are optional chips (7/15/30/pick), remembered per supplier, never mandatory | MEDIUM - watch it | `due_date` nullable; `default_due_days` on Parties; drives OP4/OP6 (S2 p.4) |
| D5 | No item or stock data in V1, **and no placeholder for it**. Not greyed out, not "coming soon" | HIGH, costly to reverse | BI5 reserved, zero UI, no inventory card. Reports carries five metrics not six (S2 p.4) |
| D6 | **A missed day is marked missed, never guessed.** Never interpolate. Ask for one fresh count; mark intervening days `not_closed`. A late close never rewrites a later day's opening | HIGH - integrity | Gap handling in the engine; `not_closed` state (S2 p.5) |
| D7 | **Open days editable, closed days immutable.** A correction is a dated adjustment on the current open day carrying a reference to the day it corrects | HIGH - shapes everything | `corrects_day_id`; append-only enforced in DB (S2 p.5) |
| D8 | Free order, but **"skipped" and "empty" are different words.** Cash Check unlocks only when all eight preceding sections are entered or deliberately skipped | HIGH | Three row states; skip is an explicit event (S2 p.6) |
| D9 | Offline-first; a local write always succeeds. **One shop, one phone** is an explicit non-goal for multi-device | HIGH - scope guard | No conflict-resolution UI anywhere (S2 p.7) |

---

## 3 · The paper sheet (P1) — nine sections, verbatim order

Do not reorder. **S4 p.3:** *"The paper sequence is muscle memory, and matching it is
the cheapest usability win available to you."*

| § | Section | Fields (P1) | Form archetype (S5 p.1-2) |
|---|---------|-------------|---------------------------|
| 00 | Opening | Opening cash, Opening UPI (auto on sheet) | Not a form - carried, or T6 |
| 01 | Cash sales | repeating amount lines -> TOTAL | **Form A** |
| 02 | UPI sales | repeating amount lines -> TOTAL | **Form A** |
| 03 | Udhar sales | Creditor name \| Amount \| Phone | **Form B** |
| 04 | Expenses | Type \| Amount \| Mode (Cash/UPI/Other/Udhar/Shop Stock) | **Form C** |
| 05 | Purchase | Supplier (opt) \| Amount \| Mode (Cash/UPI/Other/Udhar) | **Form C** + due-date chips |
| 06 | Udhar collection | Customer \| Phone \| Amount \| Mode (Cash/UPI/Other) | **Form B** |
| 07 | Party payment | Supplier \| Phone \| Amount \| Mode (Cash/UPI/Other) | **Form B** |
| 08 | Personal withdrawal | CASH \| UPI | **Form D** |
| 09 | Cash check | Actual closing cash (G) vs expected (F) | **Not a form** - a reading screen with one input (S5 p.2) |

### The two formulas, verbatim from P1

```
F = Opening Cash + Cash Sales + Udhar Cash Collection
    - Cash Purchase - Cash Expense - Cash Withdrawal       (Expected Closing Cash)

Difference (G - F)                                          (Extra / Missing)

B = Cash + UPI + Udhar                                      (TOTAL SALES / net sales)

Estimated Profit = NET SALES - PURCHASE - EXPENSE           (withdrawal absent - D3)
```

`Estimated Profit` omitting withdrawal is **correct and deliberate** (S2 D3, S4 gap 03).

### Not in V1, from P1
`Top 3 Items Sold` (free text, D5 kills it) and `Daily Remarks/Notes` are on the paper
sheet but are **not** V1 sections. The nine numbered sections are the scope.

---

## 4 · Feature map IDs — corroborated by S4 p.9

### Inputs IN1-IN7
| ID | Input | Sheet § | Modes |
|----|-------|---------|-------|
| IN1 | Sales | 01, 02, 03 | cash / UPI / udhar |
| IN2 | Purchase | 05 | cash / UPI / other / udhar (udhar => supplier due) |
| IN3 | Expenses | 04 | cash / UPI / other / udhar / shop_stock |
| IN4 | Credit Collection | 06 | cash / UPI / other |
| IN5 | Party Collection | 07 | cash / UPI / other |
| IN6 | Withdrawals | 08 | cash + UPI field pair |
| IN7 | Actual Closing | 09 | counted cash |

### Primary P1-P8 — day one, never gated (S4 p.9 "PRIMARY - SIMPLE ARITHMETIC")
| ID | Output | Formula | Source |
|----|--------|---------|--------|
| P1 | Total Cash Received | `cash_sales + cash_collections` | S4 p.9 |
| P2 | Total Cash Paid | `cash_exp + cash_pur + cash_party + cash_wdrl` | S4 p.9 |
| P3 | Expected Cash Balance | `opening + P1 - P2` | S4 p.9, P1 sheet |
| P4 | Net Sales | `cash + upi + udhar sales` | S4 p.9, P1 sheet (B) |
| P5 | Net Purchase | `sum(purchase, all modes)` | S4 p.9 |
| P6 | Total Expenses | `sum(expense, all modes incl. shop stock)` | S4 p.9 |
| P7 | Credit Outstanding | `prior + udhar_sales - sum(collections)` | S4 p.9 |
| P8 | Supplier Outstanding | `prior + udhar_purchase - sum(party_pay)` | S4 p.9 |

**Every one of P1-P8 must be renderable AS ITS WORKING** - the line-by-line derivation.
S4 p.7: *"The expected figure is shown as its working, not as a verdict - the owner can
see which line is wrong."* S5 p.6 `WorkingPanel`, marked **changed**.

### Operational OP1-OP6 (S4 p.9)
| ID | Output | Formula | First available |
|----|--------|---------|-----------------|
| OP1 | Daily Cash Health | `abs(G-F)` and F vs floor | Day 1 |
| OP2 | Expense Pressure | `E / B`, vs own trailing mean | Day 1 |
| OP3 | Collection Efficiency | `collected / given, 30d` | ~7 days |
| OP4 | Payment Due | supplier outstanding, aged by days since udhar purchase | Day 1* |
| OP5 | Business Movement | `B_today / mean(B, 7d)` | ~7 days |
| OP6 | Cash Deficit Warning | `F - dues(next 7d) < 0` | ~3 days |

\* OP4 can age from day one but can only say *"23 days since purchase"*, not *"overdue"*,
until a due date exists (S4 p.10 gap 04, S2 D4). **Two vocabularies, deliberately:**
`overdue` only where a due date exists, `31+ days` everywhere else (S5 p.8 `AgingBadge`).

OP6 copy must name **the party, the amount, the date and the shortfall**. S4 p.5 shows the
canonical instance: *"Cash short for Thursday. 12,000 due to Agarwal Traders, expected
balance 6,300."*

### Business intelligence BI1-BI6 (S4 p.9)
| ID | Output | Formula | Gate |
|----|--------|---------|------|
| BI1 | Profit Trend | `B - D - E` over time | 14 closed days |
| BI2 | Sales Consistency | `stdev / mean` (CoV) | 14 closed days |
| BI3 | Cash Flow Stability | variance of G, deficit-day count | 21 closed days |
| BI4 | Working Capital Pressure | `(credit_out + supplier_out) / cash` | 14 closed days |
| BI5 | Inventory Pressure | *not derivable from V1* | **RESERVED - no UI at all (D5)** |
| BI6 | *unwritten* | - | **resolved autonomously (DECISIONS-AUTONOMOUS.md) (OD-1)** |

S4 p.9 gives ~14 / ~21 / ~30 day horizons; the build prompt fixes them at 14 / 14 / 21 / 14.
**Ruling:** build-prompt gates are normative - they are exact where S4's are approximate
("~"), and a gate must be an exact integer to be testable. Recorded as OD-3.

Every gated output states its gate in the shopkeeper's terms - *"Available after 14
closed days · 6 so far"* - **never a spinner, never a zero, never an empty chart**
(S5 p.8 `GateCard`, S6 Strategy 05 p.7).

---

## 5 · Canonical 15 July figures (S4 p.5, p.7) — the golden vector

From the day-close list (S4 p.5) and the cash-check working (S4 p.7):

| Line | INR | paise |
|------|-----|-------|
| Opening cash | 1,500 | 150000 |
| Cash sales | 6,780 | 678000 |
| UPI sales | 3,120 | 312000 |
| Udhar sales | 1,550 | 155000 |
| Expenses (all modes) | 1,180 | 118000 |
| - of which cash | 680 | 68000 |
| Purchase (all modes) | 3,200 | 320000 |
| - of which cash | 3,200 | 320000 |
| Udhar collection (cash) | 2,400 | 240000 |
| Withdrawal (cash) | 500 | 50000 |
| **Counted (G)** | **6,050** | 605000 |

Derived, and it reconciles exactly:

```
P1 cash received = 6,780 + 2,400              = 9,180   OK matches S4 p.5 Today
P2 cash paid     = 3,200 +   680 + 500        = 4,380   OK matches S4 p.5 Today
P3 expected      = 1,500 + 9,180 - 4,380      = 6,300   OK matches S4 p.5 and p.7
P4 net sales     = 6,780 + 3,120 + 1,550      = 11,450  OK matches S4 p.5 Today
OP1 difference   = 6,050 - 6,300              = -250    OK "Missing 250", S4 p.7
Profit           = 11,450 - 3,200 - 1,180     = 7,070   (withdrawal excluded - D3)
```

Also on S4 p.5: `Udhar to collect 18,240`, `You owe suppliers 27,600`,
`4 customers past 30 days · 7,900 uncollected`, OP6 firing for 12,000 to Agarwal Traders.

**Tomorrow's opening = 6,050 - the counted figure, never the expected** (S3 §05 4.7,
S2 D6, S4 p.7 carry-forward note). This is where the audit chain is forged.

---

## 6 · Architecture rules (S3) — normative on structure

### Ten layers, split by the one network hop (S3 §01 p.2-3)
`L1` Presentation · `L2` Interaction · `L3` **Domain - Formula Engine** · `L4` Local store ·
`L5` Sync client || *HTTPS* || `L6` Edge · `L7` API · `L8` **Domain - verification** ·
`L9` Persistence · `L10` Platform ops.

### Layer prohibitions (S3 p.3) — each is a lint or review rule
| Layer | MUST NEVER |
|-------|-----------|
| L1 | Contain a hex literal, compute a total, or decide a business rule |
| L2 | Know the arithmetic. It asks L3 and displays the answer |
| L3 | Touch the network, the database, or any widget. **Pure functions only** |
| L4 | **Store a derived total. Ever.** Entries in, entries out |
| L5 | Block a user action, or let a failed sync surface as an error on an entry screen |
| L6 | Hold state or terminate business logic |
| L7 | Compute a figure the client will display, or accept a write without a shop scope |
| L8 | Silently overwrite a client figure. A mismatch is a bug report, not a correction |
| L9 | **Update or delete an entry row. Append only, forever** |
| L10 | Exist only in someone's shell history |

### Six cross-cutting invariants (S3 §07 p.8-9)
1. **The local write is the write.** No spinner, no optimistic-then-rollback, no network in the critical path.
2. **Every write is idempotent.** Client-generated UUIDs; the outbox can retry forever.
3. **Nothing derived crosses the wire.** The API exchanges entries, day records and parties - never a computed total for display.
4. **Append-only, forever.** No UPDATE and no DELETE on D1.
5. **One shop, one phone.** Explicit non-goal for V1.
6. **Divergence is an alarm, not a repair.** The server records both and raises.

> *"There is no totals table, and there never will be."* - S3 §06 p.8

### Five data stores (S3 §06 p.7)
- **D1 Entries** - `id · shop_id · day_id · section · amount · mode · party_id · due_date · corrects_day_id · created_at · source`. Append-only. `id` client-generated so server upsert is idempotent.
- **D2 Days** - `shop_id · date · state · opening_cash · counted_cash · difference · reason · closed_at`. One row per shop per date. Immutable once closed. **No totals stored** - only the two figures a human supplied and the reason.
- **D3 Parties** - `id · shop_id · name · phone · kind · default_due_days`. Customers and suppliers in one table with a `kind` flag. Balances never stored.
- **D4 Outbox** - `entry_id · attempts · last_error · queued_at`. **Local only, never synced.** Drains in order; a permanent failure surfaces in the sync detail view, never on an entry screen.
- **D5 Session** - `shop_id · refresh_token · access_token · expires_at`. **Device keystore, not the database.** Long-lived by decision - a re-auth costs a real SMS.

### Level-2 DFD, process 4.0 closing the day (S3 §05 p.6-7)
`4.1 Gather totals` (all 9 done or skipped) -> `4.2 Compute expected` (shown as its
working) -> `4.3 Capture counted` -> `4.4 Difference` -> **`4.5 Require reason`
(conditional, dashed, and the only blocking step in the whole system)** -> `4.6 Freeze
day` -> `4.7 Set next opening = counted, not expected`.

> *"4.7 is where the audit chain is forged."* - S3 p.7

### Deployment (S3 §08 p.10)
Cloudflare free tier (replaces a load balancer entirely at this scale) · **one EC2
t4g.small in a public subnet** - Docker, systemd, security group, **no NAT gateway, no
ECS, no Kubernetes** · RDS PostgreSQL db.t4g.micro single-AZ with 7-day automated
backups **plus a nightly logical dump to S3 - two independent recovery paths** ·
Terraform ~200 lines · GitHub Actions · CloudWatch.

Total infra at 500 shops: **INR 3,180/month**. Architecture holds to ~15,000 shops.

### Deliberate absences (S3 §09 p.9-10)
No AI/ML in the request path · no message queue (the device outbox *is* the queue) ·
no cache layer · no microservices · no real-time/websockets · no payment rail or bank
integration · **no item or inventory tables**.

---

## 7 · Interaction rules (S1) — normative on component behaviour

### The two speeds (S1 §01-03)
Six rails on Today open the entry form directly, `origin: "rail"`, and **Done returns to
Today**. The day-close list opens the same form one tap later, `origin: "list"`, and
**Done returns to the list**. Two speeds, one form, one record.

> *"Anything that captures a transaction and writes it somewhere other than the day
> record is a defect, however convenient it looks."* - S1 p.1

**Target: 2 taps around the typing. The first digit reachable on tap one.**

### What `origin` controls — four behaviours only (S1 §04 p.4)
| Behaviour | `rail` | `list` |
|-----------|--------|--------|
| Return destination | Today (T1) | Day close list (T5) |
| Opening view | One blank line | Existing entries, blank line at bottom |
| Primary action | Save | Done |
| Secondary action | Save & add another | Add a line |

**Not controlled by origin:** validation, the write path, business rules, the mode split,
keypad behaviour, or anything visible in the data.

### The write path (S1 §06 p.5) — identical on both paths
1. **append** - an immutable entry `{id, dayId, section, amount, mode?, partyId?, dueDate?, createdAt, source:"manual"}`. Editing writes a new version; it does not mutate in place.
2. **local** - commits, UI proceeds. No spinner.
3. **queue** - joins the sync queue. Queue depth drives `SyncIndicator` and nothing else.
4. **derive** - all day figures computed from entries on read. Nothing cached.
5. **source** - always `"manual"` in V1.

### The eight edge cases (S1 §07 p.6-7) — each is a test
| ID | Case | Ruling |
|----|------|--------|
| E1 | Rail tapped before the day has started | Intercept with opening cash (T6), then **continue straight into the intended form with the section preserved**. Never drop the user on Today |
| E2 | Rail tapped when today is closed | Rails render **disabled with a visible line** - *"Today is closed. Post a correction instead."* -> T16. Never silently inert |
| E3 | Entry into a section marked "Nothing to enter" | The save **un-skips** it. Ring recounts. Brief confirmation: *"Expenses is no longer marked empty."* |
| E4 | Save while offline | **Succeeds.** Form dismisses normally. `SyncIndicator` shows pending. Never a blocking dialog, retry prompt, or loading state on save |
| E5 | Back pressed mid-entry | If any digit typed, `ConfirmSheet`. If untouched, **dismiss silently** |
| E6 | Last entry in a section deleted | Section returns to **untouched, not skipped**. Ring decrements, cash check **re-locks** |
| E7 | Entry made while the cash check is open | Permitted. Expected recomputes, **invalidates any counted figure already entered** and re-presents the working with a note. *"A stale expected balance here is worse than any other bug in this document."* |
| E8 | Rapid double-tap on a rail | Opening the form is **idempotent** - one form, never two. Save is **debounced** |

### Anti-patterns (S1 §08 p.8) — build none of these
A generic "add transaction" FAB · quick-add with its own store · returning to the list
from a rail · **inferring the section from the amount** (*"20 is probably an expense"* -
the banned guess wearing a heuristic's clothing) · blocking save on sync · caching day totals.

---

## 8 · Behavioural strategies (S6) — normative on flow

- **S02 Endowed progress.** Never show zero of nine. The day opens at **1 of 10** - opening cash is real work carried forward. Skipped sections advance the ring. *"The line I would not cross is advancing the ring for something he did not do."*
- **S03 Design the ending.** `BalancedState` is **the highest-leverage screen in the product** and the only genuinely good moment the day contains - give it real weight, motion and scale. It is **not** the difference screen with a block removed. `DifferenceCallout` copy is **interrogative, not declarative**: *"250 less than expected - what happened?"*, never *"Missing 250"*. **Never** end the day on an upsell, a rating prompt, a sync failure or a backup nag.
- **S04 Keep the useful burden.** *Burden of engagement is an asset. Burden of navigation is pure waste.* Keep the typing, the section choice, the physical count. Remove taps-to-field, the dismissed keyboard, the re-typed party.
- **S05 The activation ladder.** opening cash -> first entry -> **first close (reveals Reports)** -> first party -> 7 days -> 14 -> 21/30.

### Nine instrumentation events (S6 p.8)
`app_opened` · `entry_started`(section, origin) · `entry_saved`(section, ms_in_field,
ms_in_nav) · `section_skipped` · `cash_check_opened` · `day_closed`(difference, reason,
total_minutes) · `correction_posted`(days since referenced close) · `due_date_set` ·
`rung_reached`.

---

## 9 · Design tokens — from `design-system/tokens/tokens.css` (built, authoritative)

Palette A1 **"Marigold Ledger"**. Comfort = light default, Focus = dark opt-in.

| Token | Comfort | Focus |
|-------|---------|-------|
| `surface-ground` | `#FFF9EF` warm paper, cuts shop-daylight glare | `#0E1521` |
| `surface-card` | `#FFFFFF` | `#171F2E` |
| `surface-raised` | `#FDF4E4` | `#1E2839` |
| `brand` | `#13294B` ink indigo | `#0E1521` |
| `brand-soft` | `#2A4571` | `#8FB0E4` (becomes a text colour) |
| `action` | `#F5A524` marigold | `#F5A524` unchanged - one accent |
| `on-action` | `#12181F` **dark ink** | `#12181F` |
| `money-in` | `#0B6B3A` | `#4FCB89` |
| `money-out` | `#C2371F` | `#FF8A72` |
| `text-primary` | `#12181F` | `#EAEEF4` |
| `text-muted` | `#57606A` (6.39:1) | `#8E99A8` (5.72:1) |

**Marigold is a FILL, never type.** White on `#F5A524` measures **2.04:1 and fails**;
dark ink `#12181F` measures **8.75:1** (S4 p.4). Control borders use `--text-muted`, not
`--rule-strong` (1.87:1, fails the 3:1 gate) - `tokens.css` decision 1.

Type: Anek (Odia/Devanagari/Latin) + IBM Plex. Body never below **17sp**, touch targets
never below **56dp**. Money always **tabular figures**, always **Latin numerals in every
language**, always signed as well as coloured.

---

## 10 · Screen inventory (S5 §02) — 27 screens, 15 of them P0

**P0 - the minimum that closes one day. Build nothing else until all fifteen exist.**

`T1` Today open day · `T2` Today first run · `T3` Today already closed · `T5` Day close
list · `T6` Opening cash · `T7` Entry Form A · `T8` Entry Form B · `T9` Entry Form C ·
`T11` Cash check counting · `T12` Cash check difference · `T13` Cash check balanced ·
`T14` Day closed summary · `P1` Parties list · `P2` Customer detail · `P3` Supplier
detail · `X1` Onboarding (four questions, no more).

**P1 —** `T4` unclosed gap · `T10` Form D withdrawal · `T15` past day read-only ·
`T16` post a correction · `T17` day history · `P4` parties empty · `R1` Reports early ·
`X2` settings · `X3` language switch.
**P2 —** `P5` edit party · `R2` Reports mature.

Build order (S5 §04): design-system deltas -> foundations -> **the four form archetypes,
not the eight sections** -> **the cash-check trio as one flow, never three artboards** ->
Today last -> P1 only after one full day closes end to end.

---

## 11 · Rules the vectors must prove (S3 §02 p.4)

| Rule under test | Vector must prove |
|-----------------|-------------------|
| Cash equation | Only Cash-mode expenses and purchases reduce the cash balance; UPI, Other, Udhar and Shop stock do not - while all five still count toward total expenses |
| Withdrawal | Reduces cash, never appears in expenses, never touches profit |
| Carry-forward | Day N opening equals day N-1 **counted** closing, never the expected figure |
| Missed day | A gap produces a `not_closed` day and **never** an interpolated balance |
| Correction | An adjustment posted on day N referencing closed day N-3 changes day N's figures and leaves **N-3 byte-identical** |
| Skip vs empty | A skipped section and an untouched section produce the **same total** and **different day states** |

---

## 12 · Acceptance criteria (S1 §09 p.8) — testable statements

1. From a cold start on Today, the first digit of a cash sale is reachable in **one tap**, and the entry is committed in **two**.
2. Saving from a rail returns to Today; saving from the list returns to the list. **Neither ever returns to the other.**
3. The entry form is **one component**, instantiated with a section and an origin. No forked implementation exists.
4. Every entry, from either path, lands in the same day record and is **indistinguishable in storage**.
5. **No day figure shown anywhere is read from a stored total.**
6. A save completes with the device in aeroplane mode, with **no dialog and no button state change**.
7. Entering a line into a skipped section **un-skips it and says so**.
8. Deleting the last line of a section returns it to **untouched** and **re-locks** the cash check.
9. An entry made while the cash check is open **invalidates any counted figure** and re-presents the working.
10. Double-tapping a rail produces **one** form; double-tapping save produces **one** entry.
11. Rails are **visibly disabled and explained** on a closed day, and offer the correction route.

---

## 13 · Scope guards — what must NOT be built

From S2 D5, S3 §09, S6, and the build prompt:

**No AI anywhere in data entry** - no voice, microphone, camera, scan, OCR, LLM, no
autocomplete that fills a field, no smart suggestion of an amount, party or category.
Party lookup may **match** as he types; it must never **auto-fill**, and it must never
touch the amount field.

No inventory or item tables, no inventory card, not even greyed out · no totals table ·
no message queue · no cache over derived figures · no microservices · no websockets ·
no payment rail · no multi-device conflict resolution · no NAT gateway.

**Not in V1** (build prompt G15): multiple shops, staff logins, email anywhere, social
sign-in, in-app chat, referrals, profile photos.

---

## 14 · Open decisions recorded at G0

- **OD-1 · BI6 is resolved autonomously (see DECISIONS-AUTONOMOUS.md).** Item 6 of the 15-07-2026 note is incomplete
  (*"6. |"*). Independently confirmed by S4 p.9: *"Output #6 (unwritten) - Left
  incomplete in the 15-07 note - Blocked"*. **Do not invent it.** ID reserved, one
  TRACEABILITY row marked resolved autonomously (see DECISIONS-AUTONOMOUS.md). Blocks no gate.
- **OD-2 · S4 internal inconsistency** between the day-close list (withdrawal unentered)
  and the cash-check working (withdrawal 500). Cash-check working taken as
  authoritative because it reconciles with the Today figures. See C-4.
- **OD-3 · BI gate horizons.** S4 p.9 gives approximate horizons (~14/~21/~30); the
  build prompt fixes 14/14/21/14. Build prompt taken as normative - a gate must be an
  exact integer to be testable.
- **OD-4 · SETTLED (iteration 7). Provenance finding, no longer an open question.**
  The 15-07-2026 photograph is absent from disk. Its content is recorded in full in
  S4 p.9, in a table headed *"Every output in your 15-07 note"*, which enumerates the
  8 primary + 6 operational + 5 BI outputs and states that item 6 is unwritten.
  **S4 p.9 is hereby the authority for the feature map**, ratified by the autonomy
  amendment. This is a provenance record, not a gap. If the original photograph ever
  surfaces, re-verify — that is the reversal trigger on AD-001, not a standing task.
- **OD-5 · Day-state enum widened to five** against both the build prompt (four) and
  S3 (four, different four). See C-3. Flagged because it changes a schema the prompt
  specified literally.
