**These are statement counts against a recording FAKE client, not measured Postgres.** The real `pgRepo` and the real `buildApp` ran, but every statement was answered by a stub: no
database, no network and no latency was involved, and the SQL itself was not executed. A count is a number of round trips; it is not a time, and nothing here says how long any request takes
against Postgres. Measure that with `server.mjs --pg` (tools/load/README.md).

| request | HTTP | DB round trips | how it scales |
|:--|---:|---:|:--|
| POST /v1/sync/push - 1 cash entry | 200 | 9 | constant: the entries are one set-based INSERT |
| POST /v1/sync/push - 1 cash entry + day row | 200 | 17 | +8 per day row (findDay and upsertDay, each scoped) |
| POST /v1/sync/push - 1 udhar entry (party check) | 200 | 10 | constant (the party check is one query for the whole batch) |
| POST /v1/sync/push - 3 cash entries | 200 | 9 | constant in the number of entries |
| POST /v1/sync/push - 100 cash entries (backlog) | 200 | 9 | constant in the number of entries |
| GET /v1/billing/entitlement | 200 | 3 | constant |
| POST /v1/auth/refresh | 200 | 1 | constant (1, unscoped) |
| GET /v1/days/:date/summary - cold (first read of a shop after a restart) | 200 | 10 | one extra scoped load of the whole earlier ledger; the days list is 60 rows |
| GET /v1/days/:date/summary - warm (closed days memoised) | 200 | 9 | constant in history length |
| GET /v1/alerts - warm | 200 | 10 | constant in history length (includes latestStartsAt) |
| GET /v1/parties/outstanding - warm | 200 | 11 | constant in history length (includes latestStartsAt and partiesFor) |
| GET /v1/reports (today only) | 200 | 9 | NOT memoised: loads the whole ledger, plus 4 per day in the range |
