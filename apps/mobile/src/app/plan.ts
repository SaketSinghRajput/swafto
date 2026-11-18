/**
 * THE ONE PREMIUM GATE (docs/research/R5-free-premium-plan.md).
 *
 * The plan is derived on the server from purchases and a preview grant and
 * arrives here as a value; it is never stored as a flag on the phone. Every
 * Premium screen asks this function, so the list of what Premium means lives in
 * one place.
 *
 * WHAT IS NEVER HERE: reading, export, correction, erasure, consent and closing
 * the day. Those are free in every plan, and a lapsed plan leaves Premium history
 * readable (R4 §7) - `readOnly` says so, it does not hide anything.
 */
export type Plan = 'free' | 'premium';

export const PREMIUM_FEATURES = [
  'items', // PR-1 items per sale
  'itemReports', // PR-2
  'forecast', // PR-3
  'comparisons', // PR-4
  'shopChat', // PR-5
  'dashboard', // PR-6
] as const;
export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];

/**
 * BETA (owner, 2026-11-11): every feature is free until the Free/Premium split
 * is finalised after beta testing. The gate below stays intact so switching
 * this off restores it; tests of the paid gate turn it off for their suite.
 * While it is on, buying stays closed, so no shop can hold a purchase.
 */
export const BETA = { allFree: true };

/** May this plan USE the feature (add to it, run it)? */
export function allows(plan: Plan, _feature: PremiumFeature): boolean {
  return BETA.allFree || plan === 'premium';
}

/** A Premium feature on a free plan still shows what was recorded under Premium. */
export function readOnly(plan: Plan, feature: PremiumFeature): boolean {
  return !allows(plan, feature);
}

/**
 * WHAT THE SERVER SAID, exactly as `GET /v1/billing/entitlement` sends it
 * (apps/api/src/billing/entitlement.ts). The phone keeps the last answer and
 * nothing else; it never decides the plan on its own evidence.
 */
export interface PlanAnswer {
  readonly entitlement: {
    readonly plan: Plan;
    readonly source: 'purchase' | 'preview' | null;
    /** Until when this answer holds. */
    readonly until: string | null;
    readonly renews: boolean;
    readonly basePlanId: string | null;
    readonly state: string | null;
    readonly previewAvailable: boolean;
    readonly previewEndsAt: string | null;
    readonly everPremium: boolean;
    readonly asOf: string;
  };
  /** What a purchase needs. Null while buying is not open on the server. */
  readonly buying: {
    readonly packageName: string;
    readonly productId: string;
    readonly accountId: string;
  } | null;
}

/**
 * THE PLAN THE SESSION HOLDS: the server's last answer, but never past the
 * time the server said it holds until.
 *
 * Offline for a week on a premium answer that expired on Tuesday is FREE from
 * Tuesday, until the server is asked again (R4 §2, "Offline client"). That is
 * the safe direction: a lapsed plan leaves every record readable, and the
 * server would refuse a Premium action anyway.
 */
export function planOf(answer: PlanAnswer | null, now: string): Plan {
  const e = answer?.entitlement;
  if (!e || e.plan !== 'premium' || e.until === null) return 'free';
  return Date.parse(now) < Date.parse(e.until) ? 'premium' : 'free';
}

/**
 * The two base plans R4-HA4 creates in Play Console, by these ids. The prices
 * are R5's decision (₹99 a month, ₹799 a year, GST included), shown until Play's
 * own product details are available; when they are, Play's price is shown,
 * because Play's is what is charged.
 */
export const BASE_PLANS = ['monthly', 'yearly'] as const;
export type BasePlan = (typeof BASE_PLANS)[number];
export const PREMIUM_PRICES: Readonly<Record<BasePlan, number>> = { monthly: 9900, yearly: 79900 };

/** Play's own subscription page for this product: where Cancel goes (R4 §5.4). */
export function playSubscriptionsUrl(productId: string | null, packageName = 'com.swafto'): string {
  const base = 'https://play.google.com/store/account/subscriptions';
  // Without a product id, Play's list of all his subscriptions - still one tap from Cancel.
  if (productId === null) return base;
  return base + '?sku=' + encodeURIComponent(productId) + '&package=' + encodeURIComponent(packageName);
}
