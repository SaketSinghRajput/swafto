/**
 * THE SERVER REFUSES TO START INSECURELY.
 *
 * This is the one check that cannot be added later. Everything else in the API
 * is tested by making a request; this is tested by NOT being able to. A process
 * that boots with an empty signing key issues session tokens anybody can forge,
 * and it does so quietly, on a server that looks perfectly healthy.
 *
 * Each case below is a way a deployment actually goes wrong: a variable left
 * out of a secrets manager, a placeholder nobody replaced, the same value
 * pasted into two fields because both were labelled "key".
 */
import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config.ts';

/** Long enough to pass the floors, and obviously not a real secret. */
const SIGNING = 'test-signing-key-at-least-32-chars!!';
const BUCKET = 'test-bucket-key-16+';

const good = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  SESSION_SIGNING_KEY: SIGNING,
  RATE_LIMIT_KEY: BUCKET,
} as NodeJS.ProcessEnv;

describe('the configuration is validated before anything listens', () => {
  it('accepts a complete, strong configuration', () => {
    const config = loadConfig(good);
    expect(config.databaseUrl).toBe(good.DATABASE_URL);
    expect(config.port).toBe(8080);
    expect(config.host).toBe('0.0.0.0');
  });

  for (const name of ['DATABASE_URL', 'SESSION_SIGNING_KEY', 'RATE_LIMIT_KEY']) {
    it('refuses to start with ' + name + ' missing', () => {
      const env = { ...good };
      delete env[name];
      expect(() => loadConfig(env)).toThrow(new RegExp(name));
    });

    it('refuses to start with ' + name + ' empty or whitespace', () => {
      expect(() => loadConfig({ ...good, [name]: '   ' })).toThrow(new RegExp(name));
    });
  }

  it('refuses a signing key short enough to search offline', () => {
    expect(() => loadConfig({ ...good, SESSION_SIGNING_KEY: 'short' })).toThrow(/32 characters/);
  });

  it('refuses a rate-limit key too short to protect a phone number', () => {
    expect(() => loadConfig({ ...good, RATE_LIMIT_KEY: 'tiny' })).toThrow(/16 characters/);
  });

  it('refuses the same value used for both keys', () => {
    // One signs credentials, the other hashes phone numbers. A leak of either
    // must not be a leak of both.
    expect(() => loadConfig({ ...good, RATE_LIMIT_KEY: SIGNING })).toThrow(/must differ/);
  });

  it('refuses a port that is not a port', () => {
    for (const PORT of ['0', '70000', 'eight', '80.5', '-1']) {
      expect(() => loadConfig({ ...good, PORT }), PORT).toThrow(/PORT/);
    }
  });

  it('takes a port and host when they are given', () => {
    const config = loadConfig({ ...good, PORT: '3000', HOST: '127.0.0.1' });
    expect(config.port).toBe(3000);
    expect(config.host).toBe('127.0.0.1');
  });

  it('never puts the value it rejected into the message', () => {
    const fragment = 'looks-like-a-secret';
    try {
      loadConfig({ ...good, SESSION_SIGNING_KEY: fragment });
      throw new Error('it should have refused');
    } catch (e) {
      // The message names the requirement, never the thing it saw.
      expect((e as Error).message).not.toContain(fragment);
    }
  });

  it('does not touch the ambient environment when given one', () => {
    /*
     * An earlier draft swapped `process.env` in and out around the read. That
     * works and is a trap: a throw between the swap and the restore leaves the
     * whole process running with the test's environment. It takes the object
     * as an argument instead, so there is nothing to restore.
     */
    const before = process.env.SESSION_SIGNING_KEY;
    try {
      loadConfig({ ...good, SESSION_SIGNING_KEY: 'short' });
    } catch {
      /* expected */
    }
    expect(process.env.SESSION_SIGNING_KEY).toBe(before);
  });
});
