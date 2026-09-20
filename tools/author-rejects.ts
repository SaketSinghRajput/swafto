/**
 * Authors `packages/formula-engine/rejects.json` - the REJECTION CORPUS (§5.11).
 *
 * WHY IT EXISTS. `vectors.json` describes VALID days. A float amount is valid JSON.
 * So is a negative one, a party that does not exist, a correction pointing at an open
 * day, and a fifteen-digit amount. The suite had no corpus of inputs that must be
 * REFUSED - `assertPaise` was simply the one that got probed, and it turned out never
 * to have run at all.
 *
 * Each case names the LAYERS obliged to reject it. A rejection only the API performs
 * is absent in the app; one only the app performs is absent on sync. Constraint 3
 * already taught this: closed-day rejection moved into a database trigger because the
 * API alone was not enough.
 *
 *   layers: 'engine' - the pure Formula Engine refuses the value
 *           'schema' - a CHECK constraint or trigger refuses the row
 *           'api'    - request validation refuses the payload (wired at G6-G8)
 *
 * Run: node --experimental-strip-types tools/author-rejects.ts
 */

import { writeFileSync } from 'node:fs';

type Layer = 'engine' | 'schema' | 'api';

interface RejectCase {
  name: string;
  violates: string;
  layers: Layer[];
  engine?: { fn: string; args: unknown[] };
  schema?: { table: string; columns: string; values: string };
  messageMatches?: string;
}

const cases: RejectCase[] = [];

/* ================================================================== *
 * MONEY - the class that measured 0/59
 * ================================================================== */

const badMoney: [string, unknown, string][] = [
  ['money-float', 12.5, 'a fractional paisa cannot exist'],
  ['money-tiny-float', 0.1, 'a sub-paisa amount cannot exist'],
  ['money-numeric-string', '100', 'an amount must be a number, not a string'],
  ['money-null', null, 'an amount is required'],
  ['money-boolean', true, 'a boolean is not an amount'],
  ['money-object', {}, 'an object is not an amount'],
  ['money-beyond-safe-integer', 9007199254740992, 'beyond exact integer range'],
];

for (const [name, value, violates] of badMoney) {
  cases.push({
    name,
    violates,
    layers: ['engine'],
    engine: { fn: 'assertPaise', args: [value] },
    messageMatches: 'integer number of paise',
  });
}

cases.push({
  name: 'money-negative-entry-amount',
  violates: 'an entry amount is never negative; the section carries the sign',
  layers: ['schema'],
  schema: {
    table: 'entries',
    columns: 'id, shop_id, day_id, section, amount, mode, created_at, source',
    values: "'{{uuid}}', '{{shop}}', '{{openDay}}', 'cash_sales', -100, 'cash', '{{now}}', 'manual'",
  },
});

cases.push({
  name: 'money-fractional-entry-amount',
  violates: 'money is an integer number of paise, in the database too',
  layers: ['schema'],
  schema: {
    table: 'entries',
    columns: 'id, shop_id, day_id, section, amount, mode, created_at, source',
    values: "'{{uuid}}', '{{shop}}', '{{openDay}}', 'cash_sales', 12.5, 'cash', '{{now}}', 'manual'",
  },
});

/* ================================================================== *
 * ENUM - a section or mode outside the paper sheet
 * ================================================================== */

cases.push({
  name: 'enum-unknown-section',
  violates: 'the sheet has nine sections and no others',
  layers: ['schema'],
  schema: {
    table: 'entries',
    columns: 'id, shop_id, day_id, section, amount, mode, created_at, source',
    values: "'{{uuid}}', '{{shop}}', '{{openDay}}', 'tips', 1000, 'cash', '{{now}}', 'manual'",
  },
});

/**
 * D1's reversibility column, defended.
 *
 * `source` exists for exactly one purpose: so a future UPI import stays reversible
 * without a migration. Adversary pass F-04 added the first vector that exercises
 * 'imported' - and did it with `'imported' as 'manual'`, a cast that LIES, written
 * while the typechecker was not running. The cast was never load-bearing (the engine
 * reads no `source` field at all, confirmed by grep), but the column had no
 * rejection case, so a wrong value would have been stored rather than refused.
 */
cases.push({
  name: 'enum-unknown-source',
  violates: 'source is manual or imported and nothing else (D1)',
  layers: ['schema'],
  schema: {
    table: 'entries',
    columns: 'id, shop_id, day_id, section, amount, mode, created_at, source',
    values: "'{{uuid}}', '{{shop}}', '{{openDay}}', 'cash_sales', 1000, 'cash', '{{now}}', 'ocr'",
  },
});

cases.push({
  name: 'enum-shop-stock-on-a-purchase',
  violates: 'mode validity is per section; a purchase has four modes, not five (C-7)',
  layers: ['schema'],
  schema: {
    table: 'entries',
    columns: 'id, shop_id, day_id, section, amount, mode, created_at, source',
    values:
      "'{{uuid}}', '{{shop}}', '{{openDay}}', 'purchase', 1000, 'shop_stock', '{{now}}', 'manual'",
  },
});

cases.push({
  name: 'enum-shop-stock-on-a-collection',
  violates: 'a collection has three modes; stock cannot settle a debt',
  layers: ['schema'],
  schema: {
    table: 'entries',
    columns: 'id, shop_id, day_id, section, amount, mode, party_id, created_at, source',
    values:
      "'{{uuid}}', '{{shop}}', '{{openDay}}', 'udhar_collection', 1000, 'shop_stock', '{{party}}', '{{now}}', 'manual'",
  },
});

cases.push({
  name: 'enum-unknown-day-state',
  violates: 'a day has exactly five states (C-3)',
  layers: ['schema'],
  schema: {
    table: 'days',
    columns: 'shop_id, date, state, created_at',
    values: "'{{shop}}', '2026-01-01', 'archived', '{{now}}'",
  },
});

cases.push({
  name: 'enum-unknown-language',
  violates: 'the app ships Odia, Hindi and English',
  layers: ['schema'],
  schema: {
    table: 'shops',
    columns: 'id, name, type, language, created_at',
    values: "'{{uuid}}', 'Test', 'kirana', 'fr', '{{now}}'",
  },
});

/* ================================================================== *
 * TIME - the class CP-4 lives in
 * ================================================================== */

cases.push({
  name: 'time-entry-into-a-closed-day',
  violates: 'a closed day is corrected, never added to (D7, CP-4)',
  layers: ['schema'],
  schema: {
    table: 'entries',
    columns: 'id, shop_id, day_id, section, amount, mode, created_at, source',
    values:
      "'{{uuid}}', '{{shop}}', '{{closedDay}}', 'cash_sales', 1000, 'cash', '{{now}}', 'manual'",
  },
  messageMatches: 'that day is closed',
});

cases.push({
  name: 'time-due-date-on-a-cash-expense',
  violates: 'a due date only means anything on an udhar purchase (D4)',
  layers: ['schema'],
  schema: {
    table: 'entries',
    columns: 'id, shop_id, day_id, section, amount, mode, due_date, created_at, source',
    values:
      "'{{uuid}}', '{{shop}}', '{{openDay}}', 'expense', 1000, 'cash', '2026-08-01', '{{now}}', 'manual'",
  },
});

cases.push({
  name: 'time-malformed-iso-date',
  violates: 'a day id is an ISO calendar date',
  layers: ['engine'],
  engine: { fn: 'toEpochDay', args: ['15-07-2026'] },
  messageMatches: 'Not an ISO date',
});

cases.push({
  name: 'time-impossible-month',
  violates: 'there is no thirteenth month',
  layers: ['engine'],
  engine: { fn: 'toEpochDay', args: ['2026-13-01'] },
  messageMatches: 'Not a valid date',
});

/* ================================================================== *
 * STATE GUARDS - found by adversary pass 01 (F-02) at zero coverage.
 * Written, reviewed, and never once run against the input that trips them -
 * the same shape as assertPaise at 0/59.
 * ================================================================== */

const openDayInput = {
  day: {
    date: '2026-07-15',
    state: 'open',
    openingCash: 150000,
    countedCash: 605000,
    skippedSections: [],
  },
  entries: [],
  priorCreditOutstanding: 0,
  priorSupplierOutstanding: 0,
};

cases.push({
  name: 'state-closed-summary-of-an-open-day',
  violates: 'BI windows count CLOSED days; admitting an open one opens a gate early',
  layers: ['engine'],
  engine: { fn: 'toClosedDaySummary', args: [openDayInput] },
  messageMatches: "not 'closed'",
});

cases.push({
  name: 'state-closed-summary-without-a-count',
  violates: 'a closed day always carries the cash a human counted',
  layers: ['engine'],
  engine: {
    fn: 'toClosedDaySummary',
    args: [{ ...openDayInput, day: { ...openDayInput.day, state: 'closed', countedCash: null } }],
  },
  messageMatches: 'has no counted cash',
});

/* ================================================================== *
 * IDENTITY - party and tenancy
 * ================================================================== */

cases.push({
  name: 'identity-udhar-sale-without-a-party',
  violates: 'the sheet asks for a creditor name on every udhar sale',
  layers: ['schema'],
  schema: {
    table: 'entries',
    columns: 'id, shop_id, day_id, section, amount, mode, created_at, source',
    values:
      "'{{uuid}}', '{{shop}}', '{{openDay}}', 'udhar_sales', 1000, 'udhar', '{{now}}', 'manual'",
  },
});

cases.push({
  name: 'identity-party-that-does-not-exist',
  violates: 'an entry cannot reference a party that was never created',
  layers: ['schema'],
  schema: {
    table: 'entries',
    columns: 'id, shop_id, day_id, section, amount, mode, party_id, created_at, source',
    values:
      "'{{uuid}}', '{{shop}}', '{{openDay}}', 'udhar_sales', 1000, 'udhar', '00000000-0000-7000-8000-00000000dead', '{{now}}', 'manual'",
  },
});

cases.push({
  name: 'identity-entry-for-a-day-that-does-not-exist',
  violates: 'an entry belongs to a day record that exists',
  layers: ['schema'],
  schema: {
    table: 'entries',
    columns: 'id, shop_id, day_id, section, amount, mode, created_at, source',
    values: "'{{uuid}}', '{{shop}}', '1999-01-01', 'cash_sales', 1000, 'cash', '{{now}}', 'manual'",
  },
});

cases.push({
  name: 'identity-row-for-a-shop-that-does-not-exist',
  violates: 'every row is scoped to a shop that exists (tenancy, S-11)',
  layers: ['schema'],
  schema: {
    table: 'parties',
    columns: 'id, shop_id, kind, name, created_at',
    values: "'{{uuid}}', '00000000-0000-7000-8000-00000000beef', 'customer', 'Nobody', '{{now}}'",
  },
});

cases.push({
  name: 'identity-duplicate-entry-id',
  violates: 'a client-generated id is unique; a replay must not create a second row',
  layers: ['schema'],
  schema: {
    table: 'entries',
    columns: 'id, shop_id, day_id, section, amount, mode, created_at, source',
    values: "'{{dupe}}', '{{shop}}', '{{openDay}}', 'cash_sales', 9999, 'cash', '{{now}}', 'manual'",
  },
});

/* ================================================================== *
 * STATE - a closed day must carry what a close produces
 * ================================================================== */

cases.push({
  name: 'state-closed-day-without-a-count',
  violates: 'a closed day carries the counted cash and the moment it froze (DFD 4.6)',
  layers: ['schema'],
  schema: {
    table: 'days',
    columns: 'shop_id, date, state, created_at',
    values: "'{{shop}}', '2026-03-01', 'closed', '{{now}}'",
  },
});

/* ================================================================== *
 * TEXT and STRUCTURE - no coverage yet; PENDING the API, not silently passing
 * ================================================================== */

const pending: [string, string, string][] = [
  ['text-party-name-empty', 'a party must have a name to be findable later', 'name'],
  ['text-party-name-whitespace-only', 'a name of spaces is not a name', 'name'],
  [
    'text-label-with-bidi-override',
    'control and bidi-override characters can disguise a label',
    'control character',
  ],
  [
    'text-party-name-past-the-field-limit',
    'a name past the column bound must be refused, not truncated',
    'too long',
  ],
  ['structure-missing-required-field', 'an entry without an amount is not an entry', 'amount'],
  [
    'structure-unexpected-extra-field',
    'an unknown field is a version mismatch or an attack, never a no-op',
    'unknown',
  ],
  [
    'structure-payload-past-the-size-bound',
    'an unbounded payload is a denial-of-service vector on a t4g.small',
    'too large',
  ],
  [
    'structure-forged-shop-id-in-the-body',
    'shop_id comes from the session and is REJECTED in a body (S-11)',
    'shop_id',
  ],
];
for (const [name, violates, messageMatches] of pending) {
  cases.push({ name, violates, layers: ['api'], messageMatches });
}

/* ---- emit --------------------------------------------------------- */

const names = cases.map((c) => c.name);
const dupes = names.filter((n, i) => names.indexOf(n) !== i);
if (dupes.length) throw new Error(`Duplicate reject case names: ${dupes.join(', ')}`);

/* ================================================================== *
 * P-001 · THE ARMS THE CORPUS COULD NOT REACH
 *
 * Added at iteration 31. Shape 1 of the B3 gap: branches that fire when something is
 * WRONG, unreachable from a corpus that describes valid days. Each case names a
 * specific constraint or guard by the rule it violates, not by a category.
 *
 * NOT ADDED, and worth saying why: the four append-only triggers fire on UPDATE and
 * DELETE, and every schema case here is an INSERT - the runner builds
 * `INSERT INTO <table> (<columns>) VALUES (<values>)` and nothing else. Those arms
 * are covered by append-only.spec.ts's four-column sweep instead. Writing cases the
 * runner cannot execute would grow the count and test nothing.
 * ================================================================== */

/* ---- divideMoney's divisor guard: an engine arm with no case ---- */
for (const [n, d] of [
  ['zero', 0],
  ['not-a-number', Number.NaN],
  ['infinite', Number.POSITIVE_INFINITY],
] as const) {
  cases.push({
    name: `money-divide-by-${n}`,
    violates: 'divideMoney refuses a divisor that is not a non-zero finite number',
    layers: ['engine'],
    engine: { fn: 'divideMoney', args: [100000, d] },
    messageMatches: 'non-zero finite',
  });
}

/* ---- the date parser, which had two cases between all its arms ---- */
for (const [n, d, why] of [
  ['day-zero', '2026-01-00', 'a month has no zeroth day'],
  ['month-thirteen', '2026-13-01', 'a year has twelve months'],
  ['february-thirty', '2026-02-30', 'February never has thirty days'],
  ['february-twentynine-common-year', '2026-02-29', 'this year is not a leap year'],
  ['letters-for-digits', '2026-JAN-15', 'the format is numeric'],
  ['slash-separators', '2026/01/15', 'the separator is a hyphen'],
  ['two-digit-year', '26-01-15', 'the year is four digits'],
  ['trailing-time', '2026-01-15T00:00:00Z', 'a date is not a timestamp'],
  ['empty-string', '', 'a date is required'],
] as const) {
  cases.push({
    name: `time-${n}`,
    violates: why,
    layers: ['engine'],
    engine: { fn: 'parseIsoDate', args: [d] },
  });
}

/* ---- entries_mode_ck: the mode a section is allowed to carry ---- */
for (const [section, mode] of [
  ['cash_sales', 'upi'],
  ['upi_sales', 'cash'],
  ['udhar_sales', 'cash'],
  ['withdrawal', 'shop_stock'],
  ['udhar_collection', 'udhar'],
] as const) {
  cases.push({
    name: `enum-${mode}-mode-on-a-${section.replace(/_/g, '-')}-row`,
    violates: `a ${section} row cannot be paid by ${mode}`,
    layers: ['schema'],
    schema: {
      table: 'entries',
      columns: 'id, shop_id, day_id, section, amount, mode, party_id, created_at, source',
      values: `'{{uuid}}', '{{shop}}', '{{openDay}}', '${section}', 1000, '${mode}', ${
        section === 'udhar_sales' || section === 'udhar_collection' ? "'{{party}}'" : 'NULL'
      }, '{{now}}', 'manual'`,
    },
  });
}

/* ---- entries_due_ck: a due date belongs only to a purchase on credit ---- */
for (const [section, mode] of [
  ['purchase', 'cash'],
  ['udhar_sales', 'udhar'],
  ['expense', 'cash'],
] as const) {
  cases.push({
    name: `time-due-date-on-a-${mode}-${section.replace(/_/g, '-')}`,
    violates: 'only a purchase taken on credit carries a due date',
    layers: ['schema'],
    schema: {
      table: 'entries',
      columns:
        'id, shop_id, day_id, section, amount, mode, party_id, due_date, created_at, source',
      values: `'{{uuid}}', '{{shop}}', '{{openDay}}', '${section}', 1000, '${mode}', ${
        section === 'udhar_sales' ? "'{{party}}'" : 'NULL'
      }, '2026-08-01', '{{now}}', 'manual'`,
    },
  });
}

/* ---- entries_party_ck, from both sides ---- */
for (const section of ['cash_sales', 'expense', 'withdrawal'] as const) {
  cases.push({
    name: `identity-party-on-a-${section.replace(/_/g, '-')}`,
    violates: `a ${section} row names no party`,
    layers: ['schema'],
    schema: {
      table: 'entries',
      columns: 'id, shop_id, day_id, section, amount, mode, party_id, created_at, source',
      values: `'{{uuid}}', '{{shop}}', '{{openDay}}', '${section}', 1000, 'cash', '{{party}}', '{{now}}', 'manual'`,
    },
  });
}
for (const section of ['udhar_collection', 'party_payment'] as const) {
  cases.push({
    name: `identity-${section.replace(/_/g, '-')}-without-a-party`,
    violates: `a ${section} row must name the party it moves money with`,
    layers: ['schema'],
    schema: {
      table: 'entries',
      columns: 'id, shop_id, day_id, section, amount, mode, created_at, source',
      values: `'{{uuid}}', '{{shop}}', '{{openDay}}', '${section}', 1000, 'cash', '{{now}}', 'manual'`,
    },
  });
}

/*
 * A NUMERIC STRING IS NOT A REJECTION CASE, AND FINDING THAT OUT WAS WORTH THE TRY.
 *
 * `'1000'` inserted into an INTEGER column is not refused by
 * `CHECK (typeof(amount) = 'integer')`. SQLite's column affinity converts the string
 * to the integer 1000 BEFORE the constraint is evaluated, so typeof() sees an
 * integer and the row is stored with the correct value.
 *
 * So the guard is weaker than it looks - it cannot stop a string - and it does not
 * need to, because affinity has already produced the right value. What it DOES stop
 * is a REAL: '1500.5' keeps REAL affinity, typeof() sees 'real', and the row is
 * refused. That is the case worth having, and it is below.
 *
 * Two cases asserting the string form were written and removed rather than left to
 * fail: a corpus entry that describes something the system correctly accepts is not
 * a rejection case, it is a wrong expectation.
 */

/* ---- days_opening_ck and days_counted_ck ---- */
for (const [label, col, bad, why] of [
  ['opening-cash-fractional', 'opening_cash', '5000.5', 'opening cash is an integer number of paise, never a fraction'],
  ['opening-cash-negative', 'opening_cash', '-1', 'opening cash cannot be negative'],
  ['counted-cash-fractional', 'counted_cash', '1500.5', 'counted cash is an integer number of paise, never a fraction'],
  ['counted-cash-negative', 'counted_cash', '-1', 'counted cash cannot be negative'],
] as const) {
  cases.push({
    name: `money-${label}`,
    violates: why,
    layers: ['schema'],
    schema: {
      table: 'days',
      columns: `shop_id, date, state, ${col}, created_at`,
      values: `'{{shop}}', '2026-09-09', 'open', ${bad}, '{{now}}'`,
    },
  });
}

/* ---- parties: kind, and the due-days window at both ends ---- */
cases.push({
  name: 'enum-unknown-party-kind',
  violates: 'a party is a customer or a supplier and nothing else',
  layers: ['schema'],
  schema: {
    table: 'parties',
    columns: 'id, shop_id, kind, name, created_at',
    values: "'{{uuid}}', '{{shop}}', 'vendor', 'Test Party', '{{now}}'",
  },
});
for (const [n, v, why] of [
  ['negative', '-1', 'a due window cannot run backwards'],
  ['beyond-a-year', '366', 'a due window longer than a year is a data-entry error'],
] as const) {
  cases.push({
    name: `time-party-due-days-${n}`,
    violates: why,
    layers: ['schema'],
    schema: {
      table: 'parties',
      columns: 'id, shop_id, kind, name, default_due_days, created_at',
      values: `'{{uuid}}', '{{shop}}', 'customer', 'Test Party', ${v}, '{{now}}'`,
    },
  });
}

/* ---- users_phone_ck, at both ends of the window ---- */
for (const [n, phone, why] of [
  ['too-short', '1234567', 'a phone number shorter than the window cannot be real'],
  ['too-long', '12345678901234567', 'a phone number longer than the window cannot be real'],
] as const) {
  cases.push({
    name: `identity-phone-${n}`,
    violates: why,
    layers: ['schema'],
    schema: {
      table: 'users',
      columns: 'id, shop_id, phone, created_at',
      values: `'{{uuid}}', '{{shop}}', '${phone}', '{{now}}'`,
    },
  });
}

const byLayer = (l: Layer) => cases.filter((c) => c.layers.includes(l)).length;

const out = {
  $schema: 'https://swafto.app/schemas/rejects-v1.json',
  generatedBy: 'tools/author-rejects.ts',
  note:
    'THE REJECTION CORPUS (§5.11). vectors.json describes days that are VALID; this ' +
    'describes inputs that must be REFUSED, and names every layer obliged to refuse ' +
    'them. Cases whose only layer is `api` are pending the auth and sync work, and the ' +
    'runner reports them as PENDING rather than letting them pass silently.',
  count: cases.length,
  coverage: { engine: byLayer('engine'), schema: byLayer('schema'), api: byLayer('api') },
  cases,
};

writeFileSync('packages/formula-engine/rejects.json', JSON.stringify(out, null, 2) + '\n');
console.log(
  `wrote packages/formula-engine/rejects.json with ${cases.length} cases ` +
    `(engine ${byLayer('engine')}, schema ${byLayer('schema')}, api ${byLayer('api')})`,
);
