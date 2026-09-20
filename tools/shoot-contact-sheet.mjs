/**
 * THE SCREENSHOT STEP. Turns the rendered panels into the PNGs a human looks at.
 *
 * It is a separate file from the generator for a practical reason: the generator
 * needs no browser and always works, while this needs a downloaded Chromium and can
 * fail on a fresh machine. Keeping them apart means a missing browser costs the
 * HTML nothing, and the failure names its own fix.
 *
 * DETERMINISM IS THE POINT, NOT A NICETY. A contact sheet that changes when nothing
 * changed teaches the reader to ignore it. Animations are disabled, the device
 * pixel ratio is pinned, and the fonts are waited for explicitly - a screenshot
 * taken before the webfont loads shows a fallback typeface, which on this product
 * would silently answer the Odia question wrongly.
 *
 * THE CAPTION IS ON THE SHEET, NOT BURNED INTO THE PANEL. Each PNG is exactly the
 * screen, so it can be held against a device photograph without cropping. The
 * captions - including the warning that this is a web render and not Android -
 * live on the index page beside the panels.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generate, VIEWPORT } from './gen-contact-sheet.mjs';

const SHEET = 'docs/contact-sheet';

/**
 * Said on the artifact itself, because the person looking at it is the one who
 * needs to know what it is, and they will not be reading the generator.
 */
const DISCLAIMER =
  'Rendered by react-native-web in headless Chromium at ' +
  VIEWPORT.width +
  'x' +
  VIEWPORT.height +
  ' CSS px with the shipped Anek Odia files. This answers the TYPOGRAPHY questions - ' +
  'conjunct formation, digit alignment, whether a long Odia name fits - because ' +
  'Chromium and Android shape text the same way. It is NOT an Android screenshot: ' +
  'pixel spacing, baselines and system font scaling belong to the device, and those ' +
  'remain B14-B19 on a real handset.';

const indexPage = (panels) =>
  '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>SWAFTO contact sheet</title>\n' +
  '<style>\n' +
  'body{font:14px/1.5 system-ui,sans-serif;margin:0;padding:24px;background:#F2F2F2;color:#1A1A1A;}\n' +
  'h1{font-size:20px;margin:0 0 4px;} .note{max-width:70ch;margin:0 0 24px;color:#444;}\n' +
  '.grid{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start;}\n' +
  'figure{margin:0;background:#FFF;padding:12px;border:1px solid #CCC;border-radius:8px;}\n' +
  'img{display:block;width:' +
  VIEWPORT.width +
  'px;border:1px solid #DDD;}\n' +
  'figcaption{max-width:' +
  VIEWPORT.width +
  'px;margin-top:8px;font-size:12px;color:#333;}\n' +
  '</style></head><body>\n<h1>SWAFTO contact sheet</h1>\n<p class="note">' +
  DISCLAIMER +
  '</p>\n<div class="grid">\n' +
  panels
    .map(
      (p) =>
        '<figure><img src="' +
        p.id +
        '.png" alt="' +
        p.caption.replace(/"/g, '&quot;') +
        '"><figcaption><strong>' +
        p.id +
        '</strong><br>' +
        p.caption +
        '</figcaption></figure>',
    )
    .join('\n') +
  '\n</div>\n</body></html>\n';

export async function shoot() {
  const panels = await generate();
  mkdirSync(SHEET, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    // Pinned: a different ratio changes every byte of every PNG for no reason.
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    colorScheme: 'light',
  });
  const page = await context.newPage();

  const shot = [];
  for (const panel of panels) {
    await page.goto(pathToFileURL(resolve(panel.file)).href, { waitUntil: 'load' });
    // Without this the first panel can be captured in a fallback typeface.
    await page.evaluate(() => document.fonts.ready);
    const out = join(SHEET, panel.id + '.png');
    await page.screenshot({ path: out, animations: 'disabled' });
    shot.push({ ...panel, png: out });
  }

  await browser.close();
  writeFileSync(join(SHEET, 'index.html'), indexPage(shot), 'utf8');
  return shot;
}

if (process.argv[1] && process.argv[1].endsWith('shoot-contact-sheet.mjs')) {
  const shot = await shoot();
  console.log('  panels captured   : ' + shot.length);
  for (const s of shot) {
    const bytes = readFileSync(s.png).length;
    console.log('    ' + s.id.padEnd(24) + s.png.padEnd(44) + bytes + ' bytes');
  }
  console.log('  sheet             : ' + join(SHEET, 'index.html'));
  console.log('\ncontact sheet: open the index and LOOK at the Odia panels.');
}
