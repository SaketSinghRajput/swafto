/**
 * 4.4 · docs/infra/CONFIG.md and the code say the same thing, and the check that
 * says so is itself attacked: a planted undocumented variable must be caught.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
// @ts-expect-error - a plain .mjs tool with no declaration file
import { varsRead, varsDocumented, compare } from '../../../tools/check-config-docs.mjs';

const doc = readFileSync('docs/infra/CONFIG.md', 'utf8');
const config = readFileSync('apps/api/src/config.ts', 'utf8');

describe('check-config-docs', () => {
  it('passes on the repository as committed', () => {
    const out = execFileSync(process.execPath, ['tools/check-config-docs.mjs'], { encoding: 'utf8' });
    expect(out).toContain('every variable the code reads is documented');
  });

  it('finds the variables the code really reads (so a pass is not an empty set agreeing with itself)', () => {
    const read = varsRead(config, 'apps/api/src/config.ts') as Set<string>;
    for (const v of ['DATABASE_URL', 'SESSION_SIGNING_KEY', 'PORT', 'LOG_LEVEL', 'PLAY_PACKAGE_NAME', 'BILLING_ACCOUNT_KEY']) {
      expect(read.has(v), v).toBe(true);
    }
    expect(read.size).toBeGreaterThan(15);
  });

  it('CATCHES a planted undocumented variable, in each way the code reads one', () => {
    const documented = varsDocumented(doc) as Set<string>;
    for (const planted of [
      'const a = process.env.PLANTED_ONE;',
      "const b = env.PLANTED_ONE ?? 'x';",
      "const c = env['PLANTED_ONE'];",
      "const d = required(env, 'PLANTED_ONE');",
      "const e = value('PLANTED_ONE');",
    ]) {
      const read = varsRead(planted, 'x.ts') as Set<string>;
      expect([...read], planted).toEqual(['PLANTED_ONE']);
      expect(compare(read, documented).undocumented, planted).toEqual(['PLANTED_ONE']);
    }
    // A bare literal in config.ts is caught even if no known read pattern wraps it.
    const sneaky = varsRead(config + "\nconst x = lookup('PLANTED_SNEAKY_VAR');", 'apps/api/src/config.ts') as Set<string>;
    expect(compare(sneaky, documented).undocumented).toEqual(['PLANTED_SNEAKY_VAR']);
  });

  it('CATCHES a documented variable nothing reads', () => {
    const read = varsRead(config, 'apps/api/src/config.ts') as Set<string>;
    const withGhost = varsDocumented(doc + '\n| `GHOST_SETTING` | x | x | no | x |\n') as Set<string>;
    expect(compare(read, withGhost).unread).toEqual(expect.arrayContaining(['GHOST_SETTING']));
  });

  it('prose in a comment neither satisfies nor trips the check', () => {
    const read = varsRead('// set env.COMMENTED_OUT first\n/* process.env.ALSO_COMMENTED */\n', 'x.ts') as Set<string>;
    expect(read.size).toBe(0);
  });

  it('--prove reports both planted defects caught', () => {
    const out = execFileSync(process.execPath, ['tools/check-config-docs.mjs', '--prove'], { encoding: 'utf8' });
    expect(out).toContain('both planted defects were caught');
  });
});
