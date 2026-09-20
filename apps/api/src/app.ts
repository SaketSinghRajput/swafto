/**
 * THE API. Fastify (ADR-005), assembled here and nowhere else.
 *
 * EVERYTHING IS INJECTED. The clock, the repository, the SMS port, the signing key
 * and the OTP store all arrive as arguments. Not for elegance - so the tests can
 * drive a REAL server over `inject()` with no network, no database, and no clock
 * that moves under them. A suite that needs Postgres listening is a suite that gets
 * skipped, and this build has already paid for that once.
 *
 * WHAT THIS LAYER MAY NOT DO, AND THE RULE IS ABSOLUTE. §07.03: nothing derived
 * crosses the wire as authoritative. The server stores what the shopkeeper typed
 * and re-derives every figure with the SAME engine the phone uses. There is no
 * second implementation of the cash formula here, so there is no second answer to
 * disagree with the first. The read routes prove it by running the canonical day
 * through the API and comparing against the golden vectors.
 *
 * SECURITY POSTURE, STATED ONCE. Every response carries the hardening headers. No
 * CORS: the client is a native app, there is no browser origin to allow, and an
 * Access-Control-Allow-Origin here would exist only to let some web page spend a
 * shopkeeper's session. Bodies are capped. Errors carry no stack, no SQL and no
 * constraint name to the client. Logs carry no phone number.
 */
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { Repo } from './db/port.ts';
import type { SmsPort } from './sms/port.ts';
import type { RateRule } from './rate-limit/limits.ts';
import type { RateDecision } from './rate-limit/store.ts';
import { verifyToken, type Claims } from './auth/tokens.ts';
import { registerAuthRoutes, type OtpStore } from './auth/routes.ts';
import { registerSyncRoutes } from './sync/routes.ts';
import { registerReadRoutes } from './read/routes.ts';
import { registerDpdpRoutes } from './dpdp/routes.ts';

export interface AppDeps {
  readonly repo: Repo;
  readonly sms: SmsPort;
  readonly otp: OtpStore;
  /** ISO-8601 UTC. Injected so a test can hold the clock still. */
  readonly now: () => string;
  readonly signingKey: string;
  /**
   * The rate limiter, as the one method the routes use.
   *
   * Typed as an interface rather than as `RateLimiter` so a test can hand over the
   * real limiter backed by an in-memory `rate_events` table - the LIMITER is never
   * substituted, only its storage. A second limiter written for tests would agree
   * with the real one until somebody changed one of them.
   */
  readonly rate: {
    consumeAll(
      checks: readonly { rule: RateRule; identifier: string }[],
    ): Promise<RateDecision>;
  };
  /** Bodies larger than this are refused before they are parsed. */
  readonly bodyLimitBytes?: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    claims?: Claims;
  }
}

/**
 * The routes reachable without a token. Everything else needs one.
 *
 * AN ALLOW-LIST, NOT A DENY-LIST. A deny-list forgets the route somebody adds next
 * month; an allow-list fails closed, and the failure is a 401 on a new endpoint
 * rather than an open door on it.
 */
const PUBLIC_ROUTES = new Set([
  'POST /v1/auth/otp/request',
  'POST /v1/auth/otp/verify',
  'POST /v1/auth/refresh',
  'GET /v1/legal/notice',
  'GET /health',
]);

export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({
    /*
     * The request id comes from us, never from the caller. An `X-Request-Id` off
     * the wire is attacker-controlled and lands in every log line after it.
     */
    genReqId: () => randomUUID(),
    requestIdHeader: false,
    bodyLimit: deps.bodyLimitBytes ?? 1_048_576,
    /*
     * REFUSE UNKNOWN FIELDS, DO NOT QUIETLY DELETE THEM.
     *
     * Fastify's Ajv defaults to `removeAdditional: true`, so a body carrying an
     * extra property is silently stripped and the request succeeds. That is safe
     * in the sense that the value never reaches a handler, and wrong in the sense
     * that matters here: a client sending `shopId` in a sync push is a client with
     * a bug about whose ledger it is writing to, and it gets a 200 telling it
     * everything is fine. Caught by the test that asserted a 400 and got a 200.
     */
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
    /*
     * A phone number is personal data under the DPDP Act and a log line is a
     * disclosure nobody consented to. Redaction is declared here rather than left
     * to each call site, because a call site is a thing somebody forgets.
     */
    logger: {
      level: process.env.LOG_LEVEL ?? 'warn',
      redact: {
        paths: [
          'req.body.phone',
          'req.body.code',
          'req.body.otp',
          'req.headers.authorization',
          'req.headers.cookie',
          'phone',
          'code',
        ],
        censor: '[redacted]',
      },
    },
  });

  /* ---- 1 · hardening headers on every response, success or failure ----- */
  app.addHook('onSend', async (_req, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    // An API returns data, never markup. Nothing may be loaded, framed or executed.
    reply.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    reply.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    reply.header('Cache-Control', 'no-store');
    reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    reply.removeHeader('X-Powered-By');
    return payload;
  });

  /* ---- 2 · refuse anything that is not JSON ----------------------------- */
  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') return;
    const type = String(req.headers['content-type'] ?? '');
    if (!type.startsWith('application/json')) {
      await reply.code(415).send({ error: 'unsupported_media_type' });
    }
  });

  /* ---- 3 · authentication, fail-closed ---------------------------------- */
  app.addHook('preHandler', async (req, reply) => {
    const route = req.method + ' ' + String(req.routeOptions?.url ?? req.url);
    if (PUBLIC_ROUTES.has(route)) return;

    const header = req.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      await reply.code(401).send({ error: 'unauthenticated' });
      return;
    }
    try {
      const nowSeconds = Math.floor(Date.parse(deps.now()) / 1000);
      const claims = verifyToken(deps.signingKey, header.slice(7), 'access', nowSeconds);
      /*
       * A valid signature is not enough. The device it was issued to may have been
       * revoked since - a lost handset, a sold handset - and a token that outlives
       * the revocation is the reason revocation exists.
       */
      const device = await deps.repo.findDevice(claims.dev);
      if (!device || device.revokedAt) {
        await reply.code(401).send({ error: 'device_revoked' });
        return;
      }
      req.claims = claims;
    } catch {
      await reply.code(401).send({ error: 'unauthenticated' });
    }
  });

  /* ---- 4 · errors leave nothing behind ---------------------------------- */
  app.setErrorHandler(async (error: { statusCode?: number; code?: string; message?: string }, req, reply) => {
    const status = typeof error.statusCode === 'number' ? error.statusCode : 500;
    /*
     * The full error goes to OUR log; the client gets a code and nothing else. A
     * constraint name, a SQL fragment or a stack trace tells an attacker the shape
     * of the schema, and tells the shopkeeper nothing he can act on.
     */
    if (status >= 500) req.log.error({ err: error, reqId: req.id }, 'request failed');
    await reply.code(status).send({
      error: status >= 500 ? 'internal_error' : (error.code ?? 'bad_request'),
      message: status >= 500 ? 'something went wrong on our side' : error.message,
      requestId: req.id,
    });
  });

  app.setNotFoundHandler(async (req, reply) => {
    await reply.code(404).send({ error: 'not_found', requestId: req.id });
  });

  /* ---- 5 · the routes ---------------------------------------------------- */
  app.get('/health', async () => ({ status: 'ok' }));

  registerAuthRoutes(app, deps);
  registerSyncRoutes(app, deps);
  registerReadRoutes(app, deps);
  registerDpdpRoutes(app, deps);

  return app;
}

/** The authenticated shop, or a refusal. Every handler that touches a ledger uses it. */
export function shopOf(req: FastifyRequest): string {
  if (!req.claims) throw new Error('shopOf called on an unauthenticated request');
  return req.claims.shop;
}
