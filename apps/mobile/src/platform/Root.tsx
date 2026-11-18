/**
 * THE COMPOSITION ROOT FOR ANDROID - the first thing in this repository that
 * actually assembles the application.
 *
 * `Host` is a class, not a component (host.tsx:153). It owns the store, the API
 * client and the session; `App` is the component and takes a session. Nothing
 * had ever joined the two, which is why there was no APK: every one of the
 * 1,177 tests drives screens directly, against a React Native mock, so the
 * components were verified and the program was never built.
 *
 * WHAT THIS FILE DECIDES, AND WHAT IT LEAVES OPEN.
 *
 * Decided here: a hand-written UUIDv7 for ids, and `Host.sync()` driven from
 * AppState. Each has its reasoning in its own file or beside the code below.
 *
 * The secure store was MMKV, then memory (the native module crashed on launch -
 * `storage.tsx` has the diagnosis), and is now a row in the ledger's own SQLite
 * file, so a restart keeps him signed in.
 *
 * Left open, and recorded rather than guessed:
 *
 *   SHOP IDENTITY ON FIRST RUN. `StoreState.shopId` is required to construct a
 *   Store and is readonly, but on a fresh install no shop exists until sign-up
 *   finishes. So the store is built with a placeholder and there is no path
 *   that replaces it afterwards. Until that is designed, this build is correct
 *   only for a session that signs in and then restarts. It is a real gap, it is
 *   in the development plan, and it is not hidden behind a cast.
 *
 *   PERSISTENCE (W4) is on disk through `store/sqlite.ts` over op-sqlite,
 *   and so are the session tokens and the account record (storage.tsx).
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState, BackHandler, Linking, NativeModules, Share, type AppStateStatus } from 'react-native';
import { playBilling, type NativeBilling } from '../net/billing.ts';
import { App } from '../app/App.tsx';
import { Host } from '../host.tsx';
import { open } from '@op-engineering/op-sqlite';
import { Store } from '../store/index.ts';
import { sqlitePort, type Db } from '../store/sqlite.ts';
import { sqliteSecureStorage } from './storage.tsx';
import { uuidv7 } from './ids.ts';
import { localIso } from './clock.ts';
import { device } from './device.ts';
import { phrase } from '../i18n/strings.ts';

/*
 * Where the API lives - one line, in endpoint.ts, with the reasoning beside
 * it. No trailing slash: the client's paths carry their own.
 */
import { apiBaseUrl, resolveApiBaseUrl, setApiBaseUrl } from './endpoint.ts';

// C-16: the API URL is build config (BuildConfig.API_BASE_URL, via SwaftoDevice).
// A release binary without an https URL throws, rather than signing nobody in;
// the Gradle release build refuses to be made in that state. Debug-vs-release is
// the NATIVE build type, not __DEV__. Called inside Root's render (not at module
// load) so a throw lands in the ErrorBoundary's calm screen, not a red one.
function initApiBaseUrl(): void {
  const native = NativeModules.SwaftoDevice as { API_BASE_URL?: string; isDebugBuild?: boolean } | undefined;
  setApiBaseUrl(resolveApiBaseUrl(native?.API_BASE_URL, native?.isDebugBuild));
}

export function Root() {
  const host = useMemo(() => {
    initApiBaseUrl();
    /*
     * ONE DATABASE, opened once: the ledger, the tokens and the account record
     * share the file, so there is one thing on disk to protect, back up or
     * erase rather than three that can disagree.
     */
    const db = open({ name: 'swafto-ledger.db' }) as Db;
    return new Host({
        baseUrl: apiBaseUrl(),
        // RN supplies a WHATWG fetch on the global; the transport narrows it.
        // `as never` on init: RN's AbortSignal typing differs from the DOM lib's.
        fetch: (url, init) => fetch(url, init as never) as never,
        storage: sqliteSecureStorage(db, 'session'),
        account: sqliteSecureStorage(db, 'account'),
        install: sqliteSecureStorage(db, 'install'),
        prefs: sqliteSecureStorage(db, 'prefs'),
        // HT-21: a half-typed entry survives the process being killed.
        draft: sqliteSecureStorage(db, 'draft'),
        // PR-7: the server's last plan answer, so the plan survives a launch with no signal.
        planCache: sqliteSecureStorage(db, 'plan'),
        // PR-7: Play Billing. A build or device without it answers 'unavailable', never success.
        billing: playBilling(NativeModules.SwaftoBilling as NativeBilling | undefined),
        /*
         * W4: ON DISK. A kill used to lose the day, a closed one included.
         * If the database cannot open, the throw is the right outcome - an app
         * that silently fell back to memory would take a day's entries and
         * then lose them.
         */
        // Decision 1: the port is given the WALL CLOCK, not a date, and picks the
        // business day from it and the shop's day start - 00:30 with a 05:00
        // start is still the previous day's trade.
        store: new Store(sqlitePort(db, () => localIso()), () => localIso()),
        // DV-8: stamps in the phone's own offset, so hh:mm reads as the wall clock.
        now: () => localIso(),
        newId: uuidv7,
        // R5 FR-3: the phone's own screen lock, for the app lock.
        device,
    });
  }, []);

  /*
   * W3 - THE OUTBOX HAD NO DRAIN.
   *
   * `Host.sync()` existed and nothing outside a test ever called it, so a
   * queued entry stayed queued forever and the server never saw a single row.
   * This drives it on two edges: once at launch, and again whenever the app
   * returns to the foreground - which on a shop phone is the moment after it
   * has been in a pocket with no signal.
   *
   * A failed sync is deliberately swallowed. The client distinguishes "the
   * server refused this row" from "there is no signal" and the outbox keeps
   * what was not accepted, so a throw here would be a crash in place of a
   * retry. What it must NOT do is report success, and it does not.
   *
   * STILL MISSING: a sync on regaining connectivity, which needs NetInfo.
   * Foreground is the cheaper 80% and it needs no extra dependency.
   */

  useEffect(() => {
    let alive = true;

    // Single-flight and the re-run-after-a-mid-drain-write live in Host.syncLatest.
    // FE-10: launch and foreground restart the backoff; the 30 s tick waits it out.
    const drain = (restart = false) => void host.syncLatest(true, restart);

    drain(true);
    // PR-7: what the plan is now. Offline, the cached answer stands until its own expiry.
    void host.refreshPlan();
    // HT-4: and whenever the book changes while the app is in front.
    const unsubscribe = host.session.subscribe(() => void host.syncLatest());

    // R5 FR-3: a cold start with the lock on asks at once; the cover is already up.
    void host.unlock();

    const onChange = (status: AppStateStatus) => {
      // R5 FR-3: every transition, so time away can be measured (Host.appStateChanged).
      if (alive) host.appStateChanged(status);
      if (alive && status === 'active') {
        host.session.refreshDay(); // F-19: last night's close gives way to today
        drain(true);
        void host.refreshPlan();
      }
    };
    const subscription = AppState.addEventListener('change', onChange);
    /*
     * HT-9 / HT-24: nothing retried a queue built offline once signal came
     * back, and nothing rolled a closed day over at its end, while the app sat
     * in front. One slow tick does both.
     * ponytail: fixed 30 s poll; switch to NetInfo if battery or data shows it.
     */
    const tick = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      host.session.refreshDay();
      if (host.store.pendingOutbox.length > 0) drain();
    }, 30_000);

    return () => {
      alive = false;
      clearInterval(tick);
      subscription.remove();
      unsubscribe();
    };
  }, [host]);

  /*
   * THE HARDWARE BACK BUTTON, WHICH USED TO LEAVE THE APP FROM EVERY SCREEN.
   *
   * Android's default for an unhandled back press is to finish the activity.
   * Nothing in this app handled one, so pressing back from a half-typed sale
   * dropped the shopkeeper on his home screen - and because the store is still
   * `memoryPort` (W4), the day went with him. It was found by pressing the
   * button on a real handset; no test in this repository drives a hardware key.
   *
   * The DESTINATION is `Session.back()`, which owns the parent map and is
   * tested. This wires the key to it and nothing more - returning true tells
   * Android the press was consumed, false lets it leave the app, which is the
   * right outcome on Today and on the screens that precede an account.
   */
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () =>
      host.session.back(),
    );
    return () => {
      subscription.remove();
    };
  }, [host]);

  /*
   * SUBSCRIBE, OR THE APP IS A PHOTOGRAPH.
   *
   * `App` is a pure function of `session.state` and holds no React state of
   * its own, so a mutation inside the session is invisible until something
   * re-renders. Nothing did. Every tap on the consent screen flipped the real
   * value and the screen never changed - the app looked frozen while working
   * perfectly.
   *
   * `useSyncExternalStore` is React's own answer for a mutable store outside
   * React. `getSnapshot` must return a value that changes IDENTITY when the
   * state changes, which `session.state` does: every mutation in Session
   * assigns a fresh object rather than editing in place, so the reference
   * comparison React does is exactly right. Returning something derived here
   * would allocate a new object each call and spin forever.
   */
  const snapshot = useSyncExternalStore(
    (listener) => host.session.subscribe(listener),
    () => host.session.state,
  );
  void snapshot; // read for the subscription; App reads the session directly

  return (
    <App
      session={host.session}
      /*
       * THE SIGN-UP DECISION GOES TO THE HOST, which holds it for the verify
       * call (`VerifyRequest.consent`) - so the account and its consent record
       * are created in one write, and X0 leads on to the phone number (A3).
       */
      onConsent={(decision) => host.consented(decision)}
      auth={host}
      // PR-7: S10's refresh, preview and purchase. Host implements PlanActions.
      plan={host}
      /*
       * Manage mode, which is the DPDP withdrawal path. It needs a session,
       * so unauthenticated it will be refused - swallowed rather than thrown,
       * because a toggle that crashes the app is worse than one the server
       * declines. `setConsent` takes the locale as its third argument.
       */
      onConsentChange={(purpose, granted) => void host.changeConsent(purpose, granted)}
      onOpenPrivacy={() => void host.openPrivacy()}
      // F-23: the policy, terms and deletion page open in the phone's browser.
      onUnlock={() => void host.unlock()}
      onToggleAppLock={() => void host.setAppLock(host.session.state.appLock !== true)}
      onOpenUrl={(url) => {
        Linking.openURL(url).catch((e: Error) => host.session.refuse('openUrl', e.message));
      }}
      /*
       * M3: "EXIT" ON "EXIT THE APP?". The session asks on the first Back from
       * Today and returns true, so Android does not finish the activity on its
       * own any more; this is the one place that does, and only on his answer.
       */
      onExitApp={() => BackHandler.exitApp()}
      /*
       * M3: the phone's Date and time settings, for a book dated ahead of the
       * clock (C-19). An older binary has no such method: the refusal banner
       * says so, and the Today banner still carries the words.
       */
      onOpenDateSettings={() => {
        device.openDateSettings?.().catch((e: Error) => host.session.refuse('openUrl', e.message));
      }}
      // M3: S13's export and S14's device list and sign-out are the host's network half.
      onExportMyData={() => void host.exportMyData()}
      onLoadDevices={() => void host.loadDevices()}
      onSignOutDevice={(id) => void host.signOutDevice(id)}
      /*
       * R5 FR-1: HIS WhatsApp, opened with the text in it; he presses send. The
       * app link first; with WhatsApp not installed, the web link, which offers
       * to install it. No `canOpenURL`: on Android 11+ it needs a <queries>
       * entry, and trying the link and catching the refusal says the same thing.
       */
      onOpenWhatsApp={({ app, web }) => {
        Linking.openURL(app)
          .catch(() => Linking.openURL(web))
          .catch((e: Error) => host.session.refuse('share', e.message));
      }}
      // R5 FR-2: the statement as a message, through the phone's own share sheet.
      onShareText={(text) => {
        Share.share({ message: text }).catch((e: Error) => host.session.refuse('share', e.message));
      }}
      /*
       * R5 FR-4: the CSV as a FILE an accountant's spreadsheet opens. If the
       * native half is missing (an older binary), the same text goes as a
       * message rather than nowhere.
       */
      onShareFile={(fileName, text) => {
        device
          .shareTextFile(fileName, 'text/csv', text, phrase('s12.chooser', host.session.state.language))
          .catch(() => Share.share({ message: text }))
          .catch((e: Error) => host.session.refuse('share', e.message));
      }}
    />
  );
}
