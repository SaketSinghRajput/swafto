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
import { readFileSync, existsSync } from 'node:fs';

/**
 * Every file that holds a word a shopkeeper will read. A new surface with copy
 * in it joins this list, and the list is short on purpose - copy lives in few
 * places in this repository, and that is worth keeping true.
 */
const COPY_FILES = [
  'apps/mobile/src/i18n/strings.ts',
  'apps/api/src/sms/templates.ts',
  'apps/api/src/dpdp/routes.ts',
  'apps/web/delete-account/index.html',
];

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
        if (new RegExp('(^|[^a-z])' + term + '([^a-z]|$)').test(haystack)) {
          offences.push({ file, line: i + 1, term, why, text: text.slice(0, 70) });
        }
      }
    }
  });
}

console.log('  copy surfaces scanned  : ' + filesScanned + ' of ' + COPY_FILES.length);
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
