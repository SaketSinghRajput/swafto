/**
 * B36 - NO AMOUNT, NAME OR PHONE NUMBER IN A CLIENT LOG. ZERO, NOT FEW.
 *
 * WHY THIS IS A SECURITY CHECK AND NOT A TIDINESS ONE. On Android every
 * `console.log` reaches logcat. Logcat is read by development tooling, captured by
 * crash reporters and bug-report bundles, and on a shared or second-hand handset it
 * outlives the person who typed the figure. A shopkeeper's day book is his
 * business, and his customers' names are THEIR personal data under the DPDP Act - a
 * log line naming a customer and what he owes is a disclosure nobody consented to
 * and nobody can see happening.
 *
 * THE RULE IS TOTAL, AND DELIBERATELY SO. Not "no amounts in logs" - no logging at
 * all from client code. A rule that permits `console.log('saved')` needs somebody
 * to judge, on every line forever, whether this particular interpolation happens to
 * carry a name. That judgement gets made a hundred times and is wrong once, and the
 * once is the one that ships. A rule with nothing to judge cannot be got wrong.
 *
 * WHEN A REAL LOGGER ARRIVES this check does not get an exemption - it gets
 * REPLACED by one that reads the logger's output after a full day close, which is
 * what B36 asks for and what this cannot yet do, because no log line exists to
 * read. Recorded plainly: the benchmark's wording is "proven by grepping a full day
 * close". The absence of any log statement is a different result from a clean grep,
 * and a stronger one, but it is not the same result and this says so.
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Client code only. What the SERVER may log is B36's sibling, not B36. */
const CLIENT_ROOTS = ['apps/mobile/src'];

/**
 * The sinks that reach logcat. `console` is the obvious one; the others are how a
 * codebase grows a logger without anybody calling it logging.
 */
const SINKS =
  /\b(console\s*\.\s*(log|info|warn|error|debug|trace|table|dir|group|groupCollapsed)|globalThis\s*\.\s*console|process\s*\.\s*(stdout|stderr)\s*\.\s*write)\s*\(/;

const isSource = (f) =>
  /\.(ts|tsx)$/.test(f) && !/\.(spec|test)\.(ts|tsx)$/.test(f) && !/[\\/]test[\\/]/.test(f);

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (isSource(p)) out.push(p);
  }
  return out;
}

const files = CLIENT_ROOTS.flatMap(walk);
const offences = [];

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\r\n').join('\n').split('\n');
  let inBlockComment = false;
  lines.forEach((line, i) => {
    /*
     * Comments are skipped, and this is the one place the check could be fooled: a
     * `console.log` written inside a block comment is not a log line. Skipping is
     * the lesser evil, because the alternative is failing on the prose that
     * EXPLAINS the rule - and a check that fails on its own documentation is a
     * check somebody disables.
     */
    const trimmed = line.trim();
    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false;
      return;
    }
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) inBlockComment = true;
      return;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

    if (SINKS.test(line)) offences.push(file + ':' + (i + 1) + '  ' + trimmed.slice(0, 80));
  });
}

console.log('  client source files: ' + files.length + ' under ' + CLIENT_ROOTS.join(', '));
console.log('  log statements     : ' + offences.length + ' (this must be zero)');

if (offences.length) {
  console.error('\nCLIENT LOGGING (' + offences.length + '):');
  for (const o of offences) console.error('  x    ' + o);
  console.error(
    '\nB36 asks for zero amounts, names or phone numbers in client logs. This build\n' +
      'reaches zero by having no client log statement at all, because a rule that\n' +
      'permits some logging demands a judgement on every line forever. If you need to\n' +
      'see what the app did, put it in the store where a test can read it - the store\n' +
      'is already the only thing that knows anything.',
  );
  process.exit(1);
}

console.log(
  '\nclient-logs: no client code can write to logcat, so no amount, name or phone can reach it',
);
