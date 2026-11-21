/**
 * The founder's laptop wrapper (tools/swafto-invite.mjs), driven with --dry-run so nothing is sent:
 * it refuses what the CLI's parser refuses, quotes what it forwards, never forwards a code (there is
 * none yet), and does not relay `demo-hash` (that code must not travel over SSM).
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';

const run = (...args: string[]) =>
  spawnSync(process.execPath, ['--experimental-strip-types', 'tools/swafto-invite.mjs', ...args, '--dry-run'], { encoding: 'utf8' });
const good = ['issue', '--phone', '+91 98765 00001', '--confirm-phone', '+91 98765 00001', '--purpose', 'new', '--ticket', 'T-12', '--consent-recorded', 'yes'];

describe('tools/swafto-invite.mjs', () => {
  it('builds one quoted command for the box CLI from valid arguments', () => {
    const r = run(...good);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(
      "/usr/local/bin/swafto-invite 'issue' '--phone' '+91 98765 00001' '--confirm-phone' '+91 98765 00001' '--purpose' 'new' '--ticket' 'T-12' '--consent-recorded' 'yes'",
    );
  });
  it('refuses injection, a mismatched confirmation and a missing consent, sending nothing', () => {
    for (const bad of [
      good.map((a) => (a === 'T-12' ? "T-12'; id #" : a)),
      good.map((a, i) => (i === 4 ? '+91 98765 00002' : a)),
      good.slice(0, -2),
    ]) {
      const r = run(...bad);
      expect(r.status).toBe(2);
      expect(r.stdout).toBe('');
      expect(r.stderr).toContain('refused');
    }
  });
  it('does not relay demo-hash', () => {
    const r = run('demo-hash', '--phone', '+91 99999 00001');
    expect(r.status).toBe(2);
    expect(r.stdout).toBe('');
  });
});
