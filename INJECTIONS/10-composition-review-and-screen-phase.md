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

# 10-composition-review-and-screen-phase

# SWAFTO — injection 10: composition review, and the screen phase

Two things go in. The defect class you named in DC-003 becomes a standing rule, and the screen phase gets its contract *before* it starts — because G10–G16 is where most of the remaining work lives and where an autonomous build most reliably produces output that looks finished and is hollow.

**On A.3.** Worth sitting with: you looked it up and the research reversed the assumption you would have reached by reasoning. Two right-looking premises — headers are six characters, transactional headers carry a category suffix — combine into a conclusion that is false because the suffix is appended by the operator, not registered. That is the same shape as DC-003. Composition is where your reasoning is least reliable and research is most valuable.

**On the Python-patching-JavaScript problem.** Whole-file rewrites is the right fix. It is also §5.6.1 generalising itself: mechanical edits to things with their own escaping rules are unsafe, not only prose.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 10. Iteration 9 accepted. AD-011, the A.3 reversal, and the A.4 reversal are
all right. DC-003 is the best unprompted finding of this build — it names a defect class,
not a defect. It is promoted below.

Note on A.3 for your own calibration: research reversed what reasoning would have
concluded, and the failure was compositional — two correct premises about headers
combining into a false conclusion. Treat "I can derive this from what I know" as a
weaker signal than usual whenever the question is about how two rules interact.

═══════════════════════════════════════════════════════════════════════════════
A · NEW STANDING RULE — §5.8 COMPOSITION REVIEW
═══════════════════════════════════════════════════════════════════════════════

DC-003 is a defect class: two decisions, each correct in isolation, whose composition
creates an exposure neither document mentions — because each was written without the
other. Your gate-by-gate structure manufactures this. Every AD is made in the context
of one gate and then never re-read beside the others.

  §5.8.1  At every §5.3 review point, run a COMPOSITION PASS. Take the decisions made
          since the last one and check them PAIRWISE, asking only: does the combination
          of these two create something neither one does alone? Most pairs are
          unrelated and dismissing them is fast. Write the pass to REVIEW.md with the
          number of pairs considered, not just the findings.
  §5.8.2  Pay particular attention to pairs where both decisions REMOVED something.
          AD-008 removed Cloudflare; the architecture removed the NAT gateway. Two
          subtractions, each justified, and the thing they jointly removed was every
          layer between the internet and a t4g.small. Removals compose more dangerously
          than additions because nothing in the code shows what is now absent.
  §5.8.3  When a composition defect is found, fix it AND record which two decisions
          produced it, so the pattern accumulates rather than the instance.

═══════════════════════════════════════════════════════════════════════════════
B · THE SCREEN PHASE CONTRACT — READ BEFORE G10
═══════════════════════════════════════════════════════════════════════════════

G10 through G16 is 27 screens and most of the work that remains. It is also the phase
where an autonomous build most reliably produces something that looks finished and is
hollow, because screens are judged by appearance and nobody is looking.

B.1  NO SCREEN IS DONE WHILE ITS NUMBERS COME FROM A FIXTURE.
     This is the screen-phase equivalent of the maybe() bug and you should expect to
     commit it at least once. A screen built against hardcoded sample figures renders
     perfectly, screenshots beautifully, and is connected to nothing. It will pass
     every visual check you can write.
     THE RULE: every figure displayed on every screen is traced to the Formula Engine
     through the real local store. Not props. Not a fixture module. Not a mock
     repository. The canonical 15 July day exists as DATA IN THE DATABASE, and the
     screens compute from it exactly as they will in a shop.
     VERIFY: a test that mutates one entry in the store and asserts that every screen
     showing a figure derived from it changes. If a screen does not move, it is not
     connected. Run this over all 27.

B.2  BUILD A SECOND, DELIBERATELY UGLY SHOP. Your canonical fixture is one tidy day
     with five-digit amounts and short names — the same blindness C.1 exposed in the
     vectors, now in the layouts. Every screen will be designed against Sharma Kirana
     on a good day and will break in a real one.
     Build "adversarial shop" as a real seeded fixture, and render every screen against
     BOTH. It contains, at minimum:
       • a seven-digit amount — Rs 12,45,600 of supplier outstanding
       • a shop name long enough to wrap, and a second that is one unbroken word
       • party names at the field's maximum length, in Odia, plus one that is a single
         character, plus two parties whose names differ only in the last character
       • an expense label of 40+ characters in Odia
       • a day with 40 entries in one section and zero in seven others
       • a day where eight sections are skipped and one has a single entry
       • a negative-looking state: counted cash far below expected; udhar outstanding
         that a correction has taken to exactly zero
       • a customer holding 100% of all outstanding udhar (BI6 at 10000 bp)
       • 400 closed days of history, for the Reports and Today render budgets
     B16, B20 and B31 are measured against the adversarial shop, not the tidy one.
     A screenshot of the canonical day proves a screen is pretty. A screenshot of this
     one proves it works.

B.3  EVERY SCREEN HAS FOUR STATES AND ALL FOUR ARE BUILT. Loading, empty, error, and
     loaded. The empty state reads as new rather than broken — that is a stated product
     rule, not a nicety. The error state never blames the user and never loses typed
     input. A screen with only its loaded state is one third of a screen.
     VERIFY: a test enumerating all 27 screens x 4 states and failing on any missing
     one. No exemptions without a recorded reason.

B.4  TEXT EXPANSION WILL BREAK LAYOUTS THAT PASS IN ENGLISH. Odia and Hindi run
     materially longer than English for the same meaning, and B31 is zero-tolerance.
     Add a LONGEST-STRING mode that renders every screen using, for each key, whichever
     of the three languages is longest — a layout that survives that survives all
     three. Combine it with C.5's maximum font scale: longest string AND largest text
     is the worst case a real user can produce, and it is the case to test.

B.5  BUILD ORDER IS NOT NEGOTIABLE AND TODAY IS LAST.
       1. The four form archetypes  — eight screens become right by construction
       2. The ending: cash check, difference, balanced, day-closed summary
       3. The day-close list, first run, opening cash
       4. Parties, Reports
       5. TODAY
       6. Scaffolding: sign-in, settings, system states
     Today is a summary of everything above it. Build it first and you will design a
     dashboard and then bend the product to fit it. This ordering is in the run plan
     for that reason; do not optimise it away because Today seems like the place to
     start.

B.6  A SCREEN IS DONE WHEN ALL OF THIS IS TRUE — no partial credit:
       □ Every figure traced to the engine through the real store (B.1)
       □ Renders correctly against canonical AND adversarial shop (B.2)
       □ All four states built (B.3)
       □ Passes in three languages, longest-string mode, at maximum font scale
       □ Contrast, touch target and text-size checks pass (B26-B29)
       □ Keypad present only if it is one of the seven; never with a bottom nav
       □ Screenshots captured for both fixtures, committed to /screenshots
       □ Its row in TRACEABILITY.md names the feature IDs it displays

B.7  PRODUCE A CONTACT SHEET AT THE END OF EACH RUN. One image per run: every screen
     in that run, both fixtures, labelled with screen ID. This is the only artifact in
     the build that a human can review in under a minute, and meaning in a layout is
     the second thing this loop structurally cannot verify — the first being the Odia
     and Hindi strings. Commit it to /screenshots/contact-sheets/.

═══════════════════════════════════════════════════════════════════════════════
C · THE QUEUE
═══════════════════════════════════════════════════════════════════════════════

Unchanged, in order. C.1's six-digit vectors first — one vector, closes DC-002, and it
also seeds B.2's adversarial amounts.

  1. Injection 09 section C — the nine RN traps. C.1 first, then C.2 (bundled Odia
     font) because it is launch-blocking for your primary language and invisible on an
     emulator with a full font set.
  2. Injection 08 B.2 — persistent, restart-surviving rate limits.
  3. DC-003 compensating control.
  4. The OTP service, B.3-B.5.
  5. G7 and G8, closing the vector shortfall along the way. 51 of 70; C.1 and the
     adversarial cases above should take it most of the rest of the way honestly.

Then G10, starting with the four form archetypes and the two fixtures in place before
the first screen is written.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## What to look at when the screens arrive

The contact sheets. Everything else in this phase the loop can check, but whether a screen *reads* right to a shopkeeper is judgement, and it is the second of exactly two things this build cannot verify on its own. One image per run, a minute each, and you will catch things no assertion would.

The one to look hardest at is the balanced cash check. It is the only genuinely good moment in the product, it has to feel like a reward rather than an absence of a problem, and "feels like a reward" is not a property any test can assert.
