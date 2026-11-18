<!-- ASSEMBLED by product/swafto-ui-redesign/screens/build.mjs from screens/src/_head.md, screens/src/<area>.js and screens/src/_tail.md. Edit those, then run the build. -->

# SWAFTO Retail Desk redesign, M2: full flows and screen states in "Mitra"

Author: product-designer · 2026-11-18 · direction chosen by Saket at M1 (decisions log in `PLAN.md`). **Status: DRAFT for Saket's review of the key screens. Nothing here is built.**

**What this is.** Every screen and every state of the app, drawn in Mitra at 360 x 800, with its purpose, primary action, English copy, string keys, copy gaps and the tap count for the four core tasks. The catalogue below (219 screen states: onboarding 29, today 11, sales 30, money 30, close 17, ledger 23, reports 30, settings 36, system 13) is generated from the same `body()` functions that draw the mockups in `screens/<area>.html`, so the copy listed is the copy shown. Edit `screens/src/*.js`, `screens/src/_head.md` or `screens/src/_tail.md`, then run `node product/swafto-ui-redesign/screens/build.mjs`.

**What it is not.** No shopkeeper has seen it. Every judgement is expert review and an **assumption** until the M4 sessions; tap counts are counted from the frames, and the second-based targets are **not measured**. Mockups render in a browser with Anek Odia, not on the vivo I2219 or the ₹7,000 handset. Odia and Hindi are the app's unreviewed DRAFT strings (H13), taken verbatim from `strings.ts`; no string is marked reviewed. Where no string exists the catalogue says so and gives English only.

## Open the mockups

`screens/onboarding.html`, `today.html`, `sales.html`, `money.html`, `close.html`, `ledger.html`, `reports.html`, `settings.html`, `system.html`. Each is self-contained (one network request: Google Fonts, with a local-file fallback). Toggles: ଓଡ଼ିଆ / English / हिन्दी, Comfort (light) / Focus (dark), and text 1.0x / 1.3x / 2.0x (header and tab bar stop at 1.5x, as the app's chrome cap does; body text and figures keep growing).

## Structure carried from redesign v1 (research-backed, unchanged)

1. Today is sale-first: four pinned tiles above every figure; one hero, "In the box now"; Purchase and Pay supplier behind More.
2. Balances first in the Ledger: people sorted by what they owe, name large and balance larger, "changed today" as a small line, "+ Customer" in the header area.
3. Entry forms: the strongest control is **Add**, full width directly above the keypad; the saved row appears first with mode and time and a "Saved" line; the title names the real action (Udhar sale, Collect, Pay supplier); each person's balance is shown in the picker and again above the keypad.
4. Day close: the whole row opens its form; "Nothing today" is a quiet link with a one-tap Undo and a skipped count; cash check and Close show as visible locked lines with a lock; the sticky button names the next step.
5. The sync chip is persistent in every header: tick and "Saved", or amber clock and "waiting · safe on phone". Never red.
6. Text size is real: chrome capped at 1.5x, body and figures to 2.0x with reflow.
7. Three tabs only (Today, Ledger, Reports). No fourth tab. Settings, Ask and Privacy are rows at the foot of Today (with icon and chevron), not loose links.

## Product rules every state keeps (`CLAUDE.md`)

No inference in entry (no suggested amounts, no autofill, no camera, OCR or AI in the entry path; a derived observation is allowed and is worded as something to look at). Append-only (a correction is a new dated entry; there is no edit or delete on an entry). A closed day is frozen (D7). UPI, Udhar and Shop stock never move the cash drawer (D2); a withdrawal sits outside profit (D3). Integer paise through the audited helpers; the mockups only format. No dark patterns (no pre-ticked consent, withdrawal as easy as giving, equal weight for refusing, destructive steps say what happens). Status is never colour alone: always an icon and words, plus a printed sign on money.

## Core task targets (founder's targets for this project; not BENCHMARKS.md thresholds)

See "Task speed" in the tail of this document for the tap counts per task, with the assumptions behind them.



## Area: Onboarding (29 screen states)

First launch and sign-up, in the order the app runs them: splash, language, consent notice, phone number, code, then (new shop only) shop setup and opening cash. Plus the recovery screens: code problems, session expired, number changed. No tabs on any of them.

### Splash

- Route: `A1` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-splash`
- Purpose: The first frame. Names the product; one tap continues.
- Primary action: Tap anywhere (accessible name: Continue).
- Taps / target: 1 tap.
- Rules held: No logo animation, no tour, no permissions primer. The wordmark SWAFTO is a name, not copy, and is the same in every language.
- Notes: REAL FIRST-LAUNCH ORDER (from App.tsx, session.tsx chooseLanguage / agreeConsent, host.tsx consented): A1 splash -> A2 language -> X0 consent notice (in the language just chosen) -> A3 phone number -> A4 code -> then, if the book has no shop name yet, X1 shop setup -> T1 Today (T2 if no opening cash was typed, then T6 opening cash). A returning book goes A4 -> T1. Back: X0 returns to A2, A3 to A2, A4 to A3, A5 to A4; A1, A2 and A6 have no parent (Back leaves the app). Note: session.agreeConsent briefly sets X1, but the host then moves to A3 synchronously, so X1 is not shown before sign-in. The splash is a single tap target with no visible hint; I kept that (reads as a pause, not a screen with a dead button).
- Copy on screen (en): "SWAFTO" · "Continue"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a1.continue`

### Choose your language

- Route: `A2` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-language`
- Purpose: Pick Odia, Hindi or English before reading anything else. Each language is written in itself.
- Primary action: One of three large language rows; picking one goes straight to the consent notice in that language.
- Taps / target: 1 tap.
- Rules held: Autonyms are literals, not translated copy. Nothing pre-selected. The hint is two-script because no language is chosen yet.
- Notes: The real hint line is a hard-coded two-script string (CHOOSE_HINT), not in strings.ts. No device-locale guess is made (no inference).
- Copy on screen (en): "Choose your language" · "भाषा चुनें · ଭାଷା ବାଛନ୍ତୁ" · "ଓଡ଼ିଆ" · "हिन्दी" · "English"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a2.title`

### Consent notice (sign-up): nothing pre-ticked

- Route: `X0` · changed from the app today · mockup: `screens/onboarding.html#c-onboarding-consent`
- Purpose: DPDP notice before an account exists: what is kept and why, three purposes each with its own choice, rights in one line.
- Primary action: I agree (agrees to exactly what the switches say; there is no agree-to-all).
- Taps / target: Minimum 1 tap (agree with both optional purposes left off); each optional purpose adds 1 tap.
- Rules held: Itemised notice. Specific consent per purpose. Only the account and ledger purpose is required, and it is shown as locked (icon + words), not as a switch. SMS reminders and crash reports start OFF (consent.off). State is icon + words Yes/No, never colour alone. Back returns to A2.
- Notes: Real screen as built has one button (agree) and rows with "Your choice: No/Yes". My switch is the same content, restyled with a tick or dash plus the word. The notice version and locale go with the decision to the server at verify (host.consented). The real X0 shows no grievance officer or privacy-page link; the DPDP grievance officer is human-blocked (HUMAN-ACTIONS) so I did not draw one. Copy in Odia and Hindi is DRAFT (H13).
- **For Saket's review:** The notice has no link to the full privacy page or the grievance officer; add one row once the officer is published (human item).
- Copy on screen (en): "Before we start" · "This is what SWAFTO keeps, and why. Nothing is kept for any other reason." · "Your number, your shop name, and the entries you type" · "Needed to keep your book" · "Send me reminders by SMS" · "Your choice" · "No" · "Send crash reports, never with money or names" · "You can see everything we hold, correct it, or have it erased. You can change any of these choices later, as easily as now." · "I agree"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `consent.title`, `common.back`, `consent.intro`, `consent.purpose.account_and_ledger`, `consent.required`, `consent.purpose.sms_reminders`, `consent.optional`, `consent.off`, `consent.purpose.crash_diagnostics`, `consent.rights`, `consent.agree`

### Consent notice: one optional purpose turned on

- Route: `X0` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-consent-optin`
- Purpose: Shows the state after he turns SMS reminders on himself. Crash reports stay off.
- Primary action: I agree (sends exactly: account and ledger, SMS reminders).
- Taps / target: 2 taps (one switch, agree).
- Rules held: A switch is only ever turned on by the shopkeeper. Withdrawal later is the same screen from Today (manage mode, one tap, takes effect at once, no Save in the design target; the real manage screen today still has a Save button, consent.save, noted for the Settings area).
- Notes: The ON state is filled teal with a tick and the word Yes.
- Copy on screen (en): "Before we start" · "This is what SWAFTO keeps, and why. Nothing is kept for any other reason." · "Your number, your shop name, and the entries you type" · "Needed to keep your book" · "Send me reminders by SMS" · "Your choice" · "Yes" · "Send crash reports, never with money or names" · "No" · "You can see everything we hold, correct it, or have it erased. You can change any of these choices later, as easily as now." · "I agree"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `consent.title`, `common.back`, `consent.intro`, `consent.purpose.account_and_ledger`, `consent.required`, `consent.purpose.sms_reminders`, `consent.optional`, `consent.on`, `consent.purpose.crash_diagnostics`, `consent.off`, `consent.rights`, `consent.agree`

### Consent notice: he does not want to agree

- Route: `X0` · **NEW screen (not in the app today)** · mockup: `screens/onboarding.html#c-onboarding-consent-decline`
- Purpose: The real screen has no refuse action: refusing is only possible by pressing Back. This frame proposes an equal-weight refuse so declining is as visible as agreeing, and says plainly what happens.
- Primary action: Go back (equal weight to the other button).
- Taps / target: 1 tap to refuse; the answer is a calm dialog, 1 more tap to leave.
- Rules held: No confirm-shaming; equal visual weight; nothing is kept when he leaves. The account and ledger purpose is a precondition of having an account, so the honest answer is that without it the app cannot make one.
- Notes: As built, Back on X0 goes to A2 and nothing has been sent or stored. The dialog copy below is NEW and needs native review (H13). This is a proposal, not what the app does today.
- **For Saket's review:** Decide whether to add a visible "I do not agree" action on X0 (today only Back refuses).
- Copy on screen (en): "Before we start" · "This is what SWAFTO keeps, and why. Nothing is kept for any other reason." · "Your number, your shop name, and the entries you type" · "Needed to keep your book" · "Send me reminders by SMS" · "Your choice" · "No" · "Send crash reports, never with money or names" · "You can see everything we hold, correct it, or have it erased. You can change any of these choices later, as easily as now." · "I agree" · "No account without this" · "SWAFTO cannot keep a book for you without the first item. Nothing has been sent or saved. You can come back any time." · "Choose language again"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `consent.agree`, `consent.title`, `common.back`, `consent.intro`, `consent.purpose.account_and_ledger`, `consent.required`, `consent.purpose.sms_reminders`, `consent.optional`, `consent.off`, `consent.purpose.crash_diagnostics`, `consent.rights`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "No account without this" · "SWAFTO cannot keep a book for you without the first item. Nothing has been sent or saved. You can come back any time." · "Choose language again"

### Consent: server not reached

- Route: `X0` · changed from the app today · mockup: `screens/onboarding.html#c-onboarding-consent-unreached`
- Purpose: The choice could not be recorded because there was no signal. Say it was not changed and what to do.
- Primary action: Try again with signal (tap I agree again).
- Taps / target: 1 tap to retry.
- Rules held: Calm refusal, never red-only: icon, words, and the sentence says the choice was NOT changed. In sign-up no account exists yet, so nothing is half-saved.
- Notes: refusal.consent is the real key for "your choice was not changed"; the app maps it in manage mode (and refusal.consentRead when it cannot read the choices). In sign-up mode the consent decision is posted together with the code at A4, so a missing signal there shows auth.offline / auth.failed on A4 (see the A4 frames) rather than this banner. Drawn here as the closest honest equivalent; I could not tell from the code that X0 in signup mode ever shows this exact banner.
- **For Saket's review:** Confirm where the sign-up consent failure should appear: on A4 (as built) or back on X0.
- Copy on screen (en): "Before we start" · "This is what SWAFTO keeps, and why. Nothing is kept for any other reason." · "Your number, your shop name, and the entries you type" · "Needed to keep your book" · "Send me reminders by SMS" · "Your choice" · "Yes" · "Send crash reports, never with money or names" · "No" · "You can see everything we hold, correct it, or have it erased. You can change any of these choices later, as easily as now." · "I agree" · "Could not do that" · "Could not reach the server, so your choice was not changed. Try again with signal."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `consent.title`, `common.back`, `consent.intro`, `consent.purpose.account_and_ledger`, `consent.required`, `consent.purpose.sms_reminders`, `consent.optional`, `consent.on`, `consent.purpose.crash_diagnostics`, `consent.off`, `consent.rights`, `consent.agree`, `refusal.titleNotDone`, `refusal.consent`

### Phone number: empty

- Route: `A3` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-phone-empty`
- Purpose: Ask for the ten-digit mobile number that will receive the one-time code.
- Primary action: Keypad digits, then Send code (disabled until the number is a valid mobile series).
- Taps / target: A full mobile number, one tap per figure, then Send code (one more tap); then the code on A4.
- Rules held: The number being typed is pinned above the keypad (HT-34). The app keypad is used, never the system keyboard. +91 is fixed. Send is greyed with a dashed edge until valid, and a refusal never shows before a tap.
- Notes: Real screen also shows a "Step 1 of 2" line. The link "I changed my number" is a quiet text button at the foot.
- Copy on screen (en): "Your phone number" · "Step 1 of 2" · "We will send a 6-digit code to confirm it is you." · "+91" · "00000 00000" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0" · "Send code" · "I changed my number."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a3.send`, `a3.bar`, `common.back`, `a3.step`, `a3.help`, `keypad.clear`, `keypad.delete`, `a3.changed`

### Phone number: typing

- Route: `A3` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-phone-typing`
- Purpose: Digits appear grouped 5 + 5 as he types.
- Primary action: Keep typing; Send code is still off while the number is incomplete.
- Taps / target: 3 more digits, then Send.
- Rules held: Display grouping only; nothing is guessed, filled or remembered.
- Notes: The caret sits in the field; keys are 56 dp.
- Copy on screen (en): "Your phone number" · "Step 1 of 2" · "We will send a 6-digit code to confirm it is you." · "+91" · "98765 43" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0" · "Send code" · "I changed my number."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a3.send`, `a3.bar`, `common.back`, `a3.step`, `a3.help`, `keypad.clear`, `keypad.delete`, `a3.changed`

### Phone number: ten digits but not a mobile

- Route: `A3` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-phone-notmobile`
- Purpose: Ten digits were entered but the series is not an Indian mobile number. Explain quietly, with no red alert.
- Primary action: Fix the number with the delete key (Send stays off).
- Taps / target: 1 delete tap, retype.
- Rules held: Shown only once ten digits are in (HT-5), as an informational line with an icon, polite live region.
- Notes: The field border uses the error edge plus the sentence; colour is not the only cue.
- Copy on screen (en): "Your phone number" · "Step 1 of 2" · "We will send a 6-digit code to confirm it is you." · "+91" · "12345 67890" · "An Indian mobile number starts with 6, 7, 8 or 9. Check the first digit." · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0" · "Send code" · "I changed my number."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a3.send`, `a3.bar`, `common.back`, `a3.step`, `a3.help`, `a3.notMobile`, `keypad.clear`, `keypad.delete`, `a3.changed`

### Phone number: sending the code

- Route: `A3` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-phone-busy`
- Purpose: The request is in flight. The button says Sending and cannot be tapped twice.
- Primary action: None; wait for A4.
- Taps / target: n/a
- Rules held: The screen moves only on the server answer. Keypad hidden while busy is a proposal; as built the keypad stays and the send button is disabled.
- Notes: To stay faithful to the real screen the number remains visible and unchanged.
- Copy on screen (en): "Your phone number" · "Step 1 of 2" · "We will send a 6-digit code to confirm it is you." · "+91" · "98765 43210" · "Sending…" · "I changed my number."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a3.sending`, `a3.bar`, `common.back`, `a3.step`, `a3.help`, `a3.changed`

### Phone number: no signal

- Route: `A3` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-phone-offline`
- Purpose: A code cannot be sent without signal. Say nothing typed is lost and what to do.
- Primary action: Send code again when signal returns.
- Taps / target: 1 tap to retry.
- Rules held: Calm, "nothing is lost" (auth.offline). The sync chip does not apply before sign-in because there is no ledger sync yet.
- Notes: Notice sits above the keypad so large text does not scroll it away (HT-18). The same key auth.failed covers a server fault with different words.
- Copy on screen (en): "Your phone number" · "Step 1 of 2" · "We will send a 6-digit code to confirm it is you." · "+91" · "98765 43210" · "You're offline — a code can't be sent or checked without signal. Nothing you typed is lost. Try again when you're back." · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0" · "Send code" · "I changed my number."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `auth.offline`, `a3.send`, `a3.bar`, `common.back`, `a3.step`, `a3.help`, `keypad.clear`, `keypad.delete`, `a3.changed`

### Code entry: empty

- Route: `A4` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-code-empty`
- Purpose: Enter the six-digit code from the SMS. Shows where it was sent and lets him fix the number.
- Primary action: Keypad digits. The sixth digit verifies at once; there is no Verify button.
- Taps / target: 6 digit taps.
- Rules held: Boxes pinned above the keypad. No autofill, no SMS auto-read in the entry path (no inference).
- Notes: Edit goes to A3. "Trouble? I changed my number" goes to A7. Resend has no countdown in the code: it is only disabled while a request is busy. I did not draw a timer that does not exist.
- Copy on screen (en): "Verify your number" · "Step 2 of 2" · "Enter the code" · "Sent to +91 +91 98765 43210" · "Edit" · "Resend code" · "Trouble? I changed my number." · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a4.bar`, `common.back`, `a4.step`, `a4.title`, `a4.sentTo`, `a4.edit`, `a4.resend`, `a4.trouble`, `keypad.clear`, `keypad.delete`

### Code entry: typing

- Route: `A4` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-code-typing`
- Purpose: Digits fill the boxes left to right; the live box carries the focus edge.
- Primary action: Keep typing.
- Taps / target: 3 more taps.
- Rules held: The current box edge is the focus cue; digits are visible text.
- Notes: Backspace and Clear are on the keypad.
- Copy on screen (en): "Verify your number" · "Step 2 of 2" · "Enter the code" · "Sent to +91 +91 98765 43210" · "Edit" · "Resend code" · "Trouble? I changed my number." · "4" · "8" · "2" · "1" · "3" · "5" · "6" · "7" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a4.bar`, `common.back`, `a4.step`, `a4.title`, `a4.sentTo`, `a4.edit`, `a4.resend`, `a4.trouble`, `keypad.clear`, `keypad.delete`

### Code entry: checking

- Route: `A4` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-code-checking`
- Purpose: The sixth digit went in; the server is checking. Keypad and notice are removed while busy.
- Primary action: None; wait. Resend is disabled.
- Taps / target: n/a
- Rules held: Screen moves only on the answer: A5 on a wrong or expired code, X1 or Today on success.
- Notes: Real code hides the keypad and the notice while busy.
- Copy on screen (en): "Verify your number" · "Step 2 of 2" · "Enter the code" · "Sent to +91 +91 98765 43210" · "Edit" · "Checking…" · "Resend code" · "Trouble? I changed my number." · "4" · "8" · "2" · "9" · "1" · "5"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a4.bar`, `common.back`, `a4.step`, `a4.title`, `a4.sentTo`, `a4.edit`, `a4.checking`, `a4.resend`, `a4.trouble`

### Code entry: could not check (no signal or server fault)

- Route: `A4` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-code-offline`
- Purpose: The code is fine but could not be checked. Offers Try again for the same code.
- Primary action: Try again (common.retry).
- Taps / target: 1 tap.
- Rules held: Nothing typed is lost. Retry appears only for offline or failed.
- Notes: Same frame for auth.failed with the other sentence.
- Copy on screen (en): "Verify your number" · "Step 2 of 2" · "Enter the code" · "Sent to +91 +91 98765 43210" · "Edit" · "Try again" · "Resend code" · "Trouble? I changed my number." · "4" · "8" · "2" · "9" · "1" · "5" · "You're offline — a code can't be sent or checked without signal. Nothing you typed is lost. Try again when you're back." · "3" · "6" · "7" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `auth.offline`, `a4.bar`, `common.back`, `a4.step`, `a4.title`, `a4.sentTo`, `a4.edit`, `common.retry`, `a4.resend`, `a4.trouble`, `keypad.clear`, `keypad.delete`

### Code entry: Still no code? (after two resends)

- Route: `A4` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-code-nocode`
- Purpose: After two resends a third link appears so he can ask for help instead of looping.
- Primary action: Still no code? (opens A5 noCode).
- Taps / target: 1 tap.
- Rules held: The link appears only after resends reach two (NO_CODE_AFTER_RESENDS).
- Notes: This frame also shows all three quiet links: Resend, Still no code?, Trouble.
- Copy on screen (en): "Verify your number" · "Step 2 of 2" · "Enter the code" · "Sent to +91 +91 98765 43210" · "Edit" · "Resend code" · "Still no code?" · "Trouble? I changed my number." · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a4.bar`, `common.back`, `a4.step`, `a4.title`, `a4.sentTo`, `a4.edit`, `a4.resend`, `a5.noCode.title`, `a4.trouble`, `keypad.clear`, `keypad.delete`

### Code problem: wrong code

- Route: `A5` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-a5-mismatch`
- Purpose: The code did not match. Say so calmly and let him re-enter.
- Primary action: Back (re-enter the code). No send button, the same code may still be right.
- Taps / target: 1 tap (Back), 6 digits.
- Rules held: Icon + title + words. The entered code is cleared.
- Notes: As built, a wrong code moves to A5; Back returns to A4.
- Copy on screen (en): "OTP problems" · "That code doesn't match." · "Check the 6 digits and try again."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a5.mismatch.title`, `a5.mismatch.body`, `a5.bar`, `common.back`

### Code problem: code expired

- Route: `A5` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-a5-expired`
- Purpose: The code is too old. Offer a new one.
- Primary action: Send a new code.
- Taps / target: 1 tap, then 6 digits on A4.
- Rules held: Says how many minutes the code lives. Resend counts toward the Still no code? link.
- Notes: The footer button is the only A5 state with a primary action besides retry.
- Copy on screen (en): "OTP problems" · "This code expired." · "Codes are valid for 10 minutes. We'll send a new one." · "Send a new code"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a5.expired.title`, `a5.expired.body`, `a5.expired.cta`, `a5.bar`, `common.back`

### Code problem: too many tries

- Route: `A5` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-a5-locked`
- Purpose: The server paused attempts. Say how long to wait.
- Primary action: None; wait. Back is available.
- Taps / target: n/a
- Rules held: Minutes are rounded up so the wait is never understated. If the server gave no wait, a gentler "try later" line is shown.
- Notes: Here a 2 minute wait. The 10 minute value in the expired frame is a placeholder from OTP_TTL_SECONDS, not measured here.
- Copy on screen (en): "OTP problems" · "Too many tries." · "For your safety, try again in 2 minutes."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a5.locked.title`, `a5.locked.body`, `a5.bar`, `common.back`

### Code problem: still no code

- Route: `A5` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-a5-nocode`
- Purpose: Help for a code that never arrives.
- Primary action: Back to A4 (check the number, or use the changed-number route).
- Taps / target: 1 tap.
- Rules held: Neutral tint, info icon; no alarm.
- Notes: No send button in this state in the real screen.
- Copy on screen (en): "OTP problems" · "Still no code?" · "This can happen with some networks after two resends. We can help over WhatsApp."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a5.noCode.title`, `a5.noCode.body`, `a5.bar`, `common.back`

### Session expired

- Route: `A6` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-session-expired`
- Purpose: This phone holds a book but the server no longer trusts the session. The book is untouched; verify the same number to continue.
- Primary action: Verify with the saved number (sends a code to it).
- Taps / target: 1 tap, then 6 digits.
- Rules held: The shop name is shown so he knows it is his book. If no number is on file the button goes to A3 instead. No log-out, nothing is lost.
- Notes: Shop name falls back to s2.unnamed when the book has none.
- Copy on screen (en): "Session expired" · "Subhadra Kirana" · "This device signed out — usually because you signed in somewhere else. Your book is untouched and safe on our server." · "Verify with +91 +91 98765 43210"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a6.bar`, `a6.body`, `a6.verify`

### Number changed: two ways

- Route: `A7` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-numberchanged-decide`
- Purpose: He changed his SIM. Two paths: he still has the old number, or he does not.
- Primary action: Choose one of two option cards.
- Taps / target: 1 tap.
- Rules held: Each option names what it does and what it needs. No account is created or changed here.
- Notes: Have old number goes to A3; no old number goes to the handoff frame.
- Copy on screen (en): "Change your number" · "Two ways to fix this" · "SIM changed, phone lost, or a new device — pick what fits." · "I still have my old number" · "Verify it, then add the new one · a few minutes" · "I don't have it anymore" · "We check it is you by hand"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a7.bar`, `common.back`, `a7.sub`, `a7.intro`, `a7.haveOld`, `a7.haveOld.sub`, `a7.noOld`, `a7.noOld.sub`

### Number changed: no old number (hand-off)

- Route: `A7` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-numberchanged-handoff`
- Purpose: The app cannot change a number by itself. Say how to ask for help.
- Primary action: Open the privacy page (it says how to write to us).
- Taps / target: 1 tap.
- Rules held: Honest: no pretend self-service. Back returns to the two options.
- Notes: Opens the web privacy page in the browser. The real grievance route is human-blocked until the officer is published.
- Copy on screen (en): "Change your number" · "Two ways to fix this" · "Without the old number we have to check it is you by hand. A support line for this is not set up yet. Until it is, the privacy page says how to write to us: give your shop name and your old number." · "Open the privacy page"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a7.bar`, `common.back`, `a7.sub`, `a7.handoff`, `a7.help`

### Shop setup: fresh

- Route: `X1` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-x1-empty`
- Purpose: Four questions and no more: shop name, language, screen, cash in the box. Reached only by a book with no shop name, after sign-in.
- Primary action: Start the day (always pressable; without a name it refuses and says why).
- Taps / target: Name typed + Start = 2 actions plus the letters; opening cash is optional (digits + 1 tap to raise the keypad).
- Rules held: No tour, no carousel, no consent copy here. Opening cash null is UNKNOWN, never zero, so the field shows a muted ₹0.00 placeholder. The name box uses the system keyboard with autocorrect off; cash uses the app keypad only. No bottom nav.
- Notes: The language question reuses the current choice (Odia first). Question 3 is the display mode as built: Light or Dark, bigger text (s3.comfort / s3.focus, HT-29), and it applies at once. See the next frames for the text-size proposal.
- Copy on screen (en): "Set up your shop" · "Four questions, then your book." · "1" · "Shop name" · "What is your shop called?" · "2" · "Language" · "ଓଡ଼ିଆ" · "हिन्दी" · "English" · "Words change. Amounts stay in the same numerals everywhere." · "3" · "Screen" · "Light" · "Dark, bigger text" · "4" · "Cash in the box right now" · "Optional. Leave it and Today will ask before your first sale." · "Start the day"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `x1.title`, `x1.heading`, `x1.shopName`, `x1.shopNamePrompt`, `x1.language`, `x1.languageHelp`, `s3.display`, `s3.comfort`, `s3.focus`, `x1.cashNow`, `x1.cashHelp`, `x1.start`

### Shop setup: Start tapped without a name

- Route: `X1` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-x1-refusal`
- Purpose: Start the day needs a name. The refusal appears only after the tap and names the missing field.
- Primary action: Type the shop name.
- Taps / target: n/a
- Rules held: A button is never dead: it stays pressable and the field says what it is waiting for. The refusal clears when he types.
- Notes: Real refusal key is x1.refusal.shopName.
- Copy on screen (en): "Set up your shop" · "Four questions, then your book." · "1" · "Shop name" · "What is your shop called?" · "Type the shop name first." · "2" · "Language" · "ଓଡ଼ିଆ" · "हिन्दी" · "English" · "Words change. Amounts stay in the same numerals everywhere." · "3" · "Screen" · "Light" · "Dark, bigger text" · "4" · "Cash in the box right now" · "Optional. Leave it and Today will ask before your first sale." · "Start the day" · "Could not do that"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `refusal.titleNotDone`, `x1.refusal.shopName`, `x1.title`, `x1.heading`, `x1.shopName`, `x1.shopNamePrompt`, `x1.language`, `x1.languageHelp`, `s3.display`, `s3.comfort`, `s3.focus`, `x1.cashNow`, `x1.cashHelp`, `x1.start`

### Shop setup: opening cash with the keypad

- Route: `X1` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-x1-cash`
- Purpose: Tapping the cash field raises the app keypad and repeats the figure directly above the keys.
- Primary action: Digits, then Start the day.
- Taps / target: 4 digits (1,200) + 1 tap to raise the keypad + Start = 6 taps, plus the name.
- Rules held: Digits are whole rupees; the app writes paise by appending 00 (1,200 becomes 120000 paise). No suggested amount. Tapping the name field lowers the keypad.
- Notes: The typed figure is full ink and the placeholder is muted so an answer and a placeholder cannot be confused.
- Copy on screen (en): "Set up your shop" · "Four questions, then your book." · "1" · "Shop name" · "Subhadra Kirana" · "2" · "Language" · "ଓଡ଼ିଆ" · "हिन्दी" · "English" · "Words change. Amounts stay in the same numerals everywhere." · "3" · "Screen" · "Light" · "Dark, bigger text" · "4" · "Cash in the box right now" · "Optional. Leave it and Today will ask before your first sale." · "5" · "6" · "7" · "8" · "9" · "Clear" · "0" · "Start the day"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `x1.title`, `x1.heading`, `x1.shopName`, `x1.shopNamePrompt`, `x1.language`, `x1.languageHelp`, `s3.display`, `s3.comfort`, `s3.focus`, `x1.cashNow`, `x1.cashHelp`, `keypad.clear`, `keypad.delete`, `x1.start`

### Shop setup: text size choice with live preview (proposal)

- Route: `X1` · **NEW screen (not in the app today)** · mockup: `screens/onboarding.html#c-onboarding-x1-textsize`
- Purpose: Propose Normal / Large / Extra large as its own question, with a preview line that already uses the chosen size, separate from light and dark.
- Primary action: Pick a size; the preview line resizes at once.
- Taps / target: 1 tap to change size (default Normal).
- Rules held: Size and dark mode are separate settings. The preview is a real shop line with a printed rupee figure (a sample, not his data) so he can judge legibility at arm length.
- Notes: Today the app has ONE axis: Light, or Dark with bigger text, so the real X1 does not offer a size on its own (chat.md U-2 left this open). The labels Normal, Large and Extra large do not exist in strings.ts. Extra large would need a new token step (a frontend build item). The preview figure is a demo, not a derived total.
- **For Saket's review:** Decide whether to split text size from dark mode (needs tokens.ts change) and approve the labels.
- Copy on screen (en): "Set up your shop" · "Four questions, then your book." · "1" · "Shop name" · "Subhadra Kirana" · "2" · "Language" · "ଓଡ଼ିଆ" · "हिन्दी" · "English" · "Words change. Amounts stay in the same numerals everywhere." · "3" · "Screen" · "Normal" · "Large" · "Extra large" · "Light" · "Dark, bigger text" · "Preview" · "In the box now" · "4" · "Cash in the box right now" · "Optional. Leave it and Today will ask before your first sale." · "Start the day"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `box.title`, `s3.comfort`, `s3.focus`, `x1.title`, `x1.heading`, `x1.shopName`, `x1.shopNamePrompt`, `x1.language`, `x1.languageHelp`, `s3.display`, `x1.cashNow`, `x1.cashHelp`, `x1.start`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Preview" · "Normal" · "Large" · "Extra large"

### Opening cash: empty

- Route: `T6` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-opening-cash`
- Purpose: Count the notes and coins before the first sale. Reached from Today on the first day (T2) when it was left out in setup.
- Primary action: Digits, then Save opening cash (disabled until a digit is typed).
- Taps / target: Tap the figure, 4 digits, Save = 6 taps.
- Rules held: Null is unknown, not zero: Save stays disabled until he types, even though the figure reads ₹0.00. The opening figure has one write path (same method as X1). No suggestion from yesterday.
- Notes: In the real screen Back is shown; the keypad opens on tap in Dark mode and stays open in Light.
- Copy on screen (en): "Opening cash" · "Before the first sale" · "What's in the box right now?" · "Count the notes and coins before the first sale. Tomorrow onwards this is carried from tonight's count - you won't be asked." · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0" · "Save opening cash"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t6.title`, `common.back`, `t6.sub`, `t6.question`, `t6.body`, `keypad.clear`, `keypad.delete`, `t6.save`

### Opening cash: typed

- Route: `T6` · exists today, restyled · mockup: `screens/onboarding.html#c-onboarding-opening-cash-typed`
- Purpose: The figure he counted, ready to save.
- Primary action: Save opening cash.
- Taps / target: 1 tap.
- Rules held: Integer paise (1200 rupees = 120000 paise). A typed zero would be an answer; the button enables on any typed digit.
- Notes: After saving, Today shows the hero "In the box now" with this opening cash and no entries.
- Copy on screen (en): "Opening cash" · "Before the first sale" · "What's in the box right now?" · "Count the notes and coins before the first sale. Tomorrow onwards this is carried from tonight's count - you won't be asked." · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0" · "Save opening cash"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t6.title`, `common.back`, `t6.sub`, `t6.question`, `t6.body`, `keypad.clear`, `keypad.delete`, `t6.save`

## Area: Today (11 screen states)

Mitra, sale-first Today. Four pinned tiles under the header, one hero ("In the box now"), two facts, and a close card that is tonal (not the loudest thing) until closing time. Every state of the Today route: normal, first day, stale open day, phone date behind, closed day (and wrong-date closed), offline or waiting, loading, error, the More sheet, and the derived cash observation.

### Today: normal open day

- Route: `T1` · changed from the app today · mockup: `screens/today.html#c-today-normal`
- Purpose: The front door. Record the next sale with one tap, see what is in the box, see who owes, continue closing when ready.
- Primary action: Sale tile (solid teal, first, top-left). Continue day close is tonal until the shop's own closing time.
- Taps / target: Cash sale: Sale tile, 2 to 3 digits, Add = 4 to 5 taps (target under 10 s; v1 device pass counted 5 actions with a scroll, here no scroll). Owes-lookup: tap "Udhar to collect" figure (1) then person (2) = 2 taps (target under 10 s).
- Rules held: Derived figures only (no stored totals). Out-flow printed with a minus sign. Sync chip never red.
- Notes: Tiles are pinned above the figures and the scroll position is restored after every form (USABILITY items 1, 2, 3). Settings, Ask and Privacy are rows at the foot of the scroll with icon and chevron (v1 had loose links). OPEN/READY pill from v1 is dropped: the close card carries the state in words.
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "Saved" · "Sale" · "Udhar sale" · "Collect" · "Expense" · "More" · "In the box now" · "Opening" · "cash in" · "+" · "cash out" · "-" · "Sales today" · "Udhar to collect" · "Continue day close" · "4 of 10" · "Ask" · "Privacy and what you agreed to" · "Settings" · "Today" · "Ledger" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t1.day.4`, `t1.month.11`, `sync.saved`, `act.sale`, `act.credit`, `act.collect`, `act.expense`, `t1.more`, `box.title`, `box.opening`, `box.in`, `box.out`, `box.sales`, `t1.toCollect`, `t1.continueClose`, `t1.progress`, `c1.title`, `t1.privacy`, `s1.title`, `nav.today`, `nav.parties`, `nav.reports`

### Today: first day, nothing entered

- Route: `T2` · changed from the app today · mockup: `screens/today.html#c-today-first`
- Purpose: First morning of a new book. The only honest thing to ask for is the opening cash.
- Primary action: Enter opening cash (goes to T6).
- Taps / target: Setup task, once: Enter opening cash, digits, Save = 3 taps plus digits.
- Rules held: No inference: the app never suggests a figure; it is carried from his own count from tomorrow.
- Notes: Entry tiles stay hidden until the opening cash exists (as built: T2 shows only the opening step). Proposal for review: show the four tiles greyed with a dashed edge so he sees what is coming. Not done here, it changes T2 behaviour.
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "Saved" · "Today's book" · "Not started" · "Count the cash in the box before the first sale." · "From tomorrow this is carried from your own count, and never asked again." · "Enter opening cash" · "Today's figures appear here after the first entry." · "Today" · "Ledger" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t1.day.4`, `t1.month.11`, `sync.saved`, `t2.title`, `t2.notStarted`, `t2.prompt`, `t2.carried`, `t2.enterOpening`, `t2.empty`, `nav.today`, `nav.parties`, `nav.reports`

### Today: stale open day (book is for yesterday)

- Route: `T1` · changed from the app today · mockup: `screens/today.html#c-today-stale`
- Purpose: The open book belongs to an earlier day. Close it before today can start. Calm, not an alarm.
- Primary action: Close it now (opens the day-close list for the old day).
- Taps / target: Close it now = 1 tap to reach T5; day-close target under 3 min applies from there.
- Rules held: Frozen/ordered days: entries are refused until the old day is closed (refusal.dayStale). A compact banner replaces v1's large card, so the tiles do not drop a fifth of the screen.
- Notes: Tiles are shown greyed with a dashed edge and "aria-disabled". Tapping one shows the refusal banner (see below). Status is icon + words, never colour only.
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "Saved" · "This book is still open for 18 November. Close it to start today." · "Close it now" · "Sale" · "Udhar sale" · "Collect" · "Expense" · "More" · "In the box now" · "Opening" · "cash in" · "+" · "cash out" · "-" · "Sales today" · "Udhar to collect" · "4 of 10" · "Today" · "Ledger" · "Reports" · "Could not do that" · "This book is still open for an earlier day. Close it to start today."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t1.day.4`, `t1.month.11`, `sync.saved`, `t1.stale.body`, `t1.stale.action`, `act.sale`, `act.credit`, `act.collect`, `act.expense`, `t1.more`, `box.title`, `box.opening`, `box.in`, `box.out`, `box.sales`, `t1.toCollect`, `t1.progress`, `nav.today`, `nav.parties`, `nav.reports`, `refusal.titleNotDone`, `refusal.dayStale`

### Today: phone date is behind the book

- Route: `T1` · changed from the app today · mockup: `screens/today.html#c-today-future`
- Purpose: The phone clock is earlier than the book's date. Entries pause; nothing is lost; the fix is outside the app.
- Primary action: Open date settings (NEW button; v1 offered none, USABILITY known issue QA-06).
- Taps / target: 1 tap to the Android date settings, then Back.
- Rules held: Never auto-correct the date or the book (no inference). The book stays as recorded.
- Notes: Needs a host intent to open the phone's date and time settings (frontend build item, not a copy-only change; flagged). Compact banner instead of the four-line white card; at 2.0x the text wraps but the tiles remain reachable below.
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "Saved" · "This phone's date looks wrong. Your book is on 20 November, which is ahead of today. Nothing is lost. Check the phone's date and time." · "Open date settings" · "Sale" · "Udhar sale" · "Collect" · "Expense" · "More" · "In the box now" · "Opening" · "cash in" · "+" · "cash out" · "-" · "Sales today" · "Udhar to collect" · "Today" · "Ledger" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t1.day.4`, `t1.month.11`, `sync.saved`, `t1.future.body`, `act.sale`, `act.credit`, `act.collect`, `act.expense`, `t1.more`, `box.title`, `box.opening`, `box.in`, `box.out`, `box.sales`, `t1.toCollect`, `nav.today`, `nav.parties`, `nav.reports`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Open date settings"

### Today: closed day (frozen)

- Route: `T3` · changed from the app today · mockup: `screens/today.html#c-today-closed`
- Purpose: Today is closed and frozen (D7). Show the result; the only way to change it is a dated correction.
- Primary action: Post a correction (opens T16). Secondary: See the day summary (T14).
- Taps / target: Correction: 1 tap to the picker, then pick the entry, amount, Add.
- Rules held: D7: no entry rail; the tiles are replaced by a lock banner. Append-only: a correction is a new entry referencing the original.
- Notes: The greyed tiles of v1 were silent; here the banner says why (t3.banner) and offers the one action that exists.
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "Saved" · "Today is closed. Post a correction instead." · "Post a correction" · "See the day summary" · "In the box now" · "Opening" · "cash in" · "+" · "cash out" · "-" · "Sales today" · "Udhar to collect" · "Today" · "Ledger" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t1.day.4`, `t1.month.11`, `sync.saved`, `t3.banner`, `t3.correction`, `t3.summary`, `box.title`, `box.opening`, `box.in`, `box.out`, `box.sales`, `t1.toCollect`, `nav.today`, `nav.parties`, `nav.reports`

### Today: closed while the phone date was wrong

- Route: `T3` · changed from the app today · mockup: `screens/today.html#c-today-closed-wrongdate`
- Purpose: Today's book was closed earlier under a wrong phone date. New entries resume tomorrow. Keeps the record as it was.
- Primary action: See the day summary. No correction is offered for the wrong-date day beyond the normal one.
- Taps / target: 1 tap to the summary.
- Rules held: C-19 residual: the day is kept as recorded; nothing is rewritten.
- Notes: Same frame as the closed day with the longer sentence (t3.wrongDate.body).
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "Saved" · "Today's book (19 November) was already closed earlier, while the phone's date was wrong. New entries can start again tomorrow." · "See the day summary" · "In the box now" · "Opening" · "cash in" · "+" · "cash out" · "-" · "Sales today" · "Udhar to collect" · "Today" · "Ledger" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t1.day.4`, `t1.month.11`, `sync.saved`, `t3.wrongDate.body`, `t3.summary`, `box.title`, `box.opening`, `box.in`, `box.out`, `box.sales`, `t1.toCollect`, `nav.today`, `nav.parties`, `nav.reports`

### Today: offline, entries waiting to sync

- Route: `T1` · changed from the app today · mockup: `screens/today.html#c-today-offline`
- Purpose: No network. The app works fully; he needs to know the entries are safe on the phone and not yet on the server.
- Primary action: Keep selling (Sale tile). The chip is information; tapping it expands the explanation.
- Taps / target: Same as normal: no extra step because of the network.
- Rules held: Chip is amber with a clock, words "waiting - safe on phone", never red. It appears in the header of every screen, not as grey text mid-page (USABILITY item 8).
- Notes: Rows the server refused are parked and shown as a separate line (t1.parked) with a contact route. The queue drains by itself after signal returns (one drain was observed in the usability pass, USABILITY.md U-72; a single observation, not a benchmark).
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "3 waiting · safe on phone" · "3 waiting to send. Safe on this phone; it goes when the network is back." · "1 could not be sent - contact us" · "Sale" · "Udhar sale" · "Collect" · "Expense" · "More" · "In the box now" · "Opening" · "cash in" · "+" · "cash out" · "-" · "Sales today" · "Udhar to collect" · "Continue day close" · "4 of 10" · "Today" · "Ledger" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `sync.waiting`, `t1.day.4`, `t1.month.11`, `sync.waitingLong`, `t1.parked`, `act.sale`, `act.credit`, `act.collect`, `act.expense`, `t1.more`, `box.title`, `box.opening`, `box.in`, `box.out`, `box.sales`, `t1.toCollect`, `t1.continueClose`, `t1.progress`, `nav.today`, `nav.parties`, `nav.reports`

### Today: loading the book

- Route: `T1` · exists today, restyled · mockup: `screens/today.html#c-today-loading`
- Purpose: The day is being opened from the phone's own database. Placeholder rows, no spinner on save.
- Primary action: None; waits. Shown for well under a second normally.
- Taps / target: n/a
- Rules held: Skeleton shapes match the tiles and hero so nothing jumps when the figures arrive.
- Notes: Copy: common.loading is the accessible name only; no visible text.
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "Saved" · "Today" · "Ledger" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `sync.saved`, `t1.day.4`, `t1.month.11`, `common.loading`, `nav.today`, `nav.parties`, `nav.reports`

### Today: could not open the book

- Route: `T1` · exists today, restyled · mockup: `screens/today.html#c-today-error`
- Purpose: The book failed to open. Say plainly that nothing is lost and give one next step.
- Primary action: Try again (common.retry).
- Taps / target: 1 tap.
- Rules held: Calm words; the ledger is in SQLite and untouched. Error uses icon + words + an outlined edge; the edge colour is not the only cue.
- Notes: If retry fails twice the error boundary screen is the next stop (see system area).
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "Saved" · "Could not open this. Nothing you entered is lost." · "Try again" · "Today" · "Ledger" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `sync.saved`, `t1.day.4`, `t1.month.11`, `common.error`, `common.retry`, `nav.today`, `nav.parties`, `nav.reports`

### Today: More sheet (Purchase, Pay supplier, Withdrawal, Return)

- Route: `T1` · changed from the app today · mockup: `screens/today.html#c-today-more`
- Purpose: The less frequent entries, kept off the four pinned tiles. Opens over Today; closes with Back or a tap outside.
- Primary action: One of the rows. Each opens its own form.
- Taps / target: Purchase or Pay supplier: More, row = 2 taps to the form.
- Rules held: Each row names the real action (accessible name = visible word; fixes WCAG 2.5.3 W5). Withdrawal sits outside profit (D3).
- Notes: Return or exchange lives here too (reached from the Sale form in v1 as a caption that looked like text). It stays reachable from the Sale form as a proper button.
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "Saved" · "Sale" · "Udhar sale" · "Collect" · "Expense" · "More" · "In the box now" · "Opening" · "cash in" · "+" · "cash out" · "-" · "Today" · "Ledger" · "Reports" · "Purchase" · "Pay supplier" · "Taken by owner" · "Return" · "Adjustment"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `act.purchase`, `t8.title.pay`, `section.withdrawal`, `t1.day.4`, `t1.month.11`, `sync.saved`, `act.sale`, `act.credit`, `act.collect`, `act.expense`, `t1.more`, `box.title`, `box.opening`, `box.in`, `box.out`, `nav.today`, `nav.parties`, `nav.reports`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Return" · "Adjustment"

### Today: more cash went out than came in (derived observation)

- Route: `T1` · exists today, restyled · mockup: `screens/today.html#c-today-obs`
- Purpose: A derived observation, not an instruction: cash paid exceeds cash received. Asks him to look, never to act.
- Primary action: None. Informational; the tiles stay first.
- Taps / target: n/a
- Rules held: CLAUDE.md "No inference in data entry": this reads two engine figures already on screen; it guesses no input and gives no command.
- Notes: Appears below the hero. Wording is the existing t1.obs.title / body.
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "Saved" · "Sale" · "Udhar sale" · "Collect" · "Expense" · "More" · "In the box now" · "Opening" · "cash in" · "+" · "cash out" · "-" · "More cash went out than came in today. Worth a look before you count the box." · "Sales today" · "Udhar to collect" · "Continue day close" · "2 of 10" · "Today" · "Ledger" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t1.day.4`, `t1.month.11`, `sync.saved`, `act.sale`, `act.credit`, `act.collect`, `act.expense`, `t1.more`, `box.title`, `box.opening`, `box.in`, `box.out`, `t1.obs.title`, `t1.obs.body`, `box.sales`, `t1.toCollect`, `t1.continueClose`, `t1.progress`, `nav.today`, `nav.parties`, `nav.reports`

## Area: Sales (30 screen states)

The sale form (T7) in all its states, the customer picker, return or exchange (T18), and the two Premium item screens (I1, S9) with their free-plan locked state. The sale form is the busiest screen in the app and is drawn to the concept sum: header 64 + total 44 + two recent rows 96 + amount 64 + segment 60 + Return link 56+6 + Add 72 + keypad 266 = 728 of the 752 px app area (estimate from kit CSS, not a render).

### Sale: cash, nothing typed

- Route: `T7` · changed from the app today · mockup: `screens/sales.html#c-sales-cash-empty`
- Purpose: Record a sale. Cash is already chosen, so the commonest sale needs no mode tap.
- Primary action: Keypad digits, then the Add bar (teal, full width, directly above the keypad).
- Taps / target: Cash sale of 2 digits: Sale tile, 2 digits, Add = 4 taps. 3 digits = 5 taps. Target under 10 s (estimate from tap count; no user has timed it).
- Rules held: No inference: the amount starts empty, no suggested figure, no "usual" amount. The Add bar is live at zero so a Rs 0 tap can be refused in words after the tap (next frame), never greyed with no reason given. Newest entries first.
- Notes: Total, two newest entries (mode icon + word + time + amount), amount, segment, Return link, Add, keypad, all pinned, nothing scrolls. v1 listed up to four rows and the line just added was off screen (USABILITY item 6). The total is the engine figure for net sales and includes entries older than the two shown. "Return or exchange a sale" is a real button (a 56 px bordered one), not a caption. Add items (Premium) is the second link only when the plan allows it and a sale exists, see the Premium-link frame.
- Copy on screen (en): "Sales" · "Saved" · "Total so far" · "UPI" · "11:20" · "Cash" · "10:58" · "Amount" · "Udhar" · "Return or exchange a sale" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `formA.mode.upi`, `formA.mode.cash`, `formA.mode.udhar`, `formA.title`, `sync.saved`, `common.back`, `formA.runningTotal`, `formA.amount`, `t18.open`, `common.add`, `keypad.clear`, `keypad.delete`

### Sale: Premium plan, both links

- Route: `T7` · changed from the app today · mockup: `screens/sales.html#c-sales-cash-premium`
- Purpose: Same form on a Premium plan. A second link, Add items to a sale, sits beside Return or exchange.
- Primary action: Unchanged: digits then Add. The links are secondary.
- Taps / target: Add items: 1 tap to I1 from the form.
- Rules held: The links never hold up saving a sale or closing the day (items are optional, i1.optional).
- Notes: Two links share one 56 px row and wrap their words (Odia/Hindi are longer). Gate is allows(plan, items). In the beta build BETA.allFree is true, so every plan sees this frame today.
- Copy on screen (en): "Sales" · "Saved" · "Total so far" · "UPI" · "11:20" · "Cash" · "10:58" · "Amount" · "Udhar" · "Return or exchange a sale" · "Add items to a sale" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `formA.mode.upi`, `formA.mode.cash`, `formA.mode.udhar`, `formA.title`, `sync.saved`, `common.back`, `formA.runningTotal`, `formA.amount`, `t18.open`, `t7.items`, `common.add`, `keypad.clear`, `keypad.delete`

### Sale: cash, amount typed

- Route: `T7` · changed from the app today · mockup: `screens/sales.html#c-sales-cash-typed`
- Purpose: The amount is being typed. The figure is large, and the Add bar repeats it so he commits to exactly what he sees.
- Primary action: Add Rs 120.00.
- Taps / target: Cash sale of 3 digits (1, 2, 0): Sale tile, 3 digits, Add = 5 taps.
- Rules held: The figure is only what he typed. Keys are 56 px. The amount line wraps rather than clipping a lakh figure.
- Notes: No decimal key: the keypad types whole rupees (as built; paise only via entries elsewhere).
- Copy on screen (en): "Sales" · "Saved" · "Total so far" · "UPI" · "11:20" · "Cash" · "10:58" · "Amount" · "Udhar" · "Return or exchange a sale" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `formA.mode.upi`, `formA.mode.cash`, `formA.mode.udhar`, `formA.title`, `sync.saved`, `common.back`, `formA.runningTotal`, `formA.amount`, `t18.open`, `common.add`, `keypad.clear`, `keypad.delete`

### Sale: just saved

- Route: `T7` · changed from the app today · mockup: `screens/sales.html#c-sales-saved`
- Purpose: Say in words that the tap landed, and show the new entry first. The form is empty again for the next sale.
- Primary action: Next sale: type digits. Nothing to dismiss.
- Taps / target: Back to Today: 1 tap. The saved line clears itself on the next key.
- Rules held: Append-only: the row is a new entry. Total derived: it is the earlier total plus this sale, read from the engine, not accumulated by the form. The saved line carries a tick and words, never colour alone.
- Notes: The saved line "Saved ₹50.00, Cash" replaces the total line for this moment (the concept does the same; the app shows both, which costs 44 px and would push the keypad past the frame, so the total returns on the next key: proposal). The new row is first with mode and time and a raised background. Total figure shown below in the first row of the next frame is the new one.
- **For Saket's review:** Saved line replaces the total line for one moment instead of sitting above it, to keep the keypad on screen at 1.0x.
- Copy on screen (en): "Sales" · "Saved" · "Saved ₹50.00, Cash" · "Cash" · "11:42" · "UPI" · "11:20" · "Amount" · "Udhar" · "Return or exchange a sale" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `formA.mode.cash`, `entry.savedLong`, `formA.mode.upi`, `formA.mode.udhar`, `formA.title`, `sync.saved`, `common.back`, `formA.amount`, `t18.open`, `common.add`, `keypad.clear`, `keypad.delete`

### Sale: Rs 0 refused after tapping Add

- Route: `T7` · exists today, restyled · mockup: `screens/sales.html#c-sales-zero`
- Purpose: He tapped Add with nothing typed. The app says why, once, and nothing is saved.
- Primary action: Type an amount (the form is unchanged under the message).
- Taps / target: No extra step: type and tap Add again.
- Rules held: Refusal shows only after a tap on Add, never on opening, and is cleared as soon as he types or leaves, so it never leaks into the next form. A Rs 0 entry is refused (refusal.amountZero). Heading and body, with a neutral outlined edge; the words, not the edge colour, carry the meaning.
- Notes: refusal.amountZero points to "Nothing to enter" on the day-close list for a day with nothing to enter. The banner floats over the header area and does not move the pad.
- Copy on screen (en): "Sales" · "Saved" · "Total so far" · "UPI" · "11:20" · "Cash" · "10:58" · "Amount" · "Udhar" · "Return or exchange a sale" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0" · "Not saved" · "An amount of ₹0 is not saved. If there is nothing to enter, tap "Nothing to enter" on the day-close list."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `formA.mode.upi`, `formA.mode.cash`, `refusal.title`, `refusal.amountZero`, `formA.mode.udhar`, `formA.title`, `sync.saved`, `common.back`, `formA.runningTotal`, `formA.amount`, `t18.open`, `common.add`, `keypad.clear`, `keypad.delete`

### Sale: amount over the per-entry ceiling

- Route: `T7` · exists today, restyled · mockup: `screens/sales.html#c-sales-toolarge`
- Purpose: A slip of the finger made an amount above Rs 1 crore. Refuse in words and keep what he typed so he can fix one digit.
- Primary action: Delete the extra digit (Delete key), then Add.
- Taps / target: 1 tap (Delete) then Add.
- Rules held: One entry is at most Rs 1 crore (refusal.amountTooLarge). The typed figure stays on screen; nothing is saved or rounded.
- Notes: Typed 1,00,00,001 rupees to show the line just past the ceiling. The amount wraps onto a second line instead of running off the edge.
- Copy on screen (en): "Sales" · "Saved" · "Total so far" · "UPI" · "11:20" · "Cash" · "10:58" · "Amount" · "Udhar" · "Return or exchange a sale" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0" · "Not saved" · "One entry can be at most ₹1 crore. Check the digits."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `formA.mode.upi`, `formA.mode.cash`, `refusal.title`, `refusal.amountTooLarge`, `formA.mode.udhar`, `formA.title`, `sync.saved`, `common.back`, `formA.runningTotal`, `formA.amount`, `t18.open`, `common.add`, `keypad.clear`, `keypad.delete`

### Sale: UPI mode

- Route: `T7` · changed from the app today · mockup: `screens/sales.html#c-sales-upi`
- Purpose: A UPI sale is recorded, but no cash goes into the drawer. The form says so by what it does not change.
- Primary action: Add Rs 250.00 (UPI).
- Taps / target: UPI sale of 3 digits: Sale tile, UPI segment, 3 digits, Add = 6 taps. 2 digits = 5.
- Rules held: D2: a UPI sale adds no cash. In the box now is unchanged after saving (it is not on this screen; on Today it stays at the same figure). UPI is the amount the shopkeeper confirms as received, not a bank balance (decision 3).
- Notes: Selected segment carries a tick plus the word, other segments carry their own icon. The row list stays the same two rows. No change to "In the box now" is shown or implied; it is on Today, not here.
- Copy on screen (en): "Sales" · "Saved" · "Total so far" · "UPI" · "11:20" · "Cash" · "10:58" · "Amount" · "Udhar" · "Return or exchange a sale" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `formA.mode.upi`, `formA.mode.cash`, `formA.mode.udhar`, `formA.title`, `sync.saved`, `common.back`, `formA.runningTotal`, `formA.amount`, `t18.open`, `common.add`, `keypad.clear`, `keypad.delete`

### Sale: Udhar, customer not chosen

- Route: `T7` · changed from the app today · mockup: `screens/sales.html#c-sales-udhar-none`
- Purpose: A credit sale must name who owes it. The customer line replaces the two recent rows and asks for a choice.
- Primary action: Tap the Customer line (opens the picker).
- Taps / target: Udhar sale of 2 digits from the Udhar sale tile: tile, customer line, person, 2 digits, Add = 6 taps. From the Sale tile add 1 for the Udhar segment = 7.
- Rules held: The engine requires a party for udhar (partyRule). The form asks before the tap instead of throwing after it; "Choose who this is for before adding it" is shown as a plain line, not a red error.
- Notes: Udhar is shown as a plain line inside the customer block. If he taps Add anyway, the refusal is refusal.partyId, "Choose the person first." (shown as a banner, same as the Rs 0 refusal).
- Copy on screen (en): "Sales" · "Saved" · "Total so far" · "Customer" · "Choose the customer" · "Choose who this is for before adding it." · "Amount" · "Cash" · "UPI" · "Udhar" · "Return or exchange a sale" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `party.required`, `formA.customer`, `party.chooseCustomer`, `formA.mode.cash`, `formA.mode.upi`, `formA.mode.udhar`, `formA.title`, `sync.saved`, `common.back`, `formA.runningTotal`, `formA.amount`, `t18.open`, `common.add`, `keypad.clear`, `keypad.delete`

### Sale: Udhar, customer chosen, above the limit he set

- Route: `T7` · changed from the app today · mockup: `screens/sales.html#c-sales-udhar-cust`
- Purpose: The customer line shows who and what they owe now, in large type, before he commits more.
- Primary action: Add Rs 450.00 (Udhar).
- Taps / target: See the udhar frame above for the count.
- Rules held: The balance is shown before the amount is added. If the sale would take the customer past a limit he set, one sentence says so (limit.observation): something to review, never an instruction; the commit stays live and nothing is suggested in its place. No inference: the customer is only one he chose.
- Notes: The observation floats as a neutral banner so the pad stays put (the app renders it as one line under the name). Balance 1,280.00 plus 450.00 would be 1,730.00; the limit shown is 1,500.00, both from the demo figures. The "owes" word comes with the figure so the status is never colour or sign alone.
- Copy on screen (en): "Sales" · "Saved" · "Total so far" · "Customer" · "Ramesh" · "owes" · "Amount" · "Cash" · "UPI" · "Udhar" · "Return or exchange a sale" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0" · "Ramesh's udhar would be ₹1,730.00, above the limit ₹1,500.00 you set."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `limit.observation`, `picker.owes`, `formA.customer`, `formA.mode.cash`, `formA.mode.upi`, `formA.mode.udhar`, `formA.title`, `sync.saved`, `common.back`, `formA.runningTotal`, `formA.amount`, `t18.open`, `common.add`, `keypad.clear`, `keypad.delete`

### Customer picker

- Route: `T7` · changed from the app today · mockup: `screens/sales.html#c-sales-picker`
- Purpose: Choose the customer for this sale. Each row shows what that person owes, so he picks the right one by the number.
- Primary action: Tap a person (returns to the sale form with the line filled).
- Taps / target: 1 tap to choose. Add new customer is 1 tap more.
- Rules held: Per-person balances in large type, with the word "owes" or "nothing owed" (picker.owes, picker.settled), never colour alone. Customers only here: a supplier list would go on a purchase. No "recent" or "usual" shortcut: that would be a guess at who the customer is.
- Notes: Rows are sorted as the store returns them (shown here as a plain list). The picker uses a full screen with Back as the way out; cancel is also a quiet button at the foot. Balances are across every day on the phone.
- Copy on screen (en): "Choose the customer" · "Saved" · "B" · "Bijay" · "owes" · "L" · "Lakshmi" · "P" · "Pradeep" · "R" · "Ramesh" · "S" · "Sunita" · "nothing owed" · "Add new customer" · "Cancel"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `party.chooseCustomer`, `sync.saved`, `common.back`, `picker.owes`, `picker.settled`, `party.addCustomer`, `party.cancel`

### Customer picker: add a new customer

- Route: `T7` · exists today, restyled · mockup: `screens/sales.html#c-sales-picker-add`
- Purpose: The customer is not in the list yet. Add them without leaving the sale.
- Primary action: Save and choose (the new person is chosen and he is back on the sale).
- Taps / target: Add new customer, name, optional phone, Save and choose = 3 taps plus typing.
- Rules held: Name is required, phone is optional. Nothing is guessed from the phone book or contacts. The label says Optional so a missing phone does not feel like an error.
- Notes: The system keyboard is not drawn. The list screen is one tap back (Back to the list).
- Copy on screen (en): "New customer" · "Saved" · "Name" · "Anil" · "Mobile number (optional)" · "Save and choose" · "Back to the list"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `party.newCustomer`, `sync.saved`, `common.back`, `party.name`, `party.phone`, `party.save`, `party.backToList`

### Customer picker: name and phone refusals

- Route: `T7` · exists today, restyled · mockup: `screens/sales.html#c-sales-picker-refuse`
- Purpose: Name is empty, or the phone number is not a valid mobile number. Say which field and what to do.
- Primary action: Fix the field named, then Save and choose.
- Taps / target: 1 to 2 taps.
- Rules held: The refusal names the field (party.refusal.phone shown under the phone field, with an icon), the typed text stays. Equal visual weight for Back to the list.
- Notes: Two refusals exist: party.refusal.name (empty name) and party.refusal.phone (not a valid Indian mobile number). Drawn: phone refused. Name refusal reads the same way under the name field.
- Copy on screen (en): "New customer" · "Saved" · "Name" · "Anil" · "Mobile number (optional)" · "98765" · "A mobile number is 10 digits, starting 6, 7, 8 or 9. Or leave it empty." · "Save and choose" · "Back to the list"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `party.newCustomer`, `sync.saved`, `common.back`, `party.name`, `party.phone`, `party.refusal.phone`, `party.save`, `party.backToList`

### Sale: loading

- Route: `T7` · exists today, restyled · mockup: `screens/sales.html#c-sales-loading`
- Purpose: The day is opening from the phone. A skeleton, no spinner, no text.
- Primary action: None; waits.
- Taps / target: n/a
- Rules held: Skeleton rows match the entry shape. common.loading is the accessible name only.
- Notes: Shown for well under a second normally.
- Copy on screen (en): "Sales" · "Saved"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `formA.title`, `sync.saved`, `common.back`, `common.loading`

### Sale: could not open

- Route: `T7` · exists today, restyled · mockup: `screens/sales.html#c-sales-error`
- Purpose: The form failed to open. Say plainly that nothing is lost; one next step.
- Primary action: Try again.
- Taps / target: 1 tap.
- Rules held: Calm words. Entries are in the phone database and untouched. Icon plus words.
- Notes: Offline is not an error here: the form works fully and only the chip in the header changes (amber clock, "waiting, safe on phone"), never red.
- Copy on screen (en): "Sales" · "Saved" · "Could not open this. Nothing you entered is lost." · "Try again"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `formA.title`, `sync.saved`, `common.back`, `common.error`, `common.retry`

### Opening Sale: earlier day still open

- Route: `T1` · exists today, restyled · mockup: `screens/sales.html#c-sales-open-stale`
- Purpose: He tapped Sale while the open book belongs to an earlier day. The form does not open; he is told why and where to go.
- Primary action: Close it now (banner action).
- Taps / target: 1 tap to the day-close list for the old day.
- Rules held: refusal.dayStale. Entries are refused until the old day is closed (decision 1 on retailer-defined days will change what "earlier" means, a 00:30 sale belongs to the shop's own business day). Nothing is lost.
- Notes: Same frame as Today stale: tiles greyed with a dashed edge, then the refusal is a banner after the tap. See Today for the full frame.
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "Saved" · "This book is still open for 18 November. Close it to start today." · "Close it now" · "Sale" · "Udhar sale" · "Collect" · "Expense" · "More" · "In the box now" · "Opening" · "cash in" · "+" · "cash out" · "-" · "Today" · "Ledger" · "Reports" · "Could not do that" · "This book is still open for an earlier day. Close it to start today."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t1.day.4`, `t1.month.11`, `sync.saved`, `t1.stale.body`, `t1.stale.action`, `act.sale`, `act.credit`, `act.collect`, `act.expense`, `t1.more`, `box.title`, `box.opening`, `box.in`, `box.out`, `nav.today`, `nav.parties`, `nav.reports`, `refusal.titleNotDone`, `refusal.dayStale`

### Opening Sale: day is closed and frozen

- Route: `T3` · changed from the app today · mockup: `screens/sales.html#c-sales-open-closed`
- Purpose: The day is closed (D7). There is no Sale tile; the only change that exists is a dated correction.
- Primary action: Post a correction.
- Taps / target: 1 tap to the correction picker.
- Rules held: D7: a closed day is frozen, the database refuses a write by trigger. Append-only: a correction is a new entry that references the original. The wrong-date variant (closed while the phone date was wrong, refusal.dayClosedWrongDate) is the same frame with the longer sentence.
- Notes: v1 greyed the tiles silently. Here the banner says why. If a stale tap still reaches the engine, the refusal is refusal.dayClosedWrongDate.
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "Saved" · "Today is closed. Post a correction instead." · "Post a correction" · "In the box now" · "Opening" · "cash in" · "+" · "cash out" · "-" · "Today" · "Ledger" · "Reports" · "Could not do that" · "Today's book was already closed earlier, while the phone's date was wrong. New entries can start again tomorrow."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t1.day.4`, `t1.month.11`, `sync.saved`, `t3.banner`, `t3.correction`, `box.title`, `box.opening`, `box.in`, `box.out`, `nav.today`, `nav.parties`, `nav.reports`, `refusal.titleNotDone`, `refusal.dayClosedWrongDate`

### Opening Sale: phone date is behind the book

- Route: `T1` · exists today, restyled · mockup: `screens/sales.html#c-sales-open-future`
- Purpose: The phone clock is earlier than the book. Sale does not open; nothing is lost and the fix is outside the app.
- Primary action: Check the phone date and time (outside the app).
- Taps / target: 1 tap to dismiss, then fix the phone setting.
- Rules held: refusal.dayFuture. The app never auto-corrects the date (no inference).
- Notes: The Open date settings button proposed on Today needs a native intent (frontend work, flagged there).
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "Saved" · "Sale" · "Udhar sale" · "Collect" · "Expense" · "More" · "In the box now" · "Opening" · "cash in" · "+" · "cash out" · "-" · "Today" · "Ledger" · "Reports" · "Could not do that" · "This phone's date looks wrong. Your book is ahead of today. Nothing is lost. Check the phone's date and time."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t1.day.4`, `t1.month.11`, `sync.saved`, `act.sale`, `act.credit`, `act.collect`, `act.expense`, `t1.more`, `box.title`, `box.opening`, `box.in`, `box.out`, `nav.today`, `nav.parties`, `nav.reports`, `refusal.titleNotDone`, `refusal.dayFuture`

### Return or exchange: choose the sale

- Route: `T18` · changed from the app today · mockup: `screens/sales.html#c-sales-ret-list`
- Purpose: A return is always recorded against a sale. Pick the sale that came back, or settle an earlier return.
- Primary action: Tap a sale (opens the return form).
- Taps / target: Return a cash sale: Return link on the sale form, the sale, settlement, amount digits, Save return = 4 taps plus digits.
- Rules held: Each row: mode word, time, and what can still come back (the amount net of earlier returns), with "part returned" when some already has. Append-only: the return is a new entry that references the sale. Settlement of a pending return is its own list below.
- Notes: Returns still to settle is shown only when one exists, with the amount still to pay back. Four settlement states exist in the engine: refund paid, credit issued, replacement, pending settlement; the form offers Refund cash, Refund UPI, Credit issued, Pending, Exchange.
- Copy on screen (en): "Return or exchange" · "Saved" · "Choose the sale that came back" · "Cash sales" · "10:58" · "UPI sales" · "11:20 · part returned" · "Credit sales" · "Ramesh · 09:40" · "Returns still to settle" · "Still to pay back · 09:12"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t18.title`, `sync.saved`, `common.back`, `t18.sales`, `section.cash_sales`, `section.upi_sales`, `t18.partReturned`, `section.udhar_sales`, `t18.pending`, `t18.outstanding`

### Return or exchange: no sale yet

- Route: `T18` · exists today, restyled · mockup: `screens/sales.html#c-sales-ret-empty`
- Purpose: There is no sale to return against. Say why, and give the way forward.
- Primary action: Go to Sale.
- Taps / target: 1 tap.
- Rules held: A return is always against a sale, so with none there is nothing to enter.
- Notes: The app shows t18.empty and nothing else; the Go to Sale button is a proposal (new copy needed) so he is not at a dead end.
- **For Saket's review:** Added a Go to Sale button on the empty state so it is not a dead end.
- Copy on screen (en): "Return or exchange" · "Saved" · "No sale to return yet. A return is always recorded against a sale." · "Sale"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t18.title`, `sync.saved`, `common.back`, `t18.empty`, `act.sale`

### Return: settled by a cash refund

- Route: `T18` · changed from the app today · mockup: `screens/sales.html#c-sales-ret-cash`
- Purpose: Record the value that came back from one sale and how it was settled.
- Primary action: Save return.
- Taps / target: Sale, Refund cash (already first), 3 digits, Save return = see the list frame.
- Rules held: He confirms the goods came back (t18.confirm); the app cannot check the goods. The amount is capped at what can still come back (t18.tooMuch). D2: a cash refund moves the drawer, UPI or credit do not.
- Notes: Settlement is a list of five radios (the app shows five choices, drawn as a column so each label can wrap). Selected has a tick and the word. The amount, Save and keypad are pinned; the sale card and choices scroll. Sale card shows the sale and "Can still come back".
- Copy on screen (en): "Return or exchange" · "Saved" · "The sale" · "Cash sales · 10:58" · "Can still come back" · "How was it settled?" · "Refund cash" · "Refund UPI" · "Credit issued" · "Pending" · "Exchange" · "You confirm these goods came back from this sale. The app cannot check the goods themselves." · "Value of what came back" · "Save return" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t18.title`, `sync.saved`, `common.back`, `t18.sale`, `section.cash_sales`, `t18.returnable`, `t18.how`, `t18.opt.cash`, `t18.opt.upi`, `t18.opt.udhar`, `t18.opt.pending`, `t18.opt.exchange`, `t18.confirm`, `t18.returned`, `t18.save`, `keypad.clear`, `keypad.delete`

### Exchange: price of what went out, and the difference

- Route: `T18` · changed from the app today · mockup: `screens/sales.html#c-sales-ret-exchange`
- Purpose: One linked event: goods come back and different goods go out. The difference is the only money that moves.
- Primary action: Save return.
- Taps / target: Sale, Exchange, value that came back (digits), value that went out (digits), difference mode if any, Save = 6 taps plus digits.
- Rules held: The segment above the pad says which of the two values he is typing, the two are on the card. The customer pays the difference (t18.diffFrom) or the shop pays it back (t18.diffTo), and he says how it was paid (cash or UPI). If prices match, "Same price. No money changes hands." and no mode is asked. Only cash touches the drawer (D2).
- Notes: Demo: Rs 300.00 came back, Rs 450.00 went out, so the customer pays Rs 150.00, by cash. Difference is derived, never typed.
- Copy on screen (en): "Return or exchange" · "Saved" · "How was it settled?" · "Refund cash" · "Refund UPI" · "Credit issued" · "Pending" · "Exchange" · "Value of what came back" · "Price of what went out" · "The customer pays the difference" · "How was the difference paid?" · "Cash" · "UPI" · "Save return" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t18.title`, `sync.saved`, `common.back`, `t18.how`, `t18.opt.cash`, `t18.opt.upi`, `t18.opt.udhar`, `t18.opt.pending`, `t18.opt.exchange`, `t18.returned`, `t18.replacement`, `t18.diffFrom`, `t18.diffHow`, `formA.mode.cash`, `formA.mode.upi`, `t18.save`, `keypad.clear`, `keypad.delete`

### Settle an earlier return

- Route: `T18` · changed from the app today · mockup: `screens/sales.html#c-sales-ret-settle`
- Purpose: A return was recorded as Pending. Now the money is paid back, all or part.
- Primary action: Save.
- Taps / target: Row under "Returns still to settle", how paid, digits, Save = 4 taps plus digits.
- Rules held: Shows what is still to pay back. More than that is refused (t18.tooMuchSettle). Credit issued means it goes onto the customer balance (no cash).
- Notes: Paid back by: cash, UPI or Credit issued. Paying part leaves the return pending with a smaller amount.
- Copy on screen (en): "Return or exchange" · "Saved" · "Still to pay back" · "Paid back by" · "Cash" · "UPI" · "Credit issued" · "Paying back now" · "Save" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t18.title`, `sync.saved`, `common.back`, `t18.outstanding`, `t18.settleHow`, `formA.mode.cash`, `formA.mode.upi`, `t18.opt.udhar`, `t18.settleAmount`, `common.save`, `keypad.clear`, `keypad.delete`

### Return: more than the sale can take back

- Route: `T18` · exists today, restyled · mockup: `screens/sales.html#c-sales-ret-toomuch`
- Purpose: The value he typed is more than what can still come back from this sale.
- Primary action: Lower the amount.
- Taps / target: 1 tap (Delete).
- Rules held: Refused in words (t18.tooMuch); nothing saved. The same applies to settle with t18.tooMuchSettle.
- Notes: Banner floats over the header as for T7.
- Copy on screen (en): "Return or exchange" · "Saved" · "The sale" · "Cash sales · 10:58" · "Can still come back" · "How was it settled?" · "Refund cash" · "Refund UPI" · "Credit issued" · "Pending" · "Exchange" · "Value of what came back" · "Save return" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0" · "Not saved" · "That is more than this sale can still take back."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t18.title`, `sync.saved`, `common.back`, `t18.sale`, `section.cash_sales`, `t18.returnable`, `t18.how`, `t18.opt.cash`, `t18.opt.upi`, `t18.opt.udhar`, `t18.opt.pending`, `t18.opt.exchange`, `t18.returned`, `t18.save`, `keypad.clear`, `keypad.delete`, `refusal.title`, `t18.tooMuch`

### Items in a sale: free plan, locked

- Route: `I1` · changed from the app today · mockup: `screens/sales.html#c-sales-i1-locked`
- Purpose: Items per sale are Premium. On the free plan the screen says so and offers nothing else it cannot deliver.
- Primary action: See your plan (opens S10).
- Taps / target: 1 tap to S10.
- Rules held: Free is free for ever; the sale, the day close and every entry stay free (s10.free.*). Nothing is hidden or counted down, no pressure copy.
- Notes: The app shows only "Items per sale are part of Premium." and no button; the S10 pointer is a proposal so he is not at a dead end. In the session the form never links here on a free plan, so this is reached only by an old shortcut. In the beta build BETA.allFree is true, so this state is not reachable today.
- **For Saket's review:** Added a "Your plan" row (S10) to the locked state; the app offers no button there.
- Copy on screen (en): "Items in a sale" · "Saved" · "Items per sale are part of Premium." · "Your plan" · "You are on Free."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `i1.title`, `sync.saved`, `common.back`, `i1.premium`, `s10.title`, `s10.status.free`

### Items in a sale: choose today's sale (Premium)

- Route: `I1` · exists today, restyled · mockup: `screens/sales.html#c-sales-i1-sales`
- Purpose: Pick one of today's sales, then record which of his own items it was.
- Primary action: Tap a sale.
- Taps / target: Sale form, Add items, sale = 2 taps to the item list.
- Rules held: Optional and never holds up closing the day (i1.optional). Only today's sales are listed. No price is kept, so none can be suggested.
- Notes: Rows show the mode word, the time and the sale amount.
- Copy on screen (en): "Items in a sale" · "Saved" · "Optional. Only sales already added are listed, and items never hold up closing the day." · "Which of today’s sales?" · "Cash sales" · "11:42" · "UPI sales" · "11:20" · "10:58"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `i1.title`, `sync.saved`, `common.back`, `i1.optional`, `i1.pickSale`, `section.cash_sales`, `section.upi_sales`

### Items in a sale: no sales yet today

- Route: `I1` · exists today, restyled · mockup: `screens/sales.html#c-sales-i1-empty`
- Purpose: No sale today to add items to.
- Primary action: Go to Sale.
- Taps / target: 1 tap.
- Rules held: There is nothing to do here until a sale exists.
- Notes: The app shows i1.empty only; the button is a proposal.
- **For Saket's review:** Added a Go to Sale button on the empty state.
- Copy on screen (en): "Items in a sale" · "Saved" · "No sales today yet." · "Sale"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `i1.title`, `sync.saved`, `common.back`, `i1.empty`, `act.sale`

### Items in a sale: item, how many, amount

- Route: `I1` · exists today, restyled · mockup: `screens/sales.html#c-sales-i1-item`
- Purpose: Record one line of a sale: which of his items, how many, and for how much.
- Primary action: Save item.
- Taps / target: Item, quantity digits, amount digits, Save item = 4 taps plus digits.
- Rules held: The lines can never total more than the sale (refusal.itemOverSale shows what is left); the same item cannot be listed twice. Nothing is pre-chosen or pre-filled.
- Notes: Shows the sale with "Items recorded for ₹300.00 of the sale ₹450.00", the recorded lines, the choices as a column with Other last, and then, once an item is chosen, a Quantity / Amount segment above the pad. Drawn: Atta chosen and 2 typed for quantity. Lines recorded earlier: Rice × 1.
- Copy on screen (en): "Items in a sale" · "Saved" · "Cash sales · 10:58" · "Items recorded for of the sale" · "Rice 1 kg × 1" · "Which item?" · "Atta 1 kg" · "Sugar 1 kg" · "Tea 250 g" · "Other" · "How many" · "Amount" · "Save item" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `i1.title`, `sync.saved`, `common.back`, `section.cash_sales`, `i1.recorded`, `i1.of`, `i1.times`, `i1.item`, `i1.other`, `i1.quantity`, `i1.amount`, `i1.save`, `keypad.clear`, `keypad.delete`

### Your items: free plan, locked

- Route: `S9` · changed from the app today · mockup: `screens/sales.html#c-sales-s9-locked`
- Purpose: The list of things he sells. On the free plan, items already recorded can still be read; adding is Premium.
- Primary action: See your plan (S10).
- Taps / target: 1 tap to S10.
- Rules held: Everything recorded under Premium stays readable (s10.status.lapsed). No add box is shown that cannot work.
- Notes: The add card is absent (as built). The S10 row is a proposal; the app shows only s9.premium. Beta build: not reachable today (BETA.allFree).
- **For Saket's review:** Added a "Your plan" row (S10) on the locked state.
- Copy on screen (en): "Your items" · "Saved" · "The things you sell, by name. No price is kept: you type the amount on each sale." · "Adding items is part of Premium. Items already recorded stay here to read." · "Your plan" · "You are on Free." · "Atta 1 kg" · "Rice 1 kg" · "Sugar 1 kg"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s9.title`, `sync.saved`, `common.back`, `s9.intro`, `s9.premium`, `s10.title`, `s10.status.free`

### Your items: Premium, add an item

- Route: `S9` · exists today, restyled · mockup: `screens/sales.html#c-sales-s9-premium`
- Purpose: Keep a short list of what he sells, by name only.
- Primary action: Add to list.
- Taps / target: Name (typing), Add to list = 2 taps plus typing.
- Rules held: No price is kept: he types the amount on every sale (no inference). A duplicate name is refused (refusal.itemDuplicate). The "Tell your customers" notice (s9.noticeTitle, s9.notice) is a consent-style line he can read to a customer who buys on credit.
- Notes: Names are user data, shown as typed. The Add to list button waits until a name is typed, with a dashed edge and the same label. Empty list shows s9.empty, drawn in the next frame.
- Copy on screen (en): "Your items" · "Saved" · "The things you sell, by name. No price is kept: you type the amount on each sale." · "Item name" · "Dal 1 kg" · "Add to list" · "Atta 1 kg" · "Rice 1 kg" · "Sugar 1 kg" · "Tea 250 g" · "Tell your customers I record what you buy on credit in the SWAFTO app, to keep your account."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s9.title`, `sync.saved`, `common.back`, `s9.intro`, `s9.name`, `s9.add`, `s9.noticeTitle`, `s9.notice`

### Your items: Premium, list empty

- Route: `S9` · exists today, restyled · mockup: `screens/sales.html#c-sales-s9-empty`
- Purpose: No items yet. Ask for the ones he sells most.
- Primary action: Type a name and Add to list.
- Taps / target: 2 taps plus typing.
- Rules held: A next action is always on screen (the name field).
- Notes: The empty line is s9.empty; the field and button sit above it.
- Copy on screen (en): "Your items" · "Saved" · "The things you sell, by name. No price is kept: you type the amount on each sale." · "Item name" · "Add to list" · "No items yet. Add the ones you sell most."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s9.title`, `sync.saved`, `common.back`, `s9.intro`, `s9.name`, `s9.add`, `s9.empty`

## Area: Money entries (30 screen states)

Mitra versions of the entry forms that are not a plain sale: Udhar sale, Collect and Pay supplier (T8, one form with three live segments, titled by the real action), Expense and Purchase (T9), Withdrawal (T10), the typed Adjustment (T19) and the correction after a day is closed (T16), with the person picker for customers and for suppliers. Every form keeps header, entry block, strong Add and keypad on one screen. Digits are whole rupees as on the Sale form.

### Udhar sale: no person chosen yet

- Route: `T8` · changed from the app today · mockup: `screens/money.html#c-money-credit-start`
- Purpose: A sale on credit names a customer (udhar owed by nobody can never be collected). Nothing typed, nobody chosen: Add is live, and nothing red is showing.
- Primary action: Choose the customer, then type the amount, then Add.
- Taps / target: Today: Udhar sale tile (1), customer row (2), customer in the list (3), digits (3 for a three-figure amount), Add = 8 taps. If the customer is already kept from the last entry: 5 taps. Target under 10 s for a sale; a count of taps, not a measured time.
- Rules held: Udhar does not move the cash drawer (D2). The person is required for this segment (engine partyRule). No refusal is drawn before a tap (QA-07). No suggested amount, no "usual" customer (no inference).
- Notes: Draws the real T8 form. The person row is in the scrolling body above the segment, never between the amount and the keypad. Title is the live segment (t8.title.credit), and the total beside it is what customers owe (P7), not the old "Udhar book" for all three. Add is a full-width bar above the keypad (v1 had it beside the figure). The segment order is Collect, Pay supplier, Udhar sale as built; this frame has Udhar sale live.
- Copy on screen (en): "Udhar sale" · "Saved" · "Owed to you" · "Choose the customer" · "Customer" · "Credit sales - Lakshmi" · "16:10" · "Udhar collected - Sunita - Cash" · "12:10" · "Collect" · "Pay supplier" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t8.title.credit`, `t8.outstanding`, `party.customer`, `party.chooseCustomer`, `section.udhar_sales`, `section.udhar_collection`, `formA.mode.cash`, `t8.collect`, `t8.pay`, `t8.credit`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Udhar sale: customer chosen, balance above the keypad, amount typed

- Route: `T8` · changed from the app today · mockup: `screens/money.html#c-money-credit-typed`
- Purpose: He sees how much this customer already owes before he adds more, on the screen where that is the question.
- Primary action: Add (₹800.00 shows on the bar).
- Taps / target: Digits 8, 0, 0 (3 taps), Add (1) after the customer is chosen.
- Rules held: Balance is derived from the entries, never stored. The saved udhar will not change "In the box now" (D2).
- Notes: Person row shows the name with the balance under it in words and figure (picker.owes). Same figure the picker row showed.
- Copy on screen (en): "Udhar sale" · "Saved" · "Owed to you" · "Ramesh" · "Customer · owes" · "Credit sales - Lakshmi" · "16:10" · "Collect" · "Pay supplier" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t8.title.credit`, `t8.outstanding`, `picker.owes`, `party.customer`, `section.udhar_sales`, `t8.collect`, `t8.pay`, `t8.credit`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Udhar sale: above the limit he set (said, never enforced)

- Route: `T8` · exists today, restyled · mockup: `screens/money.html#c-money-credit-limit`
- Purpose: This customer has a credit limit. The sale would go past it; the form says so in one sentence and still lets him add.
- Primary action: Add stays live. The sentence is something to review, not an instruction.
- Taps / target: No extra tap.
- Rules held: R5 FR-6: observation only, nothing is suggested in its place and the amount stays as typed. Status is words in a bordered box, not colour only.
- Notes: Wording is the existing limit.observation.
- Copy on screen (en): "Udhar sale" · "Saved" · "Owed to you" · "Pradeep" · "Customer · owes" · "Pradeep's udhar would be ₹5,500.00, above the limit ₹5,000.00 you set." · "Collect" · "Pay supplier" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t8.title.credit`, `t8.outstanding`, `picker.owes`, `party.customer`, `limit.observation`, `t8.collect`, `t8.pay`, `t8.credit`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Udhar sale: saved

- Route: `T8` · changed from the app today · mockup: `screens/money.html#c-money-credit-saved`
- Purpose: The tap landed: say so in words with the figure and the mode, and show the new line first. The person stays chosen; the draft is empty.
- Primary action: Next entry, or Back to Today.
- Taps / target: Back = 1 tap.
- Rules held: Append-only: a new line, nothing edited. The customer now owes ₹1,200.00 + ₹800.00 = ₹2,000.00 and the P7 total moves by the same ₹800.00 (derived). No cash line moves.
- Notes: After Add the code clears the amount but not the chosen person (entryPartyId is kept). I did not confirm whether opening another tile from Today clears the person; the one-sentence assumption is flagged here.
- Copy on screen (en): "Udhar sale" · "Saved" · "Saved ₹800.00, Udhar" · "Owed to you" · "Ramesh" · "Customer · owes" · "Credit sales - Ramesh" · "17:42" · "Credit sales - Lakshmi" · "16:10" · "Collect" · "Pay supplier" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t8.title.credit`, `formA.mode.udhar`, `entry.savedLong`, `t8.outstanding`, `picker.owes`, `party.customer`, `section.udhar_sales`, `t8.collect`, `t8.pay`, `t8.credit`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Collect: no person chosen yet

- Route: `T8` · changed from the app today · mockup: `screens/money.html#c-money-collect-start`
- Purpose: Money coming back from a customer. Nobody chosen yet, nothing typed; Add is live and nothing red is on screen.
- Primary action: Choose the customer (the row), then digits, then Add.
- Taps / target: COLLECT from Today (target under 20 s, taps only): Collect tile (1), customer row (2), customer in the list (3), digits 5,0,0 (4,5,6), Add (7) = 7 taps. With the person already kept from the last entry: 5 taps.
- Rules held: Collect adds cash to the drawer (D2: only cash mode touches it). No stale refusal from the last form is shown (QA-07).
- Notes: Draws the real T8 form. The person row is in the scrolling body above the segment, never between the amount and the keypad. Title is "Collect" (t8.title.collect) and the total beside it is what customers owe (P7).
- Copy on screen (en): "Collect" · "Saved" · "Owed to you" · "Choose the customer" · "Customer" · "Udhar collected - Sunita - Cash" · "12:10" · "Pay supplier" · "Udhar sale" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t8.title.collect`, `t8.outstanding`, `party.customer`, `party.chooseCustomer`, `section.udhar_collection`, `formA.mode.cash`, `t8.collect`, `t8.pay`, `t8.credit`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Collect: person chosen, balance above the keypad, amount typed

- Route: `T8` · changed from the app today · mockup: `screens/money.html#c-money-collect-typed`
- Purpose: He sees Ramesh owes ₹1,200.00 before he types what Ramesh paid.
- Primary action: Add (₹500.00 on the bar).
- Taps / target: Digits and Add as counted on the start frame.
- Rules held: The figure typed is what he typed; the app does not offer "pay in full" or any amount (no inference). Balance derived from entries.
- Notes: Balance wording is picker.owes beside the figure. After Add Ramesh will owe ₹700.00.
- Copy on screen (en): "Collect" · "Saved" · "Owed to you" · "Ramesh" · "Customer · owes" · "Udhar collected - Sunita - Cash" · "12:10" · "Pay supplier" · "Udhar sale" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t8.title.collect`, `t8.outstanding`, `picker.owes`, `party.customer`, `section.udhar_collection`, `formA.mode.cash`, `t8.collect`, `t8.pay`, `t8.credit`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Collect: more than they owe (QA-03 confirm)

- Route: `T8` · changed from the app today · mockup: `screens/money.html#c-money-collect-advance`
- Purpose: Sunita owes ₹300.00 and he typed ₹500.00. The app asks, calmly, rather than silently going negative or refusing.
- Primary action: Two equal choices: Record as advance, or No, go back. Neither is the louder button.
- Taps / target: Adds ONE tap to the collect count: 8 taps with the person chosen from the list, 6 with the person kept. Going back keeps the typed amount for him to correct.
- Rules held: QA-03: held until he confirms; confirmed, it is saved as typed and the balance then shows as "Advance" in words, never a bare minus. No confirm-shaming: both buttons the same size and weight, the sentence states the facts only.
- Notes: The app draws this as an inline card in the form with Record as advance as the solid button and No, go back as a ghost; here it is a centred dialog with the two buttons outlined alike (proposal, so the refusing choice has equal visual weight). Wording is advance.confirm, advance.yes, advance.no, existing keys. The same dialog appears when a payment to a supplier is more than is owed.
- **For Saket's review:** Proposal: replace the inline card with this dialog, and give "No, go back" the same weight as "Record as advance".
- Copy on screen (en): "Collect" · "Saved" · "Owed to you" · "Sunita" · "Customer · owes" · "Udhar collected - Sunita - Cash" · "12:10" · "Pay supplier" · "Udhar sale" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0" · "This is ₹200.00 more than they owe. Record ₹200.00 as advance?" · "Record as advance" · "No, go back"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t8.title.collect`, `t8.outstanding`, `picker.owes`, `party.customer`, `section.udhar_collection`, `formA.mode.cash`, `t8.collect`, `t8.pay`, `t8.credit`, `advance.confirm`, `advance.yes`, `advance.no`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Collect: Rs 0 refused

- Route: `T8` · exists today, restyled · mockup: `screens/money.html#c-money-collect-zero`
- Purpose: He tapped Add with ₹0.00. A zero entry could never be removed (append-only) and would count on the day-close list, so it is not saved, and the message says where to go if there is nothing to enter.
- Primary action: Type an amount, or leave: the refusal tells him the day-close list has "Nothing to enter".
- Taps / target: No extra taps. The refusal appears only after the Add tap; it clears on the next digit.
- Rules held: QA-04: Rs 0 is refused (refusal.amountZero). A refusal never shows before a tap and is cleared when the amount changes, so it never leaks into the next form. Words and a "Not saved" title; not colour alone.
- Notes: Same banner for any entry form. The banner is an overlay at the top of the app, as built.
- Copy on screen (en): "Collect" · "Saved" · "Owed to you" · "Ramesh" · "Customer · owes" · "Udhar collected - Sunita - Cash" · "12:10" · "Pay supplier" · "Udhar sale" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0" · "Not saved" · "An amount of ₹0 is not saved. If there is nothing to enter, tap "Nothing to enter" on the day-close list."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t8.title.collect`, `t8.outstanding`, `picker.owes`, `party.customer`, `section.udhar_collection`, `formA.mode.cash`, `t8.collect`, `t8.pay`, `t8.credit`, `refusal.title`, `refusal.amountZero`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Collect: amount typed, nobody chosen

- Route: `T8` · exists today, restyled · mockup: `screens/money.html#c-money-collect-noperson`
- Purpose: He typed an amount and has not chosen who paid. First the form says why Add cannot finish, in the row above the pad; if he taps Add anyway the refusal names the missing person.
- Primary action: Choose the customer.
- Taps / target: No extra taps: the same choose-customer step as the start frame.
- Rules held: QA-07: the sentence "Choose who this is for before adding it." appears only once an amount is typed, never on a fresh form. The refusal (refusal.partyId) appears only after the Add tap.
- Notes: The in-form sentence (party.required) and the refusal banner are drawn together here to show both; in the app the banner shows only after Add.
- Copy on screen (en): "Collect" · "Saved" · "Owed to you" · "Choose the customer" · "Customer" · "Choose who this is for before adding it." · "Pay supplier" · "Udhar sale" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0" · "Not saved" · "Choose the person first."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t8.title.collect`, `t8.outstanding`, `party.customer`, `party.chooseCustomer`, `party.required`, `t8.collect`, `t8.pay`, `t8.credit`, `refusal.title`, `refusal.partyId`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Collect: saved

- Route: `T8` · changed from the app today · mockup: `screens/money.html#c-money-collect-saved`
- Purpose: Saved ₹500.00, Cash, in words. Ramesh now owes ₹700.00 and the P7 total is ₹21,000.00, both derived.
- Primary action: Next entry, or Back.
- Taps / target: Back = 1 tap.
- Rules held: Only cash mode touches the drawer: "In the box now" on Today moves by +₹500.00. Append-only: a new line on top, nothing edited.
- Notes: Collected lines carry a plus; the payment form below carries a minus.
- Copy on screen (en): "Collect" · "Saved" · "Saved ₹500.00, Cash" · "Owed to you" · "Ramesh" · "Customer · owes" · "Udhar collected - Ramesh - Cash" · "17:48" · "Udhar collected - Sunita - Cash" · "12:10" · "Pay supplier" · "Udhar sale" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t8.title.collect`, `formA.mode.cash`, `entry.savedLong`, `t8.outstanding`, `picker.owes`, `party.customer`, `section.udhar_collection`, `t8.collect`, `t8.pay`, `t8.credit`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Pay supplier: no supplier chosen yet

- Route: `T8` · changed from the app today · mockup: `screens/money.html#c-money-pay-start`
- Purpose: Money going out to a supplier. The list offers suppliers only (never customers), and the total beside the title is what the shop owes them.
- Primary action: Choose the supplier, type, Add.
- Taps / target: Today: More (1), Pay supplier row (2), supplier row (3), supplier in the list (4), digits 3,0,0,0 (5 to 8), Add (9) = 9 taps for ₹3,000. With the supplier kept: 7. A Pay tile on Today would save one tap; not proposed here, only counted.
- Rules held: Title is "Pay supplier" and the total is "You owe suppliers" (P8): v1 showed "Owed to you" here, a customer figure. Cash out of the drawer (D2) is printed with a minus.
- Notes: Draws the real T8 form. The person row is in the scrolling body above the segment, never between the amount and the keypad. There is no Pay tile on Today; Pay supplier is a row in the More sheet.
- Copy on screen (en): "Pay supplier" · "Saved" · "You owe suppliers" · "Choose the supplier" · "Supplier" · "Paid to suppliers - Jagannath Stores - Cash" · "11:20" · "-" · "Collect" · "Udhar sale" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t8.title.pay`, `p1.youOwe`, `party.supplier`, `party.chooseSupplier`, `section.party_payment`, `formA.mode.cash`, `t8.collect`, `t8.pay`, `t8.credit`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Pay supplier: supplier chosen, what you owe above the keypad, amount typed

- Route: `T8` · changed from the app today · mockup: `screens/money.html#c-money-pay-typed`
- Purpose: He sees he owes Mahadev Traders ₹8,000.00 before he types what he paid.
- Primary action: Add (₹3,000.00).
- Taps / target: Digits and Add as counted on the start frame.
- Rules held: The word is "you owe" (picker.youOwe), the supplier-side wording. A payment above what is owed gets the same advance confirm as Collect (QA-03). Nothing suggested.
- Notes: Typed ₹3,000.00 is under the ₹8,000.00 owed, so no confirm. After Add the shop owes ₹5,000.00.
- Copy on screen (en): "Pay supplier" · "Saved" · "You owe suppliers" · "Mahadev Traders" · "Supplier · you owe" · "Paid to suppliers - Jagannath Stores - Cash" · "11:20" · "-" · "Collect" · "Udhar sale" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t8.title.pay`, `p1.youOwe`, `picker.youOwe`, `party.supplier`, `section.party_payment`, `formA.mode.cash`, `t8.collect`, `t8.pay`, `t8.credit`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Pay supplier: saved

- Route: `T8` · changed from the app today · mockup: `screens/money.html#c-money-pay-saved`
- Purpose: Saved ₹3,000.00, Cash. The supplier now shows ₹5,000.00 owed and P8 drops by the same figure.
- Primary action: Next entry, or Back.
- Taps / target: Back = 1 tap.
- Rules held: Out-flow printed with a minus: "In the box now" drops by ₹3,000.00. A payment to a supplier is not an expense and is not in profit.
- Notes: The new line is on top, negative.
- Copy on screen (en): "Pay supplier" · "Saved" · "Saved ₹3,000.00, Cash" · "You owe suppliers" · "Mahadev Traders" · "Supplier · you owe" · "Paid to suppliers - Mahadev Traders - Cash" · "17:51" · "-" · "Paid to suppliers - Jagannath Stores - Cash" · "11:20" · "Collect" · "Udhar sale" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t8.title.pay`, `formA.mode.cash`, `entry.savedLong`, `p1.youOwe`, `picker.youOwe`, `party.supplier`, `section.party_payment`, `t8.collect`, `t8.pay`, `t8.credit`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Person picker: customers (Collect and Udhar sale)

- Route: `T8` · changed from the app today · mockup: `screens/money.html#c-money-picker-customer`
- Purpose: Choose who. Every row shows the person's name and what they owe, large, because this is where he decides whose udhar he is collecting.
- Primary action: Tap the person (the whole row is the target).
- Taps / target: 1 tap to choose. Add new customer is one more route when the book is new.
- Rules held: Balance is derived across every day this phone holds. A zero balance says "nothing owed" in words; a negative balance would say "Advance", never a bare minus. Customers only for Collect and Udhar sale, so an entry cannot land on the wrong side of the book. Row height 76 or more.
- Notes: Rows are K.prow with avatar initial, as in the Parties list. The order is the order of the book; no "most used first" ranking (no inference). Cancel is the same weight as Add new customer.
- Copy on screen (en): "Customer" · "Saved" · "Choose the customer" · "R" · "Ramesh" · "owes" · "S" · "Sunita" · "B" · "Bijay" · "nothing owed" · "L" · "Lakshmi" · "P" · "Pradeep" · "Add new customer" · "Cancel"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `picker.owes`, `picker.settled`, `party.chooseCustomer`, `party.addCustomer`, `party.cancel`, `party.customer`, `sync.saved`, `common.back`

### Person picker: suppliers (Pay supplier, Purchase on credit)

- Route: `T8` · changed from the app today · mockup: `screens/money.html#c-money-picker-supplier`
- Purpose: Same picker for the supplier side. The wording is "you owe", and a settled supplier says "nothing owed".
- Primary action: Tap the supplier.
- Taps / target: 1 tap to choose.
- Rules held: Suppliers only on this side. The person kind comes from the live segment: Purchase and Pay supplier are supplier; Collect and Udhar sale are customer.
- Notes: The same list is used by Purchase (optional supplier) and Pay supplier (required).
- Copy on screen (en): "Supplier" · "Saved" · "Choose the supplier" · "M" · "Mahadev Traders" · "you owe" · "J" · "Jagannath Stores" · "nothing owed" · "S" · "Shree Agencies" · "Add new supplier" · "Cancel"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `picker.youOwe`, `picker.settled`, `party.chooseSupplier`, `party.addSupplier`, `party.cancel`, `party.supplier`, `sync.saved`, `common.back`

### Person picker: empty book (no suppliers yet)

- Route: `T8` · exists today, restyled · mockup: `screens/money.html#c-money-picker-empty`
- Purpose: A new shop has nobody to choose. The empty list says so and the next action is on the same screen: add one.
- Primary action: Add new supplier (opens a Name and optional mobile number form, then "Save and choose").
- Taps / target: Add new supplier (1), type a name, Save and choose (1) = then back on the form with the new supplier chosen.
- Rules held: F-10: a party can be added from inside the picker, otherwise every entry that needs a person would be refused with nobody to name. Never "nothing here yet" alone.
- Notes: party.noSuppliers / party.noCustomers are the empty copy. The new-party form itself (party.name, party.phone, party.save, party.backToList) is not drawn here; it belongs to the Parties area.
- Copy on screen (en): "Supplier" · "Saved" · "Choose the supplier" · "No suppliers in the book yet." · "Add new supplier" · "Cancel"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `party.supplier`, `sync.saved`, `common.back`, `party.chooseSupplier`, `party.noSuppliers`, `party.addSupplier`, `party.cancel`

### Expense: five modes, Cash live

- Route: `T9` · changed from the app today · mockup: `screens/money.html#c-money-expense`
- Purpose: Money the shop spent running itself (tea, transport, rent). Five modes; only Cash leaves the drawer.
- Primary action: Type the amount, Add.
- Taps / target: Today: Expense tile (1), digits (2 for ₹80), Add (1) = 4 taps. The mode defaults to Cash, so a cash expense costs no segment tap.
- Rules held: D2: UPI, Other, Udhar and Shop stock are recorded but do not move the drawer. No person row: the engine refuses a party on an expense. Expenses are in profit; a withdrawal is not (see T10).
- Notes: The code has no "What for?" text box on this form (the key t9.label exists but is not rendered here); I did not add one. Five segments wrap to two rows; each is 56 high.
- Copy on screen (en): "Expense" · "Saved" · "Expenses" · "Expenses - Cash" · "14:05" · "Expenses - Other" · "09:30" · "Cash" · "UPI" · "Other" · "Udhar" · "Shop stock" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t9.title`, `section.expense`, `formA.mode.cash`, `t9.mode.other`, `formA.mode.upi`, `formA.mode.udhar`, `t9.mode.shop_stock`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Expense: Shop stock live (no cash moves)

- Route: `T9` · exists today, restyled · mockup: `screens/money.html#c-money-expense-stock`
- Purpose: An expense paid out of the shop's own stock changes profit and does not touch the drawer. Offering it stops him recording it as cash and the drawer failing to reconcile for a reason he cannot find.
- Primary action: Type the amount, Add.
- Taps / target: +1 tap for the segment (5 taps).
- Rules held: D2: only cash touches the cash equation; Shop stock does not. The mode is the only difference on screen.
- Notes: Same form, one segment selected.
- Copy on screen (en): "Expense" · "Saved" · "Expenses" · "Expenses - Cash" · "14:05" · "Cash" · "UPI" · "Other" · "Udhar" · "Shop stock" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t9.title`, `section.expense`, `formA.mode.cash`, `formA.mode.upi`, `t9.mode.other`, `formA.mode.udhar`, `t9.mode.shop_stock`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Purchase: four modes, optional supplier row with chevron

- Route: `T9` · changed from the app today · mockup: `screens/money.html#c-money-purchase`
- Purpose: Buying stock for the shop. A non-credit purchase may name a supplier but does not have to; a credit (Udhar) purchase must.
- Primary action: Type the amount, Add. The supplier row is a chevron row; skipping it is allowed.
- Taps / target: Today: More (1), Purchase (2), digits (3 for ₹4,000 = 4 digits: 4 taps), Add (1) = 8 taps without a supplier; +2 taps to name one.
- Rules held: The supplier row is Optional for Cash, UPI and Other; the segment Udhar makes it required (refusal.partyId appears only after the Add tap). Shop stock is not offered here: taking stock into the shop is what a purchase already is. Cash outflow is printed with a minus.
- Notes: The supplier row with the chevron is on PURCHASE, not Expense: the engine refuses a person on an expense and makes one optional on a purchase. The row carries the word "Optional" (party.optional).
- Copy on screen (en): "Purchase" · "Saved" · "Purchases" · "Choose the supplier" · "Supplier · Optional" · "Purchases - Mahadev Traders - Udhar" · "10:15" · "Cash" · "UPI" · "Other" · "Udhar" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `act.purchase`, `section.purchase`, `party.supplier`, `party.optional`, `party.chooseSupplier`, `formA.mode.udhar`, `formA.mode.cash`, `formA.mode.upi`, `t9.mode.other`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Withdrawal: money you took

- Route: `T10` · changed from the app today · mockup: `screens/money.html#c-money-withdraw`
- Purpose: The owner takes money out for himself. It leaves the drawer and is NOT a cost of the shop, so it stays outside profit (D3).
- Primary action: Type the amount, Add.
- Taps / target: Today: More (1), Withdrawal (2), digits (4 for ₹5,000), Add (1) = 8 taps; Cash is live by default.
- Rules held: D3 said in words, on the form: "This leaves the cash box but is not a shop cost, so it does not change profit." (t10.note), as a calm note with an info icon, not small grey text. Cash or UPI only. No person.
- Notes: Withdrawal is not an expense: recorded as one it would understate profit. Two modes only (cash, upi); a UPI withdrawal does not move the drawer (D2).
- Copy on screen (en): "Money you took" · "Saved" · "Taken by owner" · "This leaves the cash box but is not a shop cost, so it does not change profit." · "Taken by owner - Cash" · "13:00" · "-" · "Cash" · "UPI" · "Amount" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t10.title`, `section.withdrawal`, `t10.note`, `formA.mode.cash`, `formA.mode.upi`, `sync.saved`, `common.back`, `formA.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Adjustment: choose what happened (fixed list)

- Route: `T19` · changed from the app today · mockup: `screens/money.html#c-money-adjust-list`
- Purpose: A typed adjustment explains a gap in the cash count. Step one: what happened, from a fixed list of five. There is no text box and no "other".
- Primary action: Choose one of the five, then type the amount, then Save adjustment.
- Taps / target: Reached from the day-close list (T5) via Add adjustment: type (1), digits (2 for ₹50), Save adjustment (1) = 4 taps.
- Rules held: Decision 2: typed from a fixed list, never free-form; a free-form adjustment could absorb any discrepancy and make expected-vs-actual meaningless. Nothing is pre-selected or pre-filled. Save is shown held until a type and an amount exist.
- Notes: Five radio rows, 56 or more high, each a label only. The consequence line appears after choosing (next frame). It is also reachable from the More sheet on Today in this redesign, which is a change: today it is only on T5.
- Copy on screen (en): "Adjustment" · "Saved" · "What happened?" · "Fake note received" · "Chhutta: gave extra change" · "Chhutta: customer left the change" · "Goods taken for home (at cost)" · "Damaged or expired stock thrown away" · "Amount" · "Save adjustment" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `adjustment.counterfeit_note`, `adjustment.rounding_given`, `adjustment.rounding_kept`, `adjustment.home_use`, `adjustment.stock_written_off`, `t19.title`, `sync.saved`, `common.back`, `t19.type`, `t19.amount`, `t19.save`, `keypad.clear`, `keypad.delete`

### Adjustment: type chosen, effect said, amount typed

- Route: `T19` · changed from the app today · mockup: `screens/money.html#c-money-adjust-chosen`
- Purpose: He sees what the chosen type will move before he saves: a fake note takes ₹50.00 off expected cash and off profit.
- Primary action: Save adjustment.
- Taps / target: Counted above.
- Rules held: Each type states its effect in words (adjust.effect.*): goods taken home or written-off stock move no cash. The chosen row is shown with a tick and a heavier edge, not colour alone. Append-only: saved as a new line.
- Notes: The list scrolls above the pad; the chosen row and its effect sentence are kept on screen by scrolling to the chosen row. Save is live now.
- Copy on screen (en): "Adjustment" · "Saved" · "What happened?" · "Fake note received" · "Chhutta: gave extra change" · "Chhutta: customer left the change" · "Takes it off expected cash and off profit." · "Amount" · "Save adjustment" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `adjustment.counterfeit_note`, `adjustment.rounding_given`, `adjustment.rounding_kept`, `t19.title`, `sync.saved`, `common.back`, `t19.type`, `adjust.effect.counterfeit_note`, `t19.amount`, `t19.save`, `keypad.clear`, `keypad.delete`

### Adjustment: day is closed (no controls that would only throw)

- Route: `T19` · exists today, restyled · mockup: `screens/money.html#c-money-adjust-closed`
- Purpose: On a closed day the type rows are disabled and there is no amount, Save or keypad: a closed day is frozen.
- Primary action: Back. The only change to a closed day is a correction (see below).
- Taps / target: Back = 1 tap.
- Rules held: D7: the database would refuse the write. F-7: offer no control that can only fail. The lock banner is words plus an icon.
- Notes: The code draws the disabled rows without a banner; the lock banner and the correction button here are an addition (proposal).
- **For Saket's review:** Proposal: add the lock banner and a "Post a correction" button to this frozen view (the app shows disabled rows only).
- Copy on screen (en): "Adjustment" · "Saved" · "Today is closed. Post a correction instead." · "Post a correction" · "What happened?" · "Fake note received" · "Chhutta: gave extra change" · "Chhutta: customer left the change" · "Goods taken for home (at cost)" · "Damaged or expired stock thrown away"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `adjustment.counterfeit_note`, `adjustment.rounding_given`, `adjustment.rounding_kept`, `adjustment.home_use`, `adjustment.stock_written_off`, `t19.title`, `sync.saved`, `common.back`, `t3.banner`, `t3.correction`, `t19.type`

### Correction: choose the entry that was short

- Route: `T16` · changed from the app today · mockup: `screens/money.html#c-money-correct-list`
- Purpose: A day is closed and frozen. He missed an amount. Step one: say it cannot be reopened, then pick which entry was short.
- Primary action: Tap the entry.
- Taps / target: From Today (closed): Post a correction (1), entry (2), digits (2 for ₹50), Add (1) = 5 taps.
- Rules held: D1/D7: nothing is edited or deleted and the closed day never moves. A correction adds what was missed as a NEW entry that points at the one it corrects, dated to the next open business day. Amounts are never negative. Each row says what it is, how it was paid, when, and the amount. The return legs are not offered.
- Notes: The real rows show section, label and amount only; this proposal adds the mode and the time, as on the entry lists, so he can tell two cash sales apart. The next-day sentence uses the shop's own start time (retailer-defined business day, 2026-10-22 decision); 04:00 is a demo value.
- **For Saket's review:** Proposal: show mode and time on each picker row (the app shows section and amount only).
- Copy on screen (en): "Post a correction" · "Saved" · "The closed day stays exactly as it was and cannot be reopened. A correction adds what was missed, as a new entry." · "It will be recorded on the next business day, when that day starts at 04:00." · "Choose the entry that was short" · "Cash sales" · "Cash · 11:05" · "UPI sales" · "UPI · 12:40" · "Credit sales - Sunita" · "Udhar · 16:10" · "Expenses" · "Cash · 13:20"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `section.cash_sales`, `formA.mode.cash`, `section.upi_sales`, `formA.mode.upi`, `section.udhar_sales`, `formA.mode.udhar`, `section.expense`, `t3.correction`, `sync.saved`, `common.back`, `t16.frozen`, `t16.nextDay`, `t16.entries`

### Correction: enter the amount missed, Add

- Route: `T16` · changed from the app today · mockup: `screens/money.html#c-money-correct-amount`
- Purpose: The chosen entry is shown as "Adds to: Cash sales of Thu 19 Nov" and he types only what was missed.
- Primary action: Add.
- Taps / target: Digits and Add as counted above.
- Rules held: Additive only: the copy says "adds", never "changes". The original line is shown unchanged with its own figure so he can see it will not move. No suggested amount.
- Notes: The footer has the amount missed (t16.amount), Add (common.add) and the keypad, as in the app. Changing his mind: Back returns to the list, nothing is saved.
- Copy on screen (en): "Post a correction" · "Saved" · "The closed day stays exactly as it was and cannot be reopened. A correction adds what was missed, as a new entry." · "It will be recorded on the next business day, when that day starts at 04:00." · "Adds to: Cash sales of Thursday 19 November" · "Amount missed" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t3.correction`, `sync.saved`, `common.back`, `t16.frozen`, `t16.nextDay`, `section.cash_sales`, `t1.day.4`, `t1.month.11`, `t16.addsTo`, `t16.amount`, `common.add`, `keypad.clear`, `keypad.delete`

### Correction: saved and waiting for the next day

- Route: `T16` · exists today, restyled · mockup: `screens/money.html#c-money-correct-held`
- Purpose: The closed day is still the current business day, so there is nowhere honest to write it yet. The correction is held and appended when the next day starts. The screen says which of the two happened.
- Primary action: Back.
- Taps / target: Back = 1 tap.
- Rules held: "Saved" alone would let him think the closed day had changed; it did not. The held line shows the original it adds to and its own amount in a "Waiting for the next day" card.
- Notes: Outcome text is t16.held. The other outcome, "Added to today" (t16.recorded), is the next frame.
- Copy on screen (en): "Post a correction" · "Saved" · "The closed day stays exactly as it was and cannot be reopened. A correction adds what was missed, as a new entry." · "It will be recorded on the next business day, when that day starts at 04:00." · "Saved. It is waiting, and will be added when the next day starts." · "Waiting for the next day" · "Adds to: Cash sales of Thursday 19 November"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t3.correction`, `sync.saved`, `common.back`, `t16.frozen`, `t16.nextDay`, `t16.held`, `t16.waiting`, `section.cash_sales`, `t1.day.4`, `t1.month.11`, `t16.addsTo`

### Correction: added to today

- Route: `T16` · exists today, restyled · mockup: `screens/money.html#c-money-correct-recorded`
- Purpose: A day was open, so the correction was appended at once as a new, dated entry.
- Primary action: Back.
- Taps / target: Back = 1 tap.
- Rules held: Append-only: the line is new and references the original; the closed day's figures still do not move.
- Notes: Outcome text is t16.recorded. I could not tell from the code whether the next-day line is hidden once a new day is open; it is drawn hidden here (assumption).
- Copy on screen (en): "Post a correction" · "Saved" · "The closed day stays exactly as it was and cannot be reopened. A correction adds what was missed, as a new entry." · "Added to today." · "Adds to: Cash sales of Thursday 19 November"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t3.correction`, `sync.saved`, `common.back`, `t16.frozen`, `t16.recorded`, `section.cash_sales`, `t1.day.4`, `t1.month.11`, `t16.addsTo`

### Correction: nothing to correct

- Route: `T16` · exists today, restyled · mockup: `screens/money.html#c-money-correct-empty`
- Purpose: No closed day exists to correct. Say so and give a way out.
- Primary action: Back to Today.
- Taps / target: 1 tap.
- Rules held: Never "nothing here yet" alone: the sentence is specific and the next action is on the same screen.
- Notes: Copy is t16.empty. The next-action button uses the existing back label.
- Copy on screen (en): "Post a correction" · "Saved" · "The closed day stays exactly as it was and cannot be reopened. A correction adds what was missed, as a new entry." · "No closed day to correct." · "Back"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t3.correction`, `sync.saved`, `common.back`, `t16.frozen`, `t16.empty`

### Entry form: opening the day (loading)

- Route: `T8` · exists today, restyled · mockup: `screens/money.html#c-money-form-loading`
- Purpose: The form is opening from the phone's own database. Placeholder shapes, no spinner on save.
- Primary action: None; shown for well under a second.
- Taps / target: n/a
- Rules held: The header with Back is already on screen. Applies to T8, T9, T10, T16 and T19 through the shared shell.
- Notes: Copy: common.loading is the accessible name only.
- Copy on screen (en): "Collect" · "Saved"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t8.title.collect`, `sync.saved`, `common.back`, `common.loading`

### Entry form: could not open

- Route: `T8` · exists today, restyled · mockup: `screens/money.html#c-money-form-error`
- Purpose: The form failed to open. Nothing typed is lost; one next step.
- Primary action: Try again.
- Taps / target: 1 tap.
- Rules held: Calm words, icon plus words. The ledger is on the phone and untouched. Back stays visible.
- Notes: Copy is common.error and common.retry.
- Copy on screen (en): "Collect" · "2 waiting · safe on phone" · "Could not open this. Nothing you entered is lost." · "Try again"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t8.title.collect`, `sync.waiting`, `common.back`, `common.error`, `common.retry`

## Area: Day close (17 screen states)

The whole close, as one flow: the T5 list (opening cash counts as step 1, "nothing today" with a one-tap Undo, a locked cash check), the UPI check and typed adjustments cards, the T19 adjustment form, the cash count (T11) with its working, the balanced screen (T13), the difference screen (T12, reasons from a fixed list, no free text), the closing moment and the closed summary (T14). Demo day: should be ₹18,450.00 in the box. A UPI receipt never moves cash (D2); the withdrawal sits outside profit (D3); the actual UPI figure is the sum of receipts he ticks, never a bank balance.

### Day close list: just started, cash check locked

- Route: `T5` · exists today, restyled · mockup: `screens/close.html#c-close-start`
- Purpose: The day has opening cash and nothing else. He sees all the steps, which one is next, and that the cash check and the close come after.
- Primary action: Pinned button at the foot: "Enter Cash sales" (the first section nobody has answered). Each row opens its own form; "Nothing today" is a quiet link on the row.
- Taps / target: Entering is on the forms. Per empty section: 1 tap on "Nothing today". See the end-to-end count on the "ready" frame.
- Rules held: D8 three states: entered, said-to-be-empty, not yet, each a mark plus words, never colour alone. Opening cash is drawn as step 1 because the engine counts it (1 of 10). The cash check and the close are locked lines with a padlock and the reason in words. No keypad on this screen.
- Notes: At 2.0x the "Nothing today" link wraps under the row name; the list scrolls and the pinned button stays. Eleven rows do not fit one screen at 1.0x, so the lower rows and both cards sit below the fold (scroll).
- Copy on screen (en): "Day close" · "Saved" · "1 of 10 done" · "Thursday 19 November · Subhadra Kirana" · "Opening cash" · "Counts as step 1" · "2" · "Cash sales" · "not yet" · "Nothing today" · "3" · "UPI sales" · "4" · "Credit sales" · "5" · "Purchases" · "6" · "Expenses" · "7" · "Udhar collected" · "8" · "Paid to suppliers" · "9" · "Taken by owner" · "Cash check" · "Locked · Enter or skip Cash sales first" · "Close the day" · "Locked · After the cash check" · "Enter Cash sales"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t6.title`, `t5.openingStep`, `section.cash_sales`, `state.untouched`, `t5.nothingToday`, `section.upi_sales`, `section.udhar_sales`, `section.purchase`, `section.expense`, `section.udhar_collection`, `section.party_payment`, `section.withdrawal`, `t5.cashCheck`, `t5.locked`, `t5.lockLine`, `t1.closeDay`, `t5.closeLocked`, `t5.title`, `sync.saved`, `common.back`, `t5.done`, `t1.day.4`, `t1.month.11`, `t5.next`

### Day close list: part way (done, skipped with Undo, open)

- Route: `T5` · exists today, restyled · mockup: `screens/close.html#c-close-mid`
- Purpose: Part way through. Entered rows show their figure and entry count; a skipped row says so and offers one-tap Undo; the rest are open.
- Primary action: Pinned button: "Enter Expenses". Undo on a skipped row is one tap and needs no confirm.
- Taps / target: Skip a section: 1 tap. Undo a skip: 1 tap. Open a row: 1 tap.
- Rules held: Skipped counts as answered (5 of 10 here: opening, cash, UPI, purchases and the skipped Credit sales), and the count of skipped sections is said under the total so "zero because nothing happened" and "zero because not reached" are never confused. Cash check still locked, with the section it is waiting for named.
- Notes: The next open row is tinted AND numbered so it is not found by colour. Figures are derived from the entries; none is stored.
- Copy on screen (en): "Day close" · "Saved" · "5 of 10 done" · "1 marked "nothing today"" · "Thursday 19 November · Subhadra Kirana" · "Opening cash" · "Counts as step 1" · "Cash sales" · "entered · 4 entries" · "UPI sales" · "entered · 2 entries" · "Credit sales" · "nothing today" · "Undo" · "Purchases" · "entered · 1 entry" · "6" · "Expenses" · "not yet" · "Nothing today" · "7" · "Udhar collected" · "8" · "Paid to suppliers" · "9" · "Taken by owner" · "Cash check" · "Locked · Enter or skip Expenses first" · "Close the day" · "Locked · After the cash check" · "Enter Expenses"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t6.title`, `t5.openingStep`, `section.cash_sales`, `state.entered`, `t5.entries`, `section.upi_sales`, `section.udhar_sales`, `state.skipped`, `t5.undo`, `section.purchase`, `t5.entry`, `section.expense`, `state.untouched`, `t5.nothingToday`, `section.udhar_collection`, `section.party_payment`, `section.withdrawal`, `t5.cashCheck`, `t5.locked`, `t5.lockLine`, `t1.closeDay`, `t5.closeLocked`, `t5.title`, `sync.saved`, `common.back`, `t5.done`, `t5.skippedCount`, `t1.day.4`, `t1.month.11`, `t5.next`

### Day close list: all sections in, cash check unlocked

- Route: `T5` · exists today, restyled · mockup: `screens/close.html#c-close-ready`
- Purpose: Every section is entered or marked "nothing today". The cash check opens; the close stays locked until the count is saved.
- Primary action: Pinned button: "Open cash check" (also the row).
- Taps / target: END TO END, quiet day, nothing to enter on 6 empty sections: 6 x "Nothing today" + Open cash check (1) + 5 digits (for example 18450) + Save (1) + Close the day on the balanced screen (1) + Done (1) = 15 taps; add 1 tap ("All N received") if UPI receipts exist. Target under 3 min; estimate by the designer, not measured: well inside it, the count of the drawer itself being the long part.
- Rules held: Unlock is the engine rule (all eight answered), not a flag. A skip can still be undone here, which re-locks the cash check. On a closed day this screen draws no skip, no Undo and no footer, and the check row is ticked (real branch, not drawn).
- Notes: Same list as before with the cash check row now open. Skipped rows stay visible so what was answered "nothing" is never hidden.
- Copy on screen (en): "Day close" · "Saved" · "9 of 10 done" · "1 marked "nothing today"" · "Thursday 19 November · Subhadra Kirana" · "Opening cash" · "Counts as step 1" · "Cash sales" · "entered · 4 entries" · "UPI sales" · "entered · 2 entries" · "Credit sales" · "nothing today" · "Undo" · "Purchases" · "entered · 1 entry" · "Expenses" · "Udhar collected" · "Paid to suppliers" · "Taken by owner" · "10" · "Cash check" · "Count the box" · "Close the day" · "Locked · After the cash check" · "Open cash check"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t6.title`, `t5.openingStep`, `section.cash_sales`, `state.entered`, `t5.entries`, `section.upi_sales`, `section.udhar_sales`, `state.skipped`, `t5.undo`, `section.purchase`, `t5.entry`, `section.expense`, `section.udhar_collection`, `section.party_payment`, `section.withdrawal`, `t5.cashCheck`, `t5.countBox`, `t1.closeDay`, `t5.locked`, `t5.closeLocked`, `t5.title`, `sync.saved`, `common.back`, `t5.done`, `t5.skippedCount`, `t1.day.4`, `t1.month.11`, `t5.openCheck`

### Day close list: an earlier day still open (labelled with its date)

- Route: `T5` · changed from the app today · mockup: `screens/close.html#c-close-stale`
- Purpose: The open book is for yesterday. The list says which day it is closing, so he does not close the wrong one.
- Primary action: Same pinned button as a normal day: "Enter Expenses".
- Taps / target: Reached by "Close it now" on Today (1 tap). Then as any close.
- Rules held: The date is in the header-line under the total, not only in the title. No inference: the app does not move entries between days.
- Notes: The calm banner repeating t1.stale.body is a PROPOSAL; the real T5 shows only the date line. Day boundary: CLAUDE.md decision 1 (retailer-defined business day) supersedes the calendar date; the label here is the calendar date until dates.ts changes.
- **For Saket's review:** Proposal: repeat the stale-day sentence at the top of T5 so the old date is unmissable.
- Copy on screen (en): "Day close" · "Saved" · "This book is still open for 18 November. Close it to start today." · "5 of 10 done" · "1 marked "nothing today"" · "Wednesday 18 November · Subhadra Kirana" · "Opening cash" · "Counts as step 1" · "Cash sales" · "entered · 4 entries" · "UPI sales" · "entered · 2 entries" · "Credit sales" · "nothing today" · "Undo" · "Purchases" · "entered · 1 entry" · "6" · "Expenses" · "not yet" · "Nothing today" · "7" · "Udhar collected" · "8" · "Paid to suppliers" · "9" · "Taken by owner" · "Cash check" · "Locked · Enter or skip Expenses first" · "Close the day" · "Locked · After the cash check" · "Enter Expenses"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t6.title`, `t5.openingStep`, `section.cash_sales`, `state.entered`, `t5.entries`, `section.upi_sales`, `section.udhar_sales`, `state.skipped`, `t5.undo`, `section.purchase`, `t5.entry`, `section.expense`, `state.untouched`, `t5.nothingToday`, `section.udhar_collection`, `section.party_payment`, `section.withdrawal`, `t5.cashCheck`, `t5.locked`, `t5.lockLine`, `t1.closeDay`, `t5.closeLocked`, `t5.title`, `sync.saved`, `common.back`, `t1.month.11`, `t1.stale.body`, `t5.done`, `t5.skippedCount`, `t1.day.3`, `t5.next`

### Day close list: could not open

- Route: `T5` · exists today, restyled · mockup: `screens/close.html#c-close-error`
- Purpose: The list failed to open. Say plainly that nothing is lost and give one next step.
- Primary action: Try again.
- Taps / target: 1 tap.
- Rules held: Calm words; entries are on the phone. The same Shell loading and error states apply to T11, T12, T13, T14 and T19; loading is the skeleton from Today, so only this one is drawn.
- Notes: Icon plus words; the edge colour is not the only cue.
- Copy on screen (en): "Day close" · "Saved" · "Could not open this. Nothing you entered is lost." · "Try again"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t5.title`, `sync.saved`, `common.back`, `common.error`, `common.retry`

### UPI check and adjustments cards: UPI not checked

- Route: `T5` · exists today, restyled · mockup: `screens/close.html#c-close-upi`
- Purpose: The second equation, kept apart from cash. He ticks each UPI receipt he can see arrived in his UPI app. The actual UPI figure is the sum of those ticks, never a bank balance (decision 3).
- Primary action: "All 3 received" confirms exactly the receipts it names; each receipt also has its own "Received" tick.
- Taps / target: All receipts: 1 tap. One by one: 1 tap each (3 here). Optional, never blocking the close.
- Rules held: D2: nothing here changes the cash drawer. With receipts and no tick it says "UPI not checked" in words on every screen the day closes from, never a zero difference or a quiet tick. The note says "Not your bank balance". Adjustments are a fixed list (T19), never free text; "Add adjustment" opens T19.
- Notes: This is the foot of the T5 scroll (pinned button as on "ready"). The Adjustments card shows one typed entry (for the list look); with none it says "None today". The card is hidden on a closed day when empty.
- Copy on screen (en): "Day close" · "Saved" · "UPI check" · "UPI not checked" · "UPI received, as entered" · "UPI you confirmed" · "Tick each payment you can see arrived in your UPI app. Not your bank balance." · "All 3 received · ₹1,450.00" · "UPI sales" · "Received" · "Udhar collected by UPI" · "Adjustments" · "Chhutta: gave extra change" · "Add adjustment" · "Open cash check"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t5.title`, `sync.saved`, `common.back`, `upi.status.not_checked`, `upi.expected`, `upi.confirmed`, `upi.note`, `upi.all`, `section.upi_sales`, `upi.tick`, `working.udhar_collected_upi`, `upi.title`, `adjustment.rounding_given`, `adjust.title`, `adjust.add`, `t5.openCheck`

### UPI check: partly checked, no adjustments

- Route: `T5` · exists today, restyled · mockup: `screens/close.html#c-close-upi-part`
- Purpose: One of three receipts ticked. The rest stay listed until ticked; a payment typed after "All received" stays unticked.
- Primary action: "All 2 received" for what is left.
- Taps / target: 1 tap for the rest.
- Rules held: Status in words ("1 of 3 UPI payments checked"), icon plus words. "As entered" and "you confirmed" are two figures, never merged. When all are ticked the card reads "All UPI payments checked" and the buttons go.
- Notes: The mismatch between the two UPI lines is shown as two figures, not a "difference" verdict.
- Copy on screen (en): "Day close" · "Saved" · "UPI check" · "1 of 3 UPI payments checked" · "UPI received, as entered" · "UPI you confirmed" · "Tick each payment you can see arrived in your UPI app. Not your bank balance." · "All 2 received · ₹1,000.00" · "UPI sales" · "Received" · "Udhar collected by UPI" · "Adjustments" · "None today" · "Add adjustment" · "Open cash check"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t5.title`, `sync.saved`, `common.back`, `upi.status.partly_checked`, `upi.expected`, `upi.confirmed`, `upi.note`, `upi.all`, `section.upi_sales`, `upi.tick`, `working.udhar_collected_upi`, `upi.title`, `adjust.none`, `adjust.title`, `adjust.add`, `t5.openCheck`

### Adjustment: type chosen, amount typed

- Route: `T19` · changed from the app today · mockup: `screens/close.html#c-close-adjust`
- Purpose: Record a typed adjustment (fake note, chhutta, goods for home, stock written off). What happened comes from a fixed list; how much comes from the keypad. There is no text box and no "Other", so an adjustment cannot silently absorb a cash difference (decision 2).
- Primary action: Save adjustment (disabled until a type is chosen and the amount is above 0).
- Taps / target: Add adjustment (1) + type (1) + digits (3 for 500) + Save (1) = 6 taps.
- Rules held: Nothing is pre-selected or pre-filled. Each type states what it will move before saving. Home use and written-off move no cash. Append-only: a mistake is corrected by a new dated entry, not an edit.
- Notes: The effect line sits right under the chosen type (the app puts it after the whole list, below the fold at 1.0x): a layout CHANGE. Five types as in the engine; the list scrolls. Rs 0 stays refused. Closed day: the types are disabled and no keypad is drawn (real branch).
- Copy on screen (en): "Adjustment" · "Saved" · "What happened?" · "Fake note received" · "Takes it off expected cash and off profit." · "Chhutta: gave extra change" · "Chhutta: customer left the change" · "Goods taken for home (at cost)" · "Damaged or expired stock thrown away" · "Amount" · "Save adjustment" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `adjustment.counterfeit_note`, `adjust.effect.counterfeit_note`, `adjustment.rounding_given`, `adjustment.rounding_kept`, `adjustment.home_use`, `adjustment.stock_written_off`, `t19.title`, `sync.saved`, `common.back`, `t19.type`, `t19.amount`, `t19.save`, `keypad.clear`, `keypad.delete`

### Cash check: count the cash (nothing typed, Save disabled)

- Route: `T11` · changed from the app today · mockup: `screens/close.html#c-close-count`
- Purpose: A reading screen with one input. "Should be" is one quiet line; the working below shows where it came from, each line with its sign, so he can see which line to doubt. He counts the drawer, then compares.
- Primary action: Type the count on the keypad, then Save.
- Taps / target: Digits (5 for 18450) + Save = 6 taps. At 2.0x text the pad folds behind a tap on the counted figure (+1) so the working keeps the screen.
- Rules held: D2: UPI is not in the working. The expected figure is secondary to the count, so he counts first rather than typing the expected number back. No suggested count, no pre-fill. Save is greyed (dashed edge plus label), not hidden.
- Notes: The working list scrolls (7 lines; about 4 visible at 1.0x above the pad). Frame fits "Should be", counted figure, Save and keypad without the list pushing them off. Proposal vs the app: "Should be" is pinned above the scroll and not in the header bar.
- Copy on screen (en): "Count the cash" · "Saved" · "Should be" · "Cash you started with" · "Cash sales" · "+" · "Udhar collected in cash" · "Purchases paid in cash" · "-" · "Expenses paid in cash" · "Paid to suppliers in cash" · "Cash you took" · "You counted" · "Save" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t11.title`, `sync.saved`, `common.back`, `t11.expected`, `working.opening_cash`, `working.cash_sales`, `working.udhar_collected_cash`, `working.cash_purchase`, `working.cash_expenses`, `working.cash_party_payment`, `working.withdrawal_cash`, `t11.counted`, `common.save`, `keypad.clear`, `keypad.delete`

### Cash check: Save tapped with no count (QA-08)

- Route: `T11` · changed from the app today · mockup: `screens/close.html#c-close-count-refused`
- Purpose: Tapping the greyed Save gives a one-line reason instead of nothing (the device pass found no reason on tap, QA-08).
- Primary action: Type the count.
- Taps / target: Shown only after the tap on Save; it leaves when he types a digit and never carries into another form.
- Rules held: A refusal never shows before a tap. Calm words: "Type an amount first." with a title; neutral edge, not red.
- Notes: Uses refusal.title and refusal.amount, both existing. Whether the app shows this on tap today could not be confirmed from the code (T11 only disables the button); it is a proposal.
- **For Saket's review:** Proposal: greyed Save explains itself on tap (QA-08).
- Copy on screen (en): "Count the cash" · "Saved" · "Should be" · "Cash you started with" · "Cash sales" · "+" · "Udhar collected in cash" · "Purchases paid in cash" · "-" · "Expenses paid in cash" · "Paid to suppliers in cash" · "Cash you took" · "You counted" · "Save" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0" · "Not saved" · "Type an amount first."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t11.title`, `sync.saved`, `common.back`, `t11.expected`, `working.opening_cash`, `working.cash_sales`, `working.udhar_collected_cash`, `working.cash_purchase`, `working.cash_expenses`, `working.cash_party_payment`, `working.withdrawal_cash`, `t11.counted`, `common.save`, `keypad.clear`, `keypad.delete`, `refusal.title`, `refusal.amount`

### Cash check: count typed, Save ready

- Route: `T11` · exists today, restyled · mockup: `screens/close.html#c-close-count-typed`
- Purpose: The count is typed. Save checks it against the working and routes to the balanced screen or the difference screen.
- Primary action: Save.
- Taps / target: Save = 1 tap. Routing depends on the answer, so seeing T12 is not announced beforehand.
- Rules held: The figure is exactly what he typed (integer paise). Clear and delete keys sit on the pad.
- Notes: The same count of 18450 drives T13. A count that differs goes to T12 (frames below use 18150 short and 18700 over).
- Copy on screen (en): "Count the cash" · "Saved" · "Should be" · "Cash you started with" · "Cash sales" · "+" · "Udhar collected in cash" · "Purchases paid in cash" · "-" · "Expenses paid in cash" · "Paid to suppliers in cash" · "Cash you took" · "You counted" · "Save" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t11.title`, `sync.saved`, `common.back`, `t11.expected`, `working.opening_cash`, `working.cash_sales`, `working.udhar_collected_cash`, `working.cash_purchase`, `working.cash_expenses`, `working.cash_party_payment`, `working.withdrawal_cash`, `t11.counted`, `common.save`, `keypad.clear`, `keypad.delete`

### Cash check: it matches

- Route: `T13` · exists today, restyled · mockup: `screens/close.html#c-close-balanced`
- Purpose: The one good moment in the day. The same figure twice, so the match is seen rather than asserted; tomorrow opens on the counted cash.
- Primary action: Close the day.
- Taps / target: Close the day = 1 tap, then T14 appears (Done = 1).
- Rules held: The match is recomputed from the engine on every render; if it did not hold the screen would not say so and the button would be off. D6: the carry-forward is the counted figure. The UPI card is stated (not mixed into the celebration) so a cash match is not read as a UPI match. No upsell, rating or nag.
- Notes: Header carries no figure on purpose. Motion is absent in the app (a recorded gap); not drawn here.
- Copy on screen (en): "Cash check" · "Saved" · "It matches." · "You counted" · "· Should be" · "Every rupee in the box is in the book." · "This becomes tomorrow's opening cash." · "UPI check" · "All UPI payments checked" · "UPI received, as entered" · "UPI you confirmed" · "Close the day"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t13.matches`, `t11.counted`, `t11.expected`, `t13.everyRupee`, `t13.carry`, `t13.title`, `sync.saved`, `common.back`, `upi.status.checked`, `upi.expected`, `upi.confirmed`, `upi.title`, `t1.closeDay`

### Cash check: difference, short in the box

- Route: `T12` · changed from the app today · mockup: `screens/close.html#c-close-diff-short`
- Purpose: Counted is less than should be. The difference is shown with its sign and in words, then two things to check, then a way to count again or record the gap as the day's loss.
- Primary action: Count again (secondary) or "Still short - record as today's loss" (chooses the reason); then Close the day.
- Taps / target: Difference case, short: 6 x Nothing today + Open cash check (1) + 5 digits + Save (1) = 13 to reach this screen; then "Still short - record as today's loss" (1) + Close the day (1) + Done (1) = 16 taps. With one recount: Count again (1) + 5 digits + Save (1) = 23 taps in all. Estimate only, not measured.
- Rules held: No free text anywhere: the only answer for a short drawer is the fixed "Loss for the day", so a reason cannot absorb a difference silently. The copy is a question, never a verdict. The app does not check the payment app itself (no inference). Close the day stays greyed until the reason is chosen, with a hint saying why.
- Notes: Short list per the code (HT-23): check, recount, mark loss. The four older short reasons (change from pocket, forgot to write something) are no longer offered but still read on old days. Sign and words both carry the meaning: "-₹300.00" and "Cash short (loss)".
- Copy on screen (en): "The difference" · "Saved" · "Difference" · "-" · "Cash short (loss)" · "Should be" · "You counted" · "Before you record this, check two things:" · "1. Open your UPI or payment app. Is every payment there written here too - as UPI, not as cash?" · "2. Count the cash in the drawer again." · "Count again" · "Still short - record as today's loss" · "UPI check" · "UPI not checked" · "UPI received, as entered" · "UPI you confirmed" · "Choose an answer above to close the day." · "Close the day"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t12.difference`, `working.cash_short`, `t11.expected`, `t11.counted`, `t12.check.prompt`, `t12.check.payments`, `t12.check.count`, `t12.recount`, `t12.markLoss`, `t12.title`, `sync.saved`, `common.back`, `upi.status.not_checked`, `upi.expected`, `upi.confirmed`, `upi.title`, `t1.closeDay`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Choose an answer above to close the day."

### Cash check: difference, extra in the box (reason chosen)

- Route: `T12` · changed from the app today · mockup: `screens/close.html#c-close-diff-over`
- Purpose: Counted is more than should be. He picks what he thinks happened from three fixed answers, including "Don't know".
- Primary action: Choose one reason (radio rows), then Close the day.
- Taps / target: Reason (1) + Close the day (1) + Done (1) after Save: 16 taps in the same quiet-day scenario as the short case. Estimate only.
- Rules held: Fixed list: "Forgot to write a sale", "Counted wrong", "Don't know"; "Don't know" is a real value the engine can count, so he is never forced to claim a cause. The list depends on the sign: extra cash and missing cash have different causes. Chosen is marked by a tick icon, tint and border, never colour alone.
- Notes: Frame shows "Forgot to write a sale" chosen and Close the day active; with none chosen it is greyed as on the short frame. A chosen reason is stored as a string key, so it reads in whichever language the book is opened in.
- Copy on screen (en): "The difference" · "Saved" · "Difference" · "+" · "Cash extra (income)" · "Should be" · "You counted" · "What do you think happened?" · "Forgot to write a sale" · "Counted wrong" · "Don't know" · "UPI check" · "UPI not checked" · "UPI received, as entered" · "UPI you confirmed" · "Close the day"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t12.difference`, `working.cash_excess`, `t11.expected`, `t11.counted`, `t12.reasonPrompt`, `t12.reason.sale`, `t12.reason.miscount`, `t12.reason.unknown`, `t12.title`, `sync.saved`, `common.back`, `upi.status.not_checked`, `upi.expected`, `upi.confirmed`, `upi.title`, `t1.closeDay`

### Closing the day: in progress

- Route: `T13` · **NEW screen (not in the app today)** · mockup: `screens/close.html#c-close-closing`
- Purpose: The close is being written. The button changes to a disabled "Closing the day" with a clock so a second tap cannot double-close.
- Primary action: None; waits for T14.
- Taps / target: n/a
- Rules held: The close is local and append-only; nothing is lost if it takes a moment. It never needs the network (D7 is enforced by the database trigger on both engines).
- Notes: The app has no such state today: store.close runs synchronously and goes straight to T14. This frame is for the build to decide whether it is needed at all.
- **For Saket's review:** Not in the app today (close is instant); say if you want a busy state or none.
- Copy on screen (en): "Cash check" · "Saved" · "It matches." · "You counted" · "· Should be" · "Every rupee in the box is in the book." · "This becomes tomorrow's opening cash." · "UPI check" · "All UPI payments checked" · "UPI received, as entered" · "UPI you confirmed" · "Closing the day"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t13.matches`, `t11.counted`, `t11.expected`, `t13.everyRupee`, `t13.carry`, `t13.title`, `sync.saved`, `common.back`, `upi.status.checked`, `upi.expected`, `upi.confirmed`, `upi.title`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Closing the day"

### Day closed: summary (with a cash difference)

- Route: `T14` · changed from the app today · mockup: `screens/close.html#c-close-done`
- Purpose: The day is closed and frozen. Profit first, what made it, the withdrawal outside it, and the cash check that closed the day, so the summary explains its own close.
- Primary action: Done (back to Today).
- Taps / target: Done = 1 tap. Back is also visible.
- Rules held: D3: the owner's withdrawal sits in its own card with the sentence "not counted against profit", because a figure under a profit total reads as part of it. D7: nothing here can change a figure; a correction is a new dated entry on a later screen. Out-flows carry a printed minus sign. The "profit after cash difference" sits beside the estimated profit, never replaces it. UPI is stated as it closed, "not checked" or partly included.
- Notes: Difference row carries its reason in words (Loss for the day). Rows are derived from the entries. Net sales "Cash sales" mislabel from earlier builds is fixed (F-9).
- Copy on screen (en): "Day closed" · "Saved" · "Estimated profit" · "Net sales" · "+" · "Purchase · all modes" · "-" · "Expenses · all modes" · "Udhar to collect" · "Personal withdrawal" · "Money you took is shown separately and is not counted against profit." · "Cash check" · "Expected" · "Counted" · "Difference · Loss for the day" · "Profit after cash difference" · "UPI check" · "1 of 3 UPI payments checked" · "UPI received, as entered" · "UPI you confirmed" · "Done"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `sync.saved`, `t14.profit`, `t14.netSales`, `t14.purchases`, `t14.expenses`, `p1.toCollect`, `t14.withdrawal`, `t14.withdrawalNote`, `t14.cashCheck`, `t14.expected`, `t14.counted`, `t12.difference`, `t12.reason.loss`, `t14.profitAfterCash`, `t14.title`, `common.back`, `upi.status.partly_checked`, `upi.expected`, `upi.confirmed`, `upi.title`, `t14.done`

### Day closed offline (closes on the phone, chip amber)

- Route: `T14` · changed from the app today · mockup: `screens/close.html#c-close-done-offline`
- Purpose: There is no network and the day closed anyway. He must know it is safe on the phone and not yet on the server.
- Primary action: Done.
- Taps / target: Same as online: no extra step because of the network.
- Rules held: The close and the freeze happen locally; the server catches up when signal returns (the queue drains by itself). The chip is amber with a clock and words "waiting - safe on phone", never red; the banner repeats it plainly.
- Notes: Same summary as the online frame. Rows the server later refuses would be parked and listed on Today (see the Today area), not here.
- Copy on screen (en): "Day closed" · "3 waiting · safe on phone" · "3 waiting to send. Safe on this phone; it goes when the network is back." · "Estimated profit" · "Net sales" · "+" · "Purchase · all modes" · "-" · "Expenses · all modes" · "Udhar to collect" · "Personal withdrawal" · "Money you took is shown separately and is not counted against profit." · "Cash check" · "Expected" · "Counted" · "Difference · Loss for the day" · "Profit after cash difference" · "UPI check" · "1 of 3 UPI payments checked" · "UPI received, as entered" · "UPI you confirmed" · "Done"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `sync.waiting`, `t14.profit`, `t14.netSales`, `t14.purchases`, `t14.expenses`, `p1.toCollect`, `t14.withdrawal`, `t14.withdrawalNote`, `t14.cashCheck`, `t14.expected`, `t14.counted`, `t12.difference`, `t12.reason.loss`, `t14.profitAfterCash`, `t14.title`, `common.back`, `sync.waitingLong`, `upi.status.partly_checked`, `upi.expected`, `upi.confirmed`, `upi.title`, `t14.done`

## Area: Ledger / Parties (23 screen states)

Mitra Ledger tab. One hero ("Udhar to collect") with "You owe suppliers" under it, customers sorted by what they owe with the 31+ days and changed-today tags as icon plus words, a Customers or Suppliers segment, customer detail with one primary button (Collect), credit limit, and supplier detail. Owes-lookup is 2 taps from Today by either route. Hindi and Odia copy is a DRAFT (H13).

### Ledger: customers, most owed first

- Route: `P1` · changed from the app today · mockup: `screens/ledger.html#c-ledger-list`
- Purpose: Answer "who owes me, how much" from the list itself. The two shop totals stay separate (never netted).
- Primary action: Tap a person (opens P2). Secondary: + New customer.
- Taps / target: Owes-lookup from Today: Ledger tab (1) + person (2) = 2 taps; or the "Udhar to collect" figure on Today (1) + person (2) = 2 taps. Target under 10 s. Counted from frames, no real user timed.
- Rules held: Row figure = balance over every day on the phone, derived on read. Tags are icon + words (clock/calendar, up arrow, info), never colour only. Advance person: state word "Advance", never a silent minus (QA-03).
- Notes: As built, Customers and Suppliers are two stacked cards; here they are a two-way segment so the first screen holds the hero, the add button and about five people. Sorted by balance, largest first; Lakshmi (settled) and Pradeep (advance) fall to the bottom. 31+ days tag: the app today shows none because the credit date is not held in this store (P1.tsx comment); the tag is drawn as the target, only shown when that date exists. Hero total is the sum of the positive balances here (assumed; the engine P7 decides how an advance nets).
- **For Saket's review:** The 31+ days tag needs the credit date in the store (built code says it has none); and Customers/Suppliers as a segment replaces two stacked cards.
- Copy on screen (en): "Ledger" · "Saved" · "Udhar to collect" · "You owe suppliers" · "Customers" · "Suppliers" · "+ New customer" · "R" · "Ramesh" · "changed today" · "+" · "owes" · "S" · "Sunita" · "31+ days" · "B" · "Bijay" · "L" · "Lakshmi" · "nothing owed" · "P" · "Pradeep" · "Advance" · "Today" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p1.title`, `sync.saved`, `p1.toCollect`, `p1.youOwe`, `p1.customers`, `p1.suppliers`, `party.newCustomer`, `p1.changedToday`, `picker.owes`, `p1.overdue`, `picker.settled`, `advance.label`, `nav.today`, `nav.parties`, `nav.reports`

### Ledger: suppliers segment

- Route: `P1` · changed from the app today · mockup: `screens/ledger.html#c-ledger-suppliers`
- Purpose: The other question: who the shop owes. Same row shape, wording "you owe".
- Primary action: Tap a supplier (opens P3).
- Taps / target: 2 taps from Today (Ledger tab, Suppliers, supplier = 3 with the segment).
- Rules held: Kept separate from customers; never merged into one net figure (P1.tsx).
- Notes: Supplier names are shown as typed. Supplier add (party.addSupplier) is reached from the Pay supplier picker, as built; no add button here.
- Copy on screen (en): "Ledger" · "Saved" · "Udhar to collect" · "You owe suppliers" · "Customers" · "Suppliers" · "M" · "Mohanty Traders" · "you owe" · "O" · "Odisha Wholesale" · "Today" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p1.title`, `sync.saved`, `p1.toCollect`, `p1.youOwe`, `p1.customers`, `p1.suppliers`, `picker.youOwe`, `nav.today`, `nav.parties`, `nav.reports`

### Ledger: a person who paid more than they owed

- Route: `P1` · changed from the app today · mockup: `screens/ledger.html#c-ledger-advance`
- Purpose: QA-03. A negative balance is an advance: the shop holds their money. It is said in words, not shown as a bare minus.
- Primary action: Tap the person to see the entries behind it.
- Taps / target: 2 taps from Today.
- Rules held: QA-03 and D2. The row shows the word "Advance" with the amount; the banner explains in a sentence. No inference: the app does not suggest what to do with it.
- Notes: As built, the row shows word + positive figure (P1.tsx). The explanation banner is added here; the Advance word already exists (advance.label). Advance is not counted inside "Udhar to collect" here (assumed).
- Copy on screen (en): "Ledger" · "Saved" · "Udhar to collect" · "You owe suppliers" · "Customers" · "Suppliers" · "This person paid more than was owed. The extra is an advance you hold for them. It is not udhar to collect." · "R" · "Ramesh" · "changed today" · "+" · "owes" · "S" · "Sunita" · "31+ days" · "B" · "Bijay" · "L" · "Lakshmi" · "nothing owed" · "P" · "Pradeep" · "Advance" · "Today" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p1.title`, `sync.saved`, `p1.toCollect`, `p1.youOwe`, `p1.customers`, `p1.suppliers`, `p1.changedToday`, `picker.owes`, `p1.overdue`, `picker.settled`, `advance.label`, `nav.today`, `nav.parties`, `nav.reports`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "This person paid more than was owed. The extra is an advance you hold for them. It is not udhar to collect."

### Ledger: first time, nobody added yet

- Route: `P1` · changed from the app today · mockup: `screens/ledger.html#c-ledger-empty`
- Purpose: A new book has no customers. The next action is to add the first one.
- Primary action: + New customer.
- Taps / target: 1 tap to the add form.
- Rules held: Never "nothing here yet" alone: the sentence is followed by the button. Totals show ₹0.00, derived.
- Notes: As built, p1.empty is text only (no button); the button is added.
- Copy on screen (en): "Ledger" · "Saved" · "Udhar to collect" · "You owe suppliers" · "No customers or suppliers yet." · "+ New customer" · "Today" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p1.title`, `sync.saved`, `p1.toCollect`, `p1.youOwe`, `p1.empty`, `party.newCustomer`, `nav.today`, `nav.parties`, `nav.reports`

### Ledger: loading

- Route: `P1` · exists today, restyled · mockup: `screens/ledger.html#c-ledger-loading`
- Purpose: The list is being read from the phone. Placeholder shapes, no spinner.
- Primary action: None; waits.
- Taps / target: n/a
- Rules held: Skeleton matches hero and rows so nothing jumps.
- Notes: common.loading is the accessible name only.
- Copy on screen (en): "Ledger" · "Saved" · "Today" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p1.title`, `sync.saved`, `common.loading`, `nav.today`, `nav.parties`, `nav.reports`

### Ledger: could not open

- Route: `P1` · exists today, restyled · mockup: `screens/ledger.html#c-ledger-error`
- Purpose: The list failed to open. Say nothing is lost; one next step.
- Primary action: Try again.
- Taps / target: 1 tap.
- Rules held: Calm words, icon + words, not colour only.
- Notes: Same pattern as Today error.
- Copy on screen (en): "Ledger" · "Saved" · "Could not open this. Nothing you entered is lost." · "Try again" · "Today" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p1.title`, `sync.saved`, `common.error`, `common.retry`, `nav.today`, `nav.parties`, `nav.reports`

### Ledger: offline, entries waiting

- Route: `P1` · changed from the app today · mockup: `screens/ledger.html#c-ledger-offline`
- Purpose: No network. The list is the phone's own book; entries are safe and wait to send.
- Primary action: Keep working; open a person.
- Taps / target: 2 taps, same as online.
- Rules held: Sync chip amber with a clock and a count, never red; it is in the header (USABILITY item 8).
- Notes: The figures are the phone's own and may lack other devices' entries until the queue drains.
- Copy on screen (en): "Ledger" · "3 waiting · safe on phone" · "3 waiting to send. Safe on this phone; it goes when the network is back." · "Udhar to collect" · "You owe suppliers" · "Customers" · "Suppliers" · "R" · "Ramesh" · "changed today" · "+" · "owes" · "S" · "Sunita" · "31+ days" · "B" · "Bijay" · "L" · "Lakshmi" · "nothing owed" · "P" · "Pradeep" · "Advance" · "Today" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `sync.waiting`, `p1.title`, `sync.waitingLong`, `p1.toCollect`, `p1.youOwe`, `p1.customers`, `p1.suppliers`, `p1.changedToday`, `picker.owes`, `p1.overdue`, `picker.settled`, `advance.label`, `nav.today`, `nav.parties`, `nav.reports`

### Add customer: name and phone

- Route: `P1` · changed from the app today · mockup: `screens/ledger.html#c-ledger-add`
- Purpose: Add a person to the book. Name is required; phone is optional (needed later for the WhatsApp reminder).
- Primary action: Save.
- Taps / target: Name letters, Save = 2 taps plus typing (a phone number adds one tap per figure and a field change).
- Rules held: The app never suggests a name or reads contacts: typed exactly as entered. No refusal is shown before a tap.
- Notes: As built the add form lives inside the party picker (party.save reads "Save and choose"). Here it is also reached from Ledger via "+ New customer", saving back to the list; the Save label is common.save for that reason (party.save would say "choose" with nothing to choose). The keyboard is the phone's own and is not drawn.
- **For Saket's review:** Add-customer from the Ledger tab is new; today it is reachable only from a picker inside a sale or collection.
- Copy on screen (en): "New customer" · "Saved" · "Name" · "Kamala" · "Mobile number (optional)" · "98XXXXXXXX" · "Save" · "Back to the list"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `party.newCustomer`, `sync.saved`, `common.back`, `party.name`, `party.phone`, `common.save`, `party.backToList`

### Add customer: refused (no name / bad number)

- Route: `P1` · exists today, restyled · mockup: `screens/ledger.html#c-ledger-add-refusal`
- Purpose: Two refusals, shown only after Save is tapped: no name; a number that is not a valid Indian mobile number.
- Primary action: Fix the field and Save again. Phone may be left empty.
- Taps / target: Shown after 1 tap on Save.
- Rules held: party.refusal.name and party.refusal.phone. Text under the field plus an alert banner, icon + words. The refusal clears when the form is reopened; it never leaks into the next form.
- Notes: Frame shows the bad-number case; the empty-name case has the same layout with party.refusal.name under Name.
- Copy on screen (en): "New customer" · "Saved" · "Not saved" · "A mobile number is 10 digits, starting 6, 7, 8 or 9. Or leave it empty." · "Name" · "Kamala" · "Mobile number (optional)" · "98765" · "Save" · "Back to the list"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `party.newCustomer`, `sync.saved`, `common.back`, `refusal.title`, `party.refusal.phone`, `party.name`, `party.phone`, `common.save`, `party.backToList`

### Add customer: saved, back on the list

- Route: `P1` · changed from the app today · mockup: `screens/ledger.html#c-ledger-add-saved`
- Purpose: Confirms the add and shows the new person on the list at Rs 0.00.
- Primary action: Tap the new person to start a udhar sale or add a number.
- Taps / target: 1 tap to open them.
- Rules held: Append-only book: a person is added, never edited away. Zero balance reads "nothing owed" in words.
- Notes: Toast uses entry.saved. Kamala sorts with the settled people.
- Copy on screen (en): "Ledger" · "Saved" · "Udhar to collect" · "You owe suppliers" · "Customers" · "Suppliers" · "+ New customer" · "R" · "Ramesh" · "changed today" · "+" · "owes" · "S" · "Sunita" · "B" · "Bijay" · "K" · "Kamala" · "nothing owed" · "Today" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p1.changedToday`, `picker.owes`, `picker.settled`, `p1.title`, `sync.saved`, `p1.toCollect`, `p1.youOwe`, `p1.customers`, `p1.suppliers`, `party.newCustomer`, `entry.saved`, `nav.today`, `nav.parties`, `nav.reports`

### Customer: balance, one Collect button, history

- Route: `P2` · changed from the app today · mockup: `screens/ledger.html#c-ledger-p2`
- Purpose: One person. How much they owe now (all days), the one action Collect, and the entries behind the figure.
- Primary action: Collect (solid teal, fixed at the foot). Quiet second: New udhar sale.
- Taps / target: Collect: Collect (1), digits, Add. Owes-lookup is answered by the hero on arrival (2 taps from Today).
- Rules held: Hero = balance over all days on the phone, derived. The history rows show the mode and the time; a sale on udhar adds to what is owed, a collection reduces it, signs printed. Append-only: no edit or delete on any row. D2: only the Cash collection touches the drawer; the udhar sales do not.
- Notes: History here is complete, so the hero equals the sum: +₹3,500.00 +₹600.00 -₹500.00 +₹1,200.00 = ₹4,800.00. As built the lines show a label and a signed amount; the time and mode in the second line are added. Remind, statement and credit limit sit under "Remind and share". Rows are buttons because they lead to the correction route (see the correction frame); as built the lines are not tappable.
- **For Saket's review:** Mode and time on each history row, and tappable rows leading to a correction, are additions to the built P2.
- Copy on screen (en): "Customer" · "Saved" · "R" · "Ramesh" · "Owed to you, all days on this phone" · "changed today" · "+" · "Remind and share" · "Remind on WhatsApp" · "Opens your WhatsApp with a polite message. You press send." · "Share statement" · "Credit limit" · "Not set" · "Ledger" · "Credit sales" · "11:20 · Udhar" · "Udhar collected" · "16:05, 14 October · Cash" · "-" · "10:40, 8 October · Udhar" · "18:15, 3 October · Udhar" · "Collect" · "New udhar sale"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p2.title`, `sync.saved`, `common.back`, `p2.balanceAll`, `p1.changedToday`, `p2.share`, `p2.remind`, `p2.remindNote`, `p2.statement`, `p2.limit`, `p2.noLimit`, `p2.ledger`, `section.udhar_sales`, `formA.mode.udhar`, `section.udhar_collection`, `t1.month.10`, `formA.mode.cash`, `act.collect`, `p2.newUdhar`

### Customer: no phone saved, add one

- Route: `P2` · changed from the app today · mockup: `screens/ledger.html#c-ledger-p2-phone`
- Purpose: Reminders need a number. With none saved the way to add it is right here.
- Primary action: Save number (beside the field; Done on the keyboard saves too).
- Taps / target: Typing the number + Save number = 1 tap plus one per figure.
- Rules held: The number is exactly as typed: no contact lookup, no suggestion. Saving moves no figure.
- Notes: As built, the number can be added only while none is saved; once saved, the page shows no way to change it. Frame ledger-p2-remind shows a saved number with a "Change mobile number" row, which is a proposal.
- **For Saket's review:** Editing a saved number is not possible in the built app; proposed here.
- Copy on screen (en): "Customer" · "Saved" · "S" · "Sunita" · "Owed to you, all days on this phone" · "Remind and share" · "Remind on WhatsApp" · "No phone number saved for this customer." · "Share statement" · "Credit limit" · "Not set" · "Add a mobile number for reminders" · "98XXXXXXXX" · "Save number" · "Collect" · "New udhar sale"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p2.title`, `sync.saved`, `common.back`, `p2.balanceAll`, `p2.share`, `p2.remind`, `p2.noPhone`, `p2.statement`, `p2.limit`, `p2.noLimit`, `p2.addPhone`, `p2.savePhone`, `act.collect`, `p2.newUdhar`

### Customer: tapped WhatsApp with no number

- Route: `P2` · exists today, restyled · mockup: `screens/ledger.html#c-ledger-p2-nophone-refusal`
- Purpose: Reminder tapped but no number is saved. Say why and point to the fix on the same page.
- Primary action: Add the number in the field above.
- Taps / target: Shown after 1 tap on the reminder row.
- Rules held: refusal.noPhone under the heading "Could not do that" (nothing was being saved). Nothing is sent; WhatsApp is not opened.
- Notes: Refusal appears only after the tap, not before.
- Copy on screen (en): "Customer" · "Saved" · "S" · "Sunita" · "Owed to you, all days on this phone" · "Remind and share" · "Remind on WhatsApp" · "No phone number saved for this customer." · "Share statement" · "Credit limit" · "Not set" · "Add a mobile number for reminders" · "98XXXXXXXX" · "Save number" · "Collect" · "New udhar sale" · "Could not do that" · "This customer has no phone number saved, so WhatsApp cannot be opened for them. Add the number on this page."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p2.title`, `sync.saved`, `common.back`, `p2.balanceAll`, `p2.share`, `p2.remind`, `p2.noPhone`, `p2.statement`, `p2.limit`, `p2.noLimit`, `p2.addPhone`, `p2.savePhone`, `act.collect`, `p2.newUdhar`, `refusal.titleNotDone`, `refusal.noPhone`

### Customer: WhatsApp reminder handed over

- Route: `P2` · exists today, restyled · mockup: `screens/ledger.html#c-ledger-p2-remind`
- Purpose: The app writes a polite message and hands it to WhatsApp. The shopkeeper presses send there. The app sends nothing.
- Primary action: In WhatsApp: Send (outside the app).
- Taps / target: Remind row (1 tap), then Send in WhatsApp (1 tap).
- Rules held: Nothing is sent by the app; the text states the amount due as derived from the book. The message is fixed copy (remind.text), not written by inference.
- Notes: The panel is a drawing of what WhatsApp shows after the hand-off, not an in-app screen. A saved number is shown with a change row (proposal).
- Copy on screen (en): "Customer" · "Saved" · "R" · "Ramesh" · "Owed to you, all days on this phone" · "9437012345" · "Change mobile number" · "Remind and share" · "Remind on WhatsApp" · "Opens your WhatsApp with a polite message. You press send." · "Share statement" · "Credit limit" · "Not set" · "Collect" · "New udhar sale" · "WhatsApp opens here, outside the app" · "Namaste Ramesh. This is Subhadra Kirana. Your account with us shows ₹4,800.00 due. Please pay when you can. Thank you."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `remind.text`, `p2.remindNote`, `p2.title`, `sync.saved`, `common.back`, `p2.balanceAll`, `p2.share`, `p2.remind`, `p2.statement`, `p2.limit`, `p2.noLimit`, `act.collect`, `p2.newUdhar`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "WhatsApp opens here, outside the app" · "Change mobile number"

### Customer: nothing owed, reminder refused

- Route: `P2` · changed from the app today · mockup: `screens/ledger.html#c-ledger-p2-settled`
- Purpose: A settled customer. Tapping the reminder says why there is nothing to send.
- Primary action: New udhar sale or Collect stays available.
- Taps / target: Refusal shown after 1 tap.
- Rules held: refusal.nothingDue. No reminder is made for nothing; no figure invented.
- Notes: As built the reminder row is hidden when nothing is owed, so this refusal is not reachable from the screen today. Here the row stays visible and explains itself (a hidden row gives no reason).
- **For Saket's review:** Keeping the reminder row visible when nothing is due, to show refusal.nothingDue, differs from the built P2.
- Copy on screen (en): "Customer" · "Saved" · "L" · "Lakshmi" · "Owed to you, all days on this phone" · "Remind and share" · "Remind on WhatsApp" · "Opens your WhatsApp with a polite message. You press send." · "Share statement" · "Credit limit" · "Ledger" · "Udhar collected" · "12:05 · Cash" · "-" · "Credit sales" · "09:30, 14 October · Udhar" · "+" · "Collect" · "New udhar sale" · "Could not do that" · "Nothing is due from this customer, so there is nothing to remind."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p2.title`, `sync.saved`, `common.back`, `p2.balanceAll`, `p2.share`, `p2.remind`, `p2.remindNote`, `p2.statement`, `p2.limit`, `p2.ledger`, `section.udhar_collection`, `formA.mode.cash`, `section.udhar_sales`, `t1.month.10`, `formA.mode.udhar`, `act.collect`, `p2.newUdhar`, `refusal.titleNotDone`, `refusal.nothingDue`

### Customer: advance held (paid more than owed)

- Route: `P2` · changed from the app today · mockup: `screens/ledger.html#c-ledger-p2-advance`
- Purpose: QA-03. The hero says "Advance" and the amount held, in place of a negative balance.
- Primary action: Collect and New udhar sale stay; a sale on udhar is set against the advance.
- Taps / target: 2 taps from Today to see this.
- Rules held: No silent minus: the label is advance.label with the amount as a positive figure and a sentence. The confirm that creates an advance ("This is ... more than they owe") belongs to the Collect form.
- Notes: Reminder row hidden (nothing is due). Explanatory sentence is new text.
- Copy on screen (en): "Customer" · "Saved" · "P" · "Pradeep" · "Advance" · "You hold this for them. They paid more than they owed. Nothing is due from them." · "Remind and share" · "Share statement" · "Credit limit" · "Not set" · "Collect" · "New udhar sale"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p2.title`, `sync.saved`, `common.back`, `advance.label`, `p2.share`, `p2.statement`, `p2.limit`, `p2.noLimit`, `act.collect`, `p2.newUdhar`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "You hold this for them. They paid more than they owed. Nothing is due from them."

### Customer: no entries yet

- Route: `P2` · changed from the app today · mockup: `screens/ledger.html#c-ledger-p2-empty`
- Purpose: A person just added. History is empty; the next action is the first udhar sale.
- Primary action: New udhar sale (promoted to primary while history is empty).
- Taps / target: 1 tap.
- Rules held: Balance ₹0.00, derived. No "usual" amount suggested.
- Notes: As built, p2.empty is text and Collect stays primary. Collect has nothing to collect, so the primary here is the sale (proposal).
- **For Saket's review:** Primary button switches to New udhar sale when the history is empty.
- Copy on screen (en): "Customer" · "Saved" · "K" · "Kamala" · "Owed to you, all days on this phone" · "Nothing recorded for this customer yet." · "Remind and share" · "Remind on WhatsApp" · "No phone number saved for this customer." · "Share statement" · "Credit limit" · "Not set" · "Add a mobile number for reminders" · "98XXXXXXXX" · "Save number" · "New udhar sale" · "Collect"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p2.title`, `sync.saved`, `common.back`, `p2.balanceAll`, `p2.empty`, `p2.share`, `p2.remind`, `p2.noPhone`, `p2.statement`, `p2.limit`, `p2.noLimit`, `p2.addPhone`, `p2.savePhone`, `p2.newUdhar`, `act.collect`

### Customer: correcting an entry (new dated entry)

- Route: `P2` · **NEW screen (not in the app today)** · mockup: `screens/ledger.html#c-ledger-p2-correct`
- Purpose: Tap a history row to see it and, if it was wrong, post a correction. The original stays; a new dated entry refers to it.
- Primary action: Post a correction.
- Taps / target: Row (1), Post a correction (2), then the amount form.
- Rules held: D1 append-only: no Edit, no Delete. The sheet states that the original stays on the list. D7: if the entry's day is closed, the correction is still a new entry dated today.
- Notes: Not in the built P2: lines there are not tappable and the correction route (T16, "Post a correction") starts from Today. This frame shows the proposed route from the person. The amount form itself is in another area.
- **For Saket's review:** A correction route starting from a party's history row does not exist today.
- Copy on screen (en): "Customer" · "Saved" · "R" · "Ramesh" · "Owed to you, all days on this phone" · "Ledger" · "Credit sales" · "11:20 · Udhar" · "+" · "Udhar collected" · "16:05, 14 October · Cash" · "-" · "10:40, 8 October · Udhar" · "18:15, 3 October · Udhar" · "Collect" · "New udhar sale" · "This entry" · "The original stays in the book. A correction is added as a new entry with today's date that points to it." · "Post a correction" · "Cancel"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `section.udhar_collection`, `t1.month.10`, `formA.mode.cash`, `t3.correction`, `party.cancel`, `p2.title`, `sync.saved`, `common.back`, `p2.balanceAll`, `p2.ledger`, `section.udhar_sales`, `formA.mode.udhar`, `act.collect`, `p2.newUdhar`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "The original stays in the book. A correction is added as a new entry with today's date that points to it." · "This entry"

### Customer: could not open

- Route: `P2` · exists today, restyled · mockup: `screens/ledger.html#c-ledger-p2-error`
- Purpose: The detail failed to open. Nothing is lost.
- Primary action: Try again.
- Taps / target: 1 tap.
- Rules held: Calm words, icon + words.
- Notes: Loading uses the same skeleton as the Ledger list loading frame.
- Copy on screen (en): "Customer" · "Saved" · "Could not open this. Nothing you entered is lost." · "Try again"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p2.title`, `sync.saved`, `common.back`, `common.error`, `common.retry`

### Credit limit: set a limit

- Route: `P6` · exists today, restyled · mockup: `screens/ledger.html#c-ledger-p6`
- Purpose: Set the most udhar a customer may carry. The app tells him when a sale would go above it; it never stops a sale.
- Primary action: Save limit (disabled until an amount above zero).
- Taps / target: Digits, Save limit = 1 tap plus digits.
- Rules held: The limit is typed by the shopkeeper; no suggested amount. It warns, never blocks (p6.prompt). Rs 0 is refused after a tap.
- Notes: Current limit "Not set". The remove button appears only when a limit exists (next frame).
- Copy on screen (en): "Credit limit" · "Saved" · "R" · "Ramesh" · "The most udhar you want Ramesh to carry. When a sale would go above it the app tells you. It never stops a sale." · "Limit now" · "Not set" · "New limit" · "Save limit" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p6.title`, `sync.saved`, `common.back`, `p6.prompt`, `p6.current`, `p2.noLimit`, `p6.amount`, `p6.save`, `keypad.clear`, `keypad.delete`

### Credit limit: limit set, clear it, or refused at zero

- Route: `P6` · changed from the app today · mockup: `screens/ledger.html#c-ledger-p6-clear`
- Purpose: A limit exists. Removing it is one tap, says what happens, and typing 0 then Save is refused.
- Primary action: Save limit for a new figure; Remove the limit is a quiet equal-weight button.
- Taps / target: Remove: 1 tap (takes effect at once).
- Rules held: refusal.creditLimit after tapping Save with zero. Remove says what happens: entries and sales are untouched, only the warning goes. Never confirm-shaming.
- Notes: The refusal is drawn here with 0 typed; in the app it appears only after the tap. The built remove is a ghost button; here it is outlined for equal weight (proposal).
- Copy on screen (en): "Credit limit" · "Saved" · "Not saved" · "The limit was not saved. Type an amount above zero." · "R" · "Ramesh" · "Limit now" · "Remove the limit" · "Removing the limit only stops the warning. No entry changes. You can set a limit again at any time." · "New limit" · "Save limit" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p6.title`, `sync.saved`, `common.back`, `refusal.title`, `refusal.creditLimit`, `p6.current`, `p6.clear`, `p6.amount`, `p6.save`, `keypad.clear`, `keypad.delete`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Removing the limit only stops the warning. No entry changes. You can set a limit again at any time."

### Supplier: what you owe, Pay supplier, history

- Route: `P3` · changed from the app today · mockup: `screens/ledger.html#c-ledger-p3`
- Purpose: One supplier. How much the shop owes, the one action Pay supplier, and the entries behind the figure.
- Primary action: Pay supplier (solid teal, fixed at the foot).
- Taps / target: Pay: Pay supplier (1), digits, Add.
- Rules held: D2: a payment in Cash reduces the drawer; a purchase on credit adds to what is owed without moving cash. Out-flow printed with a minus sign. Append-only.
- Notes: As built, P3 headline is today's change (p1.changeToday) and the screen has no balance hero; the hero here is the balance owed (p3.owed), which is the figure the shopkeeper needs, matching P2. History is complete: +₹20,000.00 -₹1,600.00 = ₹18,400.00.
- **For Saket's review:** P3 headline changes from today's change to the balance owed.
- Copy on screen (en): "Supplier" · "Saved" · "M" · "Mohanty Traders" · "You owe" · "Ledger" · "Paid to suppliers" · "15:30, 15 October · Cash" · "-" · "Purchases" · "10:10, 2 October · Udhar" · "+" · "Pay supplier"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p2.ledger`, `section.party_payment`, `t1.month.10`, `formA.mode.cash`, `section.purchase`, `formA.mode.udhar`, `p3.title`, `sync.saved`, `common.back`, `p3.owed`, `t8.title.pay`

### Supplier: no entries yet

- Route: `P3` · exists today, restyled · mockup: `screens/ledger.html#c-ledger-p3-empty`
- Purpose: A supplier with no history. The next action is the first payment or purchase.
- Primary action: Pay supplier.
- Taps / target: 1 tap.
- Rules held: Balance ₹0.00 derived; nothing invented.
- Notes: As built p3.empty is text; the button is always present at the foot.
- Copy on screen (en): "Supplier" · "Saved" · "O" · "Odisha Wholesale" · "You owe" · "Nothing recorded for this supplier yet." · "Pay supplier"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `p3.title`, `sync.saved`, `common.back`, `p3.owed`, `p3.empty`, `t8.title.pay`

## Area: Reports (30 screen states)

The Reports tab and what hangs off it: R1 with its gates, Behaviour Engine readings and the three scores (Business Health is said, not scored, BE-07), the Premium dashboard M1, Ask C1, entries for the accountant S12 and Your plan S10. Beta note: plan.ts has BETA.allFree = true, so today every beta user sees the Premium state of M1 and C1 and the Premium cards are open; the free-plan frames show what returns when the beta flag is switched off. Every figure is derived on read from the entries; no figure is predicted or suggested.

### Reports: before the first close

- Route: `R1` · changed from the app today · mockup: `screens/reports.html#c-reports-empty`
- Purpose: A new shop has no closed day, so there is nothing true to report. Say so, and say what opens it.
- Primary action: Continue day close (goes to Today and its close list). Secondary: Ask a question.
- Taps / target: Ask a question = 1 tap. Reaching the close list = 2 taps (Today tab, close card).
- Rules held: Emptiness is derived from the count of closed days, never from a flag. No headline figure and no zero chart above the sentence. No inference.
- Notes: As built, the empty state is the sentence r1.empty plus the Ask button; the Continue day close button is NEW here so the empty state has a next action, not a dead end (brief: never "nothing here yet" alone). Ask stays in the body header so a shop can ask how to close a day.
- **For Saket's review:** Adds a Continue day close button to the empty Reports state; R1.tsx today shows only the sentence and Ask.
- Copy on screen (en): "Reports" · "Saved" · "Ask a question" · "Reports open after you close your first day." · "Continue day close" · "Today" · "Ledger"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `r1.title`, `sync.saved`, `c1.open`, `r1.empty`, `t1.continueClose`, `nav.today`, `nav.parties`, `nav.reports`

### Reports: first week, too few closed days

- Route: `R1` · changed from the app today · mockup: `screens/reports.html#c-reports-gate`
- Purpose: Three days are closed. Level 1 figures are true and shown; every trend and score is held back with its own gate sentence, never a zero or an empty chart.
- Primary action: Continue day close (tonal). Each held-back reading shows how many closed days it needs and how many exist.
- Taps / target: Read the gates = 0 taps. Continue closing = 1 tap from here.
- Rules held: Gate sentence r1.gate comes from the engine's own two numbers (need, have). Needs: profit trend 14, sales variation 14, closing-cash variation 21, working-capital 14, credit concentration 14, Cash Confidence 14, Operational Consistency 14 (BI_GATES, SCORE_GATES in the engine). Nothing says what to do with a figure.
- Notes: A small progress bar is drawn under each gate sentence (NEW, a drawing of the same two numbers, with the sentence beside it so it is not a picture alone). The info line above the cards says what moves the gates; r1.gate alone states the count but not the way forward. Demo: sales 3,40,000, expenses 52,000, owed 80,000 after three closes.
- **For Saket's review:** Two additions beyond R1.tsx: a progress bar under each gate sentence and one "what moves this" line; both need Saket's yes.
- Copy on screen (en): "Reports" · "Saved" · "Ask a question" · "Days closed" · "3" · "Sales so far" · "Expenses so far" · "-" · "Owed to you" · "Figures are recomputed from your entries every time you open this." · "Each day you close brings these readings closer." · "What is changing" · "Profit trend" · "After 14 closed days, 3 so far" · "Day-to-day sales variation" · "Where pressure is building" · "Closing cash variation" · "After 21 closed days, 3 so far" · "Owed to you and by you, against cash" · "Credit held by your 3 largest customers" · "Cash confidence" · "Cash matched exactly" · "UPI matching and the reasons for gaps are not counted yet." · "Operational consistency" · "Days closed, of days opened" · "Business health is not shown as one number. How to weigh these readings against each other has not been measured, so each one stands on its own." · "Continue day close" · "Today" · "Ledger"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `r1.title`, `sync.saved`, `c1.open`, `r1.daysClosed`, `r1.totalSales`, `r1.totalExpenses`, `r1.creditOutstanding`, `r1.note`, `r1.changing`, `r1.bi1`, `r1.gate`, `r1.bi2`, `r1.pressure`, `r1.bi3`, `r1.bi4`, `r1.bi6`, `r1.cc.title`, `r1.cc.match`, `r1.cc.notYet`, `r1.oc.title`, `r1.oc.closing`, `r1.bh`, `t1.continueClose`, `nav.today`, `nav.parties`, `nav.reports`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Each day you close brings these readings closer."

### Reports: a normal month (what happened)

- Route: `R1` · changed from the app today · mockup: `screens/reports.html#c-reports-month`
- Purpose: Level 1, what happened: days closed, sales, expenses, owed to you, who owes you and what you owe, then this month at a glance.
- Primary action: Premium dashboard row (opens M1) and Ask a question. Reading only; nothing is typed here.
- Taps / target: Owes-lookup: Reports tab, scroll to Who owes you = 1 tap plus a scroll (target under 10 s). Dashboard = 1 tap.
- Rules held: Derived on read (r1.note says so). D3: Taken home is shown beside profit; only "Profit left in the shop" is derived from both. Count of days is plain text, never a rupee component. Bucketed udhar: oldest first.
- Notes: Demo book: this month sales = cash 12,00,000 + UPI 4,50,000 + udhar 3,00,000; profit = sales - purchases - expenses. Out-flows (expenses, purchases, taken home) are drawn with a printed minus here; R1.tsx draws them unsigned, so this is a change for review. The five udhar names are 1,00,000 + 2,00,000 + 4,50,000 + 5,00,000 + 9,00,000 = 21,50,000 = the buckets = Owed to you.
- **For Saket's review:** Prints a minus on out-flow rows (expenses, purchases, taken home) in the report cards; the app draws them unsigned today.
- Copy on screen (en): "Reports" · "Saved" · "Ask a question" · "Days closed" · "30" · "Sales so far" · "Expenses so far" · "-" · "Owed to you" · "Figures are recomputed from your entries every time you open this." · "Premium dashboard" · "Sales estimate and comparisons" · "Who owes you, oldest first" · "0 to 30 days" · "31 to 60 days" · "61 to 90 days" · "Over 90 days" · "Pradeep · 95 days" · "Lakshmi · 70 days" · "Sunita · 40 days" · "Bijay · 18 days" · "Ramesh · 5 days" · "Named parties only; the oldest udhar counts as paid first. Only as complete as what was entered." · "What you owe suppliers, oldest first" · "Maa Tarini Stores · 20 days" · "Kedar Wholesale · 9 days" · "This month so far" · "18" · "Net sales" · "Cash sales" · "UPI sales" · "Udhar sales" · "Expenses" · "Purchases" · "Estimated profit" · "+" · "Taken home" · "Profit left in the shop" · "What you took home is not taken off profit. It is shown beside it." · "Today" · "Ledger"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `r1.title`, `sync.saved`, `c1.open`, `r1.daysClosed`, `r1.totalSales`, `r1.totalExpenses`, `r1.creditOutstanding`, `r1.note`, `rep.dashboard`, `rep.dashboard.detail`, `rep.dues.title`, `rep.bucket.0`, `rep.bucket.1`, `rep.bucket.2`, `rep.bucket.3`, `rep.party.age`, `rep.dues.note`, `rep.owe.title`, `rep.month.this`, `rep.month.netSales`, `rep.month.cash`, `rep.month.upi`, `rep.month.udhar`, `rep.month.expenses`, `rep.month.purchases`, `rep.month.profit`, `rep.month.takenHome`, `rep.month.left`, `rep.month.note`, `nav.today`, `nav.parties`, `nav.reports`

### Reports: further down (last month, cash checks, UPI)

- Route: `R1` · exists today, restyled · mockup: `screens/reports.html#c-reports-more`
- Purpose: The rest of the free basic reports, scrolled to: last month, the cash-check history and the UPI the shopkeeper confirmed.
- Primary action: None; reading.
- Taps / target: n/a
- Rules held: Decision 3: the UPI figure is the sum of receipts he confirmed, not a bank balance; the count of confirmed receipts sits beside it. Last month is absent when the book starts this month (HT-46). Differences carry + or - and words (Matched, Less than expected, More than expected), not colour alone.
- Notes: Demo: matched 22 + less 5 + more 3 = 30 closed days. Last seven checks are listed, newest first; a day with a difference shows the sign. Reasons for a gap (T12) would append after the date; none drawn. This frame is the lower part of the same scroll as the one above.
- Copy on screen (en): "Reports" · "Saved" · "Last month" · "Days closed" · "12" · "Net sales" · "Cash sales" · "UPI sales" · "Udhar sales" · "Expenses" · "-" · "Purchases" · "Estimated profit" · "+" · "Taken home" · "Profit left in the shop" · "What you took home is not taken off profit. It is shown beside it." · "Cash checks" · "Matched" · "22 of 30 days" · "Less than expected" · "5 of 30 days" · "More than expected" · "3 of 30 days" · "Wednesday 18 November" · "Tuesday 17 November" · "Monday 16 November" · "Sunday 15 November" · "Saturday 14 November" · "Friday 13 November" · "Thursday 12 November" · "UPI you confirmed" · "This month so far" · "41 of 44 receipts confirmed" · "23 of 23 receipts confirmed" · "Today" · "Ledger"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `r1.title`, `sync.saved`, `rep.month.last`, `r1.daysClosed`, `rep.month.netSales`, `rep.month.cash`, `rep.month.upi`, `rep.month.udhar`, `rep.month.expenses`, `rep.month.purchases`, `rep.month.profit`, `rep.month.takenHome`, `rep.month.left`, `rep.month.note`, `t1.day.3`, `t1.month.11`, `t1.day.2`, `t1.day.1`, `t1.day.0`, `t1.day.6`, `t1.day.5`, `t1.day.4`, `rep.cash.balanced`, `r1.ofDays`, `rep.cash.short`, `rep.cash.extra`, `rep.cash.title`, `rep.upi.title`, `rep.month.this`, `rep.upi.receipts`, `nav.today`, `nav.parties`, `nav.reports`

### Reports: what is changing, where pressure is building

- Route: `R1` · exists today, restyled · mockup: `screens/reports.html#c-reports-behaviour`
- Purpose: Behaviour Engine levels 2 and 3 with enough closed days: profit trend, sales variation, cash variation, short days, working capital, credit concentration.
- Primary action: None; reading. Each line states a fact about the book and none says what to do.
- Taps / target: n/a
- Rules held: These are derived observations, not instructions: Rising/Falling/Steady and More/Less concentrated are things to look at. A direction always carries a word and an arrow icon. BI5 has no card by D5.
- Notes: Demo values (30 closed days): profit trend Rising, average daily profit 380.00 earlier half against 460.00 later; sales variation 18.4%; closing cash variation 22.6% with 5 of 28 days short; owed to you and by you against cash 31.2%; top 3 customers hold 78.4%, more concentrated than recent closes. Percentages use the engine's one-decimal form. The wording is "worth a look" by being plain facts; no card says "you should".
- Copy on screen (en): "Reports" · "Saved" · "What is changing" · "Profit trend" · "Rising" · "Average daily profit, earlier half" · "+" · "Average daily profit, later half" · "Day-to-day sales variation" · "18.4%" · "Where pressure is building" · "Closing cash variation" · "22.6%" · "Days the box came up short" · "5 of 28 days" · "Owed to you and by you, against cash" · "31.2%" · "Credit held by your 3 largest customers" · "78.4%" · "Compared with recent closes" · "More concentrated" · "Today" · "Ledger"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `r1.title`, `sync.saved`, `r1.changing`, `r1.bi1`, `r1.bi1.up`, `r1.bi1.earlier`, `r1.bi1.later`, `r1.bi2`, `r1.pressure`, `r1.bi3`, `r1.bi3.short`, `r1.ofDays`, `r1.bi4`, `r1.bi6`, `r1.bi6.compared`, `r1.bi6.worsening`, `nav.today`, `nav.parties`, `nav.reports`

### Reports: the three scores (Cash Confidence, Operational Consistency, Business Health)

- Route: `R1` · exists today, restyled · mockup: `screens/reports.html#c-reports-scores`
- Purpose: Each score is shown as its separate published ratios, never blended. Business Health has no number (BE-07) and says so in a sentence.
- Primary action: None; reading.
- Taps / target: n/a
- Rules held: Business Health is said, not shown: r1.bh. Cash Confidence shows cash matched exactly (n of days) and the typical gap as a share of a day's sales; r1.cc.notYet says UPI matching and reasons are not counted yet. Operational Consistency shows days closed of days opened, sections filled or marked empty, and entries that are corrections. SCORES.md must validate the mathematics before any production use (decision 4).
- Notes: Demo: matched exactly 22 of 30 days, typical gap 1.2%; closed 30 of 31 days, recording 94.5%, corrections 3.1%. No score is a coloured badge, a grade or a traffic light.
- Copy on screen (en): "Reports" · "Saved" · "Cash confidence" · "Cash matched exactly" · "22 of 30 days" · "Typical cash gap, as a share of a day's sales" · "1.2%" · "UPI matching and the reasons for gaps are not counted yet." · "Operational consistency" · "Days closed, of days opened" · "30 of 31 days" · "Sections filled in or marked empty" · "94.5%" · "Entries that are corrections" · "3.1%" · "Business health is not shown as one number. How to weigh these readings against each other has not been measured, so each one stands on its own." · "Today" · "Ledger"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `r1.title`, `sync.saved`, `r1.cc.title`, `r1.cc.match`, `r1.ofDays`, `r1.cc.gap`, `r1.cc.notYet`, `r1.oc.title`, `r1.oc.closing`, `r1.oc.recording`, `r1.oc.corrections`, `r1.bh`, `nav.today`, `nav.parties`, `nav.reports`

### Reports: enough days to read, nothing earlier to compare

- Route: `R1` · exists today, restyled · mockup: `screens/reports.html#c-reports-nobaseline`
- Purpose: The no_baseline states: a reading exists but has no earlier period to be set against. The screen says "Nothing earlier to compare", never "No change".
- Primary action: None; reading.
- Taps / target: n/a
- Rules held: The engine keeps no_baseline apart from flat: "we do not know yet" is not "stable". The direction row carries a dash icon and words. Credit concentration is the one Behaviour card with this state in R1.tsx (r1.bi6.no_baseline). Today's sales against the median (BusinessMovement) also has no_baseline in the engine but R1.tsx has no card for it.
- Notes: Demo: 21 closed days, so closing-cash variation (needs 21) has just opened and Cash Confidence reads 15 of 21; Operational Consistency is still gated (9 of 14 here, as its own closed-day count) and shows the r1.gate sentence.
- Copy on screen (en): "Reports" · "Saved" · "Where pressure is building" · "Closing cash variation" · "22.6%" · "Days the box came up short" · "4 of 21 days" · "Owed to you and by you, against cash" · "29.4%" · "Credit held by your 3 largest customers" · "81.2%" · "Compared with recent closes" · "Nothing earlier to compare" · "Cash confidence" · "Cash matched exactly" · "15 of 21 days" · "Typical cash gap, as a share of a day's sales" · "1.5%" · "UPI matching and the reasons for gaps are not counted yet." · "Operational consistency" · "Days closed, of days opened" · "After 14 closed days, 9 so far" · "Business health is not shown as one number. How to weigh these readings against each other has not been measured, so each one stands on its own." · "Today" · "Ledger"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `r1.title`, `sync.saved`, `r1.pressure`, `r1.bi3`, `r1.bi3.short`, `r1.ofDays`, `r1.bi4`, `r1.bi6`, `r1.bi6.compared`, `r1.bi6.no_baseline`, `r1.cc.title`, `r1.cc.match`, `r1.cc.gap`, `r1.cc.notYet`, `r1.oc.title`, `r1.oc.closing`, `r1.gate`, `r1.bh`, `nav.today`, `nav.parties`, `nav.reports`

### Reports: loading

- Route: `R1` · exists today, restyled · mockup: `screens/reports.html#c-reports-loading`
- Purpose: The engine is reading the phone's own database. Shapes only, no spinner.
- Primary action: None; waits. Shown briefly.
- Taps / target: n/a
- Rules held: Skeleton, accessible name common.loading. Tabs stay so he can leave.
- Notes: Shapes match the figures card and the first reading card so nothing jumps when they arrive.
- Copy on screen (en): "Reports" · "Saved" · "Today" · "Ledger"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `r1.title`, `sync.saved`, `common.loading`, `nav.today`, `nav.parties`, `nav.reports`

### Reports: could not open

- Route: `R1` · exists today, restyled · mockup: `screens/reports.html#c-reports-error`
- Purpose: The reading failed. Nothing is lost; one next step.
- Primary action: Try again (common.retry).
- Taps / target: 1 tap.
- Rules held: common.error says nothing entered is lost. Icon plus words, one button, equal weight everywhere.
- Notes: Shown by Shell for status error. Tabs remain.
- Copy on screen (en): "Reports" · "Saved" · "Could not open this. Nothing you entered is lost." · "Try again" · "Today" · "Ledger"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `r1.title`, `sync.saved`, `common.error`, `common.retry`, `nav.today`, `nav.parties`, `nav.reports`

### Reports: offline, entries waiting

- Route: `R1` · exists today, restyled · mockup: `screens/reports.html#c-reports-offline`
- Purpose: Reports are computed on the phone, so they work with no network. The chip says the entries are safe and waiting.
- Primary action: None; the figures are complete for what this phone holds.
- Taps / target: n/a
- Rules held: Chip amber with a clock, never red. Figures include entries still waiting to send (derived from the phone's own entries).
- Notes: There is no offline-specific Reports state in R1.tsx; this frame is the normal screen with the sync chip and the line sync.waitingLong from the header pattern.
- Copy on screen (en): "Reports" · "3 waiting · safe on phone" · "3 waiting to send. Safe on this phone; it goes when the network is back." · "Ask a question" · "Days closed" · "30" · "Sales so far" · "Expenses so far" · "-" · "Owed to you" · "Figures are recomputed from your entries every time you open this." · "Premium dashboard" · "Sales estimate and comparisons" · "Who owes you, oldest first" · "0 to 30 days" · "31 to 60 days" · "61 to 90 days" · "Over 90 days" · "Pradeep · 95 days" · "Lakshmi · 70 days" · "Sunita · 40 days" · "Bijay · 18 days" · "Ramesh · 5 days" · "Named parties only; the oldest udhar counts as paid first. Only as complete as what was entered." · "Today" · "Ledger"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `sync.waiting`, `r1.title`, `sync.waitingLong`, `c1.open`, `r1.daysClosed`, `r1.totalSales`, `r1.totalExpenses`, `r1.creditOutstanding`, `r1.note`, `rep.dashboard`, `rep.dashboard.detail`, `rep.dues.title`, `rep.bucket.0`, `rep.bucket.1`, `rep.bucket.2`, `rep.bucket.3`, `rep.party.age`, `rep.dues.note`, `nav.today`, `nav.parties`, `nav.reports`

### Dashboard: Premium state (what a beta user sees)

- Route: `M1` · exists today, restyled · mockup: `screens/reports.html#c-m1-premium`
- Purpose: One screen for the Premium readings: the 7-day sales estimate, this month against last year, festival weeks.
- Primary action: None; reading. Back returns to Reports.
- Taps / target: From Reports: Premium dashboard row = 1 tap.
- Rules held: Every estimate says "estimate", how it was made and how often it was wrong. Nothing here is a number the user enters; nothing is stored. Comparisons are things to look at.
- Notes: BETA: plan.ts has BETA.allFree = true, so allows() is true for every plan and M1 draws these cards for a beta user, free or not. Method shown is "same as the last same weekday", because the weekday-and-trend method needs 56 closed days (18 here) and says so. Likely ranges are demo bounds, not engine output.
- Copy on screen (en): "Dashboard" · "Saved" · "Sales estimate, next 7 days" · "Method: the same as the last same weekday you closed." · "From 18 closed days, Sunday 1 November to Wednesday 18 November." · "Friday 20 November" · "Likely range" · "-" · "Saturday 21 November" · "Sunday 22 November" · "Monday 23 November" · "Tuesday 24 November" · "Wednesday 25 November" · "Thursday 26 November" · "Typical miss on past days" · "Weekday-and-trend method: after 56 closed days, 18 so far" · "An estimate from your own past sales, never a promise. The range holds 8 in 10 of its past misses. Only as complete as what was entered." · "This month against last year" · "This month so far (18 closed days)" · "Same dates last year (17 closed days)" · "Festival weeks" · "Diwali week (7 closed days)" · "Week before (6 closed days)" · "Festival dates: the central government's holiday list for 2025 and 2026."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `m1.title`, `sync.saved`, `common.back`, `m1.forecast.seasonal_naive`, `t1.day.0`, `t1.month.11`, `t1.day.3`, `m1.forecast.window`, `t1.day.5`, `m1.forecast.range`, `t1.day.6`, `t1.day.1`, `t1.day.2`, `t1.day.4`, `m1.forecast.miss`, `m1.forecast.hwGate`, `m1.forecast.estimate`, `m1.forecast.title`, `m1.lastYear.title`, `m1.lastYear.this`, `m1.lastYear.last`, `m1.festival.title`, `festival.diwali`, `m1.festival.week`, `m1.festival.before`, `m1.festival.source`

### Dashboard: Premium state, further down (pay time, returns, items)

- Route: `M1` · exists today, restyled · mockup: `screens/reports.html#c-m1-premium2`
- Purpose: How long customers take to pay, returns and adjustments week by week, and the slot for the item cards.
- Primary action: None; reading.
- Taps / target: n/a
- Rules held: The pay line is "something to look at, not a judgement of the customer" (m1.pay.note). No stock, no reorder, ever.
- Notes: Item cards come from the items area (PR-2) through a slot, drawn here only as a dashed hole. In the free plan after beta they stay readable and read-only.
- Copy on screen (en): "Dashboard" · "Saved" · "How long customers take to pay" · "Ramesh" · "usually 6 days" · "Sunita" · "usually 21 days" · "Bijay" · "usually 9 days" · "From udhar paid off in full. Something to look at, not a judgement of the customer." · "Returns and adjustments, week by week" · "Week to Wednesday 18 November: returns ({n})" · "-" · "Adjustments ({n})" · "+" · "Week to Thursday 12 November: returns ({n})" · "Item cards appear here (drawn in the items area)."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `m1.title`, `sync.saved`, `common.back`, `m1.pay.title`, `m1.pay.value`, `m1.pay.note`, `m1.returns.title`, `t1.day.3`, `t1.month.11`, `m1.returns.returns`, `m1.returns.adjustments`, `t1.day.4`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Item cards appear here (drawn in the items area)."

### Dashboard: Premium, too few closed days

- Route: `M1` · exists today, restyled · mockup: `screens/reports.html#c-m1-gated`
- Purpose: Premium is open but the book is young: the estimate says how many closed days it needs, the rest show their honest empty sentences.
- Primary action: None; reading.
- Taps / target: n/a
- Rules held: Gate sentence from the engine, a bar under it (same drawing as R1's gate), and the word "estimate" still present. Nothing is ever a zero chart.
- Notes: Demo: 5 closed days against the forecast gate of 14. When there is also no closed day and no item recorded, Shell replaces the cards with m1.empty (next frame).
- Copy on screen (en): "Dashboard" · "Saved" · "Sales estimate, next 7 days" · "After 14 closed days, 5 so far" · "An estimate from your own past sales, never a promise. The range holds 8 in 10 of its past misses. Only as complete as what was entered." · "This month against last year" · "This month so far (5 closed days)" · "No closed day on these dates last year yet." · "Festival weeks" · "No festival week among your closed days yet." · "Festival dates: the central government's holiday list for 2025 and 2026." · "How long customers take to pay" · "No udhar has been paid off in full yet." · "Returns and adjustments, week by week" · "Week to Wednesday 18 November: returns ({n})" · "-" · "Adjustments ({n})" · "Week to Thursday 12 November: returns ({n})"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `m1.title`, `sync.saved`, `common.back`, `m1.forecast.title`, `r1.gate`, `m1.forecast.estimate`, `m1.lastYear.title`, `m1.lastYear.this`, `m1.lastYear.none`, `m1.festival.title`, `m1.festival.none`, `m1.festival.source`, `m1.pay.title`, `m1.pay.none`, `m1.returns.title`, `t1.day.3`, `t1.month.11`, `m1.returns.returns`, `m1.returns.adjustments`, `t1.day.4`

### Dashboard: nothing closed yet

- Route: `M1` · changed from the app today · mockup: `screens/reports.html#c-m1-empty`
- Purpose: No closed day and no item recorded: the dashboard has nothing to draw.
- Primary action: Continue day close (NEW here; the app shows only the sentence).
- Taps / target: 1 tap to Today's close card.
- Rules held: A next action beside the empty sentence, never "nothing here yet" alone.
- Notes: M1 is reached from Reports, which is itself empty in this state, so a shop would rarely land here. Kept for completeness.
- **For Saket's review:** Adds a Continue day close button to the M1 empty state.
- Copy on screen (en): "Dashboard" · "Saved" · "The dashboard fills in once you have closed days." · "Continue day close"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `m1.title`, `sync.saved`, `common.back`, `m1.empty`, `t1.continueClose`

### Dashboard: free plan (returns after beta)

- Route: `M1` · exists today, restyled · mockup: `screens/reports.html#c-m1-free`
- Purpose: On the free plan the screen says plainly what Premium adds and draws no Premium figure. Not seen in beta, because BETA.allFree is on.
- Primary action: See Premium (opens S10, Your plan). Shown only when the caller passes onUpgrade.
- Taps / target: 1 tap to S10.
- Rules held: No dark patterns: one plain paragraph, one button, no countdown, no price pressure here. History recorded under Premium stays readable and is marked read-only; nothing is hidden or deleted.
- Notes: This is what the Free/Premium split looks like once the beta flag in plan.ts is switched off. Today the beta user never sees this card.
- Copy on screen (en): "Dashboard" · "Saved" · "This is part of Premium" · "Premium adds a sales estimate for the coming week, and comparisons with last year and with festival weeks. Everything you have recorded stays yours and readable in every plan." · "See Premium" · "Item cards appear here (drawn in the items area)."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `m1.title`, `sync.saved`, `common.back`, `m1.locked.title`, `m1.locked.body`, `m1.upgrade`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Item cards appear here (drawn in the items area)."

### Ask: empty, with questions to tap

- Route: `C1` · changed from the app today · mockup: `screens/reports.html#c-c1-empty`
- Purpose: Before any question: what can be asked. Chips are questions, never amounts.
- Primary action: Tap a question chip, or type a question and tap Ask.
- Taps / target: Chip answer = 1 tap. Typed question = type, then Ask.
- Rules held: A QUESTION, NEVER AN ENTRY: nothing typed here reaches the ledger and no answer fills a figure into an entry. No keypad, no tabs. Answers come only from what was entered (c1.empty says so). Ask is disabled until there is text.
- Notes: Chips are the free set (Sales, Expected cash, Udhar to collect, How to close the day, What udhar means) plus, in beta, three more (Sales this week, Best day this month, Old udhar). The app lists them as one long set; here only the first five fit above the field, the rest scroll. c1.empty is also the empty sentence; it sits under the chips. The text field has autocorrect, spell-check and autocomplete off.
- Copy on screen (en): "Ask" · "Saved" · "You could ask" · "Sales" · "Expected cash" · "Udhar to collect" · "How to close the day" · "What udhar means" · "Sales · this week" · "Best day · this month" · "Old udhar · over 30 days" · "Ask how to do something, what a word means, or about your figures. Answers come only from what has been entered." · "Type your question"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `c1.title`, `sync.saved`, `common.back`, `c1.suggested`, `c1.i.sales`, `c1.i.expected`, `c1.i.owed`, `c1.i.howClose`, `c1.i.termUdhar`, `c1.p.thisWeek`, `c1.i.bestDay`, `c1.p.thisMonth`, `c1.i.olderUdhar`, `c1.days`, `c1.empty`, `c1.placeholder`, `c1.ask`

### Ask: answered from recorded data

- Route: `C1` · exists today, restyled · mockup: `screens/reports.html#c-c1-answered`
- Purpose: A question was asked and answered from this phone's entries, with what it was understood as shown first.
- Primary action: Ask next (a further chip) or type another question.
- Taps / target: Owes-lookup by Ask: chip Udhar to collect = 1 tap (target under 10 s).
- Rules held: No generated figure: every rupee figure is the engine's, worked out on each render, never stored. "This covers only what was entered on this phone." Expected cash counts cash only; UPI never goes into the box (D2). No stock claims.
- Notes: Demo: Expected cash = opening 12,00,000 + in 9,35,000 - out 2,90,000 = 18,45,000, the same as the Today hero. The asked line shows the chip label when a chip was tapped; a typed question shows the typed words. The real "Ask next" chips for the free figures are none; Premium answers add chips (not drawn).
- Copy on screen (en): "Ask" · "Saved" · "Expected cash" · "Understood as: Expected cash" · "Expected cash in the box now" · "This covers only what was entered on this phone." · "Udhar to collect" · "Understood as: Udhar to collect" · "From the entries on this phone. Anything owed from before them is not included." · "Sales · this week" · "Understood as: Sales · this week" · "From Monday 16 November to Wednesday 18 November." · "Sales, this week" · "Type your question"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `c1.title`, `sync.saved`, `common.back`, `c1.i.expected`, `c1.f.expected`, `c1.covers`, `c1.heard`, `c1.i.owed`, `c1.f.owed`, `c1.note.thisPhone`, `c1.i.sales`, `c1.p.thisWeek`, `t1.day.1`, `t1.month.11`, `t1.day.3`, `c1.range`, `c1.f.sales`, `c1.placeholder`, `c1.ask`

### Ask: a how-to answer

- Route: `C1` · exists today, restyled · mockup: `screens/reports.html#c-c1-howto`
- Purpose: A question about the app (how to close the day) is answered from fixed copy, with no figure.
- Primary action: Type another question or tap Back.
- Taps / target: 1 tap on the chip.
- Rules held: Fixed copy, nothing generated; no "covers only" line because no figure is given. The answer says what to tap on Today; it never types or fills anything for him.
- Notes: The card shows what it was understood as, so a misunderstanding is visible before the answer is believed.
- Copy on screen (en): "Ask" · "Saved" · "How to close the day" · "Understood as: How to close the day" · "Tap Continue day close on Today. Go down the list: enter each section, or tap Nothing to enter. Then count the cash in the box and type it. If it is not what was expected, choose a reason. Then close the day." · "Type your question"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `c1.title`, `sync.saved`, `common.back`, `c1.i.howClose`, `c1.a.howClose`, `c1.heard`, `c1.placeholder`, `c1.ask`

### Ask: no match, asks back instead of guessing

- Route: `C1` · exists today, restyled · mockup: `screens/reports.html#c-c1-nomatch`
- Purpose: The typed words did not match a question with enough confidence. Offer three real questions as chips rather than guess.
- Primary action: Tap the question that was meant.
- Taps / target: 1 tap.
- Rules held: Below the matcher's confidence floor the screen asks back (c1.didYouMean); it never returns a figure for a guess. The chips are questions, not amounts.
- Notes: The typed words are the user's own (shown as typed; demo text only). The three options are the matcher's top three; the demo shows Sales, Expenses and Udhar to collect.
- Copy on screen (en): "Ask" · "Saved" · "bill" · "I am not sure what you mean. Is it one of these?" · "Sales" · "Expenses" · "Udhar to collect"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `c1.title`, `sync.saved`, `common.back`, `c1.didYouMean`, `c1.i.sales`, `c1.i.expenses`, `c1.i.owed`, `c1.placeholder`, `c1.ask`

### Ask: a Premium question on the free plan (returns after beta)

- Route: `C1` · exists today, restyled · mockup: `screens/reports.html#c-c1-premium`
- Purpose: A figure that needs Premium gets one plain line and the nearest free figure, never a bare refusal. Not seen in beta because BETA.allFree is on.
- Primary action: None; the free figure is shown. Optional: Your plan from Settings.
- Taps / target: n/a
- Rules held: c1.premium states it; no price, no upsell button inside the chat, no countdown. The figure shown is today's own sales, derived.
- Notes: After beta, the free set is the how-tos and meanings plus three figures for today only: sales, expected cash, udhar to collect.
- Copy on screen (en): "Ask" · "Saved" · "Sales · this week" · "Understood as: Sales · this week" · "That answer needs Premium. The free plan can show this:" · "Sales today" · "This covers only what was entered on this phone." · "Type your question"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `c1.title`, `sync.saved`, `common.back`, `c1.i.sales`, `c1.p.thisWeek`, `c1.premium`, `c1.f.salesToday`, `c1.covers`, `c1.heard`, `c1.placeholder`, `c1.ask`

### Entries for your accountant: pick a month

- Route: `S12` · changed from the app today · mockup: `screens/reports.html#c-s12-months`
- Purpose: Make a file of one month's entries and every party's balance, and hand it to any app via the share sheet. Free in every plan.
- Primary action: Tap a month (opens the share sheet).
- Taps / target: 2 taps from Settings (Entries for your accountant, month) plus choosing the app.
- Rules held: The file is made on the phone and nothing is sent to our server. The line "not a tax document" (s5.notTax) is on this screen. Only months with at least one entry are listed. Named "entries", never a return or invoice.
- Notes: As built, s12.body says "spreadsheet file (CSV)"; the frame replaces that sentence with a plain-words version so no one meets the word CSV (proposal; native review needed). Months are listed newest first with a share icon; no entry is edited or deleted.
- **For Saket's review:** Replaces the word "CSV" in the explanation with plain words; od/hi for the new sentence are for the native reviewer.
- Copy on screen (en): "Entries for your accountant" · "Saved" · "Choose a month. The phone makes a file of that month's entries and every party's balance, one you can open in a spreadsheet, and opens the share sheet. Nothing is sent to our server." · "This is a record of entries made in your shop book. It is not a tax document." · "Months" · "November 2026" · "October 2026"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s12.title`, `sync.saved`, `common.back`, `s5.notTax`, `s12.months`, `t1.month.11`, `t1.month.10`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Choose a month. The phone makes a file of that month's entries and every party's balance, one you can open in a spreadsheet, and opens the share sheet. Nothing is sent to our server."

### Entries for your accountant: the share sheet

- Route: `S12` · exists today, restyled · mockup: `screens/reports.html#c-s12-share`
- Purpose: After a month is tapped the phone hands the file to the system share sheet, titled "Share entries".
- Primary action: Choose an app, or tap outside to cancel.
- Taps / target: 1 tap on the app.
- Rules held: Sharing is his decision; nothing goes to our server. Cancelling leaves nothing changed.
- Notes: The share sheet is drawn by Android, not by the app: only its title (s12.chooser) is ours; the app names here are examples, not a list we control.
- Copy on screen (en): "Entries for your accountant" · "Saved" · "Months" · "November 2026" · "October 2026" · "Share entries" · "WhatsApp" · "Gmail" · "Drive"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s12.title`, `sync.saved`, `common.back`, `s12.months`, `t1.month.11`, `t1.month.10`, `s12.chooser`

### Entries for your accountant: no entries yet

- Route: `S12` · changed from the app today · mockup: `screens/reports.html#c-s12-empty`
- Purpose: Nothing recorded, nothing to share.
- Primary action: Go to Today to record a sale (NEW here; the app shows only the sentence).
- Taps / target: 2 taps back to Today.
- Rules held: A next action beside the empty sentence.
- Notes: Back is visible in the header. The month list is absent.
- **For Saket's review:** Adds a button to the empty state; the app shows s12.empty only.
- Copy on screen (en): "Entries for your accountant" · "Saved" · "No entries yet, so there is nothing to share." · "Today"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s12.title`, `sync.saved`, `common.back`, `s12.empty`, `nav.today`

### Entries for your accountant: loading

- Route: `S12` · exists today, restyled · mockup: `screens/reports.html#c-s12-loading`
- Purpose: The month list is being read from the phone.
- Primary action: None.
- Taps / target: n/a
- Rules held: Skeleton shapes, accessible name common.loading.
- Notes: Error for this screen is the same Shell error as Reports (common.error, Try again).
- Copy on screen (en): "Entries for your accountant" · "Saved"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s12.title`, `sync.saved`, `common.back`, `common.loading`

### Your plan: Free, preview offered, buying not open

- Route: `S10` · exists today, restyled · mockup: `screens/reports.html#c-s10-free`
- Purpose: What plan he is on, what stays free, what Premium adds and costs, and the way out, on one screen.
- Primary action: Try Premium free for 14 days (outlined; the two Buy buttons are disabled with the reason in words).
- Taps / target: Start preview = 1 tap.
- Rules held: No dark patterns: the final GST-included price is printed beside its button with the period and "renews until you cancel" in the same tile; monthly and yearly are identical, neither pre-selected, no "best value" badge. Disabled buy buttons have the reason in words above them (s10.notOpen), not a silent grey. Nothing is time-pressured.
- Notes: Prices are R5's 99 a month and 799 a year (PREMIUM_PRICES) until Play's own price arrives. BETA: while BETA.allFree is on, every beta user sees this screen with buying closed, and Premium features open without a plan; there is no string on this screen telling them the app is free during testing (see review).
- **For Saket's review:** Beta users see Premium cards open while S10 says "You are on Free" and buying is closed; consider one plain line saying everything is free during beta.
- Copy on screen (en): "Your plan" · "Saved" · "You are on Free." · "Try Premium free for 14 days, no payment details" · "It simply ends after 14 days. Nothing is charged, and nothing renews." · "Price of Premium" · "Cancel any time in Google Play. Premium stays on to the end of the period already paid." · "Buying Premium is not open yet." · "Monthly" · "a month, GST included" · "Renews automatically every month until you cancel." · "Buy monthly" · "Yearly" · "a year, GST included" · "Renews automatically every year until you cancel." · "Buy yearly" · "Free, for ever" · "No ads and no time limit. All of this stays free, also after Premium ends." · "Closing the day and the cash check" · "Every entry, and every correction" · "Parties and udhar" · "Reading every past day, with no limit" · "Exporting and deleting your data" · "Your consents, and the grievance officer" · "Premium adds" · "Items on each sale, from your own short list" · "Item reports: what sells most, what sells slowly, what a customer usually buys" · "A sales estimate for the coming days. It is an estimate, never a promise." · "Comparisons: the same time last year, festival weeks, how long each customer takes to pay" · "Questions answered from your own shop figures" · "One screen that brings these together"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s10.title`, `sync.saved`, `common.back`, `s10.status.free`, `s10.preview`, `s10.preview.note`, `s10.price.title`, `s10.cancelTerms`, `s10.notOpen`, `s10.price.monthly`, `s10.price.perMonth`, `s10.renew.monthly`, `s10.buy.monthly`, `s10.price.yearly`, `s10.price.perYear`, `s10.renew.yearly`, `s10.buy.yearly`, `s10.free.title`, `s10.free.promise`, `s10.free.close`, `s10.free.entries`, `s10.free.parties`, `s10.free.history`, `s10.free.data`, `s10.free.rights`, `s10.premium.title`, `s10.premium.items`, `s10.premium.itemReports`, `s10.premium.forecast`, `s10.premium.comparisons`, `s10.premium.chat`, `s10.premium.dashboard`

### Your plan: preview running

- Route: `S10` · exists today, restyled · mockup: `screens/reports.html#c-s10-preview`
- Purpose: A Premium preview is on; say plainly when it ends.
- Primary action: None needed; buying remains a free choice below.
- Taps / target: n/a
- Rules held: The status is one fact with a date, no countdown, no "only N days left", no guilt line. The preview simply ends; nothing is charged.
- Notes: Notice at top is s10.notice.previewStarted, shown once right after starting. Buy tiles stay because no purchase exists to cancel.
- Copy on screen (en): "Your plan" · "Saved" · "Premium preview has started. It ends by itself after 14 days, and nothing is charged." · "Premium preview ends on Thursday 3 December 2026." · "Price of Premium" · "Cancel any time in Google Play. Premium stays on to the end of the period already paid." · "Monthly" · "a month, GST included" · "Renews automatically every month until you cancel." · "Buy monthly" · "Yearly" · "a year, GST included" · "Renews automatically every year until you cancel." · "Buy yearly" · "Free, for ever" · "No ads and no time limit. All of this stays free, also after Premium ends." · "Closing the day and the cash check" · "Every entry, and every correction" · "Parties and udhar" · "Reading every past day, with no limit" · "Exporting and deleting your data" · "Your consents, and the grievance officer" · "Premium adds" · "Items on each sale, from your own short list" · "Item reports: what sells most, what sells slowly, what a customer usually buys" · "A sales estimate for the coming days. It is an estimate, never a promise." · "Comparisons: the same time last year, festival weeks, how long each customer takes to pay" · "Questions answered from your own shop figures" · "One screen that brings these together"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s10.title`, `sync.saved`, `common.back`, `s10.notice.previewStarted`, `t1.day.4`, `t1.month.12`, `s10.status.preview`, `s10.price.title`, `s10.cancelTerms`, `s10.price.monthly`, `s10.price.perMonth`, `s10.renew.monthly`, `s10.buy.monthly`, `s10.price.yearly`, `s10.price.perYear`, `s10.renew.yearly`, `s10.buy.yearly`, `s10.free.title`, `s10.free.promise`, `s10.free.close`, `s10.free.entries`, `s10.free.parties`, `s10.free.history`, `s10.free.data`, `s10.free.rights`, `s10.premium.title`, `s10.premium.items`, `s10.premium.itemReports`, `s10.premium.forecast`, `s10.premium.comparisons`, `s10.premium.chat`, `s10.premium.dashboard`

### Your plan: Premium bought, with Cancel

- Route: `S10` · exists today, restyled · mockup: `screens/reports.html#c-s10-premium`
- Purpose: A purchase is running. The way out is as easy to find as the way in.
- Primary action: Cancel Premium (opens Google Play's subscription page). Never disabled, never greyed.
- Taps / target: Cancel = 1 tap here (2 from Settings: the row, then the button).
- Rules held: Cancel sits right under the status fact, same weight as any button, with a note on where it goes. Everything recorded stays readable if Premium ends.
- Notes: Buy tiles are hidden while a subscription exists on Play. Status says renews on a date (s10.status.renews), or ends on a date when it will not renew.
- Copy on screen (en): "Your plan" · "Saved" · "Premium renews on Saturday 19 December 2026." · "Cancel Premium" · "Opens your subscription in Google Play." · "Free, for ever" · "No ads and no time limit. All of this stays free, also after Premium ends." · "Closing the day and the cash check" · "Every entry, and every correction" · "Parties and udhar" · "Reading every past day, with no limit" · "Exporting and deleting your data" · "Your consents, and the grievance officer" · "Premium adds" · "Items on each sale, from your own short list" · "Item reports: what sells most, what sells slowly, what a customer usually buys" · "A sales estimate for the coming days. It is an estimate, never a promise." · "Comparisons: the same time last year, festival weeks, how long each customer takes to pay" · "Questions answered from your own shop figures" · "One screen that brings these together"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s10.title`, `sync.saved`, `common.back`, `t1.day.6`, `t1.month.12`, `s10.status.renews`, `s10.cancel`, `s10.cancel.note`, `s10.free.title`, `s10.free.promise`, `s10.free.close`, `s10.free.entries`, `s10.free.parties`, `s10.free.history`, `s10.free.data`, `s10.free.rights`, `s10.premium.title`, `s10.premium.items`, `s10.premium.itemReports`, `s10.premium.forecast`, `s10.premium.comparisons`, `s10.premium.chat`, `s10.premium.dashboard`

### Your plan: payment still processing

- Route: `S10` · exists today, restyled · mockup: `screens/reports.html#c-s10-busy`
- Purpose: Buying was started; Google Play is still processing the payment. Buttons wait; nothing is promised.
- Primary action: None; wait. Buttons are disabled while busy.
- Taps / target: n/a
- Rules held: Says Premium starts when Play is done, not before. No fake success.
- Notes: Notice is s10.notice.pending. The same screen carries s10.notice.verifyLater, notOpen, failed and purchased as one-line notices in the same box.
- Copy on screen (en): "Your plan" · "Saved" · "Google Play is still processing the payment. Premium starts when it is done." · "You are on Free." · "Try Premium free for 14 days, no payment details" · "It simply ends after 14 days. Nothing is charged, and nothing renews." · "Price of Premium" · "Cancel any time in Google Play. Premium stays on to the end of the period already paid." · "Monthly" · "a month, GST included" · "Renews automatically every month until you cancel." · "Buy monthly" · "Yearly" · "a year, GST included" · "Renews automatically every year until you cancel." · "Buy yearly" · "Free, for ever" · "No ads and no time limit. All of this stays free, also after Premium ends." · "Closing the day and the cash check" · "Every entry, and every correction" · "Parties and udhar" · "Reading every past day, with no limit" · "Exporting and deleting your data" · "Your consents, and the grievance officer" · "Premium adds" · "Items on each sale, from your own short list" · "Item reports: what sells most, what sells slowly, what a customer usually buys" · "A sales estimate for the coming days. It is an estimate, never a promise." · "Comparisons: the same time last year, festival weeks, how long each customer takes to pay" · "Questions answered from your own shop figures" · "One screen that brings these together"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s10.title`, `sync.saved`, `common.back`, `s10.notice.pending`, `s10.status.free`, `s10.preview`, `s10.preview.note`, `s10.price.title`, `s10.cancelTerms`, `s10.price.monthly`, `s10.price.perMonth`, `s10.renew.monthly`, `s10.buy.monthly`, `s10.price.yearly`, `s10.price.perYear`, `s10.renew.yearly`, `s10.buy.yearly`, `s10.free.title`, `s10.free.promise`, `s10.free.close`, `s10.free.entries`, `s10.free.parties`, `s10.free.history`, `s10.free.data`, `s10.free.rights`, `s10.premium.title`, `s10.premium.items`, `s10.premium.itemReports`, `s10.premium.forecast`, `s10.premium.comparisons`, `s10.premium.chat`, `s10.premium.dashboard`

### Your plan: offline notice

- Route: `S10` · exists today, restyled · mockup: `screens/reports.html#c-s10-offline`
- Purpose: A plan action needs the network. Say nothing changed and what to do.
- Primary action: Try again when online (tap the same button).
- Taps / target: 1 tap to retry.
- Rules held: Calm sentence, nothing changed, nothing lost; the sync chip is amber with a clock, never red. A cached premium answer ends at its own date, so a lapse is free, not hidden (history stays readable).
- Notes: Notice is s10.notice.offline.
- Copy on screen (en): "Your plan" · "3 waiting · safe on phone" · "No connection. Nothing changed. Try again when the phone is online." · "You are on Free." · "Try Premium free for 14 days, no payment details" · "It simply ends after 14 days. Nothing is charged, and nothing renews." · "Price of Premium" · "Cancel any time in Google Play. Premium stays on to the end of the period already paid." · "Buying Premium is not open yet." · "Monthly" · "a month, GST included" · "Renews automatically every month until you cancel." · "Buy monthly" · "Yearly" · "a year, GST included" · "Renews automatically every year until you cancel." · "Buy yearly" · "Free, for ever" · "No ads and no time limit. All of this stays free, also after Premium ends." · "Closing the day and the cash check" · "Every entry, and every correction" · "Parties and udhar" · "Reading every past day, with no limit" · "Exporting and deleting your data" · "Your consents, and the grievance officer" · "Premium adds" · "Items on each sale, from your own short list" · "Item reports: what sells most, what sells slowly, what a customer usually buys" · "A sales estimate for the coming days. It is an estimate, never a promise." · "Comparisons: the same time last year, festival weeks, how long each customer takes to pay" · "Questions answered from your own shop figures" · "One screen that brings these together"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s10.title`, `sync.waiting`, `common.back`, `s10.notice.offline`, `s10.status.free`, `s10.preview`, `s10.preview.note`, `s10.price.title`, `s10.cancelTerms`, `s10.notOpen`, `s10.price.monthly`, `s10.price.perMonth`, `s10.renew.monthly`, `s10.buy.monthly`, `s10.price.yearly`, `s10.price.perYear`, `s10.renew.yearly`, `s10.buy.yearly`, `s10.free.title`, `s10.free.promise`, `s10.free.close`, `s10.free.entries`, `s10.free.parties`, `s10.free.history`, `s10.free.data`, `s10.free.rights`, `s10.premium.title`, `s10.premium.items`, `s10.premium.itemReports`, `s10.premium.forecast`, `s10.premium.comparisons`, `s10.premium.chat`, `s10.premium.dashboard`

### Your plan: payment on hold at Google Play

- Route: `S10` · exists today, restyled · mockup: `screens/reports.html#c-s10-onhold`
- Purpose: Play could not take the payment; Premium is paused. The fix and the exit are the same page.
- Primary action: Cancel Premium (opens Play, where the payment can be fixed or the subscription cancelled).
- Taps / target: 1 tap.
- Rules held: Plain statement of fact (s10.status.onHold); no alarm styling; nothing is deleted.
- Notes: Premium is off while on hold, so S10 shows free state with Cancel (a subscription still exists on Play).
- Copy on screen (en): "Your plan" · "Saved" · "Google Play could not take the payment. Premium is paused until it does." · "Cancel Premium" · "Opens your subscription in Google Play." · "Free, for ever" · "No ads and no time limit. All of this stays free, also after Premium ends." · "Closing the day and the cash check" · "Every entry, and every correction" · "Parties and udhar" · "Reading every past day, with no limit" · "Exporting and deleting your data" · "Your consents, and the grievance officer" · "Premium adds" · "Items on each sale, from your own short list" · "Item reports: what sells most, what sells slowly, what a customer usually buys" · "A sales estimate for the coming days. It is an estimate, never a promise." · "Comparisons: the same time last year, festival weeks, how long each customer takes to pay" · "Questions answered from your own shop figures" · "One screen that brings these together"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s10.title`, `sync.saved`, `common.back`, `s10.status.onHold`, `s10.cancel`, `s10.cancel.note`, `s10.free.title`, `s10.free.promise`, `s10.free.close`, `s10.free.entries`, `s10.free.parties`, `s10.free.history`, `s10.free.data`, `s10.free.rights`, `s10.premium.title`, `s10.premium.items`, `s10.premium.itemReports`, `s10.premium.forecast`, `s10.premium.comparisons`, `s10.premium.chat`, `s10.premium.dashboard`

## Area: Settings and privacy (36 screen states)

Settings hub and everything off it: your shop and the business day start, language and screen, what you agreed to (one-tap withdrawal), your data and account deletion, About, Help, log out, app lock, plus two NEW screens: Your data (export) and Signed-in phones. Odia and Hindi are DRAFT (H13).

### Settings: hub

- Route: `S1` · changed from the app today · mockup: `screens/settings.html#c-settings-hub`
- Purpose: One place to reach the shop, language, privacy, help and the way out.
- Primary action: Rows with icon and chevron; each opens its screen.
- Taps / target: Language: Today, Settings row, Language = 3 taps. Withdraw consent: Settings, Privacy, one switch = 3 taps.
- Rules held: Log out and Delete sit under their own headings, apart from App lock. Delete is words plus icon, not colour alone.
- Notes: Rows as built: shop, language, plan (absent in the all-free beta), items (Premium only), accountant export, app lock, account (Log out), privacy, about, help, delete. Group headings, App lock as a switch, "Your data" and "Signed-in phones" rows are proposals.
- **For Saket's review:** Hub gains two rows (Your data, Signed-in phones) and group headings; confirm the order.
- Copy on screen (en): "Settings" · "Saved" · "Your shop" · "Subhadra Kirana" · "Language and screen" · "Entries for your accountant" · "Your data" · "App lock" · "Off" · "Account" · "Your account" · "+91 98765 43210" · "Signed-in phones" · "Sign out a lost phone" · "Log out" · "Legal and help" · "Privacy and consent" · "About this app" · "Help and contact" · "Danger zone" · "Delete this account" · "Deletes your book. You can undo for 30 days."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s1.appLock`, `s1.appLockOff`, `a8.logout`, `s1.title`, `sync.saved`, `common.back`, `s1.shop`, `s1.language`, `s1.export`, `s1.privacy`, `s1.about`, `s1.help`, `s1.deleteAccount`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Your account" · "Signed-in phones" · "Sign out a lost phone" · "Off" · "Your shop" · "Your data" · "Account" · "Legal and help" · "Danger zone" · "Deletes your book. You can undo for 30 days."

### Settings: this phone is not signed in

- Route: `S1` · exists today, restyled · mockup: `screens/settings.html#c-settings-hub-signedout`
- Purpose: No session on this phone: the account row offers Sign in instead of Log out.
- Primary action: Sign in.
- Taps / target: 1 tap to sign in.
- Rules held: The shop comes from the session; with none, no account rows are drawn.
- Notes: As built: onSignIn replaces onLogOut. Phone list and Log out are not shown without a session.
- Copy on screen (en): "Settings" · "Saved" · "Your shop" · "Subhadra Kirana" · "Language and screen" · "Entries for your accountant" · "Your data" · "App lock" · "Off" · "Account" · "Sign in" · "Legal and help" · "Privacy and consent" · "About this app" · "Help and contact" · "Danger zone" · "Delete this account" · "Deletes your book. You can undo for 30 days."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s1.signIn`, `s1.appLock`, `s1.appLockOff`, `s1.title`, `sync.saved`, `common.back`, `s1.shop`, `s1.language`, `s1.export`, `s1.privacy`, `s1.about`, `s1.help`, `s1.deleteAccount`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Off" · "Your shop" · "Your data" · "Account" · "Legal and help" · "Danger zone" · "Deletes your book. You can undo for 30 days."

### Settings: app lock cannot be turned on

- Route: `S1` · changed from the app today · mockup: `screens/settings.html#c-settings-hub-lock-unavailable`
- Purpose: He tried App lock and the phone has no screen lock. Say why, and keep the switch visibly off.
- Primary action: Set a screen lock in the phone settings (outside the app).
- Taps / target: No action here; the reason is on the row.
- Rules held: A switch is never silently dead.
- Notes: Text is s1.appLockNoScreenLock as built; v1 drew it as a link row with plain text below. A "Chosen: No" word state is on the switch.
- Copy on screen (en): "Settings" · "Saved" · "Your shop" · "Subhadra Kirana" · "Language and screen" · "Entries for your accountant" · "Your data" · "App lock" · "Off" · "This phone has no screen lock, so the app lock cannot be turned on. Set a screen lock in the phone settings first." · "Account" · "Your account" · "+91 98765 43210" · "Signed-in phones" · "Sign out a lost phone" · "Log out" · "Legal and help" · "Privacy and consent" · "About this app" · "Help and contact" · "Danger zone" · "Delete this account" · "Deletes your book. You can undo for 30 days."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s1.appLock`, `s1.appLockOff`, `s1.appLockNoScreenLock`, `a8.logout`, `s1.title`, `sync.saved`, `common.back`, `s1.shop`, `s1.language`, `s1.export`, `s1.privacy`, `s1.about`, `s1.help`, `s1.deleteAccount`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Your account" · "Signed-in phones" · "Sign out a lost phone" · "Off" · "Your shop" · "Your data" · "Account" · "Legal and help" · "Danger zone" · "Deletes your book. You can undo for 30 days."

### Settings: loading

- Route: `S1` · exists today, restyled · mockup: `screens/settings.html#c-settings-hub-loading`
- Purpose: The shell is waiting on the phone database.
- Primary action: None.
- Taps / target: None.
- Rules held: Placeholder rows, no spinner.
- Notes: Shell loading state, shared by S1 to S8. Error state is the common error with Try again, not redrawn per screen.
- Copy on screen (en): "Settings" · "Saved"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s1.title`, `sync.saved`, `common.back`

### Your shop

- Route: `S2` · changed from the app today · mockup: `screens/settings.html#c-settings-shop`
- Purpose: Show the shop name as typed and let him set when his business day starts.
- Primary action: Day starts at row (opens the labelled list).
- Taps / target: Change day start: row, time, done = 2 taps.
- Rules held: Name is read-only and shown verbatim: not capitalised or trimmed. Day start applies to days opened afterwards; recorded days keep their hours (CLAUDE.md decision 1).
- Notes: As built the name sits in a plain block (no onEditName), so no chevron. Day start is a Segmented control of 7 times in the app today (00:00 to 06:00); here a list row opens a labelled list.
- **For Saket's review:** Day start as a list sheet rather than a 7-way segment: seven segments will not fit 360 px at 56 dp.
- Copy on screen (en): "Your shop" · "Saved" · "Shop name" · "Subhadra Kirana" · "Your shop name appears on anything you export." · "Day starts at" · "A sale before this time counts in the day before. Applies from the next day you open; days already recorded keep their hours." · "02:00"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s2.title`, `sync.saved`, `common.back`, `s2.name`, `s2.note`, `s2.dayStart`, `s2.dayStartNote`

### Your shop: choose the day start

- Route: `S2` · changed from the app today · mockup: `screens/settings.html#c-settings-shop-daystart`
- Purpose: Pick the hour a business day begins.
- Primary action: Tap a time; it applies at once with no Save.
- Taps / target: 1 tap on a time.
- Rules held: Applied at once; says it governs only days opened afterwards. The app never suggests a time.
- Notes: Choices are the fixed 00:00 to 06:00 list from the store (DAY_START_CHOICES). Labels like "after midnight" would be new strings and are not drawn. Nothing is pre-chosen except his saved value.
- Copy on screen (en): "Your shop" · "Saved" · "Shop name" · "Subhadra Kirana" · "Your shop name appears on anything you export." · "Day starts at" · "A sale before this time counts in the day before. Applies from the next day you open; days already recorded keep their hours." · "02:00" · "00:00" · "01:00" · "Chosen" · "03:00" · "04:00" · "05:00" · "06:00"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s2.dayStart`, `s2.dayStartNote`, `s2.title`, `sync.saved`, `common.back`, `s2.name`, `s2.note`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Chosen"

### Your shop: day start changed

- Route: `S2` · changed from the app today · mockup: `screens/settings.html#c-settings-shop-daystart-done`
- Purpose: Confirm the new hour and what it does and does not move.
- Primary action: None; Back.
- Taps / target: 0.
- Rules held: Past days are never re-dated (D7).
- Notes: Toast wording is new; the note under the row is s2.dayStartNote as built.
- Copy on screen (en): "Your shop" · "Saved" · "Shop name" · "Subhadra Kirana" · "Your shop name appears on anything you export." · "Day starts at" · "A sale before this time counts in the day before. Applies from the next day you open; days already recorded keep their hours." · "03:00" · "Day now starts at 03:00"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s2.title`, `sync.saved`, `common.back`, `s2.name`, `s2.note`, `s2.dayStart`, `s2.dayStartNote`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Day now starts at 03:00"

### Language and screen

- Route: `S3` · changed from the app today · mockup: `screens/settings.html#c-settings-language`
- Purpose: Switch language and screen mode and see the result on this page.
- Primary action: Tap a language or a mode; applied at once, no Save.
- Taps / target: 1 tap each.
- Rules held: Each language is written in itself (never translated). The mode names say what the screen does, not an eyesight word.
- Notes: Language is three buttons (English, Hindi, Odia). The built Screen setting has two modes, Light and "Dark, bigger text" (s3.focus), not Normal/Large/Extra large: those three labels do not exist. A live preview card is added here so the change is seen before leaving.
- **For Saket's review:** Real display modes are two (Light, Dark bigger text); a three-step text size is a proposal that needs tokens work and copy.
- Copy on screen (en): "Language and screen" · "Saved" · "Language" · "English" · "हिन्दी" · "ଓଡ଼ିଆ" · "Screen" · "Light" · "Dark, bigger text" · "Preview" · "In the box now" · "Opening" · "cash in" · "+" · "cash out" · "-"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s3.title`, `sync.saved`, `common.back`, `s3.language`, `s3.display`, `s3.comfort`, `s3.focus`, `box.title`, `box.opening`, `box.in`, `box.out`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Preview"

### Language and screen: dark, bigger text

- Route: `S3` · changed from the app today · mockup: `screens/settings.html#c-settings-language-focus`
- Purpose: The same page after choosing the second mode.
- Primary action: Tap Light to go back.
- Taps / target: 1 tap to switch back.
- Rules held: Reversible in one tap on the same screen.
- Notes: Use the page header toggles (theme, size) to see the rendered mode; the frame is the same layout with the other segment chosen.
- Copy on screen (en): "Language and screen" · "Saved" · "Language" · "English" · "हिन्दी" · "ଓଡ଼ିଆ" · "Screen" · "Light" · "Dark, bigger text" · "Preview" · "In the box now" · "Opening" · "cash in" · "+" · "cash out" · "-"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s3.title`, `sync.saved`, `common.back`, `s3.language`, `s3.display`, `s3.comfort`, `s3.focus`, `box.title`, `box.opening`, `box.in`, `box.out`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Preview"

### Privacy and consent

- Route: `S4` · exists today, restyled · mockup: `screens/settings.html#c-settings-privacy`
- Purpose: Route to what he agreed to, and say withdrawal is as easy as giving.
- Primary action: What you agreed to (opens the consent screen).
- Taps / target: 1 tap to the switches.
- Rules held: DPDP: withdrawal as easy as giving; the sentence sits with the row.
- Notes: Only the one row and s4.withdraw exist today. The policy link lives in About, not here.
- Copy on screen (en): "Privacy and consent" · "Saved" · "What you agreed to" · "You can turn any of these off at any time. Turning one off is as easy as turning it on." · "Your data"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s4.title`, `sync.saved`, `common.back`, `s4.review`, `s4.withdraw`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Your data"

### What you agreed to (manage)

- Route: `X0` · changed from the app today · mockup: `screens/settings.html#c-settings-consent`
- Purpose: See each purpose and turn an optional one off or on.
- Primary action: Each optional purpose is its own switch. One tap changes it and takes effect at once.
- Taps / target: Withdraw one purpose: 1 tap (v1 needed switch plus Save).
- Rules held: No pre-ticked consent, no Save button, equal weight for Yes and No, the required purpose shown locked with its reason.
- Notes: As built, X0 manage has switches plus a Save button (consent.save). Here the Save is removed. The required row is not a switch (service cannot run without it; the way out is deleting the account).
- **For Saket's review:** Removes the Save button in manage mode to meet DPDP withdrawal-as-easy-as-giving; USABILITY item "withdrawal needs switch plus Save".
- Copy on screen (en): "What you agreed to" · "Saved" · "This is what SWAFTO keeps, and why. Nothing is kept for any other reason." · "Needed to keep your book" · "Your number, your shop name, and the entries you type" · "Yes" · "Your choice" · "Send me reminders by SMS" · "Your choice: Yes" · "On" · "Send crash reports, never with money or names" · "Your choice: No" · "Off" · "You can see everything we hold, correct it, or have it erased. You can change any of these choices later, as easily as now."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `consent.manage.title`, `sync.saved`, `common.back`, `consent.intro`, `consent.required`, `consent.purpose.account_and_ledger`, `consent.on`, `consent.optional`, `consent.purpose.sms_reminders`, `consent.purpose.crash_diagnostics`, `consent.off`, `consent.rights`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "On" · "Off"

### What you agreed to: just withdrawn

- Route: `X0` · changed from the app today · mockup: `screens/settings.html#c-settings-consent-withdrawn`
- Purpose: Confirm the withdrawal happened now.
- Primary action: None; the switch already reads No.
- Taps / target: 0 after the one tap.
- Rules held: Status in icon plus words on the switch and in the toast; he can switch it back on in one tap.
- Notes: Toast copy is new. The server records the withdrawal when the tap lands.
- Copy on screen (en): "What you agreed to" · "Saved" · "This is what SWAFTO keeps, and why. Nothing is kept for any other reason." · "Needed to keep your book" · "Your number, your shop name, and the entries you type" · "Yes" · "Your choice" · "Send me reminders by SMS" · "Your choice: No" · "Off" · "Send crash reports, never with money or names" · "You can see everything we hold, correct it, or have it erased. You can change any of these choices later, as easily as now." · "Turned off. This takes effect now."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `consent.manage.title`, `sync.saved`, `common.back`, `consent.intro`, `consent.required`, `consent.purpose.account_and_ledger`, `consent.on`, `consent.optional`, `consent.purpose.sms_reminders`, `consent.off`, `consent.purpose.crash_diagnostics`, `consent.rights`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Turned off. This takes effect now." · "Off"

### What you agreed to: offline

- Route: `X0` · exists today, restyled · mockup: `screens/settings.html#c-settings-consent-offline`
- Purpose: Withdrawal cannot reach the server, so the choice stays as it was, and the screen says so.
- Primary action: Try again with signal.
- Taps / target: 1 tap to retry.
- Rules held: Never show a switch as changed when the server did not accept it. Calm refusal, only after the tap.
- Notes: Copy is refusal.consent as built. Reading the list while offline gives refusal.consentRead instead (next frame).
- Copy on screen (en): "What you agreed to" · "Saved" · "This is what SWAFTO keeps, and why. Nothing is kept for any other reason." · "Needed to keep your book" · "Your number, your shop name, and the entries you type" · "Yes" · "Your choice" · "Send me reminders by SMS" · "Your choice: Yes" · "On" · "Send crash reports, never with money or names" · "Your choice: No" · "Off" · "You can see everything we hold, correct it, or have it erased. You can change any of these choices later, as easily as now." · "Could not do that" · "Could not reach the server, so your choice was not changed. Try again with signal."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `refusal.titleNotDone`, `refusal.consent`, `consent.manage.title`, `sync.saved`, `common.back`, `consent.intro`, `consent.required`, `consent.purpose.account_and_ledger`, `consent.on`, `consent.optional`, `consent.purpose.sms_reminders`, `consent.purpose.crash_diagnostics`, `consent.off`, `consent.rights`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "On" · "Off"

### What you agreed to: cannot be read

- Route: `X0` · exists today, restyled · mockup: `screens/settings.html#c-settings-consent-readfail`
- Purpose: No signal on opening: his current choices cannot be shown.
- Primary action: Try again.
- Taps / target: 1 tap.
- Rules held: No switches are drawn rather than guessing their state.
- Notes: Copy is refusal.consentRead as built.
- Copy on screen (en): "What you agreed to" · "Saved" · "Could not do that" · "Could not reach the server, so what you agreed to cannot be shown. Try again with signal." · "Try again"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `consent.manage.title`, `sync.saved`, `common.back`, `refusal.titleNotDone`, `refusal.consentRead`, `common.retry`

### Your data (access and export)

- Route: `NEW` · **NEW screen (not in the app today)** · mockup: `screens/settings.html#c-settings-data`
- Purpose: Let him see and take a copy of everything held about him (DPDP right of access).
- Primary action: Download everything we hold.
- Taps / target: 2 taps: row, download.
- Rules held: Read-only; nothing is edited or deleted here. A monthly CSV for his accountant already exists (s1.export).
- Notes: The API has GET /v1/me/export (full JSON), rate-limited, and answers 503 with a retry when busy. No mobile screen calls it today, only the accountant CSV (S12). Copy here is all new.
- **For Saket's review:** NEW screen needs a mobile caller for /v1/me/export and a file-share step; no backend work is needed.
- Copy on screen (en): "Your data" · "Saved" · "This is a copy of everything we hold about you: your number, shop name, every entry and every party." · "Download everything we hold" · "Entries for your accountant" · "To correct something, add a dated correction on the day. To erase it all, use Delete this account."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `sync.saved`, `common.back`, `s1.export`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Your data" · "This is a copy of everything we hold about you: your number, shop name, every entry and every party." · "Download everything we hold" · "To correct something, add a dated correction on the day. To erase it all, use Delete this account."

### Your data: offline

- Route: `NEW` · **NEW screen (not in the app today)** · mockup: `screens/settings.html#c-settings-data-offline`
- Purpose: No signal, so the copy cannot be fetched.
- Primary action: Try again with signal.
- Taps / target: 1 tap to retry.
- Rules held: Nothing is lost; calm and one next step.
- Notes: Refusal copy for export does not exist: new string.
- Copy on screen (en): "Your data" · "Offline" · "Could not do that" · "No connection, so nothing was downloaded. Try again with signal." · "Download everything we hold"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `common.back`, `refusal.titleNotDone`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Your data" · "Offline" · "No connection, so nothing was downloaded. Try again with signal." · "Download everything we hold"

### Delete this account

- Route: `S7` · changed from the app today · mockup: `screens/settings.html#c-settings-delete-info`
- Purpose: Say plainly what is deleted and that it can be undone for 30 days.
- Primary action: Continue (goes to the sure screen).
- Taps / target: 2 taps to reach the final button.
- Rules held: Destructive, so it says what happens and how to undo. Continue and the safe exit have equal weight.
- Notes: As built: s7.what and s7.grace, one Continue button. Back is the way to keep the book. A "take a copy first" button is proposed.
- **For Saket's review:** Adds "Take a copy of my data first" (links to Your data) so erasure is not the only route off this page.
- Copy on screen (en): "Delete this account" · "Saved" · "Everything in your shop book is deleted: every day, every entry, and every name you have recorded." · "Signing in again within 30 days cancels the deletion. After that it cannot be undone." · "Take a copy of my data first" · "Continue"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s7.title`, `sync.saved`, `common.back`, `s7.what`, `s7.grace`, `s7.continue`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Take a copy of my data first"

### Are you sure? (signed in)

- Route: `S8` · exists today, restyled · mockup: `screens/settings.html#c-settings-delete-confirm`
- Purpose: Final decision, with what he loses named.
- Primary action: Keep my book and Delete everything have equal size.
- Taps / target: 1 tap to confirm or keep.
- Rules held: The owed-money line shows only when money is owed (a fact about his book).
- Notes: As built: s8.phoneNow tells him the phone book goes the moment the server accepts. The server then erases after 30 days; sign in to cancel.
- Copy on screen (en): "Are you sure?" · "Saved" · "Everything in your shop book is deleted: every day, every entry, and every name you have recorded." · "The book on this phone is deleted as soon as our server accepts the request." · "You are still owed money that this book is the only record of." · "Keep my book" · "Delete everything"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s8.title`, `sync.saved`, `common.back`, `s7.what`, `s8.phoneNow`, `s8.owed`, `s8.cancel`, `s8.confirm`

### Are you sure? sending the request

- Route: `S8` · changed from the app today · mockup: `screens/settings.html#c-settings-delete-busy`
- Purpose: The request is in flight.
- Primary action: None; buttons are held.
- Taps / target: 0.
- Rules held: No double submit.
- Notes: The built screen has no busy state; this is a proposal.
- Copy on screen (en): "Are you sure?" · "Saved" · "Everything in your shop book is deleted: every day, every entry, and every name you have recorded." · "The book on this phone is deleted as soon as our server accepts the request." · "You are still owed money that this book is the only record of." · "Keep my book" · "Deleting"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s8.title`, `sync.saved`, `common.back`, `s7.what`, `s8.phoneNow`, `s8.owed`, `s8.cancel`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Deleting"

### Delete: no connection

- Route: `S8` · exists today, restyled · mockup: `screens/settings.html#c-settings-delete-offline`
- Purpose: Nothing was deleted, on the phone or the server.
- Primary action: Try again with signal.
- Taps / target: 1 tap.
- Rules held: Refusal shown only after the tap; the book is intact.
- Notes: Copy is refusal.eraseOffline as built.
- Copy on screen (en): "Are you sure?" · "Saved" · "Could not do that" · "No connection, so nothing was deleted - not on this phone and not on our server. Try again with signal." · "Everything in your shop book is deleted: every day, every entry, and every name you have recorded." · "The book on this phone is deleted as soon as our server accepts the request." · "You are still owed money that this book is the only record of." · "Keep my book" · "Delete everything"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `refusal.titleNotDone`, `refusal.eraseOffline`, `s8.title`, `sync.saved`, `common.back`, `s7.what`, `s8.phoneNow`, `s8.owed`, `s8.cancel`, `s8.confirm`

### Delete: server refused

- Route: `S8` · exists today, restyled · mockup: `screens/settings.html#c-settings-delete-refused`
- Purpose: The server did not accept, so nothing was deleted.
- Primary action: Try again later.
- Taps / target: 1 tap.
- Rules held: Calm, nothing lost.
- Notes: Copy is refusal.erase. A failure to clear the phone is refusal.eraseLocal.
- Copy on screen (en): "Are you sure?" · "Saved" · "Could not do that" · "The server did not accept the request, so nothing was deleted. Try again later." · "Everything in your shop book is deleted: every day, every entry, and every name you have recorded." · "The book on this phone is deleted as soon as our server accepts the request." · "You are still owed money that this book is the only record of." · "Keep my book" · "Delete everything"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `refusal.titleNotDone`, `refusal.erase`, `s8.title`, `sync.saved`, `common.back`, `s7.what`, `s8.phoneNow`, `s8.owed`, `s8.cancel`, `s8.confirm`

### Delete: sign in again first

- Route: `S8` · exists today, restyled · mockup: `screens/settings.html#c-settings-delete-signin`
- Purpose: His sign-in expired, so nothing was deleted.
- Primary action: Sign in again, then delete.
- Taps / target: 1 tap to sign in.
- Rules held: Nothing deleted; the way forward is stated.
- Notes: Copy is refusal.eraseSignIn. A sign-in button here is proposed; today the text only.
- Copy on screen (en): "Are you sure?" · "Saved" · "Could not do that" · "Your sign-in has expired, so nothing was deleted. Sign in again, then delete." · "Everything in your shop book is deleted: every day, every entry, and every name you have recorded." · "The book on this phone is deleted as soon as our server accepts the request." · "You are still owed money that this book is the only record of." · "Keep my book" · "Delete everything"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `refusal.titleNotDone`, `refusal.eraseSignIn`, `s8.title`, `sync.saved`, `common.back`, `s7.what`, `s8.phoneNow`, `s8.owed`, `s8.cancel`, `s8.confirm`

### Are you sure? (not signed in)

- Route: `S8` · exists today, restyled · mockup: `screens/settings.html#c-settings-delete-local`
- Purpose: No session: only the book on this phone goes; the server account is untouched.
- Primary action: Keep my book vs Delete everything.
- Taps / target: 1 tap.
- Rules held: Says so before he presses (F-22).
- Notes: Copy s8.localOnly points to sign in or the web page in About.
- Copy on screen (en): "Are you sure?" · "Saved" · "Everything in your shop book is deleted: every day, every entry, and every name you have recorded." · "This phone is not signed in. Only the book on this phone is deleted - no account on our server is touched. To delete that too, sign in first, or use the web page listed in About." · "You are still owed money that this book is the only record of." · "Keep my book" · "Delete everything"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s8.title`, `sync.saved`, `common.back`, `s7.what`, `s8.localOnly`, `s8.owed`, `s8.cancel`, `s8.confirm`

### Deletion requested (30-day undo)

- Route: `S8` · exists today, restyled · mockup: `screens/settings.html#c-settings-delete-done`
- Purpose: Report what happened and the date the account is erased.
- Primary action: Done.
- Taps / target: 1 tap.
- Rules held: Undo is stated: signing in within 30 days cancels.
- Notes: As built, outcome kind scheduled. The date is the erasure date from the server; shown here as a specimen date, not a measured one.
- Copy on screen (en): "Deletion requested" · "Saved" · "Your account is deleted after 30 days. Sign in again any time before then to cancel." · "Erased on" · "2026-12-18" · "The book on this phone has been deleted now. Cancelling keeps your account on our server, but does not bring the book back to this phone." · "Done"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s8.scheduledTitle`, `sync.saved`, `common.back`, `s8.scheduled`, `s8.erasesOn`, `s8.phoneWiped`, `s8.done`

### Deleted from this phone

- Route: `S8` · exists today, restyled · mockup: `screens/settings.html#c-settings-delete-local-done`
- Purpose: The phone book is gone; no request went to the server.
- Primary action: Done.
- Taps / target: 1 tap.
- Rules held: Honest that the server was not told.
- Notes: Outcome kind local.
- Copy on screen (en): "Deleted from this phone" · "Saved" · "The book on this phone has been deleted. This did not send a deletion request to our server." · "Done"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s8.localTitle`, `sync.saved`, `common.back`, `s8.localDone`, `s8.done`

### About this app

- Route: `S5` · exists today, restyled · mockup: `screens/settings.html#c-settings-about`
- Purpose: Version, legal links, the not-a-tax-document line and the web delete page.
- Primary action: Open (each link row).
- Taps / target: 1 tap per link.
- Rules held: Not-tax statement is its own block. Web delete address shown in full so it can be read out.
- Notes: The address below is a placeholder, not the real origin: the real value is passed in as deleteAccountUrl and I could not read it from code. Version is shown only when known.
- Copy on screen (en): "About this app" · "Saved" · "Version" · "0.0.0 (placeholder)" · "Privacy policy" · "Open" · "Terms of service" · "Open-source licences" · "This is a record of entries made in your shop book. It is not a tax document." · "You can also delete your account from the web:" · "https://[API origin]/delete-account/"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s5.title`, `sync.saved`, `common.back`, `s5.version`, `s5.privacy`, `settings.open`, `s5.terms`, `s5.licences`, `s5.notTax`, `s5.webDelete`

### Help and contact: grievance officer not published

- Route: `S6` · changed from the app today · mockup: `screens/settings.html#c-settings-help-pending`
- Purpose: Be honest that no officer is named yet, and give a next route.
- Primary action: Use the web account page for requests.
- Taps / target: 1 tap.
- Rules held: Never show a contact the app has not been given. DPDP needs a named officer: blocked on a human item (HUMAN-ACTIONS).
- Notes: As built: s6.pending only. The next-route row is proposed, and uses the real web page, not an invented address.
- **For Saket's review:** Blocked until the grievance officer is named and published; the next-route row is a proposal.
- Copy on screen (en): "Help and contact" · "Saved" · "Grievance officer" · "Not yet published. This app will not show a contact it has not been given." · "Request help or deletion on the web" · "Opens the privacy page"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s6.title`, `sync.saved`, `common.back`, `s6.grievance`, `s6.pending`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Request help or deletion on the web" · "Opens the privacy page"

### Help and contact: officer published (SPECIMEN)

- Route: `S6` · exists today, restyled · mockup: `screens/settings.html#c-settings-help-published`
- Purpose: How it will look once a name and address are supplied.
- Primary action: Select the address to copy or write to it.
- Taps / target: 1 tap.
- Rules held: SPECIMEN ONLY: the name and address are made up for layout and must never ship.
- Notes: A long address is one unbreakable word: it wraps inside the card (flexShrink as built).
- Copy on screen (en): "Help and contact" · "Saved" · "SPECIMEN, not a real contact" · "Grievance officer" · "Officer name (specimen)" · "officer-name@example.invalid"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s6.title`, `sync.saved`, `common.back`, `s6.grievance`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "SPECIMEN, not a real contact"

### Log out: everything saved

- Route: `A8` · exists today, restyled · mockup: `screens/settings.html#c-settings-logout`
- Purpose: Confirm log out and say what signing back in needs.
- Primary action: Stay signed in and Log out have equal size.
- Taps / target: 2 taps to log out.
- Rules held: No confirm-shaming; the safe option is first and plain.
- Notes: a8.body says a new SMS code is needed. Both buttons are equal weight.
- Copy on screen (en): "Log out?" · "Saved" · "Log out of Subhadra Kirana?" · "Signing back in needs a new SMS code to +91 98765 43210." · "Everything is saved. Nothing will be lost." · "Stay signed in" · "Log out"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a8.bar`, `sync.saved`, `common.back`, `a8.title`, `a8.body`, `a8.saved`, `a8.stay`, `a8.logout`

### Log out: entries not yet synced

- Route: `A8` · exists today, restyled · mockup: `screens/settings.html#c-settings-logout-pending`
- Purpose: Warn that entries are still waiting and where they stay.
- Primary action: Stay signed in (first).
- Taps / target: 1 tap to stay.
- Rules held: Amber icon plus words, not red; nothing is lost.
- Notes: a8.pending (n entries) and a8.pendingOne are the two real wordings; 3 is shown.
- Copy on screen (en): "Log out?" · "3 waiting · safe on phone" · "Log out of Subhadra Kirana?" · "Signing back in needs a new SMS code to +91 98765 43210." · "3 entries not yet synced — they stay on this phone and upload when you sign in again with this number." · "Stay signed in" · "Log out"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `a8.bar`, `sync.waiting`, `common.back`, `a8.title`, `a8.body`, `a8.pending`, `a8.stay`, `a8.logout`

### App lock cover

- Route: `S11` · exists today, restyled · mockup: `screens/settings.html#c-settings-lock`
- Purpose: The book is hidden until the phone lock is passed.
- Primary action: Unlock.
- Taps / target: 1 tap, then the phone lock.
- Rules held: No figures behind the cover; the lock is the phone's own.
- Notes: Free for everyone (security is not behind a paywall).
- Copy on screen (en): "SWAFTO is locked" · "Your shop book is hidden. Unlock with your phone lock to continue." · "Unlock"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s11.body`, `s11.unlock`, `s11.title`

### App lock paused (no phone lock now)

- Route: `S11` · exists today, restyled · mockup: `screens/settings.html#c-settings-lock-paused`
- Purpose: The phone lost its screen lock, so the app lock is paused and the book opens.
- Primary action: Set a screen lock in the phone settings.
- Taps / target: 0 in app.
- Rules held: The pause is stated, never silent.
- Notes: Copy s11.paused; it appears over the app, here on the hub.
- Copy on screen (en): "Settings" · "Saved" · "Your shop" · "Subhadra Kirana" · "Language and screen" · "Entries for your accountant" · "Your data" · "App lock" · "Off" · "Account" · "Your account" · "+91 98765 43210" · "Signed-in phones" · "Sign out a lost phone" · "Log out" · "Legal and help" · "Privacy and consent" · "About this app" · "Help and contact" · "Danger zone" · "Delete this account" · "Deletes your book. You can undo for 30 days." · "App lock is paused: this phone has no screen lock now. Set one in the phone settings to use it again."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `s11.paused`, `s1.appLock`, `s1.appLockOff`, `a8.logout`, `s1.title`, `sync.saved`, `common.back`, `s1.shop`, `s1.language`, `s1.export`, `s1.privacy`, `s1.about`, `s1.help`, `s1.deleteAccount`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Your account" · "Signed-in phones" · "Sign out a lost phone" · "Off" · "Your shop" · "Your data" · "Account" · "Legal and help" · "Danger zone" · "Deletes your book. You can undo for 30 days."

### Signed-in phones

- Route: `NEW` · **NEW screen (not in the app today)** · mockup: `screens/settings.html#c-settings-devices`
- Purpose: See which phones are signed in and sign out a lost one.
- Primary action: Sign out a phone.
- Taps / target: 3 taps: Settings, Signed-in phones, Sign out.
- Rules held: This phone is marked in words; only phones of this shop are listed (shop from the session).
- Notes: API: POST /v1/auth/devices/:id/revoke exists and checks the shop. GET /v1/devices exists but returns 501 until the repo implements listDevices, which nothing does yet. The only description a device has is its platform (no label), so rows read "Android phone".
- **For Saket's review:** Needs backend work: implement listDevices in the repo and add a device label; revoke is ready.
- Copy on screen (en): "Signed-in phones" · "Saved" · "Phones that can open this shop book. Sign out one you no longer have." · "Android phone" · "Last used: now" · "This phone" · "Last used: 12 days ago" · "Sign out this phone"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `sync.saved`, `common.back`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Signed-in phones" · "Phones that can open this shop book. Sign out one you no longer have." · "Android phone" · "Last used: now" · "This phone" · "Last used: 12 days ago" · "Sign out this phone"

### Sign out a phone: confirm

- Route: `NEW` · **NEW screen (not in the app today)** · mockup: `screens/settings.html#c-settings-devices-confirm`
- Purpose: Confirm signing out the other phone.
- Primary action: Sign out that phone and Keep it signed in, equal weight.
- Taps / target: 1 tap to confirm.
- Rules held: Says what happens and how to undo: that phone needs a new SMS code to come back. A refresh-token reuse already revokes a device server-side.
- Notes: Entries on that phone not yet synced stay there; say so in a final copy pass.
- Copy on screen (en): "Signed-in phones" · "Saved" · "Android phone" · "Last used: now" · "This phone" · "Last used: 12 days ago" · "Sign out this phone" · "Sign out that phone?" · "It will need a new SMS code to open this book again. Entries already saved are not removed." · "Keep it signed in" · "Sign out that phone"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `sync.saved`, `common.back`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Signed-in phones" · "Android phone" · "Last used: now" · "This phone" · "Last used: 12 days ago" · "Sign out this phone" · "Sign out that phone?" · "It will need a new SMS code to open this book again. Entries already saved are not removed." · "Keep it signed in" · "Sign out that phone"

### Signed-in phones: signed out

- Route: `NEW` · **NEW screen (not in the app today)** · mockup: `screens/settings.html#c-settings-devices-done`
- Purpose: Confirm the lost phone is out.
- Primary action: None.
- Taps / target: 0.
- Rules held: Status in icon plus words.
- Notes: Only this phone remains in the list.
- Copy on screen (en): "Signed-in phones" · "Saved" · "Android phone" · "Last used: now" · "This phone" · "That phone is signed out"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `sync.saved`, `common.back`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Signed-in phones" · "Android phone" · "Last used: now" · "This phone" · "That phone is signed out"

### Signed-in phones: cannot load

- Route: `NEW` · **NEW screen (not in the app today)** · mockup: `screens/settings.html#c-settings-devices-unavailable`
- Purpose: The list cannot be fetched (offline, or the server cannot list yet).
- Primary action: Try again.
- Taps / target: 1 tap.
- Rules held: Calm, one next step, no list drawn rather than a guessed one.
- Notes: Today the API answers 501 here, which would land in this frame.
- Copy on screen (en): "Signed-in phones" · "Offline" · "Could not do that" · "The list of phones could not be loaded. Try again with signal." · "Try again"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `common.back`, `refusal.titleNotDone`, `common.retry`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Signed-in phones" · "Offline" · "The list of phones could not be loaded. Try again with signal."

## Area: System (13 screen states)

Cross-cutting states no single screen owns: the crash screen, the refusal banner and every refusal sentence, the sync chip states, the hardware Back from Today, the generic list states every list shares, and the day close at 2.0x text size. The Locked app cover is drawn in the Settings area. No string exists in the app for an app update or low storage, so neither is drawn (not invented).

### Crash screen: language known

- Route: `overlay` · exists today, restyled · mockup: `screens/system.html#c-system-crash-known`
- Purpose: An uncaught render error. Say calmly that the entries are safe and give one way forward. Shown in the shop's own language when the app can still tell which it is.
- Primary action: Restart (one button; remounts the app under a fresh key and reopens the database, no native restart).
- Taps / target: 1 tap.
- Rules held: Full screen, no tabs, no header, no technical detail: the error class name only goes to a redacting sink and is never shown. "Your entries are safe" is true: the ledger is in SQLite and nothing on this screen touches it.
- Notes: As built (ErrorBoundary.tsx): title, body, one accent button, vertically centred. Only the pictogram disc is added in Mitra. If Restart fails twice the same screen returns; nothing else is offered.
- Copy on screen (en): "Something went wrong" · "Your entries are safe on this phone. Please restart the app." · "Restart"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `crash.title`, `crash.body`, `crash.restart`

### Crash screen: language unknown (all three stacked)

- Route: `overlay` · exists today, restyled · mockup: `screens/system.html#c-system-crash-unknown`
- Purpose: The failure was building the app itself, so the shop's language cannot be read. Show English, Hindi and Odia together rather than guess one.
- Primary action: Restart (one button whose label joins the three words with a slash).
- Taps / target: 1 tap.
- Rules held: No guessing a language. One button, not three. Order as built: English, Hindi, Odia.
- Notes: Always three blocks in that order, whatever the language toggle on this page says (the other frames follow the toggle). At 2.0x the blocks scroll; the button is below them, so it sits under the fold on a small phone: proposal to pin the Restart button to the bottom (not done, changes the layout).
- **For Saket's review:** Proposal: pin Restart to the bottom of the crash screen so it stays reachable at 2.0x when three languages are stacked.
- Copy on screen (en): "Something went wrong" · "Your entries are safe on this phone. Please restart the app." · "कुछ गड़बड़ हो गई" · "आपकी एंट्री इस फ़ोन में सुरक्षित हैं। कृपया ऐप दोबारा शुरू करें।" · "କିଛି ଗୋଟିଏ ଭୁଲ ହୋଇଗଲା" · "ଆପଣଙ୍କ ଏଣ୍ଟ୍ରି ଏହି ଫୋନରେ ସୁରକ୍ଷିତ ଅଛି। ଦୟାକରି ଆପ୍ ପୁଣି ଆରମ୍ଭ କରନ୍ତୁ।" · "Restart / दोबारा शुरू करें / ପୁଣି ଆରମ୍ଭ କରନ୍ତୁ"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `crash.title`, `crash.body`, `crash.restart`

### Refusal banner: "Not saved" over a form

- Route: `overlay` · changed from the app today · mockup: `screens/system.html#c-system-refusal-save`
- Purpose: A write was refused (here a Rs 0 sale). The banner is drawn once over whichever screen is up, so no screen can forget to say it.
- Primary action: None needed. Tap the banner to dismiss; the next tap on the form dismisses it too.
- Taps / target: Add (1 tap) shows it; nothing to do to continue.
- Rules held: Shown only after a tap, never before one, and cleared when the form closes so it never leaks into the next form. Headed "Not saved" because a save was attempted. Starts after the Back button (HT-53) and sits above the header (QA-10), so Back is never covered. Rs 0 is refused (QA-04).
- Notes: Real banner has a red outline and bold red title. Here the outline is the "alert" edge and the heading is words; status is not colour alone because the heading and sentence carry it. A warn icon is not in the app today; kept off to match the build.
- Copy on screen (en): "Sale" · "Saved" · "Cash sales" · "UPI sales" · "Credit sales" · "Add" · "1" · "2" · "3" · "4" · "5" · "6" · "7" · "8" · "9" · "Clear" · "0" · "Not saved" · "An amount of ₹0 is not saved. If there is nothing to enter, tap "Nothing to enter" on the day-close list."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `act.sale`, `sync.saved`, `common.back`, `section.cash_sales`, `section.upi_sales`, `section.udhar_sales`, `common.add`, `keypad.clear`, `keypad.delete`, `refusal.title`, `refusal.amountZero`

### Refusal banner: "Could not do that" (nothing was being saved)

- Route: `overlay` · exists today, restyled · mockup: `screens/system.html#c-system-refusal-notsave`
- Purpose: A refusal where nothing was being saved (a reminder, a share, a link, a deletion, a sign-in). Headed "Could not do that" so it does not read as lost data.
- Primary action: None. Tap to dismiss.
- Taps / target: 1 tap on Remind shows it.
- Rules held: HT-43/HT-54: a not-a-save refusal never says "Not saved". The list of such refusals is explicit in App.tsx (NOT_A_SAVE) rather than inverted, so a save refusal left off the list keeps "Not saved". Neutral outline for this kind.
- Notes: Example: Remind with no phone number saved on the customer (refusal.noPhone).
- Copy on screen (en): "Ramesh" · "Saved" · "In the box now" · "Opening" · "cash in" · "+" · "cash out" · "-" · "Remind on WhatsApp" · "Opens your WhatsApp with a polite message. You press send." · "Could not do that" · "This customer has no phone number saved, so WhatsApp cannot be opened for them. Add the number on this page."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `sync.saved`, `common.back`, `box.title`, `box.opening`, `box.in`, `box.out`, `p2.remind`, `p2.remindNote`, `refusal.titleNotDone`, `refusal.noPhone`

### Refusal sentences: every key, grouped by cause

- Route: `catalogue` · **NEW screen (not in the app today)** · mockup: `screens/system.html#c-system-refusal-catalogue`
- Purpose: A review list, not a screen the shopkeeper sees. Every refusal sentence the banner can say, grouped by what went wrong, with the heading the real banner puts above it. Shown in the language selected on this page.
- Primary action: None (legend).
- Taps / target: n/a
- Rules held: Each sentence says what did not happen and the next step. "Nothing is lost" appears where data is in doubt. refusal.other is the fallback for any field without a mapping. refusal.itemOverSale is shown with an amount ("Left to record") beside it, drawn as text here.
- Notes: Group headings are the legend's own labels (documentation, not app copy). party.refusal.*, x1.refusal.shopName and t3.banner are borrowed from their own screens by REFUSAL_HINT. t3.banner is the sentence for both dayClosed and dayClosedOpen (the latter headed "Could not do that"); the "Not saved" label on it here is for dayClosed.
- **For Saket's review:** dayClosed (an entry added on a frozen day) is headed "Not saved" but nothing was being saved the way a reminder is; Saket to decide whether it joins the NOT_A_SAVE list like dayClosedOpen.
- Copy on screen (en): "Not saved" · "Missing or wrong input" · "Type an amount first." · "An amount of ₹0 is not saved. If there is nothing to enter, tap "Nothing to enter" on the day-close list." · "One entry can be at most ₹1 crore. Check the digits." · "Choose the person first." · "Type the name first." · "A mobile number is 10 digits, starting 6, 7, 8 or 9. Or leave it empty." · "Type the shop name first." · "The limit was not saved. Type an amount above zero." · "That item is already on your list." · "That is more than what is left of the sale. Left to record:" · "The day does not allow it" · "Today is closed. Post a correction instead." · "Could not do that" · "This book is still open for an earlier day. Close it to start today." · "Today's book was already closed earlier, while the phone's date was wrong. New entries can start again tomorrow." · "This phone's date looks wrong. Your book is ahead of today. Nothing is lost. Check the phone's date and time." · "No signal or the server said no" · "Could not reach the server, so your choice was not changed. Try again with signal." · "Could not reach the server, so what you agreed to cannot be shown. Try again with signal." · "The server did not accept the request, so nothing was deleted. Try again later." · "No connection, so nothing was deleted - not on this phone and not on our server. Try again with signal." · "Your sign-in has expired, so nothing was deleted. Sign in again, then delete." · "The book on this phone could not be cleared, so it is still here. Press Delete everything again." · "The book on this phone belongs to a different number, so you were not signed in. Sign in with that number." · "Nothing to send or open" · "This customer has no phone number saved, so WhatsApp cannot be opened for them. Add the number on this page." · "Nothing is due from this customer, so there is nothing to remind." · "The share could not be opened. Nothing was sent." · "This page could not be opened. Check that a web browser is installed." · "Fallback" · "Nothing was recorded. Check and try again."
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `refusal.title`, `common.back`, `refusal.amount`, `refusal.amountZero`, `refusal.amountTooLarge`, `refusal.partyId`, `party.refusal.name`, `party.refusal.phone`, `x1.refusal.shopName`, `refusal.creditLimit`, `refusal.itemDuplicate`, `refusal.itemOverSale`, `t3.banner`, `refusal.dayStale`, `refusal.titleNotDone`, `refusal.dayClosedWrongDate`, `refusal.dayFuture`, `refusal.consent`, `refusal.consentRead`, `refusal.erase`, `refusal.eraseOffline`, `refusal.eraseSignIn`, `refusal.eraseLocal`, `refusal.wrongShop`, `refusal.noPhone`, `refusal.nothingDue`, `refusal.share`, `refusal.openUrl`, `refusal.other`

### Sync chip in every header: saved, waiting, parked rows

- Route: `overlay` · changed from the app today · mockup: `screens/system.html#c-system-sync-states`
- Purpose: The one persistent answer to "is my work safe?". Four header states stacked: saved, waiting (also what offline looks like), waiting with rows parked, and parked only.
- Primary action: Tap the chip to read the explanation (see next frame).
- Taps / target: 1 tap to open the explanation.
- Rules held: Amber with a clock and words, never red; a tick and "Saved" when empty. Words are the same in every header (USABILITY item 8). The app has no separate "offline" state: it shows the waiting count, since the queue drains by itself when signal returns.
- Notes: Top to bottom: sync.saved; sync.waiting with n=3; waiting n=3 plus " - t1.parked" with n=1; parked n=1 with nothing waiting. Parked rows are those the server refused (FE-11). The long forms (sync.savedLong, sync.waitingLong) are the spoken labels in the app. In the real chip the parked words are appended to the same pill; here the long pill wraps onto two lines at 17 sp. The kit's "Offline" chip (K.N) is not used: no such string exists in the app.
- **For Saket's review:** Proposal: the parked words become a second, tappable line under the chip so the pill stays short at 2.0x.
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "Saved" · "3 waiting · safe on phone" · "3 waiting · safe on phone · 1 could not be sent - contact us" · "1 could not be sent - contact us"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `sync.waiting`, `sync.saved`, `t1.day.4`, `t1.month.11`, `t1.parked`

### Sync chip tapped: what "waiting" means

- Route: `overlay` · **NEW screen (not in the app today)** · mockup: `screens/system.html#c-system-sync-sheet`
- Purpose: Explain the chip in a sentence: safe on this phone, goes when the network is back. Names the parked rows and offers a contact route.
- Primary action: Back (close the sheet). Parked rows: contact us, opened from the same sheet.
- Taps / target: 1 tap to open, 1 to close.
- Rules held: No alarm: no red, no countdown. Nothing is lost and the sheet says so. The chip itself is only information; this sheet adds nothing to do except contact for parked rows.
- Notes: The app speaks sync.waitingLong as the chip's accessible name today; a tap does nothing visible. This frame makes the same sentence visible. Contact action text is not drawn because no contact string exists beside t1.parked.
- **For Saket's review:** New behaviour: the chip opens a sheet with its long sentence. Decide whether it is worth a tap target or stays an accessible label only.
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "3 waiting · safe on phone" · "Sale" · "Udhar sale" · "Collect" · "Expense" · "More" · "In the box now" · "Opening" · "cash in" · "+" · "cash out" · "-" · "Today" · "Ledger" · "Reports" · "3 waiting to send. Safe on this phone; it goes when the network is back." · "1 could not be sent - contact us"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `sync.waiting`, `t1.day.4`, `t1.month.11`, `act.sale`, `act.credit`, `act.collect`, `act.expense`, `t1.more`, `box.title`, `box.opening`, `box.in`, `box.out`, `nav.today`, `nav.parties`, `nav.reports`, `sync.waitingLong`, `t1.parked`

### Hardware Back from Today: leave the app?

- Route: `overlay` · **NEW screen (not in the app today)** · mockup: `screens/system.html#c-system-back-exit`
- Purpose: On Today a system Back leaves the app with no question (Session.back returns false and Android finishes the activity). A mid-task Back is safe, a Back from Today is an easy accident.
- Primary action: Stay and Exit have equal weight; neither is pre-selected.
- Taps / target: 1 tap either way.
- Rules held: No confirm-shaming; equal visual weight. Nothing is lost on Exit: entries are saved on the phone. Shown only from Today and from the screens before an account, never from a form (there Back goes to the parent screen as built).
- Notes: As built: Root.tsx hardwareBackPress calls host.session.back(); true consumes the press, false lets Android leave. The dialog needs a native hook (a confirm step before returning false). The three words are new strings.
- **For Saket's review:** USABILITY proposal, not in the app: confirm before a Back from Today leaves the app. Needs Saket's decision and a Root.tsx change.
- Copy on screen (en): "Subhadra Kirana" · "Thursday 19 November" · "Saved" · "Sale" · "Udhar sale" · "Collect" · "Expense" · "More" · "In the box now" · "Opening" · "cash in" · "+" · "cash out" · "-" · "Today" · "Ledger" · "Reports" · "Exit the app?" · "Your entries stay safe on this phone." · "Stay" · "Exit"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t1.day.4`, `t1.month.11`, `sync.saved`, `act.sale`, `act.credit`, `act.collect`, `act.expense`, `t1.more`, `box.title`, `box.opening`, `box.in`, `box.out`, `nav.today`, `nav.parties`, `nav.reports`
- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** "Exit the app?" · "Your entries stay safe on this phone." · "Stay" · "Exit"

### Any list: empty, with a next step

- Route: `overlay` · exists today, restyled · mockup: `screens/system.html#c-system-list-empty`
- Purpose: The empty state every list shares. It always offers the action that fills the list.
- Primary action: Add.
- Taps / target: 1 tap to the add form.
- Rules held: Never "nothing here yet" alone (CLAUDE.md brief): the line is paired with a button. Icon disc plus words; no colour-only cue.
- Notes: Each real list has its own empty sentence (for example p1.empty); common.empty is the generic one. The CTA here uses common.add.
- Copy on screen (en): "Ledger" · "Saved" · "Nothing here yet" · "Add" · "Today" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `nav.parties`, `sync.saved`, `common.empty`, `common.add`, `nav.today`, `nav.reports`

### Any list: loading

- Route: `overlay` · exists today, restyled · mockup: `screens/system.html#c-system-list-loading`
- Purpose: The list is opening from the phone's own database. Placeholder rows, no spinner and no message.
- Primary action: None; waits (normally well under a second).
- Taps / target: n/a
- Rules held: Skeleton rows the height of real rows so nothing jumps. common.loading is the accessible name only.
- Notes: The visible sentence would be the word "Opening"; the app uses it for the screen reader.
- Copy on screen (en): "Ledger" · "Saved" · "Today" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `nav.parties`, `sync.saved`, `common.loading`, `nav.today`, `nav.reports`

### Any list: could not open

- Route: `overlay` · exists today, restyled · mockup: `screens/system.html#c-system-list-error`
- Purpose: The list failed to open. Calm, says nothing is lost, one next step.
- Primary action: Try again.
- Taps / target: 1 tap.
- Rules held: common.error says "Nothing you entered is lost". Icon plus words. The same sentence is drawn once, in the empty block; the banner above it is dropped here so the sentence is not said twice.
- Notes: If Try again fails repeatedly the crash screen is the next stop (frames above).
- Copy on screen (en): "Ledger" · "Saved" · "Could not open this. Nothing you entered is lost." · "Try again" · "Today" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `nav.parties`, `sync.saved`, `common.error`, `common.retry`, `nav.today`, `nav.reports`

### Any list: offline, rows waiting to send

- Route: `overlay` · changed from the app today · mockup: `screens/system.html#c-system-list-offline`
- Purpose: The list works on the phone without network. The chip and one line say what is waiting.
- Primary action: Use the list as normal.
- Taps / target: No extra step because of the network.
- Rules held: D2 untouched: balances shown are derived from entries on the phone. Chip amber with a clock. Never red.
- Notes: Balances here are demo figures; the state word is the real t1.toCollect label.
- Copy on screen (en): "Ledger" · "3 waiting · safe on phone" · "3 waiting to send. Safe on this phone; it goes when the network is back." · "R" · "Ramesh" · "Udhar to collect" · "S" · "Sunita" · "B" · "Bijay" · "Today" · "Reports"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `nav.parties`, `sync.saved`, `sync.waiting`, `sync.waitingLong`, `t1.toCollect`, `nav.today`, `nav.reports`

### Day close at 2.0x text size

- Route: `T5` · exists today, restyled · mockup: `screens/system.html#c-system-close-2x`
- Purpose: Show reflow at the largest system text size. Body text doubles; the header and tab bar stop at 1.5x (chrome cap) so navigation cannot eat the content.
- Primary action: The next row (Enter UPI sales).
- Taps / target: 1 tap on the next row; it is on screen without scrolling.
- Rules held: Do not shrink anything: rows grow and stack, the progress bar stays full width, the skip button drops under its label (wraps) instead of squeezing it. Touch targets stay at least 56 dp.
- Notes: This frame forces 2.0x for itself whatever the page toggle says (the page also has a 2.0x toggle that scales every other frame). The rows are drawn from the kit: the real day-close list (T5) was not re-read for this frame, so section order and the skip control are approximate. The progress is the bar form used in Mitra, not a ring. A keypad form at 2.0x is not drawn separately: toggle 2.0x on the page and open any form frame.
- Copy on screen (en): "#fr-system-close-2x .row{flex-wrap:wrap}#fr-system-close-2x .row .quiet{flex-basis:100%}" · "Day close" · "Saved" · "4 of 10 done" · "Cash sales" · "5" · "Enter UPI sales" · "Nothing to enter" · "6" · "Credit sales" · "Cash check" · "After the cash check"
- String keys (Odia and Hindi are DRAFT per H13, unreviewed): `t5.title`, `sync.saved`, `common.back`, `t5.done`, `section.cash_sales`, `section.upi_sales`, `t5.next`, `t5.skip`, `section.udhar_sales`, `t5.cashCheck`, `t5.closeLocked`

## Roll-up generated from the specs

- Screen states: **219** (onboarding 29, today 11, sales 30, money 30, close 17, ledger 23, reports 30, settings 36, system 13).
- Copy gaps, English only, no string key yet (62): "No account without this" · "SWAFTO cannot keep a book for you without the first item. Nothing has been sent or saved. You can come back any time." · "Choose language again" · "Preview" · "Normal" · "Large" · "Extra large" · "Open date settings" · "Return" · "Adjustment" · "Choose an answer above to close the day." · "Closing the day" · "This person paid more than was owed. The extra is an advance you hold for them. It is not udhar to collect." · "WhatsApp opens here, outside the app" · "Change mobile number" · "You hold this for them. They paid more than they owed. Nothing is due from them." · "The original stays in the book. A correction is added as a new entry with today's date that points to it." · "This entry" · "Removing the limit only stops the warning. No entry changes. You can set a limit again at any time." · "Each day you close brings these readings closer." · "Item cards appear here (drawn in the items area)." · "Choose a month. The phone makes a file of that month's entries and every party's balance, one you can open in a spreadsheet, and opens the share sheet. Nothing is sent to our server." · "Your account" · "Signed-in phones" · "Sign out a lost phone" · "Off" · "Your shop" · "Your data" · "Account" · "Legal and help" · "Danger zone" · "Deletes your book. You can undo for 30 days." · "Chosen" · "Day now starts at 03:00" · "On" · "Turned off. This takes effect now." · "This is a copy of everything we hold about you: your number, shop name, every entry and every party." · "Download everything we hold" · "To correct something, add a dated correction on the day. To erase it all, use Delete this account." · "Offline" · "No connection, so nothing was downloaded. Try again with signal." · "Take a copy of my data first" · "Deleting" · "Request help or deletion on the web" · "Opens the privacy page" · "SPECIMEN, not a real contact" · "Phones that can open this shop book. Sign out one you no longer have." · "Android phone" · "Last used: now" · "This phone" · "Last used: 12 days ago" · "Sign out this phone" · "Sign out that phone?" · "It will need a new SMS code to open this book again. Entries already saved are not removed." · "Keep it signed in" · "Sign out that phone" · "That phone is signed out" · "The list of phones could not be loaded. Try again with signal." · "Exit the app?" · "Your entries stay safe on this phone." · "Stay" · "Exit".

### Items flagged for Saket's review

- Consent notice (sign-up): nothing pre-ticked: The notice has no link to the full privacy page or the grievance officer; add one row once the officer is published (human item).
- Consent notice: he does not want to agree: Decide whether to add a visible "I do not agree" action on X0 (today only Back refuses).
- Consent: server not reached: Confirm where the sign-up consent failure should appear: on A4 (as built) or back on X0.
- Shop setup: text size choice with live preview (proposal): Decide whether to split text size from dark mode (needs tokens.ts change) and approve the labels.
- Sale: just saved: Saved line replaces the total line for one moment instead of sitting above it, to keep the keypad on screen at 1.0x.
- Return or exchange: no sale yet: Added a Go to Sale button on the empty state so it is not a dead end.
- Items in a sale: free plan, locked: Added a "Your plan" row (S10) to the locked state; the app offers no button there.
- Items in a sale: no sales yet today: Added a Go to Sale button on the empty state.
- Your items: free plan, locked: Added a "Your plan" row (S10) on the locked state.
- Collect: more than they owe (QA-03 confirm): Proposal: replace the inline card with this dialog, and give "No, go back" the same weight as "Record as advance".
- Adjustment: day is closed (no controls that would only throw): Proposal: add the lock banner and a "Post a correction" button to this frozen view (the app shows disabled rows only).
- Correction: choose the entry that was short: Proposal: show mode and time on each picker row (the app shows section and amount only).
- Day close list: an earlier day still open (labelled with its date): Proposal: repeat the stale-day sentence at the top of T5 so the old date is unmissable.
- Cash check: Save tapped with no count (QA-08): Proposal: greyed Save explains itself on tap (QA-08).
- Closing the day: in progress: Not in the app today (close is instant); say if you want a busy state or none.
- Ledger: customers, most owed first: The 31+ days tag needs the credit date in the store (built code says it has none); and Customers/Suppliers as a segment replaces two stacked cards.
- Add customer: name and phone: Add-customer from the Ledger tab is new; today it is reachable only from a picker inside a sale or collection.
- Customer: balance, one Collect button, history: Mode and time on each history row, and tappable rows leading to a correction, are additions to the built P2.
- Customer: no phone saved, add one: Editing a saved number is not possible in the built app; proposed here.
- Customer: nothing owed, reminder refused: Keeping the reminder row visible when nothing is due, to show refusal.nothingDue, differs from the built P2.
- Customer: no entries yet: Primary button switches to New udhar sale when the history is empty.
- Customer: correcting an entry (new dated entry): A correction route starting from a party's history row does not exist today.
- Supplier: what you owe, Pay supplier, history: P3 headline changes from today's change to the balance owed.
- Reports: before the first close: Adds a Continue day close button to the empty Reports state; R1.tsx today shows only the sentence and Ask.
- Reports: first week, too few closed days: Two additions beyond R1.tsx: a progress bar under each gate sentence and one "what moves this" line; both need Saket's yes.
- Reports: a normal month (what happened): Prints a minus on out-flow rows (expenses, purchases, taken home) in the report cards; the app draws them unsigned today.
- Dashboard: nothing closed yet: Adds a Continue day close button to the M1 empty state.
- Entries for your accountant: pick a month: Replaces the word "CSV" in the explanation with plain words; od/hi for the new sentence are for the native reviewer.
- Entries for your accountant: no entries yet: Adds a button to the empty state; the app shows s12.empty only.
- Your plan: Free, preview offered, buying not open: Beta users see Premium cards open while S10 says "You are on Free" and buying is closed; consider one plain line saying everything is free during beta.
- Settings: hub: Hub gains two rows (Your data, Signed-in phones) and group headings; confirm the order.
- Your shop: Day start as a list sheet rather than a 7-way segment: seven segments will not fit 360 px at 56 dp.
- Language and screen: Real display modes are two (Light, Dark bigger text); a three-step text size is a proposal that needs tokens work and copy.
- What you agreed to (manage): Removes the Save button in manage mode to meet DPDP withdrawal-as-easy-as-giving; USABILITY item "withdrawal needs switch plus Save".
- Your data (access and export): NEW screen needs a mobile caller for /v1/me/export and a file-share step; no backend work is needed.
- Delete this account: Adds "Take a copy of my data first" (links to Your data) so erasure is not the only route off this page.
- Help and contact: grievance officer not published: Blocked until the grievance officer is named and published; the next-route row is a proposal.
- Signed-in phones: Needs backend work: implement listDevices in the repo and add a device label; revoke is ready.
- Crash screen: language unknown (all three stacked): Proposal: pin Restart to the bottom of the crash screen so it stays reachable at 2.0x when three languages are stacked.
- Refusal sentences: every key, grouped by cause: dayClosed (an entry added on a frozen day) is headed "Not saved" but nothing was being saved the way a reminder is; Saket to decide whether it joins the NOT_A_SAVE list like dayClosedOpen.
- Sync chip in every header: saved, waiting, parked rows: Proposal: the parked words become a second, tappable line under the chip so the pill stays short at 2.0x.
- Sync chip tapped: what "waiting" means: New behaviour: the chip opens a sheet with its long sentence. Decide whether it is worth a tap target or stays an accessible label only.
- Hardware Back from Today: leave the app?: USABILITY proposal, not in the app: confirm before a Back from Today leaves the app. Needs Saket's decision and a Root.tsx change.

## Task speed: taps counted from the frames (targets are the founder's; seconds are NOT measured)

Counted by hand from the frames, assuming the user knows where the tile is. A tap is any touch, including each keypad digit. No time is claimed: the only honest figure available is the tap count, and "one tap is about one second" in USABILITY.md was the tester's estimate, not data. M3 (timed on the phone) and M4 (real shopkeepers) decide.

| Task | Target | Path in Mitra | Taps | v1 as built (USABILITY) | Where it could miss |
|---|---|---|---|---|---|
| Cash sale, 2-digit amount | under 10 s | Sale tile, 2 digits, Add | 4 | 5, with a scroll first | Add must be reachable one-handed: it is full width above the keypad. |
| Cash sale, 3-digit amount | under 10 s | Sale tile, 3 digits, Add | 5 | 6 to 7 | none expected |
| Next sale | under 10 s | Back lands on Today with scroll kept; same path | 4 to 5 | scroll repeated every sale | scroll restore must be built (item 2). |
| UPI sale | under 10 s | Sale tile, digits, UPI, Add | 5 to 6 | n/a | |
| Collect udhar, 3-digit | under 20 s | Collect tile, person row, person (balance is on the row), 3 digits, Add | 7 | 8 plus a stale error | +1 tap and a read if the amount is more than owed (QA-03 confirm, deliberate). |
| Owes-lookup, one person | under 10 s | Ledger tab: the list shows each balance, sorted by amount owed; open person for detail | 1 to read, 2 for detail | 1 to 3, no per-person balance on the list | |
| Owes-lookup from Today | under 10 s | tap "Udhar to collect" on Today (goes to the list) | 1 | shop total only | |
| Close the day, 6 empty sections (see `close.html`, quiet-day frames) | under 3 min | Continue day close, 6 x "Nothing today", Open cash check, count digits (5), Save, Close the day, Done | 15 (16 if the drawer is short; 23 with one recount; +1 to confirm UPI receipts) | 9 to reach the count, then count, Save, Close | The count is the long part; unknown real time. Difference case adds a reason tap and a recount option. |

Not a core task, but noted: there is no Pay tile on Today (it is a row in More), so Pay supplier is about 9 taps for a 4-digit amount (More, Pay supplier, supplier, digits, Add); udhar sale is 8 taps. Neither has a target. The tap counts in the money, sales and close areas are the designers' counts from the frames.

Close under 3 minutes is about reading and counting cash, not tapping; the design keeps the next step named on one sticky button so no step needs searching.

## Token map (reconcile with DESIGN-SYSTEM-V2.md when it lands)

`DESIGN-SYSTEM-V2.md` landed while this was being written. The mockups keep short CSS variable names (cheaper to read in a mockup); every one maps one-to-one to a V2 token below, and the hex values were checked equal against V2 section 1.1 (comfort and focus). Build uses the V2 names, not the mockup names.

| Mockup variable | V2 token | Comfort | Focus |
|---|---|---|---|
| `--bg` / `--surface` / `--raised` | `bg` / `surface` / `surfaceRaised` | #FFF6EA / #FFFFFF / #F6EADA | #1A1410 / #261E18 / #30261E |
| `--ink` / `--muted` / `--edge` / `--rule` | `ink` / `inkMuted` / `edge` / `border` | #2B2118 / #5E4E41 / #8A7560 / #E6D5BF | #F6EDE2 / #BFAF9E / #9C8A78 / #3E3126 |
| `--act` `--onact` `--sel` `--onsel` | `brand` `onBrand` `selected` `onSelected` | #0A6B66 / #FFFFFF | #4FC3BA / #10201F |
| `--hbg` `--hfg` | `header` `onHeader` | #0A6B66 / #FFFFFF | #261E18 / #F6EDE2 |
| `--pos` / `--neg` | `positive` / `negative` | #1E6B2E / #A3410C | #6FD48A / #F2A06A |
| `--waitbg` `--waitfg` | `tintGold` `warning` | #FFE9B8 / #6B4400 | #3A2E12 / #F2CF7A |
| `--t1` to `--t5` (bg / ic) | `tintSale`/`inkSale`, `tintUdhar`/`inkUdhar`, `tintCollect`/`inkCollect`, `tintExpense`/`inkExpense`, `tintMore`/`inkMore` | as C-mitra.html | as C-mitra.html |
| `--scrim` | `scrim` | rgba(43,33,24,.55) in the mockup; V2 is #2B211880 (about .50) | #000000B3 |
| radius 20 / 24 / pill | `lg` 20 / `xl` 24 / `pill` | | |
| type | 17 body, Anek Odia only; V2 section 1.3 owns sizes and leading (mockup uses 1.4 leading for Latin-digit money, the known M1 gap) | | |

Differences to reconcile: the mockup scrim opacity (.55 vs V2 .50, cosmetic); disabled tiles use a dashed `edge` rim with `inkMuted` on `surfaceRaised` (measured well above the AA minimum, from V2 1.2 pair "muted on raised"); the "info" banner uses `edge`, not the V2 `info` ink or `tintIndigo`, so a V2 review may prefer `tintIndigo` for informational banners and `tintRed` for the refused banner (the mockup draws refusals as a `negative` rim on `surface`). Neither changes any structure.

Contrast ratios for these pairs were measured in `concepts/C-mitra.html`; the new frames add no new colour pairs, except dashed-edge disabled tiles (`--muted` on `--raised`, measured well above the AA minimum) and the dark scrim.

## Cross-cutting decisions (so each frame does not repeat them)

- **Disabled is explained.** A greyed control carries a dashed edge, `aria-disabled`, and a visible reason (banner or line). Silent greyed tiles on a closed day were a USABILITY finding.
- **Refusals** appear only after a tap, never on opening a form, and are cleared when leaving the form (QA-07). They sit clear of the Back button.
- **Switches** are labelled with a tick or dash and words (Yes/No), never a bare coloured knob. Consent withdrawal is one tap and takes effect immediately.
- **Destructive steps** state what happens, how long the undo window is, and give Cancel equal weight.
- **No stored totals**: every figure in a frame is derived from the entries drawn in it.

## Open copy gaps and blocked items

The generated roll-up above lists every string with no key. All need Odia and Hindi drafts and a native reviewer (H13); nothing is marked reviewed. Human-blocked and not mine to close: H13 copy review; grievance-officer contact (shown as an honest not-published state); the real https address on About; Google Play and privacy-policy publication items in `docs/handover/HUMAN-ACTIONS.md`.

## Risks

- Mockups are expert design, not tested with shopkeepers; M4 may overturn any layout.
- The icon font is required by Mitra; DESIGN-SYSTEM-V2.md measures it at 9,184 bytes for 27 codepoints (APK delta not measured). The mockup draws more icon names than that (about 50 in `kit/kit.js` `ICO`, many added for settings, devices, ledger and offline). Either the glyph list grows (a few KB more, to be re-measured) or the extras are cut to the 27; the design-system lead and Saket should decide, and each cut icon keeps its word beside it so nothing depends on the picture. The mockup draws strokes at 2.4, V2 specifies 2.0 (daylight check on device).
- Five tint pairs times two modes are new tokens.
- Odia at 1.5x and 2.0x, conjunct clipping and tabular figures on the real phone are M3 checks; the browser render proves none of them.
- Items marked "For Saket's review" change structure or need backend, native or human work and must not be built without his decision.
