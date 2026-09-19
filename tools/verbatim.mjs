/**
 * Which files are EVIDENCE rather than our prose.
 *
 * Verbatim human instructions under INJECTIONS/ describe defects in order to forbid
 * them, so they contain the exact strings our checkers hunt for: injection 08 quotes
 * a resolved-status-plus-outstanding-work contradiction, and the autonomy amendment
 * names the blocked-on-a-human status repeatedly while abolishing it. Both tripped a
 * checker within minutes of the injections being committed. (Neither forbidden token
 * is spelled out here, for the same reason.)
 *
 * §5.6 forbids editing evidence to satisfy a linter, exactly as for `docs/`. This is
 * one predicate rather than a copy in each tool, because the SECOND checker to need
 * it is the point at which two copies start drifting apart.
 *
 * Keyed on the marker the extractor writes, NOT on the directory, so an adversary
 * pass we wrote ourselves in the same folder is still fully checked.
 */
import { readFileSync } from 'node:fs';

export const VERBATIM_MARKER = 'VERBATIM. This is the human instruction as received';

export function isVerbatim(file) {
  try {
    return readFileSync(file, 'utf8').slice(0, 400).includes(VERBATIM_MARKER);
  } catch {
    return false; // unreadable or binary: not evidence, let the caller deal with it
  }
}
