/**
 * ADR-012's enforcement: the formula engine is clock-free, and more than clock-free.
 *
 * CLAUDE.md: "No `new Date()`, no `Date.now()`. 'Today' is always passed in. That is
 * what makes the vector corpus reproducible on any machine in any timezone." Until
 * this check existed that rested on a comment in `dates.ts` and on the vectors
 * happening to pass. A vector run on one machine cannot see a dependency on the
 * clock, the locale, the environment or the filesystem - they are the same on the
 * machine that wrote it.
 *
 * WHAT IT FORBIDS in `packages/formula-engine/src/**`:
 *   - the clock:        Date.now, new Date, Date(), performance (any use)
 *   - randomness:       Math.random
 *   - the locale:       any Intl.*, and every toLocale*() method
 *   - the environment:  process, require, __dirname, __filename, globalThis
 *   - node built-ins:   any import / export-from / import() of `node:*` or a bare
 *                       built-in name (fs, path, os, crypto, ...)
 *
 * WHY THIS READS THE SYNTAX TREE AND NOT THE TEXT. dates.ts, money.ts and
 * intelligence.ts all MENTION `new Date()` and `Intl.NumberFormat` in comments to
 * explain why they are absent. A grep would fail on the explanation of the rule.
 *
 * WHY IT RUNS ESLINT'S CORE RULES THROUGH THE Linter API INSTEAD OF A CONFIG FILE.
 * Same reason as check-money-lint.mjs, which this follows: a hook refuses edits to
 * `eslint.config.mjs` (HUMAN-ACTIONS H11), and routing around it would defeat a
 * guard the owner put there on purpose. The enforcement lives in this repo's own
 * check suite; which file configures an editor is a convenience.
 *
 * SCOPE AXIS (REVIEW.md A12): this guard is scoped by FILE PATH, `packages/formula-engine/src/`.
 * A plant must be a violation INSIDE that tree; the same text anywhere else is
 * correctly ignored.
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { join } from 'node:path';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';

const ROOT = 'packages/formula-engine/src';

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const n of entries) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(n)) out.push(p);
  }
  return out;
}

// Bare names (`fs`, `path`) and their `node:` spellings, plus subpaths (`fs/promises`).
const builtins = [...new Set(builtinModules.filter((m) => !m.startsWith('_')))];
const importBans = {
  paths: builtins.map((name) => ({ name, message: 'ADR-012: the engine imports no node built-in.' })),
  patterns: [
    { group: ['node:*'], message: 'ADR-012: the engine imports no node built-in.' },
    ...builtins.map((b) => ({ group: [`${b}/*`], message: 'ADR-012: no node built-in subpath.' })),
  ],
};

const syntax = (selector, message) => ({ selector, message: `ADR-012: ${message}` });
const restrictedSyntax = [
  syntax("MemberExpression[object.name='Date'][property.name='now']", 'Date.now() reads the clock; "today" is passed in.'),
  syntax("NewExpression[callee.name='Date']", 'new Date() reads the clock or the timezone; use dates.ts.'),
  syntax("CallExpression[callee.name='Date']", 'Date() returns the current time as a string.'),
  syntax("MemberExpression[object.name='Math'][property.name='random']", 'Math.random() is not reproducible.'),
  syntax("MemberExpression[object.name='Intl']", 'Intl.* depends on the runtime locale and ICU build; Hermes differs from Node.'),
  syntax("NewExpression[callee.object.name='Intl']", 'Intl.* depends on the runtime locale and ICU build.'),
  syntax("CallExpression[callee.property.name=/^toLocale/]", 'toLocale*() depends on the runtime locale.'),
  syntax('ImportExpression', 'dynamic import() would bypass the import ban.'),
];

const linter = new Linter();
const config = [
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mjs', '**/*.js'],
    languageOptions: {
      parser,
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-restricted-syntax': ['error', ...restrictedSyntax],
      'no-restricted-imports': ['error', importBans],
      'no-restricted-globals': [
        'error',
        ...['process', 'performance', 'require', '__dirname', '__filename', 'globalThis'].map((name) => ({
          name,
          message: 'ADR-012: the engine reads no environment, no timer and no global object.',
        })),
      ],
    },
  },
];

const files = walk(ROOT);
if (files.length === 0) {
  // A purity pass over nothing reports success forever. Same refusal as check:money.
  console.error(`x    found ZERO engine source files under ${ROOT}. A vacuous pass is worse than none.`);
  process.exit(1);
}

let problems = 0;
for (const file of files) {
  const source = readFileSync(file, 'utf8').split('\r\n').join('\n');
  const messages = linter.verify(source, config, file.split('\\').join('/'));
  for (const m of messages) {
    problems += 1;
    console.error(`  x    ${file}:${m.line}:${m.column}  ${m.message}`);
  }
}

console.log(`  files scanned      : ${files.length}`);
console.log('  rules              : no clock, no randomness, no Intl/locale, no process/env, no node built-ins');

if (problems) {
  console.error(`\nENGINE PURITY FAILURES (${problems})`);
  process.exit(1);
}
console.log('\nengine purity: the formula engine is clock-free and environment-free (ADR-012)');
