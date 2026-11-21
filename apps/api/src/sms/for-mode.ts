/**
 * THE SMS PORT FOR AN AUTH MODE (server.ts wires this; a test can too).
 *
 * `invite`: a port whose `send` THROWS (RT-W4-8). Nothing can send and no plaintext code is ever
 * kept in memory or logged, because the stub (which keeps codes) is never constructed. A route that
 * reached it would be a 500, which is why the invite-mode request routes answer before they get
 * anywhere near it. `sms`: the stub, until the DLT adapter exists (H1); `assertSmsPort` still guards it.
 */
import type { AuthMode } from '../config.ts';
import type { SmsPort } from './port.ts';
import { StubSmsPort } from './stub.ts';

export function smsPortFor(mode: AuthMode, stub: () => StubSmsPort): SmsPort {
  if (mode === 'invite') {
    return {
      send() {
        throw new Error('SMS is disabled in AUTH_MODE=invite');
      },
    };
  }
  return stub();
}
