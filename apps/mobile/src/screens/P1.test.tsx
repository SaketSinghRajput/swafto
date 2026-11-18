/**
 * P1 PARTIES - the §B.6 bar.
 *
 * THE CLAIM THIS SCREEN MAKES ABOUT ITSELF IS THE THING MOST WORTH TESTING.
 *
 * P1 shows two shop-level totals and a set of per-party figures that are TODAY'S
 * MOVEMENT rather than balances, because no carried per-party balance exists in
 * this app yet (W4). The failure mode is not a wrong number - it is a right
 * number under a label that implies a history it does not have. So the qualifier
 * is asserted as hard as the arithmetic, and a party line that moved DOWN today
 * is checked to render negative, because an implementation that summed amounts
 * would show a man who paid his dues as owing more.
 */
import { describe, it, expect } from 'vitest';
import { PartiesList } from './P1.tsx';
import { canonicalStore, adversarialStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { Store, memoryPort } from '../store/index.ts';
import { formatPaise, subtract, type Entry } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, strings, type Language } from '../i18n/strings.ts';
import { balanceName, balanceWord } from '../components/PartyPicker.tsx';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';

const emptyParties = (): Store => {
  const base = canonicalInput();
  return new Store(
    memoryPort({
      shopId: 'shop-canonical',
      day: base.day,
      entries: base.entries,
      parties: [],
      priorCreditOutstanding: base.priorCreditOutstanding,
      priorSupplierOutstanding: base.priorSupplierOutstanding,
      skippedSections: [],
    }),
  );
};

const partyLine = (id: string, section: Entry['section'], amount: number, partyId: string): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section,
    amount,
    mode: section === 'udhar_sales' || section === 'purchase' ? 'udhar' : 'cash',
    partyId,
    source: 'manual',
    createdAt: `${CANONICAL_DATE}T19:30:00.000Z`,
  }) as Entry;

describe('P1 renders all four states', () => {
  it('loading', () => {
    const tree = render(<PartiesList store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 'p1-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error offers a way back', () => {
    const tree = render(<PartiesList store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 'p1-error')).toBeTruthy();
    expect(byTestId(tree, 'p1-retry')).toBeTruthy();
  });

  it('empty: a shop with no parties says so instead of showing two blank lists', () => {
    const tree = render(<PartiesList store={emptyParties()} />);
    expect(byTestId(tree, 'p1-empty')).toBeTruthy();
    expect(text(byTestId(tree, 'p1-empty'))).toBe(phrase('p1.empty', 'en'));
  });

  it('loaded: both groups, every party present whether or not the day touched it', () => {
    const store = canonicalStore();
    const tree = render(<PartiesList store={store} />);
    expect(byTestId(tree, 'p1-customers')).toBeTruthy();
    expect(byTestId(tree, 'p1-suppliers')).toBeTruthy();
    for (const p of CANONICAL_PARTIES) {
      const prefix = p.kind === 'customer' ? 'p1-customer-' : 'p1-supplier-';
      expect(byTestId(tree, prefix + p.id)).toBeTruthy();
    }
  });
});

describe('P1 mutates the store and every figure follows', () => {
  it('a new udhar sale moves that customer line and the shop total together', () => {
    const store = canonicalStore();
    const before = text(byTestId(render(<PartiesList store={store} />), 'p1-customer-p-ramesh'));
    const totalBefore = text(byTestId(render(<PartiesList store={store} />), 'p1-to-collect'));

    store.append(partyLine('p1-t1', 'udhar_sales', 75000, 'p-ramesh'));

    const after = render(<PartiesList store={store} />);
    expect(text(byTestId(after, 'p1-customer-p-ramesh'))).not.toBe(before);
    expect(text(byTestId(after, 'p1-to-collect'))).not.toBe(totalBefore);
  });

  it('a collection moves the customer line DOWN - the sign is the information', () => {
    /*
     * The one that would pass against a broken implementation if it were not
     * here. Amounts are always non-negative and the sign is carried by the
     * section, so summing amounts would render a man who just paid as owing
     * more - with a figure that is numerically correct on every line.
     */
    const store = canonicalStore();
    store.append(partyLine('p1-t2', 'udhar_collection', 60000, 'p-sunita'));
    const tree = render(<PartiesList store={store} />);
    expect(text(byTestId(tree, 'p1-customer-p-sunita'))).toContain('-');
    expect(store.partyMovementToday('p-sunita')).toBeLessThan(0);
  });

  it('paying a supplier moves that supplier line and nothing on the customer side', () => {
    /*
     * The canonical day already holds an udhar purchase from this supplier, so a
     * payment REDUCES the line rather than driving it negative - asserting a
     * minus sign here would have been asserting the fixture, not the behaviour.
     */
    const store = canonicalStore();
    const customerBefore = text(
      byTestId(render(<PartiesList store={store} />), 'p1-customer-p-ramesh'),
    );
    const supplierBefore = store.partyMovementToday('p-wholesale');

    store.append(partyLine('p1-t3', 'party_payment', 40000, 'p-wholesale'));

    const tree = render(<PartiesList store={store} />);
    expect(store.partyMovementToday('p-wholesale')).toBe(subtract(supplierBefore, 40000));
    expect(text(byTestId(tree, 'p1-supplier-p-wholesale'))).toContain(
      formatPaise(subtract(supplierBefore, 40000), { withSign: true }),
    );
    expect(text(byTestId(tree, 'p1-customer-p-ramesh'))).toBe(customerBefore);
  });

  it('the two shop totals are the engine figures, never re-added on the screen', () => {
    const store = canonicalStore();
    const primary = store.primary();
    const tree = render(<PartiesList store={store} />);
    // A Row renders its label beside its figure, so `text` is both - the figure
    // is asserted by containment rather than by rebuilding the label here.
    expect(text(byTestId(tree, 'p1-to-collect'))).toContain(
      formatPaise(primary.p7CreditOutstanding.value, { withSign: false }),
    );
    expect(text(byTestId(tree, 'p1-you-owe'))).toContain(
      formatPaise(primary.p8SupplierOutstanding.value, { withSign: false }),
    );
  });

  it('opening a party reports which one, and writes nothing', () => {
    const store = canonicalStore();
    const opened: string[] = [];
    const before = store.revision;
    const tree = render(<PartiesList store={store} onOpenParty={(id) => opened.push(id)} />);
    byTestId(tree, 'p1-customer-p-ramesh').props.onPress();
    expect(opened).toEqual(['p-ramesh']);
    expect(store.revision).toBe(before);
  });
});

describe('P1 never implies a history it does not hold', () => {
  /*
   * CHANGED BY THE USABILITY PASS (item 5). The rows were today's movement under
   * a "Change today" qualifier, because no per-party balance existed. One does
   * now (`partyBalance`, R5 FR-1), so each row's figure is the balance and is
   * labelled by what it is; today's change is a second, smaller line.
   */
  it('each row shows the balance owed, labelled, and today\'s change only when there was one', () => {
    const store = canonicalStore();
    const tree = render(<PartiesList store={store} />);
    for (const p of store.state.parties) {
      const prefix = p.kind === 'customer' ? 'p1-customer-' : 'p1-supplier-';
      const balance = store.partyBalance(p.id);
      expect(text(byTestId(tree, prefix + p.id + '-balance'))).toBe(
        formatPaise(balance < 0 ? subtract(0, balance) : balance, { withSign: false }),
      );
      expect(text(byTestId(tree, prefix + p.id))).toContain(phrase(balanceWord(p.kind, balance), 'en'));
      const today = store.partyMovementToday(p.id);
      expect(all(tree).some((n) => n.props?.testID === prefix + p.id + '-today')).toBe(today !== 0);
    }
    expect(all(tree).some((n) => String(n.props?.testID ?? '').endsWith('-note'))).toBe(false);
  });

  it('the shop totals are labelled as the shop, not as a party', () => {
    const tree = render(<PartiesList store={canonicalStore()} />);
    expect(text(byTestId(tree, 'p1-totals-title'))).toBe(phrase('p1.shopTotals', 'en'));
  });

  it('no aging badge is rendered, because no date exists to compute one from', () => {
    const ids = all(render(<PartiesList store={canonicalStore()} />)).map((n) =>
      String(n.props?.testID ?? ''),
    );
    expect(ids.filter((id) => /aging|aged|overdue/i.test(id))).toEqual([]);
  });
});

describe('P1 in every language, including the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title and both group headings are in that language', () => {
      const tree = render(<PartiesList store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 'p1-title'))).toBe(phrase('p1.title', language));
      expect(text(byTestId(tree, 'p1-customers-title'))).toBe(phrase('p1.customers', language));
      expect(text(byTestId(tree, 'p1-suppliers-title'))).toBe(phrase('p1.suppliers', language));
    });
  }

  it('the adversarial shop renders - lakh figures and the longest party names', () => {
    const tree = render(<PartiesList store={adversarialStore()} language="or" />);
    expect(byTestId(tree, 'p1-totals')).toBeTruthy();
    expect(byTestId(tree, 'p1-customers')).toBeTruthy();
  });

  it('longest string mode at the largest type still shows both groups', () => {
    const tree = render(
      <PartiesList store={adversarialStore()} language="longest" display="focus" />,
    );
    expect(byTestId(tree, 'p1-customers')).toBeTruthy();
    expect(byTestId(tree, 'p1-suppliers')).toBeTruthy();
  });

  it('chrome is capped; money is not', () => {
    const tree = render(<PartiesList store={canonicalStore()} />);
    expect(byTestId(tree, 'p1-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 'p1-headline').props?.allowFontScaling).toBe(true);
  });
});

describe('P1 accessibility, and it is not an entry screen', () => {
  const TREES = () => [
    render(<PartiesList store={canonicalStore()} />),
    render(<PartiesList store={adversarialStore()} language="or" display="focus" />),
    render(<PartiesList store={emptyParties()} />),
    render(<PartiesList store={canonicalStore()} status="error" />),
    render(<PartiesList store={adversarialStore()} language="longest" display="focus" />),
  ];

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

  it('nothing is typed here, so no keypad - and the nav is therefore allowed', () => {
    /*
     * THIS TEST USED TO FORBID THE NAV, AND THAT WAS A MISREADING OF §B.6.
     *
     * B.6 forbids a keypad BESIDE a bottom navigation. It says nothing about a
     * screen with no keypad, and SPEC-DIGEST C-5 rules directly that there IS
     * a bottom navigation of three tabs - Today, Parties, Reports - of which
     * this screen is one. Forbidding it here left Parties reachable only as a
     * bare text link at the foot of Today, and leaveable only by the hardware
     * key.
     *
     * Both halves are asserted separately so neither can drift into the other:
     * no keypad at all, and exactly C-5's three tabs with this one live.
     */
    const tree = render(<PartiesList store={canonicalStore()} />);
    // `byTestId` throws on a miss, so absence is asserted over the whole id list.
    const ids = all(tree).map((n) => String(n.props?.testID ?? ''));
    expect(ids.filter((id) => /^keypad/.test(id))).toEqual([]);
    expect(ids.filter((id) => /^bottom-nav-/.test(id))).toEqual([
      'bottom-nav-today',
      'bottom-nav-parties',
      'bottom-nav-reports',
    ]);
    expect(byTestId(tree, 'bottom-nav-parties').props?.accessibilityState?.selected).toBe(true);
  });

  it('each tab reports which destination was asked for, and writes nothing', () => {
    const store = canonicalStore();
    const before = store.revision;
    const chosen: string[] = [];
    const tree = render(<PartiesList store={store} onSelectTab={(k) => chosen.push(k)} />);
    for (const key of ['today', 'parties', 'reports']) {
      byTestId(tree, 'bottom-nav-' + key).props.onPress();
    }
    expect(chosen).toEqual(['today', 'parties', 'reports']);
    expect(store.revision).toBe(before);
  });

  it('a party row announces the party name, which is what a reader needs', () => {
    const tree = render(<PartiesList store={canonicalStore()} />);
    const row = byTestId(tree, 'p1-customer-p-ramesh');
    expect(row.props?.accessibilityRole).toBe('button');
    // USABILITY / WCAG 4.1.2: the name first (2.5.3), then what he owes, in words.
    const store = canonicalStore();
    expect(row.props?.accessibilityLabel).toBe(
      balanceName(strings('en'), 'Ramesh', 'customer', store.partyBalance('p-ramesh')),
    );
    expect(String(row.props?.accessibilityLabel).startsWith('Ramesh, ')).toBe(true);
  });
});

describe('USABILITY item 5 - the Ledger answers "who owes me, how much"', () => {
  it('the tab and the title are the same word, in every language', () => {
    for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
      const tree = render(<PartiesList store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 'p1-title'))).toBe(text(byTestId(tree, 'bottom-nav-parties')));
    }
  });

  it('mutates the store and the list re-sorts: most owed first', () => {
    const store = canonicalStore();
    const order = () =>
      all(render(<PartiesList store={store} />))
        .map((n) => String(n.props?.testID ?? ''))
        .filter((id) => /^p1-customer-[^-]+(-[^-]+)?$/.test(id) && !/-(name|balance|today)$/.test(id));
    const customers = store.state.parties.filter((p) => p.kind === 'customer');
    const sorted = (ids: readonly string[]) =>
      ids.map((id) => store.partyBalance(id.slice('p1-customer-'.length)));
    const before = sorted(order());
    expect(before).toEqual([...before].sort((a, b) => (a === b ? 0 : a > b ? -1 : 1)));
    // Give the least-owing customer a large udhar sale: he moves to the top.
    const last = order().at(-1)!.slice('p1-customer-'.length);
    store.append({
      id: 'p1-sort-1',
      dayId: store.state.day.date,
      section: 'udhar_sales',
      amount: 9_000_000,
      mode: 'udhar',
      partyId: last,
      source: 'manual',
      createdAt: store.state.day.date + 'T10:00:00.000+05:30',
    } as never);
    expect(order()[0]).toBe('p1-customer-' + last);
    expect(customers.length).toBeGreaterThan(1);
  });
});
