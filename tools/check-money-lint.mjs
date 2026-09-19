/**
 * ADR-003's enforcement, running in CI today.
 *
 * Constraint 6: money is integer paise everywhere, LINT-ENFORCED. ADR-003 names the
 * rule, `swafto/no-money-float`, and specifies four clauses. For seventeen iterations
 * it did not exist - ESLint was not installed and there was no config - so a
 * non-negotiable constraint rested on a control that had never run.
 *
 * WHY THIS RUNS THE RULE DIRECTLY INSTEAD OF THROUGH AN ESLINT CONFIG FILE. This
 * repository has a hook that refuses edits to `eslint.config.mjs`, on the sound
 * principle that lint failures get fixed in the source rather than configured away.
 * It cannot distinguish "weakening a config" from "creating the first one", and
 * evading it by choosing a different filename would defeat a guard the owner put
 * there deliberately.
 *
 * So the ENFORCEMENT lands here, inside this repo's own check suite, and the
 * editor-integration config stays an open request to the owner (HUMAN-ACTIONS H11).
 * What matters is that the rule runs and fails the build; which file configures it is
 * a convenience.
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import { noMoneyFloat } from './eslint-rules/no-money-float.mjs';

const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage', 'docs', 'INJECTIONS']);
const ROOTS = ['packages', 'apps', 'tools'];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const n of entries) {
    if (SKIP.has(n) || n.startsWith('.')) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|mjs)$/.test(n)) out.push(p);
  }
  return out;
}

const linter = new Linter();
const config = [
  {
    files: ['**/*.ts', '**/*.mjs'],
    languageOptions: { parser, ecmaVersion: 2023, sourceType: 'module' },
    plugins: { swafto: { rules: { 'no-money-float': noMoneyFloat } } },
    rules: { 'swafto/no-money-float': 'error' },
  },
];

const files = ROOTS.flatMap((r) => walk(r));
if (files.length === 0) {
  // A lint pass over nothing reports success forever. Same refusal as check:font.
  console.error('x    found ZERO source files to lint. A vacuous pass is worse than none.');
  process.exit(1);
}

let problems = 0;
for (const file of files) {
  const source = readFileSync(file, 'utf8').split('\r\n').join('\n');
  // The rule branches on path shape and is written for POSIX separators.
  const messages = linter.verify(source, config, file.split('\\').join('/'));
  for (const m of messages) {
    problems += 1;
    console.error(`  x    ${file}:${m.line}:${m.column}  ${m.message}`);
  }
}

console.log(`  files linted       : ${files.length}`);
console.log('  rule               : swafto/no-money-float (ADR-003, four clauses)');

if (problems) {
  console.error(`\nMONEY LINT FAILURES (${problems})`);
  process.exit(1);
}
console.log('\nmoney lint: no float arithmetic, no coercion, no decimal literals in the engine');
