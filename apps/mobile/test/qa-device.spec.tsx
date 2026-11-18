/**
 * ON-DEVICE QA DEFECTS QA-03 TO QA-10 (qa/swafto-retail-desk/RESULTS.md).
 * Every case is written to FAIL without its fix. CTO decisions of 2026-11-18.
 */
import { describe, it, expect } from 'vitest';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';
import type { Entry } from '@swafto/formula-engine';
import { Session } from '../src/app/session.tsx';
import { App } from '../src/app/App.tsx';
import { Store, memoryPort, type StoreState } from '../src/store/index.ts';
import { FORM_B_COMMITS, FORM_C_EXPENSE_COMMITS, ROUTE_FOR_SECTION } from '../src/screens/entryRoutes.ts';
import { Today } from '../src/screens/T1.tsx';
import { strings } from '../src/i18n/strings.ts';
import { tokens } from '../src/theme/tokens.ts';
import { render, byTestId, all, text } from './render.tsx';

const T0 = CANONICAL_DATE + 'T19:00:00.000Z';
const customer = CANONICAL_PARTIES.find((p) => p.kind === 'customer')!;
const supplier = CANONICAL_PARTIES.find((p) => p.kind === 'supplier')!;

const row = (id: string, section: Entry['section'], mode: Entry['mode'], amount: number, partyId?: string): Entry =>
  ({ id, dayId: CANONICAL_DATE, section, amount, mode, source: 'manual', createdAt: T0, ...(partyId ? { partyId } : {}) }) as Entry;

/** A second passes per call, as between a tap on a name and the next key (HT-22 swallows keys for a moment). */
let tick = 0;
const ticking = () => new Date(Date.parse(T0) + 1000 * tick++).toISOString();

function book(entries: Entry[] = [], now: () => string = ticking, date: string = canonicalInput().day.date): Session {
  const base = canonicalInput();
  const state: StoreState = {
    shopId: 'shop-canonical',
    day: { ...base.day, date, state: 'open', openingCash: 100000 },
    entries,
    parties: CANONICAL_PARTIES,
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
    skippedSections: [],
  };
  let n = 0;
  return new Session(new Store(memoryPort(state), now), { now, newId: () => 'n' + String(++n) });
}
const type = (s: Session, digits: string) => {
  for (const d of digits) s.press(d as '0');
};
const tree = (s: Session) => render(<App session={s} />);
const collect = FORM_B_COMMITS[0]!;
const pay = FORM_B_COMMITS[1]!;

describe('QA-03 - more than is owed is asked about, then kept as an advance', () => {
  it('a collection above the balance is held, writes nothing, and says by how much', () => {
    const s = book([row('s1', 'udhar_sales', 'udhar', 4500, customer.id)]);
    s.openSection('udhar_collection');
    s.chooseEntryParty(customer.id);
    type(s, '500');
    expect(s.commit(collect)).toBeNull();
    expect(s.state.advanceConfirm).toEqual({ extra: 45500 });
    expect(s.store.state.entries).toHaveLength(1);
    const asked = text(byTestId(tree(s), 't8-advance-text'));
    expect(asked).toBe('This is ₹455.00 more than they owe. Record ₹455.00 as advance?');
  });

  it('confirming saves it as typed; the balance goes below zero and is shown as an Advance', () => {
    const s = book([row('s1', 'udhar_sales', 'udhar', 4500, customer.id)]);
    s.openSection('udhar_collection');
    s.chooseEntryParty(customer.id);
    type(s, '500');
    s.commit(collect);
    byTestId(tree(s), 't8-advance-yes').props.onPress();
    expect(s.store.state.entries.map((e) => [e.section, e.amount])).toEqual([
      ['udhar_sales', 4500],
      ['udhar_collection', 50000],
    ]);
    expect(s.state.advanceConfirm).toBeNull();
    const t = tree(s);
    expect(text(byTestId(t, 't8-total'))).toContain('Advance');
    expect(text(byTestId(t, 't8-total'))).not.toContain('-');
    s.openParty(customer.id);
    // USABILITY item 5 moved the all-days balance into P2's hero: the same words, the same figure.
    const p2tree = tree(s);
    expect(text(byTestId(p2tree, 'p2-headline-label'))).toContain('Advance');
    const p2 = text(byTestId(p2tree, 'p2-headline'));
    expect(p2).toContain('455.00');
    expect(p2).not.toContain('-');
  });

  it('declining writes nothing and keeps the draft', () => {
    const s = book([row('s1', 'udhar_sales', 'udhar', 4500, customer.id)]);
    s.openSection('udhar_collection');
    s.chooseEntryParty(customer.id);
    type(s, '500');
    s.commit(collect);
    byTestId(tree(s), 't8-advance-no').props.onPress();
    expect(s.state.advanceConfirm).toBeNull();
    expect(s.state.draftPaise).toBe(50000);
    expect(s.store.state.entries).toHaveLength(1);
  });

  it('exactly what is owed, or less, saves straight away with no question', () => {
    const s = book([row('s1', 'udhar_sales', 'udhar', 4500, customer.id)]);
    s.openSection('udhar_collection');
    s.chooseEntryParty(customer.id);
    type(s, '45');
    expect(s.commit(collect)).not.toBeNull();
    expect(s.state.advanceConfirm).toBeNull();
  });

  it('paying a supplier more than is owed asks the same way', () => {
    const s = book([row('p1', 'purchase', 'udhar', 10000, supplier.id)]);
    s.openSection('party_payment');
    s.chooseEntryParty(supplier.id);
    type(s, '150');
    expect(s.commit(pay)).toBeNull();
    expect(s.state.advanceConfirm).toEqual({ extra: 5000 });
  });

  it('a change to the amount drops the question, so a yes never matches a different figure', () => {
    const s = book([row('s1', 'udhar_sales', 'udhar', 4500, customer.id)]);
    s.openSection('udhar_collection');
    s.chooseEntryParty(customer.id);
    type(s, '500');
    s.commit(collect);
    s.press('0');
    expect(s.state.advanceConfirm).toBeNull();
  });

  it('the new copy exists in en, hi and od, and the three differ (hi / od are a draft, H13)', () => {
    for (const key of ['advance.confirm', 'advance.yes', 'advance.no', 'advance.label', 'refusal.amountZero', 'refusal.dayFuture'] as const) {
      expect(new Set((['en', 'hi', 'or'] as const).map((l) => strings(l)(key))).size).toBe(3);
    }
  });
});

describe('QA-04 - a Rs 0 entry is refused on every form, pointing at "Nothing to enter"', () => {
  for (const section of ['cash_sales', 'upi_sales', 'udhar_sales', 'udhar_collection', 'party_payment', 'purchase', 'expense', 'withdrawal'] as const) {
    it(section, () => {
      const s = book();
      s.openSection(section);
      if (section === 'udhar_sales' || section === 'udhar_collection') s.chooseEntryParty(customer.id);
      if (section === 'party_payment') s.chooseEntryParty(supplier.id);
      type(s, '0');
      const route = ROUTE_FOR_SECTION[section];
      expect(s.commit(route.commits[route.commit]!)).toBeNull();
      expect(s.state.lastRefusal?.field).toBe('amountZero');
      expect(s.store.state.entries).toHaveLength(0);
    });
  }

  it('the banner says it in words and names "Nothing to enter"', () => {
    const s = book();
    s.openSection('cash_sales');
    type(s, '0');
    byTestId(tree(s), 't7-commit').props.onPress();
    expect(text(byTestId(tree(s), 'refusal'))).toContain('Nothing to enter');
  });
});

describe('QA-05 - list rows name their payment mode', () => {
  it('five expenses in five modes read as five different rows', () => {
    const s = book();
    s.openSection('expense');
    for (const option of FORM_C_EXPENSE_COMMITS) {
      type(s, '60');
      s.commit(option);
    }
    const t = tree(s);
    const labels = s.store.state.entries.map((e) => text(byTestId(t, 't9-line-' + e.id)));
    expect(new Set(labels).size).toBe(5);
    expect(labels[1]).toContain('UPI');
    expect(labels[3]).toContain('Udhar');
  });
});

describe('QA-06 - a phone date behind the book refuses entries, with the C-17 style notice', () => {
  const behind = '2026-11-11T12:00:00.000+05:30';
  const ahead = (): Session => book([], () => behind, '2026-11-18');

  it('no form opens, nothing is written, and the notice is the date one', () => {
    const s = ahead();
    expect(s.openSection('cash_sales')).toBe(false);
    expect(s.state.lastRefusal?.field).toBe('dayFuture');
    expect(s.store.state.entries).toHaveLength(0);
    expect(strings('en')('refusal.dayFuture')).toContain("This phone's date looks wrong");
  });

  it('the day-close list is NOT exempt (unlike a stale day): the clock is what is wrong', () => {
    const s = ahead();
    s.goTo('T5');
    expect(s.openSection('purchase')).toBe(false);
    expect(s.state.lastRefusal?.field).toBe('dayFuture');
  });

  it('a form already open when the clock went wrong cannot save either', () => {
    let clock = '2026-11-18T12:00:00.000+05:30';
    const s = book([], () => clock, '2026-11-18');
    expect(s.openSection('cash_sales')).toBe(true);
    type(s, '2');
    clock = behind;
    expect(s.commit({ labelKey: 'formA.mode.cash', section: 'cash_sales', mode: 'cash' })).toBeNull();
    expect(s.store.state.entries).toHaveLength(0);
  });

  it('Today shows no entry tiles while the date is behind', () => {
    const s = ahead();
    const t = render(<Today store={s.store} />);
    expect(all(t).some((n) => String(n.props?.testID).startsWith('t1-act-'))).toBe(false);
    expect(all(t).some((n) => n.props?.testID === 't1-future')).toBe(true);
  });
});

describe('QA-07 - a fresh form shows no red reason it has not earned', () => {
  it('Pay with no supplier and no amount is clean; the reason appears once an amount is typed', () => {
    const s = book();
    s.openSection('party_payment');
    const has = () => all(tree(s)).some((n) => n.props?.testID === 't8-party-required');
    expect(has()).toBe(false);
    type(s, '5');
    expect(has()).toBe(true);
  });

  it('a refusal does not survive Back into the next form', () => {
    const s = book();
    s.openSection('udhar_sales');
    s.refuse('partyId', 'x');
    s.back();
    s.openSection('party_payment');
    expect(s.state.lastRefusal).toBeNull();
  });
});

describe('QA-10 - the refusal banner is drawn above the header', () => {
  it('its elevation is higher than the header it overlaps', () => {
    const s = book();
    s.refuse('wrongShop', 'x');
    const banner = byTestId(tree(s), 'refusal');
    const style = Array.isArray(banner.props.style) ? Object.assign({}, ...banner.props.style) : banner.props.style;
    expect(style.elevation).toBeGreaterThan(tokens('comfort').elevation.card);
  });
});
