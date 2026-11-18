# Load run: before-rep1

Generated 2026-11-17T05:39:28.861Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 16.02 ms, p99 21.54 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `planned`, mean think time 1000 ms per VU, 8 s warm-up discarded then 40 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 750 | 746.2 | 2.98 | 8.06 | 12.25 | 20 | 0 | 0 | 43.9 | 18.2 | 1660.3 | 12.3 | no |
| 900 | 890.4 | 3.6 | 9.46 | 13 | 20.98 | 0 | 0 | 53.6 | 18.45 | 1706.8 | 14.5 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 900 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| GET /v1/parties/outstanding | 770 | 5.98 | 11.77 | 15.4 | 3.46 | 9.36 | 770 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/sync/push (interactive 1-3 rows) | 20576 | 3.5 | 9.36 | 13 | 0.64 | 1.43 | 20576 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/billing/entitlement | 10679 | 3.23 | 9 | 12.49 | 0.45 | 0.61 | 10679 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/alerts | 699 | 4.35 | 10.04 | 13.66 | 2 | 7.67 | 699 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/days/:date/summary | 1460 | 4.53 | 10.44 | 13.26 | 2.23 | 3.2 | 1460 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/auth/refresh | 344 | 3.13 | 8.47 | 11.09 | 0.52 | 0.71 | 344 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/sync/push (backlog 50-200 rows) | 726 | 5.1 | 10.65 | 14.22 | 0.64 | 1.43 | 726 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/reports (30 days) | 378 | 5.42 | 11.42 | 14.65 | 3.07 | 8.91 | 378 | 0 | 0 | 0 | 0 | 0 |

