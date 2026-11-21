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
import { shopOf, type AppDeps } from '../app.ts';
import { OTP_LIMITS, OTP_TTL_SECONDS, OTP_DIGITS, INVITE_DIGITS } from '../rate-limit/limits.ts';
import { maskPhone } from './demo.ts';
import { mintToken, newId, verifyToken } from './tokens.ts';
import { INVALID_PHONE, normaliseIndianMobile } from './phone.ts';
import { codeShapeOk, requestOtp, verifyOtp } from './otp-flow.ts';
import type { DeviceRow } from '../db/port.ts';
import { NO_BODY, NO_QUERY } from '../schemas.ts';

/** How long a session lasts. Long by decision (D5): a re-auth costs a real SMS. */
export const ACCESS_TTL_SECONDS = 60 * 60 * 24;
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 180;

/** Guesses one code survives in total, enforced by the store's attempt ticket (otp-flow.ts). */
export const MAX_VERIFY_ATTEMPTS = OTP_LIMITS.verifyPerCode.max;

export { memoryOtpStore, type OtpStore, type PendingOtp } from './otp-store.ts';

/*
 * The phone shape is `normaliseIndianMobile` (phone.ts), shared with web deletion: a
 * number is accepted as `9876500001`, `+91 98765 00001` and so on, and always handled
 * as `+91XXXXXXXXXX` after that (C-10).
 */

/**
 * The one Repo method this file needs that the port does not have yet. Typed here so
 * the route compiles on its own and answers 501 until API-DATA adds it to `Repo`:
 *   listDevices(shopId: string): Promise<readonly DeviceRow[]>
 */
type DeviceListingRepo = {
  listDevices?: (shopId: string) => Promise<readonly DeviceRow[]>;
};

/** Identical in shape whatever happened, so nothing can be learned from the reply. */
const OTP_SENT = { sent: true, expiresInSeconds: OTP_TTL_SECONDS, digits: OTP_DIGITS } as const;

/** A malformed field, said without naming it (no Ajv text, no framework code). */
export const INVALID_INPUT = { error: 'invalid_input', message: 'the request is not valid' } as const;

/** The whole reply to a code request in invite mode: the same for every number, and the contract with the app. */
export const INVITE_MODE_REPLY = { sent: false, mode: 'invite', digits: INVITE_DIGITS } as const;

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
            /*
             * F-24: the install id the app generates once and keeps. It is
             * NOT identity and never tenancy - the account and shop come from
             * the phone number at verify, and the session after that. It is
             * only the key for TB6's per-device send limit, so a lying
             * client can at worst rate-limit itself.
             */
            deviceId: { type: 'string', minLength: 8, maxLength: 64, pattern: '^[A-Za-z0-9-]+$' },
          },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as {
        phone: string;
        language: 'od' | 'hi' | 'en';
        deviceId?: string;
      };
      const phone = normaliseIndianMobile(body.phone);
      if (!phone) return reply.code(400).send(INVALID_PHONE);

      /*
       * INVITE MODE (INVITE-CODES T4). A CONSTANT REPLY, BEFORE ANY DATABASE READ. No account lookup, no
       * `requestOtp`, no limiter write, no message: so the bytes and the work are the same for a number
       * with an invite, one with an account and one with neither, and a stranger's request can never
       * overwrite or burn an invite. The app learns the mode from this reply (`sent: false`).
       */
      if (deps.authMode === 'invite') return reply.code(202).send(INVITE_MODE_REPLY);

      /*
       * Everything the old inline version did, and the RT-3 / RT-4 / SEC-101 fixes, now
       * live in `requestOtp` so web deletion shares them: the resend cooldown, the
       * per-address cap that blocks, the global hourly breaker, and the atomic limiter.
       * The response is the same whatever happened, including inside the cooldown.
       */
      const user = await deps.repo.findUserByPhone(phone);
      const out = await requestOtp(deps, {
        key: phone,
        phone,
        templateId: 'otp_signin',
        language: body.language,
        ip: req.ip,
        ...(body.deviceId ? { deviceId: body.deviceId } : {}),
        user,
        send: true,
        log: req.log,
      });
      if (out.kind === 'limited') {
        /*
         * `Retry-After` is a real number of seconds and it always eventually
         * reaches zero (B.3). A lockout a shopkeeper cannot escape without support
         * is worse than the threat it defends against.
         */
        return reply
          .code(429)
          .header('Retry-After', String(out.decision.retryAfterSeconds))
          .send({ error: 'too_many_requests', retryAfterSeconds: out.decision.retryAfterSeconds });
      }
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

      const phone = normaliseIndianMobile(body.phone);
      if (!phone) return reply.code(400).send(INVALID_PHONE);

      // F-1: a malformed code is a 400 BEFORE the attempt ticket, so it never spends one of the five guesses.
      if (!codeShapeOk(deps, phone, body.code)) return reply.code(400).send(INVALID_INPUT);

      const checked = await verifyOtp(deps, { key: phone, code: body.code, ip: req.ip, log: req.log });
      if (!checked.ok) {
        if (checked.status === 429) {
          return reply
            .code(429)
            .header('Retry-After', String(checked.retryAfterSeconds))
            .send({ error: 'too_many_requests', retryAfterSeconds: checked.retryAfterSeconds });
        }
        return reply.code(401).send({ error: 'code_invalid' });
      }

      const now = deps.now();
      let user = await deps.repo.findUserByPhone(phone);

      /*
       * PURPOSE (INVITE-CODES T2). The row is already cleared by `verifyOtp`, so a refusal here spends
       * the code. `invite_new` on a number that already has an account, or `invite_recovery` on one
       * with none, means the operator issued the wrong kind or the wrong number: fail closed, no
       * tokens, one `warn` line (no number) to alert on. Only the holder of a correct code sees this.
       */
      if ((checked.kind === 'invite_new' && user) || (checked.kind === 'invite_recovery' && !user)) {
        req.log.warn({ event: 'invite_refused_kind', kind: checked.kind }, 'invite code refused: wrong kind for this number');
        return reply.code(401).send({ error: 'code_invalid' });
      }
      if (checked.demo) {
        req.log.warn({ event: 'demo_login', phoneMasked: maskPhone(phone) }, 'demo login');
      } else if (checked.kind !== 'sms') {
        req.log.info({ event: 'invite_consumed', kind: checked.kind }, 'invite code used');
      }

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
          phone,
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
          gen: 0,
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
        if (device.shopId !== claims.shop || device.userId !== claims.sub) {
          return reply.code(401).send({ error: 'device_revoked' });
        }
        /*
         * RT-10 · A REFRESH TOKEN IS USED ONCE. The token's generation must equal the
         * device's current one, and the swap to the next is a single compare-and-set.
         * A token minted before rotation has no `gen` and is generation 0, which is what
         * every existing device row defaults to. No row matched means this token was
         * already spent: a stolen copy replayed, or the real one after a thief used it.
         * Either way two parties hold the credential, so the device is revoked and
         * both are signed out; the owner signs in again by SMS.
         */
        const gen = claims.gen ?? 0;
        const rotation = await deps.repo.rotateRefreshGen(device.shopId, device.id, gen, deps.now());
        if (rotation.kind === 'lost_race') {
          // A concurrent retry of the same lost response won. Not a replay: refuse, do not revoke.
          return reply.code(401).send({ error: 'unauthenticated' });
        }
        if (rotation.kind === 'reuse') {
          await deps.repo.revokeDevice(device.shopId, device.id, deps.now());
          req.log.warn({ event: 'refresh_reuse_revoked' }, 'refresh token reused; device revoked');
          return reply.code(401).send({ error: 'device_revoked' });
        }
        /*
         * RT-W4-2 · A GRACE ROTATION (the token was one generation behind) is how a lost response is
         * retried AND how a stolen token raced inside the window would be served. It is accepted, but
         * never silently: one warn event with the device id (no token), so a steal-and-race shows in the log.
         */
        if (rotation.gen !== gen + 1) {
          req.log.warn({ event: 'refresh_grace_used', deviceId: device.id }, 'refresh accepted via the grace window');
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
          // New field; `accessToken` keeps its shape. The client must store this and
          // send it next time - the one it just used no longer works.
          refreshToken: mintToken(deps.signingKey, {
            sub: claims.sub,
            shop: claims.shop,
            dev: claims.dev,
            typ: 'refresh',
            nowSeconds: seconds,
            ttlSeconds: REFRESH_TTL_SECONDS,
            gen: rotation.gen,
          }),
        });
      } catch {
        return reply.code(401).send({ error: 'unauthenticated' });
      }
    },
  );

  /**
   * C-21 / SEC-105 - THE SHOP'S DEVICES, so a lost phone can be found and signed out
   * from another one. Which shop: the session's, via `shopOf` (S-11) - there is no id
   * in the request that could name another. Revoked devices are listed too (marked),
   * because "this one is already signed out" is what the owner wants to see.
   *
   * There is no `label` column; `platform` is the only description a device has.
   * `listDevices` is API-DATA's to add to the Repo (see the Wave 2 report); until it
   * exists this answers 501 rather than guessing.
   */
  app.get('/v1/devices', { schema: { querystring: NO_QUERY } }, async (req, reply) => {
    const repo = deps.repo as DeviceListingRepo;
    if (typeof repo.listDevices !== 'function') {
      return reply.code(501).send({ error: 'not_implemented' });
    }
    const rows = await repo.listDevices(shopOf(req));
    return reply.code(200).send({
      devices: rows.map((d) => ({
        id: d.id,
        platform: d.platform,
        createdAt: d.createdAt,
        lastSeenAt: d.lastSeenAt,
        revokedAt: d.revokedAt,
        current: d.id === req.claims?.dev,
      })),
    });
  });

  /**
   * Revoke a device - the handset that lost the phone does this from the new one.
   *
   * A device may only be revoked by somebody holding a token for the SAME SHOP.
   * Without that check the endpoint is a way to sign out any shop in India whose
   * device id can be guessed, which is a denial of service on a shopkeeper's day.
   */
  app.post('/v1/auth/devices/:id/revoke', { schema: { body: NO_BODY } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const device = await deps.repo.findDevice(id);
    if (!device || device.shopId !== shopOf(req)) {
      // 404 rather than 403: a 403 confirms the id exists, which is the same oracle.
      return reply.code(404).send({ error: 'not_found' });
    }
    await deps.repo.revokeDevice(shopOf(req), id, deps.now());
    return reply.code(200).send({ revoked: true });
  });

  /**
   * DV-13 - THE SHOP'S NAME. On a new install the account is created at verify,
   * before X1 asks the name, so `shops.name` stayed empty for ever. The app
   * sends it from its sync once it has one. Which shop: the session's, via
   * `shopOf` (S-11) - there is no id in the body to name another.
   */
  app.post(
    '/v1/me/shop',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          additionalProperties: false,
          // The verify route's own bounds for `shopName`.
          properties: { name: { type: 'string', minLength: 1, maxLength: 120 } },
        },
      },
    },
    async (req, reply) => {
      const { name } = req.body as { name: string };
      if (!(await deps.repo.renameShop(shopOf(req), name))) {
        return reply.code(404).send({ error: 'not_found' });
      }
      return reply.code(200).send({ name });
    },
  );
}
