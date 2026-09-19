# BUILD STATE

Updated: 2026-09-19T00:00:00Z   Iteration: 4

Config: `TARGET_STACK=react-native` · `BACKEND_LANGUAGE=typescript` ·
`CLOUD=AWS ap-south-1` · `MONEY=integer paise` · Node v24.15.0 · npm 11.12.1

## Gate table

| Gate | Title | Status | Evidence |
|------|-------|--------|----------|
| G0 | Repo, state ledger, spec extraction | **PASS** | `ls` of all four files + `wc -l SPEC-DIGEST.md` = **526 lines** (threshold 200). Output in BUILD_LOG.md. |
| G1 | Technology research - ADRs | **PASS** | `test $(grep -c '^## ADR-' TECH-DECISIONS.md) -ge 8` -> `OK`, count **12** |
| G2 | Legal audit | **PASS** | `grep -cE 'ACTION-REQUIRED\|BLOCKED-ON-HUMAN' LEGAL-AUDIT.md` -> **52**; 26 items mirrored into TRACEABILITY.md; **7 BLOCKED-ON-HUMAN** |
| G3 | Security audit / STRIDE | **PASS** | `npm audit --audit-level=high` -> **found 0 vulnerabilities**; `STRIDE rows: 87`; 21 items mirrored into TRACEABILITY.md |
| G4 | Schema + migrations, SQLite & Postgres | TODO | needs up/down/up on both engines + UPDATE/DELETE rejection test |
| G5 | **Formula Engine + vectors.json** | TODO | needs `test:vectors` under Node AND Hermes, >= 30 vectors, diff empty |
| G6 | Auth service (phone + OTP) | TODO | needs integration tests |
| G7 | Sync API (idempotent) | TODO | needs 3x replay of 200-entry batch, byte-identical |
| G8 | Read API (shared engine) | TODO | needs canonical day through API == vectors.json |
| G9 | Pipeline + Terraform | **BLOCKED-ON-HUMAN** | needs AWS credentials + GitHub repo. See BLOCKED §1 |
| G10 | Design tokens, Comfort/Focus | TODO | needs contrast test, all pairs >= 4.5:1, no white-on-marigold |
| G11 | Four form archetypes + keypad rule | TODO | needs render test: keypad absent outside the 7 screens and wherever BottomNav renders |
| G12 | The day close (9 sections, 3 states) | TODO | needs e2e nine-section close == vectors.json |
| G13 | The ending (4 screens) | TODO | needs screenshots + withdrawal-excluded-from-profit test |
| G14 | Today, parties, reports | TODO | needs ring non-zero, two aging vocabularies, no inventory card |
| G15 | Scaffolding (13 launch-blocking screens) | TODO | needs render + navigate |
| G16 | Localisation od/hi/en | TODO | needs missing-key test + tri-language screenshot |
| G17 | Offline endurance, 30 days | TODO | needs empty diff |
| G18 | Low-end device performance | **BLOCKED-ON-HUMAN** | needs a physical 2GB Android device or emulator budget. See BLOCKED §2 |
| G19 | Traceability closure | TODO | needs `npm run check:traceability` |
| G20 | Adversarial self-review | TODO | needs REVIEW.md with >= 5 real findings |

Legend: `PASS` command ran and its output proves the claim · `IN-PROGRESS` started,
named remainder below · `BLOCKED` cannot proceed without a human · `TODO` not started.

---

## G0 evidence

Command:

```
$ ls SPEC-DIGEST.md BUILD_STATE.md BUILD_LOG.md TRACEABILITY.md && wc -l SPEC-DIGEST.md
```

Output pasted in BUILD_LOG.md at the G0 entry. `SPEC-DIGEST.md` is **526 lines**,
comfortably over the 200-line skim threshold, and cites document + page for every rule.

All six specification PDFs were read end to end via `pdftotext -layout`, plus the paper
sheet and the one handwritten photograph that exists on disk:

| Read | Source | Lines extracted |
|------|--------|-----------------|
| OK | `SWAFTO-Strategy-1-Two-Speed-Ledger.pdf` | 406 |
| OK | `SWAFTO-Retail-Desk-Decisions.pdf` | 343 |
| OK | `SWAFTO-System-Architecture-and-DFD.pdf` | 424 |
| OK | `SWAFTO-Retail-Desk-Day-Close.pdf` | 411 |
| OK | `SWAFTO-Retail-Desk-Build-Map.pdf` | 430 |
| OK | `SWAFTO-Retail-Desk-Flow-Strategy.pdf` | 339 |
| OK | `docs/Retail Desk  V1.pdf` (the paper sheet) | 111 |
| OK | `docs/WhatsApp Image 2026-06-10...jpeg` (read as an image) | dated 25-05-26 |
| n/a | **15-07-2026 note - ABSENT FROM DISK** | see OD-4 |

---

## Open decisions

- **OD-1 · BI6 is BLOCKED-ON-HUMAN.** Item 6 of the 15-07-2026 note is physically
  incomplete on the photograph (`6. |`). Independently corroborated by
  `SWAFTO-Retail-Desk-Day-Close.pdf` p.9: *"Output #6 (unwritten) - Left incomplete in
  the 15-07 note - Blocked"*. **Not invented.** One reserved TRACEABILITY row. Blocks
  no gate. Resolving it costs one row and one engine function.
- **OD-2 · Internal inconsistency in the design doc.** `SWAFTO-Retail-Desk-Day-Close.pdf`
  p.5 shows the day-close list with withdrawal *unentered*, while p.7's cash-check
  working subtracts `Withdrawal 500`. Taken the **p.7 working as authoritative** for the
  canonical vector because it reconciles exactly with the Today figures on p.5
  (9,180 / 4,380 / 6,300 / 11,450). Safest option: the arithmetically self-consistent one.
- **OD-3 · BI gate horizons.** The design doc gives approximate horizons (~14/~21/~30);
  the build prompt fixes 14/14/21/14. Took the build prompt as normative - a gate must
  be an exact integer to be testable.
- **OD-4 · The 15-07-2026 photograph is absent from disk.** Only a 25-05-26 note exists
  (different content: five outputs, and *Remarks/Inquiry/Feedback* where the feature map
  has *Party Collection*). The 15-07 content is recoverable in full from the design doc
  p.9 table, which is how the feature map was corroborated. **If the original photo
  surfaces, re-verify the feature map against it.**
- **OD-5 · Day-state enum widened to FIVE against the build prompt's four.**
  `not_started | open | ready | closed | not_closed`. The build prompt says four
  (`not_started|open|ready|closed`); the architecture doc says a *different* four
  (`open|ready|closed|not_closed`); the decisions doc state machine (p.8) shows all
  five. Both shorter lists are lossy and both `not_started` and `not_closed` are
  load-bearing. **Flagged because it changes a schema the prompt specified literally.**
- **OD-7 · ADR-010 amended at G3: npm workspaces, not pnpm.** Every gate verifies with
  `npm run ...` / `npm audit`, so pnpm would need a shim or rewritten gates for no gain;
  npm 11 ships with Node 24. **Cost:** pnpm's strict layout would have made a phantom
  transitive import a build error, which mattered for the "formula-engine imports
  nothing" rule. **Replacement control:** a CI check asserting that package's
  `dependencies` is empty, plus the ADR-012 lint ban. Amended in the ADR rather than
  changed silently.
- **OD-8 · A moderate advisory passed the G3 gate.** `vitest@2/3` pulled
  `@vitest/mocker` with GHSA-82fw-gwwq-j7x9 (path traversal / arbitrary file read).
  `--audit-level=high` — the threshold the prompt specifies — would have let it through
  silently. Upgraded to `vitest@5` (free, no tests written yet) and recorded a standing
  policy: **moderate findings are triaged weekly and fixed or accepted in writing.**
- **OD-6 · Stack conflict resolved toward the prompt.** Every existing artifact says
  Flutter (architecture doc L1-L5, `tokens.dart`, the resource plan's four Flutter
  devs). `TARGET_STACK=react-native` overrides, and the two-engine rule collapses to
  one shared TS package. The architecture's *divergence-is-an-alarm* rule (§07.06) is
  **retained** - the server still recomputes and raises on mismatch.

## Blocked on human

1. **G9 - Pipeline and Terraform.** Needs AWS credentials for `ap-south-1`, a GitHub
   repository to run Actions in, and a domain for Cloudflare. The gate demands *"a green
   pipeline run URL and the staging smoke-test output"* and a rollback actually executed
   in staging. None of that can be fabricated. Terraform and workflow YAML can be written
   and validated offline (`terraform validate`, `actionlint`) - that much will be done and
   the gate held at IN-PROGRESS until credentials exist.
2. **G18 - Low-end device performance.** Needs a physical 2GB-RAM Android handset or a
   configured emulator to measure cold start, keypad latency and APK size. Budgets will
   be written into TECH-DECISIONS.md at G1 and the CI check wired up; the *measurement*
   needs hardware.
3. **BI6** - see OD-1. Does not block any gate.
3a. **Seven legal items need counsel or a business decision** (LEGAL-AUDIT §11):
   L-03 party-data Fiduciary/Processor analysis · L-05 retention period ·
   L-07 grievance officer · L-10 Cloudflare TLS-abroad transfer question ·
   L-17 privacy policy live · L-18 Terms liability vs the accuracy promise ·
   L-23 DLT registration. **L-13 (public deletion page), L-17 and L-07 block Play
   submission** and none of them is a code task.
4. **DLT registration** for transactional SMS in India has multi-week lead time and must
   start the day G2 finishes. Needs a registered business entity. Not a code task.

## Next action

**G4 - Database schema and migrations.** (G0-G3 complete.) Then **G5, the Formula Engine** - the heart of the product.

<!-- superseded next action:
**G1 - Technology research.** Write `TECH-DECISIONS.md` as >= 8 ADRs covering: RN
on-device SQLite (op-sqlite vs expo-sqlite vs WatermelonDB, benchmarked not blog-quoted),
sync protocol + clock-skew/day-boundary policy, backend framework on t4g.small, Postgres
access layer, phone+OTP auth and an Indian DLT-registered SMS provider, Android
background sync under doze, offline-capable crash reporting under DPDP consent, and
package manager / Node LTS / RN version / New Architecture.

Then G2, G3, and into the domain core at G4-G5. **G5 (the Formula Engine) is the heart
of the product and is the single most valuable gate in this list** - it is pure, fully
testable offline, and everything else is a projection of it.
-->
