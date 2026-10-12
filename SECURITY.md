# Security policy

SWAFTO holds a shopkeeper's financial records, and his customers' names and
phone numbers. If you have found a way to reach data that is not yours, we
want to hear about it before anyone else does.

## Reporting a vulnerability

**Email `grievance@swafto.app`.** Please do not open a public issue for
anything that could expose data.

Useful things to include, in rough order of usefulness:

- what you can see or do that you should not be able to;
- the smallest sequence of steps that reproduces it;
- whether you reached any real data, and if so roughly how much.

You do not need a working exploit, and please do not build one against real
accounts.

**What happens next.** We acknowledge within 3 working days and tell you what
we believe the impact is. If personal data was exposed, the clock in
`docs/runbooks/breach.md` starts the moment we become aware: affected people
are told without delay, and the Data Protection Board of India receives an
initial report without delay and a detailed one within 72 hours, as DPDP
Rule 7 requires.

We will credit you unless you ask us not to. There is no bounty programme -
this is an early-stage product, and we would rather say so than imply a
reward that does not exist.

## Scope

**In scope** - the API (`apps/api`), the mobile client (`apps/mobile`), the
public pages (`apps/web`), and anything in the verification toolchain that
could let a defect ship unnoticed.

Threats already modelled, each with its mitigation and the test that proves
it, are in `docs/audits/SECURITY-AUDIT.md`. Known gaps are stated plainly in
`docs/handover/HANDOVER.md` section 5 rather than hidden. If you find
something already named there, it is still worth reporting how bad it really
is - our severity may be wrong.

**Out of scope** - anything needing physical access to an unlocked handset
its owner handed you; denial of service by volume; missing hardening headers
with no demonstrated impact; and infrastructure we do not run.

## Four claims worth attacking

Context that may save you time. Each of these is enforced and tested, not
merely intended:

- **Entries are append-only.** A closed day cannot be altered - the database
  refuses it by trigger on both engines, and a correction is a new dated
  entry referencing the original.
- **The shop is taken from the session, never from the request.** Query
  string, body, path and headers are all ignored for that decision, and the
  guard has a test of its own.
- **The client writes nothing to the device log.** Not a status, not a
  redacted body - there are zero logging statements in the app by policy,
  because a log line outlives the person who typed the figure.
- **The server redacts phone numbers and codes from its own logs**, proven by
  capturing log output rather than by assertion.

Breaking any of those four is a finding we would treat as serious.
