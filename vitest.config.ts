import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * THE TEST SEAM, AND WHAT IT DELIBERATELY CANNOT TELL YOU.
 *
 * React Native ships untranspiled Flow, which the bundler cannot parse, so a Node
 * test cannot `import 'react-native'` directly. There are two ways out, and the
 * difference between them matters far more than the inconvenience:
 *
 *   react-native-web  would make the tests run, and they would render in a WEB DOM.
 *                     Touch-target size, layout overflow at maximum font scale and
 *                     contrast measured against a browser are NOT the Android
 *                     numbers. That is the "instrument measures itself" defect this
 *                     build has already found twice - a harness producing confident
 *                     readings about the wrong subject. Rejected.
 *
 *   A NARROW SEAM     Screens import from `@swafto/ui`, which re-exports React
 *                     Native in the app and resolves to a recording double in
 *                     tests. The double reproduces the element tree and the props
 *                     exactly, and reproduces layout not at all.
 *
 * The second is chosen, and its limit is the point rather than a regrettable
 * side-effect:
 *
 *   A NODE TEST CAN HONESTLY ASSERT **structure and data flow** - which component
 *   rendered, with which props, showing which figure, derived from which store.
 *   IT CANNOT ASSERT **layout, pixel size or contrast**, and must not pretend to.
 *
 * That is exactly the STATIC / MEASURED split DESIGN.md already prints. Everything a
 * static reading can settle is settled here and in `check:design`; the rest is owed
 * to a real handset, which is what DEVICE-CHECKLIST is for and why B26-B31 are never
 * claimed from a unit test.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@swafto/ui': fileURLToPath(new URL('./apps/mobile/test/ui-double.tsx', import.meta.url)),
    },
  },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['**/test/**/*.{spec,test}.{ts,tsx}', '**/*.{spec,test}.{ts,tsx}'],
    // .stryker-tmp: a sandbox left behind is a second copy of the repo, and vitest
    // will happily run every test twice out of it. Iteration 24 lost a day to that.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.stryker-tmp/**'],
  },
});
