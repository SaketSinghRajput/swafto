# Team charter — 2026-10-25 implementation wave

Five specialist agents and one Engineering Lead (the integrating session).
Agents are real, separate subagent runs. They do not hold meetings; they hand
back evidence, and where two disagree the Lead adjudicates in writing in
`docs/handover/DEFECTS.md`. No discussion is ever written up that did not
happen.

## Ownership

| Agent | Role | Owns (may edit) | Must not edit |
|---|---|---|---|
| Lead | Integration, merge, device, release status | `session.tsx`, `App.tsx`, `host.tsx`, `Root.tsx`, `store/`, merges | — |
| 1 · Design | UI/UX + design system | `T1`, `T5`, `T3`, `T2`, `T6` screens + tests, `theme/tokens.ts`, `components/Shell.tsx`, `components/Money.tsx` | session/App/host/Root |
| 2 · App | Core workflows | `PartyPicker`, `PartyDetail`, `P1`–`P3`, `T7`–`T14` screens + tests, `EntryForm`, `Keypad` | tokens, Shell, T1/T5 |
| 3 · Platform/Auth | Sign-in, opening scenes | new `A1`–`A8` screens, `platform/storage.tsx`, `net/client.ts` auth half, `MainActivity.kt`, Android config | T-screens, P-screens |
| 4 · Backend | Reliability | `apps/api/**`, `net/client.ts` sync half, `packages/schema/**` | mobile screens |
| 5 · Compliance/QA | Independent review | `docs/compliance/**`, `docs/handover/DEFECTS.md` (append) | any source file |

Shared files an agent needs but does not own (`session.tsx`, `App.tsx`,
`strings.ts`, `registry.tsx`): the agent MAY make strictly additive edits in
its own worktree (new `ScreenId` members, new string keys under its own
prefix, new registry cases, new Session methods) and MUST list every such edit
in its report so the Lead can merge it. It never reorders, renames or rewrites
existing entries in those files.

## Rules every agent follows

Read first: `CLAUDE.md` (hard rules), `chat.md` (history and the defect
register F-1…F-17, U-1…U-10), `docs/design-reference/README.md`.

1. **The reference is the picture.** `docs/design-reference/comfort/<ID>.png`
   at 393×876 @2x. Open the PNG with the Read tool and look at it. The source
   is `SWAFTO daily closing app design/Phone.dc.html` + `store.js` +
   `tokens.css`. Do not invent a replacement for a screen the reference has.
2. **Never weaken a test or a check. Never move a threshold. Never edit a
   generated file** (`PLAN.md`, `TASKS.md`, `DESIGN.md`, `README.md`,
   `FINDINGS.md`, `VERIFIERS.md`, `LICENCES.md`, `DATA-SAFETY.md`,
   `BENCHMARKS-RESULTS.md`) — rerun its generator in `tools/` (e.g.
   `node tools/gen-design.mjs`). Never edit `docs/spec/source/`.
3. **Money is integer paise** through `add/subtract/sum/divideMoney`.
   `check:money` fails a bare `+`/`-`/`Number()` on money, in tests too.
4. **Every size, colour and space from a token.** `check:layout` fails raw
   numbers. Touch targets ≥ 56dp (registry floor). Every amount tabular.
5. **New logic has a test that fails without it.** Prove it: plant the defect,
   see the failure, restore.
6. **Never print a number you did not measure.** Report commands and output.
7. **No inference in data entry.** No autocomplete/predict of a figure.
8. A `PreToolUse` "Fact-Forcing Gate" hook blocks the first edit of each file
   until you state: importers (Grep), affected public API, data shape
   (synthetic values), and the user's instruction quoted. State them, retry.
9. Before finishing: `npx tsc --noEmit -p tsconfig.json`, `npx vitest run`,
   `npm run check:all` all pass in your worktree. If you changed a check,
   `npm run prove:verifiers`. Commit on your worktree branch.
10. Do not run `adb` — the Lead owns the phone.

## Status vocabulary

CONFIRMED · IMPLEMENTED · TESTED · REPORTED · UNRESOLVED · BLOCKED — as in
`chat.md`.
