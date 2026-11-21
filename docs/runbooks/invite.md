# Beta invite codes: runbook

Until SMS or WhatsApp codes exist, a shopkeeper signs in with an **8-digit invite code** that
Saket issues for one phone number. Design and threats: [`docs/auth/INVITE-CODES.md`](../auth/INVITE-CODES.md).
Saket is the only operator. A code is shown **once**, on the terminal that asked for it.

## Before the first invite (one time, founder, needs approval via the CTO)

1. Deploy a release that has migration `0005_invite_codes` ([deploy.md](deploy.md) section 3, then re-run
   `swafto-db-roles` so `swafto_app` gets its grants on `invite_audit`).
2. Create the SSM parameter `/swafto/prod/AUTH_MODE` with the value `invite`. **The API refuses to boot
   without it** (and `swafto-env` stops the start), so create it BEFORE the release that needs it. Existing
   boxes need the updated `/usr/local/bin/swafto-env` and `/usr/local/bin/swafto-invite` from
   `infra/cloud-init.yaml` copied on by hand; new boxes get them at first boot.
3. Restart `swafto-api`. In invite mode a request for a code answers `202 {sent:false, mode:"invite", digits:8}`
   for every number and sends nothing.

## Issue a code (on your laptop, after `aws sso login --profile saftwo`)

```bash
node --experimental-strip-types tools/swafto-invite.mjs issue \
  --phone "+91 98765 00001" --confirm-phone "+91 98765 00001" \
  --purpose new --ticket T-12 --consent-recorded yes
```

It prints the code, grouped `4821 0937`, and nothing else on stdout; a status line with the MASKED number
goes to stderr. Type the number **twice** (the second is `--confirm-phone`; it is an argument, not a prompt,
because SSM cannot answer one).

- `--purpose new`: a shop with no account yet. Valid **7 days**.
- `--purpose recovery`: the owner is signing in on a NEW phone to an EXISTING shop. Valid **24 hours**. Deliver
  it only to the owner (ring the number back first); a forwarded recovery code takes over the shop (D2, an
  accepted residual risk). The owner then signs the lost phone out in Settings.
- `--ticket`: a support-ticket reference, capital letters, a dash, up to five digits (`T-12`, `SUP-4021`). Nothing wider is accepted, so a phone number or a code cannot be typed into it: it is kept in the audit for 12 months. It is the join to the audit row.
- `--consent-recorded yes`: you have the shopkeeper's consent to be contacted and to hold their number for this.
  The command refuses without it.

**Handover.** Send the code alone in WhatsApp, never with the number. Clear your terminal afterwards: the code
is plaintext in the SSM command output until then (T7). Issuing again for the same number **kills the previous
code** the moment it commits.

A wrong kind fails closed: `new` for a number that already has an account, or `recovery` for one with none, is
refused at sign-in with a bare 401 and the code is spent. Issue the right one.

## Revoke and list

```bash
node --experimental-strip-types tools/swafto-invite.mjs revoke --phone "+91 98765 00001" --confirm-phone "+91 98765 00001" --ticket T-13
node --experimental-strip-types tools/swafto-invite.mjs list     # masked number, kind, expiry, wrong guesses, live or expired
```

Five wrong guesses burn a code (it is deleted); the shopkeeper then needs a new one. A burn writes one `invite_burned` warn line (masked number, kind, never the code); a burst of them is the pattern to alert on, and `invite_refused_kind` marks a wrong-kind code.

## What is recorded

`invite_audit` has one row per issue or revoke: time, action, kind, a keyed hash of the number, its last four
digits, and your ticket. **No code and no full number.** Rows cannot be updated or deleted by the application;
the nightly `purge-due` removes rows over **12 months** old (the trigger refuses anything younger).
First purge due before **2027-11-20**; check the `purge-due` line (`invite audit rows purged`) then. Match the
audit to your tickets monthly. The authoritative "who ran it" is the CloudTrail `SendCommand` event.

Expired invite rows (each holds a full number) are swept nightly by the same job.

## Flip to SMS later

1. For every live invite, run `invite list`, then `revoke` it, or wait 7 days.
2. Set `/swafto/prod/AUTH_MODE` to `sms`, restart. The stub SMS port then needs `ALLOW_STUB_SMS=1` as before.
Automatic codes never overwrite a live invite (the store keeps `kind = 'invite_*'` rows), so the two can coexist.

## The demo login

Optional, for a demo phone and the Google Play reviewer. SSM parameters `/swafto/prod/DEMO_LOGIN_PHONE`
(a number in `+91 99999 0xxxx`) and `/swafto/prod/DEMO_LOGIN_CODE_HASH`, both or neither. Make the hash **on the
box** (the code must not travel through the laptop wrapper):

```bash
echo 24681357 | node /srv/swafto/apps/api/src/admin/invite-cli.ts demo-hash --phone "+91 99999 00001"
```

with `SESSION_SIGNING_KEY` in the environment (use `swafto-env` to load it). Put the printed hash in SSM and
restart. The demo code is fixed, and eight to ten digits long. Five attempts an hour, then a one-hour lockout. Holds synthetic
data only; rotate the code after a review. See the residual-risk paragraph in `docs/auth/INVITE-CODES.md`.

## If something looks wrong

| Sign | Meaning | Do |
|---|---|---|
| shopkeeper gets 401 on a fresh code | wrong number, expired, burned by 5 guesses, wrong kind, or already used | `invite list`; issue again with the right purpose |
| boot says `AUTH_MODE is not set` | the SSM parameter is missing | create it (see above) |
| `invite: refused: AUTH_MODE is not invite` | the box is in `sms` mode | the CLI works only in invite mode |
