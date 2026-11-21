/**
 * CANCEL THIS ENTRY - THE PHONE'S HALF (docs/design/CANCEL-ENTRY-GATE.md sections 4 and 7).
 *
 * Driven through the real Session, Store, Host and screens. A cancel is a new
 * row naming the entry it cancels; `liveEntries` drops both before any figure
 * is derived, and the original stays in the list, struck through.
 */
import { describe, it, expect } from 'vitest';
import { Session } from '../src/app/session.tsx';
import { App } from '../src/app/App.tsx';
import { Host } from '../src/host.tsx';
import { FormA } from '../src/screens/T7.tsx';
import { Store, memoryPort, PartyKindMismatch, type StoreState } from '../src/store/index.ts';
import { canonicalStore, returnsStore, RETURN_IDS } from '../src/screens/registry.tsx';
import { FORM_A_COMMITS } from '../src/screens/entryRoutes.ts';
import { phrase } from '../src/i18n/strings.ts';
import { render, byTestId, all, text } from './render.tsx';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';
import type { Entry } from '@swafto/formula-engine';

const T0 = CANONICAL_DATE + 'T10:00:00.000Z';
const TOKENS = {
  accessToken: 'a',
  refreshToken: 'r',
  deviceId: '33333333-3333-4333-8333-000000000001',
  shopId: '11111111-1111-4111-8111-000000000001',
};
const customer = CANONICAL_PARTIES.find((p) => p.kind === 'customer')!;
const supplier = CANONICAL_PARTIES.find((p) => p.kind === 'supplier')!;

const state = (): StoreState => {
  const base = canonicalInput();
  return {
    shopId: TOKENS.shopId,
    shopName: 'Test Store QA',
    day: { ...base.day, state: 'open', openingCash: 500000 },
    entries: [],
    parties: CANONICAL_PARTIES,
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
    skippedSections: [],
  };
};

const uuid = (n: number) => '5a1e0000-0000-4000-8000-' + String(n).padStart(12, '0');

function session(store = new Store(memoryPort(state()), () => T0)): Session {
  let n = 100;
  return new Session(store, { now: () => T0, newId: () => uuid(++n) });
}

const sale = (n: number, section: Entry['section'], amount: number, mode: Entry['mode'], partyId?: string): Entry =>
  ({
    id: uuid(n),
    dayId: CANONICAL_DATE,
    section,
    amount,
    mode,
    source: 'manual',
    createdAt: T0,
    ...(partyId ? { partyId } : {}),
  }) as Entry;

const tree = (s: Session) => render(<App session={s} />);
const ids = (s: Session) =>
  all(tree(s))
    .map((n) => String(n.props?.testID ?? ''))
    .filter(Boolean);

/** Open Sales, tap the line, confirm - the way the phone does it. */
const cancelOnT7 = (s: Session, entryId: string) => {
  s.openSection('cash_sales');
  byTestId(tree(s), `t7-line-${entryId}`).props.onPress();
  byTestId(tree(s), 't7-cancel-yes').props.onPress();
};

describe('a cancelled pair is gone from every figure, and the original stays in view', () => {
  it('Today, the ledger, the reports and the items exclude both rows', () => {
    const store = new Store(memoryPort(state()), () => T0);
    const cash = sale(1, 'cash_sales', 500000, 'cash');
    const udhar = sale(2, 'udhar_sales', 70000, 'udhar', customer.id);
    store.append(cash);
    store.append(udhar);
    store.addItem({ id: 'item-atta', name: 'Atta 5kg', createdAt: T0 });
    store.addItemLine({ id: 'line-1', dayId: CANONICAL_DATE, entryId: cash.id, itemId: 'item-atta', quantity: 2, amount: 500000, createdAt: T0 });
    const period = { from: CANONICAL_DATE, to: CANONICAL_DATE };
    expect(store.primary().p4NetSales.value).toBe(570000);
    expect(store.itemReports(period).topByValue.length).toBe(1);

    const s = session(store);
    cancelOnT7(s, cash.id);
    cancelOnT7(s, udhar.id);
    expect(store.state.entries.filter((e) => e.cancelsEntryId !== undefined)).toHaveLength(2);

    // Today
    expect(store.primary().p4NetSales.value).toBe(0);
    expect(store.expectedCash().value).toBe(500000);
    expect(store.live).toHaveLength(0);
    expect(store.sectionState('cash_sales')).toBe('untouched');
    // the ledger
    expect(store.partyBalance(customer.id)).toBe(0);
    expect(store.partyLedger(customer.id)).toHaveLength(0);
    expect(store.primary().p7CreditOutstanding.value).toBe(0);
    // the reports
    const basic = store.basicReports();
    expect(basic.customerDues.total).toBe(0);
    expect(basic.months[0]!.netSales).toBe(0);
    // the items
    expect(store.itemReports(period).topByValue.length).toBe(0);
    // the raw record keeps all four rows (D1)
    expect(store.allEntries()).toHaveLength(4);
  });

  it('the original is struck through with "cancelled", and the cancel row is not a line of its own', () => {
    const store = new Store(memoryPort(state()), () => T0);
    const cash = sale(1, 'cash_sales', 25000, 'cash');
    store.append(cash);
    const s = session(store);
    cancelOnT7(s, cash.id);
    const t = tree(s);
    const line = byTestId(t, `t7-line-${cash.id}`);
    expect(text(line)).toContain(phrase('cancel.cancelled', 'en'));
    const struck = all(line).filter((n) => n.props?.style?.textDecorationLine === 'line-through');
    expect(struck.length).toBeGreaterThanOrEqual(2); // the label and the figure
    const cancelRow = store.cancelOf(cash.id)!;
    expect(all(t).some((n) => n.props?.testID === `t7-line-${cancelRow.id}`)).toBe(false);
    // and it can not be cancelled twice: the line no longer offers it
    expect(byTestId(t, `t7-line-${cash.id}`).props.onPress).toBeUndefined();
  });
});

describe('where the action is offered', () => {
  it('a closed day offers no cancel: the lines are not tappable', () => {
    const store = new Store(memoryPort(state()), () => T0);
    const cash = sale(1, 'cash_sales', 25000, 'cash');
    store.append(cash);
    store.close(store.expectedCash().value);
    const t = render(<FormA store={store} cancel={{ asking: null, justCancelled: null, onAsk: () => {}, onConfirm: () => {}, onDismiss: () => {}, onEnterAgain: () => {} }} />);
    expect(byTestId(t, `t7-line-${cash.id}`).props.onPress).toBeUndefined();
    // and the store refuses one all the same, in words
    expect(() => store.cancel({ targetId: cash.id, id: uuid(9), createdAt: T0 })).toThrow(/closed/);
  });

  it('a sale with a return on it: no cancel button, "Cancel the return first" instead', () => {
    const store = returnsStore(canonicalStore());
    const saleId = store.findEntry(RETURN_IDS.partial)!.refersToEntryId!;
    const s = session(store);
    s.openSection('cash_sales');
    byTestId(tree(s), `t7-line-${saleId}`).props.onPress();
    const t = tree(s);
    expect(text(byTestId(t, 't7-cancel-sheet'))).toContain(phrase('cancel.linkedFirst', 'en'));
    expect(all(t).some((n) => n.props?.testID === 't7-cancel-yes')).toBe(false);
    expect(store.cancelOf(saleId)).toBeUndefined();
  });

  it('the confirm shows what is being cancelled, and Keep it writes nothing', () => {
    const store = new Store(memoryPort(state()), () => T0);
    const cash = sale(1, 'cash_sales', 25000, 'cash');
    store.append(cash);
    const s = session(store);
    s.openSection('cash_sales');
    byTestId(tree(s), `t7-line-${cash.id}`).props.onPress();
    expect(text(byTestId(tree(s), 't7-cancel-target'))).toContain('₹250.00');
    byTestId(tree(s), 't7-cancel-keep').props.onPress();
    expect(store.state.entries).toHaveLength(1);
    expect(s.state.cancelAsk).toBeNull();
  });
});

describe('one tap, one cancel', () => {
  it('a double tap on "Cancel this entry" writes one cancel row', () => {
    const store = new Store(memoryPort(state()), () => T0);
    const cash = sale(1, 'cash_sales', 25000, 'cash');
    store.append(cash);
    const s = session(store);
    s.openSection('cash_sales');
    byTestId(tree(s), `t7-line-${cash.id}`).props.onPress();
    const yes = byTestId(tree(s), 't7-cancel-yes').props.onPress;
    yes();
    yes(); // the same rendered button, pressed again before a re-render
    expect(store.state.entries.filter((e) => e.cancelsEntryId === cash.id)).toHaveLength(1);
    expect(s.state.lastRefusal).toBeNull();
  });
});

describe('"Enter it again correctly" brings back the section and mode, never the amount', () => {
  it('the UPI segment is chosen, the amount and the person are empty', () => {
    const store = new Store(memoryPort(state()), () => T0);
    const upi = sale(1, 'upi_sales', 40000, 'upi');
    store.append(upi);
    const s = session(store);
    cancelOnT7(s, upi.id);
    s.press('9'); // something on the pad before he asks
    byTestId(tree(s), 't7-enter-again').props.onPress();
    expect(s.state.selectedCommit).toBe(FORM_A_COMMITS.findIndex((c) => c.section === 'upi_sales'));
    expect(s.state.draftPaise).toBeNull();
    expect(s.state.entryPartyId).toBeNull();
    expect(s.state.screen).toBe('T7');
  });
});

describe('the cancel travels like any entry', () => {
  const memoryStorage = (initial: string | null = null) => {
    let held = initial;
    return { read: () => held, write: (v: string | null) => void (held = v) };
  };
  const boot = (answer: () => { status: number; body: unknown } | 'offline') => {
    const store = new Store(memoryPort(state()), () => T0);
    const sent: unknown[] = [];
    const host = new Host({
      baseUrl: 'https://api.example.test',
      fetch: async (url, init) => {
        const a = answer();
        if (a === 'offline') throw new TypeError('Network request failed');
        if (url.endsWith('/v1/sync/push')) sent.push(JSON.parse(init.body ?? '{}'));
        return { status: a.status, text: async () => JSON.stringify(a.body) };
      },
      storage: memoryStorage(JSON.stringify(TOKENS)),
      store,
      now: () => T0,
      newId: () => uuid(500),
    });
    return { host, store, sent };
  };
  const ok = { status: 200, body: { daysWritten: 1, entriesInserted: 1, entriesAlreadyPresent: 0, rejected: [] } };

  it('offline: the cancel waits in the queue, and goes - with cancelsEntryId - when there is signal', async () => {
    let online = false;
    const { host, store, sent } = boot(() => (online ? ok : 'offline'));
    const cash = sale(1, 'cash_sales', 25000, 'cash');
    store.append(cash);
    const cancel = store.cancel({ targetId: cash.id, id: uuid(2), createdAt: T0 });
    expect((await host.sync()).offline).toBe(true);
    expect(store.pendingOutbox.some((r) => r.id === 'ob-' + cancel.id)).toBe(true);
    online = true;
    await host.sync();
    expect(store.pendingOutbox).toHaveLength(0);
    const pushed = (sent.at(-1) as { entries: Entry[] }).entries.find((e) => e.id === cancel.id)!;
    expect(pushed.cancelsEntryId).toBe(cash.id);
    expect(pushed.amount).toBe(cash.amount);
    expect(pushed.refersToEntryId).toBeUndefined();
  });

  it('cancel_target_missing stays queued; a permanent refusal is parked', async () => {
    let field = 'cancel_target_missing';
    let cancelId = '';
    const { host, store } = boot(() => ({
      status: 200,
      body: { daysWritten: 1, entriesInserted: 1, entriesAlreadyPresent: 0, rejected: [{ id: cancelId, field, message: 'x' }] },
    }));
    const cash = sale(1, 'cash_sales', 25000, 'cash');
    store.append(cash);
    cancelId = store.cancel({ targetId: cash.id, id: uuid(2), createdAt: T0 }).id;
    await host.sync();
    expect(store.pendingOutbox.some((r) => r.id === 'ob-' + cancelId)).toBe(true);
    expect(store.parkedOutbox).toHaveLength(0);

    field = 'already_cancelled';
    await host.sync();
    expect(store.pendingOutbox.some((r) => r.id === 'ob-' + cancelId)).toBe(false);
    expect(store.parkedOutbox.map((r) => r.id)).toContain('ob-' + cancelId);
  });
});

describe('refusals are said in words, never as codes', () => {
  // Each permanent code gets its OWN sentence - not the generic "not saved".
  const WORDS: Readonly<Record<string, Parameters<typeof phrase>[0]>> = {
    has_linked_entries: 'cancel.linkedFirst',
    already_cancelled: 'cancel.refusal.already',
    cancel_of_cancel: 'cancel.refusal.already',
    target_cancelled: 'cancel.refusal.already',
    cancel_event_leg: 'cancel.refusal.cannot',
    cancel_mismatch: 'cancel.refusal.cannot',
    cancel_other_day: 't3.banner',
    entries_closed_day: 't3.banner',
    party_kind_mismatch: 'refusal.partyKind',
  };
  for (const [code, key] of Object.entries(WORDS)) {
    it(code, () => {
      const s = session();
      s.openSection('cash_sales');
      s.refuse(code, 'raw engine words');
      const t = text(byTestId(tree(s), 'refusal'));
      expect(t).toContain(phrase(key, 'en'));
      expect(t).not.toContain(code);
      expect(t).not.toContain('raw engine words');
    });
  }
});

describe('party_kind_mismatch is refused on the phone, before anything is queued', () => {
  it('a supplier payment naming a customer is not saved and not queued', () => {
    const store = new Store(memoryPort(state()), () => T0);
    const before = store.pendingOutbox.length;
    expect(() => store.append(sale(1, 'party_payment', 30000, 'cash', customer.id))).toThrow(PartyKindMismatch);
    expect(store.state.entries).toHaveLength(0);
    expect(store.pendingOutbox.length).toBe(before);
    // the right kind goes through
    store.append(sale(2, 'party_payment', 30000, 'cash', supplier.id));
    expect(store.state.entries).toHaveLength(1);
  });
});
