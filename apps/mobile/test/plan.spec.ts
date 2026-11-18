import { describe, it, expect } from 'vitest';
import {
  allows,
  readOnly,
  planOf,
  playSubscriptionsUrl,
  PREMIUM_FEATURES,
  type PlanAnswer,
} from '../src/app/plan.ts';
import { playBilling, parseProducts, type NativeBilling } from '../src/net/billing.ts';
import { Session } from '../src/app/session.tsx';
import { Store, memoryPort } from '../src/store/index.ts';
import { canonicalInput, CANONICAL_PARTIES } from '@swafto/fixtures';

describe('the one Premium gate', () => {
  it('free uses no Premium feature but still reads what Premium recorded', () => {
    for (const f of PREMIUM_FEATURES) {
      expect(allows('free', f)).toBe(false);
      expect(readOnly('free', f)).toBe(true);
      expect(allows('premium', f)).toBe(true);
    }
  });
});

const T0 = '2026-10-26T08:00:00.000Z';
const answer = (plan: 'free' | 'premium', until: string | null): PlanAnswer => ({
  entitlement: {
    plan,
    source: plan === 'premium' ? 'preview' : null,
    until,
    renews: false,
    basePlanId: null,
    state: null,
    previewAvailable: false,
    previewEndsAt: until,
    everPremium: true,
    asOf: T0,
  },
  buying: null,
});

describe('PR-7 · planOf: the server said, until when it said', () => {
  it('is premium only while a premium answer has not reached its until', () => {
    expect(planOf(null, T0)).toBe('free');
    expect(planOf(answer('free', null), T0)).toBe('free');
    expect(planOf(answer('premium', null), T0)).toBe('free');
    expect(planOf(answer('premium', '2026-10-26T09:00:00.000Z'), T0)).toBe('premium');
    expect(planOf(answer('premium', T0), T0)).toBe('free');
  });

  it("cancel goes to Play's own subscription page for this product", () => {
    expect(playSubscriptionsUrl('swafto_premium')).toBe(
      'https://play.google.com/store/account/subscriptions?sku=swafto_premium&package=com.swafto',
    );
    expect(playSubscriptionsUrl(null)).toBe('https://play.google.com/store/account/subscriptions');
  });
});

describe('PR-7 · session.state.plan degrades on the clock, offline, with no write', () => {
  it('reads premium before the cached until and free after it, even if nothing else changes', () => {
    const clock = { value: T0 };
    const base = canonicalInput();
    const store = new Store(
      memoryPort({
        shopId: '11111111-1111-4111-8111-000000000001',
        day: base.day,
        entries: [],
        parties: CANONICAL_PARTIES,
        priorCreditOutstanding: 0,
        priorSupplierOutstanding: 0,
        skippedSections: [],
      }),
      () => clock.value,
    );
    const s = new Session(store, { now: () => clock.value, newId: () => 'id' });
    expect(s.state.plan).toBe('free');
    s.setPlanAnswer(answer('premium', '2026-10-26T09:00:00.000Z'));
    expect(s.state.plan).toBe('premium');
    const before = s.state;
    expect(s.state).toBe(before); // stable identity while nothing changed
    clock.value = '2026-10-26T09:00:00.000Z';
    expect(s.state.plan).toBe('free');
  });
});

describe('PR-7 · the Play wrapper never fakes success', () => {
  const native = (over: Partial<NativeBilling>): NativeBilling => ({
    productDetails: async () => ({ plans: [] }),
    purchase: async () => ({ outcome: 'failed' }),
    ...over,
  });

  it('no native module, a throwing module, or no base plans: unavailable', async () => {
    expect((await playBilling(undefined).products('p')).kind).toBe('unavailable');
    expect((await playBilling(undefined).purchase('p', 'o', 'a')).kind).toBe('unavailable');
    const broken = playBilling(native({ productDetails: async () => Promise.reject({ code: 'unavailable' }) }));
    expect(await broken.products('p')).toEqual({ kind: 'unavailable', reason: 'unavailable' });
    expect((await playBilling(native({})).products('p')).kind).toBe('unavailable');
  });

  it('turns Play micros into paise exactly, and refuses a price that is not whole paise', () => {
    const ok = parseProducts({
      plans: [
        { basePlanId: 'monthly', offerToken: 'o1', priceAmountMicros: 99_000_000, formattedPrice: '₹99.00', billingPeriod: 'P1M' },
        { basePlanId: 'yearly', offerToken: 'o2', priceAmountMicros: 799_000_000, formattedPrice: '₹799.00', billingPeriod: 'P1Y' },
        { basePlanId: 'weekly', offerToken: 'o3', priceAmountMicros: 10_000_000 },
      ],
    });
    expect(ok.kind === 'ready' && ok.plans.map((p) => [p.basePlanId, p.pricePaise])).toEqual([
      ['monthly', 9900],
      ['yearly', 79900],
    ]);
    expect(
      parseProducts({ plans: [{ basePlanId: 'monthly', offerToken: 'o', priceAmountMicros: 99_000_001 }] }).kind,
    ).toBe('unavailable');
  });

  it('"purchased" without a token is a failure, never a purchase', async () => {
    const b = playBilling(native({ purchase: async () => ({ outcome: 'purchased' }) }));
    expect((await b.purchase('p', 'o', 'a')).kind).toBe('failed');
    const good = playBilling(native({ purchase: async () => ({ outcome: 'purchased', purchaseToken: 'tok' }) }));
    expect(await good.purchase('p', 'o', 'a')).toEqual({ kind: 'purchased', purchaseToken: 'tok' });
    const cancelled = playBilling(native({ purchase: async () => ({ outcome: 'cancelled' }) }));
    expect((await cancelled.purchase('p', 'o', 'a')).kind).toBe('cancelled');
  });
});

/*
 * BETA: these tests cover the Free/Premium gate as it will stand after beta,
 * so the all-free beta switch is off for this file and restored after it.
 */
import { beforeAll as betaOff, afterAll as betaOn } from 'vitest';
import { BETA } from '../src/app/plan.ts';
betaOff(() => {
  BETA.allFree = false;
});
betaOn(() => {
  BETA.allFree = true;
});
