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

# 09-template-review-and-client-traps

# SWAFTO — injection 09: template review, and the client traps front-loaded

I read `SMS-TEMPLATES.md §4`. Four findings below, one of which forecloses something expensive if it is registered as written. Then the next injection, which does for React Native what injection 08 did for DLT — puts the landmines on the table before they are laid.

---

## Review of §4 — the six non-English strings and the twelve templates

I verified every count programmatically. **All twelve fit one segment**, so the derived constraint holds and the design goal was met. Four findings.

### 1 · These templates silently foreclose Android SMS autofill — decide before registering

Android has two zero-typing OTP mechanisms. **SMS Retriever** requires the message to end with an 11-character app hash and to be **≤140 bytes total**. **SMS User Consent** requires no hash, but shows a one-tap dialog.

Your templates have no hash. Adding one later means re-registering all twelve. And the hash does not fit:

| | +11-char hash | |
|---|---|---|
| T1 en · T2 en · T3 en · T4 en | 92–99 bytes | fits |
| T1 hi | 136 bytes | fits, barely |
| T2 hi · T3 hi · T4 hi | 146–148 bytes | **over 140** |
| T1 od · T2 od · T3 od · T4 od | 150–164 bytes | **over 140** |

Seven of twelve cannot carry the hash without cutting words. **SMS User Consent is almost certainly the right answer** — the Unicode budget makes Retriever unaffordable in the two languages most of your users read, and a one-tap dialog is a fine experience. But make it a recorded decision now, because registration freezes the option.

There is also a stale cross-reference: the run plan says "OTP autofill only works with the system keyboard." On Android the mechanism is Retriever/User Consent, not the keyboard. That line should be corrected wherever it appears.

### 2 · The character counts are hand-estimated, and eleven of twelve are wrong

Claimed vs actual UTF-16 length: **eleven are off by one, and T2 od is off by two** — claimed 69, actually 71 template / **70 rendered**.

T2 od is therefore sitting at **exactly 70 of 70**. Zero headroom, and it is the one that was miscounted. One more codepoint from a native reviewer's correction and it becomes two segments forever. Odia's virama and matra marks each count as a separate UTF-16 unit, which is why eyeballing undercounts: `କୋଡ୍` looks like two glyphs and is four units.

A derived constraint defended by a hand count is not defended.

### 3 · §2 contradicts itself, and your contradiction checker could not see it

> "since 6 May 2025 it must carry a category suffix… Proposed: **`SWAFTO`**"

A six-character header that must carry a category suffix cannot also be six characters of brand. Either the suffix claim is wrong, or the proposed header is. This is exactly the §5.6 failure class — a semantic contradiction that no token rule catches because both halves are individually well-formed. Re-check the rule, then fix whichever half is wrong.

### 4 · The anti-phishing line is present only in the language fewest of your users read

You recorded the omission honestly, which was right. But the budget math says it is not forced:

- **T1 hi** is 57 of 70. Dropping the validity clause frees ~13 characters, and a Hindi rendering of "SWAFTO will never ask for it" fits in the remaining budget.
- **T1 od** is 64 of 70 and is genuinely tight — it would need a further cut elsewhere.

The trade is worth naming explicitly: **the validity window is discoverable in the app; the phishing warning is not.** A shopkeeper who does not know the code expires loses nothing. One who does not know SWAFTO will never ask for it loses everything in the wallet. Reconsider under R4.2 and record the outcome either way.

### What I cannot judge

Meaning, register and naturalness in Odia and Hindi — as you said. Two things to put in front of the native reviewer specifically: **T2's Hindi drifts from its English** (English says "verify your current number", Hindi says "number change code"), and **`ଆପ୍ ଲକ୍`** is transliterated English that a 60-year-old Odia speaker may not parse. H10 stands.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 09. Iteration 8 accepted. The DLT design is right and the segment-length
derivation is the best independent finding of this build so far. Four template
findings and one new rule below, then the client traps, front-loaded.

═══════════════════════════════════════════════════════════════════════════════
A · SMS-TEMPLATES.md — FOUR FINDINGS, FIX BEFORE ANYTHING IS REGISTERED
═══════════════════════════════════════════════════════════════════════════════

A.1  ANDROID OTP AUTOFILL IS FORECLOSED BY THESE TEMPLATES. SMS Retriever requires
     the message to END with an 11-character app hash and be <=140 BYTES. Seven of
     your twelve exceed 140 bytes once a hash is appended: all four Odia, and hi T2,
     T3, T4. Registering without the hash means Retriever is unavailable forever
     without re-registering all twelve.
     DECIDE NOW under the decision procedure: SMS Retriever or SMS User Consent.
     Record it as an AD with a reversal trigger. If User Consent, say so in
     SMS-TEMPLATES.md so nobody re-opens it, and correct the stale claim in the run
     plan that "OTP autofill only works with the system keyboard" — on Android the
     mechanism is Retriever/User Consent, not the keyboard.

A.2  THE COUNTS ARE HAND-ESTIMATED AND WRONG. Eleven of twelve are off by one;
     T2 od is off by two and sits at exactly 70 of 70 rendered — zero headroom, on
     the one you miscounted. Odia matras and virama each count as a separate UTF-16
     unit, so visual counting undercounts systematically.
     Write tools/check-sms-segments.mjs and wire it into CI. For every template, in
     every language, it must compute: UTF-16 length of the RENDERED message (variable
     substituted, not the {#var#} placeholder), the encoding it will actually use,
     the resulting segment count, and the byte length. It FAILS on more than one
     segment, and WARNS below 5 characters of headroom. Regenerate the table in
     SMS-TEMPLATES.md from that tool's output — no hand-written counts survive.
     Negative-test it per §5.1 by padding a template past 70.

A.3  §2 CONTRADICTS ITSELF: the header "must carry a category suffix" and the
     proposal is a bare six-character `SWAFTO`. Both cannot be true. Re-check the
     rule and fix whichever half is wrong. Note for §5.6: your contradiction checker
     could not catch this, because both halves are individually well-formed. Add a
     finding to REVIEW.md that token-level contradiction detection has this blind
     spot, so the document pass is known to be doing work the checker cannot.

A.4  RECONSIDER THE PHISHING LINE UNDER R4.2. T1 hi is 57 of 70; dropping the
     validity clause frees enough budget to carry "SWAFTO will never ask for it" in
     Hindi. T1 od at 64 of 70 is tighter and may need a further cut. The trade:
     the validity window is discoverable inside the app, the phishing warning is
     not. Decide, record it, and if you keep the omission, keep it for a stated
     reason rather than for budget.

A.5  For the native reviewer, add to H10: T2's Hindi says "number change code" where
     its English says "verify your CURRENT number" — confirm the distinction from T3
     survives for a Hindi reader. And `ଆପ୍ ଲକ୍` is transliterated English; ask
     whether a 60-year-old Odia speaker parses it.

═══════════════════════════════════════════════════════════════════════════════
B · NEW STANDING RULE — §5.7 DERIVED CONSTRAINTS BECOME EXECUTABLE
═══════════════════════════════════════════════════════════════════════════════

The 70-character insight was not in your sources. You derived it, and it changed the
design. That is the most valuable kind of finding in this build and the most fragile,
because it exists nowhere except in prose that a later iteration may not read.

  §5.7.1  Every constraint you DERIVE rather than find gets recorded in
          DERIVED-CONSTRAINTS.md: the constraint, how you derived it, what it would
          have cost to miss it, and its confidence.
  §5.7.2  Every derived constraint that can be mechanically checked MUST become a CI
          check in the same iteration it is derived. A.2 is this rule applied to the
          segment finding. A derived constraint defended only by care is not defended.
  §5.7.3  A derived constraint with lower confidence than a researched one is flagged
          as such, and the document pass in §5.3 re-tests it against current sources.

═══════════════════════════════════════════════════════════════════════════════
C · THE REACT NATIVE TRAPS — READ BEFORE G10, NOT AT G10
═══════════════════════════════════════════════════════════════════════════════

Same reasoning as DLT: each of these is cheap now and expensive after the screens
exist. Research each, decide it, record it in TECH-DECISIONS.md, and where it is
checkable make it a check.

C.1  INDIAN DIGIT GROUPING, AND WHY YOUR TEST DATA IS BLIND TO IT.
     Indian grouping is 2-2-3 from the right, not 3-3-3: 1,23,456 — not 123,456.
     Now check your sample figures: 6,780 · 18,240 · 27,600 · 11,450 · 12,000. EVERY
     ONE IS FIVE DIGITS, and five-digit numbers format IDENTICALLY under both
     conventions. A wrong-locale bug would pass every vector and every screenshot you
     currently have, and would first appear on a real shop with a lakh of supplier
     dues.
     • Add vectors with six- and seven-digit amounts. Rs 1,50,000 of supplier
       outstanding is an entirely ordinary kirana shop.
     • Do NOT rely on toLocaleString('en-IN'). Hermes ships without full ICU in many
       configurations and falls back SILENTLY to a wrong grouping — no error, no
       warning, just the wrong comma. Either enable Intl explicitly and assert at
       startup that it is present and correct, or write the grouping yourself. Given
       constraint 4 and the priority ordering, write it yourself and test it.
     • ONE money-formatting function for the whole app. A static check fails on any
       other path from a paise integer to a display string.

C.2  ODIA WILL RENDER AS EMPTY BOXES ON BUDGET ANDROID DEVICES. Many cheap phones
     ship no Odia system font. You cannot rely on the OS. Bundle the font, and add a
     startup assertion or a render test that proves Odia glyphs are drawn rather than
     tofu. This is a launch-blocking defect for your primary language and it will not
     appear on an emulator with a full font set — put it in DEVICE-CHECKLIST.md too.

C.3  ANEK IS A VARIABLE FONT. Variable font support on Android is version-dependent
     and React Native's font loading of them is unreliable. Decide now whether you
     ship static instances at the weights the design system actually uses. Fewer
     files, predictable rendering, smaller APK — and it interacts with B24.

C.4  TABULAR FIGURES MUST BE PROVEN, NOT ASSUMED. Constraint 8 requires columns to
     align. fontVariant tabular-nums support varies by platform and by font build.
     Write a test that renders 1111111111 and 0000000000 in the money style and
     asserts identical width. If the shipped font build lacks tabular figures, you
     need a different build, and you need to know that now rather than at G14.

C.5  OS FONT SCALING WILL BREAK YOUR LAYOUTS. A user at 1.3x system scale is common
     in this age group — and it is exactly the user your 17sp floor exists for, so
     disabling allowFontScaling would be a betrayal of B29's purpose. Decide the
     policy: scale with a cap, and test every screen at the cap. Add the largest
     supported scale to the rendering tests.

C.6  THE CUSTOM KEYPAD MUST SUPPRESS THE SYSTEM KEYBOARD. showSoftInputOnFocus false,
     or an equivalent. If both appear, the amount field is unusable and it is the
     single most-used control in the product. Test it.

C.7  ANDROID KILLS BACKGROUNDED APPS. A shopkeeper takes a phone call in the middle of
     entering an expense. Decide what survives: the entered lines certainly, the
     in-progress field probably. Per constraint 2 a local save has already succeeded
     for anything committed — make sure that is actually true of a half-finished form,
     and write the scenario as a test.

C.8  THE ANDROID BACK BUTTON inside a full-screen entry form. Discarding typed lines
     silently is the worst outcome available. Decide the behaviour and test it on
     every one of the seven keypad screens.

C.9  DAY BOUNDARY AND DEVICE CLOCK. Your TECH-DECISIONS policy exists; apply it to the
     client. A day is an Asia/Kolkata calendar day. The device clock is often wrong.
     What the app shows at 23:58 with a clock 10 minutes fast, and what it does when
     the clock corrects itself after a sync, are both product decisions, not incidents.

═══════════════════════════════════════════════════════════════════════════════
D · THEN CONTINUE AS PLANNED
═══════════════════════════════════════════════════════════════════════════════

Still owed from injection 08, in order: B.2 persistent rate limits, C origin-exposure
decision, B.3-B.5 the OTP service, then G7 and G8 with the vector shortfall closed
along the way — 51 of 70, each new vector stating the question it answers.

Do A.1 through A.5 and B first. A.2's checker before A.4's rewording, so the rewording
is measured rather than estimated.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## The one I would not have caught without running the numbers

C.1 is the finding I would flag to Rajanikanta, not just to the build. Every sample figure in every document we have written across this whole project is five digits, and five-digit numbers are identical under Indian and Western grouping. The test data is structurally incapable of detecting a locale bug, and the first person to see `₹1,50,000` rendered as `₹150,000` would be a real shopkeeper looking at what he owes a real supplier. It costs one vector to close, today.
