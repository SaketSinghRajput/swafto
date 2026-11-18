# R2 · What Indian small retailers actually need

*Desk research, 2026-10-26. No fieldwork: nobody in Odisha was interviewed for
this. Every figure below is quoted from the source named next to it, along with
who produced it. Where a figure is a company's claim about itself, or a trade
body's claim, the text says so. Where no source was found, the text says
"no data found", not a guess.*

**Scope ruling applied (product owner, 2026-10-26).** Neither plan tracks per-product
stock levels: no stock counts, no stock-outs worked out from stock on hand, and no
reorder suggestions based on stock on hand. Item-level capture per sale (which products a
customer bought) stays in scope for Premium. Patterns derived from sales history
(top items, slow items, what a customer usually buys) are allowed. §4 is written
to that ruling.

---

## 0. Summary: unmet needs, ranked

The ranking combines how often a need comes up in the sources, how much money is at stake
for a single shop, and whether the shop has a tool that already meets it. It is a
judgement made from desk research, not a measured ranking.

| # | Need | Evidence strength | Can SWAFTO meet it from recorded data? |
|---|---|---|---|
| 1 | **Udhar (customer credit) recovery**: knowing who owes what, since when, and chasing it without awkwardness | Strong and consistent | **Yes, core.** Parties + ageing already exist |
| 2 | **Knowing whether the day's cash is right**: leakage, miscounts, staff handling cash | Moderate (general retail; few India-specific numbers) | **Yes, core.** Cash check, typed adjustments |
| 3 | **Digital-payment reconciliation and fake-payment fraud** (screenshots, replayed soundbox tones) | Moderate (vendor/fraud blogs; scale not measured) | **Partly.** Confirmed-UPI ledger exists; no bank feed |
| 4 | **Supplier dues and working capital**: short trade-credit cycles, cash squeezes before festivals | Moderate | **Yes.** Supplier side of Parties; a dues-by-date view would help |
| 5 | **Real profit vs money taken home** | Moderate (inferred from bookkeeping and loan sources) | **Yes, core.** D3 withdrawal is kept outside profit |
| 6 | **Working-capital credit from formal lenders**, which needs a record of cash flow | Moderate (OCEN/AA growth is documented, kirana uptake not) | **Later.** Requires consent design and a legal review |
| 7 | **What sells and what doesn't** (top/slow items, seasonality) | Moderate | **Only with item capture** (Premium, §4) |
| 8 | **Competing with quick commerce** in the shop's catchment | Contested (trade-body claims vs platform rebuttals) | **No** directly; repeat-customer insight helps a little |
| 9 | **GST clarity**: am I near the threshold, composition or not | Legal facts are clear (§2 N9); the need is inferred | **Observation only.** Turnover trend vs threshold, never advice |
| 10 | **Selling online (ONDC, WhatsApp orders)** | Weak/qualitative | **Out of scope** |

---

## 1. Context: who the shopkeeper is

- **Kiranas still dominate grocery.** Redseer puts kiranas at about **91%** of Indian
  grocery retail in 2025 and expects about 85% by 2030, with kiranas holding the
  ₹100–₹200 daily basket ([Redseer, *Quick Commerce vs Kiranas vs Hypermarts*](https://redseer.com/articles/quick-commerce-vs-kiranas-vs-hypermarts-who-will-win-the-indian-grocery-market/);
  the same 91% is repeated by [36Kr](https://eu.36kr.com/en/p/4018599232673672)). Business Today
  gave 92% for CY24 ([Business Today, Nov 2024](https://www.businesstoday.in/amp/latest/economy/story/indian-kirana-stores-feel-the-heat-as-quick-commerce-sees-rapid-rise-454232-2024-11-19)).
- **Rural and small-town demand is growing faster.** In NielsenIQ's March-2025 quarter, FMCG value grew 11% and volume 5.1%,
  with rural growing faster than urban and shoppers shifting to smaller packs
  ([Outlook Business, reporting NielsenIQ, May 2025](https://www.outlookbusiness.com/economy-and-policy/fmcg-volume-growth-slows-to-51-in-march-qtr-rural-markets-drive-growth-while-metros-drag-volume)).
  Smaller packs mean more line items per rupee of sales, which matters for §4.
- **Store count.** AICPDF (a distributors' federation) gives over 13 million kiranas
  ([Medianama, Oct 2024](https://www.medianama.com/2024/10/223-quick-commerce-boom-closure-2-lakh-kirana-stores-products-distributors/));
  Redseer (2020) gives "15+ Mn" ([Redseer, *All roads lead to Kirana*, Feb 2020](https://redseer.com/articles/all-roads-lead-to-kirana/)).
  The two counts are measured differently, so treat the number as "10–15 million".
- **Informal and mostly offline.** MoSPI's ASUSE 2023-24 counts about 7.34 crore unincorporated
  establishments. **26.7%** used the internet, up from 21.1%. That figure covers all sectors, not trade
  alone ([Drishti IAS summary of the MoSPI release, Dec 2024](https://www.drishtiias.com/daily-updates/daily-news-analysis/annual-survey-of-unincorporated-sector-enterprises-2023-24/print_manually)).
  A secondary summary puts retail trade at 27% of establishments; this was not checked against MoSPI's own table.
- **Odisha.** Census 2011 literacy is **72.9%** (rural 70.2%, urban 85.7%) per the
  [Odisha School & Mass Education Dept.](https://sme.odisha.gov.in/en/about-us/overview/literacy).
  No more recent state literacy figure was found. An IFPRI/CGIAR digital-needs survey of
  1,034 households in Bihar and Odisha names device cost, **limited digital literacy and
  too little local-language content** as the main barriers ([CGSpace, 2024](https://cgspace.cgiar.org/items/6fc0913b-28f5-42b9-8eac-bc98b0df0d37)).
  That survey covered farm households, not shopkeepers. **No survey of Odisha kirana owners was found.**
  This is the largest gap in this document and can only be closed by fieldwork.
- **Who the owners are.** Flourish Ventures and 60 Decibels interviewed 200 kirana owners in 15 states (2022): 83% were aged 20–39, and
  89% stocked 500+ SKUs ([Flourish, *India Spotlight*](https://flourishventures.com/research/digitizing-the-corner-shop/india-spotlight/)).
  The owners are younger than the stereotype, and the SKU counts are high, which makes per-sale item entry harder (§4).

---

## 2. The needs, with evidence

### N1 · Udhar recovery (rank 1)

- An Inc42 report (2019) said **30–40%** of merchant sales happen on credit, and **45–50% in grocery**
  ([Inc42](https://inc42.com/?p=169469)). That figure came from the industry (the OkCredit
  funding story), not an independent survey. It is old, but no newer figure was found.
- Redseer calls managing and recovering credit receivables **the biggest financial
  challenge** for kiranas, and says receivables "often are not recovered at all" ([Redseer 2020](https://redseer.com/articles/all-roads-lead-to-kirana/)).
- IIM Bangalore found that credit lets kiranas keep customers they would otherwise lose, and that
  shops accept small losses on it as a cost of trade ([IIMB repository 2074/18361](https://repository.iimb.ac.in/handle/2074/18361),
  via search abstract; the full text could not be fetched because of a certificate error on the repository).
- The digital-ledger category is large: OkCredit claims 30M+ MSMEs ([okcredit.in](https://okcredit.in/llms.txt)),
  and Khatabook grew on SMS/WhatsApp reminders ([Substack write-up](https://ameya.substack.com/p/how-khatabook-became-the-premier)).
  Both figures are company claims. Either way, **a plain udhar ledger is a commodity**. What
  stands out is a ledger tied to the day's cash, which is SWAFTO's existing shape.
- Practitioner advice converges on four steps: keep a per-customer ledger, chase the **oldest dues first**, set
  per-customer limits, and stay polite. The main blocker is described as social awkwardness rather than lack of a tool
  ([Accountune guide](https://www.accountune.com/udhaar-recovery-outstanding-payments)).

**What SWAFTO can do with recorded data:** an ageing view (0–30 / 31–60 / 61–90 / 90+
days) of customer balances, which P2 already shows. Add an observation: "these five
customers hold most of what is owed to you". The shopkeeper triggers a reminder
message by tapping it himself. It must never send automatically, because the
relationship belongs to him.

### N2 · Is today's cash right? Leakage and staff (rank 2)

- No India-specific study of kirana staff theft was found. General small-retail
  guidance agrees on the warning signs: falling cash sales, rising returns, and lower takings on certain
  shifts. It also agrees on the controls: separate who sells from who counts, and reconcile every day
  ([SecurityInfoWatch](https://www.securityinfowatch.com/retail/blog/10474983/internal-theft-and-the-small-retail-business-owner),
  [Counterman](https://www.counterman.com/controlling-store-shrinkage/)).
- A trade article estimates kirana shrinkage at "more than 12%". It is labelled as an
  estimate and has no stated method ([Indiaretailing](https://www.indiaretailing.com/?p=46615)).
  **It should not be quoted to users.**

**What SWAFTO can do:** this is the cash check (T11–T13) and typed adjustments (T19). The
behaviour indicators already cover the derived side. An unexplained difference that keeps
recurring should be shown as something to review, never as an accusation. Returns are
one of the warning signs listed above, and T18 now records them as linked events, so a
"returns this week vs usual" observation can be computed from data the app already holds.

### N3 · UPI reconciliation and fake payments (rank 3)

- Payment providers document fake payment apps that trigger soundbox alerts, recorded
  payment tones played from another phone, edited screenshots, and the collect-request PIN trick. All of them
  give the same advice: check your own bank/UPI app before handing over goods
  ([Razorpay](https://razorpay.com/learn/fake-payment-app-scams/), [Cashfree](https://cashfree.com/blog/fake-payment-screenshot-scams),
  [Deccan Chronicle, Telangana](https://deccanchronicle.com/southern-states/telangana/fake-upi-apps-conning-establishment-owners-1870545)).
  **No figure for how common this is was found.**
- NPCI is reported to have set a 0.4% MDR on P2M UPI above ₹2,000 from 15 Oct 2026. Merchants receiving
  up to ₹1 lakh a month via QR are reported as exempt, and sub-₹2,000 payments are reported as >95% of P2M volume
  ([Entrepreneur India](https://india.entrepreneur.com/?p=99679), [Drishti IAS](https://www.drishtiias.com/daily-updates/daily-news-analysis/npci-introduces-mdr-on-high-value-merchant-upi-transactions)).
  These are secondary reports. **Confirm against the NPCI circular before any copy mentions MDR.**
  If they are right, a shop near ₹1 lakh/month of UPI would gain from seeing its monthly
  confirmed-UPI total. SWAFTO can compute that total, but must not present the threshold as fact until it is verified.

**What SWAFTO can do:** decision 3 already defines actual UPI as the sum of receipts the
shopkeeper has confirmed. That matches the fraud advice: confirm against your own app,
not the customer's screen. A monthly confirmed-UPI total is a cheap and useful report.
A bank or soundbox feed is out of scope and would conflict with "no inference in entry".

### N4 · Supplier dues and working capital (rank 4)

- Trade credit is the most common source of finance for grocery kiranas. IIMB gives cycles of
  **7–14 days**, and says distributors moved toward cash-and-carry after the lockdown ([IIMB 2074/19444](https://repository.iimb.ac.in/handle/2074/19444?mode=full),
  via abstract). Other sources give 7–30 days ([Shanlax journal, Sangli sample](https://shanlaxjournals.in/journals/index.php/commerce/article/download/574/409))
  and "about 90% of vendors offer 7 days" ([Indiaretailing](https://www.indiaretailing.com/?p=46615)).
  **No national figure exists.** The cycles are short, so a shop runs out of cash quickly.
- Festive peaks are large. CAIT (a traders' body) reported Diwali 2025 trade of ₹5.4 lakh crore
  in goods, and also reported that 72% of the traders it surveyed linked higher volumes to reduced GST
  ([Morung Express, reporting CAIT](https://morungexpress.com/diwali-sales-hit-record-rs-540-lakh-crore-over-gst-reforms-robust-consumer-demand)).
  Durga Puja is the eastern-India equivalent. In 2022, Bengal retailers reported 30–40% higher sales than in 2019
  ([Business Today](https://www.businesstoday.in/amp/latest/economy/story/bengal-durga-puja-economy-this-year-crosses-rs-45000-cr-mark-stakeholders-349458-2022-10-10)).
  **No Odisha-specific seasonality data was found** (Durga Puja, Raja, Kartika and harvest
  months would be the candidates; this is an untested hypothesis).
- The only source found on festive working capital is a 2019 vendor blog ([Pine Labs](https://www.pinelabs.com/blog/working-capital-in-retail-the-firework-you-need-for-the-big-bang-deals-this-diwali)).

**What SWAFTO can do:** a "you owe suppliers" list sorted by oldest unpaid purchase (P1/P3
already hold the balances). Add a **same-period-last-year** sales line once a shop
has a year of history, so the festival peak is something he has seen in his own figures. This
is derived output, not a forecast.

### N5 · Real profit vs money taken home (rank 5)

Most small shops mix household and shop money. This is inferred: it is the standard
explanation for why lenders want bank statements, and it is the reason D3 exists. It is not
measured in any source found. The 2020 Redseer list of finance pain points includes book-keeping
and supplier payments ([Redseer 2020](https://redseer.com/articles/all-roads-lead-to-kirana/)).
SWAFTO already separates withdrawals from profit (T14). A monthly view of "profit
estimate vs what you took out" is the most useful report it does not yet have.

### N6 · Formal working-capital credit (rank 6)

- **OCEN** is a protocol rather than a lender. ISPIRT volunteers report about 50,000 loans and ₹1,100 crore (one post) **or**
  about 70,000 loans and ₹1,600 crore (another) in 2025 ([ISPIRT](https://pn.ispirt.in/indias-silent-credit-revolution-ocen-surpasses-50000-loans-and-₹1100-crore-in-2025/),
  [ISPIRT tag page](https://pn.ispirt.in/tag/ocen-2025/)). The two disagree, and neither is official.
- **Account Aggregator** now carries GSTN data. One article reports 16 licensed AAs and 28.9 crore consents as of Aug 2025
  ([Swarajya](https://swarajyamag.com/amp/story/technology/from-digital-footprints-to-data-capital-how-account-aggregators-are-solving-credit-in-india)).
  FinBox, a vendor, notes that "almost 85% of businesses are unregistered", which limits GST-based underwriting
  ([FinBox](https://finbox.in/blog/how-gstn-on-account-aggregator-can-help-msme-lenders)).
- **Inference, not evidence:** a consistent daily record of closed days (append-only, frozen
  days, a cash check each day) is the kind of cash-flow signal these rails are designed to use.
  But SWAFTO is not a regulated Financial Information Provider. Any lender sharing would
  need its own specific, itemised DPDP consent, separate from the app's own. It also needs a legal
  review of whether that role makes SWAFTO a lending service provider under RBI rules. **That
  question is not answered here.** Do not build it until that review has been done.

### N7 · What sells, what doesn't (rank 7)

Redseer (2020) lists tracking sales, merchandising and customer insight as operational
gaps ([Redseer 2020](https://redseer.com/articles/all-roads-lead-to-kirana/)). Only 39% of
1,040 small businesses in a Zoho survey used POS billing, and 48% were fully manual. Zoho sells POS
software, and the sample skews larger than kiranas ([Enterprise Times, Feb 2024](https://www.enterprisetimes.co.uk/2024/02/28/digital-transformation-of-indias-retail-is-accelerating-adoption-of-pos-software/)).
Detail in §4.

### N8 · Quick commerce (rank 8, contested)

- AICPDF said about 2 lakh kiranas closed in a year. It attributed 45% of closures to metros, 30% to tier-1 cities and 25% to tier-2/3 towns, and
  warned 20–25% more could close ([Medianama](https://www.medianama.com/2024/10/223-quick-commerce-boom-closure-2-lakh-kirana-stores-products-distributors/)).
  **This is a distributors' federation lobbying the CCI. Platform executives dispute it.**
- About a third of dark stores are now in tier-2 cities and smaller towns ([Apparel Resources citing Savills](https://apparelresources.com/business-news/sourcing/indias-q-commerce-dark-stores-push-smaller-cities-network-set-triple-2030/)).
  Quick-commerce order value was about ₹64,000 crore in FY25, roughly double FY24 ([exchange4media citing CareEdge](https://www.exchange4media.com/digital-news/what-will-it-take-for-quick-commerce-to-win-bharat-148335.html)).
- The threat to an Odisha tier-2/3 shop is real but slower and smaller than in a metro. The kirana's
  defences (credit, relationship, small daily baskets) are the ones SWAFTO supports.

### N9 · GST (rank 9): the law, cited

The table quotes primary or official material where it could be fetched. The rest is marked.

| Fact | Status | Source |
|---|---|---|
| Registration exemption for persons supplying **only goods**, aggregate turnover up to **₹40 lakh**. Not available in Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Puducherry, Sikkim, Telangana, Tripura or Uttarakhand, to voluntary registrants, or to ice-cream/pan-masala/tobacco suppliers. **Odisha is not on the exclusion list**, so ₹40 lakh applies to an Odisha goods-only shop | Notification **10/2019-Central Tax**, 7 Mar 2019, in force 1 Apr 2019. Amended by 3/2022 and 15/2022; **what those amendments changed was not checked** | [Karnataka CT dept. copy](https://gst.kar.nic.in/latestupdates/GSTUpdate09032019.pdf), [gstzen text](https://gstzen.in/a/central-tax-notification-102019-to-give-exemption-from-registration-for-any-person-engaged-in-exclusive-supply-of-goods-and-whose-aggregate-turnover-in-the-financial-year-does-not-exceed-rs-40-lakhs.html) |
| Composition eligibility: aggregate turnover in the previous FY up to **₹1.5 crore** for goods (**₹75 lakh** in Uttarakhand and 7 North-Eastern states). Traders pay **1%** (0.5% CGST + 0.5% SGST) of taxable turnover in the State | Official CBIC flyer, "Updated as on November 2022" | [CBIC/GST Council flyer, *Composition Levy Scheme*](https://www.gstcouncil.gov.in/sites/default/files/e-version-gst-flyers/composition-levy-scheme.pdf) |
| A composition dealer issues a **bill of supply**, not a tax invoice, headed "Composition Taxable Person not eligible to collect tax on supplies". He shows "Composition Taxable Person" on his signboard, takes **no ITC**, makes **no inter-State outward supply**, files **CMP-08 quarterly by the 18th** and **GSTR-4 yearly by 30 April** | Same flyer | as above |
| The flyer lists supply through an e-commerce operator liable to collect TCS as a ground of ineligibility. **Finance Act 2023 / Notification 36/2023-CT (from 1 Oct 2023) reportedly permits intra-State supply of goods through an ECO by composition dealers** | **Uncertain.** Supported only by secondary sources, and the enacted text was not checked | [taxguru on Finance Bill 2023](https://taxguru.in/goods-and-service-tax/proposed-amendments-gst-glance-vide-finance-bill-2023.html), [GST Council: CT notification listing](https://gstcouncil.gov.in/en/cgst-tax-notification?page=6) |

Conservative reading for the product:
1. SWAFTO must **never tell a shop whether to register or opt for composition**. That is tax
   advice. The existing `check:naming` rule, which forbids calling any output an "invoice" or a
   GST return, is correct and should stay.
2. What is allowed is an observation. Example: "Your recorded sales for the last 12 months total ₹X.
   The registration threshold for a goods-only shop in Odisha is ₹40 lakh (Notification
   10/2019-CT). Ask your accountant whether this affects you." Recorded sales
   undercount turnover whenever entries are missed, and the copy must say so.
3. **No source was found on how many kiranas are GST-registered or on composition.** The FinBox
   claim that "85% of businesses are unregistered" is the only figure found, and it covers all MSMEs.

### N10 · Selling online: ONDC and WhatsApp (rank 10)

ONDC is described as harder to grasp than UPI, and maintaining a catalogue and listings is
a burden for a one-person shop ([Drishti IAS, Jun 2024](https://www.drishtiias.com/daily-updates/daily-news-analysis/open-network-for-digital-commerce-4/print_manually),
[Thoughtworks](https://www.thoughtworks.com/insights/blog/platforms/kirana-ONDC-part-one)). The only
WhatsApp figure found is a shopper-preference number (70%) whose original source could not be identified.
**No owner-side WhatsApp adoption figure was found.** WhatsApp matters to SWAFTO as the
channel for a reminder the shopkeeper sends himself (N1), not as a storefront.

---

## 3. Which reports matter: basic (free) vs advanced (Premium)

These come from N1–N7 and the five output levels in `docs/spec/SCORES.md` §6. The
rule for which plan a report goes in: if it protects money he already has, it is
free; if it helps grow the business, it is Premium.

**Basic / free**, all derivable today from day-level entries:
1. **Who owes me, by age** (0–30/31–60/61–90/90+), oldest first. Highest value (N1).
2. **What I owe suppliers**, oldest unpaid first (N4).
3. **Month at a glance**: sales by mode (cash/UPI/udhar), expenses, estimated profit,
   and withdrawals shown **outside** profit (N5).
4. **Cash-check history**: days balanced, and differences by typed reason (N2).
5. **Confirmed UPI per month** (N3).

**Advanced / Premium:**
6. Same period last year, and festival-period comparisons (needs ≥ 1 year of history) (N4).
7. Udhar behaviour per customer: how long each customer usually takes to pay, and whose balance keeps
   rising. These are observations, never credit decisions about the customer.
8. Returns and adjustments trend (N2).
9. Scores (Business Health, Cash Confidence, Operational Consistency), gated by `SCORES.md`.
10. With item capture (§4): top items, slow items, what a customer usually buys, item
    seasonality.
11. An exportable monthly statement for an accountant or lender. It must not be called an invoice or a
    GST return (N9).

---

## 4. Item-level capture per sale (Premium): what it unlocks, what it costs

*Under the scope ruling: no stock levels, no stock-outs from stock on hand, and no reorder
from stock on hand.*

**What it unlocks, all derived from sales history:**
- **Top items / slow items** by revenue and by how often they sell, per week and per month. "Slow" here
  means rarely sold in the period. It does **not** mean "dead stock on the shelf", because without
  stock counts the app cannot know what is on the shelf, and the copy must not imply it does.
- **What a customer usually buys.** This mostly applies to udhar customers, because they are the only
  sales tied to a named party. For a cash sale nobody is named, and the app should not ask.
- **Item seasonality**: what sold more in the same weeks last year. This is the honest form of
  "prediction": a fact about the past, stated as something to review.
- **Item mix of credit sales**, which helps decide whose credit to limit.
- **Ruled out:** predicting a figure during entry, autocompleting a quantity or price, and
  "you will run out of X". The first two break the no-inference rule; the third needs stock levels.
- **A note on reorder:** "you usually buy X from supplier Y every ~10 days, and the last time was 12 days ago"
  can be derived from **purchase** history without stock levels. It is close to the line the
  product owner drew, though. Treat it as a question for the product owner, not a recommendation.

**What it costs at the counter (the main risk):**
- The counter is fast. Most UPI P2M payments are under ₹2,000 (NPCI, as reported in N3), baskets are
  small, and packs are getting smaller (NielsenIQ, §1). **No measured seconds-per-line figure for
  kiranas was found**, and IIMB's billing study ([2074/20197](https://repository.iimb.ac.in/handle/2074/20197))
  could not be read. Any SWAFTO claim about entry time must come from a timed trial on
  the target handset, measured under `BENCHMARKS.md`. It must not be taken from this document.
- Stores carry 500–1,000+ SKUs (Flourish, §1). Searching a full catalogue on a ₹7,000 phone is slow, and
  typing in Odia script is slower still.
- POS adoption among small businesses is only 39% (Zoho, vendor survey), even with
  dedicated billing hardware available.

**Design implications:**
1. **Item capture is optional for each sale, and the day closes without it.** A day's cash
   must never be blocked by a missing item list.
2. The shop builds its **own short list** of items (for example 20–40), tapped from a grid with
   pictures or initials. The full catalogue is never searched. The list is ordered by the shop itself or by
   its own recent frequency. Ordering by frequency is derived display, not inference of the figure, but
   the **quantity and amount are always typed**.
3. "Other / not listed" is always one tap. Item reports state their coverage: "items
   recorded for 62% of sales value this month" (an illustrative wording, not a measured figure).
   Under-recording is then visible and not mistaken for slow sales.
4. Start item capture with udhar sales only, where the customer is named and the counter
   is usually calmer. Those are also the sales where the item record helps settle a dispute.

---

## 5. Design cautions

**Speed**
- Every main flow should be finishable one-handed, with a customer waiting. Entry stays on the app's
  own keypad, which the A-series and T-series already do.
- Reports are read at day close or in quiet hours. They can be dense, but they must open quickly on
  the target handset (an existing benchmark concern, not a new threshold).

**Literacy and language**
- Odisha literacy was 72.9% overall and 70.2% rural in 2011 (§1), and local-language content is
  named as a barrier in the region. Numbers must be readable without reading the words: large digits,
  ₹ signs, and colour meaning that is also carried by a shape or position. Labels should be short.
- The Odia and Hindi copy is still an unreviewed draft. Every new report string adds to that
  native-review backlog.
- WhatsApp reminders the shopkeeper sends must be in **the customer's** language choice,
  which may differ from the shopkeeper's.

**Trust**
- **Observations, never instructions.** "Credit outstanding has risen five business days
  running" is allowed. "Stop giving credit to Ramesh" is not. This is already a CLAUDE.md rule, and the
  research supports it: credit is how kiranas keep customers (IIMB), so cutting it is
  his call.
- **Never show a score as a verdict on him**, especially to a lender. A low Cash Confidence score
  shown to a third party could cost him a loan. Sharing must be specific, itemised and
  withdrawable (DPDP).
- **Don't quote scary industry numbers** (2 lakh closures, 12% shrinkage). They are
  unverified trade-body or vendor figures.
- **Don't imply tax status.** No "invoice", no "GST return", and no telling him whether to register or
  opt for composition (N9).
- **Under-recording is the norm.** Every derived figure (turnover vs threshold, top items,
  udhar ageing) is only as complete as what he entered, and the report should say so plainly.

---

## 6. Gaps: what this research could not establish

1. **Any primary data on Odisha shopkeepers.** This needs fieldwork: 10–20 interviews across
   Bhubaneswar/Cuttack and two tier-3 towns would test N1–N5 cheaply.
2. A current, independent figure for the share of kirana sales on udhar (the only figure found is from 2019 and from industry).
3. Seconds per sale for item entry at a kirana counter.
4. How many kiranas are GST-registered or on composition.
5. Owner-side WhatsApp adoption.
6. Whether a lender-facing export makes SWAFTO a lending service provider under RBI rules (legal review needed).
7. The current text of Notification 10/2019-CT after the 2022 amendments, and the enacted
   Finance Act 2023 change to s.10(2)(d). Both should be checked on CBIC before any copy cites them.

## Sources not reachable

The IIM Bangalore repository (`repository.iimb.ac.in`) failed TLS on every fetch, and
`isbinsight.isb.edu` did not resolve. Claims attributed to IIMB above come from search-result
abstracts only. The Flourish Ventures India PDF figures on credit and record-keeping were inside
images that could not be extracted.

## Method

About 25 web searches and 6 page fetches (2026-10-26). One official PDF (the CBIC composition flyer) was text-extracted
locally. Sub-questions: credit and recovery; cash leakage and staff; payments and fraud;
supplier credit and seasonality; GST law; quick commerce and ONDC; lending rails; literacy and
language; item capture and POS friction. No Reddit or YouTube shopkeeper threads came up
in search results, so the "voice of the shopkeeper" in this document is second-hand.
