# Skyfire Buyer Service MCP Server

A comprehensive Model Context Protocol (MCP) server that integrates with Skyfire.xyz to provide buyer agent services. This server includes both Skyfire-specific tools and basic math operations, all secured with Auth0 authentication.

## Features

### Skyfire Integration
- **Token Creation**: Create KYA (Know Your Agent), Payment, and combined KYA+Payment tokens
- **Service Discovery**: Find and search seller services in the Skyfire marketplace
- **Wallet Management**: Check wallet balance and monitor spending
- **Token Management**: Introspect tokens and view charges/usage
- **MCP Tools**: Direct integration with Skyfire's MCP server for advanced operations

### Authentication
- Auth0 integration for secure API access
- OAuth 2.0 protected resources
- Scoped permissions for different operations

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
ISSUER_BASE_URL=https://your-tenant.auth0.com/
RESOURCE_URL=https://your-domain.com/mcp

# API Keys
BUYER_API_KEY=your-buyer-api-key
SKYFIRE_API_KEY=your-skyfire-api-key

# Optional
SKYFIRE_AGENT_ID=your-agent-id
```

## Available Tools

### Basic Math Operations
- `add` - Add two numbers
- `subtract` - Subtract two numbers  
- `multiply` - Multiply two numbers
- `divide` - Divide two numbers

### Skyfire Token Management
- `skyfire-create-kya-token` - Create a KYA token for service access
- `skyfire-create-pay-token` - Create a payment token for purchasing services
- `skyfire-create-kya-payment-token` - Create a combined KYA + Payment token

### Skyfire Service Discovery
- `skyfire-find-sellers` - Find available seller services via MCP
- `skyfire-get-services` - Get all available services from marketplace
- `skyfire-get-services-by-tags` - Search services by specific tags

### Skyfire Wallet & Token Operations
- `skyfire-get-wallet-balance` - Check current wallet balance
- `skyfire-get-token-charges` - Get charges/usage for a specific token
- `skyfire-introspect-token` - Validate and inspect token details

### Skyfire MCP Tools
- `skyfire-mcp-list-tools` - List all available tools on Skyfire MCP server
- `skyfire-mcp-call-tool` - Call specific tools on Skyfire MCP server

## Usage Examples

### Creating Tokens

**KYA Token** (for service access):
```json
{
  "tool": "skyfire-create-kya-token",
  "arguments": {
    "buyerTag": "my-transaction-123",
    "sellerServiceId": "service-id-456"
  }
}
```

**Payment Token** (for purchasing):
```json
{
  "tool": "skyfire-create-pay-token", 
  "arguments": {
    "buyerTag": "my-transaction-124",
    "sellerServiceId": "service-id-456",
    "amount": 10.00
  }
}
```

**Combined Token** (KYA + Payment):
```json
{
  "tool": "skyfire-create-kya-payment-token",
  "arguments": {
    "buyerTag": "my-transaction-125", 
    "sellerServiceId": "service-id-456",
    "amount": 15.00
  }
}
```

### Service Discovery

**Find Services by Tags**:
```json
{
  "tool": "skyfire-get-services-by-tags",
  "arguments": {
    "tags": ["ai", "nlp", "translation"]
  }
}
```

### Wallet Management

**Check Balance**:
```json
{
  "tool": "skyfire-get-wallet-balance",
  "arguments": {}
}
```

## API Endpoints

- `GET /` - Server information and available tools
- `POST /mcp` - MCP protocol endpoint (handles all tool calls)
- `GET /.well-known/oauth-protected-resource` - OAuth resource metadata

## Authentication & Authorization

The server supports OAuth 2.0 with the following scopes:

- `math:add`, `math:subtract`, `math:multiply`, `math:divide` - Basic math operations
- `skyfire:create-token` - Token creation operations
- `skyfire:find-sellers` - Service discovery
- `skyfire:get-services` - Service listing and search
- `skyfire:wallet-balance` - Wallet operations
- `skyfire:token-management` - Token introspection and charges
- `skyfire:mcp-tools` - Direct MCP tool access

## Development

### Running Locally

```bash
# Install dependencies
pnpm install

# Set up Auth0 configuration
pnpm run deploy:auth0

# Start development server
pnpm run dev
```

### Building

```bash
# Build and deploy Auth0 configuration
pnpm run build
```

## Integration with Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "skyfire-buyer": {
      "command": "node",
      "args": ["path/to/your/server/dist/index.js"],
      "env": {
        "AUTH0_DOMAIN": "your-tenant.auth0.com",
        "RESOURCE_URL": "https://your-domain.com/mcp",
        "SKYFIRE_API_KEY": "your-skyfire-api-key",
        "BUYER_API_KEY": "your-buyer-api-key"
      }
    }
  }
}
```

## Skyfire API Reference

- **API Base URL**: `https://api.skyfire.xyz/api/v1`
- **MCP Server URL**: `https://mcp.skyfire.xyz/mcp`
- **Documentation**: [https://docs.skyfire.xyz](https://docs.skyfire.xyz)

## Error Handling

All tools include comprehensive error handling with descriptive error messages. Errors are returned in the standard MCP format with human-readable text content.

## Security Considerations

- All API calls are authenticated using API keys
- Auth0 provides OAuth 2.0 security for the MCP server
- Environment variables should be kept secure and not committed to version control
- Token creation includes buyer tags for transaction tracking and audit trails

## Support

For issues related to:
- **MCP Server**: Check server logs and verify environment configuration
- **Skyfire API**: Refer to [Skyfire Documentation](https://docs.skyfire.xyz)
- **Auth0**: Check Auth0 dashboard and configuration

## License

This project follows the same license as the parent workspace.
