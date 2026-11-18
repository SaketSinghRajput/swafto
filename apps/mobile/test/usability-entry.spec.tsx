/**
 * USABILITY §4 ITEMS 4, 6 AND 7, DRIVEN THROUGH THE REAL SESSION AND APP.
 *
 * The screen tests prove each face renders what it is handed. These prove the
 * app HANDS it: the "Saved ₹50 · Cash" line exists only if `Session.commit`
 * records which entry it saved and `App` passes it through; the undo on the day
 * close list exists only if the tap reaches `Store.unskip`. That wiring is the
 * part this build has broken before (entryRoutes.ts tells the story), so it is
 * asserted end to end rather than assumed.
 */
import { describe, it, expect } from 'vitest';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';
import { formatPaise, subtract, type Entry } from '@swafto/formula-engine';
import { Session } from '../src/app/session.tsx';
import { App } from '../src/app/App.tsx';
import { Store, memoryPort, type StoreState } from '../src/store/index.ts';
import { FORM_A_COMMITS, FORM_B_COMMITS } from '../src/screens/entryRoutes.ts';
import { phrase } from '../src/i18n/strings.ts';
import { tokens } from '../src/theme/tokens.ts';
import { render, byTestId, all, text } from './render.tsx';

const T0 = CANONICAL_DATE + 'T14:32:00.000+05:30';
const customer = CANONICAL_PARTIES.find((p) => p.kind === 'customer')!;
const supplier = CANONICAL_PARTIES.find((p) => p.kind === 'supplier')!;

const row = (id: string, section: Entry['section'], mode: Entry['mode'], amount: number, partyId?: string): Entry =>
  ({ id, dayId: CANONICAL_DATE, section, amount, mode, source: 'manual', createdAt: T0, ...(partyId ? { partyId } : {}) }) as Entry;

/** A second passes per call, as between a tap on a name and the next key (HT-22 swallows keys for a moment). */
let tick = 0;
const ticking = () => new Date(Date.parse(T0) + 1000 * tick++).toISOString();

function book(entries: Entry[] = [], now: () => string = () => T0): Session {
  const base = canonicalInput();
  const state: StoreState = {
    shopId: 'shop-canonical',
    day: { ...base.day, state: 'open', openingCash: 100000 },
    entries,
    parties: CANONICAL_PARTIES,
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
    skippedSections: [],
  };
  let n = 0;
  return new Session(new Store(memoryPort(state), () => T0), { now, newId: () => 'n' + String(++n) });
}
const type = (s: Session, digits: string) => {
  for (const d of digits) s.press(d as '0');
};
const tree = (s: Session) => render(<App session={s} />);
const ids = (t: ReturnType<typeof render>) => all(t).map((n) => String(n.props?.testID ?? ''));

describe('USABILITY item 6 - Add is the strongest control, and a save says so', () => {
  // v2 "Mitra": the primary fill moved from marigold `accent` to `brand` (DESIGN-SYSTEM-V2 1.1, M2).
  it('Add is a live primary (brand) button even at zero, and a tap with nothing typed is answered in words', () => {
    const s = book();
    s.openSection('cash_sales');
    const t = tokens('comfort');
    const add = byTestId(tree(s), 't7-commit');
    expect(add.props.disabled).toBe(false);
    expect(add.props.style.backgroundColor).toBe(t.color.brand);
    expect(add.props.style.minHeight).toBe(t.control.lg);
    add.props.onPress();
    // Nothing saved, and the reason is said - not a dead key.
    expect(s.store.state.entries).toHaveLength(0);
    expect(s.state.lastRefusal?.field).toBe('amount');
  });

  it('Add sits directly above the keypad, after the mode choice', () => {
    const s = book();
    s.openSection('cash_sales');
    const footer = ids(byTestId(tree(s), 't7-footer'));
    const at = (id: string) => footer.indexOf(id);
    expect(at('t7-mode')).toBeGreaterThanOrEqual(0);
    expect(at('t7-mode')).toBeLessThan(at('t7-commit'));
    expect(at('t7-commit')).toBeLessThan(at('keypad'));
  });

  it('mutates the store: after Add the form says "Saved ₹50 · Cash" and the new row is first, with its time', () => {
    const s = book([row('old', 'cash_sales', 'cash', 2000)]);
    s.openSection('cash_sales');
    type(s, '50');
    const saved = s.commit(FORM_A_COMMITS[0]!);
    expect(saved).not.toBeNull();
    expect(s.state.lastSavedId).toBe(saved!.id);
    const t = tree(s);
    expect(text(byTestId(t, 't7-saved-amount'))).toBe(formatPaise(5000, { withSign: false }));
    expect(text(byTestId(t, 't7-saved'))).toContain(phrase('entry.saved', 'en'));
    expect(text(byTestId(t, 't7-saved-mode'))).toContain(phrase('formA.mode.cash', 'en'));
    expect(byTestId(t, 't7-saved').props.accessibilityLabel).toBe('Saved ₹50.00, Cash');
    const lines = ids(byTestId(t, 't7-lines')).filter((id) => id.startsWith('t7-line-'));
    expect(lines[0]).toBe('t7-line-' + saved!.id);
    expect(lines.at(-1)).toBe('t7-line-old');
    expect(text(byTestId(t, 't7-line-' + saved!.id))).toContain(' · 14:32');
  });

  it('leaving the form forgets the confirmation - it belongs to the form that saved', () => {
    const s = book();
    s.openSection('cash_sales');
    type(s, '50');
    s.commit(FORM_A_COMMITS[0]!);
    s.goTo('T1');
    expect(s.state.lastSavedId).toBeNull();
    s.openSection('cash_sales');
    expect(ids(tree(s))).not.toContain('t7-saved');
  });
});

describe('USABILITY item 4 - the udhar screens: right titles, no early error, balances', () => {
  it('the title is the job: Collect, Pay supplier, Udhar sale - and pay shows what you owe suppliers', () => {
    const s = book([row('s1', 'udhar_sales', 'udhar', 4500, customer.id)]);
    s.openSection('udhar_collection');
    expect(text(byTestId(tree(s), 't8-title'))).toBe('Collect');
    s.openSection('party_payment');
    const pay = tree(s);
    expect(text(byTestId(pay, 't8-title'))).toBe('Pay supplier');
    expect(text(byTestId(pay, 't8-total'))).toContain(phrase('p1.youOwe', 'en'));
    expect(text(byTestId(pay, 't8-total'))).not.toContain(phrase('t8.outstanding', 'en'));
    expect(text(byTestId(pay, 't8-headline'))).toBe(
      formatPaise(s.store.primary().p8SupplierOutstanding.value, { withSign: false }),
    );
    s.openSection('udhar_sales');
    expect(text(byTestId(tree(s), 't8-title'))).toBe('Udhar sale');
  });

  /*
   * WAVE 5 VERIFIER GAP, CLOSED (docs/audit/findings/verifier-wave5.md): when
   * `t8.title` split into three keys, Collect kept its hi/or assertion (T8's
   * own test) and Pay / Udhar sale were asserted in English only. The title is
   * the job he is doing, and a wrong-language title on the money-OUT form is
   * the one a shopkeeper reading Odia would act on. Asserted here in hi and or,
   * through the real session route, against the strings table AND against the
   * other two titles - so a copy-paste of one key into another also fails.
   */
  for (const language of ['hi', 'or'] as const) {
    it(language + ': Pay supplier and Udhar sale are titled in that language, each its own words', () => {
      const s = book([row('s1', 'udhar_sales', 'udhar', 4500, customer.id)]);
      s.setLanguage(language);
      s.openSection('party_payment');
      const pay = text(byTestId(tree(s), 't8-title'));
      s.openSection('udhar_sales');
      const credit = text(byTestId(tree(s), 't8-title'));
      s.openSection('udhar_collection');
      const collect = text(byTestId(tree(s), 't8-title'));
      expect(pay).toBe(phrase('t8.title.pay', language));
      expect(credit).toBe(phrase('t8.title.credit', language));
      expect(collect).toBe(phrase('t8.title.collect', language));
      expect(new Set([pay, credit, collect]).size).toBe(3);
      for (const title of [pay, credit]) {
        expect(title).not.toBe(phrase('t8.title.pay', 'en'));
        expect(title).not.toBe(phrase('t8.title.credit', 'en'));
      }
    });
  }

  it('no refusal is on screen before he has done anything', () => {
    const s = book();
    s.openSection('udhar_collection');
    const fresh = ids(tree(s));
    expect(fresh).not.toContain('t8-party-required');
    expect(fresh).not.toContain('refusal');
  });

  it('the picker shows what each person owes, in large type, with a name a reader can tell apart', () => {
    const s = book([row('s1', 'udhar_sales', 'udhar', 4500, customer.id)]);
    s.openSection('udhar_collection');
    s.openPartyPicker();
    const t = tree(s);
    const owed = s.store.partyBalance(customer.id);
    expect(text(byTestId(t, 't8-picker-' + customer.id + '-amount'))).toBe(formatPaise(owed, { withSign: false }));
    const names = all(t)
      .filter((n) => /^t8-picker-p-[a-z]+$/.test(String(n.props?.testID ?? '')))
      .map((n) => n.props.accessibilityLabel as string);
    expect(names.length).toBeGreaterThan(1);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain(customer.name + ', owes ₹45.00');
  });

  it('mutates the store: after choosing, his balance sits above the pad and follows the book', () => {
    const s = book([row('s1', 'udhar_sales', 'udhar', 4500, customer.id)]);
    s.openSection('udhar_collection');
    s.chooseEntryParty(customer.id);
    expect(text(byTestId(tree(s), 't8-party-balance-amount'))).toBe('₹45.00');
    s.store.append(row('s2', 'udhar_sales', 'udhar', 1000, customer.id));
    expect(text(byTestId(tree(s), 't8-party-balance-amount'))).toBe('₹55.00');
    expect(byTestId(tree(s), 't8-party').props.accessibilityLabel).toBe(customer.name + ', owes ₹55.00');
  });

  it('QA-03 is kept: more than is owed still asks before it records an advance', () => {
    const s = book([row('s1', 'udhar_sales', 'udhar', 4500, customer.id)], ticking);
    s.openSection('udhar_collection');
    s.chooseEntryParty(customer.id);
    type(s, '500');
    expect(s.commit(FORM_B_COMMITS[0]!)).toBeNull();
    expect(ids(tree(s))).toContain('t8-advance');
    expect(s.store.state.entries).toHaveLength(1);
  });

  it('a supplier is named with "you owe", and an advance in words with its size', () => {
    const s = book([row('p1', 'party_payment', 'cash', 3000, supplier.id)]);
    s.openSection('party_payment');
    s.chooseEntryParty(supplier.id);
    const bal = s.store.partyBalance(supplier.id);
    expect(bal).toBeLessThan(0);
    const label = byTestId(tree(s), 't8-party').props.accessibilityLabel as string;
    expect(label).toBe([supplier.name + ', Advance', formatPaise(subtract(0, bal))].join(' '));
  });
});

describe('USABILITY item 7 - "Nothing today" has a one-tap undo, through the app', () => {
  it('mutates the store: skip, then undo, and the section is a question again', () => {
    const s = book();
    s.goTo('T5');
    byTestId(tree(s), 't5-skip-withdrawal').props.onPress();
    expect(s.store.sectionState('withdrawal')).toBe('skipped');
    byTestId(tree(s), 't5-undo-withdrawal').props.onPress();
    expect(s.store.sectionState('withdrawal')).toBe('untouched');
    expect(ids(tree(s))).toContain('t5-skip-withdrawal');
  });

  it('a closed day refuses the undo in words, as it refuses the skip (D7)', () => {
    const s = book();
    s.store.skip('withdrawal');
    s.store.close(s.store.expectedCash().value);
    s.unskipSection('withdrawal');
    expect(s.store.sectionState('withdrawal')).toBe('skipped');
    expect(s.state.lastRefusal?.field).toBe('section');
  });
});

describe('USABILITY item 9 - the cash check through the app at font scale 2.0', () => {
  it('above the chrome cap the pad waits for a tap; at 1.0 it is up', async () => {
    const { fontScale } = await import('./ui-double.tsx');
    const s = book();
    s.goTo('T11');
    expect(ids(tree(s))).toContain('keypad');
    fontScale.value = 2;
    try {
      expect(ids(tree(s))).not.toContain('keypad');
      byTestId(tree(s), 't11-counted').props.onPress();
      expect(ids(tree(s))).toContain('keypad');
    } finally {
      fontScale.value = 1;
    }
  });
});

describe('WCAG 4.1.2 (W6) - a list of sales is a list of different things to a reader', () => {
  it('the return list names each sale with its time and amount, as the face shows its time', async () => {
    const { ReturnOrExchange } = await import('../src/screens/T18.tsx');
    const s = book([
      row('a', 'cash_sales', 'cash', 5000),
      { ...row('b', 'cash_sales', 'cash', 7000), createdAt: CANONICAL_DATE + 'T15:05:00.000+05:30' } as Entry,
    ]);
    const t = render(<ReturnOrExchange store={s.store} />);
    const a = byTestId(t, 't18-sale-a');
    const b = byTestId(t, 't18-sale-b');
    expect(a.props.accessibilityLabel).toContain('14:32');
    expect(a.props.accessibilityLabel).toContain('₹50.00');
    expect(b.props.accessibilityLabel).toContain('15:05');
    expect(b.props.accessibilityLabel).toContain('₹70.00');
    expect(a.props.accessibilityLabel).not.toBe(b.props.accessibilityLabel);
    expect(text(a)).toContain(' · 14:32');
  });
});

describe('USABILITY item 8 - the sync chip is on every screen that holds the book', () => {
  it('Today, the day close list, the Ledger and the person page all carry it, and it follows the outbox', () => {
    const s = book();
    const chip = (screen: Parameters<Session['goTo']>[0], id: string) => {
      s.goTo(screen);
      return text(byTestId(tree(s), id + '-sync-text'));
    };
    expect(chip('T1', 't1')).toBe('Saved');
    s.store.append(row('w1', 'cash_sales', 'cash', 5000));
    expect(chip('T1', 't1')).toBe('1 waiting · safe on phone');
    expect(chip('T5', 't5')).toBe('1 waiting · safe on phone');
    expect(chip('P1', 'p1')).toBe('1 waiting · safe on phone');
    s.openParty(customer.id);
    expect(text(byTestId(tree(s), 'p2-sync-text'))).toBe('1 waiting · safe on phone');
  });
});
