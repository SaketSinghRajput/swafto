# Device review: human-tester pass 2, 2026-10-25

**Device:** iQOO I2219, Android 16 / SDK 36, 1080x2408, high-contrast text on (not an app
defect). Screen lock: PIN, so no lock or sleep key was sent all session.
**Build:** installed `base.apk` md5 `a08e9ea585d97219bb4554c8ec5815b8` equals
`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`, written 15:29:02 IST,
after the last code commit `8926091` (15:21:43). It contains `d66ea11` and `8926091`.
**Rig:** API on port 8787 over `adb reverse`, Postgres `swafto_dev`, label-driven
`act.mjs`. **Method:** Android Core App Quality (Back_Button_Nav, App_Switcher,
State_Preservation, Orientation_Transitions, Sensitive_Data_Logging), Kohl's I SLICED UP
FUN, session charters. Defects are HT-9 to HT-31 in `docs/handover/DEFECTS.md`.
Recordings, shots and UI dumps are under `artifacts/device-tests/human2/` (git-ignored).
Recording times are derived (shot file time minus recording start, from device file time
and `ffprobe` duration), not read off a player.

## Rig facts found this session (not app defects)

- **The running API predates `8926091`.** The dev-server process started 14:00; the fix
  commit is 15:21. A `curl` to `/v1/auth/otp/request` with `+911234567890` returned
  `{"sent":true}` and the server log printed an SMS to that number. So the server half of
  HT-5 could not be verified; restart the API before the next pass.
- **`adb reverse --remove` does not cut a live connection.** The app's keep-alive socket
  to 8787 stayed ESTABLISHED (`/proc/net/tcp6`) and two consent changes made "offline"
  reached Postgres at 16:50:22 and 16:51:42. A true cut needed `adb kill-server` (then
  the sockets went to CLOSE_WAIT). The skill's offline recipe should add this.
- The reverse mapping also vanished once on its own (found empty at about 17:05); A3 then
  showed the offline message. Restored with `adb reverse tcp:8787 tcp:8787`.
- About's web-deletion link opened a vivo system password screen
  (`com.vivo.settings.secret.PasswordActivity`) twice, although the URL resolves to
  Chrome. It was backed out of with Back and nothing was typed. A host `curl` of
  `http://localhost:8787/delete-account` returned 200 with "Delete your SWAFTO account".

## A · Re-verification of the Lead's fixes

| ID | Result | Evidence |
|---|---|---|
| HT-1 | PASS | Today → Continue day close opened T5 (`a/t5`, `a1.mp4` 01:45); Taken by owner → T10; ₹200 added (`a1.mp4` 02:50). Expected in box ₹1,200 → ₹1,000, Net sales stayed ₹1,150 (D3). Postgres: `withdrawal` 20000 paise |
| HT-2 | PASS | The phone left signed in without a name opened X1 on launch (`a/x1_resume`); Back left the app; reopen showed X1 again (`a1.mp4` 00:29); after "Test Store" + Start the day, Postgres `shops.name` = Test Store |
| HT-3 | PASS | X0 → Back → A2 in Hindi and in Odia (`a/x0_hi2_back`, `a3.mp4` 01:40; `a/x0_or_back2`) |
| HT-4 | PASS, with HT-9 | With the app in front: the withdrawal reached Postgres inside 30 s, a ₹50 sale inside 4 s, both while Today said "All saved on phone". But a queue built while the server was cut did not drain when it came back (HT-9) |
| HT-5 | PASS on the phone; server not verified | Send code disabled for 1234567890, 0123456789, 5999999999; enabled for 6000000000; no SMS sent (log count unchanged). Server: see rig facts |
| DV-15 | PASS | Keypad delete reads "Delete last digit" on A3, A4, X1, T6, T10, T11, the opening-cash form; on T10, 2009 then delete gave ₹200.00 |
| DV-16 | PASS | Empty day T11: in-lines "+₹0.00", the five out-lines "-₹0.00" (`a/t11_zero2`) |
| F-41 | PASS (observed) | X1 Focus selected: marigold fill, dark text, legible (`c8/x1_focus_13`) |

## Charter 3, the close (run)

- T11 "Should be ₹1,085.00" = 1,000 + 585 + 100 − 250 − 50 − 100 − 200: matches by hand.
- Short count ₹1,000: T12 "Difference -₹85.00", reasons Gave change from my pocket /
  Forgot to write something / Counted wrong / Don't know (`c3/t12_short`, `c3a.mp4`
  00:48). Over count ₹1,200: "₹115.00", reasons Forgot to write a sale / Counted wrong /
  Don't know. No free text on either. See HT-23.
- Exact ₹1,085 → T13 "It matches." → Close the day tapped three times fast → one T14,
  one `days` row closed with counted 108500. T14: profit ₹460 = 1,235 − 650 − 125;
  withdrawal shown apart. Both match by hand.
- Back from T14 → the closed Today; Back from there leaves the app; relaunch shows the
  closed day. All six tiles are disabled (`enabled=false`) and raw taps on them did
  nothing. "Post a correction" opens the day list but cannot save (HT-11). No Settings
  or privacy link on a closed day (HT-10).
- Skip: on a fresh shop all eight sections were skipped with "Nothing to enter", the
  cash check unlocked, the day closed; the skips never reached the server (HT-19).

## Charter 4, logout and Back (run)

- Log out (A8) names the shop and number, then lands on A3 with the number filled in.
  Back → A2 → leaves the app. Recents thumbnail showed A2, no figures.
- **Tapping the Recents card, or relaunching, opens the signed-in Today again: shop name,
  opening cash, every figure** (HT-12, 3 of 3). Settings then offers "Sign in", so the
  tokens were gone; the book was not hidden. An entry could still be added (₹40).
- Same number signed back in: the book was all there. The ₹40 typed while signed out
  stayed "2 waiting to sync" until the next write (HT-9), then reached the right shop.
- Different number (+919000000031): the phone's book stayed on screen under the new
  account with no message; the phone's shop name was written into the new account's
  shop; new entries were held back (the wrong-shop guard held for entries) but the
  screen only said "2 waiting to sync" (HT-13).
- Deletion as that account: S7 → Continue → S8; Back on S8 → S7. Delete everything →
  "Deletion requested · Erased on 2026-11-24"; Postgres set `deletion_requested_at` on
  the new shop only. Back → splash (A1); relaunch → A1. No book visible. The deletion
  also wiped the phone book of the first shop, including an unsynced ₹15 (in HT-13).
- A7 from A4: Back returns to A3, not A4 (HT-26). "I don't have it anymore" is a dead
  end (HT-20). A6 (session expired): not run, see below.

## Charter 5, interruptions and lifecycle (rest of it, run)

Lock_Resume and Sleep_Resume: **NOT RUN - device has a credential** (PIN).

| Form, draft | Home | Recents | Rotation x3 | `am kill` in background | Force-stop |
|---|---|---|---|---|---|
| Sale ₹777 | kept | kept | kept | lost, Today, nothing saved | lost, nothing saved |
| Credit ₹345, customer chosen | kept | kept | kept (customer too) | lost, nothing saved | - |
| Purchase ₹222 | - | - | kept | - | lost, nothing saved |
| Expense ₹66 | kept | kept | kept | - | - |

No screen came back blank (DV-14 did not recur); nothing was saved twice; no half-typed
amount was saved. Draft loss on process death is HT-21. In landscape the keypad's lower
rows are off screen (HT-17).

## Charter 6, hammering (run)

Close the day x3 → one close. Send code x3 → one SMS. Add (expense) x3 → one entry
(Postgres 1 row). Nothing to enter x8 on eight rows → eight skips, no double. Save and
choose x3 → one party (Postgres 1 row), but the third tap typed "8" into the amount
underneath (HT-22). Log out confirm was not hammered.

## Charter 7, network (run)

- Sync after an entry: server cut → sale → "2 waiting to sync"; server back → still
  "2 waiting to sync" 3 min 30 s later with the app in front; the next sale drained both
  (HT-9). Postgres confirmed each step.
- Consent change: once the socket was truly cut, opening the privacy link showed "Not
  saved · Could not reach the server, so your choice was not changed" without opening the
  consent screen (HT-31). Nothing claimed success.
- Account deletion offline: "No connection, so nothing was deleted - not on this phone
  and not on our server." Postgres unchanged. Honest.
- Send code offline (found by accident, reverse gone): the honest offline message was
  drawn under the keypad at font scale 1.3 (HT-18).
- Privacy policy offline: Chrome "This site can't be reached". The app claims nothing.
- Not run: verify (A4) offline.

## Charter 8, ergonomics and platform (run)

- font_scale 1.3: X0, A3, A4, X1, Today, opening cash. 2.0: Today, Sale, Settings, Hindi
  Today, Odia T5. Every control reached by scrolling; clipping in HT-18 and HT-30.
- Night mode was on all session (as found); the app keeps its own light theme and is
  legible. Toggling night off and on changed nothing visible. The app's dark look is the
  "Focus" / "Bright sunlight" choice (HT-29 on its naming).
- Hindi and Odia: Today, T5, Settings, S5 lay out; header Back is labelled in each
  language. Copy itself not judged (draft pending native review).
- Language chosen in Settings does not survive a relaunch (HT-16).
- Labels: no clickable app node without a label in any dump this session; eight
  identical "Nothing to enter" labels on T5 (HT-28).

## Charter 9, compliance (rest of it, run)

- Consent: optional purposes default "No" on X0; giving SMS reminders reached Postgres
  (`sms_reminders` true 16:48:12), withdrawing it reached Postgres (false 16:50:22, over
  a live socket). Each save then landed on X1 setup (HT-14, 3 of 3).
- About: Privacy policy and Terms opened in Chrome with their text; Open-source
  licences does nothing (HT-15); web deletion: see rig facts.
- In-app deletion signed in: honest (charter 4). Signed out: S8 says only the phone book
  is deleted and no server account is touched; S9 "This did not send a deletion request
  to our server"; Postgres unchanged. Honest.
- Logcat: the whole buffer (10-25 04:32 to 17:02 device time) has no phone number,
  sign-in code, token, shop, party or supplier name. JS logs only `Running "SWAFTO"`.

## Charter 10, day boundary (run)

`auto_time` off, `cmd alarm set-time` +1 day with the app in front on the closed day:
Today kept "Sunday 25 October" for 65 s and after a tab switch (HT-24); Home + reopen
opened Monday 26 on opening ₹1,085 (the count). Repeated on the second shop: +2 days →
Tuesday 27 opened on ₹500 (its count). Restoring automatic time put the clock back to
25 October; the app then kept showing Tuesday 27 (it does not step backwards).

## Not run, and why

- Lock_Resume, Sleep_Resume: device has a credential.
- A6 session expired: the only safe trigger is restarting the Lead's API (new signing
  key); not done.
- `am kill` on T11 mid-count; A4 verify with no server; charter 2 not re-run.
- Web deletion page on the phone: a device password screen intercepted it.

## Device settings

Recorded first: font_scale 1.0, night mode yes, accelerometer_rotation 1,
user_rotation 0, auto_time 1, auto_time_zone 1. All restored to those values and read
back. The clock ran 1 then 2 days ahead from 15:59 to 17:19 IST and was restored by
automatic time. `adb reverse tcp:8787` is in place. App data was cleared at the end
(the phone held future-dated synthetic days); the app is installed and opens on A1.
Postgres keeps the synthetic shops for +919000000021, +919000000031 (deletion requested)
and +919000000041, the last with days dated 26 and 27 October.
