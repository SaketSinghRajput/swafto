# TASKS: the timed tasks for the usability sessions

Status: DRAFT for Saket. Matches the success targets in the CPO plan (`product/swafto-ui-redesign/PLAN.md`). Those targets are the founder's choice for this project, not BENCHMARKS.md thresholds.

Tasks are written as **outcomes in the shopkeeper's own words**, never as app words ("Sale", "Collect", "Udhar book"). The redesign may rename every screen, and using the app's own labels in the prompt would lead the participant.

## 0. Rules common to all tasks

**Fixtures (proposed, for the test shop only).** These are test-data values, not measurements. CTO to confirm they can be seeded (see `SETUP.md`).

| Item | Seeded value |
|---|---|
| Shop | "Demo Kirana" |
| Customers | Ramesh (owes Rs 500 at the start), Sunita (owes Rs 1,270 at the start, built from two earlier udhar entries on different days so the total is derived), plus 3 filler customers so the list is not just two names |
| Cash in the drawer at the start of the day (opening) | Rs 2,000, from a closed day yesterday |
| Other sections of the day | nothing entered (no UPI, purchases, etc.) |

**Expected cash arithmetic for T6** (cash mode only; UPI, Udhar do not touch the drawer, per D2): 2,000 + 120 (T1 cash sale) + 200 (T3 collection) - 40 (T5 tea) = **2,280**. The T2 udhar sale of 350 puts no cash in the drawer. The participant "counts" **2,270**, which is **Rs 10 short**.

**Order is fixed** (state builds): T0 Onboarding, T1, T2, T3, T4, T5, T6, T7. T7 is last because it changes the language. Learning effect (later tasks are easier because the app is now familiar) is a known bias, noted in the synthesis. The first-time-use numbers that matter most are T0, T1, and T2.

**Start state for timed tasks:** the app's first screen (Today / home) as left after the previous task. If the participant is elsewhere, say "please go back to the first screen", wait, then say "start". That wait is not timed.

**Props:** one large printed card per task with the digits only (for example `120`, `Ramesh 350`). Digits, not words, so a non-reader can look again at the number. Rupee amounts are said aloud once by the moderator and shown on the card.

**Timing (stopwatch, see `SETUP.md`):**
- Start: the moderator finishes reading the prompt, says "start" (in the participant's language), and the phone is in the participant's hand.
- Stop: the app shows the entry as saved (its own confirmation, or the entry visible in a list), or for a find-task, when the participant says or points to the figure. If the entry is wrong, the time stops at the participant's own "done" and the task is marked as an error (see below).
- Stopwatch precision is about 1 second, and the 10-second targets are therefore tight. If screen recording is consented, re-time from the recording and mark the source (`SW` stopwatch or `REC` recording) on the observation sheet.
- A participant who stops talking or looks at you to ask "is this right?" is not "done". Reply "What do you think?" (never confirm).

**Result codes per task** (one per participant per task):
| Code | Meaning |
|---|---|
| **S** | Success, unaided, final state correct |
| **SA** | Success with assist (any hint level Hint-1 or above, see `SCRIPT.md`), final state correct |
| **F** | Fail: abandoned, time-box reached, final state wrong and not noticed, or the moderator had to do it (Hint-3) |

**Target met (per participant)** = code S **and** zero unrecovered errors **and** time at or under target. Targets: T1 10 s; T3 20 s; T4 10 s; T6 3 min. T2, T5, T0, T7 have no target; their times are recorded for comparison only.

**Time-box** (moderator moves on, task = F): T0 5 min, T1 90 s, T2 120 s, T3 120 s, T4 60 s, T5 90 s, T6 6 min, T7 2 min. (**Proposed**, to avoid frustration and keep to one hour; Saket may change before session 1.)

**Error definitions:**
- **Slip (recovered):** wrong digit, wrong mode, wrong person, wrong place, fixed by the participant. Count it; it does not cancel S, but it cancels "Target met".
- **Slip (unrecovered):** the saved entry is wrong and the participant did not notice. Result is **F** and the issue is at least **S1** (wrong money data).
- **Wrong-direction:** doing the opposite of the job (for example writing a new udhar sale instead of collecting money). Always an S1 candidate.
- **Detour:** opening a screen that is not on the path, then coming back. Count and note which screen.
- **Hesitation:** more than 5 seconds with no action, in a task that has a target. Note where (what was on screen).

**Per task you will record** (full grid in `OBSERVATION-SHEET.md`): time, result code, assists (count and level), errors (type and count), quotes, SEQ.

**Do not** name any control, say where something is, say "tap", or confirm that something is right. See the hint ladder in `SCRIPT.md`.

**Known-issue hooks.** "U-xx" refers to the evidence in `qa/swafto-retail-desk/USABILITY.md` (build before the redesign). These are hypotheses to test: the redesign may or may not have fixed them. The synthesis lists each as fixed / partly / not fixed / not tested.

---

## T0. First launch and set-up

| | |
|---|---|
| **Prompt** | "This phone has a new app that someone has just installed for you. Please get it ready so you can start using it for your shop." |
| **Start state** | R1 (first launch, nothing saved). Phone language as the participant normally uses. A card gives the test sign-in details if the app asks for a phone number or code (these are test values; the participant does **not** type their own number). |
| **Target** | None. Time-box 5 min. Record time to first usable home screen. |
| **Success** | The participant reaches the home screen in the test shop with a language they can read, having completed whatever set-up and consent steps the app requires. |
| **Result S** | Does it unaided. |
| **Errors** | Wrong language chosen and not noticed; tries to enter their own real phone number or shop name (stop them: "use the card"); abandons the consent text; taps "agree" to everything without reading (note: do they scroll or hear it?); enters a wrong code and cannot recover. |
| **Assists** | Telling them which language button; telling them to use the card; any pointer on the consent screen. Not an assist: "Take your time." |
| **Observe** | Do they find their language? Do they know why the app asks for a phone number? How do they react to the consent / privacy text (read, skim, ask)? Do they understand they can say no, and can they tell what withdrawal would be? What do they say about the screen when it first opens (what do they think the app is for)? Which words do they not understand? Any uncomfortable pause when typing a phone number. |
| **Known issues** | X0 consent text is long (R1 evidence). Shop-name field shows OS keyboard suggestions. Language buttons and the keypad screens were rated the strongest (A2, A3, A4). Withdrawal needs a switch tap plus Save (so it is not as easy as giving); Privacy is two taps deep. Odia date numerals can be misread as Odia digits (U-28). |
| **Note for moderator** | If consent in the app and your session consent are both shown, make clear which one you are reading. Do not tell them what to tick in the app. |

---

## T1. Record a Rs 120 cash sale (target under 10 s)

| | |
|---|---|
| **Prompt** | "A customer buys things for 120 rupees and pays you in cash. Please write this sale in the app." (card: `120`) |
| **Start state** | R2 seeded day, home screen, nothing entered today. |
| **Target** | **10 s** (founder target, first-time user, unaided, error-free). Time-box 90 s. |
| **Success** | One entry of Rs 120, paid in cash (not UPI, not udhar), is saved for today, with no customer attached. |
| **Result** | S / SA / F. Target met if S, no errors, 10 s or less. |
| **Errors** | Amount wrong (12, 1200, 102); mode wrong (UPI or udhar); recorded as something other than a sale (expense, collection); saved twice; added to a past day; left without saving (entered but not confirmed). |
| **Assists** | Pointing at a screen area ("have you looked at the bottom?"), naming a control, telling them there is a mode. |
| **Observe** | Where the eye goes first. Time to find the way to a sale. Scrolling. Do they know which mode is cash without being told? Do they find the save control? Do they notice the confirmation? Do they check the entry is there (look at a list)? Do they read the amount back? Which hand and finger. Sun glare. |
| **Known issues to test** | Sale tile was more than a screen down (U-00, U-01). Scroll reset after a form (U-10). **Add** was the smallest, faintest control (U-03, U-04). New row added at the bottom of an oldest-first list, not visible (U-05). Only confirmation was the total changing. Phone-date notice pushing the tile lower (QA-06). |
| **Repeat (optional)** | If time allows, ask for a second cash sale of 80 rupees at the very end of the session. Record as T1b, not scored against the target. It shows whether the first attempt was learning cost. |

---

## T2. Record a Rs 350 udhar sale to Ramesh

| | |
|---|---|
| **Prompt** | "Ramesh takes goods worth 350 rupees. He says he will pay later. Please write this in the app." (card: `Ramesh 350`) |
| **Start state** | State after T1 (the T1 entry exists). If T1 was not saved, the moderator corrects it silently before T2 (use checkpoint R2b, see `SETUP.md`). |
| **Target** | None. Time-box 120 s. Record time. |
| **Success** | One entry of Rs 350, on udhar, attached to Ramesh (the existing customer, not a new one), saved for today. Ramesh's balance is now 850. Cash in the drawer unchanged. |
| **Errors** | Cash mode chosen (this would add 350 to the drawer: **S1**); wrong customer (Sunita or a filler); a new "Ramesh" created; no customer chosen and saved; amount wrong; saved twice. |
| **Assists** | Telling them to pick a person; pointing to the mode; showing the list of customers. |
| **Observe** | How they find "later payment". Whether they pick the right Ramesh from the list. Whether they see Ramesh's balance before or after. A stale or early error message (U-11, U-14, U-15). Whether the screen title makes sense for credit. Whether they say "udhar" aloud and what they call the thing. Do they feel sure it is saved? |
| **Known issues to test** | One screen titled "Udhar book" for credit, collect and pay (U-15). Red refusal "Choose who this is for" showing before any tap (U-11, U-14). Picker listed "+Rs 0.00" (today's change) instead of what each person owes (U-16, U-17). After choosing, no balance shown. Five names for one idea (Credit, Udhar book, On credit, Collected, Udhar to collect). Refusal message leaking into the next form (QA-07). |

---

## T3. Collect Rs 200 from Ramesh (target under 20 s)

| | |
|---|---|
| **Prompt** | "Ramesh comes to the shop and gives you 200 rupees in cash towards what he owes you. Please write it in the app." (card: `Ramesh 200`) |
| **Start state** | After T2 (Ramesh owes 850). |
| **Target** | **20 s**. Time-box 120 s. |
| **Success** | One entry of Rs 200, a payment received from Ramesh in cash (not a new udhar sale), saved for today. Ramesh's balance is now 650. The drawer goes up by 200. |
| **Result** | S / SA / F. Target met if S, no errors, 20 s or less. |
| **Errors** | **Wrong-direction:** writing a new udhar sale of 200 (balance goes up to 1,050: **S1**); wrong customer; amount wrong; recorded as a cash sale with no customer (drawer right, Ramesh's balance wrong: **S1**); saved twice. |
| **Assists** | Telling them it is "money coming in from Ramesh"; pointing to a customer list; naming a control. |
| **Observe** | Do they tell this apart from the sale in T2? Do they see Ramesh's balance and does it help them (do they say "he owes 850, now 650")? What do they expect to happen to the balance? Do they read the confirmation? Do they glance at the wrong direction first? |
| **Known issues to test** | Same as T2, plus: the customer's balance is never shown on the collect path (U-16, U-17); over-collection shows as a negative with no explanation (QA-03; not triggered by this task, since 200 is less than 850, so ask the optional probe below only if time allows); Customer detail hero was "Change today" and two identical marigold buttons competed (U-19). |
| **Optional probe (if time)** | "Imagine Ramesh gives 1,000 rupees." Watch how the app handles more than is owed (QA-03). Ask what they expect. Do not record it. Reset after. |

---

## T4. Find how much Sunita owes (target under 10 s)

| | |
|---|---|
| **Prompt** | "A customer, Sunita, asks: 'How much do I owe you?' Please find out from the app and tell me." (card: `Sunita`) |
| **Start state** | After T3. Sunita's balance is 1,270 (fixture). |
| **Target** | **10 s**. Time-box 60 s. Stop when the participant says or points to the figure. |
| **Success** | The participant says or points to **1,270** as Sunita's total, not the shop's total, not "change today", not Ramesh's. |
| **Result** | S / SA / F. Target met if S, no errors, 10 s or less. |
| **Errors** | Reads the shop total of udhar; reads "change today" (0); reads another customer; reads a negative or wrong sign; says "not found". |
| **Assists** | Naming the section; saying "look at the customers"; pointing to a tab. |
| **Observe** | Which path: today's home, the customer list, a person's page. Do they scroll or search? Do they trust the first number they see? What do they call this screen? Is the number large enough in daylight (for the glare case)? Do they notice a sort order? |
| **Known issues to test** | Ledger tab said "Ledger" but the screen said "Parties" (U-18). No balance owed anywhere on the list, only "Change today +Rs 0.00". The hero on a customer page was "Change today Rs 0.00" and the real answer was a small row lower (U-19). Hero repeats the shop total. Total could be negative with no explanation. No sorting, no "+ Customer" on the list. |

---

## T5. Record a Rs 40 tea expense

| | |
|---|---|
| **Prompt** | "You paid 40 rupees from the drawer for tea for the shop. Please write this in the app." (card: `40`) |
| **Start state** | After T4. |
| **Target** | None. Time-box 90 s. Record time. |
| **Success** | One entry of Rs 40, an expense, paid in cash, saved for today. Drawer goes down by 40. |
| **Errors** | Recorded as a purchase for resale, or as "paying a supplier" (different entry, different effect); mode wrong (UPI, udhar); amount wrong; a supplier named when none is needed; treated as a withdrawal by the owner (D3: that sits outside profit). |
| **Assists** | Naming the expense control; pointing to a list of types. |
| **Observe** | Does "expense" exist as a word in their head, and in the app, in their language? What they call it ("kharcha", other). Do they find it unaided? Whether the modes wrap (four or five modes on two rows) confuse them. Whether optional fields (supplier) make them stop. |
| **Known issues to test** | Purchase and Expense forms wrap modes onto a second row; the lone "Udhar" cell looks broken (U-12, U-13). Supplier "Optional" row looks tappable only by blue text. Pay and Purchase tiles touch edges at large text (U-65). Expense hidden under "More" in the v1 redesign (check what the new design does). |

---

## T6. Close the day with a cash count that differs by Rs 10 (target under 3 min)

| | |
|---|---|
| **Prompt** | "It is closing time. Please finish today's accounts in the app. You count the cash in the drawer and it is 2,270 rupees." (card: `2,270`) |
| **Start state** | R3: all of T1 to T5 entries are present and correct, whatever the participant actually did (the moderator loads R3 before T6, so a failed earlier task does not break this one). Expected cash in the app is 2,280. All other sections of the day are empty. |
| **Target** | **3 min** (180 s). Time-box 6 min. Timer starts at "start" and stops when the app shows the day closed. |
| **Success** | The day is closed with a counted cash of Rs 2,270, the Rs 10 difference recorded the way the app asks (typed reason or one of its fixed adjustment types), and the day shown as closed. |
| **Result** | S / SA / F. Target met if S, no errors, 3 min or less. |
| **Errors** | Counted cash wrong (2,280 typed to avoid a difference, 2,720, 227); marking a section "nothing to enter" when there is something to enter (for example skipping the cash sale section); tapping "nothing" then wanting to undo and not finding how; reason typed that is meaningless or an adjustment chosen that hides the difference; leaves the day open without knowing; closes without understanding the Rs 10 difference. |
| **Assists** | Naming the next step; pointing to the cash count; telling them what the difference means; telling them to choose a reason. |
| **Observe** | Do they find the way to close without help? Do they read the sections (7 or so) or just tap through? Do they understand "should be 2,280, you counted 2,270"? What do they say about the Rs 10 (shop-talk: "rounding", "I gave change", "someone took")? Do they type a reason willingly, or try to avoid it, or abandon? Do they choose a typed adjustment honestly or look for "other"? Do they understand the day is **frozen** after close? Do they check the figures one more time before closing? What they expect to see at the end. Any hesitation at the final confirm. |
| **Known issues to test** | Whether the sticky next-step button is still the best part. The loud "Nothing to enter" pill on every row and one-tap skip with no confirmation (U-50). "2 of 10 done" with one tick (U-50). Cash-check locked row with no lock cue (U-52). Working list squeezed to five lines above the count (U-55). Save looks disabled with no reason on tap (QA-08). Hindi "Nothing to enter" truncated to the opposite meaning (W4, USABILITY.md Hindi row). "Cash check", "box" and "net sales" may not be words the shopkeeper uses. **Unvalidated assumption from PLAN.md section 2: that he will type a reason for a cash difference rather than abandon the close, and that closing on a phone is faster than on paper.** Ask after the task, "How would you close this on paper tonight?" and write the answer (not timed). |
| **Do not** | Say what the difference is. Say "You should have a reason." Suggest an adjustment type. |

---

## T7. Change the language

| | |
|---|---|
| **Prompt** | "Somehow this app has turned into English, and you cannot read it. Please make it in [Odia / Hindi] again." (No card.) |
| **Start state** | The moderator switches the app to English (checkpoint R4, using test mode) after T6. The participant sees an English home screen. |
| **Target** | None. Time-box 2 min. Record time. |
| **Success** | The app shows in the participant's own first language (Odia or Hindi), with the participant having found the change themselves. |
| **Result** | S / SA / F. |
| **Errors** | Picks the wrong language (Hindi instead of Odia); gives up because they cannot read English; changes the phone's own system language instead (note: out of the app); changes something else (text size, theme) and does not notice. |
| **Assists** | Naming where settings live; saying the word "language"; pointing to a gear or menu. |
| **Observe** | Whether the way to language is **recognisable without reading English** (icon, native-script name). How many steps. What they tap first. Do they recognise their language name in its own script? Do they know how to get out if they pick the wrong one? What do they think when the app is in English (blame themselves?)? |
| **Known issues to test** | Language and screen: native-script names, live switch, Back labelled in each language (U-25, U-26, U-34) rated GOOD, but two taps deep from Today (screen S3 in the repo). Settings is text-only rows with no icons or chevrons (U-24). A non-reader cannot scan it. |
| **Variation for coverage** | For Hindi-first participants, the target language is Hindi. If time allows, a second pass: "Now make it Odia" (no scoring), to see whether switching between two non-English languages is clear. |

---

## Task matrix (at a glance)

| # | Task | Target | Time-box | Key risk to look for |
|---|---|---|---|---|
| T0 | First launch and set-up | none | 5 min | Consent comprehension; wrong language |
| T1 | Rs 120 cash sale | 10 s | 90 s | Wrong mode; finding the entry way |
| T2 | Rs 350 udhar to Ramesh | none | 120 s | Cash mode instead of udhar; wrong customer |
| T3 | Collect Rs 200 from Ramesh | 20 s | 120 s | **Wrong direction** (new sale instead of money in) |
| T4 | How much does Sunita owe | 10 s | 60 s | Reads shop total or "change today" |
| T5 | Rs 40 tea expense | none | 90 s | Purchase vs expense vs supplier payment |
| T6 | Close day, count differs by Rs 10 | 3 min | 6 min | Skips sections; avoids the reason; does not understand the difference |
| T7 | Language back to own | none | 2 min | Finding it without reading English |

## What is NOT tested here, and why

- Editing or correcting a wrong entry (UX-13 was open: no path from Today or Ledger). Add as T8 if the redesign introduced one.
- Offline behaviour (U-70 to U-72): the whole session runs with the network off. Ask in the debrief what "saved" means to them.
- Accessibility with TalkBack, keyboard focus, text at 2.0x: this needs the usability-accessibility tester, not a shop-floor session. Text size is set to **the participant's own normal setting** for this test.
- Whether the Odia and Hindi copy reads naturally: not judged here and not marked reviewed (H13). The sessions collect evidence for the native reviewer by logging every word or sentence a participant stumbles on.
