/**
 * THE DRAIN LOOP, WHICH IS WHERE ENTRIES GET LOST.
 *
 * Everything else in this app can fail visibly: a figure looks wrong, a screen
 * does not open, a refusal names a field. The sync loop fails silently and
 * permanently - a row dropped from the outbox is a figure the shopkeeper typed
 * and nobody will ever see again, and he will not find out for weeks.
 *
 * So the cases below are almost all about what happens when something goes
 * WRONG: no signal, a refused row, a dead session, a response lost in flight.
 * The happy path is one case, because it is the one that was never in doubt.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  Host,
  fetchTransport,
  secureTokenStore,
  REQUEST_TIMEOUT_MS,
  type FetchLike,
} from '../src/host.tsx';
import { Store, memoryPort, type StoreState } from '../src/store/index.ts';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';
import type { Entry } from '@swafto/formula-engine';

const T0 = CANONICAL_DATE + 'T19:00:00.000Z';
const TOKENS = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  deviceId: '33333333-3333-4333-8333-000000000001',
  shopId: '11111111-1111-4111-8111-000000000001',
};

/** Storage that behaves like the Keystore wrapper: one string, or nothing. */
function memoryStorage(initial: string | null = null) {
  let held = initial;
  return {
    read: () => held,
    write: (value: string | null) => {
      held = value;
    },
    get raw() {
      return held;
    },
  };
}

const freshStore = (shopName?: string) => {
  const base = canonicalInput();
  const state: StoreState = {
    ...(shopName ? { shopName } : {}),
    shopId: TOKENS.shopId,
    day: { ...base.day, state: 'open', openingCash: null },
    entries: [],
    parties: CANONICAL_PARTIES,
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
    skippedSections: [],
  };
  return new Store(memoryPort(state), () => T0);
};

const sale = (n: number, amount: number): Entry =>
  ({
    id: '5a1e0000-0000-4000-8000-' + String(n).padStart(12, '0'),
    dayId: CANONICAL_DATE,
    section: 'cash_sales',
    amount,
    mode: 'cash',
    source: 'manual',
    createdAt: T0,
  }) as Entry;

/** A `fetch` that answers whatever the case needs, and records what it saw. */
function fakeFetch(answer: () => { status: number; body: unknown }) {
  const calls: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }[] = [];
  const doFetch: FetchLike = async (url, init) => {
    calls.push({
      url,
      method: init.method,
      headers: init.headers,
      ...(init.body ? { body: init.body } : {}),
    });
    const { status, body } = answer();
    return { status, text: async () => (body === null ? '' : JSON.stringify(body)) };
  };
  return { doFetch, calls };
}

const PUSH_OK = {
  status: 200,
  body: { daysWritten: 1, entriesInserted: 1, entriesAlreadyPresent: 0, rejected: [] },
};

function host(
  doFetch: FetchLike,
  storage = memoryStorage(JSON.stringify(TOKENS)),
  shopName?: string,
) {
  const store = freshStore(shopName);
  return {
    store,
    storage,
    host: new Host({
      baseUrl: 'https://api.example.test',
      fetch: doFetch,
      storage,
      store,
      now: () => T0,
      newId: () => '5a1e0000-0000-4000-8000-000000000999',
    }),
  };
}

describe('the transport does one thing and hides nothing', () => {
  it('sends the path under the base URL, with the body as JSON', async () => {
    const { doFetch, calls } = fakeFetch(() => PUSH_OK);
    await fetchTransport('https://api.example.test', doFetch).send({
      method: 'POST',
      path: '/v1/sync/push',
      body: { entries: [] },
      headers: { authorization: 'Bearer x' },
    });
    expect(calls[0]!.url).toBe('https://api.example.test/v1/sync/push');
    expect(calls[0]!.headers['content-type']).toBe('application/json');
    expect(calls[0]!.headers.authorization).toBe('Bearer x');
    expect(JSON.parse(calls[0]!.body!)).toEqual({ entries: [] });
  });

  it('a 4xx is an ANSWER, not a throw - the client decides what it means', async () => {
    const { doFetch } = fakeFetch(() => ({ status: 403, body: { error: 'consent_required' } }));
    const response = await fetchTransport('https://x.test', doFetch).send({
      method: 'POST',
      path: '/v1/auth/otp/verify',
      body: {},
      headers: {},
    });
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'consent_required' });
  });

  it('a body that is not JSON does not become a crash', async () => {
    /*
     * A captive portal, a proxy error page, a gateway timeout in HTML. On a
     * INR 7,000 handset on a station platform this is a Tuesday, and it must
     * not be the thing that kills the app.
     */
    const doFetch: FetchLike = async () => ({
      status: 502,
      text: async () => '<html>Bad Gateway</html>',
    });
    const response = await fetchTransport('https://x.test', doFetch).send({
      method: 'GET',
      path: '/v1/alerts',
      headers: {},
    });
    expect(response.status).toBe(502);
    expect(response.body).toBeNull();
  });

  it('sends no content-type when there is no body, and asks for JSON always', async () => {
    const { doFetch, calls } = fakeFetch(() => ({ status: 200, body: {} }));
    await fetchTransport('https://x.test', doFetch).send({
      method: 'GET',
      path: '/v1/reports',
      headers: {},
    });
    expect(calls[0]!.headers['content-type']).toBeUndefined();
    expect(calls[0]!.headers.accept).toBe('application/json');
  });
});

describe('the token store survives what the platform does to it', () => {
  it('round-trips a session', () => {
    const storage = memoryStorage(null);
    const tokens = secureTokenStore(storage);
    expect(tokens.read()).toBeNull();
    tokens.write(TOKENS);
    expect(tokens.read()).toEqual(TOKENS);
    tokens.write(null);
    expect(tokens.read()).toBeNull();
    expect(storage.raw).toBeNull();
  });

  it('unreadable storage is treated as empty rather than as a crash', () => {
    // The cost of this is one SMS. The cost of throwing is an app that will
    // not start, on a handset nobody can debug.
    expect(secureTokenStore(memoryStorage('{not json')).read()).toBeNull();
  });
});

describe('the host opens on the right screen', () => {
  it('no tokens and no book means the splash, because there is no account yet', () => {
    /*
     * A1, NOT X0 - the consent notice moved behind the language choice
     * (A1 -> A2 -> X0 -> A3), so it is read in a language he chose. The full
     * order is driven in auth-flow.spec.tsx.
     */
    const { host: h } = host(fakeFetch(() => PUSH_OK).doFetch, memoryStorage(null));
    expect(h.session.state.screen).toBe('A1');
  });

  it('tokens and a named shop mean Today, because he is already set up', () => {
    const { host: h } = host(fakeFetch(() => PUSH_OK).doFetch, undefined, 'Test Store');
    expect(h.session.state.screen).toBe('T1');
  });

  it('HT-2: tokens WITHOUT a shop name resume onboarding (X1), not a nameless Today', () => {
    const { host: h } = host(fakeFetch(() => PUSH_OK).doFetch);
    expect(h.session.state.screen).toBe('X1');
  });
});

describe('HT-16 - language and display survive a relaunch', () => {
  const boot = (prefs: ReturnType<typeof memoryStorage>) =>
    new Host({
      baseUrl: 'https://api.example.test',
      fetch: fakeFetch(() => PUSH_OK).doFetch,
      storage: memoryStorage(JSON.stringify(TOKENS)),
      store: freshStore('Test Store'),
      now: () => T0,
      newId: () => '5a1e0000-0000-4000-8000-000000000999',
      prefs,
    });

  it('what he chose in Settings is what the next launch shows', () => {
    const prefs = memoryStorage();
    const first = boot(prefs);
    first.session.setLanguage('or');
    first.session.setDisplay('focus');
    const again = boot(prefs);
    expect(again.session.state.language).toBe('or');
    expect(again.session.state.display).toBe('focus');
  });

  it('an unreadable or unknown value is dropped, never rendered', () => {
    expect(boot(memoryStorage('{"language":"xx","display":"neon"}')).session.state.language).toBe('en');
    expect(boot(memoryStorage('not json')).session.state.display).toBe('comfort');
  });
});

describe('HT-21 - a half-typed entry survives the process being killed', () => {
  const customer = CANONICAL_PARTIES.find((p) => p.kind === 'customer')!;
  let tick = 0;
  // Real time passes between keys; HT-22 swallows keys for a moment after the picker closes.
  const clock = () => new Date(Date.parse(T0) + 1000 * tick++).toISOString();
  const boot = (store: Store, draft: ReturnType<typeof memoryStorage>) =>
    new Host({
      baseUrl: 'https://api.example.test',
      fetch: fakeFetch(() => PUSH_OK).doFetch,
      storage: memoryStorage(JSON.stringify(TOKENS)),
      store,
      now: clock,
      newId: () => '5a1e0000-0000-4000-8000-000000000999',
      draft,
    });
  const typeCredit = (h: Host) => {
    h.session.openSection('udhar_sales');
    for (const d of '250') h.session.press(d as '0');
    h.session.chooseEntryParty(customer.id);
  };

  it('digits, section, segment and party come back on relaunch, and nothing is saved', () => {
    const store = freshStore('Test Store');
    const draft = memoryStorage();
    const first = boot(store, draft);
    typeCredit(first);
    const commit = first.session.state.selectedCommit;
    // the process dies here; a new one starts on the same disk
    const again = boot(store, draft);
    expect(again.session.state.entrySection).toBe('udhar_sales');
    expect(again.session.state.selectedCommit).toBe(commit);
    expect(again.session.state.draftPaise).toBe(25000);
    expect(again.session.state.entryPartyId).toBe(customer.id);
    expect(store.state.entries).toHaveLength(0);
  });

  it('is cleared on save and on discard', () => {
    const store = freshStore('Test Store');
    const draft = memoryStorage();
    const h = boot(store, draft);
    typeCredit(h);
    expect(draft.raw).not.toBeNull();
    h.session.back(); // discard: leave the form
    expect(draft.raw).toBeNull();
    h.session.openSection('cash_sales');
    h.session.press('5');
    expect(draft.raw).not.toBeNull();
    h.session.commit({ labelKey: 'formA.mode.cash', section: 'cash_sales', mode: 'cash' });
    expect(store.state.entries).toHaveLength(1);
    expect(draft.raw).toBeNull();
  });

  it('a draft from another day, or an unreadable one, is dropped', () => {
    const store = freshStore('Test Store');
    const other = JSON.stringify({ dayId: '1999-01-01', section: 'cash_sales', commit: 0, digits: '9', partyId: null });
    expect(boot(store, memoryStorage(other)).session.state.screen).toBe('T1');
    expect(boot(store, memoryStorage('{"section":"nope"}')).session.state.draftPaise).toBeNull();
  });
});

describe('the drain forgets only what the server took', () => {
  it('nothing queued is not an error and sends no request', async () => {
    const { doFetch, calls } = fakeFetch(() => PUSH_OK);
    const { host: h } = host(doFetch);
    const outcome = await h.sync();
    expect(outcome.idle).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it('a clean push clears the queue', async () => {
    const { doFetch } = fakeFetch(() => ({
      status: 200,
      body: { daysWritten: 1, entriesInserted: 2, entriesAlreadyPresent: 0, rejected: [] },
    }));
    const { host: h, store } = host(doFetch);
    store.append(sale(1, 45000));
    store.append(sale(2, 12000));
    expect(store.pendingOutbox.length).toBe(3); // two entries and their day

    const outcome = await h.sync();
    expect(outcome.accepted).toBe(3);
    expect(outcome.rejected).toEqual([]);
    expect(store.pendingOutbox).toEqual([]);
  });

  it('OFFLINE LOSES NOTHING, and says so rather than throwing', async () => {
    const doFetch: FetchLike = async () => {
      throw new Error('ENETUNREACH');
    };
    const { host: h, store } = host(doFetch);
    store.append(sale(1, 45000));
    const before = store.pendingOutbox.map((r) => r.id);

    const outcome = await h.sync();
    expect(outcome.offline).toBe(true);
    expect(outcome.accepted).toBe(0);
    expect(store.pendingOutbox.map((r) => r.id)).toEqual(before);
  });

  it('A REFUSED ROW STAYS QUEUED while its neighbours go', async () => {
    const { host: h, store } = host(
      fakeFetch(() => ({
        status: 200,
        body: {
          daysWritten: 1,
          entriesInserted: 1,
          entriesAlreadyPresent: 0,
          rejected: [
            {
              id: '5a1e0000-0000-4000-8000-000000000002',
              field: 'partyId',
              message: 'a credit sale has to name somebody',
            },
          ],
        },
      })).doFetch,
    );
    store.append(sale(1, 45000));
    store.append(sale(2, 12000));

    const outcome = await h.sync();
    expect(outcome.rejected).toHaveLength(1);
    expect(outcome.rejected[0]!.field).toBe('partyId');

    /*
     * FE-11: the refused row is no longer RE-SENT on every drain - it is PARKED.
     * It must still be on the phone (never dropped, never acked) and visible.
     */
    expect(store.pendingOutbox.map((r) => r.id)).not.toContain('ob-5a1e0000-0000-4000-8000-000000000002');
    const parked = store.parkedOutbox;
    expect(parked).toHaveLength(1);
    expect(parked[0]!.id).toBe('ob-5a1e0000-0000-4000-8000-000000000002');
    expect(parked[0]!.reason).toContain('a credit sale has to name somebody');
  });

  it('a dead session asks for sign-in and keeps every row', async () => {
    const { host: h, store } = host(
      fakeFetch(() => ({ status: 401, body: { error: 'unauthenticated' } })).doFetch,
    );
    store.append(sale(1, 45000));

    const outcome = await h.sync();
    expect(outcome.needsSignIn).toBe(true);
    expect(store.pendingOutbox.length).toBeGreaterThan(0);
  });

  it('a 500 is raised rather than swallowed, and the queue is untouched', async () => {
    /*
     * This loop does not decide what a server error means. Turning a 500 into
     * a quiet "nothing happened" is how a broken deploy looks healthy from
     * every handset for a week.
     */
    const { host: h, store } = host(
      fakeFetch(() => ({ status: 500, body: { error: 'internal' } })).doFetch,
    );
    store.append(sale(1, 45000));
    const before = store.pendingOutbox.length;

    await expect(h.sync()).rejects.toThrow();
    expect(store.pendingOutbox.length).toBe(before);
  });

  it('a push whose response is LOST is retried, and inserts nothing twice', async () => {
    /*
     * The case the ack order exists for. The server took the rows; the reply
     * never arrived. The phone still has them queued, sends them again, and
     * the second push reports them as already present rather than duplicating
     * a day's takings.
     */
    let attempt = 0;
    const doFetch: FetchLike = async (_url, init) => {
      attempt += 1;
      if (attempt === 1) throw new Error('socket hang up');
      const sent = JSON.parse(init.body!) as { entries?: unknown[] };
      return {
        status: 200,
        text: async () =>
          JSON.stringify({
            daysWritten: 1,
            entriesInserted: 0,
            entriesAlreadyPresent: sent.entries?.length ?? 0,
            rejected: [],
          }),
      };
    };
    const { host: h, store } = host(doFetch);
    store.append(sale(1, 45000));

    expect((await h.sync()).offline).toBe(true);
    expect(store.pendingOutbox.length).toBe(2);

    const second = await h.sync();
    expect(second.accepted).toBe(2);
    expect(store.pendingOutbox).toEqual([]);
  });
});

describe('F-8 - consent review is reachable, and never fails quietly', () => {
  it('opens manage mode on what the server holds', async () => {
    const { doFetch } = fakeFetch(() => ({
      status: 200,
      body: { noticeVersion: 'v1', current: { account_and_ledger: true, sms_reminders: true }, consents: [] },
    }));
    const { host: h } = host(doFetch);
    await h.openPrivacy();
    expect(h.session.state.screen).toBe('X0');
    expect(h.session.state.consentMode).toBe('manage');
    expect(h.session.state.grantedConsents).toEqual(['sms_reminders']);
  });

  it('an unreachable server is a refusal on screen, not a silent no-op', async () => {
    const { host: h } = host(async () => {
      throw new TypeError('Network request failed');
    });
    const before = h.session.state.screen;
    await h.openPrivacy();
    expect(h.session.state.screen).toBe(before); // nothing moved
    // HT-31: its own copy - nothing was chosen, so 'your choice was not changed' was wrong.
    expect(h.session.state.lastRefusal?.field).toBe('consentRead');
  });

  it('a withdrawal the server did not take is put back, and said', async () => {
    const { doFetch } = fakeFetch(() => ({ status: 500, body: { error: 'boom' } }));
    const { host: h } = host(doFetch);
    h.session.toggleConsent('sms_reminders'); // the screen flips it first
    await h.changeConsent('sms_reminders', true);
    expect(h.session.state.grantedConsents).toEqual([]);
    expect(h.session.state.lastRefusal?.field).toBe('consent');
  });
});

describe('DV-12 - a sync ack re-renders the screen', () => {
  it('notifies the session after the queue shrinks', async () => {
    const { doFetch } = fakeFetch(() => PUSH_OK);
    const { host: h, store } = host(doFetch);
    store.append(sale(77, 1000));
    let renders = 0;
    h.session.subscribe(() => {
      renders += 1;
    });
    await h.sync();
    expect(store.pendingOutbox).toEqual([]);
    expect(renders).toBeGreaterThan(0);
  });
});

describe('a stalled connection gives up instead of hanging the drain for ever', () => {
  /** A fetch on a dead 2G cell: it never answers. It does record the abort. */
  const stalled = () => {
    const seen: { aborted: boolean } = { aborted: false };
    const doFetch: FetchLike = (_url, init) => {
      init.signal?.addEventListener('abort', () => {
        seen.aborted = true;
      });
      return new Promise(() => undefined);
    };
    return { doFetch, seen };
  };

  it('the transport throws after its timeout and aborts the request', async () => {
    const { doFetch, seen } = stalled();
    await expect(
      fetchTransport('https://x.test', doFetch, 5).send({
        method: 'GET',
        path: '/v1/alerts',
        headers: {},
      }),
    ).rejects.toThrow('timed out');
    expect(seen.aborted).toBe(true);
  });

  it('a sync that times out is OFFLINE, acks nothing, and the next drain can run', async () => {
    vi.useFakeTimers();
    try {
      const { doFetch } = stalled();
      const { host: h, store } = host(doFetch);
      store.append(sale(1, 45000));
      const queued = store.pendingOutbox;
      const pending = h.sync();
      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
      const outcome = await pending;
      expect(outcome.offline).toBe(true);
      expect(store.pendingOutbox).toEqual(queued);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('DV-13: the shop name reaches the server, whenever it can', () => {
  const shopCalls = (calls: { url: string; body?: string }[]) =>
    calls.filter((c) => c.url.endsWith('/v1/me/shop')).map((c) => JSON.parse(c.body!));

  it('sends the name on sync, once per run, with the session', async () => {
    const { doFetch, calls } = fakeFetch(() => ({ status: 200, body: { name: 'Ma Tarini Store' } }));
    const { host: h, store } = host(doFetch);
    store.setShopName('Ma Tarini Store');
    await h.sync();
    await h.sync();
    expect(shopCalls(calls)).toEqual([{ name: 'Ma Tarini Store' }]);
    expect(calls[0]!.headers.authorization).toBe('Bearer access-token');
  });

  it('a refused send is retried on the next sync, not dropped', async () => {
    let status = 500;
    const { doFetch, calls } = fakeFetch(() => ({ status, body: {} }));
    const { host: h, store } = host(doFetch);
    store.setShopName('Ma Tarini Store');
    await h.sync();
    status = 200;
    await h.sync();
    await h.sync();
    expect(shopCalls(calls)).toHaveLength(2);
  });

  it('no signal: the outbox is not tried and nothing is acked', async () => {
    let tries = 0;
    const doFetch: FetchLike = async () => {
      tries += 1;
      throw new Error('network down');
    };
    const { host: h, store } = host(doFetch);
    store.setShopName('Ma Tarini Store');
    store.append(sale(1, 45000));
    const queued = store.pendingOutbox;
    expect((await h.sync()).offline).toBe(true);
    expect(tries).toBe(1);
    expect(store.pendingOutbox).toEqual(queued);
  });

  it('nothing is sent without a session or without a name', async () => {
    const { doFetch, calls } = fakeFetch(() => PUSH_OK);
    const signedOut = host(doFetch, memoryStorage(null));
    signedOut.store.setShopName('Ma Tarini Store');
    await signedOut.host.sync();
    const nameless = host(doFetch);
    await nameless.host.sync();
    expect(shopCalls(calls)).toEqual([]);
  });
});

describe("F-24: the code request carries this install's id", () => {
  it('makes the id once, keeps it, and sends the same one every time', async () => {
    const { doFetch, calls } = fakeFetch(() => ({
      status: 202,
      body: { sent: true, expiresInSeconds: 600, digits: 6 },
    }));
    const install = memoryStorage(null);
    let n = 0;
    const h = new Host({
      baseUrl: 'https://api.example.test',
      fetch: doFetch,
      storage: memoryStorage(null),
      install,
      store: freshStore(),
      now: () => T0,
      newId: () => '0192f0a1-0000-7000-8000-00000000000' + String((n += 1)),
    });
    for (const k of '9876500001') h.session.pressPhone(k as '0');
    await h.sendCode();
    await h.sendCode();
    const ids = calls.map((c) => JSON.parse(c.body!).deviceId);
    const first = '0192f0a1-0000-7000-8000-000000000001';
    expect(ids).toEqual([first, first]);
    expect(install.raw).toBe(first);
  });
});

describe('HT-4 - the book syncs while the app is in front', () => {
  it('a write triggers a sync; a keypress (no write) does not', async () => {
    const { doFetch } = fakeFetch(() => PUSH_OK);
    const { host: h, store } = host(doFetch);
    const spy = vi.spyOn(h, 'sync');
    await h.syncLatest(true); // launch
    expect(spy).toHaveBeenCalledTimes(1);
    h.session.press('5'); // a digit is a session change, not a write
    await h.syncLatest();
    expect(spy).toHaveBeenCalledTimes(1); // no network attempt per keypress
    store.append(sale(91, 500));
    await h.syncLatest();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(store.pendingOutbox).toEqual([]);
  });

  it('a write that lands during a drain gets one more pass, not a wait for foreground', async () => {
    let release!: () => void;
    let first = true;
    const doFetch: FetchLike = async () => {
      if (first) {
        first = false;
        await new Promise<void>((r) => (release = r));
      }
      return { status: 200, text: async () => JSON.stringify(PUSH_OK.body) };
    };
    const { host: h, store } = host(doFetch);
    store.append(sale(92, 100));
    const drain = h.syncLatest();
    await Promise.resolve();
    store.append(sale(93, 200)); // while the first push is in flight
    void h.syncLatest(); // the trigger fires mid-drain: must not be dropped
    release();
    await drain;
    expect(store.pendingOutbox).toEqual([]);
  });
});
