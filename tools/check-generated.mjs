/**
 * F-08 · Generated artifacts must actually be generated.
 *
 * vectors.json, rejects.json and the SMS tables all come from authoring scripts.
 * Nothing stopped a hand edit surviving indefinitely - and a hand-edited expectation
 * is precisely how a failing vector gets "fixed". The §5.1 failure mode with one
 * extra step.
 *
 * Regenerates everything and fails on any difference from the committed copy.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const GENERATED = [
  { file: 'packages/formula-engine/vectors.json', by: ['--experimental-strip-types', 'tools/author-vectors.ts'] },
  { file: 'packages/formula-engine/rejects.json', by: ['--experimental-strip-types', 'tools/author-rejects.ts'] },
  { file: 'docs/spec/SMS-TEMPLATES.md', by: ['tools/check-sms-segments.mjs', '--update-md'] },
  { file: 'packages/schema/migrations/0001_init.sqlite.up.sql', by: ['--experimental-strip-types', 'tools/emit-sql.mjs'] },
  { file: 'packages/schema/migrations/0001_init.postgres.up.sql', by: ['--experimental-strip-types', 'tools/emit-sql.mjs'] },
  // §5.12: the verifier inventory is generated from the same data the check reads,
  // so the table cannot drift from the thing it documents.
  { file: 'docs/governance/VERIFIERS.md', by: ['tools/check-verifiers.mjs', '--update-md'] },
  { file: 'docs/benchmarks/BENCHMARKS-RESULTS.md', by: ['tools/check-verifiers.mjs', '--update-md'] },
  { file: 'docs/governance/BUILD_STATE.md', by: ['tools/check-verifiers.mjs', '--update-md'] },
  { file: 'README.md', by: ['tools/check-verifiers.mjs', '--update-md'] },
  { file: 'TASKS.md', by: ['tools/gen-tasks.mjs'] },
  { file: 'docs/governance/FINDINGS.md', by: ['tools/check-findings.mjs', '--update-md'] },
];

const before = new Map(GENERATED.map((g) => [g.file, readFileSync(g.file, 'utf8')]));
const ran = new Set();
for (const g of GENERATED) {
  const key = g.by.join(' ');
  if (ran.has(key)) continue;
  ran.add(key);
  execFileSync(process.execPath, g.by, { stdio: ['ignore', 'ignore', 'pipe'] });
}

const drifted = [];
for (const g of GENERATED) {
  const now = readFileSync(g.file, 'utf8');
  if (now !== before.get(g.file)) {
    drifted.push(g.file);
    writeFileSync(g.file, before.get(g.file)); // leave the tree as we found it
  }
}

console.log(`  generated artifacts checked : ${GENERATED.length}`);
if (drifted.length) {
  console.error(
    `\nGENERATED FILES ARE STALE OR HAND-EDITED (${drifted.length}):\n` +
      drifted.map((f) => `  x    ${f}`).join('\n') +
      `\n\nThe authoring script is the source of truth. Re-run it and commit the result;\n` +
      `never edit a generated file by hand - that is how a failing expectation gets\n` +
      `"fixed" instead of investigated.`,
  );
  process.exit(1);
}
console.log('\ngenerated: every artifact matches its authoring script');
