/**
 * §5.12 - THE VERIFIER INVENTORY.
 *
 * §5.1 has always been applied to checks and never to the harness that runs them.
 * BENCHMARKS.md has been SHA-locked since iteration 6: the lock protected the
 * THRESHOLDS and left the INSTRUMENTS unexamined, so a benchmark could be green
 * because nothing measured it.
 *
 * Three instances, escalating:
 *   1. `maybe()` - the test ran; its assertions did not.
 *   2. `assertPaise` at 0/59 - the guard existed; it had never executed.
 *   3. typecheck, lint and the money rule - cited as evidence for seventeen
 *      iterations and THEY DID NOT EXIST.
 *
 * This file is the inventory and the check. Every command cited anywhere as
 * evidence, what it claims, the file that implements it, and the defect that must
 * make it fail.
 *
 *   node tools/check-verifiers.mjs              validate the inventory
 *   node tools/check-verifiers.mjs --prove      plant each defect, require a failure
 *   node tools/check-verifiers.mjs --update-md  regenerate VERIFIERS.md
 *
 * §5.12.2: "A command that exits 0 because it resolved to nothing is the failure
 * mode; assert on the work done, not on the exit code." Every verifier below that
 * scans a corpus prints how many items it scanned, and those that can be handed an
 * empty corpus refuse to pass.
 */
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const read = (f) => readFileSync(f, 'utf8').split('\r\n').join('\n');

/**
 * THE INVENTORY.
 *
 * `defect` is a real, plantable mutation - the same shape detection-rate.mjs uses.
 * `defect: null` means the verifier cannot be proven by planting, and `provenBy`
 * says how it was proven instead.
 */
export const VERIFIERS = [
  {
    id: 'governance',
    command: 'npm run check:governance',
    file: 'tools/check-governance.mjs',
    claims:
      'No forbidden status token; every AD carries a reversal trigger; no stubs in shipped paths; one money-formatting path; verbatim injections unedited.',
    benchmarks: ['B40'],
    defect: {
      file: 'docs/governance/REVIEW.md',
      find: '# REVIEW',
      // Assembled, not spelled. Writing the token out would trip the very check
      // this plants it against - the same knot check-governance and check-tooling
      // already untie the same way.
      replace: `# REVIEW\n\nPlanted status: ${['BLOCKED', 'ON', 'HUMAN'].join('-')}\n`,
    },
  },
  {
    id: 'benchmarks-lock',
    command: 'npm run check:benchmarks',
    file: 'tools/check-benchmarks-lock.mjs',
    claims: 'BENCHMARKS.md matches its committed SHA-256, so no threshold has been edited.',
    benchmarks: [],
    defect: {
      file: 'docs/benchmarks/BENCHMARKS.md',
      find: '| B1 | Golden vectors | >= 70 vectors, 100% pass |',
      replace: '| B1 | Golden vectors | >= 60 vectors, 100% pass |',
    },
  },
  {
    id: 'prose',
    command: 'npm run check:prose',
    file: 'tools/check-prose.mjs',
    claims:
      'No sentence asserts both a resolved and an unresolved status; no dangling AD/B/G/H id.',
    benchmarks: [],
    defect: {
      file: 'docs/governance/REVIEW.md',
      find: '# REVIEW',
      replace: '# REVIEW\n\nR-999 is CLOSED and still needs counsel.\n',
    },
  },
  {
    id: 'sms',
    command: 'npm run check:sms',
    file: 'tools/check-sms-templates.mjs',
    claims:
      'SMS-TEMPLATES.md and the code registry agree; every sent templateId is registered; every duration stated in copy matches OTP_TTL_SECONDS.',
    benchmarks: [],
    // Plants at the REGISTRY now, because that is where the value lives. The old
    // plant edited limits.ts, which today merely re-exports it.
    defect: {
      file: 'packages/values/src/index.ts',
      find: 'export const OTP_TTL_SECONDS = 600;',
      replace: 'export const OTP_TTL_SECONDS = 300;',
    },
  },
  {
    id: 'sms-segments',
    command: 'npm run check:sms:segments',
    file: 'tools/check-sms-segments.mjs',
    claims: 'Every template fits ONE SMS segment under its real encoding (DC-001).',
    benchmarks: [],
    defect: {
      file: 'apps/api/src/sms/templates.ts',
      find: 'SWAFTO ପୁରୁଣା ନମ୍ବର ଯାଞ୍ଚ କୋଡ୍।',
      replace:
        'SWAFTO ପୁରୁଣା ନମ୍ବର ଯାଞ୍ଚ କୋଡ୍। ଏହା ଏକ ଅତିରିକ୍ତ ଦୀର୍ଘ ବାକ୍ୟ ଯାହା ଦୁଇଟି ଖଣ୍ଡ ଆବଶ୍ୟକ କରିବ ନିଶ୍ଚିତ ଭାବରେ।',
    },
  },
  {
    id: 'tooling',
    command: 'npm run check:tooling',
    file: 'tools/check-tooling.mjs',
    claims:
      'No cross-language source surgery; no known platform traps; no npm script naming a file that does not exist.',
    benchmarks: [],
    defect: {
      file: 'package.json',
      find: '"check:tooling": "node tools/check-tooling.mjs"',
      replace:
        '"check:ghost": "node tools/does-not-exist.mjs",\n    "check:tooling": "node tools/check-tooling.mjs"',
    },
  },
  {
    id: 'generated',
    command: 'npm run check:generated',
    file: 'tools/check-generated.mjs',
    claims: 'Every generated artifact still matches what its authoring script produces.',
    benchmarks: [],
    defect: {
      file: 'packages/formula-engine/vectors.json',
      find: '"vectors"',
      replace: '"__handEdited": true,\n  "vectors"',
    },
  },
  {
    id: 'font',
    command: 'npm run check:font',
    file: 'tools/check-font-coverage.mjs',
    claims:
      'Every character in every Odia string has a NON-ZERO glyph in all three bundled weights; ory2 GSUB present; digits reachable as tabular; files match their hashes.',
    benchmarks: ['B24'],
    defect: {
      file: 'apps/api/src/sms/templates.ts',
      find: 'SWAFTO ପୁରୁଣା',
      replace: 'SWAFTO क ପୁରୁଣା',
    },
  },
  {
    id: 'money-lint',
    command: 'npm run check:money',
    file: 'tools/check-money-lint.mjs',
    claims:
      'ADR-003 all four clauses: no money arithmetic outside the audited helpers, no float coercion of money, no decimal literals in the engine, formatting only at the render boundary.',
    benchmarks: ['B12'],
    // §5.12.5 names this plant: a float-arithmetic violation. That is clause 1 -
    // arithmetic on a money identifier outside the audited helpers - rather than the
    // easier clause-3 decimal literal, because clause 1 is what constraint 6 is
    // actually about.
    defect: {
      file: 'packages/formula-engine/src/operational.ts',
      find: 'const totalOf = (entries: readonly Entry[]): Paise => sum(entries.map((e) => e.amount));',
      replace:
        'const totalOf = (entries: readonly Entry[]): Paise =>\n  sum(entries.map((e) => e.amount * 1.0));',
    },
  },
  {
    id: 'typecheck',
    command: 'npm run typecheck',
    file: 'tsconfig.json',
    claims: 'Every .ts file under packages, apps and tools typechecks under strict mode.',
    benchmarks: [],
    defect: {
      file: 'packages/formula-engine/src/money.ts',
      find: 'export function assertPaise',
      replace: 'const planted: number = "not a number";\nexport function assertPaise',
    },
  },
  {
    id: 'vectors-node',
    command: 'npm run test:vectors:node',
    file: 'tools/run-vectors.mjs',
    claims: 'Every golden vector produces its expected values under Node.',
    benchmarks: ['B1'],
    defect: {
      file: 'packages/formula-engine/src/primary.ts',
      find: 'const totalOf = (entries: readonly Entry[]): Paise => sum(entries.map((e) => e.amount));',
      replace:
        'const totalOf = (entries: readonly Entry[]): Paise =>\n  sum(entries.map((e) => e.amount).concat([1]));',
    },
  },
  {
    id: 'vectors-divergence',
    command: 'npm run test:vectors:diff',
    file: 'tools/diff-vectors.mjs',
    claims: 'Node and Hermes agree on every value of every vector (B2).',
    defect: null,
    benchmarks: ['B2'],
    provenBy:
      'G5, by injecting a runtime-specific divergence. A source edit cannot fake it: the mutation has to behave DIFFERENTLY on each engine, so it is not plantable from one file.',
  },
  {
    id: 'unit',
    command: 'npx vitest run',
    file: 'packages/formula-engine/test/vectors.spec.ts',
    claims:
      'All specs pass, including the 63 golden vectors, now executed INSIDE the runner so coverage can see them.',
    benchmarks: ['B10', 'B11', 'B37'],
    defect: {
      file: 'packages/schema/src/spec.ts',
      find: 'BEFORE UPDATE ON entries',
      replace: 'BEFORE UPDATE OF amount ON entries',
    },
  },
  {
    id: 'mutation',
    command: 'npm run mutation',
    file: 'stryker.config.json',
    claims:
      'Mutation score for the formula engine (B4) and the backend (B6) - how many deliberately broken variants of the code the suite actually kills.',
    benchmarks: ['B4', 'B6'],
    defect: null,
    provenBy:
      'NOTHING. This entry is retained to record that it is NOT a working instrument. It reported all twelve arithmetic mutants in money.ts as Survived; eleven are killed by tests that predate this iteration and the twelfth by tests written because of it. Two independent checks: its dry run loads 275 of the 309 tests (re-derived clean at iteration 25; the figure first recorded, 170 of 303, is not reproducible), and the 34 it misses are NOT the cause, because the tests it does load already contain the killing ones; and with coverageAnalysis set to "all" it prints "Ran all tests for this mutant" and then reports 8.96 tests per mutant on average. A harness that selects a handful of tests while claiming to run them all cannot measure B4 or B6, and its 9.66% is a statement about itself.',
  },
  {
    id: 'crossdoc',
    command: 'npm run check:crossdoc',
    file: 'tools/check-crossdoc.mjs',
    claims:
      'PLAN.md, TASKS.md and DESIGN.md describe the same repository. The shared facts are re-derived independently and every document must report them; a disagreement is a generator bug, never a judgement call.',
    benchmarks: [],
    /*
     * The plant breaks a GENERATOR, not a document - which is the whole point. It
     * makes gen-plan count every named function as present, so PLAN.md renders a
     * number DESIGN and the source disagree with.
     *
     * It found a real one on its first run: PLAN said "18 of 27" where 27 was the
     * feature count and BI5 names no function, so the honest denominator is 26. Two
     * lenses counting different things, each internally consistent.
     */
    defect: {
      file: 'tools/gen-plan.mjs',
      find: 'const built = named.filter((f) => f.fnOk).length;',
      replace: 'const built = named.length;',
    },
  },
  {
    id: 'screens',
    command: 'npx vitest run apps/mobile',
    file: 'apps/mobile/test/screens.spec.tsx',
    claims:
      'Across EVERY case in the screen registry, in three languages plus the longest-string pseudo-locale and in both display modes: no text colour fails the contrast minimum (B26), nothing draws white on the accent (B27), every interactive element asks for the registry touch target (B28), no text is under the registry floor (B29), no string is missing or untranslated in any language and no raw key reaches the screen (B30), and every digit rendered anywhere is Latin (B32). A screen joins these assertions by being in the registry, not by anybody remembering it.',
    benchmarks: ['B26', 'B27', 'B28', 'B29', 'B30', 'B32'],
    /*
     * The plant is the defect this suite was written after finding: white on the
     * marigold accent in Focus mode, which measures 3.85:1 against a 4.5 minimum.
     * It is the right plant precisely because it SHIPPED - the comment above the
     * palette asserted the pair was not expressible while the palette expressed it.
     */
    defect: {
      file: 'apps/mobile/src/theme/tokens.ts',
      find: "    onAccent: '#000000',",
      replace: "    onAccent: '#FFFFFF',",
    },
  },
  {
    id: 'layout',
    command: 'npm run check:layout',
    file: 'tools/check-layout.mjs',
    claims:
      'Every registry case, laid out by a real engine in headless Chromium at a budget-handset viewport with the shipped fonts, at three font scales: nothing runs wider than the screen, no element escapes the element containing it, and no fixed chrome sits below the fold at or under the chrome font-scale cap. Money is scaled without limit and chrome stops at the cap, which is what the device does.',
    benchmarks: ['B31'],
    /*
     * The plant removes the wrap from the draft row, where the amount being typed
     * sits beside its label. Money is deliberately uncapped - it grows with the
     * reader's system font setting without limit - so without the wrap the figure
     * runs off the side of the screen at a large scale, which is exactly the defect
     * this tool found on its first run.
     *
     * AN EARLIER PLANT HERE STOPPED WORKING AND SAID SO. It removed `minHeight: 0`
     * from the list, which had put the keypad below the fold. Stepping the keypad
     * label down one size gave the layout enough room that the same plant no longer
     * overflowed anything, so the plant passed and the prove step failed - which is
     * the prove step doing its job. A plant that stops planting is a finding.
     */
    defect: {
      file: 'apps/mobile/src/screens/T7.tsx',
      find:
        "        testID=\"t7-draft\"\n        style={{\n          flexDirection: 'row',\n" +
        "          alignItems: 'center',\n          justifyContent: 'space-between',\n" +
        '          // Money is uncapped by design, so at a large system font scale the label and the\n' +
        '          // figure wrap onto two lines rather than running off the side of the screen.\n' +
        "          flexWrap: 'wrap',",
      replace:
        "        testID=\"t7-draft\"\n        style={{\n          flexDirection: 'row',\n" +
        "          alignItems: 'center',\n          justifyContent: 'space-between',",
    },
  },
  {
    id: 'client-logs',
    command: 'npm run check:client-logs',
    file: 'tools/check-client-logs.mjs',
    claims:
      'No client source file can write to logcat at all, so no amount, customer name or phone number can reach it. Stricter than B36 asks and for a reason: a rule permitting some logging requires a per-line judgement about whether THIS interpolation carries personal data, and that judgement is wrong once eventually.',
    benchmarks: ['B36'],
    defect: {
      file: 'apps/mobile/src/store/index.ts',
      find: '  get revision(): number {',
      replace: '  get revision(): number {\n    console.log(this.#state.entries);',
    },
  },
  {
    id: 'design',
    command: 'npm run check:design',
    file: 'tools/gen-design.mjs',
    claims:
      'No screen or component contains a raw colour, size or spacing value where a token belongs; no screen shows a keypad beside a bottom navigation; STATIC and MEASURED never disagree about the same property; and DESIGN.md matches a fresh read of the code.',
    benchmarks: [],
    /*
     * Not plantable by find-and-replace: the defect has to be a hardcoded value in a
     * SCREEN, and there are no screens yet. --prove provisions one instead, which is
     * the same shape as check-shadow-copies.
     */
    defect: null,
    provenBy:
      'npm run design:prove writes a screen containing one hardcoded colour, requires the RAW VALUES table to grow by exactly one row, removes it, and requires the row to disappear - which is F.3 exactly. Verified end-to-end at iteration 30 as well: a real screen file with a hardcoded colour made check:design exit 1 naming the file and line, and removing it returned the check to green.',
  },
  {
    id: 'tasks',
    command: 'npm run check:tasks',
    file: 'tools/gen-tasks.mjs',
    claims:
      'TASKS.md matches a fresh generation, so every checkbox is derived from a predicate rather than ticked by hand. Also: no cycle in the dependency graph, no task without a predicate that is not marked JUDGEMENT, no duplicate or reused id, and no human task appearing as a blocker.',
    benchmarks: [],
    /*
     * The plant is a DUPLICATE ID, which is A.2's failure: ids are permanent and
     * never reused, and a reused one silently merges two tasks' state. All five
     * failure modes were negative-tested at iteration 29; this is the one a
     * plant can express as a single find-and-replace.
     */
    defect: {
      file: 'tools/tasks.data.mjs',
      find: "    id: 'P-004',",
      replace: "    id: 'P-001',",
    },
  },
  {
    id: 'plan',
    command: 'npm run check:plan',
    file: 'tools/gen-plan.mjs',
    claims:
      'PLAN.md is not stale: every artifact it summarises has exactly the content it had when the document was generated. It also enforces A.4 - no number written into the plan prose - and refuses to generate if the build-map parse degrades below the full screen set.',
    benchmarks: [],
    /*
     * The plant is a SOURCE EDIT, not an edit to the plan. That is the whole point of
     * the check: PLAN.md summarises artifacts it does not own, so the failure it must
     * detect is one of them moving underneath it.
     */
    defect: {
      file: 'docs/handover/DEFERRED.md',
      find: '# DEFERRED',
      replace: '# DEFERRED\n\nPlanted: a source changed and the plan did not.\n',
    },
  },
  {
    id: 'shadow-copies',
    command: 'npm run check:shadow',
    file: 'tools/check-shadow-copies.mjs',
    claims:
      'No untracked directory in this repository contains a package.json, a spec file or a vitest config - nothing a test runner or package manager could discover and act on as if it were the real tree.',
    benchmarks: [],
    defect: null,
    provenBy:
      'npm run check:shadow:prove plants a directory holding a package.json and a spec file, requires the scan to find it, and removes it. Separately verified against the real shape: recreating .stryker-tmp/ with those two files fails the check even though .stryker-tmp is now in .gitignore, which is the design claim - vitest does not read .gitignore, so ignored and untracked are the same thing to it.',
  },
  {
    id: 'money-mutants',
    command: 'npm run mutation:money',
    file: 'tools/check-money-mutants.mjs',
    claims:
      'ZERO unexplained survivors among the twelve arithmetic mutants of the audited money helpers - stricter than B4 and additional to it (injection 18 A.2). Each mutant is planted for real, judged against the suite, and either killed or carrying a written equivalence argument. It does NOT produce a score and is not an instrument for B4 or B6.',
    benchmarks: [],
    defect: null,
    provenBy:
      'npm run mutation:money:prove plants a NO-OP mutation - text replaced by itself - which cannot change behaviour and therefore cannot be killed. The check must report it as a survivor and exit non-zero, and does. This is not decoration: the first version of this tool reported twelve kills from twelve vitest runs that never executed, because execFileSync cannot spawn a .cmd without a shell and failed with empty output. A second version credited kills to Postgres suites failing for want of a database. A no-op plant catches both; a smoke test catches neither.',
  },
  {
    id: 'registry',
    command: 'npm run check:registry',
    file: 'tools/check-registry.mjs',
    claims:
      'Every value that lives in more than one place has ONE home in @swafto/values. No document states a number that disagrees with it, no code keeps its own literal, and every externally-sourced value carries its authority and date.',
    benchmarks: [],
    defect: {
      file: 'docs/handover/DEVICE-CHECKLIST.md',
      find: '## B · Legibility',
      replace: 'Touch targets are at least 48dp.\n\n## B · Legibility',
    },
  },
  {
    id: 'findings',
    command: 'npm run check:findings',
    file: 'tools/check-findings.mjs',
    claims:
      '§5.14 - every adversary finding’s status is DERIVED from a predicate against the repository, never asserted. A finding that does not verify as fixed and carries no explanation fails the build.',
    benchmarks: [],
    defect: {
      file: 'docs/spec/TECH-DECISIONS.md',
      find: 'SUPERSEDED by BENCHMARKS.md',
      replace: 'superseded-ish by BENCHMARKS.md',
    },
  },
  {
    id: 'secrets',
    command: 'npm run check:secrets',
    file: 'tools/check-secrets.mjs',
    claims:
      'No AWS key, private key block, provider token, JWT, remote database password or hard-coded credential anywhere in the repository (B35, repo half).',
    benchmarks: ['B35'],
    defect: {
      file: 'docs/governance/REVIEW.md',
      find: '# REVIEW',
      // Assembled, like the forbidden-status plant above: spelling a real AWS key
      // prefix here would make this file trip the very scanner it is planting for.
      replace: `# REVIEW\n\nPlanted: ${'AKIA'}IOSFODNN7EXAMPLE\n`,
    },
  },
  {
    id: 'traceability',
    command: 'npm run check:traceability',
    file: 'tools/check-traceability.mjs',
    claims:
      'Every feature ID has a row with no empty cell (B13); every engine function and vector NAMED in the matrix actually exists; no row is DONE while any artifact it names is absent (B39).',
    benchmarks: ['B13', 'B39'],
    defect: {
      file: 'docs/spec/TRACEABILITY.md',
      find: '| BI6 | `creditConcentrationTrend` (gate 14)',
      replace: '| BI6 | `creditConcentrationTrendXX` (gate 14)',
    },
  },
  {
    id: 'coverage',
    command: 'npm run coverage',
    file: 'package.json',
    claims:
      'Measures statement, branch and function coverage for the formula engine (B3) AND the backend (B5).',
    defect: null,
    benchmarks: ['B3', 'B5'],
    provenBy:
      'Proven by CORRECTING it. The first run reported 57.73% branch while the 63 vectors ran in a separate process the instrument could not see; putting them under the runner moved the same unchanged engine to 85.71%. An instrument whose reading moves 28 points when you fix the instrument has demonstrated that it measures something.',
  },
  {
    id: 'audit',
    command: 'npm audit --audit-level=high',
    file: 'package-lock.json',
    claims: 'No high or critical advisory in the dependency tree (B33).',
    defect: null,
    benchmarks: ['B33'],
    provenBy: 'External fact; not plantable without installing a known-vulnerable package.',
  },
  {
    id: 'detection-rate',
    command: 'node tools/detection-rate.mjs',
    file: 'tools/detection-rate.mjs',
    claims:
      '§5.9 - for each critical invariant, what FRACTION of the suite notices when it is violated.',
    defect: null,
    benchmarks: [],
    provenBy: 'It is itself a defect-planting harness, and it verifies its own restore each run.',
  },
];

/**
 * BENCHMARK COVERAGE. Every B-id maps to the verifier that measures it, or to an
 * explicit null. The point of the null case is that it is WRITTEN DOWN: a benchmark
 * with no instrument cannot be claimed met.
 */
/**
 * §5.13 · THE PARTITION. Every benchmark is in exactly one of three states:
 *
 *   instrumented   - a verifier measures it TODAY.
 *   measurable-now - ITS SUBJECT ALREADY EXISTS and nothing measures it. This is the
 *                    actionable set, and §5.13 says the instrument is built in the
 *                    iteration the subject first exists - which for these has already
 *                    passed. They are overdue, not pending.
 *   blocked        - the subject does not exist yet. `blockedOn` names the artifact
 *                    whose existence unblocks it, and `gate` is where that lands.
 *
 * The distinction between the last two is the whole point of A.1. "30 have no
 * instrument" reads like one backlog; it is really a small overdue set and a large
 * genuinely-future set, and only the first is a present failure.
 */
export const BENCHMARKS = {
  B1: { verifier: 'vectors-node' },
  B2: { verifier: 'vectors-divergence' },
  B3: { verifier: 'coverage' },
  /*
   * B4 AND B6 ARE NOT INSTRUMENTED, correcting an earlier claim that they were.
   *
   * "The instrument exists and runs" was the wrong test. Stryker exists and runs and
   * reports a number; the number is about Stryker. It called all twelve money mutants
   * Survived when the suite kills eleven of them outright. §5.13 asks for an
   * instrument, and a thing that produces a confident wrong reading is not one.
   *
   * They are recorded as measurable-now rather than blocked, because nothing is
   * missing but a working harness - the subject has existed since G2.
   */
  B4: {
    state: 'measurable-now',
    why: 'NOT INSTRUMENTED. Stryker reports a number that is false: it called all twelve money-helper arithmetic mutants Survived, and mutation:money proves every one of them dies. No B4 figure may be claimed from it. mutation:money is NOT a substitute - it adjudicates twelve named mutants on one file and produces no score.',
  },
  B5: {
    verifier: 'coverage',
    partial:
      'The backend is small and growing, so 91.26% today is over a small denominator. The instrument exists and moves with the subject, which is what §5.13 asks.',
  },
  B6: {
    state: 'measurable-now',
    why: 'NOT INSTRUMENTED. Same harness as B4 and the same disproof. The backend has no equivalent of mutation:money, so the money helpers are the only surface in this build with a trustworthy mutation verdict.',
  },
  B7: { state: 'blocked', blockedOn: 'any React Native app code', gate: 'G10' },
  B8: { state: 'blocked', blockedOn: 'the sync API', gate: 'G7' },
  B9: { state: 'blocked', blockedOn: 'the app, to run 30 days against', gate: 'G17' },
  B10: { verifier: 'unit' },
  B11: { verifier: 'unit' },
  B12: { verifier: 'money-lint' },
  B13: { verifier: 'traceability' },
  B14: { state: 'blocked', blockedOn: 'a built app to cold-start', gate: 'G18' },
  B15: { state: 'blocked', blockedOn: 'a built app to cold-start', gate: 'G18' },
  B16: { state: 'blocked', blockedOn: 'the Today screen', gate: 'G18' },
  B17: { state: 'blocked', blockedOn: 'the keypad', gate: 'G18' },
  B18: { state: 'blocked', blockedOn: 'the entry forms', gate: 'G18' },
  B19: { state: 'blocked', blockedOn: 'the day-close screen', gate: 'G18' },
  B20: { state: 'blocked', blockedOn: 'the reports screen', gate: 'G18' },
  B21: { state: 'blocked', blockedOn: 'a device database with 10,000 entries', gate: 'G18' },
  B22: { state: 'blocked', blockedOn: 'a built app to profile', gate: 'G18' },
  B23: { state: 'blocked', blockedOn: 'the Today screen', gate: 'G18' },
  B24: {
    verifier: 'font',
    partial: 'The FONT share of the budget is measured (1.87%). The APK itself does not exist, so the benchmark as a whole is not met - only bounded from below.',
  },
  B25: { state: 'blocked', blockedOn: 'the outbox and a 2G network profile', gate: 'G17' },
  B26: { verifier: 'screens' },
  B27: { verifier: 'screens' },
  B28: { verifier: 'screens' },
  B29: { verifier: 'screens' },
  B30: { verifier: 'screens' },
  B31: {
    verifier: 'layout',
    partial:
      'Measured by a real layout engine in Chromium, not on Android. The two shape text identically, which is why the reading is worth having, but pixel spacing and the system font-scale machinery belong to the device. B14-B19 on a handset stay blocked.',
  },
  B32: { verifier: 'screens' },
  B33: { verifier: 'audit' },
  B34: { state: 'blocked', blockedOn: 'a container image', gate: 'G9' },
  B35: {
    verifier: 'secrets',
    partial:
      'The REPO half is measured and clean over 102 files. The APK half is blocked on a build (G9), and gitleaks joins this scanner there rather than replacing it.',
  },
  B36: {
    verifier: 'client-logs',
    partial:
      'The benchmark asks for zero amounts, names or phones "proven by grepping a full day close". No client log line exists to grep, so this is proven the other way: no client source file can write to logcat at all. A stronger result than a clean grep, and not the same one - when a real logger arrives this instrument is REPLACED by one that reads its output, not exempted.',
  },
  B37: { verifier: 'unit' },
  B38: {
    state: 'blocked',
    blockedOn: 'the screens themselves',
    gate: 'G15',
    outcome: 'MISSED - SCOPE',
    outcomeWhy:
      'Requires 27 of 27. The ceiling of 40 funds about 11 committed and 16 at best (PROJECTION.md), so this cannot be met. A DECISION, not a failure - the deferred set is in DEFERRED.md and the threshold is untouched.',
  },
  B39: {
    verifier: 'traceability',
    outcome: 'MISSED - SCOPE',
    partial:
      'Measured: 0 of 26, and the instrument reports WHICH column holds each row. The api column is blocked by the deferred server (AD-018) and the screen column by the deferred screens, so this cannot be met inside the ceiling. A DECISION, not a failure.',
  },
  B40: { verifier: 'governance' },
};

/** Back-compat shape for the rest of this file: id -> verifier id or null. */
export const BENCHMARK_VERIFIERS = Object.fromEntries(
  Object.entries(BENCHMARKS).map(([b, v]) => [b, v.verifier ?? null]),
);

/* ------------------------------------------------------------------ */
const failures = [];
const notes = [];

const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts ?? {};

if (VERIFIERS.length === 0) {
  console.error('x    the inventory is empty. A verifier check over zero verifiers');
  console.error('     passes forever - the exact failure mode §5.12 exists to stop.');
  process.exit(1);
}

/* 1 · every verifier must EXIST */
for (const v of VERIFIERS) {
  if (!existsSync(v.file)) {
    failures.push(`${v.id}: implementing file ${v.file} does not exist`);
  }
  const m = /^npm run ([\w:-]+)$/.exec(v.command);
  if (m && scripts[m[1]] === undefined) {
    failures.push(`${v.id}: npm script "${m[1]}" is not defined in package.json`);
  }
  if (!v.claims || v.claims.length < 20) {
    failures.push(`${v.id}: no usable claim recorded - what does this command prove?`);
  }
  if (!v.defect && !v.provenBy) {
    failures.push(
      `${v.id}: neither a plantable defect nor a recorded reason it cannot be planted. ` +
        'A verifier nobody has seen fail is a verifier nobody has tested.',
    );
  }
}


/**
 * RUN A VERIFIER'S COMMAND WITHOUT GOING NEAR A .cmd SHIM.
 *
 * THIS FIXES A HARNESS DEFECT THAT MADE EVERY PLANT A PHANTOM PASS. --prove used to
 * spawn `npm.cmd` / `npx.cmd` through execFileSync. Since the fix for
 * CVE-2024-27980, Node refuses to execFile a .cmd at all and throws EINVAL before
 * anything runs - measured on this machine, both shims, zero bytes of output. The
 * prove harness caught that throw and read it as "the verifier failed, as it
 * should", so every npm-based verifier reported a successful plant WITHOUT THE
 * PLANT EVER BEING TESTED. The same trap produced twelve phantom mutant kills in
 * check-money-mutants at iteration 24; this is the same bug in a second place.
 *
 * `shell: true` would work and is banned by check-tooling, correctly. So the
 * command is RESOLVED to a JavaScript entry point and run with this same Node:
 * `npm run X` becomes the script X actually is, and `npx pkg` becomes the file
 * pkg's own package.json nominates as its bin.
 */
const requireHere = createRequire(import.meta.url);

/**
 * A BIN NAME IS NOT A PACKAGE NAME. `tsc` lives in `typescript`, and resolving
 * "tsc/package.json" throws MODULE_NOT_FOUND - which the old harness would have
 * read as the verifier failing. So when the direct resolution misses, the declared
 * dependencies are asked which one owns that bin.
 */
function resolveBin(name, args) {
  let pkgPath = null;
  try {
    pkgPath = requireHere.resolve(name + '/package.json');
  } catch {
    const root = JSON.parse(readFileSync('package.json', 'utf8'));
    const deps = Object.keys({ ...root.dependencies, ...root.devDependencies });
    for (const dep of deps) {
      let candidate;
      try {
        candidate = requireHere.resolve(dep + '/package.json');
      } catch {
        continue;
      }
      const bin = JSON.parse(readFileSync(candidate, 'utf8')).bin;
      if (bin && typeof bin === 'object' && bin[name]) {
        return { exe: process.execPath, args: [join(dirname(candidate), bin[name]), ...args] };
      }
    }
    throw new Error('no installed package declares a bin named ' + name);
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : (pkg.bin ?? {})[name];
  if (!bin) throw new Error(name + ' declares no bin, so it cannot be run directly');
  return { exe: process.execPath, args: [join(dirname(pkgPath), bin), ...args] };
}

function resolveCommand(command) {
  const parts = command.trim().split(/\s+/);
  if (parts.includes('&&')) {
    throw new Error('a verifier command must be one command, not a chain: ' + command);
  }
  if (parts[0] === 'npm' && parts[1] === 'run') {
    const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts ?? {};
    const script = scripts[parts[2]];
    if (!script) throw new Error('no npm script named ' + parts[2]);
    return resolveCommand([script, ...parts.slice(3)].join(' '));
  }
  if (parts[0] === 'node') return { exe: process.execPath, args: parts.slice(1) };
  if (parts[0] === 'npx') return resolveBin(parts[1], parts.slice(2));
  if (parts[0] === 'npm') {
    // `npm audit` and friends have no JS entry we can resolve from here. Rather
    // than spawn a shim that throws and be read as a pass, say so out loud.
    throw new Error('cannot run "' + command + '" without the npm shim, so it cannot be proven here');
  }
  return resolveBin(parts[0], parts.slice(1));
}
/**
 * §5.16 · AN INSTRUMENT MUST RESPOND, NOT ONLY FAIL.
 *
 *   §5.1  asks: CAN this check fail?                        (binary)
 *   §5.9  asks: HOW MANY tests catch a break?               (a ratio)
 *   §5.16 asks: does the number MOVE when the world provably moves?
 *
 * Stryker passes §5.1 and fails §5.16. It can report a kill; it simply did not notice
 * four new tests that demonstrably kill one of its own reported survivors, and its
 * survivor set came back unchanged mutant for mutant. That argument needs no test
 * count, no coverage figure and no baseline - which is what makes it a better test
 * than anything else in this file.
 *
 * SCOPE: every verifier that carries a benchmark reading. A verifier with no number
 * has nothing to move, and §5.1 already covers it.
 *
 * `plantIsResponse` is a real exemption, not a dodge, and it applies only where the
 * threshold is ZERO. For "0 violations", §5.12's planted defect moves the count from
 * 0 to 1 in a known direction and the check fails - that IS the response test,
 * performed already by --prove. Where a threshold is a proportion or a count above
 * zero, failing and tracking are different properties and both must be shown.
 */
const RESPONSES = {
  screens: {
    plantIsResponse:
      'B26-B32 are all "0 violations". The plant restores white on the marigold accent in Focus mode and three assertions move from 0 to 1 - the contrast pair, the no-white-token rule, and the per-case contrast sweep.',
  },
  layout: {
    /*
     * This one has a better argument than its plant, and it is worth recording
     * because it is the argument §5.16 actually asks for: the number tracked the
     * world while the world changed underneath it.
     *
     * First run: 18 overflows. Letting the list shrink and the money rows wrap
     * took it to 7. Stepping the keypad label down one size took it to 1. Teaching
     * the tool that React Native caps chrome - which removed a reading that could
     * not happen on a device - took it to 0. Four changes in four directions, and
     * the count moved for each one, by the amount the change warranted.
     */
    plantIsResponse:
      'B31 is "0 overflow". The plant removes the style that lets the list give up its space and the keypad lands below the fold. Beyond the plant, the instrument has already tracked a moving subject: 18 overflows on its first run, then 7, then 1, then 0, as each underlying defect was fixed.',
  },
  'client-logs': {
    plantIsResponse:
      'B36 is "0 amounts, names or phones in client logs". The plant adds one console.log of the entry list inside the store and the count moves 0 -> 1. Verified both directions at iteration 37: exit 1 planted, exit 0 restored.',
  },
  governance: { plantIsResponse: 'B40 is "0 stubs". The plant adds one; the count moves 0 -> 1.' },
  'money-lint': { plantIsResponse: 'B12 is "0 violations". The plant adds one.' },
  secrets: { plantIsResponse: 'B35 is "0 secrets". The plant adds one.' },
  'vectors-divergence': { plantIsResponse: 'B2 is "exactly 0 divergences". The plant adds one.' },
  font: { plantIsResponse: 'B24 counts glyphs with no coverage. The plant adds an uncoverable character.' },
  audit: { plantIsResponse: 'B33 is "0 high/critical". Not plantable by us - npm audit reads the lockfile, and its count is zero-thresholded the same way.' },
  'vectors-node': { plantIsResponse: 'B1 is "100% pass". The plant breaks one vector; passes move down.' },
  unit: { plantIsResponse: 'B10/B11/B37 are pass/fail. The plant fails one.' },
  traceability: { plantIsResponse: 'B13/B39 are "0 unresolved claims". The plant adds one.' },

  /*
   * check:plan carries no benchmark, so §5.16 does not strictly reach it - but it
   * does print a number, "sources changed", and its plant moves that number from
   * zero to one in a known direction. Recorded rather than left implicit.
   */
  design: {
    plantIsResponse:
      'its number is the RAW VALUES row count, which must be zero. The plant adds one hardcoded colour and the count moves 0 -> 1; removing it moves back. Verified both directions.',
  },

  tasks: {
    plantIsResponse:
      'its numbers are the done/ready/blocked counts, and a duplicate id moves them. The plant merges two tasks and the count drops.',
  },

  plan: {
    plantIsResponse:
      'its number is "sources changed", zero-thresholded. The plant edits a source; the count moves 0 -> 1.',
  },

  coverage: {
    /*
     * A proportion, so §5.16 bites. Adding a file with two branches nothing calls must
     * push the engine's branch percentage DOWN. Measured: 85.71% -> 84.70%.
     */
    probeFile: 'packages/formula-engine/src/__response-probe.ts',
    probe:
      'export function responseProbe(n: number): string {\n' +
      '  if (n > 0) {\n' +
      '    return "a";\n' +
      '  }\n' +
      '  return "b";\n' +
      '}\n',
    argv: [
      'run',
      '--coverage.enabled',
      '--coverage.provider=v8',
      '--coverage.include=packages/formula-engine/src/**',
      '--coverage.reporter=text',
    ],
    // Scoped to the engine alone, so the summary row IS B3's branch figure.
    metric: /All files\s*\|\s*[\d.]+\s*\|\s*([\d.]+)/,
    direction: 'down',
    why: 'two uncovered branches added to the engine must lower its branch percentage',
  },

  mutation: {
    disproven:
      'FAILS §5.16, and this is the finding that produced the rule. Four tests were ' +
      'added that provably kill the stdevMoney mutant on line 179; mutation:money ' +
      'shows it dying to two of them. Stryker re-run on a clean tree returned 9.66%, ' +
      '145 mutants, 131 survived - identical, with that mutant still listed as ' +
      'Survived. A number that does not move when the thing it measures provably ' +
      'moved is not measuring. §5.16.2: this outranks whatever the number said.',
  },
};

/* 2b · §5.16 - every benchmark-bearing verifier needs a response test */
let responseTested = 0;
let responseDisproven = 0;
for (const v of VERIFIERS) {
  if (v.benchmarks.length === 0) continue;
  const r = RESPONSES[v.id];
  if (!r) {
    failures.push(
      `${v.id} carries a benchmark reading (${v.benchmarks.join(', ')}) but has no §5.16 ` +
        'response test. Planting proves it can fail; responding proves it can measure.',
    );
    continue;
  }
  if (r.disproven) responseDisproven += 1;
  else responseTested += 1;
}

/* 2 · every benchmark must be accounted for (§5.12.3) */
const declared = Object.keys(BENCHMARK_VERIFIERS);
const inFile = [...read('docs/benchmarks/BENCHMARKS.md').matchAll(/^\|\s*(B\d+)\s*\|/gm)].map((x) => x[1]);
for (const b of inFile) {
  if (!declared.includes(b)) {
    failures.push(`${b} is in BENCHMARKS.md but absent from the verifier map (§5.12.3)`);
  }
}
for (const b of declared) {
  if (!inFile.includes(b)) failures.push(`${b} is mapped but not present in BENCHMARKS.md`);
  const vid = BENCHMARK_VERIFIERS[b];
  if (vid && !VERIFIERS.some((v) => v.id === vid)) {
    failures.push(`${b} names verifier "${vid}", which is not in the inventory`);
  }
}
const unmeasured = declared.filter((b) => !BENCHMARK_VERIFIERS[b]);

/**
 * §5.13 partition. Anything without a verifier must say which of the two states it
 * is in and, if blocked, what unblocks it - otherwise "no instrument" is a shrug
 * rather than a plan.
 */
const overdue = [];
const blocked = [];
for (const b of declared) {
  const e = BENCHMARKS[b];
  if (e.verifier) continue;
  if (e.state === 'measurable-now') {
    if (!e.why) failures.push(`${b} is measurable-now but does not say why its subject exists`);
    overdue.push(b);
  } else if (e.state === 'blocked') {
    if (!e.blockedOn) failures.push(`${b} is blocked but does not name the artifact that unblocks it`);
    if (!e.gate) failures.push(`${b} is blocked but does not name the gate it lands at`);
    blocked.push(b);
  } else {
    failures.push(`${b} has neither a verifier nor a state - it is simply unaccounted for`);
  }
}

/* 3 · every gate marked PASS must cite something that still runs (§5.12.4) */
const gateRows = [...read('docs/governance/BUILD_STATE.md').matchAll(/^\|\s*(G\d+)\s*\|([^|]*)\|([^|]*)\|(.*)$/gm)];
let passGates = 0;
for (const [, gid, , status, evidence] of gateRows) {
  const isPass = /PASS/.test(status);
  if (isPass) passGates += 1;
  /*
   * F-A1 · EVERY FILE A GATE CITES MUST STILL BE THERE.
   *
   * This loop checked that `npm run X` resolves and never looked at the file paths
   * beside it. The iteration-27 layout move relocated every document and left twenty
   * bare filenames in this table, so G0's evidence - `wc -l SPEC-DIGEST.md` - failed
   * outright while G0 stayed marked PASS and this check stayed green.
   *
   * The numbers were still correct against the real paths. That is the point: the
   * gates were CORRECT AND UNVERIFIABLE, which §5.14.5 forbids, and the only way to
   * catch it was to look at what a reader would actually copy and run.
   *
   * Paths, not the whole command: executing arbitrary shell from a markdown table
   * would be a worse idea than the problem it solves.
   */
  for (const m of evidence.matchAll(/\b((?:docs|tools|packages|apps|infra)\/[\w./-]+|[A-Z][\w-]*\.md)\b/g)) {
    if (existsSync(m[1])) continue;
    const msg = `${gid} cites the file "${m[1]}", which does not exist`;
    if (isPass) {
      failures.push(
        `${msg} - and ${gid} is marked PASS, so its evidence cannot be re-run. A gate ` +
          'that is correct and unverifiable is the state §5.14.5 exists to forbid.',
      );
    } else notes.push(msg);
  }
  for (const m of evidence.matchAll(/npm run ([\w:-]+)/g)) {
    if (scripts[m[1]] !== undefined) continue;
    const msg = `${gid} cites "npm run ${m[1]}", which does not exist`;
    if (isPass) {
      failures.push(`${msg} - and ${gid} is marked PASS, so that claim cannot be re-run.`);
    } else {
      notes.push(`${msg} (${gid} is not claimed yet, so this is owed, not broken)`);
    }
  }
}

/**
 * §5.13 A.5 · TWO NUMBERS, ALWAYS TOGETHER. "Benchmarks met" on its own is the exact
 * shape of claim the SHA lock was hiding: it says nothing about how many of the forty
 * could even be measured. INSTRUMENTED comes first because it bounds MET.
 */
const instrumented = declared.length - unmeasured.length;
/**
 * §5.15 · JUDGEMENTS EXPIRE.
 *
 * Predicates close the hole for anything DERIVABLE. They cannot close it for a
 * judgement - an estimate, a cost, a severity, a reversal trigger - and judgements go
 * stale silently, which is the same failure as F-06 in slower motion.
 *
 * So every judgement carries the iteration it was MADE in, and anything older than
 * five iterations is printed as STALE. This does NOT fail the build: a stale
 * judgement is not a defect, it is a thing that needs thinking about. The failure
 * mode being guarded against is silence, not staleness itself.
 *
 * §5.15.2 is specific that a stale judgement must be RE-STATED rather than re-read.
 * Inheriting an old estimate without re-making it is how a projection stays
 * optimistic while the facts underneath it move - which this one already did once.
 *
 * THE CURRENT ITERATION IS DERIVED, not typed. BUILD_STATE's own header said
 * "Iteration: 7" at iteration 21, which is the whole problem in miniature: a
 * hand-written number that nobody updates. The BUILD_LOG headings are appended by the
 * work itself, so the highest one is the truth.
 */
const ITERATION = Math.max(
  0,
  ...[...read('docs/governance/BUILD_LOG.md').matchAll(/^## .*·\s*Iteration (\d+)/gm)].map((m) => Number(m[1])),
);
const STALE_AFTER = 5;

/** Each entry is a JUDGEMENT: not derivable, and therefore perishable. */
const JUDGEMENTS = [
  { where: 'docs/governance/PROJECTION.md', what: 'the re-cut at checkpoint 1 and the 14-iteration plan', made: 26 },
  {
    where: 'docs/governance/PROJECTION.md',
    what: 'checkpoint 1 FAILED at 26; checkpoint 2 at 29 is unreachable, earliest is 32',
    made: 26,
  },
  { where: 'docs/governance/PROJECTION.md', what: 'the ranked cut-list, cheapest harm first', made: 21 },
  { where: 'docs/governance/PROJECTION.md', what: 'committed = A.3 items 1-3; items 4-5 moved to stretch', made: 26 },
  { where: 'docs/handover/DEFERRED.md', what: 'the cost-to-build figure on each of the four cuts', made: 21 },
  { where: 'docs/governance/DECISIONS-AUTONOMOUS.md', what: "AD-018's reversal trigger", made: 21 },
  { where: 'docs/governance/DECISIONS-AUTONOMOUS.md', what: "AD-019's three reversal triggers", made: 22 },
  { where: 'docs/benchmarks/BENCHMARKS-RESULTS.md', what: "B1's attempts narrative - close it at G7", made: 19 },
  {
    where: 'docs/benchmarks/BENCHMARKS-RESULTS.md',
    what: "B3's attempts narrative - the gap has THREE shapes, the third being bodies below early returns",
    made: 25,
  },
  /*
   * STILL 13, and deliberately. Bumping this to 24 would clear the STALE warning
   * without re-stating anything, which is the §5.14 failure in its purest form: a
   * status that is true because a field says so. It stays stale until the severities
   * are actually re-derived, and the warning is the mechanism working.
   */
  { where: 'docs/governance/FINDINGS.md', what: 'the severity implied by each finding’s wording', made: 13 },
  {
    where: 'docs/benchmarks/BENCHMARKS-RESULTS.md',
    what: 'that the twelve money mutants are ALL killed - re-adjudicate whenever money.ts or its tests change',
    made: 24,
  },
  {
    where: 'tools/check-money-mutants.mjs',
    what: 'that the two DB-bound specs cannot observe money.ts, which is what makes excluding them safe',
    made: 24,
  },
  { where: 'docs/governance/REVIEW.md', what: "the A12 audit's two 'partly' verdicts and their owed plants", made: 20 },
];

const stale = JUDGEMENTS.filter((j) => ITERATION - j.made > STALE_AFTER);
console.log(`  iteration (derived)    : ${ITERATION}`);
console.log(
  `  judgements             : ${JUDGEMENTS.length}, of which ${stale.length} STALE ` +
    `(older than ${STALE_AFTER} iterations)`,
);
for (const j of stale) {
  console.log(`  !    STALE since ${j.made}: ${j.where} - ${j.what}`);
}
if (stale.length) {
  console.log('       §5.15.2: re-STATE these from current facts, do not re-read them.');
}
if (ITERATION >= 30) {
  console.log('  !    §5.15.4: PROJECTION.md is due a re-statement at 30 and again at 35.');
}

/**
 * D.3 · EVERY RECORDED NUMBER MUST BE RE-DERIVABLE TODAY.
 *
 * G2's "52" and G3's "87 STRIDE rows" shared a shape worth naming: a number written
 * into the evidence column that nobody could regenerate. One came from a command that
 * cannot work; the other counted something other than what it was labelled. Neither
 * would have survived being re-run.
 *
 * So the cheap derivations are performed HERE, on every run, and compared with what
 * BUILD_STATE claims. Anything expensive enough to need the test suite is left to its
 * own verifier; this covers the counts that live in prose, which is exactly where
 * they rot.
 */
const buildState = read('docs/governance/BUILD_STATE.md');
const rowOf = (gid) => buildState.split('\n').find((l) => l.startsWith(`| ${gid} |`)) ?? '';
const countMatches = (file, re) => (read(file).match(re) ?? []).length;

const DERIVATIONS = [
  {
    gate: 'G0',
    what: 'lines in SPEC-DIGEST.md',
    derive: () => read('docs/spec/SPEC-DIGEST.md').split('\n').length - 1,
  },
  {
    gate: 'G1',
    what: 'ADR count in TECH-DECISIONS.md',
    derive: () => countMatches('docs/spec/TECH-DECISIONS.md', /^## ADR-/gm),
  },
  {
    gate: 'G2',
    what: 'ACTION-REQUIRED or resolved-autonomously lines in LEGAL-AUDIT.md',
    derive: () =>
      read('docs/audits/LEGAL-AUDIT.md')
        .split('\n')
        .filter((l) => /ACTION-REQUIRED|resolved autonomously/.test(l)).length,
  },
  {
    gate: 'G3',
    what: 'STRIDE threat rows in SECURITY-AUDIT.md',
    derive: () => countMatches('docs/audits/SECURITY-AUDIT.md', /^\| T\d+\.\d+/gm),
  },
  {
    gate: 'G5',
    what: 'vectors in vectors.json',
    derive: () => {
      const f = JSON.parse(read('packages/formula-engine/vectors.json'));
      return (Array.isArray(f) ? f : f.vectors).length;
    },
  },
];

let staleNumbers = 0;
for (const d of DERIVATIONS) {
  const row = rowOf(d.gate);
  if (!row) {
    failures.push(`${d.gate} has no row in BUILD_STATE.md to re-derive`);
    continue;
  }
  const actual = d.derive();
  /*
   * Bold SEGMENTS, then digits inside each - not one regex spanning from `**` to
   * `**`, which happily matched across the gap BETWEEN two bold runs and read
   * "iteration 19" as the recorded figure. Caught by the negative test, which is the
   * only reason it is not still there.
   */
  const numbers = [...row.matchAll(/\*\*([^*]+)\*\*/g)]
    .flatMap((m) => [...m[1].matchAll(/\d[\d,]*/g)].map((n) => n[0]))
    .map((n) => Number(n.replace(/,/g, '')));
  if (numbers.length === 0) {
    failures.push(
      `${d.gate}'s evidence records no bolded number, so nothing can be re-derived ` +
        `against it. Expected ${d.what} = ${actual}.`,
    );
    continue;
  }
  if (!numbers.includes(actual)) {
    staleNumbers += 1;
    failures.push(
      `${d.gate} records ${numbers.join('/')} but ${d.what} is ${actual} TODAY. ` +
        'A recorded number nobody can regenerate is the G2/G3 defect (D.3).',
    );
  }
}
console.log(`  gate numbers re-derived: ${DERIVATIONS.length}, ${staleNumbers} stale`);

console.log(`  verifiers inventoried  : ${VERIFIERS.length}`);
console.log(
  `  §5.16 response-tested  : ${responseTested} of ${responseTested + responseDisproven} ` +
    `benchmark-bearing; ${responseDisproven} DISPROVEN (its number does not move)`,
);
console.log('');
/**
 * §5.13 A.5, TO THE LETTER: "REPORT PROGRESS AS INSTRUMENTED / MET, two numbers,
 * every iteration."
 *
 * This printed one number and a pointer to a file for the other, which is not two
 * numbers. Found at iteration 26 by diffing the rule against the verbatim text of
 * injection 14, which had never been in the repository to diff against (H12). The
 * paraphrase this build ran on was accurate about A.2, A.3 and A.4 and quietly soft
 * on A.5 - which is exactly why the diff had to be done rather than assumed.
 *
 * MET is DERIVED, never declared here: the Measured table in BENCHMARKS-RESULTS.md is
 * where a measurement is recorded, so that is what gets parsed. A benchmark absent
 * from that table has not been measured and is neither met nor missed.
 */
const measured = new Map();
if (existsSync('docs/benchmarks/BENCHMARKS-RESULTS.md')) {
  const table = read('docs/benchmarks/BENCHMARKS-RESULTS.md').split('## Measured')[1]?.split('\n---')[0] ?? '';
  for (const m of table.matchAll(/^\|\s*(B\d+)\b[^|]*\|[^|]*\|([^|]*)\|/gm)) {
    if (/MISSED/.test(m[2])) measured.set(m[1], 'MISSED');
    else if (/\bMET\b/.test(m[2])) measured.set(m[1], 'MET');
  }
}
const met = [...measured].filter(([, v]) => v === 'MET').map(([b]) => b);
const missed = [...measured].filter(([, v]) => v === 'MISSED').map(([b]) => b);

/*
 * "A benchmark with no instrument cannot be claimed met" was prose sitting next to
 * the number. Prose does not fail a build. This does.
 */
for (const b of met) {
  if (!BENCHMARKS[b]) failures.push(`${b} is recorded MET but is not a declared benchmark`);
  else if (!BENCHMARKS[b].verifier) {
    failures.push(
      `${b} is recorded MET in BENCHMARKS-RESULTS.md but has NO INSTRUMENT in the ` +
        'partition. A benchmark with nothing measuring it cannot be met.',
    );
  }
}

console.log(`  BENCHMARKS INSTRUMENTED: ${instrumented} of ${declared.length}`);
console.log(
  `  BENCHMARKS MET         : ${met.length} of ${measured.size} measured (${met.join(' ') || 'none'})`,
);
console.log(
  `                           ${missed.length} MISSED (${missed.join(' ') || 'none'}), ` +
    `${declared.length - measured.size} never measured`,
);
console.log('');
console.log(`  overdue - subject EXISTS, nothing measures it : ${overdue.length}`);
console.log(`     ${overdue.join(' ') || 'none'}`);
console.log(`  blocked - subject does not exist yet          : ${blocked.length}`);
console.log(`     ${blocked.join(' ')}`);
const scopeMisses = declared.filter((b) => BENCHMARKS[b].outcome === 'MISSED - SCOPE');
for (const b of declared) {
  const x = BENCHMARKS[b];
  if (x.outcome && !x.outcomeWhy && !x.partial) {
    failures.push(`${b} records an outcome of "${x.outcome}" with no reason attached (A.5)`);
  }
}
console.log(
  `  known MISSED - SCOPE   : ${scopeMisses.length} · ${scopeMisses.join(' ') || 'none'}`,
);
console.log('     a scope miss is a DECISION; a performance miss is a FAILURE. Never merged.');
console.log(`  gates marked PASS      : ${passGates}`);
for (const n of notes) console.log(`  !    ${n}`);

/* ---- regenerate VERIFIERS.md ------------------------------------- */
if (process.argv.includes('--update-md')) {
  const rows = VERIFIERS.map(
    (v) =>
      `| \`${v.id}\` | \`${v.command}\` | \`${v.file}\` | ${v.claims} | ${
        v.defect ? `plants a defect in \`${v.defect.file}\`` : v.provenBy
      } |`,
  ).join('\n');
  const bmRows = declared
    .map((b) => {
      const vid = BENCHMARK_VERIFIERS[b];
      return `| ${b} | ${vid ? `\`${vid}\`` : '**none yet**'} |`;
    })
    .join('\n');
  const md = `# VERIFIERS

**Generated by \`node tools/check-verifiers.mjs --update-md\`. Do not hand-edit.**

§5.12. Every command cited anywhere as evidence: what it claims to prove, the file
that implements it, and the defect that must make it fail.

This file exists because \`BENCHMARKS.md\` has been SHA-locked since iteration 6 and
the lock covered the thresholds only. Three separate times a check was cited as
evidence while not running - \`maybe()\` skipped its assertions, \`assertPaise\` had
never executed, and typecheck, lint and the money rule did not exist at all. The lock
now covers the instruments as well as the numbers.

Prove them with \`node tools/check-verifiers.mjs --prove\`, which plants each defect,
requires the command to fail, restores the file and verifies the restore.

## The inventory

| id | command | implemented by | claims | proven to fail by |
|----|---------|----------------|--------|-------------------|
${rows}

## Benchmark coverage

A benchmark with no instrument **cannot be claimed met**. ${unmeasured.length} of
${declared.length} have none yet; each carries the gate it is owed at, in
\`tools/check-verifiers.mjs\`.

| benchmark | verifier |
|-----------|----------|
${bmRows}
`;
  /*
   * A.1 - the partition also lands in BENCHMARKS-RESULTS.md, between markers, so the
   * one file a reader opens for results carries it, and it still cannot drift from
   * the tool that computes it.
   */
  if (existsSync('docs/benchmarks/BENCHMARKS-RESULTS.md')) {
    const rRaw = readFileSync('docs/benchmarks/BENCHMARKS-RESULTS.md', 'utf8');
    const rCrlf = rRaw.includes('\r\n');
    const body = rRaw.split('\r\n').join('\n');
    const START = '<!-- PARTITION:START';
    const END = '<!-- PARTITION:END -->';
    const s = body.indexOf(START);
    const e = body.indexOf(END);
    if (s !== -1 && e !== -1) {
      const row = (b) => {
        const x = BENCHMARKS[b];
        const state = x.outcome ? `**${x.outcome}**` : 'instrumented';
        if (x.verifier) return `| ${b} | ${state} | \`${x.verifier}\` | ${x.partial ?? '-'} |`;
        if (x.state === 'measurable-now') return `| ${b} | **OVERDUE** | - | ${x.why} |`;
        // A known outcome outranks "blocked": B38 is blocked on screens AND already
        // known to be a scope miss, and the second fact is the one a reader needs.
        if (x.outcome) return `| ${b} | **${x.outcome}** | - | ${x.outcomeWhy ?? x.partial} |`;
        return `| ${b} | blocked | - | needs **${x.blockedOn}**, at ${x.gate} |`;
      };
      const table = [
        `${START} - generated by tools/check-verifiers.mjs --update-md -->`,
        '',
        '## The partition (§5.13 A.1)',
        '',
        `**${instrumented} of ${declared.length} instrumented. ` +
          `${overdue.length} overdue. ${blocked.length} blocked.**`,
        '',
        'OVERDUE means the subject already EXISTS and nothing measures it - a present',
        'failure under §5.13, not a future task. BLOCKED names the artifact whose',
        'existence unblocks it, and the gate that artifact arrives at.',
        '',
        '| benchmark | state | instrument | note |',
        '|---|---|---|---|',
        ...declared.map(row),
        '',
        END,
      ].join('\n');
      const out = body.slice(0, s) + table + body.slice(e + END.length);
      writeFileSync('docs/benchmarks/BENCHMARKS-RESULTS.md', rCrlf ? out.split('\n').join('\r\n') : out);
      console.log('  rewrote the partition in BENCHMARKS-RESULTS.md');
    }
  }

  /*
   * §5.14 - THE TWO NUMBERS ARE DERIVED, NOT RE-TYPED.
   *
   * BUILD_STATE carried "INSTRUMENTED: 16 of 40 · 0 overdue" by hand. At iteration 25
   * the truth was 14 and 2, and it had also gone stale on the check count, the test
   * count and B4/B6's classification - five wrong numbers in six lines, in the file
   * that holds the rule against hand-written status. It is the same disease as the
   * "Iteration: 7" field deleted at iteration 22, and it gets the same treatment:
   * generated between markers, and check-generated fails if it drifts.
   *
   * §5.13 A.5 calls these the two most important numbers in the build. They are now
   * the two that nobody can mistype.
   */
  if (existsSync('docs/governance/BUILD_STATE.md')) {
    const sRaw = readFileSync('docs/governance/BUILD_STATE.md', 'utf8');
    const sCrlf = sRaw.includes('\r\n');
    const body = sRaw.split('\r\n').join('\n');
    const START = '<!-- TWONUMBERS:START';
    const END = '<!-- TWONUMBERS:END -->';
    const a = body.indexOf(START);
    const b = body.indexOf(END);
    if (a !== -1 && b !== -1) {
      const block = [
        `${START} - generated by tools/check-verifiers.mjs --update-md -->`,
        '',
        '**Two numbers (§5.13 A.5):**',
        '',
        `> **INSTRUMENTED: ${instrumented} of ${declared.length}.** ` +
          `${overdue.length} overdue, ${blocked.length} blocked on artifacts that do not exist yet.`,
        overdue.length
          ? `> **OVERDUE: ${overdue.join(', ')}** - the subject exists and nothing measures it.`
          : '> No benchmark is overdue.',
        '> **MET:** see BENCHMARKS-RESULTS.md. A benchmark with no instrument cannot be',
        '> claimed met, and none is claimed here - this block counts instruments, not',
        '> results, because conflating the two is how a benchmark goes green untested.',
        scopeMisses.length
          ? `> **MISSED - SCOPE: ${scopeMisses.join(', ')}**, a decision rather than a failure.`
          : '> No benchmark is a scope miss.',
        '',
        END,
      ].join('\n');
      const out = body.slice(0, a) + block + body.slice(b + END.length);
      writeFileSync('docs/governance/BUILD_STATE.md', sCrlf ? out.split('\n').join('\r\n') : out);
      console.log('  rewrote the two numbers in BUILD_STATE.md');
    }
  }

  /*
   * §5.14 applies to the README exactly as it applies to BUILD_STATE. The front page
   * is the most-read and least-maintained document in any repository, so its numbers
   * are generated between markers rather than typed.
   */
  if (existsSync('README.md')) {
    const rr = readFileSync('README.md', 'utf8');
    const crlfR = rr.includes('\r\n');
    const body = rr.split('\r\n').join('\n');
    const S = '<!-- STATE:START';
    const E = '<!-- STATE:END -->';
    const a = body.indexOf(S);
    const b = body.indexOf(E);
    if (a !== -1 && b !== -1) {
      const block = [
        `${S} - generated by tools/check-verifiers.mjs --update-md -->`,
        '',
        `- **Iteration ${ITERATION}, against a hard ceiling of 40.**`,
        `- **Gates passed: ${passGates}.**`,
        `- **Benchmarks instrumented: ${instrumented} of ${declared.length}** - ` +
          `${overdue.length} overdue, ${blocked.length} blocked on artifacts that do not exist yet.`,
        `- **Benchmarks met: ${met.length} of ${measured.size} measured** (${met.join(', ') || 'none'}). ` +
          `${missed.length} missed (${missed.join(', ') || 'none'}). ` +
          `${declared.length - measured.size} never measured.`,
        scopeMisses.length
          ? `- **${scopeMisses.join(', ')}: MISSED - SCOPE** - a decision, not a failure. See DEFERRED.md.`
          : '',
        '',
        'Every number above is derived on each run. None is typed by hand, and that is',
        'not a stylistic preference: six times in this build something turned out not',
        'to be what its record claimed.',
        '',
        E,
      ]
        .filter((l) => l !== null)
        .join('\n');
      const out = body.slice(0, a) + block + body.slice(b + E.length);
      writeFileSync('README.md', crlfR ? out.split('\n').join('\r\n') : out);
      console.log('  rewrote the state block in README.md');
    }
  }

  const existing = existsSync('docs/governance/VERIFIERS.md') ? readFileSync('docs/governance/VERIFIERS.md', 'utf8') : '';
  const crlf = existing.includes('\r\n');
  writeFileSync('docs/governance/VERIFIERS.md', crlf ? md.split('\n').join('\r\n') : md);
  console.log('  rewrote VERIFIERS.md from the inventory');
}

/* ---- --responds: change the world, require the number to move (§5.16) --- */
if (process.argv.includes('--responds')) {
  console.log('\n  §5.16 - changing the world in a KNOWN direction and watching the number:\n');
  const VITEST = join(
    dirname(createRequire(import.meta.url).resolve('vitest/package.json')),
    'vitest.mjs',
  );
  const runMetric = (argv, metric) => {
    let out = '';
    try {
      out = execFileSync(process.execPath, [VITEST, ...argv], {
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 900000,
      });
    } catch (e) {
      out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    }
    const m = metric.exec(out.replace(/\[[0-9;]*m/g, ''));
    return m ? Number(m[1]) : null;
  };

  for (const [id, r] of Object.entries(RESPONSES)) {
    if (r.plantIsResponse) {
      console.log(`  -    ${id.padEnd(20)} plant IS the response test: ${r.plantIsResponse}`);
      continue;
    }
    if (r.disproven) {
      console.log(`  x    ${id.padEnd(20)} DISPROVEN under §5.16`);
      continue;
    }
    const before = runMetric(r.argv, r.metric);
    if (before === null) {
      failures.push(`${id}: could not read its number before the change, so §5.16 cannot run`);
      continue;
    }
    writeFileSync(r.probeFile, r.probe);
    let after = null;
    try {
      after = runMetric(r.argv, r.metric);
    } finally {
      rmSync(r.probeFile, { force: true });
    }
    if (existsSync(r.probeFile)) failures.push(`${id}: the §5.16 probe was not removed`);
    if (after === null) {
      failures.push(`${id}: could not read its number after the change`);
      continue;
    }
    const moved = r.direction === 'down' ? after < before : after > before;
    console.log(
      `  ${moved ? 'ok  ' : '**  '} ${id.padEnd(20)} ${before} -> ${after} ` +
        `(expected ${r.direction})  ${moved ? '' : 'DID NOT MOVE'}`,
    );
    if (!moved) {
      failures.push(
        `${id} FAILS §5.16: ${r.why}, and the number went ${before} -> ${after}. ` +
          'A measurement that does not move when the thing it measures provably ' +
          'changed is not measuring (§5.16.2). This outranks whatever it reported.',
      );
    }
  }
}

/* ---- --prove: plant each defect and require a failure (§5.12.2) --- */
if (process.argv.includes('--prove')) {
  console.log('\n  PROVING each verifier fails on its planted defect:\n');
  for (const v of VERIFIERS) {
    if (!v.defect) {
      console.log(`  -    ${v.id.padEnd(20)} not plantable`);
      continue;
    }
    const { file, find, replace } = v.defect;
    const original = readFileSync(file, 'utf8');
    const crlf = original.includes('\r\n');
    const norm = original.split('\r\n').join('\n');
    if (!norm.includes(find)) {
      failures.push(`${v.id}: its planted defect no longer applies - anchor missing in ${file}`);
      console.log(`  x    ${v.id.padEnd(20)} ANCHOR MISSING in ${file}`);
      continue;
    }
    const mutated = norm.replace(find, replace);
    writeFileSync(file, crlf ? mutated.split('\n').join('\r\n') : mutated);

    let failedAsItShould = false;
    let couldNotRun = null;
    try {
      /*
       * Resolved to a JS entry and run with this Node. NOT `npm.cmd` - that throws
       * EINVAL before running anything, and the catch below would read the throw as
       * the verifier failing. See resolveCommand: this is the phantom-pass bug.
       */
      const { exe, args } = resolveCommand(v.command);
      execFileSync(exe, args, { stdio: 'pipe', timeout: 900000 });
    } catch (e) {
      /*
       * A command that could not be STARTED has not failed - it has not run. The
       * two were conflated here, which is the whole defect, so they are separated
       * by the one signal that distinguishes them: a process that ran has a numeric
       * exit status, and one that never started does not.
       */
      if (typeof e.status === 'number') failedAsItShould = true;
      else couldNotRun = e.code || e.message;
    } finally {
      writeFileSync(file, original);
    }

    if (readFileSync(file, 'utf8') !== original) {
      failures.push(`${v.id}: RESTORE FAILED for ${file} - the tree is left mutated`);
    }
    if (couldNotRun) {
      failures.push(
        v.id + ': "' + v.command + '" COULD NOT BE STARTED (' + couldNotRun + '), so the plant ' +
          'proved nothing. A command that never ran is not a command that failed - reading ' +
          'one as the other is what made every npm-based plant a phantom pass until ' +
          'iteration 37.',
      );
    } else if (!failedAsItShould) {
      failures.push(
        `${v.id}: a real defect was planted in ${file} and "${v.command}" STILL PASSED. ` +
          'This verifier does not verify.',
      );
    }
    const mark = couldNotRun ? '?   ' : failedAsItShould ? 'ok  ' : 'x   ';
    console.log(`  ${mark} ${v.id.padEnd(20)} ${v.command}`);
  }
}

if (failures.length) {
  console.error(`\nVERIFIER FAILURES (${failures.length}):`);
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}
console.log('\nverifiers: every cited command exists, every benchmark is accounted for');
