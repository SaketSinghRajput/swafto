/**
 * THE ANDROID ENTRY POINT. The first line is load-bearing.
 *
 * `react-native-get-random-values` installs crypto.getRandomValues, which the
 * UUIDv7 generator needs. It has to be imported before anything that might
 * mint an id, which is why it sits above the React import rather than beside
 * the others.
 */
import 'react-native-get-random-values';
import { createElement } from 'react';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import { Root } from './src/platform/Root.tsx';
import { ErrorBoundary } from './src/platform/ErrorBoundary.tsx';

// 4.7: a render error shows a calm restart screen instead of a white one. The
// boundary sits outside Root so it also catches Host construction failing.
const Guarded = () => createElement(ErrorBoundary, null, createElement(Root));
AppRegistry.registerComponent(appName, () => Guarded);
