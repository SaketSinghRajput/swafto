/**
 * P6 A CUSTOMER'S CREDIT LIMIT (R5 FR-6) - the §B.6 bar.
 *
 * THE PROPERTY THAT MATTERS: one input, nothing pre-filled, and a limit that
 * blocks nothing. The flow through the session (P2 -> P6 -> save -> P2) is in
 * apps/mobile/test/r5-free.spec.tsx; this file holds the screen to the bar.
 */
import { describe, it, expect } from 'vitest';
import { CreditLimit } from './P6.tsx';
import { canonicalStore, adversarialStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

const customer = (store: Store) => store.state.parties.find((p) => p.kind === 'customer')!.id;
const ids = (tree: ReturnType<typeof render>) => all(tree).map((n) => String(n.props?.testID ?? ''));
const setLimit = (store: Store, limit: number | null, id = 'l1') =>
  store.setCreditLimit({ id, partyId: customer(store), limit, setAt: '2026-07-15T09:00:00.000Z' });

describe('P6 renders all four states', () => {
  it('loading', () => {
    const store = canonicalStore();
    const tree = render(<CreditLimit store={store} partyId={customer(store)} status="loading" />);
    expect(byTestId(tree, 'p6-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error', () => {
    const store = canonicalStore();
    expect(byTestId(render(<CreditLimit store={store} partyId={customer(store)} status="error" />), 'p6-error')).toBeTruthy();
  });

  it('empty: no limit yet, nothing typed, nothing pre-filled, nothing to save or remove', () => {
    const store = canonicalStore();
    const tree = render(<CreditLimit store={store} partyId={customer(store)} />);
    expect(text(byTestId(tree, 'p6-current'))).toBe(phrase('p2.noLimit', 'en'));
    expect(text(byTestId(tree, 'p6-amount-figure'))).toBe('₹0.00');
    expect(byTestId(tree, 'p6-save').props.disabled).toBe(true);
    expect(ids(tree)).not.toContain('p6-clear');
  });

  it('loaded: the limit in force, the new one typed, save live, remove offered', () => {
    const store = canonicalStore();
    setLimit(store, 300000);
    const tree = render(<CreditLimit store={store} partyId={customer(store)} amountPaise={500000} />);
    expect(text(byTestId(tree, 'p6-current'))).toBe('₹3,000.00');
    expect(text(byTestId(tree, 'p6-prompt'))).toContain('Ramesh');
    expect(byTestId(tree, 'p6-save').props.disabled).toBe(false);
    expect(ids(tree)).toContain('p6-clear');
  });
});

describe('P6 is wired: it mutates the store and the screen re-derives', () => {
  it('a new row changes "Limit now"; clearing it is another row, never an edit', () => {
    const store = canonicalStore();
    setLimit(store, 300000, 'l1');
    expect(text(byTestId(render(<CreditLimit store={store} partyId={customer(store)} />), 'p6-current'))).toBe('₹3,000.00');
    setLimit(store, 120000, 'l2');
    expect(text(byTestId(render(<CreditLimit store={store} partyId={customer(store)} />), 'p6-current'))).toBe('₹1,200.00');
    setLimit(store, null, 'l3');
    expect(text(byTestId(render(<CreditLimit store={store} partyId={customer(store)} />), 'p6-current'))).toBe(
      phrase('p2.noLimit', 'en'),
    );
    expect(store.state.creditLimits).toHaveLength(3);
  });

  it('Save and Remove report the tap and decide nothing', () => {
    const store = canonicalStore();
    setLimit(store, 300000);
    const taps: string[] = [];
    const tree = render(
      <CreditLimit
        store={store}
        partyId={customer(store)}
        amountPaise={100}
        onSave={() => taps.push('save')}
        onClear={() => taps.push('clear')}
      />,
    );
    byTestId(tree, 'p6-save').props.onPress();
    byTestId(tree, 'p6-clear').props.onPress();
    expect(taps).toEqual(['save', 'clear']);
  });

  it('against the adversarial shop: the longest name is in the prompt', () => {
    const store = adversarialStore();
    const name = store.state.parties.find((p) => p.id === customer(store))!.name;
    expect(text(byTestId(render(<CreditLimit store={store} partyId={customer(store)} language="or" />), 'p6-prompt'))).toContain(name);
  });
});

describe('P6 in every language, including the longest string at the largest type', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': title, save and the current line are in that language', () => {
      const store = canonicalStore();
      const tree = render(<CreditLimit store={store} partyId={customer(store)} language={language} />);
      expect(text(byTestId(tree, 'p6-title'))).toBe(phrase('p6.title', language));
      expect(text(byTestId(tree, 'p6-save'))).toContain(phrase('p6.save', language));
      expect(text(byTestId(tree, 'p6-current'))).toBe(phrase('p2.noLimit', language));
    });
  }

  it('longest string mode in focus keeps the save and the keypad, the prompt capped', () => {
    const store = adversarialStore();
    setLimit(store, 300000);
    const tree = render(
      <CreditLimit store={store} partyId={customer(store)} language="longest" display="focus" amountPaise={9999900} />,
    );
    expect(byTestId(tree, 'p6-save')).toBeTruthy();
    expect(ids(tree).some((id) => /^keypad/.test(id))).toBe(true);
    expect(byTestId(tree, 'p6-prompt').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });
});

describe('P6 accessibility, and it is an entry screen', () => {
  const TREES = () => {
    const a = canonicalStore();
    const b = adversarialStore();
    setLimit(b, 300000);
    return [
      render(<CreditLimit store={a} partyId={customer(a)} />),
      render(<CreditLimit store={b} partyId={customer(b)} language="or" display="focus" amountPaise={500000} />),
      render(<CreditLimit store={a} partyId={customer(a)} status="error" />),
      render(<CreditLimit store={b} partyId={customer(b)} language="longest" display="focus" amountPaise={500000} />),
    ];
  };

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

  it('the amount is typed here, so the keypad is present - and never beside a bottom nav', () => {
    const store = canonicalStore();
    const found = ids(render(<CreditLimit store={store} partyId={customer(store)} />));
    expect(found.some((id) => /^keypad/.test(id))).toBe(true);
    expect(found.filter((id) => /nav|tabbar|bottom-bar/i.test(id))).toEqual([]);
  });
});
