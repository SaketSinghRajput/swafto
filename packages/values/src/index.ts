/**
 * THE CANONICAL VALUE REGISTRY.
 *
 * One home for every value that appears in more than one place. **Code imports this;
 * documents are CHECKED against it** (`npm run check:registry`). There is deliberately
 * no markdown table restating these numbers - a second place for a value to live is
 * the defect this module exists to prevent.
 *
 * WHY IT EXISTS. `SECURITY-AUDIT` TB6 said the OTP code lasted 5 minutes while
 * `SMS-TEMPLATES.md` said 10 and the English SMS promised "Valid 10 min". Two
 * artifacts disagreed for two iterations, the code transcribed the wrong one, and
 * nothing could have caught it - because every check compared a document to CODE and
 * never a document to a CONSTANT. That class dies here.
 *
 * TWO KINDS OF VALUE, AND THE DIFFERENCE IS LOAD-BEARING.
 *
 *   OURS      - we chose it. It can be re-chosen, and changing it is a decision.
 *   EXTERNAL  - an outside authority fixed it. We cannot re-choose it; we can only be
 *               right or wrong about what it says, and it CAN GO STALE when the
 *               authority revises. Each carries `source` and `established`, and each
 *               is swept by §6.3 A9 - "derived rather than sourced" applies to a
 *               constant exactly as it applies to a conclusion.
 *
 * DIRECTION OF DEPENDENCY. This package imports the formula engine, never the other
 * way round: ADR-010 makes the engine zero-dependency BY CONTRACT, and the BI gate
 * horizons are genuinely engine-owned. They are re-exported here so consumers get one
 * import without giving the engine a dependency it is forbidden to have.
 */
import { BI_GATES } from '@swafto/formula-engine';
import { CONSENT_PURPOSES as CONSENT_PURPOSE_KEYS, type ConsentPurpose } from '@swafto/schema';

export interface ExternalValue<T> {
  readonly value: T;
  /** The authority. Not "the internet" - the document, section and version. */
  readonly source: string;
  /** When we established it, so a re-check has somewhere to start. */
  readonly established: string;
  /** What breaks if the authority has since revised it. */
  readonly ifStale: string;
}

const external = <T>(v: ExternalValue<T>): ExternalValue<T> => v;

/* ══════════════════════════════════════════════════════════════════════════
 * OURS - chosen, and changing one is a decision
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * OTP code lifetime. Ruled at SPEC-DIGEST C-8 after TB6 and SMS-TEMPLATES disagreed.
 * The English template says "Valid 10 min", and `check:sms` fails if the two part.
 */
export const OTP_TTL_SECONDS = 600;

/** Six digits. With five attempts per code that is five in a million. */
export const OTP_DIGITS = 6;

/**
 * The APP LOCK PIN is FOUR digits, and it is a DIFFERENT VALUE from the OTP.
 *
 * Named separately because the registry check read "4-digit PIN" in SECURITY-AUDIT as
 * a disagreement about `OTP_DIGITS` - which is exactly the ambiguity injection 14 B.4
 * anticipated: "where a value legitimately differs by context, the registry names both
 * with their scopes. Two names beat one ambiguous name."
 *
 * Four is right here and six would be wrong. The PIN is typed many times a day by a
 * shopkeeper mid-transaction, its space is 10,000, and T1.2 protects it with persisted
 * backoff rather than length. The OTP is typed once and defends a different thing.
 */
export const APP_LOCK_PIN_DIGITS = 4;

/**
 * The OTP rate limits, transcribed from SECURITY-AUDIT TB6 - which is OUR document,
 * so these are ours. `lockoutSeconds: 0` marks a telemetry-only rule that can never
 * deny (R-007: carrier-grade NAT means one address can be a whole neighbourhood).
 */
export const OTP_LIMITS = {
  sendPerPhoneBurst: { windowSeconds: 900, max: 3, lockoutSeconds: 3600 },
  sendPerPhoneDaily: { windowSeconds: 86400, max: 10, lockoutSeconds: 86400 },
  sendPerIp: { windowSeconds: 3600, max: 2000, lockoutSeconds: 0 },
  sendPerDevice: { windowSeconds: 3600, max: 5, lockoutSeconds: 3600 },
  verifyPerCode: { windowSeconds: OTP_TTL_SECONDS, max: 5, lockoutSeconds: OTP_TTL_SECONDS },
} as const;

/**
 * WHICH PRIVACY NOTICE A CONSENT WAS GIVEN AGAINST.
 *
 * A consent record that does not name the notice cannot be honoured once the
 * notice changes, and DPDP §6 requires exactly that reconstruction: what he was
 * told, when. The app stamps it onto the decision, the API stamps it onto the
 * row, and both must be the same string - which is why it is here and not in
 * either of them.
 *
 * DATE-SHAPED AND HAND-BUMPED. It changes when the WORDS change, not when the
 * code does, so nothing can derive it. Bumping it is a decision, and the
 * decision is "the notice he agreed to is no longer the notice we show".
 */
export const PRIVACY_NOTICE_VERSION = '2026-09-1';

/**
 * WHICH PURPOSES THE ACCOUNT CANNOT EXIST WITHOUT. Exactly one, and it is the
 * one that IS the account: the ledger he is here to keep. Everything else is
 * refusable without losing anything, which is what makes the consent specific
 * rather than a switch labelled "use the app".
 */
const REQUIRED_PURPOSES: readonly ConsentPurpose[] = ['account_and_ledger'];

/**
 * The purposes the notice asks about, DERIVED FROM THE SCHEMA rather than
 * retyped beside it. The `consents` table's CHECK constraint is the list; a
 * purpose that exists in the database and not on the screen is a row nothing
 * can ever produce, and a purpose on the screen and not in the database is a
 * consent the write refuses. Deriving makes both impossible.
 *
 * A NEW PURPOSE THEREFORE APPEARS ON THE SCREEN BY ITSELF - with no string for
 * it, which B30 fails on. That is the intended order: the notice copy is the
 * gate, not somebody's memory.
 */
export const CONSENT_PURPOSES: readonly {
  readonly key: ConsentPurpose;
  readonly required: boolean;
}[] = CONSENT_PURPOSE_KEYS.map((key) => ({ key, required: REQUIRED_PURPOSES.includes(key) }));

export type { ConsentPurpose };

/**
 * Minimum touch target. **Ours, and deliberately stricter than the platform's 48dp.**
 * The users are 35-70, often with calloused hands, on a INR 7,000 digitiser. This is a
 * product decision about who the app is for rather than a restatement of Material
 * guidance - which is exactly why it sits under OURS and not under EXTERNAL.
 */
export const TOUCH_TARGET_MIN_DP = 56;

/**
 * Minimum body text. Ours, and again stricter than convention, for the same reason:
 * presbyopia is the norm in this age band, and B29 exists to serve it.
 */
export const BODY_TEXT_MIN_SP = 17;

/**
 * Font-scale cap on FIXED-HEIGHT CHROME only (ADR-013). Scrollable content is
 * uncapped and reflows. 1.5 rather than 1.3, because 1.3 is the COMMON setting and
 * capping there would cap the typical user rather than the extreme one.
 */
export const CHROME_FONT_SCALE_CAP = 1.5;

/** BI gate horizons in closed days. Engine-owned; re-exported for one import. */
export { BI_GATES };

/* ══════════════════════════════════════════════════════════════════════════
 * EXTERNAL - an authority fixed it; we can only be right or wrong about it
 * ══════════════════════════════════════════════════════════════════════════ */

/** WCAG 2.2 AA, success criterion 1.4.3 Contrast (Minimum), for normal-size text. */
export const CONTRAST_MIN_RATIO = external({
  value: 4.5,
  source: 'WCAG 2.2 AA, SC 1.4.3 Contrast (Minimum) - normal text',
  established: 'G3, restated iteration 23',
  ifStale:
    'WCAG revises slowly and 4.5:1 has been stable across 2.0, 2.1 and 2.2. If it moves it moves UP, so this is a floor that is safe to be wrong about in only one direction.',
});

/** TRAI DLT: the tightest variable cap observed across the Indian operators. */
export const DLT_VARIABLE_MAX_CHARS = external({
  value: 30,
  source: 'TRAI DLT content-template rules, as applied by the Indian operators',
  established: 'iteration 8, from the DLT research pass',
  ifStale:
    'Operators apply DLT rules with local variation and revise them. If a template is rejected at registration, THIS is the first number to re-check - and H10 puts a human in front of the submission regardless.',
});

/** TRAI DLT: variable content may not exceed this share of the message. */
export const DLT_MAX_VARIABLE_SHARE_PCT = external({
  value: 40,
  source: 'TRAI DLT content-template rules',
  established: 'iteration 8',
  ifStale: 'As for the variable cap: a registration rejection points here first.',
});

/**
 * GSM 03.38: one segment is 160 septets in the basic alphabet - but ANY character
 * outside it forces the whole message to UCS-2 at 70. DC-001, the derived constraint
 * that reshaped every Hindi and Odia template.
 */
export const GSM_SEGMENT_CHARS = external({
  value: 160,
  source: 'GSM 03.38 - the 7-bit default alphabet packed into a 140-byte payload',
  established: 'iteration 8, DC-001',
  ifStale: 'A frozen encoding standard. This will not change.',
});

export const UCS2_SEGMENT_CHARS = external({
  value: 70,
  source: 'GSM 03.38 - 140 bytes at 2 bytes per character',
  established: 'iteration 8, DC-001',
  ifStale: 'A frozen encoding standard. This will not change.',
});

/**
 * The GSM 03.38 basic table has 128 POSITIONS, but position 0x1B is ESC - the escape
 * into the extension table - so there are 127 typeable content characters.
 */
export const GSM_BASIC_CONTENT_CHARS = external({
  value: 127,
  source: 'GSM 03.38 basic alphabet: 128 positions less ESC at 0x1B',
  established: 'iteration 13, adversary pass F-05',
  ifStale:
    'Frozen - but it was RECONSTRUCTED FROM MEMORY rather than read from the standard, which is why it carries an A9 flag. One wrong character silently halves or doubles the segment budget for an entire language.',
});

/** Every external value, for the A9 sweep and for `check:registry`. */
export const EXTERNAL_VALUES = {
  CONTRAST_MIN_RATIO,
  DLT_VARIABLE_MAX_CHARS,
  DLT_MAX_VARIABLE_SHARE_PCT,
  GSM_SEGMENT_CHARS,
  UCS2_SEGMENT_CHARS,
  GSM_BASIC_CONTENT_CHARS,
} as const;
