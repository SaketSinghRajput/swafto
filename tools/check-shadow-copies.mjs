/**
 * A.2 - AN UNTRACKED SECOND COPY OF THE TREE IS A TEST-DISCOVERY HAZARD.
 *
 * `.stryker-tmp/sandbox-2dFJHU/` was a complete copy of the working tree, untracked
 * and un-ignored, and VITEST FOUND IT. Every test ran twice - 606 reported for a
 * 303-test suite - and the two copies of postgres.spec.ts raced each other against
 * the same database.
 *
 * It existed for about fifteen minutes inside iteration 24, not for seven iterations.
 * See the A.1 sweep in BUILD_LOG iteration 25: the recorded vitest counts at
 * iterations 19 to 22 all read 303, which is the correct undoubled figure, so no
 * sandbox was present then. Fifteen minutes was long enough to produce three false
 * measurements, which is the argument for this check rather than against it.
 *
 * Gitignoring that one directory fixes the instance. This fixes the CLASS: the next
 * tool that leaves a working copy behind will not be Stryker, and it will not be
 * called .stryker-tmp.
 *
 * WHY THE UNIT IS A DIRECTORY, NOT A FILE. "Untracked spec file" would fail the build
 * every time someone writes a new test before staging it, which teaches people to
 * ignore the check - the failure mode §5.10 exists to prevent. A shadow tree is
 * different in kind: a directory where git tracks NOTHING AT ALL, containing a
 * package.json or a spec file. Nobody authors a new test suite inside a directory git
 * has never heard of.
 *
 * WHY .gitignore DOES NOT EXEMPT. .stryker-tmp is gitignored now, and it would still
 * be a hazard if it came back, because vitest does not read .gitignore. Ignored and
 * untracked are the same thing to a test runner. This check treats them the same way.
 *
 *   node tools/check-shadow-copies.mjs            fail on any shadow tree
 *   node tools/check-shadow-copies.mjs --prove    §5.12: plant one, require a failure
 */
import { readdirSync, statSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

/** Directories that are never part of the source tree and never test-discoverable. */
const NEVER = new Set(['.git', 'node_modules']);

/**
 * What makes a directory dangerous rather than merely untracked: something a test
 * runner or a package manager would act on if it found it.
 */
const HAZARD = (name) =>
  name === 'package.json' ||
  name === 'vitest.config.ts' ||
  /\.(spec|test)\.[cm]?[jt]sx?$/.test(name);

if (!existsSync('.git')) {
  console.error('x    no .git here, so "untracked" has no meaning and this check cannot run.');
  process.exit(1);
}

/**
 * The set of directories git knows about. A path is "tracked" if git lists any file
 * under it. -z because a repository is allowed to contain a filename with a newline
 * in it, and a checker defeated by a filename is not a checker.
 */
let tracked;
try {
  const out = execFileSync('git', ['ls-files', '-z'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  tracked = new Set();
  for (const f of out.split('\0')) {
    if (!f) continue;
    const parts = f.split('/');
    for (let i = 1; i < parts.length; i += 1) tracked.add(parts.slice(0, i).join(sep));
  }
} catch (e) {
  console.error(`x    could not ask git what is tracked, so nothing was checked: ${e.message}`);
  process.exit(1);
}

const failures = [];
let dirsWalked = 0;
let shadowDirs = 0;

/** Every hazardous file anywhere beneath an untracked directory. */
function hazardsUnder(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (NEVER.has(n)) continue;
    const p = join(dir, n);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue; // a link to nowhere is not a hazard
    }
    if (st.isDirectory()) hazardsUnder(p, out);
    else if (HAZARD(n)) out.push(p);
  }
  return out;
}

/**
 * Descend through TRACKED directories looking for untracked ones. An untracked
 * directory is examined whole and reported once, rather than descended into looking
 * for more untracked directories inside it.
 */
function scan(dir) {
  dirsWalked += 1;
  for (const n of readdirSync(dir)) {
    if (NEVER.has(n)) continue;
    const p = join(dir, n);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;

    const rel = relative('.', p);
    if (tracked.has(rel)) {
      scan(p);
      continue;
    }

    const hazards = hazardsUnder(p);
    if (hazards.length === 0) continue;
    shadowDirs += 1;
    const shown = hazards.slice(0, 4).map((h) => relative('.', h));
    failures.push(
      `${rel} is untracked and holds ${hazards.length} file(s) a test runner or ` +
        `package manager would act on:\n           ${shown.join('\n           ')}` +
        (hazards.length > shown.length
          ? `\n           ...and ${hazards.length - shown.length} more`
          : '') +
        '\n           A test runner does not read .gitignore. Delete it, or move it ' +
        'outside the repository.',
    );
  }
}

/**
 * §5.12 - a verifier that has never failed has never been verified. `--prove` plants
 * the exact shape that was here - a directory holding a package.json and a spec file -
 * requires the scan to find it, and removes it again.
 */
const PROVE = process.argv.includes('--prove');
const PROOF_ROOT = '.shadow-copies-proof';
if (PROVE) {
  const plant = join(PROOF_ROOT, 'sandbox-xxxxxx');
  mkdirSync(plant, { recursive: true });
  writeFileSync(join(plant, 'package.json'), '{"name":"planted"}\n');
  writeFileSync(join(plant, 'planted.spec.ts'), 'it("planted", () => {});\n');
}

try {
  scan('.');
} finally {
  if (PROVE) rmSync(PROOF_ROOT, { recursive: true, force: true });
}

console.log(`  directories walked     : ${dirsWalked}`);
console.log(`  shadow trees found     : ${shadowDirs}`);
console.log('  a hazard is            : package.json, a spec/test file, or a vitest config');
console.log('  ignored counts as      : untracked - vitest does not read .gitignore');

if (PROVE) {
  const caught = failures.some((f) => f.includes(PROOF_ROOT));
  console.log(
    caught
      ? '\nPROVEN: a planted shadow tree is found and this check fails on it.'
      : '\nNOT PROVEN: a planted shadow tree was NOT found. This check is watching nothing.',
  );
  process.exit(caught ? 0 : 1);
}

if (failures.length) {
  console.error(`\nSHADOW COPIES (${failures.length}):`);
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}
console.log('\nshadow copies: no untracked tree that a test runner could discover');
