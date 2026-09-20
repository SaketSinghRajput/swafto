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
import { describe, it, expect } from 'vitest';
import { Host, fetchTransport, secureTokenStore, type FetchLike } from '../src/host.tsx';
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

const freshStore = () => {
  const base = canonicalInput();
  const state: StoreState = {
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

function host(doFetch: FetchLike, storage = memoryStorage(JSON.stringify(TOKENS))) {
  const store = freshStore();
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
  it('no tokens means the consent notice, because there is no account yet', () => {
    const { host: h } = host(fakeFetch(() => PUSH_OK).doFetch, memoryStorage(null));
    expect(h.session.state.screen).toBe('X0');
  });

  it('tokens mean Today, because he is already signed in', () => {
    const { host: h } = host(fakeFetch(() => PUSH_OK).doFetch);
    expect(h.session.state.screen).toBe('T1');
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

    const left = store.pendingOutbox;
    expect(left).toHaveLength(1);
    expect(left[0]!.payload).toMatchObject({ id: '5a1e0000-0000-4000-8000-000000000002' });
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
