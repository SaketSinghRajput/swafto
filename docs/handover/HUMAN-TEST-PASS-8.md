# Human-tester pass 8 - re-verification of `72aeb27` (2026-10-26)

Independent tester session for SWAFTO Retail Desk, method per
`.claude/skills/swafto-human-tester/SKILL.md`. A focused re-verification of HT-49 to HT-55
from pass 7, not a full exploratory pass. Defects HT-57 to HT-59 are in
`docs/handover/DEFECTS.md` under "Human-tester pass 8". No source file was changed and
nothing was committed.

## Rig verification

| Check | Result |
|---|---|
| Device | `10BE6H031T000BN  device`, iQOO I2219, Android 16 |
| Installed APK | `base.apk` pulled from the phone: md5 `86acb48e1e64f7dca56ea28d419cb5b0` |
| Built APK | `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`: same md5, written 15:49:26, after HEAD `72aeb27` (15:47:41 +0530) |
| Screen lock | The device has a PIN. No power or sleep key was sent, the Recents key was not used, and the clock and timezone were not touched. The keyguard (`dumpsys window policy`, `mIsShowing`) was checked before every driver step and never showed |
| API | Lead's dev server on 8787, database `swafto_dev3`; `adb reverse tcp:8787 tcp:8787` |
| Account | App data cleared at 15:52. New shop "Test Store C", +91 90000 00081, opening cash ₹1,000. One code was sent to that number in this pass (the dev log already held two earlier sends to it, from before this pass). Premium preview started from S10 at 15:57 |

## Evidence

`artifacts/device-tests/pass8/` (git-ignored): shots (PNG plus UI XML), `ht49-pg-days.txt`
and `pg-entries.txt` (Postgres reads). Shot times below are the file times (IST). No screen
recording was made this pass. One shot of the launcher, taken by mistake before the app was
opened, was deleted at once. WhatsApp, the share sheet and the notification shade were
never opened.

## Re-verification

| ID | Result | Evidence |
|---|---|---|
| HT-49 | PASS | Should be ₹1,300.00 (1,000 + 300 cash; the ₹50 UPI and ₹400 udhar sales are left out, D2). Counted ₹1,350 → "Counted wrong" selected (`ht49-countedwrong`, 16:19:02) → Back → Clear → ₹1,300 → "It matches." (`ht49-exact`) → Close the day. T14: "Difference +₹0.00", no reason (`ht49-t14`, 16:20:13). R1 Cash checks: "Matched 1 of 1 days", and the day row reads "Monday 26 October +₹0.00" with no reason (`ht49-r1-cashchecks4`, 16:22:24). Postgres: `counted_cash` 130000, `difference_reason` null (`ht49-pg-days.txt`) |
| HT-50 | PASS | S9: "Rice" typed with the keyboard up (`mInputShown=true`), one tap on Add to list adds it, and the keyboard stays up (`ht50-s9-after-1tap`, 16:00:28); Dal and Sugar the same; Postgres `items` holds all three. P2: with the keyboard up and Save number in view, one tap saved it (`ht50-p2-after-visible-1tap`, 16:05:14); Postgres `parties.phone` = 9000000082. Before that, with the keyboard up the Save number button was hidden behind the fixed footer, so the first tap closed the keyboard and saved nothing: HT-57 |
| HT-51 | PARTLY FAILS | Items in a sale: the item choices were visible and selectable at font 1.0 (`ht51-i1-10-before`, `-after`, `-dal-picked`), at 1.3 (`ht51-i1-13-before`, `-after`, `-other-picked`) and at 2.0 (`ht51-i1-20-before`, `-after`; Other ends at y=1978 in a body running to 2117), each before and after a saved line. **At 2.0 the Sales form's "Add items to a sale" link is still out of view**: the body scroll is `[0,306][1080,909]` and the link is `[22,895][1058,909]`, a 14 px strip at its foot (`ht51-t7-20`, 16:13:39). It comes into view only after scrolling that 603 px strip (`ht51-t7-20-scrolled`) |
| HT-52 | PASS | Closed day → Ledger → Test Customer 1 → New udhar sale: no keypad opens; the party page shows "Could not do that · Today is closed. Post a correction instead." (`ht52-closed-udhar`, 16:25:05). Record a collection does the same (`ht53-refuse2`) |
| HT-53 | PASS | After the HT-52 banner: one tap on the header Back → Parties (`ht53-headerback-1`); reopening the party page shows no banner (`ht53-reopen-party`); after a second banner one hardware Back → Parties (`ht53-hwback-1`). After the offline privacy banner on Today, one hardware Back left to the launcher, and the reopened Today has no banner (`ht53-reopen-after-privacy`). After the offline deletion banner on S8: one header Back → S7 (`ht53-delete-headerback`), and again with one hardware Back (`ht53-delete-hwback`). After the wrong-shop banner on A3: one header Back → A2 (`ht53-wrongshop-headerback`); going forward again A3 had no banner (`ht53-a3-again`); one hardware Back → A2 (`ht53-wrongshop-hwback`) |
| HT-54 | PASS (all three) | Offline (wifi and data off, `adb reverse --remove`; a `curl` from the phone to `localhost:8787` returned 000; the app was force-stopped and restarted after the reverse was removed so no open connection was left). Privacy link on Today: "Could not do that · Could not reach the server, so what you agreed to cannot be shown. Try again with signal." (`ht54-privacy-offline`, 16:27:46). Delete everything: "Could not do that · No connection, so nothing was deleted - not on this phone and not on our server." (`ht54-delete-offline`); Postgres `deletion_requested_at` null. Online again, logged out, signed in as +91 90000 00083: "Could not do that · The book on this phone belongs to a different number, so you were not signed in." (`ht54-wrongshop`, 16:31:53); no SMS to that number in the dev log, no `users` row |
| HT-55 | PASS | Day one, Premium, before the close: Ask "sales yesterday" → "Understood as: Sales · yesterday. Nothing is recorded on this phone for that time. On Sunday 25 October." No ₹0 (`ht55-ask-yesterday`, 15:58:40). After the close, M1: "Rice: sold on 1 day in 90", "Sugar: sold on 1 day in 90", "Dal: sold on 0 days in 90" (`ht55-m1-5`, 16:24:24). Not rechecked: C1 Top items' period start (the third part of HT-55). M1 still says "in 90" for a shop one day old; the lead's check did not ask about that |

Figures read on the way and checked by hand: T14 net sales ₹750.00 = 300 + 50 + 400;
estimated profit ₹750.00 (no purchases or expenses); M1 "Items are recorded for 47% of
sales value" = (200 + 100 + 50) / 750 = 46.7%. Postgres holds exactly three entries
(udhar 40000, cash 30000, UPI 5000) and three item lines (`pg-entries.txt`).

## New defects

HT-57, HT-58 and HT-59, all P3. See `DEFECTS.md`.

## Not covered, and why

- Charters 1 to 10 in full: not asked for; this pass re-verified seven defects only.
- HT-50 on C1, and the keyboard's own Done key on P2: not tried.
- HT-51 with a long item list (more than four choices): not tried; only Rice, Dal, Sugar and Other.
- HT-59 was seen once and could not be repeated, because the day was closed by then (the clock may not be moved, so no new day could be opened).
- The signed-out in-app deletion route: not looked for again (pass 7 found none on A1 to A7).
- Signing back in to +91 90000 00081 after the wrong-shop test: not done, to save a code send.

## Device and rig state at the end

- `font_scale` 1.0. Wifi on (`svc wifi enable`), `svc data enable` sent. `adb reverse tcp:8787 tcp:8787` is in place, and a `curl` from the phone to `/privacy` returned 200. The clock, timezone, rotation and night mode were not touched.
- The app is installed and signed out, on A2 (language). Its local book still holds Test Store C (+91 90000 00081).
- `swafto_dev3` gained shop "Test Store C" (+919000000081): 26 October closed with `counted_cash` 130000 and no difference reason; three entries, three item lines, items Rice, Dal and Sugar, customer Test Customer 1 (phone 9000000082), a Premium preview to 9 November 2026.
- The keyguard never showed. Nothing was committed.
