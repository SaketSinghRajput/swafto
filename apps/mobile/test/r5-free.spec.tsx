/**
 * R5 FR-1, FR-2, FR-4, FR-5, FR-6 - the free features, against the real store.
 *
 * Every expected figure is worked by hand from the entries written here, never
 * read back from the code under test.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DayRecord, Entry, Party } from '@swafto/formula-engine';
import { Store, memoryPort, PartyKindMismatch, AppendOnlyViolation, type StoreState } from '../src/store/index.ts';
import { sqlitePort, type Db } from '../src/store/sqlite.ts';
import { Session } from '../src/app/session.tsx';
import { App } from '../src/app/App.tsx';
import {
  accountantCsv,
  exportMonths,
  reminderText,
  rupees,
  statementText,
  whatsappNumber,
  whatsappUrls,
} from '../src/app/share.ts';
import { Today } from '../src/screens/T1.tsx';
import { FormB } from '../src/screens/T8.tsx';
import { CustomerDetail } from '../src/screens/P2.tsx';
import { render, all, byTestId, text } from './render.tsx';
import { phrase } from '../src/i18n/strings.ts';
import { ApiClient, type HttpRequest } from '../src/net/client.ts';

const RAMESH: Party = { id: 'p-ramesh', kind: 'customer', name: 'Ramesh', phone: '9876543210' };
const SUNITA: Party = { id: 'p-sunita', kind: 'customer', name: 'Sunita' };
const MEERA: Party = { id: 'p-meera', kind: 'customer', name: 'Meera' };
const GUPTA: Party = { id: 'p-gupta', kind: 'supplier', name: 'Gupta Wholesale' };
const PARTIES = [RAMESH, SUNITA, MEERA, GUPTA];

let n = 0;
const e = (dayId: string, section: Entry['section'], amount: number, mode: Entry['mode'], partyId?: string, extra: Partial<Entry> = {}): Entry =>
  ({
    id: 'e' + String((n += 1)),
    dayId,
    section,
    amount,
    mode,
    source: 'manual',
    createdAt: dayId + 'T10:00:00.000Z',
    ...(partyId ? { partyId } : {}),
    ...extra,
  }) as Entry;

const TODAY = '2026-10-26';
const day = (date: string, state: DayRecord['state'] = 'closed'): DayRecord => ({
  date,
  state,
  openingCash: 0,
  countedCash: state === 'closed' ? 0 : null,
  skippedSections: [],
});

/*
 * THE BOOK, worked by hand:
 *   Ramesh: +1,000.00 (09-20), -1,000.00 (09-25) -> 0, then +500.00 (10-10),
 *           +250.50 today                        -> owes 750.50 since 10-10
 *   Sunita: +300.00 (10-01)                     -> owes 300.00 since 10-01
 *   Meera:  +200.00 (10-01)                     -> owes 200.00 since 10-01
 *   Gupta (supplier): udhar purchase 4,000.00 (09-20), paid 1,000.00 (10-10)
 */
const book = (): Store => {
  n = 0;
  const pastEntries = [
    e('2026-09-20', 'udhar_sales', 100000, 'udhar', 'p-ramesh'),
    e('2026-09-20', 'purchase', 400000, 'udhar', 'p-gupta'),
    e('2026-09-25', 'udhar_collection', 100000, 'cash', 'p-ramesh'),
    e('2026-10-01', 'udhar_sales', 30000, 'udhar', 'p-sunita'),
    e('2026-10-01', 'udhar_sales', 20000, 'udhar', 'p-meera'),
    e('2026-10-10', 'udhar_sales', 50000, 'udhar', 'p-ramesh'),
    e('2026-10-10', 'party_payment', 100000, 'cash', 'p-gupta'),
    e('2026-10-10', 'expense', 1500, 'cash', undefined, { label: '=HYPERLINK("x")' }),
  ];
  const state: StoreState = {
    shopId: 'shop',
    shopName: 'Sharma Kirana',
    day: day(TODAY, 'open'),
    entries: [e(TODAY, 'udhar_sales', 25050, 'udhar', 'p-ramesh')],
    parties: PARTIES,
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
    skippedSections: [],
    pastDays: [day('2026-09-20'), day('2026-09-25'), day('2026-10-01'), day('2026-10-10')],
    pastEntries,
  };
  return new Store(memoryPort(state), () => TODAY + 'T12:00:00.000+05:30');
};

const sessionOn = (store: Store, language: 'en' | 'hi' | 'or' = 'en') => {
  let id = 0;
  return new Session(store, { language, now: () => TODAY + 'T12:00:00.000+05:30', newId: () => 'id-' + String((id += 1)) });
};

describe('the all-days balance and the dues list (FR-1, FR-2, FR-5)', () => {
  it('a balance is every day this phone holds, through partyEffect', () => {
    const s = book();
    expect(s.partyBalance('p-ramesh')).toBe(75050);
    expect(s.partyBalance('p-sunita')).toBe(30000);
    // A supplier: 4,000 owed on udhar, 1,000 paid -> the shop owes 3,000.
    expect(s.partyBalance('p-gupta')).toBe(300000);
    // Today's movement is still today's only.
    expect(s.partyMovementToday('p-ramesh')).toBe(25050);
  });

  it('dues are customers only, oldest debt first, a settled debt does not make a fresh one old', () => {
    const dues = book().customerDues();
    // Sunita and Meera since 10-01 (larger first), Ramesh since 10-10 - NOT 09-20,
    // because his balance went back to zero on 09-25.
    expect(dues.map((d) => [d.partyId, d.amount, d.since])).toEqual([
      ['p-sunita', 30000, '2026-10-01'],
      ['p-meera', 20000, '2026-10-01'],
      ['p-ramesh', 75050, '2026-10-10'],
    ]);
  });

  it('T1 shows the top few, oldest first, with their age; tapping opens the customer', () => {
    const store = book();
    const session = sessionOn(store);
    const tree = render(<Today store={store} onOpenParty={(id) => session.openParty(id)} />);
    const rows = all(tree)
      .map((x) => String(x.props?.testID ?? ''))
      .filter((id) => /^t1-collect-p-[a-z]+$/.test(id));
    expect(rows).toEqual(['t1-collect-p-sunita', 't1-collect-p-meera', 't1-collect-p-ramesh']);
    // 10-01 to 10-26 is 25 days.
    expect(text(byTestId(tree, 't1-collect-p-sunita-age'))).toBe('Owing for 25 days');
    byTestId(tree, 't1-collect-p-ramesh').props.onPress();
    expect(session.state.screen).toBe('P2');
    expect(session.state.partyId).toBe('p-ramesh');
  });

  it('nobody owes, no card', () => {
    const store = new Store(
      memoryPort({
        shopId: 's',
        day: day(TODAY, 'open'),
        entries: [],
        parties: PARTIES,
        priorCreditOutstanding: 0,
        priorSupplierOutstanding: 0,
        skippedSections: [],
      }),
    );
    expect(all(render(<Today store={store} />)).some((x) => x.props?.testID === 't1-collect')).toBe(false);
  });
});

describe('FR-1 · the WhatsApp reminder, from his own phone', () => {
  it('the number is 91 and ten digits, or nothing', () => {
    expect(whatsappNumber('9876543210')).toBe('919876543210');
    expect(whatsappNumber('+91 98765 43210')).toBe('919876543210');
    expect(whatsappNumber('09876543210')).toBe('919876543210');
    expect(whatsappNumber('12345678')).toBeNull();
    expect(whatsappNumber(undefined)).toBeNull();
  });

  it('the app link first, the web link second, the text encoded once', () => {
    const u = whatsappUrls('919876543210', 'Due ₹750.50 & thanks');
    expect(u.app).toBe('whatsapp://send?phone=919876543210&text=' + encodeURIComponent('Due ₹750.50 & thanks'));
    expect(u.web).toBe('https://wa.me/919876543210?text=' + encodeURIComponent('Due ₹750.50 & thanks'));
  });

  it('polite, with the shop and the amount, in the shop language', () => {
    const t = reminderText('en', { shopName: 'Sharma Kirana', partyName: 'Ramesh', amount: 75050 });
    expect(t).toBe(
      'Namaste Ramesh. This is Sharma Kirana. Your account with us shows ₹750.50 due. Please pay when you can. Thank you.',
    );
    expect(reminderText('or', { shopName: 'Sharma Kirana', partyName: 'Ramesh', amount: 75050 })).toContain('₹750.50');
    expect(reminderText('hi', { shopName: '', partyName: 'Ramesh', amount: 100 })).not.toContain('{shop}');
  });

  it('from P2 through the session: the all-days amount, opened by the host, nothing sent here', () => {
    const store = book();
    const session = sessionOn(store);
    session.openParty('p-ramesh');
    const opened: { app: string; web: string }[] = [];
    const tree = render(<App session={session} onOpenWhatsApp={(u) => opened.push(u)} />);
    byTestId(tree, 'p2-remind').props.onPress();
    expect(opened).toHaveLength(1);
    expect(decodeURIComponent(opened[0]!.app)).toContain('₹750.50');
    expect(opened[0]!.app.startsWith('whatsapp://send?phone=919876543210&text=')).toBe(true);
    expect(store.pendingOutbox.some((r) => /remind|whatsapp/i.test(r.kind))).toBe(false);
  });

  it('no phone saved: the row says so, and the tap says so again instead of opening anything', () => {
    const store = book();
    const session = sessionOn(store);
    session.openParty('p-sunita');
    const opened: unknown[] = [];
    const tree = render(<App session={session} onOpenWhatsApp={(u) => opened.push(u)} />);
    expect(text(byTestId(tree, 'p2-remind-detail'))).toBe(phrase('p2.noPhone', 'en'));
    byTestId(tree, 'p2-remind').props.onPress();
    expect(opened).toEqual([]);
    expect(session.state.lastRefusal?.field).toBe('noPhone');
  });

  it('nothing due: no reminder row at all', () => {
    const store = book();
    store.append(e(TODAY, 'udhar_collection', 30000, 'cash', 'p-sunita'));
    const tree = render(<CustomerDetail store={store} partyId="p-sunita" />);
    expect(all(tree).some((x) => x.props?.testID === 'p2-remind')).toBe(false);
  });
});

describe('FR-2 · the statement, as text', () => {
  it('each line with the balance after it, ending at the all-days balance', () => {
    const store = book();
    const t = statementText('en', {
      shopName: 'Sharma Kirana',
      party: RAMESH,
      ledger: store.partyLedger('p-ramesh'),
      asOf: TODAY,
    });
    const lines = t.split('\n');
    expect(lines.slice(0, 4)).toEqual([
      'Sharma Kirana',
      'Account of Ramesh',
      'As on 2026-10-26',
      phrase('s5.notTax', 'en'),
    ]);
    expect(lines).toContain('2026-09-20  Credit sales  +₹1,000.00  Balance ₹1,000.00');
    expect(lines).toContain('2026-09-25  Udhar collected · Cash  -₹1,000.00  Balance ₹0.00');
    expect(lines).toContain('2026-10-26  Credit sales  +₹250.50  Balance ₹750.50');
    expect(lines.at(-1)).toBe('Balance due: ₹750.50');
  });

  it('P2 hands the same text to the share sheet', () => {
    const store = book();
    const session = sessionOn(store);
    session.openParty('p-ramesh');
    const shared: string[] = [];
    byTestId(render(<App session={session} onShareText={(x) => shared.push(x)} />), 'p2-statement').props.onPress();
    expect(shared).toHaveLength(1);
    expect(shared[0]).toContain('Balance due: ₹750.50');
  });
});

describe('FR-4 · the accountant CSV', () => {
  const csv = () =>
    accountantCsv('en', {
      month: '2026-10',
      shopName: 'Sharma Kirana',
      entries: book().allEntries(),
      parties: PARTIES,
    });

  it('rupees with two decimals from paise, no grouping comma, no float', () => {
    expect(rupees(25050)).toBe('250.50');
    expect(rupees(123456789)).toBe('1234567.89');
    expect(rupees(5)).toBe('0.05');
  });

  it('a BOM, the not-a-tax-document line, the header, and that month only', () => {
    const rows = csv().split('\r\n');
    expect(rows[0]!.startsWith('﻿' + phrase('s5.notTax', 'en'))).toBe(true);
    expect(rows[1]).toBe('"Entries 2026-10, Sharma Kirana"');
    expect(rows[2]).toBe('date,section_code,section,mode,party,party_kind,amount_inr,label,corrects_day,refers_to_entry');
    const data = rows.slice(3, rows.indexOf(''));
    expect(data.every((r) => r.startsWith('2026-10-'))).toBe(true);
    expect(data).toContain('2026-10-26,udhar_sales,Credit sales,udhar,Ramesh,customer,250.50,,,');
    expect(data).toHaveLength(6);
  });

  it('a typed cell cannot become a spreadsheet formula', () => {
    expect(csv()).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv()).not.toContain(',=HYPERLINK');
  });

  it('balances stand at the end of the chosen month, over every earlier day', () => {
    const rows = csv().split('\r\n');
    const balances = rows.slice(rows.indexOf('party,kind,balance_inr') + 1).filter(Boolean);
    expect(balances).toEqual([
      'Ramesh,customer,750.50',
      'Sunita,customer,300.00',
      'Meera,customer,200.00',
      'Gupta Wholesale,supplier,3000.00',
    ]);
    const sept = accountantCsv('en', { month: '2026-09', shopName: '', entries: book().allEntries(), parties: PARTIES });
    // At the end of September Ramesh had paid back to zero; Gupta was owed 4,000.
    expect(sept).toContain('Ramesh,customer,0.00');
    expect(sept).toContain('Gupta Wholesale,supplier,4000.00');
  });

  it('S12 lists the months with entries and hands a .csv file to the host', () => {
    expect(exportMonths(book().allEntries().map((x) => x.dayId))).toEqual(['2026-10', '2026-09']);
    const store = book();
    const session = sessionOn(store);
    session.goTo('S1');
    byTestId(render(<App session={session} />), 's1-export').props.onPress();
    expect(session.state.screen).toBe('S12');
    const files: [string, string][] = [];
    byTestId(render(<App session={session} onShareFile={(f, t) => files.push([f, t])} />), 's12-month-2026-10').props.onPress();
    expect(files.map(([f]) => f)).toEqual(['swafto-entries-2026-10.csv']);
    expect(files[0]![1]).toContain('Ramesh,customer,750.50');
    expect(session.back()).toBe(true);
    expect(session.state.screen).toBe('S1');
  });
});

describe('FR-6 · a credit limit, observed and never enforced', () => {
  const limit = (id: string, partyId: string, l: number | null) => ({ id, partyId, limit: l, setAt: TODAY + 'T09:00:00.000Z' });

  it('append-only: a new row each time, the newest in force, queued for sync', () => {
    const s = book();
    s.setCreditLimit(limit('l1', 'p-ramesh', 100000));
    s.setCreditLimit(limit('l2', 'p-ramesh', 80000));
    expect(s.creditLimit('p-ramesh')).toBe(80000);
    expect(s.state.creditLimits?.map((l) => l.id)).toEqual(['l1', 'l2']);
    expect(s.pendingOutbox.filter((r) => r.kind === 'credit_limit').map((r) => r.id)).toEqual([
      'ob-limit-l1',
      'ob-limit-l2',
    ]);
    s.setCreditLimit(limit('l3', 'p-ramesh', null));
    expect(s.creditLimit('p-ramesh')).toBeNull();
    expect(() => s.setCreditLimit(limit('l3', 'p-ramesh', 1))).toThrow(AppendOnlyViolation);
    expect(() => s.setCreditLimit(limit('l4', 'p-gupta', 1))).toThrow(PartyKindMismatch);
  });

  it('the observation is strictly ABOVE the limit, over the all-days balance', () => {
    const s = book();
    s.setCreditLimit(limit('l1', 'p-ramesh', 100000));
    // 750.50 owed + 249.50 = 1,000.00 exactly: allowed.
    expect(s.creditLimitObservation('p-ramesh', 24950)).toBeNull();
    expect(s.creditLimitObservation('p-ramesh', 24951)).toEqual({ would: 100001, limit: 100000 });
  });

  it('the form says so, keeps the commit live, and the sale is recorded exactly as typed', () => {
    const store = book();
    store.setCreditLimit(limit('l1', 'p-ramesh', 100000));
    const tree = render(
      <FormB store={store} draftPaise={50000} selectedCommit={2} entryPartyId="p-ramesh" />,
    );
    expect(text(byTestId(tree, 't8-limit-observation'))).toBe(
      "Ramesh's udhar would be ₹1,250.50, above the limit ₹1,000.00 you set.",
    );
    expect(byTestId(tree, 't8-commit').props.disabled).toBe(false);

    const session = sessionOn(store);
    session.openSectionFor('udhar_sales', 'p-ramesh');
    for (const k of ['5', '0', '0'] as const) session.press(k);
    const saved = session.commit({ labelKey: 't8.credit', section: 'udhar_sales', mode: 'udhar' });
    expect(saved?.amount).toBe(50000);
    expect(store.partyBalance('p-ramesh')).toBe(125050);
  });

  it('a collection never draws the observation, and nor does a customer with no limit', () => {
    const store = book();
    store.setCreditLimit(limit('l1', 'p-ramesh', 100));
    const ids = (tree: ReturnType<typeof render>) => all(tree).map((x) => String(x.props?.testID ?? ''));
    expect(ids(render(<FormB store={store} draftPaise={50000} selectedCommit={0} entryPartyId="p-ramesh" />))).not.toContain(
      't8-limit-observation',
    );
    expect(ids(render(<FormB store={store} draftPaise={50000} selectedCommit={2} entryPartyId="p-sunita" />))).not.toContain(
      't8-limit-observation',
    );
  });

  it('P2 -> P6 -> type -> save is a new row and back to P2; remove is another row', () => {
    const store = book();
    const session = sessionOn(store);
    session.openParty('p-ramesh');
    byTestId(render(<App session={session} />), 'p2-limit').props.onPress();
    expect(session.state.screen).toBe('P6');
    for (const k of ['2', '0', '0', '0'] as const) session.press(k);
    byTestId(render(<App session={session} />), 'p6-save').props.onPress();
    expect(session.state.screen).toBe('P2');
    expect(store.creditLimit('p-ramesh')).toBe(200000);
    expect(text(byTestId(render(<App session={session} />), 'p2-limit-detail'))).toBe('₹2,000.00');

    session.openCreditLimit();
    byTestId(render(<App session={session} />), 'p6-clear').props.onPress();
    expect(store.creditLimit('p-ramesh')).toBeNull();
    expect(store.state.creditLimits).toHaveLength(2);
    // Back from P6 is P2, with the party kept.
    session.openCreditLimit();
    expect(session.back()).toBe(true);
    expect(session.state.screen).toBe('P2');
    expect(session.state.partyId).toBe('p-ramesh');
  });
});

describe('FR-6 · a limit survives a restart (SQLite port)', () => {
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
    file = join(mkdtempSync(join(tmpdir(), 'swafto-r5-')), 'ledger.db');
  });

  it('kept, with its outbox row, and gone with an erasure', () => {
    const a = new Store(sqlitePort(open(file), () => TODAY));
    a.addParty(RAMESH);
    a.setCreditLimit({ id: 'l1', partyId: 'p-ramesh', limit: 500000, setAt: TODAY + 'T09:00:00.000Z' });
    const b = new Store(sqlitePort(open(file), () => TODAY));
    expect(b.creditLimit('p-ramesh')).toBe(500000);
    expect(b.pendingOutbox.map((r) => r.kind)).toContain('credit_limit');
    b.eraseAll();
    expect(new Store(sqlitePort(open(file), () => TODAY)).creditLimit('p-ramesh')).toBeNull();
  });

  it('an earlier day\'s udhar counts in the balance after a restart', () => {
    const a = new Store(sqlitePort(open(file), () => '2026-10-25'));
    a.addParty(RAMESH);
    a.setOpeningCash(0);
    a.append(e('2026-10-25', 'udhar_sales', 40000, 'udhar', 'p-ramesh'));
    a.close(0);
    const b = new Store(sqlitePort(open(file), () => TODAY));
    expect(b.state.day.date).toBe(TODAY);
    expect(b.partyMovementToday('p-ramesh')).toBe(0);
    expect(b.partyBalance('p-ramesh')).toBe(40000);
  });
});

describe('FR-6 · a limit travels on the push, with the parties', () => {
  it('the outbox row reaches the body as creditLimits, in the same request as its party', async () => {
    const store = book();
    store.addParty({ id: 'p-new', kind: 'customer', name: 'New' });
    store.setCreditLimit({ id: 'l1', partyId: 'p-new', limit: 500000, setAt: TODAY + 'T09:00:00.000Z' });
    const sent: HttpRequest[] = [];
    const client = new ApiClient(
      {
        send: async (r) => {
          sent.push(r);
          return { status: 200, body: { daysWritten: 0, entriesInserted: 0, entriesAlreadyPresent: 0, rejected: [] } };
        },
      },
      { read: () => ({ accessToken: 'a', refreshToken: 'r', deviceId: 'd', shopId: 's' }), write: () => {} },
    );
    const result = await client.push(store.pendingOutbox);
    const bodies = sent.map((r) => r.body as { parties?: unknown[]; creditLimits?: { id: string }[] });
    const withLimit = bodies.find((b) => b.creditLimits !== undefined);
    expect(withLimit?.creditLimits?.map((l) => l.id)).toEqual(['l1']);
    expect(withLimit?.parties).toBeDefined();
    expect(result.accepted).toContain('ob-limit-l1');
  });
});

describe('HT-43 · a customer saved without a phone can be given one, on P2', () => {
  it('the no-phone refusal is not headed "Not saved" - nothing was being saved', () => {
    const session = sessionOn(book());
    session.openParty('p-sunita');
    byTestId(render(<App session={session} />), 'p2-remind').props.onPress();
    const banner = text(byTestId(render(<App session={session} />), 'refusal'));
    expect(banner).toContain(phrase('refusal.titleNotDone', 'en'));
    expect(banner).not.toContain(phrase('refusal.title', 'en'));
  });

  it('typed on P2 and saved: the party has it, the outbox carries it, and the reminder opens', () => {
    const store = book();
    const session = sessionOn(store);
    session.openParty('p-sunita');
    const opened: { app: string }[] = [];
    const tree = () => render(<App session={session} onOpenWhatsApp={(u) => opened.push(u)} />);
    byTestId(tree(), 'p2-phone-input').props.onChangeText('98610 42317');
    byTestId(tree(), 'p2-phone-save').props.onPress();
    expect(session.state.lastRefusal).toBeNull();
    expect(store.state.parties.find((p) => p.id === 'p-sunita')?.phone).toBe('9861042317');
    const row = store.pendingOutbox.find((r) => r.id === 'ob-party-p-sunita');
    expect((row?.payload as Party | undefined)?.phone).toBe('9861042317');
    expect(all(tree()).some((x) => x.props?.testID === 'p2-phone')).toBe(false);
    byTestId(tree(), 'p2-remind').props.onPress();
    expect(opened[0]?.app.startsWith('whatsapp://send?phone=919861042317&text=')).toBe(true);
  });

  it('HT-57: with the keyboard up, Done on the keyboard saves, and Save number sits beside the field', () => {
    const store = book();
    const session = sessionOn(store);
    session.openParty('p-sunita');
    const tree = () => render(<App session={session} />);
    // Beside the field, in one row, so it rises with the field rather than falling behind the footer.
    const row = byTestId(tree(), 'p2-phone-row');
    expect(row.props.style.flexDirection).toBe('row');
    expect(all(row).map((x) => x.props?.testID)).toEqual(expect.arrayContaining(['p2-phone-input', 'p2-phone-save']));
    // Nothing typed: Done does nothing and says nothing.
    byTestId(tree(), 'p2-phone-input').props.onSubmitEditing?.();
    expect(session.state.lastRefusal).toBeNull();
    byTestId(tree(), 'p2-phone-input').props.onChangeText('98610 42317');
    expect(byTestId(tree(), 'p2-phone-input').props.returnKeyType).toBe('done');
    byTestId(tree(), 'p2-phone-input').props.onSubmitEditing();
    expect(store.state.parties.find((p) => p.id === 'p-sunita')?.phone).toBe('9861042317');
  });

  it('not a mobile number: refused, and the party is unchanged', () => {
    const store = book();
    const session = sessionOn(store);
    session.openParty('p-sunita');
    session.setPhoneDraft('12345');
    expect(session.savePartyPhone()).toBe(false);
    expect(session.state.lastRefusal?.field).toBe('partyPhone');
    expect(store.state.parties.find((p) => p.id === 'p-sunita')?.phone).toBeUndefined();
  });

  it('survives a restart (SQLite port), as the same party, not a second one', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'swafto-ht43-')), 'ledger.db');
    const db = new DatabaseSync(file);
    const port = (): Db => ({
      executeSync(sql, params = []) {
        const st = db.prepare(sql);
        if (/^\s*select/i.test(sql)) return { rows: st.all(...(params as never[])) };
        st.run(...(params as never[]));
        return { rows: [] };
      },
    });
    const a = new Store(sqlitePort(port(), () => TODAY));
    a.addParty(SUNITA);
    a.setPartyPhone('p-sunita', '9861042317');
    const b = new Store(sqlitePort(port(), () => TODAY));
    expect(b.state.parties.filter((p) => p.id === 'p-sunita').map((p) => p.phone)).toEqual(['9861042317']);
  });
});

describe('HT-46 · counts read naturally, and no period before the book began', () => {
  it('one day, many days, and "since today" for none - from the copy, through fill', async () => {
    const { fill } = await import('../src/components/DayParts.tsx');
    expect(fill(phrase('collect.days', 'en'), { n: 0 })).toBe('Owing since today');
    expect(fill(phrase('collect.days', 'en'), { n: 1 })).toBe('Owing for 1 day');
    expect(fill(phrase('collect.days', 'en'), { n: 12 })).toBe('Owing for 12 days');
    expect(fill(phrase('rep.party.age', 'en'), { name: 'Sunita', n: 0 })).toBe('Sunita · since today');
    expect(fill(phrase('m1.lastYear.this', 'en'), { n: 1 })).toBe('This month so far (1 closed day)');
    expect(fill(phrase('items.sales', 'en'), { n: 1 })).toBe('1 sale');
    expect(fill(phrase('c1.daysLooked', 'en'), { n: 1 })).toBe('1 day looked at.');
    expect(fill(phrase('c1.daysLooked', 'en'), { n: 3 })).toBe('3 days looked at.');
  });

  it('a shop whose book starts today: no last month, and no week that ended before today', () => {
    const store = new Store(
      memoryPort({
        shopId: 'shop',
        day: day(TODAY, 'open'),
        entries: [],
        parties: [],
        priorCreditOutstanding: 0,
        priorSupplierOutstanding: 0,
        skippedSections: [],
      }),
      () => TODAY + 'T12:00:00.000+05:30',
    );
    expect(store.basicReports().months.map((m) => m.month)).toEqual(['2026-10']);
    expect(store.basicReports().upiMonths.map((m) => m.month)).toEqual(['2026-10']);
    expect(store.premiumReports().returnsTrend.map((w) => w.to)).toEqual([TODAY]);
  });

  it('the book that reaches back keeps the earlier month and weeks', () => {
    const store = book(); // first day 2026-09-20
    expect(store.basicReports().months.map((m) => m.month)).toEqual(['2026-10', '2026-09']);
    expect(store.premiumReports().returnsTrend.every((w) => w.to >= '2026-09-20')).toBe(true);
  });
});

describe('HT-55 · the residue of HT-46: a demand count, and C1 periods before the book', () => {
  const dayOne = (): Store =>
    new Store(
      memoryPort({
        shopId: 'shop',
        day: day(TODAY, 'open'),
        entries: [],
        parties: [],
        priorCreditOutstanding: 0,
        priorSupplierOutstanding: 0,
        skippedSections: [],
      }),
      () => TODAY + 'T12:00:00.000+05:30',
    );

  it('M1: "sold on 1 day in 90", and "3 days" for three', async () => {
    const { fill } = await import('../src/components/DayParts.tsx');
    const gate = phrase('items.demandGate', 'en');
    expect(fill(gate, { name: 'Rice', n: 1, required: 8 })).toBe('Rice: sold on 1 day in 90. An estimate needs 8.');
    expect(fill(gate, { name: 'Rice', n: 3, required: 8 })).toBe('Rice: sold on 3 days in 90. An estimate needs 8.');
  });

  it('C1 on day one: this month starts on the first day of the book, not the 1st', async () => {
    const { answer } = await import('../src/chat/answer.ts');
    const { strings } = await import('../src/i18n/strings.ts');
    const a = answer({ intent: 'topItems', slots: { period: { kind: 'thisMonth' } } }, dayOne(), 'premium', strings('en'));
    expect(a.lines[0]).toBe('On Monday 26 October.');
    expect(a.lines.join(' ')).not.toMatch(/1 October/);
  });

  it('C1 on day one: "yesterday" has no record, and no ₹0 is shown for it', async () => {
    const { answer } = await import('../src/chat/answer.ts');
    const { strings } = await import('../src/i18n/strings.ts');
    const a = answer({ intent: 'sales', slots: { period: { kind: 'yesterday' } } }, dayOne(), 'premium', strings('en'));
    expect(a.figures).toEqual([]);
    expect(a.lines).toEqual(['Nothing is recorded on this phone for that time. On Sunday 25 October.']);
  });

  it('C1 on day one: this week has nothing before it to compare with', async () => {
    const { answer } = await import('../src/chat/answer.ts');
    const { strings } = await import('../src/i18n/strings.ts');
    const a = answer({ intent: 'compare', slots: { period: { kind: 'thisWeek' } } }, dayOne(), 'premium', strings('en'));
    expect(a.lines).toEqual([phrase('c1.note.noCompare', 'en')]);
  });

  it('a book that reaches back keeps the whole period', async () => {
    const { answer } = await import('../src/chat/answer.ts');
    const { strings } = await import('../src/i18n/strings.ts');
    const a = answer({ intent: 'sales', slots: { period: { kind: 'thisMonth' } } }, book(), 'premium', strings('en'));
    expect(a.lines[0]).toBe('From Thursday 1 October to Monday 26 October.');
  });
});
