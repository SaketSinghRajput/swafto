/* AREA: Sales (T7 sale form, party picker, T18 return or exchange, I1 items in a sale, S9 your items, and the day refusals when Sale is opened).
   Copy by literal key; a string that does not exist is K.N. Money is integer paise through K.M, every figure below is a literal chosen so the frames agree with each other. */
(function () {
  var t = K.t, M = K.M;
  var MICON = { cash: 'note', upi: 'phone', udhar: 'book' };
  function modeName(m) { return m === 'cash' ? t('formA.mode.cash') : m === 'upi' ? t('formA.mode.upi') : t('formA.mode.udhar'); }

  /* ---- shared pieces ---- */
  function top(chip, title) { return K.top({ title: title || t('formA.title'), back: true, right: chip || K.chip('ok') }); }
  function amtLine(p, label) {
    return '<div class="amt" style="flex-wrap:wrap"><span class="al">' + (label || t('formA.amount')) + '</span>' + M(p, { cls: 'amt-fig' }) + '</div>';
  }
  function recent(rows) {
    return '<ul class="recent">' + rows.map(function (r) {
      return '<li class="' + (r.fresh ? 'fresh' : '') + '"><span class="rk">' + K.ico(MICON[r.m], 22) + '<span>' + modeName(r.m) + '</span><small>' + r.time + '</small></span>' + M(r.p) + '</li>';
    }).join('') + '</ul>';
  }
  var BEFORE = [{ m: 'upi', time: '11:20', p: 25000 }, { m: 'cash', time: '10:58', p: 12000 }];
  var TOTAL = 1472000;               /* net sales so far today, as on Today (derived by the engine, includes entries beyond the two rows shown) */
  var TOTAL_AFTER = 1477000;         /* TOTAL + the Rs 50 cash sale saved in the 'saved' frame */
  function totalLine() { return '<div class="total"><span>' + t('formA.runningTotal') + '</span>' + M(TOTAL) + '</div>'; }
  function custBlock(name, idx, bal, stateWord, hint) {
    if (!name) {
      return '<button class="cust" style="width:100%;text-align:left;display:block"><span class="cl">' + t('formA.customer') + '</span><div class="cr"><span class="cn">' + t('party.chooseCustomer') + '</span>' + K.ico('chev', 24) + '</div>' + (hint ? '<div class="cl">' + hint + '</div>' : '') + '</button>';
    }
    return '<button class="cust" style="width:100%;text-align:left;display:block"><span class="cl">' + t('formA.customer') + '</span><div class="cr"><span class="cn">' + name + '</span><span class="cb">' + M(bal) + ' <em>' + stateWord + '</em></span></div></button>';
  }
  function links(both) {
    var r = '<button class="btn2" style="flex:1">' + K.ico('swap', 24) + '<span>' + t('t18.open') + '</span></button>';
    if (both) r += '<button class="btn2" style="flex:1">' + K.ico('receipt', 24) + '<span>' + t('t7.items') + '</span></button>';
    return '<div style="flex:none;display:flex;gap:8px;padding:6px 12px 0">' + r + '</div>';
  }
  /* o: {head, list, amt, mode, add, links, overlay, chip} - the Mitra sale frame: header, total, 2 recent rows, amount, segment, links, Add, keypad (see notes for the 800 px sum) */
  function saleFrame(o) {
    var seg = K.seg([t('formA.mode.cash'), t('formA.mode.upi'), t('formA.mode.udhar')], o.mode || 0, ['note', 'phone', 'book']);
    return top(o.chip) +
      '<div class="entry">' + (o.head || totalLine()) + o.list + amtLine(o.amt || 0) + seg + '</div>' +
      (o.links === false ? '' : links(o.links === 'both')) +
      K.addbar(t('common.add'), o.amt || 0) + K.keypad() + (o.overlay || '');
  }
  function infoBanner(text) { return '<div class="refbanner nn" role="status">' + text + '</div>'; }

  /* ---- party picker ---- */
  function pickerRows() {
    return K.list([
      K.prow(K.nm('bijay'), 2, '', 45000, t('picker.owes')),
      K.prow(K.nm('lakshmi'), 3, '', 200000, t('picker.owes')),
      K.prow(K.nm('pradeep'), 4, '', 15000, t('picker.owes')),
      K.prow(K.nm('ramesh'), 0, '', 128000, t('picker.owes')),
      K.prow(K.nm('sunita'), 1, '', 0, t('picker.settled'))
    ]);
  }
  function pickerFoot() { return K.stack(K.primary(t('party.addCustomer'), 'outline', 'plus'), K.quiet(t('party.cancel'))); }

  /* ---- T18 pieces ---- */
  function srow(icon, name, sub, p) {
    return '<li><button class="prow">' + K.ico(icon, 26) + '<span class="pn"><b>' + name + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span><span class="pa">' + M(p) + '</span></button></li>';
  }
  function radios(labels, on) {
    return '<div class="seg" role="radiogroup" style="flex-direction:column;margin:4px 12px 0;border-radius:24px">' + labels.map(function (l, i) {
      return '<button class="sg-b' + (i === on ? ' on' : '') + '" role="radio" aria-checked="' + (i === on) + '">' + (i === on ? K.ico('tick', 22) : '') + '<span>' + l + '</span></button>';
    }).join('') + '</div>';
  }
  function para(txt) { return '<p class="lead" style="margin:8px 16px">' + txt + '</p>'; }
  function lineRow(label, p) { return '<div class="ln" style="display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:48px;padding:0 16px;flex-wrap:wrap"><span>' + label + '</span>' + M(p) + '</div>'; }
  function opts() { return [t('t18.opt.cash'), t('t18.opt.upi'), t('t18.opt.udhar'), t('t18.opt.pending'), t('t18.opt.exchange')]; }

  /* ---- Today fragments for the day refusals ---- */
  var BOX = { box: 1200000 + 935000 - 290000, opening: 1200000, cashIn: 935000, cashOut: 290000 };
  function homeTop(chip) { return K.top({ shop: K.shop, date: K.date(), right: chip || K.chip('ok') }); }

  /* ---- items (I1, S9) ---- */
  function lockedPointer() { return K.stack(K.lrow('star', t('s10.title'), t('s10.status.free'))); }
  var ITEMS = ['Atta 1 kg', 'Rice 1 kg', 'Sugar 1 kg', 'Tea 250 g'];

  SPEC.area = {
    title: 'Sales',
    intro: 'The sale form (T7) in all its states, the customer picker, return or exchange (T18), and the two Premium item screens (I1, S9) with their free-plan locked state. The sale form is the busiest screen in the app and is drawn to the concept sum: header 64 + total 44 + two recent rows 96 + amount 64 + segment 60 + Return link 56+6 + Add 72 + keypad 266 = 728 of the 752 px app area (estimate from kit CSS, not a render).',
    screens: [
      {
        id: 'sales-cash-empty', route: 'T7', title: 'Sale: cash, nothing typed', flag: 'CHG',
        purpose: 'Record a sale. Cash is already chosen, so the commonest sale needs no mode tap.',
        primary: 'Keypad digits, then the Add bar (teal, full width, directly above the keypad).',
        taps: 'Cash sale of 2 digits: Sale tile, 2 digits, Add = 4 taps. 3 digits = 5 taps. Target under 10 s (estimate from tap count; no user has timed it).',
        rules: 'No inference: the amount starts empty, no suggested figure, no "usual" amount. The Add bar is live at zero so a Rs 0 tap can be refused in words after the tap (next frame), never greyed with no reason given. Newest entries first.',
        notes: 'Total, two newest entries (mode icon + word + time + amount), amount, segment, Return link, Add, keypad, all pinned, nothing scrolls. v1 listed up to four rows and the line just added was off screen (USABILITY item 6). The total is the engine figure for net sales and includes entries older than the two shown. "Return or exchange a sale" is a real button (a 56 px bordered one), not a caption. Add items (Premium) is the second link only when the plan allows it and a sale exists, see the Premium-link frame.',
        body: function () { return saleFrame({ list: recent(BEFORE), amt: 0, mode: 0 }); }
      },
      {
        id: 'sales-cash-premium', route: 'T7', title: 'Sale: Premium plan, both links', flag: 'CHG',
        purpose: 'Same form on a Premium plan. A second link, Add items to a sale, sits beside Return or exchange.',
        primary: 'Unchanged: digits then Add. The links are secondary.',
        taps: 'Add items: 1 tap to I1 from the form.',
        rules: 'The links never hold up saving a sale or closing the day (items are optional, i1.optional).',
        notes: 'Two links share one 56 px row and wrap their words (Odia/Hindi are longer). Gate is allows(plan, items). In the beta build BETA.allFree is true, so every plan sees this frame today.',
        body: function () { return saleFrame({ list: recent(BEFORE), amt: 0, mode: 0, links: 'both' }); }
      },
      {
        id: 'sales-cash-typed', route: 'T7', title: 'Sale: cash, amount typed', flag: 'CHG',
        purpose: 'The amount is being typed. The figure is large, and the Add bar repeats it so he commits to exactly what he sees.',
        primary: 'Add Rs 120.00.',
        taps: 'Cash sale of 3 digits (1, 2, 0): Sale tile, 3 digits, Add = 5 taps.',
        rules: 'The figure is only what he typed. Keys are 56 px. The amount line wraps rather than clipping a lakh figure.',
        notes: 'No decimal key: the keypad types whole rupees (as built; paise only via entries elsewhere).',
        body: function () { return saleFrame({ list: recent(BEFORE), amt: 12000, mode: 0 }); }
      },
      {
        id: 'sales-saved', route: 'T7', title: 'Sale: just saved', flag: 'CHG',
        purpose: 'Say in words that the tap landed, and show the new entry first. The form is empty again for the next sale.',
        primary: 'Next sale: type digits. Nothing to dismiss.',
        taps: 'Back to Today: 1 tap. The saved line clears itself on the next key.',
        rules: 'Append-only: the row is a new entry. Total derived: it is the earlier total plus this sale, read from the engine, not accumulated by the form. The saved line carries a tick and words, never colour alone.',
        notes: 'The saved line "Saved ₹50.00, Cash" replaces the total line for this moment (the concept does the same; the app shows both, which costs 44 px and would push the keypad past the frame, so the total returns on the next key: proposal). The new row is first with mode and time and a raised background. Total figure shown below in the first row of the next frame is the new one.',
        review: 'Saved line replaces the total line for one moment instead of sitting above it, to keep the keypad on screen at 1.0x.',
        body: function () {
          var saved = '<div class="total toast" role="status">' + K.ico('check', 24) + '<span>' + t('entry.savedLong', { amount: '₹50.00', mode: t('formA.mode.cash') }) + '</span></div>';
          return saleFrame({ head: saved, list: recent([{ m: 'cash', time: '11:42', p: 5000, fresh: true }, { m: 'upi', time: '11:20', p: 25000 }]), amt: 0, mode: 0 });
        }
      },
      {
        id: 'sales-zero', route: 'T7', title: 'Sale: Rs 0 refused after tapping Add', flag: 'EXISTS',
        purpose: 'He tapped Add with nothing typed. The app says why, once, and nothing is saved.',
        primary: 'Type an amount (the form is unchanged under the message).',
        taps: 'No extra step: type and tap Add again.',
        rules: 'Refusal shows only after a tap on Add, never on opening, and is cleared as soon as he types or leaves, so it never leaks into the next form. A Rs 0 entry is refused (refusal.amountZero). Heading and body, with a neutral outlined edge; the words, not the edge colour, carry the meaning.',
        notes: 'refusal.amountZero points to "Nothing to enter" on the day-close list for a day with nothing to enter. The banner floats over the header area and does not move the pad.',
        body: function () { return saleFrame({ list: recent(BEFORE), amt: 0, mode: 0, overlay: K.refbanner(t('refusal.title'), t('refusal.amountZero'), true) }); }
      },
      {
        id: 'sales-toolarge', route: 'T7', title: 'Sale: amount over the per-entry ceiling', flag: 'EXISTS',
        purpose: 'A slip of the finger made an amount above Rs 1 crore. Refuse in words and keep what he typed so he can fix one digit.',
        primary: 'Delete the extra digit (Delete key), then Add.',
        taps: '1 tap (Delete) then Add.',
        rules: 'One entry is at most Rs 1 crore (refusal.amountTooLarge). The typed figure stays on screen; nothing is saved or rounded.',
        notes: 'Typed 1,00,00,001 rupees to show the line just past the ceiling. The amount wraps onto a second line instead of running off the edge.',
        body: function () { return saleFrame({ list: recent(BEFORE), amt: 1000000100, mode: 0, overlay: K.refbanner(t('refusal.title'), t('refusal.amountTooLarge'), true) }); }
      },
      {
        id: 'sales-upi', route: 'T7', title: 'Sale: UPI mode', flag: 'CHG',
        purpose: 'A UPI sale is recorded, but no cash goes into the drawer. The form says so by what it does not change.',
        primary: 'Add Rs 250.00 (UPI).',
        taps: 'UPI sale of 3 digits: Sale tile, UPI segment, 3 digits, Add = 6 taps. 2 digits = 5.',
        rules: 'D2: a UPI sale adds no cash. In the box now is unchanged after saving (it is not on this screen; on Today it stays at the same figure). UPI is the amount the shopkeeper confirms as received, not a bank balance (decision 3).',
        notes: 'Selected segment carries a tick plus the word, other segments carry their own icon. The row list stays the same two rows. No change to "In the box now" is shown or implied; it is on Today, not here.',
        body: function () { return saleFrame({ list: recent(BEFORE), amt: 25000, mode: 1 }); }
      },
      {
        id: 'sales-udhar-none', route: 'T7', title: 'Sale: Udhar, customer not chosen', flag: 'CHG',
        purpose: 'A credit sale must name who owes it. The customer line replaces the two recent rows and asks for a choice.',
        primary: 'Tap the Customer line (opens the picker).',
        taps: 'Udhar sale of 2 digits from the Udhar sale tile: tile, customer line, person, 2 digits, Add = 6 taps. From the Sale tile add 1 for the Udhar segment = 7.',
        rules: 'The engine requires a party for udhar (partyRule). The form asks before the tap instead of throwing after it; "Choose who this is for before adding it" is shown as a plain line, not a red error.',
        notes: 'Udhar is shown as a plain line inside the customer block. If he taps Add anyway, the refusal is refusal.partyId, "Choose the person first." (shown as a banner, same as the Rs 0 refusal).',
        body: function () { return saleFrame({ list: custBlock('', 0, 0, '', t('party.required')), amt: 0, mode: 2 }); }
      },
      {
        id: 'sales-udhar-cust', route: 'T7', title: 'Sale: Udhar, customer chosen, above the limit he set', flag: 'CHG',
        purpose: 'The customer line shows who and what they owe now, in large type, before he commits more.',
        primary: 'Add Rs 450.00 (Udhar).',
        taps: 'See the udhar frame above for the count.',
        rules: 'The balance is shown before the amount is added. If the sale would take the customer past a limit he set, one sentence says so (limit.observation): something to review, never an instruction; the commit stays live and nothing is suggested in its place. No inference: the customer is only one he chose.',
        notes: 'The observation floats as a neutral banner so the pad stays put (the app renders it as one line under the name). Balance 1,280.00 plus 450.00 would be 1,730.00; the limit shown is 1,500.00, both from the demo figures. The "owes" word comes with the figure so the status is never colour or sign alone.',
        body: function () {
          var obs = infoBanner(t('limit.observation', { name: K.nm('ramesh'), would: '₹1,730.00', limit: '₹1,500.00' }));
          return saleFrame({ list: custBlock(K.nm('ramesh'), 0, 128000, t('picker.owes')), amt: 45000, mode: 2, overlay: obs });
        }
      },
      {
        id: 'sales-picker', route: 'T7', title: 'Customer picker', flag: 'CHG',
        purpose: 'Choose the customer for this sale. Each row shows what that person owes, so he picks the right one by the number.',
        primary: 'Tap a person (returns to the sale form with the line filled).',
        taps: '1 tap to choose. Add new customer is 1 tap more.',
        rules: 'Per-person balances in large type, with the word "owes" or "nothing owed" (picker.owes, picker.settled), never colour alone. Customers only here: a supplier list would go on a purchase. No "recent" or "usual" shortcut: that would be a guess at who the customer is.',
        notes: 'Rows are sorted as the store returns them (shown here as a plain list). The picker uses a full screen with Back as the way out; cancel is also a quiet button at the foot. Balances are across every day on the phone.',
        body: function () { return K.top({ title: t('party.chooseCustomer'), back: true, right: K.chip('ok') }) + K.scroll(pickerRows(), pickerFoot()); }
      },
      {
        id: 'sales-picker-add', route: 'T7', title: 'Customer picker: add a new customer', flag: 'EXISTS',
        purpose: 'The customer is not in the list yet. Add them without leaving the sale.',
        primary: 'Save and choose (the new person is chosen and he is back on the sale).',
        taps: 'Add new customer, name, optional phone, Save and choose = 3 taps plus typing.',
        rules: 'Name is required, phone is optional. Nothing is guessed from the phone book or contacts. The label says Optional so a missing phone does not feel like an error.',
        notes: 'The system keyboard is not drawn. The list screen is one tap back (Back to the list).',
        body: function () {
          return K.top({ title: t('party.newCustomer'), back: true, right: K.chip('ok') }) + K.scroll(
            K.field(t('party.name'), 'Anil', { focus: true }),
            K.field(t('party.phone'), '', { ph: '' }),
            K.stack(K.primary(t('party.save'), '', 'check'), K.primary(t('party.backToList'), 'outline', 'back'))
          );
        }
      },
      {
        id: 'sales-picker-refuse', route: 'T7', title: 'Customer picker: name and phone refusals', flag: 'EXISTS',
        purpose: 'Name is empty, or the phone number is not a valid mobile number. Say which field and what to do.',
        primary: 'Fix the field named, then Save and choose.',
        taps: '1 to 2 taps.',
        rules: 'The refusal names the field (party.refusal.phone shown under the phone field, with an icon), the typed text stays. Equal visual weight for Back to the list.',
        notes: 'Two refusals exist: party.refusal.name (empty name) and party.refusal.phone (not a valid Indian mobile number). Drawn: phone refused. Name refusal reads the same way under the name field.',
        body: function () {
          return K.top({ title: t('party.newCustomer'), back: true, right: K.chip('ok') }) + K.scroll(
            K.field(t('party.name'), 'Anil', {}),
            K.field(t('party.phone'), '98765', { focus: true, err: true, help: K.ico('warn', 20) + ' ' + t('party.refusal.phone') }),
            K.stack(K.primary(t('party.save'), '', 'check'), K.primary(t('party.backToList'), 'outline', 'back'))
          );
        }
      },
      {
        id: 'sales-loading', route: 'T7', title: 'Sale: loading', flag: 'EXISTS',
        purpose: 'The day is opening from the phone. A skeleton, no spinner, no text.',
        primary: 'None; waits.', taps: 'n/a',
        rules: 'Skeleton rows match the entry shape. common.loading is the accessible name only.',
        notes: 'Shown for well under a second normally.',
        body: function () { return top() + '<div class="scroll" aria-busy="true" aria-label="' + t('common.loading') + '">' + K.skel(4) + '</div>'; }
      },
      {
        id: 'sales-error', route: 'T7', title: 'Sale: could not open', flag: 'EXISTS',
        purpose: 'The form failed to open. Say plainly that nothing is lost; one next step.',
        primary: 'Try again.', taps: '1 tap.',
        rules: 'Calm words. Entries are in the phone database and untouched. Icon plus words.',
        notes: 'Offline is not an error here: the form works fully and only the chip in the header changes (amber clock, "waiting, safe on phone"), never red.',
        body: function () { return top() + K.scroll(K.banner('err', 'warn', t('common.error'), t('common.retry')), K.empty('refresh', t('common.error'), t('common.retry'), 'refresh')); }
      },

      /* ---- the day refusals when Sale is opened ---- */
      {
        id: 'sales-open-stale', route: 'T1', title: 'Opening Sale: earlier day still open', flag: 'EXISTS',
        purpose: 'He tapped Sale while the open book belongs to an earlier day. The form does not open; he is told why and where to go.',
        primary: 'Close it now (banner action).',
        taps: '1 tap to the day-close list for the old day.',
        rules: 'refusal.dayStale. Entries are refused until the old day is closed (decision 1 on retailer-defined days will change what "earlier" means, a 00:30 sale belongs to the shop\'s own business day). Nothing is lost.',
        notes: 'Same frame as Today stale: tiles greyed with a dashed edge, then the refusal is a banner after the tap. See Today for the full frame.',
        body: function () {
          return homeTop() + K.scroll(K.banner('', 'clock', t('t1.stale.body', { date: '18 ' + t('t1.month.11') }), t('t1.stale.action')), K.tiles(true), K.hero(BOX)) + K.tabs('today') + K.refbanner(t('refusal.titleNotDone'), t('refusal.dayStale'), true);
        }
      },
      {
        id: 'sales-open-closed', route: 'T3', title: 'Opening Sale: day is closed and frozen', flag: 'CHG',
        purpose: 'The day is closed (D7). There is no Sale tile; the only change that exists is a dated correction.',
        primary: 'Post a correction.',
        taps: '1 tap to the correction picker.',
        rules: 'D7: a closed day is frozen, the database refuses a write by trigger. Append-only: a correction is a new entry that references the original. The wrong-date variant (closed while the phone date was wrong, refusal.dayClosedWrongDate) is the same frame with the longer sentence.',
        notes: 'v1 greyed the tiles silently. Here the banner says why. If a stale tap still reaches the engine, the refusal is refusal.dayClosedWrongDate.',
        body: function () {
          return homeTop() + K.scroll(K.banner('info', 'lock', t('t3.banner')), K.stack(K.primary(t('t3.correction'), '', 'pencil')), K.hero(BOX)) + K.tabs('today') + K.refbanner(t('refusal.titleNotDone'), t('refusal.dayClosedWrongDate'), true);
        }
      },
      {
        id: 'sales-open-future', route: 'T1', title: 'Opening Sale: phone date is behind the book', flag: 'EXISTS',
        purpose: 'The phone clock is earlier than the book. Sale does not open; nothing is lost and the fix is outside the app.',
        primary: 'Check the phone date and time (outside the app).',
        taps: '1 tap to dismiss, then fix the phone setting.',
        rules: 'refusal.dayFuture. The app never auto-corrects the date (no inference).',
        notes: 'The Open date settings button proposed on Today needs a native intent (frontend work, flagged there).',
        body: function () {
          return homeTop() + K.scroll(K.tiles(true), K.hero(BOX)) + K.tabs('today') + K.refbanner(t('refusal.titleNotDone'), t('refusal.dayFuture'), true);
        }
      },

      /* ---- T18 ---- */
      {
        id: 'sales-ret-list', route: 'T18', title: 'Return or exchange: choose the sale', flag: 'CHG',
        purpose: 'A return is always recorded against a sale. Pick the sale that came back, or settle an earlier return.',
        primary: 'Tap a sale (opens the return form).',
        taps: 'Return a cash sale: Return link on the sale form, the sale, settlement, amount digits, Save return = 4 taps plus digits.',
        rules: 'Each row: mode word, time, and what can still come back (the amount net of earlier returns), with "part returned" when some already has. Append-only: the return is a new entry that references the sale. Settlement of a pending return is its own list below.',
        notes: 'Returns still to settle is shown only when one exists, with the amount still to pay back. Four settlement states exist in the engine: refund paid, credit issued, replacement, pending settlement; the form offers Refund cash, Refund UPI, Credit issued, Pending, Exchange.',
        body: function () {
          return K.top({ title: t('t18.title'), back: true, right: K.chip('ok') }) + K.scroll(
            K.sec(t('t18.sales')),
            K.list([srow('note', t('section.cash_sales'), '10:58', 12000), srow('phone', t('section.upi_sales'), '11:20 · ' + t('t18.partReturned'), 18000), srow('book', t('section.udhar_sales'), K.nm('ramesh') + ' · 09:40', 45000)]),
            K.sec(t('t18.pending')),
            K.list([srow('swap', t('section.cash_sales'), t('t18.outstanding') + ' · 09:12', 20000)])
          );
        }
      },
      {
        id: 'sales-ret-empty', route: 'T18', title: 'Return or exchange: no sale yet', flag: 'EXISTS',
        purpose: 'There is no sale to return against. Say why, and give the way forward.',
        primary: 'Go to Sale.', taps: '1 tap.',
        rules: 'A return is always against a sale, so with none there is nothing to enter.',
        notes: 'The app shows t18.empty and nothing else; the Go to Sale button is a proposal (new copy needed) so he is not at a dead end.',
        review: 'Added a Go to Sale button on the empty state so it is not a dead end.',
        body: function () { return K.top({ title: t('t18.title'), back: true, right: K.chip('ok') }) + K.scroll(K.empty('swap', t('t18.empty'), t('act.sale'), 'coin')); }
      },
      {
        id: 'sales-ret-cash', route: 'T18', title: 'Return: settled by a cash refund', flag: 'CHG',
        purpose: 'Record the value that came back from one sale and how it was settled.',
        primary: 'Save return.',
        taps: 'Sale, Refund cash (already first), 3 digits, Save return = see the list frame.',
        rules: 'He confirms the goods came back (t18.confirm); the app cannot check the goods. The amount is capped at what can still come back (t18.tooMuch). D2: a cash refund moves the drawer, UPI or credit do not.',
        notes: 'Settlement is a list of five radios (the app shows five choices, drawn as a column so each label can wrap). Selected has a tick and the word. The amount, Save and keypad are pinned; the sale card and choices scroll. Sale card shows the sale and "Can still come back".',
        body: function () {
          return K.top({ title: t('t18.title'), back: true, right: K.chip('ok') }) +
            K.scroll(
              K.sec(t('t18.sale')), lineRow(t('section.cash_sales') + ' · 10:58', 12000), lineRow(t('t18.returnable'), 12000),
              K.sec(t('t18.how')), radios(opts(), 0), para(t('t18.confirm'))
            ) +
            '<div class="entry">' + amtLine(3000, t('t18.returned')) + '</div>' + K.addbar(t('t18.save'), 3000) + K.keypad();
        }
      },
      {
        id: 'sales-ret-exchange', route: 'T18', title: 'Exchange: price of what went out, and the difference', flag: 'CHG',
        purpose: 'One linked event: goods come back and different goods go out. The difference is the only money that moves.',
        primary: 'Save return.',
        taps: 'Sale, Exchange, value that came back (digits), value that went out (digits), difference mode if any, Save = 6 taps plus digits.',
        rules: 'The segment above the pad says which of the two values he is typing, the two are on the card. The customer pays the difference (t18.diffFrom) or the shop pays it back (t18.diffTo), and he says how it was paid (cash or UPI). If prices match, "Same price. No money changes hands." and no mode is asked. Only cash touches the drawer (D2).',
        notes: 'Demo: Rs 300.00 came back, Rs 450.00 went out, so the customer pays Rs 150.00, by cash. Difference is derived, never typed.',
        body: function () {
          return K.top({ title: t('t18.title'), back: true, right: K.chip('ok') }) +
            K.scroll(
              K.sec(t('t18.how')), radios(opts(), 4),
              lineRow(t('t18.returned'), 30000), lineRow(t('t18.replacement'), 45000),
              K.sec(t('t18.diffFrom')), lineRow(t('t18.diffFrom'), 15000),
              K.sec(t('t18.diffHow')), K.seg([t('formA.mode.cash'), t('formA.mode.upi')], 0, ['note', 'phone'])
            ) +
            K.seg([t('t18.returned'), t('t18.replacement')], 1) + '<div class="entry">' + amtLine(45000, t('t18.replacement')) + '</div>' + K.addbar(t('t18.save'), 0) + K.keypad();
        }
      },
      {
        id: 'sales-ret-settle', route: 'T18', title: 'Settle an earlier return', flag: 'CHG',
        purpose: 'A return was recorded as Pending. Now the money is paid back, all or part.',
        primary: 'Save.',
        taps: 'Row under "Returns still to settle", how paid, digits, Save = 4 taps plus digits.',
        rules: 'Shows what is still to pay back. More than that is refused (t18.tooMuchSettle). Credit issued means it goes onto the customer balance (no cash).',
        notes: 'Paid back by: cash, UPI or Credit issued. Paying part leaves the return pending with a smaller amount.',
        body: function () {
          return K.top({ title: t('t18.title'), back: true, right: K.chip('ok') }) +
            K.scroll(lineRow(t('t18.outstanding'), 20000), K.sec(t('t18.settleHow')), K.seg([t('formA.mode.cash'), t('formA.mode.upi'), t('t18.opt.udhar')], 0, ['note', 'phone', 'book'])) +
            '<div class="entry">' + amtLine(5000, t('t18.settleAmount')) + '</div>' + K.addbar(t('common.save'), 5000) + K.keypad();
        }
      },
      {
        id: 'sales-ret-toomuch', route: 'T18', title: 'Return: more than the sale can take back', flag: 'EXISTS',
        purpose: 'The value he typed is more than what can still come back from this sale.',
        primary: 'Lower the amount.', taps: '1 tap (Delete).',
        rules: 'Refused in words (t18.tooMuch); nothing saved. The same applies to settle with t18.tooMuchSettle.',
        notes: 'Banner floats over the header as for T7.',
        body: function () {
          return K.top({ title: t('t18.title'), back: true, right: K.chip('ok') }) +
            K.scroll(K.sec(t('t18.sale')), lineRow(t('section.cash_sales') + ' · 10:58', 12000), lineRow(t('t18.returnable'), 12000), K.sec(t('t18.how')), radios(opts(), 0)) +
            '<div class="entry">' + amtLine(20000, t('t18.returned')) + '</div>' + K.addbar(t('t18.save'), 20000) + K.keypad() + K.refbanner(t('refusal.title'), t('t18.tooMuch'), true);
        }
      },

      /* ---- I1 items in a sale ---- */
      {
        id: 'sales-i1-locked', route: 'I1', title: 'Items in a sale: free plan, locked', flag: 'CHG',
        purpose: 'Items per sale are Premium. On the free plan the screen says so and offers nothing else it cannot deliver.',
        primary: 'See your plan (opens S10).',
        taps: '1 tap to S10.',
        rules: 'Free is free for ever; the sale, the day close and every entry stay free (s10.free.*). Nothing is hidden or counted down, no pressure copy.',
        notes: 'The app shows only "Items per sale are part of Premium." and no button; the S10 pointer is a proposal so he is not at a dead end. In the session the form never links here on a free plan, so this is reached only by an old shortcut. In the beta build BETA.allFree is true, so this state is not reachable today.',
        review: 'Added a "Your plan" row (S10) to the locked state; the app offers no button there.',
        body: function () { return K.top({ title: t('i1.title'), back: true, right: K.chip('ok') }) + K.scroll(K.banner('info', 'lock', t('i1.premium')), lockedPointer()); }
      },
      {
        id: 'sales-i1-sales', route: 'I1', title: 'Items in a sale: choose today\'s sale (Premium)', flag: 'EXISTS',
        purpose: 'Pick one of today\'s sales, then record which of his own items it was.',
        primary: 'Tap a sale.',
        taps: 'Sale form, Add items, sale = 2 taps to the item list.',
        rules: 'Optional and never holds up closing the day (i1.optional). Only today\'s sales are listed. No price is kept, so none can be suggested.',
        notes: 'Rows show the mode word, the time and the sale amount.',
        body: function () {
          return K.top({ title: t('i1.title'), back: true, right: K.chip('ok') }) + K.scroll(
            para(t('i1.optional')), K.sec(t('i1.pickSale')),
            K.list([srow('note', t('section.cash_sales'), '11:42', 5000), srow('phone', t('section.upi_sales'), '11:20', 25000), srow('note', t('section.cash_sales'), '10:58', 12000)])
          );
        }
      },
      {
        id: 'sales-i1-empty', route: 'I1', title: 'Items in a sale: no sales yet today', flag: 'EXISTS',
        purpose: 'No sale today to add items to.',
        primary: 'Go to Sale.', taps: '1 tap.',
        rules: 'There is nothing to do here until a sale exists.',
        notes: 'The app shows i1.empty only; the button is a proposal.',
        review: 'Added a Go to Sale button on the empty state.',
        body: function () { return K.top({ title: t('i1.title'), back: true, right: K.chip('ok') }) + K.scroll(K.empty('receipt', t('i1.empty'), t('act.sale'), 'coin')); }
      },
      {
        id: 'sales-i1-item', route: 'I1', title: 'Items in a sale: item, how many, amount', flag: 'EXISTS',
        purpose: 'Record one line of a sale: which of his items, how many, and for how much.',
        primary: 'Save item.',
        taps: 'Item, quantity digits, amount digits, Save item = 4 taps plus digits.',
        rules: 'The lines can never total more than the sale (refusal.itemOverSale shows what is left); the same item cannot be listed twice. Nothing is pre-chosen or pre-filled.',
        notes: 'Shows the sale with "Items recorded for ₹300.00 of the sale ₹450.00", the recorded lines, the choices as a column with Other last, and then, once an item is chosen, a Quantity / Amount segment above the pad. Drawn: Atta chosen and 2 typed for quantity. Lines recorded earlier: Rice × 1.',
        body: function () {
          return K.top({ title: t('i1.title'), back: true, right: K.chip('ok') }) + K.scroll(
            lineRow(t('section.cash_sales') + ' · 10:58', 45000), lineRow(t('i1.recorded') + ' ' + t('i1.of'), 30000),
            lineRow(ITEMS[1] + ' ' + t('i1.times', { n: 1 }), 30000),
            K.sec(t('i1.item')), radios([ITEMS[0], ITEMS[2], ITEMS[3], t('i1.other')], 0)
          ) + K.seg([t('i1.quantity'), t('i1.amount')], 0) + '<div class="entry">' + amtLine(2, t('i1.quantity')) + '</div>' + K.addbar(t('i1.save'), 0, true) + K.keypad();
        }
      },

      /* ---- S9 your items ---- */
      {
        id: 'sales-s9-locked', route: 'S9', title: 'Your items: free plan, locked', flag: 'CHG',
        purpose: 'The list of things he sells. On the free plan, items already recorded can still be read; adding is Premium.',
        primary: 'See your plan (S10).',
        taps: '1 tap to S10.',
        rules: 'Everything recorded under Premium stays readable (s10.status.lapsed). No add box is shown that cannot work.',
        notes: 'The add card is absent (as built). The S10 row is a proposal; the app shows only s9.premium. Beta build: not reachable today (BETA.allFree).',
        review: 'Added a "Your plan" row (S10) on the locked state.',
        body: function () {
          return K.top({ title: t('s9.title'), back: true, right: K.chip('ok') }) + K.scroll(
            para(t('s9.intro')), K.banner('info', 'lock', t('s9.premium')), lockedPointer(),
            K.list(ITEMS.slice(0, 3).map(function (n) { return '<li class="row open"><span class="nm">' + n + '</span></li>'; }))
          );
        }
      },
      {
        id: 'sales-s9-premium', route: 'S9', title: 'Your items: Premium, add an item', flag: 'EXISTS',
        purpose: 'Keep a short list of what he sells, by name only.',
        primary: 'Add to list.',
        taps: 'Name (typing), Add to list = 2 taps plus typing.',
        rules: 'No price is kept: he types the amount on every sale (no inference). A duplicate name is refused (refusal.itemDuplicate). The "Tell your customers" notice (s9.noticeTitle, s9.notice) is a consent-style line he can read to a customer who buys on credit.',
        notes: 'Names are user data, shown as typed. The Add to list button waits until a name is typed, with a dashed edge and the same label. Empty list shows s9.empty, drawn in the next frame.',
        body: function () {
          return K.top({ title: t('s9.title'), back: true, right: K.chip('ok') }) + K.scroll(
            para(t('s9.intro')), K.field(t('s9.name'), 'Dal 1 kg', { focus: true }), K.stack(K.primary(t('s9.add'), '', 'plus')),
            K.list(ITEMS.map(function (n) { return '<li class="row open"><span class="nm">' + n + '</span></li>'; })),
            K.banner('info', 'info', t('s9.noticeTitle') + ' ' + t('s9.notice'))
          );
        }
      },
      {
        id: 'sales-s9-empty', route: 'S9', title: 'Your items: Premium, list empty', flag: 'EXISTS',
        purpose: 'No items yet. Ask for the ones he sells most.',
        primary: 'Type a name and Add to list.', taps: '2 taps plus typing.',
        rules: 'A next action is always on screen (the name field).',
        notes: 'The empty line is s9.empty; the field and button sit above it.',
        body: function () {
          return K.top({ title: t('s9.title'), back: true, right: K.chip('ok') }) + K.scroll(
            para(t('s9.intro')), K.field(t('s9.name'), '', { focus: true }), K.stack(K.primary(t('s9.add'), 'dis', 'plus')), K.empty('tray', t('s9.empty'))
          );
        }
      }
    ]
  };
})();
