/**
 * PR-7 · THE TWO PLACES THIS SERVER TALKS TO GOOGLE, AND THE ONE IT LISTENS.
 *
 *   1. OUT: the Play Developer API, `purchases.subscriptionsv2.get` and
 *      `purchases.subscriptions.acknowledge`, authorised by a service-account
 *      JWT exchanged for an OAuth access token (RFC 7523).
 *   2. IN: Pub/Sub's push of a Real-time Developer Notification, authenticated
 *      by the Google-signed OIDC token on the request. Without that check
 *      anybody could POST a "notification" (R4 §2).
 *
 * THE KEY IS NEVER IN THIS TREE. It reaches the process as configuration
 * (`PLAY_SERVICE_ACCOUNT_JSON`, put there from SSM SecureString at deploy,
 * R4-HA3). Tests make a throwaway key pair at run time; `check:secrets` fails on
 * a private key in a file, and it should.
 *
 * Both directions are ports (`PlayDeveloperApi`, `GoogleKeys`), so the routes
 * are tested against fakes and these adapters are tested against a fake
 * `fetch` that checks what they actually send.
 */
import { createPublicKey, createSign, createVerify, type KeyObject, type webcrypto } from 'node:crypto';
import type { SubscriptionState } from '@swafto/schema';

/** A `fetch`, narrowed to what these adapters use. Node 24 supplies the real one. */
export type Fetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ status: number; json(): Promise<unknown> }>;

/** The part of `SubscriptionPurchaseV2` this server reads (field names as Google documents them). */
export interface SubscriptionV2 {
  readonly subscriptionState?: SubscriptionState;
  readonly acknowledgementState?: 'ACKNOWLEDGEMENT_STATE_UNSPECIFIED' | 'ACKNOWLEDGEMENT_STATE_PENDING' | 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED';
  readonly linkedPurchaseToken?: string;
  readonly testPurchase?: unknown;
  readonly externalAccountIdentifiers?: { readonly obfuscatedExternalAccountId?: string };
  readonly lineItems?: readonly {
    readonly productId?: string;
    readonly expiryTime?: string;
    readonly autoRenewingPlan?: { readonly autoRenewEnabled?: boolean };
    readonly offerDetails?: { readonly basePlanId?: string };
  }[];
}

export interface PlayDeveloperApi {
  getSubscription(packageName: string, purchaseToken: string): Promise<SubscriptionV2>;
  acknowledge(packageName: string, productId: string, purchaseToken: string): Promise<void>;
}

/** Google answered, and the answer was not a success. `status` says which. */
export class PlayApiError extends Error {
  readonly status: number;
  constructor(status: number, what: string) {
    super(what + ' answered HTTP ' + status);
    this.name = 'PlayApiError';
    this.status = status;
  }
}

export interface ServiceAccount {
  readonly client_email: string;
  readonly private_key: string;
  readonly token_uri?: string;
}

const b64url = (s: string | Buffer) => Buffer.from(s).toString('base64url');
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/';

/** The signed assertion a service account trades for an access token. Exported for its test. */
export function serviceAccountAssertion(sa: ServiceAccount, nowSeconds: number): string {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: sa.token_uri ?? 'https://oauth2.googleapis.com/token',
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  );
  const signature = createSign('RSA-SHA256').update(header + '.' + claims).sign(sa.private_key);
  return header + '.' + claims + '.' + b64url(signature);
}

export function googlePlayApi(deps: { fetch: Fetch; serviceAccount: ServiceAccount; now: () => string }): PlayDeveloperApi {
  let cached: { token: string; until: number } | null = null;
  const nowSeconds = () => Math.floor(Date.parse(deps.now()) / 1000);

  const accessToken = async (): Promise<string> => {
    // A minute's margin, so a token is never sent in the second it expires.
    if (cached && nowSeconds() < cached.until - 60) return cached.token;
    const res = await deps.fetch(deps.serviceAccount.token_uri ?? 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body:
        'grant_type=' +
        encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
        '&assertion=' +
        serviceAccountAssertion(deps.serviceAccount, nowSeconds()),
    });
    if (res.status !== 200) throw new PlayApiError(res.status, 'the OAuth token endpoint');
    const body = (await res.json()) as { access_token?: string; expires_in?: number };
    if (typeof body.access_token !== 'string') throw new PlayApiError(502, 'the OAuth token endpoint');
    cached = { token: body.access_token, until: nowSeconds() + (body.expires_in ?? 3600) };
    return cached.token;
  };

  const call = async (method: 'GET' | 'POST', url: string, what: string) => {
    const res = await deps.fetch(url, {
      method,
      headers: {
        authorization: 'Bearer ' + (await accessToken()),
        ...(method === 'POST' ? { 'content-type': 'application/json' } : {}),
      },
      ...(method === 'POST' ? { body: '{}' } : {}),
    });
    if (res.status < 200 || res.status > 299) throw new PlayApiError(res.status, what);
    return res;
  };

  const e = encodeURIComponent;
  return {
    async getSubscription(packageName, purchaseToken) {
      const res = await call(
        'GET',
        API + e(packageName) + '/purchases/subscriptionsv2/tokens/' + e(purchaseToken),
        'subscriptionsv2.get',
      );
      return (await res.json()) as SubscriptionV2;
    },
    async acknowledge(packageName, productId, purchaseToken) {
      await call(
        'POST',
        API + e(packageName) + '/purchases/subscriptions/' + e(productId) + '/tokens/' + e(purchaseToken) + ':acknowledge',
        'subscriptions.acknowledge',
      );
    },
  };
}

/* ---- IN: the Pub/Sub push, and the OIDC token on it ------------------- */

/** Google's signing keys by `kid`. A port, so a test hands in its own. */
export type GoogleKeys = (kid: string) => Promise<KeyObject | null>;

/** Google's published OIDC keys, cached for an hour and re-read once for an unknown `kid`. */
export function googleOidcKeys(fetch: Fetch, now: () => string): GoogleKeys {
  let keys = new Map<string, KeyObject>();
  let fetchedAt = -Infinity;
  const load = async () => {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/certs');
    if (res.status !== 200) throw new PlayApiError(res.status, 'Google OIDC certs');
    const body = (await res.json()) as { keys?: (webcrypto.JsonWebKey & { kid?: string })[] };
    keys = new Map(
      (body.keys ?? []).filter((k) => k.kid).map((k) => [k.kid!, createPublicKey({ key: k, format: 'jwk' })]),
    );
    fetchedAt = Date.parse(now());
  };
  return async (kid) => {
    const age = Date.parse(now()) - fetchedAt;
    if (age > 3_600_000 || (!keys.has(kid) && age > 60_000)) await load();
    return keys.get(kid) ?? null;
  };
}

const ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

/**
 * Is this the push Google signed for us? RS256 signature by a Google key, a
 * Google issuer, OUR audience, the push service account's verified email, and
 * unexpired. Any one missing and it is refused - there is no partial trust.
 */
export async function verifyPushToken(
  jwt: string,
  expect: { readonly audience: string; readonly email: string },
  keys: GoogleKeys,
  now: string,
): Promise<boolean> {
  const parts = jwt.split('.');
  if (parts.length !== 3) return false;
  let header: { alg?: string; kid?: string };
  let claims: { iss?: string; aud?: string; email?: string; email_verified?: boolean; exp?: number; iat?: number };
  try {
    header = JSON.parse(Buffer.from(parts[0]!, 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
  } catch {
    return false;
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') return false;
  const key = await keys(header.kid);
  if (!key) return false;
  const signed = createVerify('RSA-SHA256').update(parts[0] + '.' + parts[1]).verify(key, Buffer.from(parts[2]!, 'base64url'));
  if (!signed) return false;
  const nowSeconds = Math.floor(Date.parse(now) / 1000);
  return (
    ISSUERS.has(claims.iss ?? '') &&
    claims.aud === expect.audience &&
    claims.email === expect.email &&
    claims.email_verified === true &&
    typeof claims.exp === 'number' &&
    nowSeconds < claims.exp &&
    // A token from the future is not one Google issued; five minutes of clock skew allowed.
    (typeof claims.iat !== 'number' || claims.iat <= nowSeconds + 300)
  );
}
