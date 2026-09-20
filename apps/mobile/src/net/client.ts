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
import type { ConsentPurpose } from '@swafto/values';

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
  readonly consent: ConsentDecision;
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

  async #refresh(session: SessionTokens): Promise<SessionTokens> {
    const response = await this.#send({
      method: 'POST',
      path: '/v1/auth/refresh',
      body: { refreshToken: session.refreshToken },
      headers: {},
    });
    if (response.status !== 200) {
      /*
       * The refresh token is dead - expired, or the device was revoked from
       * another handset. Clearing is the point: a device that keeps a dead
       * token retries forever and never shows the sign-in screen.
       */
      this.#tokens.write(null);
      throw new Unauthenticated();
    }
    const next = { ...session, accessToken: (response.body as { accessToken: string }).accessToken };
    this.#tokens.write(next);
    return next;
  }

  /** A 2xx body, or the server's own error turned into something catchable. */
  #unwrap(response: HttpResponse): unknown {
    if (response.status >= 200 && response.status < 300) return response.body;
    const body = (response.body ?? {}) as {
      error?: string;
      message?: string;
      retryAfterSeconds?: number;
    };
    if (response.status === 401) {
      this.#tokens.write(null);
      throw new Unauthenticated();
    }
    throw new ApiError(
      response.status,
      body.error ?? 'error',
      body.message ?? body.error ?? 'the server refused the request',
      body.retryAfterSeconds,
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
  ): Promise<{ expiresInSeconds: number }> {
    const body = await this.#unwrap(
      await this.#send({
        method: 'POST',
        path: '/v1/auth/otp/request',
        body: { phone, language: wireLocale(locale) },
        headers: {},
      }),
    );
    return body as { expiresInSeconds: number };
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
    const body = (await this.#unwrap(
      await this.#send({
        method: 'POST',
        path: '/v1/auth/otp/verify',
        body: {
          phone: request.phone,
          code: request.code,
          device: { platform: request.platform },
          ...(request.shopName ? { shopName: request.shopName } : {}),
          consent: {
            granted: true,
            noticeVersion: request.consent.noticeVersion,
            locale: wireLocale(request.consent.locale),
          },
        },
        headers: {},
      }),
    )) as SessionTokens;

    this.#tokens.write(body);

    for (const purpose of request.consent.granted) {
      if (purpose === 'account_and_ledger') continue;
      await this.setConsent(purpose, true, request.consent.locale);
    }

    return body;
  }

  /** Sign out this handset from another one. */
  async revokeDevice(deviceId: string): Promise<void> {
    await this.#authed('POST', '/v1/auth/devices/' + encodeURIComponent(deviceId) + '/revoke');
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
  async push(rows: readonly OutboxRow[]): Promise<PushResult> {
    const entries = rows.filter((r) => r.kind === 'entry');
    const days = rows.filter((r) => r.kind === 'day');

    if (entries.length === 0 && days.length === 0) {
      return { accepted: [], rejected: [], daysWritten: 0, entriesInserted: 0, alreadyPresent: 0 };
    }

    const body = (await this.#authed('POST', '/v1/sync/push', {
      ...(days.length ? { days: days.map((r) => dayPayload(r)) } : {}),
      ...(entries.length ? { entries: entries.map((r) => r.payload) } : {}),
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
}

/* ---- payload shaping, kept out of the methods -------------------------- */

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
  };
  const out: Record<string, unknown> = { date: day.date, state: day.state };
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
