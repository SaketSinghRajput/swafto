# Load run: before-stress-planned-1s

Generated 2026-11-17T05:08:03.567Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 15.97 ms, p99 17.51 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `planned`, mean think time 1000 ms per VU, 10 s warm-up discarded then 45 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 1000 | 658.4 | 501.06 | 815.9 | 1155.81 | 1811.11 | 0 | 0 | 87.3 | 319.03 | 1746.8 | 18.9 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 1000 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| GET /v1/billing/entitlement | 8921 | 501.06 | 815.9 | 1155.81 | 1.24 | 2.08 | 8921 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/sync/push (interactive 1-3 rows) | 17637 | 501.06 | 815.9 | 1167.37 | 1.98 | 3.94 | 17637 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/auth/refresh | 281 | 511.13 | 832.3 | 1144.37 | 1.49 | 2.08 | 281 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/alerts | 595 | 501.06 | 738.63 | 1155.81 | 4.76 | 21.59 | 595 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/parties/outstanding | 625 | 511.13 | 824.06 | 1155.81 | 8.31 | 14.08 | 625 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/days/:date/summary | 1253 | 506.07 | 815.9 | 1167.37 | 4.95 | 19.94 | 1253 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/sync/push (backlog 50-200 rows) | 635 | 501.06 | 807.83 | 1133.04 | 1.98 | 3.94 | 635 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/reports (30 days) | 272 | 511.13 | 1025.72 | 1190.83 | 7.9 | 26.09 | 272 | 0 | 0 | 0 | 0 | 0 |

