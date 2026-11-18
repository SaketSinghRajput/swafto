# Load run: after-stress-planned-1s

Generated 2026-11-17T05:17:14.273Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 15.94 ms, p99 16.65 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `planned`, mean think time 1000 ms per VU, 10 s warm-up discarded then 45 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 1000 | 674.5 | 418.9 | 1015.57 | 1121.82 | 1938.96 | 0 | 0 | 82.2 | 349.44 | 1774.6 | 20.7 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 1000 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| GET /v1/billing/entitlement | 9216 | 414.75 | 1015.57 | 1121.82 | 1.69 | 2.4 | 9216 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/auth/refresh | 328 | 406.58 | 1025.72 | 1121.82 | 1.98 | 2.57 | 328 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/sync/push (interactive 1-3 rows) | 17719 | 418.9 | 1015.57 | 1121.82 | 2.37 | 3.79 | 17719 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/alerts | 608 | 414.75 | 1005.51 | 1099.72 | 3.98 | 5.42 | 608 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/reports (30 days) | 309 | 440.26 | 1035.98 | 1099.72 | 7.67 | 22.7 | 309 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/days/:date/summary | 1239 | 423.09 | 1005.51 | 1099.72 | 4.44 | 5.64 | 1239 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/sync/push (backlog 50-200 rows) | 604 | 414.75 | 1046.34 | 1155.81 | 2.37 | 3.79 | 604 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/parties/outstanding | 621 | 398.57 | 1015.57 | 1110.71 | 7.75 | 8.91 | 621 | 0 | 0 | 0 | 0 | 0 |

