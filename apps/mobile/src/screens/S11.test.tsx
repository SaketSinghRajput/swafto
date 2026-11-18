/**
 * S11 APP LOCKED - the §B.6 bar, and the one assertion the screen exists for:
 * nothing from the book reaches it. The adversarial shop has the longest
 * names and lakh-scale figures, which is exactly what must not leak.
 */
import { describe, it, expect } from 'vitest';
import { AppLocked } from './S11.tsx';
import { canonicalStore, adversarialStore } from './registry.tsx';
import { render, all, byTestId, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import { CANONICAL_DATE } from '@swafto/fixtures';
import type { Entry } from '@swafto/formula-engine';

const cashSale = (id: string, amountPaise: number): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section: 'cash_sales',
    amount: amountPaise,
    mode: 'cash',
    source: 'manual',
    createdAt: CANONICAL_DATE + 'T19:30:00.000Z',
  }) as Entry;

const testIDs = (tree: ReturnType<typeof render>): string[] =>
  all(tree)
    .map((n) => String(n.props?.testID ?? ''))
    .filter(Boolean);

describe('S11 renders all four states', () => {
  it('loading', () => {
    expect(byTestId(render(<AppLocked store={canonicalStore()} status="loading" />), 's11-loading')).toBeTruthy();
  });

  it('error offers a retry', () => {
    const tree = render(<AppLocked store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 's11-error')).toBeTruthy();
    expect(byTestId(tree, 's11-retry')).toBeTruthy();
  });

  it('loaded: the sentence and the Unlock button', () => {
    const tree = render(<AppLocked store={canonicalStore()} />);
    expect(text(byTestId(tree, 's11-sentence'))).toBe(phrase('s11.body', 'en'));
    expect(byTestId(tree, 's11-unlock')).toBeTruthy();
  });

  it('there is no empty state: the cover says the same thing whatever the book holds', () => {
    expect(testIDs(render(<AppLocked store={canonicalStore()} />))).not.toContain('s11-empty');
  });
});

describe('S11 mutates the store and nothing moves, because it shows nothing from the book', () => {
  it('a day that changes under the cover changes none of its text', () => {
    const store = canonicalStore();
    const before = text(render(<AppLocked store={store} />));
    store.append(cashSale('s11-wired-1', 150000));
    expect(text(render(<AppLocked store={store} />))).toBe(before);
  });

  it('no rupee figure, no party name, no shop name - against the adversarial book', () => {
    const store = adversarialStore();
    const shown = text(render(<AppLocked store={store} language="or" />));
    expect(shown).not.toContain('₹');
    // A name of a letter or two can occur inside any word; the fixture has them on purpose.
    for (const p of store.state.parties) if ([...p.name].length > 2) expect(shown).not.toContain(p.name);
    if (store.state.shopName) expect(shown).not.toContain(store.state.shopName);
    expect(
      testIDs(render(<AppLocked store={store} />)).filter((id) => /amount|money|figure|total|party/.test(id)),
    ).toEqual([]);
  });

  it('Unlock reports the tap and decides nothing', () => {
    const taps: number[] = [];
    byTestId(
      render(<AppLocked store={canonicalStore()} onUnlock={() => taps.push(1)} />),
      's11-unlock',
    ).props.onPress();
    expect(taps).toHaveLength(1);
  });
});

describe('S11 in every language, including the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': title, sentence and button are in that language', () => {
      const tree = render(<AppLocked store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 's11-title'))).toBe(phrase('s11.title', language));
      expect(text(byTestId(tree, 's11-sentence'))).toBe(phrase('s11.body', language));
      expect(text(byTestId(tree, 's11-unlock'))).toContain(phrase('s11.unlock', language));
    });
  }

  it('longest string mode at the largest type keeps the Unlock button', () => {
    const tree = render(<AppLocked store={adversarialStore()} language="longest" display="focus" />);
    expect(byTestId(tree, 's11-unlock')).toBeTruthy();
    expect(byTestId(tree, 's11-sentence').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });
});

describe('S11 accessibility, and it is not an entry screen', () => {
  const TREES = () => [
    render(<AppLocked store={canonicalStore()} />),
    render(<AppLocked store={adversarialStore()} language="or" display="focus" />),
    render(<AppLocked store={canonicalStore()} status="error" />),
    render(<AppLocked store={adversarialStore()} language="longest" display="focus" />),
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

  it('nothing is typed here, so no keypad - and no bottom nav or back either', () => {
    const ids = testIDs(render(<AppLocked store={canonicalStore()} />));
    expect(ids.filter((id) => /^keypad/.test(id))).toEqual([]);
    expect(ids.filter((id) => /nav|tabbar|bottom-bar|back/i.test(id))).toEqual([]);
  });
});
