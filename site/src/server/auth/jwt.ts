import { jwtVerify, createRemoteJWKSet } from "jose";
import { env } from "../env";

// Create JWKS for Auth0
const auth0Domain = env.VITE_AUTH0_DOMAIN;
const audience = env.VITE_AUTH0_AUDIENCE;
const issuer = `https://${auth0Domain}/`;

const JWKS = createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));

export interface Auth0User {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  aud: string | string[];
  iss: string;
  iat: number;
  exp: number;
  azp?: string;
  scope?: string;
  permissions?: string[];
}

export async function verifyAuth0Token(token: string): Promise<Auth0User> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: issuer,
      audience: audience,
      clockTolerance: 60, // Allow 60 seconds clock skew
    });

    return payload as Auth0User;
  } catch (error) {
    console.error("JWT verification failed:", error);
    throw new Error("Invalid or expired token");
  }
}

export function extractTokenFromHeader(authorizationHeader?: string): string {
  if (!authorizationHeader) {
    throw new Error("Authorization header missing");
  }

  if (!authorizationHeader.startsWith("Bearer ")) {
    throw new Error("Invalid authorization header format. Expected 'Bearer <token>'");
  }

  return authorizationHeader.slice(7);
}

export async function verifyAuthorizationHeader(authorizationHeader?: string): Promise<Auth0User> {
  const token = extractTokenFromHeader(authorizationHeader);
  return verifyAuth0Token(token);
}
