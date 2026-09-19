/**
 * §5.9 - DETECTION RATE, not detection.
 *
 * "Can this check fail?" is binary. When I injected a Western-grouping bug the answer
 * was yes - and only 2 of 59 vectors noticed. 2/59 passes §5.1 while revealing a suite
 * 97% blind to an entire class of error. **The ratio is the finding.**
 *
 * A low rate is a finding about the FIXTURES, not the code: the test data is uniform
 * in the dimension the bug lived in. The fix is more varied data, never more tests
 * asserting the same shape.
 *
 * For each invariant below this injects a real violation, runs the suite, counts what
 * noticed, and restores. The restore is verified; nothing is left mutated.
 *
 *   node tools/detection-rate.mjs            run all
 *   node tools/detection-rate.mjs --only=ID  run one
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const only = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];

/** Each mutation names the INVARIANT it violates, so a reader knows what the ratio is of. */
const MUTATIONS = [
  {
    id: 'money-integer-paise',
    invariant: 'Money is an integer number of paise (ADR-003)',
    file: 'packages/formula-engine/src/money.ts',
    find: "if (typeof value !== 'number' || !Number.isInteger(value) || !Number.isSafeInteger(value)) {",
    replace: 'if (false) {',
    // Re-pointed from `vectors` to the unit suite after this probe measured 0/59.
    // The vectors are JSON describing VALID days; a float amount is valid JSON, so
    // no amount of vector data can exercise a rejection path. That needed code.
    suite: 'schema',
    breadth: 'broad',
  },
  {
    id: 'indian-digit-grouping',
    breadth: 'broad',
    invariant: 'Money renders with Indian 2-2-3 grouping (DC-002)',
    file: 'packages/formula-engine/src/money.ts',
    find: '    while (rest.length > 2) {\n      parts.unshift(rest.slice(-2));\n      rest = rest.slice(0, -2);\n    }',
    replace:
      '    while (rest.length > 3) {\n      parts.unshift(rest.slice(-3));\n      rest = rest.slice(0, -3);\n    }',
    suite: 'vectors',
  },
  {
    id: 'withdrawal-excluded-from-profit',
    breadth: 'narrow',
    invariant: 'Withdrawal never touches profit (D3)',
    file: 'packages/formula-engine/src/primary.ts',
    find: "    { key: 'working.expenses_all_modes', sign: '-', amount: totalExpenses(input).value },",
    replace:
      "    { key: 'working.expenses_all_modes', sign: '-', amount: totalExpenses(input).value },\n    { key: 'working.withdrawal_cash', sign: '-', amount: sectionModeTotal(input.entries, 'withdrawal', 'cash') },",
    suite: 'vectors',
  },
  {
    id: 'only-cash-mode-moves-cash',
    breadth: 'narrow',
    invariant: 'Only Cash mode touches the cash equation (D2)',
    file: 'packages/formula-engine/src/primary.ts',
    find: "      key: 'working.cash_expenses',\n      sign: '+',\n      amount: sectionModeTotal(entries, 'expense', 'cash'),",
    replace:
      "      key: 'working.cash_expenses',\n      sign: '+',\n      amount: totalOf(bySection(entries, 'expense')),",
    suite: 'vectors',
  },
  {
    id: 'carry-forward-uses-counted',
    breadth: 'narrow',
    invariant: 'Tomorrow opens on COUNTED cash, never expected (DFD 4.7)',
    file: 'packages/formula-engine/src/index.ts',
    find: "  if (input.day.state !== 'closed') return null;\n  return input.day.countedCash;",
    replace:
      "  if (input.day.state !== 'closed') return null;\n  return computePrimary(input).p3ExpectedCashBalance.value;",
    suite: 'vectors',
  },
  {
    id: 'entries-are-append-only',
    breadth: 'narrow',
    invariant: 'Entries are immutable; no UPDATE or DELETE (architecture 07.04)',
    file: 'packages/schema/src/spec.ts',
    find: '`CREATE TRIGGER entries_no_update\nBEFORE UPDATE ON entries',
    replace: '`CREATE TRIGGER entries_no_update_disabled\nBEFORE UPDATE ON shops',
    suite: 'schema',
  },
  {
    id: 'closed-day-cannot-receive-entries',
    breadth: 'narrow',
    invariant: 'A late outbox cannot land in a closed day (CP-4)',
    file: 'packages/schema/src/spec.ts',
    find: '`CREATE TRIGGER entries_no_insert_into_closed_day\nBEFORE INSERT ON entries',
    replace: '`CREATE TRIGGER entries_no_insert_into_closed_day_disabled\nBEFORE INSERT ON shops',
    suite: 'schema',
  },
  {
    id: 'no-totals-are-stored',
    // Reclassified NARROW after re-measuring at 1/79. The INVARIANT is broad, but
    // this MUTATION is narrow: it makes one function read one specific field name,
    // so only the test poisoning that name can see it - and that test caught it
    // precisely. Breadth describes the mutation's blast radius, not the importance
    // of the rule. See REVIEW.md R-004 for the limitation this exposed in the metric.
    breadth: 'narrow',
    invariant: 'No derived total is ever READ (architecture 06)',
    file: 'packages/formula-engine/src/primary.ts',
    // REWRITTEN after the first version measured 1/64 - it added an unused column,
    // which violates nothing. The invariant is about READING, so the mutation now
    // makes the engine PREFER a cached figure over deriving one. That is the actual
    // defect this rule exists to prevent, and `no-stored-totals.spec.ts` supplies the
    // poisoned cache for it to find.
    find: 'export function netSales(input: DayInput): Figure {\n  const { entries } = input;',
    replace:
      'export function netSales(input: DayInput): Figure {\n  const { entries } = input;\n  const cached = (input.day as unknown as Record<string, number>).cachedNetSales;\n  if (typeof cached === \'number\') {\n    return { value: cached, working: { lines: [], total: cached } };\n  }',
    suite: 'schema',
  },
];

function run(cmd, args) {
  try {
    return { ok: true, out: execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

/** Returns {failed, total} for the named suite. */
function measure(suite) {
  if (suite === 'vectors') {
    const r = run(process.execPath, [
      '--experimental-strip-types',
      'tools/run-vectors.mjs',
      '--out=.detection-tmp.json',
    ]);
    const total = Number(/vector count\s*:\s*(\d+)/.exec(r.out)?.[1] ?? 0);
    const failed = Number(/FAILED (\d+) expectation/.exec(r.out)?.[1] ?? 0);
    return { failed, total };
  }
  const r = run(process.execPath, [
    'node_modules/vitest/vitest.mjs',
    'run',
    '--dir',
    'packages',
  ]);
  const m = /Tests\s+(?:(\d+) failed \| )?(\d+) passed(?:\s+\|\s+(\d+) skipped)?\s+\((\d+)\)/.exec(
    r.out,
  );
  if (!m) return { failed: 0, total: 0, unparsed: true };
  return { failed: Number(m[1] ?? 0), total: Number(m[4] ?? 0) };
}

const results = [];
for (const mut of MUTATIONS) {
  if (only && mut.id !== only) continue;

  const original = readFileSync(mut.file, 'utf8');

  // The working tree is CRLF on Windows while these probes are written with \n.
  // Match the file's own convention rather than normalising the file, which would
  // rewrite every line ending and make the "restore" a lie.
  const crlf = original.includes('\r\n');
  const find = crlf ? mut.find.split('\n').join('\r\n') : mut.find;
  const replace = crlf ? mut.replace.split('\n').join('\r\n') : mut.replace;

  if (!original.includes(find)) {
    results.push({ ...mut, error: 'mutation target not found - the code has moved' });
    continue;
  }

  writeFileSync(mut.file, original.replace(find, replace));
  let m;
  try {
    m = measure(mut.suite);
  } finally {
    writeFileSync(mut.file, original); // ALWAYS restore
    if (readFileSync(mut.file, 'utf8') !== original) {
      console.error(`FATAL: could not restore ${mut.file}`);
      process.exit(2);
    }
  }
  results.push({ ...mut, ...m });
}

/* ---- report ------------------------------------------------------------ */
console.log('\n  DETECTION RATE (§5.9) - inject the violation, measure what notices\n');
const pad = (s, n) => String(s).padEnd(n);
let flagged = 0;
for (const r of results) {
  if (r.error) {
    console.log(`  ${pad(r.id, 36)} ERROR     ${r.error}`);
    flagged += 1;
    continue;
  }
  const rate = r.total ? r.failed / r.total : 0;
  // The denominator is the WHOLE suite. For a NARROW invariant - one only a few
  // tests can possibly exercise - a low ratio is expected and says nothing about
  // fixture diversity. The 2/59 grouping result mattered because grouping is BROAD:
  // every money render should have been able to catch it, and almost none could.
  const flag =
    r.failed === 0 ? 'UNDETECTED' : r.breadth === 'broad' && rate < 0.2 ? 'LOW-BROAD' : 'ok';
  if (flag !== 'ok') flagged += 1;
  console.log(
    `  ${pad(r.id, 36)} ${pad(`${r.failed}/${r.total}`, 9)} ${pad((rate * 100).toFixed(1) + '%', 7)} ${pad(r.breadth ?? '-', 7)} ${pad(flag, 11)} ${r.invariant}`,
  );
}

console.log(
  '\n  UNDETECTED = the suite cannot see this violation at all. A defect.' +
    '\n  LOW (<20%) = a finding about the FIXTURES: the data is uniform in the dimension' +
    '\n               the bug lived in. Diversify the data, do not add tests asserting' +
    '\n               the same shape (§5.9.2).\n',
);

if (results.some((r) => r.error || r.failed === 0)) {
  console.error('DETECTION FAILURES: an invariant is unprotected, or a probe has rotted.');
  process.exit(1);
}
console.log(`every invariant is detected; ${flagged} flagged for fixture diversity`);
