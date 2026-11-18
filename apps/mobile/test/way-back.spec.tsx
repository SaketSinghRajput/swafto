/**
 * F-9 - SCREENS WITH NO VISIBLE WAY BACK, AND THE PARTY PAGES' ACTIONS.
 *
 * The parent map in `Session` was right; the affordance was missing. T11-T14,
 * P2 and P3 drew no back control, and T14 drew no interactive element at all -
 * the hardware key was the only exit. Each case here reaches the screen the
 * way the app does, renders `<App>`, finds the control the reference draws, and
 * presses it.
 *
 * F-13 - the party ledger is coloured by what a line does to the balance
 * (reference store.js:493), not by the sign of the number.
 */
import { describe, it, expect } from 'vitest';
import { Session, type ScreenId } from '../src/app/session.tsx';
import { App } from '../src/app/App.tsx';
import { Store, memoryPort, type StoreState } from '../src/store/index.ts';
import { tokens } from '../src/theme/tokens.ts';
import { render, byTestId, all } from './render.tsx';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';

const T0 = CANONICAL_DATE + 'T19:00:00.000Z';

function session(): Session {
  const base = canonicalInput();
  const state: StoreState = {
    shopId: 'shop-canonical',
    day: { ...base.day, state: 'open', openingCash: 100000 },
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

const type = (s: Session, digits: string) => {
  for (const d of digits) s.press(d as '0');
};
const tree = (s: Session) => render(<App session={s} />);
const press = (s: Session, id: string) => byTestId(tree(s), id).props.onPress();
const partyOf = (kind: 'customer' | 'supplier') => {
  const p = CANONICAL_PARTIES.find((x) => x.kind === kind);
  if (p === undefined) throw new Error('fixture has no ' + kind);
  return p;
};

/** Each screen, reached the way the app reaches it. Opening cash is 1000 rupees and nothing is entered, so 1000 balances. */
const REACH: Record<string, (s: Session) => void> = {
  T11: (s) => s.goTo('T11'),
  T12: (s) => {
    s.goTo('T11');
    type(s, '999');
    s.confirmCount();
  },
  T13: (s) => {
    s.goTo('T11');
    type(s, '1000');
    s.confirmCount();
  },
  T14: (s) => {
    s.goTo('T11');
    type(s, '1000');
    s.confirmCount();
    s.closeDay();
  },
  P2: (s) => s.openParty(partyOf('customer').id),
  P3: (s) => s.openParty(partyOf('supplier').id),
};

const PARENT: Record<string, ScreenId> = {
  T11: 'T5', // HT-1: the cash count opens from the day-close list
  T12: 'T11',
  T13: 'T11',
  T14: 'T1',
  P2: 'P1',
  P3: 'P1',
};

describe('F-9: every one of these screens draws a way back, and it works', () => {
  for (const [screen, reach] of Object.entries(REACH)) {
    it(screen + ': the header back is drawn and goes to ' + PARENT[screen], () => {
      const s = session();
      reach(s);
      expect(s.state.screen).toBe(screen);

      const back = byTestId(tree(s), screen.toLowerCase() + '-back');
      expect(back.props.accessibilityRole).toBe('button');
      back.props.onPress();
      expect(s.state.screen).toBe(PARENT[screen]);
    });
  }

  it('T14: "Done" is drawn and returns to Today', () => {
    const s = session();
    REACH.T14!(s);
    press(s, 't14-done');
    expect(s.state.screen).toBe('T1');
  });

  it('T14: its only controls are ways out - nothing on it can change a figure', () => {
    const s = session();
    REACH.T14!(s);
    const ids = all(tree(s))
      .filter((n) => n.type === 'Pressable' && n.props?.testID !== 'refusal')
      .map((n) => n.props?.testID);
    expect(ids.sort()).toEqual(['t14-back', 't14-done']);
  });
});

describe('P2/P3 actions open the right form with the party already named', () => {
  it('P3 "Record a payment" records a PARTY PAYMENT to that supplier, not a collection', () => {
    const s = session();
    const supplier = partyOf('supplier');
    s.openParty(supplier.id);
    press(s, 'p3-action-pay');
    type(s, '700');
    press(s, 't8-commit');
    // QA-03: nothing is owed, so Add asks first; the test is about the section, so say yes.
    press(s, 't8-advance-yes');

    const e = s.store.state.entries[0];
    expect(e?.section).toBe('party_payment');
    expect(e?.partyId).toBe(supplier.id);
  });

  it('P2 "Record a collection" and "New udhar sale" name the customer', () => {
    const s = session();
    const customer = partyOf('customer');
    s.openParty(customer.id);
    press(s, 'p2-action-collect');
    type(s, '300');
    press(s, 't8-commit');
    // QA-03: nothing is owed, so Add asks first; the test is about the section, so say yes.
    press(s, 't8-advance-yes');
    s.openParty(customer.id);
    press(s, 'p2-action-udhar');
    type(s, '200');
    press(s, 't8-commit');

    const [a, b] = s.store.state.entries;
    expect([a?.section, a?.partyId]).toEqual(['udhar_collection', customer.id]);
    expect([b?.section, b?.partyId]).toEqual(['udhar_sales', customer.id]);
  });
});

describe('F-13: a ledger line is coloured by what it does to the balance', () => {
  const t = tokens('comfort');
  const amountColor = (s: Session, id: string) =>
    byTestId(tree(s), id).props.style.color as string;

  it('customer: udhar given is money-out red, a collection is money-in green', () => {
    const s = session();
    const customer = partyOf('customer');
    s.openSectionFor('udhar_sales', customer.id);
    type(s, '600');
    s.commit({ labelKey: 't8.credit', section: 'udhar_sales', mode: 'udhar' });
    s.openSectionFor('udhar_collection', customer.id);
    type(s, '1500');
    const collect = { labelKey: 't8.collect', section: 'udhar_collection', mode: 'cash' } as const;
    s.commit(collect) ?? s.confirmAdvance(collect); // QA-03: 1500 against 600 owed is an advance, confirmed.
    s.openParty(customer.id);

    const [sale, collection] = s.store.state.entries;
    expect(amountColor(s, 'p2-line-' + sale!.id + '-amount')).toBe(t.color.negative);
    expect(amountColor(s, 'p2-line-' + collection!.id + '-amount')).toBe(t.color.positive);
  });

  it('supplier: an udhar purchase is red, and a CASH purchase shows no amount at all', () => {
    const s = session();
    const supplier = partyOf('supplier');
    s.openSectionFor('purchase', supplier.id);
    s.selectCommit(3); // udhar
    type(s, '1200');
    s.commit({ labelKey: 'formA.mode.udhar', section: 'purchase', mode: 'udhar' });
    s.openSectionFor('purchase', supplier.id);
    type(s, '400');
    s.commit({ labelKey: 'formA.mode.cash', section: 'purchase', mode: 'cash' });
    s.openParty(supplier.id);

    const [onCredit, paidOnTheSpot] = s.store.state.entries;
    expect(amountColor(s, `p3-line-${onCredit!.id}-amount`)).toBe(t.color.negative);
    const ids = all(tree(s)).map((n) => n.props?.testID);
    expect(ids).toContain(`p3-line-${paidOnTheSpot!.id}`);
    expect(ids).not.toContain(`p3-line-${paidOnTheSpot!.id}-amount`);
  });
});

describe('HT-1 - "Continue day close" opens the day-close list, so withdrawal is reachable', () => {
  it('Today -> T5 -> T10 withdrawal, and back returns to T5', () => {
    const s = session();
    s.goTo('T1');
    byTestId(tree(s), 't1-close-day').props.onPress();
    expect(s.state.screen).toBe('T5');
    s.openSection('withdrawal');
    expect(s.state.screen).toBe('T10');
    expect(s.back()).toBe(true);
    expect(s.state.screen).toBe('T5');
  });
});

describe('HT-10 - a closed day still reaches Settings and the privacy screen', () => {
  it('Settings opens S1, and the privacy link calls the host', () => {
    const s = session();
    REACH.T14!(s);
    s.goTo('T1');
    const opened: string[] = [];
    const closed = () => render(<App session={s} onOpenPrivacy={() => opened.push('privacy')} />);
    byTestId(closed(), 't3-privacy').props.onPress();
    expect(opened).toEqual(['privacy']);
    byTestId(closed(), 't3-settings').props.onPress();
    expect(s.state.screen).toBe('S1');
  });
});

describe('HT-44 - a form opened from a party page goes back to that page', () => {
  for (const [action, section, label, mode] of [
    ['p2-action-udhar', 'udhar_sales', 't8.credit', 'udhar'],
    ['p2-action-collect', 'udhar_collection', 't8.collect', 'cash'],
  ] as const) {
    it(`P2 -> ${action} -> Add -> Back lands on P2, not Today`, () => {
      const s = session();
      const customer = partyOf('customer');
      s.openParty(customer.id);
      press(s, action);
      type(s, '300');
      const option = { labelKey: label, section, mode };
      // QA-03: a collection with nothing owed asks first; this test is about Back, so say yes.
      expect(s.commit(option) ?? s.confirmAdvance(option)).not.toBeNull();
      expect(s.back()).toBe(true);
      expect(s.state.screen).toBe('P2');
      expect(s.state.partyId).toBe(customer.id);
    });
  }

  it('the same form opened from Today still goes back to Today', () => {
    const s = session();
    s.openSection('udhar_sales');
    expect(s.back()).toBe(true);
    expect(s.state.screen).toBe('T1');
  });
});
