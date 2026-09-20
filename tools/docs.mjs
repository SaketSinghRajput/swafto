/**
 * WHERE EVERY GOVERNANCE DOCUMENT LIVES - one map, so a move is one edit.
 *
 * Before injection 21 every tool hard-coded bare filenames like 'BUILD_STATE.md',
 * twenty-odd of them across ten checks. The reorganisation had to touch all of them,
 * and a path is exactly the kind of thing that gets updated in nine places out of ten
 * and still looks fine, because the tenth check goes quiet rather than loud.
 *
 * THE QUIET FAILURE IS THE ONE THAT MATTERS (injection 21 C). Several readers here
 * are written as `existsSync(f) ? readFileSync(f) : ''`, which is right for an
 * optional file and catastrophic for a required one: the check scans an empty string,
 * finds nothing wrong, prints a zero and exits 0. So `docPath` THROWS on a name it
 * does not know and on a file that is not there. A check that cannot find its subject
 * must fail, not pass.
 */
import { existsSync } from 'node:fs';

/** The name a document calls itself by -> where it actually is. */
export const DOCS = {
  // governance: what the build has decided about itself
  'BUILD_STATE.md': 'docs/governance/BUILD_STATE.md',
  'BUILD_LOG.md': 'docs/governance/BUILD_LOG.md',
  'FINDINGS.md': 'docs/governance/FINDINGS.md',
  'REVIEW.md': 'docs/governance/REVIEW.md',
  'DECISIONS-AUTONOMOUS.md': 'docs/governance/DECISIONS-AUTONOMOUS.md',
  'PROJECTION.md': 'docs/governance/PROJECTION.md',
  'DERIVED-CONSTRAINTS.md': 'docs/governance/DERIVED-CONSTRAINTS.md',
  'VERIFIERS.md': 'docs/governance/VERIFIERS.md',

  // benchmarks: the conditions that define done, and their readings
  'BENCHMARKS.md': 'docs/benchmarks/BENCHMARKS.md',
  'BENCHMARKS-RESULTS.md': 'docs/benchmarks/BENCHMARKS-RESULTS.md',
  'benchmarks.lock': 'docs/benchmarks/benchmarks.lock',

  // audits: the two that need a human with a licence
  'LEGAL-AUDIT.md': 'docs/audits/LEGAL-AUDIT.md',
  'SECURITY-AUDIT.md': 'docs/audits/SECURITY-AUDIT.md',

  // spec: what we decided the source documents mean
  'SPEC-DIGEST.md': 'docs/spec/SPEC-DIGEST.md',
  'TECH-DECISIONS.md': 'docs/spec/TECH-DECISIONS.md',
  'SMS-TEMPLATES.md': 'docs/spec/SMS-TEMPLATES.md',
  'TRACEABILITY.md': 'docs/spec/TRACEABILITY.md',

  // handover: what a human has to do
  'HUMAN-ACTIONS.md': 'docs/handover/HUMAN-ACTIONS.md',
  'DEFERRED.md': 'docs/handover/DEFERRED.md',
  'DEVICE-CHECKLIST.md': 'docs/handover/DEVICE-CHECKLIST.md',
};

/**
 * Resolve a document by name. Throws rather than handing back a path that is not
 * there, because the caller's next move is usually to read it into a scan that finds
 * nothing wrong with an empty string.
 */
export function docPath(name) {
  const p = DOCS[name];
  if (!p) {
    throw new Error(
      `docs.mjs does not know "${name}". Add it to DOCS rather than hard-coding a ` +
        'path - a filename in one tool and a map in another is how a move half-lands.',
    );
  }
  if (!existsSync(p)) {
    throw new Error(
      `${name} should be at ${p} and is not. Refusing to continue: a check that ` +
        'cannot find its subject must fail loudly, never scan nothing and pass.',
    );
  }
  return p;
}

/** Every document path, for the checks that walk the whole set. */
export const ALL_DOCS = Object.values(DOCS);
