<!--
VERBATIM. This is the human instruction as received, preserved unedited.

It is here because C.3-C.9 - seven React Native traps this build is required to
resolve before G10 - existed nowhere in the repository. The list lived only in a chat
transcript, and recovering it at iteration 14 meant mining a .jsonl file. An
instruction that cannot be re-read is an instruction that quietly becomes whatever the
last iteration remembered of it.

DO NOT EDIT THE BODY. §5.6 prose integrity applies with no exception here: this is
evidence, not our prose. Corrections, disagreements and rulings go in SPEC-DIGEST §1,
BUILD_LOG or an INJECTIONS/NN-adversary-*.md pass - never inline.
-->

# 00-build-loop-prompt

# SWAFTO — the build loop prompt

One decision has to be made before this prompt is usable, and then the prompt itself.

---

## Read this first: Flutter or React Native

You asked for React Native. Every artifact we have produced so far says Flutter:

- `SWAFTO-System-Architecture-and-DFD.pdf` labels the whole client stack **"CLIENT — FLUTTER · WORKS FULLY OFFLINE"** across layers L1–L5.
- The design system was built as **`tokens.dart`** with `SwaftoTheme.comfort()` / `SwaftoTheme.focus()` ThemeExtensions.
- The Finalized Resource Plan hires **four Flutter developers**.
- The two-engine rule assumes the Formula Engine exists **in Dart** on the client and TypeScript on the server.

Switching to React Native is a real, defensible choice — but it is a choice, not a detail, and it invalidates those three things. So the loop prompt below has a **single switch at the top**. Set it once and everything downstream follows.

**My read, briefly, so you are not choosing blind:**

| | Flutter | React Native |
|---|---|---|
| Rendering on ₹7,000 Android | Own rasteriser, identical on every OEM skin | Bridges to platform views; more OEM variance |
| Offline DB | Drift/SQLite, mature, typed | `op-sqlite` / WatermelonDB, good but younger |
| Money arithmetic | `Decimal` package, no float | JS has no integer-safe decimal — **must** use paise-as-integer plus `decimal.js`, enforced by lint |
| Hiring in Bhubaneswar / Odisha | Thinner | Deeper — every React web dev is 60% of the way there |
| Reuse of the design system | Already written | Must be re-emitted as TS tokens |
| Shared Formula Engine | Dart client + TS server = two languages, two implementations | **One TypeScript engine shared by client and server** |

That last row is the strongest argument for React Native and it is not a small one. The whole correctness wedge rests on the client and server computing the same numbers. With React Native you can ship **one** Formula Engine as a workspace package that both import — the divergence class of bug stops existing rather than being tested for.

The strongest argument against is that JavaScript has no safe decimal type, so **every rupee in the system must be stored and computed as an integer number of paise**, with a lint rule that bans floating-point arithmetic anywhere near money. That is a discipline problem, not a blocker, and the prompt below encodes it as a hard gate.

**Recommendation: go React Native**, and accept two costs — re-emit the design tokens as TypeScript, and delete the two-engine rule in favour of one shared engine with golden vectors run in CI against both runtimes (Node and Hermes) rather than against two codebases.

If you disagree, flip `TARGET_STACK` to `flutter` in the prompt and the two-engine rule comes back automatically.

---

## How to run this

This is a **loop prompt**. It is written for an agent session with a filesystem and a shell — Claude Code in a repo, or a Cowork session linked to a folder.

1. Create an empty folder, `git init`, and open an agent session in it.
2. Paste the block below as the **first** message.
3. When the agent stops, if `BUILD_STATE.md` still shows any gate not `PASS`, send exactly: `Continue the loop.`
4. Repeat until it reports `LOOP COMPLETE` and the gate table is all green.

The loop mechanics are in the prompt itself — the agent maintains its own state ledger, so step 3 costs you nothing to say and it never loses its place.

Attach when you paste: the five Retail Desk PDFs, `SWAFTO-System-Architecture-and-DFD.pdf`, and the two handwritten photos (15-07-2026 inputs/outputs note, and the Retail Desk V1 paper sheet).

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
You are a principal engineer with 10+ years building financial systems for low-connectivity
emerging markets. You have shipped ledger software that real money depended on. You do not
scaffold and hand over; you build until it works.

You are building SWAFTO (working name Retail Desk): an offline-first daily cash-and-credit
closing app for small Indian retail shops. Android-first, ₹7,000 devices, 2G/no signal,
Odia / Hindi / English. The user is a shopkeeper aged 35–70 who currently does this on paper.

CONFIGURATION — read these before anything else
  TARGET_STACK          = react-native        # client. Do not change without being told.
  BACKEND_LANGUAGE      = typescript          # Node LTS
  CLOUD                 = AWS ap-south-1 (Mumbai) — data residency is a legal requirement
  MONEY_REPRESENTATION  = integer paise, everywhere, no exceptions
  SCREEN_DESIGNS        = https://claude.ai/code/artifact/88b4930d-53fb-499a-b34f-783ec22cd430
  ATTACHED              = 6 specification PDFs + 2 photographs of handwritten specification

═══════════════════════════════════════════════════════════════════════════════
THE LOOP
═══════════════════════════════════════════════════════════════════════════════

You work in a loop. You do not stop when a phase is "mostly done". You stop only when
every gate in the gate table is PASS with evidence, or when you are genuinely blocked on
a decision only a human can make.

Each iteration:
  1. Read BUILD_STATE.md. If it does not exist, create it from the template in PHASE 0.
  2. Pick the LOWEST-numbered gate that is not PASS. Work only on that gate.
  3. Do the work. Write real code, not placeholders.
  4. Run the verification command for that gate. Paste its actual output into BUILD_STATE.md.
  5. Mark the gate PASS only if the command exited 0 and its output proves the claim.
  6. Commit: `git add -A && git commit -m "<gate id>: <what changed>"`
  7. Append one line to BUILD_LOG.md: date, gate, what you did, what you found.
  8. If any gate is still not PASS, say "CONTINUING — next gate is <id>" and go to step 1.
  9. When all gates are PASS, run the FINAL VERIFICATION and only then print "LOOP COMPLETE".

HARD RULES OF THE LOOP — these exist because agents cheat without them
  • Never mark a gate PASS from reasoning alone. A gate is PASS when a command you ran
    printed output that proves it. No output, no PASS.
  • Never write a stub, a TODO, a `throw new Error('not implemented')`, or a mock that
    returns fixed data, and then call the gate done. If you cannot finish it this
    iteration, leave the gate IN-PROGRESS and say exactly what remains.
  • Never delete or weaken a test to make it pass. If a test is wrong, say so in
    BUILD_LOG.md, explain why, and fix the test deliberately in its own commit.
  • Never silently change an earlier decision. If you find one is wrong, stop, write it
    up under OPEN DECISIONS in BUILD_STATE.md, pick the safest option, and flag it.
  • If you are stuck on the same gate for three consecutive iterations, stop looping.
    Write STUCK.md: what you tried, what failed, the three options you see, and which
    you recommend. Then ask.
  • Run out of context? BUILD_STATE.md and BUILD_LOG.md are your memory. Keep them
    accurate enough that a fresh session can resume from them alone.

═══════════════════════════════════════════════════════════════════════════════
NON-NEGOTIABLE PRODUCT CONSTRAINTS
═══════════════════════════════════════════════════════════════════════════════

1. NO AI ANYWHERE IN DATA ENTRY. No voice input, no microphone, no camera or scan, no
   OCR, no LLM, no autocomplete that fills a field, no "smart" suggestion of an amount,
   a party or a category. Every number is typed by a person who chose the section first.
   Party name lookup may MATCH an existing party as he types; it must never AUTO-FILL,
   and it must never touch the amount field. This is the product's trust position, not a
   technical limitation — if you find yourself adding a helpful inference, delete it.

2. OFFLINE-FIRST AND AUTHORITATIVE LOCALLY. The local SQLite database is the source of
   truth for the device. Every write succeeds locally first and syncs later. The app is
   fully functional with the radio off, for weeks. Sync is never an error state and
   never uses red.

3. APPEND-ONLY LEDGER. Entries are immutable once written. A mistake in a closed day is
   fixed by a CORRECTION entry that references the day it corrects, never by an UPDATE
   or DELETE. There is no hard delete of financial data anywhere in the system.

4. DERIVE ON READ, NEVER STORE TOTALS. No total, balance, or outstanding is ever
   persisted as a column and trusted. Every figure is computed from entries by the
   Formula Engine at read time. Caching is allowed only as a keyed materialised view
   that can be dropped and rebuilt from entries alone, and CI must prove the rebuild is
   byte-identical.

5. ONE FORMULA ENGINE. Because TARGET_STACK is react-native, the Formula Engine is a
   single TypeScript package (`packages/formula-engine`) imported by BOTH the React
   Native app and the Node backend. It is pure: no I/O, no clock, no locale, no network.
   Time and timezone are passed in. Golden vectors in `vectors.json` are executed in CI
   under Node AND under Hermes, and CI fails if the two runtimes disagree on any vector.
   (If TARGET_STACK were flutter, this becomes two implementations against one vector
   file, with the same CI failure condition.)

6. MONEY IS INTEGER PAISE. Every amount is a JS integer number of paise in the database,
   in the API, in the engine and in app state. Formatting to "₹1,234.50" happens only at
   the render boundary. An ESLint rule bans `+ - * /` on any identifier matching
   /amount|paise|total|balance|cash|sum/ outside the engine's own audited helpers, and
   bans `parseFloat` and `Number(` on money strings. Division that could produce a
   fraction must state its rounding mode explicitly. CI fails on a violation.

7. IDEMPOTENT SYNC. Every entry carries a client-generated UUIDv7 as its primary key.
   The server upserts on that key. Replaying the same outbox twice must produce an
   identical database. Prove it with a test that syncs the same batch three times and
   diffs the resulting state.

8. LATIN NUMERALS ALWAYS, IN EVERY LANGUAGE, TABULAR FIGURES. Words localise; money does
   not. Never Devanagari or Odia digits.

═══════════════════════════════════════════════════════════════════════════════
THE FEATURE MAP — from the handwritten specification
═══════════════════════════════════════════════════════════════════════════════

The photographs dated 15-07-2026 are the authoritative feature list. Every item below
gets an ID, a Formula Engine function, a test, an API surface and a screen. Build a
TRACEABILITY.md with one row per ID and these five columns, and CI must fail if any row
has an empty cell.

MAJOR KEY INPUTS — the things a shopkeeper types
  IN1  Sales            — split cash / UPI / udhar (credit)
  IN2  Purchase         — split by payment mode; credit purchase creates supplier due
  IN3  Expenses         — label + amount + mode. CASH is visually and arithmetically
                          apart from UPI / Other / Udhar / Shop stock, because only cash
                          expenses move the cash balance
  IN4  Credit Collection — udhar collected from a customer, with mode
  IN5  Party Collection  — payment made to a supplier, with mode
  IN6  Withdrawals       — owner's personal cash taken out. Reduces cash. NOT an expense.
                           Never inside the profit subtraction
  IN7  Actual Closing    — the counted cash in the box at day end

PRIMARY OUTPUTS — simple arithmetic, available from day one, never gated
  P1  Total Cash Received  = cash sales + cash portion of udhar collection + any other cash in
  P2  Total Cash Paid      = cash purchase + cash expenses + cash party payment + withdrawal
  P3  Expected Cash Balance= opening cash + P1 − P2
  P4  Net Sales            = cash sales + UPI sales + udhar sales
  P5  Net Purchase         = all purchase, every mode
  P6  Total Expenses       = all expenses, every mode (only the cash ones appear in P2)
  P7  Credit Outstanding   = prior outstanding + udhar sales − udhar collections
  P8  Supplier Outstanding = prior outstanding + credit purchases − party payments

  Each of P1–P8 must be renderable AS ITS WORKING — the line-by-line derivation, not
  just the number. The cash-check screen depends on this: he must be able to see WHICH
  line is wrong, not merely that something is.

OPERATIONAL OUTPUTS — same-day or few-day signals
  OP1 Daily Cash Health     — counted (IN7) vs expected (P3); signed difference; a
                              reason code when non-zero. Copy is a QUESTION, never a
                              verdict. A shortfall is ordinary shop life
  OP2 Expense Pressure      — total expenses as a share of net sales, today and trailing
  OP3 Collection Efficiency — collected ÷ (opening udhar + udhar sales) over a window
  OP4 Payment Due           — supplier dues inside a forward horizon, by date
  OP5 Business Movement     — today's net sales vs trailing median; direction and size
  OP6 Cash Deficit Warning  — projected cash on the due date < the amount due. This is
                              the app's single most valuable output. It must fire early
                              enough to act on, and it must name the party, the amount,
                              the date and the shortfall

BUSINESS INTELLIGENCE — gated on closed-day count, never shown as an empty chart
  BI1 Profit Trend          — gate: 14 closed days
  BI2 Sales Consistency     — gate: 14 closed days. Coefficient of variation
  BI3 Cash Flow Stability   — gate: 21 closed days
  BI4 Working Capital Pressure — gate: 14 closed days. (P7 + stock proxy) vs P8
  BI5 Inventory Pressure    — NOT IN V1. Marked future on the sheet. Reserve the ID,
                              build no UI, add no inventory card to Reports
  BI6 *** UNRESOLVED ***    — item 6 is incomplete on the photograph ("6. |"). Do NOT
                              invent it. Reserve the ID, add a row to TRACEABILITY.md
                              marked BLOCKED-ON-HUMAN, and list it in OPEN DECISIONS in
                              BUILD_STATE.md. It does not block any gate.

  Every gated output states its gate in the shopkeeper's terms — "Profit trend:
  available after 14 closed days, 6 so far" — never a spinner, never a zero, never a
  chart with no data in it.

═══════════════════════════════════════════════════════════════════════════════
THE GATES
═══════════════════════════════════════════════════════════════════════════════

Work them in order. Each has a verification command whose real output goes in
BUILD_STATE.md.

─── PHASE 0 · SET UP THE LOOP ───────────────────────────────────────────────

G0  Repository, state ledger, and specification extraction.
    Create the monorepo. Read all 6 PDFs and both photographs end to end before writing
    any code. Write SPEC-DIGEST.md: every rule you found, with the document and page it
    came from. Where two documents conflict, record both and say which wins and why —
    the Strategy 1 spec wins on component behaviour, the Decisions document wins on
    product rationale, the Architecture document wins on system structure.
    Create BUILD_STATE.md from this template:

      # BUILD STATE
      Updated: <iso timestamp>   Iteration: <n>
      ## Gate table
      | Gate | Title | Status | Evidence |
      |------|-------|--------|----------|
      | G0   | ...   | PASS / IN-PROGRESS / BLOCKED / TODO | <command + result> |
      ## Open decisions
      ## Blocked on human
      ## Next action

    VERIFY: `ls SPEC-DIGEST.md BUILD_STATE.md BUILD_LOG.md TRACEABILITY.md && wc -l SPEC-DIGEST.md`
            SPEC-DIGEST.md under 200 lines means you skimmed. Read them properly.

─── PHASE 1 · RESEARCH BEFORE BUILDING ──────────────────────────────────────

G1  Technology research. Do this BEFORE choosing a single library. Research current
    (2026) best practice and write TECH-DECISIONS.md as a set of ADRs — one per
    decision, each stating the options, the evidence, the choice, and what would make
    you reverse it. Decide at minimum:
      • RN on-device SQLite: op-sqlite vs expo-sqlite vs WatermelonDB — benchmark
        insert and aggregate throughput on a low-end profile, don't take blog claims
      • Sync protocol: outbox + server upsert. Conflict policy. Clock skew handling.
        A shop phone's clock is often wrong — decide how you handle a day boundary
        when the device says it is still yesterday
      • Backend framework: Fastify vs NestJS vs Hono. Weight boot time and cost, not
        popularity — this runs on a t4g.small
      • Postgres access: Drizzle vs Prisma vs raw SQL with pg. Consider migration
        ergonomics and cold-start cost on ARM
      • Auth: phone + OTP only. SMS provider for India (DLT registration is mandatory
        and has lead time — check it now, not at launch). Token lifetime, refresh,
        device binding
      • Background sync on Android: WorkManager via RN, constraints, doze behaviour
      • Crash and error reporting that works offline and respects DPDP consent
      • Package manager and monorepo tool. Node LTS version. RN version and whether
        New Architecture is on
    VERIFY: `test $(grep -c '^## ADR-' TECH-DECISIONS.md) -ge 8 && echo OK`

G2  LEGAL AUDIT. Write LEGAL-AUDIT.md. You are auditing an app that stores Indian
    citizens' financial records. Research current law and write findings with
    citations, each with a status: COMPLIANT / ACTION-REQUIRED / BLOCKED-ON-HUMAN.
      • Digital Personal Data Protection Act 2023 and its Rules — notice, consent,
        purpose limitation, the Data Principal's rights of access / correction /
        erasure, grievance officer, breach notification timeline, retention limits,
        and Consent Manager obligations. Map each one to a concrete artifact: a
        screen, an API endpoint, a database column, a document
      • Data residency: confirm ap-south-1 and that no processor moves data out
      • Google Play Data Safety form — produce the exact declarations, and confirm
        they match the privacy policy word for word. A mismatch is a common rejection
      • Google Play account deletion policy — in-app path AND a public web URL that
        works for someone who already uninstalled. Both are mandatory
      • Android 13+ POST_NOTIFICATIONS runtime permission
      • If SMS reading is ever reconsidered: the Play policy has an explicit exception
        for UPI/financial transaction SMS. Note it accurately; do not repeat the
        common misreading that it is banned outright. V1 does not use it
      • GST: the app produces no tax invoice and makes no tax computation. State that
        plainly, and state it in the app's own copy, so no shopkeeper treats an export
        as a filing. Confirm what an export may and may not be called
      • Money handling: the app moves no money and holds no funds, so it is not a PA/PG
        and RBI payment regulations do not apply. Write the reasoning down anyway, with
        the specific trigger that WOULD bring it into scope, so a future feature does
        not cross the line by accident
      • Terms, privacy policy and grievance contact — draft all three
      • IP: every font and library licence. Anek is OFL; confirm and record it
    VERIFY: `grep -E 'ACTION-REQUIRED|BLOCKED-ON-HUMAN' LEGAL-AUDIT.md`
            Every ACTION-REQUIRED must become a row in TRACEABILITY.md.

G3  SECURITY AUDIT AND THREAT MODEL. Write SECURITY-AUDIT.md — STRIDE over the DFD in
    the attached architecture document, every trust boundary crossed.
      • Device loss and theft with an unsynced ledger on it
      • On-device database encryption: SQLCipher or platform keystore. Decide and justify
      • Optional 4-digit app lock. Rate limiting. And the rule that a forgotten PIN is
        recovered by OTP to the same number — it must NEVER lock a shopkeeper out of
        his own ledger
      • OTP abuse: SMS-bombing a number, OTP brute force, SIM swap. Rate limits per
        number, per device, per IP, with lockout windows
      • Multi-tenant isolation: every query scoped by shop_id. Postgres row-level
        security as defence in depth. A test that PROVES shop A cannot read shop B
      • Sync replay and forgery: can a malicious client write entries into another
        shop's day? Prove not
      • Secrets: none in the repo, none in the APK. Rotation plan
      • Transport: TLS, certificate pinning decision, and the cost of pinning when a
        cheap device has a stale trust store
      • Dependency and container scanning in CI, with a build-failing severity threshold
      • Logging: log no amounts, no party names, no phone numbers. Prove it with a test
        that greps the log output of a full day-close for the sample figures
      • Backup and restore, and a written, tested restore procedure — untested backups
        are not backups
    VERIFY: `npm audit --audit-level=high && echo "STRIDE rows: $(grep -c '^| ' SECURITY-AUDIT.md)"`

─── PHASE 2 · THE DOMAIN CORE ───────────────────────────────────────────────

G4  Database schema and migrations. Implement D1–D5 from the architecture document:
      Entries   — id(uuidv7, client-generated) · shop_id · day_id · section · amount
                  (integer paise) · mode · party_id · due_date · corrects_day_id ·
                  created_at · source ('manual' in V1) · device_id
      Days      — shop_id · date · state(not_started|open|ready|closed) · opening_cash ·
                  counted_cash · difference_reason · closed_at
      Parties   — shop_id · type(customer|supplier) · name · phone · created_at
      Shops     — id · name · type · address · gstin(nullable) · language · created_at
      Users/Devices — phone, device binding, session
    Append-only enforced at the database level, not only in code: a trigger or a
    revoked UPDATE/DELETE grant on Entries. `source` exists so a future UPI import is
    reversible without a migration. Identical schema and identical migrations run on
    SQLite (device) and Postgres (server) from one source of truth.
    VERIFY: migrate up, migrate down, migrate up again on both engines; then a test
    that attempts UPDATE and DELETE on Entries and asserts both are rejected.

G5  FORMULA ENGINE — this is the heart of the product. Build it before any UI and any
    API. Pure TypeScript, no I/O, no clock, no locale. Implement every ID in the
    feature map: IN1–IN7 as input shapes, P1–P8, OP1–OP6, BI1–BI4 with their gates,
    BI5 reserved, BI6 blocked.
    Write `vectors.json` — at minimum these cases, each with inputs and expected
    outputs for every P, OP and BI value:
      • the canonical 15 July day (use the exact sample figures from the design
        documents so the numbers match every screen we have already designed)
      • a zero day; a day with only udhar; a day with only expenses
      • a cash shortfall; a cash surplus; an exact balance
      • a skipped section vs an untouched section — these are DIFFERENT states
      • a missed day (gap) — the app never guesses a balance for a day that was not
        closed; it asks for a fresh count
      • a correction posted against a closed day
      • the day a customer's udhar crosses 30 days
      • a supplier due date landing on a day with insufficient projected cash (OP6)
      • rounding edges: amounts ending in 1 and 9 paise, a division in OP2/OP3
      • the 13th and 14th closed day, proving each BI gate opens exactly once
    VERIFY: `npm run test:vectors` under Node AND under Hermes, with a CI step that
            diffs the two result sets and fails on any difference. Print the vector
            count; under 30 vectors is not enough.

─── PHASE 3 · BACKEND ───────────────────────────────────────────────────────

G6  Auth service. Phone + OTP only. No password, no email, no social. Sessions do not
    expire on their own — a shop phone is a single-user device behind a counter, and
    every re-auth costs a real SMS. Number-change flow reachable WITHOUT being signed
    in. Rate limits from G3 enforced and tested.
    VERIFY: integration tests covering happy path, wrong code, expired code, too many
            attempts, resend throttle, number change with and without the old number.

G7  Sync API. Outbox push, delta pull, cursor-based, resumable on a 2G connection that
    dies mid-request. Idempotent upsert on the client UUID.
    VERIFY: a test that pushes the same 200-entry batch three times and asserts the
            resulting database state is byte-identical after each.

G8  Read API. Every figure served by the shared Formula Engine — the server must not
    contain a second arithmetic path. Day summaries, party ledgers, reports, alerts.
    VERIFY: a test that computes the canonical day through the API and asserts it
            equals the vectors.json expected output exactly.

G9  Pipeline. GitHub Actions: typecheck → lint (including the money-arithmetic rule) →
    unit → vectors on both runtimes → integration against a real Postgres → dependency
    audit → container scan → build → migrate → deploy to staging → smoke test → manual
    approval → production. Terraform for ap-south-1. Per the cost analysis: NO NAT
    Gateway — it is ₹4,393/month at zero traffic and ₹8,787/month at 500 users for
    nothing this architecture needs. Use VPC endpoints or a public subnet with tight
    security groups. Structured logs, health checks, a rollback that has been executed
    at least once in staging and its output recorded.
    VERIFY: paste a green pipeline run URL and the staging smoke-test output. A
            rollback that has never been run is not a rollback.

─── PHASE 4 · REACT NATIVE APP ──────────────────────────────────────────────

G10 Design tokens and the two appearance modes. Emit TypeScript tokens from the design
    system: ink indigo #13294B, marigold #F5A524 (FILL ONLY, with dark ink #12181F on
    top — never white text on marigold, it measures 2.04:1 and fails; dark ink measures
    8.75:1), money-in #0B6B3A, money-out #C2371F, warm ground #FFF9EF, card #FFFFFF.
    Comfort (light) and Focus (dark) from one token set. Anek + IBM Plex. Body text
    never below 17sp, touch targets never below 56dp.
    VERIFY: an automated contrast test asserting every foreground/background pair in
            both modes meets 4.5:1, and a test asserting no token places white on
            marigold. Print the computed ratios.

G11 The four form archetypes. Eight of the nine paper sections collapse into four
    shapes — build these and eight screens are right by construction.
      Form A · repeating lines (cash sales, UPI sales) — sticky running total
      Form B · party + amount (udhar sale, collection, party payment) with a direction
               flag. Matches an existing party as he types; NEVER auto-fills; never
               touches the amount
      Form C · label + amount + mode (expense) — CASH visually apart from UPI / Other /
               Udhar / Shop stock, with a line stating the other four do not change the
               cash balance
      Form D · field pair (withdrawal: cash + UPI) with a line stating this reduces
               cash and is not an expense
    THE KEYPAD IS NOT A PAGE COMPONENT. The numeric keypad is visible only while an
    amount field has focus, on the seven screens that have one. Those screens are
    full-screen with NO bottom navigation. Keypad and bottom navigation are mutually
    exclusive — a screen has one or the other, never both. The keypad pushes content
    up rather than covering it: the field being typed into and its running total stay
    visible. Exception: phone number and OTP use the SYSTEM numeric keyboard, because
    OTP autofill only works with it.
    VERIFY: a rendering test asserting the keypad is absent from every screen outside
            the seven, and absent from every screen that renders a bottom navigation.

G12 The day close. The nine sections in the paper sheet's original order, with THREE
    row states — entered (showing its total), explicitly skipped ("Nothing to enter"),
    and untouched. These must be distinguishable at a glance WITHOUT colour. Cash check
    locked until the other eight are entered or skipped.
    VERIFY: e2e test walking a full nine-section close and asserting the computed
            figures equal vectors.json.

G13 The ending — the highest-leverage screens in the product.
      Cash check counting — the expected figure shown AS ITS WORKING, line by line, so
        he can see which line is wrong
      Difference found — reason chips; copy is a QUESTION ("₹250 less than expected,
        what happened?") not a verdict ("Missing ₹250")
      Balanced — the only genuinely good moment in the product. Real visual weight.
        NOT the difference screen with a block removed
      Day closed summary — figures, estimated profit (net sales − purchase − expenses),
        and withdrawal shown BELOW the profit line, visually outside the subtraction.
        Ends on "Tomorrow's opening cash will be ₹X — what you counted." Nothing after
        it: no rating prompt, no upsell, no sync warning
    VERIFY: screenshots of all four, plus a test asserting withdrawal is excluded from
            the profit computation and that no component renders after the summary.

G14 Today, parties, reports. Today's progress ring never shows zero — the carried
    opening cash already counts as progress. Six one-tap entry rails. Bottom nav of
    three tabs after the first close. Parties with the two aging vocabularies:
    customers get "31+ days" (they have no agreed terms), suppliers get "overdue"
    (they have a due date). Reports with every BI gate stated in plain words and no
    inventory card at all.
    VERIFY: tests for the ring's non-zero start, the two aging vocabularies, and the
            absence of an inventory card.

G15 Scaffolding. Language choice BEFORE sign-in, written in each script — a shopkeeper
    who reads Odia must never navigate an English sign-in to reach the language
    setting. Sign-in, OTP and its four failure states, number change, logout, settings,
    shop and owner profile, appearance (offered as a live preview, NEVER as an age
    question), app lock, backup and export (date range, CSV and PDF, delivered over
    WhatsApp or saved to the phone), account deletion (naming real quantities, offering
    export first, requiring the shop name typed, 30-day grace), about with the
    deletion URL, help with WhatsApp handoff, offline and sync states (no red
    anywhere), force upgrade explaining that balances are calculated differently,
    crash recovery, notification inbox, and the notification primer shown after the
    FIRST CLOSE, never on launch.
    NOT in V1: multiple shops, staff logins, email anywhere, social sign-in, in-app
    chat, referrals, profile photos.
    VERIFY: the 13 launch-blocking screens render and navigate.

G16 Localisation. Odia, Hindi, English complete — no fallback strings visible. Latin
    tabular numerals in all three. Layout does not reflow between languages.
    VERIFY: a test that fails on any missing key, and a screenshot of the same screen
            in three languages at identical dimensions.

─── PHASE 5 · PROVE IT WORKS ────────────────────────────────────────────────

G17 Offline endurance. A scripted run: 30 simulated days closed with the radio off,
    then reconnect, then sync. Assert the server's computed figures equal the device's
    for all 30 days, every P, OP and BI value.
    VERIFY: paste the diff. It must be empty.

G18 Low-end device performance. Measure on a 2GB-RAM Android profile: cold start,
    time to first entry, keypad latency, day-close computation, report render, APK
    size. Set budgets in TECH-DECISIONS.md and fail the build when exceeded.
    VERIFY: the measured table against the budgets.

G19 Traceability closure. Every ID — IN1–IN7, P1–P8, OP1–OP6, BI1–BI4 — has a
    function, a test, an API surface and a screen. BI5 reserved with no UI. BI6 marked
    BLOCKED-ON-HUMAN.
    VERIFY: `npm run check:traceability` — fails on any empty cell except the two
            known reservations.

G20 Adversarial self-review. Re-read SPEC-DIGEST.md, LEGAL-AUDIT.md and
    SECURITY-AUDIT.md against the code you actually shipped, as if you were reviewing
    someone else's work and were being paid to find what they got wrong. Write
    REVIEW.md. Open a gate back up for anything you find. This gate can send you
    backwards, and it should at least once — if this review finds nothing, you did not
    do it properly.
    VERIFY: REVIEW.md exists, names at least five real findings, and every one is
            either fixed or listed in OPEN DECISIONS with a reason.

═══════════════════════════════════════════════════════════════════════════════
FINAL VERIFICATION — run all of it, in one go, and paste the output
═══════════════════════════════════════════════════════════════════════════════

  npm run typecheck && npm run lint && npm run test:unit &&
  npm run test:vectors:node && npm run test:vectors:hermes && npm run test:vectors:diff &&
  npm run test:integration && npm run test:e2e && npm run test:offline-endurance &&
  npm run check:traceability && npm run check:contrast && npm run check:i18n &&
  npm audit --audit-level=high

Then, and only then:

  LOOP COMPLETE
  <the gate table, all PASS>
  <open decisions still needing a human>
  <what you would build next and why>

Do not print LOOP COMPLETE before that command has run and exited 0.

═══════════════════════════════════════════════════════════════════════════════
START
═══════════════════════════════════════════════════════════════════════════════

Begin at G0. Read all six PDFs and both photographs completely before writing a single
line of code. Then create BUILD_STATE.md and start the loop.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## Three things worth knowing before you run it

**Gate 20 is the one that earns its keep.** An agent asked to build for twenty gates will drift — it will satisfy the letter of a gate and lose the reason. G20 makes it re-read the specification against its own output and re-open gates. Expect it to go backwards there, and let it.

**G2 and G3 will produce real work items, not documents.** The legal audit in particular will surface things with lead time you cannot compress — DLT registration for transactional SMS in India takes weeks, and the account-deletion web page and privacy policy must both be live before you can submit to Play. Start those the day G2 finishes, in parallel with the rest of the build.

**BI6 stays blocked on purpose.** The sixth business-intelligence output is cut off on the photograph. The prompt explicitly forbids the agent from inventing it, because a plausible guess that gets built, tested and shipped is far more expensive than a blank row. When you or Rajanikanta remember what it was, it drops into one row and one engine function.

implement this
