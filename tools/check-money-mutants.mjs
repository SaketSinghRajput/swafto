/**
 * A.2 - ZERO UNEXPLAINED SURVIVORS IN THE AUDITED MONEY HELPERS.
 *
 * Stricter than B4's 90% and ADDITIONAL to it, not instead of it. B4 stays frozen and
 * is measured as written. But an aggregate score is the wrong instrument for a small,
 * critical surface: twelve arithmetic survivors inside the helpers every rupee passes
 * through would sit comfortably inside a 90% score.
 *
 * WHY THIS EXISTS RATHER THAN STRYKER. Stryker reported all twelve as Survived. Every
 * one is killed by tests that were ALREADY in the suite. Two separate checks of that
 * tool, neither of which it survives:
 *
 *   - its dry run finds 170 of the tests, and the shortfall is NOT the cause: the 170
 *     it does see already contain the killing tests.
 *   - with `coverageAnalysis: all` it prints "Ran all tests for this mutant" and then
 *     reports 8.96 tests per mutant on average.
 *
 * So it selects a handful of tests per mutant while claiming otherwise, and B4/B6
 * therefore have no trustworthy instrument. This file is the trustworthy one for the
 * surface that matters: it plants a real mutant, runs the suite, and requires a
 * failure that was not already failing. Slow and small beats fast and wrong.
 *
 * "The suite" means every test except the two DB-bound specs named in DB_BOUND, which
 * are excluded for determinism and guarded so the exclusion cannot hide a kill. That
 * is a subset, and saying otherwise would be the same sin this file was built to
 * correct, so the run prints exactly what it left out.
 *
 * A.3 - every mutant is either KILLED or carries a written EQUIVALENCE ARGUMENT. There
 * is no third state. If the argument cannot be written, the mutant is not equivalent -
 * it is uncovered, and it needs a test.
 *
 *   node tools/check-money-mutants.mjs            plant each mutant, require a kill
 *   node tools/check-money-mutants.mjs --prove    §5.12: prove the check can fail
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const TARGET = 'packages/formula-engine/src/money.ts';

/**
 * Every arithmetic mutant Stryker generated for the audited helpers, plus the shift
 * operator it could not express. A fourth element may carry an EQUIVALENCE ARGUMENT;
 * none does, because all twelve die. The slot exists so that a future survivor cannot
 * be quietly filed as equivalent without the argument A.3 demands.
 */
const MUTANTS = [
  ['ratio: basis points scale by denominator instead of dividing', '(numeratorPaise * 10000) / denominatorPaise', '(numeratorPaise * 10000) * denominatorPaise'],
  ['ratio: scale down instead of up', '(numeratorPaise * 10000) /', '(numeratorPaise / 10000) /'],
  ['divideMoney: multiply instead of divide', 'const raw = amount / divisor;', 'const raw = amount * divisor;'],
  ['median: ascending sort becomes sort by sum', 'sort((a, b) => a - b)', 'sort((a, b) => a + b)'],
  ['median: wrong neighbour in the even case', 's[mid - 1]!', 's[mid + 1]!'],
  ['median: midpoint doubles instead of halving', 'const mid = s.length >> 1;', 'const mid = s.length << 1;'],
  ['mean: multiply by the count instead of dividing', 'sum(values) / values.length', 'sum(values) * values.length'],
  ['stdev: deviation adds the mean instead of subtracting', 'const d = v - mean;', 'const d = v + mean;'],
  ['stdev: square becomes self-division', 'acc += d * d;', 'acc += d / d;'],
  ['stdev: variance multiplies by the count', 'Math.sqrt(acc / values.length)', 'Math.sqrt(acc * values.length)'],
  ['formatPaise: rupees scale up instead of down', 'const rupees = Math.floor(abs / 100);', 'const rupees = Math.floor(abs * 100);'],
  ['formatPaise: paise remainder becomes a product', 'const fraction = abs % 100;', 'const fraction = abs * 100;'],
];

/**
 * §5.12 - A VERIFIER THAT HAS NEVER FAILED HAS NEVER BEEN VERIFIED.
 *
 * `--prove` swaps the mutant set for a single NO-OP mutation: text replaced by itself.
 * A no-op cannot change behaviour, so no test can newly fail, so this tool must report
 * SURVIVED. If it reports a kill on a no-op, its detection is wired to something other
 * than the mutant and every verdict above is worthless.
 *
 * This is the exact shape of two defects this file has already had - phantom kills from
 * runs that never executed, and kills credited to a database that was not listening.
 * Both would pass a smoke test. Neither passes a no-op plant.
 */
const PROVE = process.argv.includes('--prove');
if (PROVE) {
  const noop = MUTANTS[0][1];
  MUTANTS.length = 0;
  MUTANTS.push(['PROOF: a no-op mutation, which must be reported as a survivor', noop, noop]);
}

if (MUTANTS.length === 0) {
  console.error('x    zero mutants. A mutation check over nothing passes forever.');
  process.exit(1);
}

/**
 * VITEST IS INVOKED AS JAVASCRIPT, NOT AS A SHELL COMMAND.
 *
 * `execFileSync('npx.cmd', ...)` fails instantly on current Node - spawning a .cmd
 * without a shell has been blocked since CVE-2024-27980 - and it fails with EMPTY
 * stdout, so it looks exactly like a suite that ran and printed nothing. The first
 * version of this file reported twelve kills from twelve runs that never happened.
 *
 * `shell: true` would fix it and is forbidden: check-tooling banned it at iteration 15
 * and caught this file's own author using it. Resolving the bin and handing the path
 * to node needs no shell at all.
 */
const VITEST = join(
  dirname(createRequire(import.meta.url).resolve('vitest/package.json')),
  'vitest.mjs',
);
if (!existsSync(VITEST)) {
  console.error(`x    vitest entry not found at ${VITEST}. No mutant can be adjudicated.`);
  process.exit(1);
}

/**
 * WHICH TESTS FAIL, BY NAME - not how many.
 *
 * A RAW COUNT CREDITS THE WRONG FAILURES. The suite is not green in every environment:
 * without DATABASE_URL the Postgres and rate-limit suites fail, and how many of them
 * fail drifts between runs. A mutant "killed" by a database that was not listening has
 * not been killed by anything. So the caller takes a BASELINE unmutated run, and each
 * mutant is credited only with failures that are NEW against it.
 *
 * Vitest emits SGR colour codes through a pipe, so they are stripped before parsing.
 */
/**
 * THE TWO SUITES THAT CANNOT SEE THIS MUTANT, AND THE GUARD THAT PROVES IT.
 *
 * Both need a live Postgres. Without DATABASE_URL they fail, and WHICH of them fail
 * drifts run to run, so baseline subtraction alone still credits a mutant with
 * failures it did not cause - the no-op proof scored 8 phantom kills that way.
 *
 * This is an exemption, and injection 18 B is about exemptions growing. So it is
 * narrow, it is printed, and it is GUARDED: the check refuses to run if either file
 * so much as mentions the module under mutation. The moment one of them could observe
 * money.ts, excluding it could hide a killing test, and the guard fires instead of
 * quietly widening.
 */
const DB_BOUND = ['apps/api/test/rate-limit.spec.ts', 'packages/schema/test/postgres.spec.ts'];
for (const f of DB_BOUND) {
  if (!existsSync(f)) continue;
  if (/formula-engine|money/i.test(readFileSync(f, 'utf8'))) {
    console.error(
      `x    ${f} is excluded as DB-bound, but it references the module under mutation. ` +
        'An exclusion that can hide a killing test is not an exclusion, it is a hole.',
    );
    process.exit(1);
  }
}

function runSuite() {
  let out;
  try {
    const ok = execFileSync(process.execPath, [VITEST, 'run', ...DB_BOUND.flatMap((f) => ['--exclude', f])], {
      stdio: 'pipe',
      timeout: 900000,
      encoding: 'utf8',
    });
    out = `${ok ?? ''}`;
  } catch (e) {
    out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
  const plain = out.replace(/\u001b\[[0-9;]*m/g, '');
  const fails = new Set();
  for (const m of plain.matchAll(/^\s*FAIL\s+(.+?)\s*$/gm)) fails.add(m[1]);
  /*
   * A run that printed no summary line DID NOT RUN, which is a different thing from a
   * run with zero failures. Conflating the two is what let the phantom kills through.
   */
  if (!/^\s*Test Files\s+/m.test(plain)) {
    const tail = plain.trim().split('\n').slice(-6).join(' | ');
    return { ran: false, fails, why: tail.slice(0, 300) || 'no output at all' };
  }
  return { ran: true, fails };
}

const original = readFileSync(TARGET, 'utf8');
const failures = [];
const rows = [];

/* ---- the baseline: what is already failing before anything is planted ---- */
const base = runSuite();
if (!base.ran) {
  console.error(`x    the BASELINE suite did not run, so no mutant can be judged.\n     ${base.why}`);
  process.exit(1);
}
if (base.fails.size > 0) {
  console.log(`  NOTE: ${base.fails.size} suite(s) already failing before any mutant:`);
  for (const f of base.fails) console.log(`        ${f}`);
  console.log('        These are subtracted. A mutant is credited only with NEW failures.');
  console.log('');
}

for (const [name, find, replace, equivalent] of MUTANTS) {
  if (!original.includes(find)) {
    failures.push(
      `"${name}": its anchor is gone from ${TARGET}. Re-derive the mutant rather than ` +
        'deleting it - an anchor that moved is not a mutant that stopped mattering.',
    );
    rows.push([name, 'ANCHOR GONE', 0]);
    continue;
  }

  writeFileSync(TARGET, original.replace(find, replace));
  let result = { ran: false, fails: new Set(), why: 'the suite never ran' };
  try {
    result = runSuite();
  } finally {
    writeFileSync(TARGET, original);
  }
  if (readFileSync(TARGET, 'utf8') !== original) {
    failures.push(`RESTORE FAILED after "${name}" - the tree is left mutated`);
  }

  if (!result.ran) {
    failures.push(
      `"${name}": the suite did not run, so NO verdict exists for this mutant. That is ` +
        `neither a kill nor a survival - it is a broken instrument.\n           ${result.why}`,
    );
    rows.push([name, 'NO VERDICT', -1]);
    continue;
  }

  const fresh = [...result.fails].filter((f) => !base.fails.has(f));
  if (fresh.length === 0) {
    if (equivalent) {
      /*
       * A.3 - equivalence is a real category, and it is also the easiest place to file
       * something inconvenient. It counts here only when the argument is written into
       * the mutant itself, where a reader can disagree with it.
       */
      rows.push([name, 'equivalent', 0, equivalent]);
    } else {
      failures.push(
        `"${name}" SURVIVED the full suite and carries no equivalence argument. A.3: it ` +
          'is either killed or proven equivalent, and an argument that cannot be ' +
          'written means it is uncovered rather than equivalent - it needs a test.',
      );
      rows.push([name, 'SURVIVED', 0]);
    }
    continue;
  }
  rows.push([name, 'killed', fresh.length, fresh[0]]);
}

console.log(`  target                 : ${TARGET}`);
console.log(`  mutants planted        : ${MUTANTS.length}`);
console.log(`  each run against       : every test except ${DB_BOUND.length} DB-bound spec(s)`);
for (const f of DB_BOUND) console.log(`      excluded, guarded    : ${f}`);
console.log('  credited only with     : failures NEW against the unmutated baseline');
console.log('');
for (const [name, verdict, n, note] of rows) {
  /*
   * A.4 / §5.9 - the COUNT matters, not only the verdict. A mutant killed by exactly
   * one test is nearly as fragile as one that survives: delete that test for an
   * unrelated reason and the defect walks back in silently.
   */
  const fragile = verdict === 'killed' && n === 1 ? '   <- ONE test only, as fragile as a survivor' : '';
  const label = verdict === 'killed' ? 'killed' : `** ${verdict} **`;
  console.log(`  ${label} ${n < 0 ? '  ?' : String(n).padStart(3)} new   ${name}${fragile}`);
  if (verdict === 'equivalent') console.log(`             argument: ${note}`);
}

if (PROVE) {
  const survived = rows[0][1] === 'SURVIVED';
  console.log(
    survived
      ? '\nPROVEN: a no-op mutation is reported as a survivor and this check fails on it. ' +
          'Kill detection is wired to a real suite run and to the mutant itself.'
      : `\nNOT PROVEN: a no-op mutation was reported as "${rows[0][1]}". A mutation that ` +
          'changes nothing cannot be killed, so this tool is not measuring what it claims.',
  );
  process.exit(survived ? 0 : 1);
}

if (failures.length) {
  console.error(`\nMONEY MUTANT FAILURES (${failures.length}):`);
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}
console.log('\nmoney mutants: every planted arithmetic defect is killed by a real test');
