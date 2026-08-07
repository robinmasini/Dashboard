output "public_ip" {
  description = "Fixed address of the engine host."
  value       = aws_eip.engine.public_ip
}

output "ssh" {
  description = "Open a shell on the host."
  value       = "ssh ubuntu@${aws_eip.engine.public_ip}"
}

output "tunnel" {
  description = <<-EOT
    Forwards the engine to your machine without exposing it. With this open,
    the browser reaches the engine at ws://localhost:8080/ws exactly as it does
    when everything runs locally.
  EOT
  value       = "ssh -N -L 8080:127.0.0.1:8080 ubuntu@${aws_eip.engine.public_ip}"
}

output "vnc_tunnel" {
  description = "Forwards IB Gateway's screen, for the first login and for diagnosis."
  value       = "ssh -N -L 5900:127.0.0.1:5900 ubuntu@${aws_eip.engine.public_ip}"
}
