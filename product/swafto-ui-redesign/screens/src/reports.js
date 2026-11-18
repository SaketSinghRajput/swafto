/* AREA: Reports (R1 and the basic report cards, M1 premium dashboard, C1 Ask, S12 entries for the accountant, S10 your plan).
   Copy by literal key K.t(KEY); a string that does not exist is K.N(the English text). Money is integer paise through K.M.
   Every figure in these frames is a demo figure; the cross-checks are in the comments next to each block. Status is never colour alone. */
(function () {
  var t = K.t, M = K.M;

  /* ---------- local helpers (the kit has no report card, plural or percent helper) ---------- */
  /* plural strings look like '{n|# day|# days}' (2 parts: one, other) or '{n|none|# day|# days}' (3 parts: zero, one, other); K.t leaves them alone */
  function pf(s, v) {
    return s.replace(/\{(\w+)\|([^}]*)\}/g, function (_, k, body) {
      var p = body.split('|'), n = v[k], r;
      if (p.length === 3) r = n === 0 ? p[0] : (n === 1 ? p[1] : p[2]); else r = n === 1 ? p[0] : p[1];
      return r.replace('#', n);
    });
  }
  function isum(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; }
  function pct(bp) { var tn = Math.round(bp / 10); return Math.floor(tn / 10) + '.' + (tn % 10) + '%'; } /* same one-decimal form as formatBasisPoints */
  function tabTop(chip) { return K.top({ title: t('r1.title'), right: chip || K.chip('ok') }); }
  function sub(title, chip) { return K.top({ title: title, back: true, right: chip || K.chip('ok') }); }
  function card(icon, title, inner) {
    return '<section class="hero" style="margin-top:12px"><div class="lbl"><span class="hi">' + K.ico(icon, 28) + '</span><span>' + title + '</span></div>' + inner + '</section>';
  }
  function mrow(label, paise, o) { return '<div class="ln" style="min-height:56px"><span class="k">' + label + '</span>' + M(paise, o) + '</div>'; }
  function rd(label, value, ico) { return '<div class="ln" style="min-height:56px"><span class="k">' + label + '</span><b style="display:flex;align-items:center;gap:6px">' + (ico ? K.ico(ico, 20) : '') + value + '</b></div>'; }
  function note(text) { return '<div style="color:var(--muted);padding:8px 0 2px;line-height:1.45;border-top:2px dashed var(--rule)">' + text + '</div>'; }
  function gateRow(label, have, need) { /* r1.gate sentence + a words-and-bar progress, never a zero and never an empty chart */
    return '<div class="ln" style="flex-direction:column;align-items:stretch;gap:4px;padding:8px 0;min-height:56px"><span class="k">' + label + '</span><span style="color:var(--muted);line-height:1.4">' + t('r1.gate', { need: need, have: have }) + '</span>' + K.bar(have, need) + '</div>';
  }
  function askBtn() { return K.stack(K.primary(t('c1.open'), 'tonal', 'chat')); }
  var D = {
    d18: function () { return t('t1.day.3') + ' 18 ' + t('t1.month.11'); },
    d17: function () { return t('t1.day.2') + ' 17 ' + t('t1.month.11'); },
    d16: function () { return t('t1.day.1') + ' 16 ' + t('t1.month.11'); },
    d15: function () { return t('t1.day.0') + ' 15 ' + t('t1.month.11'); },
    d14: function () { return t('t1.day.6') + ' 14 ' + t('t1.month.11'); },
    d13: function () { return t('t1.day.5') + ' 13 ' + t('t1.month.11'); },
    d12: function () { return t('t1.day.4') + ' 12 ' + t('t1.month.11'); }
  };

  /* ---------- demo book (derived in the comments, nothing typed that is not the sum of its parts) ---------- */
  var THIS = { closed: 18, cash: 1200000, upi: 450000, udhar: 300000, expenses: 310000, purchases: 800000, withdrawals: 200000 };
  THIS.net = isum([THIS.cash, THIS.upi, THIS.udhar]);                     /* 1,950,000 */
  THIS.profit = THIS.net - THIS.purchases - THIS.expenses;                  /* 840,000 */
  THIS.left = THIS.profit - THIS.withdrawals;                               /* 640,000: taken home sits BESIDE profit (D3), only 'left' is derived from it */
  var LAST = { closed: 12, cash: 700000, upi: 250000, udhar: 200000, expenses: 190000, purchases: 450000, withdrawals: 150000 };
  LAST.net = isum([LAST.cash, LAST.upi, LAST.udhar]);                       /* 1,150,000 */
  LAST.profit = LAST.net - LAST.purchases - LAST.expenses;                  /* 510,000 */
  LAST.left = LAST.profit - LAST.withdrawals;                               /* 360,000 */
  var ALL = { closed: THIS.closed + LAST.closed, sales: THIS.net + LAST.net, expenses: THIS.expenses + LAST.expenses, owed: 2150000 }; /* 30 days, 3,100,000, 500,000, owed = Today's 'Udhar to collect' */
  var BOXNOW = 1200000 + 935000 - 290000;                                   /* same box as Today's frames: 1,845,000 */

  function figuresCard(all) {
    return card('bars', t('r1.title'),
      rd(t('r1.daysClosed'), String(all.closed)) +
      mrow(t('r1.totalSales'), all.sales) +
      mrow(t('r1.totalExpenses'), all.expenses, { out: true }) +
      mrow(t('r1.creditOutstanding'), all.owed) +
      note(t('r1.note')));
  }
  function dashRow() { return '<div style="margin:12px 12px 0">' + K.lrow('star', t('rep.dashboard'), t('rep.dashboard.detail')) + '</div>'; }
  /* rep.party.age is '{name} · {n|since today|# day|# days}' */
  function partyAge(name, n) { return pf(t('rep.party.age', { name: name }), { n: n }); }
  function duesCard(title, buckets, parties) {
    var h = mrow(t('rep.bucket.0'), buckets[0]) + mrow(t('rep.bucket.1'), buckets[1]) + mrow(t('rep.bucket.2'), buckets[2]) + mrow(t('rep.bucket.3'), buckets[3]);
    parties.forEach(function (p) { h += mrow(partyAge(p[0], p[1]), p[2]); });
    return card('users', title, h + note(t('rep.dues.note')));
  }
  function custDues() {
    /* 1,400,000 + 450,000 + 200,000 + 100,000 = 2,150,000 = the five names below, oldest first */
    return duesCard(t('rep.dues.title'), [1400000, 450000, 200000, 100000],
      [[K.nm('pradeep'), 95, 100000], [K.nm('lakshmi'), 70, 200000], [K.nm('sunita'), 40, 450000], [K.nm('bijay'), 18, 500000], [K.nm('ramesh'), 5, 900000]]);
  }
  function suppDues() {
    return duesCard(t('rep.owe.title'), [800000, 0, 0, 0], [['Maa Tarini Stores', 20, 500000], ['Kedar Wholesale', 9, 300000]]);
  }
  function monthCard(titleHtml, m) {
    return card('calendar', titleHtml,
      rd(t('r1.daysClosed'), String(m.closed)) +
      mrow(t('rep.month.netSales'), m.net) + mrow(t('rep.month.cash'), m.cash) + mrow(t('rep.month.upi'), m.upi) + mrow(t('rep.month.udhar'), m.udhar) +
      mrow(t('rep.month.expenses'), m.expenses, { out: true }) + mrow(t('rep.month.purchases'), m.purchases, { out: true }) +
      mrow(t('rep.month.profit'), m.profit, { sign: true, tone: 'dir' }) +
      mrow(t('rep.month.takenHome'), m.withdrawals, { out: true }) +
      mrow(t('rep.month.left'), m.left, { sign: true, tone: 'dir' }) +
      note(t('rep.month.note')));
  }
  function cashCard() {
    /* 22 + 5 + 3 = 30 closed days */
    var rows = [[D.d18(), 0], [D.d17(), -5000], [D.d16(), 0], [D.d15(), 2000], [D.d14(), 0], [D.d13(), -10000], [D.d12(), 0]];
    var h = rd(t('rep.cash.balanced'), pf(t('r1.ofDays', { n: 22, w: 30 }), {}), 'check') +
      rd(t('rep.cash.short'), pf(t('r1.ofDays', { n: 5, w: 30 }), {}), 'down') +
      rd(t('rep.cash.extra'), pf(t('r1.ofDays', { n: 3, w: 30 }), {}), 'up');
    rows.forEach(function (r) { h += mrow(r[0], r[1], r[1] === 0 ? {} : { sign: true, tone: 'dir' }); });
    return card('note', t('rep.cash.title'), h);
  }
  function upiCard() {
    return card('phone', t('rep.upi.title'),
      mrow(t('rep.month.this'), 430000) + rd(t('rep.upi.title'), t('rep.upi.receipts', { n: 41, w: 44 })) +
      mrow(t('rep.month.last'), 250000) + rd(t('rep.upi.title'), t('rep.upi.receipts', { n: 23, w: 23 })));
  }
  function changingCard() {
    return card('bars', t('r1.changing'),
      rd(t('r1.bi1'), t('r1.bi1.up'), 'up') +
      mrow(t('r1.bi1.earlier'), 38000, { sign: true, tone: 'dir' }) + mrow(t('r1.bi1.later'), 46000, { sign: true, tone: 'dir' }) +
      rd(t('r1.bi2'), pct(1840)));
  }
  function pressureCard(noBaseline) {
    return card('warn', t('r1.pressure'),
      rd(t('r1.bi3'), pct(2260)) + rd(t('r1.bi3.short'), t('r1.ofDays', { n: 5, w: 28 })) +
      rd(t('r1.bi4'), pct(3120)) +
      rd(t('r1.bi6'), pct(7840)) +
      (noBaseline ? rd(t('r1.bi6.compared'), t('r1.bi6.no_baseline'), 'dash') : rd(t('r1.bi6.compared'), t('r1.bi6.worsening'), 'up')));
  }
  function ccCard() {
    return card('check', t('r1.cc.title'), rd(t('r1.cc.match'), t('r1.ofDays', { n: 22, w: 30 })) + rd(t('r1.cc.gap'), pct(120)) + note(t('r1.cc.notYet')));
  }
  function ocCard() {
    return card('tick', t('r1.oc.title'), rd(t('r1.oc.closing'), t('r1.ofDays', { n: 30, w: 31 })) + rd(t('r1.oc.recording'), pct(9450)) + rd(t('r1.oc.corrections'), pct(310)));
  }
  function bhNote() { return '<section class="hero" style="margin-top:12px;margin-bottom:12px"><div style="display:flex;gap:10px;line-height:1.45;align-items:flex-start"><span class="hi" style="width:44px;height:44px;border-radius:50%;background:var(--t1bg);color:var(--t1ic);display:flex;align-items:center;justify-content:center;flex:none">' + K.ico('info', 26) + '</span><span style="color:var(--muted)">' + t('r1.bh') + '</span></div></section>'; }

  /* ---------- M1 ---------- */
  var FC = [['Fri', 5, 20, 105000], ['Sat', 6, 21, 125000], ['Sun', 0, 22, 132000], ['Mon', 1, 23, 90000], ['Tue', 2, 24, 92000], ['Wed', 3, 25, 98000], ['Thu', 4, 26, 108000]];
  function fcDate(r) {
    var m = t('t1.month.11');
    return (r[1] === 5 ? t('t1.day.5') : r[1] === 6 ? t('t1.day.6') : r[1] === 0 ? t('t1.day.0') : r[1] === 1 ? t('t1.day.1') : r[1] === 2 ? t('t1.day.2') : r[1] === 3 ? t('t1.day.3') : t('t1.day.4')) + ' ' + r[2] + ' ' + m;
  }
  function forecastCard() {
    var h = note(t('m1.forecast.seasonal_naive')).replace('border-top:2px dashed var(--rule)', 'border-top:0') +
      note(pf(t('m1.forecast.window', { from: t('t1.day.0') + ' 1 ' + t('t1.month.11'), to: t('t1.day.3') + ' 18 ' + t('t1.month.11') }), { n: 18 }));
    FC.forEach(function (r) {
      var low = Math.round(r[3] * 0.85 / 1000) * 1000, high = Math.round(r[3] * 1.15 / 1000) * 1000; /* demo bounds, not an engine output */
      h += mrow(fcDate(r), r[3]) + '<div class="ln" style="min-height:56px;color:var(--muted)"><span class="k">' + t('m1.forecast.range') + '</span><span>' + M(low) + ' - ' + M(high) + '</span></div>';
    });
    h += mrow(t('m1.forecast.miss'), 18000) + note(pf(t('m1.forecast.hwGate', { need: 56, have: 18 }), {})) + note(t('m1.forecast.estimate'));
    return card('bars', t('m1.forecast.title'), h);
  }
  function forecastGated(have) {
    return card('bars', t('m1.forecast.title'), gateRow(t('m1.forecast.title'), have, 14) + note(t('m1.forecast.estimate')));
  }
  function lastYearCard() { /* too few days: this year's figure, and the sentence for a year with no closed day */
    return card('calendar', t('m1.lastYear.title'), mrow(pf(t('m1.lastYear.this', {}), { n: 5 }), 640000) + note(t('m1.lastYear.none')));
  }
  function lastYearFull() {
    return card('calendar', t('m1.lastYear.title'),
      mrow(pf(t('m1.lastYear.this', {}), { n: 18 }), THIS.net) + mrow(pf(t('m1.lastYear.last', {}), { n: 17 }), 1720000));
  }
  function festivalCard(none) {
    return card('star', t('m1.festival.title'),
      (none ? rd(t('m1.festival.none'), '') : mrow(pf(t('m1.festival.week', { name: t('festival.diwali') }), { n: 7 }), 790000) + mrow(pf(t('m1.festival.before', {}), { n: 6 }), 610000)) +
      note(t('m1.festival.source')));
  }
  function payCard(none) {
    return card('clock', t('m1.pay.title'),
      (none ? note(t('m1.pay.none')).replace('border-top:2px dashed var(--rule)', 'border-top:0') :
        rd(K.nm('ramesh'), t('m1.pay.value', { n: 6 })) + rd(K.nm('sunita'), t('m1.pay.value', { n: 21 })) + rd(K.nm('bijay'), t('m1.pay.value', { n: 9 })) + note(t('m1.pay.note'))));
  }
  function returnsCard(zero) {
    return card('swap', t('m1.returns.title'),
      mrow(pf(t('m1.returns.returns', { date: D.d18() }), { n: zero ? 0 : 2 }), zero ? 0 : 45000, { out: true }) + mrow(pf(t('m1.returns.adjustments', {}), { n: zero ? 0 : 1 }), zero ? 0 : 2000, zero ? {} : { sign: true, tone: 'dir' }) +
      mrow(pf(t('m1.returns.returns', { date: D.d12() }), { n: 0 }), 0) + mrow(pf(t('m1.returns.adjustments', {}), { n: 0 }), 0));
  }
  function itemsSlot() { /* PR-2 item cards arrive through a slot owned by the items area; drawn here only as a labelled hole */
    return '<div style="margin:12px;padding:12px;border:2px dashed var(--rule);border-radius:20px;color:var(--muted);line-height:1.4">' + K.N('Item cards appear here (drawn in the items area).') + '</div>';
  }

  /* ---------- C1 ---------- */
  function chipQ(label) { return '<button class="primary tonal" style="margin:0"><span>' + label + '</span></button>'; }
  function ask(q) { return '<div style="display:block;width:fit-content;max-width:85%;margin:12px 12px 4px auto;background:var(--raised);border-radius:16px;padding:10px 14px;font-weight:600;line-height:1.4">' + q + '</div>'; }
  function heardCard(heard, inner) {
    return '<section class="hero" style="margin-top:6px"><div style="color:var(--muted);line-height:1.4;padding-bottom:4px">' + t('c1.heard', { what: heard }) + '</div>' + inner + '</section>';
  }
  function coversLine() { return note(t('c1.covers')).replace('border-top:2px dashed var(--rule)', 'border-top:0'); }
  function inputBar(draft) {
    return K.sticky(K.field('', draft, { ph: t('c1.placeholder') }), K.primary(t('c1.ask'), draft ? '' : 'dis'));
  }
  function chatTop() { return sub(t('c1.title')); }

  /* ---------- S10 ---------- */
  function listBlock(keys) { return keys.map(function (k) { return '<div class="ln" style="min-height:56px;line-height:1.4;border-top:2px solid var(--rule)"><span class="k">' + k + '</span></div>'; }).join(''); }
  function freeGroup() {
    return card('check', t('s10.free.title'),
      '<div style="line-height:1.45;padding-bottom:6px">' + t('s10.free.promise') + '</div>' +
      listBlock([t('s10.free.close'), t('s10.free.entries'), t('s10.free.parties'), t('s10.free.history'), t('s10.free.data'), t('s10.free.rights')]));
  }
  function premiumGroup() {
    return card('star', t('s10.premium.title'),
      listBlock([t('s10.premium.items'), t('s10.premium.itemReports'), t('s10.premium.forecast'), t('s10.premium.comparisons'), t('s10.premium.chat'), t('s10.premium.dashboard')]));
  }
  function tile(name, perKey, renewKey, buyLabel, price, dis) {
    return '<div style="border:2px solid var(--rule);border-radius:20px;padding:10px 12px;margin-top:8px"><b>' + name + '</b><div style="font-size:1.5em;font-weight:700;padding:2px 0">' + M(price) + '</div><div style="color:var(--muted);line-height:1.4">' + perKey + '</div><div style="color:var(--muted);line-height:1.4;padding-bottom:8px">' + renewKey + '</div>' + K.primary(buyLabel, dis ? 'dis' : 'outline') + '</div>';
  }
  function priceCard(closed, busy) {
    return card('coin', t('s10.price.title'),
      '<div style="color:var(--muted);line-height:1.45">' + t('s10.cancelTerms') + '</div>' +
      (closed ? '<div style="line-height:1.45;padding-top:8px;display:flex;gap:8px;align-items:flex-start">' + K.ico('lock', 22) + '<span>' + t('s10.notOpen') + '</span></div>' : '') +
      tile(t('s10.price.monthly'), t('s10.price.perMonth'), t('s10.renew.monthly'), t('s10.buy.monthly'), 9900, closed || busy) +
      tile(t('s10.price.yearly'), t('s10.price.perYear'), t('s10.renew.yearly'), t('s10.buy.yearly'), 79900, closed || busy));
  }
  function statusCard(text, inner) {
    return '<section class="hero" style="margin-top:12px"><div style="font-weight:700;line-height:1.45;padding-bottom:6px">' + text + '</div>' + (inner || '') + '</section>';
  }
  function noticeBox(text, icon) { return '<div class="banner info" role="alert">' + K.ico(icon || 'info', 24) + '<span>' + text + '</span></div>'; }
  function previewBtn(dis) { return K.primary(t('s10.preview'), dis ? 'dis' : 'outline', 'star') + '<div style="color:var(--muted);line-height:1.45;padding:6px 4px 2px">' + t('s10.preview.note') + '</div>'; }
  function cancelBtn() { return K.primary(t('s10.cancel'), 'outline', 'logout') + '<div style="color:var(--muted);line-height:1.45;padding:6px 4px 2px">' + t('s10.cancel.note') + '</div>'; }

  var D3DEC = function () { return t('t1.day.4') + ' 3 ' + t('t1.month.12') + ' 2026'; };
  var D19DEC = function () { return t('t1.day.6') + ' 19 ' + t('t1.month.12') + ' 2026'; };

  SPEC.area = {
    title: 'Reports',
    intro: 'The Reports tab and what hangs off it: R1 with its gates, Behaviour Engine readings and the three scores (Business Health is said, not scored, BE-07), the Premium dashboard M1, Ask C1, entries for the accountant S12 and Your plan S10. Beta note: plan.ts has BETA.allFree = true, so today every beta user sees the Premium state of M1 and C1 and the Premium cards are open; the free-plan frames show what returns when the beta flag is switched off. Every figure is derived on read from the entries; no figure is predicted or suggested.',
    screens: [
      {
        id: 'reports-empty', route: 'R1', title: 'Reports: before the first close', flag: 'CHG',
        purpose: 'A new shop has no closed day, so there is nothing true to report. Say so, and say what opens it.',
        primary: 'Continue day close (goes to Today and its close list). Secondary: Ask a question.',
        taps: 'Ask a question = 1 tap. Reaching the close list = 2 taps (Today tab, close card).',
        rules: 'Emptiness is derived from the count of closed days, never from a flag. No headline figure and no zero chart above the sentence. No inference.',
        notes: 'As built, the empty state is the sentence r1.empty plus the Ask button; the Continue day close button is NEW here so the empty state has a next action, not a dead end (brief: never "nothing here yet" alone). Ask stays in the body header so a shop can ask how to close a day.',
        review: 'Adds a Continue day close button to the empty Reports state; R1.tsx today shows only the sentence and Ask.',
        body: function () {
          return tabTop() + K.scroll(askBtn(), K.empty('bars', t('r1.empty'), t('t1.continueClose'), 'check')) + K.tabs('reports');
        }
      },
      {
        id: 'reports-gate', route: 'R1', title: 'Reports: first week, too few closed days', flag: 'CHG',
        purpose: 'Three days are closed. Level 1 figures are true and shown; every trend and score is held back with its own gate sentence, never a zero or an empty chart.',
        primary: 'Continue day close (tonal). Each held-back reading shows how many closed days it needs and how many exist.',
        taps: 'Read the gates = 0 taps. Continue closing = 1 tap from here.',
        rules: 'Gate sentence r1.gate comes from the engine\'s own two numbers (need, have). Needs: profit trend 14, sales variation 14, closing-cash variation 21, working-capital 14, credit concentration 14, Cash Confidence 14, Operational Consistency 14 (BI_GATES, SCORE_GATES in the engine). Nothing says what to do with a figure.',
        notes: 'A small progress bar is drawn under each gate sentence (NEW, a drawing of the same two numbers, with the sentence beside it so it is not a picture alone). The info line above the cards says what moves the gates; r1.gate alone states the count but not the way forward. Demo: sales 3,40,000, expenses 52,000, owed 80,000 after three closes.',
        review: 'Two additions beyond R1.tsx: a progress bar under each gate sentence and one "what moves this" line; both need Saket\'s yes.',
        body: function () {
          var have = 3;
          return tabTop() + K.scroll(
            askBtn(),
            card('bars', t('r1.title'), rd(t('r1.daysClosed'), String(have)) + mrow(t('r1.totalSales'), 340000) + mrow(t('r1.totalExpenses'), 52000, { out: true }) + mrow(t('r1.creditOutstanding'), 80000) + note(t('r1.note'))),
            K.banner('info', 'info', K.N('Each day you close brings these readings closer.')),
            card('bars', t('r1.changing'), gateRow(t('r1.bi1'), have, 14) + gateRow(t('r1.bi2'), have, 14)),
            card('warn', t('r1.pressure'), gateRow(t('r1.bi3'), have, 21) + gateRow(t('r1.bi4'), have, 14) + gateRow(t('r1.bi6'), have, 14)),
            card('check', t('r1.cc.title'), gateRow(t('r1.cc.match'), have, 14) + note(t('r1.cc.notYet'))),
            card('tick', t('r1.oc.title'), gateRow(t('r1.oc.closing'), have, 14)),
            bhNote(),
            K.stack(K.primary(t('t1.continueClose'), 'tonal', 'check'))
          ) + K.tabs('reports');
        }
      },
      {
        id: 'reports-month', route: 'R1', title: 'Reports: a normal month (what happened)', flag: 'CHG',
        purpose: 'Level 1, what happened: days closed, sales, expenses, owed to you, who owes you and what you owe, then this month at a glance.',
        primary: 'Premium dashboard row (opens M1) and Ask a question. Reading only; nothing is typed here.',
        taps: 'Owes-lookup: Reports tab, scroll to Who owes you = 1 tap plus a scroll (target under 10 s). Dashboard = 1 tap.',
        rules: 'Derived on read (r1.note says so). D3: Taken home is shown beside profit; only "Profit left in the shop" is derived from both. Count of days is plain text, never a rupee component. Bucketed udhar: oldest first.',
        notes: 'Demo book: this month sales = cash 12,00,000 + UPI 4,50,000 + udhar 3,00,000; profit = sales - purchases - expenses. Out-flows (expenses, purchases, taken home) are drawn with a printed minus here; R1.tsx draws them unsigned, so this is a change for review. The five udhar names are 1,00,000 + 2,00,000 + 4,50,000 + 5,00,000 + 9,00,000 = 21,50,000 = the buckets = Owed to you.',
        review: 'Prints a minus on out-flow rows (expenses, purchases, taken home) in the report cards; the app draws them unsigned today.',
        body: function () {
          return tabTop() + K.scroll(
            askBtn(), figuresCard(ALL), dashRow(), custDues(), suppDues(), monthCard(t('rep.month.this'), THIS)
          ) + K.tabs('reports');
        }
      },
      {
        id: 'reports-more', route: 'R1', title: 'Reports: further down (last month, cash checks, UPI)', flag: 'EXISTS',
        purpose: 'The rest of the free basic reports, scrolled to: last month, the cash-check history and the UPI the shopkeeper confirmed.',
        primary: 'None; reading.',
        taps: 'n/a',
        rules: 'Decision 3: the UPI figure is the sum of receipts he confirmed, not a bank balance; the count of confirmed receipts sits beside it. Last month is absent when the book starts this month (HT-46). Differences carry + or - and words (Matched, Less than expected, More than expected), not colour alone.',
        notes: 'Demo: matched 22 + less 5 + more 3 = 30 closed days. Last seven checks are listed, newest first; a day with a difference shows the sign. Reasons for a gap (T12) would append after the date; none drawn. This frame is the lower part of the same scroll as the one above.',
        body: function () {
          return tabTop() + K.scroll(monthCard(t('rep.month.last'), LAST), cashCard(), upiCard()) + K.tabs('reports');
        }
      },
      {
        id: 'reports-behaviour', route: 'R1', title: 'Reports: what is changing, where pressure is building', flag: 'EXISTS',
        purpose: 'Behaviour Engine levels 2 and 3 with enough closed days: profit trend, sales variation, cash variation, short days, working capital, credit concentration.',
        primary: 'None; reading. Each line states a fact about the book and none says what to do.',
        taps: 'n/a',
        rules: 'These are derived observations, not instructions: Rising/Falling/Steady and More/Less concentrated are things to look at. A direction always carries a word and an arrow icon. BI5 has no card by D5.',
        notes: 'Demo values (30 closed days): profit trend Rising, average daily profit 380.00 earlier half against 460.00 later; sales variation 18.4%; closing cash variation 22.6% with 5 of 28 days short; owed to you and by you against cash 31.2%; top 3 customers hold 78.4%, more concentrated than recent closes. Percentages use the engine\'s one-decimal form. The wording is "worth a look" by being plain facts; no card says "you should".',
        body: function () {
          return tabTop() + K.scroll(changingCard(), pressureCard(false)) + K.tabs('reports');
        }
      },
      {
        id: 'reports-scores', route: 'R1', title: 'Reports: the three scores (Cash Confidence, Operational Consistency, Business Health)', flag: 'EXISTS',
        purpose: 'Each score is shown as its separate published ratios, never blended. Business Health has no number (BE-07) and says so in a sentence.',
        primary: 'None; reading.',
        taps: 'n/a',
        rules: 'Business Health is said, not shown: r1.bh. Cash Confidence shows cash matched exactly (n of days) and the typical gap as a share of a day\'s sales; r1.cc.notYet says UPI matching and reasons are not counted yet. Operational Consistency shows days closed of days opened, sections filled or marked empty, and entries that are corrections. SCORES.md must validate the mathematics before any production use (decision 4).',
        notes: 'Demo: matched exactly 22 of 30 days, typical gap 1.2%; closed 30 of 31 days, recording 94.5%, corrections 3.1%. No score is a coloured badge, a grade or a traffic light.',
        body: function () {
          return tabTop() + K.scroll(ccCard(), ocCard(), bhNote()) + K.tabs('reports');
        }
      },
      {
        id: 'reports-nobaseline', route: 'R1', title: 'Reports: enough days to read, nothing earlier to compare', flag: 'EXISTS',
        purpose: 'The no_baseline states: a reading exists but has no earlier period to be set against. The screen says "Nothing earlier to compare", never "No change".',
        primary: 'None; reading.',
        taps: 'n/a',
        rules: 'The engine keeps no_baseline apart from flat: "we do not know yet" is not "stable". The direction row carries a dash icon and words. Credit concentration is the one Behaviour card with this state in R1.tsx (r1.bi6.no_baseline). Today\'s sales against the median (BusinessMovement) also has no_baseline in the engine but R1.tsx has no card for it.',
        notes: 'Demo: 21 closed days, so closing-cash variation (needs 21) has just opened and Cash Confidence reads 15 of 21; Operational Consistency is still gated (9 of 14 here, as its own closed-day count) and shows the r1.gate sentence.',
        body: function () {
          return tabTop() + K.scroll(
            card('warn', t('r1.pressure'),
              rd(t('r1.bi3'), pct(2260)) + rd(t('r1.bi3.short'), t('r1.ofDays', { n: 4, w: 21 })) +
              rd(t('r1.bi4'), pct(2940)) + rd(t('r1.bi6'), pct(8120)) + rd(t('r1.bi6.compared'), t('r1.bi6.no_baseline'), 'dash')),
            card('check', t('r1.cc.title'), rd(t('r1.cc.match'), t('r1.ofDays', { n: 15, w: 21 })) + rd(t('r1.cc.gap'), pct(150)) + note(t('r1.cc.notYet'))),
            card('tick', t('r1.oc.title'), gateRow(t('r1.oc.closing'), 9, 14)),
            bhNote()
          ) + K.tabs('reports');
        }
      },
      {
        id: 'reports-loading', route: 'R1', title: 'Reports: loading', flag: 'EXISTS',
        purpose: 'The engine is reading the phone\'s own database. Shapes only, no spinner.',
        primary: 'None; waits. Shown briefly.',
        taps: 'n/a',
        rules: 'Skeleton, accessible name common.loading. Tabs stay so he can leave.',
        notes: 'Shapes match the figures card and the first reading card so nothing jumps when they arrive.',
        body: function () {
          return tabTop() + '<div class="scroll" aria-busy="true" aria-label="' + t('common.loading') + '">' + K.skel(5) + '</div>' + K.tabs('reports');
        }
      },
      {
        id: 'reports-error', route: 'R1', title: 'Reports: could not open', flag: 'EXISTS',
        purpose: 'The reading failed. Nothing is lost; one next step.',
        primary: 'Try again (common.retry).',
        taps: '1 tap.',
        rules: 'common.error says nothing entered is lost. Icon plus words, one button, equal weight everywhere.',
        notes: 'Shown by Shell for status error. Tabs remain.',
        body: function () {
          return tabTop() + K.scroll(K.banner('err', 'warn', t('common.error')), K.empty('refresh', t('common.error'), t('common.retry'), 'refresh')) + K.tabs('reports');
        }
      },
      {
        id: 'reports-offline', route: 'R1', title: 'Reports: offline, entries waiting', flag: 'EXISTS',
        purpose: 'Reports are computed on the phone, so they work with no network. The chip says the entries are safe and waiting.',
        primary: 'None; the figures are complete for what this phone holds.',
        taps: 'n/a',
        rules: 'Chip amber with a clock, never red. Figures include entries still waiting to send (derived from the phone\'s own entries).',
        notes: 'There is no offline-specific Reports state in R1.tsx; this frame is the normal screen with the sync chip and the line sync.waitingLong from the header pattern.',
        body: function () {
          return tabTop(K.chip('wait', 3)) + K.scroll(K.banner('info', 'cloudoff', t('sync.waitingLong', { n: 3 })), askBtn(), figuresCard(ALL), dashRow(), custDues()) + K.tabs('reports');
        }
      },

      /* ----- M1 ----- */
      {
        id: 'm1-premium', route: 'M1', title: 'Dashboard: Premium state (what a beta user sees)', flag: 'EXISTS',
        purpose: 'One screen for the Premium readings: the 7-day sales estimate, this month against last year, festival weeks.',
        primary: 'None; reading. Back returns to Reports.',
        taps: 'From Reports: Premium dashboard row = 1 tap.',
        rules: 'Every estimate says "estimate", how it was made and how often it was wrong. Nothing here is a number the user enters; nothing is stored. Comparisons are things to look at.',
        notes: 'BETA: plan.ts has BETA.allFree = true, so allows() is true for every plan and M1 draws these cards for a beta user, free or not. Method shown is "same as the last same weekday", because the weekday-and-trend method needs 56 closed days (18 here) and says so. Likely ranges are demo bounds, not engine output.',
        body: function () {
          return sub(t('m1.title')) + K.scroll(forecastCard(), lastYearFull(), festivalCard(false));
        }
      },
      {
        id: 'm1-premium2', route: 'M1', title: 'Dashboard: Premium state, further down (pay time, returns, items)', flag: 'EXISTS',
        purpose: 'How long customers take to pay, returns and adjustments week by week, and the slot for the item cards.',
        primary: 'None; reading.',
        taps: 'n/a',
        rules: 'The pay line is "something to look at, not a judgement of the customer" (m1.pay.note). No stock, no reorder, ever.',
        notes: 'Item cards come from the items area (PR-2) through a slot, drawn here only as a dashed hole. In the free plan after beta they stay readable and read-only.',
        body: function () {
          return sub(t('m1.title')) + K.scroll(payCard(false), returnsCard(false), itemsSlot());
        }
      },
      {
        id: 'm1-gated', route: 'M1', title: 'Dashboard: Premium, too few closed days', flag: 'EXISTS',
        purpose: 'Premium is open but the book is young: the estimate says how many closed days it needs, the rest show their honest empty sentences.',
        primary: 'None; reading.',
        taps: 'n/a',
        rules: 'Gate sentence from the engine, a bar under it (same drawing as R1\'s gate), and the word "estimate" still present. Nothing is ever a zero chart.',
        notes: 'Demo: 5 closed days against the forecast gate of 14. When there is also no closed day and no item recorded, Shell replaces the cards with m1.empty (next frame).',
        body: function () {
          return sub(t('m1.title')) + K.scroll(forecastGated(5), lastYearCard(), festivalCard(true), payCard(true), returnsCard(true));
        }
      },
      {
        id: 'm1-empty', route: 'M1', title: 'Dashboard: nothing closed yet', flag: 'CHG',
        purpose: 'No closed day and no item recorded: the dashboard has nothing to draw.',
        primary: 'Continue day close (NEW here; the app shows only the sentence).',
        taps: '1 tap to Today\'s close card.',
        rules: 'A next action beside the empty sentence, never "nothing here yet" alone.',
        notes: 'M1 is reached from Reports, which is itself empty in this state, so a shop would rarely land here. Kept for completeness.',
        review: 'Adds a Continue day close button to the M1 empty state.',
        body: function () {
          return sub(t('m1.title')) + K.scroll(K.empty('bars', t('m1.empty'), t('t1.continueClose'), 'check'));
        }
      },
      {
        id: 'm1-free', route: 'M1', title: 'Dashboard: free plan (returns after beta)', flag: 'EXISTS',
        purpose: 'On the free plan the screen says plainly what Premium adds and draws no Premium figure. Not seen in beta, because BETA.allFree is on.',
        primary: 'See Premium (opens S10, Your plan). Shown only when the caller passes onUpgrade.',
        taps: '1 tap to S10.',
        rules: 'No dark patterns: one plain paragraph, one button, no countdown, no price pressure here. History recorded under Premium stays readable and is marked read-only; nothing is hidden or deleted.',
        notes: 'This is what the Free/Premium split looks like once the beta flag in plan.ts is switched off. Today the beta user never sees this card.',
        body: function () {
          return sub(t('m1.title')) + K.scroll(
            card('lock', t('m1.locked.title'), '<div style="line-height:1.5;padding:4px 0 8px">' + t('m1.locked.body') + '</div>' + K.primary(t('m1.upgrade'), 'outline', 'star')),
            itemsSlot()
          );
        }
      },

      /* ----- C1 ----- */
      {
        id: 'c1-empty', route: 'C1', title: 'Ask: empty, with questions to tap', flag: 'CHG',
        purpose: 'Before any question: what can be asked. Chips are questions, never amounts.',
        primary: 'Tap a question chip, or type a question and tap Ask.',
        taps: 'Chip answer = 1 tap. Typed question = type, then Ask.',
        rules: 'A QUESTION, NEVER AN ENTRY: nothing typed here reaches the ledger and no answer fills a figure into an entry. No keypad, no tabs. Answers come only from what was entered (c1.empty says so). Ask is disabled until there is text.',
        notes: 'Chips are the free set (Sales, Expected cash, Udhar to collect, How to close the day, What udhar means) plus, in beta, three more (Sales this week, Best day this month, Old udhar). The app lists them as one long set; here only the first five fit above the field, the rest scroll. c1.empty is also the empty sentence; it sits under the chips. The text field has autocorrect, spell-check and autocomplete off.',
        body: function () {
          return chatTop() + K.scroll(
            card('chat', t('c1.suggested'),
              '<div style="display:flex;flex-direction:column;gap:8px;padding-top:6px">' +
              chipQ(t('c1.i.sales')) + chipQ(t('c1.i.expected')) + chipQ(t('c1.i.owed')) + chipQ(t('c1.i.howClose')) + chipQ(t('c1.i.termUdhar')) +
              chipQ(t('c1.i.sales') + ' · ' + t('c1.p.thisWeek')) + chipQ(t('c1.i.bestDay') + ' · ' + t('c1.p.thisMonth')) + chipQ(t('c1.i.olderUdhar') + ' · ' + t('c1.days', { n: 30 })) + '</div>'),
            '<div style="padding:12px 16px;color:var(--muted);line-height:1.5">' + t('c1.empty') + '</div>'
          ) + inputBar('');
        }
      },
      {
        id: 'c1-answered', route: 'C1', title: 'Ask: answered from recorded data', flag: 'EXISTS',
        purpose: 'A question was asked and answered from this phone\'s entries, with what it was understood as shown first.',
        primary: 'Ask next (a further chip) or type another question.',
        taps: 'Owes-lookup by Ask: chip Udhar to collect = 1 tap (target under 10 s).',
        rules: 'No generated figure: every rupee figure is the engine\'s, worked out on each render, never stored. "This covers only what was entered on this phone." Expected cash counts cash only; UPI never goes into the box (D2). No stock claims.',
        notes: 'Demo: Expected cash = opening 12,00,000 + in 9,35,000 - out 2,90,000 = 18,45,000, the same as the Today hero. The asked line shows the chip label when a chip was tapped; a typed question shows the typed words. The real "Ask next" chips for the free figures are none; Premium answers add chips (not drawn).',
        body: function () {
          return chatTop() + K.scroll(
            ask(t('c1.i.expected')),
            heardCard(t('c1.i.expected'), mrow(t('c1.f.expected'), BOXNOW) + coversLine()),
            ask(t('c1.i.owed')),
            heardCard(t('c1.i.owed'), mrow(t('c1.f.owed'), ALL.owed) + note(t('c1.note.thisPhone')).replace('border-top:2px dashed var(--rule)', 'border-top:0') + coversLine()),
            ask(t('c1.i.sales') + ' · ' + t('c1.p.thisWeek')),
            heardCard(t('c1.i.sales') + ' · ' + t('c1.p.thisWeek'),
              '<div style="line-height:1.45;padding-bottom:4px">' + t('c1.range', { from: D.d16(), to: D.d18() }) + '</div>' + mrow(t('c1.f.sales', { period: t('c1.p.thisWeek') }), isum([98000, 121000, 105000])) + coversLine())
          ) + inputBar('');
        }
      },
      {
        id: 'c1-howto', route: 'C1', title: 'Ask: a how-to answer', flag: 'EXISTS',
        purpose: 'A question about the app (how to close the day) is answered from fixed copy, with no figure.',
        primary: 'Type another question or tap Back.',
        taps: '1 tap on the chip.',
        rules: 'Fixed copy, nothing generated; no "covers only" line because no figure is given. The answer says what to tap on Today; it never types or fills anything for him.',
        notes: 'The card shows what it was understood as, so a misunderstanding is visible before the answer is believed.',
        body: function () {
          return chatTop() + K.scroll(
            ask(t('c1.i.howClose')),
            heardCard(t('c1.i.howClose'), '<div style="line-height:1.5;padding:4px 0">' + t('c1.a.howClose') + '</div>')
          ) + inputBar('');
        }
      },
      {
        id: 'c1-nomatch', route: 'C1', title: 'Ask: no match, asks back instead of guessing', flag: 'EXISTS',
        purpose: 'The typed words did not match a question with enough confidence. Offer three real questions as chips rather than guess.',
        primary: 'Tap the question that was meant.',
        taps: '1 tap.',
        rules: 'Below the matcher\'s confidence floor the screen asks back (c1.didYouMean); it never returns a figure for a guess. The chips are questions, not amounts.',
        notes: 'The typed words are the user\'s own (shown as typed; demo text only). The three options are the matcher\'s top three; the demo shows Sales, Expenses and Udhar to collect.',
        body: function () {
          return chatTop() + K.scroll(
            ask(K.pick('bill', 'bill', 'bill')),
            card('info', t('c1.didYouMean'), '<div style="display:flex;flex-direction:column;gap:8px;padding-top:6px">' + chipQ(t('c1.i.sales')) + chipQ(t('c1.i.expenses')) + chipQ(t('c1.i.owed')) + '</div>')
          ) + inputBar(K.pick('bill', 'bill', 'bill'));
        }
      },
      {
        id: 'c1-premium', route: 'C1', title: 'Ask: a Premium question on the free plan (returns after beta)', flag: 'EXISTS',
        purpose: 'A figure that needs Premium gets one plain line and the nearest free figure, never a bare refusal. Not seen in beta because BETA.allFree is on.',
        primary: 'None; the free figure is shown. Optional: Your plan from Settings.',
        taps: 'n/a',
        rules: 'c1.premium states it; no price, no upsell button inside the chat, no countdown. The figure shown is today\'s own sales, derived.',
        notes: 'After beta, the free set is the how-tos and meanings plus three figures for today only: sales, expected cash, udhar to collect.',
        body: function () {
          return chatTop() + K.scroll(
            ask(t('c1.i.sales') + ' · ' + t('c1.p.thisWeek')),
            heardCard(t('c1.i.sales') + ' · ' + t('c1.p.thisWeek'), '<div style="line-height:1.45;padding-bottom:4px">' + t('c1.premium') + '</div>' + mrow(t('c1.f.salesToday'), 108000) + coversLine())
          ) + inputBar('');
        }
      },

      /* ----- S12 ----- */
      {
        id: 's12-months', route: 'S12', title: 'Entries for your accountant: pick a month', flag: 'CHG',
        purpose: 'Make a file of one month\'s entries and every party\'s balance, and hand it to any app via the share sheet. Free in every plan.',
        primary: 'Tap a month (opens the share sheet).',
        taps: '2 taps from Settings (Entries for your accountant, month) plus choosing the app.',
        rules: 'The file is made on the phone and nothing is sent to our server. The line "not a tax document" (s5.notTax) is on this screen. Only months with at least one entry are listed. Named "entries", never a return or invoice.',
        notes: 'As built, s12.body says "spreadsheet file (CSV)"; the frame replaces that sentence with a plain-words version so no one meets the word CSV (proposal; native review needed). Months are listed newest first with a share icon; no entry is edited or deleted.',
        review: 'Replaces the word "CSV" in the explanation with plain words; od/hi for the new sentence are for the native reviewer.',
        body: function () {
          return sub(t('s12.title')) + K.scroll(
            '<div style="padding:12px 16px;line-height:1.5">' + K.N('Choose a month. The phone makes a file of that month\'s entries and every party\'s balance, one you can open in a spreadsheet, and opens the share sheet. Nothing is sent to our server.') + '</div>',
            '<div style="padding:0 16px 8px;color:var(--muted);line-height:1.45">' + t('s5.notTax') + '</div>',
            K.sec(t('s12.months')),
            '<div style="margin:6px 12px">' + K.lrow('share', t('t1.month.11') + ' 2026') + K.lrow('share', t('t1.month.10') + ' 2026') + '</div>'
          );
        }
      },
      {
        id: 's12-share', route: 'S12', title: 'Entries for your accountant: the share sheet', flag: 'EXISTS',
        purpose: 'After a month is tapped the phone hands the file to the system share sheet, titled "Share entries".',
        primary: 'Choose an app, or tap outside to cancel.',
        taps: '1 tap on the app.',
        rules: 'Sharing is his decision; nothing goes to our server. Cancelling leaves nothing changed.',
        notes: 'The share sheet is drawn by Android, not by the app: only its title (s12.chooser) is ours; the app names here are examples, not a list we control.',
        body: function () {
          return sub(t('s12.title')) + K.scroll(K.sec(t('s12.months')), '<div style="margin:6px 12px">' + K.lrow('share', t('t1.month.11') + ' 2026') + K.lrow('share', t('t1.month.10') + ' 2026') + '</div>') +
            K.sheet(t('s12.chooser'), K.lrow('wa', 'WhatsApp', '', { noChev: true }) + K.lrow('chat', 'Gmail', '', { noChev: true }) + K.lrow('download', 'Drive', '', { noChev: true }));
        }
      },
      {
        id: 's12-empty', route: 'S12', title: 'Entries for your accountant: no entries yet', flag: 'CHG',
        purpose: 'Nothing recorded, nothing to share.',
        primary: 'Go to Today to record a sale (NEW here; the app shows only the sentence).',
        taps: '2 taps back to Today.',
        rules: 'A next action beside the empty sentence.',
        notes: 'Back is visible in the header. The month list is absent.',
        review: 'Adds a button to the empty state; the app shows s12.empty only.',
        body: function () {
          return sub(t('s12.title')) + K.scroll(K.empty('receipt', t('s12.empty'), t('nav.today'), 'box'));
        }
      },
      {
        id: 's12-loading', route: 'S12', title: 'Entries for your accountant: loading', flag: 'EXISTS',
        purpose: 'The month list is being read from the phone.',
        primary: 'None.',
        taps: 'n/a',
        rules: 'Skeleton shapes, accessible name common.loading.',
        notes: 'Error for this screen is the same Shell error as Reports (common.error, Try again).',
        body: function () {
          return sub(t('s12.title')) + '<div class="scroll" aria-busy="true" aria-label="' + t('common.loading') + '">' + K.skel(3) + '</div>';
        }
      },

      /* ----- S10 ----- */
      {
        id: 's10-free', route: 'S10', title: 'Your plan: Free, preview offered, buying not open', flag: 'EXISTS',
        purpose: 'What plan he is on, what stays free, what Premium adds and costs, and the way out, on one screen.',
        primary: 'Try Premium free for 14 days (outlined; the two Buy buttons are disabled with the reason in words).',
        taps: 'Start preview = 1 tap.',
        rules: 'No dark patterns: the final GST-included price is printed beside its button with the period and "renews until you cancel" in the same tile; monthly and yearly are identical, neither pre-selected, no "best value" badge. Disabled buy buttons have the reason in words above them (s10.notOpen), not a silent grey. Nothing is time-pressured.',
        notes: 'Prices are R5\'s 99 a month and 799 a year (PREMIUM_PRICES) until Play\'s own price arrives. BETA: while BETA.allFree is on, every beta user sees this screen with buying closed, and Premium features open without a plan; there is no string on this screen telling them the app is free during testing (see review).',
        review: 'Beta users see Premium cards open while S10 says "You are on Free" and buying is closed; consider one plain line saying everything is free during beta.',
        body: function () {
          return sub(t('s10.title')) + K.scroll(statusCard(t('s10.status.free'), previewBtn(false)), priceCard(true, false), freeGroup(), premiumGroup());
        }
      },
      {
        id: 's10-preview', route: 'S10', title: 'Your plan: preview running', flag: 'EXISTS',
        purpose: 'A Premium preview is on; say plainly when it ends.',
        primary: 'None needed; buying remains a free choice below.',
        taps: 'n/a',
        rules: 'The status is one fact with a date, no countdown, no "only N days left", no guilt line. The preview simply ends; nothing is charged.',
        notes: 'Notice at top is s10.notice.previewStarted, shown once right after starting. Buy tiles stay because no purchase exists to cancel.',
        body: function () {
          return sub(t('s10.title')) + K.scroll(
            noticeBox(t('s10.notice.previewStarted'), 'check'),
            statusCard(t('s10.status.preview', { date: D3DEC() })), priceCard(false, false), freeGroup(), premiumGroup());
        }
      },
      {
        id: 's10-premium', route: 'S10', title: 'Your plan: Premium bought, with Cancel', flag: 'EXISTS',
        purpose: 'A purchase is running. The way out is as easy to find as the way in.',
        primary: 'Cancel Premium (opens Google Play\'s subscription page). Never disabled, never greyed.',
        taps: 'Cancel = 1 tap here (2 from Settings: the row, then the button).',
        rules: 'Cancel sits right under the status fact, same weight as any button, with a note on where it goes. Everything recorded stays readable if Premium ends.',
        notes: 'Buy tiles are hidden while a subscription exists on Play. Status says renews on a date (s10.status.renews), or ends on a date when it will not renew.',
        body: function () {
          return sub(t('s10.title')) + K.scroll(statusCard(t('s10.status.renews', { date: D19DEC() }), cancelBtn()), freeGroup(), premiumGroup());
        }
      },
      {
        id: 's10-busy', route: 'S10', title: 'Your plan: payment still processing', flag: 'EXISTS',
        purpose: 'Buying was started; Google Play is still processing the payment. Buttons wait; nothing is promised.',
        primary: 'None; wait. Buttons are disabled while busy.',
        taps: 'n/a',
        rules: 'Says Premium starts when Play is done, not before. No fake success.',
        notes: 'Notice is s10.notice.pending. The same screen carries s10.notice.verifyLater, notOpen, failed and purchased as one-line notices in the same box.',
        body: function () {
          return sub(t('s10.title')) + K.scroll(noticeBox(t('s10.notice.pending'), 'clock'), statusCard(t('s10.status.free'), previewBtn(true)), priceCard(false, true), freeGroup(), premiumGroup());
        }
      },
      {
        id: 's10-offline', route: 'S10', title: 'Your plan: offline notice', flag: 'EXISTS',
        purpose: 'A plan action needs the network. Say nothing changed and what to do.',
        primary: 'Try again when online (tap the same button).',
        taps: '1 tap to retry.',
        rules: 'Calm sentence, nothing changed, nothing lost; the sync chip is amber with a clock, never red. A cached premium answer ends at its own date, so a lapse is free, not hidden (history stays readable).',
        notes: 'Notice is s10.notice.offline.',
        body: function () {
          return sub(t('s10.title'), K.chip('wait', 3)) + K.scroll(noticeBox(t('s10.notice.offline'), 'cloudoff'), statusCard(t('s10.status.free'), previewBtn(false)), priceCard(true, false), freeGroup(), premiumGroup());
        }
      },
      {
        id: 's10-onhold', route: 'S10', title: 'Your plan: payment on hold at Google Play', flag: 'EXISTS',
        purpose: 'Play could not take the payment; Premium is paused. The fix and the exit are the same page.',
        primary: 'Cancel Premium (opens Play, where the payment can be fixed or the subscription cancelled).',
        taps: '1 tap.',
        rules: 'Plain statement of fact (s10.status.onHold); no alarm styling; nothing is deleted.',
        notes: 'Premium is off while on hold, so S10 shows free state with Cancel (a subscription still exists on Play).',
        body: function () {
          return sub(t('s10.title')) + K.scroll(statusCard(t('s10.status.onHold'), cancelBtn()), freeGroup(), premiumGroup());
        }
      }
    ]
  };
})();
