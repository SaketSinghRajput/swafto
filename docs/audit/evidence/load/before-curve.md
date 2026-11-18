# Load run: before-curve

Generated 2026-11-17T05:35:25.616Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 15.93 ms, p99 26.66 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `planned`, mean think time 1000 ms per VU, 8 s warm-up discarded then 40 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 300 | 298.4 | 2.15 | 5.47 | 8.39 | 34.65 | 0 | 0 | 21.2 | 18.97 | 1641.5 | 6.1 | no |
| 450 | 445.1 | 2.4 | 6.1 | 9.46 | 17 | 0 | 0 | 27.4 | 18.58 | 1662.6 | 9 | no |
| 600 | 593.4 | 2.62 | 6.88 | 10.55 | 24.46 | 0 | 0 | 33.7 | 18.43 | 1626.4 | 10.7 | no |
| 750 | 748 | 2.95 | 7.75 | 11.2 | 21.29 | 0 | 0 | 39.7 | 18.46 | 1715.6 | 11.9 | no |
| 900 | 874.1 | 3.13 | 9.84 | 956.71 | 1673.49 | 1.192 | 0 | 61.4 | 18.58 | 1862.5 | 13.6 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 900 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| GET /v1/days/:date/summary | 1369 | 4.39 | 10.98 | 38.08 | 2.65 | 8.65 | 1369 | 0 | 0 | 0 | 9 | 0 |
| GET /v1/billing/entitlement | 10334 | 2.78 | 9.55 | 966.28 | 0.43 | 0.59 | 10334 | 0 | 0 | 0 | 134 | 0 |
| POST /v1/sync/push (interactive 1-3 rows) | 20139 | 2.98 | 9.55 | 966.28 | 0.61 | 1.29 | 20139 | 0 | 0 | 0 | 248 | 0 |
| GET /v1/alerts | 681 | 4.18 | 10.44 | 919.38 | 2.08 | 8.23 | 681 | 0 | 0 | 0 | 5 | 0 |
| GET /v1/parties/outstanding | 719 | 5.52 | 12.49 | 511.13 | 3.79 | 9.74 | 719 | 0 | 0 | 0 | 9 | 0 |
| POST /v1/auth/refresh | 319 | 3.13 | 10.34 | 501.06 | 0.41 | 0.58 | 319 | 0 | 0 | 0 | 5 | 0 |
| POST /v1/sync/push (backlog 50-200 rows) | 690 | 4.57 | 11.89 | 1067.37 | 0.61 | 1.29 | 690 | 0 | 0 | 0 | 3 | 0 |
| GET /v1/reports (30 days) | 315 | 5 | 11.42 | 1005.51 | 3.16 | 9.36 | 315 | 0 | 0 | 0 | 4 | 0 |

