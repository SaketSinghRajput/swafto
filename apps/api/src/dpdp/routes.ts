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
import { makeShopLimitHooks, type ShopLimitHooks } from '../sync/shop-limit.ts';
import { chunkedJson } from '../read/chunked-json.ts';
import { RETRY_AFTER_SECONDS } from '../db/errors.ts';
import { newId } from '../auth/tokens.ts';
import { INVALID_PHONE, normaliseIndianMobile } from '../auth/phone.ts';
import { requestOtp, verifyOtp } from '../auth/otp-flow.ts';
import { OTP_TTL_SECONDS } from '../rate-limit/limits.ts';
import { PRIVACY_NOTICE_VERSION as NOTICE_VERSION } from '@swafto/values';
import { CONSENT_PURPOSES, type ConsentPurpose } from '@swafto/schema';
import { DELETION_GRACE_DAYS, EXPORT_DISCLAIMER } from '@swafto/values';
import { NO_BODY, NO_QUERY } from '../schemas.ts';

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
    email: 'grievance@swafto.com',
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

export function registerDpdpRoutes(
  app: FastifyInstance,
  deps: AppDeps,
  hooks: ShopLimitHooks = makeShopLimitHooks(deps.shopLimits),
): void {
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
  app.get('/v1/me/consents', { schema: { querystring: NO_QUERY } }, async (req, reply) => {
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
   * `exportUser` rather than a list assembled here.
   *
   * THE SENTENCE THAT USED TO FOLLOW WAS FALSE, and is worth recording rather
   * than quietly deleting. It claimed "a new table joins the export by being in
   * the repository, not by being remembered". It does not. `exportUser` is a
   * hand-written union of four table names and a hand-written object of seven
   * keys (`db/postgres.ts`), and `purgeShop` keeps its own longer list. Nothing
   * reconciles the two, and `Repo.exportUser` is typed `Promise<unknown>`, so
   * the compiler cannot either. A new table joins the export by being
   * remembered, which is exactly what the comment promised it would not be.
   *
   * The lists already disagree: `purgeShop` deletes `section_skips` and
   * `exportUser` does not return it. Today that omits nothing, because
   * `section_skips` is never written - the API has no method for it and
   * the push carries no skips (`OutboxRow.kind` is 'entry' | 'day' | 'party',
   * and the client's `dayPayload` drops `skippedSections`), so the D8 skip
   * decisions stay on the handset. That is now a decision, not an omission:
   * no server route reads a skip (`dayInputFor` builds no `skippedSections`,
   * and no route calls `sectionStates`), so syncing them would add a DPDP
   * export obligation and buy nothing until a restore-from-server exists. It becomes a real gap in the access right the moment that sync
   * is built, which is the hazard of a comment nobody can rely on.
   */
  /*
   * RT-W3-1 · THE ONE ROUTE THAT READS A WHOLE LEDGER ON DEMAND. Three guards, because one user with
   * 100,000 entries and a loop could otherwise stall the API for every tenant (40 concurrent exports
   * blocked the event loop for 5.3 s):
   *  - a per-shop bucket of its own (`shopLimits.heavy`, default 2 at once then 1 per 10 s);
   *  - at most MAX_EXPORTS_IN_FLIGHT per process, the rest told to come back (503 + Retry-After);
   *  - the JSON is built in slices that hand the event loop back (`chunkedJson`), not in one
   *    synchronous `JSON.stringify` of the whole ledger.
   */
  const heavy = hooks.heavy;
  const MAX_EXPORTS_IN_FLIGHT = 2;
  let exportsInFlight = 0;
  app.get('/v1/me/export', { schema: { querystring: NO_QUERY }, ...(heavy ? { preHandler: heavy } : {}) }, async (req, reply) => {
    const userId = req.claims?.sub;
    if (!userId) return reply.code(401).send({ error: 'unauthenticated' });
    if (exportsInFlight >= MAX_EXPORTS_IN_FLIGHT) {
      reply.header('Retry-After', String(RETRY_AFTER_SECONDS));
      return reply.code(503).send({ error: 'unavailable', message: 'other exports are running, try again shortly' });
    }
    exportsInFlight += 1;
    let json: string;
    try {
      const data = await deps.repo.exportUser(userId);
      if (!data) return reply.code(404).send({ error: 'not_found' });
      json = await chunkedJson({
        generatedAt: deps.now(),
        noticeVersion: NOTICE_VERSION,
        /*
         * L-15. This is a DOWNLOADED FILE full of figures, and it is the one a
         * person is most likely to forward to an accountant - and it carried
         * no disclaimer at all while the party export did. "Every exported
         * file" is only true if somebody checks every export, which is now a
         * test rather than a habit.
         */
        notice: EXPORT_DISCLAIMER,
        data,
      });
    } finally {
      exportsInFlight -= 1;
    }
    return reply
      .code(200)
      .header('Content-Disposition', 'attachment; filename="swafto-my-data.json"')
      .header('Content-Type', 'application/json; charset=utf-8')
      .send(json);
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
  app.post('/v1/me/erase/cancel', { schema: { body: NO_BODY } }, async (req, reply) => {
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
      const body = req.body as { phone: string; language: 'od' | 'hi' | 'en' };
      /*
       * C-10 / RT-2. The number is normalised with the SAME function sign-in uses, so
       * `9876500001`, `+91 98765 00001` and `09876500001` find the account the way
       * `+919876500001` does. Something that is not an Indian mobile is refused with a
       * 400 and a message: that says nothing about membership (it is about the
       * SHAPE of what was typed), and it is the only honest answer - the page used to
       * say "sent" for a number nothing was ever sent to.
       */
      const phone = normaliseIndianMobile(body.phone);
      if (!phone) return reply.code(400).send(INVALID_PHONE);

      /*
       * INVITE MODE: WEB DELETION IS PAUSED (founder decision D3). No message channel exists to deliver
       * a deletion code, and the throwing SMS port must never be reached (that would be a 500). The reply
       * is constant for every number and does nothing: no lookup, no limiter write. The page reads
       * `paused` and tells the person to delete in the app (POST /v1/me/erase is unaffected).
       */
      if (deps.authMode === 'invite') return reply.code(202).send({ sent: false, mode: 'invite', paused: true });

      const user = await deps.repo.findUserByPhone(phone);
      const out = await requestOtp(deps, {
        key: deletionKey(phone),
        phone,
        templateId: 'otp_account_deletion',
        language: body.language,
        ip: req.ip,
        user,
        log: req.log,
        // An unregistered number spends the same budget and gets the same answer, but
        // no SMS: texting a stranger that somebody is deleting their account is worse
        // than the timing gap it would hide.
        send: user !== null,
      });
      if (out.kind === 'limited') {
        return reply
          .code(429)
          .header('Retry-After', String(out.decision.retryAfterSeconds))
          .send({ error: 'too_many_requests', retryAfterSeconds: out.decision.retryAfterSeconds });
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
      const body = req.body as { phone: string; code: string; confirm: 'DELETE' };
      const phone = normaliseIndianMobile(body.phone);
      if (!phone) return reply.code(400).send(INVALID_PHONE);

      /*
       * INVITE MODE: THE CONFIRM SIDE IS PAUSED TOO (RTI-4). A deletion code minted in sms mode seconds
       * before the flip must not be able to schedule an erase while the request side is paused. The same
       * bare 401 as a wrong code, before any ticket is taken.
       */
      if (deps.authMode === 'invite') return reply.code(401).send({ error: 'code_invalid' });
      // F-1: digits only; a malformed code costs no attempt.
      if (!/^[0-9]+$/.test(body.code)) return reply.code(400).send({ error: 'invalid_input', message: 'the request is not valid' });

      const checked = await verifyOtp(deps, { key: deletionKey(phone), code: body.code, ip: req.ip });
      if (!checked.ok) {
        if (checked.status === 429) {
          return reply
            .code(429)
            .header('Retry-After', String(checked.retryAfterSeconds))
            .send({ error: 'too_many_requests', retryAfterSeconds: checked.retryAfterSeconds });
        }
        return reply.code(401).send({ error: 'code_invalid' });
      }

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
