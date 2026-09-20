# SMS-TEMPLATES

**This file is the DLT registration submission.** Every message SWAFTO will ever send
is here, final, in all three languages.

> **Changing a template after approval means re-approval.** Treat the text below as
> frozen. `tools/check-sms-templates.mjs` fails the build if code references a
> `templateId` that is not here, or passes the wrong number of variables.

> **NEEDS NATIVE REVIEW BEFORE SUBMISSION.** The Odia and Hindi strings were written by
> an agent. No automated check in this loop can evaluate them for *meaning* - only for
> length, variable count and numeral script. A native speaker must read all six
> non-English strings before they go to DLT. This is `H10` in HUMAN-ACTIONS.md.

---

## 1 · The constraints these are designed against

Researched September 2026. Where sources disagreed, **the tightest limit was taken**.

| Constraint | Limit | Source / note |
|---|---|---|
| Variable **value** length | **30 characters**, English and Unicode alike | Spaces and punctuation count |
| Variables **per template** | **2** | Sources say 2-4 or 5-6 depending on operator. Designed to 2; **every template below uses 1** |
| Variable share of content | **<= 40%** of total message | Fixed text must dominate |
| Template must not **end** with a variable | mandatory | Every template below ends in fixed text |
| Variable syntax | `{#var#}` | On every DLT platform |
| **SMS segment length** | **160** chars GSM-7 · **70** chars Unicode | **Odia and Hindi are Unicode**, so those templates are held under 70 characters or they cost two segments each |

That last row is the one that shapes the Indian-language text. A 90-character Hindi
OTP is two segments - double the cost on every sign-in, forever, for wording nobody
reads twice.

**Numerals are Latin in all three languages** (constraint 8). `10` is `10`, never
Odia or Devanagari digits. The brand name `SWAFTO` is Latin everywhere.

**Sources:** [TRAI DLT regulations](https://docs.webengage.com/docs/trai-sms-dlt-regulations-india) ·
[DLT content template FAQs](https://msg91.com/help/dlt-registration-in-india/dlt-content-template-faqs) ·
[DLT SMS templates](https://fyno.io/docs/dlt-sms-templates)

---

## 2 · Header (sender ID)

**`SWAFTO`** - six alphabetic characters, registered on the DLT portal and bound to
the transactional category.

> **Corrected (injection 09, A.3).** An earlier draft of this section said the header
> "must carry a category suffix", alongside a proposal that was six characters of pure
> brand. Both cannot be true of a six-character field, and the contradiction was real.
>
> The research settles it: under the TCCCPR 2025 amendment effective **6 May 2025**,
> the one-letter category suffix (`-T` transactional, `-S` service, `-P` promotional,
> `-G` government) is **appended automatically by the telecom operator during DLT
> scrubbing**, derived from the category of the registered template. It is not part of
> the six characters and we do not register it. `SWAFTO` is displayed to the
> recipient as `SWAFTO-T`.
>
> Note for §5.6: the token-level contradiction checker could not see this, because
> both halves were individually well-formed prose. Recorded as a finding in REVIEW.md.

A header can only send templates matching its category, so all four OTP templates
must be registered as transactional. Register the header before the templates -
templates bind to an approved header.

**Sources:** [TRAI header suffix rules](https://kb.smsalert.co.in/knowledgebase/trai-mandates-header-suffixes-for-sms-new-rules-effective-from-may-6-2025/) ·
[TCCCPR 2025 amendment](https://www.tanla.com/blog-posts/trai-mandates-new-message-suffixes-heres-what-you-need-to-know)

---

## 3 · Scope — SMS is used for OTP only

**Four purposes. Nothing else.** Alerts, dues and deficit warnings go over FCM push
with the text resolved on-device (LEGAL L-11: no personal data in a push payload).
SMS costs real money per message and every additional template is another
registration round.

**Why four templates and not one.** A single generic "your code is X" would register
faster. Four distinct ones are worth it because **a user who receives a number-change
code he did not request knows immediately that something is wrong.** A generic code
gives him nothing to notice. That is an anti-phishing control, decided under R4.2
(trust) against R6 (fewer things to re-register).

---

## 4 · The templates

`{#var#}` is always the 6-digit code. One variable per template, 6 characters, well
inside both the 30-character and 40% limits.

### T1 · `otp_signin` — signing in

| Lang | Text | Enc | Units | Limit | Headroom |
|------|------|-----|-------|-------|----------|
| `en` | `{#var#} is your SWAFTO code. Valid 10 min. Never share it. SWAFTO will never ask for it.` | GSM-7 | 87 | 160 | 73 |
| `hi` | `{#var#} SWAFTO कोड। SWAFTO इसे कभी नहीं मांगेगा। किसी को न बताएं।` | UCS-2 | 64 | 70 | 6 |
| `od` | `{#var#} ଆପଣଙ୍କ SWAFTO କୋଡ୍। SWAFTO ମାଗିବ ନାହିଁ। କାହାକୁ ନ କୁହନ୍ତୁ।` | UCS-2 | 64 | 70 | 6 |

### T2 · `otp_number_change_old` — verifying the number you already have

| Lang | Text | Enc | Units | Limit | Headroom |
|------|------|-----|-------|-------|----------|
| `en` | `{#var#} is your SWAFTO code to verify your current number. Never share it. SWAFTO will never ask for it.` | GSM-7 | 103 | 160 | 57 |
| `hi` | `{#var#} SWAFTO पुराना नंबर जाँच कोड। किसी को न बताएं।` | UCS-2 | 52 | 70 | 18 |
| `od` | `{#var#} SWAFTO ପୁରୁଣା ନମ୍ବର ଯାଞ୍ଚ କୋଡ୍। କାହାକୁ ନ କୁହନ୍ତୁ।` | UCS-2 | 56 | 70 | 14 |

### T3 · `otp_number_change_new` — confirming the new number

| Lang | Text | Enc | Units | Limit | Headroom |
|------|------|-----|-------|-------|----------|
| `en` | `{#var#} is your SWAFTO code to confirm your new number. Never share it. SWAFTO will never ask for it.` | GSM-7 | 100 | 160 | 60 |
| `hi` | `{#var#} SWAFTO नया नंबर पुष्टि कोड। किसी को न बताएं।` | UCS-2 | 51 | 70 | 19 |
| `od` | `{#var#} SWAFTO ନୂଆ ନମ୍ବର ନିଶ୍ଚିତ କୋଡ୍। କାହାକୁ ନ କୁହନ୍ତୁ।` | UCS-2 | 55 | 70 | 15 |

### T4 · `otp_pin_reset` — recovering a forgotten app-lock PIN

| Lang | Text | Enc | Units | Limit | Headroom |
|------|------|-----|-------|-------|----------|
| `en` | `{#var#} is your SWAFTO code to reset your app lock. Never share it. SWAFTO will never ask for it.` | GSM-7 | 96 | 160 | 64 |
| `hi` | `{#var#} SWAFTO ऐप लॉक रीसेट कोड। किसी को न बताएं।` | UCS-2 | 48 | 70 | 22 |
| `od` | `{#var#} SWAFTO ଆପ୍ ଲକ୍ ରିସେଟ୍ କୋଡ୍। କାହାକୁ ନ କୁହନ୍ତୁ।` | UCS-2 | 52 | 70 | 18 |

### Android OTP autofill: SMS User Consent, NOT SMS Retriever

**Decided in AD-011. Do not reopen without reading it.**

SMS Retriever requires the message to end with an 11-character app hash and the whole
message to be **<= 140 bytes**. Measured: appending a hash pushes `otp_signin` over
140 bytes in **both Hindi and Odia** - the highest-volume template in the two
languages most users read. Retriever is therefore unavailable where it matters most,
and adopting it would mean re-registering all twelve templates later.

**SMS User Consent** needs no hash, imposes no byte ceiling, and costs one tap. That
is the mechanism, and it is why no template here carries an app hash.

**T4 exists because of a rule in SECURITY-AUDIT T1.3:** a forgotten PIN is recovered by
OTP to the same number, and *"locking a shopkeeper out of his own ledger is a worse
outcome than any threat in this table."* This template is what makes that promise
keepable.

---

## 5 · Wording decisions

Every count in §4 is **generated** by `tools/check-sms-segments.mjs --update-md`.
No hand-written count survives here - an earlier draft estimated them by eye and was
wrong on eleven of twelve, with one template sitting at exactly 70 of 70 without
anyone noticing (§5.7.2, AD-013).

**"Never share it."** appears in all twelve. OTP-relay fraud works by a caller asking
the victim to read out a code, and this is the only defence at the moment it matters.

**"SWAFTO will never ask for it."** now appears in **English and Hindi**, and in Odia
as the shorter *"SWAFTO will not ask"*. It is no longer English-only - see AD-012.
The budget was freed by **dropping the validity clause from the Hindi and Odia
templates**, on this reasoning: *the validity window is discoverable inside the app;
the phishing warning is not.* A shopkeeper who does not know his code expires loses
nothing. One who does not know SWAFTO will never ask for it can lose everything in
the cash box.

English keeps all three lines because its GSM-7 budget is 160 characters and the
trade-off simply does not arise there.

**10 minutes.** Long enough for an SMS to arrive over a congested 2G cell, short
enough that a code read off a lock screen an hour later is dead. Named constant
`OTP_TTL_SECONDS = 600`, never a literal. **Stated in the app, not in the SMS**, for
the Hindi and Odia templates.

**No shop name, no amount, no party name in any SMS.** Templates carry the code and
nothing else. Anything else would be personal data in transit through a carrier, and
the 30-character variable cap would truncate it anyway.

---

## 6 · Registration checklist

1. Register the Principal Entity - PEID.
2. Register the header `SWAFTO` under the **transactional** category. Do not try to
   include a suffix - the operator appends `-T` automatically (§2).
3. Register **all twelve** content templates, exactly as written above.
4. Record each returned DLT template ID in SSM as
   `DLT_TEMPLATE_ID__<templateId>__<lang>`, e.g. `DLT_TEMPLATE_ID__otp_signin__od`.
5. Set `SMS_PROVIDER` to the adapter name.

Until step 4 completes the stub serves every send, and all auth tests pass against it.
**Nothing in the build waits for this.**
