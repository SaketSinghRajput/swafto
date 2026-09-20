/**
 * THE CONTACT SHEET - the first artifact in this build a human can judge by looking.
 *
 * BUILD_STATE item 7 asked for this immediately, "even if it is one screen and
 * wrong", for one reason: the Odia rendering question cannot be answered by any
 * test in this repository. Whether Anek Odia forms its conjuncts correctly, whether
 * a long Odia party name wraps where it should, and whether the digits line up in a
 * column are all answered by a person looking at a picture.
 *
 * WHAT THIS IS, PRECISELY, SO NOBODY OVER-READS IT.
 *
 * The panels are the REAL screen components and the REAL fixtures, laid out by
 * react-native-web in a headless Chromium at a budget-handset viewport, with the
 * SHIPPED Anek Odia files loaded by @font-face. That makes it a faithful answer to
 * the questions above, because Chromium and Android both shape Indic text with
 * HarfBuzz and both resolve `tnum` through the same OpenType feature.
 *
 * IT IS NOT AN ANDROID SCREENSHOT AND MUST NOT BE READ AS ONE. react-native-web
 * maps RN styles to CSS flexbox; the mapping is very close but it is a mapping.
 * Pixel spacing, the text baseline and the system font-scale behaviour are the
 * device's business, and those are B14-B19 on a real handset, which stay blocked.
 * The caption on every panel says so, in the artifact rather than only here, so a
 * reader who never opens this file still knows what they are looking at.
 *
 * WHY THE PANELS ARE ALSO WRITTEN AS HTML. The PNG is what a person looks at; the
 * HTML is what a person debugs. When a panel looks wrong the question is always
 * "which style produced that", and a picture cannot answer it.
 */
import { build } from 'esbuild';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const OUT = 'reports/contact-sheet';
const FONT_DIR = resolve('apps/mobile/assets/fonts');

/**
 * A budget Android handset in CSS pixels. The product is built for a 7,000-rupee
 * device, and a layout proven at desktop width has been proven of nothing.
 */
export const VIEWPORT = { width: 360, height: 800 };

const FONTS = [
  ['AnekOdia-Regular', 'AnekOdia-Regular.ttf'],
  ['AnekOdia-Medium', 'AnekOdia-Medium.ttf'],
  ['AnekOdia-Bold', 'AnekOdia-Bold.ttf'],
];

/**
 * The families are declared under the exact names the tokens use. A near-miss here
 * silently falls back to a system font, which on a machine that happens to have an
 * Odia font installed looks fine and proves nothing - the one failure mode this
 * artifact must not have.
 */
function fontFaces() {
  const missing = FONTS.filter(([, file]) => !existsSync(join(FONT_DIR, file)));
  if (missing.length) {
    throw new Error(
      'the contact sheet needs the shipped font files and these are absent: ' +
        missing.map(([, f]) => f).join(', ') +
        '. Rendering without them would fall back to a system font and the panel ' +
        'would be a picture of the wrong typeface.',
    );
  }
  return FONTS.map(
    ([family, file]) =>
      '@font-face { font-family: "' +
      family +
      '"; src: url("' +
      pathToFileURL(join(FONT_DIR, file)).href +
      '") format("truetype"); font-display: block; }',
  ).join('\n');
}

/** esbuild resolves everything except React, which must be the generator's own copy. */
async function bundleEntry() {
  mkdirSync(OUT, { recursive: true });
  const outfile = resolve(OUT, '.entry.mjs');
  await build({
    entryPoints: ['tools/contact-sheet-entry.tsx'],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    logLevel: 'silent',
    // The seam, pointed at the web implementation instead of the test double.
    alias: {
      '@swafto/ui': 'react-native-web/dist/index.js',
      'react-native-web': 'react-native-web/dist/index.js',
    },
    external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/server'],
  });
  return outfile;
}

const page = (title, caption, css, body) =>
  '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<title>' +
  title +
  '</title>\n<style>\n' +
  fontFaces() +
  '\nhtml,body{margin:0;padding:0;}\nbody{width:' +
  VIEWPORT.width +
  'px;height:' +
  VIEWPORT.height +
  'px;overflow:hidden;}\n#root{width:100%;height:100%;display:flex;}\n#root > *{flex:1;}\n</style>\n' +
  css +
  '\n</head><body><div id="root" data-caption="' +
  caption.replace(/"/g, '&quot;') +
  '">' +
  body +
  '</div></body></html>\n';

export async function generate() {
  const entry = await bundleEntry();
  const mod = await import(pathToFileURL(entry).href + '?t=' + Date.now());

  const written = [];
  for (const panel of mod.renderAll()) {
    const file = join(OUT, panel.id + '.html');
    writeFileSync(file, page(panel.id, panel.caption, panel.css, panel.html), 'utf8');
    written.push({ id: panel.id, caption: panel.caption, file });
  }

  writeFileSync(join(OUT, 'index.json'), JSON.stringify(written, null, 2) + '\n', 'utf8');
  rmSync(entry, { force: true });
  return written;
}

if (process.argv[1] && process.argv[1].endsWith('gen-contact-sheet.mjs')) {
  const written = await generate();
  console.log('  panels rendered   : ' + written.length);
  for (const w of written) console.log('    ' + w.id.padEnd(24) + w.file);
  console.log('  viewport          : ' + VIEWPORT.width + 'x' + VIEWPORT.height + ' css px');
  console.log('\ncontact sheet: HTML written. The screenshot step turns these into the PNGs.');
}
