/**
 * ONE GENERATOR PROCESS. Spawned by run.mjs; never run by hand.
 *
 * It owns a stripe of the virtual users (VU i belongs to worker i % workers).
 * Each VU is one shop, one keep-alive socket's worth of traffic, and an
 * independent loop: wait (exponential think time), pick an action by the mix,
 * send it, record the latency.
 *
 * Latency is "first byte written to last byte of the response read", measured
 * with performance.now() in this process. It therefore includes any delay of this
 * process's own event loop, which is why every result also carries this
 * process's event-loop delay and CPU: if those are high, the generator was the
 * bottleneck and the number is not the server's.
 */
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { Hist, round } from './hist.mjs';

let cfg;
let shops;
let today;
let agent;
const running = new Set();
let alive = true;

/* ---- the session mix, see tools/load/README.md for where each weight comes from - */
const MIXES = {
  // What the app calls TODAY (client.ts, host.tsx, Root.tsx, plan.ts).
  current: { push: 63, backlog: 2, entitlement: 33, refresh: 2 },
  // Today's calls plus the read routes the audit expects a screen to start using.
  planned: { push: 58, backlog: 2, entitlement: 30, refresh: 1, summary: 4, alerts: 2, outstanding: 2, reports: 1 },
  // Prices C-12: a read-heavy session, far above anything a screen does.
  reads: { push: 40, entitlement: 10, summary: 20, alerts: 10, outstanding: 10, reports: 10 },
};

let rng = 1;
const rnd = () => {
  rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
  return rng / 4294967296;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const expThink = (mean) => -Math.log(1 - rnd()) * mean;

/* ---- results of the current measuring window ------------------------------------ */
let win;
const newWindow = () => ({
  hists: new Map(), // route -> Hist
  counts: new Map(), // route -> {ok, limited, client, server, net, logical}
  cpu: process.cpuUsage(),
  wall: performance.now(),
  eld: monitorEventLoopDelay({ resolution: 5 }),
});
function openWindow() {
  win?.eld.disable();
  win = newWindow();
  win.eld.enable();
}

function record(route, ms, klass) {
  if (!win) return;
  let h = win.hists.get(route);
  if (!h) win.hists.set(route, (h = new Hist()));
  if (klass !== 'net') h.record(ms);
  const c = win.counts.get(route) ?? { ok: 0, limited: 0, client: 0, server: 0, net: 0, logical: 0 };
  c[klass] += 1;
  win.counts.set(route, c);
}

/* ---- one HTTP request ------------------------------------------------------------ */
function send(route, method, path, token, body) {
  return new Promise((resolve) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const headers = { authorization: 'Bearer ' + token };
    if (payload !== undefined) {
      headers['content-type'] = 'application/json';
      headers['content-length'] = Buffer.byteLength(payload);
    }
    const t0 = performance.now();
    let settled = false;
    const done = (klass, status, json) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      record(route, performance.now() - t0, klass);
      resolve({ status, json });
    };
    const req = http.request(
      { agent, host: '127.0.0.1', port: cfg.port, method, path, headers },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const status = res.statusCode;
          const klass = status < 300 ? 'ok' : status === 429 ? 'limited' : status < 500 ? 'client' : 'server';
          let json;
          if (klass === 'ok' && route.startsWith('POST /v1/sync/push')) {
            try {
              json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            } catch {
              json = undefined;
            }
          }
          done(klass, status, json);
        });
        res.on('error', () => done('net', 0));
      },
    );
    const timer = setTimeout(() => {
      req.destroy();
      done('net', 0);
    }, cfg.timeoutMs);
    req.on('error', () => done('net', 0));
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

/* ---- the actions ------------------------------------------------------------------ */
const ENTRY_KINDS = [
  [50, 'cash_sales', 'cash', null],
  [18, 'upi_sales', 'upi', null],
  [14, 'udhar_sales', 'udhar', 'customer'],
  [8, 'purchase', 'cash', null],
  [6, 'expense', 'cash', null],
  [4, 'udhar_collection', 'cash', 'customer'],
];
const KIND_WEIGHT = ENTRY_KINDS.reduce((s, k) => s + k[0], 0);
function entryFor(shop) {
  let r = rnd() * KIND_WEIGHT;
  let k = ENTRY_KINDS[0];
  for (const c of ENTRY_KINDS) if ((r -= c[0]) < 0) { k = c; break; }
  const [, section, mode, party] = k;
  return {
    id: randomUUID(),
    dayId: today,
    section,
    amount: (50 + Math.floor(rnd() * 4950)) * 100,
    mode,
    createdAt: new Date().toISOString(),
    ...(party ? { partyId: shop.customers[Math.floor(rnd() * shop.customers.length)] } : {}),
  };
}

async function push(shop, route, n) {
  const body = { entries: Array.from({ length: n }, () => entryFor(shop)) };
  // The phone re-sends today's day row now and then (state change, opening cash).
  if (rnd() < 0.08) body.days = [{ date: today, state: 'open', openingCash: 0, startsAt: '00:00' }];
  const r = await send(route, 'POST', '/v1/sync/push', shop.access, body);
  if (r.json && (r.json.rejected?.length ?? 0) > 0) {
    // A 200 that refused rows is a generator bug or a server regression: never hide it.
    const c = win?.counts.get(route);
    if (c) c.logical += 1;
  }
}

const ACTIONS = {
  push: (s) => push(s, 'POST /v1/sync/push (interactive 1-3 rows)', 1 + Math.floor(rnd() * 3)),
  backlog: (s) => push(s, 'POST /v1/sync/push (backlog 50-200 rows)', 50 + Math.floor(rnd() * 151)),
  entitlement: (s) => send('GET /v1/billing/entitlement', 'GET', '/v1/billing/entitlement', s.access),
  refresh: (s) =>
    send('POST /v1/auth/refresh', 'POST', '/v1/auth/refresh', s.access, { refreshToken: s.refresh }),
  summary: (s) => send('GET /v1/days/:date/summary', 'GET', '/v1/days/' + today + '/summary', s.access),
  alerts: (s) => send('GET /v1/alerts', 'GET', '/v1/alerts', s.access),
  outstanding: (s) => send('GET /v1/parties/outstanding', 'GET', '/v1/parties/outstanding', s.access),
  reports: (s) => {
    const from = new Date(Date.parse(today + 'T00:00:00Z') - 29 * 86400000).toISOString().slice(0, 10);
    return send('GET /v1/reports (30 days)', 'GET', '/v1/reports?from=' + from + '&to=' + today, s.access);
  },
};

function chooser(mix) {
  const entries = Object.entries(mix);
  const weights = entries.reduce((s, [, w]) => s + w, 0);
  return () => {
    let r = rnd() * weights;
    for (const [name, w] of entries) if ((r -= w) < 0) return name;
    return entries[0][0];
  };
}

async function vu(i) {
  const shop = shops[i % shops.length];
  const choose = chooser(MIXES[cfg.mix]);
  // Spread the first action over one think interval: a ramp, not a thundering herd.
  await sleep(rnd() * cfg.thinkMs);
  while (alive) {
    const r = ACTIONS[choose()](shop);
    await r;
    await sleep(expThink(cfg.thinkMs));
  }
}

/* ---- orchestration messages -------------------------------------------------------- */
process.on('message', async (m) => {
  if (m.type === 'init') {
    cfg = m;
    rng = (m.seed + m.index * 7919) >>> 0 || 1;
    const file = JSON.parse(readFileSync(m.tokens, 'utf8'));
    shops = file.shops;
    today = file.today;
    agent = new http.Agent({ keepAlive: true, maxSockets: Infinity, keepAliveMsecs: 30000 });
    process.send({ type: 'ready' });
  } else if (m.type === 'step') {
    for (let i = m.vus - 1; i >= 0; i -= 1) {
      if (i % cfg.workers === cfg.index && !running.has(i)) {
        running.add(i);
        void vu(i);
      }
    }
    process.send({ type: 'stepped', vus: running.size });
  } else if (m.type === 'measure_start') {
    openWindow();
    process.send({ type: 'measuring' });
  } else if (m.type === 'measure_end') {
    const cpu = process.cpuUsage(win.cpu);
    const wallMs = performance.now() - win.wall;
    process.send({
      type: 'result',
      hists: Object.fromEntries([...win.hists].map(([k, h]) => [k, h.toJSON()])),
      counts: Object.fromEntries(win.counts),
      vus: running.size,
      generator: {
        index: cfg.index,
        cpuPercentOfOneCore: round(((cpu.user + cpu.system) / 1000 / wallMs) * 100, 1),
        eventLoopDelayMs: { p50: round(win.eld.percentile(50) / 1e6), p99: round(win.eld.percentile(99) / 1e6), max: round(win.eld.max / 1e6) },
        wallSeconds: round(wallMs / 1000, 1),
      },
    });
    win.eld.disable();
    win = undefined;
  } else if (m.type === 'stop') {
    alive = false;
    agent?.destroy();
    process.exit(0);
  }
});
