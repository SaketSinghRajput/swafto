/**
 * THE PACKAGE ENTRY. `apps/mobile/package.json` has pointed at this file since
 * the package existed, and until now the file did not - the manifest named an
 * entry point that was not there, which nothing checked.
 *
 * It exports the composition root and the pieces a host needs to build one. It
 * does NOT call AppRegistry: registering a component is the native host's job,
 * and doing it here would make this module impossible to import in a test.
 */
export { App, type AppProps } from './app/App.tsx';
export { Session, type SessionState, type SessionOptions, type ScreenId } from './app/session.tsx';
export { Store, memoryPort, type StoreState, type PersistencePort } from './store/index.ts';
export { tokens, type Mode as DisplayMode } from './theme/tokens.ts';
export { strings, phrase, STRINGS, type Language, type RenderLanguage } from './i18n/strings.ts';
