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

# 24-design-md

# SWAFTO — injection 24: DESIGN.md, read from the code rather than the intention

There are no screens in the codebase yet. The BI6 finding established that — no `.tsx` files exist. So a DESIGN.md generated from the code today renders almost empty, and **that is the correct output.** Build it now anyway, for two reasons.

First, it fills as screens land, which makes it a record of what was actually built rather than what was meant to be built. Every other design artifact in this project describes an intention.

Second, and more useful: **DESIGN.md is not documentation, it is a drift detector.** The design system says what the screens should do; the code says what they do. Rendering the second and diffing it against the first is the only way anyone finds out that screen six quietly hardcoded a colour, or that a touch target came out at 44dp because a parent's padding ate it.

So the prompt builds it as a reader of code and render output, not as a writer of design. It never proposes anything. It reports, and the gaps are the point.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 24. Build DESIGN.md — generated from the codebase, never written. Same
discipline as PLAN.md and TASKS.md. Build the generator now; expect it to render almost
empty at iteration 26, and say so in the file rather than hiding it.

DESIGN.md REPORTS WHAT THE CODE DOES. It does not say what the design should be — the
design system and the Strategy 1 spec own that. Its whole value is the difference
between the two.

═══════════════════════════════════════════════════════════════════════════════
A · WHAT IT READS
═══════════════════════════════════════════════════════════════════════════════

Two sources, and every fact in the document is labelled with which one it came from,
because they have very different reliability:

  STATIC   — the source. Component files, style objects, token imports, the registry.
             Cheap, complete, and blind to anything computed at runtime.
  MEASURED — the render and instrument output. Actual rendered sizes, actual contrast
             pairs, actual screenshots. Expensive, partial, and the only thing that
             tells the truth about a layout.

Where the two disagree about the same property, that disagreement IS A FINDING and goes
in section E. A style object declaring 56dp and a rendered target of 44dp is the exact
defect a static-only document would certify as fine.

═══════════════════════════════════════════════════════════════════════════════
B · SCREEN INVENTORY — ONE SECTION PER SCREEN, ALL OF THEM
═══════════════════════════════════════════════════════════════════════════════

List EVERY screen in the committed set, not only the ones that exist. A screen with no
file renders as ABSENT with an empty body. That keeps the document a complete picture
of the target and stops it looking finished when it is merely empty.

For each screen, generated:

  ID and name, and the file that implements it, or ABSENT
  ROUTE           how it is reached, and from where
  FEATURE IDs     which of IN/P/OP/BI it displays — cross-checked against TRACEABILITY,
                  and a mismatch between the two is a finding
  COMPONENT TREE  the design-system components it composes, nested, one level of detail
                  is enough — the shape, not every view
  TOKENS USED     every token referenced, by name
  RAW VALUES      EVERY colour, size, spacing or font value that is NOT a token.
                  This list should be empty. Each entry is a violation with its
                  file and line. This is the single most valuable table in the
                  document.
  STATES          which of loading / empty / error / loaded are implemented, derived
                  from the code, not from a comment saying they are
  KEYPAD          present or absent, and whether a bottom navigation is also present.
                  Both present is an error, printed as one.
  TEXT STYLES     every text style used, with its size — flag anything below the
                  registry's minimum
  TOUCH TARGETS   every interactive element and its size — STATIC from the style and
                  MEASURED from the render, side by side
  CONTRAST        every foreground/background pair this screen actually produces, with
                  its computed ratio
  SCREENSHOTS     links to both fixtures, canonical and adversarial, or MISSING
  §B.6 BAR        the eight children from TASKS.md, each derived, so this section and
                  the task list cannot disagree

═══════════════════════════════════════════════════════════════════════════════
C · COMPONENT INVENTORY
═══════════════════════════════════════════════════════════════════════════════

Every reusable component found in the code:

  name and file · which screens use it · its props with types · its variants and
  states · the tokens it consumes · any raw values it contains · whether it is used
  more than once

Two derived lists that earn their place:

  USED ONCE       components built as shared and used by a single screen. Not
                  necessarily wrong — it may be about to be used again — but worth
                  knowing, because a "component" with one caller is usually a screen
                  section that got promoted for no reason.
  DUPLICATED      near-identical component trees appearing in more than one screen
                  without a shared component. That is the drift that turns nine
                  screens into nine dialects, and it is much cheaper to catch at
                  screen three than at screen nine.

═══════════════════════════════════════════════════════════════════════════════
D · TOKEN MAP
═══════════════════════════════════════════════════════════════════════════════

Three tables, all generated:

  D.1  DEFINED AND USED — every token, with a count of references and where.
  D.2  DEFINED AND NEVER USED — dead tokens. Either the design system carries
       something the product does not need, or a screen is doing by hand what a token
       already does. Both are worth knowing; do not delete anything on this evidence
       alone.
  D.3  USED BUT NOT DEFINED — raw values that appear often enough to want a token.
       Group identical values: the same hex appearing in four files is one missing
       token, not four mistakes.

Both appearance modes, Comfort and Focus, throughout. A token used only in one mode is
a finding — the whole design rests on one set driving both.

═══════════════════════════════════════════════════════════════════════════════
E · THE DRIFT TABLE — THE REASON THIS DOCUMENT EXISTS
═══════════════════════════════════════════════════════════════════════════════

Every place the code disagrees with its specification. One row each:

  what the spec says · where it says it · what the code does · where · severity

Check at minimum, mechanically:
  • a raw value where a token exists
  • white text on marigold, anywhere, in any form
  • body text below the registry's minimum, or a touch target below it
  • a keypad on a screen outside the seven, or beside a bottom navigation
  • a screen showing a figure the engine does not produce, or producing one it does
    not show
  • money rendered without its sign and direction arrow, or coloured without them
  • a non-Latin numeral anywhere in a money field
  • a figure sourced from anywhere other than the engine — the B.1 fixture rule,
    checked statically by looking for what the component actually reads from
  • STATIC and MEASURED disagreeing about the same property

An empty drift table at screen nine would be surprising and should be treated as a
§6.6 empty pass: run it again, harder, on a different slice.

═══════════════════════════════════════════════════════════════════════════════
F · BUILD AND CHECK
═══════════════════════════════════════════════════════════════════════════════

F.1  tools/gen-design.mjs. Static analysis over the app source plus a read of the
     instrument outputs. It writes DESIGN.md and nothing else.
F.2  check:design fails on any row in the RAW VALUES table, on any keypad-plus-nav
     pair, and on any STATIC/MEASURED disagreement. The rest of the drift table is
     reported, not enforced — some of it needs judgement, and a check that fails on
     judgement gets disabled.
F.3  Put check:design in VERIFIERS.md with its planted defect (§5.12) and its response
     test (§5.16): add a hardcoded colour to a screen, confirm the table grows by
     exactly one row, remove it, confirm it shrinks.
F.4  Regenerate at the end of every iteration that touched a screen, and say in the
     header which iteration produced it and against which commit.
F.5  AT ITERATION 26 THIS FILE WILL BE NEARLY EMPTY. Print the committed screen list
     with every row ABSENT, and a header line saying so plainly. An honest empty
     document is useful; one that hides its emptiness behind prose is not.

═══════════════════════════════════════════════════════════════════════════════
G · THE TEST OF WHETHER IT WORKED
═══════════════════════════════════════════════════════════════════════════════

After Form A lands, someone who has never opened the app should be able to read
DESIGN.md and say what Form A looks like, what it is made of, and exactly where it
departs from the design system. If the drift table is empty at that point, the
generator is not looking hard enough — the first screen is where the most drift is
created, because that is where every pattern gets invented.

Then resume at the NEXT line in TASKS.md.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## The two tables that will actually earn their keep

**RAW VALUES**, per screen. It should always be empty, and the first time it is not, you have caught a hardcoded colour or size before it was copied into the next eight screens. That is the cheapest possible moment to catch it.

**DUPLICATED**, in the component inventory. Nine screens built in sequence by one builder drift into nine dialects of the same design without anyone deciding to. Catching a repeated tree at screen three costs one refactor; catching it at screen nine costs nine.

