# REVIEW

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
