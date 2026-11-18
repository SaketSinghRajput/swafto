# Human-tester pass 9 - re-verification of `da39229` (2026-10-26)

Independent tester session for SWAFTO Retail Desk, method per
`.claude/skills/swafto-human-tester/SKILL.md`. A focused re-verification of HT-51, HT-57,
HT-58 and HT-59 from pass 8, not a full exploratory pass. New defects HT-60 and HT-61 are in
`docs/handover/DEFECTS.md` under "Human-tester pass 9". No source file was changed and
nothing was committed.

## Rig verification

| Check | Result |
|---|---|
| Device | `10BE6H031T000BN  device`, iQOO I2219, Android 16 |
| Installed APK | `base.apk` pulled from the phone: md5 `ba53972fc586e32770bb6314f814c313` |
| Built APK | `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`: same md5, written 17:47:17, after HEAD `da39229` (17:44:32 +0530) |
| Screen lock | The device has a PIN. No power or sleep key was sent, Recents, WhatsApp, the share sheet and the notification shade were not opened, and the clock and timezone were not touched. The keyguard (`dumpsys window policy`, `mIsShowing`) was checked before every driver step and never showed |
| API | Lead's dev server on 8787, database `swafto_dev3`; `adb reverse tcp:8787 tcp:8787` |
| Account | `pm clear com.swafto` at 17:50. New shop "Test Store D", +91 90000 00091 (one code sent), opening cash ₹1,000. Premium preview started from S10 at 17:56 ("ends on Monday 9 November 2026"). Items Rice, Dal, Sugar, Oil, Atta, Salt added in Settings → Your items |

## Evidence

`artifacts/device-tests/pass9/` (git-ignored): shots (PNG plus UI XML), `pg-entries.txt` and
`pg-item-lines.txt` (Postgres reads). Shot times below are the file times (IST). No screen
recording was made. A floating round overlay and an edge tab at the right of every shot
belong to the phone's system UI, not the app.

Taps were made by exact label (a scratch helper matched the whole label, so "Add" could not
hit "Add items to a sale" the way it did in pass 8).

## Re-verification

| ID | Result | Evidence |
|---|---|---|
| HT-59 | PASS | Font 1.0, one cash sale ₹100 added. Typed 300 (`h59-a1-typed`, 17:59:25) → "Add items to a sale" → I1 lists only "Cash sales ₹100.00", headed "Optional. Only sales already added are listed, and items never hold up closing the day." (`h59-a2-i1`) → header Back: Amount ₹300.00, Total so far ₹100.00 (`h59-a3-headerback`). Same with hardware Back (`h59-b1-i1` then `h59-b2-hwback`, Amount ₹300.00). Via "Return or exchange a sale" (opens "Choose the sale that came back", `h59-c1-return`): header Back → ₹300.00 (`h59-c2-return-headerback`); hardware Back → ₹300.00 (`h59-c3-return-hwback`). Then header Back to Today and reopen Sales: Amount ₹0.00 (`h59-d2-reopen`, 18:03:04). Postgres after all of it: one entry, `cash_sales` 10000; no 300 entry was ever written. I1 copy no longer says the typed sale is saved |
| HT-51 | PASS, with HT-60 and HT-61 | Font 2.0, two cash sales: "Add items to a sale" `[22,328][1058,482]` and "Return or exchange a sale" are at the top of the body `[0,306][1080,909]` (`h51-t7-20`, 18:13:20). Font 1.3: link `[22,328][1058,482]`, Total so far ₹1,300.00 also in view (`h51-t7-13`). I1 with six items: at 2.0, Rice to Atta in view, Salt and Other below the fold; after one swipe Other was tapped and selected (`h51-i1-20-scrolled`, `h51-i1-20-other-picked`), after a saved line (Rice × 5). At 1.3, Rice to Salt in view and Other partly (`h51-i1-13-before`); Dal picked and saved (`h51-i1-13-after`). But at 2.0 the Sales running total is now the thing out of view (HT-60), and at 1.3 and 2.0 the picked item drops out of view once the keypad opens (HT-61) |
| HT-57 | PASS | Font 1.0. Test Customer 1 (no phone) → P2 → "Add a mobile number for reminders" → 9000000092 typed, keyboard up (`mInputShown=true`): Save number `[640,1039][992,1193]`, above the footer `[0,1196][1080,1570]` and visible in the shot (`h57-a1-typed-kbd`, 18:23:31). One tap saved it (`h57-a2-after-1tap`; Postgres `parties.phone` 9000000092). Test Customer 2: 9000000093 typed, keyboard up, then the IME action sent as `KEYCODE_ENTER` (not a tap on the on-screen ✓ key): saved, keyboard closed (`h57-b2-after-done`; Postgres `parties.phone` 9000000093) |
| HT-58 | PASS | Font 1.0, sale ₹1,200.00: "Items recorded for ₹0.00 of the sale" wraps and the wrapped "₹1,200.00" starts at x=88, the same left inset as "Items recorded for" (x=88) and "Cash sales" (x=88) (`h58-i1-10-1200`, 18:08:41). For the ₹100.00 sale the line fits on one row (`h58-i1-10-noitems`) |

Figures read on the way and checked by hand: Total so far ₹1,300.00 = 100 + 1,200; Owed to
you ₹650.00 = 400 + 250; "Items recorded for ₹500.00 of the sale ₹1,200.00" after Rice × 5
at ₹500. Postgres (`pg-entries.txt`, `pg-item-lines.txt`): entries cash 10000, cash 120000,
udhar 40000, udhar 25000; item lines Rice 5 / 50000 on the 120000 sale, Dal 1 / 10000 on the
10000 sale.

## New defects

HT-60 and HT-61, both P3. See `DEFECTS.md`.

Seen, not filed: on I1, Save item stays disabled with an amount but no "How many"
(`h58-i1-10-saved`, `How many: –`, `enabled="false"`); `I1.tsx` requires both by design. No
message says why the button is off.

## Not covered, and why

- Charters 1 to 10 in full: not asked for.
- The on-screen ✓ key of the keyboard was not tapped (it is another app's window); the IME
  action was sent with `KEYCODE_ENTER`.
- HT-51 in Hindi and Odia: not tried.
- HT-59 after process death or Home with a typed amount: not asked for; not tried.
- The day was left open (no close was needed).

## Device and rig state at the end

- `font_scale` 1.0. `svc wifi enable` and `svc data enable` sent (wifi_on = 1).
  `adb reverse tcp:8787 tcp:8787` in place; a `curl` from the phone to `/privacy` returned
  200. Clock, timezone, rotation and night mode untouched.
- The app is installed and signed in as Test Store D (+91 90000 00091), on the party page of
  Test Customer 2, day 26 October open. The previous local book (Test Store C) was wiped by
  `pm clear`; its server rows are untouched.
- `swafto_dev3` gained shop "Test Store D": four entries, two item lines, six items,
  customers Test Customer 1 (9000000092) and Test Customer 2 (9000000093), a Premium preview
  to 9 November 2026.
- The keyguard never showed. Nothing was committed.
