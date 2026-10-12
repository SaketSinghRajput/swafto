## What this changes, and why

<!-- One paragraph. What was wrong or missing, and what the change does about
     it. If it fixes a defect, say what the defect would have cost. -->

## Verification

<!-- Tick what you actually ran. An unticked box is a fact, not a failure. -->

- [ ] `npm run check:all` passes (25 checks)
- [ ] `npx vitest run` passes
- [ ] New logic has a test that **fails without the change** - I made it fail first
- [ ] If I changed a check: `npm run prove:verifiers` still passes
- [ ] If I changed money handling: `npm run check:money` passes and the
      arithmetic goes through the audited helpers

## Things this repository will reject, so check before pushing

- [ ] I did not tick a checkbox in `TASKS.md` by hand
- [ ] I did not edit a generated document - I edited its generator in `tools/`
- [ ] I did not move a benchmark threshold

<!-- If you DID need to move a threshold, do not tick the box above. Say so
     here and explain why. A missed benchmark reported honestly is a result;
     one met by moving the line is a lie, and this project treats the two very
     differently. -->

## Anything you are unsure about

<!-- Genuinely useful. "I think this is right but I could not test X" is worth
     more to a reviewer than silence. -->
