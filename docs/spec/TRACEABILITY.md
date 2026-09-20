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
| P3 | `expectedCashBalance` | `vectors.json:canonical-15-july` (=630000p) | `GET /v1/days/:date/summary` | T11 Cash check, as its working; T5 day close list, as its headline; T6 opening cash, which sets its opening term | DONE |
| P4 | `netSales` | `vectors.json:canonical-15-july` (=1145000p) | `GET /v1/days/:date/summary` | T1 Today, T14 summary | DONE |
| P5 | `netPurchase` | `vectors.json:canonical-15-july` (=320000p) | `GET /v1/days/:date/summary` | T14 summary | DONE |
| P6 | `totalExpenses` | `vectors.json:canonical-15-july` (=118000p) | `GET /v1/days/:date/summary` | T14 summary | DONE |
| P7 | `creditOutstanding` | `vectors.json:p7-credit-outstanding` | `GET /v1/parties/outstanding` | T1 Today, P1 Parties, P2 Customer | TODO |
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
| L-02 | Granular consent + easy withdrawal | X0 per-purpose toggles in manage mode, reached from T1; `POST /v1/me/consent` (grant and withdraw are the same call), `GET /v1/me/consents` returning `current` as well as the log | Eng | WIP - built end to end; the Odia and Hindi copy is DRAFT until H13 |
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
