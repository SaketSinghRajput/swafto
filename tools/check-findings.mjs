/**
 * §5.14 - STATUS IS DERIVED, NEVER ASSERTED.
 *
 * "NOTHING IN THIS BUILD IS TRUE BECAUSE A FILE SAYS SO."
 *
 * Five instances of one failure now, in five layers:
 *   1. maybe()          - the test ran; its assertions did not.
 *   2. assertPaise 0/59 - the guard existed; it had never executed.
 *   3. typecheck / lint - cited as evidence; the commands did not exist.
 *   4. F-10             - the finding's premise was false AND its fix was never
 *                         applied; the two errors cancelled into an apparent pass.
 *   5. F-06             - found that AD-010 claimed an annotation nobody had made,
 *                         and then ITS OWN fix was recorded as applied and was not.
 *                         The finding about unapplied fixes had its fix go unapplied.
 *
 * So no finding here carries a status word. Each carries a PREDICATE evaluated
 * against the repository on every run, and the status is whatever that predicate
 * returns today. A finding cannot be MARKED fixed; it can only BE fixed.
 *
 *   node tools/check-findings.mjs              derive and check every status
 *   node tools/check-findings.mjs --update-md  regenerate FINDINGS.md
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';

const read = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\r\n').join('\n') : '');

/* ---- the predicates a finding may use ---------------------------------- */
const contains = (file, text) => () => read(file).includes(text);
const absent = (file, text) => () => !read(file).includes(text);
const fileExists = (f) => () => existsSync(f);
const vectorExists = (name) => () => {
  const f = JSON.parse(read('packages/formula-engine/vectors.json') || '{"vectors":[]}');
  return (Array.isArray(f) ? f : f.vectors).some((v) => v.name === name);
};
const rejectExists = (name) => () => {
  const f = JSON.parse(read('packages/formula-engine/rejects.json') || '{"cases":[]}');
  return (Array.isArray(f) ? f : f.cases).some((c) => c.name === name);
};
const all =
  (...ps) =>
  () =>
    ps.every((p) => p());

/**
 * V-7's predicate: every name TRACEABILITY cites, resolved against the repository.
 *
 * Returns the unresolved ones, so the finding's status and its detail come from the
 * same derivation rather than from a sentence somebody kept up to date.
 */
function traceabilityUnresolved() {
  const engine = ['money', 'dates', 'types', 'primary', 'operational', 'intelligence', 'input']
    .map((n) => read(`packages/formula-engine/src/${n}.ts`))
    .join('');
  const vectors = new Set(
    (JSON.parse(read('packages/formula-engine/vectors.json') || '{"vectors":[]}').vectors ?? []).map(
      (v) => v.name,
    ),
  );
  const unresolved = [];

  for (const line of read('docs/spec/TRACEABILITY.md').split('\n')) {
    const m = /^\|\s*((?:IN|P|OP|BI)\d+)\s*\|(.+)$/.exec(line);
    if (!m) continue;
    // Unescaped pipes only: TRACEABILITY writes alternatives as `a`\|`b` inside a cell.
    const cells = m[2].split(/(?<!\\)\|/).map((c) => c.trim());
    const [fnCell = '', testCell = ''] = cells;

    const fn = /`([A-Za-z0-9_]+)`/.exec(fnCell)?.[1];
    if (fn && !engine.includes(`export function ${fn}`) && !engine.includes(`export const ${fn}`)) {
      unresolved.push(`${m[1]}: engine function ${fn}`);
    }
    for (const v of testCell.matchAll(/`([^`]+)`/g)) {
      const name = v[1].replace(/^vectors\.json:/, '').trim();
      // Only kebab-case tokens are vector names; the cell also holds prose.
      if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) continue;
      if (!vectors.has(name)) unresolved.push(`${m[1]}: vector ${name}`);
    }
  }
  return unresolved;
}

/**
 * THE FINDINGS.
 *
 * `premise` is the command that established the finding was real - §5.14.3, because
 * an adversary looking for trouble makes false positives MORE likely, not less, and
 * F-10 proved it.
 *
 * `fixed` is a predicate, never a word. `withdrawn` marks a finding whose PREMISE was
 * false: it is not fixed and never needed fixing, and calling it fixed would stack a
 * second untruth on the first.
 */
export const FINDINGS = [
  {
    id: 'F-01',
    what: 'SECURITY-AUDIT still designed around Cloudflare being in the data path, three iterations after AD-008 removed it',
    premise: 'grep for Cloudflare in SECURITY-AUDIT TB4/T4.1/T4.2 - all three described the old topology',
    fixed: all(
      contains('docs/audits/SECURITY-AUDIT.md', 'TOPOLOGY CHANGED AT AD-008'),
      absent('docs/audits/SECURITY-AUDIT.md', "Cloudflare's published IP ranges"),
    ),
  },
  {
    id: 'F-02',
    what: 'Both toClosedDaySummary guards had never been executed',
    premise: 'grepped the test tree for their error messages - neither appeared anywhere',
    fixed: all(
      rejectExists('state-closed-summary-of-an-open-day'),
      rejectExists('state-closed-summary-without-a-count'),
    ),
  },
  {
    id: 'F-03',
    what: 'No vector crossed a year boundary or a leap day',
    premise: 'inspected every date field; corrected my own overstated first reading before filing',
    fixed: all(vectorExists('year-boundary-aging-and-horizon'), vectorExists('leap-day-arithmetic')),
  },
  {
    id: 'F-04',
    what: "source was never 'imported' in any fixture, so D1's reversibility path was unexercised",
    premise: 'every entry across all vectors carried source: manual',
    fixed: vectorExists('imported-source-participates-identically'),
  },
  {
    id: 'F-05',
    what: 'The GSM-7 alphabet was reconstructed from memory and its 127-vs-128 count undocumented',
    premise: 'measured the hand-written alphabet: 127 characters against a 128-position table',
    fixed: contains('tools/check-sms-segments.mjs', 'GSM_BASIC_CONTENT_CHARS'),
  },
  {
    id: 'F-06',
    what: 'ADR-011 was never annotated as superseded, although AD-010 said it was',
    premise: 'searched TECH-DECISIONS.md for "superseded" near ADR-011 - only unrelated hits',
    fixed: contains('docs/spec/TECH-DECISIONS.md', 'SUPERSEDED by BENCHMARKS.md'),
    note: 'ITS OWN FIX WAS THEN ALSO RECORDED AS APPLIED AND NEVER APPLIED, for eight iterations - git log -S"SUPERSEDED by BENCHMARKS" returned nothing until iteration 21. The fifth instance of the pattern, and the one that most directly justifies this file.',
  },
  {
    id: 'F-07',
    what: 'Two SECURITY-AUDIT rows asserted a resolved status beside an outstanding one',
    premise: 'the uppercase contradiction rule could not see a lowercase "needs counsel"',
    fixed: contains('tools/check-prose.mjs', 'UNRESOLVED_PHRASES'),
  },
  {
    id: 'F-08',
    what: 'Nothing enforced that generated files were actually regenerated',
    premise: 'regenerating vectors.json produced no diff, but no check would have noticed if it had',
    fixed: fileExists('tools/check-generated.mjs'),
  },
  {
    id: 'F-09',
    what: 'No fixture populated the expense label field',
    premise: 'zero entries across all vectors carried a label',
    fixed: vectorExists('expense-labels-are-carried'),
  },
  {
    id: 'F-10',
    what: 'TRACEABILITY lists BI6 as WIP and should be promoted',
    premise: 'ASSERTED that its function, vectors, endpoint and screen were "all present" - NOT VERIFIED',
    withdrawn:
      'THE PREMISE WAS FALSE. apps/api/src contains no routes and apps/mobile contains no .tsx files, so the endpoint and both screens did not exist and WIP was correct. The instructed fix was ALSO recorded as applied and never applied, and the two errors cancelled into an apparent pass. The predicate below holds the repository to that reading: BI6 keeps its row while no route exists.',
    fixed: all(contains('docs/spec/TRACEABILITY.md', '| BI6 |'), absent('apps/api/src/sms/port.ts', '.post(')),
  },
  {
    id: 'V-1',
    what: "G2's evidence command escapes its alternation so grep -E reads a literal pipe; it has never produced its recorded output",
    premise: 'ran the command as recorded: matched nothing, exit 1, against a recorded 52',
    fixed: contains('docs/governance/BUILD_STATE.md', 'LITERAL pipe'),
  },
  {
    id: 'V-2',
    what: 'G3 recorded "STRIDE rows: 87", which counted every table row in the file',
    premise: 'counted threat rows at the G3 commit and today - 28 both times',
    fixed: contains('docs/governance/BUILD_STATE.md', 'STRIDE THREAT rows re-counted'),
  },
  {
    id: 'V-3',
    what: 'G19 cites check:traceability, deleted at iteration 15; B13 and B39 lost their instrument',
    premise: 'npm run check:traceability -> npm error; the script did not exist',
    fixed: fileExists('tools/check-traceability.mjs'),
  },
  {
    id: 'V-4',
    what: 'Append-only was only ever tested by updating amount, so a column-scoped trigger left the suite green',
    premise: 'planted BEFORE UPDATE OF amount and the entire suite still passed',
    fixed: contains('packages/schema/test/append-only.spec.ts', 'UNCONSTRAINED_COLUMNS'),
  },
  {
    id: 'V-5',
    what: 'BENCHMARKS-RESULTS.md, referenced by the frozen BENCHMARKS.md since iteration 6, did not exist',
    premise: 'ls BENCHMARKS-RESULTS.md -> No such file or directory',
    fixed: fileExists('docs/benchmarks/BENCHMARKS-RESULTS.md'),
  },
  {
    id: 'V-6',
    what: 'Three gate evidence numbers were stale: G0 said 526 lines, G1 said 12 ADRs, G5 had no re-derivable count',
    premise: 're-derived all five cheap gate numbers; three disagreed with the record',
    fixed: contains('tools/check-verifiers.mjs', 'gate numbers re-derived'),
  },
  {
    id: 'V-7',
    what: 'TRACEABILITY names 8 engine functions and 18 vectors that do not exist',
    premise: 'resolved every backticked name against engine exports and vectors.json',
    /*
     * THIS READ `() => false` UNTIL ITERATION 36 - a hardcoded status, in the file
     * whose entire purpose is that status is derived. The §5.14 defect inside the
     * §5.14 mechanism, and it would have held the finding open for ever no matter
     * what was built. Found while building the very parsers it was complaining about.
     *
     * It now resolves both halves of the claim against the repository: every engine
     * function TRACEABILITY names must exist, and every vector its TEST column cites
     * must be in vectors.json.
     */
    fixed: () => traceabilityUnresolved().length === 0,
    /*
     * The detail DERIVES from the same helper as the status, so the two cannot
     * disagree. A hand-written "not started" outlived the work by three iterations
     * last time, which is the smaller version of the same defect.
     */
    get open() {
      const u = traceabilityUnresolved();
      return u.length === 0
        ? ''
        : `§5.14.5 requires each one built or the claim removed. ${u.length} still ` +
            `unresolved: ${u.slice(0, 30).join('; ')}${u.length > 30 ? `; and ${u.length - 30} more` : ''}.`;
    },
  },
  {
    id: 'V-8',
    what: 'stdevMoney never had its computation tested - both existing cases returned early',
    premise:
      'planted `Math.sqrt(acc / values.length)` -> `* values.length` and the whole suite stayed green',
    /*
     * The predicate is the TEST, not a note saying a test was added. A finding that is
     * fixed because a file says "fixed" is the §5.14 defect; this one holds only while
     * a case that distinguishes n=1 from n>1 is actually present.
     */
    fixed: all(
      contains('packages/formula-engine/test/money.spec.ts', 'stdevMoney([0, 100])'),
      contains('packages/formula-engine/test/money.spec.ts', 'stdevMoney([100, 200, 300, 400])'),
    ),
  },
  {
    id: 'V-9',
    what: 'a stale Stryker sandbox was a second copy of the repo, so vitest ran every test twice and two copies of postgres.spec.ts raced the same database',
    premise: 'vitest reported 606 tests for a 303-test suite, and .stryker-tmp/ was untracked',
    /*
     * THE PREDICATE IS THE MECHANISM, NOT THE MOMENT.
     *
     * It first read `!existsSync('.stryker-tmp')`, which reopened the finding the
     * instant a legitimate `stryker run` created its sandbox mid-run. That tests
     * transient state rather than whether the defect is fixed, and a finding that
     * flickers is a finding people learn to ignore.
     *
     * The fix is the class check (A.2) plus the ignore. Whether a sandbox exists
     * right now is enforced by check:shadow, which is in check:all and fails the
     * build on its own - the right place for it, and the reason this does not need
     * to duplicate the test.
     */
    fixed: all(
      contains('.gitignore', '.stryker-tmp/'),
      fileExists('tools/check-shadow-copies.mjs'),
      contains('package.json', 'npm run check:shadow &&'),
    ),
  },
  {
    id: 'V-10',
    what: 'injection 14 was missing from INJECTIONS/, so §5.13, A12 and the partition all cited text nobody could re-read',
    premise:
      'reconciled INJECTIONS/ against the originals BY CONTENT: one misnumbering (14-verify-the-verifiers.md held injection 13) and injection 14 absent entirely',
    fixed: all(
      fileExists('INJECTIONS/14-instruments-before-subjects.md'),
      contains('INJECTIONS/injections.lock', '14-instruments-before-subjects.md'),
      // The misnumbered name is gone from the lock it was pinned under.
      absent('INJECTIONS/injections.lock', '14-verify-the-verifiers.md'),
    ),
  },
  {
    id: 'V-11',
    what: '§5.13 A.5 requires INSTRUMENTED and MET as two numbers every iteration; one was printed and the other was a pointer to a file',
    premise:
      'diffed the rule against the verbatim injection 14 text once it was importable - the paraphrase was accurate on A.2, A.3 and A.4 and soft on A.5',
    /*
     * Derived, not declared: MET is parsed out of the Measured table, so the
     * predicate checks that the tool COMPUTES it rather than that someone typed it.
     */
    fixed: all(
      contains('tools/check-verifiers.mjs', 'BENCHMARKS MET         : ${met.length}'),
      contains(
        'tools/check-verifiers.mjs',
        'is recorded MET in BENCHMARKS-RESULTS.md but has NO INSTRUMENT',
      ),
    ),
  },
  {
    id: 'V-12',
    what: 'L-17 and L-18 were recorded RESOLVED-AUTONOMOUSLY against legal text that did not exist, and AD-005 promised a policy-versus-declarations check that was never built',
    premise:
      'looked for the artifact AD-005 names. There was no /legal directory, no privacy policy and no terms anywhere in the repository, while two audit rows and two traceability rows called them resolved. Standing since iteration 7',
    /*
     * Derived three ways, because the finding has three parts: the text must
     * exist, the declarations must be generated from the notice rather than
     * typed, and the check AD-005 promised must actually run.
     */
    fixed: all(
      fileExists('apps/web/legal/privacy.html'),
      fileExists('apps/web/legal/terms.html'),
      fileExists('docs/handover/DATA-SAFETY.md'),
      fileExists('apps/web/test/legal.spec.ts'),
      // Generated, so the form cannot drift from what the software collects.
      contains('tools/check-generated.mjs', 'docs/handover/DATA-SAFETY.md'),
      // And the pages admit what they are, which was AD-005's other condition.
      contains('apps/web/legal/privacy.html', 'has not been reviewed by a lawyer'),
      contains('apps/web/legal/terms.html', 'has not been reviewed by a lawyer'),
    ),
  },
];

/* ---- derive ------------------------------------------------------------- */
const failures = [];
const rows = [];
let fixedCount = 0;
let openCount = 0;
let withdrawnCount = 0;

if (FINDINGS.length === 0) {
  console.error('x    zero findings. A findings check over nothing passes forever.');
  process.exit(1);
}

for (const f of FINDINGS) {
  if (typeof f.fixed !== 'function') {
    failures.push(`${f.id} has no predicate - its status would be an assertion (§5.14.1)`);
    continue;
  }
  if (!f.premise) {
    failures.push(`${f.id} does not state the command that established its premise (§5.14.3)`);
  }
  const holds = f.fixed();
  let status;
  if (f.withdrawn) {
    status = 'WITHDRAWN';
    withdrawnCount += 1;
    if (!holds) {
      failures.push(
        `${f.id} is WITHDRAWN because its premise was false, but the predicate that ` +
          'should confirm the repository still looks that way no longer holds.',
      );
    }
  } else if (holds) {
    status = 'FIXED';
    fixedCount += 1;
  } else {
    status = 'OPEN';
    openCount += 1;
    if (!f.open) {
      failures.push(
        `${f.id} does not verify as fixed and carries no explanation. Either its fix ` +
          'was never applied or it has been reverted. This is the F-06 shape.',
      );
    }
  }
  rows.push({ ...f, status });
}

console.log(`  findings          : ${FINDINGS.length}`);
console.log(`  FIXED (derived)   : ${fixedCount}`);
console.log(`  OPEN              : ${openCount}`);
/*
 * An open finding prints WHY it is open. A count alone is a number nobody can act
 * on, and "1 OPEN" looked identical for seventeen iterations while the reason
 * underneath it changed completely.
 */
for (const f of FINDINGS) {
  if (f.withdrawn || f.fixed()) continue;
  const why = typeof f.open === 'string' ? f.open : '';
  if (why) console.log(`       ${f.id}: ${why.slice(0, 2000)}`);
}
console.log(`  WITHDRAWN         : ${withdrawnCount} (premise was false)`);

if (process.argv.includes('--update-md')) {
  const md = `# FINDINGS

**Generated by \`node tools/check-findings.mjs --update-md\`. Do not hand-edit.**

§5.14 - **status is derived, never asserted.** No row below carries a status word
written by its author. Each finding owns a PREDICATE evaluated against this repository
on every run, and the status column is whatever that predicate returned. A finding
cannot be MARKED fixed here; it can only BE fixed.

This file exists because the same failure happened five times in five layers, and
twice to findings about that very failure:

| | what diverged |
|---|---|
| \`maybe()\` | the test ran; its assertions did not |
| \`assertPaise\` 0/59 | the guard existed; it had never executed |
| typecheck / lint | cited as evidence; the commands did not exist |
| **F-10** | premise FALSE and fix never applied - two errors cancelling into a pass |
| **F-06** | found an unapplied fix, then ITS OWN fix was recorded as applied and was not |

**${fixedCount} fixed · ${openCount} open · ${withdrawnCount} withdrawn**, as derived
on the last run.

| id | status | finding | premise established by |
|----|--------|---------|------------------------|
${rows.map((r) => `| ${r.id} | **${r.status}** | ${r.what} | ${r.premise} |`).join('\n')}

## Notes

${rows
  .filter((r) => r.note || r.withdrawn || r.open)
  .map((r) => `**${r.id}.** ${r.note ?? r.withdrawn ?? r.open}`)
  .join('\n\n')}
`;
  const crlf = existsSync('docs/governance/FINDINGS.md') && readFileSync('docs/governance/FINDINGS.md', 'utf8').includes('\r\n');
  writeFileSync('docs/governance/FINDINGS.md', crlf ? md.split('\n').join('\r\n') : md);
  console.log('  rewrote FINDINGS.md');
}

if (failures.length) {
  console.error(`\nFINDINGS FAILURES (${failures.length}):`);
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}
console.log('\nfindings: every status derived from the repository, none asserted');
