/**
 * C.2 / DC-004 - the bundled Odia font, made executable.
 *
 * Odia is the PRIMARY language and a budget Android handset may ship no Odia font at
 * all. The failure is tofu: empty boxes where the app's main language should be. It is
 * invisible on an emulator, because an AVD system image carries a full font set - so
 * the development environment is strictly more capable than the target, which is how
 * this ships.
 *
 * Bundling the font removes the dependency on the OS. But a bundled font that does not
 * cover every character we actually render is the same defect with an extra step, so
 * this parses the TTF and checks coverage against the real strings.
 *
 * WHAT THIS PROVES (mechanically, here, on any machine):
 *   - the font file is present, parses as a TrueType font, and matches a recorded hash
 *   - every character in every Odia string we ship maps to a NON-ZERO glyph id
 *     (a cmap entry pointing at glyph 0 IS .notdef - that is tofu with a mapping)
 *   - the Latin-and-rupee set renders too, because constraint 8 puts Latin numerals
 *     inside Odia screens, and a rupee amount in an Odia font that lacks U+20B9 is
 *     tofu in the one place it must never be
 *   - the font carries GSUB coverage for the Odia shaping script, without which
 *     conjuncts render as dotted circles rather than letters
 *   - the family name Android will resolve, and the variable default instance
 *
 * WHAT THIS CANNOT PROVE: that a real handset draws them. That is H8 and
 * DEVICE-CHECKLIST.md, and it is why DC-004 stays MEDIUM.
 */
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const FONT = 'apps/mobile/assets/fonts/AnekOdia.ttf';
const EXPECTED_SHA256 = '673bb6e51b71af1de1f11f9a547a3a58c50a6fa32d480958e1ef0f06980ca45f';
const APK_BUDGET_BYTES = 25 * 1024 * 1024; // B24

/**
 * Constraint 8: Latin numerals ALWAYS, in every language. These characters appear
 * inside Odia screens and therefore inside runs drawn with the Odia font.
 */
const ALWAYS_RENDERED = [...'0123456789', ...' ,.-:/()%+', '₹'];

/* ---- minimal TrueType reader ------------------------------------------- */
let buf;
try {
  buf = readFileSync(FONT);
} catch {
  console.error(`x    font not found: ${FONT}`);
  console.error('     DC-004 says bundle it rather than trusting the OS to have one.');
  process.exit(1);
}

const u16 = (o) => buf.readUInt16BE(o);
const i16 = (o) => buf.readInt16BE(o);
const u32 = (o) => buf.readUInt32BE(o);

const tables = new Map();
{
  const numTables = u16(4);
  for (let i = 0; i < numTables; i += 1) {
    const rec = 12 + i * 16;
    tables.set(buf.toString('latin1', rec, rec + 4), { off: u32(rec + 8), len: u32(rec + 12) });
  }
}
function table(tag) {
  const t = tables.get(tag);
  if (!t) {
    console.error(`x    ${FONT} has no ${tag} table - this is not a usable font file`);
    process.exit(1);
  }
  return t;
}

/* ---- cmap: codepoint -> glyph id ---------------------------------------- */
function readCmap() {
  const { off } = table('cmap');
  const n = u16(off + 2);
  let best = null; // prefer format 12 (full Unicode) over format 4 (BMP only)
  for (let i = 0; i < n; i += 1) {
    const rec = off + 4 + i * 8;
    const platform = u16(rec);
    const encoding = u16(rec + 2);
    const sub = off + u32(rec + 4);
    const format = u16(sub);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!unicode) continue;
    if (format === 12 && (!best || best.format !== 12)) best = { sub, format };
    else if (format === 4 && !best) best = { sub, format };
  }
  if (!best) {
    console.error('x    no Unicode cmap subtable (format 4 or 12) in the font');
    process.exit(1);
  }

  const map = new Map();
  if (best.format === 4) {
    const s = best.sub;
    const segX2 = u16(s + 6);
    const seg = segX2 / 2;
    const ends = s + 14;
    const starts = ends + segX2 + 2;
    const deltas = starts + segX2;
    const ranges = deltas + segX2;
    for (let i = 0; i < seg; i += 1) {
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
    const groups = u32(s + 12);
    for (let i = 0; i < groups; i += 1) {
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

/* ---- name table: the family Android resolves ---------------------------- */
function readNames() {
  const { off } = table('name');
  const count = u16(off + 2);
  const strOff = off + u16(off + 4);
  const pick = {};
  for (let i = 0; i < count; i += 1) {
    const rec = off + 6 + i * 12;
    if (u16(rec) !== 3 || u16(rec + 2) !== 1) continue; // Windows / UTF-16BE
    const nameId = u16(rec + 6);
    const len = u16(rec + 8);
    const o = strOff + u16(rec + 10);
    const chars = [];
    for (let k = 0; k + 1 < len; k += 2) chars.push(String.fromCharCode(u16(o + k)));
    if (pick[nameId] === undefined) pick[nameId] = chars.join('');
  }
  return { family: pick[1], version: pick[5], postScript: pick[6] };
}

/* ---- fvar: what a device that sets no variation actually draws ---------- */
function readAxes() {
  const t = tables.get('fvar');
  if (!t) return null;
  const off = t.off;
  const axesOff = off + u16(off + 4);
  const axisCount = u16(off + 8);
  const axisSize = u16(off + 10);
  const out = [];
  for (let i = 0; i < axisCount; i += 1) {
    const a = axesOff + i * axisSize;
    out.push({
      tag: buf.toString('latin1', a, a + 4),
      min: u32(a + 4) / 65536,
      def: u32(a + 8) / 65536,
      max: u32(a + 12) / 65536,
    });
  }
  return out;
}

/* ---- GSUB: will the shaper form conjuncts? ------------------------------ */
function readGsubScripts() {
  const t = tables.get('GSUB');
  if (!t) return null;
  const listOff = t.off + u16(t.off + 4);
  const count = u16(listOff);
  const tags = [];
  for (let i = 0; i < count; i += 1) {
    const rec = listOff + 2 + i * 6;
    tags.push(buf.toString('latin1', rec, rec + 4));
  }
  return tags;
}

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

/* ---- run ---------------------------------------------------------------- */
const sources = odiaStrings();
if (sources.length === 0) {
  // A coverage check that found nothing to cover would pass forever while proving
  // nothing. That is the assertPaise-at-0/59 failure mode; refuse it outright.
  console.error('x    found ZERO Odia strings to check. A check with an empty corpus');
  console.error('     passes vacuously and is worse than no check at all.');
  process.exit(1);
}

const { map, format } = readCmap();
const { family, version, postScript } = readNames();
const axes = readAxes();
const scripts = readGsubScripts();
const bytes = statSync(FONT).size;
const sha = createHash('sha256').update(buf).digest('hex');

const required = new Map(); // codepoint -> where it is rendered
for (const s of sources) {
  for (const ch of s.text) {
    const cp = ch.codePointAt(0);
    if (cp < 0x20) continue;
    if (!required.has(cp)) required.set(cp, s.where);
  }
}
for (const ch of ALWAYS_RENDERED) {
  const cp = ch.codePointAt(0);
  if (!required.has(cp)) required.set(cp, 'constraint 8 / money');
}

const hex = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
const inOdiaBlock = (c) => c >= 0x0b00 && c <= 0x0b7f;
const missing = [...required].filter(([cp]) => !map.has(cp));
const outside = [...required.keys()].filter((c) => c > 0x7f && !inOdiaBlock(c));

console.log(`  font               : ${FONT}`);
console.log(`  family (Android)   : ${family}  ·  postscript ${postScript}`);
console.log(`  version            : ${version}`);
console.log(
  `  size               : ${bytes} bytes · ` +
    `${((bytes / APK_BUDGET_BYTES) * 100).toFixed(2)}% of the B24 25 MB budget`,
);
console.log(`  sha256             : ${sha}`);
console.log(`  cmap format        : ${format} · ${map.size} codepoints with a non-zero glyph`);
if (axes) {
  console.log(
    `  variable axes      : ${axes.map((a) => `${a.tag} ${a.min}-${a.max} def ${a.def}`).join(' · ')}`,
  );
  console.log('                       a device that sets no variation draws the DEFAULT instance');
  const wght = axes.find((a) => a.tag === 'wght');
  if (wght && wght.def !== 400) {
    // Measured, not assumed: this family's default instance is not Regular. Text with
    // no explicit weight comes out heavier than a designer working from a Regular
    // specimen expects - everywhere - and nothing in the file name says so.
    console.log(
      `  NOTE               : default weight is ${wght.def}, NOT 400. Unstyled text ` +
        `renders at ${wght.def}.`,
    );
  }
}
console.log(`  GSUB scripts       : ${scripts ? scripts.join(' ') : 'NONE'}`);
console.log(`  odia strings       : ${sources.length}`);
console.log(
  `  codepoints required: ${required.size} · ` +
    `${[...required.keys()].filter(inOdiaBlock).length} inside the Odia block`,
);
console.log(`  required OUTSIDE the Odia block: ${outside.map(hex).join(' ') || 'none'}`);

const failures = [];

if (sha !== EXPECTED_SHA256) {
  failures.push(
    `the font file changed. Recorded ${EXPECTED_SHA256.slice(0, 16)}..., found ` +
      `${sha.slice(0, 16)}.... A font swapped without re-running this check is an ` +
      'unreviewed change to what the primary language looks like.',
  );
}

for (const [cp, where] of missing) {
  failures.push(
    `${hex(cp)} has no glyph in the bundled font, and it is rendered by ${where}. ` +
      'On a device with no system fallback that is an empty box.',
  );
}

// Odia is a complex script: base letters alone do not render it.
if (!scripts || !scripts.some((s) => s === 'ory2' || s === 'orya')) {
  failures.push(
    'the font declares no Odia GSUB script (looked for ory2/orya, found ' +
      `${scripts ? scripts.join(' ') : 'no GSUB table'}). Without it the shaper cannot ` +
      'form conjuncts and text renders as letters plus dotted circles.',
  );
}

if (bytes > APK_BUDGET_BYTES) {
  failures.push('the font alone exceeds the B24 APK budget.');
}

if (failures.length) {
  console.error(`\nFONT COVERAGE FAILURES (${failures.length}):`);
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}
console.log('\nfont coverage: every character in every Odia string has a real glyph');
