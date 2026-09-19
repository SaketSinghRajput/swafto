/**
 * Keeps SMS-TEMPLATES.md and the code registry in lockstep.
 *
 * SMS-TEMPLATES.md is the DLT registration submission. If the code sends text the
 * operator has not approved, every message is silently scrubbed and the failure looks
 * like "SMS not arriving" weeks after launch. So the markdown is the contract and
 * this check enforces it.
 *
 * Fails on:
 *   - a templateId present in one side and absent from the other
 *   - template text that differs between the two
 *   - a variable-count mismatch
 *   - any templateId sent anywhere in the codebase that is not registered
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = (f) => readFileSync(f, 'utf8').split('\r\n').join('\n');
const failures = [];

/* ---- parse the markdown, which is the submission ---------------------- */
const md = read('SMS-TEMPLATES.md');
const mdTemplates = new Map(); // "id|lang" -> text

let currentId = null;
for (const line of md.split('\n')) {
  const heading = /^###\s+T\d+\s+·\s+`([a-z0-9_]+)`/.exec(line);
  if (heading) {
    currentId = heading[1];
    continue;
  }
  const row = /^\|\s*`(en|hi|od)`\s*\|\s*`(.+?)`\s*\|/.exec(line);
  if (row && currentId) mdTemplates.set(`${currentId}|${row[1]}`, row[2]);
}
if (mdTemplates.size === 0) failures.push('parsed 0 templates out of SMS-TEMPLATES.md');

/* ---- parse the code registry ------------------------------------------ */
const src = read('apps/api/src/sms/templates.ts');
const codeTemplates = new Map();
let codeId = null;
for (const line of src.split('\n')) {
  const key = /^\s{2}([a-z0-9_]+):\s*\{\s*$/.exec(line);
  if (key) {
    codeId = key[1];
    continue;
  }
  const t = /^\s+(en|hi|od):\s*'(.+)',\s*$/.exec(line);
  if (t && codeId) codeTemplates.set(`${codeId}|${t[1]}`, t[2]);
}
if (codeTemplates.size === 0) failures.push('parsed 0 templates out of templates.ts');

/* ---- compare ----------------------------------------------------------- */
for (const [k, text] of mdTemplates) {
  if (!codeTemplates.has(k)) {
    failures.push(`${k} is in SMS-TEMPLATES.md but NOT in templates.ts`);
  } else if (codeTemplates.get(k) !== text) {
    failures.push(
      `${k} text differs.\n         md  : ${text}\n         code: ${codeTemplates.get(k)}`,
    );
  }
}
for (const k of codeTemplates.keys()) {
  if (!mdTemplates.has(k)) {
    failures.push(
      `${k} is in templates.ts but NOT in SMS-TEMPLATES.md - it would never be registered`,
    );
  }
}

/* ---- variable counts must agree ---------------------------------------- */
for (const [k, text] of mdTemplates) {
  const slots = text.split('{#var#}').length - 1;
  const block = src.split(`${k.split('|')[0]}: {`)[1]?.slice(0, 200) ?? '';
  const declared = /variableCount:\s*(\d+)/.exec(block);
  if (declared && Number(declared[1]) !== slots) {
    failures.push(`${k} has ${slots} slot(s) but variableCount is ${declared[1]}`);
  }
}

/* ---- no unregistered templateId sent anywhere in the repo -------------- */
const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage']);
function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n) || n.startsWith('.')) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(n)) out.push(p);
  }
  return out;
}
const registered = new Set([...mdTemplates.keys()].map((k) => k.split('|')[0]));
for (const f of walk('.')) {
  if (f.includes('check-sms-templates')) continue;
  for (const [i, line] of read(f).split('\n').entries()) {
    // A test may deliberately reference an unregistered id to prove it is rejected.
    if (/as never|toThrow|REJECTS/.test(line)) continue;
    for (const m of line.matchAll(/templateId:\s*'([a-z0-9_]+)'/g)) {
      if (!registered.has(m[1])) {
        failures.push(`${f}:${i + 1} sends unregistered templateId "${m[1]}"`);
      }
    }
  }
}

/* ---- copy must agree with the constant it describes -------------------- */
/**
 * A NUMBER STATED IN COPY IS A PROMISE, AND IT DRIFTS.
 *
 * "Valid 10 min" sat in the English template while SECURITY-AUDIT TB6 said five and
 * the code, transcribing TB6, used five. The shopkeeper would have been told ten and
 * given five, at the moment he is trying to reach his own ledger, with no way to tell
 * a dead code from a wrong one - and in the one artifact that cannot be cheaply
 * changed, because fixing wording after DLT registration means twelve
 * re-registrations.
 *
 * Nothing caught it. The markdown-vs-code check compared the two copies of the TEXT
 * and both said ten; the disagreement was between the text and a CONSTANT, which no
 * check looked at. This closes that.
 *
 * Deliberately generous in what it matches: any template stating a duration, in any
 * language, must agree. Hindi and Odia carry no validity clause today (AD-012), so
 * this is quiet for them - and it fires the moment one gains a number.
 */
const ttlSrc = read('apps/api/src/rate-limit/limits.ts');
const ttlExpr = /export const OTP_TTL_SECONDS = (\d+) \* (MINUTE|SECOND|HOUR);/.exec(ttlSrc);
if (!ttlExpr) {
  failures.push(
    'could not read OTP_TTL_SECONDS out of limits.ts - this check cannot verify the ' +
      'template copy against a constant it cannot find, and silently passing would ' +
      'be worse than failing.',
  );
} else {
  const unit = { SECOND: 1, MINUTE: 60, HOUR: 3600 }[ttlExpr[2]];
  const ttlSeconds = Number(ttlExpr[1]) * unit;
  const ttlMinutes = ttlSeconds / 60;

  // "10 min", "10 minutes", "10-minute", and the Hindi/Odia words, in case a
  // validity clause is ever restored to them.
  const DURATION = /([0-9]+) ?-? ?(minutes|minute|mins|min|मिनट|ମିନିଟ)/gi;
  let checked = 0;
  for (const [key, text] of codeTemplates) {
    for (const m of text.matchAll(DURATION)) {
      checked += 1;
      if (Number(m[1]) !== ttlMinutes) {
        failures.push(
          `template ${key} promises "${m[0]}" but OTP_TTL_SECONDS is ${ttlSeconds}s ` +
            `(${ttlMinutes} min). The message would tell a shopkeeper one thing and the ` +
            `server would do another.`,
        );
      }
    }
  }
  console.log(`  OTP_TTL_SECONDS       : ${ttlSeconds}s · ${checked} duration(s) stated in copy`);
}

console.log(`  templates in markdown : ${mdTemplates.size}`);
console.log(`  templates in code     : ${codeTemplates.size}`);
console.log(`  distinct ids          : ${registered.size}`);

if (failures.length) {
  console.error(`\nSMS TEMPLATE FAILURES (${failures.length}):`);
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}
console.log('\nsms templates: markdown and code agree, all ids registered');
