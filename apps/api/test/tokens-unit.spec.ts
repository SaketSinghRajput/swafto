/**
 * SESSION TOKENS, EVERY REFUSAL. The route tests only reach the branches a request can
 * reach; a bearer credential's verifier has more doors than that, and each one is a way
 * a forged or stale token could be accepted if somebody edits the check.
 */
import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { TokenInvalid, assertSigningKey, hashOtp, mintOtp, mintToken, verifyToken } from '../src/auth/tokens.ts';

const KEY = 'test-signing-key-at-least-32-chars!!';
const NOW = 1_800_000_000;
const base = { sub: 'u', shop: 's', dev: 'd', typ: 'access' as const, nowSeconds: NOW, ttlSeconds: 600 };

/** A token with ANY payload, signed correctly: only the claim checks can refuse it. */
const signed = (payload: object, key = KEY): string => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return body + '.' + createHmac('sha256', key).update(body).digest('base64url');
};
const claims = { sub: 'u', shop: 's', dev: 'd', typ: 'access', iat: NOW, exp: NOW + 600 };

const refusal = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(TokenInvalid);
    // The message the client could ever see is generic; the reason is for our records.
    expect((e as Error).message).toBe('token rejected');
    return (e as TokenInvalid).reason;
  }
  throw new Error('the token was accepted');
};

describe('mintToken', () => {
  it('round-trips, and carries no personal data', () => {
    const t = mintToken(KEY, base);
    expect(verifyToken(KEY, t, 'access', NOW + 1)).toMatchObject({ sub: 'u', shop: 's', dev: 'd', typ: 'access', iat: NOW, exp: NOW + 600 });
    expect(Buffer.from(t.split('.')[0]!, 'base64url').toString()).not.toMatch(/phone|name/i);
  });

  it.each([
    ['fractional now', { nowSeconds: 1.5 }, /whole seconds/],
    ['fractional ttl', { ttlSeconds: 0.5 }, /whole seconds/],
    ['zero ttl', { ttlSeconds: 0 }, /already expired/],
    ['negative ttl', { ttlSeconds: -5 }, /already expired/],
    ['fractional generation', { gen: 1.5 }, /generation/],
    ['negative generation', { gen: -1 }, /generation/],
  ])('refuses to mint: %s', (_n, over, msg) => {
    expect(() => mintToken(KEY, { ...base, ...over })).toThrow(msg);
  });

  it('refuses a short signing key at mint and at verify', () => {
    expect(() => mintToken('short', base)).toThrow(/32 characters/);
    expect(() => verifyToken('short', 'a.b', 'access', NOW)).toThrow(/32 characters/);
    expect(() => assertSigningKey(undefined as unknown as string)).toThrow();
  });
});

describe('verifyToken refuses, and says why in the record', () => {
  it.each([
    ['a non-string', 42, 'not a string'],
    ['an empty string', '', 'not a string'],
    ['no dot', 'abcdef', 'malformed'],
    ['a leading dot', '.abc', 'malformed'],
    ['two dots', 'a.b.c', 'malformed'],
  ])('%s', (_n, token, reason) => {
    expect(refusal(() => verifyToken(KEY, token, 'access', NOW))).toBe(reason);
  });

  it('a signature of the wrong length, and a right-length wrong one', () => {
    const t = mintToken(KEY, base);
    const [body] = t.split('.');
    expect(refusal(() => verifyToken(KEY, body + '.AAAA', 'access', NOW))).toBe('bad signature length');
    const flipped = t.slice(0, -1) + (t.endsWith('A') ? 'B' : 'A');
    expect(refusal(() => verifyToken(KEY, flipped, 'access', NOW))).toBe('bad signature');
    expect(refusal(() => verifyToken('another-key-that-is-32-chars-long!!!', t, 'access', NOW))).toBe('bad signature');
  });

  it('a validly signed body that is not JSON', () => {
    const body = Buffer.from('{not json').toString('base64url');
    const t = body + '.' + createHmac('sha256', KEY).update(body).digest('base64url');
    expect(refusal(() => verifyToken(KEY, t, 'access', NOW))).toBe('unreadable payload');
  });

  it('the wrong type: a refresh token is not an access token and the reverse', () => {
    const refresh = mintToken(KEY, { ...base, typ: 'refresh' });
    expect(refusal(() => verifyToken(KEY, refresh, 'access', NOW))).toBe('wrong token type: refresh');
    expect(refusal(() => verifyToken(KEY, mintToken(KEY, base), 'refresh', NOW))).toBe('wrong token type: access');
  });

  it.each([
    ['fractional exp', { ...claims, exp: NOW + 0.5 }, 'non-integer times'],
    ['string iat', { ...claims, iat: String(NOW) }, 'non-integer times'],
    ['expired exactly now', { ...claims, exp: NOW }, 'expired'],
    ['issued more than a minute ahead', { ...claims, iat: NOW + 61, exp: NOW + 900 }, 'issued in the future'],
    ['no sub', { ...claims, sub: '' }, 'incomplete claims'],
    ['no shop', { ...claims, shop: undefined }, 'incomplete claims'],
    ['no dev', { ...claims, dev: undefined }, 'incomplete claims'],
    ['fractional gen', { ...claims, gen: 0.5 }, 'bad generation'],
    ['negative gen', { ...claims, gen: -2 }, 'bad generation'],
    ['string gen', { ...claims, gen: '1' }, 'bad generation'],
  ])('%s', (_n, payload, reason) => {
    expect(refusal(() => verifyToken(KEY, signed(payload), 'access', NOW))).toBe(reason);
  });

  it('accepts the edges: a minute of clock skew, and the last second before expiry', () => {
    expect(verifyToken(KEY, signed({ ...claims, iat: NOW + 60 }), 'access', NOW).iat).toBe(NOW + 60);
    expect(verifyToken(KEY, signed({ ...claims, exp: NOW + 1 }), 'access', NOW).exp).toBe(NOW + 1);
    expect(verifyToken(KEY, signed({ ...claims, gen: 0 }), 'access', NOW).gen).toBe(0);
  });
});

describe('mintOtp and hashOtp', () => {
  it('produces the asked number of decimal digits, from the injected source when given one', () => {
    expect(mintOtp(6, () => 7)).toBe('777777');
    let n = 0;
    expect(mintOtp(4, () => n++)).toBe('0123');
    expect(mintOtp(8)).toMatch(/^[0-9]{8}$/);
  });

  it.each([3, 11, 6.5, NaN])('refuses %s digits', (d) => {
    expect(() => mintOtp(d)).toThrow(/outside anything sensible/);
  });

  it.each([10, -1, 2.5])('refuses a source that yields %s', (v) => {
    expect(() => mintOtp(4, () => v)).toThrow(/0-9/);
  });

  it('hashes the phone and the code together, under the key, and never returns the code', () => {
    const h = hashOtp(KEY, '+919876500001', '123456');
    expect(h).not.toContain('123456');
    expect(hashOtp(KEY, '+919876500001', '123456')).toBe(h);
    expect(hashOtp(KEY, '+919876500002', '123456')).not.toBe(h);
    expect(hashOtp(KEY, '+919876500001', '123457')).not.toBe(h);
    expect(hashOtp('a-different-key-of-32-characters!!', '+919876500001', '123456')).not.toBe(h);
  });
});
