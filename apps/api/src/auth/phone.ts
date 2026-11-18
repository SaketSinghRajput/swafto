/**
 * ONE PHONE NORMALISER, used by sign-in (request and verify) and by web account
 * deletion. C-10 / RT-2.
 *
 * WHY ONE. The deletion path used to look a number up by exact string while sign-in
 * demanded `+91XXXXXXXXXX`; a shopkeeper who typed `9876500001` on the web page
 * got `sent: true` and no SMS, ever. Two normalisers drift; one cannot.
 *
 * ACCEPTED, all becoming `+919876500001`:
 *   9876500001 · 09876500001 · 919876500001 · +919876500001 · +91 98765 00001 ·
 *   +91-98765-00001 · 0091 98765 00001
 * Spaces and hyphens are separators. Anything else (letters, newlines, non-ASCII
 * digits, a `+` anywhere but the front, full-width forms) is refused rather than
 * cleaned: a number we "repaired" is a number the user did not type.
 *
 * The result must still be an Indian mobile (6-9 then nine digits, the registry's
 * INDIAN_MOBILE), so no SMS is ever spent on an impossible number (HT-5).
 */
import { INDIAN_MOBILE } from '@swafto/values';

export function normaliseIndianMobile(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (!/^\+?[0-9 -]+$/.test(raw)) return null;

  const plus = raw.startsWith('+');
  const digits = raw.replace(/[ +-]/g, '');

  let national: string;
  if (plus) {
    // A leading `+` means a country code follows; only +91 is ours.
    if (digits.length !== 12 || !digits.startsWith('91')) return null;
    national = digits.slice(2);
  } else if (digits.length === 10) {
    national = digits;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    national = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    national = digits.slice(2);
  } else if (digits.length === 14 && digits.startsWith('0091')) {
    national = digits.slice(4);
  } else {
    return null;
  }
  return INDIAN_MOBILE.test(national) ? '+91' + national : null;
}

/** What the API tells a caller whose number is not an Indian mobile. Leaks nothing. */
export const INVALID_PHONE = {
  error: 'invalid_phone',
  message: 'Enter a valid 10-digit Indian mobile number, for example 98765 43210.',
} as const;
