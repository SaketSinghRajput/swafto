/**
 * PLAN.md - THE WHOLE PRODUCT IN ONE DOCUMENT, AND NONE OF IT AUTHORITATIVE.
 *
 * A plan that restates decisions becomes a twenty-first source of truth and starts
 * lying the moment anything underneath it changes. The registry exists because a
 * value with two homes drifts; §5.6 exists because prose goes stale silently; §5.14
 * exists because a status nobody derives is a claim. A hand-written PLAN.md would
 * violate all three at once, and it would do it beautifully - long, complete,
 * confident, and wrong by iteration 30.
 *
 * So:
 *   A.1  every table is GENERATED from the artifact that owns the fact.
 *   A.2  every prose section names its sources, and their content hashes are
 *        recorded in the footer at generation time.
 *   A.3  --check fails when a recorded hash no longer matches: a source moved and
 *        the summary did not.
 *   A.4  NO NUMBER APPEARS IN PROSE. Enforced below, not merely requested.
 *   A.5  status is DERIVED - from whether the artifact exists, never from a status
 *        column somebody typed.
 *
 *   node tools/gen-plan.mjs           regenerate PLAN.md
 *   node tools/gen-plan.mjs --check   fail if any source has changed since
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const read = (f) => readFileSync(f, 'utf8').split('\r\n').join('\n');
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const failures = [];

/** Every artifact PLAN.md summarises or derives from. Hashed into the footer. */
const SOURCES = {
  traceability: 'docs/spec/TRACEABILITY.md',
  buildMap: 'docs/spec/source/SWAFTO-Retail-Desk-Build-Map.txt',
  benchmarksResults: 'docs/benchmarks/BENCHMARKS-RESULTS.md',
  decisions: 'docs/governance/DECISIONS-AUTONOMOUS.md',
  deferred: 'docs/handover/DEFERRED.md',
  humanActions: 'docs/handover/HUMAN-ACTIONS.md',
  legal: 'docs/audits/LEGAL-AUDIT.md',
  security: 'docs/audits/SECURITY-AUDIT.md',
  techDecisions: 'docs/spec/TECH-DECISIONS.md',
  derivedConstraints: 'docs/governance/DERIVED-CONSTRAINTS.md',
  projection: 'docs/governance/PROJECTION.md',
  prose: 'tools/plan-prose.md',
};

for (const [k, p] of Object.entries(SOURCES)) {
  if (!existsSync(p)) {
    console.error(`x    PLAN.md's source "${k}" is missing at ${p}. Refusing to generate.`);
    process.exit(1);
  }
}

/* ------------------------------------------------------------------ *
 * A.5 · the predicates that DERIVE status
 * ------------------------------------------------------------------ */

const engineSrc = (() => {
  let all = '';
  const dir = 'packages/formula-engine/src';
  if (existsSync(dir)) {
    for (const n of readdirSync(dir)) if (n.endsWith('.ts')) all += read(join(dir, n));
  }
  return all;
})();

const apiSrc = (() => {
  let all = '';
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (n.endsWith('.ts')) all += read(p);
    }
  };
  walk('apps/api/src');
  return all;
})();

const vectorNames = (() => {
  const f = 'packages/formula-engine/vectors.json';
  if (!existsSync(f)) return new Set();
  const j = JSON.parse(read(f));
  return new Set((Array.isArray(j) ? j : j.vectors).map((v) => v.name));
})();

/** Any React Native screen at all. Today there are none, and the table says so. */
const anyScreens = (() => {
  const walk = (d) => {
    if (!existsSync(d)) return false;
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) {
        if (walk(p)) return true;
      } else if (n.endsWith('.tsx')) return true;
    }
    return false;
  };
  return walk('apps/mobile');
})();

const fnExists = (name) =>
  new RegExp(`(export\\s+(async\\s+)?function|export\\s+const)\\s+${name}\\b`).test(engineSrc);
const routeExists = (p) => apiSrc.includes(p);

/* ------------------------------------------------------------------ *
 * B.4 · the feature inventory, from TRACEABILITY
 * ------------------------------------------------------------------ */

/**
 * What each ID ANSWERS FOR THE SHOPKEEPER, in his terms. B.4: every row states what
 * it is FOR before what it is. This is the one hand-written map in the generator and
 * it is deliberately not a restatement of the name - "expected cash balance" is the
 * name; "how much cash should be in the box right now" is the answer.
 */
const ANSWERS = {
  IN1: 'What did I sell today, and how much of it was cash, UPI or on credit',
  IN2: 'What stock did I buy, and did I pay for it or take it on account',
  IN3: 'What did I spend on running the shop',
  IN4: 'Which customer paid back some of what he owed me',
  IN5: 'Which supplier did I pay, and how much',
  IN6: 'What did I take out of the drawer for myself',
  IN7: 'What is actually in the drawer, counted by hand',
  P1: 'How much cash came in today, from every source',
  P2: 'How much cash went out today, for every reason',
  P3: 'How much cash should be in the box right now',
  P4: 'What did I really sell, after returns',
  P5: 'What did the stock really cost me',
  P6: 'What did it cost me to keep the doors open',
  P7: 'How much of my money are my customers holding',
  P8: 'How much do I owe my suppliers',
  OP1: 'Is the drawer healthy today, or am I running thin',
  OP2: 'Are my expenses eating the day',
  OP3: 'Of the credit I gave out, how much is coming back',
  OP4: 'Who do I have to pay, and when',
  OP5: 'Is the shop busier or quieter than it was',
  OP6: 'Am I about to run out of cash',
  BI1: 'Is the shop making more or less than it was',
  BI2: 'Are my sales steady, or all over the place',
  BI3: 'Is my cash flow stable enough to plan against',
  BI4: 'Is my money stuck in credit instead of in the drawer',
  BI5: 'Reserved. Not in V1 - the data model cannot answer it',
  BI6: 'How much of what I am owed sits with one or two customers',
};

function featureRows() {
  const text = read(SOURCES.traceability);
  const rows = [];
  for (const line of text.split('\n')) {
    const m = /^\|\s*((?:IN|P|OP|BI)\d+)\s*\|(.+)$/.exec(line);
    if (!m) continue;
    const id = m[1];
    /*
     * Split on UNESCAPED pipes only. TRACEABILITY writes alternatives inside a cell
     * as `cash_sales`\|`upi_sales`, and a naive split on "|" shifts every column
     * after it - IN1's screen cell came out reading "`upi_sales`\". Found by reading
     * the generated document as prose (C.2), which no amount of internal consistency
     * would have surfaced.
     */
    const cells = m[2]
      .split(/(?<!\\)\|/)
      .map((c) => c.replace(/\\\|/g, '|').trim());
    const [fn = '', test = '', api = '', screen = ''] = cells;
    const fnName = (/`([A-Za-z0-9_]+)`/.exec(fn) || [])[1];
    /*
     * TRACEABILITY prefixes only the FIRST vector in a cell: `vectors.json:a`, `b`.
     * Counting prefixed names alone under-reports every multi-vector row - IN1 read
     * as one vector when it names two. Every backticked token in the test cell is a
     * vector name; the prefix is decoration.
     */
    const vecs = [...test.matchAll(/`([^`]+)`/g)]
      .map((x) => x[1].replace(/^vectors\.json:/, '').trim())
      .filter((v) => /^[a-z0-9][a-z0-9-]*$/.test(v));
    const route = (/((?:GET|POST|PUT|DELETE) \/[^`\s]+)/.exec(api) || [])[1];

    const haveFn = fnName ? fnExists(fnName) : false;
    const haveVec = vecs.length > 0 && vecs.every((v) => vectorNames.has(v));
    const haveApi = route ? routeExists(route.split(' ')[1]) : false;

    // A.5 - derived, never copied from the Status column.
    let status;
    if (id === 'BI5') status = 'reserved, not V1';
    else if (haveFn && haveVec && haveApi && anyScreens) status = '**DONE**';
    else if (haveFn && haveVec) status = 'engine done · no API, no screen';
    else if (haveFn) status = 'function only';
    else status = '**NOT BUILT**';

    rows.push({
      id,
      answer: ANSWERS[id] ?? '',
      fn: fnName ? `\`${fnName}\`` : '-',
      fnOk: haveFn,
      vecs: vecs.length,
      vecOk: haveVec,
      screen: screen.replace(/\s+/g, ' '),
      status,
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ *
 * B.5 · the screens, from the build map
 * ------------------------------------------------------------------ */

function screenRows() {
  // latin1: the build map is not UTF-8 and its separator decodes wrongly otherwise.
  const text = readFileSync(SOURCES.buildMap, 'latin1');
  const seen = new Map();
  let current = null;
  /*
   * THE DESCRIPTION WRAPS. The build map is a fixed-width table: an id line carries
   * the first fragment of the description and the rest continues on deeply indented
   * lines, separated by blanks, with a priority marker somewhere among them. Reading
   * only the id line truncates every description mid-phrase - "Progress, today's
   * figures," presented as though it were the whole sentence, which is worse than
   * omitting it. Continuation lines are joined until the next id.
   */
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s{0,6}([TPRX])(\d{1,2})\s{2,}(\S.*?)\s{2,}(\S.*)?$/.exec(line);
    if (m) {
      const id = m[1] + m[2];
      current = seen.has(id) ? null : { id, name: m[3].trim(), does: (m[4] || '').trim() };
      if (current) seen.set(id, current);
      continue;
    }
    if (!current) continue;
    if (/^\s*$/.test(line)) continue;
    const cont = /^\s{20,}(\S.*)$/.exec(line);
    if (!cont) {
      current = null;
      continue;
    }
    current.does = `${current.does} ${cont[1].trim()}`.replace(/\s+/g, ' ').trim();
  }
  // The priority marker is a column of the source table, not part of the sentence.
  for (const s of seen.values()) {
    const pr = /\bP([012])\b/.exec(s.does);
    s.priority = pr ? `P${pr[1]}` : '-';
    s.does = s.does.replace(/\s*\bP[012]\b\s*/g, ' ').replace(/\s+/g, ' ').trim();
  }
  /*
   * §5.12.2 - assert on the work done. This parse reads a fixed-width text file, the
   * most fragile input in the build. If it degrades it must say so, rather than emit
   * a short table that looks complete.
   */
  if (seen.size !== 27) {
    failures.push(
      `the build map parse found ${seen.size} screens, expected 27 (B38's denominator). ` +
        'The parse has degraded or the map changed; PLAN.md would understate the screen set.',
    );
  }
  return [...seen.values()];
}

/* ------------------------------------------------------------------ *
 * generic extractors
 * ------------------------------------------------------------------ */

function measuredRows() {
  const table = read(SOURCES.benchmarksResults).split('## Measured')[1]?.split('\n---')[0] ?? '';
  return [...table.matchAll(/^\|\s*(B\d+)\s+([^|]+)\|([^|]*)\|([^|]*)\|/gm)].map((m) => ({
    id: m[1],
    name: m[2].trim(),
    threshold: m[3].trim(),
    measured: m[4].trim(),
  }));
}

const decisions = () =>
  [...read(SOURCES.decisions).matchAll(/^## (AD-\d+)\s*[·-]\s*(.+)$/gm)].map((m) => ({
    id: m[1],
    title: m[2].trim(),
  }));

const humanActions = () =>
  [...read(SOURCES.humanActions).matchAll(/^\|\s*(H\d+)\s*\|([^|]+)\|([^|]+)\|([^|]+)\|/gm)].map(
    (m) => ({ id: m[1], what: m[2].trim(), lead: m[3].trim(), blocks: m[4].trim() }),
  );

const deferredItems = () =>
  [...read(SOURCES.deferred).matchAll(/^##\s*\d+\s*[·-]\s*(.+)$/gm)].map((m) => m[1].trim());

/* ------------------------------------------------------------------ *
 * A.4 · NO NUMBER IN PROSE - enforced
 * ------------------------------------------------------------------ */

/**
 * The rule that will feel pedantic and is the reason this document is still true at
 * iteration 40. Every number written into prose in this build has eventually
 * disagreed with the code, including one that was about to be registered with a
 * telecom operator.
 *
 * IDENTIFIERS ARE NOT NUMBERS. IN1, AD-018, ADR-001, §5.13, T7, B38, ap-south-1 and
 * V1 name a thing; ten, 4.5:1 and 56dp assert a value. Only the second kind is
 * forbidden, so identifier shapes are removed before the scan.
 */
function numbersInProse(text) {
  const bad = [];
  let inComment = false;
  for (const [i, raw] of text.split('\n').entries()) {
    /*
     * Comment BLOCKS are skipped, not merely the line that opens one. This file's own
     * header explains the rule and necessarily cites it by number; the first version
     * of this scanner flagged its own documentation.
     */
    if (inComment) {
      if (raw.includes('-->')) inComment = false;
      continue;
    }
    if (raw.trimStart().startsWith('<!--')) {
      if (!raw.includes('-->')) inComment = true;
      continue;
    }
    // A SOURCES line names files, and a filename may legitimately carry a digit.
    if (raw.startsWith('SOURCES:')) continue;
    const line = raw
      .replace(/`[^`]*`/g, ' ') // inline code may hold identifiers and paths
      .replace(/\]\([^)]*\)/g, ' ') // link targets
      .replace(/\b(?:IN|OP|BI|ADR|AD|DC|CP|TB|R|S|G|H|B|T|P|X|D|V)-?\d{1,3}\b/g, ' ')
      .replace(/§\d+(?:\.\d+)*/g, ' ')
      .replace(/\bap-south-\d\b/g, ' ');
    if (/\d/.test(line)) {
      bad.push(`line ${i + 1} (digit): ${raw.trim().slice(0, 80)}`);
      continue;
    }
    /*
     * A.4's example is "ten minutes", spelled out, so digits alone would not enforce
     * it. But "one hand" and "one sentence" are ordinary English, not value claims.
     * The discriminator is a UNIT: a spelled number followed by something measurable
     * is asserting a value that some other artifact owns.
     */
    const spelled =
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|sixty|hundred|thousand)[- ](minute|second|hour|day|week|month|character|char|digit|dp|sp|pixel|percent|rupee|paise|screen|iteration|segment|byte|kilobyte|megabyte|vector|benchmark)s?\b/i.exec(
        line,
      );
    if (spelled) bad.push(`line ${i + 1} (spelled value "${spelled[0]}"): ${raw.trim().slice(0, 70)}`);
  }
  return bad;
}

/* ------------------------------------------------------------------ *
 * render
 * ------------------------------------------------------------------ */

const prose = read(SOURCES.prose);
const section = (key) => {
  const re = new RegExp(`<!-- PROSE:${key} -->\\n([\\s\\S]*?)(?=\\n<!-- PROSE:|$)`);
  const m = re.exec(prose);
  if (!m) {
    failures.push(`tools/plan-prose.md has no section "${key}" - PLAN.md would emit a hole.`);
    return '';
  }
  return m[1].trimEnd();
};

const proseNumbers = numbersInProse(prose);
if (proseNumbers.length) {
  failures.push(
    `A.4 - ${proseNumbers.length} number(s) written into prose in tools/plan-prose.md. ` +
      'Numbers live in generated tables or in the registry; prose names the source.\n           ' +
      proseNumbers.slice(0, 8).join('\n           '),
  );
}

const features = featureRows();
const screens = screenRows();
const measured = measuredRows();
const ads = decisions();
const humans = humanActions();
const cuts = deferredItems();

if (features.length < 20) failures.push(`only ${features.length} feature rows parsed from TRACEABILITY`);
if (measured.length === 0) failures.push('no measured benchmarks parsed from BENCHMARKS-RESULTS');
if (humans.length === 0) failures.push('no human actions parsed from HUMAN-ACTIONS');
if (ads.length === 0) failures.push('no autonomous decisions parsed');

const group = (pred) => features.filter((f) => pred(f.id));
const featTable = (rows) =>
  [
    '| ID | What it answers for the shopkeeper | Engine function | Vectors | Screen | Status |',
    '|---|---|---|---|---|---|',
    ...rows.map(
      (r) =>
        `| ${r.id} | ${r.answer} | ${r.fn}${r.fn === '-' || r.fnOk ? '' : ' *(absent)*'} | ${
          r.vecs === 0 ? '-' : r.vecs + (r.vecOk ? '' : ' *(some absent)*')
        } | ${r.screen || '-'} | ${r.status} |`,
    ),
  ].join('\n');

const built = features.filter((f) => f.fnOk).length;

const out = `<!-- GENERATED by tools/gen-plan.mjs. Do not edit by hand.
     Prose lives in tools/plan-prose.md; every table is derived from the artifacts
     listed in the footer. Run \`npm run plan\` to regenerate. -->

# SWAFTO Retail Desk V1 — the plan

**This document owns no fact.** Every table below is generated from the artifact that
owns it, and every prose section names its sources. If you need an exact value,
follow the link — the number here would be a copy, and a copy drifts. See
[how to verify every claim](#how-to-verify-every-claim-in-this-document).

---

## 1 · What this is

${section('what-this-is')}

---

## 2 · Who it is for, and the conditions it runs in

${section('who-it-is-for')}

---

## 3 · The product position

${section('product-position')}

---

## 4 · The complete feature inventory

Derived from [TRACEABILITY.md](docs/spec/TRACEABILITY.md). **Status is derived, not
copied**: the engine function is looked up in the engine source, the vectors in
\`vectors.json\`, the route in the API source, the screen in \`apps/mobile\`. A row
reading NOT BUILT says so because the artifact is absent today, not because a column
somewhere says TODO.

Engine functions actually present: **${built} of ${features.length}**.

### Inputs — what he types

${featTable(group((id) => id.startsWith('IN')))}

### Primary outputs — never gated, always shown

${featTable(group((id) => /^P\d/.test(id)))}

### Operational outputs

${featTable(group((id) => id.startsWith('OP')))}

### Intelligence outputs — gated on closed-day history

${featTable(group((id) => id.startsWith('BI')))}

---

## 5 · The screens

All ${screens.length} from the build map. **None is built**: no React Native screen
exists in the repository today. The committed subset is in
[PROJECTION.md](docs/governance/PROJECTION.md), which also records what was cut and
when that decision was taken.

| ID | Name | What he does there | Priority |
|---|---|---|---|
${screens.map((s) => `| ${s.id} | ${s.name} | ${s.does || '-'} | ${s.priority} |`).join('\n')}

---

## 6 · Cross-cutting behaviour

${section('cross-cutting')}

---

## 7 · Technical architecture

${section('architecture')}

### Every autonomous decision on the record

Taken without a human in the loop. Each carries a reversal trigger — the fact that
would make it wrong — in
[DECISIONS-AUTONOMOUS.md](docs/governance/DECISIONS-AUTONOMOUS.md).

| ID | Decision |
|---|---|
${ads.map((a) => `| ${a.id} | ${a.title} |`).join('\n')}

---

## 8 · Legal and compliance

${section('legal')}

---

## 9 · Operations and launch

${section('operations')}

---

## 10 · The quality bar

Every benchmark that has been measured, from
[BENCHMARKS-RESULTS.md](docs/benchmarks/BENCHMARKS-RESULTS.md). Thresholds live in
[BENCHMARKS.md](docs/benchmarks/BENCHMARKS.md), which is frozen by hash so one cannot
be moved to meet a result.

| ID | Benchmark | Threshold | Measured |
|---|---|---|---|
${measured.map((b) => `| ${b.id} | ${b.name} | ${b.threshold} | ${b.measured} |`).join('\n')}

${section('quality-rules')}

---

## 11 · What is not being built, and why

${section('not-building')}

Cut by scope, each with its cost and what it blocks, from
[DEFERRED.md](docs/handover/DEFERRED.md):

${cuts.map((c) => `- ${c}`).join('\n')}

---

## 12 · What needs a human

From [HUMAN-ACTIONS.md](docs/handover/HUMAN-ACTIONS.md). The lead-time column is why
DLT registration and a live privacy policy cannot be compressed by building faster.

| ID | What | Lead time | What it blocks |
|---|---|---|---|
${humans.map((h) => `| ${h.id} | ${h.what} | ${h.lead} | ${h.blocks} |`).join('\n')}

---

## How to verify every claim in this document

${section('verify')}

---

<!-- PLANHASH:START -->
${Object.entries(SOURCES)
  .map(([k, p]) => `${hash(read(p))}  ${k}  ${p}`)
  .join('\n')}
<!-- PLANHASH:END -->
`;

/* ------------------------------------------------------------------ *
 * A.3 · the staleness alarm
 * ------------------------------------------------------------------ */

if (process.argv.includes('--check')) {
  if (!existsSync('PLAN.md')) {
    console.error('x    PLAN.md does not exist. Run `npm run plan`.');
    process.exit(1);
  }
  const block = /<!-- PLANHASH:START -->\n([\s\S]*?)<!-- PLANHASH:END -->/.exec(read('PLAN.md'));
  if (!block) {
    console.error('x    PLAN.md has no hash footer, so its staleness cannot be judged.');
    process.exit(1);
  }
  const recorded = block[1]
    .trim()
    .split('\n')
    .map((l) => l.trim().split(/\s+/));
  if (recorded.length !== Object.keys(SOURCES).length) {
    failures.push(
      `PLAN.md records ${recorded.length} source hashes; there are ` +
        `${Object.keys(SOURCES).length} sources. One was added or removed and the plan ` +
        'was not regenerated.',
    );
  }
  let moved = 0;
  for (const [h, key, path] of recorded) {
    if (!existsSync(path)) {
      failures.push(`PLAN.md's source "${key}" no longer exists at ${path}`);
      continue;
    }
    const now = hash(read(path));
    if (now !== h) {
      moved += 1;
      failures.push(
        `${key} (${path}) has CHANGED since PLAN.md was written - ${h} -> ${now}. ` +
          'A source moved and the summary did not. Re-read the section that cites it, ' +
          'then run `npm run plan`.',
      );
    }
  }
  console.log(`  sources tracked        : ${recorded.length}`);
  console.log(`  sources changed        : ${moved}`);
  console.log(`  feature rows derived   : ${features.length}`);
  console.log(`  screens parsed         : ${screens.length}`);
  if (failures.length) {
    console.error(`\nPLAN IS STALE (${failures.length}):`);
    for (const f of failures) console.error(`  x    ${f}`);
    process.exit(1);
  }
  console.log('\nplan: every source is exactly as it was when PLAN.md was written');
  process.exit(0);
}

if (failures.length) {
  console.error(`\nCANNOT GENERATE PLAN.md (${failures.length}):`);
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}

const existing = existsSync('PLAN.md') ? readFileSync('PLAN.md', 'utf8') : '';
writeFileSync('PLAN.md', existing.includes('\r\n') ? out.split('\n').join('\r\n') : out);
console.log(`  feature rows           : ${features.length} (${built} with a real engine function)`);
console.log(`  screens                : ${screens.length}`);
console.log(`  benchmarks measured    : ${measured.length}`);
console.log(`  autonomous decisions   : ${ads.length}`);
console.log(`  human actions          : ${humans.length}`);
console.log(`  sources hashed         : ${Object.keys(SOURCES).length}`);
console.log('\nwrote PLAN.md');
