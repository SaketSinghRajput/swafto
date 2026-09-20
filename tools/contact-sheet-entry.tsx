/**
 * THE BUNDLE ENTRY FOR THE CONTACT SHEET.
 *
 * It holds no list of its own. The panels come from the screen registry, which is
 * the same list `screens.spec.tsx` measures, so the states a human looks at and the
 * states the instruments cover cannot drift apart. A panel that existed only here
 * would be a picture nobody checks; a case that existed only there would be a state
 * nobody has seen.
 *
 * WHY THE RENDER HAPPENS IN THIS FILE. react-native-web ships its ESM build with
 * extensionless directory imports, which Node refuses to load directly. esbuild
 * resolves them while bundling, so AppRegistry can only be reached from inside the
 * bundle - and this file is the bundle's entry.
 */
import { AppRegistry } from 'react-native-web';
import { renderToStaticMarkup } from 'react-dom/server';
import { SCREEN_CASES, type ScreenCase } from '../apps/mobile/src/screens/registry.tsx';

export interface RenderedPanel {
  readonly id: string;
  readonly caption: string;
  readonly html: string;
  readonly css: string;
}

const renderOne = (panel: ScreenCase): RenderedPanel => {
  const element = panel.element();
  AppRegistry.registerComponent(panel.id, () => () => element);
  const app = AppRegistry.getApplication(panel.id, {});
  return {
    id: panel.id,
    caption: panel.caption,
    html: renderToStaticMarkup(app.element),
    css: renderToStaticMarkup(app.getStyleElement()),
  };
};

/** Only the cases marked for the sheet: a human will not read forty near-identical panels. */
export function renderAll(): RenderedPanel[] {
  return SCREEN_CASES.filter((c) => c.sheet).map(renderOne);
}

/**
 * Every case, sheet or not, for a caller that wants to measure rather than look.
 * `check:layout` uses this, because B31 should be measured on the worst case in the
 * set and the worst case is deliberately not on the sheet.
 */
export function renderEvery(): RenderedPanel[] {
  return SCREEN_CASES.map(renderOne);
}
