/**
 * CRLF-safe source editing. §5.10.1 - a mistake made twice becomes a mechanism.
 *
 * This repo is built on Windows, so the working tree is CRLF. Every literal written
 * in a script uses \n. A find string that spans a line therefore never matches, and
 * the failure is quiet in the worst way: the script reports "anchor missing" and you
 * go hunting for a rename that never happened. That has now cost three separate
 * detours - the detection-rate probes, the SMS table rewriter, and the vector anchors.
 *
 * Use `replaceIn` instead of readFileSync / replace / writeFileSync. It normalises
 * for matching and restores the file's own line endings on write, so the edit is
 * surgical and the diff stays clean.
 */
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Replace `find` with `replace` in `file`, matching regardless of line endings.
 * THROWS if the anchor is absent, so a silent no-op is impossible.
 */
export function replaceIn(file, find, replace, { all = false, optional = false } = {}) {
  const raw = readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  const text = crlf ? raw.split('\r\n').join('\n') : raw;
  const f = find.split('\r\n').join('\n');

  if (!text.includes(f)) {
    if (optional) return false;
    const head = f.split('\n')[0].slice(0, 80);
    throw new Error(`replaceIn: anchor not found in ${file}\n  looked for: ${head}`);
  }

  const out = all ? text.split(f).join(replace) : text.replace(f, replace);
  writeFileSync(file, crlf ? out.split('\n').join('\r\n') : out);
  return true;
}

/** Insert `block` immediately before `anchor`. */
export function insertBefore(file, anchor, block) {
  return replaceIn(file, anchor, block + anchor);
}

/** Read a file with line endings normalised, for inspection only. */
export function readNormalised(file) {
  return readFileSync(file, 'utf8').split('\r\n').join('\n');
}
