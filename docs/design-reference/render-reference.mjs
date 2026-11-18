/**
 * RENDER THE REFERENCE ARTIFACT, so the fidelity audit looks at pictures
 * rather than at my memory of a description.
 *
 * The single biggest cause of the redesign going wrong is that I built from
 * SPEC-DIGEST (a text document) and never once rendered the Claude Design
 * prototype. A downloaded copy of it sat in this same scratchpad and I used it
 * only to scrape screen NAMES. Everything after that was my own aesthetic,
 * checked against floors - contrast, touch target, overflow - which cannot
 * tell you whether a screen resembles the design it was meant to be.
 *
 * `Phone.dc.html` is a client-rendered template driven by `store.js`, which
 * exposes `window.SwaftoStore` with `jump(id)`, `reset()` and `SCREEN_ORDER`.
 * So each of the 40 screens can be set up properly and photographed.
 *
 * READ-ONLY with respect to the repository: it loads the artifact from disk and
 * writes PNGs into the scratchpad. It changes nothing in the project.
 *
 *   node render-reference.mjs <outDir> [comfort|focus]
 */
import { createRequire } from 'node:module';
/*
 * This script lives in the scratchpad, outside the repo, so a bare specifier
 * cannot find the project's node_modules. Resolve from the project root
 * explicitly rather than copying the script into the tree - the audit phase
 * must not add files to the repository.
 */
const requireFromRepo = createRequire('G:/SWAFTO/code base/package.json');
const { chromium } = requireFromRepo('playwright');
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ART = resolve('G:/SWAFTO/code base/SWAFTO daily closing app design/Phone.dc.html');
const OUT = process.argv[2] ?? resolve('out');
const MODE = process.argv[3] ?? 'comfort';

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
/*
 * 393x876 CSS px is the attached handset measured in dp (iQOO I2219:
 * 1080x2408 at density 440). deviceScaleFactor 2 so these PNGs are legible
 * beside the app's own 2x contact-sheet renders.
 */
const page = await browser.newPage({
  viewport: { width: 393, height: 876 },
  deviceScaleFactor: 2,
});

page.on('pageerror', (e) => console.error('  page error: ' + e.message));

await page.goto(pathToFileURL(ART).href, { waitUntil: 'networkidle' });
await page.waitForFunction(() => Boolean(window.SwaftoStore), null, { timeout: 20000 });

if (MODE === 'focus') {
  await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'focus'));
}

const order = await page.evaluate(() => window.SwaftoStore.SCREEN_ORDER);
const names = await page.evaluate(() => window.SwaftoStore.SCREEN_NAMES);

const index = [];
for (const id of order) {
  try {
    await page.evaluate((screen) => {
      window.SwaftoStore.reset();
      window.SwaftoStore.jump(screen);
    }, id);
    // The template re-renders on the store's own notification; allow a frame
    // plus the artifact's longest declared transition (--motion-sheet: 240ms).
    await page.waitForTimeout(400);
    const file = id + '.png';
    await page.screenshot({ path: join(OUT, file), fullPage: false });
    index.push({ id, name: names[id] ?? id, file, mode: MODE });
    console.log('  ' + id.padEnd(4) + ' ' + (names[id] ?? ''));
  } catch (e) {
    console.error('  ' + id + ' FAILED: ' + e.message);
    index.push({ id, name: names[id] ?? id, file: null, mode: MODE, error: e.message });
  }
}

writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2));
await browser.close();
console.log(
  '\nrendered ' + String(index.filter((r) => r.file).length) + ' of ' + String(order.length) + ' screens to ' + OUT,
);
