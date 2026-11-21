# The GitHub OIDC provider already exists in the account (the main-branch
# deploy role uses it). Look it up; never create a second one, because the
# URL is unique per account and a duplicate create fails.
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  oidc_subjects = [for b in var.trusted_branches : "repo:${var.github_repo}:ref:refs/heads/${b}"]
}

data "aws_iam_policy_document" "github_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # StringEquals, not StringLike: an exact ref, no wildcard, so a branch
    # named test-evil or a pull-request ref cannot assume this role.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = local.oidc_subjects
    }
  }
}

resource "aws_iam_role" "github_test" {
  name                 = "swafto-github-test"
  description          = "Assumed by GitHub Actions on the test and redesign-autonomous branches only."
  assume_role_policy   = data.aws_iam_policy_document.github_trust.json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "github_test" {
  # APK upload: PutObject under apk/ only. No read, no list, no delete.
  statement {
    sid    = "PutApkObjects"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:AbortMultipartUpload",
    ]
    resources = ["${aws_s3_bucket.apk.arn}/apk/*"]
  }

  # Deploy: run a shell script on instances tagged Environment=test, over SSM.
  statement {
    sid       = "SendCommandToTestInstances"
    effect    = "Allow"
    actions   = ["ssm:SendCommand"]
    resources = ["arn:aws:ec2:${var.region}:${data.aws_caller_identity.current.account_id}:instance/*"]
    condition {
      test     = "StringEquals"
      variable = "ssm:resourceTag/Environment"
      values   = ["test"]
    }
  }

  statement {
    sid       = "SendCommandDocument"
    effect    = "Allow"
    actions   = ["ssm:SendCommand"]
    resources = ["arn:aws:ssm:${var.region}::document/AWS-RunShellScript"]
  }

  # Read the result of a command. These actions do not support resource-level
  # restriction, and they are read-only.
  statement {
    sid    = "ReadCommandResults"
    effect = "Allow"
    actions = [
      "ssm:GetCommandInvocation",
      "ssm:ListCommandInvocations",
      "ec2:DescribeInstances",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_test" {
  name   = "apk-upload-and-test-deploy"
  role   = aws_iam_role.github_test.id
  policy = data.aws_iam_policy_document.github_test.json
}
