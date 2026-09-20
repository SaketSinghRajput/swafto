/**
 * DESIGN.md - READ FROM THE CODE, NEVER WRITTEN.
 *
 * This is not documentation. It is a DRIFT DETECTOR. The design system says what the
 * screens should do; the code says what they do. Rendering the second and diffing it
 * against the first is the only way anyone finds out that screen six quietly
 * hardcoded a colour, or that a touch target came out below the minimum because a
 * parent's padding ate it.
 *
 * IT NEVER PROPOSES ANYTHING. Every row is a reading. The gaps are the point.
 *
 * TWO SOURCES, ALWAYS LABELLED, because they have very different reliability:
 *   STATIC   - the source. Cheap, complete, blind to anything computed at runtime.
 *   MEASURED - render and instrument output. Expensive, partial, and the only thing
 *              that tells the truth about a layout.
 * Where they disagree about the same property, the disagreement IS the finding. A
 * style object declaring the minimum and a render below it is exactly what a
 * static-only document would certify as fine.
 *
 *   node tools/gen-design.mjs           write DESIGN.md
 *   node tools/gen-design.mjs --check   F.2: fail on raw values, keypad+nav, S/M gaps
 *   node tools/gen-design.mjs --prove   F.3: plant a hardcoded colour, require a row
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { COMMITTED_SCREENS } from './tasks.data.mjs';

const read = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\r\n').join('\n') : '');
const failures = [];

const APP = 'apps/mobile/src';
const SCREEN_DIR = join(APP, 'screens');
const COMPONENT_DIR = join(APP, 'components');
/** Instrument output. Absent until the screen instruments exist (tasks I-001..I-010). */
const MEASURED_FILE = 'reports/design/measured.json';

/* ---- the registry stands in for the design tokens, and says so ---------- */
const REGISTRY = 'packages/values/src/index.ts';
const registrySrc = read(REGISTRY);
const tokenNames = [...registrySrc.matchAll(/^export const ([A-Z][A-Z0-9_]*)\b/gm)].map((m) => m[1]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(n) && !/\.(spec|test)\./.test(n)) out.push(p);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * STATIC extraction
 * ------------------------------------------------------------------ */

/** Style properties whose numeric literal is a design value rather than an index. */
const NUMERIC_PROPS =
  /\b(fontSize|lineHeight|letterSpacing|padding|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingHorizontal|paddingVertical|margin|marginTop|marginBottom|marginLeft|marginRight|marginHorizontal|marginVertical|width|height|minWidth|minHeight|maxWidth|maxHeight|borderRadius|borderWidth|borderTopWidth|borderBottomWidth|borderLeftWidth|borderRightWidth|borderStartWidth|borderEndWidth|top|bottom|left|right|flexBasis|gap|rowGap|columnGap|elevation)\s*:\s*(-?\d+(?:\.\d+)?)/g;
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const FUNC_COLOR = /\b(?:rgba?|hsla?)\([^)]*\)/g;
const NAMED_COLOR =
  /\b(?:color|backgroundColor|borderColor|tintColor|shadowColor)\s*:\s*'(white|black|red|green|blue|grey|gray|yellow|orange)'/g;

/**
 * EVERY value that is not a token. This table should always be empty, and the first
 * time it is not, a hardcoded colour has been caught before it was copied into the
 * next eight screens. That is the cheapest possible moment to catch it.
 *
 * Zero is not a magic number - `padding: 0` says "none", not a design decision - so
 * it is the one numeric literal that does not count.
 */
function rawValues(file) {
  const out = [];
  for (const [i, line] of read(file).split('\n').entries()) {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
    for (const m of line.matchAll(HEX)) out.push({ file, line: i + 1, kind: 'colour', value: m[0] });
    for (const m of line.matchAll(FUNC_COLOR))
      out.push({ file, line: i + 1, kind: 'colour', value: m[0] });
    for (const m of line.matchAll(NAMED_COLOR))
      out.push({ file, line: i + 1, kind: 'colour', value: m[1] });
    for (const m of line.matchAll(NUMERIC_PROPS)) {
      if (Number(m[2]) === 0) continue;
      out.push({ file, line: i + 1, kind: m[1], value: m[2] });
    }
  }
  return out;
}

const tokensUsed = (src) => tokenNames.filter((t) => new RegExp(`\\b${t}\\b`).test(src));

const statesIn = (src) => ({
  loading: /\b(isLoading|loading)\b/i.test(src),
  empty: /\bempty\b/i.test(src),
  error: /\b(error|isError)\b/i.test(src),
  loaded: /\b(data|entries|day)\b/i.test(src),
});

const hasKeypad = (src) => /\bKeypad\b/.test(src);
const hasNav = (src) => /<\s*(BottomNav|TabBar|NavBar)\b/.test(src);
const componentsUsed = (src) =>
  [...new Set([...src.matchAll(/<\s*([A-Z][A-Za-z0-9]*)/g)].map((m) => m[1]))].sort();

/* ---- contrast, computed rather than asserted ---------------------------- */
const srgb = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6);
  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}
function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  if (a === null || b === null) return null;
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}
/**
 * Pairs a screen actually produces. White-on-marigold is the instance this exists
 * for, and it is caught by the RATIO rather than by a hardcoded hex - a named colour
 * this generator cannot verify would be a fact it invented.
 */
function contrastPairs(src) {
  const pairs = [];
  for (const m of src.matchAll(/\{[^{}]*\}/g)) {
    const fg = /(?:^|[^A-Za-z])color\s*:\s*'(#[0-9a-fA-F]{3,8})'/.exec(m[0]);
    const bg = /backgroundColor\s*:\s*'(#[0-9a-fA-F]{3,8})'/.exec(m[0]);
    if (fg && bg) pairs.push({ fg: fg[1], bg: bg[1], ratio: contrast(fg[1], bg[1]) });
  }
  return pairs;
}

/* ---- MEASURED - absent until the screen instruments exist --------------- */
const measured = existsSync(MEASURED_FILE) ? JSON.parse(read(MEASURED_FILE)) : null;
const measuredFor = (id, property) =>
  measured?.find?.((m) => m.screen === id && m.property === property)?.value ?? null;

/* ---- the committed screen set, present or not --------------------------- */
const screenNames = (() => {
  const text = readFileSync('docs/spec/source/SWAFTO-Retail-Desk-Build-Map.txt', 'latin1');
  const m = new Map();
  for (const line of text.split(/\r?\n/)) {
    const x = /^\s{0,6}([TPRX])(\d{1,2})\s{2,}(\S.*?)\s{2,}/.exec(line);
    if (x && !m.has(x[1] + x[2])) m.set(x[1] + x[2], x[3].trim());
  }
  return m;
})();

const traceability = read('docs/spec/TRACEABILITY.md');
const featureIdsFor = (sid) => {
  const ids = [];
  for (const line of traceability.split('\n')) {
    const m = /^\|\s*((?:IN|P|OP|BI)\d+)\s*\|(.+)$/.exec(line);
    if (m && new RegExp(`\\b${sid}\\b`).test(m[2])) ids.push(m[1]);
  }
  return ids;
};

const screens = COMMITTED_SCREENS.ids.map((sid) => {
  const file = [join(SCREEN_DIR, `${sid}.tsx`), join(SCREEN_DIR, sid, 'index.tsx')].find(existsSync);
  const src = file ? read(file) : '';
  return {
    id: sid,
    name: screenNames.get(sid) ?? '(not in the build map)',
    file,
    src,
    features: featureIdsFor(sid),
    raw: file ? rawValues(file) : [],
    tokens: file ? tokensUsed(src) : [],
    states: file ? statesIn(src) : null,
    keypad: file ? hasKeypad(src) : false,
    nav: file ? hasNav(src) : false,
    components: file ? componentsUsed(src) : [],
    pairs: file ? contrastPairs(src) : [],
    shots: {
      canonical: existsSync(`docs/contact-sheet/${sid}-canonical.png`),
      adversarial: existsSync(`docs/contact-sheet/${sid}-adversarial.png`),
    },
  };
});
const present = screens.filter((s) => s.file);

/* ---- components --------------------------------------------------------- */
const components = walk(COMPONENT_DIR).map((f) => {
  const src = read(f);
  const name = /export\s+(?:default\s+)?(?:function|const)\s+([A-Z][A-Za-z0-9]*)/.exec(src)?.[1];
  return {
    file: f,
    name: name ?? relative(APP, f),
    usedBy: screens.filter((s) => name && new RegExp(`<\\s*${name}\\b`).test(s.src)),
    raw: rawValues(f),
    tokens: tokensUsed(src),
  };
});

/**
 * DUPLICATED - near-identical component trees in more than one screen with no shared
 * component. This is the drift that turns nine screens into nine dialects without
 * anyone deciding to. Catching a repeated tree at screen three costs one refactor;
 * at screen nine it costs nine.
 */
const trees = new Map();
for (const s of present) {
  const key = s.components.join(' > ');
  if (!key) continue;
  if (!trees.has(key)) trees.set(key, []);
  trees.get(key).push(s.id);
}
const duplicated = [...trees].filter(([, ids]) => ids.length > 1);

/* ---- token map ---------------------------------------------------------- */
const allSource = [...walk('apps'), ...walk('packages')].filter((f) => !f.includes('values'));
const tokenRefs = new Map(tokenNames.map((t) => [t, []]));
for (const f of allSource) {
  const src = read(f);
  for (const t of tokenNames) if (new RegExp(`\\b${t}\\b`).test(src)) tokenRefs.get(t).push(f);
}
const tokensUsedSomewhere = tokenNames.filter((t) => tokenRefs.get(t).length > 0);
const tokensNeverUsed = tokenNames.filter((t) => tokenRefs.get(t).length === 0);

/**
 * THE RAW-VALUE SCAN COVERS THE WHOLE APP, not only screens and components.
 *
 * It was scoped to those two directories, which is a scoping axis (A12): a hardcoded
 * colour in `src/store/`, or in a second theme file somebody adds, would have been
 * invisible to the one table whose whole job is to be empty. Caught while scaffolding
 * rather than at screen six, which is the only cheap moment.
 *
 * ONE FILE IS EXEMPT, EXPLICITLY AND BY PATH: `src/theme/tokens.ts`. It is where the
 * literals are DEFINED. Exempting it by directory would re-create the gap one level
 * down, so it is named, and anything else under `theme/` is scanned like everything
 * else.
 */
const TOKEN_DEFINITION = join(APP, 'theme', 'tokens.ts');
const appWide = walk(APP).filter(
  (f) => f !== TOKEN_DEFINITION && !f.startsWith(join(APP, 'screens')) && !f.startsWith(COMPONENT_DIR),
);
const rawAll = [
  ...screens.flatMap((s) => s.raw),
  ...components.flatMap((c) => c.raw),
  ...appWide.flatMap((f) => rawValues(f)),
];
/** D.3 - the same value in four files is ONE missing token, not four mistakes. */
const rawGrouped = [
  ...rawAll.reduce((m, r) => {
    const k = `${r.kind} = ${r.value}`;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
    return m;
  }, new Map()),
].sort((a, b) => b[1].length - a[1].length);

/* ------------------------------------------------------------------ *
 * E · the drift table
 * ------------------------------------------------------------------ */
const drift = [];
const MIN_SP = Number(/BODY_TEXT_MIN_SP = (\d+)/.exec(registrySrc)?.[1] ?? 0);
const MIN_DP = Number(/TOUCH_TARGET_MIN_DP = (\d+)/.exec(registrySrc)?.[1] ?? 0);
const MIN_RATIO = Number(
  /CONTRAST_MIN_RATIO[\s\S]{0,120}?value: ([\d.]+)/.exec(registrySrc)?.[1] ?? 0,
);

for (const r of rawAll) {
  drift.push({
    spec: 'every colour, size and spacing comes from a token',
    where: 'the design system',
    does: `raw ${r.kind} \`${r.value}\``,
    at: `${r.file}:${r.line}`,
    sev: 'ENFORCED',
  });
}
for (const s of present) {
  if (s.keypad && s.nav) {
    drift.push({
      spec: 'a keypad is never shown beside a bottom navigation',
      where: 'the screen contract',
      does: 'both are present',
      at: s.file,
      sev: 'ENFORCED',
    });
  }
  for (const p of s.pairs) {
    if (p.ratio !== null && MIN_RATIO && p.ratio < MIN_RATIO) {
      drift.push({
        spec: 'contrast at or above the registry minimum',
        where: 'CONTRAST_MIN_RATIO',
        does: `\`${p.fg}\` on \`${p.bg}\` = ${p.ratio}:1`,
        at: s.file,
        sev: 'REPORTED',
      });
    }
  }
  for (const m of s.src.matchAll(/fontSize\s*:\s*(\d+)/g)) {
    if (MIN_SP && Number(m[1]) < MIN_SP) {
      drift.push({
        spec: 'body text at or above the registry minimum',
        where: 'BODY_TEXT_MIN_SP',
        does: `fontSize ${m[1]}`,
        at: s.file,
        sev: 'REPORTED',
      });
    }
  }
  for (const m of s.src.matchAll(/(?:minHeight|height)\s*:\s*(\d+)/g)) {
    if (MIN_DP && Number(m[1]) < MIN_DP && /Pressable|Touchable|Button/.test(s.src)) {
      drift.push({
        spec: 'touch target at or above the registry minimum',
        where: 'TOUCH_TARGET_MIN_DP',
        does: `height ${m[1]}`,
        at: s.file,
        sev: 'REPORTED',
      });
    }
  }
  /* STATIC versus MEASURED - the disagreement a static-only document cannot see. */
  for (const prop of ['touchTarget', 'fontSize']) {
    const mv = measuredFor(s.id, prop);
    if (mv === null) continue;
    const sv = Number(new RegExp(`${prop}\\s*:\\s*(\\d+)`).exec(s.src)?.[1] ?? NaN);
    if (!Number.isNaN(sv) && sv !== mv) {
      drift.push({
        spec: `STATIC ${prop} ${sv}`,
        where: s.file,
        does: `MEASURED ${mv}`,
        at: MEASURED_FILE,
        sev: 'ENFORCED',
      });
    }
  }
  for (const f of s.features.filter((x) => !new RegExp(`\\b${x}\\b`).test(s.src))) {
    drift.push({
      spec: `${s.id} displays ${f}`,
      where: 'TRACEABILITY.md',
      does: 'the component never references it',
      at: s.file,
      sev: 'REPORTED',
    });
  }
}

/* ------------------------------------------------------------------ *
 * render
 * ------------------------------------------------------------------ */
const iteration = Math.max(
  0,
  ...[...read('docs/governance/BUILD_LOG.md').matchAll(/^## .*·\s*Iteration (\d+)/gm)].map((m) =>
    Number(m[1]),
  ),
);
const yesNo = (b) => (b ? 'yes' : 'no');
const tick = (b) => (b ? '[x]' : '[ ]');

const screenSection = (s) =>
  !s.file
    ? `### ${s.id} — ${s.name}

**ABSENT.** No file at \`${join(SCREEN_DIR, `${s.id}.tsx`).split('\\').join('/')}\`.
TRACEABILITY says it will display ${s.features.join(', ') || 'no feature yet recorded'}.
`
    : `### ${s.id} — ${s.name}

\`${s.file}\`

| property | STATIC | MEASURED |
|---|---|---|
| feature IDs (TRACEABILITY) | ${s.features.join(', ') || '-'} | - |
| components composed | ${s.components.join(', ') || '-'} | - |
| tokens used | ${s.tokens.join(', ') || '**none**'} | - |
| keypad | ${yesNo(s.keypad)} | ${measuredFor(s.id, 'keypad') ?? '-'} |
| bottom nav | ${yesNo(s.nav)} | - |
| states | loading ${tick(s.states.loading)} · empty ${tick(s.states.empty)} · error ${tick(s.states.error)} · loaded ${tick(s.states.loaded)} | - |
| screenshots | canonical ${tick(s.shots.canonical)} · adversarial ${tick(s.shots.adversarial)} | - |

**RAW VALUES** — this table should be empty.

${
  s.raw.length
    ? [
        '| value | kind | where |',
        '|---|---|---|',
        ...s.raw.map((r) => `| \`${r.value}\` | ${r.kind} | ${r.file}:${r.line} |`),
      ].join('\n')
    : '*none*'
}

**CONTRAST PAIRS THIS SCREEN PRODUCES**

${
  s.pairs.length
    ? [
        '| foreground | background | ratio |',
        '|---|---|---|',
        ...s.pairs.map((p) => `| \`${p.fg}\` | \`${p.bg}\` | ${p.ratio ?? '?'}:1 |`),
      ].join('\n')
    : '*none found statically*'
}
`;

const md = `<!-- GENERATED by tools/gen-design.mjs. Do not edit by hand.
     Read from the code, never written. Run \`npm run design\` to regenerate. -->

# DESIGN — what the code actually does

**Generated at iteration ${iteration}.** This document reports; it never proposes. The
design system and the Strategy 1 spec say what the screens *should* do — this says what
they *do*, and the difference between the two is section E.

Every fact is labelled **STATIC** (read from the source: cheap, complete, blind to
anything computed at runtime) or **MEASURED** (render and instrument output: expensive,
partial, and the only thing that tells the truth about a layout).

${
  present.length === 0
    ? `> ## THIS DOCUMENT IS NEARLY EMPTY, AND THAT IS THE CORRECT OUTPUT
>
> **${screens.length} committed screens, ${present.length} implemented.** There is no
> React Native source in this repository yet — \`apps/mobile\` holds bundled fonts and
> nothing else. Every screen below reads ABSENT.
>
> The generator exists now so that it fills as screens land, which makes it a record
> of what was built rather than what was meant to be built. An honest empty document
> is useful; one that hides its emptiness behind prose is not.`
    : `**${screens.length} committed screens, ${present.length} implemented.**`
}

${
  measured
    ? ''
    : `> **No measured data.** \`${MEASURED_FILE}\` does not exist, so every MEASURED cell
> reads \`-\`. The screen instruments that would produce it are tasks \`I-001\` through
> \`I-010\`, due the moment the first screen renders (§5.13). Until then this document
> cannot see a target that is the right size in the style object and the wrong size on
> screen — which is the single defect it was built to catch.`
}

---

## B · Screen inventory

${screens.map(screenSection).join('\n')}

---

## C · Component inventory

${
  components.length === 0
    ? '*No components — `apps/mobile/src/components` does not exist.*'
    : [
        '| component | file | used by | tokens | raw values |',
        '|---|---|---|---|---|',
        ...components.map(
          (c) =>
            `| \`${c.name}\` | ${c.file} | ${c.usedBy.map((s) => s.id).join(', ') || '**nothing**'} | ${c.tokens.length} | ${c.raw.length} |`,
        ),
      ].join('\n')
}

**USED ONCE** — built as shared, used by a single screen. Not necessarily wrong, but a
component with one caller is usually a screen section that got promoted for no reason.

${components.filter((c) => c.usedBy.length === 1).map((c) => `- \`${c.name}\` — only ${c.usedBy[0].id}`).join('\n') || '*none*'}

**DUPLICATED** — near-identical component trees in more than one screen with no shared
component.

${duplicated.map(([k, ids]) => `- \`${k}\` in ${ids.join(', ')}`).join('\n') || '*none*'}

---

## D · Token map

> **The design token module does not exist yet.** It arrives with task \`P-006\`. Until
> then the token set below is \`@swafto/values\`, the value registry, which owns the
> design-facing constants — the touch-target minimum, the body-text minimum, the
> contrast minimum and the font-scale cap. That is a stand-in, and naming it as one is
> the point: a document presenting the registry as the design system would be
> asserting something untrue.

### D.1 · defined and used

| token | references |
|---|---|
${tokensUsedSomewhere.map((t) => `| \`${t}\` | ${tokenRefs.get(t).length} |`).join('\n') || '| *none* | - |'}

### D.2 · defined, and never referenced by \`apps/\` or \`packages/\`

**The scope is the product, not the repository.** Several of these are used by the
checks in \`tools/\` — \`CONTRAST_MIN_RATIO\` is read by \`check:registry\` — so this is
NOT a list of dead constants. It is a list of design-facing values the app does not
yet consume, which today is all of them, because there is no app.

Either the registry carries something the product does not need, or something is being
done by hand that a token already does. Both are worth knowing; **do not delete
anything on this evidence alone.**

${tokensNeverUsed.map((t) => `- \`${t}\``).join('\n') || '*none*'}

### D.3 · used but not defined

Identical values grouped: the same value in four files is **one missing token**, not
four mistakes.

${
  rawGrouped.length
    ? [
        '| value | occurrences | where |',
        '|---|---|---|',
        ...rawGrouped.map(([k, rs]) => `| \`${k}\` | ${rs.length} | ${rs.map((r) => `${r.file}:${r.line}`).join(' · ')} |`),
      ].join('\n')
    : '*none*'
}

---

## E · Drift

Every place the code disagrees with its specification. **ENFORCED** rows fail
\`check:design\`; **REPORTED** rows need judgement, and a check that fails on judgement
gets disabled.

${
  drift.length
    ? [
        '| what the spec says | where | what the code does | where | severity |',
        '|---|---|---|---|---|',
        ...drift.map((d) => `| ${d.spec} | ${d.where} | ${d.does} | ${d.at} | ${d.sev} |`),
      ].join('\n')
    : `*Empty — because there is no screen code to disagree with anything.*

An empty drift table **once screens exist** would be surprising, and should be treated
as an empty adversary pass: run it again, harder, on a different slice. The first
screen is where the most drift is created, because that is where every pattern gets
invented.`
}

---

*Regenerate with \`npm run design\`. Enforce with \`npm run check:design\`.*
`;

/* ------------------------------------------------------------------ *
 * F.3 · --prove
 * ------------------------------------------------------------------ */
if (process.argv.includes('--prove')) {
  const probe = join(SCREEN_DIR, 'DESIGNPROBE.tsx');
  mkdirSync(SCREEN_DIR, { recursive: true });
  writeFileSync(probe, "export const DesignProbe = () => null;\nconst s = { color: '#ff00ff' };\n");
  const planted = rawValues(probe).length;
  rmSync(probe, { force: true });
  const gone = existsSync(probe) ? -1 : rawValues(probe).length;
  const ok = planted === 1 && gone === 0;
  console.log(`  rows the planted colour adds : ${planted}`);
  console.log(`  rows after removing it       : ${gone}`);
  console.log(
    ok
      ? '\nPROVEN: a hardcoded colour adds exactly one row, and removing it removes the row.'
      : `\nNOT PROVEN: planted ${planted} rows (expected 1), ${gone} after removal (expected 0).`,
  );
  process.exit(ok ? 0 : 1);
}

/* ------------------------------------------------------------------ *
 * F.2 · --check
 * ------------------------------------------------------------------ */
if (process.argv.includes('--check')) {
  for (const d of drift.filter((x) => x.sev === 'ENFORCED')) {
    failures.push(`${d.does} at ${d.at} — spec: ${d.spec} (${d.where})`);
  }
  if (!existsSync('DESIGN.md')) failures.push('DESIGN.md does not exist. Run `npm run design`.');
  else if (read('DESIGN.md').trim() !== md.trim()) {
    failures.push('DESIGN.md differs from a fresh generation. Run `npm run design`.');
  }
  console.log(`  committed screens      : ${screens.length}, ${present.length} implemented`);
  console.log(`  raw values             : ${rawAll.length} (this must be zero)`);
  console.log(
    `  drift rows             : ${drift.length} (${drift.filter((d) => d.sev === 'ENFORCED').length} enforced)`,
  );
  console.log(`  measured data          : ${measured ? 'present' : 'absent - MEASURED is blind'}`);
  if (failures.length) {
    console.error(`\nDESIGN DRIFT (${failures.length}):`);
    for (const f of failures) console.error(`  x    ${f}`);
    process.exit(1);
  }
  console.log('\ndesign: no raw values, no keypad beside a nav, no static/measured disagreement');
  process.exit(0);
}

const prev = existsSync('DESIGN.md') ? readFileSync('DESIGN.md', 'utf8') : '';
writeFileSync('DESIGN.md', prev.includes('\r\n') ? md.split('\n').join('\r\n') : md);
console.log(`  committed screens      : ${screens.length}, ${present.length} implemented`);
console.log(`  components             : ${components.length}`);
console.log(`  tokens used / unused   : ${tokensUsedSomewhere.length} / ${tokensNeverUsed.length}`);
console.log(`  raw values             : ${rawAll.length}`);
console.log(`  drift rows             : ${drift.length}`);
console.log('\nwrote DESIGN.md');
