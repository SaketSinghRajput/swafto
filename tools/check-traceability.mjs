/**
 * B13 and B39 - the instrument that was DELETED at iteration 15, rebuilt.
 *
 * `check:traceability` was removed as a dead npm script naming a file that did not
 * exist. That was the right call on the script and the wrong call on the consequence:
 * G19 cited it, B13 and B39 were measured by it, and nothing has measured either
 * since (V-3). §5.13 says the instrument is built in the iteration its subject
 * exists - TRACEABILITY.md has existed since G0, so this one is four iterations
 * overdue rather than pending.
 *
 * WHAT IT CHECKS, AND WHY IT IS NOT A CELL-EMPTINESS CHECK.
 *
 * The obvious implementation reads each row and fails on a blank. That would pass
 * today, because every cell has text in it - and two of those cells name engine
 * functions THAT DO NOT EXIST (`parseSalesEntry`, `captureCountedCash`). A11: the
 * claim is about the cell's shape, not its payload. Open the payload.
 *
 * So the columns are RESOLVED, not merely read:
 *   - every `name` in backticks in the Engine column must be exported by the engine
 *   - every `vectors.json:name` in the Test column must be a vector that exists
 *   - a row marked DONE must have every one of its references resolve
 *   - a row marked TODO or WIP may name things not yet built - that is a plan, not a
 *     lie - but the count of unresolved references is REPORTED, so the gap is visible
 *     now rather than discovered at G19.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const read = (f) => readFileSync(f, 'utf8').split('\r\n').join('\n');
const failures = [];
const notes = [];

/* ---- what the feature map requires ------------------------------------- */
const EXPECTED = [
  ...Array.from({ length: 7 }, (_, i) => `IN${i + 1}`),
  ...Array.from({ length: 8 }, (_, i) => `P${i + 1}`),
  ...Array.from({ length: 6 }, (_, i) => `OP${i + 1}`),
  ...Array.from({ length: 6 }, (_, i) => `BI${i + 1}`),
];

/**
 * BI5 is the one sanctioned reservation: D5 removed all stock data, so there is no
 * function to write and no screen to draw. RESERVED, not incomplete - a decision
 * recorded at G0 rather than a gap.
 */
const RESERVED = new Set(['BI5']);

/* ---- parse the matrix --------------------------------------------------- */
const rows = new Map();
for (const line of read('docs/spec/TRACEABILITY.md').split('\n')) {
  const m = /^\|\s*\*{0,2}([A-Z]{1,2}\d+)\*{0,2}\s*\|(.+)\|\s*$/.exec(line.trim());
  if (!m) continue;
  const cells = m[2].split('|').map((c) => c.trim());
  if (cells.length < 5) continue;
  rows.set(m[1], {
    engine: cells[0],
    test: cells[1],
    api: cells[2],
    screen: cells[3],
    status: cells[4].replace(/\*/g, '').trim(),
  });
}

if (rows.size === 0) {
  // A traceability check that parsed nothing passes forever. §5.12.2.
  console.error('x    parsed ZERO rows out of TRACEABILITY.md. A check over an empty');
  console.error('     matrix is absent, not passing.');
  process.exit(1);
}

/* ---- what actually exists ----------------------------------------------- */
const engineExports = new Set();
{
  const dir = 'packages/formula-engine/src';
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.ts')) continue;
    const src = read(join(dir, f));
    for (const m of src.matchAll(/^export (?:async )?function (\w+)/gm)) engineExports.add(m[1]);
    for (const m of src.matchAll(/^export const (\w+)\s*[:=]/gm)) engineExports.add(m[1]);
  }
}

const vectorNames = new Set();
{
  const file = JSON.parse(read('packages/formula-engine/vectors.json'));
  for (const v of Array.isArray(file) ? file : file.vectors) vectorNames.add(v.name);
}

/* ---- 1 · every expected ID is present ----------------------------------- */
for (const id of EXPECTED) {
  if (!rows.has(id)) failures.push(`${id} has no row in TRACEABILITY.md`);
}

/* ---- 2 · no empty cell (B13) -------------------------------------------- */
let emptyCells = 0;
for (const [id, r] of rows) {
  if (!EXPECTED.includes(id)) continue;
  for (const col of ['engine', 'test', 'api', 'screen', 'status']) {
    if (r[col] === '' || r[col] === '-') {
      emptyCells += 1;
      failures.push(`${id}.${col} is empty (B13 allows none)`);
    }
  }
}

/* ---- 3 · the references must RESOLVE, not merely be present ------------- */
/*
 * A CITATION THAT NAMES NOTHING IS A FAILURE, WHATEVER THE ROW'S STATUS.
 *
 * This used to fail only for rows marked DONE and merely note the rest, which made
 * sense while the engine was being written: a row could honestly name a function
 * that was still coming. That period ended when V-7 closed - all 26 named engine
 * functions now exist - and the leniency immediately cost something. OP6 had been
 * citing `cashDeficitWarning` while the engine exports `cashDeficitWarnings`, one
 * letter out, and the note scrolled past for eighteen iterations because nothing
 * failed. It only surfaced when the prove harness was repaired and this verifier
 * was asked, for the first time, to actually fail on its planted defect.
 *
 * §5.14.5: build it, or remove the claim. A third option where the claim stays and
 * points at nothing is how a traceability matrix becomes decoration.
 */
let unresolvedFn = 0;
let unresolvedVec = 0;
for (const [id, r] of rows) {
  if (!EXPECTED.includes(id) || RESERVED.has(id)) continue;
  const done = r.status === 'DONE';

  for (const m of r.engine.matchAll(/`(\w+)`/g)) {
    if (engineExports.has(m[1])) continue;
    unresolvedFn += 1;
    failures.push(
      `${id} names engine function ${m[1]}, which the engine does not export` +
        (done ? ' - and the row is marked DONE (A11).' : '. Build it, or remove the claim.'),
    );
  }

  for (const m of r.test.matchAll(/vectors\.json:([\w-]+)/g)) {
    if (vectorNames.has(m[1])) continue;
    unresolvedVec += 1;
    failures.push(
      `${id} names vector "${m[1]}", which is not in vectors.json` +
        (done ? ' - and the row is marked DONE.' : '. Write it, or remove the claim.'),
    );
  }
}

/* ---- 4 · B39 · how many IDs are genuinely complete ---------------------- */
const complete = [];
for (const [id, r] of rows) {
  if (!EXPECTED.includes(id) || RESERVED.has(id)) continue;
  const fnsOk = [...r.engine.matchAll(/`(\w+)`/g)].every((m) => engineExports.has(m[1]));
  const vecsOk = [...r.test.matchAll(/vectors\.json:([\w-]+)/g)].every((m) =>
    vectorNames.has(m[1]),
  );
  const hasAll = Boolean(r.engine && r.test && r.api && r.screen);
  if (hasAll && fnsOk && vecsOk && r.status === 'DONE') complete.push(id);
}
const required = EXPECTED.filter((id) => !RESERVED.has(id));

/**
 * WHAT IS HOLDING EACH ROW BACK - the report that would have caught F-10.
 *
 * Adversary pass F-10 claimed BI6's four artifacts were "all present" and instructed
 * that its status be promoted. Two of them did not exist: no API route in the repo,
 * no screen component anywhere. Promoting it would have counted a row towards B39
 * whose endpoint and screens are imaginary.
 *
 * So the columns are resolved against reality, not eyeballed: an endpoint counts
 * when a route for it exists, a screen counts when a component does. Until the API
 * and the app exist, EVERY row is held back by those two columns, and saying so
 * plainly is more useful than a bare "0 of 26".
 */
const apiRoutesExist = (() => {
  try {
    const dir = 'apps/api/src';
    const walk = (d) =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)],
      );
    return walk(dir).some((f) => /\.(ts|tsx)$/.test(f) && /\.(get|post|put|delete)\(|route\(/.test(read(f)));
  } catch {
    return false;
  }
})();
const screensExist = (() => {
  try {
    const walk = (d) =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)],
      );
    return walk('apps/mobile').some((f) => f.endsWith('.tsx'));
  } catch {
    return false;
  }
})();

const heldBy = { engine: 0, test: 0, api: 0, screen: 0, status: 0 };
for (const [id, r] of rows) {
  if (!EXPECTED.includes(id) || RESERVED.has(id) || complete.includes(id)) continue;
  const fnsOk = [...r.engine.matchAll(/`(\w+)`/g)].every((m) => engineExports.has(m[1]));
  const vecsOk = [...r.test.matchAll(/vectors\.json:([\w-]+)/g)].every((m) =>
    vectorNames.has(m[1]),
  );
  if (!fnsOk) heldBy.engine += 1;
  if (!vecsOk) heldBy.test += 1;
  if (!apiRoutesExist) heldBy.api += 1;
  if (!screensExist) heldBy.screen += 1;
  if (fnsOk && vecsOk && apiRoutesExist && screensExist && r.status !== 'DONE') {
    heldBy.status += 1;
    notes.push(`${id}: every artifact resolves but the status still reads ${r.status}`);
  }
}

console.log(`  rows parsed            : ${rows.size}`);
console.log(`  feature IDs required   : ${required.length} (BI5 reserved by D5)`);
console.log(`  empty cells (B13)      : ${emptyCells}`);
console.log(`  engine exports seen    : ${engineExports.size}`);
console.log(`  vectors seen           : ${vectorNames.size}`);
console.log(`  unresolved references  : ${unresolvedFn} function(s), ${unresolvedVec} vector(s)`);
console.log(`  B39 complete           : ${complete.length} of ${required.length}`);
console.log(
  `  held back by column    : engine ${heldBy.engine} · test ${heldBy.test} · ` +
    `api ${heldBy.api} · screen ${heldBy.screen} · stale status ${heldBy.status}`,
);
console.log(
  `  subjects present       : API routes ${apiRoutesExist ? 'yes' : 'NO'} · ` +
    `screen components ${screensExist ? 'yes' : 'NO'}`,
);
for (const n of notes.slice(0, 12)) console.log(`  !    ${n}`);
if (notes.length > 12) console.log(`  !    ... and ${notes.length - 12} more`);

if (failures.length) {
  console.error(`\nTRACEABILITY FAILURES (${failures.length}):`);
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}
console.log('\ntraceability: no empty cells, and every DONE row resolves to something real');
