import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import * as openid from "openid-client";
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
  const paymentAuthorization = req.headers.get("Payment-Authorization")?.replace("Bearer+Skyfire", "");
 
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
        ...rest,
        paymentAuthorization: paymentAuthorization
      },
    };
  } catch (error) {
    console.error("Authentication failed:", error);
    return undefined;
  }
}

// Token exchange configuration and types
export interface TokenExchangeConfig {
  clientId: string;
  clientSecret?: string;
  issuer: string;
  audience?: string;
  scope?: string;
}

export interface TokenExchangeRequest {
  subjectToken: string;
  subjectTokenType: string;
  requestedTokenType?: string;
  audience?: string;
  scope?: string;
  resource?: string;
}

export interface TokenExchangeResponse {
  access_token: string;
  issued_token_type: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
  refresh_token?: string;
}

/**
 * Perform OAuth 2.0 Token Exchange (RFC 8693)
 * This function sets up the foundation for token exchange.
 * You can implement the specific logic based on your requirements.
 */
export async function performTokenExchange(
  config: TokenExchangeConfig,
  request: TokenExchangeRequest
): Promise<TokenExchangeResponse> {
  try {
    // Discover the issuer configuration
    const issuerUrl = new URL(config.issuer);
    const configuration = await openid.discovery(issuerUrl, config.clientId, config.clientSecret);
    
    // Prepare token exchange parameters
    const tokenExchangeParams: Record<string, string> = {
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token: request.subjectToken,
      subject_token_type: request.subjectTokenType,
      // requested_token_type: request.requestedTokenType || 'urn:ietf:params:oauth:token-type:access_token',
    };

    // Add optional parameters if they exist
    if (request.audience || config.audience) {
      tokenExchangeParams.audience = request.audience || config.audience!;
    }
    if (request.scope || config.scope) {
      tokenExchangeParams.scope = request.scope || config.scope!;
    }
    if (request.resource) {
      tokenExchangeParams.resource = request.resource;
    }

    // Perform the token exchange using genericGrantRequest
    const tokenEndpointResponse = await openid.genericGrantRequest(
      configuration,
      'urn:ietf:params:oauth:grant-type:token-exchange',
      tokenExchangeParams
    );

    return {
      access_token: tokenEndpointResponse.access_token!,
      issued_token_type: tokenExchangeParams.requested_token_type,
      token_type: tokenEndpointResponse.token_type || 'Bearer',
      expires_in: tokenEndpointResponse.expires_in,
      scope: tokenEndpointResponse.scope,
      refresh_token: tokenEndpointResponse.refresh_token,
    };
  } catch (error) {
    console.error('Token exchange failed:', error);
    throw new Error(`Token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to exchange an Auth0 access token for a different audience
 * This is a common use case for token exchange in microservices architectures
 */
export async function exchangeTokenForAudience(
  currentToken: string,
  targetAudience: string,
  config: Omit<TokenExchangeConfig, 'audience'>
): Promise<TokenExchangeResponse> {
  return performTokenExchange(
    { ...config, audience: targetAudience },
    {
      subjectToken: currentToken,
      subjectTokenType: 'https://retail.auth101.dev/te/service-to-service',
      audience: targetAudience,
    }
  );
}
