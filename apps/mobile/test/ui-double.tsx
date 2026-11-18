/**
 * THE TEST DOUBLE FOR THE UI PRIMITIVES - and an honest account of its limits.
 *
 * It records the element tree and every prop, exactly. It reproduces layout not at
 * all, because a Node process has no layout engine, and pretending otherwise is how a
 * harness ends up producing confident readings about the wrong subject.
 *
 * WHAT A TEST USING THIS MAY ASSERT
 *   which component rendered, with which props
 *   what text appeared, and which figure it came from
 *   that a figure changed when the store changed
 *   that a style object names a token rather than a literal
 *
 * WHAT IT MAY NOT ASSERT, AND WHY
 *   a rendered size in dp        nothing here measures
 *   overflow at maximum scale    nothing here lays out
 *   an effective contrast ratio  composited opacity and elevation are unknown here
 *
 * Those belong to `check:design`'s STATIC pass, which reads the style objects, and to
 * DEVICE-CHECKLIST's MEASURED pass on a real handset. The split is not a compromise;
 * it is the only arrangement in which each number means what it says.
 *
 * `measuredOnly()` exists so that boundary fails loudly rather than by convention: a
 * test reaching for a measurement gets an error naming where the measurement lives.
 */
import { createElement, type ReactNode } from 'react';

type AnyProps = Record<string, unknown> & { children?: ReactNode; testID?: string };

/** Every primitive is the same recording host element; the name carries the meaning. */
const host =
  (name: string) =>
  ({ children, ...props }: AnyProps = {}) =>
    createElement(name, props, children);

export const View = host('View');
export const Text = host('Text');
export const Pressable = host('Pressable');
export const ScrollView = host('ScrollView');
export const TextInput = host('TextInput');
export const FlatList = host('FlatList');
export const ActivityIndicator = host('ActivityIndicator');

/**
 * `StyleSheet.create` returns the same keys in React Native too, so keeping it as the
 * identity function here means a test reads the very object the screen declared -
 * which is what makes "this style names a token" assertable at all.
 */
export const StyleSheet = {
  create: <T extends Record<string, object>>(styles: T): T => styles,
  flatten: (style: unknown): object =>
    Array.isArray(style)
      ? Object.assign({}, ...style.flat(Infinity).filter(Boolean))
      : ((style ?? {}) as object),
  hairlineWidth: 1,
  absoluteFill: {} as object,
};

/**
 * MOTION, RECORDED AND NEVER RUN. An `Animated.View` is a `View` here, so the
 * contrast walker and the target check see its style exactly as they see any
 * other. A value remembers where it was told to go and `interpolate` returns
 * the config it was given, so a test can read what a screen ASKED the animation
 * to do - which is all a Node process can honestly say about motion.
 */
class AnimatedValue {
  constructor(public value: number) {}
  setValue(v: number): void {
    this.value = v;
  }
  interpolate(config: Record<string, unknown>): Record<string, unknown> {
    return { interpolate: config, from: this };
  }
}
/** Every `Animated.timing` started, in order. A test clears it with `length = 0`. */
export const timings: { toValue: number; duration: number }[] = [];
export const Animated = {
  View: host('View'),
  Value: AnimatedValue,
  /** Records the request and lands at the end immediately. */
  timing: (value: AnimatedValue, config: { toValue: number; duration: number }) => ({
    start: (done?: () => void) => {
      timings.push({ toValue: config.toValue, duration: config.duration });
      value.setValue(config.toValue);
      done?.();
    },
  }),
};
export const Easing = { bezier: () => (t: number) => t };
/** The reduce-motion listeners a screen registered, so a test can flip the setting. */
export const reduceMotionListeners: ((on: boolean) => void)[] = [];
export const AccessibilityInfo = {
  isReduceMotionEnabled: () => Promise.resolve(false),
  addEventListener: (_event: string, handler: (on: boolean) => void) => {
    reduceMotionListeners.push(handler);
    return { remove: () => {} };
  },
};

/** The system font scale a screen reads; 1 unless a test sets `fontScale.value`. */
export const fontScale = { value: 1 };
export const PixelRatio = { getFontScale: () => fontScale.value };

export type ViewStyle = Record<string, unknown>;
export type TextStyle = Record<string, unknown>;

/**
 * Call this from a test about to assert something only a device can know. It throws,
 * and the message says where the real measurement lives - so the boundary is
 * enforced rather than remembered.
 */
export function measuredOnly(property: string): never {
  throw new Error(
    `"${property}" cannot be asserted in a Node test: nothing here lays out or ` +
      'composites. Read it statically in check:design if the style object settles it, ' +
      'or measure it on a handset per DEVICE-CHECKLIST. A unit test claiming this ' +
      'number would be measuring the wrong subject.',
  );
}
