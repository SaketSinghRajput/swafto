# Load run: ab-before-3

Generated 2026-11-17T07:57:40.955Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 16.05 ms, p99 20.64 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `planned`, mean think time 1000 ms per VU, 8 s warm-up discarded then 40 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 750 | 749.4 | 4.06 | 11.2 | 16.18 | 35.76 | 0 | 0 | 59.1 | 18.3 | 1724.5 | 17 | no |
| 900 | 642.1 | 161.16 | 866.1 | 1772.99 | 4890.02 | 0.649 | 0 | 88.5 | 342.1 | 1745.4 | 15.9 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 900 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| POST /v1/sync/push (interactive 1-3 rows) | 15102 | 159.56 | 866.1 | 1826.71 | 2.15 | 3.98 | 15102 | 0 | 0 | 0 | 91 | 0 |
| GET /v1/billing/entitlement | 7795 | 171.07 | 866.1 | 1755.44 | 1.62 | 2.47 | 7795 | 0 | 0 | 0 | 47 | 0 |
| POST /v1/sync/push (backlog 50-200 rows) | 523 | 147.35 | 866.1 | 1653.7 | 2.15 | 3.98 | 523 | 0 | 0 | 0 | 10 | 0 |
| GET /v1/days/:date/summary | 1070 | 159.56 | 874.76 | 1703.81 | 6.41 | 20.75 | 1070 | 0 | 0 | 0 | 9 | 0 |
| GET /v1/reports (30 days) | 273 | 92.31 | 874.76 | 1703.81 | 9.46 | 30.29 | 273 | 0 | 0 | 0 | 1 | 0 |
| GET /v1/parties/outstanding | 489 | 130.77 | 910.28 | 1790.72 | 9.74 | 56.13 | 489 | 0 | 0 | 0 | 8 | 0 |
| GET /v1/alerts | 509 | 118.38 | 892.34 | 1772.99 | 5.58 | 48.35 | 509 | 0 | 0 | 0 | 3 | 0 |
| POST /v1/auth/refresh | 253 | 206.68 | 857.52 | 1653.7 | 1.87 | 2.89 | 253 | 0 | 0 | 0 | 1 | 0 |

