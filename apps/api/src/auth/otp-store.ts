/**
 * THE PENDING-OTP STORE: its interface, and the in-memory implementation.
 *
 * The Postgres implementation is `otp-store-pg.ts` (C-02) and is what production
 * runs: a per-process map breaks the moment there is a second instance or a restart
 * (a code minted on A cannot be verified on B).
 *
 * EVERY TIME COMES FROM THE CALLER. The store never reads a clock, so the injected
 * test clock and the production clock mean the same thing to both implementations.
 *
 * KEYS. `key` is the phone number for sign-in and `delete:<phone>` for web deletion,
 * so a sign-in code cannot delete a shop and the reverse.
 */

/**
 * WHO WROTE A PENDING ROW, AND FOR WHAT (migration 0005). 'sms' is `requestOtp`; the two
 * invite kinds are written only by the invite CLI. `verifyOtp` returns it so the route can
 * refuse a kind that does not fit the account (INVITE-CODES T2).
 */
export type OtpKind = 'sms' | 'invite_new' | 'invite_recovery';

export interface PendingOtp {
  readonly phone: string;
  /** HMAC of the code. The code itself is never written anywhere. */
  readonly hash: string;
  readonly expiresAt: string;
  /** Wrong guesses so far, across every source address. */
  readonly attempts: number;
  /** When this code was minted. Drives the resend cooldown. */
  readonly createdAt: string;
  /** Absent means 'sms', so `requestOtp` and every pre-invite caller need no edit. */
  readonly kind?: OtpKind;
}

export interface OtpStore {
  /**
   * Store a new code, unless a live code was minted less than `cooldownSeconds` ago -
   * then nothing is changed and `false` is returned (RT-3 path 3: a stranger's request
   * must not silently invalidate a code still in its window). An expired row is
   * ignored and overwritten. The decision and the write are one atomic step.
   */
  put(pending: PendingOtp, cooldownSeconds: number): Promise<boolean>;
  /** The live code for `key` at `nowIso`; an expired one is treated as absent. */
  get(key: string, nowIso: string): Promise<PendingOtp | null>;
  /**
   * RT2-2 / RT2-1 - TAKE AN ATTEMPT TICKET BEFORE COMPARING. One atomic step: if a live
   * code exists and has used fewer than `cap` attempts, count one and return its hash;
   * otherwise return null WITHOUT the caller comparing anything. Counting after the
   * comparison (get, compare, then bump) let a concurrent burst compare far more than
   * `cap` guesses against one code: every caller read the code before any had counted.
   */
  takeAttempt(
    key: string,
    nowIso: string,
    cap: number,
  ): Promise<{ readonly hash: string; readonly attempts: number; readonly kind: OtpKind } | null>;
  /**
   * Delete the code. `true` only for the caller that actually removed it (single use). With `onlyHash` it is a
   * COMPARE-AND-DELETE: the row goes only if it still holds that hash, so a verify that compared an OLD row
   * cannot delete the row an operator re-issued in the meantime (RTI-1, RTI-2).
   */
  clear(key: string, onlyHash?: string): Promise<boolean>;
}

export const MEMORY_OTP_MAX_ENTRIES = 10_000;

/**
 * Bounded and expiring. Without a bound, an unauthenticated loop over phone numbers
 * grows this map until the process dies (SEC-110). On reaching the cap, expired
 * entries go first, then the oldest.
 */
export function memoryOtpStore(opts: { readonly maxEntries?: number } = {}): OtpStore {
  const max = opts.maxEntries ?? MEMORY_OTP_MAX_ENTRIES;
  const byKey = new Map<string, PendingOtp>();
  const live = (p: PendingOtp, nowIso: string) => Date.parse(p.expiresAt) > Date.parse(nowIso);

  return {
    async put(pending, cooldownSeconds) {
      const existing = byKey.get(pending.phone);
      if (
        existing &&
        live(existing, pending.createdAt) &&
        // A LIVE INVITE IS NEVER OVERWRITTEN (INVITE-CODES; WHATSAPP-OTP): only the CLI replaces one.
        ((existing.kind ?? 'sms') !== 'sms' ||
          Date.parse(existing.createdAt) > Date.parse(pending.createdAt) - cooldownSeconds * 1000)
      ) {
        return false;
      }
      byKey.delete(pending.phone); // re-insert at the end: Map order is age order
      if (byKey.size >= max) {
        for (const [k, p] of byKey) if (!live(p, pending.createdAt)) byKey.delete(k);
        while (byKey.size >= max) byKey.delete(byKey.keys().next().value as string);
      }
      byKey.set(pending.phone, pending);
      return true;
    },
    async get(key, nowIso) {
      const p = byKey.get(key);
      if (!p) return null;
      if (!live(p, nowIso)) {
        byKey.delete(key);
        return null;
      }
      return p;
    },
    async takeAttempt(key, nowIso, cap) {
      const p = byKey.get(key);
      if (!p || !live(p, nowIso) || p.attempts >= cap) return null;
      byKey.set(key, { ...p, attempts: p.attempts + 1 }); // check and count: no await between
      return { hash: p.hash, attempts: p.attempts + 1, kind: p.kind ?? 'sms' };
    },
    async clear(key, onlyHash) {
      if (onlyHash !== undefined && byKey.get(key)?.hash !== onlyHash) return false;
      return byKey.delete(key);
    },
  };
}
