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
}

# Latest Ubuntu LTS, resolved rather than pinned to an id: AMI ids differ per
# region and are replaced on every security refresh.
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_key_pair" "operator" {
  key_name   = "${var.name}-operator"
  public_key = var.ssh_public_key
}

# Nothing but SSH is reachable. The engine's socket accepts orders, so it stays
# on loopback and is reached through an SSH tunnel; opening 8080 to the world
# would make the shared token the only thing between a stranger and the
# account.
resource "aws_security_group" "engine" {
  name        = "${var.name}-engine"
  description = "TradeView engine: SSH in, everything out"

  ingress {
    description = "SSH from the operator only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.operator_cidr]
  }

  egress {
    description = "Outbound to Interactive Brokers, news feeds and updates"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.name}-engine"
  }
}

resource "aws_instance" "engine" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  key_name      = aws_key_pair.operator.key_name

  vpc_security_group_ids = [aws_security_group.engine.id]

  # IB Gateway is a Java desktop application and wants 1.5-2 GB to itself. A
  # 1 GB instance will not hold it alongside the engine.
  root_block_device {
    volume_size = var.disk_gb
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = file("${path.module}/../scripts/bootstrap.sh")

  # An unattended trading process should survive a host retirement.
  metadata_options {
    http_tokens = "required"
  }

  tags = {
    Name    = var.name
    Project = "tradeview"
  }
}

# A fixed address, so the SSH tunnel and any later DNS entry survive a reboot.
resource "aws_eip" "engine" {
  instance = aws_instance.engine.id
  domain   = "vpc"

  tags = {
    Name = "${var.name}-ip"
  }
}
