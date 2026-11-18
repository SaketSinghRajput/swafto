/**
 * S1 SETTINGS - the §B.6 bar.
 *
 * WHAT IS ACTUALLY WORTH TESTING ON A HUB IS THAT THE ROWS ARE STILL THERE.
 *
 * Three of the six rows exist because Google Play, Apple and the DPDP Act
 * require them - the in-app deletion path, the reachable privacy notice, and
 * the named grievance officer. A hub is the easiest screen in any codebase to
 * quietly drop a row from during a redesign, and the cost of dropping one of
 * those three is not a worse screen, it is an app that cannot be published.
 *
 * So the strongest assertion here is an EXACT list, in order. A "contains"
 * check would keep passing with a required row deleted.
 */
import { describe, it, expect } from 'vitest';
import { Settings } from './S1.tsx';
import { canonicalStore, adversarialStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';

/** Every row the hub offers, in the order it offers them. */
const ROW_IDS = [
  's1-shop',
  's1-language',
  's1-plan',
  's1-privacy',
  's1-about',
  's1-help',
  's1-delete-account',
] as const;

const rowIds = (tree: ReturnType<typeof render>): string[] =>
  all(tree)
    .map((n) => String(n.props?.testID ?? ''))
    .filter((id) => (ROW_IDS as readonly string[]).includes(id));

/** The app passes a plan handler whenever the plan screen exists (after beta). */
const openPlan = (): void => {};

describe('S1 in the all-free beta', () => {
  it('with no plan screen to open, there is no plan row, and every other row stays', () => {
    const tree = render(<Settings store={canonicalStore()} />);
    expect(all(tree).filter((n) => String(n.props?.testID ?? '') === 's1-plan')).toEqual([]);
    expect(rowIds(tree)).toEqual(ROW_IDS.filter((id) => id !== 's1-plan'));
  });
});

describe('S1 renders all four states', () => {
  it('loading', () => {
    const tree = render(<Settings onOpenPlan={openPlan} store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 's1-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error offers a way back', () => {
    const tree = render(<Settings onOpenPlan={openPlan} store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 's1-error')).toBeTruthy();
    expect(byTestId(tree, 's1-retry')).toBeTruthy();
  });

  it('empty: there is no such state, and the screen does not pretend there is', () => {
    /*
     * The six rows are STRUCTURAL, not data - they exist whether or not a shop
     * has entered anything, because two of them are the routes a store
     * reviewer and a Data Principal need. A hub that could render empty would
     * be a hub that could hide the deletion path.
     */
    const tree = render(<Settings onOpenPlan={openPlan} store={canonicalStore()} />);
    expect(all(tree).filter((n) => String(n.props?.testID ?? '') === 's1-empty')).toEqual([]);
    expect(rowIds(tree)).toEqual([...ROW_IDS]);
  });

  it('loaded: every row, in order, including the three the stores require', () => {
    const tree = render(<Settings onOpenPlan={openPlan} store={canonicalStore()} />);
    expect(rowIds(tree)).toEqual([...ROW_IDS]);
  });
});

describe('S1 mutates the store and stays correct', () => {
  it('the shop name is shown verbatim, and never corrected or completed', () => {
    /*
     * The one place this screen touches user-entered text. "No inference in
     * data entry" is absolute here: a name the app tidied is a name nobody
     * typed, and on an exported ledger it is the shop's identity.
     *
     * Lower case, double space, trailing space and all - none of it is fixed.
     */
    const messy = 'gupta  kirana ';
    const tree = render(<Settings onOpenPlan={openPlan} store={canonicalStore()} shopName={messy} />);
    expect(text(byTestId(tree, 's1-shop-detail'))).toBe(messy);
  });

  it('an unnamed shop says so rather than showing a blank or a guess', () => {
    for (const absent of [null, '']) {
      const tree = render(<Settings onOpenPlan={openPlan} store={canonicalStore()} shopName={absent} />);
      expect(text(byTestId(tree, 's1-shop-detail'))).toBe(phrase('s2.unnamed', 'en'));
    }
  });

  it('mutates the store: the hub shows no figure, and writes nothing itself', () => {
    /*
     * Nothing here should MOVE when the day does - the hub carries no figure -
     * and pressing every row must leave the ledger untouched. A settings screen
     * that wrote something would be a write with no entry behind it.
     */
    const store = canonicalStore();
    const before = store.state.entries.length;
    const revisionBefore = store.revision;

    const pressed: string[] = [];
    const tree = render(
      <Settings
        store={store}
        onOpenShop={() => pressed.push('shop')}
        onOpenLanguage={() => pressed.push('language')}
        onOpenPlan={() => pressed.push('plan')}
        onOpenPrivacy={() => pressed.push('privacy')}
        onOpenAbout={() => pressed.push('about')}
        onOpenHelp={() => pressed.push('help')}
        onDeleteAccount={() => pressed.push('delete')}
      />,
    );
    for (const id of ROW_IDS) byTestId(tree, id).props.onPress();

    expect(pressed).toEqual(['shop', 'language', 'plan', 'privacy', 'about', 'help', 'delete']);
    expect(store.state.entries.length).toBe(before);
    expect(store.revision).toBe(revisionBefore);
  });
});

describe('S1 carries the rows the app stores and the DPDP Act require', () => {
  it('the in-app deletion path exists and is reachable from the hub', () => {
    /*
     * Google Play's User Data policy: an app that lets a user create an account
     * must offer an IN-APP path to delete the account and its data, plus a web
     * link. Apple 5.1.1(v) says the same. This row is that path's front door,
     * and it is the row most likely to be lost in a redesign because it is the
     * one nobody uses.
     */
    const tree = render(<Settings onOpenPlan={openPlan} store={canonicalStore()} />);
    const row = byTestId(tree, 's1-delete-account');
    expect(row.props?.accessibilityRole).toBe('button');
    expect(text(row)).toBe(phrase('s1.deleteAccount', 'en'));
  });

  it('privacy and the grievance route are both one tap from here', () => {
    // Apple 5.1.1(i): the privacy policy must be reachable INSIDE the app.
    // DPDP: a named grievance officer, and withdrawal as easy as giving.
    const tree = render(<Settings onOpenPlan={openPlan} store={canonicalStore()} />);
    expect(text(byTestId(tree, 's1-privacy'))).toBe(phrase('s1.privacy', 'en'));
    expect(text(byTestId(tree, 's1-help'))).toBe(phrase('s1.help', 'en'));
  });
});

describe('S1 in every language, including the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title and the deletion row are in that language', () => {
      const tree = render(<Settings onOpenPlan={openPlan} store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 's1-title'))).toBe(phrase('s1.title', language));
      expect(text(byTestId(tree, 's1-delete-account'))).toBe(phrase('s1.deleteAccount', language));
    });
  }

  it('the adversarial shop renders every row', () => {
    const tree = render(<Settings onOpenPlan={openPlan} store={adversarialStore()} language="or" />);
    expect(rowIds(tree)).toEqual([...ROW_IDS]);
  });

  it('longest string mode at the largest type keeps every row reachable', () => {
    const tree = render(
      <Settings onOpenPlan={openPlan} store={adversarialStore()} language="longest" display="focus" shopName="ଗୁପ୍ତା" />,
    );
    expect(rowIds(tree)).toEqual([...ROW_IDS]);
  });

  it('chrome is capped', () => {
    const tree = render(<Settings onOpenPlan={openPlan} store={canonicalStore()} />);
    expect(byTestId(tree, 's1-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });
});

describe('S1 accessibility, and it is not an entry screen', () => {
  const TREES = () => [
    render(<Settings onOpenPlan={openPlan} store={canonicalStore()} />),
    render(<Settings onOpenPlan={openPlan} store={canonicalStore()} display="focus" language="or" />),
    render(<Settings onOpenPlan={openPlan} store={canonicalStore()} status="error" />),
    render(<Settings onOpenPlan={openPlan} store={adversarialStore()} language="longest" display="focus" />),
    render(<Settings onOpenPlan={openPlan} store={canonicalStore()} shopName="gupta kirana" />),
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

  it('nothing is typed here, so no keypad - and no bottom nav either', () => {
    /*
     * S1 is NOT one of C-5's three tabs. It is a place reached from Today and
     * returned from, so it carries a back affordance instead - and §B.6's
     * forbidden pair cannot arise here because neither half is present.
     */
    const tree = render(<Settings onOpenPlan={openPlan} store={canonicalStore()} onBack={() => {}} />);
    const ids = all(tree).map((n) => String(n.props?.testID ?? ''));
    expect(ids.filter((id) => /^keypad/.test(id))).toEqual([]);
    expect(ids.filter((id) => /nav|tabbar|bottom-bar/i.test(id))).toEqual([]);
    expect(byTestId(tree, 's1-back')).toBeTruthy();
  });

  it('every row announces the words on its face', () => {
    const tree = render(<Settings onOpenPlan={openPlan} store={canonicalStore()} />);
    for (const id of ROW_IDS) {
      const row = byTestId(tree, id);
      expect(row.props?.accessibilityRole).toBe('button');
      expect(row.props?.accessibilityLabel).toBeTruthy();
    }
  });
});
