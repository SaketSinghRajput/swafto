/* AREA: Onboarding (A1 to A7, X0 in signup mode, X1, T6). Real screens: apps/mobile/src/screens/A1..A7.tsx, authParts.tsx, X0.tsx, X1.tsx, T6.tsx.
   Sign-in screens have no tabs. Copy is by literal key; a string that does not exist is K.N. */
(function () {
  var t = K.t, M = K.M;
  var PH = '98765 43210';

  function top(titleHtml, back, chip) { return K.top({ title: titleHtml, back: back, right: chip || '' }); }
  function phoneField(digits, o) {
    o = o || {};
    var f = digits.length > 5 ? digits.slice(0, 5) + ' ' + digits.slice(5) : digits;
    return '<div class="field"><div class="in' + (o.err ? ' err' : ' focus') + '"><b style="padding-right:10px;margin-right:10px;border-right:2px solid var(--edge);color:var(--muted)">+91</b>' +
      (digits ? '<b style="font-variant-numeric:tabular-nums">' + f + '</b>' : '<span class="ph" style="font-variant-numeric:tabular-nums">00000 00000</span>') + (o.err || o.busy ? '' : '<i class="caret"></i>') + '</div></div>';
  }
  function head(title, sub) { return '<div style="padding:12px 16px 0"><h2 style="margin:0;font-size:1.3em;line-height:1.3">' + title + '</h2>' + (sub ? '<p style="margin:6px 0 0;color:var(--muted);line-height:1.45">' + sub + '</p>' : '') + '</div>'; }
  function sub(html) { return '<p style="margin:0;padding:6px 16px;color:var(--muted);line-height:1.45">' + html + '</p>'; }
  function phoneFrame(digits, o) {
    o = o || {};
    var send = o.busy ? K.primary(t('a3.sending'), 'dis', '') : (digits.length === 10 && !o.err ? K.primary(t('a3.send'), '', 'chat') : K.primary(t('a3.send'), 'dis', 'chat'));
    return top(t('a3.bar'), true, o.chip) + K.scroll(
      sub(t('a3.step')), head(t('a3.bar'), t('a3.help', { digits: 6 })) + '<div style="height:8px"></div>'
    ) + K.sticky(
      phoneField(digits, { err: o.err, busy: o.busy }),
      o.err ? K.banner('', 'info', t('a3.notMobile')) : '',
      o.notice || '',
      o.busy ? '' : K.keypad(),
      send,
      K.quiet(t('a3.changed'))
    );
  }
  function codeFrame(digits, o) {
    o = o || {};
    return top(t('a4.bar'), true) + K.scroll(
      sub(t('a4.step')), head(t('a4.title')) + '<p style="margin:6px 0 0;padding:0 16px;color:var(--muted);line-height:1.45">' + t('a4.sentTo', { phone: '+91 ' + PH }) + '</p>' + K.stack(K.btn2(t('a4.edit'), 'pencil')),
      o.checking ? K.banner('info', 'clock', t('a4.checking')) : '',
      o.retry ? K.stack(K.primary(t('common.retry'), '', 'refresh')) : '',
      K.stack(K.btn2(t('a4.resend'), 'refresh') + (o.noCode ? K.btn2(t('a5.noCode.title'), 'info') : '') + K.btn2(t('a4.trouble'), 'phone'))
    ) + K.sticky(K.otp(digits, digits.length), o.notice || '', o.checking ? '' : K.keypad());
  }
  function problemCard(kind, icon, title, body, cta) {
    return top(t('a5.bar'), true) + K.scroll(
      '<div class="banner ' + kind + '" role="alert" style="margin:12px;align-items:flex-start">' + K.ico(icon, 28) + '<span><b>' + title + '</b><br>' + body + '</span></div>'
    ) + (cta ? K.sticky(cta) : '');
  }
  /* consent switch built locally: real X0 shows "Your choice: Yes/No" (consent.optional, consent.on/off) with the state also in an icon */
  function csw(on, text, required) {
    if (required) {
      return '<div style="margin:6px 12px;padding:12px 14px;background:var(--surface);border:2px solid var(--rule);border-radius:20px;line-height:1.45">' + text +
        '<div style="margin-top:6px;display:flex;gap:8px;align-items:center;color:var(--muted)">' + K.ico('lock', 22) + '<span>' + t('consent.required') + '</span></div></div>';
    }
    return '<div style="margin:6px 12px;padding:12px 14px;background:var(--surface);border:2px solid var(--rule);border-radius:20px;line-height:1.45">' + text +
      '<button class="sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" style="margin:8px 0 0;width:100%;border:0;padding:0;min-height:56px;background:transparent"><span class="tx"><b>' + t('consent.optional') + '</b></span><span class="knob">' + (on ? K.ico('tick', 20) : K.ico('dash', 20)) + '<span>' + t(on ? 'consent.on' : 'consent.off') + '</span></span></button></div>';
  }
  function consentBody(sms, crash, extra, dialog) {
    return K.top({ title: t('consent.title'), back: true }) + K.scroll(
      '<p style="margin:0;padding:12px 16px;line-height:1.5">' + t('consent.intro') + '</p>',
      csw(true, t('consent.purpose.account_and_ledger'), true),
      csw(sms, t('consent.purpose.sms_reminders')),
      csw(crash, t('consent.purpose.crash_diagnostics')),
      '<p style="margin:0;padding:12px 16px;color:var(--muted);line-height:1.5">' + t('consent.rights') + '</p>', extra || ''
    ) + K.sticky(K.primary(t('consent.agree'), '', 'check')) + (dialog || '');
  }
  function lang3(on) {
    var items = ['ଓଡ଼ିଆ', 'हिन्दी', 'English'];
    return K.seg(items, on);
  }
  function qlab(n, label) { return '<div style="padding:12px 16px 0;font-weight:700;display:flex;gap:10px;align-items:center"><span style="min-width:28px;height:28px;border-radius:14px;background:var(--raised);display:inline-flex;align-items:center;justify-content:center">' + n + '</span><span>' + label + '</span></div>'; }
  function opt2(labels, on) { return K.seg(labels, on); }
  function x1(o) {
    o = o || {};
    var cash = o.cash === undefined ? '<span class="ph">' + M(0) + '</span>' : M(o.cash);
    return K.top({ title: t('x1.title') }) + K.scroll(
      '<p style="margin:0;padding:10px 16px 0;color:var(--muted)">' + t('x1.heading') + '</p>',
      qlab(1, t('x1.shopName')) + K.field('', o.name || '', { ph: t('x1.shopNamePrompt'), focus: !o.keypad && !o.name, err: o.err, help: o.err ? t('x1.refusal.shopName') : '' }),
      qlab(2, t('x1.language')) + lang3(o.lang === undefined ? 2 : o.lang) + sub(t('x1.languageHelp')),
      qlab(3, t('s3.display')) + (o.size || opt2([t('s3.comfort'), t('s3.focus')], 0)) + (o.sizeNote || ''),
      qlab(4, t('x1.cashNow')) + '<div class="field"><div class="in' + (o.keypad ? ' focus' : '') + '" style="font-weight:700;font-size:1.2em">' + cash + '</div></div>' + sub(t('x1.cashHelp'))
    ) + K.sticky(o.keypad ? '<div class="field" style="margin:0"><div class="in focus" style="font-weight:700;font-size:1.2em">' + cash + '</div></div>' + K.keypad() : '', K.primary(t('x1.start'), '', 'check')) + (o.over || '');
  }

  SPEC.area = {
    title: 'Onboarding',
    intro: 'First launch and sign-up, in the order the app runs them: splash, language, consent notice, phone number, code, then (new shop only) shop setup and opening cash. Plus the recovery screens: code problems, session expired, number changed. No tabs on any of them.',
    screens: [
      {
        id: 'onboarding-splash', route: 'A1', title: 'Splash', flag: 'EXISTS',
        purpose: 'The first frame. Names the product; one tap continues.',
        primary: 'Tap anywhere (accessible name: Continue).',
        taps: '1 tap.',
        rules: 'No logo animation, no tour, no permissions primer. The wordmark SWAFTO is a name, not copy, and is the same in every language.',
        notes: 'REAL FIRST-LAUNCH ORDER (from App.tsx, session.tsx chooseLanguage / agreeConsent, host.tsx consented): A1 splash -> A2 language -> X0 consent notice (in the language just chosen) -> A3 phone number -> A4 code -> then, if the book has no shop name yet, X1 shop setup -> T1 Today (T2 if no opening cash was typed, then T6 opening cash). A returning book goes A4 -> T1. Back: X0 returns to A2, A3 to A2, A4 to A3, A5 to A4; A1, A2 and A6 have no parent (Back leaves the app). Note: session.agreeConsent briefly sets X1, but the host then moves to A3 synchronously, so X1 is not shown before sign-in. The splash is a single tap target with no visible hint; I kept that (reads as a pause, not a screen with a dead button).',
        body: function () {
          return '<div class="center" style="background:var(--brand);color:var(--onact);align-items:center;text-align:center;flex:1"><div style="font-size:2.4em;font-weight:800;letter-spacing:.12em">SWAFTO</div><div style="opacity:.9;font-size:1.05em">' + t('a1.continue') + '</div></div>';
        }
      },
      {
        id: 'onboarding-language', route: 'A2', title: 'Choose your language', flag: 'EXISTS',
        purpose: 'Pick Odia, Hindi or English before reading anything else. Each language is written in itself.',
        primary: 'One of three large language rows; picking one goes straight to the consent notice in that language.',
        taps: '1 tap.',
        rules: 'Autonyms are literals, not translated copy. Nothing pre-selected. The hint is two-script because no language is chosen yet.',
        notes: 'The real hint line is a hard-coded two-script string (CHOOSE_HINT), not in strings.ts. No device-locale guess is made (no inference).',
        body: function () {
          var rows = [['ଓଡ଼ିଆ', 'globe'], ['हिन्दी', 'globe'], ['English', 'globe']].map(function (x) { return K.lrow(x[1], '<span style="font-size:1.3em">' + x[0] + '</span>'); }).join('');
          return K.top({ title: t('a2.title') }) + K.scroll('<p style="margin:0;padding:12px 16px;color:var(--muted)">' + 'भाषा चुनें · ଭାଷା ବାଛନ୍ତୁ' + '</p>', rows);
        }
      },
      {
        id: 'onboarding-consent', route: 'X0', title: 'Consent notice (sign-up): nothing pre-ticked', flag: 'CHG',
        purpose: 'DPDP notice before an account exists: what is kept and why, three purposes each with its own choice, rights in one line.',
        primary: 'I agree (agrees to exactly what the switches say; there is no agree-to-all).',
        taps: 'Minimum 1 tap (agree with both optional purposes left off); each optional purpose adds 1 tap.',
        rules: 'Itemised notice. Specific consent per purpose. Only the account and ledger purpose is required, and it is shown as locked (icon + words), not as a switch. SMS reminders and crash reports start OFF (consent.off). State is icon + words Yes/No, never colour alone. Back returns to A2.',
        notes: 'Real screen as built has one button (agree) and rows with "Your choice: No/Yes". My switch is the same content, restyled with a tick or dash plus the word. The notice version and locale go with the decision to the server at verify (host.consented). The real X0 shows no grievance officer or privacy-page link; the DPDP grievance officer is human-blocked (HUMAN-ACTIONS) so I did not draw one. Copy in Odia and Hindi is DRAFT (H13).',
        review: 'The notice has no link to the full privacy page or the grievance officer; add one row once the officer is published (human item).',
        body: function () { return consentBody(false, false); }
      },
      {
        id: 'onboarding-consent-optin', route: 'X0', title: 'Consent notice: one optional purpose turned on', flag: 'EXISTS',
        purpose: 'Shows the state after he turns SMS reminders on himself. Crash reports stay off.',
        primary: 'I agree (sends exactly: account and ledger, SMS reminders).',
        taps: '2 taps (one switch, agree).',
        rules: 'A switch is only ever turned on by the shopkeeper. Withdrawal later is the same screen from Today (manage mode, one tap, takes effect at once, no Save in the design target; the real manage screen today still has a Save button, consent.save, noted for the Settings area).',
        notes: 'The ON state is filled teal with a tick and the word Yes.',
        body: function () { return consentBody(true, false); }
      },
      {
        id: 'onboarding-consent-decline', route: 'X0', title: 'Consent notice: he does not want to agree', flag: 'NEW',
        purpose: 'The real screen has no refuse action: refusing is only possible by pressing Back. This frame proposes an equal-weight refuse so declining is as visible as agreeing, and says plainly what happens.',
        primary: 'Go back (equal weight to the other button).',
        taps: '1 tap to refuse; the answer is a calm dialog, 1 more tap to leave.',
        rules: 'No confirm-shaming; equal visual weight; nothing is kept when he leaves. The account and ledger purpose is a precondition of having an account, so the honest answer is that without it the app cannot make one.',
        notes: 'As built, Back on X0 goes to A2 and nothing has been sent or stored. The dialog copy below is NEW and needs native review (H13). This is a proposal, not what the app does today.',
        review: 'Decide whether to add a visible "I do not agree" action on X0 (today only Back refuses).',
        body: function () {
          return consentBody(false, false, '', K.dialog(K.N('No account without this'), '<p style="margin:0 0 12px;line-height:1.5">' + K.N('SWAFTO cannot keep a book for you without the first item. Nothing has been sent or saved. You can come back any time.') + '</p>' + K.primary(K.N('Choose language again'), 'outline', 'back') + K.primary(t('consent.agree'), 'outline', 'check')));
        }
      },
      {
        id: 'onboarding-consent-unreached', route: 'X0', title: 'Consent: server not reached', flag: 'CHG',
        purpose: 'The choice could not be recorded because there was no signal. Say it was not changed and what to do.',
        primary: 'Try again with signal (tap I agree again).',
        taps: '1 tap to retry.',
        rules: 'Calm refusal, never red-only: icon, words, and the sentence says the choice was NOT changed. In sign-up no account exists yet, so nothing is half-saved.',
        notes: 'refusal.consent is the real key for "your choice was not changed"; the app maps it in manage mode (and refusal.consentRead when it cannot read the choices). In sign-up mode the consent decision is posted together with the code at A4, so a missing signal there shows auth.offline / auth.failed on A4 (see the A4 frames) rather than this banner. Drawn here as the closest honest equivalent; I could not tell from the code that X0 in signup mode ever shows this exact banner.',
        review: 'Confirm where the sign-up consent failure should appear: on A4 (as built) or back on X0.',
        body: function () {
          return consentBody(true, false, '', '') + K.refbanner(t('refusal.titleNotDone'), t('refusal.consent'), true);
        }
      },
      {
        id: 'onboarding-phone-empty', route: 'A3', title: 'Phone number: empty', flag: 'EXISTS',
        purpose: 'Ask for the ten-digit mobile number that will receive the one-time code.',
        primary: 'Keypad digits, then Send code (disabled until the number is a valid mobile series).',
        taps: 'A full mobile number, one tap per figure, then Send code (one more tap); then the code on A4.',
        rules: 'The number being typed is pinned above the keypad (HT-34). The app keypad is used, never the system keyboard. +91 is fixed. Send is greyed with a dashed edge until valid, and a refusal never shows before a tap.',
        notes: 'Real screen also shows a "Step 1 of 2" line. The link "I changed my number" is a quiet text button at the foot.',
        body: function () { return phoneFrame(''); }
      },
      {
        id: 'onboarding-phone-typing', route: 'A3', title: 'Phone number: typing', flag: 'EXISTS',
        purpose: 'Digits appear grouped 5 + 5 as he types.',
        primary: 'Keep typing; Send code is still off while the number is incomplete.',
        taps: '3 more digits, then Send.',
        rules: 'Display grouping only; nothing is guessed, filled or remembered.',
        notes: 'The caret sits in the field; keys are 56 dp.',
        body: function () { return phoneFrame('9876543'); }
      },
      {
        id: 'onboarding-phone-notmobile', route: 'A3', title: 'Phone number: ten digits but not a mobile', flag: 'EXISTS',
        purpose: 'Ten digits were entered but the series is not an Indian mobile number. Explain quietly, with no red alert.',
        primary: 'Fix the number with the delete key (Send stays off).',
        taps: '1 delete tap, retype.',
        rules: 'Shown only once ten digits are in (HT-5), as an informational line with an icon, polite live region.',
        notes: 'The field border uses the error edge plus the sentence; colour is not the only cue.',
        body: function () { return phoneFrame('1234567890', { err: true }); }
      },
      {
        id: 'onboarding-phone-busy', route: 'A3', title: 'Phone number: sending the code', flag: 'EXISTS',
        purpose: 'The request is in flight. The button says Sending and cannot be tapped twice.',
        primary: 'None; wait for A4.',
        taps: 'n/a',
        rules: 'The screen moves only on the server answer. Keypad hidden while busy is a proposal; as built the keypad stays and the send button is disabled.',
        notes: 'To stay faithful to the real screen the number remains visible and unchanged.',
        body: function () { return phoneFrame(PH.replace(' ', ''), { busy: true }); }
      },
      {
        id: 'onboarding-phone-offline', route: 'A3', title: 'Phone number: no signal', flag: 'EXISTS',
        purpose: 'A code cannot be sent without signal. Say nothing typed is lost and what to do.',
        primary: 'Send code again when signal returns.',
        taps: '1 tap to retry.',
        rules: 'Calm, "nothing is lost" (auth.offline). The sync chip does not apply before sign-in because there is no ledger sync yet.',
        notes: 'Notice sits above the keypad so large text does not scroll it away (HT-18). The same key auth.failed covers a server fault with different words.',
        body: function () { return phoneFrame(PH.replace(' ', ''), { notice: K.banner('info', 'cloudoff', t('auth.offline')) }); }
      },
      {
        id: 'onboarding-code-empty', route: 'A4', title: 'Code entry: empty', flag: 'EXISTS',
        purpose: 'Enter the six-digit code from the SMS. Shows where it was sent and lets him fix the number.',
        primary: 'Keypad digits. The sixth digit verifies at once; there is no Verify button.',
        taps: '6 digit taps.',
        rules: 'Boxes pinned above the keypad. No autofill, no SMS auto-read in the entry path (no inference).',
        notes: 'Edit goes to A3. "Trouble? I changed my number" goes to A7. Resend has no countdown in the code: it is only disabled while a request is busy. I did not draw a timer that does not exist.',
        body: function () { return codeFrame(''); }
      },
      {
        id: 'onboarding-code-typing', route: 'A4', title: 'Code entry: typing', flag: 'EXISTS',
        purpose: 'Digits fill the boxes left to right; the live box carries the focus edge.',
        primary: 'Keep typing.',
        taps: '3 more taps.',
        rules: 'The current box edge is the focus cue; digits are visible text.',
        notes: 'Backspace and Clear are on the keypad.',
        body: function () { return codeFrame('482'); }
      },
      {
        id: 'onboarding-code-checking', route: 'A4', title: 'Code entry: checking', flag: 'EXISTS',
        purpose: 'The sixth digit went in; the server is checking. Keypad and notice are removed while busy.',
        primary: 'None; wait. Resend is disabled.',
        taps: 'n/a',
        rules: 'Screen moves only on the answer: A5 on a wrong or expired code, X1 or Today on success.',
        notes: 'Real code hides the keypad and the notice while busy.',
        body: function () { return codeFrame('482915', { checking: true }); }
      },
      {
        id: 'onboarding-code-offline', route: 'A4', title: 'Code entry: could not check (no signal or server fault)', flag: 'EXISTS',
        purpose: 'The code is fine but could not be checked. Offers Try again for the same code.',
        primary: 'Try again (common.retry).',
        taps: '1 tap.',
        rules: 'Nothing typed is lost. Retry appears only for offline or failed.',
        notes: 'Same frame for auth.failed with the other sentence.',
        body: function () { return codeFrame('482915', { notice: K.banner('info', 'cloudoff', t('auth.offline')), retry: true }); }
      },
      {
        id: 'onboarding-code-nocode', route: 'A4', title: 'Code entry: Still no code? (after two resends)', flag: 'EXISTS',
        purpose: 'After two resends a third link appears so he can ask for help instead of looping.',
        primary: 'Still no code? (opens A5 noCode).',
        taps: '1 tap.',
        rules: 'The link appears only after resends reach two (NO_CODE_AFTER_RESENDS).',
        notes: 'This frame also shows all three quiet links: Resend, Still no code?, Trouble.',
        body: function () { return codeFrame('', { noCode: true }); }
      },
      {
        id: 'onboarding-a5-mismatch', route: 'A5', title: 'Code problem: wrong code', flag: 'EXISTS',
        purpose: 'The code did not match. Say so calmly and let him re-enter.',
        primary: 'Back (re-enter the code). No send button, the same code may still be right.',
        taps: '1 tap (Back), 6 digits.',
        rules: 'Icon + title + words. The entered code is cleared.',
        notes: 'As built, a wrong code moves to A5; Back returns to A4.',
        body: function () { return problemCard('err', 'warn', t('a5.mismatch.title'), t('a5.mismatch.body', { digits: 6 })); }
      },
      {
        id: 'onboarding-a5-expired', route: 'A5', title: 'Code problem: code expired', flag: 'EXISTS',
        purpose: 'The code is too old. Offer a new one.',
        primary: 'Send a new code.',
        taps: '1 tap, then 6 digits on A4.',
        rules: 'Says how many minutes the code lives. Resend counts toward the Still no code? link.',
        notes: 'The footer button is the only A5 state with a primary action besides retry.',
        body: function () { return problemCard('', 'clock', t('a5.expired.title'), t('a5.expired.body', { minutes: 10 }), K.primary(t('a5.expired.cta'), '', 'refresh')); }
      },
      {
        id: 'onboarding-a5-locked', route: 'A5', title: 'Code problem: too many tries', flag: 'EXISTS',
        purpose: 'The server paused attempts. Say how long to wait.',
        primary: 'None; wait. Back is available.',
        taps: 'n/a',
        rules: 'Minutes are rounded up so the wait is never understated. If the server gave no wait, a gentler "try later" line is shown.',
        notes: 'Here a 2 minute wait. The 10 minute value in the expired frame is a placeholder from OTP_TTL_SECONDS, not measured here.',
        body: function () { return problemCard('err', 'lock', t('a5.locked.title'), t('a5.locked.body', { minutes: 2 })); }
      },
      {
        id: 'onboarding-a5-nocode', route: 'A5', title: 'Code problem: still no code', flag: 'EXISTS',
        purpose: 'Help for a code that never arrives.',
        primary: 'Back to A4 (check the number, or use the changed-number route).',
        taps: '1 tap.',
        rules: 'Neutral tint, info icon; no alarm.',
        notes: 'No send button in this state in the real screen.',
        body: function () { return problemCard('info', 'info', t('a5.noCode.title'), t('a5.noCode.body')); }
      },
      {
        id: 'onboarding-session-expired', route: 'A6', title: 'Session expired', flag: 'EXISTS',
        purpose: 'This phone holds a book but the server no longer trusts the session. The book is untouched; verify the same number to continue.',
        primary: 'Verify with the saved number (sends a code to it).',
        taps: '1 tap, then 6 digits.',
        rules: 'The shop name is shown so he knows it is his book. If no number is on file the button goes to A3 instead. No log-out, nothing is lost.',
        notes: 'Shop name falls back to s2.unnamed when the book has none.',
        body: function () {
          return top(t('a6.bar'), false) + K.scroll(K.center('<div style="text-align:center"><div style="font-size:1.4em;font-weight:700">' + K.shop + '</div><p style="color:var(--muted);line-height:1.5">' + t('a6.body') + '</p></div>')) + K.sticky(K.primary(t('a6.verify', { phone: '+91 ' + PH }), '', 'phone'));
        }
      },
      {
        id: 'onboarding-numberchanged-decide', route: 'A7', title: 'Number changed: two ways', flag: 'EXISTS',
        purpose: 'He changed his SIM. Two paths: he still has the old number, or he does not.',
        primary: 'Choose one of two option cards.',
        taps: '1 tap.',
        rules: 'Each option names what it does and what it needs. No account is created or changed here.',
        notes: 'Have old number goes to A3; no old number goes to the handoff frame.',
        body: function () {
          function opt(title, sub) { return '<button class="lrow" style="min-height:96px"><span class="lt"><b>' + title + '</b><small>' + sub + '</small></span>' + K.ico('chev', 24) + '</button>'; }
          return top(t('a7.bar'), true) + K.scroll(sub(t('a7.sub')), '<p style="margin:0;padding:6px 16px 10px;line-height:1.5">' + t('a7.intro') + '</p>', opt(t('a7.haveOld'), t('a7.haveOld.sub')), opt(t('a7.noOld'), t('a7.noOld.sub')));
        }
      },
      {
        id: 'onboarding-numberchanged-handoff', route: 'A7', title: 'Number changed: no old number (hand-off)', flag: 'EXISTS',
        purpose: 'The app cannot change a number by itself. Say how to ask for help.',
        primary: 'Open the privacy page (it says how to write to us).',
        taps: '1 tap.',
        rules: 'Honest: no pretend self-service. Back returns to the two options.',
        notes: 'Opens the web privacy page in the browser. The real grievance route is human-blocked until the officer is published.',
        body: function () {
          return top(t('a7.bar'), true) + K.scroll(sub(t('a7.sub')), '<div class="banner info" style="margin:12px;display:block"><p style="margin:0;line-height:1.5">' + t('a7.handoff') + '</p></div>', K.stack(K.primary(t('a7.help'), 'outline', 'shield')));
        }
      },
      {
        id: 'onboarding-x1-empty', route: 'X1', title: 'Shop setup: fresh', flag: 'EXISTS',
        purpose: 'Four questions and no more: shop name, language, screen, cash in the box. Reached only by a book with no shop name, after sign-in.',
        primary: 'Start the day (always pressable; without a name it refuses and says why).',
        taps: 'Name typed + Start = 2 actions plus the letters; opening cash is optional (digits + 1 tap to raise the keypad).',
        rules: 'No tour, no carousel, no consent copy here. Opening cash null is UNKNOWN, never zero, so the field shows a muted ₹0.00 placeholder. The name box uses the system keyboard with autocorrect off; cash uses the app keypad only. No bottom nav.',
        notes: 'The language question reuses the current choice (Odia first). Question 3 is the display mode as built: Light or Dark, bigger text (s3.comfort / s3.focus, HT-29), and it applies at once. See the next frames for the text-size proposal.',
        body: function () { return x1({}); }
      },
      {
        id: 'onboarding-x1-refusal', route: 'X1', title: 'Shop setup: Start tapped without a name', flag: 'EXISTS',
        purpose: 'Start the day needs a name. The refusal appears only after the tap and names the missing field.',
        primary: 'Type the shop name.',
        taps: 'n/a',
        rules: 'A button is never dead: it stays pressable and the field says what it is waiting for. The refusal clears when he types.',
        notes: 'Real refusal key is x1.refusal.shopName.',
        body: function () { return x1({ err: true, over: K.refbanner(t('refusal.titleNotDone'), t('x1.refusal.shopName'), true) }); }
      },
      {
        id: 'onboarding-x1-cash', route: 'X1', title: 'Shop setup: opening cash with the keypad', flag: 'EXISTS',
        purpose: 'Tapping the cash field raises the app keypad and repeats the figure directly above the keys.',
        primary: 'Digits, then Start the day.',
        taps: '4 digits (1,200) + 1 tap to raise the keypad + Start = 6 taps, plus the name.',
        rules: 'Digits are whole rupees; the app writes paise by appending 00 (1,200 becomes 120000 paise). No suggested amount. Tapping the name field lowers the keypad.',
        notes: 'The typed figure is full ink and the placeholder is muted so an answer and a placeholder cannot be confused.',
        body: function () { return x1({ name: K.shop, keypad: true, cash: 120000 }); }
      },
      {
        id: 'onboarding-x1-textsize', route: 'X1', title: 'Shop setup: text size choice with live preview (proposal)', flag: 'NEW',
        purpose: 'Propose Normal / Large / Extra large as its own question, with a preview line that already uses the chosen size, separate from light and dark.',
        primary: 'Pick a size; the preview line resizes at once.',
        taps: '1 tap to change size (default Normal).',
        rules: 'Size and dark mode are separate settings. The preview is a real shop line with a printed rupee figure (a sample, not his data) so he can judge legibility at arm length.',
        notes: 'Today the app has ONE axis: Light, or Dark with bigger text, so the real X1 does not offer a size on its own (chat.md U-2 left this open). The labels Normal, Large and Extra large do not exist in strings.ts. Extra large would need a new token step (a frontend build item). The preview figure is a demo, not a derived total.',
        review: 'Decide whether to split text size from dark mode (needs tokens.ts change) and approve the labels.',
        body: function () {
          var preview = '<div style="margin:8px 12px;padding:12px 14px;background:var(--surface);border:2px solid var(--rule);border-radius:16px;line-height:1.4"><div style="color:var(--muted)">' + K.N('Preview') + '</div><div style="font-size:1.25em;font-weight:700">' + t('box.title') + '  ' + M(120000) + '</div></div>';
          return x1({ name: K.shop, size: K.seg([K.N('Normal'), K.N('Large'), K.N('Extra large')], 1) + opt2([t('s3.comfort'), t('s3.focus')], 0) + preview });
        }
      },
      {
        id: 'onboarding-opening-cash', route: 'T6', title: 'Opening cash: empty', flag: 'EXISTS',
        purpose: 'Count the notes and coins before the first sale. Reached from Today on the first day (T2) when it was left out in setup.',
        primary: 'Digits, then Save opening cash (disabled until a digit is typed).',
        taps: 'Tap the figure, 4 digits, Save = 6 taps.',
        rules: 'Null is unknown, not zero: Save stays disabled until he types, even though the figure reads ₹0.00. The opening figure has one write path (same method as X1). No suggestion from yesterday.',
        notes: 'In the real screen Back is shown; the keypad opens on tap in Dark mode and stays open in Light.',
        body: function () {
          return top(t('t6.title'), true) + K.scroll(sub(t('t6.sub')), head(t('t6.question'), t('t6.body'))) + K.sticky('<div class="field" style="margin:0"><div class="in focus" style="font-weight:700;font-size:1.3em"><span class="ph">' + M(0) + '</span></div></div>', K.keypad(), K.primary(t('t6.save'), 'dis', 'coin'));
        }
      },
      {
        id: 'onboarding-opening-cash-typed', route: 'T6', title: 'Opening cash: typed', flag: 'EXISTS',
        purpose: 'The figure he counted, ready to save.',
        primary: 'Save opening cash.',
        taps: '1 tap.',
        rules: 'Integer paise (1200 rupees = 120000 paise). A typed zero would be an answer; the button enables on any typed digit.',
        notes: 'After saving, Today shows the hero "In the box now" with this opening cash and no entries.',
        body: function () {
          return top(t('t6.title'), true) + K.scroll(sub(t('t6.sub')), head(t('t6.question'), t('t6.body'))) + K.sticky('<div class="field" style="margin:0"><div class="in focus" style="font-weight:700;font-size:1.3em">' + M(120000) + '</div></div>', K.keypad(), K.primary(t('t6.save'), '', 'coin'));
        }
      }
    ]
  };
})();
