# Deploy runbook

How a release gets onto the SWAFTO origin server (`INSTANCE_ID`, SSM only,
no SSH). Proven on the first deploy, 2026-11-20 (release `f66119b`). Layout and
unit definitions: [`docs/infra/HOSTING.md`](../infra/HOSTING.md). Deploying to
production needs the founder's approval, via the CTO.

Every `aws` command: `--profile saftwo --region ap-south-1`, and in Git Bash
`MSYS_NO_PATHCONV=1`. Run server steps through SSM `AWS-RunShellScript` (script
starts with `#!/bin/bash`). If the SSO token has expired, ask the founder to run
`aws sso login --profile saftwo`.

## Layout on the server

```
/srv/releases/<shortsha>/   one unpacked release each (source + node_modules)
/srv/swafto  ->  /srv/releases/<shortsha>   symlink = the live release
```

The systemd unit, Caddy (`/srv/swafto/apps/web`), `swafto-db-roles` and
`swafto-purge` all read through `/srv/swafto`, so switching the symlink switches
everything.

## 1. Build and upload (your laptop, COMMITTED tree only)

```bash
cd "D:/SWAFTO/code base"                       # branch productionize / main
SHA=$(git -c safe.directory='D:/SWAFTO/code base' rev-parse --short HEAD)
git -c safe.directory='D:/SWAFTO/code base' archive --format=tar.gz HEAD > $SHA.tar.gz
aws s3 cp $SHA.tar.gz s3://swafto-deploy-artifacts-ACCOUNT_ID/releases/$SHA.tar.gz
```

`git archive` ships only what is committed. Use `>` not `-o`: Windows git cannot
write to a Git-Bash `/c/...` path. Run `aws s3 cp` from the file's directory for
the same reason. Releases expire from S3 after 30 days.

## 2. Install (server)

```bash
SHA=<shortsha>; R=/srv/releases/$SHA
install -d -o swafto -g swafto /srv/releases "$R"
aws s3 cp s3://swafto-deploy-artifacts-ACCOUNT_ID/releases/$SHA.tar.gz /tmp/rel.tgz
sudo -u swafto tar -xzf /tmp/rel.tgz -C "$R" && unlink /tmp/rel.tgz
cd "$R" && sudo -u swafto env HOME=/tmp npm_config_cache=/tmp/npm-cache \
  npm ci --workspace=apps/api --include-workspace-root --no-audit --no-fund
```

Do NOT add `--omit=dev` yet: `fastify`, `pg` and `@fastify/rate-limit` are
root `devDependencies`, so omitting dev removes the API's runtime (it dies with
`Cannot find package 'fastify'`). Fix the package.json, then add the flag.

## 3. Back up, then migrate (server, before the symlink moves)

```bash
/usr/local/bin/swafto-backup      # uses BACKUP_DATABASE_URL; refuses a dump < 4 KB
```

An EMPTY database dumps to 858 bytes and the script refuses it: expected on the
first deploy only. From then on a refusal is a real failure: stop.
Also take an RDS snapshot before a migration that changes or drops anything
(`aws rds create-db-snapshot --db-instance-identifier swafto-db ...`).

Migrations are the generated `packages/schema/migrations/*.postgres.up.sql`,
in the order of `allMigrationsUp` in `packages/schema/src/spec.ts` (0001 to 0005
today), applied as the RDS master, each in one transaction, recorded in
`schema_migrations`, so re-running skips what is applied:

```bash
source /etc/swafto/site.env
eval "$(aws ssm get-parameter --name /swafto/prod/MASTER_DATABASE_URL \
  --with-decryption --query Parameter.Value --output text | /usr/local/bin/swafto-pgenv)"
psql -X -q -v ON_ERROR_STOP=1 -c "CREATE TABLE IF NOT EXISTS schema_migrations
  (name text PRIMARY KEY, release text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())"
for f in 0001_init 0002_otp_pending 0003_closed_day_lock 0004_refresh_gen 0005_invite_codes; do   # list from spec.ts
  n=$(psql -X -tA -c "select count(*) from schema_migrations where name='$f'")
  [ "$n" = 0 ] && psql -X -q -v ON_ERROR_STOP=1 --single-transaction \
    -f $R/packages/schema/migrations/$f.postgres.up.sql \
    -c "INSERT INTO schema_migrations(name,release) VALUES ('$f','$SHA')" && echo "applied $f"
done
```

Migrations here have no down path in production use: the database backup is the
restore point (below). Make a new migration backwards-compatible with the
previous release, or rollback means a restore.

## 4. Switch, grant, restart

```bash
ln -sfn $R /srv/swafto                 # first deploy only: mv the old dir aside first
/usr/local/bin/swafto-db-roles         # re-run after EVERY migration: table grants
systemctl restart swafto-api
```

## 5. Verify (from outside)

```bash
H=https://<host>
curl -s $H/health            # {"status":"ok"}
curl -s $H/ready             # {"status":"ready"}   DB reachable through swafto_app
curl -sI $H/legal/privacy.html | head -1
journalctl -u swafto-api -n 30 --no-pager      # on the box: no errors
```

## Rollback

1. `ln -sfn /srv/releases/<previous-sha> /srv/swafto && systemctl restart swafto-api`
   (the previous release directory is still there; keep the last few).
2. If the bad release ran a migration the old code cannot live with, restore
   instead: the pre-deploy dump in `s3://swafto-backups-001/pg/`, or an RDS
   point-in-time restore (7 days), into a new instance; repoint the three
   `*_DATABASE_URL` parameters; restart. `swafto-restore-drill` proves the
   dump path. Never edit an applied migration; add a new one.
3. Confirm with step 5 and record it in `infra/PHASE-C-LOG.md`.

## Staging switches (remove when real)

`/etc/systemd/system/swafto-api.service.d/staging.conf` sets
`ALLOW_STUB_SMS=1`. There is no SMS provider yet (H1): the stub sends nothing and
holds codes only in memory, never logged. **Nobody can sign in with a real
phone.** Delete that file, `systemctl daemon-reload`, and wire the real adapter
before any real user. Production boot refuses the stub without it, by design.

## Staging: how a tester reads their OTP

Only for the staging stub (no SMS provider yet). The numbers in `STAGING_TEST_PHONES`
(`+91999990xxxxx` only, max 20; set in `swafto-api.service.d/staging.conf`) get their
code written to the API journal as a `staging test otp` line. Any other number gets
nothing logged. The tester requests the code in the app, then someone with SSM access runs:

```bash
aws ssm send-command --instance-ids INSTANCE_ID --document-name AWS-RunShellScript \
  --parameters 'commands=["journalctl -u swafto-api --since \"5 min ago\" --no-pager | grep \"staging test otp\" | tail -3"]' \
  --profile saftwo --region ap-south-1
# then get-command-invocation for the output; the line carries phone and code. Codes expire in 10 minutes.
```

Treat journal output as sensitive: do not paste codes into tickets or chat. Remove
`STAGING_TEST_PHONES` and `ALLOW_STUB_SMS` from `staging.conf` when a real SMS adapter ships.
