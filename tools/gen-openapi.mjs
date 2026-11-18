/**
 * 4.2 · OPENAPI 3.1, GENERATED FROM THE ROUTES THE API ACTUALLY SERVES.
 *
 *   node tools/gen-openapi.mjs            write docs/api/openapi.json
 *   node tools/gen-openapi.mjs --check    exit 1 if the committed file is stale
 *
 * HOW. It boots `buildApp` with in-memory dependencies (no database, no network, no
 * clock that moves), listens to Fastify's `onRoute` hook through the `AppDeps.onRoute`
 * seam, and walks every route it is told about. The request shapes are the routes' own
 * JSON Schemas, passed through untouched (Fastify's Ajv dialect is a subset of what
 * OpenAPI 3.1 accepts, so there is no translation to get wrong). Whether a route needs a
 * session comes from `PUBLIC_ROUTES`, the allow-list the auth hook itself uses.
 *
 * WHAT IS CURATED, AND WHY. A route does not declare its response shapes or which error
 * statuses it can produce, so those come from the two tables below. They cannot rot
 * silently: the generator REFUSES to run if a route has no summary, if a table names a
 * route that does not exist, or if a route that takes input has no schema and is not on
 * the written exemption list. Adding a route therefore fails this tool until the route
 * is described, which is the point.
 *
 * NO RUNTIME DEPENDENCY. The document is plain JSON built here.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { buildApp, PUBLIC_ROUTES } from '../apps/api/src/app.ts';
import { memoryRepo } from '../apps/api/src/db/memory.ts';
import { memoryOtpStore } from '../apps/api/src/auth/routes.ts';
import { memorySql } from '../apps/api/src/rate-limit/memory-sql.ts';
import { RateLimiter } from '../apps/api/src/rate-limit/store.ts';
import { StubSmsPort } from '../apps/api/src/sms/stub.ts';
import { RTDN_ROUTE } from '../apps/api/src/billing/routes.ts';

const OUT = 'docs/api/openapi.json';
const KEY = 'openapi-generation-only-key-32-chars!!';
const FIXED_NOW = '2026-01-01T00:00:00.000Z';

/* ---------------------------------------------------------------------------------- *
 * 1 · THE ROUTES, AS SERVED
 * ---------------------------------------------------------------------------------- */

/** Boots the real app and returns one entry per method+url, in registration order. */
export function collectRoutes() {
  const seen = new Map();
  const app = buildApp({
    repo: memoryRepo(),
    sms: new StubSmsPort(),
    otp: memoryOtpStore(),
    now: () => FIXED_NOW,
    signingKey: KEY,
    rate: new RateLimiter(memorySql(), { secret: KEY, now: () => new Date(FIXED_NOW) }),
    onRoute: (r) => {
      for (const method of [r.method].flat()) {
        // Fastify adds a HEAD twin for every GET; it is not a separate operation.
        if (method === 'HEAD') continue;
        seen.set(`${method} ${r.url}`, { method, url: r.url, schema: r.schema ?? {} });
      }
    },
  });
  return { app, routes: [...seen.values()] };
}

/* ---------------------------------------------------------------------------------- *
 * 2 · THE CURATED TABLES
 * ---------------------------------------------------------------------------------- */

const S = (type, extra = {}) => ({ type, ...extra });
const OBJ = (properties, required = Object.keys(properties)) => ({
  type: 'object',
  properties,
  required,
});

/** `METHOD /fastify/url` -> { summary, tag, ok: { status, description, schema? } } */
const OPS = {
  'GET /health': { tag: 'ops', summary: 'Liveness. Never touches the database.', ok: { status: 200, schema: OBJ({ status: S('string', { const: 'ok' }) }) } },
  'GET /ready': {
    tag: 'ops',
    summary: 'Readiness. 503 while the database does not answer or while shutting down.',
    ok: { status: 200, schema: OBJ({ status: S('string', { const: 'ready' }) }) },
  },
  'POST /v1/auth/otp/request': {
    tag: 'auth',
    summary: 'Send a sign-in code by SMS. The answer is identical whether or not the number has an account.',
    ok: { status: 202, description: 'Accepted. Nothing in the body says whether an SMS went out.', schema: OBJ({ sent: S('boolean'), expiresInSeconds: S('integer'), digits: S('integer') }) },
  },
  'POST /v1/auth/otp/verify': {
    tag: 'auth',
    summary: 'Exchange a code for a session. A first sign-in must carry consent; no account exists without it.',
    ok: {
      status: 200,
      schema: OBJ({
        accessToken: S('string'),
        refreshToken: S('string', { description: 'Single-use: the refresh endpoint returns its successor.' }),
        deviceId: S('string', { format: 'uuid' }),
        shopId: S('string', { format: 'uuid' }),
      }),
    },
  },
  'POST /v1/auth/refresh': {
    tag: 'auth',
    summary: 'Rotate the refresh token. Each refresh token works once; presenting a spent one revokes the device (RT-10).',
    ok: {
      status: 200,
      schema: OBJ({
        accessToken: S('string'),
        refreshToken: S('string', { description: 'The successor. The client must store it and send it next time.' }),
      }),
    },
  },
  'GET /v1/devices': { tag: 'auth', summary: "The shop's devices, revoked ones included.", ok: { status: 200 } },
  'POST /v1/auth/devices/:id/revoke': { tag: 'auth', summary: 'Sign a device out. Only a device of the same shop may be revoked; any other id is a 404.', ok: { status: 200, schema: OBJ({ revoked: S('boolean') }) } },
  'POST /v1/me/shop': { tag: 'account', summary: "Set the shop's name.", ok: { status: 200, schema: OBJ({ name: S('string') }) } },
  'GET /v1/legal/notice': { tag: 'privacy', summary: 'The itemised privacy notice (DPDP). Public: it is read before an account exists.', ok: { status: 200 } },
  'POST /v1/me/consent': { tag: 'privacy', summary: 'Grant or withdraw one purpose. Withdrawing account_and_ledger is deletion, and answers 409 saying so.', ok: { status: 200 } },
  'GET /v1/me/consents': { tag: 'privacy', summary: 'The consent log and the current state of each purpose.', ok: { status: 200 } },
  'GET /v1/me/export': { tag: 'privacy', summary: 'Everything held about the user, as one JSON document (DPDP access).', ok: { status: 200 } },
  'POST /v1/me/erase': { tag: 'privacy', summary: 'Request erasure. Nothing is deleted until the grace period ends.', ok: { status: 200 } },
  'POST /v1/me/erase/cancel': { tag: 'privacy', summary: 'Cancel a pending erasure.', ok: { status: 200, schema: OBJ({ cancelled: S('boolean') }) } },
  'POST /v1/deletion/request': { tag: 'privacy', summary: 'Web deletion path: send a code to the registered number. Public.', ok: { status: 202, schema: OBJ({ sent: S('boolean'), expiresInSeconds: S('integer') }) } },
  'POST /v1/deletion/confirm': { tag: 'privacy', summary: 'Web deletion path: confirm with the code and request erasure. Public.', ok: { status: 200 } },
  'GET /v1/me/grievance': { tag: 'privacy', summary: 'The named grievance officer and the response time.', ok: { status: 200 } },
  'POST /v1/sync/push': { tag: 'sync', summary: 'Push the phone outbox. Idempotent by id; per-row rejections are reported in the body, not as an HTTP error.', ok: { status: 200 } },
  'GET /v1/days/:date/summary': { tag: 'read', summary: 'The day close as figures, with the working of the cash check.', ok: { status: 200 } },
  'POST /v1/days/:date/close': { tag: 'read', summary: 'Close a day with the counted cash. Closing again with the same count is a no-op; a different count is 409.', ok: { status: 200 } },
  'GET /v1/parties/outstanding': { tag: 'read', summary: 'Credit outstanding per party.', ok: { status: 200 } },
  'POST /v1/parties/:id/redact': { tag: 'read', summary: "Erase a party's name and phone; the ledger entries stay.", ok: { status: 200 } },
  'GET /v1/parties/:id/export': { tag: 'read', summary: "Everything held about one party (DPDP access for the shopkeeper's customer).", ok: { status: 200 } },
  'GET /v1/alerts': { tag: 'read', summary: 'Operational alerts. A figure with nothing behind it is null, not zero.', ok: { status: 200 } },
  'GET /v1/reports': { tag: 'read', summary: "The reports screen's figures for a date range.", ok: { status: 200 } },
  'GET /v1/billing/entitlement': { tag: 'billing', summary: "The shop's plan and what the phone needs to start a purchase.", ok: { status: 200 } },
  'POST /v1/billing/preview': { tag: 'billing', summary: 'Start the one-time Premium preview.', ok: { status: 200 } },
  'POST /v1/billing/play/verify': { tag: 'billing', summary: 'Bind a Google Play purchase to this shop after asking Google about it.', ok: { status: 200 } },
  [`POST ${RTDN_ROUTE}`]: {
    tag: 'billing',
    summary: "Google Play real-time developer notification (Pub/Sub push). Authenticated by Google's signed OIDC token, not a session. Always acknowledged with 204 once authenticated.",
    ok: { status: 204, description: 'Acknowledged. The notification body is not trusted; Google is asked.' },
  },
  'GET /privacy': { tag: 'web', summary: 'Privacy policy page (HTML).', ok: { status: 200, html: true } },
  'GET /terms': { tag: 'web', summary: 'Terms page (HTML).', ok: { status: 200, html: true } },
  'GET /licences': { tag: 'web', summary: 'Open-source licences page (HTML).', ok: { status: 200, html: true } },
  'GET /delete-account': { tag: 'web', summary: 'Web account-deletion page (HTML), required by Google Play.', ok: { status: 200, html: true } },
};

/**
 * Statuses a route can answer BEYOND the ones the rules below add. Each is read from the
 * handler that sends it. 401/415/400/413/503 and the 429s are derived, not listed here.
 */
const EXTRA = {
  'POST /v1/auth/otp/verify': { 401: 'code_invalid', 403: 'consent_required: a first sign-in without an affirmative consent' },
  'POST /v1/auth/refresh': { 401: 'unauthenticated (bad, expired or wrong-type token) or device_revoked (revoked device, or a spent refresh token was replayed)' },
  'POST /v1/auth/devices/:id/revoke': { 404: 'not_found (also for another shop\'s device: no oracle)' },
  'POST /v1/me/shop': { 404: 'not_found (unknown or erased shop)' },
  'POST /v1/me/consent': { 409: 'withdrawal_means_deletion' },
  'GET /v1/me/export': { 404: 'not_found', 503: 'unavailable: other exports are running (Retry-After)' },
  'POST /v1/deletion/confirm': { 401: 'code_invalid', 404: 'not_found' },
  'POST /v1/parties/:id/redact': { 404: 'not_found (also for another shop\'s party)' },
  'GET /v1/parties/:id/export': { 404: 'not_found (also for another shop\'s party)' },
  'GET /v1/days/:date/summary': { 400: 'invalid_date' },
  'POST /v1/days/:date/close': { 404: 'no_such_day', 409: 'the day is already closed with a different count', 422: 'the close was refused (see body)' },
  'GET /v1/parties/outstanding': { 400: 'invalid_date' },
  'GET /v1/reports': { 400: 'invalid_date, invalid_range or range_too_long' },
  'GET /v1/billing/entitlement': { 503: 'billing_not_configured (Retry-After is not set: the cause is configuration)' },
  'POST /v1/billing/preview': { 409: 'already_premium', 503: 'billing_not_configured' },
  'POST /v1/billing/play/verify': {
    400: 'wrong_product or purchase_not_found',
    403: 'purchase_not_for_this_shop',
    409: 'purchase_belongs_elsewhere',
    502: 'play_unreachable: Google could not be asked; retry',
    503: 'billing_not_configured',
  },
  [`POST ${RTDN_ROUTE}`]: { 401: 'not a push this server accepts (the OIDC token did not verify)', 503: 'billing_not_configured' },
};

/** Routes that answer 429 with Retry-After: the OTP limiter, and the per-shop ceilings (BE-15, RT-W3-1). */
const RATE_LIMITED = new Set([
  'POST /v1/auth/otp/request',
  'POST /v1/auth/otp/verify',
  'POST /v1/deletion/request',
  'POST /v1/deletion/confirm',
  'POST /v1/sync/push',
  'GET /v1/days/:date/summary',
  'POST /v1/days/:date/close',
  'GET /v1/parties/outstanding',
  'GET /v1/parties/:id/export',
  'POST /v1/parties/:id/redact',
  'GET /v1/alerts',
  'GET /v1/reports',
  'GET /v1/me/export',
]);

/** Routes that never touch the database, so can never answer 503 for it. */
const NO_DB = new Set(['GET /health', 'GET /v1/legal/notice', 'GET /v1/me/grievance', 'GET /privacy', 'GET /terms', 'GET /licences', 'GET /delete-account']);

/**
 * Routes allowed to have no input schema, each for a stated reason. Anything else that
 * takes a body or a query must declare it; a route that takes nothing and says so uses
 * NO_QUERY / NO_BODY (apps/api/src/schemas.ts).
 */
const SCHEMA_EXEMPT = {
  'GET /health': 'a balancer probe; a stray query string must not fail a health check',
  'GET /ready': 'a balancer probe; a stray query string must not fail a readiness check',
  'GET /v1/legal/notice': 'public static document',
  'GET /v1/me/grievance': 'static document',
  'GET /privacy': 'static HTML page',
  'GET /terms': 'static HTML page',
  'GET /licences': 'static HTML page',
  'GET /delete-account': 'static HTML page',
};

/** Routes with their own authentication instead of a session. */
const OWN_AUTH = { [`POST ${RTDN_ROUTE}`]: 'googleOidc' };

/* ---------------------------------------------------------------------------------- *
 * 3 · BUILDING THE DOCUMENT
 * ---------------------------------------------------------------------------------- */

const toOpenApiPath = (url) => url.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
const pathParams = (url) => [...url.matchAll(/:([A-Za-z0-9_]+)/g)].map((m) => m[1]);

const PATH_PARAM_SCHEMAS = {
  // `UUID_PARAM` in app.ts rejects anything else with 400 invalid_id.
  id: { type: 'string', format: 'uuid' },
  // `parseIsoDate`; a malformed date is 400 invalid_date.
  date: { type: 'string', format: 'date', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
};

const ref = (name) => ({ $ref: `#/components/responses/${name}` });

export function buildDocument(routes, version) {
  const problems = [];
  const keys = new Set(routes.map((r) => `${r.method} ${r.url}`));
  for (const [table, name] of [[OPS, 'OPS'], [EXTRA, 'EXTRA'], [SCHEMA_EXEMPT, 'SCHEMA_EXEMPT'], [OWN_AUTH, 'OWN_AUTH']]) {
    for (const k of Object.keys(table)) if (!keys.has(k)) problems.push(`${name} names a route that does not exist: ${k}`);
  }
  for (const set of [RATE_LIMITED, NO_DB]) for (const k of set) if (!keys.has(k)) problems.push(`a route table names a route that does not exist: ${k}`);

  const paths = {};
  for (const r of routes) {
    const key = `${r.method} ${r.url}`;
    const op = OPS[key];
    if (!op) {
      problems.push(`no OPS entry (summary) for ${key}: describe the route in tools/gen-openapi.mjs`);
      continue;
    }
    const schema = r.schema ?? {};
    const isPublic = PUBLIC_ROUTES.has(key);
    if (!schema.body && r.method === 'POST' && !(key in SCHEMA_EXEMPT)) {
      problems.push(`${key} is a POST with no body schema. Declare one (NO_BODY if it takes nothing) or exempt it with a reason.`);
    }
    if (r.method === 'GET' && !schema.querystring && !(key in SCHEMA_EXEMPT)) {
      problems.push(`${key} is a GET with no querystring schema. Declare one (NO_QUERY if it takes nothing) or exempt it with a reason.`);
    }

    const parameters = [
      ...pathParams(r.url).map((name) => ({
        name,
        in: 'path',
        required: true,
        schema: schema.params?.properties?.[name] ?? PATH_PARAM_SCHEMAS[name] ?? { type: 'string' },
      })),
      ...Object.entries(schema.querystring?.properties ?? {}).map(([name, s]) => ({
        name,
        in: 'query',
        required: (schema.querystring.required ?? []).includes(name),
        schema: s,
      })),
    ];

    const responses = {};
    const ok = op.ok;
    responses[String(ok.status)] = {
      description: ok.description ?? 'OK',
      ...(ok.html
        ? { content: { 'text/html': { schema: { type: 'string' } } } }
        : ok.status === 204
          ? {}
          : { content: { 'application/json': { schema: ok.schema ?? { type: 'object' } } } }),
    };
    const extra = EXTRA[key] ?? {};
    const note = (status, fallback) => (extra[status] ? { description: `${fallback}. ${extra[status]}` } : null);

    const hasInput = parameters.length > 0 || schema.body || schema.querystring;
    if (hasInput || r.url.includes(':')) responses['400'] = note(400, 'Validation failed: an unknown, missing or malformed field') ?? ref('BadRequest');
    if (r.method === 'POST' && !(key in SCHEMA_EXEMPT)) {
      responses['413'] = ref('PayloadTooLarge');
      responses['415'] = ref('UnsupportedMediaType');
    }
    if (!isPublic || extra[401]) {
      responses['401'] = extra[401]
        ? { description: `Unauthenticated. ${extra[401]}`, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        : ref('Unauthenticated');
    }
    if (extra[403]) responses['403'] = { description: `Refused. ${extra[403]}` };
    if (extra[404] || r.url.includes(':id')) responses['404'] = { description: `Not found. ${extra[404] ?? 'not_found'}` };
    if (extra[409]) responses['409'] = { description: `Conflict. ${extra[409]}` };
    if (extra[422]) responses['422'] = { description: `Unprocessable. ${extra[422]}` };
    if (RATE_LIMITED.has(key)) responses['429'] = ref('RateLimited');
    if (extra[502]) responses['502'] = { description: `Upstream unavailable. ${extra[502]}` };
    if (!NO_DB.has(key)) {
      responses['503'] = extra[503]?.startsWith('billing_not_configured')
        ? { description: `Unavailable. ${extra[503]}` }
        : ref('Unavailable');
    }

    const operation = {
      tags: [op.tag],
      summary: op.summary,
      operationId: `${r.method.toLowerCase()}${r.url.replace(/[^A-Za-z0-9]+(.)?/g, (_m, c) => (c ? c.toUpperCase() : ''))}`,
      security: isPublic ? (OWN_AUTH[key] ? [{ [OWN_AUTH[key]]: [] }] : []) : [{ bearerAuth: [] }],
      ...(parameters.length ? { parameters } : {}),
      ...(schema.body
        ? { requestBody: { required: true, content: { 'application/json': { schema: schema.body } } } }
        : {}),
      responses,
    };
    (paths[toOpenApiPath(r.url)] ??= {})[r.method.toLowerCase()] = operation;
  }
  if (problems.length) {
    const e = new Error('gen-openapi refuses to run:\n  - ' + problems.join('\n  - '));
    e.problems = problems;
    throw e;
  }

  const sortKeys = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
  const errorBody = {
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  };
  const retryAfter = {
    'Retry-After': { description: 'Seconds to wait before retrying.', schema: { type: 'integer', minimum: 0 } },
  };
  return {
    openapi: '3.1.0',
    info: {
      title: 'SWAFTO Retail Desk API',
      version,
      description:
        'Generated by tools/gen-openapi.mjs from the Fastify route schemas. Do not edit. ' +
        'The shop is always taken from the session, never from the request (S-11). ' +
        'Errors carry a short code and a request id; never a stack, SQL or constraint name.',
    },
    tags: [
      { name: 'auth' }, { name: 'account' }, { name: 'sync' }, { name: 'read' },
      { name: 'privacy' }, { name: 'billing' }, { name: 'ops' }, { name: 'web' },
    ],
    paths: sortKeys(
      Object.fromEntries(Object.entries(paths).map(([p, m]) => [p, sortKeys(m)])),
    ),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'The accessToken from /v1/auth/otp/verify or /v1/auth/refresh. A revoked device is refused even with a token in date.',
        },
        googleOidc: {
          type: 'http',
          scheme: 'bearer',
          description: "Google's signed OIDC token on a Pub/Sub push; audience, issuer and service-account email are verified.",
        },
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string', description: 'A short machine code.' },
            message: { type: 'string' },
            requestId: { type: 'string', format: 'uuid' },
          },
        },
        RateLimited: {
          type: 'object',
          required: ['error', 'retryAfterSeconds'],
          properties: {
            error: { type: 'string', const: 'too_many_requests' },
            retryAfterSeconds: { type: 'integer', minimum: 0 },
          },
        },
      },
      responses: {
        BadRequest: { description: 'Validation failed: an unknown, missing or malformed field. Unknown fields are refused, not stripped.', ...errorBody },
        Unauthenticated: {
          description: 'No valid session: error is unauthenticated, or device_revoked for a signed-out device.',
          ...errorBody,
        },
        PayloadTooLarge: { description: 'The body is over the limit.', ...errorBody },
        UnsupportedMediaType: { description: 'A POST must be application/json.', ...errorBody },
        RateLimited: {
          description: 'Too many requests. Retry-After is a real number of seconds and always reaches zero.',
          headers: retryAfter,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RateLimited' } } },
        },
        Unavailable: {
          description: 'The database is down, saturated or timing out: try again. The phone keeps its outbox.',
          headers: retryAfter,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
  };
}

/* ---------------------------------------------------------------------------------- *
 * 4 · RUN
 * ---------------------------------------------------------------------------------- */

export function render() {
  const { app, routes } = collectRoutes();
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
  const doc = buildDocument(routes, version);
  return { app, routes, text: JSON.stringify(doc, null, 2) + '\n' };
}

async function main() {
  const check = process.argv.includes('--check');
  let out;
  try {
    out = render();
  } catch (e) {
    console.error(String(e.message));
    process.exit(1);
  }
  await out.app.close();
  if (check) {
    let have = '';
    try {
      have = readFileSync(OUT, 'utf8');
    } catch {
      /* missing counts as stale */
    }
    if (have !== out.text) {
      console.error(`${OUT} is stale or hand-edited. Run: node tools/gen-openapi.mjs`);
      process.exit(1);
    }
    console.log(`openapi: ${OUT} is current (${out.routes.length} routes)`);
    return;
  }
  mkdirSync('docs/api', { recursive: true });
  writeFileSync(OUT, out.text);
  console.log(`openapi: wrote ${OUT} (${out.routes.length} routes)`);
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
