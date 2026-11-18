/**
 * PR-7 · THE BILLING FACTS, AS A PORT, WITH BOTH IMPLEMENTATIONS.
 *
 * Its own port rather than five more methods on `Repo`: billing has its own
 * tables, its own webhook caller that has no shop session, and nothing in the
 * ledger reads it. Both implementations live here and `billing.spec.ts` runs
 * one contract against each, as `repo-equivalence.spec.ts` does for the ledger.
 *
 * APPEND-ONLY, LIKE EVERYTHING ELSE (D1). A purchase is bound once; each answer
 * from Google is a new row; a preview is granted once. Nothing here updates.
 */
import { WriteRefused } from '../db/port.ts';
import type { SqlClient } from '../db/postgres.ts';
import type { SubscriptionState } from '@swafto/schema';
import type { Preview, PurchaseState } from './entitlement.ts';

export interface PurchaseBinding {
  readonly purchaseToken: string;
  readonly shopId: string;
  readonly accountId: string;
  readonly productId: string;
  readonly boundAt: string;
}

/** The raw answer kept beside the extracted columns, so a later reading can be re-derived. */
export interface PurchaseStateRow extends PurchaseState {
  readonly snapshot: string;
}

export interface BillingRepo {
  /**
   * Bind a token to a shop. Binding it again to the SAME shop is not an error
   * (a retried verify). Binding it to ANOTHER shop throws `plan_purchases_tenancy`:
   * one shop's purchase must never unlock another's Premium.
   */
  bindPurchase(row: PurchaseBinding): Promise<{ inserted: boolean }>;
  findPurchase(purchaseToken: string): Promise<PurchaseBinding | null>;
  appendPurchaseState(row: PurchaseStateRow): Promise<void>;
  /** Every answer for every token bound to this shop. Never another shop's. */
  purchaseStatesFor(shopId: string): Promise<readonly PurchaseState[]>;
  /** One per shop, ever. A second call returns the first grant, unchanged. */
  grantPreview(shopId: string, preview: Preview): Promise<{ inserted: boolean; preview: Preview }>;
  previewFor(shopId: string): Promise<Preview | null>;
}

export const tokenElsewhere = () =>
  new WriteRefused(
    'plan_purchases_tenancy',
    'this purchase is already registered to another shop, so it cannot unlock this one.',
  );

export function memoryBillingRepo(): BillingRepo {
  const purchases = new Map<string, PurchaseBinding>();
  const states: PurchaseStateRow[] = [];
  const previews = new Map<string, Preview>();
  return {
    async bindPurchase(row) {
      const prev = purchases.get(row.purchaseToken);
      if (prev) {
        if (prev.shopId !== row.shopId) throw tokenElsewhere();
        return { inserted: false };
      }
      purchases.set(row.purchaseToken, { ...row });
      return { inserted: true };
    },
    async findPurchase(token) {
      return purchases.get(token) ?? null;
    },
    async appendPurchaseState(row) {
      // The foreign key the database has.
      if (!purchases.has(row.purchaseToken)) {
        throw new WriteRefused('plan_purchase_states_purchase_token_fkey', 'no such purchase');
      }
      states.push({ ...row });
    },
    async purchaseStatesFor(shopId) {
      return states
        .filter((s) => purchases.get(s.purchaseToken)?.shopId === shopId)
        .map(({ snapshot: _s, ...rest }) => rest);
    },
    async grantPreview(shopId, preview) {
      const prev = previews.get(shopId);
      if (prev) return { inserted: false, preview: prev };
      previews.set(shopId, { ...preview });
      return { inserted: true, preview };
    },
    async previewFor(shopId) {
      return previews.get(shopId) ?? null;
    },
  };
}

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString());

export function pgBillingRepo(sql: SqlClient): BillingRepo {
  const binding = (r: Record<string, unknown>): PurchaseBinding => ({
    purchaseToken: String(r.purchase_token),
    shopId: String(r.shop_id),
    accountId: String(r.account_id),
    productId: String(r.product_id),
    boundAt: iso(r.bound_at),
  });
  const find = async (token: string) => {
    const { rows } = await sql.query('SELECT * FROM plan_purchases WHERE purchase_token = $1', [token]);
    return rows[0] ? binding(rows[0]) : null;
  };
  const previewFor = async (shopId: string): Promise<Preview | null> => {
    const { rows } = await sql.query('SELECT * FROM plan_previews WHERE shop_id = $1', [shopId]);
    return rows[0] ? { startedAt: iso(rows[0].started_at), endsAt: iso(rows[0].ends_at) } : null;
  };
  return {
    async bindPurchase(row) {
      const { rows } = await sql.query(
        `INSERT INTO plan_purchases (purchase_token, shop_id, account_id, product_id, bound_at)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (purchase_token) DO NOTHING RETURNING purchase_token`,
        [row.purchaseToken, row.shopId, row.accountId, row.productId, row.boundAt],
      );
      if (rows.length === 1) return { inserted: true };
      const prev = await find(row.purchaseToken);
      if (prev && prev.shopId !== row.shopId) throw tokenElsewhere();
      return { inserted: false };
    },
    findPurchase: find,
    async appendPurchaseState(row) {
      try {
        await sql.query(
          `INSERT INTO plan_purchase_states
             (purchase_token, google_state, expires_at, auto_renewing, base_plan_id, acknowledged, snapshot, fetched_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            row.purchaseToken,
            row.googleState,
            row.expiresAt,
            row.autoRenewing,
            row.basePlanId,
            row.acknowledged,
            row.snapshot,
            row.fetchedAt,
          ],
        );
      } catch (e) {
        const err = e as { constraint?: string; message?: string };
        if (err.constraint) throw new WriteRefused(err.constraint, err.message ?? 'refused');
        throw e;
      }
    },
    async purchaseStatesFor(shopId) {
      const { rows } = await sql.query(
        `SELECT s.* FROM plan_purchase_states s
           JOIN plan_purchases p ON p.purchase_token = s.purchase_token
          WHERE p.shop_id = $1 ORDER BY s.fetched_at, s.id`,
        [shopId],
      );
      return rows.map((r) => ({
        purchaseToken: String(r.purchase_token),
        googleState: String(r.google_state) as SubscriptionState,
        expiresAt: r.expires_at === null ? null : iso(r.expires_at),
        autoRenewing: r.auto_renewing === true,
        basePlanId: r.base_plan_id === null ? null : String(r.base_plan_id),
        acknowledged: r.acknowledged === true,
        fetchedAt: iso(r.fetched_at),
      }));
    },
    async grantPreview(shopId, preview) {
      const { rows } = await sql.query(
        `INSERT INTO plan_previews (shop_id, started_at, ends_at) VALUES ($1, $2, $3)
         ON CONFLICT (shop_id) DO NOTHING RETURNING shop_id`,
        [shopId, preview.startedAt, preview.endsAt],
      );
      if (rows.length === 1) return { inserted: true, preview };
      return { inserted: false, preview: (await previewFor(shopId))! };
    },
    previewFor,
  };
}
