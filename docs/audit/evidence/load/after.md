# Load run: after

Generated 2026-11-17T05:26:19.760Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 15.9 ms, p99 16.99 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `planned`, mean think time 15000 ms per VU, 10 s warm-up discarded then 60 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 100 | 6.4 | 3.04 | 7.45 | 13.53 | 47.2 | 0 | 0 | 14.9 | 24.26 | 1502.7 | 1.2 | no |
| 250 | 18.1 | 2.7 | 5.64 | 7.98 | 23.58 | 0 | 0 | 3.6 | 24.66 | 1516.6 | 1.4 | no |
| 500 | 34.9 | 2.44 | 5.26 | 7.23 | 24.25 | 0 | 0 | 5.9 | 24.72 | 1541.4 | 2.3 | no |
| 1000 | 68.6 | 2.3 | 5.69 | 7.83 | 46.68 | 0 | 0 | 10.3 | 24.31 | 1574.2 | 3.2 | no |
| 1500 | 102.2 | 1.85 | 5.36 | 9.55 | 42.7 | 0 | 0 | 9.6 | 23.79 | 1642.8 | 3.3 | no |
| 2000 | 135.3 | 2.3 | 5.05 | 6.54 | 21.69 | 0 | 0 | 12.5 | 18.06 | 1660.5 | 4.3 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 1000 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| GET /v1/billing/entitlement | 1204 | 1.96 | 4.48 | 6.81 | 1.08 | 1.49 | 1204 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/sync/push (interactive 1-3 rows) | 2388 | 2.28 | 4.95 | 7.45 | 1.62 | 2.92 | 2388 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/alerts | 89 | 3.86 | 6.88 | 9.6 | 4.35 | 15.62 | 89 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/sync/push (backlog 50-200 rows) | 90 | 3.75 | 6.88 | 11.22 | 1.62 | 2.92 | 90 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/parties/outstanding | 76 | 5.36 | 8.56 | 9.26 | 7.09 | 8.21 | 76 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/days/:date/summary | 182 | 3.67 | 6.29 | 10.14 | 4.06 | 4.53 | 182 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/auth/refresh | 46 | 2.19 | 3.36 | 6.19 | 1.27 | 1.5 | 46 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/reports (30 days) | 40 | 5.75 | 9 | 46.68 | 5.92 | 44.96 | 40 | 0 | 0 | 0 | 0 | 0 |

