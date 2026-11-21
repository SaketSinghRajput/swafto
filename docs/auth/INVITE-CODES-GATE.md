# Invite codes: simplicity gate (pre-build)

Gatekeeper: Code Simplicity Gatekeeper · 2026-11-20 · read-only review of `INVITE-CODES.md`
All line counts are **estimates** by the gatekeeper, not measurements. Nothing was built.

**Verdict: SIMPLIFY FIRST.** The security core is small and stays: a `kind` on the existing
`otp_pending` row, `verifyOtp` unchanged as the only code check, a constant request reply, a
purpose check at verify, a throwing SMS port, a CLI that writes the row. Roughly a third of the
design is audit/ops/guard surface that no stated threat needs yet. Cut or defer it as below.

Cross-reference: threats T1-T8 and decisions D1-D6 are those in `INVITE-CODES.md`.

## 1. Component by component

| Component | Needed? (property) | Smallest implementation (reuse) | Over-engineering to avoid |
|---|---|---|---|
| `AUTH_MODE` switch | Yes. RT-W4-8, no plaintext code ever sent or stored | `config.ts`: `authMode` parsed `invite`/`sms`; refuse boot if unset in production or invalid. In `invite`, `server.ts` wires the throwing port and skips `assertSmsPort` | Two extra guard rows. `invite`+`ALLOW_STUB_SMS` is simply ignored (stub never wired). `invite`+`STAGING_TEST_PHONES` already refuses boot today without `ALLOW_STUB_SMS=1`, and the test-number path lives on the stub port that is not wired. **Cut both rows** (backend to confirm the test-number code is only in `sms/stub.ts`) |
| `kind` column on `otp_pending` | Yes. T2 (purpose enforced) | One column, `CHECK kind IN ('sms','invite_new','invite_recovery')`. `PendingOtp.kind` **optional** (default `'sms'`) so `requestOtp` and the memory store need no edit. `takeAttempt` returns `kind` | `invite_delete` kind: web deletion is paused (D3), so **cut it**, with the `delete:` CLI purpose and its tests (RT-INV-7 stays as a regression check on the existing `delete:` key only) |
| Purpose check | Yes. T2 | `verifyOtp` returns `{ok:true, kind}`. In `routes.ts` after `ok`: `kind==='invite_new' && user` or `kind==='invite_recovery' && !user` gives 401 `code_invalid` (row is already cleared by `verifyOtp`) | A `refused_kind` audit row. A `warn` log event `invite_refused_kind` is enough to alert on |
| Constant reply in invite mode | Yes. T4, and "a request cannot overwrite an invite" | 4 lines in the request handler after `normaliseIndianMobile` and before `findUserByPhone`: `return 202 {sent:false, mode:'invite', digits:INVITE_DIGITS}`. `INVITE_DIGITS=8` goes beside `OTP_DIGITS` in `rate-limit/limits.ts` | A new route. A new constants file (`auth/invite.ts`): **cut it** |
| Always compute HMAC | Yes, cheap. T4 | Move the existing `given = hashOtp(...)` line above the ticket check (1 line moved) | Dummy-hash tricks beyond that |
| Throwing SMS port | Yes. RT-W4-8 | An inline object in `server.ts`: `{ send() { throw new Error('SMS disabled in invite mode') } }` | A `NullSmsPort` class or file |
| 24 h recovery expiry | Yes. D2 mitigation | In the CLI: `ttl = purpose==='recovery' ? 86400 : 604800`. Two named constants in the CLI file | A config knob. No `OtpStore` change |
| Migration 0005 | Yes (column + audit table) | `spec.ts` `migration5Up/Down`, `npm run db:emit`, the `check-generated.mjs` entries, `GRANT SELECT, INSERT ON invite_audit TO swafto_app` | Extra audit columns (see audit row). Edit the generated SQL by hand (never: it is generated) |
| `invite_audit` table | Yes, small. T3 and non-repudiation | Columns: `id, at, action ('issue'\|'revoke'), kind, phone_hmac (RATE_LIMIT_KEY), ticket`. Append-only trigger. **Only the CLI writes it** | `phone_masked` (list masks from `otp_pending`), `expires_at`, `consent_recorded`, `channel`, `operator` (CloudTrail already says who ran it; the design calls the field a cross-check only). `consumed` and `refused_kind` rows written by the API: **cut**. Writing from the API needs a new Repo port method plus pg and memory implementations and an INSERT path in the API process. The sign-in is already evidenced by the new `devices` row and a structured `invite_consumed {kind}` log line. Gate `--consent-recorded yes` stays as a CLI hard refusal, without a column |
| CLI `issue\|revoke\|list` | Yes. Issuance cannot be HTTP (no new admin surface) | One file `admin/invite-cli.ts`, plain `pg` with `DATABASE_URL`: issue = one transaction (upsert row + audit insert), revoke = delete + audit, list = masked select. Refuse unless `AUTH_MODE=invite` (see deferrals). **Read-back via a second argument, not a prompt**: SSM `SendCommand` is non-interactive, so a `y` prompt cannot work. Use `--phone` and `--confirm-phone`, which must match | An interactive confirm (will not work over SSM). `--operator`, `--channel`, `--phone` filter on `list`. Sweeping expired rows on every `issue` (purge-due does it) |
| Custom SSM document | **Defer** | D5 says operators are Saket only, who already holds root SSM, so the document adds no isolation today. The CLI validates its own arguments with a strict regex, which is what blocks injection | Build it when a second operator exists (the "restricted invite-only role" D5 already defers). T7 is unchanged by deferring |
| "New phone signed in" notice | Yes (D2 decision), but **no new push system** | **Stateless, client-only**, reusing `GET /v1/devices` (exists, already has `createdAt`, `revokedAt`, `current`; host.tsx already calls `listDevices`) and the existing Shell banner. Show when any non-current, non-revoked device has `createdAt` within the last 72 h: "A new phone signed in to your shop on <date>. Not you? Sign it out" with a link to C-21. Derived from recorded facts, so it fits the CLAUDE.md "derived output" rule | Push (`check:push` forbids it). A server flag or table. A recovery-specific signal: any new device is the signal, which is broader and also catches T3 insiders. **Open item for mobile:** confirm when `listDevices` is called (sync or only on C-21) and make it run on foreground sync. Limits: it fires only if the old phone is opened inside the window (stated residual) and a legitimate second phone also triggers it (acceptable) |
| Web-deletion pause | Yes (D3) | In `dpdp/routes.ts` deletion-request handler: if `authMode==='invite'` return the existing constant reply and do nothing (the throwing port must never be reached, or it is a 500). Static page copy in `apps/web/delete-account/` | A CLI purpose, a `delete` kind, a second code path. Check the web page is not generated before editing |
| Mobile changes | Yes | See section 4, mobile owner | Re-skinned screens, new components, new strings beyond the four listed |
| Expired-row sweep + audit purge | Sweep: yes (holds full numbers, DPDP minimisation). Audit purge: **defer** | `purge-due.ts`: one `DELETE FROM otp_pending WHERE expires_at < now` (+4 lines) | An audit purge now: rows are append-only by trigger and nothing is due for 12 months. Put a dated reminder in the runbook: first purge due before 2027-11-20 (D4 + trigger must allow the purge role) |
| `put` clause `AND kind='sms'` | **Defer** | CLI refuses in `sms` mode, so invites exist in `sms` mode only as leftovers from the flip. The flip runbook line: "run `invite revoke` for any live invite, or wait 7 d, then flip" | The clause (touches both stores plus a test) until the H23 `sms`-mode recovery path is actually wanted (D6 already defers it) |

## 2. Cut or defer (no weakening of T1-T8)

Cut: custom SSM document (defer, D5), API-side `consumed`/`refused_kind` audit rows (log lines
instead), `invite_delete` kind and `delete` purpose, `auth/invite.ts`, `NullSmsPort` class, two
config guard rows, interactive CLI confirm, extra audit columns, per-issue sweep, `list --phone`.
Defer: `put` kind clause, audit purge (to 2027-11), `invite unlock`, the restricted IAM role.

## 3. Line deltas (estimates)

| File | +/- |
|---|---|
| `apps/api/src/config.ts` | +12 |
| `apps/api/src/server.ts` | +8 |
| `apps/api/src/rate-limit/limits.ts` | +1 |
| `apps/api/src/auth/otp-store.ts` | +4 |
| `apps/api/src/auth/otp-store-pg.ts` | +6 |
| `apps/api/src/auth/otp-flow.ts` | +5 / -2 |
| `apps/api/src/auth/routes.ts` | +18 |
| `apps/api/src/dpdp/routes.ts` | +4 |
| `apps/api/src/jobs/purge-due.ts` | +4 |
| `apps/api/src/admin/invite-cli.ts` (new) | +70 |
| migration spec + `check-generated.mjs` + roles (generated SQL is regenerated, not hand-written) | +30 |
| `apps/web/delete-account/` copy | +6 |
| API tests (matrix, invite verify, purpose, CLI, purge) | +170 |
| **Backend source total** | **~+170 (design implied ~+300)** |
| `apps/mobile/src/net/client.ts` | +5 |
| `apps/mobile/src/app/session.tsx` | +10 |
| `apps/mobile/src/host.tsx` | +8 |
| `A3.tsx` / `A4.tsx` / `A5.tsx` | +3 / +2 -1 / +5 |
| `strings.ts` (od/hi/en, drafts H13) | +16 |
| Banner via existing Shell | +12 |
| Mobile tests | +50 |
| **Mobile source total** | **~+60** |
| Docs: `CONFIG.md` row, `docs/runbooks/invite.md` | +1, +40 (not code) |

## 4. Final build spec

**Contract between the two engineers (the only coupling, frozen now):**
- `POST /v1/auth/otp/request` in invite mode replies `202 {sent:false, mode:"invite", digits:8}`.
  In `sms` mode the reply is unchanged (`{sent:true, expiresInSeconds, digits}`). A missing `mode` means `sms`.
- Verify route and its 401/403/429 shapes are unchanged. `GET /v1/devices` is unchanged.

**Backend engineer (owns `apps/api/**`, `tools/check-generated.mjs`, `docs/infra/**`, `docs/runbooks/**`, `apps/web/delete-account/`)**
1. Migration 0005 via `spec.ts` (`kind` column with 3 values; `invite_audit` with 6 columns and append-only trigger), `npm run db:emit`, `check-generated.mjs` entries, INSERT-only grant. Test: `swafto_app` UPDATE/DELETE on audit refused.
2. `config.ts` `authMode` plus the two boot guards (unset-in-prod, invalid). Matrix test for those and for the dropped rows being non-events.
3. `server.ts`: inline throwing SMS port, skip `assertSmsPort` in `invite`.
4. `PendingOtp.kind?`, `takeAttempt` returns `kind` (memory and pg), `verifyOtp` returns `kind` and hashes before the ticket.
5. `routes.ts`: constant invite reply (before any DB read), purpose check with `invite_refused_kind` warn log, `invite_consumed` log line. Tests: byte-identical reply for {no account, account, live invite} and an invite row left byte-unchanged; second use 401; 5 wrong then right 401; day 7 + 1 s 401; wrong-number 401; `invite_new` on an existing account and `invite_recovery` on none: 401, row gone, no tokens.
6. `dpdp/routes.ts` pause plus static deletion-page copy.
7. `invite-cli.ts`: `issue` (needs `--phone --confirm-phone --purpose new|recovery --ticket --consent-recorded yes`), `revoke`, `list` (masked). Refuse unless `AUTH_MODE=invite`. Tests: re-issue kills the old code, concurrent issues leave one, revoke, list masked, bad phone refused, no code or full number in logs or audit.
8. `purge-due.ts` expired-invite sweep and test.
9. Docs: `CONFIG.md` row, `invite.md` runbook (handover, ring-back, revoke, the SMS-flip line, the 2027-11 audit-purge reminder).
10. Run `npm run check:all`, `npx vitest run`; `prove:verifiers` only if a check changed (`check:generated` entries count).

**Mobile engineer (owns `apps/mobile/**` only; no file shared with backend)**
1. `client.ts`: `requestOtp` returns `{mode, digits, expiresInSeconds?}`.
2. `session.tsx`/`host.tsx`: one `codeDigits` field set from the reply (default `OTP_DIGITS`); replace `CODE_DIGITS` and the `host.tsx:806` length check; skip the resend countdown in invite mode.
3. A3 "Next" label, A4 box count and copy, A5 drop resend, "Ask SWAFTO for a new code" for expired/burned/too-many. Strings in od/hi/en, marked draft (H13).
4. New-phone banner: stateless, from `listDevices` (72 h window), using the existing Shell banner, linking to C-21; make sure `listDevices` runs on foreground sync. Test: banner shows for a non-current device inside the window and not for the current one or a revoked one.

**Parallelism:** the two lists touch disjoint files and meet only at the reply contract above, so they can run at once. Mobile tests mock the reply.

## 5. Items that look like real requirements (do not cut)
- Purpose check (T2), constant request reply (T4), throwing SMS port (RT-W4-8), 24 h recovery expiry and the new-phone notice (Saket's D2).
- The CLI must stay HTTP-free. A recovery code over WhatsApp is an accepted residual (D2); the notice is detection only and fires only if the old phone is opened inside the window.
- Open for the owner: whether the audit-purge trigger allows the purge role; `GRANT` on `invite_audit` for the CLI role; confirm `apps/web/delete-account/` is not generated.
