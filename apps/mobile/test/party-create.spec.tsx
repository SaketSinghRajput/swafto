/**
 * F-10 - A NEW SHOP COULD NOT RECORD A SINGLE UDHAR.
 *
 * Credit, Collect, Pay and an udhar purchase all refuse an entry naming nobody,
 * and the picker could only list the parties already in the book. On day one
 * the book is empty, so the credit book was sealed shut.
 *
 * Driven through `<App>` and the controls it draws, never a screen component,
 * because every defect in this area so far lived in the wiring between the two.
 */
import { describe, it, expect } from 'vitest';
import { Session } from '../src/app/session.tsx';
import { App } from '../src/app/App.tsx';
import { Store, memoryPort, type StoreState } from '../src/store/index.ts';
import { render, byTestId, all } from './render.tsx';
import { canonicalInput, CANONICAL_DATE, CANONICAL_PARTIES } from '@swafto/fixtures';

const T0 = CANONICAL_DATE + 'T19:00:00.000Z';

/** A shop on its first day: nobody in the book. */
function newShop(parties: StoreState['parties'] = []): Session {
  const base = canonicalInput();
  const state: StoreState = {
    shopId: 'shop-new',
    day: { ...base.day, state: 'open', openingCash: 100000 },
    entries: [],
    parties,
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
    skippedSections: [],
  };
  let n = 0;
  return new Session(new Store(memoryPort(state), () => T0), {
    now: () => T0,
    newId: () => '0190a000-0000-7000-8000-00000000000' + String(++n),
  });
}

const type = (session: Session, digits: string) => {
  for (const d of digits) session.press(d as '0');
};
const press = (session: Session, id: string) => byTestId(render(<App session={session} />), id).props.onPress();
const typeInto = (session: Session, id: string, text: string) =>
  byTestId(render(<App session={session} />), id).props.onChangeText(text);

describe('F-10: a party can be created from the picker, mid-entry', () => {
  it('Credit on a new shop: add a customer, keep the amount, commit against him', () => {
    const s = newShop();
    s.openSection('udhar_sales');
    type(s, '600');

    press(s, 't8-party');
    // The empty book says so, and offers the way out of it.
    const picker = render(<App session={s} />);
    expect(byTestId(picker, 't8-picker-empty')).toBeDefined();
    press(s, 't8-picker-add');

    typeInto(s, 't8-picker-new-name', '  Ramesh ');
    typeInto(s, 't8-picker-new-phone', '98610 42317');
    press(s, 't8-picker-new-save');

    // The half-typed amount survived naming a new customer.
    expect(s.state.draftPaise).toBe(60000);
    expect(s.state.pickingParty).toBe(false);
    const party = s.store.state.parties[0];
    expect(s.store.state.parties).toHaveLength(1);
    expect(party).toEqual({
      id: '0190a000-0000-7000-8000-000000000001',
      kind: 'customer',
      name: 'Ramesh',
      phone: '9861042317',
    });
    // The form now names him.
    expect(byTestId(render(<App session={s} />), 't8-party-value').text).toBe('Ramesh');

    press(s, 't8-commit');
    const entry = s.store.state.entries[0];
    expect(entry?.section).toBe('udhar_sales');
    expect(entry?.partyId).toBe(party?.id);
    expect(entry?.amount).toBe(60000);
    // And the party itself is queued to sync, not only held in memory.
    expect(s.store.pendingOutbox.some((r) => r.kind === 'party')).toBe(true);
  });

  it('Pay adds a SUPPLIER, not a customer', () => {
    const s = newShop();
    s.openSection('party_payment');
    type(s, '1500');
    press(s, 't8-party');
    expect(byTestId(render(<App session={s} />), 't8-picker-add').text).toContain('supplier');
    press(s, 't8-picker-add');
    typeInto(s, 't8-picker-new-name', 'Agarwal Traders');
    press(s, 't8-picker-new-save');
    press(s, 't8-commit');
    // QA-03: nothing is owed, so Add asks first; the test is about the section, so say yes.
    press(s, 't8-advance-yes');

    expect(s.store.state.parties[0]?.kind).toBe('supplier');
    expect(s.store.state.entries[0]?.section).toBe('party_payment');
  });

  it('an udhar purchase on T9 can add its supplier too', () => {
    const s = newShop();
    s.openSection('purchase');
    s.selectCommit(3); // udhar
    type(s, '3200');
    press(s, 't9-party');
    press(s, 't9-picker-add');
    typeInto(s, 't9-picker-new-name', 'Mohanty Distributors');
    press(s, 't9-picker-new-save');
    press(s, 't9-commit');

    expect(s.store.state.entries[0]?.mode).toBe('udhar');
    expect(s.store.state.entries[0]?.partyId).toBe(s.store.state.parties[0]?.id);
  });

  it('no phone means NO phone field - never an empty string the server would refuse', () => {
    const s = newShop();
    s.openSection('udhar_collection');
    press(s, 't8-party');
    press(s, 't8-picker-add');
    typeInto(s, 't8-picker-new-name', 'Suresh');
    press(s, 't8-picker-new-save');

    const party = s.store.state.parties[0];
    expect(party).toBeDefined();
    expect(party && 'phone' in party).toBe(false);
  });

  it('a bad phone is refused out loud, keeps what he typed, and adds nobody', () => {
    const s = newShop();
    s.openSection('udhar_sales');
    type(s, '450');
    press(s, 't8-party');
    press(s, 't8-picker-add');
    typeInto(s, 't8-picker-new-name', 'Lakshmi');
    typeInto(s, 't8-picker-new-phone', '12345');
    press(s, 't8-picker-new-save');

    expect(s.store.state.parties).toHaveLength(0);
    expect(s.state.draftPaise).toBe(45000);
    expect(s.state.newParty).toEqual({ name: 'Lakshmi', phone: '12345' });
    const tree = render(<App session={s} />);
    const banner = byTestId(tree, 'refusal');
    expect(banner.text).toContain('10 digits');
  });

  it('an empty name cannot be saved: the button is drawn disabled, and the method refuses', () => {
    const s = newShop();
    s.openSection('udhar_sales');
    press(s, 't8-party');
    press(s, 't8-picker-add');
    typeInto(s, 't8-picker-new-name', '   ');
    const save = byTestId(render(<App session={s} />), 't8-picker-new-save');
    expect(save.props.disabled ?? save.props.accessibilityState?.disabled).toBe(true);

    expect(s.createParty('customer')).toBe(false);
    expect(s.state.lastRefusal?.field).toBe('partyName');
    expect(byTestId(render(<App session={s} />), 'refusal').text).toContain('name');
  });

  it('"back to the list" adds nobody and keeps the picker open', () => {
    const s = newShop(CANONICAL_PARTIES);
    s.openSection('udhar_sales');
    press(s, 't8-party');
    press(s, 't8-picker-add');
    typeInto(s, 't8-picker-new-name', 'Half typed');
    press(s, 't8-picker-new-cancel');

    expect(s.state.newParty).toBeNull();
    expect(s.state.pickingParty).toBe(true);
    expect(s.store.state.parties).toHaveLength(CANONICAL_PARTIES.length);
    // The list is back, with the existing names still choosable.
    const tree = render(<App session={s} />);
    expect(all(tree).some((n) => n.props?.testID === 't8-picker-add')).toBe(true);
  });

  it('the name field offers no prediction of any kind', () => {
    const s = newShop();
    s.openSection('udhar_sales');
    press(s, 't8-party');
    press(s, 't8-picker-add');
    const name = byTestId(render(<App session={s} />), 't8-picker-new-name');
    expect(name.props.autoCorrect).toBe(false);
    expect(name.props.spellCheck).toBe(false);
    expect(name.props.autoComplete).toBe('off');
    expect(name.props.importantForAutofill).toBe('no');
  });
});
