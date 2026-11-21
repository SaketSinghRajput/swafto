/**
 * THE INVITE-CODE SQL: what the CLI writes and what the nightly job sweeps.
 *
 * An invite is a long-lived `otp_pending` row that a person wrote instead of `requestOtp`
 * (docs/auth/INVITE-CODES.md). Nothing here ever sees a code except `issueInvite`, which is given
 * the HASH; the plaintext lives in the CLI for the length of one function and is printed once.
 *
 * The audit row holds NO code and NO full number: `phone_hmac` is HMAC-SHA256 under RATE_LIMIT_KEY
 * (domain-separated from the limiter's buckets), `phone_masked` the last four digits. Every write
 * that changes `otp_pending` and its audit row is ONE transaction on ONE connection.
 */
import { createHmac } from 'node:crypto';
import { INVITE_AUDIT_RETENTION_MONTHS } from '@swafto/schema';
import type { SqlClient } from '../db/postgres.ts';
import { hashOtp } from '../auth/tokens.ts';
import { maskPhone } from '../auth/demo.ts';

export type InviteKind = 'invite_new' | 'invite_recovery';
export type InvitePurpose = 'new' | 'recovery';

/** A new-shop invite lives a week. */
export const INVITE_NEW_TTL_SECONDS = 7 * 24 * 60 * 60;
/**
 * A RECOVERY invite lives 24 HOURS (founder decision D2): it signs in to an EXISTING shop, and it is
 * delivered over WhatsApp, which is an accepted residual risk. The short life is the mitigation.
 */
export const INVITE_RECOVERY_TTL_SECONDS = 24 * 60 * 60;

export const kindOf = (purpose: InvitePurpose): InviteKind => (purpose === 'new' ? 'invite_new' : 'invite_recovery');
export const ttlOf = (purpose: InvitePurpose): number =>
  purpose === 'new' ? INVITE_NEW_TTL_SECONDS : INVITE_RECOVERY_TTL_SECONDS;

/** `4821 0937`. Display only: the code is stored and compared ungrouped. */
export const formatCode = (code: string): string => code.replace(/(\d{4})(?=\d)/g, '$1 ');

export const auditHmac = (rateLimitKey: string, phone: string): string =>
  createHmac('sha256', rateLimitKey).update('invite-audit|' + phone).digest('base64url');

/** A transaction on one connection (`reserve`), or the client itself when it already is one. */
async function inTransaction<T>(sql: SqlClient, fn: (c: SqlClient) => Promise<T>): Promise<T> {
  const run = async (c: SqlClient): Promise<T> => {
    await c.query('BEGIN');
    try {
      const out = await fn(c);
      await c.query('COMMIT');
      return out;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    }
  };
  return sql.reserve ? sql.reserve(run) : run(sql);
}

const AUDIT_INSERT =
  'INSERT INTO invite_audit (at, action, kind, phone_hmac, phone_masked, ticket) VALUES ($1::timestamptz, $2, $3, $4, $5, $6)';

/**
 * Issue: ONE transaction that replaces any older code for the number (unconditional upsert, attempts back
 * to 0, so the older code is dead the moment this commits) and writes the `issue` audit row.
 */
export async function issueInvite(
  sql: SqlClient,
  o: { phone: string; code: string; purpose: InvitePurpose; ticket: string; now: Date; signingKey: string; rateLimitKey: string },
): Promise<{ expiresAt: string; kind: InviteKind }> {
  const kind = kindOf(o.purpose);
  const at = o.now.toISOString();
  const expiresAt = new Date(o.now.getTime() + ttlOf(o.purpose) * 1000).toISOString();
  await inTransaction(sql, async (c) => {
    await c.query(
      `INSERT INTO otp_pending (phone, code_hash, expires_at, attempts, created_at, kind)
       VALUES ($1, $2, $3::timestamptz, 0, $4::timestamptz, $5)
       ON CONFLICT (phone) DO UPDATE
         SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at,
             attempts = 0, created_at = EXCLUDED.created_at, kind = EXCLUDED.kind`,
      [o.phone, hashOtp(o.signingKey, o.phone, o.code), expiresAt, at, kind],
    );
    await c.query(AUDIT_INSERT, [at, 'issue', kind, auditHmac(o.rateLimitKey, o.phone), maskPhone(o.phone), o.ticket]);
  });
  return { expiresAt, kind };
}

/** Revoke: delete a live INVITE row (never an SMS code) and write the `revoke` audit row, one transaction. */
export async function revokeInvite(
  sql: SqlClient,
  o: { phone: string; ticket: string; now: Date; rateLimitKey: string },
): Promise<{ revoked: boolean }> {
  return inTransaction(sql, async (c) => {
    const res = await c.query(
      `DELETE FROM otp_pending WHERE phone = $1 AND kind IN ('invite_new', 'invite_recovery') RETURNING kind`,
      [o.phone],
    );
    const kind = res.rows[0] ? String(res.rows[0].kind) : null;
    await c.query(AUDIT_INSERT, [o.now.toISOString(), 'revoke', kind, auditHmac(o.rateLimitKey, o.phone), maskPhone(o.phone), o.ticket]);
    return { revoked: kind !== null };
  });
}

export interface InviteListing {
  readonly masked: string;
  readonly kind: InviteKind;
  readonly expiresAt: string;
  readonly attempts: number;
  readonly live: boolean;
}

/** Masked rows only. There is no code to show: the table holds a hash. */
export async function listInvites(sql: SqlClient, now: Date): Promise<InviteListing[]> {
  const res = await sql.query(
    `SELECT phone, kind, expires_at, attempts FROM otp_pending WHERE kind <> 'sms' ORDER BY expires_at`,
  );
  return res.rows.map((r) => {
    const expires = r.expires_at instanceof Date ? r.expires_at : new Date(String(r.expires_at));
    return {
      masked: maskPhone(String(r.phone)),
      kind: String(r.kind) as InviteKind,
      expiresAt: expires.toISOString(),
      attempts: Number(r.attempts),
      live: expires.getTime() > now.getTime(),
    };
  });
}

/** Nightly: an expired row is a stored phone number nobody can use (DPDP minimisation). Returns the count. */
export async function sweepExpiredOtp(sql: Pick<SqlClient, 'query'>, nowIso: string): Promise<number> {
  const res = await sql.query('DELETE FROM otp_pending WHERE expires_at <= $1::timestamptz RETURNING phone', [nowIso]);
  return res.rows.length;
}

/**
 * Nightly: audit rows older than INVITE_AUDIT_RETENTION_MONTHS (12, decision D4). The append-only trigger
 * refuses a DELETE unless this transaction sets the flag AND the row is that old, so the purge cannot
 * remove recent history even by mistake.
 */
export async function purgeInviteAudit(sql: SqlClient, nowIso: string): Promise<number> {
  const cutoff = new Date(nowIso);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - INVITE_AUDIT_RETENTION_MONTHS);
  return inTransaction(sql, async (c) => {
    await c.query("SET LOCAL swafto.invite_audit_purge = 'on'");
    const res = await c.query('DELETE FROM invite_audit WHERE at < $1::timestamptz RETURNING id', [cutoff.toISOString()]);
    return res.rows.length;
  });
}
