# Defect register

Shared by all agents (charter: Agent 5 appends; the Lead adjudicates disagreements here in
writing). Severity:
- **P0** loses data or money, or stops use, now;
- **P1** blocks release;
- **P2** must be fixed before wide rollout;
- **P3** hygiene.

Status vocabulary: CONFIRMED-FIXED (fix verified in the current code, with file:line), OPEN
(defect verified still present), REPORTED (stated, not re-verified by the writer), UNRESOLVED
(needs an owner's decision).

Owners:
- Agent 1: design, tokens, T1/T2/T3/T5/T6.
- Agent 2: parties, T7-T14, P1-P3.
- Agent 3: auth, A-screens, Android.
- Agent 4: API and sync.
- Lead: session, App, host, Root, store.

Unassigned S-screens go to the Lead to assign.

## Verification pass: Agent 5, 2026-10-25, tree `79ff3d6`

The verification evidence is in this file and in `docs/compliance/SECURITY-A11Y-REVIEW.md`.
Defects F-18 to F-21 were reproduced by a scratch script that drives the real `Store` and
`sqlitePort` over `node:sqlite`; its output is quoted in that review, §1. A cell reading
"not re-verified" is honest: I did not repeat a device check.

| ID | Sev | Area | Evidence | Repro | Expected | Actual | Owner | Status |
|---|---|---|---|---|---|---|---|---|
| F-1 | P0 | Entry forms | `apps/mobile/src/app/App.tsx:247-248` passes `selectedCommit` / `onSelectCommit` | Pick UPI on T7 and save | UPI sale recorded | Fixed in code; device verification is the Lead's (not repeated) | Lead | CONFIRMED-FIXED |
| F-2 | P0 | Routing | `apps/mobile/src/screens/entryRoutes.ts:57` `t8.pay` → `section: 'party_payment'` | Tap Pay | Supplier payment | Fixed in code | Lead | CONFIRMED-FIXED |
| F-3 | P1 | Purchase | `entryRoutes.ts:83` `section: 'purchase'` | Tap Purchase | Purchase, not expense | Fixed in code | Lead | CONFIRMED-FIXED |
| F-4 | P1 | T12 reason | `grep -rl TextInput apps/mobile/src` lists only `screens/X1.tsx` | Open T12 | Typed reasons only | No free text on T12 | Agent 2 | CONFIRMED-FIXED |
| F-5 | P1 | Party commit | `app/session.tsx:470-478` reads `entryPartyId` from session state | Credit sale with a picked party | Entry carries the party | Fixed in code | Lead | CONFIRMED-FIXED |
| F-6 | P0 | Persistence | Ledger: `platform/Root.tsx:75` `sqlitePort(open(...))`, tested by `apps/mobile/test/sqlite-port.spec.ts:41-111`. Tokens: `platform/storage.tsx:191-211` still in memory | Kill and relaunch | Day, entries and session survive | The ledger survives; the session does not (moot until F-17) | Lead (ledger), Agent 3 (tokens) | CONFIRMED-FIXED for the ledger; OPEN for tokens |
| F-7 | P1 | Skip on closed day | `app/session.tsx:825-833` catches into `lastRefusal`, drawn by `App.tsx:559-592` | Close, open T5, tap skip | Refusal shown, no crash | Refusal shown | Lead | CONFIRMED-FIXED |
| F-8 | P1 | DPDP withdrawal | `Root.tsx:180-216` passes no `onOpenPrivacy`; `App.tsx:109` defaults it to `() => {}`; S4's `onReviewConsent={onOpenPrivacy}` (`App.tsx:496`) | Tap Today's privacy link, or S1 → S4 → review | X0 manage opens with server state | Nothing happens. Also, `onConsentChange` swallows a refused write (`Root.tsx` `.catch(() => undefined)`), so a toggle can show a state never recorded | Lead | OPEN |
| F-9 | P2 | Back affordance | `grep -c onBack` = 0 in T2, T5, T6, T11, T12, T13, T14, P2, P3; hardware back handled at `Root.tsx:149` | Open T14 | A drawn back control | None drawn; T14 has no pressable (count 0) | Agent 1 (T2/T5/T6), Agent 2 (T11-T14, P2, P3) | OPEN |
| F-10 | P0 | Create party | `store/index.ts:348` `addParty` exists; `grep -rn "addParty" apps/mobile/src --include=*.tsx` finds no caller | New shop: record a credit sale | Can add a customer | Store method only; no screen reaches it | Agent 2 | OPEN |
| F-11 | P2 | Entry description | Only `X1.tsx` has a `TextInput` | Record an expense | A note can be kept | None | Agent 2 | OPEN |
| F-12 | P3 | T5 state label | `screens/T5.tsx:71-99`: the state `Text` sits in a sibling `View` after `<Row>` | Open T5 | State word inside its row | Below the row's hairline | Agent 1 | OPEN |
| F-13 | P2 | Party colour | `components/Money.tsx:96-102` colours by the sign of the number | Give credit | Colour by direction of the shop's money (reference `store.js:493`) | Sign-based | Agent 1 | UNRESOLVED (needs the owner's ruling, chat.md §14) |
| F-14 | P1 | Supplier due | `store/index.ts:302-306` excludes non-udhar purchases; test `apps/mobile/test/sqlite-port.spec.ts:113-120` | Cash purchase from a supplier | No due created | No due created | Lead | CONFIRMED-FIXED |
| F-15 | P3 | Motion | `grep -rln "Animated\|LayoutAnimation\|useNativeDriver\|Easing\|Vibration" apps/mobile/src` → only `screens/T13.tsx`, at a comment (`:41`) | n/a | Motion tokens and reduced motion | None | Agent 1 | OPEN |
| F-16 | P3 | T2/T6 reach | `App.tsx:174` shows T2 only when `openingCash === null` and there are no entries | Fresh install | T2/T6 reachable | Not re-verified on device | Agent 1 | REPORTED |
| F-17 | P0 | Sign-in | No A-screen files in `apps/mobile/src/screens`; `Root.tsx:191` says `requestOtp`/`verify` have no caller | Launch | Sign-in, then sync | Permanently unauthenticated; sync, export, erase and consent writes all fail | Agent 3 | OPEN |
| F-18 | P1 | Outbox ack race | `host.tsx:189-200` snapshot → await push → ack ids; day row id is stable (`store/index.ts:219`) and replaced in place (`store/sqlite.ts:80-82`, `store/index.ts:141`) | Queue the day row, start sync, close the day before the response, response 2xx | The closed state stays queued and syncs | The close is deleted from the outbox; the server keeps the open day (scratch repro R1) | Lead (store/host), Agent 4 | OPEN |
| F-19 | P1 | Rollover in a live process | Rollover only in `sqlitePort.load()` (`sqlite.ts:106-111`), called once from the `Store` constructor (`store/index.ts:193`); entries dated `store.state.day.date` (`app/session.tsx:474`) | Close at night; next morning, without a force-stop, record a sale | A new day opens on the counted cash | `DayClosedViolation`; banner "Nothing was recorded. Check and try again." for every entry until the process dies (repro R2) | Lead | OPEN |
| F-20 | P2 | Future-dated day | `sqlite.ts:98` latest by `date DESC`; it rolls only if `latest.date < today` (`:109`) | Close under a wrong clock (2027-03-01), correct the clock, relaunch | Recover a writable day | Stuck on the closed future day (repro R3) | Lead | OPEN |
| F-21 | P2 | Business-day end | Decision 1 (CLAUDE.md, 2026-10-22): start and end times are retailer-defined; `sqlite.ts:106-111` never ends an open day | Leave a day unclosed for a week | The day ends at the shop's end time | One day holds a week of entries (repro R4); the decision-1 `day_id` migration has not started | Lead | OPEN |
| F-22 | P1 | Account deletion | `App.tsx:516-530`: S8 gets only `onCancel` / `onBack`; `net/client.ts:487` `erase` has no caller; no local wipe | S1 → S7 → S8 → delete | Account erased and local book emptied (Play answer/13327111) | Nothing deleted, server or device | Lead (assign S7/S8), Agent 4 | OPEN |
| F-23 | P1 | Privacy policy in app | `screens/S5.tsx` has no privacy row; `apps/web/legal/privacy.html` is unhosted (H5) | Open About | A policy link (Play answer/10144311) | None | Lead (assign S5), human H5 | OPEN |
| F-24 | P1 | SMS pumping | `apps/api/src/auth/routes.ts:114-117` consumes only the per-phone limits; `sendPerIp` / `sendPerDevice` (`rate-limit/limits.ts:132-145`) have no consumer | Request OTPs for many numbers from one IP | 429 after the per-IP / per-device limit | Only per-phone limits apply (latent while `server.ts:82` is `StubSmsPort`) | Agent 4 | OPEN |
| F-25 | P2 | D2D transfer | `AndroidManifest.xml:10` `allowBackup="false"`, no `dataExtractionRules` | OEM device-to-device migration | A deliberate rule | The plaintext ledger may transfer | Agent 3 | UNRESOLVED (a decision: it is also the only continuity path today) |
| F-26 | P2 | Plaintext ledger | `store/sqlite.ts:29-35` (party JSON with names and phones); `Root.tsx:75` no key | Read the app database on a rooted device | Encrypted, or a recorded risk acceptance | Plaintext, basis unstated | Agent 3 + Lead | UNRESOLVED |
| F-27 | P2 | Published text not true | `apps/web/legal/privacy.html:58,141,188-190`; `docs/handover/DATA-SAFETY.md:21` (generated, so fix the generator's source) | Read the policy | Statements true at publication | Backups, Mumbai region, DLT and TLS 1.3 all asserted; none exists | Agent 4 (notice / generator), counsel H9 | OPEN |
| F-28 | P2 | Play financial declaration | `docs/handover/HUMAN-ACTIONS.md` rows H1-H14 have none | n/a | Tracked human action (Play answer/13849271) | Untracked | Lead | OPEN |
| F-29 | P2 | Consent scope | `apps/api/src/dpdp/routes.ts:83-86`: the optional purpose includes "your sign-in code" | Withdraw `sms_reminders` | The notice does not call the mandatory OTP optional | It does | Agent 4 | OPEN |
| F-30 | P2 | Text resize | `packages/values/src/index.ts:174` `CHROME_FONT_SCALE_CAP = 1.5`, applied to all text (`theme/tokens.ts:174`) | System font at the largest setting | WCAG 1.4.4, 200 percent | Capped at 150 percent | Agent 1 | UNRESOLVED (a written trade-off, or lift it for body text) |
| F-31 | P2 | OTP store | `apps/api/src/server.ts:89` `memoryOtpStore()` | Two instances, or a restart | A code verifiable anywhere | Per-process | Agent 4 | OPEN |
| F-32 | P2 | SIM-swap hold | `grep -ri cooling apps/api/src` finds nothing (S-14) | New device sign-in, then export | 24-hour hold | None | Agent 4 | OPEN |
| F-33 | P2 | Access log | `apps/api/src/app.ts:124` logs at `warn` | Authenticated read | An id-only access record | None | Agent 4 | OPEN |
| F-34 | P3 | Refusal copy and placement | `App.tsx:547-550` (two hint keys only); absolute overlay `App.tsx:566-569` | Any closed-day refusal | A specific reason, with the app bar visible | Generic copy over the app bar | Lead | OPEN |
| F-35 | P3 | check:generated on Windows | `tools/check-generated.mjs` compares bytes; the strip-types generators write LF while an `autocrlf=true` checkout is CRLF (`.gitattributes` header) | Fresh worktree, `npm run check:all` | Pass with no drift | 5 files flagged with no content difference (`git diff --ignore-cr-at-eol` empty) | Lead | OPEN |
| F-36 | P3 | Refresh rotation | `apps/api/src/auth/routes.ts:36-37,334` | Reuse a refresh token | Rotation with reuse detection | Valid 180 days | Agent 4 | OPEN |
| F-37 | P3 | Local schema version | `store/sqlite.ts:29-35`, no `user_version` | First schema change | A migration path | None | Lead | OPEN |
| F-38 | P3 | Session storage | `platform/storage.tsx:191-211` | Restart after sign-in | Stay signed in | Signed out | Agent 3 | OPEN |
| F-39 | P2 | Endpoint | `platform/endpoint.ts:37` `http://192.168.1.35:8787` | Release build | A production https origin | LAN http (fails in release by design) | Agent 3 | OPEN |
| F-40 | P2 | Devanagari font | Prior agent's measurement: 2/128 Devanagari code points in the bundled Anek Odia faces; `tools/check-font-coverage.mjs` has no Hindi corpus | Hindi on a handset with no system Devanagari | Glyphs render | Tofu risk | Agent 1 | REPORTED (not re-measured by Agent 5) |
| F-41 | P2 | Selected segment in Focus | `components/Shell.tsx:985,996`; `theme/tokens.ts:84,88`: fill vs tray ratio 1.24, and `onBrand` = `ink` | Focus mode, T7 mode selector | The selected state is visible (SC 1.4.11) | Only bold weight and a 1.24 fill distinguish it | Agent 1 | OPEN (not seen on a device; H8) |

## Lead pass, 2026-10-25, after the wave-1 merge (tree `8c1e2da`)

Fixes since the Agent 5 pass, each verified by a test that fails when the defect is
planted back:

| ID | Status | Evidence |
|---|---|---|
| F-8 | CONFIRMED-FIXED | `host.tsx` `openPrivacy` / `changeConsent`; `test/host.spec.tsx` "F-8"; commit `404e790` |
| F-9, F-10, F-13 | CONFIRMED-FIXED | Agent 2, commit `d70004b`; `test/way-back.spec.tsx`, `test/party-create.spec.tsx`; F-10 also on the device (run 2026-10-25 03:25) |
| F-17 | CONFIRMED-FIXED | Agent 3, commit `9c037ca`; signed in on the device against the local API (A3 → A4 → wrong code → A5 → right code → X1) |
| F-18 | CONFIRMED-FIXED | `isSentVersion` in `store/index.ts`, both ports; `sqlite-port.spec.ts` "F-18"; commit `3ea4a9e` |
| F-19 | CONFIRMED-FIXED | `Store.startNextDayIfDue`, `Session.refreshDay`, Root foreground hook; `sqlite-port.spec.ts` "F-19"; commit `3ea4a9e` |
| F-35 | CONFIRMED-FIXED | `.gitattributes` `* text=auto eol=lf`, catch-all first so fonts stay binary; commits `924bef5`…`1c5e7da` |

New, found on the iQOO I2219 (Android 16 / SDK 36) by label-driven walks with screen
recording; reviews in `docs/device-reviews/`:

| ID | Sev | Area | Repro | Expected | Actual | Owner | Status |
|---|---|---|---|---|---|---|---|
| DV-1 | P2 | Cold start | Launch | A first screen at once | ~2 s blank window | Agent 3 | CONFIRMED-FIXED (navy windowBackground, `res/values/colors.xml`) |
| DV-6 | P2 | Keyboard | Credit → add customer → tap Mobile number | Field above the keyboard | Keyboard covers the field (edge-to-edge ignores adjustResize) | Lead | CONFIRMED-FIXED (`MainActivity` insets include `ime()`, `cc27ba7`) |
| DV-7 | P1 | Wrong party kind | Credit to a new customer, switch to "Paid out", Add | Refused | "Paid to suppliers - <customer>" booked | Lead | CONFIRMED-FIXED (`Store.append` kind guard, `cc27ba7`) |
| DV-8 | P2 | Close time | Close at 03:33 IST | "Closed 03:33" | "Closed 22:03" (UTC slice) | Lead | CONFIRMED-FIXED (`platform/clock.ts`, `cc27ba7`) |
| DV-9 | P2 | Closed-day headline | Close with a −₹50 difference, relaunch | Reference T3 figure | "Cash should be" (expected) | wave-2 design | OPEN |
| DV-10 | P2 | A1 wordmark | Launch | Heavy, tight wordmark | Thin, wide (caused by DV-11) | Lead | CONFIRMED-FIXED with DV-11 |
| DV-11 | P1 | Fonts not in APK | Any screen | Anek fonts | System fallback everywhere; `unzip -l` showed no `assets/fonts` | Lead | CONFIRMED-FIXED (`build.gradle` assets srcDir, `d5d996f`; unzip and device verified) |
| DV-12 | P2 | Stale sync count | Sale, foreground sync | "All saved" once acked | "2 waiting to sync" until restart (server had the rows) | Lead | CONFIRMED-FIXED (`Host.sync` → `session.storeChanged`, `8c1e2da`) |
| DV-13 | P2 | Shop name on server | Sign in, finish X1 | `shops.name` set | NULL in Postgres | wave-2 backend | OPEN |
| DV-14 | P0 | Blank app after background | Sale → Add → HOME → reopen | Today | Blank navy window; logcat "Incompatible React versions: react 19.3.0, renderer 19.1.0" | Lead | CONFIRMED-FIXED (React pinned to 19.1.0 exactly, `8c1e2da`; same repro clean, 0 mismatch lines in logcat) |
| DV-15 | P2 | Two "Back" labels | Any keypad screen | Distinct labels | Header back and keypad delete both "Back" | wave-2 a11y | OPEN |
| DV-16 | P3 | Zero out-line sign | Count cash with no withdrawal | "−₹0" like the reference | "+₹0.00" | wave-2 a11y | OPEN |

Not defects, recorded so nobody re-files them: the phone has Android's high-contrast text
setting on (`settings get secure high_text_contrast_enabled` → 1), which draws the dark
outline on every glyph in the screenshots; the orange circle at the right edge is a phone
overlay; withdrawal is reached from T5 only, as in the reference (`store.js:424`,
`origin: 'list'`).

**Disagreement adjudicated (Agent 1 vs Agent 2).** Agent 1 stopped T5 drawing a skip
control on a closed day; Agent 2's refusal test required the control to exist. Ruling: a
control whose only outcome is a refusal should not be drawn. The test now asserts both
that it is not drawn and that a skip reaching the session on a closed day still shows the
banner (`test/refusal-banner.spec.tsx`). Agent 1's note that F-7's root cause was open was
checked and is wrong: `session.skipSection` has caught the refusal since `cacd461`.

### Lead, wave-2 merges (2026-10-25)

| ID | Status | Evidence |
|---|---|---|
| F-22 | CONFIRMED-FIXED | `Host.deleteAccount`: server erase first, phone wiped only after the server accepts (no restore path exists, so a wipe on a failed request would lose the book while the account lives on); `test/account-deletion.spec.tsx` (13); branch `a5786e2` |
| F-23 | CONFIRMED-FIXED in the app | About links Privacy, Terms, Licences and the web deletion page; `apps/api/src/web.ts` serves `/privacy`, `/terms`, `/delete-account` with hash-pinned CSP; `apps/api/test/web-pages.spec.ts`. Hosting on a real origin is still H5 |
| F-24 | CONFIRMED-FIXED | per-device send limit applied on the OTP route; `api.spec` "6th number from one device → 429"; branch `4cb3234` |
| DV-13 | CONFIRMED-FIXED | `POST /v1/me/shop`, sent on sync while signed in; `host.spec` + `repo-equivalence` both engines |
| sync timeout | CONFIRMED-FIXED | `fetchTransport` AbortController + race, `REQUEST_TIMEOUT_MS` 60 000 (chosen, not measured) |
| F-36 | OPEN | refresh rotation needs a migration on both engines; plan in the wave-2 backend report |

**F-27 is now a release gate, because the policy is now served.** `apps/web/legal/privacy.html`
describes the PLANNED production system (servers and backups in `ap-south-1`, DLT delivery,
backups rotating out within 90 days; the same backup sentence is in `dpdp/routes.ts:303,466`).
None of that is deployed today. One line is false of the product as built, not only of
today's hosting: the purposes column says the data is kept "to ... restore it if you change
phone" - the client has no restore or pull path at all. Owner: counsel (H9) with H5 before
publishing; every factual claim in the policy must be checked against the deployed system.
Not rewritten here: it is legal copy and CLAUDE.md forbids guessing it.

## Human-tester pass, 2026-10-25 (iQOO I2219, Android 16)

Tester: independent human-tester charter run (`.claude/skills/swafto-human-tester`).
Session review: `docs/device-reviews/2026-10-25-human-tester.md`. Recordings and shots are
under `artifacts/device-tests/human-c1`, `human-c2`, `human-c5` (git-ignored). A recording
time marked "derived" is the shot's file time minus the recording's start (file end time
minus `ffprobe` duration); it was not read off a player.

**Build on the phone is not latest main.** The installed `base.apk` and
`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` have the same md5
(`0367fe8faf678a17c08c5327fcf624f2`); that APK was written at 10:48 IST, before `d66ea11`
(10:50, keypad delete label, zero out-lines, F-41) and `55b2f6f`. So DV-15 (keypad delete
read "Back" on A3, T6, T7, T11) and DV-16 ("Cash you took +₹0.00" on T11) were seen on the
phone but are NOT filed as regressions: the fix is not in this build.

**Session ended BLOCKED.** Charter 5's lock/unlock step locked the phone; it has a PIN
(`dumpsys lock_settings`: CredentialType PIN) that the tester does not have and did not
guess. Every later charter needs the screen. The app was left mid-draft on the Sale form
(₹777 typed, not saved).

| ID | Sev | Charter | Evidence | Steps | Expected | Actual | Repro |
|---|---|---|---|---|---|---|---|
| HT-1 | P1 | 2, 3 | `human-c2/t5.png`, `t5b.png`; `c2b.mp4` 00:04 (derived) | Open day with entries → Today → "Continue day close" | The day-close list T5 (`docs/design-reference/comfort/T5.png`), from which Personal withdrawal (T10, "Section 8 of 9 · reviewing") and section skip are reached | Goes straight to the cash count (T11). No screen on an open day reaches T5, so a withdrawal (D3) cannot be recorded and no section can be skipped; T11 shows "Cash you took" as a fixed line. `App.tsx` passes `onCloseDay={() => session.goTo('T11')}`; T5 is reached only from the closed-day face | 1/1 |
| HT-2 | P2 | 1 | `human-c1/x1_noname.png`, `x1_back.png`, `relaunch_x1.png`, `today0.png`; Postgres `shops.name` empty for +919000000021 | Sign in → X1 → tap "Start the day" with no name (refused: "Type the shop name first.") → Back → relaunch | Back on X1 returns to a sign-in step or keeps X1 until it is finished (Back_Button_Nav) | Back leaves the app; the relaunch opens Today with setup never finished: no shop name on the phone or the server | 1/1 |
| HT-3 | P2 | 1 | `human-c1/x0hi.png`, `back_from_x0.png`; `c1b.mp4` 00:06, `c1c.mp4` 00:30 (derived) | A1 → A2 → pick a language → X0 → Back | Back returns to A2 so a wrong language can be changed (Back_Button_Nav) | Back leaves the app; relaunch restarts at A1 | 2/2 (Hindi, Odia) |
| HT-4 | P2 | 2, 7 | `human-c2/today_after_pay.png` ("17 waiting to sync"), `after_bg.png` ("All saved on phone"); Postgres | Sign in, record 13 entries over about 16 minutes with the app in front and the API reachable | Rows reach the server while the app is in use | Nothing synced while the app stayed in front: Postgres held 0 entries for the shop at 14:35 IST; after Home and reopen all 13 rows arrived, paise correct. A shopkeeper who never leaves the app keeps the whole day on the phone only | 1/1 |
| HT-5 | P3 | 1 | `human-c1/a3_send_1234.png`; `/tmp/devserver.log` SMS block to `+911234567890` | A3 → type 1234567890 → Send code | A number that cannot be an Indian mobile is refused before an SMS is paid for | Accepted; the server sent a code to +911234567890. A leading 0 (0123456789) is also accepted as ten digits | 1/1 |
| HT-6 | P3 | 2 | `human-c2/exp_udhar_added.png` | Add expenses in Cash, UPI, Other, Shop stock, Udhar | Each line says its mode (T9 says only Cash changes the cash) | Every line reads "Expenses ₹…" with no mode; the five cannot be told apart | 1/1 |
| HT-7 | P3 | 2 | `human-c2/pay_pick.png`, `p_pick2.png` | Credit a customer ₹200, buy ₹400 on credit from a supplier, open each picker | What the shop owes reads differently from what it is owed | Both read "+₹…" (customer +₹200.00, supplier +₹400.00) | 1/1 |
| HT-8 | P3 | 2 | `human-c2/pay.png` | Today → Pay (Paid to suppliers) | A supplier view | Header "Udhar book · Owed to you ₹250.00" and the customers' credit lines above the supplier picker | 1/1 |

Seen and correct (not defects): every Today figure in charter 2 matched a hand
calculation (see the session review); Postgres amounts matched in paise; UPI, Other, Udhar
and Shop stock did not move "Expected in box" (D2).

### Lead, after the human-tester pass (2026-10-25, commit `8926091`)

| ID | Status | Evidence |
|---|---|---|
| HT-1 | CONFIRMED-FIXED | Today → T5 (reference route); T10/T11 back to T5; `way-back.spec` "HT-1" drives T1 → T5 → T10 → back |
| HT-2 | CONFIRMED-FIXED | Host first screen: named shop → T1, signed in without a name → X1; `host.spec` "HT-2" |
| HT-3 | CONFIRMED-FIXED | X0 back: signup → A2, manage → T1; `session.spec` "HT-3" |
| HT-4 | CONFIRMED-FIXED | `Host.syncLatest` on every store write, single-flight, re-run for a mid-drain write; `host.spec` "HT-4" (2) |
| HT-5 | CONFIRMED-FIXED | shared `INDIAN_MOBILE` (`@swafto/values`) in A3, party phones and the OTP route; `api.spec` "HT-5", `A3.test` |
| HT-6, HT-7, HT-8 | OPEN (P3) | not yet worked |

Each fix was planted back and its test failed. **Not yet re-verified on the device**: the
tester's session ended when its lock/resume step locked the phone (it has a PIN). The skill
now forbids lock/sleep on a phone with a credential and checks that the installed APK's md5
matches the fresh build before testing - the tester also found it had been given a stale
APK (the 13:55 rebuild had failed under a Gradle 9.7.1 wrapper written by the editor's Java
extension; builds now run on the cached Gradle 8.14.3 and are md5-verified on install).

## Human-tester pass 2, 2026-10-25 (iQOO I2219, Android 16)

Tester: independent human-tester charter run (`.claude/skills/swafto-human-tester`).
Session review: `docs/device-reviews/2026-10-25-human-tester-2.md`. Build verified: the
installed APK md5 `a08e9ea585d97219bb4554c8ec5815b8` equals the debug APK written 15:29 IST,
after `8926091`. Recordings and shots are under `artifacts/device-tests/human2/<dir>/`
(git-ignored); a name like `c4/lo3c` is a screenshot plus UI dump in that directory.
Recording times are derived (shot time minus recording start), not read off a player.

**Re-verified on the device:** HT-1, HT-2, HT-3, DV-15, DV-16 and F-41 PASS. HT-4 PASS for
sync on every write with the app in front, but see HT-9. HT-5 PASS on the phone; the
server half was not verifiable because the running API process started at 14:00, before
`8926091` (a `curl` with `+911234567890` was sent an SMS).

**Rig note:** `adb reverse --remove tcp:8787` leaves the app's live keep-alive socket
open, so a server cut made that way can still reach the API (two consent changes did).
`adb kill-server` closed it. Lock and sleep were never sent (the phone has a PIN).

| ID | Sev | Charter | Evidence | Steps | Expected | Actual | Repro |
|---|---|---|---|---|---|---|---|
| HT-9 | P2 | 7, 4 | `a/ht4_off3`, `a/ht4_restore1` to `7`, `a/ht4_next` (`a2.mp4` 00:52); `c4/after_signin2`; Postgres | Cut the server, add a sale ("2 waiting to sync"), restore the server, keep the app in front. Separately: log out, add ₹40, sign back in with the same number | Queued rows go when the server is reachable again, and after sign-in (Graceful_Degradation) | "2 waiting to sync" stayed 3 min 30 s after the server returned, and after sign-in; Postgres had nothing until the next entry was typed, which drained both. `Host.syncLatest` only runs on a store write | 2/2 |
| HT-10 | P1 | 3, 4, 9 | `c3/closed_s2`, `c3/ledger`, `c3/reports`, `c3/summary` | Close the day → Today, scroll to the end; Ledger; Reports; day summary | Settings (Log out, privacy, deletion) and the privacy link stay reachable; withdrawing consent is as easy as giving it (CLAUDE.md, Law) | On a closed day no screen reaches Settings or the privacy link until the next day opens: no log out, no consent change, no deletion for the evening | 1/1 |
| HT-11 | P2 | 3 | `c3/correction`, `c3/corr_cash`, `c3/corr_add` | Closed day → Post a correction → Cash sales → 5 → Add | A correction is posted as a new dated entry (D1), or the screen says why not | "Not saved · Nothing was recorded. Check and try again." Nothing in Postgres. The only route the closed day offers cannot be used, and the message gives no reason | 1/1 |
| HT-12 | P1 | 4 | `c4/from_recents` (`c4a.mp4` 02:17), `c4/reopen_full`, `c4/lo3c` (`c4b.mp4` 01:05); `c9/so_s7` | Settings → Log out → Log out. Then Back twice (leaves the app), Recents → tap the card; or relaunch | After log out no signed-in screen, figure or name is reachable (product owner's ask; Back_Button_Nav, App_Switcher) | The card and every relaunch open Today with "TEST STORE", opening ₹1,085 and all figures; entries can be added; Settings shows "Sign in". A3 after log out and the Recents thumbnail were clean | 3/3 |
| HT-13 | P1 | 4 | `c4/other_after` (`c4c.mp4` 01:58), `c4/other_sale`, `c4/other_settings`, `c4/s8`, `c4/after_delete`; Postgres `shops` d3e59857 | On a phone holding +919000000021's book: log out → sign in as +919000000031 → add ₹15 → Settings → Delete this account → Delete everything | Another shop's book is not shown under a different account, nothing of it reaches the other shop, and the screen says what is happening | Today shows the first shop's book and figures under the new account with no message. The new account's server shop got the name "Test Store" from this phone (a new account's shop starts with no name). Entries were held back, shown only as "2 waiting to sync". S8 warned "You are still owed ₹250.00" from the first shop's book; deleting the new account wiped that book from the phone, including the unsynced ₹15 | 1/1 |
| HT-14 | P2 | 9 | `c7/consent_saved` (`c7a.mp4` 00:45), `c7/consent_reopen` (01:23), `c7/consent_off_offline` | Today → Privacy and what you agreed to → change a choice → Save (also from Settings → Privacy and consent → What you agreed to) | Back to the screen it came from | Lands on X1 "Four questions, then your book." with the name filled; Back leaves the app and relaunch returns to X1 until Start the day is tapped. Opening cash was not changed by it | 3/3 |
| HT-15 | P2 | 9 | `c9/lic3` (`c9a.mp4` 01:42) | Settings → About this app → Open-source licences | The licences open (`docs/design-reference/comfort/S10.png`) | Nothing happens; Privacy policy and Terms open. (Tester read: `S5`'s `onOpenLicences` is not passed in `App.tsx`) | 2/2 |
| HT-16 | P2 | 8 | `c8/lang_or`, `c8/lang_relaunch`, `c8/pref_relaunch`, `c8/pref_after`; `c8/today_focus_13`, `c8/today_focus_20` | Settings → Language and text size → ଓଡ଼ିଆ (or हिन्दी) → relaunch | The language stays chosen | English after every relaunch (Odia, then Hindi). Related, 1/1, cause not isolated: Focus chosen on X1 showed dark on Today, then light after saving opening cash (font scale was changed at the same moment) | 2/2 |
| HT-17 | P2 | 5 | `c5/sale_land` (`c5a.mp4` 01:33) | Sale form, rotate to landscape | Every control reachable (Orientation_Transitions) | The app rotates; keypad rows 4-6 are cut, 7, 8, 9, Clear, 0 and Delete are off screen, and nothing scrolls | 1/1 |
| HT-18 | P2 | 8, 7 | `c8/a4_13` (`c8a.mp4` 01:34) | font_scale 1.3, server unreachable, A3 → Send code | The offline message is visible | "You're offline — a code can't be sent or checked without signal" is drawn under the keypad: only its top edge shows, and Send code looks as if it did nothing | 1/1 |
| HT-19 | P2 | 3 | `a/t5_skipped`; Postgres `section_skips` | Fresh shop → T5 → Nothing to enter on all eight sections → cash check → close | The skips reach the server with the day (the `section_skips` table exists) | The closed `days` row arrived; `section_skips` has 0 rows for the shop. "Nothing today" exists on the phone only | 1/1 |
| HT-20 | P3 | 4 | `a/a7_wa3` | A3 → I changed my number. → I don't have it anymore | A way to reach help | "Message us with your shop name" with no number, link or button | 1/1 |
| HT-21 | P3 | 5 | `c5/sale_kill` (`c5a.mp4` 02:13), `c5/credit_kill`, `c5/pur_force` | Type an amount, do not save; Home + `am kill`, or force-stop; reopen | The draft comes back (State_Preservation) | Today opens; the typed amount is gone. Nothing was saved, nothing twice | 3/3 |
| HT-22 | P3 | 6 | `c5/nc_saved` | Credit → Add new customer → name → triple-tap Save and choose | One party, nothing else | One party (Postgres 1 row), but the third tap landed on the keypad underneath: Amount ₹8.00, a figure he did not mean to type | 1/1 |
| HT-23 | P3 | 3 | `c3/t12_short` (`c3a.mp4` 00:48), `c3/t12_over` | T11 count ₹1,000 (short ₹85); then ₹1,200 (over ₹115) | Reasons fit the sign | For a shortage it offers "Gave change from my pocket"; paying change from his pocket would leave the box over, not short. For the product owner to confirm. The over difference reads "₹115.00" with no "+" while the short one reads "-₹85.00" | 1/1 |
| HT-24 | P3 | 10 | `c10/after_65s` (`c10.mp4` 01:28), `c10/after_home` (02:08) | Day closed, app in front, device date +1 day | The new day opens | Today kept "Sunday 25 October" 65 s later and after a tab switch; Home + reopen opened the new day on the counted cash. Decision 1 (retailer-defined business day) changes this area anyway | 1/1 |
| HT-25 | P3 | 1 | `a/a3_1234` | A3 → 1234567890 | Say why the number is refused | Send code is greyed with no reason on screen | 3/3 (1234, 0123, 5999 prefixes) |
| HT-26 | P3 | 4 | `a/a7`, `a/a7_back` | A4 → Trouble? I changed my number. → Back | Back returns to A4 (Back_Button_Nav) | Returns to A3; the code step has to be started again | 1/1 |
| HT-27 | P3 | 3 | `c3/closed_s2` | Day closed, look at the six tiles | Disabled tiles look disabled | They are disabled but drawn exactly like the open-day tiles | 1/1 |
| HT-28 | P3 | 8 | `a/t5_b` | T5 on a new day, read labels | Every control has a unique label | Eight buttons all labelled "Nothing to enter"; a screen reader cannot tell which section each skips | 1/1 |
| HT-29 | P3 | 8 | `c8/x1_focus_13`, `c8/s5_20b`, `c8/s5_bright` | Compare X1 and Settings → Language and text size | One name for one setting | X1 calls it Text size: Comfort / Focus; Settings calls it Screen: Normal / Bright sunlight, under a title that says "text size" but offers none; "Bright sunlight" turns the screen dark | 1/1 |
| HT-30 | P3 | 8 | `c8/open_typed2`, `c8/today_hi_20` | font_scale 1.3 Focus opening cash; font_scale 2.0 Hindi Today | Nothing clipped | Opening-cash instruction cut mid-sentence by the amount box; Hindi "आज अब तक" shows as "आज अब" | 1/1 each |
| HT-31 | P3 | 7, 9 | `c7/cr` | Server unreachable → Today → Privacy and what you agreed to | The consent screen, or a message about loading it | Stays on Today with "Not saved · Could not reach the server, so your choice was not changed" before any choice was made; the choices cannot even be read offline | 1/1 |

Seen and correct (not defects): T11 ₹1,085, T14 profit ₹460 and net sales ₹1,235
matched a hand calculation; withdrawal outside profit (D3); one close, one SMS, one entry
and one party under triple taps; closed-day tiles disabled (D7); same-number sign-in
brought the book back; deletion offline, signed in and signed out each said exactly what
happened and Postgres agreed; consent give and withdraw reached Postgres; Privacy policy
and Terms open; logcat over the session holds no phone number, code, token or name; the
next day opens on the counted cash.

### Lead, after human-tester pass 2 (2026-10-25)

| ID | Status | Evidence |
|---|---|---|
| HT-9 | FIXED, device pending | `Root` ticks every 30 s in the foreground and drains a non-empty queue; `verifyCode` drains after sign-in. The tick has no unit test (it is a timer in the RN root); the device re-run is its test |
| HT-10 | CONFIRMED-FIXED | T3 carries the same Settings and privacy links as T1; `way-back.spec` "HT-10" |
| HT-11 | OPEN (P2) | "Post a correction" on a frozen day has nowhere to write: D7 refuses the day, and a correction dated to the next day depends on decision 1 (retailer-defined business day). It says honestly that nothing was saved |
| HT-12 | CONFIRMED-FIXED | An account record without tokens is a log-out: relaunch opens A3, not Today. A pre-sign-in tester (no record) still opens Today. `auth-flow.spec` A8 log-out test |
| HT-13 | CONFIRMED-FIXED | A sign-in that resolves to a shop other than the book's is signed out at once, A3 says why (`refusal.wrongShop`), and the book's name is not sent with the verify. `auth-flow.spec` "ANOTHER number" (two plants: the guard and the name) |
| HT-14 | CONFIRMED-FIXED | Saving consent in manage mode returns to T1; `session.spec` manage-mode test |
| HT-15 | CONFIRMED-FIXED | `tools/check-licences.mjs` also writes `apps/web/legal/licences.html` (same rows as the manifest, OFL text in full); served at `/licences`; S5 opens it. `web-pages.spec`, `account-deletion.spec` |
| HT-16 | CONFIRMED-FIXED | Language and display kept in a `prefs` row and read at start; an unknown value is dropped. `host.spec` "HT-16" (two plants) |
| HT-17 | CONFIRMED-FIXED | MainActivity locked to portrait; `orientation.spec`. Android 16 ignores the lock on large screens (smallest width 600), so a tablet still needs a landscape layout |
| HT-18 | CONFIRMED-FIXED | A3 and A4 draw the problem notice in the footer, above the keypad; `A3.test` "HT-18" |
| HT-19 | NOT A DEFECT (decision) | Skips are kept on the handset by design: no server route reads a skip, and syncing them adds a DPDP export duty for nothing until restore-from-server exists (`apps/api/src/dpdp/routes.ts`). The empty `section_skips` table is the evidence of that decision, not of a lost write |
| HT-24 | FIXED, device pending | The same 30 s tick calls `refreshDay` |
| HT-28 | CONFIRMED-FIXED | Each skip button's spoken label names its section; `T5.test` "HT-28" |
| HT-31 | CONFIRMED-FIXED | Failing to load the consent screen has its own copy (`refusal.consentRead`); `host.spec` |
| HT-20 to HT-23, HT-25 to HT-27, HT-29, HT-30 | OPEN (P3) | not yet worked. HT-23's reason list is for the product owner |
| HT-5 server half | device pending | the API was restarted on the fixed code; the tester's `curl` check to be repeated |

Each CONFIRMED-FIXED row was planted back and its test failed. Two stale `prove:verifiers`
anchors were found on the way: `layout` (Shell's tile basis now depends on `across`) and
`push-payload` (DV-14 pinned react exactly). Both plants were moved to the current text;
the layout one was measured to produce the same eight "Purchase" escapes as before.

## Human-tester pass 3, 2026-10-25 (iQOO I2219, Android 16)

Re-verification of `89f33a7` on the device. Session review:
`docs/device-reviews/2026-10-25-human-tester-3.md`. Build verified: installed md5
`597263c165122cf2d986ccf621b9be85` equals `app-debug.apk` (18:10:25, after `89f33a7`).
Evidence is under `artifacts/device-tests/human3/p/` (git-ignored); recording times are
derived, not read off a player. The API restart at about 18:20 (new signing key) showed A6
once; that was the rig, and the checks around it were re-run.

| ID | Result | Evidence |
|---|---|---|
| HT-5 server | PASS | `curl` → 400 `invalid_phone` for `+911234567890` |
| HT-9 | PASS | Two sales offline → "3 waiting to sync" (`p8.mp4` 00:43); rig back 18:39:19, app untouched, "All saved on phone" by 18:39:46 (01:32); Postgres 1100, 2200 |
| HT-10 | PASS | Closed Today shows Settings and the privacy link; both open (shots `closed_bottom`, `closed_settings`, `closed_privacy`) |
| HT-12 | PASS | After Log out: Back, Recents card, force-stop + relaunch, `am kill` + reopen all open A3, no name or figure (`p2.mp4` 00:18, 01:00, 01:10, 01:43); same number brings the book back (02:20) |
| HT-13 | PASS | New number → A3 "The book on this phone belongs to a different number, so you were not signed in" (`p3.mp4` 02:45); Postgres: that shop's name is empty; the book is intact on re-sign-in. See HT-32 |
| HT-14 | PASS | Consent Save from Today and from Settings lands on Today; relaunch → Today; Postgres true then false (shots `ht14_*`) |
| HT-15 | PASS on host; device check stopped by rig | The row opens the browser, but a vivo password screen took over (`p5.mp4` 00:22), as it did for Privacy policy this time. Host `/licences` → 200 with package rows and OFL text |
| HT-16 | PASS | Hindi + Bright sunlight kept across force-stop (`p5.mp4` 02:19 to 02:46) |
| HT-17 | PASS | Rotation locked to 90°: display stays portrait (`p7.mp4` 00:28) |
| HT-18 | PASS | font 1.3, server cut, Send code: the notice is visible above the keypad (`p9.mp4` 00:14). See HT-34 |
| HT-24 | PASS | Clock +1 day with the app in front: Today rolled to Monday 26, opening ₹1,200 (the count), within 12 to 31 s (`p6.mp4` 00:21 to 00:41) |
| HT-28 | PASS | T5 skip labels each name their section (`p4.mp4` 00:11) |
| HT-31 | PASS | Offline privacy link: "…what you agreed to cannot be shown. Try again with signal." (shot `ht31`); heading still "Not saved" |

New defects:

| ID | Sev | Charter | Evidence | Steps | Expected | Actual | Repro |
|---|---|---|---|---|---|---|---|
| HT-32 | P3 | 4 | `p/other` (`p3.mp4` 01:31), `p/other2` (01:54), `p/other3` (02:45); `/tmp/devserver.log`; Postgres `users` | Log out → A3 → a new number → Send code → type the code | One code, then the wrong-shop notice | The first code opens X0 (consent); I agree returns to A3 with no notice, and a second SMS is needed before the notice appears. Each such attempt sends two SMS. The new number's user and consent row are created on the server though sign-in is refused | 1/1 |
| HT-33 | P3 | 7 | `p/ht9_off` (`p8.mp4` 00:43); Postgres | Server cut, type two sales | "2 waiting to sync" | "3 waiting to sync" for two typed sales (pass 2: "2 waiting" for one). The count includes something the shopkeeper did not type, so he cannot reconcile it with his entries | 2/2 (pass 2 and pass 3) |
| HT-34 | P2 | 8 | `p/ht18` (`p9.mp4` 00:14), `p/a3_20` (01:15), `p/a3_20_swipe` (02:11), `p/a4_20` (01:27) | font_scale 1.3 offline A3 → Send code; font_scale 2.0 A3 and A4 | The number being typed stays visible above the keypad | 1.3 offline: the notice sits over the number field (field bounds collapse to zero height) and "Send code" renders as "Send". 2.0: A3 shows title and keypad, but the number field is only inside a 314-pixel scroll box above the keypad, so digits are typed blind; A4's six code boxes are cut by the keypad and Resend is off screen. The HT-18 footer change probably caused this; not isolated | 1/1 each |

### Lead, after human-tester pass 3 (2026-10-25)

| ID | Status | Evidence |
|---|---|---|
| HT-32 | CONFIRMED-FIXED | A book bound to one number refuses any other number on A3 before the SMS, so no code is sent and no user or consent row is made on the server. The after-verify shop check stays as a second guard. `auth-flow.spec`: two tests, each planted |
| HT-33 | CONFIRMED-FIXED | The sync line counts entries and parties, not the day row that rides along with them; a day-only change still reads "1 waiting". `sync-count.spec` |
| HT-34 | CONFIRMED-FIXED, Lead device check | The A3 number field and the A4 code boxes are in the footer with the keypad, so they never scroll away from it. The A4 boxes stay up while the code is checked. `A3.test`/`A4.test` "HT-34". On the iQOO at font_scale 2.0 the Lead saw the typed "98765" above the keypad on A3, and "1 2" in the boxes above the keypad on A4 (`artifacts/device-tests/lead-ht34/`) |

The HT-18 move (notice above the keypad) made HT-34 worse but did not cause it: at 2.0 the
field was already scrolled under the keypad (pass 3 `a3_20.png` has no notice on screen).

## Human-tester pass 4, 2026-10-25 (iQOO I2219, Android 16)

Re-verification of `5b91b38`. Session review: `docs/device-reviews/2026-10-25-human-tester-4.md`.
Build verified: installed md5 `76b7952dd612635126938793d3bec0a0` equals `app-debug.apk`
(19:08:06; every source file in `5b91b38` predates it). Evidence under
`artifacts/device-tests/human4/q/` (git-ignored); times derived.

| ID | Result | Evidence |
|---|---|---|
| HT-32 | PASS | Logged out of +919000000081 → +919000000091 → Send code: A3 with the "belongs to a different number" notice (`q3.mp4` 00:47); no SMS to +919000000091 in `/tmp/devserver.log`; no `users` row for it. +919000000081 signs back in to its book (02:15) |
| HT-33 | PASS | Two offline sales → "2 waiting to sync" (`q4.mp4` 00:22); cleared by itself 27 s after the server came back (00:55); Postgres has both |
| HT-34 | FAIL (offline at 2.0) | 1.0, 1.3 and 2.0 A3, 1.3 offline, A4 at 2.0: correct, from a fresh process (`q1.mp4` 00:37, `q2.mp4` 02:12, shots `a3_13_fresh`, `a3_20_fresh`, `a4_20`, `a4_20_scroll`). At 2.0 offline the notice pushes keys 7-9, Clear, 0, Delete and Send code off screen with no scroll; Send code is not in the UI tree (`q2.mp4` 00:14) |

New defect:

| ID | Sev | Charter | Evidence | Steps | Expected | Actual | Repro |
|---|---|---|---|---|---|---|---|
| HT-35 | P2 | 8, 5 | `q/a3_20` (`q1.mp4` 02:20), `q/a3_13`, `q/x1_after_font` | App open on A3, not signed in, with a number typed → change Android font size (1.0 → 2.0, or → 1.3) → return; also signed in on X1, 2.0 → 1.0 | The screen keeps its state and re-lays out for the new size | Not signed in: the app restarts on A1 and the typed number is lost (2/2). Walking back to A3, the layout keeps the old size: at 2.0 every glyph is cut ("+9", "90000", "Send", "Cle", half digits); at 1.3 "+9 | 90000", "Cle", "Send", "I changed my". Signed in on X1, 2.0 → 1.0 leaves 2.0-height boxes with 1.0 text. Force-stop + relaunch fixes it each time | 3/3 |

### Lead, after human-tester pass 4 (2026-10-25)

| ID | Status | Evidence |
|---|---|---|
| HT-34 (offline at 2.0) | CONFIRMED-FIXED, Lead device check | Shell's footer is now a ScrollView that does not grow and may shrink, so a footer taller than the screen scrolls instead of being cut off. This is general: it covers every footer, not only A3's. On the iQOO at font 2.0 with the server cut, the notice showed and a swipe brought the keypad and Send code into view (`artifacts/device-tests/lead-ht34b/`). `A3.test` "footer ... may shrink and scroll" |
| HT-35 | CONFIRMED-FIXED, Lead device check | The manifest handles `fontScale` and `density`, and `MainActivity` starts a fresh process when the scale changes. Two lighter fixes were tried on the device and failed: re-initialising `DisplayMetricsHolder`, and remounting the React tree keyed on `fontScale`. Both left new glyphs in boxes measured at the old scale; only a new process re-measured. Device check: 1.0 → 2.0 → 1.0 while open, each relaunched; A3 after the change lays out correctly at 2.0 (`lead-ht35d/`). Cost: a half-typed figure is lost on a font change; the book is on disk. `orientation.spec` (manifest and restart) |

The text in the offline notice at 2.0 is set with very loose line spacing (five lines for
two sentences). It is readable and reachable, but it is the leading token scaling with the
font, so it is a P3 for a design pass.

### HT-23, decided by the product owner (2026-10-25)

The product owner's ruling: when the drawer is SHORT, first ask him to recheck the day's
payments and recount the drawer; if it still does not match, record the gap as the day's
loss.

| ID | Status | Evidence |
|---|---|---|
| HT-23 | CONFIRMED-FIXED, Lead device check | T12 on a shortage lists two checks: every payment in the UPI or payment app is also written here, as UPI and not as cash; then count the drawer again. "Count again" returns to T11. "Still short - record as today's loss" sets the fixed reason `t12.reason.loss` ("Loss for the day"), and only then does Close the day work. The four old short-side causes (including the inverted "Gave change from my pocket") are no longer offered; their strings stay so days already closed with them still read. Over-count reasons are unchanged. Device: count ₹900 against ₹1,000 → checks shown → Count again → T11 → ₹900 → loss → close; T14 reads "Difference · Loss for the day"; Postgres `days.difference_reason = t12.reason.loss`, `counted_cash = 90000`. `T12.test` "HT-23" (3) plus the rewritten sign test. On the way: a chosen reason was never shown as selected (the key was compared to its translation); fixed and tested |

**Not done, and not inferred:** the app does not check a payment gateway itself. It has no
gateway integration, and CLAUDE.md forbids inferring an entry figure. Per decision 3 the
UPI figure is what the shopkeeper confirms. **Estimated profit is unchanged by the loss.**
The shortage is recorded and shown, but it is not subtracted from profit. Subtracting it
changes the profit formula and the vector corpus, so it waits for the product owner's call.

**HT-23 follow-up, profit (decided by the Lead on the product owner's delegation, 2026-10-25).**
In Indian books a cash shortage is a loss and an excess is income: Tally's chart files a
"cash short" ledger under Indirect Expenses and an excess under Indirect Income, and both
flow to Profit & Loss (help.tallysolutions.com, Groups). The engine now has
`profitAfterCashDifference`, which is Estimated Profit less a shortage or plus an excess,
and is null until the day is counted. T14 shows it in the cash-check card as "Profit after
cash difference". **Estimated Profit itself is unchanged**: it is the sheet's formula and
the vector corpus pins it, so the new figure sits beside it. Tests:
`formula-engine/test/cash-difference-profit.spec.ts` (5) and `T14.test` "HT-23" (planted).

### Lead, the pass-2 P3 rows (2026-10-25)

| ID | Status | Evidence |
|---|---|---|
| HT-20 | CONFIRMED-FIXED | A7's no-old-number stage no longer says "Message us" with nothing to message. It says a support line is not set up yet (H6 is human-blocked) and offers "Open the privacy page" (`WEB_PAGE_URLS.privacy`). No WhatsApp promise, no time promise, no address invented. `A7.test` "HT-20" (planted) |
| HT-21 | CONFIRMED-FIXED, device pending | The half-typed entry (digits, section, segment, party) is kept in the sqlite `meta` row `draft` and put back on the form at launch, only on the same open day. It is never committed, and it is cleared on save, discard or leaving the form. `host.spec` "HT-21" (3, planted) |
| HT-22 | CONFIRMED-FIXED, device pending | For 600 ms after the picker closes on a tap, the keypad ignores presses. That is twice Android's 300 ms double-tap timeout, so the rest of a burst lands on nothing. `human-pass2-p3.spec` "HT-22" (planted) |
| HT-25 | CONFIRMED-FIXED | Ten digits that are not a 6-9 mobile number show a quiet line saying why. `A3.test` "HT-25" (planted) |
| HT-26 | CONFIRMED-FIXED | A7 remembers whether it was opened from A3 or A4, and Back returns there. `human-pass2-p3.spec` "HT-26" (planted) |
| HT-27 | CONFIRMED-FIXED, device pending | A disabled tile drops the direction bar and the `inkMuted` control outline for a `border` hairline. Flat, raised fill, muted label (contrast still passes). `human-pass2-p3.spec` "HT-27" (planted) |
| HT-29 | CONFIRMED-FIXED | One name on both screens: "Screen: Light / Dark, bigger text", and Settings is titled "Language and screen". X1 reads S3's keys. Internal ids stay `comfort`/`focus`. hi/or DRAFT (H13). `S3.test` "HT-29" (two plants) |
| HT-30 Hindi Today | FIXED, device pending | Two causes. (1) RN 0.81 Fabric scales a capped Text's `lineHeight` by the full font scale but its `fontSize` by the cap (`TextAttributeProps.setLineHeight`), so at 2.0 the 1.8 leading became 2.4. `tokens.leading` now multiplies by cap/scale above the cap, and uncapped money uses `leadingUncapped`. (2) The "Today so far" label sits in a slot that grows into the free space in its row. `human-pass2-p3.spec` (both planted) |
| HT-30 T6 at Focus 1.3 | OPEN | Not fixed. From the tester's UI dump (`c8/open_typed2.xml`), the body has 509 px above a 1415 px footer. The question and the instruction need about twice that (estimated by the fixing agent from line counts, not measured). At 1.3 the cap does not apply, so the leading fix does not help. Every layout considered trades the cut sentence for a cut keypad. It needs a product call: for example, keypad on tap as X1 does |
| Offline notice leading at 2.0 (pass 4 note) | FIXED, device pending | The same `tokens.leading` correction as HT-30 (1). The notice's line box was 2.4x its glyphs at font 2.0 |

The contact sheet (`npm run sheet`) was not regenerated here: from a worktree it writes
the worktree's absolute font paths into every page. Run it on the main checkout.

## Human-tester pass 6, 2026-10-26 (iQOO I2219, Android 16)

R5 Free and Premium on `cb3f5e3`. Session review: `docs/handover/HUMAN-TEST-PASS-6.md`.
Build verified: installed md5 `57dc3e575f30e811aea2b948102a24b4` equals `app-debug.apk`
(08:10, newer than HEAD 08:09:23). Evidence: `artifacts/device-tests/pass6/` (git-ignored).
Shot times are wall clock (IST). Only two recordings landed: `p6-02.mp4` (from about 08:30:59)
and `p6-03.mp4` (from about 08:46:50). The pass stopped at about 09:31, when the phone locked
with its PIN. Premium was tested against a scratchpad copy of the dev server with billing wired
in (HT-36). Hindi and Odia copy were not judged (H13).

| ID | Sev | Charter | Evidence | Steps | Expected | Actual | Repro |
|---|---|---|---|---|---|---|---|
| HT-36 | P1 | Premium (rig) | `c9-s10`, `c9-s10b`, `c9-s10c` (09:06); `c9-s10-billing` (09:16); Postgres `plan_previews` | Lead's dev server (`node tools/dev-server.mjs`) → Settings → Your plan | S10 offers the 14-day preview (R5 PR-7) | No preview control. `tools/dev-server.mjs` calls `buildApp` without `billing`, so `/v1/billing/entitlement` cannot answer, and `host.refreshPlan` silently keeps Free. With a scratchpad copy that passes `billing: { repo: pgBillingRepo(sql), config: loadBillingConfig(), play: null, keys: null }`, the button appears and the preview starts. Premium cannot be tested on the documented rig | 1/1 (and the counter-test) |
| HT-37 | P2 | Premium I1 | `c13-save400` (09:25:21), `c13-over` (09:26) | ₹300 cash sale → Add items → Rice, How many 2, Amount ₹400 → Save item; again with Rice ₹200 saved and Dal ₹150 | Refused, with the reason: more than what is left of the sale (₹300, then ₹100) | Refused (no `item_lines` row), but it says "Not saved · Type an amount first." while ₹400 (then ₹150) is on screen | 2/2 |
| HT-38 | P2 | Premium I1, 8 | `c13-x` (09:23) and its XML | Items in a sale with 2 items + Other, font 1.0 → pick Rice → type a quantity → look for how to type the amount | The How many / Amount switch is visible next to the figure it sets | The switch is below the fold of the 875-pixel body scroll (body ends at y=1181; "Amount" bounds `[540,1436][1011,1181]`). The footer shows only "How many: 2 ₹0.00", Save item and the keypad. You have to scroll the item list to find Amount. PR-1 plans a 20-40 item list, which pushes it further down | 1/1 |
| HT-39 | P2 | C1 Free and Premium | `c5-en2` (08:51:23), `c16-q1` (09:30) | Ask "which item sells the most", on Free, then on Premium with Rice and Dal recorded | Understood as top items. On Free: needs Premium. On Premium: Rice ₹200 | "Understood as: Best day". On Free, "needs Premium. The free plan can show this: Sales today ₹1,550". On Premium, "The best day was Monday 26 October … ₹1,550". The item question gets a day answer | 2/2 |
| HT-40 | P3 | C1 Premium | `c16-q2` (09:30) | After HT-39's question, ask "sales yesterday" | Sales · yesterday ₹1,550 | "Understood as: Best day · yesterday … The best day was Monday 26 October. 1 days looked at." The previous intent leaks into an unrelated question (the figure itself is right) | 1/1 |
| HT-41 | P3 | C1 | `c5-en3` (08:51:45), `c5-en3-scrolled` (08:52:59) | Ask three questions in a row | The newest answer is in view | The thread stays put. The third answer ("I am not sure what you mean…" and its chips) is below the fold until you scroll | 1/1 |
| HT-42 | P3 | C1 Free and Premium | `c5-en3-scrolled` (08:52:59), `c16-q3` (09:31) | Free: "how much will I sell next week". Premium: "how much does Test Customer 2 owe" | Free: the forecast needs Premium. Premium: Test Customer 2 ₹350 | Free: "not sure", with the chips Sales, How to record udhar, Best day. Premium: "not sure", with chips for both Test Customer 1 and Test Customer 2, though the name was typed exactly | 1/1 each |
| HT-43 | P3 | P2 | `c2-tc1` (08:35:19), `c2-tc1-remind` (08:36:13) | Customer saved without a phone → party page → Remind on WhatsApp | A way to add the number, or a pointer to where | "No phone number saved for this customer." Tapping it gives "**Not saved** · This customer has no phone number saved…". Nothing was being saved, and the app has no screen to add a phone to an existing customer (no string for it in `strings.ts`), so FR-1 can never reach such a customer | 1/1 |
| HT-44 | P3 | P2, Back | `c2-backfrom-udhar` (08:34:14); 08:39:14 | Party page → New udhar sale → Add → Back; party page → Record a collection → Add → Back | Back returns to the party page it came from (Back_Button_Nav) | Back lands on Today both times | 2/2 |
| HT-45 | P3 | S1 | `c8-s1` (09:02:54, secure window, title from the UI tree) | Settings → App lock (Off) | A confirm that says the lock is being turned on | The phone's prompt is titled "SWAFTO is locked" / "Use your phone lock to open your shop book" (`s11.title`), while the user is in Settings with the book open. Back cancels it and the lock stays Off | 1/1 |
| HT-46 | P3 | T1, R1, M1, C1 | `c2-collect` (08:22:05), `c4-r1b`/`c4-r1d` (08:47-08:48), `c15-m1`/`c15-m1b` (09:28), `c16-q2` | Fresh shop, one closed day | Natural counts. Periods before the shop existed are left out or named as such | "Owing for 0 days", "Test Customer 2 · 0 days", "This month so far (1 closed days)", "Rice · 1 sales", "1 days looked at". R1 "Last month" is a full block of ₹0.00 rows, and M1 lists weekly returns/adjustments at ₹0.00 back to 6 October, before the shop was created on 26 October | 1/1 |
| HT-47 | P3 | S9 | `c11-s9-items` (09:19:07) | Your items: add "Rice", "Dal", then "rice" | Refused, saying it is already on the list | "Not saved · Nothing was recorded. Check and try again." No reason is given | 1/1 |
| HT-48 | P3 | 10 | Postgres `days`, `entries` (12:07) | Device clock +24 h (`cmd alarm set-time`) → a ₹300 cash sale → sync | Needs a product call: whether the server should accept a business day dated ahead of its own clock | The server stored day `2026-10-27` (open, opening ₹1,350) and the ₹300 sale with `created_at` 2026-10-26 03:51 UTC. A phone with a wrong clock writes real money onto a future day, and the server accepts it. A fact to decide on, not a ruling | 1/1 |

Not filed (inconclusive): "Remind on WhatsApp" with the synthetic number +91 90000 00062
opened WhatsApp at its inbox, not a chat with the text filled in. The test number is
presumably not on WhatsApp, and a real number was not used. Back from WhatsApp went to
the launcher. The share sheet opened for "Share statement" and the CSV. Neither was shared.

## Human-tester pass 7, 2026-10-26 (iQOO I2219, Android 16)

Re-verification of `43b0aab` plus charters 4-9. Session review: `docs/handover/HUMAN-TEST-PASS-7.md`.
Build verified: the pulled `base.apk` md5 `d1f702ee3dd2b191e136b3cbc1bd55dd` equals `app-debug.apk`
(12:55:08, newer than HEAD 12:52:30). Lead's dev server on 8787, database `swafto_dev3`.
Evidence: `artifacts/device-tests/pass7/` (git-ignored). Shot times are wall clock (IST).
The device clock and timezone were not touched. Hindi and Odia copy were not judged (H13).

### Re-verification of HT-36 to HT-47

| ID | Result | What was seen |
|---|---|---|
| HT-36 | PASS | Lead's server: S10 offers "Try Premium free for 14 days" (`ht36-s10`, 13:09:56). Three taps in one burst: one `plan_previews` row (ends 2026-11-09 07:40 UTC); S10 says "Premium preview ends on Monday 9 November 2026" (`ht36-started`). A second shop's preview also started (14:40) |
| HT-37 | PASS | ₹300 cash sale, Rice x 2 ₹400: "That is more than what is left of the sale. Left to record: ₹300.00" (`ht37-over400`, 13:16:59). After Rice ₹200, Dal x 1 ₹150: "... Left to record: ₹100.00" (`ht37-over150`). `item_lines` holds one row (2, 20000) |
| HT-38 | PASS at font 1.0 | How many / Amount sits in the fixed footer, `[69,992][1011,1168]`, below the body scroll that ends at y=956 (`ht38-i1`, 13:16:15). The item list itself now falls out of view instead: HT-51 |
| HT-39 | PASS | Premium: "Understood as: Top items ... Items are recorded for 67% of sales value ... Rice ₹200.00" (`ht39-q1`, 13:22:37; 200 / 300 = 66.7%). Free (second shop): "Understood as: Top items. That answer needs Premium" (`ht39-free`, 14:22:47) |
| HT-40 | PASS | Next question "sales yesterday": "Understood as: Sales · yesterday" (`ht40-q2`, 13:23:04) |
| HT-41 | PASS | After each new question the newest answer is in view and older ones have scrolled up (`ht40-q2`, `ht42-forecast`) |
| HT-42 | PASS (both parts) | Premium "how much will I sell next week": "Sales estimate ... After 14 closed days, 0 so far" (`ht42-forecast`). Free: "Understood as: Sales estimate. That answer needs Premium" (`ht42-free`). Premium "how much does Test Customer 1 owe": "Udhar to collect · Test Customer 1 ... ₹350.00" (`ht42-party`, 13:58:00), which is 400 + 50 - 100 |
| HT-43 | PASS | Customer without a phone: P2 has "Add a mobile number for reminders" and Save number. Remind before saving: "Could not do that · ... Add the number on this page." (`ht43-nophone`). Saved 9000000072; Postgres `parties.phone` = 9000000072. Remind on WhatsApp sent `whatsapp://send?phone=919000000072&text=Namaste Test Customer 1. This is Test Store. Your account with us shows ₹400.00 due. Please pay when you can. Thank you.` (`ht43-whatsapp-intent.txt`, from `dumpsys activity recents`, 13:29). WhatsApp opened its contact picker and then its home screen; it was left with Back and Home at once, nothing typed, no shot |
| HT-44 | PASS | Party page → New udhar sale → ₹50 Add → Back: party page (`ht44-back1`). Party page → Record a collection → ₹100 Add → Back: party page (`ht44-back2`). System Back from the form also returns to the party page |
| HT-45 | PASS | Settings → App lock: the phone's prompt reads "SWAFTO / Turn on app lock / Confirm with your phone lock" (`ht45-prompt`, 13:33:34). Back cancelled it; the lock stays Off. Nothing was typed |
| HT-46 | PASS, with residue (HT-55) | T1 "Owing since today"; R1 "Days closed 1", no "Last month" block; M1 "This month so far (1 closed day)", "Rice · 1 sale", returns and adjustments start at the week to 26 October; C1 "1 day looked at" (`ht46-*`) |
| HT-47 | PASS | Your items: "rice" after "Rice": "Not saved · That item is already on your list." (`ht47-dup`, 13:14:02) |

HT-21 (draft lost on process death) no longer reproduces: on Sale, Credit, Purchase, Expense,
Collect and Pay a typed ₹123 survived Home, three rotations and `am kill` while in the
background (pid gone, then relaunched), and Postgres received no entry (14:24-14:31).

### New defects

| ID | Sev | Charter | Evidence | Steps | Expected | Actual | Repro |
|---|---|---|---|---|---|---|---|
| HT-49 | P2 | 3 | `c3-over` (13:45), `c3-countedwrong` (13:46:09), `c3-exact` (13:47:22), `c3-t14-summary` (13:48:32), `ht46-r1-4` (13:55:00); Postgres `days` | Count the cash: ₹950 against ₹900 → reason "Counted wrong" → Back → count again ₹900 → "It matches" → Close the day | The reason is dropped when the recount matches; a matched day carries no difference reason (T12 reasons explain a difference) | The reason is kept. T14: "Difference · Counted wrong +₹0.00". R1 Cash checks: "Matched 1 of 1 days" and also "Monday 26 October · Counted wrong +₹0.00". Postgres: `counted_cash` 90000, `difference_reason` `t12.reason.miscount` | 1/1 |
| HT-50 | P2 | 6, ergonomics | `s9-typed`, `s9-dal-kbd` (13:13:29); `ht43-save-kbd` (13:28) | Your items: type "Dal", tap Add to list with the keyboard showing. P2: type a phone number, tap Save number with the keyboard showing | One tap adds or saves | The first tap only closes the keyboard. Nothing is added or saved, and no message says so; a second tap works. C1 Ask works with one tap, so the screens differ | 2/2 screens |
| HT-51 | P2 | 8, Premium I1 | `i1-dal` (13:18) and its XML; `c8-13-i1` (14:45); `c8-20-i1` (14:43); `c8-20-sales` (14:42) | Items in a sale with Rice and Dal. Font 1.0: save one line, then pick Dal. Font 1.3 and 2.0: open the screen | The item choices are visible | Font 1.0, after one line: the body scroll is 650 px (y 306-956) and the items lie below it (Dal `[33,1191]`); a tap aimed at Dal landed in the footer and selected nothing. Font 1.3: items below the fold before any line. Font 2.0: the body shows only the sale card. At 2.0 the Sales form's "Add items to a sale" link is also below its 603 px body. All reachable only by scrolling a small strip | 3/3 sizes |
| HT-52 | P2 | 3 | `c3-closed-udhar`, `c3-closed-add` (13:49:52) | Close the day → Ledger → customer → New udhar sale → 10 → Add | On a closed day the form says so, or points to Post a correction (D7) | The form opens with keypad and Add. Add gives "Not saved · Nothing was recorded. Check and try again." No reason. Same class as HT-11, on the party page route | 2/2 |
| HT-53 | P3 | 5, Back | `eat-1`, `eat-2`, `eat-3` (13:53); `c4-back-in` (14:12), `c4-otp-retry`, `c4-otp-retry2` | After any "Not saved" refusal, press Back | Back leaves the screen (Back_Button_Nav) | The first Back only removes the refusal card, which looks like nothing happened. Once the refusal had moved to the next screen: a wrong-shop refusal from A3 was still drawn on A4's "OTP problems" screen and needed an extra Back there | 3/3 |
| HT-54 | P3 | 4, 7 | `c4-othernum` (14:09), `c7-today-offline` (14:16:25), `c7-delete-offline` (14:35:03) | Sign in with a different number; open "Privacy and what you agreed to" offline; Delete everything offline | Refusals that are not saves are headed "Could not do that" (the HT-43 change) | Still headed "Not saved": "The book on this phone belongs to a different number..."; "Could not reach the server, so what you agreed to cannot be shown"; "No connection, so nothing was deleted..." The text under each heading is honest | 3/3 |
| HT-55 | P3 | C1, M1 | `ht46-m1-5` (13:57:15), `ht39-q1` (13:22:37), `ht40-q2` (13:23:04) | Shop created 26 October, one closed day | Counts in natural form; periods before the shop existed left out (HT-46) | M1: "Rice: sold on 1 days in 90". C1 Top items: "From Thursday 1 October to Monday 26 October". C1 "sales yesterday": "On Sunday 25 October ... ₹0.00", a day before the shop existed | 1/1 each |
| HT-56 | P3 | 4 | `c7-verify-offline` (14:18:14); `rate_events`; `/tmp/devserver.log` | Sign in (13:05), log out and back in (14:06), log out, Send code on the pre-filled old number by mistake (14:08), Send code again (14:11), log out, Send code (14:18) | Needs a product call: a shopkeeper who logs out and fumbles is told how long he must wait and why | "OTP problems · Too many tries. For your safety, try again in 60 minutes." after four sends in 12 minutes. The book is on the phone, signed out, for an hour. This is the `sendPerPhoneBurst` rule (3 per 900 s, lockout 3600 s, `packages/values/src/index.ts`), not a bug. After Log out, A3 pre-fills the last number, which made the extra send easy. A fact to decide on, not a ruling | 1/1 |

Not filed: the first OTP entry at 14:11 was refused as "That code doesn't match" although the
log's latest code was typed; the same code then signed in at 14:13. One SMS was sent for that
burst of three taps. Cause unknown (a missed or doubled digit tap is possible).

## Human-tester pass 8, 2026-10-26 (iQOO I2219, Android 16)

Focused re-verification of `72aeb27`. Session review: `docs/handover/HUMAN-TEST-PASS-8.md`.
Build verified: the pulled `base.apk` md5 `86acb48e1e64f7dca56ea28d419cb5b0` equals `app-debug.apk`
(15:49:26, newer than HEAD 15:47:41). Lead's dev server on 8787, database `swafto_dev3`.
Evidence: `artifacts/device-tests/pass8/` (git-ignored). Shot times are file times (IST).
The device clock and timezone were not touched. Hindi and Odia copy were not judged (H13).

### Re-verification of HT-49 to HT-55

| ID | Result | What was seen |
|---|---|---|
| HT-49 | PASS | ₹1,350 against ₹1,300 → "Counted wrong" → Back → ₹1,300 "It matches." → close. T14 "Difference +₹0.00", no reason (`ht49-t14`); R1 "Monday 26 October +₹0.00", no reason (`ht49-r1-cashchecks4`); Postgres `difference_reason` null |
| HT-50 | PASS | S9 Add to list and P2 Save number each acted on one tap with the keyboard up (`ht50-s9-after-1tap`, `ht50-p2-after-visible-1tap`); Postgres `items` and `parties.phone` agree. P2 needs a scroll first: HT-57 |
| HT-51 | PARTLY FAILS | I1 item choices visible and selectable at font 1.0, 1.3 and 2.0, before and after a saved line. At 2.0 the Sales form's "Add items to a sale" is still out of view: link `[22,895][1058,909]`, body ends at y=909 (`ht51-t7-20`) |
| HT-52 | PASS | Party page on the closed day → New udhar sale (and Record a collection): no keypad; "Could not do that · Today is closed. Post a correction instead." (`ht52-closed-udhar`) |
| HT-53 | PASS | After refusal banners on the party page, Today, S8 and A3, one header Back and one hardware Back each navigated, and no banner was on the next screen (`ht53-*`) |
| HT-54 | PASS | Wrong-shop, privacy-offline and deletion-offline are each headed "Could not do that" (`ht54-wrongshop`, `ht54-privacy-offline`, `ht54-delete-offline`) |
| HT-55 | PASS | M1 "Rice: sold on 1 day in 90" (`ht55-m1-5`); Ask "sales yesterday" on day one: "Nothing is recorded on this phone for that time. On Sunday 25 October.", no ₹0 (`ht55-ask-yesterday`) |

### New defects

| ID | Sev | Charter | Evidence | Steps | Expected | Actual | Repro |
|---|---|---|---|---|---|---|---|
| HT-57 | P3 | 8, ergonomics | `ht50-p2-typed-kbd` (16:03:37) and its XML, `ht50-p2-after-1tap`, `ht50-p2-kbd-scrolled` | Font 1.0. Customer without a phone → P2 → tap "Add a mobile number for reminders" → type 9000000082 | The button that saves the number stays in view while the keyboard is up | Save number lies behind the fixed footer (Record a collection, New udhar sale): its bounds are `[88,1240][992,1196]`, zero height, and the screenshot shows the field then the footer. A tap just above the footer only closed the keyboard; the number was not saved and no message said so. After scrolling the body up, Save number came into view and one tap saved it | 1/1 |
| HT-58 | P3 | 8, layout | `ht51-i1-10-before` (16:08:51) | Font 1.0. Items in a sale → Cash sales ₹300 | The "Items recorded for ₹0.00 of the sale ₹300.00" line wraps inside the card's padding | The wrapped "₹300.00" starts at the card's left edge, flush with the border, left of the other text in the card. At 1.3 and 2.0 the line wraps after "of the sale" inside the padding (`ht51-i1-13-before`) | 1/1 |
| HT-59 | P3 | 2, Sales | `t7-back` (16:07:42) and its XML; `pg-entries.txt` | Sales → type 300 (not added) → tap "Add items to a sale" → Back | Either the typed amount is kept when coming back, or the user is told it was not saved. I1 says "The sale is saved already" | I1 listed only the earlier udhar sale; Back to Sales showed Amount ₹0.00, the 300 gone. No entry reached Postgres; the only cash sale is the one added at 16:08:07 | 1/1 (not repeatable: the day was closed afterwards) |

Not filed: the driver's `tap "Add"` matched "Add items to a sale" first (a label prefix match),
which is how HT-59 was reached. A tester tool limit, not an app defect.

## Human-tester pass 9, 2026-10-26 (iQOO I2219, Android 16)

Focused re-verification of `da39229`. Session review: `docs/handover/HUMAN-TEST-PASS-9.md`.
Build verified: the pulled `base.apk` md5 `ba53972fc586e32770bb6314f814c313` equals `app-debug.apk`
(17:47:17, newer than HEAD 17:44:32). Lead's dev server on 8787, database `swafto_dev3`, shop
"Test Store D" (+91 90000 00091). Evidence: `artifacts/device-tests/pass9/` (git-ignored). Shot
times are file times (IST). The device clock and timezone were not touched. Hindi and Odia copy
were not judged (H13).

### Re-verification of HT-51, HT-57, HT-58, HT-59

| ID | Result | What was seen |
|---|---|---|
| HT-59 | PASS | Typed 300 → Add items to a sale → header Back, and again with hardware Back: Amount ₹300.00, Total so far ₹100.00 (`h59-a3-headerback`, `h59-b2-hwback`). The same through Return or exchange a sale (`h59-c2-return-headerback`, `h59-c3-return-hwback`). Back to Today and reopen Sales: Amount ₹0.00 (`h59-d2-reopen`). Postgres: no 300 entry. I1 reads "Only sales already added are listed" |
| HT-51 | PASS | Font 2.0: "Add items to a sale" `[22,328][1058,482]` at the top of the Sales body (`h51-t7-20`); font 1.3 the same (`h51-t7-13`). I1 with six items: every choice reachable by scrolling and selectable at 1.3 and 2.0, before and after a saved line (`h51-i1-20-other-picked`, `h51-i1-13-after`). Side effects: HT-60, HT-61 |
| HT-57 | PASS | Keyboard up, Save number `[640,1039][992,1193]` in view above the footer; one tap saved it (`h57-a2-after-1tap`, `parties.phone` 9000000092). IME action (`KEYCODE_ENTER`) also saved (`h57-b2-after-done`, `parties.phone` 9000000093) |
| HT-58 | PASS | Font 1.0, sale ₹1,200.00: the wrapped "₹1,200.00" starts at x=88, the card's text inset (`h58-i1-10-1200`) |

### New defects

| ID | Sev | Charter | Evidence | Steps | Expected | Actual | Repro |
|---|---|---|---|---|---|---|---|
| HT-60 | P3 | 8, ergonomics | `h51-t7-20` (18:13:20) and its XML; compare `h51-t7-13`, `s06-t7-after100` | Font 2.0. Two cash sales (₹100, ₹1,200) → Today → Sale | The day's running total stays in view on the Sales form, as at 1.0 and 1.3 (the shopkeeper trusts the big number) | The two links now sit at the top of the 603 px body `[0,306][1080,909]`, and "Total so far ₹1,300.00" is pushed to `[88,895][646,909]`, a 14 px strip: the screenshot shows the card's top edge and no figure. The per-sale rows are below it. It comes into view only after scrolling that strip. The HT-51 fix moved the hidden element from the link to the total | 1/1 |
| HT-61 | P3 | 8, ergonomics | `h51-i1-20-other-picked` (18:15:36), `h51-i1-20-picked-scrolled`; `h51-i1-13-dal-picked` (18:18:35) | Items in a sale with six items (Rice, Dal, Sugar, Oil, Atta, Salt). Font 2.0: scroll, tap Other. Font 1.3: tap Dal | The picked item stays in view (or the list scrolls to it), so the user can see what is being recorded before typing How many and Amount | Once an item is picked the keypad opens and the list's body shrinks: at 2.0 to `[0,306][1080,816]`, showing only the end of the sale card and "Which item?"; Other (`selected="true"`) is at `[33,1953]`, out of view. At 1.3 Dal (`selected="true"`) is cut to a 9 px strip `[33,1116][1047,1125]`. The choice can be seen again only by scrolling that pane (`h51-i1-20-picked-scrolled`) | 2/2 (1.3 and 2.0) |
