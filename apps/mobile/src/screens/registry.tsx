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
import { Today } from './T1.tsx';
import { DayCloseList } from './T5.tsx';
import { OpeningCash } from './T6.tsx';
import { FormB } from './T8.tsx';
import { FormC } from './T9.tsx';
import { FormD } from './T10.tsx';
import { CashCheck } from './T11.tsx';
import { CashDifference } from './T12.tsx';
import { DayClosed } from './T14.tsx';
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
    skippedSections: [],
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

/**
 * The four cases every screen must have, produced rather than retyped.
 *
 * `screens.spec.tsx` REQUIRES each screen to have an adversarial case, an Odia
 * case and a Focus case. Writing those by hand for ten screens is forty near
 * identical objects and one screen that quietly ends up with three of them -
 * which the spec would then catch, after somebody spent an afternoon on it.
 * Producing them means a screen cannot be registered incompletely.
 *
 * A screen with states the others do not have - T7's loading panel, T1's first
 * morning - adds those explicitly alongside.
 */
const standardCases = (
  screen: string,
  title: string,
  render: (store: Store, language: RenderLanguage, display: DisplayMode) => ReactElement,
  options: { readonly sheet?: boolean } = {},
): ScreenCase[] => {
  const onSheet = options.sheet ?? true;
  return [
    {
      id: screen + '-canonical',
      screen,
      caption: title + ' - canonical shop, English, Comfort',
      language: 'en',
      display: 'comfort',
      sheet: onSheet,
      element: () => render(canonicalStore(), 'en', 'comfort'),
    },
    {
      id: screen + '-adversarial',
      screen,
      caption: title + ' - adversarial shop, Odia, Comfort',
      language: 'or',
      display: 'comfort',
      sheet: onSheet,
      element: () => render(adversarialStore(), 'or', 'comfort'),
    },
    {
      id: screen + '-adversarial-focus',
      screen,
      caption: title + ' - adversarial shop, Odia, Focus mode',
      language: 'or',
      display: 'focus',
      sheet: false,
      element: () => render(adversarialStore(), 'or', 'focus'),
    },
    {
      id: screen + '-longest',
      screen,
      caption: title + ' - longest strings at the largest type, the worst case',
      language: 'longest',
      display: 'focus',
      sheet: false,
      element: () => render(adversarialStore(), 'longest', 'focus'),
    },
  ];
};

export const SCREEN_CASES: readonly ScreenCase[] = [
  ...standardCases('T5', 'T5 Day close list', (store, language, display) => (
    <DayCloseList store={store} language={language} display={display} />
  )),
  ...standardCases('T6', 'T6 Opening cash', (_store, language, display) => (
    <OpeningCash language={language} display={display} draftPaise={250000} />
  )),
  ...standardCases('T8', 'T8 Form B - party and amount', (store, language, display) => (
    <FormB store={store} language={language} display={display} draftPaise={45000} />
  )),
  ...standardCases('T9', 'T9 Form C - expense', (store, language, display) => (
    <FormC store={store} language={language} display={display} draftPaise={12500} />
  )),
  ...standardCases('T10', 'T10 Form D - money you took', (store, language, display) => (
    <FormD store={store} language={language} display={display} draftPaise={500000} />
  )),
  ...standardCases('T11', 'T11 Cash check - counting', (store, language, display) => (
    <CashCheck store={store} language={language} display={display} countedPaise={199237} />
  )),
  ...standardCases('T12', 'T12 Cash check - the difference', (store, language, display) => (
    <CashDifference
      store={store}
      language={language}
      display={display}
      countedPaise={150000}
    />
  )),
  ...standardCases('T14', 'T14 Day closed', (store, language, display) => (
    <DayClosed store={store} language={language} display={display} />
  )),
  {
    id: 'T1-canonical',
    screen: 'T1',
    caption: 'T1 Today - canonical shop, English, Comfort. The front door.',
    language: 'en',
    display: 'comfort',
    sheet: true,
    element: () => <Today store={canonicalStore()} language="en" display="comfort" />,
  },
  {
    id: 'T1-adversarial',
    screen: 'T1',
    caption: 'T1 Today - adversarial shop, Odia, Comfort',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => <Today store={adversarialStore()} language="or" display="comfort" />,
  },
  {
    id: 'T1-adversarial-focus',
    screen: 'T1',
    caption: 'T1 Today - adversarial shop, Odia, Focus mode',
    language: 'or',
    display: 'focus',
    sheet: false,
    element: () => <Today store={adversarialStore()} language="or" display="focus" />,
  },
  {
    id: 'T1-empty',
    screen: 'T1',
    caption: 'T1 Today - the first morning, before anything is entered',
    language: 'or',
    display: 'comfort',
    sheet: true,
    element: () => <Today store={emptyStore()} language="or" display="comfort" />,
  },
  {
    id: 'T1-longest',
    screen: 'T1',
    caption: 'T1 Today - longest strings at the largest type',
    language: 'longest',
    display: 'focus',
    sheet: false,
    element: () => <Today store={adversarialStore()} language="longest" display="focus" />,
  },
  {
    id: 'T1-error',
    screen: 'T1',
    caption: 'T1 Today - could not be opened',
    language: 'hi',
    display: 'comfort',
    sheet: false,
    element: () => <Today store={canonicalStore()} status="error" language="hi" display="comfort" />,
  },
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
