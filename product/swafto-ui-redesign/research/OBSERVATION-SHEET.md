# OBSERVATION SHEET: one per participant

Status: DRAFT for Saket. Print one copy per participant, on paper, with **only the P-number** on it, never the name. Odia and Hindi wording is DRAFT and needs a native reviewer (H13).

Write fast, write what you SEE and HEAR, quote exactly. Write your interpretation in a separate column and mark it `(guess)`.

---

## A. Session header

| Field | Entry |
|---|---|
| Participant code | P__ |
| Date / start time / end time | |
| Place (shop type, town) | |
| Moderator / note-taker | |
| Language of session | Odia / Hindi |
| Age band, reading comfort, phone familiarity (from screener) | |
| Phone text size used (their own normal setting) | |
| Glasses worn? | Y / N |
| Brightness at max? Network off? Build id and state checkpoint verified (R1) at start? | Y / N, Y / N, Y / N |
| Consent ticks (from `CONSENT.md` tick sheet): screen rec / voice / hands photo / face / quote / follow-up | |
| Recorders actually on | |
| Interruptions (customers, calls, time lost) | |
| Timing source: stopwatch (SW) or recording (REC) | |
| Build bugs seen (mark `BUILD`) | |

## B. Task grid

Fill one row per task. Codes: **Result** S = success unaided, SA = success with assist, F = fail. **Assist** = count and highest level, e.g. `2 (Hint-2)`. **Errors** use the codes below. Time in seconds (mm:ss for T6 and T0). Targets are T1 10 s, T3 20 s, T4 10 s, T6 3:00; T0, T2, T5, T7 have no target.

Error codes: **E1** wrong amount · **E2** wrong mode (cash/UPI/udhar) · **E3** wrong person · **E4** wrong direction (sale instead of collect, or reverse) · **E5** detour (write which screen) · **E6** saved twice · **E7** not saved · **E8** skipped a section wrongly or one-tap skip regretted · **E9** misread a figure (note which) · **E10** other (describe).
Mark each error **R** (recovered by participant) or **U** (unrecovered).

| Task | Time (s) | Src SW/REC | Result S / SA / F | Assists (count, highest level) | Errors (code + R/U) | Hesitation >5 s (where) | Target met? | SEQ (1 to 7) | "What made it that way?" (their words) |
|---|---|---|---|---|---|---|---|---|---|
| T0 First launch | | | | | | | n/a | | |
| T1 Rs 120 cash sale | | | | | | | Y / N | | |
| T2 Rs 350 udhar to Ramesh | | | | | | | n/a | | |
| T3 Collect Rs 200 from Ramesh | | | | | | | Y / N | | |
| T4 How much does Sunita owe | | | | | | | Y / N | | |
| T5 Rs 40 tea expense | | | | | | | n/a | | |
| T6 Close day, count differs by Rs 10 | | | | | | | Y / N | | |
| T7 Language back to own | | | | | | | n/a | | |
| T1b Second cash sale (optional) | | | | | | | n/a | | |

"Target met" = result S, no unrecovered errors, **and** time at or under target (see `TASKS.md`).

## C. Per-task notes (the small stuff)

Use one block per task. Mark the first path they took.

```
Task: T__
First place they looked / first tap:
Path taken (screens in order):
Where the eye went (top / middle / bottom / keypad / list):
Scrolling? how many times:
Hand and thumb used (left/right, one hand?):
Glare or reading trouble in daylight:
Words they said for the things (cash, udhar, expense, balance, close):
Words or pictures they did not understand:
Did they check that it was saved? how:
Surprise / confusion / pleasure:
Quote (exact, in their language) | English translation (who translated):
Known issue seen? (U-xx / QA-xx):
```

## D. Moment log (time-stamped)

| Clock or recording time | Task | What happened | Severity guess (S1 wrong money / blocks; S2 slows or misleads; S3 polish) |
|---|---|---|---|
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |

## E. Words they stumbled on (for the native reviewer, not a copy verdict)

| Screen | Word or sentence as it appeared (Odia / Hindi) | What they said it means / how they read it | Did they ask? | Better word they offered |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

This is evidence for the native reviewer only. It does **not** mark the copy as reviewed (H13).

## F. SEQ: Single Ease Question after each task (read aloud, in their language)

**Question (English):** "Overall, how easy or how hard was this task? 1 means very hard, 7 means very easy."

**Odia (DRAFT):** "ଏହି କାମଟି ମୋଟ ଉପରେ କେତେ ସହଜ ବା କଷ୍ଟ ଥିଲା? ୧ ମାନେ ବହୁତ କଷ୍ଟ, ୭ ମାନେ ବହୁତ ସହଜ।"

**Hindi (DRAFT):** "यह काम कुल मिलाकर कितना आसान या मुश्किल था? 1 मतलब बहुत मुश्किल, 7 मतलब बहुत आसान।"

**Response card (print A5, landscape; do not rely on colour):** seven steps in a row, drawn as bars rising from short to tall, with numbers 1 to 7 above them. A sad face under the shortest bar and a happy face under the tallest. Also a small label in the participant's language under the ends ("hard" / "easy").

```
 1    2    3    4    5    6    7
 |    |    |    |    |    |    |        (bars rise left to right)
(:(                              (:)
 hard                             easy
```

How to ask: show the card, read the question once, say "point or say the number". Do the **practice question first** so they know how to use it: "How easy is it to make tea at home? Point." Do not interpret what they point at. Record the number. If a participant points between two bars, ask "this one or this one?" Never suggest.

Some participants will always point high out of politeness. Treat SEQ as a relative signal across tasks for the same person, and read it **with** the behaviour (time, assists, errors), never alone.

## G. End-of-session short form (SUS-style, 6 items, pictorial 5-point)

**What this is:** a short, plain-language adaptation of the System Usability Scale for people who do not read comfortably. It is **not the standard 10-item SUS** and **is not validated**, so its score must **not** be compared with published SUS benchmarks (such as 68). Use it to compare this redesign with the next round, and to see which items bring the score down.

**Why short and read aloud:** the standard form has 10 items, uses abstract words ("cumbersome", "integrated"), and assumes reading. Six items, read aloud, with a picture scale are less tiring and less open to misreading.

**Response card (pictorial 5-point, print A5, no colour needed):** five faces in a row, with a bar that grows under each, labelled in the participant's language: 1 "No, not at all" · 2 "A little" · 3 "Half and half" · 4 "Mostly yes" · 5 "Yes, fully".

```
   1        2        3        4        5
  (:()     (:/)     (:|)     (:))     (:D)
   |       ||       |||      ||||     |||||
 not at   a       half and  mostly    yes,
  all     little    half     yes      fully
```

**Practice item first:** "Tea is sweet." Point to the face for "this is true for me." (so they understand "No" and "Yes" can be either.) Then:

| # | English | Odia (DRAFT) | Hindi (DRAFT) | Direction | Their score (1 to 5) |
|---|---|---|---|---|---|
| 1 | "I would like to use this app every day in my shop." | "ମୁଁ ଏହି ଆପ୍‌କୁ ମୋ ଦୋକାନରେ ପ୍ରତିଦିନ ବ୍ୟବହାର କରିବାକୁ ଚାହିଁବି।" | "मैं इस ऐप को अपनी दुकान में रोज़ इस्तेमाल करना चाहूँगा।" | + | |
| 2 | "The app was more difficult than it needed to be." | "ଆପ୍ ଦରକାର ଠାରୁ ଅଧିକ କଠିନ ଥିଲା।" | "ऐप ज़रूरत से ज़्यादा मुश्किल था।" | - | |
| 3 | "The app was easy to use." | "ଆପ୍ ଚଲାଇବା ସହଜ ଥିଲା।" | "ऐप चलाना आसान था।" | + | |
| 4 | "I would need someone to sit beside me to use it." | "ଏହାକୁ ଚଲାଇବାକୁ ମୋ ପାଖରେ ବସି କେହି ସାହାଯ୍ୟ କରିବା ଦରକାର ହେବ।" | "इसे चलाने के लिए मेरे पास बैठकर किसी को मदद करनी पड़ेगी।" | - | |
| 5 | "I felt sure of myself when I used it." | "ଏହା ଚଲାଇବା ବେଳେ ମୋତେ ନିଜ ଉପରେ ଭରସା ଥିଲା।" | "इसे चलाते समय मुझे अपने ऊपर भरोसा था।" | + | |
| 6 | "There was too much to learn before I could start." | "ଆରମ୍ଭ କରିବା ପୂର୍ବରୁ ବହୁତ କିଛି ଶିଖିବାକୁ ପଡ଼ିବ।" | "शुरू करने से पहले बहुत कुछ सीखना पड़ेगा।" | - | |

Items 1, 3, 5 are positive and 2, 4, 6 are negative, so that "yes to everything" does not read as a perfect score (a known tendency to agree).

**Scoring (same logic as SUS, scaled for 6 items):** positive items: score minus 1. Negative items: 5 minus score. Add the six results (0 to 24), multiply by 100 and divide by 24. Result 0 to 100. Report **per item** as well; with 5 to 8 people, one item's pattern is more useful than a single average.

| Participant | Sum of adjusted items (0 to 24) | Score (sum x 100 / 24) |
|---|---|---|
| P__ | | |

**One more (not scored):** "Would you trust this app with your shop's money figures?" Yes / A little / No, and why. Record their words. Ask only after the six.

## H. Debrief answers (from `SCRIPT.md` section 5)

| # | Question (short) | Answer in their words |
|---|---|---|
| D1 | Easiest / hardest | |
| D2 | A word or picture not understood | |
| D3 | What would worry you using it tomorrow | |
| D4 | Does "saved" feel safe, and where is it kept | |
| D5 | Numbers readable in daylight | |
| D6 | Daily use? who else | |
| D7 | One message to the maker | |
| After T6 | How would you close this on paper tonight, and how long | |

## I. After the session (within 1 hour)

- Top 3 problems seen:
- One surprise:
- Best quote:
- Anything the app got right:
- Anything I did wrong as moderator (hints not logged, leading questions):

Store this sheet with the code only. The name and phone sheet lives elsewhere (see `SETUP.md`).
