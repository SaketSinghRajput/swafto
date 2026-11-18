# ERROR TRACKING RUNBOOK (infra side of PLAN 4.3)

No paid service. The API writes every 5xx and every unhandled error as ONE
structured pino line at `level` 50, carrying `err.type`, `reqId` and `route`.
CloudWatch counts those lines, an alarm fires on a burst, and SNS tells a human.
Nothing here is provisioned: this file is the recipe, and the steps marked
**HUMAN** need the AWS console. Prerequisites (account, IAM role, instance role
policy, the `swafto-alerts` SNS topic and its email subscription) are in
`docs/handover/HUMAN-ACTIONS.md` H2 and H22; do not duplicate them here.

## 1 · What ships by itself (cloud-init, no console)

`infra/cloud-init.yaml` now does three things at boot:

1. `swafto-api-log.service` copies the `swafto-api` journal, message text only,
   to `/var/log/swafto-api.log`. One line is still one JSON object.
2. `/etc/logrotate.d/swafto-api` rotates it (3 days, `copytruncate`).
3. The CloudWatch agent ships that file to log group **`swafto-api`**
   (retention 30 days; `swafto-alerts` is unchanged at 90).

The instance role already carries `CloudWatchAgentServerPolicy`
(`docs/infra/HOSTING.md`, the IAM role section), which allows `logs:CreateLogGroup`,
`CreateLogStream` and `PutLogEvents`, so no IAM change is needed for this.

Check on the box (SSM Session Manager) after the first deploy:

    systemctl status swafto-api-log
    tail -n 3 /var/log/swafto-api.log        # JSON lines
    sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status

## 2 · The metric filter (HUMAN, console or CLI)

Log group `swafto-api`. Filter pattern, CloudWatch JSON syntax:

    { $.level >= 50 }

`>= 50` is pino's error (50) and fatal (60). A line that is not JSON, such as a
Node boot message on stderr, does not match, so it cannot inflate the count.
To narrow to one class of failure add a term, for example
`{ $.level >= 50 && $.err.type = "DatabaseError" }`.

Metric: namespace `SWAFTO`, name `ApiErrors`, value `1`, default value `0`, unit
`Count`. Do NOT use `reqId` or `route` as metric dimensions: both are
high-cardinality or unbounded and every distinct value is a billable custom
metric. Look them up in Logs Insights instead:

    fields @timestamp, err.type, route, reqId
    | filter level >= 50
    | sort @timestamp desc
    | limit 50

## 3 · The alarm and the SNS wiring (HUMAN)

| Field | Value |
|---|---|
| Metric | `SWAFTO` / `ApiErrors`, statistic Sum, period 5 minutes |
| Condition | `>= 5` for 1 of 1 datapoints |
| Missing data | treat as `notBreaching` (a quiet API is not an alarm) |
| Action | notify the existing `swafto-alerts` SNS topic (H2/H22 create it and subscribe the founder's email) |

Equivalent CLI, to be run by the founder and not by an agent:

    aws logs put-metric-filter --log-group-name swafto-api \
      --filter-name api-errors --filter-pattern '{ $.level >= 50 }' \
      --metric-transformations metricName=ApiErrors,metricNamespace=SWAFTO,metricValue=1,defaultValue=0
    aws cloudwatch put-metric-alarm --alarm-name swafto-api-errors \
      --namespace SWAFTO --metric-name ApiErrors --statistic Sum --period 300 \
      --evaluation-periods 1 --threshold 5 --comparison-operator GreaterThanOrEqualToThreshold \
      --treat-missing-data notBreaching --alarm-actions <swafto-alerts topic ARN>

## 4 · Cost

The free tier covers 10 alarms and 10 custom metrics, and `docs/infra/HOSTING.md`
section 5 already spends all ten alarms. This is the eleventh: about $0.10 per
month at the standard alarm price (an estimate from AWS's published rate, not a
measured bill). The metric is one of the 10 free custom metrics only if the
section 5 metrics leave room; otherwise about $0.30 per month. Either way it is
under one dollar, but it is spend, so it needs the founder's yes first.
Log ingestion is small (one line per request at most) but counts toward the
5 GB per month free allowance shared with Caddy's access log.

## 5 · When it fires

1. Logs Insights, query above, last 15 minutes: which `err.type` and `route`?
2. Take one `reqId` and read the full request line and the error line together.
3. If the lines name a person's data, the breach runbook (`docs/runbooks/breach.md`)
   clock starts when you became aware, not when you finished investigating.
