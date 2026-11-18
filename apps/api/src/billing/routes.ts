/**
 * PR-7 · THE FOUR BILLING ROUTES.
 *
 *   GET  /v1/billing/entitlement   what the plan is now, derived on read
 *   POST /v1/billing/preview       the 14-day preview, once per shop, idempotent
 *   POST /v1/billing/play/verify   a purchase token from the phone -> Google -> bound
 *   POST /v1/billing/play/rtdn     Google's Pub/Sub push; a HINT, never a fact
 *
 * THE SHOP IS `shopOf()` AND NOTHING ELSE (S-11). The phone sends a purchase
 * token and a product id; which shop it is for comes from the session, and the
 * token must ALSO carry that shop's `obfuscatedAccountId`, and must not already
 * be bound to another shop. Three independent reasons a stolen or shared token
 * cannot unlock a second shop.
 *
 * NOTHING THE PHONE SAYS ABOUT THE PURCHASE IS BELIEVED. Its token is only a key
 * to ask Google with. State, expiry and renewal come from `subscriptionsv2.get`.
 * The same holds for the webhook: an RTDN says only "something changed", so it
 * is authenticated, then the state is fetched again (R4 §2).
 */
import { errorFields } from '../error-event.ts';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { shopOf, type AppDeps } from '../app.ts';
import { WriteRefused } from '../db/port.ts';
import type { BillingConfig } from '../config.ts';
import type { BillingRepo, PurchaseStateRow } from './repo.ts';
import { PlayApiError, verifyPushToken, type GoogleKeys, type PlayDeveloperApi, type SubscriptionV2 } from './google.ts';
import { accountIdFor, entitlementOf, previewEnd, type Entitlement } from './entitlement.ts';
import { SUBSCRIPTION_STATES, type SubscriptionState } from '@swafto/schema';

export interface BillingDeps {
  readonly repo: BillingRepo;
  readonly config: BillingConfig;
  /** Null until R4-HA3 and HA4 exist: verify and the webhook then refuse. */
  readonly play: PlayDeveloperApi | null;
  readonly keys: GoogleKeys | null;
}

export const RTDN_ROUTE = '/v1/billing/play/rtdn';

/**
 * The Pub/Sub push envelope, as strictly as it can be stated WITHOUT turning a poison
 * message into a retry loop. Types are enforced (`message` an object, `data` a string),
 * which Pub/Sub always satisfies; nothing is `required` and extra fields are allowed,
 * because a push that lacks `data`, or carries a field Google added later, is still
 * answered 204 by the handler and refusing it with a 400 would make Pub/Sub redeliver it
 * for ever (see the comment on the route).
 */
export const RTDN_BODY = {
  type: 'object',
  additionalProperties: true,
  properties: {
    message: {
      type: 'object',
      additionalProperties: true,
      properties: {
        data: { type: 'string', description: 'base64 of the DeveloperNotification JSON' },
        messageId: { type: 'string' },
      },
    },
    subscription: { type: 'string' },
  },
} as const;

const refuse = (reply: FastifyReply, status: number, error: string, message: string) =>
  reply.code(status).send({ error, message });

export function registerBillingRoutes(app: FastifyInstance, deps: AppDeps): void {
  const billing = deps.billing;

  const closed = (reply: FastifyReply) =>
    refuse(
      reply,
      503,
      'billing_not_configured',
      'Buying Premium is not open on this server yet. Missing: ' +
        (billing ? billing.config.missing.join(', ') : 'billing') +
        '.',
    );

  const entitlement = async (shopId: string): Promise<Entitlement> =>
    entitlementOf(
      { states: await billing!.repo.purchaseStatesFor(shopId), preview: await billing!.repo.previewFor(shopId) },
      deps.now(),
    );

  /** What the phone needs to start a purchase, or null while buying is closed. */
  const buying = (shopId: string) =>
    billing?.play && billing.config.accountKey && billing.config.play
      ? {
          packageName: billing.config.play.packageName,
          productId: billing.config.play.productId,
          accountId: accountIdFor(billing.config.accountKey, shopId),
        }
      : null;

  app.get(
    '/v1/billing/entitlement',
    { schema: { querystring: { type: 'object', additionalProperties: false } } },
    async (req, reply) => {
      if (!billing) return closed(reply);
      const shopId = shopOf(req);
      return { entitlement: await entitlement(shopId), buying: buying(shopId) };
    },
  );

  app.post(
    '/v1/billing/preview',
    { schema: { body: { type: 'object', additionalProperties: false, properties: {} } } },
    async (req, reply) => {
      if (!billing) return closed(reply);
      const shopId = shopOf(req);
      const before = await entitlement(shopId);
      // A shop already paying keeps its one preview for another day.
      if (before.source === 'purchase') {
        return refuse(reply, 409, 'already_premium', 'Premium is already on for this shop.');
      }
      const startedAt = deps.now();
      const { inserted } = await billing.repo.grantPreview(shopId, { startedAt, endsAt: previewEnd(startedAt) });
      return { started: inserted, entitlement: await entitlement(shopId), buying: buying(shopId) };
    },
  );

  /** Google's answer, as the row we append. An unknown state is refused, not guessed. */
  const stateRow = (token: string, sub: SubscriptionV2, productId: string): PurchaseStateRow => {
    const state = sub.subscriptionState;
    if (!state || !(SUBSCRIPTION_STATES as readonly string[]).includes(state)) {
      throw new PlayApiError(502, 'subscriptionsv2.get (an unknown subscriptionState)');
    }
    const line = (sub.lineItems ?? []).find((l) => l.productId === productId);
    return {
      purchaseToken: token,
      googleState: state as SubscriptionState,
      expiresAt: line?.expiryTime ? new Date(line.expiryTime).toISOString() : null,
      autoRenewing: line?.autoRenewingPlan?.autoRenewEnabled === true,
      basePlanId: line?.offerDetails?.basePlanId ?? null,
      acknowledged: sub.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      snapshot: JSON.stringify(sub),
      fetchedAt: deps.now(),
    };
  };

  app.post(
    '/v1/billing/play/verify',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['purchaseToken', 'productId'],
          properties: {
            purchaseToken: { type: 'string', minLength: 1, maxLength: 512 },
            productId: { type: 'string', minLength: 1, maxLength: 200 },
          },
        },
      },
    },
    async (req, reply) => {
      if (!billing?.play || !billing.config.accountKey || !billing.config.play) return closed(reply);
      const play = billing.play;
      const config = billing.config.play;
      const shopId = shopOf(req);
      const { purchaseToken, productId } = req.body as { purchaseToken: string; productId: string };

      if (productId !== config.productId) {
        return refuse(reply, 400, 'wrong_product', 'That is not the Premium subscription.');
      }
      // Bound to another shop already: refused before Google is asked, and never acknowledged.
      const bound = await billing.repo.findPurchase(purchaseToken);
      if (bound && bound.shopId !== shopId) {
        return refuse(reply, 409, 'purchase_belongs_elsewhere', 'This purchase is registered to another shop.');
      }

      let sub: SubscriptionV2;
      try {
        sub = await play.getSubscription(config.packageName, purchaseToken);
      } catch (e) {
        if (e instanceof PlayApiError && [400, 404, 410].includes(e.status)) {
          return refuse(reply, 400, 'purchase_not_found', 'Google does not know this purchase.');
        }
        req.log.error({ err: errorFields(e) }, 'play verify failed');
        return refuse(reply, 502, 'play_unreachable', 'Google Play could not be asked just now. Try again.');
      }

      const accountId = accountIdFor(billing.config.accountKey, shopId);
      if (sub.externalAccountIdentifiers?.obfuscatedExternalAccountId !== accountId) {
        // Not acknowledged: Google refunds an unacknowledged purchase on its own (R4 §1.5).
        return refuse(reply, 403, 'purchase_not_for_this_shop', 'This purchase was not made for this shop.');
      }
      if (!(sub.lineItems ?? []).some((l) => l.productId === productId)) {
        return refuse(reply, 400, 'wrong_product', 'That purchase is not the Premium subscription.');
      }

      try {
        await billing.repo.bindPurchase({ purchaseToken, shopId, accountId, productId, boundAt: deps.now() });
      } catch (e) {
        if (e instanceof WriteRefused) {
          return refuse(reply, 409, 'purchase_belongs_elsewhere', 'This purchase is registered to another shop.');
        }
        throw e;
      }
      const row = stateRow(purchaseToken, sub, productId);
      await billing.repo.appendPurchaseState(row);

      const payable =
        row.googleState === 'SUBSCRIPTION_STATE_ACTIVE' || row.googleState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD';
      if (payable && !row.acknowledged) {
        try {
          await play.acknowledge(config.packageName, productId, purchaseToken);
        } catch (e) {
          // Retrying verify is safe: the binding is idempotent and a second state row changes nothing.
          req.log.error({ err: errorFields(e) }, 'play acknowledge failed');
          return refuse(
            reply,
            502,
            'acknowledge_failed',
            'The purchase is recorded; confirming it with Google failed. Try again.',
          );
        }
      }
      return { entitlement: await entitlement(shopId), buying: buying(shopId) };
    },
  );

  /*
   * THE WEBHOOK. It carries no SWAFTO session - it is Google's Pub/Sub, not a
   * phone - and is authenticated by Google's OIDC token instead. The body is
   * loose on purpose: Pub/Sub may add fields, and refusing them would become
   * redelivery for ever. Any 2xx is an acknowledgement to Pub/Sub.
   */
  app.post(RTDN_ROUTE, { schema: { body: RTDN_BODY } }, async (req, reply) => {
    if (!billing?.play || !billing.keys || !billing.config.play) return closed(reply);
    const config = billing.config.play;
    const header = req.headers.authorization;
    const ok =
      typeof header === 'string' &&
      header.startsWith('Bearer ') &&
      (await verifyPushToken(
        header.slice(7),
        { audience: config.rtdnAudience, email: config.rtdnEmail },
        billing.keys,
        deps.now(),
      ));
    if (!ok) return refuse(reply, 401, 'unauthenticated', 'not a push this server accepts');

    let note: {
      packageName?: string;
      subscriptionNotification?: { purchaseToken?: string };
      voidedPurchaseNotification?: { purchaseToken?: string };
    };
    try {
      const data = (req.body as { message?: { data?: string } } | null)?.message?.data ?? '';
      note = JSON.parse(Buffer.from(data, 'base64').toString('utf8')) as typeof note;
    } catch {
      // Malformed for ever: acknowledge it, or Pub/Sub redelivers it for ever.
      return reply.code(204).send();
    }
    const token = note.subscriptionNotification?.purchaseToken ?? note.voidedPurchaseNotification?.purchaseToken;
    if (note.packageName !== config.packageName || !token) return reply.code(204).send();

    // A token nobody has verified yet belongs to no shop; the phone's verify will bind it.
    const bound = await billing.repo.findPurchase(token);
    if (!bound) return reply.code(204).send();

    // The notification's own claims are ignored. Google is asked, and its answer appended.
    // A failure here is a 500, which Pub/Sub retries.
    const sub = await billing.play.getSubscription(config.packageName, token);
    await billing.repo.appendPurchaseState(stateRow(token, sub, bound.productId));
    return reply.code(204).send();
  });
}
