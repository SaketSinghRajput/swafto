/**
 * Re-pin INJECTIONS/injections.lock, using the ONE definition of "verbatim".
 *
 * This exists because I pinned the lock with an ad-hoc one-liner six times and the
 * sixth drifted. My helper tested for the substring `VERBATIM`; the real predicate in
 * verbatim.mjs tests for the full marker the extractor writes. So `26-audit-02.md`,
 * which opens "VERBATIM-EQUIVALENT", got pinned as though it were a human
 * instruction - and being pinned would have EXEMPTED IT from check-prose, because the
 * same predicate decides what is evidence and what is our prose.
 *
 * An adversary pass we wrote ourselves is not evidence. It is our prose and must be
 * checked like anything else. verbatim.mjs says so in as many words:
 *
 *   "Keyed on the marker the extractor writes, NOT on the directory, so an adversary
 *    pass we wrote ourselves in the same folder is still fully checked."
 *
 * The lesson is the one that file already carried: the second caller of a predicate
 * is where two copies begin to drift. This is the second caller, so it imports
 * instead of reimplementing.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { isVerbatim } from './verbatim.mjs';

const DIR = 'INJECTIONS';
const LOCK = join(DIR, 'injections.lock');

// Normalised, not raw: core.autocrlf means the same file is CRLF here and LF in CI,
// and a lock that only holds on one platform is not a lock.
const read = (f) => readFileSync(f, 'utf8').split('\r\n').join('\n');

const all = readdirSync(DIR)
  .filter((n) => n.endsWith('.md'))
  .sort();
const verbatim = all.filter((n) => isVerbatim(join(DIR, n)));
const ours = all.filter((n) => !verbatim.includes(n));

writeFileSync(
  LOCK,
  verbatim
    .map((n) => `${createHash('sha256').update(read(join(DIR, n))).digest('hex')}  ${n}`)
    .join('\n') + '\n',
);

console.log(`  markdown files in ${DIR}/ : ${all.length}`);
console.log(`  pinned as human evidence : ${verbatim.length}`);
console.log(
  `  OUR prose, fully checked : ${ours.length}${ours.length ? ` - ${ours.join(', ')}` : ''}`,
);
console.log(`\nwrote ${LOCK}`);
