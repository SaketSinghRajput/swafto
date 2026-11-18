# Running the API locally and pointing the phone at it

How to run the real API on this machine, against a local Postgres, and reach
it from the physical Android phone over USB with `adb reverse`. Every step
below was run on 2026-10-25 (Windows 11, Node 24, Docker Desktop 29.4.3). The
`adb` steps were not run, because the Lead runs `adb`. They are the standard
commands.

## 1. Postgres

Docker Desktop has to be running. `tools/pg-up.mjs` needs it and says so if it
is not ("Docker daemon not reachable").

```
node tools/pg-up.mjs
```

This starts the container `swafto-pg-test` (`postgres:17-alpine`) on
**localhost:55432**, user `postgres`, password `postgres`, database
`swafto_test`, and prints `ready → DATABASE_URL=…`.

- **It deletes the container first** (`docker rm -f swafto-pg-test`). Running it
  again wipes every database inside it, the dev one included. Every worktree
  uses the same container name, so one agent running it in the middle of
  another agent's test run pulls that run's database out from under it.
- After a reboot the container still exists but is stopped. Run
  `docker start swafto-pg-test` to keep its data, or `pg-up` to start empty.
- The test suites use `swafto_test`, each in its own schema. The dev server
  uses a separate database, `swafto_dev`, so the two don't collide.

## 2. The API

```
node tools/dev-server.mjs
```

- **Port 8787**, bound to `0.0.0.0`. Set `PORT` to change it.
- **Database:** `DATABASE_URL`, default
  `postgres://postgres:postgres@localhost:55432/swafto_dev`. On the first run
  it creates `swafto_dev` and applies the migration. After that it prints
  `schema already present`. It refuses to start if the database host is not
  `localhost` or `127.0.0.1`.
- **Secrets:** `SESSION_SIGNING_KEY` and `RATE_LIMIT_KEY` are optional. If they
  are not set, a random key is made for each run, so restarting the server
  signs the phone out. Set `SESSION_SIGNING_KEY` (32+ characters) in your
  shell to keep sessions across restarts. Never commit it.
- No other environment variables are read.

Expected output (measured):

```
dev-server: created database swafto_dev
dev-server: schema applied
dev-server: generated a session signing key for this run only
dev-server listening on 0.0.0.0:8787
```

Do not use `apps/api/src/server.ts` for this. It is the production entry
point: `loadConfig` requires every secret, and it never prints a sign-in code.

### Reading the OTP

No SMS is actually sent. `apps/api/src/sms/stub.ts` (`StubSmsPort`) only
records each send in memory. `dev-server.mjs` wraps the stub with a
`DevSmsPort`, which prints every message to the server console after the
stub's template and DLT length checks have passed:

```
  --- SMS -------------------------------------
   to        +919876500099
   template  otp_signin
   variables ["153773"]
```

The code is the six digits in `variables`. It is valid for 600 s. It is never
in the HTTP response; that is by design and is tested. This was measured end
to end over HTTP: `POST /v1/auth/otp/request` returned 202, the code was
printed, `POST /v1/auth/otp/verify` returned the tokens, and
`POST /v1/sync/push` with a day, a new party and a credit sale on that party
returned 200 with `rejected: []`.

## 3. The phone, over USB (`adb reverse`)

```
adb reverse tcp:8787 tcp:8787
adb reverse --list
```

After this, `localhost:8787` **on the phone** is port 8787 on this machine.
The mapping is lost when the cable is unplugged or `adb` restarts, so run it
again after either.

### The endpoint the debug build uses

There is exactly one setting: `API_BASE_URL` in
`apps/mobile/src/platform/endpoint.ts`. It is passed to `Host` in
`apps/mobile/src/platform/Root.tsx:60`. There is **no** debug/release switch.
Debug and release builds read the same constant. It is currently
`http://192.168.1.35:8787`, a Wi-Fi LAN address.

- **Over USB with `adb reverse`:** set it to `http://localhost:8787` and
  rebuild the debug APK. The comment in that file says "`localhost` CANNOT
  WORK HERE". That is true on Wi-Fi and false over `adb reverse`, which exists
  to make it work.
- **Over Wi-Fi without the cable:** set it to this machine's LAN address. The
  server already listens on `0.0.0.0`. Windows Firewall has to allow inbound
  TCP 8787 for Node.
- **Cleartext:** `http://` works only in the **debug** build.
  `android/app/src/debug/AndroidManifest.xml` sets
  `usesCleartextTraffic="true"`. The main manifest takes it from the
  `${usesCleartextTraffic}` placeholder, which the React Native Gradle plugin
  sets false for release. A release APK pointed at either URL fails every
  request.

`endpoint.ts` and `Root.tsx` belong to the Lead/Platform, so this document
does not change them.

## 4. Checking it

```
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8787/v1/legal/notice
```

Measured: `200`. The privacy notice is public, so this needs no session. On
the phone, the same URL with `localhost` should load in Chrome once
`adb reverse` is in place.

## 5. Stopping

Press Ctrl+C in the server's terminal. Postgres keeps running. Stop it with
`docker stop swafto-pg-test`.
