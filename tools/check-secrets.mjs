/**
 * B35, repo half - "Secrets detected in repo or APK: 0".
 *
 * §5.13: the instrument is built when the subject exists. The REPO has existed since
 * G0 and nothing has ever scanned it; only the APK half is genuinely blocked. Waiting
 * for G9 would leave every commit between now and then unscanned, and a secret
 * committed today stays in the history long after it is deleted from the tree.
 *
 * WHY NOT gitleaks. It is the obvious answer, and it is a binary whose behaviour this
 * loop cannot verify offline - while §5.12 requires every verifier to be proven to
 * FAIL on a planted defect. A small scanner with readable rules, an explicit
 * allowlist and a demonstrable failure is worth more here than a better scanner
 * nobody can show running. Add gitleaks at G9 beside the container scan and KEEP this
 * one: two independent scanners disagreeing is information.
 *
 * DELIBERATELY HIGH-CONFIDENCE PATTERNS ONLY. A scanner that cries wolf gets
 * allowlisted into uselessness, and then it is a check that cannot fail - which is
 * the failure mode this whole section exists to stop.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = (f) => readFileSync(f, 'utf8').split('\r\n').join('\n');
const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage']);
const BINARY = /\.(ttf|otf|pdf|png|jpe?g|webp|zip|jar|keystore|ico)$/i;

/**
 * Known-safe strings, each with the reason it is safe. An allowlist entry without a
 * reason is how a scanner dies.
 */
const ALLOWED = [
  {
    match: 'postgres://postgres:postgres@localhost:55432/swafto_test',
    why: 'the throwaway container from tools/pg-up.mjs - created and destroyed locally, never deployed, and the password is the image default',
  },
  {
    match: 'test-secret-key-at-least-16',
    why: 'a literal in rate-limit.spec.ts whose entire purpose is to be a non-production key',
  },
];

const RULES = [
  [/AKIA[0-9A-Z]{16}/, 'an AWS access key id'],
  [/aws_secret_access_key\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}/i, 'an AWS secret access key'],
  [/-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, 'a private key block'],
  [/gh[pousr]_[A-Za-z0-9]{36,}/, 'a GitHub token'],
  [/xox[abprs]-[A-Za-z0-9-]{10,}/, 'a Slack token'],
  [/sk_(?:live|test)_[A-Za-z0-9]{16,}/, 'a Stripe secret key'],
  [/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./, 'a JWT with a payload'],
  [
    /postgres(?:ql)?:\/\/[^\s'"]+:[^\s'"@]+@(?!localhost|127\.0\.0\.1)/,
    'a Postgres URL carrying a password to a non-local host',
  ],
  [
    /(?:api[_-]?key|secret|passwd|password|token)\s*[=:]\s*['"][A-Za-z0-9/+_-]{20,}['"]/i,
    'a hard-coded credential',
  ],
];

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n) || n.startsWith('.')) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (!BINARY.test(n)) out.push(p);
  }
  return out;
}

const files = walk('.');
if (files.length === 0) {
  console.error('x    scanned ZERO files. A secret scan over nothing reports clean');
  console.error('     forever - absent, not passing (§5.12.2).');
  process.exit(1);
}

const findings = [];
let allowlisted = 0;
let scanned = 0;
for (const f of files) {
  // This file names its own patterns, so it would otherwise flag itself.
  if (f.includes('check-secrets')) continue;
  let text;
  try {
    text = read(f);
  } catch {
    continue;
  }
  scanned += 1;
  for (const [i, line] of text.split('\n').entries()) {
    for (const [re, what] of RULES) {
      if (!re.test(line)) continue;
      if (ALLOWED.some((a) => line.includes(a.match))) {
        allowlisted += 1;
        continue;
      }
      findings.push(`${f}:${i + 1} looks like ${what}`);
    }
  }
}

console.log(`  files scanned          : ${scanned}`);
console.log(`  rules applied          : ${RULES.length}`);
console.log(`  allowlisted hits       : ${allowlisted} (each with a written reason)`);
console.log(`  B35 repo half          : ${findings.length} secret(s)`);
console.log('  B35 APK half           : BLOCKED - no APK is built yet (G9)');

if (findings.length) {
  console.error(`\nSECRETS (${findings.length}):`);
  for (const f of findings) console.error(`  x    ${f}`);
  console.error('\nIf one of these is genuinely safe, add it to ALLOWED with a REASON.');
  process.exit(1);
}
console.log('\nsecrets: none found in the repository');
