/**
 * 4.2 · THE OPENAPI DOCUMENT IS THE API.
 *
 * Three things are proved. The committed file is what the generator produces from the
 * routes as they are served now. The generator refuses to describe a route it has not
 * been told about, or a POST that takes input and declares none. And the routes that used
 * to ignore stray input now refuse it, because a document that says "400" about a route
 * that answers 200 is worse than no document.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildApp, PUBLIC_ROUTES, type AppDeps } from '../src/app.ts';
import { testDeps } from './_deps.ts';
import { StubSmsPort } from '../src/sms/stub.ts';
import { NOTICE_VERSION } from '../src/dpdp/routes.ts';
// @ts-expect-error - a plain .mjs tool with no declaration file
import { render, buildDocument, collectRoutes } from '../../../tools/gen-openapi.mjs';

interface Op {
  security: object[];
  parameters?: { name: string; in: string }[];
  requestBody?: { content: Record<string, { schema: { additionalProperties?: boolean } }> };
  responses: Record<string, { $ref?: string; description?: string }>;
}
type Doc = {
  openapi: string;
  paths: Record<string, Record<string, Op>>;
  components: { responses: Record<string, { headers?: Record<string, unknown> }> };
};

const committed = JSON.parse(readFileSync('docs/api/openapi.json', 'utf8')) as Doc;
const served = (collectRoutes() as { routes: { method: string; url: string; schema: object }[] }).routes;

describe('4.2 · docs/api/openapi.json', () => {
  it('is exactly what the generator produces from the routes served now (so --check would pass)', () => {
    expect(readFileSync('docs/api/openapi.json', 'utf8')).toBe((render() as { text: string }).text);
  });

  it('is OpenAPI 3.1 and describes every route the app serves, no more and no fewer', () => {
    expect(committed.openapi).toBe('3.1.0');
    const documented = Object.entries(committed.paths).flatMap(([p, m]) =>
      Object.keys(m).map((method) => `${method.toUpperCase()} ${p}`),
    );
    const real = served.map((r) => `${r.method} ${r.url.replace(/:([A-Za-z0-9_]+)/g, '{$1}')}`);
    expect(documented.sort()).toEqual(real.sort());
    expect(served.length).toBeGreaterThanOrEqual(33);
  });

  it('marks every route that needs a session with bearerAuth, and every public one without it', () => {
    for (const r of served) {
      const op = committed.paths[r.url.replace(/:([A-Za-z0-9_]+)/g, '{$1}')]![r.method.toLowerCase()]!;
      const isPublic = PUBLIC_ROUTES.has(`${r.method} ${r.url}`);
      const uses = op.security.flatMap((s) => Object.keys(s));
      if (isPublic) expect(uses, r.url).not.toContain('bearerAuth');
      else expect(uses, r.url).toEqual(['bearerAuth']);
      if (!isPublic) expect(Object.keys(op.responses), r.url).toContain('401');
    }
    // The webhook is public to sessions and still authenticated, by Google.
    const rtdn = committed.paths['/v1/billing/play/rtdn']!.post!;
    expect(rtdn.security).toEqual([{ googleOidc: [] }]);
  });

  it('documents the error shapes: 429 and 503 carry Retry-After, and the codes the routes really use are present', () => {
    expect(committed.components.responses.RateLimited!.headers).toHaveProperty('Retry-After');
    expect(committed.components.responses.Unavailable!.headers).toHaveProperty('Retry-After');
    const has = (path: string, method: string, ...codes: string[]) => {
      for (const c of codes) expect(Object.keys(committed.paths[path]![method]!.responses), `${method} ${path}`).toContain(c);
    };
    has('/v1/auth/otp/request', 'post', '400', '415', '429', '503');
    has('/v1/auth/otp/verify', 'post', '401', '403', '429');
    has('/v1/me/consent', 'post', '409');
    has('/v1/days/{date}/close', 'post', '404', '409', '422', '429');
    has('/v1/billing/play/verify', 'post', '400', '403', '409', '502', '503');
    has('/v1/parties/{id}/redact', 'post', '404', '429');
    has('/v1/sync/push', 'post', '413', '429');
    expect(committed.paths['/v1/auth/refresh']!.post!.responses['200']).toBeDefined();
  });

  it("every request schema is the route's own, passed through: strict objects stay strict", () => {
    for (const r of served) {
      const body = (r.schema as { body?: object }).body;
      if (!body) continue;
      const op = committed.paths[r.url.replace(/:([A-Za-z0-9_]+)/g, '{$1}')]![r.method.toLowerCase()]!;
      expect(op.requestBody!.content['application/json']!.schema, r.url).toEqual(body);
    }
  });
});

describe('4.2 · the generator refuses what it cannot describe', () => {
  const route = (method: string, url: string, schema: object = {}) => ({ method, url, schema });

  it('a route nobody wrote a summary for stops the run', () => {
    expect(() => buildDocument([...served, route('GET', '/v1/brand/new', { querystring: {} })], '0.0.0')).toThrow(
      /no OPS entry .*GET \/v1\/brand\/new/,
    );
  });

  it('a POST that takes input and declares no body schema stops the run', () => {
    const stripped = served.map((r) => (r.url === '/v1/me/erase/cancel' ? { ...r, schema: {} } : r));
    expect(() => buildDocument(stripped, '0.0.0')).toThrow(/POST \/v1\/me\/erase\/cancel is a POST with no body schema/);
  });

  it('a GET with no querystring schema, and no written exemption, stops the run', () => {
    const stripped = served.map((r) => (r.url === '/v1/me/consents' ? { ...r, schema: {} } : r));
    expect(() => buildDocument(stripped, '0.0.0')).toThrow(/GET \/v1\/me\/consents is a GET with no querystring schema/);
  });

  it('a curated entry for a route that no longer exists stops the run', () => {
    const without = served.filter((r) => r.url !== '/v1/reports');
    expect(() => buildDocument(without, '0.0.0')).toThrow(/does not exist: GET \/v1\/reports/);
  });
});

/* ---------------------------------------------------------------------------------- *
 * The routes that used to ignore stray input now refuse it. Each assertion fails on the
 * code before the schemas were added (a 200, a 404 or a 401 instead of the 400).
 * ---------------------------------------------------------------------------------- */
describe('4.2 · routes that take nothing refuse something', () => {
  const KEY = 'test-signing-key-at-least-32-chars!!';
  const T0 = '2026-09-19T08:00:00.000Z';
  const PHONE = '+919876500081';
  const JSON_H = { 'content-type': 'application/json' };

  async function session() {
    const sms = new StubSmsPort();
    const deps: AppDeps = testDeps({ sms });
    const app = buildApp(deps);
    await app.inject({ method: 'POST', url: '/v1/auth/otp/request', headers: JSON_H, payload: JSON.stringify({ phone: PHONE, language: 'en' }) });
    const code = sms.forPhone(PHONE).at(-1)!.variables[0]!;
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/otp/verify',
      headers: JSON_H,
      payload: JSON.stringify({ phone: PHONE, code, device: { platform: 'android' }, consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' } }),
    });
    const s = JSON.parse(res.body) as { accessToken: string; deviceId: string };
    const call = (method: 'GET' | 'POST', url: string, payload?: unknown) =>
      app.inject({
        method,
        url,
        headers: { authorization: 'Bearer ' + s.accessToken, ...(method === 'POST' ? JSON_H : {}) },
        ...(method === 'POST' ? { payload: JSON.stringify(payload ?? {}) } : {}),
      });
    return { app, call, deviceId: s.deviceId };
  }
  const UUID = '0aaaaaaa-0000-4000-8000-0000000000aa';

  it.each([
    ['GET', '/v1/devices?shopId=x'],
    ['GET', '/v1/me/consents?shopId=x'],
    ['GET', '/v1/me/export?shopId=x'],
    ['GET', `/v1/parties/${UUID}/export?shopId=x`],
  ] as const)('%s %s is a 400, not an ignored parameter', async (method, url) => {
    const { call } = await session();
    const res = await call(method, url);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).message).toMatch(/must NOT have additional properties/);
  });

  it.each([
    ['/v1/auth/devices/__DEVICE__/revoke'],
    ['/v1/me/erase/cancel'],
    [`/v1/parties/${UUID}/redact`],
  ])('POST %s with a stray body field is a 400 and does nothing', async (url) => {
    const { call, deviceId } = await session();
    const path = url.replace('__DEVICE__', deviceId);
    const res = await call('POST', path, { shopId: 'another-shop' });
    expect(res.statusCode).toBe(400);
    // And the empty body still works, which is what the phone sends.
    const ok = await call('POST', path, {});
    expect([200, 404]).toContain(ok.statusCode);
    if (path.includes('/revoke')) expect(ok.statusCode).toBe(200);
  });

  it('the Pub/Sub push body has its types enforced, and still tolerates fields Google adds', async () => {
    const { app } = await session();
    const post = (payload: unknown) =>
      app.inject({ method: 'POST', url: '/v1/billing/play/rtdn', headers: JSON_H, payload: JSON.stringify(payload) });
    // Wrong type: refused at the schema, before any token is looked at.
    expect((await post({ message: { data: 12345 } })).statusCode).toBe(400);
    expect((await post({ message: 'not an object' })).statusCode).toBe(400);
    // A real envelope with extra fields passes the schema (billing is closed here, so 503 is the next answer).
    const real = await post({ message: { data: 'e30=', messageId: '1', attributes: { a: 'b' }, publishTime: 'x' }, subscription: 's', deliveryAttempt: 2 });
    expect(real.statusCode).toBe(503);
    // An empty envelope is not a schema error either: the handler acknowledges what it cannot read.
    expect((await post({})).statusCode).toBe(503);
  });
});
