# Device review: human-tester pass 4, 2026-10-25

**Purpose:** short re-verification of `5b91b38` (HT-32, HT-33, HT-34).
**Build:** installed md5 `76b7952dd612635126938793d3bec0a0` equals `app-debug.apk`
(written 19:08:06). The commit is timestamped 19:11:09, but every source file it changes
was last written between 18:55 and 19:01, before the build, so the APK contains them.
**Rig:** API unchanged since pass 3; server cuts used `adb reverse --remove` plus
`adb kill-server`. The phone has a PIN: no power or sleep was sent. App data cleared first.
Evidence: `artifacts/device-tests/human4/q/` (git-ignored); times derived.

## Results

| ID | Result | What was seen |
|---|---|---|
| HT-34 | FAIL (one case) | Fresh process at each size: A3 at 1.0 (`q1.mp4` 00:37), 1.3 (`a3_13_fresh`) and 2.0 (`a3_20_fresh`) show "+91 90000 00081" directly above the keypad. Offline at 1.3: notice, number, full keypad and a legible "Send code" all on screen (`q2.mp4` 02:12). A4 at 2.0: six boxes above the keypad, Resend and "Trouble?" reached by scrolling (`a4_20`, `a4_20_scroll`). **Offline at 2.0: the notice pushes keys 7, 8, 9, Clear, 0, Delete and Send code off screen, nothing scrolls, and Send code is not in the UI tree** (`q2.mp4` 00:14). He cannot retry without leaving the screen |
| HT-32 | PASS | Signed in as +919000000081, shop "Test Store D", ₹500 opening, ₹70 sale. Log out → +919000000091 → Send code: still A3 with "The book on this phone belongs to a different number, so you were not signed in." (`q3.mp4` 00:47). `/tmp/devserver.log` has no SMS to +919000000091; Postgres has no user row for it. +919000000081 then signed in: Test Store D, ₹570 expected in box (02:15) |
| HT-33 | PASS | Server cut, sales ₹13 and ₹17 → "2 waiting to sync" (`q4.mp4` 00:22). Rig restored 19:32:02; "All saved on phone" by 19:32:29 with the app untouched (00:55). Postgres: 7000, 1300, 1700 |

## New: changing the system font size while the app is running (HT-35)

Changing font_scale with the app open on A3 (not signed in) restarted it on A1 and lost
the typed number (2 of 2). After walking back to A3 the layout was still sized for the
old scale: 1.0 → 2.0 cut every glyph (keys, "+9", "90000", "Send", "Cle") (`q1.mp4`
02:20); 1.0 → 1.3 showed "+9 | 90000", "Cle", "Send", "I changed my" (`a3_13`). Signed in
on X1, 2.0 → 1.0 left boxes at the 2.0 height with 1.0 text (`x1_after_font`). A
force-stop and relaunch at the same size gave a correct layout every time, so the fresh
results above stand. This is how a shopkeeper meets it: he changes text size in Android
settings and comes back to the app.

## Device settings

Changed: font_scale (1.3, 2.0). Read back at the start values: font_scale 1.0, night mode
yes, accelerometer_rotation 1, user_rotation 0, auto_time 1. `adb reverse tcp:8787` in
place. App installed, signed in as +919000000081 (Test Store D, today's date only).
