# Results — on-device campaign (Wave 5)

## Build log
| Build | When | Result |
|---|---|---|
| debug #1 (`productionize` @ 346d873 + H14 toolchain) | 2026-11-18 10:31 | BUILD SUCCESSFUL in 10m 13s (Gradle 8.14.3; stale `G:` autolinking caches cleared first). `adb install -r` → Success. **Correction:** "data kept" was wrong. The package had already been uninstalled at 10:11 (INC-01), so this was a fresh install |

## Defects
| ID | Sev | Found in | Summary | Evidence | Status |
|---|---|---|---|---|---|
| QA-01 | **P0** | Smoke | The debug build crashes on launch with "This release build has no https API URL", thrown by `resolveApiBaseUrl` at module load, then `Cannot read property 'Root' of undefined`. Likely cause: `debuggableVariants = []` embeds a production JS bundle in debug, so `__DEV__` is false and C-16's release guard fires. The unit tests checked the URL function, not the build-type signal. | `docs/ui/after/01-launch.png`; logcat `E ReactNativeJS` 10:32:19 | FIXED (native `isDebugBuild`; resolve moved into Root so errors reach the ErrorBoundary). Verified on device: no crash at 10:35 |
| QA-02 | **P0** | Smoke (after QA-01) | The app hangs on the SWAFTO splash for 30 s+ with no JS error. Logcat shows `Running "SWAFTO"` and then nothing. This is the first run of the Wave 2+ code on an old (26 Oct) SQLite file, so the suspects are a migration or store load awaiting something forever. | `docs/ui/after/02-launch-fixed.png`, `03-after-splash.png` | **NOT A DEFECT**: the app shows A1 (first-run sign-in), a tap-to-continue screen by design, because the book was empty. See INC-01 |

## Scenario results
(filled per wave; IDs from FAILURE-CATALOG.md)

## Incidents
### INC-01 — the existing app and its data ("TEST STORE D", synthetic) were uninstalled
- **When:** 2026-11-18 **10:11:01.588**. Phone event log: `am_kill … stop com.swafto due to deletePackageX`; uid 10216 stopped. The next install (10:32:08, by the CTO's `adb install -r`) got a NEW uid (10243) and `firstInstallTime=10:32:08`, which proves an uninstall plus a fresh install, not an update.
- **Caller:** not recorded in logcat. Every CTO/agent command this session was searched: none issues `uninstall`, `pm uninstall`, `pm clear` or an install without `-r`. Around 10:11 the CTO was running a read-only backup attempt (`run-as … ls`, `run-as … tar`, `pm path`). Its `run-as: packagelist_parse failed` fits the package list being rewritten by the deletion at that instant. **Resolved 2026-11-18: Saket confirmed he uninstalled it himself.** CLOSED as expected; no product or tooling fault.
- **CTO miss:** at 10:12, `pm path com.swafto` returned empty, meaning the app was already gone, and this was not noticed. The CTO proceeded to install instead of stopping and reporting. That did not cause the loss, but it is a process failure: an empty `pm path` is now an abort condition.
- **Impact:** synthetic test data only. No backup existed (`run-as` is broken on this OEM, so no snapshot was possible). Not recoverable from the phone.
- **Consequence for the plan:** the install is now fresh. Every catalog scenario, including clean-slate ones, can run on this install, so the separate `.qa` build is no longer needed for data safety. A test shop will be created through the UI against the local API.
- **INC-02 (2026-11-18 10:42:48):** the app was uninstalled again (`deletePackageX`). The device tester hit the abort rule (empty `pm path`) and stopped correctly. **Saket confirmed he removed it himself**, and approved a reinstall. Reinstalled with `install -r` at ~10:47 (fresh, no data). CLOSED.

---
## Scenario results - Round 1 on the fresh install (mobile-realworld-tester, 2026-11-18, vivo I2219, high-contrast text ON, English UI unless stated)
Evidence prefix `R1-` in `qa/swafto-retail-desk/evidence/`. DB oracle: `swafto_device` (read-only SELECTs). Every money figure shown by the app was re-derived by hand in integer paise from the DB rows; all reconciled (see MONEY-RECON below).
Rig note: `adb reverse --remove` does NOT drop an already-open keep-alive connection (a Rs 7 sale still synced with the tunnel removed). A real offline needed `am force-stop` + relaunch after removing the tunnel. EN-13's first "offline" batch was therefore online (rows synced); it was redone properly under SY-01.

| ID | Result | Evidence | Notes |
|---|---|---|---|
| SMOKE (A1, A2, X0, A3, A4, X1, Today) | PASS | R1-SMOKE-01..10 | Sign-up `+919999900001`, OTP read from dev-server.log, shop "QA Kirana". No FATAL/AndroidRuntime in logcat (only `Running "SWAFTO"`). |
| R-01 | BLOCKED | - | Fresh install, no prior data to migrate. |
| R-02 | BLOCKED | - | Told not to restart the dev server; session-key restart test not run. |
| ON-01 | PASS | R1-ON-01-* | Back from X0 returns to A2; Hindi X0 re-renders; optional purposes default "No"; Odia/Hindi render (draft copy, wording not judged). |
| ON-02 | PASS | R1-ON-02-* | 9th digit refused/capped at Rs 1,00,00,000.00; Rs 12,345 shows `Rs12,345.00`; DB `days.opening_cash` = 1234500. |
| ON-03 / ON-04 | BLOCKED | - | Not run (time): kill-at-each-onboarding-step and offline-send not exercised. |
| ON-05 | PASS | R1-SMOKE-10 | Double-tap Start the day gave 1 `shops` row, 1 `days` row. |
| TD-01 | PASS | R1-TD-01-tiles, R1-DV-06-after-midnight | Stale open day (clock +6 days): notice "This book is still open for Thursday 19 November. Close it to start today." and the six add tiles are removed entirely; 0 new entries. |
| TD-02 | PASS | R1-TD-02-form | Close it now -> T5 -> Cash sales Rs 1 -> landed on the stale open day (DB `day_id` = 19 Nov), day stayed open. |
| TD-03 | PASS | R1-EN-08-today-after | UPI Rs 250 raised Net sales, Expected unchanged (D2). |
| TD-05 | FAIL (UX, P2) | R1-SMOKE-10, R1-EN-00-today-scrolled | Today is built around "Continue day close"; the Sale tile is half-cut under the tab bar on first view and needs a scroll. Add is small and top-right, far from the thumb; Clear sits next to 0. |
| EN-01 | PASS | R1-EN-01-* | Double-tap and triple-tap: exactly one row per typed Rs 100. |
| EN-02 | PASS | R1-EN-02-* | UPI -> `upi_sales/upi`, Expected unchanged. Udhar with no customer refused in words, amount kept. |
| EN-03 | PASS | R1-EN-03-typed, -add, -today | The key press that would exceed Rs 1 crore is refused with "One entry can be at most Rs 1 crore. Check the digits." Extra zeros stop at exactly Rs 1,00,00,000 (saved 1000000000 paise). Summary, T11, T14 render fine with Rs 1 crore. |
| EN-04 | **FAIL** | R1-EN-04-zero-add | Typing `0` then Add saved a Rs 0.00 cash-sale row (DB amount = 0). Empty Add is correctly ignored, `0005` = Rs 5.00 OK, Clear OK. See QA-04. |
| EN-05 | PASS | R1-EN-05-* | Draft Rs 437 restored after `am kill` and after `force-stop`; nothing saved. |
| EN-06 | PASS | R1-EN-06-* | Notification + dialer 10 s: amount intact, keypad works, nothing saved. |
| EN-07 | PASS | R1-EN-07-* | Orientation is locked to portrait; font 1.3 restart kept the draft Rs 333. Font restored to 1.0. |
| EN-08 | PASS | R1-EN-08-* | Triple-tap Save and choose: exactly 1 party, no stray digit. Udhar Rs 75: customer +75, Expected unchanged. |
| EN-09 | **FAIL** | R1-EN-09-overcollect, R1-EN-09-today | Pay Rs 40 = `party_payment` cash -40 OK; Collect Rs 30 OK. Collect Rs 500 from a customer who owed Rs 45 was accepted silently: "Owed to you -Rs 455.00", cash +Rs 500. See QA-03. |
| EN-10 | PASS (money) / FAIL (labels) | R1-EN-10-* | Cash expense Rs 60 and cash withdrawal Rs 200 moved Expected; UPI/Other/Shop stock/Udhar expense and the UPI withdrawal Rs 50 did not (D2). Withdrawal outside profit (T14). But rows do not name their mode: five identical "Expenses Rs 60.00" rows. See QA-05. |
| EN-11 | PASS (partial) | R1-EN-11-* | Over-return refused ("more than this sale can still take back"). Refund cash / Refund UPI / Credit issued / Pending each recorded correctly (cash -> `refund_paid/cash` linked; UPI -> `refund_paid/upi`; Credit -> `refund_paid/udhar` + customer; Pending -> `sales_return` only). Double-tap Save = one event. **Exchange BLOCKED**: needs a replacement-goods step below the fold, not completed. |
| EN-12 | PASS (partial) | R1-EN-09-pay-picker | Pay's picker lists suppliers only. A stale refusal banner carried into the Udhar book form (QA-07). Full Back matrix not run. |
| EN-13 | PASS | R1-EN-13-*, R1-SY-01-* | 60 Rs 1 sales (20 online, 20 online mislabelled offline, 20 truly offline): 60 rows, no duplicates; 21 queued offline drained ~16 s after the tunnel returned. |
| CL-01 | PASS (partial) | R1-CL-01-* | T5 shows done/not-yet per row (tick vs number, plus text); Cash check is locked until Purchases is entered or skipped ("Enter or skip Purchases first"). Skip-contradiction not run. |
| CL-02 | PASS | R1-CL-02-t11 | T11 "Should be" Rs 90,12,730.00 = 12,345.00 + 1,00,00,276.00 + 530.00 - 120.00 - 60.00 - 40.00 - 200.00 - 1.00 - 10,00,000.00 (adjustment). UPI not in cash. |
| CL-03 | PASS | R1-CL-03-* | Short Rs 85 -> "Difference -Rs 85.00"; Close the day stayed disabled (no message) until a reason was picked; over Rs 115 -> reasons Forgot to write a sale / Counted wrong / Don't know; exact count -> "It matches". Fixed reasons only. |
| CL-04 | PASS | R1-CL-04-after-kill | Dialer interruption + `am kill` on the difference screen: day still open (`counted_cash` NULL), app back on Today, count asked again. |
| CL-05 | PASS | R1-CL-05-confirmed | Double-tap Received: one `upi_confirmations` row, "UPI you confirmed Rs 250.00". |
| CL-06 | PASS | R1-CL-06-* | Adjustment types are a fixed list of 4 (no text field). Digit over Rs 1 crore refused. One row saved. (A stray Rs 10,00,000 counterfeit adjustment was saved by my own mis-tap sequence; it is test data and is included in the maths.) |
| CL-07 | PASS | R1-CL-07-* | Closed with the tunnel removed and the app force-stopped. T14 profit Rs 89,99,677.00 = net sales 1,00,00,597 - purchases 620 - expenses 300 - adjustment 10,00,000; withdrawal Rs 250 shown outside profit. On restore the day synced closed (`counted_cash` 901273000 = Rs 90,12,730.00) in under 5 s, entries stayed 88, none parked. |
| CL-08 / CL-09 | BLOCKED | - | Need the fault proxy (not built). |
| CL-10 | PASS (partial) | R1-CL-10-tap-sale | Closed day: six tiles greyed with "Today is closed. Post a correction instead."; taps wrote nothing (88 rows). Greyed tiles give no feedback (QA-08). Stale-outbox / DB-trigger route not run. |
| CL-11 | PASS (consecutive day) | R1-CL-11-nextday | Next day (clock +1) opened with opening cash = yesterday's counted Rs 90,12,730.00 (T13 says "This becomes tomorrow's opening cash"). Gap-day "asked" rule not exercised. |
| CO-01 | PASS | R1-CO-01-* | Rs 5 correction on closed 18 Nov: saved as "waiting", then appeared as a 19 Nov `cash_sales` row with `corrects_day_id` = 18 Nov and `refers_to_entry_id` set; the closed day's figures unchanged. |
| SY-01 | PASS | R1-SY-01-* | Truly offline: "1 waiting to sync", then "21 waiting"; figures matched hand arithmetic; Reports says "Reports open after you close your first day". Drained in ~16 s. |
| DV-01 | PASS (partial) | R1-TD-01-*, R1-CL-11-nextday | Clock +1 day opened the next book after a close; +6 days with an open book gave the stale notice, nothing closed itself. +30 days not run. |
| DV-03 | **FAIL** | R1-DV-03-today, R1-DV-03-save-attempt | Phone clock 7 days behind the book's open day: "This phone's date looks wrong" notice shows, but the six entry tiles are live and a Rs 2 sale was saved (DB +1). Catalog expects entries refused. See QA-06. |
| DV-06 | PARTIAL | R1-DV-06-after-midnight | After 00:00 the stale notice appeared and the add tiles were withdrawn. The 23:59 sale did not save (my tap missed), so "23:59 lands on the old day" is unproven. |
| LG-02..05, DV-09 | BLOCKED | - | Not run (time). |
| AU-*, SY-02..12, ST-*, PA-*, RP-*, DV-02, DV-05, DV-07, DV-08 | BLOCKED | - | Not run: need the fault proxy / PIN / logout flows / storage fill. See final report. |

**MONEY-RECON (all reconciled, integer paise):** with the Rs 1 crore sale in, DB cash_sales(cash) 1,000,027,600 + udhar_collection(cash) 53,000 = Cash received 1,000,080,600 = `+Rs 1,00,00,806.00` (app). Cash paid = expense 6,000 + purchase 12,000 + party_payment 4,000 + withdrawal 20,000 + refund 100 = 42,100 = `-Rs 421.00` (app). Expected = 1,234,500 + 1,000,080,600 - 42,100 = 1,001,273,000 = `Rs 1,00,12,730.00` (app). Net sales 1,000,027,600 + 25,000 + 7,500 - 400 = 1,000,059,700 = `Rs 1,00,00,597.00` (app). Supplier owed 50,000 - 4,000 = Rs 460.00; customers 7,500 - 3,000 - 50,000 - 100 = -Rs 456.00 (see QA-03). No P0 money mismatch found.

## Defects (Round 1)
| ID | Sev | Found in | Summary | Repro | Expected / Actual | Evidence |
|---|---|---|---|---|---|---|
| QA-03 | **P1** | EN-09 | Over-collection accepted: a collection larger than the customer's balance is recorded and drives the balance negative with no warning | Customer owes Rs 45 -> Today -> Collect -> Test Customer 1 -> Rs 500 -> Add | Expected: refused or named as an advance (never a silent negative). Actual: saved; "Owed to you -Rs 455.00", later "Udhar to collect -Rs 456.00"; ledger is append-only so it cannot be undone | R1-EN-09-overcollect, R1-EN-09-today |
| QA-04 | **P1** | EN-04 | A Rs 0 entry can be saved | Sale form -> tap `0` (amount Rs 0.00) -> Add | Expected: Add refused for Rs 0. Actual: a `cash_sales` row with amount 0 is written (button looks disabled but the tap goes through). Append-only, so it stays and counts as an entry on T5 | R1-EN-04-zero-add |
| QA-05 | P2 | EN-10 | List rows do not name their payment mode (HT-6 not fixed) | Expense: add Rs 60 in Cash, UPI, Other, Shop stock, Udhar; Money you took: Rs 200 cash and Rs 50 UPI; Purchase Rs 500 udhar and Rs 120 cash | Expected each line shows its mode. Actual: five identical "Expenses Rs 60.00", two "Taken by owner", two "Purchases - Test Supplier 1" | R1-EN-10-exp-udhar, R1-EN-10-withdrawals, R1-EN-09-purchases |
| QA-06 | **P1** | DV-03 | Phone clock behind the book's open day still lets entries be saved | Set phone clock 7 days before the open book day; open Sale; add Rs 2 | Expected: "date looks wrong" notice AND entries refused. Actual: notice shown, tiles live, entry saved (DB +1). Clock restored afterwards (auto time on) | R1-DV-03-today, R1-DV-03-save-attempt |
| QA-07 | P2 | EN-12 | A refusal message leaks into the next form | Sales -> Udhar with no customer -> Add (refusal shown) -> Back -> Today -> Pay | Expected: fresh form. Actual: Udhar book opens with red "Choose who this is for before adding it." before any tap | R1-EN-09-pay |
| QA-08 | P3 | CL-03/CL-10 | Disabled controls give no feedback | Difference screen: "Close the day" without a reason does nothing; greyed tiles on a closed day do nothing | Expected: say why on tap (HT-27). Actual: silent | R1-CL-03-close-no-reason, R1-CL-10-tap-sale |
| QA-09 | P3 | EN-10 | Udhar-mode expense is accepted with no supplier and "You owe suppliers" does not change | Expense -> Udhar -> Rs 60 -> Add | Intent unclear: a credit expense with nobody to owe. Needs a product decision | R1-EN-10-exp-udhar, R1-EN-10-today |

## UX impressions (shopkeeper, one hand, daylight; high-contrast text ON)
- A1/A2: calm, big targets; the language buttons are the strongest screen. The X0 consent text is long for a first run.
- A3/A4: keypad tiles are large (about 330 x 150 px), good. Keypad position differs per screen (y 1291 / 1731 / 1512), so muscle memory will not carry across.
- X1 asks 4 questions on one scroll; the keypad pops up mid-page and the amount echo (`Rs 12,345.00`) is clear.
- Today: the primary action is "Continue day close", not "Sale"; the Sale/Credit/Purchase tiles start half-hidden under the tab bar. For a daily cash-and-credit book the first thumb target is wrong. Negative numbers (`-Rs 456.00` udhar to collect) appear with no explanation.
- Entry forms: Add is small and top-right (hard for a right thumb); Clear sits next to 0, so a mis-tap loses the amount. List rows do not say Cash vs UPI (QA-05).
- Return/exchange sale picker: 60 identical lines with no time, so a real shop cannot find the sale to return.
- Day close (T5/T11/T12/T13/T14): the cash working is correct and reassuring ("It matches. Every rupee in the box is in the book."), but T11's working list is squeezed into a 5-line window above the count; the selected reason is shown only by a thin orange border; the disabled Close button gives no reason.
- Odia/Hindi render without tofu; copy is a draft (H13), wording not judged.
- A vivo floating ball overlays the right edge of every screenshot (OEM overlay, not the app). One owner calendar notification and the owner's wallpaper photo appeared on screen once; those two screenshots were deleted, not kept.

### Round 1 addendum (fault proxy, logout, session)
A 40-line fault proxy (scratchpad `proxy.cjs`, listens on 8788, modes pass / blackhole / drop-response / status:N on `/v1/sync/*`) was built for SY-02/03/04 and removed afterwards; `adb reverse tcp:8787 tcp:8787` and the phone clock (auto time ON, Asia/Kolkata) are restored. Proxy log lines were used as the timing evidence.

| ID | Result | Evidence | Notes |
|---|---|---|---|
| SY-02 | PASS | R1-SY-02-after-90s | Blackhole on `/v1/sync/push`: UI stayed responsive for 90 s of tab switching; "1 waiting to sync". Requests at 05:50:09 and 05:51:39 (about 60 s timeout + 30 s backoff), next at 05:53:40 (120 s) once `pass` returned; row landed exactly once. |
| SY-03 | PASS | R1-SY-03-after-drop | `drop-response` (server committed, phone never heard): DB had the row at once; the retry ~48 s later resent the same id and the count stayed 1. |
| SY-04 | PASS | R1-SY-04-today-queued | 10 sales queued under blackhole ("10 waiting to sync"), then 503/pass flapping every 3 s for ~96 s, then pass: 10 rows, 10 distinct ids, no duplicates, none lost. Cash received matched (31 + 130 = 161). |
| AU-06 | PASS | R1-AU-06-other-number | Logged out, typed +91 99999 00002: refused before any SMS ("The book on this phone belongs to a different number, so you were not signed in. Sign in with that number."); no new `DEV-OTP` line, still 1 user / 1 shop. Banner text is clipped under the header at font 1.0 (QA-10). |
| AU-09 | PASS (partial) | R1-AU-09-A8, -after-logout, -resignin | A8 says "Everything is saved. Nothing will be lost." Back cancels; double-tap Log out gave one logout, number pre-filled, entries stayed 103. Re-sign-in with the same number returned to the same shop with the same figures. Offline-revoke variant (device revoked in SQL) not run. |
| ON-05 (consents) | PASS | - | `consents` has 1 row (the mandatory purpose); optional purposes stayed unticked. |
| SY-07 (reject-one) | BLOCKED | - | Proxy does not rewrite push answers; parking path not exercised. |
| CL-08, CL-09 | BLOCKED | - | Not run (time). |

Logcat over the whole run (`R1-logcat-full.txt`): no `FATAL EXCEPTION`, no `AndroidRuntime` error, no ANR. Only warnings: `new NativeEventEmitter()` called without `addListener` / `removeListeners` (React Native bridge noise).

| ID | Sev | Found in | Summary | Repro | Expected / Actual | Evidence |
|---|---|---|---|---|---|---|
| QA-10 | P3 | AU-06 | Refusal banner clipped under the header | Log out, type a different number, Send code | Expected: the whole sentence visible. Actual: first line "The book on this phone belongs to" is cut off by the header | R1-AU-06-other-number |

Process notes for the CTO: the phone's owner wallpaper photo and one calendar notification (with the owner's email address) were captured in three early screenshots; those three files were deleted. The `Back` key exits the app from Today (normal Android) and some `Back` presses from Settings subscreens land on the launcher, so scripted flows should check the foreground app after every Back. Today's layout changes height depending on the notice/sync line, so coordinate scripting is fragile; use fresh screenshots.
