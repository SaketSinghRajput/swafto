# BENCHMARKS

This file defines "done". **It is frozen.** Its SHA-256 is committed to
`benchmarks.lock` and CI fails if the hash changes.

No threshold in this file may be edited. A benchmark that cannot be met is recorded as
`BENCHMARK-MISSED` in `BENCHMARKS-RESULTS.md` with its measured value and three
recorded attempts. A met benchmark achieved by moving the line is a lie, and it is the
one failure mode that makes this loop worthless.

## Correctness — all mandatory, no tolerance

| ID | Benchmark | Threshold |
|----|-----------|-----------|
| B1 | Golden vectors | >= 70 vectors, 100% pass |
| B2 | Node vs Hermes divergence | exactly 0 across all vectors |
| B3 | Formula Engine branch coverage | 100% |
| B4 | Formula Engine mutation score | >= 90% |
| B5 | Backend line coverage | >= 85% |
| B6 | Backend mutation score | >= 75% |
| B7 | App logic coverage (non-render) | >= 70% |
| B8 | Sync replay idempotency | 3 replays, byte-identical state |
| B9 | 30-day offline endurance diff | empty |
| B10 | Append-only enforcement | UPDATE and DELETE rejected at DB level |
| B11 | Cross-tenant isolation | shop A cannot read shop B, proven |
| B12 | Money float-arithmetic lint | 0 violations |
| B13 | Traceability empty cells | 0 (BI5 reserved is the only exemption) |

## Performance — constrained AVD, release build, median of 3, p95 where stated

| ID | Benchmark | Threshold |
|----|-----------|-----------|
| B14 | Cold start to first paint | <= 2500 ms |
| B15 | Cold start to interactive | <= 3500 ms |
| B16 | Today screen render, 365 days history | <= 400 ms |
| B17 | Keypad keypress to glyph, p95 | <= 80 ms |
| B18 | Entry save, local commit, p95 | <= 150 ms |
| B19 | Full nine-section day-close compute | <= 250 ms |
| B20 | Reports render, 365 closed days | <= 1200 ms |
| B21 | Aggregate query over 10,000 entries | <= 100 ms |
| B22 | Peak memory during day close | <= 220 MB |
| B23 | Dropped frames scrolling Today | < 1%, no single frame > 32 ms |
| B24 | APK download size, arm64 split | <= 25 MB |
| B25 | Outbox of 500 entries on 2G profile | <= 90 s, resumable after a mid-flight kill |

## Accessibility and localisation — all zero-tolerance

| ID | Benchmark | Threshold |
|----|-----------|-----------|
| B26 | Contrast, every pair, both modes | >= 4.5:1, 0 failures |
| B27 | White-on-marigold occurrences | 0 |
| B28 | Touch targets below 56dp | 0 |
| B29 | Body text below 17sp | 0 |
| B30 | Missing i18n keys, od / hi / en | 0 |
| B31 | Layout overflow in any language | 0 |
| B32 | Non-Latin numerals in any money field | 0 |

## Security

| ID | Benchmark | Threshold |
|----|-----------|-----------|
| B33 | npm audit high or critical | 0 |
| B34 | Container scan high or critical | 0 |
| B35 | Secrets detected in repo or APK | 0 |
| B36 | Amounts, names or phones in logs | 0, proven by grepping a full day close |
| B37 | OTP brute force and SMS-bomb limits | enforced and tested |

## Completeness

| ID | Benchmark | Threshold |
|----|-----------|-----------|
| B38 | Screens implemented and navigable | 27 of 27 |
| B39 | Feature IDs with function+test+API+screen | IN1-7, P1-8, OP1-6, BI1-4, BI6 complete |
| B40 | Stubs, TODOs, unimplemented throws | 0 in shipped paths |
