# Device review: human-tester pass, 2026-10-25

**Device:** iQOO I2219, Android 16 / SDK 36, 1080x2408, high-contrast text on (not an app
defect). **Build:** debug APK md5 `0367fe8faf678a17c08c5327fcf624f2`, written 10:48 IST,
which predates `d66ea11` and `55b2f6f` (see the register). **Rig:** API on port 8787 over
`adb reverse`, Postgres `swafto_dev`. **Driver:** label-driven `act.mjs`.
**Method:** Android Core App Quality (Back_Button_Nav, App_Switcher, Sensitive_Data_Logging),
Kohl's I SLICED UP FUN, session charters. Defects are HT-1 to HT-8 in
`docs/handover/DEFECTS.md`.

**Outcome: partial, then BLOCKED.** During charter 5 the lock/unlock step locked the phone.
It has a PIN the tester does not have; it was not guessed. All later work needs the screen.

## Charter 1, first run as a stranger (run, short form)

- A1 Back leaves the app (expected for a first screen).
- A2 → Hindi, Odia, English each opened X0 in that language. X0: both optional purposes
  read "Your choice: No" before any tap. Back on X0 leaves the app (HT-3).
- Consent before account: no `users` row existed for +919000000021 until the code was
  verified; the new row carries `account_and_ledger:true` and nothing for the optional
  purposes. Observed in Postgres.
- A3: a phone number one short of ten leaves Send code disabled; an 11th digit is ignored; 1234567890 and
  0123456789 are accepted (HT-5).
- A4: a wrong code opens "OTP problems · That code doesn't match"; header Back returns to
  A4; the right code opens X1.
- X1: Start with no name is refused with "Not saved · Type the shop name first." Back on
  X1 leaves the app and skips setup on relaunch (HT-2).
- Not run: resend code, X1 with name only and with opening cash (setup was bypassed by HT-2).

## Charter 2, a full trading day (run, except the withdrawal)

Predicted by hand before each Add, then read off Today:

| After | Expected in box | Net sales | Udhar to collect | You owe suppliers | Observed |
|---|---|---|---|---|---|
| Opening ₹1,000 | ₹1,000 | - | ₹0 | ₹0 | match |
| Cash sale ₹500, UPI sale ₹300, credit ₹200 (new customer with phone), credit ₹150 (new customer, no phone) | ₹1,500 | ₹1,150 | ₹350 | ₹0 | match |
| Collect ₹100 from Test Customer 1 | ₹1,600 | ₹1,150 | ₹250 | ₹0 | match |
| Purchase ₹250 cash, ₹400 on credit (new supplier) | ₹1,350 | ₹1,150 | ₹250 | ₹400 | match |
| Expenses ₹50 cash, ₹30 UPI, ₹20 Other, ₹10 Shop stock, ₹15 Udhar | ₹1,300 | ₹1,150 | ₹250 | ₹400 | match |
| Pay supplier ₹100 | ₹1,200 | ₹1,150 | ₹250 | ₹300 | match |

T11 "Should be ₹1,200.00" with lines that add up (₹1,000 + 500 + 100 − 250 − 50 − 100).
Postgres after sync: 13 rows, paise equal to the amounts typed; UPI sale mode `upi`,
collection `cash`. **Withdrawal could not be entered:** no route to T5 on an open day (HT-1).
Also seen: sync waits for the app to go to the background (HT-4); HT-6, HT-7, HT-8.

## Charter 5, interruptions (started, then BLOCKED)

- Sale form, ₹777 typed, Home, reopen: the draft and the screen survived (no DV-14 blank).
- Recents pressed twice switched to another app's window; nothing in it was touched; the
  tester returned by locking the screen.
- Lock: the phone locked with a PIN. BLOCKED from here.

## Charter 9, compliance (partial, without the screen)

- `adb logcat --pid` for the running process and a grep of the whole buffer (13:56 to 14:41
  IST, covering this session's sign-in and every entry) found no phone number, sign-in
  code, token, shop or party name. The only JS log line is `Running "SWAFTO"`.
- Today shows "Settings" and "Privacy and what you agreed to" on an open day.
- Not run: withdrawal of consent, About links, deletion.

## Not run, and why

Charters 3 (close), 4 (logout and Back), 6 (hammering), 7 (network), 8 (ergonomics),
10 (day boundary), the rest of 5 and 9: BLOCKED by the PIN lock. Charter 3 would also have
been limited by HT-1 (no T5 to skip a section from). Recordings auto-stop at 180 s, so part
of charter 2 is evidenced by shots and UI dumps only.

## Device settings

Font scale, night mode (found **yes**, the Lead's note said no; left as found), rotation
(auto, user_rotation 0), date and time (automatic) and `adb reverse tcp:8787` were not
changed by this session. The phone is locked on its PIN screen.
