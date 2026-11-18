/**
 * S14 - SIGNED-IN PHONES. The server's list, drawn as it was given, and one
 * destructive call that is asked before it is sent.
 */
import { describe, it, expect } from 'vitest';
import { SignedInPhones, lastUsed, type DevicesState } from './S14.tsx';
import { Session } from '../app/session.tsx';
import { App } from '../app/App.tsx';
import { render, all, byTestId, text } from '../../test/render.tsx';
import { undersizedTargets, undersizedText, failingContrast } from '../../test/a11y.tsx';
import { canonicalStore, adversarialStore, DEVICE_FIXTURE } from './registry.tsx';
import { phrase, strings, type Language } from '../i18n/strings.ts';
import { tokens } from '../theme/tokens.ts';
import { TOUCH_TARGET_MIN_DP, CHROME_FONT_SCALE_CAP } from '@swafto/values';
import { CANONICAL_DATE } from '@swafto/fixtures';
import type { Entry } from '@swafto/formula-engine';

const ids = (tree: ReturnType<typeof render>) => all(tree).map((n) => String(n.props?.testID ?? ''));
const ready = (over: Partial<DevicesState> = {}): DevicesState => ({
  status: 'ready',
  list: DEVICE_FIXTURE,
  confirm: null,
  done: false,
  ...over,
});
const screen = (over: Partial<DevicesState> = {}, extra: Record<string, unknown> = {}) =>
  render(<SignedInPhones store={canonicalStore()} devices={ready(over)} today={CANONICAL_DATE} {...extra} />);

const cashSale = (id: string, amount: number): Entry =>
  ({
    id,
    dayId: CANONICAL_DATE,
    section: 'cash_sales',
    amount,
    mode: 'cash',
    source: 'manual',
    createdAt: CANONICAL_DATE + 'T19:30:00.000Z',
  }) as Entry;

describe('S14 renders all four states', () => {
  it('loading: the skeleton while the server is asked, and no list pretending to be the answer', () => {
    const tree = render(<SignedInPhones store={canonicalStore()} today={CANONICAL_DATE} />);
    expect(byTestId(tree, 's14-loading')).toBeTruthy();
    expect(ids(tree)).not.toContain('s14-list');
  });

  it('error: the specific sentence, and Try again - never a guessed list', () => {
    const asked: string[] = [];
    const tree = screen({ status: 'error', list: [] }, { onRetry: () => asked.push('again') });
    expect(text(byTestId(tree, 's14-error-text'))).toBe(phrase('s14.error', 'en'));
    expect(ids(tree)).not.toContain('s14-list');
    byTestId(tree, 's14-retry').props.onPress();
    expect(asked).toEqual(['again']);
  });

  it('empty is not a state it has: an account always includes this phone', () => {
    expect(ids(screen())).not.toContain('s14-empty');
  });

  it('loaded: one row per device, named only by what the server said', () => {
    const tree = screen();
    expect(text(byTestId(tree, 's14-device-dev-this-name'))).toBe(phrase('s14.thisPhone', 'en'));
    expect(text(byTestId(tree, 's14-device-dev-old-name'))).toBe(phrase('s14.android', 'en'));
    expect(text(byTestId(tree, 's14-device-dev-this-detail'))).toBe(phrase('s14.lastUsed.now', 'en'));
    expect(text(byTestId(tree, 's14-device-dev-old-detail'))).toBe('Last used: 12 days ago');
    expect(text(byTestId(tree, 's14-device-dev-lost-detail'))).toBe(phrase('s14.revoked', 'en'));
  });
});

describe('S14 signs a phone out only after asking', () => {
  it('this phone and a phone already signed out offer no sign-out', () => {
    const tree = screen();
    expect(ids(tree)).toContain('s14-device-dev-old-signout');
    expect(ids(tree)).not.toContain('s14-device-dev-this-signout');
    expect(ids(tree)).not.toContain('s14-device-dev-lost-signout');
  });

  it('the question says what happens and what does not, and "keep" carries the weight', () => {
    const tree = screen({ confirm: 'dev-old' });
    expect(text(byTestId(tree, 's14-confirm-title'))).toBe(phrase('s14.confirm.title', 'en'));
    expect(text(byTestId(tree, 's14-confirm-body'))).toBe(phrase('s14.confirm.body', 'en'));
    const t = tokens('comfort');
    expect(byTestId(tree, 's14-confirm-keep').props.style.backgroundColor).toBe(t.color.brand);
    expect(byTestId(tree, 's14-confirm-yes').props.style.backgroundColor).not.toBe(t.color.brand);
  });

  it('through the session: ask, Back is "keep", ask again, confirm hands the id to the host', () => {
    let n = 0;
    const s = new Session(canonicalStore(), { now: () => CANONICAL_DATE + 'T12:00:00.000Z', newId: () => 'id' + String(++n) });
    const loads: string[] = [];
    const revoked: string[] = [];
    s.goTo('S1');
    // Signed out, the hub offers no device list: there is no session to list it with.
    expect(ids(render(<App session={s} />))).not.toContain('s1-devices');
    const auth = { signedIn: true } as unknown as NonNullable<Parameters<typeof App>[0]['auth']>;
    byTestId(render(<App session={s} auth={auth} onLoadDevices={() => loads.push('list')} />), 's1-devices').props.onPress();
    expect(s.state.screen).toBe('S14');
    expect(loads).toEqual(['list']);
    s.devicesLoaded(DEVICE_FIXTURE);

    // The session refuses to ask about this phone or a signed-out one.
    s.askSignOut('dev-this');
    s.askSignOut('dev-lost');
    expect(s.state.devices?.confirm).toBeNull();

    s.askSignOut('dev-old');
    expect(s.back()).toBe(true);
    expect(s.state.screen).toBe('S14');
    expect(s.state.devices?.confirm).toBeNull();

    s.askSignOut('dev-old');
    byTestId(render(<App session={s} onSignOutDevice={(id) => revoked.push(id)} />), 's14-confirm-yes').props.onPress();
    expect(revoked).toEqual(['dev-old']);
    s.signedOut();
    expect(text(byTestId(render(<App session={s} />), 's14-done-text'))).toBe(phrase('s14.done', 'en'));
    s.back();
    expect(s.state.screen).toBe('S1');
  });

  it('last used counts whole days from the server timestamp, against a date passed in', () => {
    const s = strings('en');
    const old = DEVICE_FIXTURE[1]!;
    expect(lastUsed(old, CANONICAL_DATE, s)).toBe('Last used: 12 days ago');
    expect(lastUsed({ ...old, lastSeenAt: CANONICAL_DATE + 'T01:00:00.000Z' }, CANONICAL_DATE, s)).toBe(
      phrase('s14.lastUsed.today', 'en'),
    );
    expect(lastUsed({ ...old, lastSeenAt: null }, CANONICAL_DATE, s)).toBe('');
  });
});

describe('S14 mutates the store and nothing moves, because it displays no figure', () => {
  it('a day that changes under the screen changes none of its text', () => {
    const store = canonicalStore();
    const draw = () => text(render(<SignedInPhones store={store} devices={ready()} today={CANONICAL_DATE} />));
    const before = draw();
    store.append(cashSale('s14-wired-1', 150000));
    expect(draw()).toBe(before);
    expect(before).not.toContain('₹');
  });
});

describe('S14 in every language, including the longest string worst case', () => {
  for (const language of ['en', 'hi', 'or'] as readonly Language[]) {
    it(language + ': the title and the sign-out are in that language', () => {
      const tree = render(
        <SignedInPhones store={canonicalStore()} devices={ready()} today={CANONICAL_DATE} language={language} />,
      );
      expect(text(byTestId(tree, 's14-title'))).toBe(phrase('s14.title', language));
      expect(text(byTestId(tree, 's14-device-dev-old-signout'))).toBe(phrase('s14.signOut', language));
    });
  }

  it('longest string mode on the adversarial shop, in Focus, keeps every row and the question', () => {
    const tree = render(
      <SignedInPhones
        store={adversarialStore()}
        devices={ready({ confirm: 'dev-old' })}
        today={CANONICAL_DATE}
        language="longest"
        display="focus"
      />,
    );
    for (const d of DEVICE_FIXTURE) expect(byTestId(tree, 's14-device-' + d.id)).toBeTruthy();
    expect(byTestId(tree, 's14-confirm')).toBeTruthy();
  });

  it('chrome is capped', () => {
    expect(byTestId(screen(), 's14-title').props?.maxFontSizeMultiplier).toBe(CHROME_FONT_SCALE_CAP);
  });
});

describe('S14 accessibility, and no keypad', () => {
  const TREES = () => [
    screen(),
    render(<SignedInPhones store={adversarialStore()} devices={ready({ confirm: 'dev-old' })} today={CANONICAL_DATE} display="focus" language="or" />),
    screen({ status: 'error', list: [] }),
    screen({ done: true }),
  ];

  it('every target meets TOUCH_TARGET_MIN_DP, every text the floor, every colour the minimum', () => {
    for (const tree of TREES()) {
      expect(undersizedTargets(tree)).toEqual([]);
      expect(undersizedText(tree)).toEqual([]);
      expect(failingContrast(tree)).toEqual([]);
    }
    expect(TOUCH_TARGET_MIN_DP).toBeGreaterThan(0);
  });

  it('while the question is up, the page under it is hidden from TalkBack', () => {
    const tree = screen({ confirm: 'dev-old' });
    const page = all(tree).find((n) => n.props?.importantForAccessibility === 'no-hide-descendants' && all(n).some((x) => x.props?.testID === 's14-list'));
    expect(page).toBeTruthy();
    expect(byTestId(tree, 's14-confirm').props.accessibilityViewIsModal).toBe(true);
  });

  it('nothing is typed here, so no keypad - and no bottom nav either', () => {
    for (const tree of TREES()) {
      expect(ids(tree).filter((id) => /^keypad/.test(id))).toEqual([]);
      expect(ids(tree).filter((id) => /nav/i.test(id))).toEqual([]);
    }
  });
});
