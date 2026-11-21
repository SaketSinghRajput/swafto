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
import { assertSmsPort, loadBillingConfig, loadConfig } from './config.ts';
import { pgBillingRepo } from './billing/repo.ts';
import { googleOidcKeys, googlePlayApi, type Fetch } from './billing/google.ts';
import { pgRepo } from './db/postgres.ts';
import { openPool } from './db/pool.ts';
import { describeRole, enforceRoles } from './db/roles.ts';
import { pgOtpStore } from './auth/otp-store-pg.ts';
import { RateLimiter } from './rate-limit/store.ts';
import { StubSmsPort } from './sms/stub.ts';
import { smsPortFor } from './sms/for-mode.ts';
import { gracefulShutdown } from './shutdown.ts';
import { processErrorLine } from './error-event.ts';

export async function start(): Promise<{ stop: () => Promise<void> }> {
  const config = loadConfig();
  // Billing may be absent (R4-HA1/3/4); a present-but-malformed value still stops the boot.
  const billingConfig = loadBillingConfig();
  if (billingConfig.missing.length > 0) {
    process.stderr.write(
      'swafto-api: Premium purchases are closed. Not set: ' + billingConfig.missing.join(', ') + '\n',
    );
  }

  /*
   * C-06 · A REJECTION NOBODY AWAITED IS LOGGED, NOT FATAL. Node's default is to
   * crash the process on one, and for a request-scoped promise that is every
   * phone losing the API to one stray rejection. Everything that can be awaited
   * is; this is the net under what was not. It does NOT swallow
   * `uncaughtException`: after one, the process state is unknown.
   */
  process.on('unhandledRejection', (reason) => {
    // 4.3 · the same `level` 50 event the request path writes, so one metric filter sees both.
    process.stdout.write(processErrorLine(reason, 'unhandled rejection', new Date()));
  });
  /*
   * AN UNCAUGHT EXCEPTION IS STILL FATAL: the process state is unknown after one. It is
   * written as the same structured event first, then the process exits non-zero exactly
   * as Node would have - the orchestrator restarts it and the metric filter counts it.
   */
  process.on('uncaughtException', (error) => {
    process.stdout.write(processErrorLine(error, 'uncaught exception', new Date()), () => process.exit(1));
  });

  /*
   * TWO POOLS, ON TWO ROLES (C-01). `appDb` is the role every ledger statement
   * runs on, scoped per shop by `swafto.shop_id`; it must be unable to bypass
   * row-level security. `systemDb` is the privileged role for the few lookups
   * that have no shop yet. Outside production a missing system URL falls back
   * to the app pool (one superuser on a developer's machine).
   */
  const appDb = await openPool(config.databaseUrl, {
    // A budget deployment, not a fleet. Raise it when something measures a wait.
    max: 10,
    statementTimeoutMs: config.statementTimeoutMs,
    name: 'app',
  });
  const systemDb = config.systemDatabaseUrl
    ? await openPool(config.systemDatabaseUrl, {
        max: 3,
        statementTimeoutMs: config.statementTimeoutMs,
        name: 'system',
      })
    : null;
  const closePools = async () => {
    await appDb.end();
    if (systemDb) await systemDb.end();
  };

  try {
    /*
     * REFUSE TO START IF ROW-LEVEL SECURITY CANNOT BIND THE API. See db/roles.ts.
     * This runs before the port is opened, so a misconfigured deploy is a failed
     * health check on the new instance and the old one keeps serving.
     */
    enforceRoles(
      await describeRole(appDb.sql),
      systemDb ? await describeRole(systemDb.sql) : null,
      config.production,
      (line) => process.stderr.write(line),
    );

    /*
     * C-04 · THE SMS ADAPTER IS STILL THE STUB, AND PRODUCTION REFUSES IT. A real
     * one needs a DLT-registered header and approved templates, which is H1 and
     * needs a registered business entity. Staging may run the stub with
     * ALLOW_STUB_SMS=1 (loudly); the adapter implements the same port, which
     * `assertSendable` already guards, so no route changes when the real one arrives.
     */
    // STAGING_TEST_PHONES is empty unless ALLOW_STUB_SMS=1 (loadConfig refuses otherwise). The tester OTP
    // line goes to stdout (journald), deliberately not through the app logger, whose redaction stays as is.
    // AUTH_MODE=invite wires the throwing port and never the stub (sms/for-mode.ts).
    const sms = smsPortFor(
      config.authMode,
      () =>
        new StubSmsPort(100, {
          stagingTestPhones: config.stagingTestPhones,
          emit: (line) => process.stdout.write(line),
        }),
    );
    if (config.authMode === 'sms') assertSmsPort(config, sms instanceof StubSmsPort, (line) => process.stderr.write(line));

    const sql = appDb.sql;
    /*
     * C-15 · SHUTDOWN: `/ready` flips to 503 first, the listener drains after a grace
     * period, the pools close last, and a deadline stops a hung drain from being SIGKILLed
     * with transactions open. See shutdown.ts. Both windows are env-tunable.
     */
    const shutdown = gracefulShutdown({
      closeServer: () => app.close(),
      // RT-W3-3: at the deadline, cut sockets still held (a stalled request must not hold a deploy hostage).
      forceCloseConnections: () => app.server.closeAllConnections(),
      closeResources: closePools,
      readyGraceMs: config.shutdownReadyGraceMs,
      forceAfterMs: config.shutdownTimeoutMs,
      log: (line) => process.stderr.write(line),
    });
    const app = buildApp({
      logLevel: config.logLevel,
      isDraining: shutdown.isDraining,
      repo: pgRepo(sql, systemDb ? { system: systemDb.sql } : {}),
      sms,
      /*
       * C-02 · THE OTP STORE IS POSTGRES, SO A SECOND INSTANCE OR A RESTART DOES
       * NOT STRAND A CODE. `otp_pending` is migration 0002; it carries no RLS
       * (it is written before any shop exists) and holds only a keyed hash.
       */
      otp: pgOtpStore(sql),
      now: () => new Date().toISOString(),
      signingKey: config.signingKey,
      authMode: config.authMode,
      demo: config.demoLogin,
      rate: new RateLimiter(sql, { secret: config.rateLimitKey }),
      trustProxy: config.trustProxy,
      // C-06 · `/ready`: the database answers `select 1`, or it is a 503.
      ready: async () => {
        await sql.query('select 1');
      },
      billing: {
        repo: pgBillingRepo(sql),
        config: billingConfig,
        play: billingConfig.play
          ? googlePlayApi({
              fetch: fetch as unknown as Fetch,
              serviceAccount: billingConfig.play.serviceAccount,
              now: () => new Date().toISOString(),
            })
          : null,
        keys: billingConfig.play ? googleOidcKeys(fetch as unknown as Fetch, () => new Date().toISOString()) : null,
      },
    });

    await app.listen({ port: config.port, host: config.host });

    const stop = async () => {
      await shutdown.begin('stop');
    };

    for (const signal of ['SIGTERM', 'SIGINT'] as const) {
      // `on`, not `once`: a second signal while draining is absorbed (begin is idempotent).
      process.on(signal, () => {
        void shutdown.begin(signal).then((code) => process.exit(code));
      });
    }

    return { stop };
  } catch (e) {
    // A refusal to start must not leave two open pools holding the event loop.
    await closePools().catch(() => undefined);
    throw e;
  }
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
