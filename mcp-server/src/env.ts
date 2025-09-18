import z from "zod";

export const environmentVariablesSchema = z.object({
  AUTH0_DOMAIN: z
    .string()
    .describe("The Auth0 domain eg: tenant.us.auth0.com"),

  ISSUER_BASE_URL: z
    .string()
    .url("Issuer must be a url")
    .optional()
    .describe("The Auth0 issuer base URL eg: https://tenant.us.auth0.com/ (optional, will be generated from AUTH0_DOMAIN if not provided)"),

  RESOURCE_URL: z
    .string()
    .url()
    .describe("The URL for the MCP resource (full URL with protocol and path) eg: https://your-site.com/mcp"),

  CLIENT_ID: z.string().describe("The Auth0 client ID for the Associated App"),

  CLIENT_SECRET: z.string().describe("The Auth0 client secret for the Associated App"),

  API_SERVER_URL: z.string().url().optional().default("http://localhost:3000").describe("The URL for the API server"),

  API_SERVER_AUDIENCE: z.string().url().optional().default("http://localhost:3000").describe("The audience for the API server"),
});

const parsedEnv = environmentVariablesSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  ISSUER_BASE_URL: parsedEnv.ISSUER_BASE_URL || `https://${parsedEnv.AUTH0_DOMAIN}/`
};
