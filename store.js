/* SWAFTO prototype — one shared day record, derived on read. Both phone instances subscribe. */
(function () {
  if (window.SwaftoStore) return;
  const listeners = new Set();
  const emit = () => listeners.forEach(fn => fn());

  const SECTIONS = {
    cashSales:       { n: 1, name: 'Cash sales',          form: 'A', screen: 'T7' },
    upiSales:        { n: 2, name: 'UPI sales',           form: 'A', screen: 'T7' },
    udharSales:      { n: 3, name: 'Udhar sales',         form: 'B', screen: 'T8', dir: 'give',    partyType: 'customer' },
    expenses:        { n: 4, name: 'Expenses',            form: 'C', screen: 'T9' },
    purchase:        { n: 5, name: 'Purchase',            form: 'C', screen: 'T9', supplier: true },
    udharCollection: { n: 6, name: 'Udhar collection',    form: 'B', screen: 'T8', dir: 'collect', partyType: 'customer' },
    partyPayment:    { n: 7, name: 'Party payment',       form: 'B', screen: 'T8', dir: 'pay',     partyType: 'supplier' },
    withdrawal:      { n: 8, name: 'Personal withdrawal', form: 'D', screen: 'T10' },
  };
  const ORDER = ['cashSales', 'upiSales', 'udharSales', 'expenses', 'purchase', 'udharCollection', 'partyPayment', 'withdrawal'];
  const SCREEN_NAMES = {
    A1: 'Splash', A2: 'Language', A3: 'Phone number', A4: 'OTP verification', A5: 'OTP problems (reference)',
    A6: 'Session expired', A7: 'Number changed / lost', A8: 'Logout confirmation',
    S1: 'Settings index', S2: 'Shop profile', S3: 'Owner profile', S5: 'Appearance & text size',
    S7: 'App lock setup', S8: 'Backup and data', S9: 'Delete account · what you lose', S9B: 'Delete account · confirm', S10: 'About', S11: 'Help and support',
    Y1: 'Offline and sync (reference)', Y2: 'Force upgrade', Y3: 'Something went wrong', Y4: 'Notifications inbox', Y5: 'Notification permission primer',
    X1: 'Onboarding', T1: 'Today · open day', T2: 'Today · first run', T3: 'Today · already closed',
    T5: 'Day close list', T6: 'Opening cash', T7: 'Entry · Form A', T8: 'Entry · Form B', T9: 'Entry · Form C',
    T10: 'Entry · Form D', T11: 'Cash check · counting', T12: 'Cash check · difference', T13: 'Cash check · balanced',
    T14: 'Day closed summary', P1: 'Parties list', P2: 'Customer detail', P3: 'Supplier detail',
  };
  const SCREEN_ORDER = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'S1', 'S2', 'S3', 'S5', 'S7', 'S8', 'S9', 'S9B', 'S10', 'S11', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'X1', 'T2', 'T6', 'T1', 'T5', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'T13', 'T14', 'T3', 'P1', 'P2', 'P3'];
  const MODES = { cash: 'Cash', upi: 'UPI', other: 'Other', udhar: 'Udhar', stock: 'Shop stock' };
  const FAQS = [
    { q: 'My cash does not match.', a: "Use Cash check's reasons — gave change, forgot an expense, miscount — to note why, then close anyway. It doesn't block your day." },
    { q: 'I forgot to close yesterday.', a: 'Open Day close from Today and finish it before starting a new day. Entries stay dated to when you made them.' },
    { q: 'How do I correct a closed day?', a: 'Open the closed day from Reports and post a correction — it never changes the original numbers, only adds a note next to them.' },
    { q: 'What is udhar collection?', a: 'Money a customer pays back on what they owe you. It reduces their balance and adds to your cash if paid in cash.' },
    { q: 'Can I fix a mistake before closing?', a: 'Yes — open any section from the day close list, delete the wrong line, and add the right one. Nothing is locked until you close the day.' },
    { q: 'Is my data safe if I lose my phone?', a: 'Yes. Everything is saved to your account, not just this phone. Sign in on any device with your number to see it again.' },
    { q: 'Why count cash every day?', a: "It's the only way to know the book matches the box before problems pile up. Most days take under a minute." },
  ];

  const PARTIES = [
    { id: 'ramesh', name: 'Ramesh', type: 'customer', phone: '98610 42317', base: 8300, lastDate: '15 Jul', ageDays: 0,
      history: [
        { date: '20 Jun', kind: 'Opening balance', amt: 5200, dir: '+' },
        { date: '28 Jun', kind: 'Collected · cash', amt: 1000, dir: '-' },
        { date: '2 Jul', kind: 'Udhar sale', amt: 1800, dir: '+' },
        { date: '9 Jul', kind: 'Udhar sale', amt: 2300, dir: '+' }] },
    { id: 'suresh', name: 'Suresh', type: 'customer', phone: '94370 18852', base: 6390, lastDate: '10 Jun', ageDays: 35,
      history: [
        { date: '3 Jun', kind: 'Udhar sale', amt: 4190, dir: '+' },
        { date: '10 Jun', kind: 'Udhar sale', amt: 2200, dir: '+' }] },
    { id: 'lakshmi', name: 'Lakshmi', type: 'customer', phone: '77350 90114', base: 4400, lastDate: '15 Jul', ageDays: 0,
      history: [
        { date: '30 Jun', kind: 'Udhar sale', amt: 3000, dir: '+' },
        { date: '6 Jul', kind: 'Udhar sale', amt: 2400, dir: '+' },
        { date: '11 Jul', kind: 'Collected · cash', amt: 1000, dir: '-' }] },
    { id: 'agarwal', name: 'Agarwal Traders', type: 'supplier', phone: '93370 22160', base: 12000, lastDate: '15 Jul', ageDays: 12, due: 'Thursday 17 Jul', dueIn: 2,
      history: [{ date: '3 Jul', kind: 'Purchase · udhar · due Thu 17 Jul', amt: 12000, dir: '+' }] },
    { id: 'mohanty', name: 'Mohanty Distributors', type: 'supplier', phone: '99370 55408', base: 15600, lastDate: '15 Jul', ageDays: 37,
      history: [{ date: '8 Jun', kind: 'Purchase · udhar', amt: 15600, dir: '+' }] },
  ];
  const partyById = id => PARTIES.find(p => p.id === id);
  const partyByName = name => PARTIES.find(p => p.name.toLowerCase() === String(name || '').trim().toLowerCase());

  let nextId = 100;
  const E = (section, amount, extra) => Object.assign({ id: nextId++, section, amount, mode: 'cash', source: 'manual' }, extra || {});
  const seed = () => [
    E('cashSales', 1200), E('cashSales', 850), E('cashSales', 640), E('cashSales', 1500), E('cashSales', 980), E('cashSales', 760), E('cashSales', 850),
    E('upiSales', 1420, { mode: 'upi' }), E('upiSales', 900, { mode: 'upi' }), E('upiSales', 800, { mode: 'upi' }),
    E('udharSales', 600, { party: 'ramesh', mode: 'udhar' }), E('udharSales', 450, { party: 'suresh', mode: 'udhar' }), E('udharSales', 500, { party: 'lakshmi', mode: 'udhar' }),
    E('expenses', 80, { label: 'Chai' }), E('expenses', 200, { label: 'Auto fare' }), E('expenses', 400, { label: 'Electricity bill' }),
    E('expenses', 300, { label: 'Polythene bags', mode: 'upi' }), E('expenses', 200, { label: 'Staff snacks', mode: 'stock' }),
    E('purchase', 2000, { party: 'agarwal', label: 'Agarwal Traders' }), E('purchase', 1200, { party: 'mohanty', label: 'Mohanty Distributors' }),
    E('udharCollection', 1500, { party: 'ramesh' }), E('udharCollection', 900, { party: 'lakshmi' }),
    E('withdrawal', 500),
  ];

  const fresh = () => ({
    screen: 'T1', origin: null, section: null, pending: null, returnScreen: null,
    typed: '', label: '', party: '', partyId: null, mode: 'cash', dueChip: null,
    wdCash: '', wdUpi: '', activeField: 'amount',
    counted: '', countedCommitted: null, reason: null, checkNote: false,
    skipped: {}, closed: false, dayStarted: true, openingCash: 1500,
    entries: seed(), selectedParty: null, confirm: null, toast: null, pendingSync: 0,
    onboarding: { shop: 'Sharma Kirana Store', lang: 'English', size: 'Standard', opening: '' },
    auth: { lang: null, phone: '', otp: ['', '', '', '', '', ''], resendSeconds: 30, verifying: false },
    recovery: { stage: 'decide', oldPhone: '', oldOtp: ['', '', '', '', '', ''], newPhone: '', newOtp: ['', '', '', '', '', ''], resendSeconds: 30, from: 'A3' },
    lock: { stage: 'set', pin: '', confirmPin: '', error: false },
    shop: { type: 'Kirana / general', address: '', gstin: '' },
    owner: { name: 'Rajanikanta Sahoo' },
    appearance: 'comfort',
    backup: { range: 'This month', format: 'CSV', delivery: 'whatsapp' }, lastBackup: 'Today · 9:14 pm',
    deleteConfirmText: '', helpOpen: null,
    notifications: [
      { id: 1, text: 'Agarwal Traders ₹12,000 due tomorrow', time: 'Today · 8:02 am', read: false },
      { id: 2, text: '4 customers past 30 days', time: 'Today · 8:02 am', read: false },
      { id: 3, text: 'Yesterday was not closed', time: 'Yesterday · 9:40 pm', read: true },
      { id: 4, text: 'Mohanty Distributors · payment 37 days old', time: '3 days ago', read: true },
    ],
    lastSave: 0,
  });
  let s = fresh();
  const set = patch => { Object.assign(s, patch); emit(); };

  // ---- formatting -------------------------------------------------------
  const num = n => Math.round(Math.abs(n)).toLocaleString('en-IN');
  const rs = n => '₹' + num(n);
  const signed = n => (n < 0 ? '− ' : '+ ') + rs(n);
  const neg = n => '− ' + rs(n);

  // ---- derivations (never stored) -----------------------------------------
  const bySection = sec => s.entries.filter(e => e.section === sec);
  const sum = list => list.reduce((a, e) => a + e.amount, 0);
  const total = sec => sum(bySection(sec));
  const cashOf = sec => sum(bySection(sec).filter(e => e.mode === 'cash'));
  const derive = () => {
    const cashReceived = total('cashSales') + cashOf('udharCollection');
    const cashPaid = cashOf('expenses') + cashOf('purchase') + cashOf('partyPayment') + cashOf('withdrawal');
    const expected = s.openingCash + cashReceived - cashPaid;
    const netSales = total('cashSales') + total('upiSales') + total('udharSales');
    const profit = netSales - total('purchase') - total('expenses');
    const stateOf = sec => bySection(sec).length ? 'entered' : (s.skipped[sec] ? 'skipped' : 'untouched');
    const doneSections = ORDER.filter(sec => stateOf(sec) !== 'untouched').length;
    const allDone = doneSections === ORDER.length;
    const ringDone = (s.dayStarted ? 1 : 0) + doneSections + (s.closed ? 1 : 0);
    return { cashReceived, cashPaid, expected, netSales, profit, stateOf, doneSections, allDone, ringDone };
  };
  const partyBalance = p => {
    let b = p.base;
    s.entries.forEach(e => {
      if (e.party !== p.id) return;
      if (e.section === 'udharSales') b += e.amount;
      if (e.section === 'udharCollection') b -= e.amount;
      if (e.section === 'purchase' && e.mode === 'udhar') b += e.amount;
      if (e.section === 'partyPayment') b -= e.amount;
    });
    return b;
  };
  const toCollect = () => PARTIES.filter(p => p.type === 'customer').reduce((a, p) => a + partyBalance(p), 0);
  const owed = () => PARTIES.filter(p => p.type === 'supplier').reduce((a, p) => a + partyBalance(p), 0);

  // ---- actions ------------------------------------------------------------
  const isForm = sc => ['T7', 'T8', 'T9', 'T10'].includes(sc);
  const todayScreen = () => (!s.dayStarted ? 'T2' : s.closed ? 'T3' : 'T1');
  const toast = msg => { set({ toast: msg }); setTimeout(() => { if (s.toast === msg) set({ toast: null }); }, 2600); };
  const queueSync = () => { set({ pendingSync: s.pendingSync + 1 }); setTimeout(() => set({ pendingSync: Math.max(0, s.pendingSync - 1) }), 2400); };

  // ---- sign-in (A1-A5) ---------------------------------------------------
  let resendInterval = null;
  const clearResendTimer = () => { if (resendInterval) { clearInterval(resendInterval); resendInterval = null; } };
  const startResendTimer = () => {
    clearResendTimer();
    set({ auth: Object.assign({}, s.auth, { resendSeconds: 30 }) });
    resendInterval = setInterval(() => {
      const cur = s.auth.resendSeconds;
      if (cur <= 1) { clearResendTimer(); set({ auth: Object.assign({}, s.auth, { resendSeconds: 0 }) }); }
      else set({ auth: Object.assign({}, s.auth, { resendSeconds: cur - 1 }) });
    }, 1000);
  };
  const fmtPhone = v => (v.length > 5 ? v.slice(0, 5) + ' ' + v.slice(5) : v);
  const mmss = n => Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  const otpBoxStyle = (isFilled, active) => `min-height:56px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;border-radius:var(--radius-control);background:var(--surface-card);border:2px solid ${active ? 'var(--focus-ring)' : 'var(--text-muted)'};color:var(--text-primary)`;
  const openWhatsApp = msg => window.open('https://wa.me/919800000000?text=' + encodeURIComponent('SWAFTO support — ' + msg + ' (Shop: Sharma Kirana Store · v1.0.0)'), '_blank');
  const authPickLang = lang => set({ auth: Object.assign({}, s.auth, { lang }), onboarding: Object.assign({}, s.onboarding, { lang }), screen: 'A3' });
  const authKeyTap = k => {
    const sc = s.screen;
    if (sc === 'A3') {
      let v = s.auth.phone;
      if (k === 'back') v = v.slice(0, -1); else if (v.length < 10) v += k;
      set({ auth: Object.assign({}, s.auth, { phone: v }) });
    } else if (sc === 'A4') {
      const otp = s.auth.otp.slice();
      if (k === 'back') {
        let li = -1; otp.forEach((d, i) => { if (d !== '') li = i; });
        if (li >= 0) otp[li] = '';
        set({ auth: Object.assign({}, s.auth, { otp }) });
      } else {
        const fi = otp.indexOf('');
        if (fi < 0) return;
        otp[fi] = k;
        const complete = otp.every(d => d !== '');
        set({ auth: Object.assign({}, s.auth, { otp, verifying: complete }) });
        if (complete) {
          clearResendTimer();
          setTimeout(() => set({ screen: 'X1', auth: Object.assign({}, s.auth, { otp, verifying: false }) }), 700);
        }
      }
    }
  };
  const sendCode = () => {
    if (s.auth.phone.length !== 10) return;
    set({ screen: 'A4', auth: Object.assign({}, s.auth, { otp: ['', '', '', '', '', ''], verifying: false }) });
    startResendTimer();
  };
  const resendCode = () => { if (s.auth.resendSeconds !== 0) return; startResendTimer(); toast('Code sent again.'); };
  const editPhone = () => set({ screen: 'A3' });
  const changeNumberLink = () => set({ screen: 'A7', recovery: { stage: 'decide', oldPhone: '', oldOtp: ['', '', '', '', '', ''], newPhone: '', newOtp: ['', '', '', '', '', ''], resendSeconds: 30, from: 'A3' } });
  const changeNumberFromSettings = () => set({ screen: 'A7', recovery: { stage: 'decide', oldPhone: '', oldOtp: ['', '', '', '', '', ''], newPhone: '', newOtp: ['', '', '', '', '', ''], resendSeconds: 30, from: 'S3' } });;
  const sessionReverify = () => { set({ screen: 'A4', auth: Object.assign({}, s.auth, { otp: ['', '', '', '', '', ''], verifying: false }) }); startResendTimer(); };

  let recoveryInterval = null;
  const clearRecoveryTimer = () => { if (recoveryInterval) { clearInterval(recoveryInterval); recoveryInterval = null; } };
  const startRecoveryResend = () => {
    clearRecoveryTimer();
    set({ recovery: Object.assign({}, s.recovery, { resendSeconds: 30 }) });
    recoveryInterval = setInterval(() => {
      const cur = s.recovery.resendSeconds;
      if (cur <= 1) { clearRecoveryTimer(); set({ recovery: Object.assign({}, s.recovery, { resendSeconds: 0 }) }); }
      else set({ recovery: Object.assign({}, s.recovery, { resendSeconds: cur - 1 }) });
    }, 1000);
  };
  const recoveryPickHaveOld = () => set({ recovery: Object.assign({}, s.recovery, { stage: 'oldPhone' }) });
  const recoveryPickNoOld = () => set({ recovery: Object.assign({}, s.recovery, { stage: 'handoff' }) });
  const recoverySendOld = () => { if (s.recovery.oldPhone.length !== 10) return; set({ recovery: Object.assign({}, s.recovery, { stage: 'oldOtp', oldOtp: ['', '', '', '', '', ''] }) }); startRecoveryResend(); };
  const recoverySendNew = () => { if (s.recovery.newPhone.length !== 10) return; set({ recovery: Object.assign({}, s.recovery, { stage: 'newOtp', newOtp: ['', '', '', '', '', ''] }) }); startRecoveryResend(); };
  const recoveryResendCode = () => { if (s.recovery.resendSeconds !== 0) return; startRecoveryResend(); toast('Code sent again.'); };
  const recoveryKeyTap = k => {
    const st = s.recovery.stage;
    if (st === 'oldPhone' || st === 'newPhone') {
      const field = st === 'oldPhone' ? 'oldPhone' : 'newPhone';
      let v = s.recovery[field];
      if (k === 'back') v = v.slice(0, -1); else if (v.length < 10) v += k;
      set({ recovery: Object.assign({}, s.recovery, { [field]: v }) });
    } else if (st === 'oldOtp' || st === 'newOtp') {
      const field = st === 'oldOtp' ? 'oldOtp' : 'newOtp';
      const otp = s.recovery[field].slice();
      if (k === 'back') {
        let li = -1; otp.forEach((d, i) => { if (d !== '') li = i; });
        if (li >= 0) otp[li] = '';
        set({ recovery: Object.assign({}, s.recovery, { [field]: otp }) });
      } else {
        const fi = otp.indexOf('');
        if (fi < 0) return;
        otp[fi] = k;
        set({ recovery: Object.assign({}, s.recovery, { [field]: otp }) });
        if (otp.every(d => d !== '')) {
          const next = st === 'oldOtp' ? 'newPhone' : 'done';
          clearRecoveryTimer();
          setTimeout(() => set({ recovery: Object.assign({}, s.recovery, { stage: next }) }), 500);
        }
      }
    }
  };
  const recoveryFinish = () => set({ screen: s.recovery.from === 'S3' ? 'S1' : 'A3', auth: Object.assign({}, s.auth, { phone: s.recovery.newPhone }) });
  const recoveryWhatsapp = () => openWhatsApp("My phone number changed and I no longer have the old one. Shop: Sharma Kirana Store. Last used 15 July.");

  const logoutCancel = () => set({ screen: todayScreen() });
  const logoutConfirm = () => { set({ screen: 'A3', auth: Object.assign({}, s.auth, { otp: ['', '', '', '', '', ''] }) }); toast('Signed out.'); };

  const lockKeyTap = k => {
    const st = s.lock.stage;
    if (st === 'set') {
      let v = s.lock.pin;
      if (k === 'back') v = v.slice(0, -1); else if (v.length < 4) v += k;
      set({ lock: Object.assign({}, s.lock, { pin: v }) });
      if (v.length === 4) setTimeout(() => set({ lock: Object.assign({}, s.lock, { stage: 'confirm', confirmPin: '', error: false }) }), 400);
    } else if (st === 'confirm') {
      let v = s.lock.confirmPin;
      if (k === 'back') v = v.slice(0, -1); else if (v.length < 4) v += k;
      set({ lock: Object.assign({}, s.lock, { confirmPin: v, error: false }) });
      if (v.length === 4) {
        if (v === s.lock.pin) setTimeout(() => set({ lock: Object.assign({}, s.lock, { stage: 'done' }) }), 300);
        else setTimeout(() => set({ lock: Object.assign({}, s.lock, { confirmPin: '', error: true }) }), 300);
      }
    }
  };
  const lockDone = () => set({ screen: 'S1' });
  const lockSkip = () => set({ screen: 'S1' });

  const goS1 = () => set({ screen: 'S1' });
  const goS2 = () => set({ screen: 'S2' });
  const goS3 = () => set({ screen: 'S3' });
  const goS5 = () => set({ screen: 'S5' });
  const goAppLock = () => set({ screen: 'S7', lock: s.lock.stage === 'done' ? s.lock : { stage: 'set', pin: '', confirmPin: '', error: false } });
  const goToLogout = () => set({ screen: 'A8' });
  const helpWhatsapp = () => openWhatsApp('I need help with the app.');
  const stubToast = label => () => toast(label + ' is outside this run.');
  const goS8 = () => set({ screen: 'S8' });
  const goS9 = () => set({ screen: 'S9', deleteConfirmText: '' });
  const goS9B = () => set({ screen: 'S9B', deleteConfirmText: '' });
  const goS10 = () => set({ screen: 'S10' });
  const goS11 = () => set({ screen: 'S11' });
  const goExportFromDelete = () => set({ screen: 'S8' });
  const onDeleteConfirmText = ev => set({ deleteConfirmText: ev.target.value });
  const deleteAccountGo = () => {
    if (s.deleteConfirmText.trim().toLowerCase() !== s.onboarding.shop.trim().toLowerCase()) return;
    toast('Deletion scheduled. Sign in within 30 days to cancel.');
    set({ screen: 'S1', deleteConfirmText: '' });
  };
  const setRangeMonth = () => set({ backup: Object.assign({}, s.backup, { range: 'This month' }) });
  const setRange3 = () => set({ backup: Object.assign({}, s.backup, { range: 'Last 3 months' }) });
  const setRangeFY = () => set({ backup: Object.assign({}, s.backup, { range: 'This financial year' }) });
  const setRangeCustom = () => set({ backup: Object.assign({}, s.backup, { range: 'Custom range' }) });
  const setFormatCsv = () => set({ backup: Object.assign({}, s.backup, { format: 'CSV' }) });
  const setFormatPdf = () => set({ backup: Object.assign({}, s.backup, { format: 'PDF' }) });
  const setDeliveryWhatsapp = () => set({ backup: Object.assign({}, s.backup, { delivery: 'whatsapp' }) });
  const setDeliverySave = () => set({ backup: Object.assign({}, s.backup, { delivery: 'save' }) });
  const doExport = () => {
    if (s.backup.delivery === 'whatsapp') openWhatsApp('Please send my ' + s.backup.range.toLowerCase() + ' export as ' + s.backup.format + '.');
    else toast('Saved to Downloads · Swafto-Export.' + s.backup.format.toLowerCase());
  };
  const aboutPrivacy = stubToast('Privacy policy');
  const aboutTerms = stubToast('Terms of service');
  const aboutLicences = stubToast('Open-source licences');
  const toggleFaq = i => () => set({ helpOpen: s.helpOpen === i ? null : i });
  const goY4 = () => set({ screen: 'Y4' });
  const markNotifRead = id => () => set({ notifications: s.notifications.map(n => n.id === id ? Object.assign({}, n, { read: true }) : n) });
  const clearNotifications = () => set({ notifications: [] });
  const tryAgain = () => set({ screen: todayScreen() });
  const reportProblem = () => openWhatsApp('Something went wrong in the app.');
  const allowNotif = () => { toast("Android's permission dialog opens now."); set({ screen: todayScreen() }); };
  const notNowNotif = () => { toast('You can turn this on later in Settings.'); set({ screen: todayScreen() }); };
  const goUpdate = () => toast('Opens the Play Store.');
  const onOwnerName = ev => set({ owner: Object.assign({}, s.owner, { name: ev.target.value }) });
  const saveOwner = () => { toast('Owner profile saved.'); set({ screen: 'S1' }); };
  const onShopAddress = ev => set({ shop: Object.assign({}, s.shop, { address: ev.target.value }) });
  const onShopGstin = ev => set({ shop: Object.assign({}, s.shop, { gstin: ev.target.value.toUpperCase() }) });
  const setShopKirana = () => set({ shop: Object.assign({}, s.shop, { type: 'Kirana / general' }) });
  const setShopPharmacy = () => set({ shop: Object.assign({}, s.shop, { type: 'Pharmacy' }) });
  const setShopHardware = () => set({ shop: Object.assign({}, s.shop, { type: 'Hardware' }) });
  const setShopOther = () => set({ shop: Object.assign({}, s.shop, { type: 'Other' }) });
  const saveShop = () => { toast('Shop profile saved.'); set({ screen: 'S1' }); };
  const setAppearanceComfort = () => set({ appearance: 'comfort' });
  const setAppearanceFocus = () => set({ appearance: 'focus' });
  const langScript = lang => (lang === 'Odia' ? 'ଓଡ଼ିଆ' : lang === 'Hindi' ? 'हिन्दी' : 'English');

  const openEntry = (section, origin, opts) => {
    opts = opts || {};
    if (s.closed) return;
    if (isForm(s.screen) && s.section === section) return; // E8 idempotent
    if (!s.dayStarted) { set({ pending: { section, origin, opts }, screen: 'T6', typed: '', activeField: 'opening' }); return; } // E1
    const p = opts.partyId ? partyById(opts.partyId) : null;
    set({
      section, origin, screen: SECTIONS[section].screen,
      returnScreen: opts.returnScreen || null,
      typed: '', label: '', party: p ? p.name : '', partyId: p ? p.id : null,
      mode: 'cash', dueChip: null, wdCash: '', wdUpi: '', activeField: 'amount', confirm: null,
    });
  };
  const returnTo = () => {
    const o = s.origin;
    const patch = { typed: '', label: '', party: '', partyId: null, confirm: null };
    if (o === 'list') patch.screen = 'T5';
    else if (o === 'party') patch.screen = s.returnScreen || 'P1';
    else if (o === 'check') { patch.screen = 'T11'; patch.countedCommitted = null; patch.counted = ''; patch.checkNote = true; patch.activeField = 'counted'; } // E7
    else patch.screen = todayScreen();
    set(patch);
  };
  const keyTap = k => {
    const f = s.activeField;
    const map = { amount: 'typed', counted: 'counted', wdCash: 'wdCash', wdUpi: 'wdUpi', opening: 'typed' };
    const key = map[f] || 'typed';
    let v = s[key];
    if (k === 'back') v = v.slice(0, -1);
    else if (v.length < 7) { v = (v + k).replace(/^0+(?=\d)/, ''); }
    set({ [key]: v });
  };
  const parse = v => parseInt(v || '0', 10) || 0;
  const canSave = () => {
    if (!s.section) return false;
    const f = SECTIONS[s.section].form;
    if (f === 'D') return parse(s.wdCash) + parse(s.wdUpi) > 0;
    if (f === 'B') return parse(s.typed) > 0 && s.party.trim().length > 0;
    return parse(s.typed) > 0;
  };
  const save = andAnother => {
    const now = Date.now();
    if (now - s.lastSave < 400 || !canSave()) return; // E8 debounce
    const sec = s.section, cfg = SECTIONS[sec];
    const added = [];
    if (cfg.form === 'D') {
      if (parse(s.wdCash)) added.push(E(sec, parse(s.wdCash), { mode: 'cash' }));
      if (parse(s.wdUpi)) added.push(E(sec, parse(s.wdUpi), { mode: 'upi' }));
    } else if (cfg.form === 'B') {
      const p = partyByName(s.party);
      added.push(E(sec, parse(s.typed), { party: p ? p.id : null, label: s.party.trim(), mode: cfg.dir === 'give' ? 'udhar' : s.mode }));
    } else if (cfg.form === 'C') {
      const p = cfg.supplier ? partyByName(s.party) : null;
      added.push(E(sec, parse(s.typed), { label: s.label.trim() || (p ? p.name : s.party.trim()), party: p ? p.id : null, mode: s.mode, dueChip: s.mode === 'udhar' ? s.dueChip : null }));
    } else {
      added.push(E(sec, parse(s.typed), { mode: sec === 'upiSales' ? 'upi' : 'cash' }));
    }
    const patch = { entries: s.entries.concat(added), lastSave: now, typed: '', wdCash: '', wdUpi: '' };
    if (s.skipped[sec]) { patch.skipped = Object.assign({}, s.skipped, { [sec]: false }); toast(cfg.name + ' is no longer marked empty.'); } // E3
    if (s.countedCommitted != null && s.origin !== 'check') patch.countedCommitted = null; // E7 safety
    set(patch);
    queueSync();
    if (!andAnother) returnTo();
    else if (cfg.form !== 'A') set({ label: '', party: cfg.dir ? s.party : '', dueChip: null });
  };
  const done = () => { if (canSave()) save(true); returnTo(); };
  const back = () => {
    const sc = s.screen;
    if (isForm(sc)) {
      const dirty = s.typed || s.label || s.wdCash || s.wdUpi || (s.party && !s.partyId);
      if (dirty) set({ confirm: 'discard' }); else returnTo(); // E5
      return;
    }
    if (sc === 'A7') {
      const prevMap = { oldPhone: 'decide', oldOtp: 'oldPhone', newPhone: 'oldOtp', newOtp: 'newPhone', done: 'newPhone', handoff: 'decide' };
      const prev = prevMap[s.recovery.stage];
      if (prev) set({ recovery: Object.assign({}, s.recovery, { stage: prev }) }); else set({ screen: s.recovery.from === 'S3' ? 'S3' : 'A3' });
      return;
    }
    if (sc === 'S7') {
      if (s.lock.stage === 'confirm') set({ lock: Object.assign({}, s.lock, { stage: 'set', pin: '', confirmPin: '', error: false }) });
      else set({ screen: 'S1' });
      return;
    }
    const map = { T5: todayScreen(), T6: s.pending ? 'T2' : todayScreen(), T11: 'T5', T12: 'T11', T13: 'T11', T14: 'T3', P2: 'P1', P3: 'P1', X1: 'X1', A3: 'A2', A4: 'A3', A5: 'A4', S8: 'S1', S9: 'S1', S9B: 'S9', S10: 'S1', S11: 'S1', Y1: todayScreen(), Y3: todayScreen(), Y4: todayScreen() };
    const patch = { screen: map[sc] || todayScreen() };
    if (sc === 'T12' || sc === 'T13') { patch.countedCommitted = null; patch.activeField = 'counted'; }
    set(patch);
  };
  const jump = id => {
    const patch = { screen: id, confirm: null, toast: null, checkNote: false };
    const d = derive();
    if (id === 'T2') Object.assign(patch, { dayStarted: false, closed: false });
    if (id === 'T1' || id === 'T5') Object.assign(patch, { dayStarted: true, closed: false });
    if (id === 'T6') Object.assign(patch, { typed: '', activeField: 'opening', pending: null });
    if (id === 'T7') Object.assign(patch, { section: 'cashSales', origin: 'rail', typed: '', activeField: 'amount', closed: false, dayStarted: true });
    if (id === 'T8') Object.assign(patch, { section: 'udharSales', origin: 'rail', typed: '', party: '', partyId: null, mode: 'cash', activeField: 'amount', closed: false, dayStarted: true });
    if (id === 'T9') Object.assign(patch, { section: 'expenses', origin: 'rail', typed: '', label: '', mode: 'cash', activeField: 'amount', closed: false, dayStarted: true });
    if (id === 'T10') Object.assign(patch, { section: 'withdrawal', origin: 'list', wdCash: '', wdUpi: '', activeField: 'wdCash', closed: false, dayStarted: true });
    if (id === 'T11') Object.assign(patch, { counted: '', countedCommitted: null, activeField: 'counted', closed: false, dayStarted: true });
    if (id === 'T12') Object.assign(patch, { countedCommitted: d.expected - 250, counted: String(d.expected - 250), reason: null, closed: false, dayStarted: true });
    if (id === 'T13') Object.assign(patch, { countedCommitted: d.expected, counted: String(d.expected), closed: false, dayStarted: true });
    if (id === 'T14' || id === 'T3') Object.assign(patch, { closed: true, dayStarted: true, countedCommitted: s.countedCommitted != null ? s.countedCommitted : d.expected - 250, reason: s.reason || 'Gave change' });
    if (id === 'P2') patch.selectedParty = s.selectedParty && partyById(s.selectedParty).type === 'customer' ? s.selectedParty : 'ramesh';
    if (id === 'P3') patch.selectedParty = s.selectedParty && partyById(s.selectedParty).type === 'supplier' ? s.selectedParty : 'agarwal';
    if (id === 'A3') patch.auth = Object.assign({}, s.auth, { phone: s.auth.phone || '9876543210' });
    if (id === 'A4') patch.auth = Object.assign({}, s.auth, { phone: s.auth.phone || '9876543210', otp: ['9', '8', '7', '', '', ''], verifying: false });
    if (id === 'A6') patch.auth = Object.assign({}, s.auth, { phone: s.auth.phone || '9876543210' });
    if (id === 'A7') patch.recovery = { stage: 'decide', oldPhone: '', oldOtp: ['', '', '', '', '', ''], newPhone: '', newOtp: ['', '', '', '', '', ''], resendSeconds: 30 };
    if (id === 'A8') patch.pendingSync = Math.max(s.pendingSync, 2);
    if (id === 'S7') patch.lock = { stage: 'set', pin: '', confirmPin: '', error: false };
    if (id === 'A6' || id === 'S3') patch.auth = Object.assign({}, s.auth, { phone: s.auth.phone || '9876543210' });
    if (id === 'Y4') patch.notifications = [
      { id: 1, text: 'Agarwal Traders ₹12,000 due tomorrow', time: 'Today · 8:02 am', read: false },
      { id: 2, text: '4 customers past 30 days', time: 'Today · 8:02 am', read: false },
      { id: 3, text: 'Yesterday was not closed', time: 'Yesterday · 9:40 pm', read: true },
      { id: 4, text: 'Mohanty Distributors · payment 37 days old', time: '3 days ago', read: true },
    ];
    set(patch);
    if (id === 'A4') startResendTimer();
  };

  // ---- view model ---------------------------------------------------------
  const lineFor = e => {
    const cfg = SECTIONS[e.section];
    const p = e.party ? partyById(e.party) : null;
    let primary = '', secondary = '';
    if (cfg.form === 'A') { primary = rs(e.amount); secondary = cfg.n === 2 ? 'UPI' : 'Cash'; }
    else if (cfg.form === 'B') { primary = p ? p.name : (e.label || 'New party'); secondary = cfg.dir === 'give' ? 'Udhar' : MODES[e.mode]; }
    else if (cfg.form === 'C') { primary = e.label || 'Purchase'; secondary = MODES[e.mode] + (e.mode !== 'cash' ? " · doesn't change cash" : '') + (e.dueChip ? ' · due in ' + e.dueChip : ''); }
    else { primary = MODES[e.mode]; secondary = 'Reduces cash · not an expense'; }
    const isIn = e.section === 'cashSales' || e.section === 'upiSales' || e.section === 'udharSales' || e.section === 'udharCollection';
    const isOut = !isIn;
    return {
      id: e.id, primary, secondary, amount: (isIn ? '+ ' : '− ') + rs(e.amount), isIn, isOut,
      amountColor: isIn ? 'var(--money-in)' : 'var(--money-out)',
      arrowColor: isIn ? 'var(--money-in)' : 'var(--money-out)',
      arrowPath: isIn ? 'M12 19V5M5 12l7-7 7 7' : 'M12 5v14M5 12l7 7 7-7',
      onDelete: () => set({ confirm: 'delete:' + e.id }),
    };
  };

  const vals = () => {
    const askCloseFn = () => set({ confirm: 'close' });
    const d = derive();
    const sc = s.screen;
    const recStage = s.recovery.stage;
    const lockStage = s.lock.stage;
    const unreadCount = s.notifications.filter(n => !n.read).length;
    const cfg = s.section ? SECTIONS[s.section] : null;
    const counted = s.countedCommitted;
    const diff = counted == null ? 0 : counted - d.expected;
    const partyType = cfg && cfg.partyType;
    const matches = cfg && cfg.form === 'B' && s.party.trim() && !s.partyId
      ? PARTIES.filter(p => p.type === partyType && p.name.toLowerCase().startsWith(s.party.trim().toLowerCase())) : [];
    const sel = s.selectedParty ? partyById(s.selectedParty) : null;
    const selBalance = sel ? partyBalance(sel) : 0;
    const ledger = sel ? (() => {
      let bal = 0; const rows = [];
      sel.history.forEach(h => { bal += h.dir === '+' ? h.amt : -h.amt; rows.push({ date: h.date, kind: h.kind, amount: (h.dir === '+' ? '+ ' : '− ') + rs(h.amt), isIn: h.dir === '-', isOut: h.dir === '+', balance: rs(bal) }); });
      s.entries.filter(e => e.party === sel.id).forEach(e => {
        let delta = 0, kind = '';
        if (e.section === 'udharSales') { delta = e.amount; kind = 'Udhar sale'; }
        else if (e.section === 'udharCollection') { delta = -e.amount; kind = 'Collected · ' + MODES[e.mode]; }
        else if (e.section === 'purchase') { delta = e.mode === 'udhar' ? e.amount : 0; kind = 'Purchase · ' + MODES[e.mode] + (e.dueChip ? ' · due in ' + e.dueChip : ''); }
        else if (e.section === 'partyPayment') { delta = -e.amount; kind = 'Paid · ' + MODES[e.mode]; }
        bal += delta;
        rows.push({ date: 'Today', kind, amount: (delta > 0 ? '+ ' : delta < 0 ? '− ' : '') + rs(e.amount), isIn: delta < 0, isOut: delta > 0, balance: rs(bal) });
      });
      return rows.reverse();
    })() : [];

    const chip = (active, pill) => `min-height:var(--touch-min);padding:0 var(--space-3);border-radius:${pill ? 'var(--radius-pill)' : 'var(--radius-control)'};border:1px solid ${active ? 'var(--action)' : 'var(--text-muted)'};background:${active ? 'var(--action)' : 'var(--surface-card)'};color:${active ? 'var(--on-action)' : 'var(--text-primary)'};font-size:15px;font-weight:${active ? 700 : 500};cursor:pointer;display:flex;align-items:center;justify-content:center`;
    const rows = ORDER.map(sec => {
      const c = SECTIONS[sec], st = d.stateOf(sec), list = bySection(sec);
      let sub = 'Tap to enter';
      if (st === 'skipped') sub = 'Nothing to enter today';
      else if (st === 'entered') {
        if (c.form === 'A') sub = list.length + (list.length === 1 ? ' entry' : ' entries') + (sec === 'upiSales' ? ' · typed' : '');
        else if (c.form === 'B') { const n = new Set(list.map(e => e.party || e.label)).size; sub = n + (n === 1 ? (c.partyType === 'supplier' ? ' supplier' : ' customer') : (c.partyType === 'supplier' ? ' suppliers' : ' customers')); }
        else if (c.form === 'C') { const stock = list.filter(e => e.mode === 'stock').length; const n = sec === 'purchase' ? new Set(list.map(e => e.party || e.label)).size : list.length; sub = n + (sec === 'purchase' ? (n === 1 ? ' supplier' : ' suppliers') : (n === 1 ? ' entry' : ' entries')) + (stock ? ' · ' + stock + ' shop stock' : ''); }
        else sub = list.map(e => MODES[e.mode]).join(' + ');
      }
      return {
        key: sec, n: c.n, name: c.name, sub, total: st === 'entered' ? rs(total(sec)) : '—',
        isEntered: st === 'entered', isSkipped: st === 'skipped', isUntouched: st === 'untouched',
        onTap: () => openEntry(sec, 'list'),
        onSkip: () => set({ skipped: Object.assign({}, s.skipped, { [sec]: true }) }),
        onUnskip: () => set({ skipped: Object.assign({}, s.skipped, { [sec]: false }) }),
      };
    });
    const firstUntouched = ORDER.find(sec => d.stateOf(sec) === 'untouched');
    const lines = s.section ? bySection(s.section).map(lineFor) : [];
    const secTotal = s.section ? total(s.section) : 0;
    const dues7 = PARTIES.filter(p => p.type === 'supplier' && p.dueIn != null && p.dueIn <= 7).reduce((a, p) => a + partyBalance(p), 0);
    const deficit = d.expected - dues7;
    const aged = PARTIES.filter(p => p.type === 'customer' && p.ageDays > 30 && partyBalance(p) > 0);
    const agedSum = aged.reduce((a, p) => a + partyBalance(p), 0);
    const amountTyped = s.activeField === 'opening' || s.activeField === 'amount' ? s.typed : s.activeField === 'counted' ? s.counted : '';
    const isCustomerDetail = sel && sel.type === 'customer';
    const pendingCfg = s.pending ? SECTIONS[s.pending.section] : null;
    const closedRails = s.closed;
    const formB = cfg && cfg.form === 'B';
    const partyTargetName = s.party.trim() || (partyType === 'supplier' ? 'the supplier' : 'the customer');
    const dirCopy = !formB ? '' : cfg.dir === 'give' ? partyTargetName + ' will owe you this amount.' : cfg.dir === 'collect' ? 'Reduces what ' + partyTargetName + ' owes you.' : 'Reduces what you owe ' + partyTargetName + '.';
    const ringPct = d.ringDone / 10;
    const R = 26, C = 2 * Math.PI * R;

    const base = {
      screenId: sc, screenName: SCREEN_NAMES[sc] || sc,
      isTodayBar: ['T1', 'T2', 'T3', 'P1'].includes(sc), isBackBar: !['T1', 'T2', 'T3', 'P1', 'X1', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'S1', 'S2', 'S3', 'S5', 'S7', 'S8', 'S9', 'S9B', 'S10', 'S11', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5'].includes(sc),
      barTitle: isForm(sc) && cfg ? cfg.name : sc === 'T5' ? 'Day close · Tue 15 Jul' : sc === 'T6' ? 'Opening cash' : sc.startsWith('T1') && ['T11', 'T12', 'T13'].includes(sc) ? 'Cash check' : sc === 'T14' ? 'Tuesday 15 July' : sel ? sel.name : '',
      barSub: isForm(sc) && cfg ? (s.origin === 'list' ? 'Section ' + cfg.n + ' of 9 · reviewing' : s.origin === 'rail' ? 'Section ' + cfg.n + ' · quick entry' : s.origin === 'check' ? 'Adding from the cash check' : 'From ' + (sel ? sel.name : 'party')) : sc === 'T5' ? 'Sharma Kirana Store' : sc === 'T11' || sc === 'T12' || sc === 'T13' ? 'Step 9 of 9 · count what\'s in the box' : sc === 'T14' ? 'Day closed · 9:14 pm' : sel ? (sel.type === 'customer' ? 'Customer · ' + sel.phone : 'Supplier · ' + sel.phone) : sc === 'T6' ? 'Before the first sale' : '',
      pageTitle: sc === 'P1' ? 'Parties' : (s.closed ? 'Good evening, Rajanikanta' : 'Good morning, Rajanikanta'),
      greetingSub: sc === 'P1' ? 'Who owes you, and who you owe' : 'Tuesday 15 July',
      sX1: sc === 'X1', sT1: sc === 'T1', sT2: sc === 'T2', sT3: sc === 'T3', sT5: sc === 'T5', sT6: sc === 'T6',
      sFormA: sc === 'T7', sFormB: sc === 'T8', sFormC: sc === 'T9', sFormD: sc === 'T10',
      sT11: sc === 'T11', sT12: sc === 'T12', sT13: sc === 'T13', sT14: sc === 'T14', sP1: sc === 'P1', sP2: sc === 'P2' && isCustomerDetail, sP3: sc === 'P3' && sel && sel.type === 'supplier',
      isToday: sc === 'T1' || sc === 'T3', showNav: ['T1', 'T2', 'T3', 'P1'].includes(sc), showReportsTab: s.closed || sc !== 'T2',
      tabToday: ['T1', 'T2', 'T3'].includes(sc), tabParties: sc === 'P1',
      showKeypad: isForm(sc) || sc === 'T6' || sc === 'T11',
      badge: s.closed ? 'Closed' : d.allDone ? 'Ready' : 'Open', isClosed: s.closed, isOpen: !s.closed,
      syncText: s.pendingSync ? s.pendingSync + ' to sync' : 'All saved on phone', hasPending: s.pendingSync > 0,
      // ring
      ringDone: d.ringDone, ringDash: (C * ringPct).toFixed(1) + ' ' + C.toFixed(1), ringLabel: d.ringDone + ' of 10',
      ringCaption: s.closed ? 'Closed · counted ' + rs(counted == null ? d.expected : counted) : d.allDone ? 'All sections in · cash check unlocked' : 'Cash check not done yet',
      openingLine: 'Opening cash ' + rs(s.openingCash) + ' · carried from yesterday\'s count',
      openingCash: rs(s.openingCash),
      // metrics
      cashReceived: signed(d.cashReceived), cashPaid: neg(d.cashPaid), expected: rs(d.expected), netSales: rs(d.netSales),
      toCollect: rs(toCollect()), owed: rs(owed()),
      // alerts
      showDeficit: deficit < 0 && !s.closed, deficitText: rs(dues7) + ' due to Agarwal Traders on Thursday; expected balance is ' + rs(d.expected) + '.',
      showAging: aged.length > 0, agingText: aged.map(p => p.name).join(', ') + ' · ' + rs(agedSum) + ' unpaid for 31+ days.',
      // rails
      railCashSale: () => openEntry('cashSales', 'rail'), railUdharSale: () => openEntry('udharSales', 'rail'), railExpense: () => openEntry('expenses', 'rail'),
      railPurchase: () => openEntry('purchase', 'rail'), railCollection: () => openEntry('udharCollection', 'rail'), railPartyPay: () => openEntry('partyPayment', 'rail'),
      closedRails,
      continueClose: () => set({ screen: 'T5' }), goSummary: () => set({ screen: 'T14' }), goToday: () => set({ screen: todayScreen() }),
      goParties: () => set({ screen: 'P1' }), goReports: () => toast('Reports (R1) is outside this P0 set.'),
      goOpening: () => set({ screen: 'T6', typed: '', activeField: 'opening', pending: null }),
      correction: () => toast('Post a correction (T16) is a P1 screen.'),
      // T5
      rows, allDone: d.allDone, notAllDone: !d.allDone, doneCount: d.doneSections,
      nextLabel: firstUntouched ? 'Enter ' + SECTIONS[firstUntouched].name.toLowerCase() : 'Open cash check',
      nextAction: () => firstUntouched ? openEntry(firstUntouched, 'list') : set({ screen: 'T11', counted: '', countedCommitted: null, activeField: 'counted', checkNote: false }),
      openCheck: () => d.allDone && set({ screen: 'T11', counted: '', countedCommitted: null, activeField: 'counted', checkNote: false }),
      lockLine: firstUntouched ? 'Enter or skip ' + SECTIONS[firstUntouched].name.toLowerCase() + ' first' : 'Count the box',
      // forms
      sectionName: cfg ? cfg.name : '', sectionN: cfg ? cfg.n : '', originList: s.origin === 'list', originRail: s.origin !== 'list',
      primaryLabel: s.origin === 'list' ? 'Done' : 'Save', secondaryLabel: s.origin === 'list' ? 'Add a line' : 'Save & add another',
      lines, hasLines: lines.length > 0, noLines: lines.length === 0, lineCount: lines.length + (lines.length === 1 ? ' entry' : ' entries'), sectionTotal: rs(secTotal),
      amountText: amountTyped ? num(parseInt(amountTyped, 10)) : '0', amountEmpty: !amountTyped,
      wdCashText: s.wdCash ? num(parseInt(s.wdCash, 10)) : '0', wdUpiText: s.wdUpi ? num(parseInt(s.wdUpi, 10)) : '0',
      wdCashActive: s.activeField === 'wdCash', wdUpiActive: s.activeField === 'wdUpi',
      focusWdCash: () => set({ activeField: 'wdCash' }), focusWdUpi: () => set({ activeField: 'wdUpi' }),
      canSave: canSave(), cannotSave: !canSave(),
      onPrimary: () => (s.origin === 'list' ? done() : save(false)), onSecondary: () => (s.origin === 'list' ? (canSave() ? save(true) : null) : save(true)),
      onBack: back,
      k1: () => keyTap('1'), k2: () => keyTap('2'), k3: () => keyTap('3'), k4: () => keyTap('4'), k5: () => keyTap('5'), k6: () => keyTap('6'),
      k7: () => keyTap('7'), k8: () => keyTap('8'), k9: () => keyTap('9'), k0: () => keyTap('0'), k00: () => keyTap('00'), kBack: () => keyTap('back'),
      // Form B
      partyValue: s.party, onParty: ev => set({ party: ev.target.value, partyId: null }),
      partyMatches: matches.map(p => ({ id: p.id, name: p.name, phone: p.phone, balance: rs(partyBalance(p)), onPick: () => set({ party: p.name, partyId: p.id }) })),
      hasMatches: matches.length > 0, partyPhone: s.partyId ? partyById(s.partyId).phone : '', partyKnown: !!s.partyId, partyNew: !s.partyId && s.party.trim().length > 0,
      partyLabel: partyType === 'supplier' ? 'Supplier' : 'Customer', showMode: formB && cfg.dir !== 'give', dirCopy,
      // Form C
      labelValue: s.label, onLabel: ev => set({ label: ev.target.value }), labelPlaceholder: cfg && cfg.supplier ? 'What did you buy?' : 'What was it for?',
      isPurchase: !!(cfg && cfg.supplier), supplierValue: s.party, onSupplier: ev => set({ party: ev.target.value, partyId: null }),
      supplierMatches: cfg && cfg.supplier && s.party.trim() && !s.partyId ? PARTIES.filter(p => p.type === 'supplier' && p.name.toLowerCase().startsWith(s.party.trim().toLowerCase())).map(p => ({ id: p.id, name: p.name, onPick: () => set({ party: p.name, partyId: p.id }) })) : [],
      modeCash: s.mode === 'cash', modeUpi: s.mode === 'upi', modeOther: s.mode === 'other', modeUdhar: s.mode === 'udhar', modeStock: s.mode === 'stock',
      setCash: () => set({ mode: 'cash' }), setUpi: () => set({ mode: 'upi' }), setOther: () => set({ mode: 'other' }), setUdhar: () => set({ mode: 'udhar' }), setStock: () => set({ mode: 'stock' }),
      showDue: !!(cfg && cfg.supplier && s.mode === 'udhar'), showStockMode: !!(cfg && !cfg.supplier && cfg.form === 'C'),
      due7: s.dueChip === '7 days', due15: s.dueChip === '15 days', due30: s.dueChip === '30 days', duePick: s.dueChip === 'a chosen date',
      setDue7: () => set({ dueChip: s.dueChip === '7 days' ? null : '7 days' }), setDue15: () => set({ dueChip: s.dueChip === '15 days' ? null : '15 days' }), setDue30: () => set({ dueChip: s.dueChip === '30 days' ? null : '30 days' }), setDuePick: () => set({ dueChip: s.dueChip === 'a chosen date' ? null : 'a chosen date' }),
      // T6
      openingSave: () => {
        const v = parse(s.typed); if (!v) return;
        const pend = s.pending;
        set({ openingCash: v, dayStarted: true, pending: null, typed: '', screen: 'T1', activeField: 'amount' });
        queueSync();
        if (pend) openEntry(pend.section, pend.origin, pend.opts);
      },
      openingCan: parse(s.typed) > 0, openingCannot: parse(s.typed) <= 0,
      hasPending: !!pendingCfg, pendingLine: pendingCfg ? 'Then we\'ll go straight to ' + pendingCfg.name.toLowerCase() + '.' : '',
      // cash check
      checkNote: s.checkNote, expectedLines: [
        { label: 'Opening cash', amount: rs(s.openingCash), sign: '', neutral: true },
        { label: 'Cash sales', amount: signed(total('cashSales')), isIn: true },
        { label: 'Udhar collected in cash', amount: signed(cashOf('udharCollection')), isIn: true },
        { label: 'Cash purchase', amount: neg(cashOf('purchase')), isOut: true },
        { label: 'Cash expenses', amount: neg(cashOf('expenses')), isOut: true },
        { label: 'Party payment in cash', amount: neg(cashOf('partyPayment')), isOut: true },
        { label: 'Personal withdrawal', amount: neg(cashOf('withdrawal')), isOut: true },
      ],
      countedCan: parse(s.counted) > 0, countedCannot: parse(s.counted) <= 0,
      commitCount: () => { const v = parse(s.counted); if (!v) return; set({ countedCommitted: v, reason: null, checkNote: false, screen: v === d.expected ? 'T13' : 'T12' }); },
      countedText: counted == null ? '' : rs(counted), diffAbs: rs(Math.abs(diff)), diffShort: diff < 0, diffOver: diff > 0,
      diffQuestion: diff < 0 ? rs(Math.abs(diff)) + ' less than expected — what happened?' : rs(Math.abs(diff)) + ' more than expected — what happened?',
      reasons: (diff < 0 ? ['Gave change', 'Forgot an expense', 'Miscount', 'Don\'t know'] : ['Forgot a sale', 'Miscount', 'Don\'t know']).map(r => ({ label: r, on: s.reason === r, pick: () => set({ reason: r }) })),
      reasonPicked: !!s.reason, reasonMissing: !s.reason, reasonText: s.reason || '',
      addForgottenExpense: () => openEntry('expenses', 'check'), showAddExpense: s.reason === 'Forgot an expense',
      recount: () => set({ screen: 'T11', countedCommitted: null, activeField: 'counted' }),
      carryLine: 'Tomorrow\'s opening cash will be ' + rs(counted == null ? d.expected : counted) + ' — what you counted, not what was expected.',
      askClose: () => set({ confirm: 'close' }),
      // T14
      profit: rs(d.profit), purchaseTotal: neg(total('purchase')), expenseTotal: neg(total('expenses')), withdrawalTotal: neg(total('withdrawal')),
      hasWithdrawal: total('withdrawal') > 0, diffLine: diff === 0 ? 'Balanced' : (diff < 0 ? '− ' : '+ ') + rs(Math.abs(diff)) + (s.reason ? ' · ' + s.reason : ''), diffZero: diff === 0,
      // parties
      customers: PARTIES.filter(p => p.type === 'customer').map(p => ({ id: p.id, name: p.name, balance: rs(partyBalance(p)), last: p.lastDate === '15 Jul' ? 'Today' : 'Last ' + p.lastDate, aged: p.ageDays > 30, open: () => set({ screen: 'P2', selectedParty: p.id }) })),
      suppliers: PARTIES.filter(p => p.type === 'supplier').map(p => ({ id: p.id, name: p.name, balance: rs(partyBalance(p)), last: p.due ? 'Due ' + p.due : 'Last ' + p.lastDate, dueSoon: !!p.due, aged: !p.due && p.ageDays > 30, open: () => set({ screen: 'P3', selectedParty: p.id }) })),
      selName: sel ? sel.name : '', selPhone: sel ? sel.phone : '', selBalance: rs(selBalance),
      selAged: !!(sel && sel.type === 'customer' && sel.ageDays > 30), selAgedText: sel && sel.type === 'customer' ? 'Last paid ' + sel.lastDate + ' · 31+ days' : '',
      selDue: !!(sel && sel.due), selDueText: sel && sel.due ? 'Due ' + sel.due + ' · in ' + sel.dueIn + ' days' : sel && sel.type === 'supplier' ? 'No due date set · ' + sel.ageDays + ' days since purchase' : '',
      selDueOver: false, ledger,
      recordCollection: () => sel && openEntry('udharCollection', 'party', { partyId: sel.id, returnScreen: 'P2' }),
      recordSale: () => sel && openEntry('udharSales', 'party', { partyId: sel.id, returnScreen: 'P2' }),
      recordPayment: () => sel && openEntry('partyPayment', 'party', { partyId: sel.id, returnScreen: 'P3' }),
      // overlays
      confirmDiscard: s.confirm === 'discard', confirmDelete: !!(s.confirm && s.confirm.startsWith('delete:')), confirmClose: s.confirm === 'close', hasConfirm: !!s.confirm,
      confirmKeep: () => set({ confirm: null }),
      confirmDiscardGo: () => { set({ typed: '', label: '', wdCash: '', wdUpi: '' }); returnTo(); },
      confirmDeleteGo: () => { const id = parseInt(s.confirm.split(':')[1], 10); const wasCheck = s.countedCommitted != null; set({ entries: s.entries.filter(e => e.id !== id), confirm: null, countedCommitted: wasCheck ? null : s.countedCommitted }); queueSync(); },
      confirmCloseGo: () => { set({ closed: true, confirm: null, screen: 'T14' }); queueSync(); },
      toastText: s.toast || '', hasToast: !!s.toast,
      // onboarding
      obShop: s.onboarding.shop, onObShop: ev => set({ onboarding: Object.assign({}, s.onboarding, { shop: ev.target.value }) }),
      obOpening: s.onboarding.opening, onObOpening: ev => set({ onboarding: Object.assign({}, s.onboarding, { opening: ev.target.value.replace(/[^\d]/g, '') }) }),
      langOdia: s.onboarding.lang === 'Odia', langHindi: s.onboarding.lang === 'Hindi', langEnglish: s.onboarding.lang === 'English',
      setOdia: () => set({ onboarding: Object.assign({}, s.onboarding, { lang: 'Odia' }) }), setHindi: () => set({ onboarding: Object.assign({}, s.onboarding, { lang: 'Hindi' }) }), setEnglish: () => set({ onboarding: Object.assign({}, s.onboarding, { lang: 'English' }) }),
      sizeStd: s.onboarding.size === 'Standard', sizeLarge: s.onboarding.size === 'Large',
      setStd: () => set({ onboarding: Object.assign({}, s.onboarding, { size: 'Standard' }) }), setLarge: () => set({ onboarding: Object.assign({}, s.onboarding, { size: 'Large' }) }),
      obFinish: () => { const v = parse(s.onboarding.opening); if (v) set({ openingCash: v, dayStarted: true, closed: false, screen: 'T1' }); else set({ dayStarted: false, closed: false, screen: 'T2' }); },
      obCan: s.onboarding.shop.trim().length > 0,
      // auth / sign-in
      sA1: sc === 'A1', sA2: sc === 'A2', sA3: sc === 'A3', sA4: sc === 'A4', sA5: sc === 'A5',
      isAuthBar: ['A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'S1', 'S2', 'S3', 'S5', 'S7', 'S8', 'S9', 'S9B', 'S10', 'S11', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5'].includes(sc), showBackArrow: ['A3', 'A4', 'A5', 'A7', 'S1', 'S2', 'S3', 'S5', 'S7', 'S8', 'S9', 'S9B', 'S10', 'S11', 'Y1', 'Y3', 'Y4'].includes(sc),
      authBarTitle: sc === 'A3' ? 'Your phone number' : sc === 'A4' ? 'Verify your number' : sc === 'A5' ? 'OTP problems' : sc === 'A6' ? 'Session expired' : sc === 'A7' ? 'Change your number' : sc === 'A8' ? 'Log out?' : sc === 'S1' ? 'Settings' : sc === 'S2' ? 'Shop profile' : sc === 'S3' ? 'Owner profile' : sc === 'S5' ? 'Appearance & text size' : sc === 'S7' ? 'App lock' : sc === 'S8' ? 'Backup and data' : sc === 'S9' || sc === 'S9B' ? 'Delete account' : sc === 'S10' ? 'About' : sc === 'S11' ? 'Help and support' : sc === 'Y1' ? 'Offline and sync' : sc === 'Y3' ? 'Something went wrong' : sc === 'Y4' ? 'Notifications' : '',
      authBarSub: sc === 'A3' ? 'Step 1 of 2' : sc === 'A4' ? 'Step 2 of 2' : sc === 'A5' ? 'Reference · four states' :
        sc === 'A6' ? 'Your data is safe' :
        sc === 'A7' ? (recStage === 'decide' ? 'Two ways to fix this' : recStage === 'oldPhone' || recStage === 'oldOtp' ? 'Verify your old number · step 1 of 3' : recStage === 'newPhone' || recStage === 'newOtp' ? 'Add your new number · step 2 of 3' : recStage === 'done' ? 'All set · step 3 of 3' : "We'll help over WhatsApp") :
        sc === 'A8' ? 'Signing back in needs an SMS code' :
        sc === 'S1' ? 'Sharma Kirana Store' : sc === 'S2' ? 'Appears on your exports' : sc === 'S5' ? 'How the app looks and reads' :
        sc === 'S7' ? (lockStage === 'set' ? 'Set a 4-digit PIN' : lockStage === 'confirm' ? 'Confirm your PIN' : 'PIN is on') :
        sc === 'S8' ? 'Export for your accountant' : sc === 'S9' ? "What you'll lose" : sc === 'S9B' ? 'Type your shop name to confirm' : sc === 'S11' ? 'Answers in your own words' :
        sc === 'Y1' ? 'Reference · three states' : sc === 'Y4' ? (unreadCount > 0 ? unreadCount + ' unread' : 'All caught up') : '',
      goA2: () => set({ screen: 'A2' }),
      authPickOdia: () => authPickLang('Odia'), authPickHindi: () => authPickLang('Hindi'), authPickEnglish: () => authPickLang('English'),
      authPhoneDisplay: fmtPhone(s.auth.phone), authPhoneEmpty: s.auth.phone.length === 0, authPhoneFilled: s.auth.phone.length > 0,
      sendCode, sendCodeCan: s.auth.phone.length === 10,
      changeNumberLink, editPhone,
      otpBoxes: s.auth.otp.map((d, i) => ({ display: d, style: otpBoxStyle(!!d, !s.auth.verifying && i === s.auth.otp.indexOf('')) })),
      authVerifying: s.auth.verifying,
      resendCan: s.auth.resendSeconds === 0, resendCannot: s.auth.resendSeconds > 0, resendLabel: mmss(s.auth.resendSeconds), resendCode,
      authKeypadVisible: sc === 'A3' || (sc === 'A4' && !s.auth.verifying),
      ak1: () => authKeyTap('1'), ak2: () => authKeyTap('2'), ak3: () => authKeyTap('3'), ak4: () => authKeyTap('4'), ak5: () => authKeyTap('5'),
      ak6: () => authKeyTap('6'), ak7: () => authKeyTap('7'), ak8: () => authKeyTap('8'), ak9: () => authKeyTap('9'), ak0: () => authKeyTap('0'), akBack: () => authKeyTap('back'),
      problemStates: [
        { n: 1, hasCta: false,
          alertStyle: 'background:var(--tint-red);border:1px solid var(--rule-strong);border-radius:var(--radius-card);padding:var(--space-3) var(--space-4)',
          title: "That code doesn't match.", message: 'Check the 6 digits and try again. 3 attempts left.' },
        { n: 2, hasCta: true, ctaLabel: 'Send a new code', cta: () => toast('A new code was sent.'),
          alertStyle: 'background:var(--tint-gold);border:1px solid var(--rule-strong);border-radius:var(--radius-card);padding:var(--space-3) var(--space-4)',
          title: 'This code expired.', message: "Codes are valid for 10 minutes. We'll send a new one." },
        { n: 3, hasCta: false,
          alertStyle: 'background:var(--tint-red);border:1px solid var(--rule-strong);border-radius:var(--radius-card);padding:var(--space-3) var(--space-4)',
          title: 'Too many tries.', message: 'For your safety, try again in 10 minutes. 9:58 remaining.' },
        { n: 4, hasCta: true, ctaLabel: 'Message us on WhatsApp', cta: () => openWhatsApp('I am not receiving the OTP code.'),
          alertStyle: 'background:var(--tint-indigo);border:1px solid var(--rule);border-radius:var(--radius-card);padding:var(--space-3) var(--space-4)',
          title: 'Still no code?', message: 'This can happen with some networks after two resends. We can help over WhatsApp.' },
      ],
      // A6 session expired
      sA6: sc === 'A6', sessionReverify,
      // A7 number change / recovery
      sA7: sc === 'A7', recStage,
      recDecide: recStage === 'decide', recHandoff: recStage === 'handoff',
      recOldPhone: recStage === 'oldPhone', recOldOtp: recStage === 'oldOtp',
      recNewPhone: recStage === 'newPhone', recNewOtp: recStage === 'newOtp', recDone: recStage === 'done',
      recoveryPickHaveOld, recoveryPickNoOld,
      oldPhoneDisplay: fmtPhone(s.recovery.oldPhone), oldPhoneEmpty: s.recovery.oldPhone.length === 0, oldPhoneFilled: s.recovery.oldPhone.length > 0,
      newPhoneDisplay: fmtPhone(s.recovery.newPhone), newPhoneEmpty: s.recovery.newPhone.length === 0, newPhoneFilled: s.recovery.newPhone.length > 0,
      recoverySendOld, recoverySendOldCan: s.recovery.oldPhone.length === 10,
      recoverySendNew, recoverySendNewCan: s.recovery.newPhone.length === 10,
      oldOtpBoxes: s.recovery.oldOtp.map((d, i) => ({ display: d, style: otpBoxStyle(!!d, i === s.recovery.oldOtp.indexOf('')) })),
      newOtpBoxes: s.recovery.newOtp.map((d, i) => ({ display: d, style: otpBoxStyle(!!d, i === s.recovery.newOtp.indexOf('')) })),
      recResendCan: s.recovery.resendSeconds === 0, recResendCannot: s.recovery.resendSeconds > 0, recResendLabel: mmss(s.recovery.resendSeconds), recoveryResendCode,
      recoveryKeypadVisible: sc === 'A7' && ['oldPhone', 'newPhone', 'oldOtp', 'newOtp'].includes(recStage),
      rk1: () => recoveryKeyTap('1'), rk2: () => recoveryKeyTap('2'), rk3: () => recoveryKeyTap('3'), rk4: () => recoveryKeyTap('4'), rk5: () => recoveryKeyTap('5'),
      rk6: () => recoveryKeyTap('6'), rk7: () => recoveryKeyTap('7'), rk8: () => recoveryKeyTap('8'), rk9: () => recoveryKeyTap('9'), rk0: () => recoveryKeyTap('0'), rkBack: () => recoveryKeyTap('back'),
      recoveryFinish, recoveryWhatsapp,
      recoveryPhoneHelp: recStage === 'oldPhone' ? "We'll send a code to confirm it's still yours." : "We'll send a code to this number to finish the switch.",
      // A8 logout
      sA8: sc === 'A8', logoutCancel, logoutConfirm,
      logoutSyncLine: s.pendingSync > 0 ? s.pendingSync + ' entr' + (s.pendingSync === 1 ? 'y' : 'ies') + " not yet synced — signing out now will lose " + (s.pendingSync === 1 ? 'it' : 'them') + '.' : 'Everything is saved. Nothing will be lost.',
      logoutHasPending: s.pendingSync > 0, logoutNoPending: s.pendingSync === 0,
      // S7 app lock
      sS7: sc === 'S7', lockStage,
      lockSet: lockStage === 'set', lockConfirm: lockStage === 'confirm', lockDoneStage: lockStage === 'done',
      lockPinDots: Array.from({ length: 4 }, (_, i) => ({ filledColor: i < s.lock.pin.length ? 'var(--brand)' : 'transparent' })),
      lockConfirmDots: Array.from({ length: 4 }, (_, i) => ({ filledColor: i < s.lock.confirmPin.length ? 'var(--brand)' : 'transparent' })),
      lockError: s.lock.error, lockDone, lockSkip,
      lockKeypadVisible: sc === 'S7' && (lockStage === 'set' || lockStage === 'confirm'),
      lk1: () => lockKeyTap('1'), lk2: () => lockKeyTap('2'), lk3: () => lockKeyTap('3'), lk4: () => lockKeyTap('4'), lk5: () => lockKeyTap('5'),
      lk6: () => lockKeyTap('6'), lk7: () => lockKeyTap('7'), lk8: () => lockKeyTap('8'), lk9: () => lockKeyTap('9'), lk0: () => lockKeyTap('0'), lkBack: () => lockKeyTap('back'),
      // S1 settings index / S2 shop / S3 owner / S5 appearance
      sS1: sc === 'S1', sS2: sc === 'S2', sS3: sc === 'S3', sS5: sc === 'S5',
      settingsGroups: [
        { title: 'SHOP', rows: [
            { label: 'Shop profile', value: s.onboarding.shop, hasValue: true, go: goS2 },
            { label: 'Owner profile', value: s.owner.name, hasValue: true, go: goS3 },
          ] },
        { title: 'APPEARANCE', rows: [
            { label: 'Language', value: langScript(s.onboarding.lang), hasValue: true, go: goS3 },
            { label: 'Colours & text size', value: s.appearance === 'focus' ? 'Focus' : 'Comfort', hasValue: true, go: goS5 },
          ] },
        { title: 'NOTIFICATIONS', rows: [
            { label: 'Udhar reminders', value: 'On', hasValue: true, go: stubToast('Notification settings') },
          ] },
        { title: 'SECURITY', rows: [
            { label: 'App lock', value: s.lock.stage === 'done' ? 'On' : 'Off', hasValue: true, go: goAppLock },
            { label: 'Log out', value: '', hasValue: false, go: goToLogout },
          ] },
        { title: 'DATA', rows: [
            { label: 'Export data', value: '', hasValue: false, go: goS8 },
            { label: 'Delete account', value: '', hasValue: false, go: goS9 },
          ] },
        { title: 'HELP', rows: [
            { label: 'Help and support', value: '', hasValue: false, go: goS11 },
          ] },
        { title: 'ABOUT', rows: [
            { label: 'App version', value: 'v1.0.0', hasValue: true, go: goS10 },
          ] },
      ],
      backupLastLine: s.lastBackup,
      rangeMonthStyle: chip(s.backup.range === 'This month'), range3Style: chip(s.backup.range === 'Last 3 months'), rangeFYStyle: chip(s.backup.range === 'This financial year'), rangeCustomStyle: chip(s.backup.range === 'Custom range'),
      setRangeMonth, setRange3, setRangeFY, setRangeCustom,
      formatCsvStyle: chip(s.backup.format === 'CSV'), formatPdfStyle: chip(s.backup.format === 'PDF'), setFormatCsv, setFormatPdf,
      deliveryWhatsappStyle: chip(s.backup.delivery === 'whatsapp'), deliverySaveStyle: chip(s.backup.delivery === 'save'), setDeliveryWhatsapp, setDeliverySave,
      doExport, sS8: sc === 'S8',
      sS9: sc === 'S9', sS9B: sc === 'S9B', goExportFromDelete, goS9, goS9B, goS1,
      deleteConfirmText: s.deleteConfirmText, onDeleteConfirmText,
      deleteConfirmMatches: s.deleteConfirmText.trim().length > 0 && s.deleteConfirmText.trim().toLowerCase() === s.onboarding.shop.trim().toLowerCase(),
      deleteAccountGo,
      sS10: sc === 'S10', aboutPrivacy, aboutTerms, aboutLicences,
      sS11: sc === 'S11', helpWhatsapp,
      faqs: FAQS.map((f, i) => ({ q: f.q, a: f.a, open: s.helpOpen === i, toggle: toggleFaq(i), chevStyle: s.helpOpen === i ? 'transform:rotate(90deg);transition:transform 150ms' : 'transform:rotate(0deg);transition:transform 150ms' })),
      shopAddress: s.shop.address, onShopAddress, shopGstin: s.shop.gstin, onShopGstin,
      setShopKirana, setShopPharmacy, setShopHardware, setShopOther,
      saveShop,
      ownerName: s.owner.name, onOwnerName, saveOwner, changeNumberFromSettings,
      setAppearanceComfort, setAppearanceFocus,
      // Y1-Y5
      sY1: sc === 'Y1', sY2: sc === 'Y2', sY3: sc === 'Y3', sY4: sc === 'Y4', sY5: sc === 'Y5',
      syncPendingItems: s.entries.slice(-3).reverse().map(e => ({ label: SECTIONS[e.section].name + ' · ' + rs(e.amount), time: 'Today' })),
      syncPendingCount: Math.min(s.entries.length, 3),
      goY4, hasUnread: unreadCount > 0, unreadCount,
      hasNotifications: s.notifications.length > 0, noNotifications: s.notifications.length === 0,
      notifications: s.notifications.map(n => ({ text: n.text, time: n.time, weight: n.read ? 500 : 700, markRead: markNotifRead(n.id), dotStyle: `width:8px;height:8px;border-radius:50%;margin-top:6px;flex:none;background:${n.read ? 'transparent' : 'var(--brand)'}` })),
      clearNotifications, tryAgain, reportProblem, allowNotif, notNowNotif, goUpdate,
    };

    const readyClose = sc === 'T13' || !!s.reason;
    const filled = (enabled) => `min-height:var(--touch-min);width:100%;background:${enabled ? 'var(--action)' : 'var(--surface-raised)'};color:${enabled ? 'var(--on-action)' : 'var(--text-disabled)'};border:none;border-radius:var(--radius-control);font-size:var(--body-size);font-weight:600;cursor:${enabled ? 'pointer' : 'not-allowed'};display:flex;align-items:center;justify-content:center`;
    const canSaveNow = canSave();
    const extra = {
      isForm: isForm(sc),
      showAmount: base.showKeypad && !base.sFormD,
      hasAmount: !base.amountEmpty,
      amountLabel: sc === 'T6' ? 'Opening cash' : sc === 'T11' ? 'What you counted' : 'Amount',
      showTotalBar: isForm(sc),
      sectionNameLower: cfg ? cfg.name.toLowerCase() : '',
      railStyle: `flex-direction:column;gap:6px;min-height:88px;background:var(--surface-card);border:1px solid var(--rule);border-radius:var(--radius-card);box-shadow:var(--elevation-card);display:flex;align-items:center;justify-content:center;color:${closedRails ? 'var(--text-disabled)' : 'var(--text-primary)'};font-size:14px;font-weight:500;cursor:${closedRails ? 'not-allowed' : 'pointer'};opacity:${closedRails ? .55 : 1}`,
      diffCardStyle: `background:${diff < 0 ? 'var(--tint-red)' : 'var(--tint-gold)'};border:1px solid var(--rule-strong);border-radius:var(--radius-card);padding:var(--space-4)`,
      modeCashStyle: chip(s.mode === 'cash'), modeUpiStyle: chip(s.mode === 'upi'), modeOtherStyle: chip(s.mode === 'other'), modeUdharStyle: chip(s.mode === 'udhar'), modeStockStyle: chip(s.mode === 'stock'),
      due7Style: chip(s.dueChip === '7 days', true), due15Style: chip(s.dueChip === '15 days', true), due30Style: chip(s.dueChip === '30 days', true), duePickStyle: chip(s.dueChip === 'a chosen date', true),
      langOdiaStyle: chip(s.onboarding.lang === 'Odia'), langHindiStyle: chip(s.onboarding.lang === 'Hindi'), langEnglishStyle: chip(s.onboarding.lang === 'English'),
      sizeStdStyle: chip(s.onboarding.size === 'Standard'), sizeLargeStyle: chip(s.onboarding.size === 'Large'),
      nonCashGridStyle: `display:grid;grid-template-columns:repeat(${cfg && !cfg.supplier && cfg.form === 'C' ? 4 : 3},1fr);gap:6px`,
      wdCashBoxStyle: `display:flex;flex-direction:column;gap:4px;min-height:64px;padding:var(--space-2) var(--space-3);border:2px solid ${s.activeField === 'wdCash' ? 'var(--focus-ring)' : 'var(--rule)'};border-radius:var(--radius-control);background:var(--surface-card);text-align:left;cursor:pointer`,
      wdUpiBoxStyle: `display:flex;flex-direction:column;gap:4px;min-height:64px;padding:var(--space-2) var(--space-3);border:2px solid ${s.activeField === 'wdUpi' ? 'var(--focus-ring)' : 'var(--rule)'};border-radius:var(--radius-control);background:var(--surface-card);text-align:left;cursor:pointer`,
      primaryBtnStyle: filled(canSaveNow),
      secondaryBtnStyle: `min-height:var(--touch-min);background:var(--surface-card);color:${canSaveNow ? 'var(--text-primary)' : 'var(--text-disabled)'};border:1px solid ${canSaveNow ? 'var(--text-muted)' : 'var(--rule)'};border-radius:var(--radius-control);font-size:var(--body-size);font-weight:500;cursor:${canSaveNow ? 'pointer' : 'not-allowed'};display:flex;align-items:center;justify-content:center`,
      openingBtnStyle: filled(parse(s.typed) > 0),
      countBtnStyle: filled(parse(s.counted) > 0),
      closeBtnStyle: filled(readyClose),
      closeAction: () => readyClose && askCloseFn(),
      doneBtnStyle: filled(true),
      obFinishStyle: filled(!!s.onboarding.shop.trim()), obCannot: !s.onboarding.shop.trim(),
      selBalanceLabel: sel ? (sel.type === 'customer' ? 'They owe you' : 'You owe them') : '',
      sDetail: base.sP2 || base.sP3,
      diffNonZero: diff !== 0,
      showRails: ['T1', 'T2', 'T3'].includes(sc),
      navTodayStyle: `display:flex;flex-direction:column;align-items:center;gap:2px;min-height:var(--touch-min);padding:var(--space-2) 0;background:transparent;border:none;color:${base.tabToday ? 'var(--brand)' : 'var(--text-secondary)'};font-size:12px;font-weight:${base.tabToday ? 600 : 500};cursor:pointer`,
      navPartiesStyle: `display:flex;flex-direction:column;align-items:center;gap:2px;min-height:var(--touch-min);padding:var(--space-2) 0;background:transparent;border:none;color:${base.tabParties ? 'var(--brand)' : 'var(--text-secondary)'};font-size:12px;font-weight:${base.tabParties ? 600 : 500};cursor:pointer`,
      navReportsStyle: `display:flex;flex-direction:column;align-items:center;gap:2px;min-height:var(--touch-min);padding:var(--space-2) 0;background:transparent;border:none;color:var(--text-secondary);font-size:12px;font-weight:500;cursor:pointer`,
      navCols: base.showReportsTab ? '1fr 1fr 1fr' : '1fr 1fr',
    };
    base.reasons = base.reasons.map(r => Object.assign({}, r, { style: chip(r.on, true) }));
    base.problemStates = base.problemStates.map(p => Object.assign({}, p, { ctaStyle: p.hasCta ? filled(true) : '' }));
    extra.sendCodeBtnStyle = filled(base.sendCodeCan);
    extra.recoverySendOldBtnStyle = filled(base.recoverySendOldCan);
    extra.recoverySendNewBtnStyle = filled(base.recoverySendNewCan);
    const card = active => `display:flex;flex-direction:column;align-items:center;gap:var(--space-2);padding:var(--space-3);border:2px solid ${active ? 'var(--action)' : 'var(--rule)'};border-radius:var(--radius-card);background:var(--surface-card);cursor:pointer;width:100%;box-sizing:border-box`;
    extra.shopKiranaStyle = chip(s.shop.type === 'Kirana / general');
    extra.shopPharmacyStyle = chip(s.shop.type === 'Pharmacy');
    extra.shopHardwareStyle = chip(s.shop.type === 'Hardware');
    extra.shopOtherStyle = chip(s.shop.type === 'Other');
    extra.appearanceComfortCardStyle = card(s.appearance === 'comfort');
    extra.appearanceFocusCardStyle = card(s.appearance === 'focus');
    extra.sizeLargeCardStyle = card(s.onboarding.size === 'Large');
    extra.sizeStdCardStyle = card(s.onboarding.size === 'Standard');
    extra.deleteBtnStyle = base.deleteConfirmMatches
      ? 'min-height:var(--touch-min);width:100%;background:var(--tint-red);color:var(--text-primary);border:none;border-radius:var(--radius-control);font-size:var(--body-size);font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center'
      : 'min-height:var(--touch-min);width:100%;background:var(--surface-raised);color:var(--text-disabled);border:none;border-radius:var(--radius-control);font-size:var(--body-size);font-weight:700;cursor:not-allowed;display:flex;align-items:center;justify-content:center';
    return Object.assign(base, extra);
  };

  window.SwaftoStore = {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    vals, jump, reset() { s = fresh(); emit(); },
    get screen() { return s.screen; },
    SCREEN_ORDER, SCREEN_NAMES,
  };
})();
