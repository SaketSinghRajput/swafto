/**
 * THE POSTGRES POOL, OPENED ONE WAY FOR EVERY CALLER (server and jobs).
 *
 * C-06. Three things the first version of each caller lacked:
 *
 *  1. AN `error` LISTENER. `pg` emits `error` on the Pool when an IDLE client
 *     dies - an RDS failover, a restart, a network blip. An EventEmitter with
 *     no listener for `error` throws, and from a pool callback that is an
 *     uncaught exception: the whole API went down because the database
 *     hiccupped while nobody was talking to it. The listener logs and carries
 *     on; the next checkout opens a fresh connection.
 *  2. A `statement_timeout`. A runaway or lock-waiting statement holds its
 *     connection - and the request, and a pool slot - until the end of time.
 *     Reversible default 5 s, from config. Postgres cancels it with 57014,
 *     which `isInfraError` turns into a 503 + Retry-After.
 *  3. A BROKEN CONNECTION IS DESTROYED, NOT RETURNED. `release(true)` removes it
 *     from the pool; otherwise the next request is handed a dead socket.
 *
 * `reserve` is the single-connection unit of work every transaction relies on
 * (see `SqlClient.reserve`).
 */
import type { SqlClient } from './postgres.ts';
import { isInfraError } from './errors.ts';

interface ConnectionLike {
  query(text: string, params?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  release(destroy?: boolean | Error): void;
}

export interface PoolLike {
  query(text: string, params?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  connect(): Promise<ConnectionLike>;
  end(): Promise<void>;
  on(event: 'error', listener: (err: Error) => void): unknown;
}

export interface PoolOptions {
  readonly max: number;
  readonly statementTimeoutMs: number;
  /** Where a pool-level error is reported. Defaults to one line on stderr, no secrets. */
  readonly onError?: (err: Error) => void;
  /** Label for the log line, so two pools can be told apart. */
  readonly name?: string;
}

export interface PoolHandle {
  readonly sql: SqlClient & { reserve: NonNullable<SqlClient['reserve']> };
  end(): Promise<void>;
}

/** Wrap an already-built pool: the listener, and `reserve` with broken-connection disposal. */
export function wrapPool(pool: PoolLike, options: Pick<PoolOptions, 'onError' | 'name'> = {}): PoolHandle {
  pool.on('error', (err) => {
    if (options.onError) return options.onError(err);
    // The message only: a pg error can carry the connection string in its detail.
    process.stderr.write(
      JSON.stringify({
        level: 'error',
        msg: 'idle database client error',
        pool: options.name ?? 'app',
        code: (err as { code?: string }).code,
        error: String(err.message).slice(0, 200),
      }) + '\n',
    );
  });

  const sql: PoolHandle['sql'] = {
    query: (text, params) => pool.query(text, params),
    reserve: async (fn) => {
      const connection = await pool.connect();
      let broken = false;
      try {
        return await fn(connection);
      } catch (e) {
        broken = isInfraError(e);
        throw e;
      } finally {
        connection.release(broken ? true : undefined);
      }
    },
  };
  return { sql, end: () => pool.end() };
}

export async function openPool(connectionString: string, options: PoolOptions): Promise<PoolHandle> {
  const mod = (await import('pg')) as unknown as Record<string, unknown>;
  const pg = (mod.default ?? mod) as { Pool: new (o: unknown) => PoolLike };
  const pool = new pg.Pool({
    connectionString,
    max: options.max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: options.statementTimeoutMs,
  });
  return wrapPool(pool, options);
}
