/**
 * THE WHOLE PIPELINE, ONCE, WITH NOTHING MOCKED ON EITHER SIDE.
 *
 * The app had its own passing suite and the API had its own, and not one test
 * in either had ever put the two together. Both halves were right about
 * themselves. The first draft of the client asked for an OTP with a field the
 * route forbids and omitted the one it requires - every sign-in in production,
 * failed, and no existing test in either package could have seen it.
 *
 * WHAT IS REAL HERE. The real Fastify app with its real hooks, schemas and
 * error handler; the real rate limiter; the real repository contract; the real
 * mobile Store, Session and ApiClient. The only double is the TRANSPORT, and it
 * is a double the way a cable is a double for a cable: it carries the request
 * into `app.inject()` instead of a socket.
 *
 * WHAT IT DELIBERATELY DOES NOT PROVE. TLS, certificate pinning, background
 * scheduling and a real handset's network stack. Those are B14-B19 and the
 * device checklist; nothing here should be read as covering them.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp, type AppDeps } from '../apps/api/src/app.ts';
import { memoryRepo } from '../apps/api/src/db/memory.ts';
import { memoryOtpStore } from '../apps/api/src/auth/routes.ts';
import { memorySql } from '../apps/api/src/rate-limit/memory-sql.ts';
import { RateLimiter } from '../apps/api/src/rate-limit/store.ts';
import { StubSmsPort } from '../apps/api/src/sms/stub.ts';
import {
  ApiClient,
  memoryTokenStore,
  Offline,
  Unauthenticated,
  ApiError,
  type Transport,
  type TokenStore,
} from '../apps/mobile/src/net/client.ts';
import { Store, memoryPort, type StoreState } from '../apps/mobile/src/store/index.ts';
import { Session } from '../apps/mobile/src/app/session.tsx';
import { CANONICAL_PARTIES, CANONICAL_DATE, canonicalInput } from '@swafto/fixtures';
import { PRIVACY_NOTICE_VERSION, DELETION_GRACE_DAYS } from '@swafto/values';
import { purgeDue } from '../apps/api/src/jobs/purge-due.ts';
import { OTP_TTL_SECONDS } from '../apps/api/src/rate-limit/limits.ts';
import { computePrimary, add } from '@swafto/formula-engine';

const KEY = 'test-signing-key-at-least-32-chars!!';
const PHONE = '+919876500042';
const T0 = CANONICAL_DATE + 'T19:00:00.000Z';

/* ---- the server, exactly as apps/api builds it ------------------------- */

interface Server {
  readonly app: ReturnType<typeof buildApp>;
  readonly sms: StubSmsPort;
  readonly deps: AppDeps;
  readonly clock: { value: string };
}

function server(): Server {
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
  return { app: buildApp(deps), sms, deps, clock };
}

/**
 * The cable. It is the only thing in this file that is not production code, and
 * it does exactly one thing: hand the client's request to the real app.
 */
const cable = (s: Server): Transport => ({
  async send(request) {
    const response = await s.app.inject({
      method: request.method,
      url: request.path,
      headers: {
        ...request.headers,
        ...(request.body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(request.body === undefined ? {} : { payload: JSON.stringify(request.body) }),
    });
    return {
      status: response.statusCode,
      body: response.body ? (JSON.parse(response.body) as unknown) : null,
    };
  },
});

/** A shop's phone: a real store, a real session, a real client. */
function handset(s: Server, tokens: TokenStore = memoryTokenStore()) {
  const base = canonicalInput();
  const state: StoreState = {
    shopId: 'shop-under-test',
    day: { ...base.day, state: 'open', openingCash: null },
    entries: [],
    parties: CANONICAL_PARTIES,
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
    skippedSections: [],
  };
  const store = new Store(memoryPort(state), () => T0);
  /*
   * REAL UUIDS, because the sync schema requires them and the in-memory
   * repository used to accept anything. The equivalence run against Postgres is
   * what established that a readable id like `e1` reaches production as a 500.
   */
  let n = 0;
  const newId = () => '5a1e0000-0000-4000-8000-' + String(++n).padStart(12, '0');
  const session = new Session(store, { now: () => T0, newId, screen: 'X0' });
  return { store, session, client: new ApiClient(cable(s), tokens), tokens, newId };
}

const codeFor = (s: Server, phone = PHONE) => s.sms.forPhone(phone).at(-1)!.variables[0]!;

/** Sign in the way the app does: notice, code, consent, verify. */
async function signIn(s: Server, h: ReturnType<typeof handset>, phone = PHONE) {
  await h.client.requestOtp(phone, 'or');
  return h.client.verify({
    phone,
    code: codeFor(s, phone),
    platform: 'android',
    shopName: 'Pipeline Kirana',
    consent: h.session.agreeConsent(),
  });
}

const CASH_SALE = { labelKey: 'formA.mode.cash', section: 'cash_sales', mode: 'cash' } as const;

/** Type an amount in rupees on the real keypad and commit it as a cash sale. */
function enterCashSale(h: ReturnType<typeof handset>, rupees: string) {
  h.session.goTo('T7');
  for (const d of rupees) h.session.press(d as '0');
  h.session.commit(CASH_SALE);
}

/* ==================================================================== *
 * the journey
 * ==================================================================== */

describe('a shopkeeper signs in, enters a day, closes it, and the server has it', () => {
  let s: Server;
  beforeEach(() => {
    s = server();
  });

  it('the notice is readable BEFORE there is any account', async () => {
    // DPDP 1.1: he has to be able to read what he is agreeing to first.
    const h = handset(s);
    const notice = (await h.client.notice()) as { version: string; items: unknown[] };
    expect(notice.version).toBe(PRIVACY_NOTICE_VERSION);
    expect(notice.items.length).toBeGreaterThan(1);
    expect(h.client.session).toBeNull();
  });

  it('signs in with the consent the CONSENT SCREEN produced, not a literal', async () => {
    const h = handset(s);
    h.session.toggleConsent('sms_reminders');
    const decision = h.session.agreeConsent();

    await h.client.requestOtp(PHONE, 'or');
    const tokens = await h.client.verify({
      phone: PHONE,
      code: codeFor(s),
      platform: 'android',
      shopName: 'Pipeline Kirana',
      consent: decision,
    });

    expect(tokens.accessToken.length).toBeGreaterThan(0);
    expect(h.client.session?.shopId).toBe(tokens.shopId);

    /*
     * BOTH PURPOSES ARE RECORDED, SEPARATELY. The required one comes in on the
     * verify call because the account cannot exist without it; the optional one
     * follows as its own record. One row saying "agreed" would not be specific
     * consent, and would be indistinguishable from the pre-ticked box the
     * screen refuses to show.
     */
    const granted = await h.client.grantedNow();
    expect(granted).toContain('account_and_ledger');
    expect(granted).toContain('sms_reminders');
    expect(granted).not.toContain('crash_diagnostics');
  });

  it('an optional purpose he did NOT tick is never recorded as granted', async () => {
    const h = handset(s);
    await signIn(s, h);
    expect(await h.client.grantedNow()).toEqual(['account_and_ledger']);
  });

  it('the code is never in a response body, so the client cannot leak it', async () => {
    const h = handset(s);
    const sent = await h.client.requestOtp(PHONE, 'en');
    expect(JSON.stringify(sent)).not.toContain(codeFor(s));
  });

  it('a day typed on the keypad reaches the server and the figures survive', async () => {
    const h = handset(s);
    await signIn(s, h);

    // Typed the way a shopkeeper types it: keypad digits through the session.
    h.session.goTo('T6');
    for (const d of '2500') h.session.press(d as '0');
    h.session.confirmOpeningCash();
    enterCashSale(h, '4500');
    enterCashSale(h, '1200');

    const queued = h.store.pendingOutbox;
    expect(queued.length).toBeGreaterThan(0);

    const result = await h.client.push(queued);
    expect(result.rejected).toEqual([]);
    expect(result.entriesInserted).toBe(2);
    h.store.ackOutbox(result.accepted);
    expect(h.store.pendingOutbox).toEqual([]);

    /*
     * THE SERVER'S FIGURE IS THE ENGINE'S FIGURE. Not "a number that looks
     * right": the same function the phone used, over the same entries. If the
     * two ever part, one of them is deriving from something it stored.
     */
    const summary = (await h.client.summary(CANONICAL_DATE)) as {
      figures: { p1TotalCashReceived: number };
    };
    expect(summary.figures.p1TotalCashReceived).toBe(
      computePrimary(h.store.input).p1TotalCashReceived.value,
    );
    expect(summary.figures.p1TotalCashReceived).toBe(add(450000, 120000));
  });

  it('closing the day reaches the server - the row that used to be queued nowhere', async () => {
    const h = handset(s);
    await signIn(s, h);
    enterCashSale(h, '1000');

    h.session.goTo('T11');
    const expected = h.store.expectedCash().value;
    for (const d of String(expected / 100)) h.session.press(d as '0');
    expect(h.session.confirmCount()).toBe(true);
    expect(h.session.closeDay()).toBe(true);

    const result = await h.client.push(h.store.pendingOutbox);
    if (result.rejected.length) throw new Error('REJECTED ' + JSON.stringify(result.rejected));
    expect(result.daysWritten).toBe(1);

    const summary = (await h.client.summary(CANONICAL_DATE)) as {
      state: string;
      countedCash: number | null;
    };
    expect(summary.state).toBe('closed');
    expect(summary.countedCash).toBe(expected);
  });

  it('pushing the same batch twice inserts nothing twice', async () => {
    const h = handset(s);
    await signIn(s, h);
    enterCashSale(h, '750');

    const batch = h.store.pendingOutbox;
    const first = await h.client.push(batch);
    const second = await h.client.push(batch);

    expect(first.entriesInserted).toBe(1);
    expect(second.entriesInserted).toBe(0);
    expect(second.alreadyPresent).toBe(1);
    // A retry after a lost response must be safe, or no client can ever retry.
    expect(second.rejected).toEqual([]);
  });
});

/* ==================================================================== *
 * the failures that decide whether a figure survives
 * ==================================================================== */

describe('what happens when the network or the server says no', () => {
  let s: Server;
  beforeEach(() => {
    s = server();
  });

  it('OFFLINE LOSES NOTHING - the queue is exactly as it was', async () => {
    const h = handset(s);
    await signIn(s, h);
    enterCashSale(h, '300');

    const before = h.store.pendingOutbox.map((r) => r.id);
    const dead = new ApiClient(
      {
        send: () => {
          throw new Error('ENETUNREACH');
        },
      },
      memoryTokenStore(h.client.session),
    );

    await expect(dead.push(h.store.pendingOutbox)).rejects.toBeInstanceOf(Offline);
    expect(h.store.pendingOutbox.map((r) => r.id)).toEqual(before);
  });

  it('A REJECTED ENTRY STAYS QUEUED, and says which field was refused', async () => {
    const h = handset(s);
    await signIn(s, h);

    /*
     * A row the server will refuse: a party payment naming nobody. The parser
     * refuses it on the server exactly as it would on the phone - this is a row
     * that could only be produced by a client bug or a tampered queue, which is
     * precisely when losing it silently would be worst.
     */
    const bad = {
      id: 'ob-bad',
      kind: 'entry' as const,
      queuedAt: T0,
      payload: {
        id: '5a1e0000-0000-4000-8000-000000009999',
        dayId: CANONICAL_DATE,
        section: 'party_payment',
        amount: 5000,
        mode: 'cash',
        createdAt: T0,
      },
    };

    const result = await h.client.push([bad]);
    expect(result.entriesInserted).toBe(0);
    expect(result.rejected).toHaveLength(1);
    // Reported against the OUTBOX id, so the caller can find the row.
    expect(result.rejected[0]!.id).toBe('ob-bad');
    expect(result.rejected[0]!.field.length).toBeGreaterThan(0);
    // And it is NOT in the accepted list, so an ack cannot drop it.
    expect(result.accepted).not.toContain('ob-bad');
  });

  it('a good row in the same batch as a bad one is still accepted', async () => {
    const h = handset(s);
    await signIn(s, h);
    enterCashSale(h, '900');

    /*
     * The WHOLE queue, day row included. Filtering it down to entries was this
     * test's own bug and the server was right to refuse: an entry cannot
     * precede its day, and a client that sends half its queue is a client that
     * dropped the half the server needed.
     */
    const good = h.store.pendingOutbox;
    const bad = {
      id: 'ob-bad-2',
      kind: 'entry' as const,
      queuedAt: T0,
      payload: {
        id: '5a1e0000-0000-4000-8000-000000008888',
        dayId: CANONICAL_DATE,
        section: 'party_payment',
        amount: 100,
        mode: 'cash',
        createdAt: T0,
      },
    };

    const result = await h.client.push([...good, bad]);
    expect(result.accepted).toEqual(good.map((r) => r.id));
    expect(result.rejected.map((r) => r.id)).toEqual(['ob-bad-2']);
  });

  it('an expired access token is refreshed once, transparently', async () => {
    const h = handset(s);
    const tokens = await signIn(s, h);

    // A token the server will reject, with a refresh token that still works.
    const store = memoryTokenStore({ ...tokens, accessToken: tokens.accessToken + 'x' });
    const client = new ApiClient(cable(s), store);

    const summary = await client.summary(CANONICAL_DATE);
    expect(summary).toBeTruthy();
    // It kept the NEW access token, so the next call does not pay for a refresh.
    expect(store.read()!.accessToken).not.toBe(tokens.accessToken + 'x');
  });

  it('a dead refresh token clears the session rather than retrying forever', async () => {
    const h = handset(s);
    const tokens = await signIn(s, h);
    const store = memoryTokenStore({
      ...tokens,
      accessToken: tokens.accessToken + 'x',
      refreshToken: tokens.refreshToken + 'x',
    });
    const client = new ApiClient(cable(s), store);

    await expect(client.summary(CANONICAL_DATE)).rejects.toBeInstanceOf(Unauthenticated);
    expect(store.read()).toBeNull();
  });

  it('no session at all is Unauthenticated, and nothing is sent', async () => {
    let calls = 0;
    const client = new ApiClient(
      {
        send: async () => {
          calls += 1;
          return { status: 200, body: {} };
        },
      },
      memoryTokenStore(null),
    );
    await expect(client.summary(CANONICAL_DATE)).rejects.toBeInstanceOf(Unauthenticated);
    expect(calls).toBe(0);
  });

  it('a rate-limit refusal arrives as a retryable error with the real wait', async () => {
    const h = handset(s);
    // The TB6 burst rule is three per phone; the fourth is refused.
    for (let i = 0; i < 3; i += 1) await h.client.requestOtp(PHONE, 'en');
    const refused = await h.client.requestOtp(PHONE, 'en').catch((e: unknown) => e);
    expect(refused).toBeInstanceOf(ApiError);
    expect((refused as ApiError).status).toBe(429);
    expect((refused as ApiError).retryAfterSeconds).toBeGreaterThan(0);
  });

  it('one shop cannot read another shop, through the client or otherwise', async () => {
    const a = handset(s);
    await signIn(s, a, '+919876500001');
    const b = handset(s);
    await signIn(s, b, '+919876500002');

    enterCashSale(a, '500');
    await a.client.push(a.store.pendingOutbox);

    const mine = (await a.client.summary(CANONICAL_DATE)) as {
      figures: { p1TotalCashReceived: number };
    };
    const theirs = (await b.client.summary(CANONICAL_DATE)) as {
      figures: { p1TotalCashReceived: number };
    };
    expect(mine.figures.p1TotalCashReceived).toBe(50000);
    expect(theirs.figures.p1TotalCashReceived).toBe(0);
  });
});

/* ==================================================================== *
 * the rights, exercised by the app rather than described in a policy
 * ==================================================================== */

describe('the DPDP rights work from the app, end to end', () => {
  let s: Server;
  beforeEach(() => {
    s = server();
  });

  it('WITHDRAWAL IS THE SAME CALL AS GIVING, and it is one call', async () => {
    const h = handset(s);
    h.session.toggleConsent('sms_reminders');
    await signIn(s, h);

    expect(await h.client.grantedNow()).toContain('sms_reminders');
    await h.client.setConsent('sms_reminders', false, 'or');
    expect(await h.client.grantedNow()).not.toContain('sms_reminders');
    // And giving it again is the same call with the flag the other way.
    await h.client.setConsent('sms_reminders', true, 'or');
    expect(await h.client.grantedNow()).toContain('sms_reminders');

    /*
     * THE LOG STILL HAS EVERY STEP. Withdrawal must not erase the fact that he
     * once agreed - that record is what answers an auditor, and overwriting it
     * would make the history unprovable.
     */
    const body = await h.client.consents();
    const sms = body.consents.filter((c) => c.purpose === 'sms_reminders');
    expect(sms.map((c) => c.granted)).toEqual([true, false, true]);
  });

  it('the account consent cannot be withdrawn while the account exists', async () => {
    const h = handset(s);
    await signIn(s, h);
    const refused = await h.client
      .setConsent('account_and_ledger', false, 'en')
      .catch((e: unknown) => e);
    expect(refused).toBeInstanceOf(ApiError);
    // It says what to do instead, rather than only refusing.
    expect((refused as ApiError).message.length).toBeGreaterThan(10);
  });

  it('export hands back everything held about him', async () => {
    const h = handset(s);
    await signIn(s, h);
    enterCashSale(h, '1500');
    await h.client.push(h.store.pendingOutbox);

    const dump = (await h.client.exportMe()) as { data: Record<string, unknown> };
    for (const table of ['user', 'shop', 'consents', 'devices', 'days', 'entries']) {
      expect(dump.data, table).toHaveProperty(table);
    }
    expect((dump.data.entries as unknown[]).length).toBe(1);
  });

  it('erasure is SCHEDULED, says when, and the shopkeeper can still come back', async () => {
    /*
     * The grace period is the whole point (LEGAL-AUDIT §1.6). A shopkeeper who
     * taps delete and then realises what he has done has thirty days, and the
     * app must not destroy his session in the meantime - the session is how he
     * cancels.
     */
    const h = handset(s);
    await signIn(s, h);
    enterCashSale(h, '200');
    await h.client.push(h.store.pendingOutbox);

    const receipt = await h.client.erase('DELETE');
    expect(receipt.liveDataErased).toBe(false);
    expect(receipt.graceDays).toBeGreaterThan(0);
    expect(Date.parse(receipt.erasesAt)).toBeGreaterThan(Date.parse(receipt.requestedAt));
    // His book is still there, and still his.
    expect(h.client.session).not.toBeNull();
    expect(await h.client.summary(CANONICAL_DATE)).toBeTruthy();

    expect((await h.client.cancelErase()).cancelled).toBe(true);
  });

  it('and the job erases it when the grace ends, which is what makes it real', async () => {
    const h = handset(s);
    await signIn(s, h);
    enterCashSale(h, '200');
    await h.client.push(h.store.pendingOutbox);
    await h.client.erase('DELETE');

    const after = new Date(Date.parse(T0) + (DELETION_GRACE_DAYS + 1) * 86_400_000).toISOString();
    const report = await purgeDue(s.deps.repo, after);
    expect(report.erased).toHaveLength(1);
    expect(report.failed).toEqual([]);

    // The account is gone, so the tokens this handset holds are worthless.
    await expect(h.client.summary(CANONICAL_DATE)).rejects.toBeInstanceOf(Unauthenticated);
  });

  it('THE WEB PAGE PATH WORKS WITH NO APP AND NO SESSION - Google Play requires it', async () => {
    /*
     * Somebody who has uninstalled the app has no token and no device. The web
     * page verifies by SMS to the registered number, and the code it sends is
     * NOT a sign-in code: different template, different namespace, so a phished
     * "your SWAFTO code" cannot erase a shop's book.
     */
    const h = handset(s);
    await signIn(s, h);
    enterCashSale(h, '200');
    await h.client.push(h.store.pendingOutbox);

    const asked = await s.app.inject({
      method: 'POST',
      url: '/v1/deletion/request',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ phone: PHONE, language: 'od' }),
    });
    expect(asked.statusCode).toBe(202);

    const sent = s.sms.forPhone(PHONE).at(-1)!;
    expect(sent.templateId).toBe('otp_account_deletion');

    // The sign-in code cannot delete, and the deletion code cannot sign in.
    const signInCode = s.sms.forPhone(PHONE).filter((m) => m.templateId === 'otp_signin').at(-1)!
      .variables[0]!;
    const wrongCode = await s.app.inject({
      method: 'POST',
      url: '/v1/deletion/confirm',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ phone: PHONE, code: signInCode, confirm: 'DELETE' }),
    });
    expect(wrongCode.statusCode).toBe(401);

    const done = await s.app.inject({
      method: 'POST',
      url: '/v1/deletion/confirm',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ phone: PHONE, code: sent.variables[0]!, confirm: 'DELETE' }),
    });
    expect(done.statusCode).toBe(200);
    expect(JSON.parse(done.body).liveDataErased).toBe(false);

    // Scheduled, not done - and the job finishes it when the grace ends.
    const after = new Date(Date.parse(T0) + (DELETION_GRACE_DAYS + 1) * 86_400_000).toISOString();
    expect((await purgeDue(s.deps.repo, after)).erased).toHaveLength(1);
  });

  it('the web path tells a stranger nothing, and texts nobody who has no account', async () => {
    const h = handset(s);
    await signIn(s, h);
    const before = s.sms.count();

    const unknown = await s.app.inject({
      method: 'POST',
      url: '/v1/deletion/request',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ phone: '+919000000000', language: 'en' }),
    });
    expect(unknown.statusCode).toBe(202);
    expect(JSON.parse(unknown.body)).toEqual({ sent: true, expiresInSeconds: OTP_TTL_SECONDS });
    /*
     * And NO message went out. Unlike the sign-in request, texting an
     * unregistered number here would tell a stranger's handset that somebody
     * is trying to delete their SWAFTO account.
     */
    expect(s.sms.count()).toBe(before);
  });

  it('the grievance officer is reachable WITHOUT an account, through the notice', async () => {
    /*
     * The `/v1/me/grievance` route needs a token. Somebody who cannot sign in is
     * exactly the person most likely to need the officer, so the requirement is
     * only met if the PUBLIC notice carries the name and the address too.
     */
    const h = handset(s);
    const notice = (await h.client.notice()) as {
      fiduciary: { grievanceOfficer: string; email: string; responseDays: number };
    };
    expect(notice.fiduciary.grievanceOfficer.length).toBeGreaterThan(0);
    expect(notice.fiduciary.email).toContain('@');
    expect(notice.fiduciary.responseDays).toBeGreaterThan(0);
  });

  it('and signed in, the officer answers with an SLA', async () => {
    const h = handset(s);
    await signIn(s, h);
    const contact = (await h.client.grievance()) as { email: string; respondWithinDays: number };
    expect(contact.email).toContain('@');
    expect(contact.respondWithinDays).toBeGreaterThan(0);
  });
});
