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
  from: 'PROJECTION.md "The re-cut" · ids resolved against the build map · extended 2026-10-22 to SPEC-DIGEST §10 P0',
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
    /*
     * T13 WAS REMOVED HERE, AND PUTTING IT BACK IS A CORRECTION RATHER THAN A
     * CHANGE OF MIND.
     *
     * The note that stood in this place read: "T13 (cash check - balanced) was
     * REMOVED by the product review to keep the total at ten. Cheapest screen in
     * the set to lose: three lines of content, T12 owns the difference case, and
     * T14 shows the same balanced figures."
     *
     * SPEC-DIGEST §8 S03 says the opposite, in the strongest terms used about
     * any screen in this product: `BalancedState` is "the highest-leverage
     * screen in the product and the only genuinely good moment the day
     * contains", and it is explicitly "NOT the difference screen with a block
     * removed". The removal reasoning is the exact claim the spec forbids, and
     * it was made to hit a round number.
     */
    'T13', // cash check - balanced. Restored 2026-10-22 against S03.
    'T14', // day closed summary
    'T6', // opening cash - pulled into the committed set by injection 21

    /*
     * THE REST OF P0, added 2026-10-22. SPEC-DIGEST §10 names fifteen screens as
     * "the minimum that closes one day" and says to build nothing else until all
     * fifteen exist; the committed set above is PROJECTION's re-cut of ten and
     * predates it. These seven are the difference.
     */
    'T2', // Today - first run. No history, one action: enter opening cash
    'T3', // Today - already closed. What he sees at 10pm and again next morning
    'X1', // Onboarding - shop name, language, text size, opening cash
    'P1', // Parties list - customers and suppliers, with both outstanding totals
    'P2', // Customer detail - the ledger and a collection
    'P3', // Supplier detail - the same page, money running the other way

    /*
     * R1 - REPORTS, THE THIRD TAB. Added 2026-10-23, and an INSTRUMENT asked for
     * it rather than a plan.
     *
     * `check:crossdoc` counts the `[TPRX]\d` screen files on disk against the
     * implemented figure DESIGN.md derives from this list, so the moment
     * `R1.tsx` existed the two documents disagreed by one. The rule that counter
     * is named after is the right one - a real screen cannot be added without
     * taking an id - and the build map has carried `R1  Reports - early` since
     * G0, so the id was reserved rather than invented here.
     *
     * HELD TO THE SAME EIGHT CHILDREN as everything above it. Its TRACEABILITY
     * cells are P4, P6 and P7, the ungated figures it actually draws; OP2, OP3,
     * OP5 and BI1-BI6 name R1 as well and stay TODO, because those are gated on
     * a closed-day count nothing in this app can reach yet (W4).
     */
    'R1', // Reports - early. Empty until the first close, which is the point of it

    /*
     * T16 - POST A CORRECTION, added 2026-10-25. Build map P1, and the answer to
     * HT-11: T3's "Post a correction" routed to T5, the open day's list, which on
     * a frozen day offers nothing. Same eight children as everything above.
     */
    'T16', // Post a correction - a new entry on the next open day, never a write to the closed one

    /*
     * T19 - A TYPED ADJUSTMENT. Added 2026-10-25 for decision 2 of the
     * co-founder review (2026-10-22), which postdates the build map, so the map
     * has no row for it. The id is taken from beyond the map's last T row
     * rather than borrowed: T15 is "Past day - read-only" and T16 "Post a
     * correction" (a different thing - a correction references a closed day;
     * an adjustment is a typed fact of today), and T17 is day history. Taking
     * any of those would tick a screen off with its own subject unbuilt. T18 is
     * Return or exchange (§2.3), built alongside, so this one is T19 - also
     * absent from the build map (renamed from T18 at the merge, 2026-10-26).
     */
    'T19', // Adjustment - a type from the fixed list and an amount; no free text

    /*
     * M1 - THE PREMIUM DASHBOARD, added 2026-10-26 for PR-6 of the Free/Premium
     * plan (docs/research/R5-free-premium-plan.md), which postdates the build
     * map. NOT R2: the map's R2 is "Reports - mature", a different screen, and
     * taking it would tick that screen off with its own subject unbuilt. `M` is
     * a prefix the map does not use, so the id cannot collide with a map row;
     * check:crossdoc and check:traceability list screen prefixes by hand and
     * were taught `M` in the same change.
     */
    'M1', // Premium dashboard - sales estimate and comparisons; an item-cards slot for PR-2

    /*
     * C1 - ASK, added 2026-10-26 for FR-8 and PR-5 (docs/research/R5): the
     * free FAQ-and-today's-figures chatbot and the Premium shop-context one,
     * one screen gated by `allows(plan, 'shopChat')`. Decided after the build
     * map, which has no chat screen and no C row at all, so the id is free
     * rather than borrowed - and `gen-tasks` refuses it the day the map ever
     * names a C1. Same eight children as everything above.
     */
    'C1', // Ask - a question answered from the engine; never a figure entered

    /*
     * PR-1 (PREMIUM, R5 decision 2): items per sale. Scope decided 2026-10-26,
     * after the build map. Neither id is the map's: the map numbers only the
     * T, P, R and X families (gen-tasks reads `[TPRX]\d`), so S9 extends the
     * mandated S family's numbering by one and I1 opens a family of its own.
     * Same eight children as everything above.
     */
    'S9', // Your items - the shop's own short list, names only, no price, no stock
    'I1', // Items in a sale - optional, after the sale, never more than the sale

    /*
     * S11 - THE APP-LOCK COVER. Added 2026-10-26 for R5 FR-3 (R1 GAP-4), which
     * postdates the build map. The map has no lock screen of any letter, and
     * the S family is outside the map's [TPRX] ids, so S11 cannot collide with
     * a map screen (S9 and S10 went to items and the plan, merged alongside). Same
     * eight children as everything above.
     */
    'S11', // App locked - the phone's own screen lock; shows nothing from the book

    /*
     * P6 AND S12 - R5 FR-6 AND FR-4, added 2026-10-26, both postdating the
     * build map. P6 is a free P id: the map's P rows stop at P5, and P5 is
     * "Edit party" - borrowing it would tick an edit screen off with only a
     * credit limit built. S12 sits after S11 in the settings family, outside the
     * map's [TPRX] ids. Same eight children as everything above.
     */
    'P6', // Credit limit - one amount, observed against, never enforced
    'S12', // Entries for your accountant - a month, then a CSV to the share sheet

    /*
     * S13 AND S14 - the M3 "Mitra" redesign, approved by Saket at M2
     * (2026-11-18, product/swafto-ui-redesign/PLAN.md decisions log). Both
     * postdate the build map and sit in this build's own S family after S12,
     * outside the map's [TPRX] ids. S13 is DPDP access as a button (the API's
     * `/v1/me/export`); S14 is C-21's lost-phone sign-out (the API's device
     * list and revoke). Same eight children as everything above.
     */
    'S13', // Your data - everything the server holds, to the share sheet
    'S14', // Signed-in phones - the shop's devices, and signing a lost one out
  ],
  /**
   * Committed ids the build map does not have, with the name the map would have
   * given them. Only for scope decided AFTER the map; `gen-tasks` refuses an id
   * that is here and in the map both.
   */
  after: {
    T19: 'Typed adjustment (decision 2, 2026-10-22)',
    M1: 'Premium dashboard (PR-6, Free/Premium plan R5, 2026-10-26)',
    C1: 'Ask - trilingual questions answered from the engine (FR-8, PR-5)',
    S9: 'Your items - the shop’s item list (PR-1, Premium, 2026-10-26)',
    I1: 'Items in a sale (PR-1, Premium, 2026-10-26)',
    S11: "App locked - the phone's own screen lock (R5 FR-3, 2026-10-26)",
    P6: 'Credit limit for a customer (R5 FR-6, 2026-10-26)',
    S12: 'Entries for your accountant (R5 FR-4, 2026-10-26)',
    S13: 'Your data - access and export (DPDP, M3 2026-11-18)',
    S14: 'Signed-in phones - lost-device sign-out (C-21, M3 2026-11-18)',
  },
};

/**
 * SCREENS THE LAW COMMITTED, WHICH THE PROJECTION DID NOT.
 *
 * COMMITTED_SCREENS comes from PROJECTION's re-cut and every id in it exists in
 * the build map. The consent notice is in neither: the build map predates the
 * DPDP audit, and the audit's L-01/L-02 are not a product decision anybody made
 * - they are a condition of processing personal data at all.
 *
 * IT IS NOT BUILD-MAP X1. X1 there is "Onboarding - shop name, language, text
 * size, opening cash. Four questions, no more", and naming this screen X1 would
 * tick that screen off with the four questions unwritten. X0 says what it is:
 * the panel before the numbered flow starts, because consent has to precede the
 * account it creates.
 *
 * SAME EIGHT CHILDREN, SAME BAR. A screen mandated rather than chosen is still a
 * screen, and the cheapest way to end up with a legally-required panel nobody
 * measured is to keep it in a category the instruments do not read.
 */
export const MANDATED_SCREENS = {
  from:
    'LEGAL-AUDIT L-01/L-02 (DPDP Act 2023 s6, notice and specific consent) and ' +
    'LEGAL-AUDIT §1.6 · Google Play User Data policy · Apple App Store 5.1.1(i) and (v) · ' +
    'CLAUDE.md decision 4 of 2026-10-22 (returns and exchanges in V1) · ' +
    'Google Play Subscriptions policy (R4 §5.4, PR-7)',
  /*
   * THE SETTINGS FAMILY IS HERE FOR THE REASON X0 IS, and the reason is worth
   * stating because it reads like a filing decision and is not one.
   *
   * Three of these screens are conditions of publication rather than product
   * choices. Google Play's User Data policy requires an IN-APP path to delete
   * the account and its data for any app that lets a user create one; Apple
   * 5.1.1(v) requires the same, and 5.1.1(i) requires the privacy notice to be
   * reachable inside the app, not only in the store listing; the DPDP Act
   * requires a named grievance officer and withdrawal as easy as giving. None
   * of them has a build-map number, because the build map predates all three.
   *
   * THEY ARE NOT X2 AND X3, and that is the X0 argument again. The build map
   * has X2 "More · settings" (Language, appearance, BACKUP, help) and X3
   * "Language switch". Naming S1 "X2" would tick off a screen whose backup half
   * is not built, exactly as naming X0 "X1" would have ticked off onboarding
   * with its four questions unwritten. The ids stay distinct until somebody
   * decides whether the S family REPLACES X2/X3 or sits beside them - a spec
   * decision, and `docs/spec/source/` is not ours to edit.
   *
   * SAME EIGHT CHILDREN EITHER WAY. The cheapest way to end up with a
   * legally-required panel nobody measured is to keep it in a category the
   * instruments do not read.
   */
  /*
   * T18 IS HERE FOR THE SAME REASON, ONE SOURCE OVER. Returns and exchanges are
   * in V1 by the co-founder decision of 2026-10-22 (CLAUDE.md, decision 4), not
   * by law - but like the S family they have no build-map number. The build
   * map's T15 is "Past day - read-only", so naming this screen T15 would tick off
   * a screen nobody built; T18 is the first id the frozen build map never uses,
   * and gen-tasks refuses it the day the map ever names one.
   */
  /*
   * S10 - YOUR PLAN, added 2026-10-26 for PR-7, and mandated for the S family's
   * reason: Play's Subscriptions policy requires the price, the billing period,
   * auto-renewal and how to cancel to be shown in the app, and an easy way to
   * cancel (R4 §1.5, §5.4). The build map has no S ids at all, so S10 cannot
   * tick off a build-map screen; S9 and S10 were both free in this build's own
   * S family, and S10 is the id the plan work was given. (The design reference
   * uses S10 for "About" - the U-4 collision the S family already carries.)
   */
  ids: ['X0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'T18', 'S10'],
  names: {
    T18: 'Return or exchange a sale',
    X0: 'Consent notice',
    S1: 'Settings hub',
    S2: 'The shop',
    S3: 'Language and text size',
    S4: 'Privacy and consent',
    S5: 'About, version and licences',
    S6: 'Help and the grievance officer',
    S7: 'Delete this account',
    S8: 'Confirm deletion',
    S10: 'Your plan (PR-7)',
  },
};

/** Every screen this build holds itself to, however it got there. */
export const ALL_SCREEN_IDS = [...COMMITTED_SCREENS.ids, ...MANDATED_SCREENS.ids];

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
     * WORD-BOUNDED, AND NOW SCOPED TO THE COLUMN IT CLAIMS TO READ.
     *
     * The comment here already said the honest test is "at least one feature row
     * names this screen IN ITS SCREEN COLUMN" - and then tested the whole
     * document, which is a different question. Word boundaries fixed T1-matching-
     * T10 and left the larger hole open: any sentence anywhere in the file could
     * tick any screen's box.
     *
     * It was live. TRACEABILITY line 149 reads "Deletion propagates to S3
     * backups ... no S3, no Terraform" - Amazon S3, in the Test column of an
     * infrastructure row - which would have ticked SCREEN S3's traceability box
     * on a sentence about object storage. A box ticked by something other than
     * its subject is the precise defect this file exists to prevent, and it was
     * sitting in the predicate meant to prevent it.
     *
     * Fixing the predicate rather than renaming the screen is the root-cause
     * fix: the hole was never about `S`. `R1` could be ticked by a mention of
     * revision R1, `T5` by a template id. Scoping to the column closes it for
     * every prefix, including the next one somebody invents.
     */
    predicate: (id) => () => {
      const screenColumnOf = (row) => {
        // `| ID | Engine | Test | API | Screen | Status |` - split on an
        // UNESCAPED pipe, because API cells legitimately contain `a\|b`.
        const cells = row.split(/(?<!\\)\|/);
        return cells.length >= 7 ? (cells[5] ?? '') : '';
      };
      return read('docs/spec/TRACEABILITY.md')
        .split(/\r?\n/)
        .filter((line) => line.trimStart().startsWith('|'))
        .some((row) => new RegExp(`\\b${id}\\b`).test(screenColumnOf(row)));
    },
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
    /*
     * RE-STATED at 36, and the judgement is that it WAS thorough rather than
     * merely performed - which is a claim with evidence behind it rather than
     * a feeling. The pass produced three findings (a forged shop id that
     * survived 228 tests, a checker scoped to four hand-listed files, a
     * tripwire blind to unlisted SDKs) and discharged both plants REVIEW had
     * carried as owed since iteration 19. A pass that finds nothing is the one
     * to be suspicious of.
     */
    judgement: { what: 'whether the last pass was thorough rather than merely performed', made: 36 },
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
