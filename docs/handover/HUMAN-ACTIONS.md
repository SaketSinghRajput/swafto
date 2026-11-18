# HUMAN-ACTIONS

**Nothing in this file blocks the build.** Every item here is impossible in software -
it needs a legal identity, a credential, a payment method, or a physical object.
Everything a determined engineer could do in code has been decided and built instead;
those decisions are in `DECISIONS-AUTONOMOUS.md`.

The test for belonging here: *could an agent with a filesystem and a shell do this?*
If yes, it does not belong here.

| # | Action | Roughly | Unblocks |
|---|--------|---------|----------|
| H1 | DLT registration for transactional SMS | 1-2 weeks | Real OTP delivery |
| H2 | AWS account + IAM role for GitHub OIDC | 1 hour | Real deploy |
| H3 | GitHub repository | 10 minutes | CI on real runners |
| H4 | Domain + DNS | 1 hour | Public URLs, TLS |
| H5 | Publish the two legal pages | 30 minutes | Play submission |
| H6 | Name the grievance officer | 10 minutes | Release build |
| H7 | Google Play Console account | 1 hour + review | Distribution |
| H8 | Physical device pass | 1 hour | Confidence the AVD cannot give |
| H9 | Counsel review of the legal text | - | Legal certainty |
| H10 | **Native review of the Odia and Hindi SMS templates** | 30 minutes | DLT submission |
| H11 | Allow `eslint.config.mjs` | 2 minutes | Editor integration and the `npm run lint` script, which cannot run without it. The money rule itself already runs programmatically inside `check:money`, which CI runs |
| H12 | ~~Re-paste injection 14~~ **RESOLVED at iteration 26** | - | - |
| H13 | **Native review of the Odia and Hindi SCREEN copy** | 45 minutes | Any public release |
| H14 | **An Android build environment and a release signing key** | 2 hours | The APK, and with it B14-B19, B24 and the APK half of B35 |
| H15 | Play Console payments profile: bank account, PAN and GSTIN (R4-HA1). Needs H7 | 1 hour + review | Any paid sale of Premium |
| H16 | GST registration and a CA's rulings on SAC code, threshold and invoices (R4-HA2) | 1-3 weeks | Selling Premium lawfully |
| H17 | Google Cloud service account, Pub/Sub topic and push subscription for billing (R4-HA3) | 1 hour | Server verification of purchases, and the RTDN webhook |
| H18 | The Premium subscription and its two base plans in Play Console (R4-HA4) | 30 minutes | The purchase sheet on the phone |
| H19 | Counsel review of subscriptions and dark patterns (R4-HA5). Extends H9 | - | Public launch of Premium |
| H20 | Choose the AI provider, if any (R4-HA6) | - | Any AI-derived feature |
| H21 | Test the price with real shopkeepers (R4-HA7) | 1 day | Fixing the price in H18 |
| H22 | Create the database roles' SSM parameters, with generated passwords | 20 minutes | The API booting in production (C-01) |
| H23 | Decide on new-phone OTP lockout: accept the residual or add a second factor (RT-3) | 30 minutes | Public launch of sign-in |

---

## H1 · DLT registration for transactional SMS

**Why no agent can do it.** A registered legal entity's documents must be submitted to
a telecom operator's DLT portal by a person with authority to bind that entity.

**What to do.**
1. Register the entity on any operator DLT portal (Jio, Airtel, VI, BSNL - they share
   a common registry). You get a **Principal Entity ID (PEID)**.
2. Register a 6-character **header** (sender ID). **Since 6 May 2025 it must carry a
   category suffix** - for OTP traffic that is the transactional category.
3. Register the OTP **content template**. Use exactly the text in
   `apps/api/src/sms/templates.ts`, variable placeholders included - a mismatch
   between the registered template and the sent message causes carrier-level rejection
   with no useful error.
4. Choose a provider, put the PEID, header and template ID in SSM Parameter Store, and
   set `SMS_PROVIDER` to the adapter name.

**Observed 2026 timelines.** PEID 1-3 working days · header same-day to 24 h after the
entity is approved · template 1-3 business days each. The portal steps are days; the
document preparation is what takes the time.

**Until then.** The `SmsPort` stub (AD-004) is wired and every auth test passes against
it. Nothing is blocked. Registration is a release-day item, not a build item.

---

## H2 · AWS account and IAM role

**Why no agent can do it.** Credentials and a payment method are yours.

**What to do.** Create the account. Create an IAM role trusting GitHub's OIDC provider
for this repository. Put the role ARN in the repo's Actions variables as
`AWS_DEPLOY_ROLE_ARN`. **Do not create long-lived access keys** - the pipeline is
built for OIDC and SECURITY-AUDIT §3 forbids static keys in Actions.

Region is `ap-south-1`, and it is not negotiable: it is a data-residency requirement
(LEGAL-AUDIT §2).

**Until then.** Terraform is validated and planned against LocalStack, and the whole
stack runs under docker-compose with a real rollback executed locally. See
`DEPLOY-RUNBOOK.md` for the exact ordered commands once the role exists.

---

## H3 · GitHub repository

**Why no agent can do it.** It is your account.

**What to do.** Create it, push, and add `AWS_DEPLOY_ROLE_ARN`. The workflows are in
`.github/workflows/` and have been executed locally, so they should run first time.

**Until then.** Workflows are validated by local execution, not by reading the YAML.

---

## H4 · Domain and DNS

**Why no agent can do it.** Registration costs money and requires an account.

**What to do.** Register the domain. Point `api.` at the EC2 elastic IP and the apex
at the static host carrying `/web`.

**Note a decision that affects this: AD-008.** Cloudflare is **DNS-only** for the API.
TLS terminates on the origin in `ap-south-1` so that plaintext personal data never
exists outside India. Do **not** switch the API record to proxied without reading
AD-008 first - it would undo a deliberate residency choice.

---

## H5 · Publish the two legal pages

**Why no agent can do it.** Publishing needs hosting credentials. **Writing them did
not** - they are written, in three languages, in `/legal` and `/web`.

**What to do.** Deploy `/web` to any static host. Confirm two URLs resolve publicly:
- `https://<domain>/privacy`
- `https://<domain>/delete-account`

The deletion page **must work for someone who has already uninstalled the app** and
must be reachable without signing in. Both are Play requirements and both are already
true of the page as built; publishing is the only remaining step.

Then enter the deletion URL in the Play Data Safety form **exactly** as it resolves.

---

## H6 · Name the grievance officer

**Why no agent can do it.** DPDP s.13 requires a real human with a real contact
address. Inventing one would be worse than leaving it unset - it would publish a
promise that reaches nobody (AD-003).

**What to do.** Set two values in SSM:

```
GRIEVANCE_OFFICER_NAME   = <full name>
GRIEVANCE_OFFICER_EMAIL  = grievance@<domain>
```

Make sure that mailbox is monitored, and publish the response SLA already stated in
the privacy policy.

**Until then.** The config key, About-screen row, API field and policy placeholder all
exist and are tested. **Only a release build fails** when these are unset - dev and CI
builds are unaffected, so the loop is never blocked.

---

## H7 · Google Play Console

**Why no agent can do it.** Account, identity verification and a fee.

**What to do.** Register. Complete the Data Safety form from
`legal/play-data-safety.json` - it is machine-readable specifically so the
transcription is mechanical, and CI already fails if it disagrees with the privacy
policy on any collected item. Upload the arm64 AAB. Declare the deletion URL from H5.

---

## H8 · Physical device pass

**Why no agent can do it.** No phone is attached, and four of these cannot be emulated
at all.

**What to do.** Follow `DEVICE-CHECKLIST.md` on a real INR 7,000 Android handset. One
hour. It covers what an AVD structurally cannot tell you: **sunlight legibility** at a
shop front, **thumb reach** on the keypad one-handed, **real SIM SMS delivery**
including carrier latency, and **battery drain** across a working day.

**Until then.** Everything else is measured on a constrained AVD - 2048 MB, 2 cores,
throttled I/O - per AD-009, which also records where that proxy flatters the result
(rendering and thermals) and where it is sound (algorithmic cost).

---

## H10 · Native review of the Odia and Hindi SMS templates

**Why no agent can do it.** No automated check in this loop can evaluate an Odia or
Hindi sentence for *meaning*. The checks verify length, variable count, segment cost
and numeral script - all of which pass - but none of them can tell you whether the
Odia reads naturally to a shopkeeper in Bhubaneswar, or whether a word choice is
technically correct and idiomatically strange.

**Why it matters more than the other items.** `SMS-TEMPLATES.md` is the one artifact
in this build whose text cannot be changed cheaply after the fact. Once those twelve
templates clear DLT registration, a wording change means going back round the
approval cycle.

**What to do.** Read all six non-English strings in `SMS-TEMPLATES.md` §4 aloud.
Check these specifically:

1. **T2 vs T3 must stay distinguishable.** T2 verifies the number the user ALREADY
   has; T3 confirms the NEW one. An earlier Hindi draft collapsed both into "number
   change code", losing the distinction that makes an unexpected code noticeable.
   The current Hindi reads "purana number jaanch" (check old number) against "naya
   number pushti" (confirm new number) - **confirm a Hindi reader hears two different
   things**, because the whole anti-phishing value of separate templates rests on it.
2. **`ଆପ୍ ଲକ୍` in T4 Odia is transliterated English** ("app lock"). Ask whether a
   60-year-old Odia speaker parses it, or whether a native construction reads better.
   There may be no good native term, in which case keep it - but decide, do not
   default.
3. Does the "never share it" warning land with the force it has in English? It is the
   only defence against OTP-relay fraud at the moment it matters.
4. Is `SWAFTO` in Latin script jarring mid-sentence, or normal? It is kept Latin
   deliberately as a brand name, and it now appears TWICE in the Hindi and Odia
   sign-in template ("SWAFTO code. SWAFTO will never ask...") - check that does not
   read as clumsy repetition.
5. The Hindi and Odia templates **no longer state the 10-minute validity** (AD-012);
   the app states it instead. Confirm nothing reads as if information is missing.

**Headroom warning for the reviewer.** Every template has at least 5 units of spare
budget and the sign-in templates have exactly 6. **A correction that adds more than
that makes the message two SMS segments, doubling its cost forever.** Run
`npm run check:sms:segments` after any edit - it fails the build rather than letting
a longer message through.

**Until then.** Every automated property is verified and every template is under one
SMS segment. Only meaning is unverified, and it is flagged at the top of the file.

---

## H9 · Counsel review of the legal text

**Why no agent can do it.** An agent may not invent a fact about Indian law, and legal
sign-off is a professional judgement.

**What to do.** Have an Indian data-protection practitioner review `/legal`. Two
clauses need a human specifically:

1. **Party data** (AD-006). SWAFTO is written as Processor with the shopkeeper as
   Fiduciary for his own customers' details. Confirm. If it is joint responsibility
   instead, SWAFTO must serve notice to those customers directly - a real product
   change, not a config flag.
2. **Limitation of liability vs the product's central promise.** The app's entire
   pitch is that the number is right. That makes a broad accuracy disclaimer
   commercially awkward and legally necessary at the same time. A human has to place
   that line.

**Until then.** The text is written conservatively - wherever the law is genuinely
uncertain it takes the reading that grants the user more rights - and every document
carries a banner stating it is unreviewed. Nothing is blocked; publication should wait
for this.

---

## What is deliberately NOT in this file

Each of these looked like a human action and turned out to be a decision plus some
code. They are resolved in `DECISIONS-AUTONOMOUS.md`:

| Was blocked on a human | Now |
|---|---|
| BI6, the cut-off sixth output | **AD-001** - decided by procedure: Credit Concentration |
| Privacy policy and terms text | **AD-005** - written, three languages, marked unreviewed |
| The account-deletion web page | Built at `apps/web/delete-account/index.html`, with its own routes, SMS template and tests. Only *publishing* it at the URL is human (H5) |
| Party-data fiduciary analysis | **AD-006** - Processor, with hedges built either way |
| Retention period | **AD-007** - 3 years inactive, with two warnings |
| Cloudflare residency question | **AD-008** - conservative reading, DNS-only |
| Pipeline proof without AWS | LocalStack + docker-compose + a locally executed rollback |
| Performance without a phone | **AD-009** - constrained AVD, limitations recorded |

---

## H14 · An Android build environment and a release signing key

**Why no agent can do it.** Three things, none of which is a file in this repository:
a **JDK**, the **Android SDK** (licence-accepted, which is an interactive agreement),
and a **release keystore** - a private key that must be generated on a machine a human
controls and never committed. This machine has none of them: `java`, `adb` and
`ANDROID_HOME` are all absent, checked rather than assumed.

**What already exists, so that this is a short job rather than a project.** The
JavaScript side is complete and tested:

- `apps/mobile/src/host.tsx` - the composition root. Store, session and API client
  wired together, with `fetch`, secure storage, the clock and the id source injected.
- `apps/mobile/src/net/client.ts` - every route the app uses, with refresh, offline
  and rejection handling.
- `apps/mobile/src/index.tsx` - the package entry, exporting all of it.

**The exact versions, read from the template rather than from the docs page.**

`react-native@0.81.4`'s own `android/build.gradle` is what Gradle reads, and it pins:

| | Version | Why this one |
|---|---|---|
| JDK | **17** | RN 0.81 states it plainly: *"we recommend JDK17. You may encounter problems using higher JDK versions."* Microsoft OpenJDK 17 on Windows |
| `compileSdkVersion` | **36** | Android 16 |
| `targetSdkVersion` | **36** | And this is already what Google Play requires: since **31 August 2026** a new submission must target API 36. No React Native upgrade is needed for that |
| `buildToolsVersion` | **36.0.0** | |
| `minSdkVersion` | **24** | Android 7.0, the floor the INR 7,000 handsets sit above |
| `ndkVersion` | **27.1.12297006** | Install that exact string; Gradle asks for it by name |

> **The React Native setup page says "Android SDK Platform 35", and that is its own
> environment guide lagging behind its own template.** Trust the template: it says 36.
> Checked at iteration 36 against the 0.81.4 release.

**What to do.**
1. Install JDK 17 and the Android SDK components above; accept the SDK licences
   (`sdkmanager --licenses`). Set `JAVA_HOME` and `ANDROID_HOME`
   (`%LOCALAPPDATA%\Android\Sdk` is the Android Studio default) and put
   `platform-tools` on `PATH`.
2. Generate the native project with the React Native CLI at `apps/mobile`
   (`npx @react-native-community/cli init` against the existing package, or copy the
   template's `android/` directory). The version to match is in
   `apps/mobile/package.json`.
3. Write `index.js` at `apps/mobile`:
   ```js
   import { AppRegistry } from 'react-native';
   import { Host, App } from './src/index.tsx';
   // Build the Host with a real fetch, Keystore-backed storage and a UUID source,
   // then register a component that renders <App session={host.session} />.
   ```
4. Generate a release keystore, store it outside the repository, and put its password
   in CI as a secret. **Never in git** - `check:secrets` will fail the build if it is.
5. Run `DEVICE-CHECKLIST.md` (H8). B14-B19 cannot be measured any other way, and this
   build has refused to claim them from a browser or an emulator.

**What it unblocks.** B24 (APK size) and the APK half of B35 are bounded from below
today and cannot be met until an APK exists - which `BENCHMARKS-RESULTS.md` already
states rather than rounding up.

---

## H11 · Let an `eslint.config.mjs` be created

**Why no agent can do it.** A repository hook refuses any write to
`eslint.config.mjs`: *"Modifying eslint.config.mjs is not allowed. Fix the source
code to satisfy linter/formatter rules instead of weakening the config."* That is a
good rule and I am not going to route around it - creating the file under a different
extension would defeat a guard you put there deliberately, while looking like
compliance.

**What is NOT blocked, so that this does not read as more urgent than it is.** The
enforcement ADR-003 requires already runs. `npm run check:money` executes the real
`swafto/no-money-float` rule over 45 files through ESLint's own `Linter` API and
fails the build; it is in `check:all` and negative-tested. Nothing about constraint 6
is waiting on you.

**What you get by allowing it.** Editor integration - the same rule underlining the
mistake as it is typed, rather than at commit time - plus the ADR-012 purity bans
(`Date.now`, `new Date()`, `Math.random`, `Intl`, `process` inside the engine) which
are expressible as stock ESLint rules and are currently unenforced.

**What to do.** Disable the config-protection hook for one commit, or drop in a config
that registers `tools/eslint-rules/no-money-float.mjs` as the `swafto` plugin. The
content is drafted in BUILD_LOG under iteration 18.

## H12 · Re-paste injection 14 - RESOLVED, no action needed

**Resolved at iteration 26 without human effort.** Injection 20 pointed out that every
injection was already on disk at `G:/SWAFTO/` under a different naming scheme. The
file was IMPORTED, not retyped, and verified byte-identical to its source below the
header. What follows is the original entry, kept because the reconciliation it
prompted found a second thing.

### The original entry

**Why no agent can do it.** It is not in the repository. `INJECTIONS/` holds fourteen
verbatim files and injection 14 is not among them — `14-verify-the-verifiers.md` is
injection *13*, and the filename numbering is a file index rather than an injection
number. The text exists only in a chat transcript.

I will not reconstruct it. I have a paraphrase in working context and writing that
into `INJECTIONS/` would produce a file that looks verbatim, hashes into
`injections.lock`, and is actually my summary of someone else's words. That is worse
than the gap, and §5.6 forbids it: the directory's own header says these files are
evidence, not our prose.

**Why it matters more than the other gaps.** Injection 14 is where §5.13 came from —
"an instrument is built with its subject, never after" — along with checklist item A12
and the benchmark partition that `check:verifiers` regenerates on every run. Three
live mechanisms cite an instruction nobody can re-read.

**What is NOT blocked.** All three mechanisms are implemented, tested and running;
§5.13 is enforced by the partition, A12 by the adversary checklist, and the
INSTRUMENTED count is derived rather than asserted. Nothing waits on this. The risk is
drift: with no verbatim text, §5.13 slowly becomes whatever the last iteration
remembered of it, which is the exact failure the directory was created to prevent.

**What to do.** Paste the original injection 14 message. I will save it verbatim as
`INJECTIONS/14-instruments-before-subjects.md`, renaming the existing
`14-verify-the-verifiers.md` to `13b-` so the numbering stops lying, and re-pin the
lock.

---

## H13 · Native review of the Odia and Hindi screen copy

**Why no agent can do it.** The same reason as H10, applied to a larger surface. The
screen strings in `apps/mobile/src/i18n/strings.ts` were drafted by this loop and
carry `COPY_REVIEW_STATE = 'DRAFT-PENDING-NATIVE-REVIEW'` in the data, not only in a
comment, so nothing here can claim they are approved. Every automated check they
pass - they render, they fit, they use Latin numerals, the longest-string mode does
not break the layout - is a check about SHAPE. None of them can tell you whether
`ଖାଲି କରନ୍ତୁ` is what an Odia speaker expects on a key that clears a number, or
whether `ଏପର୍ଯ୍ୟନ୍ତ ମୋଟ` reads as "total so far" rather than as something stranger.

**What to look at, in order of how much a mistake costs.**

1. The three payment modes - `ନଗଦ`, `UPI`, `ଉଧାର`. These label the buttons that
   decide which section an entry lands in. A wrong word here misfiles money.
2. `ଏପର୍ଯ୍ୟନ୍ତ ମୋଟ`, the running total, because it is the figure he is watching.
3. The error line, which promises nothing was lost. If that promise does not read as
   a promise, he will re-enter the day.
4. The keypad keys and the empty state, which are the least costly to get wrong.

**The artifact to review it against is the contact sheet**, not this file:
`docs/contact-sheet/index.html` shows the strings in place, at the size and in the
typeface they ship in. A word that reads fine in a list can still be wrong on a key.

**Until this is done** the app has copy that renders correctly and means something
nobody here has verified. That is a launch blocker for an Odia-language release and
is recorded as one.

---

## H15 · Play Console payments profile (R4-HA1)

**Why no agent can do it.** A merchant account in the business's own name, with its bank
account, PAN and GSTIN, needs that legal identity. Needs H7 first.

**What to do.** Create the payments profile in Play Console. Put the PAN and the GSTIN on
it (R4 §6 explains the withholding when no PAN is on file). Leave the alternative-billing
terms unaccepted for V1: the build uses Play Billing only.

**Until then.** Nothing can be sold. The server's verify route and the phone's purchase
sheet are built and tested against fakes; the S10 screen says buying is not open yet.

---

## H16 · GST registration and a CA's rulings (R4-HA2)

**Why no agent can do it.** Registration needs the entity, and the open questions are a
chartered accountant's to rule on, not this build's (CLAUDE.md, "Never invent a fact
about Indian law").

**What to do.** Get a GSTIN. Have a CA decide the SAC code, whether the e-commerce
threshold exemption applies, the invoice numbering, and who issues the invoice for each
Play sale. R4 §6 lists the sources and where they disagree.

---

## H17 · Google Cloud service account and Pub/Sub for billing (R4-HA3)

**Why no agent can do it.** It needs the Google Cloud and Play Console accounts, and the
key it produces must never enter this repository (`check:secrets`).

**What to do.**
1. Create a service account; in Play Console grant it API access with "View financial
   data" and "Manage orders and subscriptions".
2. Create a Pub/Sub topic, and a push subscription to
   `https://api.<domain>/v1/billing/play/rtdn` with authentication on, using a
   service account of your choice as the push identity.
3. Give `google-play-developer-notifications@system.gserviceaccount.com` publish rights
   on the topic, and point Play Console's real-time developer notifications at it.
4. Put these in SSM Parameter Store (SecureString where secret) and into the API's
   environment: `PLAY_SERVICE_ACCOUNT_JSON` (the key file, whole), `BILLING_ACCOUNT_KEY`
   (a new random secret, at least 16 characters, not either other key),
   `PLAY_PRODUCT_ID`, `PLAY_RTDN_AUDIENCE` (the push subscription's audience) and
   `PLAY_RTDN_SERVICE_ACCOUNT` (its push identity's email). `PLAY_PACKAGE_NAME`
   defaults to `com.swafto`.
5. Check the 15 % fee on the first payout statement.

**Until then.** The API boots and runs without them; `verify` and the webhook answer 503
naming the missing variables. The 14-day preview works, because it is the server's own grant.

---

## H18 · The Premium subscription in Play Console (R4-HA4)

**Why no agent can do it.** Play Console access.

**What to do.** One subscription product (its id goes in `PLAY_PRODUCT_ID`) with two
auto-renewing base plans whose ids are exactly `monthly` and `yearly`
(`apps/mobile/src/app/plan.ts`, `BASE_PLANS`). Prices tax-inclusive: ₹99 a month, and
₹799 or ₹599 a year (the owner's call after H21). Grace period on. **No free-trial
offer** (R4 §5.3: the app has its own preview that asks for no payment details).

---

## H19 · Counsel review: subscriptions and dark patterns (R4-HA5)

**Why no agent can do it.** It is a legal opinion.

**What to do.** Check R4 §5 against the gazette text of the 2023 Dark Patterns
Guidelines. Rule on the free-trial question (§5.3), on whether a shopkeeper is a
"consumer" under CPA s.2(7), and on whether the E-Commerce Rules 2020 apply. Extend H9
to item-level party history (R4 §7.1). Also rule on whether billing records
(`plan_purchases`) are kept or erased when a shop is deleted: the erasure job leaves them
today, and that is an open question, not a decision.

---

## H20 · Choose the AI provider (R4-HA6)

**Why no agent can do it.** A contract.

**What to do.** For a third-party model: one with an India-region endpoint, a DPA with
security terms and a no-training clause, and its own notice line. Self-hosted needs no
signature. R5 currently ships no language model, so nothing waits on this yet.

---

## H21 · Test the price with real shopkeepers (R4-HA7)

**Why no agent can do it.** It needs shops.

**What to do.** Show ₹99 a month and ₹799 a year against ₹599 a year to a handful of
target shops in Odisha before H18 fixes the prices. R4 §4 is a judgement, not evidence.


---

## H22 · Database role credentials in SSM (C-01)

**Why no agent can do it.** It needs your AWS account, and the passwords must be
generated where only you see them. A password in the repository would defeat the
point; `check:secrets` would fail it.

**What to do.** In the AWS console or CLI, in ap-south-1, create three SSM
**SecureString** parameters under the prefix in `/etc/swafto/site.env`
(`/swafto/prod`), each a Postgres connection URL (scheme `postgresql`, the role, a
generated password URL-encoded, the RDS host, port 5432, the database name):

- `MASTER_DATABASE_URL` - the RDS master user. Used only by the one-time role
  bootstrap, never given to the API.
- `DATABASE_URL` - user exactly `swafto_app` (no BYPASSRLS).
- `SYSTEM_DATABASE_URL` - user exactly `swafto_system` (BYPASSRLS).

The role passwords are not stored a second time: the bootstrap reads each password
out of these two URLs and sets it on the role, so the API's password and the
role's password are the same value by construction. Generate each once, put it in
the URL, and do not change it anywhere else. To rotate, edit the SSM parameter and
re-run the bootstrap.

The other secrets are unchanged.

Then, on every deploy and after the migrations have run, on the box over SSM
Session Manager: `sudo /usr/local/bin/swafto-db-roles`. It applies
`packages/schema/sql/roles.postgres.sql` as the master user (its grants skip any
table that does not exist yet), then sets the two passwords. Safe to re-run.
The API refuses to start in production if either URL is missing or both connect as
the same role.

**Also at deploy, because nothing in `infra/` defines IAM or alarms** (the repository
holds only `cloud-init.yaml`; there is no Terraform yet):

- Add `sns:Publish` on your alert topic to the instance role, and put the topic ARN
  in `SWAFTO_ALERT_TOPIC_ARN` in `/etc/swafto/site.env`.
- In CloudWatch, create a metric filter on log group `swafto-alerts` (pattern
  `"FAILED"`) and an alarm on it (threshold 1, notify the same topic). The daily
  purge job writes there when it fails.

**Not done.** Nothing here has been done.

**Progress — 2026-11-18 (done by the CTO on Saket's explicit approval, via the CLI as his SSO admin):**
the three SecureString parameters exist under `/swafto/prod/` (`MASTER_DATABASE_URL` v1,
`DATABASE_URL` v2, now the `swafto_app` role, and `SYSTEM_DATABASE_URL` v1). The passwords were generated
locally (hex, so no URL-encoding is needed) and written through 0600 temp files that were deleted at once; none was
printed or logged. The RDS master password was reset to the one in `MASTER_DATABASE_URL`. Before the reset,
the database had 0 connections in 24 h and only the SWAFTO app security group could reach it.
**Not done yet:** the roles `swafto_app` and `swafto_system` do not exist in the database until the one-time
`swafto-db-roles` bootstrap runs on the API server, because RDS is private and cannot be reached from a laptop.
**Status.** Partly done: the parameters are created; the role bootstrap waits for the API server (Wave 6).

## H23 · New-phone sign-in lockout: accept the residual, or add a second factor (RT-3)

**Why no agent can do it.** It is a product and risk decision. It trades how easy
sign-in is against an attack the red team proved, and the red team accepted it as S3
only on condition that the founder records the decision.

**The residual.** Anyone who knows a shopkeeper's phone number can, from a single
IPv4 address, keep destroying each fresh code with 5 wrong guesses (the 5-per-code
limit that B37 cites). That keeps the number out of sign-in **on a new phone**
indefinitely. Phones already signed in are unaffected: their sessions last 180 days,
the ledger is local, and a known device bypasses the per-number send budget. The
attacker gains nothing but the denial. No takeover is possible: attempts are ticketed
before the compare.

**What to do.** Choose one, and record it here with the date:
1. **Accept for V1** and stand up a support recovery path for a locked-out new phone
   (e.g. the grievance officer verifies the owner and clears the number's limiter
   state). This is the red team's condition for acceptance.
2. **Add a second factor for new-device sign-in** (e.g. a confirmation on an already
   signed-in device, where one exists). This is engineering work, scoped after the
   decision.

**Decision — 2026-11-17, Saket:** option 1. **Accept the residual for V1, with a support
recovery path.** Option 2 stays available for a later version.

**Status.** Decided. The engineering it requires is NOT yet built: an admin command,
for the grievance officer, that clears one number's OTP limiter state after a callback
verifies the owner, plus its runbook. That is tracked in `docs/audit/PLAN.md`, Wave 6.
The red team's acceptance (S3) holds once that path exists.
