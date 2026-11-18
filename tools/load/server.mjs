/**
 * THE LOAD-TEST SERVER (C-15). The REAL `buildApp`, in its own process, with
 * seeded history and no OTP step in front of it.
 *
 * ================= LOAD TESTING ONLY. NEVER DEPLOY THIS. =====================
 * Its tokens are minted straight from the real token code with a key generated
 * for this run, so the generator skips sign-in; its SMS port is the stub.
 *
 * TWO MODES
 *   memory (default)  `memoryRepo()`, `memoryOtpStore()`, `StubSmsPort`. No database.
 *                     What this measures is the API process: routing, validation,
 *                     auth, the engine fold, JSON, the event loop. It does NOT
 *                     measure Postgres, and no number from it is a Postgres number.
 *   --pg              `DATABASE_URL` and the real `pgRepo`. Documented and ready;
 *                     it has NOT been run (no Postgres was available when this was
 *                     written). See tools/load/README.md for the exact command.
 *
 * It prints ONE json line on stdout when it is ready:
 *   {"event":"ready","api":<port>,"stats":<port>,"tokens":"<file>", ...}
 * and serves, on a SEPARATE port (so the API under test carries no test route):
 *   GET  /stats?reset=1   rss, event-loop delay, cpu, server-side per-route latency
 *   POST /shutdown        graceful stop (Windows delivers no SIGTERM to a child)
 *
 * Options (all `--name value`):
 *   --shops N            default 2000      one shop per virtual user
 *   --days N             default 60        days of history per shop (closed, then today open)
 *   --entries-per-day N  default 30        mean, jittered 0.5x..1.5x
 *   --heavy N            default 10        the first N shops get --heavy-days x --heavy-epd
 *   --heavy-days N       default 365
 *   --heavy-epd N        default 50
 *   --port N             default 0 (any)   --stats-port N default 0
 *   --tokens-out FILE    default: a file in the OS temp dir (holds tokens - never in the tree)
 *   --seed N             default 1         deterministic history
 *   --api-src DIR        load apps/api/src from DIR instead of this checkout (before/after comparisons)
 *   --pg                 use DATABASE_URL (and DATABASE_SYSTEM_URL if set)
 *   --pool-max N         pg only, default 10 (what server.ts uses)
 */
import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { randomUUID, randomBytes } from 'node:crypto';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { addDays } from '@swafto/formula-engine';
import { Hist, round } from './hist.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a, i, all) => (a.startsWith('--') ? [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? 'true' : all[i + 1]] : null))
    .filter(Boolean),
);
const num = (k, d) => (args[k] === undefined ? d : Number(args[k]));

/*
 * The API source to load. Default: this checkout. `--api-src DIR` points at another copy
 * of apps/api/src (it must sit inside a tree where `@swafto/*` resolves) - which is how a
 * "before" build is measured against an "after" one without touching either.
 */
const SRC = args['api-src'] ? pathToFileURL(resolve(args['api-src']) + '/').href : new URL('../../apps/api/src/', import.meta.url).href;
const api = (p) => import(new URL(p, SRC).href);
const { buildApp } = await api('app.ts');
const { mintToken } = await api('auth/tokens.ts');
const { memoryRepo } = await api('db/memory.ts');
const { memoryOtpStore } = await api('auth/routes.ts');
const { StubSmsPort } = await api('sms/stub.ts');
const { RateLimiter } = await api('rate-limit/store.ts');
const { memorySql } = await api('rate-limit/memory-sql.ts');
const { memoryBillingRepo, pgBillingRepo } = await api('billing/repo.ts');
const { loadBillingConfig } = await api('config.ts');
const { istCalendarDate } = await api('business-date.ts');
const PG = args.pg === 'true';
const SHOPS = num('shops', PG ? 200 : 2000);
const DAYS = num('days', PG ? 30 : 60);
const EPD = num('entries-per-day', 30);
const HEAVY = Math.min(SHOPS, num('heavy', PG ? 0 : 10));
const HEAVY_DAYS = num('heavy-days', 365);
const HEAVY_EPD = num('heavy-epd', 50);
const TOKENS_OUT = args['tokens-out'] ?? join(tmpdir(), 'swafto-load-tokens-' + process.pid + '.json');
const SEED = num('seed', 1);

/* ---- deterministic randomness: the same seed is the same history ------------- */
let state = (SEED >>> 0) || 1;
const rnd = () => {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 4294967296;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

/* ---- the process's own key and clock ----------------------------------------- */
const signingKey = process.env.SESSION_SIGNING_KEY ?? randomBytes(32).toString('hex');
const rateLimitKey = randomBytes(32).toString('hex');
const now = () => new Date().toISOString();

/* ---- stores ------------------------------------------------------------------- */
let repo;
let billingRepo;
let rate;
let otp;
let ready;
let closeStores = async () => {};

if (PG) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('--pg needs DATABASE_URL (the APP role: it must not bypass row-level security).');
    process.exit(2);
  }
  const { openPool } = await api('db/pool.ts');
  const { pgRepo } = await api('db/postgres.ts');
  const { pgOtpStore } = await api('auth/otp-store-pg.ts');
  const appDb = await openPool(url, { max: num('pool-max', 10), statementTimeoutMs: 5000, name: 'app' });
  const sysUrl = process.env.DATABASE_SYSTEM_URL;
  const sysDb = sysUrl ? await openPool(sysUrl, { max: 3, statementTimeoutMs: 5000, name: 'system' }) : null;
  repo = pgRepo(appDb.sql, sysDb ? { system: sysDb.sql } : {});
  billingRepo = pgBillingRepo(appDb.sql);
  rate = new RateLimiter(appDb.sql, { secret: rateLimitKey });
  otp = pgOtpStore(appDb.sql);
  ready = async () => {
    await appDb.sql.query('select 1');
  };
  closeStores = async () => {
    await appDb.end();
    if (sysDb) await sysDb.end();
  };
} else {
  repo = memoryRepo();
  billingRepo = memoryBillingRepo();
  rate = new RateLimiter(memorySql(), { secret: rateLimitKey, now: () => new Date() });
  otp = memoryOtpStore();
}

/* ---- seed -------------------------------------------------------------------- */
const today = istCalendarDate(now());
const ENTRY_KINDS = [
  // [weight, section, mode, needsParty]
  [45, 'cash_sales', 'cash', null],
  [14, 'upi_sales', 'upi', null],
  [14, 'udhar_sales', 'udhar', 'customer'],
  [8, 'purchase', 'cash', null],
  [6, 'expense', 'cash', null],
  [6, 'udhar_collection', 'cash', 'customer'],
  [3, 'withdrawal', 'cash', null],
  [2, 'party_payment', 'cash', 'supplier'],
  [2, 'purchase', 'udhar', 'supplier'],
];
const KIND_WEIGHT = ENTRY_KINDS.reduce((s, k) => s + k[0], 0);
const kind = () => {
  let r = rnd() * KIND_WEIGHT;
  for (const k of ENTRY_KINDS) if ((r -= k[0]) < 0) return k;
  return ENTRY_KINDS[0];
};
const hh = (n) => String(n).padStart(2, '0');

const t0 = Date.now();
const shopsOut = [];
const nowSeconds = Math.floor(Date.now() / 1000);
let totalEntries = 0;

for (let s = 0; s < SHOPS; s += 1) {
  const shopId = randomUUID();
  const userId = randomUUID();
  const deviceId = randomUUID();
  const phone = '+919' + String(100000000 + s).padStart(9, '0').slice(-9);
  const created = now();
  await repo.createShopAndUser({ shopId, userId, phone, shopName: 'Load shop ' + s, language: 'en', now: created });
  await repo.registerDevice({
    id: deviceId, userId, shopId, platform: 'android', createdAt: created, lastSeenAt: null, revokedAt: null,
  });
  const customers = [];
  const suppliers = [];
  for (let p = 0; p < 16; p += 1) {
    const id = randomUUID();
    const isCustomer = p < 12;
    await repo.upsertParty(shopId, { id, kind: isCustomer ? 'customer' : 'supplier', name: (isCustomer ? 'Cust ' : 'Supp ') + p });
    (isCustomer ? customers : suppliers).push(id);
  }
  const heavy = s < HEAVY;
  const days = heavy ? HEAVY_DAYS : DAYS;
  const epd = heavy ? HEAVY_EPD : EPD;
  for (let k = days; k >= 0; k -= 1) {
    const date = addDays(today, -k);
    await repo.upsertDay({
      shopId, date, state: 'open', openingCash: 0, countedCash: null, differenceReason: null,
      closedAt: null, startsAt: '00:00', createdAt: created,
    });
    const n = Math.max(1, Math.round(epd * (0.5 + rnd()))) >> (k === 0 ? 1 : 0);
    for (let e = 0; e < n; e += 1) {
      const [, section, mode, party] = kind();
      const amount = (50 + Math.floor(rnd() * 4950)) * 100; // 50..5000 rupees, in paise
      const minute = Math.floor((e / n) * 600) + 8 * 60;
      await repo.appendEntry(shopId, {
        id: randomUUID(),
        dayId: date,
        section,
        amount,
        mode,
        createdAt: `${date}T${hh(Math.floor(minute / 60) % 24)}:${hh(minute % 60)}:00.000Z`,
        source: 'manual',
        ...(party ? { partyId: pick(party === 'customer' ? customers : suppliers) } : {}),
      });
    }
    totalEntries += n;
    if (k > 0) {
      await repo.upsertDay({
        shopId, date, state: 'closed', openingCash: 0, countedCash: 0, differenceReason: 'seed',
        closedAt: created, startsAt: '00:00', createdAt: created,
      });
    }
  }
  shopsOut.push({
    shopId,
    customers,
    suppliers,
    heavy,
    access: mintToken(signingKey, { sub: userId, shop: shopId, dev: deviceId, typ: 'access', nowSeconds, ttlSeconds: 86400 }),
    refresh: mintToken(signingKey, { sub: userId, shop: shopId, dev: deviceId, typ: 'refresh', nowSeconds, ttlSeconds: 86400 }),
  });
  if ((s + 1) % 250 === 0) process.stderr.write(`seeded ${s + 1}/${SHOPS} shops, ${totalEntries} entries\n`);
}
const seedMs = Date.now() - t0;
if (global.gc) global.gc();

/* ---- the real app ------------------------------------------------------------ */
const app = buildApp({
  repo,
  sms: new StubSmsPort(),
  otp,
  now,
  signingKey,
  rate,
  ready,
  billing: { repo: billingRepo, config: loadBillingConfig(), play: null, keys: null },
});

/* Server-side latency per route, measured around the handler's whole lifecycle. */
const routeHist = new Map();
const routeStatus = new Map();
app.addHook('onRequest', async (req) => {
  req.__t0 = process.hrtime.bigint();
});
app.addHook('onResponse', async (req, reply) => {
  const ms = Number(process.hrtime.bigint() - req.__t0) / 1e6;
  const key = req.method + ' ' + (req.routeOptions?.url ?? 'unmatched');
  let h = routeHist.get(key);
  if (!h) routeHist.set(key, (h = new Hist()));
  h.record(ms);
  const codes = routeStatus.get(key) ?? {};
  codes[reply.statusCode] = (codes[reply.statusCode] ?? 0) + 1;
  routeStatus.set(key, codes);
});

await app.listen({ port: num('port', 0), host: '127.0.0.1' });
const apiPort = app.server.address().port;

/* ---- process vitals, sampled at 1 Hz -------------------------------------------- */
const eld = monitorEventLoopDelay({ resolution: 5 });
eld.enable();
let window = { rssMax: 0, rssSamples: [], cpuStart: process.cpuUsage(), wallStart: performance.now() };
const sample = () => {
  const rss = process.memoryUsage().rss;
  window.rssMax = Math.max(window.rssMax, rss);
  window.rssSamples.push(rss);
};
const sampler = setInterval(sample, 1000);
sampler.unref();

const resetWindow = () => {
  eld.reset();
  routeHist.clear();
  routeStatus.clear();
  window = { rssMax: process.memoryUsage().rss, rssSamples: [], cpuStart: process.cpuUsage(), wallStart: performance.now() };
};
const mb = (b) => round(b / 1048576, 1);
const snapshot = () => {
  const cpu = process.cpuUsage(window.cpuStart);
  const wallMs = performance.now() - window.wallStart;
  const mem = process.memoryUsage();
  return {
    windowSeconds: round(wallMs / 1000, 1),
    rssMbMax: mb(Math.max(window.rssMax, mem.rss)),
    rssMbNow: mb(mem.rss),
    heapUsedMb: mb(mem.heapUsed),
    // Share of ONE core: 100 means the event loop thread was never idle.
    cpuPercentOfOneCore: round(((cpu.user + cpu.system) / 1000 / wallMs) * 100, 1),
    eventLoopDelayMs: {
      mean: round(eld.mean / 1e6), p50: round(eld.percentile(50) / 1e6), p95: round(eld.percentile(95) / 1e6),
      p99: round(eld.percentile(99) / 1e6), max: round(eld.max / 1e6),
    },
    routes: Object.fromEntries([...routeHist].map(([k, h]) => [k, { ...h.summary(), status: routeStatus.get(k) }])),
  };
};

const stats = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'GET' && url.pathname === '/stats') {
    sample();
    const body = JSON.stringify(snapshot());
    if (url.searchParams.get('reset') === '1') resetWindow();
    res.writeHead(200, { 'content-type': 'application/json' }).end(body);
    return;
  }
  if (req.method === 'POST' && url.pathname === '/shutdown') {
    res.writeHead(200).end('bye');
    await stop();
    process.exit(0);
  }
  res.writeHead(404).end();
});
await new Promise((r) => stats.listen(num('stats-port', 0), '127.0.0.1', r));
const statsPort = stats.address().port;

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await app.close();
  await closeStores();
}
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.once(sig, () => void stop().then(() => process.exit(0)));
}

writeFileSync(
  TOKENS_OUT,
  JSON.stringify({ today, apiPort, shops: shopsOut }),
);
resetWindow();
process.stdout.write(
  JSON.stringify({
    event: 'ready',
    mode: PG ? 'pg' : 'memory',
    api: apiPort,
    stats: statsPort,
    tokens: TOKENS_OUT,
    shops: SHOPS,
    heavyShops: HEAVY,
    daysPerShop: DAYS,
    entriesPerDay: EPD,
    totalEntries,
    seedSeconds: round(seedMs / 1000, 1),
    rssMbAfterSeed: mb(process.memoryUsage().rss),
    today,
  }) + '\n',
);
