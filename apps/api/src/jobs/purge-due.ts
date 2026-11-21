/**
 * THE JOB THAT MAKES THE GRACE PERIOD REAL.
 *
 * `POST /v1/me/erase` records a request and erases nothing, which is what the
 * audit designed and what the copy promises him. That design is only honest if
 * something actually erases at the end of the thirty days - otherwise the
 * product has quietly become one that never deletes, which is the worse of the
 * two failures: DPDP §1.6 is a duty, not a setting.
 *
 * A FUNCTION FIRST, A COMMAND SECOND. The work is a plain function over the
 * repository and an injected clock, so it is tested against both repositories
 * like everything else. The command below is what a cron entry runs; it holds
 * the pool and nothing else.
 *
 * IT IS SAFE TO RUN TWICE, AND SAFE TO MISS A DAY. `shopsDueForPurge` asks for
 * shops whose grace has run out and which are not already erased, so a second
 * run finds nothing and a missed run catches up. A job that must run exactly
 * once is a job that will one day not run at all.
 */
import type { Repo } from '../db/port.ts';
import { DELETION_GRACE_DAYS } from '@swafto/values';
import type { SqlClient } from '../db/postgres.ts';
import { purgeInviteAudit, sweepExpiredOtp } from '../admin/invite-store.ts';

export interface PurgeReport {
  /** The cutoff used, so a run can be explained without re-deriving it. */
  readonly before: string;
  /** Shop ids erased. Ids only - nothing identifying leaves this function. */
  readonly erased: readonly string[];
  /** Shops that failed, with the reason, so a failure is never silent. */
  readonly failed: readonly { readonly shopId: string; readonly reason: string }[];
}

/**
 * Erase every shop whose grace period ended before `now`.
 *
 * ONE FAILURE DOES NOT STOP THE REST. A shop that cannot be erased is reported
 * and the loop continues: the alternative is that one stuck row prevents every
 * later erasure indefinitely, and nobody notices because the job "ran".
 */
export async function purgeDue(repo: Repo, now: string): Promise<PurgeReport> {
  const before = new Date(Date.parse(now) - DELETION_GRACE_DAYS * 86_400_000).toISOString();
  const due = await repo.shopsDueForPurge(before);

  const erased: string[] = [];
  const failed: { shopId: string; reason: string }[] = [];

  for (const shopId of due) {
    try {
      await repo.purgeShop(shopId, now);
      erased.push(shopId);
    } catch (e) {
      failed.push({ shopId, reason: (e as Error).message });
    }
  }

  return { before, erased, failed };
}

/**
 * C-07 / BE-19 · THE WHOLE NIGHTLY JOB: erase what is due, then prune the
 * limiter's table. A sibling concern in the same cron entry, because both are
 * "housekeeping nobody will remember to schedule twice" and `rate_events`
 * otherwise grows by one row per OTP attempt for ever.
 */
export async function runNightly(
  repo: Repo,
  limiter: { prune(): Promise<number> },
  now: string,
  /**
   * Beta invite codes. Absent, nothing changes. Present: expired `otp_pending` rows go (each holds a full
   * phone number, and invite mode has no sends to trigger the store's own sweep), and `invite_audit`
   * rows past their retention (12 months, decision D4) are purged through the trigger's one way in.
   */
  sql?: SqlClient,
): Promise<PurgeReport & { readonly rateEventsPruned: number; readonly otpSwept: number; readonly inviteAuditPurged: number }> {
  const report = await purgeDue(repo, now);
  const rateEventsPruned = await limiter.prune();
  const otpSwept = sql ? await sweepExpiredOtp(sql, now) : 0;
  const inviteAuditPurged = sql ? await purgeInviteAudit(sql, now) : 0;
  return { ...report, rateEventsPruned, otpSwept, inviteAuditPurged };
}

/*
 * The command: `npm run purge-due -w @swafto/api` (or `node apps/api/src/jobs/purge-due.ts`),
 * which is what cron runs. Only when run directly, for the same reason `server.ts`
 * guards its own entry: importing this module in a test must not open a pool.
 *
 * `purgeShop` is scoped per shop and sets the erasure flag itself, so this
 * runs on the ordinary application role - no BYPASSRLS needed (C-01).
 */
if (process.argv[1] && process.argv[1].endsWith('purge-due.ts')) {
  const { loadConfig } = await import('../config.ts');
  const { pgRepo } = await import('../db/postgres.ts');
  const { openPool } = await import('../db/pool.ts');
  const { RateLimiter } = await import('../rate-limit/store.ts');

  const config = loadConfig();
  const db = await openPool(config.databaseUrl, {
    max: 2,
    statementTimeoutMs: config.statementTimeoutMs,
    name: 'purge',
  });

  let failed = 0;
  try {
    const report = await runNightly(
      pgRepo(db.sql),
      new RateLimiter(db.sql, { secret: config.rateLimitKey }),
      new Date().toISOString(),
      db.sql,
    );
    /*
     * COUNTS AND IDS, NEVER A NAME OR A NUMBER. This is the one place in the
     * system that writes about erased shops, and what it writes ends up in a
     * log somebody keeps for a year.
     */
    process.stdout.write(
      'purge-due: cutoff ' +
        report.before +
        ', erased ' +
        report.erased.length +
        ', failed ' +
        report.failed.length +
        ', rate events pruned ' +
        report.rateEventsPruned +
        ', expired codes swept ' +
        report.otpSwept +
        ', invite audit rows purged ' +
        report.inviteAuditPurged +
        '\n',
    );
    for (const f of report.failed) {
      process.stderr.write('purge-due: shop ' + f.shopId + ' NOT erased: ' + f.reason + '\n');
    }
    failed = report.failed.length;
  } catch (e) {
    process.stderr.write('purge-due failed: ' + (e as Error).message + '\n');
    failed = 1;
  } finally {
    await db.end();
  }
  process.exit(failed === 0 ? 0 : 1);
}
