/**
 * ONE ICON, DRAWN FROM THE BUNDLED ICON FONT (DESIGN-SYSTEM-V2 section 2).
 *
 * `<Icon name="sale" />` is a Text holding one Private Use codepoint of
 * SwaftoIcons.ttf, a subset of Lucide (ISC). The list of names is `icons.json`,
 * and `IconName` is derived from it, so an unknown name is a compile error and
 * cannot ship as an empty box.
 *
 * THE GLYPH IS DECORATIVE, ALWAYS. Every icon sits beside its word, or inside a
 * control whose accessible name is that word, so this renders hidden from
 * assistive technology. Left visible, TalkBack would read a Private Use
 * character aloud and the label-in-name rule (WCAG 2.5.3) would break.
 *
 * NO SCALING, NO FONT PADDING. The size is a fixed dp from `icon.*` and the
 * line height is the same token, so the glyph box is a square; font scale must
 * not grow a pictogram out of its tile. Icons go through no Indic shaping, so
 * the Odia line-box rule does not apply to them.
 */
import { Text } from '@swafto/ui';
import { tokens, type Mode } from '../theme/tokens.ts';
import iconSet from './icons.json';

export type IconName = keyof typeof iconSet.icons;

type Tokens = ReturnType<typeof tokens>;

export interface IconProps {
  readonly name: IconName;
  /** `icon.*` token. Default `md`. */
  readonly size?: keyof Tokens['icon'];
  /** A `color.*` token, never a literal. Default `ink`. */
  readonly color?: keyof Tokens['color'];
  readonly display?: Mode;
}

/** The character for a name; exported so a test can name the glyph it expects. */
export const glyphOf = (name: IconName): string =>
  String.fromCodePoint(parseInt(iconSet.icons[name].codepoint, 16));

export function Icon({ name, size = 'md', color = 'ink', display = 'comfort' }: IconProps) {
  const t = tokens(display);
  const dp = t.icon[size];
  return (
    <Text
      accessible={false} importantForAccessibility="no"
      allowFontScaling={false}
      style={{
        fontFamily: t.font.icons,
        fontSize: dp,
        lineHeight: dp,
        width: dp,
        height: dp,
        textAlign: 'center',
        includeFontPadding: false,
        color: t.color[color],
      }}
    >
      {glyphOf(name)}
    </Text>
  );
}
