# Human-tester pass 6 - R5 Free and Premium (2026-10-26)

Independent tester session for SWAFTO Retail Desk, method per
`.claude/skills/swafto-human-tester/SKILL.md`, against the R5 plan
(`docs/research/R5-free-premium-plan.md`). The pass ended early: the phone locked
itself with its PIN at about 09:31 (see "How the pass ended"). Defects HT-36 to HT-48
are in `docs/handover/DEFECTS.md` under "Human-tester pass 6".

## Rig verification

| Check | Result |
|---|---|
| Device | `10BE6H031T000BN  device`, iQOO I2219, Android 16 |
| Installed APK md5 | `57dc3e575f30e811aea2b948102a24b4` |
| Built APK md5 (`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`) | `57dc3e575f30e811aea2b948102a24b4`, matches |
| APK time vs HEAD | APK 2026-10-26 08:10, HEAD `cb3f5e3` 2026-10-26 08:09:23 +0530. The APK is newer |
| Screen lock | `CredentialType: PIN`. No power or sleep key was sent. Lock_Resume and Sleep_Resume NOT RUN |
| Stay awake | `stay_on_while_plugged_in` = 7 (already set) |
| API | `adb reverse tcp:8787 tcp:8787`, dev server on `swafto_dev2` |

## Evidence

Everything is under `artifacts/device-tests/pass6/` (git-ignored): 94 shots, each a PNG
plus a UI XML, and two recordings.

- `p6-02.mp4` (199 s, starting about 08:30:59): credit limit, the over-limit observation, and the sale saved anyway.
- `p6-03.mp4` (157 s, starting about 08:46:50): R1 basic reports and opening Ask.

Three more recordings (`p6-01`, `p6-04`, `p6-05`) were started but never landed on the
device, so most evidence is the shots. Shot times are wall clock (IST), printed by the
driver at each step.

**Privacy.** During P2 "Share statement" the system share sheet showed the phone owner's
real WhatsApp contacts. That shot was deleted. Twice the phone also ended up inside the
owner's WhatsApp: once at the inbox (after "Remind on WhatsApp"), and once in a
third-party chat (after closing the share sheet with Back; how it got there is not known).
Each time the tester left with Back or Home at once. Nothing was typed or sent, and the
chat's UI tree showed no new message. No recording or shot of WhatsApp was kept. The
recordings were stopped before the CSV share sheet opened.

## Coverage

### Free plan (charters 1-3 on new features)

| Feature | Result | Evidence |
|---|---|---|
| Clear data, sign-in, X1 with ₹1,000 opening cash | PASS | `c1-*`, 08:13-08:17 |
| Trading day: cash ₹500, UPI ₹300, udhar ₹400 (new customer, no phone), udhar ₹250 (new customer with phone), collection ₹100 cash, expense ₹50 cash, withdrawal ₹200 | Every figure matched a hand calculation. Expected in box ₹1,600 before expense/withdrawal (D2: UPI and udhar add no cash). T11 Should be ₹1,350. T14 Estimated profit ₹1,500, withdrawal shown apart (D3). Postgres holds all 8 entries | `c2-today2`, `c3-t11`, `c3-t14` |
| T1 "collect today" card | Shows the dues with "Oldest first. Only you see this; nothing is sent to anyone." Copy: "Owing for 0 days" (HT-46). Not shown on a closed day | `c2-collect` |
| P6 credit limit | Limit ₹300 on Test Customer 2 (owing ₹250). Typing ₹100 shows "Test Customer 2's udhar would be ₹350.00, above the limit ₹300.00 you set." Add stays enabled and the ₹100 is saved as typed (owed ₹750 = 400 + 250 + 100) | `c2-limit`, `c2-over`, `c2-over-added`; `p6-02.mp4` 00:47 (saved), 01:36 (observation), 02:32 (added) |
| P2 WhatsApp reminder, no phone | Honest refusal, but no way to add a phone, and the heading says "Not saved" (HT-43) | `c2-tc1`, `c2-tc1-remind` |
| P2 WhatsApp reminder, with phone (+91 90000 00062) | WhatsApp opened at its own inbox, not a chat with the text filled in. The synthetic number is presumably not on WhatsApp, so this is inconclusive. A real number was not used. Nothing was sent. Back from WhatsApp went to the launcher, not back to SWAFTO | not kept (privacy) |
| P2 Share statement | The system share sheet opens with "Test Store / Account of Test Customer 2 / As on 2026-10-26". It was dismissed without sharing | shot deleted (privacy) |
| R1 basic reports | Dues by age (0-30 days ₹650; Test Customer 2 ₹350, Test Customer 1 ₹300), month at a glance (net ₹1,550, profit ₹1,500, taken home ₹200, left in shop ₹1,300), cash checks 1 of 1 matched, confirmed UPI 0 of 1. All correct. "Last month" is all ₹0 rows for a shop that did not exist then (HT-46) | `c4-r1*`; `p6-03.mp4` 00:04 |
| C1 Ask on Free | English "what were my sales today" ₹1,550 (correct); Hinglish "aaj ki bikri kitni hui" ₹1,550 and "kitna udhar baki hai" ₹650; romanised Odia "aji kete bikri hela" ₹1,550 and "box re kete tanka thiba" Expected cash ₹1,350. All correct. "which item sells the most" is taken as "Best day" (HT-39). "how much will I sell next week" is not recognised (HT-42). The thread does not scroll to the newest answer (HT-41). **Devanagari and Odia script were not typed**: `adb shell input text` cannot enter non-ASCII text | `c5-*` |
| S12 accountant CSV | One month listed (October 2026). It opens the share sheet with `swafto-entries-2026-10.csv`. The file (read with `run-as`) has the L-15 line, 8 entry rows and 2 balance rows, all correct | `c7-s12` |
| S1 app lock | Tapping "App lock" opens the phone's own confirm at once. Its title is "SWAFTO is locked" (HT-45). Back cancels it and the lock stays Off. Because the PIN is not ours, the lock could not be turned on, so **the S11 cover on cold start and after more than 5 minutes away was NOT RUN** | `c8-s1` (secure window, black), `c8-s1-back` |
| No stock or inventory | None seen on any screen visited. M1 says "How often each sold here - not what is on your shelf." | `c15-m1c` |
| No pre-fill while typing | Picking an item leaves "How many" and the amount empty. After a save both reset to empty | `c13-rice`, `c13-save200` |

### Premium (via S10 preview)

**BLOCKED on the Lead's server (HT-36).** S10 showed no preview button
(`c9-s10`, `c9-s10b`, `c9-s10c`), and `plan_previews` was empty. The cause is
`tools/dev-server.mjs`: it calls `buildApp` without `billing`, so
`/v1/billing/entitlement` cannot answer, and the app keeps its cached Free plan without
saying anything (`host.refreshPlan`). To carry on, the tester ran a **scratchpad copy**
of the dev server, with `billing: { repo: pgBillingRepo(sql), config:
loadBillingConfig(), play: null, keys: null }` added, on host port 8788 against the
same `swafto_dev2`, and pointed the phone at it with `adb reverse tcp:8787 tcp:8788`.
No file in the tree was changed. The app saw the new signing key, dropped its session,
and showed "Sign in" in Settings. Signing in again with the same number kept the book (A8).

| Feature | Result | Evidence |
|---|---|---|
| S10 | "Try Premium free for 14 days, no payment details" / "It simply ends after 14 days. Nothing is charged, and nothing renews." There is no countdown and no guilt copy. "Buying Premium is not open yet." Buy monthly and Buy yearly are disabled. Two quick taps on the preview: one `plan_previews` row (ends 2026-11-09), and S10 shows "Premium preview ends on Monday 9 November 2026." | `c9-s10-billing`, `c9-preview-started` |
| S9 Your items | Rice and Dal added. "rice" a second time is refused with no reason given (HT-47). An empty name does nothing. The customer notice line is shown | `c11-s9`, `c11-s9-items` |
| Day boundary (charter 10) | Device clock moved +24 h (`cmd alarm set-time`). Without a restart, Today turned to Tuesday 27 October, OPEN, opening cash ₹1,350 (the counted cash). PASS. Side effect: the server accepted the future-dated day (HT-48) | `c12` not saved; `c13-sale-items` |
| I1 items in a sale | Reached from the sales form through "Add items to a sale" after a ₹300 cash sale. Rice x 2 ₹200 and Dal x 1 ₹100 saved, and Postgres `item_lines` has 2 rows (20000, 10000). A line over what is left of the sale is refused, but the message is wrong (HT-37). The How many / Amount switch is below the fold (HT-38). Killing the app mid-line (`am kill` while in the background) returns to Today. The half-typed line is lost and nothing is saved twice (still 2 rows) | `c13-*`, `c14-i1-kill` |
| M1 dashboard | Forecast: "After 14 closed days, 1 so far", with "An estimate ... never a promise". Last year: "No closed day on these dates last year yet." Festival weeks: none yet. Items: Rice ₹200, Dal ₹100. "Items are recorded for 16% of sales value" (300 / 1,850 = 16.2%, correct). "Bought together" waits for 200 sales. TSB "needs 8" days. All honest. Copy plurals (HT-46) | `c15-m1*` |
| C1 on Premium | Follow-up chips are offered. "which item sells the most" is still "Best day" (HT-39). "sales yesterday" is answered as "Best day · yesterday" (HT-40). "how much does Test Customer 2 owe" is not resolved, though the name was typed exactly (HT-42) | `c16-*` |

### Not covered, and why

- **Charter 4** (log out and Back, different number, delete account): NOT RUN, because the phone locked. Only one forced re-sign-in, which kept the book.
- **Charter 5** on the new screens: only `am kill` on I1. Home, Recents, rotation and force-stop on S9, S10, S12, M1 and C1 were NOT RUN.
- **Charter 6** (hammering): only the double tap on the preview. NOT RUN elsewhere.
- **Charter 7** (offline): NOT RUN.
- **Charter 8** (font 1.3 and 2.0, dark mode, Hindi and Odia layout on the new screens): NOT RUN.
- **Charter 9** (compliance and logcat): NOT RUN.
- **S1/S11** cover: NOT RUN, as the device credential is not ours.
- **C1 in Devanagari and Odia script**: not typeable over adb.

## How the pass ended

At 09:31 the driver failed with "uiautomator produced no hierarchy" and "device still
authorizing". At 12:06 the phone was on its PIN keyguard (`isKeyguardShowing=true`,
`deviceLocked=1`; shot `c16-q4` is the keyguard). The driver had typed the letters
"upi sales this week" and a keyevent 111 at it. That string has no digits, so no PIN
attempt was made. No power or sleep key was sent at any point. **The likely cause is the
tester's own +24 h clock change.** Android asks for the credential again after a long
enough gap since the last strong authentication. That cause is inferred, not shown. Per
the Lead's instruction the tester stopped and did not try to unlock.

## Device and rig state at the end (restored)

- Clock: `auto_time` back to 1. The clock was set back to the host's time (device and host both read 12:07 on 26 Oct).
- `adb reverse tcp:8787 tcp:8787` is restored. The scratchpad server on 8788 is stopped. The Lead's server on 8787 still answers.
- `font_scale` 1.0, unchanged. Airplane mode, wifi and data were not touched.
- **The phone is locked with its PIN. It needs the owner.**
- **The app's session was signed by the scratchpad server's key**, so against the Lead's server it will ask to sign in again. The book is on the phone.
- **`swafto_dev2` now holds** a closed 2026-10-26, an open **2026-10-27** (future-dated) with one ₹300 cash sale and 2 item lines, a `plan_previews` row ending 2026-11-09, items Rice and Dal, and a credit limit of ₹300 on Test Customer 2. Expect the phone, back on real time, to hold a day that is ahead of today.
- Nothing committed. No file under `apps/`, `packages/`, `tools/` or `test/` was changed.
