/**
 * §5.7.2 - the segment constraint, made executable.
 *
 * The 70-character Unicode segment limit was DERIVED, not found in a source, and it
 * changed the template design. It was then defended by a hand count, and the hand
 * count was wrong on eleven of twelve templates: Odia matras and the virama each
 * occupy a separate UTF-16 unit, so visual counting undercounts systematically.
 * The Odia for "code" looks like two glyphs and is four UTF-16 units.
 *
 * A derived constraint defended only by care is not defended. This computes it.
 *
 * Reports, per template x language:
 *   - UTF-16 length of the RENDERED message (code substituted, not the placeholder)
 *   - the encoding the carrier will actually use
 *   - the resulting segment count
 *   - the SMS wire payload in bytes
 *   - whether an 11-char SMS Retriever hash would still fit inside 140 bytes
 *
 * FAILS on more than one segment. WARNS below 5 units of headroom.
 * `--update-md` regenerates the tables in SMS-TEMPLATES.md from these measurements,
 * so no hand-written count survives an iteration.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const CODE = '482913'; // a representative 6-digit OTP
const RETRIEVER_HASH_CHARS = 11;
const RETRIEVER_BYTE_LIMIT = 140;
const HEADROOM_WARN = 5;
const MD = 'docs/spec/SMS-TEMPLATES.md';

/* ---- GSM 03.38 ---------------------------------------------------------- */
const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅå' +
  'Δ_ΦΓΛΩΠΨΣΘΞÆæßÉ' +
  ' !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§' +
  '¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXTENDED = '^{}\\[~]|€'; // each costs TWO septets

/**
 * WHY 127 AND NOT 128 (adversary pass 01, F-05).
 *
 * The GSM 03.38 basic table has 128 POSITIONS, but position 0x1B is ESC - the escape
 * into the extension table, not a character anyone can type. GSM_BASIC therefore
 * holds 127 CONTENT characters, and the extension characters are listed separately
 * above because each costs two septets rather than one.
 *
 * Recorded because this alphabet was reconstructed from memory, and it decides GSM-7
 * (160 chars) against UCS-2 (70). One wrong character silently halves or doubles the
 * budget for an entire language - the mechanism behind DC-001.
 */
export const GSM_BASIC_CONTENT_CHARS = 127;
export { GSM_BASIC, GSM_EXTENDED };

function gsmSeptets(text) {
  let n = 0;
  for (const ch of text) {
    if (GSM_EXTENDED.includes(ch)) n += 2;
    else if (GSM_BASIC.includes(ch)) n += 1;
    else return null; // not representable -> the WHOLE message becomes UCS-2
  }
  return n;
}

function analyse(text) {
  const septets = gsmSeptets(text);
  if (septets !== null) {
    return {
      encoding: 'GSM-7',
      units: septets,
      singleLimit: 160,
      concatLimit: 153,
      bytes: Math.ceil((septets * 7) / 8), // 7 bits per septet, packed
    };
  }
  // UCS-2: `.length` is UTF-16 units, which is exactly what the carrier counts.
  const units = text.length;
  return { encoding: 'UCS-2', units, singleLimit: 70, concatLimit: 67, bytes: units * 2 };
}

const segments = (a) => (a.units <= a.singleLimit ? 1 : Math.ceil(a.units / a.concatLimit));

/* ---- load the registry -------------------------------------------------- */
const src = readFileSync('apps/api/src/sms/templates.ts', 'utf8').split('\r\n').join('\n');
const rows = [];
let id = null;
for (const line of src.split('\n')) {
  const k = /^\s{2}([a-z0-9_]+):\s*\{\s*$/.exec(line);
  if (k) {
    id = k[1];
    continue;
  }
  const t = /^\s+(en|hi|od):\s*'(.+)',\s*$/.exec(line);
  if (t && id) rows.push({ id, lang: t[1], template: t[2] });
}
if (rows.length === 0) {
  console.error('parsed 0 templates from templates.ts');
  process.exit(1);
}

/* ---- measure ------------------------------------------------------------ */
const failures = [];
const warnings = [];
const table = [];

for (const r of rows) {
  const rendered = r.template.split('{#var#}').join(CODE);
  const a = analyse(rendered);
  const segs = segments(a);
  const headroom = a.singleLimit - a.units;

  const withHash = analyse(`${rendered} ${'X'.repeat(RETRIEVER_HASH_CHARS)}`);
  const retrieverFits = withHash.bytes <= RETRIEVER_BYTE_LIMIT;

  table.push({
    ...r,
    rendered,
    ...a,
    segs,
    headroom,
    retrieverBytes: withHash.bytes,
    retrieverFits,
  });

  if (segs > 1) {
    failures.push(
      `${r.id}/${r.lang}: ${a.units} ${a.encoding} units against a ${a.singleLimit}-unit ` +
        `segment -> ${segs} SEGMENTS. Double cost on every send, forever.`,
    );
  } else if (headroom < HEADROOM_WARN) {
    warnings.push(
      `${r.id}/${r.lang}: only ${headroom} unit(s) of headroom (${a.units}/${a.singleLimit}). ` +
        `One correction from a native reviewer makes it two segments.`,
    );
  }
}

/* ---- report ------------------------------------------------------------- */
const pad = (s, n) => String(s).padEnd(n);
console.log(
  `  ${pad('template', 24)} ${pad('enc', 7)} ${pad('units', 6)} ${pad('lim', 5)} ` +
    `${pad('seg', 4)} ${pad('head', 5)} ${pad('bytes', 6)} retriever+hash`,
);
for (const t of table) {
  console.log(
    `  ${pad(`${t.id}/${t.lang}`, 24)} ${pad(t.encoding, 7)} ${pad(t.units, 6)} ` +
      `${pad(t.singleLimit, 5)} ${pad(t.segs, 4)} ${pad(t.headroom, 5)} ${pad(t.bytes, 6)} ` +
      `${t.retrieverBytes}B ${t.retrieverFits ? 'fits' : 'OVER 140'}`,
  );
}

const over = table.filter((t) => !t.retrieverFits);
console.log(
  `\n  SMS Retriever viable across ALL templates: ${over.length === 0 ? 'YES' : 'NO'} ` +
    `(${over.length} of ${table.length} exceed 140 bytes once an 11-char hash is appended)`,
);

/* ---- regenerate the markdown tables ------------------------------------- */
if (process.argv.includes('--update-md')) {
  const rawMd = readFileSync(MD, 'utf8');
  // Preserve the file's own line endings. Writing LF into a CRLF file rewrites every
  // line, and makes check-generated report drift that is not content drift - which is
  // exactly what it did on its first run (adversary pass 01, F-08).
  const mdCrlf = rawMd.includes('\r\n');
  let md = rawMd.split('\r\n').join('\n');
  const byId = new Map();
  for (const t of table) {
    if (!byId.has(t.id)) byId.set(t.id, []);
    byId.get(t.id).push(t);
  }
  let rewritten = 0;
  for (const [tid, group] of byId) {
    const header =
      '| Lang | Text | Enc | Units | Limit | Headroom |\n' +
      '|------|------|-----|-------|-------|----------|\n';
    const body =
      group
        .map(
          (t) =>
            `| \`${t.lang}\` | \`${t.template}\` | ${t.encoding} | ${t.units} | ` +
            `${t.singleLimit} | ${t.headroom} |`,
        )
        .join('\n') + '\n';

    // Find this template's heading, then replace the contiguous table beneath it.
    const lines = md.split('\n');
    const hIdx = lines.findIndex((l) => l.startsWith(`### `) && l.includes(`\`${tid}\``));
    if (hIdx === -1) {
      console.error(`  !    no heading found for ${tid}`);
      continue;
    }
    let start = hIdx + 1;
    while (start < lines.length && !lines[start].startsWith('|')) start += 1;
    let end = start;
    while (end < lines.length && lines[end].startsWith('|')) end += 1;
    if (start >= lines.length) {
      console.error(`  !    no table found under ${tid}`);
      continue;
    }
    md = [...lines.slice(0, start), (header + body).trimEnd(), ...lines.slice(end)].join('\n');
    rewritten += 1;
  }
  writeFileSync(MD, mdCrlf ? md.split('\n').join('\r\n') : md);
  console.log(`  rewrote ${rewritten} table(s) in ${MD} from measured values`);
}

if (process.argv.includes('--json')) {
  writeFileSync('reports/sms-segments.json', JSON.stringify(table, null, 2) + '\n');
  console.log('  wrote reports/sms-segments.json');
}

if (warnings.length) {
  console.warn(`\nHEADROOM WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.warn(`  !    ${w}`);
}
if (failures.length) {
  console.error(`\nSEGMENT FAILURES (${failures.length}):`);
  for (const f of failures) console.error(`  x    ${f}`);
  process.exit(1);
}
console.log('\nsms segments: every template fits one segment');
