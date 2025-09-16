import { verifyAuthorizationHeader, type Auth0User } from "../auth/jwt";

export interface TRPCContext {
  user?: Auth0User;
  isAuthenticated: boolean;
}

export async function createTRPCContext(request: Request): Promise<TRPCContext> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return { isAuthenticated: false };
    }

    const user = await verifyAuthorizationHeader(authHeader);
    return {
      user,
      isAuthenticated: true,
    };
  } catch (error) {
    console.warn("Authentication failed:", error);
    return { isAuthenticated: false };
  }
}
