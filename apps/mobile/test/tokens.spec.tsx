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
import {
  CONTRAST_MIN_RATIO,
  TOUCH_TARGET_MIN_DP,
  BODY_TEXT_MIN_SP,
  CHROME_FONT_SCALE_CAP,
} from '@swafto/values';

const MODES: readonly Mode[] = ['comfort', 'focus'];

/** Foreground tokens that are only ever drawn on one of the three surfaces. */
const ON_BACKGROUND = [
  'ink',
  'inkMuted',
  'positive',
  'negative',
  'brandSoft',
  // v2 status inks (DESIGN-SYSTEM-V2 1.2, T16-T24).
  'success',
  'warning',
  'info',
] as const;

/** v2 action tints: each ink must read on its own tint AND on the white disc it sits in. */
const ACTION_PAIRS = [
  ['inkSale', 'tintSale'],
  ['inkUdhar', 'tintUdhar'],
  ['inkCollect', 'tintCollect'],
  ['inkExpense', 'tintExpense'],
  ['inkMore', 'tintMore'],
] as const;

/**
 * ALL THREE SURFACES, not two. `surfaceRaised` arrived with the §9 palette and is
 * the DARKEST of the three in comfort mode, so it is the one where a muted
 * foreground comes closest to the floor - exactly the surface a two-entry list
 * would have skipped.
 */
const SURFACES = ['bg', 'surface', 'surfaceRaised'] as const;

describe('every token colour pair meets the contrast minimum', () => {
  for (const mode of MODES) {
    const c = tokens(mode).color;

    for (const fg of ON_BACKGROUND) {
      for (const bg of SURFACES) {
        it(mode + ': ' + fg + ' on ' + bg, () => {
          expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(CONTRAST_MIN_RATIO.value);
        });
      }
    }

    it(mode + ': onAccent on accent - the pair B27 exists for', () => {
      expect(contrast(c.onAccent, c.accent)).toBeGreaterThanOrEqual(CONTRAST_MIN_RATIO.value);
    });

    it(mode + ': onAccent on the PRESSED accent - a tap must not lose its label', () => {
      expect(contrast(c.onAccent, c.accentPressed)).toBeGreaterThanOrEqual(
        CONTRAST_MIN_RATIO.value,
      );
    });

    it(mode + ': onBrand on brand - the bars and headers', () => {
      expect(contrast(c.onBrand, c.brand)).toBeGreaterThanOrEqual(CONTRAST_MIN_RATIO.value);
    });

    it(mode + ': onSelected on selected - the chosen segment label (F-41)', () => {
      expect(contrast(c.onSelected, c.selected)).toBeGreaterThanOrEqual(CONTRAST_MIN_RATIO.value);
    });

    it(mode + ': selected clears the 3:1 non-text gate against the tray it sits in (F-41)', () => {
      expect(contrast(c.selected, c.surfaceRaised)).toBeGreaterThanOrEqual(3);
    });

    for (const tint of ['tintRed', 'tintGold', 'tintIndigo'] as const) {
      it(mode + ': ink on ' + tint + ' - a problem card', () => {
        expect(contrast(c.ink, c[tint])).toBeGreaterThanOrEqual(CONTRAST_MIN_RATIO.value);
      });
    }

    it(mode + ': no token pairs white with the accent, in any mode', () => {
      expect(c.onAccent.toUpperCase()).not.toBe('#FFFFFF');
    });

    /*
     * borderStrong IS BELOW THE NON-TEXT GATE, AND THAT IS WHY IT IS RESTRICTED.
     *
     * SPEC-DIGEST §9 decision 1 bars it from enclosing a control and sends control
     * borders to `inkMuted` instead. That restriction rests on a measurement, so the
     * measurement is taken here rather than quoted: if someone lightens `bg` until
     * borderStrong clears 3:1, the rule stops being needed and this test says so by
     * failing. A rule nobody can see the evidence for is a rule that gets dropped.
     */
    it(mode + ': borderStrong is under the 3:1 non-text gate, so it may not enclose', () => {
      expect(contrast(c.borderStrong, c.bg)).toBeLessThan(3);
    });

    it(mode + ': inkMuted clears the 3:1 non-text gate, so it CAN be a control border', () => {
      expect(contrast(c.inkMuted, c.bg)).toBeGreaterThanOrEqual(3);
    });

    /* ---- v2 "Mitra" pairs (DESIGN-SYSTEM-V2 1.2), added; none above changed ---- */

    it(mode + ': onBrand on the PRESSED brand - a tap must not lose its label (T26)', () => {
      expect(contrast(c.onBrand, c.brandPressed)).toBeGreaterThanOrEqual(CONTRAST_MIN_RATIO.value);
    });

    it(mode + ': onHeader on header - the title bar (T27)', () => {
      expect(contrast(c.onHeader, c.header)).toBeGreaterThanOrEqual(CONTRAST_MIN_RATIO.value);
    });

    for (const [fg, bg] of [
      ['warning', 'tintGold'],
      ['info', 'tintIndigo'],
      ['negative', 'tintRed'],
      ['brandSoft', 'tintSale'],
    ] as const) {
      it(mode + ': ' + fg + ' on ' + bg + ' - a banner (T39-T41, T56)', () => {
        expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(CONTRAST_MIN_RATIO.value);
      });
    }

    for (const [ink, tint] of ACTION_PAIRS) {
      it(mode + ': ' + ink + ' on ' + tint + ' and on surface - tile icon, avatar (T42-T51)', () => {
        expect(contrast(c[ink], c[tint])).toBeGreaterThanOrEqual(CONTRAST_MIN_RATIO.value);
        expect(contrast(c[ink], c.surface)).toBeGreaterThanOrEqual(CONTRAST_MIN_RATIO.value);
      });
      it(mode + ': ink on ' + tint + ' - the tile word (T34-T38)', () => {
        expect(contrast(c.ink, c[tint])).toBeGreaterThanOrEqual(CONTRAST_MIN_RATIO.value);
      });
    }

    for (const bg of SURFACES) {
      it(mode + ': edge clears the 3:1 non-text gate on ' + bg + ' - it encloses controls (N1-N3)', () => {
        expect(contrast(c.edge, c[bg])).toBeGreaterThanOrEqual(3);
      });
    }

    for (const [fg, bg, use] of [
      ['brand', 'bg', 'selected fill, Sale tile, done mark (N5)'],
      ['brand', 'surface', 'outlined secondary rim (N6)'],
      ['brand', 'tintSale', 'the "next" step rim (N8)'],
      ['brand', 'border', 'progress fill against its track (N10)'],
      ['warning', 'bg', 'waiting chip and banner rim (N11)'],
      ['warning', 'surface', 'waiting rim on a card (N12)'],
      ['inkMuted', 'surfaceRaised', 'switch thumb, OFF (N14)'],
    ] as const) {
      it(mode + ': ' + fg + ' on ' + bg + ' clears 3:1 - ' + use, () => {
        expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(3);
      });
    }

    /*
     * THE SCRIM IS THE ONE TRANSLUCENT VALUE, and it must never be the colour
     * text is measured against: the contrast walker reads #RRGGBB only, and a
     * sheet's panel sets `surface` over it. Pinned to the 8-digit form so a
     * second translucent token is a deliberate change, not a drift.
     */
    it(mode + ': scrim is the only 8-digit colour', () => {
      const translucent = Object.entries(c)
        .filter(([, v]) => /^#[0-9A-F]{8}$/i.test(v))
        .map(([k]) => k);
      expect(translucent).toEqual(['scrim']);
    });
  }

  /*
   * I1, AN INFORMATIONAL PAIR MADE A RULE. In Focus the header is `surface`,
   * which does not separate from the ground by colour (V2 measured 1.11). That
   * is acceptable ONLY because Shell draws a `borderStrong` rule under it -
   * asserted in Shell's own test. If the header ever stands apart by colour,
   * this fails and the reliance can be reviewed.
   */
  it('focus: the header is not told apart from the ground by colour alone', () => {
    const c = tokens('focus').color;
    expect(contrast(c.header, c.bg)).toBeLessThan(3);
  });

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

  /*
   * THE TEXT-SIZE PICKER (V2 3.15). Normal is the product as it was; a larger
   * step grows every type step and lowers the chrome cap and the body ceiling
   * by the same factor, so chrome never passes 1.5x in total, body copy never
   * passes the 2.0x check:layout measures, and nothing is ever SMALLER than at
   * Normal - the step behaves exactly like a system scale the instrument
   * already measures (tokens.ts says why this deviates from V2's wording).
   */
  for (const mode of MODES) {
    it(mode + ': Normal text size changes no token', () => {
      const n = tokens(mode, 'normal');
      expect(n.maxFontScale).toBe(CHROME_FONT_SCALE_CAP);
      expect(n.bodyText.maxFontSizeMultiplier).toBe(0);
      expect(n.type).toEqual(tokens(mode).type);
    });

    for (const size of ['large', 'xlarge'] as const) {
      it(mode + ': ' + size + ' grows every step and keeps both ceilings', () => {
        const base = tokens(mode, 'normal');
        const big = tokens(mode, size);
        const step = big.textScale[size];
        for (const k of Object.keys(base.type) as (keyof typeof base.type)[]) {
          expect(big.type[k], k).toBe(Math.floor(base.type[k] * step));
          // Floored, so the step times the divided cap never passes the cap itself.
          expect((big.type[k] / base.type[k]) * big.maxFontScale, k).toBeLessThanOrEqual(CHROME_FONT_SCALE_CAP);
          expect(big.type[k], k).toBeGreaterThan(base.type[k]);
        }
        // Chrome: step x capped system scale never passes the cap...
        expect(big.maxFontScale * step).toBeCloseTo(CHROME_FONT_SCALE_CAP, 6);
        // ...and body: step x system scale never passes the 2.0 check:layout measures.
        expect(big.bodyText.maxFontSizeMultiplier * step).toBeCloseTo(2, 6);
        // The cap is never below 1: a larger step never shrinks anything.
        expect(big.maxFontScale).toBeGreaterThanOrEqual(1);
      });
    }
  }

  it('both modes carry exactly the same token names - a mode-only token is a finding', () => {
    const names = MODES.map((m) => Object.keys(tokens(m).color).sort().join(','));
    expect(new Set(names).size).toBe(1);
  });
});
