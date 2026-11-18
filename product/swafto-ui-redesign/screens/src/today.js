/* AREA: Today (T1, T2, T3 and the states around them). This file is the EXEMPLAR for the other area specs.
   Rules: copy by literal key K.t(KEY) (build.mjs embeds it verbatim from strings.ts); a string that does not exist is K.N(the English text).
   Money is integer paise through K.M. Never colour alone: every status has an icon and words. */
(function () {
  var t = K.t, M = K.M;
  var D18 = '18 ' + '';   /* date placeholder filled below, month name comes from t1.month.11 */
  function d18() { return '18 ' + t('t1.month.11'); }
  function homeTop(chip) { return K.top({ shop: K.shop, date: K.date(), right: chip || K.chip('ok') }); }
  function lower() { /* the rows that used to be three loose links at the foot of Today in v1 */
    return K.lrow('chat', t('c1.title')) + K.lrow('shield', t('t1.privacy')) + K.lrow('user', t('s1.title'));
  }
  var BOX = { box: 1200000 + 935000 - 290000, opening: 1200000, cashIn: 935000, cashOut: 290000 };

  SPEC.area = {
    title: 'Today',
    intro: 'Mitra, sale-first Today. Four pinned tiles under the header, one hero ("In the box now"), two facts, and a close card that is tonal (not the loudest thing) until closing time. Every state of the Today route: normal, first day, stale open day, phone date behind, closed day (and wrong-date closed), offline or waiting, loading, error, the More sheet, and the derived cash observation.',
    screens: [
      {
        id: 'today-normal', route: 'T1', title: 'Today: normal open day', flag: 'CHG',
        purpose: 'The front door. Record the next sale with one tap, see what is in the box, see who owes, continue closing when ready.',
        primary: 'Sale tile (solid teal, first, top-left). Continue day close is tonal until the shop\'s own closing time.',
        taps: 'Cash sale: Sale tile, 2 to 3 digits, Add = 4 to 5 taps (target under 10 s; v1 device pass counted 5 actions with a scroll, here no scroll). Owes-lookup: tap "Udhar to collect" figure (1) then person (2) = 2 taps (target under 10 s).',
        rules: 'Derived figures only (no stored totals). Out-flow printed with a minus sign. Sync chip never red.',
        notes: 'Tiles are pinned above the figures and the scroll position is restored after every form (USABILITY items 1, 2, 3). Settings, Ask and Privacy are rows at the foot of the scroll with icon and chevron (v1 had loose links). OPEN/READY pill from v1 is dropped: the close card carries the state in words.',
        body: function () {
          return homeTop() + K.scroll(K.tiles(), K.hero(BOX), K.facts(1472000, 2150000), K.closecard(4, 10, true), lower()) + K.tabs('today');
        }
      },
      {
        id: 'today-first', route: 'T2', title: 'Today: first day, nothing entered', flag: 'CHG',
        purpose: 'First morning of a new book. The only honest thing to ask for is the opening cash.',
        primary: 'Enter opening cash (goes to T6).',
        taps: 'Setup task, once: Enter opening cash, digits, Save = 3 taps plus digits.',
        rules: 'No inference: the app never suggests a figure; it is carried from his own count from tomorrow.',
        notes: 'Entry tiles stay hidden until the opening cash exists (as built: T2 shows only the opening step). Proposal for review: show the four tiles greyed with a dashed edge so he sees what is coming. Not done here, it changes T2 behaviour.',
        body: function () {
          return homeTop() + K.scroll(
            '<section class="hero"><div class="lbl"><span class="hi">' + K.ico('box', 28) + '</span><span>' + t('t2.title') + '</span></div><div class="fig"><b>' + t('t2.notStarted') + '</b></div>' +
            '<div class="ln"><span class="k">' + t('t2.prompt') + '</span></div><div class="ln"><span class="k">' + t('t2.carried') + '</span></div></section>' +
            K.stack(K.primary(t('t2.enterOpening'), '', 'coin')) + K.empty('box', t('t2.empty'))
          ) + K.tabs('today');
        }
      },
      {
        id: 'today-stale', route: 'T1', title: 'Today: stale open day (book is for yesterday)', flag: 'CHG',
        purpose: 'The open book belongs to an earlier day. Close it before today can start. Calm, not an alarm.',
        primary: 'Close it now (opens the day-close list for the old day).',
        taps: 'Close it now = 1 tap to reach T5; day-close target under 3 min applies from there.',
        rules: 'Frozen/ordered days: entries are refused until the old day is closed (refusal.dayStale). A compact banner replaces v1\'s large card, so the tiles do not drop a fifth of the screen.',
        notes: 'Tiles are shown greyed with a dashed edge and "aria-disabled". Tapping one shows the refusal banner (see below). Status is icon + words, never colour only.',
        body: function () {
          return homeTop() + K.scroll(
            K.banner('', 'clock', t('t1.stale.body', { date: d18() }), t('t1.stale.action')),
            K.tiles(true), K.hero(BOX), K.facts(1472000, 2150000), K.closecard(4, 10, false, t('t1.stale.action'))
          ) + K.tabs('today') + K.refbanner(t('refusal.titleNotDone'), t('refusal.dayStale'), true);
        }
      },
      {
        id: 'today-future', route: 'T1', title: 'Today: phone date is behind the book', flag: 'CHG',
        purpose: 'The phone clock is earlier than the book\'s date. Entries pause; nothing is lost; the fix is outside the app.',
        primary: 'Open date settings (NEW button; v1 offered none, USABILITY known issue QA-06).',
        taps: '1 tap to the Android date settings, then Back.',
        rules: 'Never auto-correct the date or the book (no inference). The book stays as recorded.',
        notes: 'Needs a host intent to open the phone\'s date and time settings (frontend build item, not a copy-only change; flagged). Compact banner instead of the four-line white card; at 2.0x the text wraps but the tiles remain reachable below.',
        body: function () {
          return homeTop() + K.scroll(
            K.banner('', 'calendar', t('t1.future.body', { date: '20 ' + t('t1.month.11') })),
            K.stack(K.primary(K.N('Open date settings'), 'tonal', 'calendar')),
            K.tiles(true), K.hero(BOX), K.facts(1472000, 2150000)
          ) + K.tabs('today');
        }
      },
      {
        id: 'today-closed', route: 'T3', title: 'Today: closed day (frozen)', flag: 'CHG',
        purpose: 'Today is closed and frozen (D7). Show the result; the only way to change it is a dated correction.',
        primary: 'Post a correction (opens T16). Secondary: See the day summary (T14).',
        taps: 'Correction: 1 tap to the picker, then pick the entry, amount, Add.',
        rules: 'D7: no entry rail; the tiles are replaced by a lock banner. Append-only: a correction is a new entry referencing the original.',
        notes: 'The greyed tiles of v1 were silent; here the banner says why (t3.banner) and offers the one action that exists.',
        body: function () {
          return homeTop() + K.scroll(
            K.banner('info', 'lock', t('t3.banner')),
            K.stack(K.primary(t('t3.correction'), '', 'pencil'), K.primary(t('t3.summary'), 'outline', 'receipt')),
            K.hero(BOX), K.facts(1472000, 2150000)
          ) + K.tabs('today');
        }
      },
      {
        id: 'today-closed-wrongdate', route: 'T3', title: 'Today: closed while the phone date was wrong', flag: 'CHG',
        purpose: 'Today\'s book was closed earlier under a wrong phone date. New entries resume tomorrow. Keeps the record as it was.',
        primary: 'See the day summary. No correction is offered for the wrong-date day beyond the normal one.',
        taps: '1 tap to the summary.',
        rules: 'C-19 residual: the day is kept as recorded; nothing is rewritten.',
        notes: 'Same frame as the closed day with the longer sentence (t3.wrongDate.body).',
        body: function () {
          return homeTop() + K.scroll(
            K.banner('info', 'lock', t('t3.wrongDate.body', { date: '19 ' + t('t1.month.11') })),
            K.stack(K.primary(t('t3.summary'), 'outline', 'receipt')), K.hero(BOX), K.facts(1472000, 2150000)
          ) + K.tabs('today');
        }
      },
      {
        id: 'today-offline', route: 'T1', title: 'Today: offline, entries waiting to sync', flag: 'CHG',
        purpose: 'No network. The app works fully; he needs to know the entries are safe on the phone and not yet on the server.',
        primary: 'Keep selling (Sale tile). The chip is information; tapping it expands the explanation.',
        taps: 'Same as normal: no extra step because of the network.',
        rules: 'Chip is amber with a clock, words "waiting - safe on phone", never red. It appears in the header of every screen, not as grey text mid-page (USABILITY item 8).',
        notes: 'Rows the server refused are parked and shown as a separate line (t1.parked) with a contact route. The queue drains by itself after signal returns (one drain was observed in the usability pass, USABILITY.md U-72; a single observation, not a benchmark).',
        body: function () {
          return homeTop(K.chip('wait', 3)) + K.scroll(
            K.banner('info', 'cloudoff', t('sync.waitingLong', { n: 3 })),
            K.banner('err', 'warn', t('t1.parked', { n: 1 })),
            K.tiles(), K.hero(BOX), K.facts(1472000, 2150000), K.closecard(4, 10, true)
          ) + K.tabs('today');
        }
      },
      {
        id: 'today-loading', route: 'T1', title: 'Today: loading the book', flag: 'EXISTS',
        purpose: 'The day is being opened from the phone\'s own database. Placeholder rows, no spinner on save.',
        primary: 'None; waits. Shown for well under a second normally.',
        taps: 'n/a',
        rules: 'Skeleton shapes match the tiles and hero so nothing jumps when the figures arrive.',
        notes: 'Copy: common.loading is the accessible name only; no visible text.',
        body: function () {
          return homeTop(K.chip('ok')) + '<div class="scroll" aria-busy="true" aria-label="' + t('common.loading') + '"><section class="tiles"><i class="tile" style="background:var(--rule)"></i><i class="tile" style="background:var(--rule)"></i><i class="tile" style="background:var(--rule)"></i><i class="tile" style="background:var(--rule)"></i></section>' + K.skel(3) + '</div>' + K.tabs('today');
        }
      },
      {
        id: 'today-error', route: 'T1', title: 'Today: could not open the book', flag: 'EXISTS',
        purpose: 'The book failed to open. Say plainly that nothing is lost and give one next step.',
        primary: 'Try again (common.retry).',
        taps: '1 tap.',
        rules: 'Calm words; the ledger is in SQLite and untouched. Error uses icon + words + an outlined edge; the edge colour is not the only cue.',
        notes: 'If retry fails twice the error boundary screen is the next stop (see system area).',
        body: function () {
          return homeTop(K.chip('ok')) + K.scroll(K.banner('err', 'warn', t('common.error'), t('common.retry')), K.empty('refresh', t('common.error'), t('common.retry'), 'refresh')) + K.tabs('today');
        }
      },
      {
        id: 'today-more', route: 'T1', title: 'Today: More sheet (Purchase, Pay supplier, Withdrawal, Return)', flag: 'CHG',
        purpose: 'The less frequent entries, kept off the four pinned tiles. Opens over Today; closes with Back or a tap outside.',
        primary: 'One of the rows. Each opens its own form.',
        taps: 'Purchase or Pay supplier: More, row = 2 taps to the form.',
        rules: 'Each row names the real action (accessible name = visible word; fixes WCAG 2.5.3 W5). Withdrawal sits outside profit (D3).',
        notes: 'Return or exchange lives here too (reached from the Sale form in v1 as a caption that looked like text). It stays reachable from the Sale form as a proper button.',
        body: function () {
          var rows = K.lrow('receipt', t('act.purchase')) + K.lrow('tray', t('t8.title.pay')) + K.lrow('up', t('section.withdrawal')) + K.lrow('swap', K.N('Return')) + K.lrow('pencil', K.N('Adjustment', 'cash adjustment from a fixed list'));
          return homeTop() + K.scroll(K.tiles(), K.hero(BOX)) + K.tabs('today') + K.sheet(t('t1.more'), rows);
        }
      },
      {
        id: 'today-obs', route: 'T1', title: 'Today: more cash went out than came in (derived observation)', flag: 'EXISTS',
        purpose: 'A derived observation, not an instruction: cash paid exceeds cash received. Asks him to look, never to act.',
        primary: 'None. Informational; the tiles stay first.',
        taps: 'n/a',
        rules: 'CLAUDE.md "No inference in data entry": this reads two engine figures already on screen; it guesses no input and gives no command.',
        notes: 'Appears below the hero. Wording is the existing t1.obs.title / body.',
        body: function () {
          return homeTop() + K.scroll(K.tiles(), K.hero({ box: 800000 + 100000 - 400000, opening: 800000, cashIn: 100000, cashOut: 400000 }), K.banner('info', 'info', t('t1.obs.title') + ' ' + t('t1.obs.body')), K.facts(100000, 0), K.closecard(2, 10, true)) + K.tabs('today');
        }
      }
    ]
  };
})();
