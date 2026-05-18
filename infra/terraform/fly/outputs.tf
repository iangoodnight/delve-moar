output "api_ipv4" {
  description = "Public IPv4 address for the API app."
  value       = fly_ip.api_v4.address
}

output "api_ipv6" {
  description = "Public IPv6 address for the API app."
  value       = fly_ip.api_v6.address
}

output "api_hostname" {
  description = "Default Fly hostname for the API app."
  value       = "${fly_app.api.name}.fly.dev"
}
