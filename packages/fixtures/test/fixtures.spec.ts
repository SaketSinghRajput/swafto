/**
 * A FIXTURE IS ONLY USEFUL IF IT IS STILL WHAT IT CLAIMS TO BE.
 *
 * Both shops carry properties that screens and benchmarks depend on - the canonical
 * one balances; the adversarial one crosses the lakh threshold, has a gap day, a
 * correction against a closed day and a skipped section. Nothing stops someone
 * tidying one of those away while every screen test keeps passing, because a screen
 * test asserts the screen, not the shop.
 *
 * So the shops assert themselves. These check PROPERTIES, never figures: the moment a
 * test here asserts a total, the fixture has grown a second source of truth for
 * arithmetic the engine owns.
 */
import { describe, it, expect } from 'vitest';
import {
  computePrimary,
  expectedCashBalance,
  formatPaise,
  subtract,
  type Entry,
} from '@swafto/formula-engine';
import {
  canonicalInput,
  adversarialInput,
  closedCanonical,
  closedAdversarialWithDifference,
  CANONICAL_ENTRIES,
  CANONICAL_PARTIES,
  ADVERSARIAL_ENTRIES,
  ADVERSARIAL_PARTIES,
  ADVERSARIAL_CLOSED_DATE,
} from '../src/index.ts';

describe('the canonical shop is an ordinary day', () => {
  it('balances: closing it takes the engine figure, so counted equals expected', () => {
    const closed = closedCanonical();
    expect(closed.day.countedCash).toBe(expectedCashBalance(canonicalInput()).value);
    expect(closed.day.state).toBe('closed');
  });

  it('has an entry in every section a real Thursday would have', () => {
    const sections = new Set(CANONICAL_ENTRIES.map((e) => e.section));
    for (const s of [
      'cash_sales',
      'upi_sales',
      'udhar_sales',
      'udhar_collection',
      'purchase',
      'party_payment',
      'expense',
      'withdrawal',
    ]) {
      expect(sections.has(s as Entry['section']), `no ${s} entry`).toBe(true);
    }
  });

  it('carries an opening balance, unlike the adversarial shop', () => {
    expect(canonicalInput().day.openingCash).not.toBeNull();
  });

  it('every party it references exists', () => {
    const ids = new Set(CANONICAL_PARTIES.map((p) => p.id));
    for (const e of CANONICAL_ENTRIES) {
      if (e.partyId) expect(ids.has(e.partyId), `${e.id} names a missing party`).toBe(true);
    }
  });
});

describe('the adversarial shop is actually adversarial', () => {
  const input = adversarialInput();

  it('crosses the lakh threshold, where Indian grouping diverges from Western (DC-002)', () => {
    const biggest = Math.max(...ADVERSARIAL_ENTRIES.map((e) => e.amount));
    expect(biggest).toBeGreaterThanOrEqual(10_000_000); // one lakh rupees, in paise
    // And the formatter must actually group it the Indian way at that size.
    expect(formatPaise(10_000_000)).toContain('1,00,000');
  });

  it('has a sub-rupee amount, so rounding and alignment are exercised', () => {
    expect(ADVERSARIAL_ENTRIES.some((e) => e.amount < 100)).toBe(true);
  });

  it('has NO opening cash, because the day before was a gap the app refuses to guess', () => {
    expect(input.day.openingCash).toBeNull();
  });

  it('carries a correction against a day that is already closed (D7)', () => {
    const correction = ADVERSARIAL_ENTRIES.find((e) => e.correctsDayId);
    expect(correction, 'no correction entry').toBeDefined();
    expect(correction!.correctsDayId).toBe(ADVERSARIAL_CLOSED_DATE);
    expect(correction!.dayId).not.toBe(ADVERSARIAL_CLOSED_DATE);
  });

  it('has a SKIPPED section, which is not the same as an untouched one (D8)', () => {
    expect(input.day.skippedSections.length).toBeGreaterThan(0);
    const skipped = input.day.skippedSections[0]!;
    expect(ADVERSARIAL_ENTRIES.some((e) => e.section === skipped)).toBe(false);
  });

  it('has an imported entry, the path F-04 found unexercised', () => {
    expect(ADVERSARIAL_ENTRIES.some((e) => e.source === 'imported')).toBe(true);
  });

  it('has a party name longer than any name in the canonical shop', () => {
    const longest = Math.max(...ADVERSARIAL_PARTIES.map((p) => p.name.length));
    const canonicalLongest = Math.max(...CANONICAL_PARTIES.map((p) => p.name.length));
    expect(longest).toBeGreaterThan(canonicalLongest);
  });

  it('has an overdue supplier due date, so the aging vocabulary has something to say', () => {
    const due = ADVERSARIAL_ENTRIES.find((e) => e.dueDate);
    expect(due).toBeDefined();
    expect(due!.dueDate! < input.day.date).toBe(true);
  });

  it('closes SHORT by exactly the offset asked for, whatever the expected total is', () => {
    const short = 25000;
    const closed = closedAdversarialWithDifference(short);
    expect(subtract(expectedCashBalance(input).value, closed.day.countedCash!)).toBe(short);
  });
});

describe('neither fixture stores a figure the engine owns', () => {
  it('both shops compute, and every primary output is integer paise', () => {
    for (const input of [canonicalInput(), adversarialInput()]) {
      const p = computePrimary(input);
      /*
       * Not a specific value. Asserting one here would be exactly the second source
       * of truth these fixtures exist to avoid - the engine owns the arithmetic.
       */
      for (const [k, v] of Object.entries(p)) {
        if (typeof v === 'number') {
          expect(Number.isInteger(v), `${k} is not an integer`).toBe(true);
        }
      }
    }
  });
});
