# API configuration

Every environment variable the API reads, in one place. It is **checked against the code** by
`node tools/check-config-docs.mjs`: a variable the code reads and this file omits fails the check,
and so does a row here that nothing reads. Edit this file when you add, rename or remove a read in
`apps/api/src/`.

All values are validated once, at boot, in `apps/api/src/config.ts` (`loadConfig`,
`loadBillingConfig`), before the pools open and before the port is bound. A bad value stops the
process with a message that **names the variable and never prints the value** it found.

"Required" means the process will not start without it. "Prod" means required only when
`NODE_ENV=production`.

| Variable | Type / range | Default | Required | Meaning |
|---|---|---|---|---|
| `DATABASE_URL` | Postgres URL | none | **yes** | The app connection. In production this must be a role with no `BYPASSRLS`; row-level security is what keeps one shop out of another's ledger. |
| `SYSTEM_DATABASE_URL` | Postgres URL | none (falls back to `DATABASE_URL` outside production) | **prod** | A second, privileged role for the few lookups that have no shop yet: sign-in, device check, consent. |
| `SESSION_SIGNING_KEY` | secret, at least 32 chars | none | **yes** | HMAC key for access and refresh tokens. Must differ from `RATE_LIMIT_KEY` and `BILLING_ACCOUNT_KEY`. Rotating it signs every device out. |
| `RATE_LIMIT_KEY` | secret, at least 16 chars | none | **yes** | HMAC key that hashes phone numbers into rate-limit buckets. A leak of it makes the buckets reversible, so it is never the signing key. |
| `NODE_ENV` | exactly `production`, `development` or `test`, or unset | unset (not production) | no | Only the exact word `production` turns the production checks on (second DB role, no stub SMS). **Anything else is refused at boot**, including `Production`, `prod`, and a value with a stray space, tab or CR (`production `): a near miss would quietly disable every production guard (RTI-6). A blank value counts as unset. **Unset is held to the production stub-SMS rule**: an unset `NODE_ENV` cannot boot with the stub SMS port unless `ALLOW_STUB_SMS=1`. |
| `PORT` | integer 1 to 65535 | `8080` | no | The listening port. Set-but-blank is refused. |
| `HOST` | non-blank string | `0.0.0.0` | no | The bind address. The container must accept the ingress; what may reach the port is the network's decision. cloud-init sets `127.0.0.1` behind Caddy. |
| `TRUST_PROXY` | unset, `0`/`false`, `true`, integer hops, or address list | `127.0.0.1` | no | Fastify `trustProxy`. It decides whose `X-Forwarded-For` is believed, and so every per-IP rate-limit bucket. `true` trusts every hop; only use it behind a proxy you run. **In production, boot refuses** `0`/`false`/`true`, any hop count other than 1, and any address range wider than /8 (IPv4) or /16 (IPv6), because each would silently break or disable the per-IP SMS cap. |
| `LOG_LEVEL` | `fatal` `error` `warn` `info` `debug` `trace` `silent` | `info` | no | Pino level. At `info` there is one completion line per request (method, route pattern, status, latency, request id) and no body or PII. Health probes log at `debug`. **In production, boot refuses `fatal` and `silent`**, so the level-50 error events that alarms depend on are always written. |
| `DB_STATEMENT_TIMEOUT_MS` | integer 100 to 600000 | `5000` | no | Per-statement ceiling on both pools. A statement past it is cancelled and the request answers 503 with `Retry-After`. |
| `SHUTDOWN_READY_GRACE_MS` | integer 0 to 120000 | `5000` | no | After SIGTERM, how long `/ready` answers 503 while the listener is still open, so a load balancer stops routing here first. Use 0 where there is no balancer. |
| `SHUTDOWN_TIMEOUT_MS` | integer 1000 to 600000, greater than the grace | `25000` | no | The drain deadline. Keep it under the orchestrator's SIGKILL (30 s on Docker, ECS and systemd). Sockets still open at the deadline are cut and the pools released. |
| `ALLOW_STUB_SMS` | exactly `1` to allow; any other value means no | unset (no) | no | Lets a production-mode process run with the stub SMS port, which sends nothing. Staging only; it prints a warning at every boot. |
| `STAGING_TEST_PHONES` | comma-separated E.164 numbers, e.g. `+919999900001,+919999900002`; each must be in `+91 99999 0xxxx`; at most 20 | unset (none) | no | Staging tester sign-in. With `ALLOW_STUB_SMS=1`, the stub SMS port writes ONE `warn` line (`msg` `staging test otp`, with `phone` and `code`) to stdout for an OTP sent to a listed number; read it with `journalctl -u swafto-api` over SSM. Unlisted numbers log nothing. Redaction of every other log line is unchanged. **Boot refuses** it without `ALLOW_STUB_SMS=1`, any number outside the test range (a real number can never be listed), or more than 20 entries. |
| `AUTH_MODE` | exactly `invite` or `sms` | none in production or with `NODE_ENV` unset; `sms` otherwise | **prod** | How people sign in. `invite`: beta invite codes (eight digits, written by the invite CLI on the box; see `docs/runbooks/invite.md`); `POST /v1/auth/otp/request` answers the constant `202 {sent:false, mode:"invite", digits:8}` with no database access, the SMS port is one whose `send` throws (the stub is never wired and `ALLOW_STUB_SMS` has no effect), and web deletion is paused. `sms`: the OTP over SMS, every existing guard unchanged. **Boot refuses** an unset value in production or with `NODE_ENV` unset (no default), and any value other than the two words. Flip with a restart; run `invite revoke` for any live invite first, or wait 7 days. |
| `DEMO_LOGIN_PHONE` | one number in the `+91 99999 0xxxx` test range | unset (demo login off) | no | A demo account for the founder and the Google Play reviewer. Works in either `AUTH_MODE`, never sends a message, and its request-code reply is the one every other number gets. Set together with `DEMO_LOGIN_CODE_HASH` or not at all. **Boot refuses** one without the other and a number outside the test range. The account is an ordinary tenant; number change and the app-lock PIN reset are refused for it; erase stays allowed. Holds synthetic data only (see `docs/auth/INVITE-CODES.md`). |
| `DEMO_LOGIN_CODE_HASH` | 43 base64url characters | unset (demo login off) | no | The keyed hash (`hashOtp`, the HMAC the OTP store uses) of the demo code, which is eight to ten digits and fixed. Make it with `echo CODE | node src/admin/invite-cli.ts demo-hash --phone N` on the box (reads the code from stdin, prints only the hash). The code itself is never in config or the repo. Five attempts an hour, then a one-hour lockout answered with the ordinary 401. Rotating `SESSION_SIGNING_KEY` invalidates it: make it again. |
| `BILLING_ACCOUNT_KEY` | secret, at least 16 chars | none | no | HMAC key for Play's `obfuscatedAccountId`. Never the session key. Billing stays closed while it, or any other `PLAY_*` value, is missing; the rest of the API runs. |
| `PLAY_PRODUCT_ID` | string | none | no | The Play subscription product id. Part of the set that opens billing. |
| `PLAY_SERVICE_ACCOUNT_JSON` | the whole Google key file, as JSON | none | no | Service account used to ask Google about a purchase. A present value that is not JSON, or lacks `client_email` or `private_key`, stops the boot. |
| `PLAY_RTDN_AUDIENCE` | string | none | no | The OIDC audience the Pub/Sub push subscription is configured with. The webhook verifies Google's signed token against it. |
| `PLAY_RTDN_SERVICE_ACCOUNT` | email | none | no | The service account Pub/Sub signs its pushes as. |
| `PLAY_PACKAGE_NAME` | string | `com.swafto` | no | The Android package name purchases are checked against. |

## Notes

- **Secrets have no defaults.** A default signing key is the same key on every deployment that
  forgot to set one, and it is in the source for anybody to read.
- **Billing is allowed to be absent** (`BILLING_ACCOUNT_KEY` and the four `PLAY_*` values, apart
  from `PLAY_PACKAGE_NAME`). The server logs which are missing at boot and answers 503 on the billing
  routes naming what is missing.
- **Error tracking** needs no variable. Every 5xx and unhandled error is one JSON line with
  `"level":50`; a CloudWatch metric filter on `{ $.level = 50 }` counts them.
