# Device review: human-tester pass 3, 2026-10-25

**Purpose:** re-verify on the device the Lead's fixes for pass 2 (commit `89f33a7`).
**Device:** iQOO I2219, Android 16 / SDK 36, high-contrast text on. Screen lock PIN: no
power or sleep key was sent. **Build:** installed `base.apk` md5
`597263c165122cf2d986ccf621b9be85` equals `app-debug.apk`, written 18:10:25 IST, after
`89f33a7` (18:09:35). **API:** restarted about 18:12 on the fixed code; it died and was
restarted again about 18:20 with a new signing key (the coordinator's rig note), so the
phone's session got a 401 and showed A6 once (`p/a6`). That is the rig. Every check that
straddled it was re-run after signing in again.
Recordings and shots are under `artifacts/device-tests/human3/p/` (git-ignored). Times
are derived (shot time minus recording start), not read off a player; "shot" means only
a screenshot and UI dump exist for that step.

## Results

| ID | Result | What was seen |
|---|---|---|
| HT-5 (server) | PASS | `curl` POST `/v1/auth/otp/request` with `+911234567890` → 400 `{"error":"invalid_phone"}` |
| HT-12 | PASS | Signed in as +919000000061, named "Test Store C", ₹1,000 opening, ₹200 sale (Postgres: 1 entry). Log out → A3 (`p2.mp4` 00:18). Back → A2 → out. Recents card → A3 (01:00). Force-stop + relaunch → A3 (01:10). Home + `am kill` + reopen → A3 (01:43). No screen showed the shop name or a figure; A3 shows only the number. Same number signed in → Today with ₹1,000 / ₹1,200 / ₹200 (02:20) |
| HT-13 | PASS, see HT-32 | Log out → +919000000071 (new) → code → X0 → I agree → A3 again → second code → A3 with "Not saved · The book on this phone belongs to a different number, so you were not signed in. Sign in with that number." (`p3.mp4` 02:45). Postgres: the new number's shop has an empty name. Relaunch → A3. Signing in with +919000000061 → the book intact (₹1,200 expected in box) |
| HT-10 | PASS | Closed day (T14 profit ₹200, `days` closed, counted 120000): Today shows Settings and "Privacy and what you agreed to" under the tiles (shot `closed_bottom`); both open (`closed_settings`, `closed_privacy`) |
| HT-14 | PASS | Today → Privacy → SMS on → Save → Today; relaunch → Today. Settings → Privacy and consent → What you agreed to → SMS off → Save → Today. Postgres: `sms_reminders` true 18:28:47, then false (shots) |
| HT-15 | PASS on host; device check stopped by a rig limit | The row now hands off to the browser, but a vivo system password screen (`com.vivo.settings.secret.PasswordActivity`) took over (`p5.mp4` 00:22). Privacy policy did the same this time, so it is the device, not the row. Back returned to the app; nothing typed. Host `curl /licences` → 200, title "SWAFTO open-source licences", 13 mentions of react-native, 6 of OFL / SIL Open Font |
| HT-16 | PASS | Settings → Bright sunlight + हिन्दी → force-stop + relaunch → Today in Hindi, dark; S5 still shows हिन्दी and तेज धूप selected (`p5.mp4` 02:19, 02:30, 02:46) |
| HT-17 | PASS | Sale form, rotation locked to 90°: display stays ROTATION_0, screenshot stays 1080x2408 (`p7.mp4` 00:28) |
| HT-18 | PASS, see HT-34 | font_scale 1.3, server cut with `adb reverse --remove` + `adb kill-server` (sockets in states 05/08, not ESTABLISHED), A3 → Send code: the offline notice shows in full above the keypad (`p9.mp4` 00:14). But it now covers the phone number |
| HT-9 | PASS, see HT-33 | Server cut fully, two sales (₹11, ₹22) → "3 waiting to sync" (`p8.mp4` 00:43). Rig restored 18:39:19, app untouched: still 3 at 18:39:29, "All saved on phone" by 18:39:46 (01:32). Postgres has 1100 and 2200 |
| HT-24 | PASS | Day closed, app in front, `auto_time` 0, clock +1 day at 18:33:51: Today read "Monday 26 October", OPEN, opening ₹1,200 (the count) between the shots at 18:34:03 and 18:34:22 (`p6.mp4` 00:21 to 00:41). Automatic time restored at 18:36; the app stayed on Monday 26 |
| HT-28 | PASS | T5 dump: each skip button is labelled "<section>, Nothing to enter" (UPI sales, Credit sales, Purchases, Expenses, Udhar collected, Paid to suppliers, Taken by owner) (`p4.mp4` 00:11) |
| HT-31 | PASS | Server cut, Today → Privacy link: "Could not reach the server, so what you agreed to cannot be shown. Try again with signal." Its heading still reads "Not saved" (shot `ht31`) |

## Regression look

- A3 and A4 at font 1.0: as before, number field and keypad together (`p9.mp4` 01:00).
- **A3 at font 2.0: the number field is not on screen** while the keypad is; the area
  above the keypad is a 314-pixel scroll box holding the title, explainer and field
  (`p9.mp4` 01:15, 02:11). A4 at 2.0: the six code boxes are cut by the keypad and Resend
  is off screen (01:27). Filed as HT-34 with the 1.3 offline case.
- T3 (closed Today): tiles, Post a correction, Settings, Privacy link all laid out at 1.0.
- S5 in Hindi with Bright sunlight: laid out, both choices visible.
- HT-19 (ruled not a defect by the Lead): `section_skips` again has 0 rows after seven
  skips and a closed day, consistent with that ruling.
- Logcat over this session: no phone number, shop name or token.

## Device settings

Recorded first: font_scale 1.0, night mode yes, accelerometer_rotation 1,
user_rotation 0, auto_time 1, auto_time_zone 1. Changed and restored: font_scale (1.3,
2.0), rotation lock (90°), auto_time (clock +1 day 18:33 to 18:36). All read back at the
start values; device clock 18:46 IST on 25 October. `adb reverse tcp:8787` is in place.
App data cleared at the end (it held a day dated 26 October); the app is installed.
Postgres keeps synthetic shops for +919000000061 (days 25 and 26 October) and
+919000000071 (no name, consent only).
