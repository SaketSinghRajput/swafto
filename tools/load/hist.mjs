/**
 * A MERGEABLE LATENCY HISTOGRAM, dependency-free.
 *
 * `perf_hooks.createHistogram()` cannot be sent between processes, and the load
 * generator is several processes (so that the generator is not the bottleneck).
 * This one is an array of counts over log-spaced buckets, so two of them merge by
 * adding arrays and they travel as JSON.
 *
 * Bucket i covers (GROWTH^(i-1), GROWTH^i] microseconds, GROWTH = 1.01, so a
 * reported percentile is the bucket's upper edge: at most 1 % above the true
 * sample. That is the precision of every latency figure this tool prints.
 */
const GROWTH = 1.01;
const LOG_G = Math.log(GROWTH);
// 1 us .. ~1000 s.
const BUCKETS = Math.ceil(Math.log(1e9) / LOG_G) + 1;

export class Hist {
  constructor() {
    this.counts = new Array(BUCKETS).fill(0);
    this.n = 0;
    this.max = 0;
    this.elapsed = 0;
  }
  /** @param {number} ms */
  record(ms) {
    const us = Math.max(1, Math.round(ms * 1000));
    const i = Math.min(BUCKETS - 1, Math.ceil(Math.log(us) / LOG_G));
    this.counts[i] += 1;
    this.n += 1;
    this.elapsed += ms;
    if (ms > this.max) this.max = ms;
  }
  merge(other) {
    for (let i = 0; i < BUCKETS; i += 1) this.counts[i] += other.counts[i];
    this.n += other.n;
    this.elapsed += other.elapsed;
    if (other.max > this.max) this.max = other.max;
  }
  /** @param {number} q 0..1 - returns milliseconds. */
  quantile(q) {
    if (this.n === 0) return 0;
    const target = Math.ceil(q * this.n);
    let seen = 0;
    for (let i = 0; i < BUCKETS; i += 1) {
      seen += this.counts[i];
      if (seen >= target) return Math.min(this.max, Math.pow(GROWTH, i) / 1000);
    }
    return this.max;
  }
  summary() {
    return {
      n: this.n,
      mean: this.n ? round(this.elapsed / this.n) : 0,
      p50: round(this.quantile(0.5)),
      p95: round(this.quantile(0.95)),
      p99: round(this.quantile(0.99)),
      max: round(this.max),
    };
  }
  toJSON() {
    // Sparse: only the non-empty buckets travel.
    const sparse = [];
    this.counts.forEach((c, i) => c && sparse.push([i, c]));
    return { n: this.n, max: this.max, elapsed: this.elapsed, sparse };
  }
  static from(json) {
    const h = new Hist();
    h.n = json.n;
    h.max = json.max;
    h.elapsed = json.elapsed;
    for (const [i, c] of json.sparse) h.counts[i] = c;
    return h;
  }
}

export const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
