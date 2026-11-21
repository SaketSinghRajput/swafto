/**
 * X4 - THE APP-LOCK OFFER at the end of first-time setup (Saket, 2026-11-20),
 * driven through the real Host and Session with a fake phone: offered once,
 * Turn on runs the S1 enable flow, Not now goes on, a phone with no screen lock
 * is told and let through, and an install that finished setup never sees it.
 */
import { describe, it, expect } from 'vitest';
import { LockOffer } from './X4.tsx';
import { Host } from '../host.tsx';
import { App } from '../app/App.tsx';
import { Session } from '../app/session.tsx';
import { adversarialStore } from './registry.tsx';
import { Store, memoryPort, type StoreState } from '../store/index.ts';
import type { ConfirmResult, DeviceBridge } from '../platform/device.ts';
import { render, byTestId, text, all } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { phrase } from '../i18n/strings.ts';
import { canonicalInput, CANONICAL_DATE } from '@swafto/fixtures';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import type { Entry } from '@swafto/formula-engine';

const T0 = CANONICAL_DATE + 'T03:00:00.000Z';
const TOKENS = {
  accessToken: 'a',
  refreshToken: 'r',
  deviceId: '33333333-3333-4333-8333-000000000001',
  shopId: '11111111-1111-4111-8111-000000000001',
};

function memoryStorage(initial: string | null = null) {
  let held = initial;
  return {
    read: () => held,
    write: (v: string | null) => {
      held = v;
    },
    get raw() {
      return held;
    },
  };
}

function phone(secure: boolean, answer: ConfirmResult = 'ok') {
  const p = { asked: 0 };
  const bridge = {
    isDeviceSecure: async () => secure,
    confirmCredential: async () => {
      p.asked += 1;
      return answer;
    },
    shareTextFile: async () => {},
  } as DeviceBridge;
  return { p, bridge };
}

/** A first install, signed in, on X1 - or, with `shopName`, one that finished setup long ago. */
function boot(opts: { device?: DeviceBridge; shopName?: string; store?: Store; prefs?: ReturnType<typeof memoryStorage> }) {
  const base = canonicalInput();
  const state: StoreState = {
    ...(opts.shopName ? { shopName: opts.shopName } : {}),
    shopId: TOKENS.shopId,
    day: { ...base.day, state: 'open', openingCash: null },
    entries: [],
    parties: [],
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
    skippedSections: [],
  };
  const store = opts.store ?? new Store(memoryPort(state), () => T0);
  const prefs = opts.prefs ?? memoryStorage();
  const host = new Host({
    baseUrl: 'https://api.example.test',
    fetch: async () => ({ status: 200, text: async () => '{}' }),
    storage: memoryStorage(JSON.stringify(TOKENS)),
    store,
    now: () => T0,
    newId: () => '5a1e0000-0000-4000-8000-000000000999',
    prefs,
    ...(opts.device ? { device: opts.device } : {}),
  });
  return { host, store, prefs };
}

const finishSetup = (host: Host) => {
  expect(host.session.state.screen).toBe('X1');
  host.session.setShopName('Ravi Stores');
  expect(host.session.finishOnboarding()).toBe(true);
};
const ids = (host: Host) =>
  all(render(<App session={host.session} />))
    .map((n) => String(n.props?.testID ?? ''))
    .filter(Boolean);

describe('X4 - offered once, at the end of first-time setup', () => {
  it('setup ends on the offer, not on Today, and asks nothing yet', () => {
    const { p, bridge } = phone(true);
    const { host } = boot({ device: bridge });
    finishSetup(host);
    expect(host.session.state.screen).toBe('X4');
    expect(text(byTestId(render(<App session={host.session} />), 'x4-question'))).toBe(
      phrase('x4.question', 'en'),
    );
    expect(p.asked).toBe(0);
  });

  it('with an opening figure typed on X1 too, the offer still comes before Today', () => {
    const { bridge } = phone(true);
    const { host, store } = boot({ device: bridge });
    host.session.setShopName('Ravi Stores');
    host.session.press('5');
    expect(host.session.finishOnboarding()).toBe(true);
    expect(store.state.day.openingCash).toBe(500);
    expect(host.session.state.screen).toBe('X4');
  });

  it('Turn on runs the enable flow: the phone lock is asked, the lock is on and kept, then Today', async () => {
    const { p, bridge } = phone(true, 'ok');
    const { host, prefs } = boot({ device: bridge });
    finishSetup(host);
    await host.turnOnLockFromSetup();
    expect(p.asked).toBe(1);
    expect(host.session.state.appLock).toBe(true);
    expect(JSON.parse(prefs.raw ?? '{}').appLock).toBe(true);
    expect(host.session.state.screen).toBe('T1');
  });

  it('a cancelled phone prompt leaves the lock off and the offer up, with Not now still there', async () => {
    const { bridge } = phone(true, 'cancelled');
    const { host } = boot({ device: bridge });
    finishSetup(host);
    await host.turnOnLockFromSetup();
    expect(host.session.state.appLock).toBe(false);
    expect(host.session.state.screen).toBe('X4');
    expect(ids(host)).toContain('x4-not-now');
  });

  it('Not now goes on to Today with the lock off, and Settings still has the switch', () => {
    const { p, bridge } = phone(true);
    const { host } = boot({ device: bridge });
    finishSetup(host);
    byTestId(render(<App session={host.session} />), 'x4-not-now').props.onPress();
    expect(host.session.state.screen).toBe('T1');
    expect(host.session.state.appLock).toBe(false);
    expect(p.asked).toBe(0);
    host.session.goTo('S1');
    expect(ids(host).some((id) => id.startsWith('s1-') && id.toLowerCase().includes('lock'))).toBe(true);
  });

  it('Back on the offer is Not now - never back into setup, never out of the app', () => {
    const { bridge } = phone(true);
    const { host } = boot({ device: bridge });
    finishSetup(host);
    expect(host.session.back()).toBe(true);
    expect(host.session.state.screen).toBe('T1');
  });

  it('no screen lock on the phone: a short note, Continue, and setup goes on - never blocked', async () => {
    const { p, bridge } = phone(false);
    const { host } = boot({ device: bridge });
    finishSetup(host);
    await host.turnOnLockFromSetup();
    expect(p.asked).toBe(0);
    expect(host.session.state.appLock).toBe(false);
    expect(host.session.state.screen).toBe('X4');
    const tree = render(<App session={host.session} />);
    expect(text(byTestId(tree, 'x4-no-screen-lock'))).toBe(phrase('x4.noScreenLock', 'en'));
    byTestId(tree, 'x4-continue').props.onPress();
    expect(host.session.state.screen).toBe('T1');
    // The note was the offer's; it does not follow him onto Today.
    expect(host.session.state.lockNote).toBeNull();
  });

  it('is offered once: the next launch of the same install opens on Today', () => {
    const { bridge } = phone(true);
    const { host, store, prefs } = boot({ device: bridge });
    finishSetup(host);
    host.session.finishLockOffer();
    expect(boot({ device: bridge, store, prefs }).host.session.state.screen).toBe('T1');
  });

  it('an install that finished setup before this existed never sees it', () => {
    const { bridge } = phone(true);
    const { host } = boot({ device: bridge, shopName: 'Sharma Kirana' });
    expect(host.session.state.screen).toBe('T1');
    expect(ids(host)).not.toContain('x4');
  });

  it('with nothing to ask (no device bridge) setup goes straight to Today, as before', () => {
    const { host } = boot({});
    finishSetup(host);
    expect(host.session.state.screen).toBe('T1');
  });
});

describe('X4 - the screen', () => {
  it('Turn on and Not now, or the note and Continue - never both', () => {
    const offer = render(<LockOffer />);
    expect(text(byTestId(offer, 'x4-turn-on'))).toBe('Turn on');
    expect(text(byTestId(offer, 'x4-not-now'))).toBe('Not now');
    expect(all(offer).some((n) => n.props?.testID === 'x4-no-screen-lock')).toBe(false);
    const none = render(<LockOffer noScreenLock />);
    expect(all(none).some((n) => n.props?.testID === 'x4-turn-on')).toBe(false);
    expect(text(byTestId(none, 'x4-continue'))).toBe('Continue');
  });

  it('never says PIN, in any language', () => {
    for (const language of ['en', 'hi', 'or'] as const) {
      expect(text(render(<LockOffer language={language} noScreenLock />))).not.toMatch(/PIN/);
    }
  });

  it('the floors at the worst case: longest strings, Focus', () => {
    for (const noScreenLock of [false, true]) {
      const tree = render(<LockOffer language="longest" display="focus" noScreenLock={noScreenLock} />);
      expect(undersizedTargets(tree)).toEqual([]);
      expect(undersizedText(tree)).toEqual([]);
      expect(failingContrast(tree)).toEqual([]);
    }
  });
});

describe('X4 renders all four states', () => {
  it('loading and error come from the Shell; empty is not a state it has; loaded asks the question', () => {
    expect(byTestId(render(<LockOffer status="loading" />), 'x4-loading')).toBeTruthy();
    const retried: string[] = [];
    byTestId(render(<LockOffer status="error" onRetry={() => retried.push('again')} />), 'x4-retry').props.onPress();
    expect(retried).toEqual(['again']);
    const loaded = render(<LockOffer />);
    expect(all(loaded).some((n) => n.props?.testID === 'x4-empty')).toBe(false);
    expect(text(byTestId(loaded, 'x4-question'))).toBe(phrase('x4.question', 'en'));
  });
});

describe('X4 mutates the store and nothing moves, because it displays no figure', () => {
  it('a sale appended under the screen changes none of its text, and it shows no rupee', () => {
    const { host, store } = boot({ device: phone(true).bridge, shopName: 'Ravi Stores' });
    host.session.goTo('X4');
    const draw = () => text(render(<App session={host.session} />));
    const before = draw();
    store.append({
      id: '5a1e0000-0000-4000-8000-0000000000a2',
      dayId: store.state.day.date,
      section: 'cash_sales',
      amount: 150000,
      mode: 'cash',
      source: 'manual',
      createdAt: T0,
    } as Entry);
    expect(draw()).toBe(before);
    expect(before).not.toContain('₹');
  });
});

describe('X4 in every language, including the longest string worst case', () => {
  for (const language of ['en', 'hi', 'or'] as const) {
    it(language + ': the question and both answers are in that language', () => {
      const tree = render(<LockOffer language={language} />);
      expect(text(byTestId(tree, 'x4-question'))).toBe(phrase('x4.question', language));
      expect(text(byTestId(tree, 'x4-turn-on'))).toBe(phrase('x4.turnOn', language));
      expect(text(byTestId(tree, 'x4-not-now'))).toBe(phrase('x4.notNow', language));
    });
  }

  it('against the adversarial shop (longest names, lakh figures) it draws the same question and nothing of the book', () => {
    const s = new Session(adversarialStore(), { now: () => T0, newId: () => 'x', screen: 'X4', language: 'or' });
    const tree = render(<App session={s} />);
    expect(text(byTestId(tree, 'x4-question'))).toBe(phrase('x4.question', 'or'));
    expect(text(tree)).not.toContain('₹');
    expect(failingContrast(tree)).toEqual([]);
  });

  it('longest string mode, worst case in Focus, keeps the question, the note and Continue; chrome is capped', () => {
    const tree = render(<LockOffer language="longest" display="focus" noScreenLock />);
    expect(byTestId(tree, 'x4-no-screen-lock')).toBeTruthy();
    expect(byTestId(tree, 'x4-continue')).toBeTruthy();
    expect(byTestId(tree, 'x4-question').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });
});

describe('X4 accessibility, and no keypad', () => {
  it('every target meets TOUCH_TARGET_MIN_DP, every text the floor, every colour the minimum', () => {
    for (const display of ['comfort', 'focus'] as const) {
      for (const noScreenLock of [false, true]) {
        const tree = render(<LockOffer display={display} language="or" noScreenLock={noScreenLock} />);
        expect(undersizedTargets(tree)).toEqual([]);
        expect(undersizedText(tree)).toEqual([]);
        expect(failingContrast(tree)).toEqual([]);
      }
    }
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('no keypad: nothing is typed here', () => {
    expect(all(render(<LockOffer />)).some((n) => n.props?.testID === 'keypad')).toBe(false);
  });
});
