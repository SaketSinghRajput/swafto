/**
 * §5.10 - a lesson recorded twice becomes a MECHANISM.
 *
 * I corrupted a JavaScript escape sequence by patching it with a Python string
 * replacement, recorded the lesson in BUILD_LOG, and then did exactly the same thing
 * one iteration later. A note in a log does not change behaviour. This does.
 *
 * Two classes of self-inflicted failure are now impossible to commit:
 *
 *  1. CROSS-LANGUAGE STRING SURGERY. No tool in this repo may edit a source file by
 *     string substitution from another language. Escape sequences belong to the
 *     language that owns them: a backslash-n inside a Python string becomes a real
 *     newline, which silently splits a JavaScript comment or breaks a regex.
 *     Whole-file rewrite or a real parser - nothing in between.
 *
 *  2. PLATFORM ASSUMPTIONS. Using the POSIX null device as an output path on Windows
 *     creates a literal file named "nul", which later broke `git add` with an opaque
 *     mmap error. This repo is built on Windows and will run in CI on Linux;
 *     assumptions from either platform get caught here.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const read = (f) => readFileSync(f, 'utf8').split('\r\n').join('\n');
const failures = [];
const ok = [];
const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage']);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n) || n.startsWith('.')) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const all = walk('tools').concat(walk('scripts'));

/* ---- 1 · no cross-language string surgery ------------------------------ */
// A Python/shell/Ruby file that opens a source file for WRITING is doing string
// surgery on a language whose escaping it does not understand.
const SOURCE_EXT = /\.(ts|tsx|js|mjs|cjs|json|ya?ml)\b/;
let surgery = 0;
for (const f of all.filter((x) => /\.(py|sh|ps1|rb|pl)$/.test(x))) {
  const src = read(f);
  const writesSource =
    /open\s*\([^)]*['"]w['"]/.test(src) || /writeFileSync|>\s*\S+\.(ts|tsx|js|mjs)\b/.test(src);
  if (writesSource && SOURCE_EXT.test(src)) {
    surgery += 1;
    failures.push(
      `${f} edits a source file from another language. Escape sequences belong to the ` +
        `language that owns them - use a whole-file rewrite or a real parser (§5.10.2).`,
    );
  }
}
if (surgery === 0) ok.push('no cross-language string surgery in tooling');

/* ---- 2 · platform assumptions ------------------------------------------ */
const NULL_DEVICE = ['/dev', 'null'].join('/');
const PLATFORM_TRAPS = [
  [
    new RegExp(`--out=${NULL_DEVICE}`),
    `the POSIX null device as an output path - creates a literal "nul" file on Windows`,
  ],
  [
    /\bshell:\s*true\b/,
    'shell:true in execFileSync - re-parses argv and mangles forward-slash paths on Windows',
  ],
];
let platform = 0;
for (const f of all.filter((x) => /\.(mjs|js|ts)$/.test(x))) {
  if (f.endsWith('check-tooling.mjs')) continue; // it names the traps in order to detect them
  read(f)
    .split('\n')
    .forEach((line, i) => {
      const t = line.trimStart();
      if (t.startsWith('//') || t.startsWith('*')) return;
      for (const [re, why] of PLATFORM_TRAPS) {
        if (re.test(line)) {
          platform += 1;
          failures.push(`${f}:${i + 1} ${why} (§5.10.3)`);
        }
      }
    });
}
if (platform === 0) ok.push('no known platform assumptions in tooling');

/* ---- 3 · the artifacts those traps produce must never survive ---------- */
let stray = 0;
for (const name of ['nul', 'NUL', 'con', 'aux', 'prn']) {
  if (existsSync(name) && statSync(name).isFile()) {
    stray += 1;
    failures.push(
      `a file named "${name}" exists in the repo root - a Windows reserved device ` +
        `name, almost certainly from a POSIX redirect. It breaks git.`,
    );
  }
}
if (stray === 0) ok.push('no Windows reserved-name files in the tree');

console.log(`  tooling files scanned : ${all.length}`);
for (const o of ok) console.log(`  ok   ${o}`);
if (failures.length) {
  console.error(`\nTOOLING FAILURES (${failures.length}):`);
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}
console.log('\ntooling: no cross-language surgery, no known platform traps');
