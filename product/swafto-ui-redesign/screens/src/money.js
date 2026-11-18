/* AREA: money = the non-sale entry forms: T8 (Udhar sale, Collect, Pay supplier), T9 (Expense, Purchase), T10 (Withdrawal), T19 (Adjustment), T16 (correction after close), and the person picker.
   Copy by literal key; a string that does not exist is K.N(...). Money is integer paise through K.M. */
(function () {
  var t = K.t, M = K.M;

  /* ---- demo figures (paise), all consistent inside each form ---- */
  var P7 = 2150000;                 /* what customers owe (matches Today "Udhar to collect") */
  var P8 = 1850000;                 /* what the shop owes suppliers */
  var SUP = 'Mahadev Traders', SUP2 = 'Jagannath Stores';

  function top(title, chip) { return K.top({ title: title, back: true, right: chip || K.chip('ok') }); }

  /* the one-line running total, as a card (EntryForm "-total") */
  function total(label, paise) {
    return '<section class="facts"><div class="ln"><span class="k">' + label + '</span>' + M(paise) + '</div></section>';
  }
  /* Saved line: tick, figure, mode (entry.savedLong), calm, not celebratory */
  function saved(paise, modeHtml) {
    return K.banner('', 'check', t('entry.savedLong', { amount: K.rupee(paise), mode: modeHtml }));
  }
  /* person / supplier row. name null = not chosen yet. bal = {paise, word} shown above the keypad under the name. */
  function person(kind, name, bal, optional) {
    var lab = t(kind === 'customer' ? 'party.customer' : 'party.supplier') + (optional ? ' · ' + t('party.optional') : '');
    var val = name || t(kind === 'customer' ? 'party.chooseCustomer' : 'party.chooseSupplier');
    var sub = name && bal ? bal.word + ' ' + M(bal.paise) : lab;
    var ttl = name ? name : val;
    if (name && bal) sub = lab + ' · ' + bal.word + ' ' + M(bal.paise);
    return K.lrow(kind === 'customer' ? 'user' : 'tray', ttl, sub);
  }
  /* entry lines under the form, newest first. rows: [name, sub, paise] */
  function lines(rows) {
    return K.list(rows.map(function (r) { return K.row({ state: 'done', name: r[0], sub: r[1], paise: r[2] }); }));
  }
  /* the foot of every entry form: mode segment, amount typed, strong Add, keypad (no scroll for these) */
  function foot(segItems, on, draft, o) {
    o = o || {};
    return K.sticky(
      K.seg(segItems, on),
      '<div class="ln" style="display:flex;justify-content:space-between;align-items:center;padding:2px 6px;gap:8px"><span style="color:var(--muted)">' + t('formA.amount') + '</span><span style="font-size:1.6em;font-weight:700">' + M(draft) + '</span></div>',
      K.addbar(t('common.add'), 0, o.dis)
    ) + K.keypad();
  }
  function seg3() { return [t('t8.collect'), t('t8.pay'), t('t8.credit')]; }
  function entryScreen(title, upper, segItems, on, draft, overlay, chip) {
    return top(title, chip) + K.scroll.apply(null, upper) + foot(segItems, on, draft) + (overlay || '');
  }

  var CUST = [['ramesh', 120000, 0], ['sunita', 30000, 1], ['bijay', 0, 2], ['lakshmi', 875000, 3], ['pradeep', 400000, 4]];
  function pickerRows(kind) {
    var h = '';
    if (kind === 'customer') {
      CUST.forEach(function (c) {
        h += K.prow(K.nm(c[0]), c[2], '', c[1], c[1] === 0 ? t('picker.settled') : t('picker.owes'));
      });
    } else {
      h += K.prow(SUP, 0, '', 800000, t('picker.youOwe')) + K.prow(SUP2, 1, '', 0, t('picker.settled')) + K.prow('Shree Agencies', 2, '', 650000, t('picker.youOwe'));
    }
    return '<ul class="rows" style="display:flex;flex-direction:column;gap:8px;padding:8px 12px">' + h + '</ul>';
  }
  /* the picker is a full overlay over the form (PartyPicker): title, list with balances, add-new, Cancel */
  function picker(kind, rowsHtml, emptyKey) {
    var hd = '<div class="sec">' + t(kind === 'customer' ? 'party.chooseCustomer' : 'party.chooseSupplier') + '</div>';
    var add = K.stack(K.primary(t(kind === 'customer' ? 'party.addCustomer' : 'party.addSupplier'), 'outline', 'plus'), K.primary(t('party.cancel'), 'outline'));
    return top(t(kind === 'customer' ? 'party.customer' : 'party.supplier')) + K.scroll(hd, rowsHtml) + add;
  }

  var NOTE_ENTRY = 'Draws the real T8 form. The person row is in the scrolling body above the segment, never between the amount and the keypad. ';

  SPEC.area = { title: 'Money entries', intro: 'Mitra versions of the entry forms that are not a plain sale: Udhar sale, Collect and Pay supplier (T8, one form with three live segments, titled by the real action), Expense and Purchase (T9), Withdrawal (T10), the typed Adjustment (T19) and the correction after a day is closed (T16), with the person picker for customers and for suppliers. Every form keeps header, entry block, strong Add and keypad on one screen. Digits are whole rupees as on the Sale form.', screens: [

    /* ================= T8 UDHAR SALE ================= */
    {
      id: 'money-credit-start', route: 'T8', title: 'Udhar sale: no person chosen yet', flag: 'CHG',
      purpose: 'A sale on credit names a customer (udhar owed by nobody can never be collected). Nothing typed, nobody chosen: Add is live, and nothing red is showing.',
      primary: 'Choose the customer, then type the amount, then Add.',
      taps: 'Today: Udhar sale tile (1), customer row (2), customer in the list (3), digits (3 for a three-figure amount), Add = 8 taps. If the customer is already kept from the last entry: 5 taps. Target under 10 s for a sale; a count of taps, not a measured time.',
      rules: 'Udhar does not move the cash drawer (D2). The person is required for this segment (engine partyRule). No refusal is drawn before a tap (QA-07). No suggested amount, no "usual" customer (no inference).',
      notes: NOTE_ENTRY + 'Title is the live segment (t8.title.credit), and the total beside it is what customers owe (P7), not the old "Udhar book" for all three. Add is a full-width bar above the keypad (v1 had it beside the figure). The segment order is Collect, Pay supplier, Udhar sale as built; this frame has Udhar sale live.',
      body: function () {
        return entryScreen(t('t8.title.credit'), [
          total(t('t8.outstanding'), P7), person('customer', null),
          lines([[t('section.udhar_sales') + ' - ' + K.nm('lakshmi'), '16:10', 150000], [t('section.udhar_collection') + ' - ' + K.nm('sunita') + ' - ' + t('formA.mode.cash'), '12:10', 30000]])
        ], seg3(), 2, 0);
      }
    },
    {
      id: 'money-credit-typed', route: 'T8', title: 'Udhar sale: customer chosen, balance above the keypad, amount typed', flag: 'CHG',
      purpose: 'He sees how much this customer already owes before he adds more, on the screen where that is the question.',
      primary: 'Add (₹800.00 shows on the bar).',
      taps: 'Digits 8, 0, 0 (3 taps), Add (1) after the customer is chosen.',
      rules: 'Balance is derived from the entries, never stored. The saved udhar will not change "In the box now" (D2).',
      notes: 'Person row shows the name with the balance under it in words and figure (picker.owes). Same figure the picker row showed.',
      body: function () {
        return entryScreen(t('t8.title.credit'), [
          total(t('t8.outstanding'), P7), person('customer', K.nm('ramesh'), { word: t('picker.owes'), paise: 120000 }),
          lines([[t('section.udhar_sales') + ' - ' + K.nm('lakshmi'), '16:10', 150000]])
        ], seg3(), 2, 80000);
      }
    },
    {
      id: 'money-credit-limit', route: 'T8', title: 'Udhar sale: above the limit he set (said, never enforced)', flag: 'EXISTS',
      purpose: 'This customer has a credit limit. The sale would go past it; the form says so in one sentence and still lets him add.',
      primary: 'Add stays live. The sentence is something to review, not an instruction.',
      taps: 'No extra tap.',
      rules: 'R5 FR-6: observation only, nothing is suggested in its place and the amount stays as typed. Status is words in a bordered box, not colour only.',
      notes: 'Wording is the existing limit.observation.',
      body: function () {
        return entryScreen(t('t8.title.credit'), [
          total(t('t8.outstanding'), P7), person('customer', K.nm('pradeep'), { word: t('picker.owes'), paise: 400000 }),
          K.banner('info', 'info', t('limit.observation', { name: K.nm('pradeep'), would: K.rupee(550000), limit: K.rupee(500000) }))
        ], seg3(), 2, 150000);
      }
    },
    {
      id: 'money-credit-saved', route: 'T8', title: 'Udhar sale: saved', flag: 'CHG',
      purpose: 'The tap landed: say so in words with the figure and the mode, and show the new line first. The person stays chosen; the draft is empty.',
      primary: 'Next entry, or Back to Today.',
      taps: 'Back = 1 tap.',
      rules: 'Append-only: a new line, nothing edited. The customer now owes ₹1,200.00 + ₹800.00 = ₹2,000.00 and the P7 total moves by the same ₹800.00 (derived). No cash line moves.',
      notes: 'After Add the code clears the amount but not the chosen person (entryPartyId is kept). I did not confirm whether opening another tile from Today clears the person; the one-sentence assumption is flagged here.',
      body: function () {
        return entryScreen(t('t8.title.credit'), [
          saved(80000, t('formA.mode.udhar')), total(t('t8.outstanding'), P7 + 80000),
          person('customer', K.nm('ramesh'), { word: t('picker.owes'), paise: 200000 }),
          lines([[t('section.udhar_sales') + ' - ' + K.nm('ramesh'), '17:42', 80000], [t('section.udhar_sales') + ' - ' + K.nm('lakshmi'), '16:10', 150000]])
        ], seg3(), 2, 0);
      }
    },

    /* ================= T8 COLLECT ================= */
    {
      id: 'money-collect-start', route: 'T8', title: 'Collect: no person chosen yet', flag: 'CHG',
      purpose: 'Money coming back from a customer. Nobody chosen yet, nothing typed; Add is live and nothing red is on screen.',
      primary: 'Choose the customer (the row), then digits, then Add.',
      taps: 'COLLECT from Today (target under 20 s, taps only): Collect tile (1), customer row (2), customer in the list (3), digits 5,0,0 (4,5,6), Add (7) = 7 taps. With the person already kept from the last entry: 5 taps.',
      rules: 'Collect adds cash to the drawer (D2: only cash mode touches it). No stale refusal from the last form is shown (QA-07).',
      notes: NOTE_ENTRY + 'Title is "Collect" (t8.title.collect) and the total beside it is what customers owe (P7).',
      body: function () {
        return entryScreen(t('t8.title.collect'), [
          total(t('t8.outstanding'), P7), person('customer', null),
          lines([[t('section.udhar_collection') + ' - ' + K.nm('sunita') + ' - ' + t('formA.mode.cash'), '12:10', 30000]])
        ], seg3(), 0, 0);
      }
    },
    {
      id: 'money-collect-typed', route: 'T8', title: 'Collect: person chosen, balance above the keypad, amount typed', flag: 'CHG',
      purpose: 'He sees Ramesh owes ₹1,200.00 before he types what Ramesh paid.',
      primary: 'Add (₹500.00 on the bar).',
      taps: 'Digits and Add as counted on the start frame.',
      rules: 'The figure typed is what he typed; the app does not offer "pay in full" or any amount (no inference). Balance derived from entries.',
      notes: 'Balance wording is picker.owes beside the figure. After Add Ramesh will owe ₹700.00.',
      body: function () {
        return entryScreen(t('t8.title.collect'), [
          total(t('t8.outstanding'), P7), person('customer', K.nm('ramesh'), { word: t('picker.owes'), paise: 120000 }),
          lines([[t('section.udhar_collection') + ' - ' + K.nm('sunita') + ' - ' + t('formA.mode.cash'), '12:10', 30000]])
        ], seg3(), 0, 50000);
      }
    },
    {
      id: 'money-collect-advance', route: 'T8', title: 'Collect: more than they owe (QA-03 confirm)', flag: 'CHG',
      purpose: 'Sunita owes ₹300.00 and he typed ₹500.00. The app asks, calmly, rather than silently going negative or refusing.',
      primary: 'Two equal choices: Record as advance, or No, go back. Neither is the louder button.',
      taps: 'Adds ONE tap to the collect count: 8 taps with the person chosen from the list, 6 with the person kept. Going back keeps the typed amount for him to correct.',
      rules: 'QA-03: held until he confirms; confirmed, it is saved as typed and the balance then shows as "Advance" in words, never a bare minus. No confirm-shaming: both buttons the same size and weight, the sentence states the facts only.',
      notes: 'The app draws this as an inline card in the form with Record as advance as the solid button and No, go back as a ghost; here it is a centred dialog with the two buttons outlined alike (proposal, so the refusing choice has equal visual weight). Wording is advance.confirm, advance.yes, advance.no, existing keys. The same dialog appears when a payment to a supplier is more than is owed.',
      review: 'Proposal: replace the inline card with this dialog, and give "No, go back" the same weight as "Record as advance".',
      body: function () {
        return entryScreen(t('t8.title.collect'), [
          total(t('t8.outstanding'), P7), person('customer', K.nm('sunita'), { word: t('picker.owes'), paise: 30000 }),
          lines([[t('section.udhar_collection') + ' - ' + K.nm('sunita') + ' - ' + t('formA.mode.cash'), '12:10', 30000]])
        ], seg3(), 0, 50000,
          K.dialog(t('advance.confirm', { extra: K.rupee(20000) }), K.stack(K.primary(t('advance.yes'), 'outline'), K.primary(t('advance.no'), 'outline'))));
      }
    },
    {
      id: 'money-collect-zero', route: 'T8', title: 'Collect: Rs 0 refused', flag: 'EXISTS',
      purpose: 'He tapped Add with ₹0.00. A zero entry could never be removed (append-only) and would count on the day-close list, so it is not saved, and the message says where to go if there is nothing to enter.',
      primary: 'Type an amount, or leave: the refusal tells him the day-close list has "Nothing to enter".',
      taps: 'No extra taps. The refusal appears only after the Add tap; it clears on the next digit.',
      rules: 'QA-04: Rs 0 is refused (refusal.amountZero). A refusal never shows before a tap and is cleared when the amount changes, so it never leaks into the next form. Words and a "Not saved" title; not colour alone.',
      notes: 'Same banner for any entry form. The banner is an overlay at the top of the app, as built.',
      body: function () {
        return entryScreen(t('t8.title.collect'), [
          total(t('t8.outstanding'), P7), person('customer', K.nm('ramesh'), { word: t('picker.owes'), paise: 120000 }),
          lines([[t('section.udhar_collection') + ' - ' + K.nm('sunita') + ' - ' + t('formA.mode.cash'), '12:10', 30000]])
        ], seg3(), 0, 0, K.refbanner(t('refusal.title'), t('refusal.amountZero')));
      }
    },
    {
      id: 'money-collect-noperson', route: 'T8', title: 'Collect: amount typed, nobody chosen', flag: 'EXISTS',
      purpose: 'He typed an amount and has not chosen who paid. First the form says why Add cannot finish, in the row above the pad; if he taps Add anyway the refusal names the missing person.',
      primary: 'Choose the customer.',
      taps: 'No extra taps: the same choose-customer step as the start frame.',
      rules: 'QA-07: the sentence "Choose who this is for before adding it." appears only once an amount is typed, never on a fresh form. The refusal (refusal.partyId) appears only after the Add tap.',
      notes: 'The in-form sentence (party.required) and the refusal banner are drawn together here to show both; in the app the banner shows only after Add.',
      body: function () {
        return entryScreen(t('t8.title.collect'), [
          total(t('t8.outstanding'), P7), person('customer', null),
          K.banner('err', 'warn', t('party.required'))
        ], seg3(), 0, 50000, K.refbanner(t('refusal.title'), t('refusal.partyId')));
      }
    },
    {
      id: 'money-collect-saved', route: 'T8', title: 'Collect: saved', flag: 'CHG',
      purpose: 'Saved ₹500.00, Cash, in words. Ramesh now owes ₹700.00 and the P7 total is ₹21,000.00, both derived.',
      primary: 'Next entry, or Back.',
      taps: 'Back = 1 tap.',
      rules: 'Only cash mode touches the drawer: "In the box now" on Today moves by +₹500.00. Append-only: a new line on top, nothing edited.',
      notes: 'Collected lines carry a plus; the payment form below carries a minus.',
      body: function () {
        return entryScreen(t('t8.title.collect'), [
          saved(50000, t('formA.mode.cash')), total(t('t8.outstanding'), P7 - 50000),
          person('customer', K.nm('ramesh'), { word: t('picker.owes'), paise: 70000 }),
          lines([[t('section.udhar_collection') + ' - ' + K.nm('ramesh') + ' - ' + t('formA.mode.cash'), '17:48', 50000], [t('section.udhar_collection') + ' - ' + K.nm('sunita') + ' - ' + t('formA.mode.cash'), '12:10', 30000]])
        ], seg3(), 0, 0);
      }
    },

    /* ================= T8 PAY SUPPLIER ================= */
    {
      id: 'money-pay-start', route: 'T8', title: 'Pay supplier: no supplier chosen yet', flag: 'CHG',
      purpose: 'Money going out to a supplier. The list offers suppliers only (never customers), and the total beside the title is what the shop owes them.',
      primary: 'Choose the supplier, type, Add.',
      taps: 'Today: More (1), Pay supplier row (2), supplier row (3), supplier in the list (4), digits 3,0,0,0 (5 to 8), Add (9) = 9 taps for ₹3,000. With the supplier kept: 7. A Pay tile on Today would save one tap; not proposed here, only counted.',
      rules: 'Title is "Pay supplier" and the total is "You owe suppliers" (P8): v1 showed "Owed to you" here, a customer figure. Cash out of the drawer (D2) is printed with a minus.',
      notes: NOTE_ENTRY + 'There is no Pay tile on Today; Pay supplier is a row in the More sheet.',
      body: function () {
        return entryScreen(t('t8.title.pay'), [
          total(t('p1.youOwe'), P8), person('supplier', null),
          lines([[t('section.party_payment') + ' - ' + SUP2 + ' - ' + t('formA.mode.cash'), '11:20', -250000]])
        ], seg3(), 1, 0);
      }
    },
    {
      id: 'money-pay-typed', route: 'T8', title: 'Pay supplier: supplier chosen, what you owe above the keypad, amount typed', flag: 'CHG',
      purpose: 'He sees he owes Mahadev Traders ₹8,000.00 before he types what he paid.',
      primary: 'Add (₹3,000.00).',
      taps: 'Digits and Add as counted on the start frame.',
      rules: 'The word is "you owe" (picker.youOwe), the supplier-side wording. A payment above what is owed gets the same advance confirm as Collect (QA-03). Nothing suggested.',
      notes: 'Typed ₹3,000.00 is under the ₹8,000.00 owed, so no confirm. After Add the shop owes ₹5,000.00.',
      body: function () {
        return entryScreen(t('t8.title.pay'), [
          total(t('p1.youOwe'), P8), person('supplier', SUP, { word: t('picker.youOwe'), paise: 800000 }),
          lines([[t('section.party_payment') + ' - ' + SUP2 + ' - ' + t('formA.mode.cash'), '11:20', -250000]])
        ], seg3(), 1, 300000);
      }
    },
    {
      id: 'money-pay-saved', route: 'T8', title: 'Pay supplier: saved', flag: 'CHG',
      purpose: 'Saved ₹3,000.00, Cash. The supplier now shows ₹5,000.00 owed and P8 drops by the same figure.',
      primary: 'Next entry, or Back.',
      taps: 'Back = 1 tap.',
      rules: 'Out-flow printed with a minus: "In the box now" drops by ₹3,000.00. A payment to a supplier is not an expense and is not in profit.',
      notes: 'The new line is on top, negative.',
      body: function () {
        return entryScreen(t('t8.title.pay'), [
          saved(300000, t('formA.mode.cash')), total(t('p1.youOwe'), P8 - 300000),
          person('supplier', SUP, { word: t('picker.youOwe'), paise: 500000 }),
          lines([[t('section.party_payment') + ' - ' + SUP + ' - ' + t('formA.mode.cash'), '17:51', -300000], [t('section.party_payment') + ' - ' + SUP2 + ' - ' + t('formA.mode.cash'), '11:20', -250000]])
        ], seg3(), 1, 0);
      }
    },

    /* ================= PERSON PICKER ================= */
    {
      id: 'money-picker-customer', route: 'T8', title: 'Person picker: customers (Collect and Udhar sale)', flag: 'CHG',
      purpose: 'Choose who. Every row shows the person\'s name and what they owe, large, because this is where he decides whose udhar he is collecting.',
      primary: 'Tap the person (the whole row is the target).',
      taps: '1 tap to choose. Add new customer is one more route when the book is new.',
      rules: 'Balance is derived across every day this phone holds. A zero balance says "nothing owed" in words; a negative balance would say "Advance", never a bare minus. Customers only for Collect and Udhar sale, so an entry cannot land on the wrong side of the book. Row height 76 or more.',
      notes: 'Rows are K.prow with avatar initial, as in the Parties list. The order is the order of the book; no "most used first" ranking (no inference). Cancel is the same weight as Add new customer.',
      body: function () { return picker('customer', pickerRows('customer')); }
    },
    {
      id: 'money-picker-supplier', route: 'T8', title: 'Person picker: suppliers (Pay supplier, Purchase on credit)', flag: 'CHG',
      purpose: 'Same picker for the supplier side. The wording is "you owe", and a settled supplier says "nothing owed".',
      primary: 'Tap the supplier.',
      taps: '1 tap to choose.',
      rules: 'Suppliers only on this side. The person kind comes from the live segment: Purchase and Pay supplier are supplier; Collect and Udhar sale are customer.',
      notes: 'The same list is used by Purchase (optional supplier) and Pay supplier (required).',
      body: function () { return picker('supplier', pickerRows('supplier')); }
    },
    {
      id: 'money-picker-empty', route: 'T8', title: 'Person picker: empty book (no suppliers yet)', flag: 'EXISTS',
      purpose: 'A new shop has nobody to choose. The empty list says so and the next action is on the same screen: add one.',
      primary: 'Add new supplier (opens a Name and optional mobile number form, then "Save and choose").',
      taps: 'Add new supplier (1), type a name, Save and choose (1) = then back on the form with the new supplier chosen.',
      rules: 'F-10: a party can be added from inside the picker, otherwise every entry that needs a person would be refused with nobody to name. Never "nothing here yet" alone.',
      notes: 'party.noSuppliers / party.noCustomers are the empty copy. The new-party form itself (party.name, party.phone, party.save, party.backToList) is not drawn here; it belongs to the Parties area.',
      body: function () {
        return top(t('party.supplier')) + K.scroll(K.sec(t('party.chooseSupplier')), K.empty('tray', t('party.noSuppliers'))) +
          K.stack(K.primary(t('party.addSupplier'), '', 'plus'), K.primary(t('party.cancel'), 'outline'));
      }
    },

    /* ================= T9 EXPENSE and PURCHASE ================= */
    {
      id: 'money-expense', route: 'T9', title: 'Expense: five modes, Cash live', flag: 'CHG',
      purpose: 'Money the shop spent running itself (tea, transport, rent). Five modes; only Cash leaves the drawer.',
      primary: 'Type the amount, Add.',
      taps: 'Today: Expense tile (1), digits (2 for ₹80), Add (1) = 4 taps. The mode defaults to Cash, so a cash expense costs no segment tap.',
      rules: 'D2: UPI, Other, Udhar and Shop stock are recorded but do not move the drawer. No person row: the engine refuses a party on an expense. Expenses are in profit; a withdrawal is not (see T10).',
      notes: 'The code has no "What for?" text box on this form (the key t9.label exists but is not rendered here); I did not add one. Five segments wrap to two rows; each is 56 high.',
      body: function () {
        return entryScreen(t('t9.title'), [
          total(t('section.expense'), 42000),
          lines([[t('section.expense') + ' - ' + t('formA.mode.cash'), '14:05', 12000], [t('section.expense') + ' - ' + t('t9.mode.other'), '09:30', 30000]])
        ], [t('formA.mode.cash'), t('formA.mode.upi'), t('t9.mode.other'), t('formA.mode.udhar'), t('t9.mode.shop_stock')], 0, 8000);
      }
    },
    {
      id: 'money-expense-stock', route: 'T9', title: 'Expense: Shop stock live (no cash moves)', flag: 'EXISTS',
      purpose: 'An expense paid out of the shop\'s own stock changes profit and does not touch the drawer. Offering it stops him recording it as cash and the drawer failing to reconcile for a reason he cannot find.',
      primary: 'Type the amount, Add.',
      taps: '+1 tap for the segment (5 taps).',
      rules: 'D2: only cash touches the cash equation; Shop stock does not. The mode is the only difference on screen.',
      notes: 'Same form, one segment selected.',
      body: function () {
        return entryScreen(t('t9.title'), [
          total(t('section.expense'), 42000),
          lines([[t('section.expense') + ' - ' + t('formA.mode.cash'), '14:05', 12000]])
        ], [t('formA.mode.cash'), t('formA.mode.upi'), t('t9.mode.other'), t('formA.mode.udhar'), t('t9.mode.shop_stock')], 4, 5000);
      }
    },
    {
      id: 'money-purchase', route: 'T9', title: 'Purchase: four modes, optional supplier row with chevron', flag: 'CHG',
      purpose: 'Buying stock for the shop. A non-credit purchase may name a supplier but does not have to; a credit (Udhar) purchase must.',
      primary: 'Type the amount, Add. The supplier row is a chevron row; skipping it is allowed.',
      taps: 'Today: More (1), Purchase (2), digits (3 for ₹4,000 = 4 digits: 4 taps), Add (1) = 8 taps without a supplier; +2 taps to name one.',
      rules: 'The supplier row is Optional for Cash, UPI and Other; the segment Udhar makes it required (refusal.partyId appears only after the Add tap). Shop stock is not offered here: taking stock into the shop is what a purchase already is. Cash outflow is printed with a minus.',
      notes: 'The supplier row with the chevron is on PURCHASE, not Expense: the engine refuses a person on an expense and makes one optional on a purchase. The row carries the word "Optional" (party.optional).',
      body: function () {
        return entryScreen(t('act.purchase'), [
          total(t('section.purchase'), 600000), person('supplier', null, null, true),
          lines([[t('section.purchase') + ' - ' + SUP + ' - ' + t('formA.mode.udhar'), '10:15', 600000]])
        ], [t('formA.mode.cash'), t('formA.mode.upi'), t('t9.mode.other'), t('formA.mode.udhar')], 0, 400000);
      }
    },

    /* ================= T10 WITHDRAWAL ================= */
    {
      id: 'money-withdraw', route: 'T10', title: 'Withdrawal: money you took', flag: 'CHG',
      purpose: 'The owner takes money out for himself. It leaves the drawer and is NOT a cost of the shop, so it stays outside profit (D3).',
      primary: 'Type the amount, Add.',
      taps: 'Today: More (1), Withdrawal (2), digits (4 for ₹5,000), Add (1) = 8 taps; Cash is live by default.',
      rules: 'D3 said in words, on the form: "This leaves the cash box but is not a shop cost, so it does not change profit." (t10.note), as a calm note with an info icon, not small grey text. Cash or UPI only. No person.',
      notes: 'Withdrawal is not an expense: recorded as one it would understate profit. Two modes only (cash, upi); a UPI withdrawal does not move the drawer (D2).',
      body: function () {
        return entryScreen(t('t10.title'), [
          total(t('section.withdrawal'), 500000),
          K.banner('info', 'info', t('t10.note')),
          lines([[t('section.withdrawal') + ' - ' + t('formA.mode.cash'), '13:00', -500000]])
        ], [t('formA.mode.cash'), t('formA.mode.upi')], 0, 200000);
      }
    },

    /* ================= T19 ADJUSTMENT ================= */
    {
      id: 'money-adjust-list', route: 'T19', title: 'Adjustment: choose what happened (fixed list)', flag: 'CHG',
      purpose: 'A typed adjustment explains a gap in the cash count. Step one: what happened, from a fixed list of five. There is no text box and no "other".',
      primary: 'Choose one of the five, then type the amount, then Save adjustment.',
      taps: 'Reached from the day-close list (T5) via Add adjustment: type (1), digits (2 for ₹50), Save adjustment (1) = 4 taps.',
      rules: 'Decision 2: typed from a fixed list, never free-form; a free-form adjustment could absorb any discrepancy and make expected-vs-actual meaningless. Nothing is pre-selected or pre-filled. Save is shown held until a type and an amount exist.',
      notes: 'Five radio rows, 56 or more high, each a label only. The consequence line appears after choosing (next frame). It is also reachable from the More sheet on Today in this redesign, which is a change: today it is only on T5.',
      body: function () {
        var rows = K.lrow('note', t('adjustment.counterfeit_note'), '', { noChev: 1 }) + K.lrow('coin', t('adjustment.rounding_given'), '', { noChev: 1 }) + K.lrow('coin', t('adjustment.rounding_kept'), '', { noChev: 1 }) + K.lrow('box', t('adjustment.home_use'), '', { noChev: 1 }) + K.lrow('trash', t('adjustment.stock_written_off'), '', { noChev: 1 });
        return top(t('t19.title')) + K.scroll(K.sec(t('t19.type')), rows) + K.sticky(
          '<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 6px"><span style="color:var(--muted)">' + t('t19.amount') + '</span><span style="font-size:1.6em;font-weight:700">' + M(0) + '</span></div>',
          K.addbar(t('t19.save'), 0, true)) + K.keypad();
      }
    },
    {
      id: 'money-adjust-chosen', route: 'T19', title: 'Adjustment: type chosen, effect said, amount typed', flag: 'CHG',
      purpose: 'He sees what the chosen type will move before he saves: a fake note takes ₹50.00 off expected cash and off profit.',
      primary: 'Save adjustment.',
      taps: 'Counted above.',
      rules: 'Each type states its effect in words (adjust.effect.*): goods taken home or written-off stock move no cash. The chosen row is shown with a tick and a heavier edge, not colour alone. Append-only: saved as a new line.',
      notes: 'The list scrolls above the pad; the chosen row and its effect sentence are kept on screen by scrolling to the chosen row. Save is live now.',
      body: function () {
        var rows = K.lrow('tick', t('adjustment.counterfeit_note'), '', { noChev: 1 }).replace('class="lrow"', 'class="lrow" style="border-color:var(--act);border-width:3px" aria-checked="true"') + K.lrow('coin', t('adjustment.rounding_given'), '', { noChev: 1 }) + K.lrow('coin', t('adjustment.rounding_kept'), '', { noChev: 1 });
        return top(t('t19.title')) + K.scroll(K.sec(t('t19.type')), rows, K.banner('info', 'info', t('adjust.effect.counterfeit_note'))) + K.sticky(
          '<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 6px"><span style="color:var(--muted)">' + t('t19.amount') + '</span><span style="font-size:1.6em;font-weight:700">' + M(5000) + '</span></div>',
          K.addbar(t('t19.save'))) + K.keypad();
      }
    },
    {
      id: 'money-adjust-closed', route: 'T19', title: 'Adjustment: day is closed (no controls that would only throw)', flag: 'EXISTS',
      purpose: 'On a closed day the type rows are disabled and there is no amount, Save or keypad: a closed day is frozen.',
      primary: 'Back. The only change to a closed day is a correction (see below).',
      taps: 'Back = 1 tap.',
      rules: 'D7: the database would refuse the write. F-7: offer no control that can only fail. The lock banner is words plus an icon.',
      notes: 'The code draws the disabled rows without a banner; the lock banner and the correction button here are an addition (proposal).',
      review: 'Proposal: add the lock banner and a "Post a correction" button to this frozen view (the app shows disabled rows only).',
      body: function () {
        var rows = K.lrow('note', t('adjustment.counterfeit_note'), '', { noChev: 1 }) + K.lrow('coin', t('adjustment.rounding_given'), '', { noChev: 1 }) + K.lrow('coin', t('adjustment.rounding_kept'), '', { noChev: 1 }) + K.lrow('box', t('adjustment.home_use'), '', { noChev: 1 }) + K.lrow('trash', t('adjustment.stock_written_off'), '', { noChev: 1 });
        return top(t('t19.title')) + K.scroll(K.banner('info', 'lock', t('t3.banner')), K.stack(K.primary(t('t3.correction'), '', 'pencil')), K.sec(t('t19.type')), '<div style="opacity:.55">' + rows + '</div>');
      }
    },

    /* ================= T16 CORRECTION ================= */
    {
      id: 'money-correct-list', route: 'T16', title: 'Correction: choose the entry that was short', flag: 'CHG',
      purpose: 'A day is closed and frozen. He missed an amount. Step one: say it cannot be reopened, then pick which entry was short.',
      primary: 'Tap the entry.',
      taps: 'From Today (closed): Post a correction (1), entry (2), digits (2 for ₹50), Add (1) = 5 taps.',
      rules: 'D1/D7: nothing is edited or deleted and the closed day never moves. A correction adds what was missed as a NEW entry that points at the one it corrects, dated to the next open business day. Amounts are never negative. Each row says what it is, how it was paid, when, and the amount. The return legs are not offered.',
      notes: 'The real rows show section, label and amount only; this proposal adds the mode and the time, as on the entry lists, so he can tell two cash sales apart. The next-day sentence uses the shop\'s own start time (retailer-defined business day, 2026-10-22 decision); 04:00 is a demo value.',
      review: 'Proposal: show mode and time on each picker row (the app shows section and amount only).',
      body: function () {
        var rows = K.lrow('coin', t('section.cash_sales'), t('formA.mode.cash') + ' · 11:05', { right: M(425000) }) +
          K.lrow('coin', t('section.upi_sales'), t('formA.mode.upi') + ' · 12:40', { right: M(180000) }) +
          K.lrow('book', t('section.udhar_sales') + ' - ' + K.nm('sunita'), t('formA.mode.udhar') + ' · 16:10', { right: M(150000) }) +
          K.lrow('receipt', t('section.expense'), t('formA.mode.cash') + ' · 13:20', { right: M(12000) });
        return top(t('t3.correction')) + K.scroll(K.banner('info', 'lock', t('t16.frozen')), K.banner('', 'clock', t('t16.nextDay', { time: '04:00' })), K.sec(t('t16.entries')), rows);
      }
    },
    {
      id: 'money-correct-amount', route: 'T16', title: 'Correction: enter the amount missed, Add', flag: 'CHG',
      purpose: 'The chosen entry is shown as "Adds to: Cash sales of Thu 19 Nov" and he types only what was missed.',
      primary: 'Add.',
      taps: 'Digits and Add as counted above.',
      rules: 'Additive only: the copy says "adds", never "changes". The original line is shown unchanged with its own figure so he can see it will not move. No suggested amount.',
      notes: 'The footer has the amount missed (t16.amount), Add (common.add) and the keypad, as in the app. Changing his mind: Back returns to the list, nothing is saved.',
      body: function () {
        return top(t('t3.correction')) + K.scroll(K.banner('info', 'lock', t('t16.frozen')), K.banner('', 'clock', t('t16.nextDay', { time: '04:00' })),
          K.list([K.row({ state: 'lock', name: t('t16.addsTo', { section: t('section.cash_sales'), date: K.date() }), paise: 425000 })])) +
          K.sticky(
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 6px"><span style="color:var(--muted)">' + t('t16.amount') + '</span><span style="font-size:1.6em;font-weight:700">' + M(5000) + '</span></div>',
            K.addbar(t('common.add'))) + K.keypad();
      }
    },
    {
      id: 'money-correct-held', route: 'T16', title: 'Correction: saved and waiting for the next day', flag: 'EXISTS',
      purpose: 'The closed day is still the current business day, so there is nowhere honest to write it yet. The correction is held and appended when the next day starts. The screen says which of the two happened.',
      primary: 'Back.',
      taps: 'Back = 1 tap.',
      rules: '"Saved" alone would let him think the closed day had changed; it did not. The held line shows the original it adds to and its own amount in a "Waiting for the next day" card.',
      notes: 'Outcome text is t16.held. The other outcome, "Added to today" (t16.recorded), is the next frame.',
      body: function () {
        return top(t('t3.correction')) + K.scroll(K.banner('info', 'lock', t('t16.frozen')), K.banner('', 'clock', t('t16.nextDay', { time: '04:00' })),
          K.banner('', 'check', t('t16.held')), K.sec(t('t16.waiting')),
          K.list([K.row({ state: 'skip', name: t('t16.addsTo', { section: t('section.cash_sales'), date: K.date() }), paise: 5000 })]));
      }
    },
    {
      id: 'money-correct-recorded', route: 'T16', title: 'Correction: added to today', flag: 'EXISTS',
      purpose: 'A day was open, so the correction was appended at once as a new, dated entry.',
      primary: 'Back.',
      taps: 'Back = 1 tap.',
      rules: 'Append-only: the line is new and references the original; the closed day\'s figures still do not move.',
      notes: 'Outcome text is t16.recorded. I could not tell from the code whether the next-day line is hidden once a new day is open; it is drawn hidden here (assumption).',
      body: function () {
        return top(t('t3.correction')) + K.scroll(K.banner('info', 'lock', t('t16.frozen')), K.banner('', 'check', t('t16.recorded')),
          K.list([K.row({ state: 'done', name: t('t16.addsTo', { section: t('section.cash_sales'), date: K.date() }), paise: 5000 })]));
      }
    },
    {
      id: 'money-correct-empty', route: 'T16', title: 'Correction: nothing to correct', flag: 'EXISTS',
      purpose: 'No closed day exists to correct. Say so and give a way out.',
      primary: 'Back to Today.',
      taps: '1 tap.',
      rules: 'Never "nothing here yet" alone: the sentence is specific and the next action is on the same screen.',
      notes: 'Copy is t16.empty. The next-action button uses the existing back label.',
      body: function () {
        return top(t('t3.correction')) + K.scroll(K.banner('info', 'lock', t('t16.frozen')), K.empty('calendar', t('t16.empty'), t('common.back'), 'back'));
      }
    },

    /* ================= shared states ================= */
    {
      id: 'money-form-loading', route: 'T8', title: 'Entry form: opening the day (loading)', flag: 'EXISTS',
      purpose: 'The form is opening from the phone\'s own database. Placeholder shapes, no spinner on save.',
      primary: 'None; shown for well under a second.',
      taps: 'n/a',
      rules: 'The header with Back is already on screen. Applies to T8, T9, T10, T16 and T19 through the shared shell.',
      notes: 'Copy: common.loading is the accessible name only.',
      body: function () {
        return top(t('t8.title.collect')) + '<div class="scroll" aria-busy="true" aria-label="' + t('common.loading') + '">' + K.skel(4) + '</div>';
      }
    },
    {
      id: 'money-form-error', route: 'T8', title: 'Entry form: could not open', flag: 'EXISTS',
      purpose: 'The form failed to open. Nothing typed is lost; one next step.',
      primary: 'Try again.',
      taps: '1 tap.',
      rules: 'Calm words, icon plus words. The ledger is on the phone and untouched. Back stays visible.',
      notes: 'Copy is common.error and common.retry.',
      body: function () {
        return top(t('t8.title.collect'), K.chip('wait', 2)) + K.scroll(K.banner('err', 'warn', t('common.error')), K.empty('refresh', t('common.error'), t('common.retry'), 'refresh'));
      }
    }
  ]};
})();
