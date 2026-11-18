# Load run: before-rep2

Generated 2026-11-17T05:43:33.435Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 16.02 ms, p99 24.53 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `planned`, mean think time 1000 ms per VU, 8 s warm-up discarded then 40 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 750 | 747 | 4.35 | 12.01 | 17.18 | 30.28 | 0 | 0 | 62.1 | 19.71 | 1736.8 | 15.7 | no |
| 900 | 640.6 | 304.67 | 542.58 | 3629.49 | 6721.78 | 2.853 | 0 | 104.4 | 909.12 | 1762.8 | 18.4 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 900 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| GET /v1/billing/entitlement | 7539 | 304.67 | 542.58 | 3629.49 | 1.14 | 2.02 | 7539 | 0 | 0 | 0 | 244 | 0 |
| POST /v1/sync/push (interactive 1-3 rows) | 14624 | 304.67 | 537.21 | 3629.49 | 2 | 4.06 | 14624 | 0 | 0 | 0 | 420 | 0 |
| POST /v1/sync/push (backlog 50-200 rows) | 512 | 310.79 | 605.34 | 5623.23 | 2 | 4.06 | 512 | 0 | 0 | 0 | 16 | 0 |
| GET /v1/days/:date/summary | 1038 | 310.79 | 548 | 3629.49 | 6.16 | 33.46 | 1038 | 0 | 0 | 0 | 23 | 0 |
| GET /v1/alerts | 519 | 301.65 | 564.61 | 3629.49 | 6.81 | 29.4 | 519 | 0 | 0 | 0 | 14 | 0 |
| GET /v1/parties/outstanding | 513 | 323.41 | 581.72 | 3739.47 | 8.73 | 25.07 | 513 | 0 | 0 | 0 | 9 | 0 |
| GET /v1/reports (30 days) | 247 | 310.79 | 542.58 | 2915.92 | 9.55 | 123.19 | 247 | 0 | 0 | 0 | 8 | 0 |
| POST /v1/auth/refresh | 242 | 307.71 | 526.62 | 2017.83 | 1.19 | 1.64 | 242 | 0 | 0 | 0 | 7 | 0 |

