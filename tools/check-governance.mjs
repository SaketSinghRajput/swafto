// Enforces the autonomy amendment's structural invariants. These are the rules that
// keep an unsupervised loop honest, so they are checked mechanically, not by memory.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { isVerbatim } from './verbatim.mjs';

const failures = [];
const ok = [];

// Build artifacts are generated and gitignored, and may legitimately contain strings
// from an older generation of the sources. They are not evidence of anything.
const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage', '.hermes-bundle.js']);

function read(f) {
  // Normalise CRLF. On Windows a stray carriage return makes multiline anchors
  // behave oddly, which cost an iteration to work out.
  return readFileSync(f, 'utf8').split('\r\n').join('\n');
}

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n) || n.startsWith('.vectors')) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    // Verbatim human instructions name the forbidden statuses in order to abolish
    // them. They are evidence, not our prose, and §5.6 forbids editing evidence to
    // please a linter. An adversary pass we wrote carries no marker and IS checked.
    else if (/\.(md|ts|tsx|mjs|js|json|sql|ya?ml)$/.test(n) && !isVerbatim(p)) out.push(p);
  }
  return out;
}

// 1 · The blocked-on-a-human status must not exist anywhere.
const TOKEN = ['BLOCKED', 'ON', 'HUMAN'].join('-');
const offenders = walk('.').filter(
  (f) => !f.endsWith('check-governance.mjs') && read(f).includes(TOKEN),
);
if (offenders.length) failures.push(`${TOKEN} still appears in: ${offenders.join(', ')}`);
else ok.push(`no "${TOKEN}" status anywhere`);

// 2 · Every autonomous decision must carry a reversal trigger.
if (!existsSync('docs/governance/DECISIONS-AUTONOMOUS.md')) {
  failures.push('DECISIONS-AUTONOMOUS.md is missing');
} else {
  const text = read('docs/governance/DECISIONS-AUTONOMOUS.md');
  const blocks = text.split(/^## /m).slice(1).filter((b) => b.startsWith('AD-'));
  const missing = blocks
    .filter((b) => !/REVERSAL TRIGGER/.test(b))
    .map((b) => b.split('\n')[0].trim());
  if (missing.length) failures.push(`decisions with no reversal trigger: ${missing.join(' | ')}`);
  else ok.push(`${blocks.length} autonomous decisions, all with a reversal trigger`);

  const openQ = text.split('## Open questions')[1];
  if (openQ !== undefined && !openQ.trim().startsWith('None')) {
    failures.push('DECISIONS-AUTONOMOUS.md has unresolved open questions');
  }
}

// 3 · HUMAN-ACTIONS must exist and must not claim to block anything.
if (!existsSync('docs/handover/HUMAN-ACTIONS.md')) {
  failures.push('HUMAN-ACTIONS.md is missing');
} else if (!/Nothing in this file blocks the build/i.test(read('docs/handover/HUMAN-ACTIONS.md'))) {
  failures.push('HUMAN-ACTIONS.md must state that nothing in it blocks the build');
} else {
  ok.push('HUMAN-ACTIONS.md present and non-blocking');
}

// 4 · No stubs or unimplemented throws in shipped paths (B40).
const shipped = walk('packages').concat(existsSync('apps') ? walk('apps') : []);
const stubs = [];
for (const f of shipped) {
  if (/[\/](test|__tests__)[\/]/.test(f) || /\.spec\.|\.test\./.test(f)) continue;
  read(f)
    .split('\n')
    .forEach((line, i) => {
      if (/\b(TODO|FIXME|XXX)\b/.test(line) || /not implemented/i.test(line)) {
        stubs.push(`${f}:${i + 1}`);
      }
    });
}
if (stubs.length) failures.push(`B40 stubs/TODOs in shipped paths: ${stubs.join(', ')}`);
else ok.push('B40: no stubs or TODOs in shipped paths');

// 5 · ONE money-formatting path (injection 09 C.1, DC-002).
//
// `toLocaleString('en-IN')` is banned outright: Hermes ships without full ICU in many
// configurations and falls back SILENTLY to Western grouping. No error, no warning,
// just the wrong comma on a number a shopkeeper is checking against his cash box.
// Every paise-to-string conversion goes through formatPaise, which is hand-rolled and
// covered by vectors under both runtimes.
const FORMAT_BANS = [
  [/\btoLocaleString\s*\(/, 'toLocaleString - silently wrong on Hermes without ICU'],
  [/\bIntl\.NumberFormat\b/, 'Intl.NumberFormat - unavailable or partial on Hermes'],
  [/\bIntl\.DateTimeFormat\b/, 'Intl.DateTimeFormat - the engine must stay locale-free'],
];
const formatOffenders = [];
for (const f of shipped) {
  if (/[\\/](test|__tests__)[\\/]/.test(f) || /\.spec\.|\.test\./.test(f)) continue;
  read(f)
    .split('\n')
    .forEach((line, i) => {
      const t = line.trimStart();
      if (t.startsWith('//') || t.startsWith('*')) return;
      for (const [re, why] of FORMAT_BANS) {
        if (re.test(line)) formatOffenders.push(`${f}:${i + 1} uses ${why}`);
      }
      // A bare toFixed on a money-ish identifier is a second formatting path.
      if (/\b(amount|paise|total|balance|cash|sum)\w*\.toFixed\s*\(/i.test(line)) {
        formatOffenders.push(`${f}:${i + 1} formats money with toFixed, not formatPaise`);
      }
    });
}
if (formatOffenders.length) {
  failures.push(`C.1 money formatting: ${formatOffenders.join('; ')}`);
} else {
  ok.push('C.1: one money-formatting path, no Intl/toLocaleString in shipped code');
}

/**
 * 6 · Verbatim evidence must not have been edited.
 *
 * Invariant 1 now exempts files carrying the verbatim marker, because the human
 * instructions name the forbidden statuses in order to abolish them. That exemption
 * makes INJECTIONS/ the ONE place in the repository where a banned token can sit
 * unchallenged - so those files are pinned. Any edit, including a helpful-looking one,
 * fails here. The instructions are what this loop is measured against; a rule quietly
 * softened after the fact is the most valuable thing an unsupervised agent could
 * possibly forge, so it is the thing most worth making impossible.
 *
 * Re-pin deliberately (and say why in BUILD_LOG) only when a NEW injection arrives.
 */
const LOCK = 'INJECTIONS/injections.lock';
if (existsSync('INJECTIONS') && existsSync(LOCK)) {
  const pinned = new Map(
    read(LOCK)
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        const [sha, name] = l.split(/\s{2,}/);
        return [name, sha];
      }),
  );
  const present = readdirSync('INJECTIONS')
    .filter((n) => isVerbatim(join('INJECTIONS', n)))
    .sort();
  const drift = [];
  for (const n of present) {
    // Normalised, not raw: core.autocrlf means the same file is CRLF here and LF in
    // CI, and a lock that only holds on one platform is not a lock.
    const sha = createHash('sha256').update(read(join('INJECTIONS', n))).digest('hex');
    if (!pinned.has(n)) drift.push(`${n} is verbatim but not pinned in ${LOCK}`);
    else if (pinned.get(n) !== sha) drift.push(`${n} has been EDITED since it was pinned`);
  }
  for (const n of pinned.keys()) {
    if (!present.includes(n)) drift.push(`${n} is pinned but missing or no longer marked verbatim`);
  }
  if (drift.length) failures.push(`verbatim evidence altered: ${drift.join('; ')}`);
  else ok.push(`${present.length} verbatim injections, all matching ${LOCK}`);
} else if (existsSync('INJECTIONS')) {
  failures.push(`INJECTIONS/ exists but ${LOCK} does not - verbatim evidence is unpinned`);
}

for (const o of ok) console.log(`  ok   ${o}`);
if (failures.length) {
  console.error('\nGOVERNANCE FAILURES:');
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}
console.log('\ngovernance: all invariants hold');
