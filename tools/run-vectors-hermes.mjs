// Bundles the shared harness and runs it under the REAL Hermes VM — the engine the
// phone actually uses. ADR-012: CI fails if Node and Hermes disagree on any vector.
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }),
);
const outPath = args.out ?? '.vectors-hermes.json';

const HERMES = process.platform === 'win32'
  ? 'node_modules/hermes-engine-cli/win64-bin/hermes.exe'
  : process.platform === 'darwin'
    ? 'node_modules/hermes-engine-cli/osx-bin/hermes'
    : 'node_modules/hermes-engine-cli/linux64-bin/hermes';

if (!existsSync(HERMES)) {
  console.error(`Hermes binary not found at ${HERMES}. Run: npm i -D hermes-engine-cli`);
  process.exit(1);
}

// Bundle. Target es2015 because Hermes 0.12 predates some later syntax; esbuild
// downlevels so we test OUR arithmetic, not esbuild's output shape.
// NOTE: no `shell: true`. On Windows that re-parses argv and mangles the
// forward-slash binary path, which fails with a bare "Command failed". Invoking
// esbuild's own JS entry through node works identically on every platform.
execFileSync(
  process.execPath,
  [
    'node_modules/esbuild/bin/esbuild',
    'tools/hermes-entry.ts',
    '--bundle',
    '--format=iife',
    '--target=es2015',
    '--platform=neutral',
    '--loader:.json=json',
    '--outfile=.hermes-bundle.js',
    '--log-level=warning',
  ],
  { stdio: 'inherit' },
);

const stdout = execFileSync(HERMES, ['.hermes-bundle.js'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});

// Validate it is real JSON before writing, so a Hermes crash cannot masquerade as a
// result file that later "diffs clean".
let parsed;
try { parsed = JSON.parse(stdout); }
catch (e) {
  console.error('Hermes did not emit valid JSON. First 500 chars of output:');
  console.error(stdout.slice(0, 500));
  process.exit(1);
}
const names = Object.keys(parsed);
writeFileSync(outPath, JSON.stringify(parsed, null, 2) + '\n');

const errs = names.filter((n) => parsed[n].__error);
console.log(`runtime        : Hermes (${HERMES})`);
console.log(`vector count   : ${names.length}`);
console.log(`results written: ${outPath}`);
if (errs.length) {
  console.error(`\nFAILED: ${errs.length} vector(s) threw under Hermes:`);
  for (const n of errs) console.error(`  x ${n}: ${parsed[n].__error}`);
  process.exit(1);
}
console.log('hermes run     : no vector threw');
