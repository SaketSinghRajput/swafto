# SWAFTO Retail Desk - live demo test on Galaxy A36

Date 2026-11-20 (12:17-12:45 device time). Device `RZGL81NM4AH` (SM-A366E, Android 17, Airtel mobile data).
Build: `app-debug.apk` pointed at `https://api.rohinova.com` (debug build; logcat shows it probing a Metro packager on localhost:8081, harmless but it is a debug build).
Data: synthetic only (shop "Test Store QA", "Test Customer One", "Test Supplier One"). Demo number signed in ONCE. One wrong code tried, on 98765 00001 only.
Evidence: `qa/swafto-retail-desk/evidence/live-demo-a36/` (screenshots j1..j6, `logcat-j1-4-errors.txt`).
Note: screenshots include the phone status bar, which shows some notification icons of other apps. Nothing else of other apps was opened.

## STOPPED EARLY: USB link lost at about 12:45

The phone vanished from `adb devices` while I was opening Settings (journey 7), and did not come back after an adb server restart and about 2 minutes of polling. I did not change any device setting (airplane mode was never toggled, no font/rotation/date changes), so the phone should still be online. The demo account was signed in at the last observation. I cannot verify that now.

NOT RUN: journey 6 airplane-mode sync test, rotation, Hindi/Odia clipping, PIN lock/unlock; journey 7 (Signed-in phones, new-phone banner). Journey 1 "app-lock PIN" was NOT SEEN (see S3-5). Only the kill/relaunch part of journey 6 ran.

My own mistake: I closed the day (journey 4) before the interruption tests. Today is then read-only, so "add entries while offline" was impossible afterwards. Next session: do interruptions and offline entries BEFORE closing the day.

## Journey results

| # | Journey | Result | Time (wall clock, includes my tool/debug overhead) | Screenshots |
|---|---|---|---|---|
| 1 | Install, language, consent, sign in, shop setup | PASS, except PIN not seen | about 8 min (pure flow about 2 min). Code verify about 2 s. | j1-03 .. j1-20 |
| 2 | Cash, UPI, udhar new customer, supplier payment, withdrawal, correction | PASS with defects | about 6 min for 7 entries. Each Add saved in under 1 s. | j2-01 .. j2-31 |
| 3 | Ledger, find customer, repayment | PASS | about 2 min | j3-01 .. j3-04 |
| 4 | Close day, cash count, closed day frozen | PASS | about 4 min (about 1.5 min without my mis-taps) | j4-01 .. j4-14 |
| 5 | Reports | PASS (matches Today) | about 2 min | j5-01 .. j5-03 |
| 6 | Interruptions | PARTIAL (kill/relaunch only) | cold start 1.0 s to window, about 3-5 s to content | j6-01, j6-02 |
| 7 | Signed-in phones | NOT RUN (USB lost) | - | - |

### Figures checked by hand (every one matched)
- Opening 5,000; cash sale 250 gives box 5,250. UPI sale 400 left box at 5,250 (rule D2 holds).
- Udhar 700 to a new customer: no cash change, customer owes 700. Pay-supplier 300 (no dues, so the app asked "Record as advance?"): box 4,950.
- Wrong cash sale 5,000, then refunded via Return (Refund cash), then correct 500: box 5,450. Sales today 1,850 = 250+400+700+500.
- Withdrawal 1,000 cash: box 4,450, sales unchanged. Repayment 300: box 4,750, customer owes 400.
- Cash count: "Should be" 4,750 = 5,000+5,750+300-300-1,000-5,000. Short count 4,700 gave -50 with a "check UPI app, recount" warning and a Count again link. Exact 4,750 gave "It matches".
- Day closed: Estimated profit 1,850, withdrawal 1,000 shown separately with "not counted against profit" (rule D3 holds). Reports match Today.
- Closed day: Collect on the customer gave "Today is closed. Post a correction instead." Correction screen says it is booked to the next business day.
- Logcat: no FATAL, no JS error, and no phone number, name or code in the log (grep: 0 hits).
- Double-tap on Add (udhar 700): one entry only.

## Defects

### S2
**S2-1 Pay supplier keeps the CUSTOMER as the supplier and says "you owe".**
Repro: Today, Udhar sale, Add new customer "Test Customer One", Add udhar 700. Tap "Pay supplier" in the bottom switch. The Supplier box still shows Test Customer One, "you owe ₹700.00", with the credit-sale row in the list. Header says "You owe suppliers ₹0.00".
Expected: the party resets when the mode changes (supplier list is empty, "Choose the supplier").
Why S2: a shopkeeper can pay a "supplier" that is really a customer, and the screen shows a debt in the wrong direction. I did NOT press Add against that party, so a wrong save is not proven.
Evidence: j2-11-paysupplier-mode.png.

### S3
1. **A returned entry still looks live.** After refunding the wrong ₹5,000 sale, Sales shows "Total so far ₹1,350" but the list still shows the ₹5,000 row. Day-close shows "Cash sales, 3 entries, ₹5,750" (gross, includes the returned 5,000) and the cash-check shows both "+5,750 cash sales" and "-5,000 refunds". The maths is right but a shopkeeper cannot see why. Evidence: j2-28, j4-01, j4-05.
2. **No simple way to fix a typo.** There is no edit, void or long-press on an entry. The only open-day route is "Return or exchange", which tells the user "you confirm these goods came back". A mistyped amount is not a returned good. Evidence: j2-20, j2-21, j2-26.
3. **After close, "Post a correction" is buried** at the very bottom of the closed Today, below the fold. It only says "Amount missed" (adds). It cannot reduce an over-entered amount. The block message ("Post a correction instead") does not point to where it is. Evidence: j4-11, j4-12, j4-13, j4-14.
4. **Sign-in copy and wrong-code dead end.** First sign-in screen said "We will send a six-digit code" with a "Send code" button. After the next screen load it said "the eight-digit (invite) code SWAFTO gave you" with "Next". The code boxes are 8. The screen changed under me, apparently after the server config arrived. A wrong code lands on a full screen titled "OTP problems" ("Ask SWAFTO for a new code") with no Try again button, only Back, and no way to ask. A semi-literate user will not know what OTP means. The uniform "code doesn't match" itself is correct. Evidence: j1-05, j1-09, j1-14.
5. **App-lock PIN never offered.** After sign-in and shop setup the app went straight to Today. I did not find a PIN prompt (Settings not reached, so I cannot say if it is there). Journey 1 asked for it. Needs a retest.
6. **Ledger "You owe suppliers -₹300.00"** versus Today "Advance ₹300.00" for the same supplier. A negative "you owe" is unclear. Evidence: j3-01.
7. **Today layout on a 1080x2340 screen.** The header, sync chip and four tiles stay pinned and use about 45% of the screen. Content scrolls in a narrow strip. "Continue day close" ends up under the tab bar and my tap at its reported position hit the Ledger tab instead. Settings and Privacy are at the very bottom. Evidence: j2-16, j2-17.
8. **Draft lost on process death.** I typed 123 in the correction amount, pressed Home, ran `am kill`, relaunched. The app returned to Today root, with no draft. Nothing half-typed was saved (good). Evidence: j6-01, j6-02.

### S4
1. Five-option switches (Expense modes; Return settle states) are drawn in a pill that overflows: the selected chip sticks out of the container. Evidence: j2-18, j2-26.
2. The old "Saved ₹700.00, Udhar" banner stays after switching to Pay supplier.
3. The consent screen has no link to the privacy policy.
4. The cash count shows "Should be" before the shopkeeper counts, which invites copying the number instead of counting.
5. First launch after install: the splash stayed up for about 40 s in my first run (single observation, may be first-run warm-up on a debug build). Later cold starts were fast.
6. "Sale" tile opens a screen called "Sales" with "Add items to a sale" and "Return or exchange" links, plus "Udhar sale" and "Pay supplier" sharing one screen with Collect. Learnable, but the names change between screens.

## Logcat excerpt (journeys 1-5, full file in evidence folder)
```
E Adreno-AppProfiles: QSPM AIDL service doesn't exist
W unknown:ReactNative: The packager does not seem to be running ... Failed to connect to localhost/127.0.0.1:8081
E com.swafto: Unable to open libpenguin.so: dlopen failed: library "libpenguin.so" not found.
I ReactNativeJS: Running "SWAFTO"
```
No FATAL or JS exceptions. The three E/W lines are Samsung/debug noise, not app faults.

## UX friction a real shopkeeper would hit
- Amount keypad is large and clear. Saving is instant, and the "Saved" chip is reassuring. This is the strongest part.
- Money words are inconsistent (Sale / Sales / Cash sales, Pay / Pay supplier / Paid to suppliers, Taken by owner / Money you took / Personal withdrawal). A withdrawal is found only inside the day-close list; it is not on Today.
- Fixing a mistake means a Return, and a closed day means a hidden correction link.
- English only was tested. Hindi/Odia clipping NOT RUN.

## Verdict: could a real shopkeeper use this today?
Yes for the core daily loop: sale, UPI, udhar, repayment, supplier payment, withdrawal, count and close. All 20+ figures I recomputed were right, D2 and D3 hold, the closed day refuses writes, and the log is clean. Not yet for a non-expert alone: mistakes are hard to fix (S3-1, 2, 3), the Pay-supplier party carry-over (S2-1) can mislead, the sign-in dead end needs a retry path, and offline sync, rotation, Hindi/Odia and the PIN were not tested because the USB link dropped. Re-run journeys 6 and 7 with the day still open.
