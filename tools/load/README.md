# tools/load - the load test (C-15)

A dependency-free load generator (`node:http`, keep-alive agents) and a load server that
boots the **real** `buildApp`. Founder targets: 1000+ concurrent users, API p95 < 300 ms,
99.9 % uptime.

| file | what |
|:--|:--|
| `server.mjs` | the API in its own process: seeded history, tokens minted by the real token code, a stats port (RSS, event-loop delay, CPU, server-side per-route latency) |
| `run.mjs` | orchestrator and report writer: starts the server and W generator processes, ramps in steps, writes `<label>.json` and `<label>.md` |
| `worker.mjs` | one generator process (a stripe of the virtual users; reports its own CPU and loop delay) |
| `hist.mjs` | mergeable log-bucket latency histogram (<= 1 % quantisation) |
| `fold-bench.mjs` | CPU-only micro-benchmark of one read (`dayInputFor`) against history size |
| `roundtrips.mjs` | Postgres statements per request, counted (never timed) with the real `pgRepo` over a fake driver |

## Run it (no database)

```
node tools/load/run.mjs --label run1                 # 100,250,500,1000,1500,2000 VUs, 60 s each, memory repo
node tools/load/run.mjs --label knee --steps 1000 --hold 45 --think-ms 1000     # find the saturation point
node tools/load/run.mjs --label reads --steps 1000 --think-ms 3000 --mix reads  # price the read routes
node tools/load/run.mjs --label prof --cpu-prof --steps 1000 --think-ms 1000    # server CPU profile in <out>/prof-prof/
node tools/load/fold-bench.mjs
node tools/load/roundtrips.mjs
```

Output goes to `docs/audit/evidence/load/`. `--out DIR` redirects it. Seed defaults:
2000 shops x 60 days x ~30 entries (3.8 M entries, ~1.7 GB RSS), 10 shops with a year of
history at ~50 entries/day. One VU = one shop, so 2000 shops serves 2000 VUs one-to-one.
Everything is configurable: `--server-args="--shops 1000 --days 90 --entries-per-day 40"`.

## Run it against Postgres (`--pg`) - DOCUMENTED, NOT YET RUN

No Postgres was available when this was written, so this path has never been executed.
It uses `DATABASE_URL` and the real `pgRepo`, the real `RateLimiter` and `pgOtpStore`,
exactly as `apps/api/src/server.ts` wires them, with the pool at 10 (what `server.ts` uses).

```
node tools/pg-up.mjs                       # or a real RDS: it must be an APP role without BYPASSRLS
# schema applied by tools/dev-server.mjs the first time, or by your migration step
export DATABASE_URL="<connection string of the APP role>"
export DATABASE_SYSTEM_URL="<connection string of the system role>"   # as production sets it
# Terminal 1 - seed and serve (seeding goes through the repo API; 200 shops x 30 days takes minutes, not seconds)
node --max-old-space-size=4096 tools/load/server.mjs --pg --shops 1000 --days 90 --entries-per-day 40 \
     --tokens-out /tmp/swafto-load-tokens.json --port 8787 --stats-port 8788
# Terminal 2 - drive it (the generator does not spawn a server with --target)
node tools/load/run.mjs --target --api-port 8787 --stats-port 8788 --tokens /tmp/swafto-load-tokens.json \
     --label pg-1000 --steps 100,250,500,1000 --hold 60 --mix planned
```

For a number that means anything, run the generator from the same region as the API and the API
in the same region as the database (ap-south-1, t3.small + db.t4g.micro as deployed), not over a
laptop's Wi-Fi: round-trip latency is exactly what is being measured. Add `--steps 1000 --think-ms 1000`
to find where the 10-connection pool saturates. Watch RDS CPU, connections and `pg_stat_statements`
alongside; this tool measures only the API's side.

## The session mix, and where it comes from

All of it is read from the mobile code, not guessed. **Rates are the estimate**: the repo holds no
field data on entries per day (E) or foregrounds per day (F); the audit's planning figure is
E = 30-150, F = 10-30 (architecture.md section A, "mine, not measured").

| request | what makes the phone send it | weight in `planned` |
|:--|:--|--:|
| `POST /v1/sync/push`, 1-3 rows | one drain per store write revision, single-flight and coalesced (`Root.tsx:132` -> `host.tsx:882 syncLatest`), plus launch/foreground (`Root.tsx:128,142`) and the 30 s tick **only while the outbox is non-empty** (`Root.tsx:153-156`). A drain with nothing queued sends **nothing** (`client.ts:469`, `rows.length === 0` returns). | 58 |
| `POST /v1/sync/push`, 50-200 rows | a backlog after a connectivity gap; chunked at 1000 entries (`client.ts:686 batches`). Rare. | 2 |
| `GET /v1/billing/entitlement` | `refreshPlan()` on launch and on **every** foreground (`Root.tsx:130,143`; `host.tsx:466`; `client.ts:640`) - there is no cache TTL, so it is as frequent as foregrounds | 30 |
| `POST /v1/auth/refresh` | access tokens live 24 h (`auth/routes.ts:38`), so about once a day per shop | 1 |
| `GET /v1/days/:date/summary`, `/v1/alerts`, `/v1/parties/outstanding`, `/v1/reports` | **no screen calls them today** (`client.ts:509-542` define them "for reconciliation. Screens do not use it"). Included at 9 % because the audit expects a screen to start using them, and because they are the routes C-12 is about. | 4+2+2+1 |

Three mixes: `current` is today's calls only (no reads), `planned` (default) adds the reads,
`reads` is a deliberately read-heavy stress (60 % reads) to price C-12.

**Think time** is exponential (memoryless arrivals) with a 15 s mean per VU by default. A shop
recording 40 entries and foregrounding 20 times a day makes ~60 requests a day; 15 s is ~240 an
hour per VU, i.e. every one of the 1000 "concurrent" users is active in the same busy hour at roughly
4x the all-day average rate. It is a deliberately conservative reading of "1000 concurrent users",
and is the number to change (`--think-ms`) if the founder means something different.

## What this does NOT measure

- **Any Postgres cost.** The memory repository answers in microseconds; a real database adds round
  trips (`roundtrips.mjs` counts them), RLS transactions, pool waits and disk. No latency in
  `docs/audit/evidence/load/` is a Postgres latency.
- **TLS and the proxy.** Caddy terminates TLS in production; the generator speaks plain HTTP to 127.0.0.1.
- **The network.** Loopback only. A phone on 2G is not modelled.
- **A realistic OS.** This ran on Windows, where socket writes are expensive (`writeUtf8String` was 31 %
  of the server's CPU in the profile) and `monitorEventLoopDelay` cannot read below ~15.6 ms (the
  timer granularity). The per-run `.md` prints the measured idle floor; read every loop-delay figure
  against it. A Linux host would do better on both.
- **Generator and server share one machine** (12 logical cores): each run records the generator's own
  CPU and loop delay and flags `saturated` if a core is >70 % busy.
- **Uptime.** 99.9 % cannot be measured by a load test. What the code contributes: graceful shutdown
  (`apps/api/src/shutdown.ts`: `/ready` flips to 503 while the listener is still open, in-flight requests
  drain, pools close last, a deadline stops a hung drain), and statelessness (signed tokens, Postgres OTP
  store and ledger; the only in-process state is the per-shop rate buckets and the closed-day memo, both
  derived and safe to lose). Topology (Multi-AZ, a second instance, an ALB) is C-13 and is not code.
