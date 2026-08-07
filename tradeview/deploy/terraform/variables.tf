variable "name" {
  description = "Prefix for every resource, so they are recognisable in the console."
  type        = string
  default     = "tradeview"
}

variable "region" {
  description = <<-EOT
    IBKR routes this account through European data farms (eufarm), so Paris is
    the likely choice despite the exchange being in Chicago. Measure before
    settling: the audit calls for latency figures, not intuition.
  EOT
  type        = string
  default     = "eu-west-3"
}

variable "instance_type" {
  description = <<-EOT
    IB Gateway alone wants 1.5-2 GB. t3.micro (1 GB, free tier) will not hold
    it with the engine alongside; t3.small is the smallest that will.
  EOT
  type        = string
  default     = "t3.small"
}

variable "disk_gb" {
  description = "Root volume size. Recorded ticks land here before S3 exists."
  type        = number
  default     = 20
}

variable "ssh_public_key" {
  description = "Contents of your public key, e.g. file(\"~/.ssh/id_ed25519.pub\")."
  type        = string
}

variable "operator_cidr" {
  description = <<-EOT
    The only address allowed to reach SSH, as a CIDR: "203.0.113.4/32".
    Find yours with: curl -s https://checkip.amazonaws.com
    Deliberately has no default — 0.0.0.0/0 must be a decision, never an
    oversight.
  EOT
  type        = string
}
