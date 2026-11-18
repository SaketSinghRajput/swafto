/**
 * S8 ARE YOU SURE? - the §B.6 bar.
 *
 * THE ASSERTION THIS FILE EXISTS FOR IS THE ONE ABOUT A SENTENCE NOT BEING
 * THERE. `s8.owed` tells a shopkeeper he is still owed money this book is the
 * only record of. Shown to a shop that is owed nothing it is simply false, and a
 * warning that was false once is a warning nobody reads the second time - which
 * is a real cost on the one screen in this product that cannot be undone. So the
 * ABSENCE is tested as hard as the presence, against a store with no outstanding
 * credit, and the figure beside it is tested against the engine rather than
 * against a number written here.
 *
 * AND THE OTHER ONE: THIS SCREEN DELETES NOTHING. Both buttons are pressed and
 * the ledger is required to be untouched afterwards. A confirm screen that also
 * performed the deletion is the version of this flow in which there is no
 * confirmation at all, only a button with a longer label.
 */
import { describe, it, expect } from 'vitest';
import { ConfirmDelete } from './S8.tsx';
import { canonicalStore, adversarialStore } from './registry.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { tokens } from '../theme/tokens.ts';
import { Store, memoryPort } from '../store/index.ts';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';
import { formatPaise, type Entry } from '@swafto/formula-engine';

/**
 * A SHOP THAT IS OWED NOTHING - the state the warning must stay silent in.
 *
 * Nothing entered and nothing carried. The canonical shop carries udhar from
 * yesterday and sells more of it today, so it can never be this case; building
 * it from the fixture rather than hand-rolling a day keeps the rest of the shop
 * real while the one figure under test is genuinely zero.
 */
const owedNothing = (): Store => {
  const base = canonicalInput();
  return new Store(
    memoryPort({
      shopId: 'shop-canonical',
      day: base.day,
      entries: [],
      parties: CANONICAL_PARTIES,
      priorCreditOutstanding: 0,
      priorSupplierOutstanding: base.priorSupplierOutstanding,
      skippedSections: [],
    }),
  );
};

const firstCustomer = CANONICAL_PARTIES.find((p) => p.kind === 'customer')?.id ?? '';

/** A real credit sale, which is what makes P7 move. */
const udharSale = (id: string): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section: 'udhar_sales',
    amount: 90000,
    mode: 'udhar',
    partyId: firstCustomer,
    source: 'manual',
    createdAt: `${CANONICAL_DATE}T19:00:00.000Z`,
  }) as Entry;

const ids = (tree: ReturnType<typeof render>): string[] =>
  all(tree).map((n) => String(n.props?.testID ?? ''));

describe('S8 renders all four states', () => {
  it('loading', () => {
    const tree = render(<ConfirmDelete store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 's8-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error offers a way back', () => {
    const tree = render(<ConfirmDelete store={canonicalStore()} status="error" />);
    expect(byTestId(tree, 's8-error')).toBeTruthy();
    expect(byTestId(tree, 's8-retry')).toBeTruthy();
  });

  it('empty: a shop with nothing in its book still gets the question', () => {
    /*
     * There is no empty state here and there must not be one. The question and
     * its two answers are structural - a shop that has entered nothing can
     * still be mid-deletion, and replacing the question with "nothing yet"
     * would strand it with a back button as the only way out.
     */
    const tree = render(<ConfirmDelete store={owedNothing()} />);
    expect(all(tree).filter((n) => String(n.props?.testID ?? '') === 's8-empty')).toEqual([]);
    expect(byTestId(tree, 's8-what')).toBeTruthy();
    expect(byTestId(tree, 's8-cancel')).toBeTruthy();
    expect(byTestId(tree, 's8-confirm')).toBeTruthy();
  });

  it('loaded: what is lost, and both answers', () => {
    const tree = render(<ConfirmDelete store={canonicalStore()} />);
    expect(text(byTestId(tree, 's8-title'))).toBe(phrase('s8.title', 'en'));
    expect(text(byTestId(tree, 's8-what'))).toBe(phrase('s7.what', 'en'));
    expect(text(byTestId(tree, 's8-cancel'))).toBe(phrase('s8.cancel', 'en'));
    expect(text(byTestId(tree, 's8-confirm'))).toBe(phrase('s8.confirm', 'en'));
  });
});

describe('S8 shows the udhar warning only when it is true', () => {
  it('a shop owed nothing sees no warning and no figure', () => {
    const store = owedNothing();
    expect(store.primary().p7CreditOutstanding.value).toBe(0);

    const tree = render(<ConfirmDelete store={store} />);
    expect(ids(tree).filter((id) => /^s8-owed/.test(id))).toEqual([]);
    expect(text(tree)).not.toContain(phrase('s8.owed', 'en'));
  });

  it('a shop that is owed money sees the warning and the amount', () => {
    const store = canonicalStore();
    const owed = store.primary().p7CreditOutstanding.value;
    expect(owed).toBeGreaterThan(0);

    const tree = render(<ConfirmDelete store={store} />);
    expect(text(byTestId(tree, 's8-owed'))).toBe(phrase('s8.owed', 'en'));
    expect(text(byTestId(tree, 's8-owed-amount'))).toContain(formatPaise(owed, { withSign: false }));
  });

  it('mutates the store: one credit sale makes the warning appear, with that figure', () => {
    /*
     * The wiring assertion, driven through the real Store rather than a prop: the
     * screen reads P7 from the engine on every render, so a day that gains udhar
     * must gain the warning. A screen holding a cached total would still show a
     * shop owed nothing here, on the one screen where that error is permanent.
     */
    const store = owedNothing();
    expect(ids(render(<ConfirmDelete store={store} />)).filter((id) => id === 's8-owed')).toEqual(
      [],
    );

    store.append(udharSale('s8-m1'));

    const after = render(<ConfirmDelete store={store} />);
    const owed = store.primary().p7CreditOutstanding.value;
    expect(owed).toBeGreaterThan(0);
    expect(text(byTestId(after, 's8-owed'))).toBe(phrase('s8.owed', 'en'));
    expect(text(byTestId(after, 's8-owed-amount'))).toContain(formatPaise(owed, { withSign: false }));
  });

  it('the figure goes through Money, never a bare Text (ADR-018)', () => {
    /*
     * Latin numerals in every language and tabular digits are properties of
     * every rupee figure in this product, including one inside a warning. The
     * B32 sweep in screens.spec covers the registry cases; this names the node.
     */
    const node = byTestId(render(<ConfirmDelete store={canonicalStore()} />), 's8-owed-amount');
    expect(node.props?.allowFontScaling).toBe(true);
    expect(/[0-9]/.test(text(node))).toBe(true);
    expect([...text(node)].filter((ch) => /\p{Nd}/u.test(ch) && !/[0-9]/.test(ch))).toEqual([]);
  });
});

describe('S8 reports intent and deletes nothing itself', () => {
  it('pressing every button writes NOTHING to the store', () => {
    const store = canonicalStore();
    const entriesBefore = store.state.entries.length;
    const revisionBefore = store.revision;

    const pressed: string[] = [];
    const tree = render(
      <ConfirmDelete
        store={store}
        onConfirm={() => pressed.push('confirm')}
        onCancel={() => pressed.push('cancel')}
        onBack={() => pressed.push('back')}
      />,
    );
    for (const id of ['s8-cancel', 's8-confirm', 's8-back']) {
      byTestId(tree, id).props.onPress();
    }

    expect(pressed).toEqual(['cancel', 'confirm', 'back']);
    expect(store.state.entries.length).toBe(entriesBefore);
    expect(store.revision).toBe(revisionBefore);
  });

  it('confirming reports exactly once and does not also cancel', () => {
    const store = canonicalStore();
    let confirms = 0;
    let cancels = 0;
    const tree = render(
      <ConfirmDelete
        store={store}
        onConfirm={() => (confirms += 1)}
        onCancel={() => (cancels += 1)}
      />,
    );
    byTestId(tree, 's8-confirm').props.onPress();
    expect(confirms).toBe(1);
    expect(cancels).toBe(0);
    expect(store.revision).toBe(0);
  });
});

describe('S8 gives the emphasis to keeping the book', () => {
  // v2 "Mitra": the one primary fill is `brand`, not marigold (DESIGN-SYSTEM-V2 1.1).
  it('cancel wears the one primary fill; confirm is tonal and plainly not recommended', () => {
    /*
     * The inversion is the design. §9 allows at most one accent per screen, and
     * on a screen whose other option is irreversible the accent belongs to the
     * way out. If these two ever swap, the prettiest thing on the screen becomes
     * the thing that destroys a shop's only record of what it is owed.
     */
    for (const display of ['comfort', 'focus'] as const) {
      const t = tokens(display);
      const tree = render(<ConfirmDelete store={canonicalStore()} display={display} />);
      const cancel = byTestId(tree, 's8-cancel').props.style as Record<string, unknown>;
      const confirm = byTestId(tree, 's8-confirm').props.style as Record<string, unknown>;

      expect(cancel.backgroundColor).toBe(t.color.brand);
      expect(confirm.backgroundColor).toBe(t.color.surfaceRaised);
      expect(confirm.backgroundColor).not.toBe(t.color.brand);

      // And the safe choice is the bigger target, not merely the brighter one.
      expect(cancel.minHeight).toBe(t.control.xl);
      expect(confirm.minHeight).toBe(t.control.lg);

      // The tonal fill cannot carry its own boundary, so it has an edge that can:
      // v2's control rim `edge` (N1-N3, measured over 3:1 in tokens.spec), was `inkMuted`.
      expect(confirm.borderColor).toBe(t.color.edge);
    }
  });

  it('exactly one primary fill on the whole screen', () => {
    for (const display of ['comfort', 'focus'] as const) {
      const accent = tokens(display).color.brand;
      const tree = render(
        <ConfirmDelete store={adversarialStore()} display={display} onBack={() => {}} />,
      );
      /*
       * CONTROLS ONLY. In v2 the Comfort header bar is the same teal as the
       * primary fill (`header` = `brand`, DESIGN-SYSTEM-V2 1.1); it is chrome,
       * not a choice. Among the things a thumb can press there is still one.
       */
      const filled = all(tree).filter(
        (n) =>
          n.type === 'Pressable' &&
          (n.props?.style as Record<string, unknown> | undefined)?.backgroundColor === accent,
      );
      expect(filled.map((n) => String(n.props?.testID ?? n.type))).toEqual(['s8-cancel']);
    }
  });

  it('the safe answer comes first, under the thumb', () => {
    const order = ids(render(<ConfirmDelete store={canonicalStore()} />)).filter((id) =>
      ['s8-cancel', 's8-confirm'].includes(id),
    );
    expect(order).toEqual(['s8-cancel', 's8-confirm']);
  });
});

describe('S8 in every language, including the adversarial worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the question and both answers are in that language', () => {
      const tree = render(<ConfirmDelete store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 's8-title'))).toBe(phrase('s8.title', language));
      expect(text(byTestId(tree, 's8-cancel'))).toBe(phrase('s8.cancel', language));
      expect(text(byTestId(tree, 's8-confirm'))).toBe(phrase('s8.confirm', language));
      expect(text(byTestId(tree, 's8-owed'))).toBe(phrase('s8.owed', language));
    });
  }

  it('the adversarial shop renders the warning beside a lakh-scale figure', () => {
    const store = adversarialStore();
    const tree = render(<ConfirmDelete store={store} language="or" />);
    expect(text(byTestId(tree, 's8-owed-amount'))).toContain(
      formatPaise(store.primary().p7CreditOutstanding.value, { withSign: false }),
    );
  });

  it('longest string mode at the largest type keeps both answers reachable', () => {
    const tree = render(
      <ConfirmDelete store={adversarialStore()} language="longest" display="focus" />,
    );
    expect(byTestId(tree, 's8-cancel')).toBeTruthy();
    expect(byTestId(tree, 's8-confirm')).toBeTruthy();
  });

  it('chrome is capped; the money figure is not', () => {
    const tree = render(<ConfirmDelete store={canonicalStore()} />);
    expect(byTestId(tree, 's8-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 's8-owed').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
    expect(byTestId(tree, 's8-owed-amount').props?.allowFontScaling).toBe(true);
  });
});

describe('S8 accessibility, and it is not an entry screen', () => {
  const TREES = () => [
    render(<ConfirmDelete store={canonicalStore()} onBack={() => {}} />),
    render(<ConfirmDelete store={owedNothing()} />),
    render(<ConfirmDelete store={adversarialStore()} language="or" display="focus" />),
    render(<ConfirmDelete store={canonicalStore()} status="error" />),
    render(<ConfirmDelete store={canonicalStore()} status="loading" />),
    render(<ConfirmDelete store={adversarialStore()} language="longest" display="focus" />),
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
     * A keypad on a confirmation screen would mean something is being entered,
     * and nothing is: the shop name typed to confirm is a separate design
     * decision (LEGAL-AUDIT §1.6) which this screen does not implement. No nav
     * either - S8 is a place you reach from S7 and leave by answering.
     */
    const tree = render(<ConfirmDelete store={canonicalStore()} onBack={() => {}} />);
    const seen = ids(tree);
    expect(seen.filter((id) => /^keypad/.test(id))).toEqual([]);
    expect(seen.filter((id) => /nav|tabbar|bottom-bar/i.test(id))).toEqual([]);
    expect(byTestId(tree, 's8-back')).toBeTruthy();
  });

  it('both answers announce the words on their faces', () => {
    const tree = render(<ConfirmDelete store={canonicalStore()} />);
    for (const [id, key] of [
      ['s8-cancel', 's8.cancel'],
      ['s8-confirm', 's8.confirm'],
    ] as const) {
      const button = byTestId(tree, id);
      expect(button.props?.accessibilityRole).toBe('button');
      expect(button.props?.accessibilityLabel).toBe(phrase(key, 'en'));
    }
  });
});
