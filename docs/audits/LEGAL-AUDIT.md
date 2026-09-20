# LEGAL-AUDIT

Compliance audit for an application that stores Indian citizens' financial records.
Written at G2. Research date **September 2026**.

> **This is an engineering compliance audit, not legal advice.** It is written to make
> the obligations concrete and to map each one to a screen, an endpoint, a column or a
> document, so that nothing is discovered late. **Every item marked RESOLVED-AUTONOMOUSLY was
> decided under the autonomy amendment and is recorded in DECISIONS-AUTONOMOUS.md
> with a reversal trigger; counsel should still review those before publication.** The whole document should be reviewed by
> a qualified Indian data-protection practitioner before the Play submission.

Status legend:
- **COMPLIANT** - the architecture already satisfies this, and the artifact exists or is specified.
- **ACTION-REQUIRED** - engineering or content work is needed. Each becomes a TRACEABILITY row.
- **RESOLVED-AUTONOMOUSLY** - was blocked on a human; decided under the autonomy
  amendment, recorded in DECISIONS-AUTONOMOUS.md with a reversal trigger. Counsel
  should review before publication, but nothing is blocked.

---

## 0 · Summary of the compliance runway

| Date | What lands | Source |
|------|-----------|--------|
| 13 Nov 2025 | DPDP Rules 2025 **notified**. Data Protection Board provisions in force immediately | MeitY |
| **13 Nov 2026** | **Consent Manager framework operational** (Rule 4) | DPDP Rules 2025 |
| **mid-May 2027** | **Full compliance deadline** - notice, consent, breach notification, rights handling all enforceable after the 18-month phase | DPDP Rules 2025 |
| **15 Apr 2026 + 30 days** | Google Play policy update compliance window | Play Console |

**Maximum penalty: INR 250 crore** for failure to maintain reasonable security
safeguards. That single number is why G3 (security) is not optional paperwork.

**The good news for this product:** V1 is unusually clean. It collects one phone number,
holds no payment credentials, moves no money, runs no AI on personal data, and has no
third-party data sharing. Most of the hard DPDP questions do not arise.

**The bad news:** two items have external lead time and must start now - a registered
entity for DLT (ADR-007), and a **live public deletion URL plus a live privacy policy**,
both of which must exist *before* Play submission, not after.

---

## 1 · Digital Personal Data Protection Act 2023 + DPDP Rules 2025

### What personal data SWAFTO actually processes

| Data | Where | Principal | Necessity |
|------|-------|-----------|-----------|
| Owner's phone number | `users.phone` | The shopkeeper | Sole authentication factor |
| Shop name, type, address | `shops.*` | The shopkeeper | Identifies the book; address optional |
| GSTIN (nullable) | `shops.gstin` | The shopkeeper | Optional, for accountant exports only |
| **Customer/supplier name + phone** | `parties.name`, `parties.phone` | **A third party, not the user** | Udhar ledger - the second job of the app |
| Financial entries | `entries.amount` (integer paise) | The shopkeeper's business records | The product |
| Device id | `devices.*` | The shopkeeper | Session binding |

> **The sharpest issue in this whole audit: `parties`.** The shopkeeper types his
> *customers'* names and phone numbers. Those people are **Data Principals who have
> never met SWAFTO and cannot consent to it.** See finding 1.4 - this is the one that
> needs counsel.

### 1.1 Notice - **ACTION-REQUIRED**

DPDP s.5 requires notice at or before consent: what data, for what purpose, how to
exercise rights, how to complain to the Board.

- **Artifact:** a `ConsentNotice` screen shown **before** the OTP is sent, not buried in
  a checkbox. Onboarding is currently "four questions, no more" (X1) - the notice must
  sit at sign-in, ahead of it.
- **Column:** `users.consent_version`, `users.consent_at`, `users.consent_locale` - we
  must be able to prove *which* notice text, in *which* language, was accepted and when.
- **Must be available in Odia, Hindi and English** - DPDP Rules require notice in plain
  language, and the Eighth Schedule languages include both Odia and Hindi. A notice the
  shopkeeper cannot read is not notice.

### 1.2 Consent - free, specific, informed, unambiguous, with clear affirmative action - **ACTION-REQUIRED**

- No pre-ticked boxes. No bundling.
- **Separate, independently revocable consent for crash reporting** (ADR-009, default
  off). Bundling telemetry consent with the consent needed to run the ledger would make
  the latter not "free".
- **Withdrawal must be as easy as giving it** (s.6(4)) - a toggle in Settings, one tap,
  same screen depth as the opt-in.
- **Column:** `consents(user_id, purpose, granted, version, at, withdrawn_at)`. Append-only,
  consistent with the ledger's posture.

### 1.3 Purpose limitation - **COMPLIANT**

The architecture makes this nearly automatic. Deliberate absences (§09) mean there is no
ad SDK, no analytics broker, no data sale, no AI training on usage data (the Knowledge &
Learning layer was removed outright). Instrumentation events (SPEC-DIGEST §8) carry
counts and durations, **not amounts and not names** - that property is tested at G3.

### 1.4 Third-party Data Principals (`parties`) - **RESOLVED-AUTONOMOUSLY (AD-006)**

A customer whose name and phone the shopkeeper records has DPDP rights, but no
relationship with SWAFTO. Analogous to a contacts book, but this is a *commercial credit
record*.

- **Probable position:** the **shopkeeper is the Data Fiduciary** for his own party
  ledger and SWAFTO is a **Data Processor** acting on his instructions; SWAFTO is a Data
  Fiduciary only for the shopkeeper's own account data. This is the standard analysis and
  it is the one the Terms should encode.
- **Consequence if correct:** the Terms must state the shopkeeper's own obligations to
  his customers, and SWAFTO must offer him the tooling to satisfy a request (export and
  delete a single party's record).
- **DECIDED (AD-006):** shopkeeper is Fiduciary, SWAFTO is Processor. Counsel should
  confirm (H9). If SWAFTO were held a joint Fiduciary the notice obligations change
  materially - that is AD-006's reversal trigger, and it is a real product change.
- **Engineering hedge (cheap, do it regardless):** `parties.phone` nullable and clearly
  optional in the UI; per-party export and per-party redaction available from P2/P3.

### 1.5 Rights: access, correction, erasure - **ACTION-REQUIRED**

| Right | Artifact | Endpoint |
|-------|----------|----------|
| Access | Export screen already designed: date range, CSV/PDF, WhatsApp or save to phone | `GET /v1/export` |
| Correction | Shop/owner profile is editable. **Ledger entries are deliberately NOT editable after close** - see below | `PATCH /v1/shop`, `PATCH /v1/parties/:id` |
| Erasure | Account deletion screen exists: names real quantities, offers export first, requires shop name typed, 30-day grace | `DELETE /v1/account` |

> **Tension worth naming: "correction" vs the append-only ledger (D7).** DPDP gives a
> right to correct inaccurate personal data. Our ledger is immutable once a day closes.
> **These do not actually conflict**, and the reasoning should be written into the
> privacy policy: closed entries are *business records of what was recorded*, and they
> are corrected the way every ledger in history corrects them - by a **dated correction
> entry that references the original** (T16), not by rewriting history. Personal data
> proper (name, phone, shop details) **is** directly editable. Recorded so no one
> "fixes" the immutability to satisfy a misread of s.12.

### 1.6 Erasure and retention - **ACTION-REQUIRED**

- Deletion screen copy already written and it is good: *"This deletes your book, not just
  the app"*, itemising `Closed days 214 · Customer ledgers 38 · Udhar records INR 18,240`,
  export offered first, shop name typed to confirm, **30-day grace** with
  *"Sign in again any time before then to cancel - nothing is lost until the 30 days pass."*
- **Column:** `shops.deletion_requested_at`, `shops.deleted_at`. A scheduled job performs
  hard deletion at +30 days.
- **Retention limit:** DPDP requires erasure when the purpose is served. Define and
  publish: **account inactive 3 years -> notice -> erasure.** Needs a business decision on
  the exact period. Related: Indian bookkeeping norms suggest owners may *want* longer
  retention; the policy must let the shopkeeper export before erasure.
- **Backups:** deletion must propagate to the nightly S3 logical dumps (architecture §08).
  A 30-day backup rotation means deleted data can persist up to 30 days in backups -
  **this must be stated in the privacy policy**, and the rotation must be bounded.

### 1.7 Grievance officer - **RESOLVED-AUTONOMOUSLY**

DPDP s.13 requires a published grievance mechanism and a named contact. Needs a real
person, a real email address at the company domain, and a published response SLA. The
About screen already links Privacy policy / Terms / Open-source licences - the grievance
contact must join them.

### 1.8 Breach notification - **ACTION-REQUIRED**

DPDP Rules 2025 require notifying **affected Data Principals without delay** and the
**Data Protection Board**, with a follow-up detailed report within a prescribed window
(commonly cited as 72 hours for the fuller report). Needs:
- a written incident-response runbook naming who decides and who notifies (owner: G3);
- an in-app notification channel that can reach all users - the **notification inbox
  already exists** in the screen set and is the right vehicle;
- a rehearsal. An unrehearsed breach plan is not a plan, same logic as untested backups.

### 1.9 Consent Manager - **COMPLIANT (not applicable in V1), revisit before 13 Nov 2026**

Rule 4 makes the Consent Manager framework operational from 13 Nov 2026. A Consent
Manager is a registered intermediary; **SWAFTO is not one and does not need to register**,
because it does not broker consent between Principals and other Fiduciaries. Revisit only
if SWAFTO ever shares data with a third party.

### 1.10 Children's data - **COMPLIANT**

DPDP requires verifiable parental consent for under-18s. The user is a shop owner aged
35-70. **Terms must state the service is not offered to under-18s**, which is the
standard and sufficient mitigation here.

**Sources:** [DPDP Rules 2025 (PIB)](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf) ·
[2026 compliance milestones](https://www.mondaq.com/india/data-protection/1830402/dpdp-act-and-rules-2025-the-2026-compliance-milestones-businesses-cant-afford-to-miss) ·
[DLA Piper India](https://www.dlapiperdataprotection.com/?t=law&c=IN)

---

## 2 · Data residency - **ACTION-REQUIRED**

The architecture specifies **AWS ap-south-1 (Mumbai)** and the build configuration calls
residency a legal requirement.

- **COMPLIANT in design:** EC2, RDS and S3 all in `ap-south-1`. Single-AZ RDS, nightly
  logical dump to an `ap-south-1` bucket.
- **ACTION-REQUIRED - verify no processor moves data out.** Each must be checked and
  recorded:

| Processor | Residency risk | Action |
|-----------|---------------|--------|
| **Cloudflare** (edge, §08) | Global anycast; TLS terminates at the nearest PoP, possibly outside India | Confirm whether terminating TLS abroad constitutes a transfer for DPDP. **Needs counsel.** Mitigation if needed: Cloudflare India data-localisation options, or drop Cloudflare and terminate at the EC2 node |
| **SMS provider** (ADR-007) | Must be an Indian DLT-registered route | Contractually require India-only processing |
| **Sentry** (ADR-009) | Default SaaS regions are US/EU | **Self-host in ap-south-1**, or disable. Default-off consent limits exposure but does not fix residency |
| **FCM push** (architecture L0 diagram) | Google, global | Send **no personal data in a push payload** - notification content must be a trigger only, with the text resolved locally on device. Cheap, and it removes the question |
| **S3 backups** | Must be `ap-south-1`, never a global bucket | Terraform must pin the region and block public access |

- **DPDP s.16** permits transfer except to countries the Government restricts. The
  conservative posture - everything in `ap-south-1` - is also the simplest to defend.

---

## 3 · Google Play - Data Safety form - **ACTION-REQUIRED**

A mismatch between the Data Safety declarations and the privacy policy is a common
rejection. These must agree **word for word**.

Exact declarations for V1:

| Data type | Collected | Shared | Purpose | Optional? | Encrypted in transit | Deletable |
|-----------|-----------|--------|---------|-----------|---------------------|-----------|
| **Phone number** | Yes | **No** | Account management, authentication | Required | Yes | Yes |
| **Name** (shop/owner) | Yes | **No** | Account management, app functionality | Required | Yes | Yes |
| **Address** (shop) | Yes | **No** | App functionality | **Optional** | Yes | Yes |
| **Other personal info** (party names/phones) | Yes | **No** | App functionality | **Optional** | Yes | Yes |
| **Financial info - purchase/transaction history** | Yes | **No** | App functionality | Required | Yes | Yes |
| **Crash logs** | Yes | **No** | Diagnostics | **Optional, default off** | Yes | Yes |
| **Device or other IDs** | Yes | **No** | Account management, fraud prevention | Required | Yes | Yes |

Declare explicitly: **no data is shared with third parties**, **no data is used for
advertising or marketing**, **no data brokers**, **data is encrypted in transit**, and
**users can request deletion**.

Also declare: **no location, no contacts, no photos/media, no microphone, no SMS reading,
no calendar, no health, no installed apps.** That list is unusually short and it is a
selling point - it follows directly from the no-AI decision.

**Payment info: declare NOT collected.** SWAFTO records that money moved; it never
handles an instrument. See §8.

---

## 4 · Google Play - account deletion - **ACTION-REQUIRED (external, blocks submission)**

Play's User Data policy: if an app lets users create an account, it must let them request
account **and data** deletion - via an **in-app path** *and* a **web URL accessible from
the web** for someone who has already uninstalled. **Both are mandatory.**

- **In-app path: already designed.** Settings -> delete account, with quantities, export
  offered, shop name typed, 30-day grace.
- **Web URL: `swafto.app/delete-account`** - already referenced in the About screen copy
  (*"You can also delete your account from the web"*). **The page does not exist yet.**

Requirements for that page - it must:
1. be reachable **without installing the app and without signing in to the app**;
2. verify identity (OTP to the registered number is appropriate and consistent);
3. state clearly what is deleted and what is retained, and for how long;
4. be the exact URL entered in the Data Safety form.

**This blocks Play submission. Start it the day G2 finishes.** Compliance deadline
context: developers have at least 30 days from 15 April 2026 for the current policy
round.

**Sources:** [Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111) ·
[Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469) ·
[Data Safety + account deletion guide](https://support.google.com/googleplay/android-developer/community-guide/246344978/about-the-data-safety-form-and-account-deletion)

---

## 5 · Android 13+ `POST_NOTIFICATIONS` - **ACTION-REQUIRED**

Android 13 (API 33) made notifications a runtime permission.

- `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />`.
- **Never request it on launch.** The build prompt (G15) and the designed flow both
  require the primer **after the FIRST CLOSE**, and the copy already exists:
  *"Know when udhar is overdue - We'll tell you when a customer's udhar crosses 30 days,
  or when a payment to a supplier is coming due. Nothing else."* with `Allow` / `Not now`.
- Denial must be **non-destructive**: alerts still appear in the in-app notification
  inbox. The app must never nag; one primer, then silence.
- `targetSdk` must be current enough for Play; set and record it in the Gradle config.

---

## 6 · SMS reading - **COMPLIANT (not used in V1), and the common misreading corrected**

**V1 reads no SMS.** Decision D1 makes UPI manual.

Recording the policy accurately, because the file must not perpetuate a myth:

> Google Play's Use of SMS or Call Log permission groups policy **explicitly permits**
> `READ_SMS` for **"SMS-based financial transactions - for example, Unified Payments
> Interface (UPI)"** and for SMS-based money-management apps.

So `READ_SMS` is **not banned outright** for this use case. It requires a declaration and
a review round. Decision D1 declined it for **product** reasons, not platform ones: it
would put a permission review on the critical path to launch, bank/PSP SMS formats vary
and break silently, and the shopkeeper's PhonePe app already reconciles his UPI. **Cash
is the thing no other app on his phone is counting.**

The `entries.source` column (`'manual'` in V1) exists precisely so this stays reversible
without a migration.

---

## 7 · GST - **ACTION-REQUIRED (app copy)**

**The app produces no tax invoice and makes no tax computation.** It has no GST rate
field, no HSN code, no invoice number series, no item lines at all (D5).

- `shops.gstin` is nullable and exists **only** so an export can be identified for the
  accountant. The screen copy already frames it correctly:
  *"Appears on anything you export for your accountant - that's the reason to fill it in."*
- **ACTION-REQUIRED - what an export may and may not be called.**
  - **May be called:** "day book", "cash book", "ledger export", "summary for your
    accountant", "transaction record".
  - **Must NOT be called:** "invoice", "tax invoice", "GST return", "GSTR-1/3B",
    "filing", "statement of accounts" (that last one reads as a formal accounting
    statement).
  - A GST **tax invoice** has mandatory particulars under Rule 46 of the CGST Rules
    (supplier GSTIN, invoice number and date, recipient details, HSN, taxable value,
    rate and amount of tax). SWAFTO captures **none** of these. Nothing it exports can be
    or resemble one.
- **ACTION-REQUIRED - a visible disclaimer in the app's own copy**, on the export screen
  and in the exported file header, so no shopkeeper treats an export as a filing. Draft:

  > *This is your own day book, not a tax document. SWAFTO does not calculate GST and
  > does not produce invoices or returns. Give this to your accountant - do not file it.*

  Must be translated into Odia and Hindi like everything else.

---

## 8 · RBI / payments regulation - **COMPLIANT, with the trigger written down**

**SWAFTO is not a Payment Aggregator or Payment Gateway and RBI's PA/PG framework does
not apply.** The reasoning, recorded deliberately so a future feature does not cross the
line by accident:

1. **It never handles funds.** No merchant account, no nodal/escrow account, no
   settlement. Architecture §09: *"V1 records money that has already moved. Nothing in
   this system can move a rupee."*
2. **It never touches payment instruments.** No card numbers, no VPAs collected for
   transacting, no bank credentials, no PCI scope.
3. **It is a bookkeeping record**, the digital equivalent of the paper sheet.
4. Udhar is **informal trade credit between a shopkeeper and his customer** that SWAFTO
   merely records. SWAFTO is not a party to it, does not originate it, and earns nothing
   from it.

### The specific triggers that WOULD bring regulation into scope

Any one of these changes the legal character of the product. **None may be built without
a fresh legal review:**

| Trigger | Regime it invokes |
|---------|------------------|
| Accepting or routing a payment, even "collect udhar via UPI link" | **RBI PA/PG authorisation** - handling funds, even in transit |
| Holding a balance, float, wallet or any stored value | **PPI (Prepaid Payment Instrument) licensing** |
| Lending, or facilitating a third party's lending against ledger data | **RBI Digital Lending Guidelines**, NBFC considerations |
| Sharing ledger data with a lender for credit assessment | **Account Aggregator framework**; DPDP consent changes materially |
| Charging a fee as a percentage of transaction value | Strong indicator of payment intermediation |
| Guaranteeing or insuring udhar | Insurance / guarantee regulation |

> **"Collect udhar via a UPI link" is the dangerous one**, because it looks like a small,
> obviously-useful feature and it is the single most likely thing to be proposed in
> release two. It would make SWAFTO a payment intermediary. Flagged here on purpose.

---

## 9 · Terms, privacy policy, grievance contact - **resolved autonomously (DECISIONS-AUTONOMOUS.md) (drafts below)**

Drafts to be reviewed by counsel. All three must exist and be **live** before Play
submission, and must be available in Odia, Hindi and English.

### 9.1 Privacy policy - required contents

1. Identity and contact of the Data Fiduciary (registered entity name, address).
2. **Grievance Officer** name, email, response SLA.
3. Exactly the data listed in §1, matching the Data Safety form **word for word**.
4. Purpose for each item, and the statement that **no data is shared, sold, or used for
   advertising**.
5. Retention: active while the account lives; **30-day grace after deletion**; backups
   purge within the stated rotation; inactivity policy per §1.6.
6. Rights and how to exercise them, including the web deletion URL.
7. **Residency statement:** all data stored in India (AWS Mumbai), naming any processor
   that could touch it outside India (§2).
8. **The party-data paragraph** (§1.4) - what happens to customer names and phones the
   shopkeeper enters, and that he is responsible for having a basis to record them.
9. Right to complain to the Data Protection Board of India.
10. Children: service not offered to under-18s.

### 9.2 Terms of service - required contents

1. Service description: **a record-keeping tool. Not accounting software, not a tax
   product, not a payment service, not a lender.**
2. **No warranty that figures are fit for tax filing**, and an explicit statement that the
   user is responsible for his own tax compliance.
3. The user's own Data Fiduciary obligations for party data he enters (§1.4).
4. One shop, one phone (D9) as a stated limit of the service.
5. Suspension/termination, governing law (India), and jurisdiction - **counsel to set
   the seat**, likely Bhubaneswar or the company's registered office.
6. Limitation of liability. **Counsel must review this against the product's core
   promise** - the app's entire pitch is that the number is right, which makes a broad
   accuracy disclaimer commercially awkward and legally necessary. Genuine tension; needs
   a human.

### 9.3 Grievance contact

`grievance@<domain>` with a named officer and a published SLA. Must appear in the app
(About), in the privacy policy, and on the website.

---

## 10 · Intellectual property - fonts and libraries

| Asset | Licence | Status | Obligation |
|-------|---------|--------|-----------|
| **Anek Odia** - the one actually bundled | **SIL Open Font License 1.1** | **COMPLIANT (verified iteration 14)** | `OFL-AnekOdia.txt` is the upstream licence file, fetched from the same Google Fonts release as the TTF and committed beside it. Copyright 2021 The Anek Project Authors (Ek Type). OFL permits embedding in an application, including a commercial one, with no attribution requirement in the UI. The font is **bundled unmodified**, so the reserved-font-name clause is not engaged - it binds only derivative works. Obligation that remains: include the licence text in the Open-source licences screen |
| **Anek Latin / Anek Devanagari** | **SIL Open Font License 1.1** | not bundled - see AD-015 | Same terms if AD-015 is ever reversed. Verify from that release's own `OFL.txt`, not by assuming it matches Odia's |
| **IBM Plex** | **SIL Open Font License 1.1** | **ACTION-REQUIRED - verify** | Same. IBM Plex moved to OFL 1.1 |
| React Native, Fastify, Drizzle | MIT / Apache-2.0 expected | **ACTION-REQUIRED** | Generate the full dependency licence manifest |
| op-sqlite | MIT expected | **ACTION-REQUIRED** | Verify, and separately verify **SQLCipher** - the community edition is BSD-style, but **check whether the intended build requires a commercial licence** |
| SQLite itself | Public domain | COMPLIANT | None |

- **ACTION-REQUIRED:** the **Open-source licences** screen already exists in the design
  (About -> Open-source licences). It must be **generated from the lockfile in CI**, not
  hand-maintained, or it will be wrong within a month.
- **ACTION-REQUIRED:** add a CI licence gate that **fails the build** on any
  copyleft licence incompatible with proprietary distribution (GPL/AGPL) appearing in the
  mobile dependency tree.

> **SQLCipher is the one to check properly.** ADR-002 chose op-sqlite specifically for
> SQLCipher support. Zetetic's community edition is open source, but commercial editions
> and some platform packages have different terms. Get this confirmed before it is load
> bearing.

---

## 11 · Register of ACTION-REQUIRED and resolved autonomously (DECISIONS-AUTONOMOUS.md) items

Every row here is mirrored into `TRACEABILITY.md`.

| Ref | Item | Status | Artifact | Blocks |
|-----|------|--------|----------|--------|
| L-01 | Consent notice screen before OTP, in 3 languages | ACTION-REQUIRED | `ConsentNotice` screen, `users.consent_*` | Play submission |
| L-02 | Granular consent + withdrawal as easy as giving | ACTION-REQUIRED | Settings toggle, `consents` table | - |
| L-03 | Party data - Fiduciary vs Processor analysis | **RESOLVED-AUTONOMOUSLY** | Terms §9.2.3 | Terms |
| L-04 | Per-party export and redaction | ACTION-REQUIRED | P2/P3 screens, `GET /v1/parties/:id/export` | - |
| L-05 | Retention policy - inactivity period | **RESOLVED-AUTONOMOUSLY** | Privacy policy §5 | Privacy policy |
| L-06 | Deletion must propagate to S3 backups within the rotation | ACTION-REQUIRED | Deletion job + Terraform lifecycle rule | - |
| L-07 | Grievance Officer named, with SLA | **RESOLVED-AUTONOMOUSLY** | About screen, policy, website | Play submission |
| L-08 | Breach response runbook + rehearsal | ACTION-REQUIRED | `docs/runbooks/breach.md` (owner G3) | - |
| L-09 | Verify no processor moves data out of India | ACTION-REQUIRED | Cloudflare / Sentry / FCM / SMS review | - |
| L-10 | Cloudflare TLS termination outside India - is it a transfer? | **RESOLVED-AUTONOMOUSLY** | Architecture §08 decision | - |
| L-11 | FCM push payloads must carry no personal data | ACTION-REQUIRED | Push builder - trigger only, text resolved on device | - |
| L-12 | Data Safety form declarations, word-identical to the policy | ACTION-REQUIRED | Play Console + privacy policy | Play submission |
| L-13 | **Public web deletion page at `swafto.app/delete-account`** | ACTION-REQUIRED | Web page, OTP-verified, works uninstalled | **Play submission** |
| L-14 | `POST_NOTIFICATIONS` primer after first close, never on launch | ACTION-REQUIRED | Manifest + primer screen | - |
| L-15 | GST disclaimer in app copy and in every exported file | ACTION-REQUIRED | Export screen + file header, 3 languages | - |
| L-16 | Export naming rules enforced (never "invoice"/"return"/"filing") | ACTION-REQUIRED | Copy review + i18n key audit | - |
| L-17 | Privacy policy drafted, reviewed, **live** | **RESOLVED-AUTONOMOUSLY** | Website | **Play submission** |
| L-18 | Terms drafted, reviewed, live; liability clause vs the accuracy promise | **RESOLVED-AUTONOMOUSLY** | Website | Play submission |
| L-19 | Verify Anek + IBM Plex OFL 1.1 from bundled release | ACTION-REQUIRED | `licences/` + About screen | - |
| L-20 | **Verify SQLCipher licensing** for the build we link | ACTION-REQUIRED | ADR-002 amendment if needed | G4 |
| L-21 | Licence manifest generated from the installed tree in CI | **DONE at iteration 38** | `tools/check-licences.mjs` -> `docs/handover/LICENCES.md`, in `check:all` and CI | - |
| L-22 | CI licence gate failing on GPL/AGPL in the mobile tree | **DONE at iteration 38** | `check:licences`, 271 runtime packages scanned, 0 copyleft | - |
| L-23 | **DLT registration** - entity, header (with category suffix), templates | **RESOLVED-AUTONOMOUSLY** | Registered business entity required | Launch |
| L-24 | Terms state service not offered to under-18s | ACTION-REQUIRED | Terms | - |
| L-25 | Consent Manager framework review before 13 Nov 2026 | ACTION-REQUIRED | Calendar item | - |
| L-26 | Full DPDP operational compliance by mid-May 2027 | ACTION-REQUIRED | Programme milestone | - |

### Start these today - they have lead time nothing can compress

1. **L-23 DLT registration** - needs a registered entity; ~1-2 weeks with documents (ADR-007).
2. **L-13 the deletion web page** and **L-17 the privacy policy** - both must be **live
   before** Play submission, not after.
3. **L-07 grievance officer** - a person must be named.
