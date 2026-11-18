/**
 * THE DEV SERVER'S APP, WITHOUT ITS SIDE EFFECTS - so a test can build exactly
 * what `tools/dev-server.mjs` serves, without a database or a port.
 *
 * DEVELOPMENT ONLY. `apps/api/src/server.ts` remains the only production entry.
 *
 * HT-36: the dev server used to call `buildApp` without `billing`, so every
 * `/v1/billing/*` route answered 503 and S10 never offered the 14-day preview
 * on the documented rig. Billing is wired here as production wires it, with
 * Google left out (`play: null`, `keys: null`): the preview works, buying stays
 * closed, and no Play credential is needed or read from the tree.
 */
import { buildApp, type AppDeps } from '../apps/api/src/app.ts';
import { loadBillingConfig } from '../apps/api/src/config.ts';
import { RateLimiter, type SqlRunner } from '../apps/api/src/rate-limit/store.ts';
import type { BillingRepo } from '../apps/api/src/billing/repo.ts';

export interface DevAppDeps {
  readonly repo: AppDeps['repo'];
  readonly billingRepo: BillingRepo;
  readonly sql: SqlRunner;
  readonly sms: AppDeps['sms'];
  readonly otp: AppDeps['otp'];
  readonly signingKey: string;
  readonly rateLimitKey: string;
}

export function devApp(deps: DevAppDeps): ReturnType<typeof buildApp> {
  return buildApp({
    repo: deps.repo,
    sms: deps.sms,
    otp: deps.otp,
    now: () => new Date().toISOString(),
    signingKey: deps.signingKey,
    rate: new RateLimiter(deps.sql, { secret: deps.rateLimitKey }),
    billing: { repo: deps.billingRepo, config: loadBillingConfig(), play: null, keys: null },
  });
}
