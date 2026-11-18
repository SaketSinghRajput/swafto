/**
 * §2.2 UPI CHECK and §2.4 TYPED ADJUSTMENTS on the phone: the store, the SQLite
 * port across a restart, the session, and the four screens that show them.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { subtract, add, buildReturnEvent, type Entry, type Adjustment } from '@swafto/formula-engine';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';
import { Store, memoryPort, AppendOnlyViolation, DayClosedViolation } from '../src/store/index.ts';
import { sqlitePort, type Db } from '../src/store/sqlite.ts';
import { Session } from '../src/app/session.tsx';
import { DayCloseList } from '../src/screens/T5.tsx';
import { DayClosed } from '../src/screens/T14.tsx';
import { CashBalanced } from '../src/screens/T13.tsx';
import { render, byTestId, all, text } from './render.tsx';

const T0 = CANONICAL_DATE + 'T21:00:00.000Z';
const UPI_ID = 'c-03'; // the canonical day's one UPI sale, ₹2,640

const store = () => {
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
    () => T0,
  );
};
const upiSale = (id: string, amount: number): Entry =>
  ({
    id, dayId: CANONICAL_DATE, section: 'upi_sales', amount, mode: 'upi',
    source: 'manual', createdAt: CANONICAL_DATE + 'T20:00:00.000Z',
  }) as Entry;
const confirmation = (entryId: string, id = 'u-' + entryId) => ({
  id, dayId: CANONICAL_DATE, entryId, confirmedAt: T0,
});
const fake = (id: string, amount: number): Adjustment => ({
  id, dayId: CANONICAL_DATE, type: 'counterfeit_note', amount, createdAt: T0,
});
const session = (s = store()) => {
  let n = 0;
  return new Session(s, { now: () => T0, newId: () => 'id-' + String(++n) });
};

describe('the store: a confirmation is its own append-only fact (D1)', () => {
  it('starts not checked, and one tick makes the day checked - without touching the entry', () => {
    const s = store();
    expect(s.upiCheck().status).toBe('not_checked');
    const before = JSON.stringify(s.state.entries);
    s.confirmUpi([confirmation(UPI_ID)]);
    expect(s.upiCheck().status).toBe('checked');
    expect(JSON.stringify(s.state.entries)).toBe(before);
    expect(s.pendingOutbox.map((r) => r.kind)).toEqual(['day', 'upi_confirmation']);
  });

  it('never moves the cash equation (D2)', () => {
    const s = store();
    const cash = s.expectedCash();
    s.confirmUpi([confirmation(UPI_ID)]);
    expect(s.expectedCash()).toEqual(cash);
  });

  it('refuses a cash entry, a receipt already ticked, and a closed day', () => {
    const s = store();
    expect(() => s.confirmUpi([confirmation('c-01')])).toThrow(/UPI receipts/);
    s.confirmUpi([confirmation(UPI_ID)]);
    expect(() => s.confirmUpi([confirmation(UPI_ID, 'again')])).toThrow(AppendOnlyViolation);
    const closed = store();
    closed.close(closed.expectedCash().value);
    expect(() => closed.confirmUpi([confirmation(UPI_ID)])).toThrow(DayClosedViolation);
  });
});

describe('the store: a typed adjustment moves expected cash, so it moves the close', () => {
  it('a fake note takes its value off expected cash, and the day closes balanced against that', () => {
    const s = store();
    const before = s.expectedCash().value;
    s.addAdjustment(fake('a1', 50000));
    expect(s.expectedCash().value).toBe(subtract(before, 50000));
    s.close(subtract(before, 50000)); // no reason needed: it matches
    expect(s.state.day.state).toBe('closed');
  });

  it('refuses a duplicate id and a closed day', () => {
    const s = store();
    s.addAdjustment(fake('a1', 100));
    expect(() => s.addAdjustment(fake('a1', 100))).toThrow(AppendOnlyViolation);
    s.close(s.expectedCash().value);
    expect(() => s.addAdjustment(fake('a2', 100))).toThrow(DayClosedViolation);
  });
});

describe('the SQLite port keeps both across a restart', () => {
  const open = (file: string): Db => {
    const db = new DatabaseSync(file);
    return {
      executeSync(sql, params = []) {
        const st = db.prepare(sql);
        if (/^\s*select/i.test(sql)) return { rows: st.all(...(params as never[])) };
        st.run(...(params as never[]));
        return { rows: [] };
      },
    };
  };
  let file: string;
  beforeEach(() => {
    file = join(mkdtempSync(join(tmpdir(), 'swafto-facts-')), 'ledger.db');
  });

  it('a confirmation and an adjustment survive a cold start, and erase takes them', () => {
    const day = '2026-01-02';
    const a = new Store(sqlitePort(open(file), () => day));
    a.setOpeningCash(100000);
    a.append({ ...upiSale('e1', 30000), dayId: day });
    a.confirmUpi([{ ...confirmation('e1'), dayId: day }]);
    a.addAdjustment({ ...fake('a1', 5000), dayId: day });

    const b = new Store(sqlitePort(open(file), () => day));
    expect(b.upiCheck().status).toBe('checked');
    expect(b.expectedCash().value).toBe(95000);
    // Order inside one push does not matter (the route writes days first); what is queued does.
    expect(b.pendingOutbox.map((r) => r.kind).sort()).toEqual(['adjustment', 'day', 'entry', 'upi_confirmation']);

    b.eraseAll();
    const c = new Store(sqlitePort(open(file), () => day));
    expect(c.state.adjustments).toEqual([]);
    expect(c.state.upiConfirmations).toEqual([]);
  });
});

describe('the session: per payment and in bulk', () => {
  it('bulk confirms exactly the receipts it names, under one batch id', () => {
    const s = store();
    s.append(upiSale('u2', 70000));
    const ses = session(s);
    expect(ses.confirmUpi(s.upiCheck().unconfirmed.map((e) => e.id))).toBe(true);
    const cs = s.state.upiConfirmations ?? [];
    expect(cs.map((c) => c.entryId)).toEqual([UPI_ID, 'u2']);
    expect(new Set(cs.map((c) => c.batchId)).size).toBe(1);
    expect(cs[0]!.batchId).toBeDefined();
    // A payment typed after the bulk tap is not covered by it.
    s.append(upiSale('u3', 1000));
    expect(s.upiCheck().status).toBe('partly_checked');
  });

  it('a refused tick is a refusal on screen, not a crash', () => {
    const ses = session();
    expect(ses.confirmUpi(['c-01'])).toBe(false);
    expect(ses.state.lastRefusal?.field).toBe('upi');
  });

  // T19's own cases (a type and a keypad amount; back is T5) live in src/screens/T19.test.tsx.
});

describe('the screens say "UPI not checked" until it is', () => {
  it('T5: the per-payment tick and the bulk tap both report the receipts they name', () => {
    const calls: (readonly string[])[] = [];
    const tree = render(<DayCloseList store={store()} onConfirmUpi={(ids) => calls.push(ids)} />);
    expect(text(byTestId(tree, 't5-upi-status'))).toBe('UPI not checked');
    (byTestId(tree, 't5-upi-receipt-' + UPI_ID + '-tick').props.onPress as () => void)();
    (byTestId(tree, 't5-upi-all').props.onPress as () => void)();
    expect(calls).toEqual([[UPI_ID], [UPI_ID]]);
  });

  it('T5: an exchange difference paid by UPI is a receipt of its own, named as one, and confirmable', () => {
    const s = store();
    const sale = s.findEntry(UPI_ID)!;
    const legs = buildReturnEvent({
      sale, ledger: [], dayId: CANONICAL_DATE, createdAt: T0, ids: ['x-r', 'x-o', 'x-m'],
      returned: 10000, settlement: 'exchange', replacement: 25000, differenceMode: 'upi',
    });
    s.appendEvent(legs);
    expect(s.upiCheck().receiptCount).toBe(2);
    const tree = render(<DayCloseList store={s} onConfirmUpi={() => {}} />);
    expect(text(byTestId(tree, 't5-upi-receipt-x-m-amount'))).toMatch(/Exchange difference received/);
    s.confirmUpi([confirmation(UPI_ID), confirmation('x-m')]);
    expect(s.upiCheck()).toMatchObject({ status: 'checked', difference: 0 });
  });

  it('T5: once checked, nothing is left to tick', () => {
    const s = store();
    s.confirmUpi([confirmation(UPI_ID)]);
    const tree = render(<DayCloseList store={s} onConfirmUpi={() => {}} />);
    expect(text(byTestId(tree, 't5-upi-status'))).toBe('All UPI payments checked');
    expect(all(tree).some((n) => n.props?.testID === 't5-upi-all')).toBe(false);
  });

  it('T13 and T14 state the check and offer no tick', () => {
    const s = store();
    const t13 = render(<CashBalanced store={s} countedPaise={s.expectedCash().value} />);
    expect(text(byTestId(t13, 't13-upi-status'))).toBe('UPI not checked');
    s.close(s.expectedCash().value);
    const t14 = render(<DayClosed store={s} />);
    expect(text(byTestId(t14, 't14-upi-status'))).toBe('UPI not checked');
    expect(all(t14).some((n) => String(n.props?.testID ?? '').endsWith('-tick'))).toBe(false);
  });

  it('T5: an adjustment is listed, and its cash effect is a line on the working', () => {
    const s = store();
    s.addAdjustment(fake('a1', 50000));
    const tree = render(<DayCloseList store={s} onAddAdjustment={() => {}} />);
    expect(text(byTestId(tree, 't5-adjust-a1'))).toMatch(/Fake note received/);
    expect(s.expectedCash().working.lines.at(-1)?.key).toBe('adjustment.counterfeit_note');
    expect(add(s.expectedCash().value, 50000)).toBe(store().expectedCash().value);
  });
});
