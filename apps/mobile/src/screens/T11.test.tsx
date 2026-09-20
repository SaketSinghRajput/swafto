/**
 * T11 CASH CHECK, COUNTING - the §B.6 bar.
 *
 * THE WORKING IS THE SCREEN, so the working is the test. The build map is blunt
 * about it: "Cash check is a reading screen with one input... Treating it as a
 * fifth form is the mistake that turns the most important screen in the product
 * into a data-entry chore." What follows checks that every line of the engine's
 * working reaches the screen with its sign, because a shopkeeper who is short by
 * three hundred rupees needs to see which line to doubt.
 */
import { describe, it, expect } from 'vitest';
import { CashCheck } from './T11.tsx';
import { canonicalStore, adversarialStore, emptyStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { CANONICAL_DATE } from '@swafto/fixtures';
import { formatPaise, subtract, type Entry } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';

const sale = (id: string, amount: number): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section: 'cash_sales',
    amount,
    mode: 'cash',
    source: 'manual',
    createdAt: CANONICAL_DATE + 'T19:30:00.000Z',
  }) as Entry;

const workingRows = (tree: ReturnType<typeof render>) =>
  all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('t11-working-'));

describe('T11 renders all four states', () => {
  it('loading', () => {
    const tree = render(<CashCheck store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 't11-loading')).toBeTruthy();
    expect(byType(tree, 'ActivityIndicator')).toHaveLength(1);
  });

  it('error', () => {
    expect(
      byTestId(render(<CashCheck store={canonicalStore()} status="error" />), 't11-error'),
    ).toBeTruthy();
  });

  it('loaded: the working, line by line', () => {
    const store = canonicalStore();
    const tree = render(<CashCheck store={store} />);
    expect(workingRows(tree)).toHaveLength(store.expectedCash().working.lines.length);
    expect(workingRows(tree).length).toBeGreaterThan(0);
  });

  it('an empty shop still shows a working - the opening cash line is one', () => {
    expect(workingRows(render(<CashCheck store={emptyStore()} />)).length).toBeGreaterThan(0);
  });
});

describe('the working is the engine working, sign for sign', () => {
  it('every line the engine produced is on the screen, with its own figure', () => {
    const store = canonicalStore();
    const tree = render(<CashCheck store={store} />);
    for (const line of store.expectedCash().working.lines) {
      const shown = line.sign === '-' ? subtract(0, line.amount) : line.amount;
      expect(text(byTestId(tree, 't11-working-' + line.key))).toContain(
        formatPaise(shown, { withSign: true }),
      );
    }
  });

  it('a subtraction is shown as a subtraction, not as a bare number', () => {
    const store = canonicalStore();
    const tree = render(<CashCheck store={store} />);
    const negatives = store
      .expectedCash()
      .working.lines.filter((l) => l.sign === '-' && l.amount !== 0);
    expect(negatives.length).toBeGreaterThan(0);
    for (const line of negatives) {
      // The sign is rendered, always. Colour is additive and never the only signal.
      expect(text(byTestId(tree, 't11-working-' + line.key))).toContain('-');
    }
  });

  it('mutates the store and both the headline and the working move', () => {
    const store = canonicalStore();
    const beforeHead = text(byTestId(render(<CashCheck store={store} />), 't11-headline'));
    const beforeLine = text(
      byTestId(render(<CashCheck store={store} />), 't11-working-working.cash_sales'),
    );

    store.append(sale('t11-1', 777700));

    const tree = render(<CashCheck store={store} />);
    expect(text(byTestId(tree, 't11-headline'))).not.toBe(beforeHead);
    expect(text(byTestId(tree, 't11-working-working.cash_sales'))).not.toBe(beforeLine);
    expect(text(byTestId(tree, 't11-headline'))).toBe(
      formatPaise(store.expectedCash().value, { withSign: false }),
    );
  });

  it('the counted figure is what was typed, and zero until he types', () => {
    expect(
      text(byTestId(render(<CashCheck store={canonicalStore()} />), 't11-counted-amount')),
    ).toBe(formatPaise(0, { withSign: false }));
    expect(
      text(
        byTestId(
          render(<CashCheck store={canonicalStore()} countedPaise={123400} />),
          't11-counted-amount',
        ),
      ),
    ).toBe(formatPaise(123400, { withSign: false }));
  });
});

describe('T11 against both fixtures and every language', () => {
  it('adversarial: renders the whole working at lakh scale', () => {
    const store = adversarialStore();
    expect(workingRows(render(<CashCheck store={store} />))).toHaveLength(
      store.expectedCash().working.lines.length,
    );
  });

  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title and the working labels are in that language', () => {
      const tree = render(<CashCheck store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 't11-title'))).toBe(phrase('t11.title', language));
      expect(text(byTestId(tree, 't11-working-working.opening_cash'))).toContain(
        phrase('working.opening_cash', language),
      );
    });
  }

  it('longest string mode keeps every working line', () => {
    const store = adversarialStore();
    expect(
      workingRows(render(<CashCheck store={store} language="longest" display="focus" />)),
    ).toHaveLength(store.expectedCash().working.lines.length);
  });

  it('chrome is capped; money is not', () => {
    const tree = render(<CashCheck store={canonicalStore()} />);
    expect(byTestId(tree, 't11-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 't11-headline').props?.maxFontSizeMultiplier).toBeUndefined();
  });
});

describe('T11 accessibility, and the one input it has', () => {
  const TREES = () => [
    render(<CashCheck store={canonicalStore()} />),
    render(<CashCheck store={adversarialStore()} display="focus" />),
    render(<CashCheck store={emptyStore()} countedPaise={5000} />),
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

  it('one input means a keypad, and therefore no bottom nav', () => {
    const tree = render(<CashCheck store={canonicalStore()} />);
    expect(byTestId(tree, 'keypad')).toBeTruthy();
    expect(
      all(tree)
        .map((n) => String(n.props?.testID ?? ''))
        .filter((id) => /nav|tabbar|bottom-bar/i.test(id)),
    ).toEqual([]);
  });

  it('the save button is dead until he has counted something', () => {
    const untouched = render(<CashCheck store={canonicalStore()} />);
    expect(byTestId(untouched, 't11-confirm').props?.disabled).toBe(true);

    const counted = render(<CashCheck store={canonicalStore()} countedPaise={100} />);
    expect(byTestId(counted, 't11-confirm').props?.disabled).toBe(false);
  });

  it('the keypad reports keys and the screen writes nothing', () => {
    const store = canonicalStore();
    const pressed: string[] = [];
    const before = store.state.day.countedCash;
    const tree = render(<CashCheck store={store} onKey={(k) => pressed.push(k)} />);
    byTestId(tree, 'keypad-5').props.onPress();
    expect(pressed).toEqual(['5']);
    expect(store.state.day.countedCash).toBe(before);
  });
});
