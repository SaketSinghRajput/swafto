/**
 * PR-7 · GOOGLE PLAY BILLING, AS THE APP SEES IT. A thin, typed skin over the
 * `SwaftoBilling` native module (android/.../billing/BillingModule.kt).
 *
 * WHAT IT NEVER DOES: decide anything. It shows Play's price, starts Play's own
 * purchase sheet, and hands back the purchase token. Whether that token is
 * Premium is the server's question (R4 §2: "no entitlement decision in the APK").
 *
 * IT NEVER FAKES SUCCESS. No native module (a test, a build without it), no Play
 * on the device, no product in Play Console (R4-HA4 is not done), a malformed
 * price - every one is `unavailable`, and the screen says buying is not open.
 * `purchased` exists only with a token in it.
 */
import { paiseFromMicros, type Paise } from '@swafto/formula-engine';
import { BASE_PLANS, type BasePlan } from '../app/plan.ts';

/** What the Kotlin module resolves. Kept loose: it crosses a bridge. */
export interface NativeBilling {
  productDetails(productId: string): Promise<unknown>;
  purchase(productId: string, offerToken: string, obfuscatedAccountId: string): Promise<unknown>;
}

export interface PlayPlan {
  readonly basePlanId: BasePlan;
  readonly offerToken: string;
  /** Play's price, GST included (R4-HA4 sets prices tax-inclusive). */
  readonly pricePaise: Paise;
  /** Play's own rendering, e.g. "₹99.00". */
  readonly formattedPrice: string;
  /** ISO-8601 period, P1M or P1Y. */
  readonly billingPeriod: string;
}

export type ProductsResult =
  | { readonly kind: 'ready'; readonly plans: readonly PlayPlan[] }
  | { readonly kind: 'unavailable'; readonly reason: string };

export type PurchaseResult =
  | { readonly kind: 'purchased'; readonly purchaseToken: string }
  | { readonly kind: 'pending' }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'unavailable'; readonly reason: string }
  | { readonly kind: 'failed'; readonly reason: string };

export interface PlayBilling {
  products(productId: string): Promise<ProductsResult>;
  purchase(productId: string, offerToken: string, accountId: string): Promise<PurchaseResult>;
}

const reasonOf = (e: unknown): string => {
  const x = e as { code?: unknown; message?: unknown } | null;
  return String(x?.code ?? x?.message ?? e);
};

/** The plans Play offers for the product, or `unavailable`. Nothing in between. */
export function parseProducts(raw: unknown): ProductsResult {
  const plans = (raw as { plans?: unknown } | null)?.plans;
  if (!Array.isArray(plans)) return { kind: 'unavailable', reason: 'no plans' };
  const out: PlayPlan[] = [];
  for (const p of plans as Record<string, unknown>[]) {
    const basePlanId = p.basePlanId as BasePlan;
    if (!BASE_PLANS.includes(basePlanId)) continue;
    let pricePaise: Paise;
    try {
      pricePaise = paiseFromMicros(p.priceAmountMicros as number);
    } catch {
      // A price that is not whole paise is not shown at all: never a figure he will not pay.
      return { kind: 'unavailable', reason: 'malformed price' };
    }
    if (typeof p.offerToken !== 'string' || p.offerToken === '') {
      return { kind: 'unavailable', reason: 'no offer token' };
    }
    out.push({
      basePlanId,
      offerToken: p.offerToken,
      pricePaise,
      formattedPrice: String(p.formattedPrice ?? ''),
      billingPeriod: String(p.billingPeriod ?? ''),
    });
  }
  return out.length > 0 ? { kind: 'ready', plans: out } : { kind: 'unavailable', reason: 'no base plans' };
}

export function parsePurchase(raw: unknown): PurchaseResult {
  const r = raw as { outcome?: string; purchaseToken?: unknown; code?: unknown } | null;
  switch (r?.outcome) {
    case 'purchased':
      return typeof r.purchaseToken === 'string' && r.purchaseToken !== ''
        ? { kind: 'purchased', purchaseToken: r.purchaseToken }
        : { kind: 'failed', reason: 'purchased without a token' };
    case 'pending':
      return { kind: 'pending' };
    case 'cancelled':
      return { kind: 'cancelled' };
    case 'unavailable':
      return { kind: 'unavailable', reason: String(r.code ?? 'unavailable') };
    default:
      return { kind: 'failed', reason: String(r?.code ?? 'unknown') };
  }
}

/** `native` is `NativeModules.SwaftoBilling`, or undefined where there is none. */
export function playBilling(native: NativeBilling | undefined): PlayBilling {
  return {
    async products(productId) {
      if (!native) return { kind: 'unavailable', reason: 'no billing module' };
      try {
        return parseProducts(await native.productDetails(productId));
      } catch (e) {
        return { kind: 'unavailable', reason: reasonOf(e) };
      }
    },
    async purchase(productId, offerToken, accountId) {
      if (!native) return { kind: 'unavailable', reason: 'no billing module' };
      try {
        return parsePurchase(await native.purchase(productId, offerToken, accountId));
      } catch (e) {
        const reason = reasonOf(e);
        return reason === 'unavailable' ? { kind: 'unavailable', reason } : { kind: 'failed', reason };
      }
    },
  };
}
