/**
 * C.2, C.3 and C.4 - the bundled fonts, made executable.
 *
 * C.2 · Odia is the PRIMARY language and a budget Android handset may ship no Odia
 *       font at all. The failure is tofu: empty boxes where the app's main language
 *       should be, invisible on an emulator because an AVD system image carries a
 *       full font set. The development environment is strictly more capable than the
 *       target, which is how this class of defect ships.
 *
 * C.3 · Anek is a variable font, and core React Native on Android cannot select a
 *       variation axis - you get the file's DEFAULT instance and nothing else. We
 *       ship static instances instead (AD-016), so this checks all three of them.
 *
 * C.4 · Tabular figures must be PROVEN, not assumed. Constraint 8 requires money
 *       columns to align. Rather than render two strings and compare pixel widths,
 *       this reads the advance width of each digit straight out of `hmtx`, and where
 *       the defaults are proportional it resolves the `tnum` GSUB feature and measures
 *       again. MEASURED RESULT: Anek Odia's default digits are PROPORTIONAL in all
 *       three weights - "1" is about 60% the width of "0" - and `tnum` collapses them
 *       to one width. So the capability exists and the default is wrong, which is the
 *       worst combination, because it looks correct in a specimen and misaligns in a
 *       column.
 *
 * WHAT THIS PROVES, on any machine, for every bundled weight:
 *   - the file is present, parses, and matches a recorded sha256
 *   - every character in every Odia string we ship maps to a NON-ZERO glyph id
 *     (a cmap entry pointing at glyph 0 IS .notdef - tofu with a mapping)
 *   - the Latin-and-rupee set renders too, because constraint 8 puts Latin numerals
 *     inside Odia screens, and a rupee amount in a font lacking U+20B9 is tofu in the
 *     one place it must never be
 *   - the `ory2` GSUB script is present, without which the shaper cannot form Odia
 *     conjuncts and text renders as letters plus dotted circles
 *   - all ten digits share one advance width, by default or via `tnum`
 *   - the weights agree with each other, so nothing is tofu in bold alone
 *
 * WHAT IT CANNOT PROVE: that a device draws them. A font that covers everything still
 * draws nothing if the asset pipeline drops it. That is H8 and DEVICE-CHECKLIST.md
 * A1-A6, and it is why DC-004 stays MEDIUM.
 *
 * THIS CHECK HAS ALREADY EARNED ITS KEEP. The first candidate static instances - the
 * ones Google Fonts serves by default - were 42 KB each against the variable font's
 * 858 KB, an apparent 85% saving. They contained ZERO Odia glyphs: the v1 API subsets
 * to Latin unless asked otherwise. Shipping them would have produced complete tofu in
 * the primary language while looking like a clever optimisation.
 */
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'apps/mobile/assets/fonts';
const FONTS = [
  { file: 'AnekOdia-Regular.ttf', weight: 400 },
  { file: 'AnekOdia-Medium.ttf', weight: 500 },
  { file: 'AnekOdia-Bold.ttf', weight: 700 },
];
/** Pinned so a font cannot be swapped without this check being re-run. */
const SHA = {
  'AnekOdia-Regular.ttf': '8f3149a5fe2621baaaed5dd9173a44fb724fe5071c087e0893d5cc9813f5358c',
  'AnekOdia-Medium.ttf': '0a8190cd288d9caeca7bd5c20226a7f2641b2f436b19d6b5a205aca4f8285ebb',
  'AnekOdia-Bold.ttf': '4787b60dd0b162e43f7283356d7d5fe7106c04785efff7632b76a5131a81eaae',
};
const APK_BUDGET_BYTES = 25 * 1024 * 1024; // B24

/**
 * Constraint 8: Latin numerals ALWAYS, in every language. These characters appear
 * inside Odia screens and therefore inside runs drawn with the Odia font.
 */
const ALWAYS_RENDERED = [...'0123456789', ...' ,.-:/()%+', '₹'];
const DIGITS = [...'0123456789'];

/* ---- the Odia strings we actually ship ---------------------------------- */
function odiaStrings() {
  const src = readFileSync('apps/api/src/sms/templates.ts', 'utf8').split('\r\n').join('\n');
  const out = [];
  let id = null;
  for (const line of src.split('\n')) {
    const k = /^\s{2}([a-z0-9_]+):\s*\{\s*$/.exec(line);
    if (k) {
      id = k[1];
      continue;
    }
    const m = /^\s+od:\s*'(.+)',\s*$/.exec(line);
    if (m && id) out.push({ where: `sms:${id}/od`, text: m[1].split('{#var#}').join('') });
  }
  return out;
}

/* ---- a minimal TrueType reader, one instance per file ------------------- */
function openFont(path) {
  const buf = readFileSync(path);
  const u16 = (o) => buf.readUInt16BE(o);
  const i16 = (o) => buf.readInt16BE(o);
  const u32 = (o) => buf.readUInt32BE(o);

  const tables = new Map();
  for (let i = 0; i < u16(4); i += 1) {
    const rec = 12 + i * 16;
    tables.set(buf.toString('latin1', rec, rec + 4), { off: u32(rec + 8), len: u32(rec + 12) });
  }
  const need = (tag) => {
    const t = tables.get(tag);
    if (!t) throw new Error(`${path} has no ${tag} table - not a usable font file`);
    return t;
  };

  /* cmap: codepoint -> glyph id, format 12 preferred over format 4 */
  function cmap() {
    const { off } = need('cmap');
    let best = null;
    for (let i = 0; i < u16(off + 2); i += 1) {
      const rec = off + 4 + i * 8;
      const p = u16(rec);
      const e = u16(rec + 2);
      const sub = off + u32(rec + 4);
      const format = u16(sub);
      if (!(p === 0 || (p === 3 && (e === 1 || e === 10)))) continue;
      if (format === 12 && (!best || best.format !== 12)) best = { sub, format };
      else if (format === 4 && !best) best = { sub, format };
    }
    if (!best) throw new Error(`${path}: no Unicode cmap subtable`);

    const map = new Map();
    if (best.format === 4) {
      const s = best.sub;
      const segX2 = u16(s + 6);
      const ends = s + 14;
      const starts = ends + segX2 + 2;
      const deltas = starts + segX2;
      const ranges = deltas + segX2;
      for (let i = 0; i < segX2 / 2; i += 1) {
        const end = u16(ends + i * 2);
        const start = u16(starts + i * 2);
        const delta = i16(deltas + i * 2);
        const rangeOff = u16(ranges + i * 2);
        if (start === 0xffff) continue;
        for (let c = start; c <= end; c += 1) {
          let g;
          if (rangeOff === 0) {
            g = (c + delta) & 0xffff;
          } else {
            const gi = ranges + i * 2 + rangeOff + (c - start) * 2;
            if (gi + 1 >= buf.length) continue;
            g = u16(gi);
            if (g !== 0) g = (g + delta) & 0xffff;
          }
          // glyph 0 IS .notdef - a mapping to it is a mapping to tofu, not coverage.
          if (g !== 0) map.set(c, g);
        }
      }
    } else {
      const s = best.sub;
      for (let i = 0; i < u32(s + 12); i += 1) {
        const g = s + 16 + i * 12;
        const start = u32(g);
        const end = u32(g + 4);
        const startGid = u32(g + 8);
        for (let c = start; c <= end; c += 1) {
          const gid = startGid + (c - start);
          if (gid !== 0) map.set(c, gid);
        }
      }
    }
    return { map, format: best.format };
  }

  /* hmtx: the advance width of one glyph, in font units */
  function advanceWidth(gid) {
    const numH = u16(need('hhea').off + 34);
    const { off } = need('hmtx');
    // Glyphs past numberOfHMetrics all share the LAST advance width, by spec.
    const i = Math.min(gid, numH - 1);
    return u16(off + i * 4);
  }
  const unitsPerEm = () => u16(need('head').off + 18);

  function names() {
    const { off } = need('name');
    const strOff = off + u16(off + 4);
    const pick = {};
    for (let i = 0; i < u16(off + 2); i += 1) {
      const rec = off + 6 + i * 12;
      if (u16(rec) !== 3 || u16(rec + 2) !== 1) continue; // Windows / UTF-16BE
      const nameId = u16(rec + 6);
      const len = u16(rec + 8);
      const o = strOff + u16(rec + 10);
      const chars = [];
      for (let k = 0; k + 1 < len; k += 2) chars.push(String.fromCharCode(u16(o + k)));
      if (pick[nameId] === undefined) pick[nameId] = chars.join('');
    }
    return { family: pick[1], subfamily: pick[2], version: pick[5], postScript: pick[6] };
  }

  function gsubScripts() {
    const t = tables.get('GSUB');
    if (!t) return null;
    const listOff = t.off + u16(t.off + 4);
    const tags = [];
    for (let i = 0; i < u16(listOff); i += 1) {
      const rec = listOff + 2 + i * 6;
      tags.push(buf.toString('latin1', rec, rec + 4));
    }
    return tags;
  }

  /**
   * Resolve one GSUB feature's single-substitution lookups into a glyph -> glyph map.
   *
   * Only lookup type 1 is handled, and that is deliberate rather than lazy: figure-set
   * features (`tnum`, `lnum`, `onum`) are single substitutions by construction - one
   * digit for one digit. If a font expressed `tnum` as anything else, this returns an
   * empty map and the caller reports the digits as un-fixable rather than silently
   * claiming they are tabular.
   */
  function featureSubstitutions(tag) {
    const t = tables.get('GSUB');
    if (!t) return new Map();
    const featureList = t.off + u16(t.off + 6);
    const lookupList = t.off + u16(t.off + 8);

    const lookupIndices = [];
    for (let i = 0; i < u16(featureList); i += 1) {
      const rec = featureList + 2 + i * 6;
      if (buf.toString('latin1', rec, rec + 4) !== tag) continue;
      const feature = featureList + u16(rec + 4);
      for (let k = 0; k < u16(feature + 2); k += 1) lookupIndices.push(u16(feature + 4 + k * 2));
    }

    const coverage = (off) => {
      const out = new Map(); // glyph -> coverage index
      if (u16(off) === 1) {
        for (let i = 0; i < u16(off + 2); i += 1) out.set(u16(off + 4 + i * 2), i);
      } else {
        for (let i = 0; i < u16(off + 2); i += 1) {
          const r = off + 4 + i * 6;
          const start = u16(r);
          const end = u16(r + 2);
          const startIndex = u16(r + 4);
          for (let g = start; g <= end; g += 1) out.set(g, startIndex + (g - start));
        }
      }
      return out;
    };

    const subs = new Map();
    for (const li of lookupIndices) {
      const lookup = lookupList + u16(lookupList + 2 + li * 2);
      if (u16(lookup) !== 1) continue; // not a single substitution
      for (let s = 0; s < u16(lookup + 4); s += 1) {
        const st = lookup + u16(lookup + 6 + s * 2);
        const cov = coverage(st + u16(st + 2));
        if (u16(st) === 1) {
          const delta = i16(st + 4);
          for (const [g] of cov) subs.set(g, (g + delta) & 0xffff);
        } else {
          for (const [g, ix] of cov) subs.set(g, u16(st + 6 + ix * 2));
        }
      }
    }
    return subs;
  }

  return {
    path,
    bytes: statSync(path).size,
    sha: createHash('sha256').update(buf).digest('hex'),
    isVariable: tables.has('fvar'),
    ...cmap(),
    ...names(),
    scripts: gsubScripts(),
    advanceWidth,
    featureSubstitutions,
    unitsPerEm: unitsPerEm(),
  };
}

/* ---- run ---------------------------------------------------------------- */
const sources = odiaStrings();
if (sources.length === 0) {
  // A coverage check that found nothing to cover would pass forever while proving
  // nothing. That is the assertPaise-at-0/59 failure mode; refuse it outright.
  console.error('x    found ZERO Odia strings to check. A check with an empty corpus');
  console.error('     passes vacuously and is worse than no check at all.');
  process.exit(1);
}

const required = new Map(); // codepoint -> where it is rendered
for (const s of sources) {
  for (const ch of s.text) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x20 && !required.has(cp)) required.set(cp, s.where);
  }
}
for (const ch of ALWAYS_RENDERED) {
  const cp = ch.codePointAt(0);
  if (!required.has(cp)) required.set(cp, 'constraint 8 / money');
}

const hex = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
const inOdiaBlock = (c) => c >= 0x0b00 && c <= 0x0b7f;
const failures = [];
const loaded = [];

for (const spec of FONTS) {
  const path = `${DIR}/${spec.file}`;
  let f;
  try {
    f = openFont(path);
  } catch (e) {
    failures.push(`${spec.file}: ${e.message}`);
    continue;
  }
  f.spec = spec;
  loaded.push(f);

  const expected = SHA[spec.file];
  if (expected !== f.sha) {
    failures.push(
      `${spec.file} does not match its recorded sha256 (expected ${String(expected).slice(0, 16)}..., ` +
        `found ${f.sha.slice(0, 16)}...). A font swapped without re-running this check is ` +
        'an unreviewed change to what the primary language looks like.',
    );
  }

  for (const [cp, where] of required) {
    if (!f.map.has(cp)) {
      failures.push(
        `${spec.file}: ${hex(cp)} has no glyph, and it is rendered by ${where}. ` +
          'On a device with no system fallback that is an empty box.',
      );
    }
  }

  if (!f.scripts || !f.scripts.some((s) => s === 'ory2' || s === 'orya')) {
    failures.push(
      `${spec.file} declares no Odia GSUB script (looked for ory2/orya, found ` +
        `${f.scripts ? f.scripts.join(' ') : 'no GSUB table'}). Without it the shaper ` +
        'cannot form conjuncts and text renders as letters plus dotted circles.',
    );
  }

  // C.3: a variable font here would mean core RN gets one weight, not this one.
  if (f.isVariable) {
    failures.push(
      `${spec.file} is a VARIABLE font (it has an fvar table). Core React Native on ` +
        'Android cannot select a variation axis, so every weight would render as the ' +
        "file's default instance. AD-016 ships static instances for this reason.",
    );
  }

  /**
   * C.4 · tabular figures, proven from `hmtx` rather than assumed from a font name.
   *
   * Measured, and it is NOT good news: Anek Odia's default digits are proportional -
   * "1" is roughly 60% the width of "0". A money column set in the default figures
   * does not align, and no amount of layout code fixes it.
   *
   * The font does carry a `tnum` feature, and resolving it collapses all ten digits
   * to a single width. So the capability is there and the DEFAULT is wrong, which is
   * the worst combination: it works in a specimen, it works wherever the feature
   * happens to be applied, and it silently misaligns everywhere else.
   */
  const gids = DIGITS.map((d) => f.map.get(d.codePointAt(0)));
  const defaultWidths = gids.map(f.advanceWidth);
  const tnum = f.featureSubstitutions('tnum');
  const tabularWidths = gids.map((g) => f.advanceWidth(tnum.has(g) ? tnum.get(g) : g));

  f.digitWidths = tabularWidths;
  f.tabularByDefault = new Set(defaultWidths).size === 1;
  f.tabularWithFeature = new Set(tabularWidths).size === 1;
  f.needsTnum = !f.tabularByDefault && f.tabularWithFeature;

  if (!f.tabularByDefault && !f.tabularWithFeature) {
    failures.push(
      `${spec.file}: the ten digits have ${new Set(defaultWidths).size} different advance ` +
        `widths by default (${[...new Set(defaultWidths)].join(', ')} units at ` +
        `${f.unitsPerEm}/em), and \`tnum\` does not fix it ` +
        `(${new Set(tabularWidths).size} widths after substitution). Constraint 8 requires ` +
        'money columns to align, and this font build cannot deliver it. A different ' +
        'build is needed, and G14 is far too late to find that out.',
    );
  }
}

/* The weights must agree with each other, or something is tofu in bold alone. */
if (loaded.length > 1) {
  const base = loaded[0];
  for (const f of loaded.slice(1)) {
    const onlyInBase = [...base.map.keys()].filter((c) => !f.map.has(c));
    const onlyInOther = [...f.map.keys()].filter((c) => !base.map.has(c));
    if (onlyInBase.length || onlyInOther.length) {
      failures.push(
        `${f.spec.file} and ${base.spec.file} do not cover the same characters ` +
          `(${onlyInBase.length} only in ${base.spec.file}, ${onlyInOther.length} only in ` +
          `${f.spec.file}). A character present in one weight and missing from another is ` +
          'tofu that appears only when text is emphasised.',
      );
    }
    // Weights legitimately differ in digit width, so that is not a failure - but a
    // column that MIXES weights would still misalign, which is a design constraint
    // rather than a font defect. Recorded, not enforced here.
    f.widthDiffersFromBase = base.digitWidths[0] !== f.digitWidths[0];
  }
}

/* ---- report ------------------------------------------------------------- */
const total = loaded.reduce((a, f) => a + f.bytes, 0);
console.log(`  odia strings       : ${sources.length}`);
console.log(
  `  codepoints required: ${required.size} · ` +
    `${[...required.keys()].filter(inOdiaBlock).length} inside the Odia block`,
);
console.log(
  `  required OUTSIDE the Odia block: ` +
    `${[...required.keys()].filter((c) => c > 0x7f && !inOdiaBlock(c)).map(hex).join(' ') || 'none'}`,
);
console.log('');
for (const f of loaded) {
  console.log(
    `  ${f.spec.file.padEnd(22)} ${String(f.bytes).padStart(7)} B · ` +
      `${String(f.map.size).padStart(4)} cp · ` +
      `${String([...f.map.keys()].filter(inOdiaBlock).length).padStart(3)} odia · ` +
      `digits ${
        f.tabularByDefault
          ? `tabular @ ${f.digitWidths[0]}`
          : `PROPORTIONAL, tabular @ ${f.digitWidths[0]} only via tnum`
      }`,
  );
}

const needTnum = loaded.filter((f) => f.needsTnum);
if (needTnum.length) {
  console.log(
    `\n  C.4 · ${needTnum.length} of ${loaded.length} weights have PROPORTIONAL digits by ` +
      'default.\n' +
      '        `tnum` is present and resolves all ten to one width, so the capability\n' +
      '        exists - but it is OFF unless the money style asks for it. Every money\n' +
      "        style MUST set fontVariant: ['tabular-nums'].\n" +
      '        Owed at G10: a check-governance rule that the money style sets it, and a\n' +
      '        render test. Owed at H8: DEVICE-CHECKLIST B4, because React Native\n' +
      '        fontVariant support on Android is the part no static check can settle.',
  );
}
console.log(
  `\n  bundled total      : ${total} bytes · ` +
    `${((total / APK_BUDGET_BYTES) * 100).toFixed(2)}% of the B24 25 MB budget`,
);

if (total > APK_BUDGET_BYTES) failures.push('the fonts alone exceed the B24 APK budget.');

if (failures.length) {
  console.error(`\nFONT FAILURES (${failures.length}):`);
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}
console.log(
  `\nfonts: every character has a real glyph in every weight; digits are tabular ${
    loaded.every((f) => f.tabularByDefault) ? 'by default' : 'ONLY with tnum applied'
  }`,
);
