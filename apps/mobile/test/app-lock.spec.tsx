/**
 * R5 FR-3 - THE APP LOCK'S POLICY, driven through the real Host and Session
 * with a fake phone and a clock the test moves.
 *
 * What is pinned here is the decision, not the plumbing: when the cover goes
 * up, what a cancelled confirm means (stay covered), what an unavailable one
 * means (let him in, say so), and that locking never costs him what he typed.
 */
import { describe, it, expect } from 'vitest';
import { Host, LOCK_AFTER_MS } from '../src/host.tsx';
import { App } from '../src/app/App.tsx';
import { Store, memoryPort, type StoreState } from '../src/store/index.ts';
import type { ConfirmResult, DeviceBridge } from '../src/platform/device.ts';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';
import { render, all, text } from './render.tsx';
import { phrase } from '../src/i18n/strings.ts';

const T0 = Date.parse(CANONICAL_DATE + 'T10:00:00.000Z');

function memoryStorage(initial: string | null = null) {
  let held = initial;
  return {
    read: () => held,
    write: (value: string | null) => {
      held = value;
    },
  };
}

/** A phone: whether it has a screen lock, and how he answers the next confirm. */
interface FakePhone {
  secure: boolean;
  answer: ConfirmResult;
  asked: number;
  /** What the phone's prompt was titled and said, each time it was asked. */
  prompts: [string, string][];
  bridge: DeviceBridge;
}

function fakePhone(secure = true, answer: ConfirmResult = 'ok'): FakePhone {
  const phone: FakePhone = {
    secure,
    answer,
    asked: 0,
    prompts: [],
    bridge: {
      isDeviceSecure: async () => phone.secure,
      confirmCredential: async (title: string, body: string): Promise<ConfirmResult> => {
        phone.asked += 1;
        phone.prompts.push([title, body]);
        return phone.answer;
      },
      shareTextFile: async () => {},
    } as DeviceBridge,
  };
  return phone;
}

const boot = (opts: { prefs?: ReturnType<typeof memoryStorage>; phone?: ReturnType<typeof fakePhone> } = {}) => {
  let now = T0;
  const base = canonicalInput();
  const state: StoreState = {
    shopName: 'Test Store',
    shopId: '11111111-1111-4111-8111-000000000001',
    day: { ...base.day, state: 'open', openingCash: 0 },
    entries: [],
    parties: CANONICAL_PARTIES,
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
    skippedSections: [],
  };
  const iso = () => new Date(now).toISOString();
  const host = new Host({
    baseUrl: 'https://api.example.test',
    fetch: async () => ({ status: 200, text: async () => '{}' }),
    storage: memoryStorage(),
    store: new Store(memoryPort(state), iso),
    now: iso,
    newId: () => '5a1e0000-0000-4000-8000-000000000999',
    prefs: opts.prefs ?? memoryStorage(),
    ...(opts.phone ? { device: opts.phone.bridge } : {}),
  });
  return {
    host,
    advance: (ms: number) => {
      now += ms;
    },
  };
};

const lockOn = () => memoryStorage(JSON.stringify({ appLock: true }));
const testIDs = (tree: ReturnType<typeof render>) =>
  all(tree)
    .map((n) => String(n.props?.testID ?? ''))
    .filter(Boolean);

describe('R5 FR-3 · when the cover goes up', () => {
  it('a cold start with the lock on is covered before anything is drawn', () => {
    const { host } = boot({ prefs: lockOn(), phone: fakePhone() });
    expect(host.session.state.locked).toBe(true);
    const ids = testIDs(render(<App session={host.session} />));
    expect(ids).toContain('s11-unlock');
    // Not the cover OVER Today: Today is not in the tree at all.
    expect(ids.filter((id) => id.startsWith('t1'))).toEqual([]);
  });

  it('with the lock off, a cold start is not covered', () => {
    const { host } = boot({ phone: fakePhone() });
    expect(host.session.state.locked).toBe(false);
  });

  it('away for one millisecond under the limit does not lock; away for the limit does', () => {
    const { host, advance } = boot({ prefs: lockOn(), phone: fakePhone(true, 'cancelled') });
    host.session.setLock({ locked: false });

    host.appStateChanged('background');
    advance(LOCK_AFTER_MS - 1);
    host.appStateChanged('active');
    expect(host.session.state.locked).toBe(false);

    host.appStateChanged('background');
    advance(LOCK_AFTER_MS);
    host.appStateChanged('active');
    expect(host.session.state.locked).toBe(true);
  });

  it('the round trip to the phone lock screen itself is not time away', async () => {
    const phone = fakePhone(true, 'ok');
    const { host, advance } = boot({ prefs: lockOn(), phone });
    let release: (r: ConfirmResult) => void = () => {};
    phone.bridge.confirmCredential = () => new Promise<ConfirmResult>((r) => (release = r));
    const unlocking = host.unlock();
    await Promise.resolve();
    host.appStateChanged('background'); // the confirm activity is in front
    advance(LOCK_AFTER_MS * 2);
    await new Promise((r) => setTimeout(r, 0));
    release('ok');
    await unlocking;
    host.appStateChanged('active');
    expect(host.session.state.locked).toBe(false);
  });
});

describe('R5 FR-3 · what an answer means', () => {
  it('ok unlocks', async () => {
    const { host } = boot({ prefs: lockOn(), phone: fakePhone(true, 'ok') });
    await host.unlock();
    expect(host.session.state.locked).toBe(false);
    expect(host.session.state.lockNote).toBeNull();
  });

  it('cancelled stays on the cover, and Back leaves the app rather than revealing it', async () => {
    const { host } = boot({ prefs: lockOn(), phone: fakePhone(true, 'cancelled') });
    // Under the cover sits a screen that HAS a parent, so Back would otherwise move.
    host.session.goTo('S3');
    await host.unlock();
    expect(host.session.state.locked).toBe(true);
    expect(host.session.back()).toBe(false);
    expect(host.session.state.screen).toBe('S3');
    expect(host.session.state.locked).toBe(true);
  });

  it('a phone with no screen lock any more lets him in, and says the lock is paused', async () => {
    const { host } = boot({ prefs: lockOn(), phone: fakePhone(false) });
    await host.unlock();
    expect(host.session.state.locked).toBe(false);
    expect(host.session.state.lockNote).toBe('paused');
    expect(testIDs(render(<App session={host.session} />))).toContain('lock-paused');
  });

  it('a build with no native module is the same: in, with the note - never locked out', async () => {
    const { host } = boot({ prefs: lockOn() });
    await host.unlock();
    expect(host.session.state.locked).toBe(false);
    expect(host.session.state.lockNote).toBe('paused');
  });

  it('what he was typing survives the lock and the unlock', async () => {
    const phone = fakePhone(true, 'ok');
    const { host, advance } = boot({ prefs: lockOn(), phone });
    await host.unlock();
    host.session.openSection('cash_sales');
    host.session.press('4');
    host.session.press('5');
    host.appStateChanged('background');
    advance(LOCK_AFTER_MS);
    host.appStateChanged('active');
    expect(host.session.state.locked).toBe(true);
    await host.unlock();
    expect(host.session.state.screen).toBe('T7');
    expect(host.session.state.draftPaise).toBe(4500);
  });
});

describe('R5 FR-3 · the setting', () => {
  it('turning it on needs a confirm, and is kept for the next launch', async () => {
    const prefs = memoryStorage();
    const phone = fakePhone(true, 'ok');
    const { host } = boot({ prefs, phone });
    await host.setAppLock(true);
    expect(phone.asked).toBe(1);
    expect(host.session.state.appLock).toBe(true);
    expect(boot({ prefs, phone }).host.session.state.locked).toBe(true);
  });

  it('a cancelled confirm leaves it off', async () => {
    const { host } = boot({ phone: fakePhone(true, 'cancelled') });
    await host.setAppLock(true);
    expect(host.session.state.appLock).toBe(false);
  });

  it('on a phone with no screen lock it cannot be turned on, and S1 says why', async () => {
    const { host } = boot({ phone: fakePhone(false) });
    await host.setAppLock(true);
    expect(host.session.state.appLock).toBe(false);
    expect(host.session.state.lockNote).toBe('noScreenLock');
    host.session.goTo('S1');
    expect(testIDs(render(<App session={host.session} />))).toContain('s1-app-lock-unavailable');
  });

  it('turning it off needs a confirm too', async () => {
    const phone = fakePhone(true, 'cancelled');
    const { host } = boot({ prefs: lockOn(), phone });
    host.session.setLock({ locked: false });
    await host.setAppLock(false);
    expect(host.session.state.appLock).toBe(true);
    phone.answer = 'ok';
    await host.setAppLock(false);
    expect(host.session.state.appLock).toBe(false);
  });

  it('HT-45: the switch asks to turn the lock on or off, never says the app is locked', async () => {
    const phone = fakePhone(true, 'ok');
    const { host } = boot({ phone });
    await host.setAppLock(true);
    await host.setAppLock(false);
    expect(phone.prompts).toEqual([
      [phrase('s1.appLockOnTitle', 'en'), phrase('s1.appLockConfirmBody', 'en')],
      [phrase('s1.appLockOffTitle', 'en'), phrase('s1.appLockConfirmBody', 'en')],
    ]);
    // The cover's own Unlock keeps the cover's words.
    host.session.setLock({ locked: true });
    await host.unlock();
    expect(phone.prompts.at(-1)).toEqual([phrase('s11.title', 'en'), phrase('s11.confirmBody', 'en')]);
  });

  it('the cover shows no figure and no name from the book', () => {
    const { host } = boot({ prefs: lockOn(), phone: fakePhone() });
    const shown = text(render(<App session={host.session} />));
    expect(shown).not.toContain('₹');
    for (const p of CANONICAL_PARTIES) expect(shown).not.toContain(p.name);
    expect(shown).not.toContain('Test Store');
  });
});
