/**
 * `rate_events` IN MEMORY - so the route tests exercise the REAL limiter.
 *
 * WHY NOT A SECOND LIMITER. The obvious way to rate-limit a route test without a
 * database is to write a small in-memory limiter. That would be a second
 * implementation of windows, lockouts and telemetry-only rules, and the two would
 * agree right up until somebody changed one. The rate limiter is the piece of this
 * system most likely to be quietly wrong in production while right in tests.
 *
 * So the LIMITER is the real one and only its table is faked. It issues three
 * statement shapes; each is implemented here against an array.
 *
 * IT REFUSES ANYTHING IT DOES NOT RECOGNISE, and that throw is the point. A runner
 * returning `{rows: []}` for an unknown statement would let a changed query quietly
 * become "no events found", which reads as "always allowed" - a rate limiter turned
 * off with nothing failing. If the limiter's SQL changes, this stops the suite
 * instead of passing it.
 */
import type { SqlRunner } from './store.ts';

interface Row {
  id: number;
  bucket: string;
  at: string;
}

export function memorySql(): SqlRunner & { readonly rows: () => readonly Row[] } {
  const rows: Row[] = [];
  let nextId = 1;

  return {
    async query(sql, params) {
      const text = sql.replace(/\s+/g, ' ').trim();

      /*
       * The lockout probe. It was missing from the first version of this file and
       * the suite failed immediately with the statement quoted back at it - which
       * is the whole argument for throwing rather than returning an empty result.
       * Had it returned `{rows: []}`, every lockout would have read as "no lockout"
       * and the tests would have passed against a limiter that never blocks.
       */
      if (text.startsWith('SELECT max(at)')) {
        const [bucket, since] = params as [string, string];
        const hits = rows.filter((r) => r.bucket === bucket && r.at > since);
        const newest = hits.length
          ? hits.reduce((a, b) => (a.at > b.at ? a : b)).at
          : null;
        return { rows: [{ newest }] };
      }

      if (text.startsWith('SELECT count(*)')) {
        const [bucket, since] = params as [string, string];
        // ISO-8601 UTC strings compare correctly as strings, which is why they are used.
        const n = rows.filter((r) => r.bucket === bucket && r.at > since).length;
        return { rows: [{ n }] };
      }

      if (text.startsWith('INSERT INTO rate_events')) {
        const [bucket, at] = params as [string, string];
        rows.push({ id: nextId, bucket, at });
        nextId += 1;
        return { rows: [] };
      }

      if (text.startsWith('DELETE FROM rate_events')) {
        const [cutoff] = params as [string];
        const doomed = rows.filter((r) => r.at < cutoff);
        for (const d of doomed) rows.splice(rows.indexOf(d), 1);
        return { rows: doomed.map((d) => ({ id: d.id })) };
      }

      throw new Error(
        'the in-memory rate_events runner does not implement: ' +
          text +
          '. It refuses rather than returning an empty result, because an empty ' +
          'result here reads as "no events", which reads as "always allowed" - a ' +
          'rate limiter switched off with nothing failing.',
      );
    },

    rows: () => rows,
  };
}
