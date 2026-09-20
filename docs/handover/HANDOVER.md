# HANDOVER

**SWAFTO Retail Desk V1 · written at iteration 36 · every figure measured in the
verification run recorded at the end of `docs/governance/BUILD_LOG.md`.**

This is written for a team that has never seen this repository. It assumes nothing
about what you were told and it hides nothing about what is missing.

If you read one thing, read §5. It is where I say what I think is weakest about what
I built.

---

## 1 · WHAT WORKS, AND HOW TO RUN IT

**A shopkeeper can sign in, enter a day on a keypad, close it, and the server has it.**
That path is real, and one test walks the whole of it through the same code the app
would run.

```bash
npm ci
node tools/pg-up.mjs          # a throwaway Postgres; some suites skip without one
npx vitest run                # 36 files, 1,210 tests
npm run check:all             # 25 checks
```

The end-to-end path specifically:

```bash
npx vitest run test/pipeline.spec.tsx
```

That file builds the **real** Fastify app and the **real** mobile store, session and
API client, and connects them with a transport that hands each request to
`app.inject()` instead of to a socket. Nothing in it is mocked except the cable. It
covers: reading the privacy notice before an account exists, consenting per purpose,
signing in, typing a day on the keypad, pushing it, the server's figures agreeing with
the engine's, closing the day, going offline and losing nothing, having a row refused
and keeping it, withdrawing consent from the screen, exporting, redacting a customer,
and erasing the account.

**What you can look at rather than read about:** `docs/contact-sheet/index.html`. 55
panels, every screen in Odia and English, at Comfort and Focus. The Odia rendering
question is answered by looking at it.

### The shape of the thing

| Piece | Where | State |
|---|---|---|
| Formula engine | `packages/formula-engine` | 26 functions, 77 golden vectors, identical on Node and Hermes |
| Schema | `packages/schema` | one spec, emits SQLite and Postgres; append-only and closed-day enforced by triggers on both |
| API | `apps/api` | auth, sync, read, DPDP, public deletion. Two repository implementations held to one contract |
| App | `apps/mobile` | 11 screens, each meeting the §B.6 bar; store, session, API client, composition root |
| Web | `apps/web` | the deletion page Play requires, the privacy policy, the terms |
| Tools | `tools/` | 25 checks, each proven by planting a defect and requiring a failure |

**There is no APK.** See §4 and §5.

---

## 2 · THE BENCHMARK TABLE

The full partition is generated into `docs/benchmarks/BENCHMARKS-RESULTS.md` and is
never hand-edited. The summary, derived:

| State | Count | Which |
|---|---:|---|
| **MET**, with a measured value | 6 | B1 B2 B5 B12 B33 B40 |
| **MISSED — PERFORMANCE** | 1 | B3 |
| **MISSED — SCOPE** | 2 | B38 B39 |
| **Instrumented**, no single pass/fail number | 14 | the screen and layout cluster |
| **Overdue** — subject exists, nothing measures it | 2 | B4 B6 |
| **Blocked** — no subject yet | 15 | B7 B9 B14–B23 B25 B34 |

The ones carrying a number you can check today:

| Benchmark | Threshold | Measured | Command |
|---|---|---|---|
| B1 Golden vectors | ≥ 70, 100% pass | **77, 100%** — MET | `npm run test:vectors:node` |
| B2 Node vs Hermes divergence | exactly 0 | **0** — MET | `npm run check:divergence` |
| B3 Engine branch coverage | 100% | **86.34%** (196/227) — MISSED | `npm run coverage:engine` |
| B5 Backend line coverage | ≥ 85% | **86.42%** (681/788) — MET | `npm run coverage:api` |
| B12 Money float lint | 0 violations | **0** — MET | `npm run check:money` |
| B33 npm audit high/critical | 0 | **0** — MET | `npm audit --audit-level=high` |
| B40 Stubs in shipped paths | 0 | **0** — MET | `npm run check:governance` |

**B3 is a genuine performance miss** and is reported as one. The uncovered branches are
named file by file in BENCHMARKS-RESULTS; most are gate-closed arms in
`intelligence.ts` that need fourteen closed days of history to reach.

**B38 and B39 are SCOPE misses** — the owner's cut, not a failure. B38 asks for 27 of 27
screens and eleven exist; B39 asks for every traceability row complete and twelve rows
name deliberately deferred screens. **No threshold was moved and "screen" was not
redefined.** A scope miss is a decision; a performance miss is a failure; the file keeps
them apart on purpose.

**Fifteen are blocked on an APK and a handset** (B14–B23 are the performance set). They
are not failures and they are not passes. They have never been measured, and the table
says exactly that rather than estimating.

---

## 3 · WHAT WAS CUT — `docs/handover/DEFERRED.md`

24 rows. The four that matter most to somebody resuming:

- **The app lock (T1.1/T1.2).** Without it a customer can pick up an unlocked phone and
  read the day's cash. It is optional by design, so its absence is a disclosed risk
  rather than a defect — but it should be the first thing back.
- **Export.** No accountant hand-off. The API already carries the required disclaimer;
  the screen does not exist.
- **Parties screens (P1–P3).** The routes exist, including per-party export and
  redaction; nothing renders them.
- **Reports and the BI gates.** The engine computes them and nothing displays them.

Each row in DEFERRED carries what it blocks and what it costs.

---

## 4 · WHAT NEEDS A HUMAN — `docs/handover/HUMAN-ACTIONS.md`

14 items. Nothing in that file blocks the build; each needs a legal identity, a
credential, a payment method or a physical object.

The ones on the critical path to a public launch:

| | What | Why it cannot be code |
|---|---|---|
| **H14** | A JDK, the Android SDK, a release keystore | **No APK exists.** This machine has no `java`, no `adb` and no SDK — checked, not assumed. The JavaScript side is complete and exported; §5.1 is the honest assessment |
| **H8** | The physical device pass | B14–B19 cannot be had any other way, and this build refuses to claim them from a browser |
| **H1** | DLT registration | No real SMS is delivered without it. Fifteen templates are registration-ready in `docs/spec/SMS-TEMPLATES.md` |
| **H5** | Publish three pages | `swafto.app/delete-account` **blocks Play submission**; the policy and terms are required alongside it. All three exist in `apps/web` |
| **H6** | Name the grievance officer | DPDP §13 wants a person, and the app currently names an address |
| **H13** | Native review of the Odia and Hindi copy | Nobody on this build reads Odia. Every string renders and fits; whether it reads correctly is not mine to judge |
| **H9** | Counsel review | The policy and terms say on their own first screen that no lawyer has read them |

---

## 5 · THE THREE WEAKEST PARTS

I built this without review. These are the places I would look first.

### 5.1 · Nothing has ever run on a phone

This is the big one and everything else is second to it. There is no APK, no Gradle
project, no `AppRegistry` call. Eleven screens are proven as **element trees**: which
component rendered, with which props, showing which figure, derived from which store.
Layout is measured in headless Chromium at a budget-handset viewport, which shapes text
the same way and does **not** reproduce Android's font-scale machinery, its touch
handling or its memory pressure.

So: every claim in this repository about structure, arithmetic and data flow is tested.
**Every claim about how it behaves in a hand is untested**, and B14–B23 say so rather
than estimating. The gap between "the tree is right" and "the app is good on a ₹7,000
handset" is exactly the gap nobody here can close.

*What I would do:* H14, then H8, before anything else on this list. The first real
device session will produce a list of defects that no amount of further work here could
have predicted.

### 5.2 · The Odia and Hindi copy is mine, and I cannot read it

Every user-facing string exists in three languages and every non-English one is a draft
produced without a native reader. The contact sheet proves the text **renders and
fits**. It cannot prove it is *right*, and a shopkeeper told something confusing about
consent — or about what deleting his account will do — has been failed by this product
in a way no test here can see.

The `consent.*` strings and the deletion copy are the highest stakes, because both are
the basis of a legal act by the person reading them.

*What I would do:* H13 before any public release, and treat the English as
authoritative until it is done. The strings carry a `COPY_REVIEW_STATE` marker and the
API's notice ships a `reviewState` field, so a client can refuse to show unreviewed
text.

### 5.3 · Everything downstream of the database is imagined

There is no infrastructure. No Terraform, no deployment, no backups, no monitoring, no
rotation. The API is proven against a real Postgres with real migrations, real triggers
and real row-level security — and then the story stops.

That matters for three specific promises this product makes in writing:

- **L-06.** The privacy policy says deleted data leaves the backups within 90 days.
  `purge-due` erases the live rows; nothing rotates a backup, because there is no
  backup. The promise is currently kept by there being nothing to keep it against.
- **S-19.** Restore is unproven. An untested backup is not a backup.
- **B34 and the deploy path.** No container has ever been built.

*What I would do:* stand up the smallest real environment that can take a deploy and a
restore drill, before adding a single feature. The purge job needs a scheduler: give it
one, and watch it run once.

**A fourth, stated because it is close behind.** The build's own instruments found five
defects in *themselves* in the last iteration alone — a checker scoped to four
hand-listed files, a tripwire blind to unlisted SDKs, a log test that proved nothing, a
flaky layout reading, and a plant aimed slightly beside its guard. They were found
because the harness is attacked on a cadence. **Keep doing that.** The day the
adversary pass is skipped is the day the numbers start meaning less than they say.

---

## 6 · RESUME INSTRUCTIONS — the next five things, in order

1. **H14: make an APK.** Install a JDK 17 and the Android SDK, generate the native
   project at `apps/mobile` with the React Native CLI, and write `index.js` — it is
   about ten lines and `HUMAN-ACTIONS.md` §H14 has them. Everything it imports exists
   and is tested. **Do not start anything else first.**
2. **H8: run `docs/handover/DEVICE-CHECKLIST.md` on a real ₹7,000 handset.** Measure
   B14–B19 and write the numbers into BENCHMARKS-RESULTS. Expect defects; they are the
   point of doing it.
3. **H13 and H9 in parallel, because they have lead time.** A native Odia reader for
   the screen copy and the SMS templates; counsel for the policy and the terms. Neither
   blocks your work and both block launch.
4. **H5 and H1: publish and register.** The three pages in `apps/web` need hosting —
   `swafto.app/delete-account` is a Play submission blocker — and the DLT entity,
   header and templates need submitting.
5. **Then the deferred set, from the top of `DEFERRED.md`: the app lock first.** It is
   the one cut item that is a disclosed security risk rather than a missing
   convenience.

### How to work in this repository

- **`TASKS.md` says what is next**, and every box in it is derived from a predicate. Do
  not tick one by hand; `check:tasks` will catch it, and it is right to.
- **`npm run check:all` before every commit.** 25 checks, and they have caught their
  own author far more often than they have caught anything else.
- **`npm run prove:verifiers`** plants a real defect in each check and requires a real
  failure. Run it whenever you change a check. A check that has stopped checking is
  worse than no check, because everything behind it is presumed safe.
- **Never move a threshold to make a benchmark pass.** `BENCHMARKS.md` is SHA-locked and
  the lock is verified. A missed benchmark honestly reported is a result; a met one
  achieved by moving the line is a lie.
- **The generated documents regenerate.** `PLAN.md`, `TASKS.md`, `DESIGN.md`,
  `FINDINGS.md`, `VERIFIERS.md`, `LICENCES.md`, `DATA-SAFETY.md` and
  `BENCHMARKS-RESULTS.md` are written by tools. Edit the tool.
- **Read `docs/governance/REVIEW.md` before trusting a guard.** It lists what each one
  is scoped by and whether anybody has ever attacked it along that axis.
