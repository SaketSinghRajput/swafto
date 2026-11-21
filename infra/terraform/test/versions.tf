# TEST ENVIRONMENT. WRITTEN, NOT APPLIED. See README.md before running anything.
#
# State is local on purpose: the applier has no shared backend to point at yet,
# and inventing a state bucket here would be one more resource nobody approved.
# Move to a remote backend before a second person applies this.

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region

  # Every resource that supports tags gets these two.
  default_tags {
    tags = {
      Project     = "swafto"
      Environment = "test"
    }
  }
}
