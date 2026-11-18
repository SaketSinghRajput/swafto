/**
 * M3 icon pipeline: `Icon` draws one glyph of the bundled icon font, hidden
 * from TalkBack, sized and coloured from tokens, and `icons.json` is the one
 * list of names (an unknown name is a TypeScript error, checked by `tsc`).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Icon, glyphOf, type IconName } from '../src/ui/Icon.tsx';
import iconSet from '../src/ui/icons.json';
import { tokens } from '../src/theme/tokens.ts';
import { render } from './render.tsx';

const MOBILE = join(__dirname, '..');

const drawn = (el: Parameters<typeof render>[0]) => {
  const t = render(el);
  expect(t.type).toBe('Text');
  return t;
};

describe('Icon', () => {
  it('is hidden from assistive technology, because the adjacent word names the control', () => {
    const t = drawn(<Icon name="sale" />);
    expect(t.props.accessible).toBe(false);
    expect(t.props.importantForAccessibility).toBe('no');
    expect(t.props.accessibilityLabel).toBeUndefined();
  });

  it('draws the codepoint recorded for its name, in the icon family', () => {
    const t = drawn(<Icon name="sale" />);
    expect(t.text).toBe(String.fromCodePoint(parseInt(iconSet.icons.sale.codepoint, 16)));
    expect(t.props.style.fontFamily).toBe(tokens().font.icons);
  });

  it('is sized from icon.* with a square box and no font scaling', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const s = drawn(<Icon name="tick" size={size} />).props.style;
      const dp = tokens().icon[size];
      expect([s.fontSize, s.lineHeight, s.width, s.height]).toEqual([dp, dp, dp, dp]);
    }
    const t = drawn(<Icon name="tick" />);
    expect(t.props.allowFontScaling).toBe(false);
    expect(t.props.style.includeFontPadding).toBe(false);
  });

  it('is coloured by a token, per mode', () => {
    for (const display of ['comfort', 'focus'] as const) {
      expect(drawn(<Icon name="lock" display={display} />).props.style.color).toBe(
        tokens(display).color.ink,
      );
      expect(drawn(<Icon name="lock" color="brand" display={display} />).props.style.color).toBe(
        tokens(display).color.brand,
      );
    }
  });
});

describe('icons.json', () => {
  const entries = Object.entries(iconSet.icons);

  it('gives every name its own glyph, in the Private Use Area', () => {
    const cps = entries.map(([, e]) => parseInt(e.codepoint, 16));
    expect(new Set(cps).size).toBe(cps.length);
    for (const cp of cps) expect(cp >= 0xe000 && cp <= 0xf8ff).toBe(true);
  });

  it('ships a TTF whose size is what the check pins (a few KB, not a megabyte)', () => {
    const bytes = readFileSync(join(MOBILE, 'assets/fonts', iconSet.font.file)).length;
    expect(bytes).toBeGreaterThan(2000);
    expect(bytes).toBeLessThan(20 * 1024);
  });

  it('keeps glyphOf total over the union', () => {
    for (const [name] of entries) expect(glyphOf(name as IconName)).toHaveLength(1);
  });

  it('rejects an unknown name at compile time', () => {
    // @ts-expect-error - "sale2" is not in icons.json; tsc fails if this ever compiles
    const bad: IconName = 'sale2';
    expect(bad).toBe('sale2');
  });
});
