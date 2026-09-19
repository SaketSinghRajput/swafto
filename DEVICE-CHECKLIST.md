# DEVICE-CHECKLIST

**This is H8.** One hour, one real handset, one pass. Everything here is something a
constrained AVD **cannot** tell you - not "would be nicer on real hardware", but
structurally unanswerable in an emulator.

**The handset.** An INR 7,000-class Android phone bought new, not a developer spare and
not a flagship with the screen dimmed. If you only have one device, this is the one
worth buying for the project. An AVD system image carries a complete font set, a
perfect network, an infinite battery and a screen you are looking at indoors - it is
strictly more capable than the target on every axis below, which is exactly how these
defects ship.

Write the result next to each box. **A blank box is a fail**, because an unmeasured
number is not a result (§5.4).

---

## A · Script rendering - the launch-blocking one

DC-004 says a budget handset may ship **no Odia font at all**, and Odia is the app's
primary language. The mitigation is bundled: `apps/mobile/assets/fonts/AnekOdia.ttf`,
Anek Odia v1.003, SIL OFL 1.1, 858,180 bytes.

`npm run check:font` already proves, on any machine, that every character in every Odia
string we ship has a **real glyph** in that file - not merely a cmap entry, since a
mapping to glyph 0 is a mapping to .notdef, which is tofu with extra steps. It also
proves the font carries the `ory2` shaping script, without which conjuncts cannot form.

**What it cannot prove is that the device draws them.** That is A1-A6.

- [ ] **A1 · Odia is drawn, not boxed.** Open the app in Odia. Look at any screen with
  Odia text. **Tofu is a row of identical empty rectangles**, usually with a thin
  border, all the same width. If you see those, the bundled font did not load - the
  problem is the asset pipeline, not the font file, because the file is verified.
  _Record: pass / tofu._

- [ ] **A2 · Conjuncts form.** Odia stacks consonants. A failure here does **not** look
  like an empty box - it looks like the right letters with a **small dotted circle**
  between or under them, which is the shaper saying "I have the parts and cannot join
  them". Read a line of Odia closely. Any dotted circles?
  _Record: pass / dotted circles at ______._

- [ ] **A3 · Latin digits and the rupee sign inside an Odia line.** Constraint 8 puts
  Latin numerals in every language, so a money figure sits inside a run drawn with the
  Odia font. Find a screen showing an amount with Odia labels around it. Check the
  **digits**, the **comma**, and **the rupee sign specifically** - U+20B9 is the one
  most often missing from a script-specific font, and it is the character it would be
  worst to lose. Also check the **danda** at the end of an Odia sentence: it is U+0964,
  which lives in the Devanagari block, not the Odia one, so a font subsetted by block
  drops it.
  _Record: digits ___ · comma ___ · rupee ___ · danda ___._

- [ ] **A4 · Settle DC-004 itself.** This is the only way to move that constraint from
  MEDIUM to HIGH. Install a build with the bundled font **removed**, or open any Odia
  text outside the app (a web page in Odia, or set the phone's own language to Odia if
  it offers it). **Does this handset have an Odia font of its own?**
  - If NO: DC-004 is confirmed, bundling was necessary, mark it HIGH.
  - If YES: bundling was belt-and-braces on this OEM. Do **not** remove it - one device
    is not the fleet - but record the OEM and Android version, because that is the first
    real evidence either way.

  _Record: OEM ______ · Android ______ · system Odia present: yes / no._

- [ ] **A5 · Hindi in the system font.** We bundle Odia only. Hindi therefore renders in
  whatever Devanagari font the OS has. Look at a Hindi screen next to an Odia one. Two
  questions, and only the second is a defect: does the Hindi **render** (it should -
  Devanagari is near-universal), and does the **typeface mismatch** between the two
  languages look broken or merely different? If it looks broken, that is the trigger to
  bundle Anek Devanagari too, at a measured +2.19 MB against the 25 MB B24 budget.
  _Record: renders yes/no · mismatch acceptable yes/no._

- [ ] **A6 · The weight is the designed weight.** Measured, not assumed: Anek Odia's
  variable default instance is **wght 500 (Medium)**, not 400. Text with no explicit
  weight comes out one step heavier than a Regular specimen would suggest - everywhere,
  and nothing in the file name says so. Does the body text look heavier than the
  design? For these users, slightly heavier is usually **better** in sunlight; the point
  is to decide it deliberately rather than inherit it.
  _Record: acceptable / set explicitly to ______._

---

## B · Sunlight legibility

An emulator is a bright rectangle in a dark room. A shop front at 2pm is not.

- [ ] **B1 · Read the day's cash figure standing outside, in direct sun, at arm's
  length**, at whatever brightness the phone chooses. Not "can you make it out if you
  shade the screen" - can you **read** it.
  _Record: legible / squint / no._

- [ ] **B2 · The same at the lowest auto-brightness the phone picks indoors**, because a
  shop interior with the shutter half down is the other extreme.
  _Record: ______._

- [ ] **B3 · Every colour pair that carries meaning.** Contrast ratios computed at G10
  are a floor, not a guarantee - a cheap panel has a narrower gamut and worse viewing
  angles than the sRGB the maths assumed. Look specifically for **white on marigold**,
  which the design already forbids, and anything grey-on-grey.
  _Record: pairs that fail in sun: ______._

---

## C · Thumb reach and the keypad

- [ ] **C1 · One-handed, standing, holding something in the other hand.** That is the
  real posture: there is a customer in front of them. Can you complete an entry without
  the second hand?
  _Record: yes / no · what needed the second hand: ______._

- [ ] **C2 · Every keypad digit reachable by the thumb** without shifting grip.
  _Record: unreachable keys: ______._

- [ ] **C3 · Mis-taps.** Enter twenty amounts at your natural speed and count the
  mis-taps. A number here is worth more than an opinion.
  _Record: ___ / 20._

- [ ] **C4 · With the hands this is actually for.** Users are 35-70 and many work with
  their hands. If you can, hand the phone to someone with dry or calloused fingers -
  capacitive touch degrades, and a budget digitiser degrades further.
  _Record: ______._

---

## D · Real SMS on a real SIM

The stub port proves the contract. It proves nothing about a carrier.

- [ ] **D1 · An OTP actually arrives**, on a real SIM, on the network these users have.
  _Record: arrived yes/no._

- [ ] **D2 · How long it took.** Time it. Carrier latency on a rural cell is the number
  that decides whether the OTP screen's timeout is right, and it is not guessable.
  _Record: ___ seconds._

- [ ] **D3 · The Odia and Hindi messages arrive as ONE message**, not two. Segment
  counts are computed and enforced by `npm run check:sms:segments`, but the carrier has
  the last word. Two segments is double cost on every send, forever, and it is silent.
  _Record: en ___ · hi ___ · od ___ segments._

- [ ] **D4 · The Odia and Hindi text is not mangled in transit.** Some routes transcode.
  Compare the received text against `SMS-TEMPLATES.md` character by character.
  _Record: intact / mangled at ______._

- [ ] **D5 · Do it on a weak signal.** One bar, or inside a building. That is the
  condition, not the exception.
  _Record: ______._

---

## E · Battery and thermals

- [ ] **E1 · A full working day.** Install in the morning, use it the way a shop would -
  a few entries an hour, a close at the end - and read the battery figure at closing
  time. AD-009 records that the AVD proxy **flatters** us on exactly this axis.
  _Record: ___ % over ___ hours._

- [ ] **E2 · Does the phone get hot** during a day close with a full month of history? A
  budget SoC throttles early, and a throttled device is the one the benchmarks were
  never run on.
  _Record: ______._

---

## F · Do the AVD numbers survive contact?

Re-run the BENCHMARKS.md timings that were measured on the constrained AVD, on this
handset, and write **both** numbers down. **Do not change any threshold** - a missed
benchmark honestly reported is a result. If the device is slower than the AVD, that is
the finding, and AD-009's admission that the proxy flatters rendering and thermals is
the thing being tested.

| Benchmark | AVD | This device |
|---|---|---|
| B17 keypress to glyph, p95 (<= 80 ms) | | |
| B22 peak memory during day close (<= 220 MB) | | |
| App cold start | | |
| Day close, full month of history | | |

---

## What to do with the results

Write them into `BUILD_LOG.md` under an H8 heading, and update:

- **DC-004** - A4 decides whether it stays MEDIUM or becomes HIGH. That is its §5.7.3
  re-test.
- **AD-015** - A5 is that decision's reversal trigger. If the typeface mismatch reads as
  broken, Anek Devanagari gets bundled.
- **BENCHMARKS.md** - section F results only. **Never a threshold.**
- **H8** in `HUMAN-ACTIONS.md` - closed once every box above has something written in it.

H10 - whether the six Odia and Hindi strings *read right* to a native speaker - is a
separate job and is not on this list. Nothing here evaluates meaning.
