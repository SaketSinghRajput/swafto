/**
 * I1 ITEMS IN A SALE (PR-1, Premium) - the §B.6 bar.
 *
 * THE PROPERTIES THAT MATTER: optional and after the sale; one of his items or
 * Other; how many and the amount are typed, never offered; the sale's items
 * never come to more than the sale; and on a free plan the path is absent.
 * Driven through `<App session>` from T7, against the real store.
 */
import { describe, it, expect } from 'vitest';
import { ItemsForSale } from './I1.tsx';
import { canonicalStore, adversarialStore, closedStore, emptyStore, itemsStore, ITEM_IDS } from './registry.tsx';
import { Session } from '../app/session.tsx';
import { App } from '../app/App.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { CANONICAL_DATE } from '@swafto/fixtures';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import type { Plan } from '../app/plan.ts';
import { PREMIUM_RENEWING } from './registry.tsx';
import type { Store } from '../store/index.ts';
import type { ItemFlow } from '../app/session.tsx';
import { Money } from '../components/Money.tsx';
import { tokens } from '../theme/tokens.ts';
import { add, divideMoney, subtract, sum } from '@swafto/formula-engine';

const T0 = CANONICAL_DATE + 'T21:00:00.000Z';
const sessionOn = (store: Store, plan: Plan = 'premium'): Session => {
  let n = 0;
  const s = new Session(store, { now: () => T0, newId: () => 'n' + String(++n) });
  // The plan comes only from a server answer (PR-7), as on the phone.
  if (plan === 'premium') s.setPlanAnswer(PREMIUM_RENEWING);
  return s;
};
const press = (s: Session, testID: string) => byTestId(render(<App session={s} />), testID).props.onPress();
const has = (tree: ReturnType<typeof render>, testID: string) => all(tree).some((n) => n.props?.testID === testID);
const firstSale = (store: Store) => store.state.entries.find((e) => e.section === 'cash_sales')!;
const typing = (store: Store, over: Partial<ItemFlow> = {}): ItemFlow => ({
  saleId: firstSale(store).id,
  itemId: ITEM_IDS[0],
  field: 'amount',
  quantity: 1,
  amount: 1000,
  ...over,
});

describe('I1 renders all four states', () => {
  it('loading', () => {
    const tree = render(<ItemsForSale store={canonicalStore()} plan="premium" status="loading" />);
    expect(byTestId(tree, 'i1-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error', () => {
    expect(byTestId(render(<ItemsForSale store={canonicalStore()} plan="premium" status="error" />), 'i1-error')).toBeTruthy();
  });

  it('empty: no sale today, nothing to itemise', () => {
    const tree = render(<ItemsForSale store={emptyStore()} plan="premium" />);
    expect(text(byTestId(tree, 'i1-empty'))).toContain(phrase('i1.empty', 'en'));
  });

  it("loaded: today's sales as the list, optional said first", () => {
    const store = canonicalStore();
    const tree = render(<ItemsForSale store={store} plan="premium" />);
    expect(text(byTestId(tree, 'i1-optional'))).toBe(phrase('i1.optional', 'en'));
    expect(has(tree, 'i1-sale-' + firstSale(store).id)).toBe(true);
    expect(has(tree, 'keypad')).toBe(false);
  });
});

describe('I1 - a line of a sale, typed, never more than the sale', () => {
  it('nothing is pre-chosen or pre-filled when a sale is opened', () => {
    const store = itemsStore(canonicalStore());
    const s = sessionOn(store);
    s.openItems();
    s.chooseItemSale(firstSale(store).id);
    expect(s.state.itemFlow).toMatchObject({ itemId: null, quantity: null, amount: null });
    const tree = render(<App session={s} />);
    expect(byTestId(tree, 'i1-save').props.disabled).toBe(true);
    expect(all(tree).some((n) => n.type === 'TextInput')).toBe(false);
  });

  it('from T7: item, how many, amount; save mutates the store and "recorded for X of Y" follows', () => {
    const store = itemsStore(canonicalStore());
    const sale = firstSale(store);
    const s = sessionOn(store);
    s.goTo('T7');
    press(s, 't7-items');
    expect(s.state.screen).toBe('I1');
    press(s, 'i1-sale-' + sale.id);
    const before = store.saleLines(sale.id).length;
    press(s, 'i1-item-' + ITEM_IDS[1]);
    s.press('3'); // how many
    s.setItemField('amount');
    for (const d of '20') s.press(d as '2');
    press(s, 'i1-save');
    const lines = store.saleLines(sale.id);
    expect(lines).toHaveLength(before + 1);
    expect(lines.at(-1)).toMatchObject({ itemId: ITEM_IDS[1], quantity: 3, amount: 2000, entryId: sale.id });
    const shown = text(byTestId(render(<App session={s} />), 'i1-recorded-itemised'));
    const expected = sum(lines.map((l) => l.amount));
    expect(shown).toBe(text(render(<Money testID="x" amount={expected} mode="comfort" size="body" />)));
    // The sale itself is untouched (D1): same amount, same expected cash.
    expect(firstSale(store).amount).toBe(sale.amount);
  });

  it('a line taking the items past the sale is refused, and nothing is recorded', () => {
    const store = itemsStore(canonicalStore());
    const sale = firstSale(store);
    const s = sessionOn(store);
    s.openItems();
    s.chooseItemSale(sale.id);
    s.chooseLineItem('other');
    s.press('1');
    s.setItemField('amount');
    for (const d of String(divideMoney(sale.amount, 100, 'floor'))) s.press(d as '1');
    const before = store.saleLines(sale.id).length;
    expect(s.saveItemLine()).toBe(false);
    expect(s.state.lastRefusal?.field).toBe('amount');
    expect(store.saleLines(sale.id)).toHaveLength(before);
  });

  it('HT-37: the over-the-sale refusal says so and names what is left, not "type an amount"', () => {
    const store = itemsStore(canonicalStore());
    const sale = firstSale(store);
    const s = sessionOn(store);
    s.openItems();
    s.chooseItemSale(sale.id);
    s.chooseLineItem('other');
    s.press('1');
    s.setItemField('amount');
    for (const d of String(add(divideMoney(sale.amount, 100, 'floor'), 1))) s.press(d as '1');
    expect(s.saveItemLine()).toBe(false);
    const banner = byTestId(render(<App session={s} />), 'refusal');
    expect(text(banner)).toContain(phrase('refusal.itemOverSale', 'en'));
    expect(text(banner)).not.toContain(phrase('refusal.amount', 'en'));
    const left = subtract(sale.amount, sum(store.saleLines(sale.id).map((l) => l.amount)));
    expect(text(byTestId(banner, 'refusal-left'))).toBe(
      text(render(<Money testID="x" amount={left} mode="comfort" size="body" />)),
    );
  });

  it('on a free plan the path is absent: no T7 action, I1 never opens, nothing to press', () => {
    const store = canonicalStore();
    const s = sessionOn(store, 'free');
    s.goTo('T7');
    expect(has(render(<App session={s} />), 't7-items')).toBe(false);
    s.openItems();
    expect(s.state.screen).toBe('T7');
    const tree = render(<ItemsForSale store={store} plan="free" flow={typing(store)} />);
    expect(text(byTestId(tree, 'i1-premium'))).toBe(phrase('i1.premium', 'en'));
    expect(has(tree, 'keypad')).toBe(false);
    expect(has(tree, 'i1-save')).toBe(false);
  });

  it('back from a chosen sale is the list; back from the list is T7', () => {
    const store = canonicalStore();
    const s = sessionOn(store);
    s.goTo('T7');
    s.openItems();
    s.chooseItemSale(firstSale(store).id);
    press(s, 'i1-back');
    expect(s.state.screen).toBe('I1');
    expect(s.state.itemFlow?.saleId).toBeNull();
    s.back();
    expect(s.state.screen).toBe('T7');
  });
});

describe('I1 against both fixtures and every language', () => {
  it('adversarial: long item names and lakh figures render', () => {
    const store = itemsStore(adversarialStore());
    const tree = render(<ItemsForSale store={store} plan="premium" flow={typing(store, { amount: 1234567800 })} />);
    expect(byTestId(tree, 'i1-amount-figure')).toBeTruthy();
    expect(has(tree, 'i1-item-' + ITEM_IDS[0])).toBe(true);
  });

  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': title, prompt and Other are in that language', () => {
      const store = itemsStore(canonicalStore());
      const tree = render(<ItemsForSale store={store} plan="premium" language={language} flow={typing(store)} />);
      expect(text(byTestId(tree, 'i1-title'))).toBe(phrase('i1.title', language));
      expect(text(byTestId(tree, 'i1-prompt'))).toBe(phrase('i1.item', language));
      expect(text(byTestId(tree, 'i1-item-other'))).toBe(phrase('i1.other', language));
    });
  }

  it('longest string mode keeps the prompt, every choice and the recorded line', () => {
    const store = itemsStore(adversarialStore());
    const tree = render(<ItemsForSale store={store} plan="premium" language="longest" display="focus" flow={typing(store)} />);
    expect(byTestId(tree, 'i1-prompt')).toBeTruthy();
    expect(byTestId(tree, 'i1-recorded')).toBeTruthy();
    expect(has(tree, 'i1-item-other')).toBe(true);
  });

  it('chrome is capped; money is not', () => {
    const store = itemsStore(canonicalStore());
    const tree = render(<ItemsForSale store={store} plan="premium" flow={typing(store)} />);
    expect(byTestId(tree, 'i1-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 'i1-amount-figure').props?.maxFontSizeMultiplier).toBeUndefined();
  });
});

describe('I1 accessibility and its keypad', () => {
  const TREES = () => {
    const a = itemsStore(canonicalStore());
    const b = itemsStore(adversarialStore());
    return [
      render(<ItemsForSale store={a} plan="premium" flow={typing(a)} />),
      render(<ItemsForSale store={b} plan="premium" display="focus" flow={typing(b)} />),
      render(<ItemsForSale store={closedStore()} plan="premium" />),
      render(<ItemsForSale store={a} plan="premium" />),
      // Pass 9: the "type how many" hint, in both display modes.
      render(<ItemsForSale store={a} plan="premium" flow={typing(a, { quantity: null })} />),
      render(<ItemsForSale store={b} plan="premium" display="focus" flow={typing(b, { quantity: null })} />),
    ];
  };

  it('HT-38: the How many / Amount switch is in the fixed footer beside its figures, not below a long item list', () => {
    const [typed] = TREES();
    const footer = byTestId(typed!, 'i1-footer');
    expect(has(footer, 'i1-field')).toBe(true);
    expect(has(footer, 'i1-amount-figure')).toBe(true);
    expect(has(byTestId(typed!, 'i1-body'), 'i1-field')).toBe(false);
  });

  it('every target meets TOUCH_TARGET_MIN_DP', () => {
    for (const tree of TREES()) expect(undersizedTargets(tree)).toEqual([]);
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('no text under the floor, no colour under the minimum', () => {
    for (const tree of TREES()) {
      expect(undersizedText(tree)).toEqual([]);
      expect(failingContrast(tree)).toEqual([]);
    }
  });

  it('an entry screen: the keypad is there while a line is typed, absent on the list and a closed day, never beside a bottom nav', () => {
    const [typed, , closed, list] = TREES();
    expect(byTestId(typed!, 'keypad')).toBeTruthy();
    expect(has(closed!, 'keypad')).toBe(false);
    expect(has(list!, 'keypad')).toBe(false);
    for (const tree of [typed!, closed!]) {
      expect(
        all(tree)
          .map((n) => String(n.props?.testID ?? ''))
          .filter((id) => /nav|tabbar|bottom-bar/i.test(id)),
      ).toEqual([]);
    }
  });
});

describe('HT-51 - the item choices stay in view at every text size', () => {
  it('with no item picked, the footer is only Save: no switch, no figures, no keypad above the list', () => {
    const store = itemsStore(canonicalStore());
    const tree = render(<ItemsForSale store={store} plan="premium" flow={typing(store, { itemId: null })} />);
    const footer = byTestId(tree, 'i1-footer');
    expect(has(footer, 'i1-save')).toBe(true);
    for (const id of ['keypad', 'i1-field', 'i1-typed']) expect(has(footer, id), id).toBe(false);
    expect(has(byTestId(tree, 'i1-body'), 'i1-item-' + ITEM_IDS[0])).toBe(true);
  });

  it('after a saved line the next starts with no item, so the footer is compact again and the list is reachable', () => {
    const store = itemsStore(canonicalStore());
    const s = sessionOn(store);
    s.openItems();
    s.chooseItemSale(firstSale(store).id);
    s.chooseLineItem(ITEM_IDS[0]);
    expect(has(byTestId(render(<App session={s} />), 'i1-footer'), 'keypad')).toBe(true);
    s.press('1');
    s.setItemField('amount');
    s.press('5');
    expect(s.saveItemLine()).toBe(true);
    const tree = render(<App session={s} />);
    expect(has(tree, 'i1-line-' + store.saleLines(firstSale(store).id).at(-1)!.id)).toBe(true);
    expect(has(byTestId(tree, 'i1-footer'), 'keypad')).toBe(false);
    expect(has(byTestId(tree, 'i1-body'), 'i1-item-' + ITEM_IDS[1])).toBe(true);
  });

  it('the Sales form: "Add items to a sale" sits above the day\'s lines, not under them', () => {
    const store = itemsStore(canonicalStore());
    const s = sessionOn(store);
    s.goTo('T7');
    const order = all(render(<App session={s} />)).map((n) => String(n.props?.testID ?? ''));
    expect(order.indexOf('t7-items')).toBeGreaterThan(-1);
    expect(order.indexOf('t7-items')).toBeLessThan(order.indexOf('t7-lines'));
  });

  it('HT-51 at font 2.0: "Add items to a sale" is the first thing in the body, above the total card', () => {
    const store = itemsStore(canonicalStore());
    const s = sessionOn(store);
    s.goTo('T7');
    const body = byTestId(render(<App session={s} />), 't7-body');
    const order = all(body).map((n) => String(n.props?.testID ?? '')).filter((x) => x.startsWith('t7-'));
    expect(order.slice(1, 4)).toEqual(['t7-links', 't7-items', 't7-secondary']);
    expect(order.indexOf('t7-items')).toBeLessThan(order.indexOf('t7-total'));
  });
});

describe('HT-60 - the Sales running total stays in view with the links above it', () => {
  const body = () => {
    const store = itemsStore(canonicalStore());
    const s = sessionOn(store);
    s.goTo('T7');
    return { store, body: byTestId(render(<App session={s} />), 't7-body') };
  };

  it('the two links share ONE row, so together they cost one line of the body, not two', () => {
    const links = byTestId(body().body, 't7-links');
    expect(links.props.style?.flexDirection).toBe('row');
    expect(has(links, 't7-items')).toBe(true);
    expect(has(links, 't7-secondary')).toBe(true);
    // Neither link carries an outer vertical margin that would stack under the other.
    for (const id of ['t7-items', 't7-secondary']) {
      const st = byTestId(links, id).props.style ?? {};
      expect(st.margin ?? st.marginVertical ?? st.marginTop ?? 0, id).toBe(0);
    }
  });

  it('the total comes directly after the links, as one tight line holding the engine figure', () => {
    const { store, body: b } = body();
    const order = all(b).map((n) => String(n.props?.testID ?? '')).filter((x) => x.startsWith('t7-'));
    expect(order.indexOf('t7-total')).toBe(order.indexOf('t7-secondary') + 1);
    const total = byTestId(b, 't7-total');
    expect(total.props.style?.flexWrap).toBe('wrap');
    expect(total.props.style?.paddingVertical ?? total.props.style?.padding).toBeUndefined();
    expect(text(byTestId(total, 't7-headline'))).toBe(
      text(render(<Money testID="x" amount={store.primary().p4NetSales.value} mode="comfort" size="body" />)),
    );
  });
});

describe('HT-59 - a figure typed on Sales survives going to items and back', () => {
  const typed300 = (s: Session) => {
    s.goTo('T7');
    for (const k of ['3', '0', '0']) press(s, 'keypad-' + k);
    expect(s.state.draftPaise).toBe(30000);
  };

  it('Sales -> type 300 -> "Add items to a sale" -> Back: the 300 is still there, unsaved', () => {
    const store = itemsStore(canonicalStore());
    const s = sessionOn(store);
    const before = store.state.entries.length;
    typed300(s);
    press(s, 't7-items');
    expect(s.state.screen).toBe('I1');
    press(s, 'i1-back');
    expect(s.state.screen).toBe('T7');
    expect(s.state.draftPaise).toBe(30000);
    expect(text(byTestId(render(<App session={s} />), 't7-draft-amount'))).toContain('300.00');
    // Kept, not saved: nothing reached the book.
    expect(store.state.entries).toHaveLength(before);
  });

  it('the same through a sale chosen on I1, and through hardware Back', () => {
    const store = itemsStore(canonicalStore());
    const s = sessionOn(store);
    typed300(s);
    press(s, 't7-items');
    s.chooseItemSale(firstSale(store).id);
    s.back(); // I1 sale -> I1 list is App's header Back; the hardware Back goes to Sales
    expect(s.state.screen).toBe('T7');
    expect(s.state.draftPaise).toBe(30000);
  });

  it('the same for "Return or exchange a sale", the other link off the Sales form', () => {
    const store = itemsStore(canonicalStore());
    const s = sessionOn(store);
    typed300(s);
    press(s, 't7-secondary');
    expect(s.state.screen).toBe('T18');
    s.back();
    expect(s.state.screen).toBe('T7');
    expect(s.state.draftPaise).toBe(30000);
  });

  it('the kept figure is only for the Sales form it was typed on, never carried elsewhere', () => {
    const store = itemsStore(canonicalStore());
    const s = sessionOn(store);
    typed300(s);
    press(s, 't7-items');
    s.goTo('T1');
    s.goTo('T7');
    expect(s.state.draftPaise).toBeNull();
  });

  it('I1 does not claim an unsaved sale is saved: it says only added sales are listed', () => {
    expect(phrase('i1.optional', 'en')).not.toMatch(/saved already/i);
    expect(phrase('i1.optional', 'en')).toMatch(/added/i);
  });
});

describe('HT-58 - "Items recorded for ... of the sale" wraps inside the card padding', () => {
  it('the row owns the inset, so a wrapped figure starts where the words do', () => {
    const store = itemsStore(canonicalStore());
    const flow: ItemFlow = { ...typing(store), itemId: null };
    const row = byTestId(render(<ItemsForSale store={store} plan="premium" flow={flow} />), 'i1-recorded');
    const inset = (st: Record<string, unknown> | undefined) =>
      st?.padding ?? st?.paddingHorizontal ?? st?.paddingLeft ?? st?.marginLeft ?? st?.marginHorizontal ?? st?.margin;
    expect(inset(row.props.style)).toBe(tokens('comfort').space.md);
    // No piece carries its own left inset: one that did would sit right of a wrapped figure.
    for (const n of all(row).slice(1)) expect(inset(n.props?.style)).toBeUndefined();
    expect(all(row).filter((n) => n.type === 'Text' && String(n.text).includes('₹'))).toHaveLength(2);
  });
});

describe('HT-61 - the picked item stays in view once the keypad is up', () => {
  it("the picked item's name is in the fixed footer, above its figures, not only in the scrolling list", () => {
    const store = itemsStore(canonicalStore());
    const tree = render(<ItemsForSale store={store} plan="premium" flow={typing(store, { itemId: ITEM_IDS[1] })} />);
    const footer = byTestId(tree, 'i1-footer');
    expect(text(byTestId(footer, 'i1-picked-name'))).toBe(store.items.find((i) => i.id === ITEM_IDS[1])!.name);
    const order = all(footer).map((n) => String(n.props?.testID ?? ''));
    expect(order.indexOf('i1-picked-name')).toBeLessThan(order.indexOf('i1-amount-figure'));
    expect(has(footer, 'i1-change')).toBe(true);
    const other = render(<ItemsForSale store={store} plan="premium" flow={typing(store, { itemId: 'other' })} />);
    expect(text(byTestId(other, 'i1-picked-name'))).toBe(phrase('i1.other', 'en'));
  });

  it('"Change" clears the pick and keeps what he typed; the next item saves with those figures', () => {
    const store = itemsStore(canonicalStore());
    const sale = firstSale(store);
    const s = sessionOn(store);
    s.openItems();
    s.chooseItemSale(sale.id);
    s.chooseLineItem(ITEM_IDS[0]);
    s.press('4');
    s.setItemField('amount');
    for (const d of '30') s.press(d as '3');
    press(s, 'i1-change');
    expect(s.state.itemFlow).toMatchObject({ itemId: null, quantity: 4, amount: 3000 });
    // Back to the list: the footer is compact again and the choices are in the body.
    const tree = render(<App session={s} />);
    expect(has(byTestId(tree, 'i1-footer'), 'keypad')).toBe(false);
    expect(has(byTestId(tree, 'i1-body'), 'i1-item-' + ITEM_IDS[1])).toBe(true);
    press(s, 'i1-item-' + ITEM_IDS[1]);
    s.press('5'); // the amount digits were kept: 30 becomes 305
    expect(s.saveItemLine()).toBe(true);
    expect(store.saleLines(sale.id).at(-1)).toMatchObject({ itemId: ITEM_IDS[1], quantity: 4, amount: 30500 });
  });
});

describe('Pass 9 note - Save item is off with an amount and no "How many", and says why', () => {
  it('the hint shows in the footer, Save stays disabled, and nothing fills the count in', () => {
    const store = itemsStore(canonicalStore());
    const s = sessionOn(store);
    s.openItems();
    s.chooseItemSale(firstSale(store).id);
    s.chooseLineItem(ITEM_IDS[0]);
    s.setItemField('amount');
    s.press('5');
    const tree = render(<App session={s} />);
    const footer = byTestId(tree, 'i1-footer');
    expect(text(byTestId(footer, 'i1-need-quantity'))).toBe(phrase('i1.needQuantity', 'en'));
    expect(byTestId(tree, 'i1-save').props.disabled).toBe(true);
    expect(s.state.itemFlow?.quantity).toBeNull();
  });

  it('no hint before an amount is typed, nor once "How many" is typed', () => {
    const store = itemsStore(canonicalStore());
    const none = render(<ItemsForSale store={store} plan="premium" flow={typing(store, { quantity: null, amount: null })} />);
    expect(has(none, 'i1-need-quantity')).toBe(false);
    const both = render(<ItemsForSale store={store} plan="premium" flow={typing(store)} />);
    expect(has(both, 'i1-need-quantity')).toBe(false);
    expect(byTestId(both, 'i1-save').props.disabled).toBe(false);
  });

  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the hint and Change are in that language', () => {
      const store = itemsStore(canonicalStore());
      const tree = render(
        <ItemsForSale store={store} plan="premium" language={language} flow={typing(store, { quantity: null })} />,
      );
      expect(text(byTestId(tree, 'i1-need-quantity'))).toBe(phrase('i1.needQuantity', language));
      expect(text(byTestId(tree, 'i1-change'))).toBe(phrase('i1.change', language));
    });
  }
});

/*
 * BETA: these tests cover the Free/Premium gate as it will stand after beta,
 * so the all-free beta switch is off for this file and restored after it.
 */
import { beforeAll as betaOff, afterAll as betaOn } from 'vitest';
import { BETA } from '../app/plan.ts';
betaOff(() => {
  BETA.allFree = false;
});
betaOn(() => {
  BETA.allFree = true;
});
