/* AREA: System (cross-cutting states no single screen owns): crash screen, refusal banner and catalogue, sync chip states, hardware Back, generic list states, 2.0x.
   Copy by literal key K.t(KEY); a string that does not exist is K.N(English). Money is integer paise through K.M. Never colour alone. */
(function () {
  var t = K.t, M = K.M;
  function top(chip) { return K.top({ shop: K.shop, date: K.date(), right: chip || K.chip('ok') }); }
  /* run fn with the page language switched (crash screen when the language is unknown shows all three at once) */
  function inLang(l, fn) { var o = K.state.lang; K.state.lang = l; try { return fn(); } finally { K.state.lang = o; } }
  function crashBlock(title, body) { return '<div style="margin-bottom:16px"><h2 style="font-size:1.235em;line-height:1.4">' + title + '</h2><p style="line-height:1.5;margin-top:4px">' + body + '</p></div>'; }
  function crashScreen(inner, btn) {
    return '<div class="scroll" style="display:flex;flex-direction:column;justify-content:center;padding:16px" data-testid="crash"><div style="width:88px;height:88px;border-radius:50%;background:var(--t1bg);color:var(--t1ic);display:flex;align-items:center;justify-content:center;margin:0 0 16px">' + K.ico('shield', 44) + '</div>' + inner + K.stack(btn) + '</div>';
  }
  /* the sale form behind a refusal: total line, segment, Add, keypad (amount is 0 so the Rs 0 refusal is a real one) */
  function saleForm() {
    return K.top({ title: t('act.sale'), back: true, right: K.chip('ok') }) +
      K.scroll('<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;font-size:1.3em"><span>' + t('act.sale') + '</span>' + M(0) + '</div>',
        K.seg([t('section.cash_sales'), t('section.upi_sales'), t('section.udhar_sales')], 0)) +
      K.addbar(t('common.add'), 0) + K.keypad();
  }
  function listTop() { return K.top({ title: t('nav.parties'), right: K.chip('ok') }); }
  /* legend rows: heading shows which of the two headings the real banner uses */
  function lr(tag, text) { return '<div style="margin:6px 12px;padding:8px 12px;border:2px solid var(--rule);border-radius:16px;background:var(--surface);line-height:1.4"><small style="display:block;color:var(--muted);font-weight:700">' + tag + '</small>' + text + '</div>'; }
  function sv(text) { return lr(t('refusal.title'), text); }
  function ns(text) { return lr(t('refusal.titleNotDone'), text); }
  function grp(name) { return '<div class="sec">' + name + '</div>'; }

  SPEC.area = {
    title: 'System',
    intro: 'Cross-cutting states no single screen owns: the crash screen, the refusal banner and every refusal sentence, the sync chip states, the hardware Back from Today, the generic list states every list shares, and the day close at 2.0x text size. The Locked app cover is drawn in the Settings area. No string exists in the app for an app update or low storage, so neither is drawn (not invented).',
    screens: [
      {
        id: 'system-crash-known', route: 'overlay', title: 'Crash screen: language known', flag: 'EXISTS',
        purpose: 'An uncaught render error. Say calmly that the entries are safe and give one way forward. Shown in the shop\'s own language when the app can still tell which it is.',
        primary: 'Restart (one button; remounts the app under a fresh key and reopens the database, no native restart).',
        taps: '1 tap.',
        rules: 'Full screen, no tabs, no header, no technical detail: the error class name only goes to a redacting sink and is never shown. "Your entries are safe" is true: the ledger is in SQLite and nothing on this screen touches it.',
        notes: 'As built (ErrorBoundary.tsx): title, body, one accent button, vertically centred. Only the pictogram disc is added in Mitra. If Restart fails twice the same screen returns; nothing else is offered.',
        body: function () {
          return crashScreen(crashBlock(t('crash.title'), t('crash.body')), K.primary(t('crash.restart'), '', 'refresh'));
        }
      },
      {
        id: 'system-crash-unknown', route: 'overlay', title: 'Crash screen: language unknown (all three stacked)', flag: 'EXISTS',
        purpose: 'The failure was building the app itself, so the shop\'s language cannot be read. Show English, Hindi and Odia together rather than guess one.',
        primary: 'Restart (one button whose label joins the three words with a slash).',
        taps: '1 tap.',
        rules: 'No guessing a language. One button, not three. Order as built: English, Hindi, Odia.',
        notes: 'Always three blocks in that order, whatever the language toggle on this page says (the other frames follow the toggle). At 2.0x the blocks scroll; the button is below them, so it sits under the fold on a small phone: proposal to pin the Restart button to the bottom (not done, changes the layout).',
        review: 'Proposal: pin Restart to the bottom of the crash screen so it stays reachable at 2.0x when three languages are stacked.',
        body: function () {
          var blocks = inLang('en', function () { return crashBlock(t('crash.title'), t('crash.body')); }) +
            inLang('hi', function () { return crashBlock(t('crash.title'), t('crash.body')); }) +
            inLang('od', function () { return crashBlock(t('crash.title'), t('crash.body')); });
          var label = inLang('en', function () { return t('crash.restart'); }) + ' / ' + inLang('hi', function () { return t('crash.restart'); }) + ' / ' + inLang('od', function () { return t('crash.restart'); });
          return crashScreen(blocks, K.primary(label, '', 'refresh'));
        }
      },
      {
        id: 'system-refusal-save', route: 'overlay', title: 'Refusal banner: "Not saved" over a form', flag: 'CHG',
        purpose: 'A write was refused (here a Rs 0 sale). The banner is drawn once over whichever screen is up, so no screen can forget to say it.',
        primary: 'None needed. Tap the banner to dismiss; the next tap on the form dismisses it too.',
        taps: 'Add (1 tap) shows it; nothing to do to continue.',
        rules: 'Shown only after a tap, never before one, and cleared when the form closes so it never leaks into the next form. Headed "Not saved" because a save was attempted. Starts after the Back button (HT-53) and sits above the header (QA-10), so Back is never covered. Rs 0 is refused (QA-04).',
        notes: 'Real banner has a red outline and bold red title. Here the outline is the "alert" edge and the heading is words; status is not colour alone because the heading and sentence carry it. A warn icon is not in the app today; kept off to match the build.',
        body: function () { return saleForm() + K.refbanner(t('refusal.title'), t('refusal.amountZero')); }
      },
      {
        id: 'system-refusal-notsave', route: 'overlay', title: 'Refusal banner: "Could not do that" (nothing was being saved)', flag: 'EXISTS',
        purpose: 'A refusal where nothing was being saved (a reminder, a share, a link, a deletion, a sign-in). Headed "Could not do that" so it does not read as lost data.',
        primary: 'None. Tap to dismiss.',
        taps: '1 tap on Remind shows it.',
        rules: 'HT-43/HT-54: a not-a-save refusal never says "Not saved". The list of such refusals is explicit in App.tsx (NOT_A_SAVE) rather than inverted, so a save refusal left off the list keeps "Not saved". Neutral outline for this kind.',
        notes: 'Example: Remind with no phone number saved on the customer (refusal.noPhone).',
        body: function () {
          return K.top({ title: K.nm('ramesh'), back: true, right: K.chip('ok') }) +
            K.scroll(K.hero({ box: 1200000, opening: 1200000, cashIn: 0, cashOut: 0 }), K.lrow('wa', t('p2.remind'), t('p2.remindNote'))) +
            K.refbanner(t('refusal.titleNotDone'), t('refusal.noPhone'), true);
        }
      },
      {
        id: 'system-refusal-catalogue', route: 'catalogue', title: 'Refusal sentences: every key, grouped by cause', flag: 'NEW',
        purpose: 'A review list, not a screen the shopkeeper sees. Every refusal sentence the banner can say, grouped by what went wrong, with the heading the real banner puts above it. Shown in the language selected on this page.',
        primary: 'None (legend).',
        taps: 'n/a',
        rules: 'Each sentence says what did not happen and the next step. "Nothing is lost" appears where data is in doubt. refusal.other is the fallback for any field without a mapping. refusal.itemOverSale is shown with an amount ("Left to record") beside it, drawn as text here.',
        notes: 'Group headings are the legend\'s own labels (documentation, not app copy). party.refusal.*, x1.refusal.shopName and t3.banner are borrowed from their own screens by REFUSAL_HINT. t3.banner is the sentence for both dayClosed and dayClosedOpen (the latter headed "Could not do that"); the "Not saved" label on it here is for dayClosed.',
        review: 'dayClosed (an entry added on a frozen day) is headed "Not saved" but nothing was being saved the way a reminder is; Saket to decide whether it joins the NOT_A_SAVE list like dayClosedOpen.',
        body: function () {
          return K.top({ title: t('refusal.title'), back: true }) + K.scroll(
            grp('Missing or wrong input'),
            sv(t('refusal.amount')), sv(t('refusal.amountZero')), sv(t('refusal.amountTooLarge')), sv(t('refusal.partyId')),
            sv(t('party.refusal.name')), sv(t('party.refusal.phone')), sv(t('x1.refusal.shopName')), sv(t('refusal.creditLimit')),
            sv(t('refusal.itemDuplicate')), sv(t('refusal.itemOverSale') + ' ' + M(250000)),
            grp('The day does not allow it'),
            sv(t('t3.banner')), ns(t('refusal.dayStale')), ns(t('refusal.dayClosedWrongDate')), ns(t('refusal.dayFuture')),
            grp('No signal or the server said no'),
            sv(t('refusal.consent')), ns(t('refusal.consentRead')), ns(t('refusal.erase')), ns(t('refusal.eraseOffline')),
            ns(t('refusal.eraseSignIn')), ns(t('refusal.eraseLocal')), ns(t('refusal.wrongShop')),
            grp('Nothing to send or open'),
            ns(t('refusal.noPhone')), ns(t('refusal.nothingDue')), ns(t('refusal.share')), ns(t('refusal.openUrl')),
            grp('Fallback'),
            sv(t('refusal.other'))
          );
        }
      },
      {
        id: 'system-sync-states', route: 'overlay', title: 'Sync chip in every header: saved, waiting, parked rows', flag: 'CHG',
        purpose: 'The one persistent answer to "is my work safe?". Four header states stacked: saved, waiting (also what offline looks like), waiting with rows parked, and parked only.',
        primary: 'Tap the chip to read the explanation (see next frame).',
        taps: '1 tap to open the explanation.',
        rules: 'Amber with a clock and words, never red; a tick and "Saved" when empty. Words are the same in every header (USABILITY item 8). The app has no separate "offline" state: it shows the waiting count, since the queue drains by itself when signal returns.',
        notes: 'Top to bottom: sync.saved; sync.waiting with n=3; waiting n=3 plus " - t1.parked" with n=1; parked n=1 with nothing waiting. Parked rows are those the server refused (FE-11). The long forms (sync.savedLong, sync.waitingLong) are the spoken labels in the app. In the real chip the parked words are appended to the same pill; here the long pill wraps onto two lines at 17 sp. The kit\'s "Offline" chip (K.N) is not used: no such string exists in the app.',
        review: 'Proposal: the parked words become a second, tappable line under the chip so the pill stays short at 2.0x.',
        body: function () {
          function chipWords(txt, ok) { return '<button class="chip ' + (ok ? 'ok' : 'wait') + '" style="height:auto;min-height:56px;max-width:100%;text-align:left;line-height:1.3">' + K.ico(ok ? 'check' : 'clock', 22) + '<span>' + txt + '</span></button>'; }
          var w = t('sync.waiting', { n: 3 });
          var hd = function (c) { return '<div style="margin-bottom:10px">' + K.top({ shop: K.shop, date: K.date() }) + '<div style="padding:6px 12px">' + c + '</div></div>'; };
          return K.scroll(
            hd(chipWords(t('sync.saved'), true)),
            hd(chipWords(w, false)),
            hd(chipWords(w + ' · ' + t('t1.parked', { n: 1 }), false)),
            hd(chipWords(t('t1.parked', { n: 1 }), false))
          );
        }
      },
      {
        id: 'system-sync-sheet', route: 'overlay', title: 'Sync chip tapped: what "waiting" means', flag: 'NEW',
        purpose: 'Explain the chip in a sentence: safe on this phone, goes when the network is back. Names the parked rows and offers a contact route.',
        primary: 'Back (close the sheet). Parked rows: contact us, opened from the same sheet.',
        taps: '1 tap to open, 1 to close.',
        rules: 'No alarm: no red, no countdown. Nothing is lost and the sheet says so. The chip itself is only information; this sheet adds nothing to do except contact for parked rows.',
        notes: 'The app speaks sync.waitingLong as the chip\'s accessible name today; a tap does nothing visible. This frame makes the same sentence visible. Contact action text is not drawn because no contact string exists beside t1.parked.',
        review: 'New behaviour: the chip opens a sheet with its long sentence. Decide whether it is worth a tap target or stays an accessible label only.',
        body: function () {
          return top(K.chip('wait', 3)) + K.scroll(K.tiles(), K.hero({ box: 1935000 - 290000, opening: 1200000, cashIn: 935000, cashOut: 290000 })) + K.tabs('today') +
            K.sheet(t('sync.waiting', { n: 3 }), K.banner('info', 'cloudoff', t('sync.waitingLong', { n: 3 })) + K.banner('err', 'warn', t('t1.parked', { n: 1 })));
        }
      },
      {
        id: 'system-back-exit', route: 'overlay', title: 'Hardware Back from Today: leave the app?', flag: 'NEW',
        purpose: 'On Today a system Back leaves the app with no question (Session.back returns false and Android finishes the activity). A mid-task Back is safe, a Back from Today is an easy accident.',
        primary: 'Stay and Exit have equal weight; neither is pre-selected.',
        taps: '1 tap either way.',
        rules: 'No confirm-shaming; equal visual weight. Nothing is lost on Exit: entries are saved on the phone. Shown only from Today and from the screens before an account, never from a form (there Back goes to the parent screen as built).',
        notes: 'As built: Root.tsx hardwareBackPress calls host.session.back(); true consumes the press, false lets Android leave. The dialog needs a native hook (a confirm step before returning false). The three words are new strings.',
        review: 'USABILITY proposal, not in the app: confirm before a Back from Today leaves the app. Needs Saket\'s decision and a Root.tsx change.',
        body: function () {
          return top() + K.scroll(K.tiles(), K.hero({ box: 1935000 - 290000, opening: 1200000, cashIn: 935000, cashOut: 290000 })) + K.tabs('today') +
            K.dialog(K.N('Exit the app?'), '<p>' + K.N('Your entries stay safe on this phone.') + '</p>' + K.stack(K.primary(K.N('Stay'), 'outline'), K.primary(K.N('Exit'), 'outline')));
        }
      },
      {
        id: 'system-list-empty', route: 'overlay', title: 'Any list: empty, with a next step', flag: 'EXISTS',
        purpose: 'The empty state every list shares. It always offers the action that fills the list.',
        primary: 'Add.',
        taps: '1 tap to the add form.',
        rules: 'Never "nothing here yet" alone (CLAUDE.md brief): the line is paired with a button. Icon disc plus words; no colour-only cue.',
        notes: 'Each real list has its own empty sentence (for example p1.empty); common.empty is the generic one. The CTA here uses common.add.',
        body: function () { return listTop() + K.scroll(K.empty('book', t('common.empty'), t('common.add'), 'plus')) + K.tabs('parties'); }
      },
      {
        id: 'system-list-loading', route: 'overlay', title: 'Any list: loading', flag: 'EXISTS',
        purpose: 'The list is opening from the phone\'s own database. Placeholder rows, no spinner and no message.',
        primary: 'None; waits (normally well under a second).',
        taps: 'n/a',
        rules: 'Skeleton rows the height of real rows so nothing jumps. common.loading is the accessible name only.',
        notes: 'The visible sentence would be the word "Opening"; the app uses it for the screen reader.',
        body: function () { return listTop() + '<div class="scroll" aria-busy="true" aria-label="' + t('common.loading') + '">' + K.skel(5) + '</div>' + K.tabs('parties'); }
      },
      {
        id: 'system-list-error', route: 'overlay', title: 'Any list: could not open', flag: 'EXISTS',
        purpose: 'The list failed to open. Calm, says nothing is lost, one next step.',
        primary: 'Try again.',
        taps: '1 tap.',
        rules: 'common.error says "Nothing you entered is lost". Icon plus words. The same sentence is drawn once, in the empty block; the banner above it is dropped here so the sentence is not said twice.',
        notes: 'If Try again fails repeatedly the crash screen is the next stop (frames above).',
        body: function () { return listTop() + K.scroll(K.empty('warn', t('common.error'), t('common.retry'), 'refresh')) + K.tabs('parties'); }
      },
      {
        id: 'system-list-offline', route: 'overlay', title: 'Any list: offline, rows waiting to send', flag: 'CHG',
        purpose: 'The list works on the phone without network. The chip and one line say what is waiting.',
        primary: 'Use the list as normal.',
        taps: 'No extra step because of the network.',
        rules: 'D2 untouched: balances shown are derived from entries on the phone. Chip amber with a clock. Never red.',
        notes: 'Balances here are demo figures; the state word is the real t1.toCollect label.',
        body: function () {
          return listTop().replace(K.chip('ok'), K.chip('wait', 3)) + K.scroll(
            K.banner('info', 'cloudoff', t('sync.waitingLong', { n: 3 })),
            K.list([K.prow(K.nm('ramesh'), 0, '', 450000, t('t1.toCollect')), K.prow(K.nm('sunita'), 1, '', 120000, t('t1.toCollect')), K.prow(K.nm('bijay'), 2, '', 80000, t('t1.toCollect'))])
          ) + K.tabs('parties');
        }
      },
      {
        id: 'system-close-2x', route: 'T5', title: 'Day close at 2.0x text size', flag: 'EXISTS',
        purpose: 'Show reflow at the largest system text size. Body text doubles; the header and tab bar stop at 1.5x (chrome cap) so navigation cannot eat the content.',
        primary: 'The next row (Enter UPI sales).',
        taps: '1 tap on the next row; it is on screen without scrolling.',
        rules: 'Do not shrink anything: rows grow and stack, the progress bar stays full width, the skip button drops under its label (wraps) instead of squeezing it. Touch targets stay at least 56 dp.',
        notes: 'This frame forces 2.0x for itself whatever the page toggle says (the page also has a 2.0x toggle that scales every other frame). The rows are drawn from the kit: the real day-close list (T5) was not re-read for this frame, so section order and the skip control are approximate. The progress is the bar form used in Mitra, not a ring. A keypad form at 2.0x is not drawn separately: toggle 2.0x on the page and open any form frame.',
        body: function () {
          var css = '<style>#fr-system-close-2x .row{flex-wrap:wrap}#fr-system-close-2x .row .quiet{flex-basis:100%}</style>';
          var inner = K.top({ title: t('t5.title'), back: true, right: K.chip('ok') }) + K.scroll(
            '<div style="padding:8px 16px">' + t('t5.done', { done: 4, total: 10 }) + K.bar(4, 10) + '</div>',
            K.list([
              K.row({ state: 'done', name: t('section.cash_sales'), paise: 1472000 }),
              K.row({ state: 'next', n: 5, name: t('t5.next', { section: t('section.upi_sales') }), quiet: t('t5.skip') }),
              K.row({ state: 'open', n: 6, name: t('section.udhar_sales') }),
              K.row({ state: 'lock', name: t('t5.cashCheck'), sub: t('t5.closeLocked') })
            ])
          );
          return css + '<div style="--z:2;--zc:1.5;font-size:34px;display:flex;flex-direction:column;flex:1;min-height:0">' + inner + '</div>';
        }
      }
    ]
  };
})();
