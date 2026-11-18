# Load run: ab-after-3

Generated 2026-11-17T08:00:02.279Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 16.05 ms, p99 22.41 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `planned`, mean think time 1000 ms per VU, 8 s warm-up discarded then 40 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 750 | 626.8 | 179.8 | 383.01 | 423.09 | 463.34 | 0 | 0 | 77.8 | 341.05 | 1744 | 18.2 | no |
| 900 | 736.2 | 7.67 | 593.41 | 2830.16 | 5347.85 | 1.469 | 0 | 87.6 | 257.95 | 1766 | 18.4 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 900 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| GET /v1/billing/entitlement | 8625 | 7.16 | 587.54 | 2858.46 | 1.36 | 2.47 | 8625 | 0 | 0 | 0 | 133 | 0 |
| POST /v1/sync/push (interactive 1-3 rows) | 16932 | 7.67 | 587.54 | 2802.14 | 2 | 4.1 | 16932 | 0 | 0 | 0 | 249 | 0 |
| POST /v1/auth/refresh | 306 | 7.6 | 815.9 | 2802.14 | 1.5 | 3.04 | 306 | 0 | 0 | 0 | 6 | 0 |
| GET /v1/alerts | 558 | 8.91 | 892.34 | 2774.4 | 3.53 | 11.09 | 558 | 0 | 0 | 0 | 10 | 0 |
| POST /v1/sync/push (backlog 50-200 rows) | 575 | 10.04 | 593.41 | 2802.14 | 2 | 4.1 | 575 | 0 | 0 | 0 | 7 | 0 |
| GET /v1/parties/outstanding | 602 | 9.09 | 587.54 | 2887.05 | 7.23 | 19.36 | 602 | 0 | 0 | 0 | 5 | 0 |
| GET /v1/days/:date/summary | 1127 | 8.23 | 617.51 | 3385.29 | 3.75 | 15.71 | 1127 | 0 | 0 | 0 | 20 | 0 |
| GET /v1/reports (30 days) | 311 | 11.54 | 570.26 | 2830.16 | 10.24 | 25.83 | 311 | 0 | 0 | 0 | 3 | 0 |

