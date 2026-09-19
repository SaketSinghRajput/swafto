// Diffs the Node and Hermes result sets. ANY difference fails the build.
// "CI fails if the two runtimes disagree on any vector" - ADR-012 / architecture §02.
import { readFileSync, existsSync } from 'node:fs';

const [a, b] = process.argv.slice(2);
if (!a || !b) { console.error('usage: diff-vectors.mjs <node.json> <hermes.json>'); process.exit(2); }
for (const f of [a, b]) {
  if (!existsSync(f)) { console.error(`missing ${f} - run the vectors on both runtimes first`); process.exit(2); }
}

const A = JSON.parse(readFileSync(a, 'utf8'));
const B = JSON.parse(readFileSync(b, 'utf8'));

const names = [...new Set([...Object.keys(A), ...Object.keys(B)])].sort();
const diffs = [];

for (const name of names) {
  if (!(name in A)) { diffs.push(`${name}: present in ${b} but missing from ${a}`); continue; }
  if (!(name in B)) { diffs.push(`${name}: present in ${a} but missing from ${b}`); continue; }
  const keys = [...new Set([...Object.keys(A[name]), ...Object.keys(B[name])])].sort();
  for (const k of keys) {
    const x = JSON.stringify(A[name][k]);
    const y = JSON.stringify(B[name][k]);
    if (x !== y) diffs.push(`${name}.${k}: node=${x} hermes=${y}`);
  }
}

console.log(`compared       : ${names.length} vectors`);
console.log(`node result    : ${a}`);
console.log(`hermes result  : ${b}`);

if (diffs.length) {
  console.error(`\nRUNTIME DIVERGENCE - ${diffs.length} difference(s). This is a release blocker:`);
  for (const d of diffs.slice(0, 50)) console.error('  x ' + d);
  if (diffs.length > 50) console.error(`  ... and ${diffs.length - 50} more`);
  process.exit(1);
}
console.log('divergence     : NONE. Node and Hermes agree on every value of every vector.');
