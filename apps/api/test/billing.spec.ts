/**
 * PR-7 · BILLING, ATTACKED THROUGH THE REAL SERVER.
 *
 * Every route runs through `buildApp` over `inject()`, with the real limiter,
 * the real auth and real signed-in shops. Google is the only thing faked: a
 * `PlayDeveloperApi` whose answers the test sets, and a signing key the test
 * makes at run time and hands to the OIDC check as Google's.
 *
 * THE PLANTED DEFECTS THIS FILE EXISTS TO CATCH, each with its own case:
 *   - cross-shop token reuse     shop B redeems shop A's token
 *   - an unverified RTDN         a push with no, or the wrong, OIDC token
 *   - an expired preview         still answering 'premium'
 *   - a stored flag              the plan must move with the CLOCK alone, no write
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { generateKeyPairSync, createSign, createVerify, type KeyObject } from 'node:crypto';
import { buildApp, type AppDeps } from '../src/app.ts';
import { testDeps } from './_deps.ts';
import { StubSmsPort } from '../src/sms/stub.ts';
import { NOTICE_VERSION } from '../src/dpdp/routes.ts';
import { WriteRefused } from '../src/db/port.ts';
import { loadBillingConfig, type BillingConfig } from '../src/config.ts';
import { memoryBillingRepo, pgBillingRepo, type BillingRepo } from '../src/billing/repo.ts';
import { accountIdFor, entitlementOf, PREVIEW_DAYS, type PurchaseState } from '../src/billing/entitlement.ts';
import {
  googlePlayApi,
  verifyPushToken,
  PlayApiError,
  type Fetch,
  type PlayDeveloperApi,
  type SubscriptionV2,
} from '../src/billing/google.ts';
import { migrationUp, type SubscriptionState } from '@swafto/schema';

const KEY = 'test-signing-key-at-least-32-chars!!';
const ACCOUNT_KEY = 'billing-account-key-for-tests-only';
const T0 = '2026-10-26T08:00:00.000Z';
const DAY = 86_400_000;
const at = (ms: number) => new Date(Date.parse(T0) + ms).toISOString();
const PRODUCT = 'swafto_premium';
const PKG = 'com.swafto';
const AUDIENCE = 'https://api.example.test/v1/billing/play/rtdn';
const PUSHER = 'rtdn-push@example-project.iam.gserviceaccount.com';

/* ---- Google, as the test plays it ------------------------------------- */

const google = generateKeyPairSync('rsa', { modulusLength: 2048 });
const impostor = generateKeyPairSync('rsa', { modulusLength: 2048 });
const KID = 'test-kid';
const keys = async (kid: string): Promise<KeyObject | null> => (kid === KID ? google.publicKey : null);

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
function pushToken(claims: Record<string, unknown>, signer: KeyObject = google.privateKey, kid = KID): string {
  const head = b64({ alg: 'RS256', kid, typ: 'JWT' });
  const body = b64(claims);
  const sig = createSign('RSA-SHA256').update(head + '.' + body).sign(signer).toString('base64url');
  return head + '.' + body + '.' + sig;
}
const goodClaims = (now: string) => ({
  iss: 'https://accounts.google.com',
  aud: AUDIENCE,
  email: PUSHER,
  email_verified: true,
  iat: Math.floor(Date.parse(now) / 1000),
  exp: Math.floor(Date.parse(now) / 1000) + 3600,
});

class FakePlay implements PlayDeveloperApi {
  readonly subs = new Map<string, SubscriptionV2>();
  readonly acks: string[] = [];
  gets = 0;
  async getSubscription(pkg: string, token: string) {
    this.gets += 1;
    expect(pkg).toBe(PKG);
    const s = this.subs.get(token);
    if (!s) throw new PlayApiError(404, 'subscriptionsv2.get');
    return s;
  }
  async acknowledge(pkg: string, product: string, token: string) {
    expect([pkg, product]).toEqual([PKG, PRODUCT]);
    this.acks.push(token);
    const s = this.subs.get(token)!;
    this.subs.set(token, { ...s, acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' });
  }
  /** What Google would say about a token bought for `shopId`. */
  set(token: string, shopId: string, state: SubscriptionState, expiry: string, autoRenew = true) {
    this.subs.set(token, {
      subscriptionState: state,
      acknowledgementState: this.subs.get(token)?.acknowledgementState ?? 'ACKNOWLEDGEMENT_STATE_PENDING',
      externalAccountIdentifiers: { obfuscatedExternalAccountId: accountIdFor(ACCOUNT_KEY, shopId) },
      lineItems: [
        {
          productId: PRODUCT,
          expiryTime: expiry,
          autoRenewingPlan: { autoRenewEnabled: autoRenew },
          offerDetails: { basePlanId: 'monthly' },
        },
      ],
    });
  }
}

const CONFIGURED: BillingConfig = {
  accountKey: ACCOUNT_KEY,
  play: {
    packageName: PKG,
    productId: PRODUCT,
    serviceAccount: { client_email: 'unused@test', private_key: 'unused' },
    rtdnAudience: AUDIENCE,
    rtdnEmail: PUSHER,
  },
  missing: [],
};

/* ---- the harness: the real app, real shops ----------------------------- */

interface Answer {
  entitlement: {
    plan: string;
    source: string | null;
    until: string | null;
    previewAvailable: boolean;
    everPremium: boolean;
    renews: boolean;
  };
  buying: { accountId: string } | null;
}

function harness(opts: { configured?: boolean } = {}) {
  const clock = { value: T0 };
  const sms = new StubSmsPort();
  const play = new FakePlay();
  const billingRepo = memoryBillingRepo();
  const configured = opts.configured ?? true;
  const deps: AppDeps = testDeps({
    sms,
    now: () => clock.value,
    billing: {
      repo: billingRepo,
      config: configured ? CONFIGURED : loadBillingConfig({}),
      play: configured ? play : null,
      keys: configured ? keys : null,
    },
  });
  const app = buildApp(deps);
  const signIn = async (phone: string) => {
    await app.inject({
      method: 'POST',
      url: '/v1/auth/otp/request',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ phone, language: 'en' }),
    });
    const code = sms.forPhone(phone).at(-1)!.variables[0]!;
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/otp/verify',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({
        phone,
        code,
        device: { platform: 'android' },
        shopName: 'Kirana',
        consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' },
      }),
    });
    expect(res.statusCode).toBe(200);
    return JSON.parse(res.body) as { accessToken: string; refreshToken: string; shopId: string };
  };
  /** The clock moved by days: a fresh access token, as the phone would get one. */
  const refresh = async (session: { refreshToken: string }) => {
    // RT-10: a refresh token is single-use, so the phone stores the rotated one - and so does this.
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { accessToken: string; refreshToken: string };
    session.refreshToken = body.refreshToken;
    return body.accessToken;
  };
  const call = (token: string, method: 'GET' | 'POST', url: string, body?: unknown) =>
    app.inject({
      method,
      url,
      headers: {
        authorization: 'Bearer ' + token,
        ...(method === 'POST' ? { 'content-type': 'application/json' } : {}),
      },
      ...(method === 'POST' ? { payload: JSON.stringify(body ?? {}) } : {}),
    });
  const plan = async (token: string): Promise<Answer> => {
    const res = await call(token, 'GET', '/v1/billing/entitlement');
    expect(res.statusCode).toBe(200);
    return JSON.parse(res.body) as Answer;
  };
  const verify = (token: string, purchaseToken: string) =>
    call(token, 'POST', '/v1/billing/play/verify', { purchaseToken, productId: PRODUCT });
  const push = (purchaseToken: string, authorization?: string) =>
    app.inject({
      method: 'POST',
      url: '/v1/billing/play/rtdn',
      headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) },
      payload: JSON.stringify({
        message: {
          messageId: '1',
          data: Buffer.from(
            JSON.stringify({
              version: '1.0',
              packageName: PKG,
              // The message CLAIMS a renewal (type 2). The server must not care what it claims.
              subscriptionNotification: { version: '1.0', notificationType: 2, purchaseToken },
            }),
          ).toString('base64'),
        },
        subscription: 'projects/p/subscriptions/s',
      }),
    });
  return { app, clock, play, signIn, refresh, call, plan, verify, push, billingRepo };
}

/* ==================================================================== */

describe('PR-7 · entitlement is derived from Google states and the clock', () => {
  const s = (googleState: SubscriptionState, expiresAt: string | null, fetchedAt = T0): PurchaseState => ({
    purchaseToken: 'tok',
    googleState,
    expiresAt,
    autoRenewing: true,
    basePlanId: 'monthly',
    acknowledged: true,
    fetchedAt,
  });
  const plan = (states: PurchaseState[], now = T0) => entitlementOf({ states, preview: null }, now).plan;

  it('is premium for ACTIVE, IN_GRACE_PERIOD and CANCELED while the expiry is ahead, and free after', () => {
    for (const st of [
      'SUBSCRIPTION_STATE_ACTIVE',
      'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
      'SUBSCRIPTION_STATE_CANCELED',
    ] as const) {
      expect(plan([s(st, at(DAY))]), st).toBe('premium');
      expect(plan([s(st, at(-1))]), st + ' expired').toBe('free');
    }
  });

  it('is never premium on account hold, pending, paused or expired, whatever the timestamp', () => {
    for (const st of [
      'SUBSCRIPTION_STATE_ON_HOLD',
      'SUBSCRIPTION_STATE_PENDING',
      'SUBSCRIPTION_STATE_PAUSED',
      'SUBSCRIPTION_STATE_EXPIRED',
    ] as const) {
      expect(plan([s(st, at(DAY))]), st).toBe('free');
    }
  });

  it('reads the LATEST answer per token', () => {
    const active = s('SUBSCRIPTION_STATE_ACTIVE', at(30 * DAY), T0);
    const hold = s('SUBSCRIPTION_STATE_ON_HOLD', at(-1), at(1000));
    expect(plan([active, hold])).toBe('free');
    expect(plan([{ ...hold, fetchedAt: T0 }, { ...active, fetchedAt: at(1000) }])).toBe('premium');
  });

  it('says a cancelled plan does not renew, and keeps it until expiry', () => {
    const e = entitlementOf({ states: [s('SUBSCRIPTION_STATE_CANCELED', at(DAY))], preview: null }, T0);
    expect([e.plan, e.renews, e.until]).toEqual(['premium', false, at(DAY)]);
  });
});

describe('PR-7 · the preview', () => {
  let h: ReturnType<typeof harness>;
  beforeEach(() => {
    h = harness();
  });

  it('starts once, lasts PREVIEW_DAYS, and a second start changes nothing', async () => {
    const a = await h.signIn('+919876500011');
    expect((await h.plan(a.accessToken)).entitlement).toMatchObject({
      plan: 'free',
      previewAvailable: true,
      everPremium: false,
    });

    const first = await h.call(a.accessToken, 'POST', '/v1/billing/preview');
    expect(first.statusCode).toBe(200);
    const body = JSON.parse(first.body);
    expect(body.started).toBe(true);
    expect(body.entitlement).toMatchObject({
      plan: 'premium',
      source: 'preview',
      until: at(PREVIEW_DAYS * DAY),
      renews: false,
    });

    h.clock.value = at(3 * DAY);
    const again = JSON.parse((await h.call(await h.refresh(a), 'POST', '/v1/billing/preview')).body);
    expect(again.started).toBe(false);
    expect(again.entitlement.until).toBe(at(PREVIEW_DAYS * DAY));
  });

  it('PLANTED DEFECT · an expired preview is FREE, by the clock alone (no stored flag to flip)', async () => {
    const a = await h.signIn('+919876500012');
    await h.call(a.accessToken, 'POST', '/v1/billing/preview');
    h.clock.value = at(PREVIEW_DAYS * DAY - 1);
    expect((await h.plan(await h.refresh(a))).entitlement.plan).toBe('premium');
    // Nothing is written between these two reads. Only the clock moves.
    h.clock.value = at(PREVIEW_DAYS * DAY);
    const token = await h.refresh(a);
    expect((await h.plan(token)).entitlement).toMatchObject({
      plan: 'free',
      previewAvailable: false,
      everPremium: true,
    });
    // And it cannot be started again.
    const retry = JSON.parse((await h.call(token, 'POST', '/v1/billing/preview')).body);
    expect([retry.started, retry.entitlement.plan]).toEqual([false, 'free']);
  });

  it('is per shop: one shop taking it leaves the other its own', async () => {
    const a = await h.signIn('+919876500013');
    const b = await h.signIn('+919876500014');
    await h.call(a.accessToken, 'POST', '/v1/billing/preview');
    expect((await h.plan(b.accessToken)).entitlement).toMatchObject({ plan: 'free', previewAvailable: true });
  });

  it('refuses a body naming a shop: the shop is the session (S-11)', async () => {
    const a = await h.signIn('+919876500015');
    const b = await h.signIn('+919876500016');
    const res = await h.call(a.accessToken, 'POST', '/v1/billing/preview', { shopId: b.shopId });
    expect(res.statusCode).toBe(400);
    expect((await h.plan(b.accessToken)).entitlement.previewAvailable).toBe(true);
  });

  it('is not spent on a shop that is already paying', async () => {
    const a = await h.signIn('+919876500017');
    h.play.set('tok-paid', a.shopId, 'SUBSCRIPTION_STATE_ACTIVE', at(30 * DAY));
    await h.verify(a.accessToken, 'tok-paid');
    expect((await h.call(a.accessToken, 'POST', '/v1/billing/preview')).statusCode).toBe(409);
    expect((await h.plan(a.accessToken)).entitlement.previewAvailable).toBe(true);
  });
});

describe('PR-7 · verify', () => {
  let h: ReturnType<typeof harness>;
  beforeEach(() => {
    h = harness();
  });

  it('asks Google, binds the token, acknowledges once, and answers premium until expiryTime', async () => {
    const a = await h.signIn('+919876500021');
    h.play.set('tok-a', a.shopId, 'SUBSCRIPTION_STATE_ACTIVE', at(30 * DAY));
    const res = await h.verify(a.accessToken, 'tok-a');
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).entitlement).toMatchObject({
      plan: 'premium',
      source: 'purchase',
      until: at(30 * DAY),
      renews: true,
    });
    expect(h.play.acks).toEqual(['tok-a']);

    // A retried verify is not a second acknowledgement, and not an error.
    expect((await h.verify(a.accessToken, 'tok-a')).statusCode).toBe(200);
    expect(h.play.acks).toEqual(['tok-a']);
    // The account id the phone launches the purchase with is the one checked.
    expect((await h.plan(a.accessToken)).buying?.accountId).toBe(accountIdFor(ACCOUNT_KEY, a.shopId));
  });

  it("PLANTED DEFECT · cross-shop token reuse: shop B cannot redeem shop A's token", async () => {
    const a = await h.signIn('+919876500022');
    const b = await h.signIn('+919876500023');
    h.play.set('tok-shared', a.shopId, 'SUBSCRIPTION_STATE_ACTIVE', at(30 * DAY));
    expect((await h.verify(a.accessToken, 'tok-shared')).statusCode).toBe(200);
    const gets = h.play.gets;

    const stolen = await h.verify(b.accessToken, 'tok-shared');
    expect(stolen.statusCode).toBe(409);
    expect(JSON.parse(stolen.body).error).toBe('purchase_belongs_elsewhere');
    expect((await h.plan(b.accessToken)).entitlement.plan).toBe('free');
    expect(h.play.gets).toBe(gets); // refused before Google was asked
    expect(h.play.acks).toEqual(['tok-shared']);
  });

  it('refuses a token bought for another shop even when it arrives first, and does not acknowledge it', async () => {
    const a = await h.signIn('+919876500024');
    const b = await h.signIn('+919876500025');
    h.play.set('tok-b', b.shopId, 'SUBSCRIPTION_STATE_ACTIVE', at(30 * DAY));
    const res = await h.verify(a.accessToken, 'tok-b');
    expect(res.statusCode).toBe(403);
    expect((await h.plan(a.accessToken)).entitlement.plan).toBe('free');
    expect(h.play.acks).toEqual([]);
    expect(await h.billingRepo.findPurchase('tok-b')).toBeNull();
    // Its own shop can still redeem it.
    expect((await h.verify(b.accessToken, 'tok-b')).statusCode).toBe(200);
  });

  it('a token Google does not know is a 400; a pending one is recorded but neither premium nor acknowledged', async () => {
    const a = await h.signIn('+919876500026');
    expect((await h.verify(a.accessToken, 'tok-none')).statusCode).toBe(400);
    h.play.set('tok-pending', a.shopId, 'SUBSCRIPTION_STATE_PENDING', at(30 * DAY));
    expect((await h.verify(a.accessToken, 'tok-pending')).statusCode).toBe(200);
    expect((await h.plan(a.accessToken)).entitlement.plan).toBe('free');
    expect(h.play.acks).toEqual([]);
  });

  it('refuses another product, and a body carrying a shop', async () => {
    const a = await h.signIn('+919876500027');
    const wrong = await h.call(a.accessToken, 'POST', '/v1/billing/play/verify', {
      purchaseToken: 't',
      productId: 'other',
    });
    expect(wrong.statusCode).toBe(400);
    const smuggled = await h.call(a.accessToken, 'POST', '/v1/billing/play/verify', {
      purchaseToken: 't',
      productId: PRODUCT,
      shopId: a.shopId,
    });
    expect(smuggled.statusCode).toBe(400);
  });

  it('needs a session: no token, no answer', async () => {
    const res = await h.app.inject({ method: 'GET', url: '/v1/billing/entitlement' });
    expect(res.statusCode).toBe(401);
  });
});

describe('PR-7 · the RTDN webhook', () => {
  let h: ReturnType<typeof harness>;
  let a: { accessToken: string; shopId: string };
  beforeEach(async () => {
    h = harness();
    a = await h.signIn('+919876500031');
    h.play.set('tok-r', a.shopId, 'SUBSCRIPTION_STATE_ACTIVE', at(30 * DAY));
    await h.verify(a.accessToken, 'tok-r');
    // Google's truth changes; only an authentic push may make the server look.
    h.play.set('tok-r', a.shopId, 'SUBSCRIPTION_STATE_ON_HOLD', at(-1));
  });

  it('PLANTED DEFECT · an unverified push is refused and changes nothing', async () => {
    const gets = h.play.gets;
    const s = Math.floor(Date.parse(T0) / 1000);
    const forged: [string, string | undefined][] = [
      ['no token', undefined],
      ['junk', 'Bearer not.a.jwt'],
      ['signed by somebody else', 'Bearer ' + pushToken(goodClaims(T0), impostor.privateKey)],
      ['unknown key id', 'Bearer ' + pushToken(goodClaims(T0), google.privateKey, 'other-kid')],
      ['wrong audience', 'Bearer ' + pushToken({ ...goodClaims(T0), aud: 'https://evil.example/rtdn' })],
      ['wrong issuer', 'Bearer ' + pushToken({ ...goodClaims(T0), iss: 'https://evil.example' })],
      ['wrong service account', 'Bearer ' + pushToken({ ...goodClaims(T0), email: 'someone@evil.example' })],
      ['unverified email', 'Bearer ' + pushToken({ ...goodClaims(T0), email_verified: false })],
      ['expired', 'Bearer ' + pushToken({ ...goodClaims(T0), exp: s - 1 })],
      ['from the future', 'Bearer ' + pushToken({ ...goodClaims(T0), iat: s + 3600, exp: s + 7200 })],
    ];
    for (const [why, header] of forged) {
      expect((await h.push('tok-r', header)).statusCode, why).toBe(401);
    }
    expect(h.play.gets).toBe(gets);
    expect((await h.plan(a.accessToken)).entitlement.plan).toBe('premium');
  });

  it('an authentic push re-fetches from Google and believes Google, not the message', async () => {
    // The message says "renewed"; Google says on hold. On hold wins.
    const res = await h.push('tok-r', 'Bearer ' + pushToken(goodClaims(T0)));
    expect(res.statusCode).toBe(204);
    expect((await h.plan(a.accessToken)).entitlement).toMatchObject({ plan: 'free', everPremium: true });

    // Recovered: Google says active again.
    h.play.set('tok-r', a.shopId, 'SUBSCRIPTION_STATE_ACTIVE', at(60 * DAY));
    await h.push('tok-r', 'Bearer ' + pushToken(goodClaims(T0)));
    expect((await h.plan(a.accessToken)).entitlement.plan).toBe('premium');
  });

  it('acknowledges, and ignores, a push about a token no shop has verified', async () => {
    const gets = h.play.gets;
    expect((await h.push('tok-unknown', 'Bearer ' + pushToken(goodClaims(T0)))).statusCode).toBe(204);
    expect(h.play.gets).toBe(gets);
  });
});

describe('PR-7 · billing closed until configured; everything else runs', () => {
  it('verify and the webhook answer 503 naming the missing variables; the preview and the API still work', async () => {
    const h = harness({ configured: false });
    expect((await h.app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    const a = await h.signIn('+919876500041');
    const res = await h.verify(a.accessToken, 'tok');
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('billing_not_configured');
    for (const name of ['BILLING_ACCOUNT_KEY', 'PLAY_PRODUCT_ID', 'PLAY_SERVICE_ACCOUNT_JSON']) {
      expect(body.message).toContain(name);
    }
    expect((await h.push('tok', 'Bearer x')).statusCode).toBe(503);
    expect((await h.plan(a.accessToken)).buying).toBeNull();
    const preview = await h.call(a.accessToken, 'POST', '/v1/billing/preview');
    expect(JSON.parse(preview.body).entitlement.plan).toBe('premium');
  });

  it('loadBillingConfig: absent is allowed, malformed is refused, the key must be its own', () => {
    expect(loadBillingConfig({}).play).toBeNull();
    expect(loadBillingConfig({}).missing).toHaveLength(5);
    expect(() => loadBillingConfig({ PLAY_SERVICE_ACCOUNT_JSON: '{not json' })).toThrow(/not JSON/);
    expect(() => loadBillingConfig({ PLAY_SERVICE_ACCOUNT_JSON: '{}' })).toThrow(/client_email/);
    expect(() => loadBillingConfig({ BILLING_ACCOUNT_KEY: 'short' })).toThrow();
    expect(() => loadBillingConfig({ BILLING_ACCOUNT_KEY: KEY, SESSION_SIGNING_KEY: KEY })).toThrow(/must differ/);
    const full = loadBillingConfig({
      BILLING_ACCOUNT_KEY: ACCOUNT_KEY,
      PLAY_PRODUCT_ID: PRODUCT,
      PLAY_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'sa@x', private_key: 'k' }),
      PLAY_RTDN_AUDIENCE: AUDIENCE,
      PLAY_RTDN_SERVICE_ACCOUNT: PUSHER,
    });
    expect(full.missing).toEqual([]);
    expect(full.play?.packageName).toBe('com.swafto');
  });
});

describe('PR-7 · the real Play adapter, against a fake fetch', () => {
  const sa = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = sa.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  it('signs a service-account JWT, caches the token, and calls the documented URLs', async () => {
    const calls: { url: string; method?: string; headers?: Record<string, string>; body?: string }[] = [];
    const fetch: Fetch = async (url, init) => {
      calls.push({ url, ...init });
      if (url === 'https://oauth2.googleapis.com/token') {
        return { status: 200, json: async () => ({ access_token: 'at-1', expires_in: 3600 }) };
      }
      return { status: 200, json: async () => ({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE' }) };
    };
    const api = googlePlayApi({
      fetch,
      serviceAccount: { client_email: 'sa@p.iam.gserviceaccount.com', private_key: pem },
      now: () => T0,
    });

    expect((await api.getSubscription(PKG, 'a/b')).subscriptionState).toBe('SUBSCRIPTION_STATE_ACTIVE');
    await api.acknowledge(PKG, PRODUCT, 'a/b');

    // One token request for two calls: the access token is cached.
    expect(calls.map((c) => c.url)).toEqual([
      'https://oauth2.googleapis.com/token',
      'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.swafto/purchases/subscriptionsv2/tokens/a%2Fb',
      'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.swafto/purchases/subscriptions/swafto_premium/tokens/a%2Fb:acknowledge',
    ]);
    expect(calls[1]!.headers!.authorization).toBe('Bearer at-1');
    expect(calls[2]!.method).toBe('POST');

    const form = new URLSearchParams(calls[0]!.body!);
    expect(form.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    const [h64, c64, s64] = form.get('assertion')!.split('.');
    expect(
      createVerify('RSA-SHA256').update(h64 + '.' + c64).verify(sa.publicKey, Buffer.from(s64!, 'base64url')),
    ).toBe(true);
    const claims = JSON.parse(Buffer.from(c64!, 'base64url').toString());
    expect(claims).toMatchObject({
      iss: 'sa@p.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
    });
    expect(claims.exp - claims.iat).toBe(3600);
  });

  it('turns a non-2xx answer into a PlayApiError carrying the status', async () => {
    const fetch: Fetch = async (url) =>
      url.includes('oauth2')
        ? { status: 200, json: async () => ({ access_token: 'x' }) }
        : { status: 410, json: async () => ({}) };
    const api = googlePlayApi({ fetch, serviceAccount: { client_email: 'e', private_key: pem }, now: () => T0 });
    await expect(api.getSubscription(PKG, 't')).rejects.toMatchObject({ name: 'PlayApiError', status: 410 });
  });

  it('verifyPushToken accepts the one good token', async () => {
    expect(await verifyPushToken(pushToken(goodClaims(T0)), { audience: AUDIENCE, email: PUSHER }, keys, T0)).toBe(
      true,
    );
  });
});

/* ---- the repository contract, on both implementations ----------------- */

const URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55432/swafto_test';
type Sql = { query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }> };
let pg: Sql | null = null;
let pgSkip = 'not attempted';
const SHOP_A = '00000000-0000-7000-8000-00000000aa01';
const SHOP_B = '00000000-0000-7000-8000-00000000bb02';
try {
  const mod = (await import('pg')) as unknown as Record<string, unknown>;
  const lib = (mod.default ?? mod) as { Client: new (o: unknown) => Sql & { connect(): Promise<void> } };
  const c = new lib.Client({ connectionString: URL, connectionTimeoutMillis: 4000 });
  await c.connect();
  await c.query('DROP SCHEMA IF EXISTS billing_equivalence CASCADE');
  await c.query('CREATE SCHEMA billing_equivalence');
  await c.query('SET search_path TO billing_equivalence');
  for (const s of migrationUp('postgres')) await c.query(s);
  for (const id of [SHOP_A, SHOP_B]) {
    await c.query("INSERT INTO shops (id, name, type, language, created_at) VALUES ($1, 'S', 'kirana', 'en', $2)", [
      id,
      T0,
    ]);
  }
  pg = c;
} catch (e) {
  pgSkip = (e as Error).message;
}

const contract = (name: string, make: () => BillingRepo, prefix: string, previewShop: string) =>
  describe('PR-7 · billing repository contract · ' + name, () => {
    it('binds once, re-binds to the same shop quietly, and refuses another shop', async () => {
      const r = make();
      const t = prefix + '-bind';
      const row = { purchaseToken: t, shopId: SHOP_A, accountId: 'x', productId: PRODUCT, boundAt: T0 };
      expect(await r.bindPurchase(row)).toEqual({ inserted: true });
      expect(await r.bindPurchase(row)).toEqual({ inserted: false });
      await expect(r.bindPurchase({ ...row, shopId: SHOP_B })).rejects.toBeInstanceOf(WriteRefused);
      await expect(r.bindPurchase({ ...row, shopId: SHOP_B })).rejects.toMatchObject({
        constraintName: 'plan_purchases_tenancy',
      });
      expect((await r.findPurchase(t))?.shopId).toBe(SHOP_A);
    });

    it("returns only this shop's states, oldest first, and refuses a state for an unbound token", async () => {
      const r = make();
      const t = prefix + '-states';
      await r.bindPurchase({ purchaseToken: t, shopId: SHOP_A, accountId: 'x', productId: PRODUCT, boundAt: T0 });
      const base = {
        purchaseToken: t,
        expiresAt: at(DAY),
        autoRenewing: true,
        basePlanId: 'monthly',
        acknowledged: false,
        snapshot: '{}',
      };
      await r.appendPurchaseState({ ...base, googleState: 'SUBSCRIPTION_STATE_ACTIVE', fetchedAt: T0 });
      await r.appendPurchaseState({
        ...base,
        googleState: 'SUBSCRIPTION_STATE_ON_HOLD',
        expiresAt: null,
        fetchedAt: at(1000),
      });
      const mine = (await r.purchaseStatesFor(SHOP_A)).filter((s) => s.purchaseToken === t);
      expect(mine.map((s) => [s.googleState, s.expiresAt, s.fetchedAt, s.autoRenewing])).toEqual([
        ['SUBSCRIPTION_STATE_ACTIVE', at(DAY), T0, true],
        ['SUBSCRIPTION_STATE_ON_HOLD', null, at(1000), true],
      ]);
      expect((await r.purchaseStatesFor(SHOP_B)).filter((s) => s.purchaseToken === t)).toEqual([]);
      await expect(
        r.appendPurchaseState({
          ...base,
          purchaseToken: prefix + '-nobody',
          googleState: 'SUBSCRIPTION_STATE_ACTIVE',
          fetchedAt: T0,
        }),
      ).rejects.toBeInstanceOf(WriteRefused);
    });

    it('grants one preview per shop and returns the first grant on a second call', async () => {
      const r = make();
      const first = { startedAt: T0, endsAt: at(14 * DAY) };
      expect(await r.grantPreview(previewShop, first)).toEqual({ inserted: true, preview: first });
      expect(await r.grantPreview(previewShop, { startedAt: at(DAY), endsAt: at(15 * DAY) })).toEqual({
        inserted: false,
        preview: first,
      });
      expect(await r.previewFor(previewShop)).toEqual(first);
    });
  });

contract('memory', memoryBillingRepo, 'mem', SHOP_A);
if (pg) contract('postgres', () => pgBillingRepo(pg!), 'pg', SHOP_B);
else
  describe('PR-7 · billing repository contract · postgres', () => {
    it.skip('skipped: ' + pgSkip, () => undefined);
  });
