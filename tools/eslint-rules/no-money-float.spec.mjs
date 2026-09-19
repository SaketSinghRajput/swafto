/**
 * `swafto/no-money-float`, exercised against all four ADR-003 clauses.
 *
 * §5.1: a check that has never rejected anything is decoration. Every clause below
 * has both a passing case and a failing one, because a rule that only ever sees valid
 * code is indistinguishable from a rule that does nothing - which is precisely the
 * state this rule was in for seventeen iterations, when it did not exist at all while
 * two ADRs and one non-negotiable constraint claimed it did.
 */
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';
import { noMoneyFloat } from './no-money-float.mjs';

const ruleTester = new RuleTester({
  // Flat config matches `**/*.js` by default, so without this every .ts fixture below
  // reported "No matching configuration found" - one message, no rule ever invoked.
  // The suite failed loudly rather than passing on zero findings, which is the only
  // reason it was noticed.
  files: ['**/*.ts', '**/*.mjs'],
  languageOptions: { parser, ecmaVersion: 2023, sourceType: 'module' },
});

describe('swafto/no-money-float', () => {
  it('enforces all four ADR-003 clauses', () => {
    ruleTester.run('no-money-float', noMoneyFloat, {
      valid: [
        // Clause 1 · the audited helpers are where money arithmetic belongs.
        {
          code: 'export const add = (a, b) => { const totalPaise = a + b; return totalPaise; };',
          filename: 'packages/formula-engine/src/money.ts',
        },
        // Clause 1 · arithmetic on things that are not money is untouched.
        {
          code: 'const daysUntilDue = due - today;',
          filename: 'packages/formula-engine/src/operational.ts',
        },
        // Clause 1 · going through the helpers is the sanctioned route.
        {
          code: 'const closingCash = sum([openingCash, cashSales]);',
          filename: 'packages/formula-engine/src/primary.ts',
        },
        // Clause 3 · integers are fine in the engine; the decimal point is the ban.
        {
          code: 'const GATE_DAYS = 14;',
          filename: 'packages/formula-engine/src/intelligence.ts',
        },
        // Clause 3 · a decimal outside the engine is not this rule's business.
        {
          code: 'const ratio = 0.5;',
          filename: 'tools/detection-rate.mjs',
        },
        // Clause 4 · the render boundary may format.
        {
          code: 'export function formatPaise(p) { return p.toFixed(2); }',
          filename: 'packages/formula-engine/src/money.ts',
        },
      ],

      invalid: [
        // ---- clause 1 · arithmetic on money outside the helpers ----
        {
          code: 'const t = openingCash + 50;',
          filename: 'packages/formula-engine/src/primary.ts',
          errors: [{ messageId: 'arithmetic' }],
        },
        {
          code: 'const diff = countedCash - expectedCash;',
          filename: 'apps/api/src/sync/reconcile.ts',
          errors: [{ messageId: 'arithmetic' }],
        },
        {
          code: 'const share = entry.amount / 3;',
          filename: 'apps/api/src/reports/split.ts',
          errors: [{ messageId: 'arithmetic' }],
        },
        {
          code: 'const scaled = totalPaise * 1.18;',
          filename: 'apps/api/src/gst.ts',
          errors: [{ messageId: 'arithmetic' }],
        },

        // ---- clause 2 · coercions that can produce a non-integer ----
        {
          code: 'const v = parseFloat(amountFromForm);',
          filename: 'apps/api/src/entries.ts',
          errors: [{ messageId: 'coercion' }],
        },
        {
          code: 'const v = Number(row.opening_cash);',
          filename: 'apps/api/src/days.ts',
          errors: [{ messageId: 'coercion' }],
        },

        // ---- clause 3 · a decimal literal anywhere in the engine ----
        {
          code: 'const RATE = 0.18;',
          filename: 'packages/formula-engine/src/intelligence.ts',
          errors: [{ messageId: 'decimalLiteral' }],
        },
        {
          // The classic: rupees expressed as a float. Exactly what ADR-003 is for.
          code: 'const defaultFloat = 1500.50;',
          filename: 'packages/formula-engine/src/primary.ts',
          errors: [{ messageId: 'decimalLiteral' }],
        },

        // ---- clause 4 · formatting outside the render boundary ----
        {
          code: 'export function renderRow(p) { return p.toFixed(2); }',
          filename: 'apps/api/src/reports/row.ts',
          errors: [{ messageId: 'renderOnly' }],
        },
        {
          code: "const f = new Intl.NumberFormat('en-IN');",
          filename: 'apps/api/src/reports/row.ts',
          errors: [{ messageId: 'renderOnly' }],
        },
      ],
    });
  });
});
