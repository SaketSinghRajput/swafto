# Test environment (Terraform) - written, NOT applied

Nothing here has been applied. There were no AWS credentials when it was
written (`design/BLOCKERS.md` B1), so `terraform plan` has not run either; only
`terraform fmt` and `terraform validate` (init with `-backend=false`) have.

## What it creates

| Resource | Purpose |
|---|---|
| S3 bucket `swafto-test-apk-<account-id>` | Test APKs under `apk/`. Private, versioned, SSE-S3, all public access blocked, TLS-only, lifecycle expiry. |
| IAM role `swafto-github-test` | Assumed by GitHub Actions through the **existing** OIDC provider (data source, not created). Trusts exactly `repo:SaketSinghRajput/swafto:ref:refs/heads/test` and `...refs/heads/redesign-autonomous` (`StringEquals`, no wildcard). Max session 1 hour. May only `s3:PutObject`/`AbortMultipartUpload` on `apk/*` of that bucket, and `ssm:SendCommand` (document `AWS-RunShellScript`) to instances tagged `Environment=test`. |
| EC2 `t4g.small` Ubuntu 24.04 arm64 | Test API host. IMDSv2 only, no key pair, no port 22, SSM managed, encrypted gp3 volume, no ingress unless `api_ingress_cidrs` is set. |
| Postgres on that instance | Loopback only; password generated on first boot and kept in `/etc/swafto/test-db.env` (root, 0600). Never in state or user data. |

Everything carries `Project=swafto`, `Environment=test` (provider `default_tags`).

## Postgres: on the instance, not RDS

On the instance there is one billed resource and no subnet group, but no managed
backups and the data dies with the volume. That suits a test database tests
re-create. A `db.t4g.micro` RDS instance gives managed backups and patching, and
`docs/infra/HOSTING.md` records its price as $0.021/hr (about $15.33/month,
measured 2026-10-14), plus a subnet group and second security group.

**Cost estimate:** the t4g.small price in ap-south-1, the 20 GB gp3 volume and
the public IPv4 address were **not measured** (no credentials). Check the AWS
Pricing Calculator before applying. Stop the instance when tests are idle.

## Apply steps (when credentials exist)

The applier needs the permissions listed in `design/BLOCKERS.md` under B1/B2.

```bash
aws sso login --profile saftwo
export AWS_PROFILE=saftwo AWS_REGION=ap-south-1
aws sts get-caller-identity            # confirm the account is the intended one

cd infra/terraform/test
terraform init
terraform plan -out=test.plan          # SHOW THIS TO THE FOUNDER; do not apply unseen
terraform apply test.plan              # only after approval
```

Then set these as GitHub **repository variables** (Settings, Secrets and
variables, Actions, Variables). They are not secrets:

| Variable | Value |
|---|---|
| `AWS_TEST_ROLE_ARN` | `terraform output -raw github_test_role_arn` |
| `APK_BUCKET` | `terraform output -raw apk_bucket` |
| `SWAFTO_TEST_API_URL` | optional; only if a reachable https test API exists |

`.github/workflows/android-apk.yml` then uploads to
`s3://<bucket>/apk/v1.<n>/app-v1.<n>.apk` on pushes to `test` and
`redesign-autonomous`. Until `AWS_TEST_ROLE_ARN` is set that step prints a
notice and the job stays green.

Reach the API host: `aws ssm start-session --target $(terraform output -raw api_instance_id)`;
port-forward with `--document-name AWS-StartPortForwardingSession --parameters portNumber=8787,localPortNumber=8787`.

## Things to confirm at first plan/apply

- `ssm:resourceTag/Environment` is the condition key written for `SendCommand`
  on instances. It was written from documentation, not exercised; confirm with a
  dry-run deploy.
- The account must already contain the GitHub OIDC provider
  (`token.actions.githubusercontent.com`); the data source fails otherwise.
- State is local. Move to a remote backend before a second person applies.

## Teardown

`terraform destroy` removes everything. The bucket has versioning, so empty it
(including versions) first or destroy fails on a non-empty bucket. That is
deliberate: it stops an accidental destroy from deleting builds.
