# Load run: ab-after-1

Generated 2026-11-17T07:50:37.284Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 15.99 ms, p99 17.55 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `planned`, mean think time 1000 ms per VU, 8 s warm-up discarded then 40 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 750 | 737.6 | 3.75 | 9.84 | 14.5 | 42.82 | 0 | 0 | 55.7 | 17.92 | 1748.1 | 16.2 | no |
| 900 | 660.1 | 161.16 | 857.52 | 1276.74 | 4771.44 | 0 | 0 | 84.5 | 323.75 | 1778.5 | 17.7 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 900 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| POST /v1/sync/push (interactive 1-3 rows) | 15462 | 151.82 | 857.52 | 1276.74 | 2.21 | 4.14 | 15462 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/billing/entitlement | 8187 | 171.07 | 857.52 | 1289.5 | 1.66 | 2.49 | 8187 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/sync/push (backlog 50-200 rows) | 543 | 171.07 | 807.83 | 1179.04 | 2.21 | 4.14 | 543 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/days/:date/summary | 1107 | 169.38 | 857.52 | 1302.4 | 4.02 | 11.89 | 1107 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/alerts | 559 | 164.4 | 815.9 | 1005.51 | 3.2 | 7.75 | 559 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/parties/outstanding | 539 | 187.1 | 815.9 | 1214.77 | 6.88 | 9.84 | 539 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/reports (30 days) | 297 | 196.64 | 937.86 | 2437.76 | 11.89 | 111.52 | 297 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/auth/refresh | 275 | 123.19 | 866.1 | 1264.1 | 1.83 | 2.21 | 275 | 0 | 0 | 0 | 0 | 0 |

