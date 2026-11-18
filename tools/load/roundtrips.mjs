/**
 * C-15 / ARCH-06 · POSTGRES ROUND TRIPS PER REQUEST, COUNTED, NOT TIMED.
 *
 *   node tools/load/roundtrips.mjs [--out FILE.json]
 *
 * The REAL `buildApp`, the REAL `pgRepo` and `pgBillingRepo`, over a FAKE driver that
 * counts every statement and answers with just enough rows to let the route finish.
 * A "round trip" here is one statement sent to the database: BEGIN, the
 * `set_config('swafto.shop_id', ...)` that C-01's per-shop scoping adds, the statement,
 * and COMMIT each count (the `pg` driver does not pipeline them).
 *
 * THIS PRODUCES COUNTS ONLY. It does not, and must not be read to, say how long any
 * request takes against Postgres: that needs `server.mjs --pg` (tools/load/README.md).
 * Counts are for the one shape of request named in each row; a request that touches
 * more rows or parties costs more, and the row says how it scales.
 *
 * The auth hook's device lookup (`findDevice`, one unscoped statement on the system
 * pool) is inside every authenticated row.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildApp } from '../../apps/api/src/app.ts';
import { pgRepo } from '../../apps/api/src/db/postgres.ts';
import { pgBillingRepo } from '../../apps/api/src/billing/repo.ts';
import { mintToken } from '../../apps/api/src/auth/tokens.ts';
import { memoryOtpStore } from '../../apps/api/src/auth/routes.ts';
import { StubSmsPort } from '../../apps/api/src/sms/stub.ts';
import { RateLimiter } from '../../apps/api/src/rate-limit/store.ts';
import { memorySql } from '../../apps/api/src/rate-limit/memory-sql.ts';
import { loadBillingConfig } from '../../apps/api/src/config.ts';

const argv = process.argv.slice(2);
const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : null;

const KEY = 'roundtrip-signing-key-at-least-32-chars!!';
const T0 = '2026-09-19T08:00:00.000Z';
const SHOP = '01890000-0000-4000-8000-0000000000aa';
const PARTY = '01890000-0000-4000-8000-0000000000bb';
const CLOSED_DAYS = 60;

let statements = [];
const fake = {
  async query(text, params = []) {
    statements.push(text.replace(/\s+/g, ' ').trim().slice(0, 70));
    // ARCH-08: the set-based entries INSERT stores every row it is given.
    if (/INSERT INTO entries[\s\S]*unnest/.test(text)) return { rows: params[0].map((id) => ({ id })) };
    if (/FROM parties WHERE shop_id = \$1 AND id = ANY/.test(text)) return { rows: [{ id: PARTY }] };
    if (/FROM days WHERE shop_id = \$1 AND date = ANY/.test(text)) return { rows: [{ date: '2026-09-19', state: 'open' }] };
    if (/FROM devices/.test(text)) return { rows: [{ id: 'd', user_id: 'u', shop_id: SHOP, platform: 'android', created_at: T0, last_seen_at: null, revoked_at: null }] };
    if (/^\s*INSERT/.test(text)) return { rows: [{ id: 'x', purchase_token: 'x' }] };
    if (/FROM parties WHERE id/.test(text)) return { rows: [{ '?column?': 1, kind: 'customer' }] };
    if (/SELECT date, state FROM days/.test(text)) {
      return { rows: Array.from({ length: CLOSED_DAYS }, (_, i) => ({ date: new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10), state: 'closed' })) };
    }
    if (/SELECT starts_at FROM days/.test(text)) return { rows: [{ starts_at: '00:00' }] };
    if (/FROM days WHERE shop_id = \$1 AND date = \$2/.test(text)) {
      return { rows: [{ shop_id: SHOP, date: '2026-09-19', state: 'open', opening_cash: 0, counted_cash: null, difference_reason: null, closed_at: null, starts_at: '00:00', created_at: T0 }] };
    }
    return { rows: [] };
  },
};

const app = buildApp({
  repo: pgRepo(fake),
  sms: new StubSmsPort(),
  otp: memoryOtpStore(),
  now: () => T0,
  signingKey: KEY,
  rate: new RateLimiter(memorySql(), { secret: KEY, now: () => new Date(T0) }),
  billing: { repo: pgBillingRepo(fake), config: loadBillingConfig(), play: null, keys: null },
  // Counting must not trip the per-shop ceilings.
  shopLimits: { push: false, read: false },
});
const nowSeconds = Math.floor(Date.parse(T0) / 1000);
const token = mintToken(KEY, { sub: 'u', shop: SHOP, dev: 'd', typ: 'access', nowSeconds, ttlSeconds: 86400 });
const refresh = mintToken(KEY, { sub: 'u', shop: SHOP, dev: 'd', typ: 'refresh', nowSeconds, ttlSeconds: 86400 });

let n = 0;
const uid = () => `01890000-0000-4000-8000-${String((n += 1)).padStart(12, '0')}`;
const entry = (credit) =>
  credit
    ? { id: uid(), dayId: '2026-09-19', section: 'udhar_sales', amount: 12345, mode: 'udhar', partyId: PARTY, createdAt: '2026-09-19T10:00:00.000Z' }
    : { id: uid(), dayId: '2026-09-19', section: 'cash_sales', amount: 12345, mode: 'cash', createdAt: '2026-09-19T10:00:00.000Z' };
const day = { date: '2026-09-19', state: 'open', openingCash: 0 };

const auth = { authorization: 'Bearer ' + token };
const json = { 'content-type': 'application/json' };
const POST = (url, body, headers = auth) => () => app.inject({ method: 'POST', url, headers: { ...json, ...headers }, payload: JSON.stringify(body) });
const GET = (url) => () => app.inject({ method: 'GET', url, headers: auth });

/** Each case: [label, how it scales, request, 'prime' to warm the memo first] */
const cases = [
  ['POST /v1/sync/push - 1 cash entry', 'constant: the entries are one set-based INSERT', POST('/v1/sync/push', { entries: [entry(false)] })],
  ['POST /v1/sync/push - 1 cash entry + day row', '+8 per day row (findDay and upsertDay, each scoped)', POST('/v1/sync/push', { days: [day], entries: [entry(false)] })],
  ['POST /v1/sync/push - 1 udhar entry (party check)', 'constant (the party check is one query for the whole batch)', POST('/v1/sync/push', { entries: [entry(true)] })],
  ['POST /v1/sync/push - 3 cash entries', 'constant in the number of entries', POST('/v1/sync/push', { entries: [entry(false), entry(false), entry(false)] })],
  ['POST /v1/sync/push - 100 cash entries (backlog)', 'constant in the number of entries', POST('/v1/sync/push', { entries: Array.from({ length: 100 }, () => entry(false)) })],
  ['GET /v1/billing/entitlement', 'constant', GET('/v1/billing/entitlement')],
  ['POST /v1/auth/refresh', 'constant (1, unscoped)', POST('/v1/auth/refresh', { refreshToken: refresh }, {})],
  ['GET /v1/days/:date/summary - cold (first read of a shop after a restart)', `one extra scoped load of the whole earlier ledger; the days list is ${CLOSED_DAYS} rows`, GET('/v1/days/2026-09-19/summary')],
  ['GET /v1/days/:date/summary - warm (closed days memoised)', 'constant in history length', GET('/v1/days/2026-09-19/summary'), 'prime'],
  ['GET /v1/alerts - warm', 'constant in history length (includes latestStartsAt)', GET('/v1/alerts'), 'prime'],
  ['GET /v1/parties/outstanding - warm', 'constant in history length (includes latestStartsAt and partiesFor)', GET('/v1/parties/outstanding'), 'prime'],
  ['GET /v1/reports (today only)', 'NOT memoised: loads the whole ledger, plus 4 per day in the range', GET('/v1/reports')],
];

const rows = [];
for (const [label, scaling, run, prime] of cases) {
  if (prime) await GET('/v1/days/2026-09-19/summary')();
  statements = [];
  const res = await run();
  rows.push({ route: label, status: res.statusCode, roundTrips: statements.length, scaling, statements: statements.slice() });
}

const hdr = '| request | HTTP | DB round trips | how it scales |\n|:--|---:|---:|:--|';
const caveat = [
  '**These are statement counts against a recording FAKE client, not measured Postgres.** The real `pgRepo` and the real `buildApp` ran, but every statement was answered by a stub: no',
  'database, no network and no latency was involved, and the SQL itself was not executed. A count is a number of round trips; it is not a time, and nothing here says how long any request takes',
  'against Postgres. Measure that with `server.mjs --pg` (tools/load/README.md).',
  '',
].join(String.fromCharCode(10));
console.log([caveat, hdr, ...rows.map((r) => `| ${r.route} | ${r.status} | ${r.roundTrips} | ${r.scaling} |`)].join('\n'));
if (out) writeFileSync(resolve(out), JSON.stringify({ node: process.version, closedDaysInFake: CLOSED_DAYS, rows }, null, 2));
process.exit(0);
