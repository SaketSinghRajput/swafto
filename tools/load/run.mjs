/**
 * THE LOAD GENERATOR AND REPORT WRITER (C-15). Dependency-free: node:http only.
 *
 *   node tools/load/run.mjs --label before
 *
 * It starts the server (tools/load/server.mjs, its own process), starts W
 * generator processes (tools/load/worker.mjs), ramps concurrency in steps, holds
 * each step, and records per route and overall: p50/p95/p99, throughput, error
 * rate, the server's event-loop delay and RSS, and the generator's own CPU and
 * event-loop delay (so a saturated generator is reported, not mistaken for a slow
 * server). It writes <label>.json and <label>.md to docs/audit/evidence/load/.
 *
 * Options (`--name value`):
 *   --label NAME        default "run"
 *   --steps A,B,C       default 100,250,500,1000,1500,2000   (virtual users; one VU = one shop)
 *   --hold S            seconds measured per step, default 60 (the 1000 step is never shorter)
 *   --warmup S          seconds of each step discarded, default 10
 *   --think-ms N        MEAN think time between a VU's actions, default 15000
 *   --mix NAME          current | planned (default) | reads    (worker.mjs, README.md)
 *   --workers N         generator processes, default 4
 *   --out DIR           default docs/audit/evidence/load
 *   --cpu-prof          run the server under `node --cpu-prof` and keep the profile in <out>/prof-<label>/
 *   --server-args "..." extra options for server.mjs, e.g. "--shops 1000 --days 90"
 *   --target            do NOT spawn a server: use --api-port, --stats-port, --tokens of one already
 *                       running (this is how a --pg server is driven; see README.md)
 */
import { spawn, fork } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir, cpus } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hist, round } from './hist.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

// `--name value` or `--name=value` (the second form is needed for --server-args, whose value starts with `--`).
const args = {};
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const eq = argv[i].indexOf('=');
    if (eq > 0) args[argv[i].slice(2, eq)] = argv[i].slice(eq + 1);
    else if (argv[i + 1] === undefined || argv[i + 1].startsWith('--')) args[argv[i].slice(2)] = 'true';
    else args[argv[i].slice(2)] = argv[(i += 1)];
  }
}
const num = (k, d) => (args[k] === undefined ? d : Number(args[k]));
const LABEL = args.label ?? 'run';
const STEPS = (args.steps ?? '100,250,500,1000,1500,2000').split(',').map(Number);
const HOLD = num('hold', 60);
const WARMUP = num('warmup', 10);
const THINK = num('think-ms', 15000);
const MIX = args.mix ?? 'planned';
const WORKERS = num('workers', 4);
const OUT = resolve(repoRoot, args.out ?? 'docs/audit/evidence/load');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

/* ---- the server ------------------------------------------------------------------- */
let server = null;
let ready;
let tokens;
if (args.target === 'true') {
  ready = { api: num('api-port'), stats: num('stats-port'), mode: 'external' };
  tokens = args.tokens;
} else {
  tokens = join(tmpdir(), `swafto-load-tokens-${process.pid}.json`);
  const nodeArgs = ['--max-old-space-size=6144'];
  if (args['cpu-prof'] === 'true') {
    const dir = join(OUT, 'prof-' + LABEL);
    mkdirSync(dir, { recursive: true });
    nodeArgs.push('--cpu-prof', '--cpu-prof-dir=' + dir);
  }
  const extra = (args['server-args'] ?? '').split(/\s+/).filter(Boolean);
  server = spawn(process.execPath, [...nodeArgs, join(here, 'server.mjs'), '--tokens-out', tokens, ...extra], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  ready = await new Promise((res, rej) => {
    let buf = '';
    server.stdout.on('data', (d) => {
      buf += d;
      const line = buf.split('\n').find((l) => l.startsWith('{"event":"ready"'));
      if (line) res(JSON.parse(line));
    });
    server.on('exit', (c) => rej(new Error('server exited before ready, code ' + c)));
  });
  server.removeAllListeners('exit');
}
let serverDied = false;
server?.on('exit', () => (serverDied = true));
console.error('server ready', JSON.stringify(ready));

const statsGet = async (reset) => (await fetch(`http://127.0.0.1:${ready.stats}/stats${reset ? '?reset=1' : ''}`)).json();

/* ---- the generator processes -------------------------------------------------------- */
const workers = [];
const waitFor = (w, type) =>
  new Promise((res) => {
    const on = (m) => {
      if (m.type === type) {
        w.off('message', on);
        res(m);
      }
    };
    w.on('message', on);
  });
for (let index = 0; index < WORKERS; index += 1) {
  const w = fork(join(here, 'worker.mjs'), [], { cwd: repoRoot });
  workers.push(w);
}
await Promise.all(
  workers.map((w, index) => {
    const p = waitFor(w, 'ready');
    w.send({ type: 'init', index, workers: WORKERS, port: ready.api, tokens, mix: MIX, thinkMs: THINK, seed: num('seed', 1), timeoutMs: 15000 });
    return p;
  }),
);
const all = (msg, reply) => Promise.all(workers.map((w) => { const p = waitFor(w, reply); w.send(msg); return p; }));

/*
 * THE FLOOR OF THE EVENT-LOOP-DELAY READING. On Windows a timer cannot fire more
 * finely than ~15.6 ms, so `monitorEventLoopDelay` reads ~15.6 ms at p50 on a
 * process doing nothing. Measured here, idle, before any load, so every later
 * delay figure can be read against it rather than mistaken for stalls.
 */
await statsGet(true);
await sleep(4000);
const idle = await statsGet(true);
const idleEld = idle.eventLoopDelayMs;
console.error('idle event-loop-delay floor (ms)', JSON.stringify(idleEld));

/* ---- the ramp ------------------------------------------------------------------------ */
const steps = [];
let aborted = null;
for (const vus of STEPS) {
  if (serverDied) { aborted = 'server process died'; break; }
  console.error(`step ${vus} VUs: ramp + ${WARMUP}s warmup + ${HOLD}s hold`);
  await all({ type: 'step', vus }, 'stepped');
  await sleep(WARMUP * 1000);
  await statsGet(true); // reset the server window
  await all({ type: 'measure_start' }, 'measuring');
  const t0 = Date.now();
  await sleep(HOLD * 1000);
  const serverStats = await statsGet(false);
  const results = await all({ type: 'measure_end' }, 'result');
  const seconds = (Date.now() - t0) / 1000;

  const total = new Hist();
  const routes = new Map();
  const counts = { ok: 0, limited: 0, client: 0, server: 0, net: 0, logical: 0 };
  const routeCounts = new Map();
  for (const r of results) {
    for (const [route, j] of Object.entries(r.hists)) {
      const h = Hist.from(j);
      total.merge(h);
      if (!routes.has(route)) routes.set(route, new Hist());
      routes.get(route).merge(h);
    }
    for (const [route, c] of Object.entries(r.counts)) {
      const rc = routeCounts.get(route) ?? { ok: 0, limited: 0, client: 0, server: 0, net: 0, logical: 0 };
      for (const k of Object.keys(rc)) { rc[k] += c[k]; counts[k] += c[k]; }
      routeCounts.set(route, rc);
    }
  }
  const requests = Object.values(counts).slice(0, 5).reduce((a, b) => a + b, 0);
  const failed = counts.client + counts.server + counts.net + counts.logical;
  const gen = results.map((r) => r.generator);
  const row = {
    vus,
    measuredSeconds: round(seconds, 1),
    requests,
    throughputRps: round(requests / seconds, 1),
    latencyMs: total.summary(),
    errors: { ...counts, errorRatePercent: round((failed / Math.max(1, requests)) * 100, 3) },
    routes: Object.fromEntries(
      [...routes].map(([k, h]) => [k, { ...h.summary(), counts: routeCounts.get(k), serverSide: serverStats.routes[routeToServerKey(k)] }]),
    ),
    server: {
      rssMbMax: serverStats.rssMbMax,
      heapUsedMb: serverStats.heapUsedMb,
      cpuPercentOfOneCore: serverStats.cpuPercentOfOneCore,
      eventLoopDelayMs: serverStats.eventLoopDelayMs,
    },
    generator: {
      workers: WORKERS,
      cpuPercentOfOneCoreMax: Math.max(...gen.map((g) => g.cpuPercentOfOneCore)),
      eventLoopDelayP99MsMax: Math.max(...gen.map((g) => g.eventLoopDelayMs.p99)),
      // Generator is a suspect when a core is >70 % busy or its own loop delay p99 exceeds 60 ms (idle floor on Windows is ~22 ms).
      saturated: gen.some((g) => g.cpuPercentOfOneCore > 70 || g.eventLoopDelayMs.p99 > 60),
    },
  };
  steps.push(row);
  console.error(
    `  ${row.throughputRps} rps  p50 ${row.latencyMs.p50}  p95 ${row.latencyMs.p95}  p99 ${row.latencyMs.p99} ms` +
      `  err ${row.errors.errorRatePercent}%  429 ${counts.limited}  srv cpu ${row.server.cpuPercentOfOneCore}%  eld p99 ${row.server.eventLoopDelayMs.p99} ms` +
      `  rss ${row.server.rssMbMax} MB  gen cpu ${row.generator.cpuPercentOfOneCoreMax}%${row.generator.saturated ? '  GENERATOR SATURATED' : ''}`,
  );
  // A step the server cannot hold is the answer; going further only burns the machine.
  if (row.errors.errorRatePercent > 25) { aborted = `stopped after ${vus} VUs: error rate ${row.errors.errorRatePercent}%`; break; }
}

/* ---- teardown ------------------------------------------------------------------------- */
for (const w of workers) w.send({ type: 'stop' });
if (server && !serverDied) {
  await fetch(`http://127.0.0.1:${ready.stats}/shutdown`, { method: 'POST' }).catch(() => undefined);
  await new Promise((r) => { server.once('exit', r); setTimeout(r, 15000); });
}
if (tokens && existsSync(tokens) && args.target !== 'true') (await import('node:fs')).rmSync(tokens, { force: true });

/** Server-side route keys are `METHOD /pattern`; the generator labels carry a suffix. */
function routeToServerKey(label) {
  const base = label.replace(/ \(.*\)$/, '');
  return base;
}

/* ---- the report ------------------------------------------------------------------------ */
const meta = {
  label: LABEL,
  generatedAt: new Date().toISOString(),
  node: process.version,
  machine: { cpu: cpus()[0].model, logicalCores: cpus().length },
  mode: ready.mode,
  seed: { shops: ready.shops, heavyShops: ready.heavyShops, daysPerShop: ready.daysPerShop, entriesPerDay: ready.entriesPerDay, totalEntries: ready.totalEntries },
  config: { steps: STEPS, holdSeconds: HOLD, warmupSeconds: WARMUP, thinkMsMean: THINK, mix: MIX, generatorWorkers: WORKERS },
  aborted,
  idleServerEventLoopDelayMs: idleEld,
  excludes: ready.mode === 'memory' ? 'PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB' : null,
};
writeFileSync(join(OUT, LABEL + '.json'), JSON.stringify({ meta, steps }, null, 2));

const f = (x) => (x === undefined ? '-' : x);
const lines = [];
lines.push(`# Load run: ${LABEL}`, '');
lines.push(`Generated ${meta.generatedAt} by \`tools/load/run.mjs\`. Node ${meta.node}, ${meta.machine.cpu}, ${meta.machine.logicalCores} logical cores (server + ${WORKERS} generator processes share this one machine).`, '');
lines.push(`Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 ${idleEld.p50} ms, p99 ${idleEld.p99} ms. Read every loop-delay figure below against it.`, '');
lines.push(`Mode **${meta.mode}**.${meta.excludes ? ' **Excludes ' + meta.excludes + '.**' : ''}`, '');
lines.push(`Seed: ${meta.seed.shops} shops, ${meta.seed.daysPerShop} days x ~${meta.seed.entriesPerDay} entries/day (${meta.seed.heavyShops} heavy shops with a year of history), ${meta.seed.totalEntries} entries.`);
lines.push(`Mix \`${MIX}\`, mean think time ${THINK} ms per VU, ${WARMUP} s warm-up discarded then ${HOLD} s measured per step. One VU = one shop = one keep-alive socket.`, '');
if (aborted) lines.push(`**Run stopped early: ${aborted}.**`, '');
lines.push('| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |');
lines.push('|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|');
for (const s of steps) {
  lines.push(`| ${s.vus} | ${s.throughputRps} | ${s.latencyMs.p50} | ${s.latencyMs.p95} | ${s.latencyMs.p99} | ${s.latencyMs.max} | ${s.errors.errorRatePercent} | ${s.errors.limited} | ${s.server.cpuPercentOfOneCore} | ${s.server.eventLoopDelayMs.p99} | ${s.server.rssMbMax} | ${s.generator.cpuPercentOfOneCoreMax} | ${s.generator.saturated ? 'YES' : 'no'} |`);
}
lines.push('', 'Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.', '');
const focus = steps.find((s) => s.vus === 1000) ?? steps[steps.length - 1];
if (focus) {
  lines.push(`## Per route at ${focus.vus} VUs`, '');
  lines.push('| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |');
  lines.push('|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const [route, r] of Object.entries(focus.routes)) {
    const c = r.counts;
    lines.push(`| ${route} | ${r.n} | ${r.p50} | ${r.p95} | ${r.p99} | ${f(r.serverSide?.p95)} | ${f(r.serverSide?.p99)} | ${c.ok} | ${c.limited} | ${c.client} | ${c.server} | ${c.net} | ${c.logical} |`);
  }
  lines.push('');
}
writeFileSync(join(OUT, LABEL + '.md'), lines.join('\n') + '\n');
console.error('wrote', join(OUT, LABEL + '.json'), 'and .md');
process.exit(0);
