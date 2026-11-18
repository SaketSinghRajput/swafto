/**
 * S12 ENTRIES FOR YOUR ACCOUNTANT (R5 FR-4) - the §B.6 bar.
 *
 * The CSV itself - its columns, its rupees, its formula guard - is tested in
 * apps/mobile/test/r5-free.spec.tsx. This file holds the screen: the months the
 * book has entries in, the L-15 sentence, and nothing called an invoice.
 */
import { describe, it, expect } from 'vitest';
import { AccountantExport } from './S12.tsx';
import { canonicalStore, adversarialStore, firstRunStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import type { Entry } from '@swafto/formula-engine';

const ids = (tree: ReturnType<typeof render>) => all(tree).map((n) => String(n.props?.testID ?? ''));
const months = (tree: ReturnType<typeof render>) => ids(tree).filter((id) => /^s12-month-\d{4}-\d{2}$/.test(id));

describe('S12 renders all four states', () => {
  it('loading', () => {
    const tree = render(<AccountantExport store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 's12-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error', () => {
    expect(byTestId(render(<AccountantExport store={canonicalStore()} status="error" />), 's12-error')).toBeTruthy();
  });

  it('empty: no entries, so nothing to share - said so', () => {
    const tree = render(<AccountantExport store={firstRunStore()} />);
    expect(byTestId(tree, 's12-empty')).toBeTruthy();
    expect(months(tree)).toEqual([]);
  });

  it('loaded: the month the book has, the L-15 sentence, and the body', () => {
    const tree = render(<AccountantExport store={canonicalStore()} />);
    expect(months(tree)).toEqual(['s12-month-2026-07']);
    expect(text(byTestId(tree, 's12-month-2026-07'))).toBe('July 2026');
    expect(text(byTestId(tree, 's12-not-tax'))).toBe(phrase('s5.notTax', 'en'));
  });
});

describe('S12 mutates the store and the months re-derive', () => {
  it('the first entry of an empty book makes its month appear, and a tap names it', () => {
    const store = firstRunStore();
    expect(months(render(<AccountantExport store={store} />))).toEqual([]);
    store.setOpeningCash(0);
    store.append({
      id: 's12-wired',
      dayId: store.state.day.date,
      section: 'cash_sales',
      amount: 1000,
      mode: 'cash',
      source: 'manual',
      createdAt: '2026-07-15T19:00:00.000Z',
    } as Entry);
    expect(months(render(<AccountantExport store={store} />))).toEqual(['s12-month-2026-07']);
    const chosen: string[] = [];
    byTestId(render(<AccountantExport store={store} onShareMonth={(m) => chosen.push(m)} />), 's12-month-2026-07').props.onPress();
    expect(chosen).toEqual(['2026-07']);
  });

  it('against the adversarial shop the screen still lists its month', () => {
    expect(months(render(<AccountantExport store={adversarialStore()} language="or" />)).length).toBe(1);
  });
});

describe('S12 in every language, including the longest string at the largest type', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': title, body and the sentence are in that language', () => {
      const tree = render(<AccountantExport store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 's12-title'))).toBe(phrase('s12.title', language));
      expect(text(byTestId(tree, 's12-explain'))).toBe(phrase('s12.body', language));
      expect(text(byTestId(tree, 's12-not-tax'))).toBe(phrase('s5.notTax', language));
    });
  }

  it('longest string mode in focus keeps the month rows, the body capped', () => {
    const tree = render(<AccountantExport store={adversarialStore()} language="longest" display="focus" />);
    expect(months(tree).length).toBe(1);
    expect(byTestId(tree, 's12-explain').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });
});

describe('S12 accessibility, and it is not an entry screen', () => {
  const TREES = () => [
    render(<AccountantExport store={canonicalStore()} />),
    render(<AccountantExport store={adversarialStore()} language="or" display="focus" />),
    render(<AccountantExport store={canonicalStore()} status="error" />),
    render(<AccountantExport store={adversarialStore()} language="longest" display="focus" />),
    render(<AccountantExport store={firstRunStore()} language="or" display="focus" />),
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

  it('nothing is typed here, so no keypad - and no bottom nav; it has a back', () => {
    const found = ids(render(<AccountantExport store={canonicalStore()} onBack={() => {}} />));
    expect(found.filter((id) => /^keypad/.test(id))).toEqual([]);
    expect(found.filter((id) => /nav|tabbar|bottom-bar/i.test(id))).toEqual([]);
    expect(found).toContain('s12-back');
  });
});
