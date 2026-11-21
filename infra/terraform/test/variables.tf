variable "region" {
  description = "AWS region. Data residency is ap-south-1 (Mumbai)."
  type        = string
  default     = "ap-south-1"
}

variable "github_repo" {
  description = "owner/name of the repository whose workflows may assume the test role."
  type        = string
  default     = "SaketSinghRajput/swafto"
}

variable "trusted_branches" {
  description = "The only branches whose workflows may assume the role. main is deliberately absent: it has its own role."
  type        = list(string)
  default     = ["test", "redesign-autonomous"]
}

variable "instance_type" {
  description = "Test API host. Graviton, 2 vCPU burstable, 2 GiB. Anything smaller than t4g.small risks the Node + Postgres pair swapping."
  type        = string
  default     = "t4g.small"
}

variable "root_volume_gb" {
  description = "Encrypted gp3 root volume; holds the OS, Node, the release and the Postgres data directory."
  type        = number
  default     = 20
}

variable "api_ingress_cidrs" {
  description = "CIDRs allowed to reach the API port directly. Empty (default) means nothing is exposed and the API is reached with an SSM port-forward."
  type        = list(string)
  default     = []
}

variable "api_port" {
  description = "Port the API listens on (the repo's dev server uses 8787)."
  type        = number
  default     = 8787
}

variable "apk_retention_days" {
  description = "APKs and non-current versions are expired after this many days, to keep the bucket small."
  type        = number
  default     = 90
}
