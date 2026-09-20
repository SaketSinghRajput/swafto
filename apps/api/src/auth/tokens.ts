/**
 * SESSION TOKENS. HMAC-SHA256 over a compact claim set, and nothing else.
 *
 * WHY NOT A JWT LIBRARY. The JWT format's own history is the argument: `alg: none`,
 * algorithm confusion between HMAC and RSA, and a decade of libraries that verified
 * a signature whose algorithm the ATTACKER chose. Every one of those is a
 * vulnerability in the negotiation rather than in the cryptography. This never
 * negotiates: one algorithm, named here, never read from the token, so the whole
 * class cannot occur. It is also forty lines against a dependency and its
 * transitive tree, in a codebase that holds financial records.
 *
 * WHAT A TOKEN IS. `base64url(payload) . base64url(hmac)`. The payload is JSON with
 * six short claims and NO personal data - no phone number, no name, no shop name. A
 * token is a bearer credential, and bearer credentials end up in logs, proxies and
 * crash reports; one carrying a phone number turns every one of those into a
 * disclosure. Ids only, and ids that mean nothing outside this database.
 *
 * `typ` IS CHECKED, NOT DECORATION. A refresh token presented as an access token is
 * a real and common privilege escalation: refresh tokens are long-lived and widely
 * stored, so accepting one at an API boundary quietly extends a long credential's
 * authority over everything. `verifyToken` takes the type it expects and refuses
 * anything else.
 *
 * COMPARISON IS CONSTANT TIME. `===` on a signature leaks, through timing, how much
 * of a forged signature was right, which is enough to build one byte by byte.
 */
import { createHmac, timingSafeEqual, randomInt, randomUUID } from 'node:crypto';

export type TokenType = 'access' | 'refresh';

export interface Claims {
  /** The user this token speaks for. */
  readonly sub: string;
  /** The shop whose ledger it may touch. Authorisation is per-shop, always. */
  readonly shop: string;
  /** The device it was issued to, so one device can be revoked without the rest. */
  readonly dev: string;
  readonly typ: TokenType;
  /** Unix seconds. Integers, because a float here is a clock nobody agreed on. */
  readonly iat: number;
  readonly exp: number;
}

export class TokenInvalid extends Error {
  readonly reason: string;
  constructor(reason: string) {
    // The MESSAGE is generic on purpose; the REASON is for our records, not the client.
    super('token rejected');
    this.name = 'TokenInvalid';
    this.reason = reason;
  }
}

/**
 * The signing key must be long enough to make offline forgery hopeless. Sixteen
 * characters is the floor the rate limiter enforces for its bucket key; this key is
 * strictly more valuable than that one, so the floor is higher.
 */
export function assertSigningKey(secret: string): void {
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error(
      'the session signing key must be at least 32 characters. Anything shorter can ' +
        'be searched offline, and a forged token here is a full account takeover of a ' +
        "shopkeeper's financial records.",
    );
  }
}

const b64url = (buf: Buffer): string => buf.toString('base64url');

const sign = (secret: string, body: string): Buffer =>
  createHmac('sha256', secret).update(body).digest();

export function mintToken(
  secret: string,
  input: {
    sub: string;
    shop: string;
    dev: string;
    typ: TokenType;
    nowSeconds: number;
    ttlSeconds: number;
  },
): string {
  assertSigningKey(secret);
  if (!Number.isInteger(input.nowSeconds) || !Number.isInteger(input.ttlSeconds)) {
    throw new Error('token times are whole seconds');
  }
  if (input.ttlSeconds <= 0) throw new Error('a token that is already expired is not a token');

  const claims: Claims = {
    sub: input.sub,
    shop: input.shop,
    dev: input.dev,
    typ: input.typ,
    iat: input.nowSeconds,
    exp: input.nowSeconds + input.ttlSeconds,
  };
  const body = b64url(Buffer.from(JSON.stringify(claims), 'utf8'));
  return body + '.' + b64url(sign(secret, body));
}

export function verifyToken(
  secret: string,
  token: unknown,
  expected: TokenType,
  nowSeconds: number,
): Claims {
  assertSigningKey(secret);
  if (typeof token !== 'string' || token.length === 0) throw new TokenInvalid('not a string');

  const dot = token.indexOf('.');
  if (dot <= 0 || dot !== token.lastIndexOf('.')) throw new TokenInvalid('malformed');

  const body = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1), 'base64url');
  const wanted = sign(secret, body);

  /*
   * Length is compared first because timingSafeEqual THROWS on a length mismatch,
   * and an exception thrown before the comparison is itself a timing signal. The
   * length of an HMAC-SHA256 digest is public, so leaking it costs nothing.
   */
  if (given.length !== wanted.length) throw new TokenInvalid('bad signature length');
  if (!timingSafeEqual(given, wanted)) throw new TokenInvalid('bad signature');

  let claims: Claims;
  try {
    claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Claims;
  } catch {
    throw new TokenInvalid('unreadable payload');
  }

  // Only reached with a VALID signature, so these check our own output.
  if (claims.typ !== expected) throw new TokenInvalid('wrong token type: ' + String(claims.typ));
  if (!Number.isInteger(claims.exp) || !Number.isInteger(claims.iat)) {
    throw new TokenInvalid('non-integer times');
  }
  if (claims.exp <= nowSeconds) throw new TokenInvalid('expired');
  if (claims.iat > nowSeconds + 60) throw new TokenInvalid('issued in the future');
  if (!claims.sub || !claims.shop || !claims.dev) throw new TokenInvalid('incomplete claims');

  return claims;
}

/**
 * A one-time code, uniformly distributed over its digit space.
 *
 * `Math.random()` is not used, and the reason is not theoretical: V8's PRNG state is
 * recoverable from a handful of outputs, so somebody who has requested a few codes
 * could predict the next one and take over an account they never touched.
 * `randomInt` also rejection-samples, so the low digits are not slightly likelier
 * than the high ones - a bias small enough to ignore and free to avoid.
 */
export function mintOtp(digits: number, digit: () => number = () => randomInt(0, 10)): string {
  if (!Number.isInteger(digits) || digits < 4 || digits > 10) {
    throw new Error('an OTP of ' + String(digits) + ' digits is outside anything sensible');
  }
  let out = '';
  for (let i = 0; i < digits; i += 1) {
    const d = digit();
    if (!Number.isInteger(d) || d < 0 || d > 9) throw new Error('an OTP digit must be 0-9');
    out += String(d);
  }
  return out;
}

/**
 * The stored form of a code. The plaintext OTP is never written down.
 *
 * A code is a credential for the length of its life, and the table it would sit in
 * is the same table an attacker reads if they reach the database at all. Hashed
 * with the session key, it is useless to them and still comparable by us.
 */
export const hashOtp = (secret: string, phone: string, code: string): string =>
  createHmac('sha256', secret).update(phone + '|' + code).digest('base64url');

export const newId = (): string => randomUUID();
