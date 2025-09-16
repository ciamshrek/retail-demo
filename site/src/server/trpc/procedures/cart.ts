import { z } from "zod";
import { baseProcedure, protectedProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

// Helper function to get user from database using Auth0 ID
async function getUserFromAuth0Id(auth0Id: string) {
  return await db.user.findUnique({
    where: { auth0Id },
  });
}

export const cartProcedures = {
  // Add item to cart
  addToCart: baseProcedure
    .input(z.object({
      productId: z.string(),
      quantity: z.number().min(1),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      let user = null;
      
      // If authenticated, get user from database
      if (ctx.isAuthenticated && ctx.user) {
        user = await getUserFromAuth0Id(ctx.user.sub);
      }
      
      // For guest users, ensure we have a sessionId
      const sessionId = user ? null : (input.sessionId || 'anonymous');
      
      // Find or create cart
      let cart = await db.cart.findFirst({
        where: user 
          ? { userId: user.id }
          : { sessionId },
      });

      if (!cart) {
        cart = await db.cart.create({
          data: {
            userId: user?.id,
            sessionId,
          },
        });
      }

      // Check if item already exists in cart
      const existingItem = await db.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: input.productId,
          },
        },
      });

      if (existingItem) {
        // Update quantity
        await db.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + input.quantity },
        });
      } else {
        // Create new cart item
        await db.cartItem.create({
          data: {
            cartId: cart.id,
            productId: input.productId,
            quantity: input.quantity,
          },
        });
      }

      return { success: true };
    }),

  // Get cart items
  getCart: baseProcedure
    .input(z.object({
      sessionId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      let user = null;
      
      // If authenticated, get user from database
      if (ctx.isAuthenticated && ctx.user) {
        user = await getUserFromAuth0Id(ctx.user.sub);
      }
      
      // For guest users, ensure we use the same sessionId logic as addToCart
      const sessionId = user ? null : (input.sessionId || 'anonymous');
      
      const cart = await db.cart.findFirst({
        where: user 
          ? { userId: user.id }
          : { sessionId },
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

      if (!cart) {
        return { items: [], total: 0 };
      }

      const items = cart.items.map(item => ({
        id: item.id.toString(),
        productId: item.productId,
        name: item.product.name,
        slug: item.product.slug,
        price: Number(item.product.price),
        quantity: item.quantity,
        image: item.product.images[0]?.url,
      }));

      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return { items, total };
    }),

  // Update cart item quantity
  updateCartItem: baseProcedure
    .input(z.object({
      productId: z.string(),
      quantity: z.number().min(0),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      let user = null;
      
      // If authenticated, get user from database
      if (ctx.isAuthenticated && ctx.user) {
        user = await getUserFromAuth0Id(ctx.user.sub);
      }
      
      // For guest users, ensure we use the same sessionId logic
      const sessionId = user ? null : (input.sessionId || 'anonymous');
      
      const cart = await db.cart.findFirst({
        where: user 
          ? { userId: user.id }
          : { sessionId },
      });

      if (!cart) {
        throw new Error("Cart not found");
      }

      if (input.quantity === 0) {
        // Remove item
        await db.cartItem.deleteMany({
          where: {
            cartId: cart.id,
            productId: input.productId,
          },
        });
      } else {
        // Update quantity
        await db.cartItem.updateMany({
          where: {
            cartId: cart.id,
            productId: input.productId,
          },
          data: { quantity: input.quantity },
        });
      }

      return { success: true };
    }),

  // Remove item from cart
  removeFromCart: baseProcedure
    .input(z.object({
      productId: z.string(),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      let user = null;
      
      // If authenticated, get user from database
      if (ctx.isAuthenticated && ctx.user) {
        user = await getUserFromAuth0Id(ctx.user.sub);
      }
      
      // For guest users, ensure we use the same sessionId logic
      const sessionId = user ? null : (input.sessionId || 'anonymous');
      
      const cart = await db.cart.findFirst({
        where: user 
          ? { userId: user.id }
          : { sessionId },
      });

      if (!cart) {
        throw new Error("Cart not found");
      }

      await db.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          productId: input.productId,
        },
      });

      return { success: true };
    }),

  // Clear cart
  clearCart: baseProcedure
    .input(z.object({
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      let user = null;
      
      // If authenticated, get user from database
      if (ctx.isAuthenticated && ctx.user) {
        user = await getUserFromAuth0Id(ctx.user.sub);
      }
      
      // For guest users, ensure we use the same sessionId logic
      const sessionId = user ? null : (input.sessionId || 'anonymous');
      
      const cart = await db.cart.findFirst({
        where: user 
          ? { userId: user.id }
          : { sessionId },
      });

      if (!cart) {
        return { success: true };
      }

      await db.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return { success: true };
    }),
};
