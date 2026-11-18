/** The few members error-boundary.spec.tsx uses. The package ships no types and @types is not installed. */
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';
  export interface ReactTestInstance {
    props: Record<string, any>;
    findByProps(props: Record<string, unknown>): ReactTestInstance;
  }
  export interface ReactTestRenderer {
    toJSON(): unknown;
    root: ReactTestInstance;
  }
  export function create(element: ReactElement): ReactTestRenderer;
  export function act(callback: () => void): void;
  const TestRenderer: { create: typeof create; act: typeof act };
  export default TestRenderer;
}
