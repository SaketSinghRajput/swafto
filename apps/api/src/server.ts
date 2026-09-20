/**
 * THE PROCESS. Config, a pool, the app, a port, and a clean way to stop.
 *
 * THIS IS THE ONLY FILE THAT KNOWS THERE IS A NETWORK. Everything else takes
 * its dependencies as arguments, which is what lets the whole API be driven in
 * tests over `inject()` with no socket. Keeping the listening here means that
 * property cannot quietly be lost.
 *
 * IT VALIDATES BEFORE IT LISTENS. `loadConfig` throws on a missing or weak
 * secret, and it throws before the pool is opened and before the port is bound.
 * A server that accepts one request with a forgeable session key has already
 * failed.
 *
 * SHUTDOWN IS DELIBERATE. On SIGTERM - which is how a container is asked to
 * stop - it closes the listener first so no new request arrives, then drains
 * the pool. A process killed mid-write on an append-only ledger leaves a
 * connection holding a transaction, and the next deploy waits on the lock.
 */
import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { pgRepo } from './db/postgres.ts';
import { memoryOtpStore } from './auth/routes.ts';
import { RateLimiter } from './rate-limit/store.ts';
import { StubSmsPort } from './sms/stub.ts';

interface PoolLike {
  query(text: string, params?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
}

export async function start(): Promise<{ stop: () => Promise<void> }> {
  const config = loadConfig();

  const mod = (await import('pg')) as unknown as Record<string, unknown>;
  const pg = (mod.default ?? mod) as { Pool: new (o: unknown) => PoolLike };

  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    // A budget deployment, not a fleet. Raise it when something measures a wait.
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  const sql = { query: (text: string, params?: readonly unknown[]) => pool.query(text, params) };

  const app = buildApp({
    repo: pgRepo(sql),
    /*
     * THE SMS ADAPTER IS STILL THE STUB, AND THAT IS RECORDED RATHER THAN
     * HIDDEN. A real one needs a DLT-registered header and approved templates,
     * which is H1 and needs a registered business entity. Starting with the
     * stub means sign-in works end to end in staging and no route changes when
     * the real adapter arrives - it implements the same port, which
     * `assertSendable` already guards.
     */
    sms: new StubSmsPort(),
    /*
     * The OTP store is per-process. Correct for one instance and wrong for
     * several: a code minted on instance A cannot be verified on B. Stated here
     * because it is the first thing that breaks on scaling out, and the fix is
     * a shared store behind the same interface, not a change to any route.
     */
    otp: memoryOtpStore(),
    now: () => new Date().toISOString(),
    signingKey: config.signingKey,
    rate: new RateLimiter(sql, { secret: config.rateLimitKey }),
  });

  await app.listen({ port: config.port, host: config.host });

  const stop = async () => {
    await app.close();
    await pool.end();
  };

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      void stop().then(
        () => process.exit(0),
        () => process.exit(1),
      );
    });
  }

  return { stop };
}

/*
 * Only when run directly. Importing this module in a test must not open a port,
 * which is the usual way an entry point becomes untestable.
 */
if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  start().catch((e: unknown) => {
    /*
     * The one place a message goes to stderr rather than the logger: the logger
     * lives inside the app, and this is the path where the app never started.
     * The reason never contains a secret - `loadConfig` names the variable and
     * not its value.
     */
    process.stderr.write('swafto-api failed to start: ' + (e as Error).message + '\n');
    process.exit(1);
  });
}
