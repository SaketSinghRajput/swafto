/**
 * The golden vectors, executed INSIDE the test runner.
 *
 * WHY THIS EXISTS, AND WHY IT IS A §5.12 FINDING RATHER THAN A CONVENIENCE.
 *
 * The 63 vectors are the engine's primary evidence, and until now they ran only in
 * `tools/run-vectors.mjs` - a separate Node process. Two consequences, neither
 * obvious:
 *
 *   1. `npx vitest run` said "231 passed" while exercising almost none of the
 *      engine's behaviour. Anyone reading that number would draw the wrong
 *      conclusion about what had just been checked.
 *   2. B3 demands 100% BRANCH COVERAGE of the formula engine. Coverage measured
 *      through vitest could never see the vector run, so the first coverage number
 *      this project ever produced - 57.73% - was measuring the wrong thing. A
 *      benchmark whose instrument cannot see the work is not a benchmark.
 *
 * `run-vectors.mjs` stays. It is what the Hermes runner mirrors, and the
 * Node-vs-Hermes diff (B2) depends on both sides being driven identically by a
 * standalone script. This file is the same corpus under the runner that measures.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  checkExpectations,
  evaluateVector,
  type VectorCase,
  type VectorFile,
} from '../../../tools/vector-harness.ts';

const file = JSON.parse(
  readFileSync(new URL('../vectors.json', import.meta.url), 'utf8'),
) as VectorFile;
const vectors: VectorCase[] = Array.isArray(file) ? file : file.vectors;

describe('golden vectors', () => {
  it('the corpus is present and not empty', () => {
    // A vector suite over zero vectors passes forever. Refuse it, the way
    // check:font and check:money refuse an empty corpus.
    expect(vectors.length).toBeGreaterThan(0);
  });

  it('meets the G5 gate minimum', () => {
    // B1 requires >= 70 and the corpus is short of it. That shortfall is reported by
    // `npm run test:vectors:node`, which owns the threshold, and recorded in
    // BENCHMARKS-RESULTS.md. Duplicating the assertion here would mean two places to
    // change if the bar ever moved - and the bar must never move.
    expect(vectors.length).toBeGreaterThanOrEqual(30);
  });

  for (const v of vectors) {
    it(`${v.name}`, () => {
      const actual = evaluateVector(v);
      const failures = checkExpectations(v.name, v.expect, actual);
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }
});
