# Interim sign-in: beta invite codes (ARCHITECTURE gate, design only)

Owner: Security Architect · Status: **proposed, needs founder decisions (section 8)** · 2026-11-20
Scope: until DLT (H1) ships, an admin issues a one-time code tied to one shopkeeper's
number and hands it over in person or on WhatsApp. The shopkeeper types the number and
the code once, and is signed in. Sessions (180 d), refresh rotation with grace, the app-lock
PIN and the offline ledger do not change. When SMS arrives, `AUTH_MODE` flips back to `sms`.

**Design rule: an invite is just a long-lived `otp_pending` row that a person wrote instead
of `requestOtp`.** `verifyOtp` stays the only path that checks a code. It keeps the HMAC
(`hashOtp(signingKey, phone, code)`), the atomic `takeAttempt` ticket before the compare
(RT2-1), the 5-per-code cap (B37/TB6), `verifyPerIp` (SEC-103), the atomic single-use
`clear`, and a uniform 401 `code_invalid`. There is no new auth route and no new admin
HTTP surface.

## 1. Code format, entropy, arithmetic

| Property | Value | Why |
|---|---|---|
| Alphabet | **digits 0-9 only** | A4 already has the app's own numeric keypad. Digits have no 0/O or 1/I/l confusion, read aloud the same in Odia, Hindi and English, and need no system keyboard on a ₹7,000 phone. (The brief suggested letters; see decision D1.) |
| Length | **8**, shown as `4821 0937` | An 8-digit invite code is enough by the arithmetic below, and visibly different from the 6-digit SMS code. |
| Generation | `mintOtp(8)` (`crypto.randomInt` per digit, uniform) | Same CSPRNG as the SMS codes |
| Stored | `hashOtp(SESSION_SIGNING_KEY, phone, code)`; the plaintext is never stored | Unchanged |
| Expiry | `INVITE_TTL_SECONDS = 604800` (7 d), a named constant | Founder brief. Reversible |
| Attempts | **5 per code, total, from every source**; the 5th wrong guess deletes it | B37 is honoured exactly. Invite mode has no self-service resend, so a burned code needs a re-issue (T6) |

**Brute force (my arithmetic, not a measurement).** Code space S = 10^8.
- *One invite:* at most 5 compares, ever, from any number of IPs. The ticket is taken before
  the compare, and nobody can make the code mint again. P(hit) ≤ 5/10^8 = **1 in 20,000,000**.
- *Today's SMS mode, for comparison:* six-digits, and an attacker can force up to 10 codes per
  number per day (`sendPerPhoneDaily`) × 5 guesses = 50/10^6 = **1 in 20,000 per number per
  day**. Invite mode is about 1,000× stronger per number, because the attacker cannot get
  fresh codes.
- *Whole fleet, worst case:* the attacker knows every invited number. With P live invites,
  P(any hit) ≤ 5P/10^8. For an illustrative P = 1,000 (an assumption, not a plan) that is
  5×10^-5 (1 in 20,000), and getting there burns all 1,000 invites, which is loud (T6).
  A guess against a number with no invite takes no ticket and can never succeed.
- *Rate:* `verifyPerIp` (100/h, 1 h lockout) lets one IP burn at most 20 invites per hour.
  This needs `TRUST_PROXY` to be correct, which production enforces (RT-W4-3).
- *Offline:* a database dump without the key is useless (HMAC). Someone with the dump and
  `SESSION_SIGNING_KEY` can search 10^8 easily. But that key already mints session tokens,
  so the invite adds no exposure.

## 2. Issuance: server CLI over SSM, no HTTP

`apps/api/src/admin/invite-cli.ts` runs from the release on the box as the API's service user
with the API's environment. Commands:

```
invite issue  --phone <n> --purpose new|recovery|delete --channel in_person|whatsapp \
              --operator <name> --ticket <ref> --consent-recorded yes
invite revoke --phone <n> --operator <name> --ticket <ref>
invite list   [--phone <n>]          # masked: +91 XXXXXX0001, kind, expires, status; never a code
```

- **Least privilege.** The CLI connects with `DATABASE_URL` (`swafto_app`: NOBYPASSRLS, no
  `users` access). It touches only `otp_pending` and `invite_audit`, and never uses
  `SYSTEM_DATABASE_URL`. `swafto_app` can already write `otp_pending`, so the CLI gains no
  database power the API process lacks.
- **Issue replaces the old code.** One transaction does an unconditional upsert on the key
  (`<phone>`, or `delete:<phone>` for `delete`) with `attempts = 0` and the new hash, and
  writes an `issue` audit row. Any older code for that key is dead the moment this commits.
  `revoke` deletes the row and writes a `revoke` row. Expired rows are swept on every
  issue and by `purge-due` (section 6), because invite mode has no sends to trigger the
  existing sweep.
- **Read-back guard.** The operator types the number twice. The CLI prints the masked
  number and the purpose and asks for `y`. After that it prints the code **once**,
  grouped 4-4, and nothing else.
- **Audit (`invite_audit`, append-only by trigger).** It records `at`, `action`
  (issue · revoke · consumed · refused_kind), `kind`, `phone_hmac` (keyed with
  `RATE_LIMIT_KEY`, which already hashes phone numbers), `phone_masked` (last 4 only),
  `operator`, `ticket`, `channel`, `consent_recorded` and `expires_at`. The API writes
  `consumed` on a successful invite verify. No full number and no code is ever written.
  The authoritative "who ran it" is the CloudTrail `SendCommand` event; the `operator`
  field is only a cross-check.
- **SSM control.** Operators get a dedicated permission set that may only `ssm:SendCommand`
  a **custom command document `SWAFTO-Invite`**, never `AWS-RunShellScript` or
  `StartSession`. Its parameters (`action`, `phone`, `purpose`, `channel`, `operator`,
  `ticket`) are checked against `allowedPattern` regexes such as `^[0-9 +]{10,16}$`, so
  nobody can inject shell. Root-shell SSM stays founder-only, as `deploy.md` has it now.

## 3. Verify flow and the app

- **Request (`POST /v1/auth/otp/request`) in invite mode** validates and normalises the phone
  (400 on a bad shape, same as today, not an oracle). It then returns a constant
  `202 {sent:false, mode:"invite", digits:8}`. It does no database read and no
  `requestOtp`, so it **cannot overwrite or destroy an invite**, and the bytes and timing
  are identical for every number. The app discovers the mode from this reply, so the
  switch to SMS needs no new APK. Web deletion (`/v1/deletion/request`) behaves the same way.
- **Verify is the existing route, unchanged in shape.** `takeAttempt` also returns `kind`.
  After a correct compare the route enforces purpose:
  `invite_new` on a number that already has an account, or `invite_recovery` on one that
  has none, gives **401 `code_invalid`**, clears the row and writes `refused_kind`. An
  admin's wrong-number mistake then fails closed instead of opening someone else's shop
  (T2). Only someone who already holds a correct code can see this outcome, so it is not
  an enumeration oracle. `verifyOtp` always computes the HMAC, even with no ticket, to
  narrow the timing gap (T4).
- **New account:** the existing route. Consent is required before the account exists
  (DPDP 403 `consent_required`), then X1 shop setup.
- **Existing account on a new phone (the H23 recovery path):** an `invite_recovery` code
  signs in as a new device and the ledger syncs down. The owner revokes the lost phone from
  Settings (C-21). In invite mode no self-service request exists that could be abused, so
  issuing the code is itself what H23 option 1 requires. Clearing limiter state is still
  needed in `sms` mode (section 8, D6).
- **Mobile:** A3 shows "Next" instead of "Send code" when `mode = invite`. A4 draws `digits`
  boxes (`CODE_DIGITS` comes from the reply instead of a constant) and says "Type the
  8-digit invite code SWAFTO gave you". A5 drops "resend" and says "Ask SWAFTO for a new code" for
  expired, burned and too-many states. The Odia and Hindi strings are drafts (H13).

## 4. Mode switch and boot guards (`config.ts`)

| Condition | Result |
|---|---|
| `AUTH_MODE` not exactly `invite` or `sms` | refuse boot |
| production (or `NODE_ENV` unset, RT-W4-4) and `AUTH_MODE` unset | refuse boot (no default) |
| `invite`, any env | SMS port is a `NullSmsPort` whose `send` **throws**, so nothing can send or keep a plaintext code (RT-W4-8). `assertSmsPort` is skipped and **`ALLOW_STUB_SMS` is not needed** |
| `invite` and production and `ALLOW_STUB_SMS=1` | refuse (contradiction) |
| `invite` and `STAGING_TEST_PHONES` set | refuse (testers use invites) |
| `sms` | every existing guard unchanged: real adapter, or `ALLOW_STUB_SMS=1` with the warning; the test-number path stays staging-only |

The CLI works in both modes (in `sms` mode an invite is the H23 recovery). In `sms` mode
`put`'s overwrite clause gains `AND otp_pending.kind = 'sms'`, so a stranger's SMS request
can never replace a live invite.

## 5. Threat model (STRIDE)

L/I = likelihood/impact (H/M/L), after mitigation.

| # | Threat (STRIDE) | Mitigation | Residual (L/I) |
|---|---|---|---|
| T1 | Code intercepted on WhatsApp, shoulder-surfed, or the WhatsApp account belongs to a recycled number's old owner (S) | Single use. Code only, never number and code in one message. Staff stay until sign-in in person. A ring-back to the number before issuing. Recovery codes in person or after a ring-back (D2). 7-day cap | Someone with code and number inside the window takes over a new or recovered account. **M/H** |
| T2 | Admin issues for the wrong number (S/E) | Typed twice, read-back confirmation, purpose enforced at verify (`refused_kind`), the code is bound to the number by HMAC | `recovery` issued for a wrong but existing number held by someone else, and the code handed to that person. **L/H** |
| T3 | Insider issues a recovery code for a real shop and uses it (E/R) | Custom SSM document only, append-only audit, CloudTrail, ticket required, founder reviews audit against tickets monthly | Detection only. A root-SSM insider can do this and more already. **L/H** |
| T4 | Enumeration / timing: "has an invite?" (I) | Constant request reply with no database read. Verify gives 401 for everything. HMAC always computed. Probes are capped by `verifyPerIp` and each one spends a ticket | A small database-path timing gap (matched vs unmatched UPDATE), not measured. **L/L** |
| T5 | Reuse, replay, double-submit (S/T) | Atomic `clear` (only one of two concurrent correct submits wins). Refresh rotation unchanged. `delete:` namespace separate in the HMAC and the key | none known |
| T6 | DoS: burn an invite with 5 wrong guesses, or flood verify (D) | `verifyPerIp`, schema limits, a cheap request path. Burns raise a `warn` event `invite_burned` for alerting. Re-issue. Deliberately no global verify breaker (RT2-2 lesson) | Someone who knows the number delays one sign-in until it is re-issued. **M/L** |
| T7 | CLI access: who can SSM (E) | A separate IAM permission set; `allowedPattern` blocks injection; MFA via SSO | The code is plaintext in the SSM command output (`GetCommandInvocation`), and the phone parameter may sit in CloudTrail (to verify). **M/M** |
| T8 | DPDP: holding a number before the account exists; WhatsApp is a third party (I) | `--consent-recorded yes` is required. Ownership is shown in person or by ring-back. Full number only in `otp_pending` (deleted on use or expiry), audit masked or hashed. App consent at first verify unchanged | Legal basis below. **L/M** |

**DPDP.** Issuing a code means processing the shopkeeper's number before the in-app notice.
Section 7(a) of the DPDP Act 2023 (data the person gave voluntarily for a specified purpose)
may cover this, but I am **not certain it applies**. The conservative reading is to obtain
and record consent to be contacted, and to keep the number only for issuing the code. Counsel
should confirm (H9). Sending the code by WhatsApp passes the number and the code through Meta
(decision D2).

## 6. Exactly what changes

- **Migration 0005**, through `spec.ts` (`migration5Up/Down`), `npm run db:emit`, and two new
  entries in `tools/check-generated.mjs`:
  - `ALTER TABLE otp_pending ADD COLUMN kind TEXT NOT NULL DEFAULT 'sms' CHECK (kind IN ('sms','invite_new','invite_recovery','invite_delete'))`
  - `CREATE TABLE invite_audit (...)` with the fields in section 2, plus a trigger that
    refuses UPDATE and DELETE.
  - Down: drop the table, drop the column.
  - `roles.postgres.sql`: `GRANT SELECT, INSERT ON invite_audit TO swafto_app` (no
    UPDATE/DELETE).
- **API:**
  - `config.ts`: `authMode` and the guards.
  - `server.ts`: `NullSmsPort`.
  - `auth/otp-store*.ts`: `kind` in `PendingOtp`, `takeAttempt` returns it, and the `put`
    clause.
  - `auth/otp-flow.ts`: always compute the HMAC, return `kind`.
  - `auth/routes.ts`: invite branch on request, the kind check and the `consumed` audit row.
  - `dpdp/routes.ts`: deletion request is a no-op in invite mode.
  - `jobs/purge-due.ts`: delete expired `otp_pending` rows.
  - New `auth/invite.ts` (constants, `formatCode`) and `admin/invite-cli.ts`.
- **Infra/docs:**
  - SSM document `SWAFTO-Invite` and the operator permission set (with cloud-security).
  - `docs/infra/CONFIG.md`: an `AUTH_MODE` row.
  - New `docs/runbooks/invite.md`: issue, ring-back, handover script, recovery checks, revoke.
  - An H23 status note through its owner.
- **Mobile:** `net/client.ts` (the `mode`/`digits` reply), `app/session.tsx`, A3/A4/A5 and their
  strings.

**Tests.** Each one must fail without its change.
1. Config matrix: every row in section 4.
2. A request in invite mode leaves an invited row **byte-unchanged**, sends nothing, and
   returns identical bytes for {no account, account, live invite}.
3. Invite verify: success. Second use gives 401. 5 wrong then the right one gives 401.
   Day 7 + 1 s gives 401 (injected clock). A code for number X used on Y gives 401. A
   sign-in code on `delete:` gives 401.
4. `invite_new` on an existing account and `invite_recovery` on none: 401, row gone,
   `refused_kind` audited, **no tokens**.
5. An SMS-mode `put` does not overwrite a live invite.
6. CLI: re-issue kills the old code. Revoke works. `list` is masked. Two concurrent issues
   leave one live code. `swafto_app` UPDATE/DELETE on `invite_audit` is refused. Bad phone
   refused.
7. `purge-due` sweeps expired invites.
8. Mobile: 8 boxes from the reply, invite copy, no resend.
9. The journal and the CLI output (apart from the single print) contain no code and no
   full number.
10. `prove:verifiers` if any check changes.

**Red-team plan (testers execute; synthetic numbers, local or staging only):**
RT-INV-1 2,000 concurrent guesses on one invite: ≤ 5 compares, 0 hits.
RT-INV-2 Spray across numbers from 1 and from N IPs: 429 at request 101 per IP, 0 hits.
RT-INV-3 Oracle: bytes and status of request and verify across {none, account, live, burned, expired}, plus 1,000 timing samples each, report the medians.
RT-INV-4 A request cannot alter, extend or destroy an invite, in either mode.
RT-INV-5 Replay after success, and a concurrent double-submit of the correct code: exactly one session.
RT-INV-6 A wrong-purpose code never enters an existing shop.
RT-INV-7 Sign-in and deletion namespaces stay separate.
RT-INV-8 Every row of the boot-guard matrix.
RT-INV-9 Shell or SQL injection through the SSM document parameters and the CLI arguments.
RT-INV-10 Audit tampering as `swafto_app`.
RT-INV-11 Log and SSM output scrape for codes and numbers.
RT-INV-12 A wrong `TRUST_PROXY` cannot collapse `verifyPerIp` (RT-W4-3 rerun).

## 7. Out of scope

A second factor for a new device (H23 option 2), an admin web UI, and changes to the SMS
limits.

## 8. Founder decisions needed

- **D1** an 8-digit invite code on the existing keypad, instead of a letter alphabet. *Recommended.*
- **D2** Is WhatsApp acceptable for `new` codes? Are `recovery` codes in person or
  ring-back only? *Recommended: yes, and yes.*
- **D3** Web deletion in invite mode: the grievance officer issues a `delete` code by CLI,
  which needs H6 named. In-app erasure (`/v1/me/erase`) is unaffected.
- **D4** How long to keep `invite_audit` rows. Not proposed here; it belongs in the retention
  schedule.
- **D5** Who gets the operator permission set.
- **D6** Later: a "new phone signed in to your shop" notice on existing devices (detection for
  T1/T3), and an `invite unlock` (clear limiter) command for H23 in `sms` mode.

## Decisions (Saket, 2026-11-20)
| ID | Decision |
|---|---|
| D1 | an **8-digit invite code** on the existing keypad, shown as `4821 0937`. |
| D2 | **WhatsApp is acceptable for BOTH new and recovery codes** (Saket's choice; the CTO recommended call-back for recovery). This is an **accepted residual risk**: a forwarded or intercepted recovery code can take over an existing shop. CTO-default mitigations, reversible: **recovery codes expire after 24 h** (new codes keep 7 days), and the previously signed-in device gets a **"new phone signed in to your shop"** notice when a recovery code is used (D6 brought forward to this build). |
| D3 | Web deletion in invite mode: **paused** (the page explains that deletion is done in the app); in-app erase is unaffected. Re-enable it once H6 (grievance officer) and SMS exist. CTO default. |
| D4 | Audit rows kept **12 months**, then purged by the existing purge job. CTO default; GC to confirm. |
| D5 | **Operators: Saket only** (his SSO admin). A restricted "invite only" role is deferred. |
| D6 | Covered in D2. The limiter-unlock command for H23 waits until SMS mode is live. |
| Legal | Counsel to confirm the basis for holding a number before in-app consent (the design takes the conservative reading). GC-REVIEW. |

> **Build note (done):** the invite-code length has its own registry value `INVITE_CODE_DIGITS` in `packages/values` and its own `check:registry` rule, as `APP_LOCK_PIN_DIGITS` has, so "8-digit invite code" in this document is a checked claim. The OTP-digits rule excludes lines saying "invite code", and the invite rule excludes lines that also say SMS, OTP or PIN, so a line that states two lengths must not be read as one.

## As built (2026-11-20) and where it differs from the design above

The build followed `INVITE-CODES-GATE.md` section 4. Differences, each deliberate:

- **Audit columns.** `invite_audit` has seven columns: `id, at, action, kind, phone_hmac, phone_masked, ticket`. The gate cut `phone_masked`; it is kept so a human can match a row to a ticket without the key. `consumed` and `refused_kind` are log lines (`invite_consumed`, `invite_refused_kind`), not rows. There is no `operator` column: CloudTrail names who ran the command.
- **Retention (D4).** The trigger refuses UPDATE always, and DELETE unless the transaction set `swafto.invite_audit_purge` AND the row is over 12 months old. `purge-due` does the purge. The gate had deferred this; D4 asked for it. `swafto_app` holds INSERT, SELECT and DELETE on the table and no UPDATE.
- **The `put` clause is built.** The OTP store's upsert never overwrites a live invite (`WHERE expired OR (past cooldown AND kind = 'sms')`), because automatic codes (docs/auth/WHATSAPP-OTP.md) and invites coexist. An expired invite may be replaced.
- **No custom SSM document (D5).** Saket is the only operator. The CLI's strict argument patterns are the injection control. The laptop wrapper `tools/swafto-invite.mjs` runs it through `aws ssm send-command`.
- **`invite_delete` is cut.** Web deletion is paused in invite mode (D3).
- **Fix round (red team and abuse tests):** clearing a code is a compare-and-delete on the hash that was compared, so a re-issue landing mid-verify is neither signed in by the old code nor burned by it (RTI-1/2); the ticket is a support reference (`T-12`), never free text (RTI-3); web deletion confirm is paused in invite mode as well (RTI-4); `invite_burned` is logged (RTI-5); `NODE_ENV` is exactly `production`, `development` or `test` (RTI-6); a code that is not all digits is a 400 before any attempt is taken, so a pasted `4821 0937` cannot burn an invite (F-1); schema errors answer `{error:"invalid_input"}` with no framework text (F-2).
- **Residual, unchanged:** the code is plaintext in the SSM command output (T7), and a recovery code over WhatsApp can be forwarded (D2).

## The demo login (CTO addition, 2026-11-20)

`DEMO_LOGIN_PHONE` (inside the reserved `+91 99999 0xxxx` range) and `DEMO_LOGIN_CODE_HASH` give the founder, and the Google Play reviewer, an account before any message channel works. The hash is the keyed `hashOtp` of a fixed code of 8 to 10 digits; the code is in neither config nor repo. It works in either `AUTH_MODE`, never sends, and its request reply is the one every other number gets. Verify takes the per-IP rule and a demo ticket (5 attempts an hour, then a one-hour lockout, answered with the ordinary 401) before a constant-time compare. Number change and the app-lock PIN reset are refused for it; erase stays allowed. It logs one `demo login` warn line per sign-in with the masked number.

**Residual risk.** Anyone who holds the code holds the demo shop, so it must hold synthetic data only and the code must be rotated after a review. The number is in the test range, but `+91 99999 0xxxx` could in theory be a real subscriber's number: nothing is ever sent to it by this system, and a real holder gains nothing without the code. Rotating `SESSION_SIGNING_KEY` invalidates the hash.
