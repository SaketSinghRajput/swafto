# Load run: after-rep1

Generated 2026-11-17T05:37:34.721Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 16 ms, p99 23.71 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `planned`, mean think time 1000 ms per VU, 8 s warm-up discarded then 40 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 750 | 745.2 | 2.92 | 7.09 | 9.36 | 20.98 | 0 | 0 | 41.5 | 18.3 | 1692.5 | 14.2 | no |
| 900 | 890.6 | 2.95 | 7.09 | 9.74 | 26.44 | 0 | 0 | 42.1 | 18.45 | 1752.5 | 15 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 900 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| POST /v1/sync/push (interactive 1-3 rows) | 20568 | 2.92 | 6.88 | 9.55 | 0.66 | 1.37 | 20568 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/billing/entitlement | 10739 | 2.7 | 6.88 | 9.46 | 0.47 | 0.66 | 10739 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/days/:date/summary | 1476 | 3.39 | 7.3 | 10.44 | 1.49 | 2.1 | 1476 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/reports (30 days) | 350 | 4.62 | 9.27 | 12.49 | 2.84 | 4.02 | 350 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/parties/outstanding | 716 | 4.57 | 8.73 | 11.54 | 2.86 | 3.26 | 716 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/sync/push (backlog 50-200 rows) | 703 | 4.31 | 8.47 | 10.65 | 0.66 | 1.37 | 703 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/alerts | 738 | 3.29 | 7.52 | 9.55 | 1.32 | 1.79 | 738 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/auth/refresh | 354 | 2.78 | 6.88 | 9.94 | 0.49 | 0.66 | 354 | 0 | 0 | 0 | 0 | 0 |

