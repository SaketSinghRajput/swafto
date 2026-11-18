/**
 * PR-7 · THE PLAN, END TO END: the real Host on the phone, the real API, and
 * Google faked at both ends - Play's purchase sheet on the phone, the Play
 * Developer API on the server.
 *
 * What it holds the pair to:
 *   - with no Play on the device, buying says "not open" and Premium stays off;
 *   - the preview turns Premium on with no payment step at all;
 *   - the plan survives a relaunch with no signal, as the server's last answer,
 *     and ends at that answer's own expiry while still offline;
 *   - a purchase is Premium only after the SERVER has checked it with Google;
 *   - a purchase Play completed while the server was unreachable is kept on
 *     disk and confirmed on the next refresh, never lost and never assumed.
 */
import { describe, it, expect } from 'vitest';
import { buildApp, type AppDeps } from '../apps/api/src/app.ts';
import { memoryRepo } from '../apps/api/src/db/memory.ts';
import { memoryOtpStore } from '../apps/api/src/auth/routes.ts';
import { memorySql } from '../apps/api/src/rate-limit/memory-sql.ts';
import { RateLimiter } from '../apps/api/src/rate-limit/store.ts';
import { StubSmsPort } from '../apps/api/src/sms/stub.ts';
import { NOTICE_VERSION } from '../apps/api/src/dpdp/routes.ts';
import { memoryBillingRepo } from '../apps/api/src/billing/repo.ts';
import { accountIdFor } from '../apps/api/src/billing/entitlement.ts';
import { PlayApiError, type PlayDeveloperApi, type SubscriptionV2 } from '../apps/api/src/billing/google.ts';
import { Host, type FetchLike } from '../apps/mobile/src/host.tsx';
import { Store, memoryPort } from '../apps/mobile/src/store/index.ts';
import { playBilling, type NativeBilling } from '../apps/mobile/src/net/billing.ts';
import { canonicalInput, CANONICAL_PARTIES } from '@swafto/fixtures';

const KEY = 'test-signing-key-at-least-32-chars!!';
const ACCOUNT_KEY = 'billing-account-key-for-tests-only';
const BASE = 'https://api.example.test';
const T0 = '2026-10-26T08:00:00.000Z';
const DAY = 86_400_000;
const at = (ms: number) => new Date(Date.parse(T0) + ms).toISOString();
const PRODUCT = 'swafto_premium';

function world() {
  const clock = { value: T0 };
  const sms = new StubSmsPort();
  const google = new Map<string, SubscriptionV2>();
  const play: PlayDeveloperApi = {
    getSubscription: async (_p, token) => {
      const s = google.get(token);
      if (!s) throw new PlayApiError(404, 'subscriptionsv2.get');
      return s;
    },
    acknowledge: async () => undefined,
  };
  const deps: AppDeps = {
    repo: memoryRepo(),
    sms,
    otp: memoryOtpStore(),
    now: () => clock.value,
    signingKey: KEY,
    rate: new RateLimiter(memorySql(), { secret: KEY, now: () => new Date(clock.value) }),
    billing: {
      repo: memoryBillingRepo(),
      config: {
        accountKey: ACCOUNT_KEY,
        play: {
          packageName: 'com.swafto',
          productId: PRODUCT,
          serviceAccount: { client_email: 'x', private_key: 'x' },
          rtdnAudience: 'a',
          rtdnEmail: 'e',
        },
        missing: [],
      },
      play,
      keys: async () => null,
    },
  };
  const app = buildApp(deps);
  const net = { up: true };
  const doFetch: FetchLike = async (url, init) => {
    if (!net.up) throw new Error('ENETUNREACH');
    const r = await app.inject({
      method: init.method as 'GET' | 'POST',
      url: url.slice(BASE.length),
      headers: init.headers,
      ...(init.body ? { payload: init.body } : {}),
    });
    return { status: r.statusCode, text: async () => r.body };
  };
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
    return JSON.parse(res.body) as { accessToken: string; refreshToken: string; deviceId: string; shopId: string };
  };
  return { clock, google, net, doFetch, signIn };
}

const storage = (initial: string | null = null) => {
  let held = initial;
  return {
    read: () => held,
    write: (v: string | null) => {
      held = v;
    },
  };
};

function phone(w: ReturnType<typeof world>, tokens: string, plan: ReturnType<typeof storage>, native?: NativeBilling) {
  const base = canonicalInput();
  return new Host({
    baseUrl: BASE,
    fetch: w.doFetch,
    storage: storage(tokens),
    store: new Store(
      memoryPort({
        shopName: 'Kirana',
        day: base.day,
        entries: [],
        parties: CANONICAL_PARTIES,
        priorCreditOutstanding: 0,
        priorSupplierOutstanding: 0,
        skippedSections: [],
      }),
      () => w.clock.value,
    ),
    now: () => w.clock.value,
    newId: () => 'id',
    planCache: plan,
    billing: playBilling(native),
  });
}

/** A Play purchase sheet on the phone that "completes" with this token. */
const sheet = (token: string, calls: string[] = []): NativeBilling => ({
  productDetails: async () => ({
    plans: [
      { basePlanId: 'monthly', offerToken: 'offer-m', priceAmountMicros: 99_000_000, formattedPrice: '₹99.00', billingPeriod: 'P1M' },
      { basePlanId: 'yearly', offerToken: 'offer-y', priceAmountMicros: 799_000_000, formattedPrice: '₹799.00', billingPeriod: 'P1Y' },
    ],
  }),
  purchase: async (productId, offerToken, accountId) => {
    calls.push([productId, offerToken, accountId].join('|'));
    return { outcome: 'purchased', purchaseToken: token };
  },
});

const active = (shopId: string, expiry: string): SubscriptionV2 => ({
  subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
  acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
  externalAccountIdentifiers: { obfuscatedExternalAccountId: accountIdFor(ACCOUNT_KEY, shopId) },
  lineItems: [
    {
      productId: PRODUCT,
      expiryTime: expiry,
      autoRenewingPlan: { autoRenewEnabled: true },
      offerDetails: { basePlanId: 'yearly' },
    },
  ],
});

describe('PR-7 · the plan, phone to server', () => {
  it('with no Play on the device, buying is "not open" and nothing is faked', async () => {
    const w = world();
    const t = await w.signIn('+919876500051');
    const h = phone(w, JSON.stringify(t), storage());
    await h.refreshPlan();
    expect(h.session.state.planOffer?.kind).toBe('unavailable');
    await h.buyPremium('monthly');
    expect(h.session.state.planNotice).toBe('notOpen');
    expect(h.session.state.plan).toBe('free');
  });

  it('the preview needs no payment step, survives an offline relaunch, and ends on its own date', async () => {
    const w = world();
    const t = await w.signIn('+919876500052');
    const cache = storage();
    const h = phone(w, JSON.stringify(t), cache);
    await h.startPreview();
    expect(h.session.state.plan).toBe('premium');
    expect(h.session.state.planNotice).toBe('previewStarted');

    // Relaunch with no signal: the last answer stands.
    w.net.up = false;
    const again = phone(w, JSON.stringify(t), cache);
    await again.refreshPlan();
    expect(again.session.state.plan).toBe('premium');
    // Still offline, a fortnight on: the cached answer's own expiry ends it.
    w.clock.value = at(14 * DAY);
    expect(again.session.state.plan).toBe('free');
  });

  it('a purchase is Premium only after the server checked it with Google', async () => {
    const w = world();
    const t = await w.signIn('+919876500053');
    const calls: string[] = [];
    const h = phone(w, JSON.stringify(t), storage(), sheet('tok-buy', calls));
    await h.refreshPlan();
    expect(h.session.state.planOffer?.kind).toBe('ready');

    // Google does not know the token: the sheet "succeeded", the server says no, the plan stays free.
    await h.buyPremium('yearly');
    expect(h.session.state.plan).toBe('free');
    expect(h.session.state.planNotice).toBe('failed');

    w.google.set('tok-buy', active(t.shopId, at(365 * DAY)));
    await h.buyPremium('yearly');
    expect(h.session.state.plan).toBe('premium');
    expect(h.session.state.planNotice).toBe('purchased');
    // The sheet was opened for the shop's own obfuscated account id, from the server.
    expect(calls.at(-1)).toBe([PRODUCT, 'offer-y', accountIdFor(ACCOUNT_KEY, t.shopId)].join('|'));
  });

  it('a purchase completed with no signal is kept, and confirmed on the next refresh', async () => {
    const w = world();
    const t = await w.signIn('+919876500054');
    const cache = storage();
    const h = phone(w, JSON.stringify(t), cache, sheet('tok-later'));
    await h.refreshPlan();
    w.google.set('tok-later', active(t.shopId, at(30 * DAY)));
    w.net.up = false;
    await h.buyPremium('monthly');
    expect(h.session.state.planNotice).toBe('verifyLater');
    expect(h.session.state.plan).toBe('free');
    expect(JSON.parse(cache.read()!).pending.token).toBe('tok-later');

    w.net.up = true;
    await h.refreshPlan();
    expect(h.session.state.plan).toBe('premium');
    expect(JSON.parse(cache.read()!).pending).toBeNull();
  });
});
