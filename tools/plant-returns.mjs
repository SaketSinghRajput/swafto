/**
 * PLANT A DEFECT IN EACH §2.3 / HT-11 RULE AND REQUIRE A FAILING TEST.
 *
 * CLAUDE.md: "New logic has a test that fails without it. If you cannot make it
 * fail, you have not tested it." Each plant below removes or inverts one rule in
 * the source, runs only the tests that should notice, and FAILS this script if
 * they still pass. The original bytes are restored after every plant, including
 * on a crash.
 *
 * Run: node tools/plant-returns.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const ENGINE = ['packages/formula-engine/test/returns.spec.ts', 'packages/formula-engine/test/vectors.spec.ts'];
const STORE = ['apps/mobile/test/returns-store.spec.ts'];
const API = ['apps/api/test/sync-events.spec.ts'];
const SCHEMA = ['packages/schema/test/event-links.spec.ts'];

const PLANTS = [
  {
    name: 'P4 adds a return instead of subtracting it',
    file: 'packages/formula-engine/src/primary.ts',
    from: "key: 'working.sales_returned',\n      sign: '-',",
    to: "key: 'working.sales_returned',\n      sign: '+',",
    tests: ENGINE,
  },
  {
    name: 'P4 ignores the replacement goods of an exchange',
    file: 'packages/formula-engine/src/primary.ts',
    from: "amount: totalOf(bySection(entries, 'exchange_out')),",
    to: 'amount: 0,',
    tests: ENGINE,
  },
  {
    name: 'a cash refund does not leave the drawer (P3)',
    file: 'packages/formula-engine/src/primary.ts',
    from: "key: 'working.refund_paid_cash',\n      sign: '-',",
    to: "key: 'working.refund_paid_cash',\n      sign: '+',",
    tests: ENGINE,
  },
  {
    name: 'a UPI refund is counted as cash (D2)',
    file: 'packages/formula-engine/src/primary.ts',
    from: "key: 'working.refund_paid_cash',\n      sign: '-',\n      amount: sectionModeTotal(entries, 'refund_paid', 'cash'),",
    to: "key: 'working.refund_paid_cash',\n      sign: '-',\n      amount: totalOf(bySection(entries, 'refund_paid')),",
    tests: ENGINE,
  },
  {
    name: 'credit issued does not come off P7',
    file: 'packages/formula-engine/src/primary.ts',
    from: "amount: sectionModeTotal(entries, 'refund_paid', 'udhar'),",
    to: 'amount: 0,',
    tests: ENGINE,
  },
  {
    name: 'event lines always present (would change the 77 existing vectors)',
    file: 'packages/formula-engine/src/primary.ts',
    from: '(entries.some((e) => e.section === section) ? [line] : [])',
    to: '[line]',
    tests: ENGINE,
  },
  {
    name: 'expense pressure against negative sales is shown as a number (EX-10)',
    file: 'packages/formula-engine/src/operational.ts',
    from: 'return salesPaise < 0 || numeratorPaise < 0 ? { ...r, basisPoints: null } : r;',
    to: 'return r;',
    tests: ENGINE,
  },
  {
    name: 'over-settlement allowed (EX-12)',
    file: 'packages/formula-engine/src/returns.ts',
    from: 'if (after.outstanding < 0) {',
    to: 'if (false) {',
    tests: [...ENGINE, ...STORE, ...API],
  },
  {
    name: 'a sale can be returned for more than it was',
    file: 'packages/formula-engine/src/returns.ts',
    from: 'if (leg.amount > returnableOf(target, others)) {',
    to: 'if (false) {',
    tests: ENGINE,
  },
  {
    name: 'a pending return need not name the customer (EX-11)',
    file: 'packages/formula-engine/src/returns.ts',
    from: "if (d.settlement === 'pending' && !partyId) {",
    to: 'if (false) {',
    tests: ENGINE,
  },
  {
    name: 'credit issued folds to refund paid',
    file: 'packages/formula-engine/src/returns.ts',
    from: "refunds.every((e) => e.mode === 'udhar')",
    to: "refunds.every((e) => e.mode === 'cash')",
    tests: ENGINE,
  },
  {
    name: 'pending is reported as settled',
    file: 'packages/formula-engine/src/returns.ts',
    from: "outstanding > 0\n      ? 'pending_settlement'",
    to: "outstanding < 0\n      ? 'pending_settlement'",
    tests: ENGINE,
  },
  {
    name: 'a correction may be dated into the day it corrects (D7)',
    file: 'packages/formula-engine/src/returns.ts',
    from: 'if (d.original.dayId === d.dayId) {',
    to: 'if (false) {',
    tests: ENGINE,
  },
  {
    name: 'HT-11: a correction on a closed current day is written instead of held',
    file: 'apps/mobile/src/store/index.ts',
    from: "if (day.state === 'closed') {\n      // Refuse now",
    to: "if (false) {\n      // Refuse now",
    tests: STORE,
  },
  {
    name: 'HT-11: held corrections are never released',
    file: 'apps/mobile/src/store/index.ts',
    from: 'this.#releaseHeldCorrections();\n    return true;',
    to: 'return true;',
    tests: STORE,
  },
  {
    name: 'HT-11: a released correction is posted twice after a restart',
    file: 'apps/mobile/src/store/index.ts',
    from: 'if (this.#port.findEntry(h.id) !== undefined) continue;',
    to: '',
    tests: STORE,
  },
  {
    name: 'EX-6: an event is not one transaction on the phone',
    file: 'apps/mobile/src/store/sqlite.ts',
    from: 'appendEvent(entries, outbox) {\n      tx(db, () => {',
    to: 'appendEvent(entries, outbox) {\n      ((write: () => void) => write())(() => {',
    tests: STORE,
  },
  {
    name: 'EX-5: half an exchange lands on the server',
    file: 'apps/api/src/sync/routes.ts',
    from: 'if (poisoned.has(root)) {',
    to: 'if (false) {',
    tests: API,
  },
  {
    name: 'EX-12: the server skips the settlement rule',
    file: 'apps/api/src/sync/routes.ts',
    from: 'assertLegFits(leg, target ?? undefined, siblings);',
    to: '',
    tests: API,
  },
  {
    name: 'EX-3: an event leg may point at nothing (schema)',
    file: 'packages/schema/src/spec.ts',
    from: "(${inList('section', EVENT_SECTIONS)} AND refers_to_entry_id IS NOT NULL)",
    to: "(${inList('section', EVENT_SECTIONS)})",
    tests: SCHEMA,
  },
  {
    name: "S-11: a link may reach another shop's entry (schema)",
    file: 'packages/schema/src/spec.ts',
    from: 'FOREIGN KEY (shop_id, refers_to_entry_id) REFERENCES entries(shop_id, id)',
    to: 'FOREIGN KEY (refers_to_entry_id) REFERENCES entries(id)',
    tests: SCHEMA,
  },
  {
    name: 'S-11: the memory repo links into another shop',
    file: 'apps/api/src/db/memory.ts',
    from: 'book.get(entry.refersToEntryId)?.shopId !== shopId',
    to: 'book.get(entry.refersToEntryId) === undefined',
    tests: API,
  },
];

const vitest = (files) =>
  spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--testTimeout=120000', '--hookTimeout=120000', ...files], {
    encoding: 'utf8',
  });

let survived = 0;
for (const p of PLANTS) {
  const original = readFileSync(p.file, 'utf8');
  const src = original.split('\r\n').join('\n');
  if (!src.includes(p.from)) {
    console.error(`x    ${p.name}: the code to plant was not found in ${p.file} - the plant is stale`);
    survived += 1;
    continue;
  }
  try {
    writeFileSync(p.file, src.replace(p.from, p.to));
    const r = vitest(p.tests);
    if (r.status === 0) {
      console.error(`x    SURVIVED: ${p.name} - no test noticed`);
      survived += 1;
    } else {
      console.log(`ok   caught: ${p.name}`);
    }
  } finally {
    writeFileSync(p.file, original);
  }
}
console.log(`\n${PLANTS.length - survived} of ${PLANTS.length} plants caught`);
if (survived > 0) process.exit(1);
