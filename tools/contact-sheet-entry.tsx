/**
 * WHAT THE CONTACT SHEET CONTAINS - one entry per panel, and nothing else.
 *
 * This file is the list of things a human is being asked to look at. It is separate
 * from the generator because the generator is machinery nobody should have to read
 * to answer "which screens are on the sheet, in which state, in which language".
 *
 * IT USES THE REAL SCREENS AND THE REAL FIXTURES. Nothing here is a mock-up drawn
 * for the sheet. The whole value of the artifact is that it shows what the code
 * does, so a panel that was hand-composed would be worse than no panel - it would
 * be a picture of an intention.
 *
 * WHY EVERY SCREEN APPEARS TWICE. Canonical proves it renders; adversarial proves
 * it survives. The Odia panel is the one that matters most and the one no test in
 * this repository can settle: whether Anek Odia conjuncts form correctly and
 * whether the digits line up is answered by looking.
 */
import { FormA } from '../apps/mobile/src/screens/T7.tsx';
import { Store, memoryPort, type StoreState } from '../apps/mobile/src/store/index.ts';
import type { RenderLanguage } from '../apps/mobile/src/i18n/strings.ts';
import type { Mode as DisplayMode } from '../apps/mobile/src/theme/tokens.ts';
import {
  canonicalInput,
  CANONICAL_PARTIES,
  adversarialInput,
  ADVERSARIAL_PARTIES,
} from '@swafto/fixtures';
import type { DayInput, Party } from '@swafto/formula-engine';
import type { ReactElement } from 'react';
import { AppRegistry } from 'react-native-web';
import { renderToStaticMarkup } from 'react-dom/server';

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

export interface Panel {
  /** Becomes the PNG filename, so it is the id TASKS.md predicates look for. */
  readonly id: string;
  /** Printed under the panel, so a reader knows what they are looking at. */
  readonly caption: string;
  readonly language: RenderLanguage;
  readonly display: DisplayMode;
  readonly element: ReactElement;
}

export function panels(): Panel[] {
  const canonical = () => storeOf(canonicalInput(), CANONICAL_PARTIES, 'shop-canonical');
  const adversarial = () => storeOf(adversarialInput(), ADVERSARIAL_PARTIES, 'shop-adversarial');
  const empty = () => {
    const base = canonicalInput();
    return storeOf({ ...base, entries: [] }, CANONICAL_PARTIES, 'shop-canonical');
  };

  return [
    {
      id: 'T7-canonical',
      caption: 'T7 Form A - canonical shop, English, Comfort',
      language: 'en',
      display: 'comfort',
      element: <FormA store={canonical()} language="en" display="comfort" draftPaise={4500} />,
    },
    {
      id: 'T7-adversarial',
      caption:
        'T7 Form A - adversarial shop, Odia, Comfort. The panel the Odia question is answered by.',
      language: 'or',
      display: 'comfort',
      element: (
        <FormA store={adversarial()} language="or" display="comfort" draftPaise={12345678} />
      ),
    },
    {
      id: 'T7-adversarial-focus',
      caption: 'T7 Form A - adversarial shop, Odia, Focus mode',
      language: 'or',
      display: 'focus',
      element: <FormA store={adversarial()} language="or" display="focus" draftPaise={12345678} />,
    },
    {
      id: 'T7-longest',
      caption: 'T7 Form A - longest-string pseudo-locale, the layout upper bound',
      language: 'longest',
      display: 'comfort',
      element: <FormA store={adversarial()} language="longest" display="comfort" />,
    },
    {
      id: 'T7-empty',
      caption: 'T7 Form A - a shop first morning, nothing entered yet',
      language: 'or',
      display: 'comfort',
      element: <FormA store={empty()} language="or" display="comfort" />,
    },
    {
      id: 'T7-error',
      caption: 'T7 Form A - the day could not be opened',
      language: 'or',
      display: 'comfort',
      element: <FormA store={canonical()} status="error" language="or" display="comfort" />,
    },
  ];
}

/**
 * The panels, rendered to static markup INSIDE the bundle.
 *
 * It happens here rather than in the generator because react-native-web ships its
 * ESM build with extensionless directory imports, which Node refuses to load
 * directly. esbuild resolves them while bundling, so the only place AppRegistry can
 * be reached is from inside the bundle - and that is this file.
 */
export function renderAll(): { id: string; caption: string; html: string; css: string }[] {

  return panels().map((panel) => {
    AppRegistry.registerComponent(panel.id, () => () => panel.element);
    const { element, getStyleElement } = AppRegistry.getApplication(panel.id, {});
    return {
      id: panel.id,
      caption: panel.caption,
      html: renderToStaticMarkup(element),
      css: renderToStaticMarkup(getStyleElement()),
    };
  });
}
