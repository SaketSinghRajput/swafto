/**
 * G6 - PHONE AND OTP. The only way into a shop's ledger.
 *
 * THREE THINGS THIS DOES THAT ARE EASY TO GET WRONG, AND EXPENSIVE.
 *
 * 1. IT NEVER SAYS WHETHER A NUMBER IS REGISTERED. Request an OTP for a number that
 *    has an account and for one that does not, and the response is byte-identical -
 *    and the SMS goes out either way, so the timing matches too. An endpoint that
 *    answers differently is a free membership oracle: feed it a leaked phone list
 *    and learn who runs a shop. The account is created at VERIFY, not at request,
 *    which is what makes the identical answer honest rather than a pretence.
 *
 * 2. THE CODE IS NEVER STORED. Only an HMAC of it. The pending-OTP table is exactly
 *    the table somebody reads if they reach the database at all, and a live code in
 *    it is a live account takeover. Comparison is constant time, for the same
 *    reason the signature comparison is.
 *
 * 3. CONSENT IS TAKEN BEFORE THE ACCOUNT EXISTS, NOT AFTER. DPDP §1.2 wants consent
 *    that is free, specific, informed and given by a clear affirmative action,
 *    BEFORE processing. So a first-time verify without an explicit consent payload
 *    is refused. There is no path that creates a user and asks afterwards, because
 *    a path like that is one release away from becoming the only path.
 *
 * THE RATE LIMITS ARE THE REAL ONES - `RateLimiter` with the TB6 rules, not a second
 * implementation living here. An OTP endpoint with no limit is a way to spend
 * somebody else's SMS budget and a way to brute-force a six-digit code; both are in
 * SECURITY-AUDIT, and both are counted rather than promised.
 */
import type { FastifyInstance } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import type { AppDeps } from '../app.ts';
import { OTP_LIMITS, OTP_TTL_SECONDS, OTP_DIGITS } from '../rate-limit/limits.ts';
import { hashOtp, mintOtp, mintToken, newId, verifyToken } from './tokens.ts';

/** How long a session lasts. Long by decision (D5): a re-auth costs a real SMS. */
export const ACCESS_TTL_SECONDS = 60 * 60 * 24;
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 180;

/** Five wrong codes and the code dies - the verify side of the TB6 OTP limits. */
export const MAX_VERIFY_ATTEMPTS = 5;

export interface PendingOtp {
  readonly phone: string;
  /** HMAC of the code. The code itself is never written anywhere. */
  readonly hash: string;
  readonly expiresAt: string;
  readonly attempts: number;
}

export interface OtpStore {
  put(pending: PendingOtp): Promise<void>;
  get(phone: string): Promise<PendingOtp | null>;
  bumpAttempts(phone: string): Promise<number>;
  clear(phone: string): Promise<void>;
}

export function memoryOtpStore(): OtpStore {
  const byPhone = new Map<string, PendingOtp>();
  return {
    async put(pending) {
      byPhone.set(pending.phone, pending);
    },
    async get(phone) {
      return byPhone.get(phone) ?? null;
    },
    async bumpAttempts(phone) {
      const p = byPhone.get(phone);
      if (!p) return 0;
      const next = { ...p, attempts: p.attempts + 1 };
      byPhone.set(phone, next);
      return next.attempts;
    },
    async clear(phone) {
      byPhone.delete(phone);
    },
  };
}

/**
 * A mobile number as this product accepts it.
 *
 * Deliberately not a clever regex. The database CHECK is `length BETWEEN 8 AND 16`,
 * and a stricter pattern here than the column allows would refuse a number the
 * database would have taken - the sort of mismatch nobody finds until a real
 * shopkeeper cannot sign in.
 */
const PHONE = /^\+?[0-9]{8,15}$/;

/** Identical in shape whatever happened, so nothing can be learned from the reply. */
const OTP_SENT = { sent: true, expiresInSeconds: OTP_TTL_SECONDS, digits: OTP_DIGITS } as const;

export function registerAuthRoutes(app: FastifyInstance, deps: AppDeps): void {
  const nowSeconds = () => Math.floor(Date.parse(deps.now()) / 1000);

  app.post(
    '/v1/auth/otp/request',
    {
      schema: {
        body: {
          type: 'object',
          required: ['phone', 'language'],
          additionalProperties: false,
          properties: {
            phone: { type: 'string', minLength: 8, maxLength: 16 },
            language: { type: 'string', enum: ['od', 'hi', 'en'] },
          },
        },
      },
    },
    async (req, reply) => {
      const { phone, language } = req.body as { phone: string; language: 'od' | 'hi' | 'en' };
      if (!PHONE.test(phone)) return reply.code(400).send({ error: 'invalid_phone' });

      const decision = await deps.rate.consumeAll([
        { rule: OTP_LIMITS.sendPerPhoneBurst, identifier: phone },
        { rule: OTP_LIMITS.sendPerPhoneDaily, identifier: phone },
      ]);
      if (!decision.allowed) {
        /*
         * `Retry-After` is a real number of seconds and it always eventually
         * reaches zero (B.3). A lockout a shopkeeper cannot escape without support
         * is worse than the threat it defends against.
         */
        return reply
          .code(429)
          .header('Retry-After', String(decision.retryAfterSeconds))
          .send({ error: 'too_many_requests', retryAfterSeconds: decision.retryAfterSeconds });
      }

      const code = mintOtp(OTP_DIGITS);
      await deps.otp.put({
        phone,
        hash: hashOtp(deps.signingKey, phone, code),
        expiresAt: new Date((nowSeconds() + OTP_TTL_SECONDS) * 1000).toISOString(),
        attempts: 0,
      });

      /*
       * Sent for a known AND an unknown number. Sending only to known numbers would
       * make the timing of this call the very oracle the identical response body
       * exists to prevent.
       */
      await deps.sms.send({
        phone,
        templateId: 'otp_signin',
        variables: [code],
        languageTag: language,
      });

      return reply.code(202).send(OTP_SENT);
    },
  );

  app.post(
    '/v1/auth/otp/verify',
    {
      schema: {
        body: {
          type: 'object',
          required: ['phone', 'code', 'device'],
          additionalProperties: false,
          properties: {
            phone: { type: 'string', minLength: 8, maxLength: 16 },
            code: { type: 'string', minLength: 4, maxLength: 10 },
            device: {
              type: 'object',
              required: ['platform'],
              additionalProperties: false,
              properties: { platform: { type: 'string', enum: ['android', 'ios'] } },
            },
            shopName: { type: 'string', minLength: 1, maxLength: 120 },
            consent: {
              type: 'object',
              required: ['granted', 'noticeVersion', 'locale'],
              additionalProperties: false,
              properties: {
                granted: { type: 'boolean' },
                noticeVersion: { type: 'string', minLength: 1, maxLength: 40 },
                locale: { type: 'string', enum: ['od', 'hi', 'en'] },
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as {
        phone: string;
        code: string;
        device: { platform: 'android' | 'ios' };
        shopName?: string;
        consent?: { granted: boolean; noticeVersion: string; locale: 'od' | 'hi' | 'en' };
      };

      const gate = await deps.rate.consumeAll([
        { rule: OTP_LIMITS.verifyPerCode, identifier: body.phone },
      ]);
      if (!gate.allowed) {
        return reply
          .code(429)
          .header('Retry-After', String(gate.retryAfterSeconds))
          .send({ error: 'too_many_requests', retryAfterSeconds: gate.retryAfterSeconds });
      }

      const pending = await deps.otp.get(body.phone);
      if (!pending || Date.parse(pending.expiresAt) <= nowSeconds() * 1000) {
        return reply.code(401).send({ error: 'code_invalid' });
      }

      const given = Buffer.from(hashOtp(deps.signingKey, body.phone, body.code));
      const wanted = Buffer.from(pending.hash);
      const ok = given.length === wanted.length && timingSafeEqual(given, wanted);

      if (!ok) {
        const attempts = await deps.otp.bumpAttempts(body.phone);
        if (attempts >= MAX_VERIFY_ATTEMPTS) await deps.otp.clear(body.phone);
        return reply.code(401).send({ error: 'code_invalid' });
      }

      // Single use. A code that survives its own success can be replayed.
      await deps.otp.clear(body.phone);

      const now = deps.now();
      let user = await deps.repo.findUserByPhone(body.phone);

      if (!user) {
        /*
         * FIRST SIGN-IN. DPDP §1.2 wants a clear affirmative action BEFORE
         * processing, so no account is created without one. Refusing here rather
         * than creating-then-asking is deliberate: a create-then-ask path processes
         * personal data for the length of the gap, and the gap is exactly where an
         * abandoned sign-up leaves a row nobody consented to.
         */
        if (!body.consent?.granted) {
          return reply.code(403).send({
            error: 'consent_required',
            message: 'an account is not created until the notice has been shown and accepted',
          });
        }
        const shopId = newId();
        const userId = newId();
        const created = await deps.repo.createShopAndUser({
          shopId,
          userId,
          phone: body.phone,
          shopName: body.shopName ?? '',
          language: body.consent.locale,
          now,
        });
        user = created.user;
        await deps.repo.recordConsent({
          id: newId(),
          userId,
          purpose: 'account_and_ledger',
          granted: true,
          noticeVersion: body.consent.noticeVersion,
          locale: body.consent.locale,
          at: now,
        });
      }

      /*
       * SIGNING IN CANCELS A PENDING DELETION, which is exactly what the
       * deletion copy promises him: "Sign in again any time before then to
       * cancel - nothing is lost until the 30 days pass." A promise made in
       * the copy and implemented nowhere is the worst kind, because he acts on
       * it and finds out at the end of the grace period.
       */
      await deps.repo.cancelDeletion(user.shopId);

      const deviceId = newId();
      await deps.repo.registerDevice({
        id: deviceId,
        userId: user.id,
        shopId: user.shopId,
        platform: body.device.platform,
        createdAt: now,
        lastSeenAt: now,
        revokedAt: null,
      });

      const seconds = nowSeconds();
      return reply.code(200).send({
        accessToken: mintToken(deps.signingKey, {
          sub: user.id,
          shop: user.shopId,
          dev: deviceId,
          typ: 'access',
          nowSeconds: seconds,
          ttlSeconds: ACCESS_TTL_SECONDS,
        }),
        refreshToken: mintToken(deps.signingKey, {
          sub: user.id,
          shop: user.shopId,
          dev: deviceId,
          typ: 'refresh',
          nowSeconds: seconds,
          ttlSeconds: REFRESH_TTL_SECONDS,
        }),
        deviceId,
        shopId: user.shopId,
      });
    },
  );

  app.post(
    '/v1/auth/refresh',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          additionalProperties: false,
          properties: { refreshToken: { type: 'string', minLength: 1, maxLength: 4096 } },
        },
      },
    },
    async (req, reply) => {
      const { refreshToken } = req.body as { refreshToken: string };
      const seconds = nowSeconds();
      try {
        const claims = verifyToken(deps.signingKey, refreshToken, 'refresh', seconds);
        const device = await deps.repo.findDevice(claims.dev);
        if (!device || device.revokedAt) {
          return reply.code(401).send({ error: 'device_revoked' });
        }
        return reply.code(200).send({
          accessToken: mintToken(deps.signingKey, {
            sub: claims.sub,
            shop: claims.shop,
            dev: claims.dev,
            typ: 'access',
            nowSeconds: seconds,
            ttlSeconds: ACCESS_TTL_SECONDS,
          }),
        });
      } catch {
        return reply.code(401).send({ error: 'unauthenticated' });
      }
    },
  );

  /**
   * Revoke a device - the handset that lost the phone does this from the new one.
   *
   * A device may only be revoked by somebody holding a token for the SAME SHOP.
   * Without that check the endpoint is a way to sign out any shop in India whose
   * device id can be guessed, which is a denial of service on a shopkeeper's day.
   */
  app.post('/v1/auth/devices/:id/revoke', async (req, reply) => {
    const { id } = req.params as { id: string };
    const device = await deps.repo.findDevice(id);
    if (!device || device.shopId !== req.claims?.shop) {
      // 404 rather than 403: a 403 confirms the id exists, which is the same oracle.
      return reply.code(404).send({ error: 'not_found' });
    }
    await deps.repo.revokeDevice(id, deps.now());
    return reply.code(200).send({ revoked: true });
  });
}
