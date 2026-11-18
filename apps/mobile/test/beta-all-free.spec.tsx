/**
 * BETA (owner, 2026-11-11): "for now put everything in free plan, we will
 * finalize after beta testing". A shop on the Free plan gets every feature, and
 * Settings offers no plan screen, because buying is closed and nothing can need
 * cancelling. The paid gate itself is still covered by the suites that switch
 * BETA off (plan.spec, S10, M1, C1, I1, S9, items, answer).
 */
import { describe, it, expect } from 'vitest';
import { Session } from '../src/app/session.tsx';
import { App } from '../src/app/App.tsx';
import { BETA, PREMIUM_FEATURES, allows } from '../src/app/plan.ts';
import { canonicalStore, itemsStore } from '../src/screens/registry.tsx';
import { phrase } from '../src/i18n/strings.ts';
import { render, all, text, type Node } from './render.tsx';
import type { Store } from '../src/store/index.ts';

const T0 = '2026-11-11T12:00:00.000Z';
const sessionOn = (store: Store): Session => {
  let n = 0;
  return new Session(store, { now: () => T0, newId: () => 'n' + String(++n) });
};
const has = (tree: Node, id: string): boolean =>
  all(tree).some((n) => String(n.props?.testID ?? '') === id);

describe('beta: everything is free', () => {
  it('the switch is on, and a free plan is allowed every Premium feature', () => {
    expect(BETA.allFree).toBe(true);
    for (const f of PREMIUM_FEATURES) expect(allows('free', f)).toBe(true);
  });

  it('a free shop sees the dashboard unlocked, with its item cards', () => {
    const s = sessionOn(itemsStore(canonicalStore()));
    expect(s.state.plan).toBe('free');
    s.goTo('M1');
    const tree = render(<App session={s} />);
    expect(has(tree, 'm1-locked')).toBe(false);
    expect(has(tree, 'item-cards')).toBe(true);
  });

  it('a free shop gets a shop-figure answer in Ask, not "needs Premium"', () => {
    const s = sessionOn(canonicalStore());
    s.openChat('T1');
    s.setChatDraft('which was the best day this month');
    s.askChat();
    expect(text(render(<App session={s} />))).not.toContain(phrase('c1.premium', 'en'));
  });

  it('a free shop can open items per sale and its own item list', () => {
    const s = sessionOn(canonicalStore());
    s.openItems();
    expect(s.state.screen).toBe('I1');
    s.goTo('S1');
    expect(has(render(<App session={s} />), 's1-items')).toBe(true);
  });

  it('Settings shows no plan row while buying is closed', () => {
    const s = sessionOn(canonicalStore());
    s.goTo('S1');
    expect(has(render(<App session={s} />), 's1-plan')).toBe(false);
  });
});
