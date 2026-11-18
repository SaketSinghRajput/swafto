/**
 * F-17 - SIGN-IN, DRIVEN THROUGH THE REAL APP AGAINST THE REAL API.
 *
 * The A-series did not exist: `requestOtp` and `verify` had no caller, the app
 * opened on X0 or Today, and every handset ran unauthenticated. These cases
 * press the same testIDs a shopkeeper's thumb does, through `App`, a real
 * `Host`, a real `Session`, and the real Fastify app reached by `inject` - the
 * only double is the cable, exactly as in pipeline.spec.tsx. The ledger and the
 * tokens live in a real SQLite file, so a "restart" is a second Host over the
 * same file, which is what a cold start is.
 *
 * Most of these are the paths where something goes WRONG, because a sign-in
 * that reports success on a failed call is the one outcome this cannot have.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp, type AppDeps } from '../apps/api/src/app.ts';
import { memoryRepo } from '../apps/api/src/db/memory.ts';
import { memoryOtpStore } from '../apps/api/src/auth/routes.ts';
import { memorySql } from '../apps/api/src/rate-limit/memory-sql.ts';
import { RateLimiter } from '../apps/api/src/rate-limit/store.ts';
import { StubSmsPort } from '../apps/api/src/sms/stub.ts';
import { Host, type FetchLike } from '../apps/mobile/src/host.tsx';
import { Store } from '../apps/mobile/src/store/index.ts';
import { sqlitePort, type Db } from '../apps/mobile/src/store/sqlite.ts';
import { sqliteSecureStorage } from '../apps/mobile/src/platform/storage.tsx';
import { App } from '../apps/mobile/src/app/App.tsx';
import { ApiClient, ApiError, memoryTokenStore } from '../apps/mobile/src/net/client.ts';
import { render, byTestId, text } from '../apps/mobile/test/render.tsx';
import { CANONICAL_DATE } from '@swafto/fixtures';
import { OTP_TTL_SECONDS } from '@swafto/values';
import type { Entry } from '@swafto/formula-engine';

const KEY = 'test-signing-key-at-least-32-chars!!';
const BASE = 'https://api.example.test';
const PHONE = '9876500042';
const T0 = CANONICAL_DATE + 'T09:00:00.000Z';

/* ---- the server, as apps/api builds it --------------------------------- */

function server() {
  const clock = { value: T0 };
  const sms = new StubSmsPort();
  const deps: AppDeps = {
    repo: memoryRepo(),
    sms,
    otp: memoryOtpStore(),
    now: () => clock.value,
    signingKey: KEY,
    rate: new RateLimiter(memorySql(), { secret: KEY, now: () => new Date(clock.value) }),
  };
  return { app: buildApp(deps), sms, clock };
}
type Server = ReturnType<typeof server>;

/** The cable, plus a switch for "no signal" and one for "the server broke". */
function cable(s: Server) {
  const net = { up: true, broken: false };
  const doFetch: FetchLike = async (url, init) => {
    if (!net.up) throw new Error('ENETUNREACH');
    if (net.broken) return { status: 500, text: async () => '{"error":"internal"}' };
    const r = await s.app.inject({
      method: init.method as 'GET' | 'POST',
      url: url.slice(BASE.length),
      headers: init.headers,
      ...(init.body ? { payload: init.body } : {}),
    });
    return { status: r.statusCode, text: async () => r.body };
  };
  return { doFetch, net };
}

/* ---- the handset: one SQLite file, and a Host booted over it ------------ */

const openDb = (file: string): Db => {
  const db = new DatabaseSync(file);
  return {
    executeSync(sql, params = []) {
      const st = db.prepare(sql);
      if (/^\s*select/i.test(sql)) return { rows: st.all(...(params as never[])) };
      st.run(...(params as never[]));
      return { rows: [] };
    },
  };
};

let file: string;
beforeEach(() => {
  file = join(mkdtempSync(join(tmpdir(), 'swafto-auth-')), 'ledger.db');
});

let ids = 0;
const newId = () => '5a1e0000-0000-4000-8000-' + String(++ids).padStart(12, '0');

/** Boot the app over the file - the same assembly Root.tsx does, minus React Native. */
function boot(s: Server, doFetch: FetchLike) {
  const db = openDb(file);
  return new Host({
    baseUrl: BASE,
    fetch: doFetch,
    storage: sqliteSecureStorage(db, 'session'),
    account: sqliteSecureStorage(db, 'account'),
    store: new Store(sqlitePort(db, () => CANONICAL_DATE), () => s.clock.value),
    now: () => s.clock.value,
    newId,
  });
}

/* ---- the thumb ---------------------------------------------------------- */

const screenOf = (h: Host) =>
  render(<App session={h.session} auth={h} onConsent={(d) => h.consented(d)} />);
const tap = (h: Host, id: string) => byTestId(screenOf(h), id).props.onPress();
const shown = (h: Host) => text(screenOf(h));
const has = (h: Host, id: string) => {
  try {
    byTestId(screenOf(h), id);
    return true;
  } catch {
    return false;
  }
};

/** Wait for the request in flight to land. The screen moves only on the answer. */
async function settle(h: Host) {
  for (let i = 0; i < 200; i += 1) {
    await new Promise((r) => setTimeout(r, 1));
    if (!h.session.state.auth.busy) return;
  }
  throw new Error('a request never settled');
}

/** Digits on the on-screen keypad, one press each. */
const typeOn = (h: Host, digits: string) => {
  for (const d of digits) byTestId(screenOf(h), 'keypad-' + d).props.onPress();
};

const codeFor = (s: Server, phone = PHONE) => s.sms.forPhone('+91' + phone).at(-1)!.variables[0]!;
const wrongFor = (s: Server, phone = PHONE) => (codeFor(s, phone) === '000000' ? '111111' : '000000');

/** Splash -> language -> consent -> phone -> code sent. Leaves him on A4. */
async function toCode(h: Host, phone = PHONE) {
  tap(h, 'a1');
  tap(h, 'a2-or');
  tap(h, 'x0-agree');
  typeOn(h, phone);
  tap(h, 'a3-send');
  await settle(h);
}

const sale = (amount: number): Entry =>
  ({
    id: newId(),
    dayId: CANONICAL_DATE,
    section: 'cash_sales',
    amount,
    mode: 'cash',
    source: 'manual',
    createdAt: T0,
  }) as Entry;

/* ==================================================================== */

describe('a new install signs in through the A-series, in the reference order', () => {
  let s: Server;
  beforeEach(() => {
    s = server();
  });

  it('A1 -> A2 -> X0 -> A3 -> A4 -> X1 -> T1, with consent carried on verify', async () => {
    const { doFetch } = cable(s);
    const h = boot(s, doFetch);
    expect(h.session.state.screen).toBe('A1');

    tap(h, 'a1');
    expect(h.session.state.screen).toBe('A2');

    tap(h, 'a2-or');
    // CONSENT AFTER LANGUAGE: X0 is read in the language he just chose.
    expect(h.session.state.screen).toBe('X0');
    expect(h.session.state.language).toBe('or');
    tap(h, 'x0-toggle-sms_reminders');
    tap(h, 'x0-agree');
    expect(h.session.state.screen).toBe('A3');

    typeOn(h, PHONE.slice(0, 9));
    expect(byTestId(screenOf(h), 'a3-send').props.disabled).toBe(true); // nine digits is not a number
    typeOn(h, PHONE.slice(9));
    expect(byTestId(screenOf(h), 'a3-phone').props.children).toBe('98765 00042');
    tap(h, 'a3-send');
    await settle(h);
    expect(h.session.state.screen).toBe('A4');
    expect(h.client.session).toBeNull(); // a code sent is not a sign-in

    typeOn(h, codeFor(s)); // the sixth digit sends it
    await settle(h);
    expect(h.client.session).not.toBeNull();
    expect(h.session.state.screen).toBe('X1'); // no shop name yet: the four questions

    // The account and BOTH purposes were recorded, from what X0 produced.
    const granted = await h.client.grantedNow();
    expect(granted).toEqual(expect.arrayContaining(['account_and_ledger', 'sms_reminders']));
    expect(granted).not.toContain('crash_diagnostics');

    h.session.setShopName('Sharma Kirana Store');
    for (const d of '2500') h.session.press(d as '0');
    h.session.finishOnboarding();
    expect(h.session.state.screen).toBe('T1');
  });

  it('A RESTART KEEPS HIM SIGNED IN - the tokens are in the SQLite file', async () => {
    const { doFetch } = cable(s);
    const h = boot(s, doFetch);
    await toCode(h);
    typeOn(h, codeFor(s));
    await settle(h);
    const tokens = h.client.session;
    expect(tokens).not.toBeNull();

    const again = boot(s, doFetch); // a cold start over the same file
    expect(again.client.session).toEqual(tokens);
    expect(again.signedIn).toBe(true);
    // HT-2: this run signed in but never answered X1, so a cold start resumes
    // onboarding rather than opening a nameless Today.
    expect(again.session.state.screen).toBe('X1');
    // And the server still accepts what was persisted.
    await expect(again.client.grantedNow()).resolves.toContain('account_and_ledger');
  });
});

describe('every failure is a screen state, and none of them is a sign-in', () => {
  let s: Server;
  beforeEach(() => {
    s = server();
  });

  it('a wrong code is A5 "does not match", and no token is written', async () => {
    const { doFetch } = cable(s);
    const h = boot(s, doFetch);
    await toCode(h);
    const right = codeFor(s);
    typeOn(h, wrongFor(s));
    await settle(h);

    expect(h.session.state.screen).toBe('A5');
    expect(h.session.state.auth.problem).toBe('mismatch');
    expect(has(h, 'a5-mismatch')).toBe(true);
    expect(h.client.session).toBeNull();

    // Back to the code, and the right one still works.
    h.session.back();
    expect(h.session.state.screen).toBe('A4');
    typeOn(h, right);
    await settle(h);
    expect(h.client.session).not.toBeNull();
  });

  it('a code past its lifetime is A5 "expired", and "Send a new code" sends one', async () => {
    const { doFetch } = cable(s);
    const h = boot(s, doFetch);
    await toCode(h);
    const stale = codeFor(s);
    s.clock.value = new Date(Date.parse(T0) + (OTP_TTL_SECONDS + 1) * 1000).toISOString();

    typeOn(h, stale);
    await settle(h);
    expect(h.session.state.auth.problem).toBe('expired');
    expect(shown(h)).toContain(String(OTP_TTL_SECONDS / 60));
    expect(h.client.session).toBeNull();

    tap(h, 'a5-send-new');
    await settle(h);
    expect(h.session.state.screen).toBe('A4');
    expect(h.session.state.auth.resends).toBe(1);
    expect(s.sms.forPhone('+91' + PHONE)).toHaveLength(2);
  });

  it('the server discards a code after five wrong tries, so the fifth says "expired"', async () => {
    const { doFetch } = cable(s);
    const h = boot(s, doFetch);
    await toCode(h);
    const wrong = wrongFor(s);
    for (let i = 1; i <= 5; i += 1) {
      if (h.session.state.screen === 'A5') h.session.back();
      typeOn(h, wrong);
      await settle(h);
      expect(h.session.state.auth.problem, 'try ' + i).toBe(i < 5 ? 'mismatch' : 'expired');
    }
  });

  it("the server's 429 is A5 'too many tries', with the wait it stated", async () => {
    const { doFetch } = cable(s);
    const h = boot(s, doFetch);
    await toCode(h); // send 1
    // Wave 2 (RT-3 path 3): a request inside the 60 s resend cooldown sends nothing and
    // spends no budget, so each resend is made a cooldown after the last. The same limit
    // is still what refuses the fourth.
    const afterCooldown = () => {
      s.clock.value = new Date(Date.parse(s.clock.value) + 61_000).toISOString();
    };
    for (let i = 0; i < 2; i += 1) {
      afterCooldown();
      tap(h, 'a4-resend'); // sends 2 and 3
      await settle(h);
    }
    expect(has(h, 'a4-no-code')).toBe(true); // two resends: "Still no code?" is offered
    afterCooldown();
    tap(h, 'a4-resend'); // the fourth inside the burst window is refused
    await settle(h);

    expect(h.session.state.screen).toBe('A5');
    expect(h.session.state.auth.problem).toBe('locked');
    const wait = h.session.state.auth.retryAfterSeconds;
    expect(wait).toBeGreaterThan(0);
    expect(shown(h)).toContain(String(Math.ceil(wait! / 60)));
  });

  it('no signal on "Send code" stays on A3 and says so - nothing is claimed sent', async () => {
    const { doFetch, net } = cable(s);
    const h = boot(s, doFetch);
    tap(h, 'a1');
    tap(h, 'a2-en');
    tap(h, 'x0-agree');
    typeOn(h, PHONE);
    net.up = false;
    tap(h, 'a3-send');
    await settle(h);

    expect(h.session.state.screen).toBe('A3');
    expect(has(h, 'auth-notice-offline')).toBe(true);
    expect(h.session.state.auth.phone).toBe(PHONE); // what he typed is kept
    expect(s.sms.forPhone('+91' + PHONE)).toHaveLength(0);

    net.up = true;
    tap(h, 'a3-send');
    await settle(h);
    expect(h.session.state.screen).toBe('A4');
  });

  it('no signal while checking keeps the code, and "Try again" signs him in', async () => {
    const { doFetch, net } = cable(s);
    const h = boot(s, doFetch);
    await toCode(h);
    net.up = false;
    typeOn(h, codeFor(s));
    await settle(h);

    expect(h.session.state.screen).toBe('A4');
    expect(h.session.state.auth.problem).toBe('offline');
    expect(h.session.state.auth.code).toHaveLength(6);
    expect(h.client.session).toBeNull();

    net.up = true;
    tap(h, 'a4-retry');
    await settle(h);
    expect(h.client.session).not.toBeNull();
  });

  it('a broken server is "something went wrong", not "wrong code" and not a sign-in', async () => {
    const { doFetch, net } = cable(s);
    const h = boot(s, doFetch);
    await toCode(h);
    net.broken = true;
    typeOn(h, codeFor(s));
    await settle(h);
    expect(h.session.state.screen).toBe('A4');
    expect(h.session.state.auth.problem).toBe('failed');
    expect(has(h, 'auth-notice-failed')).toBe(true);
    expect(h.client.session).toBeNull();
  });
});

describe('a handset that already holds a book (every pre-sign-in tester)', () => {
  let s: Server;
  beforeEach(() => {
    s = server();
  });

  /** The state every current tester is in: a named shop, entries, no tokens. */
  function existingInstall(doFetch: FetchLike) {
    const before = new Store(sqlitePort(openDb(file), () => CANONICAL_DATE), () => T0);
    before.setShopName('Sharma Kirana Store');
    before.append(sale(45000));
    before.append(sale(12000));
    return boot(s, doFetch);
  }

  it('opens on Today with the book intact - nothing is asked again or lost', () => {
    const h = existingInstall(cable(s).doFetch);
    expect(h.session.state.screen).toBe('T1');
    expect(h.store.state.entries).toHaveLength(2);
    expect(h.signedIn).toBe(false);
  });

  it('a launch sync without an account does NOT send him to "session expired"', async () => {
    const h = existingInstall(cable(s).doFetch);
    const outcome = await h.sync();
    expect(outcome.needsSignIn).toBe(true);
    expect(h.session.state.screen).toBe('T1');
    expect(h.store.pendingOutbox.length).toBeGreaterThan(0); // still queued, not dropped
  });

  it('signs in from Settings, through the consent notice, and the book uploads', async () => {
    const { doFetch } = cable(s);
    const h = existingInstall(doFetch);
    h.session.goTo('S1');
    expect(has(h, 's1-log-out')).toBe(false);
    tap(h, 's1-sign-in');
    expect(h.session.state.screen).toBe('X0'); // an account may be created: notice first
    tap(h, 'x0-agree');
    typeOn(h, PHONE);
    tap(h, 'a3-send');
    await settle(h);
    typeOn(h, codeFor(s));
    await settle(h);

    expect(h.session.state.screen).toBe('T1'); // NOT X1: the shop was already named
    expect(h.store.state.entries).toHaveLength(2);

    const outcome = await h.sync();
    expect(outcome.rejected).toEqual([]);
    expect(outcome.accepted).toBeGreaterThan(0);
    expect(h.store.pendingOutbox).toEqual([]);
  });
});

describe('log out, session expiry, and the book that belongs to one shop', () => {
  let s: Server;
  beforeEach(() => {
    s = server();
  });

  async function signedIn(doFetch: FetchLike) {
    const h = boot(s, doFetch);
    await toCode(h);
    typeOn(h, codeFor(s));
    await settle(h);
    h.session.setShopName('Sharma Kirana Store');
    for (const d of '2500') h.session.press(d as '0');
    h.session.finishOnboarding();
    return h;
  }

  it('A8 LOG OUT CLEARS THE TOKENS AND KEEPS EVERY ENTRY - on disk, across a restart', async () => {
    const { doFetch } = cable(s);
    const h = await signedIn(doFetch);
    h.store.append(sale(45000));
    h.store.append(sale(12000));

    h.session.setLanguage('en'); // signed up in Odia; read the copy in English
    h.session.goTo('S1');
    tap(h, 's1-log-out');
    expect(h.session.state.screen).toBe('A8');
    expect(has(h, 'a8-pending')).toBe(true);
    expect(shown(h)).toContain('2 entries');
    expect(shown(h)).not.toContain('lose');

    await h.logOut(); // what the a8-logout button calls, awaited
    expect(h.client.session).toBeNull();
    expect(h.session.state.screen).toBe('A3');

    const again = boot(s, doFetch);
    expect(again.client.session).toBeNull(); // the row is gone, not blanked
    expect(again.store.state.entries).toHaveLength(2); // the book is not
    expect(again.store.pendingOutbox.filter((r) => r.kind === 'entry')).toHaveLength(2);
    expect(again.session.state.auth.phone).toBe(PHONE); // A3/A6 still know the number
    // HT-12: and the relaunch opens on sign-in, not on Today with every figure.
    expect(again.session.state.screen).toBe('A3');
  });

  it('the A8 button is wired to that log out', async () => {
    const h = await signedIn(cable(s).doFetch);
    h.session.goTo('A8');
    tap(h, 'a8-logout');
    for (let i = 0; i < 50 && h.client.session !== null; i += 1) {
      await new Promise((r) => setTimeout(r, 1));
    }
    expect(h.client.session).toBeNull();
  });

  it('"Stay signed in" changes nothing', async () => {
    const h = await signedIn(cable(s).doFetch);
    h.session.goTo('A8');
    tap(h, 'a8-stay');
    expect(h.session.state.screen).toBe('S1');
    expect(h.client.session).not.toBeNull();
  });

  it('a session the server no longer accepts is A6, and "Verify with" sends a code', async () => {
    const { doFetch } = cable(s);
    const h = await signedIn(doFetch);
    h.store.append(sale(45000));
    // Signed out from elsewhere: this device is revoked server-side.
    await h.client.revokeDevice(h.client.session!.deviceId);

    const outcome = await h.sync();
    expect(outcome.needsSignIn).toBe(true);
    expect(h.session.state.screen).toBe('A6');
    expect(shown(h)).toContain('98765 00042');
    expect(h.store.state.entries).toHaveLength(1); // untouched

    tap(h, 'a6-verify');
    await settle(h);
    expect(h.session.state.screen).toBe('A4');
    typeOn(h, codeFor(s));
    await settle(h);
    expect(h.client.session).not.toBeNull();
    expect(h.session.state.screen).toBe('T1');
  });

  it('ANOTHER number is refused before any code is sent, and the book stays put', async () => {
    const { doFetch } = cable(s);
    const h = await signedIn(doFetch);
    await h.sync(); // the first shop's book is uploaded and acked
    await h.logOut();
    h.store.append(sale(45000));
    const queued = h.store.pendingOutbox.length;

    for (let i = 0; i < 10; i += 1) h.session.pressPhone('back');
    typeOn(h, '9876500099');
    tap(h, 'a3-send');
    await settle(h);
    /*
     * HT-13 / HT-32: he is told on A3, and no SMS goes out - refusing after
     * verify cost two codes and left a user and a consent record on the server.
     */
    expect(s.sms.forPhone('+919876500099')).toHaveLength(0);
    expect(h.client.session).toBeNull();
    expect(h.session.state.screen).toBe('A3');
    expect(h.session.state.lastRefusal?.field).toBe('wrongShop');
    const outcome = await h.sync();
    expect(outcome.accepted).toBe(0);
    expect(h.store.pendingOutbox).toHaveLength(queued);
  });

  it('a verify that lands in a shop other than the one the book is bound to is undone', async () => {
    const { doFetch } = cable(s);
    const h = await signedIn(doFetch);
    await h.logOut();
    // The record names this number but another shop - the server moved it.
    sqliteSecureStorage(openDb(file), 'account').write(
      JSON.stringify({ phone: PHONE, shopId: '00000000-0000-4000-8000-0000000000ff' }),
    );
    for (let i = 0; i < 10; i += 1) h.session.pressPhone('back');
    typeOn(h, PHONE);
    tap(h, 'a3-send');
    await settle(h);
    typeOn(h, codeFor(s));
    await settle(h);
    expect(h.client.session).toBeNull();
    expect(h.session.state.screen).toBe('A3');
    expect(h.session.state.lastRefusal?.field).toBe('wrongShop');
  });

  it('a new number reached without the notice is sent to the notice, not signed up', async () => {
    const { doFetch } = cable(s);
    const h = boot(s, doFetch);
    // A3 straight from A7 "I still have my old number" - no X0 this run.
    h.session.goTo('A7');
    tap(h, 'a7-have-old');
    expect(h.session.state.screen).toBe('A3');
    typeOn(h, PHONE);
    tap(h, 'a3-send');
    await settle(h);
    typeOn(h, codeFor(s));
    await settle(h);

    expect(h.session.state.screen).toBe('X0'); // consent_required
    expect(h.client.session).toBeNull();
  });
});

describe('the client half: a success is never reported as a failure, nor the reverse', () => {
  const TOKENS = { accessToken: 'a', refreshToken: 'r', deviceId: 'd-1', shopId: 's-1' };

  it('an optional purpose that fails to record does not undo a verified sign-in', async () => {
    const tokens = memoryTokenStore();
    const client = new ApiClient(
      {
        async send(request) {
          if (request.path === '/v1/auth/otp/verify') return { status: 200, body: TOKENS };
          return { status: 500, body: { error: 'internal' } }; // the optional consent write
        },
      },
      tokens,
    );
    await expect(
      client.verify({
        phone: '+919876500042',
        code: '123456',
        platform: 'android',
        consent: { noticeVersion: 'v1', locale: 'en', granted: ['account_and_ledger', 'sms_reminders'] },
      }),
    ).resolves.toEqual(TOKENS);
    expect(tokens.read()).toEqual(TOKENS);
  });

  it('a 401 on verify is a wrong code, not a dead session', async () => {
    const client = new ApiClient(
      { send: async () => ({ status: 401, body: { error: 'code_invalid' } }) },
      memoryTokenStore(),
    );
    const e = await client
      .verify({ phone: '+919876500042', code: '000000', platform: 'android' })
      .catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).code).toBe('code_invalid');
  });

  it('log out with no signal still clears the tokens', async () => {
    const tokens = memoryTokenStore(TOKENS);
    const client = new ApiClient(
      {
        send: async () => {
          throw new Error('ENETUNREACH');
        },
      },
      tokens,
    );
    await client.signOut();
    expect(tokens.read()).toBeNull();
  });
});
