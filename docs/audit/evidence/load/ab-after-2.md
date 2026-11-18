# Load run: ab-after-2

Generated 2026-11-17T07:55:19.134Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 16.01 ms, p99 23.28 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `planned`, mean think time 1000 ms per VU, 8 s warm-up discarded then 40 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 750 | 738.7 | 3.75 | 9.46 | 13 | 22.49 | 0 | 0 | 53.4 | 17.84 | 1747.7 | 16.3 | no |
| 900 | 869.1 | 4.31 | 14.08 | 1276.74 | 1505.82 | 0.023 | 0 | 78.3 | 18.28 | 1772.7 | 15.7 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 900 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| POST /v1/sync/push (interactive 1-3 rows) | 20174 | 4.27 | 14.08 | 1276.74 | 0.79 | 2 | 20174 | 0 | 0 | 0 | 5 | 0 |
| POST /v1/auth/refresh | 361 | 3.79 | 49.32 | 1355.28 | 0.64 | 0.89 | 361 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/parties/outstanding | 683 | 6.16 | 16.02 | 1289.5 | 3.6 | 8.47 | 683 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/days/:date/summary | 1386 | 4.76 | 13.66 | 1144.37 | 1.89 | 3.13 | 1386 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/billing/entitlement | 10506 | 3.94 | 13.53 | 1264.1 | 0.53 | 0.73 | 10506 | 0 | 0 | 0 | 3 | 0 |
| POST /v1/sync/push (backlog 50-200 rows) | 660 | 6.23 | 19.16 | 1315.42 | 0.79 | 2 | 660 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/reports (30 days) | 338 | 6.41 | 88.71 | 1341.86 | 5.2 | 117.21 | 338 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/alerts | 683 | 4.62 | 12.13 | 975.94 | 1.78 | 6.48 | 683 | 0 | 0 | 0 | 0 | 0 |

