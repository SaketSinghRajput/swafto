# Sign-in codes by WhatsApp (addendum to INVITE-CODES.md, design only)

Owner: Security Architect · Status: **proposed, needs founder decisions (section 7)** · 2026-11-20
Decision being designed (Saket, 2026-11-20): WhatsApp Cloud API becomes the automatic code channel
now, from an **unverified** Meta Business portfolio. Business verification and SMS/DLT come later.
Invite codes (`INVITE-CODES.md` + `INVITE-CODES-GATE.md`, being built now) stay as the fallback and
the recovery path.

**Figures used here.** Meta's limit of about 250 unique recipients per 24 h for an unverified
portfolio is *third-party-reported*, and about ₹0.115 per authentication message in India is
*vendor-reported*. Neither has been measured or checked against Meta's rate card. Both are config.
Every other number is either an existing constant in code or *my arithmetic or default*, and is
labelled as such.

**Design rule: WhatsApp is just another message port behind the existing `requestOtp`.** The
mint, the HMAC, the 60 s cooldown, per-IP/per-device/per-phone caps, the owner-device bypass,
`takeAttempt` before compare (RT2-1), 5 per code (B37), single-use `clear`, `verifyPerIp`, the
uniform 202/401, RT3-1/RT3-1b (silent 202 plus a decoy pending code when a ceiling denies) and
refresh rotation are all **unchanged**. No new auth route is added.

## 1. Mode model

`AUTH_MODE = sms | invite | whatsapp`. There is no default in production (the existing guard).

| | `sms` | `invite` | `whatsapp` |
|---|---|---|---|
| `deps.sms` (the message port) | DLT adapter or stub | throwing port | **`WhatsAppPort`** (same `send({phone, templateId, variables, languageTag})` shape, so `requestOtp` is untouched) |
| Request reply | `{sent:true, expiresInSeconds, digits}` | `{sent:false, mode:"invite", digits:8}` | `{sent:true, mode:"whatsapp", expiresInSeconds:600, digits:6}` from the existing constants |
| Global rules | `sendGlobal` (500/h, unregistered only) | none | **`waUnregistered24h` + `waAll24h`** (section 2), replacing `sendGlobal` |
| Invite CLI | refused (gate) | yes | **yes**: fallback and H23 recovery |
| Web deletion | on | paused (D3) | **paused**. Meta's preset wording says only "verification code", so the deletion SMS's purpose-specific text cannot be reproduced (`templates.ts` comment). Reopen with SMS. |

**Coexistence with invites (one change to the gate's deferral).** The gate deferred the `put`
clause `AND otp_pending.kind = 'sms'` because the CLI refused outside invite mode. In whatsapp mode
invites and automatic codes live side by side, so **the clause is now required**. Without it, a
stranger's request for a victim's number overwrites the victim's invite once the 60 s cooldown has
passed. With it, `put` returns false, `requestOtp` takes its existing "lost race" branch, sends
nothing, and returns the same 202. Edit the `ON CONFLICT ... WHERE` in `otp-store-pg.ts` and the
memory store, and add one test.

**Boot guards (whatsapp).** Refuse to boot unless all of these hold:
- `WHATSAPP_TOKEN` is non-empty;
- `WHATSAPP_PHONE_NUMBER_ID` matches `^\d{5,20}$`;
- `WHATSAPP_TEMPLATE_NAME` matches `^[a-z0-9_]{1,512}$`;
- `WHATSAPP_API_VERSION` matches `^v\d+\.\d+$`;
- `WHATSAPP_META_DAILY_LIMIT` is a positive integer;
- the ceilings in section 2 hold: `all < limit` and `unregistered <= all`.

The stub and `ALLOW_STUB_SMS` are never wired in this mode.

## 2. Cost and quota guard

Two rules are added in `limits.ts`. They are built from config at boot. Defaults go in
`packages/values` and are *my defaults*, not measured:

| Rule | Counts | Window / lockout | Default |
|---|---|---|---|
| `waUnregistered24h` | sends to numbers with **no account** (the RT2-2 shape) | 24 h / 24 h | `floor(0.6 × limit)` = **150** |
| `waAll24h` | **every** WhatsApp send. This is the quota guard and the money ceiling as a message count | 24 h / 24 h | `floor(0.8 × limit)` = **200** |

Both rules go last in the existing `consumeAll`, unregistered first. `consumeAll` stops at the
first refusal, so a refused unregistered send does not spend `waAll24h`. Reasons for the headroom:
Meta's 24 h window does not line up with ours, Meta may count failed attempts, and the limit is
not verified. The split exists for one reason: random-number pumping trips the 150 first and leaves
50 sends a day for real accounts. **On either trip** the existing RT3-1 branch runs (extend its
`decision.rule === sendGlobal` test to both names). The caller gets the same 202, a decoy code is
stored, nothing is sent, and one `crit` line is written:
`{severity:'crit', breaker, pauseSeconds}`.

Alarm: add a CloudWatch log metric filter on `"severity":"crit"` plus an alarm. HOSTING.md section 5
already uses all ten free-tier alarms, so this one is the eleventh (decision S4).

**Arithmetic (mine, from the reported figures).** Money is integer paise: 11.5 paise per message.
- Maximum spend at the caps: 200 × 11.5 = **2,300 paise = ₹23/day**, ₹690 over 30 days, ₹8,395
  over 365 days. This is before any tax. Tax treatment has not been checked (CFO).
- What it costs the attacker: almost nothing. With one IP at `sendPerIpCap` (60/h) and random
  +91 numbers (`sendPerPhoneDaily` 10 each), 150 sends trip the unregistered rule in 2.5 h. Three
  IPs do it in under an hour. Burning the last 50 needs 50 sends to numbers he knows have
  accounts. **The ceiling is the whole bound on Saket's bill: ₹23 a day, whatever the attacker
  spends.** In SMS mode, sends to registered numbers had no global ceiling.
- Pumping-fraud motive: SMS pumping pays the attacker a share of carrier termination fees. Here
  the fee goes to Meta, and `normaliseIndianMobile` accepts only +91 numbers, so there is no
  premium international route. My reading is that there is no revenue motive, only griefing. The
  real cost of an attack is the **DoS**: no automatic code for new sign-ups for up to 24 h. People
  fall back to an invite. Residual M/M.

## 3. The `WhatsAppPort` contract (`apps/api/src/whatsapp/port.ts`, about 80 lines; my estimate)

- **Call:** `POST https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages`,
  with `Authorization: Bearer <token>` and the body below. The shape is taken from Meta's
  copy-code page. The code appears twice. **Verify** the button `sub_type` (Meta's page shows
  `"url"`, one vendor shows `"otp"`) and whether `to` takes a leading `+`.
  ```json
  {"messaging_product":"whatsapp","recipient_type":"individual","to":"919876500001","type":"template",
   "template":{"name":"<WHATSAPP_TEMPLATE_NAME>","language":{"code":"en"},"components":[
     {"type":"body","parameters":[{"type":"text","text":"<code>"}]},
     {"type":"button","sub_type":"url","index":"0","parameters":[{"type":"text","text":"<code>"}]}]}}
  ```
- **Template (Saket creates it in WhatsApp Manager; the server never manages templates):**
  - category AUTHENTICATION, with a COPY_CODE button. One-tap and zero-tap need an app-side
    handshake (verify) and are not needed;
  - `add_security_recommendation: true`;
  - `code_expiration_minutes: 10`, matching `OTP_TTL_SECONDS`;
  - the template time-to-live set no longer than the code TTL, so a late message never carries a
    dead code (verify the field and its range).

  Meta fixes the body wording ("<code> is your verification code."). URLs, media and emojis are
  not allowed. The code may be at most fifteen characters, and ours is six.
- **Languages:** Meta's template-language list includes `en` and `hi` and has **no Odia**
  (checked 2026-11-20). Map `en→en`, `hi→hi`, `od→WHATSAPP_TEMPLATE_LANG_OD` (default `en`, S2).
  Each language is one approved translation of the same template (verify approval per language).
  The Odia explanation lives in the app's A4 copy, not in the message.
- **Adapter checks:** the adapter accepts only `templateId === 'otp_signin'`, exactly one variable,
  matching `^\d{6}$`. Anything else throws, because that is a programming error. It does not call
  `assertSendable`, whose rules are DLT rules.
- **Timeouts, retries, idempotency:**
  - one attempt with a 5 s `AbortController` timeout (my default);
  - **no retry**, including on Meta 429 or throughput errors. The user's resend is the retry, and
    the cooldown and caps bound it. That rules out a retry storm by construction.
  - Meta offers no idempotency key (verify). Not retrying means a timed-out-but-delivered message
    is never duplicated, and the stored code is the one that was sent, so late delivery still
    works.
- **Failure means the same 202:** the adapter never throws on transport or HTTP errors. Today
  `requestOtp` awaits `send`, so a throw would surface as a 500. The route **does not await
  delivery**: `send` is fire-and-forget with an internal catch. That also removes Meta's latency
  from the response, so the decoy path (no send) and the send path take the same time.
  - On failure, log `wa_send_failed {httpStatus, metaCode, metaSubcode}` at `error` (level 50,
    the level alarms read).
  - On success, log `wa_sent {wamid, phoneHmac}` (`RATE_LIMIT_KEY`) for support correlation.
  - Never log the body, the number, the code or the token. Add pino redaction for `authorization`.
- **Webhook: none in V1.** The smallest choice is no endpoint. Delivery status adds nothing the
  user flow lacks ("didn't get it?" goes to an invite), and a webhook would add a public POST
  surface plus a new oracle ("is this number on WhatsApp"). Meta does not need a webhook in order
  to send (verify). Quality and limit changes reach Saket through WhatsApp Manager notifications.
  If a webhook is ever added, it must check `X-Hub-Signature-256` (HMAC-SHA256 of the raw body
  with the app secret, constant-time compare) and the verify-token handshake.
- **Secrets and config:**
  - `/swafto/prod/WHATSAPP_TOKEN` as an SSM SecureString. The existing role already reads only
    `/swafto/prod/*`.
  - Plain config: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_API_VERSION`,
    `WHATSAPP_META_DAILY_LIMIT` (250), `WHATSAPP_TEMPLATE_LANG_OD`.
  - The token is a **system-user** token assigned only to this WABA, with only
    `whatsapp_business_messaging` (no `whatsapp_business_management`, no other assets).
  - Egress to `graph.facebook.com:443` must be allowed.
  - Staging uses a separate Meta test number and its allow-listed test recipients (verify
    limits), never the production token.

## 4. Threat model delta (STRIDE; residual L/I after mitigation)

| # | Threat | Mitigation | Residual |
|---|---|---|---|
| W1 | WhatsApp account takeover or SIM swap: the attacker re-registers the victim's WhatsApp (S) | Same class as SMS SIM swap. The new-phone banner (D2) gives detection. A4 copy recommends WhatsApp two-step PIN | **M/H**, unchanged from SMS |
| W2 | Recycled number or stale WhatsApp. **WhatsApp proves who holds the WhatsApp account, not who holds the SIM.** An old owner can still receive codes for a number that has been reissued (S/I) | Codes for a new number only create an empty shop. For an existing account this is the same exposure as SMS recycling, plus the stale-device case | **L/H** |
| W3 | Phishing: "forward me the code" (S) | Meta's security line. A4: "SWAFTO staff will never ask for this code". **Conflict:** staff send invite codes by WhatsApp text (D2), which teaches users to trust codes from humans. See S3 | **M/H** until S3 |
| W4 | The Meta token leaks (S/E/I) | System user, messaging-only, one WABA. SecureString. Never logged. Rotation runbook. Meta's own cap limits volume | Phishing sent from SWAFTO's own number, and a quality ban. **L/H** |
| W5 | Webhook spoofing | No webhook exists | none |
| W6 | Privacy: the number, the code and the timing go to Meta, possibly processed outside India (I) | **Meta is a DPDP processor** (s.8(2) needs a valid contract; check whether Meta's business and data-processing terms are that contract). Add Meta to the processor list and the privacy notice. The **L-09 "no processor at all" statement in `tools/check-licences.mjs` becomes false**, so its owner regenerates LICENCES.md. Review the Play Data-safety form (DATA-SAFETY.md). s.16 cross-border has no restriction notified today, but confirm. **GC-REVIEW** | **L/M** pending GC |
| W7 | Quality rating or ban: people who never asked block or report the message, and Meta restricts the number or pauses the template (D) | Codes go only to numbers that asked. `waUnregistered24h` also caps reports from random numbers. Fallback: set `AUTH_MODE=invite` and restart. The app follows `mode` with no new APK | **M/M** |
| W8 | Repudiation: "I never got it" | `wa_sent {wamid, phoneHmac}` matches Meta's records | **L/L** |
| W9 | Quota or cost DoS | Section 2 | **M/M** |

## 5. Build split

**Contract (frozen):** the whatsapp reply from section 1. A missing `mode` still means `sms`.
Verify is unchanged.

**Backend (`apps/api/**`, `packages/values`, `docs/infra/**`, `docs/runbooks/**`):**
1. `config.ts`: add `whatsapp` and the boot guards.
2. `whatsapp/port.ts`: the adapter.
3. `server.ts`: wire the adapter, then send without awaiting it, with a catch.
4. Add the two rules to `limits.ts` and the values; extend the RT3-1 branch to both names.
5. Add the `put` kind clause in both stores.
6. Pause deletion in whatsapp mode.
7. Let the CLI run in `invite|whatsapp`.
8. Docs: CONFIG.md rows; a new `docs/runbooks/whatsapp.md` (template setup, token rotation,
   ceiling trip, a quality drop or ban leading to `AUTH_MODE=invite`); and HUMAN-ACTIONS items for
   Saket (portfolio, number, template, token, spend), recorded as not done.

**Mobile (`apps/mobile/**`):**
- A4 copy for `mode=whatsapp`: "If this number has WhatsApp, a code from SWAFTO arrives in a
  minute." The reply says `sent:true` even when nothing was sent (RT3-1), so the copy must not
  promise delivery.
- The resend countdown is unchanged.
- A link "Didn't get it? Ask SWAFTO for a code" leads to the invite screen: the 8-box code entry
  and support contact.
- A "never share this code" line and the WhatsApp two-step PIN hint.
- od/hi/en strings, marked draft (H13).

**Tests (each must fail without its change):**
- The config matrix.
- Requests give byte-identical replies for {no account, account, live invite, ceiling tripped,
  Meta down}.
- An invite row stays byte-unchanged after a whatsapp request.
- The ceilings: request 151 to unregistered numbers sends nothing and stores a decoy; request 201
  overall does the same; one `crit` line each.
- The adapter: payload shape against a fake server; timeout, 4xx and 5xx all give 202 with no
  throw and no retry (exactly one call); non-sign-in templates are refused.
- Logs contain no number, code or token.
- The existing OTP suite passes unchanged in whatsapp mode.

**Red team (synthetic numbers, staging with the Meta test number, Saket's written approval per
`pentest-rules`; Meta's own systems are out of scope):**
- **RT-WA-1** Pump random numbers from 1 IP and from N IPs. Expect at most 150 sends and a
  silent 202.
- **RT-WA-2** Oracle by status, bytes and 1,000 timing samples across the five states above.
  Report the medians.
- **RT-WA-3** Invite overwrite attempts.
- **RT-WA-4** Fault injection on Meta (latency, 500, 429). Expect no retries, no 500s and no
  event-loop stall.
- **RT-WA-5** Scrape the logs and SSM for the token, codes and numbers.
- **RT-WA-6** Rerun RT2-1, RT3-1 and RT3-1b in whatsapp mode.
- **RT-WA-7** Rerun `TRUST_PROXY` (RT-W4-3).

## 6. Out of scope

Webhooks, one-tap or zero-tap autofill, a verified portfolio or higher tiers, and SMS fallback in
the same request.

## 7. Founder decisions needed

- **S1** Ceilings: 200 a day overall and 150 for unregistered numbers (80% and 60% of the reported
  250). This caps spend at ₹23 a day at the reported price. *Recommended.*
- **S2** Odia users get the **English** template (Meta has no Odia), not Hindi. *Recommended.*
- **S3** In whatsapp mode, invite codes are handed over **in person or by voice call, not by
  WhatsApp text**. Then "a code on WhatsApp only ever comes from the SWAFTO business number" stays
  true (W3). This revisits D2. *Recommended.*
- **S4** Add an eleventh CloudWatch alarm for `crit` lines. It is beyond the free tier, and its
  cost is not checked here.
- **S5** Web deletion stays paused in whatsapp mode (as D3).
- **S6** Whether to go live with Meta as a processor before GC-REVIEW (W6) closes. *Recommended:
  get GC sign-off first, because the notice text must name Meta.*

Sources (checked 2026-11-20):
- Meta, copy-code authentication templates: developers.facebook.com/documentation/business-messaging/whatsapp/templates/authentication-templates/copy-code-button-authentication-templates/
- Meta, authentication templates: .../templates/authentication-templates/authentication-templates/
- Meta, supported template languages: .../whatsapp/templates/supported-languages

## Decisions (Saket, 2026-11-20)
| ID | Decision |
|---|---|
| S1 | Daily ceilings: **200 total sends, 150 to numbers with no account**. |
| S2 | Odia users receive the **English** template; the app UI stays in Odia. |
| S3 | Invite delivery stays as Saket decided in INVITE-CODES.md D2: WhatsApp text allowed. The phishing-habit residual risk is recorded and accepted. |
| S4 | **Approved:** an eleventh CloudWatch alarm on the ceiling trip (about $0.10/month, beyond the free tier). |
| S5 | Web deletion stays paused (as INVITE-CODES.md D3). |
| S6 | GC sign-off (Meta as a DPDP processor) is required before WhatsApp mode goes live. It is GC-REVIEW and is not yet done. |
