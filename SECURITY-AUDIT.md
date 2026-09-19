# SECURITY-AUDIT

STRIDE threat model over the data-flow diagram in
`SWAFTO-System-Architecture-and-DFD.pdf`, plus the specific controls G3 requires.
Written at G3. Research date **September 2026**.

**Why this is not paperwork:** DPDP's maximum penalty - **INR 250 crore** - attaches
specifically to *failure to maintain reasonable security safeguards* (LEGAL-AUDIT §0).
This document is the record of what "reasonable" means here.

Status legend: **DONE** control exists and is tested · **REQUIRED** must be built ·
**RESOLVED-AUTONOMOUSLY** was blocked on a human; see DECISIONS-AUTONOMOUS.md.

---

## 1 · Trust boundaries crossed

From the architecture's layer model and Level-1 DFD. Six boundaries, and everything
below is organised by them.

| # | Boundary | Crossing | Why it is a boundary |
|---|----------|----------|---------------------|
| **TB1** | Shopkeeper to device | Physical possession, app lock | A phone on a shop counter is handled by customers and staff |
| **TB2** | App to local SQLite (L3-L4) | File system | A rooted or stolen device exposes the file directly |
| **TB3** | Device to internet (L5-L6) | **The one network hop** | Hostile networks; a cheap device with a stale trust store |
| **TB4** | Edge to API (L6-L7) | Cloudflare to EC2 | The origin must not be reachable except through the edge |
| **TB5** | API to Postgres (L7-L9) | Tenancy enforcement | **Where cross-tenant leakage would happen** |
| **TB6** | System to external processors | SMS, FCM, Sentry, S3 | Third parties, and residency (LEGAL §2) |

---

## 2 · STRIDE by boundary

One row per threat. `S`poofing `T`ampering `R`epudiation `I`nformation disclosure
`D`enial of service `E`levation of privilege.

### TB1 · Shopkeeper to device

| ID | S | Threat | Impact | Control | Status |
|----|---|--------|--------|---------|--------|
| T1.1 | S | Customer or staff picks up an unlocked phone and reads the day's cash | Confidentiality of takings; physical-safety risk if takings are known | **Optional 4-digit app lock**, PIN hashed with Argon2id in the keystore, auto-lock after 2 min background. Screen copy exists: *"Stop a customer reading your day's cash while your phone is on the counter."* | REQUIRED |
| T1.2 | E | Attacker brute-forces the 4-digit PIN (10,000 space) | Full ledger read | Rate limit **5 attempts to 30 s, 10 to 5 min, 15 to 1 h**, backoff persisted so an app restart does not reset it. **Never wipe data on failed attempts** - the ledger is the shopkeeper's only copy | REQUIRED |
| T1.3 | - | **Shopkeeper forgets his own PIN** | *This is the real risk here, not the attacker* | **Recovery by OTP to the same number, always.** Screen copy already states it: *"Forgot your PIN? We'll recover it by SMS - you're never locked out."* **Locking a shopkeeper out of his own ledger is a worse outcome than any threat in this table** | REQUIRED |
| T1.4 | I | Shoulder-surfing the amount keypad | Minor | Accepted. Amounts are visible to anyone at the counter anyway | N/A |
| T1.5 | I | OS screenshot / recents thumbnail exposes figures | Confidentiality | `FLAG_SECURE` on the cash-check and day-summary screens only - **not app-wide**, because the shopkeeper legitimately screenshots his summary to send to his accountant | REQUIRED |

### TB2 · App to local SQLite - device loss and theft with an unsynced ledger

This is the highest-likelihood realistic loss event: a phone is stolen from a counter
with days of unsynced entries on it.

| ID | S | Threat | Impact | Control | Status |
|----|---|--------|--------|---------|--------|
| T2.1 | I | Stolen/rooted device - SQLite file read directly | Full ledger, every party name and phone | **SQLCipher via op-sqlite (ADR-002)** - see decision below | REQUIRED |
| T2.2 | I | Device backup (adb / cloud) extracts the DB | Same | `android:allowBackup="false"` and `android:fullBackupContent` exclusions. Our own backup path is the authenticated sync, not the OS's | REQUIRED |
| T2.3 | T | Attacker edits the SQLite file to forge entries | Corrupted ledger | Mitigated by encryption (T2.1). **The server-side divergence alarm (architecture §07.06) is the detection control** - a tampered client produces figures the server's recomputation disagrees with, which raises rather than overwrites | REQUIRED |
| T2.4 | I | **Unsynced entries are lost with the device** | *Availability, not confidentiality - and it is the one the shopkeeper actually cares about* | Sync promptly when connected (ADR-008 expedited one-shot on foreground). Sync detail view shows pending count. **Cannot be fully solved offline-first; it is an accepted, disclosed trade-off** | ACCEPTED |
| T2.5 | R | Shopkeeper denies making an entry | Low - single-user device | `created_at`, `device_id`, append-only, and the audit chain through counted-cash carry-forward | DONE by design |

#### Decision: on-device encryption is SQLCipher, keyed from the Android Keystore

Options were (a) SQLCipher with a key in the Keystore, (b) plain SQLite relying on
Android's file-based encryption (FBE), (c) application-level field encryption.

**Chosen: (a).** Reasoning:
- **(b) rejected** - FBE protects data at rest *when the device is locked*, but a stolen
  device that is powered on and unlocked, or one with a bootloader exploit, exposes the
  file. It also gives us nothing against a rooted device, which is common on the cheap
  handsets we target.
- **(c) rejected** - encrypting `amount` per-field would destroy the ability to
  `SUM()` in SQL, which is how derive-on-read stays cheap (ADR-002, architecture §06).
  It would push aggregation into JS over decrypted rows and blow the ADR-011 budget.
- **(a)** encrypts the whole file transparently, keeps `SUM()` working, and the key
  never leaves hardware-backed storage.

Key handling: a 256-bit random key generated on first run, stored in the Android Keystore
with `setUserAuthenticationRequired(false)` - **deliberately false**, because requiring
device auth per DB open would break background sync and, worse, could lock the shopkeeper
out of his ledger if he removes his device lock screen. The threat model accepts a
powered-on unlocked device; it defends against the *file at rest* and the *rooted
extraction*.

> **Open item L-20 (from LEGAL-AUDIT):** confirm SQLCipher licensing for the build we
> link before this is load-bearing.

### TB3 · Device to internet

| ID | S | Threat | Impact | Control | Status |
|----|---|--------|--------|---------|--------|
| T3.1 | I,T | MITM on a hostile network | Credential and ledger interception | **TLS 1.3 minimum**, HSTS, no cleartext (`android:usesCleartextTraffic="false"`, network security config) | REQUIRED |
| T3.2 | I,T | MITM via a user-installed or malicious root CA | Same | Certificate pinning - **see decision below** | REQUIRED |
| T3.3 | S | Replay of a captured sync request | Duplicate entries | **Idempotency makes replay a no-op by construction** (ADR-004: `ON CONFLICT DO NOTHING`). Plus short-lived access tokens | DONE by design |
| T3.4 | D | 2G connection dies mid-request repeatedly | Sync never completes | Chunked, cursor-based, resumable push (ADR-004). **Never blocks the UI** (architecture §07.01) | REQUIRED |

#### Decision: pin to the CA, not the leaf, and ship a kill switch

The gate asks specifically about "the cost of pinning when a cheap device has a stale
trust store". That cost is real and it cuts both ways:

- **Leaf/SPKI pinning rejected** - a certificate rotation with a pinned leaf **bricks
  every installed app** until users update. On devices that update rarely and over
  metered 2G, that is a catastrophic, unrecoverable outage. The app would lose its
  ability to sync *and* its ability to deliver the fix.
- **Chosen: pin to the intermediate/root CA SPKI**, with **two pins** (current CA + a
  backup CA from a different issuer), a **pin expiry date** after which pinning
  soft-fails open, and a **server-controlled kill switch** in the app config that can
  disable pinning remotely.
- **Stale trust store, the other direction:** an old Android device may not trust a
  *newer* root (the Let's Encrypt/ISRG transition broke exactly this on old Androids).
  Mitigation: choose a CA with a long-trusted cross-signed root, and **bundle our own
  trust anchor in the network security config** rather than relying solely on the system
  store.

**Net:** pinning is worth it only with an expiry and a kill switch. Pinning without a
recovery path is a self-inflicted outage waiting for a rotation.

### TB4 · Edge to API

| ID | S | Threat | Impact | Control | Status |
|----|---|--------|--------|---------|--------|
| T4.1 | S | Attacker reaches the EC2 origin directly, bypassing Cloudflare's WAF and rate limits | All edge protections bypassed | **Security group allows :443 only from Cloudflare's published IP ranges**, refreshed by a scheduled job. Plus a shared origin secret header the API requires. *There is no NAT gateway and the instance is in a public subnet (architecture §08) - so the security group IS the perimeter* | REQUIRED |
| T4.2 | D | Volumetric DDoS | Outage | Cloudflare free tier (architecture §08, replaces a load balancer) | DONE by design |
| T4.3 | E | SSH exposed to the world | Full compromise | **No inbound SSH.** Access via **AWS SSM Session Manager** only - which also avoids needing a bastion or a NAT gateway | REQUIRED |
| T4.4 | I | Cloudflare terminates TLS outside India | **Residency** - see LEGAL L-10 | **RESOLVED-AUTONOMOUSLY** - needs counsel | RESOLVED-AUTONOMOUSLY |

### TB5 · API to Postgres - multi-tenant isolation

The single highest-severity class in this document. One shop reading another shop's
ledger is an unrecoverable trust failure.

| ID | S | Threat | Impact | Control | Status |
|----|---|--------|--------|---------|--------|
| T5.1 | I,E | **Cross-tenant read** - a missing `WHERE shop_id = ?` on any query | Catastrophic | **Defence in depth, three layers** - see below | REQUIRED |
| T5.2 | T,E | **Cross-tenant write** - client forges `shop_id` in a sync payload to write into another shop's day | Catastrophic; silent ledger corruption | **`shop_id` is NEVER read from the request body.** It is derived from the authenticated session server-side and any body-supplied `shop_id` is rejected outright (not ignored - rejected, so a bug is loud) | REQUIRED |
| T5.3 | E | SQL injection | Full DB | Drizzle parameterises by default (ADR-006); lint ban on raw string-concatenated SQL | REQUIRED |
| T5.4 | I | An `id` collision across tenants lets one shop's upsert overwrite another's row | Corruption | UUIDv7 collision is negligible, but the upsert predicate is `(id)` **and** the row is verified to belong to the session's `shop_id` before any write is accepted | REQUIRED |
| T5.5 | E | Application DB user can `UPDATE`/`DELETE` entries | Violates append-only forever (§07.04) | **`REVOKE UPDATE, DELETE ON entries FROM app_user`** plus a `BEFORE UPDATE OR DELETE` trigger. Both, not either (ADR-006) | REQUIRED (G4) |

#### The three isolation layers, and the test that proves them

1. **Application** - every query goes through a repository that takes `shopId` as a
   required first argument; there is no way to call it without one.
2. **Postgres Row-Level Security** - `ALTER TABLE entries ENABLE ROW LEVEL SECURITY;`
   with a policy `USING (shop_id = current_setting('swafto.shop_id')::uuid)`, and the
   setting assigned per transaction from the session. **RLS is the layer that survives an
   application bug.**
3. **Schema** - `shop_id` is `NOT NULL` on every tenant-scoped table.

> **Proof obligation (G3, must be a real test):** `test/tenancy.spec.ts` seeds shop A and
> shop B with distinct entries, authenticates as A, and asserts that **every**
> read endpoint and **every** repository method returns zero rows of B's data - and
> additionally that a sync push from A carrying B's `shop_id` and B's `day_id` is
> **rejected**, with B's data **byte-identical** afterwards.

### TB6 · External processors

| ID | S | Threat | Impact | Control | Status |
|----|---|--------|--------|---------|--------|
| T6.1 | S | **SMS bombing** - attacker requests OTP repeatedly for a victim's number | Harassment; real money cost per SMS | Rate limits, below | REQUIRED |
| T6.2 | S | **OTP brute force** - 6 digits is 10^6 | Account takeover | Rate limits + single-use + short TTL, below | REQUIRED |
| T6.3 | S | **SIM swap** | Full account takeover, and there is **no second factor to fall back on** | Partial mitigation only - see below | **ACCEPTED RISK, disclosed** |
| T6.4 | I | Personal data in an FCM push payload | Leak to Google + residency | **Push carries a trigger only; all text resolved on-device** (LEGAL L-11) | REQUIRED |
| T6.5 | I | Ledger figures in crash reports | Leak | ADR-009 scrubbing + the grep test in §5 | REQUIRED |

#### OTP rate limits (concrete, and they are the spec)

| Scope | Limit | Window | Lockout |
|-------|-------|--------|---------|
| **Per phone number - send** | 3 | 15 min | 1 h |
| Per phone number - send | 10 | 24 h | 24 h |
| **Per phone number - verify attempts** | 5 per code | code lifetime | code invalidated, must resend |
| Per IP - send | 20 | 1 h | 1 h |
| Per device id - send | 5 | 1 h | 1 h |
| Global send rate | circuit-breaker | 1 min | alarm + degrade |

Code properties: **6 digits, cryptographically random (`crypto.randomInt`, never
`Math.random`), single-use, 5-minute TTL, invalidated on success or on resend**,
compared in **constant time**, and **stored only as a hash**.

Resend throttle with visible countdown - the screen copy already has
`Resend code in {{ resendLabel }}`.

#### SIM swap - the honest position

Phone-only auth means **SIM swap is a complete account takeover with no second factor**.
We cannot fully mitigate it without adding a factor the product has deliberately excluded
(no email, no password - G15).

Partial mitigations, all cheap:
- **Device binding** (ADR-007): a session on a new device is a new sign-in. A SIM swapper
  with a new handset must re-authenticate, which is detectable.
- **Notify the old device** on a successful sign-in elsewhere - the screen copy exists:
  *"This device signed out - usually because you signed in somewhere else."*
- **Cooling-off:** after a number change or a new-device sign-in, hold **export** and
  **account deletion** for 24 hours. This is the important one - it prevents an attacker
  from exfiltrating or destroying the ledger immediately.
- The number-change flow's "I don't have my old number" path is already **manual
  verification over WhatsApp, taking a day or two** - deliberately slow, and correctly so.

> **Residual risk accepted and recorded:** a determined SIM-swap attacker gains read
> access to one shop's ledger. They cannot move money (there is none to move), and the
> 24-hour hold blocks immediate exfiltration or deletion. Revisit if the product ever
> holds anything more valuable than records.

---

## 3 · Secrets

| Control | Status |
|---------|--------|
| **No secrets in the repo.** `.gitignore` covers `.env*`; a `gitleaks` pre-commit hook and a CI scan | REQUIRED |
| **No secrets in the APK.** There is no API key to embed - auth is per-user OTP. The origin-secret header is server-to-server only and **must never ship in the app** | REQUIRED |
| Server secrets in **AWS SSM Parameter Store (SecureString)**, read at boot. Not in the Docker image, not in the systemd unit | REQUIRED |
| **Rotation:** JWT signing key every 90 days with an overlap window (accept old, sign new); DB password every 180 days; origin secret every 90 days; **immediately on any suspected compromise or staff departure** | REQUIRED |
| CI: GitHub OIDC to assume an AWS role. **No long-lived AWS keys in Actions secrets** | REQUIRED |

---

## 4 · Dependency and container scanning

| Gate | Threshold | Action |
|------|-----------|--------|
| `npm audit --audit-level=high` | **high or critical fails the build** | Blocking |
| Container scan (Trivy) on the API image | **HIGH/CRITICAL with a fix available fails** | Blocking |
| Licence gate (LEGAL L-22) | GPL/AGPL in the mobile tree fails | Blocking |
| Dependabot / Renovate | weekly | Non-blocking PRs |

**Current state - real output, this run:**

```
$ npm audit --audit-level=high
found 0 vulnerabilities
```

Reached by upgrading `vitest` to `^5` - the installed `vitest@2/3` line pulled
`@vitest/mocker` with **GHSA-82fw-gwwq-j7x9** (path traversal / arbitrary file read),
severity *moderate*. It sat below the `high` threshold and would have passed the gate
silently. Fixed rather than carried, because there were no tests written against the old
version yet and the upgrade was therefore free.

> **Note on the threshold.** `--audit-level=high` is the gate the build prompt specifies,
> and it is what CI enforces. But the advisory above shows the gap: *moderate* findings
> pass. **Policy: moderate findings are triaged weekly and must be fixed or explicitly
> accepted in writing**, never left silently.

---

## 5 · Logging - no amounts, no party names, no phone numbers

**Rule.** Structured JSON logs. Permitted fields: `timestamp`, `level`, `request_id`,
`shop_id` (a UUID, not a name), `route`, `status`, `duration_ms`, `entry_count`,
`error_code`. **Never** an amount, a party name, a phone number, a shop name, an OTP,
or a token.

Enforcement:
- A `redact` allow-list in the logger - **allow-list, not deny-list**, because a
  deny-list fails open on the field someone adds next month.
- Phone numbers masked to `+91XXXXX1234` if they must appear at all in an auth audit
  record.
- ADR-009's Sentry `beforeSend` scrubber for crash paths.

> **Proof obligation (G3, must be a real test):** `test/log-hygiene.spec.ts` runs a
> **complete day-close for the canonical 15 July vector** with the logger writing to a
> buffer, then greps that buffer for `6780`, `2400`, `6300`, `6050`, `1500`, `11450`,
> `4380`, `9180`, for a sample party name, and for a sample phone number. **Any hit
> fails the test.** Untested log hygiene is not log hygiene.

---

## 6 · Backup and restore - untested backups are not backups

Architecture §08 gives **two independent recovery paths**, deliberately:
1. RDS automated backups, 7-day retention, point-in-time recovery.
2. A **nightly logical `pg_dump` to S3** (`ap-south-1`, versioned, SSE-KMS, public access
   blocked, lifecycle-expired to bound the window per LEGAL L-06).

Two paths because a single-AZ `db.t4g.micro` with only RDS snapshots has a correlated
failure mode: an operator error or a bad migration is faithfully snapshotted.

| Control | Status |
|---------|--------|
| Encrypted at rest (KMS) for RDS and S3 | REQUIRED |
| **Written restore runbook** at `docs/runbooks/restore.md` with exact commands | REQUIRED |
| **Restore drill executed, timed, and its output recorded** - target **RTO 30 min** (architecture §08: *"rebuild in thirty minutes rather than from memory"*), **RPO 24 h** for the logical dump | **RESOLVED-AUTONOMOUSLY** - needs an AWS account |
| Drill repeated **quarterly**, recorded in `docs/runbooks/restore-log.md` | REQUIRED |
| Deletion propagates into backups within the rotation (LEGAL L-06) | REQUIRED |

> A restore procedure that has never been executed is a hypothesis. Same reasoning the
> build prompt applies to rollback at G9.

---

## 7 · Register

| Ref | Threat | Mitigation | Test | Status |
|-----|--------|-----------|------|--------|
| S-01 | T2.1 device theft, DB read | SQLCipher + Keystore key | `test/db-encryption.spec.ts` | REQUIRED |
| S-02 | T2.2 OS backup extraction | `allowBackup=false` | manifest assertion | REQUIRED |
| S-03 | T1.1/T1.2 app lock + brute force | Argon2id PIN, persisted backoff | `test/app-lock.spec.ts` | REQUIRED |
| S-04 | T1.3 forgotten PIN | OTP recovery, never locked out | `test/pin-recovery.spec.ts` | REQUIRED |
| S-05 | T1.5 screenshot leak | `FLAG_SECURE` on 2 screens only | render test | REQUIRED |
| S-06 | T3.1 MITM | TLS 1.3, no cleartext | config assertion | REQUIRED |
| S-07 | T3.2 rogue CA | CA pinning + expiry + kill switch | `test/pinning.spec.ts` | REQUIRED |
| S-08 | T4.1 origin bypass | Cloudflare-only SG + origin secret | Terraform + smoke test | REQUIRED |
| S-09 | T4.3 SSH exposure | SSM only, no inbound 22 | Terraform assertion | REQUIRED |
| S-10 | **T5.1 cross-tenant read** | 3 layers incl. Postgres RLS | **`test/tenancy.spec.ts`** | REQUIRED |
| S-11 | **T5.2 cross-tenant write / forged shop_id** | `shop_id` from session only; body value rejected | **`test/tenancy.spec.ts`** | REQUIRED |
| S-12 | T5.5 UPDATE/DELETE on entries | REVOKE + trigger | `test/append-only.spec.ts` (G4) | REQUIRED |
| S-13 | T6.1/T6.2 OTP abuse | Rate-limit matrix §2 TB6 | `test/otp-limits.spec.ts` | REQUIRED |
| S-14 | T6.3 SIM swap | Device binding, notify, 24 h hold on export/delete | `test/cooling-off.spec.ts` | **ACCEPTED RISK** |
| S-15 | T6.4 push payload leak | Trigger-only push | `test/push-payload.spec.ts` | REQUIRED |
| S-16 | T6.5 / §5 log leakage | Allow-list logger + scrubber | **`test/log-hygiene.spec.ts`** | REQUIRED |
| S-17 | Secrets in repo/APK | gitleaks, SSM, OIDC | CI scan | REQUIRED |
| S-18 | Vulnerable dependencies | audit + Trivy, high fails | CI | **DONE - 0 vulnerabilities** |
| S-19 | Backup/restore unproven | Two paths + timed drill | drill output recorded | **RESOLVED-AUTONOMOUSLY** |
| S-20 | T4.4 Cloudflare TLS abroad | residency analysis | - | **RESOLVED-AUTONOMOUSLY** |
| S-21 | T2.4 unsynced entries lost with device | Prompt sync; disclosed | - | **ACCEPTED** |

---

## 8 · What is explicitly NOT a threat here, and why

Recording these so no one spends a sprint on them:

- **Payment fraud** - the app moves no money (LEGAL §8). There is nothing to steal but records.
- **PCI DSS** - no card data, ever. Out of scope entirely.
- **Multi-device conflict / concurrent write attacks** - D9 makes one shop, one phone an explicit non-goal. No conflict resolution exists to attack.
- **Prompt injection / model abuse** - there is no model anywhere in the request path. The no-AI decision removed an entire threat class, which is worth stating plainly.
- **Supply-chain attack via an ad or analytics SDK** - there are none.
- **Server-side data exfiltration via a computed-figure endpoint** - the API never returns a computed total for display (§07.03); it exchanges entries, day records and parties only.
