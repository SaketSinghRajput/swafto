/**
 * THE INVITE CLI'S ARGUMENTS, PARSED STRICTLY. Pure: no environment, no database.
 *
 * Every value is matched against a closed pattern before anything else happens, so nothing an
 * operator (or a script around the CLI) passes can reach a shell or a query as anything but data.
 * An error names the FLAG, never the value: a mistyped number must not be echoed into a log.
 * Shared by the on-box CLI and the laptop wrapper (tools/swafto-invite.mjs).
 */
import { normaliseIndianMobile } from '../auth/phone.ts';
import type { InvitePurpose } from './invite-store.ts';

export type InviteCommand =
  | { readonly cmd: 'issue'; readonly phone: string; readonly purpose: InvitePurpose; readonly ticket: string }
  | { readonly cmd: 'revoke'; readonly phone: string; readonly ticket: string }
  | { readonly cmd: 'list' }
  | { readonly cmd: 'demo-hash'; readonly phone: string };

export type ParsedArgs =
  | { readonly ok: true; readonly command: InviteCommand }
  | { readonly ok: false; readonly error: string };

/** What a number may look like on the command line, before normalisation. */
const PHONE_SHAPE = /^\+?[0-9 -]{10,18}$/;
/**
 * A SUPPORT-TICKET REFERENCE and nothing wider: one to five capital letters, a dash, one to five digits
 * (`T-12`, `SUP-4021`). The ticket is stored in the append-only audit for 12 months, so the pattern
 * cannot hold a phone number (10 digits) or an invite code (8 digits), and no free text. RTI-3.
 */
const TICKET_SHAPE = /^[A-Z]{1,5}-[0-9]{1,5}$/;

const FLAGS: Record<string, readonly string[]> = {
  issue: ['phone', 'confirm-phone', 'purpose', 'ticket', 'consent-recorded'],
  revoke: ['phone', 'confirm-phone', 'ticket'],
  list: [],
  'demo-hash': ['phone'],
};

const fail = (error: string): ParsedArgs => ({ ok: false, error });

export function parseInviteArgs(argv: readonly string[]): ParsedArgs {
  const [cmd, ...rest] = argv;
  if (cmd === undefined || !Object.hasOwn(FLAGS, cmd)) {
    return fail('usage: invite issue|revoke|list|demo-hash [--flag value ...]');
  }
  const allowed = FLAGS[cmd]!;
  const given = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 2) {
    const flag = rest[i]!;
    const value = rest[i + 1];
    if (!/^--[a-z-]+$/.test(flag) || !allowed.includes(flag.slice(2))) return fail('unknown or malformed flag for ' + cmd);
    if (value === undefined || value.startsWith('--')) return fail('flag ' + flag + ' needs a value');
    if (given.has(flag.slice(2))) return fail('flag ' + flag + ' given twice');
    given.set(flag.slice(2), value);
  }
  for (const f of allowed) if (!given.has(f)) return fail('missing --' + f);

  if (cmd === 'list') return { ok: true, command: { cmd: 'list' } };

  const rawPhone = given.get('phone')!;
  if (!PHONE_SHAPE.test(rawPhone)) return fail('--phone is not a phone number');
  const phone = normaliseIndianMobile(rawPhone);
  if (phone === null) return fail('--phone is not an Indian mobile number');
  if (cmd === 'demo-hash') return { ok: true, command: { cmd: 'demo-hash', phone } };

  // The typed-twice guard. A second argument and not a prompt, because SSM SendCommand cannot answer one.
  const confirm = given.get('confirm-phone')!;
  if (!PHONE_SHAPE.test(confirm) || normaliseIndianMobile(confirm) !== phone) {
    return fail('--confirm-phone does not match --phone');
  }
  const ticket = given.get('ticket')!;
  if (!TICKET_SHAPE.test(ticket)) return fail('--ticket must look like T-12 or SUP-4021 (capital letters, a dash, up to 5 digits)');

  if (cmd === 'revoke') return { ok: true, command: { cmd: 'revoke', phone, ticket } };

  const purpose = given.get('purpose')!;
  if (purpose !== 'new' && purpose !== 'recovery') return fail('--purpose must be new or recovery');
  if (given.get('consent-recorded') !== 'yes') {
    return fail("--consent-recorded must be yes: record the shopkeeper's consent first");
  }
  return { ok: true, command: { cmd: 'issue', phone, purpose, ticket } };
}
