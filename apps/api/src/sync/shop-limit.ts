/**
 * BE-15 / RT-5 · A PER-SHOP TOKEN BUCKET on the authenticated routes that cost real
 * work: `POST /v1/sync/push` and the read routes.
 *
 * WHY IN-PROCESS, AND WHAT THAT MEANS. The OTP limiter (`rate-limit/`) is a Postgres
 * table because an OTP flood is an SMS bill and must hold across instances. This is
 * the opposite: a ceiling that protects one process's event loop and one database
 * pool from one runaway client (a retry loop, a polling bug, a hostile token), and
 * a Postgres round trip per request would cost more than what it guards. So each
 * instance keeps its own buckets: with N instances a shop may do up to N times the
 * rate, which is still a bound. State is a bounded LRU of shops and is lost on
 * restart, which only ever loosens the limit for a moment - never locks anyone out.
 *
 * IT CAN NEVER LOCK A SHOPKEEPER OUT OF HIS OWN BOOK (the ledger is on the phone).
 * A 429 carries `Retry-After`, the client already honours it as a floor on its next
 * drain (`net/backoff.ts`), and the outbox keeps every row. The only cost of being
 * limited is a later sync.
 *
 * THE DEFAULTS ARE REVERSIBLE AND NOT MEASURED AGAINST REAL USERS. They are set
 * well above anything the app does (client.ts drains single-flight on a store
 * revision and every 30 s while rows are pending; a backlog chunk loop sends a few
 * requests back to back) and well below a loop. Change them here.
 */
import type { preHandlerAsyncHookHandler } from 'fastify';
import { shopOf } from '../app.ts';

export interface ShopLimitSpec {
  /** Bucket size: how many requests may arrive at once. */
  readonly burst: number;
  /** Sustained rate once the burst is spent. */
  readonly refillPerSecond: number;
}

export const DEFAULT_SHOP_LIMITS = {
  // 120 a minute sustained, 20 at once (a backlog of 20 full chunks is 20,000 rows).
  push: { burst: 20, refillPerSecond: 2 },
  // 60 a minute, 10 at once. No screen reads these today; one that polled would be slower.
  read: { burst: 10, refillPerSecond: 1 },
  // The whole-ledger export and the party redaction (which clears the shop's memo): 2 at once, then 1 per 10 s.
  heavy: { burst: 2, refillPerSecond: 0.1 },
} as const satisfies Record<string, ShopLimitSpec>;

export type ShopDecision = { readonly allowed: true } | { readonly allowed: false; readonly retryAfterSeconds: number };

export class ShopLimiter {
  readonly #spec: ShopLimitSpec;
  readonly #now: () => number;
  readonly #maxShops: number;
  /** shopId -> [tokens, last refill ms]. Insertion order is recency order. */
  readonly #buckets = new Map<string, [number, number]>();

  constructor(spec: ShopLimitSpec, opts: { now?: () => number; maxShops?: number } = {}) {
    if (!(spec.burst >= 1) || !(spec.refillPerSecond > 0)) throw new Error('a shop limit needs burst >= 1 and a positive refill rate');
    this.#spec = spec;
    this.#now = opts.now ?? (() => performance.now());
    this.#maxShops = opts.maxShops ?? 50_000;
  }

  take(shopId: string): ShopDecision {
    const t = this.#now();
    const found = this.#buckets.get(shopId);
    let tokens = this.#spec.burst;
    if (found) {
      tokens = Math.min(this.#spec.burst, found[0] + ((t - found[1]) / 1000) * this.#spec.refillPerSecond);
      this.#buckets.delete(shopId);
    } else if (this.#buckets.size >= this.#maxShops) {
      const oldest = this.#buckets.keys().next().value;
      if (oldest !== undefined) this.#buckets.delete(oldest);
    }
    if (tokens >= 1) {
      this.#buckets.set(shopId, [tokens - 1, t]);
      return { allowed: true };
    }
    this.#buckets.set(shopId, [tokens, t]);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((1 - tokens) / this.#spec.refillPerSecond)) };
  }
}

/**
 * A `preHandler` for one route (route-level hooks run after the app-wide
 * authentication hook, so `shopOf` always has claims). `false` switches it off.
 */
export function shopLimitHook(
  spec: ShopLimitSpec | false | undefined,
  fallback: ShopLimitSpec,
): preHandlerAsyncHookHandler | undefined {
  if (spec === false) return undefined;
  const limiter = new ShopLimiter(spec ?? fallback);
  return async (req, reply) => {
    const d = limiter.take(shopOf(req));
    if (d.allowed) return;
    reply.header('Retry-After', String(d.retryAfterSeconds));
    await reply.code(429).send({
      error: 'rate_limited',
      message: 'too many requests from this shop, try again shortly',
      retryAfterSeconds: d.retryAfterSeconds,
      requestId: req.id,
    });
  };
}

/**
 * THE THREE BUCKETS, BUILT ONCE PER APP. Every route that names `heavy` gets the same hook, so
 * the export and the party redaction really do draw on one budget per shop.
 */
export function makeShopLimitHooks(specs: {
  readonly push?: ShopLimitSpec | false;
  readonly read?: ShopLimitSpec | false;
  readonly heavy?: ShopLimitSpec | false;
} = {}) {
  return {
    push: shopLimitHook(specs.push, DEFAULT_SHOP_LIMITS.push),
    read: shopLimitHook(specs.read, DEFAULT_SHOP_LIMITS.read),
    heavy: shopLimitHook(specs.heavy, DEFAULT_SHOP_LIMITS.heavy),
  };
}
export type ShopLimitHooks = ReturnType<typeof makeShopLimitHooks>;
