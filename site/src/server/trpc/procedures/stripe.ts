import { z } from "zod";
import { baseProcedure, protectedProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { env } from "~/server/env";
import Stripe from "stripe";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

// Helper function to get user from database using Auth0 ID
async function getUserFromAuth0Id(auth0Id: string) {
  return await db.user.findUnique({
    where: { auth0Id },
  });
}

export const stripeProcedures = {
  // Create Stripe checkout session (requires authentication)
  createCheckoutSession: baseProcedure
    .input(z.object({
      successUrl: z.string(),
      cancelUrl: z.string(),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Note: This is a placeholder implementation
      // You'll need to implement actual Stripe integration
      
      let user = null;
      
      // If authenticated, get user from database
      if (ctx.isAuthenticated && ctx.user) {
        user = await getUserFromAuth0Id(ctx.user.sub);
      }
      
      // For guest users, ensure we use the same sessionId logic as cart procedures
      const sessionId = user ? null : (input.sessionId || 'anonymous');
      
      // Get cart items with product details
      const cart = await db.cart.findFirst({
        where: user 
          ? { userId: user.id }
          : { sessionId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new Error("Cart is empty");
      }

      // Calculate total
      const total = cart.items.reduce((sum, item) => 
        sum + (Number(item.product.price) * item.quantity), 0
      );

      // Create order in database
      const order = await db.order.create({
        data: {
          userId: user?.id,
          email: user?.email || ctx.user?.email || "guest@example.com",
          total,
          status: "PENDING",
          items: {
            create: cart.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            })),
          },
        },
      });

      // Create the actual Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: cart.items.map(item => ({
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.product.name,
              description: item.product.description || undefined,
            },
            unit_amount: Math.round(Number(item.product.price) * 100), // Convert to cents
          },
          quantity: item.quantity,
        })),
        mode: 'payment',
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          orderId: order.id.toString(),
          sessionId: input.sessionId || '',
        },
      });

      // Update order with Stripe session ID
      await db.order.update({
        where: { id: order.id },
        data: { stripeSessionId: session.id },
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    }),

  // Handle Stripe webhook
  handleWebhook: baseProcedure
    .input(z.object({
      payload: z.string(),
      signature: z.string(),
    }))
    .mutation(async ({ input }) => {
      let event: Stripe.Event;
      
      try {
        event = stripe.webhooks.constructEvent(
          input.payload,
          input.signature,
          env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        throw new Error(`Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const orderId = parseInt(session.metadata?.orderId || '');
          
          if (!orderId) {
            throw new Error('No orderId found in session metadata');
          }
          
          // Update order status to PAID
          await db.order.update({
            where: { id: orderId },
            data: { status: 'PAID' },
          });
          
          // Clear the cart for this session
          const order = await db.order.findUnique({
            where: { id: orderId },
            include: { user: true },
          });
          
          if (order) {
            // Find the cart based on user or session
            const cart = await db.cart.findFirst({
              where: order.userId 
                ? { userId: order.userId }
                : { sessionId: session.metadata?.sessionId || undefined },
            });
            
            if (cart) {
              // Delete all cart items
              await db.cartItem.deleteMany({
                where: { cartId: cart.id },
              });
            }
          }
          
          break;
        }
          
        case 'checkout.session.expired':
        case 'payment_intent.payment_failed': {
          // Handle failed/expired payments
          const failedSession = event.data.object;
          const failedOrderId = parseInt(failedSession.metadata?.orderId || '');
          
          if (failedOrderId) {
            await db.order.update({
              where: { id: failedOrderId },
              data: { status: 'CANCELLED' },
            });
          }
          break;
        }
          
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      return { received: true };
    }),

  // Get order by ID
  getOrder: baseProcedure
    .input(z.object({
      orderId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      let user = null;
      
      // If authenticated, get user from database
      if (ctx.isAuthenticated && ctx.user) {
        user = await getUserFromAuth0Id(ctx.user.sub);
      }
      
      const order = await db.order.findFirst({
        where: {
          id: input.orderId,
          ...(user && { userId: user.id }),
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: {
                    take: 1,
                    orderBy: { sortOrder: "asc" },
                  },
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      return {
        id: order.id,
        status: order.status,
        total: Number(order.total),
        createdAt: order.createdAt,
        items: order.items.map(item => ({
          id: item.id,
          productId: item.productId,
          name: item.product.name,
          slug: item.product.slug,
          price: Number(item.price),
          quantity: item.quantity,
          image: item.product.images[0]?.url,
        })),
      };
    }),
};
