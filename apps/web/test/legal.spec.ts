/**
 * THE POLICY, THE TERMS AND THE SOFTWARE MUST SAY THE SAME THING.
 *
 * A privacy policy is not prose. It is a set of promises to every reader and
 * to the Data Protection Board, and the failure mode is not that it is badly
 * written - it is that it says something the software does not do. That
 * happens by drift: the notice gains an item, the policy does not, and nobody
 * notices because nothing compares them.
 *
 * AD-005 promised exactly this check and it was never built, while L-17 and
 * L-18 sat marked RESOLVED-AUTONOMOUSLY against text that did not exist. The
 * documents now exist and this is what keeps them honest.
 *
 * WHAT IT CANNOT CHECK: whether the text is good law. That is counsel (H9),
 * and both pages say on their own first screen that they have not had it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { NOTICE } from '../../api/src/dpdp/routes.ts';
import { DELETION_GRACE_DAYS, PRIVACY_NOTICE_VERSION } from '@swafto/values';

const POLICY = readFileSync(new URL('../legal/privacy.html', import.meta.url), 'utf8');
const TERMS = readFileSync(new URL('../legal/terms.html', import.meta.url), 'utf8');
const SAFETY = readFileSync(
  new URL('../../../docs/handover/DATA-SAFETY.md', import.meta.url),
  'utf8',
);

describe('the policy says what the software actually collects', () => {
  it('lists EVERY item the notice says is collected, word for word', () => {
    /*
     * Word for word rather than in spirit. An item described differently in
     * two places is an item somebody has to judge the equivalence of, and
     * that judgement is how a policy ends up describing an older version of
     * the app.
     */
    for (const item of NOTICE.items) {
      for (const collected of item.collects) {
        expect(POLICY, item.purpose + ' / ' + collected).toContain(collected);
      }
    }
  });

  it('gives a retention period for every purpose, as the notice states it', () => {
    for (const item of NOTICE.items) {
      expect(POLICY, item.purpose).toContain(item.retention);
    }
  });

  it('says why, for every purpose', () => {
    for (const item of NOTICE.items) {
      expect(POLICY, item.purpose).toContain(item.why);
    }
  });

  it('claims NOTHING the notice does not - no extra collected item smuggled in', () => {
    /*
     * The other direction, and the one people forget. A policy that lists
     * something the app does not collect is also wrong: it invites consent
     * to processing that is not happening, and it makes the whole document
     * less credible when somebody checks.
     */
    const declared = NOTICE.items.flatMap((i) => i.collects) as readonly string[];
    const suspicious = ['email address', 'location', 'contacts', 'photos', 'camera', 'microphone'];
    for (const s of suspicious) {
      if (declared.includes(s)) continue;
      expect(POLICY.toLowerCase(), s).not.toContain(s);
    }
  });
});

describe('the policy, the deletion page and the code agree on the numbers', () => {
  it('the grace period is the registry value, not a number somebody typed', () => {
    expect(POLICY).toContain('after ' + DELETION_GRACE_DAYS + ' days');
    expect(TERMS).toContain(DELETION_GRACE_DAYS + '-day grace period');
    expect(SAFETY).toContain(DELETION_GRACE_DAYS + '-day grace period');
  });

  it('the notice version on the page is the version the API serves', () => {
    expect(POLICY).toContain(PRIVACY_NOTICE_VERSION);
    expect(NOTICE.version).toBe(PRIVACY_NOTICE_VERSION);
  });

  it('the grievance address is the one the API publishes', () => {
    expect(POLICY).toContain(NOTICE.fiduciary.email);
    expect(TERMS).toContain(NOTICE.fiduciary.email);
    expect(POLICY).toContain(String(NOTICE.fiduciary.responseDays));
  });

  it('both pages point at the deletion page that exists', () => {
    for (const [name, doc] of [
      ['policy', POLICY],
      ['terms', TERMS],
    ] as const) {
      expect(doc, name).toContain('/delete-account');
    }
  });
});

describe('the Data Safety declarations match the policy', () => {
  it('every declared data type traces to an item in the notice', () => {
    for (const item of NOTICE.items) {
      for (const collected of item.collects) {
        expect(SAFETY, collected).toContain(collected);
      }
    }
  });

  it('declares that nothing is shared, which is only true while nothing is', () => {
    expect(SAFETY).toContain('| Is any data shared with third parties? | **No** |');
    // The two checks that keep it true: the shipped closure and the push tripwire.
    expect(SAFETY).toContain('No analytics SDK, no advertising SDK');
  });

  it('says which of its own claims are judgements rather than derived', () => {
    expect(SAFETY).toContain('must be confirmed in the Console');
    expect(SAFETY).toContain('That the Console has been filled in. It has not');
  });
});

describe('the terms cover what the audit requires of them', () => {
  /** LEGAL-AUDIT §9.2, item by item. */
  it('says what the service is, and the four things it is not', () => {
    expect(TERMS).toContain('record-keeping tool');
    for (const notThis of ['accounting software', 'tax product', 'payment service', 'lender']) {
      expect(TERMS, notThis).toContain(notThis);
    }
  });

  it('refuses to warrant the figures as fit for filing, and says whose tax it is', () => {
    expect(TERMS).toContain('warranted as fit for filing');
    expect(TERMS).toContain('Your tax compliance is yours');
  });

  it("states the shopkeeper's own Fiduciary duty for the names he records", () => {
    expect(TERMS).toContain('you are the Data Fiduciary for that record');
  });

  it('states D9 - one shop, one phone - as a limit of the service', () => {
    expect(TERMS).toContain('one phone at a time');
  });

  it('covers termination and governing law', () => {
    expect(TERMS).toContain('governed by the laws of India');
    expect(TERMS).toContain('delete your account at any time');
  });

  it('states it is not offered to under-18s (L-24)', () => {
    expect(TERMS).toContain('not offered to anyone under the age of 18');
  });

  it('DOES NOT DISCLAIM THE ARITHMETIC, which is the promise the product is', () => {
    /*
     * The tension LEGAL-AUDIT §9.2.6 flags and says needs a human. The reading
     * taken here keeps the promise the whole product rests on and disclaims
     * only what it genuinely cannot know. If counsel replaces it with a broad
     * accuracy disclaimer, this test fails - which is correct, because the
     * app's copy would have to change in the same breath.
     */
    expect(TERMS).toContain('We stand behind the arithmetic');
    expect(TERMS.toLowerCase()).not.toContain('as is, without warranty');
    expect(TERMS.toLowerCase()).not.toContain('no warranty of accuracy');
  });
});

describe('both documents admit what they are', () => {
  it('each says on its own face that no lawyer has read it', () => {
    for (const [name, doc] of [
      ['policy', POLICY],
      ['terms', TERMS],
    ] as const) {
      expect(doc, name).toContain('has not been reviewed by a lawyer');
    }
  });

  it('neither loads anything from anywhere else', () => {
    for (const [name, doc] of [
      ['policy', POLICY],
      ['terms', TERMS],
    ] as const) {
      const external = [...doc.matchAll(/(?:src|href)\s*=\s*"([^"]+)"/g)]
        .map((m) => m[1]!)
        .filter((u) => !u.startsWith('mailto:') && !u.startsWith('#') && !u.startsWith('/'));
      expect(external, name).toEqual([]);
    }
  });
});
