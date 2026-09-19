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
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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
      file: 'REVIEW.md',
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
      file: 'BENCHMARKS.md',
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
      file: 'REVIEW.md',
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
    defect: {
      file: 'apps/api/src/rate-limit/limits.ts',
      find: 'export const OTP_TTL_SECONDS = 10 * MINUTE;',
      replace: 'export const OTP_TTL_SECONDS = 5 * MINUTE;',
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
      'It IS a defect-planting harness - 145 planted mutants on money.ts alone - so proving it can fail is the thing it does on every run. What is NOT yet proven is that it sees the whole suite: its dry run finds 170 of 303 tests, so its first reading of 9.66% is a statement about the harness, not the engine. Recorded as provisional in BENCHMARKS-RESULTS.md rather than as a B4 measurement.',
  },
  {
    id: 'findings',
    command: 'npm run check:findings',
    file: 'tools/check-findings.mjs',
    claims:
      '§5.14 - every adversary finding’s status is DERIVED from a predicate against the repository, never asserted. A finding that does not verify as fixed and carries no explanation fails the build.',
    benchmarks: [],
    defect: {
      file: 'TECH-DECISIONS.md',
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
      file: 'REVIEW.md',
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
      file: 'TRACEABILITY.md',
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
  B4: {
    verifier: 'mutation',
    partial:
      'The instrument exists and runs. Its first reading is NOT a valid measurement: the harness sees 170 of 303 tests. Fixing that comes before any number is claimed.',
  },
  B5: {
    verifier: 'coverage',
    partial:
      'The backend is small and growing, so 91.26% today is over a small denominator. The instrument exists and moves with the subject, which is what §5.13 asks.',
  },
  B6: {
    verifier: 'mutation',
    partial: 'Same instrument and same harness shortfall as B4.',
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
  B26: { state: 'blocked', blockedOn: 'the design tokens', gate: 'G10' },
  B27: { state: 'blocked', blockedOn: 'the design tokens', gate: 'G10' },
  B28: { state: 'blocked', blockedOn: 'rendered components', gate: 'G11' },
  B29: { state: 'blocked', blockedOn: 'the typography scale', gate: 'G10' },
  B30: { state: 'blocked', blockedOn: 'the i18n bundles', gate: 'G16' },
  B31: { state: 'blocked', blockedOn: 'rendered screens in three languages', gate: 'G16' },
  B32: { state: 'blocked', blockedOn: 'money fields on screens', gate: 'G12' },
  B33: { verifier: 'audit' },
  B34: { state: 'blocked', blockedOn: 'a container image', gate: 'G9' },
  B35: {
    verifier: 'secrets',
    partial:
      'The REPO half is measured and clean over 102 files. The APK half is blocked on a build (G9), and gitleaks joins this scanner there rather than replacing it.',
  },
  B36: {
    state: 'blocked',
    blockedOn: 'the first client log line - NOT the server',
    gate: 'due at A.3 item 1, the first screen',
    // Listed with B8 and B11 as never-instrumented when the server was deferred.
    // Wrong: a CLIENT day close writes CLIENT logs, and crash reporting ships them
    // off the device, so this is a DPDP matter (LEGAL §1) rather than hygiene.
    // Corrected by injection 16 A.3. §5.13 - the subject WILL exist, so the
    // instrument is due with it, not after it.
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

/* 2 · every benchmark must be accounted for (§5.12.3) */
const declared = Object.keys(BENCHMARK_VERIFIERS);
const inFile = [...read('BENCHMARKS.md').matchAll(/^\|\s*(B\d+)\s*\|/gm)].map((x) => x[1]);
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
const gateRows = [...read('BUILD_STATE.md').matchAll(/^\|\s*(G\d+)\s*\|([^|]*)\|([^|]*)\|(.*)$/gm)];
let passGates = 0;
for (const [, gid, , status, evidence] of gateRows) {
  const isPass = /PASS/.test(status);
  if (isPass) passGates += 1;
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
  ...[...read('BUILD_LOG.md').matchAll(/^## .*·\s*Iteration (\d+)/gm)].map((m) => Number(m[1])),
);
const STALE_AFTER = 5;

/** Each entry is a JUDGEMENT: not derivable, and therefore perishable. */
const JUDGEMENTS = [
  { where: 'PROJECTION.md', what: 'every iteration estimate and the 20-iteration plan', made: 21 },
  { where: 'PROJECTION.md', what: 'the ranked cut-list, cheapest harm first', made: 21 },
  { where: 'PROJECTION.md', what: 'committed = A.3 items 1-5; stretch = items 6-8', made: 21 },
  { where: 'DEFERRED.md', what: 'the cost-to-build figure on each of the four cuts', made: 21 },
  { where: 'DECISIONS-AUTONOMOUS.md', what: "AD-018's reversal trigger", made: 21 },
  { where: 'DECISIONS-AUTONOMOUS.md', what: "AD-019's three reversal triggers", made: 22 },
  { where: 'BENCHMARKS-RESULTS.md', what: "B1's attempts narrative - close it at G7", made: 19 },
  {
    where: 'BENCHMARKS-RESULTS.md',
    what: "B3's attempts narrative - the gap is in rejection arms",
    made: 19,
  },
  { where: 'FINDINGS.md', what: 'the severity implied by each finding’s wording', made: 13 },
  { where: 'REVIEW.md', what: "the A12 audit's two 'partly' verdicts and their owed plants", made: 20 },
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
const buildState = read('BUILD_STATE.md');
const rowOf = (gid) => buildState.split('\n').find((l) => l.startsWith(`| ${gid} |`)) ?? '';
const countMatches = (file, re) => (read(file).match(re) ?? []).length;

const DERIVATIONS = [
  {
    gate: 'G0',
    what: 'lines in SPEC-DIGEST.md',
    derive: () => read('SPEC-DIGEST.md').split('\n').length - 1,
  },
  {
    gate: 'G1',
    what: 'ADR count in TECH-DECISIONS.md',
    derive: () => countMatches('TECH-DECISIONS.md', /^## ADR-/gm),
  },
  {
    gate: 'G2',
    what: 'ACTION-REQUIRED or resolved-autonomously lines in LEGAL-AUDIT.md',
    derive: () =>
      read('LEGAL-AUDIT.md')
        .split('\n')
        .filter((l) => /ACTION-REQUIRED|resolved autonomously/.test(l)).length,
  },
  {
    gate: 'G3',
    what: 'STRIDE threat rows in SECURITY-AUDIT.md',
    derive: () => countMatches('SECURITY-AUDIT.md', /^\| T\d+\.\d+/gm),
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
console.log('');
console.log(`  BENCHMARKS INSTRUMENTED: ${instrumented} of ${declared.length}`);
console.log(`  BENCHMARKS MET         : see BENCHMARKS-RESULTS.md (a benchmark with no`);
console.log(`                           instrument cannot be claimed met)`);
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
  if (existsSync('BENCHMARKS-RESULTS.md')) {
    const rRaw = readFileSync('BENCHMARKS-RESULTS.md', 'utf8');
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
      writeFileSync('BENCHMARKS-RESULTS.md', rCrlf ? out.split('\n').join('\r\n') : out);
      console.log('  rewrote the partition in BENCHMARKS-RESULTS.md');
    }
  }

  const existing = existsSync('VERIFIERS.md') ? readFileSync('VERIFIERS.md', 'utf8') : '';
  const crlf = existing.includes('\r\n');
  writeFileSync('VERIFIERS.md', crlf ? md.split('\n').join('\r\n') : md);
  console.log('  rewrote VERIFIERS.md from the inventory');
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
    try {
      // NOT `shell: true` - check:tooling bans it, and caught this file using it.
      // On Windows npm and npx are .cmd shims, which execFileSync needs named
      // explicitly; going through a shell instead would re-parse argv and mangle
      // forward-slash paths, which is the trap §5.10.3 records.
      const [cmd, ...args] = v.command.split(' ');
      const win = process.platform === 'win32';
      const exe = win && (cmd === 'npm' || cmd === 'npx') ? `${cmd}.cmd` : cmd;
      execFileSync(exe, args, { stdio: 'pipe', timeout: 900000 });
    } catch {
      failedAsItShould = true;
    } finally {
      writeFileSync(file, original);
    }

    if (readFileSync(file, 'utf8') !== original) {
      failures.push(`${v.id}: RESTORE FAILED for ${file} - the tree is left mutated`);
    }
    if (!failedAsItShould) {
      failures.push(
        `${v.id}: a real defect was planted in ${file} and "${v.command}" STILL PASSED. ` +
          'This verifier does not verify.',
      );
    }
    console.log(`  ${failedAsItShould ? 'ok  ' : 'x   '} ${v.id.padEnd(20)} ${v.command}`);
  }
}

if (failures.length) {
  console.error(`\nVERIFIER FAILURES (${failures.length}):`);
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}
console.log('\nverifiers: every cited command exists, every benchmark is accounted for');
