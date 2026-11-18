/**
 * ONE CONNECTION PER UNIT OF WORK.
 *
 * `purgeShop` performs a DPDP erasure. It can only do so inside a transaction
 * carrying `SET LOCAL swafto.erasure = 'on'`, because that setting is the only
 * thing that persuades the append-only trigger to permit a DELETE at all.
 *
 * Both production callers pass a `pg.Pool` (`server.ts`, `jobs/purge-due.ts`),
 * and a Pool answers each `query` on whichever connection happens to be free.
 * So before `SqlClient.reserve` existed, the `SET LOCAL` could be applied to
 * one backend while the DELETEs it authorises ran on others - the trigger
 * refused them, and the erasure silently did nothing.
 *
 * It passed every existing test because `repo-equivalence.spec.ts` drives
 * `pgRepo` through a single `pg.Client`, which has exactly one connection and
 * therefore cannot separate the statements. That is why this file exists: it
 * models a POOL, which is what production actually has.
 *
 * The fake records which connection each statement landed on. That is the whole
 * mechanism under test, and it is checked by observing the statements rather
 * than by trusting the implementation to have used the right helper.
 */
import { describe, expect, it } from 'vitest';
import { pgRepo, type SqlClient } from '../src/db/postgres.ts';

const SHOP = '11111111-1111-4111-8111-111111111111';
const AT = '2026-07-16T09:00:00.000Z';

interface Statement {
  readonly connection: number;
  readonly sql: string;
}

/**
 * A client that behaves like a connection pool: every bare `query` is answered
 * by a fresh connection. With `reserve`, one connection is pinned for the whole
 * callback, which is what a real `pool.connect()` gives you.
 */
function fakePool(options: { readonly offerReserve: boolean }) {
  const log: Statement[] = [];
  let nextConnection = 0;

  const connection = (id: number): SqlClient => ({
    query: async (sql: string) => {
      log.push({ connection: id, sql });
      return { rows: [] };
    },
  });

  const client: SqlClient = {
    // No reservation: each statement gets its own connection, as a Pool does.
    query: async (sql: string) => {
      log.push({ connection: nextConnection++, sql });
      return { rows: [] };
    },
  };

  if (options.offerReserve) {
    client.reserve = async <T>(fn: (c: SqlClient) => Promise<T>): Promise<T> =>
      fn(connection(nextConnection++));
  }

  return { client, log };
}

const connectionsUsedFor = (log: readonly Statement[], match: RegExp): readonly number[] => [
  ...new Set(log.filter((s) => match.test(s.sql)).map((s) => s.connection)),
];

const GOVERNED = /BEGIN|COMMIT|swafto\.erasure|^DELETE FROM|^UPDATE shops/;

describe('purgeShop runs on one connection', () => {
  it('puts BEGIN, SET LOCAL, every DELETE and COMMIT on the same connection', async () => {
    const { client, log } = fakePool({ offerReserve: true });

    await pgRepo(client).purgeShop(SHOP, AT);

    // The statements the erasure depends on, as actually issued.
    const erasureFlag = log.filter((s) => /swafto\.erasure/.test(s.sql));
    const deletes = log.filter((s) => /^DELETE FROM/.test(s.sql));

    expect(erasureFlag).toHaveLength(1);
    expect(deletes.length).toBeGreaterThanOrEqual(7);

    expect(
      connectionsUsedFor(log, GOVERNED),
      'the erasure flag and the deletes it authorises must share one connection',
    ).toHaveLength(1);
  });

  it('is scattered across connections when the client cannot reserve one', async () => {
    /*
     * THIS IS THE DEFECT, PINNED.
     *
     * It asserts the broken behaviour of a reserve-less pool on purpose, so the
     * test above is known to be measuring something real. If `reserved()` in
     * postgres.ts stopped using `reserve`, the first test would produce this
     * scattering instead and fail.
     */
    const { client, log } = fakePool({ offerReserve: false });

    await pgRepo(client).purgeShop(SHOP, AT);

    expect(connectionsUsedFor(log, GOVERNED).length).toBeGreaterThan(1);

    const flagConnection = log.find((s) => /swafto\.erasure/.test(s.sql))?.connection;
    expect(
      connectionsUsedFor(log, /^DELETE FROM/).includes(flagConnection as number),
      'without a reservation the erasure flag does not reach the deletes',
    ).toBe(false);
  });

  it('rolls back and issues no COMMIT when a statement throws', async () => {
    const log: Statement[] = [];
    const client: SqlClient = {
      query: async (sql: string) => {
        log.push({ connection: 0, sql });
        return { rows: [] };
      },
      reserve: async <T>(fn: (c: SqlClient) => Promise<T>): Promise<T> =>
        fn({
          query: async (sql: string) => {
            log.push({ connection: 1, sql });
            if (/^DELETE FROM days/.test(sql)) throw new Error('connection reset');
            return { rows: [] };
          },
        }),
    };

    await expect(pgRepo(client).purgeShop(SHOP, AT)).rejects.toThrow();

    expect(log.some((s) => /ROLLBACK/.test(s.sql))).toBe(true);
    expect(log.some((s) => /COMMIT/.test(s.sql))).toBe(false);
    // A half-erased shop must not be reachable: nothing after the failure ran.
    expect(log.some((s) => /^UPDATE shops/.test(s.sql))).toBe(false);
  });
});
