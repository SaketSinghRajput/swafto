# Load run: before

Generated 2026-11-17T05:02:21.238Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 15.59 ms, p99 17.55 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `planned`, mean think time 15000 ms per VU, 10 s warm-up discarded then 60 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 100 | 6.5 | 2.32 | 4.95 | 8.14 | 21.4 | 0 | 0 | 2 | 19.6 | 1497.5 | 0.7 | no |
| 250 | 17.8 | 1.78 | 3.82 | 6.16 | 13.65 | 0 | 0 | 2.7 | 19.53 | 1511.7 | 1.1 | no |
| 500 | 34.2 | 1.52 | 3.5 | 4.9 | 11.51 | 0 | 0 | 3.5 | 19.42 | 1525.7 | 1.3 | no |
| 1000 | 69.9 | 1.89 | 5.1 | 9.27 | 27.08 | 0 | 0 | 7.5 | 19.86 | 1535.1 | 2.4 | no |
| 1500 | 102 | 1.96 | 5.31 | 7.98 | 19.81 | 0 | 0 | 9 | 19.55 | 1569.3 | 2.7 | no |
| 2000 | 133.6 | 1.91 | 5.58 | 8.65 | 19.86 | 0 | 0 | 13.2 | 19.58 | 1629.1 | 4.3 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 1000 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| GET /v1/days/:date/summary | 165 | 3.13 | 5.36 | 19.36 | 5.64 | 12.62 | 165 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/sync/push (interactive 1-3 rows) | 2464 | 1.87 | 4.62 | 8.73 | 1.56 | 2.7 | 2464 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/parties/outstanding | 90 | 5.1 | 11.77 | 27.08 | 10.87 | 13.87 | 90 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/billing/entitlement | 1240 | 1.61 | 3.94 | 6.23 | 0.95 | 1.53 | 1240 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/alerts | 76 | 2.89 | 6.16 | 10.89 | 4.14 | 8.1 | 76 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/sync/push (backlog 50-200 rows) | 74 | 3.46 | 5.86 | 7.08 | 1.56 | 2.7 | 74 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/reports (30 days) | 39 | 4.66 | 8.47 | 12.68 | 5.81 | 7.06 | 39 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/auth/refresh | 48 | 1.92 | 4.76 | 5.85 | 1.21 | 1.37 | 48 | 0 | 0 | 0 | 0 | 0 |

