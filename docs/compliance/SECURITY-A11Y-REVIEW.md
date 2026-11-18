# Security, accessibility and commit review

Agent 5 (Compliance / QA), 2026-10-25, tree `main` at `79ff3d6`. Everything here was read from
the code or produced by a command whose output is quoted. Severity: **P0** stops use or
loses money or data now · **P1** release-blocking · **P2** must fix before wide rollout · **P3** hygiene.
Defect ids (F-n) refer to `docs/handover/DEFECTS.md`.

Commands run in this worktree on 2026-10-25, with their measured results:
- `npx vitest run`: 57 files, 2030 tests passed, exit 0.
- `npx tsc --noEmit -p tsconfig.json`: exit 0.
- `npm run check:secrets`: "files scanned : 404", "rules applied : 9", "allowlisted hits : 3", repo half "0 secret(s)", and the APK half reports BLOCKED because no APK is in the tree.
- `npm run check:all` on a fresh checkout failed at `check:generated` with no content drift; see F-35.

---

## 1. Independent review of `cacd461` "The day survives a restart"

The commit replaces `memoryPort` with `sqlitePort` (`apps/mobile/src/store/sqlite.ts`, wired at
`apps/mobile/src/platform/Root.tsx:75`). What holds up:
- **Atomicity.** Each port write is one transaction (`sqlite.ts:41-50`): an entry and its outbox row
  commit together or roll back together. `appendAtomically` is proved by `apps/mobile/test/sqlite-port.spec.ts:97-110`.
- **Write order.** The port is written before memory changes (`store/index.ts:336-337`, `:441-442`), so a
  failed write leaves no phantom state.
- **Carried balances.** They are derived through P7/P8 from earlier entries (`sqlite.ts:113-123`), never stored.
  That is correct against `packages/formula-engine/src/primary.ts:214-248`.
- **The day split.** The `put day` and `appendAtomically` calls in `Store.append` are two transactions, but a crash between them
  only leaves a day row queued, which is harmless.
- **Migration of existing installs.** Nothing to migrate: before this commit nothing persisted at all.
  An upgraded install starts at X0 with an empty book, exactly as it did after every restart before.

What does not hold up. Reproduced with a scratch script that drives the real `Store` and
`sqlitePort` over `node:sqlite`, the same harness as `sqlite-port.spec.ts`, with no source file
touched. Output verbatim:

```
R1 snapshot acked: ["ob-day-2026-01-02","ob-e1"] | pending after ack: [] | closed day row still queued? false
R2 next-morning append, same process: DayClosedViolation | store day: 2026-01-02 closed
R2 after restart: 2026-01-03 open
R3 clock corrected to 2026-01-03, store day: 2027-03-01 closed
R3 append: DayClosedViolation
R4 a week later, open day: 2026-01-02 open
```

| Defect | Sev | What the run shows | Root cause |
|---|---|---|---|
| **F-18** The close of a day never reaches the server if it happens during a push | P1 | R1. `Host.sync` snapshots the queue (`host.tsx:189`), awaits `client.push` (`:193`), then acks the snapshot's ids (`:200`). The day row has a stable id `ob-day-<date>` (`store/index.ts:219`) and `put day` *replaces* it (`sqlite.ts:80-82`; `memoryPort` the same at `store/index.ts:141`). A close, skip or opening figure written while the push is in flight is deleted by the ack of the older version | Ack by id alone, on a row kind that is overwritten in place. Fix where all callers route through it: ack only if the stored row still equals what was sent (compare `queuedAt`, or carry a version), in the port's `ackOutbox` |
| **F-19** A closed day stays the day until the process dies | P1 | R2. Rollover happens only in `load()` (`sqlite.ts:106-111`), and `load()` is called once, in the `Store` constructor (`store/index.ts:193`). Entries are dated `store.state.day.date` (`app/session.tsx:474`). After a close, every entry the next morning is refused with `DayClosedViolation`. The banner then says "Nothing was recorded. Check and try again." (`refusal.other`, `app/App.tsx:547-550`), and retrying never helps. Android often keeps a shop phone's process alive overnight | Rollover belongs in the store, not only in the port's load |
| **F-20** A day dated in the future pins the book | P2 | R3. `load()` takes the latest day by `date DESC` (`sqlite.ts:98`) and rolls only when `latest.date < today` (`:109`). One close under a wrong device clock, common on budget handsets, freezes the app on that day until the calendar catches up | No guard on a day dated after "today" |
| **F-21** An open day never ends | P2 | R4. Decision 1 (2026-10-22) makes the business day retailer-defined, with a start and an end time. Only "do not roll at midnight" is implemented, so an unclosed day absorbs a week of entries into one day | Decision 1 is only half implemented, and the `day_id` migration it calls for has not started |
| F-34 Refusal banner | P3 | A closed-day refusal maps to the generic hint (`App.tsx:547-550` lists only `amount` and `partyId`). The banner is absolutely positioned over the top of the screen (`App.tsx:566-569`), so it covers the app bar until dismissed | Missing hint keys |
| F-37 No schema version | P3 | `sqlite.ts:29-35` has `CREATE TABLE IF NOT EXISTS` and no `user_version` or migration table, so the first schema change has no upgrade path for installed books | |

The commit message's "Device-verified … two force-stops" is consistent with R2's restart line.
Force-stop is the one path that does roll over, so the device check could not have seen F-19.

## 2. Security review

| ID | Sev | Area | Evidence | Finding | Proportionate response |
|---|---|---|---|---|---|
| SEC-1 (F-24) | P1 | OTP send | `apps/api/src/auth/routes.ts:114-117` consumes only `sendPerPhoneBurst` and `sendPerPhoneDaily`. `sendPerIp` and `sendPerDevice` (`apps/api/src/rate-limit/limits.ts:132-145`; values `packages/values/src/index.ts:79-80`) have **no consumer** (`grep -rn "sendPerIp\|sendPerDevice" apps/api/src` finds only `limits.ts`) | OTPs go to unknown numbers by design, so any list of numbers can be pumped at 10 per number per day at SWAFTO's cost. Latent only because `server.ts:82` wires `StubSmsPort` | Enforce both limits plus a global send breaker before H1 goes live. The registry check compares numbers, not call sites, which is why this survived |
| SEC-2 (F-22) | P1 | Erasure | `App.tsx:516-530` (S8 has no confirm handler); `client.ts:487` `erase` has no caller; no local wipe exists | No in-app deletion of account or local ledger. This is also a Play requirement (GP-4) | Wire S8 to `erase` and to a port method that empties the local database |
| SEC-3 (F-17) | P1 | Auth | No A-screens; `Root.tsx:191` says `requestOtp`/`verify` "sit in the client with no caller" | The app runs unauthenticated, so sync, export, consent withdrawal and erasure cannot succeed | A-series |
| SEC-4 (F-26) | P2 | Data at rest | `sqlite.ts` stores days, entries, **parties (third-party names and phones)** and the outbox as JSON in plaintext. `Root.tsx:75` opens `swafto-ledger.db` with no key. op-sqlite 18.2.5 supports SQLCipher as a build target (its README:20) | Protected by the app sandbox and, where present, platform storage encryption; whether every minSdk 24 target handset has storage encryption was **not verified**. The realistic threats are a rooted or ADB-debuggable phone, and a customer reading an unlocked phone on the counter (app lock is not built). `storage.tsx`'s note calls an on-device key "obfuscation". That understates an Android Keystore key, which is not extractable, though it is right that a key does not stop an attacker who can run the app | Record a decision: SQLCipher with a Keystore-wrapped key (the SECURITY-AUDIT requirement), or a written risk acceptance plus app lock. Do not ship third-party PII in plaintext on an unstated basis |
| SEC-5 (F-25) | P2 | Backup | `AndroidManifest.xml:10` has `allowBackup="false"` and no `dataExtractionRules` (AN-1) | Device-to-device transfer of the plaintext ledger on some OEMs | Add `dataExtractionRules` with a `<device-transfer>` decision, made consciously: it is also the only continuity path until sync works |
| SEC-6 (F-31) | P2 | OTP store | `apps/api/src/server.ts:89` `memoryOtpStore()` | Per-process, so codes fail across instances and a restart clears attempt counters. `verifyPerCode` (5 per code per OTP TTL, `values/src/index.ts:81`) is in the Postgres limiter, which bounds guessing | Postgres-backed OTP store |
| SEC-7 (F-32) | P2 | SIM swap | `grep -ri cooling apps/api/src` finds nothing | The specified 24-hour hold on export and erase after a new-device sign-in (S-14) is not built. Phone OTP is the only factor | Build the hold before export ships |
| SEC-8 (F-33) | P2 | Audit trail | `apps/api/src/app.ts:124` `level: process.env.LOG_LEVEL ?? 'warn'` | No record of who read a shop's ledger | Id-only access log (Rule 6 from 13 May 2027) |
| SEC-9 (F-39) | P2 | Endpoint | `apps/mobile/src/platform/endpoint.ts:37` `http://192.168.1.35:8787` | A LAN address in the client. A release build refuses cleartext (AN-2), so it fails loudly | Per-variant endpoint before any release build |
| SEC-10 (F-36) | P3 | Tokens | `auth/routes.ts:36-37` access 24 h, refresh 180 days; refresh mints a new access token only (`:334`), so the refresh token is not rotated | A stolen refresh token lives 180 days unless the device is revoked; revocation is checked on refresh (`:323-326`) | Rotate on refresh with reuse detection |
| SEC-11 (F-38) | P3 | Session | `apps/mobile/src/platform/storage.tsx:191-211` in-memory secure storage | Once sign-in exists, every restart signs the shopkeeper out. Not a confidentiality risk | op-sqlite or mmkv v2, as the file lists |
| Clean | n/a | Tenancy | `shopOf()` and `claims.shop` are the only shop sources: 17 references in `apps/api/src`; `grep` for `body.shopId`, `query.shopId`, `params.shopId` and shop headers finds only a comment (`app.ts:233`) | S-11 holds | n/a |
| Clean | n/a | Manifest | `AndroidManifest.xml`: one permission (`INTERNET`); one exported component, the launcher `MainActivity` (`:20`), which must be exported; release cleartext off (AN-2) | No exported attack surface beyond the launcher | n/a |
| Clean | n/a | Client logs | `apps/mobile/src/net/client.ts` has no `console.` call; `check:client-logs` enforces this | Tokens are not logged | n/a |
| Clean | n/a | Secrets | `npm run check:secrets` (output above) | No secret in the repository. The APK is unscanned | Scan the APK when H14's build exists |

## 3. Accessibility checklist (WCAG 2.2 AA by adoption via WCAG2ICT, plus Android guidance)

WCAG 2.2 is written for web content. It applies to a native app by adoption, not by its own
terms, and no Indian statute currently imports it for this app (RPwD status unverified; see the
prior report). Source: https://www.w3.org/TR/WCAG22/, accessed 2026-10-25.

### 3.1 Colour ratios, computed

Method. WCAG 2.2 relative luminance:
- each sRGB channel c is first scaled to 0-1 (c / 255);
- it is linearised as c/12.92 when c ≤ 0.04045, otherwise ((c+0.055)/1.055)^2.4;
- L = 0.2126 R + 0.7152 G + 0.0722 B;
- the ratio is (L1+0.05)/(L2+0.05), with L1 the lighter colour.

Hex values come from `apps/mobile/src/theme/tokens.ts:52-95`. The script was calibrated against
the two ratios the repository already records, and both match:
- white on `#F5A524` = 2.04 (`tokens.ts:39`);
- `#5E6B7D` on `#171F2E` = 3.05 (reference `tokens.css`).

Text needs a ratio of at least 4.5 (SC 1.4.3). UI boundaries and state indicators need at least
3 (SC 1.4.11). Ratios below are "to 1".

| Mode | Foreground on background | L fg / L bg | Ratio | Need | Result |
|---|---|---|---|---|---|
| Comfort | ink `#12181F` on bg `#FFF9EF` | 0.0088 / 0.9524 | 17.05 | 4.5 | pass |
| Comfort | ink on surface `#FFFFFF` | 0.0088 / 1.0000 | 17.85 | 4.5 | pass |
| Comfort | inkMuted `#57606A` on bg | 0.1143 / 0.9524 | 6.10 | 4.5 | pass |
| Comfort | inkMuted on surfaceRaised `#FDF4E4` | 0.1143 / 0.9119 | 5.85 | 4.5 | pass |
| Comfort | positive `#0B6B3A` on bg | 0.1089 / 0.9524 | 6.31 | 4.5 | pass |
| Comfort | negative `#C2371F` on bg | 0.1430 / 0.9524 | 5.19 | 4.5 | pass |
| Comfort | negative on surface (refusal title) | 0.1430 / 1.0000 | 5.44 | 4.5 | pass |
| Comfort | onAccent `#12181F` on accent `#F5A524` | 0.0088 / 0.4645 | 8.75 | 4.5 | pass |
| Comfort | onAccent on accentPressed `#DB9317` | 0.0088 / 0.3599 | 6.97 | 4.5 | pass |
| Comfort | onBrand `#FFFFFF` on brand `#13294B` | 1.0000 / 0.0223 | 14.52 | 4.5 | pass |
| Focus | ink `#EAEEF4` on bg `#0E1521` | 0.8517 / 0.0074 | 15.71 | 4.5 | pass |
| Focus | inkMuted `#8E99A8` on surfaceRaised `#1E2839` | 0.3136 / 0.0209 | 5.13 | 4.5 | pass |
| Focus | positive `#4FCB89` on surface `#171F2E` | 0.4618 / 0.0136 | 8.05 | 4.5 | pass |
| Focus | negative `#FF8A72` on surface | 0.4065 / 0.0136 | 7.18 | 4.5 | pass |
| Focus | brandSoft `#8FB0E4` on surface | 0.4249 / 0.0136 | 7.47 | 4.5 | pass |
| Comfort | accent vs bg (marigold control on ground) | | 1.95 | 3 | below |
| Comfort | border `#E3D9C6` vs surface | | 1.40 | 3 | below |
| Comfort | borderStrong `#C9BCA3` vs bg | | 1.79 | 3 | below |
| Focus | border `#283243` vs surface | | 1.28 | 3 | below |
| Focus | borderStrong `#3D4A60` vs bg | | 2.04 | 3 | below |
| Focus | brand `#0E1521` vs bg `#0E1521` (app bar on ground) | | 1.00 | 3 | below |

**Reading.**
- **Text: every token pairing passes in both modes.**
- **Non-text:** the rule bites only where colour alone identifies a control or its state:
  - the X0 consent switch shows its state in text ("On" / "Off", `X0.tsx:176`), so the
    1.95 fill difference is not the only cue, and it passes;
  - marigold buttons carry an 8.75 label, which identifies them;
  - the borders, at 1.28-2.04, must never be the sole boundary of an input or the sole sign of
    selection.

**F-41: the selected segment in Focus (P2).** `Segmented` (`components/Shell.tsx:960-1003`) marks
the selected option with a `brand` fill (`:985`), bold weight (`:993`), `onBrand` text (`:996`)
and `accessibilityState.selected` (`:968`). The tray behind it is `surfaceRaised`.
- In Comfort, the fill against the tray is (0.9119+0.05)/(0.0223+0.05) = 13.30, and the label
  changes colour from ink to white.
- In Focus, the fill `#0E1521` against the tray `#1E2839` is (0.0209+0.05)/(0.0074+0.05) = 1.24,
  and `onBrand` and `ink` are the same colour, `#EAEEF4` (`tokens.ts:84`, `:88`).
- So in Focus the selected segment differs from its neighbours only by a 1.24 fill and by bold
  weight. That falls short of SC 1.4.11 for a state indicator, and it is the control that chooses
  UPI versus cash.

It has not been seen on a device; it is owed to H8.

### 3.2 The rest of the checklist

| Item | Source | Status (evidence) |
|---|---|---|
| Target size, SC 2.5.8 AA (24 by 24 CSS px) and the Android 48 density-independent-pixel recommendation | w3.org/TR/WCAG22; developer.android.com/guide/topics/ui/accessibility/apps | **Exceeded.** `TOUCH_TARGET_MIN_DP = 56` (`packages/values/src/index.ts:161`); the 56dp floor is enforced per screen test by `undersizedTargets()` (`apps/mobile/test/a11y.tsx:60-73`) |
| Resize text, SC 1.4.4 (200 percent) | w3.org/TR/WCAG22 | **Not met (F-30).** `CHROME_FONT_SCALE_CAP = 1.5` (`values/src/index.ts:174`) is applied to every `Text` through `maxFontScale` (`theme/tokens.ts:174`), for example `App.tsx:579`. A user at the system's largest setting gets 150 percent of 17sp. This is a product trade against overflow; it needs a written decision, or the cap lifted for body text with `check:layout` run at scale 2.0 |
| Labels and roles | Android TalkBack | **Partly verified.** X0 switch: role, label and `checked` state (`X0.tsx:143-146`). Segmented: `selected` (`Shell.tsx:968`). Refusal: `accessibilityRole="alert"` with `accessibilityLiveRegion="assertive"` (`App.tsx:562-563`). Only 6 of 28 screen files set `accessibilityLabel` directly; the rest rely on Shell components. Not audited screen by screen; owed to H8 |
| Focus order | SC 2.4.3 | The refusal banner renders after the screen (`App.tsx:558-559`), so it comes last in traversal; the live region announces it. Not device-tested |
| Error identification, SC 3.3.1 | w3.org/TR/WCAG22 | Refusals are now drawn and announced (an improvement in `cacd461`), but every refusal other than amount or party reads "Nothing was recorded. Check and try again." (F-34). After a close that text is wrong guidance (F-19) |
| Back affordance | Android navigation | Hardware back is handled (`Root.tsx:149`); nine screens draw no back control (F-9) |
| Fonts | `check:font` | Odia is bundled and checked. The prior report measured 2 of 128 Devanagari code points (both punctuation) in the bundled faces, and `check-font-coverage.mjs` has no Hindi corpus. Not re-measured here; carried as F-40 |

---

## 4. Release status

**Blocked.** It is not a Release Candidate, not Ready for Controlled Pilot and not Release-Ready.

Each of the following stops release on its own:

1. **F-17 / SEC-3.** No sign-in exists, so nothing syncs, and export, erasure and consent withdrawal cannot succeed.
2. **F-19 (P1).** After any close, the next morning's entries are all refused until the process dies, and the copy tells him to retry.
3. **F-18 (P1).** A close made during a push never reaches the server.
4. **F-22 / GP-4.** No in-app account or local-data deletion: a Play requirement.
5. **F-23 / GP-2.** No privacy-policy link in the app, and the policy and deletion page are unhosted (H5).
6. **F-24 / SEC-1.** SMS-pumping exposure the moment real SMS is wired (H1).
7. **F-10.** A party cannot be created from any screen (`Store.addParty` has no UI caller). The credit book is still sealed for a new shop.
8. **GP-6.** The Financial features declaration is untracked.
9. **F-27.** The policy and DATA-SAFETY state facts that are not yet true (90-day backup rotation, Mumbai region, DLT delivery, TLS 1.3 only).
10. **F-39.** The endpoint is a LAN address; no production origin exists (H2, H4).

**"Ready for Controlled Pilot"** would require items 1-4 and 7 fixed, each with a test that fails
without it. It would also require a device walkthrough across a close followed by a next-day entry
**without** a force-stop. For a pilot run fully offline on the debug build, items 5, 6 and 8-10 can wait.
