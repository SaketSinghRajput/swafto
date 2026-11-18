/**
 * S13 - YOUR DATA. DPDP access as one button, and the honest words around it.
 */
import { describe, it, expect } from 'vitest';
import { YourData } from './S13.tsx';
import { Session } from '../app/session.tsx';
import { App } from '../app/App.tsx';
import { render, all, byTestId, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { canonicalStore, adversarialStore } from './registry.tsx';
import { phrase, type Language } from '../i18n/strings.ts';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { CANONICAL_DATE } from '@swafto/fixtures';
import type { Entry } from '@swafto/formula-engine';

const ids = (tree: ReturnType<typeof render>) => all(tree).map((n) => String(n.props?.testID ?? ''));

const cashSale = (id: string, amount: number): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section: 'cash_sales',
    mode: 'cash',
    source: 'manual',
    amount,
    createdAt: CANONICAL_DATE + 'T10:00:00.000Z',
  }) as Entry;

describe('S13 renders all four states', () => {
  it('loading: the skeleton, and no button pretending the export is ready', () => {
    const tree = render(<YourData store={canonicalStore()} status="loading" />);
    expect(byTestId(tree, 's13-loading')).toBeTruthy();
    expect(ids(tree)).not.toContain('s13-download');
  });

  it('error: says nothing was lost, and offers a way back', () => {
    const tree = render(<YourData store={canonicalStore()} status="error" />);
    expect(text(byTestId(tree, 's13-error'))).toContain(phrase('common.error', 'en'));
    expect(byTestId(tree, 's13-retry')).toBeTruthy();
  });

  it('empty is not a state it has: the explanation and the button are structural', () => {
    expect(ids(render(<YourData store={canonicalStore()} />))).not.toContain('s13-empty');
  });

  it('loaded: what is held, the one button, and the two other rights in words', () => {
    const tree = render(<YourData store={canonicalStore()} onDownload={() => {}} />);
    expect(text(byTestId(tree, 's13-what'))).toBe(phrase('s13.body', 'en'));
    expect(text(byTestId(tree, 's13-download'))).toBe(phrase('s13.download', 'en'));
    expect(text(byTestId(tree, 's13-correct'))).toBe(phrase('s13.correct', 'en'));
    expect(text(byTestId(tree, 's13-delete'))).toBe(phrase('s7.title', 'en'));
  });
});

describe('S13 asks once and says what happened', () => {
  it('the button hands the request out; the screen sends nothing itself', () => {
    const asked: string[] = [];
    byTestId(render(<YourData store={canonicalStore()} onDownload={() => asked.push('x')} />), 's13-download').props.onPress();
    expect(asked).toEqual(['x']);
  });

  it('busy is a disabled button, never a spinner', () => {
    const tree = render(<YourData store={canonicalStore()} phase="busy" onDownload={() => {}} />);
    expect(byTestId(tree, 's13-download').props.accessibilityState).toEqual({ disabled: true });
    expect(all(tree).some((n) => n.type === 'ActivityIndicator')).toBe(false);
  });

  it('offline says nothing was downloaded - and only then', () => {
    expect(text(byTestId(render(<YourData store={canonicalStore()} phase="offline" />), 's13-offline-text'))).toBe(
      phrase('s13.offline', 'en'),
    );
    expect(ids(render(<YourData store={canonicalStore()} phase="done" />))).not.toContain('s13-offline');
  });

  it('with no session there is nothing to ask the server, so the button is disabled', () => {
    expect(byTestId(render(<YourData store={canonicalStore()} />), 's13-download').props.disabled).toBe(true);
  });

  it('is reached from the Settings hub, and Back returns there', () => {
    let n = 0;
    const s = new Session(canonicalStore(), { now: () => CANONICAL_DATE + 'T12:00:00.000Z', newId: () => 'id' + String(++n) });
    s.goTo('S1');
    byTestId(render(<App session={s} />), 's1-your-data').props.onPress();
    expect(s.state.screen).toBe('S13');
    expect(s.state.myData).toBe('idle');
    s.back();
    expect(s.state.screen).toBe('S1');
  });
});

describe('S13 mutates the store and nothing moves, because it displays no figure', () => {
  it('a day that changes under the screen changes none of its text', () => {
    const store = canonicalStore();
    const before = text(render(<YourData store={store} />));
    store.append(cashSale('s13-wired-1', 150000));
    expect(text(render(<YourData store={store} />))).toBe(before);
  });

  it('no rupee figure on the adversarial shop either', () => {
    expect(text(render(<YourData store={adversarialStore()} />))).not.toContain('₹');
  });
});

describe('S13 in every language, including the longest string worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title and the button are in that language', () => {
      const tree = render(<YourData store={canonicalStore()} language={language} />);
      expect(text(byTestId(tree, 's13-title'))).toBe(phrase('s13.title', language));
      expect(text(byTestId(tree, 's13-download'))).toBe(phrase('s13.download', language));
    });
  }

  it('longest string mode in Focus keeps every part', () => {
    const tree = render(<YourData store={adversarialStore()} language="longest" display="focus" phase="offline" />);
    for (const id of ['s13-what', 's13-offline', 's13-correct', 's13-delete', 's13-download']) {
      expect(byTestId(tree, id), id).toBeTruthy();
    }
  });

  it('chrome is capped', () => {
    expect(byTestId(render(<YourData store={canonicalStore()} />), 's13-title').props?.maxFontSizeMultiplier).toBe(
      CHROME_FONT_SCALE_CAP,
    );
  });
});

describe('S13 accessibility, and no keypad', () => {
  const TREES = () => [
    render(<YourData store={canonicalStore()} onDownload={() => {}} />),
    render(<YourData store={adversarialStore()} display="focus" phase="offline" />),
    render(<YourData store={canonicalStore()} phase="failed" language="or" />),
  ];

  it('every target meets TOUCH_TARGET_MIN_DP, every text the floor, every colour the minimum', () => {
    for (const tree of TREES()) {
      expect(undersizedTargets(tree)).toEqual([]);
      expect(undersizedText(tree)).toEqual([]);
      expect(failingContrast(tree)).toEqual([]);
    }
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('nothing is typed here, so no keypad - and no bottom nav either', () => {
    for (const tree of TREES()) {
      expect(ids(tree).filter((id) => /^keypad/.test(id))).toEqual([]);
      expect(ids(tree).filter((id) => /nav/i.test(id))).toEqual([]);
    }
  });
});
