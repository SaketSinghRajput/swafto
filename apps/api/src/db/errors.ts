/**
 * WHICH FAILURES ARE THE DATABASE BEING UNAVAILABLE, AND WHICH ARE THE ROW BEING WRONG.
 *
 * The distinction is the whole of BE-11 / ARCH-04. A sync push is a batch, and a
 * row the ledger REFUSES (a closed day, an append-only violation, a bad figure) is
 * reported per row so the phone can stop retrying that row. A pool that is
 * exhausted, a connection that was reset, a statement that timed out is not the
 * row's fault: reporting it per row as "rejected" told the phone to stop retrying
 * rows that were perfectly good, inside a 200. Those must be a 503 with
 * `Retry-After`, so the outbox keeps the rows and tries again.
 *
 * A WHITELIST OF "THIS IS INFRASTRUCTURE", NOT OF "THIS IS A REFUSAL". An unknown
 * error stays a per-row refusal with a generic message: retrying a deterministic
 * bug for ever is its own outage.
 */
const INFRA_PG_CLASSES = ['08', '53', '57', '58'];
/** 40001 serialization failure, 40P01 deadlock: retry is the right answer. */
const INFRA_PG_CODES = new Set(['40001', '40P01', '55P03']);
const INFRA_NODE_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'EHOSTUNREACH',
  'ENOTFOUND',
  'ECONNABORTED',
]);
const INFRA_MESSAGES =
  /timeout exceeded when trying to connect|connection terminated|client has encountered a connection error|too many clients|remaining connection slots|pool is draining|cannot use a pool after calling end|canceling statement due to statement timeout|database system is (starting up|shutting down)/i;

export function isInfraError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { code?: unknown; message?: unknown };
  if (typeof e.code === 'string') {
    if (INFRA_PG_CODES.has(e.code)) return true;
    if (INFRA_NODE_CODES.has(e.code)) return true;
    if (e.code.length === 5 && INFRA_PG_CLASSES.includes(e.code.slice(0, 2))) return true;
  }
  return typeof e.message === 'string' && INFRA_MESSAGES.test(e.message);
}

/**
 * RT-W4-1 · SQLSTATE CLASS 22 (data exception: 22021 invalid byte sequence, 22P02 bad text
 * representation, 22001 too long, 22003 out of range) means the VALUE was unacceptable. That is a
 * 400 from the caller's side, never a 500 and never a level-50 event.
 */
export function isClientDataError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && /^22[0-9A-Z]{3}$/.test(code);
}

/** Seconds a client is told to wait. Short: the usual cause is a blip or a deploy. */
export const RETRY_AFTER_SECONDS = 5;
