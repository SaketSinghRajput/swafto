/* AREA: Day close, end to end (T5 list, UPI check, adjustments, T19, T11 count, T13 balanced, T12 difference, closing, T14 closed).
   Demo day, all integer paise and consistent across frames:
   opening 1200000; cash sales +720000; udhar collected in cash +215000; cash purchase -150000; cash expenses -40000;
   paid to suppliers -60000; owner took -40000  =>  should be 1845000 (D2: the 145000 of UPI receipts moves no cash).
   Net sales 827000 (cash 720000 + UPI 107000), purchases 150000, expenses 40000 => estimated profit 637000 (withdrawal outside, D3).
   Short case: counted 1815000, difference -30000, profit after cash difference 607000. Over case: counted 1870000, +25000. */
(function () {
  var t = K.t, M = K.M;
  var EXPECTED = 1845000;
  var UPI_ALL = 145000;

  function top(title, chip) { return K.top({ title: title, back: true, right: chip || K.chip('ok') }); }
  function card(title, inner) {
    return '<section style="margin:8px 12px 0;padding:8px 12px;background:var(--surface);border:2px solid var(--rule);border-radius:20px">' +
      (title ? '<div style="font-weight:700;padding:4px 0">' + title + '</div>' : '') + inner + '</section>';
  }
  function ln(label, right) { return '<div class="ln" style="border-top:2px dashed var(--rule);min-height:48px"><span class="k">' + label + '</span>' + right + '</div>'; }
  function para(txt, bold) { return '<p style="padding:8px 16px 0;line-height:1.5' + (bold ? ';font-weight:700' : '') + '">' + txt + '</p>'; }
  function radio(on, label) {
    return '<button class="lrow" role="radio" aria-checked="' + on + '" style="' + (on ? 'border-color:var(--act);background:var(--t1bg)' : '') + '"><span class="li">' + K.ico(on ? 'tick' : 'dash', 24) + '</span><span class="lt"><b>' + label + '</b></span></button>';
  }
  function hint() { return '<div style="text-align:center;color:var(--muted);line-height:1.4;padding:0 6px">' + K.N('Choose an answer above to close the day.', 'why Close the day is greyed') + '</div>'; }
  function dateTxt(old) { return old ? t('t1.day.3') + ' 18 ' + t('t1.month.11') : K.date(); }

  /* ---- T5 pieces ---- */
  function prog(done, skipped, old) {
    return '<div class="prog"><div class="pt"><b style="font-size:1.235em">' + t('t5.done', { done: done, total: 10 }) + '</b>' +
      (skipped ? '<small>' + t('t5.skippedCount', { n: skipped }) + '</small>' : '') +
      '<small>' + dateTxt(old) + ' · ' + K.shop + '</small></div>' + K.bar(done, 10) + '</div>';
  }
  function entriesTxt(n) { return n === 1 ? t('t5.entry') : t('t5.entries', { n: n }); }
  function doneRow(name, paise, n) { return K.row({ state: 'done', name: name, sub: t('state.entered') + ' · ' + entriesTxt(n), paise: paise }); }
  function openRow(num, name, isNext) { return K.row({ state: isNext ? 'next' : 'open', n: num, name: name, sub: t('state.untouched'), quiet: t('t5.nothingToday') }); }
  function skipRow(name) { return K.row({ state: 'skip', name: name, sub: t('state.skipped'), quiet: t('t5.undo') }); }
  function openingRow() { return K.row({ state: 'done', name: t('t6.title'), sub: t('t5.openingStep'), paise: 1200000 }); }
  function lockRows(firstName) {
    return K.row({ state: 'lock', name: t('t5.cashCheck'), sub: t('t5.locked') + (firstName ? ' · ' + t('t5.lockLine', { section: firstName }) : '') }) +
      K.row({ state: 'lock', name: t('t1.closeDay'), sub: t('t5.locked') + ' · ' + t('t5.closeLocked') });
  }
  function checkRow() { return '<li class="row next"><button class="row tap" style="margin:0;border:0;background:transparent;width:100%;padding:0"><span class="mk"><b>10</b></span><span class="nm">' + t('t5.cashCheck') + '<small>' + t('t5.countBox') + '</small></span></button></li>'; }
  function pinned(label) { return K.sticky(K.primary(label, '', 'chev')); }

  /* ---- UPI and adjustments cards ---- */
  function receipt(label, paise, actions) {
    return '<div class="ln" style="border-top:2px dashed var(--rule);min-height:64px;gap:6px"><span style="flex:1;display:flex;flex-direction:column;line-height:1.4"><span>' + label + '</span>' + M(paise) + '</span>' + (actions ? K.btn2(t('upi.tick'), 'check') : '') + '</div>';
  }
  function upiCard(mode, actions) {
    var h, body = '';
    if (mode === 'not') {
      h = '<div style="padding:2px 0 6px;font-weight:700">' + K.ico('info', 22) + ' ' + t('upi.status.not_checked') + '</div>' + ln(t('upi.expected'), M(UPI_ALL)) + ln(t('upi.confirmed'), M(0));
      if (actions) body = '<p style="padding:8px 0 6px;color:var(--muted);line-height:1.4">' + t('upi.note') + '</p>' + K.primary(t('upi.all', { n: 3, amount: K.rupee(UPI_ALL) }), 'tonal') +
        receipt(t('section.upi_sales'), 45000, true) + receipt(t('section.upi_sales'), 62000, true) + receipt(t('working.udhar_collected_upi'), 38000, true);
    } else if (mode === 'part') {
      h = '<div style="padding:2px 0 6px;font-weight:700">' + K.ico('clock', 22) + ' ' + t('upi.status.partly_checked', { done: 1, n: 3 }) + '</div>' + ln(t('upi.expected'), M(UPI_ALL)) + ln(t('upi.confirmed'), M(45000));
      if (actions) body = '<p style="padding:8px 0 6px;color:var(--muted);line-height:1.4">' + t('upi.note') + '</p>' + K.primary(t('upi.all', { n: 2, amount: K.rupee(100000) }), 'tonal') +
        receipt(t('section.upi_sales'), 62000, true) + receipt(t('working.udhar_collected_upi'), 38000, true);
    } else {
      h = '<div style="padding:2px 0 6px;font-weight:700">' + K.ico('check', 22) + ' ' + t('upi.status.checked') + '</div>' + ln(t('upi.expected'), M(UPI_ALL)) + ln(t('upi.confirmed'), M(UPI_ALL));
    }
    return card(t('upi.title'), h + body);
  }
  function adjCard(list, open) {
    var inner = list ? ln(t('adjustment.rounding_given'), M(2000)) : '<p style="padding:2px 0 6px;color:var(--muted);line-height:1.4">' + t('adjust.none') + '</p>';
    return card(t('adjust.title'), inner + (open ? '<div style="padding:6px 0 4px">' + K.primary(t('adjust.add'), 'tonal', 'plus') + '</div>' : ''));
  }

  /* ---- T11 ---- */
  function working() {
    return card('',
      '<div class="ln" style="min-height:48px"><span class="k">' + t('working.opening_cash') + '</span>' + M(1200000) + '</div>' +
      ln(t('working.cash_sales'), M(720000, { sign: true, tone: 'dir' })) +
      ln(t('working.udhar_collected_cash'), M(215000, { sign: true, tone: 'dir' })) +
      ln(t('working.cash_purchase'), M(150000, { out: true, tone: 'dir' })) +
      ln(t('working.cash_expenses'), M(40000, { out: true, tone: 'dir' })) +
      ln(t('working.cash_party_payment'), M(60000, { out: true, tone: 'dir' })) +
      ln(t('working.withdrawal_cash'), M(40000, { out: true, tone: 'dir' })));
  }
  function counted(p) {
    return '<div class="amt" style="flex-wrap:wrap;margin:8px 12px 0;padding:0 12px;border:2px solid var(--edge);border-radius:16px;background:var(--surface)"><span class="al">' + t('t11.counted') + '</span>' + M(p, { cls: 'amt-fig' }) + '</div>';
  }
  function countBody(p, refused) {
    return top(t('t11.title')) +
      '<div class="amt" style="flex-wrap:wrap;margin:0 12px;padding:0 4px;border-bottom:2px solid var(--rule)"><span class="al">' + t('t11.expected') + '</span>' + M(EXPECTED, { cls: 'amt-fig' }) + '</div>' +
      K.scroll(working()) +
      '<div style="flex:none">' + counted(p) + K.addbar(t('common.save'), 0, p === null) + K.keypad() + '</div>' +
      (refused ? K.refbanner(t('refusal.title'), t('refusal.amount'), true) : '');
  }

  /* ---- T12 ---- */
  function diffBody(kind, chosen) {
    var short = kind === 'short', diff = short ? -30000 : 25000, cnt = short ? 1815000 : 1870000;
    var hero = '<section class="hero" style="margin-top:8px"><div class="lbl"><span class="hi">' + K.ico(short ? 'down' : 'up', 28) + '</span><span>' + t('t12.difference') + '</span></div>' +
      '<div class="fig">' + M(diff, { sign: true, tone: 'dir', cls: 'hero-fig' }) + '</div>' +
      '<div class="ln"><span class="k">' + K.ico(short ? 'down' : 'up', 20, 'dirico') + (short ? t('working.cash_short') : t('working.cash_excess')) + '</span></div>' +
      '<div class="ln"><span class="k">' + t('t11.expected') + '</span>' + M(EXPECTED) + '</div>' +
      '<div class="ln"><span class="k">' + t('t11.counted') + '</span>' + M(cnt) + '</div></section>';
    var ask = short
      ? para(t('t12.check.prompt'), true) + para(t('t12.check.payments')) + para(t('t12.check.count')) +
        '<div style="padding:10px 12px 0">' + K.btn2(t('t12.recount'), 'refresh') + '</div>' + '<div role="radiogroup">' + radio(chosen, t('t12.markLoss')) + '</div>'
      : para(t('t12.reasonPrompt'), true) + '<div role="radiogroup">' + radio(chosen === 'sale', t('t12.reason.sale')) + radio(chosen === 'miscount', t('t12.reason.miscount')) + radio(chosen === 'unknown', t('t12.reason.unknown')) + '</div>';
    var can = !!chosen;
    return top(t('t12.title')) + K.scroll(hero, ask, upiCard('not', false)) +
      K.sticky(can ? '' : hint(), K.primary(t('t1.closeDay'), can ? '' : 'dis', can ? '' : 'lock'));
  }

  /* ---- T13 ---- */
  function balancedBody(busy) {
    var match = '<section class="hero" style="margin-top:8px;text-align:center"><div style="width:72px;height:72px;margin:4px auto;border-radius:50%;background:var(--t1bg);color:var(--t1ic);display:flex;align-items:center;justify-content:center">' + K.ico('check', 44) + '</div>' +
      '<div style="font-size:1.6em;font-weight:700;line-height:1.3">' + t('t13.matches') + '</div><div class="fig">' + M(EXPECTED, { cls: 'hero-fig' }) + '</div>' +
      '<div style="line-height:1.5;color:var(--muted)">' + t('t11.counted') + ' ' + M(EXPECTED) + ' · ' + t('t11.expected') + ' ' + M(EXPECTED) + '</div>' +
      '<p style="padding-top:8px;line-height:1.5">' + t('t13.everyRupee') + '</p></section>';
    var carry = card('', '<div class="ln" style="min-height:56px"><span class="k" style="flex:1;color:var(--muted)">' + t('t13.carry') + '</span>' + M(EXPECTED) + '</div>');
    return top(t('t13.title')) + K.scroll(match, carry, upiCard('all', false)) +
      K.sticky(busy ? K.primary(K.N('Closing the day', 'busy label while the day is being closed'), 'dis', 'clock') : K.primary(t('t1.closeDay'), '', 'lock'));
  }

  /* ---- T14 ---- */
  function doneBody(chip, offline) {
    var h = '<div class="lhero"><div class="h1"><span>' + t('t14.profit') + '</span><span class="big">' + M(637000, { cls: 'big' }) + '</span></div></div>';
    var figs = card('',
      '<div class="ln" style="min-height:48px"><span class="k">' + t('t14.netSales') + '</span>' + M(827000, { sign: true, tone: 'dir' }) + '</div>' +
      ln(t('t14.purchases'), M(150000, { out: true, tone: 'dir' })) +
      ln(t('t14.expenses'), M(40000, { out: true, tone: 'dir' })) +
      ln(t('p1.toCollect'), M(2150000)));
    var wd = card('', '<div class="ln" style="min-height:48px"><span class="k">' + t('t14.withdrawal') + '</span>' + M(40000, { out: true, tone: 'dir' }) + '</div>' +
      '<p style="padding:6px 0;color:var(--muted);line-height:1.5">' + t('t14.withdrawalNote') + '</p>');
    var cc = card(t('t14.cashCheck'),
      '<div class="ln" style="min-height:48px"><span class="k">' + t('t14.expected') + '</span>' + M(EXPECTED) + '</div>' +
      ln(t('t14.counted'), M(1815000)) +
      ln(t('t12.difference') + ' · ' + t('t12.reason.loss'), M(-30000, { tone: 'dir', sign: true })) +
      ln(t('t14.profitAfterCash'), M(607000, { tone: 'dir' })));
    return top(t('t14.title'), chip) + K.scroll(offline ? K.banner('info', 'cloudoff', t('sync.waitingLong', { n: 3 })) : '', h, figs, wd, cc, upiCard('part', false)) +
      K.sticky(K.primary(t('t14.done'), '', 'check'));
  }

  SPEC.area = {
    title: 'Day close',
    intro: 'The whole close, as one flow: the T5 list (opening cash counts as step 1, "nothing today" with a one-tap Undo, a locked cash check), the UPI check and typed adjustments cards, the T19 adjustment form, the cash count (T11) with its working, the balanced screen (T13), the difference screen (T12, reasons from a fixed list, no free text), the closing moment and the closed summary (T14). Demo day: should be ₹18,450.00 in the box. A UPI receipt never moves cash (D2); the withdrawal sits outside profit (D3); the actual UPI figure is the sum of receipts he ticks, never a bank balance.',
    screens: [
      {
        id: 'close-start', route: 'T5', title: 'Day close list: just started, cash check locked', flag: 'EXISTS',
        purpose: 'The day has opening cash and nothing else. He sees all the steps, which one is next, and that the cash check and the close come after.',
        primary: 'Pinned button at the foot: "Enter Cash sales" (the first section nobody has answered). Each row opens its own form; "Nothing today" is a quiet link on the row.',
        taps: 'Entering is on the forms. Per empty section: 1 tap on "Nothing today". See the end-to-end count on the "ready" frame.',
        rules: 'D8 three states: entered, said-to-be-empty, not yet, each a mark plus words, never colour alone. Opening cash is drawn as step 1 because the engine counts it (1 of 10). The cash check and the close are locked lines with a padlock and the reason in words. No keypad on this screen.',
        notes: 'At 2.0x the "Nothing today" link wraps under the row name; the list scrolls and the pinned button stays. Eleven rows do not fit one screen at 1.0x, so the lower rows and both cards sit below the fold (scroll).'
        , body: function () {
          var rows = openingRow() + openRow(2, t('section.cash_sales'), true) + openRow(3, t('section.upi_sales')) + openRow(4, t('section.udhar_sales')) + openRow(5, t('section.purchase')) +
            openRow(6, t('section.expense')) + openRow(7, t('section.udhar_collection')) + openRow(8, t('section.party_payment')) + openRow(9, t('section.withdrawal')) + lockRows(t('section.cash_sales'));
          return top(t('t5.title')) + K.scroll(prog(1, 0, false), K.list([rows])) + pinned(t('t5.next', { section: t('section.cash_sales') }));
        }
      },
      {
        id: 'close-mid', route: 'T5', title: 'Day close list: part way (done, skipped with Undo, open)', flag: 'EXISTS',
        purpose: 'Part way through. Entered rows show their figure and entry count; a skipped row says so and offers one-tap Undo; the rest are open.',
        primary: 'Pinned button: "Enter Expenses". Undo on a skipped row is one tap and needs no confirm.',
        taps: 'Skip a section: 1 tap. Undo a skip: 1 tap. Open a row: 1 tap.',
        rules: 'Skipped counts as answered (5 of 10 here: opening, cash, UPI, purchases and the skipped Credit sales), and the count of skipped sections is said under the total so "zero because nothing happened" and "zero because not reached" are never confused. Cash check still locked, with the section it is waiting for named.',
        notes: 'The next open row is tinted AND numbered so it is not found by colour. Figures are derived from the entries; none is stored.',
        body: function () {
          var rows = openingRow() + doneRow(t('section.cash_sales'), 720000, 4) + doneRow(t('section.upi_sales'), 107000, 2) + skipRow(t('section.udhar_sales')) + doneRow(t('section.purchase'), 150000, 1) +
            openRow(6, t('section.expense'), true) + openRow(7, t('section.udhar_collection')) + openRow(8, t('section.party_payment')) + openRow(9, t('section.withdrawal')) + lockRows(t('section.expense'));
          return top(t('t5.title')) + K.scroll(prog(5, 1, false), K.list([rows])) + pinned(t('t5.next', { section: t('section.expense') }));
        }
      },
      {
        id: 'close-ready', route: 'T5', title: 'Day close list: all sections in, cash check unlocked', flag: 'EXISTS',
        purpose: 'Every section is entered or marked "nothing today". The cash check opens; the close stays locked until the count is saved.',
        primary: 'Pinned button: "Open cash check" (also the row).',
        taps: 'END TO END, quiet day, nothing to enter on 6 empty sections: 6 x "Nothing today" + Open cash check (1) + 5 digits (for example 18450) + Save (1) + Close the day on the balanced screen (1) + Done (1) = 15 taps; add 1 tap ("All N received") if UPI receipts exist. Target under 3 min; estimate by the designer, not measured: well inside it, the count of the drawer itself being the long part.',
        rules: 'Unlock is the engine rule (all eight answered), not a flag. A skip can still be undone here, which re-locks the cash check. On a closed day this screen draws no skip, no Undo and no footer, and the check row is ticked (real branch, not drawn).',
        notes: 'Same list as before with the cash check row now open. Skipped rows stay visible so what was answered "nothing" is never hidden.',
        body: function () {
          var rows = openingRow() + doneRow(t('section.cash_sales'), 720000, 4) + doneRow(t('section.upi_sales'), 107000, 2) + skipRow(t('section.udhar_sales')) + doneRow(t('section.purchase'), 150000, 1) +
            doneRow(t('section.expense'), 40000, 2) + doneRow(t('section.udhar_collection'), 253000, 2) + doneRow(t('section.party_payment'), 60000, 1) + doneRow(t('section.withdrawal'), 40000, 1) +
            checkRow() + K.row({ state: 'lock', name: t('t1.closeDay'), sub: t('t5.locked') + ' · ' + t('t5.closeLocked') });
          return top(t('t5.title')) + K.scroll(prog(9, 1, false), K.list([rows])) + pinned(t('t5.openCheck'));
        }
      },
      {
        id: 'close-stale', route: 'T5', title: 'Day close list: an earlier day still open (labelled with its date)', flag: 'CHG',
        purpose: 'The open book is for yesterday. The list says which day it is closing, so he does not close the wrong one.',
        primary: 'Same pinned button as a normal day: "Enter Expenses".',
        taps: 'Reached by "Close it now" on Today (1 tap). Then as any close.',
        rules: 'The date is in the header-line under the total, not only in the title. No inference: the app does not move entries between days.',
        notes: 'The calm banner repeating t1.stale.body is a PROPOSAL; the real T5 shows only the date line. Day boundary: CLAUDE.md decision 1 (retailer-defined business day) supersedes the calendar date; the label here is the calendar date until dates.ts changes.',
        review: 'Proposal: repeat the stale-day sentence at the top of T5 so the old date is unmissable.',
        body: function () {
          var rows = openingRow() + doneRow(t('section.cash_sales'), 720000, 4) + doneRow(t('section.upi_sales'), 107000, 2) + skipRow(t('section.udhar_sales')) + doneRow(t('section.purchase'), 150000, 1) +
            openRow(6, t('section.expense'), true) + openRow(7, t('section.udhar_collection')) + openRow(8, t('section.party_payment')) + openRow(9, t('section.withdrawal')) + lockRows(t('section.expense'));
          return top(t('t5.title')) + K.scroll(K.banner('', 'clock', t('t1.stale.body', { date: '18 ' + t('t1.month.11') })), prog(5, 1, true), K.list([rows])) + pinned(t('t5.next', { section: t('section.expense') }));
        }
      },
      {
        id: 'close-error', route: 'T5', title: 'Day close list: could not open', flag: 'EXISTS',
        purpose: 'The list failed to open. Say plainly that nothing is lost and give one next step.',
        primary: 'Try again.',
        taps: '1 tap.',
        rules: 'Calm words; entries are on the phone. The same Shell loading and error states apply to T11, T12, T13, T14 and T19; loading is the skeleton from Today, so only this one is drawn.',
        notes: 'Icon plus words; the edge colour is not the only cue.',
        body: function () {
          return top(t('t5.title')) + K.scroll(K.banner('err', 'warn', t('common.error'), t('common.retry')), K.empty('refresh', t('common.error'), t('common.retry'), 'refresh'));
        }
      },
      {
        id: 'close-upi', route: 'T5', title: 'UPI check and adjustments cards: UPI not checked', flag: 'EXISTS',
        purpose: 'The second equation, kept apart from cash. He ticks each UPI receipt he can see arrived in his UPI app. The actual UPI figure is the sum of those ticks, never a bank balance (decision 3).',
        primary: '"All 3 received" confirms exactly the receipts it names; each receipt also has its own "Received" tick.',
        taps: 'All receipts: 1 tap. One by one: 1 tap each (3 here). Optional, never blocking the close.',
        rules: 'D2: nothing here changes the cash drawer. With receipts and no tick it says "UPI not checked" in words on every screen the day closes from, never a zero difference or a quiet tick. The note says "Not your bank balance". Adjustments are a fixed list (T19), never free text; "Add adjustment" opens T19.',
        notes: 'This is the foot of the T5 scroll (pinned button as on "ready"). The Adjustments card shows one typed entry (for the list look); with none it says "None today". The card is hidden on a closed day when empty.',
        body: function () {
          return top(t('t5.title')) + K.scroll(upiCard('not', true), adjCard(true, true)) + pinned(t('t5.openCheck'));
        }
      },
      {
        id: 'close-upi-part', route: 'T5', title: 'UPI check: partly checked, no adjustments', flag: 'EXISTS',
        purpose: 'One of three receipts ticked. The rest stay listed until ticked; a payment typed after "All received" stays unticked.',
        primary: '"All 2 received" for what is left.',
        taps: '1 tap for the rest.',
        rules: 'Status in words ("1 of 3 UPI payments checked"), icon plus words. "As entered" and "you confirmed" are two figures, never merged. When all are ticked the card reads "All UPI payments checked" and the buttons go.',
        notes: 'The mismatch between the two UPI lines is shown as two figures, not a "difference" verdict.',
        body: function () {
          return top(t('t5.title')) + K.scroll(upiCard('part', true), adjCard(false, true)) + pinned(t('t5.openCheck'));
        }
      },
      {
        id: 'close-adjust', route: 'T19', title: 'Adjustment: type chosen, amount typed', flag: 'CHG',
        purpose: 'Record a typed adjustment (fake note, chhutta, goods for home, stock written off). What happened comes from a fixed list; how much comes from the keypad. There is no text box and no "Other", so an adjustment cannot silently absorb a cash difference (decision 2).',
        primary: 'Save adjustment (disabled until a type is chosen and the amount is above 0).',
        taps: 'Add adjustment (1) + type (1) + digits (3 for 500) + Save (1) = 6 taps.',
        rules: 'Nothing is pre-selected or pre-filled. Each type states what it will move before saving. Home use and written-off move no cash. Append-only: a mistake is corrected by a new dated entry, not an edit.',
        notes: 'The effect line sits right under the chosen type (the app puts it after the whole list, below the fold at 1.0x): a layout CHANGE. Five types as in the engine; the list scrolls. Rs 0 stays refused. Closed day: the types are disabled and no keypad is drawn (real branch).',
        body: function () {
          var list = '<div role="radiogroup">' + radio(true, t('adjustment.counterfeit_note')) +
            '<p style="margin:0 12px;padding:4px 12px 8px;color:var(--muted);line-height:1.5">' + t('adjust.effect.counterfeit_note') + '</p>' +
            radio(false, t('adjustment.rounding_given')) + radio(false, t('adjustment.rounding_kept')) + radio(false, t('adjustment.home_use')) + radio(false, t('adjustment.stock_written_off')) + '</div>';
          return top(t('t19.title')) + K.scroll(para(t('t19.type'), true), list) +
            '<div style="flex:none"><div class="amt" style="flex-wrap:wrap;margin:8px 12px 0;padding:0 12px;border:2px solid var(--edge);border-radius:16px;background:var(--surface)"><span class="al">' + t('t19.amount') + '</span>' + M(50000, { cls: 'amt-fig' }) + '</div>' +
            K.addbar(t('t19.save'), 0) + K.keypad() + '</div>';
        }
      },
      {
        id: 'close-count', route: 'T11', title: 'Cash check: count the cash (nothing typed, Save disabled)', flag: 'CHG',
        purpose: 'A reading screen with one input. "Should be" is one quiet line; the working below shows where it came from, each line with its sign, so he can see which line to doubt. He counts the drawer, then compares.',
        primary: 'Type the count on the keypad, then Save.',
        taps: 'Digits (5 for 18450) + Save = 6 taps. At 2.0x text the pad folds behind a tap on the counted figure (+1) so the working keeps the screen.',
        rules: 'D2: UPI is not in the working. The expected figure is secondary to the count, so he counts first rather than typing the expected number back. No suggested count, no pre-fill. Save is greyed (dashed edge plus label), not hidden.',
        notes: 'The working list scrolls (7 lines; about 4 visible at 1.0x above the pad). Frame fits "Should be", counted figure, Save and keypad without the list pushing them off. Proposal vs the app: "Should be" is pinned above the scroll and not in the header bar.',
        body: function () { return countBody(null, false); }
      },
      {
        id: 'close-count-refused', route: 'T11', title: 'Cash check: Save tapped with no count (QA-08)', flag: 'CHG',
        purpose: 'Tapping the greyed Save gives a one-line reason instead of nothing (the device pass found no reason on tap, QA-08).',
        primary: 'Type the count.',
        taps: 'Shown only after the tap on Save; it leaves when he types a digit and never carries into another form.',
        rules: 'A refusal never shows before a tap. Calm words: "Type an amount first." with a title; neutral edge, not red.',
        notes: 'Uses refusal.title and refusal.amount, both existing. Whether the app shows this on tap today could not be confirmed from the code (T11 only disables the button); it is a proposal.',
        review: 'Proposal: greyed Save explains itself on tap (QA-08).',
        body: function () { return countBody(null, true); }
      },
      {
        id: 'close-count-typed', route: 'T11', title: 'Cash check: count typed, Save ready', flag: 'EXISTS',
        purpose: 'The count is typed. Save checks it against the working and routes to the balanced screen or the difference screen.',
        primary: 'Save.',
        taps: 'Save = 1 tap. Routing depends on the answer, so seeing T12 is not announced beforehand.',
        rules: 'The figure is exactly what he typed (integer paise). Clear and delete keys sit on the pad.',
        notes: 'The same count of 18450 drives T13. A count that differs goes to T12 (frames below use 18150 short and 18700 over).',
        body: function () { return countBody(EXPECTED, false); }
      },
      {
        id: 'close-balanced', route: 'T13', title: 'Cash check: it matches', flag: 'EXISTS',
        purpose: 'The one good moment in the day. The same figure twice, so the match is seen rather than asserted; tomorrow opens on the counted cash.',
        primary: 'Close the day.',
        taps: 'Close the day = 1 tap, then T14 appears (Done = 1).',
        rules: 'The match is recomputed from the engine on every render; if it did not hold the screen would not say so and the button would be off. D6: the carry-forward is the counted figure. The UPI card is stated (not mixed into the celebration) so a cash match is not read as a UPI match. No upsell, rating or nag.',
        notes: 'Header carries no figure on purpose. Motion is absent in the app (a recorded gap); not drawn here.',
        body: function () { return balancedBody(false); }
      },
      {
        id: 'close-diff-short', route: 'T12', title: 'Cash check: difference, short in the box', flag: 'CHG',
        purpose: 'Counted is less than should be. The difference is shown with its sign and in words, then two things to check, then a way to count again or record the gap as the day\'s loss.',
        primary: 'Count again (secondary) or "Still short - record as today\'s loss" (chooses the reason); then Close the day.',
        taps: 'Difference case, short: 6 x Nothing today + Open cash check (1) + 5 digits + Save (1) = 13 to reach this screen; then "Still short - record as today\'s loss" (1) + Close the day (1) + Done (1) = 16 taps. With one recount: Count again (1) + 5 digits + Save (1) = 23 taps in all. Estimate only, not measured.',
        rules: 'No free text anywhere: the only answer for a short drawer is the fixed "Loss for the day", so a reason cannot absorb a difference silently. The copy is a question, never a verdict. The app does not check the payment app itself (no inference). Close the day stays greyed until the reason is chosen, with a hint saying why.',
        notes: 'Short list per the code (HT-23): check, recount, mark loss. The four older short reasons (change from pocket, forgot to write something) are no longer offered but still read on old days. Sign and words both carry the meaning: "-₹300.00" and "Cash short (loss)".',
        body: function () { return diffBody('short', false); }
      },
      {
        id: 'close-diff-over', route: 'T12', title: 'Cash check: difference, extra in the box (reason chosen)', flag: 'CHG',
        purpose: 'Counted is more than should be. He picks what he thinks happened from three fixed answers, including "Don\'t know".',
        primary: 'Choose one reason (radio rows), then Close the day.',
        taps: 'Reason (1) + Close the day (1) + Done (1) after Save: 16 taps in the same quiet-day scenario as the short case. Estimate only.',
        rules: 'Fixed list: "Forgot to write a sale", "Counted wrong", "Don\'t know"; "Don\'t know" is a real value the engine can count, so he is never forced to claim a cause. The list depends on the sign: extra cash and missing cash have different causes. Chosen is marked by a tick icon, tint and border, never colour alone.',
        notes: 'Frame shows "Forgot to write a sale" chosen and Close the day active; with none chosen it is greyed as on the short frame. A chosen reason is stored as a string key, so it reads in whichever language the book is opened in.',
        body: function () { return diffBody('over', 'sale'); }
      },
      {
        id: 'close-closing', route: 'T13', title: 'Closing the day: in progress', flag: 'NEW',
        purpose: 'The close is being written. The button changes to a disabled "Closing the day" with a clock so a second tap cannot double-close.',
        primary: 'None; waits for T14.',
        taps: 'n/a',
        rules: 'The close is local and append-only; nothing is lost if it takes a moment. It never needs the network (D7 is enforced by the database trigger on both engines).',
        notes: 'The app has no such state today: store.close runs synchronously and goes straight to T14. This frame is for the build to decide whether it is needed at all.',
        review: 'Not in the app today (close is instant); say if you want a busy state or none.',
        body: function () { return balancedBody(true); }
      },
      {
        id: 'close-done', route: 'T14', title: 'Day closed: summary (with a cash difference)', flag: 'CHG',
        purpose: 'The day is closed and frozen. Profit first, what made it, the withdrawal outside it, and the cash check that closed the day, so the summary explains its own close.',
        primary: 'Done (back to Today).',
        taps: 'Done = 1 tap. Back is also visible.',
        rules: 'D3: the owner\'s withdrawal sits in its own card with the sentence "not counted against profit", because a figure under a profit total reads as part of it. D7: nothing here can change a figure; a correction is a new dated entry on a later screen. Out-flows carry a printed minus sign. The "profit after cash difference" sits beside the estimated profit, never replaces it. UPI is stated as it closed, "not checked" or partly included.',
        notes: 'Difference row carries its reason in words (Loss for the day). Rows are derived from the entries. Net sales "Cash sales" mislabel from earlier builds is fixed (F-9).',
        body: function () { return doneBody(K.chip('ok'), false); }
      },
      {
        id: 'close-done-offline', route: 'T14', title: 'Day closed offline (closes on the phone, chip amber)', flag: 'CHG',
        purpose: 'There is no network and the day closed anyway. He must know it is safe on the phone and not yet on the server.',
        primary: 'Done.',
        taps: 'Same as online: no extra step because of the network.',
        rules: 'The close and the freeze happen locally; the server catches up when signal returns (the queue drains by itself). The chip is amber with a clock and words "waiting - safe on phone", never red; the banner repeats it plainly.',
        notes: 'Same summary as the online frame. Rows the server later refuses would be parked and listed on Today (see the Today area), not here.',
        body: function () { return doneBody(K.chip('wait', 3), true); }
      }
    ]
  };
})();
