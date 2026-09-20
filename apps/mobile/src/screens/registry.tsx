/**
 * EVERY SCREEN, IN EVERY STATE WORTH LOOKING AT - ONE LIST, TWO CONSUMERS.
 *
 * B26 says "contrast ratio on every rendered screen", and the honest reading of
 * "every" is a list that a screen joins by existing rather than by somebody
 * remembering to add it to a test. The alternative - repeating the accessibility
 * block in ten screen specs - reaches screen six and starts diverging, which is the
 * failure this build has already named in several other costumes.
 *
 * TWO CONSUMERS, DELIBERATELY. `screens.spec.tsx` asserts over this list, and the
 * contact sheet renders from it. That means the panels a human looks at and the
 * cases the instruments measure cannot drift apart: there is no third place where a
 * state could exist unmeasured, or be measured but never seen.
 *
 * WHY CASES AND NOT SCREENS. A screen is not one thing. T7 loaded against the
 * canonical shop and T7 in Odia against the adversarial shop fail differently, and
 * the second is where the failures live. A case is the smallest unit an instrument
 * can actually be pointed at.
 *
 * `sheet: false` keeps a case out of the contact sheet while still measuring it.
 * The sheet is for a human and a human will not look at forty near-identical
 * panels; the instruments have no such limit and should cover more.
 */
import type { ReactElement } from 'react';
import { FormA } from './T7.tsx';
import { Store, memoryPort, type StoreState } from '../store/index.ts';
import type { RenderLanguage } from '../i18n/strings.ts';
import type { Mode as DisplayMode } from '../theme/tokens.ts';
import {
  canonicalInput,
  CANONICAL_PARTIES,
  adversarialInput,
  ADVERSARIAL_PARTIES,
} from '@swafto/fixtures';
import type { DayInput, Party } from '@swafto/formula-engine';

const storeOf = (input: DayInput, parties: readonly Party[], shopId: string): Store => {
  const state: StoreState = {
    shopId,
    day: input.day,
    entries: input.entries,
    parties,
    priorCreditOutstanding: input.priorCreditOutstanding,
    priorSupplierOutstanding: input.priorSupplierOutstanding,
  };
  return new Store(memoryPort(state));
};

export const canonicalStore = (): Store =>
  storeOf(canonicalInput(), CANONICAL_PARTIES, 'shop-canonical');

export const adversarialStore = (): Store =>
  storeOf(adversarialInput(), ADVERSARIAL_PARTIES, 'shop-adversarial');

/** A day with nothing entered - the first morning of a real shop. */
export const emptyStore = (): Store => {
  const base = canonicalInput();
  return storeOf({ ...base, entries: [] }, CANONICAL_PARTIES, 'shop-canonical');
};

export interface ScreenCase {
  /** Stable: it becomes a PNG filename and a test name. */
  readonly id: string;
  /** Which screen from the build map this case belongs to, for traceability. */
  readonly screen: string;
  readonly caption: string;
  readonly language: RenderLanguage;
  readonly display: DisplayMode;
  /** Whether a human sees this one on the contact sheet. */
  readonly sheet: boolean;
  /** Fresh on every call - a case that shared a store with another would not be one. */
  readonly element: () => ReactElement;
}

export const SCREEN_CASES: readonly ScreenCase[] = [
  {
    id: 'T7-canonical',
    screen: 'T7',
    caption: 'T7 Form A - canonical shop, English, Comfort',
    language: 'en',
    display: 'comfort',
    sheet: true,
    element: () => (
      <FormA store={canonicalStore()} language="en" display="comfort" draftPaise={4500} />
    ),
  },
  {
    id: 'T7-adversarial',
    screen: 'T7',
    caption:
      'T7 Form A - adversarial shop, Odia, Comfort. The panel the Odia question is answered by.',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => (
      <FormA store={adversarialStore()} language="or" display="comfort" draftPaise={12345678} />
    ),
  },
  {
    id: 'T7-adversarial-focus',
    screen: 'T7',
    caption: 'T7 Form A - adversarial shop, Odia, Focus mode',
    language: 'or',
    display: 'focus',
    sheet: true,
    element: () => (
      <FormA store={adversarialStore()} language="or" display="focus" draftPaise={12345678} />
    ),
  },
  {
    id: 'T7-longest',
    screen: 'T7',
    caption: 'T7 Form A - longest-string pseudo-locale, the layout upper bound',
    language: 'longest',
    display: 'comfort',
    sheet: true,
    element: () => <FormA store={adversarialStore()} language="longest" display="comfort" />,
  },
  {
    id: 'T7-empty',
    screen: 'T7',
    caption: 'T7 Form A - a shop first morning, nothing entered yet',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => <FormA store={emptyStore()} language="or" display="comfort" />,
  },
  {
    id: 'T7-error',
    screen: 'T7',
    caption: 'T7 Form A - the day could not be opened',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => (
      <FormA store={canonicalStore()} status="error" language="or" display="comfort" />
    ),
  },
  {
    id: 'T7-loading',
    screen: 'T7',
    caption: 'T7 Form A - opening the day',
    language: 'or',
    display: 'comfort',
    // Measured but not on the sheet: a spinner and a line of text is not worth a panel.
    sheet: false,
    element: () => (
      <FormA store={canonicalStore()} status="loading" language="or" display="comfort" />
    ),
  },
  {
    id: 'T7-hindi',
    screen: 'T7',
    caption: 'T7 Form A - Hindi, Focus mode',
    language: 'hi',
    display: 'focus',
    sheet: false,
    element: () => <FormA store={canonicalStore()} language="hi" display="focus" />,
  },
  {
    id: 'T7-longest-focus',
    screen: 'T7',
    caption: 'T7 Form A - longest strings at the largest type, the worst case in the set',
    language: 'longest',
    display: 'focus',
    sheet: false,
    element: () => <FormA store={adversarialStore()} language="longest" display="focus" />,
  },
];

/** The screens the build map committed to, as the registry actually covers them. */
export const COVERED_SCREENS: readonly string[] = [...new Set(SCREEN_CASES.map((c) => c.screen))];
