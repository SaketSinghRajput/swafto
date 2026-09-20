// Node runner. Evaluates every vector, checks the hand-written expectations, and
// writes the full result set for the cross-runtime diff.
import { readFileSync, writeFileSync } from 'node:fs';
import { evaluateAll, checkExpectations } from './vector-harness.ts';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const outPath = args.out ?? 'reports/vectors-node.json';

const file = JSON.parse(readFileSync('packages/formula-engine/vectors.json', 'utf8'));
const results = evaluateAll(file);

writeFileSync(outPath, JSON.stringify(results, null, 2) + '\n');

let failures = [];
for (const v of file.vectors) {
  failures = failures.concat(checkExpectations(v.name, v.expect, results[v.name]));
}

console.log(`runtime        : node ${process.version}`);
console.log(`vector count   : ${file.vectors.length}`);
console.log(`results written: ${outPath}`);

if (failures.length) {
  console.error(`\nFAILED ${failures.length} expectation(s):`);
  for (const f of failures) console.error('  x ' + f);
  process.exit(1);
}
if (file.vectors.length < 30) {
  console.error(`\nFAILED: ${file.vectors.length} vectors is under the 30 minimum.`);
  process.exit(1);
}
console.log(`expectations   : ALL PASS (${file.vectors.length} vectors, >= 30 required)`);
