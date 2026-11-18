# Load run: after-stress-reads

Generated 2026-11-17T05:18:43.666Z by `tools/load/run.mjs`. Node v24.22.3, 13th Gen Intel(R) Core(TM) i5-13420H, 12 logical cores (server + 4 generator processes share this one machine).

Idle event-loop-delay floor on this machine (Windows timer granularity, before any load): p50 15.96 ms, p99 16.64 ms. Read every loop-delay figure below against it.

Mode **memory**. **Excludes PostgreSQL: no database round trip, no RLS transaction, no pool wait, no network between API and DB.**

Seed: 2000 shops, 60 days x ~30 entries/day (10 heavy shops with a year of history), 3792626 entries.
Mix `reads`, mean think time 3000 ms per VU, 10 s warm-up discarded then 45 s measured per step. One VU = one shop = one keep-alive socket.

| VUs | req/s | p50 ms | p95 ms | p99 ms | max ms | error % | 429 | srv CPU % of 1 core | srv loop-delay p99 ms | srv RSS MB | gen CPU max % | gen saturated |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--|
| 1000 | 333.5 | 4.1 | 10.65 | 15.55 | 48.77 | 0 | 0 | 51.4 | 18.19 | 1748.8 | 10 | no |

Latency is client-observed (request written to response read), all routes together. Error % counts 4xx other than 429, 5xx, network errors/timeouts, and a 200 push that refused rows. 429s are counted apart.

## Per route at 1000 VUs

| route | n | p50 ms | p95 ms | p99 ms | server-side p95 ms | server-side p99 ms | ok | 429 | 4xx | 5xx | net | logical |
|:--|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| GET /v1/days/:date/summary | 2949 | 3.64 | 10.14 | 14.5 | 1.72 | 2.52 | 2949 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/billing/entitlement | 1531 | 3.13 | 9.27 | 13.66 | 0.68 | 0.97 | 1531 | 0 | 0 | 0 | 0 | 0 |
| POST /v1/sync/push (interactive 1-3 rows) | 5983 | 3.86 | 10.14 | 15.24 | 0.87 | 1.12 | 5983 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/parties/outstanding | 1516 | 5.42 | 11.89 | 16.67 | 3.57 | 4.62 | 1516 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/alerts | 1496 | 3.57 | 10.04 | 14.8 | 1.71 | 2.54 | 1496 | 0 | 0 | 0 | 0 | 0 |
| GET /v1/reports (30 days) | 1541 | 5.52 | 12.37 | 21.17 | 3.64 | 10.87 | 1541 | 0 | 0 | 0 | 0 | 0 |

