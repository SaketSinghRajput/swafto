data "aws_caller_identity" "current" {}

# Private, versioned, encrypted, public-access-blocked bucket for test APKs.
resource "aws_s3_bucket" "apk" {
  bucket = "swafto-test-apk-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "apk" {
  bucket                  = aws_s3_bucket.apk.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "apk" {
  bucket = aws_s3_bucket.apk.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "apk" {
  bucket = aws_s3_bucket.apk.id
  versioning_configuration {
    status = "Enabled"
  }
}

# SSE-S3 (AES256): no KMS key to pay for or to lose, and the objects are
# debug-signed test builds, not customer data.
resource "aws_s3_bucket_server_side_encryption_configuration" "apk" {
  bucket = aws_s3_bucket.apk.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "apk" {
  bucket = aws_s3_bucket.apk.id

  rule {
    id     = "expire-old-apks"
    status = "Enabled"
    filter {
      prefix = "apk/"
    }
    expiration {
      days = var.apk_retention_days
    }
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  depends_on = [aws_s3_bucket_versioning.apk]
}

# Refuse any request that is not TLS.
data "aws_iam_policy_document" "apk_bucket" {
  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.apk.arn, "${aws_s3_bucket.apk.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "apk" {
  bucket = aws_s3_bucket.apk.id
  policy = data.aws_iam_policy_document.apk_bucket.json

  depends_on = [aws_s3_bucket_public_access_block.apk]
}
