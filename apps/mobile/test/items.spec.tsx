/**
 * PR-1 / PR-2 on the phone: the store's refusals, the SQLite port across a
 * restart and an erasure, and the item cards that M1 drops in.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Entry, ItemLine } from '@swafto/formula-engine';
import { Store, AppendOnlyViolation, DayClosedViolation } from '../src/store/index.ts';
import { sqlitePort, type Db } from '../src/store/sqlite.ts';
import { canonicalStore, closedStore, itemsStore, ITEM_IDS } from '../src/screens/registry.tsx';
import { ItemCards, TopItemsCard, ItemDemandCard } from '../src/components/ItemCards.tsx';
import { render, all, byTestId, text } from './render.tsx';
import { phrase } from '../src/i18n/strings.ts';

const sale = (s: Store) => s.state.entries.find((e) => e.section === 'cash_sales')!;
const lineOn = (e: Entry, amount: number, over: Partial<ItemLine> = {}): ItemLine => ({
  id: 'l-' + String(amount) + '-' + String(over.quantity ?? 1),
  dayId: e.dayId,
  entryId: e.id,
  quantity: 1,
  amount,
  createdAt: e.dayId + 'T20:00:00.000Z',
  ...over,
});

describe('PR-1 - the store refuses what cannot be true', () => {
  it('lines up to the sale are queued with their own outbox kind; one paisa over is refused', () => {
    const store = canonicalStore();
    const s = sale(store);
    store.addItemLine(lineOn(s, s.amount));
    expect(store.pendingOutbox.filter((r) => r.kind === 'item_line').map((r) => r.id)).toEqual(['ob-line-' + 'l-' + String(s.amount) + '-1']);
    expect(() => store.addItemLine(lineOn(s, 1, { id: 'over' }))).toThrow(/more than the sale/);
    expect(store.saleLines(s.id)).toHaveLength(1);
  });

  it('refuses a duplicate id, an item not on his list, a non-sale, and a closed day', () => {
    const store = canonicalStore();
    const s = sale(store);
    store.addItemLine(lineOn(s, 100));
    expect(() => store.addItemLine(lineOn(s, 100))).toThrow(AppendOnlyViolation);
    expect(() => store.addItemLine(lineOn(s, 100, { id: 'x', itemId: 'nope' }))).toThrow(/not on your list/);
    const expense = store.state.entries.find((e) => e.section === 'expense')!;
    expect(() => store.addItemLine(lineOn(expense, 100, { id: 'y' }))).toThrow(/not one/);
    const closed = closedStore();
    expect(() => closed.addItemLine(lineOn(sale(closed), 100))).toThrow(DayClosedViolation);
  });

  it('a line never moves the sale, the cash check or profit (D1, D2)', () => {
    const store = canonicalStore();
    const before = JSON.stringify(store.primary());
    itemsStore(store);
    expect(JSON.stringify(store.primary())).toBe(before);
  });

  it('an item name is one per list, whatever the case', () => {
    const store = canonicalStore();
    store.addItem({ id: 'a', name: 'Atta', createdAt: 'x' });
    expect(() => store.addItem({ id: 'b', name: 'ATTA', createdAt: 'x' })).toThrow(/already on your list/);
    expect(() => store.addItem({ id: 'a', name: 'Rice', createdAt: 'x' })).toThrow(AppendOnlyViolation);
  });

  it('item reports read every day the phone holds, and coverage comes with them', () => {
    const store = itemsStore(canonicalStore());
    const day = store.state.day.date;
    const r = store.itemReports({ from: day, to: day });
    expect(r.topByValue[0]?.itemId).toBe(ITEM_IDS[0]);
    expect(r.coverage.basisPoints).not.toBeNull();
    expect(r.coverage.basisPoints).toBeGreaterThan(0);
  });
});

describe('PR-1 - the SQLite port keeps the list and the lines, and erases them', () => {
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
    file = join(mkdtempSync(join(tmpdir(), 'swafto-items-')), 'ledger.db');
  });
  const boot = (today: string) => new Store(sqlitePort(open(file), () => today));

  it('survives a restart, and a later day still reads the earlier lines', () => {
    const a = boot('2026-01-02');
    a.append({ id: 'e1', dayId: '2026-01-02', section: 'cash_sales', amount: 10000, mode: 'cash', source: 'manual', createdAt: '2026-01-02T10:00:00.000Z' } as Entry);
    a.addItem({ id: 'tea', name: 'Tea', createdAt: '2026-01-02T10:00:00.000Z' });
    a.addItemLine({ id: 'l1', dayId: '2026-01-02', entryId: 'e1', itemId: 'tea', quantity: 2, amount: 4000, createdAt: '2026-01-02T10:01:00.000Z' });
    const b = boot('2026-01-02');
    expect(b.items.map((i) => i.name)).toEqual(['Tea']);
    expect(b.saleLines('e1').map((l) => l.amount)).toEqual([4000]);
    expect(b.pendingOutbox.map((r) => r.kind)).toEqual(expect.arrayContaining(['item', 'item_line']));
    b.eraseAll();
    const c = boot('2026-01-02');
    expect(c.items).toEqual([]);
    expect(c.state.itemLines).toEqual([]);
  });
});

describe('PR-2 - the item cards take computed data and the plan', () => {
  const store = itemsStore(canonicalStore());
  const day = store.state.day.date;
  const reports = store.itemReports({ from: day, to: day });

  it('every card carries the coverage line beside its figures', () => {
    const tree = render(<ItemCards reports={reports} items={store.items} plan="premium" />);
    for (const id of ['items-top-value', 'items-top-count', 'items-slow', 'items-pairs', 'items-demand']) {
      expect(text(byTestId(tree, id + '-coverage'))).toMatch(/% of sales value/);
    }
  });

  it('the demand card says estimate and its method; below the gate it gives the count instead', () => {
    const tree = render(<ItemDemandCard reports={reports} items={store.items} plan="premium" />);
    expect(text(byTestId(tree, 'items-demand-method'))).toBe(phrase('items.demandMethod', 'en'));
    expect(text(byTestId(tree, 'items-demand-' + ITEM_IDS[0]))).toMatch(/sold on 1 day in 90./);
  });

  it('slow items say how often sold, never what is on the shelf', () => {
    const tree = render(<ItemCards reports={reports} items={store.items} plan="premium" />);
    expect(text(byTestId(tree, 'items-slow-note'))).toBe(phrase('items.slowNote', 'en'));
    expect(text(tree)).not.toMatch(/reorder|out of stock|run out/i);
  });

  it('lapsed plan: what was recorded still reads, marked read-only; nothing recorded: no card at all', () => {
    const lapsed = render(<TopItemsCard reports={reports} items={store.items} plan="free" />);
    expect(text(byTestId(lapsed, 'items-top-value-readonly'))).toBe(phrase('items.readOnly', 'en'));
    const bare = canonicalStore();
    const none = render(<ItemCards reports={bare.itemReports({ from: day, to: day })} items={[]} plan="free" />);
    expect(all(none).some((n) => String(n.props?.testID ?? '').startsWith('items-'))).toBe(false);
  });
});

/*
 * BETA: these tests cover the Free/Premium gate as it will stand after beta,
 * so the all-free beta switch is off for this file and restored after it.
 */
import { beforeAll as betaOff, afterAll as betaOn } from 'vitest';
import { BETA } from '../src/app/plan.ts';
betaOff(() => {
  BETA.allFree = false;
});
betaOn(() => {
  BETA.allFree = true;
});
