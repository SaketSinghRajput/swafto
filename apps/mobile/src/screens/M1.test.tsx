/**
 * M1 PREMIUM DASHBOARD - the §B.6 bar, and the two claims the screen makes.
 *
 * FIRST, THE ONE GATE. On the free plan no Premium figure is drawn at all, and
 * the screen says what Premium adds; on Premium every reading is there. The
 * decision is `allows(plan, 'dashboard')` and nothing in this file re-decides it.
 *
 * SECOND, NOTHING IS STORED. Every figure is the engine's, read through
 * `store.premiumReports()` on this render; the mutation test below changes the
 * book and requires the screen to follow.
 */
import { describe, it, expect } from 'vitest';
import { Dashboard } from './M1.tsx';
import {
  canonicalStore,
  adversarialStore,
  closedStore,
  closedAdversarialStore,
  historyStore,
} from './registry.tsx';
import { Text } from '@swafto/ui';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { formatPaise, type Entry } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase } from '../i18n/strings.ts';
import { allows } from '../app/plan.ts';
import { CANONICAL_DATE } from '@swafto/fixtures';

const ids = (tree: ReturnType<typeof render>) => all(tree).map((n) => String(n.props?.testID ?? ''));
const rupees = (p: number) => formatPaise(p, { withSign: false });

describe('M1 renders all four states', () => {
  it('loading', () => {
    const tree = render(<Dashboard store={historyStore()} plan="premium" status="loading" />);
    expect(byTestId(tree, 'm1-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error offers a retry', () => {
    let retried = 0;
    const tree = render(<Dashboard store={historyStore()} plan="premium" status="error" onRetry={() => (retried += 1)} />);
    byTestId(tree, 'm1-retry').props.onPress();
    expect(retried).toBe(1);
  });

  it('empty: Premium with nothing closed says what will fill it', () => {
    const tree = render(<Dashboard store={canonicalStore()} plan="premium" />);
    expect(text(byTestId(tree, 'm1-empty'))).toBe(phrase('m1.empty', 'en'));
    expect(ids(tree).filter((id) => id === 'm1-forecast')).toEqual([]);
  });

  it('loaded: every Premium card is there', () => {
    const tree = render(<Dashboard store={historyStore()} plan="premium" />);
    for (const id of ['m1-forecast', 'm1-last-year', 'm1-festival', 'm1-pay', 'm1-returns']) {
      expect(byTestId(tree, id), id).toBeTruthy();
    }
  });
});

describe('M1 · the one Premium gate', () => {
  it('the free plan draws no Premium figure, and says what Premium adds', () => {
    expect(allows('free', 'dashboard')).toBe(false);
    const tree = render(<Dashboard store={historyStore()} plan="free" />);
    expect(text(byTestId(tree, 'm1-locked-body'))).toBe(phrase('m1.locked.body', 'en'));
    const found = ids(tree);
    for (const id of ['m1-forecast', 'm1-last-year', 'm1-festival', 'm1-pay', 'm1-returns']) {
      expect(found.filter((x) => x === id), id).toEqual([]);
    }
  });

  it('a free shop with nothing closed still sees the Premium sentence, not the empty one', () => {
    const tree = render(<Dashboard store={canonicalStore()} plan="free" />);
    expect(byTestId(tree, 'm1-locked')).toBeTruthy();
  });

  it('the upgrade button is drawn only when there is somewhere to go', () => {
    expect(ids(render(<Dashboard store={historyStore()} plan="free" />)).filter((x) => x === 'm1-upgrade')).toEqual([]);
    let asked = 0;
    const tree = render(<Dashboard store={historyStore()} plan="free" onUpgrade={() => (asked += 1)} />);
    byTestId(tree, 'm1-upgrade').props.onPress();
    expect(asked).toBe(1);
  });

  it('the item-cards slot is handed read-only on the free plan and writable on Premium', () => {
    const seen: boolean[] = [];
    const slot = (o: { readOnly: boolean }) => {
      seen.push(o.readOnly);
      return <Text testID="slot">{String(o.readOnly)}</Text>;
    };
    expect(text(byTestId(render(<Dashboard store={historyStore()} plan="free" itemCards={slot} />), 'slot'))).toBe('true');
    expect(text(byTestId(render(<Dashboard store={historyStore()} plan="premium" itemCards={slot} />), 'slot'))).toBe('false');
    expect(seen).toEqual([true, false]);
  });
});

describe('M1 · the sales estimate (PR-3)', () => {
  it('one closed day: the gate sentence, and still the word "estimate"', () => {
    const tree = render(<Dashboard store={closedStore()} plan="premium" />);
    expect(text(byTestId(tree, 'm1-forecast-gate-gate'))).toContain('14');
    expect(text(byTestId(tree, 'm1-forecast-estimate'))).toBe(phrase('m1.forecast.estimate', 'en'));
    expect(phrase('m1.forecast.estimate', 'en')).toMatch(/estimate/);
  });

  it('thirty-one closed days: seven days ahead, each the engine point, with method and the trend gate', () => {
    const store = historyStore();
    const r = store.premiumReports().forecast;
    if (!r.available) throw new Error('the history store is past the 14-day gate');
    const tree = render(<Dashboard store={store} plan="premium" />);
    expect(text(byTestId(tree, 'm1-forecast-method'))).toBe(phrase('m1.forecast.seasonal_naive', 'en'));
    expect(r.value.days).toHaveLength(7);
    for (const d of r.value.days) {
      expect(text(byTestId(tree, `m1-forecast-${d.date}`))).toContain(rupees(d.point));
    }
    // 31 of 56: the weekday-and-trend method is still counting.
    expect(text(byTestId(tree, 'm1-forecast-hw-gate'))).toContain('31');
    expect(r.value.days[0]!.date > CANONICAL_DATE).toBe(true);
  });

  it('seventy closed days: past the 56-day gate, so the screen says which method won and why', () => {
    const store = historyStore(70);
    const r = store.premiumReports().forecast;
    if (!r.available) throw new Error('gate');
    const tree = render(<Dashboard store={store} plan="premium" />);
    const found = ids(tree);
    expect(found).toContain(r.value.method === 'holt_winters' ? 'm1-forecast-mase' : 'm1-forecast-hw-lost');
    expect(found.filter((x) => x === 'm1-forecast-hw-gate')).toEqual([]);
  });
});

describe('M1 mutates the store and every figure follows', () => {
  it('a sale appended before the close moves "this month against last year"', () => {
    const sale = (amount: number): Entry =>
      ({ id: 'm1-s', dayId: CANONICAL_DATE, section: 'cash_sales', amount, mode: 'cash', source: 'manual', createdAt: `${CANONICAL_DATE}T20:00:00.000Z` }) as Entry;
    const a = canonicalStore();
    a.close(a.expectedCash().value);
    const b = canonicalStore();
    b.append(sale(150000));
    b.close(b.expectedCash().value);
    const ta = text(byTestId(render(<Dashboard store={a} plan="premium" />), 'm1-last-year-this'));
    const tb = text(byTestId(render(<Dashboard store={b} plan="premium" />), 'm1-last-year-this'));
    expect(ta).not.toBe(tb);
    expect(tb).toContain(rupees(b.premiumReports().samePeriodLastYear.thisYear.netSales));
  });

  it('rendering it writes nothing', () => {
    const store = historyStore();
    const before = store.revision;
    render(<Dashboard store={store} plan="premium" />);
    render(<Dashboard store={store} plan="free" />);
    expect(store.revision).toBe(before);
  });
});

describe('M1 in every language, including the adversarial worst case', () => {
  it('the adversarial shop renders - lakh figures under the longest Odia labels', () => {
    const store = closedAdversarialStore();
    const tree = render(<Dashboard store={store} plan="premium" language="or" />);
    expect(text(byTestId(tree, 'm1-title'))).toBe(phrase('m1.title', 'or'));
    expect(text(byTestId(tree, 'm1-last-year-this'))).toContain(
      rupees(store.premiumReports().samePeriodLastYear.thisYear.netSales),
    );
  });

  it('the adversarial shop with its day still open is empty, like any other', () => {
    expect(byTestId(render(<Dashboard store={adversarialStore()} plan="premium" language="or" />), 'm1-empty')).toBeTruthy();
  });

  it('longest string mode at the largest type still shows every card', () => {
    const tree = render(<Dashboard store={historyStore(70)} plan="premium" language="longest" display="focus" />);
    for (const id of ['m1-forecast', 'm1-last-year', 'm1-festival', 'm1-pay', 'm1-returns', 'm1-forecast-estimate']) {
      expect(byTestId(tree, id), id).toBeTruthy();
    }
    expect(byTestId(tree, 'm1-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });

  it('the festival dates say where they came from, in each language', () => {
    for (const language of ['en', 'hi', 'or'] as const) {
      const tree = render(<Dashboard store={historyStore()} plan="premium" language={language} />);
      expect(text(byTestId(tree, 'm1-festival-source'))).toBe(phrase('m1.festival.source', language));
    }
  });
});

describe('M1 accessibility, and it is not an entry screen', () => {
  const TREES = () => [
    render(<Dashboard store={historyStore()} plan="premium" />),
    render(<Dashboard store={historyStore(70)} plan="premium" language="longest" display="focus" />),
    render(<Dashboard store={closedAdversarialStore()} plan="premium" language="or" display="focus" />),
    render(<Dashboard store={historyStore()} plan="free" language="or" onUpgrade={() => {}} />),
    render(<Dashboard store={canonicalStore()} plan="premium" />),
    render(<Dashboard store={historyStore()} plan="premium" status="error" />),
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

  it('nothing is typed here, so no keypad; it is a detail screen, so Back returns', () => {
    let back = 0;
    const tree = render(<Dashboard store={historyStore()} plan="premium" onBack={() => (back += 1)} />);
    expect(ids(tree).filter((id) => /^keypad/.test(id))).toEqual([]);
    byTestId(tree, 'm1-back').props.onPress();
    expect(back).toBe(1);
  });
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
