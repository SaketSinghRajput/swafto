/**
 * F-22: S8 "Delete everything" used to do nothing, on the server or the phone.
 *
 * What these hold: the phone is wiped ONLY after the server accepted the
 * request; offline or refused, nothing is deleted anywhere and the banner says
 * so; a phone with no session wipes only itself and says so before the press.
 * The wipe is checked against the real SQLite port, tokens and account row
 * included, because they share the ledger's `meta` table (storage.tsx).
 */
import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Host, type FetchLike } from '../src/host.tsx';
import { App } from '../src/app/App.tsx';
import { Store, memoryPort } from '../src/store/index.ts';
import { sqlitePort, type Db } from '../src/store/sqlite.ts';
import { sqliteSecureStorage } from '../src/platform/storage.tsx';
import { WEB_PAGE_URLS } from '../src/platform/endpoint.ts';
import { ConfirmDelete } from '../src/screens/S8.tsx';
import { phrase } from '../src/i18n/strings.ts';
import { render, byTestId, all, text } from './render.tsx';
import { DELETION_GRACE_DAYS } from '@swafto/values';
import type { Entry } from '@swafto/formula-engine';

const DAY = '2026-10-20';
const T0 = DAY + 'T19:00:00.000Z';
const ERASES_AT = '2026-11-19T19:00:00.000Z';
const TOKENS = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  deviceId: '33333333-3333-4333-8333-000000000001',
  shopId: '11111111-1111-4111-8111-000000000001',
};

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

type Answer = { status: number; body: unknown } | 'offline';

/** A phone with a day, a sale and (optionally) a session, all in one SQLite file. */
function phone(signedIn: boolean, answer: (path: string) => Answer) {
  const file = join(mkdtempSync(join(tmpdir(), 'swafto-f22-')), 'ledger.db');
  const db = open(file);
  const store = new Store(sqlitePort(db, () => DAY), () => T0);
  store.setShopName('Sharma Kirana Store');
  store.setOpeningCash(100000);
  store.append({
    id: 'e1',
    dayId: DAY,
    section: 'cash_sales',
    amount: 5000,
    mode: 'cash',
    source: 'manual',
    createdAt: T0,
  } as Entry);
  const storage = sqliteSecureStorage(db, 'session');
  const account = sqliteSecureStorage(db, 'account');
  if (signedIn) storage.write(JSON.stringify(TOKENS));
  account.write(JSON.stringify({ phone: '9876543210', shopId: TOKENS.shopId }));

  const calls: string[] = [];
  const doFetch: FetchLike = async (url, init) => {
    const path = url.replace('https://api.example.test', '');
    calls.push(init.method + ' ' + path);
    const a = answer(path);
    if (a === 'offline') throw new TypeError('Network request failed');
    return { status: a.status, text: async () => JSON.stringify(a.body) };
  };
  const host = new Host({
    baseUrl: 'https://api.example.test',
    fetch: doFetch,
    storage,
    account,
    store,
    now: () => T0,
    newId: () => 'id-1',
  });
  host.session.goTo('S8');
  /** What a cold start would find in the same file. */
  const reopened = () => new Store(sqlitePort(open(file), () => DAY), () => T0);
  return { host, storage, account, calls, reopened };
}

const SCHEDULED = (path: string): Answer =>
  path === '/v1/me/erase'
    ? {
        status: 200,
        body: { requestedAt: T0, erasesAt: ERASES_AT, graceDays: 30, liveDataErased: false, message: 'x' },
      }
    : { status: 200, body: {} };

const untouched = (p: ReturnType<typeof phone>) => {
  const s = p.reopened().state;
  expect(s.entries.map((e) => e.id)).toEqual(['e1']);
  expect(s.shopName).toBe('Sharma Kirana Store');
  expect(p.account.read()).not.toBeNull();
  expect(p.host.session.state.deletion ?? null).toBeNull();
};

describe('F-22 - deleting the account, signed in', () => {
  it('asks the server, then signs out and wipes the phone - book, queue, tokens, account', async () => {
    const p = phone(true, SCHEDULED);
    await p.host.deleteAccount();

    expect(p.calls[0]).toBe('POST /v1/me/erase');
    expect(p.calls).toContain('POST /v1/auth/devices/' + TOKENS.deviceId + '/revoke');
    const after = p.reopened();
    expect(after.state.entries).toEqual([]);
    expect(after.state.day.openingCash).toBeNull();
    expect(after.state.shopName).toBeUndefined();
    expect(after.pendingOutbox).toEqual([]);
    expect(p.storage.read()).toBeNull();
    expect(p.account.read()).toBeNull();
    expect(p.host.signedIn).toBe(false);
    expect(p.host.store.state.entries).toEqual([]); // the live store, not only the file
    expect(p.host.session.state.deletion).toEqual({ kind: 'scheduled', erasesAt: ERASES_AT });
  });

  it('offline: NOTHING is deleted anywhere, and the banner says so', async () => {
    const p = phone(true, () => 'offline');
    await p.host.deleteAccount();
    untouched(p);
    expect(p.host.signedIn).toBe(true);
    expect(p.host.session.state.lastRefusal?.field).toBe('eraseOffline');
  });

  it('the server refuses: nothing is deleted, and it is not called a success', async () => {
    const p = phone(true, () => ({ status: 500, body: { error: 'internal' } }));
    await p.host.deleteAccount();
    untouched(p);
    expect(p.host.session.state.lastRefusal?.field).toBe('erase');
  });

  it('the session is dead: nothing is deleted, and he is told to sign in', async () => {
    const p = phone(true, () => ({ status: 401, body: { error: 'unauthenticated' } }));
    await p.host.deleteAccount();
    untouched(p);
    expect(p.host.session.state.lastRefusal?.field).toBe('eraseSignIn');
  });
});

describe('F-22 - deleting on a phone with no session', () => {
  it('wipes only the phone, sends nothing, and reports it as local', async () => {
    const p = phone(false, SCHEDULED);
    await p.host.deleteAccount();
    expect(p.calls).toEqual([]);
    expect(p.reopened().state.entries).toEqual([]);
    expect(p.account.read()).toBeNull();
    expect(p.host.session.state.deletion).toEqual({ kind: 'local' });
  });

  it('S8 says so BEFORE the press', () => {
    const p = phone(false, SCHEDULED);
    const tree = render(<App session={p.host.session} auth={p.host} />);
    expect(text(byTestId(tree, 's8-local-only'))).toBe(phrase('s8.localOnly', 'en'));
    expect(all(tree).some((n) => n.props?.testID === 's8-phone-now')).toBe(false);
  });
});

describe('F-22 - S8, wired through App', () => {
  it('confirm calls the host, and the outcome replaces the question until Done', async () => {
    const p = phone(true, SCHEDULED);
    const tree = () => render(<App session={p.host.session} auth={p.host} />);
    byTestId(tree(), 's8-confirm').props.onPress();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(text(byTestId(tree(), 's8-erases-at'))).toBe('2026-11-19');
    expect(text(byTestId(tree(), 's8-phone-wiped'))).toBe(phrase('s8.phoneWiped', 'en'));
    byTestId(tree(), 's8-done').props.onPress();
    expect(p.host.session.state.screen).toBe('A1');
    expect(p.host.session.state.deletion).toBeNull();
  });

  it('a failure reaches the refusal banner with its own sentence', async () => {
    const p = phone(true, () => 'offline');
    await p.host.deleteAccount();
    const tree = render(<App session={p.host.session} auth={p.host} />);
    expect(text(byTestId(tree, 'refusal'))).toContain(phrase('refusal.eraseOffline', 'en'));
  });

  it('back from the outcome is Done - the book behind S8 is gone', async () => {
    const p = phone(true, SCHEDULED);
    await p.host.deleteAccount();
    expect(p.host.session.back()).toBe(true);
    expect(p.host.session.state.screen).toBe('A1');
  });

  it('the scheduled copy states the grace period in all three languages', () => {
    for (const language of ['en', 'hi', 'or'] as const) {
      expect(phrase('s8.scheduled', language)).toContain(String(DELETION_GRACE_DAYS));
    }
  });

  it('the outcome screen never offers the delete button again', () => {
    const p = phone(true, SCHEDULED);
    const tree = render(
      <ConfirmDelete store={p.host.store} outcome={{ kind: 'scheduled', erasesAt: ERASES_AT }} />,
    );
    expect(all(tree).some((n) => n.props?.testID === 's8-confirm')).toBe(false);
  });
});

describe('F-22 - the in-memory port erases the same things', () => {
  it('entries, parties, queue, shop name and carried balances go; the day is a first run', () => {
    const store = new Store(
      memoryPort({
        shopId: 's',
        day: { date: DAY, state: 'open', openingCash: null, countedCash: null, skippedSections: [] },
        entries: [],
        parties: [{ id: 'p1', kind: 'customer', name: 'Ramesh' } as never],
        priorCreditOutstanding: 25000,
        priorSupplierOutstanding: 0,
        skippedSections: [],
        shopName: 'Sharma Kirana Store',
      }),
      () => T0,
    );
    store.setOpeningCash(100000);
    store.eraseAll();
    expect(store.state.parties).toEqual([]);
    expect(store.state.shopName).toBeUndefined();
    expect(store.state.priorCreditOutstanding).toBe(0);
    expect(store.state.day.openingCash).toBeNull();
    expect(store.pendingOutbox).toEqual([]);
  });
});

describe('F-23 - About links to the hosted pages', () => {
  it('privacy, terms and the web deletion page open their real URLs', () => {
    const p = phone(true, SCHEDULED);
    p.host.session.goTo('S5');
    const opened: string[] = [];
    const tree = render(<App session={p.host.session} auth={p.host} onOpenUrl={(u) => opened.push(u)} />);
    for (const id of ['s5-privacy', 's5-terms', 's5-licences', 's5-web-delete']) byTestId(tree, id).props.onPress();
    expect(opened).toEqual([
      WEB_PAGE_URLS.privacy,
      WEB_PAGE_URLS.terms,
      WEB_PAGE_URLS.licences, // HT-15
      WEB_PAGE_URLS.deleteAccount,
    ]);
    expect(text(tree)).toContain(WEB_PAGE_URLS.deleteAccount);
  });
});
