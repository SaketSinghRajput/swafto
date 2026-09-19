// BENCHMARKS.md is frozen. Its hash is the contract that stops a threshold being
// quietly lowered to make a build go green. CI fails on any change.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Hash the bytes with CRLF normalised, so a line-ending change on Windows is not
// mistaken for someone editing a threshold.
const text = readFileSync('BENCHMARKS.md', 'utf8').replace(/\r\n/g, '\n');
const hash = createHash('sha256').update(text, 'utf8').digest('hex');

if (process.argv.includes('--write')) {
  writeFileSync('benchmarks.lock', hash + '\n');
  console.log(`benchmarks.lock written: ${hash}`);
  process.exit(0);
}

if (!existsSync('benchmarks.lock')) {
  console.error('benchmarks.lock is missing. BENCHMARKS.md is unprotected.');
  process.exit(1);
}
const locked = readFileSync('benchmarks.lock', 'utf8').trim();
console.log(`BENCHMARKS.md sha256 : ${hash}`);
console.log(`benchmarks.lock      : ${locked}`);
if (hash !== locked) {
  console.error(
    '\nBENCHMARKS.md HAS CHANGED. Thresholds are frozen (amendment §4).\n' +
      'If a threshold is wrong, argue it in DECISIONS-AUTONOMOUS.md and record the\n' +
      'result as BENCHMARK-MISSED — do not move the line.',
  );
  process.exit(1);
}
console.log('frozen               : OK, hash matches');
