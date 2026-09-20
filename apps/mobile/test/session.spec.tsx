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
import { App } from '../src/app/App.tsx';
import { Store, memoryPort, type StoreState } from '../src/store/index.ts';
import { render, all, byTestId, text } from './render.tsx';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';
import { formatPaise, subtract, add } from '@swafto/formula-engine';
import { CONSENT_PURPOSES, PRIVACY_NOTICE_VERSION } from '@swafto/values';

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
  return new Session(new Store(memoryPort(state)), {
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

  it('it stops at a sane number of digits', () => {
    const s = freshSession();
    type(s, '1234567890123');
    expect(String(s.state.draftPaise)).toHaveLength(10);
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
    type(s, String(expected / 100));
    expect(s.confirmCount()).toBe(true);
    expect(s.state.screen).toBe('T12');
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
    s.goTo('T11');
    type(s, String(subtract(expected, 10000) / 100));
    s.confirmCount();

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
    expect(seen).toEqual(['t1', 't5', 't6', 't7', 't8', 't9', 't10', 't11', 't12', 't14']);
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
    byTestId(tree, 't7-commit-cash-cash_sales').props.onPress();
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

  it('tapping a Today row opens the form that can enter that section', () => {
    const s = freshSession();
    s.goTo('T7');
    type(s, '500');
    s.commit(CASH_SALE);
    s.goTo('T1');

    const tree = render(<App session={s} />);
    byTestId(tree, 't1-section-cash_sales').props.onPress();
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

  it('and in manage mode the button does NOT re-post a sign-up decision', () => {
    const s = freshSession();
    s.openConsentSettings([]);
    const decisions: unknown[] = [];
    const tree = render(<App session={s} onConsent={(d) => decisions.push(d)} />);
    byTestId(tree, 'x0-agree').props.onPress();
    expect(decisions).toEqual([]);
    expect(s.state.screen).toBe('T1');
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
    expect(s.state.screen).toBe('T1');
  });
});
