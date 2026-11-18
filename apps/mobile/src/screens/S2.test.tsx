/**
 * S2 YOUR SHOP - the §B.6 bar.
 *
 * THE ONLY CLAIM THIS SCREEN MAKES IS THAT IT DID NOT TOUCH HIS WORDS, so that
 * is what is tested hardest. The failure here is not a wrong figure - there are
 * no figures - it is a shop name the app improved: capitalised, trimmed,
 * title-cased, stripped of a double space, or cut off at the width of the card.
 * Every one of those is plausible, invisible in English without the original
 * beside it, and ends up printed on an export he hands to a lender.
 *
 * So the verbatim assertions use strings chosen to break each temptation in
 * turn, and they compare for EQUALITY rather than containment - a `toContain`
 * check passes against a name the screen has decorated.
 */
import { describe, it, expect } from 'vitest';
import { ShopProfile } from './S2.tsx';
import { DAY_START_CHOICES } from '../store/index.ts';
import { canonicalStore, adversarialStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import { ADVERSARIAL_SHOP } from '@swafto/fixtures';
import type { Entry } from '@swafto/formula-engine';

/**
 * Names the app must not improve, and what each one guards.
 *
 * None of these is hypothetical. They are the four things a display layer does
 * to user text when nobody has forbidden it, and the first three are invisible
 * to anyone reading the screen in English.
 */
const UNTOUCHED = [
  { why: 'lower case stays lower', name: 'm/s r k stores' },
  { why: 'a double space is his spacing', name: 'gupta  kirana' },
  { why: 'a trailing space is not trimmed for display', name: 'gupta kirana ' },
  { why: 'a long Odia name keeps its tail', name: ADVERSARIAL_SHOP.name },
] as const;

const SHOP = 'Sharma Kirana Store';

const sale = (id: string, amount: number, dayId: string): Entry =>
  ({
    id,
    dayId,
    section: 'cash_sales',
    amount,
    mode: 'cash',
    source: 'manual',
    createdAt: `${dayId}T19:30:00.000Z`,
  }) as Entry;

describe('S2 renders all four states', () => {
  it('loading', () => {
    const tree = render(<ShopProfile store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 's2-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error offers a way back', () => {
    const tree = render(<ShopProfile store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 's2-error')).toBeTruthy();
    expect(byTestId(tree, 's2-retry')).toBeTruthy();
  });

  it('empty: there is no such state, and the screen does not fake one', () => {
    /*
     * S2 IS NEVER GENUINELY EMPTY, and this says so honestly rather than
     * manufacturing a panel to fill a checkbox. A shop with no name recorded
     * still has content: the words for "not set", and the note about exports,
     * which is structural rather than data. So `empty={false}` is the truth,
     * and the test's job is to prove the screen does not reach for the empty
     * panel in the one case that most looks like it should - no name at all.
     */
    const tree = render(<ShopProfile store={canonicalStore()} shopName={null} />);
    expect(all(tree).filter((n) => String(n.props?.testID ?? '') === 's2-empty')).toEqual([]);
    expect(text(byTestId(tree, 's2-name'))).toBe(phrase('s2.unnamed', 'en'));
    expect(text(byTestId(tree, 's2-note'))).toBe(phrase('s2.note', 'en'));
  });

  it('loaded: the label, the name and the export note are all present', () => {
    const tree = render(<ShopProfile store={canonicalStore()} shopName={SHOP} />);
    expect(text(byTestId(tree, 's2-name-label'))).toBe(phrase('s2.name', 'en'));
    expect(text(byTestId(tree, 's2-name'))).toBe(SHOP);
    expect(text(byTestId(tree, 's2-note'))).toBe(phrase('s2.note', 'en'));
  });
});

describe('S2 mutates the store, and the name is still his own', () => {
  it('mutates the store: the day moves and this screen does not', () => {
    /*
     * THE HONEST FORM OF THIS PREDICATE FOR A SCREEN WITH NO FIGURE ON IT.
     *
     * The child this phrase gates asks that every displayed figure be traced to
     * the engine through the real store. S2 displays no figure, and the
     * corresponding property - the one that can actually be broken later - is
     * that it displays NONE: the name comes from the session, the store holds a
     * `shopId` and no name, and nothing here may move when the day does.
     *
     * This fails the moment somebody drops a day total, an entry count or an
     * expected-cash line onto this screen, which is precisely the change worth
     * catching. A figure rendered here would also be a second place a total
     * lives, which the no-stored-totals rule exists to prevent.
     */
    const store = canonicalStore();
    const before = text(render(<ShopProfile store={store} shopName={SHOP} />));

    store.append(sale('s2-t1', 456700, store.state.day.date));
    expect(store.state.entries.some((e) => e.id === 's2-t1')).toBe(true);

    const after = text(render(<ShopProfile store={store} shopName={SHOP} />));
    expect(after).toBe(before);
  });

  it('rendering writes nothing - there is no revision to bump', () => {
    const store = canonicalStore();
    const revision = store.revision;
    const entries = store.state.entries.length;
    render(<ShopProfile store={store} shopName={SHOP} onBack={() => {}} />);
    expect(store.revision).toBe(revision);
    expect(store.state.entries.length).toBe(entries);
  });

  for (const { why, name } of UNTOUCHED) {
    it('verbatim - ' + why, () => {
      const tree = render(<ShopProfile store={canonicalStore()} shopName={name} />);
      expect(text(byTestId(tree, 's2-name'))).toBe(name);
    });
  }

  it('nothing truncates the name: no numberOfLines, no ellipsis', () => {
    /*
     * The two props that would silently cut a long name off. Asserting their
     * ABSENCE is the only way to catch it, because a truncated name still
     * renders and still looks like a name.
     */
    const tree = render(<ShopProfile store={canonicalStore()} shopName={ADVERSARIAL_SHOP.name} />);
    const node = byTestId(tree, 's2-name');
    expect(node.props?.numberOfLines).toBeUndefined();
    expect(node.props?.ellipsizeMode).toBeUndefined();
  });

  it('an unnamed shop says so, in its own language, and never guesses', () => {
    for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
      for (const absent of [null, '']) {
        const tree = render(
          <ShopProfile store={canonicalStore()} language={language} shopName={absent} />,
        );
        expect(text(byTestId(tree, 's2-name'))).toBe(phrase('s2.unnamed', language));
      }
    }
  });

  it('a name of one space is a name, not an absence', () => {
    // The boundary an implementation gets wrong by trimming before testing for
    // empty: a space is not what he meant, but it IS what he typed.
    const tree = render(<ShopProfile store={canonicalStore()} shopName=" " />);
    expect(text(byTestId(tree, 's2-name'))).toBe(' ');
  });

  it('nothing on this screen is pressable, because nothing here does anything yet', () => {
    /*
     * Back is the only control and it belongs to the frame, so with no `onBack`
     * there is no Pressable at all. A row that looked tappable and did nothing
     * would teach him the app is broken; when renaming exists this assertion
     * changes with the feature, which is the point of making it.
     */
    const tree = render(<ShopProfile store={canonicalStore()} shopName={SHOP} />);
    expect(byType(tree, 'Pressable')).toEqual([]);
  });

  it('decision 1: the day start is the only choice, and every segment of it does something', () => {
    const picked: string[] = [];
    const store = canonicalStore();
    const draw = () =>
      render(<ShopProfile store={store} shopName={SHOP} onSelectDayStart={(h) => picked.push(h)} />);

    const segments = byType(draw(), 'Pressable');
    expect(segments.map((p) => String(p.props?.testID))).toEqual(
      DAY_START_CHOICES.map((h) => 's2-day-start-' + h),
    );
    for (const p of segments) (p.props?.onPress as () => void)();
    expect(picked).toEqual([...DAY_START_CHOICES]);

    // Never set means midnight, the calendar day he has always had.
    const chosen = (tree: ReturnType<typeof draw>) =>
      byType(tree, 'Pressable')
        .filter((p) => (p.props?.accessibilityState as { selected?: boolean })?.selected)
        .map((p) => String(p.props?.testID));
    expect(chosen(draw())).toEqual(['s2-day-start-00:00']);
    store.setDayStart('05:00');
    expect(chosen(draw())).toEqual(['s2-day-start-05:00']);
    // The open day keeps the start it was made under; the setting is for the next.
    expect(store.state.day.startsAt).toBeUndefined();
    expect(text(byTestId(draw(), 's2-day-start-note'))).toBe(phrase('s2.dayStartNote', 'en'));
  });
});

describe('S2 in every language, including the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title, the field label and the note are in that language', () => {
      const tree = render(<ShopProfile store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 's2-title'))).toBe(phrase('s2.title', language));
      expect(text(byTestId(tree, 's2-name-label'))).toBe(phrase('s2.name', language));
      expect(text(byTestId(tree, 's2-note'))).toBe(phrase('s2.note', language));
    });
  }

  it('the adversarial shop renders, with the longest Odia name in the corpus', () => {
    const tree = render(
      <ShopProfile store={adversarialStore()} language="or" shopName={ADVERSARIAL_SHOP.name} />,
    );
    expect(text(byTestId(tree, 's2-name'))).toBe(ADVERSARIAL_SHOP.name);
    expect(byTestId(tree, 's2-note')).toBeTruthy();
  });

  it('longest string mode at the largest type keeps the name and the note', () => {
    const tree = render(
      <ShopProfile
        store={adversarialStore()}
        language="longest"
        display="focus"
        shopName={ADVERSARIAL_SHOP.name}
      />,
    );
    expect(text(byTestId(tree, 's2-name'))).toBe(ADVERSARIAL_SHOP.name);
    expect(text(byTestId(tree, 's2-note'))).toBe(phrase('s2.note', 'longest'));
  });

  it('chrome is capped, and the name is chrome rather than money', () => {
    /*
     * A shop name is not a figure. ADR-018 leaves money uncapped because a lakh
     * figure must never be shrunk to fit; a name stops growing with everything
     * else, or it eats the screen at the largest system scale.
     */
    const tree = render(<ShopProfile store={canonicalStore()} shopName={SHOP} />);
    expect(byTestId(tree, 's2-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 's2-name').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 's2-note').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });
});

describe('S2 accessibility, and it is not an entry screen', () => {
  const TREES = () => [
    render(<ShopProfile store={canonicalStore()} shopName={SHOP} />),
    render(<ShopProfile store={canonicalStore()} shopName={null} onBack={() => {}} />),
    render(
      <ShopProfile
        store={adversarialStore()}
        language="or"
        display="focus"
        shopName={ADVERSARIAL_SHOP.name}
        onBack={() => {}}
      />,
    ),
    render(<ShopProfile store={canonicalStore()} status="error" />),
    render(
      <ShopProfile
        store={adversarialStore()}
        language="longest"
        display="focus"
        shopName={ADVERSARIAL_SHOP.name}
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

  it('nothing is typed here, so no keypad - and no bottom nav either', () => {
    /*
     * S2 is not one of C-5's three tabs. It is reached from S1 and returns
     * there, so it carries a back affordance instead - and §B.6's forbidden
     * pair cannot arise, because neither half of it is present.
     */
    const tree = render(
      <ShopProfile store={canonicalStore()} shopName={SHOP} onBack={() => {}} />,
    );
    const ids = all(tree).map((n) => String(n.props?.testID ?? ''));
    expect(ids.filter((id) => /^keypad/.test(id))).toEqual([]);
    expect(ids.filter((id) => /nav|tabbar|bottom-bar/i.test(id))).toEqual([]);
    expect(byTestId(tree, 's2-back')).toBeTruthy();
  });
});
