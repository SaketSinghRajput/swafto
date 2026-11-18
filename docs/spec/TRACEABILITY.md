# TRACEABILITY

One row per feature-map ID. Five columns. `npm run check:traceability` fails on any
empty cell except the ONE reservation, BI5, which D5 makes unbuildable.

BI6 was listed here as a second reservation until iteration 20. It is not reserved -
it was DECIDED (AD-001), implemented, and covered by five vectors. Its row reads WIP
because two of its four artifacts do not exist yet: `GET /v1/reports` and the R1/R2
screens. That is the correct status, and the checker now reports exactly which
columns are holding a row back.

Status legend: `TODO` not started · `WIP` in progress · `DONE` all five cells real and verified.

## Inputs

| ID | Engine function | Test | API surface | Screen | Status |
|----|-----------------|------|-------------|--------|--------|
| IN1 | `parseSalesEntry` (sections 01/02/03) | `vectors.json:canonical-15-july`, `input.spec.ts:IN1 sales` | `POST /v1/sync/push` section=`cash_sales`\|`upi_sales`\|`udhar_sales` | T7 Form A, T8 Form B | DONE |
| IN2 | `parsePurchaseEntry` | `input.spec.ts:IN2 purchase` | `POST /v1/sync/push` section=`purchase` | T9 Form C | DONE |
| IN3 | `parseExpenseEntry` | `input.spec.ts:IN3 expense` | `POST /v1/sync/push` section=`expense` | T9 Form C | DONE |
| IN4 | `parseCollectionEntry` | `input.spec.ts:IN4 collection` | `POST /v1/sync/push` section=`udhar_collection` | T8 Form B | DONE |
| IN5 | `parsePartyPaymentEntry` | `input.spec.ts:IN5 payment` | `POST /v1/sync/push` section=`party_payment` | T8 Form B | DONE |
| IN6 | `parseWithdrawalEntry` | `input.spec.ts:IN6 withdrawal` | `POST /v1/sync/push` section=`withdrawal` | T10 Form D | DONE |
| IN7 | `captureCountedCash` | `input.spec.ts:IN7 counted cash` | `POST /v1/days/:date/close` | T11 Cash check counting | DONE |

## Primary outputs — never gated

| ID | Engine function | Test | API surface | Screen | Status |
|----|-----------------|------|-------------|--------|--------|
| P1 | `totalCashReceived` | `vectors.json:canonical-15-july` (=918000p) | `GET /v1/days/:date/summary` | T1 Today, T11 working | DONE |
| P2 | `totalCashPaid` | `vectors.json:canonical-15-july` (=438000p) | `GET /v1/days/:date/summary` | T1 Today, T11 working | DONE |
| P3 | `expectedCashBalance` | `vectors.json:canonical-15-july` (=630000p) | `GET /v1/days/:date/summary` | T11 Cash check, as its working; T5 day close list, as its headline; T6 opening cash, T2 Today first run and X1 Onboarding, each of which sets its opening term; T3 Today closed, as its headline; C1 Ask, as the free "expected cash" answer | DONE |
| P4 | `netSales` | `vectors.json:canonical-15-july` (=1145000p) | `GET /v1/days/:date/summary` | T1 Today, T3 Today closed, T14 summary, R1 Reports, C1 Ask (today free; a period on Premium) | DONE |
| P5 | `netPurchase` | `vectors.json:canonical-15-july` (=320000p) | `GET /v1/days/:date/summary` | T14 summary | DONE |
| P6 | `totalExpenses` | `vectors.json:canonical-15-july` (=118000p) | `GET /v1/days/:date/summary` | T14 summary, R1 Reports | DONE |
| P7 | `creditOutstanding` | `vectors.json:p7-credit-outstanding` | `GET /v1/parties/outstanding` | T1 Today, P1 Parties, P2 Customer, R1 Reports, C1 Ask | TODO |
| P8 | `supplierOutstanding` | `vectors.json:p8-supplier-outstanding` | `GET /v1/parties/outstanding` | T1 Today, P1 Parties, P3 Supplier | TODO |

Each of P1-P8 also returns a `Working` structure (line-by-line derivation), asserted by
`vectors.json:working-renders-every-line`.

## Operational outputs

| ID | Engine function | Test | API surface | Screen | Status |
|----|-----------------|------|-------------|--------|--------|
| OP1 | `dailyCashHealth` | `vectors.json:op1-shortfall`, `op1-surplus`, `op1-exact` | `GET /v1/days/:date/summary` | T12 difference, T13 balanced | TODO |
| OP2 | `expensePressure` | `vectors.json:op2-expense-pressure-rounding` | `GET /v1/reports` | R1 Reports | TODO |
| OP3 | `collectionEfficiency` | `vectors.json:op3-collection-efficiency` | `GET /v1/reports` | R1 Reports | TODO |
| OP4 | `paymentDue` | `vectors.json:op4-payment-due-horizon` | `GET /v1/alerts` | T1 Today, P3 Supplier | TODO |
| OP5 | `businessMovement` | `vectors.json:op5-business-movement` | `GET /v1/reports` | R1 Reports | TODO |
| OP6 | `cashDeficitWarnings` | `vectors.json:op6-deficit-names-party-amount-date` | `GET /v1/alerts` | T1 Today AlertBanner | DONE |

**OP2, OP3 and OP5 stay TODO now that `R1.tsx` exists, and the reason is worth
writing down.** `check:traceability` resolves a named screen by asking whether its
FILE exists, which it now does — so the checker reports these three rows as held
back only by a stale status. They are not. R1 displays P4, P6 and P7 and nothing
else; the three operational ratios are not on it, and `GET /v1/reports` is still
unwritten. Promoting them on the strength of the file existing would be counting a
screen for figures it does not draw, which is the F-10 mistake with a different
subject.

## Business intelligence — gated on closed-day count

| ID | Engine function | Test | API surface | Screen | Status |
|----|-----------------|------|-------------|--------|--------|
| BI1 | `profitTrend` (gate 14) | `vectors.json:bi1-gate-opens-at-14` | `GET /v1/reports` | R1/R2 Reports GateCard | TODO |
| BI2 | `salesConsistency` (gate 14) | `vectors.json:bi2-gate-opens-at-14` | `GET /v1/reports` | R1/R2 Reports GateCard | TODO |
| BI3 | `cashFlowStability` (gate 21) | `vectors.json:bi3-gate-opens-at-21` | `GET /v1/reports` | R1/R2 Reports GateCard | TODO |
| BI4 | `workingCapitalPressure` (gate 14) | `vectors.json:bi4-gate-opens-at-14` | `GET /v1/reports` | R1/R2 Reports GateCard | TODO |
| BI5 | **RESERVED - no function** | **RESERVED - no test** | **RESERVED - no endpoint** | **RESERVED - NO UI (D5)** | RESERVED |
| BI6 | `creditConcentrationTrend` (gate 14) | `vectors.json:bi6-credit-concentration-gate-shut-at-13`, `bi6-one-customer-holds-most-of-the-udhar`, `bi6-evenly-spread-udhar-is-not-a-concentration-risk`, `bi6-direction-worsening-against-a-baseline`, `bi6-no-outstanding-udhar-is-undefined-not-zero-risk` | `GET /v1/reports` | R1/R2 Reports GateCard | WIP |

**BI5** - Inventory Pressure. Decision D5: no item data in V1 and **no placeholder**.
Not greyed out, not "coming soon", no card in Reports. ID reserved only.

**BI6 = Credit Concentration** - DECIDED AUTONOMOUSLY, see `DECISIONS-AUTONOMOUS.md`
AD-001. Item 6 of the note is physically cut off (`6. |`), so no document settles it;
it was chosen by the amendment's decision procedure as the highest-money-cost gap in
the output set. *P7 says he is owed 18,240; it does not say 11,000 of it is owed by one
man.* Gate 14 closed days, behind `CREDIT_CONCENTRATION_ENABLED`, default ON.
**Reversal trigger:** the original photograph surfaces and item 6 says otherwise.

## Free and Premium reports (docs/research/R5-free-premium-plan.md)

Everything below computes on the phone from the ledger it holds; there is no API
surface, and the cell says so rather than naming an endpoint nobody calls. Premium
is decided by `allows(plan, ...)` in `apps/mobile/src/app/plan.ts` and nowhere else.

| ID | Engine function | Test | API surface | Screen | Status |
|----|-----------------|------|-------------|--------|--------|
| FR-7 | `duesByAge`, `monthAtAGlance`, `cashCheckHistory`, `upiMonth` | `reports-basic.spec.ts`, `R1.test.tsx` FR-7 block, `sqlite-port.spec.ts` past adjustments | none — on the phone | R1 Reports, free section | WIP — built and tested; Odia and Hindi copy is a DRAFT until H13 |
| PR-3 | `salesForecast` (gates 14 / 56, MASE below 1) | `forecast.spec.ts`, `vectors.json:pr3-forecast-seasonal-naive-repeats-last-week`, `pr3-forecast-holt-winters-beats-last-week-on-a-rising-line`, `pr3-forecast-gate-shut-at-13` | none — on the phone | M1 Dashboard | WIP — built and tested; the plan is not yet in the session, so the app draws M1 for the free plan |
| PR-4 | `samePeriodLastYear`, `festivalWeeks`, `daysToPay`, `returnsTrend` | `reports-basic.spec.ts` PR-4 blocks | none — on the phone | M1 Dashboard | WIP — festival dates cover 2025 and 2026 only (DoPT O.M., via staffnews.in; primary not fetched) |
| PR-6 | none — the dashboard composes PR-3 and PR-4 and leaves a slot for PR-2 | `M1.test.tsx` | none — on the phone | M1 Dashboard, reached from R1 | WIP — item cards are another builder's |

## Screens a store or a statute requires — no engine figure

These are not feature rows. Every row above traces a FIGURE from the engine to a
screen; the rows below trace a REQUIREMENT to one. They are here because the §B.6
bar is keyed on a screen having a row at all, and a legally-required panel kept
outside the matrix is a panel nobody traces.

Three of the four say "none" in their first three columns because there is honestly
nothing to resolve — those screens derive no number and read nothing from the API.
**S8 is the exception, and it is the interesting one:** a confirmation screen has no
business computing anything, and this one does, because the warning that the shop is
still owed money is only true when P7 says so. So it traces a real engine figure, and
the reason is a sentence it must not show when it is false.

| ID | Engine function | Test | API surface | Screen | Status |
|----|-----------------|------|-------------|--------|--------|
| S5 | none — this screen derives no figure, which its test asserts | `apps/mobile/src/screens/S5.test.tsx` | none — the version is read from the build and passed in, never fetched | S5 About this app — version, open-source licences (L-19/L-21), and the L-15 sentence | WIP — built and tested; nothing in the app supplies a version string yet, so the row is not drawn, and the licences route has no destination wired |
| S6 | none — this screen derives no figure, which its test asserts | `apps/mobile/src/screens/S6.test.tsx` | none — the officer is published copy, not shop data | S6 Help and contact — the named grievance officer the DPDP Act requires (L-07) | WIP — built and tested; the officer's name and address are human-blocked in `docs/handover/HUMAN-ACTIONS.md`, and until they are given the screen publishes the fact that there is none rather than a placeholder |
| S7 | none — this screen derives no figure, which its test asserts; the grace window is `DELETION_GRACE_DAYS`, a constant, not an engine output | `apps/mobile/src/screens/S7.test.tsx` — the rendered grace copy is required to carry the constant in all three languages, and pressing the one button must leave the ledger untouched | none — nothing is requested here. The route exists, `POST /v1/deletion/request`, and nothing on S7 calls it | S7 Delete this account — the in-app deletion path Play's User Data policy and Apple 5.1.1(v) both require (LEGAL-AUDIT §4, beside L-13's web page) | WIP — built and tested; no navigation reaches it from S1 yet, nothing calls the API, and the Odia and Hindi copy is a DRAFT until H13 native review |
| S8 | `creditOutstanding` (P7) — read only to decide whether the udhar warning is TRUE; the screen computes nothing else | `apps/mobile/src/screens/S8.test.tsx` — the warning's ABSENCE against a shop owed nothing, its presence and figure against one that is owed, and both buttons pressed with the store required not to move | none — the confirm screen reports intent only. `POST /v1/deletion/confirm` exists and S8 does not call it | S8 Are you sure? — the last stop of the same required path; the safe answer carries the screen's one accent | WIP — built and tested; nothing is wired to either callback, so no deletion can yet be requested from the app, and the Odia and Hindi copy is a DRAFT until H13 |
| S10 | `paiseFromMicros` — Play's price to paise, exact or refused; the plan itself is derived on the server (`apps/api/src/billing/entitlement.ts`) and never by the engine | `apps/mobile/src/screens/S10.test.tsx`, `apps/api/test/billing.spec.ts` (cross-shop token reuse, unverified RTDN, expired preview, clock-only lapse), `packages/schema/test/billing.spec.ts`, `test/plan-flow.spec.tsx` | `GET /v1/billing/entitlement`, `POST /v1/billing/preview`, `POST /v1/billing/play/verify`, `POST /v1/billing/play/rtdn` | S10 Your plan — PR-7: price with GST shown before purchase, renewal terms, the 14-day preview with no payment details, Cancel opening Play's subscription page (Play Subscriptions policy; R4 §5.4) | WIP — built and tested end to end against a fake Google; buying stays closed until Play Console, the service account and Pub/Sub exist (H15, H17, H18), and the Odia and Hindi copy is a DRAFT until H13 |
| FR-6 | `limitInForce`, `creditLimitObservation` (`packages/formula-engine/src/credit.ts`) — the limit in force; the observation itself is drawn on T7/T8 against `Store.partyBalance` | `apps/mobile/src/screens/P6.test.tsx`; the P2 -> P6 -> save flow, the observation on T8 and the SQLite restart in `apps/mobile/test/r5-free.spec.tsx`; the engine in `packages/formula-engine/test/credit-limit.spec.ts` | `POST /v1/sync/push` `creditLimits` (append-only `party_credit_limits`, both engines; `apps/api/test/api.spec.ts`, `repo-equivalence.spec.ts`) and the per-party export | P6 Credit limit — R5 FR-6 (R1 GAP-7), a limit he sets on a customer, observed and never enforced | WIP — built and tested in Node; not yet run on a handset, and the Odia and Hindi copy is a DRAFT until H13 |
| FR-4 | none of its own — the CSV's money is `formatPaise` of entry amounts and of `partyEffect` sums (`apps/mobile/src/app/share.ts`) | `apps/mobile/src/screens/S12.test.tsx`; the CSV's columns, rupees, month filter, month-end balances and formula guard in `apps/mobile/test/r5-free.spec.tsx` | none — the file is made on the phone and handed to the share sheet (`SwaftoDeviceModule.shareTextFile`); nothing is sent to the server | S12 Entries for your accountant — R5 FR-4 (R1 GAP-5), a one-off CSV of one month | WIP — built and tested in Node; the share sheet has not been exercised on a handset, and the Odia and Hindi copy is a DRAFT until H13 |
| S11 | none — the app-lock cover derives no figure and shows nothing from the book, which its test asserts against the adversarial shop | `apps/mobile/src/screens/S11.test.tsx`; the lock policy in `apps/mobile/test/app-lock.spec.tsx` | none — the phone's own screen lock through `SwaftoDeviceModule.kt`; nothing is sent to the server | S11 App locked — R5 FR-3 (R1 GAP-4), the cover drawn when the app lock is on | WIP — built and tested in Node; the confirm itself (KeyguardManager) has not been exercised on a handset |
| S13 | none — this screen derives no figure, which its test asserts against both shops | `apps/mobile/src/screens/S13.test.tsx` | `GET /v1/me/export` (existing; `ApiClient.exportMe`), handed to the phone's share sheet as a file (`SwaftoDeviceModule.shareTextFile`) — nothing else is sent | S13 Your data — DPDP access as one button, with correction and erasure said in words (M3, approved at M2 2026-11-18) | WIP — built and tested in Node; the export and share sheet have not been exercised on a handset, and the Odia and Hindi copy is a DRAFT until H13 |
| S14 | none — this screen derives no figure; "last used" is whole days between the server's timestamp and a date passed in (`daysBetween`) | `apps/mobile/src/screens/S14.test.tsx` | `GET /v1/devices` and `POST /v1/auth/devices/:id/revoke` (existing; shop from `shopOf`, never the request) — `ApiClient.listDevices`, `ApiClient.revokeDevice` | S14 Signed-in phones — C-21 lost-device sign-out, asked before it is sent (M3, approved at M2 2026-11-18) | WIP — built and tested in Node against a fixture list; not exercised against the live API or a handset, and the Odia and Hindi copy is a DRAFT until H13 |

**L-07 reads RESOLVED above as a DECISION** (AD-003/007 settled that there will be a
named officer with an SLA). The artifact is not resolved: this screen renders the
contact when it exists and says so when it does not, and no code in this repository
can close the human half.

## Settings screens the shopkeeper chose, not the ones a statute did

A SECOND TABLE RATHER THAN TWO MORE ROWS ABOVE, because the reason differs and the
reason is the whole content of these cells. The rows above trace a REQUIREMENT to a
screen: they exist whether or not anyone wants them. These two exist because a man
changed his mind about his own shop — he mistapped a language on his first morning,
or he is standing in daylight he was not standing in when he was first asked. No
statute names either, and writing a feature ID beside one to make the matrix look
uniform would be inventing a traceability link.

**The "none" in the engine column is the claim worth recording.** If a day total, an
entry count or an expected-cash line ever lands on either screen that cell becomes
false — and both tests already fail on it, because each mutates the store and
requires the render not to move.

| ID | Engine function | Test | API surface | Screen | Status |
|----|-----------------|------|-------------|--------|--------|
| S2 | **none** — displays no feature-map output. The shop name is session state, not a derived figure, and the screen is forbidden to alter it | `apps/mobile/src/screens/S2.test.tsx` — four verbatim-name cases, truncation refused, and a store mutation that must not move the render | **none** — nothing is fetched or written; renaming is not built yet | S2 `ShopProfile`, reached from S1's shop row | WIP — built and tested; renaming is not implemented, and the Odia and Hindi copy is a DRAFT until H13 native review |
| S3 | **none** — displays no feature-map output. Both values are device preferences | `apps/mobile/src/screens/S3.test.tsx` — the autonyms are never translated and match X1's; the mode labels carry no accessibility wording | **none** — the choice is applied locally and at once; there is no round trip to save | S3 `LanguageSettings`, reached from S1's language row | WIP — built and tested; persisting the choice across launches is not wired, and the Odia and Hindi copy is a DRAFT until H13 |

## Premium item screens (PR-1, R5 decision 2 of 2026-10-26)

Item capture per sale replaces D5 for the Premium plan only. These rows trace the
two PR-1 screens to the engine and the sync route. Neither is a feature-map row:
the feature map predates R5. The item reports (PR-2) are cards for the Premium
dashboard (`apps/mobile/src/components/ItemCards.tsx`), not a screen of their own.

| ID | Engine function | Test | API surface | Screen | Status |
|----|-----------------|------|-------------|--------|--------|
| S9 | `parseShopItem` — a name, trimmed, at most `ITEM_NAME_MAX`; no price and no stock column exists to hold one | `apps/mobile/src/screens/S9.test.tsx`; `packages/schema/test/items.spec.ts` (append-only, no price column, both engines) | `POST /v1/sync/push` (`items`) | S9 `YourItems`, reached from S1's items row on Premium, or to read a list recorded under Premium | WIP — built and tested; how the plan reaches the session is builder D's (PR-7), and the customer-notice line and the Odia and Hindi copy are DRAFT until counsel and H13 |
| I1 | `parseItemLine`, `assertLineFits`, `saleItemised` — never more than the sale, only a sale of its own day | `apps/mobile/src/screens/I1.test.tsx`; `packages/formula-engine/test/items.spec.ts`; `packages/schema/test/items.spec.ts` (trigger `item_lines_fit_sale`, both engines); `apps/api/test/repo-equivalence.spec.ts` | `POST /v1/sync/push` (`itemLines`), `GET /v1/parties/:id/export` | I1 `ItemsForSale`, reached from T7's "Add items to a sale" on Premium only | WIP — built and tested; no server-side entitlement check (the phone's `allows()` is the only gate), and the Odia and Hindi copy is a DRAFT until H13 |

## Invariants the vectors must prove (architecture doc §02 p.4)

| Rule | Test | Status |
|------|------|--------|
| Cash equation - only Cash mode moves cash; all five modes count to expenses | `vectors.json:d2-cash-equation-five-modes` | TODO |
| Withdrawal reduces cash, never expenses, never profit | `vectors.json:d3-withdrawal-excluded-from-profit` | TODO |
| Carry-forward - day N opening = day N-1 **counted**, never expected | `vectors.json:carry-forward-uses-counted` | TODO |
| Missed day - a gap yields `not_closed`, never an interpolated balance | `vectors.json:d6-gap-never-interpolates` | TODO |
| Correction on day N referencing closed N-3 leaves N-3 byte-identical | `vectors.json:d7-correction-leaves-source-day-identical` | TODO |
| Skip vs empty - same total, different day state | `vectors.json:d8-skip-vs-untouched` | TODO |

## Legal action items (from LEGAL-AUDIT.md §11, populated at G2)

| Ref | Requirement | Artifact | Owner | Status |
|-----|-------------|----------|-------|--------|
| L-01 | Consent notice before OTP, 3 languages | X0 `ConsentNotice` (en/hi/or), `GET /v1/legal/notice`, `consents` table | Eng | WIP - built and tested; the Odia and Hindi copy is a DRAFT until H13 native review |
| L-02 | Granular consent + easy withdrawal | X0 per-purpose toggles in manage mode, reached from T1 and from S1 via S4 (the route, which deliberately renders no second set of toggles); `POST /v1/me/consent` (grant and withdraw are the same call), `GET /v1/me/consents` returning `current` as well as the log | Eng | WIP - built end to end; the Odia and Hindi copy is DRAFT until H13 |
| L-03 | Party data Fiduciary vs Processor analysis | Terms clause | AD-005/006 | RESOLVED |
| L-04 | Per-party export and redaction | `GET /v1/parties/:id/export`, `POST /v1/parties/:id/redact`, `ApiClient.exportParty/redactParty` | Eng | WIP - both routes built and tested on both repositories; the P2/P3 screens are deferred |
| L-05 | Retention / inactivity period | Privacy policy | AD-003/007 | RESOLVED |
| L-06 | Deletion propagates to S3 backups | `apps/api/src/jobs/purge-due.ts` exists; no S3, no Terraform, no rotation | Eng | WIP - the job half is built, the infrastructure half does not exist |
| L-07 | Grievance Officer named with SLA | About screen, policy, website | AD-003/007 | RESOLVED |
| L-08 | Breach response runbook + rehearsal | `docs/runbooks/breach.md` - Rule 7 clocks, the two notifications, what the system can answer | Eng (G3) | WIP - written; the rehearsal has never been run |
| L-09 | No processor moves data out of India | `check:licences` processor sweep + `check:push`; no processor in the shipped closure | Eng | WIP - no subject today, and a tripwire if that changes |
| L-10 | Cloudflare TLS termination abroad = transfer? | Architecture decision | AD-005/006 | RESOLVED |
| L-11 | FCM payloads carry no personal data | `tools/check-push-payload.mjs` - a tripwire; V1 ships no push at all | Eng | N/A-V1 - fails the build the day an SDK appears |
| L-12 | Data Safety form word-identical to policy | `docs/handover/DATA-SAFETY.md`, generated from the notice; `apps/web/test/legal.spec.ts` | Eng | WIP - derived; entering it in the Console is H7 |
| L-13 | Public web deletion page | `apps/web/delete-account/index.html`, `POST /v1/deletion/request`, `POST /v1/deletion/confirm`, `otp_account_deletion` | Eng | WIP - built and checked; the URL itself needs hosting |
| L-14 | POST_NOTIFICATIONS primer after first close | Manifest must not declare it; the primer returns with the inbox (DEFERRED) | Eng | N/A-V1 - no notifications are requested |
| L-15 | GST disclaimer in app copy and exports | `EXPORT_DISCLAIMER` on both export routes, with a test that walks them | Eng | WIP - every export carries it; the export screen is deferred |
| L-16 | Export naming rules enforced | `tools/check-export-naming.mjs`, walking every source file | Eng | WIP - enforced in Latin script; the same words in Devanagari or Odia are H13 |
| L-17 | Privacy policy drafted, reviewed, live | `apps/web/legal/privacy.html` | Eng | WIP - written and checked against the notice; unreviewed (H9), not yet live (H5) |
| L-18 | Terms live; liability vs accuracy promise | `apps/web/legal/terms.html` | Eng | WIP - written; the arithmetic promise is kept and tested, unreviewed (H9) |
| L-19 | Verify Anek + IBM Plex OFL 1.1 | `tools/check-licences.mjs` font audit -> `docs/handover/LICENCES.md` with SHA-256 per file | Eng | WIP - licence text machine-checked; one hash comparison against upstream is human |
| L-20 | Verify SQLCipher licensing | ADR-002 amendment if needed | Eng | TODO |
| L-21 | Licence manifest generated from lockfile | `tools/licences.mjs` | Eng | TODO |
| L-22 | CI licence gate fails on GPL/AGPL | CI job | Eng | TODO |
| L-23 | DLT registration (entity, header, templates) | Registered business entity | AD-003/007 | RESOLVED |
| L-24 | Terms state no under-18s | `apps/web/legal/terms.html` section 8, with a test | Eng | DONE |
| L-25 | Consent Manager review before 2026-11-13 | Calendar item | Eng | TODO |
| L-26 | Full DPDP compliance by 2027-05-15 | Programme milestone | **Business** | TODO |

## Security action items (from SECURITY-AUDIT.md §7, populated at G3)

| Ref | Threat | Mitigation | Test | Status |
|-----|--------|-----------|------|--------|
| S-01 | Device theft, DB read | SQLCipher + Keystore key | `test/db-encryption.spec.ts` | TODO |
| S-02 | OS backup extraction | `allowBackup=false` | manifest assertion | TODO |
| S-03 | App lock brute force | Argon2id PIN, persisted backoff | `test/app-lock.spec.ts` | TODO |
| S-04 | Forgotten PIN lockout | OTP recovery, never locked out | `test/pin-recovery.spec.ts` | TODO |
| S-05 | Screenshot leak | `FLAG_SECURE` on 2 screens only | render test | TODO |
| S-06 | MITM | TLS 1.3, no cleartext | config assertion | TODO |
| S-07 | Rogue CA | CA pinning + expiry + kill switch | `test/pinning.spec.ts` | TODO |
| S-08 | Origin bypass | Cloudflare-only SG + origin secret | Terraform + smoke test | TODO |
| S-09 | SSH exposure | SSM only, no inbound 22 | Terraform assertion | TODO |
| S-10 | **Cross-tenant read** | 3 layers incl. Postgres RLS | `packages/schema/test/tenancy.spec.ts` - a non-superuser role owning the tables, attacking across tenants in SQL; `apps/api/test/api.spec.ts`; `test/pipeline.spec.tsx` through the real client | **DONE - all three layers, each attacked rather than asserted** |
| S-11 | **Cross-tenant write / forged shop_id** | shop_id from session only | `apps/api/test/api.spec.ts` - forged in the query, the body, the path and a header, plus `shopOf` tested directly | **DONE at iteration 35 - a plant survived 228 tests before these existed** |
| S-12 | UPDATE/DELETE on entries | REVOKE + trigger | `packages/schema/test/append-only.spec.ts`, both engines, four unconstrained columns | **DONE** |
| S-13 | OTP abuse | Rate-limit matrix | `apps/api/test/rate-limit.spec.ts`, and the 429 with a real Retry-After through the client | **DONE** |
| S-14 | SIM swap | Device binding, 24h hold on export/delete | Deletion now has a **30-day** grace that signing in cancels (L-13/L-08 work), which is far stronger than the 24h hold this row contemplated. **EXPORT still has no hold** | PARTLY MITIGATED - the deletion half is covered, the export half is still accepted risk |
| S-15 | Push payload leak | Trigger-only push | `tools/check-push-payload.mjs` | **N/A-V1 with a tripwire** - no push integration exists; the check fails the build the day one appears |
| S-16 | Log leakage | Allow-list logger + scrubber | `apps/api/test/api.spec.ts` S-16 - captures the log on a 500 and requires the digits to be absent in ANY encoding; `check:client-logs` for the app | **DONE - and the first version of the test was vacuous, because nothing logs at level warn** |
| S-17 | Secrets in repo/APK | gitleaks, SSM, OIDC | CI scan | TODO |
| S-18 | Vulnerable dependencies | audit + Trivy, high fails | CI | **DONE - 0 vulns** |
| S-19 | Backup/restore unproven | Two paths + timed drill | local rollback drill (G9) | TODO |
| S-20 | Cloudflare TLS abroad | residency analysis | AD-008 | RESOLVED |
| S-21 | Unsynced entries lost with device | Prompt sync; disclosed | - | ACCEPTED |
