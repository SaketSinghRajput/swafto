/**
 * INVITE GATE, MOBILE HALF (docs/auth/INVITE-CODES-GATE.md section 4).
 *
 * The contract: `POST /v1/auth/otp/request` in invite mode answers
 * `202 {sent:false, mode:"invite", digits:8}`; in sms mode it is unchanged, and
 * a missing `mode` is sms. Everything here is driven through the real client,
 * session and Host with a fake `fetch` - the request that leaves the phone and
 * what the screen is then told are what is asserted.
 *
 * Also F-1 (a pasted `4821 0937` is sent as `48210937`), RTI-7 (the "new phone
 * signed in" notice, from `GET /v1/devices`, dismissible per device and kept on
 * this phone) and the screens' invite copy.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Host, newPhoneOf, NEW_PHONE_WINDOW_MS, type FetchLike } from '../src/host.tsx';
import { codeRequestAnswer, ApiClient, memoryTokenStore, type Transport } from '../src/net/client.ts';
import { Session, codeDigitsOf, localDateOf } from '../src/app/session.tsx';
import { App } from '../src/app/App.tsx';
import { Store, memoryPort, type StoreState } from '../src/store/index.ts';
import type { DeviceBridge } from '../src/platform/device.ts';
import { canonicalInput, CANONICAL_PARTIES, CANONICAL_DATE } from '@swafto/fixtures';
import { render, byTestId, all, text } from './render.tsx';

/** Noon IST on the canonical day: the phone's own clock carries its offset (localIso). */
const NOW = CANONICAL_DATE + 'T12:00:00.000+05:30';
const NOW_MS = Date.parse(NOW);
const HOUR = 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

const TOKENS = JSON.stringify({
  accessToken: 'a',
  refreshToken: 'r',
  deviceId: 'dev-this',
  shopId: '11111111-1111-4111-8111-000000000001',
});

function memoryStorage(initial: string | null = null) {
  const box = { held: initial };
  return {
    box,
    read: () => box.held,
    write: (value: string | null) => {
      box.held = value;
    },
  };
}

interface Seen {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

function boot(
  answer: (req: Seen) => { status: number; body: unknown },
  opts: { tokens?: string | null; prefs?: string | null; notices?: ReturnType<typeof memoryStorage>; clipboard?: string } = {},
) {
  const seen: Seen[] = [];
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
  const prefs = memoryStorage(opts.prefs ?? null);
  const notices = opts.notices ?? memoryStorage(null);
  const doFetch: FetchLike = async (url, init) => {
    const req = {
      method: init.method,
      path: url.replace('https://api.example.test', ''),
      body: init.body === undefined ? undefined : (JSON.parse(init.body) as unknown),
    };
    seen.push(req);
    const a = answer(req);
    return { status: a.status, text: async () => JSON.stringify(a.body) };
  };
  const device = {
    isDeviceSecure: async () => true,
    confirmCredential: async () => 'ok',
    shareTextFile: async () => {},
    ...(opts.clipboard === undefined ? {} : { readClipboardText: async () => opts.clipboard as string }),
  } as DeviceBridge;
  const host = new Host({
    baseUrl: 'https://api.example.test',
    fetch: doFetch,
    storage: memoryStorage(opts.tokens === undefined ? TOKENS : opts.tokens),
    store: new Store(memoryPort(state), () => NOW),
    now: () => NOW,
    newId: () => '5a1e0000-0000-4000-8000-000000000999',
    prefs,
    notices,
    device,
  });
  return { host, seen, prefs, notices };
}

const INVITE_REPLY = { status: 202, body: { sent: false, mode: 'invite', digits: 8 } };
const SMS_REPLY = { status: 202, body: { sent: true, expiresInSeconds: 600, digits: 6 } };
const VERIFIED = {
  status: 200,
  body: {
    accessToken: 'a2',
    refreshToken: 'r2',
    deviceId: 'dev-this',
    shopId: '11111111-1111-4111-8111-000000000001',
  },
};

/** A signed-out handset on A3 with a number typed, answering the request with `reply`. */
function onA3(reply: { status: number; body: unknown }, opts: { clipboard?: string; prefs?: string } = {}) {
  const b = boot(
    (req) => (req.path === '/v1/auth/otp/request' ? reply : req.path === '/v1/auth/otp/verify' ? VERIFIED : { status: 200, body: {} }),
    { tokens: null, ...opts },
  );
  b.host.session.goTo('A3');
  for (const k of '9876500001') b.host.session.pressPhone(k as '0');
  return b;
}

/* ---- 1. client.ts: the reply ---------------------------------------------- */

describe('codeRequestAnswer - the request reply, validated', () => {
  it('invite mode with eight digits is believed', () => {
    expect(codeRequestAnswer({ sent: false, mode: 'invite', digits: 8 })).toEqual({ mode: 'invite', digits: 8 });
  });

  it('the sms reply is unchanged, and a missing mode means sms', () => {
    expect(codeRequestAnswer({ sent: true, expiresInSeconds: 600, digits: 6 })).toEqual({
      mode: 'sms',
      digits: 6,
      expiresInSeconds: 600,
    });
    expect(codeRequestAnswer({ expiresInSeconds: 600 })).toEqual({ mode: 'sms', digits: 6, expiresInSeconds: 600 });
    expect(codeRequestAnswer(null)).toEqual({ mode: 'sms', digits: 6 });
  });

  it('a digit count outside {6, 8} is the six-digit OTP; an unknown mode is sms', () => {
    for (const digits of [7, 4, 0, 10, '8', null, 8.5]) {
      expect(codeRequestAnswer({ mode: 'invite', digits }).digits).toBe(6);
    }
    expect(codeRequestAnswer({ mode: 'carrier-pigeon', digits: 8 })).toEqual({ mode: 'sms', digits: 8 });
  });

  it('requestOtp returns it, parsed', async () => {
    const transport: Transport = { send: async () => ({ status: 202, body: INVITE_REPLY.body }) };
    const client = new ApiClient(transport, memoryTokenStore());
    expect(await client.requestOtp('+919876500001', 'or')).toEqual({ mode: 'invite', digits: 8 });
  });

  it('listDevices carries createdAt, and null from a server that does not send it', async () => {
    const transport: Transport = {
      send: async () => ({
        status: 200,
        body: {
          devices: [
            { id: 'a', platform: 'android', createdAt: '2026-07-14T10:00:00.000Z', current: true },
            { id: 'b', platform: 'android', current: false },
          ],
        },
      }),
    };
    const client = new ApiClient(transport, memoryTokenStore(JSON.parse(TOKENS)));
    const list = await client.listDevices();
    expect(list.map((d) => d.createdAt)).toEqual(['2026-07-14T10:00:00.000Z', null]);
  });
});

/* ---- 3. F-1: what is sent is digits ------------------------------------- */

describe('F-1 - codeDigitsOf: spaces, dashes and other scripts', () => {
  it('a pasted "4821 0937" and "4821-0937" are 48210937', () => {
    expect(codeDigitsOf('4821 0937')).toBe('48210937');
    expect(codeDigitsOf('4821-0937')).toBe('48210937');
    expect(codeDigitsOf(' 4821 0937\n')).toBe('48210937');
    expect(codeDigitsOf('Your SWAFTO code: 4821 0937.')).toBe('48210937');
  });

  it('Devanagari, Odia and Arabic-Indic digits become 0-9', () => {
    expect(codeDigitsOf('४८२१ ०९३७')).toBe('48210937');
    expect(codeDigitsOf('୪୮୨୧ ୦୯୩୭')).toBe('48210937');
    expect(codeDigitsOf('٤٨٢١ ٠٩٣٧')).toBe('48210937');
    expect(codeDigitsOf('۴۸۲۱۰۹۳۷')).toBe('48210937');
  });

  it('nothing is invented: no digits in, nothing out', () => {
    expect(codeDigitsOf('abc - ')).toBe('');
    expect(codeDigitsOf('')).toBe('');
  });
});

/* ---- 1-3. session and host: the mode carried through --------------------- */

describe('the mode and digit count, carried from the reply to A4', () => {
  it('invite mode: A4 with eight boxes, and the EIGHTH key verifies with the code as ASCII digits', async () => {
    const { host, seen } = onA3(INVITE_REPLY);
    await host.sendCode();
    expect(host.session.state.screen).toBe('A4');
    expect(host.session.state.auth.codeMode).toBe('invite');
    expect(host.session.state.auth.codeDigits).toBe(8);
    const done = '4821093'.split('').map((d) => host.session.pressCode(d as '0'));
    expect(done.every((d) => d === false)).toBe(true);
    expect(host.session.pressCode('7')).toBe(true);
    await host.verifyCode();
    const verify = seen.find((r) => r.path === '/v1/auth/otp/verify');
    expect((verify?.body as { code: string }).code).toBe('48210937');
  });

  it('sms mode: six boxes, the sixth key completes, and a seventh changes nothing', async () => {
    const { host } = onA3(SMS_REPLY);
    await host.sendCode();
    expect(host.session.state.auth.codeMode).toBe('sms');
    expect(host.session.state.auth.codeDigits).toBe(6);
    const done = '1234567'.split('').map((d) => host.session.pressCode(d as '0'));
    expect(done).toEqual([false, false, false, false, false, true, false]);
    expect(host.session.state.auth.code).toBe('123456');
  });

  it('a reply with no mode (an older server) is sms with six digits', async () => {
    const { host } = onA3({ status: 202, body: { sent: true, expiresInSeconds: 600 } });
    await host.sendCode();
    expect(host.session.state.auth.codeMode).toBe('sms');
    expect(host.session.state.auth.codeDigits).toBe(6);
  });

  it('pasted with spaces: "4821 0937" fills the eight boxes and is sent first time as 48210937', async () => {
    const { host, seen } = onA3(INVITE_REPLY, { clipboard: '4821 0937' });
    await host.sendCode();
    await host.pasteCode();
    // Verified and signed in (the code is cleared on the way out of A4).
    expect(host.session.state.screen).not.toBe('A4');
    const verifies = seen.filter((r) => r.path === '/v1/auth/otp/verify');
    expect(verifies).toHaveLength(1);
    expect((verifies[0]?.body as { code: string }).code).toBe('48210937');
  });

  it('a paste in Odia digits with a dash is sent as ASCII', async () => {
    const { host, seen } = onA3(INVITE_REPLY, { clipboard: '୪୮୨୧-୦୯୩୭' });
    await host.sendCode();
    await host.pasteCode();
    expect((seen.find((r) => r.path === '/v1/auth/otp/verify')?.body as { code: string }).code).toBe('48210937');
  });

  it('a paste too short fills what it has and sends nothing; a paste of no digits changes nothing', async () => {
    const short = onA3(INVITE_REPLY, { clipboard: '4821 09' });
    await short.host.sendCode();
    await short.host.pasteCode();
    expect(short.host.session.state.auth.code).toBe('482109');
    expect(short.seen.some((r) => r.path === '/v1/auth/otp/verify')).toBe(false);

    const s = new Session(new Store(memoryPort(boot(() => SMS_REPLY).host.store.state), () => NOW), {
      now: () => NOW,
      newId: () => 'x',
      screen: 'A4',
    });
    s.pressCode('9');
    expect(s.enterCode('no code here')).toBe(false);
    expect(s.state.auth.code).toBe('9');
  });

  it('a paste longer than the box count keeps only the first codeDigits digits', () => {
    const s = new Session(new Store(memoryPort(boot(() => SMS_REPLY).host.store.state), () => NOW), {
      now: () => NOW,
      newId: () => 'x',
      screen: 'A4',
    });
    expect(s.enterCode('123 456 789')).toBe(true);
    expect(s.state.auth.code).toBe('123456');
  });

  it('invite mode is remembered on this phone, so A3 says it before the next request; sms writes nothing new', async () => {
    const invite = onA3(INVITE_REPLY);
    await invite.host.sendCode();
    expect(JSON.parse(invite.prefs.box.held ?? '{}').codeMode).toBe('invite');
    const relaunch = boot(() => SMS_REPLY, { tokens: null, prefs: invite.prefs.box.held });
    expect(relaunch.host.session.state.auth.codeMode).toBe('invite');
    expect(relaunch.host.session.state.auth.codeDigits).toBe(8);

    const sms = onA3(SMS_REPLY);
    await sms.host.sendCode();
    expect(sms.prefs.box.held ?? '').not.toContain('codeMode');
  });

  it('invite mode: a wrong code is "does not match" until the attempt limit, then dead (A5)', async () => {
    const b = boot(
      (req) =>
        req.path === '/v1/auth/otp/request'
          ? INVITE_REPLY
          : req.path === '/v1/auth/otp/verify'
            ? { status: 401, body: { error: 'code_invalid' } }
            : { status: 200, body: {} },
      { tokens: null },
    );
    b.host.session.goTo('A3');
    for (const k of '9876500001') b.host.session.pressPhone(k as '0');
    await b.host.sendCode();
    b.host.session.enterCode('11111111');
    await b.host.verifyCode();
    // No lifetime in an invite reply: the first refusal is a mismatch, not "expired".
    expect(b.host.session.state.auth.problem).toBe('mismatch');
  });
});

/* ---- 4. RTI-7: the new-phone notice --------------------------------------- */

const device = (id: string, createdMs: number | null, extra: { current?: boolean; revoked?: boolean } = {}) => ({
  id,
  platform: 'android',
  createdAt: createdMs === null ? null : iso(createdMs),
  lastSeenAt: null,
  revokedAt: extra.revoked ? iso(NOW_MS - HOUR) : null,
  current: extra.current === true,
});

describe('RTI-7 - newPhoneOf: which phone, if any, is news', () => {
  const none = new Set<string>();

  it('a non-current, non-revoked phone signed in inside 72 hours is shown', () => {
    expect(newPhoneOf([device('this', NOW_MS - 900 * HOUR, { current: true }), device('new', NOW_MS - 2 * HOUR)], NOW_MS, none)).toEqual({
      id: 'new',
      createdAt: iso(NOW_MS - 2 * HOUR),
    });
  });

  it('hidden for the current phone, a revoked one, one older than 72 hours, and one with no stamp', () => {
    expect(newPhoneOf([device('this', NOW_MS - HOUR, { current: true })], NOW_MS, none)).toBeNull();
    expect(newPhoneOf([device('gone', NOW_MS - HOUR, { revoked: true })], NOW_MS, none)).toBeNull();
    expect(newPhoneOf([device('old', NOW_MS - NEW_PHONE_WINDOW_MS)], NOW_MS, none)).toBeNull();
    expect(newPhoneOf([device('old', NOW_MS - NEW_PHONE_WINDOW_MS + 1)], NOW_MS, none)?.id).toBe('old');
    expect(newPhoneOf([device('blank', null)], NOW_MS, none)).toBeNull();
  });

  it('hidden once dismissed; the newest undismissed phone wins', () => {
    const list = [device('a', NOW_MS - 10 * HOUR), device('b', NOW_MS - 1 * HOUR)];
    expect(newPhoneOf(list, NOW_MS, none)?.id).toBe('b');
    expect(newPhoneOf(list, NOW_MS, new Set(['b']))?.id).toBe('a');
    expect(newPhoneOf(list, NOW_MS, new Set(['a', 'b']))).toBeNull();
  });

  it('the date is the phone-local day: 20:00 UTC is the next morning in India', () => {
    expect(localDateOf('2026-07-14T20:00:00.000Z', NOW)).toBe('2026-07-15');
    expect(localDateOf('2026-07-14T20:00:00.000Z', '2026-07-15T12:00:00.000Z')).toBe('2026-07-14');
    expect(localDateOf('not a date', NOW)).toBe('');
  });
});

describe('RTI-7 - Host.checkNewPhone: one GET /v1/devices, and a dismissal kept on this phone', () => {
  const listAnswer = (devices: unknown[]) => (req: Seen) =>
    req.path === '/v1/devices' ? { status: 200, body: { devices } } : { status: 200, body: {} };
  const devices = [device('dev-this', NOW_MS - 900 * HOUR, { current: true }), device('dev-new', NOW_MS - 3 * HOUR)];

  it('shown: exactly one request, and the session holds the new phone', async () => {
    const { host, seen } = boot(listAnswer(devices));
    await host.checkNewPhone();
    expect(seen.map((r) => r.method + ' ' + r.path)).toEqual(['GET /v1/devices']);
    expect(host.session.state.newPhone).toEqual({ id: 'dev-new', createdAt: iso(NOW_MS - 3 * HOUR) });
  });

  it('hidden: signed out asks nothing; only the current and a revoked phone shows nothing', async () => {
    const signedOut = boot(listAnswer(devices), { tokens: null });
    await signedOut.host.checkNewPhone();
    expect(signedOut.seen).toEqual([]);
    expect(signedOut.host.session.state.newPhone ?? null).toBeNull();

    const quiet = boot(listAnswer([devices[0], device('gone', NOW_MS - HOUR, { revoked: true })]));
    await quiet.host.checkNewPhone();
    expect(quiet.host.session.state.newPhone ?? null).toBeNull();
  });

  it('dismissed: the notice goes, the id is stored locally, and a relaunch does not show it again', async () => {
    const notices = memoryStorage(null);
    const first = boot(listAnswer(devices), { notices });
    await first.host.checkNewPhone();
    first.host.dismissNewPhone('dev-new');
    expect(first.host.session.state.newPhone).toBeNull();
    expect(JSON.parse(notices.box.held ?? '[]')).toEqual(['dev-new']);
    // the server is not told
    expect(first.seen.map((r) => r.path)).toEqual(['/v1/devices']);

    const relaunch = boot(listAnswer(devices), { notices });
    await relaunch.host.checkNewPhone();
    expect(relaunch.host.session.state.newPhone ?? null).toBeNull();

    // a DIFFERENT new phone is still news
    const another = boot(listAnswer([...devices, device('dev-other', NOW_MS - HOUR)]), { notices });
    await another.host.checkNewPhone();
    expect(another.host.session.state.newPhone?.id).toBe('dev-other');
  });

  it('a failed request leaves the notice as it was', async () => {
    let fail = false;
    const { host } = boot((req) => (fail ? { status: 503, body: {} } : listAnswer(devices)(req)));
    await host.checkNewPhone();
    fail = true;
    await host.checkNewPhone();
    expect(host.session.state.newPhone?.id).toBe('dev-new');
  });

  it('Root asks on launch and on every foreground, beside refreshPlan - and not from the 30 s tick', () => {
    const root = readFileSync(new URL('../src/platform/Root.tsx', import.meta.url), 'utf8');
    expect(root.match(/void host\.refreshPlan\(\);\s*(\/\/[^\n]*\n\s*)?void host\.checkNewPhone\(\);/g)).toHaveLength(2);
    const tick = /setInterval\(\(\) => \{([\s\S]*?)\}, 30_000\)/.exec(root)?.[1] ?? '';
    expect(tick).not.toBe('');
    expect(tick).not.toContain('checkNewPhone');
  });
});

describe('RTI-7 - the notice on Today, through App', () => {
  it('shown on the open day with the local date; "It was me" dismisses that device; the link opens Signed-in phones', async () => {
    const { host } = boot((req) =>
      req.path === '/v1/devices'
        ? { status: 200, body: { devices: [device('dev-new', Date.parse('2026-07-14T20:00:00.000Z'))] } }
        : { status: 200, body: {} },
    );
    host.session.goTo('T1');
    await host.checkNewPhone();
    const dismissed: string[] = [];
    let loads = 0;
    const tree = render(
      <App session={host.session} onDismissNewPhone={(id) => dismissed.push(id)} onLoadDevices={() => (loads += 1)} />,
    );
    expect(text(byTestId(tree, 't1-new-phone-banner-text'))).toBe(
      "A new phone signed in to your shop on Wednesday 15 July. If this wasn't you, open Signed-in phones and sign it out.",
    );
    byTestId(tree, 't1-new-phone-dismiss').props.onPress();
    expect(dismissed).toEqual(['dev-new']);
    byTestId(tree, 't1-new-phone-open').props.onPress();
    expect(host.session.state.screen).toBe('S14');
    expect(loads).toBe(1);
  });

  it('hidden when the session holds no new phone', () => {
    const { host } = boot(() => ({ status: 200, body: {} }));
    host.session.goTo('T1');
    const ids = all(render(<App session={host.session} />)).map((n) => String(n.props?.testID ?? ''));
    expect(ids).toContain('t1');
    expect(ids).not.toContain('t1-new-phone');
  });
});
