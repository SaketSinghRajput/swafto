/**
 * THE ONE PLACE THIS APP TOUCHES REACT NATIVE.
 *
 * Every screen and component imports its primitives from here, never from
 * 'react-native' directly. Two reasons, and the second is the one that matters:
 *
 *  1. React Native ships untranspiled Flow, so a Node test cannot import it. This
 *     module is what the test seam swaps (see vitest.config.ts).
 *
 *  2. IT MAKES THE SEAM VISIBLE. An import of 'react-native' buried in screen six is
 *     a screen the tests silently stop covering. An import from here is a line any
 *     reader - and `check:design` - can see.
 *
 * It re-exports and adds nothing. A wrapper that also decided things would be a
 * second place where behaviour lives.
 */
export {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  // F-15: built-in motion, so the ring can fill without a native dependency.
  Animated,
  Easing,
  AccessibilityInfo,
  // The system font scale, so a two-column money grid can give way to one.
  PixelRatio,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
