# Compliance matrix: SWAFTO / Retail Desk

Agent 5 (Compliance / QA), independent review, 2026-10-25. Tree reviewed: `main` at
`79ff3d6` (includes `cacd461` "The day survives a restart").

**This document does not say the app is legally compliant.** It records which
requirement applies, why, and what the repository does about it, with file and line
evidence. A displayed privacy policy is not compliance. Where the law is unsettled the
row says so and takes the conservative reading (CLAUDE.md: never invent a fact about
Indian law).

Every source below was accessed on **2026-10-25**. How each was obtained:
- **Fetched directly:** the Google Play Help pages and the Android and W3C pages, fetched by a research
  sub-agent. Quotes from them were extracted by a fetch tool and are near-verbatim. They have not been
  re-checked character by character.
- **Downloaded and quoted exactly:** the Gazette PDFs and the DPDP Act PDF, downloaded with curl and
  text-extracted with pdftotext.
- **Secondary sources:** used only where an official URL failed, and each is marked.

Status words, as in `chat.md`: CONFIRMED · IMPLEMENTED · TESTED · REPORTED · UNRESOLVED.
"Not met" means the repository does not do it today. Class: **M** mandatory, **R**
recommended, **U** unresolved (needs counsel or an owner's decision).

---

## 0. What is actually in force on 2026-10-25 (verified, not assumed)

| Instrument | In force now | From 13 Nov 2026 | From 13 May 2027 |
|---|---|---|---|
| DPDP Act 2023 (commencement notification G.S.R. 843(E), 13 Nov 2025) | s.1(2), s.2 (definitions), ss.18-26 (the Board), ss.35, 38-43, s.44(1),(3) | s.6(9) (Consent Managers), s.27(1)(d) | ss.3-5, s.6(1)-(8),(10), ss.7-17, s.27 (rest), ss.28-34, 36, 37, s.44(2) |
| DPDP Rules 2025 (G.S.R. 846(E), 13 Nov 2025), Rule 1(2)-(4) | Rules 1, 2, 17-21 | Rule 4 | Rules 3, 5-16, 22, 23 |

Verbatim, Rule 1: "(2) Rules 1, 2 and 17 to 21 shall come into force on the date of their
publication in the Official Gazette. (3) Rule 4 shall come into force one year after the
date of publication of this Gazette. (4) Rules 3, 5 to 16, 22 and 23 shall come into
force eighteen months after the date of publication of this Gazette."

**Consequence.** The substantive duties have no force today. That covers the notice
(s.5 / Rule 3), consent (s.6), security (s.8(5) / Rule 6), breach intimation (s.8(6) / Rule 7),
retention (Rule 8), the published contact (Rule 9), children (s.9 / Rule 10) and the rights
(ss.11-14 / Rule 14). All of them **commence on 13 May 2027**. CLAUDE.md §Law says "DPDP
Act 2023 and the 2025 Rules apply", and that is the project's chosen posture, not a statement
of what binds today. This matrix keeps the project's posture (build to them now) but marks
each row with its real commencement date so nobody tells a reviewer it is in force.

The research found no gazetted change to these dates. Two later instruments change wording only:
- the corrigendum G.S.R. 892(E), dated Dec 2025 (date from secondary sources; official PDF not opened);
- the DPDP (Removal of Difficulties) Order 2026, S.O. 5458(E) of 6 Oct 2026, which amends ss.9-10
  (secondary source: Mondaq). Neither moves a date.

Sources:
- Rules 2025: https://egazette.gov.in/WriteReadData/2025/267650.pdf
- Act commencement notification: https://egazette.gov.in/WriteReadData/2025/267647.pdf
- Act text: https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf

---

## 1. Google Play

| ID | Source (accessed 2026-10-25) | Requirement | Applies? (why) | Workflow / screen | Status in this repo (evidence) | Verification | Class |
|---|---|---|---|---|---|---|---|
| GP-1 | Target API level, support.google.com/googleplay/android-developer/answer/11926878 | "Starting August 31, 2026: New apps and app updates must target Android 16 (API level 36) or higher"; extension available "to November 1, 2026" | Yes, every submission | Build | **Met.** `apps/mobile/android/build.gradle:6` `targetSdkVersion = 36`, `:5` compileSdk 36, `:4` minSdk 24 | `grep targetSdkVersion apps/mobile/android/build.gradle` | M |
| GP-2 | User Data policy, answer/10144311 | Privacy-policy link in the Play Console field **and** "a privacy policy link or text within the app itself". The policy must state developer info and a privacy contact, "data retention and deletion policy", and secure handling | Yes | S5 About, S1 Settings | **Not met.** Policy text exists at `apps/web/legal/privacy.html` but is unhosted (H5). **No link or text in the app:** `apps/mobile/src/screens/S5.tsx` has version, licences and the not-a-tax-document line only. X0 shows the itemised notice, which is not the policy | Registry case or test asserting an S5 privacy row; load the hosted URL | M |
| GP-3 | User Data policy, answer/10144311 (prominent disclosure) | "You must provide an in-app disclosure of your data access, collection, use, and sharing" that "Cannot only be placed in a privacy policy or terms of service" | Yes, for the off-device sync of party names and phones | X0 consent | **Partly met.** `apps/mobile/src/screens/X0.tsx:142-178` shows purposes with switches before use. But X0 runs before sign-in and its decision is held in a ref nothing consumes (`apps/mobile/src/platform/Root.tsx:201-203`). Whether X0's text names the third-party sync explicitly was not checked line by line | Read X0 copy against the itemised notice in `apps/api/src/dpdp/routes.ts` | M |
| GP-4 | Account deletion, answer/13327111 | Apps that allow account creation must "provide users with an in-app path to delete their app accounts and associated data" **and** "a web link resource" | Yes: phone + OTP creates an account (`apps/api/src/auth/routes.ts`) | S1 → S7 → S8; `apps/web/delete-account/` | **Not met in-app.** S8 renders a confirm screen wired to nothing destructive: `apps/mobile/src/app/App.tsx:516-530` passes only `onCancel` and `onBack`, and the comment says so. `client.erase` (`apps/mobile/src/net/client.ts:487`) has no caller. **No path erases the local SQLite ledger**, which now persists (`Root.tsx:75`). The web page exists (`apps/web/delete-account/index.html`) but is unhosted (H5) | Device: S8 confirm → account erased server-side and local DB emptied; load the hosted URL | M |
| GP-5 | Data safety, answer/10787469 (fetched page was paraphrased by the tool, not quoted) | Declarations must be accurate. "Collect" means transmitting off the device. The form asks about encryption in transit and deletion | Yes: party names and phones sync to the API | Console (H7) | **At risk.** `docs/handover/DATA-SAFETY.md:21` answers encrypted in transit "Yes, TLS 1.3 only". No server exists, and the only endpoint is `http://192.168.1.35:8787` (`apps/mobile/src/platform/endpoint.ts:37`). The deletion answer presumes GP-4, which is not met | Once deployed: a TLS 1.2 handshake against the origin must fail; re-read the page verbatim before filling the form | M |
| GP-6 | Financial features declaration, answer/13849271 | "All developers that have an app published on Google Play must complete the Financial features declaration." "Even developers with apps that do not offer any financial features must complete this form." There is an option "My app doesn't provide any financial features" | Yes, every app | Console | **Not met, and not tracked.** `docs/handover/HUMAN-ACTIONS.md` has no row for it (rows H1-H14 checked) | Console screenshot | M |
| GP-7 | Financial Services policy, answer/9876821 | Scope: "financial products and services to be those related to the management or investment of money and cryptocurrencies" | **Probably not**, conservatively flagged. The app moves no money, originates no loan and charges no fee, so udhar is the shopkeeper's own credit being recorded. But "management … of money" is broad, and the declaration's category list includes "Other" | Udhar sections | Nothing to build. The conservative course is to answer GP-6 "no financial features", keep a written explanation of udhar ready for review, and record the judgement with the owner | Owner decision, recorded | U |
| GP-8 | User Data policy (minimisation), answer/10144311 | Request only needed permissions | Yes | Manifest | **Met.** `apps/mobile/android/app/src/main/AndroidManifest.xml:3` declares only `INTERNET`. No SMS, contacts, location, camera or notification permission | `cat AndroidManifest.xml` | M |
| GP-9 | Play policy pages above | Data about people other than the user | The policy pages state no special rule for third-party contact data, beyond not disclosing non-public contacts. Nothing is published or disclosed | Parties | No extra Play obligation found. Do not invent one | n/a | R |

**Apple App Store: not applicable today.** There is no `apps/mobile/ios` directory (checked).
Nothing is built for iOS, so no Apple row is assessed. The prior report's prospective Apple
analysis stays a lead for the day iOS is built.

---

## 2. India: DPDP Act 2023 and DPDP Rules 2025

| ID | Source (accessed 2026-10-25) | Requirement | Applies? (why) / commencement | Workflow / screen | Status in this repo (evidence) | Verification | Class |
|---|---|---|---|---|---|---|---|
| IN-1 | Act s.3, s.2 | Digital personal data processed in India. The s.3(c)(i) exemption covers only "personal or domestic purpose" | Yes. A shop ledger is commercial, so the exemption does not reach the shopkeeper either. **s.3 commences 13 May 2027** | All | n/a | n/a | M (from 13 May 2027) |
| IN-2 | Rules, Rule 3; Act s.5 | Itemised notice; purposes; the communication link to withdraw consent, exercise rights and complain to the Board; clear and plain language. English or an Eighth Schedule language at the principal's option is Act s.5(3) | Yes. **13 May 2027** | X0 | **Partly met.** `apps/api/src/dpdp/routes.ts` `NOTICE` itemises the data; X0 renders the purposes. Rule 3's communication links are not in the notice payload (prior report; not re-grepped by this review) | Test that `NOTICE` carries a resolvable link for each Rule 3 item | M (from 13 May 2027) |
| IN-3 | Act s.6(1) | Consent free, specific, informed, unambiguous; limited to what is necessary | Yes. **13 May 2027** | X0 | **Mis-scoped purpose.** The optional `sms_reminders` purpose reads "to send your sign-in code and any reminders you ask for" (`apps/api/src/dpdp/routes.ts:83-86`). The sign-in code is sent unconditionally (`apps/api/src/auth/routes.ts:143-145`) and must be, since OTP is the only factor | Test: withdraw `sms_reminders`, request an OTP; it still sends and the notice no longer calls that send optional | M (from 13 May 2027) |
| IN-4 | Act s.6(4) | Withdrawal "comparable to the ease with which such consent was given" | Yes. **13 May 2027** | X0 manage mode via S1 → S4 | **Not met in practice.** The same screen and the same call exist (`client.setConsent`). But `Root.tsx` never passes `onOpenPrivacy`, so `App.tsx:109` defaults it to a no-op, and both the Today privacy link and S4's "review consent" (`App.tsx:496`) do nothing (F-8). A toggle sent while unauthenticated fails silently (`Root.tsx` `onConsentChange` `.catch(() => undefined)`), so the switch can show a state the server never recorded | Device: S1 → S4 → withdraw → `GET /v1/me/consents` shows `current[purpose] === false` | M (from 13 May 2027) |
| IN-5 | Act s.8(5); Rule 6(1)(a)-(g) | Reasonable security safeguards. Rule 6 enumerates encryption or masking, access control, logs and monitoring, backups, one-year log retention, processor flow-down | Yes. **13 May 2027** | API, device | **Not met.** No personal-data access log: the logger level is `process.env.LOG_LEVEL ?? 'warn'` (`apps/api/src/app.ts:124`). No backups exist. The device ledger is plaintext SQLite (see SEC-4) | Test that an authenticated read emits one id-only access line | M (from 13 May 2027) |
| IN-6 | Rule 7(1), (2) | Principals: "without delay, through her user account or any mode of communication registered by her". Board: "(a) without delay, a description…" then "(b) within seventy-two hours of becoming aware" a detailed report | Yes. **13 May 2027** | Ops | **Partly met.** The runbook exists (`docs/runbooks/breach.md`), unrehearsed. No channel reaches every principal: there is no inbox and no push, SMS is a stub, and no breach SMS template is drafted. The 72-hour clock is the Board's second report only; the principal's notice has no such grace | Rehearsal; a breach template in `apps/api/src/sms/templates.ts` passing `check:sms` | M (from 13 May 2027) |
| IN-7 | Rule 8(3) + Seventh Schedule | "retain … such personal data, associated traffic data and other logs of the processing for a minimum period of one year from the date of such processing, for the purposes as specified in the Seventh Schedule". The illustration keeps data "even if X deletes her account" | **Unresolved.** The Seventh Schedule's purposes are State-facing, and whether they qualify or merely explain the duty needs counsel (H9). **13 May 2027** | Deletion, purge | **Conflict.** `DELETION_GRACE_DAYS = 30` (`packages/values/src/index.ts:94`). `apps/web/legal/privacy.html:141` promises erasure "within 90 days of a deletion request". Conservative reading: from 13 May 2027 keep a minimum set (entries plus processing logs) for one year while erasing identifiers, and say so in the policy before publishing it | Counsel; then a test on the purge policy chosen | U |
| IN-8 | Rule 8(1)-(2), Third Schedule | Three-year inactivity erasure with 48-hour warning | **No.** The Third Schedule covers large e-commerce, gaming and social-media intermediaries only | Policy | The "24 months of inactivity" in `privacy.html:141` is a voluntary promise, binding once published | n/a | R |
| IN-9 | Act s.8(9)-(10); Rule 9; Rule 14(3) | Publish the business contact of a person able to answer, and repeat it in every rights response. Grievance response period not over ninety days | Yes. **13 May 2027** | S6 Help | **Not met.** S6 renders a pending block because no officer is named (`apps/mobile/src/screens/S6.tsx:96-103`; H6). The notice names a role and `grievance@swafto.com` with `responseDays: 30` (`apps/api/src/dpdp/routes.ts:64-66`) | Test that every rights-route response body carries the contact | M (from 13 May 2027) |
| IN-10 | Act s.11; s.12 | Access (summary, processing, recipients); correction; erasure | Yes. **13 May 2027** | API `/v1/me/export`, `/v1/me/erase` | **Server implemented, client unreachable.** Routes exist (`apps/api/src/dpdp/routes.ts:228`). The app has no sign-in screen (F-17), so no authenticated call can succeed. The prior report notes that the export omits the recipients list and `section_skips` (not re-verified here) | Schema-walk test that every tenant table is exported | M (from 13 May 2027) |
| IN-11 | Act s.9; Rule 10 | Verifiable parental consent for children | **Not in practice.** The users are shop owners. `apps/web/legal/terms.html:166-168` states the service is not offered to under-18s | Terms | **Met as a mitigation.** Do not build age verification | `apps/web/test/legal.spec.ts` | R |
| IN-12 | Act s.2(i), s.2(k), s.8(1), s.8(2) | Fiduciary: "alone or in conjunction with other persons determines the purpose and means". Processor: "processes personal data on behalf of a Data Fiduciary". The Fiduciary is responsible "irrespective of any agreement to the contrary". A processor may be engaged "only under a valid contract" | Yes, for customer and supplier names and phones. **13 May 2027** | Parties | **Unresolved**; see §3 | Counsel (H9) | U |
| IN-13 | Rule 15; Rule 13(4) | Cross-border transfer may be restricted by notification. Localisation (Rule 13(4)) binds Significant Data Fiduciaries only | Not a localisation duty for this app | Hosting | ap-south-1 is a product choice, not a legal requirement. Keep it, but do not describe it as mandated | n/a | R |
| IN-14 | Rule 4; Act s.6(9) | Consent Manager registration | No: Rule 4 is permissive ("may apply"). From 13 Nov 2026 | n/a | n/a | n/a | R |

## 3. Fiduciary or Processor for the shopkeeper's customers' data: unresolved

**Reading A (the project's).** The shopkeeper decides to record a customer, so he is the
Fiduciary. SWAFTO stores on his instruction and is a Processor (s.2(k)).

**Reading B.** SWAFTO is also a Fiduciary. Its case:
- s.2(i) says "alone or **in conjunction with** other persons".
- SWAFTO alone decides the means: the schema, the sync to its own servers, retention and purge timing.
- s.8(1) makes a label in the Terms ineffective "irrespective of any agreement to the contrary".
- s.8(2) requires a "valid contract" for a processor. `apps/web/legal/terms.html` asserts the label
  without the substance of a processing agreement (scope, instructions, sub-processing,
  deletion on instruction).

**Conservative reading taken here: treat SWAFTO as a Fiduciary, alongside the shopkeeper, for party
data.** The cost is small:
- party data is minimised (`parties.phone` is nullable);
- it is not shared;
- it is held in one region;
- per-party export and redaction routes exist (`GET /v1/parties/:id/export`,
  `POST /v1/parties/:id/redact` in `apps/mobile/src/net/client.ts`).

The one duty this adds, notice to a customer SWAFTO has no channel to, is impracticable. The policy
should say so plainly instead of asserting the Processor label. Owner: counsel (H9).

## 4. RBI and payments

| ID | Source (accessed 2026-10-25) | Requirement | Applies? | Status | Class |
|---|---|---|---|---|---|
| RB-1 | PSS Act 2007 s.2(1)(i), s.4(1), via RBI FAQ https://www.rbi.org.in/scripts/FAQView.aspx?Id=73 (indiacode returned 403/504, so this is a secondary source) | A payment system "enables payment to be effected between a payer and a beneficiary". Operating one needs RBI authorisation | **No.** The app records payments made elsewhere and effects none | No money moves in the code: there is no payment SDK, and `AndroidManifest.xml` holds INTERNET only | R |
| RB-2 | RBI (Digital Lending) Directions 2025, https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12848 (fetched; not checked against the 28 Nov 2025 consolidation) | Apply to banks, cooperative banks, NBFCs and AIFIs, and to their lending service providers | **No.** SWAFTO is neither a regulated entity nor an agent of one; udhar is recorded, not lent | n/a | R |
| RB-3 | Standing trigger | Routing udhar collection through a UPI link would engage PSS Act s.4 | Not today | Keep as an architectural constraint | R |

## 5. Android platform

| ID | Source (accessed 2026-10-25) | Requirement | Status (evidence) | Class |
|---|---|---|---|---|
| AN-1 | developer.android.com/about/versions/12/behavior-changes-12 and /guide/topics/data/autobackup | "On devices from some device manufacturers, specifying android:allowBackup="false" does disable backups to Google Drive, but doesn't disable D2D transfers." With no `<device-transfer>` rules, that mode "is fully enabled" | **Gap.** `AndroidManifest.xml:10` sets `allowBackup="false"`; there is no `android:dataExtractionRules` and no `res/xml` directory. The plaintext ledger, including third-party PII, can travel by device-to-device transfer on some OEMs. This needs a decision, because D2D is today also the only way a book survives a phone change (sync cannot authenticate, F-17) | R (security) |
| AN-2 | RN Gradle plugin `AgpConfiguratorUtils.kt:40-46` (read in the installed package) | Cleartext refused in release | **Met for release.** The placeholder is `"false"` for release and `"true"` for debug. There is no `networkSecurityConfig` and no pinning | R |

## 6. Mandatory items not met (summary)

1. GP-2: no privacy-policy link or text in the app, and the policy is not hosted (H5).
2. GP-4: in-app account deletion is not wired (S8 does nothing destructive) and the local ledger cannot be erased. The web page is unhosted.
3. GP-6: the Financial features declaration is untracked and not done.
4. GP-5: the Data safety answers overstate encryption in transit and presume deletion that does not work.
5. Functional review: the app cannot sign in (F-17), the SMS adapter is a stub (H1) and the endpoint is a LAN address. A reviewer cannot use the product.
6. From 13 May 2027 (DPDP): IN-3, IN-4, IN-5, IN-6, IN-9, IN-10, and IN-7 once counsel rules.

The defect-level detail, with owners, is in `docs/handover/DEFECTS.md`. The security
review and the accessibility checklist are in `docs/compliance/SECURITY-A11Y-REVIEW.md`.

## Sources (all accessed 2026-10-25)

- https://support.google.com/googleplay/android-developer/answer/11926878 (target API level)
- https://support.google.com/googleplay/android-developer/answer/13327111 (account deletion)
- https://support.google.com/googleplay/android-developer/answer/10144311 (User Data policy)
- https://support.google.com/googleplay/android-developer/answer/10787469 (Data safety; paraphrased by the fetch tool)
- https://support.google.com/googleplay/android-developer/answer/13849271 (Financial features declaration)
- https://support.google.com/googleplay/android-developer/answer/9876821 (Financial Services policy)
- https://egazette.gov.in/WriteReadData/2025/267650.pdf (DPDP Rules 2025, G.S.R. 846(E); the TLS certificate failed, so it was fetched with curl -k)
- https://egazette.gov.in/WriteReadData/2025/267647.pdf (Act commencement, G.S.R. 843(E))
- https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf (DPDP Act 2023)
- https://www.rbi.org.in/scripts/FAQView.aspx?Id=73 (PSS Act, RBI FAQ; secondary)
- https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12848 (Digital Lending Directions 2025)
- https://developer.android.com/about/versions/12/behavior-changes-12 and https://developer.android.com/guide/topics/data/autobackup
- https://www.w3.org/TR/WCAG22/ and https://developer.android.com/guide/topics/ui/accessibility/apps
- Secondary, for post-publication instruments only: Mondaq, consentos.in, dpdprules.org
