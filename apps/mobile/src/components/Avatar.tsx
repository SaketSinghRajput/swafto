/**
 * THE PARTY AVATAR (DESIGN-SYSTEM-V2 3.6): a disc with the first letter of a
 * name, so a list of thirty customers has something for the eye to land on.
 *
 * DECORATIVE, AND HIDDEN AS SUCH. The row's own name carries the person to a
 * screen reader; a disc announcing "R" before "Ramesh" is noise.
 *
 * THE COLOUR COMES FROM THE PARTY'S ID, NOT ITS PLACE IN A LIST. The concept
 * coloured by index, so re-sorting the list (most owed first) repainted every
 * disc and a shopkeeper who had learned "Ramesh is the purple one" lost it.
 * A stable hash of the id keeps Ramesh purple wherever he sorts. Hue means
 * nothing about money: it is one of the five action tints, chosen by hash.
 *
 * THE FIRST AKSHARA, NOT THE FIRST CODE POINT. "କ୍ଷ" is three code points and
 * one letter to an Odia reader; cutting it after the first would draw a
 * consonant he would not write. Hermes has no `Intl.Segmenter` (V2 3.6), so the
 * cluster is found by code-point class: a base letter, then any combining
 * marks, then - after a virama - the next consonant and its marks, repeated.
 */
import { View, Text } from '@swafto/ui';
import { Icon } from '../ui/Icon.tsx';
import { tokens, type Mode as DisplayMode } from '../theme/tokens.ts';

/** Devanagari and Odia viramas: the sign that joins the next consonant on. */
const VIRAMA = new Set([0x094d, 0x0b4d]);

/**
 * Combining marks in the two Indic blocks this app writes, plus the general
 * combining range and the joiners. A mark never starts an akshara.
 */
const isMark = (cp: number): boolean =>
  (cp >= 0x0300 && cp <= 0x036f) ||
  cp === 0x200c ||
  cp === 0x200d ||
  // Devanagari: candrabindu..visarga, nukta, vowel signs, virama, stress, vowel signs L/LL.
  (cp >= 0x0900 && cp <= 0x0903) ||
  cp === 0x093a ||
  cp === 0x093b ||
  cp === 0x093c ||
  (cp >= 0x093e && cp <= 0x094f) ||
  (cp >= 0x0951 && cp <= 0x0957) ||
  (cp >= 0x0962 && cp <= 0x0963) ||
  // Odia: candrabindu..visarga, nukta, vowel signs, virama, length marks.
  (cp >= 0x0b01 && cp <= 0x0b03) ||
  cp === 0x0b3c ||
  (cp >= 0x0b3e && cp <= 0x0b4d) ||
  (cp >= 0x0b55 && cp <= 0x0b57) ||
  (cp >= 0x0b62 && cp <= 0x0b63);

/** The first user-perceived letter of a name, as an Indic reader would write it. */
export function initialOf(name: string): string {
  const cps = [...name.trim()].map((c) => c.codePointAt(0) as number);
  if (cps.length === 0) return '';
  let i = 0;
  // Skip anything that cannot start a letter (a stray mark from a bad paste).
  while (i < cps.length && isMark(cps[i] as number)) i += 1;
  if (i >= cps.length) return '';
  const out = [cps[i] as number];
  i += 1;
  while (i < cps.length) {
    const cp = cps[i] as number;
    if (isMark(cp)) {
      out.push(cp);
      i += 1;
      // A virama joins the NEXT consonant into this akshara.
      if (VIRAMA.has(cp) && i < cps.length && !isMark(cps[i] as number)) {
        out.push(cps[i] as number);
        i += 1;
      }
      continue;
    }
    break;
  }
  const letter = String.fromCodePoint(...out);
  // Latin initials read as capitals; Indic scripts have no case and are unchanged.
  return letter.toUpperCase();
}

const PAIRS = [
  ['tintSale', 'inkSale'],
  ['tintUdhar', 'inkUdhar'],
  ['tintCollect', 'inkCollect'],
  ['tintExpense', 'inkExpense'],
  ['tintMore', 'inkMore'],
] as const;

/** FNV-1a over the id's UTF-16 units: stable across runs, platforms and sort orders. */
export function avatarPairOf(partyId: string): (typeof PAIRS)[number] {
  let h = 0x811c9dc5;
  for (let i = 0; i < partyId.length; i += 1) {
    h ^= partyId.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return PAIRS[h % PAIRS.length] as (typeof PAIRS)[number];
}

export function Avatar({
  testID,
  partyId,
  name,
  display = 'comfort',
}: {
  readonly testID?: string;
  readonly partyId: string;
  readonly name: string;
  readonly display?: DisplayMode;
}) {
  const t = tokens(display);
  const initial = initialOf(name);
  const [tint, ink] = initial === '' ? (['tintMore', 'inkMore'] as const) : avatarPairOf(partyId);
  return (
    <View
      testID={testID}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        // min, not fixed: a fixed-height box around a letter is what
        // usability-wrap refuses. The letter never scales, so it is exactly this.
        minWidth: t.disc.md,
        minHeight: t.disc.md,
        borderRadius: t.radius.pill,
        backgroundColor: t.color[tint],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {initial === '' ? (
        <Icon name="user" size="md" color="inkMore" display={display} />
      ) : (
        <Text
          /*
           * Capped at 1x: the disc is a fixed size, and a letter grown out of it
           * by the system setting would be clipped. It is decorative and hidden;
           * the name beside it is the text that grows.
           */
          maxFontSizeMultiplier={1}
          style={{
            fontFamily: t.font.bold,
            fontSize: tokens(display, 'normal').type.lead,
            lineHeight: t.disc.md,
            color: t.color[ink],
            textAlign: 'center',
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}
