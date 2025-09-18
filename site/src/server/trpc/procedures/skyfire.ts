import { z } from "zod";
import { baseProcedure, protectedProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { env } from "~/server/env";
import { jwtVerify, createRemoteJWKSet } from "jose";

// Skyfire token validation
interface SkyfireTokenPayload {
  ver: number;
  env: string;
  btg: string; // buyer tag
  ssi: string; // service session ID
  scopes: string[];
  bid: {
    skyfireEmail: string;
  };
  aid: string | null;
  iat: number;
  iss: string;
  jti: string;
  aud: string;
  sub: string; // Skyfire user ID
  exp: number;
}

// Create JWKS for Skyfire (you'll need to update this with the actual Skyfire JWKS endpoint)
const skyfireJWKS = createRemoteJWKSet(new URL('https://app-qa.skyfire.xyz/.well-known/jwks.json'));

async function validateSkyfirePaymentToken(token: string): Promise<SkyfireTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, skyfireJWKS, {
      issuer: 'https://app-qa.skyfire.xyz',
    });

    return payload as unknown as SkyfireTokenPayload;
  } catch (error) {
    console.error('Skyfire token validation failed:', error);
    throw new Error('Invalid Skyfire payment token');
  }
}

export const skyfireProcedures = {
  // Create order with Skyfire payment - simplified version
  createSkyfireOrder: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      paymentAmount: z.number().positive(),
      paymentToken: z.string(),
      skyfireAct: z.string().optional().describe("Skyfire actor/agent identifier for proxy payments"),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // For now, skip token validation and just log the payment
        // In production, you'd validate the Skyfire token here
        console.log('Processing Skyfire payment:', {
          sessionId: input.sessionId,
          amount: input.paymentAmount,
          userId: ctx.user.sub,
          skyfireAct: input.skyfireAct || 'direct'
        });

        // Get user from database, create if not exists
        let dbUser = await db.user.findUnique({
          where: { auth0Id: ctx.user.sub },
        });

        if (!dbUser) {
          dbUser = await db.user.create({
            data: {
              auth0Id: ctx.user.sub,
              email: ctx.user.email || "",
              name: ctx.user.name,
              picture: ctx.user.picture,
            },
          });
        }

        // Create a Skyfire order with proper cart items
        // First, get the cart items
        const cart = await db.cart.findFirst({
          where: { 
            OR: [
              { userId: dbUser.id },
              { sessionId: input.sessionId }
            ]
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        if (!cart || cart.items.length === 0) {
          throw new Error("Cart is empty - cannot create Skyfire order");
        }

        // Verify the payment amount matches the cart total
        const cartTotal = cart.items.reduce((sum, item) => 
          sum + (Number(item.product.price) * item.quantity), 0
        );

        if (Math.abs(cartTotal - input.paymentAmount) > 0.01) {
          throw new Error(`Payment amount mismatch: cart total is $${cartTotal.toFixed(2)}, but payment amount is $${input.paymentAmount.toFixed(2)}`);
        }

        const order = await db.order.create({
          data: {
            userId: dbUser.id,
            total: input.paymentAmount,
            status: "PAID",
            email: ctx.user.email || "",
            stripeSessionId: `skyfire-${Date.now()}`, // Reuse this field for Skyfire payment ID
            items: {
              create: cart.items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: Number(item.product.price),
              })),
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        // Clear the cart after successful order creation
        await db.cart.delete({
          where: { id: cart.id },
        });

        console.log('Skyfire order created:', {
          orderId: order.id,
          total: order.total,
          status: order.status,
          itemCount: order.items.length,
          skyfireAct: input.skyfireAct || 'direct'
        });

        return {
          success: true,
          orderId: order.id,
          total: order.total,
          status: order.status,
          paymentMethod: "SKYFIRE",
          itemCount: order.items.length,
          skyfireAct: input.skyfireAct || 'direct'
        };

      } catch (error) {
        console.error('Skyfire order creation failed:', error);
        throw new Error(`Failed to process Skyfire payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Validate Skyfire payment token (for testing)
  validateSkyfireToken: baseProcedure
    .input(z.object({
      token: z.string()
    }))
    .mutation(async ({ input }) => {
      try {
        // For now, just return success - in production validate the actual token
        return {
          valid: true,
          message: "Token validation would happen here"
        };
      } catch (error) {
        return {
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    })
};
