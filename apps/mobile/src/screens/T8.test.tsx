/**
 * T8 FORM B - the §B.6 bar.
 *
 * T8 is a DECLARATION over the shared entry form: which sections it lists, which
 * engine figure is its running total, and what its three buttons commit. So this
 * file tests the declaration, and trusts the form - which has its own tests
 * through T7 - to render it.
 *
 * The three directions are the point. Money back from a customer, money out to a
 * supplier, a new sale on credit; all three name a PERSON, which is what makes
 * this form different from Form A.
 */
import { describe, it, expect } from 'vitest';
import { FormB } from './T8.tsx';
import { canonicalStore, adversarialStore, emptyStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { CANONICAL_DATE, CANONICAL_PARTIES } from '@swafto/fixtures';
import { formatPaise, type Entry } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';

const collection = (id: string, amount: number): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section: 'udhar_collection',
    amount,
    mode: 'cash',
    partyId: CANONICAL_PARTIES[0]!.id,
    source: 'manual',
    createdAt: CANONICAL_DATE + 'T19:30:00.000Z',
  }) as Entry;

const lines = (tree: ReturnType<typeof render>) =>
  all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('t8-line-'));

describe('T8 renders all four states', () => {
  it('loading', () => {
    const tree = render(<FormB store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 't8-loading')).toBeTruthy();
    expect(byType(tree, 'ActivityIndicator')).toHaveLength(1);
  });

  it('error', () => {
    const tree = render(<FormB store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 't8-error')).toBeTruthy();
    expect(byTestId(tree, 't8-retry')).toBeTruthy();
  });

  it('empty: a shop with no party movements yet', () => {
    expect(byTestId(render(<FormB store={emptyStore()} />), 't8-empty')).toBeTruthy();
  });

  it('loaded: only the three party sections, never a cash sale', () => {
    const store = canonicalStore();
    const tree = render(<FormB store={store} />);
    const shown = store.state.entries.filter((e) =>
      ['udhar_collection', 'party_payment', 'udhar_sales'].includes(e.section),
    );
    expect(lines(tree)).toHaveLength(shown.length);
    expect(lines(tree).length).toBeLessThan(store.state.entries.length);
  });
});

describe('every figure on T8 is the engine figure', () => {
  it('mutates the store and the headline follows P7', () => {
    const store = canonicalStore();
    const before = text(byTestId(render(<FormB store={store} />), 't8-headline'));

    store.append(collection('t8-1', 100000));

    const after = text(byTestId(render(<FormB store={store} />), 't8-headline'));
    expect(after).not.toBe(before);
    expect(after).toBe(formatPaise(store.primary().p7CreditOutstanding.value, { withSign: false }));
  });

  it('mutates the store and a line appears naming the customer', () => {
    const store = canonicalStore();
    store.append(collection('t8-2', 5000));
    const tree = render(<FormB store={store} />);
    expect(byTestId(tree, 't8-line-t8-2')).toBeTruthy();
    // A party line without the party name is the one that costs money later.
    expect(text(byTestId(tree, 't8-line-t8-2'))).toContain(CANONICAL_PARTIES[0]!.name);
  });

  it('the draft is what was passed, through the one money path', () => {
    const tree = render(<FormB store={canonicalStore()} draftPaise={98765} />);
    expect(text(byTestId(tree, 't8-draft-amount'))).toBe(formatPaise(98765, { withSign: false }));
  });
});

describe('T8 against both fixtures and every language', () => {
  it('adversarial: a long Odia party name is shown whole', () => {
    const store = adversarialStore();
    const tree = render(<FormB store={store} language="or" />);
    const credit = store.state.entries.filter((e) => e.section === 'udhar_sales' && e.partyId);
    expect(credit.length).toBeGreaterThan(0);
    for (const e of credit) {
      const party = store.state.parties.find((p) => p.id === e.partyId);
      if (party) expect(text(tree)).toContain(party.name);
    }
  });

  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title is in that language', () => {
      const tree = render(<FormB store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 't8-title'))).toBe(phrase('t8.title', language));
    });
  }

  it('longest string mode keeps every line', () => {
    const store = adversarialStore();
    const long = lines(render(<FormB store={store} language="longest" display="focus" />)).length;
    expect(long).toBe(lines(render(<FormB store={store} language="en" />)).length);
  });

  it('chrome is capped; money is not', () => {
    const tree = render(<FormB store={canonicalStore()} />);
    expect(byTestId(tree, 't8-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 't8-headline').props?.maxFontSizeMultiplier).toBeUndefined();
  });
});

describe('T8 accessibility and its keypad', () => {
  const TREES = () => [
    render(<FormB store={canonicalStore()} />),
    render(<FormB store={adversarialStore()} display="focus" />),
    render(<FormB store={emptyStore()} />),
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

  it('it is an entry screen, so the keypad is present and no bottom nav is', () => {
    const tree = render(<FormB store={canonicalStore()} />);
    expect(byTestId(tree, 'keypad')).toBeTruthy();
    expect(
      all(tree)
        .map((n) => String(n.props?.testID ?? ''))
        .filter((id) => /nav|tabbar|bottom-bar/i.test(id)),
    ).toEqual([]);
  });

  it('the three directions are all offered, and each reports itself', () => {
    const committed: string[] = [];
    const tree = render(
      <FormB store={canonicalStore()} onCommit={(o) => committed.push(o.section)} />,
    );
    byTestId(tree, 't8-commit-cash-udhar_collection').props.onPress();
    byTestId(tree, 't8-commit-cash-party_payment').props.onPress();
    byTestId(tree, 't8-commit-udhar-udhar_sales').props.onPress();
    expect(committed).toEqual(['udhar_collection', 'party_payment', 'udhar_sales']);
  });

  it('the screen writes nothing itself', () => {
    const store = canonicalStore();
    const before = store.state.entries.length;
    const tree = render(<FormB store={store} />);
    byTestId(tree, 't8-commit-cash-udhar_collection').props.onPress();
    expect(store.state.entries.length).toBe(before);
  });
});
