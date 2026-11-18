/**
 * Builds the self-contained mockup pages: screens/<area>.html from screens/src/<area>.js.
 *
 *   node product/swafto-ui-redesign/screens/build.mjs            (all areas)
 *   node product/swafto-ui-redesign/screens/build.mjs today      (one area)
 *
 * Copy is extracted VERBATIM from apps/mobile/src/i18n/strings.ts (Node 24 strips the types), so the
 * Odia and Hindi in the mockups are exactly the app's DRAFT strings (H13), never retyped.
 * Exit 1 if a spec names a string key that does not exist (use K.N('English') for a genuinely new string).
 * Output is a design artifact under product/, not a generated repo file: it is not part of check:generated.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const { STRINGS } = await import(pathToFileURL(join(repo, 'apps', 'mobile', 'src', 'i18n', 'strings.ts')).href);
const css = readFileSync(join(here, 'kit', 'kit.css'), 'utf8');
const kit = readFileSync(join(here, 'kit', 'kit.js'), 'utf8');
const only = process.argv[2];
const areas = readdirSync(join(here, 'src')).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).filter((a) => !only || a === only);
const KEY = /['"]([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9_]+)+)['"]/g;
let failed = false;
const catalogue = {};
const ORDER = ['onboarding', 'today', 'sales', 'money', 'close', 'ledger', 'reports', 'settings', 'system'];

/** Runs the area spec in Node (English) and describes every screen state from the same body() that draws the mockup. */
function catalogueFor(area, spec, subset) {
  const ctx = { STRINGS: subset, console, Array, JSON, Math, Object, String, parseInt, parseFloat, Number };
  ctx.window = ctx;
  ctx.document = {};
  vm.createContext(ctx);
  vm.runInContext(kit, ctx);
  vm.runInContext(spec, ctx);
  const { K, SPEC } = ctx;
  K.state.lang = 'en';
  const out = [`## Area: ${SPEC.area.title} (${SPEC.area.screens.length} screen states)`, '', SPEC.area.intro.replace(/<[^>]+>/g, ''), ''];
  const reviews = [];
  for (const sc of SPEC.area.screens) {
    K.frame(sc.id);
    const html = sc.body();
    const copy = [...new Set(html.replace(/<[^>]+>/g, '\u0001').split('\u0001').map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s && !/^[₹+-]*[\d,]+\.\d\d$/.test(s) && !/^\d+\/\d+$/.test(s)))];
    const nw = K.newc(sc.id);
    out.push(`### ${sc.title}`, '', `- Route: \`${sc.route}\` · ${sc.flag === 'NEW' ? '**NEW screen (not in the app today)**' : sc.flag === 'CHG' ? 'changed from the app today' : 'exists today, restyled'} · mockup: \`screens/${area}.html#c-${sc.id}\``,
      `- Purpose: ${sc.purpose}`, `- Primary action: ${sc.primary}`, `- Taps / target: ${sc.taps || 'n/a'}`, `- Rules held: ${sc.rules || '-'}`);
    if (sc.notes) out.push(`- Notes: ${sc.notes}`);
    if (sc.review) { out.push(`- **For Saket's review:** ${sc.review}`); reviews.push(`- ${sc.title}: ${sc.review}`); }
    out.push(`- Copy on screen (en): ${copy.map((c) => `"${c}"`).join(' · ')}`,
      `- String keys (Odia and Hindi are DRAFT per H13, unreviewed): ${K.used(sc.id).map((k) => `\`${k}\``).join(', ') || 'none'}`);
    if (nw.length) out.push(`- **Copy gaps (no string exists; English only, od/hi to be drafted, H13):** ${nw.map((c) => `"${c}"`).join(' · ')}`);
    out.push('');
  }
  return { text: out.join('\n'), count: SPEC.area.screens.length, reviews, gaps: [...new Set(SPEC.area.screens.flatMap((s) => { K.frame(s.id); s.body(); return K.newc(s.id); }))] };
}

for (const area of areas) {
  const spec = readFileSync(join(here, 'src', `${area}.js`), 'utf8');
  const wanted = new Set();
  const missing = new Set();
  for (const text of [kit, spec]) for (const m of text.matchAll(KEY)) if (m[1] in STRINGS) wanted.add(m[1]);
  for (const m of spec.matchAll(/(?<![\w.])(?:K\.)?t\(\s*'([^']+)'/g)) if (!(m[1] in STRINGS)) missing.add(m[1]);
  const subset = {};
  for (const k of wanted) if (k in STRINGS) subset[k] = STRINGS[k];
  const news = [...spec.matchAll(/K\.N\(\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
  const json = JSON.stringify(subset).replace(/</g, '\\u003c');
  const html = `<!doctype html>
<html lang="or"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SWAFTO Retail Desk - Mitra - ${area}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anek+Odia:wght@400;500;700&display=swap" rel="stylesheet">
<style>
@font-face{font-family:'Anek Odia';font-weight:400;src:local('Anek Odia Regular'),url('../../../apps/mobile/assets/fonts/AnekOdia-Regular.ttf')}
@font-face{font-family:'Anek Odia';font-weight:500;src:local('Anek Odia Medium'),url('../../../apps/mobile/assets/fonts/AnekOdia-Medium.ttf')}
@font-face{font-family:'Anek Odia';font-weight:700;src:local('Anek Odia Bold'),url('../../../apps/mobile/assets/fonts/AnekOdia-Bold.ttf')}
${css}
</style></head>
<body data-theme="comfort" data-lang="od">
<div class="page-head"><h1 id="area-title"></h1><p id="area-intro"></p>
<div class="ctl"><div class="grp"><button data-lang-btn="od" aria-pressed="true">ଓଡ଼ିଆ</button><button data-lang-btn="en" aria-pressed="false">English</button><button data-lang-btn="hi" aria-pressed="false">हिन्दी</button></div>
<div class="grp"><button data-theme-btn="comfort" aria-pressed="true">Comfort (light)</button><button data-theme-btn="focus" aria-pressed="false">Focus (dark)</button></div>
<div class="grp"><button data-size-btn="1" aria-pressed="true">Text 1.0x</button><button data-size-btn="1.3" aria-pressed="false">1.3x</button><button data-size-btn="2" aria-pressed="false">2.0x</button></div></div></div>
<div class="legend">Odia and Hindi are the app's unreviewed DRAFT strings (H13), taken verbatim from strings.ts. A dashed red underline means the string does not exist yet (English only). Text sizes above 1.5x leave the header and tab bar at 1.5x (the app's chrome cap); body text and figures keep growing. Browser render with Anek Odia, not the phone.</div>
<nav class="toc" id="toc"></nav>
<main class="stage" id="stage"></main>
<script>window.STRINGS=${json};</script>
<script>${kit}</script>
<script>${spec}
K.boot();</script>
</body></html>
`;
  writeFileSync(join(repo, 'product', 'swafto-ui-redesign', 'screens', `${area}.html`), html);
  catalogue[area] = catalogueFor(area, spec, subset);
  const screens = (spec.match(/\bid:\s*'/g) || []).length;
  console.log(`${area}: ${screens} screen states, ${Object.keys(subset).length} keys, ${news.length} new-copy literals${missing.size ? ', MISSING: ' + [...missing].join(', ') : ''}`);
  if (news.length) console.log('  NEW copy: ' + [...new Set(news)].join(' | '));
  if (missing.size) failed = true;
}
if (!only) {
  const read = (n) => { try { return readFileSync(join(here, 'src', n), 'utf8'); } catch { return ''; } };
  const names = [...ORDER.filter((a) => catalogue[a]), ...Object.keys(catalogue).filter((a) => !ORDER.includes(a))];
  const total = names.reduce((n, a) => n + catalogue[a].count, 0);
  const gaps = [...new Set(names.flatMap((a) => catalogue[a].gaps))];
  const reviews = names.flatMap((a) => catalogue[a].reviews);
  const body = [
    '<!-- ASSEMBLED by product/swafto-ui-redesign/screens/build.mjs from screens/src/_head.md, screens/src/<area>.js and screens/src/_tail.md. Edit those, then run the build. -->', '',
    read('_head.md').replace('{{TOTAL}}', String(total)).replace('{{AREAS}}', names.map((a) => `${a} ${catalogue[a].count}`).join(', ')), '',
    ...names.map((a) => catalogue[a].text),
    '## Roll-up generated from the specs', '',
    `- Screen states: **${total}** (${names.map((a) => `${a} ${catalogue[a].count}`).join(', ')}).`,
    `- Copy gaps, English only, no string key yet (${gaps.length}): ${gaps.map((g) => `"${g}"`).join(' · ') || 'none'}.`, '',
    '### Items flagged for Saket\'s review', '', ...(reviews.length ? reviews : ['none']), '',
    read('_tail.md')].join('\n');
  writeFileSync(join(repo, 'product', 'swafto-ui-redesign', 'FLOWS.md'), body);
  console.log(`FLOWS.md: ${total} screen states across ${names.length} areas, ${gaps.length} copy gaps, ${reviews.length} review items`);
}
process.exit(failed ? 1 : 0);
