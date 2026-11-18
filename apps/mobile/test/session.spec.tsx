/**
 * THE WHOLE LOOP, ONCE, THROUGH THE REAL PIECES.
 *
 * Every other test in this app checks one layer well: a screen renders, a parser
 * refuses, a figure is the engine's. None of them answers the only question that
 * matters to a shopkeeper - CAN HE CLOSE A DAY. This does: open an empty shop,
 * type on the keypad, commit through the parsers, count the cash, meet the
 * difference, give a reason, close.
 *
 * NOTHING IS MOCKED. The real session, the real store, the real engine, the real
 * screens rendered at each step. The only injected things are the clock and the
 * id source, and they are injected so the test is deterministic - not so the
 * code can be avoided.
 */
import { describe, it, expect } from 'vitest';
import { Session } from '../src/app/session.tsx';
import { MAX_ENTRY_PAISE } from '@swafto/values';
import { App } from '../src/app/App.tsx';
import { Store, memoryPort, type StoreState } from '../src/store/index.ts';
import { render, all, byTestId, text } from './render.tsx';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';
import { formatPaise, subtract, add } from '@swafto/formula-engine';
import { CONSENT_PURPOSES, PRIVACY_NOTICE_VERSION } from '@swafto/values';
import { phrase } from '../src/i18n/strings.ts';
import { tokens } from '../src/theme/tokens.ts';

const T0 = CANONICAL_DATE + 'T19:00:00.000Z';

/** A shop with a day open and nothing in it - the first morning. */
function freshSession(): Session {
  const base = canonicalInput();
  const state: StoreState = {
    shopId: 'shop-canonical',
    day: { ...base.day, state: 'open', openingCash: null },
    entries: [],
    parties: CANONICAL_PARTIES,
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
    skippedSections: [],
  };
  let n = 0;
  return new Session(new Store(memoryPort(state), () => T0), {
    now: () => T0,
    newId: () => 'e' + String(++n),
  });
}

const type = (session: Session, digits: string) => {
  for (const d of digits) session.press(d as '0');
};

const CASH_SALE = { labelKey: 'formA.mode.cash', section: 'cash_sales', mode: 'cash' } as const;

describe('the keypad builds an exact figure and never a float', () => {
  it('digits become paise by concatenation', () => {
    const s = freshSession();
    type(s, '123');
    expect(s.state.draftPaise).toBe(12300);
    expect(Number.isInteger(s.state.draftPaise)).toBe(true);
  });

  it('back removes one digit, clear removes them all', () => {
    const s = freshSession();
    type(s, '4567');
    s.press('back');
    expect(s.state.draftPaise).toBe(45600);
    s.press('clear');
    expect(s.state.draftPaise).toBeNull();
  });

  it('a leading zero is replaced, not accumulated', () => {
    const s = freshSession();
    type(s, '05');
    expect(s.state.draftPaise).toBe(500);
  });

  it('it stops at the per-entry ceiling (C-09), says why, and takes no further digit', () => {
    const s = freshSession();
    type(s, '1234567890123');
    // 1234567 rupees went in; the 8th digit would make it 12,345,678 > Rs 1 crore.
    expect(s.state.draftPaise).toBe(123456700);
    expect(s.state.lastRefusal?.field).toBe('amountTooLarge');
  });

  it('Rs 1 crore exactly is accepted; one rupee more is refused (C-09)', () => {
    const ok = freshSession();
    type(ok, '10000000');
    expect(ok.state.draftPaise).toBe(MAX_ENTRY_PAISE);
    expect(ok.state.lastRefusal).toBeNull();

    const over = freshSession();
    type(over, '10000001');
    // the last digit was not taken: still Rs 10,00,000
    expect(over.state.draftPaise).toBe(100000000);
    expect(over.state.lastRefusal?.field).toBe('amountTooLarge');
  });

});

describe('committing goes through the parsers, and they refuse', () => {
  it('a cash sale is appended and the draft is cleared', () => {
    const s = freshSession();
    type(s, '450');
    expect(s.commit(CASH_SALE)).not.toBeNull();
    expect(s.store.state.entries).toHaveLength(1);
    expect(s.store.state.entries[0]!.amount).toBe(45000);
    expect(s.state.draftPaise).toBeNull();
  });

  it('committing nothing is refused, and says which field', () => {
    const s = freshSession();
    expect(s.commit(CASH_SALE)).toBeNull();
    expect(s.state.lastRefusal?.field).toBe('amount');
    expect(s.store.state.entries).toHaveLength(0);
  });

  it('a credit sale with nobody named is refused BY THE PARSER, naming partyId', () => {
    const s = freshSession();
    type(s, '900');
    expect(
      s.commit({ labelKey: 'formA.mode.udhar', section: 'udhar_sales', mode: 'udhar' }),
    ).toBeNull();
    expect(s.state.lastRefusal?.field).toBe('partyId');
    // Nothing was written. Udhar owed by nobody can never be collected.
    expect(s.store.state.entries).toHaveLength(0);
  });

  it('the same credit sale succeeds once a customer is selected', () => {
    const base = canonicalInput();
    let n = 0;
    const store = new Store(
      memoryPort({
        shopId: 'shop-canonical',
        day: { ...base.day, state: 'open' },
        entries: [],
        parties: CANONICAL_PARTIES,
        priorCreditOutstanding: 0,
        priorSupplierOutstanding: 0,
        skippedSections: [],
      }),
    );
    const s = new Session(store, {
      now: () => T0,
      newId: () => 'p' + String(++n),
      selectedPartyId: () => CANONICAL_PARTIES[0]!.id,
    });
    type(s, '900');
    expect(
      s.commit({ labelKey: 'formA.mode.udhar', section: 'udhar_sales', mode: 'udhar' }),
    ).not.toBeNull();
    expect(store.state.entries[0]!.partyId).toBe(CANONICAL_PARTIES[0]!.id);
  });
});

describe('a whole day, opened, entered, counted and closed', () => {
  it('goes from the first morning to a closed day', () => {
    const s = freshSession();

    // The opening figure. The app will not invent one.
    s.goTo('T6');
    expect(s.confirmOpeningCash()).toBe(false);
    expect(s.state.lastRefusal?.field).toBe('openingCash');
    type(s, '1000');
    expect(s.confirmOpeningCash()).toBe(true);
    expect(s.store.state.day.openingCash).toBe(100000);
    expect(s.state.screen).toBe('T1');

    // Two sales.
    s.goTo('T7');
    type(s, '450');
    s.commit(CASH_SALE);
    type(s, '250');
    s.commit({ labelKey: 'formA.mode.upi', section: 'upi_sales', mode: 'upi' });

    // An expense.
    s.goTo('T9');
    type(s, '75');
    s.commit({ labelKey: 'formA.mode.cash', section: 'expense', mode: 'cash' });
    expect(s.store.state.entries).toHaveLength(3);

    // Count the cash. The expected figure is the engine's, never typed here.
    const expected = s.store.expectedCash().value;
    s.goTo('T11');
    /*
     * THE RUPEE DIGITS OF A PAISE FIGURE, WITHOUT DIVIDING.
     *
     * This was `String(expected / 100)`, which is a float operation on money and
     * is exactly what ADR-003 forbids - it went unnoticed for the life of the
     * file because `check:money` only walked `.ts` and `.mjs`, so no `.tsx` in
     * this repository was ever linted by it.
     *
     * `Session.press` builds paise by CONCATENATION - '123' becomes 12300,
     * "exact by construction" in its own words - so the exact inverse is to drop
     * the last two characters, not to divide by a hundred. The keypad cannot
     * express a sub-rupee figure at all, which is asserted rather than assumed.
     */
    expect(expected % 100).toBe(0);
    type(s, String(expected).slice(0, -2));
    expect(s.confirmCount()).toBe(true);
    /*
     * T13, NOT T12, BECAUSE IT BALANCES. The balanced state is its own screen
     * (S03) rather than the difference screen showing a zero; the sibling test
     * below walks the unbalanced path and still lands on T12, so this asserts a
     * fork rather than a renaming.
     */
    expect(s.state.screen).toBe('T13');
    expect(s.state.countedPaise).toBe(expected);

    // It balances, so it closes with no reason needed.
    expect(s.closeDay()).toBe(true);
    expect(s.state.screen).toBe('T14');
    expect(s.store.state.day.state).toBe('closed');
    expect(s.store.state.day.countedCash).toBe(expected);
  });

  it('a day that does NOT balance cannot be closed without a reason', () => {
    const s = freshSession();
    s.goTo('T7');
    type(s, '450');
    s.commit(CASH_SALE);

    const expected = s.store.expectedCash().value;
    const short = subtract(expected, 10000);
    s.goTo('T11');
    /*
     * Rupee digits without dividing, for the reason given on the balanced day
     * above. `check:money` did not flag this one even while it flagged that one,
     * because the divided value arrived from `subtract()` rather than from a
     * name the rule tracks - so the rule is narrower than the constraint it
     * enforces. Worth knowing; not worked around by leaving the float here.
     */
    expect(short % 100).toBe(0);
    type(s, String(short).slice(0, -2));
    s.confirmCount();

    /*
     * T12, BECAUSE IT DOES NOT BALANCE - the other half of the fork asserted on
     * the balanced day above. Without this, changing `confirmCount` to send
     * every day to T13 would still pass both tests, and the screen that exists
     * to ask "what happened?" would never be reached.
     */
    expect(s.state.screen).toBe('T12');

    // Refused by the store, surfaced by the session.
    expect(s.closeDay()).toBe(false);
    expect(s.state.lastRefusal?.field).toBe('differenceReason');
    expect(s.store.state.day.state).not.toBe('closed');

    s.setReason('gave change from my own pocket');
    expect(s.closeDay()).toBe(true);
    expect(s.store.state.day.differenceReason).toBe('gave change from my own pocket');
  });

  it('a closed day refuses another entry', () => {
    const s = freshSession();
    s.goTo('T11');
    type(s, '0');
    s.confirmCount();
    s.closeDay();
    expect(s.store.state.day.state).toBe('closed');

    s.goTo('T7');
    type(s, '100');
    expect(s.commit(CASH_SALE)).toBeNull();
    expect(s.state.lastRefusal).not.toBeNull();
  });
});

describe('the app renders whatever screen the session is on', () => {
  it('every screen in the flow renders, and only one at a time', () => {
    const s = freshSession();
    const seen: string[] = [];
    for (const screen of [
      'T1',
      'T5',
      'T6',
      'T7',
      'T8',
      'T9',
      'T10',
      'T11',
      'T12',
      'T14',
    ] as const) {
      s.goTo(screen);
      const tree = render(<App session={s} />);
      const roots = all(tree).filter((n) => /^t\d+$/.test(String(n.props?.testID ?? '')));
      expect(roots.length, screen).toBe(1);
      seen.push(String(roots[0]!.props.testID));
    }
    /*
     * `t2`, NOT `t1`, FOR THE FIRST ENTRY, AND THAT IS THE POINT OF THE CHANGE.
     *
     * `goTo('T1')` asks for Today; the day this session starts on has nothing
     * carried and nothing entered, so Today IS the first run. The route no
     * longer carries the answer - the day does - so there is no state in which
     * the screen and the day disagree. The walk below the fold proves the other
     * two faces of the same route.
     */
    expect(seen).toEqual(['t2', 't5', 't6', 't7', 't8', 't9', 't10', 't11', 't12', 't14']);
  });

  it('a keypad press on the rendered form reaches the session', () => {
    const s = freshSession();
    s.goTo('T7');
    const tree = render(<App session={s} />);
    byTestId(tree, 'keypad-7').props.onPress();
    byTestId(tree, 'keypad-5').props.onPress();
    expect(s.state.draftPaise).toBe(7500);
  });

  it('committing from the rendered form writes through the parser', () => {
    const s = freshSession();
    s.goTo('T7');
    let tree = render(<App session={s} />);
    byTestId(tree, 'keypad-9').props.onPress();
    tree = render(<App session={s} />);
    // Cash is segment 0 and is live the moment the form opens, so this is
    // still the two-tap path acceptance criterion 1 requires: open, type,
    // commit - with no extra tap spent choosing a mode.
    byTestId(tree, 't7-commit').props.onPress();
    expect(s.store.state.entries).toHaveLength(1);
    expect(s.store.state.entries[0]!.amount).toBe(900);
  });

  it('the figure on screen is the figure in the store after a write', () => {
    const s = freshSession();
    s.goTo('T7');
    type(s, '1200');
    s.commit(CASH_SALE);
    const tree = render(<App session={s} />);
    expect(text(byTestId(tree, 't7-headline'))).toBe(
      formatPaise(s.store.primary().p4NetSales.value, { withSign: false }),
    );
  });

  it('tapping a Today rail opens the form that can enter that section', () => {
    /*
     * Today has no section rows since it was rebuilt to the reference
     * (2026-10-25): the route from Today to a form is the rail, which this
     * now presses, through the App, exactly as the row was pressed before.
     */
    const s = freshSession();
    s.goTo('T7');
    type(s, '500');
    s.commit(CASH_SALE);
    s.goTo('T1');

    const tree = render(<App session={s} />);
    byTestId(tree, 't1-act-cash_sales').props.onPress();
    expect(s.state.screen).toBe('T7');
  });

  it('no screen in the flow has a bottom navigation bar', () => {
    const s = freshSession();
    for (const screen of ['T1', 'T5', 'T7', 'T11', 'T12', 'T14'] as const) {
      s.goTo(screen);
      const tree = render(<App session={s} />);
      const navish = all(tree)
        .map((n) => String(n.props?.testID ?? ''))
        .filter((id) => /nav|tabbar|bottom-bar/i.test(id));
      expect(navish, screen).toEqual([]);
    }
  });

  it('the running total after several entries equals the engine, not a tally', () => {
    const s = freshSession();
    s.goTo('T7');
    for (const amount of ['100', '250', '375']) {
      type(s, amount);
      s.commit(CASH_SALE);
    }
    expect(s.store.sectionTotal('cash_sales')).toBe(add(10000, 25000, 37500));
    const tree = render(<App session={s} />);
    expect(text(byTestId(tree, 't7-headline'))).toBe(
      formatPaise(s.store.primary().p4NetSales.value, { withSign: false }),
    );
  });
});

/* ---- the consent decision, which precedes everything above -------------- */

describe('consent is collected before the account, and reports exactly what he chose', () => {
  /**
   * THIS IS THE ONE FLOW WHOSE FAILURE IS LEGAL RATHER THAN NUMERICAL. Every
   * case below is a way the app could record a consent the shopkeeper did not
   * give - and none of them would look wrong on the screen.
   */
  const consenting = () => {
    const s = freshSession();
    s.goTo('X0');
    return s;
  };

  it('opens on X0 when the host says there is no account yet', () => {
    const base = canonicalInput();
    const store = new Store(
      memoryPort({
        shopId: 'shop-canonical',
        day: base.day,
        entries: [],
        parties: CANONICAL_PARTIES,
        priorCreditOutstanding: 0,
        priorSupplierOutstanding: 0,
        skippedSections: [],
      }),
    );
    const s = new Session(store, { now: () => T0, newId: () => 'e1', screen: 'X0' });
    expect(s.state.screen).toBe('X0');
    expect(byTestId(render(<App session={s} />), 'x0')).toBeTruthy();
  });

  it('nothing optional is granted until he turns it on', () => {
    expect(consenting().state.grantedConsents).toEqual([]);
  });

  it('agreeing with nothing turned on grants ONLY the required purpose', () => {
    const s = consenting();
    const decision = s.agreeConsent();
    expect(decision.granted).toEqual(['account_and_ledger']);
    expect(decision.noticeVersion).toBe(PRIVACY_NOTICE_VERSION);
    expect(decision.locale).toBe('en');
  });

  it('a purpose he turned on is in the decision, and one he turned off again is not', () => {
    const s = consenting();
    s.toggleConsent('sms_reminders');
    expect(s.agreeConsent().granted).toEqual(['account_and_ledger', 'sms_reminders']);

    const t = consenting();
    t.toggleConsent('crash_diagnostics');
    t.toggleConsent('crash_diagnostics');
    expect(t.agreeConsent().granted).toEqual(['account_and_ledger']);
  });

  it('the required purpose cannot be toggled off, through the session or the screen', () => {
    const s = consenting();
    s.toggleConsent('account_and_ledger');
    expect(s.state.grantedConsents).toEqual([]);
    expect(s.agreeConsent().granted).toContain('account_and_ledger');
  });

  it('the decision carries the language he READ it in, not the one he ends up using', () => {
    const s = consenting();
    s.setLanguage('or');
    expect(s.agreeConsent().locale).toBe('or');
  });

  it('tapping a toggle on the real screen moves the real state', () => {
    const s = consenting();
    const optional = CONSENT_PURPOSES.filter((p) => !p.required).map((p) => p.key);
    byTestId(render(<App session={s} />), 'x0-toggle-' + optional[0]).props.onPress();
    expect(s.state.grantedConsents).toEqual([optional[0]]);
  });

  it('WITHDRAWAL IS REACHABLE FROM TODAY, which is what makes it as easy', () => {
    /*
     * Before this there was no way back to the consent screen at all: giving
     * took one tap during sign-in and withdrawing took none, because there was
     * nowhere to do it. That is the requirement broken by omission.
     */
    const s = freshSession();
    /*
     * The day has to be STARTED for Today to wear its T1 face: on a first
     * morning the same route renders T2, which asks for the opening cash and
     * offers nothing else - correctly, since there is nothing else to do yet.
     */
    s.goTo('T6');
    type(s, '2000');
    expect(s.confirmOpeningCash()).toBe(true);

    const opened: number[] = [];
    const tree = render(<App session={s} onOpenPrivacy={() => opened.push(1)} />);
    byTestId(tree, 't1-privacy').props.onPress();
    expect(opened).toEqual([1]);
  });

  it('opening it from Today shows what the SERVER says is in force', () => {
    const s = freshSession();
    s.openConsentSettings(['sms_reminders']);
    expect(s.state.screen).toBe('X0');
    expect(s.state.consentMode).toBe('manage');
    expect(s.state.grantedConsents).toEqual(['sms_reminders']);

    const tree = render(<App session={s} />);
    expect(byTestId(tree, 'x0-toggle-sms_reminders').props?.accessibilityState).toEqual({
      checked: true,
    });
  });

  it('a withdrawal is reported the moment he taps, not when he finds a button', () => {
    const s = freshSession();
    s.openConsentSettings(['sms_reminders']);
    const changes: [string, boolean][] = [];
    const tree = render(<App session={s} onConsentChange={(p, on) => changes.push([p, on])} />);

    byTestId(tree, 'x0-toggle-sms_reminders').props.onPress();
    expect(changes).toEqual([['sms_reminders', false]]);
    expect(s.state.grantedConsents).toEqual([]);
  });

  /*
   * M3, AN INTENDED CHANGE (approved at M2): manage mode has NO Save button -
   * each switch is the write, so withdrawal is one tap, as giving was. This
   * test pressed that button; what it protected still holds and is asserted:
   * nothing re-posts a sign-up decision, and leaving returns to Today (HT-14),
   * now by the visible Back.
   */
  it('and in manage mode there is no button that could re-post a sign-up decision', () => {
    const s = freshSession();
    s.openConsentSettings([]);
    const decisions: unknown[] = [];
    const tree = render(<App session={s} onConsent={(d) => decisions.push(d)} />);
    expect(all(tree).some((n) => n.props?.testID === 'x0-agree')).toBe(false);
    byTestId(tree, 'x0-back').props.onPress();
    expect(decisions).toEqual([]);
    // HT-14: and it returns to Today, not to the four setup questions.
    expect(s.state.screen).toBe('T1');
  });

  it('a withdrawal says it took effect now, one tap, no Save', () => {
    const s = freshSession();
    s.openConsentSettings(['sms_reminders']);
    const changes: [string, boolean][] = [];
    const before = render(<App session={s} onConsentChange={(p, on) => changes.push([p, on])} />);
    expect(all(before).some((n) => n.props?.testID === 'x0-withdrawn-sms_reminders')).toBe(false);
    byTestId(before, 'x0-toggle-sms_reminders').props.onPress();
    expect(changes).toEqual([['sms_reminders', false]]);
    const after = render(<App session={s} />);
    expect(text(byTestId(after, 'x0-withdrawn-sms_reminders-text'))).toBe(phrase('consent.withdrawn', 'en'));
    // Turning it back on is the same one tap, and the note goes.
    byTestId(after, 'x0-toggle-sms_reminders').props.onPress();
    expect(all(render(<App session={s} />)).some((n) => n.props?.testID === 'x0-withdrawn-sms_reminders')).toBe(false);
  });

  it('a purpose the server reports but which is not optional is not shown as a choice', () => {
    // `account_and_ledger` is always in force; it is not a switch he can flip.
    const s = freshSession();
    s.openConsentSettings(['account_and_ledger', 'crash_diagnostics']);
    expect(s.state.grantedConsents).toEqual(['crash_diagnostics']);
  });

  it('agreeing hands the decision OUT - the app posts nothing by itself', () => {
    const s = consenting();
    const sent: unknown[] = [];
    byTestId(render(<App session={s} onConsent={(d) => sent.push(d)} />), 'x0-agree').props.onPress();
    expect(sent).toHaveLength(1);
    /*
     * X1, NOT T1: consent precedes the account, and onboarding's four questions
     * are what create it. Landing on Today here would have skipped the only
     * screen that asks the shop its name.
     */
    expect(s.state.screen).toBe('X1');
  });
});

/* ---- the session tells somebody when it changes ---------------------- */
describe('Session.subscribe, without which the app is a photograph', () => {
  /*
   * WHY THIS EXISTS.
   *
   * `App` is a pure function of `session.state` with no React state of its
   * own, and `Session` had no listeners. So a tap mutated the state correctly
   * and nothing re-rendered: on a device, an app where the consent toggles
   * and every button did nothing at all.
   *
   * Nothing in this file caught it, because these tests re-render BY HAND -
   * see "committing from the rendered form writes through the parser", which
   * calls `render(<App session={s} />)` a second time after pressing a key.
   * That is the one thing a real app never does, so the suite was testing the
   * screens and not the wiring.
   */
  it('notifies a listener when the state changes', () => {
    const s = freshSession();
    let calls = 0;
    s.subscribe(() => {
      calls += 1;
    });

    s.goTo('T7');
    expect(calls).toBe(1);

    s.toggleConsent('sms_reminders');
    expect(calls).toBe(2);
  });

  it('gives back an unsubscribe that actually stops it', () => {
    const s = freshSession();
    let calls = 0;
    const stop = s.subscribe(() => {
      calls += 1;
    });

    s.goTo('T7');
    expect(calls).toBe(1);

    stop();
    s.goTo('T1');
    expect(calls, 'a listener that cannot be removed is a leak').toBe(1);
  });

  it('notifies every listener, not just the first', () => {
    const s = freshSession();
    const seen: string[] = [];
    s.subscribe(() => seen.push('a'));
    s.subscribe(() => seen.push('b'));

    s.goTo('T7');
    expect(seen).toEqual(['a', 'b']);
  });

  it('replaces the state object, which is what useSyncExternalStore compares', () => {
    /*
     * `useSyncExternalStore` re-renders when the snapshot's IDENTITY changes.
     * If a mutation edited the state in place, the reference would be equal,
     * React would conclude nothing happened, and the screen would stay frozen
     * even with the listener firing. So the object must be new every time.
     */
    const s = freshSession();
    const before = s.state;
    s.goTo('T7');
    expect(s.state).not.toBe(before);
    expect(before.screen, 'the old snapshot must not be mutated').toBe('T1');
  });

  it('a toggle both changes the value and announces it', () => {
    // The exact path that looked broken on the handset.
    const s = freshSession();
    s.openConsentSettings([]);
    let notified = false;
    s.subscribe(() => {
      notified = true;
    });

    s.toggleConsent('sms_reminders');

    expect(s.state.grantedConsents).toContain('sms_reminders');
    expect(notified, 'the value changed and nothing was told').toBe(true);
  });
});

describe('the hardware back button goes somewhere, and it used to leave the app', () => {
  /*
   * FOUND ON A REAL HANDSET, NOT HERE. Nothing in this repository drives a
   * hardware key, so the app shipped with no back handling at all and Android's
   * default - finish the activity - applied on every screen. Pressing back on a
   * half-typed sale put the shopkeeper on his home screen, and with the store in
   * memory (W4) the day went too.
   *
   * These assert the map rather than the key: `Root.tsx` wires
   * `hardwareBackPress` straight to `session.back()` and does nothing else.
   */
  it('every entry form returns to Today', () => {
    for (const screen of ['T5', 'T6', 'T7', 'T8', 'T9', 'T14'] as const) {
      const s = freshSession();
      s.goTo(screen);
      expect(s.back(), screen).toBe(true);
      expect(s.state.screen, screen).toBe('T1');
    }
  });

  it('HT-1: withdrawal and the cash count return to the day-close list they open from', () => {
    for (const screen of ['T10', 'T11'] as const) {
      const s = freshSession();
      s.goTo(screen);
      expect(s.back(), screen).toBe(true);
      expect(s.state.screen, screen).toBe('T5');
    }
  });

  it('HT-3: X0 goes back to the language while signing up, to Today while managing', () => {
    const signup = freshSession();
    signup.goTo('X0');
    expect(signup.state.consentMode).toBe('signup');
    expect(signup.back()).toBe(true);
    expect(signup.state.screen).toBe('A2');

    const manage = freshSession();
    manage.openConsentSettings([]);
    expect(manage.back()).toBe(true);
    expect(manage.state.screen).toBe('T1');
  });

  it('the cash check returns to COUNTING, not to Today', () => {
    /*
     * A shopkeeper looking at a difference he does not believe wants to count
     * again. Sending him to Today would make him walk the whole close a second
     * time to get back to the number he is arguing with.
     */
    for (const screen of ['T12', 'T13'] as const) {
      const s = freshSession();
      s.goTo(screen);
      expect(s.back(), screen).toBe(true);
      expect(s.state.screen, screen).toBe('T11');
    }
  });

  it('a party page returns to the parties list', () => {
    const s = freshSession();
    s.goTo('P2');
    expect(s.back()).toBe(true);
    expect(s.state.screen).toBe('P1');
    expect(s.back()).toBe(true);
    expect(s.state.screen).toBe('T1');
  });

  it('the pre-account screens report NOT handled, so Android leaves', () => {
    /*
     * The one case where leaving at once is right. Returning true here would
     * trap the shopkeeper in the app with no way out but the task switcher.
     */
    for (const screen of ['X1'] as const) {
      const s = freshSession();
      s.goTo(screen);
      expect(s.back(), screen).toBe(false);
      expect(s.state.screen, screen).toBe(screen);
    }
  });

  /*
   * M3, AN INTENDED CHANGE (approved at M2, FLOWS "Hardware Back from Today").
   * T1 used to sit in the test above: Back on Today left the app at once, and
   * that is the easiest accident in the app. Now the first Back asks "Exit the
   * app?", a second Back is "Stay", and "Exit" leaves through the host - so
   * the way out the old test protected is still one tap away, never a trap.
   */
  it('Back on Today asks before leaving; Back again is Stay; Exit leaves through the host', () => {
    const s = freshSession();
    s.goTo('T1');
    expect(s.back()).toBe(true);
    expect(s.state.screen).toBe('T1');
    expect(s.state.exitPrompt).toBe(true);
    expect(s.back()).toBe(true);
    expect(s.state.exitPrompt).toBe(false);

    s.back();
    const left: string[] = [];
    const tree = render(<App session={s} onExitApp={() => left.push('exit')} />);
    expect(text(byTestId(tree, 't2-exit-title'))).toBe(phrase('exit.title', 'en'));
    byTestId(tree, 't2-exit-exit').props.onPress();
    expect(left).toEqual(['exit']);

    s.back();
    byTestId(render(<App session={s} onExitApp={() => left.push('again')} />), 't2-exit-stay').props.onPress();
    expect(left).toEqual(['exit']);
    expect(s.state.exitPrompt).toBe(false);
  });

  it('Stay and Exit carry equal weight - neither is the primary fill', () => {
    const s = freshSession();
    s.goTo('T1');
    s.back();
    const tree = render(<App session={s} />);
    const stay = byTestId(tree, 't2-exit-stay').props.style;
    const exit = byTestId(tree, 't2-exit-exit').props.style;
    expect(stay.backgroundColor).toBe(exit.backgroundColor);
    expect(stay.minHeight).toBe(exit.minHeight);
    expect(stay.backgroundColor).not.toBe(tokens('comfort').color.brand);
  });

  it('going back clears the draft, so a figure cannot follow him to another screen', () => {
    const s = freshSession();
    s.goTo('T7');
    type(s, '450');
    expect(s.state.draftPaise).toBe(45000);
    s.back();
    expect(s.state.screen).toBe('T1');
    expect(s.state.draftPaise).toBeNull();
  });
});

/* ================================================================== *
 * THE DEFECT THAT MADE THREE OF SIX HOME-SCREEN ACTIONS DO NOTHING
 * ================================================================== */

describe('an entry that must name a person can actually be recorded', () => {
  /*
   * THIS IS THE TEST THE BUILD NEVER HAD.
   *
   * `udhar_sales`, `udhar_collection` and `party_payment` all call
   * `requireParty`. `SessionOptions.selectedPartyId` was declared and never
   * supplied by `host.tsx`, so every one of those commits threw; `commit`
   * caught the error into `lastRefusal`; and no screen rendered `lastRefusal`.
   * The shopkeeper tapped Add and the app did nothing, silently, forever -
   * on udhar, which is the transaction this product exists for.
   *
   * Every assertion below fails against the build before the picker existed.
   */

  it('a credit sale is refused while nobody is named, and the draft survives', () => {
    const s = freshSession();
    s.goTo('T8');
    type(s, '350');

    // T8's third commit is `udhar_sales`, which the engine will not take
    // without a customer. Before the fix this was reachable and silent.
    const refused = s.commit({ labelKey: 't8.credit', section: 'udhar_sales', mode: 'udhar' });

    expect(refused).toBeNull();
    expect(s.store.state.entries).toHaveLength(0);
    expect(s.state.lastRefusal?.field).toBe('partyId');
    // The amount he typed is still there. A refusal that also erased the
    // figure would make the retry cost the typing as well.
    expect(s.state.draftPaise).toBe(35000);
  });

  it('naming the customer keeps the draft and lets the same commit through', () => {
    const s = freshSession();
    s.goTo('T8');
    type(s, '350');

    s.openPartyPicker();
    expect(s.state.pickingParty).toBe(true);
    // Opening the picker must not be routing: routing clears the draft.
    expect(s.state.draftPaise).toBe(35000);

    expect(s.chooseEntryParty('p-ramesh')).toBe(true);
    expect(s.state.pickingParty).toBe(false);
    expect(s.state.entryPartyId).toBe('p-ramesh');
    expect(s.state.draftPaise).toBe(35000);

    const entry = s.commit({ labelKey: 't8.credit', section: 'udhar_sales', mode: 'udhar' });

    expect(entry).not.toBeNull();
    expect(entry?.partyId).toBe('p-ramesh');
    expect(entry?.section).toBe('udhar_sales');
    expect(entry?.amount).toBe(35000);
    expect(s.store.state.entries).toHaveLength(1);
    expect(s.state.lastRefusal).toBeNull();
  });

  it('a collection and a supplier payment commit too - all three of T8', () => {
    for (const option of [
      { labelKey: 't8.collect', section: 'udhar_collection', mode: 'cash' },
      { labelKey: 't8.pay', section: 'party_payment', mode: 'cash' },
    ] as const) {
      const s = freshSession();
      s.goTo('T8');
      type(s, '500');
      s.chooseEntryParty(option.section === 'party_payment' ? 'p-wholesale' : 'p-ramesh');

      // QA-03: nothing is owed, so a collection or payment asks first; the test is about the party, so say yes.
      const entry = s.commit(option) ?? s.confirmAdvance(option);

      expect(entry, option.section + ' must commit once a party is named').not.toBeNull();
      expect(entry?.section).toBe(option.section);
      expect(s.store.state.entries).toHaveLength(1);
    }
  });

  it('an unknown id is refused rather than written against nobody', () => {
    /*
     * `requireParty` only checks that the field is non-empty, so a stale id
     * would pass it and persist an entry attached to a party that does not
     * exist - silent, and permanent under D1. The session refuses it instead.
     */
    const s = freshSession();
    s.goTo('T8');
    type(s, '500');

    expect(s.chooseEntryParty('p-ghost')).toBe(false);
    expect(s.state.entryPartyId).toBeNull();
    expect(s.state.lastRefusal?.field).toBe('partyId');
    expect(s.commit({ labelKey: 't8.credit', section: 'udhar_sales', mode: 'udhar' })).toBeNull();
    expect(s.store.state.entries).toHaveLength(0);
  });

  it('leaving the form forgets the party, so it cannot leak onto the next entry', () => {
    const s = freshSession();
    s.goTo('T8');
    s.chooseEntryParty('p-ramesh');
    expect(s.state.entryPartyId).toBe('p-ramesh');

    s.goTo('T7');

    expect(s.state.entryPartyId).toBeNull();
    expect(s.state.pickingParty).toBe(false);
  });

  it('a cash sale still refuses a party - the rule runs both ways', () => {
    /*
     * `parseSalesEntry` calls `refuseParty` for cash and UPI. If the picker
     * ever offered itself on a cash sale, this is what would catch it.
     */
    const s = freshSession();
    s.goTo('T7');
    type(s, '120');
    s.chooseEntryParty('p-ramesh');

    const entry = s.commit({ labelKey: 'formA.mode.cash', section: 'cash_sales', mode: 'cash' });

    expect(entry).toBeNull();
    expect(s.state.lastRefusal?.field).toBe('partyId');
  });
});
