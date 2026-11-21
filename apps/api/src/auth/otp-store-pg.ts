/**
 * THE POSTGRES OTP STORE (C-02). Shared by every API instance and surviving a restart.
 *
 * Table, created by the API-DATA migration - this file codes against exactly this:
 *   otp_pending(phone text primary key, code_hash text not null,
 *               expires_at timestamptz not null, attempts integer not null default 0,
 *               created_at timestamptz not null default now(),
 *               kind text not null default 'sms')      -- migration 0005
 *
 * `phone` holds the sign-in number or `delete:<number>`. The code itself is never
 * stored - `code_hash` is the HMAC `hashOtp` produced - and the limiter's own table
 * is a keyed hash for the same reason. A pending row is a phone number, though, so
 * rows are removed on use and expired ones are swept on every send.
 *
 * All times are PARAMETERS taken from the caller's clock, never `now()`, so a test
 * that holds the clock still means the same thing here as in the memory store.
 *
 * Same `sql` style as `rate-limit/store.ts`: a `query(text, params)` and nothing else.
 */
import type { SqlRunner } from '../rate-limit/store.ts';
import type { OtpKind, OtpStore, PendingOtp } from './otp-store.ts';

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString());

export function pgOtpStore(sql: Pick<SqlRunner, 'query'>): OtpStore {
  return {
    async put(pending, cooldownSeconds) {
      // Housekeeping first: an expired row is dead weight and a stored phone number.
      await sql.query('DELETE FROM otp_pending WHERE expires_at <= $1::timestamptz', [
        pending.createdAt,
      ]);
      const cooledBefore = new Date(Date.parse(pending.createdAt) - cooldownSeconds * 1000);
      /*
       * One statement: insert, or overwrite ONLY if the old row is expired or older
       * than the cooldown. Zero rows back means a live, recent code was kept.
       */
      const res = await sql.query(
        `INSERT INTO otp_pending (phone, code_hash, expires_at, attempts, created_at, kind)
         VALUES ($1, $2, $3::timestamptz, 0, $4::timestamptz, $6)
         ON CONFLICT (phone) DO UPDATE
           SET code_hash = EXCLUDED.code_hash,
               expires_at = EXCLUDED.expires_at,
               attempts = 0,
               created_at = EXCLUDED.created_at,
               kind = EXCLUDED.kind
           WHERE otp_pending.expires_at <= $4::timestamptz
              OR (otp_pending.created_at <= $5::timestamptz AND otp_pending.kind = 'sms')
         RETURNING phone`,
        [pending.phone, pending.hash, pending.expiresAt, pending.createdAt, cooledBefore.toISOString(), pending.kind ?? 'sms'],
      );
      return res.rows.length === 1;
    },

    async get(key, nowIso) {
      const res = await sql.query(
        `SELECT phone, code_hash, expires_at, attempts, created_at, kind
           FROM otp_pending WHERE phone = $1 AND expires_at > $2::timestamptz`,
        [key, nowIso],
      );
      const r = res.rows[0];
      if (!r) return null;
      const out: PendingOtp = {
        phone: String(r.phone),
        hash: String(r.code_hash),
        expiresAt: iso(r.expires_at),
        attempts: Number(r.attempts),
        createdAt: iso(r.created_at),
        kind: String(r.kind) as OtpKind,
      };
      return out;
    },

    async takeAttempt(key, nowIso, cap) {
      // One statement: the cap and the count cannot be separated by a concurrent caller.
      const res = await sql.query(
        `UPDATE otp_pending SET attempts = attempts + 1
          WHERE phone = $1 AND attempts < $3 AND expires_at > $2::timestamptz
          RETURNING code_hash, attempts, kind`,
        [key, nowIso, cap],
      );
      const row = res.rows[0];
      return row ? { hash: String(row.code_hash), attempts: Number(row.attempts), kind: String(row.kind) as OtpKind } : null;
    },

    async clear(key, onlyHash) {
      // One statement, so the hash test and the delete cannot be separated by a re-issue (RTI-1, RTI-2).
      const res = await sql.query(
        'DELETE FROM otp_pending WHERE phone = $1 AND ($2::text IS NULL OR code_hash = $2) RETURNING phone',
        [key, onlyHash ?? null],
      );
      return res.rows.length === 1;
    },
  };
}
