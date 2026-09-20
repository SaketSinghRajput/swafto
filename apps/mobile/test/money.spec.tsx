/**
 * <Money> exists for DC-005 and the sign rule. These assert structure and props -
 * what a Node renderer can honestly know. Whether the column visually aligns on a
 * handset belongs to DEVICE-CHECKLIST, and nothing here claims it.
 */
import { describe, it, expect } from 'vitest';
import { render } from './render.tsx';
import { Money } from '../src/components/Money.tsx';

describe('Money is the only path a rupee figure takes to the screen', () => {
  it('always sets tabular-nums, because Anek Odia digits are proportional (DC-005)', () => {
    expect(render(<Money amount={123456} />).props.style.fontVariant).toEqual(['tabular-nums']);
  });

  it('sets it in EVERY mode and size, not only the default', () => {
    for (const mode of ['comfort', 'focus'] as const) {
      for (const size of ['body', 'figure', 'heading'] as const) {
        expect(
          render(<Money amount={1} mode={mode} size={size} />).props.style.fontVariant,
        ).toEqual(['tabular-nums']);
      }
    }
  });

  it('groups the Indian way above a lakh, where it diverges from Western (DC-002)', () => {
    expect(render(<Money amount={10_000_000} />).text).toContain('1,00,000');
  });

  it('renders LATIN digits whatever the mode - words localise, money does not', () => {
    for (const mode of ['comfort', 'focus'] as const) {
      const rendered = render(<Money amount={4500} mode={mode} />).text;
      /*
       * The currency symbol is expected; the DIGITS are what must never localise.
       * \p{Nd} matches a decimal digit in ANY script, so Odia or Devanagari numerals
       * are caught here rather than slipping through as "some digits".
       */
      const digits = rendered.replace(/[^\p{Nd}]/gu, '');
      expect(digits.length).toBeGreaterThan(0);
      expect(digits).toMatch(/^[0-9]+$/);
    }
  });

  it('never caps font scaling - content grows even though the chrome does not', () => {
    expect(render(<Money amount={100} />).props.allowFontScaling).toBe(true);
  });

  it('carries the sign itself, so colour is never the only signal', () => {
    expect(render(<Money amount={-25000} tone="directional" />).text).toContain('-');
  });

  it('takes every size from the token set, and the three differ', () => {
    const sizes = (['body', 'figure', 'heading'] as const).map(
      (s) => render(<Money amount={1} size={s} />).props.style.fontSize,
    );
    expect(new Set(sizes).size).toBe(3);
    for (const s of sizes) expect(typeof s).toBe('number');
  });

  it('uses the bundled Odia family, never the system default', () => {
    expect(render(<Money amount={1} />).props.style.fontFamily).toContain('AnekOdia');
  });
});
