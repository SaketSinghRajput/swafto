/**
 * HUMAN-TESTER PASS 7: HT-49, HT-52, HT-53, HT-54 (docs/handover/DEFECTS.md).
 */
import { describe, it, expect } from 'vitest';
import { Session } from '../src/app/session.tsx';
import { App } from '../src/app/App.tsx';
import { DayClosed } from '../src/screens/T14.tsx';
import { Store, memoryPort, type StoreState } from '../src/store/index.ts';
import { render, byTestId, all, text } from './render.tsx';
import { phrase } from '../src/i18n/strings.ts';
import { tokens } from '../src/theme/tokens.ts';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';

const T0 = CANONICAL_DATE + 'T19:00:00.000Z';
const OPENING = 100000; // ₹1,000 and no entries, so the expected cash is ₹1,000

function bookWith(day: Partial<StoreState['day']> = {}): Store {
  const base = canonicalInput();
  return new Store(
    memoryPort({
      shopId: 'shop-canonical',
      day: { ...base.day, state: 'open', openingCash: OPENING, ...day },
      entries: [],
      parties: CANONICAL_PARTIES,
      priorCreditOutstanding: 0,
      priorSupplierOutstanding: 0,
      skippedSections: [],
    }),
    () => T0,
  );
}

function sessionOn(store: Store): Session {
  let n = 0;
  return new Session(store, { now: () => T0, newId: () => 'e' + String(++n) });
}

const type = (s: Session, digits: string) => {
  for (const d of digits) s.press(d as '0');
};
const tree = (s: Session) => render(<App session={s} />);
const banner = (s: Session) => all(tree(s)).find((n) => n.props?.testID === 'refusal');
const count = (s: Session, rupees: string) => {
  s.goTo('T11');
  type(s, rupees);
  s.confirmCount();
};
const closeTheDay = (s: Session) => {
  count(s, '1000');
  s.closeDay();
};

describe('HT-49 · a reason belongs to a difference, not to a count that matched', () => {
  it('over, "Counted wrong", then an exact recount: the day closes with no reason', () => {
    const s = sessionOn(bookWith());
    count(s, '1050');
    expect(s.state.screen).toBe('T12');
    s.setReason('t12.reason.miscount');
    s.back();
    count(s, '1000');
    expect(s.state.screen).toBe('T13');
    expect(s.state.reason).toBeNull();
    expect(s.closeDay()).toBe(true);
    expect(s.store.state.day.countedCash).toBe(OPENING);
    expect(s.store.state.day.differenceReason).toBeUndefined();
  });

  it('the store itself drops a reason handed to a matching close (the shared point)', () => {
    const store = bookWith();
    store.close(OPENING, 't12.reason.miscount');
    expect(store.state.day.differenceReason).toBeUndefined();
  });

  it('a difference still keeps its reason', () => {
    const store = bookWith();
    store.close(105000, 't12.reason.miscount');
    expect(store.state.day.differenceReason).toBe('t12.reason.miscount');
  });

  it('a row an older build wrote (matched, with a reason) is shown with none on R1 and T14', () => {
    const store = bookWith({
      state: 'closed',
      countedCash: OPENING,
      differenceReason: 't12.reason.miscount',
      closedAt: T0,
    });
    const checks = store.basicReports().cashChecks;
    expect(checks.balancedDays).toBe(1);
    expect(checks.days[0]?.reason).toBeUndefined();
    const t14 = render(<DayClosed store={store} />);
    expect(text(byTestId(t14, 't14-difference'))).not.toContain(phrase('t12.reason.miscount', 'en'));
  });
});

describe('HT-52 · a closed day offers no form from a party page (D7)', () => {
  it('"New udhar sale" on P2 stays on P2 and says the day is closed, before any typing', () => {
    const s = sessionOn(bookWith());
    closeTheDay(s);
    s.openParty('p-ramesh');
    s.openSectionFor('udhar_sales', 'p-ramesh');
    expect(s.state.screen).toBe('P2');
    const b = banner(s);
    expect(b).toBeDefined();
    expect(text(b!)).toContain(phrase('t3.banner', 'en'));
    expect(text(b!)).toContain(phrase('refusal.titleNotDone', 'en'));
  });

  it('an entry refused by the closed day names the closed day, not "nothing was recorded"', () => {
    const s = sessionOn(bookWith());
    closeTheDay(s);
    s.goTo('T7');
    type(s, '10');
    expect(s.commit({ labelKey: 'common.save', section: 'cash_sales', mode: 'cash' })).toBeNull();
    expect(s.state.lastRefusal?.field).toBe('dayClosed');
    const b = text(banner(s)!);
    expect(b).toContain(phrase('t3.banner', 'en'));
    expect(b).not.toContain(phrase('refusal.other', 'en'));
  });
});

describe('HT-53 · a refusal does not outlive its screen, nor sit over the way back', () => {
  it('the wrong-shop refusal on A3 is gone once the code is sent and A4 is up', () => {
    const s = new Session(bookWith(), { now: () => T0, newId: () => 'x', screen: 'A4' });
    s.wrongShop();
    expect(s.state.screen).toBe('A3');
    expect(s.state.lastRefusal?.field).toBe('wrongShop');
    s.codeSent(false);
    expect(s.state.screen).toBe('A4');
    expect(s.state.lastRefusal).toBeNull();
  });

  it('the banner leaves the header back control uncovered, so one tap on Back goes back', () => {
    const s = sessionOn(bookWith());
    s.openSection('cash_sales');
    s.commit({ labelKey: 'common.save', section: 'cash_sales', mode: 'cash' }); // nothing typed: refused
    const t = tokens('comfort');
    const left = banner(s)!.props.style.left as number;
    expect(left).toBeGreaterThanOrEqual(t.space.md + t.control.md + t.space.sm);
  });

  it('one hardware Back after a refusal leaves the form and clears the banner', () => {
    const s = sessionOn(bookWith());
    s.openParty('p-ramesh');
    s.openSectionFor('udhar_sales', 'p-ramesh');
    s.commit({ labelKey: 'common.save', section: 'udhar_sales', mode: 'udhar' });
    expect(s.state.lastRefusal).not.toBeNull();
    expect(s.back()).toBe(true);
    expect(s.state.screen).toBe('P2');
    expect(s.state.lastRefusal).toBeNull();
  });
});

describe('HT-54 · refusals that are not saves are not headed "Not saved"', () => {
  for (const field of ['wrongShop', 'consentRead', 'eraseOffline', 'erase', 'eraseSignIn', 'eraseLocal']) {
    it(field, () => {
      const s = sessionOn(bookWith());
      s.refuse(field, 'x');
      const b = text(banner(s)!);
      expect(b).toContain(phrase('refusal.titleNotDone', 'en'));
      expect(b).not.toContain(phrase('refusal.title', 'en'));
    });
  }

  it('a save refusal is still "Not saved"', () => {
    const s = sessionOn(bookWith());
    s.refuse('amount', 'x');
    expect(text(banner(s)!)).toContain(phrase('refusal.title', 'en'));
  });
});
