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
