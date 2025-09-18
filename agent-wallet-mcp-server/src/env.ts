import z from "zod";

export const environmentVariablesSchema = z.object({
  AUTH0_DOMAIN: z
    .string()
    .describe("The Auth0 domain eg: tenant.us.auth0.com"),

  AUTH0_CLIENT_ID: z
    .string()
    .describe("The Auth0 client ID for token exchange"),

  AUTH0_CLIENT_SECRET: z
    .string()
    .describe("The Auth0 client secret for token exchange"),

  ISSUER_BASE_URL: z
    .string()
    .url("Issuer must be a url")
    .optional()
    .describe("The Auth0 issuer base URL eg: https://tenant.us.auth0.com/ (optional, will be generated from AUTH0_DOMAIN if not provided)"),

  RESOURCE_URL: z
    .string()
    .url()
    .describe("The URL for the MCP resource (full URL with protocol and path) eg: https://your-site.com/mcp"),


  SKYFIRE_API_KEY: z.string()
    .describe("Skyfire API key for buyer agent"),

  SKYFIRE_AGENT_ID: z.string()
    .optional()
    .describe("Skyfire agent ID (optional)"),

  RETAIL_AUTH0_DOMAIN: z
    .string()
    .describe("The Auth0 domain eg: tenant.us.auth0.com"),

  RETAIL_CLIENT_ID: z
    .string()
    .describe("The Auth0 client ID for token exchange"),

  RETAIL_CLIENT_SECRET: z
    .string()
    .describe("The Auth0 client secret for token exchange"),

  REDIS_URL: z
    .string()
    .url()
    .optional()
    .describe("Redis connection URL (legacy, optional)"),

  KV_REST_API_URL: z
    .string()
    .url()
    .describe("Upstash Redis REST API URL (provided by Vercel)"),

  KV_REST_API_TOKEN: z
    .string()
    .describe("Upstash Redis REST API token (provided by Vercel)"),

});

const parsedEnv = environmentVariablesSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  ISSUER_BASE_URL: parsedEnv.ISSUER_BASE_URL || `https://${parsedEnv.AUTH0_DOMAIN}/`
};
