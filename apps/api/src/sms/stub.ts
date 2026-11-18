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

export class StubSmsPort implements SmsPort {
  private readonly sent: RecordedSend[] = [];
  /**
   * RT-W4-8 · only the newest `maxKept` sends are held (plaintext OTPs included), so a staging process
   * that signs people in for weeks does not grow without bound. Tests never come near the default.
   */
  private readonly maxKept: number;
  constructor(maxKept = 1000) {
    this.maxKept = maxKept;
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
