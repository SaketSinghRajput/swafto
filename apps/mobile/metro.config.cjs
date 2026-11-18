const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * METRO IN A WORKSPACES MONOREPO.
 *
 * The default config assumes the app is the repository. This one is not: the
 * app lives at apps/mobile and imports @swafto/formula-engine, @swafto/values
 * and @swafto/fixtures, which are sibling workspaces, and npm hoists every
 * third-party dependency to the repository root.
 *
 * Two consequences, and both are required rather than optional:
 *
 *   watchFolders  - metro refuses to serve a file outside its project root.
 *                   Without the repository root listed, every import of a
 *                   @swafto/* package fails to resolve at bundle time, not at
 *                   type-check time, so the build succeeds and the app is
 *                   blank.
 *   nodeModulesPaths + disableHierarchicalLookup
 *                 - makes resolution explicit instead of letting metro walk
 *                   upward and find react twice. Two copies of react is the
 *                   classic monorepo hook-dispatch crash, and it presents as a
 *                   runtime error nowhere near its cause.
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    disableHierarchicalLookup: true,

    /*
     * `@swafto/ui` IS A SEAM, NOT A PACKAGE.
     *
     * There is no packages/ui. Every screen imports its primitives from
     * `@swafto/ui`, which resolves two different ways on purpose:
     *
     *   under vitest  -> apps/mobile/test/ui-double.tsx (vitest.config.ts:38)
     *   on a device   -> apps/mobile/src/ui/index.ts, which re-exports React
     *                    Native and adds nothing
     *
     * The indirection exists because React Native ships untranspiled Flow, so
     * a Node test cannot import it. That seam is why 1,231 tests can drive
     * every screen without a simulator.
     *
     * Metro knew nothing about it, so the bundle failed with "Unable to
     * resolve module @swafto/ui from X0.tsx" after forty-six minutes of
     * native compilation - the last step of the build, and the first one that
     * had ever asked where this module really lives.
     */
    extraNodeModules: {
      '@swafto/ui': path.resolve(projectRoot, 'src/ui'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
