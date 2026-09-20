/**
 * THE PAGE MUST NOT PROMISE WHAT THE API DOES NOT DO.
 *
 * This page is read by a shopkeeper who has already uninstalled the app and by
 * a Google Play reviewer deciding whether the submission is compliant. Both
 * take its words as commitments. A page that says "30 days" against an API
 * that erases immediately is worse than no page: it is a written promise the
 * system breaks.
 *
 * So the checks below compare the PAGE against the SYSTEM rather than against
 * an idea of what the page should say - the grace period comes from the value
 * registry, the paths from the routes the app actually registers, and the
 * grievance address from the notice the API serves.
 *
 * WHAT IT CANNOT CHECK. Whether the Odia reads well: that is H13 and a native
 * reader, exactly as for the app's own strings.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DELETION_GRACE_DAYS } from '@swafto/values';
import { buildApp } from '../../api/src/app.ts';
import { memoryRepo } from '../../api/src/db/memory.ts';
import { memoryOtpStore } from '../../api/src/auth/routes.ts';
import { memorySql } from '../../api/src/rate-limit/memory-sql.ts';
import { RateLimiter } from '../../api/src/rate-limit/store.ts';
import { StubSmsPort } from '../../api/src/sms/stub.ts';

const PAGE = readFileSync(new URL('../delete-account/index.html', import.meta.url), 'utf8');

/**
 * The page with its comments removed.
 *
 * The prose in this file explains why it does not touch `localStorage` and why
 * it never says "no such account" - and a naive substring scan finds those very
 * words in the explanation. Stripping comments first makes the scan mean what
 * it says: it is asking about the CODE, and a real call can no longer hide
 * behind a comment either.
 */
const CODE = PAGE.replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** The real app, only so its real routes can be asked for by name. */
const KEY = 'test-signing-key-at-least-32-chars!!';
const app = buildApp({
  repo: memoryRepo(),
  sms: new StubSmsPort(),
  otp: memoryOtpStore(),
  now: () => '2026-09-21T08:00:00.000Z',
  signingKey: KEY,
  rate: new RateLimiter(memorySql(), { secret: KEY }),
});

describe('the deletion page meets the Play requirement', () => {
  it('works with no app and no sign-in: it asks only for the number', () => {
    // Nothing on this page asks for a password, a token or an installed app.
    expect(PAGE).toMatch(/type="tel"/);
    expect(PAGE.toLowerCase()).not.toContain('password');
    expect(PAGE).toContain('You do not need the app installed');
  });

  it('verifies identity, and says the code is not a sign-in code', () => {
    expect(PAGE).toContain('/v1/deletion/request');
    expect(PAGE).toContain('/v1/deletion/confirm');
    expect(PAGE).toContain('it will not sign you in');
  });

  it('says what is deleted AND what is kept, with a period for each', () => {
    expect(PAGE).toContain('What is deleted');
    expect(PAGE).toContain('What is kept, and for how long');
    // The backup window the API's own message states.
    expect(PAGE).toContain('90 days');
  });

  it('requires the literal word, exactly as the route does', () => {
    expect(PAGE).toContain("confirm !== 'DELETE'");
  });
});

describe('the page and the system say the same thing', () => {
  it('the grace period on the page IS the registry value', () => {
    /*
     * The one number on this page that a shopkeeper will act on. If the policy
     * changes and this line is not changed with it, this test fails - which is
     * the only reason the number is allowed to be written here at all.
     */
    expect(PAGE).toContain(String(DELETION_GRACE_DAYS) + ' days to change your mind');
  });

  it('both paths it posts to are routes the API actually registers', async () => {
    for (const path of ['/v1/deletion/request', '/v1/deletion/confirm']) {
      const res = await app.inject({
        method: 'POST',
        url: path,
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({}),
      });
      /*
       * 400 means the route exists and refused an empty body. 404 would mean
       * the page posts into thin air, and 401 would mean it needs the session
       * a page like this cannot have.
       */
      expect(res.statusCode, path).toBe(400);
    }
  });

  it('the grievance address is the one the notice publishes', async () => {
    const notice = JSON.parse((await app.inject({ method: 'GET', url: '/v1/legal/notice' })).body);
    expect(PAGE).toContain(notice.fiduciary.email);
  });

  it('it promises a cancellation the system can actually perform', () => {
    // `cancelDeletion` exists and sign-in calls it; the page may say so.
    expect(PAGE).toContain('the deletion is cancelled');
  });
});

describe('the page cannot leak the person reading it', () => {
  it('loads nothing from anywhere else - no script, style or font off-site', () => {
    const external = [...PAGE.matchAll(/(?:src|href)\s*=\s*"([^"]+)"/g)]
      .map((m) => m[1]!)
      .filter((u) => !u.startsWith('mailto:') && !u.startsWith('#'));
    expect(external).toEqual([]);
  });

  it('stores nothing on the device and sends no cookie', () => {
    for (const forbidden of ['localStorage', 'sessionStorage', 'document.cookie', 'indexedDB']) {
      expect(CODE, forbidden).not.toContain(forbidden);
    }
    expect(CODE).toContain("credentials: 'omit'");
  });

  it('never puts the phone number in a URL, where it would reach a log', () => {
    /*
     * A number in a query string lands in access logs, referrers and browser
     * history. Both calls are POSTs with the number in the body.
     */
    expect(PAGE).not.toMatch(/\/v1\/deletion\/\w+\?/);
    expect(PAGE).toContain("method: 'POST'");
  });

  it('answers a stranger and an account holder with the same words', () => {
    expect(CODE).toContain('If that number has an account');
    expect(CODE.toLowerCase()).not.toContain('no such account');
    expect(CODE.toLowerCase()).not.toContain('not registered');
  });
});

describe('the page is readable by the people who need it', () => {
  it('offers all three languages, and each covers every string on the page', () => {
    const keys = [...new Set([...PAGE.matchAll(/data-t="([a-zA-Z0-9]+)"/g)].map((m) => m[1]!))];
    expect(keys.length).toBeGreaterThan(10);

    for (const lang of ['hi', 'od']) {
      const block = new RegExp(lang + ':\\s*\\{([\\s\\S]*?)\\n        \\},?').exec(PAGE);
      expect(block, lang).toBeTruthy();
      for (const key of keys) {
        expect(block![1], lang + '.' + key).toContain(key + ':');
      }
    }
  });

  it('is sized for the hands it is built for - the app floors, restated here', () => {
    // 17px body and 56px targets: the same figures the app's registry fixes.
    expect(PAGE).toContain('font-size: 17px');
    expect(PAGE).toContain('min-height: 56px');
  });

  it('marks the Hindi and Odia copy as the draft it is', () => {
    expect(PAGE).toContain('DRAFT');
    expect(PAGE).toContain('H13');
  });
});
