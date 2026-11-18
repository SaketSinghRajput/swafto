/**
 * T16 POST A CORRECTION - the §B.6 bar, and D7 held from the screen inwards.
 *
 * THE ONE PROPERTY THAT MATTERS: on a closed day a correction HOLDS rather than
 * writes. The closed day's entries and figures are byte-for-byte what they were;
 * the correction waits, and the screen says - before the tap and after it - that
 * it will land on the next business day, at the shop's own start time.
 *
 * Driven from T3's "Post a correction" through `<App session>`, because that
 * button used to route to T5, the open day's list, which on a frozen day is a
 * screen with nothing on it that can be done.
 */
import { describe, it, expect } from 'vitest';
import { CorrectDay } from './T16.tsx';
import { canonicalStore, adversarialStore, closedStore, closedAdversarialStore, returnsStore } from './registry.tsx';
import { Session } from '../app/session.tsx';
import { App } from '../app/App.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { CANONICAL_DATE } from '@swafto/fixtures';
import { formatPaise, isEventSection } from '@swafto/formula-engine';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import type { Store } from '../store/index.ts';

const T0 = CANONICAL_DATE + 'T22:00:00.000Z';

const sessionOn = (store: Store): Session => {
  let n = 0;
  return new Session(store, { now: () => T0, newId: () => 'n' + String(++n) });
};

const press = (s: Session, testID: string) => byTestId(render(<App session={s} />), testID).props.onPress();

const rows = (tree: ReturnType<typeof render>) =>
  all(tree).filter((n) => /^t16-entry-/.test(String(n.props?.testID ?? '')));

describe('T16 renders all four states', () => {
  it('loading', () => {
    const tree = render(<CorrectDay store={closedStore()} status="loading" />);
    expect(byTestId(tree, 't16-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error', () => {
    expect(byTestId(render(<CorrectDay store={closedStore()} status="error" />), 't16-error')).toBeTruthy();
  });

  it('empty: an open day has no closed day to correct', () => {
    const tree = render(<CorrectDay store={canonicalStore()} />);
    expect(text(byTestId(tree, 't16-empty'))).toBe(phrase('t16.empty', 'en'));
  });

  it("loaded: the closed day's entries, every one of them", () => {
    const store = closedStore();
    expect(rows(render(<CorrectDay store={store} />))).toHaveLength(store.state.entries.length);
  });
});

describe('D7 - the closed day is never written', () => {
  it('says the day stays as it was and cannot be reopened, before anything is offered', () => {
    const tree = render(<CorrectDay store={closedStore()} />);
    expect(text(byTestId(tree, 't16-frozen'))).toBe(phrase('t16.frozen', 'en'));
  });

  it("says it lands on the next business day, at the shop's own start time", () => {
    const store = closedStore();
    store.setDayStart('04:00');
    expect(text(byTestId(render(<CorrectDay store={store} />), 't16-next-day'))).toBe(
      'It will be recorded on the next business day, when that day starts at 04:00.',
    );
    expect(text(byTestId(render(<CorrectDay store={closedStore()} />), 't16-next-day'))).toContain('00:00');
  });

  it('on a closed day the correction HOLDS: mutates the store, and the closed day is untouched', () => {
    const store = closedStore();
    const s = sessionOn(store);
    const entriesBefore = store.state.entries;
    const salesBefore = store.primary().p4NetSales.value;

    // From T3's own button - the route that used to land on T5.
    press(s, 't3-correction');
    expect(s.state.screen).toBe('T16');
    press(s, 't16-entry-c-01');
    for (const d of '50') s.press(d as '0');
    press(s, 't16-add');

    expect(store.state.entries).toEqual(entriesBefore);
    expect(store.primary().p4NetSales.value).toBe(salesBefore);
    expect(store.state.heldCorrections).toEqual([
      expect.objectContaining({ originalId: 'c-01', amount: 5000 }),
    ]);
    const tree = render(<App session={s} />);
    expect(text(byTestId(tree, 't16-outcome-held'))).toBe(phrase('t16.held', 'en'));
    expect(text(byTestId(tree, 't16-held'))).toContain(formatPaise(5000, { withSign: false }));
  });

  it('choosing an entry says what it adds to, and asks for the amount on the keypad', () => {
    const s = sessionOn(closedStore());
    s.openCorrection();
    s.chooseCorrectionTarget('c-01');
    const tree = render(<App session={s} />);
    expect(text(byTestId(tree, 't16-target-line'))).toContain(phrase('section.cash_sales', 'en') + ' of ');
    expect(byTestId(tree, 't16-add').props.disabled).toBe(true);
    expect(byTestId(tree, 'keypad')).toBeTruthy();
  });

  it('the recorded outcome is said in its own words', () => {
    const tree = render(<CorrectDay store={closedStore()} correction={{ originalId: null, outcome: 'recorded' }} />);
    expect(text(byTestId(tree, 't16-outcome-recorded'))).toBe(phrase('t16.recorded', 'en'));
  });

  it("a return's legs are not offered for correction", () => {
    const store = returnsStore(canonicalStore());
    store.close(store.expectedCash().value);
    const offered = rows(render(<CorrectDay store={store} />)).map((n) =>
      String(n.props.testID).slice('t16-entry-'.length),
    );
    const events = store.state.entries.filter((e) => isEventSection(e.section));
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) expect(offered).not.toContain(e.id);
    expect(offered).toHaveLength(store.state.entries.length - events.length);
  });
});

describe('T16 against both fixtures and every language', () => {
  it('adversarial: the closed adversarial day renders its lakh figures', () => {
    const store = closedAdversarialStore();
    expect(rows(render(<CorrectDay store={store} language="or" />))).toHaveLength(store.state.entries.length);
  });

  it('adversarial, open: still the empty state, never an offer to write a frozen day', () => {
    expect(byTestId(render(<CorrectDay store={adversarialStore()} />), 't16-empty')).toBeTruthy();
  });

  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title and the frozen line are in that language', () => {
      const tree = render(<CorrectDay store={closedStore()} language={language} />);
      expect(text(byTestId(tree, 't16-title'))).toBe(phrase('t3.correction', language));
      expect(text(byTestId(tree, 't16-frozen'))).toBe(phrase('t16.frozen', language));
    });
  }

  it('longest string mode keeps the frozen line, the next-day line and every entry', () => {
    const store = closedAdversarialStore();
    const tree = render(<CorrectDay store={store} language="longest" display="focus" />);
    expect(byTestId(tree, 't16-frozen')).toBeTruthy();
    expect(byTestId(tree, 't16-next-day')).toBeTruthy();
    expect(rows(tree)).toHaveLength(store.state.entries.length);
  });

  it('chrome is capped; money is not', () => {
    const tree = render(
      <CorrectDay store={closedStore()} correction={{ originalId: 'c-01', outcome: null }} draftPaise={5000} />,
    );
    expect(byTestId(tree, 't16-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 't16-draft-amount').props?.maxFontSizeMultiplier).toBeUndefined();
  });
});

describe('T16 accessibility and its keypad', () => {
  const TREES = () => [
    render(<CorrectDay store={closedStore()} />),
    render(<CorrectDay store={closedAdversarialStore()} display="focus" />),
    render(<CorrectDay store={closedStore()} correction={{ originalId: 'c-01', outcome: null }} draftPaise={5000} />),
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

  it('the keypad appears only once an entry is chosen, and never beside a bottom nav', () => {
    const [list, , chosen] = TREES();
    expect(all(list!).some((n) => n.props?.testID === 'keypad')).toBe(false);
    expect(byTestId(chosen!, 'keypad')).toBeTruthy();
    for (const tree of [list!, chosen!]) {
      expect(
        all(tree)
          .map((n) => String(n.props?.testID ?? ''))
          .filter((id) => /nav|tabbar|bottom-bar/i.test(id)),
      ).toEqual([]);
    }
  });
});
