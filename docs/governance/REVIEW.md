# REVIEW

## The adversary checklist (§6.3)

A1 fixture uniformity · A2 composed removals · A3 topology drift · A4 guards that have
never executed · A5 untested rejection paths · A6 documents describing a system that
changed · A7 externally frozen artifacts · A8 reconstructed-from-memory constants ·
A9 derived claims about how two things interact · A10 generated files nothing
regenerates ·

**A11 · CONTENTS, NOT METADATA.** Is the claim about the artifact's *identity* or
about what is actually *inside* it? Added after two instances in one iteration:
static font instances at 42 KB against 858 KB - an apparent 85% saving - containing
**zero Odia glyphs**, a defect that survives any review reading file sizes, filenames
or family names; and the near-miss on Noto, where the family name was verified and
the licence was not.

*Ask: what did I check - the label or the payload? Open the payload.*

**A12 · THE SCOPE OF THE DEFENCE.** What is this guard scoped BY, and does the test
data vary along THAT axis? Not "is there enough data" (A1) but "does the plant move
in the dimension the guard is written in". Instance: the append-only trigger is
scoped by COLUMN, and every test only ever updated `amount` - so narrowing it to one
column left the suite green on the authoritative store.

*Ask of every guard: is it scoped by column, table, path, role, entity type,
language, platform, or environment? Then plant a defect that moves along that axis
specifically.* The four-column sweep is the template, and the part to keep is
choosing columns with NO CHECK constraint, so a rejection can only be the trigger. A
plant caught by the wrong guard passes for the right reason and teaches nothing.

**The scoping axis of every guard now in place**, so a future pass has somewhere to
start rather than rediscovering them:

| guard | scoped by | does a plant move along it? |
|---|---|---|
| append-only trigger | **column** | yes, since iteration 19 - four unconstrained columns, both engines |
| closed-day trigger (CP-4) | **day state**, and the day named by the row | **yes, since iteration 35** - the guard was re-pointed at `corrects_day_id` instead of `day_id`, which is the exact column swap the axis is about. Six tests failed, in both directions: the correction was wrongly rejected AND the entry into the closed day was wrongly allowed |
| cross-tenant RLS | **shop_id**, per table, and **where the shop id comes from** | **yes, since iteration 35, and the debt paid off** - see the finding below. The policy was asserted present on all six tables and the READ plant was owed until routes existed. When it was finally run it SURVIVED 228 tests |
| money lint | **file path and identifier name** | yes - planted in the engine and outside it, and on a money-named vs non-money identifier |
| rate limiter | **rule identity and identifier value** | yes - per-rule and per-identifier plants, plus the telemetry-only rule |
| template checker | **language** | partly - the copy-vs-constant plant is English-only, because only English states a duration today. It fires on any language the moment one gains a number |
| font coverage | **weight**, and **codepoint block** | yes - all three weights checked, and the plant used a codepoint outside the Odia block |
| check-tooling | **directory name** | NO - and this is how `.stryker-tmp` survived. It walks `tools/` and `scripts/` and skips every name beginning with a dot, so no plant had ever moved along its axis. Closed by `check:shadow`, which scopes by *tracked-ness* instead |
| check-shadow-copies | **tracked vs untracked** | yes - the plant is an untracked directory holding a package.json and a spec file, re-verified against the real shape under `.stryker-tmp/`, which is gitignored and still fails |

### THE PASS AT ITERATION 35, AND WHAT IT FOUND

Run against the surfaces built since the last pass: the API client, the host
drain, the consent flow, the deletion path, the web page, and the two checkers
added in the same iteration.

**FINDING 1 - THE CROSS-TENANT DEFENCE HAD NO TEST, AND A PLANT SURVIVED THE WHOLE
SUITE.** `shopOf` was changed to prefer a `shopId` taken from the query string or
the request body over the one in the session claims. That is the textbook
forged-tenant defect, S-11 by name, and **228 tests passed with it in place**. The
code was right the whole time; the confidence in it was unearned. Four cases now
vary the axis the guard is actually written in - where the shop id COMES FROM - and
two of them kill the plant. The other two guard the body and header routes into the
same defect, and pass in both states because the schema already refuses one and
nothing reads the other.

The lesson is the one A12 keeps teaching: *the policy is asserted present* is not a
test, and a defence nobody has tried to defeat is a belief.

**FINDING 2 - A CHECKER SCOPED BY A HAND-WRITTEN LIST.** `check:naming` read four
named files. Its plant only ever moved along the TERM axis - a forbidden word in a
file already on the list - so on the FILE axis it was blind, and the newest code in
the repository was the code it did not cover. Exactly how `.stryker-tmp` survived
`check-tooling`. It now walks every source file in the product, and widening it
immediately found a FALSE POSITIVE: the L-15 disclaimer, *"Not a tax document and
not prepared for any government submission"*, which is the sentence the audit
REQUIRES. A checker that forbids the required disclaimer is wrong, so a denial
before the term is now skipped - with a twenty-character window, and probed to
confirm that a denial about one thing does not license a claim about another in the
same sentence.

**FINDING 3 - A TRIPWIRE THAT DID NOT MOVE ALONG ITS OWN AXIS.** `check:push` was
scoped by a list of known SDK names, which is the list that will not contain the
SDK somebody reaches for next year. A dependency-name sweep was added and probed
with three unlisted names - all flagged - and one unrelated package, which was not.

**DISCHARGED - the correction-into-closed-day plant.** Owed since iteration 19 and
now run: the trigger was re-pointed at `corrects_day_id`, and six tests failed in
both directions. The guard is scoped by the right column and the suite can tell.

**Nothing found in:** the drain loop's ack ordering (its failure cases were built
adversarially and each was planted as it was written), the deletion OTP namespace
(a sign-in code cannot delete and is tested), or the consent log-versus-current
reading (the defect was found while writing the first end-to-end test and fixed at
the route).

**A12 APPLIES TO THE CHECKS THAT CHECK THE CHECKS.** The two rows above were added at
iteration 26 because `check:shadow` found what `check-tooling` structurally could not.
That is not a gap in `check-tooling`'s logic - it is its *scoping axis*, the directory
name, and no plant had ever varied along it. Every guard in this table had its axis
audited; the auditing tools themselves did not, because they were doing the auditing.
A12 has no such exemption, and a checker's blind spot is the most expensive kind -
everything behind it is presumed checked.

Two of those say **partly**, and that is the honest answer rather than a tick. Both
are owed plants, recorded here so the gap is visible: the correction-into-closed-day
axis, and a genuine cross-tenant read. It generalises
well past fonts - a migration file that exists and is empty, a translation bundle
with the right key count and English values, a screenshot of the right screen with
stale data, a dependency at the right version from the wrong registry. Where an
artifact is binary or generated, inspect its contents.


Findings from the adversarial passes required by §5.3, plus standing findings about
the checks themselves.

Formal reviews run after **G9**, **G16**, **G19** and at **G20**, each with a code
pass and a DOCUMENT pass of equal weight (§5.6.4). This file accumulates.

---

## Standing findings about the verification apparatus

### R-001 · Token-level contradiction detection has a semantic blind spot

**Found:** injection 09 A.3, by a human reading `SMS-TEMPLATES.md §2`.

`tools/check-prose.mjs` catches a sentence carrying both a resolved-status token and
an unresolved one. It could **not** catch this:

> "Six characters, and since 6 May 2025 it must carry a category suffix… Proposed:
> `SWAFTO`."

Both halves are individually well-formed, contain no status tokens, and are separately
plausible. The contradiction is *arithmetic and semantic*: a six-character field cannot
hold six characters of brand **and** a suffix. Only someone who added it up could see
it. (The underlying fact turned out to be that the operator appends the suffix
automatically — so the proposal was right and the claim was wrong.)

**What this means.** The document pass in §5.6.4 is doing work the checker structurally
cannot. It is not a backstop for the checker; the checker is a backstop for it. Any
future temptation to treat a green `check:prose` as "the documents are fine" should
re-read this finding.

**Class of defect to hunt in every document pass:** two individually-true statements
that cannot both hold of the same object. Numbers that must add up, fields with a
fixed size, counts that must match, dates that must be ordered.

### R-002 · Hand-counted evidence is not evidence

**Found:** injection 09 A.2, by a human recomputing the table.

The 70-character segment constraint was derived correctly (DC-001) and then defended
with a hand count that was **wrong on eleven of twelve templates**, with one sitting
at exactly 70/70 unnoticed. The derivation was right; the enforcement was theatre.

Generalised into §5.7 and AD-013: every derived constraint that can be mechanically
checked becomes a CI check **in the same iteration it is derived**.

**Class of defect to hunt:** any number in a document that a person typed rather than
a tool produced. §5.4 already forbids printing an unmeasured figure; R-002 is the
reminder that a *carefully estimated* figure is still unmeasured.

### R-003 · Our own sample data cannot detect a whole class of bug

**Found:** injection 09 C.1.

Every money figure in the entire corpus is five digits or fewer, and Indian and
Western digit grouping are **identical below 100,000**. The test data is structurally
incapable of detecting a locale bug. Recorded as DC-002; mitigation owed at G10.

**Class of defect to hunt:** test data that is uniform in a dimension the code varies
in. Ask of any fixture set: *what would this never catch?*

---

## Composition pass 1 · after injection 10 (§5.8)

Thirteen autonomous decisions exist (AD-001..013) plus the architecture's own
standing rulings. Pairwise over the thirteen is 78 pairs; including the four
architecture rulings most likely to interact (no NAT gateway, public subnet,
derive-on-read, one-shop-one-phone) gives **136 pairs considered**.

Most are unrelated and dismissing them is fast — AD-007 (retention period) and
AD-011 (SMS autofill) cannot interact. What follows are the pairs that survived.

**§5.8.2 says to look hardest where BOTH decisions removed something.** Four such
pairs exist. Three are benign. One is DC-003.

### CP-1 · AD-008 (remove Cloudflare) x architecture §08 (remove NAT gateway) — **DEFECT, already recorded as DC-003**

Two subtractions, each justified, jointly removing every layer between the internet
and a `t4g.small`. Compounded by injection 08 B.2 putting the rate limiter on that
same box. **Open; the compensating control is next in the queue.**

### CP-2 · AD-011 (no app hash in templates) x AD-012 (drop the validity clause) — benign, and mutually reinforcing

Both shorten or constrain the SMS. Composed, they could have squeezed the message
from two directions at once. They do not: AD-012 *freed* budget by removing the
validity clause, and AD-011 declined to spend it on a hash. Net headroom improved
from 0 units on the worst template to 6. **Checked by `check:sms:segments`, so the
composition cannot silently regress.**

### CP-3 · D5 (no stock data) x AD-002 (BI4 formula) x AD-001 (BI6 choice) — benign, and it *caused* two good outcomes

D5's removal of item data is what made the prompt's BI4 formula unbuildable (AD-002)
and what eliminated expense-category drift from the BI6 candidate list under R3
(AD-001). A removal propagating two gates downstream and correctly constraining both
is the healthy version of composition. Worth recording as the counter-example: not
every composed removal is a defect.

### CP-4 · D9 (one shop, one phone) x AD-004 (SMS stub) — benign now, **a trap later**

D9 means no multi-device conflict resolution exists. AD-004's stub makes every auth
path testable without a carrier. Composed, there is currently no test anywhere that
exercises *two devices racing for the same shop*, because the product says that
cannot happen and the stub would happily serve both. If D9 is ever relaxed, the
absence is invisible — nothing fails, there is simply no coverage. **Recorded, not
fixed:** fixing it now would build conflict machinery D9 forbids. The reversal
trigger on D9 must therefore also require adding this test.

### CP-5 · Derive-on-read x SQLCipher (SECURITY-AUDIT TB2) — benign, already reasoned

Whole-file encryption was chosen partly *because* per-field encryption would break
`SUM()` in SQL and make derive-on-read unaffordable. This pair was composed
deliberately at G3 rather than discovered later. Noted so the next pass does not
re-litigate it.

### CP-6 · Append-only ledger x DPDP right to correction — benign, resolved at G2

Already reasoned in LEGAL-AUDIT §1.5: personal data is editable, ledger entries are
corrected by a dated correction entry. Recorded here so the composition pass has it
on file rather than rediscovering it.

**Pairs considered: 136. Findings: 1 defect (pre-existing, DC-003), 1 latent trap
(CP-4), 4 benign-and-reasoned.**

### What this pass taught me about my own reasoning

The A.3 header finding and DC-003 are the same shape, and injection 10 named it
before I did: **two correct premises composing into a false conclusion.** Headers are
six characters; transactional headers carry a category suffix — both true, and the
conclusion that the suffix eats into the six is false, because a third party appends
it. I would have derived the wrong answer with high confidence. I looked it up
instead, and only because the checker forced the contradiction into view.

The operational rule I am taking from this: **when a question is about how two rules
interact, treat "I can derive this" as a weak signal and go and look.** Composition is
where derivation is least reliable, which is exactly where it feels most reliable.

### R-004 · The detection-rate denominator has a floor, and comparisons need equal blast radius

**Found:** by re-measuring my own `no-totals-are-stored` probe after injection 12
supplied the poison-then-drop design.

The first probe added an unused column and scored 1/64. The rewritten probe makes the
engine **prefer a cached figure over deriving one** — the actual violation — and still
scores 1/79. That is not a worse probe; it is a correct one, and the number is honest:
only the test that poisons that specific field name can possibly see it, and it caught
it precisely.

**The limitation.** The denominator is the whole suite, which has a floor: no mutation
breaks tests that never touch it. `2/59` for digit grouping and `1/79` for a cached
read look comparable and are not. Grouping is **broad** — every money render should
have been able to catch it and almost none could, which is a real fixture finding. A
single cached field name is **narrow** by construction.

**What I changed.** `breadth` on each mutation now describes the **mutation's blast
radius**, not the importance of the rule, and only broad mutations are flagged LOW.
`no-totals-are-stored` was reclassified narrow for that reason — not to turn a red
number green, which is why the reclassification is recorded here rather than made
quietly.

**The signal that always means something is UNDETECTED (0).** That is scope-independent:
if nothing at all notices, nothing at all is protecting the invariant. Ratios above
zero are only comparable between mutations of similar reach.

### R-005 · Rules describe intent; flows produce reality

**Found:** injection 11, on my CP-4 miss.

I asked whether D9 *permits* two devices on one shop, concluded no, and recorded CP-4
as latent. The lost-phone number-change branch *produces* two devices regardless of
what D9 permits. The rule was about concurrent editing; the flow was about a handset
that still holds a never-expiring session.

**Generalisation for every future composition pass:** when checking whether a condition
can occur, enumerate what the system **does** — every flow, including the recovery and
failure paths — not what the rules **allow**. Recovery flows are the likeliest source,
because they exist precisely to handle the abnormal.


---

### R-006 · The OTP TTL is a judgement call that a measurement we have not taken would settle

> **CLOSED at iteration 19 - and closed against my own reasoning here, which was
> wrong in a way worth keeping.** I wrote below that "the spec stands" and deferred to
> SECURITY-AUDIT TB6's five minutes. There were TWO specs. `SMS-TEMPLATES.md` had
> ruled ten minutes at injection 08, with the trade-off argued and the constant named
> as 600, and its English template already promised "Valid 10 min" - so transcribing
> TB6 would have shipped a lie in the one artifact that cannot be cheaply changed.
> Deferring to an existing decision is only safe if you find all of them. See
> SPEC-DIGEST C-8. The lesson generalises past this entry: "the spec says X" is a
> claim about search coverage, not about X.

**Raised at iteration 17, implementing B.2. Not acted on.**

SECURITY-AUDIT TB6 fixes the code lifetime at **5 minutes**. Writing the limiter I
argued for 10, on the ground that this product's users are on congested rural cells
where an SMS can take minutes rather than seconds, and that a code which expires
before it arrives is a support burden rather than a security control - the real
defence against guessing is 5 attempts against a 6-digit space, not the window.

**That argument is a concern, not evidence, so the spec stands.** The code is 5
minutes, as ruled.

**What would settle it.** DEVICE-CHECKLIST D2 measures exactly this: *"How long it
took. Time it."* - real carrier latency on a real SIM on a weak signal, in seconds. If
median delivery plus the time an unhurried 60-year-old needs to read six digits off a
notification and type them approaches 5 minutes, the TTL is wrong and the evidence
will say so. If it is 20 seconds, the question is closed and this entry can be struck.

**Why it is written down rather than acted on.** Lengthening a credential's lifetime
on a hunch weakens a security control for a comfort I have not demonstrated; shortening
it strands real users. The honest position is that the number is currently a guess in
both directions, and that one measurement we have already committed to taking resolves
it. Recorded as AD-017's third reversal trigger.

---

### R-007 · The per-IP limit assumes an IP means something, and in India it often does not

**Raised at iteration 17, implementing B.2. Not acted on.**

TB6 sets **20 sends per IP per hour, lockout 1 hour**. Indian mobile carriers place
very large numbers of subscribers behind carrier-grade NAT, so one public address can
represent a great many real shopkeepers. An IP limit is therefore the weakest
identifier in the set: it does not stop an attacker, who rotates addresses, and it can
in principle reject legitimate users who share an address with a noisy one.

**I am not proposing a change, and it is worth saying why the obvious worry is
probably overstated.** Sign-in is rare in this product - sessions do not expire
(B.4/ADR-007), so a handset authenticates roughly once in its life. Twenty sends an
hour from one carrier NAT is a lot of first-time sign-ins from one address in one
hour. The limit is likely fine, and the case for loosening it is much weaker than it
first appeared. **This is the F-03 lesson applied before filing rather than after:
the dramatic version of this finding is not the true one.**

**What it obliges instead - a monitoring rule, not a limit change.** If per-IP
rejections ever appear in volume, carrier-grade NAT is the FIRST hypothesis and the
limit must not be tightened before it is ruled out. The signal is distinctive: many
distinct phone numbers rejected behind one address, each with a low per-number count.
Tightening in response to that pattern would reject a district of paying customers
while doing nothing to the attacker it was aimed at.
