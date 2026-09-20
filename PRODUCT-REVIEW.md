# PRODUCT REVIEW

Written at iteration 33, against PLAN.md, TASKS.md, DESIGN.md and audit-02.

**The product is not under review.** Feature set, the eight constraints, the forty
thresholds and every ADR were hashed before this pass and re-hashed after; the proof
is at the foot of this file. Nothing here adds, removes, redefines or softens
anything. What changed is sequence, the cut line and copy — and mostly the cut line.

---

## The finding

**The committed set has no front door.**

```
COMMITTED     T7 T8 T9 T10  T5  T11 T12 T13 T14  T6
NOT COMMITTED T1 T2 T3 T4 T15 T16 T17
```

`T1 · Today — open day` is the screen the app opens on. It is not in the set. Neither
is `T2 · Today — first run`.

So the committed set, built exactly as planned, produces an application a shopkeeper
cannot start. He can enter a purchase, list nine sections, count his cash and see a
closed-day summary — and nothing renders when he taps the icon. Every committed screen
is somewhere you arrive *from* somewhere, and the somewhere is missing.

This is not a feature gap. Ten screens is still ten screens. It is a **cut-line
error**, and the cut line is mine to move.

---

## 3.3a · The first session, minute by minute

He is 55, in Bhubaneswar, and his nephew installed this. It is 9pm and the shutter is
half down.

**Minute 0.** He taps the icon. *Nothing in the committed set renders.* Stop. That is
the review in one line, and everything below assumes the fix.

With `T1` in, the walk continues:

**Minute 1.** Language, phone number, code. The copy is already right — *"Four
questions, then your book."* It tells him how long this will take, which is the one
thing a first screen owes someone who does not want an app.

**Minute 2.** Opening cash. *"Count the cash in the box before the first sale. From
tomorrow this is carried from your count and never asked again."* This is the best
sentence in the product. It answers the question he has not asked yet — *will you make
me do this every day* — before he can resent it.

**Minutes 4-12.** The nine sections. He knows this part; it is his sheet. The risk is
not comprehension, it is **length**. The paper version takes him four minutes because
he writes only what happened. If the app makes him visit sections that had nothing in
them, he will not come back. The design already distinguishes *skipped* from
*untouched*, which is the right instinct — but skipping has to be one tap from the
list, not a visit to each form.

**Minute 13.** Cash check. He counts. **It does not match.** It almost never matches on
day one: the opening figure was a guess, or a twenty-rupee tea purchase never got
written down.

**Minute 14. He stops here.** See 3.3c.

---

## 3.3b · Day two — what brings him back?

**Nothing in the committed set.** That is the honest answer, and it is a finding about
the cut rather than a failure of the build.

The two screens that answer it are `T3 · Today — already closed` (what he sees next
morning) and the returning state of `T1`. Both are outside the set. A closed day with
nothing to return to is a filing cabinet.

The engine already computes everything that would bring him back — BI1 profit trend,
OP3 collection efficiency, OP4 what he owes and when. Eighteen of the twenty-six named
functions exist. **The value is built and has nowhere to surface.** Better to know
that now than at iteration 40.

I am not moving a second screen across the line to fix it. One swap is a correction;
two is a redesign, and 3.5 is explicit about which of those this pass is.

---

## 3.3c · The moment of abandonment

**Minute 14 of day one, at the cash-difference screen, when he cannot answer the
question the app requires before it will let him close the day.**

He has counted less than expected. He does not know why — that is the entire reason a
difference exists. The app asks for a reason before the day can close. He scrolls the
list, none of them is *"I do not know"*, and the day will not close.

His paper sheet balances, because on paper he writes the counted figure and moves on.

That is the point where correctness stops being the product and becomes the obstacle.
It is not hypothetical: a first-day difference is the *expected* case, because opening
cash was estimated.

**What in the committed set addresses it:** `T12` is committed, and its copy already
does more than most products would — the difference is a **question**
(`{{ diffQuestion }}`), not a verdict, and *"Add the expense now"* offers the most
common real cause as an action rather than an accusation. That is genuinely good.

**What is missing is the honest exit.** A reason list with no *"I am not sure"* forces
either a false answer or an abandoned day, and a false reason is worse than an unknown
one — it puts a wrong fact in an append-only ledger that by design cannot be edited.
Recorded as recommendation 1.

---

## 3.3d · The copy audit

**The copy is better than what most shipped products carry, and this pass should say
so rather than improving it into averageness.** Checked for: does it blame him, does
it use an accounting word, does it state a number he cannot verify, is it a verdict
where it should be a question.

Working, and worth protecting:

- *"Taken from cash · not an expense · outside profit"* — three clauses, no jargon, and
  it pre-empts the most common bookkeeping misunderstanding there is.
- *"Every rupee in the box is in the book."* — the balanced case, in his words.
- *"Four states. Each says plainly what happened and what to do next — none blames the
  user."* — written into the source as a rule, not merely followed.
- *"Everything you've entered today is saved on this phone. Nothing is lost."* — the
  error state leads with what survived.

Two that do not meet the standard the rest sets:

| where | now | the fault | proposed |
|---|---|---|---|
| deficit alert | *"Cash short for Thursday."* | a **verdict**, and "short" is an accounting word — it states a conclusion about him before he has looked | *"Thursday's cash did not match. Want to look?"* |
| update gate | *"This version calculates balances differently. Update to keep your numbers correct."* | tells him his numbers may be **wrong right now**, which is alarming and is not what is meant | *"A newer version is ready. Update when you can — today's book is safe."* |

**Translation risk, flagged for the native reader:** both faults survive translation.
"Short" has a direct Odia accounting cognate carrying the same accusatory weight, and a
literal Hindi rendering of the update string reads *more* alarming rather than less. The
reviewer should be asked to check register, not only meaning.

---

## 3.3e · What is missing that is not a feature

- **A way back.** Not in evidence in the committed set. Nine sections with no visible
  return path is the oldest trap in mobile.
- **Seeing what he just entered.** Covered — `T5` is the nine-section list with a state
  per row, and it is committed.
- **Undo, and correcting a mistake.** Within a form, `T7`'s repeating lines with a
  running total imply removing a line before saving. **Correcting a closed day is
  `T16`, and it is not committed.** Append-only means a typo is permanent without it.
  A week-two problem rather than a day-one one, so a recommendation rather than a swap.
- **Confirmation that the day is closed and safe.** `T14` covers it.

---

## 3.3f · The one thing

**Put `T1 · Today` in the committed set.** Cost: one screen, displacing one.

Everything else here is secondary to the fact that the plan as written builds a
day-close with no application around it.

---

## What I CHANGED

**One swap, keeping the total at ten.**

`T13 · Cash check — balanced` **out**, `T1 · Today — open day` **in**.

`T13` is the happy path of the cash check and the cheapest screen in the set to lose:
its content is three lines, `T12` already owns the difference case, and `T14` shows the
same balanced figures in the closed-day summary. Nothing about the balanced outcome
becomes unreachable — it becomes unstyled for one release.

`T1` is the application.

**Sequence:** Form A stays first — hardest screen, and the one that shapes every
pattern. `T1` moves to second, so an end-to-end session exists as early as possible
rather than at the end.

---

## What I RECOMMEND and did NOT change

1. **Add *"I am not sure"* to the cash-difference reason list.** An unknown reason
   recorded honestly beats a false one recorded confidently, and the alternative is an
   abandoned day. This changes a feature's behaviour, so it is not mine to implement.
2. **`T16 · Post a correction` belongs in V1.** Append-only without a correction path
   makes a mis-typed amount permanent. Before real users, if not before launch.
3. **`T3 · Today — already closed` is the day-two answer.** The engine already computes
   what would go on it.
4. **Skipping a section must be one tap from `T5`**, never a visit to each form. Nine
   forced visits at 9pm is the length problem that kills the habit.

---

## 3.1 · Proof that the product did not move

Hashed before the pass, re-hashed after; the command output is in BUILD_LOG at
iteration 33.

| snapshot | sha256, first 16 | verdict |
|---|---|---|
| 27 feature rows — IN1-7 · P1-8 · OP1-6 · BI1-6 | `713b1c89acd655d0` | IDENTICAL |
| 40 benchmark thresholds | `52bc7216aa70d0e4` | IDENTICAL |
| 17 ADR decision lines | `2aacb5ce76c9c542` | IDENTICAL |
| 19 autonomous decisions | `3858002c54cede3f` | IDENTICAL |

No feature added, removed or redefined. No constraint softened. No threshold moved.
