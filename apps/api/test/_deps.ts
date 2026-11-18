/**
 * THE ONE BLOCK EVERY API SPEC USED TO PASTE: an in-memory repo, the stub SMS port, the in-memory
 * OTP store, a clock, a signing key, and the REAL rate limiter over an in-memory table (only its
 * storage is substituted). Pass `over` for anything a spec needs to differ; `now` also drives the
 * limiter's clock, so a spec that moves a clock moves both.
 */
import type { AppDeps } from '../src/app.ts';
import { memoryRepo } from '../src/db/memory.ts';
import { memoryOtpStore } from '../src/auth/routes.ts';
import { memorySql } from '../src/rate-limit/memory-sql.ts';
import { RateLimiter } from '../src/rate-limit/store.ts';
import { StubSmsPort } from '../src/sms/stub.ts';

export const KEY = 'test-signing-key-at-least-32-chars!!';
export const T0 = '2026-09-19T08:00:00.000Z';

export function testDeps(over: Partial<AppDeps> = {}): AppDeps {
  const now = over.now ?? (() => T0);
  const signingKey = over.signingKey ?? KEY;
  return {
    repo: memoryRepo(),
    sms: new StubSmsPort(),
    otp: memoryOtpStore(),
    now,
    signingKey,
    rate: new RateLimiter(memorySql(), { secret: signingKey, now: () => new Date(now()) }),
    ...over,
  };
}
