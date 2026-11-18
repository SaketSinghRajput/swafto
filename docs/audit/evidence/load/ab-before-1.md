# Load run: ab-before-1

Generated 2026-11-17T07:48:14.769Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 16 ms, p99 20.02 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `planned`, mean think time 1000 ms per VU, 8 s warm-up discarded then 40 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 750 | 740.9 | 4.06 | 10.65 | 14.94 | 31.3 | 0 | 0 | 57.7 | 18.66 | 1727.5 | 15.7 | no |
| 900 | 656.9 | 174.51 | 824.06 | 1772.99 | 3301.94 | 0.713 | 0 | 89.2 | 330.3 | 1744 | 15.3 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 900 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| POST /v1/sync/push (interactive 1-3 rows) | 15430 | 174.51 | 824.06 | 1772.99 | 2.08 | 3.71 | 15430 | 0 | 0 | 0 | 120 | 0 |
| GET /v1/billing/entitlement | 8078 | 167.7 | 815.9 | 1772.99 | 1.66 | 2.32 | 8078 | 0 | 0 | 0 | 51 | 0 |
| GET /v1/alerts | 525 | 221.58 | 832.3 | 2058.39 | 4.76 | 20.14 | 525 | 0 | 0 | 0 | 3 | 0 |
| GET /v1/reports (30 days) | 267 | 140.2 | 824.06 | 1686.94 | 10.87 | 31.52 | 267 | 0 | 0 | 0 | 1 | 0 |
| GET /v1/days/:date/summary | 1111 | 242.34 | 824.06 | 1772.99 | 5.36 | 19.55 | 1111 | 0 | 0 | 0 | 9 | 0 |
| POST /v1/sync/push (backlog 50-200 rows) | 527 | 188.97 | 849.03 | 1772.99 | 2.08 | 3.71 | 527 | 0 | 0 | 0 | 3 | 0 |
| GET /v1/parties/outstanding | 518 | 125.67 | 824.06 | 1686.94 | 8.47 | 33.13 | 518 | 0 | 0 | 0 | 2 | 0 |
| POST /v1/auth/refresh | 264 | 17.52 | 807.83 | 1557.86 | 1.71 | 2.7 | 264 | 0 | 0 | 0 | 3 | 0 |

