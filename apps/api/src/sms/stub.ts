/**
 * The local SmsPort adapter. Records sends in memory so rate limits, throttles and
 * failure states are all testable without a carrier (AD-004).
 *
 * It runs the SAME `assertSendable` validation as a real provider will, against the
 * SAME registry, so an unregistrable message fails in development exactly as it would
 * fail at the operator. That is the entire reason the stub exists rather than a no-op
 * mock: a mock that accepts anything would hide the bug until registration.
 */
import { assertSendable, type SmsPort, type SmsRequest } from './port.ts';

export interface RecordedSend {
  readonly phone: string;
  readonly templateId: string;
  readonly languageTag: string;
  /** Present so tests can assert the code was delivered. NEVER logged. */
  readonly variables: readonly string[];
  readonly at: string;
}

export interface StubStagingOptions {
  /** Exact normalised numbers whose OTP is written out. Empty or absent: nothing is ever written. */
  readonly stagingTestPhones?: readonly string[];
  /** Where the one tester line goes (a full JSON line, newline included). */
  readonly emit?: (line: string) => void;
}

/**
 * The single deliberate OTP disclosure: a pino-shaped `warn` line, built by hand so it is not subject to
 * the app logger's redaction (which stays strict for every other line). Only for allow-listed numbers.
 */
export function stagingOtpLine(phone: string, code: string, at: Date): string {
  return JSON.stringify({ level: 40, time: at.getTime(), msg: 'staging test otp', phone, code }) + '\n';
}

export class StubSmsPort implements SmsPort {
  private readonly sent: RecordedSend[] = [];
  /**
   * RT-W4-8 · only the newest `maxKept` sends are held (plaintext OTPs included), so a staging process
   * that signs people in for weeks does not grow without bound. Tests never come near the default.
   */
  private readonly maxKept: number;
  private readonly staging: ReadonlySet<string>;
  private readonly emit: (line: string) => void;
  constructor(maxKept = 1000, staging: StubStagingOptions = {}) {
    this.maxKept = maxKept;
    this.staging = new Set(staging.stagingTestPhones ?? []);
    this.emit = staging.emit ?? (() => undefined);
  }
  /** Set to make the next send fail, for testing carrier-failure paths. */
  public failNext = false;

  async send(req: SmsRequest): Promise<void> {
    assertSendable(req); // same validation as the real adapter
    if (this.failNext) {
      this.failNext = false;
      throw new Error('stub: simulated carrier failure');
    }
    this.sent.push({
      phone: req.phone,
      templateId: req.templateId,
      languageTag: req.languageTag,
      variables: [...req.variables],
      at: new Date().toISOString(),
    });
    if (this.sent.length > this.maxKept) this.sent.splice(0, this.sent.length - this.maxKept);
    const code = req.variables[0];
    if (this.staging.has(req.phone) && req.templateId.startsWith('otp_') && code !== undefined) {
      this.emit(stagingOtpLine(req.phone, code, new Date()));
    }
  }

  all(): readonly RecordedSend[] {
    return this.sent;
  }
  forPhone(phone: string): readonly RecordedSend[] {
    return this.sent.filter((s) => s.phone === phone);
  }
  last(): RecordedSend | undefined {
    return this.sent[this.sent.length - 1];
  }
  count(): number {
    return this.sent.length;
  }
  reset(): void {
    this.sent.length = 0;
    this.failNext = false;
  }
}
