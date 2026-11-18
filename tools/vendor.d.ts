/**
 * TYPES FOR THE TWO MODULES THE CONTACT SHEET USES AND NEITHER SHIPS.
 *
 * These appeared the moment `.tsx` entered the tsconfig include globs - until
 * then no file with a JSX extension was type checked anywhere in this repository,
 * so the whole React Native app and this renderer were outside the compiler.
 *
 * NARROW ON PURPOSE, NOT `any`. `react-native-web` 0.21.2 genuinely ships no
 * declarations and `@types/react-dom` is not installed; the lazy answer to both
 * is one `declare module 'x';`, which makes the error disappear by making the
 * module untyped - the same blindness one level down. So each declaration names
 * only the members this tool actually calls, which means a signature change
 * breaks the build instead of silently returning `any` into the pipeline that
 * writes the PNGs a human judges the design by.
 *
 * Adding `@types/react-dom` would be the better fix for the second one and is a
 * dependency change; this file is not in the way of making it.
 */
declare module 'react-native-web' {
  import type { ReactElement } from 'react';
  export const AppRegistry: {
    registerComponent(key: string, getComponent: () => () => ReactElement): void;
    getApplication(
      key: string,
      options: object,
    ): { element: ReactElement; getStyleElement(): ReactElement };
  };
}

declare module 'react-dom/server' {
  import type { ReactElement } from 'react';
  export function renderToStaticMarkup(element: ReactElement): string;
}
