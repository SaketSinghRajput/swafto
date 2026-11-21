// The founder's laptop wrapper for the invite CLI. It sends ONE command to the box over SSM and prints
// ONLY what the operator needs: the code on stdout (for `issue`), a masked status line on stderr.
//
//   node --experimental-strip-types tools/swafto-invite.mjs issue --phone "+91 98765 00001" \
//        --confirm-phone "+91 98765 00001" --purpose new --ticket T-12 --consent-recorded yes
//   node --experimental-strip-types tools/swafto-invite.mjs revoke --phone ... --confirm-phone ... --ticket T-12
//   node --experimental-strip-types tools/swafto-invite.mjs list
//   add --dry-run to print the command that would be sent, and send nothing.
//
// Needs `aws sso login --profile saftwo` first (docs/runbooks/deploy.md). Runbook: docs/runbooks/invite.md.
//
// SAFETY. The arguments are checked here with the CLI's own strict parser (apps/api/src/admin/invite-args.ts),
// so what reaches the shell string is only letters, digits, space, plus, dot, dash and underscore, and every
// one is single-quoted anyway. The box re-checks them (the real control). Nothing here writes the code to a
// file or a log; the one print is the operator's terminal. The code is plaintext in the SSM command output
// until you clear your terminal (INVITE-CODES T7); it is useless after 5 guesses, a use, or expiry.
import { execFileSync } from 'node:child_process';

const INSTANCE = process.env.SWAFTO_INSTANCE_ID ?? 'INSTANCE_ID';
const AWS = ['--profile', 'saftwo', '--region', 'ap-south-1'];
const BOX_CLI = '/usr/local/bin/swafto-invite';

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const args = argv.filter((a) => a !== '--dry-run');

if (args[0] === 'demo-hash') {
  console.error('swafto-invite: demo-hash is run on the box by the founder, not through this wrapper (the code must not travel).');
  process.exit(2);
}
// A cheap first gate, before the TypeScript parser is even loaded (about 0.1 s of startup): every argument may
// hold only letters, digits, space, plus, dot, dash, underscore. Anything else is refused here, so a hostile
// value costs one process start and nothing more. The strict parser below is still the authority.
if (!args.every((a) => /^[A-Za-z0-9 +._-]*$/.test(a))) {
  console.error('swafto-invite: refused: an argument holds a character that is never valid here');
  process.exit(2);
}
const { parseInviteArgs } = await import('../apps/api/src/admin/invite-args.ts');
const parsed = parseInviteArgs(args);
if (!parsed.ok) {
  console.error('swafto-invite: refused: ' + parsed.error);
  process.exit(2);
}

const quote = (s) => "'" + s.replace(/'/g, "'\\''") + "'";
const remote = [BOX_CLI, ...args.map(quote)].join(' ');
if (dryRun) {
  console.log(remote);
  process.exit(0);
}

const aws = (...a) => execFileSync('aws', [...a, ...AWS, '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const sent = JSON.parse(
  aws(
    'ssm', 'send-command',
    '--instance-ids', INSTANCE,
    '--document-name', 'AWS-RunShellScript',
    '--comment', 'swafto-invite ' + args[0], // the verb only: no number, no ticket
    '--parameters', JSON.stringify({ commands: [remote] }),
  ),
);
const id = sent.Command.CommandId;

let inv;
for (let i = 0; i < 60; i += 1) {
  await new Promise((r) => setTimeout(r, 2000));
  try {
    inv = JSON.parse(aws('ssm', 'get-command-invocation', '--command-id', id, '--instance-id', INSTANCE));
  } catch {
    continue; // the invocation is not visible for a moment after send-command
  }
  if (!['Pending', 'InProgress', 'Delayed'].includes(inv.Status)) break;
}
if (!inv || inv.Status !== 'Success') {
  console.error('swafto-invite: the command did not succeed (' + (inv ? inv.Status : 'no result') + ')');
  if (inv?.StandardErrorContent) console.error(inv.StandardErrorContent.trim());
  process.exit(1);
}
if (inv.StandardErrorContent) console.error(inv.StandardErrorContent.trim());
// stdout is the code (issue) or the masked listing (list); revoke prints nothing there.
if (inv.StandardOutputContent) process.stdout.write(inv.StandardOutputContent);
