/* AREA: Ledger / Parties tab (P1, Add customer, P2, P6, P3). Copy by literal key; a string that does not exist is K.N(...).
   Money is integer paise through K.M. Every status has an icon and words. Balances in the frames are derived from the entries drawn. */
(function () {
  var t = K.t, M = K.M;

  /* ---- demo book (paise). Customers: balance = sum of the entries in the P2 history frame for Ramesh; the others are list-only. ---- */
  var RAMESH = 480000;                       /* 350000 + 60000 - 50000 + 120000, see HIST */
  var SUNITA = 215000, BIJAY = 90000, LAKSHMI = 0, PRADEEP = -15000;
  var TO_COLLECT = RAMESH + SUNITA + BIJAY;  /* 785000: sum of positive balances (assumed; the engine's P7 decides how an advance nets) */
  var SUP1 = 1840000, SUP2 = 320000, YOU_OWE = SUP1 + SUP2; /* 2160000 */

  function top(chip) { return K.top({ title: t('p1.title'), right: chip || K.chip('ok') }); }
  function sub(back, title, chip) { return K.top({ title: title, back: true, right: chip || K.chip('ok') }); }
  function hero(a, b) {
    return '<section class="hero"><div class="lbl"><span class="hi">' + K.ico('book', 28) + '</span><span>' + t('p1.toCollect') + '</span></div><div class="fig">' + M(a, { cls: 'hero-fig' }) + '</div>' +
      '<div class="ln"><span class="k">' + K.ico('tray', 20, 'dirico') + t('p1.youOwe') + '</span>' + M(b) + '</div></section>';
  }
  function tag(icon, text) { return '<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px">' + K.ico(icon, 18) + text + '</span>'; }
  function changed(p) { return tag('up', t('p1.changedToday') + ' ' + M(p, { sign: true })); }
  function addBtn() { return K.stack(K.btn2('+ ' + t('party.newCustomer'), '')); }
  function custRows() {
    return K.list([
      K.prow(K.nm('ramesh'), 0, '<span style="display:block">' + changed(120000) + '</span>', RAMESH, t('picker.owes')),
      K.prow(K.nm('sunita'), 1, '<span style="display:block">' + tag('calendar', t('p1.overdue')) + '</span>', SUNITA, t('picker.owes')),
      K.prow(K.nm('bijay'), 2, '', BIJAY, t('picker.owes')),
      K.prow(K.nm('lakshmi'), 3, '', LAKSHMI, t('picker.settled')),
      K.prow(K.nm('pradeep'), 4, '<span style="display:block">' + tag('info', t('advance.label')) + '</span>', -PRADEEP, t('advance.label'))
    ]);
  }
  function supRows() {
    return K.list([
      K.prow('Mohanty Traders', 0, '', SUP1, t('picker.youOwe')),
      K.prow('Odisha Wholesale', 1, '', SUP2, t('picker.youOwe'))
    ]);
  }
  function segs(on) { return K.stack(K.seg([t('p1.customers'), t('p1.suppliers')], on, ['user', 'box'])); }

  /* P2 history, newest first. Delta in paise: + means more owed. Sum = RAMESH. */
  function hline(title, time, mode, delta) {
    return K.lrow('receipt', title, time + ' · ' + mode, { right: M(delta, { sign: true }) });
  }
  function hist() {
    return K.sec(t('p2.ledger')) +
      hline(t('section.udhar_sales'), '11:20', t('formA.mode.udhar'), 120000) +
      hline(t('section.udhar_collection'), '16:05, 14 ' + t('t1.month.10'), t('formA.mode.cash'), -50000) +
      hline(t('section.udhar_sales'), '10:40, 8 ' + t('t1.month.10'), t('formA.mode.udhar'), 60000) +
      hline(t('section.udhar_sales'), '18:15, 3 ' + t('t1.month.10'), t('formA.mode.udhar'), 350000);
  }
  function nameBlock(name, i) {
    return '<div style="display:flex;align-items:center;gap:12px;padding:6px 16px">' + K.avatar(name, i || 0) + '<b style="font-size:1.35em;line-height:1.3">' + name + '</b></div>';
  }
  function p2hero(label, paise) {
    return '<section class="hero"><div class="lbl"><span class="hi">' + K.ico('book', 28) + '</span><span>' + label + '</span></div><div class="fig">' + M(paise, { cls: 'hero-fig' }) + '</div></section>';
  }
  function p2actions() { return K.sticky(K.primary(t('act.collect'), '', 'tray'), K.primary(t('p2.newUdhar'), 'tonal', 'book')); }
  function p2links(o) {
    o = o || {};
    return K.sec(t('p2.share')) +
      K.lrow('wa', t('p2.remind'), o.noPhone ? t('p2.noPhone') : t('p2.remindNote')) +
      K.lrow('share', t('p2.statement')) +
      K.lrow('shield', t('p2.limit'), o.limit ? M(o.limit) : t('p2.noLimit'));
  }
  function phoneRow(has) {
    return has ? K.lrow('phone', '9437012345', K.N('Change mobile number', 'edit saved number; proposal, the app only adds today'), {}) : '';
  }
  function phoneAdd(val, err) {
    return '<div class="stack">' + K.field(t('p2.addPhone'), val, { focus: !err, err: err, ph: '98XXXXXXXX', help: err ? t('party.refusal.phone') : '' }) + K.primary(t('p2.savePhone'), val ? '' : 'dis', 'phone') + '</div>';
  }
  function limitHead(name) { return '<div style="padding:8px 16px;line-height:1.5">' + t('p6.prompt', { name: name }) + '</div>'; }
  function limitLines(cur) {
    return '<div class="ln" style="display:flex;justify-content:space-between;padding:6px 16px;font-weight:700"><span>' + t('p6.current') + '</span><span>' + (cur ? M(cur) : t('p2.noLimit')) + '</span></div>';
  }
  function limitFoot(amt, cur) {
    return K.sticky(
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 4px"><span>' + t('p6.amount') + '</span>' + M(amt || 0, { cls: 'hero-fig' }) + '</div>' +
      K.primary(t('p6.save'), amt ? '' : 'dis', 'check') + K.keypad());
  }

  SPEC.area = { title: 'Ledger / Parties', intro: 'Mitra Ledger tab. One hero ("Udhar to collect") with "You owe suppliers" under it, customers sorted by what they owe with the 31+ days and changed-today tags as icon plus words, a Customers or Suppliers segment, customer detail with one primary button (Collect), credit limit, and supplier detail. Owes-lookup is 2 taps from Today by either route. Hindi and Odia copy is a DRAFT (H13).', screens: [
    {
      id: 'ledger-list', route: 'P1', title: 'Ledger: customers, most owed first', flag: 'CHG',
      purpose: 'Answer "who owes me, how much" from the list itself. The two shop totals stay separate (never netted).',
      primary: 'Tap a person (opens P2). Secondary: + New customer.',
      taps: 'Owes-lookup from Today: Ledger tab (1) + person (2) = 2 taps; or the "Udhar to collect" figure on Today (1) + person (2) = 2 taps. Target under 10 s. Counted from frames, no real user timed.',
      rules: 'Row figure = balance over every day on the phone, derived on read. Tags are icon + words (clock/calendar, up arrow, info), never colour only. Advance person: state word "Advance", never a silent minus (QA-03).',
      notes: 'As built, Customers and Suppliers are two stacked cards; here they are a two-way segment so the first screen holds the hero, the add button and about five people. Sorted by balance, largest first; Lakshmi (settled) and Pradeep (advance) fall to the bottom. 31+ days tag: the app today shows none because the credit date is not held in this store (P1.tsx comment); the tag is drawn as the target, only shown when that date exists. Hero total is the sum of the positive balances here (assumed; the engine P7 decides how an advance nets).',
      review: 'The 31+ days tag needs the credit date in the store (built code says it has none); and Customers/Suppliers as a segment replaces two stacked cards.',
      body: function () { return top() + K.scroll(hero(TO_COLLECT, YOU_OWE), segs(0), addBtn(), custRows()) + K.tabs('parties'); }
    },
    {
      id: 'ledger-suppliers', route: 'P1', title: 'Ledger: suppliers segment', flag: 'CHG',
      purpose: 'The other question: who the shop owes. Same row shape, wording "you owe".',
      primary: 'Tap a supplier (opens P3).',
      taps: '2 taps from Today (Ledger tab, Suppliers, supplier = 3 with the segment).',
      rules: 'Kept separate from customers; never merged into one net figure (P1.tsx).',
      notes: 'Supplier names are shown as typed. Supplier add (party.addSupplier) is reached from the Pay supplier picker, as built; no add button here.',
      body: function () { return top() + K.scroll(hero(TO_COLLECT, YOU_OWE), segs(1), supRows()) + K.tabs('parties'); }
    },
    {
      id: 'ledger-advance', route: 'P1', title: 'Ledger: a person who paid more than they owed', flag: 'CHG',
      purpose: 'QA-03. A negative balance is an advance: the shop holds their money. It is said in words, not shown as a bare minus.',
      primary: 'Tap the person to see the entries behind it.',
      taps: '2 taps from Today.',
      rules: 'QA-03 and D2. The row shows the word "Advance" with the amount; the banner explains in a sentence. No inference: the app does not suggest what to do with it.',
      notes: 'As built, the row shows word + positive figure (P1.tsx). The explanation banner is added here; the Advance word already exists (advance.label). Advance is not counted inside "Udhar to collect" here (assumed).',
      body: function () {
        return top() + K.scroll(hero(TO_COLLECT, YOU_OWE), segs(0), K.banner('info', 'info', K.N('This person paid more than was owed. The extra is an advance you hold for them. It is not udhar to collect.', 'explains an advance row')), custRows()) + K.tabs('parties');
      }
    },
    {
      id: 'ledger-empty', route: 'P1', title: 'Ledger: first time, nobody added yet', flag: 'CHG',
      purpose: 'A new book has no customers. The next action is to add the first one.',
      primary: '+ New customer.',
      taps: '1 tap to the add form.',
      rules: 'Never "nothing here yet" alone: the sentence is followed by the button. Totals show ₹0.00, derived.',
      notes: 'As built, p1.empty is text only (no button); the button is added.',
      body: function () { return top() + K.scroll(hero(0, 0), K.empty('users', t('p1.empty'), '+ ' + t('party.newCustomer'), '')) + K.tabs('parties'); }
    },
    {
      id: 'ledger-loading', route: 'P1', title: 'Ledger: loading', flag: 'EXISTS',
      purpose: 'The list is being read from the phone. Placeholder shapes, no spinner.',
      primary: 'None; waits.', taps: 'n/a',
      rules: 'Skeleton matches hero and rows so nothing jumps.',
      notes: 'common.loading is the accessible name only.',
      body: function () { return top() + '<div class="scroll" aria-busy="true" aria-label="' + t('common.loading') + '">' + K.skel(5) + '</div>' + K.tabs('parties'); }
    },
    {
      id: 'ledger-error', route: 'P1', title: 'Ledger: could not open', flag: 'EXISTS',
      purpose: 'The list failed to open. Say nothing is lost; one next step.',
      primary: 'Try again.', taps: '1 tap.',
      rules: 'Calm words, icon + words, not colour only.',
      notes: 'Same pattern as Today error.',
      body: function () { return top() + K.scroll(K.banner('err', 'warn', t('common.error'), t('common.retry')), K.empty('refresh', t('common.error'), t('common.retry'), 'refresh')) + K.tabs('parties'); }
    },
    {
      id: 'ledger-offline', route: 'P1', title: 'Ledger: offline, entries waiting', flag: 'CHG',
      purpose: 'No network. The list is the phone\'s own book; entries are safe and wait to send.',
      primary: 'Keep working; open a person.',
      taps: '2 taps, same as online.',
      rules: 'Sync chip amber with a clock and a count, never red; it is in the header (USABILITY item 8).',
      notes: 'The figures are the phone\'s own and may lack other devices\' entries until the queue drains.',
      body: function () { return top(K.chip('wait', 3)) + K.scroll(K.banner('info', 'cloudoff', t('sync.waitingLong', { n: 3 })), hero(TO_COLLECT, YOU_OWE), segs(0), custRows()) + K.tabs('parties'); }
    },
    {
      id: 'ledger-add', route: 'P1', title: 'Add customer: name and phone', flag: 'CHG',
      purpose: 'Add a person to the book. Name is required; phone is optional (needed later for the WhatsApp reminder).',
      primary: 'Save.',
      taps: 'Name letters, Save = 2 taps plus typing (a phone number adds one tap per figure and a field change).',
      rules: 'The app never suggests a name or reads contacts: typed exactly as entered. No refusal is shown before a tap.',
      notes: 'As built the add form lives inside the party picker (party.save reads "Save and choose"). Here it is also reached from Ledger via "+ New customer", saving back to the list; the Save label is common.save for that reason (party.save would say "choose" with nothing to choose). The keyboard is the phone\'s own and is not drawn.',
      review: 'Add-customer from the Ledger tab is new; today it is reachable only from a picker inside a sale or collection.',
      body: function () {
        return sub(true, t('party.newCustomer')) + K.scroll(K.stack(K.field(t('party.name'), 'Kamala', { focus: true }), K.field(t('party.phone'), '', { ph: '98XXXXXXXX' }))) + K.sticky(K.primary(t('common.save'), '', 'check'), K.quiet(t('party.backToList')));
      }
    },
    {
      id: 'ledger-add-refusal', route: 'P1', title: 'Add customer: refused (no name / bad number)', flag: 'EXISTS',
      purpose: 'Two refusals, shown only after Save is tapped: no name; a number that is not a valid Indian mobile number.',
      primary: 'Fix the field and Save again. Phone may be left empty.',
      taps: 'Shown after 1 tap on Save.',
      rules: 'party.refusal.name and party.refusal.phone. Text under the field plus an alert banner, icon + words. The refusal clears when the form is reopened; it never leaks into the next form.',
      notes: 'Frame shows the bad-number case; the empty-name case has the same layout with party.refusal.name under Name.',
      body: function () {
        return sub(true, t('party.newCustomer')) + K.scroll(K.refuse(t('refusal.title'), t('party.refusal.phone')), K.stack(K.field(t('party.name'), 'Kamala', {}), K.field(t('party.phone'), '98765', { err: true, help: t('party.refusal.phone') }))) + K.sticky(K.primary(t('common.save'), '', 'check'), K.quiet(t('party.backToList')));
      }
    },
    {
      id: 'ledger-add-saved', route: 'P1', title: 'Add customer: saved, back on the list', flag: 'CHG',
      purpose: 'Confirms the add and shows the new person on the list at Rs 0.00.',
      primary: 'Tap the new person to start a udhar sale or add a number.',
      taps: '1 tap to open them.',
      rules: 'Append-only book: a person is added, never edited away. Zero balance reads "nothing owed" in words.',
      notes: 'Toast uses entry.saved. Kamala sorts with the settled people.',
      body: function () {
        var rows = K.list([
          K.prow(K.nm('ramesh'), 0, '<span style="display:block">' + changed(120000) + '</span>', RAMESH, t('picker.owes')),
          K.prow(K.nm('sunita'), 1, '', SUNITA, t('picker.owes')),
          K.prow(K.nm('bijay'), 2, '', BIJAY, t('picker.owes')),
          K.prow('Kamala', 3, '', 0, t('picker.settled'))
        ]);
        return top() + K.scroll(hero(TO_COLLECT, YOU_OWE), segs(0), addBtn(), rows) + K.toast('check', t('entry.saved')) + K.tabs('parties');
      }
    },
    {
      id: 'ledger-p2', route: 'P2', title: 'Customer: balance, one Collect button, history', flag: 'CHG',
      purpose: 'One person. How much they owe now (all days), the one action Collect, and the entries behind the figure.',
      primary: 'Collect (solid teal, fixed at the foot). Quiet second: New udhar sale.',
      taps: 'Collect: Collect (1), digits, Add. Owes-lookup is answered by the hero on arrival (2 taps from Today).',
      rules: 'Hero = balance over all days on the phone, derived. The history rows show the mode and the time; a sale on udhar adds to what is owed, a collection reduces it, signs printed. Append-only: no edit or delete on any row. D2: only the Cash collection touches the drawer; the udhar sales do not.',
      notes: 'History here is complete, so the hero equals the sum: +₹3,500.00 +₹600.00 -₹500.00 +₹1,200.00 = ₹4,800.00. As built the lines show a label and a signed amount; the time and mode in the second line are added. Remind, statement and credit limit sit under "Remind and share". Rows are buttons because they lead to the correction route (see the correction frame); as built the lines are not tappable.',
      review: 'Mode and time on each history row, and tappable rows leading to a correction, are additions to the built P2.',
      body: function () {
        return sub(true, t('p2.title')) + K.scroll(nameBlock(K.nm('ramesh'), 0), p2hero(t('p2.balanceAll'), RAMESH), '<div class="ln" style="padding:4px 16px">' + changed(120000) + '</div>', p2links({}), hist()) + p2actions();
      }
    },
    {
      id: 'ledger-p2-phone', route: 'P2', title: 'Customer: no phone saved, add one', flag: 'CHG',
      purpose: 'Reminders need a number. With none saved the way to add it is right here.',
      primary: 'Save number (beside the field; Done on the keyboard saves too).',
      taps: 'Typing the number + Save number = 1 tap plus one per figure.',
      rules: 'The number is exactly as typed: no contact lookup, no suggestion. Saving moves no figure.',
      notes: 'As built, the number can be added only while none is saved; once saved, the page shows no way to change it. Frame ledger-p2-remind shows a saved number with a "Change mobile number" row, which is a proposal.',
      review: 'Editing a saved number is not possible in the built app; proposed here.',
      body: function () {
        return sub(true, t('p2.title')) + K.scroll(nameBlock(K.nm('sunita'), 1), p2hero(t('p2.balanceAll'), SUNITA), p2links({ noPhone: true }), phoneAdd('', false)) + p2actions();
      }
    },
    {
      id: 'ledger-p2-nophone-refusal', route: 'P2', title: 'Customer: tapped WhatsApp with no number', flag: 'EXISTS',
      purpose: 'Reminder tapped but no number is saved. Say why and point to the fix on the same page.',
      primary: 'Add the number in the field above.',
      taps: 'Shown after 1 tap on the reminder row.',
      rules: 'refusal.noPhone under the heading "Could not do that" (nothing was being saved). Nothing is sent; WhatsApp is not opened.',
      notes: 'Refusal appears only after the tap, not before.',
      body: function () {
        return sub(true, t('p2.title')) + K.scroll(nameBlock(K.nm('sunita'), 1), p2hero(t('p2.balanceAll'), SUNITA), p2links({ noPhone: true }), phoneAdd('', false)) + p2actions() + K.refbanner(t('refusal.titleNotDone'), t('refusal.noPhone'), true);
      }
    },
    {
      id: 'ledger-p2-remind', route: 'P2', title: 'Customer: WhatsApp reminder handed over', flag: 'EXISTS',
      purpose: 'The app writes a polite message and hands it to WhatsApp. The shopkeeper presses send there. The app sends nothing.',
      primary: 'In WhatsApp: Send (outside the app).',
      taps: 'Remind row (1 tap), then Send in WhatsApp (1 tap).',
      rules: 'Nothing is sent by the app; the text states the amount due as derived from the book. The message is fixed copy (remind.text), not written by inference.',
      notes: 'The panel is a drawing of what WhatsApp shows after the hand-off, not an in-app screen. A saved number is shown with a change row (proposal).',
      body: function () {
        var msg = t('remind.text', { name: K.nm('ramesh'), shop: K.shop, amount: K.rupee(RAMESH) });
        var inner = '<div class="banner info">' + K.ico('wa', 24) + '<span>' + K.N('WhatsApp opens here, outside the app', 'describes the hand-off') + '</span></div><div style="margin:10px 16px;padding:12px 14px;border-radius:16px;background:var(--surface);border:1px solid var(--rule);line-height:1.5">' + msg + '</div>' + K.banner('info', 'info', t('p2.remindNote'));
        return sub(true, t('p2.title')) + K.scroll(nameBlock(K.nm('ramesh'), 0), p2hero(t('p2.balanceAll'), RAMESH), phoneRow(true), p2links({})) + p2actions() + K.sheet(t('p2.remind'), inner);
      }
    },
    {
      id: 'ledger-p2-settled', route: 'P2', title: 'Customer: nothing owed, reminder refused', flag: 'CHG',
      purpose: 'A settled customer. Tapping the reminder says why there is nothing to send.',
      primary: 'New udhar sale or Collect stays available.',
      taps: 'Refusal shown after 1 tap.',
      rules: 'refusal.nothingDue. No reminder is made for nothing; no figure invented.',
      notes: 'As built the reminder row is hidden when nothing is owed, so this refusal is not reachable from the screen today. Here the row stays visible and explains itself (a hidden row gives no reason).',
      review: 'Keeping the reminder row visible when nothing is due, to show refusal.nothingDue, differs from the built P2.',
      body: function () {
        return sub(true, t('p2.title')) + K.scroll(nameBlock(K.nm('lakshmi'), 3), p2hero(t('p2.balanceAll'), 0), p2links({ limit: 1000000 }), K.sec(t('p2.ledger')) + hline(t('section.udhar_collection'), '12:05', t('formA.mode.cash'), -50000) + hline(t('section.udhar_sales'), '09:30, 14 ' + t('t1.month.10'), t('formA.mode.udhar'), 50000)) + p2actions() + K.refbanner(t('refusal.titleNotDone'), t('refusal.nothingDue'), true);
      }
    },
    {
      id: 'ledger-p2-advance', route: 'P2', title: 'Customer: advance held (paid more than owed)', flag: 'CHG',
      purpose: 'QA-03. The hero says "Advance" and the amount held, in place of a negative balance.',
      primary: 'Collect and New udhar sale stay; a sale on udhar is set against the advance.',
      taps: '2 taps from Today to see this.',
      rules: 'No silent minus: the label is advance.label with the amount as a positive figure and a sentence. The confirm that creates an advance ("This is ... more than they owe") belongs to the Collect form.',
      notes: 'Reminder row hidden (nothing is due). Explanatory sentence is new text.',
      body: function () {
        return sub(true, t('p2.title')) + K.scroll(nameBlock(K.nm('pradeep'), 4), p2hero(t('advance.label'), -PRADEEP), K.banner('info', 'info', K.N('You hold this for them. They paid more than they owed. Nothing is due from them.', 'explains advance on P2')), K.sec(t('p2.share')) + K.lrow('share', t('p2.statement')) + K.lrow('shield', t('p2.limit'), t('p2.noLimit'))) + p2actions();
      }
    },
    {
      id: 'ledger-p2-empty', route: 'P2', title: 'Customer: no entries yet', flag: 'CHG',
      purpose: 'A person just added. History is empty; the next action is the first udhar sale.',
      primary: 'New udhar sale (promoted to primary while history is empty).',
      taps: '1 tap.',
      rules: 'Balance ₹0.00, derived. No "usual" amount suggested.',
      notes: 'As built, p2.empty is text and Collect stays primary. Collect has nothing to collect, so the primary here is the sale (proposal).',
      review: 'Primary button switches to New udhar sale when the history is empty.',
      body: function () {
        return sub(true, t('p2.title')) + K.scroll(nameBlock('Kamala', 3), p2hero(t('p2.balanceAll'), 0), K.empty('book', t('p2.empty')), p2links({ noPhone: true }), phoneAdd('', false)) + K.sticky(K.primary(t('p2.newUdhar'), '', 'book'), K.primary(t('act.collect'), 'tonal', 'tray'));
      }
    },
    {
      id: 'ledger-p2-correct', route: 'P2', title: 'Customer: correcting an entry (new dated entry)', flag: 'NEW',
      purpose: 'Tap a history row to see it and, if it was wrong, post a correction. The original stays; a new dated entry refers to it.',
      primary: 'Post a correction.',
      taps: 'Row (1), Post a correction (2), then the amount form.',
      rules: 'D1 append-only: no Edit, no Delete. The sheet states that the original stays on the list. D7: if the entry\'s day is closed, the correction is still a new entry dated today.',
      notes: 'Not in the built P2: lines there are not tappable and the correction route (T16, "Post a correction") starts from Today. This frame shows the proposed route from the person. The amount form itself is in another area.',
      review: 'A correction route starting from a party\'s history row does not exist today.',
      body: function () {
        var inner = '<div style="padding:4px 16px;line-height:1.5"><b>' + t('section.udhar_collection') + '</b><br>16:05, 14 ' + t('t1.month.10') + ' · ' + t('formA.mode.cash') + '<br>' + M(-50000, { sign: true }) + '</div>' + K.banner('info', 'info', K.N('The original stays in the book. A correction is added as a new entry with today\'s date that points to it.', 'append-only explanation')) + K.stack(K.primary(t('t3.correction'), '', 'pencil'), K.quiet(t('party.cancel')));
        return sub(true, t('p2.title')) + K.scroll(nameBlock(K.nm('ramesh'), 0), p2hero(t('p2.balanceAll'), RAMESH), hist()) + p2actions() + K.sheet(K.N('This entry', 'sheet title'), inner);
      }
    },
    {
      id: 'ledger-p2-error', route: 'P2', title: 'Customer: could not open', flag: 'EXISTS',
      purpose: 'The detail failed to open. Nothing is lost.',
      primary: 'Try again.', taps: '1 tap.',
      rules: 'Calm words, icon + words.',
      notes: 'Loading uses the same skeleton as the Ledger list loading frame.',
      body: function () { return sub(true, t('p2.title')) + K.scroll(K.banner('err', 'warn', t('common.error'), t('common.retry')), K.empty('refresh', t('common.error'), t('common.retry'), 'refresh')); }
    },
    {
      id: 'ledger-p6', route: 'P6', title: 'Credit limit: set a limit', flag: 'EXISTS',
      purpose: 'Set the most udhar a customer may carry. The app tells him when a sale would go above it; it never stops a sale.',
      primary: 'Save limit (disabled until an amount above zero).',
      taps: 'Digits, Save limit = 1 tap plus digits.',
      rules: 'The limit is typed by the shopkeeper; no suggested amount. It warns, never blocks (p6.prompt). Rs 0 is refused after a tap.',
      notes: 'Current limit "Not set". The remove button appears only when a limit exists (next frame).',
      body: function () {
        return sub(true, t('p6.title')) + K.scroll(nameBlock(K.nm('ramesh'), 0), limitHead(K.nm('ramesh')), limitLines(0)) + limitFoot(1000000, 0);
      }
    },
    {
      id: 'ledger-p6-clear', route: 'P6', title: 'Credit limit: limit set, clear it, or refused at zero', flag: 'CHG',
      purpose: 'A limit exists. Removing it is one tap, says what happens, and typing 0 then Save is refused.',
      primary: 'Save limit for a new figure; Remove the limit is a quiet equal-weight button.',
      taps: 'Remove: 1 tap (takes effect at once).',
      rules: 'refusal.creditLimit after tapping Save with zero. Remove says what happens: entries and sales are untouched, only the warning goes. Never confirm-shaming.',
      notes: 'The refusal is drawn here with 0 typed; in the app it appears only after the tap. The built remove is a ghost button; here it is outlined for equal weight (proposal).',
      body: function () {
        return sub(true, t('p6.title')) + K.scroll(K.refuse(t('refusal.title'), t('refusal.creditLimit')), nameBlock(K.nm('ramesh'), 0), limitLines(1000000), K.stack(K.primary(t('p6.clear'), 'outline', 'undo')), K.banner('info', 'info', K.N('Removing the limit only stops the warning. No entry changes. You can set a limit again at any time.', 'clear limit consequence'))) + limitFoot(0, 1000000);
      }
    },
    {
      id: 'ledger-p3', route: 'P3', title: 'Supplier: what you owe, Pay supplier, history', flag: 'CHG',
      purpose: 'One supplier. How much the shop owes, the one action Pay supplier, and the entries behind the figure.',
      primary: 'Pay supplier (solid teal, fixed at the foot).',
      taps: 'Pay: Pay supplier (1), digits, Add.',
      rules: 'D2: a payment in Cash reduces the drawer; a purchase on credit adds to what is owed without moving cash. Out-flow printed with a minus sign. Append-only.',
      notes: 'As built, P3 headline is today\'s change (p1.changeToday) and the screen has no balance hero; the hero here is the balance owed (p3.owed), which is the figure the shopkeeper needs, matching P2. History is complete: +₹20,000.00 -₹1,600.00 = ₹18,400.00.',
      review: 'P3 headline changes from today\'s change to the balance owed.',
      body: function () {
        var h = K.sec(t('p2.ledger')) +
          K.lrow('tray', t('section.party_payment'), '15:30, 15 ' + t('t1.month.10') + ' · ' + t('formA.mode.cash'), { right: M(-160000, { sign: true }) }) +
          K.lrow('receipt', t('section.purchase'), '10:10, 2 ' + t('t1.month.10') + ' · ' + t('formA.mode.udhar'), { right: M(2000000, { sign: true }) });
        return sub(true, t('p3.title')) + K.scroll(nameBlock('Mohanty Traders', 0), p2hero(t('p3.owed'), 1840000), h) + K.sticky(K.primary(t('t8.title.pay'), '', 'tray'));
      }
    },
    {
      id: 'ledger-p3-empty', route: 'P3', title: 'Supplier: no entries yet', flag: 'EXISTS',
      purpose: 'A supplier with no history. The next action is the first payment or purchase.',
      primary: 'Pay supplier.', taps: '1 tap.',
      rules: 'Balance ₹0.00 derived; nothing invented.',
      notes: 'As built p3.empty is text; the button is always present at the foot.',
      body: function () { return sub(true, t('p3.title')) + K.scroll(nameBlock('Odisha Wholesale', 1), p2hero(t('p3.owed'), 0), K.empty('box', t('p3.empty'))) + K.sticky(K.primary(t('t8.title.pay'), '', 'tray')); }
    }
  ] };
})();
