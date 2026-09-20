/**
 * TASKS.md - A CHECKLIST THAT TICKS ITSELF.
 *
 * A checklist whose boxes are ticked by hand is the same defect this build has now
 * found seven times in seven layers: a status asserted rather than derived. It would
 * be the friendliest-looking instance yet - a tidy file full of [x] that nobody can
 * check. So every box here is rendered from a PREDICATE evaluated against the
 * repository at generation time, and no task is ever ticked by a person.
 *
 * A.2 - THE ID IS PERMANENT, THE ORDER IS DERIVED. Ids never move. ORDER is a
 * topological sort over the dependency graph, recomputed every run, so inserting a
 * task renumbers nothing and every reference in BUILD_LOG stays valid.
 *
 * A.3 - ORDER COMES FROM DEPENDENCIES, NOT PREFERENCE. Ties between genuinely
 * independent tasks are broken by the standing priority order rather than by taste.
 *
 *   node tools/gen-tasks.mjs           regenerate TASKS.md
 *   node tools/gen-tasks.mjs --check   D.2's five failure modes
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import {
  TASKS,
  INSTRUMENTS,
  SCREEN_CHILDREN,
  COMMITTED_SCREENS,
  contains,
} from './tasks.data.mjs';

const read = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\r\n').join('\n') : '');
const failures = [];

/**
 * A.3's tie-break, in force across the whole build. Lower wins. It applies only
 * where two tasks are genuinely independent - a dependency always outranks it,
 * because "it felt more urgent" is the judgement this column exists to remove.
 *
 *   correctness of money · the shopkeeper's trust · reversibility ·
 *   works offline and on a weak device · simplicity · speed of building
 */
const tieBreak = (t) => {
  if (t.benchmarks.includes('B3') || t.benchmarks.includes('B4')) return 0; // money correctness
  if (t.group === 'HUMAN') return 1; // long lead time, blocks shipping
  if (t.group === 'PREP') return 2;
  if (t.group === 'INSTRUMENT') return 3;
  if (t.group === 'SCREEN') return 4;
  return 5;
};

/* ---- build the full task set ------------------------------------------- */

const screenNames = (() => {
  const text = readFileSync('docs/spec/source/SWAFTO-Retail-Desk-Build-Map.txt', 'latin1');
  const m = new Map();
  for (const line of text.split(/\r?\n/)) {
    const x = /^\s{0,6}([TPRX])(\d{1,2})\s{2,}(\S.*?)\s{2,}/.exec(line);
    if (x && !m.has(x[1] + x[2])) m.set(x[1] + x[2], x[3].trim());
  }
  return m;
})();

const all = TASKS.map((t) => ({ ...t, group: t.id.startsWith('Z') ? 'CLOSEOUT' : 'PREP' }));

/* C.2 · each committed screen becomes a parent plus the eight §B.6 children. */
let prevScreen = null;
for (const [i, sid] of COMMITTED_SCREENS.ids.entries()) {
  const name = screenNames.get(sid);
  if (!name) {
    failures.push(
      `the committed set names ${sid} and the build map has no such screen. The set ` +
        'would silently shrink; fix the id or the map rather than dropping the row.',
    );
    continue;
  }
  const pid = `S-${String((i + 1) * 10).padStart(3, '0')}`;
  const childIds = [];
  for (const c of SCREEN_CHILDREN) {
    const cid = `${pid}-${c.key.toUpperCase()}`;
    childIds.push(cid);
    all.push({
      id: cid,
      title: `${sid} · ${c.title}`,
      why: c.why,
      // A child cannot start before the app scaffold and the store exist.
      blockedBy: ['P-006', 'P-007'],
      predicate: c.predicate(sid, sid),
      benchmarks: [],
      estimate: { iterations: 0, made: 29 },
      group: 'SCREEN',
      parent: pid,
    });
  }
  all.push({
    id: pid,
    title: `Build ${sid} — ${name}`,
    why: 'Half a screen is not a screen. This parent is DONE only when all eight children are.',
    // Screens run in the recorded sequence - Form A first because it is hardest -
    // so each waits on its own children AND on the screen before it.
    blockedBy: [...childIds, ...(prevScreen ? [prevScreen] : [])],
    predicate: null,
    rollup: childIds,
    benchmarks: ['B38'],
    estimate: { iterations: 1, made: 29 },
    group: 'SCREEN',
  });
  prevScreen = pid;
}

/* C.3 · the instrument cluster, every one due the moment a screen renders. */
for (const [id, bm, what] of INSTRUMENTS) {
  all.push({
    id,
    title: `Instrument ${bm} — ${what}`,
    why: `§5.13: ${bm}'s subject exists the moment a screen renders, so its instrument is due then, not later.`,
    blockedBy: ['S-010'],
    /*
     * C.3's threefold predicate - it exists, it fails on a planted defect, it
     * responds to a known change - is settled in one place: the generated partition,
     * where a benchmark reads "instrumented" with a verifier and NO caveat.
     *
     * The first version tested for `benchmarks: ['B24']` in the inventory and ticked
     * I-009 as DONE, because the FONT verifier carries B24 while measuring the font's
     * share of the budget. No APK exists. A box ticked by a substring is precisely
     * the defect this file exists to prevent, so the test is now the partition row
     * with its caveat column empty.
     */
    predicate: () =>
      new RegExp(`^\\|\\s*${bm}\\s*\\|\\s*instrumented\\s*\\|[^|]+\\|\\s*-\\s*\\|`, 'm').test(
        read('docs/benchmarks/BENCHMARKS-RESULTS.md'),
      ),
    benchmarks: [bm],
    estimate: { iterations: 0, made: 29 },
    group: 'INSTRUMENT',
  });
}

/* C.5 · human tasks, REFERENCED and never duplicated. */
for (const m of read('docs/handover/HUMAN-ACTIONS.md').matchAll(
  /^\|\s*(H\d+)\s*\|([^|]+)\|([^|]+)\|/gm,
)) {
  all.push({
    id: `HU-${m[1].slice(1).padStart(3, '0')}`,
    title: `${m[1]} — see HUMAN-ACTIONS.md`,
    why: 'HUMAN-ACTIONS.md owns the content. This row records only that something waits on a person.',
    blockedBy: [],
    predicate: null,
    human: m[1],
    benchmarks: [],
    estimate: { iterations: 0, made: 29 },
    group: 'HUMAN',
  });
}

/* ---- D.2 · the five failure modes -------------------------------------- */

const byId = new Map();
for (const t of all) {
  if (byId.has(t.id)) {
    failures.push(`duplicate id ${t.id}. An id is assigned once and never reused (A.2).`);
  }
  byId.set(t.id, t);
}

for (const t of all) {
  if (!t.predicate && !t.rollup && !t.judgement && t.group !== 'HUMAN') {
    failures.push(
      `${t.id} has no predicate and is not marked JUDGEMENT. A task whose completion ` +
        'cannot be expressed as a predicate is not a task, it is a wish (A.1).',
    );
  }
  for (const b of t.blockedBy) {
    if (!byId.has(b)) failures.push(`${t.id} is blocked by ${b}, which does not exist`);
    else if (byId.get(b).group === 'HUMAN') {
      failures.push(
        `${t.id} is BLOCKED BY the human task ${b}. Human tasks are DEFERRED by ` +
          'definition and must never make anything in the build unable to proceed (C.5).',
      );
    }
  }
}

/* ---- derive state, then sort ------------------------------------------- */

const done = new Map();
const isDone = (t, seen = new Set()) => {
  if (done.has(t.id)) return done.get(t.id);
  if (seen.has(t.id)) return false;
  seen.add(t.id);
  let v;
  if (t.rollup) v = t.rollup.every((c) => byId.has(c) && isDone(byId.get(c), seen));
  else if (t.predicate) v = Boolean(t.predicate());
  else v = false;
  done.set(t.id, v);
  return v;
};
for (const t of all) isDone(t);

const stateOf = (t) => {
  if (t.group === 'HUMAN') return 'DEFERRED';
  if (done.get(t.id)) return 'DONE';
  return t.blockedBy.every((b) => done.get(b)) ? 'READY' : 'BLOCKED';
};

/**
 * Kahn's algorithm. A cycle is a hard failure rather than a best effort: an order
 * that silently drops a task is worse than no order at all.
 */
const indeg = new Map(all.map((t) => [t.id, 0]));
const out = new Map(all.map((t) => [t.id, []]));
for (const t of all) {
  for (const b of t.blockedBy) {
    if (!byId.has(b)) continue;
    indeg.set(t.id, indeg.get(t.id) + 1);
    out.get(b).push(t.id);
  }
}
const frontier = all.filter((t) => indeg.get(t.id) === 0);
const sorted = [];
while (frontier.length) {
  frontier.sort((a, b) => tieBreak(a) - tieBreak(b) || a.id.localeCompare(b.id));
  const t = frontier.shift();
  sorted.push(t);
  for (const n of out.get(t.id)) {
    indeg.set(n, indeg.get(n) - 1);
    if (indeg.get(n) === 0) frontier.push(byId.get(n));
  }
}
if (sorted.length !== all.length) {
  const stuck = all.filter((t) => !sorted.includes(t)).map((t) => t.id);
  failures.push(`CYCLE in the dependency graph. Unorderable: ${stuck.join(', ')}`);
}

/* BLOCKS is derived, never typed twice. */
const blocks = new Map(all.map((t) => [t.id, []]));
for (const t of all) for (const b of t.blockedBy) if (blocks.has(b)) blocks.get(b).push(t.id);

/** Transitive, so "blocking the most others" names the real critical path. */
const reach = (id, seen = new Set()) => {
  for (const n of blocks.get(id) ?? []) {
    if (seen.has(n)) continue;
    seen.add(n);
    reach(n, seen);
  }
  return seen.size;
};

const readyTasks = sorted.filter((t) => stateOf(t) === 'READY');
const blockedTasks = sorted.filter((t) => stateOf(t) === 'BLOCKED');
const doneCount = sorted.filter((t) => stateOf(t) === 'DONE').length;
const next = readyTasks[0];
const worst = sorted
  .filter((t) => stateOf(t) !== 'DONE' && t.group !== 'HUMAN')
  .map((t) => [t.id, reach(t.id)])
  .sort((a, b) => b[1] - a[1])[0];

const box = (t) => (stateOf(t) === 'DONE' ? '[x]' : '[ ]');
const row = (t, i) =>
  `| ${String(i + 1).padStart(3, '0')} | \`${t.id}\` | ${box(t)} ${t.title} | ${t.why} | ${
    t.blockedBy.length ? t.blockedBy.map((b) => `\`${b}\``).join(' ') : 'NONE'
  } | ${blocks.get(t.id).length || '-'} | ${stateOf(t)} | ${t.benchmarks.join(' ') || '-'} | ${
    t.estimate.iterations ? `${t.estimate.iterations} (made at ${t.estimate.made})` : '-'
  } |`;

const head = [
  '| ORDER | ID | TASK | WHY | BLOCKED BY | BLOCKS | STATE | BENCHMARKS | ESTIMATE |',
  '|---|---|---|---|---|---|---|---|---|',
];
const groupTable = (g) => {
  const rows = sorted.filter((t) => t.group === g);
  return [...head, ...rows.map((t) => row(t, sorted.indexOf(t)))].join('\n');
};

const md = `<!-- GENERATED by tools/gen-tasks.mjs. Do not edit by hand - every box is
     derived from a predicate, so a hand-edited tick is a claim no predicate
     supports, and check:tasks will catch it. Definitions live in
     tools/tasks.data.mjs. -->

# TASKS

Every checkbox below is **derived**. No task is ticked by hand; each box is rendered
from a predicate evaluated against this repository when the file was generated.

**ORDER is derived and the ID is not.** Ids are permanent — inserting a task changes
the order column and changes no id, so a reference in BUILD_LOG stays valid for ever.
ORDER is a topological sort over the dependency graph, recomputed every run.

---

**NEXT:** ${next ? `\`${next.id}\` — ${next.title}` : 'nothing is READY'}

**READY NOW:** ${readyTasks.length}${
  readyTasks.length ? ` — ${readyTasks.map((t) => `\`${t.id}\``).join(' ')}` : ''
}

**BLOCKED:** ${blockedTasks.length}${
  worst ? `, and the one blocking the most others is \`${worst[0]}\` — ${worst[1]} downstream` : ''
}

---

## Prep — what stands between here and the first screen

${groupTable('PREP')}

## Screens — the committed set

${COMMITTED_SCREENS.ids.length} screens, each a parent with the §B.6 bar as eight
children. **The parent is DONE only when all eight children are**, which is what makes
"half a screen is not a screen" enforceable rather than a slogan.

Selection from PROJECTION's re-cut; ids resolved against the build map, a judgement
made at iteration ${COMMITTED_SCREENS.made}.

${groupTable('SCREEN')}

## Instruments — due the moment anything renders

§5.13 makes every one of these due in the same iteration as the first screen. Each
predicate is threefold: the instrument exists, it fails on a planted defect (§5.12),
and it moves when the world provably moves (§5.16).

${groupTable('INSTRUMENT')}

## Verification and close-out

${groupTable('CLOSEOUT')}

## Human — referenced, never duplicated

[HUMAN-ACTIONS.md](docs/handover/HUMAN-ACTIONS.md) owns the content. These rows record
only that something waits on a person. They are **DEFERRED by definition and never
BLOCKED**, and the generator fails if one appears in another task's blockers — nothing
in the build may become unable to proceed because a human has not acted.

${groupTable('HUMAN')}

---

*Regenerate with \`npm run tasks\`. Verify with \`npm run check:tasks\`.*
`;

/* ---- --check ------------------------------------------------------------ */

if (process.argv.includes('--check')) {
  if (!existsSync('TASKS.md')) {
    console.error('x    TASKS.md does not exist. Run `npm run tasks`.');
    process.exit(1);
  }
  if (read('TASKS.md').trim() !== md.trim()) {
    failures.push(
      'TASKS.md differs from a fresh generation. Either it was edited by hand - which ' +
        'is how a box gets ticked that no predicate supports - or a predicate changed ' +
        'and it was not regenerated. Run `npm run tasks`.',
    );
  }
  console.log(`  tasks                  : ${all.length}`);
  console.log(`  done / ready / blocked : ${doneCount} / ${readyTasks.length} / ${blockedTasks.length}`);
  console.log(
    `  dependency edges       : ${[...blocks.values()].reduce((a, b) => a + b.length, 0)}`,
  );
  if (failures.length) {
    console.error(`\nTASKS FAILURES (${failures.length}):`);
    for (const f of failures) console.error(`  x    ${f}`);
    process.exit(1);
  }
  console.log('\ntasks: every box derived, no cycle, no duplicate id, no human blocker');
  process.exit(0);
}

if (failures.length) {
  console.error(`\nCANNOT GENERATE TASKS.md (${failures.length}):`);
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}

const prev = existsSync('TASKS.md') ? readFileSync('TASKS.md', 'utf8') : '';
writeFileSync('TASKS.md', prev.includes('\r\n') ? md.split('\n').join('\r\n') : md);
console.log(`  tasks                  : ${all.length}`);
console.log(
  `  screens                : ${COMMITTED_SCREENS.ids.length} parents x ${SCREEN_CHILDREN.length} children`,
);
console.log(`  done / ready / blocked : ${doneCount} / ${readyTasks.length} / ${blockedTasks.length}`);
console.log(`  NEXT                   : ${next ? next.id : 'nothing READY'}`);
console.log('\nwrote TASKS.md');
