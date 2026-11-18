/**
 * F-23: the privacy policy and the deletion page were files nothing served.
 * Play needs both reachable; the app's About screen links them. Asked of the
 * real app over `inject`, and the paths come from the APP's own constants, so a
 * renamed route breaks here and not on a shopkeeper's phone.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildApp } from '../src/app.ts';
import { memoryRepo } from '../src/db/memory.ts';
import { memoryOtpStore } from '../src/auth/routes.ts';
import { memorySql } from '../src/rate-limit/memory-sql.ts';
import { RateLimiter } from '../src/rate-limit/store.ts';
import { StubSmsPort } from '../src/sms/stub.ts';
import { API_BASE_URL, WEB_PAGE_URLS } from '../../mobile/src/platform/endpoint.ts';

const KEY = 'test-signing-key-at-least-32-chars!!';
const app = buildApp({
  repo: memoryRepo(),
  sms: new StubSmsPort(),
  otp: memoryOtpStore(),
  now: () => '2026-10-25T08:00:00.000Z',
  signingKey: KEY,
  rate: new RateLimiter(memorySql(), { secret: KEY }),
});

const FILE = {
  privacy: '../../web/legal/privacy.html',
  terms: '../../web/legal/terms.html',
  licences: '../../web/legal/licences.html',
  deleteAccount: '../../web/delete-account/index.html',
} as const;

describe('F-23 - the public pages are served from the API origin', () => {
  for (const [name, url] of Object.entries(WEB_PAGE_URLS) as [keyof typeof FILE, string][]) {
    it(name + ' - with no token, as HTML, byte for byte the file', async () => {
      expect(url.startsWith(API_BASE_URL + '/')).toBe(true);
      const res = await app.inject({ method: 'GET', url: url.slice(API_BASE_URL.length) });
      expect(res.statusCode).toBe(200);
      expect(String(res.headers['content-type'])).toContain('text/html');
      expect(res.body).toBe(readFileSync(new URL(FILE[name], import.meta.url), 'utf8'));
    });
  }

  it('the CSP stays default-src none and allows each inline block by hash only', async () => {
    const res = await app.inject({ method: 'GET', url: '/delete-account' });
    const csp = String(res.headers['content-security-policy']);
    expect(csp.startsWith("default-src 'none'")).toBe(true);
    expect(csp).not.toContain('unsafe-inline');
    const script = /<script>([\s\S]*?)<\/script>/.exec(res.body)![1]!;
    expect(csp).toContain("'sha256-" + createHash('sha256').update(script).digest('base64') + "'");
    expect(csp).toContain("connect-src 'self'"); // the page posts to /v1/deletion/*
  });

  it('every other response keeps the API CSP', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['content-security-policy']).toBe("default-src 'none'; frame-ancestors 'none'");
  });
});
