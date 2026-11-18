/**
 * CAN EVERY SECTION ACTUALLY BE RECORDED, THROUGH THE APP, AS ITS TILE SAYS?
 *
 * THE DEFECT THAT MADE THIS FILE NECESSARY. `EntryForm` takes `selectedCommit`
 * and `onSelectCommit`. T7, T8, T9 and T10 each declared both and forwarded
 * both. `App.tsx` passed neither. The only callers that ever supplied them were
 * the four `.test.tsx` files - which rendered the screen component directly and
 * handed it `selectedCommit={index}` themselves.
 *
 * So the tests proved every segment renders correctly, while the shipped app
 * could never reach one. `selectedCommit` was permanently 0 and `onSelectCommit`
 * was the no-op default: the segmented control highlighted on tap and changed
 * nothing. A UPI sale, a credit sale, a supplier payment and every non-cash
 * expense could not be recorded by any path in the product.
 *
 * And because three Today tiles - Credit, Collect and Pay - all open T8, whose
 * first commit is a collection, tapping "Pay" to record money going OUT to a
 * supplier recorded money coming IN from a customer. Wrong sign, wrong party
 * kind, no message.
 *
 * 1998 tests passed over that.
 *
 * WHY THIS TEST IS SHAPED THE WAY IT IS. It renders `<App session={...} />` and
 * never a screen component, because the bug lived in the gap between the two.
 * A test that renders `FormB` and passes the prop itself cannot see a parent
 * that does not pass it. Every assertion below goes through the same path a
 * thumb does: open the section the way a tile opens it, read what the app drew,
 * press what is on the screen.
 */
import { describe, it, expect } from 'vitest';
import { Session } from '../src/app/session.tsx';
import { App } from '../src/app/App.tsx';
import { Store, memoryPort, type StoreState } from '../src/store/index.ts';
import { render, byTestId } from './render.tsx';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';
import { ROUTE_FOR_SECTION } from '../src/screens/entryRoutes.ts';
import type { Section } from '@swafto/formula-engine';

const T0 = CANONICAL_DATE + 'T19:00:00.000Z';

function freshSession(): Session {
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
  let tick = 0;
  return new Session(new Store(memoryPort(state), () => T0), {
    // A second passes per call, as it does between a tap on a name and the next
    // key (HT-22 swallows keys for a moment after the picker closes).
    now: () => new Date(Date.parse(T0) + 1000 * tick++).toISOString(),
    newId: () => 'e' + String(++n),
  });
}

const type = (session: Session, digits: string) => {
  for (const d of digits) session.press(d as '0');
};

/** Every section the engine knows, taken from the route table itself. */
const SECTIONS = Object.keys(ROUTE_FOR_SECTION) as Section[];

/** The EntryForm `id` for each screen, which prefixes its testIDs. */
const FORM_ID = { T7: 't7', T8: 't8', T9: 't9', T10: 't10' } as const;

const partyOfKind = (kind: 'customer' | 'supplier') => {
  const party = CANONICAL_PARTIES.find((p) => p.kind === kind);
  if (party === undefined) throw new Error('fixture has no ' + kind);
  return party;
};

describe('every section is reachable, and lands on its own segment', () => {
  it('the route table covers all eight sections', () => {
    expect(SECTIONS).toHaveLength(8);
  });

  for (const section of SECTIONS) {
    it(section + ': opens its form with its own segment live', () => {
      const s = freshSession();
      s.openSection(section);

      const route = ROUTE_FOR_SECTION[section];
      expect(s.state.screen).toBe(route.screen);

      /*
       * THE ASSERTION THE OLD SUITE WAS MISSING. Not "a segment is selected"
       * but "the selected segment writes the section the shopkeeper asked
       * for". Tapping Pay must arm a payment, not a collection.
       */
      const live = route.commits[s.state.selectedCommit];
      expect(live).toBeDefined();
      expect(live?.section).toBe(section);
    });

    it(section + ': the app draws that segment as the selected one', () => {
      const s = freshSession();
      s.openSection(section);

      const id = FORM_ID[ROUTE_FOR_SECTION[section].screen];
      const tree = render(<App session={s} />);
      const segment = byTestId(tree, id + '-mode-' + String(s.state.selectedCommit));

      // If `App` does not pass `selectedCommit`, the live segment is the 0th
      // and every section but the first on each form fails here.
      expect(segment.props?.accessibilityState?.selected).toBe(true);
    });
  }
});

describe('the segmented control is connected at both ends', () => {
  it('pressing a segment in the app changes what is armed', () => {
    const s = freshSession();
    s.openSection('udhar_collection'); // T8, segment 0
    expect(s.state.selectedCommit).toBe(0);

    const tree = render(<App session={s} />);
    byTestId(tree, 't8-mode-1').props.onPress();

    // Before the fix `onSelectCommit` was the no-op default and this stayed 0.
    expect(s.state.selectedCommit).toBe(1);
    expect(ROUTE_FOR_SECTION.party_payment.commits[1]?.section).toBe('party_payment');
  });
});

describe('a tile records the section it names', () => {
  /*
   * The regression in full. "Pay" is money leaving the shop for a supplier.
   * Before the fix it committed `udhar_collection` - money arriving from a
   * customer - so one tap put the drawer out by twice the amount and named the
   * wrong person.
   */
  it('Pay records a party payment, not a collection', () => {
    const s = freshSession();
    s.openSection('party_payment');
    s.chooseEntryParty(partyOfKind('supplier').id);
    type(s, '1500');

    const tree = render(<App session={s} />);
    byTestId(tree, 't8-commit').props.onPress();
    // QA-03: nothing is owed, so Add asks first; the test is about the section, so say yes.
    byTestId(render(<App session={s} />), 't8-advance-yes').props.onPress();

    const entries = s.store.state.entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]?.section).toBe('party_payment');
    expect(entries[0]?.amount).toBe(150000);
  });

  it('Credit records a credit sale, not a collection', () => {
    const s = freshSession();
    s.openSection('udhar_sales');
    s.chooseEntryParty(partyOfKind('customer').id);
    type(s, '600');

    const tree = render(<App session={s} />);
    byTestId(tree, 't8-commit').props.onPress();

    expect(s.store.state.entries[0]?.section).toBe('udhar_sales');
  });

  /*
   * Purchase had no commit anywhere in the app: all five of T9's options wrote
   * `section: 'expense'`, so buying stock was filed as tea money while T5 and
   * T11 displayed a purchase total nothing could ever add to.
   */
  it('Purchase records a purchase, not an expense', () => {
    const s = freshSession();
    s.openSection('purchase');
    type(s, '3200');

    const tree = render(<App session={s} />);
    byTestId(tree, 't9-commit').props.onPress();

    expect(s.store.state.entries[0]?.section).toBe('purchase');
  });

  it('Expense still records an expense', () => {
    const s = freshSession();
    s.openSection('expense');
    type(s, '180');

    const tree = render(<App session={s} />);
    byTestId(tree, 't9-commit').props.onPress();

    expect(s.store.state.entries[0]?.section).toBe('expense');
  });

  it('a UPI sale is reachable, and is not a cash sale', () => {
    const s = freshSession();
    s.openSection('upi_sales');
    type(s, '900');

    const tree = render(<App session={s} />);
    byTestId(tree, 't7-commit').props.onPress();

    const entry = s.store.state.entries[0];
    expect(entry?.section).toBe('upi_sales');
    expect(entry?.mode).toBe('upi');
  });
});
