# Load run: ab-before-2

Generated 2026-11-17T07:52:59.737Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 15.97 ms, p99 21.23 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `planned`, mean think time 1000 ms per VU, 8 s warm-up discarded then 40 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 750 | 745.3 | 4.1 | 11.2 | 16.34 | 29.77 | 0 | 0 | 58.7 | 18.48 | 1726 | 16.9 | no |
| 900 | 535 | 682.11 | 985.7 | 3593.55 | 8061.55 | 1.796 | 0 | 90.3 | 1305.48 | 1744.1 | 17 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 900 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| GET /v1/days/:date/summary | 877 | 688.93 | 1025.72 | 4384.82 | 7.9 | 60.78 | 877 | 0 | 0 | 0 | 13 | 0 |
| GET /v1/billing/entitlement | 6438 | 682.11 | 975.94 | 3557.97 | 1.85 | 2.75 | 6438 | 0 | 0 | 0 | 117 | 0 |
| POST /v1/sync/push (interactive 1-3 rows) | 12437 | 682.11 | 985.7 | 3557.97 | 2.59 | 4.62 | 12437 | 0 | 0 | 0 | 232 | 0 |
| GET /v1/alerts | 451 | 682.11 | 1005.51 | 3593.55 | 5.75 | 19.94 | 451 | 0 | 0 | 0 | 9 | 0 |
| POST /v1/auth/refresh | 203 | 682.11 | 1155.81 | 3557.97 | 2.4 | 3.26 | 203 | 0 | 0 | 0 | 2 | 0 |
| POST /v1/sync/push (backlog 50-200 rows) | 435 | 695.82 | 966.28 | 4892 | 2.59 | 4.62 | 435 | 0 | 0 | 0 | 10 | 0 |
| GET /v1/parties/outstanding | 445 | 695.82 | 985.7 | 4843.57 | 11.89 | 45.55 | 445 | 0 | 0 | 0 | 6 | 0 |
| GET /v1/reports (30 days) | 206 | 668.67 | 1035.98 | 6861.41 | 12.74 | 124.42 | 206 | 0 | 0 | 0 | 4 | 0 |

