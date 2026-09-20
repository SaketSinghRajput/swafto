/**
 * THE DPDP ENDPOINTS. The Act's obligations as routes rather than as intentions.
 *
 * LEGAL-AUDIT §1 lists what the Digital Personal Data Protection Act 2023 and the
 * DPDP Rules 2025 require of a fiduciary holding a shopkeeper's records and his
 * customers' names. Five of those obligations are things software must DO, and
 * until this file existed each of them was a paragraph:
 *
 *   §1.1  an itemised notice, before processing            GET  /v1/legal/notice
 *   §1.2  consent, and withdrawal as easy as giving        POST /v1/consent
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
import { newId } from '../auth/tokens.ts';

/**
 * The notice version, carried on every consent record - so changing the notice and
 * re-asking is something the data can express, and something an auditor can see.
 */
export const NOTICE_VERSION = '2026-09-1';

export const CONSENT_PURPOSES = [
  'account_and_ledger',
  'sms_reminders',
  'crash_diagnostics',
] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

/**
 * The itemised notice. ITEMISED is the operative word: the DPDP Rules require the
 * notice to list specifically what is collected and why, not to state generally
 * that data may be processed for business purposes.
 */
const NOTICE = {
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
    '/v1/consent',
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
  app.get('/v1/me/consents', async (req, reply) => {
    const userId = req.claims?.sub;
    if (!userId) return reply.code(401).send({ error: 'unauthenticated' });
    return reply.code(200).send({
      noticeVersion: NOTICE_VERSION,
      consents: await deps.repo.consentsFor(userId),
    });
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
      await deps.repo.purgeShop(shopId, now);

      return reply.code(200).send({
        requestedAt: now,
        liveDataErased: true,
        /*
         * Said plainly rather than rounded up to "immediately". Backups rotate,
         * and a promise of instant erasure from them is one nobody can keep.
         */
        backupsErasedWithinDays: 90,
        message:
          'Your shop book has been erased from the live system. Encrypted backups ' +
          'rotate out within 90 days and are not restored after this point.',
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
