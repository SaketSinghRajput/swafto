// Enforces the autonomy amendment's structural invariants. These are the rules that
// keep an unsupervised loop honest, so they are checked mechanically, not by memory.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

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
    else if (/\.(md|ts|tsx|mjs|js|json|sql|ya?ml)$/.test(n)) out.push(p);
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
if (!existsSync('DECISIONS-AUTONOMOUS.md')) {
  failures.push('DECISIONS-AUTONOMOUS.md is missing');
} else {
  const text = read('DECISIONS-AUTONOMOUS.md');
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
if (!existsSync('HUMAN-ACTIONS.md')) {
  failures.push('HUMAN-ACTIONS.md is missing');
} else if (!/Nothing in this file blocks the build/i.test(read('HUMAN-ACTIONS.md'))) {
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

for (const o of ok) console.log(`  ok   ${o}`);
if (failures.length) {
  console.error('\nGOVERNANCE FAILURES:');
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}
console.log('\ngovernance: all invariants hold');
