/**
 * P2 CUSTOMER DETAIL - the §B.6 bar.
 *
 * THE LEDGER HAS TO ADD UP TO ITS OWN FIGURE, and that is what this file is
 * really for. Every amount in this product is non-negative and the sign is
 * carried by the section, so each line on a party page is given its direction by
 * `PARTY_SECTION_SIGN` - and the headline is `partyMovementToday`, which sums the
 * same table. Two readers of one table is the whole design; a test that checked
 * the lines and the figure separately would keep passing on the day they stopped
 * agreeing, with every line on screen still numerically right.
 *
 * So the strongest assertion here adds the rendered lines up and requires the
 * total to equal the rendered headline, before and after a write.
 */
import { describe, it, expect } from 'vitest';
import { CustomerDetail } from './P2.tsx';
import { canonicalStore, adversarialStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { PARTY_SECTION_SIGN } from '../store/index.ts';
import { formatPaise, subtract, sum, type Entry, type Paise } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import { tokens } from '../theme/tokens.ts';
import { CANONICAL_DATE } from '@swafto/fixtures';

const CUSTOMER = 'p-ramesh';
const advCustomer = () => adversarialStore().state.parties.find((p) => p.kind === 'customer');

const line = (id: string, section: Entry['section'], amount: number, partyId = CUSTOMER): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section,
    amount,
    mode: section === 'udhar_sales' || section === 'purchase' ? 'udhar' : 'cash',
    partyId,
    source: 'manual',
    createdAt: `${CANONICAL_DATE}T18:00:00.000Z`,
  }) as Entry;

/** The signed value of every line the screen drew, added with the audited helper. */
const ledgerTotal = (entries: readonly Entry[]): Paise =>
  sum(entries.map((e) => (PARTY_SECTION_SIGN[e.section] === -1 ? subtract(0, e.amount) : e.amount)));

describe('P2 renders all four states', () => {
  it('loading', () => {
    const tree = render(
      <CustomerDetail store={canonicalStore()} partyId={CUSTOMER} status="loading" />,
    );
    expect(byTestId(tree, 'p2-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error offers a way back', () => {
    const tree = render(
      <CustomerDetail store={canonicalStore()} partyId={CUSTOMER} status="error" />,
    );
    expect(byTestId(tree, 'p2-error')).toBeTruthy();
    expect(byTestId(tree, 'p2-retry')).toBeTruthy();
  });

  it('empty: a customer with no lines today says so rather than showing a blank card', () => {
    const tree = render(<CustomerDetail store={canonicalStore()} partyId="p-nobody" />);
    expect(byTestId(tree, 'p2-empty')).toBeTruthy();
    expect(text(byTestId(tree, 'p2-empty'))).toBe(phrase('p2.empty', 'en'));
  });

  it('loaded: the name, the figure labelled as a movement, and one row per line', () => {
    const store = canonicalStore();
    const tree = render(<CustomerDetail store={store} partyId={CUSTOMER} />);
    expect(text(byTestId(tree, 'p2-name'))).toBe('Ramesh');
    /*
     * The qualifier used to sit under the name as its own line. It labels the
     * FIGURE, so it now sits beside it in the bar - "Owed to you -300" was the
     * version this replaced, and it said the opposite of what the ledger showed.
     */
    expect(text(byTestId(tree, 'p2'))).toContain(phrase('p1.changeToday', 'en'));
    for (const e of store.partyEntries(CUSTOMER)) {
      expect(byTestId(tree, 'p2-line-' + e.id)).toBeTruthy();
    }
  });
});

describe('P2 mutates the store and the ledger stays equal to its own figure', () => {
  it('the rendered lines add up to the rendered headline, before and after a write', () => {
    const store = canonicalStore();

    const check = () => {
      const entries = store.partyEntries(CUSTOMER);
      const tree = render(<CustomerDetail store={store} partyId={CUSTOMER} />);
      /*
       * USABILITY item 5: the hero is now the BALANCE, so today's lines add up
       * to the "Change today" row instead - the same equality, one line down.
       */
      expect(text(byTestId(tree, 'p2-change-today'))).toContain(
        formatPaise(ledgerTotal(entries), { withSign: true }),
      );
      expect(ledgerTotal(entries)).toBe(store.partyMovementToday(CUSTOMER));
      const balance = store.partyBalance(CUSTOMER);
      expect(text(byTestId(tree, 'p2-headline'))).toBe(
        formatPaise(balance < 0 ? subtract(0, balance) : balance, { withSign: false }),
      );
    };

    check();
    store.append(line('p2-t1', 'udhar_sales', 90000));
    check();
    store.append(line('p2-t2', 'udhar_collection', 35000));
    check();
  });

  it('a collection renders as a NEGATIVE line, not a positive one', () => {
    /*
     * Would pass against a broken screen if it were not here: the stored amount
     * is positive, so a ledger rendering `e.amount` directly would show the day a
     * man paid his dues as a day he took more credit.
     */
    const store = canonicalStore();
    store.append(line('p2-t3', 'udhar_collection', 50000));
    const tree = render(<CustomerDetail store={store} partyId={CUSTOMER} />);
    expect(text(byTestId(tree, 'p2-line-p2-t3'))).toContain(
      formatPaise(subtract(0, 50000), { withSign: true }),
    );
  });

  it('another party’s lines never appear on this page', () => {
    const store = canonicalStore();
    store.append(line('p2-t4', 'party_payment', 20000, 'p-wholesale'));
    const ids = all(render(<CustomerDetail store={store} partyId={CUSTOMER} />)).map((n) =>
      String(n.props?.testID ?? ''),
    );
    expect(ids).not.toContain('p2-line-p2-t4');
  });

  it('both actions report intent and write nothing by themselves', () => {
    const store = canonicalStore();
    const pressed: string[] = [];
    const before = store.revision;
    const tree = render(
      <CustomerDetail
        store={store}
        partyId={CUSTOMER}
        onRecordCollection={() => pressed.push('collect')}
        onNewUdhar={() => pressed.push('udhar')}
      />,
    );
    byTestId(tree, 'p2-action-collect').props.onPress();
    byTestId(tree, 'p2-action-udhar').props.onPress();
    expect(pressed).toEqual(['collect', 'udhar']);
    expect(store.revision).toBe(before);
  });
});

describe('P2 in every language, including the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title and the ledger heading are in that language', () => {
      const tree = render(
        <CustomerDetail store={canonicalStore()} partyId={CUSTOMER} language={language} />,
      );
      expect(text(byTestId(tree, 'p2-title'))).toBe(phrase('p2.title', language));
      expect(text(byTestId(tree, 'p2-ledger-title'))).toBe(phrase('p2.ledger', language));
    });
  }

  it('the adversarial shop renders - the longest party name is not truncated', () => {
    const store = adversarialStore();
    const customer = store.state.parties.find((p) => p.kind === 'customer');
    expect(customer).toBeTruthy();
    const tree = render(<CustomerDetail store={store} partyId={customer?.id ?? ''} language="or" />);
    expect(text(byTestId(tree, 'p2-name'))).toBe(customer?.name);
  });

  it('longest string mode at the largest type keeps the name and both actions', () => {
    const tree = render(
      <CustomerDetail
        store={adversarialStore()}
        partyId={advCustomer()?.id ?? ''}
        language="longest"
        display="focus"
      />,
    );
    expect(byTestId(tree, 'p2-action-collect')).toBeTruthy();
    expect(byTestId(tree, 'p2-action-udhar')).toBeTruthy();
  });

  it('chrome is capped; money is not', () => {
    const tree = render(<CustomerDetail store={canonicalStore()} partyId={CUSTOMER} />);
    expect(byTestId(tree, 'p2-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 'p2-headline').props?.allowFontScaling).toBe(true);
  });
});

describe('P2 accessibility, and it is not an entry screen', () => {
  const TREES = () => [
    render(<CustomerDetail store={canonicalStore()} partyId={CUSTOMER} />),
    render(
      <CustomerDetail store={canonicalStore()} partyId={CUSTOMER} display="focus" language="or" />,
    ),
    render(<CustomerDetail store={canonicalStore()} partyId="p-nobody" />),
    render(<CustomerDetail store={canonicalStore()} partyId={CUSTOMER} status="error" />),
    render(
      <CustomerDetail
        store={adversarialStore()}
        partyId={advCustomer()?.id ?? ''}
        language="longest"
        display="focus"
      />,
    ),
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

  it('nothing is typed here, so no keypad - and therefore no bottom nav either', () => {
    const ids = all(render(<CustomerDetail store={canonicalStore()} partyId={CUSTOMER} />)).map(
      (n) => String(n.props?.testID ?? ''),
    );
    expect(ids.filter((id) => /^keypad/.test(id))).toEqual([]);
    expect(ids.filter((id) => /nav|tabbar|bottom-bar/i.test(id))).toEqual([]);
  });

  it('each action announces the words on its face', () => {
    const tree = render(<CustomerDetail store={canonicalStore()} partyId={CUSTOMER} />);
    // USABILITY item 5: the primary action is the tile's own word, "Collect".
    expect(byTestId(tree, 'p2-action-collect').props?.accessibilityLabel).toBe(phrase('act.collect', 'en'));
    expect(byTestId(tree, 'p2-action-udhar').props?.accessibilityLabel).toBe(phrase('p2.newUdhar', 'en'));
    expect(byTestId(tree, 'p2-action-collect').props?.accessibilityRole).toBe('button');
  });
});

describe('USABILITY item 5 - the person page leads with what he owes', () => {
  it('mutates the store and the hero follows the balance, not today\'s change', () => {
    const store = canonicalStore();
    const read = () => text(byTestId(render(<CustomerDetail store={store} partyId={CUSTOMER} />), 'p2-headline'));
    const before = read();
    store.append(line('p2-hero-1', 'udhar_sales', 12300));
    const after = read();
    expect(after).not.toBe(before);
    const balance = store.partyBalance(CUSTOMER);
    expect(after).toBe(formatPaise(balance < 0 ? subtract(0, balance) : balance, { withSign: false }));
  });

  // v2 "Mitra": the one primary fill is `brand` now, not marigold `accent` (DESIGN-SYSTEM-V2 1.1).
  it('Collect is the one primary action; a new udhar sale is the quiet second', () => {
    const t = tokens('comfort');
    const tree = render(<CustomerDetail store={canonicalStore()} partyId={CUSTOMER} />);
    expect(byTestId(tree, 'p2-action-collect').props.style.backgroundColor).toBe(t.color.brand);
    expect(byTestId(tree, 'p2-action-udhar').props.style.backgroundColor).not.toBe(t.color.brand);
    const primary = all(tree).filter((n) => n.type === 'Pressable' && n.props?.style?.backgroundColor === t.color.brand);
    expect(primary.map((n) => n.props.testID)).toEqual(['p2-action-collect']);
  });
});
