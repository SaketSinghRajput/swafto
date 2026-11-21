/**
 * THE SHIPPED FONTS, AS THE BROWSER INSTRUMENTS LOAD THEM - AND PROOF THAT THEY DID.
 *
 * WHY THIS FILE EXISTS: A MEASURING INSTRUMENT THAT MEASURED THE WRONG TYPEFACE.
 *
 * `check:layout` and the contact sheet used to declare each font as
 * `src: url("file:///.../AnekOdia-Regular.ttf")`. `check:layout` hands its page
 * to Chromium through `setContent`, whose document is `about:blank`, and Chromium
 * refuses a `file://` subresource from it ("Not allowed to load local resource").
 * Nothing threw. `document.fonts.ready` resolved - there was nothing left to wait
 * for - and every OS measured its OWN fallback: FreeSerif for Odia in the Linux
 * container, Nirmala UI on Windows. The two CI hosts disagreed about which
 * screens overflowed, and neither was measuring the font the phone draws. When
 * the real fonts went in, 43 overflows appeared on Windows and 45 on Linux.
 *
 * So the fonts are now inlined as `data:` URLs, which no origin policy refuses,
 * and `assertFontsLoaded` makes the quiet version of this failure impossible: it
 * forces every declared face to load and then requires `FontFace.status ===
 * 'loaded'` for each, plus `document.fonts.check` for every family-and-weight a
 * rendered element actually asks for. A face that errors, a family a style names
 * that was never declared, or a declaration that silently never fetched, each
 * fails the run instead of measuring a fallback.
 *
 * The families are declared under the exact names the tokens use
 * (`t.font.regular|medium|bold|icons`). A near-miss would fall back to a system
 * font that, on a machine with an Odia font installed, looks fine and proves
 * nothing.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export const FONT_DIR = resolve('apps/mobile/assets/fonts');

// SwaftoIcons: the icon font (M3). Unloaded, every icon measures as an empty box.
export const FONTS = ['AnekOdia-Regular', 'AnekOdia-Medium', 'AnekOdia-Bold', 'SwaftoIcons'];

const fileOf = (family) => join(FONT_DIR, family + '.ttf');

/** The whole file, inlined. A `data:` URL is refused by no origin policy. */
const dataUrl = (file) => 'data:font/ttf;base64,' + readFileSync(file).toString('base64');

/** A URL relative to the directory the HTML is written in, with forward slashes. */
const relUrl = (dir, file) => relative(resolve(dir), file).split(sep).join('/');

/**
 * `fontFaces()` inlines every face as a data: URL - for check:layout, whose
 * page is setContent'd and written nowhere.
 *
 * `fontFaces({ relativeTo: dir })` instead points at the shipped files by a
 * URL relative to `dir` - for the contact sheet, whose HTML is TRACKED. Inlined
 * there it added ~1MB of base64 to every panel, and a random `AKIA...` run inside
 * it tripped check:secrets (2026-11-20). A relative URL from a file:// page to a
 * file:// font is same-directory-tree, which Chromium loads; the screenshot step
 * proves it with `assertFontsLoaded` before every shot rather than assuming it.
 */
export function fontFaces({ relativeTo } = {}) {
  const missing = FONTS.filter((family) => !existsSync(fileOf(family)));
  if (missing.length) {
    throw new Error(
      'cannot render without the shipped font files, and these are absent: ' +
        missing.map(fileOf).join(', ') +
        '. A fallback system font would be measured in their place.',
    );
  }
  return FONTS.map((family) => {
    const file = fileOf(family);
    return (
      '@font-face { font-family: "' +
      family +
      '"; src: url("' + (relativeTo === undefined ? dataUrl(file) : relUrl(relativeTo, file)) + '") format("truetype"); font-display: block; }'
    );
  }).join('\n');
}

/**
 * Runs INSIDE the browser. Loads every declared face, then reports what is not
 * loaded and which family/weight a rendered element asks for that the page
 * cannot draw from a shipped face.
 */
async function probeFonts(families) {
  const quote = (f) => '"' + f + '"';
  await Promise.allSettled(families.map((f) => document.fonts.load('16px ' + quote(f))));
  await document.fonts.ready;

  const faces = [...document.fonts].map((f) => ({
    family: f.family.replace(/^["']|["']$/g, ''),
    status: f.status,
  }));
  const problems = [];
  for (const family of families) {
    const mine = faces.filter((f) => f.family === family);
    if (mine.length === 0) problems.push(family + ': no @font-face was declared for it');
    for (const f of mine) {
      if (f.status !== 'loaded') problems.push(family + ': FontFace.status is "' + f.status + '"');
    }
  }

  // Every family-and-weight a rendered element asks for, where the first family
  // it names is one of ours, must be drawable from a loaded shipped face.
  const inUse = new Set();
  for (const el of document.querySelectorAll('#root *')) {
    if (!(el.textContent || '').trim()) continue;
    const cs = getComputedStyle(el);
    const first = cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
    if (!families.includes(first)) continue;
    inUse.add(cs.fontStyle + ' ' + cs.fontWeight + ' 16px ' + quote(first));
  }
  for (const spec of inUse) {
    if (!document.fonts.check(spec)) problems.push(spec + ': document.fonts.check is false');
  }
  return { problems, inUse: [...inUse] };
}

/**
 * Throws, naming every face that did not load. Returns the family/weight
 * combinations that were in use on the page, so a caller can show its work.
 */
export async function assertFontsLoaded(page, where) {
  const { problems, inUse } = await page.evaluate(probeFonts, FONTS);
  if (problems.length) {
    throw new Error(
      'SHIPPED FONTS NOT LOADED in ' +
        where +
        ' - anything measured or shot here would be a fallback typeface:\n  ' +
        problems.join('\n  ') +
        '\n  (fonts are read from ' +
        pathToFileURL(FONT_DIR).href +
        ')',
    );
  }
  return inUse;
}
