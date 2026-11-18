/**
 * ERROR TRACKING WITHOUT A PAID SERVICE: ONE STRUCTURED EVENT PER FAILURE.
 *
 * Every 5xx and every unhandled error is logged as a single JSON line with
 * `"level":50` (pino's `error`) and an `err` object carrying `type`, `message`
 * and `stack`. The request-scoped ones also carry `reqId` and `route` (bound on
 * the request logger in app.ts). A CloudWatch metric filter on `{ $.level = 50 }`
 * is then the whole error-tracking system: a count, an alarm, and a line to read.
 *
 * THE ERROR IS BUILT FIELD BY FIELD, NOT SPREAD. A driver error carries `detail`,
 * `where`, `parameters` and sometimes the row that failed, and those can hold a
 * phone number. Pino's own `err` serializer copies every own property, so logging
 * the raw error is how personal data reaches a log file. Only the four fields
 * below are written, and the message is capped.
 */

export interface ErrorFields {
  /** The constructor name, e.g. `TypeError`, `WriteRefused`. What a metric groups by. */
  readonly type: string;
  readonly message: string;
  readonly stack: string;
  /** A short machine code (`ECONNREFUSED`, a SQLSTATE) when the error has one. */
  readonly code?: string;
}

const MESSAGE_CAP = 500;
const STACK_CAP = 8_000;

/**
 * RT-W4-5 · A DRIVER OR PARSER MESSAGE QUOTES THE CALLER'S VALUE (`invalid input syntax for type
 * uuid: "phone-98765..."`, `Not an ISO date (YYYY-MM-DD): <what was sent>`). Everything after the
 * first `: ` is dropped and any quoted text left is blanked, so what is logged is the shape of the
 * failure and never the input. `code` and `type` carry the diagnosis.
 */
export function scrubMessage(message: string): string {
  return message.split(': ')[0]!.replace(/"[^"]*"/g, '"?"');
}

export function errorFields(error: unknown): ErrorFields {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    const message = scrubMessage(error.message);
    return {
      type: error.constructor?.name && error.constructor.name !== '' ? error.constructor.name : error.name,
      message: message.slice(0, MESSAGE_CAP),
      // The stack's first line repeats the raw message; swap it for the scrubbed one.
      stack: (error.message === '' ? (error.stack ?? error.name) : (error.stack ?? error.name).split(error.message).join(message)).slice(0, STACK_CAP),
      ...(typeof code === 'string' && code.length <= 40 ? { code } : {}),
    };
  }
  // Something that is not an Error was thrown (a string, a bare object). It still gets a stack: where it was caught.
  const stack = new Error('non-Error thrown').stack ?? '';
  const message = typeof error === 'string' ? error : typeof error === 'object' && error !== null ? 'non-Error object thrown' : String(error);
  return { type: 'NonError', message: message.slice(0, MESSAGE_CAP), stack: stack.slice(0, STACK_CAP) };
}

/**
 * The pino `err` serializer: an `Error` is reduced to `errorFields`; something already
 * in that shape (what the call sites pass) is left alone, so it is not double-wrapped.
 */
export function serializeErr(e: unknown): ErrorFields & Record<string, unknown> {
  if (typeof e === 'object' && e !== null && !(e instanceof Error)) {
    const o = e as { type?: unknown; stack?: unknown };
    if (typeof o.type === 'string' && typeof o.stack === 'string') return e as ErrorFields & Record<string, unknown>;
  }
  return errorFields(e) as ErrorFields & Record<string, unknown>;
}

/**
 * The same event for a failure that has no request - an unhandled rejection or an
 * uncaught exception, written straight to stdout by server.ts. Same shape as the
 * request-scoped one, so one metric filter catches both; `reqId` and `route` are
 * null rather than absent, because a field that is sometimes missing is a filter
 * that sometimes silently does not match.
 */
export function processErrorLine(error: unknown, msg: string, now: Date): string {
  return (
    JSON.stringify({
      level: 50,
      time: now.getTime(),
      msg,
      reqId: null,
      route: null,
      err: errorFields(error),
    }) + '\n'
  );
}
