/**
 * ADR-017 Decision C, made executable.
 *
 * WHY THIS FILE EXISTS. Entry ids are UUIDv7, which embeds a millisecond timestamp.
 * When a device clock corrects BACKWARDS - and on a shop phone it does - ids issued
 * after the correction sort before ids issued earlier in real time. Anything ordering
 * entries by id, or by `createdAt`, interleaves them wrongly for the width of the
 * correction.
 *
 * ADR-017 tolerates that, on one stated ground: **no figure depends on entry order**.
 * Every total is a `sum`, and sums are order-independent; the ordered outputs that do
 * exist are ordered by VALUE with a deterministic tiebreaker. That ground was
 * established by reading the engine, and a property established by reading is a
 * property that a future refactor silently removes.
 *
 * So it is asserted here, over every vector: permute the entries, recompute, and the
 * entire result must be byte-identical. The day a `.find()` or an `entries[0]` creeps
 * into a figure, this fails - and ADR-017's reversal trigger, adding a monotonic local
 * sequence, becomes due BEFORE the data that would need ordering exists.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluateVector, type VectorCase, type VectorFile } from '../../../tools/vector-harness.ts';

const file = JSON.parse(
  readFileSync(new URL('../vectors.json', import.meta.url), 'utf8'),
) as VectorFile;
const vectors: VectorCase[] = Array.isArray(file) ? file : file.vectors;

/**
 * Key order is irrelevant, ARRAY order is not - an ordered output whose order changed
 * with the input order is exactly the defect being hunted, so arrays are compared as
 * given.
 */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v) ?? 'null';
}

/** Deterministic, seeded, and not the identity for any list of two or more. */
function shuffled<T>(xs: readonly T[]): T[] {
  const out = [...xs];
  let seed = 0x5bd1e995;
  for (let i = out.length - 1; i > 0; i -= 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    // Both indices are in range by construction, but a destructured swap is typed as
    // T | undefined under noUncheckedIndexedAccess. An explicit temp is honest about
    // it without an assertion that would also hide a real out-of-range bug.
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

function withEntries(v: VectorCase, entries: unknown[]): VectorCase {
  return { ...v, input: { ...v.input, entries } } as VectorCase;
}

const entriesOf = (v: VectorCase): unknown[] =>
  ((v.input as unknown as { entries?: unknown[] }).entries ?? []) as unknown[];

describe('ADR-017 C · every figure is independent of entry order', () => {
  const withEntryLists = vectors.filter((v) =>
    Array.isArray((v.input as unknown as { entries?: unknown[] }).entries),
  );
  const permutable = withEntryLists.filter((v) => entriesOf(v).length > 1);

  it('the corpus actually contains entries to permute', () => {
    // A permutation suite over empty lists passes vacuously and proves nothing - the
    // same failure mode as assertPaise at 0/59.
    expect(withEntryLists.length).toBeGreaterThan(0);
    expect(permutable.length).toBeGreaterThan(0);
  });

  for (const v of permutable) {
    it(`${v.name}: reversed and shuffled give identical results`, () => {
      const entries = entriesOf(v);
      const base = stable(evaluateVector(v));
      expect(stable(evaluateVector(withEntries(v, [...entries].reverse())))).toBe(base);
      expect(stable(evaluateVector(withEntries(v, shuffled(entries))))).toBe(base);
    });
  }
});
