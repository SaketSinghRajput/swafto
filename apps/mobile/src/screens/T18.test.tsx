/**
 * T18 RETURN OR EXCHANGE - the §B.6 bar, and the event it records.
 *
 * WHAT THIS PINS, IN ORDER OF WHAT IT WOULD COST TO GET WRONG.
 *   1. Save records ONE event the store then folds to the state he chose - a
 *      credit issued folds to Credit issued, an exchange to Replacement - and
 *      the engine figures move by exactly what review §7 says they should.
 *   2. Nothing is prefilled: the value of what came back starts EMPTY and Save
 *      is disabled until he types it (no inference in data entry).
 *   3. A return that creates a liability to a person names that person first.
 *   4. A sale returned in full is not offered again; a pending return is.
 *
 * Driven through `<App session>` where the wiring matters, because a screen
 * whose prop is wired at one end only passes its own tests and does nothing in
 * the shipped app - the defect `App.tsx` records twice already.
 */
import { describe, it, expect } from 'vitest';
import { ReturnOrExchange } from './T18.tsx';
import { CashCheck } from './T11.tsx';
import { CustomerDetail } from './P2.tsx';
import { canonicalStore, adversarialStore, emptyStore, returnsStore, RETURN_IDS } from './registry.tsx';
import { Session } from '../app/session.tsx';
import { App } from '../app/App.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { CANONICAL_DATE } from '@swafto/fixtures';
import { formatPaise, subtract, type Paise } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language, type StringKey } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

const T0 = CANONICAL_DATE + 'T19:00:00.000Z';

const sessionOn = (store: Store): Session => {
  let n = 0;
  return new Session(store, { now: () => T0, newId: () => 'n' + String(++n) });
};

const type = (s: Session, digits: string) => {
  for (const d of digits) s.press(d as '0');
};

const money = (amount: Paise) => formatPaise(amount, { withSign: false });

const press = (s: Session, testID: string) => byTestId(render(<App session={s} />), testID).props.onPress();

/** The return just recorded: the newest `sales_return` in the book. */
const lastReturn = (store: Store) => {
  const ret = store.recentReturns(1)[0];
  if (ret === undefined) throw new Error('no return was recorded');
  return ret;
};

/** A session already on one sale's return form. */
const onForm = (store: Store, saleId: string): Session => {
  const s = sessionOn(store);
  s.openReturns();
  s.chooseReturnSale(saleId);
  return s;
};

describe('T18 renders all four states', () => {
  it('loading', () => {
    const tree = render(<ReturnOrExchange store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 't18-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error', () => {
    expect(byTestId(render(<ReturnOrExchange store={canonicalStore()} status="error" />), 't18-error')).toBeTruthy();
  });

  it('empty: no sale yet means nothing can come back', () => {
    const tree = render(<ReturnOrExchange store={emptyStore()} />);
    expect(text(byTestId(tree, 't18-empty'))).toBe(phrase('t18.empty', 'en'));
  });

  it('loaded: every sale on the book is offered, nothing else is', () => {
    const store = canonicalStore();
    const tree = render(<ReturnOrExchange store={store} />);
    const offered = all(tree).filter((n) => /^t18-sale-/.test(String(n.props?.testID ?? '')));
    const sales = store.state.entries.filter((e) => /_sales$/.test(e.section));
    expect(offered).toHaveLength(sales.length);
    expect(offered.length).toBeLessThan(store.state.entries.length);
  });
});

describe('the list - what can still come back, and what is still owed', () => {
  it('a sale returned in full is not offered; a part-returned one shows what is left', () => {
    const store = returnsStore(canonicalStore());
    const tree = render(<ReturnOrExchange store={store} />);
    // c-04 came back in full (the pending fixture) and is gone from the list.
    expect(all(tree).some((n) => n.props?.testID === 't18-sale-c-04')).toBe(false);
    // c-01 came back in part: the row carries what is still returnable, not the sale.
    const left = subtract(store.findEntry('c-01')!.amount, 120000);
    const row = byTestId(tree, 't18-sale-c-01');
    expect(text(row)).toContain(money(left));
    expect(text(row)).toContain(phrase('t18.partReturned', 'en'));
  });

  it('a pending return is offered for settling, at what is outstanding', () => {
    const store = returnsStore(canonicalStore());
    const tree = render(<ReturnOrExchange store={store} />);
    const pending = store.findEntry(RETURN_IDS.pending)!;
    expect(text(byTestId(tree, 't18-pending-' + RETURN_IDS.pending))).toContain(
      money(store.settlement(pending).outstanding),
    );
  });

  it('the recorded line names the state in review §7 words', () => {
    const s = onForm(canonicalStore(), 'c-05'); // Sunita, credit sale - named, so pending is allowed
    s.setReturnSettlement('pending');
    type(s, '450');
    s.commitReturn();
    const tree = render(<App session={s} />);
    expect(text(byTestId(tree, 't18-recorded'))).toBe('Recorded · Returned + Pending settlement');
  });
});

describe('Save records one event, and the store folds it', () => {
  it('credit issued: mutates the store, folds to Credit issued, and comes off net sales and udhar', () => {
    const store = canonicalStore();
    const salesBefore = store.primary().p4NetSales.value;
    const creditBefore = store.primary().p7CreditOutstanding.value;

    const s = onForm(store, 'c-04'); // Ramesh, a credit sale of ₹900
    s.setReturnSettlement('udhar');
    type(s, '900');
    press(s, 't18-save');

    const ret = lastReturn(store);
    expect(ret.refersToEntryId).toBe('c-04');
    expect(store.settlement(ret).state).toBe('credit_issued');
    // Revenue follows the goods: net sales down by what came back, and no more.
    expect(subtract(salesBefore, store.primary().p4NetSales.value)).toBe(90000);
    // Credit issued comes off what Ramesh owes (P7).
    expect(subtract(creditBefore, store.primary().p7CreditOutstanding.value)).toBe(90000);
    // And the screen says so, back on the list.
    expect(text(byTestId(render(<App session={s} />), 't18-recorded'))).toContain(
      phrase('settlement.credit_issued', 'en'),
    );
  });

  it('exchange: one event of three legs, folds to Replacement, the drawer gets only the difference', () => {
    const store = canonicalStore();
    const cashBefore = store.expectedCash().value;
    const salesBefore = store.primary().p4NetSales.value;

    const s = onForm(store, 'c-02'); // a cash sale of ₹1,310, nobody named
    s.setReturnSettlement('exchange');
    type(s, '500');
    s.setReturnField('replacement');
    type(s, '800');
    // The difference is arithmetic on his two figures, shown before the tap.
    const tree = render(<App session={s} />);
    expect(text(byTestId(tree, 't18-difference-line'))).toContain(money(30000));
    expect(text(byTestId(tree, 't18-difference-line'))).toContain(phrase('t18.diffFrom', 'en'));
    byTestId(tree, 't18-save').props.onPress();

    const ret = lastReturn(store);
    const legs = store.entriesReferringTo(ret.id).map((e) => e.section).sort();
    expect(legs).toEqual(['exchange_out', 'exchange_receipt']);
    expect(store.settlement(ret).state).toBe('replacement');
    expect(subtract(store.expectedCash().value, cashBefore)).toBe(30000);
    expect(subtract(store.primary().p4NetSales.value, salesBefore)).toBe(30000);
  });

  it('pending, then settled in two parts: Pending stays Pending until it is paid in full', () => {
    const store = canonicalStore();
    const s = onForm(store, 'c-05'); // Sunita, a credit sale of ₹450
    s.setReturnSettlement('pending');
    type(s, '450');
    press(s, 't18-save');
    const ret = lastReturn(store);
    expect(store.settlement(ret).state).toBe('pending_settlement');

    s.chooseSettleReturn(ret.id);
    type(s, '200');
    press(s, 't18-save');
    expect(store.settlement(ret).state).toBe('pending_settlement');
    expect(store.settlement(ret).outstanding).toBe(25000);

    s.chooseSettleReturn(ret.id);
    type(s, '250');
    press(s, 't18-save');
    expect(store.settlement(ret).state).toBe('refund_paid');
  });
});

describe('no inference, and no tap that can only fail', () => {
  it('nothing is prefilled: the amount starts empty and Save is disabled', () => {
    const s = onForm(canonicalStore(), 'c-01');
    expect(s.state.returnFlow?.returned).toBeNull();
    const tree = render(<App session={s} />);
    expect(text(byTestId(tree, 't18-draft-amount'))).toBe(money(0));
    expect(byTestId(tree, 't18-save').props.disabled).toBe(true);
  });

  it('more than the sale can take back is refused before the tap, in words', () => {
    const s = onForm(canonicalStore(), 'c-02'); // ₹1,310
    type(s, '2000');
    const tree = render(<App session={s} />);
    expect(text(byTestId(tree, 't18-too-much'))).toBe(phrase('t18.tooMuch', 'en'));
    expect(byTestId(tree, 't18-save').props.disabled).toBe(true);
  });

  it('pending on a sale that names nobody asks for the customer first', () => {
    const store = canonicalStore();
    const s = onForm(store, 'c-02');
    s.setReturnSettlement('pending');
    type(s, '300');
    let tree = render(<App session={s} />);
    expect(text(byTestId(tree, 't18-party-required'))).toBe(phrase('party.required', 'en'));
    expect(byTestId(tree, 't18-save').props.disabled).toBe(true);

    byTestId(tree, 't18-party').props.onPress();
    expect(s.state.pickingParty).toBe(true);
    s.chooseEntryParty('p-ramesh');
    tree = render(<App session={s} />);
    expect(byTestId(tree, 't18-save').props.disabled).toBe(false);
    byTestId(tree, 't18-save').props.onPress();
    expect(lastReturn(store).partyId).toBe('p-ramesh');
  });

  it('a cash refund on a sale with no customer asks for nobody', () => {
    const s = onForm(canonicalStore(), 'c-02');
    type(s, '100');
    const tree = render(<App session={s} />);
    expect(all(tree).some((n) => n.props?.testID === 't18-party')).toBe(false);
    expect(byTestId(tree, 't18-save').props.disabled).toBe(false);
  });

  it('the copy says he confirmed, never that anything was verified (EX-11)', () => {
    for (const language of ['en', 'hi', 'or'] as const) {
      expect(phrase('t18.confirm', language).toLowerCase()).not.toContain('verif');
    }
    expect(phrase('t18.confirm', 'en')).toContain('You confirm');
  });

  it('back from a form returns to the list, not out of the screen', () => {
    const s = onForm(canonicalStore(), 'c-01');
    press(s, 't18-back');
    expect(s.state.screen).toBe('T18');
    expect(s.state.returnFlow?.saleId).toBeNull();
    press(s, 't18-back');
    expect(s.state.screen).toBe('T7');
  });

  it('Form A offers the way in, and it opens this screen on its list', () => {
    const s = sessionOn(canonicalStore());
    s.openSection('cash_sales');
    press(s, 't7-secondary');
    expect(s.state.screen).toBe('T18');
    expect(byTestId(render(<App session={s} />), 't18-sales')).toBeTruthy();
  });
});

describe("a return on the customer's page signs the way the store does", () => {
  it('the goods leg moves no balance; credit issued comes off it', () => {
    const store = canonicalStore();
    const s = onForm(store, 'c-04'); // Ramesh
    s.setReturnSettlement('udhar');
    type(s, '900');
    s.commitReturn();
    const ret = lastReturn(store);
    const refund = store.entriesReferringTo(ret.id)[0]!;
    const tree = render(<CustomerDetail store={store} partyId="p-ramesh" />);
    // The returned goods: no figure, because they move nothing he owes. The old
    // local sign drew this as +₹900 - udhar going UP on a return.
    expect(all(tree).some((n) => n.props?.testID === 'p2-line-' + ret.id + '-amount')).toBe(false);
    expect(text(byTestId(tree, 'p2-line-' + refund.id + '-amount'))).toBe(
      formatPaise(subtract(0, 90000), { withSign: true }),
    );
  });
});

describe('the working lines a return adds are all in the copy table', () => {
  /** A day with a cash refund (the fixture) and a cash exchange difference. */
  const eventDay = () => {
    const store = returnsStore(canonicalStore());
    const s = onForm(store, 'c-02');
    s.setReturnSettlement('exchange');
    type(s, '500');
    s.setReturnField('replacement');
    type(s, '800');
    s.commitReturn();
    return store;
  };

  it('the cash check still renders, line by line, on a day with a refund and an exchange', () => {
    /*
     * T11 draws `s(line.key)` for every expected-cash line. Without the two
     * cash-leg strings this render THREW - the cash check, the screen the day
     * cannot close without, crashed on the first day a customer brought
     * something back.
     */
    const store = eventDay();
    const tree = render(<CashCheck store={store} language="or" />);
    for (const key of ['working.exchange_received_cash', 'working.refund_paid_cash'] as const) {
      expect(text(byTestId(tree, 't11-working-' + key))).toContain(phrase(key, 'or'));
    }
    expect(store.expectedCash().working.lines.map((l) => l.key)).toContain('working.refund_paid_cash');
  });

  it('all six event working lines have en, hi and or copy', () => {
    const keys: readonly StringKey[] = [
      'working.exchange_received_cash',
      'working.refund_paid_cash',
      'working.sales_returned',
      'working.exchange_goods_out',
      'working.exchange_on_udhar',
      'working.credit_issued_on_return',
    ];
    const emitted = [eventDay().primary().p4NetSales, eventDay().expectedCash()]
      .flatMap((f) => f.working.lines)
      .map((l) => l.key);
    expect(emitted).toContain('working.sales_returned');
    expect(emitted).toContain('working.exchange_goods_out');
    for (const key of keys) {
      for (const language of ['en', 'hi', 'or'] as const) expect(phrase(key, language).length).toBeGreaterThan(0);
    }
  });
});

describe('T18 against both fixtures and every language', () => {
  it('adversarial: the list renders with lakh figures and long names', () => {
    const tree = render(<ReturnOrExchange store={returnsStore(adversarialStore())} language="or" />);
    expect(byTestId(tree, 't18-sales')).toBeTruthy();
    expect(byTestId(tree, 't18-pending')).toBeTruthy();
  });

  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title and the settlement choices are in that language', () => {
      const s = onForm(canonicalStore(), 'c-01');
      s.setLanguage(language);
      const tree = render(<App session={s} />);
      expect(text(byTestId(tree, 't18-title'))).toBe(phrase('t18.title', language));
      expect(text(byTestId(tree, 't18-settlement-exchange'))).toBe(phrase('t18.opt.exchange', language));
    });
  }

  it('longest string mode keeps all five settlement choices and both exchange amounts', () => {
    const store = returnsStore(adversarialStore());
    const s = onForm(store, store.state.entries.find((e) => e.section === 'cash_sales')!.id);
    s.setReturnSettlement('exchange');
    const tree = render(
      <ReturnOrExchange store={store} flow={s.state.returnFlow} language="longest" display="focus" />,
    );
    expect(all(tree).filter((n) => /^t18-settlement-[a-z]+$/.test(String(n.props?.testID ?? '')))).toHaveLength(5);
    expect(byTestId(tree, 't18-returned')).toBeTruthy();
    expect(byTestId(tree, 't18-replacement')).toBeTruthy();
  });

  it('the settlement choices are phrases, so they sit two to a row and never three', () => {
    // "ନଗଦ ଫେରାଇଲେ" holds one word wider than a third of the tray at the chrome
    // cap: three to a row it ran out of its segment (check:layout, CI Linux run
    // 44348374411). The entry forms' one-word modes keep three to a row.
    const tree = render(<App session={onForm(canonicalStore(), 'c-01')} />);
    for (const key of ['cash', 'upi', 'udhar', 'pending', 'exchange']) {
      expect(byTestId(tree, 't18-settlement-' + key).props.style?.flexBasis, key).toBe('45%');
    }
    const s = sessionOn(canonicalStore());
    s.goTo('T7');
    expect(byTestId(render(<App session={s} />), 't7-mode-0').props.style?.flexBasis).toBe('30%');
  });

  it('chrome is capped; money is not', () => {
    const tree = render(<App session={onForm(canonicalStore(), 'c-01')} />);
    expect(byTestId(tree, 't18-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 't18-draft-amount').props?.maxFontSizeMultiplier).toBeUndefined();
  });
});

describe('T18 accessibility and its keypad', () => {
  /** The list, the exchange form and the settle form, against both shops. */
  const faces = () =>
    ([
      [returnsStore(canonicalStore()), 'comfort'],
      [returnsStore(adversarialStore()), 'focus'],
    ] as const).flatMap(([store, display]) => {
      const s = onForm(store, store.state.entries.find((e) => e.section === 'cash_sales')!.id);
      s.setReturnSettlement('exchange');
      const exchange = render(<ReturnOrExchange store={store} flow={s.state.returnFlow} display={display} />);
      s.chooseSettleReturn(RETURN_IDS.pending);
      const settle = render(<ReturnOrExchange store={store} flow={s.state.returnFlow} display={display} />);
      return [{ list: render(<ReturnOrExchange store={store} display={display} />), exchange, settle }];
    });

  it('every target meets TOUCH_TARGET_MIN_DP', () => {
    for (const f of faces()) {
      for (const tree of [f.list, f.exchange, f.settle]) expect(undersizedTargets(tree)).toEqual([]);
    }
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('no text under the floor, no colour under the minimum', () => {
    for (const f of faces()) {
      for (const tree of [f.list, f.exchange, f.settle]) {
        expect(undersizedText(tree)).toEqual([]);
        expect(failingContrast(tree)).toEqual([]);
      }
    }
  });

  it('the forms are entry screens: a keypad and no bottom nav; the list has neither', () => {
    const navs = (tree: ReturnType<typeof render>) =>
      all(tree)
        .map((n) => String(n.props?.testID ?? ''))
        .filter((id) => /nav|tabbar|bottom-bar/i.test(id));
    for (const f of faces()) {
      expect(all(f.list).some((n) => n.props?.testID === 'keypad')).toBe(false);
      expect(navs(f.list)).toEqual([]);
      for (const tree of [f.exchange, f.settle]) {
        expect(byTestId(tree, 'keypad')).toBeTruthy();
        expect(navs(tree)).toEqual([]);
      }
    }
  });
});
