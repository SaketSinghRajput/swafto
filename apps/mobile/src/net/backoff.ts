/**
 * FE-10: HOW LONG TO LEAVE THE SERVER ALONE AFTER A FAILED DRAIN.
 *
 * Before this the outbox retried on every 30-second tick and every tap, so a
 * 5xx storm turned every phone with a queue into a steady stream of requests,
 * and a 429's `Retry-After` was parsed and then ignored.
 *
 * Exponential from 30 s to a 5-minute ceiling, with "equal jitter" (half fixed,
 * half random) so phones that failed together do not return together, and a
 * server-sent `Retry-After` is a FLOOR - the wait is never shorter than the
 * server asked, and never longer than an hour whatever it asked (a typo in a
 * header must not park the queue for a day).
 *
 * The numbers are chosen, not measured. The clock and the dice are injected so
 * a test fixes both.
 */
export const BACKOFF_BASE_MS = 30_000;
export const BACKOFF_MAX_MS = 300_000;
export const RETRY_AFTER_CAP_MS = 3_600_000;

export class SyncBackoff {
  readonly #clockMs: () => number;
  readonly #random: () => number;
  #failures = 0;
  #notBefore = 0;

  constructor(clockMs: () => number = () => Date.now(), random: () => number = () => Math.random()) {
    this.#clockMs = clockMs;
    this.#random = random;
  }

  /** True while a retry would arrive too soon. */
  get blocked(): boolean {
    return this.#clockMs() < this.#notBefore;
  }

  get failures(): number {
    return this.#failures;
  }

  /** A drain failed (offline, 5xx, 429). Returns the wait that now applies, in ms. */
  fail(retryAfterSeconds?: number): number {
    this.#failures += 1;
    const ceiling = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (this.#failures - 1));
    let wait = ceiling / 2 + (ceiling / 2) * this.#random();
    if (retryAfterSeconds !== undefined && retryAfterSeconds > 0) {
      wait = Math.max(wait, Math.min(retryAfterSeconds * 1000, RETRY_AFTER_CAP_MS));
    }
    this.#notBefore = this.#clockMs() + wait;
    return wait;
  }

  /** A drain got an answer, or the app came to the front: start again from the top. */
  reset(): void {
    this.#failures = 0;
    this.#notBefore = 0;
  }
}
