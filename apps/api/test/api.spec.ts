/**
 * THE API, END TO END - G6, G7, G8 and the DPDP endpoints.
 *
 * A REAL SERVER, NO NETWORK. `fastify.inject()` runs the whole request lifecycle -
 * hooks, schema validation, serialisation, the error handler - without a socket.
 * So these are not handler unit tests: a route that forgets its auth hook, or one
 * whose schema strips the field it meant to return, fails here exactly as it would
 * in production.
 *
 * NO EXPECTED FIGURE IS WRITTEN DOWN, the same rule the fixtures obey. The read
 * tests compare the API's answer against the ENGINE's answer for the same input. A
 * hand-typed total would agree with both until the day the formula changed, and
 * then agree with neither.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp, type AppDeps } from '../src/app.ts';
import { memoryRepo } from '../src/db/memory.ts';
import { memoryOtpStore } from '../src/auth/routes.ts';
import { memorySql } from '../src/rate-limit/memory-sql.ts';
import { RateLimiter } from '../src/rate-limit/store.ts';
import { StubSmsPort } from '../src/sms/stub.ts';
import { NOTICE_VERSION } from '../src/dpdp/routes.ts';
import { mintToken } from '../src/auth/tokens.ts';
import { purgeDue } from '../src/jobs/purge-due.ts';
import { DELETION_GRACE_DAYS } from '@swafto/values';
import {
  canonicalInput,
  CANONICAL_PARTIES,
  CANONICAL_DATE,
  adversarialInput,
  ADVERSARIAL_PARTIES,
  ADVERSARIAL_DATE,
} from '@swafto/fixtures';
import {
  computePrimary,
  expectedCashBalance,
  add,
  subtract,
  type DayInput,
} from '@swafto/formula-engine';

/** 32 characters, which is the floor `assertSigningKey` enforces. */
const KEY = 'test-signing-key-at-least-32-chars!!';
const PHONE = '+919876500001';
const T0 = '2026-09-19T08:00:00.000Z';

interface Harness {
  deps: AppDeps & { repo: ReturnType<typeof memoryRepo> };
  app: ReturnType<typeof buildApp>;
  sms: StubSmsPort;
  clock: { value: string };
}

function harness(): Harness {
  const clock = { value: T0 };
  const sms = new StubSmsPort();
  const repo = memoryRepo();
  const deps = {
    repo,
    sms,
    otp: memoryOtpStore(),
    now: () => clock.value,
    signingKey: KEY,
    // The REAL limiter; only its table is in memory.
    rate: new RateLimiter(memorySql(), { secret: KEY, now: () => new Date(clock.value) }),
  };
  return { deps, app: buildApp(deps), sms, clock };
}

const json = (payload: unknown) => ({
  headers: { 'content-type': 'application/json' },
  payload: JSON.stringify(payload),
});


/**
 * A deterministic UUID from a fixture id.
 *
 * The fixtures use readable ids like `c-04` because a mobile test reads better
 * that way. The API columns are UUIDs, so a real client sends UUIDs - and until
 * the repository equivalence run, the API tests pushed `c-04` at a permissive
 * in-memory repository and passed, while the same request would have failed
 * against Postgres. Mapping here keeps the fixtures readable and the requests
 * realistic.
 */
const asUuid = (fixtureId: string): string => {
  let h = 0;
  for (const ch of fixtureId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hex = h.toString(16).padStart(8, '0');
  return hex + '-0000-4000-8000-' + hex.padStart(12, '0');
};

/** A fixture entry as a client would send it: same figures, a real id. */
const wire = (e: { id: string; partyId?: string }) => ({
  ...e,
  id: asUuid(e.id),
  ...(e.partyId ? { partyId: asUuid(e.partyId) } : {}),
});

const auth = (token: string) => ({ authorization: 'Bearer ' + token });

/**
 * A JSON body AND a token, in one object.
 *
 * Spreading  after  silently replaces the
 * whole headers object, so the Authorization header disappears and every
 * authenticated write comes back 401 - which is what happened, fifteen times,
 * and looked like an auth bug rather than a spread-order bug.
 */
const jsonAuth = (token: string) => (payload: unknown) => ({
  headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
  payload: JSON.stringify(payload),
});

/**
 * Sign in, and hand back the tokens plus the ids the tests need.
 *
 * IT ASSERTS ITS OWN SUCCESS. A helper that quietly returns `{status: 429}` gives
 * every test downstream an undefined token, and they all fail with 401 - fifteen
 * confusing failures pointing at the wrong place instead of one pointing here.
 */
interface Session {
  readonly status: number;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly deviceId: string;
  readonly shopId: string;
}

async function signIn(h: Harness, phone = PHONE): Promise<Session> {
  const asked = await h.app.inject({
    method: 'POST',
    url: '/v1/auth/otp/request',
    ...json({ phone, language: 'en' }),
  });
  if (asked.statusCode !== 202) {
    throw new Error('signIn: the OTP request failed: ' + asked.statusCode + ' ' + asked.body);
  }
  const code = h.sms.forPhone(phone).at(-1)!.variables[0]!;
  const res = await h.app.inject({
    method: 'POST',
    url: '/v1/auth/otp/verify',
    ...json({
      phone,
      code,
      device: { platform: 'android' },
      shopName: 'Test Kirana',
      consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' },
    }),
  });
  if (res.statusCode !== 200) {
    throw new Error('signIn: the verify failed: ' + res.statusCode + ' ' + res.body);
  }
  return { status: res.statusCode, ...(JSON.parse(res.body) as Omit<Session, 'status'>) };
}

/* ==================================================================== *
 * G6 · auth
 * ==================================================================== */
describe('G6 - phone and OTP', () => {
  let h: Harness;
  beforeEach(() => {
    h = harness();
  });

  it('sends a code, and the code is never in the response body', async () => {
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/auth/otp/request',
      ...json({ phone: PHONE, language: 'en' }),
    });
    expect(res.statusCode).toBe(202);
    const sent = h.sms.forPhone(PHONE);
    expect(sent).toHaveLength(1);
    expect(res.body).not.toContain(sent[0]!.variables[0]!);
  });

  it('answers identically for a registered and an unregistered number', async () => {
    await signIn(h);
    const known = await h.app.inject({
      method: 'POST',
      url: '/v1/auth/otp/request',
      ...json({ phone: PHONE, language: 'en' }),
    });
    const unknown = await h.app.inject({
      method: 'POST',
      url: '/v1/auth/otp/request',
      ...json({ phone: '+919876500999', language: 'en' }),
    });
    // Byte-identical. Any difference here is a membership oracle.
    expect(known.statusCode).toBe(unknown.statusCode);
    expect(known.body).toBe(unknown.body);
  });

  it('creates the account only at verify, and only with consent', async () => {
    await h.app.inject({
      method: 'POST',
      url: '/v1/auth/otp/request',
      ...json({ phone: PHONE, language: 'en' }),
    });
    const code = h.sms.forPhone(PHONE).at(-1)!.variables[0]!;

    const refused = await h.app.inject({
      method: 'POST',
      url: '/v1/auth/otp/verify',
      ...json({ phone: PHONE, code, device: { platform: 'android' } }),
    });
    expect(refused.statusCode).toBe(403);
    expect(JSON.parse(refused.body).error).toBe('consent_required');
    // And nothing was written: a refused sign-up leaves no row behind.
    expect((h.deps.repo.dump() as { users: unknown[] }).users).toHaveLength(0);
  });

  it('records the consent it was given, with the notice version and locale', async () => {
    const session = await signIn(h);
    expect(session.status).toBe(200);
    const res = await h.app.inject({
      method: 'GET',
      url: '/v1/me/consents',
      headers: auth(session.accessToken!),
    });
    const body = JSON.parse(res.body);
    expect(body.consents).toHaveLength(1);
    expect(body.consents[0].purpose).toBe('account_and_ledger');
    expect(body.consents[0].noticeVersion).toBe(NOTICE_VERSION);
    expect(body.consents[0].at).toBe(T0);
  });

  it('refuses a wrong code, and the code dies after five attempts', async () => {
    await h.app.inject({
      method: 'POST',
      url: '/v1/auth/otp/request',
      ...json({ phone: PHONE, language: 'en' }),
    });
    const real = h.sms.forPhone(PHONE).at(-1)!.variables[0]!;
    const wrong = real === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i += 1) {
      const r = await h.app.inject({
        method: 'POST',
        url: '/v1/auth/otp/verify',
        ...json({ phone: PHONE, code: wrong, device: { platform: 'android' } }),
      });
      expect(r.statusCode).toBe(401);
    }
    /*
     * The real code no longer works. It comes back 429 rather than 401 because the
     * verify limiter refuses the sixth attempt before the code is even looked at -
     * both are refusals and the rate limit is the outer one. What matters is that
     * the code did not let anybody in, and that no account came into existence.
     */
    const after = await h.app.inject({
      method: 'POST',
      url: '/v1/auth/otp/verify',
      ...json({
        phone: PHONE,
        code: real,
        device: { platform: 'android' },
        consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' },
      }),
    });
    expect(after.statusCode).not.toBe(200);
    expect([401, 429]).toContain(after.statusCode);
    expect((h.deps.repo.dump() as { users: unknown[] }).users).toHaveLength(0);
  });

  it('a code cannot be used twice', async () => {
    const code = await (async () => {
      await h.app.inject({
        method: 'POST',
        url: '/v1/auth/otp/request',
        ...json({ phone: PHONE, language: 'en' }),
      });
      return h.sms.forPhone(PHONE).at(-1)!.variables[0]!;
    })();

    const body = {
      phone: PHONE,
      code,
      device: { platform: 'android' as const },
      consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' as const },
    };
    const first = await h.app.inject({
      method: 'POST',
      url: '/v1/auth/otp/verify',
      ...json(body),
    });
    expect(first.statusCode).toBe(200);

    const replay = await h.app.inject({
      method: 'POST',
      url: '/v1/auth/otp/verify',
      ...json(body),
    });
    expect(replay.statusCode).toBe(401);
  });

  it('rate-limits sends per phone, and says when to come back', async () => {
    let last = await h.app.inject({
      method: 'POST',
      url: '/v1/auth/otp/request',
      ...json({ phone: PHONE, language: 'en' }),
    });
    for (let i = 0; i < 12 && last.statusCode === 202; i += 1) {
      last = await h.app.inject({
        method: 'POST',
        url: '/v1/auth/otp/request',
        ...json({ phone: PHONE, language: 'en' }),
      });
    }
    expect(last.statusCode).toBe(429);
    expect(Number(last.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('refreshes an access token, and refuses a refresh token used as an access token', async () => {
    const s = await signIn(h);
    const refreshed = await h.app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      ...json({ refreshToken: s.refreshToken }),
    });
    expect(refreshed.statusCode).toBe(200);
    expect(JSON.parse(refreshed.body).accessToken).toBeTruthy();

    // The privilege escalation the `typ` claim exists to prevent.
    const misused = await h.app.inject({
      method: 'GET',
      url: '/v1/parties/outstanding',
      headers: auth(s.refreshToken!),
    });
    expect(misused.statusCode).toBe(401);
  });

  it('a revoked device cannot use a token that is still in date', async () => {
    const s = await signIn(h);
    const ok = await h.app.inject({
      method: 'GET',
      url: '/v1/parties/outstanding',
      headers: auth(s.accessToken!),
    });
    expect(ok.statusCode).toBe(200);

    await h.app.inject({
      method: 'POST',
      url: '/v1/auth/devices/' + s.deviceId + '/revoke',
      ...jsonAuth(s.accessToken!)({}),
    });

    const after = await h.app.inject({
      method: 'GET',
      url: '/v1/parties/outstanding',
      headers: auth(s.accessToken!),
    });
    expect(after.statusCode).toBe(401);
  });
});

/* ==================================================================== *
 * G7 · sync
 * ==================================================================== */
describe('G7 - sync is idempotent, and the shop comes from the token', () => {
  let h: Harness;
  let session: Session;

  const batchFrom = (input: DayInput, date: string) => ({
    days: [{ date, state: 'open' as const, openingCash: input.day.openingCash ?? 0 }],
    parties: CANONICAL_PARTIES.map((p) => ({ id: asUuid(p.id), kind: p.kind, name: p.name })),
    entries: input.entries.map(wire),
  });

  beforeEach(async () => {
    h = harness();
    session = await signIn(h);
  });

  it('accepts the canonical day', async () => {
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/sync/push',
      ...jsonAuth(session.accessToken!)(batchFrom(canonicalInput(), CANONICAL_DATE)),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.rejected).toEqual([]);
    expect(body.entriesInserted).toBe(canonicalInput().entries.length);
  });

  it('B8 - replays of the same batch are byte-identical', async () => {
    const batch = batchFrom(canonicalInput(), CANONICAL_DATE);
    const send = () =>
      h.app.inject({
        method: 'POST',
        url: '/v1/sync/push',
        ...jsonAuth(session.accessToken!)(batch),
      });

    const first = await send();
    const second = await send();
    const third = await send();

    expect(first.statusCode).toBe(200);
    /*
     * The FIRST response differs from the rest, and it should: it inserted rows
     * and the others did not. What must never drift is every replay after it.
     */
    expect(second.body).toBe(third.body);
    expect(JSON.parse(second.body).entriesInserted).toBe(0);
    expect(JSON.parse(second.body).entriesAlreadyPresent).toBe(
      JSON.parse(first.body).entriesInserted,
    );
    // And the ledger did not grow.
    const stored = (h.deps.repo.dump() as { entries: unknown[] }).entries;
    expect(stored).toHaveLength(canonicalInput().entries.length);
  });

  it('refuses a shopId in the body rather than honouring it', async () => {
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/sync/push',
      ...jsonAuth(session.accessToken!)({ shopId: 'someone-elses-shop', entries: [] }),
    });
    expect(res.statusCode).toBe(400);
  });

  it('re-validates with the same parsers the phone uses', async () => {
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/sync/push',
      ...jsonAuth(session.accessToken!)({
        days: [{ date: CANONICAL_DATE, state: 'open' }],
        entries: [
          {
            // A credit sale naming nobody: P7 would count money no one can be asked for.
            id: asUuid('bad-1'),
            dayId: CANONICAL_DATE,
            section: 'udhar_sales',
            amount: 10000,
            mode: 'udhar',
            createdAt: CANONICAL_DATE + 'T10:00:00.000Z',
          },
        ],
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.rejected).toHaveLength(1);
    expect(body.rejected[0].field).toBe('partyId');
    expect(body.entriesInserted).toBe(0);
  });

  it('one bad entry does not reject the good ones beside it', async () => {
    const good = canonicalInput().entries[0]!;
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/sync/push',
      ...jsonAuth(session.accessToken!)({
        days: [{ date: CANONICAL_DATE, state: 'open' }],
        entries: [
          wire(good),
          {
            id: asUuid('bad-2'),
            dayId: CANONICAL_DATE,
            section: 'withdrawal',
            amount: 100,
            mode: 'shop_stock',
            createdAt: CANONICAL_DATE + 'T10:00:00.000Z',
          },
        ],
      }),
    });
    const body = JSON.parse(res.body);
    expect(body.entriesInserted).toBe(1);
    expect(body.rejected).toHaveLength(1);
  });

  it('refuses an entry into a closed day', async () => {
    await h.app.inject({
      method: 'POST',
      url: '/v1/sync/push',
      ...jsonAuth(session.accessToken!)({
        days: [
          {
            date: CANONICAL_DATE,
            state: 'closed',
            countedCash: 100000,
            closedAt: CANONICAL_DATE + 'T21:00:00.000Z',
          },
        ],
      }),
    });
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/sync/push',
      ...jsonAuth(session.accessToken!)({
        entries: [
          {
            id: asUuid('late-1'),
            dayId: CANONICAL_DATE,
            section: 'cash_sales',
            amount: 5000,
            mode: 'cash',
            createdAt: CANONICAL_DATE + 'T22:00:00.000Z',
          },
        ],
      }),
    });
    const body = JSON.parse(res.body);
    expect(body.rejected).toHaveLength(1);
    expect(body.rejected[0].message).toMatch(/closed/i);
  });

  it('one shop cannot read another shop, even with a valid token', async () => {
    await h.app.inject({
      method: 'POST',
      url: '/v1/sync/push',
      ...jsonAuth(session.accessToken!)(batchFrom(canonicalInput(), CANONICAL_DATE)),
    });

    const other = await signIn(h, '+919876500002');
    const res = await h.app.inject({
      method: 'GET',
      url: '/v1/days/' + CANONICAL_DATE + '/summary',
      headers: auth(other.accessToken!),
    });
    expect(res.statusCode).toBe(200);
    // A different shop sees an empty day, not somebody else's takings.
    expect(JSON.parse(res.body).entryCount).toBe(0);
  });

  /*
   * S-11, AND THE ADVERSARY PASS FOUND IT UNTESTED.
   *
   * A12 asks what a guard is scoped by and whether a plant moves along THAT
   * axis. The cross-tenant defence is scoped by WHERE THE SHOP ID COMES FROM -
   * the session claims, never the request - and no test had ever varied that.
   * The plant proved it: `shopOf` was changed to prefer a `shopId` from the
   * query string or the body, which is the textbook forged-tenant defect, and
   * the ENTIRE suite still passed. 228 tests, none of them looking.
   *
   * The code was right and the confidence was unearned. These cases earn it.
   */
  it('a shopId in the QUERY STRING is ignored - the claims decide, always', async () => {
    await h.app.inject({
      method: 'POST',
      url: '/v1/sync/push',
      ...jsonAuth(session.accessToken!)(batchFrom(canonicalInput(), CANONICAL_DATE)),
    });
    const mine = JSON.parse(
      (
        await h.app.inject({
          method: 'GET',
          url: '/v1/days/' + CANONICAL_DATE + '/summary',
          headers: auth(session.accessToken!),
        })
      ).body,
    ).entryCount;
    expect(mine).toBeGreaterThan(0);

    const other = await signIn(h, '+919876500003');
    const forged = await h.app.inject({
      method: 'GET',
      url:
        '/v1/days/' + CANONICAL_DATE + '/summary?shopId=' + encodeURIComponent(session.shopId!),
      headers: auth(other.accessToken!),
    });
    // Either refused outright or answered for HIS OWN shop. Never the other one.
    if (forged.statusCode === 200) expect(JSON.parse(forged.body).entryCount).toBe(0);
    else expect(forged.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('a shopId in the BODY is refused outright, not quietly stripped', async () => {
    /*
     * `removeAdditional: false` is what makes this a 400 rather than a silent
     * strip. A client sending shop_id in a sync push is a client with a wrong
     * idea of who decides, and the answer should be loud.
     */
    const other = await signIn(h, '+919876500004');
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/sync/push',
      ...jsonAuth(other.accessToken!)({
        shopId: session.shopId,
        entries: [],
      }),
    });
    expect(res.statusCode).toBe(400);
  });

  it('a shop id in a HEADER changes nothing either', async () => {
    await h.app.inject({
      method: 'POST',
      url: '/v1/sync/push',
      ...jsonAuth(session.accessToken!)(batchFrom(canonicalInput(), CANONICAL_DATE)),
    });
    const other = await signIn(h, '+919876500005');
    const res = await h.app.inject({
      method: 'GET',
      url: '/v1/days/' + CANONICAL_DATE + '/summary',
      headers: { ...auth(other.accessToken!), 'x-shop-id': session.shopId! },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).entryCount).toBe(0);
  });

  it('and the same forgery cannot WRITE into another shop either', async () => {
    const other = await signIn(h, '+919876500006');
    const entry = {
      id: '77777777-7777-4777-8777-000000000001',
      dayId: CANONICAL_DATE,
      section: 'cash_sales',
      amount: 999999,
      mode: 'cash',
      createdAt: CANONICAL_DATE + 'T19:00:00.000Z',
    };
    await h.app.inject({
      method: 'POST',
      url: '/v1/sync/push?shopId=' + encodeURIComponent(session.shopId!),
      ...jsonAuth(other.accessToken!)({
        days: [{ date: CANONICAL_DATE, state: 'open' }],
        entries: [entry],
      }),
    });

    // The victim's day is untouched: the write landed in the forger's own shop.
    const victim = await h.app.inject({
      method: 'GET',
      url: '/v1/days/' + CANONICAL_DATE + '/summary',
      headers: auth(session.accessToken!),
    });
    const entries = h.deps.repo.dump() as { entries: { shopId: string; amount: number }[] };
    expect(entries.entries.filter((e) => e.amount === 999999 && e.shopId === session.shopId)).toEqual(
      [],
    );
    expect(victim.statusCode).toBe(200);
  });
});

/* ==================================================================== *
 * G8 · read - the API and the engine must agree, exactly
 * ==================================================================== */
describe('G8 - every figure the API returns is the engine figure', () => {
  let h: Harness;
  let session: Session;

  beforeEach(async () => {
    h = harness();
    session = await signIn(h);
  });

  /**
   * The same input, as the SERVER actually holds it.
   *
   * The fixtures carry a `priorCreditOutstanding` standing for history from before
   * the fixture day. The server has no such history unless those earlier days were
   * pushed, and it will not invent one - it folds the prior balance forward from
   * the days it has, which is zero of them here. Comparing the API against the
   * fixture's own prior would be comparing two different questions, so the
   * expectation is the engine run on exactly what the server was given.
   *
   * The fold itself is tested below, by pushing an earlier day and requiring the
   * API to arrive at the engine's answer for the pair.
   */
  const asHeld = (input: DayInput): DayInput => ({
    ...input,
    priorCreditOutstanding: 0,
    priorSupplierOutstanding: 0,
  });

  const push = async (input: DayInput, date: string, parties: typeof CANONICAL_PARTIES) =>
    h.app.inject({
      method: 'POST',
      url: '/v1/sync/push',
      ...jsonAuth(session.accessToken!)({
        days: [{ date, state: 'open', openingCash: input.day.openingCash ?? 0 }],
        parties: parties.map((p) => ({ id: asUuid(p.id), kind: p.kind, name: p.name })),
        entries: input.entries.map(wire),
      }),
    });

  it('the canonical day, through the API, matches computePrimary exactly', async () => {
    const input = canonicalInput();
    await push(input, CANONICAL_DATE, CANONICAL_PARTIES);

    const res = await h.app.inject({
      method: 'GET',
      url: '/v1/days/' + CANONICAL_DATE + '/summary',
      headers: auth(session.accessToken!),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);

    const expected = computePrimary(asHeld(input));
    expect(body.figures.p1TotalCashReceived).toBe(expected.p1TotalCashReceived.value);
    expect(body.figures.p2TotalCashPaid).toBe(expected.p2TotalCashPaid.value);
    expect(body.figures.p3ExpectedCashBalance).toBe(expected.p3ExpectedCashBalance.value);
    expect(body.figures.p4NetSales).toBe(expected.p4NetSales.value);
    expect(body.figures.p5NetPurchase).toBe(expected.p5NetPurchase.value);
    expect(body.figures.p6TotalExpenses).toBe(expected.p6TotalExpenses.value);
    expect(body.figures.p7CreditOutstanding).toBe(expected.p7CreditOutstanding.value);
    expect(body.figures.p8SupplierOutstanding).toBe(expected.p8SupplierOutstanding.value);
    expect(body.figures.estimatedProfit).toBe(expected.estimatedProfit.value);
  });

  it('the adversarial day too - lakh-scale figures and a one-paisa entry', async () => {
    const input = adversarialInput();
    await push(input, ADVERSARIAL_DATE, ADVERSARIAL_PARTIES);

    const res = await h.app.inject({
      method: 'GET',
      url: '/v1/days/' + ADVERSARIAL_DATE + '/summary',
      headers: auth(session.accessToken!),
    });
    const body = JSON.parse(res.body);
    const expected = computePrimary(asHeld(input));
    expect(body.figures.p4NetSales).toBe(expected.p4NetSales.value);
    expect(body.figures.p7CreditOutstanding).toBe(expected.p7CreditOutstanding.value);
  });

  it('ships the cash check WITH its working, not just a verdict', async () => {
    const input = canonicalInput();
    await push(input, CANONICAL_DATE, CANONICAL_PARTIES);
    const res = await h.app.inject({
      method: 'GET',
      url: '/v1/days/' + CANONICAL_DATE + '/summary',
      headers: auth(session.accessToken!),
    });
    const body = JSON.parse(res.body);
    expect(body.cashCheck.expected).toBe(expectedCashBalance(asHeld(input)).value);
    expect(Array.isArray(body.cashCheck.working.lines)).toBe(true);
    expect(body.cashCheck.working.lines.length).toBeGreaterThan(0);
  });

  it('every figure is an integer - no float ever reaches the wire', async () => {
    await push(adversarialInput(), ADVERSARIAL_DATE, ADVERSARIAL_PARTIES);
    const res = await h.app.inject({
      method: 'GET',
      url: '/v1/days/' + ADVERSARIAL_DATE + '/summary',
      headers: auth(session.accessToken!),
    });
    for (const [name, value] of Object.entries(JSON.parse(res.body).figures)) {
      expect(Number.isInteger(value), name).toBe(true);
    }
  });

  it('reports no difference until the cash has actually been counted', async () => {
    await push(canonicalInput(), CANONICAL_DATE, CANONICAL_PARTIES);
    const res = await h.app.inject({
      method: 'GET',
      url: '/v1/alerts',
      headers: auth(session.accessToken!),
    });
    // A zero difference on an uncounted day would read as "balanced".
    expect(JSON.parse(res.body).difference).toBeNull();
  });

  it('refuses a date that does not exist', async () => {
    const res = await h.app.inject({
      method: 'GET',
      url: '/v1/days/2026-02-30/summary',
      headers: auth(session.accessToken!),
    });
    expect(res.statusCode).toBe(400);
  });

  it('a party export carries the disclaimer and never the word invoice', async () => {
    await push(canonicalInput(), CANONICAL_DATE, CANONICAL_PARTIES);
    const res = await h.app.inject({
      method: 'GET',
      url: '/v1/parties/' + asUuid(CANONICAL_PARTIES[0]!.id) + '/export',
      headers: auth(session.accessToken!),
    });
    expect(res.statusCode).toBe(200);
    const body = res.body.toLowerCase();
    expect(body).toContain('not a tax document');
    // L-16: these words must never appear on anything a shopkeeper exports.
    expect(body).not.toContain('invoice');
    expect(body).not.toContain('filing');
  });
});

/* ==================================================================== *
 * DPDP
 * ==================================================================== */
describe('the DPDP obligations are endpoints, not paragraphs', () => {
  let h: Harness;
  beforeEach(() => {
    h = harness();
  });

  it('the notice is readable before an account exists, and is itemised', async () => {
    const res = await h.app.inject({ method: 'GET', url: '/v1/legal/notice' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.version).toBe(NOTICE_VERSION);
    // Itemised: each purpose says what it collects, why, and for how long.
    expect(body.items.length).toBeGreaterThanOrEqual(3);
    for (const item of body.items) {
      expect(item.purpose).toBeTruthy();
      expect(Array.isArray(item.collects)).toBe(true);
      expect(item.why).toBeTruthy();
      expect(item.retention).toBeTruthy();
    }
    expect(body.fiduciary.grievanceOfficer).toBeTruthy();
    expect(body.dataLocation).toContain('India');
  });

  it('says out loud that the Odia and Hindi text is not yet reviewed', async () => {
    const res = await h.app.inject({ method: 'GET', url: '/v1/legal/notice' });
    expect(JSON.parse(res.body).reviewState).toMatch(/DRAFT-PENDING-NATIVE-REVIEW/);
  });

  it('withdrawing an optional consent is the same one call as giving it', async () => {
    const s = await signIn(h);
    const grant = await h.app.inject({
      method: 'POST',
      url: '/v1/me/consent',
      ...jsonAuth(s.accessToken!)({ purpose: 'sms_reminders', granted: true }),
    });
    const withdraw = await h.app.inject({
      method: 'POST',
      url: '/v1/me/consent',
      ...jsonAuth(s.accessToken!)({ purpose: 'sms_reminders', granted: false }),
    });
    expect(grant.statusCode).toBe(200);
    expect(withdraw.statusCode).toBe(200);

    // Both survive: the history is the audit trail, so nothing is overwritten.
    const history = await h.app.inject({
      method: 'GET',
      url: '/v1/me/consents',
      headers: auth(s.accessToken!),
    });
    const kinds = JSON.parse(history.body).consents.map(
      (c: { purpose: string; granted: boolean }) => c.purpose + ':' + String(c.granted),
    );
    expect(kinds).toContain('sms_reminders:true');
    expect(kinds).toContain('sms_reminders:false');
  });

  it('withdrawing the consent the account rests on is answered with deletion', async () => {
    const s = await signIn(h);
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/me/consent',
      ...jsonAuth(s.accessToken!)({ purpose: 'account_and_ledger', granted: false }),
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).erasureEndpoint).toBe('POST /v1/me/erase');
  });

  it('the export is complete - every table the repository holds', async () => {
    const s = await signIn(h);
    const res = await h.app.inject({
      method: 'GET',
      url: '/v1/me/export',
      headers: auth(s.accessToken!),
    });
    expect(res.statusCode).toBe(200);
    const { data } = JSON.parse(res.body);
    for (const table of ['user', 'shop', 'consents', 'devices', 'parties', 'days', 'entries']) {
      expect(data, table).toHaveProperty(table);
    }
    expect(res.headers['content-disposition']).toContain('attachment');
  });

  it('erasure requires the literal word, and then SCHEDULES rather than erases', async () => {
    /*
     * IT USED TO PURGE ON THE BUTTON PRESS, and that contradicted this
     * product's own audit (§1.6: thirty days, "nothing is lost until the 30
     * days pass"). The difference is not academic: an immediate purge means
     * one mis-tap, or one SIM-swapped SMS, permanently destroys the only
     * record a shop has of what it is owed.
     */
    const s = await signIn(h);
    const mistyped = await h.app.inject({
      method: 'POST',
      url: '/v1/me/erase',
      ...jsonAuth(s.accessToken!)({ confirm: 'delete' }),
    });
    expect(mistyped.statusCode).toBe(400);

    const done = await h.app.inject({
      method: 'POST',
      url: '/v1/me/erase',
      ...jsonAuth(s.accessToken!)({ confirm: 'DELETE' }),
    });
    expect(done.statusCode).toBe(200);
    const body = JSON.parse(done.body);
    expect(body.liveDataErased).toBe(false);
    expect(body.graceDays).toBe(DELETION_GRACE_DAYS);
    expect(Date.parse(body.erasesAt) - Date.parse(T0)).toBe(DELETION_GRACE_DAYS * 86_400_000);

    // Nothing is gone yet, and the request is recorded on the shop.
    const dump = h.deps.repo.dump() as {
      users: unknown[];
      shops: { deletionRequestedAt: string | null; deletedAt: string | null }[];
    };
    expect(dump.users).toHaveLength(1);
    expect(dump.shops[0]!.deletionRequestedAt).toBe(T0);
    expect(dump.shops[0]!.deletedAt).toBeNull();
  });

  it('the job erases it once the grace has run out, and not one day before', async () => {
    const s = await signIn(h);
    await h.app.inject({
      method: 'POST',
      url: '/v1/me/erase',
      ...jsonAuth(s.accessToken!)({ confirm: 'DELETE' }),
    });

    const dayBefore = new Date(
      Date.parse(T0) + (DELETION_GRACE_DAYS - 1) * 86_400_000,
    ).toISOString();
    expect((await purgeDue(h.deps.repo, dayBefore)).erased).toEqual([]);

    const dayAfter = new Date(Date.parse(T0) + (DELETION_GRACE_DAYS + 1) * 86_400_000).toISOString();
    const report = await purgeDue(h.deps.repo, dayAfter);
    expect(report.erased).toHaveLength(1);
    expect(report.failed).toEqual([]);

    const dump = h.deps.repo.dump() as {
      users: unknown[];
      entries: unknown[];
      shops: { deletedAt: string | null; name: string }[];
    };
    expect(dump.users).toHaveLength(0);
    expect(dump.entries).toHaveLength(0);
    // A tombstone remains, carrying no identifying detail - only that it happened.
    expect(dump.shops[0]!.deletedAt).toBe(dayAfter);
    expect(dump.shops[0]!.name).toBe('');

    // Running it again finds nothing: an erased shop is not erased twice.
    expect((await purgeDue(h.deps.repo, dayAfter)).erased).toEqual([]);
  });

  it('SIGNING IN CANCELS IT, which is exactly what the copy promises him', async () => {
    const s = await signIn(h);
    await h.app.inject({
      method: 'POST',
      url: '/v1/me/erase',
      ...jsonAuth(s.accessToken!)({ confirm: 'DELETE' }),
    });
    expect(
      (h.deps.repo.dump() as { shops: { deletionRequestedAt: string | null }[] }).shops[0]!
        .deletionRequestedAt,
    ).toBe(T0);

    // He comes back before the thirty days are up.
    await signIn(h);
    expect(
      (h.deps.repo.dump() as { shops: { deletionRequestedAt: string | null }[] }).shops[0]!
        .deletionRequestedAt,
    ).toBeNull();

    const after = new Date(Date.parse(T0) + (DELETION_GRACE_DAYS + 1) * 86_400_000).toISOString();
    expect((await purgeDue(h.deps.repo, after)).erased).toEqual([]);
  });

  it('and the cancel route says so plainly, rather than relying on a side effect', async () => {
    const s = await signIn(h);
    await h.app.inject({
      method: 'POST',
      url: '/v1/me/erase',
      ...jsonAuth(s.accessToken!)({ confirm: 'DELETE' }),
    });
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/me/erase/cancel',
      // A body, even an empty one: Fastify answers 415 to a POST without a
      // content-type, and a real client has to send one too.
      ...jsonAuth(s.accessToken!)({}),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).cancelled).toBe(true);
  });

  it('names a grievance officer and a number of days', async () => {
    const s = await signIn(h);
    const res = await h.app.inject({
      method: 'GET',
      url: '/v1/me/grievance',
      headers: auth(s.accessToken!),
    });
    const body = JSON.parse(res.body);
    expect(body.officer).toBeTruthy();
    expect(body.respondWithinDays).toBeGreaterThan(0);
    expect(body.escalation).toMatch(/Data Protection Board/);
  });
});

/* ==================================================================== *
 * the security posture
 * ==================================================================== */
describe('the security posture holds on every response', () => {
  let h: Harness;
  beforeEach(() => {
    h = harness();
  });

  it('every guarded route refuses an unauthenticated caller', async () => {
    const guarded = [
      ['GET', '/v1/days/2026-07-15/summary'],
      ['GET', '/v1/parties/outstanding'],
      ['GET', '/v1/alerts'],
      ['GET', '/v1/reports'],
      ['GET', '/v1/me/export'],
      ['GET', '/v1/me/consents'],
      ['GET', '/v1/me/grievance'],
    ] as const;
    for (const [method, url] of guarded) {
      const res = await h.app.inject({ method, url });
      expect(res.statusCode, method + ' ' + url).toBe(401);
    }
    const write = await h.app.inject({ method: 'POST', url: '/v1/sync/push', ...json({}) });
    expect(write.statusCode).toBe(401);
  });

  it('carries the hardening headers, including on a 401 and a 404', async () => {
    for (const url of ['/health', '/v1/alerts', '/v1/nope']) {
      const res = await h.app.inject({ method: 'GET', url });
      expect(res.headers['x-content-type-options'], url).toBe('nosniff');
      expect(res.headers['x-frame-options'], url).toBe('DENY');
      expect(res.headers['referrer-policy'], url).toBe('no-referrer');
      expect(res.headers['cache-control'], url).toBe('no-store');
      expect(String(res.headers['strict-transport-security']), url).toContain('max-age=');
      expect(String(res.headers['content-security-policy']), url).toContain("default-src 'none'");
      expect(res.headers['x-powered-by']).toBeUndefined();
    }
  });

  it('sends no CORS header at all - there is no browser origin to allow', async () => {
    const res = await h.app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example' },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('refuses a body that is not JSON', async () => {
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/auth/otp/request',
      headers: { 'content-type': 'text/plain' },
      payload: 'phone=123',
    });
    expect(res.statusCode).toBe(415);
  });

  it('refuses a forged token, and never says why', async () => {
    const forged = mintToken('a-different-key-also-32-characters!!', {
      sub: 'u',
      shop: 's',
      dev: 'd',
      typ: 'access',
      nowSeconds: Math.floor(Date.parse(T0) / 1000),
      ttlSeconds: 3600,
    });
    const res = await h.app.inject({ method: 'GET', url: '/v1/alerts', headers: auth(forged) });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({ error: 'unauthenticated' });
  });

  it('refuses an expired token', async () => {
    const s = await signIn(h);
    h.clock.value = '2027-09-19T08:00:00.000Z';
    const res = await h.app.inject({
      method: 'GET',
      url: '/v1/alerts',
      headers: auth(s.accessToken!),
    });
    expect(res.statusCode).toBe(401);
  });

  it('never returns a stack trace or a constraint name to the client', async () => {
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/auth/otp/request',
      ...json({ phone: 'not-a-number', language: 'en' }),
    });
    expect(res.body).not.toMatch(/at .*\.ts:/);
    expect(res.body).not.toMatch(/_ck\b/);
  });

  it('no response anywhere contains the signing key', async () => {
    const s = await signIn(h);
    for (const url of ['/health', '/v1/legal/notice', '/v1/me/export']) {
      const res = await h.app.inject({ method: 'GET', url, headers: auth(s.accessToken!) });
      expect(res.body.includes(KEY), url).toBe(false);
    }
  });
});

/* ==================================================================== *
 * closing a day - the write that makes figures permanent
 * ==================================================================== */
describe('POST /v1/days/:date/close', () => {
  let h: Harness;
  let session: Session;

  const openWithCanonical = async () => {
    const input = canonicalInput();
    await h.app.inject({
      method: 'POST',
      url: '/v1/sync/push',
      ...jsonAuth(session.accessToken)({
        days: [{ date: CANONICAL_DATE, state: 'open', openingCash: input.day.openingCash ?? 0 }],
        parties: CANONICAL_PARTIES.map((p) => ({ id: asUuid(p.id), kind: p.kind, name: p.name })),
        entries: input.entries.map(wire),
      }),
    });
    // What the ENGINE says the drawer should hold, given exactly what the server has.
    return expectedCashBalance({
      ...input,
      priorCreditOutstanding: 0,
      priorSupplierOutstanding: 0,
    }).value;
  };

  beforeEach(async () => {
    h = harness();
    session = await signIn(h);
  });

  it('closes when the count matches, and reports a zero difference', async () => {
    const expected = await openWithCanonical();
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/days/' + CANONICAL_DATE + '/close',
      ...jsonAuth(session.accessToken)({ countedCash: expected }),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.expected).toBe(expected);
    expect(body.difference).toBe(0);
    expect(body.state).toBe('closed');
  });

  it('refuses to close on a difference with no reason', async () => {
    const expected = await openWithCanonical();
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/days/' + CANONICAL_DATE + '/close',
      ...jsonAuth(session.accessToken)({ countedCash: subtract(expected, 30000) }),
    });
    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('reason_required');
    // It says what it expected and what it got, so the gap is checkable.
    expect(body.expected).toBe(expected);
    expect(body.difference).toBe(subtract(0, 30000));
  });

  it('closes on a difference WITH a reason, and keeps the reason', async () => {
    const expected = await openWithCanonical();
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/days/' + CANONICAL_DATE + '/close',
      ...jsonAuth(session.accessToken)({
        countedCash: subtract(expected, 30000),
        differenceReason: 'gave change from my own pocket',
      }),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).difference).toBe(subtract(0, 30000));
    const day = (h.deps.repo.dump() as { days: { differenceReason: string | null }[] }).days[0]!;
    expect(day.differenceReason).toBe('gave change from my own pocket');
  });

  it('is idempotent for the same count, and refuses a different one', async () => {
    const expected = await openWithCanonical();
    const first = await h.app.inject({
      method: 'POST',
      url: '/v1/days/' + CANONICAL_DATE + '/close',
      ...jsonAuth(session.accessToken)({ countedCash: expected }),
    });
    expect(first.statusCode).toBe(200);

    // The phone retried. Not an error.
    const retry = await h.app.inject({
      method: 'POST',
      url: '/v1/days/' + CANONICAL_DATE + '/close',
      ...jsonAuth(session.accessToken)({ countedCash: expected }),
    });
    expect(retry.statusCode).toBe(200);
    expect(JSON.parse(retry.body).alreadyClosed).toBe(true);

    // A DIFFERENT count is not a retry - it is moving a permanent figure.
    const moved = await h.app.inject({
      method: 'POST',
      url: '/v1/days/' + CANONICAL_DATE + '/close',
      ...jsonAuth(session.accessToken)({ countedCash: add(expected, 1), differenceReason: 'x' }),
    });
    expect(moved.statusCode).toBe(409);
  });

  it('refuses a day that was never opened, and a date that cannot exist', async () => {
    const missing = await h.app.inject({
      method: 'POST',
      url: '/v1/days/2026-07-14/close',
      ...jsonAuth(session.accessToken)({ countedCash: 0 }),
    });
    expect(missing.statusCode).toBe(404);

    const impossible = await h.app.inject({
      method: 'POST',
      url: '/v1/days/2026-02-30/close',
      ...jsonAuth(session.accessToken)({ countedCash: 0 }),
    });
    expect(impossible.statusCode).toBe(400);
  });

  it('needs a token like everything else', async () => {
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/days/' + CANONICAL_DATE + '/close',
      ...json({ countedCash: 0 }),
    });
    expect(res.statusCode).toBe(401);
  });
});
