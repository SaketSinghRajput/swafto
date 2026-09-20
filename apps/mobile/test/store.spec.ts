/**
 * The store's contract: derive on read, append only, outbox with the write, and a
 * difference that cannot be closed without a reason.
 */
import { describe, it, expect } from 'vitest';
import { Store, memoryPort, AppendOnlyViolation, DayClosedViolation } from '../src/store/index.ts';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';
import { add, subtract, type Entry } from '@swafto/formula-engine';

const freshStore = () => {
  const base = canonicalInput();
  return new Store(
    memoryPort({
      shopId: 'shop-canonical',
      day: base.day,
      entries: base.entries,
      parties: CANONICAL_PARTIES,
      priorCreditOutstanding: base.priorCreditOutstanding,
      priorSupplierOutstanding: base.priorSupplierOutstanding,
      skippedSections: [],
    }),
  );
};

const sale = (id: string, amount: number): Entry =>
  ({
    id, dayId: CANONICAL_DATE, section: 'cash_sales', amount, mode: 'cash',
    source: 'manual', createdAt: `${CANONICAL_DATE}T19:00:00.000Z`,
  }) as Entry;

describe('the store derives on read, and never stores a figure', () => {
  it('a new entry MOVES every figure derived from it - the wired-figure rule', () => {
    const store = freshStore();
    const before = store.primary();
    const beforeExpected = store.expectedCash().value;

    store.append(sale('new-1', 100000));

    const after = store.primary();
    expect(after.p1TotalCashReceived).not.toEqual(before.p1TotalCashReceived);
    expect(store.expectedCash().value).toBe(add(beforeExpected, 100000));
  });

  it('computes fresh each call - no memoisation to go stale', () => {
    const store = freshStore();
    const a = store.expectedCash().value;
    store.append(sale('new-2', 5000));
    expect(store.expectedCash().value).not.toBe(a);
  });

  it('carries the WORKING, so the screen can show the derivation not a verdict', () => {
    expect(freshStore().expectedCash().working.lines.length).toBeGreaterThan(0);
  });
});

describe('append-only is refused here as well as in the database', () => {
  it('refuses a duplicate id', () => {
    const store = freshStore();
    store.append(sale('dupe', 100));
    expect(() => store.append(sale('dupe', 200))).toThrow(AppendOnlyViolation);
  });

  it('refuses an entry into a closed day', () => {
    const store = freshStore();
    store.close(store.expectedCash().value);
    expect(() => store.append(sale('late', 100))).toThrow(DayClosedViolation);
  });

  it('refuses to close a day twice', () => {
    const store = freshStore();
    store.close(store.expectedCash().value);
    expect(() => store.close(1)).toThrow(DayClosedViolation);
  });
});

describe('the outbox is part of the write, not a consequence of it', () => {
  it('queues a row for every appended entry', () => {
    const store = freshStore();
    const before = store.pendingOutbox.length;
    store.append(sale('ob-test', 700));
    expect(store.pendingOutbox.length).toBe(before + 1);
    expect(store.pendingOutbox.at(-1)!.payload).toMatchObject({ id: 'ob-test' });
  });

  it('queues nothing when the append is refused', () => {
    const store = freshStore();
    store.append(sale('once', 100));
    const after = store.pendingOutbox.length;
    expect(() => store.append(sale('once', 100))).toThrow();
    expect(store.pendingOutbox.length).toBe(after);
  });
});

describe('a difference cannot be closed without a reason', () => {
  it('refuses a mismatched count with no reason', () => {
    const store = freshStore();
    expect(() => store.close(subtract(store.expectedCash().value, 25000))).toThrow(/without a reason/);
  });

  it('accepts a mismatched count WITH a reason, and records it', () => {
    const store = freshStore();
    store.close(subtract(store.expectedCash().value, 25000), 'till float miscounted');
    expect(store.state.day.differenceReason).toBe('till float miscounted');
    expect(store.state.day.state).toBe('closed');
  });

  it('accepts a matching count with no reason at all', () => {
    const store = freshStore();
    store.close(store.expectedCash().value);
    expect(store.state.day.differenceReason).toBeUndefined();
  });
});
