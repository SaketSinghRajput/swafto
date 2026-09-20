/**
 * THE TASK GRAPH. Definitions only - TASKS.md is pure output of gen-tasks.mjs.
 *
 * A.2 · THE ID IS PERMANENT. THE ORDER IS DERIVED.
 * An id is assigned once and never reused, never renumbered, never reordered. The
 * ORDER column is recomputed by topological sort on every generation, so inserting a
 * task changes the order and changes no id - and every reference in BUILD_LOG stays
 * valid for ever. Merging the two concepts is what makes a numbered plan start lying
 * the first time it changes.
 *
 * A.1 · EVERY PREDICATE IS REAL. A task whose completion cannot be expressed as a
 * predicate is not a task, it is a wish. The escape hatch is `judgement`, which
 * carries the iteration it was made in and expires under §5.15 - it is not a way to
 * avoid writing a test.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\r\n').join('\n') : '');

/* ---- predicate helpers -------------------------------------------------- */
export const fileExists = (f) => () => existsSync(f);
export const contains = (f, s) => () => read(f).includes(s);
export const jsonCount = (f, key, min) => () => {
  if (!existsSync(f)) return false;
  const j = JSON.parse(read(f));
  const arr = Array.isArray(j) ? j : (j[key] ?? []);
  return arr.length >= min;
};

/**
 * WHAT "THE PACKAGE EXPORTS THIS" ACTUALLY MEANS.
 *
 * A barrel re-exports with `export * from './input.ts'`, so a substring search for a
 * function name inside index.ts finds nothing even when the name is squarely part of
 * the public surface. P-008 was held false for exactly that reason while all seven
 * parsers existed and were exported - the predicate was reading the wrong file.
 *
 * This follows the star re-exports one level and requires an actual export
 * DECLARATION for every name, which is strictly more than the substring test asked:
 * seven names instead of one, and a declaration instead of any mention.
 */
export const packageExports =
  (barrel, ...names) =>
  () => {
    const src = read(barrel);
    if (!src) return false;
    const dir = barrel.slice(0, barrel.lastIndexOf('/'));
    const bodies = [
      src,
      ...[...src.matchAll(/export \* from '\.\/([^']+)'/g)].map((m) => read(join(dir, m[1]))),
    ];
    return names.every((n) =>
      bodies.some((b) => b.includes(`export function ${n}(`) || b.includes(`export const ${n} `)),
    );
  };

/**
 * THE COMMITTED SCREEN SET.
 *
 * PROJECTION owns the SELECTION - "A.3 items 1 to 3 plus opening cash" after the
 * iteration-26 re-cut. The build map owns the NAMES. Neither states the ids, because
 * PROJECTION describes its items in prose ("the four form archetypes"), so mapping
 * that prose onto build-map ids is the one judgement in this file. It is recorded as
 * a judgement rather than presented as derived, and gen-tasks asserts every id below
 * exists in the build map - so a typo or a renamed screen fails the build instead of
 * silently shrinking the committed set.
 */
export const COMMITTED_SCREENS = {
  made: 33,
  from: 'PROJECTION.md "The re-cut" · ids resolved against the build map',
  ids: [
    'T7', // Form A - first, because it is the hardest
    'T1', // Today, the open day - THE FRONT DOOR. Added by the product review at
          //     iteration 33: the committed set had no screen that renders when the
          //     app is opened. Second, so an end-to-end session exists early.
    'T8', // Form B
    'T9', // Form C
    'T10', // Form D
    'T5', // the nine-section day-close list
    'T11', // cash check · counting
    'T12', // cash check · difference
    // T13 (cash check - balanced) was REMOVED by the product review to keep the
    // total at ten. Cheapest screen in the set to lose: three lines of content, T12
    // owns the difference case, and T14 shows the same balanced figures.
    'T14', // day closed summary
    'T6', // opening cash - pulled into the committed set by injection 21
  ],
};

/**
 * C.2 · THE §B.6 BAR AS EIGHT CHILDREN.
 *
 * "Build Form A" has no honest predicate: it gets ticked when somebody feels it is
 * done, which is how a build arrives at its ceiling with nine screens that mostly
 * work. These eight each have a real test, so the parent cannot be ticked by feel.
 * The parent is DONE only when all eight are.
 */
export const SCREEN_CHILDREN = [
  {
    key: 'wired',
    title: 'every displayed figure traced to the engine through the real store',
    why: 'A figure that is not wired is a figure that will not move when the day does.',
    predicate: (id, cmp) => contains(`apps/mobile/src/screens/${cmp}.test.tsx`, 'mutates the store'),
  },
  {
    key: 'fixtures',
    title: 'renders against BOTH fixtures, canonical and adversarial',
    why: 'The adversarial shop is where long party names and lakh-scale figures break a layout.',
    predicate: (id, cmp) => contains(`apps/mobile/src/screens/${cmp}.test.tsx`, 'adversarial'),
  },
  {
    key: 'states',
    title: 'all four states exist: loading, empty, error, loaded',
    why: 'A screen with no empty state shows a blank panel on a shop first day.',
    predicate: (id, cmp) => contains(`apps/mobile/src/screens/${cmp}.test.tsx`, 'four states'),
  },
  {
    key: 'i18n',
    title: 'passes in three languages, longest-string mode, maximum font scale',
    why: 'Odia is the longest of the three and the one nobody on this build can proofread.',
    predicate: (id, cmp) => contains(`apps/mobile/src/screens/${cmp}.test.tsx`, 'longest string'),
  },
  {
    key: 'a11y',
    title: 'contrast, touch target and text size checks pass for this screen',
    why: 'Shop daylight and one thumb. The values come from the registry, never from the test.',
    predicate: (id, cmp) =>
      contains(`apps/mobile/src/screens/${cmp}.test.tsx`, 'TOUCH_TARGET_MIN_DP'),
  },
  {
    key: 'keypad',
    title: 'keypad present only if this is an entry screen, and never beside a bottom nav',
    why: 'That pair has been specified wrongly before; a per-screen assertion makes it visible.',
    predicate: (id, cmp) => contains(`apps/mobile/src/screens/${cmp}.test.tsx`, 'keypad'),
  },
  {
    key: 'shots',
    title: 'screenshots captured for both fixtures and committed',
    why: 'The contact sheet is the only artifact a human can judge by looking.',
    predicate: (id) => fileExists(`docs/contact-sheet/${id}-canonical.png`),
  },
  {
    key: 'trace',
    title: 'its TRACEABILITY row names the feature IDs it displays',
    why: 'A screen nobody can trace to a feature is a screen nobody can verify.',
    /*
     * WORD-BOUNDED. A substring test ticks T1 whenever T10 through T17 are
     * mentioned, which is a box nobody can check - the exact defect this file
     * exists to prevent. TRACEABILITY is feature-keyed, so the honest test is that
     * at least one feature row names this screen in its Screen column.
     */
    predicate: (id) => () => new RegExp(`\\b${id}\\b`).test(read('docs/spec/TRACEABILITY.md')),
  },
];

/* ------------------------------------------------------------------ *
 * C.1 · PREP - what stands between here and the first screen
 * ------------------------------------------------------------------ */
export const TASKS = [
  {
    id: 'P-001',
    title: 'Grow rejects.json to cover the rejection arms the corpus cannot reach',
    why: 'Shape 1 of the B3 gap. Without it the invalid-input branches are never executed at all.',
    blockedBy: [],
    predicate: jsonCount('packages/formula-engine/rejects.json', 'cases', 60),
    benchmarks: ['B3'],
    estimate: { iterations: 1, made: 29 },
  },
  {
    id: 'P-002',
    title: 'Re-measure B3 and name the shape of every remaining uncovered line',
    why: 'The gap is a defect surface, not a ledger. Each uncovered line is shape 1, 2 or 3.',
    blockedBy: ['P-001'],
    predicate: contains(
      'docs/benchmarks/BENCHMARKS-RESULTS.md',
      'shape of every remaining uncovered line',
    ),
    benchmarks: ['B3'],
    estimate: { iterations: 1, made: 29 },
  },
  {
    id: 'P-003',
    title: 'Add n=0, n=1 and n>=2 cases for every aggregate in the engine',
    why: 'stdevMoney was invisible at n<=1 by construction. That is a property of aggregates, not a quirk.',
    blockedBy: [],
    predicate: contains('packages/formula-engine/test/money.spec.ts', 'population standard deviation'),
    benchmarks: ['B4'],
    estimate: { iterations: 1, made: 29 },
  },
  {
    id: 'P-004',
    title: 'Build the canonical fixture shop',
    why: 'Every screen renders against it. Without it no screen test can assert a figure.',
    blockedBy: [],
    predicate: fileExists('packages/fixtures/src/canonical.ts'),
    benchmarks: [],
    estimate: { iterations: 1, made: 29 },
  },
  {
    id: 'P-005',
    title: 'Build the adversarial fixture shop',
    why: 'Longest party names, lakh-scale figures, a gap day, a correction against a closed day.',
    blockedBy: [],
    predicate: fileExists('packages/fixtures/src/adversarial.ts'),
    benchmarks: [],
    estimate: { iterations: 1, made: 29 },
  },
  {
    id: 'P-006',
    title: 'Scaffold the React Native project with design tokens and the bundled fonts',
    why: 'Nothing renders until this exists, and ten screens on an unchecked token set is ten screens to redo.',
    blockedBy: [],
    predicate: fileExists('apps/mobile/package.json'),
    benchmarks: ['B24'],
    estimate: { iterations: 1, made: 29 },
  },
  {
    id: 'P-009',
    title: 'Build the <Money> component and a check that no bare <Text> renders a figure',
    why: 'DC-005: Anek Odia digits are proportional, so a money column does not line up without tnum. Solvable one Text at a time, which is the danger - ADR-018.',
    blockedBy: ['P-006'],
    predicate: contains('apps/mobile/src/components/Money.tsx', 'tabular-nums'),
    benchmarks: ['B32'],
    estimate: { iterations: 1, made: 33 },
  },
  {
    id: 'P-007',
    title: 'Wire the local store so a screen reads real entries through the engine',
    why: 'A screen fed a literal is a mock. Every screen wired-figure predicate depends on this.',
    blockedBy: ['P-006'],
    predicate: fileExists('apps/mobile/src/store/index.ts'),
    benchmarks: [],
    estimate: { iterations: 1, made: 29 },
  },
  {
    id: 'P-008',
    title: 'Build the seven input parsers TRACEABILITY already names',
    why: 'V-7: TRACEABILITY names parseSalesEntry and six others, none exists. No entry screen works without them.',
    blockedBy: [],
    predicate: packageExports(
      'packages/formula-engine/src/index.ts',
      'parseSalesEntry',
      'parsePurchaseEntry',
      'parseExpenseEntry',
      'parseCollectionEntry',
      'parsePartyPaymentEntry',
      'parseWithdrawalEntry',
      'captureCountedCash',
    ),
    benchmarks: ['B39'],
    estimate: { iterations: 2, made: 29 },
  },

  /* ---------------------------------------------------------------- *
   * C.4 · verification and close-out
   * ---------------------------------------------------------------- */
  {
    id: 'Z-001',
    title: 'Run the adversary pass at its §6.1 cadence',
    why: 'An empty adversary pass is not reassurance; the cadence exists so it is not skipped when busy.',
    blockedBy: [],
    judgement: { what: 'whether the last pass was thorough rather than merely performed', made: 29 },
    benchmarks: [],
    estimate: { iterations: 1, made: 29 },
  },
  {
    id: 'Z-002',
    title: 'Pre-stop check at iteration 35',
    why: 'The last point at which the screen set can be re-cut and the cut still mean anything.',
    blockedBy: [],
    predicate: contains('docs/governance/BUILD_LOG.md', 'Iteration 35'),
    benchmarks: [],
    estimate: { iterations: 1, made: 29 },
  },
  {
    id: 'Z-003',
    title: 'Final full verification: check:all, prove, responds, mutation, vectors on both runtimes',
    why: 'The handover claims a state. This is the command set that makes the claim checkable.',
    blockedBy: ['Z-002'],
    predicate: contains('docs/governance/BUILD_LOG.md', 'FINAL VERIFICATION'),
    benchmarks: [],
    estimate: { iterations: 1, made: 29 },
  },
  {
    id: 'Z-004',
    title: 'Write the handover report with its six required sections',
    why: 'The build stops at the ceiling regardless. This is what makes the work usable by someone else.',
    blockedBy: ['Z-003'],
    predicate: fileExists('docs/handover/HANDOVER.md'),
    benchmarks: [],
    estimate: { iterations: 1, made: 29 },
  },
];

/**
 * C.3 · THE INSTRUMENT CLUSTER.
 *
 * §5.13 makes every one of these due in the SAME iteration the first screen renders,
 * which is why they are real tasks with real estimates rather than an afterthought.
 * Per C.3 each predicate is threefold - the instrument exists, it fails on a planted
 * defect (§5.12), and it moves when the world moves (§5.16) - so the predicate is
 * "named in the verifier inventory", which is the one place all three are recorded.
 */
export const INSTRUMENTS = [
  ['I-001', 'B26', 'contrast ratio on every rendered screen'],
  ['I-002', 'B27', 'white-on-marigold, the one combination that fails by default'],
  ['I-003', 'B28', 'touch target size'],
  ['I-004', 'B29', 'body text size'],
  ['I-005', 'B30', 'missing i18n keys in any of the three languages'],
  ['I-006', 'B31', 'layout overflow at maximum font scale'],
  ['I-007', 'B32', 'non-Latin numerals leaking into a money figure'],
  ['I-008', 'B36', 'amounts, names or phone numbers in client logs'],
  ['I-009', 'B24', 'APK size, once one builds'],
  ['I-010', 'B14', 'cold start on the target handset, the first of the performance set'],
];
