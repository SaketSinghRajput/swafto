# TECH-DECISIONS

Architecture Decision Records for SWAFTO Retail Desk V1. Written at G1, before any
library was installed.

Each ADR states the options, the evidence, the choice, and **what would make me reverse
it** — that last field is the one that matters in six months.

Research date: **September 2026**. Where a claim came from the web it is cited inline.

> **Series note.** This is the V1 build series. It is **not** a continuation of
> `docs/ADR-001-AI-Infrastructure-Strategy.md`, which describes the eleven-layer model
> with three AI layers and is **superseded** by
> `SWAFTO-System-Architecture-and-DFD.pdf` ("supersedes the eleven-layer model in
> ADR-001"). The number collision is unfortunate; the legacy document is obsolete and
> should not be read as current.

---

## ADR-001 · Client stack is React Native, superseding Flutter

**Status:** Accepted · supersedes the client half of the architecture document

**Context.** Every prior artifact specifies Flutter: `SWAFTO-System-Architecture-and-DFD.pdf`
labels L1-L5 `CLIENT - FLUTTER`, the design system shipped `tokens.dart` with
`SwaftoTheme.comfort()`/`focus()` ThemeExtensions, and the resource plan hires four
Flutter developers. The build configuration sets `TARGET_STACK = react-native`.

**Options.**

| | Flutter | React Native |
|---|---|---|
| Rendering on a INR 7,000 Android | Own rasteriser, identical on every OEM skin | Bridges to platform views; more OEM variance |
| Offline DB | Drift/SQLite, mature, typed | op-sqlite / WatermelonDB, good but younger |
| Money arithmetic | `Decimal` package, no float | No integer-safe decimal in JS - **must** use paise-as-integer, enforced by lint |
| Hiring in Bhubaneswar | Thinner | Deeper - every React web dev is most of the way there |
| Design-system reuse | Already written | Must re-emit tokens as TypeScript |
| Formula Engine | Dart client + TS server = two implementations | **One TS engine shared by client and server** |

**Decision.** React Native. The deciding row is the last one. The entire correctness
wedge rests on the client and server computing the same numbers; with one shared
TypeScript package the divergence bug class **stops existing** rather than being tested
for. Costs accepted: re-emit tokens as TS (G10), and lose Flutter's rendering uniformity.

**Consequences.** ADR-003 (integer paise) becomes load-bearing rather than merely tidy,
because JavaScript has no safe decimal type. The lint rule in ADR-003 is not optional.

**Reverse it if:** OEM rendering variance on sub-INR 8,000 devices produces layout defects
we cannot fix in a sprint, or if a measured cold start on a 2GB device exceeds the
ADR-011 budget by more than 50% and profiling blames the RN runtime rather than our code.

---

## ADR-002 · On-device SQLite is op-sqlite

**Status:** Accepted

**Context.** L4 is the local store and it is the device's source of truth (architecture
§07.01, *"the local write is the write"*). It must sustain the write path without ever
blocking the UI, and must aggregate a day (~25 entries) and 30-day report windows fast
enough to feel instant on a 2GB device.

**Options.** `op-sqlite` · `expo-sqlite` · WatermelonDB.

**Evidence.** op-sqlite was built JSI-first for performance, with no legacy bridge path;
it "pulls ahead in benchmarks, especially for write-heavy workloads or tight loops over
large result sets", though "in a typical CRUD app you probably won't feel the
difference". It also allows swapping the SQLite build, explicit WAL mode, and libSQL.
`expo-sqlite` wins on ergonomics and frictionless install in managed projects.
WatermelonDB adds a sync/observability layer we do not want - we have our own outbox and
our own idempotent sync, and its opinions would fight the append-only rule.

**Decision.** **op-sqlite**, with WAL mode explicit.

Three reasons specific to this product, none of which is raw speed:
1. **SQLCipher support** - ADR-009/G3 requires on-device encryption, and op-sqlite
   exposes the SQLite build so SQLCipher can be linked. That is the actual deciding
   factor.
2. **Explicit WAL** - the write path must never block a read that is recomputing a
   figure; WAL is how that is guaranteed rather than hoped for.
3. **Synchronous JSI reads** - the Formula Engine is pure and is called on every render
   of a derived figure. Avoiding a promise hop per aggregate keeps *derive-on-read*
   (architecture §06) affordable, which is what lets us keep the no-totals-table rule.

Our workload is genuinely small (~25 entries/day). The honest position is that raw
throughput would not decide this; encryption and WAL control do.

**Reverse it if:** op-sqlite's maintenance stalls (single-maintainer risk is real), or
Expo's managed workflow becomes a hard requirement for the build pipeline. `expo-sqlite`
is the fallback and the migration is contained to L4 because nothing above L4 knows the
driver.

**Benchmark obligation:** G18 must measure insert and 30-day aggregate throughput on the
2GB profile against ADR-011 budgets. **Blog claims above are not accepted as evidence for
our workload** - they are the reason to shortlist, not the reason to choose.

**Sources:** [PowerSync RN database benchmarks](https://powersync.com/blog/react-native-database-performance-comparison) ·
[expo-sqlite vs op-sqlite](https://kerneldaily.com/articles/expo-sqlite-vs-op-sqlite/) ·
[benchmark repo](https://github.com/powersync-ja/react-native-database-benchmarks)

---

## ADR-003 · Money is an integer number of paise, everywhere, enforced by lint

**Status:** Accepted · **non-negotiable**

**Context.** JavaScript has one number type and it is an IEEE-754 double. `0.1 + 0.2 !==
0.3`. This app reconciles a physical cash box to the rupee; a floating-point error
is a shopkeeper losing trust in the only promise the product makes.

**Options.** (a) float rupees - rejected outright. (b) `decimal.js` / `big.js` objects.
(c) **integer paise** in a `number`. (d) `BigInt`.

**Decision.** **Integer paise in a plain `number`.**

Safety argument: `Number.MAX_SAFE_INTEGER` is 9,007,199,254,740,991 paise, about
**INR 90 trillion**. A kirana shop's lifetime turnover will not approach it. Integers
below 2^53 are exact, and addition/subtraction of exact integers is exact - which covers
P1-P8 entirely, because **every primary output is pure addition and subtraction**.

`BigInt` rejected: it does not serialise to JSON natively, and it is slower on Hermes for
no benefit at our magnitudes. `decimal.js` rejected as the *storage* type for the same
serialisation reason, and because an object type invites accidental `+` concatenation.

**Where division happens.** Only OP2, OP3, OP5, BI2, BI3, BI4 divide. Those produce
**ratios, not money**. Rule: a division that could produce a fraction must return a
`Ratio { numeratorPaise, denominatorPaise }` or an explicitly-rounded basis-point
integer, and **must name its rounding mode at the call site**. No implicit rounding
anywhere.

> **ENFORCEMENT BUILT AT ITERATION 18, AND IT DID NOT EXIST BEFORE THEN.** From G1 to
> iteration 17 this section described a control that was absent: ESLint was not
> installed, there was no config, and `npm run lint` exited with "'eslint' is not
> recognized". A non-negotiable constraint rested on a rule nobody had written. The
> rule now exists at `tools/eslint-rules/no-money-float.mjs`, all four clauses, with
> its own RuleTester suite covering a passing AND a failing case for each. It runs in
> CI via `npm run check:money`, which lints 45 files, rather than through
> `eslint.config.mjs` - a repository hook protects that filename, and working around
> it by choosing a different extension would defeat a guard put there on purpose. The
> editor-integration config is H11.
>
> Applying it found nothing wrong with the money paths and eleven places where the
> money vocabulary was used for something else - character counts, test counts, font
> bytes. Those were renamed rather than the rule narrowed, which is the point of
> having the pattern be broad.

**Enforcement (CI-failing).** A custom ESLint rule `swafto/no-money-float`:
- bans `+ - * /` where either operand identifier matches `/amount|paise|total|balance|cash|sum|opening|counted|expected/i`, outside `packages/formula-engine/src/money.ts` (the audited helpers);
- bans `parseFloat(` and `Number(` applied to anything matching that pattern;
- bans numeric literals with a decimal point in any file under `packages/formula-engine/`;
- requires `toFixed`/`Intl.NumberFormat` to appear only in the render boundary (`formatPaise`).

**Formatting** to `INR 1,234.50` happens **only** at the render boundary, in one function,
which also enforces Latin tabular numerals in all three languages (SPEC-DIGEST §9).

**Reverse it if:** never, while money is in scope. If multi-currency ever arrives, the
representation becomes `{ minorUnits: number, currency: 'INR' }` - still an integer.

---

## ADR-004 · Sync is an outbox with server upsert; the business day is client-assigned and never rewritten

**Status:** Accepted

**Context.** Architecture §07.02: every write is idempotent, client-generated UUIDs, the
outbox can retry forever. The open question the build prompt raises is real and sharp:
**a shop phone's clock is often wrong. What happens at a day boundary when the device
says it is still yesterday?**

**Decision, in three parts.**

**(1) Identity.** Every entry carries a client-generated **UUIDv7** as its primary key.
v7 over v4 because it is time-ordered, so the outbox drains in creation order and
Postgres index locality is good. The server does `INSERT ... ON CONFLICT (id) DO NOTHING`
- **DO NOTHING, not DO UPDATE**, because D1 is append-only (architecture §07.04) and an
upsert that overwrites would be a silent mutation of a financial record.

**(2) Conflict policy.** There is no conflict resolution, deliberately. Decision D9 makes
*one shop, one phone* an explicit non-goal, so two writers for one `shop_id` do not
occur. If the server ever sees the same `id` with a **different payload hash**, that is
not a conflict to merge - it is a **divergence alarm** per architecture §07.06. Record
both, raise, overwrite nothing.

**(3) The day boundary - the actual ruling.**

> **A business day is a decision the shopkeeper makes, not a fact the clock reports.**

- `day_id` is a **client-assigned date string** (`YYYY-MM-DD`), derived from device local
  time as a *default*, never as an authority.
- The day is created by an explicit act - setting opening cash (T6) - and the date is
  rendered prominently on every close screen (*"Close Tuesday 15 July?"*, confirmed in
  the screen copy). A shopkeeper closing at 00:30 after a late night sees the date he is
  closing and can correct it before the first entry.
- **The server never rewrites `day_id`.** It records `client_created_at` and
  `server_received_at`; the difference is stored as observed clock skew.
- If observed skew exceeds **+/- 12 hours**, the server raises a divergence alarm and the
  device shows a one-time, non-blocking prompt to check the date. It does **not** block a
  save (§07.01) and it does **not** silently adjust anything.
- **Never** auto-roll a day at midnight. An auto-roll would split one trading evening
  across two day records and break the carry-forward chain, which is the audit chain
  (architecture §05 4.7).

**Resumability on 2G.** Push is chunked (default 50 entries) and cursor-based; a chunk
that dies mid-request is retried whole, and idempotency makes the retry free. Pull is
cursor-based on `server_seq`. No request depends on a previous request's side effects.

**Reverse it if:** a second device per shop is ever supported, at which point this
becomes a genuine architectural change (architecture §07.05 says to treat it as one), not
a setting.

---

## ADR-005 · Backend framework is Fastify

**Status:** Accepted

**Context.** L7 runs on **one EC2 t4g.small** (2 vCPU ARM, 2GB RAM) in a public subnet,
alongside nothing else. Architecture §08 budgets INR 3,180/month total at 500 shops and
projects ~600,000 requests/month - roughly **0.25 req/s average**. This is a small,
bursty, latency-tolerant workload where boot time and memory matter far more than
throughput.

**Options.** Fastify · NestJS · Hono.

**Decision.** **Fastify.**

- **NestJS rejected** - its DI container, decorators and module graph cost boot time and
  memory to buy structure that one domain with one deployable does not need. The
  architecture explicitly rejects microservices for the same reason (§09).
- **Hono considered seriously** and it is the closest call. It is smaller and faster to
  boot. Rejected because Fastify's **JSON Schema-based validation and serialisation** is
  exactly the discipline this API needs: every sync payload is validated against a schema
  at the boundary, and we can generate those schemas from the same source as the database
  schema (ADR-006). Hono would mean wiring Zod separately.
- Fastify's schema-based serialiser also makes rule §07.03 (*nothing derived crosses the
  wire*) **mechanically checkable** - a response schema that has no `total` field cannot
  accidentally grow one.

**Reverse it if:** we ever move to Lambda, where Hono's cold start would win decisively.
The route handlers are thin enough that this is a day's work.

---

## ADR-006 · Postgres access is Drizzle, and it is the single source of schema truth

**Status:** Accepted

**Context.** G4 requires *"identical schema and identical migrations run on SQLite
(device) and Postgres (server) from one source of truth."* That requirement, not
ergonomics, decides this.

**Options.** Drizzle · Prisma · raw SQL with `pg`.

**Decision.** **Drizzle.**

- **Prisma rejected** - it needs a generated client and, historically, a query engine
  binary; on ARM with a cold start on a t4g.small that is real cost, and its SQLite and
  Postgres support are separate providers rather than one schema emitted twice.
- **Raw SQL rejected** - not for ergonomics but because hand-maintaining two dialects of
  the same migration is precisely how the device and server schemas drift, and drift here
  is the bug class the whole architecture exists to prevent.
- **Drizzle** is a thin query builder with no runtime engine, it emits **both**
  `drizzle-orm/sqlite-core` and `drizzle-orm/pg-core` tables, and `drizzle-kit` generates
  plain SQL migrations per dialect. `packages/schema` defines the tables once in
  TypeScript; both dialects are generated from it and checked into the repo.

**Consequence.** The append-only enforcement (G4) cannot be expressed in Drizzle's schema
DSL, so it lives in hand-written migration SQL appended to the generated file: a
`BEFORE UPDATE OR DELETE` trigger raising an exception on SQLite, and on Postgres both a
trigger **and** `REVOKE UPDATE, DELETE ON entries FROM app_user`. Belt and braces,
because §07.04 says *forever*.

**Reverse it if:** Drizzle's SQLite and Postgres dialect outputs diverge in a way that
breaks the shared-schema guarantee. The G4 test (migrate up/down/up on both engines) is
what would catch it.

---

## ADR-007 · Auth is phone + OTP only, on a DLT-registered Indian SMS route, with long-lived sessions

**Status:** Accepted · **has external lead time - start immediately**

**Context.** No password, no email, no social (build prompt G15 forbids email anywhere).
The user is 35-70, often not comfortable with passwords, and **every re-auth costs a real
SMS** - both money and friction.

**Decision.**

**Sessions do not expire on their own.** A shop phone is a single-user device behind a
counter (§07.05). Refresh token is long-lived and stored in the **device keystore, not
the database** (architecture D5). Access token is short (15 min) and refreshed silently.
Sign-out is explicit only.

**Device binding.** The refresh token is bound to a device id. A refresh presented from a
different device id invalidates the session and shows the screen copy already written:
*"This device signed out - usually because you signed in somewhere else. Your book is
untouched and safe on our server."*

**Number change must be reachable without being signed in** (build prompt G6). The screen
copy confirms two paths: *"I still have my old number"* (verify old, then add new) and
*"I don't have it anymore"* (manual WhatsApp verification, *"takes a day or two"*).

**PIN recovery must never lock a shopkeeper out of his own ledger** (G3). A forgotten
4-digit app lock is recovered by OTP to the same number. The screen copy already states
it: *"Forgot your PIN? We'll recover it by SMS - you're never locked out."*

**DLT registration is mandatory and is the external dependency.** Every business sending
transactional SMS to Indian numbers must register entity, headers and templates on an
operator DLT portal; **without it messages are blocked at the carrier level**. Observed
2026 timelines: **Principal Entity ID 1-3 working days**, header (sender ID) approval
**same-day to 24h** after entity approval, **template registration 1-3 business days per
template**. Since 6 May 2025 every registered header must carry a **category suffix**.

> **Correction to a planning assumption.** The build prompt states DLT registration
> "takes weeks". Current evidence says the *portal* steps are days, not weeks. The real
> lead time is **document preparation and having a registered business entity** -
> which is the part to start now. Budget ~1-2 weeks end to end, not "weeks" of portal
> queue. Recorded so the schedule is built on the actual constraint.

**Provider:** not yet chosen - deferred to a commercial decision, because all Indian
routes require the same DLT artifacts and the integration surface is one `sendOtp()`
function behind an interface. **This deliberately does not block any gate.**

**Rate limits** (detailed in G3): per number, per device, per IP, with lockout windows.

**Reverse it if:** OTP delivery reliability on a DLT route falls below ~97%, at which
point a WhatsApp Business OTP fallback becomes worth its integration cost.

**Sources:** [DLT registration guide 2026](https://www.messagecentral.com/blog/a-complete-guide-on-dlt-registration) ·
[India SMS regulations](https://www.messagecentral.com/sms-guideline/india) ·
[TRAI DLT guide](https://www.smscountry.com/blog/dlt-registration/)

---

## ADR-008 · Background sync uses WorkManager via a thin native module, and is never on the critical path

**Status:** Accepted

**Context.** Architecture §07.01: sync is *"a background consequence, never a
precondition"*. L5 must never block a user action or surface a failure on an entry screen
(§03 layer table). Android doze and OEM battery killers - aggressive on exactly the
budget OEM devices this app targets - make naive `setInterval` sync useless.

**Decision.** **WorkManager**, wrapped in a small TurboModule, with:
- constraint `NetworkType.CONNECTED` only - **not** `UNMETERED`; a shopkeeper on a 2G
  mobile connection must still sync, and the payload is tiny (entries, not blobs);
- exponential backoff from 30s, capped at 6h;
- a unique periodic work request (`KEEP` policy) so double-scheduling is impossible;
- an expedited one-shot enqueued on app foreground, so the common case syncs promptly
  without waiting for the periodic window.

**Doze.** Periodic work is deferred in doze; that is correct and we accept it. The ledger
is authoritative locally, so a delayed sync has **no user-visible consequence**. We do
**not** request `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` - it is a Play policy risk for no
user benefit here.

**Failure surfacing.** A permanent failure appears **only** in the sync detail view
(architecture D4), never on an entry screen, and **never in red** (build prompt
constraint 2). The screen copy is already written: *"You're offline - saved on this
phone. We'll sync when you're back."*

**Reverse it if:** we ever need sub-minute sync latency, which would mean the
one-shop-one-phone assumption has been abandoned.

---

## ADR-009 · Crash reporting is offline-queued, opt-in, and never carries ledger data

**Status:** Accepted

**Context.** The app runs offline for weeks, so a crash reporter that only reports online
is nearly useless here. But DPDP 2023 + DPDP Rules 2025 make consent and purpose
limitation enforceable obligations, and G3 requires that **no amounts, party names or
phone numbers ever reach a log**.

**Decision.** **Sentry React Native**, self-hosted or India/Asia-region, with:
- **offline caching enabled** so crashes queue on device and upload with the next
  connection - the same posture as the ledger outbox;
- **opt-in**, defaulted **off**, presented in settings as plain language, not a
  pre-ticked box. DPDP consent must be free, specific, informed and unambiguous;
- `sendDefaultPii: false`;
- a **scrubbing `beforeSend` hook** that drops any breadcrumb or extra whose key matches
  the money/party/phone pattern, and truncates all string values to 64 chars;
- **no** automatic screenshot or view-hierarchy attachment - a crash on the cash-check
  screen would otherwise photograph the day's figures.

**Proof obligation (G3).** A test greps the full log output of a complete day-close for
the canonical sample figures (`6780`, `2400`, `6300`, `6050`, `1500`) and for a sample
party name and phone, and **fails if any appears**. Untested log hygiene is not log
hygiene.

**Reverse it if:** the scrubbing hook proves unable to guarantee the property - in which
case we drop the hosted reporter and keep a local-only ring buffer the user can
explicitly export from the help screen.

---

## ADR-010 · npm workspaces, Node 24 LTS, React Native 0.87 with the New Architecture on

**Status:** Accepted

**Monorepo tool: npm workspaces, no Nx/Turborepo.** Five packages
(`formula-engine`, `schema`, `api`, `mobile`, `tools`). Turborepo's remote caching
solves a problem a team of this size does not have.

> **AMENDED at G3 — was pnpm.** Reason: every gate in the build prompt verifies with
> `npm run ...` and `npm audit --audit-level=high`. Using pnpm would mean either
> rewriting the gate commands or maintaining a shim, and neither buys anything. npm 11
> ships with Node 24, so this removes a tool rather than adding one.
>
> **What the change costs us.** pnpm's strict `node_modules` layout would have made an
> accidental import of a transitive dependency a build *error* — useful, because the
> rule is that `formula-engine` imports **nothing**. npm's hoisted layout does not.
> **Replacement control:** a CI check asserting `packages/formula-engine/package.json`
> has an empty `dependencies` object, plus the lint ban on `Date.now`, `new Date()`,
> `Math.random`, `Intl` and `process` inside that package (ADR-012). The property is
> still enforced, just by a test rather than by the resolver.

**Node: 24 LTS.** Node 24 is the current Active LTS in 2026; Node 22 is in maintenance;
Node 26 released May 2026 but does not enter LTS until October 2026. **Pin 24** - the
backend runs unattended on a single box, and Current-channel churn buys nothing here.
Node 26 is the upgrade target once it is LTS and after the vectors pass on it.

**React Native: 0.87**, latest stable as of late August 2026. **New Architecture ON** -
it has been the default since 0.76 and is no longer experimental; it is also the
precondition for op-sqlite's JSI synchronous reads (ADR-002).

**TypeScript:** `strict: true`, plus `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`. In a money engine, `undefined` slipping through an index
access is a wrong number on a screen.

**`packages/formula-engine` has zero runtime dependencies.** Enforced in CI by asserting
its `package.json` `dependencies` is empty. Purity is the property that lets it run
identically under Node and Hermes (ADR-012).

**Reverse it if:** build times exceed ~5 minutes, at which point Turborepo earns its
config. Revert to pnpm if the empty-dependencies CI check proves insufficient in
practice — i.e. if a phantom-dependency import ever reaches main.

**Sources:** [Node.js release schedule](https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule) ·
[endoflife.date/nodejs](https://endoflife.date/nodejs) ·
[RN versions](https://reactnative.dev/versions) ·
[RN New Architecture](https://docs.expo.dev/guides/new-architecture/)

---

## ADR-011 · Performance budgets for the 2GB Android profile, enforced in CI

**Status:** Accepted · **measurement blocked on hardware (G18)**

**Context.** The target is a INR 7,000 Android handset, ~2GB RAM, often 2G or no signal.
Budgets set now, before the code exists, so they constrain design rather than
rationalising whatever we end up with.

| Metric | Budget | Why this number |
|--------|--------|-----------------|
| Cold start to interactive Today | **<= 2,500 ms** | Above this he opens the paper sheet instead |
| Taps to first digit of a cash sale | **<= 2** | Strategy 1's headline measure (`taps_to_first_digit`) |
| Time from rail tap to focused keypad | **<= 400 ms** | Must feel like the form was already open |
| Keypad keypress to digit rendered | **<= 60 ms** | Below the ~100 ms perceptual-immediacy threshold; budget-device displays are laggy and double-taps are routine (edge case E8) |
| Day-close full recomputation (25 entries, all P+OP) | **<= 150 ms** | Derive-on-read must stay cheaper than caching (architecture §06) |
| Report render, 30-day window, all BI | **<= 800 ms** | Once per session, tolerable |
| Local write commit (save to form dismissed) | **<= 100 ms** | §07.01, *the local write is the write* |
| APK size (arm64 split) | **<= 25 MB** | Download cost on a metered 2G connection is a real barrier |
| Memory, steady state | **<= 180 MB** | Headroom against OEM low-memory killers on 2GB |

**Enforcement.** A CI job compares measured values against this table and **fails the
build** when exceeded. Budgets are in this file, not in the CI config, so changing one is
a visible decision in a diff.

**Blocked:** the measurements need a physical 2GB device or a configured emulator. The
harness and the failing comparison will be written; the numbers cannot be invented. See
BUILD_STATE "Blocked on human" §2.

---

## ADR-012 · One Formula Engine, proven by golden vectors under both Node and Hermes

**Status:** Accepted · supersedes architecture §02 (*"implemented twice"*)

**Context.** The architecture document is emphatic that the engine should be *specified
once and implemented twice* - Dart on the client, TypeScript on the server - with
`vectors.json` as a shared fixture and CI failing on divergence. Its stated reason:
*"sharing code across Dart and the server language creates a build coupling you will
regret."*

**Decision.** With ADR-001 making the client TypeScript, that objection **evaporates** -
there is no cross-language coupling to regret. One package,
`packages/formula-engine`, imported by both the RN app and the Node backend.

**What is preserved from the original intent, and it matters:**

1. **`vectors.json` still exists** and is still the artefact a new developer reads to
   learn the product's actual rules. >= 30 cases, each with inputs and every expected
   P/OP/BI value.
2. **Vectors execute under Node *and* under Hermes**, and CI diffs the two result sets
   and fails on any difference. This catches the real remaining risk: a runtime-level
   numeric or `Intl` discrepancy between the server's V8 and the phone's Hermes.
3. **Architecture §07.06 is retained in full.** The server still independently recomputes
   on sync and **raises an alarm on divergence rather than overwriting**. Sharing the
   code removes implementation drift; it does **not** remove the need to detect
   corruption, a bad migration, or a stale client version. *A money app that silently
   corrects itself is a money app whose bugs you never find.*

**Purity contract.** No I/O, no clock, no locale, no network, no randomness. Time and
timezone are **passed in**. Enforced by the zero-dependencies check (ADR-010) and a lint
ban on `Date.now`, `new Date()`, `Math.random`, `Intl` and `process` inside the package.

**Reverse it if:** never, while client and server share a language.

---

## ADR-013 · Text scales with the OS, uncapped where it can reflow and capped at 1.5 where it cannot

**Status:** Accepted · injection 09 C.5

**Context.** Users are 35-70 and many have presbyopia. A system font scale of 1.3 is
ordinary in this group, and Android 14 offers up to 2.0. React Native's
`allowFontScaling` defaults to true and can be turned off per `Text`.

**The trap is the obvious fix.** Turning `allowFontScaling` off makes every layout safe
immediately and **betrays the entire reason B29 exists**. B29 sets a 17sp floor because
these users cannot read small text; overriding their own accessibility setting to
protect our layout inverts that.

**Decision. Scaling is never disabled anywhere. Not once, not "just for this label".**

Two regimes, because they fail differently:

1. **Scrollable content - body text, section labels, the money figures on the Today and
   Close screens - is UNCAPPED.** It scales to whatever the OS says, and layouts reflow.
   Text wraps, rows grow taller, the screen gets longer. A longer screen on a phone is
   not a defect.
2. **Fixed-height chrome - keypad keys, the bottom navigation, button labels, table
   headers - is capped at `maxFontSizeMultiplier={1.5}`.** These live in boxes whose
   height is set by B28's 56dp touch-target floor. Unbounded growth there does not
   reflow; it clips the label or shrinks the tap area, and a keypad key that is hard to
   hit is worse for this user than a key whose label stopped growing at 1.5.

**Why 1.5 and not 1.3.** 1.3 is the common setting, so capping there would cap the
typical user rather than the extreme one, which defeats the purpose. 1.5 clears the
ordinary range and still bounds the layout.

**Enforced by, at G10:**

- a static rule that `allowFontScaling={false}` appears **nowhere** in the client;
- a static rule that every `maxFontSizeMultiplier` is applied through the shared
  typography components, so the cap cannot be sprinkled ad hoc;
- B31 (layout overflow in any language) measured at scale **1.0, 1.3 and the OS
  maximum**, in all three languages, on the longest-string fixture required by B.5 of
  the screen-phase contract. Longest string AND largest scale together, because each
  alone passes screens that the combination breaks.

**Reverse it if:** a real device pass shows the 1.5 cap on chrome still clipping - in
which case the chrome layout is wrong and the cap is hiding it, so the layout gets
fixed rather than the cap lowered.

---

## ADR-014 · The amount display is a `Text`, not a `TextInput`, so no system keyboard can exist

**Status:** Accepted · injection 09 C.6

**Context.** C.6: the custom keypad must suppress the system keyboard, because if both
appear the amount field is unusable - and it is the single most-used control in the
product. The usual remedy is `showSoftInputOnFocus={false}` on a `TextInput`.

**Decision. Do not suppress the keyboard. Remove the thing that summons it.**

The amount is rendered as a **`Text`** inside a pressable container, with the digits
supplied entirely by our keypad and a caret we draw ourselves. There is no focusable
text input on the screen, so there is no state - no OEM keyboard, no accessibility
service, no hardware keyboard attaching, no split-screen focus change - in which a
system keyboard can appear over the amount.

`showSoftInputOnFocus={false}` is a flag that has to hold on every OEM and every RN
version. Having no input at all is not a flag.

**What this costs, stated plainly.** Native text selection, copy and paste, and the
platform's own cursor. For a field that accepts ten digit keys, a backspace and a
clear, none of those is load-bearing. Accessibility is **not** given up: the container
carries an `accessibilityRole`, an `accessibilityLabel` naming the field, and an
`accessibilityValue` whose text is the formatted amount, so a screen reader announces
the running value as it is typed.

**Where the system keyboard IS correct and stays.** The expense `label` field (Form C)
and the party-name field are real free text and use a real `TextInput`. This rule is
about the AMOUNT - the same field constraint 1 forbids any AI from touching.

**Enforced by, at G11:**

- a static rule: no `TextInput` may appear in the amount component, and no `TextInput`
  anywhere in the client may set a numeric `keyboardType` - if a number is being typed,
  it is being typed on our keypad;
- the render test the build prompt already requires: the keypad is present on exactly
  the seven keypad screens and absent everywhere `BottomNav` renders.

**Reverse it if:** a real device pass shows a screen reader cannot operate the custom
field acceptably. Accessibility beats purity, and the fallback is a `TextInput` with
`showSoftInputOnFocus={false}` plus a per-OEM test matrix.

---

## ADR-015 · Process death keeps every committed line and deliberately DISCARDS the half-typed amount

**Status:** Accepted · injection 09 C.7

**Context.** C.7: a shopkeeper takes a phone call mid-expense and Android kills the
app. Decide what survives.

**What already survives, and it is most of it.** Per constraint 2, every committed line
is an append to local SQLite at the moment it is committed. Those are not "in memory
pending a save" - they are durable before the phone call starts. Process death loses
nothing that was entered as a line.

**The only open question is the field being typed at the instant of death**, and the
answer is not the obvious one.

**Decision.**

1. **Committed lines: restored, silently and completely.** Reopening the form shows them
   exactly as they were. No prompt - there is nothing to ask about.
2. **The in-progress amount: DISCARDED, and the discard is announced.** The form reopens
   with an empty amount field and a non-blocking banner along the lines of *"3 lines
   saved. The amount you were typing was not saved."*

**Why discarding is the safe choice and restoring is the dangerous one.** A resurrected
half-typed amount is a WRONG NUMBER THAT LOOKS LIKE A RIGHT ONE. Someone typing 450 who
is interrupted after 45 comes back to a field reading 45 - in the right place, looking
finished, one tap from being committed as a real expense. Silently restoring partial
input into a money field manufactures plausible wrong figures. Losing three keystrokes
costs three seconds; committing 45 for 450 corrupts a day's reconciliation, and the
shopkeeper finds out at closing time when the cash does not match and he has no idea
why.

**Other state.** The section being entered, the selected party and the date are
restored - none of them is a partial value, each is either chosen or not. Only the
numeric field, where "partial" is indistinguishable from "complete", is dropped.

**Persistence mechanism.** Form state is written to SQLite - not AsyncStorage, which has
no transactional guarantee and is the wrong durability tier for anything adjacent to
money - on each line commit and on every `AppState` transition away from active. The
in-progress amount is deliberately **never** written, which also removes any need for a
debounced per-keystroke write.

**Enforced by:** a G12 test that kills the process mid-entry, relaunches, and asserts
both halves - every committed line present, the in-progress amount empty, the banner
shown. Restoring the amount must make that test FAIL, not pass.

**Reverse it if:** field observation shows users routinely losing long amounts to
interruptions and re-entering them wrongly. The fix then is a restored-but-clearly-
marked value requiring an explicit confirm, never a silent restore.

---

## ADR-016 · Back on an entry form exits without a dialog when there is nothing to lose, and names what will be lost when there is

**Status:** Accepted · injection 09 C.8

**Context.** C.8: the Android back button inside a full-screen entry form. Discarding
typed lines silently is the worst outcome available.

**Decision, in three cases, decided by what is actually at risk.**

1. **Nothing typed in the amount field: back exits immediately, no dialog.** Committed
   lines are already saved, so nothing is lost and there is nothing to confirm.
2. **Digits typed but not committed: a confirm that NAMES the value** - *"Discard the
   amount you are typing?"* with the partly typed figure shown, and *Keep typing* as the
   default action. Not a generic "Discard changes?", which tells the user nothing about
   what they are about to lose.
3. **Committed lines are never at risk in either case**, and the dialog never implies
   they are. They are already in the ledger.

**Why not confirm every time.** A dialog that appears when there is nothing to lose
trains people to dismiss dialogs without reading them - and the one dialog in this
product that must be read is the day-close confirmation. Spending that attention on a
form exit is a bad trade. The dialog appears only in case 2, which is exactly when it
carries information.

**The hardware back button and the on-screen back affordance do the same thing.** Two
paths out of a screen that behave differently is its own defect.

**Enforced by, at G11:** a test on each of the seven keypad screens covering all three
cases, **including that case 1 shows NO dialog**. A check that only ever asserts the
dialog appears would pass an implementation that always shows it, which is the failure
mode being guarded against.

**Reverse it if:** device testing shows users reaching case 2 often and being confused
by the confirm. The alternative is to auto-commit a complete-looking amount on back,
which is rejected for the same reason ADR-015 discards partial input.

---

## ADR-017 · The client shows the OPEN DAY's date, never the device's, and a clock correction is recorded rather than applied

**Status:** Accepted · injection 09 C.9 · extends ADR-004 (3) to the client

**Context.** ADR-004 already ruled on the server and the data model: `day_id` is
client-assigned, derived from device local time as a *default and never an authority*,
the server never rewrites it, observed skew is stored, and beyond +/- 12 hours an alarm
is raised. C.9 asks the two client questions that ruling does not answer: what the app
SHOWS at 23:58 with a clock ten minutes fast, and what it DOES when the clock corrects
itself after a sync.

**Decision A - what is on screen at 23:58 with a fast clock.**

The device says 00:08 tomorrow. Nothing happens. There is no auto-roll (ADR-004), so
the open day is still yesterday's record, and:

- **Every screen header shows the OPEN DAY's date, spelled out** - *"Tuesday 15 July"* -
  never the device's current date and never a relative word. **A relative word is banned
  as a date label**, in all three languages. It is the one label that can be wrong on
  screen while being wrong in the data, and in this scenario it is precisely wrong. The
  Today *screen* keeps its name as a destination; it does not use that word to label a
  date.
- The mismatch is therefore visible to the shopkeeper, who knows perfectly well what day
  it is, at the moment it matters - before the first entry, and again on the close
  confirmation, which already spells the date out.

**Decision B - the clock corrects itself.**

- **No recorded timestamp is ever rewritten.** `created_at` is what the device believed
  at the time; it is evidence, not a measurement. Rewriting it would destroy the only
  signal that a correction happened.
- The correction is appended as its own device event, so the skew history stays
  reconstructable. The server continues to record `client_created_at` against
  `server_received_at` per ADR-004.
- **The open day does not move.** If the correction changes what the device calls today
  while a day is open, the open day stays open and stays its own date. Rolling it would
  split one trading evening across two records and break the carry-forward chain, which
  is the audit chain.
- **If the correction lands the device inside a day that is already CLOSED**, nothing
  special is needed, and that is the point: the SQL trigger from AD-014 already rejects
  any entry whose `day_id` names a closed day, on both engines. D7 holds whatever the
  clock does, because it is enforced below the clock.

**Decision C - a backward correction reorders UUIDv7 ids, and that is tolerated,
deliberately.**

Entry ids are UUIDv7, which embeds a millisecond timestamp, so a backward clock jump
produces ids that sort BEFORE ids issued earlier in real time. Anything ordering entries
by id would interleave them wrongly for the width of the correction.

**Verified before deciding, not assumed: no figure depends on entry order.** Every total
in the engine is a `sum` over a section's entries, and sums are order-independent. The
ordered outputs that do exist - OP6's warnings, P3's working lines, BI1's ranked
parties - are ordered by value with a deterministic tiebreaker, never by `created_at`
and never by id. Intra-day entry order affects the *display list only*.

So the day sheet lists entries by `created_at` with `id` as tiebreak, and this is
documented as **best-effort chronological, not a guarantee**. A backward correction can
reorder entries within the affected window. No figure changes, no total changes, no
reconciliation changes.

**What is NOT done, and why.** A monotonic per-day local sequence column would make
entered-order exact. It is not added: it costs a schema column and a client counter to
fix a cosmetic reordering in a window that only opens when a device clock moves
backwards, and idempotency already depends on the id being client-generated rather than
ordered.

**Enforced by:** the purity contract (ADR-012) already bans `Date.now()`, `new Date()`
and `Intl` inside the engine, so it structurally cannot read a clock and cannot be wrong
about the day - `today` is an input, and that ban is already checked. The client rules
above are G10 checks: a static rule that no date label renders a relative word, and a
test that the header tracks the open day rather than the device date.

**Reverse it if:** an ordering guarantee is ever needed - a per-entry audit view, a
regulator asking for entered order, or an intra-day figure that becomes order-dependent.
Then a local monotonic sequence goes in, and it must be added **before** the data it
would order exists.

---

## Summary of what is blocked or deferred

| Item | State | Why |
|------|-------|-----|
| SMS provider choice | Deferred | Commercial decision; one `sendOtp()` behind an interface; blocks no gate |
| DLT registration | **Start now** | Needs a registered business entity; ~1-2 weeks with document prep |
| ADR-011 measurements | **Blocked** | Needs a physical 2GB device or configured emulator |
| op-sqlite benchmark | Owed at G18 | Blog claims are not evidence for our workload |
