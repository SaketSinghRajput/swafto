/**
 * THE DPDP ENDPOINTS. The Act's obligations as routes rather than as intentions.
 *
 * LEGAL-AUDIT §1 lists what the Digital Personal Data Protection Act 2023 and the
 * DPDP Rules 2025 require of a fiduciary holding a shopkeeper's records and his
 * customers' names. Five of those obligations are things software must DO, and
 * until this file existed each of them was a paragraph:
 *
 *   §1.1  an itemised notice, before processing            GET  /v1/legal/notice
 *   §1.2  consent, and withdrawal as easy as giving        POST /v1/me/consent
 *   §1.5  access and correction                            GET  /v1/me/export
 *   §1.6  erasure, and retention that ends                 POST /v1/me/erase
 *   §1.7  a named grievance officer with an SLA            GET  /v1/me/grievance
 *
 * WITHDRAWAL IS ONE CALL - THE SAME ONE AS GIVING. The Act says withdrawal must be
 * as easy as consent was, and the usual way that requirement is broken is not
 * refusal but friction: consent is a tap, withdrawal is an email to an address in
 * a PDF. Here they are the same endpoint with `granted` flipped, which makes them
 * equally easy by construction rather than by policy.
 *
 * NOTHING IS EVER UPDATED IN PLACE. A withdrawal appends a row and the grant stays.
 * A consent record that can be overwritten cannot answer "what did he agree to, in
 * which language, on which day", and that question is the entire point of keeping
 * one.
 *
 * THE ODIA AND HINDI NOTICE TEXT IS A DRAFT AND SAYS SO IN ITS OWN PAYLOAD. Nobody
 * on this build reads Odia, and a notice that is not understood is not informed
 * consent. The response carries `reviewState`, marked in the DATA rather than in a
 * comment so that a client can refuse to show it; H13 tracks the review.
 */
import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../app.ts';
import { timingSafeEqual } from 'node:crypto';
import { newId, hashOtp, mintOtp } from '../auth/tokens.ts';
import { OTP_LIMITS, OTP_TTL_SECONDS, OTP_DIGITS } from '../rate-limit/limits.ts';
import { PRIVACY_NOTICE_VERSION as NOTICE_VERSION } from '@swafto/values';
import { CONSENT_PURPOSES, type ConsentPurpose } from '@swafto/schema';
import { DELETION_GRACE_DAYS } from '@swafto/values';

/** When a deletion requested at `at` actually happens. One place, both routes. */
const purgeDueAt = (at: string): string =>
  new Date(Date.parse(at) + DELETION_GRACE_DAYS * 86_400_000).toISOString();

/**
 * The notice version and the purpose list both come from the registry, and both
 * used to be typed here as well. That is the defect the registry exists to
 * prevent: the app stamps a version onto a consent, this file stamps one onto
 * the row, and two literals four packages apart agree until the day they do not.
 */
export { PRIVACY_NOTICE_VERSION as NOTICE_VERSION } from '@swafto/values';
export { DELETION_GRACE_DAYS } from '@swafto/values';
export { CONSENT_PURPOSES, type ConsentPurpose } from '@swafto/schema';

/**
 * The itemised notice. ITEMISED is the operative word: the DPDP Rules require the
 * notice to list specifically what is collected and why, not to state generally
 * that data may be processed for business purposes.
 */
export const NOTICE = {
  version: NOTICE_VERSION,
  reviewState: 'EN-AUTHORITATIVE · OD-HI-DRAFT-PENDING-NATIVE-REVIEW',
  fiduciary: {
    name: 'SWAFTO',
    grievanceOfficer: 'Grievance Officer, SWAFTO',
    email: 'grievance@swafto.app',
    responseDays: 30,
  },
  items: [
    {
      purpose: 'account_and_ledger',
      required: true,
      collects: [
        'mobile number',
        'shop name',
        'the entries you type',
        'customer and supplier names you enter',
      ],
      why: 'to keep your day book, work offline, and restore it if you change phone',
      retention:
        'kept while the account is in use; erased within 90 days of a deletion request, or of 24 months of inactivity',
    },
    {
      purpose: 'sms_reminders',
      required: false,
      collects: ['mobile number'],
      why: 'to send your sign-in code and any reminders you ask for',
      retention: 'the number is kept only while the account exists',
    },
    {
      purpose: 'crash_diagnostics',
      required: false,
      collects: ['device model', 'app version', 'the point in the app where it stopped'],
      why: 'to fix crashes',
      /*
       * Stated because it is the promise most often broken by accident: a crash
       * reporter that ships a stack trace can ship whatever was in memory, and on
       * this app that is money and customer names. B36 is the check that keeps it
       * true, and it is measured rather than asserted.
       */
      retention: 'never includes an amount, a customer name or a phone number',
    },
  ],
  rights: [
    'see everything held about you',
    'correct anything wrong',
    'have it erased',
    'withdraw any optional consent, as easily as you gave it',
    'complain to the Data Protection Board of India if we do not resolve it',
  ],
  dataLocation: 'India (ap-south-1)',
} as const;

export function registerDpdpRoutes(app: FastifyInstance, deps: AppDeps): void {
  /** Public: the notice has to be readable BEFORE an account exists. */
  app.get('/v1/legal/notice', async (_req, reply) => reply.code(200).send(NOTICE));

  /**
   * Grant or withdraw one purpose. The same call, the same shape, either way.
   *
   * `account_and_ledger` cannot be withdrawn while the account exists, and the
   * response says what to do instead rather than simply refusing: withdrawing the
   * consent the account itself rests on IS deletion, and pretending otherwise
   * would leave a shopkeeper holding an account nobody is permitted to process.
   */
  app.post(
    '/v1/me/consent',
    {
      schema: {
        body: {
          type: 'object',
          required: ['purpose', 'granted'],
          additionalProperties: false,
          properties: {
            purpose: { type: 'string', enum: [...CONSENT_PURPOSES] },
            granted: { type: 'boolean' },
            locale: { type: 'string', enum: ['od', 'hi', 'en'] },
          },
        },
      },
    },
    async (req, reply) => {
      const { purpose, granted, locale } = req.body as {
        purpose: ConsentPurpose;
        granted: boolean;
        locale?: 'od' | 'hi' | 'en';
      };
      const userId = req.claims?.sub;
      if (!userId) return reply.code(401).send({ error: 'unauthenticated' });

      if (purpose === 'account_and_ledger' && !granted) {
        return reply.code(409).send({
          error: 'withdrawal_means_deletion',
          message:
            'this consent is what the account rests on, so withdrawing it is deletion. ' +
            'POST /v1/me/erase does exactly that, and nothing is kept afterwards.',
          erasureEndpoint: 'POST /v1/me/erase',
        });
      }

      const at = deps.now();
      await deps.repo.recordConsent({
        id: newId(),
        userId,
        purpose,
        granted,
        noticeVersion: NOTICE_VERSION,
        locale: locale ?? 'en',
        at,
      });

      return reply.code(200).send({ purpose, granted, recordedAt: at });
    },
  );

  /** The consent history, in full. Append-only, so this IS the audit trail. */
  /**
   * What he agreed to, and what he agrees to NOW - both, because they are not
   * the same question and each has a different job.
   *
   * `consents` is the append-only log: every grant and every withdrawal, with
   * its time, its language and the notice version. That is the audit trail, and
   * it is what answers "what did he agree to, when".
   *
   * `current` is the latest row per purpose, and it is what governs processing.
   * DERIVING IT HERE RATHER THAN IN EACH CLIENT is deliberate: the log lists a
   * withdrawn purpose as a `granted: true` row followed by a `granted: false`
   * one, and a caller that filters for `granted` sees a purpose the shopkeeper
   * has withdrawn. That reading is one line of plausible code away, it is a
   * processing-without-consent breach, and it is exactly the mistake the first
   * end-to-end test made.
   */
  app.get('/v1/me/consents', async (req, reply) => {
    const userId = req.claims?.sub;
    if (!userId) return reply.code(401).send({ error: 'unauthenticated' });
    const log = await deps.repo.consentsFor(userId);

    const current: Record<string, boolean> = {};
    // The log is ordered oldest-first by the repository contract; the last word
    // on a purpose wins, and ties fall to the later row for the same reason.
    for (const row of log) current[row.purpose] = row.granted;

    return reply.code(200).send({ noticeVersion: NOTICE_VERSION, current, consents: log });
  });

  /**
   * DPDP §1.5 · everything held about this user, in a form they can keep.
   *
   * Machine-readable and complete. An export that omits a table because somebody
   * forgot it is a right half-given, so this returns the repository's own
   * `exportUser` rather than a list assembled here - a new table joins the export
   * by being in the repository, not by being remembered.
   */
  app.get('/v1/me/export', async (req, reply) => {
    const userId = req.claims?.sub;
    if (!userId) return reply.code(401).send({ error: 'unauthenticated' });
    const data = await deps.repo.exportUser(userId);
    if (!data) return reply.code(404).send({ error: 'not_found' });
    return reply
      .code(200)
      .header('Content-Disposition', 'attachment; filename="swafto-my-data.json"')
      .send({ generatedAt: deps.now(), noticeVersion: NOTICE_VERSION, data });
  });

  /**
   * DPDP §1.6 · erasure.
   *
   * TWO STEPS, ON PURPOSE. The request is recorded and then the purge runs,
   * because erasure has to reach the backups too (L-06) and a backup rotation is
   * not instant. Claiming "deleted" the moment the button is pressed would be the
   * easy lie; the response says what has happened and by when the rest will have,
   * which is what the Act asks a fiduciary to be able to state.
   *
   * `confirm` must be the literal word. Erasure is irreversible and this is a
   * financial record - a mis-tap must not be able to do it.
   */
  app.post(
    '/v1/me/erase',
    {
      schema: {
        body: {
          type: 'object',
          required: ['confirm'],
          additionalProperties: false,
          properties: { confirm: { type: 'string', enum: ['DELETE'] } },
        },
      },
    },
    async (req, reply) => {
      const shopId = req.claims?.shop;
      if (!shopId) return reply.code(401).send({ error: 'unauthenticated' });

      const now = deps.now();
      await deps.repo.requestDeletion(shopId, now);

      return reply.code(200).send({
        requestedAt: now,
        erasesAt: purgeDueAt(now),
        graceDays: DELETION_GRACE_DAYS,
        /*
         * NOT ERASED YET, AND IT SAYS SO. An earlier version purged here, on the
         * press of the button, which contradicted this product's own audit (§1.6:
         * "30-day grace ... nothing is lost until the 30 days pass") and removed
         * the only thing standing between a mis-tap - or one SIM-swapped SMS -
         * and the permanent loss of a shopkeeper's financial record.
         */
        liveDataErased: false,
        backupsErasedWithinDays: 90,
        message:
          'Your book will be erased on ' +
          purgeDueAt(now).slice(0, 10) +
          '. Sign in again before then to cancel - nothing is lost until that day. ' +
          'After it, encrypted backups rotate out within 90 days and are not restored.',
      });
    },
  );

  /**
   * Changed his mind. Also done automatically by signing in, which is what the
   * deletion copy promises - this route exists so the app can say so plainly
   * rather than relying on a side effect the shopkeeper cannot see.
   */
  app.post('/v1/me/erase/cancel', async (req, reply) => {
    const shopId = req.claims?.shop;
    if (!shopId) return reply.code(401).send({ error: 'unauthenticated' });
    await deps.repo.cancelDeletion(shopId);
    const shop = await deps.repo.findShop(shopId);
    return reply.code(200).send({ cancelled: shop?.deletionRequestedAt === null });
  });

  /* ================================================================== *
   * THE WEB DELETION PATH - Google Play, LEGAL-AUDIT §4
   *
   * Play's User Data policy requires account and data deletion to be
   * requestable from a WEB URL by somebody who has already uninstalled the
   * app. That person has no session, no device token and no app, so the only
   * thing left to verify them with is the number the account is registered to.
   *
   * THE CODE IS NOT A SIGN-IN CODE. Pending codes are kept under a different
   * key and minted from a different template, so a sign-in code cannot delete
   * a shop and a deletion code cannot sign one in. Sharing the namespace would
   * mean an attacker who phished "your SWAFTO code" could erase a shop's book
   * with it - the same six digits, a very different consequence.
   *
   * IT ANSWERS IDENTICALLY FOR AN UNKNOWN NUMBER, for the same reason the
   * sign-in request does: a deletion endpoint that says "no such account" is a
   * membership oracle that needs no account to query.
   *
   * IT SCHEDULES, IT DOES NOT ERASE. Same thirty days, same cancel-by-signing-
   * in, same job. A web page that erased instantly would be the easiest
   * denial-of-service against a shopkeeper in the whole product.
   * ================================================================== */

  /** The namespace. A deletion code is not a sign-in code, ever. */
  const deletionKey = (phone: string) => 'delete:' + phone;

  app.post(
    '/v1/deletion/request',
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

      const decision = await deps.rate.consumeAll([
        { rule: OTP_LIMITS.sendPerPhoneBurst, identifier: deletionKey(phone) },
        { rule: OTP_LIMITS.sendPerPhoneDaily, identifier: deletionKey(phone) },
      ]);
      if (!decision.allowed) {
        return reply
          .code(429)
          .header('Retry-After', String(decision.retryAfterSeconds))
          .send({ error: 'too_many_requests', retryAfterSeconds: decision.retryAfterSeconds });
      }

      const user = await deps.repo.findUserByPhone(phone);
      if (user) {
        const code = mintOtp(OTP_DIGITS);
        await deps.otp.put({
          phone: deletionKey(phone),
          hash: hashOtp(deps.signingKey, deletionKey(phone), code),
          expiresAt: new Date(Date.parse(deps.now()) + OTP_TTL_SECONDS * 1000).toISOString(),
          attempts: 0,
        });
        await deps.sms.send({
          phone,
          templateId: 'otp_account_deletion',
          variables: [code],
          languageTag: language,
        });
      }

      /*
       * The same body either way. Unlike the sign-in request, no SMS goes to an
       * unregistered number - sending one would tell a stranger's handset that
       * somebody is trying to delete their SWAFTO account, which is worse than
       * the timing difference it would hide.
       */
      return reply.code(202).send({ sent: true, expiresInSeconds: OTP_TTL_SECONDS });
    },
  );

  app.post(
    '/v1/deletion/confirm',
    {
      schema: {
        body: {
          type: 'object',
          required: ['phone', 'code', 'confirm'],
          additionalProperties: false,
          properties: {
            phone: { type: 'string', minLength: 8, maxLength: 16 },
            code: { type: 'string', minLength: 4, maxLength: 10 },
            confirm: { type: 'string', enum: ['DELETE'] },
          },
        },
      },
    },
    async (req, reply) => {
      const { phone, code } = req.body as { phone: string; code: string; confirm: 'DELETE' };

      const gate = await deps.rate.consumeAll([
        { rule: OTP_LIMITS.verifyPerCode, identifier: deletionKey(phone) },
      ]);
      if (!gate.allowed) {
        return reply
          .code(429)
          .header('Retry-After', String(gate.retryAfterSeconds))
          .send({ error: 'too_many_requests', retryAfterSeconds: gate.retryAfterSeconds });
      }

      const pending = await deps.otp.get(deletionKey(phone));
      if (!pending || Date.parse(pending.expiresAt) <= Date.parse(deps.now())) {
        return reply.code(401).send({ error: 'code_invalid' });
      }

      const given = Buffer.from(hashOtp(deps.signingKey, deletionKey(phone), code));
      const wanted = Buffer.from(pending.hash);
      const ok = given.length === wanted.length && timingSafeEqual(given, wanted);
      if (!ok) {
        const attempts = await deps.otp.bumpAttempts(deletionKey(phone));
        if (attempts >= 5) await deps.otp.clear(deletionKey(phone));
        return reply.code(401).send({ error: 'code_invalid' });
      }
      await deps.otp.clear(deletionKey(phone));

      const user = await deps.repo.findUserByPhone(phone);
      if (!user) {
        // The code verified, so this is a race rather than a probe: the account
        // went away between the request and the confirmation.
        return reply.code(404).send({ error: 'not_found' });
      }

      const now = deps.now();
      await deps.repo.requestDeletion(user.shopId, now);

      return reply.code(200).send({
        requestedAt: now,
        erasesAt: purgeDueAt(now),
        graceDays: DELETION_GRACE_DAYS,
        liveDataErased: false,
        message:
          'Your book will be erased on ' +
          purgeDueAt(now).slice(0, 10) +
          '. Sign in to the app before then to cancel. After that day, encrypted ' +
          'backups rotate out within 90 days and are not restored.',
      });
    },
  );

  /** DPDP §1.7 · a named officer, a route to them, and a stated SLA. */
  app.get('/v1/me/grievance', async (_req, reply) =>
    reply.code(200).send({
      officer: NOTICE.fiduciary.grievanceOfficer,
      email: NOTICE.fiduciary.email,
      respondWithinDays: NOTICE.fiduciary.responseDays,
      escalation:
        'If we have not resolved your complaint, you may complain to the Data ' +
        'Protection Board of India.',
    }),
  );
}
