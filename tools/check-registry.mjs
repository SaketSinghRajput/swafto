/**
 * THE REGISTRY, ENFORCED - injection 16 B.2.
 *
 * "CI FAILS when a document states a value that disagrees with the registry, and when
 * code contains a literal that the registry already names."
 *
 * The TTL defect is the one this kills: SECURITY-AUDIT TB6 said 5 minutes,
 * SMS-TEMPLATES.md said 10, the English SMS promised "Valid 10 min", and the code
 * transcribed the wrong one. Nothing could have caught it, because every check
 * compared a document to CODE and none compared a document to a CONSTANT.
 *
 * TWO DIRECTIONS, and both are needed:
 *
 *   DOCUMENT -> REGISTRY   wherever a document states one of these values, the number
 *                          must match. A document may MENTION a value; it may not
 *                          DISAGREE with it.
 *   CODE -> REGISTRY       a literal in code for a value the registry already names is
 *                          a second home for that value. Import it instead.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not scan for bare numbers and guess
 * their meaning - "40" appears in a hundred innocent places. Each rule names the
 * CONTEXT that makes an occurrence a claim about that value, so a hit is a real
 * disagreement rather than a coincidence. A checker that cries wolf gets ignored, and
 * an ignored checker is the failure mode this whole section exists to prevent.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  BODY_TEXT_MIN_SP,
  CONTRAST_MIN_RATIO,
  DLT_MAX_VARIABLE_SHARE_PCT,
  DLT_VARIABLE_MAX_CHARS,
  EXTERNAL_VALUES,
  OTP_DIGITS,
  OTP_TTL_SECONDS,
  TOUCH_TARGET_MIN_DP,
  UCS2_SEGMENT_CHARS,
} from '@swafto/values';

const read = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\r\n').join('\n') : '');
const failures = [];

/**
 * Each rule carries a regex whose first captured group is the number AS A DOCUMENT
 * STATES IT, plus the registry value it must equal. The regex carries the context -
 * "4.5:1" beside the word contrast, "56dp" beside a touch target - so a match is a
 * claim about that value rather than a stray digit.
 */
const RULES = [
  {
    name: 'contrast ratio',
    expect: CONTRAST_MIN_RATIO.value,
    re: /(\d+(?:\.\d+)?):1/g,
    needs: /contrast/i,
  },
  { name: 'touch target dp', expect: TOUCH_TARGET_MIN_DP, re: /(\d+)\s?dp\b/g },
  { name: 'body text sp', expect: BODY_TEXT_MIN_SP, re: /(\d+)\s?sp\b/g },
  {
    name: 'DLT variable cap',
    expect: DLT_VARIABLE_MAX_CHARS.value,
    re: /(\d+)[ -]character/g,
    // The CAP, not the length ours happens to be. "One variable per template, 6
    // characters" states what OUR variable is; only cap language states the limit.
    needs: /variable[^.\n|]{0,40}?(cap|max|limit|up to)|(cap|max|limit)[^.\n|]{0,40}?variable/i,
  },
  {
    name: 'DLT variable share',
    expect: DLT_MAX_VARIABLE_SHARE_PCT.value,
    re: /(\d+)%/g,
    needs: /variable content|variable share|of the message/i,
  },
  {
    name: 'UCS-2 segment',
    expect: UCS2_SEGMENT_CHARS.value,
    re: /(\d+)[ -]character segment/g,
  },
  {
    // "4-digit PIN" is the APP LOCK, a different value with its own registry name.
    // Without this exclusion the rule reads it as a claim about the OTP - which is
    // how APP_LOCK_PIN_DIGITS came to be named at all (injection 14 B.4).
    name: 'OTP digits',
    expect: OTP_DIGITS,
    re: /(\d+)[ -]digit/g,
    needs: /OTP|code/i,
    not: /PIN|app lock/i,
  },
  { name: 'OTP TTL minutes', expect: OTP_TTL_SECONDS / 60, re: /(\d+)[ -]minute TTL|Valid (\d+) min/g },
];

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', 'docs', 'INJECTIONS']);
/**
 * BUILD_LOG is an append-only NARRATIVE: it records what a number WAS at the time -
 * "recorded as 526 until iteration 20" - and rewriting history to match the present
 * is the opposite of what it is for. The other three exist to discuss superseded and
 * measured values, so they quote numbers that are deliberately not current.
 */
const SKIP_FILES = new Set(['BUILD_LOG.md', 'REVIEW.md', 'FINDINGS.md', 'BENCHMARKS-RESULTS.md']);

function docs(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP_DIRS.has(n) || n.startsWith('.')) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) docs(p, out);
    else if (n.endsWith('.md') && !SKIP_FILES.has(n)) out.push(p);
  }
  return out;
}

/* ---- 1 · no document may DISAGREE with the registry -------------------- */
const files = docs('.');
if (files.length === 0) {
  console.error('x    scanned ZERO documents. A registry check over nothing passes forever.');
  process.exit(1);
}

let claims = 0;
/**
 * B.2 - an exemption COUNT, printed every run. Not a failure: a number. A count that
 * grows is the visible form of a hole widening, and the failure mode hit five times
 * in this build is silence rather than error.
 */
let exemptions = 0;
for (const f of files) {
  for (const [i, line] of read(f).split('\n').entries()) {
    for (const rule of RULES) {
      if (rule.needs && !rule.needs.test(line)) continue;
      if (rule.not && rule.not.test(line)) continue;
      /*
       * A QUOTATION IS NOT A CLAIM - BUT AN EXEMPTION IS A HOLE, AND HOLES GROW.
       *
       * SPEC-DIGEST C-8 quotes TB6's superseded "5-minute TTL" in order to rule
       * against it; rewriting that to the current value would destroy the record of a
       * disagreement being resolved. So the exemption is right. It is also the same
       * shape as the INJECTIONS/ exemption at iteration 17, which made that directory
       * the one place a banned token could hide and had to be closed with a hash lock.
       *
       * TWO CONDITIONS, BOTH REQUIRED (B.1):
       *   1. the number is INSIDE quote marks - "..." or *"..."* - on that line, and
       *   2. the line ATTRIBUTES the quote to a named artifact.
       *
       * Prose that merely mentions an old number is not a quotation and still fails.
       * The earlier version accepted any blockquote containing a history word, which
       * would have exempted a whole quoted BLOCK including its surrounding claims.
       */
      const attributed =
        /\b(SECURITY-AUDIT|SMS-TEMPLATES|BENCHMARKS|TECH-DECISIONS|SPEC-DIGEST|BUILD_LOG|ADR-\d+|AD-\d+|TB\d+|injection \d+)\b/.test(
          line,
        );
      const stripped = line.replace(/"[^"]{1,200}"/g, ' ');
      const hidQuoted = attributed && stripped !== line;

      /*
       * THE COUNT ONLY RISES WHEN THE EXEMPTION ACTUALLY SUPPRESSED SOMETHING.
       * Counting every attributed line that merely contains quotes reported 24, most
       * of which were lines where no rule would have matched at all - a number that
       * looks like a widening hole while measuring nothing. B.2 wants the count to
       * mean "times a real match was let through".
       */
      const subject = hidQuoted ? stripped : line;
      if (hidQuoted) {
        const inFull = [...line.matchAll(rule.re)].length;
        const inStripped = [...stripped.matchAll(rule.re)].length;
        if (inFull > inStripped) exemptions += inFull - inStripped;
      }
      for (const m of subject.matchAll(rule.re)) {
        const got = Number(m[1] ?? m[2]);
        if (!Number.isFinite(got)) continue;
        claims += 1;
        if (got !== rule.expect) {
          failures.push(
            `${f}:${i + 1} states ${rule.name} as ${got}, registry says ${rule.expect}\n` +
              `           "${line.trim().slice(0, 110)}"`,
          );
        }
      }
    }
  }
}

/* ---- 2 · no code literal for a value the registry already names -------- */
const OWNED = [
  { name: 'OTP_TTL_SECONDS', re: /\b10 \* MINUTE\b|\bttl\w*\s*[:=]\s*600\b/i },
  { name: 'TOUCH_TARGET_MIN_DP', re: /\btouch\w*\s*[:=]\s*56\b/i },
  { name: 'BODY_TEXT_MIN_SP', re: /\bfontSize\w*\s*[:=]\s*17\b/ },
  { name: 'CHROME_FONT_SCALE_CAP', re: /maxFontSizeMultiplier\s*=?\s*\{?\s*1\.5\b/ },
];
function code(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    if (SKIP_DIRS.has(n) || n.startsWith('.')) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) code(p, out);
    else if (/\.(ts|tsx)$/.test(n) && !/\.(spec|test)\./.test(n)) out.push(p);
  }
  return out;
}
let scanned = 0;
for (const f of code('packages').concat(code('apps'))) {
  if (f.includes(join('packages', 'values'))) continue; // the registry IS their home
  scanned += 1;
  const text = read(f);
  if (text.includes('@swafto/values')) continue; // it imports them, which is the point
  for (const o of OWNED) {
    if (!o.re.test(text)) continue;
    failures.push(
      `${f} carries a literal for ${o.name} without importing @swafto/values. ` +
        'A value with two homes is the defect the registry exists to prevent.',
    );
  }
}

/* ---- 3 · no new hand-typed "Label: number" field (A.3) ----------------- */
/**
 * The iteration counter's family. `BUILD_STATE` carried "Iteration: 7" at iteration
 * 22 - a field a person types once and nobody ever re-types. A.3 says enumerate the
 * rest rather than waiting to trip over them; this keeps the enumeration at zero.
 *
 * BUILD_LOG is exempt and must be: it is an append-only narrative recording what a
 * number WAS at the time, and its two hits ("ADR count = 12", "STRIDE rows = 87") are
 * history rather than claims. Correcting them would be falsifying the record.
 */
const HAND_TYPED = /^(?:\*{0,2})([A-Z][A-Za-z ]{2,30})(?:\*{0,2}):\s*\**(\d[\d,.]*)\**\s*$/;
let handTyped = 0;
for (const f of files) {
  for (const [i, line] of read(f).split('\n').entries()) {
    const m = HAND_TYPED.exec(line.trim());
    if (!m) continue;
    handTyped += 1;
    failures.push(
      `${f}:${i + 1} has a hand-typed field "${m[1]}: ${m[2]}". Derive it, move it to ` +
        'the registry, or delete it - this is the shape that read "Iteration: 7" at ' +
        'iteration 22 (A.3).',
    );
  }
}

/* ---- 4 · every external value carries its source and date (A.2) -------- */
for (const [name, v] of Object.entries(EXTERNAL_VALUES)) {
  if (!v.source || v.source.length < 15) {
    failures.push(`${name} is EXTERNAL but names no usable authority (A.2)`);
  }
  if (!v.established) failures.push(`${name} is EXTERNAL but records no date (A.2)`);
  if (!v.ifStale) failures.push(`${name} is EXTERNAL but does not say what breaks if it moved`);
}

console.log(`  documents scanned      : ${files.length}`);
console.log(`  value claims checked   : ${claims}`);
console.log(`  quotation exemptions   : ${exemptions} (quoted AND attributed; B.2)`);
console.log(`  code files scanned     : ${scanned}`);
console.log(`  hand-typed fields      : ${handTyped} (BUILD_LOG exempt - it records history)`);
console.log(
  `  external values        : ${Object.keys(EXTERNAL_VALUES).length}, each with an authority and a date`,
);

if (failures.length) {
  console.error(`\nREGISTRY DISAGREEMENTS (${failures.length}):`);
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}
console.log('\nregistry: every document agrees with the module, and no code keeps its own copy');
