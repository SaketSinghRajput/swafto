/**
 * PR-7 · WHETHER A SHOP IS ON PREMIUM, DERIVED ON READ. Nothing stores the answer.
 *
 * The inputs are facts: every answer Google gave about each purchase token
 * bound to the shop, and the preview grant if there ever was one. The output is
 * computed from them and the clock each time it is asked. Ask after a preview's
 * end and the same rows give 'free'; no job has to run, and no flag can be left on.
 *
 * THE RULE, from Google's lifecycle page (R4 §1.5;
 * developer.android.com/google/play/billing/lifecycle/subscriptions):
 *
 *   ACTIVE, IN_GRACE_PERIOD, CANCELED  premium until `expiryTime`. Google extends
 *                                      `expiryTime` through a grace period, and a
 *                                      cancelled plan keeps access to it - taking
 *                                      it away early breaks Play's policy.
 *   ON_HOLD                            not premium: access is blocked on account
 *                                      hold (Google also sets expiryTime to the past).
 *   anything else                      not premium (pending, paused, expired).
 *
 * The preview is its own grant: premium while `now < ends_at`, then nothing
 * converts and nothing is charged (R4 §5.3).
 */
import { createHmac } from 'node:crypto';
import type { SubscriptionState } from '@swafto/schema';

/** R5: "a 14-day server-granted Premium preview". A decision, not a measurement. */
export const PREVIEW_DAYS = 14;

const ENTITLING: ReadonlySet<SubscriptionState> = new Set([
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
  'SUBSCRIPTION_STATE_CANCELED',
]);

/** One answer Google gave about one token. Append-only; the latest counts. */
export interface PurchaseState {
  readonly purchaseToken: string;
  readonly googleState: SubscriptionState;
  readonly expiresAt: string | null;
  readonly autoRenewing: boolean;
  readonly basePlanId: string | null;
  readonly acknowledged: boolean;
  readonly fetchedAt: string;
}

export interface Preview {
  readonly startedAt: string;
  readonly endsAt: string;
}

/** What GET /v1/billing/entitlement answers. The phone caches it as given. */
export interface Entitlement {
  readonly plan: 'free' | 'premium';
  /** Which grant makes it premium. Null on free. */
  readonly source: 'purchase' | 'preview' | null;
  /** Until when this answer holds. Past it the phone treats the plan as free until it asks again. */
  readonly until: string | null;
  /** A purchase that renews by itself at `until`. False for a preview and for a cancelled plan. */
  readonly renews: boolean;
  readonly basePlanId: string | null;
  /** Google's state of the purchase this answer rests on, for the screen's wording. */
  readonly state: SubscriptionState | null;
  /** True until a preview has been taken. One per shop, ever. */
  readonly previewAvailable: boolean;
  readonly previewEndsAt: string | null;
  /** Has this shop ever had Premium? On lapse, S10 says its history stays readable. */
  readonly everPremium: boolean;
  readonly asOf: string;
}

const t = (iso: string) => Date.parse(iso);

/** The latest answer for each token. On a tie, the one appended later wins. */
export function latestPerToken(states: readonly PurchaseState[]): PurchaseState[] {
  const latest = new Map<string, PurchaseState>();
  for (const s of states) {
    const prev = latest.get(s.purchaseToken);
    if (!prev || t(s.fetchedAt) >= t(prev.fetchedAt)) latest.set(s.purchaseToken, s);
  }
  return [...latest.values()];
}

export function entitles(s: PurchaseState, now: string): boolean {
  return ENTITLING.has(s.googleState) && s.expiresAt !== null && t(now) < t(s.expiresAt);
}

export function entitlementOf(
  input: { readonly states: readonly PurchaseState[]; readonly preview: Preview | null },
  now: string,
): Entitlement {
  const latest = latestPerToken(input.states);
  // The purchase that runs longest, if several do: an upgrade leaves the old token briefly live.
  const live = latest
    .filter((s) => entitles(s, now))
    .sort((a, b) => t(b.expiresAt!) - t(a.expiresAt!))[0];
  const newest = [...latest].sort((a, b) => t(b.fetchedAt) - t(a.fetchedAt))[0];
  const shown = live ?? newest;
  const preview = input.preview;

  const common = {
    basePlanId: shown?.basePlanId ?? null,
    state: shown?.googleState ?? null,
    previewAvailable: preview === null,
    previewEndsAt: preview?.endsAt ?? null,
    everPremium: preview !== null || input.states.some((s) => ENTITLING.has(s.googleState)),
    asOf: now,
  };

  if (live) {
    return {
      ...common,
      plan: 'premium',
      source: 'purchase',
      until: live.expiresAt,
      renews: live.autoRenewing && live.googleState !== 'SUBSCRIPTION_STATE_CANCELED',
    };
  }
  if (preview !== null && t(now) < t(preview.endsAt)) {
    return { ...common, plan: 'premium', source: 'preview', until: preview.endsAt, renews: false };
  }
  return { ...common, plan: 'free', source: null, until: null, renews: false };
}

/** The preview's end: `PREVIEW_DAYS` whole days after it starts. */
export function previewEnd(startedAt: string): string {
  return new Date(t(startedAt) + PREVIEW_DAYS * 86_400_000).toISOString();
}

/**
 * `obfuscatedAccountId` for a shop: HMAC-SHA256 under a server secret, base64url
 * (43 characters, inside Play's 64). Google uses it for fraud signals; the
 * server checks it on verify, so a token bought for one shop cannot be redeemed
 * by another (R4 §2). Never the shop id itself.
 */
export function accountIdFor(key: string, shopId: string): string {
  return createHmac('sha256', key).update('swafto-play-account:' + shopId).digest('base64url');
}
