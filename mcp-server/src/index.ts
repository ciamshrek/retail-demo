import { Hono } from 'hono'
import { createMcpHandler, withMcpAuth, generateProtectedResourceMetadata } from 'mcp-handler'
import { z } from 'zod'
import { auth0 } from './auth0.js'
import { env } from './env.js'
import { addRetailTools } from './retail-tools.js'

const app = new Hono()

// Create MCP handler
const handler = createMcpHandler(
  (server) => {
    // Add retail tools
    addRetailTools(server)
  },
  {},
  {
    maxDuration: 60,
    verboseLogs: true,
  }
)

const secureHandler = withMcpAuth(handler, auth0, {
  // For this demo lets enforce authorization for all routes
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource"
});

app.get("/.well-known/oauth-protected-resource", (c) => {
  return c.json(generateProtectedResourceMetadata({
    authServerUrls: [env.ISSUER_BASE_URL],
    resourceUrl: env.RESOURCE_URL,
    additionalMetadata: {
      scopes_supported: [
        "openid",
        "profile",
        "email"
      ]
    }
  }));
});

// Mount MCP handler on /mcp route (it handles transport internally)
app.all('/mcp/*', async (c) => {
  return secureHandler(c.req.raw);
  // const inspetableResponse = response.clone();
  // // Throw a 401 or 402 here
  
  // // 401 is thrown if a method that does not necessary authn is used

  // // 402 is thrown if payment is required, but not avialable.
});

// Keep the original welcome route
app.get('/', (c) => {
  return c.json({
    message: 'Hono MCP Server - Math Operations with Authorization by Auth0',
    endpoints: {
      mcp: '/mcp',
      description:
        'MCP server with math operation tools (add, subtract, multiply, divide)',
    },
    tools: ['add', 'subtract', 'multiply', 'divide'],
  })
})

export default app;
