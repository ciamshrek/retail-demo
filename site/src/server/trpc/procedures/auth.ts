import { z } from "zod";
import { baseProcedure, protectedProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

const auth0UserSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  picture: z.string().optional(),
});

export const authProcedures = {
  // Get current user profile (requires authentication via context)
  getCurrentUser: protectedProcedure
    .query(async ({ ctx }) => {
      const { user } = ctx;
      
      // Check if user exists in database, create if not
      let dbUser = await db.user.findUnique({
        where: { auth0Id: user.sub },
      });

      if (!dbUser) {
        // Create user from Auth0 token claims
        dbUser = await db.user.create({
          data: {
            auth0Id: user.sub,
            email: user.email || "",
            name: user.name,
            picture: user.picture,
          },
        });
      } else {
        // Update user info in case it changed in Auth0
        dbUser = await db.user.update({
          where: { id: dbUser.id },
          data: {
            email: user.email || dbUser.email,
            name: user.name || dbUser.name,
            picture: user.picture || dbUser.picture,
          },
        });
      }

      return {
        id: dbUser.id.toString(),
        auth0Id: dbUser.auth0Id,
        email: dbUser.email,
        name: dbUser.name,
        picture: dbUser.picture,
      };
    }),

  // Public endpoint to check authentication status
  checkAuth: baseProcedure
    .query(async ({ ctx }) => {
      return {
        isAuthenticated: ctx.isAuthenticated,
        user: ctx.isAuthenticated ? {
          sub: ctx.user?.sub,
          email: ctx.user?.email,
          name: ctx.user?.name,
        } : null,
      };
    }),
};
