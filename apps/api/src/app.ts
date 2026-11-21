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
import Fastify, { LogController, type FastifyInstance, type FastifyRequest } from 'fastify';
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
import { registerWebPages, WEB_PAGES } from './web.ts';
import { registerBillingRoutes, RTDN_ROUTE, type BillingDeps } from './billing/routes.ts';
import { isClientDataError, isInfraError, RETRY_AFTER_SECONDS } from './db/errors.ts';
import { makeShopLimitHooks, type ShopLimitSpec } from './sync/shop-limit.ts';
import { errorFields, serializeErr } from './error-event.ts';
import type { DemoLogin } from './auth/demo.ts';

export interface AppDeps {
  readonly repo: Repo;
  readonly sms: SmsPort;
  readonly otp: OtpStore;
  /** ISO-8601 UTC. Injected so a test can hold the clock still. */
  readonly now: () => string;
  readonly signingKey: string;
  /**
   * AUTH_MODE (config.ts). 'invite': `/v1/auth/otp/request` and `/v1/deletion/request` answer a
   * constant reply and touch nothing (no database, no message). Absent means 'sms', so every
   * caller that predates invite codes builds unchanged.
   */
  readonly authMode?: 'invite' | 'sms';
  /** The demo login (auth/demo.ts). Absent or null = off. Works in either AUTH_MODE. */
  readonly demo?: DemoLogin | null;
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
  /**
   * Where the log goes. In production, nowhere this file decides - pino's
   * default is stdout and the container collects it.
   *
   * IT IS INJECTABLE SO THE REDACTION CAN BE PROVEN. The redaction below was
   * configured and never tested: S-16 named a `log-hygiene` spec that did not
   * exist, which is the same shape as the S-11 finding - a defence asserted
   * and never attacked. A test cannot read stdout, so it hands in a stream and
   * reads what was actually written.
   */
  readonly logStream?: { write(chunk: string): void };
  /**
   * 4.3 · pino level, from `LOG_LEVEL` via config (server.ts). Absent = `warn`, so the
   * in-process test servers stay quiet; production passes `info`, which is what turns
   * on the one completion line per request.
   */
  readonly logLevel?: string;
  /**
   * PR-7 · billing. Optional so every caller that predates it still builds;
   * absent, the billing routes answer 503 and nothing else changes.
   */
  readonly billing?: BillingDeps;
  /**
   * C-06 · READINESS. Resolves when the database answers, rejects when it does
   * not. `GET /ready` races it against `readyTimeoutMs` and answers 503 on
   * either. Absent (an in-memory build) means there is nothing to wait for.
   * `/health` stays liveness: it must not depend on the database, or a database
   * blip makes the orchestrator kill a process that was fine.
   */
  readonly ready?: () => Promise<void>;
  readonly readyTimeoutMs?: number;
  /**
   * OPS-09 · Fastify's `trustProxy`. OFF by default: turning it on makes
   * `req.ip` (and so every rate-limit bucket keyed on it) whatever
   * `X-Forwarded-For` says, which is only right when a proxy we run sets it.
   */
  readonly trustProxy?: boolean | number | string;
  /** C-06 · whole-request and idle-socket ceilings. Reversible defaults. */
  readonly requestTimeoutMs?: number;
  readonly connectionTimeoutMs?: number;
  /**
   * BE-15 · per-shop request ceilings on sync push and on the read routes, in
   * process (see `sync/shop-limit.ts`). Absent = the defaults; `false` = off.
   */
  readonly shopLimits?: {
    readonly push?: ShopLimitSpec | false;
    readonly read?: ShopLimitSpec | false;
    /** `/v1/me/export` and `/v1/parties/:id/redact`. */
    readonly heavy?: ShopLimitSpec | false;
  };
  /**
   * Shutdown has begun. `GET /ready` answers 503 from that moment, while the
   * listener is still open, so a load balancer stops routing here BEFORE the
   * process stops accepting (see `shutdown.ts`).
   */
  readonly isDraining?: () => boolean;
  /**
   * 4.2 · A SEAM FOR `tools/gen-openapi.mjs`, NOTHING ELSE. Called once per route as it is
   * registered, with Fastify's own route options (method, url, schema), so the OpenAPI
   * document is built from what is actually served rather than from a second list.
   */
  readonly onRoute?: (route: { method: string | readonly string[]; url: string; schema?: unknown }) => void;
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
export const PUBLIC_ROUTES: ReadonlySet<string> = new Set([
  'POST /v1/auth/otp/request',
  'POST /v1/auth/otp/verify',
  'POST /v1/auth/refresh',
  'GET /v1/legal/notice',
  /*
   * The web deletion path. Play requires it to work for somebody who has
   * uninstalled the app, so it cannot need a token - it verifies by SMS to the
   * registered number instead, under its own OTP namespace and its own limits.
   */
  'POST /v1/deletion/request',
  'POST /v1/deletion/confirm',
  'GET /health',
  'GET /ready',
  /*
   * PR-7: Google's Pub/Sub push carries no SWAFTO session. It is NOT
   * unauthenticated: the route verifies Google's signed OIDC token itself
   * (audience, issuer, service-account email) and refuses anything else.
   */
  'POST ' + RTDN_ROUTE,
  // F-23: the policy and the deletion page are read by people with no account.
  ...Object.keys(WEB_PAGES).map((path) => 'GET ' + path),
]);

/**
 * Keys whose values never belong in a log: a phone, an OTP, any token, and money.
 * `code` is handled separately (see the redact list) because `err.code` is not secret.
 */
const REDACT_KEYS = [
  'phone',
  'otp',
  'token',
  'accessToken',
  'refreshToken',
  'purchaseToken',
  'authorization',
  'cookie',
  'password',
  'signingKey',
  'amount',
  'openingCash',
  'countedCash',
  'balance',
] as const;

/** How many objects below the top a redacted key is found at (RT-W4-6; was 2). */
const REDACT_DEPTH = 5;

/**
 * RT-W4-1 · NUL IS NOT TEXT TO POSTGRES (22021), and a schema's `minLength` does not see it. Any
 * string anywhere in a body or query that carries one is a 400 here, so it never becomes a driver
 * error. Iterative, so a deeply nested body cannot blow the stack. Sync push is exempt: it refuses
 * a bad row per row and answers 200, so one poisoned row does not hold a whole outbox hostage.
 */
function hasNul(root: unknown): boolean {
  const todo: unknown[] = [root];
  while (todo.length > 0) {
    const v = todo.pop();
    if (typeof v === 'string') {
      if (v.includes('\u0000')) return true;
    } else if (typeof v === 'object' && v !== null) {
      for (const [k, x] of Object.entries(v)) {
        if (k.includes('\u0000')) return true;
        todo.push(x);
      }
    }
  }
  return false;
}

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
     * C-06 · A request that never finishes holds a socket and a pool slot. 30 s
     * to receive a whole request is generous even for a push over 2G; a socket
     * idle for a minute is dead. REVERSIBLE DEFAULTS, both injectable.
     */
    requestTimeout: deps.requestTimeoutMs ?? 30_000,
    connectionTimeout: deps.connectionTimeoutMs ?? 60_000,
    // OPS-09: off in buildApp unless config passes one (server.ts defaults to loopback). The cast is typing only.
    trustProxy: (deps.trustProxy ?? false) as boolean,
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
     * 4.3 · ONE COMPLETION LINE PER REQUEST, WRITTEN BY US (the `onResponse` hook
     * below). Fastify's own two lines per request log `req.url`, which carries the
     * query string, and say nothing of the route pattern.
     */
    logController: new LogController({ disableRequestLogging: true }),
    /*
     * A phone number is personal data under the DPDP Act and a log line is a
     * disclosure nobody consented to. Redaction is declared here rather than left
     * to each call site, because a call site is a thing somebody forgets.
     */
    logger: {
      level: deps.logLevel ?? 'warn',
      /*
       * pino's stock `err` serializer copies every own property of an error (a driver
       * error's `detail` and `parameters`) and rewrites `type` to 'Object' for anything
       * that is not an `Error` instance. `errorFields` is the only shape that is written.
       */
      serializers: { err: serializeErr },
      ...(deps.logStream ? { stream: deps.logStream } : {}),
      redact: {
        paths: [
          'req.body.phone',
          'req.body.code',
          'req.body.otp',
          'req.headers.authorization',
          'req.headers.cookie',
          'code',
          ...REDACT_KEYS,
          // The same keys down to REDACT_DEPTH objects (`body.phone`, `err.context.phone`, ...).
          // `code` is left off these: `err.code` (ECONNREFUSED, a SQLSTATE) is diagnosis, not a secret.
          // A key deeper than that is not covered: pino has no recursive wildcard.
          ...Array.from({ length: REDACT_DEPTH }, (_, i) => REDACT_KEYS.map((k) => '*.'.repeat(i + 1) + k)).flat(),
          'body.code',
        ],
        censor: '[redacted]',
      },
    },
  });

  /*
   * EVERY LINE OF A REQUEST CARRIES ITS ROUTE (and `reqId`, which Fastify binds on
   * `req.log` itself). The route is the pattern - `/v1/parties/:id/redact` - never the
   * URL, so no id or query string lands in a log. 404s have no pattern.
   */
  app.addHook('onRequest', async (req) => {
    req.log = req.log.child({ route: req.routeOptions?.url ?? 'unmatched' });
  });

  /*
   * 4.3 · THE COMPLETION LINE: method, status, latency. No body, no headers, no phone,
   * no user. Health probes arrive every few seconds from the balancer and would drown
   * the log, so they are written at `debug`.
   */
  app.addHook('onResponse', async (req, reply) => {
    const probe = req.routeOptions?.url === '/health' || req.routeOptions?.url === '/ready';
    req.log[probe ? 'debug' : 'info'](
      {
        method: req.method,
        status: reply.statusCode,
        latencyMs: Math.round(reply.elapsedTime * 10) / 10,
      },
      'request completed',
    );
  });

  if (deps.onRoute) app.addHook('onRoute', deps.onRoute);

  /* ---- 1 · hardening headers on every response, success or failure ----- */
  app.addHook('onSend', async (_req, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    // An API returns data, never markup. Nothing may be loaded, framed or executed.
    /*
     * A web page (web.ts) sets its own, still `default-src 'none'`, adding only
     * the hashes of its inline style and script. Everything else gets this.
     */
    reply.header(
      'Content-Security-Policy',
      reply.getHeader('content-security-policy') ?? "default-src 'none'; frame-ancestors 'none'",
    );
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
      /*
       * DEFENCE IN DEPTH (RT S-4): the device the token names must belong to the
       * shop AND the user the token names. The signature already says we minted
       * it; this makes a token that somehow pairs one shop with another shop's
       * device (a minting bug, a key leak used carelessly) useless rather than
       * trusted. Same answer as an unknown device, so it is no oracle.
       */
      if (device.shopId !== claims.shop || device.userId !== claims.sub) {
        await reply.code(401).send({ error: 'device_revoked' });
        return;
      }
      req.claims = claims;
    } catch {
      await reply.code(401).send({ error: 'unauthenticated' });
    }
  });

  /*
   * BE-13 · A PATH ID IS A UUID OR IT IS A 400. Registered after authentication
   * so a stranger still gets a 401, and before any handler so a malformed id
   * never reaches a UUID column and comes back as a driver error (500).
   */
  const UUID_PARAM = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  app.addHook('preHandler', async (req, reply) => {
    const id = (req.params as { id?: unknown } | undefined)?.id;
    if (id !== undefined && !(typeof id === 'string' && UUID_PARAM.test(id))) {
      await reply.code(400).send({ error: 'invalid_id', requestId: req.id });
    }
  });

  app.addHook('preHandler', async (req, reply) => {
    if (req.method + ' ' + req.routeOptions?.url === 'POST /v1/sync/push') return;
    if (hasNul(req.body) || hasNul(req.query)) {
      await reply.code(400).send({ error: 'invalid_input', message: 'text may not contain a NUL character', requestId: req.id });
    }
  });

  /* ---- 4 · errors leave nothing behind ---------------------------------- */
  app.setErrorHandler(async (error: { statusCode?: number; code?: string; message?: string }, req, reply) => {
    let status = typeof error.statusCode === 'number' ? error.statusCode : 500;
    /*
     * F-2 · A SCHEMA VIOLATION IS `invalid_input` AND NOTHING MORE. Ajv's text names the property path, the
     * limit and the enum ("body/phone must NOT have more than 16 characters"), and the code is the
     * framework's (FST_ERR_VALIDATION). Neither helps a shopkeeper's phone, and both describe our schema to a
     * stranger. The detail stays in OUR log.
     */
    if (error.code === 'FST_ERR_VALIDATION' || (error as { validation?: unknown }).validation !== undefined) {
      req.log.info({ validation: error.message }, 'request failed validation');
      await reply.code(400).send({ error: 'invalid_input', message: 'the request is not valid', requestId: req.id });
      return;
    }
    /*
     * C-06 · A database that is down, saturated or timing out is "try again",
     * not "something broke": 503 with Retry-After, so a phone keeps its outbox
     * instead of treating it as a verdict on the request (BE-11, ARCH-04).
     */
    if (isInfraError(error)) {
      status = 503;
      reply.header('Retry-After', String(RETRY_AFTER_SECONDS));
    } else if (isClientDataError(error)) {
      // RT-W4-1: a value the database cannot store (class 22) is the caller's, not ours. Never echo the driver text.
      req.log.warn({ code: error.code, method: req.method }, 'request carried a value the database refused');
      await reply.code(400).send({ error: 'invalid_input', message: 'a value in the request is not acceptable', requestId: req.id });
      return;
    }
    /*
     * The full error goes to OUR log; the client gets a code and nothing else. A
     * constraint name, a SQL fragment or a stack trace tells an attacker the shape
     * of the schema, and tells the shopkeeper nothing he can act on.
     */
    /*
     * 4.3 · THE ERROR EVENT: exactly one `level` 50 line per 5xx, with `err.type`,
     * `err.message`, `err.stack`, and `reqId` + `route` from the request logger.
     * See error-event.ts for why the error is not logged raw.
     */
    if (status >= 500) req.log.error({ err: errorFields(error), method: req.method, status }, 'request failed');
    await reply.code(status).send({
      error: status === 503 ? 'unavailable' : status >= 500 ? 'internal_error' : (error.code ?? 'bad_request'),
      message:
        status === 503
          ? 'the service is busy, try again shortly'
          : status >= 500
            ? 'something went wrong on our side'
            : error.message,
      requestId: req.id,
    });
  });

  app.setNotFoundHandler(async (req, reply) => {
    await reply.code(404).send({ error: 'not_found', requestId: req.id });
  });

  /* ---- 5 · the routes ---------------------------------------------------- */
  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/ready', async (_req, reply) => {
    if (deps.isDraining?.()) {
      reply.header('Retry-After', String(RETRY_AFTER_SECONDS));
      return reply.code(503).send({ status: 'draining' });
    }
    if (!deps.ready) return reply.code(200).send({ status: 'ready' });
    const ms = deps.readyTimeoutMs ?? 2_000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        deps.ready(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('readiness check timed out')), ms);
        }),
      ]);
      return reply.code(200).send({ status: 'ready' });
    } catch {
      reply.header('Retry-After', String(RETRY_AFTER_SECONDS));
      return reply.code(503).send({ status: 'unavailable' });
    } finally {
      if (timer) clearTimeout(timer);
    }
  });

  registerAuthRoutes(app, deps);
  // SIMPW4-04: built once, so the export and the redaction share ONE `heavy` bucket per shop.
  const limits = makeShopLimitHooks(deps.shopLimits);
  registerSyncRoutes(app, deps, limits);
  registerReadRoutes(app, deps, limits);
  registerDpdpRoutes(app, deps, limits);
  registerBillingRoutes(app, deps);
  registerWebPages(app);

  return app;
}

/** The authenticated shop, or a refusal. Every handler that touches a ledger uses it. */
/**
 * WHICH SHOP A REQUEST IS ABOUT. The session decides. Nothing else may.
 *
 * THIS FUNCTION IS THE WHOLE OF S-11. Every route asks it, and if it ever
 * consults the query string, the body, a header or a path parameter, a
 * shopkeeper can read and write another shop's ledger by typing an id.
 *
 * The iteration-35 adversary pass planted exactly that - a version preferring
 * `query.shopId` - and 228 tests passed. The routes now refuse an unknown
 * query parameter at the schema, which is defence in depth and ALSO moved the
 * failure earlier than this function, so the plant stopped being reachable
 * through a route. That is why `app.spec`'s case calls this directly: a guard
 * whose only tests go through something that now refuses first is a guard
 * nobody is testing any more.
 */
export function shopOf(req: FastifyRequest): string {
  if (!req.claims) throw new Error('shopOf called on an unauthenticated request');
  return req.claims.shop;
}
