import { z } from "zod";
import { protectedProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const orderProcedures = {
  // Get user's order history
  getUserOrders: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      // Get user from database, create if not exists
      let dbUser = await db.user.findUnique({
        where: { auth0Id: ctx.user.sub },
      });

      if (!dbUser) {
        // Create user from Auth0 token claims
        dbUser = await db.user.create({
          data: {
            auth0Id: ctx.user.sub,
            email: ctx.user.email || "",
            name: ctx.user.name,
            picture: ctx.user.picture,
          },
        });
      }

      const orders = await db.order.findMany({
        where: {
          userId: dbUser.id,
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: {
                    orderBy: { sortOrder: "asc" },
                    take: 1,
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        skip: input.offset,
      });

      // Get total count for pagination
      const totalCount = await db.order.count({
        where: {
          userId: dbUser.id,
        },
      });

      return {
        orders,
        totalCount,
        hasMore: totalCount > input.offset + input.limit,
      };
    }),

  // Get specific order details
  getOrderById: protectedProcedure
    .input(z.object({
      orderId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      // Get user from database, create if not exists
      let dbUser = await db.user.findUnique({
        where: { auth0Id: ctx.user.sub },
      });

      if (!dbUser) {
        // Create user from Auth0 token claims
        dbUser = await db.user.create({
          data: {
            auth0Id: ctx.user.sub,
            email: ctx.user.email || "",
            name: ctx.user.name,
            picture: ctx.user.picture,
          },
        });
      }

      const order = await db.order.findFirst({
        where: {
          id: input.orderId,
          userId: dbUser.id, // Ensure user can only access their own orders
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: {
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

      return order;
    }),

  // Get order stats for user dashboard
  getOrderStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Get user from database, create if not exists
      let dbUser = await db.user.findUnique({
        where: { auth0Id: ctx.user.sub },
      });

      if (!dbUser) {
        // Create user from Auth0 token claims
        dbUser = await db.user.create({
          data: {
            auth0Id: ctx.user.sub,
            email: ctx.user.email || "",
            name: ctx.user.name,
            picture: ctx.user.picture,
          },
        });
      }

      const [totalOrders, totalSpent, recentOrdersCount] = await Promise.all([
        // Total number of orders
        db.order.count({
          where: {
            userId: dbUser.id,
            status: "PAID",
          },
        }),
        
        // Total amount spent
        db.order.aggregate({
          where: {
            userId: dbUser.id,
            status: "PAID",
          },
          _sum: {
            total: true,
          },
        }),
        
        // Orders in last 30 days
        db.order.count({
          where: {
            userId: dbUser.id,
            status: "PAID",
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            },
          },
        }),
      ]);

      return {
        totalOrders,
        totalSpent: totalSpent._sum.total || 0,
        recentOrdersCount,
      };
    }),
};
