/**
 * L-16 - WHAT AN EXPORT MAY AND MAY NOT BE CALLED.
 *
 * LEGAL-AUDIT §7 is unusually specific about this, and the reason is not
 * pedantry. A GST **tax invoice** has mandatory particulars under Rule 46 of the
 * CGST Rules - supplier GSTIN, invoice number and date, recipient details, HSN,
 * taxable value, rate and amount of tax. SWAFTO captures NONE of them. So a
 * screen that calls its output an "invoice", or a file header that says "GST
 * return", is telling a shopkeeper he is holding a tax document. He may then
 * treat it as one, or hand it to his accountant as one, and the consequence
 * lands on him rather than on us.
 *
 * WHY A CHECK AND NOT A COPY REVIEW. The audit's answer was "copy review + i18n
 * key audit", which is a person reading a table once. Copy is added weekly by
 * whoever is building the screen, in three languages, and the reviewer who
 * caught it in March is not reading the string added in September. A rule about
 * words is the cheapest possible thing to automate and the most expensive kind
 * of thing to re-check by eye.
 *
 * WHAT IT CAN AND CANNOT SEE, STATED PLAINLY.
 *
 *   IT CAN see the forbidden English terms, wherever they appear, in any
 *   language's column - because "invoice" and "GST" are borrowed into Hindi and
 *   Odia copy in Latin script constantly, which is exactly how this leaks.
 *
 *   IT CANNOT judge a Devanagari or Odia word for the same thing written in its
 *   own script. Listing those words would mean inventing linguistic facts
 *   nobody here can verify, which this build does not do. That half belongs to
 *   the native review (H13), and this file's existence must not be read as
 *   covering it.
 *
 * The permitted words are listed too, and deliberately not enforced: telling
 * somebody what they MAY say is guidance, and a checker that demanded one of
 * five approved phrases would be writing the copy.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * EVERY SOURCE FILE IN THE PRODUCT, NOT A LIST OF FOUR.
 *
 * THE ADVERSARY PASS CAUGHT THIS ONE, ON ITSELF. A12 asks what a guard is
 * SCOPED BY and whether a plant moves along that axis. The first version of
 * this checker was scoped by a hand-written list of four files, and the plant
 * only ever moved along the TERM axis - a forbidden word inside a file already
 * on the list. Nothing had ever tested the FILE axis, and on that axis the
 * checker was blind: a new screen with an inline string, a new route with a
 * message, a fifth copy surface nobody added to the list, and the rule silently
 * stops applying to the newest code in the repository.
 *
 * That is exactly how `.stryker-tmp` survived `check-tooling`, which is scoped
 * by directory name. The fix is the same shape: scope by something that cannot
 * be forgotten. Every source file under the product, walked.
 */
const SOURCE_ROOTS = ['apps/mobile/src', 'apps/api/src', 'apps/web', 'packages'];

const isCopyBearing = (f) =>
  /\.(ts|tsx|html)$/.test(f) &&
  !/\.(spec|test)\.(ts|tsx)$/.test(f) &&
  !/[\/](test|node_modules)[\/]/.test(f);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e === 'node_modules' || e === '.git') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (isCopyBearing(p)) out.push(p);
  }
  return out;
}

const COPY_FILES = SOURCE_ROOTS.flatMap((r) => walk(r));

/**
 * The forbidden terms, transcribed from LEGAL-AUDIT §7 rather than invented
 * here. Each carries the reason, because a checker that says only "forbidden"
 * teaches nobody and gets argued with.
 */
const FORBIDDEN = [
  ['invoice', 'a tax invoice has mandatory Rule 46 particulars SWAFTO does not capture'],
  ['tax invoice', 'same, and it is the exact term the Rules use'],
  ['gst return', 'SWAFTO computes no tax and files nothing'],
  ['gstr', 'GSTR-1 and GSTR-3B are filings; this is a day book'],
  ['filing', 'nothing this app produces is filed anywhere'],
  ['statement of accounts', 'reads as a formal accounting statement'],
  ['tax document', 'it is not one, and the disclaimer says so'],
];

/** Listed so the rule is a whole rule rather than a list of noes. */
const PERMITTED = [
  'day book',
  'cash book',
  'ledger export',
  'summary for your accountant',
  'transaction record',
];

/**
 * Prose is skipped, and this is the same trade `check-client-logs` makes: the
 * comment that EXPLAINS why "invoice" is forbidden contains the word "invoice",
 * and a check that fails on its own documentation is a check somebody disables.
 * What is scanned is the string literals - which is where copy lives.
 */
const stripComments = (text) =>
  text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/**
 * A DENIAL IS NOT A CLAIM, and forbidding one would forbid the disclaimer.
 *
 * L-15 requires every export to SAY what it is not: *"A record of entries made
 * in this shop book. Not a tax document and not prepared for any government
 * submission."* The first version of this checker flagged that sentence, which
 * is the checker forbidding the exact words the audit demands - found the
 * moment its scope widened past four hand-listed files.
 *
 * So a hit is skipped when the words immediately before it deny it. The window
 * is deliberately tiny - the twenty characters before the term - because a
 * looser one lets "your invoice is ready, this is not a filing" through on the
 * strength of a denial about something else.
 */
const DENIALS = [/\bnot\s+(a|an|your|the)?\s*$/, /\bnever\s+(a|an)?\s*$/, /\bno\s+$/];
const isDenial = (haystack, at) => {
  const before = haystack.slice(Math.max(0, at - 20), at + 1);
  return DENIALS.some((d) => d.test(before));
};

const offences = [];
let filesScanned = 0;
let stringsScanned = 0;

for (const file of COPY_FILES) {
  if (!existsSync(file)) {
    offences.push({
      file,
      line: 0,
      term: '(missing)',
      why: 'this file is listed as a place copy lives and it is not there. Either it moved - in which case fix this list - or a surface with copy in it has been deleted.',
      text: '',
    });
    continue;
  }
  filesScanned += 1;

  const lines = stripComments(readFileSync(file, 'utf8').split('\r\n').join('\n')).split('\n');

  lines.forEach((line, i) => {
    /*
     * Only quoted text and visible markup: a variable called `invoiceId` would
     * be a naming question rather than a legal one, and failing on it would
     * make the check about identifiers instead of about what he reads.
     */
    const quoted = [...line.matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`|>([^<>]+)</g)]
      .map((m) => m[1] ?? m[2] ?? m[3] ?? m[4] ?? '')
      .filter((s) => s.trim().length > 0);
    if (quoted.length === 0) return;
    stringsScanned += quoted.length;

    for (const text of quoted) {
      const haystack = text.toLowerCase();
      for (const [term, why] of FORBIDDEN) {
        // Word-bounded, so "filing" does not fire on "profiling".
        const pattern = new RegExp('(^|[^a-z])' + term + '([^a-z]|$)', 'g');
        for (const hit of haystack.matchAll(pattern)) {
          if (isDenial(haystack, hit.index ?? 0)) continue;
          offences.push({ file, line: i + 1, term, why, text: text.slice(0, 70) });
        }
      }
    }
  });
}

console.log('  source files walked    : ' + filesScanned + ' (every .ts/.tsx/.html in the product)');
console.log('  strings read           : ' + stringsScanned);
console.log('  forbidden terms        : ' + FORBIDDEN.length + ' (LEGAL-AUDIT section 7)');
console.log('  permitted, as guidance : ' + PERMITTED.join(', '));
console.log('  NOT covered here       : the same words in Devanagari or Odia script (H13)');

if (offences.length) {
  console.error('\nEXPORT NAMING (' + offences.length + '):');
  for (const o of offences) {
    console.error('  x    ' + o.file + ':' + o.line + '  "' + o.term + '" - ' + o.why);
    if (o.text) console.error('         in: ' + o.text);
  }
  console.error(
    '\nLEGAL-AUDIT section 7. A GST tax invoice has mandatory particulars under Rule 46\n' +
      'of the CGST Rules and SWAFTO captures none of them, so nothing it produces may\n' +
      'be called one. Say "day book", "cash book", "ledger export", "summary for your\n' +
      'accountant" or "transaction record" instead.',
  );
  process.exit(1);
}

console.log(
  '\nexport naming: no copy calls a day book an invoice, a return or a filing (Latin script)',
);
