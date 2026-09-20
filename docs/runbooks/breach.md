# BREACH RESPONSE RUNBOOK

**L-08. DPDP Act 2023 s.8(6) and DPDP Rules 2025, Rule 7.**

This is written to be followed by a tired person at three in the morning who did not
write it. Everything here is a step or a decision, not an explanation. The reasoning
lives in `docs/audits/LEGAL-AUDIT.md` §1.8; if you are reading this because something
has happened, do not go and read that first.

> **An unrehearsed plan is not a plan.** The same logic as an untested backup. §7 of
> this file is the rehearsal, and until it has been run once this document is a draft
> that has never met reality.

---

## 0 · The two clocks, and they start when you BECOME AWARE

Not when the breach happened. Not when it is confirmed, scoped or understood. When
anybody at SWAFTO becomes aware of it.

| Who | When | What |
|-----|------|------|
| **Affected Data Principals** | **Without delay** | Rule 7(1). No hour count is given, which means any delay you cannot justify is a delay you must defend. |
| **Data Protection Board - first** | **Without delay** | Rule 7(2). A short description: nature, extent, timing, location, likely impact. |
| **Data Protection Board - full** | **Within 72 hours** | Rule 7(2). The detailed report in §4 below. An extension must be **applied for and approved**; assume you will not get one. |

**Penalty for not doing this:** up to **₹200 crore** per incident, DPDP Act s.8(6). It
is one of the largest in the Act, and it is for the FAILURE TO TELL, not for the
breach.

**The 72 hours do not pause** for a weekend, a festival, a colleague on a flight, or
the investigation being incomplete. File what you know at 72 hours and update it.

---

## 1 · What counts as a breach

> DPDP Act s.2(u): *any unauthorised processing of personal data or accidental
> disclosure, acquisition, sharing, use, alteration, destruction or loss of access to
> personal data, that compromises the confidentiality, integrity or availability of
> personal data.*

Read that again: **loss of availability is a breach.** So is alteration. It is not
only "somebody stole the database".

Things that ARE a breach here:

- The Postgres instance or an S3 backup is readable by anyone who should not read it.
- A shopkeeper sees another shop's entries. **One shopkeeper seeing one other shop's
  figures is a breach.** There is no threshold.
- A ledger row is altered or destroyed outside the append-only path.
- The database is unrecoverable and the backups do not restore.
- An OTP or session-signing key leaks.
- A customer name or phone number appears in a log, a crash report, or a push payload.
- A laptop or handset holding production credentials is lost.

Things that are NOT a breach, and must not be reported as one:

- A shopkeeper mistyping his own figure.
- An outage where no data is disclosed, altered or lost - but **check** the last
  clause: if entries queued on handsets were lost, availability was compromised.

**If you are unsure, treat it as a breach and start the clock.** Retracting a
notification is survivable. Missing one is s.8(6).

---

## 2 · The first thirty minutes

Do these in order. Do not skip to the interesting one.

1. **Write down the time you became aware, in IST, and how.** Everything downstream is
   measured from it, and you will not remember by the morning.
2. **Open an incident note** - a file, a message thread, anything append-only. Every
   later step appends to it. Do not edit earlier lines; strike through and add.
3. **Name the two roles, out loud, to each other.**
   - **DECIDER** - decides whether it is a breach, and decides to notify. One person.
   - **SCRIBE** - keeps the note and the clock, and does nothing else.

   For a team of one, you are both, and the note matters more rather than less.
4. **Stop the bleeding, and preserve what you can.**
   - Rotate `SESSION_SIGNING_KEY` and `RATE_LIMIT_KEY` together and redeploy
     (`apps/api/src/config.ts` refuses to start without either, and refuses to start
     if they are equal). Rotating the signing key signs every device out, which is the
     correct trade.
   - **Do not delete logs, instances or buckets to "clean up".** The detailed report
     asks for the cause and for who was responsible; evidence you destroyed is
     evidence you cannot produce.
   - Snapshot the database before any remedial change.
5. **Decide: is it a breach?** Use §1. Record the decision and the reason in the note,
   whichever way it goes.

---

## 3 · Telling the shopkeepers - Rule 7(1)

**Without delay, and before you feel ready to.** A notice that waits for full
understanding is a notice that arrives after the harm.

Rule 7(1) fixes what must be in it. Each of these five, in **clear, plain language**,
in **Odia, Hindi and English** - the person reading it chose one of those three:

1. **What happened** - the nature and extent of the breach, and when it occurred.
2. **What it means for them** - the consequences likely to arise **for that person**,
   not a general statement.
3. **What we have done** - the measures implemented and being implemented to mitigate
   the risk.
4. **What they should do** - the safety measures they can take to protect their own
   interests.
5. **Who to contact** - business contact details of a person who can actually answer.
   Today that is the Grievance Officer at `grievance@swafto.app`
   (`apps/api/src/dpdp/routes.ts`), and H6 must have named a real person by launch.

**How it reaches them, in V1.** There is no notification inbox - it is deferred - and
push is not integrated at all (L-11). So the channels are:

- **SMS**, which needs a DLT-registered template. **No breach template is
  registered.** A breach notice cannot go out as a transactional SMS until one is.
  Recorded as a gap in §8.
- **Email**, if an address is held. The app does not collect one.
- **The next app launch**, as an unmissable screen. This is the reliable channel and
  it requires a release.

**Do not water the notice down.** "Some data may have been affected" is not a
description of nature and extent.

---

## 4 · Telling the Board - Rule 7(2)

### 4a · First, without delay

A short intimation. Five things:

- the **nature** of the breach;
- its **extent**;
- the **timing** of its occurrence;
- the **location** of its occurrence;
- its **likely impact**.

Send it even if all five are partial. Say which are provisional.

### 4b · Then, within 72 hours of becoming aware

The detailed report. Six things, all of them:

1. **Updated and detailed information** about the breach.
2. **Broad facts**: the events, the circumstances and the **causes**.
3. The **risk-mitigation measures** implemented or proposed.
4. **Findings about who caused it** - person or entity, to the extent known.
5. **Remedial measures** taken to prevent recurrence.
6. **A report of the intimations given to affected Data Principals** - who was told,
   when, and through which channel. This is why §3 is logged as it happens.

An extension beyond 72 hours must be **applied for and granted**. Plan as though it
will not be.

---

## 5 · The order, and who owns each step

| # | Step | Who | By when |
|---|------|-----|---------|
| 1 | Record the awareness time | Scribe | Immediately |
| 2 | Contain; rotate keys; snapshot | Decider | 30 minutes |
| 3 | Breach or not - recorded either way | Decider | 30 minutes |
| 4 | Intimate affected Data Principals | Decider | Without delay |
| 5 | First intimation to the Board | Decider | Without delay |
| 6 | Detailed report to the Board | Decider | **72 hours** |
| 7 | Post-incident review | Both | 7 days |
| 8 | Update this runbook with what it got wrong | Both | 7 days |

---

## 6 · What the system can tell you

Do not guess at scope. These are the questions and where the answers are.

| Question | Where |
|----------|-------|
| Which shops exist, and which were deleted? | `shops`, with `deletion_requested_at` and `deleted_at` |
| What is held about one user? | `GET /v1/me/export`, or `repo.exportUser` |
| Who consented to what, and when? | `consents` - append-only, so the history survives |
| Which devices could reach an account? | `devices`, with `revoked_at` |
| Could entries have been altered? | They cannot: `entries_append_only()` and the closed-day guard. If they were, **the trigger was bypassed**, and that is the finding. |
| Were figures wrong, or only visible? | Derive-on-read means no total is stored: a figure cannot be silently wrong unless its entries are wrong |

**Check for a cross-tenant read first** (S-10/S-11). The shop id comes from the session
and never from the request; if that stopped being true, every shop is in scope rather
than one.

---

## 7 · The rehearsal - before launch, then every six months

An unrehearsed plan is a document, not a capability. Book two hours. Do not warn the
participants of the scenario.

**Scenario A - cross-tenant read.** "A shopkeeper in Cuttack reports that the app
showed him a customer list that is not his." Walk §2 to §5 end to end. Actually draft
the three-language notice. Actually write the Board report. Do not send them.

**Scenario B - backup exposure.** "An S3 bucket holding nightly dumps was found
world-readable for an unknown period." Note what you cannot answer: for how long, and
who read it. Those gaps are the finding.

**What the rehearsal must produce**, or it did not happen:

- the elapsed time to each of steps 4, 5 and 6;
- the actual notice text, in all three languages;
- a list of the questions the system could not answer;
- at least one change to this file.

**Date of the last rehearsal:** *never run.*

---

## 8 · Known gaps in this plan, stated rather than hidden

These are real and they are open. A runbook that hides its gaps is worse than none,
because it produces confidence instead of readiness.

1. **No channel that reliably reaches every user quickly.** SMS needs a DLT-registered
   breach template and none is drafted or registered (H1 covers registration). Push
   does not exist (L-11). The notification inbox is deferred. Today the reliable
   channel is a release, which is slower than "without delay" means.
2. **No named human.** The Grievance Officer is an address rather than a person until
   H6.
3. **Never rehearsed.** §7 has never been run, so every duration in §5 is an estimate.
4. **No log retention policy decided**, so "for how long was it exposed" may be
   unanswerable - which is itself a finding to report rather than a reason to delay.
5. **Not reviewed by counsel** (H9). The obligations here are transcribed from Rule 7
   with the sources below, and transcription is not advice.

---

## Sources

- [Rule 7, DPDP Rules 2025 - Intimation of personal data breach](https://dpdprules.org/rules/7)
- [DPDP Rules 2025 (PIB)](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf)
- [DPDP breach notification: the 72-hour rule and the s.8(6) penalty](https://www.matters.ai/article/dpdp-breach-notification)
- `docs/audits/LEGAL-AUDIT.md` §1.8 and `docs/audits/SECURITY-AUDIT.md` §7

**Last re-derived from the Rules:** 2026-09-21. Re-check before launch: the Rules were
notified in November 2025 and their compliance milestones run into 2027.
