# Load run: after-curve

Generated 2026-11-17T05:31:06.966Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 15.93 ms, p99 18.86 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `planned`, mean think time 1000 ms per VU, 8 s warm-up discarded then 40 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 300 | 297 | 2.73 | 7.3 | 11.77 | 30.97 | 0 | 0 | 30.6 | 18.81 | 1724.1 | 9.6 | no |
| 450 | 437.1 | 2.86 | 91.4 | 832.3 | 1653.8 | 0 | 0 | 54.3 | 19.01 | 1742.5 | 11.6 | no |
| 600 | 595.6 | 3.07 | 7.6 | 10.44 | 16.7 | 0 | 0 | 40.7 | 17.92 | 1708.4 | 11.9 | no |
| 750 | 639.4 | 95.11 | 379.22 | 2536.74 | 4525.82 | 2.311 | 0 | 88.8 | 287.57 | 1754.8 | 18.2 | no |
| 900 | 663.3 | 156.42 | 709.81 | 4049.31 | 7991.34 | 1.711 | 0 | 81.2 | 301.47 | 1998 | 14 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 900 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| POST /v1/auth/refresh | 253 | 208.74 | 2206.87 | 3930.22 | 1.91 | 3.53 | 253 | 0 | 0 | 0 | 8 | 0 |
| POST /v1/sync/push (interactive 1-3 rows) | 15140 | 166.04 | 709.81 | 4049.31 | 2.17 | 4.9 | 15140 | 0 | 0 | 0 | 257 | 0 |
| GET /v1/billing/entitlement | 7873 | 147.35 | 716.9 | 4089.8 | 1.56 | 2.78 | 7873 | 0 | 0 | 0 | 133 | 0 |
| GET /v1/days/:date/summary | 1017 | 107.17 | 649 | 3593.55 | 4.95 | 23.38 | 1017 | 0 | 0 | 0 | 16 | 0 |
| GET /v1/alerts | 514 | 126.92 | 866.1 | 4130.7 | 4.18 | 15.24 | 514 | 0 | 0 | 0 | 8 | 0 |
| POST /v1/sync/push (backlog 50-200 rows) | 531 | 161.16 | 731.31 | 6793.47 | 2.17 | 4.9 | 531 | 0 | 0 | 0 | 9 | 0 |
| GET /v1/parties/outstanding | 529 | 110.42 | 1382.52 | 5969.17 | 7.83 | 28.82 | 529 | 0 | 0 | 0 | 19 | 0 |
| GET /v1/reports (30 days) | 230 | 30.59 | 662.05 | 3419.14 | 8.39 | 44.65 | 230 | 0 | 0 | 0 | 4 | 0 |

