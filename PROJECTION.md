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
| 6 | App skeleton, design tokens, fonts, store wiring | 1 |
| 7 | **Form A** - the screen itself | 1 |
| 8 | **The ~10 instruments Form A's existence makes due** | 1 |
| 9 | A.3 items 2-5, the rest of the day close | 8 |
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
- **B8 and B11 stay uninstrumented**, because their subjects never come to exist
  inside this ceiling. Their rows say so. **B36 does NOT** - injection 16 A.3
  corrected that: a CLIENT day close writes CLIENT logs, so its instrument is due
  with the first screen.
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

## THE FIRST SCREEN UNBLOCKS TEN INSTRUMENTS AT ONCE, AND I HAD NOT PRICED IT

Injection 17 B is right and the earlier plan was wrong. The moment anything renders,
ten subjects come into existence simultaneously and §5.13 makes every one of their
instruments due in that same iteration:

  B26 contrast · B27 white-on-marigold · B28 touch targets · B29 text size ·
  B30 missing i18n keys · B31 layout overflow · B32 non-Latin numerals ·
  B36 amounts, names or phones in CLIENT logs · then B24 once an APK builds ·
  then the first of B14-B23 once the emulator runs it.

**Form A is therefore THREE iterations, not two:** the project and tokens, the screen,
and the instruments. That is honest scheduling rather than padding - ten screens built
against an uninstrumented token set is ten screens to fix, and the instruments pay for
themselves on screen two.

## THE CHECKPOINTS — TWO OF THEM, AND WHICH ONE IS LIVE

**LIVE NOW: checkpoint 1, at the end of iteration 26.**

| # | Fires at end of | Condition | If not met |
|---|---|---|---|
| **1** | **iteration 26** | rejects.json, the B3 re-measurement, the A.1 sweep and both fixtures are done, and the React Native project is scaffolded | re-cut then |
| 2 | iteration 29 | Form A is built AND instrumented | re-cut the screen set immediately |

Either re-cut comes from the bottom of A.3 items 1-5, **never from §B.6**, and this
file is re-STATED from the facts rather than edited (§5.15.2).

### Why this replaces the single checkpoint at 26

Injection 17 D set one checkpoint: Form A built and instrumented by the end of 26.
Injection 18 C then deliberately put rejects.json and the B3 re-measurement in front
of it, which was the right call — the coverage gap is concentrated in rejection arms,
and mutants in unreached rejection code survive, so measuring once after rejects.json
beats measuring twice against two partial suites.

Those two instructions conflicted. The checkpoint at 26 would have fired, and it would
have fired because of **a reordering the owner asked for**, not because of slippage.
Injection 19 C restates it, and the argument is the whole of it: a checkpoint that
fires for the wrong reason teaches you to ignore checkpoints.

The reasoning behind having a hard one at all is unchanged: eleven screens in twelve
iterations has no slack, and the place a plan like this slips is its first unit. A
plan that slips at the start and is not re-cut until two thirds through is how a build
reaches its ceiling with nine half-finished screens. The decision is cheap at 29 and
expensive at 35.

### CHECKPOINT 1 FIRED AT THE END OF ITERATION 26, AND IT FAILED

| item | state |
|---|---|
| the A.1 sweep | **done**, iteration 25 |
| rejects.json | not started |
| the B3 re-measurement | partial - re-measured at 85.71% and the three shapes named, but not against a grown corpus |
| the two fixtures | not started |
| the RN project scaffolded | not started |

**One of five.** The cause is not a mystery and not an excuse: injections 19 and 20
arrived and consumed iterations 25 and 26 in full. Both were owner-issued and both
were executed completely.

I am not going to argue that this is the wrong reason for the checkpoint to fire.
Injection 19 C warned against checkpoints firing for reorderings the owner asked for,
and the temptation to file this under that heading is exactly why it should be
resisted: a checkpoint that can be waived by naming a cause is not a checkpoint. It
measures whether the work is done. It is not done. Whether to absorb the slip is the
owner's call; the re-cut below is what the plan looks like if it is not absorbed.

### The re-cut

Fourteen iterations remain. What stands between here and Form A instrumented:

| # | Work | Est. | Ends |
|---|---|---|---|
| 1 | rejects.json and the B3 re-measurement | 2 | 28 |
| 2 | the two fixtures | 1 | 29 |
| 3 | RN scaffold, tokens, fonts, store wiring | 1 | 30 |
| 4 | **Form A** - the screen | 1 | 31 |
| 5 | **the ~10 instruments Form A makes due** | 1 | 32 |

**Checkpoint 2 as written is already unreachable.** It asks for Form A built and
instrumented by 29; the earliest honest date is 32, and only if nothing else arrives.
Compressing items 2 and 3 into one iteration buys 31, which still misses it. I am not
going to reach 29 by redefining what "instrumented" means - §B.6 stays whole.

That leaves **eight iterations after 32** for the rest of the screen set, against a
ceiling of 40, with screen velocity still entirely unmeasured.

**So the committed set is cut, from the bottom of A.3 items 1-5 as directed:**

- **COMMITTED - A.3 items 1 to 3**, about eight screens: the four form archetypes, the
  nine-section day-close list with its three row states, and the cash check with
  counting, difference, balanced and closed-day summary. This still closes a day.
- **MOVED TO STRETCH - A.3 items 4 and 5**: opening cash and first run, and Today in
  its open, closed and gap states. Previously committed.
- **STILL STRETCH - items 6 to 8**, unchanged.

Nothing in §B.6 is reduced. No threshold moves. The cut is features.

**The honest risk, stated once:** eight injections have arrived in thirteen iterations.
At that rate three or four more arrive before 40, and none is priced here. Every one so
far has been worth its cost - §5.13, §5.14, §5.15, §5.16 and the `stdevMoney` defect
all came from them - but they are not free, and this plan has no slack left to absorb
them from.

## When to revise

At the checkpoint at **26**, at **30** and at **35** (§5.15.4), each time re-stated
from the facts as they are rather than edited from the previous version.
