/**
 * THE INVITE CLI. The only way an invite code comes into being; there is no HTTP route for it.
 *
 *   node src/admin/invite-cli.ts issue  --phone N --confirm-phone N --purpose new|recovery --ticket REF --consent-recorded yes
 *   node src/admin/invite-cli.ts revoke --phone N --confirm-phone N --ticket REF
 *   node src/admin/invite-cli.ts list
 *   echo 12345678 | node src/admin/invite-cli.ts demo-hash --phone +91999990xxxx   (any AUTH_MODE; no database)
 *
 * It runs on the box as the API's service user with the API's environment, over SSM
 * (tools/swafto-invite.mjs on the founder's laptop), connecting as `swafto_app`: the same database
 * power the API already has, nothing more. `issue`, `revoke` and `list` REFUSE unless AUTH_MODE=invite.
 *
 * THE CODE IS PRINTED ONCE, on stdout, and nowhere else: not a log, not the audit row (which holds a
 * keyed hash of the number and its last four digits), not stderr. Stderr carries one status line with
 * the MASKED number. Exit 0 ok, 2 refused (bad input or wrong mode), 1 failure.
 */
import { assertSigningKey, hashOtp, mintOtp } from '../auth/tokens.ts';
import { INVITE_DIGITS } from '../rate-limit/limits.ts';
import { maskPhone } from '../auth/demo.ts';
import type { SqlClient } from '../db/postgres.ts';
import { parseInviteArgs } from './invite-args.ts';
import { formatCode, issueInvite, listInvites, revokeInvite } from './invite-store.ts';

export interface CliSettings {
  readonly authMode: 'invite' | 'sms';
  readonly signingKey: string;
  readonly rateLimitKey: string;
}

export interface CliDeps {
  readonly settings: CliSettings;
  readonly sql: SqlClient | null;
  readonly out: (s: string) => void;
  readonly err: (s: string) => void;
  readonly now?: () => Date;
  readonly mint?: (digits: number) => string;
  readonly readStdin?: () => Promise<string>;
}

export async function runInviteCli(argv: readonly string[], deps: CliDeps): Promise<number> {
  const parsed = parseInviteArgs(argv);
  if (!parsed.ok) {
    deps.err('invite: refused: ' + parsed.error + '\n');
    return 2;
  }
  const command = parsed.command;
  const now = (deps.now ?? (() => new Date()))();

  if (command.cmd === 'demo-hash') {
    const code = ((await deps.readStdin?.()) ?? '').trim();
    if (!/^[0-9]{8,10}$/.test(code)) {
      deps.err('invite: refused: the demo code must be 8 to 10 digits, on stdin\n');
      return 2;
    }
    assertSigningKey(deps.settings.signingKey);
    deps.out(hashOtp(deps.settings.signingKey, command.phone, code) + '\n');
    return 0;
  }

  if (deps.settings.authMode !== 'invite') {
    deps.err('invite: refused: AUTH_MODE is not invite\n');
    return 2;
  }
  if (!deps.sql) {
    deps.err('invite: no database\n');
    return 1;
  }

  if (command.cmd === 'list') {
    for (const r of await listInvites(deps.sql, now)) {
      deps.out([r.masked, r.kind, 'expires ' + r.expiresAt, 'wrong guesses ' + r.attempts, r.live ? 'live' : 'expired'].join('  ') + '\n');
    }
    return 0;
  }

  if (command.cmd === 'revoke') {
    const { revoked } = await revokeInvite(deps.sql, {
      phone: command.phone,
      ticket: command.ticket,
      now,
      rateLimitKey: deps.settings.rateLimitKey,
    });
    deps.err('invite: ' + (revoked ? 'revoked' : 'no live invite to revoke (audit row written)') + ' for ' + maskPhone(command.phone) + '\n');
    return 0;
  }

  const code = (deps.mint ?? mintOtp)(INVITE_DIGITS);
  const { expiresAt, kind } = await issueInvite(deps.sql, {
    phone: command.phone,
    code,
    purpose: command.purpose,
    ticket: command.ticket,
    now,
    signingKey: deps.settings.signingKey,
    rateLimitKey: deps.settings.rateLimitKey,
  });
  // After the commit, so a code that was never stored is never shown.
  deps.out(formatCode(code) + '\n');
  deps.err('invite: issued ' + kind + ' for ' + maskPhone(command.phone) + ', expires ' + expiresAt + '; any older code is dead\n');
  return 0;
}

/* Only when run directly: importing this module in a test must not open a pool. */
if (process.argv[1] && process.argv[1].endsWith('invite-cli.ts')) {
  const argv = process.argv.slice(2);
  const readStdin = async () => {
    let s = '';
    for await (const chunk of process.stdin) s += String(chunk);
    return s;
  };
  const out = (s: string) => void process.stdout.write(s);
  const err = (s: string) => void process.stderr.write(s);
  let code = 1;
  try {
    if (argv[0] === 'demo-hash') {
      // No database and no full config: the signing key is all it needs, so it works before the demo variables exist.
      code = await runInviteCli(argv, {
        settings: { authMode: 'sms', signingKey: process.env.SESSION_SIGNING_KEY ?? '', rateLimitKey: '' },
        sql: null,
        out,
        err,
        readStdin,
      });
    } else {
      const { loadConfig } = await import('../config.ts');
      const { openPool } = await import('../db/pool.ts');
      const config = loadConfig();
      const db = await openPool(config.databaseUrl, { max: 1, statementTimeoutMs: config.statementTimeoutMs, name: 'invite' });
      try {
        code = await runInviteCli(argv, {
          settings: { authMode: config.authMode, signingKey: config.signingKey, rateLimitKey: config.rateLimitKey },
          sql: db.sql,
          out,
          err,
          readStdin,
        });
      } finally {
        await db.end();
      }
    }
  } catch (e) {
    // The message only, and never an argument: a pg error can quote parameters.
    err('invite: failed: ' + String((e as Error).message).split('\n')[0]!.slice(0, 160) + '\n');
    code = 1;
  }
  process.exit(code);
}
