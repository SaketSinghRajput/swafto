# DERIVED-CONSTRAINTS

**§5.7.** Constraints that were *derived* rather than found in a source.

These are the most valuable findings in this build and the most fragile. A researched
constraint can be re-found by anyone who repeats the search. A derived one exists
nowhere except in prose that a later iteration may not read - so each gets recorded
here with how it was derived, what missing it would have cost, and its confidence, and
**each one that can be mechanically checked becomes a CI check in the same iteration**
(§5.7.2).

Confidence: **HIGH** - follows from a documented standard, arithmetic, or a measurement
we ran · **MEDIUM** - sound reasoning, one assumption unverified · **LOW** - plausible,
needs re-testing at the next document pass (§5.7.3).

---

## DC-001 · An Odia or Hindi SMS segment is 70 characters, not 160

**Confidence: HIGH** · **Check: `tools/check-sms-segments.mjs`** · Iteration 8

**Derived, not found.** Every DLT source consulted discussed template variable caps,
the 40% rule and the no-trailing-variable rule. **None of them stated the segment
length**, because segment length is not a DLT rule - it is a GSM 03.38 encoding fact
that DLT documentation assumes you already know.

**The derivation.** GSM-7 packs 160 characters into a 140-byte SMS payload. Any
character outside the GSM 03.38 alphabet forces the *entire message* to UCS-2, where
each character is 2 bytes, so 140 bytes holds **70 characters**. Odia (U+0B00-U+0B7F)
and Devanagari (U+0900-U+097F) are both outside GSM-7. Therefore every Hindi and Odia
template has a 70-character budget, not 160.

**What missing it would have cost.** Naively translating the 87-character English OTP
into Hindi or Odia yields roughly 90-110 characters - **two segments**. Double the SMS
cost on every sign-in, every number change and every PIN reset, for the entire life of
the product, in the two languages most of these users read. Nothing would have failed;
the bill would simply have been twice as large, permanently, and nobody would have
known why.

**Why it needed a check rather than care.** It got care, and care was not enough. The
first table of counts was estimated by eye and was **wrong on eleven of twelve
templates**; one sat at exactly 70/70 with zero headroom and nobody noticed. Odia
matras and the virama are separate UTF-16 units while reading as one glyph cluster -
the Odia for "code" looks like two shapes and is four units - so visual counting
undercounts *systematically*, not randomly. See AD-013.

**Its own derived dependency (adversary pass 01, F-05).** The GSM-7 alphabet that
decides which budget applies was itself reconstructed from memory: 127 content
characters, because GSM 03.38's 128th position is the ESC extension marker rather
than a typeable character. That reasoning is now stated in the tool and asserted
against `GSM_BASIC_CONTENT_CHARS`. A single wrong character in that string would
silently halve or double the budget for a whole language.

**Second-order consequence.** The same byte arithmetic determines whether Android's
SMS Retriever is viable: it needs the message plus an 11-character hash inside 140
bytes. At 2 bytes per character that is unaffordable for the sign-in template in both
Indian languages, which decided AD-011.

---

## DC-002 · Five-digit sample figures cannot detect an Indian-grouping bug

**Confidence: HIGH** · **Check: owed at G10** · Iteration 9

**Derived from inspection of our own test data**, prompted by injection 09 C.1.

**The derivation.** Indian digit grouping is 2-2-3 from the right (`1,23,456`);
Western grouping is 3-3-3 (`123,456`). The two conventions **produce identical output
for every number below 100,000** - the first differing digit position is the sixth.

Now inspect every money figure in the corpus: the canonical day uses
`6,780 · 3,120 · 1,550 · 1,180 · 3,200 · 2,400 · 6,050 · 6,300 · 11,450`, and the
Today screen adds `18,240 · 27,600 · 12,000 · 7,900`. **Every one is five digits or
fewer.** The whole body of sample data - across the design documents, the vectors and
every screenshot - is *structurally incapable* of detecting a wrong-locale grouping
bug.

**What missing it would cost.** A locale bug would pass every vector, every unit test
and every screenshot review, and would first become visible to a **real shopkeeper
looking at what he really owes a real supplier** - `INR 1,50,000` rendered as
`INR 150,000`. The first person to see it would be the one person who must not.

**Mitigation, owed at G10.** Vectors with six- and seven-digit amounts (a kirana shop
with INR 1,50,000 of supplier dues is entirely ordinary); one money-formatting
function with a static check banning any other paise-to-string path; and **no reliance
on `toLocaleString('en-IN')`** - Hermes ships without full ICU in many configurations
and falls back *silently* to Western grouping. No error, no warning, just the wrong
comma.

---

## DC-003 · The security group is the entire perimeter once Cloudflare leaves the data path

**Confidence: HIGH** · **Check: owed at G9 (Terraform assertion)** · Iteration 7

**Derived from composing two decisions that were each sound alone.** AD-008 removed
Cloudflare from the API data path for DPDP residency reasons. The architecture (§08)
already specified **no NAT gateway and a public subnet** on cost grounds.

Composed, those two give a `t4g.small` **directly addressable on the public internet
with no network layer in front of it**. Neither decision is wrong; the combination
creates an exposure that neither document mentions, because each was written without
the other.

**Compounding factor.** Injection 08 B.2 then moves rate limiting into the API - so
the control that protects the SMS bill now runs on the same box an L7 flood lands on.
Saturate the box and you lose the service and the rate limiter together.

**What missing it would cost.** Discovering at G9, after the auth design is fixed,
that unauthenticated OTP endpoints need a cheaper-to-evaluate pre-database limit and a
load-shedding path. Cheap now, expensive after the endpoints exist.

**Status.** Compensating control still to be decided - it is the next item in this
iteration and will carry its own AD.

---

## DC-004 · Odia will render as empty boxes on budget Android devices

**Confidence: MEDIUM** · **Check: `tools/check-font-coverage.mjs` (coverage) + `DEVICE-CHECKLIST.md` A1-A6 (rendering)** · Iteration 9, mitigated iteration 14

**Derived from the target-device profile**, raised by injection 09 C.2 and consistent
with what a INR 7,000 handset ships.

**The derivation.** Android's bundled font set varies by OEM and by price tier. Latin
and Devanagari are effectively universal; **Odia is not**. A device with no Odia font
renders tofu - empty boxes - for the app's *primary* language.

**Why confidence is MEDIUM, not HIGH.** We have not measured it on a real handset. The
reasoning is sound and the mitigation is cheap either way, but the claim "many cheap
phones ship no Odia font" is inherited, not verified here. §5.7.3 requires re-testing
this at the next document pass, and H8 is where it gets settled for real.

**What missing it would cost.** A launch-blocking defect in the primary language,
**invisible on every emulator**, because an AVD system image carries a full font set.
The kind of bug that ships because the development environment is more capable than
the target.

**Mitigation, done at iteration 14 (AD-015, AD-016).** Three static instances of Anek
Odia - Regular, Medium and Bold, SIL OFL 1.1, 489,820 bytes together, 1.87% of the B24
budget - are bundled under `apps/mobile/assets/fonts/`, and `npm run check:font` parses
them rather than trusting them.

**The split between what is proven and what is not, because it is the whole point of
this entry.** Coverage is mechanical and settled: every character in every Odia string
we ship has a **non-zero** glyph id, the `ory2` GSUB script is present so conjuncts can
form, and the file is pinned by sha256. *Rendering* is not, and cannot be, proven here
- a font that covers everything still draws nothing if the asset pipeline drops it.
That is `DEVICE-CHECKLIST.md` A1-A6.

**What building the check found that reasoning had not - twice.**

First, the near-miss. The static instances Google Fonts serves by default are 42 KB
each against the variable font's 858 KB, an apparent 85% saving, and they contain
**zero Odia glyphs**: the v1 API subsets to Latin unless asked otherwise. Shipping
them would have produced complete tofu in the primary language while looking like a
clever optimisation, and it would have survived any review that read file sizes rather
than file contents. The check caught it on its first run against those files.

Second, two of the required codepoints are **outside the Odia block**: the danda **U+0964**, which lives in the
Devanagari block and ends every Odia sentence we ship, and the rupee sign **U+20B9**,
which carries every money figure. A font subsetted "to Odia" by Unicode block drops
both - and the tofu would appear at the end of every sentence and in front of every
amount. The tool prints them on every run so the fact cannot quietly decay.

**Why confidence stays MEDIUM.** Bundling removes the dependency, but the underlying
claim - that cheap handsets ship no Odia font - is still inherited rather than
measured. DEVICE-CHECKLIST A4 is the measurement, and it is the only thing that moves
this to HIGH. Note that a MEDIUM claim already justified the mitigation: the fix cost
3.27% of the budget and the failure was launch-blocking in the primary language, so
waiting for certainty would have been the expensive choice.

---

## DC-005 · Anek Odia's digits are proportional, so constraint 8 is not satisfied by the font

**Confidence: HIGH** · **Check: `tools/check-font-coverage.mjs`** · Iteration 14

**Derived by measuring the font we had already decided to ship**, prompted by
injection 09 C.4.

**The derivation.** Constraint 8 requires money columns to align, which requires
tabular figures - every digit the same advance width. That property is usually
attributed to a *style* ("use tabular-nums"), but it is a property of the *font file*,
and it is readable directly from `hmtx` without rendering anything.

Read: Anek Odia's ten digits have **nine or ten different advance widths** in every
bundled weight. In Regular they run 672 to 1132 units at 2000/em - the "1" is about
60% the width of the "0". A column of amounts set in these figures does not line up,
and no layout code can make it.

Resolve the `tnum` GSUB feature and measure again: **one width**, in all three
weights (1087 / 1107 / 1179). The font can do it. It just does not do it by default.

**Why this is worse than a font that simply lacked the feature.** A font with no
tabular figures fails obviously and immediately. This one is correct in a specimen,
correct anywhere the feature is applied, and silently wrong everywhere else - and the
place it is wrong is a column of money, which is the entire product.

**What missing it would have cost.** Every amount column in the app subtly ragged,
noticed late, attributed to padding or letter-spacing, and "fixed" by adding
monospace-ish hacks in a few components rather than by the one line that actually
fixes it. C.4's own framing: you need to know this now rather than at G14.

**What it obliges.** Every money style sets `fontVariant: ['tabular-nums']`; a
`check-governance` rule at G10 asserts it, next to the existing C.1 rule that there is
exactly one paise-to-string path; DEVICE-CHECKLIST B4 confirms React Native honours it
on Android, which is the half no static check can reach. See AD-016.
