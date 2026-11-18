/**
 * HT-33: "waiting to sync" counted outbox ROWS, and every entry drags its day
 * row along - so two sales read "3 waiting to sync".
 */
import { describe, it, expect } from 'vitest';
import { Store, memoryPort, type StoreState } from '../src/store/index.ts';
import { syncLine } from '../src/components/DayParts.tsx';
import { strings } from '../src/i18n/strings.ts';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';
import type { Entry } from '@swafto/formula-engine';

const T0 = CANONICAL_DATE + 'T09:00:00.000Z';
const s = strings('en');

const store = () => {
  const base = canonicalInput();
  const state: StoreState = {
    shopId: 'shop-canonical',
    day: { ...base.day, state: 'open', openingCash: null },
    entries: [],
    parties: CANONICAL_PARTIES,
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
    skippedSections: [],
  };
  return new Store(memoryPort(state), () => T0);
};

const sale = (n: number): Entry =>
  ({
    id: '5a1e0000-0000-4000-8000-' + String(n).padStart(12, '0'),
    dayId: CANONICAL_DATE,
    section: 'cash_sales',
    amount: 10000,
    mode: 'cash',
    source: 'manual',
    createdAt: T0,
  }) as Entry;

describe('HT-33 - the sync line counts what he typed', () => {
  it('nothing queued is all saved', () => {
    expect(syncLine(store(), s)).toBe(s('t1.saved'));
  });

  it('two sales are two, not three', () => {
    const st = store();
    st.append(sale(1));
    st.append(sale(2));
    expect(st.pendingOutbox.length).toBe(3); // the day row is there...
    expect(syncLine(st, s)).toBe('2 waiting to sync'); // ...and not counted
  });

  it('a day-only change still says one thing is waiting', () => {
    const st = store();
    st.skip('expense');
    expect(st.pendingOutbox.every((r) => r.kind === 'day')).toBe(true);
    expect(syncLine(st, s)).toBe('1 waiting to sync');
  });
});
