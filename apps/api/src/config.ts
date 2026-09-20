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
import { assertUsableSecret } from './rate-limit/store.ts';

export interface Config {
  readonly databaseUrl: string;
  readonly signingKey: string;
  readonly rateLimitKey: string;
  readonly port: number;
  readonly host: string;
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

  const port = Number(env.PORT ?? '8080');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a whole number between 1 and 65535');
  }

  return {
    databaseUrl,
    signingKey,
    rateLimitKey,
    port,
    /*
     * 0.0.0.0 because the process runs in a container and must accept
     * connections from the ingress. What may reach that port is the network's
     * decision, not this file's.
     */
    host: env.HOST ?? '0.0.0.0',
  };
}
