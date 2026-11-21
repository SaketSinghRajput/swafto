# A small test API host with its own Postgres ON THE INSTANCE.
#
# THE TRADE-OFF (Postgres on the instance vs db.t4g.micro RDS):
#   - On the instance: no second billed resource, no subnet group, one thing to
#     start and stop. Cost: no managed backups, no managed patching beyond
#     unattended-upgrades, and the data dies with the volume. That is acceptable
#     for a test database that tests re-create, and wrong for production, which
#     uses RDS (docs/infra/HOSTING.md).
#   - db.t4g.micro RDS: managed backups and patching, closer to production's
#     engine and TLS behaviour. Cost: HOSTING.md records db.t4g.micro at
#     $0.021/hr (about $15.33/month), measured 2026-10-14, and it needs a subnet
#     group and a second security group.
#   Chosen: on the instance. If the test environment ever holds data somebody
#   cares about, switch to RDS.
#
# COST ESTIMATE, NOT MEASURED: the t4g.small on-demand price in ap-south-1, the
# 20 GB gp3 volume and the public IPv4 address were NOT looked up here (there
# are no AWS credentials). Check the AWS Pricing Calculator before applying. The
# instance is the only recurring compute cost; stop it when tests are idle.

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Ubuntu 24.04 LTS arm64, resolved from Canonical's public SSM parameter so the
# AMI id is never pinned in this file. 24.04, not 26.04: see HOSTING.md on why
# the SSM agent must be present with port 22 closed.
data "aws_ssm_parameter" "ubuntu_2404_arm64" {
  name = "/aws/service/canonical/ubuntu/server/24.04/stable/current/arm64/hvm/ebs-gp3/ami-id"
}

resource "aws_security_group" "api" {
  name        = "swafto-test-api"
  description = "Test API host. No port 22. API port only from api_ingress_cidrs (empty by default)."
  vpc_id      = data.aws_vpc.default.id
}

resource "aws_vpc_security_group_ingress_rule" "api" {
  for_each          = toset(var.api_ingress_cidrs)
  security_group_id = aws_security_group.api.id
  description       = "API port from ${each.value}"
  ip_protocol       = "tcp"
  from_port         = var.api_port
  to_port           = var.api_port
  cidr_ipv4         = each.value
}

# Outbound: SSM, apt, nodejs.org. HTTPS, HTTP (apt mirrors) and DNS only.
resource "aws_vpc_security_group_egress_rule" "https" {
  security_group_id = aws_security_group.api.id
  description       = "HTTPS out (SSM, package downloads)"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "http" {
  security_group_id = aws_security_group.api.id
  description       = "HTTP out (apt mirrors)"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "dns" {
  security_group_id = aws_security_group.api.id
  description       = "DNS out"
  ip_protocol       = "udp"
  from_port         = 53
  to_port           = 53
  cidr_ipv4         = "0.0.0.0/0"
}

# Instance role: SSM Session Manager / Run Command and nothing else.
data "aws_iam_policy_document" "ec2_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "instance" {
  name               = "swafto-test-api-instance"
  assume_role_policy = data.aws_iam_policy_document.ec2_trust.json
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "instance" {
  name = "swafto-test-api-instance"
  role = aws_iam_role.instance.name
}

resource "aws_instance" "api" {
  ami                    = data.aws_ssm_parameter.ubuntu_2404_arm64.value
  instance_type          = var.instance_type
  subnet_id              = sort(data.aws_subnets.default.ids)[0]
  vpc_security_group_ids = [aws_security_group.api.id]
  iam_instance_profile   = aws_iam_instance_profile.instance.name

  # No key pair: there is no SSH. SSM is the only way in.
  associate_public_ip_address = true
  monitoring                  = false

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required" # IMDSv2 only
    http_put_response_hop_limit = 1
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_gb
    encrypted             = true
    delete_on_termination = true
  }

  user_data                   = templatefile("${path.module}/cloud-init.yaml.tftpl", { api_port = var.api_port })
  user_data_replace_on_change = true

  tags = {
    Name = "swafto-test-api"
  }
}
