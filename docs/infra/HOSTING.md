# Hosting

The production architecture for SWAFTO, and how to build it.

Written for whoever operates this server. It assumes you can read a shell
script but not that you know AWS. Every price here was measured, not
estimated, and the column saying where each number came from is not
decoration - a cost model nobody can audit is how a $50 budget becomes $300.

Companion file: [`infra/cloud-init.yaml`](../../infra/cloud-init.yaml) builds
the server. This page explains why it is shaped the way it is, and covers
everything the launch wizard does not.

---

## 1. The shape of it

```
                    Shopkeeper's handset (offline-first)
                                  |
                           HTTPS 443 only
                                  |
                    Cloudflare DNS  (DNS-only, grey cloud)
                     no proxy, no TLS termination  -> AD-008
                                  |
   ap-south-1 (Mumbai) ...........|...........................
   :                              v                          :
   :   +----------------------------------------------+      :
   :   |  EC2 t3.small  -  public subnet              |      :
   :   |                                              |      :
   :   |   Caddy :80 :443   TLS + ACME, HSTS          |      :
   :   |        |                                     |      :
   :   |        v  127.0.0.1:8080  (loopback only)    |      :
   :   |   swafto-api   node 24, systemd, hardened    |      :
   :   |                                              |      :
   :   |   NO INBOUND 22.  Access via SSM only -> S-09|      :
   :   +----------------------------------------------+      :
   :          |                    |              |          :
   :      5432 (SG-to-SG)      SSM/CW         S3 (backups)   :
   :          v                                   v          :
   :   +------------------+            +---------------------+:
   :   | RDS PostgreSQL   |            | S3 bucket           |:
   :   | db.t4g.micro     |            | encrypted, 90-day   |:
   :   | NOT public       |            | lifecycle  -> L-06  |:
   :   | encrypted at rest|            +---------------------+:
   :   | 7-day PITR       |                                   :
   :   +------------------+                                   :
   ..........................................................
```

Nothing leaves the region. The published privacy policy says *"our servers and
our backups are in the AWS Mumbai region (ap-south-1)"*, which makes the region
a promise to the user rather than a preference.

### Why the database is not on the EC2 box

Moving it off costs $15.33/month, which is 38% of the budget, and it is still
the right call. With PostgreSQL on the instance, losing the instance loses the
shop's books. With RDS, the instance becomes **disposable**: terminate it,
launch a new one with the same user data, and you are back in about ten minutes
with no data loss. That single property is the largest resilience improvement
available at this price, and it is what "low chance of failing" actually buys.

It also pays for automated daily backups with 7-day point-in-time recovery, at
no extra charge while backup storage stays under the instance's storage size.

---

## 2. What it costs

Measured for **ap-south-1**, on-demand, 730 hours/month.

| Line | Rate | Monthly | Source |
|---|---|---|---|
| EC2 t3.small | $0.0224/hr | **$16.35** | measured earlier this session |
| EBS gp3 root, 20 GiB | $0.0912/GB-mo | **$1.82** | measured earlier this session |
| Public IPv4 address | $0.005/hr | **$3.65** | measured earlier this session |
| RDS db.t4g.micro, PostgreSQL, Single-AZ | $0.021/hr | **$15.33** | AWS price list, measured 2026-10-14 |
| RDS gp3 storage, 20 GB | $0.131/GB-mo | **$2.62** | AWS price list, measured 2026-10-14 |
| RDS automated backups, up to 20 GB | free to 100% of storage | **$0.00** | AWS terms |
| S3 logical dumps, ~2 GB | ~$0.025/GB-mo | **$0.05** | estimate; depends on data volume |
| SSM Session Manager | free | **$0.00** | measured earlier this session |
| CloudWatch: 10 alarms, 2 metrics, <5 GB logs | within free tier | **$0.00** | free tier: 10 alarms, 10 metrics, 5 GB |
| SNS email alerts | free to 1,000/mo | **$0.00** | AWS terms |
| Data transfer out, under 100 GB | free | **$0.00** | measured earlier this session |
| DNS | Cloudflare, existing | **$0.00** | AD-008 |
| | **Subtotal** | **$39.82** | |
| GST, if billed through AWS India (AISPL) | 18% | **$7.17** | Indian tax rate |
| | **Total** | **$46.99** | |

**It fits, with $3.01 of room.** That is thinner than it looks, and the honest
reading is that this budget has no slack for a mistake. Two things widen it:

- **A 1-year no-upfront Savings Plan on EC2 and a Reserved Instance on RDS.**
  This workload runs 24/7 forever, which is exactly what commitment pricing is
  for. It reduces the two largest lines - $31.68 of the $39.82 - substantially.
  I have deliberately not printed a percentage, because the console shows the
  exact rate for your term and payment option and I have not measured it. Run
  on-demand for the first month to confirm the instance sizes are right, then
  commit; committing to the wrong size is worse than paying on-demand.
- **Check whether this account still has Free Tier credit.** A new AWS account
  may cover most of this. I have not checked, and you should not assume it.

**Set an AWS Budget at $35 and $45 with email alerts before you launch
anything.** Every number above is a rate I measured, but your *consumption* is
not a number anyone has measured yet. The budget alarm is the only control here
that catches a wrong assumption in my model rather than in yours.

### What is deliberately absent, and what it would have cost

| Omitted | Cost | Why |
|---|---|---|
| Application Load Balancer | ~$16.43/mo | Buys health checks and TLS offload for one instance. At 41% of budget, Caddy plus `Restart=always` plus the offline-first client covers the same ground. |
| NAT Gateway | ~$32-41/mo | Only needed to give a private subnet an outbound route. A public subnet with an Internet Gateway costs nothing and reaches SSM. |
| Multi-AZ RDS | doubles to $30.66/mo | Real availability, unaffordable here. The restore drill in section 6 is the compensating control, and it is weaker. Say so out loud. |
| VPC interface endpoints | ~$7.30/mo each | Needed only for SSM from a subnet with no internet route. Not our topology. |

---

## 3. Decisions this honours

Each of these is recorded elsewhere in the repo; none is an invention of this
document.

| Decision | How the architecture meets it |
|---|---|
| **S-09** SSM only, no inbound 22 | The security group has no port 22 rule at all. Access is SSM Session Manager, which needs no inbound port and is free. |
| **S-17** secrets in SSM / OIDC | `swafto-env` pulls `DATABASE_URL`, `SESSION_SIGNING_KEY` and `RATE_LIMIT_KEY` from Parameter Store into `/run/swafto/env`, a tmpfs file readable only by root. Secrets never touch the EBS volume, so they are absent from every snapshot. |
| **AD-008** Cloudflare DNS-only, TLS at origin | Cloudflare holds DNS with the proxy **off**. TLS terminates on our instance, so no third party decrypts a shopkeeper's figures and no data leaves India. |
| **S-08** origin bypass | Follows from AD-008: there is no proxy to bypass. The origin is the only path. |
| **L-06** deletion reaches backups | The S3 lifecycle expires dumps at 90 days and RDS retains 7, both inside the 90 days the privacy policy promises. |
| **S-19** backup/restore unproven | `swafto-restore-drill` is the proof. Section 6. Until you have run it, this decision stays open. |
| Data residency | Every resource is ap-south-1. The policy states this to users. |

### Hardening the wizard will not give you

- **No secrets in user data.** Anything in user data is readable from inside
  the instance at `http://169.254.169.254/latest/user-data` by any local
  process, and EC2 keeps it for the life of the instance. `cloud-init.yaml`
  therefore contains no credential of any kind.
- **IMDSv2 required**, which defeats the SSRF-to-credentials path behind some
  of the largest cloud breaches on record.
- **The API binds `127.0.0.1`**, not `0.0.0.0`. Even with the security group
  wrong, port 8080 is unreachable from the network.
- **systemd confinement**: `ProtectSystem=strict`, `NoNewPrivileges`,
  `PrivateDevices`, a no-login service account, `RestrictAddressFamilies`. A
  compromised API process has very little left to reach for.
- **`MemoryHigh=900M` and a 2 GB swapfile**, so a memory spike on a 2 GiB box
  degrades instead of being OOM-killed.
- **`StartLimitIntervalSec=0`**, so systemd retries forever. The default gives
  up after five rapid restarts, which converts a transient fault into a silent
  outage lasting until somebody notices.

---

## 4. Building it

### Before you touch the wizard: three things you cannot change later

1. **RDS storage encryption can only be set at creation.** Turn it on. Fixing
   it afterwards means a snapshot-and-restore migration, and the privacy policy
   promises *"encrypted backups"*.
2. **Use Ubuntu 24.04 LTS, not 26.04.** Your screenshot showed 26.04
   (`ami-01a00762f46d584a1`). AWS's list of AMIs with the SSM Agent
   preinstalled includes 24.04 but **not** 26.04. With port 22 closed, SSM is
   your only way in, so an image that might lack the agent is a lock-out risk
   on a server you cannot log into. `cloud-init.yaml` installs the agent
   defensively, but the time to discover that it failed is not after launch.
   24.04 is supported to 2029, five years past anything that matters here.
3. **Assign a key pair even though port 22 is closed.** A key pair costs
   nothing and cannot be added to a running instance. The security comes from
   the security group having no port 22 rule, not from having no key. If SSM
   ever fails, a break-glass key plus a temporary SG rule scoped to your own IP
   is the difference between a ten-minute recovery and rebuilding from backup.
   **Store the `.pem` in a password manager, never in this repository** -
   `check:secrets` fails on a private key in the tree, and it is right to.

### The EC2 wizard, against your screenshot

| Field | Your screenshot | Set it to |
|---|---|---|
| Name | `swafto` | keep |
| AMI | Ubuntu 26.04 LTS | **Ubuntu 24.04 LTS** - see above |
| Instance type | t3.small | keep |
| Key pair | not set | **create `swafto-break-glass`** |
| Security group | new | **see below - no port 22** |
| Storage | **8 GiB** | **20 GiB gp3** - see below |
| IAM instance profile | not set | **`swafto-ec2`** - see below |
| User data | empty | **gzip it with `infra/make-user-data.sh`** and launch from the CLI - see below; pasting is impossible (30 KB) |
| Metadata version | default | **IMDSv2 required** |
| Credit specification | unlimited (default) | **keep unlimited** - see below |

**Why the user data is gzipped (and cannot be pasted).** `infra/cloud-init.yaml` is
about 30 KB and EC2 rejects user data over 16 KB (raw, before base64); the
console box takes text only. Compressed it is about 11 KB, and cloud-init
unpacks gzip user data by itself, so nothing about what runs changes. This was
chosen over slimming the file because slimming means moving the scripts out and
having the instance download them at first boot, which then has to be pinned and
hash-checked. Build it, then launch with the CLI (it base64-encodes a
`fileb://` file itself):

```bash
infra/make-user-data.sh --domain api.example.com --acme-email ops@example.com     --bucket swafto-backups-001 --out user-data.yaml.gz
aws ec2 run-instances ... --user-data fileb://user-data.yaml.gz
```

The script fills the three `REPLACE_ME` values, refuses if one is left or if
the result is over 16,384 bytes, and checks the gzip. In the console, "User
data" must stay empty; use the CLI.

**Why 20 GiB and not 8.** Ubuntu plus Node plus the CloudWatch agent is roughly
4 GiB before your application exists. Add a 2 GB swapfile, Caddy's logs, apt's
cache and a temporary `pg_dump` during the nightly backup, and 8 GiB fills. A
full root disk is a hard outage and the recovery is awkward. The extra 12 GiB
costs **$1.09/month**. It is the cheapest insurance on the whole list.

**Why keep `unlimited` credits.** t3 instances earn CPU credits and throttle to
a small fraction of a core when they run out. In `standard` mode a sustained
busy hour throttles you, which to a shopkeeper at closing time is an outage.
`unlimited` charges a surcharge per surplus vCPU-hour instead. Throttling is a
failure; a small visible charge is not. Alarm 6 below watches the credit balance
so you find out before the bill does.

### Security groups: two of them, and the second one matters

**`swafto-web`** on the instance:

| Direction | Port | Source | Why |
|---|---|---|---|
| in | 80/tcp | 0.0.0.0/0 | Let's Encrypt HTTP-01 challenge, and the redirect to HTTPS |
| in | 443/tcp | 0.0.0.0/0 | the API |
| out | all | 0.0.0.0/0 | apt, SSM, S3, RDS |

No port 22. Not even "from my IP". That is S-09.

**`swafto-db`** on the RDS instance:

| Direction | Port | Source |
|---|---|---|
| in | 5432/tcp | **`swafto-web` (the security group id, not a CIDR)** |

Use the security group as the source, not an IP range. The instance's address
changes when you rebuild it; its group membership does not. A CIDR rule here is
the kind of thing that works for a year and then fails at 2am after a rebuild.

### IAM role `swafto-ec2`

Two managed policies - `AmazonSSMManagedInstanceCore` and
`CloudWatchAgentServerPolicy` - plus one inline policy. Substitute your account
id and bucket name:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow",
      "Action": ["ssm:GetParameter", "ssm:GetParameters"],
      "Resource": "arn:aws:ssm:ap-south-1:ACCOUNT_ID:parameter/swafto/prod/*" },
    { "Effect": "Allow",
      "Action": "kms:Decrypt",
      "Resource": "*",
      "Condition": { "StringEquals":
        { "kms:ViaService": "ssm.ap-south-1.amazonaws.com" } } },
    { "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::YOUR_BUCKET",
                   "arn:aws:s3:::YOUR_BUCKET/*"] }
  ]
}
```

The role can read only `/swafto/prod/*` and reach only its own bucket. A
compromised instance cannot enumerate the account.

### Order of operations

1. **S3 bucket**, ap-south-1. Block all public access, default SSE-S3
   encryption, versioning on. Lifecycle rule: expire objects under `pg/` at
   **90 days**, and expire noncurrent versions at 90 days too - versioning
   without that second rule keeps deleted objects forever and quietly breaks
   the privacy policy's promise.
2. **RDS**: PostgreSQL 17, `db.t4g.micro`, Single-AZ, 20 GB gp3, **storage
   encryption ON**, **not publicly accessible**, security group `swafto-db`,
   backup retention 7 days, backup window 20:00-21:00 UTC, minor version
   auto-upgrade on, deletion protection on.
3. **SSM parameters**, all as **SecureString** (the three database roles
   are created by `swafto-db-roles` in step 8; their URLs name the fixed role
   names (each with its own generated password) `swafto_app`, `swafto_system`, `swafto_backup`):
   ```
   /swafto/prod/MASTER_DATABASE_URL  libpq URL of the RDS master user
   /swafto/prod/DATABASE_URL         same host and database, user swafto_app
   /swafto/prod/SYSTEM_DATABASE_URL  same host and database, user swafto_system
   /swafto/prod/BACKUP_DATABASE_URL  same host and database, user swafto_backup
   /swafto/prod/SESSION_SIGNING_KEY  openssl rand -hex 32
   /swafto/prod/RATE_LIMIT_KEY       openssl rand -hex 32
   ```
   Generate the two keys with `openssl rand -hex 32`. Do not reuse a value from
   anywhere, and do not let them reach a shell history file.
4. **Launch EC2** with the table above and the gzipped user data from
   `infra/make-user-data.sh` (see "Why the user data is gzipped").
5. **Cloudflare**: an `A` record for your API hostname pointing at the Elastic
   IP, **proxy off (grey cloud)**. With the orange cloud on, Cloudflare
   terminates TLS and reads every request - which breaks AD-008 and moves
   personal data outside India.
6. **Watch the build finish**, over SSM:
   ```bash
   cloud-init status --wait
   tail -50 /var/log/cloud-init-output.log
   swafto-pgenv --self-test     # must print: self-test PASS
   ```
7. **Deploy**, from your machine:
   ```bash
   git archive --format=tar.gz -o /tmp/swafto.tgz HEAD
   aws s3 cp /tmp/swafto.tgz s3://YOUR_BUCKET/releases/swafto.tgz
   ```
   then on the instance over SSM:
   ```bash
   aws s3 cp s3://YOUR_BUCKET/releases/swafto.tgz /tmp/swafto.tgz
   sudo -u swafto tar -xzf /tmp/swafto.tgz -C /srv/swafto
   cd /srv/swafto && sudo -u swafto npm ci   # NOT --omit=dev yet: fastify and pg are root devDependencies
   ```
   Source arrives via S3 using the instance role, so **no GitHub credential
   ever lives on the server**. `npm ci` must run at the repository root, not
   inside `apps/api`: this is a workspace monorepo and the API resolves
   `@swafto/values`, `@swafto/formula-engine` and `@swafto/schema` through the
   root `node_modules`.
8. **Apply the schema.** There is no migration runner in this repository, by
   design; the SQL is generated and applied deliberately:
   ```bash
   eval "$(aws ssm get-parameter --name /swafto/prod/DATABASE_URL \
             --with-decryption --query Parameter.Value --output text \
           | swafto-pgenv)"
   psql -v ON_ERROR_STOP=1 \
        -f /srv/swafto/packages/schema/migrations/0001_init.postgres.up.sql
   ```
   Then create the roles. This must run after every migration, as the RDS
   master, and is idempotent:
   ```bash
   sudo swafto-db-roles
   ```
   **RDS note.** The master is a member of `rds_superuser`, which is NOT a
   superuser, so Postgres refuses it any `ALTER ROLE` that names `SUPERUSER` or
   `REPLICATION`, even `NOSUPERUSER`. `roles.postgres.sql` therefore does not name
   them (both are the `CREATE ROLE` default) and instead refuses to continue if a
   swafto role holds either. RDS does let the master set `BYPASSRLS` (checked on
   the live instance), so the system and backup roles need no SECURITY DEFINER
   workaround and tenancy is unchanged: `swafto_app` is NOBYPASSRLS and binds
   to RLS. If a future RDS change takes `BYPASSRLS` away from the master, the
   fallback is SECURITY DEFINER functions for the five system lookups; do not
   weaken `swafto_app`.
9. **Start it**: `systemctl start swafto-api && systemctl status swafto-api`
10. **Prove it from outside.** Three URLs, not one - the last two are the ones
    Google Play's reviewer will open, and a 404 there is a rejected submission:
    ```bash
    curl -sI https://YOUR_HOST/                        # API, expect HSTS header
    curl -sI https://YOUR_HOST/legal/privacy.html      # expect 200
    curl -sI https://YOUR_HOST/delete-account/         # expect 200
    ```
    If the API answers but the two pages 404, Caddy is serving them from a path
    that does not exist yet: check `/srv/swafto/apps/web/` is populated and
    readable by the `caddy` user. The deploy in step 7 puts them there, because
    `git archive` includes `apps/web`.
11. **Run the restore drill** (section 6). Not next week. A backup you have not
    restored is not a backup.

---

## 5. Monitoring: ten alarms, $0

The CloudWatch free tier covers 10 alarms and 10 custom metrics, so this is
exactly ten. Point all of them at one SNS topic with your email subscribed.

| # | Metric | Threshold | What it catches |
|---|---|---|---|
| 1 | EC2 `CPUUtilization` | >80% for 10 min | load, or a runaway process |
| 2 | EC2 `StatusCheckFailed_Instance` | >=1 | the OS has stopped responding |
| 3 | EC2 `StatusCheckFailed_System` | >=1 | AWS-side host failure; needs a stop/start |
| 4 | `SWAFTO/mem_used_percent` | >85% | the real limit on a 2 GiB box |
| 5 | `SWAFTO/disk_used_percent` | >80% | a full root disk is a hard outage |
| 6 | EC2 `CPUCreditBalance` | <50 | **the one people omit.** Credits draining means throttling, or a surcharge, is coming. It is the earliest warning that t3.small has been outgrown. |
| 7 | RDS `CPUUtilization` | >80% for 10 min | a missing index, or genuine growth |
| 8 | RDS `FreeStorageSpace` | <2 GB | a database that fills stops accepting writes |
| 9 | RDS `FreeableMemory` | <100 MB | t4g.micro has 1 GiB; this precedes thrashing |
| 10 | RDS `DatabaseConnections` | >80 | a connection leak, or pool misconfiguration |

Two notes on what this does **not** cover. There is no alarm on HTTP 5xx rate,
because that needs either an ALB or a custom metric published by the
application, and neither exists yet - alarms 1 and 2 are weaker proxies. And
nothing here tells you the *application* is correct, only that the server is
alive. Keep log ingestion under 5 GB/month or the free tier ends; Caddy's
access log is set to roll at 32 MB and keep 4 files for that reason.

---

## 6. Backups, and the drill that makes them real

Three layers:

| Layer | Frequency | Retention | Restores what |
|---|---|---|---|
| RDS automated + PITR | continuous | 7 days | any second in the last week |
| RDS manual snapshot | before each deploy | until deleted | the pre-deploy state |
| `swafto-backup` to S3 | nightly 01:00 IST | **90 days** | a portable dump, restorable anywhere |

The third layer exists because the first two are trapped inside RDS. A logical
`pg_dump` in S3 can be restored onto a laptop, a different account, or a
different provider. That is the layer that survives losing the AWS account
itself.

`swafto-backup` refuses to upload a dump under 4 KB and runs `pg_restore
--list` over it first, because a truncated dump that uploads successfully is
worse than no dump at all: it looks like a backup in every dashboard you own.

**Retention is 90 days because the privacy policy says so.** The published text
promises *"encrypted backups rotate out within 90 days and are never
restored"*. That sentence is a commitment to users and the first half of L-06.
If you change the S3 lifecycle, change the policy in the same commit, or you
have created a false statement in a document users rely on.

### Which database role each job uses

| Job | Role | Why |
|---|---|---|
| `swafto-backup` | `BACKUP_DATABASE_URL` -> `swafto_backup` | `pg_dump` has to read every row of every table. `swafto_app` is bound by row-level security, so a dump through it fails or is empty. `swafto_backup` is BYPASSRLS with SELECT on all tables and sequences and **nothing else**: a leaked backup credential can read but not change data. Granted per table by `roles.postgres.sql`, so it needs nothing the RDS master lacks. |
| `swafto-restore-drill` | `MASTER_DATABASE_URL` | It must CREATE and DROP a database, which `swafto_backup` deliberately cannot. It only ever touches the database `swafto_drill`. |

`pg_dump` is `postgresql-client-18`, matching RDS 18.3: a v17 client refuses a
v18 server. When RDS moves to a new major, bump the package in `cloud-init.yaml`.

### The drill

```bash
swafto-restore-drill
```

It takes the newest dump from S3, restores it into a scratch database, counts
the `entries` table, discards the scratch database, and prints PASS or FAIL. It
never writes to the live database. **Run it monthly, and after any change to
`swafto-backup`.**

Decision **S-19** records backup and restore as unproven. Running this closes
it. Until then the honest statement is that this system has backups and has
never demonstrated a restore - a different and much weaker claim.

---

## 7. When the users arrive

What makes growth survivable here is not the server. **The client is
offline-first**: a shopkeeper whose sync fails keeps working, and the queue
drains later. The server being down is a delay, not a stoppage. That property
is worth more than any amount of infrastructure at this budget, and it is
already built and tested.

The scale path, cheapest first:

| Trigger | Move | Cost change | Downtime |
|---|---|---|---|
| Alarm 6 fires repeatedly | t3.small -> t3.medium | +$16.35/mo | stop/start, ~3 min |
| Alarms 7 or 9 fire | db.t4g.micro -> db.t4g.small | +$15.33/mo | ~5 min, or none with Multi-AZ |
| Disk pressure | grow the gp3 volume | +$0.09/GB-mo | none |
| Uptime becomes a business requirement | Multi-AZ RDS | +$15.33/mo | none to apply |
| Two instances needed | ALB + second instance | +$16.43 + $16.35/mo | none |

Resize vertically before you shard horizontally. One slightly larger box is far
simpler to reason about at 2am than two boxes and a load balancer, and
simplicity is itself an availability property.

**What actually breaks first.** Not CPU. On a 2 GiB instance it will be memory,
and the second thing will be database connections - which is why alarms 4, 9
and 10 exist. Before buying a larger instance, check whether the API is opening
a connection pool per worker; a leak looks exactly like growth on a graph.

---

## 8. Three things I could not settle

These need a decision from someone who can make it. None blocks launching, and
all three are real.

**1. TLS 1.3 contradicts minSdk 24.** Decision S-06 asks for TLS 1.3 with no
cleartext. Caddy's default floor is TLS 1.2, with only forward-secret suites.
Forcing 1.3 would refuse Android 7, 8 and 9 handsets - which `minSdk 24` still
supports, and which is precisely the Rs 7,000 bracket this product is built
for. I left the default at 1.2 and commented the one-line change in the
Caddyfile, because silently weakening a stated security decision and silently
cutting off the target customer are both wrong, and this is a product call
rather than a server one. **Resolve it by deciding the real minimum Android
version**, then either raise `minSdk` and force 1.3, or amend S-06 to say
TLS 1.2 with forward secrecy and record why.

**2. Single-AZ has no failover.** An availability-zone failure in Mumbai takes
the API down until RDS is restored into another AZ, which is tens of minutes of
manual work. Multi-AZ fixes it for $15.33/month and does not fit the $50
budget. The offline-first client makes this survivable rather than fatal. It is
a known, accepted and currently unmitigated risk - not an oversight.

**3. There is no alarm on application errors.** All ten alarms watch
infrastructure. An API returning 500 to every request on a healthy instance
with normal CPU would trip none of them. Closing this properly means the
application publishing its own error-rate metric, which is application work,
not infrastructure work.

---


## Current deployment (first deploy, 2026-11-20)

| | |
|---|---|
| API origin | `https://api.rohinova.com` (DNS `A` record, TTL 600, -> the Elastic IP). Verified live 2026-11-20 (cert issued by Let's Encrypt). |
| Elastic IP | `EIP_ALLOCATION_ID`, ELASTIC_IP, tagged `Name=swafto-api`, `Project=swafto` |
| TLS | Let's Encrypt, issued and renewed by Caddy; no ACME e-mail configured (no expiry notices) |
| Site domain lives in | `SWAFTO_DOMAIN` in `/etc/swafto/site.env` (the Caddyfile reads it). Change it, then `systemctl restart caddy`. At build time it is `make-user-data.sh --domain`. |
| Releases | `/srv/releases/<sha>`, `/srv/swafto` is the symlink; procedure in [`docs/runbooks/deploy.md`](../runbooks/deploy.md) |
| Staging switch | `ALLOW_STUB_SMS=1` in `swafto-api.service.d/staging.conf`: no SMS provider (H1), nobody can really sign in |

Only point DNS at the server and start (or restart) Caddy once the name resolves to the
EIP, or the ACME challenge fails, and repeated failures rate-limit the domain.

## Appendix: things that will bite you

- **`cloud-init` runs once.** Editing user data later changes nothing until you
  re-launch. Treat the file as the definition of the server and rebuild, rather
  than patching a drifting box by hand.
- **Elastic IP, not the default public IP.** The default address changes on
  every stop/start, and your DNS record will be wrong at the worst moment.
  Since **1 February 2024 every public IPv4 address is charged** at $0.005/hr
  whether it is attached to anything or not - the old "free while attached"
  rule is gone. That is the $3.65 line in section 2, and it is why this design
  uses exactly one address. Release it if you tear the instance down, or you
  go on paying for it. A new account gets 750 hours/month free for its first
  12 months, which may absorb this line for the first year.
- **`swafto-api` is not started by `cloud-init`**, deliberately - `/srv/swafto`
  is empty at that point. Step 9 starts it.
- **The first `curl` after launch may fail for ~60 seconds** while Caddy
  completes the ACME challenge. Port 80 must be open and DNS must already
  resolve, or the certificate is never issued.
- **`check:secrets` fails if a `.pem` is anywhere in the tree.** The
  break-glass key belongs in a password manager. That check has already caught
  a real private key in this repository once.
