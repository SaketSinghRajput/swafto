/**
 * USABILITY §4 ITEM 10 AND WCAG 1.4.4 - A LABEL IS WRAPPED, NEVER CUT.
 *
 * On the device the Hindi "Nothing to enter" pill drew "दर्ज करने को कुछ" and
 * lost "नहीं" on six rows (U-39, U-40), which turns the skip control into its
 * opposite. The cause was a box exactly as tall as one line of its words: the
 * phone's high-contrast text drew wider than it measured, the words wrapped at
 * draw time, and the second line had nowhere to go.
 *
 * This renders every redesigned screen in Hindi and Odia at a system font scale
 * of 2.0 and holds the STRUCTURE that makes that clip impossible, on every Text:
 *
 *   - no `numberOfLines`, `ellipsizeMode` or `adjustsFontSizeToFit` - nothing
 *     is allowed to elide or shrink a word to make it fit;
 *   - no ancestor with a fixed `height` or `maxHeight` in dp - a box may have a
 *     minimum, so a second line is always drawn;
 *   - every phrase on screen is the whole phrase from `strings.ts`.
 *
 * WHAT THIS DOES NOT DO, SAID PLAINLY. Nothing here lays anything out (see
 * ui-double.tsx). Whether the words FIT is measured by `check:layout` in
 * Chromium with the shipped fonts at 1, 1.5 and 2.0 - including the Hindi and
 * Odia registry cases this pass added - and on the phone by the tester.
 *
 * THE EXEMPTION, AND WHY IT IS SAFE. A step number inside its 32dp badge, and
 * the count inside the ring, are digits in a drawn circle of fixed size. They
 * are one or two Latin digits, never a word, and they are chrome.
 */
import { describe, it, expect, afterEach } from 'vitest';
import type { ReactElement } from 'react';
import { render, all, type Node } from './render.tsx';
import { fontScale } from './ui-double.tsx';
import { Today } from '../src/screens/T1.tsx';
import { TodayClosed } from '../src/screens/T3.tsx';
import { DayCloseList } from '../src/screens/T5.tsx';
import { FormA } from '../src/screens/T7.tsx';
import { FormB } from '../src/screens/T8.tsx';
import { FormC } from '../src/screens/T9.tsx';
import { PartiesList } from '../src/screens/P1.tsx';
import { CustomerDetail } from '../src/screens/P2.tsx';
import { canonicalStore, adversarialStore, emptyStore, closedStore } from '../src/screens/registry.tsx';
import { phrase, type Language } from '../src/i18n/strings.ts';
import { tokens } from '../src/theme/tokens.ts';

const SCREENS: readonly (readonly [string, (language: Language) => ReactElement])[] = [
  ['T1', (l) => <Today store={canonicalStore()} language={l} />],
  ['T1 adversarial', (l) => <Today store={adversarialStore()} language={l} />],
  ['T3', (l) => <TodayClosed store={closedStore()} language={l} />],
  ['T5 first morning', (l) => <DayCloseList store={emptyStore()} language={l} />],
  ['T5 adversarial', (l) => <DayCloseList store={adversarialStore()} language={l} />],
  ['T7', (l) => <FormA store={canonicalStore()} language={l} />],
  ['T8 collect, picker open', (l) => <FormB store={canonicalStore()} language={l} pickingParty />],
  ['T8 pay', (l) => <FormB store={canonicalStore()} language={l} selectedCommit={1} entryPartyId="p-wholesale" />],
  ['T9', (l) => <FormC store={canonicalStore()} language={l} />],
  ['P1', (l) => <PartiesList store={adversarialStore()} language={l} />],
  ['P2', (l) => <CustomerDetail store={canonicalStore()} partyId="p-ramesh" language={l} />],
];

const DIGITS_ONLY = /^[0-9]{1,2}$/;

/*
 * AN ICON GLYPH IS NOT A WORD (v2, DESIGN-SYSTEM-V2 section 2). The Icon
 * contract IS a fixed square that never scales - a pictogram grown by the
 * system setting would leave its disc - and it is hidden from assistive tech
 * because the word beside it carries the meaning. Exempt exactly that: the
 * icon family, unscaled. A word set in that family would draw boxes, which
 * check:font and the icon spec catch; a word anywhere else is still checked.
 */
const isIconGlyph = (n: Node): boolean =>
  (n.props?.style as Record<string, unknown> | undefined)?.fontFamily === tokens().font.icons &&
  n.props?.allowFontScaling === false;

/** Every Text with a fixed-height ancestor, named by its text. */
function boxedText(tree: Node): string[] {
  const bad: string[] = [];
  const walk = (n: Node, fixed: boolean): void => {
    const st = (n.props?.style ?? {}) as Record<string, unknown>;
    const here = fixed || typeof st.height === 'number' || typeof st.maxHeight === 'number';
    if (n.type === 'Text' && here && !DIGITS_ONLY.test(n.text) && !isIconGlyph(n)) bad.push(n.text.slice(0, 32));
    for (const c of n.children) walk(c, here);
  };
  walk(tree, false);
  return bad;
}

afterEach(() => {
  fontScale.value = 1;
});

describe('USABILITY item 10 - Hindi and Odia at font scale 2.0: wrapped, never cut', () => {
  for (const language of ['hi', 'or'] as const) {
    for (const [name, element] of SCREENS) {
      it(language + ' · ' + name + ': no ellipsis, no shrink-to-fit, no fixed-height text box', () => {
        fontScale.value = 2;
        const tree = render(element(language));
        const texts = all(tree).filter((n) => n.type === 'Text');
        expect(texts.length).toBeGreaterThan(0);
        const eliding = texts
          .filter(
            (n) =>
              n.props?.numberOfLines !== undefined ||
              n.props?.ellipsizeMode !== undefined ||
              n.props?.adjustsFontSizeToFit === true,
          )
          .map((n) => n.text.slice(0, 32));
        expect(eliding).toEqual([]);
        expect(boxedText(tree)).toEqual([]);
        expect(texts.some((n) => n.text.includes('…'))).toBe(false);
      });
    }
  }

  it('hi: the day close skip label is the whole phrase, "नहीं" included, on every row', () => {
    fontScale.value = 2;
    const tree = render(<DayCloseList store={emptyStore()} language="hi" />);
    const labels = all(tree).filter((n) => String(n.props?.testID ?? '').startsWith('t5-label-skip-'));
    expect(labels).toHaveLength(8);
    for (const l of labels) {
      expect(l.text).toBe(phrase('t5.nothingToday', 'hi'));
      expect(l.text.endsWith('नहीं')).toBe(true);
    }
  });

  it('the instrument responds: a fixed-height box around a word is reported', () => {
    // §5.16 - shown the defect it exists for, it must say so.
    const planted: Node = {
      type: 'View',
      props: { style: { height: 56 } },
      text: 'दर्ज करने को कुछ नहीं',
      children: [{ type: 'Text', props: {}, text: 'दर्ज करने को कुछ नहीं', children: [] }],
    };
    expect(boxedText(planted)).toEqual(['दर्ज करने को कुछ नहीं']);
  });
});
