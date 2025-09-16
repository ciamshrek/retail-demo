import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import { env } from "./env.js";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

// Auth0 Access Token payload schema based on https://auth0.com/docs/secure/tokens
export const Auth0AccessTokenPayloadSchema = z
  .object({
    // Standard JWT claims
    iss: z.string().describe("Issuer - Auth0 domain"),
    sub: z.string().describe("Subject - user ID"),
    aud: z
      .union([z.string(), z.array(z.string())])
      .describe("Audience - API identifier(s)"),
    iat: z.number().describe("Issued at time"),
    exp: z.number().describe("Expiration time"),
    azp: z.string().describe("Authorized party - client ID"),
    scope: z.string().describe("Granted scopes (space-separated)"),

    // Auth0 specific claims
    gty: z.string().optional().describe("Grant type"),
    permissions: z
      .array(z.string())
      .optional()
      .describe("Permissions array (if using RBAC)"),

    // Custom claims (namespace prefixed) - allow additional properties
  })
  .passthrough()
  .describe("Auth0 Access Token payload");

export type Auth0AccessTokenPayload = z.infer<
  typeof Auth0AccessTokenPayloadSchema
>;

// Create the JWKS URI for Auth0
const jwksUri = new URL("/.well-known/jwks.json", env.ISSUER_BASE_URL);

// Create the remote JWK Set
const JWKS = createRemoteJWKSet(jwksUri);

export async function validateJWT(
  token: string
): Promise<Auth0AccessTokenPayload> {
  try {
    // Verify the JWT
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: env.ISSUER_BASE_URL,
      audience: env.RESOURCE_URL, // Optional: verify the audience claim
    });

    // Validate and parse the payload using Zod schema
    const validatedPayload = Auth0AccessTokenPayloadSchema.parse(payload);
    return validatedPayload;
  } catch (error) {
    console.error("Error while validating authorization token", error);
    throw error;
  }
}

export async function auth0(req: Request): Promise<AuthInfo | undefined> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    console.log("No authorization token found");
    return undefined;
  }

  try {
    const payload = await validateJWT(token);
    const { azp: clientId, scope, ...rest } = payload;
    const expiresAt = payload.exp;
    const resource = Array.isArray(payload.aud)
      ? new URL(payload.aud[0])
      : new URL(payload.aud);

    return {
      token,
      clientId,
      scopes: scope.split(" "),
      expiresAt,
      resource,
      extra: {
        ...rest
      },
    };
  } catch (error) {
    console.error("Authentication failed:", error);
    return undefined;
  }
}
