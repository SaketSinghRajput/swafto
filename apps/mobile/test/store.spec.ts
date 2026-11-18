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
  it('queues a row for every appended entry, and the day it belongs to', () => {
    const store = freshStore();
    const entriesBefore = store.pendingOutbox.filter((r) => r.kind === 'entry').length;
    store.append(sale('ob-test', 700));

    const rows = store.pendingOutbox;
    expect(rows.filter((r) => r.kind === 'entry')).toHaveLength(entriesBefore + 1);
    expect(rows.at(-1)!.payload).toMatchObject({ id: 'ob-test' });
    /*
     * The day goes with it. The server refuses an entry for a day it has never
     * heard of - correctly - and until this row existed the FIRST entry of
     * every day was refused and retried forever.
     */
    expect(rows.filter((r) => r.kind === 'day')).toHaveLength(1);

    // A second entry does not queue a second copy of the same day.
    store.append(sale('ob-test-2', 800));
    expect(store.pendingOutbox.filter((r) => r.kind === 'day')).toHaveLength(1);
  });

  it('queues nothing when the append is refused', () => {
    const store = freshStore();
    store.append(sale('once', 100));
    const after = store.pendingOutbox.length;
    expect(() => store.append(sale('once', 100))).toThrow();
    expect(store.pendingOutbox.length).toBe(after);
  });

  it('QUEUES THE DAY TOO - closing was invisible to the server until it did', () => {
    /*
     * The defect this case exists for: `putDay` wrote the day and queued
     * nothing, so the opening cash and the close - the two figures the product
     * is for - reached the server only if an entry happened to be queued
     * alongside. A day closed on a phone that then broke was a day the server
     * never heard about, and nothing failed.
     */
    const store = freshStore();
    store.close(store.expectedCash().value);
    const row = store.pendingOutbox.find((r) => r.kind === 'day');
    expect(row).toBeTruthy();
    expect(row!.payload).toMatchObject({ state: 'closed', date: CANONICAL_DATE });
  });

  it('one row per day, carrying the latest record rather than every step', () => {
    const base = canonicalInput();
    const store = new Store(
      memoryPort({
        shopId: 'shop-canonical',
        day: { ...base.day, openingCash: null },
        entries: base.entries,
        parties: CANONICAL_PARTIES,
        priorCreditOutstanding: base.priorCreditOutstanding,
        priorSupplierOutstanding: base.priorSupplierOutstanding,
        skippedSections: [],
      }),
      () => `${CANONICAL_DATE}T19:30:00.000Z`,
    );
    store.setOpeningCash(100000);
    store.close(store.expectedCash().value);
    const dayRows = store.pendingOutbox.filter((r) => r.kind === 'day');
    // A day record is the whole state, not a delta: the superseded one is noise.
    expect(dayRows).toHaveLength(1);
    expect(dayRows[0]!.payload).toMatchObject({ state: 'closed', openingCash: 100000 });
  });

  it('records WHEN it was closed, from the injected clock', () => {
    const at = `${CANONICAL_DATE}T20:15:00.000Z`;
    const base = canonicalInput();
    const store = new Store(
      memoryPort({
        shopId: 'shop-canonical',
        day: base.day,
        entries: base.entries,
        parties: CANONICAL_PARTIES,
        priorCreditOutstanding: base.priorCreditOutstanding,
        priorSupplierOutstanding: base.priorSupplierOutstanding,
        skippedSections: [],
      }),
      () => at,
    );
    store.close(store.expectedCash().value);
    expect(store.state.day.closedAt).toBe(at);
  });

  it('acking drops only what the server took, and a failed drain loses nothing', () => {
    const store = freshStore();
    store.append(sale('ack-1', 100));
    store.append(sale('ack-2', 200));
    const [first, second] = store.pendingOutbox.slice(-2);

    store.ackOutbox([first!.id]);
    expect(store.pendingOutbox.map((r) => r.id)).toContain(second!.id);
    expect(store.pendingOutbox.map((r) => r.id)).not.toContain(first!.id);

    // An id the server never acknowledged is not quietly forgotten.
    store.ackOutbox(['ob-never-sent']);
    expect(store.pendingOutbox.map((r) => r.id)).toContain(second!.id);
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

describe('a party ledger carries the sign the section implies, never the amount', () => {
  const partyEntry = (
    id: string,
    section: Entry['section'],
    amount: number,
    partyId: string,
  ): Entry =>
    ({
      id,
      dayId: CANONICAL_DATE,
      section,
      amount,
      mode: section === 'udhar_sales' || section === 'purchase' ? 'udhar' : 'cash',
      partyId,
      source: 'manual',
      createdAt: `${CANONICAL_DATE}T19:00:00.000Z`,
    }) as Entry;

  it('udhar given raises what a customer owes; a collection lowers it', () => {
    const store = freshStore();
    const before = store.partyMovementToday('p-ramesh');

    store.append(partyEntry('pm-1', 'udhar_sales', 50000, 'p-ramesh'));
    const afterSale = store.partyMovementToday('p-ramesh');
    expect(afterSale).toBe(add(before, 50000));

    store.append(partyEntry('pm-2', 'udhar_collection', 20000, 'p-ramesh'));
    expect(store.partyMovementToday('p-ramesh')).toBe(subtract(afterSale, 20000));
  });

  it('a purchase raises what we owe a supplier; a payment lowers it', () => {
    const store = freshStore();
    const before = store.partyMovementToday('p-wholesale');

    store.append(partyEntry('pm-3', 'purchase', 80000, 'p-wholesale'));
    expect(store.partyMovementToday('p-wholesale')).toBe(add(before, 80000));

    store.append(partyEntry('pm-4', 'party_payment', 80000, 'p-wholesale'));
    expect(store.partyMovementToday('p-wholesale')).toBe(before);
  });

  /*
   * THE ONE THAT WOULD HAVE BEEN WRONG IF THE SIGN CAME FROM THE AMOUNT.
   *
   * Every amount in this system is non-negative - the sign is carried by the
   * section (types.ts:56). A party whose whole day is a collection must
   * therefore go NEGATIVE, and an implementation that summed amounts would
   * return a positive figure and tell the shopkeeper a man who paid him owes
   * him more.
   */
  it('a day of nothing but collection leaves the customer owing LESS, not more', () => {
    const store = freshStore();
    const before = store.partyMovementToday('p-sunita');
    store.append(partyEntry('pm-5', 'udhar_collection', 30000, 'p-sunita'));
    const after = store.partyMovementToday('p-sunita');
    expect(after).toBe(subtract(before, 30000));
    expect(after).toBeLessThan(before);
  });

  it('a party with no entries today has moved by nothing, and that is 0 not null', () => {
    expect(freshStore().partyMovementToday('p-nobody')).toBe(0);
  });

  it('sections that name no party never reach a party ledger', () => {
    const store = freshStore();
    const before = store.partyMovementToday('p-ramesh');
    // A cash sale has no partyId at all, and a withdrawal is the owner's own.
    store.append(sale('pm-6', 99999));
    expect(store.partyMovementToday('p-ramesh')).toBe(before);
    expect(store.partyEntries('p-ramesh').some((e) => e.section === 'cash_sales')).toBe(false);
  });
});
