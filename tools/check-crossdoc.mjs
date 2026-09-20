/**
 * THE THREE DOCUMENTS CANNOT HONESTLY DISAGREE.
 *
 * PLAN.md says what the product is. TASKS.md says what is left. DESIGN.md says what
 * the code does. All three are lenses over the SAME artifacts, so a disagreement
 * between them is a generator bug and never a judgement call.
 *
 * That distinction is the whole apparatus. The moment someone reconciles two
 * documents by editing one, all three become opinions and the build is back to the
 * thing this was built to replace.
 *
 * Found necessary by audit-02's composition pass: the three agree today by
 * construction, and nothing would have failed if they stopped.
 *
 * The facts are re-derived HERE, independently. Deriving them from one of the
 * generators would only prove that the generators agree with themselves.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\r\n').join('\n') : '');
const failures = [];

/* ---- derive the shared facts from the artifacts, not from a document ---- */

const engineSrc = (() => {
  let all = '';
  const d = 'packages/formula-engine/src';
  if (existsSync(d)) for (const n of readdirSync(d)) if (n.endsWith('.ts')) all += read(join(d, n));
  return all;
})();

/** Every engine function TRACEABILITY names, and whether it actually exists. */
const claimed = [
  ...read('docs/spec/TRACEABILITY.md').matchAll(
    /^\|\s*(?:IN|P|OP|BI)\d+\s*\|\s*`([A-Za-z0-9_]+)`/gm,
  ),
].map((m) => m[1]);
const present = claimed.filter((fn) =>
  new RegExp(`(export\\s+(async\\s+)?function|export\\s+const)\\s+${fn}\\b`).test(engineSrc),
);

/**
 * Screens that actually exist, counted the same way for everyone.
 *
 * A SCREEN IS A FILE NAMED AFTER ITS BUILD-MAP ID. Not "any .tsx under screens/",
 * which is what this counted until iteration 37 and which made `registry.tsx` -
 * the list of screen CASES - register as a second screen. The two documents then
 * disagreed, one saying 1 implemented and the other 2, and §5.2 says a
 * disagreement between them is a generator bug rather than something to reconcile
 * by hand. It was: this counter was the wrong one.
 *
 * Naming the rule after the build map also means a helper, a hook or a second
 * registry can live beside the screens without inflating the figure, and a real
 * screen cannot be added without taking an id.
 */
const screensBuilt = (() => {
  const walk = (d) => {
    let n = 0;
    if (!existsSync(d)) return 0;
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) n += walk(p);
      else if (/^[TPRX]\d{1,2}\.tsx$/.test(e)) n += 1;
    }
    return n;
  };
  return walk('apps/mobile/src/screens');
})();

const TRUTH = { present: present.length, claimed: claimed.length, screensBuilt };

/* ---- now require each document to say the same thing ------------------- */

const plan = read('PLAN.md');
const design = read('DESIGN.md');
const tasks = read('TASKS.md');

for (const [name, text] of [
  ['PLAN.md', plan],
  ['DESIGN.md', design],
  ['TASKS.md', tasks],
]) {
  if (!text) failures.push(`${name} is missing or empty, so it cannot be cross-checked`);
}

/* PLAN states the engine-function count outright. */
const planFns = /Engine functions actually present: \*\*(\d+) of (\d+)\*\*/.exec(plan);
if (!planFns) {
  failures.push('PLAN.md no longer states its engine-function count in the expected form');
} else if (Number(planFns[1]) !== TRUTH.present || Number(planFns[2]) !== TRUTH.claimed) {
  failures.push(
    `PLAN.md says ${planFns[1]} of ${planFns[2]} engine functions present; the source says ` +
      `${TRUTH.present} of ${TRUTH.claimed}. A generator is reading the wrong thing.`,
  );
}

/* DESIGN states how many committed screens are implemented. */
const designScreens = /(\d+) committed screens, (\d+) implemented/.exec(design);
if (!designScreens) {
  failures.push('DESIGN.md no longer states its implemented-screen count in the expected form');
} else if (Number(designScreens[2]) !== TRUTH.screensBuilt) {
  failures.push(
    `DESIGN.md says ${designScreens[2]} screens implemented; the source has ` +
      `${TRUTH.screensBuilt}. A generator is reading the wrong thing.`,
  );
}

/* PLAN and DESIGN must agree with EACH OTHER, not merely with this file. */
if (
  designScreens &&
  Number(designScreens[2]) === 0 &&
  !/None is built/.test(plan) &&
  !/no React Native/i.test(plan)
) {
  failures.push(
    'DESIGN.md reports zero screens implemented and PLAN.md does not say so. Two lenses ' +
      'over the same repository are describing different repositories.',
  );
}

/* TASKS must not mark a screen parent DONE while no screen exists. */
const doneScreenParents = [...tasks.matchAll(/\|\s*`(S-\d+)`\s*\|\s*\[x\]/g)].length;
if (TRUTH.screensBuilt === 0 && doneScreenParents > 0) {
  failures.push(
    `TASKS.md marks ${doneScreenParents} screen parent(s) DONE while no screen file exists. ` +
      'A predicate is passing on something other than a screen.',
  );
}

console.log(`  engine functions       : ${TRUTH.present} of ${TRUTH.claimed} present`);
console.log(`  screens built          : ${TRUTH.screensBuilt}`);
console.log('  documents cross-checked: 3');
console.log('  facts re-derived here  : independently, not read from a generator');

if (failures.length) {
  console.error(`\nTHE DOCUMENTS DISAGREE (${failures.length}):`);
  for (const f of failures) console.error(`  x    ${f}`);
  console.error(
    '\nThis is a GENERATOR BUG, never a judgement call. Fix the generator that is\n' +
      'reading the wrong source. Do NOT reconcile by editing a document - they are\n' +
      'generated, and a hand-edited lens is an opinion.',
  );
  process.exit(1);
}
console.log('\ncrossdoc: PLAN, TASKS and DESIGN describe the same repository');
