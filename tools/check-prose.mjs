/**
 * §5.6.3 PROSE INTEGRITY.
 *
 * Promoted to a CI check because of a real defect: a blanket find-and-replace turned
 * LEGAL-AUDIT's status legend into "RESOLVED-AUTONOMOUSLY - needs counsel", which is
 * a contradiction no linter would ever see, and left AD-003 reading "Previously
 * `resolved autonomously`", which is circular.
 *
 * In an autonomous loop the documents are the only surviving record of WHY anything
 * is the way it is. A wrong document is worse than a missing one, because it will be
 * believed.
 *
 * Two failure modes:
 *   1. A sentence asserting both a resolved and an unresolved status.
 *   2. A reference to an AD / benchmark / gate / human-action ID that does not exist.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isVerbatim } from './verbatim.mjs';

// `docs/` holds extracted third-party specification text we did not author; its
// wording is evidence, not our prose, and must not be edited to satisfy a linter.
const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage', 'docs']);

function read(f) {
  return readFileSync(f, 'utf8').split('\r\n').join('\n');
}

function mdFiles(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n) || n.startsWith('.')) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) mdFiles(p, out);
    else if (n.endsWith('.md')) out.push(p);
  }
  return out;
}

// UPPERCASE status tokens only. Lowercase prose ("nothing is blocked") is ordinary
// English and must not trip the check, or nobody can write a sentence.
const RESOLVED = /\b(RESOLVED|DECIDED|CLOSED|COMPLIANT)\b/;
const UNRESOLVED = /\b(BLOCKED|PENDING|NEEDS|TBD|AWAITING)\b/;

/**
 * F-07: the uppercase rule missed `RESOLVED-AUTONOMOUSLY - needs counsel`, twice, in
 * the very file R-001 was discovered in. `needs` was lowercase, so the pair never
 * tripped. These are the lowercase phrases that genuinely contradict a resolved
 * status - not the bare word "needs", which appears harmlessly in ordinary prose
 * ("this needs to be fast"), but the specific constructions that assert outstanding
 * work.
 */
const UNRESOLVED_PHRASES =
  /\b(needs counsel|needs a decision|still blocked|still pending|awaiting counsel|awaiting a decision|not yet decided|to be decided)\b/i;

const failures = [];
const files = mdFiles('.').filter((f) => !isVerbatim(f));
const skipped = mdFiles('.').filter(isVerbatim).length;

/* ---- 1 · contradictory sentences -------------------------------------- */
let sentencesScanned = 0;
for (const f of files) {
  const lines = read(f).split('\n');
  let inFence = false;
  for (const [i, line] of lines.entries()) {
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    // Table cells count as sentences: that is exactly where the legend defect lived.
    for (const sentence of line.split(/(?<=[.!?;])\s+|\s\|\s/)) {
      if (!sentence.trim()) continue;
      sentencesScanned += 1;
      if (RESOLVED.test(sentence) && (UNRESOLVED.test(sentence) || UNRESOLVED_PHRASES.test(sentence))) {
        failures.push(
          `${f}:${i + 1} asserts both a resolved and an unresolved status in one ` +
            `sentence:\n           "${sentence.trim().slice(0, 140)}"`,
        );
      }
    }
  }
}

/* ---- 2 · dangling IDs -------------------------------------------------- */
const defined = { AD: new Set(), B: new Set(), G: new Set(), H: new Set() };

if (existsSync('DECISIONS-AUTONOMOUS.md')) {
  for (const m of read('DECISIONS-AUTONOMOUS.md').matchAll(/^## (AD-\d+)/gm)) defined.AD.add(m[1]);
}
if (existsSync('BENCHMARKS.md')) {
  for (const m of read('BENCHMARKS.md').matchAll(/^\|\s*(B\d+)\s*\|/gm)) defined.B.add(m[1]);
}
if (existsSync('BUILD_STATE.md')) {
  for (const m of read('BUILD_STATE.md').matchAll(/^\|\s*(G\d+)\s*\|/gm)) defined.G.add(m[1]);
}
if (existsSync('HUMAN-ACTIONS.md')) {
  for (const m of read('HUMAN-ACTIONS.md').matchAll(/^\|\s*(H\d+)\s*\|/gm)) defined.H.add(m[1]);
}

const dangling = new Map();
for (const f of files) {
  for (const [i, line] of read(f).split('\n').entries()) {
    for (const m of line.matchAll(/\b(AD-\d+|B\d{1,2}|G\d{1,2}|H\d{1,2})\b/g)) {
      const id = m[1];
      const kind = id.startsWith('AD-') ? 'AD' : id[0];
      if (!defined[kind] || defined[kind].size === 0) continue;
      if (!defined[kind].has(id) && !dangling.has(id)) {
        dangling.set(id, `${f}:${i + 1}`);
      }
    }
  }
}
for (const [id, where] of dangling) {
  failures.push(`dangling reference to ${id}, which is not defined anywhere - ${where}`);
}

console.log(`  files scanned      : ${files.length} (${skipped} verbatim, not ours to edit)`);
console.log(`  sentences scanned  : ${sentencesScanned}`);
console.log(
  `  ids defined        : ${defined.AD.size} AD · ${defined.B.size} B · ` +
    `${defined.G.size} G · ${defined.H.size} H`,
);

if (failures.length) {
  console.error(`\nPROSE INTEGRITY FAILURES (${failures.length}):`);
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}
console.log('\nprose: no contradictory sentences, no dangling IDs');
