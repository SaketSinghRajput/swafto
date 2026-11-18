# Human-tester pass 10 - re-verification of `3d39ba7` (2026-10-26)

Independent tester session for SWAFTO Retail Desk, method per
`.claude/skills/swafto-human-tester/SKILL.md`. A focused re-verification of HT-60 and HT-61
from pass 9 and of the I1 "How many" hint, not a full exploratory pass. No new defect was
found, so `docs/handover/DEFECTS.md` is unchanged. No source file was changed and nothing was
committed.

## Rig verification

| Check | Result |
|---|---|
| Device | `10BE6H031T000BN  device`, iQOO I2219, Android 16 |
| Installed APK | `base.apk` pulled from the phone to `artifacts/device-tests/pass10/base.apk`: md5 `c97f1a6945c7cc5a09a41c064d12f344` |
| Built APK | `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`: same md5, written 19:53:06, after HEAD `3d39ba7` (19:52:11 +0530) |
| Screen lock | The device has a PIN. No power or sleep key was sent; Recents, WhatsApp, the share sheet and the notification shade were not opened; clock and timezone were not touched. The driver checked the keyguard (`dumpsys window policy`, `mIsShowing`) and that `com.swafto` had focus before every step; the keyguard never showed |
| API | Lead's dev server on 8787, database `swafto_dev3`; `adb reverse tcp:8787 tcp:8787` |
| Account | Still signed in as "Test Store D" (+91 90000 00091) after the install; no code was sent. Day 26 October open. Today read: Opening cash ₹1,000.00, Cash received +₹1,300.00, Expected in box ₹2,300.00 (= 1,000 + 1,300), Net sales ₹1,950.00 (= 1,300 + 650), Udhar to collect ₹650.00 (`p10-00-launch`) |

## Evidence

`artifacts/device-tests/pass10/` (git-ignored): shots (PNG plus UI XML), `pg-entries.txt`,
`pg-item-lines-1.txt`, `pg-item-lines-2.txt` (Postgres reads). Shot times are IST. No screen
recording was made. A floating round overlay and an edge tab at the right of every shot are
the phone's system UI, not the app. Taps were made by exact label with a scratch driver.

Each font change restarted the app on Today; that is the documented cost of the HT-35 fix
(a fresh process on a scale change), not a new defect.

## Re-verification

| ID | Result | Evidence |
|---|---|---|
| HT-60 | PASS | Light (Comfort) display, Day close → Cash sales. Font 1.0: "Add items to a sale" `[22,306][529,478]`, "Total so far ₹1,950.00" at y 478-564, all four sale rows and Amount/Add in view (`h60-10-comfort`, 19:56:08). Font 1.3: link `[22,306][529,528]`, total at y 528-639 (`h60-13-comfort`, 19:57:03). Font 2.0: link `[22,306][529,687]`, total "₹1,950.00" `[616,687][1014,858]`, visible in the shot above the Amount footer; the per-sale rows are below the fold (`h60-20-comfort`, 19:57:59). ₹1,950.00 = 100 + 1,200 + 400 + 250 |
| HT-60, Focus ("Dark, bigger text") | Recorded, not filed | Font 1.3: total at y 700-829, in view (`h60-13-focus`, 20:01:01). Font 2.0: the body ends at y=734 and "Total so far" starts at y=786, so the total is out of view without scrolling (`h60-20-focus`, 20:00:29). This is the known open Focus trade-off |
| HT-61 | PASS | Font 1.3, ₹400 udhar sale (Test Customer 1): pick Sugar → "Sugar" shown in the fixed footer `[44,926][1036,1037]` above How many / Amount (`h61-13-sugar-picked`). Typed Amount 150, How many 2 (`h61-13-typed`). "Change" → no item selected, "Which item?" list back, Save item disabled (`h61-13-changed`). Pick Oil → footer "Oil", "How many: 2", "₹150.00" kept (`h61-13-oil-picked`). Save → "Oil × 2 ₹150.00", "Items recorded for ₹150.00 of the sale ₹400.00" (`h61-13-saved`, 20:05:52). Font 2.0, ₹250 udhar sale (Test Customer 2): scroll, pick Salt → footer "Salt" `[44,755][1036,882]` (`h61-20-salt-picked`). Amount 60, How many 3 (`h61-20-typed`). Change → selection cleared (`h61-20-changed`); pick Atta → footer "Atta", "How many: 3", "₹60.00" (`h61-20-atta-picked`). Save → "Atta × 3 ₹60.00" (`h61-20-saved`). Postgres (`pg-item-lines-2.txt`): new lines Oil 2 / 15000 on the 40000 udhar sale (14:35:44 UTC) and Atta 3 / 6000 on the 25000 udhar sale (14:39:11 UTC); no Sugar or Salt line |
| I1 hint | PASS | Font 1.3, Sugar picked, Amount 150 typed, How many empty: "Type how many" `[44,1265][466,1376]` in place of "How many: –", Save item `enabled="false"` (`hint-13-amount-only`). Font 2.0, Salt, Amount 60: "Type how many" `[44,1143][535,1270]`, Save item disabled (`hint-20-amount-only`). Typing How many then enabled Save item at both sizes |

Postgres `pg-entries.txt`: still four entries (cash 10000, cash 120000, udhar 40000, udhar
25000); the item-line saves wrote no entry.

## New defects

None.

## Not covered, and why

- Charters 1 to 10 in full: not asked for.
- I1 in Focus, and HT-60 / HT-61 in Hindi and Odia: not asked for; not tried.
- HT-61 and the hint at font 1.0: not asked for (the fix targets 1.3 and 2.0).
- The day was left open (no close was needed).

## Device and rig state at the end

- `font_scale` 1.0 (read back). `svc wifi enable` and `svc data enable` sent (`wifi_on` = 1).
  `adb reverse tcp:8787 tcp:8787` in place; a `curl` from the phone to `/privacy` returned 200.
  Clock, timezone, rotation and night mode untouched. The app's display setting is back on
  Light, language English.
- The app is installed and signed in as Test Store D (+91 90000 00091), day 26 October open.
- `swafto_dev3` gained two item lines for Test Store D (Oil × 2 ₹150 on the ₹400 udhar sale,
  Atta × 3 ₹60 on the ₹250 udhar sale). No entries, parties or codes were added.
- The keyguard never showed. Nothing was committed.
