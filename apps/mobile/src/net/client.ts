/**
 * THE CLIENT. The half of the pipeline that did not exist.
 *
 * Seven routes were built, tested and hardened on the server, and nothing in the
 * app had ever called one of them. Both halves passed their own tests, which is
 * exactly how an integration defect survives to the first real handset.
 *
 * NO `fetch` IN THIS FILE. The transport is a port, for the same reason the store
 * has one: this module is then testable against the REAL API through Fastify's
 * `inject`, with no socket and no server process - so the test exercises the
 * routes rather than a mock of them. The native host passes a transport that
 * actually uses `fetch`; nothing else changes.
 *
 * THE LOCAL LEDGER IS AUTHORITATIVE (ADR-018). This is an outbox drain, not a
 * two-way merge: the phone tells the server what happened, and the server's
 * answer never rewrites an entry. The read endpoints exist for other surfaces
 * and for restore; screens derive from the store.
 *
 * NOTHING IS ACKED THAT WAS NOT ACCEPTED. `push` returns the ids the server took,
 * and only those are dropped from the queue. A rejected entry stays queued and is
 * reported - dropping it would lose a figure a shopkeeper typed, silently, which
 * is the one outcome this product cannot have.
 *
 * IT LOGS NOTHING, EVER. Not a failure, not a status, not a redacted body. The app
 * has zero log statements by policy (B36 / check:client-logs) because everything
 * this client handles is money, a customer name or a phone number, and logcat on
 * Android is readable by more than people think.
 */
import type { OutboxRow } from '../store/index.ts';
import { OTP_DIGITS, INVITE_CODE_DIGITS, type ConsentPurpose } from '@swafto/values';
import type { PlanAnswer } from '../app/plan.ts';

/* ---- the ports -------------------------------------------------------- */

export interface HttpRequest {
  readonly method: 'GET' | 'POST';
  /** Path only, always beginning with `/v1/`. The base URL is the transport's. */
  readonly path: string;
  readonly body?: unknown;
  readonly headers: Readonly<Record<string, string>>;
}

export interface HttpResponse {
  readonly status: number;
  readonly body: unknown;
  /** The `Retry-After` header, as whole seconds, when the server sent one. */
  readonly retryAfterSeconds?: number;
}

/**
 * How bytes leave the device. A throw means the request never completed - no
 * network, DNS, TLS, a timeout - and is turned into `Offline` below, because a
 * caller has to be able to tell "the server refused" from "the server never
 * heard", and the second one must never drop a queued row.
 */
export interface Transport {
  send(request: HttpRequest): Promise<HttpResponse>;
}

export interface SessionTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly deviceId: string;
  readonly shopId: string;
}

/**
 * Where the tokens live between launches. A port, because on a real handset the
 * answer is the Android Keystore and in a test it is a variable - and because
 * this file must not be the place that decides.
 */
export interface TokenStore {
  read(): SessionTokens | null;
  write(tokens: SessionTokens | null): void;
}

/* ---- failures a caller has to be able to tell apart -------------------- */

/** The request never completed. The queue must survive this untouched. */
export class Offline extends Error {
  constructor(cause?: unknown) {
    super('the request did not reach the server');
    this.name = 'Offline';
    this.cause = cause;
  }
}

/** The server answered, and the answer was no. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** Present on a 429, in seconds, exactly as the server said it. */
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** No usable session. The host shows the sign-in flow; it does not retry. */
export class Unauthenticated extends Error {
  constructor() {
    super('there is no valid session on this device');
    this.name = 'Unauthenticated';
  }
}

/* ---- what the routes take and give ------------------------------------ */

export interface ConsentDecision {
  readonly noticeVersion: string;
  readonly locale: 'en' | 'hi' | 'or';
  readonly granted: readonly ConsentPurpose[];
}

export interface VerifyRequest {
  readonly phone: string;
  readonly code: string;
  readonly platform: 'android' | 'ios';
  readonly shopName?: string;
  /**
   * Required for a FIRST sign-in, and absent on a returning one. A session
   * that expired after a restart has no consent decision in memory, and
   * inventing `granted: true` for it would be recording a consent nobody gave
   * on this run. The server ignores consent for an existing account and
   * answers `consent_required` for a new one, which the host routes to X0.
   */
  readonly consent?: ConsentDecision;
}

export interface PushRejection {
  readonly id: string;
  readonly field: string;
  readonly message: string;
}

export interface PushResult {
  /** Outbox row ids the server accepted. Only these may be dropped. */
  readonly accepted: readonly string[];
  /** Rows the server refused, with the field it named. They stay queued. */
  readonly rejected: readonly PushRejection[];
  readonly daysWritten: number;
  readonly entriesInserted: number;
  readonly alreadyPresent: number;
}

/**
 * THE LANGUAGE CODE CHANGES AT THE BOUNDARY, AND ONLY HERE.
 *
 * The app says `or` because that is the ISO 639-1 code for Odia and what every
 * layer of the client uses. The database column and the API enum say `od`, which
 * is what the `shops.language` CHECK was written with. Both are internally
 * consistent and they differ, so the translation happens once, at the wire, in
 * the one file that crosses the boundary - rather than in three call sites, two
 * of which will eventually disagree.
 */
const wireLocale = (locale: 'en' | 'hi' | 'or'): 'en' | 'hi' | 'od' =>
  locale === 'or' ? 'od' : locale;

/**
 * INVITE GATE: WHAT A CODE REQUEST CAME TO. `sms` sent a code by SMS; `invite`
 * sent nothing, and the code is the one SWAFTO handed over (INVITE-CODES-GATE
 * section 4, the frozen contract). A missing or unknown `mode` is `sms`, so an
 * older server reads exactly as before. `digits` is believed only when it is
 * one of the two lengths this app has boxes for; anything else is the six-digit
 * OTP, because a box count the server got wrong is a code nobody can finish.
 */
export interface CodeRequestAnswer {
  readonly mode: 'sms' | 'invite';
  readonly digits: number;
  /** SMS mode only: the server's own lifetime for the code it sent. */
  readonly expiresInSeconds?: number;
}

export function codeRequestAnswer(body: unknown): CodeRequestAnswer {
  const b = (body ?? {}) as { mode?: unknown; digits?: unknown; expiresInSeconds?: unknown };
  const digits = b.digits === INVITE_CODE_DIGITS ? INVITE_CODE_DIGITS : OTP_DIGITS;
  return {
    mode: b.mode === 'invite' ? 'invite' : 'sms',
    digits,
    ...(typeof b.expiresInSeconds === 'number' && Number.isFinite(b.expiresInSeconds)
      ? { expiresInSeconds: b.expiresInSeconds }
      : {}),
  };
}

export class ApiClient {
  readonly #transport: Transport;
  readonly #tokens: TokenStore;

  constructor(transport: Transport, tokens: TokenStore) {
    this.#transport = transport;
    this.#tokens = tokens;
  }

  get session(): SessionTokens | null {
    return this.#tokens.read();
  }

  /* ---- the one place a request is made -------------------------------- */

  async #send(request: HttpRequest): Promise<HttpResponse> {
    try {
      return await this.#transport.send(request);
    } catch (e) {
      throw new Offline(e);
    }
  }

  /**
   * An authenticated call, with ONE refresh attempt on a 401 and no more.
   *
   * A retry loop here would turn an expired session into a request storm against
   * the rate limiter, and the limiter would then lock out the shopkeeper's real
   * sign-in. One attempt, then hand the problem to the host.
   */
  async #authed(method: 'GET' | 'POST', path: string, body?: unknown): Promise<unknown> {
    const session = this.#tokens.read();
    if (!session) throw new Unauthenticated();

    /*
     * A POST ALWAYS CARRIES A BODY, even an empty one. Fastify answers 415 to a
     * POST with no content-type, so a route that takes no arguments - revoking
     * a device, cancelling a deletion - failed with an error that looks like a
     * server misconfiguration and is a missing pair of braces.
     */
    const payload = method === 'POST' ? (body ?? {}) : body;
    const carry = payload === undefined ? {} : { body: payload };

    let response = await this.#send({
      method,
      path,
      ...carry,
      headers: { authorization: 'Bearer ' + session.accessToken },
    });

    if (response.status === 401) {
      const refreshed = await this.#refresh(session);
      response = await this.#send({
        method,
        path,
        ...carry,
        headers: { authorization: 'Bearer ' + refreshed.accessToken },
      });
    }

    return this.#unwrap(response);
  }

  /**
   * ONE REFRESH IN FLIGHT AT A TIME. The server rotates the refresh token and
   * treats a replay of an old one as theft, so two calls that 401 together must
   * not both spend the same token: the second waits for the first's result.
   */
  #inflight: Promise<SessionTokens> | null = null;

  #refresh(session: SessionTokens): Promise<SessionTokens> {
    this.#inflight ??= this.#refreshOnce(session).finally(() => {
      this.#inflight = null;
    });
    return this.#inflight;
  }

  async #refreshOnce(session: SessionTokens): Promise<SessionTokens> {
    const response = await this.#send({
      method: 'POST',
      path: '/v1/auth/refresh',
      body: { refreshToken: session.refreshToken },
      headers: {},
    });
    if (response.status === 401 || response.status === 403) {
      /*
       * C-18 / FE-3: ONLY A DEFINITIVE "NO" ENDS THE SESSION. A 401 or 403
       * says the refresh token is dead - expired, or the device was revoked
       * from another handset. Clearing is the point: a device that keeps a
       * dead token retries forever and never shows the sign-in screen.
       */
      this.#tokens.write(null);
      throw new Unauthenticated();
    }
    if (response.status !== 200) {
      /*
       * ANYTHING ELSE IS THE SERVER'S BAD MOMENT, NOT THE TOKEN'S: a 502/503
       * during a deploy, a 429 from the limiter, a 500. A timeout never gets
       * here (it is `Offline`, thrown by #send). The tokens stay, so the next
       * attempt can still refresh; wiping them would cost the shopkeeper an
       * SMS and risk the OTP lockout. The caller backs off (Host.syncLatest).
       */
      throw this.#apiError(response);
    }
    /*
     * REFRESH-TOKEN ROTATION (client half). When the answer carries a new
     * `refreshToken` it replaces the old one in the SAME write as the new
     * access token: two writes could leave a fresh access token beside a
     * refresh token the server has already retired. An answer without one
     * (an older server) keeps the stored token, as before.
     */
    const answer = response.body as { accessToken: string; refreshToken?: string };
    const next = {
      ...session,
      accessToken: answer.accessToken,
      ...(typeof answer.refreshToken === 'string' && answer.refreshToken
        ? { refreshToken: answer.refreshToken }
        : {}),
    };
    this.#tokens.write(next);
    return next;
  }

  /** A 2xx body, or the server's own error turned into something catchable. */
  #unwrap(response: HttpResponse): unknown {
    if (response.status >= 200 && response.status < 300) return response.body;
    if (response.status === 401) {
      this.#tokens.write(null);
      throw new Unauthenticated();
    }
    throw this.#apiError(response);
  }

  #apiError(response: HttpResponse): ApiError {
    const body = (response.body ?? {}) as {
      error?: string;
      message?: string;
      retryAfterSeconds?: number;
    };
    return new ApiError(
      response.status,
      body.error ?? 'error',
      body.message ?? body.error ?? 'the server refused the request',
      body.retryAfterSeconds ?? response.retryAfterSeconds,
    );
  }

  /* ---- sign-in -------------------------------------------------------- */

  /**
   * Ask for a code. The answer is identical whether or not the number is known,
   * and this client must not try to be cleverer than that.
   *
   * THE LANGUAGE IS REQUIRED, and it is the language the SMS goes out in - so a
   * shopkeeper using the app in Odia gets an Odia code. The route rejects an
   * unknown field outright (`additionalProperties: false`), which is how the
   * first draft of this method - sending a `deviceHint` nobody had asked for -
   * would have failed every sign-in in production. It failed here instead.
   */
  async requestOtp(
    phone: string,
    locale: 'en' | 'hi' | 'or' = 'en',
    /** F-24: this install's id, the key of the server's per-device send limit. */
    deviceId?: string,
  ): Promise<CodeRequestAnswer> {
    const body = await this.#unwrap(
      await this.#send({
        method: 'POST',
        path: '/v1/auth/otp/request',
        body: { phone, language: wireLocale(locale), ...(deviceId ? { deviceId } : {}) },
        headers: {},
      }),
    );
    return codeRequestAnswer(body);
  }

  /**
   * Verify the code and, on a first sign-in, create the account WITH consent.
   *
   * THE REQUIRED PURPOSE GOES IN THE VERIFY CALL AND THE OPTIONAL ONES FOLLOW.
   * That is the server's shape, and it is the right one: the account cannot come
   * into existence without the consent that justifies it, while an optional
   * purpose is a record about a user who already exists. If an optional write
   * fails, the sign-in still succeeded - the shopkeeper is in, and the purpose
   * he ticked is simply not recorded rather than half-recorded.
   */
  async verify(request: VerifyRequest): Promise<SessionTokens> {
    const consent = request.consent;
    const response = await this.#send({
      method: 'POST',
      path: '/v1/auth/otp/verify',
      body: {
        phone: request.phone,
        code: request.code,
        device: { platform: request.platform },
        ...(request.shopName ? { shopName: request.shopName } : {}),
        ...(consent
          ? {
              consent: {
                granted: true,
                noticeVersion: consent.noticeVersion,
                locale: wireLocale(consent.locale),
              },
            }
          : {}),
      },
      headers: {},
    });
    /*
     * A 401 HERE IS A WRONG CODE, NOT A DEAD SESSION. `#unwrap` reads every
     * 401 as "the session is gone" and throws `Unauthenticated`, which on this
     * route would tell the sign-in screen that a mistyped digit was a signed-out
     * device. The route says `code_invalid` for a wrong, expired or used-up
     * code alike, so that is passed through as the ApiError it is.
     */
    if (response.status === 401) {
      const code = (response.body as { error?: string } | null)?.error ?? 'code_invalid';
      throw new ApiError(401, code, 'the code was not accepted');
    }
    const body = this.#unwrap(response) as SessionTokens;

    this.#tokens.write(body);

    /*
     * THE OPTIONAL PURPOSES CANNOT UNDO THE SIGN-IN. The doc comment above has
     * always said so and the loop did not: one dropped request here threw out
     * of `verify` AFTER the tokens were written, so the caller saw a failure
     * for a sign-in that had succeeded. Now a refused optional write leaves the
     * purpose unrecorded - off, which is the safe direction - and he is in.
     */
    for (const purpose of consent?.granted ?? []) {
      if (purpose === 'account_and_ledger') continue;
      await this.setConsent(purpose, true, consent!.locale).catch(() => undefined);
    }

    return body;
  }

  /**
   * Sign this handset out. The server is TOLD when it can be, and the tokens
   * go either way.
   *
   * A shopkeeper who taps "Log out" with no signal is logged out: the local
   * tokens are cleared regardless, because a button that only works online is
   * a button that sometimes does nothing. The revoke is best-effort - when it
   * does not reach the server the refresh token still dies at its own expiry.
   * The ledger on the phone is not this method's business and is not touched.
   */
  async signOut(): Promise<void> {
    const session = this.#tokens.read();
    if (session) await this.revokeDevice(session.deviceId).catch(() => undefined);
    this.#tokens.write(null);
  }

  /**
   * M3, S14: the shop's devices. Which shop is the server's business (`shopOf`,
   * S-11) - nothing in this request could name another. Each row is checked
   * for shape, so a malformed answer is an error rather than a screen of
   * blanks.
   */
  async listDevices(): Promise<
    readonly {
      readonly id: string;
      readonly platform: string;
      /** RTI-7: when the server first signed this device in. Null from an older server. */
      readonly createdAt: string | null;
      readonly lastSeenAt: string | null;
      readonly revokedAt: string | null;
      readonly current: boolean;
    }[]
  > {
    const body = (await this.#authed('GET', '/v1/devices')) as { devices?: unknown };
    if (!Array.isArray(body?.devices)) throw new Error('device list: unexpected answer');
    return body.devices.map((raw) => {
      const d = raw as Record<string, unknown>;
      if (typeof d.id !== 'string' || typeof d.platform !== 'string') {
        throw new Error('device list: a row without an id or platform');
      }
      return {
        id: d.id,
        platform: d.platform,
        createdAt: typeof d.createdAt === 'string' ? d.createdAt : null,
        lastSeenAt: typeof d.lastSeenAt === 'string' ? d.lastSeenAt : null,
        revokedAt: typeof d.revokedAt === 'string' ? d.revokedAt : null,
        current: d.current === true,
      };
    });
  }

  /** Sign out this handset from another one. */
  async revokeDevice(deviceId: string): Promise<void> {
    await this.#authed('POST', '/v1/auth/devices/' + encodeURIComponent(deviceId) + '/revoke');
  }

  /**
   * DV-13: the shop's name, as he typed it on X1. The account is created at
   * verify, which on a new install is BEFORE X1 asks the name, so without
   * this the server's `shops.name` stayed empty for ever.
   */
  async setShopName(name: string): Promise<void> {
    await this.#authed('POST', '/v1/me/shop', { name });
  }

  /* ---- the outbox drain ------------------------------------------------ */

  /**
   * Send what is queued, and report exactly what the server took.
   *
   * ONE BATCH, ONE CALL, AND THE CALLER ACKS. The queue is not modified here:
   * this returns the accepted ids and the store drops them, so a client that
   * crashes between the response and the ack retries rows the server already
   * has - which is harmless, because push is idempotent by entry id - rather
   * than dropping rows the server never got.
   */
  async push(
    rows: readonly OutboxRow[],
    /**
     * FE-5: CALLED AFTER EACH BATCH THE SERVER ANSWERED, so the caller can ack
     * it at once. Without it a failure in batch N threw away batches 1..N-1,
     * and a flapping link resent them on every attempt.
     */
    onBatch?: (batch: PushResult, rowsSent: readonly OutboxRow[]) => void,
  ): Promise<PushResult> {
    /*
     * AN OUTBOX LARGER THAN ONE REQUEST. The route caps each array
     * (`maxItems`), and a body over a cap is a 400 for the WHOLE batch - so a
     * phone offline for a busy week, with more than a thousand entries queued,
     * sent the same oversized batch on every sync and never synced again.
     * Requests are sent in order; a failure throws and acks nothing, which is
     * safe because every request is idempotent.
     */
    let merged: PushResult = {
      accepted: [],
      rejected: [],
      daysWritten: 0,
      entriesInserted: 0,
      alreadyPresent: 0,
    };
    for (const batch of batches(rows)) {
      const r = await this.#pushOne(batch);
      onBatch?.(r, batch);
      merged = {
        accepted: [...merged.accepted, ...r.accepted],
        rejected: [...merged.rejected, ...r.rejected],
        daysWritten: merged.daysWritten + r.daysWritten,
        entriesInserted: merged.entriesInserted + r.entriesInserted,
        alreadyPresent: merged.alreadyPresent + r.alreadyPresent,
      };
    }
    return merged;
  }

  async #pushOne(rows: readonly OutboxRow[]): Promise<PushResult> {
    const entries = rows.filter((r) => r.kind === 'entry');
    const days = rows.filter((r) => r.kind === 'day');
    /*
     * PARTIES TRAVEL TOO. `accepted` below is "every row not refused", so a
     * kind left out of the body would be acked without ever being sent - a new
     * customer deleted from the queue by the act of syncing.
     */
    const parties = rows.filter((r) => r.kind === 'party');
    // Decisions 2 and 3: the day facts travel the same way, for the same reason.
    const confirmations = rows.filter((r) => r.kind === 'upi_confirmation');
    const adjustments = rows.filter((r) => r.kind === 'adjustment');
    // PR-1: the item list and the item lines travel the same way.
    const items = rows.filter((r) => r.kind === 'item');
    const itemLines = rows.filter((r) => r.kind === 'item_line');
    // R5 FR-6: a party fact, so it travels too - left out, it would be acked unsent.
    const creditLimits = rows.filter((r) => r.kind === 'credit_limit');

    if (rows.length === 0) {
      return { accepted: [], rejected: [], daysWritten: 0, entriesInserted: 0, alreadyPresent: 0 };
    }

    const body = (await this.#authed('POST', '/v1/sync/push', {
      ...(days.length ? { days: days.map((r) => dayPayload(r)) } : {}),
      ...(parties.length ? { parties: parties.map((r) => r.payload) } : {}),
      ...(entries.length ? { entries: entries.map((r) => r.payload) } : {}),
      ...(confirmations.length ? { upiConfirmations: confirmations.map((r) => r.payload) } : {}),
      ...(adjustments.length ? { adjustments: adjustments.map((r) => r.payload) } : {}),
      ...(items.length ? { items: items.map((r) => r.payload) } : {}),
      ...(itemLines.length ? { itemLines: itemLines.map((r) => r.payload) } : {}),
      ...(creditLimits.length ? { creditLimits: creditLimits.map((r) => r.payload) } : {}),
    })) as {
      daysWritten: number;
      entriesInserted: number;
      entriesAlreadyPresent: number;
      rejected?: readonly PushRejection[];
    };

    const refused = new Set((body.rejected ?? []).map((r) => r.id));
    const accepted = rows.filter((r) => !refused.has(payloadId(r))).map((r) => r.id);

    return {
      accepted,
      rejected: (body.rejected ?? []).map((r) => ({
        // Back to the OUTBOX id, so the caller never has to map it themselves.
        id: rows.find((row) => payloadId(row) === r.id)?.id ?? r.id,
        field: r.field,
        message: r.message,
      })),
      daysWritten: body.daysWritten,
      entriesInserted: body.entriesInserted,
      alreadyPresent: body.entriesAlreadyPresent,
    };
  }

  /* ---- reads ----------------------------------------------------------- */

  /** The server's own derivation, for reconciliation. Screens do not use it. */
  async summary(date: string): Promise<unknown> {
    return this.#authed('GET', '/v1/days/' + encodeURIComponent(date) + '/summary');
  }

  async alerts(): Promise<unknown> {
    return this.#authed('GET', '/v1/alerts');
  }

  async outstanding(): Promise<unknown> {
    return this.#authed('GET', '/v1/parties/outstanding');
  }

  /** Everything held about one customer or supplier - L-04's first half. */
  async exportParty(partyId: string): Promise<unknown> {
    return this.#authed('GET', '/v1/parties/' + encodeURIComponent(partyId) + '/export');
  }

  /**
   * Remove a customer's name and number, and keep the ledger.
   *
   * L-04's second half, and the one the shopkeeper needs when a customer asks
   * him to stop holding their details. What he is owed stays: that figure is
   * his record of his own business, not the customer's personal data.
   */
  async redactParty(partyId: string): Promise<{ redacted: boolean; message: string }> {
    return (await this.#authed(
      'POST',
      '/v1/parties/' + encodeURIComponent(partyId) + '/redact',
    )) as { redacted: boolean; message: string };
  }

  async reports(): Promise<unknown> {
    return this.#authed('GET', '/v1/reports');
  }

  /* ---- DPDP ------------------------------------------------------------ */

  /** Public, and deliberately callable before there is any account. */
  async notice(): Promise<unknown> {
    return this.#unwrap(await this.#send({ method: 'GET', path: '/v1/legal/notice', headers: {} }));
  }

  /**
   * Grant or withdraw one purpose. The SAME CALL either way, which is what makes
   * withdrawal as easy as giving rather than a promise that it is.
   */
  async setConsent(
    purpose: ConsentPurpose,
    granted: boolean,
    locale: 'en' | 'hi' | 'or',
  ): Promise<unknown> {
    return this.#authed('POST', '/v1/me/consent', {
      purpose,
      granted,
      locale: wireLocale(locale),
    });
  }

  /**
   * The consent log AND what it currently means.
   *
   * A caller that wants "is SMS on" must read `current`, never filter the log
   * for `granted` - a withdrawn purpose appears in the log as a true row
   * followed by a false one, and filtering finds the true one.
   */
  async consents(): Promise<{
    noticeVersion: string;
    current: Readonly<Record<string, boolean>>;
    consents: readonly { purpose: string; granted: boolean; at: string }[];
  }> {
    return (await this.#authed('GET', '/v1/me/consents')) as {
      noticeVersion: string;
      current: Readonly<Record<string, boolean>>;
      consents: readonly { purpose: string; granted: boolean; at: string }[];
    };
  }

  /** Just the purposes in force right now, which is what a screen shows. */
  async grantedNow(): Promise<readonly ConsentPurpose[]> {
    const body = await this.consents();
    return Object.entries(body.current)
      .filter(([, on]) => on)
      .map(([purpose]) => purpose as ConsentPurpose);
  }

  async exportMe(): Promise<unknown> {
    return this.#authed('GET', '/v1/me/export');
  }

  /**
   * Ask for erasure. It SCHEDULES - thirty days, and signing in cancels it -
   * so this does not clear the session: the tokens are how he comes back and
   * changes his mind, and throwing them away here would take that with them.
   *
   * The host confirms first. This does not ask.
   */
  async erase(confirmation: string): Promise<{
    requestedAt: string;
    erasesAt: string;
    graceDays: number;
    liveDataErased: boolean;
    message: string;
  }> {
    return (await this.#authed('POST', '/v1/me/erase', { confirm: confirmation })) as {
      requestedAt: string;
      erasesAt: string;
      graceDays: number;
      liveDataErased: boolean;
      message: string;
    };
  }

  /** Changed his mind inside the grace period. */
  async cancelErase(): Promise<{ cancelled: boolean }> {
    return (await this.#authed('POST', '/v1/me/erase/cancel')) as { cancelled: boolean };
  }

  /**
   * The named officer and the SLA.
   *
   * IT NEEDS A TOKEN, and that is the server's decision rather than an oversight
   * on this side: the route sits under `/v1/me`. Somebody who cannot sign in at
   * all still has the officer's name and address, because `notice()` is public
   * and carries them - which is what DPDP §1.7 actually requires.
   */
  async grievance(): Promise<unknown> {
    return this.#authed('GET', '/v1/me/grievance');
  }

  /* ---- PR-7 · the plan. The server decides; this only carries it. ------ */

  async planAnswer(): Promise<PlanAnswer> {
    return (await this.#authed('GET', '/v1/billing/entitlement')) as PlanAnswer;
  }

  /** The 14-day preview. Idempotent: a second call returns the first grant. */
  async startPreview(): Promise<PlanAnswer & { started: boolean }> {
    return (await this.#authed('POST', '/v1/billing/preview')) as PlanAnswer & { started: boolean };
  }

  /** A purchase token from Play, for the server to check with Google. Nothing else is sent. */
  async verifyPurchase(purchaseToken: string, productId: string): Promise<PlanAnswer> {
    return (await this.#authed('POST', '/v1/billing/play/verify', { purchaseToken, productId })) as PlanAnswer;
  }
}

/* ---- payload shaping, kept out of the methods -------------------------- */

/**
 * The route's `maxItems` for each array. A test pins these equal to the
 * route's own, so the two cannot drift apart quietly.
 */
export const PUSH_MAX_ITEMS = {
  days: 400,
  parties: 2000,
  entries: 1000,
  upiConfirmations: 1000,
  adjustments: 1000,
  items: 1000,
  itemLines: 1000,
  creditLimits: 2000,
} as const;

/**
 * The outbox cut into requests the route will take.
 *
 * A DAY TRAVELS WITH ITS ENTRIES. A closed day applied in one request and
 * its entries in a later one would freeze the day first, and every entry
 * after it would be refused `entries_closed_day` for ever - the route's
 * two-pass close only works inside one request. So days are packed whole,
 * oldest first, and parties go no later than the first request, before any
 * entry that names one.
 *
 * ponytail: a single day with more entries than `PUSH_MAX_ITEMS.entries`
 * still goes as one oversized request and is refused. Splitting it needs the
 * day sent open in the early requests and closed in the last.
 */
function batches(rows: readonly OutboxRow[]): OutboxRow[][] {
  // PR-1: an item has no day, like a party, and a line may name one - so items
  // go up front with the parties. A list of 20-40 sits far inside either cap.
  // ponytail: more than `PUSH_MAX_ITEMS.items` items in one outbox share the party chunks unchecked.
  // R5 FR-6: a credit limit is a PARTY fact with no day, so it rides with the
  // parties - no later than its party, and never filed under a day it lacks.
  const isPartyRow = (r: OutboxRow) => r.kind === 'party' || r.kind === 'item' || r.kind === 'credit_limit';
  const parties = rows.filter(isPartyRow);
  const byDay = new Map<string, OutboxRow[]>();
  for (const r of rows) {
    if (isPartyRow(r)) continue;
    const date =
      r.kind === 'day'
        ? (r.payload as { date: string }).date
        : (r.payload as { dayId: string }).dayId;
    byDay.set(date, [...(byDay.get(date) ?? []), r]);
  }

  const out: OutboxRow[][] = [];
  for (let i = 0; i < parties.length; i += PUSH_MAX_ITEMS.parties) {
    out.push(parties.slice(i, i + PUSH_MAX_ITEMS.parties));
  }
  // The last party request carries the first days too, so a small outbox is
  // still exactly one call.
  let current: OutboxRow[] = out.pop() ?? [];
  let days = 0;
  let entries = 0;
  for (const date of [...byDay.keys()].sort()) {
    const group = byDay.get(date)!;
    const d = group.filter((r) => r.kind === 'day').length;
    // Entries AND day facts together against the entries cap: stricter than
    // each of their own caps (which equal it), so no array can overflow.
    const e = group.length - d;
    const hasDayRows = days + entries > 0;
    if (
      hasDayRows &&
      (days + d > PUSH_MAX_ITEMS.days || entries + e > PUSH_MAX_ITEMS.entries)
    ) {
      out.push(current);
      current = [];
      days = 0;
      entries = 0;
    }
    current.push(...group);
    days += d;
    entries += e;
  }
  if (current.length) out.push(current);
  return out;
}

/** Which id the SERVER will report a rejection against, per row kind. */
const payloadId = (row: OutboxRow): string => {
  const payload = row.payload as { id?: string; date?: string };
  return row.kind === 'day' ? (payload.date ?? row.id) : (payload.id ?? row.id);
};

/**
 * A day as the push schema accepts it: no nulls and no unknown keys.
 *
 * `additionalProperties: false` on the server means an extra field is a 400 for
 * the whole batch, and the store's `DayRecord` carries fields the route has no
 * column for. Listing them explicitly is the only shape that cannot rot quietly:
 * a new field on the record does not silently start being sent.
 */
const dayPayload = (row: OutboxRow): Record<string, unknown> => {
  const day = row.payload as {
    date: string;
    state: string;
    openingCash?: number | null;
    countedCash?: number | null;
    differenceReason?: string | null;
    closedAt?: string | null;
    startsAt?: string;
  };
  const out: Record<string, unknown> = { date: day.date, state: day.state };
  // Decision 1: the rule the day was made under. Absent on an older day: 00:00.
  if (day.startsAt) out.startsAt = day.startsAt;
  if (typeof day.openingCash === 'number') out.openingCash = day.openingCash;
  if (typeof day.countedCash === 'number') out.countedCash = day.countedCash;
  if (day.differenceReason) out.differenceReason = day.differenceReason;
  if (day.closedAt) out.closedAt = day.closedAt;
  return out;
};

/** Tokens in memory only - correct for a test, and never for a handset. */
export function memoryTokenStore(initial: SessionTokens | null = null): TokenStore {
  let held = initial;
  return {
    read: () => held,
    write: (tokens) => {
      held = tokens;
    },
  };
}
