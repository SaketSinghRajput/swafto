# Wave 1 audit — shared brief for every auditor

Repo: `D:\SWAFTO\code base` (git branch `productionize`). SWAFTO Retail Desk is an
offline-first daily cash-and-credit closing app for small Indian retail shops. The
stack is a React Native (0.81, Hermes) Android client with op-sqlite as the
authoritative local store, a Fastify API in `apps/api`, Postgres, AWS ap-south-1
(`infra/`, `aws/`), and shared money/formula logic in `packages/formula-engine`.

## The founder's productionize targets
1000+ concurrent users · API p95 < 300 ms · 99.9 % uptime · ₹7,000 Android phone ·
patchy 3G/4G · Odia/Hindi/English. Launch-ready and industrial grade.

## Rules (read `CLAUDE.md` first — it overrides everything here)
- **READ-ONLY.** Do not edit any repo file except your own findings file at
  `docs/audit/findings/<your-role>.md`. Put scratch work (PoC scripts, logs) in
  `C:\Users\user\AppData\Local\Temp\claude\5ffa23da51200cce\77fbafc9-5e28-4b05-919b-e234edfe3cfb\scratchpad\audit\<your-role>\`.
- Do not start, stop or reset Docker or Postgres, and do not run `npm ci`/`npm install`.
  Targeted `npx vitest run <path>` is fine. For Node, put this first on PATH:
  `C:\Users\user\AppData\Local\Temp\claude\5ffa23da51200cce\77fbafc9-5e28-4b05-919b-e234edfe3cfb\scratchpad\node24\node-v24.22.3-win-x64`
  (the repo pins Node 24; the system Node is 26).
- Git needs `git -c "safe.directory=D:/SWAFTO/code base" ...`. Do not commit.
- Don't touch the phone. The CTO drives it.
- **Never print a number you did not measure.** If something is an estimate, label it as one.
- **Known findings exist.** Read the relevant ones first: `docs/handover/DEFECTS.md`,
  `docs/audits/SECURITY-AUDIT.md`, `docs/audits/REVIEW-2026-10-22.md`,
  `docs/governance/REVIEW.md`, `docs/governance/FINDINGS.md`. For each one in your
  area, **re-verify it against the current code** and mark it `KNOWN-STILL-OPEN`,
  `KNOWN-NOW-FIXED` or `KNOWN-PARTIAL`. Mark your own discoveries `NEW`.
- The product's deliberate positions are not defects: no inference in data entry,
  append-only ledger, a frozen closed day, no stored totals, integer paise, a
  clock-free engine, and `shopOf()` as the whole of tenancy. Report a *violation*
  of one of these, not its existence.

## Severity
- **S1** Data loss or corruption, a wrong money figure, a cross-tenant leak, auth
  bypass, a secret in the tree, or a crash on the main path. Launch-blocking.
- **S2** A security weakness with a plausible exploit, a broken core flow, a missing
  validation on an input boundary, or a scale blocker for the 1000-user target.
  Launch-blocking.
- **S3** Degrades quality, ops, performance or UX. Fix before GA.
- **S4** Polish or hygiene.

## Output: `docs/audit/findings/<your-role>.md`
Start with a 5-line summary: the counts by severity and the single biggest risk. Then
one row per finding:

| ID | Sev | Status | Title | Evidence (file:line, or command + output) | Impact | Fix (smallest change that works) |

ID prefix = your role code (ARCH, OPS, BE, FE, SEC, RT, UX, SIMP). Evidence must be
specific enough for someone else to re-check in under two minutes. Rank S1 first.
End with "What I did not cover" so the gaps are explicit.

Your final reply to the CTO: the summary plus the S1/S2 IDs with one line each. Under 300 words.
