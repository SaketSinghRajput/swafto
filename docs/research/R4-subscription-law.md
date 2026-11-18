# R4 · Selling Premium: billing, price, and the law around it

*Researched 2026-10-26 · Status: research, **not legal or tax advice**, unreviewed by counsel (H9) or a CA.*

**Scope ruling applied (product owner, 2026-10-26): no stock / inventory availability
tracking in either plan.** It appears nowhere below. Item-level capture per sale stays
in scope, as in R2.

Every factual claim carries a source. Where sources disagree, or only a secondary source
exists, the text says so and takes the conservative reading (CLAUDE.md, "Law"). Figures
marked **[computed]** are arithmetic on cited rates, not measurements. Figures marked
**[judgement]** are this researcher's recommendation, not a fact.

---

## 0 · The answer in one screen

| Question | Answer |
|---|---|
| Can Premium be sold with Razorpay / UPI Autopay inside the app? | **Not on its own.** A Play-distributed app selling a digital feature must use Google Play Billing. In India, User Choice Billing allows a second, alternative system *alongside* it, never instead of it (§1.1, §1.3) |
| What does Google take? | **15 %** on auto-renewing subscriptions in India today. **11 %** on the share paid through an alternative system (4 points off). India is not named in Google's 2026 fee schedule (§1.2) |
| V1 billing design | **Play Billing only**, verified server-side with `purchases.subscriptionsv2.get`, with RTDN via Pub/Sub. No secret in the app (§2) |
| Price | **Free forever** tier, plus **Premium at ₹99 / month or ₹799 / year**, GST-inclusive **[judgement]** (§4) |
| Free trial | **Do not use a Play free trial.** Play needs a payment method before a trial starts. The CCPA dark-pattern guidelines name *"requiring payment details or authorisation for auto-debits to obtain a free subscription"* as a subscription trap. Use a server-granted preview that asks for no payment details (§5.3) |
| GST | 18 %. SWAFTO is a developer located in India, so it owes the GST itself. Google does not collect it for Indian developers (§6) |
| What must never be behind the paywall | Reading, exporting, correcting and erasing one's own data; consent withdrawal; grievance; closing the day (§8) |

---

## 1 · Google Play Billing in India

### 1.1 Is Google Play Billing mandatory?

Yes, for this product. Play's Payments policy (§2) requires Play Billing for in-app
purchases of digital features. Its examples explicitly include *"cloud software and
services (such as data storage services, business productivity software, and financial
management software)"*, which describes SWAFTO
([Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)).
None of the §3 exceptions applies; they cover physical goods, bill payments, P2P and gambling.

The policy text has no B2B or enterprise exception and no explicit "consumption-only"
clause. 2023 reporting said Indian developers could choose Play Billing, alternative
billing, or a consumption-only model
([Business Standard, 2023](https://www.business-standard.com/companies/news/google-to-take-necessary-steps-to-enforce-new-in-app-billing-policy-123051701213_1.html)).
The current policy page does not state a consumption-only route. **Conservative reading:
assume there is none.** Policy §4 forbids steering users to a non-Play payment method
anywhere in the app or the store listing, outside the programmes a developer has enrolled in.

### 1.2 Service fee, India, 2026

- **Today.** The standard Play fee page lists subscriptions at **15 %** in every market
  except the five that moved in 2026 ([Service fees](https://support.google.com/googleplay/android-developer/answer/112622)).
- **New schedule, announced 4 March 2026.** Recurring purchases are 10 % plus a billing
  fee. The billing fee is 5 % in AU, JP, US, UK and the EEA; for other regions the page says
  *"details … forthcoming"*. Rollout dates are EEA/UK/US 30 Jun 2026, AU/JP 30 Sep 2026,
  KR 31 Dec 2026, and **Rest of World 30 Sep 2027**
  ([Lower service fees](https://support.google.com/googleplay/android-developer/answer/16954621)).
  The page does not name India. **Assumed, not stated: India is "Rest of World", so 15 %
  applies until at least 30 Sep 2027.**
- One third-party blog says the 15 % tier applies only after enrolling an Account Group,
  and that statements may otherwise show 30 %
  ([vmobify](https://vmobify.com/blog/google-play-service-fees-india)). No other source
  supports this. **Check it on the first payout statement (R4-HA3).**

### 1.3 User Choice Billing (alternative billing) in India

From Google's own pages
([India UCB](https://support.google.com/googleplay/android-developer/answer/13306652);
[UCB overview](https://support.google.com/googleplay/android-developer/answer/13821247)):

- Open to all apps with users in India on mobile and tablet. Enrolment is in Play Console
  under Alternative billing.
- The fee is **4 % lower** on transactions paid through the alternative system.
- **Alternative-only is not allowed.** Play Billing must be offered alongside it.
- Developers using the Alternative Billing APIs must report each transaction **within
  24 hours**. Manual reporting is due by the 5th business day of the next month. The APIs
  have been available since 14 Nov 2023, and the manual-reporting sunset date is "TBA".
- The developer must **certify PCI DSS compliance** and give users a way to report fraud.
- A payment taken in a webview counts as the alternative system and pays the same fee.

### 1.4 Status of the CCI case

In October 2022 CCI fined Google ₹936.44 crore over Play billing. In March 2025 NCLAT
partly upheld the order and cut the penalty to about ₹216.69 crore. Google appealed to the
Supreme Court on 21 Jul 2025. The Court agreed to hear appeals from Google, CCI and ADIF and
listed them for November 2025
([Moneylife](https://moneylife.in/article/google-moves-supreme-court-against-nclat-ruling-in-play-store-dominance-case/77766.html);
[exchange4media](https://www.exchange4media.com/digital-news/sc-to-hear-google-cci-adif-appeals-against-nclat-ruling-in-play-store-antitrust-case-146263.html)).
**No outcome was found as of today.** None of this changes what the app must do now: it
follows the Play policy currently in force.

### 1.5 Subscription mechanics that shape the design

From [Subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions)
and [Subscriptions](https://developer.android.com/google/play/billing/subscriptions):

- **Base plans and offers.** One subscription product with two auto-renewing base plans,
  monthly and yearly. Offers such as an intro price or an upgrade discount sit on top of
  base plans. Prepaid plans also exist; they do not auto-renew and the user tops them up.
- **Acknowledge within 3 days**, or Google refunds and revokes the purchase.
- **Grace period.** On by default and configurable. The user keeps access
  (`IN_GRACE_PERIOD`).
- **Account hold.** Follows the grace period and defaults to 60 days minus the grace
  period. Access is blocked (`ON_HOLD`). On recovery the purchase token stays the same and
  Google sends `SUBSCRIPTION_RECOVERED`.
- **`CANCELED` keeps access until `expiryTime`.** Removing access while the user is still
  entitled violates Play's subscriptions policy.
- **`purchases.subscriptionsv2.get` is the source of truth.** `purchases.subscriptions.get`
  is deprecated. Call v2 when the RTDN arrives, not at expiry.
- **Upgrade, downgrade or resubscribe** creates a new purchase token. Its
  `linkedPurchaseToken` points at the old one.
- **Free trials** start only after Google verifies a valid payment method. A user who
  cancels during the trial keeps access to the end of it and is not charged. See §5.3.

Play's own Subscriptions policy requires the terms to be visible without extra steps:
price, billing frequency, trial length, automatic enrolment into a paid plan, and how to
cancel. It also requires an easy online way to cancel
([Subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533)).

---

## 2 · Minimal secure billing architecture

**Rule: the APK holds no Google credential, no price authority and no entitlement
decision.** The app collects a purchase token and asks the server.

```
 Phone (RN + Play Billing Library)          API (Fastify, ap-south-1)                 Google
 ─────────────────────────────────          ─────────────────────────                 ──────
 1 launchBillingFlow(productId, basePlan,
   obfuscatedAccountId = HMAC(shop_id))  ──────────────────────────────────────────▶  Play
 2 onPurchasesUpdated → purchaseToken
 3 POST /v1/billing/play/verify  ───────▶ shop = shopOf(session)        (S-11)
   {purchaseToken, productId}             subscriptionsv2.get(token) ──────────────▶ Play Dev API
                                          check: state ∈ {ACTIVE, IN_GRACE_PERIOD},
                                                 obfuscatedExternalAccountId == HMAC(shop),
                                                 token not bound to a different shop
                                          append billing_event(token PK, raw state)
                                          acknowledge(token)  ─────────────────────▶ Play Dev API
 4 ◀── {premium:true, expiryTime}         entitlement derived on read
                                                                                     Pub/Sub topic
 5                                        POST /v1/billing/play/rtdn  ◀──── push ─── (RTDN)
                                          verify Pub/Sub OIDC JWT (aud, email)
                                          RTDN = hint only → re-fetch subscriptionsv2.get
                                          idempotent on Pub/Sub messageId
 6                                        daily: Voided Purchases API → append revocation
```

| Part | Rule | Why |
|---|---|---|
| Service-account key | Stored in SSM Parameter Store (SecureString) and read by the API at boot. Never in git, the APK or CI logs. `check:secrets` already fails on a private key | It is the only credential that can query and refund purchases |
| `obfuscatedAccountId` | Set to `HMAC(server_secret, shop_id)` and checked on verify | Google uses it for fraud detection. The check also stops one shop's token from unlocking another shop ([Billing security](https://developer.android.com/google/play/billing/security)) |
| Shop identity | From `shopOf()` only, never from the request body | S-11 already requires this |
| Purchase token | Primary key of `billing_event`. Never key on `orderId` | Google says tokens are globally unique and that not every purchase has an `orderId` |
| Storage | `billing_event` is append-only, like every other table here (D1). Entitlement is the latest Google state per token, **derived on read** | "No stored totals." A cached `is_premium` flag would be a second source of truth |
| RTDN | Never trust its payload for state; always re-fetch | An RTDN only says that something changed |
| Pub/Sub push auth | Verify the Google-signed OIDC token on the push endpoint (audience and service-account email) | Otherwise anyone can POST fake notifications |
| Acknowledge | From the server, and only after verification | Prevents the 3-day auto-refund, and stops an unverified token being granted |
| Fraud or mismatch | Do not acknowledge. Call `subscriptionsv2.revoke` with `fullRefund` | Google's own guidance |
| Offline client | Caches `{premium, expiryTime}` from the server and keeps the Premium UI until `expiryTime`, then re-asks | Offline-first. **Known limit:** a rooted phone can fake the local cache, but cannot unlock server-side Premium features |
| Money | Play reports `priceAmountMicros`. Convert to integer paise with an integer helper in `money.ts` (micros ÷ 10 000), never a float | ADR-003; `check:money` applies |
| Clock | The entitlement check lives in the API, not in the formula engine | ADR-012; the engine stays clock-free |
| Residency | Pub/Sub runs on Google Cloud, but an RTDN payload is a package name, a token and a type, not personal data. Purchase state is stored only in ap-south-1 | AD-008 |

Left out of V1 on purpose: alternative billing / Razorpay (§3), installment plans (not
offered in India), and more than one subscription product. Add alternative billing only
when 4 points of fee are worth a PCI DSS attestation and 24-hour reporting.

---

## 3 · UPI Autopay, e-mandates, Razorpay / Cashfree

**When they are allowed for Premium.** Only in two cases:

- **(a)** As the *alternative* half of User Choice Billing, shown in Google's choice screen,
  with the 11 % fee, PCI DSS certification and 24-hour reporting (§1.3).
- **(b)** For a purchase made entirely outside the app (a website) that the app never
  links to or mentions (Play policy §4).

They are never allowed as the only in-app option.

**If they are ever used, the RBI recurring-payment rules apply:**

- **Additional Factor of Authentication (AFA)** is needed at mandate registration and on
  the first transaction. Later recurring debits **up to ₹15,000** need no AFA; larger ones
  do. RBI raised the limit from ₹5,000 on 16 Jun 2022
  ([Khaitan & Co](https://www.khaitanco.com/thought-leaderships/RBI-enhances-transaction-limits-for-processing-of-e-mandates-for-recurring-transactions:-from-INR-5000-to-INR-15000);
  [RBI notification](https://rbidocs.rbi.org.in/rdocs/notification/PDFs/396MDD002E435ECA145509929FC3ACBCFD0E9.PDF);
  [NPCI RuPay circular](https://www.npci.org.in/PDF/npci/rupay/2022/Circular-RuPay-AutoPay-AFA-Limit-enhancement-and-compliance.pdf)).
  Premium at ₹99 or ₹799 is well under that limit.
- **A pre-debit notification at least 24 hours before each charge** (RBI directions, above).
- One source cites an "RBI Digital Payments – E-mandate Framework, 2026" that keeps the
  ₹15,000 limit ([Zoho](https://www.zoho.com/payments/academy/payment-processing/upi-autopay-mandates-and-recurring-debits.html)).
  **No RBI primary text was found, so this is unverified.**
- Razorpay UPI Autopay allows one debit per frequency cycle, and registration starts with a
  ₹1 charge. NPCI is **deprecating UPI Collect for new Autopay registrations from 28 Feb
  2026** in favour of UPI Intent
  ([Razorpay docs](https://razorpay.com/docs/payments/payment-gateway/s2s-integration/recurring-payments/upi/authorization-transaction/)).
  No published Razorpay fee for Autopay was found.

Under Play Billing, Google collects the payment and handles mandate authentication. That is
one more reason to start with Play Billing alone.

---

## 4 · Pricing

### 4.1 What comparable apps charge (vendor pages, fetched 2026-10-26)

| App | Price | Notes |
|---|---|---|
| OkCredit | Free (with ads) · ₹30 / 30 days · ₹75 / 30 days · **₹99 / 30 days** | 30-day plans only, no yearly plan. GST treatment not stated ([okcredit.in/pricing](https://okcredit.in/pricing)) |
| Vyapar | Mobile-only **₹599 / year** · ₹1,349 / 3 years · Desktop+Mobile ₹2,799 / year | GST treatment not stated ([vyaparapp.in/pricing](https://vyaparapp.in/index.php/pricing)) |
| myBillBook | Vendor FAQ: "basic plan starts at Rs.399/year". Capterra lists tiers from ₹34 to ₹417 / month | Sources disagree ([Capterra](https://www.capterra.com/p/202732/FloBooks/pricing/)) |
| Khatabook | **No current price found** | — |

No independent study of how Indian buyers respond to particular price points was found.
The clustering at ₹99, ₹599 and ₹799 is what competitors charge, not evidence of why it works.

### 4.2 Recommendation **[judgement]**

| Plan | Price | Reasoning |
|---|---|---|
| **Free** | ₹0, forever. No ads, no time limit | The daily close *is* the product. A cash book that stops closing the day holds the shopkeeper's records hostage (§8) |
| **Premium monthly** | **₹99 / month**, GST-inclusive | Same as OkCredit's top tier, so it matches a price shopkeepers already see. About ₹3.3 a day [computed] |
| **Premium yearly** | **₹799 / year**, GST-inclusive | About 33 % below 12 × ₹99 = ₹1,188 [computed]. It is above Vyapar's mobile-only ₹599, which is justified only if Premium includes something that plan lacks, such as multi-device or staff logins. If it does not, price at **₹599** |

**Net to SWAFTO per sale [computed].** Assumptions: GST-inclusive prices, 18 % GST, and the
15 % Play fee charged on the tax-exclusive amount, which is how Google describes
tax-inclusive Indian prices
([Play Books GST note](https://support.google.com/books/partner/answer/7419067)).

- ₹99 → ₹83.90 ex-GST → **about ₹71.3** after the Play fee.
- ₹799 → ₹677.1 ex-GST → **about ₹575.5** after the Play fee.

Income-tax withholding may come off as well (§6). **These are not measured numbers;
confirm them against the first real payout statement.**

Affordability: the target handset costs about ₹7,000 (CLAUDE.md), so ₹799 a year is about
11 % of the phone's price [computed]. No source was found for shop-level margins in Odisha.
Test the price with real shopkeepers before launch (R4-HA7); do not treat this table as settled.

---

## 5 · Consumer protection and dark patterns

### 5.1 The instrument

The CCPA issued the *Guidelines for Prevention and Regulation of Dark Patterns, 2023* on
**30 Nov 2023**, under s.18 of the Consumer Protection Act 2019. They apply to
*"platforms systematically offering goods or services in India, advertisers and sellers"*,
and they prohibit *any person* from using a dark pattern. Annexure 1 lists 13 patterns. The
list is not exhaustive, and the illustrations are guidance, not a binding interpretation
([Mondaq overview](https://www.mondaq.com/article/1844140/ccpas-guidelines-on-dark-patterns-an-overview);
[draft text, consumeraffairs.nic.in](https://consumeraffairs.nic.in/sites/default/files/file-uploads/latestnews/Draft%20Guidelines%20for%20Prevention%20and%20Regulation%20of%20Dark%20Patterns%202023.pdf)).
On 5 Jun 2025 the CCPA told platforms to self-audit within three months
([Storyboard18](https://www.storyboard18.com/digital/ccpa-warns-e-comm-firms-over-dark-patterns-self-audit-within-3-months-69249.htm)).
**The final gazette text was not retrieved.** The definitions below come from law-firm
summaries and should be checked against the gazette (R4-HA5).

**Open point for counsel.** On this researcher's reading of CPA 2019 s.2(7), not checked
against the text here, a person who avails a service for a commercial purpose is not a
"consumer". A shopkeeper buying a business tool may therefore be outside "consumer".
**Conservative reading: comply as if he is a consumer.** The guidelines bind "any person",
and the Play Subscriptions policy requires most of the same things anyway.

### 5.2 The patterns that apply to a subscription

| Pattern | Definition (summary) | What it means here |
|---|---|---|
| **Subscription trap** | Cancellation made impossible, complex or lengthy; cancel option hidden; **payment details or auto-debit authorisation required to obtain a free subscription**; cancel instructions unclear | Cancel takes 2 taps from Settings → Premium and opens Play's subscription page directly. No "call support to cancel" |
| **SaaS billing** | Recurring charges collected surreptitiously; **a free trial converted to paid without notification**; silent auto-renewal; auto-renewal without adequate disclosure | Renewal terms shown before purchase, and an in-app reminder before each yearly renewal |
| **Drip pricing** | Price elements withheld or revealed late; **"free" advertised without saying continued use requires payment**; an already-paid service blocked until something more is bought | "Free" means free forever. The price shown is the final GST-inclusive price. A paid feature never stops working because some other feature is unpaid |
| **Confirm shaming** | Guilt, fear or ridicule used to keep a subscription | The cancel button says "Cancel Premium". No "No, I don't care about my shop" |
| **Nagging** | Repeated upgrade prompts after dismissal | Dismissing an upsell suppresses it. Mondaq's illustration is exactly an upgrade prompt that reappears after dismissal |
| **False urgency** | Fake countdowns or scarcity | No "offer ends tonight" unless it really ends tonight |
| **Interface interference** | One option highlighted to hide another | Monthly and yearly shown with equal weight; cancel never greyed out |
| **Forced action** | Sign-up or data sharing forced to get the intended service | The Premium purchase asks for nothing beyond Play's own flow |

### 5.3 The free-trial problem

Play starts a free trial only after it *"verifies that the user has a valid payment
method"*. A Play free trial therefore requires payment details to get a free subscription,
which is the CCPA subscription-trap wording. Whether a regulator would apply that
illustration to a mechanism the store itself imposes is **uncertain**.

**Conservative choice: no Play free trial.** Instead, the server grants a **Premium preview**
on request (14 days **[judgement]**). It needs no payment details and sets up no auto-debit.
The app shows days remaining, gives notice 3 days before the end, and then simply reverts
to Free. Nothing converts and nothing is charged. This also removes the SaaS-billing risk
of a trial converted without notification.

### 5.4 Cancel and auto-renew UX checklist

1. Before purchase, on the same screen without scrolling: the price including GST, the
   billing period, "renews automatically until you cancel", and how to cancel.
2. Settings → Premium shows the status, the next renewal date and amount, and a **Cancel**
   button that deep-links to Play subscription management
   (`https://play.google.com/store/account/subscriptions?sku=…&package=…`).
3. After cancelling, Premium continues to `expiryTime`, and the screen says so.
4. Yearly plan: an in-app reminder before renewal. A year's charge never renews silently.
5. Price increases go through Play's price-change flow, with an in-app notice. Prices are
   never raised silently.
6. On lapse, no data is hidden or locked (§8). Only Premium *actions* stop.
7. All copy in all three languages, reviewed under H13. A cancel flow that is clear only in
   English is not clear to this user.

---

## 6 · GST

- **Rate: 18 %.** The 56th GST Council met on 3 Sep 2025, and from 22 Sep 2025 the
  structure is 5 % / 18 %, plus a 40 % demerit rate. IT and software services are at 18 %
  ([EY alert](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-in/alerts-hub/2025/09/gst-council-announces-major-rate-rationalization-and-trade-facilitation-measures.pdf);
  [NASSCOM](https://community.nasscom.in/communities/digital-transformation/bfsi/gst/gst-rates-announced-by-the-gst-council-and-its-relevance-to-the-it-sector.html)).
  The sources say 18 % applies; none states outright that the reform left the rate unchanged.
- **Who pays: SWAFTO.** Google collects and remits GST only for developers located *outside*
  India. For a developer in India, *"it's your responsibility to determine whether you need
  a … GSTIN"*, and to collect and remit the tax
  ([Payments Center, India](https://support.google.com/paymentscenter/answer/7161449)).
- **OIDAR vs domestic B2C.** The OIDAR category drives the *cross-border* rules, where a
  foreign supplier serves Indian users. SWAFTO is an Indian supplier serving Indian
  recipients, so each sale is a domestic taxable supply at 18 %. Place of supply decides
  CGST+SGST versus IGST. Classifying Premium as OIDAR or not changes the SAC code and the
  invoice details, not the rate. **The SAC code is disputed between sources** (998314,
  998315, or the 9984 OIDAR heading;
  [registerkaro](https://www.registerkaro.in/post/gst-registration-for-software-it-services)).
  A CA must choose it (R4-HA2).
- **Registration threshold.** Under Notification 65/2017-CT, suppliers of services through
  an e-commerce operator (other than s.9(5) services) need not register up to ₹20 lakh
  aggregate turnover, or ₹10 lakh in special-category states
  ([GST Council flyer](https://www.gstcouncil.gov.in/sites/default/files/e-version-gst-flyers/Registration_under_GST_Law_new.pdf)).
  Two questions are **for the CA**: whether Google Play is an "e-commerce operator" for this
  supply, and whether other SWAFTO turnover counts. Odisha is not a special-category state;
  that is this researcher's understanding and needs confirming. **Conservative reading:
  register before the first paid sale.**
- **Invoices (CGST Rule 46).** For an unregistered recipient, the name and address are
  needed only at ₹50,000 or more. **But** for taxable services supplied *through an
  e-commerce operator*, or as OIDAR, to an unregistered recipient, the invoice must carry
  the recipient's **State name**, whatever the value
  ([CBIC Rule 46](https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/rules/cgst_rules/active/chapter6/rule46_v1.00.html);
  [Circular 242/2024](https://www.gstcouncil.gov.in/sites/default/files/2025-01/circular-no-242-2024.pdf)).
  SWAFTO already holds the shop's state from onboarding, so every invoice can carry it.
  - A shop that gives its GSTIN gets a B2B invoice showing that GSTIN, so it can claim
    input tax credit.
  - Play's own receipt is not SWAFTO's GST invoice.
  - **Who issues invoices, and in what numbering series, is for the CA.**
- **Income-tax withholding.** If no PAN is on file, Google may deduct 5 % of the purchase
  price (excluding GST) from proceeds
  ([Play tax help](https://support.google.com/googleplay/android-developer/answer/9384608)).
  This comes from a search summary; the page was not read in full. Put a PAN on the
  payments profile (R4-HA1).

---

## 7 · DPDP Act 2023 and Rules 2025

**Commencement.** The Rules were notified in November 2025; sources give 13 or 14 Nov. The
Board provisions apply now. Most substantive duties (notice, consent, children, rights,
security, breach) apply **about 18 months later, on 13 May 2027 according to one source**
([SCC Online](https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/);
[AZB](https://www.azbpartners.com/bank/update-indias-digital-personal-data-protection-framework-comes-into-effect/)).
Building to them now costs little and avoids a retrofit.

### 7.1 (a) Per-customer, item-level purchase history

*Who is the fiduciary.* AD-006 already decides that the **shopkeeper is the Fiduciary** for
his customers' data and **SWAFTO is the Processor**, pending counsel (H9). Item-level
purchase history sharpens that question:

- The personal-use exemption does not help the shopkeeper. s.3(c)(i) covers only data
  processed *"by an individual for any personal or domestic purpose"*
  ([s.3](https://www.dpdpa.com/dpdpa2023/chapter-1/section3.html)), and a shop is commercial.
- A fiduciary stays answerable for processing done by its processor, and may engage a
  processor only under a valid contract (s.8(1)–(2)). Per commentary on the Rules, that
  contract must include security safeguards
  ([s.8](https://www.dpdpa.com/dpdpa2023/chapter-2/section8.html)).
  **The Terms are that contract.** They must instruct SWAFTO to use party data only for
  the shopkeeper's ledger.
- **The line that changes the analysis.** If SWAFTO uses party data for *its own* purpose
  (cross-shop analytics, credit scoring, model training, marketing), it is no longer only
  a processor for that use. It becomes a fiduciary owing notice to people it has never met.
  That is AD-006's reversal trigger, reached by a product decision rather than by counsel.

*The shopkeeper's lawful basis.* s.7(a) allows processing *"for the specified purpose for
which the Data Principal has voluntarily provided her personal data"*, unless she has
objected. Its illustration is a pharmacy texting a receipt to a customer who asked for one
([s.7](https://www.dpdpa.com/dpdpa2023/chapter-2/section7.html)). Recording what an udhar
customer bought, so the shop can show him his tab, fits that reading. Using the same
history for promotions does **not**. **Conservative reading:**

- Item-level history is used only for the customer's own account with that shop: what he
  owes, and for what.
- The app gives the shopkeeper a one-line notice to show or read to the customer, in
  Odia, Hindi and English, for example: "I record what you buy on credit in the SWAFTO app,
  to keep your account."
- Per-party export and per-party erasure stay free; both already exist (AD-006). They are
  how the shopkeeper answers his customer's s.11 and s.12 requests.
- Item lines stay optional, and so does the party's phone number (already true).

### 7.2 (b) Processing shop data with an AI model

- **No AI in the entry path.** CLAUDE.md already forbids it; the law adds nothing here.
- **Purpose limitation.** Consent under s.6 is for a *specified* purpose, and the itemised
  notice must say what is processed and why. An AI observation feature therefore needs its
  own line in the notice and its own consent toggle, separate from the core ledger.
  Withdrawing that consent must not degrade the core app.
- **Party data is never sent to a model** for SWAFTO's own purposes (see 7.1). Shop-level
  aggregates, such as totals by payment mode or by day, carry far less risk. Strip party
  names and phones before anything reaches a model.
- **Self-hosted vs third party.**
  - A third-party model API is a processor of SWAFTO's own data, and a sub-processor of
    the shopkeeper's party data. It needs a contract with security terms and, for party
    data, the shopkeeper's authority under the Terms.
  - s.16 restricts transfers abroad only to countries the government notifies, a
    "negative list" ([DSCI](https://www.dsci.in/files/content/documents/2025/cross-border-flow-of-data.pdf)).
    No such notification was found.
  - **AD-008 already chose to keep personal data in India.** To stay consistent with it,
    run any model in ap-south-1. That can be self-hosted, or a provider's in-region
    endpoint if one exists (not checked here). Never let shop data train a third party's
    model.
- **Gap:** no source was found on the MeitY AI governance guidelines or how they interact
  with DPDP.

### 7.3 Children

s.9 requires verifiable parental consent before processing a child's data (a child is
under 18). It also bans tracking, behavioural monitoring, and targeted advertising directed
at children ([s.9](https://www.dpdpa.com/dpdpa2023/chapter-2/section9.html)). The users are
shopkeepers, but **party records may describe minors**, such as a child sent to buy on the
family's tab. Conservative design:

- The Behaviour Engine and any AI feature never profile an individual party. Observations
  are shop-level only.
- Accounts are for adults. The Terms need to say so; confirm under H9.
- No ads at all, which removes the targeted-advertising risk entirely.

### 7.4 Credit (RBI)

The *Digital Lending Directions, 2025* (8 May 2025) require the borrower's express consent
for all data and minimal data stored in India. The regulated entity is responsible for any
**Lending Service Provider**, a term that covers services incidental to underwriting
([Mondaq](https://www.mondaq.com/india/fin-tech/1636908/digital-lending-directions-2025);
[CAM](https://corporate.cyrilamarchandblogs.com/2025/05/fig-paper-no-44-series-3-rbi-consolidates-directions-on-digital-lending-implications-for-res-lsps/)).
Passing shop data to a lender for underwriting would make SWAFTO an LSP, working under
contract to a regulated entity. One source says RBI dark-pattern rules for financial
products take effect 1 Jan 2027 (Mondaq dark-patterns overview, §5.1).

**Recommendation:**

- No credit use in V1.
- If it is ever added, it needs a separate, opt-in consent for each lender, given by the
  *shopkeeper about his own shop*.
- A customer's udhar record is never used to score that customer.
- Sharing a party's default status with other shops may fall under credit-information law
  (CICRA 2005). **That was not researched.** Treat it as forbidden until counsel says
  otherwise.

---

## 8 · Fair feature gating

The test: **the paywall may sell new capability, never access to what the shopkeeper has
already recorded.** DPDP's rights cannot depend on payment: s.11 access and summary, s.12
correction and erasure, s.13 grievance, and s.6(4) withdrawal of consent as easy as giving
it. DPDP has **no explicit portability right**, so keeping export free is a choice for
fairness and against hostage-taking, not a legal duty. It is also how the shopkeeper meets
*his* customers' requests.

**Always free, including after Premium lapses:**

- Opening cash, entries in every mode, corrections (D1), closing the day (D7), the cash equation
- Reading every past day and every party ledger, with no history window
- `/v1/me/export`, per-party export, per-party redaction, `/v1/me/erase`, `/v1/deletion/*`,
  consents, grievance, the notice
- Typed adjustments, returns and refunds, exchange (they keep the books true)
- Backup and sync of his own data (that is data safety, not a feature)
- The legal pages

**Premium candidates [judgement]** (stock / inventory excluded by scope):

- More than one device, or staff logins with roles, per shop
- Formatted monthly and yearly statements (PDF, shareable)
- Item-level capture per sale and the sales-history patterns R2 allows (top items, slow
  items, what a customer usually buys), all shop-scoped (§7.1)
- SMS payment reminders to parties. Each SMS has a real DLT/SMS cost, and reminders need
  consent and DLT registration (H1)
- More than one shop per account
- The Behaviour Engine observations and the three scores, **but only after** their maths is
  defined and validated in the docs, as the 2026-10-22 decisions require. Until then they
  ship to nobody, paid or free

**On lapse:** anything created under Premium (statements, past entries made by staff
logins) stays **readable and exportable**. Creating new ones stops. Staff logins become
read-only and are never deleted. Nothing is hidden.

---

## 9 · Must do / must not do

**Must do**

1. Use Play Billing for Premium. Verify every purchase on the server with
   `subscriptionsv2.get`, and acknowledge from the server within 3 days.
2. Keep the Play service-account key in SSM only.
3. Receive RTDN via Pub/Sub with verified push auth, and re-fetch state on every
   notification.
4. Bind each purchase to `shopOf()` through `obfuscatedAccountId`, with the purchase token
   as primary key.
5. Keep Premium on during the grace period, and until `expiryTime` after a cancel. Block it
   on account hold and on expiry.
6. Before purchase, show the price including GST, the billing period, auto-renewal, and
   how to cancel. Make cancel take 2 taps.
7. Register for GST (conservative reading), and issue GST invoices that carry the
   recipient's state.
8. Give each AI feature its own notice line and consent, keep it shop-level, and host it
   in India.
9. Keep every item on the §8 free list free.

**Must not do**

1. No Razorpay / UPI Autopay as the only in-app option, and no steering to web payment.
2. No Play free trial that needs a card (§5.3), and no trial that converts silently.
3. No countdowns, no guilt copy, no upsell that returns after dismissal, no pre-selected
   yearly plan.
4. Never lock, hide or delete the shopkeeper's records on lapse.
5. Never send party data to an AI model, a lender or another shop. Never profile an
   individual party.
6. No secret, price authority or entitlement decision in the APK.
7. No float on any Play price; convert micros to paise as integers.
8. No ads.

---

## 10 · New human-blocked actions (proposed for `HUMAN-ACTIONS.md`; not added)

IDs are provisional (`R4-HA1`…`R4-HA7`) until they are given H-numbers in that file.

| # | Action | Unblocks |
|---|---|---|
| R4-HA1 | **Play Console payments profile (merchant account).** Bank account in the entity's name, with PAN and GSTIN on the profile. Leave the alternative-billing ToS unaccepted for V1. Needs H7 | Any paid sale. Avoids the higher withholding for a missing PAN |
| R4-HA2 | **GST registration and a CA's decisions.** Get a GSTIN (Odisha). Have a CA fix the SAC code, whether the ₹20 lakh e-commerce exemption applies, the invoice numbering, and who issues the invoice for each Play sale | Selling Premium lawfully |
| R4-HA3 | **Google Cloud project for billing.** (1) Create a service account and grant it Play Console API access (View financial data; Manage orders and subscriptions). (2) Create a Pub/Sub topic and a push subscription to `https://api.<domain>/v1/billing/play/rtdn`. (3) Give `google-play-developer-notifications@system.gserviceaccount.com` publish rights on the topic. (4) Put the key JSON in SSM. (5) Check the 15 % rate on the first payout statement | Server verification and RTDN |
| R4-HA4 | **Create the subscription product and base plans in Play Console.** Monthly ₹99; yearly ₹799 or ₹599 (owner's call). Tax-inclusive, grace period on, **no free-trial offer** | The purchase flow |
| R4-HA5 | **Counsel review: subscriptions and dark patterns.** Check §5 against the gazette text of the 2023 Guidelines. Rule on the free-trial question (§5.3), on whether a shopkeeper is a "consumer" under CPA s.2(7), and on whether the E-Commerce Rules 2020 apply. Extend H9 to cover item-level party history (§7.1) | Public launch of Premium |
| R4-HA6 | **Choose the AI provider.** For a third-party model: pick one with an India-region endpoint, sign a DPA with security terms and a no-training clause, and add the notice line. If self-hosted, there is nothing to sign | Any AI-derived feature |
| R4-HA7 | **Test the price with real shopkeepers.** Show ₹99 / ₹799 against ₹599 to a handful of target shops in Odisha before R4-HA4 is fixed | Confidence in §4 |

---

## Sources

1. [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738): when Play Billing is mandatory; anti-steering
2. [Play service fees](https://support.google.com/googleplay/android-developer/answer/112622): 15 % on subscriptions; 4 % off for alternative billing in India and KR
3. [Play lower service fees (Mar 2026)](https://support.google.com/googleplay/android-developer/answer/16954621): new rates; Rest of World 30 Sep 2027
4. [UCB overview](https://support.google.com/googleplay/android-developer/answer/13821247) and [India programme](https://support.google.com/googleplay/android-developer/answer/13306652): eligibility, PCI DSS, 24 h reporting, no alternative-only
5. [Subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions): states, grace period and hold, RTDN types, 3-day acknowledge, v2 API
6. [Subscriptions (base plans, offers, trials)](https://developer.android.com/google/play/billing/subscriptions)
7. [Billing security](https://developer.android.com/google/play/billing/security): server verification, obfuscatedAccountId, voided purchases
8. [Play Subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533): disclosure and cancellation
9. [Payments Center, India GST](https://support.google.com/paymentscenter/answer/7161449): Indian developers handle their own GST
10. [Play Books GST note](https://support.google.com/books/partner/answer/7419067): how tax-inclusive pricing works
11. [Play tax help](https://support.google.com/googleplay/android-developer/answer/9384608): withholding when no PAN is on file (via search summary)
12. [Moneylife](https://moneylife.in/article/google-moves-supreme-court-against-nclat-ruling-in-play-store-dominance-case/77766.html), [exchange4media](https://www.exchange4media.com/digital-news/sc-to-hear-google-cci-adif-appeals-against-nclat-ruling-in-play-store-antitrust-case-146263.html): CCI, NCLAT and Supreme Court status
13. [Business Standard, 2023](https://www.business-standard.com/companies/news/google-to-take-necessary-steps-to-enforce-new-in-app-billing-policy-123051701213_1.html): reporting on a consumption-only option
14. [vmobify](https://vmobify.com/blog/google-play-service-fees-india): uncorroborated claim about 15 % vs 30 % enrolment
15. [Khaitan & Co](https://www.khaitanco.com/thought-leaderships/RBI-enhances-transaction-limits-for-processing-of-e-mandates-for-recurring-transactions:-from-INR-5000-to-INR-15000), [RBI notification](https://rbidocs.rbi.org.in/rdocs/notification/PDFs/396MDD002E435ECA145509929FC3ACBCFD0E9.PDF), [NPCI](https://www.npci.org.in/PDF/npci/rupay/2022/Circular-RuPay-AutoPay-AFA-Limit-enhancement-and-compliance.pdf): ₹15,000 AFA limit, 24 h pre-debit notice
16. [Zoho Payments](https://www.zoho.com/payments/academy/payment-processing/upi-autopay-mandates-and-recurring-debits.html): unverified 2026 framework
17. [Razorpay UPI Autopay docs](https://razorpay.com/docs/payments/payment-gateway/s2s-integration/recurring-payments/upi/authorization-transaction/): limits; Collect deprecation from 28 Feb 2026
18. [OkCredit pricing](https://okcredit.in/pricing), [Vyapar pricing](https://vyaparapp.in/index.php/pricing), [Capterra myBillBook](https://www.capterra.com/p/202732/FloBooks/pricing/)
19. [Mondaq dark patterns overview](https://www.mondaq.com/article/1844140/ccpas-guidelines-on-dark-patterns-an-overview), [draft guidelines](https://consumeraffairs.nic.in/sites/default/files/file-uploads/latestnews/Draft%20Guidelines%20for%20Prevention%20and%20Regulation%20of%20Dark%20Patterns%202023.pdf), [Storyboard18](https://www.storyboard18.com/digital/ccpa-warns-e-comm-firms-over-dark-patterns-self-audit-within-3-months-69249.htm)
20. [EY on the 56th GST Council](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-in/alerts-hub/2025/09/gst-council-announces-major-rate-rationalization-and-trade-facilitation-measures.pdf), [NASSCOM](https://community.nasscom.in/communities/digital-transformation/bfsi/gst/gst-rates-announced-by-the-gst-council-and-its-relevance-to-the-it-sector.html), [registerkaro](https://www.registerkaro.in/post/gst-registration-for-software-it-services)
21. [GST Council registration flyer](https://www.gstcouncil.gov.in/sites/default/files/e-version-gst-flyers/Registration_under_GST_Law_new.pdf): Notification 65/2017 threshold
22. [CBIC, CGST Rule 46](https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/rules/cgst_rules/active/chapter6/rule46_v1.00.html), [Circular 242/2024](https://www.gstcouncil.gov.in/sites/default/files/2025-01/circular-no-242-2024.pdf)
23. [SCC Online on the DPDP Rules](https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/), [AZB](https://www.azbpartners.com/bank/update-indias-digital-personal-data-protection-framework-comes-into-effect/)
24. DPDP Act text via dpdpa.com: [s.3](https://www.dpdpa.com/dpdpa2023/chapter-1/section3.html), [s.7](https://www.dpdpa.com/dpdpa2023/chapter-2/section7.html), [s.8](https://www.dpdpa.com/dpdpa2023/chapter-2/section8.html), [s.9](https://www.dpdpa.com/dpdpa2023/chapter-2/section9.html). A secondary host; verify against the Gazette
25. [DSCI on cross-border data flow](https://www.dsci.in/files/content/documents/2025/cross-border-flow-of-data.pdf): the s.16 negative list
26. [Mondaq on the Digital Lending Directions 2025](https://www.mondaq.com/india/fin-tech/1636908/digital-lending-directions-2025), [Cyril Amarchand](https://corporate.cyrilamarchandblogs.com/2025/05/fig-paper-no-44-series-3-rbi-consolidates-directions-on-digital-lending-implications-for-res-lsps/)

## Gaps

- Not found or not verified, each marked where it is used:
  - the final gazette text of the Dark Patterns Guidelines
  - the Supreme Court outcome in the CCI case
  - the RBI 2026 e-mandate framework
  - the MeitY AI governance guidelines
  - whether CICRA covers sharing a party's default status
  - Khatabook's price
  - Razorpay's Autopay fees
  - the official SAC code for this service
- **Method:** web searches and page fetches. Google's help and developer pages were read
  directly. Most legal texts were read through law-firm summaries, which is why R4-HA5 exists.
  The `legal:compliance-check` and `privacy-legal:reg-gap-analysis` skills were not run
  separately; this document follows the same structure.
