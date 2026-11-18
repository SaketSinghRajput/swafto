# Wave 2 — shared brief for every fix engineer

Read `CLAUDE.md` first; it overrides this file. Then read `docs/audit/REPORT.md` and
the source findings files for your C-IDs (`docs/audit/findings/*.md`, with file:line
evidence and the red-team PoCs in the scratchpad `audit/` folder).

## Environment
- Node 24: `. "C:/Users/user/AppData/Local/Temp/claude/5ffa23da51200cce/77fbafc9-5e28-4b05-919b-e234edfe3cfb/scratchpad/env.sh"`
  in Git Bash. This sets PATH to Node 24, scopes git `safe.directory`, and cd's to the repo.
- **There is no Postgres in this session.** Docker can't run because WSL isn't installed,
  and starting a local server is not permitted. Do not try to start one by any means.
  Postgres-gated specs skip locally and run in CI. For any SQL change:
  - write the Postgres spec anyway, in the same style as the existing ones, so CI proves it.
  - mark the change `UNVERIFIED-LOCAL (needs Postgres)` in your report.
  - where an in-memory twin exists (`db/memory.ts`, `rate-limit/memory-sql.ts`), keep it in step and test against it.
- Don't commit. Don't push. Don't run `npm install` or `npm ci` unless your brief says you own the lockfile.
- Don't touch the phone. Don't touch `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties`
  (Saket's uncommitted change).

## Rules that bite here
- **One owner per folder.** Edit only the paths your brief gives you. If you need a change
  elsewhere, put it in your report as a request. Don't make it yourself.
- Money: integer paise, through `packages/formula-engine/src/money.ts` helpers. `check:money` applies to tests too.
- Never weaken a test or a check. Never move a threshold. Never hand-edit generated files
  (`PLAN.md`, `TASKS.md`, `DESIGN.md`, `README.md`, `FINDINGS.md`, `VERIFIERS.md`, `LICENCES.md`,
  `DATA-SAFETY.md`, `BENCHMARKS-RESULTS.md`); regenerate them with their tool if your change moves them.
- The formula engine stays clock-free.
- **Every fix gets a test that fails without the fix.** Prove it: run the test with your fix
  stashed or reverted, and quote the failure in your report.
- **Smallest diff that works.** No new frameworks, no Redis, no refactors beyond what the fix needs.
- If you change a check under `tools/`, run `npm run prove:verifiers`.

## Done means
`npx vitest run` is green, with the counts quoted. `npm run check:all` is green, or any
failure is shown to be pre-existing and unrelated, with output. Your report lists:
- each C-ID with its status: FIXED / PARTIAL / UNVERIFIED-LOCAL / HUMAN
- the files changed
- the fails-without-fix evidence
- every reversible product decision you made, with a one-line reason

Keep the report under 400 words.
