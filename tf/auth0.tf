# Auth0 Tenant Configuration
resource "auth0_tenant" "main" {
  enabled_locales = ["en"]

  flags {
    enable_client_connections          = true
    enable_dynamic_client_registration = true
  }

  default_audience  = var.mcp_identifier
  default_directory = "Username-Password-Authentication"
}

# Auth0 Database Connection
resource "auth0_connection" "username_password_auth" {
  name     = "Username-Password-Authentication"
  strategy = "auth0"

  is_domain_connection = true

  options {
    enabled_database_customization = false
  }
}

resource "auth0_connection" "agents" {
  name     = "Agents"
  strategy = "auth0"
}

# Auth0 API Resource
resource "auth0_resource_server" "retail_api" {
  name        = "${var.app_name} API"
  identifier  = var.api_identifier
  signing_alg = "RS256"

  allow_offline_access                            = true
  token_lifetime                                  = 86400
  token_lifetime_for_web                          = 7200
  skip_consent_for_verifiable_first_party_clients = true
  enforce_policies                                = true
}


# Auth0 API Resource
resource "auth0_resource_server" "mcp_server" {
  name        = "${var.app_name} MCP Server"
  identifier  = var.mcp_identifier
  signing_alg = "RS256"

  allow_offline_access                            = true
  token_lifetime                                  = 86400
  token_lifetime_for_web                          = 7200
  skip_consent_for_verifiable_first_party_clients = true
  enforce_policies                                = true
}


# Auth0 API Scopes
resource "auth0_resource_server_scopes" "retail_api_scopes" {
  resource_server_identifier = auth0_resource_server.retail_api.identifier

  scopes {
    name        = "read:profile"
    description = "Read user profile"
  }

  scopes {
    name        = "write:cart"
    description = "Manage shopping cart"
  }

  scopes {
    name        = "read:orders"
    description = "Read order history"
  }

  scopes {
    name        = "write:orders"
    description = "Create orders"
  }
}

# Auth0 SPA Application
resource "auth0_client" "spa_app" {
  name                = "${var.app_name} SPA"
  description         = "React SPA for ${var.app_name}"
  app_type            = "spa"
  callbacks           = ["${var.app_url}/callback", "${var.app_url}"]
  allowed_origins     = [var.app_url]
  web_origins         = [var.app_url]
  allowed_logout_urls = ["${var.app_url}"]

  oidc_conformant      = true
  cross_origin_auth    = false
  custom_login_page_on = true
  is_first_party       = true
  sso_disabled         = false

  jwt_configuration {
    lifetime_in_seconds = 36000
    secret_encoded      = false
    alg                 = "RS256"
  }

  # Grant types for SPA
  grant_types = [
    "authorization_code",
    "refresh_token"
  ]

  # Refresh token configuration
  refresh_token {
    expiration_type              = "expiring"
    leeway                       = 0
    token_lifetime               = 2592000 # 30 days
    infinite_token_lifetime      = false
    infinite_idle_token_lifetime = false
    idle_token_lifetime          = 1296000 # 15 days
    rotation_type                = "rotating"
  }
}

# Enable the SPA app for the Username-Password-Authentication connection
resource "auth0_connection_clients" "username_password_clients" {
  connection_id   = auth0_connection.username_password_auth.id
  enabled_clients = [auth0_client.spa_app.id]
}

# Machine-to-Machine application for server-side operations (if needed)
resource "auth0_client" "m2m_app" {
  name        = "${var.app_name} M2M"
  description = "Machine to Machine app for ${var.app_name} server operations"
  app_type    = "non_interactive"

  jwt_configuration {
    lifetime_in_seconds = 36000
    secret_encoded      = false
    alg                 = "RS256"
  }

  grant_types = ["client_credentials"]
}

# Client credentials for M2M app (replaces direct client_secret access)
resource "auth0_client_credentials" "m2m_credentials" {
  client_id = auth0_client.m2m_app.id

  authentication_method = "client_secret_post"
}

# Grant M2M app access to the API
resource "auth0_client_grant" "m2m_api_grant" {
  client_id = auth0_client.m2m_app.id
  audience  = auth0_resource_server.retail_api.identifier

  scopes = [
    "read:profile",
    "write:cart",
    "read:orders",
    "write:orders"
  ]
}

# Auth0 Action for adding custom claims (optional)
resource "auth0_action" "add_user_metadata" {
  name = "Add User Metadata to Token"
  code = file("${path.module}/actions/add-user-metadata.js")

  runtime = "node18"

  dependencies {
    name    = "uuid"
    version = "9.0.0"
  }

  secrets {
    name  = "API_AUDIENCE"
    value = var.api_identifier
  }

  supported_triggers {
    id      = "post-login"
    version = "v3"
  }

  deploy = true
}

# Bind the action to the post-login trigger
resource "auth0_trigger_actions" "post_login_actions" {
  trigger = "post-login"

  actions {
    id           = auth0_action.add_user_metadata.id
    display_name = auth0_action.add_user_metadata.name
  }
}
