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
    defect: {
      file: 'packages/formula-engine/src/intelligence.ts',
      find: 'export ',
      replace: 'const PLANTED_RATE = 0.18;\nexport ',
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
    id: 'coverage',
    command: 'npm run coverage',
    file: 'package.json',
    claims: 'Measures formula-engine statement, branch and function coverage (B3).',
    defect: null,
    benchmarks: ['B3'],
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
export const BENCHMARK_VERIFIERS = {
  B1: 'vectors-node',
  B2: 'vectors-divergence',
  B3: 'coverage',
  B4: null, // mutation score: no runner configured. Owed before G20.
  B5: null, // backend coverage. Owed at G6-G8.
  B6: null, // backend mutation score. Owed at G6-G8.
  B7: null, // app logic coverage: no app yet. Owed at G10+.
  B8: null, // sync replay idempotency. Owed at G7.
  B9: null, // 30-day endurance. Owed at G17.
  B10: 'unit',
  B11: 'unit',
  B12: 'money-lint',
  B13: null, // traceability empty cells: INSTRUMENT DELETED at iteration 15. See V-3.
  B14: null,
  B15: null,
  B16: null,
  B17: null,
  B18: null,
  B19: null,
  B20: null,
  B21: null,
  B22: null,
  B23: null, // B14-B23 performance: owed at G18 on the constrained AVD.
  B24: 'font', // partial: the font's share of the budget is measured; no APK is built yet.
  B25: null,
  B26: null,
  B27: null,
  B28: null,
  B29: null,
  B30: null,
  B31: null,
  B32: null, // B25-B32 UI and i18n: owed at G10-G16.
  B33: 'audit',
  B34: null, // container scan: no image yet. Owed at G9.
  B35: null, // secret scanning: not configured. Owed at G9.
  B36: null, // log hygiene grep: owed at G6.
  B37: 'unit',
  B38: null, // screens implemented: owed at G15.
  B39: null, // traceability completeness: INSTRUMENT DELETED at iteration 15. See V-3.
  B40: 'governance',
};

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

console.log(`  verifiers inventoried         : ${VERIFIERS.length}`);
console.log(`  benchmarks mapped             : ${declared.length}`);
console.log(`  benchmarks WITH an instrument : ${declared.length - unmeasured.length}`);
console.log(`  benchmarks WITHOUT one        : ${unmeasured.length}`);
console.log(`     ${unmeasured.join(' ')}`);
console.log(`  gates marked PASS             : ${passGates}`);
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
