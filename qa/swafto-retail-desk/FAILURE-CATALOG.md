# Failure catalog: SWAFTO Retail Desk, on-device campaign (productionize Wave 5)

Owner: scenario-designer (QA & Reliability). Written 2026-11-18 from a code and document read
only. No phone, server or database was touched to write it. Plan: `PLAN.md` (same folder).
Authorised by Saket for his own app, on his own phone, against the local dev API and the
Postgres test DB only.

Sources read: `CLAUDE.md`, `PLAN.md` §2/§5/§6, `docs/audit/REPORT.md` (C-01 to C-24),
`docs/handover/DEFECTS.md` (F-, DV-, HT-1 to HT-61), `HUMAN-TEST-PASS-10.md`,
`apps/mobile/src/{app/App.tsx, app/session.tsx, host.tsx, net/client.ts, net/backoff.ts,
store/index.ts, screens/*, i18n/strings.ts}`, `apps/api/src/auth/routes.ts`, `tools/dev-server.mjs`.

The catalog is ranked: **P0** = money correctness or data loss, **P1** = core flow blocked,
**P2** = UX quality. Pillars: **HE** = human error, **DN** = device and network, **SF** = server
fault. Severity if it fails uses the repo's scale: **S1** money wrong or data lost, **S2** core
flow blocked or unsafe, **S3** degraded or confusing, **S4** cosmetic.

---

## 0 · Read this before touching the phone

### 0.1 Data classes (what each scenario does to the TEST STORE D install)

| Class | Meaning | Count |
|---|---|---|
| **SAFE** | Reads, or adds synthetic entries to the open 26 Oct day. It never clears or freezes anything. Clock scenarios included; restore auto-time after | 64 |
| **SAFE-LO** | Safe, but needs Log out and a fresh OTP sign-in. Run these only after R-02 has proved the test DB holds this book's shop. Mind the burst limit: 3 sends per 15 min, then a 60-min lockout (HT-56) | 8 |
| **ONE-WAY** | An irreversible state change on the existing data, such as closing 26 Oct (D7 freezes it). It runs **once**, after every SAFE scenario that needs the open stale day, and needs CTO sign-off | 2 |
| **AFTER-CLOSE** | Becomes SAFE once CL-07 has closed 26 Oct | 5 |
| **FRESH** | Needs a separately installed build. **`applicationId` is the fixed `com.swafto`** (`android/app/build.gradle:179`), so a second install needs an `applicationIdSuffix ".qa"` debug variant (a CTO build change) or a second device. Otherwise the scenario is deferred and marked so | 9 |
| **NEVER on existing** | ST-02 (delete account). It wipes the phone's book (`host.tsx` `#wipe` → `store.eraseAll`). FRESH only | (inside FRESH) |

**Running order for the existing install:** R-01, R-02, then every SAFE P0, every SAFE P1, SAFE
P2, the SAFE-LO block, then **CL-07** (the one real close of 26 Oct, offline), then the
AFTER-CLOSE block. FRESH runs whenever a `.qa` build exists.

**Stale day is the default state.** The open day is 26 Oct and today is 18 Nov, so C-17 blocks
the six Today tiles. Entry scenarios therefore run through **Today → "Close it now" → T5 →
section row → form**. That path is allowed on a stale day (`session.tsx:1222`) and writes to
26 Oct without closing anything. DV-04 (clock set back to 26 Oct) is the alternative when a
scenario must start from a Today tile.

### 0.2 Rig hazards found while reading the code (check them before R-01)

1. **Restarting the dev server can kill the session.** `tools/dev-server.mjs:134` generates a
   random `SESSION_SIGNING_KEY` on every boot unless the env var is set. Refresh tokens are
   signed with that key (`auth/routes.ts:288`), so a plain restart means every refresh gets a
   401, then A6, then a re-sign-in. **Before any SF scenario that stops the server, export a
   fixed `SESSION_SIGNING_KEY` and `RATE_LIMIT_KEY`.** It must be the same key the phone's
   current tokens were minted with. If that key is unknown, R-02 decides what happens.
2. **The book is bound to one shop for good** (`host.tsx:809-818`). PLAN.md names the DB
   `swafto-pg-test`, but pass 10 ran on `swafto_dev3`. If the current DB does not hold Test
   Store D's `shops.id`, a re-sign-in creates a *new* shop and the wrong-shop guard then refuses
   it, so the book can never sync again. **ABORT any sign-in on the existing install until
   `select id,name from shops` shows the bound shop.**
3. **Airplane mode does not cut the API.** `adb reverse` tunnels over USB, so wifi off or
   airplane mode leaves `localhost:8787` reachable, and the app has no NetInfo
   (`Root.tsx:117`). Simulate "no network" at the tunnel instead:
   - *Refused* (no tower, fails fast): `adb reverse --remove tcp:8787`
   - *Black hole* (thick walls, hangs until the 60 s `REQUEST_TIMEOUT_MS`): the fault proxy in
     `blackhole` mode

   Airplane mode is still worth a pass, but only for what the UI claims.
4. **Never use `monkey` with random events on the existing install.** It can reach S7 → S8
   "Delete everything". Use scripted taps only.
5. **The phone has a PIN.** App lock (ST-04) and reboot (DV-08) need Saket at the phone. The
   tester never types the owner's PIN.

### 0.3 Shared commands (`A="adb -s 10BE6H031T000BN"`)

| Need | Command |
|---|---|
| Screenshot + UI tree | `$A exec-out screencap -p > evidence/<ID>/<step>.png` · `$A shell uiautomator dump /sdcard/u.xml && $A pull /sdcard/u.xml evidence/<ID>/<step>.xml` |
| Logcat | `$A logcat -c` then `$A logcat -v time ReactNativeJS:V AndroidRuntime:E SQLiteLog:W *:S > evidence/<ID>/logcat.txt` |
| Launch / OS kill / force-stop | `$A shell monkey -p com.swafto -c android.intent.category.LAUNCHER 1` · `$A shell input keyevent KEYCODE_HOME; $A shell am kill com.swafto` · `$A shell am force-stop com.swafto` |
| Double tap (< 100 ms) | `$A shell "input tap X Y; input tap X Y"` (take X Y from the UI dump bounds) |
| Back / Home | `$A shell input keyevent KEYCODE_BACK` / `KEYCODE_HOME` |
| Rotate | `$A shell settings put system accelerometer_rotation 0; $A shell settings put system user_rotation 1` (0 to restore) |
| Font scale | `$A shell settings put system font_scale 1.3` (2.0, then 1.0). A scale change restarts the app (the HT-35 fix) |
| Notification | `$A shell cmd notification post -S bigtext -t "Supplier" qa1 "Payment due"` |
| Call-like interruption | `$A shell am start -a android.intent.action.DIAL -d tel:9000000000` (covers the app; nothing is dialled) |
| Clock / timezone | `$A shell settings put global auto_time 0` · `$A shell cmd alarm set-time <epoch-ms>` · `$A shell cmd alarm set-timezone Asia/Kolkata`. **Restore:** `auto_time 1`, `auto_time_zone 1` |
| Battery saver / doze / memory | `$A shell cmd power set-mode 1` (0 to restore) · `$A shell dumpsys deviceidle force-idle` (`unforce` to restore) · `$A shell am send-trim-memory com.swafto RUNNING_CRITICAL` |
| Offline / online | `$A reverse --remove tcp:8787` / `$A reverse tcp:8787 tcp:8787` |
| Fault proxy | `$A reverse tcp:8787 tcp:8788`, with the proxy on 8788 forwarding to 8787 (spec in 0.4) |
| Flapping | a loop that alternates remove and restore every 3–5 s for 2 min |
| DB oracle | `psql $DATABASE_URL -c "select section,mode,amount_paise,day_date,created_at from entries where shop_id='<id>' order by created_at desc limit 20"`. Also `days`, `parties`, `section_skips`, `upi_confirmations`, `adjustments`, `devices`, `consents`. Check column names against `packages/schema/src` first |

### 0.4 Fault proxy (tester builds it in their scratchpad, not in the repo)

A Node `http` proxy of about 40 lines, listening on 8788 and forwarding to 8787. Its mode can
be switched at runtime (a control file, or `GET /__mode?...` on its own port). Each mode can be
filtered to one path prefix (`/v1/sync/push`, `/v1/auth/refresh`, `/v1/auth/otp/`, `/v1/reports`):

| Mode | Behaviour |
|---|---|
| `pass` | Forward as-is |
| `delay:<ms>` | Wait, then forward |
| `slow3g` | 3–8 s random delay, body streamed at about 20 kB/s |
| `status:<code>[:<retry-after>]` | Answer without forwarding (500/502/503/429). Retry-After may be seconds or an HTTP-date |
| `blackhole` | Accept the connection and never answer |
| `drop-response` | Forward, let the server commit, then destroy the socket before replying |
| `reject-one` | Forward, then rewrite the `/v1/sync/push` answer so one accepted id appears as rejected |
| `garbage` | 200 with an HTML body or truncated JSON |

Log every request with a timestamp. That log is the evidence for backoff and retry timing.

### 0.5 Standing oracles (checked in every P0 money scenario)

- **O-1 Cash equation (D2, D3):** Expected in box = opening + cash-mode money in − cash-mode
  money out. UPI, Other, Udhar and Shop stock never move it. A withdrawal is outside profit.
  Recompute it by hand from the DB rows and compare it with Today, T11 and T14.
- **O-2 One typed figure = one row:** the count of `entries` rows (DB) matches the count of
  amounts the tester typed and saved, and "N waiting to sync" returns to 0.
- **O-3 Nothing silently lost:** a figure the server refuses stays on the phone and is counted
  as "could not be sent" (FE-11 parking). It is never deleted.
- **O-4 No crash:** no `FATAL EXCEPTION` or `AndroidRuntime` lines, and no error-boundary
  screen, unless the scenario asks for one.

**Abort and tell the CTO** if a figure fails to reconcile under O-1, a row disappears (O-3), any
step could clear the book, or the phone stops responding (PLAN.md).

---

## 1 · Rig and smoke

| ID | Pri | Pillar | Data | Inject (steps) | Expected safe behaviour | Observe | Sev |
|---|---|---|---|---|---|---|---|
| R-01 | P0 | DN | SAFE | Before: screenshot Today and record the DB counts (entries, item_lines, parties) for the shop. Then `adb install -r` the Wave-5 debug APK and launch | The local migration (outbox parking columns) keeps every entry, party and queued row. Today's figures match the before-shot exactly. The stale notice reads "still open for Monday 26 October". No crash | Before/after shots, logcat (SQLite and migration errors), DB counts unchanged | S1 |
| R-02 | P0 | SF | SAFE | (a) Confirm the DB holds the bound shop and the dev server runs with a fixed key. (b) Restart the server with the same key, then use the app. (c) Only if the key is unknown: restart with a new key and let the app hit the 401 | (b) No sign-out. (c) A6 appears once, and the book, the queue and the stale day are all intact (no wipe). After re-sign-in with the same number, the queue drains to the **same** `shops.id` | Server log (`refresh` 401), shots of A6 and Today, DB `shops`/`devices`, entries count | S1 |

## 2 · First run, onboarding and consent (A1, A2, X0, A3, A4, X1, T2, T6): all FRESH

| ID | Pri | Pillar | Data | Inject (steps) | Expected safe behaviour | Observe | Sev |
|---|---|---|---|---|---|---|---|
| ON-01 | P1 | HE | FRESH | A1 → A2 pick ଓଡ଼ିଆ → X0 → Back → A2 pick हिन्दी → X0. Accept only the mandatory purpose and decline the optional ones | Back returns to A2 (HT-3). X0 re-renders in Hindi. Optional purposes start unticked. The OTP is never presented as optional (F-29). Declining optional consent does not block sign-up | Shots per step, DB `consents` rows match the choices | S2 |
| ON-02 | P0 | HE | FRESH | X1 opening cash: type `100000001` (over ₹1 crore), then `0`, then `12345`, then Start | Over ₹1 crore is refused in words (C-09). ₹0 is accepted or explained. ₹12,345 shows as "₹12,345.00" with Indian grouping and Latin digits. DB opening = 1234500 paise exactly | Shots, DB `days` opening column | S1 |
| ON-03 | P1 | HE | FRESH | Kill (`am kill` after Home) at each step: A3 with the number typed, A4 with 3 of the code digits, X1 with the name typed, X1 with the opening cash typed. Relaunch each time | Resumes at the right step. Typed answers survive (PLAN §6, process death). No duplicate `users`/`shops`/`days` rows. No step can be skipped | Shots, DB row counts | S2 |
| ON-04 | P1 | SF | FRESH | A3 Send code with the tunnel removed, then with the proxy in `blackhole`, then `status:503`. Repeat at font 2.0 | A plain offline/unavailable message, visible above the keypad at 2.0 (HT-18/HT-34). No endless spinner. The blackhole case ends at the 60 s timeout. Send works once after restore | Shots, proxy log | S2 |
| ON-05 | P1 | HE | FRESH | Double-tap "Agree" on X0 and "Start the day" on X1 | One consent record per purpose, one shop, one opening day | DB `consents`, `shops`, `days` | S2 |

## 3 · Sign-in, OTP and session (A3–A8, refresh)

| ID | Pri | Pillar | Data | Inject (steps) | Expected safe behaviour | Observe | Sev |
|---|---|---|---|---|---|---|---|
| AU-01 | P1 | HE | SAFE-LO | Log out → A3 → Send → type a wrong code 1, 2, then 3+ times, then the right code (read from the dev-server log) | "Wrong code" while attempts remain, then "expired, send a new one" past the per-code limit (`host.tsx:829-840`). The book is untouched | Shots, server log, DB `rate_events` | S2 |
| AU-02 | P1 | HE | SAFE-LO | Double-tap Send code, then hammer Resend | One SMS per accepted request. The resend timer is honoured. The request body carries `deviceId` (Wave 4) | Server log (count of SMS blocks, body), DB `rate_events` | S2 |
| AU-03 | P1 | SF | SAFE-LO | (a) Proxy `status:429:120` on `/v1/auth/otp/`. (b) The real limit: a 4th send within 15 min | A5 states the wait in his language, matching the server's figure. No automatic retry loop. **Record as a product finding:** a signed-out shop cannot record sales during the 60-min lockout (HT-56) | Shots, proxy and server log | S2 |
| AU-04 | P1 | HE | SAFE-LO | On A4: Home → open Messages for 20 s → back. Then type two characters of the code and `am kill` → relaunch | The code boxes, typed digits and timer survive the switch. After the kill: back on A4 (or A3 with the number pre-filled), and the old code still works within its life | Shots | S3 |
| AU-05 | P1 | SF | SAFE-LO | Proxy `delay:20000` on `/v1/auth/otp/verify`, then `delay:65000`. Tap Verify twice while it waits | Busy state, with Verify disabled during the wait. One verify request. A timeout reads as offline, never "wrong code". No half-signed-in state | Proxy log, shots, logcat | S2 |
| AU-06 | P0 | HE | SAFE-LO | Log out → A3 → type a different number (+91 90000 00092) → Send | Refused **before** any SMS: "belongs to a different number" (HT-32). No `users` row is created. The book is intact | Shot, server log (no SMS), DB `users` | S1 |
| AU-07 | P1 | SF | SAFE | Make the client refresh: proxy returns `status:401` once on a data call. Then answer `/v1/auth/refresh` with 502, then 429:60, then `blackhole` | C-18: the session is **kept** (no A6, no OTP). One refresh attempt per 401, never a loop. Entries keep queuing and drain after the fault clears | Proxy log (request count), shots, "waiting to sync" | S2 |
| AU-08 | P1 | SF | SAFE-LO | Proxy `drop-response` on `/v1/auth/refresh` (the server rotates, the phone never hears it). Next refresh within the grace window, then one beyond it | Within grace: accepted (server log `refresh_grace_used`). Beyond it: reuse detection revokes the device → A6 once, with the book and queue kept | Server log events, shots | S2 |
| AU-09 | P0 | SF | SAFE-LO | Queue 2 entries offline. Revoke the device in SQL (`devices`) and restore the network. Then sign in again. Then Settings → Log out (A8): Back first, then double-tap Log out, then Back and Recents | A6 shown once. The 2 entries are kept and counted, then drain after sign-in (HT-9). A8's Back cancels. Double-tap gives one logout. After logout, Back and Recents never show the book (HT-12). **Logout never deletes the ledger** (`host.tsx:847`) | Shots, DB entries (+2 exactly), logcat | S1 |

## 4 · Today and the stale open day (T1, C-17)

| ID | Pri | Pillar | Data | Inject (steps) | Expected safe behaviour | Observe | Sev |
|---|---|---|---|---|---|---|---|
| TD-01 | P0 | HE | SAFE | Launch on the stale day. Tap each of the six tiles once, then double-tap Sale | Each tap gives the "still open for an earlier day, close it first" refusal. **No entry** is created on 26 Oct or 18 Nov. No crash on the double tap. Nothing rolls over or closes by itself (D6) | Shots, DB entries count unchanged | S1 |
| TD-02 | P0 | HE | SAFE | Today → "Close it now" → T5 → Cash sales → ₹1 → Add → back to Today | Saved to **26 Oct** (DB `day_date`). T5 names 26 Oct. Today's cash received and Expected rise by exactly ₹1 (O-1). The day stays open | Shots before/after, DB row | S1 |
| TD-03 | P0 | HE | SAFE | Via T5: a UPI sale of ₹500 | Net sales +₹500. **Expected in box unchanged** (D2; the known §4 defect must not be in the code) | Shots, O-1 by hand | S1 |
| TD-04 | P1 | SF | SAFE | Queue 2 offline sales and force one parked row (SY-07). Read the Today sync line | "2 waiting to sync" counts typed entries only, not the day row (HT-33). Parked rows appear as a separate "could not be sent" count | Shots | S2 |
| TD-05 | P2 | HE | SAFE | At font 1.0/1.3/2.0, take the UI dump of Today, T5 and the Sale form | The primary action (Close it now, Sale, Add) sits in the bottom thumb zone (y > ~40% of 2408). Keypad targets at or above the registry floor `TOUCH_TARGET_MIN_DP` (stricter than the generic WCAG figure), with visible gaps between them. Clear and Add are not adjacent to each other. Records C-20 (Today built around close, not sale) as a UX finding | UI dump bounds, shots | S3 |
| TD-06 | P2 | HE | SAFE | Scripted burst: Today → Ledger → Reports → Settings → Today, 20 taps in 5 s (**not** monkey) | No crash, no duplicate screens, no error boundary | Logcat, shot | S3 |

## 5 · Entry types (T7 sale, T8 collect/pay/credit, T9 expense, T10 withdrawal, T18 return/exchange): reached via T5 on 26 Oct

| ID | Pri | Pillar | Data | Inject (steps) | Expected safe behaviour | Observe | Sev |
|---|---|---|---|---|---|---|---|
| EN-01 | P0 | HE | SAFE | Cash sale ₹100: double-tap Add (< 100 ms), then triple-tap on another ₹100 | Exactly one row per typed amount (O-2). Today moves once per sale | DB entries, shots | S1 |
| EN-02 | P0 | HE | SAFE | Type 250 in Sale (Cash) → switch to UPI → Add. Then type 250 → switch to Udhar with no customer → Add | First: section `upi_sales`, mode `upi`, Expected unchanged. Second: refused, asking for a customer, with the amount kept | DB section/mode, shots | S1 |
| EN-03 | P0 | HE | SAFE (refusal side) · FRESH (accept-at-max) | Type `10000001` → Add. Tap 0 twenty times. On FRESH only, save exactly `10000000` twice | Over ₹1 crore is refused in words (C-09). Digits stop at 8 (`MAX_DIGITS`). No e-notation, NaN or overflow. On FRESH, two ₹1 crore entries still let summary, close and reports render (no 500) | Shots, DB, logcat, server log 5xx | S1 |
| EN-04 | P1 | HE | SAFE | Add with nothing typed. ₹0. `0005`. Type 300 → Clear → Add | Add is disabled or refused for empty and ₹0. `0005` becomes ₹5.00. Clear empties the amount, and no entry is made | Shots, DB | S2 |
| EN-05 | P1 | HE | SAFE | Type 437, then Home + `am kill` → relaunch. Repeat with `force-stop` | The draft is restored on the same form and mode (PLAN §6; HT-21) **and not saved**. Force-stop may lose the draft but never saves it. **P0 if a phantom entry appears** | Shots, DB unchanged | S2 (S1 if phantom) |
| EN-06 | P1 | HE | SAFE | Type 820, then post a notification and open the dialer for 30 s → return | The amount is intact. Nothing was saved. The keypad still answers | Shots, DB | S2 |
| EN-07 | P1 | HE | SAFE | Type 560 → rotate to landscape and back. Type 333 → font 1.0 → 1.3 (the app restarts) | The amount survives the rotation, and every key is reachable or the orientation is locked (HT-17). The draft survives the font restart (PLAN §6), or the loss is recorded as a defect | Shots, UI dump | S2 |
| EN-08 | P0 | HE | SAFE | Credit (udhar sale) ₹75 to Test Customer 1. Then Add new customer → name → triple-tap "Save and choose" | Customer balance +75, Expected unchanged (D2), outstanding +75. Exactly one new party, and no stray digit lands on the keypad (HT-22) | DB entries/parties, P2 balance | S1 |
| EN-09 | P0 | HE | SAFE | Pay supplier ₹40. Collect ₹30 from a customer. Collect ₹500 from a customer who owes ₹75 | Pay = `party_payment`, cash −40, supplier owed −40. It is never recorded as a collection (the `entryRoutes.ts` defect history). Collect: cash +30, owed −30. Over-collection is refused or explicitly named as an advance, never a silent negative balance | DB section/party, P2/P3 | S1 |
| EN-10 | P0 | HE | SAFE | Expense ₹60 in each of Cash, UPI, Other, Shop stock, Udhar. Withdrawal ₹200 cash and ₹50 UPI | Only the cash expense and the cash withdrawal move Expected (D2). Each line names its mode (HT-6). Withdrawals sit outside profit (D3; checked again on T14) | O-1 by hand, shots | S1 |
| EN-11 | P0 | HE | SAFE | Return a ₹100 cash sale in each of the four settlement states. Exchange as one event. Try a return larger than the sale. Double-tap Save | Cash moves only for a cash refund. The exchange is one linked event. An over-return is refused. Double-tap gives one event | DB entries (links), Today, O-1 | S1 |
| EN-12 | P1 | HE | SAFE | On every form with an amount typed: header Back and hardware Back. Wrong order: open Credit → Back inside the picker → open Pay | Back returns to the origin (T5 or the party page; HT-44), and the amount is either kept or he is told it was not saved. After a refusal banner, one Back navigates (HT-53). Pay's picker lists suppliers, not customers. No amount carries into the wrong form | Shots | S2 |
| EN-13 | P0 | HE | SAFE | Script 20 cash sales of ₹1 in 30 s with the server up, then 20 more offline → restore | 40 rows in the DB, Today +₹40, the queue back to 0. No duplicates after the retries (idempotent ids) | DB count, shots | S1 |
| EN-14 | P1 | HE | SAFE | New party name: 200 chars; Odia and Devanagari; emoji; zero-width characters (via ADBKeyBoard or the clipboard). Ask (C1): the same strings in mixed scripts | Stored and shown as typed, wrapping inside its row. It syncs, or the server refuses it with a reason and the row is parked (O-3), never stuck re-sending. C1 says "not sure" rather than inventing a figure | Shots, DB `parties`, server log | S2 |

## 6 · Day close (T5 ten steps, UPI check, T19 adjustments, T11 count, T12/T13, T14)

| ID | Pri | Pillar | Data | Inject (steps) | Expected safe behaviour | Observe | Sev |
|---|---|---|---|---|---|---|---|
| CL-01 | P0 | HE | SAFE (pre-commit) | T5: read the ring ("x of 10"). Mark "Nothing to enter" on an empty section, then add an entry to it. Try "Nothing to enter" on a section that has entries. Wrong order: open the cash count while sections are untouched | Each row is untouched, skipped or entered, never by colour alone. Adding to a skipped section makes it entered. A skip cannot contradict entries. The count either warns about untouched sections or blocks; an incomplete close is never presented as complete | Shots, UI dump (unique labels, HT-28) | S1 |
| CL-02 | P0 | HE | SAFE (pre-commit) | Open T11 | Expected is shown as its working, line by line, and equals O-1 computed from the DB. **UPI sales are not in cash received** | Shot, hand calculation from DB | S1 |
| CL-03 | P0 | HE | SAFE (pre-commit) | Count = expected → T13. Short by ₹85 → T12. Over by ₹115 → T12. Pick a reason → Back → count again to exact. **Stop before Close** | The reason is required on a difference. Reasons fit the sign (HT-23). A recount to exact clears the old reason (HT-49). There is no free-form reason (decision 2) | Shots | S1 |
| CL-04 | P0 | HE | SAFE (pre-commit) | On T11 with a count typed, and on T12 with a reason picked: `am kill`; dialer interruption; rotate; font 2.0. Relaunch | **No close happened** (the day is still open and stale). The count is restored or asked again. A closed day without a count is impossible | DB `days.state`, shots | S1 |
| CL-05 | P0 | HE | SAFE | UPI check on T5: confirm one receipt, then "all". Double-tap Confirm | Actual UPI = the sum of the confirmed receipts (decision 3). Double-tap does not double-count. A confirmation the store refused is said out loud, never dropped | DB `upi_confirmations`, shots | S1 |
| CL-06 | P0 | HE | SAFE | T19 adjustment: check the list is fixed (no text field). Over ₹1 crore. Double-tap Save | Types only from the fixed list. The bound is refused. One row per save. Expected changes as the type says | DB `adjustments`, shots | S1 |
| CL-07 | P0 | SF | **ONE-WAY** (the only 26 Oct close; CTO sign-off) | After every SAFE scenario: remove the tunnel → T5 → count → Close (single tap) → T14 → restore the tunnel | It closes offline. T14 shows the figures and estimated profit, with withdrawal outside it (D3). On restore, the day row and every queued entry are **accepted**, none parked (C-05 replay after close). Skips reach `section_skips` (HT-19). DB `days` matches T14 | Shots T13/T14/T3, DB `days`/`entries`/`section_skips`, proxy and server log | S1 |
| CL-08 | P0 | HE | ONE-WAY (the 18 Nov day, on a later real day) or FRESH | Double-tap "Close the day" with the proxy at `status:503` on `/v1/sync/push`, then `pass` | One close (a single `closed_at`). The 503 is backed off, not parked. Sync completes later | DB, proxy log | S1 |
| CL-09 | P0 | SF | FRESH | Close with 15 queued entries. `drop-response` on the first push, `am kill` during the second, relaunch | Each entry is in the DB exactly once. The frozen day is not touched twice. The queue drains (FE-5 per-batch ack) | DB counts, proxy log | S1 |
| CL-10 | P0 | HE | AFTER-CLOSE | Try to write to 26 Oct: party page → New udhar sale; Back-stack into T5/T7; a stale outbox row (via SY-07) | Every route is refused, pointing to Post a correction (HT-52). The DB trigger refuses (D7). A refused row is parked and visible, never lost | Shots, server log, DB unchanged for 26 Oct | S1 |
| CL-11 | P0 | HE | AFTER-CLOSE | After CL-07, open Today on 18 Nov | The gap rule applies: opening cash is **asked** (T4/T6), not invented or silently carried across 22 unclosed days. The 18 Nov day opens with exactly the typed figure | Shots, DB `days` | S1 |

## 7 · Corrections and closed days (T16, T3)

| ID | Pri | Pillar | Data | Inject (steps) | Expected safe behaviour | Observe | Sev |
|---|---|---|---|---|---|---|---|
| CO-01 | P0 | HE | AFTER-CLOSE | Post a correction of ₹5 (cash sales) against 26 Oct | A new entry dated 18 Nov that references 26 Oct (D1). 26 Oct's rows and T14 figures are unchanged. The correction is visible as a correction. Re-checks HT-11 | DB entries (reference column), shots of 26 Oct before/after | S1 |
| CO-02 | P1 | HE | AFTER-CLOSE | Correction: double-tap Save; Back mid-way; post offline → restore | One row. Back saves nothing. The offline correction syncs once | DB, shots | S2 |
| CO-03 | P1 | HE | AFTER-CLOSE | T3 (and the 26 Oct history view): tap each disabled tile | Tiles look disabled (HT-27) and each tap says why (E2). The history is read-only, with no edit affordance | Shots | S2 |

## 8 · Parties and udhar (P1, P2, P3, P5, P6)

| ID | Pri | Pillar | Data | Inject (steps) | Expected safe behaviour | Observe | Sev |
|---|---|---|---|---|---|---|---|
| PA-01 | P0 | HE | SAFE | Open each customer and supplier page | The running balance = credit sales − collections (customer), and purchases on credit − payments (supplier). It matches the DB. Aging reads correctly for 26 Oct ("owing since…", HT-46) | Shots, DB sum | S1 |
| PA-02 | P1 | HE | SAFE | Add "Test Customer 1" again, and the same phone on a new name | Refused or clearly distinct. No silent merge of balances | Shots, DB `parties` | S2 |
| PA-03 | P1 | HE | SAFE | P6: set a credit limit of ₹100, then a credit sale of ₹150. Limits of ₹0 and over ₹1 crore | Over-limit is shown as an observation for him to decide, never an auto-block or a guess (CLAUDE.md, no inference). The bounds are refused in words | Shots, DB `party_credit_limits` | S2 |
| PA-04 | P1 | HE | SAFE | Edit a party: phone `1234567890`, `0123…`; rename | An invalid phone is refused with a reason (HT-25). A rename moves no money and keeps the history | Shots, DB | S2 |
| PA-05 | P1 | DN | SAFE | Offline: add a party and a credit sale to it → restore | The party is accepted before or with its entry, and nothing is parked for an unknown party | DB, server log | S2 |

## 9 · Reports and exports (R1, M1, C1, S12)

| ID | Pri | Pillar | Data | Inject (steps) | Expected safe behaviour | Observe | Sev |
|---|---|---|---|---|---|---|---|
| RP-01 | P0 | HE | SAFE | Read every period on R1 (and M1 if Premium) | Each labelled range equals the sum over its days in the DB, not one day (C-08) | Shots, DB sums | S1 |
| RP-02 | P1 | HE | SAFE | Read the gated metrics | Gates are stated plainly (closed days so far / needed). No fabricated ₹0 or "0 days" (HT-46/55) | Shots | S2 |
| RP-03 | P1 | HE | SAFE | S12: share a month with data → cancel the share sheet. Share again to Files if one exists | Cancel does not crash. The file has exact rupees and paise, UTF-8 Odia names and the stated header (LEGAL-AUDIT §7) | Logcat, the pulled file | S2 |

## 10 · Settings, privacy and DPDP (S1–S8, X0 manage, S11)

| ID | Pri | Pillar | Data | Inject (steps) | Expected safe behaviour | Observe | Sev |
|---|---|---|---|---|---|---|---|
| ST-01 | P1 | HE | SAFE | S4 → withdraw an optional consent → Save. Re-grant it. Do it once offline. Double-tap Save | Withdrawing takes the same effort as granting (DPDP s6). The server row changes once. Offline gives "Could not do that…" and nothing changes (HT-14/31/54) | DB `consents`, shots | S2 |
| ST-02 | P0 | HE | **FRESH only (NEVER on existing)** | S7 → S8: Back; offline Delete; double-tap Delete online; then cancel within the grace period | Back cancels. Offline is refused with the book intact. Online gives one erase request, a local wipe, and the 30-day grace (`DELETION_GRACE_DAYS`) stated. Cancel works | DB erase schedule, shots, server log | S1 |
| ST-03 | P1 | HE | SAFE | Look for the DPDP access/export route. Open the privacy policy, the licences, help/grievance officer and the web deletion link, offline and online | **Code-read lead:** `client.exportMe()` (`/v1/me/export`) has **no caller** in the app, so there may be no in-app access route. If confirmed, record it for GC. The policy and licences open (HT-15, F-23). A named grievance officer is shown in all three languages | Shots, `grep exportMe` | S2 |
| ST-04 | P1 | HE | SAFE (needs Saket for PIN) | App lock On → Home for 5 min (`LOCK_AFTER_MS`) → return. Back on the lock screen. Check the Recents thumbnail | Locked after 5 min. Back does not reveal the book. The Recents thumbnail hides figures | Shots | S2 |

## 11 · Language, text size and display

| ID | Pri | Pillar | Data | Inject (steps) | Expected safe behaviour | Observe | Sev |
|---|---|---|---|---|---|---|---|
| LG-01 | P1 | HE | SAFE | Switch en → or → hi on Today (stale card), T5, T11, P2, R1, A8 | No raw keys (e.g. `t1.stale.body`) and no tofu boxes (bundled Odia font). **Numerals stay Latin**, with Indian grouping. hi/or remain DRAFT (H13): judge fit, not wording | Shots × 3 languages | S2 |
| LG-02 | P1 | HE | SAFE | Font 1.3 and 2.0 on every main screen | Nothing clipped. The primary action is reachable, or the scroll is visible. Known open: HT-30 (T6 at Focus 1.3), HT-60 (Focus at 2.0) | Shots, UI dumps | S2 |
| LG-03 | P2 | HE | SAFE | Light vs "Dark, bigger text" × font 2.0, with **high-contrast text ON** (owner setting) | Figures and refusals stay legible. The outlined text is not clipped. The selected segment is distinguishable (F-41). Note the high-contrast setting on every judgement | Shots | S3 |
| LG-04 | P1 | HE | SAFE | Language switch mid-flow: Sale with 900 typed, and T11 with a count typed and a reason picked | The draft, count and reason survive, re-labelled, never reset to a different reason | Shots | S2 |
| LG-05 | P2 | HE | SAFE | UI dump of the keypad screens and T5 | Every control has a unique content-desc ("Back" header vs keypad delete, DV-15; T5 skip buttons, HT-28) | XML | S3 |

## 12 · Sync and server faults (outbox, park/unpark, backoff)

| ID | Pri | Pillar | Data | Inject (steps) | Expected safe behaviour | Observe | Sev |
|---|---|---|---|---|---|---|---|
| SY-01 | P0 | SF | SAFE | Remove the tunnel → a ₹10 sale via T5 → open Reports and Parties → restore | "Saved on phone, 1 waiting". Reports and Parties still render local figures. Drains within the 30 s tick or on foreground. Exactly one DB row | Shots, DB | S1 |
| SY-02 | P0 | SF | SAFE | Proxy `blackhole` → sale → keep using the app for 90 s | The UI never freezes. The request ends at the 60 s timeout as offline. The queue is kept and retried after backoff | Proxy log, shots | S1 |
| SY-03 | P0 | SF | SAFE | Proxy `drop-response` on `/v1/sync/push` → sale → `pass` | The retry resends the same ids and the server dedups: one row in the DB, and the queue empties | DB count, proxy log | S1 |
| SY-04 | P0 | DN | SAFE | Queue 10 entries offline → restore → flap the tunnel every 3 s for 2 min | Final DB count = 10, with no duplicates or losses. The per-batch ack holds (FE-5) | DB, shots | S1 |
| SY-05 | P1 | SF | SAFE | Proxy `status:503` on push for 10 min, typing a sale every minute. Then foreground the app | Retries back off from 30 s towards the 5-min ceiling with jitter (`backoff.ts`). There is no request per keypress. Foreground resets the backoff and tries at once | Proxy log timestamps | S2 |
| SY-06 | P1 | SF | SAFE | `status:429:120`, then `429:99999`, then `429:<HTTP-date +3 min>` | The next request comes ≥ 120 s later. A huge value is capped at 1 h. The HTTP-date is honoured | Proxy log | S2 |
| SY-07 | P0 | SF | SAFE | Proxy `reject-one` on a push → `pass` → background/foreground → relaunch | The row is parked with its reason and shown as "could not be sent". It is not resent on every tick. Unparked once per launch or foreground. Accepted by dedup on the resend. **Never deleted** (O-3) | Shots, proxy log, DB | S1 |
| SY-08 | P1 | DN | SAFE | Proxy `slow3g` for a whole session: entries, consent screen, reports | Entry never waits on the network. Busy states are shown. Re-taps cause no duplicates | Shots, DB | S2 |
| SY-09 | P1 | SF | SAFE | Stop Postgres with the API up → sale → start Postgres | The API answers 5xx/503, does not crash, and does not answer 200 + "rejected" (C-06). The app backs off and does **not** park the rows | Server log, proxy log, DB after | S2 (S1 if rows are parked as refused) |
| SY-10 | P1 | SF | SAFE (fixed key) | Kill the dev server mid-push of 10 entries → restart | Acked rows are gone from the queue, the rest are resent. No session loss (fixed key, 0.2) | DB, shots | S2 |
| SY-11 | P1 | DN | SAFE | Queue 3 offline → Home → battery saver on, force doze, trim memory, `am kill` → 10 min → restore the network, unforce doze → launch | The queue is intact. It drains on launch (restart=true). No crash. The stale notice is still right | DB, logcat | S2 |
| SY-12 | P1 | SF | SAFE | Proxy `garbage` on `/v1/reports` and `/v1/billing/entitlement` | A clear "could not load" message, or the error boundary in the shop's language with a retry. Never a white screen. The book is intact | Shots, logcat | S2 |

## 13 · Device, clock and navigation

| ID | Pri | Pillar | Data | Inject (steps) | Expected safe behaviour | Observe | Sev |
|---|---|---|---|---|---|---|---|
| DV-01 | P1 | DN | SAFE (restore auto-time) | Clock +1 day, then +30 days, with the app in front, then foregrounded. Restore | No new day is created and nothing closes. The stale date stays 26 Oct. No crash | Shots, DB `days` | S2 |
| DV-02 | P0 | DN | **FRESH** | C-19: clock +2 days → sale → close → restore the clock | The "phone's date looks wrong" notice, and new entries are not written onto the future day. Afterwards, the misdated notice says the day is kept as recorded. Nothing is lost. (On the existing data this would freeze a real future trading day.) | Shots, DB `days` (HT-48) | S1 |
| DV-03 | P1 | DN | SAFE, observe only | Clock set back to 20 Oct (before the open day). **Do not save**. Restore | The "future" notice appears and entries are refused. **ABORT** if any save succeeds | Shots, DB unchanged | S1 if a write lands |
| DV-04 | P1 | DN | SAFE (clock) | Clock set to 26 Oct 11:00 → Today tiles become live → a ₹1 sale from the tile → restore | The day reads as current. The entry lands on 26 Oct. After restore, the stale state returns. This enables tile-start variants of EN-01/06/07 | Shots, DB | S2 |
| DV-05 | P1 | DN | SAFE (observe) | Timezone Asia/Kolkata → America/New_York → Pacific/Kiritimati → back | No writes and no day jumps. Shown dates are consistent. Server-derived alerts and outstanding are not a day off (C-11) | Shots, server log | S2 |
| DV-06 | P0 | DN | SAFE (clock) · FRESH for a custom day start | Clock 26 Oct 23:58 → sale at 23:59 → wait past 00:00 → tap Sale. On FRESH: S2 day start 04:00, sale at 00:30 | 23:59 lands on 26 Oct. After midnight, with a midnight day start, the entry is refused by the stale notice and never silently put on 27 Oct. With a 04:00 start, 00:30 belongs to the previous business day (decision 1) | DB `day_date`, shots | S1 |
| DV-07 | P0 | DN | **FRESH** | Fill storage to < 50 MB (`dd` to `/sdcard/Download/fill.bin`) → sale → free the space → relaunch | The save is either persisted or refused out loud, never shown as saved and then gone. No SQLite corruption after the space is freed | Logcat (`SQLITE_FULL`), DB, shots | S1 |
| DV-08 | P1 | DN | SAFE (needs Saket for PIN) | Queue 2 entries offline → reboot the phone → unlock → launch → restore the network | The book and queue survive the reboot. The app does not autostart. It drains on launch | Shots, DB | S2 |
| DV-09 | P1 | HE | SAFE | Back sweep: hardware Back from every reachable screen (T1, T5, T7–T13, T16, T18, T19, P1–P3, P6, R1, S1–S12, I1, C1) | Back goes to the parent per `App.tsx`. It never leaves the app mid-draft without saying so, and never lands on an A-screen while signed in | Shots per screen | S2 |

---

## 14 · Totals

| | P0 | P1 | P2 | Total |
|---|---|---|---|---|
| Human error (HE) | 26 | 26 | 4 | 56 |
| Device / network (DN) | 5 | 8 | 0 | 13 |
| Server fault (SF) | 8 | 11 | 0 | 19 |
| **Total** | **39** | **45** | **4** | **88** |

By data class: SAFE 64 (5 need clock changes, 2 need Saket for the PIN) · SAFE-LO 8 ·
AFTER-CLOSE 5 · ONE-WAY 2 · FRESH 9.

## 15 · Code-read leads (not findings until the device proves them)

1. `exportMe()` has no caller, so DPDP access may have no in-app route (ST-03).
2. A dev-server restart without a fixed `SESSION_SIGNING_KEY` invalidates every token (0.2.1).
3. The DB named in PLAN.md (`swafto-pg-test`) differs from pass 10's (`swafto_dev3`), and a
   re-sign-in on a DB without the bound shop locks the book out of sync (0.2.2).
4. A signed-out shop cannot record sales, and an OTP lockout makes that last 60 min (AU-03, HT-56).
5. There is no NetInfo, so the app never learns connectivity returned except from the 30 s
   poll or a foreground (`Root.tsx:117`). SY-01 measures the real drain delay.
