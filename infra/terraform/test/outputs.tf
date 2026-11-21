output "apk_bucket" {
  description = "Set this as the GitHub repository variable APK_BUCKET."
  value       = aws_s3_bucket.apk.bucket
}

output "github_test_role_arn" {
  description = "Set this as the GitHub repository variable AWS_TEST_ROLE_ARN."
  value       = aws_iam_role.github_test.arn
}

output "api_instance_id" {
  description = "Reach it with: aws ssm start-session --target <id>"
  value       = aws_instance.api.id
}
