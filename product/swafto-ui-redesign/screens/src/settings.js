/* AREA: Settings and privacy (S1 to S8, S11, A8, X0 manage mode, plus NEW Devices and Your data).
   Copy by literal key; a string that does not exist is K.N(English). Money is integer paise through K.M. Status never by colour alone. */
(function () {
  var t = K.t;
  function hdr(title, chip) { return K.top({ title: title, back: true, right: chip || K.chip('ok') }); }
  function sel(on) { return on ? K.ico('check', 24) + '<span style="font-weight:700;margin-inline-start:6px">' + K.N('Chosen') + '</span>' : ''; }
  /* local radio row: icon disc + label + chosen state in words (kit has no radio list) */
  function radio(label, on, sub) { return K.lrow(on ? 'check' : 'dash', label, sub, { noChev: true, right: sel(on) }); }
  function note(txt) { return '<p style="margin:12px 16px;font-size:17px;line-height:1.4">' + txt + '</p>'; }
  function lockedBox(ico, txt) { return K.banner('info', ico, txt); }
  var SHOP = K.shop;
  var HUB_FOOT = function () {
    return K.sec(K.N('Legal and help')) + K.lrow('shield', t('s1.privacy')) + K.lrow('info', t('s1.about')) + K.lrow('chat', t('s1.help'));
  };
  function hub(o) {
    o = o || {};
    var acct = o.signedOut ? K.lrow('user', t('s1.signIn')) : K.lrow('user', K.N('Your account'), '+91 98765 43210') + K.lrow('phone', K.N('Signed-in phones'), K.N('Sign out a lost phone'));
    var lock = K.sw(false, t('s1.appLock'), t('s1.appLockOff')) + (o.lockUnavail ? K.banner('info', 'lock', t('s1.appLockNoScreenLock')) : '');
    var out = o.signedOut ? '' : K.lrow('logout', t('a8.logout'));
    return hdr(t('s1.title')) + K.scroll(
      K.sec(K.N('Your shop')),
      K.lrow('box', t('s1.shop'), SHOP) + K.lrow('globe', t('s1.language')) + K.lrow('receipt', t('s1.export')) + K.lrow('download', K.N('Your data')),
      K.sec(t('s1.appLock')), lock,
      K.sec(K.N('Account')), acct, out,
      HUB_FOOT(),
      K.sec(K.N('Danger zone')), K.lrow('trash', t('s1.deleteAccount'), K.N('Deletes your book. You can undo for 30 days.'), { danger: true })
    ) + (o.extra || '');
  }
  var CONSENT = [
    ['account_and_ledger', 'consent.purpose.account_and_ledger'],
    ['sms_reminders', 'consent.purpose.sms_reminders'],
    ['crash_diagnostics', 'consent.purpose.crash_diagnostics']
  ];
  function consent(sms, crash, extra, banner) {
    return hdr(t('consent.manage.title')) + K.scroll(
      banner || '', note(t('consent.intro')),
      K.sec(t('consent.required')),
      K.lrow('lock', t('consent.purpose.account_and_ledger'), t('consent.required'), { noChev: true, right: K.ico('check', 24) + '<span style="font-weight:700;margin-inline-start:6px">' + t('consent.on') + '</span>' }),
      K.sec(t('consent.optional')),
      K.sw(sms, t('consent.purpose.sms_reminders'), t('consent.optional') + ': ' + t(sms ? 'consent.on' : 'consent.off')),
      K.sw(crash, t('consent.purpose.crash_diagnostics'), t('consent.optional') + ': ' + t(crash ? 'consent.on' : 'consent.off')),
      note(t('consent.rights'))
    ) + (extra || '');
  }
  var DAYS = ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00'];
  function shop(extra, picked) {
    return hdr(t('s2.title')) + K.scroll(
      K.sec(t('s2.name')),
      '<div class="lrow" style="cursor:default"><span class="li">' + K.ico('box', 24) + '</span><span class="lt"><b>' + SHOP + '</b><small>' + t('s2.note') + '</small></span></div>',
      K.sec(t('s2.dayStart')),
      K.lrow('clock', t('s2.dayStart'), t('s2.dayStartNote'), { right: '<b>' + (picked || '02:00') + '</b>' })
    ) + (extra || '');
  }
  function dayList(on) { return DAYS.map(function (d) { return radio(d, d === on); }).join(''); }
  function delInfo(extra) {
    return hdr(t('s7.title')) + K.scroll(
      K.banner('err', 'warn', t('s7.what')), note(t('s7.grace')),
      K.stack(K.primary(K.N('Take a copy of my data first'), 'outline', 'download'))
    ) + K.sticky(K.primary(t('s7.continue'), 'outline', 'chev')) + (extra || '');
  }
  function delConfirm(o) {
    o = o || {};
    return hdr(t('s8.title')) + K.scroll(
      o.refusal || '',
      K.banner('err', 'warn', t('s7.what')),
      K.banner('info', 'info', t(o.signedOut ? 's8.localOnly' : 's8.phoneNow')),
      o.owed === false ? '' : K.banner('info', 'book', t('s8.owed'))
    ) + K.sticky(K.primary(t('s8.cancel'), '', 'undo'), K.primary(o.busy ? K.N('Deleting') : t('s8.confirm'), o.busy ? 'dis' : 'outline', 'trash'));
  }
  function dev(name, sub, cur) {
    return K.lrow('phone', name, sub, { noChev: true, right: cur ? K.ico('check', 24) + '<span style="font-weight:700;margin-inline-start:6px">' + K.N('This phone') + '</span>' : '' });
  }
  var DEVS = function (withOther) {
    return dev(K.N('Android phone'), K.N('Last used: now'), true) + (withOther ? dev(K.N('Android phone'), K.N('Last used: 12 days ago')) + K.btn2(K.N('Sign out this phone'), 'logout') : '');
  };

  SPEC.settings = SPEC.area = { title: 'Settings and privacy', intro: 'Settings hub and everything off it: your shop and the business day start, language and screen, what you agreed to (one-tap withdrawal), your data and account deletion, About, Help, log out, app lock, plus two NEW screens: Your data (export) and Signed-in phones. Odia and Hindi are DRAFT (H13).', screens: [
    { id: 'settings-hub', route: 'S1', title: 'Settings: hub', flag: 'CHG',
      purpose: 'One place to reach the shop, language, privacy, help and the way out.',
      primary: 'Rows with icon and chevron; each opens its screen.',
      taps: 'Language: Today, Settings row, Language = 3 taps. Withdraw consent: Settings, Privacy, one switch = 3 taps.',
      rules: 'Log out and Delete sit under their own headings, apart from App lock. Delete is words plus icon, not colour alone.',
      notes: 'Rows as built: shop, language, plan (absent in the all-free beta), items (Premium only), accountant export, app lock, account (Log out), privacy, about, help, delete. Group headings, App lock as a switch, "Your data" and "Signed-in phones" rows are proposals.',
      review: 'Hub gains two rows (Your data, Signed-in phones) and group headings; confirm the order.',
      body: function () { return hub(); } },
    { id: 'settings-hub-signedout', route: 'S1', title: 'Settings: this phone is not signed in', flag: 'EXISTS',
      purpose: 'No session on this phone: the account row offers Sign in instead of Log out.',
      primary: 'Sign in.', taps: '1 tap to sign in.', rules: 'The shop comes from the session; with none, no account rows are drawn.',
      notes: 'As built: onSignIn replaces onLogOut. Phone list and Log out are not shown without a session.',
      body: function () { return hub({ signedOut: true }); } },
    { id: 'settings-hub-lock-unavailable', route: 'S1', title: 'Settings: app lock cannot be turned on', flag: 'CHG',
      purpose: 'He tried App lock and the phone has no screen lock. Say why, and keep the switch visibly off.',
      primary: 'Set a screen lock in the phone settings (outside the app).', taps: 'No action here; the reason is on the row.',
      rules: 'A switch is never silently dead.',
      notes: 'Text is s1.appLockNoScreenLock as built; v1 drew it as a link row with plain text below. A "Chosen: No" word state is on the switch.',
      body: function () { return hub({ lockUnavail: true }); } },
    { id: 'settings-hub-loading', route: 'S1', title: 'Settings: loading', flag: 'EXISTS',
      purpose: 'The shell is waiting on the phone database.', primary: 'None.', taps: 'None.', rules: 'Placeholder rows, no spinner.',
      notes: 'Shell loading state, shared by S1 to S8. Error state is the common error with Try again, not redrawn per screen.',
      body: function () { return hdr(t('s1.title')) + K.scroll(K.skel(6)); } },
    { id: 'settings-shop', route: 'S2', title: 'Your shop', flag: 'CHG',
      purpose: 'Show the shop name as typed and let him set when his business day starts.',
      primary: 'Day starts at row (opens the labelled list).', taps: 'Change day start: row, time, done = 2 taps.',
      rules: 'Name is read-only and shown verbatim: not capitalised or trimmed. Day start applies to days opened afterwards; recorded days keep their hours (CLAUDE.md decision 1).',
      notes: 'As built the name sits in a plain block (no onEditName), so no chevron. Day start is a Segmented control of 7 times in the app today (00:00 to 06:00); here a list row opens a labelled list.',
      review: 'Day start as a list sheet rather than a 7-way segment: seven segments will not fit 360 px at 56 dp.',
      body: function () { return shop(); } },
    { id: 'settings-shop-daystart', route: 'S2', title: 'Your shop: choose the day start', flag: 'CHG',
      purpose: 'Pick the hour a business day begins.', primary: 'Tap a time; it applies at once with no Save.',
      taps: '1 tap on a time.', rules: 'Applied at once; says it governs only days opened afterwards. The app never suggests a time.',
      notes: 'Choices are the fixed 00:00 to 06:00 list from the store (DAY_START_CHOICES). Labels like "after midnight" would be new strings and are not drawn. Nothing is pre-chosen except his saved value.',
      body: function () { return shop(K.sheet(t('s2.dayStart'), dayList('02:00') + note(t('s2.dayStartNote')))); } },
    { id: 'settings-shop-daystart-done', route: 'S2', title: 'Your shop: day start changed', flag: 'CHG',
      purpose: 'Confirm the new hour and what it does and does not move.', primary: 'None; Back.', taps: '0.',
      rules: 'Past days are never re-dated (D7).', notes: 'Toast wording is new; the note under the row is s2.dayStartNote as built.',
      body: function () { return shop(K.toast('check', K.N('Day now starts at 03:00')), '03:00'); } },
    { id: 'settings-language', route: 'S3', title: 'Language and screen', flag: 'CHG',
      purpose: 'Switch language and screen mode and see the result on this page.',
      primary: 'Tap a language or a mode; applied at once, no Save.', taps: '1 tap each.',
      rules: 'Each language is written in itself (never translated). The mode names say what the screen does, not an eyesight word.',
      notes: 'Language is three buttons (English, Hindi, Odia). The built Screen setting has two modes, Light and "Dark, bigger text" (s3.focus), not Normal/Large/Extra large: those three labels do not exist. A live preview card is added here so the change is seen before leaving.',
      review: 'Real display modes are two (Light, Dark bigger text); a three-step text size is a proposal that needs tokens work and copy.',
      body: function () {
        return hdr(t('s3.title')) + K.scroll(
          K.sec(t('s3.language')), K.seg(['English', 'हिन्दी', 'ଓଡ଼ିଆ'], 2),
          K.sec(t('s3.display')), K.seg([t('s3.comfort'), t('s3.focus')], 0),
          K.sec(K.N('Preview')), K.hero({ box: 1845000, opening: 1200000, cashIn: 935000, cashOut: 290000 }));
      } },
    { id: 'settings-language-focus', route: 'S3', title: 'Language and screen: dark, bigger text', flag: 'CHG',
      purpose: 'The same page after choosing the second mode.', primary: 'Tap Light to go back.', taps: '1 tap to switch back.',
      rules: 'Reversible in one tap on the same screen.', notes: 'Use the page header toggles (theme, size) to see the rendered mode; the frame is the same layout with the other segment chosen.',
      body: function () {
        return hdr(t('s3.title')) + K.scroll(
          K.sec(t('s3.language')), K.seg(['English', 'हिन्दी', 'ଓଡ଼ିଆ'], 0),
          K.sec(t('s3.display')), K.seg([t('s3.comfort'), t('s3.focus')], 1),
          K.sec(K.N('Preview')), K.hero({ box: 1845000, opening: 1200000, cashIn: 935000, cashOut: 290000 }));
      } },
    { id: 'settings-privacy', route: 'S4', title: 'Privacy and consent', flag: 'EXISTS',
      purpose: 'Route to what he agreed to, and say withdrawal is as easy as giving.',
      primary: 'What you agreed to (opens the consent screen).', taps: '1 tap to the switches.',
      rules: 'DPDP: withdrawal as easy as giving; the sentence sits with the row.',
      notes: 'Only the one row and s4.withdraw exist today. The policy link lives in About, not here.',
      body: function () { return hdr(t('s4.title')) + K.scroll(K.lrow('shield', t('s4.review')), note(t('s4.withdraw')), K.lrow('download', K.N('Your data'))); } },
    { id: 'settings-consent', route: 'X0', title: 'What you agreed to (manage)', flag: 'CHG',
      purpose: 'See each purpose and turn an optional one off or on.',
      primary: 'Each optional purpose is its own switch. One tap changes it and takes effect at once.',
      taps: 'Withdraw one purpose: 1 tap (v1 needed switch plus Save).',
      rules: 'No pre-ticked consent, no Save button, equal weight for Yes and No, the required purpose shown locked with its reason.',
      notes: 'As built, X0 manage has switches plus a Save button (consent.save). Here the Save is removed. The required row is not a switch (service cannot run without it; the way out is deleting the account).',
      review: 'Removes the Save button in manage mode to meet DPDP withdrawal-as-easy-as-giving; USABILITY item "withdrawal needs switch plus Save".',
      body: function () { return consent(true, false); } },
    { id: 'settings-consent-withdrawn', route: 'X0', title: 'What you agreed to: just withdrawn', flag: 'CHG',
      purpose: 'Confirm the withdrawal happened now.', primary: 'None; the switch already reads No.', taps: '0 after the one tap.',
      rules: 'Status in icon plus words on the switch and in the toast; he can switch it back on in one tap.',
      notes: 'Toast copy is new. The server records the withdrawal when the tap lands.',
      body: function () { return consent(false, false, K.toast('check', K.N('Turned off. This takes effect now.'))); } },
    { id: 'settings-consent-offline', route: 'X0', title: 'What you agreed to: offline', flag: 'EXISTS',
      purpose: 'Withdrawal cannot reach the server, so the choice stays as it was, and the screen says so.',
      primary: 'Try again with signal.', taps: '1 tap to retry.',
      rules: 'Never show a switch as changed when the server did not accept it. Calm refusal, only after the tap.',
      notes: 'Copy is refusal.consent as built. Reading the list while offline gives refusal.consentRead instead (next frame).',
      body: function () { return consent(true, false, K.refbanner(t('refusal.titleNotDone'), t('refusal.consent'), true)); } },
    { id: 'settings-consent-readfail', route: 'X0', title: 'What you agreed to: cannot be read', flag: 'EXISTS',
      purpose: 'No signal on opening: his current choices cannot be shown.', primary: 'Try again.', taps: '1 tap.',
      rules: 'No switches are drawn rather than guessing their state.', notes: 'Copy is refusal.consentRead as built.',
      body: function () { return hdr(t('consent.manage.title')) + K.scroll(K.refuse(t('refusal.titleNotDone'), t('refusal.consentRead')), K.stack(K.primary(t('common.retry'), '', 'refresh'))); } },
    { id: 'settings-data', route: 'NEW', title: 'Your data (access and export)', flag: 'NEW',
      purpose: 'Let him see and take a copy of everything held about him (DPDP right of access).',
      primary: 'Download everything we hold.', taps: '2 taps: row, download.',
      rules: 'Read-only; nothing is edited or deleted here. A monthly CSV for his accountant already exists (s1.export).',
      notes: 'The API has GET /v1/me/export (full JSON), rate-limited, and answers 503 with a retry when busy. No mobile screen calls it today, only the accountant CSV (S12). Copy here is all new.',
      review: 'NEW screen needs a mobile caller for /v1/me/export and a file-share step; no backend work is needed.',
      body: function () {
        return hdr(K.N('Your data')) + K.scroll(
          note(K.N('This is a copy of everything we hold about you: your number, shop name, every entry and every party.')),
          K.stack(K.primary(K.N('Download everything we hold'), '', 'download'), K.btn2(t('s1.export'), 'receipt')),
          note(K.N('To correct something, add a dated correction on the day. To erase it all, use Delete this account.')));
      } },
    { id: 'settings-data-offline', route: 'NEW', title: 'Your data: offline', flag: 'NEW',
      purpose: 'No signal, so the copy cannot be fetched.', primary: 'Try again with signal.', taps: '1 tap to retry.',
      rules: 'Nothing is lost; calm and one next step.', notes: 'Refusal copy for export does not exist: new string.',
      body: function () {
        return hdr(K.N('Your data'), K.chip('off')) + K.scroll(K.refuse(t('refusal.titleNotDone'), K.N('No connection, so nothing was downloaded. Try again with signal.')),
          K.stack(K.primary(K.N('Download everything we hold'), '', 'download')));
      } },
    { id: 'settings-delete-info', route: 'S7', title: 'Delete this account', flag: 'CHG',
      purpose: 'Say plainly what is deleted and that it can be undone for 30 days.',
      primary: 'Continue (goes to the sure screen).', taps: '2 taps to reach the final button.',
      rules: 'Destructive, so it says what happens and how to undo. Continue and the safe exit have equal weight.',
      notes: 'As built: s7.what and s7.grace, one Continue button. Back is the way to keep the book. A "take a copy first" button is proposed.',
      review: 'Adds "Take a copy of my data first" (links to Your data) so erasure is not the only route off this page.',
      body: function () { return delInfo(); } },
    { id: 'settings-delete-confirm', route: 'S8', title: 'Are you sure? (signed in)', flag: 'EXISTS',
      purpose: 'Final decision, with what he loses named.', primary: 'Keep my book and Delete everything have equal size.',
      taps: '1 tap to confirm or keep.', rules: 'The owed-money line shows only when money is owed (a fact about his book).',
      notes: 'As built: s8.phoneNow tells him the phone book goes the moment the server accepts. The server then erases after 30 days; sign in to cancel.',
      body: function () { return delConfirm(); } },
    { id: 'settings-delete-busy', route: 'S8', title: 'Are you sure? sending the request', flag: 'CHG',
      purpose: 'The request is in flight.', primary: 'None; buttons are held.', taps: '0.',
      rules: 'No double submit.', notes: 'The built screen has no busy state; this is a proposal.',
      body: function () { return delConfirm({ busy: true }); } },
    { id: 'settings-delete-offline', route: 'S8', title: 'Delete: no connection', flag: 'EXISTS',
      purpose: 'Nothing was deleted, on the phone or the server.', primary: 'Try again with signal.', taps: '1 tap.',
      rules: 'Refusal shown only after the tap; the book is intact.', notes: 'Copy is refusal.eraseOffline as built.',
      body: function () { return delConfirm({ refusal: K.refuse(t('refusal.titleNotDone'), t('refusal.eraseOffline')) }); } },
    { id: 'settings-delete-refused', route: 'S8', title: 'Delete: server refused', flag: 'EXISTS',
      purpose: 'The server did not accept, so nothing was deleted.', primary: 'Try again later.', taps: '1 tap.',
      rules: 'Calm, nothing lost.', notes: 'Copy is refusal.erase. A failure to clear the phone is refusal.eraseLocal.',
      body: function () { return delConfirm({ refusal: K.refuse(t('refusal.titleNotDone'), t('refusal.erase')) }); } },
    { id: 'settings-delete-signin', route: 'S8', title: 'Delete: sign in again first', flag: 'EXISTS',
      purpose: 'His sign-in expired, so nothing was deleted.', primary: 'Sign in again, then delete.', taps: '1 tap to sign in.',
      rules: 'Nothing deleted; the way forward is stated.', notes: 'Copy is refusal.eraseSignIn. A sign-in button here is proposed; today the text only.',
      body: function () { return delConfirm({ refusal: K.refuse(t('refusal.titleNotDone'), t('refusal.eraseSignIn')) }); } },
    { id: 'settings-delete-local', route: 'S8', title: 'Are you sure? (not signed in)', flag: 'EXISTS',
      purpose: 'No session: only the book on this phone goes; the server account is untouched.', primary: 'Keep my book vs Delete everything.',
      taps: '1 tap.', rules: 'Says so before he presses (F-22).', notes: 'Copy s8.localOnly points to sign in or the web page in About.',
      body: function () { return delConfirm({ signedOut: true }); } },
    { id: 'settings-delete-done', route: 'S8', title: 'Deletion requested (30-day undo)', flag: 'EXISTS',
      purpose: 'Report what happened and the date the account is erased.', primary: 'Done.', taps: '1 tap.',
      rules: 'Undo is stated: signing in within 30 days cancels.',
      notes: 'As built, outcome kind scheduled. The date is the erasure date from the server; shown here as a specimen date, not a measured one.',
      body: function () {
        return hdr(t('s8.scheduledTitle')) + K.scroll(K.banner('info', 'clock', t('s8.scheduled')),
          K.lrow('calendar', t('s8.erasesOn'), '2026-12-18', { noChev: true }), note(t('s8.phoneWiped'))) + K.sticky(K.primary(t('s8.done'), '', 'check'));
      } },
    { id: 'settings-delete-local-done', route: 'S8', title: 'Deleted from this phone', flag: 'EXISTS',
      purpose: 'The phone book is gone; no request went to the server.', primary: 'Done.', taps: '1 tap.',
      rules: 'Honest that the server was not told.', notes: 'Outcome kind local.',
      body: function () { return hdr(t('s8.localTitle')) + K.scroll(K.banner('info', 'check', t('s8.localDone'))) + K.sticky(K.primary(t('s8.done'), '', 'check')); } },
    { id: 'settings-about', route: 'S5', title: 'About this app', flag: 'EXISTS',
      purpose: 'Version, legal links, the not-a-tax-document line and the web delete page.', primary: 'Open (each link row).', taps: '1 tap per link.',
      rules: 'Not-tax statement is its own block. Web delete address shown in full so it can be read out.',
      notes: 'The address below is a placeholder, not the real origin: the real value is passed in as deleteAccountUrl and I could not read it from code. Version is shown only when known.',
      body: function () {
        return hdr(t('s5.title')) + K.scroll(
          K.lrow('info', t('s5.version'), '0.0.0 (placeholder)', { noChev: true }), K.lrow('shield', t('s5.privacy'), t('settings.open')), K.lrow('receipt', t('s5.terms'), t('settings.open')), K.lrow('book', t('s5.licences'), t('settings.open')),
          note(t('s5.notTax')), note(t('s5.webDelete')), K.lrow('globe', 'https://[API origin]/delete-account/', t('settings.open')));
      } },
    { id: 'settings-help-pending', route: 'S6', title: 'Help and contact: grievance officer not published', flag: 'CHG',
      purpose: 'Be honest that no officer is named yet, and give a next route.', primary: 'Use the web account page for requests.', taps: '1 tap.',
      rules: 'Never show a contact the app has not been given. DPDP needs a named officer: blocked on a human item (HUMAN-ACTIONS).',
      notes: 'As built: s6.pending only. The next-route row is proposed, and uses the real web page, not an invented address.',
      review: 'Blocked until the grievance officer is named and published; the next-route row is a proposal.',
      body: function () {
        return hdr(t('s6.title')) + K.scroll(K.sec(t('s6.grievance')), K.banner('info', 'info', t('s6.pending')),
          K.lrow('globe', K.N('Request help or deletion on the web'), K.N('Opens the privacy page'))); } },
    { id: 'settings-help-published', route: 'S6', title: 'Help and contact: officer published (SPECIMEN)', flag: 'EXISTS',
      purpose: 'How it will look once a name and address are supplied.', primary: 'Select the address to copy or write to it.', taps: '1 tap.',
      rules: 'SPECIMEN ONLY: the name and address are made up for layout and must never ship.',
      notes: 'A long address is one unbreakable word: it wraps inside the card (flexShrink as built).',
      body: function () {
        return hdr(t('s6.title')) + K.scroll(K.banner('warn', 'warn', K.N('SPECIMEN, not a real contact')), K.sec(t('s6.grievance')),
          '<div class="lrow"><span class="lt"><b>Officer name (specimen)</b><small style="overflow-wrap:anywhere">officer-name@example.invalid</small></span></div>'); } },
    { id: 'settings-logout', route: 'A8', title: 'Log out: everything saved', flag: 'EXISTS',
      purpose: 'Confirm log out and say what signing back in needs.', primary: 'Stay signed in and Log out have equal size.', taps: '2 taps to log out.',
      rules: 'No confirm-shaming; the safe option is first and plain.',
      notes: 'a8.body says a new SMS code is needed. Both buttons are equal weight.',
      body: function () {
        return hdr(t('a8.bar')) + K.scroll(note('<b>' + t('a8.title', { shop: SHOP }) + '</b>'), note(t('a8.body', { phone: '98765 43210' })), K.banner('info', 'check', t('a8.saved'))) +
          K.sticky(K.primary(t('a8.stay'), '', 'undo'), K.primary(t('a8.logout'), 'outline', 'logout')); } },
    { id: 'settings-logout-pending', route: 'A8', title: 'Log out: entries not yet synced', flag: 'EXISTS',
      purpose: 'Warn that entries are still waiting and where they stay.', primary: 'Stay signed in (first).', taps: '1 tap to stay.',
      rules: 'Amber icon plus words, not red; nothing is lost.',
      notes: 'a8.pending (n entries) and a8.pendingOne are the two real wordings; 3 is shown.',
      body: function () {
        return hdr(t('a8.bar'), K.chip('wait', 3)) + K.scroll(note('<b>' + t('a8.title', { shop: SHOP }) + '</b>'), note(t('a8.body', { phone: '98765 43210' })), K.banner('', 'clock', t('a8.pending', { n: 3 }))) +
          K.sticky(K.primary(t('a8.stay'), '', 'undo'), K.primary(t('a8.logout'), 'outline', 'logout')); } },
    { id: 'settings-lock', route: 'S11', title: 'App lock cover', flag: 'EXISTS',
      purpose: 'The book is hidden until the phone lock is passed.', primary: 'Unlock.', taps: '1 tap, then the phone lock.',
      rules: 'No figures behind the cover; the lock is the phone\'s own.', notes: 'Free for everyone (security is not behind a paywall).',
      body: function () { return K.center(K.empty('lock', t('s11.body'), t('s11.unlock'), 'key').replace('<p>', '<h2>' + t('s11.title') + '</h2><p>')); } },
    { id: 'settings-lock-paused', route: 'S11', title: 'App lock paused (no phone lock now)', flag: 'EXISTS',
      purpose: 'The phone lost its screen lock, so the app lock is paused and the book opens.', primary: 'Set a screen lock in the phone settings.', taps: '0 in app.',
      rules: 'The pause is stated, never silent.', notes: 'Copy s11.paused; it appears over the app, here on the hub.',
      body: function () { return hub({ extra: K.refbanner(t('s11.paused'), '', true) }); } },
    { id: 'settings-devices', route: 'NEW', title: 'Signed-in phones', flag: 'NEW',
      purpose: 'See which phones are signed in and sign out a lost one.', primary: 'Sign out a phone.', taps: '3 taps: Settings, Signed-in phones, Sign out.',
      rules: 'This phone is marked in words; only phones of this shop are listed (shop from the session).',
      notes: 'API: POST /v1/auth/devices/:id/revoke exists and checks the shop. GET /v1/devices exists but returns 501 until the repo implements listDevices, which nothing does yet. The only description a device has is its platform (no label), so rows read "Android phone".',
      review: 'Needs backend work: implement listDevices in the repo and add a device label; revoke is ready.',
      body: function () { return hdr(K.N('Signed-in phones')) + K.scroll(note(K.N('Phones that can open this shop book. Sign out one you no longer have.')), DEVS(true)); } },
    { id: 'settings-devices-confirm', route: 'NEW', title: 'Sign out a phone: confirm', flag: 'NEW',
      purpose: 'Confirm signing out the other phone.', primary: 'Sign out that phone and Keep it signed in, equal weight.', taps: '1 tap to confirm.',
      rules: 'Says what happens and how to undo: that phone needs a new SMS code to come back. A refresh-token reuse already revokes a device server-side.',
      notes: 'Entries on that phone not yet synced stay there; say so in a final copy pass.',
      body: function () {
        return hdr(K.N('Signed-in phones')) + K.scroll(DEVS(true)) +
          K.dialog(K.N('Sign out that phone?'), '<p>' + K.N('It will need a new SMS code to open this book again. Entries already saved are not removed.') + '</p>' + K.primary(K.N('Keep it signed in'), '', 'undo') + K.primary(K.N('Sign out that phone'), 'outline', 'logout')); } },
    { id: 'settings-devices-done', route: 'NEW', title: 'Signed-in phones: signed out', flag: 'NEW',
      purpose: 'Confirm the lost phone is out.', primary: 'None.', taps: '0.', rules: 'Status in icon plus words.',
      notes: 'Only this phone remains in the list.',
      body: function () { return hdr(K.N('Signed-in phones')) + K.scroll(DEVS(false)) + K.toast('check', K.N('That phone is signed out')); } },
    { id: 'settings-devices-unavailable', route: 'NEW', title: 'Signed-in phones: cannot load', flag: 'NEW',
      purpose: 'The list cannot be fetched (offline, or the server cannot list yet).', primary: 'Try again.', taps: '1 tap.',
      rules: 'Calm, one next step, no list drawn rather than a guessed one.', notes: 'Today the API answers 501 here, which would land in this frame.',
      body: function () { return hdr(K.N('Signed-in phones'), K.chip('off')) + K.scroll(K.refuse(t('refusal.titleNotDone'), K.N('The list of phones could not be loaded. Try again with signal.')), K.stack(K.primary(t('common.retry'), '', 'refresh'))); } }
  ] };
})();
