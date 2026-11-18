# Load run: after-rep2

Generated 2026-11-17T05:41:23.435Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 15.98 ms, p99 24.25 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `planned`, mean think time 1000 ms per VU, 8 s warm-up discarded then 40 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 750 | 748 | 2.81 | 7.09 | 10.04 | 19.45 | 0 | 0 | 43.4 | 18.71 | 1690.2 | 14.9 | no |
| 900 | 897.4 | 4.18 | 11.54 | 17.87 | 97.93 | 0 | 0 | 60.3 | 18.99 | 1749.4 | 15.7 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 900 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| GET /v1/billing/entitlement | 10783 | 3.86 | 11.09 | 17.35 | 0.52 | 0.7 | 10783 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/sync/push (interactive 1-3 rows) | 20744 | 4.14 | 11.42 | 17.52 | 0.8 | 1.89 | 20744 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/reports (30 days) | 406 | 6.29 | 14.36 | 18.42 | 3.5 | 11.54 | 406 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/days/:date/summary | 1497 | 4.39 | 12.01 | 22.47 | 1.87 | 2.57 | 1497 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/parties/outstanding | 701 | 6.04 | 13.94 | 19.36 | 3.6 | 4.71 | 701 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/alerts | 714 | 4.31 | 11.65 | 15.71 | 1.52 | 2.42 | 714 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/sync/push (backlog 50-200 rows) | 705 | 6.16 | 13.13 | 19.74 | 0.8 | 1.89 | 705 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/auth/refresh | 356 | 4.18 | 11.31 | 15.24 | 0.64 | 0.89 | 356 | 0 | 0 | 0 | 0 | 0 |

