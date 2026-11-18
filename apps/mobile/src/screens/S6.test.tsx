/**
 * S6 HELP AND CONTACT - the §B.6 bar, and the one assertion that is legal
 * rather than visual.
 *
 * THE DEFECT THIS FILE EXISTS TO PREVENT RENDERS BEAUTIFULLY. A placeholder
 * name beside a sample address passes every other instrument in this build: it
 * is the right size, the right colour, it fits in Odia, and it is a fabricated
 * statutory contact. A Data Principal writes to it and nobody answers - which
 * is the exact failure the DPDP grievance requirement exists to prevent.
 *
 * So the central case renders the screen in its real state - no officer
 * published yet - and requires that NO EMAIL-SHAPED STRING exists anywhere in
 * it. It fails the moment somebody fills in the gap to make the panel look
 * finished, and the gap is closed by a human action in
 * `docs/handover/HUMAN-ACTIONS.md`, never from here.
 */
import { describe, it, expect } from 'vitest';
import { Help } from './S6.tsx';
import { canonicalStore, adversarialStore } from './registry.tsx';
import { render, all, byTestId, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import { CANONICAL_DATE } from '@swafto/fixtures';
import type { Entry } from '@swafto/formula-engine';

/**
 * A TEST FIXTURE, AND IT IS WRITTEN SO IT CANNOT BE MISTAKEN FOR A CONTACT.
 *
 * The officer-present branch has to be rendered by something, and anything
 * plausible here is a line somebody could later copy into the screen or a
 * contact-sheet panel. `.invalid` is reserved by RFC 2606 precisely so that it
 * never resolves, and the name says what it is. The real officer is
 * human-blocked and is not this build's to supply.
 */
const FIXTURE_OFFICER = {
  name: 'NOT A REAL OFFICER - test fixture',
  email: 'nobody@example.invalid',
} as const;

/**
 * An address, in the shape any of them takes: something, an at-sign, a dotted
 * host. Deliberately loose - this is asked to FIND a contact, not to validate
 * one, and a tight pattern would miss the plausible-looking placeholder.
 */
const EMAIL_SHAPED = /[^\s@]+@[^\s@]+\.[^\s@]+/;

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

/**
 * Every string the screen carries, not only the text it draws.
 *
 * An address put in an `accessibilityLabel` or a hint is still a published
 * contact - it is read aloud, and on the web build it sits in the DOM.
 * Checking the visible text alone would let the fabrication move one prop
 * sideways and survive.
 */
const everyString = (tree: ReturnType<typeof render>): string[] =>
  all(tree).flatMap((n) =>
    Object.values(n.props ?? {}).filter((v): v is string => typeof v === 'string'),
  );

describe('S6 renders all four states', () => {
  it('loading', () => {
    const tree = render(<Help store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 's6-loading')).toBeTruthy();
  });

  it('error offers a way back', () => {
    const tree = render(<Help store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 's6-error')).toBeTruthy();
    expect(byTestId(tree, 's6-retry')).toBeTruthy();
  });

  it('loaded: the grievance block, headed by what it is', () => {
    const tree = render(<Help store={canonicalStore()} />);
    expect(byTestId(tree, 's6-grievance-group')).toBeTruthy();
    expect(text(byTestId(tree, 's6-grievance-group-title'))).toBe(phrase('s6.grievance', 'en'));
  });

  it('there is no empty state - "not published" is a statement, not an absence', () => {
    /*
     * The frame's empty copy would tell a shopkeeper his own book had nothing in
     * it, which is not what is missing here. What is missing is ours.
     */
    const tree = render(<Help store={canonicalStore()} />);
    expect(testIDs(tree)).not.toContain('s6-empty');
    expect(byTestId(tree, 's6-pending')).toBeTruthy();
  });
});

describe('S6 publishes no contact it was not given', () => {
  it('with grievanceOfficer null, no email-shaped string appears anywhere', () => {
    /*
     * THE ASSERTION THIS SCREEN EXISTS FOR. Not "the pending copy is shown" -
     * that would still pass with a placeholder address sitting beside it.
     */
    const tree = render(<Help store={canonicalStore()} grievanceOfficer={null} />);
    expect(text(tree)).not.toMatch(EMAIL_SHAPED);
    for (const value of everyString(tree)) expect(value).not.toMatch(EMAIL_SHAPED);
    expect(text(byTestId(tree, 's6-pending'))).toBe(phrase('s6.pending', 'en'));
  });

  it('the default is null, so a caller that forgets the prop publishes nothing', () => {
    // A fallback that looked like a contact would ship a fiction on the first omission.
    const tree = render(<Help store={canonicalStore()} />);
    expect(text(tree)).not.toMatch(EMAIL_SHAPED);
    expect(testIDs(tree)).not.toContain('s6-officer');
  });

  it('no mailto: anywhere, in any state - the address is text, not a link', () => {
    for (const tree of [
      render(<Help store={canonicalStore()} />),
      render(<Help store={canonicalStore()} grievanceOfficer={FIXTURE_OFFICER} />),
    ]) {
      for (const value of everyString(tree)) expect(value).not.toContain('mailto:');
    }
  });

  it('given an officer it shows the name and the address, both selectable and unaltered', () => {
    const tree = render(<Help store={canonicalStore()} grievanceOfficer={FIXTURE_OFFICER} />);
    expect(text(byTestId(tree, 's6-officer-name'))).toBe(FIXTURE_OFFICER.name);
    expect(text(byTestId(tree, 's6-officer-email'))).toBe(FIXTURE_OFFICER.email);
    expect(byTestId(tree, 's6-officer-name').props?.selectable).toBe(true);
    expect(byTestId(tree, 's6-officer-email').props?.selectable).toBe(true);
    expect(testIDs(tree)).not.toContain('s6-pending');
  });
});

describe('S6 mutates the store and nothing moves, because it displays no figure', () => {
  it('a day that changes under the screen changes none of its text', () => {
    /*
     * The figure-wiring bar, met the only honest way a contact screen can meet
     * it: there is no figure here, and that is asserted rather than assumed.
     */
    const store = canonicalStore();
    const before = text(render(<Help store={store} />));

    store.append(cashSale('s6-wired-1', 150000));

    expect(text(render(<Help store={store} />))).toBe(before);
  });

  it('rendering writes nothing to the store', () => {
    const store = canonicalStore();
    const revision = store.revision;
    render(<Help store={store} />);
    expect(store.revision).toBe(revision);
  });

  it('no rupee figure, and no money-shaped testID', () => {
    const tree = render(<Help store={adversarialStore()} />);
    expect(text(tree)).not.toContain('₹');
    expect(testIDs(tree).filter((id) => /amount|money|figure|total/.test(id))).toEqual([]);
  });
});

describe('S6 in every language, including the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title, the heading and the pending sentence are in that language', () => {
      const tree = render(<Help store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 's6-title'))).toBe(phrase('s6.title', language));
      expect(text(byTestId(tree, 's6-grievance-group-title'))).toBe(
        phrase('s6.grievance', language),
      );
      expect(text(byTestId(tree, 's6-pending'))).toBe(phrase('s6.pending', language));
    });
  }

  it('the adversarial shop renders - it holds no figure, so the copy is the whole risk', () => {
    const tree = render(<Help store={adversarialStore()} language="or" display="focus" />);
    expect(byTestId(tree, 's6-grievance-group')).toBeTruthy();
    expect(byTestId(tree, 's6-pending')).toBeTruthy();
  });

  it('longest string mode at the largest type still shows the grievance block', () => {
    const tree = render(<Help store={adversarialStore()} language="longest" display="focus" />);
    expect(byTestId(tree, 's6-grievance-group')).toBeTruthy();
    expect(byTestId(tree, 's6-pending')).toBeTruthy();
  });

  it('chrome is capped on every line this screen draws', () => {
    const tree = render(<Help store={canonicalStore()} grievanceOfficer={FIXTURE_OFFICER} />);
    expect(byTestId(tree, 's6-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 's6-officer-email').props?.maxFontSizeMultiplier).toBe(
      CHROME_FONT_SCALE_CAP,
    );
  });
});

describe('S6 accessibility, and it is not an entry screen', () => {
  const TREES = () => [
    render(<Help store={canonicalStore()} onBack={() => {}} />),
    render(<Help store={canonicalStore()} grievanceOfficer={FIXTURE_OFFICER} onBack={() => {}} />),
    render(<Help store={adversarialStore()} language="or" display="focus" onBack={() => {}} />),
    render(<Help store={canonicalStore()} status="error" />),
    render(
      <Help
        store={adversarialStore()}
        language="longest"
        display="focus"
        grievanceOfficer={FIXTURE_OFFICER}
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
    const ids = testIDs(render(<Help store={canonicalStore()} />));
    expect(ids.filter((id) => /^keypad/.test(id))).toEqual([]);
    expect(ids.filter((id) => /nav|tabbar|bottom-bar/i.test(id))).toEqual([]);
  });

  it('it is reached from S1, so it reports a way back when it is given one', () => {
    const back: number[] = [];
    const tree = render(<Help store={canonicalStore()} onBack={() => back.push(1)} />);
    byTestId(tree, 's6-back').props.onPress();
    expect(back).toHaveLength(1);
  });
});
