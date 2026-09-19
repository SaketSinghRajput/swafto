/**
 * `swafto/no-money-float` - the rule ADR-003 has promised since G1 and never had.
 *
 * Constraint 6 says money is integer paise everywhere, LINT-ENFORCED. ADR-003 is
 * titled "enforced by lint" and specifies this rule by name and in four clauses. It
 * did not exist. ESLint was not installed, there was no config, and `npm run lint`
 * exited with "'eslint' is not recognized" - so a non-negotiable constraint rested on
 * a control that had never run. Same shape as F-01 and F-06: documented, believed,
 * absent.
 *
 * THE FOUR CLAUSES, transcribed from ADR-003 rather than invented here:
 *
 *   1. Bans `+ - * /` where either operand identifier matches the money pattern,
 *      outside `packages/formula-engine/src/money.ts` (the audited helpers).
 *   2. Bans `parseFloat(` and `Number(` applied to anything matching that pattern.
 *   3. Bans numeric literals with a decimal point anywhere under
 *      `packages/formula-engine/`.
 *   4. Requires `toFixed` and `Intl.NumberFormat` to appear only at the render
 *      boundary, `formatPaise`.
 *
 * WHY BANNING `+` IS NOT OVERZEALOUS. `0.1 + 0.2 !== 0.3`. Every primary figure P1-P8
 * is pure addition and subtraction of integers, which is exact - but only while every
 * operand really is an integer. The moment one float enters, the error is silent,
 * small, and lands in a number a shopkeeper is checking against the cash in his hand.
 * Routing arithmetic through the audited helpers is what makes `assertPaise`
 * unavoidable rather than optional.
 */

/** ADR-003's pattern, verbatim. */
const MONEY = /amount|paise|total|balance|cash|sum|opening|counted|expected/i;

/** The audited helpers, exempt from clause 1 - this is where the arithmetic lives. */
const MONEY_HELPERS = 'packages/formula-engine/src/money.ts';

/** Clause 3 applies to the whole engine package. */
const ENGINE = 'packages/formula-engine/';

/** Clause 4's render boundary. */
const RENDER_BOUNDARY = 'formatPaise';

const posix = (f) => f.split('\\').join('/');

/** Does this expression mention a money-ish identifier at its surface? */
function isMoneyish(node) {
  if (!node) return false;
  switch (node.type) {
    case 'Identifier':
      return MONEY.test(node.name);
    case 'MemberExpression':
      return (
        (node.property?.type === 'Identifier' && MONEY.test(node.property.name)) ||
        isMoneyish(node.object)
      );
    case 'CallExpression':
      return isMoneyish(node.callee);
    case 'TSNonNullExpression':
    case 'TSAsExpression':
      return isMoneyish(node.expression);
    default:
      return false;
  }
}

/** Is this callee `Intl.NumberFormat`? */
function isIntlNumberFormat(callee) {
  return (
    callee?.type === 'MemberExpression' &&
    callee.object?.type === 'Identifier' &&
    callee.object.name === 'Intl' &&
    callee.property?.type === 'Identifier' &&
    callee.property.name === 'NumberFormat'
  );
}

/** Every enclosing function name, for clause 4. */
function enclosingFunctionNames(node) {
  const names = [];
  for (let n = node; n; n = n.parent) {
    if (n.type === 'FunctionDeclaration' && n.id) names.push(n.id.name);
    if (
      (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') &&
      n.parent?.type === 'VariableDeclarator' &&
      n.parent.id?.type === 'Identifier'
    ) {
      names.push(n.parent.id.name);
    }
    if (n.type === 'MethodDefinition' && n.key?.type === 'Identifier') names.push(n.key.name);
  }
  return names;
}

export const noMoneyFloat = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Money is an integer number of paise. Arithmetic on money goes through the ' +
        'audited helpers in money.ts; formatting happens only at the render boundary.',
    },
    schema: [],
    messages: {
      arithmetic:
        "'{{op}}' applied directly to money ('{{name}}'). ADR-003: money is integer " +
        'paise and arithmetic goes through the audited helpers in money.ts (add, ' +
        'subtract, sum, divideMoney), which assert integrality. A float that reaches ' +
        'a figure here is silent, small, and lands in a number the shopkeeper is ' +
        'checking against the cash in his hand.',
      coercion:
        "'{{fn}}()' applied to money ('{{name}}'). ADR-003 bans it: both happily " +
        'produce a non-integer, and nothing downstream would notice.',
      decimalLiteral:
        'Numeric literal with a decimal point ({{raw}}) inside the formula engine. ' +
        'ADR-003: every money value is an integer number of paise. If this is not ' +
        'money, move it out of packages/formula-engine or express it as an integer.',
      renderOnly:
        "'{{what}}' may appear only at the render boundary ({{boundary}}). ADR-003 " +
        'keeps formatting in exactly one function; a second path is how a locale bug ' +
        'reaches one screen and not another (see DC-002).',
    },
  },

  create(context) {
    const file = posix(context.filename ?? context.getFilename());
    const inMoneyHelpers = file.endsWith(MONEY_HELPERS);
    const inEngine = file.includes(ENGINE);
    const isTest = /\.(spec|test)\.ts$/.test(file) || file.includes('/test/');

    return {
      /* ---- clause 1 · arithmetic on money ---------------------------- */
      BinaryExpression(node) {
        if (inMoneyHelpers) return; // the audited helpers ARE the arithmetic
        if (!['+', '-', '*', '/'].includes(node.operator)) return;
        for (const side of [node.left, node.right]) {
          if (isMoneyish(side)) {
            const name =
              side.type === 'Identifier'
                ? side.name
                : (side.property?.name ?? context.sourceCode.getText(side).slice(0, 40));
            context.report({ node, messageId: 'arithmetic', data: { op: node.operator, name } });
            return;
          }
        }
      },

      /* ---- clause 2 · coercions, and clause 4 · formatting ---------- */
      CallExpression(node) {
        const callee = node.callee;

        if (
          callee?.type === 'Identifier' &&
          (callee.name === 'parseFloat' || callee.name === 'Number') &&
          node.arguments.some(isMoneyish)
        ) {
          const arg = node.arguments.find(isMoneyish);
          context.report({
            node,
            messageId: 'coercion',
            data: {
              fn: callee.name,
              name: arg?.name ?? context.sourceCode.getText(arg).slice(0, 40),
            },
          });
        }

        const isToFixed =
          callee?.type === 'MemberExpression' &&
          callee.property?.type === 'Identifier' &&
          callee.property.name === 'toFixed';

        if ((isToFixed || isIntlNumberFormat(callee)) && !isTest) {
          if (!enclosingFunctionNames(node).includes(RENDER_BOUNDARY)) {
            context.report({
              node,
              messageId: 'renderOnly',
              data: {
                what: isToFixed ? 'toFixed' : 'Intl.NumberFormat',
                boundary: RENDER_BOUNDARY,
              },
            });
          }
        }
      },

      /**
       * `new Intl.NumberFormat(...)` is a NewExpression, not a CallExpression, so the
       * handler above never saw it - and `new` is the form people actually write.
       * Caught by the rule's own test on its first run, which is the argument for
       * writing the failing cases at the same time as the rule.
       */
      NewExpression(node) {
        if (isTest) return;
        if (!isIntlNumberFormat(node.callee)) return;
        if (enclosingFunctionNames(node).includes(RENDER_BOUNDARY)) return;
        context.report({
          node,
          messageId: 'renderOnly',
          data: { what: 'Intl.NumberFormat', boundary: RENDER_BOUNDARY },
        });
      },

      /* ---- clause 3 · no decimal literals in the engine -------------- */
      Literal(node) {
        if (!inEngine || isTest) return;
        if (typeof node.value !== 'number') return;
        if (!String(node.raw).includes('.')) return;
        context.report({ node, messageId: 'decimalLiteral', data: { raw: node.raw } });
      },
    };
  },
};

export default { rules: { 'no-money-float': noMoneyFloat } };
