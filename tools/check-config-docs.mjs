/**
 * 4.4 · THE CONFIGURATION DOCUMENT AND THE CODE MUST AGREE.
 *
 * `docs/infra/CONFIG.md` is what an operator reads before a deploy. A variable the code
 * reads and the document omits is one nobody sets; a variable the document lists and the
 * code ignores is a setting somebody believes is in force. Both are the same lie from
 * opposite ends, so this fails on either.
 *
 *   node tools/check-config-docs.mjs            check (exit 1 on any disagreement)
 *   node tools/check-config-docs.mjs --prove    plant an undocumented variable and a
 *                                               documented-but-unread one, and require
 *                                               both to be caught (exit 1 if either slips)
 *
 * WHAT COUNTS AS "THE CODE READS A VARIABLE": in apps/api/src, `process.env.NAME`,
 * `env.NAME`, `env['NAME']`, and a helper call `required(env, 'NAME')` / `value('NAME')`,
 * plus every name in the `BILLING_ENV` list. Every ALL_CAPS_WITH_UNDERSCORES string
 * literal in config.ts is also treated as a variable, so a new read pattern this regex
 * has never seen still has to be documented rather than being invisible to the check.
 * What is documented: the first backticked name in each row of the table in CONFIG.md.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const SRC = 'apps/api/src';
const DOC = 'docs/infra/CONFIG.md';
const NAME = '[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*';
/** Names that look like variables and are not. Empty today; an entry needs a written reason. */
const NOT_VARS = new Set();

function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

/** Variable names read by one source text. Comments are stripped first, so prose cannot satisfy or trip the check. */
export function varsRead(text, file = '') {
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const found = new Set();
  const add = (m) => {
    if (!NOT_VARS.has(m)) found.add(m);
  };
  for (const m of code.matchAll(new RegExp(`\\b(?:process\\.env|env)\\.(${NAME})\\b`, 'g'))) add(m[1]);
  for (const m of code.matchAll(new RegExp(`\\b(?:process\\.env|env)\\[\\s*['"](${NAME})['"]\\s*\\]`, 'g'))) add(m[1]);
  for (const m of code.matchAll(new RegExp(`\\b(?:required|value|intInRange)\\(\\s*(?:env\\s*,\\s*)?['"](${NAME})['"]`, 'g'))) add(m[1]);
  const list = code.match(/BILLING_ENV\s*=\s*\[([\s\S]*?)\]/);
  if (list) for (const m of list[1].matchAll(new RegExp(`['"](${NAME})['"]`, 'g'))) add(m[1]);
  if (file.endsWith('config.ts')) {
    // Anything shaped like a variable name in a string literal here, whatever reads it.
    for (const m of code.matchAll(new RegExp(`['"](${NAME}_${NAME})['"]`, 'g'))) add(m[1]);
  }
  return found;
}

/** Variable names documented in the table rows of CONFIG.md. */
export function varsDocumented(md) {
  const found = new Set();
  for (const line of md.split('\n')) {
    const m = line.match(new RegExp(`^\\|\\s*\`(${NAME})\``));
    if (m) found.add(m[1]);
  }
  return found;
}

export function compare(read, documented) {
  return {
    undocumented: [...read].filter((v) => !documented.has(v)).sort(),
    unread: [...documented].filter((v) => !read.has(v)).sort(),
  };
}

function collect() {
  const read = new Set();
  for (const f of walk(SRC)) for (const v of varsRead(readFileSync(f, 'utf8'), f)) read.add(v);
  return { read, documented: varsDocumented(readFileSync(DOC, 'utf8')) };
}

function main() {
  const { read, documented } = collect();
  const prove = process.argv.includes('--prove');

  if (prove) {
    // A planted read, and a planted row. Both must be reported or the check has stopped checking.
    const planted = varsRead("const x = env.SWAFTO_PLANTED_UNDOCUMENTED_VAR ?? '1';", 'planted.ts');
    const sources = new Set([...read, ...planted]);
    const a = compare(sources, documented);
    const b = compare(read, new Set([...documented, 'SWAFTO_PLANTED_UNREAD_VAR']));
    const ok =
      a.undocumented.includes('SWAFTO_PLANTED_UNDOCUMENTED_VAR') && b.unread.includes('SWAFTO_PLANTED_UNREAD_VAR');
    console.log(ok ? 'prove: both planted defects were caught' : 'prove: A PLANTED DEFECT SLIPPED THROUGH');
    process.exit(ok ? 0 : 1);
  }

  const { undocumented, unread } = compare(read, documented);
  console.log(`  variables read by the code : ${read.size}`);
  console.log(`  variables documented       : ${documented.size}`);
  if (undocumented.length || unread.length) {
    if (undocumented.length) console.error(`\nREAD BY THE CODE, NOT IN ${DOC}:\n` + undocumented.map((v) => `  x    ${v}`).join('\n'));
    if (unread.length) console.error(`\nIN ${DOC}, NOT READ BY THE CODE:\n` + unread.map((v) => `  x    ${v}`).join('\n'));
    console.error('\nFix the document or the code so they say the same thing. Never delete a row to make this pass while the code still reads the variable.');
    process.exit(1);
  }
  console.log('\nconfig docs: every variable the code reads is documented, and every documented one is read');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
