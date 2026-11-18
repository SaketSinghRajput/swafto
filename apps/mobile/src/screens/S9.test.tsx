/**
 * S9 YOUR ITEMS (PR-1, Premium) - the §B.6 bar.
 *
 * THE PROPERTIES THAT MATTER: names only (no price field anywhere), append-only,
 * the customer notice is there, and on a free plan the list stays readable while
 * the add field is absent. Driven through `<App session>` from S1.
 */
import { describe, it, expect } from 'vitest';
import { YourItems } from './S9.tsx';
import { canonicalStore, adversarialStore, itemsStore } from './registry.tsx';
import { Session } from '../app/session.tsx';
import { App } from '../app/App.tsx';
import { render, all, byTestId, byType, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { CANONICAL_DATE } from '@swafto/fixtures';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { phrase, type Language } from '../i18n/strings.ts';
import type { Plan } from '../app/plan.ts';
import { PREMIUM_RENEWING } from './registry.tsx';
import type { Store } from '../store/index.ts';

const T0 = CANONICAL_DATE + 'T21:00:00.000Z';
const sessionOn = (store: Store, plan: Plan = 'premium'): Session => {
  let n = 0;
  const s = new Session(store, { now: () => T0, newId: () => 'n' + String(++n) });
  // The plan comes only from a server answer (PR-7), as on the phone.
  if (plan === 'premium') s.setPlanAnswer(PREMIUM_RENEWING);
  return s;
};
const has = (tree: ReturnType<typeof render>, testID: string) => all(tree).some((n) => n.props?.testID === testID);

describe('S9 renders all four states', () => {
  it('loading', () => {
    const tree = render(<YourItems store={canonicalStore()} plan="premium" status="loading" />);
    expect(byTestId(tree, 's9-loading')).toBeTruthy();
    expect(byTestId(tree, 'loading-skeleton').children).toHaveLength(3); // v2 3.12: three static skeleton rows replace the spinner
  });

  it('error', () => {
    expect(byTestId(render(<YourItems store={canonicalStore()} plan="premium" status="error" />), 's9-error')).toBeTruthy();
  });

  it('empty: no items yet says so, and the add field is there', () => {
    const tree = render(<YourItems store={canonicalStore()} plan="premium" />);
    expect(text(byTestId(tree, 's9-empty'))).toBe(phrase('s9.empty', 'en'));
    expect(has(tree, 's9-name')).toBe(true);
  });

  it('loaded: every name on his list, and the customer notice', () => {
    const store = itemsStore(canonicalStore());
    const tree = render(<YourItems store={store} plan="premium" />);
    for (const i of store.items) expect(text(byTestId(tree, 's9-item-name-' + i.id))).toBe(i.name);
    expect(text(byTestId(tree, 's9-notice-text'))).toBe(phrase('s9.notice', 'en'));
  });
});

describe('S9 - names only, added once', () => {
  it('from S1: a typed name added mutates the store, the field clears, a repeat name is refused', () => {
    const store = canonicalStore();
    const s = sessionOn(store);
    s.goTo('S1');
    byTestId(render(<App session={s} />), 's1-items').props.onPress();
    expect(s.state.screen).toBe('S9');
    byTestId(render(<App session={s} />), 's9-name').props.onChangeText('  Atta 5kg ');
    byTestId(render(<App session={s} />), 's9-add-button').props.onPress();
    expect(store.items.map((i) => i.name)).toEqual(['Atta 5kg']);
    expect(s.state.itemName).toBe('');
    s.setItemName('atta 5KG');
    expect(s.addItem()).toBe(false);
    expect(store.items).toHaveLength(1);
    // HT-47: the refusal says it is already on the list, not "check and try again".
    const banner = text(byTestId(render(<App session={s} />), 'refusal'));
    expect(banner).toContain(phrase('refusal.itemDuplicate', 'en'));
    expect(banner).not.toContain(phrase('refusal.other', 'en'));
    // Every recorded field of an item: no price, no stock.
    expect(Object.keys(store.items[0]!).sort()).toEqual(['createdAt', 'id', 'name']);
  });

  it('there is no amount field on this screen, and the only text box is the name', () => {
    const tree = render(<YourItems store={canonicalStore()} plan="premium" draftName="Dal" />);
    expect(all(tree).filter((n) => n.type === 'TextInput').map((n) => n.props.testID)).toEqual(['s9-name']);
    expect(has(tree, 'keypad')).toBe(false);
  });

  it('on a free plan: no add field, the list recorded under Premium still reads, and S1 offers it only then', () => {
    const empty = sessionOn(canonicalStore(), 'free');
    empty.goTo('S1');
    expect(has(render(<App session={empty} />), 's1-items')).toBe(false);
    const store = itemsStore(canonicalStore());
    const tree = render(<YourItems store={store} plan="free" />);
    expect(has(tree, 's9-name')).toBe(false);
    expect(text(byTestId(tree, 's9-premium'))).toBe(phrase('s9.premium', 'en'));
    expect(has(tree, 's9-item-' + store.items[0]!.id)).toBe(true);
    const lapsed = sessionOn(store, 'free');
    lapsed.goTo('S1');
    expect(has(render(<App session={lapsed} />), 's1-items')).toBe(true);
    lapsed.setItemName('Soap');
    expect(lapsed.addItem()).toBe(false);
    expect(store.items).toHaveLength(3);
  });

  it('back from S9 is S1', () => {
    const s = sessionOn(canonicalStore());
    s.goTo('S9');
    s.back();
    expect(s.state.screen).toBe('S1');
  });
});

describe('S9 against both fixtures and every language', () => {
  it('adversarial: the longest names wrap and render', () => {
    const store = itemsStore(adversarialStore());
    const tree = render(<YourItems store={store} plan="premium" />);
    expect(store.items.every((i) => has(tree, 's9-item-' + i.id))).toBe(true);
  });

  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': title, intro and notice are in that language', () => {
      const tree = render(<YourItems store={canonicalStore()} plan="premium" language={language} />);
      expect(text(byTestId(tree, 's9-title'))).toBe(phrase('s9.title', language));
      expect(text(byTestId(tree, 's9-intro'))).toBe(phrase('s9.intro', language));
      expect(text(byTestId(tree, 's9-notice-text'))).toBe(phrase('s9.notice', language));
    });
  }

  it('longest string mode keeps the intro, the list and the notice', () => {
    const tree = render(<YourItems store={itemsStore(adversarialStore())} plan="premium" language="longest" display="focus" />);
    for (const id of ['s9-intro', 's9-list', 's9-notice-text']) expect(byTestId(tree, id)).toBeTruthy();
  });

  it('chrome is capped', () => {
    const tree = render(<YourItems store={canonicalStore()} plan="premium" />);
    expect(byTestId(tree, 's9-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });
});

describe('S9 accessibility, and no keypad', () => {
  const TREES = () => [
    render(<YourItems store={canonicalStore()} plan="premium" draftName="Dal" />),
    render(<YourItems store={itemsStore(adversarialStore())} plan="premium" display="focus" />),
    render(<YourItems store={itemsStore(canonicalStore())} plan="free" />),
  ];

  it('every target meets TOUCH_TARGET_MIN_DP', () => {
    for (const tree of TREES()) expect(undersizedTargets(tree)).toEqual([]);
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('no text under the floor, no colour under the minimum', () => {
    for (const tree of TREES()) {
      expect(undersizedText(tree)).toEqual([]);
      expect(failingContrast(tree)).toEqual([]);
    }
  });

  it('not an entry screen: no keypad and no bottom nav', () => {
    for (const tree of TREES()) {
      expect(has(tree, 'keypad')).toBe(false);
      expect(
        all(tree)
          .map((n) => String(n.props?.testID ?? ''))
          .filter((id) => /nav|tabbar|bottom-bar/i.test(id)),
      ).toEqual([]);
    }
  });
});

/*
 * BETA: these tests cover the Free/Premium gate as it will stand after beta,
 * so the all-free beta switch is off for this file and restored after it.
 */
import { beforeAll as betaOff, afterAll as betaOn } from 'vitest';
import { BETA } from '../app/plan.ts';
betaOff(() => {
  BETA.allFree = false;
});
betaOn(() => {
  BETA.allFree = true;
});
