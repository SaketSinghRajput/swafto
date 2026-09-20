/**
 * THE THREE ACCESSIBILITY FACTS A SCREEN TEST CAN ACTUALLY CHECK.
 *
 * Contrast, touch target and text size. Not because they are the whole of
 * accessibility - they are not - but because they are the part a structural test
 * can measure honestly, and the part this product cannot afford to get wrong: a
 * shop in daylight, a 7,000-rupee screen, and one thumb.
 *
 * EVERY THRESHOLD COMES FROM THE REGISTRY. Nothing here restates a number. A test
 * carrying its own copy of the minimum is a test that keeps passing after the
 * minimum moves, which is worse than no test because it reports success.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not measure layout, because nothing
 * here lays anything out - `measuredOnly()` in the UI double exists so that
 * boundary fails loudly. So these read the STYLE a screen asked for, which is the
 * only thing a screen actually controls. Whether 56dp of requested touch target
 * survives contact with a real device is B17 on a real device, not this.
 */
import { CONTRAST_MIN_RATIO, TOUCH_TARGET_MIN_DP, BODY_TEXT_MIN_SP } from '@swafto/values';
import { all, type Node } from './render.tsx';

/** sRGB channel to linear, per WCAG 2.2 relative luminance. */
const channel = (c: number): number => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

/** WCAG relative luminance of a #RRGGBB colour. */
export function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error('a contrast check needs a #RRGGBB colour, got: ' + hex);
  const n = parseInt(m[1] as string, 16);
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, always >= 1. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

export const meetsContrast = (a: string, b: string): boolean =>
  contrast(a, b) >= CONTRAST_MIN_RATIO.value;

const styleOf = (n: Node): Record<string, any> =>
  (n.props?.style ?? {}) as Record<string, any>;

/**
 * Every interactive node that asks for less than the minimum on either axis.
 *
 * Returns the offenders rather than a boolean, so a failure names the element
 * instead of saying only that one exists somewhere on the screen.
 */
export function undersizedTargets(tree: Node): string[] {
  return all(tree)
    .filter((n) => n.type === 'Pressable' || n.props?.accessibilityRole === 'button')
    .filter((n) => {
      const st = styleOf(n);
      return !(
        typeof st.minHeight === 'number' &&
        st.minHeight >= TOUCH_TARGET_MIN_DP &&
        typeof st.minWidth === 'number' &&
        st.minWidth >= TOUCH_TARGET_MIN_DP
      );
    })
    .map((n) => String(n.props?.testID ?? n.props?.accessibilityLabel ?? n.type));
}

/** Every Text node asking for a size under the registry floor. */
export function undersizedText(tree: Node): string[] {
  return all(tree)
    .filter((n) => n.type === 'Text')
    .filter((n) => {
      const size = styleOf(n).fontSize;
      return typeof size === 'number' && size < BODY_TEXT_MIN_SP;
    })
    .map((n) => String(n.props?.testID ?? n.text.slice(0, 24)));
}

/**
 * Every Text node whose colour fails against the background it is drawn on.
 *
 * The background is the nearest ancestor that set one, which is how the platform
 * resolves it too. A node with no coloured ancestor at all is reported rather than
 * skipped - a figure on an unknown background is exactly the case nobody checks.
 */
export function failingContrast(tree: Node): string[] {
  const bad: string[] = [];
  const walk = (n: Node, inherited: string | null): void => {
    const st = styleOf(n);
    const bg = typeof st.backgroundColor === 'string' ? st.backgroundColor : inherited;
    if (n.type === 'Text' && typeof st.color === 'string') {
      if (bg === null) {
        bad.push(String(n.props?.testID ?? n.text.slice(0, 24)) + ' (no background anywhere above it)');
      } else if (!meetsContrast(st.color, bg)) {
        bad.push(
          String(n.props?.testID ?? n.text.slice(0, 24)) +
            ' ' + st.color + ' on ' + bg + ' = ' + contrast(st.color, bg).toFixed(2) + ':1',
        );
      }
    }
    for (const c of n.children) walk(c, bg);
  };
  walk(tree, null);
  return bad;
}
