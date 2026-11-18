/**
 * THE API ON THIS MACHINE, FOR A PHONE ON THE SAME WI-FI.
 *
 * ================== DEVELOPMENT ONLY. NEVER DEPLOY THIS. ==================
 *
 * It does one thing production must never do: it PRINTS THE SIGN-IN CODE to
 * the console, next to the phone number it was sent to. Both are personal
 * data under the DPDP Act, and `app.ts` configures pino redaction precisely so
 * they can never reach a log line. This file steps around that deliberately,
 * because no SMS can actually be delivered yet - the real adapter needs a
 * DLT-registered sender header and approved templates (H1), which is a telecom
 * regulatory process, not a build step. Until that exists, reading the code
 * off this console is the only way anyone can sign in at all.
 *
 * Two guards keep that from becoming a production incident:
 *
 *   - it REFUSES TO START against anything but a local database, so it cannot
 *     be pointed at a real one and made to print real customers' codes;
 *   - it lives in tools/ and nothing imports it. `apps/api/src/server.ts` is
 *     untouched and is still the only thing that should ever be deployed.
 *
 * WHY THIS EXISTS RATHER THAN A FLAG IN server.ts: a production entry point
 * with a "print the secrets" switch is one environment variable away from
 * doing it in production. A separate file cannot be switched on by accident.
 *
 * Run:   node tools/dev-server.mjs            (then: adb reverse tcp:8787 tcp:8787)
 * Needs: node tools/pg-up.mjs   (a throwaway Postgres on port 55432)
 *
 * Database: its own `swafto_device` (created if missing, all migrations applied
 * once), never `swafto_test`, which the test suite drops freely. Sign-in codes
 * print as one line:  DEV-OTP +91XXXXXXXXXX 123456
 * Session key: SESSION_SIGNING_KEY, else a stable one kept in the gitignored
 * tools/.dev/session-signing-key, so a restart does not sign the phone out.
 * Listens on 127.0.0.1:8787 only. Refuses to run with NODE_ENV=production.
 */
import { devApp } from './dev-app.ts';
import { pgBillingRepo } from '../apps/api/src/billing/repo.ts';
import { pgRepo } from '../apps/api/src/db/postgres.ts';
import { StubSmsPort } from '../apps/api/src/sms/stub.ts';
import { pgOtpStore } from '../apps/api/src/auth/otp-store-pg.ts';
import { allMigrationsUp } from '../packages/schema/src/spec.ts';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

if (process.env.NODE_ENV === 'production') {
  console.error('dev-server refuses to run with NODE_ENV=production (it prints sign-in codes).');
  process.exit(1);
}

const DEV_DB =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:55432/swafto_device';
const PORT = Number(process.env.PORT ?? 8787);

/*
 * THE GUARD. A server that prints sign-in codes must not be able to reach a
 * real database. Hostname only - a URL whose host is localhost cannot be a
 * deployed one, and anything else stops here.
 */
const dbHost = new URL(DEV_DB).hostname;
if (new URL(DEV_DB).pathname.slice(1) === 'swafto_test') {
  console.error('dev-server refuses swafto_test: the test suite drops it freely.');
  process.exit(1);
}
if (dbHost !== 'localhost' && dbHost !== '127.0.0.1') {
  console.error(
    'dev-server refuses to run against a non-local database.\n' +
      `  DATABASE_URL points at: ${dbHost}\n` +
      '  This server prints sign-in codes to the console. Against a real\n' +
      "  database that is a disclosure of other people's personal data.\n" +
      '  Deploy apps/api/src/server.ts instead - it is the production entry.',
  );
  process.exit(1);
}

const pgMod = await import('pg');
const pg = pgMod.default ?? pgMod;
const dbName = new URL(DEV_DB).pathname.slice(1);

/* ---- the database, created and migrated if this is a first run ---------- */

const admin = new pg.Client({
  connectionString: DEV_DB.replace(/\/[^/]+$/, '/postgres'),
});
await admin.connect();
const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
if (exists.rowCount === 0) {
  // An identifier cannot be a bind parameter. The name comes from our own URL,
  // and the guard above has already established that URL is local.
  await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
  console.log(`dev-server: created database ${dbName}`);
}
await admin.end();

const pool = new pg.Pool({ connectionString: DEV_DB, max: 5 });

const already = await pool.query(
  "SELECT 1 FROM information_schema.tables WHERE table_name = 'entries'",
);
if (already.rowCount === 0) {
  // One transaction on one connection: a half-applied schema would never be retried.
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    for (const statement of allMigrationsUp('postgres')) await c.query(statement);
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
  console.log('dev-server: schema applied (all migrations)');
} else {
  console.log('dev-server: schema already present');
}

/* ---- the SQL client, with `reserve` so transactions actually hold -------- */

const sql = {
  query: (text, params) => pool.query(text, params),
  /*
   * Without this, a Pool answers each statement on a different connection and
   * every transaction in the repository silently stops being one - which is
   * how the DPDP erasure came to delete nothing. See `SqlClient.reserve`.
   */
  reserve: async (fn) => {
    const connection = await pool.connect();
    try {
      return await fn(connection);
    } finally {
      connection.release();
    }
  },
};

/* ---- the SMS port that tells you the code ------------------------------- */

/**
 * Wraps the real stub rather than replacing it, so every message still goes
 * through `assertSendable` - the same template-registry and DLT length
 * validation the production adapter will use. A dev port that skipped it would
 * let a message through here and fail in production.
 */
class DevSmsPort {
  #inner = new StubSmsPort();

  async send(req) {
    await this.#inner.send(req);
    console.log(`DEV-OTP ${req.phone} ${req.variables[0]}`);
  }
}

/* ---- secrets. The session key is stable across restarts (gitignored file) -- */

function devSigningKey() {
  if (process.env.SESSION_SIGNING_KEY) return process.env.SESSION_SIGNING_KEY;
  const file = new URL('./.dev/session-signing-key', import.meta.url);
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  const key = randomBytes(32).toString('hex');
  mkdirSync(new URL('./.dev/', import.meta.url), { recursive: true });
  writeFileSync(file, key, { mode: 0o600 });
  console.log('dev-server: created tools/.dev/session-signing-key (gitignored)');
  return key;
}
const signingKey = devSigningKey();
const rateLimitKey = process.env.RATE_LIMIT_KEY ?? randomBytes(32).toString('hex');

// Billing included (HT-36): without it S10 never offers the preview on this rig.
const app = devApp({
  repo: pgRepo(sql),
  billingRepo: pgBillingRepo(sql),
  sql,
  sms: new DevSmsPort(),
  otp: pgOtpStore(sql),
  signingKey,
  rateLimitKey,
});

/* The phone reaches this through `adb reverse tcp:8787 tcp:8787`: loopback only. */
await app.listen({ port: PORT, host: '127.0.0.1' });

console.log(`DEV-SERVER READY http://127.0.0.1:${PORT}  (database ${dbName})`);
