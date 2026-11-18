/**
 * C-15 · GRACEFUL SHUTDOWN. What a SIGTERM must do for a deploy to cost nobody a
 * request: readiness flips first with the listener still open, in-flight requests
 * finish, the pools close last, and a hung drain is cut at a deadline.
 */
import { describe, it, expect } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { buildApp } from '../src/app.ts';
import { testDeps } from './_deps.ts';
import { gracefulShutdown } from '../src/shutdown.ts';
import { mintToken } from '../src/auth/tokens.ts';

const KEY = 'test-signing-key-at-least-32-chars!!';
const T0 = '2026-09-19T08:00:00.000Z';
const SHOP = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const DEVICE = '33333333-3333-4333-8333-333333333333';
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const deps = (extra: object = {}) => testDeps(extra);

/** One request on its own connection, so no keep-alive pool hides a refused connect. */
function get(port: number, path: string, token?: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path, agent: false, headers: token ? { authorization: 'Bearer ' + token } : {} }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      })
      .on('error', reject);
  });
}

describe('GET /ready while draining', () => {
  it('is 503 + Retry-After as soon as draining is on, while /health stays 200 (fails without isDraining)', async () => {
    let draining = false;
    const app = buildApp(deps({ isDraining: () => draining, ready: async () => undefined }));
    expect((await app.inject({ method: 'GET', url: '/ready' })).statusCode).toBe(200);
    draining = true;
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(503);
    expect(res.headers['retry-after']).toBeDefined();
    expect(JSON.parse(res.body).status).toBe('draining');
    // Liveness must not follow: a draining process is alive, and killing it early loses requests.
    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    await app.close();
  });
});

describe('gracefulShutdown on a real listener', () => {
  it('flips /ready first with the port still open, lets the in-flight request finish, closes resources last, then refuses connections', async () => {
    const order: string[] = [];
    let release!: () => void;
    let entered!: () => void;
    const inRoute = new Promise<void>((r) => (entered = r));
    let released = false;

    // `/__slow` is not a public route, so the request carries a real session like any other.
    const d = deps({ isDraining: () => shutdown.isDraining(), ready: async () => undefined });
    await d.repo.createShopAndUser({ shopId: SHOP, userId: USER, phone: '+919876500001', shopName: 'S', language: 'en', now: T0 });
    await d.repo.registerDevice({ id: DEVICE, userId: USER, shopId: SHOP, platform: 'android', createdAt: T0, lastSeenAt: null, revokedAt: null });
    const token = mintToken(KEY, { sub: USER, shop: SHOP, dev: DEVICE, typ: 'access', nowSeconds: Math.floor(Date.parse(T0) / 1000), ttlSeconds: 86_400 });
    const app = buildApp(d);
    app.get('/__slow', async () => {
      entered();
      await new Promise<void>((r) => (release = r));
      return { finished: true };
    });
    const shutdown = gracefulShutdown({
      closeServer: async () => {
        order.push('close-start');
        await app.close();
        // The drain only gets here once the slow request has been answered.
        order.push(released ? 'close-done-after-release' : 'close-done-BEFORE-release');
      },
      closeResources: async () => void order.push('resources'),
      readyGraceMs: 200,
      forceAfterMs: 10_000,
      log: () => undefined,
    });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const port = (app.server.address() as AddressInfo).port;

    const inFlight = get(port, '/__slow', token);
    await inRoute;
    expect(shutdown.isDraining()).toBe(false);

    const done = shutdown.begin('test');
    expect(shutdown.isDraining()).toBe(true);

    // During the grace window the listener is open: readiness already says 503, liveness 200.
    const ready = await get(port, '/ready');
    expect(ready.status).toBe(503);
    expect(JSON.parse(ready.body).status).toBe('draining');
    expect((await get(port, '/health')).status).toBe(200);
    expect(order).toEqual([]); // nothing has been closed yet

    // Past the grace window the server is closing, the slow request still in the air.
    await sleep(350);
    expect(order).toEqual(['close-start']);
    released = true;
    release();
    const finished = await inFlight;
    expect(finished.status).toBe(200);
    expect(JSON.parse(finished.body)).toEqual({ finished: true });

    expect(await done).toBe(0);
    expect(order).toEqual(['close-start', 'close-done-after-release', 'resources']);
    await expect(get(port, '/health')).rejects.toThrow();
  });

  it('is idempotent: a second signal does not close twice', async () => {
    let closes = 0;
    const s = gracefulShutdown({ closeServer: async () => void (closes += 1), closeResources: async () => undefined, readyGraceMs: 0, forceAfterMs: 1000, log: () => undefined });
    const a = s.begin('SIGTERM');
    const b = s.begin('SIGINT');
    expect(b).toBe(a);
    expect(await a).toBe(0);
    expect(closes).toBe(1);
  });

  it('gives up at the deadline with exit code 1 and does not touch the pools under a request still open', async () => {
    let resources = 0;
    const lines: string[] = [];
    const s = gracefulShutdown({
      closeServer: () => new Promise(() => undefined), // a request that never ends
      closeResources: async () => void (resources += 1),
      readyGraceMs: 0,
      forceAfterMs: 60,
      log: (l) => lines.push(l),
    });
    expect(await s.begin('SIGTERM')).toBe(1);
    expect(resources).toBe(0);
    expect(lines.join('')).toMatch(/deadline passed/);
  });

  it('RT-W3-3 · at the deadline it cuts held connections, still releases the pools once, and exits 0', async () => {
    let forced = false;
    let resources = 0;
    let release!: () => void;
    const s = gracefulShutdown({
      // The server cannot close while a client holds a socket; it settles once the sockets are cut.
      closeServer: () => new Promise<void>((r) => (release = r)),
      forceCloseConnections: () => {
        forced = true;
        release();
      },
      closeResources: async () => void (resources += 1),
      readyGraceMs: 0,
      forceAfterMs: 60,
      log: () => undefined,
    });
    expect(await s.begin('SIGTERM')).toBe(0);
    expect(forced).toBe(true);
    expect(resources).toBe(1);
  });

  it('RT-W3-3 · a real listener held open by a stalled request does not hold the deploy hostage', async () => {
    let resources = 0;
    const app = buildApp(deps({}));
    const shutdown = gracefulShutdown({
      closeServer: () => app.close(),
      forceCloseConnections: () => app.server.closeAllConnections(),
      closeResources: async () => void (resources += 1),
      readyGraceMs: 0,
      forceAfterMs: 300,
      log: () => undefined,
    });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const port = (app.server.address() as AddressInfo).port;
    // Declares 1000 bytes, sends 10, and never finishes: unauthenticated, as the red team found.
    const stalled = http.request({ host: '127.0.0.1', port, path: '/v1/auth/otp/request', method: 'POST', agent: false, headers: { 'content-type': 'application/json', 'content-length': '1000' } });
    stalled.on('error', () => undefined);
    stalled.write('{"phone":"9');
    await sleep(50);
    expect(await shutdown.begin('SIGTERM')).toBe(0);
    expect(resources).toBe(1);
    await expect(get(port, '/health')).rejects.toThrow();
    stalled.destroy();
  });

  it('reports a failing close as exit code 1 rather than throwing', async () => {
    const s = gracefulShutdown({
      closeServer: async () => {
        throw new Error('boom');
      },
      closeResources: async () => undefined,
      readyGraceMs: 0,
      forceAfterMs: 1000,
      log: () => undefined,
    });
    expect(await s.begin('SIGTERM')).toBe(1);
  });
});
