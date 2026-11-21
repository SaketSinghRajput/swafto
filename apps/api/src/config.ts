/**
 * THE CONFIGURATION, VALIDATED ONCE, BEFORE ANYTHING LISTENS.
 *
 * A PROCESS THAT STARTS WITHOUT ITS SECRETS IS THE WORST OUTCOME. Not a crash -
 * a crash is loud and somebody fixes it in a minute. The dangerous version is a
 * server that boots happily with an empty signing key, accepts traffic, and
 * issues session tokens anybody can forge. Every value below is checked here,
 * before the port is opened, and a missing one stops the process.
 *
 * NO DEFAULTS FOR SECRETS. A default signing key is worse than none: it is the
 * same key on every deployment that forgot to set one, and it is in the source
 * for anybody to read. Non-secret operational values - port, host - have
 * defaults, because getting those wrong is an inconvenience rather than a
 * breach.
 *
 * THE ERROR NAMES THE VARIABLE AND NOTHING ELSE. It never prints the value it
 * found, because what it found may be most of a real secret.
 */
import { assertSigningKey } from './auth/tokens.ts';
import { normaliseIndianMobile } from './auth/phone.ts';
import { assertUsableSecret } from './rate-limit/store.ts';
import { parseDemoLogin, type DemoLogin } from './auth/demo.ts';

export interface Config {
  readonly databaseUrl: string;
  readonly signingKey: string;
  readonly rateLimitKey: string;
  readonly port: number;
  readonly host: string;
  /** True only when NODE_ENV is exactly 'production'. Anything else is not. */
  readonly production: boolean;
  /**
   * C-01 · A SECOND CONNECTION STRING, for a role that may read across shops.
   * See `PgRepoOptions.system`. Required in production; absent elsewhere it falls
   * back to DATABASE_URL.
   */
  readonly systemDatabaseUrl: string | null;
  /**
   * C-04 · STAGING'S EXPLICIT PERMISSION TO RUN WITH THE STUB SMS PORT. Only
   * `ALLOW_STUB_SMS=1` counts - not "true", not "yes" - and it still prints a
   * warning at every boot.
   */
  readonly allowStubSms: boolean;
  /**
   * STAGING TESTER OTP PATH. Exact numbers (normalised, +91 99999 0xxxx only) whose OTP the stub
   * SMS port writes to the log. Empty unless `ALLOW_STUB_SMS=1`; boot refuses otherwise.
   */
  readonly stagingTestPhones: readonly string[];
  /** OPS-09 · Fastify's trustProxy, from TRUST_PROXY. Defaults to loopback only. */
  readonly trustProxy: boolean | number | string;
  /** C-06 · per-statement ceiling, in ms. Reversible default 5000. */
  readonly statementTimeoutMs: number;
  /** 4.3 · pino level, from LOG_LEVEL. `info` unless set: one completion line per request. */
  readonly logLevel: LogLevel;
  /** C-15 · how long /ready answers 503 before the listener closes, in ms. */
  readonly shutdownReadyGraceMs: number;
  /** C-15 · the drain deadline, in ms. Must stay under the orchestrator's SIGKILL. */
  readonly shutdownTimeoutMs: number;
  /** RT-W4-4 · NODE_ENV was not set at all. The SMS guard then treats the process as production. */
  readonly nodeEnvUnset: boolean;
  /**
   * AUTH_MODE: 'invite' (beta invite codes; no message is ever sent) or 'sms' (the OTP over SMS).
   * Required in production and when NODE_ENV is unset; elsewhere it defaults to 'sms'.
   */
  readonly authMode: AuthMode;
  /** DEMO_LOGIN_PHONE + DEMO_LOGIN_CODE_HASH, or null when the demo login is off. See auth/demo.ts. */
  readonly demoLogin: DemoLogin | null;
}

export const NODE_ENVS = ['production', 'development', 'test'] as const;
export const AUTH_MODES = ['invite', 'sms'] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

/**
 * AUTH_MODE, exactly 'invite' or 'sms'. UNSET REFUSES BOOT in production and with NODE_ENV unset (RT-W4-4):
 * a default here would be a deploy that silently chose how people sign in. Elsewhere unset means 'sms',
 * which is what every pre-invite caller and test already ran. The error names the variable, never the value.
 */
export function parseAuthMode(env: NodeJS.ProcessEnv, guarded: boolean): AuthMode {
  const raw = env.AUTH_MODE;
  if (raw === undefined || raw.trim() === '') {
    if (guarded || raw !== undefined) {
      throw new Error('AUTH_MODE is not set. It must be exactly invite or sms; there is no default in production.');
    }
    return 'sms';
  }
  if (!(AUTH_MODES as readonly string[]).includes(raw)) throw new Error('AUTH_MODE must be exactly invite or sms.');
  return raw as AuthMode;
}

export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * A whole number of milliseconds inside [min, max], or a refusal that names the
 * variable. Absent takes the default; set-but-blank is refused, as it always was. `Number('')` is 0 and `Number('5s')`
 * is NaN, and the old inline `Number(env.X ?? d)` turned the first into a zero
 * timeout and the second into a NaN that every comparison treats as false.
 */
function intInRange(env: NodeJS.ProcessEnv, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name];
  if (raw === undefined) return fallback;
  const n = /^[0-9]+$/.test(raw.trim()) ? Number(raw.trim()) : Number.NaN;
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(name + ' must be a whole number between ' + String(min) + ' and ' + String(max));
  }
  return n;
}

/**
 * TRUST_PROXY: UNSET -> '127.0.0.1' (Caddy on the same box; CTO ruling, reversible).
 * '0' or 'false' -> off. 'true' -> trust every hop (only
 * behind a proxy you run and which strips the header). A whole number -> that many
 * hops. Anything else is passed as a comma-separated list of addresses or CIDRs.
 */
export function parseTrustProxy(raw: string | undefined): boolean | number | string {
  if (raw === undefined) return '127.0.0.1';
  const v = raw.trim();
  if (v === '' || v === '0' || v.toLowerCase() === 'false') return false;
  if (v.toLowerCase() === 'true') return true;
  if (/^[0-9]+$/.test(v)) return Number(v);
  return v;
}

/**
 * RT-W4-3 · A TRUST_PROXY THAT BREAKS THE PER-IP SMS CAP IS REFUSED IN PRODUCTION. Behind the proxy
 * every request arrives from loopback, and `requestOtp` skips the per-address cap for loopback; only a
 * correct trustProxy makes `req.ip` the caller. So `false` (the cap silently vanishes), `true` and a hop
 * count other than 1 (a client-supplied X-Forwarded-For is believed), and an address range wider than
 * /8 (`0.0.0.0/0`) are not accepted. Returns the reason, or null if the value is safe.
 */
export function unsafeTrustProxy(value: boolean | number | string): string | null {
  if (value === false) return 'is off, so the per-IP SMS cap would be skipped for every caller (all arrive from loopback)';
  if (value === true) return 'trusts every hop, so a forged X-Forwarded-For defeats the per-IP SMS cap';
  if (typeof value === 'number') return value === 1 ? null : 'trusts ' + String(value) + ' hops; only 1 (the one proxy we run) is safe';
  for (const entry of value.split(',').map((e) => e.trim())) {
    const prefix = /\/(\d+)$/.exec(entry);
    const wide = prefix !== null && Number(prefix[1]) < (entry.includes(':') ? 16 : 8);
    if (entry === '' || wide) return 'names an address range that is too wide (' + (entry || 'empty entry') + ')';
  }
  return null;
}

/** The reserved test range: +91 99999 0xxxx. No real subscriber can be put on the list by accident. */
export const STAGING_TEST_PHONE_PREFIX = '+91999990';
export const STAGING_TEST_PHONES_MAX = 20;

/**
 * STAGING_TEST_PHONES: a comma-separated allow-list that makes the stub SMS port log the OTP for
 * those numbers (and only those). Refused at boot without ALLOW_STUB_SMS=1, with more than 20
 * entries, or with any number outside the test range. Errors name the variable, never a number.
 */
export function parseStagingTestPhones(env: NodeJS.ProcessEnv): readonly string[] {
  const items = (env.STAGING_TEST_PHONES ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
  if (items.length === 0) return [];
  if (env.ALLOW_STUB_SMS !== '1') {
    throw new Error('STAGING_TEST_PHONES requires ALLOW_STUB_SMS=1: the tester OTP path exists only on a staging stub SMS port.');
  }
  if (items.length > STAGING_TEST_PHONES_MAX) {
    throw new Error('STAGING_TEST_PHONES may hold at most ' + String(STAGING_TEST_PHONES_MAX) + ' numbers.');
  }
  const phones = new Set<string>();
  for (const item of items) {
    const phone = normaliseIndianMobile(item);
    if (phone === null || !phone.startsWith(STAGING_TEST_PHONE_PREFIX)) {
      throw new Error('STAGING_TEST_PHONES may only hold numbers in the +91 99999 0xxxx test range, so a real number is never listed.');
    }
    phones.add(phone);
  }
  return [...phones];
}

const required = (env: NodeJS.ProcessEnv, name: string): string => {
  const value = env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      name +
        ' is not set. The server will not start without it: a process that boots ' +
        'without its secrets accepts traffic it cannot secure, which is worse than ' +
        'one that refuses to boot.',
    );
  }
  return value;
};

/**
 * PR-7 · BILLING CONFIGURATION, WHICH IS ALLOWED TO BE ABSENT.
 *
 * The opposite policy from the secrets above, and on purpose. Selling Premium
 * waits on Play Console, a Cloud service account and a Pub/Sub topic (R4-HA1,
 * HA3, HA4), none of which an engineer can create. A server that refused to boot
 * without them would take the ledger down for want of a shop window. So a
 * missing billing value disables BILLING - `verify` and the RTDN webhook answer
 * 503 naming what is missing - and everything else runs.
 *
 * The preview needs none of Google's values: it is the server's own grant.
 *
 * A PRESENT VALUE IS STILL CHECKED. A malformed key JSON is a deploy mistake,
 * and finding it at boot beats finding it on the first shopkeeper's purchase.
 */
export interface BillingConfig {
  /** HMAC key for `obfuscatedAccountId`. A secret; never the session key. */
  readonly accountKey: string | null;
  readonly play: {
    readonly packageName: string;
    readonly productId: string;
    readonly serviceAccount: { client_email: string; private_key: string; token_uri?: string };
    /** The OIDC audience the Pub/Sub push subscription is configured with. */
    readonly rtdnAudience: string;
    /** The service account Pub/Sub signs its pushes as. */
    readonly rtdnEmail: string;
  } | null;
  /** The variables whose absence keeps billing closed. Names only, never values. */
  readonly missing: readonly string[];
}

export const BILLING_ENV = [
  'BILLING_ACCOUNT_KEY',
  'PLAY_PRODUCT_ID',
  'PLAY_SERVICE_ACCOUNT_JSON',
  'PLAY_RTDN_AUDIENCE',
  'PLAY_RTDN_SERVICE_ACCOUNT',
] as const;

export function loadBillingConfig(env: NodeJS.ProcessEnv = process.env): BillingConfig {
  const value = (name: string) => {
    const v = env[name];
    return typeof v === 'string' && v.trim() !== '' ? v : null;
  };
  const missing = BILLING_ENV.filter((name) => value(name) === null);

  const accountKey = value('BILLING_ACCOUNT_KEY');
  if (accountKey !== null) {
    assertUsableSecret(accountKey);
    if (accountKey === env.SESSION_SIGNING_KEY || accountKey === env.RATE_LIMIT_KEY) {
      throw new Error('BILLING_ACCOUNT_KEY must differ from SESSION_SIGNING_KEY and RATE_LIMIT_KEY.');
    }
  }

  const json = value('PLAY_SERVICE_ACCOUNT_JSON');
  let serviceAccount: { client_email: string; private_key: string; token_uri?: string } | null = null;
  if (json !== null) {
    let parsed: { client_email?: unknown; private_key?: unknown; token_uri?: unknown };
    try {
      parsed = JSON.parse(json) as typeof parsed;
    } catch {
      throw new Error('PLAY_SERVICE_ACCOUNT_JSON is not JSON. It must be the key file Google issued, whole.');
    }
    if (typeof parsed.client_email !== 'string' || typeof parsed.private_key !== 'string') {
      throw new Error('PLAY_SERVICE_ACCOUNT_JSON has no client_email or private_key.');
    }
    serviceAccount = {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
      ...(typeof parsed.token_uri === 'string' ? { token_uri: parsed.token_uri } : {}),
    };
  }

  const productId = value('PLAY_PRODUCT_ID');
  const rtdnAudience = value('PLAY_RTDN_AUDIENCE');
  const rtdnEmail = value('PLAY_RTDN_SERVICE_ACCOUNT');
  const play =
    missing.length === 0
      ? {
          packageName: value('PLAY_PACKAGE_NAME') ?? 'com.swafto',
          productId: productId!,
          serviceAccount: serviceAccount!,
          rtdnAudience: rtdnAudience!,
          rtdnEmail: rtdnEmail!,
        }
      : null;
  return { accountKey, play, missing };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = required(env, 'DATABASE_URL');
  const signingKey = required(env, 'SESSION_SIGNING_KEY');
  const rateLimitKey = required(env, 'RATE_LIMIT_KEY');

  // The floors the modules themselves enforce, applied before listening.
  assertSigningKey(signingKey);
  assertUsableSecret(rateLimitKey);

  /*
   * TWO DIFFERENT KEYS, AND THE CHECK IS NOT PEDANTRY. The rate-limit key
   * hashes phone numbers into buckets; the session key signs credentials.
   * Sharing one makes a leak of either a leak of both, and the bucket key is
   * the one likelier to end up somewhere it should not be.
   */
  if (signingKey === rateLimitKey) {
    throw new Error(
      'SESSION_SIGNING_KEY and RATE_LIMIT_KEY must differ. One signs session tokens ' +
        'and the other hashes phone numbers; sharing them makes a leak of either a ' +
        'leak of both.',
    );
  }

  const port = intInRange(env, 'PORT', 8080, 1, 65535);

  /*
   * NODE_ENV: ONLY THE EXACT WORD 'production' TURNS THE PRODUCTION CHECKS ON, so a
   * near-miss ('Production', 'prod') would quietly boot with every one of them off.
   * Anything that looks like an attempt at production and is not the word is refused.
   */
  // RTI-6: an EXACT word from a closed set, or unset. A pasted space or CR ('production ') used to pass the
  // near-miss check on its trimmed value and then boot with production=false, every guard off. Blank means
  // unset (the guarded case); anything else that is not one of the three words, trimmed or not, refuses.
  const nodeEnv = env.NODE_ENV ?? '';
  if (nodeEnv !== '' && !(NODE_ENVS as readonly string[]).includes(nodeEnv)) {
    throw new Error('NODE_ENV must be exactly one of ' + NODE_ENVS.join(', ') + ', or unset; a near miss would skip the production checks.');
  }
  const production = nodeEnv === 'production';

  const logLevelRaw = (env.LOG_LEVEL ?? '').trim();
  if (logLevelRaw !== '' && !(LOG_LEVELS as readonly string[]).includes(logLevelRaw)) {
    throw new Error('LOG_LEVEL must be one of ' + LOG_LEVELS.join(', '));
  }
  const logLevel = (logLevelRaw === '' ? 'info' : logLevelRaw) as LogLevel;
  // RT-W4-4: error tracking is `{ $.level = 50 }`; above `error` there are no such lines.
  if (production && (logLevel === 'fatal' || logLevel === 'silent')) {
    throw new Error('LOG_LEVEL=' + logLevel + ' is refused in production: it switches off every error event (level 50).');
  }
  const trustProxy = parseTrustProxy(env.TRUST_PROXY);
  const unsafe = production ? unsafeTrustProxy(trustProxy) : null;
  if (unsafe !== null) throw new Error('TRUST_PROXY ' + unsafe + '. Leave it unset (127.0.0.1, Caddy on the same box).');

  if (typeof env.HOST === 'string' && env.HOST.trim() === '') {
    throw new Error('HOST must not be blank; leave it unset for 0.0.0.0');
  }
  const systemDatabaseUrl = (env.SYSTEM_DATABASE_URL ?? '').trim() || null;
  if (production && systemDatabaseUrl === null) {
    throw new Error(
      'SYSTEM_DATABASE_URL is not set. In production the API connects as a role with no ' +
        'BYPASSRLS (DATABASE_URL) and needs a second, privileged role for the few lookups ' +
        'that have no shop yet (sign-in, device check, consent). See db/postgres.ts.',
    );
  }
  const statementTimeoutMs = intInRange(env, 'DB_STATEMENT_TIMEOUT_MS', 5000, 100, 600_000);
  const shutdownReadyGraceMs = intInRange(env, 'SHUTDOWN_READY_GRACE_MS', 5_000, 0, 120_000);
  const shutdownTimeoutMs = intInRange(env, 'SHUTDOWN_TIMEOUT_MS', 25_000, 1_000, 600_000);
  if (shutdownTimeoutMs <= shutdownReadyGraceMs) {
    throw new Error('SHUTDOWN_TIMEOUT_MS must be greater than SHUTDOWN_READY_GRACE_MS');
  }

  return {
    databaseUrl,
    signingKey,
    rateLimitKey,
    port,
    production,
    systemDatabaseUrl,
    allowStubSms: env.ALLOW_STUB_SMS === '1',
    stagingTestPhones: parseStagingTestPhones(env),
    trustProxy,
    nodeEnvUnset: env.NODE_ENV === undefined || nodeEnv === '',
    authMode: parseAuthMode(env, production || env.NODE_ENV === undefined || nodeEnv === ''),
    demoLogin: parseDemoLogin(env),
    statementTimeoutMs,
    logLevel,
    shutdownReadyGraceMs,
    shutdownTimeoutMs,
    /*
     * 0.0.0.0 because the process runs in a container and must accept
     * connections from the ingress. What may reach that port is the network's
     * decision, not this file's.
     */
    host: env.HOST?.trim() ?? '0.0.0.0',
  };
}

/**
 * C-04 · THE STUB SMS PORT MUST NOT REACH PRODUCTION BY ACCIDENT.
 *
 * `StubSmsPort` sends nothing and keeps the plaintext codes (BE-04), so a
 * production server wired to it is one where nobody can sign in - and where the
 * codes sit in memory. Until the DLT-registered adapter exists (H1) a staging
 * environment still needs it, so the refusal has exactly one release valve:
 * `ALLOW_STUB_SMS=1`, which still prints a warning at every boot.
 *
 * Returns nothing; throws to refuse. `warn` receives the loud line.
 */
export function assertSmsPort(
  config: Pick<Config, 'production' | 'allowStubSms'> & Partial<Pick<Config, 'nodeEnvUnset'>>,
  isStub: boolean,
  warn: (line: string) => void,
): void {
  if (!isStub) return;
  // RT-W4-4: NODE_ENV unset is a deploy mistake, not a licence to run the stub: it is held to the production rule.
  const guarded = config.production || config.nodeEnvUnset === true;
  if (guarded && !config.allowStubSms) {
    throw new Error(
      'refusing to start: NODE_ENV=production and the SMS port is the stub, which sends nothing. ' +
        'Wire a real adapter, or set ALLOW_STUB_SMS=1 on a staging environment that knows.',
    );
  }
  if (guarded) {
    warn(
      'swafto-api: WARNING: ALLOW_STUB_SMS=1 in production mode. NO SMS IS SENT; ' +
        'nobody real can sign in. This is for staging only.\n',
    );
  }
}
