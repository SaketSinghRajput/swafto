/**
 * G6 · The DLT constraint is a DESIGN constraint, not a launch task.
 *
 * These tests exist so that an unregistrable SMS is impossible to write, rather than
 * discovered weeks later when the operator rejects the registration.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DLT_LIMITS,
  LANGUAGES,
  TEMPLATES,
  TEMPLATE_IDS,
  countSlots,
  isUnicode,
  renderedLength,
  segmentLimit,
} from '../src/sms/templates.ts';
import { assertSendable } from '../src/sms/port.ts';
import { StubSmsPort } from '../src/sms/stub.ts';

const CODE = '482913'; // synthetic 6-digit OTP
const PHONE = '+919999900000'; // synthetic

describe('G6 · every registered template satisfies the DLT caps', () => {
  for (const id of TEMPLATE_IDS) {
    for (const lang of LANGUAGES) {
      const body = TEMPLATES[id].text[lang];

      it(`${id}/${lang} has exactly the declared number of variable slots`, () => {
        expect(countSlots(body)).toBe(TEMPLATES[id].variableCount);
      });

      it(`${id}/${lang} is within the tightest operator variable cap`, () => {
        expect(countSlots(body)).toBeLessThanOrEqual(DLT_LIMITS.maxVariablesPerTemplate);
      });

      it(`${id}/${lang} does NOT end with a variable`, () => {
        expect(body.trimEnd().endsWith('{#var#}')).toBe(false);
      });

      it(`${id}/${lang} keeps variable content under 40% of the message`, () => {
        const total = renderedLength(body, [CODE]);
        expect((CODE.length / total) * 100).toBeLessThanOrEqual(
          DLT_LIMITS.maxVariableSharePercent,
        );
      });

      it(`${id}/${lang} fits ONE SMS segment (70 chars for Unicode scripts)`, () => {
        const total = renderedLength(body, [CODE]);
        const limit = segmentLimit(body);
        expect(
          total,
          `${id}/${lang} is ${total} chars against a ${limit}-char segment; it would ` +
            `cost two segments on every send, forever`,
        ).toBeLessThanOrEqual(limit);
      });

      it(`${id}/${lang} uses LATIN numerals only (constraint 8)`, () => {
        // Devanagari U+0966-096F, Odia U+0B66-0B6F. Words localise; numbers do not.
        expect(body).not.toMatch(/[०-९୦-୯]/);
      });
    }
  }

  it('carries no personal data beyond the code - one variable per template', () => {
    for (const id of TEMPLATE_IDS) {
      expect(TEMPLATES[id].variableCount, `${id} must carry only the OTP`).toBe(1);
    }
  });

  it('classifies Hindi and Odia as Unicode and English as GSM-7', () => {
    expect(isUnicode(TEMPLATES.otp_signin.text.en)).toBe(false);
    expect(isUnicode(TEMPLATES.otp_signin.text.hi)).toBe(true);
    expect(isUnicode(TEMPLATES.otp_signin.text.od)).toBe(true);
    expect(segmentLimit(TEMPLATES.otp_signin.text.od)).toBe(70);
    expect(segmentLimit(TEMPLATES.otp_signin.text.en)).toBe(160);
  });

  it('warns the user never to share the code, in every language', () => {
    // OTP-relay fraud works by asking the victim to read the code out loud. The
    // warning is the only defence at the moment it matters.
    for (const id of TEMPLATE_IDS) {
      expect(TEMPLATES[id].text.en.toLowerCase()).toContain('never share');
      expect(TEMPLATES[id].text.hi).toMatch(/बताएं|बताए/);
      expect(TEMPLATES[id].text.od).toMatch(/କୁହନ୍ତୁ/);
    }
  });

  it('uses a DISTINCT template per purpose, so an unexpected code is noticeable', () => {
    // A generic "your code is X" would register faster and tell a victim nothing.
    const en = TEMPLATE_IDS.map((id) => TEMPLATES[id].text.en);
    expect(new Set(en).size).toBe(TEMPLATE_IDS.length);
  });
});

describe('G6 · an unregistrable message cannot be sent by ANY route', () => {
  let sms: StubSmsPort;
  beforeEach(() => {
    sms = new StubSmsPort();
  });

  const good = {
    phone: PHONE,
    templateId: 'otp_signin' as const,
    variables: [CODE],
    languageTag: 'en' as const,
  };

  it('accepts a well-formed send', async () => {
    await expect(sms.send(good)).resolves.toBeUndefined();
    expect(sms.count()).toBe(1);
    expect(sms.last()?.variables).toEqual([CODE]);
  });

  it('REJECTS an unregistered templateId', () => {
    expect(() => assertSendable({ ...good, templateId: 'otp_marketing_blast' as never })).toThrow(
      /Unregistered templateId/,
    );
  });

  it('REJECTS a variable-count mismatch, in both directions', () => {
    expect(() => assertSendable({ ...good, variables: [CODE, 'extra'] })).toThrow(/variable slot/);
    expect(() => assertSendable({ ...good, variables: [] })).toThrow(/variable slot/);
  });

  it('REJECTS a variable longer than the 30-character DLT cap', () => {
    expect(() => assertSendable({ ...good, variables: ['x'.repeat(31)] })).toThrow(
      /caps it at 30/,
    );
  });

  it('REJECTS an oversized variable against a short Unicode body', () => {
    // 30 chars of variable against the compact Odia body breaches the share cap or
    // the 70-char segment - either way it must not send.
    expect(() =>
      assertSendable({ ...good, languageTag: 'od', variables: ['9'.repeat(30)] }),
    ).toThrow();
  });

  it('has NO free-text path: an SmsRequest carries no message field', () => {
    // A string body would be unregistrable at the operator, and a free-text path in
    // development is how a free-text call site reaches production.
    const keys = Object.keys(good).sort();
    expect(keys).toEqual(['languageTag', 'phone', 'templateId', 'variables']);
    for (const banned of ['message', 'body', 'text', 'content']) {
      expect(keys).not.toContain(banned);
    }
  });

  it('propagates a carrier failure rather than swallowing it', async () => {
    sms.failNext = true;
    await expect(sms.send(good)).rejects.toThrow(/carrier failure/);
    expect(sms.count()).toBe(0);
  });

  it('sends in the language the shopkeeper chose', async () => {
    await sms.send({ ...good, languageTag: 'od' });
    expect(sms.last()?.languageTag).toBe('od');
  });
});
