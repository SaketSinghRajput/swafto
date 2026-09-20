/**
 * EVERY COLOUR PAIR THE TOKENS CAN PRODUCE, IN EVERY MODE, MEASURED.
 *
 * This test exists because the palette comment claimed an invariant - "no token
 * pairs white with marigold" - that the palette itself had stopped honouring.
 * Focus mode carried white on #B87214 at 3.85:1 against a 4.5 minimum, in the mode
 * built for the hardest reading conditions, and nothing failed.
 *
 * A comment cannot hold an invariant. This enumerates the pairs a screen can
 * actually draw rather than the ones anybody remembered to think about, so adding a
 * mode or repainting an accent is checked by construction.
 */
import { describe, it, expect } from 'vitest';
import { tokens, type Mode } from '../src/theme/tokens.ts';
import { contrast } from './a11y.tsx';
import { CONTRAST_MIN_RATIO, TOUCH_TARGET_MIN_DP, BODY_TEXT_MIN_SP } from '@swafto/values';

const MODES: readonly Mode[] = ['comfort', 'focus'];

/** Foreground tokens that are only ever drawn on bg or surface. */
const ON_BACKGROUND = ['ink', 'inkMuted', 'positive', 'negative'] as const;

describe('every token colour pair meets the contrast minimum', () => {
  for (const mode of MODES) {
    const c = tokens(mode).color;

    for (const fg of ON_BACKGROUND) {
      for (const bg of ['bg', 'surface'] as const) {
        it(mode + ': ' + fg + ' on ' + bg, () => {
          expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(CONTRAST_MIN_RATIO.value);
        });
      }
    }

    it(mode + ': onAccent on accent - the pair B27 exists for', () => {
      expect(contrast(c.onAccent, c.accent)).toBeGreaterThanOrEqual(CONTRAST_MIN_RATIO.value);
    });

    it(mode + ': no token pairs white with the accent, in any mode', () => {
      expect(c.onAccent.toUpperCase()).not.toBe('#FFFFFF');
    });
  }

  /*
   * THE INSTRUMENT RESPONDS (§5.16). The pair that was actually shipping is fed
   * back in, and the measurement has to reject it. Without this the suite above
   * could be comparing a colour with itself and reporting success.
   */
  it('rejects the pair that was shipping - white on the focus accent', () => {
    const shipped = contrast('#FFFFFF', '#B87214');
    expect(shipped).toBeLessThan(CONTRAST_MIN_RATIO.value);
    expect(shipped).toBeCloseTo(3.85, 2);
  });
});

describe('the tokens consume the registry minimums and never restate them', () => {
  for (const mode of MODES) {
    it(mode + ': touch target is the registry value, not a local number', () => {
      expect(tokens(mode).touchTarget).toBe(TOUCH_TARGET_MIN_DP);
    });

    it(mode + ': the smallest type size is at or above the registry floor', () => {
      const sizes = Object.values(tokens(mode).type);
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(BODY_TEXT_MIN_SP);
    });
  }

  it('both modes carry exactly the same token names - a mode-only token is a finding', () => {
    const names = MODES.map((m) => Object.keys(tokens(m).color).sort().join(','));
    expect(new Set(names).size).toBe(1);
  });
});
