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
