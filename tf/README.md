# Auth0 Terraform Setup for Retail Demo

This directory contains Terraform configuration for setting up Auth0 resources for the retail demo application.

## Prerequisites

1. **Auth0 Account**: You need an Auth0 tenant
2. **Auth0 Management API Application**: Create a Machine-to-Machine application with Management API access
3. **Terraform**: Install Terraform CLI

## Setup Instructions

### 1. Create Auth0 Management API Application

1. Go to your Auth0 Dashboard
2. Navigate to Applications → Create Application
3. Choose "Machine to Machine Applications"
4. Name it "Terraform Management"
5. Select "Auth0 Management API"
6. Grant the following scopes:
   - `read:clients`
   - `create:clients`
   - `update:clients`
   - `delete:clients`
   - `read:resource_servers`
   - `create:resource_servers`
   - `update:resource_servers`
   - `delete:resource_servers`
   - `read:client_grants`
   - `create:client_grants`
   - `update:client_grants`
   - `delete:client_grants`
   - `read:actions`
   - `create:actions`
   - `update:actions`
   - `delete:actions`

### 2. Configure Terraform Variables

1. Copy `terraform.tfvars.example` to `terraform.tfvars`
2. Fill in your Auth0 configuration:
   ```hcl
   auth0_domain = "your-tenant.auth0.com"
   auth0_management_client_id = "your-management-client-id"
   auth0_management_client_secret = "your-management-client-secret"
   app_name = "retail-demo"
   app_url = "https://your-app.vercel.app"
   api_identifier = "https://api.retail-demo.com"
   ```

### 3. Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Plan the deployment
terraform plan

# Apply the configuration
terraform apply
```

### 4. Environment Variables for Your App

After deployment, set these environment variables in your application:

```bash
# From Terraform outputs
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=<spa_client_id_from_terraform_output>
AUTH0_AUDIENCE=https://api.retail-demo.com

# For server-side operations (if needed)
AUTH0_M2M_CLIENT_ID=<m2m_client_id_from_terraform_output>
AUTH0_M2M_CLIENT_SECRET=<m2m_client_secret_from_terraform_output>
```

## Resources Created

- **Auth0 API Resource**: Defines the API with scopes for the retail demo
- **Auth0 SPA Application**: Single Page Application for the React frontend
- **Auth0 M2M Application**: Machine-to-Machine application for server operations
- **Auth0 Action**: Post-login action to add custom claims to tokens
- **Client Grant**: Grants M2M application access to the API

## Scopes Defined

- `read:profile`: Read user profile information
- `write:cart`: Manage shopping cart items
- `read:orders`: Read order history
- `write:orders`: Create new orders

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

**Warning**: This will permanently delete all Auth0 resources created by this configuration.
