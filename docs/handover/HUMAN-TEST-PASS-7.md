# Human-tester pass 7 - re-verification of `43b0aab` (2026-10-26)

Independent tester session for SWAFTO Retail Desk, method per
`.claude/skills/swafto-human-tester/SKILL.md`. Goal 1: re-verify HT-36 to HT-47 on the
device. Goal 2: charters 4, 6, 7, 8 and 9, and the rest of 5. Defects HT-49 to HT-56 and
the re-verification table are in `docs/handover/DEFECTS.md` under "Human-tester pass 7".
No source file was changed and nothing was committed.

## Rig verification

| Check | Result |
|---|---|
| Device | `10BE6H031T000BN  device`, iQOO I2219, Android 16 |
| Installed APK | `base.apk` pulled from the phone: md5 `d1f702ee3dd2b191e136b3cbc1bd55dd` |
| Built APK | `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`: same md5, written 12:55:08, after HEAD `43b0aab` (12:52:30 +0530) |
| Screen lock | `CredentialType: PIN`. No power or sleep key was sent. The clock and timezone were not touched. The keyguard never showed (`isKeyguardShowing=false` checked before every driver step) |
| API | Lead's dev server, port 8787, `swafto_dev3`; `adb reverse tcp:8787 tcp:8787` |
| App data | Cleared by the Lead; cleared again by the tester at 13:02 and at 14:20 (see below) |

## Evidence

`artifacts/device-tests/pass7/` (git-ignored): shots (PNG plus UI XML), `logcat-app.txt`,
`ht43-whatsapp-intent.txt`, and recordings `p7-01`, `p7-02`, `p7-03`, `p7-04`, `p7-06`,
`p7-07`, `p7-08`, `p7-09` (each up to 180 s; start times are about 13:03, 13:09:56, 13:41,
13:59, 14:13, 14:21, 14:33, 14:53). `p7-05` (logout charter, 14:04) was deleted because it
showed the Recents screen with other apps' thumbnails.

**Privacy.**
- At 12:59-13:00, during the first minute, input the tester did not send reached the phone.
  The notification shade opened, and it showed the owner's real notifications. "Send crash
  reports" was switched to Yes, and "I changed my number." was tapped. Only this tester's
  driver was running on the host, and `getevent` showed no touches in the 20 s afterwards.
  The shot and the recording from that minute were deleted. The tester cleared the app
  data and started again: on a fresh X0 both optional purposes default to No
  (`c1-x0-fresh`).
- WhatsApp was entered three times: once by a Recents double-press (13:20, left with Home
  at once), and twice through Remind on WhatsApp (13:29, 13:30). The URL was read from
  `dumpsys activity recents`. There was no shot, nothing was typed, and no chat was opened.
- About → Privacy policy, Terms, Licences and the web deletion link raise a system face
  and password prompt from `com.android.settings`. This looks like the phone's own lock on
  the browser. It was cancelled with Back and its shot deleted. The four pages were checked
  with curl instead: `/privacy`, `/terms`, `/licences` and `/delete-account` each return 200.

## Coverage

| Charter | What was done | Result |
|---|---|---|
| 1 (brief) | A1, A2 in Hindi then Back, X0 Back → A2, A3 with a half-typed phone number (Send code disabled) and an over-long one (capped at ten), wrong code → "That code doesn't match", right code, X1 without a name ("Type the shop name first"), with name and ₹1,000 | As expected. Back from Today leaves to the launcher; reopening shows Today |
| 2 | Cash ₹300, credit ₹400 + ₹50 to a new customer, collection ₹100, UPI ₹200, purchase ₹150 cash and ₹500 on credit to a new supplier, expense ₹50 cash and ₹30 UPI, supplier payment ₹100, withdrawal ₹200 | Every figure matched a hand calculation: expected in box ₹1,100 before the withdrawal and ₹900 after; net sales ₹950; owe suppliers ₹400. Postgres holds all 11 entries with the right sections and modes |
| 3 | T5, short count ₹850 (two checks and "Still short"), over count ₹950 (three reasons), exact ₹900, close, T14, Back, relaunch | T14 profit ₹220 = 950 - 650 - 80, withdrawal shown apart (D3). The stale "Counted wrong" reason: HT-49. Forms reached from a party page on the closed day: HT-52 |
| 4 | Log out → Back x2 → launcher; relaunch, force-stop, `am kill`, Recents: only A3/A2 and "SWAFTO", no name or figure. Same number: the book came back (Test Store, ₹900). Different number (+91 90000 00073): refused, no SMS sent, no user row. S7 → S8 → Back → A1 → Back → launcher. A7 → Back → A3 | PASS. HT-53, HT-54 and HT-56 found here. In-app deletion signed out was NOT RUN: A1-A7 show no such route; the web page answers 200 |
| 5 (rest) | Sale, Credit, Purchase, Expense, Collect and Pay with ₹123 typed and not saved: Home + reopen, user_rotation 1/0 three times, `am kill` in the background. Plus I1 Home, Recents and `am kill` | The draft survived each step on all six forms; nothing was saved. HT-21 no longer reproduces. The app stays portrait during rotation. On I1 the half-typed line is lost on `am kill` (as in pass 6). Back on each form returns to where it came from, except after a refusal (HT-53). Lock/unlock NOT RUN: the device has a PIN |
| 6 | Three taps in one burst on Try Premium, Save and choose, Add (credit), Close the day, Send code | One preview, one party, one entry, one closed day, one SMS. A burst on Close the day landed on Today closed, probably through T14's Done |
| 7 | `svc wifi disable` + `svc data disable` + `adb reverse --remove` (+ `adb kill-server`, see below): consent screen, Send code, Delete everything, a ₹77 cash sale | Send code: "You're offline ... Nothing you typed is lost", no SMS. Consent: cannot be shown offline (HT-54 heading). Deletion: "No connection, so nothing was deleted", no server row. Sale: "1 waiting to sync". Restored at 14:35:31; in Postgres by 14:35:44, and Today read "All saved on phone". OTP verify offline NOT RUN: the number was rate-locked (HT-56). Opening the privacy link offline was not run (system prompt, above) |
| 8 | Font 2.0 and 1.3 (force-stop between), Hindi and Odia on Settings, S9, S10, S12 and Today, the "Dark, bigger text" screen on S10, a label check over every UI XML | Nothing clipped on Today, S10, S9 or S12. I1 at 1.3 and 2.0: HT-51. Every clickable SWAFTO node has a label. The system dark mode was already on and was left as found |
| 9 | Consent defaults (No, No); SMS consent on and off from Today's privacy link and from Settings, each a new `consents` row; About; logcat of the app pid | Withdrawing is the same toggle as giving. Logcat (`logcat-app.txt`, 178 lines, from 13:29, when the buffer was cleared) has no phone number, OTP, token, shop or party name. After Save from Settings → Privacy the app lands on Today, not Settings (not filed) |

### Not covered, and why

- **Charter 10** (day boundary): NOT RUN, because the clock may not be changed this pass. The closed 26 October therefore left no open day for the first account. To keep testing entries, the tester cleared the app data at 14:20 and signed up a second shop (+91 90000 00073, "Test Store B", Free). The first shop's book is still on the server.
- **Lock/unlock and sleep** (Lock_Resume, Sleep_Resume): NOT RUN, because the device has a PIN.
- **OTP verify while offline**: NOT RUN (see charter 7).
- **The rig cannot fully take the server away with `adb reverse --remove` alone.** At 14:14 a consent change still reached Postgres after the reverse was removed, probably over a connection that was already open. For the later offline tests the adb server was also killed (`adb kill-server`), as pass 4 did.
- **C1 in Devanagari or Odia script**: not typeable over adb.
- **The withdrawal form, X1 and T11 under Home, rotation and `am kill`**: not run (time).

## Device and rig state at the end

- Wifi on, `svc data enable` sent (`mobile_data` reads 0; the phone has no SIM). `font_scale` 1.0. `accelerometer_rotation` 1, `user_rotation` 0. `auto_time` 1. The clock and timezone were never touched. System night mode is still "yes", as found.
- `adb reverse tcp:8787 tcp:8787` is in place. The Lead's server on 8787 was not restarted.
- The app is installed and signed out, on A2 (language). Its local data is empty after the account deletion.
- `swafto_dev3` now holds shop "Test Store" (+919000000071): closed 2026-10-26, 11 entries, a preview to 2026-11-09, items Rice and Dal, and the `difference_reason` of HT-49. It also holds shop "Test Store B" (+919000000073): one ₹77 sale, a preview, item Rice, and `deletion_requested_at` 2026-10-26 09:24:53 UTC. +919000000071 was rate-locked until about 15:18 IST.
- The phone's keyguard never showed. Nothing was committed.
