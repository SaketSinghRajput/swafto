# SYNTHESIS-TEMPLATE: how the sessions will be rolled up

Status: DRAFT for Saket. This is the empty report. **Every number in it is filled only from the observation sheets.** Until sessions are done, every cell is blank. Do not write a figure that was not measured; if something is estimated, say so and say by whom (repo rule).

With 5 to 8 participants this is **qualitative evidence with counts, not statistics.** Report "5 of 7", not "71%". Do not state confidence intervals or significance. Never describe a count of 5 as "most users" in a headline without the count beside it.

---

## 0. Decisions fixed BEFORE session 1 (do not change after)

Fix these on paper and date them before the first session. Changing a threshold after seeing data is not allowed (same spirit as BENCHMARKS.md).

| Decision | Proposed by the researcher | Decided by Saket (value, date) |
|---|---|---|
| Per-task pass rule | A task **passes** when **both** (a) **at least 80% of participants rounded up** reach "target met" (n=5: 4; n=6: 5; n=7: 6; n=8: 7), and (b) the **median time of unaided successes** is at or under the target. For tasks with no target (T0, T2, T5, T7): pass = at least 80% rounded up are code S | |
| Which participants count | All who completed the consent and started the task. A participant lost to a **BUILD** bug on a task is excluded for that task only, and listed | |
| How failures count in median time | Report two medians: **(i)** unaided successes only; **(ii)** all attempts, with F set to the time-box (conservative) | |
| Minimum participants for sign-off | At least 5 who meet the quota minimums in `SCREENER.md` | |
| Who may be excluded afterwards | Only a participant who withdrew (their data is deleted) or who was not eligible (found out later) | |

The CPO plan says done means the targets are met **with first-time users, unaided and error-free**. The pass rule above is how "met" is judged across a small group. Saket may choose a stricter or looser rule, but before session 1.

## 1. Sessions run

| Code | Date | Language | Age band | Reading | Phone | Records today | Moderator | Note-taker | Consent: screen / voice / hands / face / quote / follow-up | BUILD issues | Excluded? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | | | | | | | | | | | |
| P2 | | | | | | | | | | | |
| P3 | | | | | | | | | | | |
| P4 | | | | | | | | | | | |
| P5 | | | | | | | | | | | |
| P6 | | | | | | | | | | | |
| P7 | | | | | | | | | | | |
| P8 | | | | | | | | | | | |

Quota check against `SCREENER.md` (hard rules: at least 2 low reading comfort, at least 1 Hindi-first, nobody who had seen the app, at most 1 other-app user): met / not met, and what.
Known-to-founder participants: list, and whether results change with and without them.
Moderator: who ran which sessions. If Saket moderated, note it (politeness bias: participants say "good" to the maker).

## 2. Task success rate

| Task | n | S (unaided) | SA (with assist) | F | Unaided and error-free | Target met (S, no unrecovered errors, within target) | Pass rule met? |
|---|---|---|---|---|---|---|---|
| T0 First launch | | | | | | n/a | |
| T1 Rs 120 cash sale | | | | | | | |
| T2 Rs 350 udhar to Ramesh | | | | | | n/a | |
| T3 Collect Rs 200 from Ramesh | | | | | | | |
| T4 How much does Sunita owe | | | | | | | |
| T5 Rs 40 tea expense | | | | | | n/a | |
| T6 Close day, count differs by Rs 10 | | | | | | | |
| T7 Language back to own | | | | | | n/a | |

Report as `x of n`. Add a line for any task with an **unrecovered error that left wrong money data** (S1): these count even if the participant said "done".

## 3. Time against target

Times in seconds from the sheets (source SW or REC marked). Targets are the founder's targets for this project.

| Task | Target | Median, unaided successes (n= ) | Median, all attempts with F = time-box | Fastest | Slowest | Participants at or under target | Source mix (SW / REC) |
|---|---|---|---|---|---|---|---|
| T1 | 10 s | | | | | | |
| T3 | 20 s | | | | | | |
| T4 | 10 s | | | | | | |
| T6 | 180 s | | | | | | |
| T0 (no target) | none | | | | | | |
| T2 (no target) | none | | | | | | |
| T5 (no target) | none | | | | | | |
| T7 (no target) | none | | | | | | |

Notes: the 10-second tasks (T1, T4) are at the limit of stopwatch precision (about 1 s); say so beside the figure. Report the raw times in a small list per task so the reader sees the spread (with 5 to 8 people the median hides a lot).

SEQ per task: median and the list of scores. SUS-style short form: score per participant (0 to 100) and per-item pattern. State that the short form is not the standard SUS and not comparable with published benchmarks.

| Task | SEQ scores (list) | Median SEQ |
|---|---|---|
| T0 | | |
| T1 | | |
| T2 | | |
| T3 | | |
| T4 | | |
| T5 | | |
| T6 | | |
| T7 | | |

| Short form | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | Median |
|---|---|---|---|---|---|---|---|---|---|
| Score (0 to 100) | | | | | | | | | |

## 4. Severity-rated issue list

**Severity (same scale as `qa/swafto-retail-desk/USABILITY.md`):**
- **S1:** blocks the job, or leaves **wrong money data**, or a figure that misleads (for example a wrong-direction entry, a sale on cash that should be udhar, a "nothing to enter" that reverses meaning).
- **S2:** slows the job or misleads, but the person gets there.
- **S3:** polish that still matters for this user.

**How to rate** (write the reasoning): impact (blocks / wrong data / slows / annoys) combined with frequency (how many of n). A problem that hits 1 of 7 but leaves wrong money data stays **S1**. A problem that hits 6 of 7 but costs 3 seconds is **S2** at most.

| ID | Issue (what happened, in one sentence) | Task(s) | Hit n of N | Sev | Evidence (sheet cell, clip, quote id) | Known-issue ref (U-xx / QA-xx / none) | Likely cause (guess, mark as guess) | Recommendation | Owner | Retest? |
|---|---|---|---|---|---|---|---|---|---|---|
| I-01 | | | | | | | | | | |
| I-02 | | | | | | | | | | |
| I-03 | | | | | | | | | | |

Order the list by severity, then by n. Group by task, then by theme in section 6.

## 5. Quotes

Verbatim, with the language, a plain English translation, who translated, and the participant code (never a name). Use only quotes whose participant ticked box (7). Pair each with the behaviour that came with it.

| Quote id | Participant | Task | Original (Odia / Hindi) | English translation (translated by) | What they were doing | Theme |
|---|---|---|---|---|---|---|
| Q-01 | | | | | | |

## 6. Themes (affinity), insight, implication, recommendation

Each theme must be supported by at least 2 participants and cite evidence. One line per row.

| Theme | Insight (what we saw, with n) | Implication for the design | Recommendation |
|---|---|---|---|
| Finding the way to a sale | | | |
| Udhar vs cash vs collection (direction and mode) | | | |
| Seeing "how much does X owe" | | | |
| Day close: skipping, the Rs 10, the reason | | | |
| Words and pictures (Odia and Hindi): what they stumbled on | | | |
| Trust in "saved" and offline | | | |
| Reading in daylight, one hand, text size | | | |
| Consent and withdrawal (as they experienced it in the app and in the session) | | | |

### What worked (keep it)
- 

## 7. Known issues: did the redesign fix them?

Fill for each item in the "top 10 redesign list" of `qa/swafto-retail-desk/USABILITY.md` and the other watched issues. Verdict: **Fixed** (not seen in any session, and the task path tested) / **Partly** / **Not fixed** (seen, with n) / **Not tested**.

| Ref | What it was | Verdict | Evidence (n, task) |
|---|---|---|---|
| 1 | Sale first on Today (U-00, U-01) | | |
| 2 | Scroll position kept / not needed (U-10) | | |
| 3 | One hero figure on Today | | |
| 4 | Udhar screens: right titles, no stale error, balances (U-11, U-15, U-16, U-17, QA-03, QA-07) | | |
| 5 | Parties with balances first (U-18, U-19) | | |
| 6 | Add is the strongest control; visible confirmation (U-03, U-04, U-05) | | |
| 7 | Day close: quiet skip, undo, locked rows (U-50, U-52) | | |
| 8 | Sync state chip (U-72) | | |
| 9 | Text size is real (W3) | Not tested here (accessibility tester) | |
| 10 | Odia and Hindi layout: Hindi skip label (W4) | | |
| Extra | Withdrawal of consent in the app is as easy as giving it; Privacy is two taps deep | | |
| Extra | Day close avoided or abandoned because of the typed reason (PLAN.md section 2 assumption) | | |
| Extra | "Closing on a phone is faster than on paper" (PLAN.md section 2 assumption) | | Answer from the "on paper tonight" question |

## 8. Honest limits (keep this section in every report)

- n is 5 to 8; counts, not statistics.
- Sessions ran on a test shop with the network off; results about sync and real data volumes are not covered.
- Moderators who work for the company bring politeness bias. Say who moderated.
- Learning effect: tasks ran in a fixed order, so later tasks are easier. T0, T1 and T2 are the cleanest first-time numbers.
- Timing is by stopwatch (about 1 s) or recording; the 10-second tasks are near that limit.
- Odia and Hindi copy is an unreviewed draft (H13). Stumbles on words are **evidence for the native reviewer**; this report does not mark the copy as reviewed.
- The text size was each participant's own, so the 2.0x text findings are not replicated here.

## 9. Recommendation and next step

| Question | Answer |
|---|---|
| Which tasks pass the pre-set rule? | |
| Which tasks do not, and what is the smallest change that would move them? | |
| S1 issues that must be fixed before sign-off | |
| Re-test needed on which tasks, with how many new or same participants? | |
| Does anything here change the product rules (no inference, append-only, closed-day frozen, D2, D3)? (Expected: no. If yes, it is a decision for Saket, not a design tweak.) | |
| Sign-off recommendation to M5 | Met / Not met / Met with re-test. **Saket decides.** |

## 10. Data handling at the end

- [ ] Recordings deleted by the date promised, deletion log signed
- [ ] Withdrawals processed and participants told
- [ ] Contact sheet numbers deleted as promised
- [ ] Only anonymous quotes (consent box 7) and consented stills (box 5) in the report
- [ ] Observation sheets stored with code only
- [ ] Report shared only with the named group

## 11. Roll-up steps for the researcher (practical order)

1. Within 24 hours of each session: type the sheet into the grid; mark SW or REC; re-time from the recording if there is one and it was consented.
2. After 5 sessions: draft sections 2 and 3, a first issue list, and flag S1 items to Saket at once (do not wait for 8).
3. After all sessions: translate quotes (with a native translator, not a machine alone), cluster issues into themes, rate severity by the rule, fill section 7.
4. Hand the S1 and S2 list to the CTO team as normal bug reports, with evidence ids. Mark which ones the pre-set pass rule makes blocking.
5. Plan the re-test of the misses (M4 says: synthesis, then fixes, then a re-test).
