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
Check three things specifically:
1. Does the "never share it" warning land with the force it has in English? It is the
   only defence against OTP-relay fraud at the moment it matters.
2. Is `SWAFTO` in Latin script jarring mid-sentence, or normal? It is kept Latin
   deliberately as a brand name.
3. Are the Latin numerals (`10 minutes`) natural? Constraint 8 requires them, but if
   they read badly the surrounding phrasing may need to change, not the digits.

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
| The account-deletion web page | Built in `/web`. Only *publishing* is human (H5) |
| Party-data fiduciary analysis | **AD-006** - Processor, with hedges built either way |
| Retention period | **AD-007** - 3 years inactive, with two warnings |
| Cloudflare residency question | **AD-008** - conservative reading, DNS-only |
| Pipeline proof without AWS | LocalStack + docker-compose + a locally executed rollback |
| Performance without a phone | **AD-009** - constrained AVD, limitations recorded |
