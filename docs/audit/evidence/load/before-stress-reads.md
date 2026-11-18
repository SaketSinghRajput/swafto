# Load run: before-stress-reads

Generated 2026-11-17T05:11:59.089Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 15.91 ms, p99 23.74 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `reads`, mean think time 3000 ms per VU, 10 s warm-up discarded then 45 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 1000 | 330.9 | 4.9 | 13.39 | 19.94 | 46.65 | 0 | 0 | 52.9 | 19.97 | 1709.9 | 8.1 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 1000 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| POST /v1/sync/push (interactive 1-3 rows) | 6041 | 4.39 | 12.74 | 18.97 | 0.77 | 1.07 | 6041 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/reports (30 days) | 1480 | 6.1 | 14.22 | 20.75 | 3.46 | 5.64 | 1480 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/days/:date/summary | 2992 | 4.95 | 13.8 | 20.14 | 2.28 | 4.85 | 2992 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/parties/outstanding | 1496 | 6.67 | 15.71 | 22.47 | 4.39 | 6.67 | 1496 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/billing/entitlement | 1419 | 3.79 | 12.01 | 17.7 | 0.63 | 0.87 | 1419 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/alerts | 1472 | 4.9 | 13.26 | 18.42 | 2.26 | 2.92 | 1472 | 0 | 0 | 0 | 0 | 0 |

