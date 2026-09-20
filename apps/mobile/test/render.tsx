/**
 * A twenty-line renderer, and the reason it is not a library.
 *
 * `react-test-renderer` is deprecated in React 19 and returned null here; the
 * alternative, `@testing-library/react-native`, needs React Native's jest preset and
 * therefore the Flow transform the seam exists to avoid.
 *
 * Neither is needed. The UI double emits plain host elements, so "rendering" is just
 * resolving function components until only hosts remain. That is all a structural
 * assertion requires, and it has the considerable virtue of doing nothing else -
 * there is no hidden layout pass and no environment, so nothing here could make a
 * reader believe a measurement had happened.
 *
 * NO HOOKS, NO EFFECTS, NO STATE. A component needing those has behaviour that
 * belongs in the store, where it can be tested without a renderer at all. If that
 * stops being true this file should be REPLACED rather than extended: quietly
 * growing a partial React implementation is how a test harness becomes a second
 * framework nobody chose.
 */
import { isValidElement, type ReactElement, type ReactNode } from 'react';

export interface Node {
  readonly type: string;
  readonly props: Record<string, any>;
  readonly children: Node[];
  readonly text: string;
}

const EMPTY: Node[] = [];

function resolve(node: ReactNode): Node[] {
  if (node === null || node === undefined || node === false || node === true) return EMPTY;
  if (typeof node === 'string' || typeof node === 'number') {
    return [{ type: '#text', props: {}, children: EMPTY, text: String(node) }];
  }
  if (Array.isArray(node)) return node.flatMap(resolve);
  if (!isValidElement(node)) return EMPTY;

  const el = node as ReactElement<any>;
  // A function component: call it, then resolve what it returned.
  if (typeof el.type === 'function') {
    return resolve((el.type as (p: unknown) => ReactNode)(el.props));
  }
  const children = resolve(el.props?.children);
  return [
    {
      type: String(el.type),
      props: el.props ?? {},
      children,
      text: children.map((c) => c.text).join(''),
    },
  ];
}

/** The rendered tree, with a single root. */
export function render(element: ReactElement): Node {
  const roots = resolve(element);
  if (roots.length !== 1) {
    throw new Error(`expected exactly one root element, got ${roots.length}`);
  }
  return roots[0]!;
}

/** Every node in the tree, depth first, root included. */
export function all(node: Node): Node[] {
  return [node, ...node.children.flatMap(all)];
}

/** Every node of a given host type - `byType(tree, 'Text')`. */
export const byType = (node: Node, type: string): Node[] =>
  all(node).filter((n) => n.type === type);

/** The one node carrying a testID, or a clear failure naming what was there instead. */
export function byTestId(node: Node, testID: string): Node {
  const hits = all(node).filter((n) => n.props?.testID === testID);
  if (hits.length !== 1) {
    const seen = all(node)
      .map((n) => n.props?.testID)
      .filter(Boolean);
    throw new Error(
      `expected exactly one node with testID "${testID}", found ${hits.length}. ` +
        `Present: ${seen.length ? seen.join(', ') : '(none)'}`,
    );
  }
  return hits[0]!;
}

/** All visible text in the tree, concatenated. */
export const text = (node: Node): string => node.text;
