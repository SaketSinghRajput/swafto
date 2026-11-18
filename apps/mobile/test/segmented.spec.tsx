/**
 * F-41 - THE CHOSEN SEGMENT MUST BE VISIBLE IN BOTH MODES (WCAG 2.2 SC 1.4.11).
 *
 * In Focus the selected segment was filled with `brand`, which is the ground
 * colour there: 1.24:1 against the `surfaceRaised` tray. Its label used
 * `onBrand`, the same hex as the unselected label's `ink`. So on the control
 * that chooses UPI or cash, the live choice differed from its neighbours by
 * bold weight alone. This measures what the component actually draws, not what
 * the token file says, so a later edit that puts `brand` back fails here.
 */
import { describe, it, expect } from 'vitest';
import { Segmented } from '../src/components/Shell.tsx';
import { tokens, type Mode } from '../src/theme/tokens.ts';
import { render, byTestId } from './render.tsx';
import { contrast } from './a11y.tsx';
import { CONTRAST_MIN_RATIO } from '@swafto/values';

/** SC 1.4.11: a state indicator needs 3:1 against what is adjacent to it. */
const NON_TEXT_MIN = 3;

const tree = (display: Mode) =>
  render(
    <Segmented
      testID="seg"
      display={display}
      value="upi"
      onChange={() => {}}
      options={[
        { key: 'cash', label: 'Cash' },
        { key: 'upi', label: 'UPI' },
      ]}
    />,
  );

describe('F-41: the selected segment against its tray', () => {
  for (const display of ['comfort', 'focus'] as const) {
    const c = tokens(display).color;

    it(display + ': the selected fill clears 3:1 against the tray', () => {
      const t = tree(display);
      const tray = byTestId(t, 'seg').props.style.backgroundColor as string;
      const fill = byTestId(t, 'seg-upi').props.style.backgroundColor as string;
      expect(tray).toBe(c.surfaceRaised);
      expect(contrast(fill, tray)).toBeGreaterThanOrEqual(NON_TEXT_MIN);
    });

    it(display + ': the selected label is readable on its fill, and is not the unselected colour', () => {
      const t = tree(display);
      const fill = byTestId(t, 'seg-upi').props.style.backgroundColor as string;
      const on = byTestId(t, 'seg-upi').children[0]!.props.style.color as string;
      const off = byTestId(t, 'seg-cash').children[0]!.props.style.color as string;
      expect(contrast(on, fill)).toBeGreaterThanOrEqual(CONTRAST_MIN_RATIO.value);
      expect(on).not.toBe(off);
    });

    it(display + ': the unselected segment draws no fill of its own', () => {
      expect(byTestId(tree(display), 'seg-cash').props.style.backgroundColor).toBeUndefined();
    });
  }

  /*
   * THE PAIR THAT SHIPPED, BY ITS HEXES. This read `tokens('focus')`, which was
   * the shipping pair until v2 "Mitra" repainted Focus `brand` teal (DESIGN-
   * SYSTEM-V2 1.1) - after which it measured the NEW pair (6.92) and stopped
   * being evidence of anything. The instrument is proved against the values F-41
   * found: A1 Focus `brand` #0E1521 on A1 Focus `surfaceRaised` #1E2839.
   */
  it('the instrument rejects the pair that was shipping - focus brand on the tray', () => {
    expect(contrast('#0E1521', '#1E2839')).toBeLessThan(NON_TEXT_MIN);
  });
});
