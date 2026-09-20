/**
 * THE COMPOSITION ROOT. Where the store, the session and the client become one
 * running app.
 *
 * Every piece existed and nothing assembled them: `ApiClient` was constructed
 * only in tests, and `Store.ackOutbox` had no caller outside one. An app made
 * of correct parts that nothing wires together is an app that gets wired on the
 * day of the build, under time pressure, by whoever is holding the handset.
 *
 * WHAT IS INJECTED, AND WHY EACH ONE. `fetch` so the transport can be driven
 * from a test; storage so the tokens can live in the Android Keystore in
 * production and a variable in a test; the clock and the id source so a test is
 * deterministic. Nothing here reaches for a global, which is what lets the whole
 * host be exercised against the real API with no device.
 *
 * THE DRAIN IS THE ONLY LOOP IN THE PRODUCT, and it is deliberately dull. Send
 * what is queued, drop what the server took, keep what it did not, stop on the
 * first sign of being offline. No backoff schedule, no retry timer, no
 * queue-reordering: the phone is offline most of the day by design, and every
 * clever thing a sync loop does is a way to lose a row a shopkeeper typed.
 */
import { Store, type OutboxRow } from './store/index.ts';
import { Session, type SessionOptions } from './app/session.tsx';
import {
  ApiClient,
  Offline,
  Unauthenticated,
  type SessionTokens,
  type TokenStore,
  type Transport,
  type PushRejection,
} from './net/client.ts';

/**
 * Where the session tokens are kept between launches.
 *
 * ON A HANDSET THIS IS THE KEYSTORE, not AsyncStorage: the tokens are the
 * account. The port keeps that decision in the native host rather than here,
 * and keeps this module testable without either.
 */
export interface SecureStorage {
  read(): string | null;
  write(value: string | null): void;
}

/** A `fetch` as the platform supplies it. Narrowed to what the client needs. */
export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  },
) => Promise<{ status: number; text(): Promise<string> }>;

export interface HostOptions {
  /** Where the API lives. No trailing slash; the paths carry their own. */
  readonly baseUrl: string;
  readonly fetch: FetchLike;
  readonly storage: SecureStorage;
  readonly store: Store;
  readonly now?: () => string;
  readonly newId: () => string;
  readonly language?: SessionOptions['language'];
  readonly display?: SessionOptions['display'];
}

/**
 * The transport, and the only place in the app that touches the network.
 *
 * IT NEVER THROWS FOR A STATUS. A 4xx is an answer and the client turns it
 * into an `ApiError`; only a request that did not complete throws, and the
 * client turns that into `Offline`. Collapsing the two here would make an
 * outbox drain unable to tell "the server refused this row" from "there is no
 * signal", and those must lead to opposite behaviour.
 */
export function fetchTransport(baseUrl: string, doFetch: FetchLike): Transport {
  return {
    async send(request) {
      const response = await doFetch(baseUrl + request.path, {
        method: request.method,
        headers: {
          ...request.headers,
          ...(request.body === undefined ? {} : { 'content-type': 'application/json' }),
          accept: 'application/json',
        },
        ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
      });

      const text = await response.text();
      let body: unknown = null;
      if (text) {
        try {
          body = JSON.parse(text) as unknown;
        } catch {
          /*
           * Not JSON. A proxy error page, a captive portal, a gateway timeout
           * in HTML. The status still carries the meaning, and the body is
           * deliberately dropped rather than guessed at.
           */
          body = null;
        }
      }
      return { status: response.status, body };
    },
  };
}

/** Tokens in the platform's secure storage, as one JSON blob. */
export function secureTokenStore(storage: SecureStorage): TokenStore {
  return {
    read() {
      const raw = storage.read();
      if (!raw) return null;
      try {
        return JSON.parse(raw) as SessionTokens;
      } catch {
        /*
         * Unreadable is the same as absent, and must not crash the launch.
         * The consequence is a sign-in, which costs one SMS; throwing here
         * would cost an app that cannot start.
         */
        return null;
      }
    },
    write(tokens) {
      storage.write(tokens === null ? null : JSON.stringify(tokens));
    },
  };
}

export interface SyncOutcome {
  /** What the server took, and what the store has therefore forgotten. */
  readonly accepted: number;
  /** Rows the server refused. They are still queued, and named. */
  readonly rejected: readonly PushRejection[];
  /** True when nothing was sent because there was nothing to send. */
  readonly idle: boolean;
  /** True when the request never reached the server. Nothing was lost. */
  readonly offline: boolean;
  /** True when there is no usable session. The host shows sign-in. */
  readonly needsSignIn: boolean;
}

const IDLE: SyncOutcome = {
  accepted: 0,
  rejected: [],
  idle: true,
  offline: false,
  needsSignIn: false,
};

export class Host {
  readonly store: Store;
  readonly session: Session;
  readonly client: ApiClient;

  constructor(options: HostOptions) {
    const now = options.now ?? (() => new Date().toISOString());
    this.store = options.store;
    this.client = new ApiClient(
      fetchTransport(options.baseUrl, options.fetch),
      secureTokenStore(options.storage),
    );
    this.session = new Session(this.store, {
      now,
      newId: options.newId,
      ...(options.language ? { language: options.language } : {}),
      ...(options.display ? { display: options.display } : {}),
      // No tokens means no account, so the consent notice is the first screen.
      screen: this.client.session ? 'T1' : 'X0',
    });
  }

  /**
   * Send what is queued, and forget only what the server took.
   *
   * THE ORDER IS THE WHOLE SAFETY PROPERTY. Read the queue, send it, and ack
   * only the ids that came back accepted. A client that cleared the queue
   * first, or acked everything it sent, loses a shopkeeper's entries the first
   * time a response is lost - and loses them silently, which is worse.
   */
  async sync(): Promise<SyncOutcome> {
    const queued: readonly OutboxRow[] = this.store.pendingOutbox;
    if (queued.length === 0) return IDLE;

    try {
      const result = await this.client.push(queued);
      /*
       * Acked AFTER the response, and only the accepted ids. A row the server
       * refused stays queued with its reason, because a rejected entry is a
       * figure he typed and a bug on one side or the other - never rubbish to
       * be thrown away quietly.
       */
      this.store.ackOutbox(result.accepted);
      return {
        accepted: result.accepted.length,
        rejected: result.rejected,
        idle: false,
        offline: false,
        needsSignIn: false,
      };
    } catch (e) {
      if (e instanceof Offline) {
        return { accepted: 0, rejected: [], idle: false, offline: true, needsSignIn: false };
      }
      if (e instanceof Unauthenticated) {
        return { accepted: 0, rejected: [], idle: false, offline: false, needsSignIn: true };
      }
      /*
       * Anything else is the server refusing the BATCH rather than a row - a
       * 400 on the envelope, a 429, a 500. The queue is untouched and the
       * error goes up: this loop does not decide what a 500 means.
       */
      throw e;
    }
  }
}
