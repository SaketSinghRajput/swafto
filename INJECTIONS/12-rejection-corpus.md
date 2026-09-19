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

# 12-rejection-corpus

# SWAFTO — injection 12: the rejection corpus

Two items. Both are generalisations of things you found yourself this iteration, and after them there is nothing structural left to add before the screens.

`money-integer-paise 0/59` is the most valuable defect this build has produced, and the sentence that matters is yours: *"the missing dimension wasn't more data, it was inputs that should be refused."* That is not one gap. `vectors.json` describes valid days, so **the entire suite has no negative-input corpus at all.** `assertPaise` is the instance you happened to probe.

Your breadth fix and the weak-probe call on `no-totals-are-stored` are both right, and the second one has a precise fix below.

---

# ▼ PASTE EVERYTHING BELOW THIS LINE ▼

```
INJECTION 12. Iteration 11 accepted. Two items, both generalisations of your own
findings. Then the queue, unchanged, and no further structural injections before G10.

Your CP-4 miss is worth keeping: you checked whether the rule permits two devices and
not whether your own flow produces them. Rules describe intent; flows produce reality.
When checking whether a condition can occur, enumerate what the system DOES, not what
it ALLOWS.

═══════════════════════════════════════════════════════════════════════════════
A · NEW STANDING RULE — §5.11 THE REJECTION CORPUS
═══════════════════════════════════════════════════════════════════════════════

Your own diagnosis generalises further than the fix you applied. vectors.json describes
VALID days. A float amount is valid JSON. So is a negative one, a party that does not
exist, a correction pointing at an open day, and an amount of fifteen digits. The suite
has no corpus of inputs that must be REFUSED — assertPaise is the one you probed, not
the only one undefended.

  §5.11.1  Create rejects.json beside vectors.json. Each entry: the input, the rule it
           violates, the expected rejection, and where the rejection must happen —
           engine, API, database constraint, or more than one. A rejection that only
           the API performs is absent in the app; one only the app performs is absent
           on sync.
  §5.11.2  Every rejection is tested at EVERY layer that claims to enforce it, and the
           layers are listed explicitly. Constraint 3 taught this lesson already: you
           moved closed-day rejection into a database trigger because the API alone was
           not enough.
  §5.11.3  Minimum coverage. Build it out from here, and add each case because it can
           actually occur, not to lengthen the file:
             MONEY      float, NaN, Infinity, numeric string, null, undefined,
                        negative where forbidden, zero where meaningless, an amount
                        past any sane bound for a kirana shop
             IDENTITY   malformed UUID, a duplicate id with different content, a
                        party_id that does not exist, a shop_id the session does not own
             ENUM       a section outside the nine, a mode invalid for its section, a
                        day state that cannot follow the current one
             TIME       a day_id in the future, a due_date before its entry, an entry
                        whose day_id names a closed day (now covered — keep it here),
                        corrects_day_id pointing at an open day or at its own day
             TEXT       a label or party name at and past the field limit, an empty
                        one, one that is only whitespace, one carrying control
                        characters or bidi overrides
             STRUCTURE  a missing required field, an unexpected extra field, a payload
                        past any size bound
  §5.11.4  Run §5.9 over the rejection corpus too: disable each guard in turn and report
           the detection rate. A guard nothing catches when removed is a guard that has
           never run — which is exactly what assertPaise turned out to be.
  §5.11.5  Every rejection must be actionable to a shopkeeper where he can see it. A
           refused entry that tells him nothing is a lost sale record, and per the
           priority ordering that outranks the tidiness of the error path.

═══════════════════════════════════════════════════════════════════════════════
B · A REAL PROBE FOR no-totals-are-stored
═══════════════════════════════════════════════════════════════════════════════

Your call is right: adding an unused column violates nothing, so 1/64 measured your
probe rather than the system. The invariant is about READING, so mutate what is read.

  Probe: take any cache or materialised view the system holds, POISON it — write a
  value that is deliberately, visibly wrong — and then assert that every figure the
  engine produces is UNCHANGED. Anything that moves is reading a stored total.
  Then drop the cache entirely and assert the same figures again, byte-identical.

Poison-then-drop is the pair. Poisoning finds the reader; dropping proves the rebuild.
If the system currently holds no cache at all, record that as the reason the probe is
trivial today, and wire it into CI anyway so it has teeth the day a cache appears —
which it will, the first time a Reports screen misses B20.

═══════════════════════════════════════════════════════════════════════════════
C · QUEUE — UNCHANGED
═══════════════════════════════════════════════════════════════════════════════

C.2 bundled Odia font, the remaining RN traps, persistent rate limits, the DC-003
compensating control, the OTP service, G7 and G8. Then the two fixtures, then G10
starting with the four form archetypes.

Build rejects.json alongside the OTP and sync work, where the hostile inputs are in
front of you, rather than as a separate pass.
```

# ▲ PASTE EVERYTHING ABOVE THIS LINE ▲

---

## Why this is the last structural injection

Everything after this is execution against rules already written. The remaining backend is a known list, the screen phase has its contract, and the benchmark table has been frozen since iteration 6. From here what I'd send is a reaction to a report, not a new discipline — and the next thing genuinely worth your attention is a contact sheet, not a prompt.
