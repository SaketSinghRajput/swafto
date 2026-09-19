# DEFERRED

**What was cut when the ceiling moved from 60 iterations to 40, why, what it blocks,
and what it would cost to build.** Injection 15 A.4: this is a deliverable, not a
note. It is what makes the cut recoverable by someone who was not here.

Nothing below is abandoned and nothing below is broken. Each item is *not built*, and
each says what stands in the way of it.

**What IS being built** is in `PROJECTION.md`: a correct, offline, three-language app
that closes a day end to end on an emulator, with every shipped screen meeting §B.6 in
full. Roughly eleven screens committed, sixteen at best.

---

## 1 · The server: sync, the read API, the OTP service, and DC-003's control

**The largest cut, and the one that is mine rather than the owner's.** Recorded as
AD-018 with its reversal trigger.

| | |
|---|---|
| **What** | G6 the OTP/auth service · G7 the sync API · G8 the read API · DC-003's L7 compensating control |
| **Why cut** | Eight of the twenty remaining iterations, and **none of it is walkable on an emulator with no network.** A.2's target is an offline app. Keeping it would have left four iterations for the entire screen set - a backend with no product on top of it. |
| **What it blocks** | Sync, in full: the outbox fills and never drains. Real sign-in - the OTP screens build against `StubSmsPort`, so the code that arrives is not one a server issued. B8, B11 and B36 never get instruments, because their subjects never exist. Any multi-device story. Server-side divergence detection (architecture §07.06). |
| **What survives** | The rate limiter (AD-017 - 15 tests, Postgres-backed, restart-proven) and the SMS port and template registry are BUILT AND TESTED. So is the entire schema, on both engines. What is missing is the HTTP layer on top: routes, handlers, wiring. |
| **Cost to build** | 8 iterations - G6 about 2, G7 about 3, G8 about 2, DC-003 about 1. Lower than a cold start, because the hard parts (limiter, port, schema, the shared engine) are done. |

---

## 2 · Reports and every BI screen

| | |
|---|---|
| **What** | R1/R2 Reports, the GateCard, and the screens for BI1 profit trend, BI2 expense ratio, BI3 collection efficiency, BI4 leverage, BI6 credit concentration |
| **Why cut** | Their gates are **14 to 21 closed days**. A shopkeeper who installs on day one sees nothing here for three weeks either way, so a first-month user loses nothing. The cheapest real cut available. |
| **What it blocks** | Nothing in the first month of use. After that the intelligence layer stays invisible until the screens exist. |
| **What survives** | **THE ENTIRE BI ENGINE.** BI1-BI4 and BI6 are implemented, gated and covered by vectors, including BI6's five. `intelligence.ts` is 87% statement covered. Not one line of engine work is discarded; only the rendering defers. |
| **Cost to build** | 2-3 iterations for the GateCard pattern plus five card bodies, once the design tokens from the committed set exist. |

---

## 3 · The Play Store set — **PLAY SUBMISSION IS BLOCKED WITHOUT THIS**

| | |
|---|---|
| **What** | The in-app account deletion flow · About, carrying the privacy-policy URL and the deletion URL · the public account-deletion web page |
| **Why cut** | Each is a submission requirement rather than a product requirement, and the target at 40 is explicitly *not a Play submission*. |
| **What it blocks** | **Google Play submission, outright.** LEGAL-AUDIT §4 records account deletion as ACTION-REQUIRED and externally blocking; §3's Data Safety form and §1.5's rights flow depend on it too. The app is usable; it is not submittable. |
| **What survives** | The legal analysis is complete - LEGAL-AUDIT §1 to §11 - so this is implementation against a finished specification, not research. H5 (the deletion URL) and H7 (the Play Console) are already in HUMAN-ACTIONS.md. |
| **Cost to build** | 2 iterations for the app side, plus a static web page and a domain, which are human actions H5 and H9. |

---

## 4 · Settings beyond language and appearance, and the support surface

| | |
|---|---|
| **What** | Settings beyond language and Comfort/Focus · help and FAQ · backup and export · the app-lock PIN · number change · crash recovery · the notification inbox and its permission primer |
| **Why cut** | None of it sits on the path from opening cash to a closed day. Twelve-odd screens for capabilities a first-week user does not reach. |
| **What it blocks** | **The app lock is the one that matters** (T1.1/T1.2) - without it a customer can pick up an unlocked phone and read the day's cash. It is optional by design, so its absence is a disclosed risk rather than a defect, but it should be first back. Number change (injection 08 B.5) means a user who loses a number needs support. No export means no accountant hand-off. Android 13+ notification permission is never requested, so no reminders. |
| **What survives** | The app-lock threat model is written (T1.1-T1.3, S-03, S-04) including the rule that a shopkeeper is NEVER locked out of his own ledger. AD-014 specifies number-change revocation in full. Both are designed and unbuilt. |
| **Cost to build** | 4-5 iterations for the set; the app lock alone is about 1. |

---

## What this costs the benchmarks

**B38 · Screens implemented and navigable · 27 of 27.** Cannot be met. Eleven
committed, sixteen at best. Reported as `MISSED - SCOPE` with the measured count.

**B39 · Feature IDs with function + test + API + screen.** Cannot be met. The API
column is blocked by cut 1 and the screen column by cuts 2 and 4. Reported as
`MISSED - SCOPE`.

**The thresholds are not edited and "screen" is not redefined.** A build that reports
16 of 27 with the reason attached is worth more than one that reaches 27 by changing
what the word means. `BENCHMARKS-RESULTS.md` carries a reason code, so a scope miss -
a decision - is never mistaken for a performance miss, which is a failure.

**B8, B11, B34 and B36 stay NOT INSTRUMENTED**, because cuts 1 and 3 mean their
subjects never come to exist inside this ceiling. Their rows say so rather than
sitting blank.

---

## Reading this as a continuation plan

In cost order, cheapest first: **the app lock** (1 iteration) · **the BI screens**
(2-3, and the engine is already waiting for them) · **the Play set** (2, and it
unblocks submission) · **the server** (8, and it unblocks everything multi-device).

If only one thing is picked up: **the Play set**, because it converts a working app
into a shippable one, and because the legal work behind it is already finished.
