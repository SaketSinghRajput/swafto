/**
 * THE DEMO LOGIN: one fixed phone and one fixed code, so the founder can sign in before any
 * message channel works and a Google Play reviewer has an account to use.
 *
 * SMALLEST SECURE VERSION.
 *  - Config holds the phone (inside the reserved +91 99999 0xxxx test range) and the KEYED HASH
 *    of the code (`hashOtp`, the same HMAC the OTP store uses). The plaintext is in neither the
 *    config nor the repo. Both unset = off; one without the other refuses to boot.
 *  - It never sends anything, and the request reply for the demo number is the reply every other
 *    number gets, so the number is not recognisable as special.
 *  - Verify takes a rate-limit ticket (5 per hour, then a one-hour lockout; see
 *    `OTP_LIMITS.verifyDemo`) BEFORE comparing, in addition to the per-IP rule, so the fixed code
 *    cannot be brute-forced.
 *  - The account is an ordinary tenant. Number change and the app-lock PIN reset are refused for
 *    this number (see `DEMO_PROTECTED_TEMPLATES`), so nobody who gets in can take it over or lock it.
 *
 * RESIDUAL (docs/auth/INVITE-CODES.md): anyone who holds the code holds the demo shop, so it must
 * hold synthetic data only; and a +91 99999 0xxxx number could in theory belong to a real subscriber.
 */
import { normaliseIndianMobile } from './phone.ts';

export interface DemoLogin {
  readonly phone: string;
  readonly codeHash: string;
}

/** The reserved test range: +91 99999 0xxxx (the same range STAGING_TEST_PHONES is held to). */
export const DEMO_PHONE_PREFIX = '+91999990';

/** `hashOtp` returns base64url of a 32-byte HMAC: 43 characters. */
const HASH_SHAPE = /^[A-Za-z0-9_-]{43}$/;

/** SmsPort templates that would let a demo-number holder change or lock the demo account. */
export const DEMO_PROTECTED_TEMPLATES: readonly string[] = [
  'otp_number_change_old',
  'otp_number_change_new',
  'otp_pin_reset',
];

/** The demo settings from the environment, or null when the feature is off. Errors name variables only. */
export function parseDemoLogin(env: NodeJS.ProcessEnv): DemoLogin | null {
  const rawPhone = (env.DEMO_LOGIN_PHONE ?? '').trim();
  const rawHash = (env.DEMO_LOGIN_CODE_HASH ?? '').trim();
  if (rawPhone === '' && rawHash === '') return null;
  if (rawPhone === '' || rawHash === '') {
    throw new Error('DEMO_LOGIN_PHONE and DEMO_LOGIN_CODE_HASH must be set together, or both left unset.');
  }
  const phone = normaliseIndianMobile(rawPhone);
  if (phone === null || !phone.startsWith(DEMO_PHONE_PREFIX)) {
    throw new Error('DEMO_LOGIN_PHONE must be a number in the +91 99999 0xxxx test range, so a real number is never the demo account.');
  }
  if (!HASH_SHAPE.test(rawHash)) {
    throw new Error('DEMO_LOGIN_CODE_HASH is not a code hash (43 base64url characters). Make it with `invite demo-hash`.');
  }
  return { phone, codeHash: rawHash };
}

export const isDemoPhone = (demo: DemoLogin | null | undefined, phone: string): boolean =>
  demo != null && demo.phone === phone;

/** `+91 XXXXXX0001`: last four digits only. For logs and the audit trail. */
export const maskPhone = (phone: string): string => '+91 XXXXXX' + phone.slice(-4);
