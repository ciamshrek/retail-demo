variable "auth0_domain" {
  description = "Auth0 domain (e.g., your-tenant.auth0.com)"
  type        = string
}

variable "auth0_management_client_id" {
  description = "Auth0 Management API Client ID"
  type        = string
}

variable "auth0_management_client_secret" {
  description = "Auth0 Management API Client Secret"
  type        = string
  sensitive   = true
}

variable "app_name" {
  description = "Application name prefix"
  type        = string
  default     = "retail-demo"
}

variable "app_url" {
  description = "Application URL (e.g., https://your-app.vercel.app)"
  type        = string
}

variable "api_identifier" {
  description = "Auth0 API identifier/audience"
  type        = string
  default     = "https://api.retail-demo.com"
}

variable "mcp_identifier" {
  description = "Auth0 MCP identifier/audience"
  type        = string
  default     = "http://localhost:3002/mcp"
}