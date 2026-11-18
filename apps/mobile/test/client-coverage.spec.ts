/**
 * ApiClient behaviour not covered elsewhere: refresh-token rotation (client
 * half), every route wrapper's method/path/body, sign-in edge cases and the
 * push batching. A scripted transport records exactly what crossed the wire.
 */
import { describe, expect, it } from 'vitest';
import {
  ApiClient,
  ApiError,
  Offline,
  Unauthenticated,
  memoryTokenStore,
  type HttpRequest,
  type HttpResponse,
  type SessionTokens,
} from '../src/net/client.ts';
import type { OutboxRow } from '../src/store/index.ts';

const SESSION: SessionTokens = { accessToken: 'a1', refreshToken: 'r1', deviceId: 'd 1', shopId: 's1' };

function rig(
  answer: (req: HttpRequest, n: number) => HttpResponse | Promise<HttpResponse>,
  held: SessionTokens | null = SESSION,
) {
  const seen: HttpRequest[] = [];
  const tokens = memoryTokenStore(held);
  const writes: (SessionTokens | null)[] = [];
  const store = {
    read: () => tokens.read(),
    write: (t: SessionTokens | null) => {
      writes.push(t);
      tokens.write(t);
    },
  };
  const client = new ApiClient(
    {
      async send(req) {
        seen.push(req);
        return answer(req, seen.length);
      },
    },
    store,
  );
  return { client, seen, store, writes };
}

const ok = (body: unknown = {}): HttpResponse => ({ status: 200, body });

/** 401 on the first call, then whatever `refresh` says, then 200. */
const expiring =
  (refresh: HttpResponse) =>
  (req: HttpRequest, n: number): HttpResponse => {
    if (req.path === '/v1/auth/refresh') return refresh;
    return n === 1 ? { status: 401, body: {} } : ok({ fine: true });
  };

describe('refresh-token rotation (client half)', () => {
  it('stores a rotated refresh token together with the access token, in ONE write', async () => {
    const { client, store, writes } = rig(expiring(ok({ accessToken: 'a2', refreshToken: 'r2' })));
    await client.alerts();
    expect(store.read()).toEqual({ ...SESSION, accessToken: 'a2', refreshToken: 'r2' });
    expect(writes).toHaveLength(1);
  });

  it('keeps the old refresh token when the server does not rotate', async () => {
    const { client, store } = rig(expiring(ok({ accessToken: 'a2' })));
    await client.alerts();
    expect(store.read()).toEqual({ ...SESSION, accessToken: 'a2' });
  });

  it('ignores an empty refreshToken', async () => {
    const { client, store } = rig(expiring(ok({ accessToken: 'a2', refreshToken: '' })));
    await client.alerts();
    expect(store.read()?.refreshToken).toBe('r1');
  });

  it('sends the NEW refresh token on the next refresh', async () => {
    let round = 0;
    const used = new Set<string>();
    const { client, seen } = rig((req) => {
      if (req.path === '/v1/auth/refresh') {
        round += 1;
        return ok({ accessToken: 'a' + (round + 1), refreshToken: 'r' + (round + 1) });
      }
      // each access token is good for exactly one call, then it has "expired"
      const bearer = req.headers.authorization!;
      if (bearer !== 'Bearer a1' && !used.has(bearer)) {
        used.add(bearer);
        return ok();
      }
      return { status: 401, body: {} };
    });
    await client.alerts();
    await client.alerts();
    const sent = seen
      .filter((r) => r.path === '/v1/auth/refresh')
      .map((r) => (r.body as { refreshToken: string }).refreshToken);
    expect(sent).toEqual(['r1', 'r2']);
  });

  it('two calls that expire together spend the refresh token ONCE', async () => {
    let refreshes = 0;
    const { client } = rig((req) => {
      if (req.path === '/v1/auth/refresh') {
        refreshes += 1;
        return ok({ accessToken: 'a2', refreshToken: 'r2' });
      }
      return req.headers.authorization === 'Bearer a2' ? ok() : { status: 401, body: {} };
    });
    await Promise.all([client.alerts(), client.reports()]);
    expect(refreshes).toBe(1);
  });

  it('a dead refresh token (401) clears the session', async () => {
    const { client, store } = rig(expiring({ status: 401, body: {} }));
    await expect(client.alerts()).rejects.toBeInstanceOf(Unauthenticated);
    expect(store.read()).toBeNull();
  });

  it('a server hiccup on refresh (503) keeps the tokens', async () => {
    const { client, store } = rig(expiring({ status: 503, body: { error: 'down' } }));
    await expect(client.alerts()).rejects.toBeInstanceOf(ApiError);
    expect(store.read()).toEqual(SESSION);
  });
});

describe('route wrappers carry the right method, path and body', () => {
  const cases: [string, (c: ApiClient) => Promise<unknown>, string, string, unknown][] = [
    ['summary', (c) => c.summary('2026-04-05'), 'GET', '/v1/days/2026-04-05/summary', undefined],
    ['alerts', (c) => c.alerts(), 'GET', '/v1/alerts', undefined],
    ['outstanding', (c) => c.outstanding(), 'GET', '/v1/parties/outstanding', undefined],
    ['exportParty', (c) => c.exportParty('p/1'), 'GET', '/v1/parties/p%2F1/export', undefined],
    ['redactParty', (c) => c.redactParty('p1'), 'POST', '/v1/parties/p1/redact', {}],
    ['reports', (c) => c.reports(), 'GET', '/v1/reports', undefined],
    [
      'setConsent',
      (c) => c.setConsent('sms_reminders', false, 'or'),
      'POST',
      '/v1/me/consent',
      { purpose: 'sms_reminders', granted: false, locale: 'od' },
    ],
    ['consents', (c) => c.consents(), 'GET', '/v1/me/consents', undefined],
    ['exportMe', (c) => c.exportMe(), 'GET', '/v1/me/export', undefined],
    ['erase', (c) => c.erase('DELETE'), 'POST', '/v1/me/erase', { confirm: 'DELETE' }],
    ['cancelErase', (c) => c.cancelErase(), 'POST', '/v1/me/erase/cancel', {}],
    ['grievance', (c) => c.grievance(), 'GET', '/v1/me/grievance', undefined],
    ['planAnswer', (c) => c.planAnswer(), 'GET', '/v1/billing/entitlement', undefined],
    ['startPreview', (c) => c.startPreview(), 'POST', '/v1/billing/preview', {}],
    [
      'verifyPurchase',
      (c) => c.verifyPurchase('tok', 'prod'),
      'POST',
      '/v1/billing/play/verify',
      { purchaseToken: 'tok', productId: 'prod' },
    ],
    ['setShopName', (c) => c.setShopName('Maa Stores'), 'POST', '/v1/me/shop', { name: 'Maa Stores' }],
    ['revokeDevice', (c) => c.revokeDevice('d 1'), 'POST', '/v1/auth/devices/d%201/revoke', {}],
  ];
  it.each(cases)('%s', async (_n, call, method, path, body) => {
    const { client, seen } = rig(() => ok({ current: {} }));
    await call(client);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ method, path });
    expect(seen[0]!.body).toEqual(body);
    expect(seen[0]!.headers.authorization).toBe('Bearer a1');
  });

  it('notice() is public: no bearer, works with no session', async () => {
    const { client, seen } = rig(() => ok({ v: 1 }), null);
    await client.notice();
    expect(seen[0]).toMatchObject({ method: 'GET', path: '/v1/legal/notice', headers: {} });
  });

  it('grantedNow() lists only purposes currently on', async () => {
    const { client } = rig(() => ok({ current: { sms_reminders: true, account_and_ledger: false, crash_diagnostics: true }, consents: [] }));
    expect(await client.grantedNow()).toEqual(['sms_reminders', 'crash_diagnostics']);
  });

  it('an authed call with no session is Unauthenticated and sends nothing', async () => {
    const { client, seen } = rig(() => ok(), null);
    await expect(client.alerts()).rejects.toBeInstanceOf(Unauthenticated);
    expect(seen).toHaveLength(0);
  });

  it('a transport throw is Offline', async () => {
    const client = new ApiClient({ send: () => Promise.reject(new Error('down')) }, memoryTokenStore(SESSION));
    await expect(client.alerts()).rejects.toBeInstanceOf(Offline);
  });

  it('errors carry the server fields; a 401 after a good refresh clears the session', async () => {
    const a = rig(() => ({ status: 429, body: { error: 'slow', message: 'wait', retryAfterSeconds: 7 } }));
    await expect(a.client.alerts()).rejects.toMatchObject({ status: 429, retryAfterSeconds: 7 });
    const b = rig(() => ({ status: 500, body: null, retryAfterSeconds: 3 }));
    await expect(b.client.alerts()).rejects.toMatchObject({ status: 500, retryAfterSeconds: 3 });
    const c = rig((req) =>
      req.path === '/v1/auth/refresh' ? ok({ accessToken: 'a2' }) : { status: 401, body: {} },
    );
    await expect(c.client.alerts()).rejects.toBeInstanceOf(Unauthenticated);
    expect(c.store.read()).toBeNull();
  });
});

describe('sign-in', () => {
  it('requestOtp sends the wire locale and the device id only when given', async () => {
    const { client, seen } = rig(() => ok({ expiresInSeconds: 300 }), null);
    await client.requestOtp('9876543210', 'or', 'dev-1');
    await client.requestOtp('9876543210');
    expect(seen[0]!.body).toEqual({ phone: '9876543210', language: 'od', deviceId: 'dev-1' });
    expect(seen[1]!.body).toEqual({ phone: '9876543210', language: 'en' });
  });

  it('verify sends consent, stores the tokens and records optional purposes best-effort', async () => {
    const { client, seen, store } = rig((req) => {
      if (req.path === '/v1/auth/otp/verify') return ok(SESSION);
      return { status: 500, body: {} }; // the optional write fails; sign-in must still succeed
    }, null);
    const got = await client.verify({
      phone: '9876543210',
      code: '123456',
      platform: 'android',
      shopName: 'Maa Stores',
      consent: { noticeVersion: 'n1', locale: 'or', granted: ['account_and_ledger', 'sms_reminders'] },
    });
    expect(got).toEqual(SESSION);
    expect(store.read()).toEqual(SESSION);
    expect(seen[0]!.body).toMatchObject({
      shopName: 'Maa Stores',
      consent: { granted: true, noticeVersion: 'n1', locale: 'od' },
    });
    expect(seen.slice(1).map((r) => (r.body as { purpose: string }).purpose)).toEqual(['sms_reminders']);
  });

  it('a wrong code (401) is an ApiError, not a signed-out device', async () => {
    const { client } = rig(() => ({ status: 401, body: null }), null);
    await expect(client.verify({ phone: '9', code: '0', platform: 'android' })).rejects.toMatchObject({
      status: 401,
      code: 'code_invalid',
    });
  });

  it('signOut clears the tokens even when offline, and with no session', async () => {
    const client = new ApiClient({ send: () => Promise.reject(new Error('down')) }, memoryTokenStore(SESSION));
    await client.signOut();
    expect(client.session).toBeNull();
    const none = new ApiClient({ send: () => Promise.reject(new Error('x')) }, memoryTokenStore(null));
    await none.signOut();
    expect(none.session).toBeNull();
  });
});

describe('push', () => {
  const row = (id: string, kind: string, payload: object) => ({ id, kind, payload }) as unknown as OutboxRow;

  it('sends every row kind under its own key and acks all that were not refused', async () => {
    const { client, seen } = rig(() => ok({ daysWritten: 1, entriesInserted: 1, entriesAlreadyPresent: 0 }));
    const rows = [
      row('o1', 'day', {
        date: '2026-04-05',
        state: 'open',
        openingCash: 100,
        countedCash: null,
        differenceReason: 'x',
        closedAt: '2026-04-05T10:00:00Z',
        startsAt: '04:00',
      }),
      row('o2', 'party', { id: 'p1' }),
      row('o3', 'entry', { id: 'e1', dayId: '2026-04-05' }),
      row('o4', 'upi_confirmation', { id: 'u1', dayId: '2026-04-05' }),
      row('o5', 'adjustment', { id: 'j1', dayId: '2026-04-05' }),
      row('o6', 'item', { id: 'i1' }),
      row('o7', 'item_line', { id: 'l1', dayId: '2026-04-05' }),
      row('o8', 'credit_limit', { id: 'c1' }),
    ];
    const r = await client.push(rows);
    expect([...r.accepted].sort()).toEqual(['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8']);
    expect(seen).toHaveLength(1);
    const body = seen[0]!.body as Record<string, unknown[]>;
    expect(Object.keys(body).sort()).toEqual([
      'adjustments',
      'creditLimits',
      'days',
      'entries',
      'itemLines',
      'items',
      'parties',
      'upiConfirmations',
    ]);
    expect(body.days![0]).toEqual({
      date: '2026-04-05',
      state: 'open',
      startsAt: '04:00',
      openingCash: 100,
      differenceReason: 'x',
      closedAt: '2026-04-05T10:00:00Z',
    });
  });

  it('maps a rejection back to the outbox id and leaves that row unacked; empty push sends nothing', async () => {
    const { client, seen } = rig(() =>
      ok({
        daysWritten: 0,
        entriesInserted: 0,
        entriesAlreadyPresent: 1,
        rejected: [
          { id: 'e1', field: 'amount', message: 'bad' },
          { id: 'ghost', field: 'f', message: 'm' },
        ],
      }),
    );
    const r = await client.push([row('o3', 'entry', { id: 'e1', dayId: '2026-04-05' })]);
    expect(r.accepted).toEqual([]);
    expect(r.rejected).toEqual([
      { id: 'o3', field: 'amount', message: 'bad' },
      { id: 'ghost', field: 'f', message: 'm' },
    ]);
    expect(r.alreadyPresent).toBe(1);
    const n = seen.length;
    expect(await client.push([])).toMatchObject({ accepted: [] });
    expect(seen).toHaveLength(n);
  });

  it('cuts an oversized outbox into several requests and calls onBatch for each', async () => {
    const { client, seen } = rig(() => ok({ daysWritten: 0, entriesInserted: 0, entriesAlreadyPresent: 0 }));
    const rows: OutboxRow[] = [];
    for (let d = 1; d <= 3; d += 1) {
      const date = '2026-04-0' + d;
      for (let i = 0; i < 600; i += 1) {
        rows.push(row(`o${d}-${i}`, 'entry', { id: `e${d}-${i}`, dayId: date }));
      }
    }
    const sizes: number[] = [];
    const r = await client.push(rows, (_b, sent) => sizes.push(sent.length));
    expect(seen.length).toBeGreaterThan(1);
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(1800);
    expect(r.accepted).toHaveLength(1800);
    for (const req of seen) {
      expect((req.body as { entries: unknown[] }).entries.length).toBeLessThanOrEqual(1000);
    }
  });
});
