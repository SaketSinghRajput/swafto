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
/**
 * `docs` WAS HERE, and injection 21's move put every document inside it. This check
 * then scanned ONE file instead of nineteen and EXITED 0 - 233 sentences where the
 * previous run read 9961.
 *
 * Nothing failed. It found no contradictions because it was looking at almost
 * nothing: the quiet failure injection 21 C.4 exists to catch, found only by
 * comparing the COUNT before and after rather than the exit code. check-registry
 * survived the same move solely because it refuses to pass on an empty corpus. This
 * one had no such guard, so it gets one below.
 *
 * `source` is skipped for the reason INJECTIONS/ is: the owner's original documents
 * are evidence, not our prose, and §5.6 forbids editing them to satisfy a checker.
 */
const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage', 'source']);

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

/**
 * §5.12.2 - ASSERT ON THE WORK DONE, NOT ON THE EXIT CODE.
 *
 * This floor is not decoration. Injection 21's move put every document under `docs/`,
 * which this walker was skipping, and the check quietly dropped from 19 files to 1
 * and still exited 0. The floor is deliberately well below the real corpus (19 today)
 * so it catches a collapse rather than policing a number.
 */
const MIN_DOCS = 10;
if (files.length < MIN_DOCS) {
  console.error(
    `x    scanned only ${files.length} documents, expected at least ${MIN_DOCS}. A prose ` +
      'check over nothing finds no contradictions and passes for ever. Something ' +
      'moved out from under this walker.',
  );
  process.exit(1);
}

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

if (existsSync('docs/governance/DECISIONS-AUTONOMOUS.md')) {
  for (const m of read('docs/governance/DECISIONS-AUTONOMOUS.md').matchAll(/^## (AD-\d+)/gm)) defined.AD.add(m[1]);
}
if (existsSync('docs/benchmarks/BENCHMARKS.md')) {
  for (const m of read('docs/benchmarks/BENCHMARKS.md').matchAll(/^\|\s*(B\d+)\s*\|/gm)) defined.B.add(m[1]);
}
if (existsSync('docs/governance/BUILD_STATE.md')) {
  for (const m of read('docs/governance/BUILD_STATE.md').matchAll(/^\|\s*(G\d+)\s*\|/gm)) defined.G.add(m[1]);
}
if (existsSync('docs/handover/HUMAN-ACTIONS.md')) {
  for (const m of read('docs/handover/HUMAN-ACTIONS.md').matchAll(/^\|\s*(H\d+)\s*\|/gm)) defined.H.add(m[1]);
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
/**
 * F-A5 · TWO CONFIDENT CLAIMS THAT DISAGREE ARE INVISIBLE TO THE RULE ABOVE.
 *
 * The contradiction rule pairs a RESOLVED word with an UNRESOLVED one. PROJECTION
 * carried two paragraphs both labelled COMMITTED, naming different screen sets, three
 * iterations apart, and this check stayed green for all three. That is a scoping-axis
 * gap in A12's sense: nothing had ever varied along the axis of two same-KIND claims.
 *
 * COUNTED, NOT FAILED. Whether two occurrences of a strong label contradict each
 * other or merely appear twice is a judgement, and a check that fails on judgement
 * gets disabled - which is worse than a number nobody acts on. So this prints how
 * many documents repeat a commitment label, and a rise is the visible form of the
 * hazard, exactly like the quotation-exemption counter.
 */
const STRONG = /\*\*(COMMITTED|DEFERRED|CUT|MISSED - SCOPE|NOT INSTRUMENTED)\b/g;
let repeated = 0;
const repeatedIn = [];
for (const f of files) {
  const counts = new Map();
  for (const m of read(f).matchAll(STRONG)) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  const dupes = [...counts].filter(([, n]) => n > 1);
  if (dupes.length) {
    repeated += 1;
    repeatedIn.push(`${f} (${dupes.map(([k, n]) => `${k}x${n}`).join(', ')})`);
  }
}

console.log(`  sentences scanned  : ${sentencesScanned}`);
console.log(
  `  repeated strong labels : ${repeated} document(s) - a count, not a failure (F-A5)`,
);
for (const r of repeatedIn) console.log(`       ${r}`);
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
