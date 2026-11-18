/** Play wrapper edges not in plan.spec.ts: every purchase outcome, and error reasons. */
import { describe, expect, it } from 'vitest';
import { parsePurchase, parseProducts, playBilling, type NativeBilling } from '../src/net/billing.ts';

const native = (over: Partial<NativeBilling>): NativeBilling => ({
  productDetails: async () => ({ plans: [] }),
  purchase: async () => ({ outcome: 'failed' }),
  ...over,
});

describe('parsePurchase - only a token is a purchase', () => {
  it.each([
    [{ outcome: 'purchased', purchaseToken: 'tok' }, { kind: 'purchased', purchaseToken: 'tok' }],
    [{ outcome: 'purchased' }, { kind: 'failed', reason: 'purchased without a token' }],
    [{ outcome: 'purchased', purchaseToken: '' }, { kind: 'failed', reason: 'purchased without a token' }],
    [{ outcome: 'pending' }, { kind: 'pending' }],
    [{ outcome: 'cancelled' }, { kind: 'cancelled' }],
    [{ outcome: 'unavailable', code: 'BILLING_UNAVAILABLE' }, { kind: 'unavailable', reason: 'BILLING_UNAVAILABLE' }],
    [{ outcome: 'unavailable' }, { kind: 'unavailable', reason: 'unavailable' }],
    [{ outcome: 'weird', code: 'E7' }, { kind: 'failed', reason: 'E7' }],
    [{}, { kind: 'failed', reason: 'unknown' }],
    [null, { kind: 'failed', reason: 'unknown' }],
  ])('%j', (raw, want) => {
    expect(parsePurchase(raw)).toEqual(want);
  });
});

describe('parseProducts - refuses anything it cannot show honestly', () => {
  it('no plans array, null, no offer token, and no recognised base plan', () => {
    expect(parseProducts(null)).toEqual({ kind: 'unavailable', reason: 'no plans' });
    expect(parseProducts({ plans: 'x' })).toEqual({ kind: 'unavailable', reason: 'no plans' });
    expect(
      parseProducts({ plans: [{ basePlanId: 'monthly', priceAmountMicros: 99_000_000 }] }),
    ).toEqual({ kind: 'unavailable', reason: 'no offer token' });
    expect(
      parseProducts({ plans: [{ basePlanId: 'monthly', offerToken: '', priceAmountMicros: 99_000_000 }] }),
    ).toEqual({ kind: 'unavailable', reason: 'no offer token' });
    expect(parseProducts({ plans: [{ basePlanId: 'weekly', offerToken: 'o', priceAmountMicros: 1_000_000 }] })).toEqual({
      kind: 'unavailable',
      reason: 'no base plans',
    });
  });

  it('missing display strings become empty strings, never "undefined"', () => {
    const r = parseProducts({ plans: [{ basePlanId: 'monthly', offerToken: 'o', priceAmountMicros: 99_000_000 }] });
    expect(r.kind === 'ready' && r.plans[0]).toMatchObject({ formattedPrice: '', billingPeriod: '' });
  });
});

describe('playBilling.purchase - a thrown error is never success', () => {
  it('"unavailable" stays unavailable, any other throw is failed with its code or message', async () => {
    const u = playBilling(native({ purchase: () => Promise.reject({ code: 'unavailable' }) }));
    expect(await u.purchase('p', 'o', 'a')).toEqual({ kind: 'unavailable', reason: 'unavailable' });
    const f = playBilling(native({ purchase: () => Promise.reject({ code: 'E_NET' }) }));
    expect(await f.purchase('p', 'o', 'a')).toEqual({ kind: 'failed', reason: 'E_NET' });
    const m = playBilling(native({ purchase: () => Promise.reject(new Error('boom')) }));
    expect(await m.purchase('p', 'o', 'a')).toEqual({ kind: 'failed', reason: 'boom' });
    const n = playBilling(native({ purchase: () => Promise.reject(null) }));
    expect((await n.purchase('p', 'o', 'a')).kind).toBe('failed');
  });

  it('passes the account id through so Play can bind the purchase to it', async () => {
    const seen: unknown[][] = [];
    const b = playBilling(
      native({
        purchase: async (...a) => {
          seen.push(a);
          return { outcome: 'pending' };
        },
      }),
    );
    expect(await b.purchase('prod', 'off', 'acct')).toEqual({ kind: 'pending' });
    expect(seen).toEqual([['prod', 'off', 'acct']]);
  });
});
