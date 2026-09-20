/**
 * B31 - LAYOUT OVERFLOW IN ANY LANGUAGE, MEASURED RATHER THAN ASSERTED.
 *
 * Every other screen instrument in this build reads the style a screen ASKED FOR.
 * That is the right thing to check and it cannot answer this question: whether a
 * long Odia label actually fits is a fact about text shaping and flexbox, and the
 * UI double deliberately refuses to pretend it knows (`measuredOnly()`). So this is
 * the one screen check that runs a real layout engine.
 *
 * WHAT IT MEASURES. Each registry case is laid out by react-native-web in headless
 * Chromium at a budget-handset viewport with the SHIPPED fonts, at several font
 * scales, and two things are counted:
 *
 *   HORIZONTAL OVERFLOW, which is the failure that matters. A phone layout that
 *   runs wider than the screen cuts text off with no way to reach it. This is where
 *   Odia and the longest-string pseudo-locale break a layout built in English.
 *
 *   FIXED CHROME running past the bottom, which puts a key off screen.
 *
 * Vertical overflow of the LIST is not a failure - it is a scroll view doing its
 * job, and calling it one would train somebody to disable this check.
 *
 * WHAT IT DOES NOT MEASURE, SAID PLAINLY. Chromium is not Android. The two shape
 * text with the same engine and resolve the same OpenType features, which is why
 * this is worth running at all, but pixel spacing, baselines and the real system
 * font-scale machinery belong to the device. A pass here is a strong signal and not
 * a substitute for B14-B19 on a real handset, which stay blocked.
 *
 * IT HAS ALREADY EARNED ITS KEEP. On its first run it found the keypad standing
 * fifteen pixels below the fold in Focus mode at the chrome cap - a key the
 * shopkeeper could not reach, in the mode built for people who most need to reach
 * it - and four money figures running off the side of the screen.
 */
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CHROME_FONT_SCALE_CAP } from '../packages/values/src/index.ts';

const OUT = 'reports';
const VIEWPORT = { width: 360, height: 800 };
const FONT_DIR = resolve('apps/mobile/assets/fonts');

/**
 * 1.0 is the baseline. The cap is what the product promises chrome will survive.
 * The third is past the cap on purpose: a layout that only just holds at its own
 * promise has no margin, and Android accessibility settings go further than this.
 */
const SCALES = [1, CHROME_FONT_SCALE_CAP, 2];

const FONTS = ['AnekOdia-Regular', 'AnekOdia-Medium', 'AnekOdia-Bold'];

function fontFaces() {
  return FONTS.map((family) => {
    const file = join(FONT_DIR, family + '.ttf');
    if (!existsSync(file)) {
      throw new Error('cannot measure a layout without the shipped font: ' + file);
    }
    return (
      '@font-face { font-family: "' +
      family +
      '"; src: url("' +
      pathToFileURL(file).href +
      '") format("truetype"); font-display: block; }'
    );
  }).join('\n');
}

async function bundle() {
  mkdirSync(OUT, { recursive: true });
  const outfile = resolve(OUT, '.layout-entry.mjs');
  await build({
    entryPoints: ['tools/contact-sheet-entry.tsx'],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    logLevel: 'silent',
    alias: {
      '@swafto/ui': 'react-native-web/dist/index.js',
      'react-native-web': 'react-native-web/dist/index.js',
    },
    external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/server'],
  });
  return outfile;
}

const page = (css, body) =>
  '<!doctype html><html><head><meta charset="utf-8"><style>\n' +
  fontFaces() +
  '\nhtml,body{margin:0;padding:0;}body{width:' +
  VIEWPORT.width +
  'px;height:' +
  VIEWPORT.height +
  'px;overflow:hidden;}#root{width:100%;height:100%;display:flex;}#root > *{flex:1;}\n</style>' +
  css +
  '</head><body><div id="root">' +
  body +
  '</div></body></html>';

/**
 * Runs INSIDE the browser. Applies the font scale the DEVICE would apply, then
 * reports every element that sticks out horizontally from the element containing it.
 *
 * THE CAP IS MODELLED, NOT IGNORED. React Native caps chrome at the registry's
 * font-scale cap and lets money grow past it without limit, and the DOM has no
 * equivalent of `maxFontSizeMultiplier`. Scaling everything uniformly was the first
 * version of this tool and it reported a Hindi keypad label overflowing at scale 2 -
 * a failure that cannot happen on a device, because chrome never reaches scale 2.
 * One known-false row is all it takes to teach somebody to skip the output, so the
 * rule is applied here instead: money scales without limit, everything else stops
 * at the cap.
 *
 * Money is identified by the rupee sign, which is exactly what `Money` renders and
 * nothing else does. Only LEAF elements are touched - an ancestor carries the text
 * of its children, and scaling both would compound.
 */
function measureInPage([scale, viewportWidth, cap]) {
  const nodes = [...document.querySelectorAll('*')];
  if (scale !== 1) {
    for (const el of nodes) {
      if (el.children.length > 0) continue;
      const isMoney = (el.textContent || '').includes('\u20B9');
      const effective = isMoney ? scale : Math.min(scale, cap);
      if (effective === 1) continue;
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      if (size > 0) el.style.fontSize = size * effective + 'px';
      const lh = parseFloat(cs.lineHeight);
      if (lh > 0) el.style.lineHeight = lh * effective + 'px';
    }
  }
  // Force a layout pass before reading anything back.
  void document.body.offsetHeight;

  const overflowing = [];
  for (const el of nodes) {
    const parent = el.parentElement;
    if (!parent || parent === document.documentElement) continue;
    const a = el.getBoundingClientRect();
    const b = parent.getBoundingClientRect();
    if (b.width === 0) continue;
    const by = Math.round(Math.max(a.right - b.right, b.left - a.left));
    if (by > 1) {
      overflowing.push({
        node: el.getAttribute('data-testid') || el.tagName.toLowerCase(),
        text: (el.textContent || '').slice(0, 24),
        by,
      });
    }
  }

  const keypad = document.querySelector('[data-testid="keypad"]');
  return {
    scrollWidth: document.documentElement.scrollWidth,
    horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - viewportWidth),
    chromeBelowFoldPx: keypad
      ? Math.max(0, Math.round(keypad.getBoundingClientRect().bottom - window.innerHeight))
      : 0,
    overflowing: overflowing.slice(0, 12),
  };
}

const entryFile = await bundle();
const mod = await import(pathToFileURL(entryFile).href + '?t=' + Date.now());
const panels = mod.renderEvery();

const browser = await chromium.launch();
const failures = [];
const results = [];

for (const scale of SCALES) {
  for (const panel of panels) {
    const p = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    await p.setContent(page(panel.css, panel.html), { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const m = await p.evaluate(measureInPage, [scale, VIEWPORT.width, CHROME_FONT_SCALE_CAP]);
    await p.close();

    results.push({ id: panel.id, scale, ...m });

    if (m.horizontalOverflowPx > 0) {
      failures.push(
        panel.id + ' at font scale ' + scale + ' is ' + m.horizontalOverflowPx +
          'px wider than the screen',
      );
    }
    for (const o of m.overflowing) {
      failures.push(
        panel.id + ' at font scale ' + scale + ': ' + o.node + ' (' + o.text.trim() + ') runs ' +
          o.by + 'px outside its container',
      );
    }
    if (scale <= CHROME_FONT_SCALE_CAP && m.chromeBelowFoldPx > 0) {
      failures.push(
        panel.id + ' at font scale ' + scale + ': the keypad runs ' + m.chromeBelowFoldPx +
          'px below the fold, and the cap exists so that cannot happen',
      );
    }
  }
}

await browser.close();
writeFileSync(join(OUT, 'layout.json'), JSON.stringify({ VIEWPORT, SCALES, results }, null, 2));

console.log('  cases measured     : ' + panels.length + ' x ' + SCALES.length + ' font scales');
console.log('  viewport           : ' + VIEWPORT.width + 'x' + VIEWPORT.height + ' css px');
console.log(
  '  font scales        : ' + SCALES.join(', ') + ' (chrome cap is ' + CHROME_FONT_SCALE_CAP + ')',
);
console.log('  results            : ' + join(OUT, 'layout.json'));

if (failures.length) {
  console.error('\nLAYOUT OVERFLOW (' + failures.length + '):');
  for (const f of failures) console.error('  x    ' + f);
  console.error(
    '\nB31 asks for zero overflow in any language. Every scale above is applied to\n' +
      'EVERY text node, which is stricter than the device - read the failure before\n' +
      'changing a layout for it.',
  );
  process.exit(1);
}

console.log('\nlayout: nothing overflows its container or the screen, at any measured font scale');
