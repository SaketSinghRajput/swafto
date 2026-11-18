/**
 * S5 ABOUT - the §B.6 bar, and one assertion the screen exists for.
 *
 * MOST OF THIS FILE IS ABOUT A NUMBER THAT MUST NOT APPEAR. S5 is the screen
 * most likely to acquire a hardcoded version string, because a panel showing
 * "Open-source licences" and nothing else looks unfinished and a literal makes
 * it look done in one line. That literal is a figure nobody measured: it would
 * keep reporting the same build forever, and a shopkeeper on the phone to
 * support would read out a version he is not running.
 *
 * So the cases below render S5 WITHOUT a version and require that no
 * version-shaped string reaches the screen. That is the one that fails the
 * moment somebody "fixes" the row that looks empty.
 */
import { describe, it, expect } from 'vitest';
import { About } from './S5.tsx';
import { canonicalStore, adversarialStore } from './registry.tsx';
import { render, all, byTestId, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import { CANONICAL_DATE } from '@swafto/fixtures';
import type { Entry } from '@swafto/formula-engine';

/**
 * A version string shaped like a real one, supplied the only way this screen
 * accepts one - as a prop. Nothing in `S5.tsx` may hold a value like this.
 */
const A_VERSION = '1.4.2 (318)';

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

/** `byTestId` throws when a node is absent, so absence needs its own reading. */
const testIDs = (tree: ReturnType<typeof render>): string[] =>
  all(tree)
    .map((n) => String(n.props?.testID ?? ''))
    .filter(Boolean);

describe('S5 renders all four states', () => {
  it('loading', () => {
    const tree = render(<About store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 's5-loading')).toBeTruthy();
  });

  it('error offers a way back', () => {
    const tree = render(<About store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 's5-error')).toBeTruthy();
    expect(byTestId(tree, 's5-retry')).toBeTruthy();
  });

  it('loaded: the licences route and the L-15 sentence, with the version it was given', () => {
    const tree = render(<About store={canonicalStore()} version={A_VERSION} />);
    expect(byTestId(tree, 's5-licences')).toBeTruthy();
    expect(text(byTestId(tree, 's5-not-tax'))).toBe(phrase('s5.notTax', 'en'));
    expect(text(byTestId(tree, 's5-version-value'))).toBe(A_VERSION);
  });

  it('there is no empty state, because both rows are structural and not data', () => {
    /*
     * The licences route and the disclaimer exist whatever the shop has entered,
     * so `empty` cannot arise - and the frame's empty copy replaces `children`,
     * which would remove exactly the sentence LEGAL-AUDIT requires be shown.
     */
    const tree = render(<About store={canonicalStore()} />);
    expect(testIDs(tree)).not.toContain('s5-empty');
    expect(byTestId(tree, 's5-not-tax')).toBeTruthy();
  });
});

describe('S5 and the version it was never given', () => {
  it('with no version prop, no version-shaped string is rendered anywhere', () => {
    const tree = render(<About store={canonicalStore()} />);
    expect(testIDs(tree)).not.toContain('s5-version');
    expect(testIDs(tree)).not.toContain('s5-version-value');
    /*
     * NOT ONE DIGIT. None of the four strings this screen can draw - its title,
     * the licences label, "Open" and the L-15 sentence - holds a digit in any of
     * the three languages, so a digit here came from a version written into the
     * component. The shaped pattern alone would miss a bare "1".
     */
    expect(text(tree)).not.toMatch(/\d/);
    expect(text(tree)).not.toMatch(/\d+\.\d+/);
  });

  it('an empty string is absent too, not a blank row where a version should be', () => {
    const tree = render(<About store={canonicalStore()} version="" />);
    expect(testIDs(tree)).not.toContain('s5-version');
  });

  it('the version it is given is the version it shows, unaltered', () => {
    // Not reformatted, not prefixed, not tidied into something that looks nicer.
    const tree = render(<About store={canonicalStore()} version={A_VERSION} />);
    expect(text(byTestId(tree, 's5-version-value'))).toBe(A_VERSION);
    expect(text(byTestId(tree, 's5-version'))).toBe(phrase('s5.version', 'en') + A_VERSION);
  });

  it('licences is a route - the screen reports the tap and holds no document', () => {
    const opened: number[] = [];
    const tree = render(<About store={canonicalStore()} onOpenLicences={() => opened.push(1)} />);
    byTestId(tree, 's5-licences').props.onPress();
    expect(opened).toHaveLength(1);
  });
});

describe('S5 mutates the store and nothing moves, because it displays no figure', () => {
  it('a day that changes under the screen changes none of its text', () => {
    /*
     * The figure-wiring bar, met the only honest way an About screen can meet
     * it: there is no figure, and the absence is asserted rather than asserted
     * away. A day total creeping onto this screen breaks this case.
     */
    const store = canonicalStore();
    const before = text(render(<About store={store} version={A_VERSION} />));

    store.append(cashSale('s5-wired-1', 150000));

    expect(text(render(<About store={store} version={A_VERSION} />))).toBe(before);
  });

  it('rendering writes nothing to the store', () => {
    const store = canonicalStore();
    const revision = store.revision;
    render(<About store={store} version={A_VERSION} />);
    expect(store.revision).toBe(revision);
  });

  it('no rupee figure, and no money-shaped testID', () => {
    const tree = render(<About store={adversarialStore()} version={A_VERSION} />);
    expect(text(tree)).not.toContain('₹');
    expect(testIDs(tree).filter((id) => /amount|money|figure|total/.test(id))).toEqual([]);
  });
});

describe('S5 in every language, including the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': title, licences row and the L-15 sentence are in that language', () => {
      const tree = render(
        <About store={canonicalStore()} language={language} version={A_VERSION} />,
      );
      expect(text(byTestId(tree, 's5-title'))).toBe(phrase('s5.title', language));
      expect(text(byTestId(tree, 's5-licences'))).toContain(phrase('s5.licences', language));
      expect(text(byTestId(tree, 's5-not-tax'))).toBe(phrase('s5.notTax', language));
    });
  }

  it('the adversarial shop renders - it holds no figure, so the copy is the whole risk', () => {
    const tree = render(
      <About store={adversarialStore()} language="or" display="focus" version={A_VERSION} />,
    );
    expect(byTestId(tree, 's5-app-group')).toBeTruthy();
    expect(byTestId(tree, 's5-legal-group')).toBeTruthy();
  });

  it('longest string mode at the largest type still shows the licences row and L-15', () => {
    const tree = render(
      <About store={adversarialStore()} language="longest" display="focus" version={A_VERSION} />,
    );
    expect(byTestId(tree, 's5-licences')).toBeTruthy();
    expect(byTestId(tree, 's5-not-tax')).toBeTruthy();
  });

  it('chrome is capped, including the sentence a statute requires', () => {
    const tree = render(<About store={canonicalStore()} version={A_VERSION} />);
    expect(byTestId(tree, 's5-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 's5-not-tax').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });
});

describe('S5 accessibility, and it is not an entry screen', () => {
  const TREES = () => [
    render(<About store={canonicalStore()} version={A_VERSION} onBack={() => {}} />),
    render(<About store={canonicalStore()} onBack={() => {}} />),
    render(
      <About
        store={adversarialStore()}
        language="or"
        display="focus"
        version={A_VERSION}
        onBack={() => {}}
      />,
    ),
    render(<About store={canonicalStore()} status="error" />),
    render(
      <About
        store={adversarialStore()}
        language="longest"
        display="focus"
        version={A_VERSION}
        onBack={() => {}}
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
    const ids = testIDs(render(<About store={canonicalStore()} version={A_VERSION} />));
    expect(ids.filter((id) => /^keypad/.test(id))).toEqual([]);
    expect(ids.filter((id) => /nav|tabbar|bottom-bar/i.test(id))).toEqual([]);
  });

  it('it is reached from S1, so it reports a way back when it is given one', () => {
    const back: number[] = [];
    const tree = render(<About store={canonicalStore()} onBack={() => back.push(1)} />);
    byTestId(tree, 's5-back').props.onPress();
    expect(back).toHaveLength(1);
  });
});
