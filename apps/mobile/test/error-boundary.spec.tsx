/**
 * The top-level error boundary, driven by a real React render with a child that
 * throws. react-test-renderer is deprecated but is the only renderer here that
 * runs error boundaries; the UI double supplies the host elements.
 */
import { describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { ErrorBoundary, type ErrorBoundaryProps } from '../src/platform/ErrorBoundary.tsx';
import { STRINGS } from '../src/i18n/strings.ts';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class LedgerLeak extends Error {
  constructor() {
    super('Ramesh Kumar owes Rs 5,000 on 9876543210');
    this.name = 'LedgerLeak';
  }
}

let shouldThrow = true;
const Bomb = (): ReactNode => {
  if (shouldThrow) throw new LedgerLeak();
  return createElement('Text', { testID: 'fine' }, 'ok');
};

const texts = (r: ReactTestRenderer): string => JSON.stringify(r.toJSON());

function mount(props: Omit<ErrorBoundaryProps, 'children'> = {}) {
  let r!: ReactTestRenderer;
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined); // React logs caught errors
  act(() => {
    r = TestRenderer.create(
      <ErrorBoundary {...props}>
        <Bomb />
      </ErrorBoundary>,
    );
  });
  return { r, errors };
}

describe('ErrorBoundary', () => {
  it('shows the translated calm screen with a Restart action instead of crashing', () => {
    shouldThrow = true;
    const { r, errors } = mount({ getLanguage: () => 'hi' });
    const out = texts(r);
    expect(out).toContain(STRINGS['crash.title'].hi);
    expect(out).toContain(STRINGS['crash.body'].hi);
    expect(out).toContain(STRINGS['crash.restart'].hi);
    expect(out).not.toContain(STRINGS['crash.title'].en);
    expect(r.root.findByProps({ testID: 'crash-restart' })).toBeTruthy();
    errors.mockRestore();
  });

  it('shows all three languages when the shop language is unknown', () => {
    shouldThrow = true;
    const { r, errors } = mount();
    const out = texts(r);
    for (const l of ['en', 'hi', 'or'] as const) expect(out).toContain(STRINGS['crash.title'][l]);
    errors.mockRestore();
  });

  it('survives a getLanguage that itself throws', () => {
    shouldThrow = true;
    const { r, errors } = mount({
      getLanguage: () => {
        throw new Error('host is the thing that broke');
      },
    });
    expect(texts(r)).toContain(STRINGS['crash.title'].en);
    errors.mockRestore();
  });

  it('reports only the error class name - never the message or stack', () => {
    shouldThrow = true;
    const seen: string[] = [];
    const { errors } = mount({ onError: (k) => seen.push(k) });
    expect(seen).toEqual(['LedgerLeak']);
    expect(JSON.stringify(seen)).not.toMatch(/Ramesh|5,000|9876543210/);
    errors.mockRestore();
  });

  it('a throwing onError sink does not take the error screen down', () => {
    shouldThrow = true;
    const { r, errors } = mount({
      onError: () => {
        throw new Error('sink down');
      },
    });
    expect(texts(r)).toContain(STRINGS['crash.restart'].en);
    errors.mockRestore();
  });

  it('Restart remounts the children, which then render normally', () => {
    shouldThrow = true;
    const { r, errors } = mount({ getLanguage: () => 'en' });
    shouldThrow = false;
    act(() => {
      (r.root.findByProps({ testID: 'crash-restart' }).props.onPress as () => void)();
    });
    expect(texts(r)).toContain('"testID":"fine"');
    expect(texts(r)).not.toContain(STRINGS['crash.title'].en);
    errors.mockRestore();
  });

  it('renders children untouched when nothing throws', () => {
    shouldThrow = false;
    const { r, errors } = mount();
    expect(texts(r)).toContain('"testID":"fine"');
    errors.mockRestore();
  });

  it('is wired at the entry point, outside Root', async () => {
    const { readFileSync } = await import('node:fs');
    const entry = readFileSync(new URL('../index.js', import.meta.url), 'utf8');
    expect(entry).toMatch(/createElement\(ErrorBoundary, null, createElement\(Root\)\)/);
  });
});
