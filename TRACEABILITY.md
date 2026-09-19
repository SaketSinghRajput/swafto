# TRACEABILITY

One row per feature-map ID. Five columns. `npm run check:traceability` fails on any
empty cell except the two known reservations (BI5, BI6).

Status legend: `TODO` not started · `WIP` in progress · `DONE` all five cells real and verified.

## Inputs

| ID | Engine function | Test | API surface | Screen | Status |
|----|-----------------|------|-------------|--------|--------|
| IN1 | `parseSalesEntry` (sections 01/02/03) | `vectors.json:canonical-15-july`, `in1-sales-modes` | `POST /v1/sync/push` section=`cash_sales`\|`upi_sales`\|`udhar_sales` | T7 Form A, T8 Form B | TODO |
| IN2 | `parsePurchaseEntry` | `vectors.json:in2-purchase-modes` | `POST /v1/sync/push` section=`purchase` | T9 Form C | TODO |
| IN3 | `parseExpenseEntry` | `vectors.json:in3-expense-five-modes` | `POST /v1/sync/push` section=`expense` | T9 Form C | TODO |
| IN4 | `parseCollectionEntry` | `vectors.json:in4-udhar-collection` | `POST /v1/sync/push` section=`udhar_collection` | T8 Form B | TODO |
| IN5 | `parsePartyPaymentEntry` | `vectors.json:in5-party-payment` | `POST /v1/sync/push` section=`party_payment` | T8 Form B | TODO |
| IN6 | `parseWithdrawalEntry` | `vectors.json:in6-withdrawal-not-expense` | `POST /v1/sync/push` section=`withdrawal` | T10 Form D | TODO |
| IN7 | `captureCountedCash` | `vectors.json:in7-counted-cash` | `POST /v1/days/:date/close` | T11 Cash check counting | TODO |

## Primary outputs — never gated

| ID | Engine function | Test | API surface | Screen | Status |
|----|-----------------|------|-------------|--------|--------|
| P1 | `totalCashReceived` | `vectors.json:canonical-15-july` (=918000p) | `GET /v1/days/:date/summary` | T1 Today, T11 working | TODO |
| P2 | `totalCashPaid` | `vectors.json:canonical-15-july` (=438000p) | `GET /v1/days/:date/summary` | T1 Today, T11 working | TODO |
| P3 | `expectedCashBalance` | `vectors.json:canonical-15-july` (=630000p) | `GET /v1/days/:date/summary` | T11 Cash check, as its working | TODO |
| P4 | `netSales` | `vectors.json:canonical-15-july` (=1145000p) | `GET /v1/days/:date/summary` | T1 Today, T14 summary | TODO |
| P5 | `netPurchase` | `vectors.json:canonical-15-july` (=320000p) | `GET /v1/days/:date/summary` | T14 summary | TODO |
| P6 | `totalExpenses` | `vectors.json:canonical-15-july` (=118000p) | `GET /v1/days/:date/summary` | T14 summary | TODO |
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
| OP6 | `cashDeficitWarning` | `vectors.json:op6-deficit-names-party-amount-date` | `GET /v1/alerts` | T1 Today AlertBanner | TODO |

## Business intelligence — gated on closed-day count

| ID | Engine function | Test | API surface | Screen | Status |
|----|-----------------|------|-------------|--------|--------|
| BI1 | `profitTrend` (gate 14) | `vectors.json:bi1-gate-opens-at-14` | `GET /v1/reports` | R1/R2 Reports GateCard | TODO |
| BI2 | `salesConsistency` (gate 14) | `vectors.json:bi2-gate-opens-at-14` | `GET /v1/reports` | R1/R2 Reports GateCard | TODO |
| BI3 | `cashFlowStability` (gate 21) | `vectors.json:bi3-gate-opens-at-21` | `GET /v1/reports` | R1/R2 Reports GateCard | TODO |
| BI4 | `workingCapitalPressure` (gate 14) | `vectors.json:bi4-gate-opens-at-14` | `GET /v1/reports` | R1/R2 Reports GateCard | TODO |
| BI5 | **RESERVED - no function** | **RESERVED - no test** | **RESERVED - no endpoint** | **RESERVED - NO UI (D5)** | RESERVED |
| BI6 | **BLOCKED-ON-HUMAN** | **BLOCKED-ON-HUMAN** | **BLOCKED-ON-HUMAN** | **BLOCKED-ON-HUMAN** | BLOCKED-ON-HUMAN |

**BI5** - Inventory Pressure. Decision D5: no item data in V1 and **no placeholder**.
Not greyed out, not "coming soon", no card in Reports. ID reserved only.

**BI6** - Item 6 of the 15-07-2026 note is physically incomplete on the photograph
(`6. |`). Corroborated by `SWAFTO-Retail-Desk-Day-Close.pdf` p.9: *"Output #6
(unwritten) - Left incomplete in the 15-07 note - Blocked"*. **Do not invent it.**
Resolving it costs one row here and one engine function. Blocks no gate.

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
| L-01 | Consent notice before OTP, 3 languages | `ConsentNotice` screen, `users.consent_*` | Eng | TODO |
| L-02 | Granular consent + easy withdrawal | Settings toggle, `consents` table | Eng | TODO |
| L-03 | Party data Fiduciary vs Processor analysis | Terms clause | **Counsel** | BLOCKED-ON-HUMAN |
| L-04 | Per-party export and redaction | P2/P3, `GET /v1/parties/:id/export` | Eng | TODO |
| L-05 | Retention / inactivity period | Privacy policy | **Business** | BLOCKED-ON-HUMAN |
| L-06 | Deletion propagates to S3 backups | Deletion job + TF lifecycle rule | Eng | TODO |
| L-07 | Grievance Officer named with SLA | About screen, policy, website | **Business** | BLOCKED-ON-HUMAN |
| L-08 | Breach response runbook + rehearsal | `docs/runbooks/breach.md` | Eng (G3) | TODO |
| L-09 | No processor moves data out of India | Cloudflare/Sentry/FCM/SMS review | Eng | TODO |
| L-10 | Cloudflare TLS termination abroad = transfer? | Architecture decision | **Counsel** | BLOCKED-ON-HUMAN |
| L-11 | FCM payloads carry no personal data | Push builder, trigger-only | Eng | TODO |
| L-12 | Data Safety form word-identical to policy | Play Console + policy | Eng | TODO |
| L-13 | Public web deletion page | `swafto.app/delete-account` | Eng | TODO |
| L-14 | POST_NOTIFICATIONS primer after first close | Manifest + primer screen | Eng | TODO |
| L-15 | GST disclaimer in app copy and exports | Export screen + file header | Eng | TODO |
| L-16 | Export naming rules enforced | Copy + i18n key audit | Eng | TODO |
| L-17 | Privacy policy drafted, reviewed, live | Website | **Counsel** | BLOCKED-ON-HUMAN |
| L-18 | Terms live; liability vs accuracy promise | Website | **Counsel** | BLOCKED-ON-HUMAN |
| L-19 | Verify Anek + IBM Plex OFL 1.1 | `licences/` + About | Eng | TODO |
| L-20 | Verify SQLCipher licensing | ADR-002 amendment if needed | Eng | TODO |
| L-21 | Licence manifest generated from lockfile | `tools/licences.mjs` | Eng | TODO |
| L-22 | CI licence gate fails on GPL/AGPL | CI job | Eng | TODO |
| L-23 | DLT registration (entity, header, templates) | Registered business entity | **Business** | BLOCKED-ON-HUMAN |
| L-24 | Terms state no under-18s | Terms | **Counsel** | BLOCKED-ON-HUMAN |
| L-25 | Consent Manager review before 2026-11-13 | Calendar item | Eng | TODO |
| L-26 | Full DPDP compliance by 2027-05-15 | Programme milestone | **Business** | TODO |

## Security action items (populated at G3)

| Ref | Threat | Mitigation | Test | Status |
|-----|--------|-----------|------|--------|
| - | *Populated when G3 completes.* | - | - | TODO |
