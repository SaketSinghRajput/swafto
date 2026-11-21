/**
 * STAGING TESTER OTP PATH. With the stub SMS port and an allow-list, the OTP of a listed number (and
 * only that) is written as one `warn` line. Every other log path keeps redacting phone and code.
 */
import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.ts';
import { StubSmsPort } from '../src/sms/stub.ts';
import { NOTICE_VERSION } from '../src/dpdp/routes.ts';
import { testDeps } from './_deps.ts';

const LISTED = '+919999900001';
const OTHER = '+919999900002'; // in the test range, but not on the list
const REAL = '+919812345678';

function harness() {
  const staging: string[] = [];
  const logged: string[] = [];
  const sms = new StubSmsPort(100, { stagingTestPhones: [LISTED], emit: (l) => void staging.push(l) });
  const app = buildApp(testDeps({ sms, logLevel: 'trace', logStream: { write: (c: string) => void logged.push(c) } }));
  const request = (phone: string) =>
    app.inject({
      method: 'POST',
      url: '/v1/auth/otp/request',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ phone, language: 'en' }),
    });
  return { app, sms, staging, logged, request };
}

describe('staging tester OTP', () => {
  it('an allow-listed number logs ONE warn line with its OTP, and that code verifies', async () => {
    const h = harness();
    expect((await h.request(LISTED)).statusCode).toBe(202);
    expect(h.staging).toHaveLength(1);
    const line = JSON.parse(h.staging[0]!) as Record<string, unknown>;
    expect(line).toMatchObject({ level: 40, msg: 'staging test otp', phone: LISTED });
    expect(String(line.code)).toMatch(/^[0-9]{6}$/);
    expect(h.staging[0]!.endsWith('\n')).toBe(true);

    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/auth/otp/verify',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({
        phone: LISTED,
        code: line.code,
        device: { platform: 'android' },
        shopName: 'Tester Shop',
        consent: { granted: true, noticeVersion: NOTICE_VERSION, locale: 'en' },
      }),
    });
    expect(res.statusCode).toBe(200);
  });

  it('a number not on the list logs nothing and sends nothing, even inside the test range', async () => {
    const h = harness();
    for (const phone of [OTHER, REAL]) expect((await h.request(phone)).statusCode).toBe(202);
    expect(h.staging).toHaveLength(0);
    expect(h.logged.join('')).not.toContain('staging test otp');
  });

  it('an empty or absent allow-list never logs, for any number', async () => {
    const staging: string[] = [];
    const none = new StubSmsPort(100, { emit: (l) => void staging.push(l) });
    const empty = new StubSmsPort(100, { stagingTestPhones: [], emit: (l) => void staging.push(l) });
    for (const sms of [none, empty]) {
      await sms.send({ phone: LISTED, templateId: 'otp_signin', variables: ['123456'], languageTag: 'en' });
    }
    expect(staging).toHaveLength(0);
  });

  it('the app log still redacts the phone and the OTP on every path, listed number included', async () => {
    const h = harness();
    await h.request(LISTED);
    const code = JSON.parse(h.staging[0]!).code as string;
    h.app.log.warn({ phone: LISTED, code, otp: code, body: { phone: LISTED, code } }, 'probe');
    await h.app.inject({
      method: 'POST',
      url: '/v1/auth/otp/verify',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ phone: LISTED, code, device: { platform: 'android' } }),
    });
    const raw = h.logged.join('');
    expect(raw).toContain('[redacted]');
    expect(raw).not.toContain(LISTED);
    expect(raw).not.toContain('9999900001');
    expect(raw).not.toContain(code);
  });
});
