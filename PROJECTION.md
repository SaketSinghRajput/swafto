# PROJECTION

**Written at iteration 20 of a 60-iteration ceiling, because an early projection is
cheap and discovering at 50 that the instruments alone need fifteen iterations is
not.** Everything here is an estimate and is labelled as one. The only hard numbers
are the ones already measured.

---

## Where the build actually is

| | count | note |
|---|---|---|
| Iterations used | 20 of 60 | a ceiling, not a target |
| Gates PASS | 6 of 21 | G0-G5 |
| Benchmarks instrumented | **16 of 40** | was 10 this morning; **0 now overdue** |
| Benchmarks blocked on a subject | 24 | each names the artifact and the gate |
| Screens built | **0 of 27** | 15 of them P0 |
| API routes | **0** | the backend is an SMS port and a rate limiter |
| Tests | 303, 0 skipped | |

The honest summary of the first twenty iterations: **the engine and the governance
are in good shape, and the product does not exist yet.** Everything with a screen or
an endpoint is ahead.

---

## Estimate, gate by gate

Velocity basis: iterations 14-20 delivered roughly one substantial unit each - the
font work, the five client ADRs, the rate limiter, typecheck and lint, the verifier
inventory, the instruments. I am estimating in those units, and I expect the client
gates to run worse than the backend ones because none of that ground has been touched.

| Gate | Work | Est. |
|---|---|---|
| G6 | Auth service on the limiter: OTP issue/verify, device binding, revocation | 3 |
| G7 | Sync API, idempotent, 3x replay byte-identical. **Carries B1, B8** | 3 |
| G8 | Read API through the shared engine. **Carries B5, B6 properly** | 2 |
| G9 | Pipeline, Terraform, the DC-003 control, container scan. **Carries B34** | 3 |
| G10 | Design tokens, Comfort/Focus. **Carries B26, B27, B29** | 2 |
| G11 | Four form archetypes and the keypad rule. **Carries B17, B28** | 3 |
| G12 | The day close - nine sections, three states. **Carries B19, B32** | 3 |
| G13 | The ending, four screens | 2 |
| G14 | Today, parties, reports. **Carries B16, B20, B23** | 3 |
| G15 | Scaffolding, 13 launch-blocking screens. **Carries B38** | 3 |
| G16 | Localisation od/hi/en. **Carries B30, B31** | 2 |
| G17 | 30-day offline endurance. **Carries B9, B25** | 1 |
| G18 | Low-end device performance on the AVD. **Carries B14-B23** | 2 |
| G19 | Traceability closure - instrument already rebuilt | 1 |
| G20 | Adversarial self-review | 1 |
| | **subtotal** | **34** |

**20 used + 34 = 54 of 60.** Six iterations of slack, about ten percent.

### Why I distrust that number, in both directions

**It is probably optimistic.** Twelve of the 34 are client gates on ground with no
code at all - not one component exists. Every estimate in this build that involved
unfamiliar ground has been wrong low: the font work was meant to be "bundle a file"
and became three iterations across two injections. Fourteen iterations for 27 screens
plus their instruments is under half an iteration per screen.

**It ignores injections, and it should not.** Six have arrived in twenty iterations,
costing between half an iteration and three each. At that rate, add 6-10 - which puts
the total past 60.

**§5.13 does NOT add 24 iterations for the 24 blocked instruments**, and that is the
genuinely reassuring part. Each is built in the iteration its subject first exists, as
part of that gate rather than after it, and the estimates above already include them.
The rule converts a fifteen-iteration backlog into a per-gate tax of perhaps 20%.

**Realistic read: 54 if nothing surprises, past 60 once injections and the client
unknowns are priced in.** The ceiling is no longer comfortable. It is reachable if
scope gives, and scope is the human's decision, not mine.

---

## What I would cut, in the order I would cut it

Ranked by how little it costs the shopkeeper. **I am cutting none of this now** - this
is the list to reach for when the ceiling gets close, so the decision is made
deliberately rather than by running out of iterations.

**1 · The BI screens, not the BI engine.** BI1-BI4 and BI6 are gated at 14 to 21
closed days. A shopkeeper who installs on day one cannot see any of them for three
weeks. The engine functions and their vectors are written and tested already; what
would be cut is the Reports GateCard UI. Cost to the user in their first month:
**nothing**. The cheapest real cut available, and it buys 2-3 iterations.

**2 · Eight of the twelve non-P0 screens.** The inventory is 27 with 15 marked P0.
The P0 set is the product. Deferring most of the remainder buys 2 iterations and
costs polish, not function.

**3 · Reports depth.** Ship the day summary and the party ledger; defer trend views.
About 1 iteration.

**4 · Anything that creeps toward UPI import.** D1 keeps UPI manual in V1 and `source`
exists only to keep that reversal cheap. Nothing to cut yet - this is a watch item.

### What must not be cut, at any point

- **The day close and the four form archetypes.** This is the product. A shopkeeper
  who cannot close his day has nothing.
- **Odia.** The primary language, not a localisation nice-to-have.
- **Offline-first and the append-only ledger.** The two promises. Break either and the
  app is untrustworthy, and trust is priority 2.
- **The money path** - integer paise, one formatting function, tabular figures. A
  wrong rupee figure is the one defect this product cannot survive.
- **The keypad and the 17sp floor.** For users aged 35-70 on a INR 7,000 handset these
  ARE the product's accessibility, not decoration on it.
- **H8, the physical device pass.** One hour with a real handset is worth more than
  any number of AVD runs, and DC-004 stays MEDIUM until it happens.

---

## The three things most likely to break this projection

1. **The client gates, G10-G16.** Twelve of 34 iterations on ground with zero code.
   The nine C-traps were front-loaded precisely to de-risk this and it does help - but
   front-loading decisions is not the same as having built anything.
2. **The mutation harness.** It sees 170 of 303 tests, so B4 and B6 cannot be claimed
   until that is fixed, and I do not yet know whether the cause is cheap.
3. **Further injections.** Historically the largest single cost and entirely outside
   my control. They have also produced the build's best findings, so this is an
   observation about the budget, not a complaint.

---

## When to revise this

Re-read at **G9** - backend complete, client not started - and again at **G12**, the
first honest read on screen velocity. **If G10 and G11 together take more than six
iterations, cut item 1 immediately** rather than waiting for the ceiling to force it.
