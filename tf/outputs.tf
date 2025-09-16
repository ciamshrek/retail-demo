output "auth0_spa_client_id" {
  description = "Auth0 SPA Client ID"
  value       = auth0_client.spa_app.client_id
}

output "auth0_m2m_client_id" {
  description = "Auth0 M2M Client ID"
  value       = auth0_client.m2m_app.client_id
}

output "auth0_m2m_client_secret" {
  description = "Auth0 M2M Client Secret"
  value       = auth0_client_credentials.m2m_credentials.client_secret
  sensitive   = true
}

output "auth0_api_identifier" {
  description = "Auth0 API Identifier"
  value       = auth0_resource_server.retail_api.identifier
}

output "auth0_domain" {
  description = "Auth0 Domain"
  value       = var.auth0_domain
}
