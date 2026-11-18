/**
 * P3 SUPPLIER DETAIL - the §B.6 bar.
 *
 * P2 AND P3 ARE ONE COMPONENT, so this file does not re-test the component.
 * `P2.test.tsx` covers the shared ledger: the signs, the sum equalling the
 * headline, the foreign-party exclusion. Repeating all of that here would be two
 * copies of one assertion set, and the copy that drifts is the one nobody
 * re-reads.
 *
 * What is tested here is exactly what P3 decides differently - the word on the
 * figure, the single action, and the supplier direction - plus the eight-child
 * bar, which is per screen and not inherited.
 */
import { describe, it, expect } from 'vitest';
import { SupplierDetail } from './P3.tsx';
import { canonicalStore, adversarialStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { formatPaise, subtract, type Entry } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import { CANONICAL_DATE } from '@swafto/fixtures';

const SUPPLIER = 'p-wholesale';
const advSupplier = () => adversarialStore().state.parties.find((p) => p.kind === 'supplier');

const line = (id: string, section: Entry['section'], amount: number, partyId = SUPPLIER): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section,
    amount,
    mode: section === 'purchase' ? 'udhar' : 'cash',
    partyId,
    source: 'manual',
    createdAt: `${CANONICAL_DATE}T18:30:00.000Z`,
  }) as Entry;

describe('P3 renders all four states', () => {
  it('loading', () => {
    const tree = render(
      <SupplierDetail store={canonicalStore()} partyId={SUPPLIER} status="loading" />,
    );
    expect(byTestId(tree, 'p3-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error offers a way back', () => {
    const tree = render(
      <SupplierDetail store={canonicalStore()} partyId={SUPPLIER} status="error" />,
    );
    expect(byTestId(tree, 'p3-error')).toBeTruthy();
    expect(byTestId(tree, 'p3-retry')).toBeTruthy();
  });

  it('empty: a supplier with no lines today says so', () => {
    const tree = render(<SupplierDetail store={canonicalStore()} partyId="p-nobody" />);
    expect(byTestId(tree, 'p3-empty')).toBeTruthy();
    expect(text(byTestId(tree, 'p3-empty'))).toBe(phrase('p3.empty', 'en'));
  });

  it('loaded: the name and one row per line', () => {
    const store = canonicalStore();
    const tree = render(<SupplierDetail store={store} partyId={SUPPLIER} />);
    expect(text(byTestId(tree, 'p3-name'))).toBe('Gupta Wholesale');
    for (const e of store.partyEntries(SUPPLIER)) {
      expect(byTestId(tree, 'p3-line-' + e.id)).toBeTruthy();
    }
  });
});

describe('P3 mutates the store, from the supplier side', () => {
  it('a payment lowers what the shop owes and renders as a negative line', () => {
    const store = canonicalStore();
    const before = store.partyMovementToday(SUPPLIER);

    store.append(line('p3-t1', 'party_payment', 45000));

    const tree = render(<SupplierDetail store={store} partyId={SUPPLIER} />);
    expect(store.partyMovementToday(SUPPLIER)).toBe(subtract(before, 45000));
    expect(text(byTestId(tree, 'p3-line-p3-t1'))).toContain(
      formatPaise(subtract(0, 45000), { withSign: true }),
    );
    expect(text(byTestId(tree, 'p3-headline'))).toBe(
      formatPaise(subtract(before, 45000), { withSign: false }),
    );
  });

  it('an udhar purchase raises it', () => {
    const store = canonicalStore();
    const before = store.partyMovementToday(SUPPLIER);
    store.append(line('p3-t2', 'purchase', 70000));
    expect(store.partyMovementToday(SUPPLIER)).toBeGreaterThan(before);
  });

  it('the single action reports intent and writes nothing', () => {
    const store = canonicalStore();
    const pressed: string[] = [];
    const before = store.revision;
    const tree = render(
      <SupplierDetail
        store={store}
        partyId={SUPPLIER}
        onRecordPayment={() => pressed.push('pay')}
      />,
    );
    byTestId(tree, 'p3-action-pay').props.onPress();
    expect(pressed).toEqual(['pay']);
    expect(store.revision).toBe(before);
  });
});

describe('P3 says what P2 says, from the other side', () => {
  it('the figure is labelled as a MOVEMENT, never as a balance either side owes', () => {
    /*
     * THIS TEST USED TO ASSERT THE OPPOSITE, AND THE SCREEN WAS WRONG.
     *
     * It required the bar to read "You owe" and refused "Owed to you" - a real
     * distinction, but about the wrong quantity. The figure is
     * `partyMovementToday`, which goes NEGATIVE when the shop pays, so the bar
     * rendered "You owe -2,100": not a sentence, and read literally the reverse
     * of what happened.
     *
     * Neither direction word is honest about a movement, so both screens say
     * what the number is. The customer/supplier distinction is still real and is
     * asserted below, where it actually lives: the title and the actions.
     */
    const tree = render(<SupplierDetail store={canonicalStore()} partyId={SUPPLIER} />);
    const page = text(byTestId(tree, 'p3'));
    expect(page).toContain(phrase('p1.changeToday', 'en'));
    expect(page).not.toContain(phrase('t8.outstanding', 'en'));
    expect(text(byTestId(tree, 'p3-title'))).toBe(phrase('p3.title', 'en'));
  });

  it('ONE action, not two - a supplier is paid, never given credit from here', () => {
    /*
     * Taking stock on credit is a PURCHASE: it has a section, a mode and a due
     * date, and it belongs in the purchase form. A second button here would be
     * quick-add with its own store, which the spec's anti-pattern list names.
     */
    const ids = all(render(<SupplierDetail store={canonicalStore()} partyId={SUPPLIER} />))
      .map((n) => String(n.props?.testID ?? ''))
      .filter((id) => id.startsWith('p3-action-'));
    expect(ids).toEqual(['p3-action-pay']);
  });
});

describe('P3 in every language, including the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title is in that language', () => {
      const tree = render(
        <SupplierDetail store={canonicalStore()} partyId={SUPPLIER} language={language} />,
      );
      expect(text(byTestId(tree, 'p3-title'))).toBe(phrase('p3.title', language));
    });
  }

  it('the adversarial shop renders its longest supplier name in full', () => {
    const supplier = advSupplier();
    expect(supplier).toBeTruthy();
    const tree = render(
      <SupplierDetail store={adversarialStore()} partyId={supplier?.id ?? ''} language="or" />,
    );
    expect(text(byTestId(tree, 'p3-name'))).toBe(supplier?.name);
  });

  it('longest string mode at the largest type keeps the action reachable', () => {
    const tree = render(
      <SupplierDetail
        store={adversarialStore()}
        partyId={advSupplier()?.id ?? ''}
        language="longest"
        display="focus"
      />,
    );
    expect(byTestId(tree, 'p3-action-pay')).toBeTruthy();
  });

  it('chrome is capped; money is not', () => {
    const tree = render(<SupplierDetail store={canonicalStore()} partyId={SUPPLIER} />);
    expect(byTestId(tree, 'p3-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 'p3-headline').props?.allowFontScaling).toBe(true);
  });
});

describe('P3 accessibility, and it is not an entry screen', () => {
  const TREES = () => [
    render(<SupplierDetail store={canonicalStore()} partyId={SUPPLIER} />),
    render(
      <SupplierDetail store={canonicalStore()} partyId={SUPPLIER} display="focus" language="or" />,
    ),
    render(<SupplierDetail store={canonicalStore()} partyId="p-nobody" />),
    render(<SupplierDetail store={canonicalStore()} partyId={SUPPLIER} status="error" />),
    render(
      <SupplierDetail
        store={adversarialStore()}
        partyId={advSupplier()?.id ?? ''}
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
    const ids = all(render(<SupplierDetail store={canonicalStore()} partyId={SUPPLIER} />)).map(
      (n) => String(n.props?.testID ?? ''),
    );
    expect(ids.filter((id) => /^keypad/.test(id))).toEqual([]);
    expect(ids.filter((id) => /nav|tabbar|bottom-bar/i.test(id))).toEqual([]);
  });

  it('the action announces the words on its face', () => {
    const tree = render(<SupplierDetail store={canonicalStore()} partyId={SUPPLIER} />);
    expect(byTestId(tree, 'p3-action-pay').props?.accessibilityLabel).toBe(
      phrase('p3.recordPayment', 'en'),
    );
    expect(byTestId(tree, 'p3-action-pay').props?.accessibilityRole).toBe('button');
  });
});
