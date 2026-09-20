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

# 21-repository-layout

# SWAFTO — injection 21: clean the root, without laundering anything

Twenty-odd loose files at the repository root. Worth fixing, and worth being careful about, for one specific reason: **a reorganization is the most legitimate-looking excuse there will ever be to regenerate every lock file.** `benchmarks.lock` and the `INJECTIONS/` pins both exist to make content immutable, and "I moved some files so I re-ran the lock" is exactly the sentence that would hide a content change. Six times in this build something turned out not to be what its record claimed. This is the seventh opportunity.

So the prompt does the move in a way that proves nothing changed, and it caps the whole thing at one iteration.

The actual deliverable is not fewer files. It is that someone arriving at this repo in six months can find the thing they need in thirty seconds — which means a root README that is an index, more than it means a directory tree.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 21. Repository layout. ONE ITERATION, hard cap. This is housekeeping, not
work, and it does not get to eat the screen budget. If it cannot be done in one
iteration, do the smaller version in A.6 instead and move on.

Iteration 26's shape-3 correction is accepted and it corrects me: I claimed the B3 gap
is where the next stdevMoney lives, and your evidence kills that — line 179 was at 100%
coverage all along. Shape 3 is executed-and-unasserted, no coverage figure can point at
it, and mutation is the only instrument that finds it. That is now the strongest
argument in the build for extending mutation:money to the other engine files, since it
is the one shape-3 instrument you have that §5.16 passes. Do that AFTER the screens, or
not at all, but record the reasoning in BENCHMARKS-RESULTS.md beside B4.

═══════════════════════════════════════════════════════════════════════════════
A · THE MOVE
═══════════════════════════════════════════════════════════════════════════════

A.1  HASH EVERYTHING FIRST. Before touching a single file, write a content hash for
     every tracked file in the repository to a temporary manifest. Content only —
     not path, not mtime, not size. This is the control.

A.2  CLASSIFY, THEN MOVE. Use the directories that already exist rather than inventing
     new top-level ones. Proposed map — adjust where a file does not fit, but say so:

       docs/governance/   BUILD_STATE · BUILD_LOG · FINDINGS · REVIEW ·
                          DECISIONS-AUTONOMOUS · PROJECTION · DERIVED-CONSTRAINTS
       docs/benchmarks/   BENCHMARKS.md · BENCHMARKS-RESULTS.md · benchmarks.lock
       docs/audits/       LEGAL-AUDIT · SECURITY-AUDIT
       docs/spec/         SPEC-DIGEST · TECH-DECISIONS · SMS-TEMPLATES
       docs/handover/     HUMAN-ACTIONS · DEFERRED · DEVICE-CHECKLIST ·
                          DEPLOY-RUNBOOK
       INJECTIONS/        unchanged — do not move a hash-pinned directory
       reports/           .vectors-node.json · .vectors-hermes.json ·
                          .sms-segments.json and any other GENERATED output, renamed
                          without the leading dot since they are not config
       (gitignored)       .detection-tmp.json · .hermes-bundle.js · anything else
                          that is a build or run artifact — these should not be
                          tracked at all; confirm each before ignoring it

     AT THE ROOT, keep only: README.md, package.json and its lockfile, tsconfig,
     .gitignore, .gitattributes, and the workspace directories. Nothing else.

A.3  USE git mv, NEVER copy-and-delete. History follows the file or the file is a new
     file with a coincidental name.

A.4  PROVE NOTHING CHANGED. Re-hash every tracked file and diff against A.1's manifest.
     THE SET OF CONTENT HASHES MUST BE IDENTICAL — same multiset, no additions, no
     removals, no alterations. Only the paths may differ. Paste that diff. If a single
     hash moved, stop and find out why before continuing; a content change smuggled in
     under a rename is the exact failure this step exists to catch.

A.5  LOCKS. Determine, by reading them, whether benchmarks.lock and the INJECTIONS pin
     hash CONTENT or PATH+CONTENT.
       • Content-only: they need no regeneration. Do not regenerate them. A lock that
         did not need touching and was touched anyway is unexplained.
       • Path-dependent: regenerate, and in the same commit paste A.4's proof that
         every content hash is unchanged. The regeneration must be justified by the
         lock's own design, quoted, not by convenience.
     Either way, say in BUILD_LOG which of the two each lock is, with the evidence.

A.6  THE SMALLER VERSION, if the full move will not fit in one iteration: move ONLY
     the generated artifacts out of the root and into reports/ or .gitignore, write
     the README in B, and leave the markdown where it is. That is most of the benefit
     for a fraction of the work, and a half-finished reorganization is worse than
     none.

═══════════════════════════════════════════════════════════════════════════════
B · THE ACTUAL DELIVERABLE IS THE README
═══════════════════════════════════════════════════════════════════════════════

Fewer files at the root is cosmetic. A findable entry point is not. Write README.md as
an INDEX, for someone who has never seen this repository and needs one specific thing:

  • What SWAFTO is, in three sentences.
  • The walkable path: the exact commands to install, run the tests, and see the app.
  • WHERE TO LOOK FOR WHAT — one line per document, saying what question it answers.
    Not what it is called; what it is FOR. "BENCHMARKS.md — the forty conditions that
    define done, frozen by hash" beats "benchmark documentation".
  • The current state, GENERATED not typed: gates, instrumented/met, iteration. It is
    derived like everything else, and §5.14 applies to the README exactly as it
    applies to BUILD_STATE.
  • The five rules a new contributor would otherwise break: no AI in data entry, money
    is integer paise, entries are append-only, totals are derived never stored, and
    the registry owns every shared value.
  • A pointer to HUMAN-ACTIONS.md as the first thing to read before shipping anything.

This README is also the front page of the handover report at 40. Write it as though
that is its job, because it is.

═══════════════════════════════════════════════════════════════════════════════
C · THEN RE-PROVE THE HARNESS
═══════════════════════════════════════════════════════════════════════════════

Every check that reads a file by path is now pointing somewhere else. Some will fail
loudly, which is fine. The dangerous ones are those that fail QUIETLY — a glob that
now matches nothing and exits 0, a reader that treats a missing file as an empty one.
check:sms already demonstrated the good behaviour when limits.ts moved under it; not
every check will.

  C.1  Run the full verification. Fix what breaks.
  C.2  Then §5.12: every verifier still EXISTS and RUNS.
  C.3  Then §5.16: every verifier still RESPONDS. Re-plant each defect and confirm the
       check still fails on it. A check that passes after the move because it can no
       longer find its subject is the seventh instance of the pattern, and the move
       is exactly the event that would create it.
  C.4  check:generated, check:registry, check:shadow and check:governance all take
       paths. Confirm each still covers the same file set — compare the COUNT of files
       each one examined before and after, not just that it exited 0.

═══════════════════════════════════════════════════════════════════════════════
D · COMMIT SHAPE
═══════════════════════════════════════════════════════════════════════════════

Three commits, in this order, so the diff is readable and a bad one is revertable:
  1. move only — git mv, no content edits, A.4's hash proof in the message
  2. reference fixes — every path updated in checks, configs and docs
  3. README

Then resume: rejects.json, the B3 re-measurement, both fixtures, the RN scaffold.
Checkpoint 1 has already fired and been re-cut; the committed set is A.3 items 1-3
plus opening cash, and the ceiling stays at 40 with the real decision at 35.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## Two notes

**C.3 is the part I would not skip.** A file move is the single most likely event to turn a working check into one that silently passes, because a check that cannot find its subject often has nothing to complain about. You have hit that pattern six times in six different layers; this is a seventh opportunity handed over on a plate.

**On opening cash** — the prompt carries the change I suggested: items 1–3 plus opening cash as the committed set. Without it a real first user has no way to begin a day, and it is one Form-D-shaped screen.
