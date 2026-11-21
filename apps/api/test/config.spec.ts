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
import { assertSmsPort, loadConfig } from '../src/config.ts';

/** Long enough to pass the floors, and obviously not a real secret. */
const SIGNING = 'test-signing-key-at-least-32-chars!!';
const BUCKET = 'test-bucket-key-16+';

const good = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  SESSION_SIGNING_KEY: SIGNING,
  RATE_LIMIT_KEY: BUCKET,
  // Required when NODE_ENV is unset or production (no default): every case below says how people sign in.
  AUTH_MODE: 'sms',
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

describe('4.4 · every variable is validated at boot, with a message that names it', () => {
  it('LOG_LEVEL defaults to info, takes any pino level, and refuses anything else', () => {
    expect(loadConfig(good).logLevel).toBe('info');
    for (const level of ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']) {
      expect(loadConfig({ ...good, LOG_LEVEL: level }).logLevel).toBe(level);
    }
    for (const bad of ['INFO', 'verbose', 'warning', '5']) {
      expect(() => loadConfig({ ...good, LOG_LEVEL: bad }), bad).toThrow(/LOG_LEVEL/);
    }
  });

  it('the shutdown windows have their defaults, take numbers, and refuse nonsense', () => {
    const c = loadConfig(good);
    expect([c.shutdownReadyGraceMs, c.shutdownTimeoutMs]).toEqual([5_000, 25_000]);
    const set = loadConfig({ ...good, SHUTDOWN_READY_GRACE_MS: '0', SHUTDOWN_TIMEOUT_MS: '20000' });
    expect([set.shutdownReadyGraceMs, set.shutdownTimeoutMs]).toEqual([0, 20_000]);
    for (const bad of ['5s', '-1', '1.5', '', ' ', 'NaN']) {
      expect(() => loadConfig({ ...good, SHUTDOWN_READY_GRACE_MS: bad }), bad).toThrow(/SHUTDOWN_READY_GRACE_MS/);
      expect(() => loadConfig({ ...good, SHUTDOWN_TIMEOUT_MS: bad }), bad).toThrow(/SHUTDOWN_TIMEOUT_MS/);
    }
    // A drain deadline that is not after the ready grace could never drain anything.
    expect(() => loadConfig({ ...good, SHUTDOWN_READY_GRACE_MS: '30000', SHUTDOWN_TIMEOUT_MS: '25000' })).toThrow(/greater than/);
  });

  it('DB_STATEMENT_TIMEOUT_MS is a whole number between 100 and 600000', () => {
    expect(loadConfig(good).statementTimeoutMs).toBe(5000);
    for (const bad of ['99', '600001', 'ten', '', '1e3']) {
      expect(() => loadConfig({ ...good, DB_STATEMENT_TIMEOUT_MS: bad }), bad).toThrow(/DB_STATEMENT_TIMEOUT_MS/);
    }
  });

  it('a blank PORT is refused rather than read as zero or silently defaulted', () => {
    expect(() => loadConfig({ ...good, PORT: '' })).toThrow(/PORT/);
  });

  it('a NODE_ENV that looks like production but is not the word is refused (its checks would be off)', () => {
    for (const bad of ['Production', 'prod', 'PRODUCTION', ' prod ']) {
      expect(() => loadConfig({ ...good, NODE_ENV: bad }), bad).toThrow(/NODE_ENV/);
    }
    for (const fine of ['development', 'test', '']) {
      expect(loadConfig({ ...good, NODE_ENV: fine }).production).toBe(false);
    }
  });

  it('a blank HOST is refused; an unset one is 0.0.0.0', () => {
    expect(() => loadConfig({ ...good, HOST: '  ' })).toThrow(/HOST/);
    expect(loadConfig(good).host).toBe('0.0.0.0');
  });

  it('refuses a message that carries the rejected value', () => {
    try {
      loadConfig({ ...good, SHUTDOWN_TIMEOUT_MS: 'sekrit-value' });
      throw new Error('it should have refused');
    } catch (e) {
      expect((e as Error).message).not.toContain('sekrit-value');
    }
  });
});

describe('RT-W4 · production refuses settings that switch a protection off', () => {
  const prod = { ...good, NODE_ENV: 'production', SYSTEM_DATABASE_URL: 'postgres://s:p@localhost:5432/db' } as NodeJS.ProcessEnv;

  it('RT-W4-3 · a TRUST_PROXY that disables or breaks the per-IP SMS cap fails boot in production, naming the variable', () => {
    for (const bad of ['0', 'false', 'true', '', '2', '5', '0.0.0.0/0', '::/0', '10.0.0.0/7', '127.0.0.1,0.0.0.0/0']) {
      expect(() => loadConfig({ ...prod, TRUST_PROXY: bad }), 'TRUST_PROXY=' + bad).toThrow(/TRUST_PROXY/);
    }
    for (const fine of [undefined, '1', '127.0.0.1', '10.0.0.0/8', '127.0.0.1, 10.1.0.0/16']) {
      const env = { ...prod };
      if (fine !== undefined) env.TRUST_PROXY = fine;
      expect(() => loadConfig(env), 'TRUST_PROXY=' + String(fine)).not.toThrow();
    }
  });

  it('RT-W4-3 · outside production the same values are still accepted (tests and a laptop run behind nothing)', () => {
    for (const v of ['0', 'false', 'true']) expect(() => loadConfig({ ...good, TRUST_PROXY: v })).not.toThrow();
  });

  it('RT-W4-4 · LOG_LEVEL above error is refused in production, so level-50 events always exist', () => {
    for (const bad of ['fatal', 'silent']) {
      expect(() => loadConfig({ ...prod, LOG_LEVEL: bad }), bad).toThrow(/LOG_LEVEL/);
      expect(loadConfig({ ...good, LOG_LEVEL: bad }).logLevel).toBe(bad);
    }
    expect(loadConfig({ ...prod, LOG_LEVEL: 'error' }).logLevel).toBe('error');
  });

  it('RT-W4-4 · an unset NODE_ENV is not allowed to run the stub SMS quietly', () => {
    expect(loadConfig(good).nodeEnvUnset).toBe(true);
    expect(loadConfig({ ...good, NODE_ENV: 'development' }).nodeEnvUnset).toBe(false);
    const warned: string[] = [];
    expect(() => assertSmsPort(loadConfig(good), true, (l) => warned.push(l))).toThrow(/refusing to start/);
    expect(() => assertSmsPort(loadConfig({ ...good, NODE_ENV: 'development' }), true, (l) => warned.push(l))).not.toThrow();
    expect(warned).toHaveLength(0);
    assertSmsPort(loadConfig({ ...good, ALLOW_STUB_SMS: '1' }), true, (l) => warned.push(l));
    expect(warned.join('')).toMatch(/NO SMS IS SENT/);
  });
});

describe('STAGING_TEST_PHONES · the tester OTP allow-list is refused unless it is safe', () => {
  const staging = { ...good, ALLOW_STUB_SMS: '1' } as NodeJS.ProcessEnv;

  it('is empty when unset, and parses and normalises a valid list', () => {
    expect(loadConfig(staging).stagingTestPhones).toEqual([]);
    const c = loadConfig({ ...staging, STAGING_TEST_PHONES: '+919999900001, 99999 00002 ,+919999900001' });
    expect(c.stagingTestPhones).toEqual(['+919999900001', '+919999900002']);
  });

  it('refuses to boot without ALLOW_STUB_SMS=1', () => {
    expect(() => loadConfig({ ...good, STAGING_TEST_PHONES: '+919999900001' })).toThrow(/STAGING_TEST_PHONES requires ALLOW_STUB_SMS=1/);
    expect(() => loadConfig({ ...good, ALLOW_STUB_SMS: 'true', STAGING_TEST_PHONES: '+919999900001' })).toThrow(/ALLOW_STUB_SMS=1/);
  });

  it('refuses any number outside the +91 99999 0xxxx test range, without printing it', () => {
    for (const bad of ['+919812345678', '+919999910001', '+919999900001,+919876500001', 'not-a-number']) {
      let message = '';
      try {
        loadConfig({ ...staging, STAGING_TEST_PHONES: bad });
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message, bad).toMatch(/test range/);
      expect(message).not.toContain('9812345678');
      expect(message).not.toContain('9876500001');
    }
  });

  it('refuses more than 20 numbers, accepts exactly 20', () => {
    const list = (n: number) => Array.from({ length: n }, (_, i) => '+91999990' + String(1000 + i)).join(',');
    expect(loadConfig({ ...staging, STAGING_TEST_PHONES: list(20) }).stagingTestPhones).toHaveLength(20);
    expect(() => loadConfig({ ...staging, STAGING_TEST_PHONES: list(21) })).toThrow(/at most 20/);
  });
});
