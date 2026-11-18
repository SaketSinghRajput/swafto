/* Mitra screen kit. Copy comes from window.STRINGS (extracted from apps/mobile/src/i18n/strings.ts by build.mjs, verbatim). Keys that do not exist yet are written K.N('English text') and are listed as NEW. Money is integer paise; the browser formatting mirrors formatPaise (Indian grouping, 2 decimals, sign always printed). */
(function () {
  'use strict';
  var K = (window.K = {});
  var SPEC = (window.SPEC = window.SPEC || {});
  var LANGS = { en: 'en', od: 'or', hi: 'hi' };
  var S = { lang: 'od', theme: 'comfort', size: 1 };
  var USED = {}; var NEWC = {}; var curFrame = '';
  K.state = S;

  /* ---- copy ---- */
  K.t = function (key, vars) {
    var p = window.STRINGS[key];
    if (!p) { return '<span class="newc" title="MISSING KEY ' + key + '">' + key + '</span>'; }
    (USED[curFrame] = USED[curFrame] || {})[key] = 1;
    var s = p[LANGS[S.lang]];
    if (vars) s = s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] !== undefined ? vars[k] : '{' + k + '}'; });
    return s;
  };
  K.N = function (en, hint) {
    (NEWC[curFrame] = NEWC[curFrame] || {})[en] = hint || '';
    return '<span class="newc" title="NEW string: no od/hi yet (H13)">' + en + '</span>';
  };
  K.plain = function (key, vars) { return K.t(key, vars); };
  K.pick = function (en, od, hi) { return S.lang === 'en' ? en : (S.lang === 'od' ? od : hi); }; /* proper names only */

  /* ---- money ---- */
  K.rupee = function (p) {
    var a = Math.abs(p), r = Math.floor(a / 100), ps = a % 100, s = String(r);
    if (s.length > 3) { var l3 = s.slice(-3), rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ','); s = rest + ',' + l3; }
    return '₹' + s + '.' + (ps < 10 ? '0' : '') + ps;
  };
  /* o.sign: print + on positives; o.out: an out-line (always -); o.tone:'dir' colours by direction (sign is always printed too) */
  K.M = function (p, o) {
    o = o || {}; var neg = o.out || p < 0, sg = neg ? '-' : (o.sign ? '+' : '');
    var tone = o.tone === 'dir' ? (neg ? ' neg' : ' pos') : '';
    return '<span class="m' + tone + (o.cls ? ' ' + o.cls : '') + '">' + (sg ? '<b class="sg">' + sg + '</b>' : '') + K.rupee(p) + '</span>';
  };

  /* ---- icons (stroke, 24 grid) ---- */
  var ICO = {
    coin: '<circle cx="12" cy="12" r="9"/><path d="M8.5 8h7M8.5 11.5h7M9 8c3.6 0 5.2 1.3 5.2 3.2S12.6 14.4 9 14.4L15 19"/>',
    book: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    tray: '<path d="M12 3v9m0 0l-3.5-3.5M12 12l3.5-3.5"/><path d="M4 14v5h16v-5"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    dots: '<circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/>',
    box: '<rect x="3" y="9" width="18" height="11" rx="2"/><path d="M3 13h18M10 13v3h4v-3M8 9V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    bars: '<path d="M5 20V11M12 20V4M19 20v-6"/>', tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', dash: '<path d="M6 12h12"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    chev: '<path d="M9 6l6 6-6 6"/>', back: '<path d="M15 5l-7 7 7 7"/>', bksp: '<path d="M21 5H9l-6 7 6 7h12z"/><path d="M12 9.5l5 5M17 9.5l-5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', note: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>', up: '<path d="M12 5v14M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 5a3.5 3.5 0 0 1 0 7M19 20c0-2.500-1.500-4-3-4.700"/>',
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    cloudoff: '<path d="M7 18h10a4 4 0 0 0 .8-7.900A6 6 0 0 0 6.500 9.500 4 4 0 0 0 7 18z"/><path d="M3 3l18 18"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>', download: '<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/>',
    share: '<circle cx="6" cy="12" r="2.500"/><circle cx="18" cy="6" r="2.500"/><circle cx="18" cy="18" r="2.500"/><path d="M8.300 11l7.400-4M8.300 13l7.400 4"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    textsize: '<path d="M3 19L8 6l5 13M5 15h6M15 19l3.500-8 3.500 8M16.200 16.500h4.600"/>', shield: '<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/><path d="M8.500 12l2.500 2.500 4.500-5"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>', edit: '<path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3"/>', undo: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7"/>', logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>', search: '<circle cx="11" cy="11" r="6"/><path d="M16 16l5 5"/>',
    sort: '<path d="M7 5v14M4 16l3 3 3-3M17 19V5M14 8l3-3 3 3"/>', swap: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>', pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    wa: '<path d="M4 20l1.500-4.500A8 8 0 1 1 8.500 18.500z"/><path d="M9 9c0 3 3 6 6 6l1.500-1.500-2-1-1 1c-1-.5-2-1.500-2.500-2.500l1-1-1-2z"/>',
    star: '<path d="M12 3l2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9z"/>', pin: '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.500"/>',
    bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"/>', calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'
  };
  K.ico = function (n, size, cls) {
    size = size || 24;
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICO[n] || ICO.dots) + '</svg>';
  };

  /* ---- components: each returns an HTML string ---- */
  K.chip = function (kind, n) {
    if (kind === 'wait') { var s = K.t('sync.waiting', { n: n || 3 }); return '<button class="chip wait" aria-label="' + s + '">' + K.ico('clock', 22) + '<span>' + s + '</span></button>'; }
    if (kind === 'off') { return '<button class="chip wait">' + K.ico('cloudoff', 22) + '<span>' + K.N('Offline') + '</span></button>'; }
    return '<button class="chip ok">' + K.ico('check', 22) + '<span>' + K.t('sync.saved') + '</span></button>';
  };
  K.top = function (o) { /* {title, back, right, shop, date} */
    var l = o.back ? '<button class="back" aria-label="' + K.t('common.back') + '">' + K.ico('back', 28) + '</button>' : '';
    var mid = o.shop ? '<div class="shop"><div class="sn">' + o.shop + '</div><div class="dt">' + (o.date || '') + '</div></div>' : '<h1>' + (o.title || '') + '</h1>';
    return '<header class="top">' + l + mid + '<div class="grow"></div>' + (o.right || '') + '</header>';
  };
  K.tabs = function (active) {
    var d = [['today', 'box', K.t('nav.today')], ['parties', 'book', K.t('nav.parties')], ['reports', 'bars', K.t('nav.reports')]];
    return '<nav class="tabs">' + d.map(function (x) { return '<button class="tab' + (x[0] === active ? ' on' : '') + '"' + (x[0] === active ? ' aria-current="page"' : '') + '>' + K.ico(x[1], 26) + '<span>' + x[2] + '</span></button>'; }).join('') + '</nav>';
  };
  K.tile = function (kind, icon, label, off) { return '<button class="tile t-' + kind + (off ? ' off' : '') + '"' + (off ? ' aria-disabled="true"' : '') + '><span class="ti">' + K.ico(icon, 30) + '</span><span>' + label + '</span></button>'; };
  K.tiles = function (off) {
    return '<section class="tiles">' + K.tile('sale', 'coin', K.t('act.sale'), off) + K.tile('udhar', 'book', K.t('act.credit'), off) + K.tile('collect', 'tray', K.t('act.collect'), off) + K.tile('expense', 'receipt', K.t('act.expense'), off) + K.tile('more', 'dots', K.t('t1.more'), off) + '</section>';
  };
  K.hero = function (o) { /* {box, opening, cashIn, cashOut} paise */
    return '<section class="hero"><div class="lbl"><span class="hi">' + K.ico('box', 28) + '</span><span>' + K.t('box.title') + '</span></div><div class="fig">' + K.M(o.box, { cls: 'hero-fig' }) + '</div>' +
      '<div class="ln"><span class="k">' + K.t('box.opening') + '</span>' + K.M(o.opening) + '</div>' +
      '<div class="ln in"><span class="k">' + K.ico('down', 20, 'dirico') + K.t('box.in') + '</span>' + K.M(o.cashIn, { sign: true, tone: 'dir' }) + '</div>' +
      '<div class="ln out"><span class="k">' + K.ico('up', 20, 'dirico') + K.t('box.out') + '</span>' + K.M(o.cashOut, { out: true, tone: 'dir' }) + '</div></section>';
  };
  K.facts = function (sales, collect) {
    return '<section class="facts"><div class="ln"><span class="k">' + K.t('box.sales') + '</span>' + K.M(sales) + '</div><button class="ln link"><span class="k">' + K.t('t1.toCollect') + '</span>' + K.M(collect) + '</button></section>';
  };
  K.bar = function (done, total) { var h = '<div class="bar" role="img" aria-label="' + done + '/' + total + '">'; for (var i = 0; i < total; i++) h += '<i class="' + (i < done ? 'on' : '') + '"></i>'; return h + '</div>'; };
  K.closecard = function (done, total, quiet, label) {
    return '<button class="closecard' + (quiet ? ' quiet2' : '') + '"><span class="cc-main"><span class="cc-t">' + (label || K.t('t1.continueClose')) + '</span><span>' + K.t('t1.progress', { done: done, total: total }) + '</span></span>' + K.bar(done, total) + '<span class="cc-c">' + K.ico('chev', 26) + '</span></button>';
  };
  K.seg = function (items, on, icons) { /* items: label html[]; on: index */
    return '<div class="seg" role="radiogroup">' + items.map(function (l, i) { return '<button class="sg-b' + (i === on ? ' on' : '') + '" role="radio" aria-checked="' + (i === on) + '">' + (i === on ? K.ico('tick', 22) : (icons && icons[i] ? K.ico(icons[i], 22) : '')) + '<span>' + l + '</span></button>'; }).join('') + '</div>';
  };
  K.keypad = function (hidden) {
    var k = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(function (x) { return '<button class="key">' + x + '</button>'; });
    k.push('<button class="key aux">' + K.t('keypad.clear') + '</button>'); k.push('<button class="key">0</button>'); k.push('<button class="key aux" aria-label="' + K.t('keypad.delete') + '">' + K.ico('bksp', 30) + '</button>');
    return '<div class="kp' + (hidden ? ' hidden' : '') + '">' + k.join('') + '</div>';
  };
  K.addbar = function (label, paise, dis) { return '<button class="addbar' + (dis ? ' dis' : '') + '"' + (dis ? ' aria-disabled="true"' : '') + '><span>' + label + '</span>' + (paise ? K.M(paise) : '') + '</button>'; };
  K.primary = function (label, kind, icon) { return '<button class="primary' + (kind ? ' ' + kind : '') + '"' + (kind === 'dis' ? ' aria-disabled="true"' : '') + '>' + (icon ? K.ico(icon, 26) : '') + '<span>' + label + '</span></button>'; };
  K.btn2 = function (label, icon) { return '<button class="btn2">' + (icon ? K.ico(icon, 24) : '') + '<span>' + label + '</span></button>'; };
  K.quiet = function (label) { return '<button class="quiet">' + label + '</button>'; };
  K.sticky = function () { return '<div class="sticky">' + [].slice.call(arguments).join('') + '</div>'; };
  K.scroll = function () { return '<div class="scroll">' + [].slice.call(arguments).join('') + '</div>'; };
  K.stack = function () { return '<div class="stack">' + [].slice.call(arguments).join('') + '</div>'; };
  K.row = function (o) { /* {state:'done'|'next'|'open'|'skip'|'lock', n, name, sub, paise, entries, quiet} */
    var mk = o.state === 'done' ? K.ico('tick', 22) : o.state === 'skip' ? K.ico('dash', 22) : o.state === 'lock' ? K.ico('lock', 22) : '<b>' + (o.n || '') + '</b>';
    var rv = o.paise !== undefined ? '<span class="rv">' + K.M(o.paise) + (o.entries ? '<small>' + o.entries + '</small>' : '') + '</span>' : '';
    return '<li class="row ' + o.state + (o.cls ? ' ' + o.cls : '') + '"><span class="mk">' + mk + '</span><span class="nm">' + o.name + (o.sub ? '<small>' + o.sub + '</small>' : '') + '</span>' + rv + (o.quiet ? K.quiet(o.quiet) : '') + '</li>';
  };
  K.lrow = function (icon, title, sub, o) { o = o || {}; return '<button class="lrow' + (o.danger ? ' danger' : '') + '"><span class="li">' + K.ico(icon, 24) + '</span><span class="lt"><b>' + title + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span>' + (o.right || '') + (o.noChev ? '' : K.ico('chev', 24)) + '</button>'; };
  K.sw = function (on, title, sub) { return '<button class="sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '"><span class="tx"><b>' + title + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span><span class="knob">' + (on ? K.ico('tick', 20) : K.ico('dash', 20)) + '<span>' + K.N(on ? 'On' : 'Off', 'switch state words (DS-V2 3.14); consent screens may use their existing allow/withdraw wording') + '</span></span></button>'; };
  K.field = function (label, value, o) { o = o || {}; return '<div class="field"><label>' + label + '</label><div class="in' + (o.focus ? ' focus' : '') + (o.err ? ' err' : '') + '">' + (value ? '<span>' + value + '</span>' : '<span class="ph">' + (o.ph || '') + '</span>') + (o.focus ? '<i class="caret"></i>' : '') + '</div>' + (o.help ? '<div class="help' + (o.err ? ' err' : '') + '">' + o.help + '</div>' : '') + '</div>'; };
  K.avatar = function (name, i) { return '<span class="av av' + ((i || 0) % 5) + '">' + Array.from(name)[0] + '</span>'; };
  K.prow = function (name, i, sub, paise, state) { return '<li><button class="prow">' + K.avatar(name, i) + '<span class="pn"><b>' + name + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span><span class="pa">' + K.M(paise) + '<em>' + state + '</em></span></button></li>'; };
  K.banner = function (kind, icon, text, action) { return '<div class="banner ' + (kind || '') + '" role="status">' + K.ico(icon || 'info', 24) + '<span>' + text + '</span>' + (action ? K.quiet(action) : '') + '</div>'; };
  K.refuse = function (title, body) { return '<div class="refuse" role="alert">' + K.ico('warn', 24) + '<div><b>' + title + '</b><br>' + body + '</div></div>'; };
  K.refbanner = function (title, body, nn) { return '<div class="refbanner' + (nn ? ' nn' : '') + '" role="alert"><b>' + title + '</b><br>' + body + '</div>'; };
  K.empty = function (icon, text, ctaLabel, ctaIcon) { return '<div class="empty"><div class="ei">' + K.ico(icon, 44) + '</div><p>' + text + '</p>' + (ctaLabel ? K.primary(ctaLabel, '', ctaIcon) : '') + '</div>'; };
  K.skel = function (n) { var h = '<div class="skel" aria-busy="true">'; for (var i = 0; i < (n || 4); i++) h += '<i></i>'; return h + '</div>'; };
  K.sheet = function (title, inner) { return '<div class="scrim"></div><div class="sheet" role="dialog"><h2>' + title + '</h2><div class="scroll">' + inner + '</div></div>'; };
  K.dialog = function (title, inner) { return '<div class="scrim"></div><div class="dialog" role="alertdialog"><h2>' + title + '</h2>' + inner + '</div>'; };
  K.toast = function (icon, text) { return '<div class="toast" role="status">' + K.ico(icon || 'check', 24) + '<span>' + text + '</span></div>'; };
  K.center = function (inner) { return '<div class="center">' + inner + '</div>'; };
  K.dots = function (i, n) { var h = '<div class="dots">'; for (var k = 0; k < n; k++) h += '<i class="' + (k === i ? 'on' : '') + '"></i>'; return h + '</div>'; };
  K.otp = function (digits, cur) { var h = '<div class="otp">'; for (var i = 0; i < 6; i++) h += '<i class="' + (i === cur ? 'cur' : '') + '">' + (digits[i] || '') + '</i>'; return h + '</div>'; };
  K.sec = function (t) { return '<div class="sec">' + t + '</div>'; };
  K.list = function (rows) { return '<ul class="rows">' + rows.join('') + '</ul>'; };
  K.names = { ramesh: ['Ramesh', 'ରମେଶ'], sunita: ['Sunita', 'ସୁନିତା'], bijay: ['Bijay', 'ବିଜୟ'], lakshmi: ['Lakshmi', 'ଲକ୍ଷ୍ମୀ'], pradeep: ['Pradeep', 'ପ୍ରଦୀପ'] };
  K.nm = function (id) { return K.names[id][S.lang === 'en' ? 0 : 1]; }; /* demo names only; real names are user data, shown as typed */
  K.shop = 'Subhadra Kirana';
  K.date = function () { return K.t('t1.day.4') + ' 19 ' + K.t('t1.month.11'); };
  K.screen = function (inner) { return inner; };

  /* build.mjs runs the specs in Node (lang en) to write FLOWS.md from the very same mockup bodies */
  K.frame = function (id) { curFrame = id; };
  K.used = function (id) { return Object.keys(USED[id] || {}); };
  K.newc = function (id) { return Object.keys(NEWC[id] || {}); };

  /* ---- page ---- */
  function frameHtml(sc) {
    return '<div class="fwrap"><h3>' + sc.route + '</h3><div class="bezel"><div class="screen" id="fr-' + sc.id + '"><div class="status"><span>11:42</span><span>100%</span></div><div class="app"></div><div class="gesture"><i></i></div></div></div></div>';
  }
  function noteHtml(sc) {
    var used = Object.keys(USED[sc.id] || {}), nw = Object.keys(NEWC[sc.id] || {});
    var flag = sc.flag === 'NEW' ? '<span class="tag new">NEW screen</span>' : sc.flag === 'CHG' ? '<span class="tag chg">Changed</span>' : '<span class="tag">Exists today</span>';
    var dl = function (k, v) { return v ? '<dt>' + k + '</dt><dd>' + v + '</dd>' : ''; };
    return '<div class="note"><h3>' + flag + sc.title + '</h3><dl>' + dl('Route', '<code>' + sc.route + '</code>') + dl('Purpose', sc.purpose) + dl('Primary action', sc.primary) + dl('Taps / target', sc.taps) + dl('Rules held', sc.rules) + dl('States / notes', sc.notes) + dl('For Saket to review', sc.review) + dl('Copy gaps (en only)', nw.length ? nw.map(function (x) { return '"' + x + '"'; }).join(' · ') + ' (od/hi DRAFT needed, H13)' : '') + '</dl><div class="keys"><b>Keys used:</b> ' + (used.length ? used.join(', ') : 'none') + '</div></div>';
  }
  function renderBodies(scr) { scr.forEach(function (sc) { curFrame = sc.id; var el = document.getElementById('fr-' + sc.id); var app = el.querySelector('.app'); var prev = app.querySelector('.scroll'); var top = prev ? prev.scrollTop : 0; app.innerHTML = sc.body(); var s2 = app.querySelector('.scroll'); if (s2) s2.scrollTop = top; }); }
  function renderNotes(scr) { scr.forEach(function (sc) { document.getElementById('note-' + sc.id).innerHTML = noteHtml(sc); }); }
  K.boot = function () {
    var area = SPEC.area, scr = area.screens;
    document.title = 'SWAFTO Retail Desk - Mitra - ' + area.title;
    var q = function (id) { return document.getElementById(id); };
    q('area-title').textContent = area.title + ' (' + scr.length + ' screen states)'; q('area-intro').innerHTML = area.intro;
    q('toc').innerHTML = scr.map(function (s) { return '<a href="#c-' + s.id + '"' + (s.flag === 'NEW' ? ' class="new"' : '') + '>' + s.title + '</a>'; }).join('');
    q('stage').innerHTML = scr.map(function (sc) { return '<section class="card" id="c-' + sc.id + '">' + frameHtml(sc) + '<div class="note" id="note-' + sc.id + '"></div></section>'; }).join('');
    function all() { document.documentElement.lang = S.lang === 'od' ? 'or' : S.lang; document.body.setAttribute('data-lang', S.lang); document.body.setAttribute('data-theme', S.theme); document.body.style.setProperty('--z', S.size); document.body.style.setProperty('--zc', Math.min(S.size, 1.5)); USED = {}; NEWC = {}; renderBodies(scr); renderNotes(scr); }
    [].forEach.call(document.querySelectorAll('[data-lang-btn]'), function (b) { b.addEventListener('click', function () { S.lang = b.getAttribute('data-lang-btn'); [].forEach.call(document.querySelectorAll('[data-lang-btn]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); }); all(); }); });
    [].forEach.call(document.querySelectorAll('[data-theme-btn]'), function (b) { b.addEventListener('click', function () { S.theme = b.getAttribute('data-theme-btn'); [].forEach.call(document.querySelectorAll('[data-theme-btn]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); }); all(); }); });
    [].forEach.call(document.querySelectorAll('[data-size-btn]'), function (b) { b.addEventListener('click', function () { S.size = parseFloat(b.getAttribute('data-size-btn')); [].forEach.call(document.querySelectorAll('[data-size-btn]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); }); all(); }); });
    all();
  };
})();
