/**
 * 4.3 · STRUCTURED LOGGING AND ERROR TRACKING.
 *
 * The log is captured and read, because a redaction list nobody has attacked is a
 * belief, and a metric filter pointed at a field the code never writes is an alarm
 * that never rings. What CloudWatch will match is asserted here byte for byte:
 * `{ $.level = 50 }`, with `err.type`, `reqId`, `route` and `err.stack` on the line.
 */
import { describe, it, expect } from 'vitest';
import { buildApp, type AppDeps } from '../src/app.ts';
import { testDeps } from './_deps.ts';
import { errorFields, processErrorLine } from '../src/error-event.ts';

const KEY = 'test-signing-key-at-least-32-chars!!';
const T0 = '2026-09-19T08:00:00.000Z';
const PHONE = '+919812345678';

type Line = Record<string, unknown> & { level: number; err?: Record<string, unknown> };

function server(over: Partial<AppDeps> = {}, withLevel = true) {
  const written: string[] = [];
  const deps: AppDeps = testDeps({
    ...(withLevel ? { logLevel: 'info' } : {}),
    logStream: { write: (c: string) => void written.push(c) },
    ...over,
  });
  const lines = (): Line[] => written.join('').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Line);
  return { app: buildApp(deps), written, lines };
}

const post = (url: string, payload: unknown) => ({
  method: 'POST' as const,
  url,
  headers: { 'content-type': 'application/json' },
  payload: JSON.stringify(payload),
});

describe('4.3 · one completion line per request', () => {
  it('logs method, route pattern, status, latency and the request id - once - and nothing from the body', async () => {
    const s = server();
    const res = await s.app.inject(post('/v1/auth/otp/request', { phone: PHONE, language: 'en' }));
    expect(res.statusCode).toBe(202);

    const done = s.lines().filter((l) => l.msg === 'request completed');
    expect(done).toHaveLength(1);
    const line = done[0]!;
    expect(line).toMatchObject({ level: 30, method: 'POST', status: 202, route: '/v1/auth/otp/request' });
    expect(typeof line.latencyMs).toBe('number');
    expect(line.latencyMs as number).toBeGreaterThanOrEqual(0);
    expect(line.reqId).toMatch(/^[0-9a-f-]{36}$/);
    // Fastify's own two lines are off, so the total for one request is exactly one.
    expect(s.lines()).toHaveLength(1);
    expect(s.written.join('')).not.toContain('9812345678');
    expect(s.written.join('')).not.toContain('"url"');
  });

  it('the route is the pattern, never the URL: an id in the path or a query string is not logged', async () => {
    const s = server();
    const ID = '0aaaaaaa-0000-4000-8000-0000000000aa';
    await s.app.inject({ method: 'POST', url: `/v1/auth/devices/${ID}/revoke?secret=hunter2`, headers: { 'content-type': 'application/json' }, payload: '{}' });
    const log = s.written.join('');
    expect(log).toContain('/v1/auth/devices/:id/revoke');
    expect(log).not.toContain(ID);
    expect(log).not.toContain('hunter2');
  });

  it('an unmatched path is logged as unmatched, and its path is not logged', async () => {
    const s = server();
    await s.app.inject({ method: 'GET', url: '/nope/with/an/id' });
    const line = s.lines().find((l) => l.msg === 'request completed')!;
    // Unauthenticated, so the fail-closed 401 answers before a 404 can; either way it has no route pattern.
    expect(line).toMatchObject({ status: 401, route: 'unmatched' });
    expect(s.written.join('')).not.toContain('with/an/id');
  });

  it('health probes are at debug, so the balancer does not drown the log', async () => {
    const s = server();
    await s.app.inject({ method: 'GET', url: '/health' });
    expect(s.lines()).toHaveLength(0);
    const d = server({ logLevel: 'debug' });
    await d.app.inject({ method: 'GET', url: '/health' });
    expect(d.lines().find((l) => l.msg === 'request completed')).toMatchObject({ level: 20, route: '/health' });
  });

  it('at the default level (warn) a successful request writes nothing', async () => {
    const quiet = server({}, false);
    await quiet.app.inject({ method: 'GET', url: '/health' });
    await quiet.app.inject(post('/v1/auth/otp/request', { phone: PHONE, language: 'en' }));
    expect(quiet.lines()).toHaveLength(0);
  });

  it('LOG_LEVEL reaches the logger: error level suppresses the completion line', async () => {
    const s = server({ logLevel: 'error' });
    await s.app.inject(post('/v1/auth/otp/request', { phone: PHONE, language: 'en' }));
    expect(s.lines()).toHaveLength(0);
  });
});

describe('4.3 · error events: what the CloudWatch metric filter matches', () => {
  const boom = (): never => {
    throw new TypeError('the limiter is unreachable');
  };

  it('a 500 writes exactly ONE level-50 event with err.type, err.stack, reqId and route', async () => {
    const s = server({ rate: { consumeAll: boom } });
    const res = await s.app.inject(post('/v1/auth/otp/request', { phone: PHONE, language: 'en' }));
    expect(res.statusCode).toBe(500);

    const errors = s.lines().filter((l) => l.level === 50);
    expect(errors, 'one event per failure, not a pair').toHaveLength(1);
    const e = errors[0]!;
    expect(e.err!.type).toBe('TypeError');
    expect(String(e.err!.stack)).toContain('the limiter is unreachable');
    expect(String(e.err!.stack)).toContain('at ');
    expect(e.reqId).toBe(JSON.parse(res.body).requestId);
    expect(e.route).toBe('/v1/auth/otp/request');
    expect(e.status).toBe(500);
    // The client got nothing of it.
    expect(res.body).not.toContain('limiter');
    // The completion line for the same request is NOT level 50, so the filter counts it once.
    expect(s.lines().filter((l) => l.msg === 'request completed')[0]).toMatchObject({ level: 30, status: 500 });
    // And no key appears twice on the raw line (JSON.parse would hide a duplicate).
    const raw = s.written.find((w) => w.includes('"level":50'))!;
    expect(raw.match(/"reqId"/g)).toHaveLength(1);
  });

  it('a 4xx is not an error event', async () => {
    const s = server();
    await s.app.inject(post('/v1/auth/otp/request', { language: 'en' })); // 400: schema
    await s.app.inject({ method: 'GET', url: '/v1/parties/outstanding' }); // 401
    expect(s.lines().filter((l) => l.level >= 50)).toHaveLength(0);
  });

  it('a database outage (503) is an error event too, with its Retry-After intact', async () => {
    const infra = Object.assign(new Error('connection terminated'), { code: 'ECONNREFUSED' });
    const s = server({ rate: { consumeAll: () => Promise.reject(infra) } });
    const res = await s.app.inject(post('/v1/auth/otp/request', { phone: PHONE, language: 'en' }));
    expect(res.statusCode).toBe(503);
    expect(res.headers['retry-after']).toBeDefined();
    const e = s.lines().filter((l) => l.level === 50);
    expect(e).toHaveLength(1);
    expect(e[0]!.err).toMatchObject({ type: 'Error', code: 'ECONNREFUSED' });
  });

  it('a driver error is not spread into the log: detail and parameters never appear', async () => {
    const driver = Object.assign(new Error('duplicate key value violates unique constraint "users_phone_key"'), {
      code: '23505',
      detail: 'Key (phone)=(+919812345678) already exists.',
      parameters: [PHONE],
    });
    const s = server({ rate: { consumeAll: () => Promise.reject(driver) } });
    await s.app.inject(post('/v1/auth/otp/request', { phone: PHONE, language: 'en' }));
    const log = s.written.join('');
    expect(log).toContain('23505');
    expect(log).not.toContain('9812345678');
    expect(log).not.toContain('already exists');
  });

  it('errorFields: names the constructor, caps the message, survives a non-Error throw', () => {
    class WriteRefused extends Error {}
    expect(errorFields(new WriteRefused('x')).type).toBe('WriteRefused');
    expect(errorFields(new Error('y'.repeat(5000))).message).toHaveLength(500);
    const odd = errorFields('a bare string');
    expect(odd).toMatchObject({ type: 'NonError', message: 'a bare string' });
    expect(odd.stack).toContain('at ');
    expect(errorFields({ phone: PHONE }).message).not.toContain('9812345678');
    expect(errorFields(undefined).message).toBe('undefined');
  });

  it('a failure with no request (unhandled rejection) has the same shape, with null reqId and route', () => {
    const line = JSON.parse(processErrorLine(new RangeError('late'), 'unhandled rejection', new Date(T0))) as Line;
    expect(line).toMatchObject({ level: 50, msg: 'unhandled rejection', reqId: null, route: null });
    expect(line.err).toMatchObject({ type: 'RangeError', message: 'late' });
    expect(String(line.err!.stack)).toContain('at ');
  });
});

describe('4.3 · redaction: phone, OTP, tokens and amounts, at any of three depths', () => {
  const SECRETS = {
    phone: '+919812345678',
    otp: '482913',
    token: 'tok-aaaaaaaaaaaa',
    accessToken: 'acc-bbbbbbbbbbbb',
    refreshToken: 'ref-cccccccccccc',
    purchaseToken: 'pur-dddddddddddd',
    authorization: 'Bearer eeeeeeeeeeee',
    amount: 987654321,
    openingCash: 123456789,
    countedCash: 555444333,
    balance: 111222333,
  };

  it.each([
    ['top level', (o: object) => o],
    ['one down', (o: object) => ({ body: o })],
    ['two down', (o: object) => ({ data: { body: o } })],
    ['five down (RT-W4-6; the stated limit)', (o: object) => ({ a: { b: { c: { d: { e: o } } } } })],
  ])('censors every secret key, %s', (_name, wrap) => {
    const s = server();
    s.app.log.info(wrap(SECRETS), 'probe');
    const raw = s.written.join('');
    expect(raw).toContain('[redacted]');
    for (const [k, v] of Object.entries(SECRETS)) {
      expect(raw, k + ' leaked').not.toContain(String(v));
    }
  });

  /*
   * THROUGH A REAL REQUEST, not a hand-written log call: the sentinels travel in the body, the
   * headers and the query string, at `trace` (the loudest level), on a path that completes and on
   * one that fails with a 500 whose error message quotes them. None may reach the captured log.
   */
  describe('a real request carrying a phone, an OTP, a token and an amount (RT-W4-6)', () => {
    const SENTINELS = ['9876512345', '482913', 'tok-SENTINEL-1', '7654321'];
    const request = {
      method: 'POST' as const,
      url: '/v1/auth/otp/verify?phone=9876512345&otp=482913&token=tok-SENTINEL-1&amount=7654321',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer tok-SENTINEL-1',
        cookie: 'sid=tok-SENTINEL-1',
        'x-phone': '9876512345',
        'x-otp': '482913',
        'x-amount': '7654321',
      },
      payload: JSON.stringify({
        phone: '+919876512345',
        code: '482913',
        device: { platform: 'android' },
        shopName: 'tok-SENTINEL-1 7654321',
      }),
    };
    const absent = (log: string) => {
      expect(log).toContain('request completed');
      for (const v of SENTINELS) expect(log, v + ' leaked').not.toContain(v);
    };

    it('a refused verify (401) at trace', async () => {
      const s = server({ logLevel: 'trace' });
      const res = await s.app.inject(request);
      expect(res.statusCode).toBe(401);
      absent(s.written.join(''));
    });

    it('a failed one (500), whose error message quotes the input', async () => {
      const quoting = () => Promise.reject(new Error('limiter failed: +919876512345 482913 tok-SENTINEL-1 7654321'));
      const s = server({ logLevel: 'trace', rate: { consumeAll: quoting } });
      // The OTP-request route is the one that reaches the limiter, so it is the one that can 500.
      const res = await s.app.inject({
        ...request,
        url: '/v1/auth/otp/request?phone=9876512345&otp=482913&token=tok-SENTINEL-1&amount=7654321',
        payload: JSON.stringify({ phone: '+919876512345', language: 'en', deviceId: 'tok-SENTINEL-1' }),
      });
      expect(res.statusCode).toBe(500);
      expect(s.lines().filter((l) => l.level === 50)).toHaveLength(1);
      absent(s.written.join(''));
    });
  });

  it('censors the OTP key `code` where a request body would carry it, but keeps err.code', () => {
    const s = server();
    s.app.log.info({ body: { code: '482913' } }, 'a');
    s.app.log.info({ code: '735190' }, 'b');
    s.app.log.error({ err: errorFields(Object.assign(new Error('c'), { code: 'ECONNREFUSED' })) }, 'c');
    const raw = s.written.join('');
    expect(raw).not.toContain('482913');
    expect(raw).not.toContain('735190');
    expect(raw).toContain('ECONNREFUSED');
  });
});
