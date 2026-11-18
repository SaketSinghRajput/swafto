# R5 · Free and Premium: the feature list and how it is built

Synthesis of `R1-competitors.md`, `R2-retailer-needs.md`, `R3-ai-strategy.md` and
`R4-subscription-law.md`, 2026-10-26. Every price and count below is taken from
those documents, which carry the citations; nothing here is newly measured.

## Product-owner decisions this plan rests on (2026-10-26)

1. **Two plans, Free and Premium.** Free carries every basic feature and the basic
   reports; Premium carries the AI reports, predictions, item-level sales and a
   single dashboard.
2. **Item capture per sale is in Premium.** This REPLACES V1 decision D5 ("no item
   data in V1") for the Premium plan only. Free stays as D5 left it.
3. **No stock or inventory availability, in either plan.** No stock level, no
   stock-out from stock on hand, no reorder from stock. Patterns from sales history
   (top items, slow items, what a customer usually buys) are allowed.
4. **A chatbot in both plans.** Free: basic question-and-answer. Premium: replies
   built from the shop's own figures.
5. **No API key and no hosted model.** Open-source only.

## Lead decisions taken under the standing instruction (reversible)

| Decision | Choice | Why | Reversal trigger |
|---|---|---|---|
| Language model in V1 | **None.** Both chatbots are deterministic; the replies are trilingual templates filled from the formula engine | R3: the only commercial-licence small model that lists Odia is 397 MB, over the B24 APK budget; a server model costs an estimated ₹13-36 per paid user a month and needs a new DPDP consent | Measured matcher accuracy per language below what pilot shops accept, then try the `multilingual-e5-small` classifier R3 names |
| Purchase-cadence reminder ("you usually buy X every 10 days") | **Not built** | It is a reorder prompt without a stock figure, which is what decision 3 rules out | Product owner says otherwise |
| Second device, staff login, desktop, many shops | **Not in this round** | D9, and each needs sync-server work | A separate decision revisiting D9 |
| Server-sent SMS reminders | **Not in this round** | Costs per message and waits on H1 (SMS sender) | H1 closed |
| GST invoice, own payment QR, UPI import from PSP apps | **Deferred** | Each needs a partner or a CA ruling | Partner or CA ruling in hand |
| Billing | **Google Play Billing only**, no Play free trial; a 14-day server-granted Premium preview with no payment details | R4: Play Billing is mandatory for this category; a card-gated trial is a listed subscription trap under the CCPA dark-pattern guidelines | Counsel review (R4-HA5) |
| Price | **₹99 a month, ₹799 a year, GST included** (R4's judgement, inside R1's market range) | Peer range ₹30-99 a month, ₹399-799 a year | Price test with real shops (R4-HA7) |

## Free, forever: no ads, no entry caps

Everything the app does today stays free: entry, cash check and close, UPI
confirmation, adjustments, returns, parties and udhar, corrections, consent,
access, export, erasure. Added:

| ID | Feature | Source |
|---|---|---|
| FR-1 | Udhar reminder sent from the shopkeeper's own WhatsApp (prefilled text, he presses send) | R1 GAP-1, R2 need 1 |
| FR-2 | Customer statement shared on WhatsApp as text | R1 GAP-3 |
| FR-3 | App lock with the phone's own screen lock | R1 GAP-4 |
| FR-4 | One-off export for an accountant (CSV, never called an invoice or a return) | R1 GAP-5, R2 |
| FR-5 | "Collect today" list on Today: dues oldest first, in-app, no notification | R1 GAP-6, R2 need 1 |
| FR-6 | Credit limit per customer, shown as an observation when it is passed | R1 GAP-7 |
| FR-7 | Basic reports: dues by age (customers and suppliers), month at a glance with profit estimate against what was taken home, cash-check history, confirmed UPI per month | R2 §Reports |
| FR-8 | Basic chatbot: trilingual FAQ matcher, offers its top three matches as taps when unsure, answers "today's sales" style questions from the engine | R3 §1 |

## Premium

| ID | Feature | Source |
|---|---|---|
| PR-1 | Items per sale: the shop's own short list (20-40), quantity and amount always typed, "Other" one tap away, optional on every sale and never blocking the close; the share of sales value that has items is always shown | R2 §Item capture, decision 2 |
| PR-2 | Item reports: top and slow items, what a customer usually buys, items bought together, item demand estimate (TSB) gated on history | R3 §3, R2 |
| PR-3 | Sales forecast for the coming days (seasonal naive and Holt-Winters), shown only when it beats "same as last week" on the shop's own past (MASE below 1), with method, range and the word "estimate" | R3 §3 |
| PR-4 | Comparisons: same period last year, festival weeks from a shipped date table, how long each customer takes to pay, returns and adjustments trend | R2, R3 |
| PR-5 | Shop-context chatbot: understands period, party and payment mode in the question, answers from the shop's own figures through templates, offers follow-ups | R3 §2 |
| PR-6 | One dashboard bringing PR-2 to PR-4 together | owner request |
| PR-7 | Subscription: plan screen with price including GST shown before purchase, the free-forever promise, cancel in two taps (Play's own subscription page), renewal terms; on lapse Premium screens go read-only and nothing is deleted | R4 §5 |

Every prediction and observation is stated as something to review, never an
instruction, and says it is only as complete as what was entered (CLAUDE.md, "No
inference in data entry"). Nothing in either plan predicts, fills or suggests a
figure being entered.

## How it is built: minimal code, phone first

- **Everything computes on the phone** from the ledger it already holds, in
  `packages/formula-engine` (pure, clock-free, integer paise). Server cost for
  reports, predictions and both chatbots: nil.
- **The server only learns what it must**: item lines sync like entries
  (append-only, same-shop, closed-day guard); entitlement is derived on read from
  an append-only purchases table and a preview grant, never stored as a flag.
- **One gate**, `allows(plan, feature)`, decides Premium; screens take a `plan` and
  draw the read-only or the upgrade state from it.
- **Billing**: the app sends only a purchase token; the server verifies it with the
  Play Developer API and acknowledges it. The service-account key lives in SSM. Until
  R4-HA1, HA3 and HA4 are done, the verification adapter is exercised with a fake and
  the purchase button says plainly that buying is not yet open.

## Human actions this adds

R4-HA1 to R4-HA7 in `R4-subscription-law.md` §10 (Play payments profile, GSTIN and a
CA's ruling, Cloud service account and Pub/Sub, Play product setup, counsel review,
AI-provider choice, price test). Item lines name products a customer bought, so the
customer-facing notice line in R4 §6 must be read by counsel before Premium launches.
