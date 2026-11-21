# Autonomous redesign → verify → build → test-deploy (started 2026-11-20)

Owner: CTO. Design phases: CPO team. Gates: synthetic customer panel + synthetic shark panel.
Mandate: Saket's /hq brief of 2026-11-20 (autonomous; test/staging only; never production, never local).

## Decisions taken by the CTO at start (and why)
1. **Design candidate = Mitra (M1/M2, approved by Saket 2026-11-18), refined by the gates.** Not a fresh direction: discarding an approved direction is not the brief's intent.
2. **Test env = new and separate, `Environment=test`.** `api.rohinova.com` is the beta server for shopkeeper sessions; nothing in this run touches it.
3. **Public repo:** pushes follow STATE.md "Repo / GitHub": clean single-commit snapshots via `git commit-tree` minus the exclusion list; no local history; no co-author trailers. Remote branches: `redesign-autonomous` (feature) and `test`.
4. **Synthetic scores:** panel SUS / task success / shark verdicts are role-played estimates, labelled "synthetic" wherever they appear. Never presented as measured. `BENCHMARKS.md` is untouched.
5. **One heavy job at a time** (emulator, Gradle, check:all, prove:verifiers): the machine runs out of memory otherwise.

6. **Hindi font (Phase 2 finding, CTO-verified 2026-11-20):** the shipped `AnekOdia-*.ttf` cmaps hold 90 Odia and 2 Devanagari code points, so Hindi renders in whatever font the handset has. Phase 3 adds **Anek Devanagari** (same family, OFL; licence to be confirmed from its own repo before bundling) as static Regular/Medium/Bold, subject to `check:font`, `check:licences` and `check:layout`.
7. **No third-party component kit** (LIBRARY.md §2): components stay in-house so `check:design` keeps seeing every token.
8. **Touch target floor: the registry value** (LIBRARY.md §5); no target below it.

9. **Saket, 2026-11-21: no AWS test environment.** The "test server" is local (dev API + local Postgres + emulator); the APK goes to S3 by the CTO from the local CLI (profile `saftwo`), not from CI. `infra/terraform/test/` stays written and unapplied. This supersedes "never local" in the original brief for the test server only; production stays untouched.
10. **Public snapshots are redacted:** AWS account ID, instance ID and Elastic IP are replaced with placeholders in the pushed copy of `docs/infra/HOSTING.md`, `docs/runbooks/deploy.md` and `tools/swafto-invite.mjs`. Local files are unchanged.

## Phases and gates
| # | Phase | Owner | Gate |
|---|---|---|---|
| 0 | Emulator + CI APK job (v1.<run>) + S3 upload (OIDC) | devops-sre-engineer | CI green; APK in S3, or the blocker logged |
| 1 | Audit current app on device, baseline | mobile-realworld-tester, customer-panel-lead, managing-partner | design/audit/UX-REPORT.md |
| 2 | Design library (vetted, licensed) | product-designer | design/LIBRARY.md |
| 3 | Design: tokens, components, flow, clickable prototype | product-designer, ux-designer | design/proposals/ |
| 4 | Verify design (≤5 iterations) | panel + sharks | synthetic SUS ≥ 80, no S1/S2, WCAG AA, beats baseline → VERIFIED-DESIGN.md |
| 5 | Build + device test (≤5 loops) | screen-designer, code-simplicity-gatekeeper, qa | synthetic SUS ≥ 80, task success ≥ 95%, 0 S1/S2, AA, CI green, check:all + vitest |
| 6 | `test` branch + Terraform test env + smoke | devops-sre-engineer | URL + APK link in FINAL-REPORT.md, or the blocker logged |

Blockers: design/BLOCKERS.md. Final: design/FINAL-REPORT.md.
