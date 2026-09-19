# PROJECTION

**Repriced at iteration 20 against a hard ceiling of 40.** Replaces the 60-iteration
version written earlier the same day; that one is in git at `8e067f5`. 20 iterations
remain.

**The short answer to A.7: sixteen screens do not fit, and cutting from the bottom of
the A.3 list does not rescue them either. The binding constraint is not the screen
list - it is the sixteen iterations of server work sitting in front of it.**

---

## The arithmetic, with the queue exactly as section D writes it

| # | Work | Est. |
|---|---|---|
| 1 | §5.14, FINDINGS.md, the status-derivation sweep | 1 |
| 2 | The canonical value registry | 2 |
| 3 | The mutation harness and the twelve survivors | 2 |
| 4 | rejects.json and the B3 re-measurement | 2 |
| 5 | DC-003's compensating control | 1 |
| 6 | The OTP service, G6 | 2 |
| 7 | G7, the sync API | 3 |
| 8 | G8, the read API | 2 |
| 9 | The two fixtures | 1 |
| | **before a single screen** | **16** |
| | **left for the A.3 screen set** | **4** |

Four iterations. The A.3 set is about sixteen screens, each owing §B.6 in full - both
fixtures, four states, three languages, longest string at maximum font scale, contrast
and target checks, a contact sheet. **Four iterations buys three or four such
screens**, and the first of them must also stand up a React Native project that does
not exist, the design tokens, the i18n scaffolding and the screen-test harness.

So the queue as written delivers **item 1 and perhaps item 2**: the four form
archetypes, maybe the day-close list. **It does not close a day.** That fails A.2,
which is the target the ceiling was set around.

Cutting from the bottom of A.3 - parties detail, then sign-in, then the sync states -
removes at most seven screens from a set I cannot reach the start of. It is the right
rule and it is not the lever here.

---

## The lever, and my recommendation

**A.2's target is an OFFLINE app.** Items 5 through 8 of the queue - DC-003's control,
the OTP service, G7 and G8 - are server-side. They deliver nothing a user can walk
through on an emulator with no network. They are eight of the sixteen iterations.

**Recommendation: move the server block behind the screens, and record it in
DEFERRED.md.** That gives:

| # | Work | Est. |
|---|---|---|
| 1 | §5.14, FINDINGS.md, the status sweep | 1 |
| 2 | The canonical value registry | 2 |
| 3 | The mutation harness and the twelve survivors | 2 |
| 4 | rejects.json and the B3 re-measurement | 2 |
| 5 | The two fixtures | 1 |
| | **subtotal - everything A.6 protects, plus the fixtures** | **8** |
| 6 | App skeleton, design tokens, i18n, the §B.6 screen harness | 3 |
| 7 | The A.3 screen set | 9 |
| | **total** | **20** |

Nothing in A.6 is touched. Nothing in §5.1, §5.9, §5.12, §5.13 or §6 is touched. The
thresholds stay frozen. **What is cut is features, and the feature cut is the server.**

### What deferring the server actually costs, stated plainly

- **No sync.** The outbox fills and never drains. A.3 item 8 becomes *offline states
  and a visible outbox*, with the thing behind it unimplemented. That is a real
  reduction from what item 8 asks for, and it goes in DEFERRED.md.
- **No real sign-in.** Item 7's screens can be built and benchmarked against the
  existing `StubSmsPort`, which is what it was built for - but the code that arrives is
  not a code a server issued. The owner's own note anticipates this: *"you would stub
  past sign-in for testing."*
- **B8, B11 and B36 stay uninstrumented**, because their subjects never come to exist
  inside this ceiling. Their rows say so.
- **The rate limiter and the SMS port stay built and tested.** That work is done and is
  not discarded; only the routes on top of them are deferred.

### Why this and not the alternative

The alternative is to keep the server and ship four screens: a backend with no product
on top, failing the sentence the ceiling exists to protect - *a correct, offline,
three-language app that closes a day end to end.* Between a working day close with no
sync, and sync with no day close, **the day close is the product.** D2, D7 and the
whole nine-section sheet live there.

**This is a scope decision inside the owner's ceiling, not a change to it. Recorded as
AD-018 with its reversal trigger: if sync matters more than the day close, one line
reverses this and the screen set drops to item 1 and part of item 2.**

---

## What I commit to, and what is stretch

Even at twelve iterations for screens I am not confident of sixteen, and the estimate
history in this build runs optimistic - the font work was "bundle a file" and became
three iterations across two injections.

**COMMITTED - A.3 items 1 to 5, about eleven screens.** The day close end to end: the
four form archetypes, the nine-section list with its three row states, the cash check
with counting, difference, balanced and the closed-day summary, opening cash and first
run, and Today in its open, closed and gap states. **This alone satisfies A.2.**

**STRETCH - A.3 items 6 to 8, about five screens.** Parties list and the two detail
screens, sign-in, the offline and sync states. Cut in reverse order if the budget
tightens, exactly as A.7 directs: item 8 first, then item 7, then parties detail before
parties list.

**Not negotiable at any point:** every screen that ships meets §B.6 in full. Half a
screen is not a screen, and eleven benchmarked screens beat sixteen unbenchmarked ones.

---

## B38 and B39 will be MISSED, and that is the correct outcome

B38 requires 27 of 27 screens. Eleven committed, sixteen at best. **The threshold is
not being touched and "screen" is not being redefined.** Both are reported as
`MISSED - SCOPE` with the measured count and a pointer to DEFERRED.md, and
BENCHMARKS-RESULTS.md now carries a reason code so a scope miss cannot be mistaken for
a performance miss. One is a decision the owner made; the other would be a failure.

---

## The three things most likely to break even this plan

1. **Screen velocity is unmeasured.** Zero React Native code exists. Nine iterations
   for eleven-to-sixteen screens rests on an estimate with no evidence under it. The
   first real read comes at the end of A.3 item 1, and if the four form archetypes take
   more than three iterations the stretch set goes immediately.
2. **The twelve arithmetic survivors.** A.6 protects them and rightly so. If they are
   real once the harness is fixed, that is a priority-1 money-path finding that
   outranks every screen - and it could cost two or three iterations this plan does not
   have spare.
3. **Further injections.** Six in twenty iterations. At that rate three more arrive
   before 40, and none of them is priced here.

## When to revise

At the end of A.3 item 1 - the first honest read on screen velocity - and again at 35,
where the injection requires a one-page pre-stop check anyway.
