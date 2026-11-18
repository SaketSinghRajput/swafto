/**
 * HT-36 · THE DEV SERVER SERVES BILLING.
 *
 * `tools/dev-server.mjs` builds its app through `tools/dev-app.ts`; this
 * builds the same app over memory stores (the dev server's own needs Postgres
 * and a port) and asks it for the plan. Before the fix the dev app had no
 * `billing`, so the route answered 503 and S10 never offered the preview.
 */
import { describe, it, expect } from 'vitest';
import { devApp } from '../../../tools/dev-app.ts';
import { memoryRepo } from '../src/db/memory.ts';
import { memoryBillingRepo } from '../src/billing/repo.ts';
import { memorySql } from '../src/rate-limit/memory-sql.ts';
import { memoryOtpStore } from '../src/auth/routes.ts';
import { StubSmsPort } from '../src/sms/stub.ts';
import { NOTICE_VERSION } from '../src/dpdp/routes.ts';

const KEY = 'dev-server-test-signing-key-32-chars!!';

describe('HT-36 · the dev server app', () => {
  it('answers /v1/billing/entitlement and starts the 14-day preview', async () => {
    const sms = new StubSmsPort();
    const app = devApp({
      repo: memoryRepo(),
      billingRepo: memoryBillingRepo(),
      sql: memorySql(),
      sms,
      otp: memoryOtpStore(),
      signingKey: KEY,
      rateLimitKey: KEY,
    });
    const phone = '+919000000036';
    await app.inject({
      method: 'POST',
      url: '/v1/auth/otp/request',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ phone, language: 'en' }),
    });
    const code = sms.forPhone(phone).at(-1)!.variables[0]!;
    const signedIn = await app.inject({
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
    expect(signedIn.statusCode).toBe(200);
    const auth = { authorization: 'Bearer ' + (JSON.parse(signedIn.body) as { accessToken: string }).accessToken };

    const plan = await app.inject({ method: 'GET', url: '/v1/billing/entitlement', headers: auth });
    expect(plan.statusCode).toBe(200);
    expect(JSON.parse(plan.body).entitlement).toMatchObject({ plan: 'free', previewAvailable: true });

    const preview = await app.inject({
      method: 'POST',
      url: '/v1/billing/preview',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: '{}',
    });
    expect(preview.statusCode).toBe(200);
    expect(JSON.parse(preview.body)).toMatchObject({ started: true, entitlement: { plan: 'premium' } });
  });
});
